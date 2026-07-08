import { workflow, node, trigger, sticky, newCredential, ifElse, splitInBatches, nextBatch, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

const OPENROUTER_CRED = { openRouterApi: { id: '4MTPOCzYj4oYOSjA', name: 'OpenRouter account 51' } };
const GMAIL_CRED = { gmailOAuth2: { id: 'H4YY5Bldwy95Y3qW', name: 'SEO-N8N' } };
const JIRA_CRED = { jiraSoftwareCloudApi: { id: 'Ut4FQk61Gd0d81j4', name: 'JIRA-GABRIELY' } };

const trigQuinzenal = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cadência Quinzenal (Fábrica)',
    position: [-1120, 160],
    parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 2, triggerAtDay: [1], triggerAtHour: 7, triggerAtMinute: 0 }] } }
  },
  output: [{}]
});

const trigSentinela = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Sentinela Semanal (Proteção de Receita)',
    position: [-1120, 400],
    parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [4], triggerAtHour: 7, triggerAtMinute: 30 }] } }
  },
  output: [{}]
});

const trigManual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Execução Manual (Teste)', position: [-1120, 640] },
  output: [{}]
});

const modoCompleto = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Modo: Completo',
    position: [-880, 160],
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [{ id: 'm1', name: 'modo', value: 'completo', type: 'string' }] }
    }
  },
  output: [{ modo: 'completo' }]
});

const modoSentinela = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Modo: Sentinela',
    position: [-880, 400],
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [{ id: 'm2', name: 'modo', value: 'sentinela', type: 'string' }] }
    }
  },
  output: [{ modo: 'sentinela' }]
});

const modoManual = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Modo: Manual',
    position: [-880, 640],
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [{ id: 'm3', name: 'modo', value: 'completo', type: 'string' }] }
    }
  },
  output: [{ modo: 'completo' }]
});

const carregarClientes = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Carregar Clientes Ativos',
    position: [-640, 400],
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'name', value: 'cro_clientes' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'ativo', condition: 'isTrue' }] },
      returnAll: true
    }
  },
  output: [{ id: 1, cliente: 'exemplo-loja', ativo: true, ga4_property_id: '123456789', jira_project_key: 'CRO', email_analista: 'analista@cadastra.com', valor_por_conversao: 280 }]
});

const montarFila = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Montar Fila',
    position: [-400, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "let modo = 'completo';\n" +
        "try { const m = $('Modo: Sentinela').first().json.modo; if (m) modo = m; } catch (e) {}\n" +
        "try { const m = $('Modo: Completo').first().json.modo; if (m) modo = m; } catch (e) {}\n" +
        "try { const m = $('Modo: Manual').first().json.modo; if (m) modo = m; } catch (e) {}\n" +
        "return $input.all()\n" +
        "  .filter(i => i.json && i.json.cliente)\n" +
        "  .map(i => ({ json: { ...i.json, modo } }));"
    }
  },
  output: [{ id: 1, cliente: 'exemplo-loja', modo: 'completo', ga4_property_id: '123456789' }]
});

const loopClientes = splitInBatches({
  version: 3,
  config: { name: 'Processar Clientes', position: [-160, 400], parameters: { batchSize: 1 } }
});

const rodadaConcluida = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Rodada Concluída',
    position: [80, 160],
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [{ id: 'r1', name: 'rodada_finalizada_em', value: expr('{{ $now.toISO() }}'), type: 'string' }] }
    }
  },
  output: [{ rodada_finalizada_em: '2026-07-07T10:00:00Z' }]
});

const prepararCliente = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Preparar Cliente',
    position: [80, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const r = $input.first().json;\n" +
        "const hoje = new Date();\n" +
        "function d(offsetDias) {\n" +
        "  const x = new Date(hoje.getTime() - offsetDias * 86400000);\n" +
        "  return x.toISOString().slice(0, 10);\n" +
        "}\n" +
        "const slug = String(r.cliente || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');\n" +
        "const carimbo = hoje.toISOString().slice(0, 10).replace(/-/g, '');\n" +
        "const modo = r.modo || 'completo';\n" +
        "return [{ json: {\n" +
        "  cliente: r.cliente,\n" +
        "  modo,\n" +
        "  ciclo_id: slug + '-' + carimbo + (modo === 'sentinela' ? '-S' : ''),\n" +
        "  site_url: r.site_url || '',\n" +
        "  contexto_negocio: r.contexto_negocio || '',\n" +
        "  vertical: r.vertical || '',\n" +
        "  tier: r.tier || 'essential',\n" +
        "  ga4_property_id: String(r.ga4_property_id || '').replace(/[^0-9]/g, ''),\n" +
        "  clarity_api_token: r.clarity_api_token || '',\n" +
        "  jira_base_url: String(r.jira_base_url || '').replace(/\\/$/, ''),\n" +
        "  jira_project_key: r.jira_project_key || '',\n" +
        "  jira_issue_type: r.jira_issue_type || 'Task',\n" +
        "  email_analista: r.email_analista || 'tsoares@cadastra.com',\n" +
        "  valor_por_conversao: Number(r.valor_por_conversao) || 0,\n" +
        "  moeda: r.moeda || 'BRL',\n" +
        "  periodo_inicio: d(28), periodo_fim: d(1),\n" +
        "  periodo_prev_inicio: d(56), periodo_prev_fim: d(29)\n" +
        "} }];"
    }
  },
  output: [{ cliente: 'exemplo-loja', modo: 'completo', ciclo_id: 'exemplo-loja-20260707', ga4_property_id: '123456789', clarity_api_token: 'tok', jira_base_url: 'https://cadastra.atlassian.net', jira_project_key: 'CRO', jira_issue_type: 'Task', email_analista: 'analista@cadastra.com', valor_por_conversao: 280, moeda: 'BRL', periodo_inicio: '2026-06-09', periodo_fim: '2026-07-06', periodo_prev_inicio: '2026-05-12', periodo_prev_fim: '2026-06-08', contexto_negocio: 'E-commerce de moda', site_url: 'https://www.exemplo.com.br', vertical: 'e-commerce', tier: 'essential', moeda2: 'BRL' }]
});

const ga4Serie = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'GA4 – Totais do Período',
    position: [320, 400],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("https://analyticsdata.googleapis.com/v1beta/properties/{{ $('Preparar Cliente').first().json.ga4_property_id }}:runReport"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleAnalyticsOAuth2',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ dateRanges: [ { startDate: $('Preparar Cliente').first().json.periodo_inicio, endDate: $('Preparar Cliente').first().json.periodo_fim, name: 'atual' }, { startDate: $('Preparar Cliente').first().json.periodo_prev_inicio, endDate: $('Preparar Cliente').first().json.periodo_prev_fim, name: 'anterior' } ], metrics: [ { name: 'sessions' }, { name: 'totalUsers' }, { name: 'keyEvents' }, { name: 'purchaseRevenue' } ], limit: 8 }) }}"),
      options: { response: { response: { neverError: true } }, timeout: 60000 }
    },
    credentials: { googleAnalyticsOAuth2: newCredential('Google Analytics - CRO Next') }
  },
  output: [{ rows: [{ dimensionValues: [{ value: 'atual' }], metricValues: [{ value: '48000' }, { value: '39000' }, { value: '860' }, { value: '240000' }] }] }]
});

