/**
 * Gera o workflow n8n "Estácio – Reddit Sentiment & Reputation Monitor"
 * como JSON importável (n8n > Import from File).
 *
 * Por que um builder? O endpoint MCP do n8n tem um limite de tamanho de
 * request que bloqueia a criação programática deste workflow (19 nós).
 * Construir o JSON localmente e versioná-lo segue a convenção do repo
 * (ver seo-intelligence-orchestrator.json) e evita erros de escape manual.
 *
 * Uso:  node build-estacio-monitor.js
 */
const fs = require('fs');

// Credencial OpenRouter já existente na instância (reutilizada).
const OPENROUTER_CRED = { id: '4MTPOCzYj4oYOSjA', name: 'OpenRouter account 51' };
// Data Tables criadas previamente no projeto "SEO".
const DT_POSTS = { __rl: true, mode: 'id', value: 'T5KO4Iba8mrrlgWW', cachedResultName: 'reddit_estacio_posts' };
const DT_REPORTS = { __rl: true, mode: 'id', value: 'QecYI0Hccogj1FkZ', cachedResultName: 'reddit_estacio_reports' };
const EMAIL = 'tiagodaso@gmail.com';
const MODEL = 'anthropic/claude-sonnet-4.6';

const code = (lines) => ({ mode: 'runOnceForAllItems', jsCode: lines.join('\n') });

const nodes = [];
const push = (n) => { nodes.push(n); return n.name; };

// ---------- Triggers ----------
push({
  parameters: {},
  id: 'n_manual', name: 'Disparo Manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [240, 200]
});
push({
  parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
  id: 'n_cron', name: 'A Cada Hora', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.3, position: [240, 420]
});

// ---------- Histórico / Config / Busca ----------
push({
  parameters: {
    resource: 'row', operation: 'get', dataTableId: DT_POSTS,
    matchType: 'anyCondition',
    filters: { conditions: [{ keyName: 'reddit_id', condition: 'isNotEmpty' }] },
    returnAll: true
  },
  id: 'n_hist', name: 'Ler Historico', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [460, 300],
  alwaysOutputData: true
});
push({
  parameters: code([
    'const marca = "Estácio";',
    '// Edite/adicione os termos de monitoramento aqui:',
    'const queries = ["Estácio faculdade","Estácio universidade","Estácio EAD","Universidade Estácio de Sá","faculdade Estácio diploma","Estácio mensalidade"];',
    'return queries.map(q => ({ json: { query: q, marca } }));'
  ]),
  id: 'n_cfg', name: 'Configurar Monitor', type: 'n8n-nodes-base.code', typeVersion: 2, position: [680, 300]
});
// Coleta via RSS do Reddit (sem app OAuth — a API self-service foi fechada em nov/2025).
// Preencha user= e feed= (token das suas RSS preferences: reddit.com/prefs/feeds) e o User-Agent.
push({
  parameters: {
    method: 'GET',
    url: 'https://www.reddit.com/search.rss',
    sendQuery: true,
    queryParameters: { parameters: [
      { name: 'q', value: '={{ $json.query }}' },
      { name: 'sort', value: 'new' },
      { name: 'type', value: 'link' },
      { name: 'limit', value: '25' },
      { name: 'include_over_18', value: 'on' },
      { name: 'user', value: 'COLE_AQUI_O_PARAM_user' },
      { name: 'feed', value: 'COLE_AQUI_O_TOKEN_feed' }
    ] },
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'User-Agent', value: 'web:estacio-brand-monitor:v1.0 (by /u/SEU_USUARIO_REDDIT)' }
    ] },
    options: { response: { response: { neverError: true, responseFormat: 'text' } }, timeout: 30000 }
  },
  id: 'n_reddit', name: 'Buscar no Reddit (RSS)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.3, position: [900, 300]
});

