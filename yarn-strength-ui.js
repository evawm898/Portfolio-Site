/* ---------------------------------------------------
   yarn-strength-ui.js — Yarn Characterization §04's three tools.
   All arithmetic is yarn-strength.js's; this file is DOM only.

     [data-ys-units]   tenacity converter (cN/dtex, cN/tex, gf/den, GPa)
     [data-ys-table]   the typical-values table, rendered from TYPICAL
     [data-ys-curve]   the stress–strain explorer: presets + levers
     [data-ys-weak]    the weakest-link demonstration
--------------------------------------------------- */
import { sig } from './yarn-count.js';
import {
  TYPICAL, PRESETS, DRAW, gpdToCnDtex, cnDtexToGpd, cnDtexToGpa, curveParams, stressAt,
  breakPoint, workOfRupture, workToJg, weakLinkMean, FLAW_FRACTION
} from './yarn-strength.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const a in attrs) e.setAttribute(a, attrs[a]);
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const pct = x => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + '%';

/* ---------- tenacity converter ---------- */
function initUnits(root) {
  const input = root.querySelector('[data-ys-ten]');
  const unit = root.querySelector('[data-ys-unit]');
  const fibre = root.querySelector('[data-ys-fibre]');
  fibre.innerHTML = TYPICAL.map((t, i) => '<option value="' + i + '">' + t.name + ' · ' + t.density + ' g/cm³</option>').join('');
  fibre.value = '4';                                   // polyester, textile
  const out = k => root.querySelector('[data-ys-o="' + k + '"]');
  function render() {
    const v = Number(input.value);
    const cnd = !(v > 0) ? NaN : unit.value === 'cndtex' ? v : unit.value === 'cntex' ? v / 10 : gpdToCnDtex(v);
    const rho = TYPICAL[Number(fibre.value)].density;
    if (!Number.isFinite(cnd)) {
      for (const k of ['cndtex', 'cntex', 'gpd', 'gpa']) out(k).textContent = '—';
      out('status').textContent = '! enter a positive number';
      return;
    }
    out('cndtex').textContent = sig(cnd, 3);
    out('cntex').textContent = sig(cnd * 10, 3);
    out('gpd').textContent = sig(cnDtexToGpd(cnd), 3);
    out('gpa').textContent = sig(cnDtexToGpa(cnd, rho), 3);
    out('status').textContent = 'At ' + rho + ' g/cm³, ' + sig(cnd, 3) + ' cN/dtex is a stress of ' + sig(cnDtexToGpa(cnd, rho), 3) +
      ' GPa — the same tenacity is a higher stress in a denser fibre.';
  }
  input.addEventListener('input', render);
  unit.addEventListener('change', render);
  fibre.addEventListener('change', render);
  input.value = '4.5'; unit.value = 'gpd';
  render();
}

/* ---------- typical table ---------- */
function initTable(tbody) {
  tbody.innerHTML = TYPICAL.map(t =>
    '<tr><th scope="row">' + t.name + '</th><td>' + t.ten[0] + '–' + t.ten[1] + '</td><td>' +
    sig(cnDtexToGpd(t.ten[0]), 2) + '–' + sig(cnDtexToGpd(t.ten[1]), 2) + '</td><td>' +
    t.elong[0] + '–' + t.elong[1] + '</td></tr>').join('');
}

