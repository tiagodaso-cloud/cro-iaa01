const safe = (name) => { try { return $(name).first()?.json ?? null; } catch (e) { return null; } };
const req      = safe('Parse Request') ?? {};
const rota     = safe('Definir Rota')?.route ?? 'chat';
const analysis = safe('Formatar Análise');
const conv     = safe('Formatar Conversa');

let resposta = '';
if (analysis && analysis.messageType === 'analysis') {
  resposta = '[análise completa] ' + (analysis.analysisContext?.url_analisada ?? '') + ' · ' + (analysis.analysisContext?.topico ?? '');
} else if (conv) {
  resposta = String(conv.message ?? '').slice(0, 4000);
}

return [{ json: {
  email:     req.userEmail ?? '',
  jobId:     req.jobId ?? '',
  rota,
  mensagem:  String(req.message ?? '').slice(0, 2000),
  resposta,
  criado_em: new Date().toISOString()
} }];
