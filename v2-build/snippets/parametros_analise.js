const d = $input.first()?.json ?? {};
return [{ json: {
  url: d.url,
  topic: d.topic,
  market: d.market ?? 'BR',
  lang: d.lang ?? 'pt-BR',
  userEmail: d.userEmail ?? ''
} }];