const ga4Funil = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'GA4 – Eventos de Funil',
    position: [560, 400],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("https://analyticsdata.googleapis.com/v1beta/properties/{{ $('Preparar Cliente').first().json.ga4_property_id }}:runReport"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleAnalyticsOAuth2',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ dateRanges: [ { startDate: $('Preparar Cliente').first().json.periodo_inicio, endDate: $('Preparar Cliente').first().json.periodo_fim, name: 'atual' }, { startDate: $('Preparar Cliente').first().json.periodo_prev_inicio, endDate: $('Preparar Cliente').first().json.periodo_prev_fim, name: 'anterior' } ], dimensions: [ { name: 'eventName' } ], metrics: [ { name: 'eventCount' }, { name: 'totalUsers' } ], dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['page_view','view_item','view_item_list','select_item','add_to_cart','view_cart','begin_checkout','add_shipping_info','add_payment_info','purchase','generate_lead','form_start','form_submit','sign_up','search'] } } }, limit: 80 }) }}"),
      options: { response: { response: { neverError: true } }, timeout: 60000 }
    },
    credentials: { googleAnalyticsOAuth2: newCredential('Google Analytics - CRO Next') }
  },
  output: [{ rows: [{ dimensionValues: [{ value: 'add_to_cart' }, { value: 'atual' }], metricValues: [{ value: '5200' }, { value: '3900' }] }] }]
});

const ga4Canais = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'GA4 – Canais & Devices',
    position: [800, 400],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("https://analyticsdata.googleapis.com/v1beta/properties/{{ $('Preparar Cliente').first().json.ga4_property_id }}:runReport"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleAnalyticsOAuth2',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ dateRanges: [ { startDate: $('Preparar Cliente').first().json.periodo_inicio, endDate: $('Preparar Cliente').first().json.periodo_fim } ], dimensions: [ { name: 'sessionDefaultChannelGroup' }, { name: 'deviceCategory' } ], metrics: [ { name: 'sessions' }, { name: 'keyEvents' }, { name: 'purchaseRevenue' } ], orderBys: [ { desc: true, metric: { metricName: 'sessions' } } ], limit: 30 }) }}"),
      options: { response: { response: { neverError: true } }, timeout: 60000 }
    },
    credentials: { googleAnalyticsOAuth2: newCredential('Google Analytics - CRO Next') }
  },
  output: [{ rows: [{ dimensionValues: [{ value: 'Organic Search' }, { value: 'mobile' }], metricValues: [{ value: '21000' }, { value: '260' }, { value: '78000' }] }] }]
});

const clarityFetch = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Clarity – Comportamento',
    position: [1040, 400],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://www.clarity.ms/export-data/api/v1/project-live-insights',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'numOfDays', value: '3' }] },
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Authorization', value: expr("{{ 'Bea' + 'rer ' + $('Preparar Cliente').first().json.clarity_api_token }}") }] },
      options: { response: { response: { neverError: true } }, timeout: 60000 }
    }
  },
  output: [[{ metricName: 'RageClickCount', information: [{ totalSessionCount: '1200', sessionsWithMetricPercentage: 4.2 }] }]]
});

const jiraBacklog = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Jira – Backlog Existente',
    position: [1280, 400],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr("{{ $('Preparar Cliente').first().json.jira_base_url }}/rest/api/2/search"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'jiraSoftwareCloudApi',
      sendQuery: true,
      queryParameters: { parameters: [
        { name: 'jql', value: expr("project = \"{{ $('Preparar Cliente').first().json.jira_project_key }}\" AND statusCategory != Done") },
        { name: 'maxResults', value: '30' },
        { name: 'fields', value: 'summary,status,labels,created' }
      ] },
      options: { response: { response: { neverError: true } }, timeout: 60000 }
    },
    credentials: JIRA_CRED
  },
  output: [{ issues: [{ key: 'CRO-12', fields: { summary: 'Teste A/B frete grátis', status: { name: 'To Do' } } }] }]
});