// ---------- Normalização / dedup / lote ----------
push({
  parameters: code([
    'const decode = (s) => String(s || "")',
    '  .replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, "$1")',
    '  .replace(/&#0?39;|&#x27;|&apos;/gi, String.fromCharCode(39))',
    '  .replace(/&quot;/g, String.fromCharCode(34))',
    '  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")',
    '  .replace(/<[^>]+>/g, " ")',
    '  .replace(/\\s+/g, " ").trim();',
    'const vistos = new Set();',
    'const out = [];',
    'for (const it of $input.all()) {',
    '  const j = it.json || {};',
    '  const xml = String(j.data || j.body || j.text || (typeof j === "string" ? j : "") || "");',
    '  const tag = xml.indexOf("<entry") >= 0 ? "entry" : "item";',
    '  const partes = xml.split("<" + tag).slice(1);',
    '  for (const e of partes) {',
    '    const grab = (t) => { const m = e.match(new RegExp("<" + t + "[^>]*>([\\\\s\\\\S]*?)</" + t + ">")); return m ? m[1] : ""; };',
    '    const linkM = e.match(/<link[^>]*href="([^"]+)"/) || e.match(/<link>([^<]+)<\\/link>/);',
    '    let url = linkM ? String(linkM[1]).replace(/&amp;/g, "&") : "";',
    '    const idM = url.match(/comments\\/([a-z0-9]+)/i);',
    '    const reddit_id = idM ? ("t3_" + idM[1]) : (decode(grab("id")) || url);',
    '    if (!reddit_id || vistos.has(reddit_id)) continue;',
    '    vistos.add(reddit_id);',
    '    const titulo = decode(grab("title"));',
    '    const srM = url.match(/reddit\\.com\\/r\\/([^\\/]+)/i);',
    '    const subreddit = srM ? srM[1] : "";',
    '    const autor = decode(grab("name")).replace(/^\\/?u(?:ser)?\\//, "");',
    '    const pub = decode(grab("published")) || decode(grab("updated")) || decode(grab("pubDate"));',
    '    const tms = Date.parse(pub); const criado_utc = isFinite(tms) ? Math.floor(tms / 1000) : 0;',
    '    const texto = decode(grab("content") || grab("summary") || grab("description")).slice(0, 600);',
    '    if (!titulo && !texto) continue;',
    '    out.push({ json: { reddit_id, titulo, subreddit, autor, url, criado_utc, score: 0, num_comentarios: 0, texto } });',
    '  }',
    '}',
    'return out;'
  ]),
  id: 'n_norm', name: 'Normalizar Posts', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1120, 300]
});
push({
  parameters: code([
    'const conhecidos = new Set($("Ler Historico").all().map(r => r.json && r.json.reddit_id).filter(Boolean));',
    'const novos = [];',
    'const seen = new Set();',
    'for (const it of $input.all()) {',
    '  const p = it.json;',
    '  if (!p || !p.reddit_id) continue;',
    '  if (conhecidos.has(p.reddit_id) || seen.has(p.reddit_id)) continue;',
    '  seen.add(p.reddit_id);',
    '  novos.push({ json: p });',
    '}',
    'return novos;'
  ]),
  id: 'n_new', name: 'Filtrar Novos', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1340, 300]
});
push({
  parameters: code([
    'const posts = $input.all().map(i => i.json).slice(0, 60);',
    'const enxuto = posts.map(p => ({ reddit_id: p.reddit_id, titulo: p.titulo, subreddit: p.subreddit, score: p.score, comentarios: p.num_comentarios, texto: p.texto }));',
    'return [{ json: { run_id: "est_" + $execution.id, total: posts.length, posts_json: JSON.stringify(enxuto) } }];'
  ]),
  id: 'n_lote', name: 'Montar Lote', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1560, 300]
});

