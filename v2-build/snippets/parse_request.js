const body = $input.first()?.json?.body ?? $input.first()?.json ?? {};
const message = (body.message ?? '').trim();
const history = Array.isArray(body.history) ? body.history : [];
const analysisContext = body.analysisContext ?? null;
const jobId = (body.jobId ?? '').trim();
const userEmail = (body.userEmail ?? '').trim();
if (!message) throw new Error('Mensagem vazia.');
if (!jobId)   throw new Error('jobId obrigatório.');
return [{ json: { message, history, analysisContext, jobId, userEmail, hasContext: analysisContext !== null } }];
