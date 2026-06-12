# Roadmap — SEO Orchestrator

> Atualizado em 2026-06-12: as antigas Fases 2 e 4 trocaram de ordem e a
> numeração foi refeita em ordem crescente de execução.

| Fase | Escopo | Status | Artefatos |
|------|--------|--------|-----------|
| 1 | Base SMA conversacional: chat assíncrono (POST + polling), Agente Orquestrador com 4 ferramentas (Query Fan-out, GEO Mapping, On-Page Audit, Core Web Vitals) e pipeline de análise completa multi-fonte | ✅ Entregue | `SEO_Orchestrator_V2_Fase1.json` |
| 2 | Integração do **Agentic Browsing Auditor** como 5ª ferramenta do orquestrador: modo síncrono no auditor (`mode=sync`) + ferramenta "Auditar Agentic Browsing" no agente — *antiga Fase 4* | ✅ Entregue | `Agentic_Browsing_Auditor.json` + V3/V4 |
| 3 | Loop de feedback: 👍/👎 no chat → `seo_feedback` → destilação diária de lições via LLM → `seo_lessons` → injeção das diretrizes nos prompts dos agentes | ✅ Entregue (em produção no "SEO Orchestrator V3") | `SEO_Orchestrator_V3.json` |
| 4 | GA4/GSC como ferramentas do agente + RAG do repertório interno de SEO (Google Drive → PGVector) — *antiga Fase 2* | 🔜 Construída, aguardando deploy | `SEO_Orchestrator_V4.json`, `SEO_Orchestrator_V4_Ingestao_Repertorio.json` |

## Mapa workflows × fases

- **SEO Orchestrator V3** (produção): Fases 1 + 2 + 3
- **SEO Orchestrator V4** (próximo deploy): Fases 1 + 2 + 3 + 4
- **Agentic Browsing Auditor**: workflow independente, consumido pela Fase 2
  via webhook (`POST /webhook/agentic-browsing` com `mode=sync`); a interface
  própria dele (async + poll) continua funcionando normalmente.