// ---------- Classificação (LLM) ----------
push({
  parameters: { model: MODEL, options: { maxTokens: 4096, temperature: 0.2 } },
  id: 'n_lm_cls', name: 'OpenRouter - Classificacao', type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', typeVersion: 1, position: [1560, 520],
  credentials: { openRouterApi: OPENROUTER_CRED }
});
push({
  parameters: {
    promptType: 'define',
    text: '=Você recebeu {{ $json.total }} novas publicações do Reddit possivelmente sobre a marca Estácio.\n\nPublicações (JSON):\n{{ $json.posts_json }}\n\nResponda APENAS um array JSON (um objeto por publicação): [{ "reddit_id": "", "relevante": true, "sentimento": "Positivo|Neutro|Negativo", "score_sentimento": 0.0, "criticidade": "Baixa|Média|Alta|Crítica", "categoria": "", "resumo": "", "motivo": "" }]',
    options: {
      systemMessage: 'Você é analista de Brand Intelligence da Estácio (Universidade/Faculdade Estácio de Sá). relevante=true só se o post fala da instituição de ensino (cursos, EAD, diploma, mensalidade, matrícula, polos, professores, atendimento, ENADE); false para o bairro do Rio, escola de samba, futebol ou homônimos. Categorias: Mensalidade/Financeiro, Diploma/Certificação, EAD/Plataforma, Atendimento/Suporte, Polo/Infraestrutura, Qualidade Acadêmica, Matrícula/Rematrícula, Trabalhista/Reclamação, Reputação/Marca, Elogio/Positivo, Outro. score_sentimento de -1 a 1. Criticidade: Crítica=risco grave/viralização/fraude/diploma não reconhecido/ação judicial; Alta=reclamação séria com engajamento; Média=insatisfação pontual; Baixa=neutro/dúvida/elogio. Responda SOMENTE o array JSON.',
      maxIterations: 2
    }
  },
  id: 'n_cls', name: 'Classificar Conversas', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [1780, 300]
});
push({
  parameters: code([
    'const first = $("Classificar Conversas").first();',
    'const raw = String((first && first.json && first.json.output) || "").trim();',
    'let cleaned = raw;',
    'const a = raw.indexOf("["); const b = raw.lastIndexOf("]"); if (a >= 0 && b > a) cleaned = raw.slice(a, b + 1);',
    'let arr = [];',
    'try { arr = JSON.parse(cleaned); if (!Array.isArray(arr)) arr = []; } catch (err) { arr = []; }',
    'const mapa = new Map();',
    'for (const c of arr) { if (c && c.reddit_id) mapa.set(String(c.reddit_id), c); }',
    'const ts = new Date().toISOString();',
    'const runId = "est_" + $execution.id;',
    'const novos = $("Filtrar Novos").all().map(i => i.json);',
    'return novos.map(p => {',
    '  const c = mapa.get(p.reddit_id) || {};',
    '  const sentimento = ["Positivo","Neutro","Negativo"].includes(c.sentimento) ? c.sentimento : "Neutro";',
    '  const crit = ["Baixa","Média","Alta","Crítica"].includes(c.criticidade) ? c.criticidade : "Baixa";',
    '  let scs = Number(c.score_sentimento);',
    '  if (!isFinite(scs)) scs = sentimento === "Positivo" ? 0.5 : sentimento === "Negativo" ? -0.5 : 0;',
    '  return { json: { reddit_id: p.reddit_id, titulo: p.titulo, subreddit: p.subreddit, autor: p.autor, url: p.url, criado_utc: p.criado_utc, score: p.score, num_comentarios: p.num_comentarios, run_id: runId, relevante: c.relevante === true, sentimento, score_sentimento: scs, criticidade: crit, categoria: c.categoria || "Outro", resumo: c.resumo || p.titulo, motivo: c.motivo || "", processado_em: ts } };',
    '});'
  ]),
  id: 'n_pcls', name: 'Processar Classificacao', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2040, 300]
});

// ---------- Persistência de posts (dedup log) ----------
push({
  parameters: {
    resource: 'row', operation: 'insert', dataTableId: DT_POSTS,
    columns: {
      mappingMode: 'defineBelow',
      value: {
        reddit_id: '={{ $json.reddit_id }}', titulo: '={{ $json.titulo }}', subreddit: '={{ $json.subreddit }}',
        autor: '={{ $json.autor }}', url: '={{ $json.url }}', criado_utc: '={{ $json.criado_utc }}',
        score: '={{ $json.score }}', num_comentarios: '={{ $json.num_comentarios }}', relevante: '={{ $json.relevante }}',
        sentimento: '={{ $json.sentimento }}', score_sentimento: '={{ $json.score_sentimento }}',
        criticidade: '={{ $json.criticidade }}', categoria: '={{ $json.categoria }}', resumo: '={{ $json.resumo }}',
        processado_em: '={{ $json.processado_em }}'
      }
    },
    options: {}
  },
  id: 'n_savep', name: 'Salvar Posts Vistos', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [2300, 140]
});