/* ---------- stress–strain explorer ---------- */
function drawCurves(svg, base, cur) {
  const W = 640, H = 300, L = 54, R = 620, T = 16, B = 254;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = '';
  const bb = breakPoint(base), bc = breakPoint(cur);
  const xMax = Math.max(base.Eb, cur.Eb) * 1.12;
  const yMax = Math.max(base.Tb, cur.Tb) * 1.18;
  const X = e => L + (R - L) * e / xMax, Y = s => B - (B - T) * s / yMax;
  // grid + axes
  const yStep = yMax > 6 ? 2 : yMax > 2.5 ? 1 : yMax > 1 ? 0.5 : 0.2;
  for (let y = 0; y <= yMax; y += yStep) {
    el('line', { x1: L, y1: Y(y), x2: R, y2: Y(y), class: 'ys-grid' }, svg);
    el('text', { x: L - 6, y: Y(y) + 3.5, class: 'yt-tick', 'text-anchor': 'end' }, svg, sig(y, 2));
  }
  const xPctMax = xMax * 100;
  const xStep = xPctMax > 300 ? 100 : xPctMax > 30 ? 10 : xPctMax > 12 ? 2 : 1;
  for (let x = 0; x <= xPctMax; x += xStep) {
    el('line', { x1: X(x / 100), y1: B, x2: X(x / 100), y2: B + 4, class: 'yt-axis' }, svg);
    el('text', { x: X(x / 100), y: B + 16, class: 'yt-tick', 'text-anchor': 'middle' }, svg, x + '%');
  }
  el('line', { x1: L, y1: B, x2: R, y2: B, class: 'yt-axis' }, svg);
  el('line', { x1: L, y1: T, x2: L, y2: B, class: 'yt-axis' }, svg);
  el('text', { x: R, y: H - 6, class: 'yt-tick', 'text-anchor': 'end' }, svg, 'elongation →');
  el('text', { x: 12, y: T + 4, class: 'yt-tick', transform: 'rotate(-90 12 ' + (T + 4) + ')', 'text-anchor': 'end' }, svg, 'tenacity, cN/dtex');

  const path = (c, eEnd) => {
    const pts = [];
    for (let i = 0; i <= 160; i++) { const e = eEnd * i / 160; pts.push(X(e).toFixed(1) + ',' + Y(stressAt(c, e)).toFixed(1)); }
    return pts;
  };
  // work of rupture: the area under the current curve to its break
  const area = path(cur, bc.eps);
  el('polygon', { points: X(0) + ',' + Y(0) + ' ' + area.join(' ') + ' ' + X(bc.eps) + ',' + Y(0), class: 'ys-area' }, svg);
  // the preset as it ships, dashed and dim, whenever a lever has moved it
  const moved = cur.notes.length > 0;
  if (moved) {
    el('polyline', { points: path(base, bb.eps).join(' '), class: 'ys-ghost', 'data-ys-ghost': '' }, svg);
    el('text', { x: X(bb.eps) - 8, y: Y(bb.sigma) + 18, class: 'ys-ghost-label', 'text-anchor': 'end' }, svg, 'as it started');
  }
  el('polyline', { points: area.join(' '), class: 'ys-curve', 'data-ys-curve': '' }, svg);
  // initial modulus: the tangent at the origin, drawn to a fifth of the height
  const tE = Math.min(xMax, (yMax * 0.45) / cur.M);
  el('line', { x1: X(0), y1: Y(0), x2: X(tE), y2: Y(cur.M * tE), class: 'ys-tangent' }, svg);
  // the break: a cross, plus words
  const bx = X(bc.eps), by = Y(bc.sigma);
  el('path', { d: 'M' + (bx - 6) + ',' + (by - 6) + 'L' + (bx + 6) + ',' + (by + 6) + 'M' + (bx + 6) + ',' + (by - 6) + 'L' + (bx - 6) + ',' + (by + 6), class: 'ys-break', 'data-ys-break': bc.eps.toFixed(5) }, svg);
  el('text', { x: bx - 8, y: by - 10, class: 'ys-break-label', 'text-anchor': 'end' }, svg, cur.flaw ? 'breaks at the weak place' : 'break');
}

