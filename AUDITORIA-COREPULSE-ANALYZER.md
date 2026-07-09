# Auditoria — Workflow "CorePulse Analyzer" (n8n)

**Data:** 2026-07-09
**Workflow auditado:** `CorePulse Analyzer` (id `iZm3tclMskdyVqoM`, ativo, webhook `/webhook/corepulse`)
**Sintoma reportado:** chamadas retornando **"Failed to fetch"**

---

## 1. Diagnóstico do "Failed to fetch" (causa raiz)

O erro não vem de um único defeito, e sim de uma cadeia de tempo/arquitetura no **modo síncrono** do workflow:

1. **Quem chama:** o workflow "SEO Orchestrator V4 (SMA)" (`M9vwoMvrGWgJ9bJt`) tem o nó
   `CorePulse CWV (sync)` que faz POST em `/webhook/corepulse` com `mode=sync` e **timeout de 120s**.
2. **Quanto demora:** no modo sync, o CorePulse segura a conexão HTTP aberta enquanto roda o
   PageSpeed Insights **mobile + desktop, com 4 categorias cada** — medido nas execuções reais:
   - Execução `302125`: **61s** até responder
   - Execução `302056`: **183s** até responder (resposta enviada às 19:58:51 para request de 19:55:48)
3. **Onde quebra:**
   - 183s > 120s do timeout do chamador → o HTTP Request do SMA falha por timeout
     (`neverError` não cobre timeout, só status HTTP);
   - a infraestrutura na frente do n8n é um **AWS ALB** (header `x-amzn-trace-id`), cujo idle
     timeout típico é **60s** — conexões que passam disso são derrubadas mesmo quando o n8n
     "responde" depois;
   - no navegador (a interface foi usada com `origin: null` — página aberta como arquivo
     local/cross-origin, visto na execução `285895`), qualquer resposta de erro **sem cabeçalhos
     CORS** faz o `fetch` lançar exatamente `TypeError: Failed to fetch`.
4. **Por que parece que "funciona":** o n8n marca essas execuções como **success**, porque o
   workflow terminou — mas a resposta nunca chegou ao chamador. O erro só aparece do lado de quem chamou.

**Evidência adicional:** execução `286709` — o orquestrador enviou `mode=sync` com `urls` vazio;
o nó `Split URLs` lançou exceção **antes de qualquer nó "Respond to Webhook" executar** → o n8n
devolveu 500 genérico (sem CORS) → "Failed to fetch"/erro no chamador.

---

## 2. Problemas encontrados

### Críticos

| # | Problema | Evidência |
|---|----------|-----------|
| C1 | **Modo sync excede todos os timeouts** (61–183s segurando a conexão). PSI mobile+desktop com 4 categorias é lento demais para resposta síncrona atrás de ALB (60s). | Execuções 302056/302125 |
| C2 | **Validação acontece depois (ou fora) da resposta.** No sync, payload inválido derruba o workflow antes de qualquer Respond → 500 sem CORS. No async, o "Confirmar Recebimento" responde `success:true` **antes** de validar URLs/e-mail. | Execução 286709 |
| C3 | **Falhas assíncronas são silenciosas.** O usuário vê "Análise iniciada com sucesso!" e o relatório nunca chega: em 25/06 a chave OpenRouter estourou o **limite mensal (403 Key limit exceeded)** e o e-mail não foi enviado. Não há alerta, retry nem fallback. | Execução 285895 |
| C4 | **`neverError: true` no PSI sem checar o corpo da resposta.** Quando o PSI falha (quota/erro), os nós "Estruturar" produzem `scores: null` e `failingAudits: []`, e o fluxo segue — o agente chega a "analisar" dados vazios e geraria relatório sem conteúdo. | Execução 285895 (theverge.com: tudo null) |

### Altos

| # | Problema |
|---|----------|
| A1 | **Chave da API Google hardcoded na URL** dos nós PageSpeed Mobile/Desktop (`AIzaSyB0Zi…NsI`). Ela fica visível em execuções, logs, exports e para qualquer pessoa com leitura no workflow. Rotacionar, restringir (por API e por IP) e mover para credencial (Query Auth). |
| A2 | **Sem Error Workflow configurado** — a instância já tem o "SEO Orchestrator – Alerta de Erros" (`KJUEZjqsMuCz0qoZ`) feito para isso; basta apontar nas settings do CorePulse. |
| A3 | **Nenhum nó tem `retryOnFail`** (PSI, LLM, Gmail). PSI falha com frequência; 2–3 tentativas com espera resolveriam boa parte das falhas transitórias. |
| A4 | **Trabalho duplicado no PSI:** na "Análise Completa" o SMA chama o próprio nó "PageSpeed Insights" **e** o CorePulse sync para a mesma URL → a URL é testada 3× no Lighthouse (quota e latência multiplicadas). |
| A5 | **Header CORS duplicado no "Responder Sync":** `allowedOrigins: "*"` no webhook já adiciona `Access-Control-Allow-Origin`; o nó adiciona outro manualmente. ACAO duplicado (`*, *`) é rejeitado por navegadores → "Failed to fetch" em chamadas cross-origin. |