// ---------- Relevantes -> análise agregada ----------
push({
  parameters: code([
    'return $input.all().filter(i => i.json && i.json.relevante === true);'
  ]),
  id: 'n_rel', name: 'Filtrar Relevantes', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2300, 440]
});
push({
  parameters: code([
    'const rel = $input.all().map(i => i.json);',
    'const novosTotal = $("Filtrar Novos").all().length;',
    'const dist = { Positivo: 0, Neutro: 0, Negativo: 0 };',
    'let soma = 0; const catCount = {}; const criticos = [];',
    'for (const p of rel) {',
    '  dist[p.sentimento] = (dist[p.sentimento] || 0) + 1;',
    '  soma += Number(p.score_sentimento) || 0;',
    '  catCount[p.categoria] = (catCount[p.categoria] || 0) + 1;',
    '  if (p.criticidade === "Alta" || p.criticidade === "Crítica") criticos.push(p);',
    '}',
    'const media = rel.length ? Number((soma / rel.length).toFixed(2)) : 0;',
    'const label = media > 0.2 ? "Positivo" : media < -0.2 ? "Negativo" : "Neutro";',
    'const agora = Date.now();',
    'const hist = $("Ler Historico").all().map(i => i.json).filter(r => r && r.reddit_id);',
    'const recentes = hist.filter(r => { const t = Date.parse(r.processado_em || ""); return isFinite(t) && (agora - t) <= 6048e5 && (r.relevante === true || r.relevante === "true"); });',
    'const histCat = {}; let histNeg = 0;',
    'for (const r of recentes) { histCat[r.categoria] = (histCat[r.categoria] || 0) + 1; if (r.sentimento === "Negativo") histNeg++; }',
    'const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(x => x[0] + ": " + x[1]);',
    'const histTopCat = Object.entries(histCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0] + ": " + x[1]);',
    'const conversas = rel.slice(0, 40).map(p => ({ titulo: p.titulo, subreddit: p.subreddit, url: p.url, sentimento: p.sentimento, criticidade: p.criticidade, categoria: p.categoria, score: p.score, comentarios: p.num_comentarios, resumo: p.resumo, motivo: p.motivo }));',
    'const contexto = { marca: "Estácio (Universidade/Faculdade Estácio de Sá)", janela: "última hora", metricas: { novos_posts: novosTotal, relevantes: rel.length, criticos: criticos.length, sentimento_medio: media, sentimento_label: label, distribuicao: dist, categorias: topCat }, historico_7d: { relevantes: recentes.length, negativos: histNeg, categorias_recorrentes: histTopCat }, conversas };',
    'return [{ json: { run_id: "est_" + $execution.id, gerado_em: new Date().toISOString(), novos_posts: novosTotal, relevantes: rel.length, criticos: criticos.length, sentimento_medio: media, sentimento_label: label, distribuicao_json: JSON.stringify(dist), criticos_json: JSON.stringify(criticos.slice(0, 15)), contexto_json: JSON.stringify(contexto) } }];'
  ]),
  id: 'n_agg', name: 'Montar Analise Agregada', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2520, 440]
});

