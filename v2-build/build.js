#!/usr/bin/env node
/**
 * Gera SEO_Orchestrator_V2_Fase1.json a partir do JSON da V1.
 * Estratégia: clona os nós reaproveitados da V1 (preservando o HTML do front
 * com edições pontuais) e adiciona/substitui os nós novos da Fase 1.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const V1_PATH = '/root/.claude/uploads/b6506b3b-d8c4-5d95-9ad0-2739fbb132f4/a261b176-SEO_Orchestrator_V1.json';
const OUT_PATH = path.join(__dirname, '..', 'SEO_Orchestrator_V2_Fase1.json');
const SNIP = (f) => {
  const raw = fs.readFileSync(path.join(__dirname, 'snippets', f), 'utf8');
  return raw.replace(/\n$/, '');
};
const uuid = () => crypto.randomUUID();
const clone = (o) => JSON.parse(JSON.stringify(o));

function mustReplace(str, find, repl, label) {
  if (!str.includes(find)) throw new Error('Substring não encontrada (' + label + '): ' + find.slice(0, 80));
  return str.split(find).join(repl);
}
function checkJs(code, label) {
  try { new Function(code); } catch (e) { throw new Error('Sintaxe inválida em ' + label + ': ' + e.message); }
}

const v1 = JSON.parse(fs.readFileSync(V1_PATH, 'utf8'));
const byName = Object.fromEntries(v1.nodes.map((n) => [n.name, n]));
const need = (name) => {
  if (!byName[name]) throw new Error('Nó V1 não encontrado: ' + name);
  return clone(byName[name]);
};

// Nomes (devem casar com as referências $('...') dos snippets)
const POLL_NAME = 'GET – Poll Resultado';
if (!byName[POLL_NAME]) throw new Error('Nome do webhook de poll divergente na V1');

// ---------- Snippets ----------
const codeParseRequest   = SNIP('parse_request.js');
const codeDefinirRota    = SNIP('definir_rota.js');
const codeParametros     = SNIP('parametros_analise.js');
const codeLerResultado   = SNIP('ler_resultado.js');
const codeFormatarAnal   = SNIP('formatar_analise.js');
const codePrepConversa   = SNIP('preparar_conversa.js');
const codePrepRegistro   = SNIP('preparar_registro.js');
[['parse_request', codeParseRequest], ['definir_rota', codeDefinirRota], ['parametros', codeParametros],
 ['ler_resultado', codeLerResultado], ['formatar_analise', codeFormatarAnal],
 ['preparar_conversa', codePrepConversa], ['preparar_registro', codePrepRegistro]]
  .forEach(([l, c]) => checkJs(c, l));
if (!codeLerResultado.includes("$('" + POLL_NAME + "')")) throw new Error('ler_resultado.js não referencia ' + POLL_NAME);

const intentSchema   = SNIP('intent_schema.json');
const intentSystem   = SNIP('intent_system_prompt.txt');
const analysisSchema = SNIP('analysis_schema.json');
const analysisPrompt = SNIP('analysis_prompt.txt');
const analysisSystem = SNIP('analysis_system.txt');
const orqPrompt      = SNIP('orq_prompt.txt');
const orqInsert      = SNIP('orq_system_insert.txt');
JSON.parse(intentSchema); JSON.parse(analysisSchema); // valida schemas

// ---------- HTML (Responder HTML) ----------
const respondHtml = need('Responder HTML');
let html = respondHtml.parameters.responseBody;

html = mustReplace(html,
  'placeholder="Ex: https://centauro.com.br tênis de corrida"',
  'placeholder="Ex: https://centauro.com.br tênis de corrida — ou apenas uma keyword/pergunta"',
  'placeholder');

html = mustReplace(html,
  'URL + tópico obrigatórios · E-mail opcional para relatório CWV detalhado · Enter para enviar',
  'Análise completa: URL + tema · Ou envie só keyword/pergunta · E-mail opcional para relatório CWV · Enter para enviar',
  'hint');

html = mustReplace(html,
  '<p>Envie uma URL e um tópico para análise completa com Query Fan-out, GEO Mapping, On-Page SEO e Core Web Vitals. Depois, explore os resultados e gere conteúdo otimizado conversando com o Agente Orquestrador.</p>',
  '<p>Envie uma URL + tema para a análise completa (Query Fan-out, GEO Mapping, On-Page SEO e Core Web Vitals) — ou comece com apenas uma keyword, uma URL ou uma pergunta livre: o agente decide quais ferramentas acionar.</p>',
  'welcome');

html = mustReplace(html,
  '<span class="wchip">Geração de Conteúdo</span>',
  '<span class="wchip">Geração de Conteúdo</span>\n          <span class="wchip">Inputs Flexíveis</span>',
  'chips');

html = mustReplace(html,
  '<strong>Exemplo 1</strong>https://centauro.com.br tênis de corrida',
  '<strong>Análise completa</strong>https://centauro.com.br tênis de corrida',
  'exemplo1');
html = mustReplace(html,
  '<strong>Exemplo 2</strong>https://panvel.com.br protetor solar fps 50',
  '<strong>Só keyword</strong>como aparece "protetor solar fps 50" nas IAs generativas?',
  'exemplo2');
html = mustReplace(html,
  '<strong>Exemplo 3</strong>https://decathlon.com.br bike speed carbono</div>',
  '<strong>Só URL</strong>audite https://decathlon.com.br e aponte os principais problemas técnicos</div>\n          <div class="wexample" onclick="fillExample(this)"><strong>Conteúdo</strong>crie meta tags para a página de tênis de corrida da Centauro</div>',
  'exemplo3');

html = mustReplace(html, SNIP('html_fillexample_old.txt'), SNIP('html_fillexample_new.txt'), 'fillExample');
html = mustReplace(html, SNIP('html_send_old.txt'), SNIP('html_send_new.txt'), 'send()');
respondHtml.parameters.responseBody = html;

// ---------- Branch HTML / Poll ----------
const serveHtml = need('GET – Serve HTML');
const pollHook  = need(POLL_NAME);
const responderPoll = need('Responder Poll');
responderPoll.position = [-560, 4704];

const dtId = (table) => ({ __rl: true, mode: 'name', value: table });
const buscarJob = {
  parameters: {
    resource: 'row', operation: 'get',
    dataTableId: dtId('seo_jobs'),
    matchType: 'allConditions',
    filters: { conditions: [{ keyName: 'jobId', condition: 'eq', keyValue: '={{ $json.query.jobId }}' }] },
    returnAll: false, limit: 1
  },
  id: uuid(), name: 'Buscar Job', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [-944, 4704], alwaysOutputData: true
};
const lerResultado = {
  parameters: { jsCode: codeLerResultado },
  id: uuid(), name: 'Ler Resultado', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [-752, 4704]
};
const apagarJob = {
  parameters: {
    resource: 'row', operation: 'deleteRows',
    dataTableId: dtId('seo_jobs'),
    matchType: 'allConditions',
    filters: { conditions: [{ keyName: 'jobId', condition: 'eq', keyValue: "={{ $('" + POLL_NAME + "').first().json.query.jobId }}" }] }
  },
  id: uuid(), name: 'Apagar Job', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [-368, 4704]
};

// ---------- Branch Chat: parse + roteamento ----------
const postChat = need('POST – Chat');
const parseRequest = need('Parse Request');
parseRequest.parameters.jsCode = codeParseRequest;

const extrator = {
  parameters: {
    text: "=Mensagem do usuário: {{ $json.message }}\n\nJá existe uma análise completa nesta sessão? {{ $json.hasContext ? 'Sim' : 'Não' }}",
    schemaType: 'manual',
    inputSchema: intentSchema,
    options: { systemPromptTemplate: intentSystem }
  },
  id: uuid(), name: 'Extrair Intenção', type: '@n8n/n8n-nodes-langchain.informationExtractor', typeVersion: 1.2,
  position: [-656, 4976], onError: 'continueRegularOutput'
};
const orCreds = need('OpenRouter – Análise').credentials;
const modeloExtrator = {
  parameters: { model: 'anthropic/claude-haiku-4.5', options: { maxTokens: 1024, temperature: 0 } },
  id: uuid(), name: 'OpenRouter – Extrator', type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', typeVersion: 1,
  position: [-656, 5168], credentials: clone(orCreds)
};
const definirRota = {
  parameters: { jsCode: codeDefinirRota },
  id: uuid(), name: 'Definir Rota', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [-432, 4976]
};
const ifNode = need('IF: Nova Análise?');
ifNode.name = 'IF – Análise Completa?';
ifNode.position = [-240, 4976];
ifNode.parameters.conditions.conditions = [{
  id: 'c1',
  leftValue: '={{ $json.route }}',
  rightValue: 'analysis',
  operator: { type: 'string', operation: 'equals' }
}];

// ---------- Pipeline de análise ----------
const parametros = need('Extrair URL e Tópico');
parametros.name = 'Parâmetros de Análise';
parametros.parameters.jsCode = codeParametros;
parametros.position = [-16, 4736];

const setBodyParam = (node, name, value) => {
  const p = node.parameters.bodyParameters.parameters.find((x) => x.name === name);
  if (!p) throw new Error('Param ' + name + ' não encontrado em ' + node.name);
  p.value = value;
};

const fanout = need('Query Fan-out v2');
fanout.position = [240, 4464];
setBodyParam(fanout, 'market', '={{ $json.market }}');
setBodyParam(fanout, 'lang', '={{ $json.lang }}');

const geo = need('Prompt Mapper GEO');
geo.position = [240, 4672];
setBodyParam(geo, 'market', '={{ $json.market }}');
setBodyParam(geo, 'lang', '={{ $json.lang }}');

const onPage = need('On-Page SEO Audit');     onPage.position = [240, 4864];
const psi = need('PageSpeed Insights');       psi.position = [240, 5264];
const parsePsi = need('Parse PSI');           parsePsi.position = [480, 5248];
const corePulse = need('CorePulse CWV (sync)'); corePulse.position = [240, 5072];
const parseCorePulse = need('Parse CorePulse'); parseCorePulse.position = [480, 5072];
const merge = need('Unir Resultados');        merge.position = [784, 4864];

const montar = need('Montar Contexto');
montar.position = [1024, 4864];
montar.parameters.jsCode = mustReplace(montar.parameters.jsCode, "$('Extrair URL e Tópico')", "$('Parâmetros de Análise')", 'ref params');
montar.parameters.jsCode = mustReplace(montar.parameters.jsCode, 'topico: params.topic,', 'topico: params.topic,\n  mercado: params.market,\n  idioma: params.lang,', 'mercado/idioma');
checkJs(montar.parameters.jsCode, 'montar_contexto');

const agenteAnalise = need('Agente Análise SEO');
agenteAnalise.position = [1264, 4864];
agenteAnalise.parameters.text = analysisPrompt;
agenteAnalise.parameters.hasOutputParser = true;
agenteAnalise.parameters.options.systemMessage = analysisSystem;
agenteAnalise.parameters.options.maxIterations = 2;
agenteAnalise.onError = 'continueRegularOutput';

const modeloAnalise = need('OpenRouter – Análise');
modeloAnalise.position = [1216, 5072];

const parserAnalise = {
  parameters: { schemaType: 'manual', inputSchema: analysisSchema },
  id: uuid(), name: 'Saída Estruturada – Análise', type: '@n8n/n8n-nodes-langchain.outputParserStructured', typeVersion: 1.3,
  position: [1440, 5072]
};

const formatarAnalise = need('Formatar Análise');
formatarAnalise.position = [1632, 4864];
formatarAnalise.parameters.jsCode = codeFormatarAnal;

const salvarResultado = {
  parameters: {
    resource: 'row', operation: 'insert',
    dataTableId: dtId('seo_jobs'),
    columns: {
      mappingMode: 'defineBelow',
      value: {
        jobId: "={{ $('Parse Request').first().json.jobId }}",
        payload: '={{ JSON.stringify($json) }}'
      },
      matchingColumns: [],
      schema: []
    }
  },
  id: uuid(), name: 'Salvar Resultado', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [1856, 4864]
};

const prepararRegistro = {
  parameters: { jsCode: codePrepRegistro },
  id: uuid(), name: 'Preparar Registro', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [2064, 4864]
};
const registrarInteracao = {
  parameters: {
    resource: 'row', operation: 'insert',
    dataTableId: dtId('seo_conversations'),
    columns: {
      mappingMode: 'defineBelow',
      value: {
        email: '={{ $json.email }}',
        jobId: '={{ $json.jobId }}',
        rota: '={{ $json.rota }}',
        mensagem: '={{ $json.mensagem }}',
        resposta: '={{ $json.resposta }}',
        criado_em: '={{ $json.criado_em }}'
      },
      matchingColumns: [],
      schema: []
    }
  },
  id: uuid(), name: 'Registrar Interação', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [2272, 4864]
};

// ---------- Branch conversa ----------
const prepararConversa = need('Preparar Conversa');
prepararConversa.parameters.jsCode = codePrepConversa;
prepararConversa.position = [-16, 5536];

const agenteOrq = need('Agente Orquestrador');
agenteOrq.position = [224, 5536];
agenteOrq.parameters.text = orqPrompt;
agenteOrq.parameters.options.maxIterations = 8;
agenteOrq.parameters.options.systemMessage = mustReplace(
  agenteOrq.parameters.options.systemMessage,
  'Você realizou uma análise completa e está em conversa com o usuário sobre os resultados. Use as ferramentas disponíveis quando a pergunta exigir dados novos além da análise existente:',
  orqInsert,
  'system orquestrador'
);

const modeloOrq = need('OpenRouter – Orquestrador');
modeloOrq.position = [176, 5744];

const FROM_AI_MARKET = "={{ $fromAI('market', 'Código do país do mercado-alvo (ex: BR, US, PT). Use BR se o usuário não especificar', 'string', 'BR') }}";
const FROM_AI_LANG   = "={{ $fromAI('lang', 'Idioma-alvo no formato BCP-47 (ex: pt-BR, en-US). Use pt-BR se o usuário não especificar', 'string', 'pt-BR') }}";

const toolFanout = need('Analisar Keyword via Fan-out');
toolFanout.position = [496, 5760];
setBodyParam(toolFanout, 'market', FROM_AI_MARKET);
setBodyParam(toolFanout, 'lang', FROM_AI_LANG);

const toolGeo = need('Mapear Visibilidade GEO');
toolGeo.position = [656, 5760];
setBodyParam(toolGeo, 'market', FROM_AI_MARKET);
setBodyParam(toolGeo, 'lang', FROM_AI_LANG);

const toolOnPage = need('Auditar Página On-Page'); toolOnPage.position = [816, 5760];
const toolCwv = need('Verificar Core Web Vitals'); toolCwv.position = [976, 5760];

const formatarConversa = need('Formatar Conversa');
formatarConversa.position = [560, 5536];

// ---------- Monta workflow ----------
const nodes = [
  serveHtml, respondHtml,
  pollHook, buscarJob, lerResultado, responderPoll, apagarJob,
  postChat, parseRequest, extrator, modeloExtrator, definirRota, ifNode,
  parametros, fanout, geo, onPage, psi, parsePsi, corePulse, parseCorePulse,
  merge, montar, agenteAnalise, modeloAnalise, parserAnalise, formatarAnalise,
  salvarResultado, prepararRegistro, registrarInteracao,
  prepararConversa, agenteOrq, modeloOrq, toolFanout, toolGeo, toolOnPage, toolCwv,
  formatarConversa
];

const main = (to, index = 0) => [{ node: to, type: 'main', index }];
const connections = {
  'GET – Serve HTML': { main: [main('Responder HTML')] },
  [POLL_NAME]: { main: [main('Buscar Job')] },
  'Buscar Job': { main: [main('Ler Resultado')] },
  'Ler Resultado': { main: [main('Responder Poll')] },
  'Responder Poll': { main: [main('Apagar Job')] },
  'POST – Chat': { main: [main('Parse Request')] },
  'Parse Request': { main: [main('Extrair Intenção')] },
  'OpenRouter – Extrator': { ai_languageModel: [[{ node: 'Extrair Intenção', type: 'ai_languageModel', index: 0 }]] },
  'Extrair Intenção': { main: [main('Definir Rota')] },
  'Definir Rota': { main: [main('IF – Análise Completa?')] },
  'IF – Análise Completa?': { main: [main('Parâmetros de Análise'), main('Preparar Conversa')] },
  'Parâmetros de Análise': {
    main: [[
      { node: 'Query Fan-out v2', type: 'main', index: 0 },
      { node: 'Prompt Mapper GEO', type: 'main', index: 0 },
      { node: 'On-Page SEO Audit', type: 'main', index: 0 },
      { node: 'PageSpeed Insights', type: 'main', index: 0 },
      { node: 'CorePulse CWV (sync)', type: 'main', index: 0 }
    ]]
  },
  'Query Fan-out v2': { main: [main('Unir Resultados', 0)] },
  'Prompt Mapper GEO': { main: [main('Unir Resultados', 1)] },
  'On-Page SEO Audit': { main: [main('Unir Resultados', 2)] },
  'PageSpeed Insights': { main: [main('Parse PSI')] },
  'Parse PSI': { main: [main('Unir Resultados', 3)] },
  'CorePulse CWV (sync)': { main: [main('Parse CorePulse')] },
  'Parse CorePulse': { main: [main('Unir Resultados', 4)] },
  'Unir Resultados': { main: [main('Montar Contexto')] },
  'Montar Contexto': { main: [main('Agente Análise SEO')] },
  'OpenRouter – Análise': { ai_languageModel: [[{ node: 'Agente Análise SEO', type: 'ai_languageModel', index: 0 }]] },
  'Saída Estruturada – Análise': { ai_outputParser: [[{ node: 'Agente Análise SEO', type: 'ai_outputParser', index: 0 }]] },
  'Agente Análise SEO': { main: [main('Formatar Análise')] },
  'Formatar Análise': { main: [main('Salvar Resultado')] },
  'Salvar Resultado': { main: [main('Preparar Registro')] },
  'Preparar Registro': { main: [main('Registrar Interação')] },
  'Preparar Conversa': { main: [main('Agente Orquestrador')] },
  'OpenRouter – Orquestrador': { ai_languageModel: [[{ node: 'Agente Orquestrador', type: 'ai_languageModel', index: 0 }]] },
  'Analisar Keyword via Fan-out': { ai_tool: [[{ node: 'Agente Orquestrador', type: 'ai_tool', index: 0 }]] },
  'Mapear Visibilidade GEO': { ai_tool: [[{ node: 'Agente Orquestrador', type: 'ai_tool', index: 0 }]] },
  'Auditar Página On-Page': { ai_tool: [[{ node: 'Agente Orquestrador', type: 'ai_tool', index: 0 }]] },
  'Verificar Core Web Vitals': { ai_tool: [[{ node: 'Agente Orquestrador', type: 'ai_tool', index: 0 }]] },
  'Agente Orquestrador': { main: [main('Formatar Conversa')] },
  'Formatar Conversa': { main: [main('Salvar Resultado')] }
};

// Sanidade: toda conexão aponta para nós existentes
const nodeNames = new Set(nodes.map((n) => n.name));
for (const [from, types] of Object.entries(connections)) {
  if (!nodeNames.has(from)) throw new Error('Conexão de nó inexistente: ' + from);
  for (const lists of Object.values(types)) for (const list of lists) for (const c of list) {
    if (!nodeNames.has(c.node)) throw new Error('Conexão para nó inexistente: ' + c.node);
  }
}
if (nodes.length !== nodeNames.size) throw new Error('Nomes de nós duplicados');

const workflow = {
  name: 'SEO Orchestrator V2 (Fase 1)',
  nodes,
  connections,
  pinData: {},
  settings: clone(v1.settings)
};

fs.writeFileSync(OUT_PATH, JSON.stringify(workflow, null, 2) + '\n');
console.log('OK ->', OUT_PATH, '| nós:', nodes.length);
