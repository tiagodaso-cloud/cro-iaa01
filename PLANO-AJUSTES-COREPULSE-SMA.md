# Plano de Ajustes — CorePulse Analyzer + SEO Orchestrator V4 (SMA)

Passo a passo para aplicar manualmente no n8n (nenhuma alteração foi feita automaticamente).
Complementa a AUDITORIA-COREPULSE-ANALYZER.md.

## Parte 1 — CorePulse Analyzer (iZm3tclMskdyVqoM)

### 1.1 Validar a entrada ANTES de responder
1. Novo nó Code "Validar Entrada" após "POST - Receber Auditoria":

```javascript
const body = $input.first().json.body || {};
const urlsRaw = String(body.urls || '');
const email = String(body.email || '').trim();
const context = String(body.context || '').trim() || 'Nao informado';
const mode = String(body.mode || '').trim().toLowerCase() === 'sync' ? 'sync' : 'async';
const urls = urlsRaw.split('\n').map(u => u.trim()).filter(u => /^https?:\/\//i.test(u)).slice(0, 10);

const errors = [];
if (!urls.length) errors.push('Nenhuma URL valida informada.');
if (mode === 'async' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('E-mail valido e obrigatorio no modo async.');
if (mode === 'sync' && urls.length > 1) errors.push('Modo sync aceita apenas 1 URL.');

return [{ json: { valid: errors.length === 0, errors, urls, email, context, mode, totalUrls: urls.length } }];
```

2. Novo IF "Entrada Válida?" ({{ $json.valid }} is true).
3. Ramo false -> novo Respond to Webhook "Responder Erro 400": JSON, code 400,
   body `={{ { "success": false, "errors": $json.errors } }}`.
4. Ramo true -> "IF – Sync?" existente (sync -> Split URLs; async -> Confirmar Recebimento -> Split URLs).
5. Simplificar "Split URLs" (sem throws):

```javascript
const d = $input.first().json;
const runId = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
return d.urls.map(url => ({ json: { url, email: d.email, context: d.context, runId, mode: d.mode, totalUrls: d.urls.length } }));
```

### 1.2 Modo sync abaixo de 60s
1. URL dinâmica nos nós PageSpeed (sync = só performance):
```
=https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={{ encodeURIComponent($json.url) }}&strategy=mobile{{ $json.mode === 'sync' ? '&category=performance' : '&category=performance&category=accessibility&category=best-practices&category=seo' }}
```
(no Desktop, strategy=desktop; chave sai da URL — ver 1.5)
2. "Responder Sync": REMOVER o header manual Access-Control-Allow-Origin
   (allowedOrigins "*" no webhook já injeta; duplicado = fetch rejeitado pelo navegador).
3. Opcional: pular PageSpeed Desktop no modo sync (IF antes dele) e aceitar desktop_score null.

### 1.3 PSI sem mascarar falhas + retry
1. PageSpeed Mobile/Desktop: desmarcar "Never Error"; Retry On Fail = on, Max Tries 3, Wait 5000ms.
2. Guard no topo de Estruturar Mobile/Desktop:
```javascript
if (!$json.lighthouseResult) {
  throw new Error('PageSpeed nao retornou lighthouseResult para ' + ($('Split URLs').item.json.url || '?'));
}
```

### 1.4 Alerta de falhas
1. Settings do workflow -> Error Workflow = "SEO Orchestrator – Alerta de Erros" (KJUEZjqsMuCz0qoZ).
2. "Enviar Relatorio" (Gmail): Retry On Fail = on, Max Tries 2.
3. Agente "Analista CWV + SEO": ativar fallback model (o 403 monthly limit da OpenRouter em 25/06 matou execução sem aviso).

### 1.5 Segurança: chave Google PSI
1. Criar nova chave no GCP restrita à PageSpeed Insights API (+ IP do n8n); revogar a exposta (AIzaSyB0Zi…NsI).
2. Criar credencial Query Auth no n8n (name: key).
3. Nos nós PageSpeed: Authentication -> Generic -> Query Auth; remover &key=... da URL.

### 1.6 Parser estruturado no agente
1. Ativar "Require Specific Output Format" + nó Structured Output Parser com o schema do system message (padrão já usado no SMA).
2. "Montar E-mail HTML": usar `$input.first().json.output` como objeto; manter pj() como fallback.

### 1.7 Higiene
- Arquivar duplicata inativa "CorePulse Analyzer" (UWDoMbDbtAZSYEzw).
- Publicar a nova versão.

## Parte 2 — SEO Orchestrator V4 (SMA) (M9vwoMvrGWgJ9bJt)

### 2.1 Converter chamada para async
No nó "CorePulse CWV (sync)":
1. Renomear para "CorePulse CWV (async)".
2. Body: remover `mode`; adicionar `email` (do payload do chat ou e-mail da equipe); manter urls/context.
3. Timeout: 120000 -> 15000.
4. Retry On Fail = on, Max Tries 2.

### 2.2 Ajustar "Parse CorePulse" (resposta agora é ack)
```javascript
const r = $input.first()?.json ?? {};
return [{ json: {
  corepulse_status: r.success ? 'dispatched' : 'failed',
  corepulse_email_enviado: !!r.success,
  corepulse_nota: r.success
    ? 'Relatório CWV detalhado será enviado por e-mail pelo CorePulse Analyzer em alguns minutos.'
    : 'Falha ao acionar o CorePulse: ' + (r.message || JSON.stringify(r).slice(0, 200))
} }];
```

### 2.3 Métricas inline vêm do PSI próprio
Em "Montar Contexto": campos CWV (score, lcp, cls, tbt…) devem vir de "Parse PSI";
"Parse CorePulse" contribui só com corepulse_status/corepulse_nota.

### 2.4 Robustez
1. Settings -> Error Workflow = "SEO Orchestrator – Alerta de Erros".
2. Tool "Verificar Core Web Vitals": Retry On Fail = on (2 tentativas).
3. Publicar.

## Parte 3 — Testes (nesta ordem, após publicar o CorePulse)

```bash
# 1. Página carrega
curl -s -o /dev/null -w "%{http_code}\n" https://n8n-prod.cadastra.com/webhook/corepulse

# 2. Payload inválido -> 400 com JSON (não 500)
curl -s -X POST https://n8n-prod.cadastra.com/webhook/corepulse \
  -H 'Content-Type: application/json' -d '{"urls":"","mode":"sync"}'

# 3. Async válido -> 200 imediato + e-mail em minutos
curl -s -X POST https://n8n-prod.cadastra.com/webhook/corepulse \
  -H 'Content-Type: application/json' \
  -d '{"urls":"https://www.exemplo.com.br","email":"destinatario@dominio.com"}'

# 4. Sync válido -> resposta em MENOS de 60s
time curl -s -X POST https://n8n-prod.cadastra.com/webhook/corepulse \
  -H 'Content-Type: application/json' \
  -d '{"urls":"https://www.exemplo.com.br","mode":"sync"}'
```

Depois de publicar o SMA: rodar "Análise Completa" no chat e conferir
(a) resposta sem "Failed to fetch", (b) e-mail do CorePulse chega,
(c) URL inválida gera alerta do Error Workflow.
