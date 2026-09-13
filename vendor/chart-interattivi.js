/* Grafici interattivi — Diego·OS, parte SALUTE.
   Comportamento identico su ogni grafico dell'app:
   1) lettura fissa al passaggio di mouse o dito;
   2) apertura a tutto schermo con inserimento del valore.

   Annotazioni richieste nel markup:
     .card            → data-chart-card
     lettura          → <span data-chart-read data-chart-default="…">
     icona espandi    → <span data-chart-expand>
     area del grafico → data-chart="Titolo" data-kind="line|bars"
                        data-unit="kg" data-labels="a|b|c" data-values="1|2|3"
                        [data-cmp-label="media 7gg" data-cmp-values="…"]
                        [data-hint="…"]
     cursore          → <i data-chart-cursor> dentro l'area (opzionale)
*/
(function () {
  if (window.__dosCharts) return;
  window.__dosCharts = true;

  const split = (s) => (s ? String(s).split('|') : []);
  const card = (el) => {
    const marked = el.closest('[data-chart-card]');
    if (marked) return marked;
    let p = el.parentElement;
    while (p && !p.querySelector('[data-chart]')) p = p.parentElement;
    return p || el.parentElement;
  };

  function readFor(el, i) {
    const labels = split(el.dataset.labels);
    const values = split(el.dataset.values);
    const unit = el.dataset.unit ? ' ' + el.dataset.unit : '';
    const cmp = split(el.dataset.cmpValues);
    let t = (labels[i] || '') + ' · ' + (values[i] || '') + unit;
    if (cmp.length && cmp[i]) t += ' · ' + (el.dataset.cmpLabel || 'confronto') + ' ' + cmp[i];
    return t;
  }

  function indexAt(el, clientX) {
    const r = el.getBoundingClientRect();
    const n = split(el.dataset.values).length;
    if (!n || !r.width) return 0;
    const f = Math.min(0.9999, Math.max(0, (clientX - r.left) / r.width));
    return el.dataset.kind === 'line' ? Math.round(f * (n - 1)) : Math.floor(f * n);
  }

  function move(e) {
    const el = e.target.closest && e.target.closest('[data-chart]');
    if (!el) return;
    const i = indexAt(el, e.clientX);
    const box = card(el);
    const read = box && box.querySelector('[data-chart-read]');
    if (read) read.textContent = readFor(el, i);
    const cur = el.querySelector('[data-chart-cursor]');
    if (cur) {
      const n = split(el.dataset.values).length;
      const pos = el.dataset.kind === 'line' ? (i / (n - 1)) * 100 : ((i + 0.5) / n) * 100;
      cur.style.left = pos + '%';
      cur.style.display = 'block';
    }
  }

  function leave(e) {
    const el = e.target.closest && e.target.closest('[data-chart]');
    if (!el) return;
    const box = card(el);
    const read = box && box.querySelector('[data-chart-read]');
    if (read && read.dataset.chartDefault) read.textContent = read.dataset.chartDefault;
    const cur = el.querySelector('[data-chart-cursor]');
    if (cur) cur.style.display = 'none';
  }

  const num = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

  function bigChart(el) {
    const values = split(el.dataset.values).map(num);
    const cmp = split(el.dataset.cmpValues).map(num);
    const labels = split(el.dataset.labels);
    const n = values.length;
    const all = values.concat(cmp.length ? cmp : []);
    const min = Math.min.apply(null, all), max = Math.max.apply(null, all);
    const pad = (max - min) * 0.25 || 1;
    const lo = min - pad, hi = max + pad;
    const y = (v) => (100 - ((v - lo) / (hi - lo)) * 100).toFixed(2);
    const x = (i) => ((i / Math.max(1, n - 1)) * 100).toFixed(2);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;height:100%;min-height:0';
    const kind = el.dataset.kind;
    let inner = '';
    if (kind === 'line') {
      inner += '<polyline points="' + values.map((v, i) => x(i) + ',' + y(v)).join(' ') + '" fill="none" stroke="rgba(163,255,0,.55)" stroke-width="1.8" vector-effect="non-scaling-stroke"/>';
      if (cmp.length) inner += '<polyline points="' + cmp.map((v, i) => x(i) + ',' + y(v)).join(' ') + '" fill="none" stroke="#F5F5F7" stroke-width="2.2" vector-effect="non-scaling-stroke"/>';
    } else {
      const w = 100 / n;
      inner += values.map((v, i) => '<rect x="' + (i * w + w * 0.15).toFixed(2) + '" y="' + y(v) + '" width="' + (w * 0.7).toFixed(2) + '" height="' + (100 - y(v)) + '" fill="rgba(163,255,0,.45)"/>').join('');
      if (cmp.length) inner += '<polyline points="' + cmp.map((v, i) => (i * w + w / 2).toFixed(2) + ',' + y(v) + '" ').join(' ') + '" fill="none" stroke="#F5F5F7" stroke-width="2" vector-effect="non-scaling-stroke"/>';
    }
    wrap.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block">' + inner + '</svg>' +
      '<i data-chart-cursor style="position:absolute;top:0;bottom:0;width:1.5px;background:rgba(255,255,255,.55);display:none"></i>';
    const hit = document.createElement('div');
    hit.setAttribute('data-chart', el.dataset.chart);
    hit.dataset.kind = kind; hit.dataset.unit = el.dataset.unit || '';
    hit.dataset.labels = el.dataset.labels; hit.dataset.values = el.dataset.values;
    if (el.dataset.cmpValues) { hit.dataset.cmpValues = el.dataset.cmpValues; hit.dataset.cmpLabel = el.dataset.cmpLabel || ''; }
    hit.style.cssText = 'position:absolute;inset:0;cursor:crosshair';
    hit.appendChild(wrap.querySelector('[data-chart-cursor]'));
    wrap.appendChild(hit);
    return { wrap, labels, values: split(el.dataset.values) };
  }

  function expand(e) {
    const btn = e.target.closest && e.target.closest('[data-chart-expand]');
    if (!btn) return;
    const box = card(btn);
    const el = box && box.querySelector('[data-chart]');
    if (!el) return;
    const frame = box.closest('[data-screen-label]') || document.body;
    const mobile = /mobile/i.test(frame.getAttribute('data-screen-label') || '');
    const { wrap, labels, values } = bigChart(el);

    const ov = document.createElement('div');
    ov.setAttribute('data-chart-overlay', '');
    ov.style.cssText = 'position:absolute;inset:0;z-index:70;background:rgba(6,6,8,.76);backdrop-filter:blur(26px) saturate(140%);-webkit-backdrop-filter:blur(26px) saturate(140%);display:flex;flex-direction:column;padding:' + (mobile ? '20px 16px' : '22px 26px') + ";font-family:'Sora',system-ui,sans-serif";
    ov.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<span style="color:#F5F5F7;font:500 ' + (mobile ? '16px' : '18px') + " 'Sora'\">" + (el.dataset.chart || 'Grafico') + '</span>' +
        '<span style="color:#8E8E93;font:400 11.5px \'Sora\'">' + (el.dataset.hint || '') + '</span>' +
        '<span data-chart-close style="margin-left:auto;display:flex;color:#C7C7CC;cursor:pointer"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg></span>' +
      '</div>' +
      '<div data-chart-card style="margin-top:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;' + (mobile ? 'height:210px' : 'flex:1;min-height:0') + '">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="color:#8E8E93;font:400 11.5px \'Sora\'">passa col dito o col mouse per la lettura</span>' +
          '<span data-chart-read data-chart-default="' + (labels[labels.length - 1] || '') + ' · ' + (values[values.length - 1] || '') + ' ' + (el.dataset.unit || '') + '" style="margin-left:auto;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:4px 10px;color:#C7C7CC;font:500 12px \'Spline Sans Mono\'">' +
            (labels[labels.length - 1] || '') + ' · ' + (values[values.length - 1] || '') + ' ' + (el.dataset.unit || '') + '</span>' +
        '</div>' +
        '<div data-chart-slot style="flex:1;min-height:0"></div>' +
      '</div>' +
      '<div style="margin-top:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px">' +
        '<span style="color:#F5F5F7;font:500 13.5px \'Sora\'">Inserisci qui</span>' +
        '<div style="border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:10px 11px;color:#8E8E93;font:400 12px \'Sora\'">Valore di oggi' + (el.dataset.unit ? ' in ' + el.dataset.unit : '') + '</div>' +
        '<span style="text-align:center;background:#A3FF00;color:#0b1200;border-radius:10px;padding:10px;font:600 12.5px \'Sora\'">Salva</span>' +
      '</div>' +
      '<div style="margin-top:12px;flex:1;min-height:0;overflow-y:auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:5px">' +
        '<span style="color:#F5F5F7;font:500 13.5px \'Sora\'">Tutte le letture</span>' +
        labels.map((l, i) => '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:3px"><span style="color:#8E8E93;font:400 11.5px \'Sora\'">' + l + '</span><span style="color:#F5F5F7;font:500 11.5px \'Spline Sans Mono\'">' + values[i] + ' ' + (el.dataset.unit || '') + '</span></div>').reverse().join('') +
      '</div>';
    ov.querySelector('[data-chart-slot]').appendChild(wrap);
    if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
    frame.appendChild(ov);
  }

  function close(e) {
    const x = e.target.closest && e.target.closest('[data-chart-close]');
    if (!x) return;
    const ov = x.closest('[data-chart-overlay]');
    if (ov) ov.remove();
  }

  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerdown', move, true);
  document.addEventListener('pointerout', leave, true);
  document.addEventListener('click', (e) => { close(e); expand(e); }, true);
})();