const normalizar = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Agente de Ingestão (Normalizar)',
    position: [1520, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "function safe(nome) { try { const j = $(nome).first().json; return j || null; } catch (e) { return null; } }\n" +
        "const P = $('Preparar Cliente').first().json;\n" +
        "const ga4Tot = safe('GA4 – Totais do Período');\n" +
        "const ga4Fun = safe('GA4 – Eventos de Funil');\n" +
        "const ga4Can = safe('GA4 – Canais & Devices');\n" +
        "const clarity = safe('Clarity – Comportamento');\n" +
        "const jira = safe('Jira – Backlog Existente');\n" +
        "const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };\n" +
        "const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);\n" +
        "const round1 = v => (v === null || v === undefined ? null : Math.round(v * 10) / 10);\n" +
        "\n" +
        "// ---- KPIs (2 dateRanges: última dimensão automática é o dateRange) ----\n" +
        "let kpis = { sessoes: null, usuarios: null, conversoes: null, receita: null, taxa_conversao: null, sessoes_ant: null, conversoes_ant: null, receita_ant: null, taxa_ant: null, sessoes_delta: null, conversoes_delta: null, receita_delta: null, taxa_delta: null };\n" +
        "let ga4ok = false;\n" +
        "if (ga4Tot && Array.isArray(ga4Tot.rows)) {\n" +
        "  ga4ok = true;\n" +
        "  for (const row of ga4Tot.rows) {\n" +
        "    const dims = (row.dimensionValues || []).map(x => x.value);\n" +
        "    const faixa = dims[dims.length - 1] || 'atual';\n" +
        "    const m = (row.metricValues || []).map(x => num(x.value));\n" +
        "    if (faixa === 'atual' || faixa === 'date_range_0') { kpis.sessoes = m[0]; kpis.usuarios = m[1]; kpis.conversoes = m[2]; kpis.receita = m[3]; }\n" +
        "    else { kpis.sessoes_ant = m[0]; kpis.conversoes_ant = m[2]; kpis.receita_ant = m[3]; }\n" +
        "  }\n" +
        "  kpis.taxa_conversao = kpis.sessoes > 0 ? round1((kpis.conversoes / kpis.sessoes) * 1000) / 10 : null;\n" +
        "  kpis.taxa_ant = kpis.sessoes_ant > 0 ? round1((kpis.conversoes_ant / kpis.sessoes_ant) * 1000) / 10 : null;\n" +
        "  kpis.sessoes_delta = round1(pct(kpis.sessoes, kpis.sessoes_ant));\n" +
        "  kpis.conversoes_delta = round1(pct(kpis.conversoes, kpis.conversoes_ant));\n" +
        "  kpis.receita_delta = round1(pct(kpis.receita, kpis.receita_ant));\n" +
        "  kpis.taxa_delta = round1(pct(kpis.taxa_conversao, kpis.taxa_ant));\n" +
        "}\n" +
        "\n" +
        "// ---- Funil de eventos ----\n" +
        "const eventos = {};\n" +
        "if (ga4Fun && Array.isArray(ga4Fun.rows)) {\n" +
        "  for (const row of ga4Fun.rows) {\n" +
        "    const dims = (row.dimensionValues || []).map(x => x.value);\n" +
        "    const nome = dims[0];\n" +
        "    const faixa = dims[dims.length - 1] || 'atual';\n" +
        "    const m = (row.metricValues || []).map(x => num(x.value));\n" +
        "    eventos[nome] = eventos[nome] || { atual: 0, anterior: 0, usuarios_atual: 0 };\n" +
        "    if (faixa === 'atual' || faixa === 'date_range_0') { eventos[nome].atual = m[0]; eventos[nome].usuarios_atual = m[1]; }\n" +
        "    else { eventos[nome].anterior = m[0]; }\n" +
        "  }\n" +
        "}\n" +
        "const funil_eventos = Object.entries(eventos).map(([evento, v]) => ({ evento, atual: v.atual, anterior: v.anterior, delta_pct: round1(pct(v.atual, v.anterior)), usuarios: v.usuarios_atual }));\n" +
        "const ev = n => eventos[n] ? eventos[n].atual : 0;\n" +
        "const taxas_funil = {};\n" +
        "if (kpis.sessoes > 0 && ev('add_to_cart') > 0) taxas_funil.sessao_para_carrinho_pct = round1((ev('add_to_cart') / kpis.sessoes) * 100);\n" +
        "if (ev('add_to_cart') > 0 && ev('begin_checkout') > 0) taxas_funil.carrinho_para_checkout_pct = round1((ev('begin_checkout') / ev('add_to_cart')) * 100);\n" +
        "if (ev('begin_checkout') > 0 && ev('purchase') > 0) taxas_funil.checkout_para_compra_pct = round1((ev('purchase') / ev('begin_checkout')) * 100);\n" +
        "if (kpis.sessoes > 0 && ev('generate_lead') > 0) taxas_funil.sessao_para_lead_pct = round1((ev('generate_lead') / kpis.sessoes) * 100);\n" +
        "if (ev('form_start') > 0 && ev('form_submit') > 0) taxas_funil.form_conclusao_pct = round1((ev('form_submit') / ev('form_start')) * 100);\n" +
        "\n" +
        "// ---- Canais & devices ----\n" +
        "let canais = [];\n" +
        "const porDevice = {};\n" +
        "if (ga4Can && Array.isArray(ga4Can.rows)) {\n" +
        "  canais = ga4Can.rows.slice(0, 12).map(row => {\n" +
        "    const dims = (row.dimensionValues || []).map(x => x.value);\n" +
        "    const m = (row.metricValues || []).map(x => num(x.value));\n" +
        "    const item = { canal: dims[0], device: dims[1], sessoes: m[0], conversoes: m[1], receita: m[2], taxa_pct: m[0] > 0 ? round1((m[1] / m[0]) * 100) : 0 };\n" +
        "    porDevice[item.device] = porDevice[item.device] || { sessoes: 0, conversoes: 0 };\n" +
        "    porDevice[item.device].sessoes += m[0]; porDevice[item.device].conversoes += m[1];\n" +
        "    return item;\n" +
        "  });\n" +
        "}\n" +
        "const devices = Object.entries(porDevice).map(([device, v]) => ({ device, sessoes: v.sessoes, conversoes: v.conversoes, taxa_pct: v.sessoes > 0 ? round1((v.conversoes / v.sessoes) * 100) : 0 }));\n" +
        "\n" +
        "// ---- Clarity (últimos 3 dias) ----\n" +
        "let clarity_metricas = [];\n" +
        "let clarityok = false;\n" +
        "const clarityArr = Array.isArray(clarity) ? clarity : (clarity && Array.isArray(clarity.data) ? clarity.data : null);\n" +
        "if (clarityArr) {\n" +
        "  clarityok = true;\n" +
        "  clarity_metricas = clarityArr.filter(m => m && m.metricName).map(m => ({ metrica: m.metricName, dados: (m.information || []).slice(0, 3) }));\n" +
        "}\n" +
        "\n" +
        "// ---- Backlog Jira ----\n" +
        "let backlog_jira = [];\n" +
        "let jiraok = false;\n" +
        "if (jira && Array.isArray(jira.issues)) {\n" +
        "  jiraok = true;\n" +
        "  backlog_jira = jira.issues.map(i => ({ key: i.key, resumo: i.fields && i.fields.summary, status: i.fields && i.fields.status && i.fields.status.name }));\n" +
        "}\n" +
        "\n" +
        "// ---- Proteção de receita: anomalias ----\n" +
        "const anomalias = [];\n" +
        "function anexa(severidade, metrica, variacao, mensagem) { anomalias.push({ severidade, metrica, variacao_pct: round1(variacao), mensagem }); }\n" +
        "if (ga4ok && kpis.sessoes_ant > 100) {\n" +
        "  if (kpis.sessoes_delta !== null && kpis.sessoes_delta <= -30) anexa('alta', 'sessoes', kpis.sessoes_delta, 'Queda de ' + Math.abs(kpis.sessoes_delta) + '% nas sessões vs período anterior (' + kpis.sessoes_ant + ' -> ' + kpis.sessoes + ').');\n" +
        "  if (kpis.conversoes_delta !== null && kpis.conversoes_delta <= -25) anexa('critica', 'conversoes', kpis.conversoes_delta, 'Queda de ' + Math.abs(kpis.conversoes_delta) + '% nas conversões vs período anterior (' + kpis.conversoes_ant + ' -> ' + kpis.conversoes + ').');\n" +
        "  if (kpis.receita_ant > 0 && kpis.receita_delta !== null && kpis.receita_delta <= -25) anexa('critica', 'receita', kpis.receita_delta, 'Queda de ' + Math.abs(kpis.receita_delta) + '% na receita vs período anterior.');\n" +
        "  if (kpis.taxa_delta !== null && kpis.taxa_delta <= -20 && kpis.sessoes_delta !== null && kpis.sessoes_delta > -15) anexa('alta', 'taxa_conversao', kpis.taxa_delta, 'Taxa de conversão caiu ' + Math.abs(kpis.taxa_delta) + '% com tráfego estável — investigar UX/checkout.');\n" +
        "  const compra = eventos['purchase'];\n" +
        "  if (compra && compra.anterior > 20) { const dv = pct(compra.atual, compra.anterior); if (dv !== null && dv <= -40 && kpis.sessoes_delta !== null && kpis.sessoes_delta > -15) anexa('critica', 'purchase', dv, 'Eventos de compra caíram ' + Math.abs(Math.round(dv)) + '% com tráfego estável — possível checkout quebrado.'); }\n" +
        "}\n" +
        "\n" +
        "// ---- E-mail de alerta (pronto para envio) ----\n" +
        "const sevRank = { critica: 3, alta: 2, media: 1 };\n" +
        "anomalias.sort((a, b) => (sevRank[b.severidade] || 0) - (sevRank[a.severidade] || 0));\n" +
        "const pior = anomalias[0] || null;\n" +
        "const alerta_row = pior ? {\n" +
        "  cliente: P.cliente, tipo: 'protecao_receita', severidade: pior.severidade, metrica: anomalias.map(a => a.metrica).join(','),\n" +
        "  variacao_pct: pior.variacao_pct || 0, mensagem: anomalias.map(a => a.mensagem).join(' | '), ciclo_id: P.ciclo_id, criado_em: new Date().toISOString()\n" +
        "} : null;\n" +
        "const alerta_email_html = pior ? (\n" +
        "  '<div style=\"font-family:Arial,sans-serif;max-width:640px\">' +\n" +
        "  '<h2 style=\"color:#ef4444\">🚨 CRO Next — Proteção de receita: ' + P.cliente + '</h2>' +\n" +
        "  '<p>A ingestão detectou anomalias antes do cliente perceber. Período analisado: <b>' + P.periodo_inicio + ' a ' + P.periodo_fim + '</b> vs anterior.</p>' +\n" +
        "  '<ul>' + anomalias.map(a => '<li><b>[' + a.severidade.toUpperCase() + ']</b> ' + a.mensagem + '</li>').join('') + '</ul>' +\n" +
        "  '<p style=\"color:#6b7280;font-size:12px\">Verifique tagueamento, checkout e mudanças recentes no site antes de acionar o cliente. Registro gravado em cro_alertas.</p></div>'\n" +
        ") : '';\n" +
        "\n" +
        "return [{ json: {\n" +
        "  ciclo_id: P.ciclo_id, cliente: P.cliente, modo: P.modo,\n" +
        "  periodo: P.periodo_inicio + ' a ' + P.periodo_fim,\n" +
        "  registro: { site_url: P.site_url, contexto_negocio: P.contexto_negocio, vertical: P.vertical, tier: P.tier, jira_base_url: P.jira_base_url, jira_project_key: P.jira_project_key, jira_issue_type: P.jira_issue_type, email_analista: P.email_analista, valor_por_conversao: P.valor_por_conversao, moeda: P.moeda },\n" +
        "  kpis, funil_eventos, taxas_funil, canais, devices, clarity_metricas, backlog_jira, anomalias,\n" +
        "  tem_anomalia: anomalias.length > 0, alerta_row, alerta_email_html,\n" +
        "  coleta: { ga4: ga4ok, clarity: clarityok, jira: jiraok }\n" +
        "} }];"
    }
  },
  output: [{ ciclo_id: 'exemplo-loja-20260707', cliente: 'exemplo-loja', modo: 'completo', periodo: '2026-06-09 a 2026-07-06', registro: { email_analista: 'analista@cadastra.com', jira_base_url: 'https://cadastra.atlassian.net', jira_project_key: 'CRO', jira_issue_type: 'Task', valor_por_conversao: 280, moeda: 'BRL', contexto_negocio: 'E-commerce' }, kpis: { sessoes: 48000, conversoes: 860, receita: 240000, taxa_conversao: 1.8, sessoes_delta: -2.1, conversoes_delta: -5.4, receita_delta: -3.2, taxa_delta: -3.4 }, funil_eventos: [], taxas_funil: {}, canais: [], devices: [], clarity_metricas: [], backlog_jira: [], anomalias: [], tem_anomalia: false, alerta_row: null, alerta_email_html: '', coleta: { ga4: true, clarity: true, jira: true } }]
});

