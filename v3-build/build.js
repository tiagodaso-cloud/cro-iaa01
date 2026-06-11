#!/usr/bin/env node
/**
 * Gera a V3 a partir do JSON da V2 (Fase 2 do roadmap):
 *  - SEO_Orchestrator_V3.json: + GA4/GSC como ferramentas do agente, + RAG
 *    (consulta ao repertório no chat e injeção no contexto da análise)
 *  - SEO_Orchestrator_V3_Ingestao_Repertorio.json: Google Drive -> PGVector
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const V2_PATH = path.join(__dirname, '..', 'SEO_Orchestrator_V2_Fase1.json');
const OUT_MAIN = path.join(__dirname, 'fase12_intermediate.json');
const OUT_INGEST = path.join(__dirname, '..', 'SEO_Orchestrator_V4_Ingestao_Repertorio.json');
const SNIP = (f) => fs.readFileSync(path.join(__dirname, 'snippets', f), 'utf8').replace(/\n$/, '');
const uuid = () => crypto.randomUUID();

function mustReplace(str, find, repl, label) {
  if (!str.includes(find)) throw new Error('Substring não encontrada (' + label + '): ' + find.slice(0, 90));
  return str.split(find).join(repl);
}
function checkJs(code, label) {
  try { new Function(code); } catch (e) { throw new Error('Sintaxe inválida em ' + label + ': ' + e.message); }
}

const wf = JSON.parse(fs.readFileSync(V2_PATH, 'utf8'));
const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
const need = (name) => {
  if (!byName[name]) throw new Error('Nó V2 não encontrado: ' + name);
  return byName[name];
};

wf.name = 'SEO Orchestrator – Fases 1+2 (intermediário)';

// ---------- HTML ----------
const respondHtml = need('Responder HTML');
respondHtml.parameters.responseBody = mustReplace(
  respondHtml.parameters.responseBody,
  '<span class="wchip">Inputs Flexíveis</span>',
  '<span class="wchip">Inputs Flexíveis</span>\n          <span class="wchip">GA4 + Search Console</span>\n          <span class="wchip">Repertório Interno (RAG)</span>',
  'chips v3');
respondHtml.parameters.responseBody = mustReplace(
  respondHtml.parameters.responseBody,
  'o agente decide quais ferramentas acionar.</p>',
  'o agente decide quais ferramentas acionar — incluindo dados reais de GA4 e Search Console e o repertório interno de SEO.</p>',
  'welcome v3');

// ---------- Análise: repertório no contexto ----------
need('Unir Resultados').parameters.numberInputs = 6;

const montar = need('Montar Contexto');
montar.parameters.jsCode = mustReplace(
  montar.parameters.jsCode,
  'const context = {',
  [
    'let repertorio = [];',
    'try {',
    "  repertorio = $('Buscar Repertório').all()",
    '    .map(i => i.json)',
    '    .map(r => ({',
    "      trecho: String(r.document?.pageContent ?? r.pageContent ?? '').slice(0, 800),",
    '      fonte: r.document?.metadata?.file_name ?? r.metadata?.file_name ?? null',
    '    }))',
    '    .filter(r => r.trecho);',
    '} catch (e) {}',
    '',
    'const context = {'
  ].join('\n'),
  'repertorio fetch');
montar.parameters.jsCode = mustReplace(
  montar.parameters.jsCode,
  'idioma: params.lang,',
  'idioma: params.lang,\n  repertorio_interno: repertorio,',
  'repertorio no contexto');
checkJs(montar.parameters.jsCode, 'montar_contexto v3');

const agenteAnalise = need('Agente Análise SEO');
agenteAnalise.parameters.text = mustReplace(
  agenteAnalise.parameters.text,
  '- Considere o mercado e idioma-alvo informados no contexto.',
  '- Considere o mercado e idioma-alvo informados no contexto.\n- Se houver itens em repertorio_interno (conhecimento interno da empresa), use-os para qualificar correlações e plano de ação, citando a fonte quando relevante.',
  'prompt análise v3');

// ---------- Orquestrador: data atual + novas ferramentas ----------
const agenteOrq = need('Agente Orquestrador');
agenteOrq.parameters.text = mustReplace(
  agenteOrq.parameters.text,
  'Mercado-alvo: {{ $json.market }} · Idioma: {{ $json.lang }}',
  "Data de hoje: {{ $now.toFormat('yyyy-LL-dd') }} · Mercado-alvo: {{ $json.market }} · Idioma: {{ $json.lang }}",
  'data no prompt');
agenteOrq.parameters.options.systemMessage = mustReplace(
  agenteOrq.parameters.options.systemMessage,
  '\n\n---\n\n## Geração de Conteúdo SEO',
  '\n' + SNIP('orq_tools_insert.txt') + '\n\n---\n\n## Geração de Conteúdo SEO',
  'tools no system');

// ---------- Nós novos ----------
const neverError = { response: { response: { neverError: true } } };

const embeddings = {
  parameters: { model: 'text-embedding-3-small', options: {} },
  id: uuid(), name: 'Embeddings Repertório', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', typeVersion: 1.2,
  position: [2000, 5936]
};

const consultarRepertorio = {
  parameters: {
    mode: 'retrieve-as-tool',
    toolDescription: 'Busca semântica no repertório interno de SEO/GEO/CRO (playbooks, guidelines e estudos de caso do Google Drive). Informe um termo ou pergunta para recuperar os trechos mais relevantes.',
    tableName: 'seo_repertorio',
    topK: 4,
    includeDocumentMetadata: true,
    options: {}
  },
  id: uuid(), name: 'Consultar Repertório Interno', type: '@n8n/n8n-nodes-langchain.vectorStorePGVector', typeVersion: 1.3,
  position: [1776, 5760]
};

const buscarRepertorio = {
  parameters: {
    mode: 'load',
    tableName: 'seo_repertorio',
    prompt: '={{ $json.topic }}',
    topK: 4,
    includeDocumentMetadata: true,
    options: {}
  },
  id: uuid(), name: 'Buscar Repertório', type: '@n8n/n8n-nodes-langchain.vectorStorePGVector', typeVersion: 1.3,
  position: [240, 5440], onError: 'continueRegularOutput', alwaysOutputData: true
};

const toolGa4List = {
  parameters: {
    url: 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleAnalyticsOAuth2',
    options: { ...neverError, timeout: 30000 },
    descriptionType: 'manual',
    toolDescription: 'Lista contas e propriedades GA4 acessíveis pela credencial conectada. Use para descobrir o property_id (numérico) antes de pedir relatórios.'
  },
  id: uuid(), name: 'GA4 – Listar Propriedades', type: 'n8n-nodes-base.httpRequestTool', typeVersion: 4.4,
  position: [1136, 5760]
};

const toolGa4Report = {
  parameters: {
    method: 'POST',
    url: "=https://analyticsdata.googleapis.com/v1beta/properties/{{ $fromAI('property_id', 'ID numérico da propriedade GA4 (somente números). Descubra com GA4 – Listar Propriedades se não souber', 'string') }}:runReport",
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleAnalyticsOAuth2',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ dateRanges: [{ startDate: $fromAI('start_date', 'Data inicial: YYYY-MM-DD ou relativa como 28daysAgo', 'string', '28daysAgo'), endDate: $fromAI('end_date', 'Data final: YYYY-MM-DD ou today', 'string', 'today') }], metrics: $fromAI('metrics', 'Métricas GA4 separadas por vírgula, ex: sessions,activeUsers,screenPageViews,conversions,engagementRate', 'string', 'sessions,activeUsers').split(',').map(m => ({ name: m.trim() })).filter(m => m.name).slice(0, 10), dimensions: $fromAI('dimensions', 'Dimensões GA4 separadas por vírgula, ex: sessionDefaultChannelGroup,landingPagePlusQueryString,date,country', 'string', 'sessionDefaultChannelGroup').split(',').map(d => ({ name: d.trim() })).filter(d => d.name).slice(0, 4), limit: 50 }) }}",
    options: { ...neverError, timeout: 60000 },
    descriptionType: 'manual',
    toolDescription: 'Executa um relatório na Data API do GA4 para uma propriedade. Parâmetros: property_id, start_date, end_date, metrics e dimensions (listas separadas por vírgula).'
  },
  id: uuid(), name: 'GA4 – Relatório de Métricas', type: 'n8n-nodes-base.httpRequestTool', typeVersion: 4.4,
  position: [1296, 5760]
};

const toolGscSites = {
  parameters: {
    url: 'https://www.googleapis.com/webmasters/v3/sites',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleOAuth2Api',
    options: { ...neverError, timeout: 30000 },
    descriptionType: 'manual',
    toolDescription: 'Lista as propriedades do Google Search Console acessíveis pela credencial conectada. Use para descobrir o site_url exato (sc-domain:dominio.com ou URL com barra final).'
  },
  id: uuid(), name: 'GSC – Listar Sites', type: 'n8n-nodes-base.httpRequestTool', typeVersion: 4.4,
  position: [1456, 5760]
};

const toolGscQuery = {
  parameters: {
    method: 'POST',
    url: "=https://www.googleapis.com/webmasters/v3/sites/{{ encodeURIComponent($fromAI('site_url', 'Propriedade exatamente como aparece no GSC: sc-domain:exemplo.com.br ou https://www.exemplo.com.br/. Descubra com GSC – Listar Sites se não souber', 'string')) }}/searchAnalytics/query",
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleOAuth2Api',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ startDate: $fromAI('start_date', 'Data inicial no formato YYYY-MM-DD (datas relativas não são aceitas)', 'string'), endDate: $fromAI('end_date', 'Data final no formato YYYY-MM-DD', 'string'), dimensions: $fromAI('dimensions', 'Dimensões separadas por vírgula entre: query, page, country, device, date', 'string', 'query').split(',').map(d => d.trim()).filter(Boolean).slice(0, 3), rowLimit: 50 }) }}",
    options: { ...neverError, timeout: 60000 },
    descriptionType: 'manual',
    toolDescription: 'Consulta o Search Analytics do GSC: cliques, impressões, CTR e posição média por query/página/país/dispositivo/data. Parâmetros: site_url, start_date, end_date (YYYY-MM-DD) e dimensions.'
  },
  id: uuid(), name: 'GSC – Search Analytics', type: 'n8n-nodes-base.httpRequestTool', typeVersion: 4.4,
  position: [1616, 5760]
};

wf.nodes.push(embeddings, consultarRepertorio, buscarRepertorio, toolGa4List, toolGa4Report, toolGscSites, toolGscQuery);

// ---------- Conexões ----------
const aiTool = (from) => {
  wf.connections[from] = { ai_tool: [[{ node: 'Agente Orquestrador', type: 'ai_tool', index: 0 }]] };
};
aiTool('Consultar Repertório Interno');
aiTool('GA4 – Listar Propriedades');
aiTool('GA4 – Relatório de Métricas');
aiTool('GSC – Listar Sites');
aiTool('GSC – Search Analytics');

wf.connections['Embeddings Repertório'] = {
  ai_embedding: [[
    { node: 'Consultar Repertório Interno', type: 'ai_embedding', index: 0 },
    { node: 'Buscar Repertório', type: 'ai_embedding', index: 0 }
  ]]
};

wf.connections['Parâmetros de Análise'].main[0].push({ node: 'Buscar Repertório', type: 'main', index: 0 });
wf.connections['Buscar Repertório'] = { main: [[{ node: 'Unir Resultados', type: 'main', index: 5 }]] };

// Sanidade
const names = new Set(wf.nodes.map((n) => n.name));
if (names.size !== wf.nodes.length) throw new Error('Nomes duplicados no V3');
for (const [from, types] of Object.entries(wf.connections)) {
  if (!names.has(from)) throw new Error('Conexão de nó inexistente: ' + from);
  for (const lists of Object.values(types)) for (const list of lists) for (const c of list) {
    if (!names.has(c.node)) throw new Error('Conexão para nó inexistente: ' + c.node);
  }
}

fs.writeFileSync(OUT_MAIN, JSON.stringify(wf, null, 2) + '\n');

// =====================================================================
// Workflow de ingestão: Google Drive -> PGVector (seo_repertorio)
// =====================================================================
const trigger = {
  parameters: {
    pollTimes: { item: [{ mode: 'everyMinute' }] },
    triggerOn: 'specificFolder',
    folderToWatch: { __rl: true, mode: 'list', value: '' },
    event: 'fileCreated',
    options: {}
  },
  id: uuid(), name: 'Novo Arquivo no Drive', type: 'n8n-nodes-base.googleDriveTrigger', typeVersion: 1,
  position: [-220, 0]
};
const baixar = {
  parameters: {
    resource: 'file',
    operation: 'download',
    fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
    options: {
      googleFileConversion: {
        conversion: {
          docsToFormat: 'text/plain',
          sheetsToFormat: 'text/csv',
          slidesToFormat: 'application/pdf'
        }
      }
    }
  },
  id: uuid(), name: 'Baixar Arquivo', type: 'n8n-nodes-base.googleDrive', typeVersion: 3,
  position: [40, 0]
};
const inserir = {
  parameters: { mode: 'insert', tableName: 'seo_repertorio', options: {} },
  id: uuid(), name: 'Inserir no Repertório', type: '@n8n/n8n-nodes-langchain.vectorStorePGVector', typeVersion: 1.3,
  position: [320, 0]
};
const loader = {
  parameters: {
    dataType: 'binary',
    binaryMode: 'allInputData',
    loader: 'auto',
    textSplittingMode: 'custom',
    options: {
      metadata: {
        metadataValues: [
          { name: 'file_name', value: '={{ $json.name }}' },
          { name: 'file_id', value: '={{ $json.id }}' }
        ]
      }
    }
  },
  id: uuid(), name: 'Carregar Documento', type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', typeVersion: 1.1,
  position: [432, 208]
};
const splitter = {
  parameters: { chunkSize: 1200, chunkOverlap: 150, options: {} },
  id: uuid(), name: 'Dividir Texto', type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', typeVersion: 1,
  position: [528, 400]
};
const embeddingsIngest = {
  parameters: { model: 'text-embedding-3-small', options: {} },
  id: uuid(), name: 'Embeddings OpenAI', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', typeVersion: 1.2,
  position: [240, 208]
};

const ingest = {
  name: 'SEO Orchestrator V4 – Ingestão Repertório',
  nodes: [trigger, baixar, inserir, loader, splitter, embeddingsIngest],
  connections: {
    'Novo Arquivo no Drive': { main: [[{ node: 'Baixar Arquivo', type: 'main', index: 0 }]] },
    'Baixar Arquivo': { main: [[{ node: 'Inserir no Repertório', type: 'main', index: 0 }]] },
    'Embeddings OpenAI': { ai_embedding: [[{ node: 'Inserir no Repertório', type: 'ai_embedding', index: 0 }]] },
    'Carregar Documento': { ai_document: [[{ node: 'Inserir no Repertório', type: 'ai_document', index: 0 }]] },
    'Dividir Texto': { ai_textSplitter: [[{ node: 'Carregar Documento', type: 'ai_textSplitter', index: 0 }]] }
  },
  pinData: {},
  settings: { executionOrder: 'v1' }
};

fs.writeFileSync(OUT_INGEST, JSON.stringify(ingest, null, 2) + '\n');
console.log('OK ->', OUT_MAIN, '| nós:', wf.nodes.length);
console.log('OK ->', OUT_INGEST, '| nós:', ingest.nodes.length);
