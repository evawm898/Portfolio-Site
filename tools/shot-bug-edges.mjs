#!/usr/bin/env node
/* shot-bug-edges.mjs <dir> — the contact sheet for the /bug EDGES + EDITOR pass
   (bug-project-design-doc.md §10).

   Sections:
     edge   close-ups of the default wing's edge, the OLD chamfer (4 mm ramp to
            the floor and a 1 mm square wall: the elegance default) beside the
            NEW bullnose — on the outer margin AND on a HOLES cell rim — and the
            edge SECTIONS drawn from the EMITTED vertices (the bead rings read
            back off the model: no profile is drawn from a formula);
     rods   the HOLES veins as near-round rods: sections across a vein drawn
            from the two facing beads' emitted vertices, at the root and at the
            narrowest vein, beside a 1 mm floor circle; and the floor rows;
     bug    the default bug in 3D at 3/4 with the bullnose, in HOLES and RIDGES;
     page   the page itself: as it loads (Top view), after a REAL click of the
            SVG toggle, the on-wing editor active on a TILTED hindwing displayed
            flat (with the same pair at 3/4 for its tilt), a REAL pointer drag
            on it measured against where the emitted bead apex landed, and
            tracing over a reference backdrop loaded through the real file
            input (a synthetic stand-in: no photograph is in the repository).
   No pixel claim anywhere: every number is read off the model or the page. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-edges-sheet');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());

const D = () => G.defaultParams();
const set = (fn) => { const p = D(); fn(p); return p; };
const png = async () => (await page.screenshot({ type: 'png' })).toString('base64');
const out = { edge: [], rods: [], bug: [], page: [] };
const facts = {};

/* ---------- the page as it LOADS ---------- */
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
await page.waitForTimeout(400);
out.page.push({ label: 'the page as it loads — the TOP view (3/4, Front and Side are one click away)', img: await png(), note: `view on load: ${await page.evaluate(() => document.querySelector('#viewButtons .is-on').dataset.view)} · main viewport: ${await page.evaluate(() => window.__bug.mainMode())}` });

/* ---------- edge close-ups (3D) ---------- */
const HIDE = '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}';
const hide = await page.addStyleTag({ content: HIDE });
const show = (css) => hide.evaluate((n, c) => { n.textContent = c; }, css);
async function setParams(p) { await page.evaluate((q) => window.__bug.setParams(q), p); await page.evaluate(() => window.__bug.flushBuild()); }
/* the right forewing's trailing margin at 60% of the span: the outline vertex
   (the bead's apex where there is one) nearest that span, low from behind */
function marginTarget(params) {
  const m = G.buildBug(params), P = m.positions, q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R');
  let x0 = Infinity, x1 = -Infinity; for (let v = q.v0; v < q.v1; v++) { x0 = Math.min(x0, P[3 * v]); x1 = Math.max(x1, P[3 * v]); }
  const xs = x0 + 0.6 * (x1 - x0);
  let best = null, by = Infinity;
  for (const [t] of q.meta.edgePairs.outline) if (Math.abs(P[3 * t] - xs) < 0.6 && P[3 * t + 1] < by) { by = P[3 * t + 1]; best = t; }
  return { target: [P[3 * best], P[3 * best + 1], P[3 * best + 2]], dir: [0.9, -0.75, 0.35], dist: 6 };
}
/* a HOLES cell rim: the hole of the right forewing whose centre is nearest mid-wing */
function holeTarget(params) {
  const m = G.buildBug(params), P = m.positions, q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R');
  const B = q.meta.bead, rings = B ? B.rings : null;
  const holes = q.meta.venation.cells.filter((c) => c.holes.length);
  const h = holes.reduce((a, c) => { const cx = c.holes[0].reduce((s, p) => s + p[0], 0) / c.holes[0].length; return Math.abs(cx - 18) < Math.abs(a.cx - 18) ? { c, cx } : a; }, { c: holes[0], cx: Infinity }).c.holes[0];
  // the world position of the hole's lowest-w vertex: through its bead apex, or its top-skin rim vertex
  const lo = h.reduce((a, p) => (p[1] < a[1] ? p : a));
  let v;
  if (rings) v = rings.find((r) => r.apex[0] === lo[0] && r.apex[1] === lo[1]).ids[B.K / 2];
  else v = q.v0 + q.meta.slab.uw.findIndex((p) => p[0] === lo[0] && p[1] === lo[1]);
  return { target: [P[3 * v], P[3 * v + 1], P[3 * v + 2]], dir: [0.3, 0.9, 0.75], dist: 8 };
}
async function closeUp(label, params, tgt, sec, extra = {}) {
  await setParams(params);
  await page.evaluate(() => window.__bug.setView('three'));
  await page.evaluate((c) => window.__bug.lookAt(c.target, c.dir, c.dist), tgt);
  out[sec].push({ label, img: await png(), tris: await page.evaluate(() => window.__bug.triangleCount()), ...extra });
}
const OLD = set((p) => { p.wingEdgeBevel = 4; p.wingEdgeRound = 0; });
await closeUp('OLD — outer margin: 4 mm chamfer down to the floor, then a 1 mm square wall', OLD, marginTarget(OLD), 'edge');
await closeUp('NEW — outer margin: full bullnose (half-round bead), no wall', D(), marginTarget(D()), 'edge');
const OLDH = set((p) => { p.venation = 'holes'; p.wingEdgeBevel = 4; p.wingEdgeRound = 0; });
const NEWH = set((p) => { p.venation = 'holes'; });
await closeUp('OLD — a HOLES cell rim: square wall', OLDH, holeTarget(OLDH), 'edge');
await closeUp('NEW — a HOLES cell rim: bullnose', NEWH, holeTarget(NEWH), 'edge');

