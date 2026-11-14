/* ---------------------------------------------------
   yarn-fineness-ui.js — Yarn Characterization §05's splitter.
   All arithmetic is yarn-fineness.js's; this file is DOM only.

   One reference bundle (150D/48F) and one live bundle. The live one's
   filament count is the slider; its total denier is LOCKED to the
   reference unless the visitor unlocks it, in which case the panel
   says that two things moved at once.
--------------------------------------------------- */
import { sig } from './yarn-count.js';
import { bundle, ratios, packCircles, fineRisk, FILAMENT_STEPS, TOTALS } from './yarn-fineness.js';

const NS = 'http://www.w3.org/2000/svg';
const REF = { total: 150, n: 48 };
function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const a in attrs) e.setAttribute(a, attrs[a]);
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

function drawBundles(svg, ref, cur) {
  // side by side on a wide box; stacked on a phone, so the comparison is never off-screen
  const narrow = (svg.parentNode.clientWidth || 640) < 480;
  const W = narrow ? 320 : 640, H = narrow ? 600 : 300;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.dataset.yfLayout = narrow ? 'stacked' : 'side';
  svg.innerHTML = '';
  // one µm scale for both, sized so the larger of the two bundles fits its half
  const extent = b => { const p = packCircles(b.n, b.dUm / 2); return Math.max(...p.map(q => Math.hypot(q.x, q.y))) + b.dUm / 2; };
  const s = 118 / Math.max(extent(ref), extent(cur));     // px per µm
  const one = (b, cx, cy, cls, label) => {
    const g = el('g', { class: cls, 'data-yf-bundle': cls }, svg);
    for (const p of packCircles(b.n, b.dUm / 2)) el('circle', { cx: cx + p.x * s, cy: cy + p.y * s, r: Math.max(0.6, b.dUm / 2 * s - 0.4) }, g);
    el('text', { x: cx, y: cy + 140, class: 'yt-svg-label yf-label', 'text-anchor': 'middle' }, svg, label);
    el('text', { x: cx, y: cy + 156, class: 'yt-svg-label', 'text-anchor': 'middle' }, svg,
      sig(b.dpf, 3) + ' dpf · ' + sig(b.dUm, 3) + ' µm each');
  };
  if (narrow) {
    one(ref, 160, 160, 'yf-ref', 'reference ' + ref.totalDen + 'D/' + ref.n + 'F');
    one(cur, 160, 440 - 10, 'yf-cur', 'this yarn ' + cur.totalDen + 'D/' + cur.n + 'F');
  } else {
    one(ref, 160, 140, 'yf-ref', 'reference ' + ref.totalDen + 'D/' + ref.n + 'F');
    one(cur, 480, 140, 'yf-cur', 'this yarn ' + cur.totalDen + 'D/' + cur.n + 'F');
  }
  // a 20 µm scale bar
  const bar = 20 * s;
  const sx = narrow ? W - 30 - bar / 2 : W / 2;
  el('line', { x1: sx - bar / 2, y1: 20, x2: sx + bar / 2, y2: 20, class: 'yf-scale' }, svg);
  el('text', { x: sx, y: 14, class: 'yt-svg-label', 'text-anchor': 'middle' }, svg, '20 µm');
}

function init(root) {
  const st = { total: REF.total, n: REF.n, locked: true };
  const slider = root.querySelector('[data-yf-n]');
  const totalSel = root.querySelector('[data-yf-total]');
  const lockBtn = root.querySelector('[data-yf-lock]');
  slider.max = String(FILAMENT_STEPS.length - 1);
  totalSel.innerHTML = TOTALS.map(t => '<option value="' + t + '">' + t + ' D</option>').join('');
  const o = k => root.querySelector('[data-yf-o="' + k + '"]');

  function bar(k, ratio) {
    // a log-scale bar about 1: ×1/4 at the left edge, ×4 at the right
    const g = root.querySelector('[data-yf-bar="' + k + '"]');
    const x = Math.max(-1, Math.min(1, Math.log(ratio) / Math.log(4)));
    // the filled run goes from the ×1 tick to the value: left edge and width as fractions of the track
    g.style.setProperty('--l', String(0.5 + Math.min(0, x) * 0.5));
    g.style.setProperty('--w', String(Math.abs(x) * 0.5));
    g.dataset.yfX = x.toFixed(5);
    g.querySelector('.yf-bar__val').textContent = '×' + sig(ratio, 2);
  }

  function render() {
    slider.value = String(FILAMENT_STEPS.indexOf(st.n));
    totalSel.value = String(st.total);
    totalSel.disabled = st.locked;
    lockBtn.setAttribute('aria-pressed', String(st.locked));
    lockBtn.textContent = st.locked ? 'locked at 150 D' : 'unlocked';
    const ref = bundle(REF.total, REF.n), cur = bundle(st.total, st.n);
    drawBundles(root.querySelector('[data-yf-svg]'), ref, cur);
    o('n').textContent = String(st.n);
    o('dpf').textContent = sig(cur.dpf, 3) + ' (' + cur.cls.label + ')';
    o('d').textContent = sig(cur.dUm, 3) + ' µm';
    o('force').textContent = sig(cur.filForceCn, 3) + ' cN';
    const r = ratios(ref, cur);
    bar('stiff', r.bundleStiff); bar('surface', r.surfacePerMass); bar('cover', r.cover); bar('force', r.filForceCn);
    root.querySelector('[data-yf-risk]').style.setProperty('--v', fineRisk(cur.dpf));
    const two = st.total !== REF.total;
    o('note').textContent = two
      ? '! the total denier changed too (' + REF.total + ' → ' + st.total + ' D). Two things moved at once, so these ratios mix the effect of fineness with the effect of a lighter or heavier yarn.'
      : 'Same 150 D, split into ' + st.n + ' filaments: only the fineness changed, so every ratio is the effect of fineness alone.';
    root.dataset.yfState = JSON.stringify({ total: st.total, n: st.n, locked: st.locked, dpf: +cur.dpf.toFixed(5),
      stiff: +r.bundleStiff.toFixed(5), surface: +r.surfacePerMass.toFixed(5), circles: root.querySelectorAll('[data-yf-bundle="yf-cur"] circle').length });
  }
  slider.addEventListener('input', () => { st.n = FILAMENT_STEPS[Number(slider.value)]; render(); });
  totalSel.addEventListener('change', () => { st.total = Number(totalSel.value); render(); });
  let lastNarrow = null;
  window.addEventListener('resize', () => {
    const narrow = (root.querySelector('[data-yf-svg]').parentNode.clientWidth || 640) < 480;
    if (narrow !== lastNarrow) { lastNarrow = narrow; render(); }
  });
  lockBtn.addEventListener('click', () => {
    st.locked = !st.locked;
    if (st.locked) st.total = REF.total;       // locking puts the total back
    render();
  });
  render();
}

const root = document.querySelector('[data-yf]');
if (root) init(root);
