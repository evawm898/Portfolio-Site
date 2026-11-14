/* ---------------------------------------------------
   yarn-twist-ui.js — Yarn Characterization §03's interactive.
   All arithmetic is yarn-twist.js's (and yarn-count.js's); this file
   is DOM only. One state object, one render():

     kind   'staple' | 'filament'
     ne     the count, in Ne (the selector's values)
     tm     twist multiplier (cotton system) — the slider
     hold   'tm' | 'tpm' — what stays fixed when the count changes
     slack  the snarl panel: taut or let go

   Views: a side-on yarn whose surface fibres are drawn at the true
   helix angle (scaled to the yarn's own diameter), the schematic
   strength curves with a marker, four qualitative gauges, and the
   snarl loop.
--------------------------------------------------- */
import { fromTex, sig } from './yarn-count.js';
import {
  YARN_TYPES, TM_RANGE, TM_BANDS, tpmFromTm, tmFromTpm, tpiFromTpm, alphaTexFromTm,
  yarnDiameterMm, helixAngleDeg, relativeStrength, optimumTm, bandOf, qualities, snarls, toTex
} from './yarn-twist.js';

const NS = 'http://www.w3.org/2000/svg';
const COUNTS = [10, 20, 30, 40, 60];               // Ne

function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const a in attrs) e.setAttribute(a, attrs[a]);
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/* ---------- the yarn, side on ---------- */
function drawYarn(svg, st) {
  const W = 640, H = 136, cy = 68, x0 = 8, x1 = 632;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = '';
  const dens = YARN_TYPES[st.kind].density;
  const tex = toTex(st.ne, 'Ne');
  const dMax = yarnDiameterMm(toTex(COUNTS[0], 'Ne'), YARN_TYPES.staple.density);
  const r = 60 * yarnDiameterMm(tex, dens) / dMax;            // display radius, ∝ real d
  const theta = helixAngleDeg(tpmFromTm(st.tm, tex), tex, dens) * Math.PI / 180;
  const tanT = Math.tan(theta);

  // the yarn body
  el('rect', { x: x0, y: cy - r, width: x1 - x0, height: 2 * r, rx: Math.min(r, 6), class: 'yt-body' }, svg);

  // surface fibres: helices of radius r at angle θ; phase advances 2π per pitch
  const N = 14, pitch = tanT > 1e-6 ? (2 * Math.PI * r) / tanT : Infinity;
  const back = el('g', { class: 'yt-fibre yt-fibre--back' }, svg);
  const front = el('g', { class: 'yt-fibre yt-fibre--front' }, svg);
  for (let k = 0; k < N; k++) {
    const ph = (2 * Math.PI * k) / N;
    let seg = [], segFront = null;
    const flush = () => {
      if (seg.length > 1) el('polyline', { points: seg.join(' ') }, segFront ? front : back);
      seg = [];
    };
    for (let x = x0; x <= x1; x += 2) {
      const a = ph + (Number.isFinite(pitch) ? 2 * Math.PI * (x - x0) / pitch : 0);
      const isFront = Math.cos(a) >= 0;
      if (segFront !== null && isFront !== segFront) { const keep = seg[seg.length - 1]; flush(); seg.push(keep); }
      segFront = isFront;
      seg.push(x.toFixed(1) + ',' + (cy - r * Math.sin(a)).toFixed(1));
    }
    flush();
  }
  // staple: protruding fibre ends, fewer as twist binds them in
  if (st.kind === 'staple') {
    const q = qualities('staple', st.tm);
    const n = Math.round(46 * q.hairy);
    const g = el('g', { class: 'yt-hair' }, svg);
    for (let i = 0; i < n; i++) {
      const u = (i * 0.618034) % 1, side = i % 2 ? 1 : -1;
      const x = x0 + 10 + u * (x1 - x0 - 20), len = 6 + 10 * ((i * 0.381966) % 1);
      const ang = (side > 0 ? -1 : 1) * (0.5 + 0.5 * ((i * 0.7548) % 1));
      el('line', { x1: x, y1: cy + side * r, x2: x + len * Math.cos(ang) * 0.6, y2: cy + side * (r + len * 0.8) }, g);
    }
  }
  return { theta: theta * 180 / Math.PI, dMm: yarnDiameterMm(tex, dens) };
}