/* ---------- edge SECTIONS from the emitted vertices ---------- */
/* a bead ring in its own frame: x along D (toward the apex), y along V (up);
   with the skin drawn inward from the ring's top / bottom vertex to the next
   rim-normal sample of the skin (the slab's own T/B pair at 1.5 mm in). */
function beadSection(m, pickRing) {
  const q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R'), P = m.positions, V3 = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  const B = q.meta.bead, r = pickRing(B.rings);
  const top = V3(r.ids[0]), bot = V3(r.ids[B.K]), M = top.map((x, d) => (x + bot[d]) / 2);
  const Vv = top.map((x, d) => x - M[d]), Dv = V3(r.ids[B.K / 2]).map((x, d) => x - M[d]);
  const Vn = Math.hypot(...Vv), Dn = Math.hypot(...Dv), vh = Vv.map((x) => x / Vn), dh = Dv.map((x) => x / Dn);
  const pts = r.ids.map((v) => { const X = V3(v).map((x, d) => x - M[d]); return [X.reduce((s, x, d) => s + x * dh[d], 0), X.reduce((s, x, d) => s + x * vh[d], 0)]; });
  return { pts, a: Dn, H: Vn, apex: r.apex };
}
function squareSection(params) {
  // the old edge: the edge law restated (taper + chamfer) at the outline point's span, the wall at the outline
  const m = G.buildBug(params), q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R');
  const P = m.positions, [t, b] = q.meta.edgePairs.outline[Math.floor(q.meta.edgePairs.outline.length / 3)];
  const T = Math.hypot(P[3 * t] - P[3 * b], P[3 * t + 1] - P[3 * b + 1], P[3 * t + 2] - P[3 * b + 2]);
  const floor = params.minDiameter, body = 1.8 * (1 - 0.5 * 0.6), bevel = params.wingEdgeBevel;
  const prof = []; for (let d = 0; d <= 3.5; d += 0.05) prof.push([-d, (bevel > 0 && d < bevel ? floor + (body - floor) * (d / bevel) : body) / 2]);
  return { prof, wall: T };
}
const sectSvg = (lab, s) => {
  const S = 60, W = 300, H = 170, ox = 230, oy = 85;   // 60 px / mm
  const X = (x) => (ox + x * S).toFixed(1), Y = (y) => (oy - y * S).toFixed(1);
  let d = '';
  if (s.prof) {
    const top = s.prof.slice().reverse();       // from 3.5 mm inside out to the outline
    d += `<path d="M${top.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}L${X(0)} ${Y(-s.prof[0][1])}${s.prof.map(([x, y]) => `L${X(x)} ${Y(-y)}`).join('')}" fill="none" stroke="#0A0A0C" stroke-width="1.6"/>`;
    d += `<path d="M${X(0)} ${Y(s.prof[0][1])}L${X(0)} ${Y(-s.prof[0][1])}" stroke="#e5484d" stroke-width="2.4"/>`;
  } else {
    const ring = s.pts;
    d += `<path d="M${X(-3.5)} ${Y(s.H)}L${ring.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}L${X(-3.5)} ${Y(-s.H)}" fill="none" stroke="#0A0A0C" stroke-width="1.6"/>`;
    for (const [x, y] of ring) d += `<circle cx="${X(x)}" cy="${Y(y)}" r="2.2" fill="#5FA0A0"/>`;
  }
  d += `<line x1="${X(0)}" y1="10" x2="${X(0)}" y2="${H - 10}" stroke="#5FA0A0" stroke-dasharray="3 3"/><text x="${+X(0) + 4}" y="20" font-size="10" fill="#5FA0A0">drawn outline</text>`;
  d += `<line x1="${X(-3)}" y1="${H - 14}" x2="${X(-2)}" y2="${H - 14}" stroke="#555" stroke-width="2"/><text x="${X(-3)}" y="${H - 18}" font-size="10" fill="#555">1 mm</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#EDEDE8"><text x="8" y="16" font-size="11" fill="#0A0A0C">${lab}</text>${d}</svg>`;
};
const defM = G.buildBug(D());
const mid = (rings) => rings.filter((r) => r.apex[0] > 8 && r.apex[0] < 30).sort((a, b) => a.apex[1] - b.apex[1])[0];
const secNew = beadSection(defM, mid);
const secOld = squareSection(OLD);
facts.sections = { newA: secNew.a, newH: secNew.H, oldWall: secOld.wall };
out.edge.push({ label: 'section through the edge — OLD (the edge law; red: the square wall)', svg: sectSvg(`OLD: wall ${secOld.wall.toFixed(2)} mm tall at the outline`, secOld) });
out.edge.push({ label: 'section through the edge — NEW (the emitted bead ring, every vertex)', svg: sectSvg(`NEW: bead a ${secNew.a.toFixed(3)} mm · H ${secNew.H.toFixed(3)} mm`, secNew) });

