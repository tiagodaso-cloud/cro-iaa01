#!/usr/bin/env python3
"""Gera o workflow n8n 'UXP-Check' (checagem de paginas com a estrutura POUR em UX)."""
import json

# ---------------------------------------------------------------------------
# Interface Web (HTML servido pelo webhook GET)
# ---------------------------------------------------------------------------
INTERFACE_HTML = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>UXP-Check | Cadastra & Adtail</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="https://creativosbr.com.br/wp-content/uploads/2022/08/cadastra-1638546176-logopng.png">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--ax:#6d28d9;--ax-light:#f5f3ff;--ax-border:#ddd6fe;--dark:#111827;--gray:#6b7280;--gray-light:#9ca3af;--bg:#f4f4f6;--white:#ffffff;--line:#e5e7eb;--line-soft:#f3f4f6;--green:#059669;--green-bg:#ecfdf5;--green-border:#a7f3d0;--blue:#2563eb;--blue-bg:#eff6ff;--blue-border:#bfdbfe;--yellow:#d97706;--yellow-bg:#fffbeb;--yellow-border:#fde68a;--red:#dc2626;--red-bg:#fef2f2;--red-border:#fecaca;--sans:'Plus Jakarta Sans',sans-serif;--mono:'JetBrains Mono',monospace;--r:12px;--r-lg:16px;--shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06);--shadow-lg:0 4px 24px rgba(0,0,0,.08),0 12px 48px rgba(0,0,0,.06)}
    body{font-family:var(--sans);background:var(--bg);color:var(--dark);line-height:1.6;min-height:100vh}
    a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid var(--ax);outline-offset:2px}
    .skip-link{position:absolute;left:-999px;top:8px;background:var(--ax);color:#fff;padding:10px 16px;border-radius:8px;z-index:300;font-weight:700}
    .skip-link:focus{left:8px}
    .header{background:var(--white);padding:0 40px;height:56px;display:flex;align-items:center;box-shadow:0 1px 0 var(--line);position:sticky;top:0;z-index:200}
    .header-inner{max-width:1100px;margin:0 auto;width:100%;display:flex;align-items:center;gap:12px}
    .logo{height:26px}.product-name{font-size:16px;font-weight:800;letter-spacing:-.02em}
    .product-name span{color:var(--ax)}.version-badge{background:linear-gradient(135deg,#6d28d9,#9333ea);color:#fff;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    .hero{background:linear-gradient(140deg,#5b21b6 0%,#7c3aed 100%);padding:40px 40px 88px;position:relative;overflow:hidden}
    .hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:72px;background:linear-gradient(to bottom,transparent,var(--bg))}
    .hero-inner{max-width:1100px;margin:0 auto;position:relative;z-index:1;color:#fff}
    .hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8;margin-bottom:10px}
    .hero h1{font-size:clamp(28px,4vw,44px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:12px}
    .hero-desc{font-size:16px;max-width:600px;opacity:.92;line-height:1.6;margin-bottom:24px}
    .hero-badges{display:flex;gap:8px;flex-wrap:wrap}
    .hero-badge{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);color:rgba(255,255,255,.95);padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600}
    .wrap{max-width:1100px;margin:-48px auto 60px;padding:0 40px;position:relative;z-index:10}
    .card{background:var(--white);border-radius:var(--r-lg);box-shadow:var(--shadow-lg);padding:40px 44px;margin-bottom:24px}
    .card-title{font-size:20px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px}
    .card-sub{color:var(--gray);margin-bottom:28px;font-size:14px;line-height:1.6}
    .form-label{font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--gray);margin-bottom:8px;display:block}
    .form-group{margin-bottom:20px}
    .q-input{width:100%;padding:14px 18px;border:2px solid var(--line);border-radius:var(--r);font-size:15px;font-family:var(--sans);color:var(--dark);outline-offset:2px;background:var(--white);transition:border-color .2s,box-shadow .2s}
    .q-input::placeholder{color:var(--gray-light)}
    .q-input:focus{border-color:var(--ax);box-shadow:0 0 0 4px rgba(109,40,217,.12)}
    textarea.q-input{resize:vertical;min-height:80px}
    .input-row{display:flex;gap:10px;align-items:stretch}
    .input-row .q-input{flex:1}
    .run-btn{background:linear-gradient(145deg,#7c3aed,var(--ax));color:#fff;border:none;padding:14px 32px;border-radius:var(--r);font-size:15px;font-weight:800;font-family:var(--sans);cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(109,40,217,.4);transition:transform .15s,box-shadow .15s;letter-spacing:-.01em}
    .run-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(109,40,217,.45)}
    .run-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .features-box{background:var(--line-soft);border:1px solid var(--line);border-radius:var(--r);padding:22px 24px;margin-top:24px}
    .features-box h3{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--gray-light);margin-bottom:16px}
    .feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
    .feat-item{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--white);border:1px solid var(--line);border-radius:8px;font-size:13px;font-weight:500}
    .feat-check{width:20px;height:20px;background:var(--ax);border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
    .loading{display:none;background:var(--white);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:40px;margin-bottom:24px;text-align:center}
    .loading.on{display:block}
    .spinner{width:40px;height:40px;margin:0 auto 18px;border:3px solid rgba(109,40,217,.12);border-top-color:var(--ax);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading-title{font-weight:700;font-size:15px;margin-bottom:4px}
    .loading-sub{font-size:13px;color:var(--gray);margin-bottom:20px}
    .timer-wrap{margin:0 auto 24px;max-width:340px}
    .timer-bar-bg{height:6px;background:var(--line);border-radius:3px;overflow:hidden}
    .timer-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--ax),#a855f7);width:0%;transition:width .5s linear}
    .timer-label{font-size:11px;color:var(--gray-light);margin-top:6px;font-family:var(--mono)}
    .err-box{display:none;background:var(--red-bg);border:2px solid var(--red-border);border-radius:var(--r);padding:20px 24px;margin-bottom:16px}
    .err-box.on{display:block}
    .err-box h4{color:var(--red);font-weight:800;margin-bottom:6px}
    .err-box p{color:#7f1d1d;font-size:14px}
    .results{display:none}.results.on{display:block}
    .section{background:var(--white);border:1px solid var(--line);border-radius:var(--r-lg);margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07)}
    .section-head{padding:16px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;width:100%;background:none;border-left:none;border-right:none;border-top:none;font-family:var(--sans);text-align:left}
    .section-head:hover{background:var(--line-soft)}
    .section-title{font-size:14px;font-weight:800;letter-spacing:-.01em}
    .section-body{padding:22px}
    .section-body.hidden{display:none}
    .score-big{font-size:3em;font-weight:800;letter-spacing:-.04em;line-height:1}
    .score-big.hi{color:var(--green)}.score-big.mid{color:var(--yellow)}.score-big.lo{color:var(--red)}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
    .kpi{background:var(--line-soft);border:1px solid var(--line);border-radius:var(--r);padding:16px;text-align:center;border-top:3px solid var(--ax)}
    .kpi-val{font-size:26px;font-weight:800;letter-spacing:-.04em;color:var(--dark);line-height:1;margin-bottom:4px}
    .kpi-lbl{font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.06em}
    .level-pill{display:inline-block;font-size:13px;font-weight:800;padding:6px 16px;border-radius:999px;letter-spacing:.02em}
    .level-pill.aaa,.level-pill.aa{background:var(--green-bg);color:var(--green);border:1px solid var(--green-border)}
    .level-pill.a{background:var(--yellow-bg);color:var(--yellow);border:1px solid var(--yellow-border)}
    .level-pill.parcial,.level-pill.nao{background:var(--red-bg);color:var(--red);border:1px solid var(--red-border)}
    .item{border-left:4px solid var(--ax);padding:12px 16px;margin:10px 0;background:var(--line-soft);border-radius:0 var(--r) var(--r) 0}
    .item.alta{border-left-color:var(--red)}.item.media{border-left-color:var(--yellow)}.item.baixa{border-left-color:var(--green)}
    .item-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:10px;flex-wrap:wrap}
    .item-name{font-size:13px;font-weight:700}
    .item-text{font-size:13px;color:var(--gray);margin-bottom:4px}
    .item-rec{font-size:12px;color:var(--dark);font-style:italic;margin-bottom:6px}
    .sev-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase}
    .sev-badge.alta{background:var(--red-bg);color:var(--red);border:1px solid var(--red-border)}
    .sev-badge.media{background:var(--yellow-bg);color:var(--yellow);border:1px solid var(--yellow-border)}
    .sev-badge.baixa{background:var(--green-bg);color:var(--green);border:1px solid var(--green-border)}
    .src-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.3px;margin-left:6px}
    .src-badge.axe{background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe}
    .src-badge.heuristica{background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd}
    .src-badge.ia{background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb}
    .tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:var(--ax-light);color:var(--ax);border:1px solid var(--ax-border);margin-right:6px;text-transform:uppercase;letter-spacing:.04em}
    .tag.level{background:#f0f9ff;color:#0369a1;border-color:#bae6fd}
    .code-ex{font-family:var(--mono);font-size:11px;background:#0f172a;color:#e2e8f0;padding:10px 12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;margin-top:4px}
    .qw{background:var(--blue-bg);border:1px solid var(--blue-border);border-radius:var(--r);padding:14px 16px;margin:8px 0}
    .qw-head{font-size:13px;font-weight:700;margin-bottom:4px}
    .qw-impact{font-size:12px;color:var(--gray)}
    .pour-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:8px}
    .pour-card{border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;background:var(--white)}
    .pour-card h4{font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .pour-score{font-family:var(--mono);font-size:12px}
    .pour-card p{font-size:12px;color:var(--gray);line-height:1.5}
    @media(max-width:768px){.header{padding:0 20px}.hero{padding:32px 20px 80px}.wrap{padding:0 20px;margin-top:-40px}.card{padding:24px 20px}.input-row{flex-direction:column}.run-btn{width:100%}}
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Pular para o conteudo</a>
  <header class="header">
    <div class="header-inner">
      <img src="https://creativosbr.com.br/wp-content/uploads/2022/08/cadastra-1638546176-logopng.png" class="logo" alt="Cadastra">
      <div class="product-name">UXP<span>-</span>Check</div>
      <span class="version-badge">v1</span>
    </div>
  </header>

  <section class="hero">
    <div class="hero-inner">
      <div class="hero-eyebrow">CHECAGEM POUR &middot; UX &amp; ACESSIBILIDADE</div>
      <h1>UXP-Check</h1>
      <p class="hero-desc">Checagem de paginas estruturada nos 4 principios POUR &mdash; Perceptivel, Operavel, Compreensivel e Robusto &mdash; que servem de base para as WCAG. Combina validacao tecnica WCAG 2.2 com analise de UX inclusiva, mapeando criterios violados e quick wins para tornar a interface acessivel a todas as pessoas.</p>
      <div class="hero-badges">
        <div class="hero-badge">WCAG 2.2 (A / AA / AAA)</div>
        <div class="hero-badge">Render real (Lighthouse / axe)</div>
        <div class="hero-badge">Principios POUR</div>
        <div class="hero-badge">UX Inclusiva</div>
        <div class="hero-badge">Metricas Automatizadas</div>
        <div class="hero-badge">Exemplos de Codigo</div>
        <div class="hero-badge">Top Quick Wins</div>
      </div>
    </div>
  </section>

  <main id="main" class="wrap">
    <div class="card">
      <div class="card-title">&#9855; Auditoria de Acessibilidade &amp; UX</div>
      <div class="card-sub">Insira a URL da pagina que deseja auditar e receba um diagnostico aprofundado de conformidade WCAG 2.2 e usabilidade inclusiva.</div>

      <form id="form">
        <div class="form-group">
          <label class="form-label" for="url">URL da Pagina</label>
          <input class="q-input" type="url" id="url" placeholder="https://www.seusite.com.br/pagina" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label" for="context">Contexto (opcional)</label>
          <textarea class="q-input" id="context" placeholder="Ex: Pagina de checkout de e-commerce, publico amplo incluindo pessoas idosas e usuarios de leitor de tela"></textarea>
        </div>
        <div class="input-row">
          <button class="run-btn" type="submit" id="btn">&#9855; Auditar Acessibilidade</button>
        </div>

        <div class="features-box">
          <h3>O que voce vai receber</h3>
          <div class="feat-grid">
            <div class="feat-item"><div class="feat-check">&#10003;</div>Score geral de acessibilidade (0-10)</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Nivel de conformidade WCAG (A/AA/AAA)</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Auditoria axe-core com render real (Lighthouse)</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Principios POUR avaliados</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Criterios WCAG 2.2 violados</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Achados de UX inclusiva</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Metricas tecnicas automatizadas</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Exemplos de codigo corretivo</div>
            <div class="feat-item"><div class="feat-check">&#10003;</div>Top 3 Quick Wins priorizados</div>
          </div>
        </div>
      </form>
    </div>

    <div class="loading" id="loading">
      <div class="spinner"></div>
      <div class="loading-title">Auditando a pagina...</div>
      <div class="loading-sub">Validando WCAG 2.2, principios POUR e UX inclusiva</div>
      <div class="timer-wrap">
        <div class="timer-bar-bg"><div class="timer-bar-fill" id="timerFill"></div></div>
        <div class="timer-label" id="timerLabel">0s / 90s</div>
      </div>
    </div>

    <div class="err-box" id="errBox" role="alert">
      <h4>Erro na auditoria</h4>
      <p id="errMsg">Nao foi possivel completar o diagnostico. Verifique a URL e tente novamente.</p>
    </div>

    <div class="results" id="results"></div>
  </main>

  <script>
    const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const TIMEOUT_MS = 150000;
    let timerInterval = null;

    function startTimer() {
      const fill = document.getElementById('timerFill');
      const label = document.getElementById('timerLabel');
      const total = TIMEOUT_MS / 1000;
      const start = Date.now();
      fill.style.width = '0%';
      timerInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - start) / 1000);
        fill.style.width = Math.min((elapsed / total) * 100, 100) + '%';
        label.textContent = `${elapsed}s / ${total}s`;
        if (elapsed >= total) clearInterval(timerInterval);
      }, 500);
    }
    function stopTimer() {
      clearInterval(timerInterval);
      document.getElementById('timerFill').style.width = '100%';
    }
    function scoreClass(s) { return s >= 7 ? 'hi' : s >= 5 ? 'mid' : 'lo'; }
    function levelClass(l) {
      const t = String(l||'').toLowerCase();
      if (t.includes('aaa')) return 'aaa';
      if (t.includes('aa')) return 'aa';
      if (t.includes('parcial')) return 'parcial';
      if (t.includes('nao') || t.includes('não') || t.includes('no')) return 'nao';
      if (t.includes('a')) return 'a';
      return 'parcial';
    }

    function renderResults(d) {
      const res = document.getElementById('results');
      const m = d.automated_metrics || {};
      const img = m.images || {}; const aria = m.aria || {}; const lm = m.landmarks || {};
      const ct = m.contrast || {};
      const lh = d.lighthouse_audit || {};
      const lhAvail = lh.available === true;
      const lhAudits = (lh.failed_audits || []).map(a=>`
        <div class="item ${a.id==='color-contrast'?'alta':'media'}">
          <div class="item-head"><span class="item-name">${esc(a.title)}</span><span class="sev-badge ${a.id==='color-contrast'?'alta':'media'}">${esc(a.count)} elemento(s)</span></div>
          <div><span class="tag">${esc(a.id)}</span></div>
          ${(a.sample||[]).map(s=>`<pre class="code-ex">${esc(s.selector)}${s.snippet?'\\n'+esc(s.snippet):''}${s.explanation?'\\n// '+esc(s.explanation):''}</pre>`).join('')}
        </div>`).join('');
      const lhBlock = `
        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#128300; Auditoria Lighthouse / axe-core (render real)</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">
            ${lhAvail ? `
              <div class="kpi-grid">
                <div class="kpi"><div class="kpi-val score-big ${scoreClass((lh.accessibility_score||0)/10)}" style="font-size:26px">${esc(lh.accessibility_score)}</div><div class="kpi-lbl">Score axe /100</div></div>
                <div class="kpi"><div class="kpi-val">${esc(lh.total_failed??'-')}</div><div class="kpi-lbl">Auditorias reprovadas</div></div>
                <div class="kpi"><div class="kpi-val">${esc(lh.contrast? lh.contrast.count : 0)}</div><div class="kpi-lbl">Falhas de contraste</div></div>
                <div class="kpi"><div class="kpi-val">${esc(lh.strategy||'mobile')}</div><div class="kpi-lbl">Estrategia</div></div>
              </div>
              ${lhAudits || '<p style="color:var(--gray);font-size:14px">Nenhuma auditoria axe reprovada.</p>'}
            ` : `<p style="font-size:13px;color:var(--gray)">&#8505; ${esc(lh.note || 'Render real indisponivel; resultados baseados na heuristica inline.')}</p>`}
          </div>
        </div>`;
      const ctSamples = (ct.samples || []).map(s=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--white);border:1px solid var(--line);border-radius:8px;margin-bottom:6px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:30px;border-radius:6px;border:1px solid var(--line);background:${esc(s.bg)};color:${esc(s.fg)};font-size:12px;font-weight:700" aria-hidden="true">Aa</span>
          <span class="item-text" style="margin:0;flex:1"><code style="font-family:var(--mono);font-size:11px">${esc(s.fg)}</code> sobre <code style="font-family:var(--mono);font-size:11px">${esc(s.bg)}</code></span>
          <span class="sev-badge ${s.passes_aa?'baixa':'alta'}">${esc(s.ratio)}:1 ${s.passes_aa?'AA OK':'< AA'}</span>
        </div>`).join('');
      const totalFindings = (d.wcag_findings||[]).length;
      const critical = (d.wcag_findings||[]).filter(f=>String(f.severity).toLowerCase()==='alta').length;

      const pourCards = (d.pour_principles||[]).map(p=>`
        <div class="pour-card">
          <h4>${esc(p.principle)} <span class="pour-score score-big ${scoreClass(p.score)}" style="font-size:18px">${esc(p.score)}/10</span></h4>
          <p><strong>${esc(p.findings)}</strong></p>
          <p style="margin-top:6px">&#128161; ${esc(p.recommendations)}</p>
        </div>`).join('');

      const srcMap = {axe:{l:'axe-core (render real)',c:'axe'}, heuristica:{l:'Heuristica HTML',c:'heuristica'}, ia:{l:'Analise IA',c:'ia'}};
      const srcBadge = (s)=>{ const k=String(s||'ia').toLowerCase(); const m=srcMap[k]||srcMap.ia; return `<span class="src-badge ${m.c}" title="Fonte que embasou este achado">${m.l}</span>`; };
      const wcagItems = (d.wcag_findings||[]).map(f=>`
        <div class="item ${esc(String(f.severity).toLowerCase())}">
          <div class="item-head">
            <span class="item-name">${esc(f.criterion)}${srcBadge(f.source)}</span>
            <span class="sev-badge ${esc(String(f.severity).toLowerCase())}">${esc(f.severity)}</span>
          </div>
          <div>
            ${f.level?`<span class="tag level">Nivel ${esc(f.level)}</span>`:''}
            ${f.principle?`<span class="tag">${esc(f.principle)}</span>`:''}
          </div>
          <div class="item-text" style="margin-top:6px">${esc(f.finding)}</div>
          <div class="item-rec">&#128161; ${esc(f.recommendation)}</div>
          ${f.code_example?`<pre class="code-ex">${esc(f.code_example)}</pre>`:''}
        </div>`).join('');

      const uxItems = (d.ux_accessibility_findings||[]).map(f=>`
        <div class="item ${esc(String(f.severity).toLowerCase())}">
          <div class="item-head"><span class="item-name">${esc(f.area)}</span><span class="sev-badge ${esc(String(f.severity).toLowerCase())}">${esc(f.severity)}</span></div>
          <div class="item-text">${esc(f.finding)}</div>
          <div class="item-rec">&#128161; ${esc(f.recommendation)}</div>
        </div>`).join('');

      const qwItems = (d.top_quick_wins||[]).map(qw=>`
        <div class="qw">
          <div class="qw-head">#${esc(qw.priority)} &mdash; ${esc(qw.action)}</div>
          <div class="qw-impact">&#128200; ${esc(qw.expected_impact)}</div>
        </div>`).join('');

      res.innerHTML = `
        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#9874; Conformidade Geral</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">
            <div class="kpi-grid">
              <div class="kpi"><div class="kpi-val score-big ${scoreClass(d.overall_score)}">${esc(d.overall_score)}</div><div class="kpi-lbl">Score POUR /10</div></div>
              <div class="kpi"><div class="kpi-val"><span class="level-pill ${levelClass(d.wcag_compliance_level)}">${esc(d.wcag_compliance_level)}</span></div><div class="kpi-lbl">Nivel WCAG 2.2</div></div>
              <div class="kpi"><div class="kpi-val">${esc(critical)}</div><div class="kpi-lbl">Criterios Criticos</div></div>
              <div class="kpi"><div class="kpi-val">${esc(totalFindings)}</div><div class="kpi-lbl">Total de Achados</div></div>
            </div>
            <p style="font-size:14px;line-height:1.7;color:var(--gray)">${esc(d.conformance_summary)}</p>
          </div>
        </div>

        ${lhBlock}

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#127760; Principios POUR (Perceptivel, Operavel, Compreensivel, Robusto)</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body"><div class="pour-grid">${pourCards}</div></div>
        </div>

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#9888; Criterios WCAG 2.2 Violados</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">${wcagItems || '<p style="color:var(--gray);font-size:14px">Nenhum criterio critico identificado nos dados analisados.</p>'}</div>
        </div>

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#9855; UX Inclusiva &amp; Usabilidade</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">${uxItems}</div>
        </div>

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#128202; Metricas Tecnicas Automatizadas</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">
            <div class="kpi-grid">
              <div class="kpi"><div class="kpi-val">${esc(img.total??'-')}</div><div class="kpi-lbl">Imagens</div></div>
              <div class="kpi"><div class="kpi-val">${esc(img.without_alt??'-')}</div><div class="kpi-lbl">Sem ALT</div></div>
              <div class="kpi"><div class="kpi-val">${esc((m.headings||{}).h1??'-')}</div><div class="kpi-lbl">H1</div></div>
              <div class="kpi"><div class="kpi-val">${esc((m.forms||{}).labels??'-')}</div><div class="kpi-lbl">Labels</div></div>
              <div class="kpi"><div class="kpi-val">${esc(aria.labels??'-')}</div><div class="kpi-lbl">aria-label</div></div>
              <div class="kpi"><div class="kpi-val">${esc(lm.main??'-')}</div><div class="kpi-lbl">Landmark main</div></div>
              <div class="kpi"><div class="kpi-val">${esc((m.wcag_elements||{}).lang_attribute? 'Sim':'Nao')}</div><div class="kpi-lbl">Atributo lang</div></div>
              <div class="kpi"><div class="kpi-val">${esc((m.links||{}).total??'-')}</div><div class="kpi-lbl">Links</div></div>
            </div>
            <h4 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--gray);margin:18px 0 12px">&#127912; Contraste de Cores (WCAG 1.4.3 / 1.4.11)</h4>
            <div class="kpi-grid">
              <div class="kpi"><div class="kpi-val">${esc(ct.pairs_checked??'-')}</div><div class="kpi-lbl">Pares verificados</div></div>
              <div class="kpi"><div class="kpi-val ${(ct.low_contrast_aa>0)?'score-big lo':''}" style="font-size:26px">${esc(ct.low_contrast_aa??'-')}</div><div class="kpi-lbl">Abaixo de AA</div></div>
              <div class="kpi"><div class="kpi-val">${esc(ct.low_contrast_aaa??'-')}</div><div class="kpi-lbl">Abaixo de AAA</div></div>
              <div class="kpi"><div class="kpi-val">${esc(ct.elements_with_inline_style??'-')}</div><div class="kpi-lbl">Estilos inline</div></div>
            </div>
            ${ctSamples ? `<div style="margin-top:12px">${ctSamples}</div>` : ''}
            ${ct.note ? `<p style="font-size:12px;color:var(--gray-light);margin-top:10px;font-style:italic">&#8505; ${esc(ct.note)}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#9889; Top Quick Wins</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body">${qwItems}</div>
        </div>

        <div class="section">
          <button class="section-head" type="button" aria-expanded="true" onclick="toggle(this)">
            <span class="section-title">&#128221; Resumo Executivo</span><span aria-hidden="true">&#9662;</span>
          </button>
          <div class="section-body"><p style="font-size:14px;line-height:1.7;color:var(--gray)">${esc(d.summary)}</p></div>
        </div>`;
      res.classList.add('on');
    }

    function toggle(head) {
      const body = head.nextElementSibling;
      const hidden = body.classList.toggle('hidden');
      head.setAttribute('aria-expanded', String(!hidden));
    }

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('url').value.trim();
      const context = document.getElementById('context').value.trim();
      const btn = document.getElementById('btn');
      const loading = document.getElementById('loading');
      const errBox = document.getElementById('errBox');
      const results = document.getElementById('results');

      btn.disabled = true;
      btn.textContent = '⏳ Auditando...';
      loading.classList.add('on');
      errBox.classList.remove('on');
      results.classList.remove('on');
      results.innerHTML = '';
      startTimer();

      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, context }),
          signal: AbortSignal.timeout(TIMEOUT_MS + 5000)
        });
        stopTimer();
        const text = await res.text();
        if (!res.ok) throw new Error(`O servidor retornou erro HTTP ${res.status}. ${text ? text.substring(0,200) : ''}`.trim());
        if (!text || !text.trim()) throw new Error('Resposta vazia do servidor. O workflow provavelmente falhou ou expirou (ex.: timeout do Lighthouse/PageSpeed ou do modelo). Verifique a execucao no n8n.');
        let raw;
        try { raw = JSON.parse(text); }
        catch (_) { throw new Error('Resposta nao e JSON valido: ' + text.substring(0,200)); }
        const d = raw.data ?? raw.result ?? raw.json ?? raw;
        if (d.error) throw new Error(d.message || 'Falha no processamento.');
        renderResults(d);
      } catch (err) {
        stopTimer();
        errBox.classList.add('on');
        document.getElementById('errMsg').textContent = err.message || 'Erro inesperado.';
      } finally {
        loading.classList.remove('on');
        btn.disabled = false;
        btn.textContent = '♿ Auditar Acessibilidade';
      }
    });
  </script>
</body>
</html>"""

# ---------------------------------------------------------------------------
# Code node: validacao tecnica WCAG 2.2 (regex sobre o HTML cru)
# ---------------------------------------------------------------------------
WCAG_CODE = r"""const html = $input.first().json.data ?? '';

function countElements(html, selector) {
  const regex = new RegExp(`<${selector}[^>]*>`, 'gi');
  return (html.match(regex) || []).length;
}
function extractElements(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1].replace(/<[^>]*>/g, '').trim());
  }
  return matches;
}

// --- Verificacao de contraste de cores (WCAG 1.4.3 / 1.4.11) ---
// Heuristica best-effort: analisa pares cor/fundo declarados em estilos inline.
function parseColor(str) {
  if (!str) return null;
  str = str.trim().toLowerCase();
  const named = { black:[0,0,0], white:[255,255,255], red:[255,0,0], green:[0,128,0],
    blue:[0,0,255], gray:[128,128,128], grey:[128,128,128], silver:[192,192,192],
    yellow:[255,255,0], orange:[255,165,0], purple:[128,0,128], navy:[0,0,128] };
  if (named[str]) return named[str];
  let m = str.match(/#([0-9a-f]{6})\b/);
  if (m) { const h = m[1]; return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  m = str.match(/#([0-9a-f]{3})\b/);
  if (m) { const h = m[1]; return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)]; }
  m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return null;
}
function relLum(c) {
  const a = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
  return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
}
function contrastRatio(c1, c2) {
  const l1 = relLum(c1), l2 = relLum(c2);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const styleAttrs = html.match(/style=["'][^"']*["']/gi) || [];
let pairsChecked = 0, lowAA = 0, lowAAA = 0;
const contrastSamples = [];
for (const s of styleAttrs) {
  const colorM = s.match(/(?:^|;|\s)color\s*:\s*([^;"']+)/i);
  const bgM = s.match(/background(?:-color)?\s*:\s*([^;"']+)/i);
  if (colorM && bgM) {
    const fg = parseColor(colorM[1]);
    const bg = parseColor(bgM[1]);
    if (fg && bg) {
      pairsChecked++;
      const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
      const passesAA = ratio >= 4.5;
      const passesAAA = ratio >= 7;
      if (!passesAA) lowAA++;
      if (!passesAAA) lowAAA++;
      if (contrastSamples.length < 8) {
        contrastSamples.push({ fg: colorM[1].trim(), bg: bgM[1].trim(), ratio, passes_aa: passesAA, passes_aaa: passesAAA });
      }
    }
  }
}

const accessibility_analysis = {
  landmarks: {
    main: countElements(html, 'main') + (html.match(/role=["']main["']/gi) || []).length,
    nav: countElements(html, 'nav') + (html.match(/role=["']navigation["']/gi) || []).length,
    header: countElements(html, 'header') + (html.match(/role=["']banner["']/gi) || []).length,
    footer: countElements(html, 'footer') + (html.match(/role=["']contentinfo["']/gi) || []).length,
    aside: countElements(html, 'aside') + (html.match(/role=["']complementary["']/gi) || []).length,
    search: countElements(html, 'search') + (html.match(/role=["']search["']/gi) || []).length,
    region: (html.match(/role=["']region["']/gi) || []).length
  },
  images: {
    total: countElements(html, 'img'),
    without_alt: (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length,
    empty_alt: (html.match(/<img[^>]*alt=["']?["'][^>]*>/gi) || []).length,
    generic_alt: (html.match(/<img[^>]*alt=["']?(image|imagem|foto|picture)["'][^>]*>/gi) || []).length
  },
  links: {
    total: countElements(html, 'a'),
    external: (html.match(/<a[^>]*target=["']_blank["'][^>]*>/gi) || []).length,
    skip_links: (html.match(/<a[^>]*href=["']#[^"']*["'][^>]*>.*?(skip|pular).*?<\/a>/gi) || []).length,
    empty_href: (html.match(/<a[^>]*href=["']#["'][^>]*>/gi) || []).length
  },
  forms: {
    inputs_total: countElements(html, 'input'),
    required_fields: (html.match(/<(?:input|select|textarea)[^>]*required[^>]*>/gi) || []).length,
    fieldsets: countElements(html, 'fieldset'),
    labels: countElements(html, 'label'),
    selects: countElements(html, 'select'),
    textareas: countElements(html, 'textarea')
  },
  headings: {
    h1: countElements(html, 'h1'),
    h2: countElements(html, 'h2'),
    h3: countElements(html, 'h3'),
    h4: countElements(html, 'h4'),
    h5: countElements(html, 'h5'),
    h6: countElements(html, 'h6'),
    h1_texts: extractElements(html, 'h1'),
    h2_texts: extractElements(html, 'h2')
  },
  aria: {
    live_regions: (html.match(/aria-live=/gi) || []).length,
    hidden_elements: (html.match(/aria-hidden=["']true["']/gi) || []).length,
    described_by: (html.match(/aria-describedby=/gi) || []).length,
    labeled_by: (html.match(/aria-labelledby=/gi) || []).length,
    labels: (html.match(/aria-label=/gi) || []).length,
    alert_roles: (html.match(/role=["']alert["']/gi) || []).length,
    roles_total: (html.match(/\srole=/gi) || []).length
  },
  wcag_elements: {
    buttons: countElements(html, 'button'),
    focus_elements: (html.match(/tabindex=/gi) || []).length,
    positive_tabindex: (html.match(/tabindex=["']?[1-9]/gi) || []).length,
    lang_attribute: /<html[^>]*\slang=/i.test(html) ? 1 : 0,
    title_tag: countElements(html, 'title'),
    buttons_without_text: (html.match(/<button[^>]*>\s*<\/button>/gi) || []).length,
    viewport_meta: /<meta[^>]*name=["']viewport["']/i.test(html) ? 1 : 0
  },
  contrast: {
    elements_with_inline_style: styleAttrs.length,
    pairs_checked: pairsChecked,
    low_contrast_aa: lowAA,
    low_contrast_aaa: lowAAA,
    samples: contrastSamples,
    note: pairsChecked === 0
      ? 'Nenhum par cor/fundo inline encontrado; o contraste real depende do CSS externo e deve ser validado visualmente.'
      : 'Analise heuristica baseada em estilos inline; verifique tambem o CSS externo.'
  }
};

return [{ json: { wcag_metrics: accessibility_analysis } }];
"""

# ---------------------------------------------------------------------------
# Code node: processa a resposta do Google PageSpeed Insights (Lighthouse/axe)
# ---------------------------------------------------------------------------
LIGHTHOUSE_CODE = r"""const r = $input.item.json ?? {};
const lr = r.lighthouseResult;

if (!lr || !lr.categories || !lr.categories.accessibility) {
  return { json: { lighthouse: {
    available: false,
    note: "Render real indisponivel (API key ausente, URL nao publica, timeout ou erro). A analise prossegue com a heuristica inline."
  }}};
}

const score = Math.round((lr.categories.accessibility.score ?? 0) * 100);
const audits = lr.audits || {};
const refs = (lr.categories.accessibility.auditRefs || []);

const failed = [];
let contrast = null;

for (const ref of refs) {
  const a = audits[ref.id];
  if (!a) continue;
  if (a.scoreDisplayMode === 'binary' && a.score === 0) {
    const allItems = ((a.details || {}).items || []);
    const sample = allItems.slice(0, 3).map(it => ({
      selector: (it.node && it.node.selector) || '',
      snippet: ((it.node && it.node.snippet) || '').substring(0, 200),
      explanation: (it.node && it.node.explanation) || ''
    }));
    const entry = { id: a.id, title: a.title, count: allItems.length, sample };
    failed.push(entry);
    if (a.id === 'color-contrast') contrast = entry;
  }
}

return { json: { lighthouse: {
  available: true,
  accessibility_score: score,
  total_failed: failed.length,
  contrast,
  failed_audits: failed.slice(0, 15),
  strategy: 'mobile'
}}};
"""

# ---------------------------------------------------------------------------
# Parse node
# ---------------------------------------------------------------------------
PARSE_CODE = r"""const raw = $input.first().json.output ?? '';

// Referencias resilientes: usam .first() (fluxo de item unico) e nunca lancam,
// para garantir que o no Respond sempre receba um JSON valido.
function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
const url = safe(() => $("Prepare Context").first().json.url, "");
const metrics = safe(() => $("Analise WCAG 2.2").first().json.wcag_metrics, {});
const lighthouse = safe(() => $("Processar Lighthouse").first().json.lighthouse, { available: false });

try {
  const match = raw.match(/{[\s\S]*}/);
  if (!match) throw new Error("JSON nao encontrado na resposta do modelo.");
  const d = JSON.parse(match[0]);
  return { json: {
    ...d,
    url,
    automated_metrics: metrics,
    lighthouse_audit: lighthouse
  }};
} catch(e) {
  return { json: {
    error: true,
    message: "Falha ao processar resposta do modelo: " + e.message,
    raw_preview: String(raw).substring(0, 300),
    url
  }};
}"""

SYSTEM_MESSAGE = (
    "Voce e um(a) especialista senior em Acessibilidade Digital (WCAG 2.2) e UX inclusiva, "
    "com dominio das diretrizes do W3C/WAI, dos principios POUR e da legislacao brasileira (LBI / eMAG). "
    "Analise SOMENTE os dados reais fornecidos (HTML e metricas tecnicas automatizadas). NAO invente dados. "
    "Responda APENAS com JSON puro, sem markdown e sem texto fora do JSON. "
    "Use criterios WCAG 2.2 reais no formato 'numero Nome' (ex.: '1.1.1 Conteudo Nao Textual', '2.4.7 Foco Visivel', '4.1.2 Nome, Funcao, Valor'). "
    "Estrutura obrigatoria: {"
    "\"overall_score\":0-10,"
    "\"wcag_compliance_level\":\"Nao conforme|Parcial A|A|AA|AAA\","
    "\"conformance_summary\":\"string\","
    "\"pour_principles\":[{\"principle\":\"Perceptivel|Operavel|Compreensivel|Robusto\",\"score\":0-10,\"findings\":\"string\",\"recommendations\":\"string\"}],"
    "\"wcag_findings\":[{\"criterion\":\"string\",\"level\":\"A|AA|AAA\",\"principle\":\"Perceptivel|Operavel|Compreensivel|Robusto\",\"severity\":\"Alta|Media|Baixa\",\"source\":\"axe|heuristica|ia\",\"finding\":\"string\",\"recommendation\":\"string\",\"code_example\":\"string\"}],"
    "\"ux_accessibility_findings\":[{\"area\":\"string\",\"severity\":\"Alta|Media|Baixa\",\"finding\":\"string\",\"recommendation\":\"string\"}],"
    "\"top_quick_wins\":[{\"priority\":1,\"action\":\"string\",\"expected_impact\":\"string\"}],"
    "\"summary\":\"string\"}. "
    "Inclua os 4 principios POUR. Forneca de 5 a 10 wcag_findings priorizando os de maior impacto, "
    "sempre com um code_example HTML corretivo curto e valido. "
    "PRIORIZE a auditoria Lighthouse/axe-core (render real) quando lighthouse.available=true: use lighthouse.accessibility_score como ancora do overall_score e converta cada item de lighthouse.failed_audits em um wcag_finding citando o seletor/snippet real; trate lighthouse.contrast (auditoria color-contrast do axe) como a fonte primaria de contraste. "
    "Quando lighthouse.available=false, use a heuristica inline como fallback. "
    "Para contraste de cores avalie os criterios 1.4.3 (Contraste Minimo, AA >= 4.5:1) e 1.4.11 (Contraste de Elementos Nao Textuais): se o axe ou os dados inline 'contrast' apontarem reprovacao, gere um wcag_finding de severidade Alta citando a razao/elemento real; se nada puder ser medido, recomende validacao manual. "
    "Em CADA wcag_finding preencha o campo 'source' indicando o que embasou o achado: 'axe' quando derivar da auditoria Lighthouse/axe-core (render real), 'heuristica' quando derivar das metricas inline extraidas do HTML cru, ou 'ia' quando for inferencia sua a partir do HTML sem evidencia automatizada direta. "
    "Forneca de 3 a 6 ux_accessibility_findings (foco em legibilidade, contraste, navegacao por teclado, foco visivel, area de toque, feedback, linguagem clara). "
    "Forneca exatamente 3 top_quick_wins. Seja tecnico, objetivo e conciso (1 a 2 frases por campo)."
)

AGENT_TEXT = (
    "=URL analisada: {{ $json.url }}\n"
    "Contexto: {{ $json.context }}\n\n"
    "AUDITORIA LIGHTHOUSE / AXE-CORE (render real em Chrome headless - fonte mais confiavel quando available=true):\n"
    "{{ $json.lighthouse }}\n\n"
    "METRICAS TECNICAS AUTOMATIZADAS (heuristica regex sobre o HTML cru):\n"
    "{{ $json.wcag_metrics }}\n\n"
    "HTML DA PAGINA (trecho):\n{{ $json.page_content }}"
)

# ---------------------------------------------------------------------------
# Montagem do workflow
# ---------------------------------------------------------------------------
workflow = {
    "name": "UXP-Check V1 - Checagem POUR (UX & Acessibilidade)",
    "nodes": [
        {
            "parameters": {
                "path": "uxp-check",
                "responseMode": "responseNode",
                "options": {"allowedOrigins": "*"}
            },
            "id": "a1b2c3d4-0001-4000-8000-000000000001",
            "name": "GET - Interface Web",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2.1,
            "position": [0, 0],
            "webhookId": "uxp-check-get-001"
        },
        {
            "parameters": {
                "respondWith": "text",
                "responseBody": INTERFACE_HTML,
                "options": {
                    "responseCode": 200,
                    "responseHeaders": {
                        "entries": [
                            {"name": "Content-Type", "value": "text/html; charset=utf-8"}
                        ]
                    }
                }
            },
            "id": "a1b2c3d4-0002-4000-8000-000000000002",
            "name": "Renderizar Interface",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.5,
            "position": [304, 0]
        },
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "uxp-check",
                "responseMode": "responseNode",
                "options": {"allowedOrigins": "*"}
            },
            "id": "a1b2c3d4-0003-4000-8000-000000000003",
            "name": "POST - Receber Auditoria",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2.1,
            "position": [0, 240],
            "webhookId": "uxp-check-post-001"
        },
        {
            "parameters": {
                "url": "={{ $json.body.url }}",
                "options": {
                    "redirect": {"redirect": {"maxRedirects": 3}},
                    "response": {"response": {"neverError": True, "responseFormat": "text"}},
                    "timeout": 15000
                }
            },
            "id": "a1b2c3d4-0004-4000-8000-000000000004",
            "name": "Fetch Page HTML",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [304, 96]
        },
        {
            "parameters": {"jsCode": WCAG_CODE},
            "id": "a1b2c3d4-0005-4000-8000-000000000005",
            "name": "Analise WCAG 2.2",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [608, 96]
        },
        {
            "parameters": {
                "url": "=https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={{ encodeURIComponent($json.body.url) }}&category=accessibility&strategy=mobile{{ $env.PAGESPEED_API_KEY ? '&key=' + $env.PAGESPEED_API_KEY : '' }}",
                "options": {
                    "response": {"response": {"neverError": True, "responseFormat": "json"}},
                    "timeout": 45000
                }
            },
            "id": "a1b2c3d4-0011-4000-8000-000000000011",
            "name": "Lighthouse (PageSpeed)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [304, 384],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {"mode": "runOnceForEachItem", "jsCode": LIGHTHOUSE_CODE},
            "id": "a1b2c3d4-0012-4000-8000-000000000012",
            "name": "Processar Lighthouse",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [608, 384]
        },
        {
            "parameters": {"mode": "combine", "combineBy": "combineAll", "options": {}},
            "id": "a1b2c3d4-0013-4000-8000-000000000013",
            "name": "Merge Dados",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3.2,
            "position": [880, 240]
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"id": "1", "name": "url", "value": "={{ $(\"POST - Receber Auditoria\").first().json.body.url }}", "type": "string"},
                        {"id": "2", "name": "context", "value": "={{ $(\"POST - Receber Auditoria\").first().json.body.context ?? \"Nao informado\" }}", "type": "string"},
                        {"id": "3", "name": "wcag_metrics", "value": "={{ JSON.stringify($(\"Analise WCAG 2.2\").first().json.wcag_metrics) }}", "type": "string"},
                        {"id": "4", "name": "page_content", "value": "={{ ($(\"Fetch Page HTML\").first().json.data ?? \"\").substring(0, 8000) }}", "type": "string"},
                        {"id": "5", "name": "lighthouse", "value": "={{ JSON.stringify($(\"Processar Lighthouse\").first().json.lighthouse) }}", "type": "string"}
                    ]
                },
                "options": {}
            },
            "id": "a1b2c3d4-0006-4000-8000-000000000006",
            "name": "Prepare Context",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [1120, 240]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": AGENT_TEXT,
                "options": {
                    "systemMessage": SYSTEM_MESSAGE,
                    "maxIterations": 1,
                    "enableStreaming": False
                }
            },
            "id": "a1b2c3d4-0007-4000-8000-000000000007",
            "name": "UXP Diagnostic Agent",
            "type": "@n8n/n8n-nodes-langchain.agent",
            "typeVersion": 3.1,
            "position": [1392, 240],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {
                "model": "anthropic/claude-sonnet-4.6",
                "options": {"maxTokens": 12000, "temperature": 0.2}
            },
            "id": "a1b2c3d4-0008-4000-8000-000000000008",
            "name": "OpenRouter Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
            "typeVersion": 1,
            "position": [1392, 432],
            "credentials": {
                "openRouterApi": {"id": "4MTPOCzYj4oYOSjA", "name": "OpenRouter account 51"}
            }
        },
        {
            "parameters": {"mode": "runOnceForEachItem", "jsCode": PARSE_CODE},
            "id": "a1b2c3d4-0009-4000-8000-000000000009",
            "name": "Parse JSON Result",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1744, 240]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}",
                "options": {"responseCode": 200}
            },
            "id": "a1b2c3d4-0010-4000-8000-000000000010",
            "name": "Retornar Resultados",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.5,
            "position": [1968, 240]
        }
    ],
    "pinData": {},
    "connections": {
        "GET - Interface Web": {"main": [[{"node": "Renderizar Interface", "type": "main", "index": 0}]]},
        "POST - Receber Auditoria": {"main": [[
            {"node": "Fetch Page HTML", "type": "main", "index": 0},
            {"node": "Lighthouse (PageSpeed)", "type": "main", "index": 0}
        ]]},
        "Fetch Page HTML": {"main": [[{"node": "Analise WCAG 2.2", "type": "main", "index": 0}]]},
        "Analise WCAG 2.2": {"main": [[{"node": "Merge Dados", "type": "main", "index": 0}]]},
        "Lighthouse (PageSpeed)": {"main": [[{"node": "Processar Lighthouse", "type": "main", "index": 0}]]},
        "Processar Lighthouse": {"main": [[{"node": "Merge Dados", "type": "main", "index": 1}]]},
        "Merge Dados": {"main": [[{"node": "Prepare Context", "type": "main", "index": 0}]]},
        "Prepare Context": {"main": [[{"node": "UXP Diagnostic Agent", "type": "main", "index": 0}]]},
        "UXP Diagnostic Agent": {"main": [[{"node": "Parse JSON Result", "type": "main", "index": 0}]]},
        "OpenRouter Model": {"ai_languageModel": [[{"node": "UXP Diagnostic Agent", "type": "ai_languageModel", "index": 0}]]},
        "Parse JSON Result": {"main": [[{"node": "Retornar Resultados", "type": "main", "index": 0}]]}
    },
    "active": False,
    "settings": {"executionOrder": "v1", "binaryMode": "separate", "availableInMCP": True},
    "meta": {"templateCredsSetupCompleted": True},
    "tags": [
        {"name": "OO-Digital Performance"},
        {"name": "Acessibilidade"}
    ]
}

with open("uxp-check.json", "w", encoding="utf-8") as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)

print("OK - uxp-check.json gerado")
print("nodes:", len(workflow["nodes"]))