### Médios

| # | Problema |
|---|----------|
| M1 | **Parsing frágil da saída do agente**: "Montar E-mail HTML" extrai JSON com regex (`{[\s\S]*}`) e o agente roda com `hasOutputParser: false`. Se o modelo devolver texto fora do padrão → `JSON não encontrado` → sem e-mail. O SMA já usa Structured Output Parser; replicar aqui. |
| M2 | **Merge em modo combine (inner join)**: se uma URL só tiver resultado mobile ou só desktop, ela some silenciosamente do relatório consolidado. |
| M3 | **Sync analisa só a 1ª URL** (por design do "Formatar Sync"), mas isso não é comunicado na resposta nem validado na entrada. |
| M4 | **Execuções longas com muitas URLs**: PSI roda sequencialmente (mobile de todas, depois desktop). 10 URLs ≈ 10–20 min de execução — risco de timeout de execução e de quota. |
| M5 | **Workflow duplicado**: existe uma cópia inativa "CorePulse Analyzer" (`UWDoMbDbtAZSYEzw`) — arquivar para evitar edição no lugar errado. |
| M6 | Agente com `maxIterations: 1` e `maxTokens: 12000` — sem margem para retry interno se a resposta truncar. |

---

## 3. Correções recomendadas (em ordem de prioridade)

### P0 — Eliminar o "Failed to fetch"
1. **No SMA:** parar de chamar o CorePulse com `mode=sync` inline. Duas opções:
   - usar o padrão **job + poll** que o próprio SMA já implementa (Data Table `seo_jobs`,
     `GET – Poll Resultado`); ou
   - chamar o CorePulse em **modo async** (com `email`), aproveitando que o SMA já tem o nó
     "PageSpeed Insights" próprio para os dados inline do chat.
2. **No CorePulse:** mover a validação de payload (URLs válidas, e-mail no async) para **antes**
   de qualquer resposta, num nó Code/IF logo após o webhook:
   - payload inválido → `Respond to Webhook` com **HTTP 400** e JSON de erro (com CORS);
   - payload válido + async → "Confirmar Recebimento" (200) → segue o processamento;
   - payload válido + sync → segue o fluxo sync.
3. **Se o modo sync for mantido**, ele precisa caber em <60s: limitar a 1 URL,
   `strategy=mobile` e apenas `category=performance` (o "Formatar Sync" usa quase só isso), e
   **remover o header manual `Access-Control-Allow-Origin`** do "Responder Sync".

### P1 — Confiabilidade
4. `retryOnFail` (2–3 tentativas, 3–5s) nos nós PageSpeed Mobile/Desktop, no agente e no Gmail.
5. Após cada PSI, **checar se `lighthouseResult` existe**; se não, seguir por rota de erro
   (retry ou notificação), em vez de propagar dados vazios.
6. Configurar **Error Workflow** = "SEO Orchestrator – Alerta de Erros" nas settings do CorePulse,
   e/ou enviar e-mail de falha ao solicitante quando o pipeline async morrer.
7. Monitorar/alertar o limite mensal da chave OpenRouter; considerar fallback de modelo.

### P2 — Segurança e higiene
8. **Rotacionar a chave do Google PSI** (está exposta), restringir à API PageSpeed e ao IP do
   servidor, e movê-la para credencial n8n (Query Auth) em vez de texto na URL.
9. Trocar o parse por regex do output do agente por **Structured Output Parser**.
10. Arquivar a cópia inativa `UWDoMbDbtAZSYEzw`.
11. Documentar no response do sync que apenas a 1ª URL é analisada (ou rejeitar >1 URL com 400).

---

## 4. Observação final

O ciclo do bug em produção hoje é: SMA chama CorePulse sync → CorePulse demora 1–3 min →
conexão morre no ALB/timeout do chamador → SMA falha ou recebe vazio → interface mostra
"Failed to fetch"/timeout — enquanto o painel do n8n mostra tudo "success". Qualquer correção
que não tire o trabalho pesado (PSI + LLM) de dentro da janela da requisição HTTP vai continuar
esbarrando no limite de ~60s da infraestrutura.