// ---------- Geração do relatório (LLM) ----------
push({
  parameters: { model: MODEL, options: { maxTokens: 4096, temperature: 0.4 } },
  id: 'n_lm_rep', name: 'OpenRouter - Report', type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', typeVersion: 1, position: [2520, 660],
  credentials: { openRouterApi: OPENROUTER_CRED }
});
push({
  parameters: {
    promptType: 'define',
    text: '=Com base nos dados de monitoramento do Reddit sobre a marca Estácio, gere um relatório executivo de Brand Intelligence.\n\nDADOS:\n{{ $json.contexto_json }}\n\nRetorne APENAS JSON válido (sem markdown): { "resumo_executivo": "", "sentimento_geral": { "label": "", "score": 0.0, "leitura": "" }, "conversas_criticas": [{ "titulo": "", "url": "", "categoria": "", "criticidade": "", "porque": "", "acao_sugerida": "" }], "dores_recorrentes": [{ "tema": "", "evidencia": "", "tendencia": "" }], "riscos_reputacao": [{ "risco": "", "severidade": "Baixa|Média|Alta", "sinal": "", "mitigacao": "" }], "pautas_seo": [{ "titulo": "", "palavra_chave_alvo": "", "intencao_busca": "", "tipo_conteudo": "Blogpost|Página|FAQ", "angulo": "", "h2_sugeridos": [], "dor_relacionada": "" }], "acoes_influenciadores": [{ "tema": "", "formato": "", "plataforma": "", "mensagem_chave": "", "perfil_embaixador": "", "objetivo": "" }], "recomendacoes": [""] }\n\nGere 3 a 6 pautas_seo e 2 a 4 acoes_influenciadores ancoradas nas dores e conversas reais. Sem conversas críticas, retorne lista vazia.',
    options: {
      systemMessage: 'Você é analista sênior de Brand Intelligence e SEO da Estácio. Gere um relatório executivo acionável a partir das conversas do Reddit. Pautas de SEO otimizadas (palavra-chave alvo realista, intenção de busca, ângulo e H2s) ancoradas nas dores reais. Ações com influenciadores/embaixadores realistas para instituição de ensino (estudantes, egressos, professores, criadores de educação). Português. Retorne SOMENTE JSON válido, sem markdown.',
      maxIterations: 2
    }
  },
  id: 'n_rep', name: 'Gerar Pautas e Report', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [2760, 440]
});
push({
  parameters: code([
    'const m = $("Montar Analise Agregada").first().json;',
    'const f = $("Gerar Pautas e Report").first();',
    'const raw = String((f && f.json && f.json.output) || "").trim();',
    'let cleaned = raw;',
    'const ji = raw.indexOf("{"); const je = raw.lastIndexOf("}"); if (ji >= 0 && je > ji) cleaned = raw.slice(ji, je + 1);',
    'let rep;',
    'try { rep = JSON.parse(cleaned); } catch (err) { rep = { resumo_executivo: "Não foi possível interpretar o relatório nesta execução.", conversas_criticas: [], dores_recorrentes: [], riscos_reputacao: [], pautas_seo: [], acoes_influenciadores: [], recomendacoes: [] }; }',
    'const dist = JSON.parse(m.distribuicao_json || "{}");',
    'const quando = new Date(m.gerado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });',
    'const arr = (x) => Array.isArray(x) ? x : [];',
    'const T = [];',
    'T.push("ESTÁCIO - MONITOR DE REPUTAÇÃO NO REDDIT");',
    'T.push("Relatório horário - " + quando);',
    'T.push("");',
    'T.push("Novos: " + m.novos_posts + "  |  Relevantes: " + m.relevantes + "  |  Críticas: " + m.criticos + "  |  Sentimento: " + m.sentimento_label + " (" + m.sentimento_medio + ")");',
    'T.push("Distribuição - positivos: " + (dist.Positivo || 0) + ", neutros: " + (dist.Neutro || 0) + ", negativos: " + (dist.Negativo || 0));',
    'T.push(""); T.push("== RESUMO EXECUTIVO =="); T.push(rep.resumo_executivo || "-");',
    'const cc = arr(rep.conversas_criticas);',
    'if (cc.length) { T.push(""); T.push("== CONVERSAS CRÍTICAS =="); cc.forEach(c => { T.push("- " + (c.titulo || "") + " [" + (c.criticidade || "") + " / " + (c.categoria || "") + "]"); if (c.porque) T.push("  Por que: " + c.porque); if (c.acao_sugerida) T.push("  Ação: " + c.acao_sugerida); if (c.url) T.push("  " + c.url); }); }',
    'const dores = arr(rep.dores_recorrentes);',
    'if (dores.length) { T.push(""); T.push("== DORES RECORRENTES =="); dores.forEach(d => T.push("- " + (d.tema || "") + ": " + (d.evidencia || "") + " (" + (d.tendencia || "") + ")")); }',
    'const riscos = arr(rep.riscos_reputacao);',
    'if (riscos.length) { T.push(""); T.push("== RISCOS DE REPUTAÇÃO =="); riscos.forEach(r => T.push("- [" + (r.severidade || "") + "] " + (r.risco || "") + " | Mitigação: " + (r.mitigacao || ""))); }',
    'const pautas = arr(rep.pautas_seo);',
    'if (pautas.length) { T.push(""); T.push("== PAUTAS DE CONTEÚDO SEO =="); pautas.forEach(p => { const h2 = arr(p.h2_sugeridos); T.push("- " + (p.titulo || "")); T.push("  KW: " + (p.palavra_chave_alvo || "") + " | Intenção: " + (p.intencao_busca || "") + " | Tipo: " + (p.tipo_conteudo || "")); if (p.angulo) T.push("  Ângulo: " + p.angulo); if (h2.length) T.push("  H2: " + h2.join(" / ")); if (p.dor_relacionada) T.push("  Dor: " + p.dor_relacionada); }); }',
    'const infl = arr(rep.acoes_influenciadores);',
    'if (infl.length) { T.push(""); T.push("== AÇÕES COM INFLUENCIADORES / EMBAIXADORES =="); infl.forEach(a => { T.push("- " + (a.tema || "") + " (" + (a.formato || "") + " / " + (a.plataforma || "") + ")"); if (a.mensagem_chave) T.push("  Mensagem: " + a.mensagem_chave); T.push("  Perfil: " + (a.perfil_embaixador || "") + " | Objetivo: " + (a.objetivo || "")); }); }',
    'const recs = arr(rep.recomendacoes);',
    'if (recs.length) { T.push(""); T.push("== RECOMENDAÇÕES =="); recs.forEach(r => T.push("- " + r)); }',
    'T.push(""); T.push("--"); T.push("Gerado automaticamente via n8n + OpenRouter");',
    'const report_text = T.join("\\n");',
    'const criticosList = JSON.parse(m.criticos_json || "[]");',
    'const A = [];',
    'A.push("ALERTA DE REPUTAÇÃO - ESTÁCIO NO REDDIT"); A.push("");',
    'A.push("Foram detectadas " + m.criticos + " conversa(s) de alta criticidade (" + quando + ")."); A.push("");',
    'criticosList.forEach(c => { A.push("- " + (c.titulo || "")); A.push("  r/" + (c.subreddit || "") + " | " + (c.criticidade || "") + " | " + (c.categoria || "") + " | " + (c.score || 0) + " pts | " + (c.num_comentarios || 0) + " coment."); if (c.resumo || c.motivo) A.push("  " + (c.resumo || c.motivo)); if (c.url) A.push("  " + c.url); });',
    'A.push(""); A.push("Relatório completo no e-mail do report horário.");',
    'const alerta_text = A.join("\\n");',
    'const assunto_report = "Estácio - Monitor Reddit: " + m.relevantes + " conversa(s), sentimento " + m.sentimento_label + (m.criticos > 0 ? " - " + m.criticos + " crítica(s)" : "");',
    'const assunto_alerta = "[ALERTA] Estácio - " + m.criticos + " conversa(s) crítica(s) no Reddit";',
    'return [{ json: { run_id: m.run_id, gerado_em: m.gerado_em, novos_posts: m.novos_posts, relevantes: m.relevantes, criticos: m.criticos, sentimento_medio: m.sentimento_medio, sentimento_label: m.sentimento_label, report_json: JSON.stringify(rep), report_text, alerta_text, assunto_report, assunto_alerta, tem_criticos: m.criticos > 0 } }];'
  ]),
  id: 'n_prep', name: 'Processar Report', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2980, 440]
});