/* ---------- rods: a vein between two holes, from the two facing beads ---------- */
function veinSection(m, which, maxW = 2.2) {
  const q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R'), P = m.positions, V3 = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  const B = q.meta.bead, cells = q.meta.venation.cells.filter((c) => c.holes.length);
  const holeOf = new Map(); cells.forEach((c, hi) => c.holes[0].forEach((p) => holeOf.set(`${p[0]},${p[1]}`, hi)));
  const R = B.rings.filter((r) => holeOf.has(`${r.apex[0]},${r.apex[1]}`));
  const frame = (r) => { const top = V3(r.ids[0]), bot = V3(r.ids[B.K]), M = top.map((x, d) => (x + bot[d]) / 2); return { r, M, top, bot, ap: V3(r.ids[B.K / 2]) }; };
  // pairs of facing apexes on different holes: the vein between them
  let pairs = [];
  for (const r of R) {
    const h = holeOf.get(`${r.apex[0]},${r.apex[1]}`), d = [r.apex[0] - r.uw[0], r.apex[1] - r.uw[1]], dl = Math.hypot(...d) || 1;
    let best = null, bd = Infinity;
    for (const s of R) {
      if (holeOf.get(`${s.apex[0]},${s.apex[1]}`) === h) continue;
      const e = [s.apex[0] - r.apex[0], s.apex[1] - r.apex[1]], el = Math.hypot(...e);
      if (el < 1e-6) continue;
      // facing each other ACROSS ONE VEIN: each bead points at the other
      const ds = [s.apex[0] - s.uw[0], s.apex[1] - s.uw[1]], dsl = Math.hypot(...ds) || 1;
      const cos = -(e[0] * d[0] + e[1] * d[1]) / (el * dl), cos2 = (e[0] * ds[0] + e[1] * ds[1]) / (el * dsl);
      if (cos > 0.97 && cos2 > 0.97 && el < maxW && el < bd) { bd = el; best = s; }
    }
    if (best) pairs.push({ r, s: best, w: bd });
  }
  // 'root': the facing pair nearest the root; 'tip': the one farthest out (where the sheet has tapered to the floor)
  pairs.sort((a, b) => a.r.apex[0] - b.r.apex[0]);
  const pr = which === 'tip' ? pairs[pairs.length - 1] : pairs[0];
  const A = frame(pr.r), Bf = frame(pr.s);
  const axis = A.ap.map((x, d) => Bf.ap[d] - x), L = Math.hypot(...axis), ax = axis.map((x) => x / L);
  const up = A.top.map((x, d) => x - A.M[d]), upn = Math.hypot(...up), uh = up.map((x) => x / upn);
  const toS = (X) => { const Y = X.map((x, d) => x - A.ap[d]); return [Y.reduce((s, x, d) => s + x * ax[d], 0), Y.reduce((s, x, d) => s + x * uh[d], 0) + 0]; };
  const ringA = pr.r.ids.map((v) => toS(V3(v))), ringB = pr.s.ids.map((v) => toS(V3(v)));
  return { ringA, ringB, w: L, aA: pr.r.a, aB: pr.s.a, H: pr.r.H, thick: 2 * pr.r.H, flat: L - pr.r.a - pr.s.a, at: pr.r.apex };
}
const rodSvg = (lab, s, floor) => {
  const S = Math.min(110, 170 / (Math.max(s.w, s.thick) + 0.3)), W = 300, H = 210, ox = 150 - (s.w / 2) * S, oy = 105;
  const X = (x) => (ox + x * S).toFixed(1), Y = (y) => (oy - y * S).toFixed(1);
  const A = s.ringA, B = s.ringB.slice().reverse();
  const path = `M${A.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}L${B.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}Z`;
  let d = `<path d="${path}" fill="#0A0A0C" fill-opacity="0.12" stroke="#0A0A0C" stroke-width="1.6"/>`;
  for (const [x, y] of [...A, ...B]) d += `<circle cx="${X(x)}" cy="${Y(y)}" r="2.2" fill="#5FA0A0"/>`;
  d += `<circle cx="${X(s.w / 2)}" cy="${Y(0)}" r="${(floor / 2) * S}" fill="none" stroke="#e5484d" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#EDEDE8"><text x="8" y="16" font-size="11" fill="#0A0A0C">${lab}</text><text x="8" y="${H - 8}" font-size="10" fill="#e5484d">dashed: a ${floor} mm floor circle</text>${d}</svg>`;
};
const holesM = G.buildBug(NEWH);
for (const [which, lab] of [['root', 'a vein near the root'], ['tip', 'a vein far out, where the sheet has tapered toward the floor']]) {
  const s = veinSection(holesM, which);
  out.rods.push({ label: `HOLES default — ${lab} (at u ${s.at[0].toFixed(1)} mm)`, svg: rodSvg(`${s.w.toFixed(2)} wide × ${s.thick.toFixed(2)} thick, flat ${s.flat.toFixed(2)} mm`, s, 1), note: `bead radii ${s.aA.toFixed(3)} / ${s.aB.toFixed(3)} mm against H ${s.H.toFixed(3)} mm — ${s.flat < 0.25 * s.w ? 'a near-round ROD' : 'a rounded strip'}` });
}
const rodP = set((p) => { p.venation = 'holes'; p.wings.first.veinWidth = 1.0; p.wings.first.veinTaper = 0; p.wings.first.thickness = 1.0; });
{ const s = veinSection(G.buildBug(rodP), 'tip'); out.rods.push({ label: 'veins AT the floor: width 1.0 mm, sheet 1.0 mm — the vein is a round rod', svg: rodSvg(`${s.w.toFixed(2)} wide × ${s.thick.toFixed(2)} thick, flat ${s.flat.toFixed(2)} mm`, s, 1), note: `bead radii ${s.aA.toFixed(3)} / ${s.aB.toFixed(3)} mm — held to 0.45 of the vein's width, so a 10% flat stays: never thinner than the floor` }); }
const thickP = set((p) => { p.venation = 'holes'; for (const w of [p.wings.first, p.wings.last]) w.thickness = 3; });
{ const s = veinSection(G.buildBug(thickP), 'root'); out.rods.push({ label: 'a 3 mm sheet: the vein is TALLER than it is wide, so the bead is an ellipse', svg: rodSvg(`${s.w.toFixed(2)} wide × ${s.thick.toFixed(2)} thick`, s, 1), note: `bead radii ${s.aA.toFixed(3)} / ${s.aB.toFixed(3)} mm under H ${s.H.toFixed(3)} — the room, not the round, decides it` }); }
await closeUp('NEW — HOLES veins close: the rims rounded on both sides of each vein', NEWH, (() => { const t = holeTarget(NEWH); return { ...t, dist: 13, dir: [0.15, 0.4, 1] }; })(), 'rods');

