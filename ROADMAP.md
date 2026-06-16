# Roadmap — SEO Orchestrator

> Atualizado em 2026-06-12: RAG destacado como fase própria (Fase 4); GA4/GSC
> vai para o fim ampliada com conexões Ahrefs, Google Trends e Screaming Frog
> (via MCP ou API). Numeração sempre crescente na ordem de execução.

| Fase | Nome | Escopo | Status | Artefatos |
|------|------|--------|--------|-----------|
| 1 | Base agêntica conversacional | Chat assíncrono (HTML + polling) com Agente Orquestrador e 4 ferramentas (Fan-out, GEO, On-Page, CWV) + pipeline de análise completa multi-fonte | ✅ Entregue | `SEO_Orchestrator_V2_Fase1.json` |
| 2 | Agentic Browsing Auditor | Auditor com modo `sync` e plugado como 5ª ferramenta do Orquestrador (prontidão da página para agentes de IA) | ✅ Entregue | `Agentic_Browsing_Auditor.json` + tool nos V3/V4 |
| 3 | Loop de feedback | 👍/👎 → `seo_feedback` → destilação diária de lições → diretrizes injetadas nos prompts; o sistema melhora com o uso | ✅ Em produção (V3) | `SEO_Orchestrator_V3.json` |
| 4 | RAG por expertise + Trilha de Conhecimento | RAG estruturado em 5 expertises (SEO Técnico, Estratégia, Conteúdo & Link Building, Retail Search, GEO) via 5 pastas no Drive → Qdrant tagueado; recuperação ciente de expertise no chat e na análise; **círculo virtuoso** — workflow agendado destila feedback+lições em notas por expertise e escreve Google Docs em pastas de Trilha que alimentam 5 notebooks no NotebookLM | 🔨 Em construção | `SEO_Orchestrator_V4_Ingestao_Repertorio.json`, `SEO_Orchestrator_V4_Trilha_Conhecimento.json`, `PHASE4_SETUP.md`, parte do `SEO_Orchestrator_V4.json` |
| 5 | Conversão em SMA | Delegação real entre agentes (agent-as-tool): análise completa acionada por decisão do Orquestrador (sem IF fixo) e especialistas cooperantes | 📋 Planejada | — |
| 6 | Meta agente | Agente supervisor do próprio sistema: monitora execuções, qualidade e feedbacks, e ajusta prompts/lições/ferramentas de forma autônoma | 📋 Planejada | — |
| 7 | Conexões de dados externos | GA4 e Search Console como ferramentas do agente (tráfego, queries e páginas reais do cliente) + conexões Ahrefs, Google Trends e Screaming Frog via MCP ou API (backlinks, volume/tendências de busca e crawl técnico) | 📋 Planejada (GA4/GSC já prototipado) | parte do `SEO_Orchestrator_V4.json` |

## Mapa workflows × fases

- **SEO Orchestrator V3** (produção): Fases 1 + 2 + 3
- **SEO Orchestrator V4** (protótipo, sem deploy previsto): Fases 1 + 2 + 3
  + 4 + GA4/GSC da Fase 7 — será desmembrado/retomado quando as Fases 4 e 7
  entrarem na fila, possivelmente reconstruído sobre o resultado das
  Fases 5 e 6.
- **Agentic Browsing Auditor**: workflow independente, consumido pela Fase 2
  via webhook (`POST /webhook/agentic-browsing` com `mode=sync`); a interface
  própria dele (async + poll) continua funcionando normalmente.
- **Fases 5 e 6**: evoluções arquiteturais sobre o V3 em produção — sem
  workflow novo até o desenho detalhado.
