# CRO Next — Fábrica Multi-Agente + Gate Humano (n8n)

**Pilar 01 do planejamento "CRO Next"** — sair de horas de especialista para *pipelines de receita incremental*: a **máquina** coleta, analisa, monitora, estima e documenta 24/7; o **consultor** julga, prioriza e decide a aposta num gate humano; o **cliente** compra fluxo de oportunidades com ROI auditável.

Este diretório traz **2 workflows n8n prontos para importar** + a página do gate.

| Arquivo | O que é | Como usar |
|---|---|---|
| **`cro-next-fabrica.json`** | **W1 — Fábrica Multi-Agente** (40 nós) | Importar no n8n |
| **`cro-next-gate.json`** | **W2 — Gate Humano & Entregas** (18 nós) | Importar no n8n |
| `w2-gate-humano.html` | Página do gate (já embutida no W2; aqui para edição) | referência |
| `w1-fabrica-multi-agente.sdk.js` | Fonte SDK do W1 (legível) | referência |

---

## Passo a passo de implementação

### 0) Pré-requisitos (uma vez)
As **Data Tables** já foram criadas no projeto **SEO** do n8n: `cro_clientes`, `cro_ciclos`, `cro_alertas`, `cro_memoria`. Se algum dia precisar recriá-las, os esquemas estão no fim deste README.

### 1) Credenciais
No n8n (**Credentials**), confirme que existem — todas já presentes no ambiente, exceto a do GA4:

| Credencial | Tipo | Status |
|---|---|---|
| OpenRouter account 51 | OpenRouter API | ✅ existe |
| SEO-N8N | Gmail OAuth2 | ✅ existe |
| JIRA-GABRIELY | Jira Software Cloud API | ✅ existe |
| **Google Analytics - CRO Next** | **Google Analytics OAuth2** | ⚠️ **criar + autorizar** (login Google com acesso ao GA4) |

> Os 3 nós **GA4** do W1 vêm com a credencial marcada como `__CRIAR__`. Depois de importar, abra cada nó GA4 e **selecione a credencial "Google Analytics - CRO Next"** (crie-a se ainda não existir).

### 2) Importar o W1 (Fábrica)
1. n8n → **Workflows → Import from File** → selecione **`cro-next-fabrica.json`**.
2. Confirme que ele caiu no projeto **SEO** (onde estão as Data Tables). Se caiu em outro projeto, mova-o (⋯ → Move).
3. Abra os 3 nós **GA4 – …** e selecione a credencial do GA4 (passo 1).
4. Os nós de Data Table (`Carregar Clientes Ativos`, `Registrar Alerta`, `Salvar Ciclo`) referenciam as tabelas por **nome** — confirme que resolvem (devem achar `cro_clientes`/`cro_alertas`/`cro_ciclos`).

> ⚠️ Já existe no n8n um workflow **incompleto** "CRO Next — Fábrica Multi-Agente (SMA)" com só 11 nós (`/workflow/XOuTqncVyu5iWtfM`), criado durante os testes. **Apague-o** para não confundir com o importado (40 nós).

### 3) Importar o W2 (Gate)
1. **Import from File** → **`cro-next-gate.json`** (mesmo projeto SEO).
2. Anote as URLs dos 2 webhooks (nó **GET – Gate** e **POST – Decisão**):
   - Gate: `https://n8n-prod.cadastra.com/webhook/cro-next-gate`
   - Decisão: `.../webhook/cro-next-gate/decisao` (chamada pela própria página)
3. **Ative** o W2 (toggle *Active*) para os webhooks funcionarem em produção.

> O botão de e-mail do W1 e o link do gate apontam para `https://n8n-prod.cadastra.com/webhook/cro-next-gate`. Se a URL da sua instância for outra, ajuste o `gateUrl` no nó **Montar Email do Gate** (W1).

### 4) Onboarding de um cliente = 1 linha
Em **Data Tables → `cro_clientes`**, adicione uma linha com `ativo = true` e preencha ao menos:

`cliente`, `ga4_property_id`, `email_analista`, `valor_por_conversao` (fallback quando não há receita no GA4), `jira_base_url`, `jira_project_key`. Opcionais: `clarity_api_token`, `contexto_negocio`, `vertical`, `tier` (`essential|growth|enterprise`), `moeda`.

Nunca crie um workflow novo por cliente — a fábrica é **multi-tenant**: 1 workflow, N linhas.