// ---------- Saídas: Data Table + e-mails ----------
push({
  parameters: {
    resource: 'row', operation: 'insert', dataTableId: DT_REPORTS,
    columns: {
      mappingMode: 'defineBelow',
      value: {
        run_id: '={{ $json.run_id }}', gerado_em: '={{ $json.gerado_em }}', novos_posts: '={{ $json.novos_posts }}',
        relevantes: '={{ $json.relevantes }}', criticos: '={{ $json.criticos }}', sentimento_medio: '={{ $json.sentimento_medio }}',
        sentimento_label: '={{ $json.sentimento_label }}', report_json: '={{ $json.report_json }}'
      }
    },
    options: {}
  },
  id: 'n_saver', name: 'Salvar Report', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [3240, 280]
});
push({
  parameters: {
    resource: 'message', operation: 'send', authentication: 'oAuth2',
    sendTo: EMAIL, subject: '={{ $json.assunto_report }}', emailType: 'text', message: '={{ $json.report_text }}',
    options: { appendAttribution: false, senderName: 'Estácio Reddit Monitor' }
  },
  id: 'n_mailrep', name: 'Enviar Report Horario', type: 'n8n-nodes-base.gmail', typeVersion: 2.2, position: [3240, 460]
});
push({
  parameters: code([
    'return ($json.tem_criticos === true || $json.criticos > 0) ? $input.all() : [];'
  ]),
  id: 'n_gate', name: 'Gate Criticos', type: 'n8n-nodes-base.code', typeVersion: 2, position: [3240, 640]
});
push({
  parameters: {
    resource: 'message', operation: 'send', authentication: 'oAuth2',
    sendTo: EMAIL, subject: '={{ $json.assunto_alerta }}', emailType: 'text', message: '={{ $json.alerta_text }}',
    options: { appendAttribution: false, senderName: 'Estácio Reddit Monitor' }
  },
  id: 'n_mailalert', name: 'Enviar Alerta Critico', type: 'n8n-nodes-base.gmail', typeVersion: 2.2, position: [3500, 640]
});

