const out = String($input.first()?.json?.output ?? '').trim();
if (out.length < 20) return [];
return [{ json: { licoes: out.slice(0, 6000) } }];
