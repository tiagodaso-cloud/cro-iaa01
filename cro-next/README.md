# CRO Next — Fábrica Multi-Agente (SMA)

**Pilar 01 do planejamento estratégico "CRO Next"** — deixar de vender horas de
especialista para operar *pipelines de receita incremental*, com produção
automatizada por IA multi-agente e julgamento consultivo humano no gate.

> **Máquina** (coleta, analisa, monitora, documenta e estima 24/7)
> **+ Consultor** (julga, prioriza, conversa e decide a aposta)
> **+ Cliente** (compra fluxo de oportunidades com ROI auditável)

Este diretório contém o código-fonte (n8n Workflow SDK) dos dois workflows que
compõem o pilar, mais a página do gate humano.

---

## Arquitetura (multi-tenant: 1 workflow, N clientes)

Onboarding de um novo cliente = **1 linha na Data Table `cro_clientes`**. Nunca
um workflow novo.

```
┌─ W1: Fábrica Multi-Agente ────────────────────────────────────────────────┐
│                                                                            │
│  Gatilhos:                                                                 │
│   • Quinzenal (seg 07:00)  → modo "completo"  (fábrica inteira)            │
│   • Semanal   (qui 07:30)  → modo "sentinela" (só proteção de receita)     │
│   • Manual                 → teste                                         │
│                                                                            │
│  Carrega clientes ativos → loop (batch=1) por cliente:                     │
│                                                                            │
│  FONTES (determinístico, sem LLM):                                         │
│   GA4 (totais, funil, canais/devices) · Clarity · Jira (backlog) · Dossiê  │
│        │                                                                   │
│        ▼                                                                   │
│  Agente de Ingestão (Normalizar) → KPIs, taxas de funil, deltas,           │
│        │                            detecção de anomalias (always-on)      │
│        ▼                                                                   │
│  ┌ Tem anomalia? ─ sim →  Registrar em cro_alertas + e-mail ao analista    │
│  │                        (proteção de receita — antes do cliente ver)     │
│  └ Modo completo? ─ sim → SMA de análise:                                  │
│        Heurístico/UX (Nielsen · Baymard · WCAG)                            │
│         → Diagnóstico de Funil (gargalos + uplift + R$/mês)                │
│         → Priorização ICE (hipóteses qualificadas)                         │
│         → Síntese (dashboard narrativo + pauta de reunião)                 │
│         → Autocrítica (LLM revisor, score 0–10; gate exige ≥ 7)            │
│        │                                                                   │
│        ▼                                                                   │
│  Salva ciclo em cro_ciclos (status: aguardando_gate | requer_revisao)      │
│  + e-mail convocando o analista para o Gate Humano                         │
└────────────────────────────────────────────────────────────────────────────┘
                                   │  (nada chega ao cliente sem aprovação)
                                   ▼
┌─ W2: Gate Humano & Entregas ──────────────────────────────────────────────┐
│  Página web (gate) lista ciclos aguardando decisão. O analista aprova,     │
│  edita ou descarta cada hipótese. Ao aprovar:                              │
│   • cria issues no Jira do cliente (hipóteses aprovadas)                    │
│   • grava memória em cro_memoria (aprendizado entre ciclos)                │
│   • entrega a síntese ao cliente                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

**Anti-comoditização:** todo achado/gargalo/hipótese precisa citar evidência
quantitativa REAL do cliente. O agente de Autocrítica roda antes do gate humano
para barrar conteúdo genérico ou números inventados.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `w1-fabrica-multi-agente.sdk.js` | Código-fonte n8n Workflow SDK do W1 (fábrica completa). Fonte da verdade. |
| `w2-gate-humano.html` | Página do gate humano (dark UI, Cadastra/orange). Servida pelo webhook `GET /cro-next-gate` do W2. |
| `README.md` | Este arquivo. |

> O W1 é criado no n8n via `create_workflow_from_code` (MCP). O SDK compila para
> o JSON do n8n no servidor. Este `.js` é a fonte reproduzível — reexecutar o
> create a partir dele recria o workflow.

---

## Data Tables (n8n) — já criadas no projeto

| Tabela | Uso | Colunas-chave |
|---|---|---|
| `cro_clientes` | Cadastro/dossiê dos clientes (onboarding) | `cliente, ativo, site_url, contexto_negocio, vertical, tier, ga4_property_id, clarity_api_token, jira_base_url, jira_project_key, jira_issue_type, email_analista, valor_por_conversao, moeda` |
| `cro_ciclos` | 1 linha por ciclo gerado | `ciclo_id, cliente, status, score_autocritica, sintese_md, dados_json, notas_gate, decidido_por, criado_em, decidido_em` |
| `cro_alertas` | Anomalias detectadas pela sentinela | `cliente, tipo, severidade, metrica, variacao_pct, mensagem, ciclo_id, criado_em` |
| `cro_memoria` | Aprendizado entre ciclos (hipóteses e resultados) | `cliente, ciclo_id, hipotese_id, titulo, hipotese_json, status_implementacao, jira_issue_key, resultado, ...` |

### Onboarding de um cliente
Inserir uma linha em `cro_clientes` com `ativo = true` e preencher, no mínimo:
`cliente`, `ga4_property_id`, `email_analista`, `valor_por_conversao` (fallback
quando não há receita no GA4), e — se usar as entregas — `jira_base_url` /
`jira_project_key`. `clarity_api_token` é opcional (a coleta é tolerante a falha).

---

## Credenciais

| Serviço | Credencial n8n | Status |
|---|---|---|
| OpenRouter (LLMs dos agentes) | `OpenRouter account 51` (`4MTPOCzYj4oYOSjA`) | ✅ existente |
| Gmail (e-mails de alerta/gate) | `SEO-N8N` (`H4YY5Bldwy95Y3qW`) | ✅ existente |
| Jira Cloud (backlog + issues) | `JIRA-GABRIELY` (`Ut4FQk61Gd0d81j4`) | ✅ existente |
| Google Analytics GA4 (OAuth2) | `Google Analytics - CRO Next` | ⚠️ **criar e autorizar** no n8n |

Modelo dos agentes: `anthropic/claude-sonnet-4.6` via OpenRouter.

---

## Status da entrega

- [x] Data Tables criadas (`cro_clientes`, `cro_ciclos`, `cro_alertas`, `cro_memoria`)
- [x] W1 desenhado e validado (SDK) — fonte neste diretório
- [ ] W1 publicado no n8n *(bloqueado por instabilidade do MCP n8n — retomar quando a conexão estabilizar)*
- [ ] W2 (Gate Humano & Entregas) — página pronta (`w2-gate-humano.html`); SDK do webflow a finalizar
- [ ] Credencial GA4 OAuth criada/autorizada

**Nota técnica:** o servidor MCP do n8n vem oscilando (connect/disconnect a cada
1–2 min) e derrubando chamadas grandes no meio do stream. A criação do W1 usa a
estratégia *skeleton + injeção de código em blocos* (`update_workflow`) para
caber sob o limite do WAF do proxy, que rejeita (403) payloads grandes e densos.
