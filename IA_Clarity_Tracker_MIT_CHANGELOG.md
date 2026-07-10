# IA Clarity Tracker — MIT · Melhorias e passo a passo

Arquivo importável: **`IA_Clarity_Tracker_MIT.json`** (workflow completo, 32 nós).

Este pacote traz o workflow **IA Clarity Tracker - MIT** com 4 melhorias aplicadas.
Importe o JSON no n8n (**Workflows → ⋮ → Import from File**), confira as credenciais
(seção final) e ative.

---

## O que mudou

### 1. Dashboard abre no dia anterior por padrão
Nó **`Preparar Dashboard`**. O seletor de data passa a iniciar no snapshot do **dia
anterior** (o snapshot mais recente com data anterior a hoje); se só houver o snapshot
de hoje, cai para o mais recente disponível.

```js
const todayStr = new Date().toISOString().slice(0, 10);
const defaultDate = dates.find(d => d < todayStr) || dates[0];
const selDate = (q.date && dates.includes(String(q.date))) ? String(q.date) : defaultDate;
```
O usuário continua podendo trocar a data no seletor (`?date=YYYY-MM-DD`).

### 2. Gráficos de evolutivo dos últimos dias no dashboard
Ainda no nó **`Preparar Dashboard`**, um novo card **"📈 Evolução dos últimos dias"**
(logo abaixo da Visão Geral) renderiza 4 gráficos de linha em **SVG puro** (sem
dependências externas, seguro para servir via webhook), com base em até 14 snapshots:

- **Score de Frustração (0–100)**
- **Sessões**
- **% de sessões com fricção** — rage / dead / quickbacks (3 séries com legenda)
- **Scroll médio (%)**

Cada ponto tem tooltip nativo (`<title>`) com o valor exato do dia.

### 3. Resumo semanal automático por e-mail (novo ramo no workflow)
Um ramo independente, disparado por **`Agendamento Semanal`** (cron `0 8 * * 1` —
**toda segunda-feira às 08:00**):

```
Agendamento Semanal → Config Semanal → Ler Snapshots (Semanal) → GA – Métricas Diárias
  → Montar Resumo Semanal → Agente Resumo Semanal → Formatar Email Semanal → Enviar Email Semanal
```

- **`Config Semanal`** — parâmetros do resumo: `projectName`, `reportEmails`
  (destinatários, separados por vírgula), `lookbackDays` (7), `clarityPeriodDays` (3)
  e `ga4PropertyId`.
- **`Ler Snapshots (Semanal)`** — lê os snapshots diários já gravados na Data Table
  `clarity_snapshots` (mesma tabela do fluxo diário).
- **`Montar Resumo Semanal`** — consolida os últimos 7 dias: sessões, frustração média
  e variação na semana, médias de rage/dead/quickback, URLs recorrentes no topo de
  fricção.
- **`Agente Resumo Semanal`** (+ **`OpenRouter – Semanal`**) — gera o texto executivo,
  destaques, leitura das correlações e recomendações da próxima semana.
- **`Formatar Email Semanal`** — monta o e-mail HTML (estilos inline, compatível com
  Gmail/Outlook) com KPIs, barras de score por dia, tabela diária e recomendações.
- **`Enviar Email Semanal`** — envia via Gmail para os endereços de `reportEmails`.

### 4. Dados de GA correlacionados aos padrões do Clarity no mesmo e-mail
- **`GA – Métricas Diárias`** — Google Analytics 4, `last7days`, por dia: `sessions`,
  `totalUsers`, `screenPageViews`, `userEngagementDuration` e `engagementRate`.
- Em **`Montar Resumo Semanal`**, os dias do GA são **alinhados por data** aos snapshots
  do Clarity e é calculada a **correlação de Pearson** entre:
  - Frustração (Clarity) × Taxa de engajamento (GA)
  - Frustração (Clarity) × Sessões (GA)
  - Rage clicks (Clarity) × Engajamento (GA)
  - Quickbacks (Clarity) × Engajamento (GA)
- O e-mail traz os **números da correlação** e uma **tabela diária Clarity × GA**, e o
  agente de IA escreve a **leitura prática** dessas relações (tratando-as como
  tendência, não causalidade, já que o snapshot do Clarity agrega alguns dias).

> **Tolerância a falha de GA:** o nó `GA – Métricas Diárias` está com
> `onError: continueRegularOutput`. Se a credencial/propriedade do GA4 não estiver
> configurada, o resumo é enviado **só com dados do Clarity** e uma nota avisando que o
> GA estava indisponível — o workflow não quebra.

---

## Passo a passo para colocar no ar

1. **Importar:** no n8n, **Workflows → Import from File →** `IA_Clarity_Tracker_MIT.json`.
   (Importa como um novo workflow; valide antes de desativar o atual.)
2. **Config Semanal:** abra o nó e preencha:
   - `reportEmails` — os e-mails que receberão o resumo (ex.: `pessoa1@x.com, pessoa2@x.com`).
   - `ga4PropertyId` — o **ID numérico** da propriedade GA4 (ex.: `123456789`).
   - Ajuste `projectName` se necessário (deve casar com o `projectName` do fluxo diário).
3. **Credenciais** (confirme o mapeamento — veja a tabela abaixo).
4. **Testar o resumo:** clique em **Execute Workflow** a partir de `Agendamento Semanal`
   (ou desabilite temporariamente o gatilho e rode o ramo manualmente). Confira o e-mail.
5. **Ativar** o workflow. O resumo passa a sair toda **segunda às 08:00**; o dashboard
   e a auditoria diária seguem funcionando como antes.

---

## Credenciais usadas no JSON

Já deixei referenciadas as credenciais existentes na instância. **Confirme** cada uma
após importar (o n8n pode pedir para remapear):

| Nó | Tipo | Credencial referenciada |
|---|---|---|
| Clarity – Por URL/Dispositivo/Origem/Navegador | HTTP Header Auth | `Authorization` |
| OpenRouter – CRO / OpenRouter – Semanal | OpenRouter API | `OpenRouter account 51` |
| Enviar Email Semanal | Gmail OAuth2 | `SEO-N8N` |
| **GA – Métricas Diárias** | Google Analytics OAuth2 | **⚠️ não configurada — crie/atribua uma credencial GA4 OAuth2** |

> A credencial Header Auth do Clarity deve ter **Name = `Authorization`** e
> **Value = `Bearer SEU_TOKEN`** (mesma regra do fluxo diário).
