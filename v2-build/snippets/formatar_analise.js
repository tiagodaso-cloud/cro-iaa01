const item = $input.first()?.json ?? {};
let analysisData = item.output ?? null;
if (typeof analysisData === 'string') {
  try { analysisData = JSON.parse(analysisData); } catch (e) { analysisData = null; }
}

if (
  !analysisData ||
  typeof analysisData !== 'object' ||
  !analysisData.sumario ||
  !Array.isArray(analysisData.sumario.insights) ||
  analysisData.sumario.insights.length === 0
) {
  analysisData = {
    sumario: {
      insights: ['⚠️ A análise não retornou no formato esperado. Tente novamente em instantes.'],
      nivel_impacto: 'Indeterminado'
    },
    correlacoes: [], gaps_oportunidades: [], plano_acao: [], proximos_passos: []
  };
}

// Guard: referencia nós que podem não ter executado sem derrubar o fluxo
const safe = (name) => { try { return $(name).first()?.json ?? {}; } catch (e) { return {}; } };
const params    = safe('Parâmetros de Análise');
const psi       = safe('Parse PSI');
const corepulse = safe('Parse CorePulse');

const userEmail = (params.userEmail ?? '').trim();
const cpHasMetrics =
  corepulse.corepulse_score != null ||
  corepulse.corepulse_lcp   != null ||
  corepulse.corepulse_fcp   != null ||
  corepulse.corepulse_cls   != null ||
  corepulse.corepulse_inp   != null;

return [{ json: {
  role: 'assistant', messageType: 'analysis', message: null,
  analysisContext: {
    ...analysisData,
    url_analisada: params.url,
    topico:        params.topic,
    mercado:       params.market ?? 'BR',
    idioma:        params.lang ?? 'pt-BR',
    psi_score:   psi.performance_score ?? null,
    psi_lcp:     psi.lcp     ?? null,
    psi_fcp:     psi.fcp     ?? null,
    psi_cls:     psi.cls     ?? null,
    psi_tbt:     psi.tbt     ?? null,
    psi_overall: psi.overall ?? null,
    corepulse_has_metrics: cpHasMetrics,
    corepulse_score:   corepulse.corepulse_score   ?? null,
    corepulse_lcp:     corepulse.corepulse_lcp     ?? null,
    corepulse_fcp:     corepulse.corepulse_fcp     ?? null,
    corepulse_cls:     corepulse.corepulse_cls     ?? null,
    corepulse_inp:     corepulse.corepulse_inp     ?? null,
    corepulse_tbt:     corepulse.corepulse_tbt     ?? null,
    corepulse_grade:   corepulse.corepulse_grade   ?? null,
    user_email_provided: userEmail.length > 0,
    user_email_masked: userEmail ? userEmail.replace(/(.{2}).+(@.+)/, '$1***$2') : null,
    generated_at: new Date().toISOString()
  }
} }];
