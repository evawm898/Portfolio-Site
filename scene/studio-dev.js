// scene/studio-dev.js — scene 4's `?dev=1` tuning harness, and its overlay.
//
// THIS IS THE ONE DOM MODULE IN THE SCENE, AND IT IS FENCED. It only ever
// touches the container the shell hands it (host.panel(), mounted inside the
// stage, so the shell's teardown removes it with the stage) and elements it
// created inside that container. It binds no listener on the window or the
// document, schedules nothing, and stops its own pointer, key and wheel events
// at the container so the shell never reads a slider drag as a click on a cat
// or a digit typed into a field as "go to scene 3".
//
// WHAT IT OFFERS, PER THE BRIEF:
//   force an edge      pick a cat and an edge; the cat routes to the edge's
//                      start by legal legs if it is not there, then takes it.
//   slow motion        a time scale on the simulation's own steps.
//   scrub, replay      the last leg is re-simulated from the snapshot taken as
//                      it began, so the scrubbed cat is the cat that jumped.
//   the overlay        the perch graph (node areas, typed edges) and the live
//                      ballistic arc with its apex and the landing surface.
//   timing, live       every TIMING range as two numbers, written straight into
//                      the object the planner reads on the next jump.

import { NODES, EDGES } from './studio-room.js';
import { H_STAND } from './studio-cat.js';

const TEAL = '#1f6f68', AMBER = '#b0632a', ROSE = '#a3365a';

export function mountDev(el, api) {
  const doc = el.ownerDocument;
  for (const t of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'wheel', 'touchstart', 'touchmove', 'touchend']) {
    el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
  }
  const style = doc.createElement('style');
  style.textContent = `
    .scene-dev{position:absolute;left:10px;top:52px;z-index:3;width:300px;max-height:calc(100% - 64px);overflow:auto;
      background:rgba(248,247,244,.94);color:#222;font:11px/1.35 "IBM Plex Mono",ui-monospace,monospace;border:1px solid #9a958d;
      padding:8px 10px;cursor:auto;touch-action:auto;pointer-events:auto}
    .scene-dev h4{margin:6px 0 3px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#555}
    .scene-dev select,.scene-dev button,.scene-dev input{font:inherit}
    .scene-dev .row{display:flex;gap:6px;align-items:center;margin:2px 0}
    .scene-dev .row label{flex:1}
    .scene-dev input[type=number]{width:58px}
    .scene-dev .ro{white-space:pre-wrap;background:#fff;border:1px solid #ddd;padding:4px;margin-top:4px;min-height:3em}
    .scene-dev table{border-collapse:collapse;width:100%}
    .scene-dev td{padding:1px 2px}`;
  el.appendChild(style);

  const mk = (tag, props = {}, parent = el) => {
    const n = doc.createElement(tag);
    Object.assign(n, props);
    parent.appendChild(n);
    return n;
  };
  const row = (parent = el) => mk('div', { className: 'row' }, parent);

  mk('h4', { textContent: 'dev — studio bay window' });
  // --- force an edge
  mk('h4', { textContent: 'force an edge' });
  let r = row();
  const catSel = mk('select', {}, r);
  ['0 ink', '1 soot'].forEach((t, i) => mk('option', { value: String(i), textContent: t }, catSel));
  const edgeSel = mk('select', {}, r);
  for (const e of EDGES) mk('option', { value: e.id, textContent: `${e.id} (${e.type} ${e.rise >= 0 ? '+' : ''}${e.rise})` }, edgeSel);
  const go = mk('button', { textContent: 'go' }, r);
  const status = mk('div', { className: 'ro', textContent: 'spontaneous moves are held while dev is open' });
  go.addEventListener('click', () => { status.textContent = api.force(Number(catSel.value), edgeSel.value); });
  r = row();
  const hold = mk('input', { type: 'checkbox', checked: true }, mk('label', { textContent: 'hold spontaneous moves ' }, r));
  api.hold(true);
  hold.addEventListener('change', () => api.hold(hold.checked));

  // --- time
  mk('h4', { textContent: 'time' });
  r = row();
  mk('label', { textContent: 'slow motion' }, r);
  const ts = mk('input', { type: 'range', min: '0.03', max: '1', step: '0.01', value: '1' }, r);
  const tsv = mk('span', { textContent: '1.00x' }, r);
  ts.addEventListener('input', () => { api.dev.timeScale = Number(ts.value); tsv.textContent = Number(ts.value).toFixed(2) + 'x'; });
  r = row();
  mk('label', { textContent: 'scrub last leg' }, r);
  const scrub = mk('input', { type: 'range', min: '0', max: '1', step: '0.001', value: '0' }, r);
  const scv = mk('span', { textContent: '—' }, r);
  scrub.addEventListener('input', () => {
    const L = api.legLength();
    if (!L) { scv.textContent = 'no leg yet'; return; }
    const out = api.scrub(Number(scrub.value) * L);
    scv.textContent = `${Math.round(out.t * 1000)} ms ${out.phase}`;
  });
  r = row();
  mk('button', { textContent: 'replay last jump' }, r).addEventListener('click', () => { api.replay(); });
  mk('button', { textContent: 'resume' }, r).addEventListener('click', () => { api.resume(); });

  // --- overlay
  mk('h4', { textContent: 'overlay' });
  r = row();
  const og = mk('input', { type: 'checkbox', checked: false }, mk('label', { textContent: 'perch graph ' }, r));
  const oa = mk('input', { type: 'checkbox', checked: true }, mk('label', { textContent: 'ballistic arc ' }, r));
  og.addEventListener('change', () => { api.dev.overlay.graph = og.checked; });
  oa.addEventListener('change', () => { api.dev.overlay.arc = oa.checked; });

  // --- the last leg, measured
  mk('h4', { textContent: 'last leg, measured' });
  const ro = mk('div', { className: 'ro', textContent: '—' });
  mk('button', { textContent: 'measure' }, row()).addEventListener('click', () => {
    const L = api.legLength();
    const D = api.D, last = D.lastLeg;
    if (!last) { ro.textContent = 'no leg yet'; return; }
    const ph = last.phases || [];
    const lines = [`${last.edge}  (${Math.round(L * 1000)} ms)`];
    for (let k = 0; k < ph.length; k++) {
      const next = k + 1 < ph.length ? ph[k + 1][1] : L;
      lines.push(`  ${ph[k][0].padEnd(9)} ${Math.round((next - ph[k][1]) * 1000)} ms`);
    }
    const fc = (last.contacts || []).find(c => c[0] === 'foreContact'), hc = (last.contacts || []).find(c => c[0] === 'hindContact');
    if (fc && hc) lines.push(`  fore -> hind contact ${Math.round((hc[1] - fc[1]) * 1000)} ms`);
    const arc = last.arc;
    if (arc && arc.kind === 'up') lines.push(`  apex ${((arc.ya - H_STAND - arc.dstY) / arc.rise * 100).toFixed(1)}% of the rise above the landing`);
    ro.textContent = lines.join('\n');
  });

  // --- timing, live
  mk('h4', { textContent: 'timing ranges (ms), live' });
  const tbl = mk('table');
  for (const k of Object.keys(api.TIMING)) {
    const tr = mk('tr', {}, tbl);
    mk('td', { textContent: k }, tr);
    for (const j of [0, 1]) {
      const inp = mk('input', { type: 'number', value: String(api.TIMING[k][j]), step: '10' }, mk('td', {}, tr));
      inp.addEventListener('change', () => {
        const v = Number(inp.value);
        if (Number.isFinite(v) && v >= 0) api.TIMING[k][j] = v;
        if (api.TIMING[k][0] > api.TIMING[k][1]) api.TIMING[k][1 - j] = v;
      });
    }
  }
  mk('h4', { textContent: 'chances (0-1), live' });
  const tb2 = mk('table');
  for (const k of Object.keys(api.CHANCE)) {
    const tr = mk('tr', {}, tb2);
    mk('td', { textContent: k }, tr);
    const inp = mk('input', { type: 'number', value: String(api.CHANCE[k]), step: '0.05', min: '0', max: '1' }, mk('td', {}, tr));
    inp.addEventListener('change', () => { const v = Number(inp.value); if (v >= 0 && v <= 1) api.CHANCE[k] = v; });
  }
}