const temAnomalia = ifElse({
  version: 2.2,
  config: {
    name: 'Tem Anomalia?',
    position: [1760, 400],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.tem_anomalia }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const registrarAlerta = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Registrar Alerta',
    position: [2000, 240],
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'name', value: 'cro_alertas' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          cliente: expr('{{ $json.alerta_row.cliente }}'),
          tipo: expr('{{ $json.alerta_row.tipo }}'),
          severidade: expr('{{ $json.alerta_row.severidade }}'),
          metrica: expr('{{ $json.alerta_row.metrica }}'),
          variacao_pct: expr('{{ $json.alerta_row.variacao_pct }}'),
          mensagem: expr('{{ $json.alerta_row.mensagem }}'),
          ciclo_id: expr('{{ $json.alerta_row.ciclo_id }}'),
          criado_em: expr('{{ $json.alerta_row.criado_em }}')
        },
        matchingColumns: [],
        schema: [
          { id: 'cliente', displayName: 'cliente', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'tipo', displayName: 'tipo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'severidade', displayName: 'severidade', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'metrica', displayName: 'metrica', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'variacao_pct', displayName: 'variacao_pct', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: false },
          { id: 'mensagem', displayName: 'mensagem', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'ciclo_id', displayName: 'ciclo_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'criado_em', displayName: 'criado_em', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, cliente: 'exemplo-loja', severidade: 'critica' }]
});

const emailAlerta = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email – Alerta de Receita',
    position: [2240, 240],
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr("{{ $('Agente de Ingestão (Normalizar)').first().json.registro.email_analista }}"),
      subject: expr("🚨 CRO Next | {{ $('Agente de Ingestão (Normalizar)').first().json.cliente }} — anomalia detectada ({{ $('Agente de Ingestão (Normalizar)').first().json.anomalias.length }})"),
      emailType: 'html',
      message: expr("{{ $('Agente de Ingestão (Normalizar)').first().json.alerta_email_html }}"),
      options: { appendAttribution: false, senderName: 'CRO Next — Sentinela' }
    },
    credentials: GMAIL_CRED
  },
  output: [{ id: 'msg1' }]
});

const modoCompletoIf = ifElse({
  version: 2.2,
  config: {
    name: 'Modo Completo?',
    position: [2480, 400],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $('Preparar Cliente').first().json.modo }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'completo' }],
        combinator: 'and'
      }
    }
  }
});

