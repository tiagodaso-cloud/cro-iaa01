# Roadmap — SEO Orchestrator V4

> Última atualização: **2026-06-19**
> Status geral: 🟢 **Operacional** (caminho principal validado end-to-end)

---

## 1. Visão geral da arquitetura

Sistema multi-agente (SMA) de SEO/GEO orquestrado em n8n:

```
Webhook (chat) ──► Hub / Orquestrador ──┬─► RAG (Qdrant: seo_repertorio)
                                        ├─► Lições globais (seo_lessons)
                                        ├─► 5 Especialistas (toolWorkflow)
                                        │     ├─ SEO Técnico
                                        │     ├─ Conteúdo & Link Building
                                        │     ├─ GEO / Agentic
                                        │     ├─ Análise de Dados
                                        │     └─ Estratégia
                                        └─► Análise Completa (multi-especialista)

Background:
  • Meta-Agente (supervisor de qualidade, diário 07:00)
  • Trilha de Conhecimento (destilação de lições, schedule noturno)
  • Ingestão de Repertório (upload → embeddings → Qdrant)
```

**Stack:**
- LLM: OpenRouter (`anthropic/claude-sonnet-4.6`)
- Embeddings: Google Gemini (`gemini-embedding-001`, 3072 dims)
- Vector store: Qdrant Cloud (collection `seo_repertorio`)
- Persistência: n8n Data Tables (`seo_jobs`, `seo_conversations`, `seo_feedback`, `seo_lessons`, `seo_quality_log`)

| Workflow | ID |
|---|---|
| Hub / Orquestrador (SMA) | `M9vwoMvrGWgJ9bJt` |
| Especialista SEO Técnico | `PeKW6vx7I3XVscqY` |
| Meta-Agente | `t4V1Dja8fsXeWqVM` |

---

## 2. ✅ Concluído

### Auditoria completa (2026-06-16/18)
- Mapeamento do ecossistema V4: hub, 5 especialistas, Análise Completa, Ingestão, Trilha e Meta-Agente.
- Identificação de erros, gargalos e oportunidades de melhoria.

### Meta-Agente — correção do loop de avaliação (2026-06-18)
- **Bug crítico corrigido:** avaliador lia `chave==='sistema'`, mas o hub grava `'global'` → o supervisor estava efetivamente cego. Corrigido para `'global'`.
- **Nós mortos removidos:** `Preparar Meta-Licoes` + `Gravar Meta-Licoes` (gravavam em `meta_ajuste`, que nada lia).
- **Fechamento do loop:** quando score < 7, grava `rating:'down'` + recomendações em `seo_feedback` → absorvido pela destilação noturna do hub e convertido em lições `global`.
- **Schedule ajustado:** 06:00 → **07:00** (roda após a destilação do hub; feedback entra no ciclo seguinte).
- Workflow publicado.

### Qdrant — índice de payload criado (2026-06-19) 🔑
- **Bug crítico resolvido:** o filtro `metadata.expertise` retornava `400 Bad Request` ("Index required but not found") em **todas** as buscas dos especialistas → os 5 especialistas operavam **sem repertório**.
- Índice `metadata.expertise` (tipo `keyword`) criado no cluster Qdrant Cloud via Console.
- Validado: filtro agora retorna `200` (sem erro).

### Validação end-to-end (2026-06-19)
Teste real via webhook de chat (`jobId: seo_mqlfetzb_scs0qy`), execução `273489`. Bastidores confirmados:

| Etapa | Resultado |
|---|---|
| Roteamento (intenção → rota) | ✅ rota `chat` |
| RAG do hub | ✅ 280ms, 2 documentos (score 0.62 / 0.61) |
| Lições globais carregadas | ✅ 12 lições ativas |
| Agente Orquestrador | ✅ resposta em 41,7s |
| Persistência (`seo_conversations`, `seo_jobs`) | ✅ gravado |
| Poll + limpeza de job | ✅ entregue e removido |

Confirmado que o documento do repertório **influenciou a resposta** (trecho de "Core Web Vitals & Negócio - RUM" citado no parecer).

---

## 3. 🔜 Próximos passos

### Prioridade ALTA — correções manuais (n8n UI)

- [ ] **Remover PSI API key hardcoded** — chave do PageSpeed Insights está fixa em 5 nós (4 workflows). Migrar para credencial **Query Auth** reutilizável.
- [ ] **`onError: continueRegularOutput` nos nós de ferramenta** — Qdrant e Ahrefs nos 5 especialistas, para uma ferramenta falhar sem derrubar o parecer inteiro. (Os nós HTTP do SEO Técnico já têm; falta o Qdrant e os demais especialistas.)
- [ ] **Sanitizer de tool-call no hub** — adicionar limpeza em `Formatar Conversa` para evitar vazamento de sintaxe `<invoke ...>` na resposta final.

### Prioridade MÉDIA — robustez

- [ ] **Estratégia anti-loop** — `maxIterations` 6 → 10 + instrução anti-repetição no system prompt dos especialistas.
- [ ] **Ingestão idempotente** — trocar `insert` por `upsert` no Qdrant, adicionar trigger de `fileUpdated` e revisar o nome do modelo de embedding.
- [ ] **Trilha de Conhecimento** — adicionar IF para o campo `skip` e `onError` no nó `Destilar Trilha`.

### Prioridade BAIXA — monitoramento

- [ ] **OpenRouter** — monitorar saldo de créditos (já respondeu OK no teste de 19/06, mas requests de 4096 tokens já causaram `402` no passado).
- [ ] **Popular o repertório** — a collection tem poucos documentos por especialidade; ampliar a base via Ingestão melhora a relevância do RAG.

---

## 4. 🧹 Limpeza pendente

- [ ] Arquivar workflows de teste descartáveis: `TtXFycftNEFdpOjg` e `e53Cl2jiLMREnMlT` (criados para validar o índice Qdrant).

---

## 5. Backlog / evolução futura

- Especialistas acionados de fato em perguntas com URL (validar Análise Completa multi-especialista end-to-end).
- Métricas de qualidade: dashboard a partir de `seo_quality_log` (evolução do score do Meta-Agente ao longo do tempo).
- Avaliar reranking no RAG (nó já suporta `useReranker`).
- Cobertura de testes automatizados para regressão dos fluxos críticos.

---

## Histórico de diagnósticos resolvidos

| Data | Problema | Status |
|---|---|---|
| 2026-06-18 | Meta-Agente lia chave inexistente (`sistema`) | ✅ Resolvido |
| 2026-06-18 | Loop morto gravando em `meta_ajuste` | ✅ Resolvido |
| 2026-06-19 | Qdrant 400 em todo filtro por especialidade | ✅ Resolvido |
| — | PSI key hardcoded em 5 nós | ⏳ Pendente |
| — | Tool-call leak (`<invoke>`) na resposta | ⏳ Pendente |
| — | `onError` ausente em nós de ferramenta | ⏳ Parcial |
