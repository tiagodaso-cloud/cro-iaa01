const rows = $input.all().map(i => i.json).filter(r => r && r.rating);
if (!rows.length) return [];

const fmt = (r) =>
  '[' + (r.rating === 'up' ? 'positivo' : 'negativo') + '] ' +
  'usuário: "' + String(r.mensagem_usuario || '').slice(0, 200) + '" | ' +
  'resposta: "' + String(r.resposta_assistente || '').slice(0, 300) + '"' +
  (r.comentario ? ' | comentário: "' + String(r.comentario).slice(0, 300) + '"' : '');

const positivos = rows.filter(r => r.rating === 'up').length;
const negativos = rows.length - positivos;
const feedbackText = rows.slice(0, 100).map(fmt).join('\n');

return [{ json: { total: rows.length, positivos, negativos, feedbackText } }];