/* ---------- strength chart ---------- */
function drawChart(svg, st) {
  const W = 640, H = 270, L = 46, R = 620, T = 18, B = 214;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = '';
  const X = tm => L + (R - L) * (tm - TM_RANGE[0]) / (TM_RANGE[1] - TM_RANGE[0]);
  const Y = s => B - (B - T) * s;
  // usual TM bands (cotton system)
  TM_BANDS.forEach((b, i) => {
    el('rect', { x: X(b.from), y: T, width: X(b.to) - X(b.from), height: B - T, class: 'yt-band' + (i % 2 ? ' yt-band--alt' : '') }, svg);
    el('text', { x: (X(b.from) + X(b.to)) / 2, y: B + 30, class: 'yt-band-label', 'text-anchor': 'middle' }, svg, b.short);
  });
  // axes
  el('line', { x1: L, y1: B, x2: R, y2: B, class: 'yt-axis' }, svg);
  el('line', { x1: L, y1: T, x2: L, y2: B, class: 'yt-axis' }, svg);
  for (let tm = 0; tm <= 7; tm++) {
    el('line', { x1: X(tm), y1: B, x2: X(tm), y2: B + 4, class: 'yt-axis' }, svg);
    el('text', { x: X(tm), y: B + 15, class: 'yt-tick', 'text-anchor': 'middle' }, svg, String(tm));
  }
  el('text', { x: R, y: H - 4, class: 'yt-tick', 'text-anchor': 'end' }, svg, 'twist multiplier (TM, cotton system) →');
  el('text', { x: 12, y: T + 4, class: 'yt-tick', transform: 'rotate(-90 12 ' + (T + 4) + ')', 'text-anchor': 'end' }, svg, 'relative strength');
  // curves: staple solid indigo, filament dashed plum — line style AND label, not colour alone
  for (const kind of ['staple', 'filament']) {
    const pts = [];
    for (let i = 0; i <= 140; i++) { const tm = TM_RANGE[1] * i / 140; pts.push(X(tm).toFixed(1) + ',' + Y(relativeStrength(kind, tm)).toFixed(1)); }
    el('polyline', { points: pts.join(' '), class: 'yt-curve yt-curve--' + kind + (kind === st.kind ? ' is-active' : '') }, svg);
  }
  // legend, in the empty lower right (both curves sit high there): a line sample plus words,
  // so neither colour nor dash carries it alone
  [['staple', 'staple, solid'], ['filament', 'filament, dashed']].forEach(([kind, words], i) => {
    const ly = Y(0.32) + i * 17, lx = X(4.25);
    el('line', { x1: lx, y1: ly - 4, x2: lx + 28, y2: ly - 4, class: 'yt-legend yt-legend--' + kind }, svg);
    el('text', { x: lx + 36, y: ly, class: 'yt-curve-label' }, svg, words + ' · peak TM ' + sig(optimumTm(kind), 2));
  });
  // marker
  const s = relativeStrength(st.kind, st.tm);
  el('line', { x1: X(st.tm), y1: T, x2: X(st.tm), y2: B, class: 'yt-marker', 'data-yt-marker': st.tm.toFixed(2) }, svg);
  el('circle', { cx: X(st.tm), cy: Y(s), r: 5, class: 'yt-dot yt-dot--' + st.kind }, svg);
}

/* ---------- snarl ---------- */
function drawSnarl(svg, st) {
  svg.setAttribute('viewBox', '0 0 220 200');
  svg.innerHTML = '';
  const lively = snarls(st.tm) && st.kind === 'staple';
  if (!st.slack) {
    el('line', { x1: 110, y1: 14, x2: 110, y2: 186, class: 'yt-snarl-strand' }, svg);
    el('text', { x: 110, y: 198, class: 'yt-svg-label', 'text-anchor': 'middle' }, svg, 'held taut');
    return { lively, state: 'taut' };
  }
  if (!lively) {
    // an open loop: hangs without twisting on itself
    el('path', { d: 'M100,14 L100,110 C100,170 120,170 120,110 L120,14', class: 'yt-snarl-strand' }, svg);
    el('text', { x: 110, y: 198, class: 'yt-svg-label', 'text-anchor': 'middle' }, svg, 'slack: hangs open');
    return { lively, state: 'open' };
  }
  // the loop twists on itself: n crossings, more as twist rises
  const n = Math.max(2, Math.round((st.tm - 3.4) * 3));
  const top = 14, bot = 150, cx = 110, amp = 7;
  for (const sgn of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, y = top + (bot - top) * t;
      const x = cx + sgn * amp * Math.cos(Math.PI * n * t) * (0.4 + 0.6 * t);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    el('polyline', { points: pts.join(' '), class: 'yt-snarl-strand' }, svg);
  }
  el('path', { d: 'M' + (cx - amp) + ',' + bot + ' C' + (cx - amp - 6) + ',178 ' + (cx + amp + 6) + ',178 ' + (cx + amp) + ',' + bot, class: 'yt-snarl-strand' }, svg);
  el('text', { x: 110, y: 198, class: 'yt-svg-label', 'text-anchor': 'middle' }, svg, 'slack: it snarls (' + n + ' turns)');
  return { lively, state: 'snarl', turns: n };
}