const lmHeuristico = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: { name: 'LLM – Heurístico', position: [2720, 720], parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0.2, maxRetries: 2 } }, credentials: OPENROUTER_CRED }
});

const parserHeuristico = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Parser – Achados',
    position: [2880, 720],
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "achados": [ { "id": "ACH-01", "heuristica": "Visibilidade do status do sistema", "framework": "Nielsen", "pagina_ou_fluxo": "checkout", "evidencia_quantitativa": "begin_checkout -> purchase em 38% vs benchmark 55-65%; RageClickCount em 4,2% das sessões", "severidade": 4, "descricao": "Descrição objetiva do problema de UX detectado", "impacto_provavel": "abandono no checkout" } ] }'
    }
  }
});

const agenteHeuristico = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Agente Heurístico UX',
    position: [2720, 400],
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr("DOSSIÊ E DADOS DO CICLO (JSON):\n{{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json) }}"),
      options: {
        systemMessage: 'Você é o AGENTE HEURÍSTICO/UX da fábrica CRO Next (Cadastra). Sua função: cruzar frameworks de usabilidade com o dado quantitativo real do cliente.\n\nFRAMEWORKS DE REFERÊNCIA:\n- 10 heurísticas de Nielsen (NN/g)\n- Padrões Baymard Institute para e-commerce (checkout, PDP, carrinho, formulários)\n- WCAG 2.2 níveis A/AA (acessibilidade que afeta conversão)\n\nREGRAS INEGOCIÁVEIS:\n1. TODO achado precisa citar evidência quantitativa REAL presente nos dados fornecidos (taxas de funil, deltas, métricas Clarity como rage clicks/dead clicks/quick backs, gap mobile vs desktop). NUNCA invente números.\n2. Se um dado não existe na entrada (coleta.ga4=false, clarity vazio), diga menos achados — não especule.\n3. Priorize achados que expliquem os gargalos numéricos observados. Conecte comportamento (Clarity) com resultado (GA4).\n4. Máximo 8 achados, mínimo 3 (se os dados permitirem). severidade: 1 (cosmético) a 5 (bloqueia conversão).\n5. Escreva em pt-BR, tom consultivo e direto. framework deve ser exatamente: Nielsen, Baymard ou WCAG.\n\nResponda SOMENTE no formato JSON do schema.',
        maxIterations: 5,
        enableStreaming: false
      },
      subnodes: { model: lmHeuristico, outputParser: parserHeuristico }
    }
  },
  output: [{ output: { achados: [{ id: 'ACH-01', heuristica: 'Prevenção de erros', framework: 'Baymard', pagina_ou_fluxo: 'checkout', evidencia_quantitativa: 'checkout->compra 38%', severidade: 4, descricao: 'Checkout longo', impacto_provavel: 'abandono' }] } }]
});

const lmDiagnostico = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: { name: 'LLM – Diagnóstico', position: [3040, 720], parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0.2, maxRetries: 2 } }, credentials: OPENROUTER_CRED }
});

const parserDiagnostico = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Parser – Gargalos',
    position: [3200, 720],
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "gargalos": [ { "etapa": "carrinho -> checkout", "descricao": "Perda concentrada na transição para o checkout", "taxa_atual_pct": 42.0, "benchmark_pct": "55-65", "evidencia": "5200 add_to_cart vs 2180 begin_checkout no período; rage clicks 4,2%", "uplift_estimado_pct": { "min": 5, "max": 12 }, "oportunidade_reais_mes": { "min": 8500, "max": 21000 }, "premissas": "RPS de R$ 5,00 x 48.000 sessões; uplift aplicado apenas sobre sessões que chegam ao carrinho; faixa conservadora", "confianca": "media" } ], "resumo_diagnostico": "Síntese de 2-3 frases do estado do funil" }'
    }
  }
});

const agenteDiagnostico = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Agente Diagnóstico de Funil',
    position: [3040, 400],
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr("DADOS DO CICLO (JSON):\n{{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json) }}\n\nACHADOS DO AGENTE HEURÍSTICO:\n{{ JSON.stringify($('Agente Heurístico UX').first().json.output) }}"),
      options: {
        systemMessage: 'Você é o AGENTE DE DIAGNÓSTICO DE FUNIL da fábrica CRO Next (Cadastra). Sua função: localizar gargalos, estimar uplift e traduzir em oportunidade financeira mensal (R$).\n\nMETODOLOGIA OBRIGATÓRIA (transparente e auditável):\n1. Valor por conversão: use receita/conversões do GA4 quando houver receita (> 0); senão use registro.valor_por_conversao.\n2. Oportunidade R$/mês = sessões afetadas pelo gargalo × ganho incremental de taxa (em pontos) × valor por conversão. Normalize o período de 28 dias para 30 dias (× 30/28).\n3. SEMPRE em faixa conservadora: min = cenário pessimista, max = cenário realista (nunca otimista). Uplift raramente passa de 15% por gargalo.\n4. Campo premissas: explicite TODA a aritmética (valores usados, contas feitas). O cliente audita isso.\n5. Benchmarks de referência (cite como faixa): carrinho->checkout 55-65%; checkout->compra 40-55%; abandono médio de checkout ~70% (Baymard); conclusão de formulário 50-70%.\n6. 3 a 5 gargalos, ordenados por oportunidade_reais_mes.max decrescente. confianca: alta | media | baixa conforme qualidade do dado.\n7. Se coleta.ga4=false, retorne gargalos=[] e explique no resumo_diagnostico.\n\nEscreva em pt-BR. Responda SOMENTE no formato JSON do schema.',
        maxIterations: 5,
        enableStreaming: false
      },
      subnodes: { model: lmDiagnostico, outputParser: parserDiagnostico }
    }
  },
  output: [{ output: { gargalos: [{ etapa: 'carrinho -> checkout', descricao: 'Perda na transição', taxa_atual_pct: 42, benchmark_pct: '55-65', evidencia: 'dados', uplift_estimado_pct: { min: 5, max: 12 }, oportunidade_reais_mes: { min: 8500, max: 21000 }, premissas: 'contas', confianca: 'media' }], resumo_diagnostico: 'Funil com perda concentrada no checkout.' } }]
});

const lmIce = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: { name: 'LLM – Priorização', position: [3360, 720], parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0.3, maxRetries: 2 } }, credentials: OPENROUTER_CRED }
});

const parserIce = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Parser – Hipóteses',
    position: [3520, 720],
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "hipoteses": [ { "id": "HIP-01", "titulo": "Simplificar etapa de frete no checkout", "problema_evidenciado": "Dado + heurística que evidenciam o problema", "solucao_proposta": "O que mudar, onde e como", "ganho_estimado_reais": { "min": 8500, "max": 21000 }, "criterio_validacao": "Teste A/B com métrica primária begin_checkout->purchase; significância 95%; 4 semanas", "ice": { "impacto": 8, "confianca": 6, "facilidade": 7, "score": 7.0 }, "etapa_funil": "checkout", "esforco": "M", "gargalo_relacionado": "carrinho -> checkout" } ] }'
    }
  }
});

