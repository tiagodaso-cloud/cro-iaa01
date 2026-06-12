# Roadmap — SEO Orchestrator

> Atualizado em 2026-06-12: as antigas Fases 2 e 4 trocaram de ordem e a
> numeração foi refeita em ordem crescente de execução. Fase 5 (conversão em
> SMA) adicionada.

| Fase | Nome | Escopo e componentes | Status | Artefatos |
|------|------|----------------------|--------|-----------|
| 1 | Base agêntica conversacional | Interface de chat servida pelo próprio n8n (HTML + polling assíncrono via `seo_jobs`); roteamento por intenção (extrator estruturado + heurística de fallback); Agente Orquestrador com 4 ferramentas (Query Fan-out 3 LLMs, GEO Mapping, On-Page Audit, Core Web Vitals via PSI + CorePulse sync); pipeline determinístico de análise completa multi-fonte (URL + tema) com agente de análise e saída estruturada; registro de interações em `seo_conversations` | ✅ Entregue | `SEO_Orchestrator_V2_Fase1.json`, `v2-build/` |
| 2 | Integração Agentic Browsing Auditor *(antiga Fase 4)* | Modo síncrono (`mode=sync`) no webhook do auditor, no padrão CorePulse: ack imediato no fluxo async (UI própria preservada) e resposta completa na chamada sync; nova ferramenta "Auditar Agentic Browsing" no Agente Orquestrador (bloqueio de bots, llms.txt, clareza estrutural/acionável, score e recomendações); chip e system message atualizados | ✅ Entregue | `Agentic_Browsing_Auditor.json` + tool nos V3/V4 |
| 3 | Loop de feedback e aprendizado | Botões 👍/👎 por resposta no chat → tabela `seo_feedback` (com mensagem, resposta, URL e tópico); destilação diária agendada via LLM ("Destilar Lições") → diretrizes consolidadas em `seo_lessons`; injeção automática das lições nos prompts do Orquestrador e do Agente de Análise — o sistema melhora com o uso, sem edição manual de prompt | ✅ Entregue (em produção no "SEO Orchestrator V3") | `SEO_Orchestrator_V3.json`, `v4-build/` |
| 4 | Dados proprietários: GA4/GSC + RAG *(antiga Fase 2)* | GA4 e Search Console como ferramentas do agente (tráfego, queries e páginas reais do cliente); RAG do repertório interno de SEO: ingestão Google Drive → PGVector (workflow dedicado), consulta vetorial no chat e injeção do repertório no contexto da análise completa | 🔜 Construída, aguardando deploy | `SEO_Orchestrator_V4.json`, `SEO_Orchestrator_V4_Ingestao_Repertorio.json`, `v3-build/` |
| 5 | Conversão em SMA (sistema multiagente) | Delegação real entre agentes (padrão agent-as-tool): expor o pipeline/Agente de Análise como ferramenta do Orquestrador, permitindo que ele decida escalar para análise completa no meio da conversa (hoje esse despacho é um IF determinístico); decompor a análise em especialistas cooperantes (performance/CWV, GEO/visibilidade, conteúdo) coordenados pelo Orquestrador; comunicação inter-agentes complementando a coordenação indireta já existente via `seo_lessons` (blackboard). Critério de aceite: o Orquestrador aciona a análise completa por decisão própria, sem roteamento fixo | 📋 Planejada | — |

## Mapa workflows × fases

- **SEO Orchestrator V3** (produção): Fases 1 + 2 + 3
- **SEO Orchestrator V4** (próximo deploy): Fases 1 + 2 + 3 + 4
- **Agentic Browsing Auditor**: workflow independente, consumido pela Fase 2
  via webhook (`POST /webhook/agentic-browsing` com `mode=sync`); a interface
  própria dele (async + poll) continua funcionando normalmente.
- **Fase 5**: evolução arquitetural sobre o V4 — sem workflow novo previsto
  até o desenho detalhado.
