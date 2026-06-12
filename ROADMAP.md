# Roadmap — SEO Orchestrator

> Atualizado em 2026-06-12: antigas Fases 2 e 4 trocadas e renumeração
> crescente; Fase 5 (conversão em SMA) e Fase 6 (meta agente) no plano.

| Fase | Nome | Escopo | Status | Artefatos |
|------|------|--------|--------|-----------|
| 1 | Base agêntica conversacional | Chat assíncrono (HTML + polling) com Agente Orquestrador e 4 ferramentas (Fan-out, GEO, On-Page, CWV) + pipeline de análise completa multi-fonte | ✅ Entregue | `SEO_Orchestrator_V2_Fase1.json` |
| 2 | Agentic Browsing Auditor *(antiga Fase 4)* | Auditor com modo `sync` e plugado como 5ª ferramenta do Orquestrador (prontidão da página para agentes de IA) | ✅ Entregue | `Agentic_Browsing_Auditor.json` + tool nos V3/V4 |
| 3 | Loop de feedback | 👍/👎 → `seo_feedback` → destilação diária de lições → diretrizes injetadas nos prompts; o sistema melhora com o uso | ✅ Em produção (V3) | `SEO_Orchestrator_V3.json` |
| 4 | GA4/GSC + RAG *(antiga Fase 2)* | Dados reais do cliente (GA4 e Search Console) como ferramentas + repertório interno via RAG (Drive → PGVector) | 🔜 Aguardando deploy | `SEO_Orchestrator_V4.json`, `SEO_Orchestrator_V4_Ingestao_Repertorio.json` |
| 5 | Conversão em SMA | Delegação real entre agentes (agent-as-tool): análise completa acionada por decisão do Orquestrador (sem IF fixo) e especialistas cooperantes | 📋 Planejada | — |
| 6 | Meta agente | Agente supervisor do próprio sistema: monitora execuções, qualidade e feedbacks, e ajusta prompts/lições/ferramentas de forma autônoma | 📋 Planejada | — |

## Mapa workflows × fases

- **SEO Orchestrator V3** (produção): Fases 1 + 2 + 3
- **SEO Orchestrator V4** (próximo deploy): Fases 1 + 2 + 3 + 4
- **Agentic Browsing Auditor**: workflow independente, consumido pela Fase 2
  via webhook (`POST /webhook/agentic-browsing` com `mode=sync`); a interface
  própria dele (async + poll) continua funcionando normalmente.
- **Fases 5 e 6**: evoluções arquiteturais sobre o V4 — sem workflow novo
  até o desenho detalhado.