// ---------------------------------------------------------------- overlay --
function areaOutline(n) {
  const a = n.area;
  if (a.kind === 'rect') return [[a.x0, a.z0], [a.x1, a.z0], [a.x1, a.z1], [a.x0, a.z1]];
  if (a.kind === 'disk') return Array.from({ length: 24 }, (_, i) => [a.x + a.r * Math.cos(i / 24 * 2 * Math.PI), a.z + a.r * Math.sin(i / 24 * 2 * Math.PI)]);
  if (a.kind === 'ledge') return a.path;
  return a.pts;
}

export function drawOverlay(ctx, view, D, opts) {
  ctx.save();
  ctx.lineWidth = 1.5;
  if (opts.graph) {
    for (const id of Object.keys(NODES)) {
      const n = NODES[id], pts = areaOutline(n);
      ctx.beginPath();
      pts.forEach(([x, z], i) => { const p = view.p(x, n.y, z); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      if (n.area.kind !== 'ledge') ctx.closePath();
      ctx.strokeStyle = TEAL; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      const q = view.p(c[0], n.y, c[1]);
      ctx.fillStyle = TEAL; ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillText(id, q.x + 3, q.y - 3);
    }
    for (const e of EDGES) {
      const a = view.p(e.launch[0], NODES[e.from].y, e.launch[1]);
      const b = view.p(e.land[0], NODES[e.to].y, e.land[1]);
      const m = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 18 };
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, b.x, b.y);
      ctx.strokeStyle = e.type === 'up' ? AMBER : e.type === 'down' ? ROSE : TEAL;
      ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    }
  }
  if (opts.arc) {
    for (const cat of D.cats) {
      const A = cat.lastArc;
      if (!A) continue;
      const W = (s, y) => view.p(A.O[0] + A.f[0] * s, y, A.O[1] + A.f[1] * s);
      const at = (t) => {
        const s = A.sL + A.Dh * (1 - Math.exp(-0.55 * t)) / (1 - Math.exp(-0.55 * A.T));
        const y = A.yL + A.vy0 * t - 0.5 * A.g * t * t;
        return [s, y];
      };
      // the body centre's path, and the arc reference under it
      for (const [off, col, dash] of [[0, AMBER, []], [-H_STAND, ROSE, [3, 3]]]) {
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const [s, y] = at(A.T * k / 40); const p = W(s, y + off); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
      }
      const end = at(A.T);
      // the landing surface, along the jump line
      const l0 = W(end[0] - 30, A.dstY), l1 = W(end[0] + 20, A.dstY);
      ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.strokeStyle = TEAL; ctx.stroke();
      if (A.kind === 'up') {
        const tA = A.vy0 / A.g, ap = at(tA);
        const p = W(ap[0], ap[1] - H_STAND);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = ROSE; ctx.fill();
        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.fillText(`apex +${((A.ya - H_STAND - A.dstY) / A.rise * 100).toFixed(0)}%`, p.x + 5, p.y - 4);
      }
    }
  }
  ctx.restore();
}