function initCurve(root) {
  const st = { preset: 'pet', draw: 'standard', heatset: false, twist: 'standard', flaw: false };
  const svg = root.querySelector('[data-ys-chart]');
  const btns = sel => [...root.querySelectorAll(sel)];
  const o = k => root.querySelector('[data-ys-r="' + k + '"]');

  function render() {
    const P = PRESETS[st.preset];
    btns('[data-ys-preset]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ysPreset === st.preset)));
    btns('[data-ys-draw]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.ysDraw === st.draw)); b.disabled = !P.synthetic; });
    btns('[data-ys-twist]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.ysTwist === st.twist)); b.disabled = !P.spun; });
    const hs = root.querySelector('[data-ys-heatset]'), fl = root.querySelector('[data-ys-flaw]');
    hs.setAttribute('aria-pressed', String(st.heatset)); hs.disabled = !P.synthetic;
    fl.setAttribute('aria-pressed', String(st.flaw));
    root.querySelector('[data-ys-lever="draw"]').classList.toggle('is-off', !P.synthetic);
    root.querySelector('[data-ys-lever="heat"]').classList.toggle('is-off', !P.synthetic);
    root.querySelector('[data-ys-lever="twist"]').classList.toggle('is-off', !P.spun);

    const base = curveParams(st.preset);
    const cur = curveParams(st.preset, st);
    drawCurves(svg, base, cur);
    const bb = breakPoint(base), bc = breakPoint(cur);
    const wB = workOfRupture(base), wC = workOfRupture(cur);
    const d = (a, b) => cur.notes.length ? '  (' + pct(a / b - 1) + ')' : '';
    o('ten').textContent = sig(bc.sigma, 3) + ' cN/dtex · ' + sig(cnDtexToGpd(bc.sigma), 3) + ' g/den' + d(bc.sigma, bb.sigma);
    o('elong').textContent = sig(bc.eps * 100, 3) + '%' + d(bc.eps, bb.eps);
    o('work').textContent = '≈ ' + sig(workToJg(wC), 2) + ' J/g' + d(wC, wB);
    o('stiff').textContent = sig(cur.stiff, 2) + '× textile polyester' + d(cur.stiff, base.stiff);
    const why = [];
    if (!P.synthetic && !P.spun) why.push('Elastane is spun and set differently; draw, heat setting and twist are not offered for it.');
    if (P.spun) why.push('A spun yarn: draw ratio and heat setting are fibre-making levers, so they are off here; twist is the yarn-making one.');
    if (P.synthetic) why.push('A filament yarn: twist is off here (section 03 shows filament barely uses it).');
    if (st.flaw) why.push('The weak place carries ' + Math.round(FLAW_FRACTION * 100) + '% of the sound yarn’s load, so the whole specimen breaks there, early, with less stretch and far less work.');
    o('why').textContent = why.join(' ');
    root.dataset.ysState = JSON.stringify({ preset: st.preset, draw: st.draw, heatset: st.heatset, twist: st.twist, flaw: st.flaw,
      Tb: +bc.sigma.toFixed(4), Eb: +bc.eps.toFixed(5), baseTb: +bb.sigma.toFixed(4), baseEb: +bb.eps.toFixed(5), work: +wC.toFixed(5) });
  }
  btns('[data-ys-preset]').forEach(b => b.addEventListener('click', () => { st.preset = b.dataset.ysPreset; render(); }));
  btns('[data-ys-draw]').forEach(b => b.addEventListener('click', () => { st.draw = b.dataset.ysDraw; render(); }));
  btns('[data-ys-twist]').forEach(b => b.addEventListener('click', () => { st.twist = b.dataset.ysTwist; render(); }));
  root.querySelector('[data-ys-heatset]').addEventListener('click', () => { st.heatset = !st.heatset; render(); });
  root.querySelector('[data-ys-flaw]').addEventListener('click', () => { st.flaw = !st.flaw; render(); });
  render();
}

/* ---------- weakest link ---------- */
function initWeak(root) {
  const cvIn = root.querySelector('[data-ys-cv]');
  const nIn = root.querySelector('[data-ys-gauge]');
  const svg = root.querySelector('[data-ys-weak-chart]');
  const o = k => root.querySelector('[data-ys-w="' + k + '"]');
  const NMAX = 50;
  function render() {
    const cv = Number(cvIn.value) / 100, n = Number(nIn.value);
    const W = 640, H = 220, L = 54, R = 620, T = 14, B = 180;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    const X = k => L + (R - L) * (k - 1) / (NMAX - 1), Y = v => B - (B - T) * (v - 0.4) / 0.65;
    for (let v = 0.4; v <= 1.05001; v += 0.1) {
      el('line', { x1: L, y1: Y(v), x2: R, y2: Y(v), class: 'ys-grid' }, svg);
      el('text', { x: L - 6, y: Y(v) + 3.5, class: 'yt-tick', 'text-anchor': 'end' }, svg, Math.round(v * 100) + '%');
    }
    for (const k of [1, 10, 20, 30, 40, 50]) el('text', { x: X(k), y: B + 16, class: 'yt-tick', 'text-anchor': 'middle' }, svg, String(k));
    el('text', { x: R, y: H - 4, class: 'yt-tick', 'text-anchor': 'end' }, svg, 'gauge length, in segments →');
    el('line', { x1: L, y1: B, x2: R, y2: B, class: 'yt-axis' }, svg);
    const pts = [];
    for (let k = 1; k <= NMAX; k++) pts.push(X(k).toFixed(1) + ',' + Y(weakLinkMean(cv, k)).toFixed(1));
    el('polyline', { points: pts.join(' '), class: 'ys-curve' }, svg);
    const here = weakLinkMean(cv, n);
    el('circle', { cx: X(n), cy: Y(here), r: 5, class: 'yt-dot yt-dot--staple' }, svg);
    o('cv').textContent = Math.round(cv * 100) + '%';
    o('n').textContent = String(n);
    o('read').textContent = 'A test over ' + n + ' segment' + (n > 1 ? 's' : '') + ' reads, on average, ' + Math.round(here * 100) +
      '% of a segment’s mean strength' + (cv === 0 ? ' — with no variation there is no weak place to find.' : '. The longer the gauge, the likelier a weak place is inside it.');
    root.dataset.ysWeak = JSON.stringify({ cv, n, mean: +here.toFixed(5) });
  }
  cvIn.addEventListener('input', render);
  nIn.addEventListener('input', render);
  render();
}

const u = document.querySelector('[data-ys-units]'); if (u) initUnits(u);
const t = document.querySelector('[data-ys-table]'); if (t) initTable(t);
const c = document.querySelector('[data-ys-curve]'); if (c) initCurve(c);
const w = document.querySelector('[data-ys-weak]'); if (w) initWeak(w);