/* ---------- wiring ---------- */
function init(root) {
  const st = { kind: 'staple', ne: 30, tm: 3.8, hold: 'tm', slack: false, note: '' };
  const $ = s => root.querySelector(s);
  const slider = $('[data-yt-tm]');
  const countSel = $('[data-yt-count]');
  const kindBtns = [...root.querySelectorAll('[data-yt-kind]')];
  const holdBtns = [...root.querySelectorAll('[data-yt-hold]')];
  const slackBtn = $('[data-yt-slack]');

  countSel.innerHTML = COUNTS.map(ne => {
    const tex = toTex(ne, 'Ne');
    return '<option value="' + ne + '">Ne ' + ne + ' · ' + sig(tex, 3) + ' tex · ' + sig(fromTex(tex, 'den'), 3) + ' D</option>';
  }).join('');

  function render() {
    const tex = toTex(st.ne, 'Ne');
    const tpm = tpmFromTm(st.tm, tex);
    const dens = YARN_TYPES[st.kind].density;
    slider.value = st.tm;
    countSel.value = String(st.ne);
    kindBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ytKind === st.kind)));
    holdBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ytHold === st.hold)));
    slackBtn.textContent = st.slack ? 'Pull it taut' : 'Let it go slack';
    slackBtn.setAttribute('aria-pressed', String(st.slack));

    const out = {
      tm: sig(st.tm, 3), tpm: sig(tpm, 3), tpi: sig(tpiFromTpm(tpm), 3), alpha: sig(alphaTexFromTm(st.tm), 3),
      theta: sig(helixAngleDeg(tpm, tex, dens), 3) + '°', band: bandOf(st.tm).label,
      strength: Math.round(100 * relativeStrength(st.kind, st.tm)) + '% of this curve’s peak',
      note: st.note || ''
    };
    for (const k in out) { const e = root.querySelector('[data-yt-out="' + k + '"]'); if (e) e.textContent = out[k]; }

    const yv = drawYarn($('[data-yt-yarn]'), st);
    $('[data-yt-out="yarncap"]').textContent = 'Surface fibres at θ = ' + sig(yv.theta, 3) + '° on a yarn ≈ ' + sig(yv.dMm, 2) +
      ' mm across (drawn to scale against Ne 10). Bright strokes are on the near side, dim ones behind.';
    drawChart($('[data-yt-chart]'), st);
    const q = qualities(st.kind, st.tm);
    for (const k of ['hand', 'lively', 'luster', 'hairy']) {
      const g = root.querySelector('[data-yt-gauge="' + k + '"]');
      if (!g) continue;
      const na = k === 'hairy' && st.kind === 'filament';
      g.style.setProperty('--v', na ? 0 : q[k]);
      g.closest('.yt-gauge').classList.toggle('is-na', na);
    }
    const sn = drawSnarl($('[data-yt-snarl]'), st);
    $('[data-yt-snarl-note]').textContent = st.kind === 'filament'
      ? 'Filament yarns are rarely twisted hard enough to snarl; the loop is drawn as a staple single.'
      : (sn.lively ? 'At this twist a single stores enough torque to kink back on itself when the tension goes.'
                   : 'At this twist the stored torque is too small to make the loop kink.');
    root.dataset.ytState = JSON.stringify({ kind: st.kind, ne: st.ne, tm: +st.tm.toFixed(4), hold: st.hold, slack: st.slack, snarl: sn.state, tpm: +tpm.toFixed(3) });
  }

  slider.addEventListener('input', () => { st.tm = Number(slider.value); st.note = ''; render(); });
  countSel.addEventListener('change', () => {
    const newNe = Number(countSel.value);
    if (st.hold === 'tpm') {
      // keep the turns, so the TM — and the angle — move with the count
      const tpm = tpmFromTm(st.tm, toTex(st.ne, 'Ne'));
      const want = tmFromTpm(tpm, toTex(newNe, 'Ne'));
      st.tm = Math.min(TM_RANGE[1], Math.max(TM_RANGE[0], want));
      st.note = want > TM_RANGE[1]
        ? '! the same turns on Ne ' + newNe + ' would be TM ' + sig(want, 3) + ' — past this chart, so the slider stops at 7'
        : 'same ' + sig(tpm, 3) + ' turns per metre, now TM ' + sig(st.tm, 3) + ' on Ne ' + newNe + ': the angle moved';
    } else {
      st.note = 'same TM on Ne ' + newNe + ': the turns per metre changed, the surface angle did not';
    }
    st.ne = newNe;
    render();
  });
  kindBtns.forEach(b => b.addEventListener('click', () => { st.kind = b.dataset.ytKind; render(); }));
  holdBtns.forEach(b => b.addEventListener('click', () => { st.hold = b.dataset.ytHold; render(); }));
  slackBtn.addEventListener('click', () => { st.slack = !st.slack; render(); });
  render();
}

const root = document.querySelector('[data-yt]');
if (root) init(root);