/* ---------- the bug at 3/4 ---------- */
for (const [lab, p] of [['the default bug — bullnose on every wing edge', D()], ['HOLES — every cell rim rounded', NEWH], ['RIDGES — the ridges rounded too', set((p) => { p.venation = 'ridges'; })]]) {
  await setParams(p);
  const m = G.buildBug(p), P = m.positions; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
  await page.evaluate(() => window.__bug.setView('three'));
  await page.evaluate((c) => window.__bug.lookAt(c.target, c.dir, c.dist), { target: [(x0 + x1) / 2 - 6, (y0 + y1) / 2, 0], dir: [0.62, -0.62, 0.62], dist: 1.25 * (x1 - x0) });
  out.bug.push({ label: lab, img: await png(), tris: await page.evaluate(() => window.__bug.triangleCount()) });
}

/* ---------- the page: SVG toggle, the on-wing editor, tracing ---------- */
await show('');
await setParams(D());
await page.click('#viewButtons button[data-view="top"]');
await page.click('#viewToggle button[data-main="svg"]');
await page.waitForTimeout(250);
out.page.push({ label: 'a REAL click of the SVG toggle (upper right): the main view is the SVG projection — exactly what Get SVG exports', img: await png(), note: `main viewport: ${await page.evaluate(() => window.__bug.mainMode())}` });
// a TILTED hindwing: 3/4 to show the tilt, then edited on the SVG view (shown flat)
const tilt = set((p) => { p.wings.last.dihedral = 28; p.wings.last.pitch = 12; });
await setParams(tilt);
await page.click('#viewButtons button[data-view="three"]');
await page.waitForTimeout(200);
out.page.push({ label: 'the same bug with its hindwing TILTED (dihedral 28°, pitch 12°), at 3/4', img: await png() });
await page.click('#viewButtons button[data-view="top"]');
await page.click('#viewToggle button[data-main="svg"]');
const [hx, hy] = await page.evaluate(() => window.__bug.wingScreen(1, 'R'));
await page.mouse.click(hx, hy);
await page.waitForTimeout(250);
const flatShown = await page.evaluate(() => window.__bug.viewIsFlat());
const title = await page.evaluate(() => window.__bug.editorTitle());
// a REAL drag on control point 3; the landing measured against the EMITTED bead apex
const i = 3;
const p0 = await page.evaluate((k) => window.__bug.pointScreen(k), i);
const target = [p0[0] + 22, p0[1] + 14];
await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
for (let s = 1; s <= 6; s++) await page.mouse.move(p0[0] + (22 * s) / 6, p0[1] + (14 * s) / 6);
await page.mouse.up();
await page.evaluate(() => window.__bug.flushBuild());
const apexAfter = await page.evaluate((k) => { const a = window.__bug.apexWorld(k); return window.__bug.worldScreen(a[0], a[1]); }, i);
const landPx = Math.hypot(apexAfter[0] - target[0], apexAfter[1] - target[1]);
const pAfter = await page.evaluate(() => window.__bug.getParams());
facts.drag = { flatShown, landPx, dihedral: pAfter.wings.last.dihedral, pitch: pAfter.wings.last.pitch, title };
out.page.push({ label: 'the on-wing editor on the TILTED hindwing — displayed FLAT while edited; a REAL pointer drag on point 3', img: await png(), note: `displayed flat: ${flatShown} · the drag's target vs the EMITTED bead apex after the rebuild: ${landPx.toFixed(3)} px · the hindwing's dihedral / pitch in the parameters after the edit: ${pAfter.wings.last.dihedral}° / ${pAfter.wings.last.pitch}° (unchanged) · "${title}"` });
await page.click('#edDone');
await page.click('#viewButtons button[data-view="three"]');
await page.waitForTimeout(200);
out.page.push({ label: 'editing done: the pose comes back — the edited hindwing at its tilt again, at 3/4', img: await png() });

