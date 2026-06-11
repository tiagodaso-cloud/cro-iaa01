const req = $('Parse Request').first()?.json ?? {};
const out = $input.first()?.json ?? {};
const ex  = out.output ?? out;

let url   = typeof ex.url === 'string' ? ex.url.trim() : '';
let topic = typeof ex.topic === 'string' ? ex.topic.trim() : '';
const market = (typeof ex.market === 'string' && ex.market.trim()) ? ex.market.trim().toUpperCase() : 'BR';
const lang   = (typeof ex.lang === 'string' && ex.lang.trim()) ? ex.lang.trim() : 'pt-BR';

let route = 'chat';

if (ex.intent === 'full_analysis') {
  // Completa entidades que o extrator possa ter deixado em branco
  if (!/^https?:\/\//.test(url)) {
    const m = (req.message ?? '').match(/https?:\/\/[^\s,;!?]+/);
    if (m) url = m[0].replace(/[.,;!?]+$/, '');
  }
  if (!topic && url) {
    topic = (req.message ?? '')
      .replace(url, '')
      .replace(/\b(analise|sobre|o site|a url|verifique|quero analisar)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (/^https?:\/\//.test(url) && topic) route = 'analysis';
} else if (!ex.intent && !req.hasContext) {
  // Fallback heurístico (comportamento V1) caso o extrator de intenção falhe
  const m = (req.message ?? '').match(/https?:\/\/[^\s,;!?]+/);
  const t = m ? (req.message ?? '').replace(m[0], '').replace(/\s+/g, ' ').trim() : '';
  if (m && t.length > 2) {
    url = m[0].replace(/[.,;!?]+$/, '');
    topic = t;
    route = 'analysis';
  }
}

return [{ json: { ...req, route, url, topic, market, lang } }];
