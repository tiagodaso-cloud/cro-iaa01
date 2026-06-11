const d = $('Definir Rota').first()?.json ?? {};
const message = d.message ?? '';
const history = Array.isArray(d.history) ? d.history : [];
const ctx = d.analysisContext;

// Diretrizes aprendidas (vindas do nó Carregar Lições)
let licoes = '';
try {
  const rows = $input.all().map(i => i.json).filter(r => r && typeof r.licoes === 'string' && r.licoes.trim());
  if (rows.length) licoes = rows[0].licoes.slice(0, 4000);
} catch (e) {}

const histText = history.length
  ? history.map(m => (m.role === 'user' ? 'Usuário' : 'Assistente') + ': ' + m.content).join('\n\n')
  : '(início da conversa)';

const ctxJSON = ctx ? JSON.stringify({
  url_analisada: ctx.url_analisada,
  topico: ctx.topico,
  mercado: ctx.mercado,
  idioma: ctx.idioma,
  sumario: ctx.sumario,
  correlacoes: ctx.correlacoes,
  gaps_oportunidades: ctx.gaps_oportunidades,
  plano_acao: ctx.plano_acao,
  proximos_passos: ctx.proximos_passos,
  cwv_dados: {
    performance_score: ctx.psi_score,
    lcp: ctx.psi_lcp, fcp: ctx.psi_fcp, cls: ctx.psi_cls, tbt: ctx.psi_tbt,
    campo_geral: ctx.psi_overall
  }
}, null, 2) : '(nenhuma análise completa foi realizada nesta sessão ainda)';

return [{ json: {
  message,
  histText,
  ctxJSON,
  licoes: licoes || '(nenhuma diretriz registrada ainda)',
  url:    ctx?.url_analisada ?? d.url   ?? '',
  topico: ctx?.topico        ?? d.topic ?? '',
  market: d.market ?? 'BR',
  lang:   d.lang   ?? 'pt-BR'
} }];
