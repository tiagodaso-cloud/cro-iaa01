# CXO Next — Fábrica Multi-Agente (SMA) · v2

**Tese central:** deixar de vender horas de especialista para **operar pipelines de receita incremental** — produção automatizada por IA multi-agente + julgamento consultivo humano.

> **Máquina** (coleta, analisa, monitora, documenta e estima 24/7)
> **+ Consultor** (julga, prioriza, conversa e decide a aposta no gate)
> **+ Cliente** (compra fluxo de oportunidades com ROI auditável)

Sistema de agentes em **n8n** (GA4, Clarity, Jira, Workspace) que automatiza ingestão, análise heurística, diagnóstico de funil, priorização e síntese — **multi-tenant, com gate humano**, agora com **RAG** (metodologia PSM da Livelo + documentos internos + referências externas), **trilha de conhecimento** e **loop de feedback**.

## Arquivos para importar

| Arquivo | Workflow | Nós |
|---|---|---|
| **`cxo-next-fabrica.json`** | W1 — Fábrica Multi-Agente (SMA) | 47 |
| **`cxo-next-gate.json`** | W2 — Gate Humano & Entregas | 20 |
| **`cxo-next-conhecimento.json`** | W3 — Conhecimento & Feedback (RAG) | 22 |

Referência: `w2-gate-humano.html` (página do gate, já embutida no W2). Os arquivos `cro-next-*.json` são o **protótipo 01** (mantidos para histórico).

---

## O SMA — papéis dos agentes

```
                       ┌─────────────────────────────────────────────┐
 GA4 · Clarity · Jira  │              W1 — FÁBRICA (SMA)             │
 Workspace (docs)      │                                             │
        │              │ 1. Agente de Ingestão (determinístico)      │
        ▼              │    KPIs, funil, deltas, anomalias always-on │
   [coleta 24/7] ────▶ │ 2. Agente Bibliotecário (RAG)               │
                       │    PSM Livelo + referências + aprendizados  │
 cxo_conhecimento ───▶ │    → seleciona chunks → TRILHA DE           │
 (23 chunks seed +     │      CONHECIMENTO registrada no ciclo       │
  docs + aprendizados) │ 3. Agente de Memória (loop de feedback)     │
 cro_memoria ────────▶ │    o que já foi aprovado/testado/aprendido  │
                       │ 4. Agente Heurístico/UX (Nielsen·Baymard·   │
                       │    WCAG·PSM) — problemas com evidência      │
                       │ 5. Agente Diagnóstico de Funil              │
                       │    calculadora de potencial PSM (funil→R$)  │
                       │ 6. Agente de Priorização (ICE + score PSM,  │
                       │    KPIs negativas, hipótese Sabendo/Fazendo/│
                       │    Esperamos, significância 95%)            │
                       │ 7. Agente de Síntese (material de reunião)  │
                       │ 8. Agente Autocrítica (revisor, score ≥ 7)  │
                       └──────────────────┬──────────────────────────┘
                                          ▼
                       ┌─────────────────────────────────────────────┐
                       │       W2 — GATE HUMANO & ENTREGAS           │
                       │ Painel web: ciclos, números, hipóteses,     │
                       │ trilha de conhecimento. Analista aprova/    │
                       │ rejeita → Jira (plano de teste PSM) +       │
                       │ cro_memoria + aprendizado do gate           │
                       └──────────────────┬──────────────────────────┘
                                          ▼  implementação + teste A/B
                       ┌─────────────────────────────────────────────┐
                       │     W3 — CONHECIMENTO & FEEDBACK (RAG)      │
                       │ Seed Livelo PSM · ingestão de documentos ·  │
                       │ formulário/API de resultado de teste →      │
                       │ cro_memoria + cxo_conhecimento              │
                       └──────────────────┬──────────────────────────┘
                                          │
                 o próximo ciclo da fábrica JÁ considera o resultado
                 (loop fechado: decisão → teste → resultado → memória
                  → conhecimento → próxima análise)
```

**Trilha de conhecimento:** cada ciclo registra em `dados_json.trilha_conhecimento` quais chunks [C1..Cn] os agentes usaram (PSM, referências, aprendizados) — visível no painel do gate. Auditável de ponta a ponta.

**Anti-comoditização:** todo achado/gargalo/hipótese cita evidência quantitativa real; a Autocrítica barra número inventado, aritmética inconsistente, falta de guardrails e conteúdo genérico.

---

## Passo a passo de implementação

### 1) Credenciais (n8n → Credentials)
| Credencial | Tipo | Status |
|---|---|---|
| OpenRouter account 51 | OpenRouter API | ✅ existe |
| SEO-N8N | Gmail OAuth2 | ✅ existe |
| JIRA-GABRIELY | Jira Software Cloud API | ✅ existe |
| **Google Analytics - CRO Next** | Google Analytics OAuth2 | ⚠️ **criar + autorizar** (o nome segue "CRO Next" de propósito — se você já a criou para o protótipo 01, a v2 a reaproveita) |

