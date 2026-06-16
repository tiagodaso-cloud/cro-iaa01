# Fase 4 — RAG por expertise + Trilha de Conhecimento (NotebookLM)

Materializa o **círculo virtuoso**: o humano alimenta a solução (arquivos no RAG + feedback 👍/👎); a IA refina e escreve de volta uma base de conhecimento que treina o humano.

```
   HUMANO                                                          IA
   ──────                                                          ──
 1. sobe materiais de referência ──▶ 5 pastas de RAG no Drive
    (uma por expertise)                       │
                                              ▼
                              [Ingestão] Drive → PGVector (seo_repertorio)
                                   chunks tagueados com `expertise`
                                              │
 2. usa o chat / análises ◀───────────────────┤ recuperação cita a expertise
    e dá feedback 👍/👎 ──▶ seo_feedback        │ da fonte (Fase 3 + Fase 4)
                                              ▼
                        [Trilha de Conhecimento] (agendada)
                        feedback + lições → LLM destila 1 nota por expertise
                                              │
                                              ▼
                              5 pastas de Trilha no Drive (Google Docs)
                                              │
 4. estuda a trilha ◀── NotebookLM (1 notebook por expertise, fonte = pasta)
    e melhora a curadoria ─────────────────────────────────────┐
                                                                │
 3. ... volta ao passo 1 (sobe material melhor) ◀───────────────┘
```

## As 5 expertises

| Expertise | Escopo |
|-----------|--------|
| **SEO Técnico** | Indexação, crawl budget, arquitetura, Core Web Vitals, dados estruturados, status codes, sitemaps/robots. |
| **Estratégia** | Priorização e roadmap, análise competitiva, posicionamento, KPIs, business case. |
| **Conteúdo & Link Building** | Produção editorial, clusters de tópicos/keywords, E-E-A-T, autoridade, link building, digital PR. |
| **Retail Search** | SEO para e-commerce/marketplaces, categorias e PDP, busca interna, feeds, retail media. |
| **GEO** | Visibilidade em engines generativas, citações, query fan-out, prompts, agentic browsing, llms.txt. |

## Estrutura de pastas no Google Drive

Crie **dois** conjuntos de 5 pastas (10 no total) — mantenha-os separados para a IA não reingerir o próprio texto:

```
📁 Repertório SEO (RAG — fontes humanas)        📁 Trilhas de Conhecimento (saída da IA)
   ├─ SEO Técnico                                  ├─ SEO Técnico
   ├─ Estratégia                                   ├─ Estratégia
   ├─ Conteúdo & Link Building                     ├─ Conteúdo & Link Building
   ├─ Retail Search                                ├─ Retail Search
   └─ GEO                                          └─ GEO
```

## Passos de ativação

1. **Ingestão** (`SEO_Orchestrator_V4_Ingestao_Repertorio.json`): importe e, em cada um dos 5 gatilhos `Drive: <expertise>`, selecione a pasta de **RAG** correspondente. Vincule as credenciais Google Drive + OpenAI (embeddings). Os chunks entram em `seo_repertorio` com o metadado `expertise`.
2. **Trilha** (`SEO_Orchestrator_V4_Trilha_Conhecimento.json`): importe e, no nó **Preparar Trilhas**, preencha o objeto `PASTAS` com os IDs das 5 pastas de **Trilha**. Vincule Google Docs + OpenRouter. Cadência: o `Agendar Trilha` roda semanal (altere `field`/`triggerAtHour` para diário se quiser mais frequência).
3. **NotebookLM**: crie **5 notebooks** (um por expertise) e adicione como fonte a pasta de **Trilha** correspondente. O NotebookLM sincroniza do Drive — a cada ciclo, um novo Google Doc datado entra na trilha daquela expertise.
4. **Orquestrador V4**: já recuperação ciente de expertise (cada trecho recuperado traz sua expertise; a análise e o chat atribuem recomendações por área).

## Por que a ponte é via Drive

O NotebookLM (consumer) não expõe API pública — só aceita Google Drive como fonte. Por isso o Drive é a **fonte única**: a IA escreve Google Docs nas pastas de Trilha, e o NotebookLM os puxa por sync. Se um dia houver NotebookLM Enterprise (Agentspace/Vertex), a injeção pode ser automatizada via API sem mudar o restante do fluxo.
