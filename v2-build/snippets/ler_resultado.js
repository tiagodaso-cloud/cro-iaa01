const jobId = ($('GET – Poll Resultado').first()?.json?.query?.jobId ?? '').trim();
if (!jobId) return [{ json: { status: 'error', message: 'jobId obrigatório' } }];

const rows = $input.all()
  .map(i => i.json)
  .filter(r => r && typeof r.payload === 'string' && r.payload.length > 0);

if (!rows.length) return [{ json: { status: 'processing' } }];

let result;
try {
  result = JSON.parse(rows[0].payload);
} catch (e) {
  result = { role: 'assistant', messageType: 'text', message: '❌ Erro ao ler o resultado salvo.', analysisContext: null };
}
return [{ json: { status: 'done', result } }];