### 2) Data Tables (projeto SEO)
Já criadas: `cro_clientes`, `cro_ciclos`, `cro_alertas`, `cro_memoria` e **`cxo_conhecimento`** (nova — **já semeada com os 23 chunks** da metodologia PSM Livelo + referências Baymard/NN-g/WCAG/GA4/Clarity).

> As tabelas do protótipo mantêm o prefixo `cro_` de propósito (continuidade dos dados). A nova base de conhecimento usa `cxo_`.

### 3) Importar os 3 workflows
n8n → **Workflows → Import from File**, nesta ordem, todos no projeto **SEO**:
1. `cxo-next-conhecimento.json` (W3) → **ativar** (webhooks de conhecimento/feedback).
2. `cxo-next-gate.json` (W2) → **ativar** (webhooks do gate).
3. `cxo-next-fabrica.json` (W1) → abrir os 3 nós **GA4 – …** e selecionar a credencial do GA4 → ativar quando quiser as cadências.

O workflow antigo incompleto de 11 nós já foi **arquivado** automaticamente. Os workflows do protótipo 01 (se importados) podem ser desativados — a v2 os substitui.

### 4) Seed do conhecimento (já feito, mas idempotente)
A tabela `cxo_conhecimento` **já está semeada**. Se um dia precisar recarregar (ou em outra instância): W3 → gatilho **"Seed Livelo PSM (rodar 1x)"** → Execute. É idempotente (não duplica títulos existentes).

### 5) Onboarding de cliente = 1 linha
Em `cro_clientes`: `ativo=true`, `cliente`, `ga4_property_id`, `email_analista`, `valor_por_conversao`, `jira_base_url`, `jira_project_key` (+ opcionais `clarity_api_token`, `contexto_negocio`, `vertical`, `tier`).

### 6) Testar o ciclo completo
1. **W1** → "Execução Manual (Teste)" → gera ciclo com trilha de conhecimento e e-mail convocando o gate.
2. Abrir `https://n8n-prod.cadastra.com/webhook/cxo-next-gate` → revisar (KPIs, gargalos, hipóteses PSM com guardrails, trilha) → **Aprovar** → cards no Jira (formato plano de teste PSM) + memória + aprendizado do gate.
3. Após rodar o teste A/B real: `https://n8n-prod.cadastra.com/webhook/cxo-next-feedback` → registrar resultado (positivo/negativo/inconclusivo, uplift, p-valor) → memória e conhecimento atualizados → **o próximo ciclo já usa isso**.

### 7) Produção
Ativar W1: quinzenal (seg 07:00, fábrica completa) + semanal (qui 07:30, sentinela de receita). W2 e W3 ficam sempre ativos (webhooks).

---

## Endpoints (W2/W3 ativos)
| Endpoint | Função |
|---|---|
| `GET /webhook/cxo-next-gate` | Painel do gate humano |
| `POST /webhook/cxo-next-gate/decisao` | Decisão do gate (usado pela página) |
| `GET /webhook/cxo-next-feedback` | Formulário de resultado de teste |
| `POST /webhook/cxo-next-feedback` | API de resultado `{jira_issue_key\|hipotese_id, resultado, uplift_real_pct, p_valor, receita_incremental_reais, notas}` |
| `POST /webhook/cxo-next-conhecimento` | Ingestão de documento `{titulo, conteudo, origem?, tags?, etapa_funil?, vertical?, fonte?}` — texto longo é fatiado em chunks automaticamente |

**Ingestão de documentos do Workspace:** exporte o conteúdo (Docs/Drive) e envie via `POST /cxo-next-conhecimento` (ou cole na Data Table). Automatizar a leitura direta do Drive é evolução natural — o nó Google Drive do n8n encaixa antes do "Fatiar Documento".

## Metodologia PSM (Livelo) embarcada
Do repositório PSM anexado, a fábrica herda e aplica: fórmula de hipótese (**Sabendo que / Fazendo / Esperamos entender se**), nomenclatura de experimento ([ação+elemento+página+canal]), **KPI principal + secundárias + NEGATIVAS (guardrails)**, duplo score (ICE + PSM: esforço/veracidade/implementação/impacto/alinhamento, máx 60), **calculadora de potencial** (funil etapa a etapa → R$/mês com cálculo aberto), **calculadora de relevância** (significância 95%, p-valor < 0,05), plano de testes com QA de tagueamento e segmentação, status padronizados e registro de insights mesmo em testes negativos.

## Esquema da `cxo_conhecimento`
`origem` (livelo_psm | documento_interno | referencia_externa | aprendizado_ciclo | resultado_teste) · `titulo` · `conteudo` · `tags` (csv) · `etapa_funil` · `vertical` · `fonte` · `ativo` (bool) · `criado_em`