const agenteIce = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Agente Priorização ICE',
    position: [3360, 400],
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr("DADOS DO CICLO (JSON):\n{{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json) }}\n\nACHADOS HEURÍSTICOS:\n{{ JSON.stringify($('Agente Heurístico UX').first().json.output) }}\n\nDIAGNÓSTICO DE FUNIL:\n{{ JSON.stringify($('Agente Diagnóstico de Funil').first().json.output) }}"),
      options: {
        systemMessage: 'Você é o AGENTE DE PRIORIZAÇÃO (ICE) da fábrica CRO Next (Cadastra). Sua função: transformar diagnóstico em HIPÓTESES QUALIFICADAS — a unidade de venda do serviço.\n\nUMA HIPÓTESE QUALIFICADA TEM OBRIGATORIAMENTE:\n1. problema_evidenciado: dado + heurística (cite números reais da entrada);\n2. solucao_proposta: específica e implementável (o quê, onde, como);\n3. ganho_estimado_reais: faixa mensal conservadora, coerente com o gargalo relacionado (nunca maior que a oportunidade do gargalo);\n4. criterio_validacao: como medir (teste A/B, métrica primária, janela, critério de sucesso).\n\nSCORE ICE: impacto, confianca e facilidade de 1 a 10; score = média aritmética com 1 casa decimal. Ordene por score decrescente.\n\nREGRAS:\n- Gere de 4 a 8 hipóteses (tier essential: 4; growth: 8; enterprise: 8). O tier está em registro.tier.\n- NÃO duplique itens do backlog_jira existente — se um tema já existe lá, proponha ângulo complementar ou pule.\n- IDs sequenciais: HIP-01, HIP-02...\n- esforco: P (dias), M (1-2 sprints), G (>2 sprints).\n- Quick wins primeiro em caso de empate no score.\n\nEscreva em pt-BR. Responda SOMENTE no formato JSON do schema.',
        maxIterations: 5,
        enableStreaming: false
      },
      subnodes: { model: lmIce, outputParser: parserIce }
    }
  },
  output: [{ output: { hipoteses: [{ id: 'HIP-01', titulo: 'Simplificar frete', problema_evidenciado: 'dado', solucao_proposta: 'mudança', ganho_estimado_reais: { min: 8500, max: 21000 }, criterio_validacao: 'A/B 4 semanas', ice: { impacto: 8, confianca: 6, facilidade: 7, score: 7.0 }, etapa_funil: 'checkout', esforco: 'M', gargalo_relacionado: 'carrinho -> checkout' }] } }]
});

const lmSintese = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: { name: 'LLM – Síntese', position: [3680, 720], parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0.5, maxRetries: 2 } }, credentials: OPENROUTER_CRED }
});

const agenteSintese = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Agente de Síntese',
    position: [3680, 400],
    parameters: {
      promptType: 'define',
      text: expr("DADOS DO CICLO (JSON):\n{{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json.kpis) }}\n\nANOMALIAS: {{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json.anomalias) }}\n\nCONTEXTO DO CLIENTE: {{ $('Agente de Ingestão (Normalizar)').first().json.registro.contexto_negocio }}\n\nDIAGNÓSTICO: {{ JSON.stringify($('Agente Diagnóstico de Funil').first().json.output) }}\n\nHIPÓTESES PRIORIZADAS: {{ JSON.stringify($('Agente Priorização ICE').first().json.output) }}"),
      options: {
        systemMessage: 'Você é o AGENTE DE SÍNTESE da fábrica CRO Next (Cadastra). Sua função: produzir o dashboard narrativo + material de reunião que o consultor leva ao cliente após aprovar no gate.\n\nFORMATO DA SAÍDA: markdown puro (sem cercas de código), em pt-BR, com EXATAMENTE estas seções:\n\n## Resumo executivo\n3 bullets: estado do funil, maior risco, maior oportunidade (com R$).\n\n## Números do ciclo\nTabela compacta: sessões, conversões, taxa, receita — com variação vs período anterior.\n\n## Top apostas\nAs 3 melhores hipóteses: 1 parágrafo cada, com ganho estimado em R$ e por que agora.\n\n## Pauta de reunião (15 min)\n4-5 itens de pauta acionáveis, com decisão esperada em cada item.\n\n## Riscos e observações\n2-3 bullets: anomalias, limitações do dado, dependências.\n\nREGRAS: linguagem de negócio (o leitor é o cliente, não um analista de dados); todo valor em R$ formatado (R$ 12.400); nunca jargão técnico sem tradução; cite sempre faixas conservadoras; não invente números fora da entrada.',
        maxIterations: 3,
        enableStreaming: false
      },
      subnodes: { model: lmSintese }
    }
  },
  output: [{ output: '## Resumo executivo\n- Funil estável com oportunidade de R$ 8.500-21.000/mês no checkout.' }]
});

const lmAutocritica = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: { name: 'LLM – Autocrítica', position: [4000, 720], parameters: { model: 'anthropic/claude-sonnet-4.6', options: { temperature: 0.1, maxRetries: 2 } }, credentials: OPENROUTER_CRED }
});

const parserAutocritica = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Parser – Autocrítica',
    position: [4160, 720],
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "score": 7.5, "recomendacao": "aprovar_para_gate", "problemas": [ "HIP-03 não tem critério de validação mensurável" ], "pontos_fortes": [ "Estimativas com premissas explícitas" ] }'
    }
  }
});

