# Estácio – Reddit Sentiment & Reputation Monitor (n8n)

Agente de IA em **n8n + OpenRouter** que monitora conversas sobre a marca **Estácio**
(Universidade/Faculdade Estácio de Sá) no **Reddit**, mede sentimento/satisfação,
identifica dores recorrentes e riscos de reputação e, a partir disso, gera **pautas de
conteúdo otimizadas em SEO** e **ações com influenciadores/embaixadores** — entregues em
**report por e-mail a cada hora** + **alerta imediato** para conversas críticas.

Arquivo importável: [`estacio-reddit-monitor.json`](./estacio-reddit-monitor.json)
Gerador (fonte de verdade, editável): [`build-estacio-monitor.js`](./build-estacio-monitor.js)

---

## Como atende ao briefing

| Requisito | Onde acontece |
|---|---|
| **Monitorar conversas críticas/relevantes** sobre a marca e medir sentimento | `Buscar no Reddit` → `Classificar Conversas` (LLM): `relevante`, `sentimento`, `score_sentimento (-1..1)`, `criticidade` |
| **Identificar tópicos/dores, possíveis crises** e sinalizar **pautas SEO** e/ou **ações com influenciadores** | `Montar Analise Agregada` (tendências dos últimos 7 dias) → `Gerar Pautas e Report` (LLM) produz `dores_recorrentes`, `riscos_reputacao`, `pautas_seo`, `acoes_influenciadores` |
| **Alertas + notificação da equipe + reports estruturados a cada hora** | Trigger `A Cada Hora` → e-mail `Enviar Report Horario`; conversas Alta/Crítica → e-mail `Enviar Alerta Critico` |

Decisões acordadas: **canal = E-mail (Gmail)** · **SEO = somente IA (sem Ahrefs)** ·
**entrega = push no canal + Data Table (histórico)**.

---

## Fluxo do workflow

```
Disparo Manual ─┐
A Cada Hora ────┴─► Ler Historico ─► Configurar Monitor ─► Buscar no Reddit
   ─► Normalizar Posts ─► Filtrar Novos ─► Montar Lote ─► Classificar Conversas (LLM)
   ─► Processar Classificacao ─┬─► Salvar Posts Vistos            (dedup + histórico)
                               └─► Filtrar Relevantes ─► Montar Analise Agregada
                                   ─► Gerar Pautas e Report (LLM) ─► Processar Report ─┬─► Salvar Report
                                                                                      ├─► Enviar Report Horario (e-mail)
                                                                                      └─► Gate Criticos ─► Enviar Alerta Critico (e-mail)
```

- **Deduplicação:** todo post novo (relevante ou não) é gravado em `reddit_estacio_posts`,
  então a busca da próxima hora ignora o que já foi visto → "novas conversas".
- **Desambiguação:** o classificador marca `relevante=false` para homônimos (bairro do Rio,
  escola de samba, futebol) — só a instituição de ensino entra nos reports.
- **Sem ruído:** o report só é enviado quando há conversas relevantes novas na execução.

---

## Data Tables (já criadas no projeto "SEO")

| Tabela | ID | Conteúdo |
|---|---|---|
| `reddit_estacio_posts` | `T5KO4Iba8mrrlgWW` | 1 linha por conversa: sentimento, criticidade, categoria, resumo, métricas (dedup + histórico) |
| `reddit_estacio_reports` | `QecYI0Hccogj1FkZ` | 1 linha por execução: métricas agregadas + JSON do relatório |

O JSON referencia esses IDs diretamente.

---

## Importar e ativar

1. **n8n → Workflows → Import from File** → selecione `estacio-reddit-monitor.json`.
2. Configure as credenciais (nós marcados pedem seleção):
   - **Reddit (OAuth2)** no nó `Buscar no Reddit`.
   - **Gmail (OAuth2)** nos nós `Enviar Report Horario` e `Enviar Alerta Critico`.
   - **OpenRouter** nos modelos `OpenRouter - Classificacao` e `OpenRouter - Report`
     (já vem vinculado a `OpenRouter account 51`; confirme).
3. (Opcional) Ajuste:
   - **Termos de busca** → nó `Configurar Monitor` (array `queries`).
   - **Destinatário** dos e-mails → nós Gmail (hoje `tiagodaso@gmail.com`).
   - **Frequência** → nó `A Cada Hora` (padrão: 1h).
   - **Modelo** → nós OpenRouter (padrão: `anthropic/claude-sonnet-4.6`).
4. Rode uma vez com **Disparo Manual** para validar e então **ative** o workflow.

---

## Editar e regenerar o JSON

A lógica vive em `build-estacio-monitor.js`. Após editar:

```bash
node build-estacio-monitor.js   # regrava estacio-reddit-monitor.json
```

---

## Nota técnica

A criação programática via MCP do n8n (`create_workflow_from_code`) foi bloqueada por um
**limite de tamanho de request** do proxy (workflow de 19 nós ≈ 28 KB). Por isso o entregável
é o **JSON importável versionado** — mesma convenção do `seo-intelligence-orchestrator.json`
já presente no repositório.
