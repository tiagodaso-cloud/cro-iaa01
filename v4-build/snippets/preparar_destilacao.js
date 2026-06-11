const ag = $('Agregar Feedbacks').first()?.json ?? {};
const lessons = $input.all().map(i => i.json).filter(r => r && typeof r.licoes === 'string' && r.licoes.trim());
return [{ json: {
  ...ag,
  licoesAtuais: lessons.length ? lessons[0].licoes : '(nenhuma diretriz registrada ainda)'
} }];