const agenteAutocritica = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Agente Autocrítica (Revisor)',
    position: [4000, 400],
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr("PACOTE COMPLETO DO CICLO PARA REVISÃO:\n\nKPIs: {{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json.kpis) }}\nTAXAS DE FUNIL: {{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json.taxas_funil) }}\nSTATUS DA COLETA: {{ JSON.stringify($('Agente de Ingestão (Normalizar)').first().json.coleta) }}\n\nACHADOS: {{ JSON.stringify($('Agente Heurístico UX').first().json.output) }}\n\nDIAGNÓSTICO: {{ JSON.stringify($('Agente Diagnóstico de Funil').first().json.output) }}\n\nHIPÓTESES: {{ JSON.stringify($('Agente Priorização ICE').first().json.output) }}\n\nSÍNTESE:\n{{ $('Agente de Síntese').first().json.output }}"),
      options: {
        systemMessage: 'Você é o AGENTE DE AUTOCRÍTICA da fábrica CRO Next (Cadastra) — o revisor cético que roda ANTES do gate humano. Sua função: impedir que qualidade silenciosamente ruim chegue ao analista.\n\nCHECKLIST DE REVISÃO (avalie cada item):\n1. Evidência: todo achado e gargalo cita número presente nos dados de entrada? (Compare! Números inventados = problema grave.)\n2. Aritmética: as oportunidades em R$ são consistentes com as premissas declaradas? Refaça as contas por amostragem.\n3. Faixas conservadoras: alguma estimativa parece inflada (uplift > 15%, ganho > oportunidade do gargalo)?\n4. Hipóteses: todas têm problema evidenciado + solução + ganho em faixa + critério de validação mensurável?\n5. Anti-comoditização: o conteúdo usa o contexto específico do cliente ou parece genérico/copiável de qualquer relatório?\n6. Coerência: a síntese reflete fielmente diagnóstico e hipóteses?\n\nSCORE de 0 a 10 (1 casa decimal): 9-10 impecável; 7-8.9 bom, segue ao gate; 5-6.9 fraquezas relevantes; <5 comprometido.\nrecomendacao: "aprovar_para_gate" se score >= 7; senão "revisar".\nproblemas: liste TODOS os problemas concretos encontrados (cite o id do item). Vazio somente se realmente não houver.\n\nSeja duro. Escreva em pt-BR. Responda SOMENTE no formato JSON do schema.',
        maxIterations: 3,
        enableStreaming: false
      },
      subnodes: { model: lmAutocritica, outputParser: parserAutocritica }
    }
  },
  output: [{ output: { score: 7.5, recomendacao: 'aprovar_para_gate', problemas: [], pontos_fortes: ['Premissas explícitas'] } }]
});

const montarPacote = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Montar Pacote do Ciclo',
    position: [4320, 400],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "function saida(nome) { try { const j = $(nome).first().json; return j && j.output !== undefined ? j.output : null; } catch (e) { return null; } }\n" +
        "const base = $('Agente de Ingestão (Normalizar)').first().json;\n" +
        "const achadosOut = saida('Agente Heurístico UX') || {};\n" +
        "const diagOut = saida('Agente Diagnóstico de Funil') || {};\n" +
        "const iceOut = saida('Agente Priorização ICE') || {};\n" +
        "const sinteseOut = saida('Agente de Síntese');\n" +
        "const autoOut = saida('Agente Autocrítica (Revisor)') || {};\n" +
        "\n" +
        "const achados = achadosOut.achados || [];\n" +
        "const gargalos = diagOut.gargalos || [];\n" +
        "const hipoteses = iceOut.hipoteses || [];\n" +
        "const sintese_md = typeof sinteseOut === 'string' ? sinteseOut : (sinteseOut ? JSON.stringify(sinteseOut) : '');\n" +
        "const autocritica = { score: Number(autoOut.score) || 0, recomendacao: autoOut.recomendacao || 'revisar', problemas: autoOut.problemas || [], pontos_fortes: autoOut.pontos_fortes || [] };\n" +
        "\n" +
        "const pipelineOk = achados.length > 0 || gargalos.length > 0 || hipoteses.length > 0;\n" +
        "let status = 'erro_pipeline';\n" +
        "if (pipelineOk) status = autocritica.score >= 7 ? 'aguardando_gate' : 'requer_revisao';\n" +
        "\n" +
        "const soma = (arr, sel) => arr.reduce((acc, g) => acc + (Number(sel(g)) || 0), 0);\n" +
        "const oportunidade_total_min = Math.round(soma(gargalos, g => (g.oportunidade_reais_mes || {}).min));\n" +
        "const oportunidade_total_max = Math.round(soma(gargalos, g => (g.oportunidade_reais_mes || {}).max));\n" +
        "\n" +
        "const dados = {\n" +
        "  ciclo_id: base.ciclo_id, cliente: base.cliente, periodo: base.periodo, registro: base.registro,\n" +
        "  kpis: base.kpis, taxas_funil: base.taxas_funil, funil_eventos: base.funil_eventos, canais: base.canais, devices: base.devices,\n" +
        "  clarity_metricas: base.clarity_metricas, backlog_jira: base.backlog_jira, anomalias: base.anomalias, coleta: base.coleta,\n" +
        "  achados, gargalos, hipoteses, autocritica, sintese_md,\n" +
        "  resumo_diagnostico: diagOut.resumo_diagnostico || '',\n" +
        "  oportunidade_total_min, oportunidade_total_max\n" +
        "};\n" +
        "\n" +
        "const brl = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');\n" +
        "const gateUrl = 'https://n8n-prod.cadastra.com/webhook/cro-next-gate';\n" +
        "const cor = status === 'aguardando_gate' ? '#10b981' : (status === 'requer_revisao' ? '#f59e0b' : '#ef4444');\n" +
        "const rotulo = status === 'aguardando_gate' ? 'AGUARDANDO SEU GATE' : (status === 'requer_revisao' ? 'REQUER REVISÃO (autocrítica < 7)' : 'ERRO NO PIPELINE');\n" +
        "const email_html =\n" +
        "  '<div style=\"font-family:Arial,sans-serif;max-width:660px\">' +\n" +
        "  '<h2>🏭 CRO Next — Ciclo pronto: ' + base.cliente + '</h2>' +\n" +
        "  '<p><span style=\"background:' + cor + ';color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold\">' + rotulo + '</span></p>' +\n" +
        "  '<table style=\"border-collapse:collapse;font-size:13px\">' +\n" +
        "  '<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">Ciclo</td><td><b>' + base.ciclo_id + '</b></td></tr>' +\n" +
        "  '<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">Período</td><td>' + base.periodo + '</td></tr>' +\n" +
        "  '<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">Autocrítica</td><td><b>' + autocritica.score.toFixed(1) + '/10</b></td></tr>' +\n" +
        "  '<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">Oportunidade mapeada</td><td><b>' + brl(oportunidade_total_min) + ' – ' + brl(oportunidade_total_max) + '/mês</b></td></tr>' +\n" +
        "  '<tr><td style=\"padding:4px 12px 4px 0;color:#6b7280\">Hipóteses qualificadas</td><td>' + hipoteses.length + '</td></tr>' +\n" +
        "  '</table>' +\n" +
        "  (autocritica.problemas.length ? '<p style=\"font-size:13px\"><b>Problemas apontados pelo revisor:</b></p><ul style=\"font-size:13px\">' + autocritica.problemas.map(p => '<li>' + p + '</li>').join('') + '</ul>' : '') +\n" +
        "  '<p style=\"margin-top:16px\"><' + 'a hr' + 'ef=\"' + gateUrl + '\" style=\"background:#FF5C28;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold\">Abrir Gate Humano →</a></p>' +\n" +
        "  '<p style=\"color:#6b7280;font-size:12px\">Você aprova, edita e decide a aposta. Nada chega ao cliente sem o seu gate.</p></div>';\n" +
        "\n" +
        "return [{ json: {\n" +
        "  ciclo_id: base.ciclo_id, cliente: base.cliente, status,\n" +
        "  score_autocritica: autocritica.score,\n" +
        "  sintese_md,\n" +
        "  dados_json: JSON.stringify(dados),\n" +
        "  criado_em: new Date().toISOString(),\n" +
        "  email_destino: (base.registro || {}).email_analista || 'tsoares@cadastra.com',\n" +
        "  email_assunto: (status === 'aguardando_gate' ? '🏭 CRO Next | ' : '⚠️ CRO Next | ') + base.cliente + ' — ciclo ' + base.ciclo_id + ' (' + rotulo.toLowerCase() + ')',\n" +
        "  email_html\n" +
        "} }];"
    }
  },
  output: [{ ciclo_id: 'exemplo-loja-20260707', cliente: 'exemplo-loja', status: 'aguardando_gate', score_autocritica: 7.5, sintese_md: '## Resumo', dados_json: '{}', criado_em: '2026-07-07T10:00:00Z', email_destino: 'analista@cadastra.com', email_assunto: 'CRO Next | ciclo pronto', email_html: '<div>...</div>' }]
});

