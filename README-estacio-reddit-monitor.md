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
| **Monitorar conversas críticas/relevantes** sobre a marca e medir sentimento | `Buscar no Reddit (RSS)` → `Classificar Conversas` (LLM): `relevante`, `sentimento`, `score_sentimento (-1..1)`, `criticidade` |
| **Identificar tópicos/dores, possíveis crises** e sinalizar **pautas SEO** e/ou **ações com influenciadores** | `Montar Analise Agregada` (tendências dos últimos 7 dias) → `Gerar Pautas e Report` (LLM) produz `dores_recorrentes`, `riscos_reputacao`, `pautas_seo`, `acoes_influenciadores` |
| **Alertas + notificação da equipe + reports estruturados a cada hora** | Trigger `A Cada Hora` → e-mail `Enviar Report Horario`; conversas Alta/Crítica → e-mail `Enviar Alerta Critico` |

Decisões acordadas: **canal = E-mail (Gmail)** · **SEO = somente IA (sem Ahrefs)** ·
**entrega = push no canal + Data Table (histórico)** · **coleta = RSS gratuito do Reddit**
(a API self-service do Reddit foi fechada em nov/2025).

---

## Fluxo do workflow

```
Disparo Manual ─┐
A Cada Hora ────┴─► Ler Historico ─► Configurar Monitor ─► Buscar no Reddit (RSS)
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
2. Configure as credenciais / parâmetros:
   - **Reddit (RSS, grátis):** no nó `Buscar no Reddit (RSS)` preencha os parâmetros de query
     `user=` e `feed=` (token das suas *RSS preferences* em <https://www.reddit.com/prefs/feeds>)
     e ajuste o header `User-Agent` com seu usuário. **Não precisa de app/OAuth.**
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

## Coleta via RSS (por que e limitações)

Desde **nov/2025** o Reddit fechou o acesso self-service à API e, em **mai/2026**, passou a
bloquear os endpoints `.json` não autenticados. Por isso a coleta usa o **feed RSS**
(`https://www.reddit.com/search.rss`) com o token `user=`/`feed=` da conta — **gratuito e sem
app OAuth**. O parser (nó `Normalizar Posts`) lê o Atom/XML e normaliza os posts.

Limitações do RSS: não expõe `score` nem nº de comentários (gravados como `0`); a criticidade
é inferida pelo texto (título + corpo). Se o Reddit responder 403 a uma busca, o `neverError`
mantém o fluxo (aquela query apenas não retorna itens). Se precisar de dados mais ricos
(comentários, engajamento) no futuro, dá para trocar a coleta por Apify/SERP API sem mexer no
resto do workflow.

## Nota técnica

A criação programática via MCP do n8n (`create_workflow_from_code`) foi bloqueada por um
**limite de tamanho de request** do proxy (workflow de 19 nós ≈ 28 KB). Por isso o entregável
é o **JSON importável versionado** — mesma convenção do `seo-intelligence-orchestrator.json`
já presente no repositório.