// tracing: a synthetic stand-in reference drawn in the browser, loaded through the real file input
const refPng = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 900; c.height = 560; const g = c.getContext('2d');
  g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 900, 560);
  const wing = (s) => { g.save(); g.translate(450, 250); g.scale(s, 1);
    g.fillStyle = '#c8822e'; g.beginPath(); g.moveTo(0, -10); g.bezierCurveTo(120, -150, 330, -200, 410, -150); g.bezierCurveTo(420, -60, 330, 20, 250, 30); g.bezierCurveTo(150, 40, 60, 30, 0, 20); g.fill();
    g.fillStyle = '#b76f22'; g.beginPath(); g.moveTo(0, 20); g.bezierCurveTo(90, 40, 260, 60, 300, 150); g.bezierCurveTo(300, 250, 170, 290, 90, 250); g.bezierCurveTo(40, 220, 10, 120, 0, 40); g.fill();
    g.strokeStyle = '#3a2208'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(10, 5); g.quadraticCurveTo(150 + 20 * k, -60 + 22 * k, 300 + 15 * k, -130 + 40 * k); g.stroke(); }
    g.restore(); };
  wing(1); wing(-1);
  g.fillStyle = '#3a2208'; g.beginPath(); g.ellipse(450, 280, 9, 90, 0, 0, Math.PI * 2); g.fill();
  g.font = '18px monospace'; g.fillText('synthetic stand-in reference', 20, 540);
  return c.toDataURL('image/png').split(',')[1];
});
const refFile = path.join(OUT, 'reference-stand-in.png');
fs.writeFileSync(refFile, Buffer.from(refPng, 'base64'));
await setParams(D());
await page.click('#viewButtons button[data-view="top"]');
await page.click('#viewToggle button[data-main="svg"]');
await page.setInputFiles('#bdFile', refFile);
await page.waitForFunction(() => window.__bug.backdrop().href);
for (const [id, v] of [['#bdOpacity', 0.75], ['#bdScale', 1.35], ['#bdY', 0.06]]) await page.$eval(id, (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const [fx, fy] = await page.evaluate(() => window.__bug.wingScreen(0, 'R'));
await page.mouse.click(fx, fy);
await page.waitForTimeout(200);
const q0 = await page.evaluate(() => window.__bug.pointScreen(4));
await page.mouse.move(q0[0], q0[1]); await page.mouse.down();
for (let s = 1; s <= 6; s++) await page.mouse.move(q0[0] + (16 * s) / 6, q0[1] - (20 * s) / 6);
await page.mouse.up();
await page.evaluate(() => window.__bug.flushBuild());
out.page.push({ label: 'tracing over a reference backdrop behind the whole bug (loaded through the real file input; opacity / scale / offset in the floating toolbar), forewing point 4 dragged toward it', img: await png(), note: `backdrop ${JSON.stringify(await page.evaluate(() => { const b = window.__bug.backdrop(); return { opacity: b.opacity, scale: b.scale, dy: b.dy }; }))} · the wings are drawn see-through while a backdrop is loaded, so the photo reads under them` });

/* ---------- the numbers ---------- */
const tri = (p) => G.buildBug(p).triangleCount;
facts.tris = {
  oldDefault: tri(OLD), newDefault: tri(D()), oldHoles: tri(OLDH), newHoles: tri(NEWH),
  oldRidges: tri(set((p) => { p.venation = 'ridges'; p.wingEdgeBevel = 4; p.wingEdgeRound = 0; })), newRidges: tri(set((p) => { p.venation = 'ridges'; })),
};
const beadStats = (p) => { const m = G.buildBug(p); let n = 0, full = 0, lo = Infinity; for (const q of m.parts.filter((x) => /^wing\d$/.test(x.kind) && x.side === 'R')) for (const r of q.meta.bead.rings) if (r.apex[0] > 1) { n++; if (r.a >= 0.98 * r.H) full++; lo = Math.min(lo, r.a / r.H); } return { n, full, lo }; };
facts.beads = { default: beadStats(D()), holes: beadStats(NEWH) };
console.log(JSON.stringify(facts, null, 1));

const card = (o) => `<figure class="cell">${o.img ? `<img src="data:image/png;base64,${o.img}">` : ''}${o.svg || ''}<figcaption><b>${o.label}</b>${o.tris ? `<br><span>${o.tris.toLocaleString()} triangles</span>` : ''}${o.note ? `<br><span>${o.note}</span>` : ''}</figcaption></figure>`;
const sec = (title, key, blurb, cols = 2) => `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid c${cols}">${out[key].map(card).join('')}</div>`;
const T = facts.tris, Bd = facts.beads;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — edges + editor sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1200px;line-height:1.5;margin:0 0 6px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px}
.grid{display:grid;gap:14px}.grid.c2{grid-template-columns:repeat(2,1fr)}.grid.c3{grid-template-columns:repeat(3,1fr)}.grid.c4{grid-template-columns:repeat(4,1fr)}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:8px}
.cell img{width:100%;display:block}
.cell svg{width:100%;height:auto;display:block}
figcaption{margin-top:6px;line-height:1.5}figcaption span{color:#8A8A85}
table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid rgba(237,237,232,.22);padding:4px 8px;text-align:right}th{color:#5FA0A0;font-weight:400}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Edges + editor — contact sheet</h1>
<p>Design doc §10. Every wing edge — the outer margin, a drawn tail, every HOLES cell rim and every RIDGES ridge — is now a <b>full bullnose</b> by default: the skins stop short of the drawn outline by the bead's radius and a half-round bead closes them, its <b>apex exactly on the drawn outline</b>, so the silhouette and the SVG do not move. Radius = <b>round × half the local thickness</b> (1 = the full half-round, 0 = the old square wall); held to 0.45 of the material's local width so a narrow strip keeps a flat. Defaults: round 1, chamfer 0 (was 4 mm), taper 0.5.</p>
<table><tr><th></th><th>default</th><th>HOLES</th><th>RIDGES</th></tr>
<tr><th>triangles, OLD edge (4 mm chamfer, square wall)</th><td>${T.oldDefault.toLocaleString()}</td><td>${T.oldHoles.toLocaleString()}</td><td>${T.oldRidges.toLocaleString()}</td></tr>
<tr><th>triangles, NEW bullnose</th><td>${T.newDefault.toLocaleString()}</td><td>${T.newHoles.toLocaleString()}</td><td>${T.newRidges.toLocaleString()}</td></tr>
<tr><th>beads at the full half-round (a ≥ 0.98 H), of the rim points past the root</th><td>${Bd.default.full} / ${Bd.default.n}</td><td>${Bd.holes.full} / ${Bd.holes.n}</td><td></td></tr></table>
${sec('The edge, close: OLD chamfer beside NEW bullnose — outer margin and a HOLES cell rim', 'edge', 'Top row: the forewing’s trailing margin at 60% of the span, low and from behind. Middle row: a hole rim in HOLES. Bottom row: the section through the edge, drawn from the EMITTED vertices (the bead ring read back off the model in its own frame) — the old one from the edge law, its 1 mm wall in red.')}
${sec('The bullnose against the 1 mm floor: HOLES veins become near-round rods', 'rods', 'Sections across a vein, drawn from the two facing beads’ emitted vertices. Where a vein is about as wide as the sheet is thick the two beads leave a 10% flat and the vein reads as a round rod; on a sheet thicker than the vein is wide the room limits the bead to an upright ellipse. The bead never removes material below the floor: its height is the local thickness, and the skins are only inset.', 2)}
${sec('The default bug at 3/4 — bullnose, HOLES, RIDGES', 'bug', '', 3)}
${sec('The page', 'page', 'Loads in the Top view; the Render / SVG toggle in the viewport’s upper right appears in Top only. In SVG mode a click on a wing edits it there: points on the right wing, the left mirrored live (dashed), the edited pair displayed flat. The separate editor panel and the small SVG inset are gone; the reference backdrop sits behind the whole bug, its controls in the floating toolbar.')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-edges-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-edges-sheet.png`);
if (errors.length) process.exit(1);