const salvarCiclo = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Salvar Ciclo',
    position: [4560, 400],
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'name', value: 'cro_ciclos' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          ciclo_id: expr('{{ $json.ciclo_id }}'),
          cliente: expr('{{ $json.cliente }}'),
          status: expr('{{ $json.status }}'),
          score_autocritica: expr('{{ $json.score_autocritica }}'),
          sintese_md: expr('{{ $json.sintese_md }}'),
          dados_json: expr('{{ $json.dados_json }}'),
          notas_gate: '',
          decidido_por: '',
          criado_em: expr('{{ $json.criado_em }}'),
          decidido_em: ''
        },
        matchingColumns: [],
        schema: [
          { id: 'ciclo_id', displayName: 'ciclo_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'cliente', displayName: 'cliente', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'status', displayName: 'status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'score_autocritica', displayName: 'score_autocritica', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: false },
          { id: 'sintese_md', displayName: 'sintese_md', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'dados_json', displayName: 'dados_json', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'notas_gate', displayName: 'notas_gate', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'decidido_por', displayName: 'decidido_por', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'criado_em', displayName: 'criado_em', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'decidido_em', displayName: 'decidido_em', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, ciclo_id: 'exemplo-loja-20260707', status: 'aguardando_gate' }]
});

const emailGate = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email – Convocar Gate',
    position: [4800, 400],
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr("{{ $('Montar Pacote do Ciclo').first().json.email_destino }}"),
      subject: expr("{{ $('Montar Pacote do Ciclo').first().json.email_assunto }}"),
      emailType: 'html',
      message: expr("{{ $('Montar Pacote do Ciclo').first().json.email_html }}"),
      options: { appendAttribution: false, senderName: 'CRO Next — Fábrica' }
    },
    credentials: GMAIL_CRED
  },
  output: [{ id: 'msg2' }]
});

const stickyFontes = sticky(
  '## 🏭 CRO Next — Fábrica Multi-Agente\n**Pilar 01 do planejamento estratégico.** Multi-tenant: 1 workflow, N clientes — onboarding = 1 linha na Data Table `cro_clientes`, nunca um workflow novo.\n\n**Cadências:** quinzenal (fábrica completa) · semanal (sentinela de proteção de receita).',
  [trigQuinzenal, trigSentinela, trigManual, modoCompleto, modoSentinela, modoManual, carregarClientes, montarFila, loopClientes],
  { color: 7 }
);

const stickyIngestao = sticky(
  '## 📥 FONTES + Agente de Ingestão\nGA4 (funil, canais, devices) · Clarity (comportamento) · Jira (backlog) · Dossiê (Data Table).\n\nNormalização determinística — sem LLM na coleta. Detecção de anomalias roda em TODO ciclo (always-on).',
  [prepararCliente, ga4Serie, ga4Funil, ga4Canais, clarityFetch, jiraBacklog, normalizar],
  { color: 4 }
);

const stickySentinela = sticky(
  '## 🚨 Proteção de receita\nAnomalia detectada → alerta imediato ao analista (antes do cliente perceber) + registro em `cro_alertas`.',
  [temAnomalia, registrarAlerta, emailAlerta],
  { color: 3 }
);

const stickyAgentes = sticky(
  '## 🤖 Agentes de análise (SMA)\nHeurístico/UX (Nielsen · Baymard · WCAG) → Diagnóstico de Funil (gargalos + uplift + R$) → Priorização ICE (hipóteses qualificadas) → Síntese (dashboard narrativo + pauta) → **Autocrítica (LLM revisor, score ≥ 7)**.',
  [agenteHeuristico, agenteDiagnostico, agenteIce, agenteSintese, agenteAutocritica],
  { color: 5 }
);

const stickyGate = sticky(
  '## 🚪 Pré-gate\nCiclo salvo em `cro_ciclos` com status `aguardando_gate` (ou `requer_revisao` se autocrítica < 7). Analista é convocado por e-mail.\n\n**Nada chega ao cliente sem aprovação humana** — entregas acontecem no workflow "Gate Humano & Entregas".',
  [montarPacote, salvarCiclo, emailGate],
  { color: 6 }
);

export default workflow('cro-next-fabrica', 'CRO Next — Fábrica Multi-Agente (SMA)')
  .add(trigQuinzenal)
  .to(modoCompleto)
  .to(carregarClientes)
  .add(trigSentinela)
  .to(modoSentinela)
  .to(carregarClientes)
  .add(trigManual)
  .to(modoManual)
  .to(carregarClientes)
  .add(carregarClientes)
  .to(montarFila)
  .to(loopClientes
    .onDone(rodadaConcluida)
    .onEachBatch(
      prepararCliente
        .to(ga4Serie)
        .to(ga4Funil)
        .to(ga4Canais)
        .to(clarityFetch)
        .to(jiraBacklog)
        .to(normalizar)
        .to(temAnomalia
          .onTrue(registrarAlerta.to(emailAlerta).to(modoCompletoIf))
          .onFalse(modoCompletoIf
            .onTrue(agenteHeuristico
              .to(agenteDiagnostico)
              .to(agenteIce)
              .to(agenteSintese)
              .to(agenteAutocritica)
              .to(montarPacote)
              .to(salvarCiclo)
              .to(emailGate)
              .to(nextBatch(loopClientes)))
            .onFalse(nextBatch(loopClientes))))
    )
  )
  .add(stickyFontes)
  .add(stickyIngestao)
  .add(stickySentinela)
  .add(stickyAgentes)
  .add(stickyGate);
