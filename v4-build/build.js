#!/usr/bin/env node
/**
 * Fase 3 (loop de feedback) como patch composável:
 *  - SEO_Orchestrator_V4.json          = V2 (Fase 1) + Fase 3  -> usar agora
 *  - SEO_Orchestrator_V4_Completo.json = V3 (Fases 1+2) + Fase 3 -> usar quando a Fase 2 entrar
 *
 * Componentes: botões 👍/👎 no chat -> tabela seo_feedback; destilação diária
 * de lições via LLM -> tabela seo_lessons; injeção das diretrizes nos prompts.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNIP = (f) => fs.readFileSync(path.join(__dirname, 'snippets', f), 'utf8').replace(/\n$/, '');
const uuid = () => crypto.randomUUID();

function mustReplace(str, find, repl, label) {
  if (!str.includes(find)) throw new Error('Substring não encontrada (' + label + '): ' + find.slice(0, 90));
  return str.split(find).join(repl);
}
function checkJs(code, label) {
  try { new Function(code); } catch (e) { throw new Error('Sintaxe inválida em ' + label + ': ' + e.message); }
}

const dtId = (table) => ({ __rl: true, mode: 'name', value: table });
const dtInsert = (name, table, valueMap, pos) => ({
  parameters: {
    resource: 'row', operation: 'insert', dataTableId: dtId(table),
    columns: { mappingMode: 'defineBelow', value: valueMap, matchingColumns: [], schema: [] }
  },
  id: uuid(), name, type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: pos
});
const dtGetLessons = (name, pos) => ({
  parameters: {
    resource: 'row', operation: 'get', dataTableId: dtId('seo_lessons'),
    matchType: 'allConditions',
    filters: { conditions: [{ keyName: 'chave', condition: 'eq', keyValue: 'global' }] },
    returnAll: false, limit: 1
  },
  id: uuid(), name, type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: pos,
  alwaysOutputData: true
});

function applyPhase3(wf, wfName) {
  const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
  const need = (name) => {
    if (!byName[name]) throw new Error('Nó base não encontrado: ' + name);
    return byName[name];
  };
  wf.name = wfName;

  // ---------- Código dos nós existentes ----------
  need('Parse Request').parameters.jsCode = SNIP('parse_request_v4.js');
  need('Preparar Conversa').parameters.jsCode = SNIP('preparar_conversa_v4.js');
  need('Parâmetros de Análise').parameters.jsCode = SNIP('parametros_analise_v4.js');

  // ---------- HTML ----------
  const rh = need('Responder HTML');
  let html = rh.parameters.responseBody;
  html = mustReplace(html,
    '.wsig a:hover{color:var(--ox)}',
    '.wsig a:hover{color:var(--ox)}\n    .fbbar{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)}\n    .fbq{font-size:11px;color:var(--muted)}\n    .fbbtn{background:none;border:1px solid var(--border);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:13px;transition:border-color .2s}\n    .fbbtn:hover{border-color:var(--ox)}',
    'css feedback');
  html = mustReplace(html,
    'let analysisContext = null;',
    "let analysisContext = null;\n  let lastUserText='';\n  let lastAssistantText='';\n  let fbSeq=0;\n  const fbCtx={};",
    'globals feedback');
  html = mustReplace(html, 'async function send(){', SNIP('fb_functions.js') + '\n  async function send(){', 'fb functions');
  html = mustReplace(html, SNIP('html_bubble_old.txt'), SNIP('html_bubble_new.txt'), 'fb na bolha');
  html = mustReplace(html,
    '🤖 <strong>Agente Orquestrador SEO</strong> disponível — aprofunde insights, gere conteúdo via COPBot ou analise novas URLs.</div>',
    '🤖 <strong>Agente Orquestrador SEO</strong> disponível — aprofunde insights, gere conteúdo via COPBot ou analise novas URLs.</div>${fbBarHtml()}',
    'fb no relatório');
  html = mustReplace(html,
    'addUserBubble(text);\n    addLoadingBubble(isAnalysis);',
    'lastUserText=text;\n    addUserBubble(text);\n    addLoadingBubble(isAnalysis);',
    'lastUserText');
  html = mustReplace(html,
    'analysisContext=data.analysisContext;\n        renderAnalysis(data.analysisContext);',
    "analysisContext=data.analysisContext;\n        lastAssistantText='[análise de '+(data.analysisContext?.url_analisada??'')+']';\n        renderAnalysis(data.analysisContext);",
    'lastAssistantText análise');
  html = mustReplace(html,
    "} else {\n        addAssistantBubble(data.message??'');",
    "} else {\n        lastAssistantText=data.message??'';\n        addAssistantBubble(data.message??'');",
    'lastAssistantText texto');
  html = mustReplace(html,
    '<span class="wchip">Inputs Flexíveis</span>',
    '<span class="wchip">Inputs Flexíveis</span>\n          <span class="wchip">Aprendizado Contínuo</span>',
    'chip aprendizado');
  rh.parameters.responseBody = html;

  // ---------- Injeção das lições nos prompts ----------
  const montar = need('Montar Contexto');
  montar.parameters.jsCode = mustReplace(
    montar.parameters.jsCode,
    'const context = {',
    [
      "let diretrizes = '';",
      'try {',
      "  const lr = $('Carregar Lições (Análise)').all().map(i => i.json).filter(r => r && typeof r.licoes === 'string' && r.licoes.trim());",
      '  if (lr.length) diretrizes = lr[0].licoes.slice(0, 4000);',
      '} catch (e) {}',
      '',
      'const context = {'
    ].join('\n'),
    'diretrizes fetch');
  montar.parameters.jsCode = mustReplace(
    montar.parameters.jsCode,
    'idioma: params.lang,',
    'idioma: params.lang,\n  diretrizes_aprendidas: diretrizes,',
    'diretrizes no contexto');
  checkJs(montar.parameters.jsCode, 'montar_contexto fase3');

  const agAnalise = need('Agente Análise SEO');
  agAnalise.parameters.text = mustReplace(
    agAnalise.parameters.text,
    '- Considere o mercado e idioma-alvo informados no contexto.',
    '- Considere o mercado e idioma-alvo informados no contexto.\n- Se houver diretrizes_aprendidas no contexto (aprendizado com feedbacks de usuários reais), siga-as ao formular insights e plano de ação.',
    'prompt análise fase3');

  const agOrq = need('Agente Orquestrador');
  agOrq.parameters.text = mustReplace(
    agOrq.parameters.text,
    '---\nMensagem atual do usuário:',
    'Diretrizes aprendidas com feedback dos usuários (aplique-as):\n{{ $json.licoes }}\n\n---\nMensagem atual do usuário:',
    'licoes no prompt');
  agOrq.parameters.options.systemMessage = mustReplace(
    agOrq.parameters.options.systemMessage,
    '\n\n---\n\n## Geração de Conteúdo SEO',
    '\n\nO sistema coleta feedbacks (👍/👎) dos usuários e aprende com eles: as "Diretrizes aprendidas" incluídas no prompt refletem esse aprendizado e devem ser seguidas com prioridade.\n\n---\n\n## Geração de Conteúdo SEO',
    'feedback no system');

  // ---------- Nós novos ----------
  const ifFeedback = {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [{ id: 'c1', leftValue: '={{ $json.isFeedback }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      },
      options: {}
    },
    id: uuid(), name: 'IF – Feedback?', type: 'n8n-nodes-base.if', typeVersion: 2.2,
    position: [-768, 5168]
  };

  const salvarFeedback = dtInsert('Salvar Feedback', 'seo_feedback', {
    email: '={{ $json.userEmail }}',
    rating: "={{ $json.feedback.rating === 'up' ? 'up' : 'down' }}",
    comentario: "={{ ($json.feedback.comment || '').slice(0, 500) }}",
    mensagem_usuario: "={{ ($json.feedback.user_message || '').slice(0, 2000) }}",
    resposta_assistente: "={{ ($json.feedback.assistant_message || '').slice(0, 4000) }}",
    url_analisada: "={{ $json.feedback.url_analisada || '' }}",
    topico: "={{ $json.feedback.topico || '' }}",
    criado_em: '={{ $now.toISO() }}'
  }, [-544, 5168]);

  const licoesAnalise = dtGetLessons('Carregar Lições (Análise)', [-176, 4736]);
  const licoesChat = dtGetLessons('Carregar Lições', [-176, 5536]);

  const cron = {
    parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 6 }] } },
    id: uuid(), name: 'Agendar Destilação', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2,
    position: [-1120, 6208]
  };
  const carregarFeedbacks = {
    parameters: {
      resource: 'row', operation: 'get', dataTableId: dtId('seo_feedback'),
      matchType: 'anyCondition', filters: {},
      returnAll: false, limit: 200,
      orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC'
    },
    id: uuid(), name: 'Carregar Feedbacks', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
    position: [-896, 6208], alwaysOutputData: true
  };
  const agregar = {
    parameters: { jsCode: SNIP('agregar_feedbacks.js') },
    id: uuid(), name: 'Agregar Feedbacks', type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [-672, 6208]
  };
  const licoesAtuais = dtGetLessons('Lições Atuais', [-448, 6208]);
  const prepDestilacao = {
    parameters: { jsCode: SNIP('preparar_destilacao.js') },
    id: uuid(), name: 'Preparar Destilação', type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [-224, 6208]
  };
  const orCreds = need('OpenRouter – Orquestrador').credentials;
  const destilar = {
    parameters: {
      promptType: 'define',
      text: SNIP('destilar_prompt.txt'),
      options: { systemMessage: SNIP('destilar_system.txt'), maxIterations: 1 }
    },
    id: uuid(), name: 'Destilar Lições', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1,
    position: [0, 6208]
  };
  const modeloLicoes = {
    parameters: { model: 'anthropic/claude-sonnet-4.6', options: { maxTokens: 2048, temperature: 0.3 } },
    id: uuid(), name: 'OpenRouter – Lições', type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', typeVersion: 1,
    position: [0, 6400], credentials: JSON.parse(JSON.stringify(orCreds))
  };
  const validarLicoes = {
    parameters: { jsCode: SNIP('validar_licoes.js') },
    id: uuid(), name: 'Validar Lições', type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [256, 6208]
  };
  const limparLicoes = {
    parameters: {
      resource: 'row', operation: 'deleteRows', dataTableId: dtId('seo_lessons'),
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'chave', condition: 'eq', keyValue: 'global' }] }
    },
    id: uuid(), name: 'Limpar Lições', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
    position: [480, 6208]
  };
  const gravarLicoes = dtInsert('Gravar Lições', 'seo_lessons', {
    chave: 'global',
    licoes: "={{ $('Validar Lições').first().json.licoes }}",
    atualizado_em: '={{ $now.toISO() }}'
  }, [704, 6208]);

  wf.nodes.push(ifFeedback, salvarFeedback, licoesAnalise, licoesChat,
    cron, carregarFeedbacks, agregar, licoesAtuais, prepDestilacao,
    destilar, modeloLicoes, validarLicoes, limparLicoes, gravarLicoes);

  // ---------- Conexões ----------
  const C = wf.connections;
  C['Parse Request'] = { main: [[{ node: 'IF – Feedback?', type: 'main', index: 0 }]] };
  C['IF – Feedback?'] = { main: [
    [{ node: 'Salvar Feedback', type: 'main', index: 0 }],
    [{ node: 'Extrair Intenção', type: 'main', index: 0 }]
  ] };
  C['IF – Análise Completa?'] = { main: [
    [{ node: 'Carregar Lições (Análise)', type: 'main', index: 0 }],
    [{ node: 'Carregar Lições', type: 'main', index: 0 }]
  ] };
  C['Carregar Lições (Análise)'] = { main: [[{ node: 'Parâmetros de Análise', type: 'main', index: 0 }]] };
  C['Carregar Lições'] = { main: [[{ node: 'Preparar Conversa', type: 'main', index: 0 }]] };
  C['Agendar Destilação'] = { main: [[{ node: 'Carregar Feedbacks', type: 'main', index: 0 }]] };
  C['Carregar Feedbacks'] = { main: [[{ node: 'Agregar Feedbacks', type: 'main', index: 0 }]] };
  C['Agregar Feedbacks'] = { main: [[{ node: 'Lições Atuais', type: 'main', index: 0 }]] };
  C['Lições Atuais'] = { main: [[{ node: 'Preparar Destilação', type: 'main', index: 0 }]] };
  C['Preparar Destilação'] = { main: [[{ node: 'Destilar Lições', type: 'main', index: 0 }]] };
  C['OpenRouter – Lições'] = { ai_languageModel: [[{ node: 'Destilar Lições', type: 'ai_languageModel', index: 0 }]] };
  C['Destilar Lições'] = { main: [[{ node: 'Validar Lições', type: 'main', index: 0 }]] };
  C['Validar Lições'] = { main: [[{ node: 'Limpar Lições', type: 'main', index: 0 }]] };
  C['Limpar Lições'] = { main: [[{ node: 'Gravar Lições', type: 'main', index: 0 }]] };

  // Sanidade
  const names = new Set(wf.nodes.map((n) => n.name));
  if (names.size !== wf.nodes.length) throw new Error('Nomes duplicados');
  for (const [from, types] of Object.entries(C)) {
    if (!names.has(from)) throw new Error('Conexão de nó inexistente: ' + from);
    for (const lists of Object.values(types)) for (const list of lists) for (const c of list) {
      if (!names.has(c.node)) throw new Error('Conexão para nó inexistente: ' + c.node);
    }
  }
  return wf;
}

const jobs = [
  ['SEO_Orchestrator_V2_Fase1.json', 'SEO Orchestrator V3', 'SEO_Orchestrator_V3.json'],
  [path.join('v3-build', 'fase12_intermediate.json'), 'SEO Orchestrator V4', 'SEO_Orchestrator_V4.json']
];
for (const [input, name, output] of jobs) {
  const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', input), 'utf8'));
  applyPhase3(wf, name);
  fs.writeFileSync(path.join(__dirname, '..', output), JSON.stringify(wf, null, 2) + '\n');
  console.log('OK ->', output, '| nós:', wf.nodes.length);
}