### 5) Testar
1. No W1, use o gatilho **Execução Manual (Teste)** → *Execute workflow*. Ele percorre 1 cliente ativo, coleta dados, roda os 5 agentes e grava um ciclo em `cro_ciclos` com status `aguardando_gate` (ou `requer_revisao` se a autocrítica < 7), e envia o e-mail convocando o gate.
2. Abra `https://n8n-prod.cadastra.com/webhook/cro-next-gate` → o painel lista o ciclo. Revise, marque as hipóteses e clique **Aprovar & Entregar** → o W2 cria os cards no Jira, grava `cro_memoria`, atualiza o ciclo e envia o e-mail.

### 6) Produção (deixar no ar)
Ative o W1. As cadências disparam sozinhas:
- **Quinzenal (seg 07:00)** → modo `completo` (fábrica inteira, todos os clientes ativos).
- **Semanal (qui 07:30)** → modo `sentinela` (só coleta + detecção de anomalias → alerta de receita; não roda os agentes de análise).

---

## Arquitetura

### W1 — Fábrica (`cro-next-fabrica.json`)
```
3 gatilhos (quinzenal=completo · semanal=sentinela · manual)
  → Modo (Set) → Carregar Clientes Ativos (cro_clientes) → Montar Fila
  → Loop por cliente (batch=1):
      Preparar Cliente (janelas de 28d atual vs anterior, ciclo_id, slug)
      → GA4 Totais → GA4 Funil → GA4 Canais/Devices → Clarity → Jira Backlog
      → Normalizar Métricas (KPIs, taxas de funil, deltas — determinístico)
      → Agente de Ingestão (anomalias always-on + monta dossiê do ciclo)
      → Tem Anomalia? ─sim→ Registrar Alerta (cro_alertas) + Email de receita
                        └→ Modo Completo? ─não→ próximo cliente
                                           └sim→ SMA:
             Heurístico/UX (Nielsen·Baymard·WCAG)
              → Diagnóstico de Funil (gargalos + uplift + R$/mês)
              → Priorização ICE (hipóteses qualificadas)
              → Síntese (dashboard narrativo + pauta)
              → Autocrítica (LLM revisor; score 0–10, gate exige ≥ 7)
              → Montar Pacote → Montar Email → Salvar Ciclo (cro_ciclos)
              → Email "Convocar Gate" → próximo cliente
```
Modelo dos 5 agentes: `anthropic/claude-sonnet-4.6` via OpenRouter. Toda coleta é tolerante a falha (`onError: continueRegularOutput`, `neverError`), então um cliente sem Clarity/Jira ainda roda.

### W2 — Gate & Entregas (`cro-next-gate.json`)
```
GET  /cro-next-gate         → lê cro_ciclos (pendentes) → injeta base64 na página → serve HTML
POST /cro-next-gate/decisao → { ciclo_id, decisao, aprovador, notas, hipoteses_ids[] }
     ├─ aprovar c/ hipóteses → loop: Jira Criar Issue + Gravar Memória (cro_memoria)
     │                          → Atualizar Ciclo (aprovado) → Email → responde
     └─ rejeitar / sem hip.   → Atualizar Ciclo (rejeitado) → responde
```
**Nada chega ao cliente sem o gate humano.**

---

## Princípio anti-comoditização
Todo achado, gargalo e hipótese precisa citar **evidência quantitativa real** do cliente (taxas de funil, deltas, rage/dead clicks do Clarity, gap mobile×desktop). O agente de **Autocrítica** roda antes do gate para barrar número inventado, aritmética inconsistente ou texto genérico.

## Esquemas das Data Tables
- **cro_clientes**: cliente·ativo(bool)·site_url·contexto_negocio·vertical·tier·ga4_property_id·clarity_api_token·jira_base_url·jira_project_key·jira_issue_type·email_analista·valor_por_conversao(num)·moeda
- **cro_ciclos**: ciclo_id·cliente·status·score_autocritica(num)·sintese_md·dados_json·notas_gate·decidido_por·criado_em·decidido_em
- **cro_alertas**: cliente·tipo·severidade·metrica·variacao_pct(num)·mensagem·ciclo_id·criado_em
- **cro_memoria**: cliente·ciclo_id·hipotese_id·titulo·hipotese_json·status_implementacao·jira_issue_key·jira_base_url·email_analista·resultado·criado_em·atualizado_em

## Nota sobre credenciais no JSON
As credenciais referenciadas (IDs OpenRouter/Gmail/Jira) são as já existentes neste n8n. Ao importar em **outra** instância, o n8n pedirá para remapear cada credencial — selecione as equivalentes. Nenhum segredo fica no JSON, apenas os IDs/nomes das credenciais.