// ---------- Sticky notes ----------
push({
  parameters: { content: '## Estácio – Monitor de Reputação no Reddit\nA cada hora: busca conversas sobre a Estácio, classifica sentimento/criticidade/categoria via OpenRouter, registra histórico, gera pautas de SEO + ações com influenciadores e envia report por e-mail. Conversas críticas disparam alerta imediato.', height: 200, width: 360, color: 4 },
  id: 'n_note1', name: 'Nota Visao', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [200, 60]
});
push({
  parameters: { content: '## Configurar antes de ativar\n1. RSS do Reddit: no nó "Buscar no Reddit (RSS)" preencha user= e feed= (token em reddit.com/prefs/feeds) e o User-Agent com seu usuário. Sem custo, sem app OAuth.\n2. Credencial Gmail (OAuth2) nos nós de envio.\n3. Credencial OpenRouter nos 2 modelos.\n4. Destinatário dos e-mails (hoje: ' + EMAIL + ').\n5. Termos de busca em "Configurar Monitor".\n\nObs.: via RSS, score e nº de comentários vêm como 0 (não expostos no feed).', height: 260, width: 380, color: 3 },
  id: 'n_note2', name: 'Nota Config', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [600, 60]
});
push({
  parameters: { content: '## Saídas\n- Report horário por e-mail (sentimento, dores, riscos, pautas SEO, influenciadores).\n- Alerta crítico por e-mail quando há alta criticidade.\n- Data Tables: reddit_estacio_posts (histórico/dedup) e reddit_estacio_reports.', height: 200, width: 360, color: 5 },
  id: 'n_note3', name: 'Nota Saidas', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [2980, 60]
});

// ---------- Conexões ----------
const main = (to) => ({ main: [to.map(n => ({ node: n, type: 'main', index: 0 }))] });
const connections = {
  'Disparo Manual': main(['Ler Historico']),
  'A Cada Hora': main(['Ler Historico']),
  'Ler Historico': main(['Configurar Monitor']),
  'Configurar Monitor': main(['Buscar no Reddit (RSS)']),
  'Buscar no Reddit (RSS)': main(['Normalizar Posts']),
  'Normalizar Posts': main(['Filtrar Novos']),
  'Filtrar Novos': main(['Montar Lote']),
  'Montar Lote': main(['Classificar Conversas']),
  'OpenRouter - Classificacao': { ai_languageModel: [[{ node: 'Classificar Conversas', type: 'ai_languageModel', index: 0 }]] },
  'Classificar Conversas': main(['Processar Classificacao']),
  'Processar Classificacao': main(['Salvar Posts Vistos', 'Filtrar Relevantes']),
  'Filtrar Relevantes': main(['Montar Analise Agregada']),
  'Montar Analise Agregada': main(['Gerar Pautas e Report']),
  'OpenRouter - Report': { ai_languageModel: [[{ node: 'Gerar Pautas e Report', type: 'ai_languageModel', index: 0 }]] },
  'Gerar Pautas e Report': main(['Processar Report']),
  'Processar Report': main(['Salvar Report', 'Enviar Report Horario', 'Gate Criticos']),
  'Gate Criticos': main(['Enviar Alerta Critico'])
};

const workflow = {
  name: 'Estácio – Reddit Sentiment & Reputation Monitor',
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: {},
  tags: []
};

fs.writeFileSync('estacio-reddit-monitor.json', JSON.stringify(workflow, null, 2));
console.log('OK: estacio-reddit-monitor.json (' + nodes.length + ' nós)');
