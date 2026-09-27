/* ===================================================================
   shot-bloom-hole-rim.mjs — THE HOLE RIM, BEFORE AND AFTER (S5 of the infill).

     node tools/shot-bloom-hole-rim.mjs <dir> --base <worktree> [--png docs/img/infill-hole-rim.png]

   Four things, all EXPORT mode (the geometry print preview shows), all from
   the shipped builder:
     1-2  A TRUE CROSS-SECTION through one hole's rim, on the BASE tree (a flat
          wall one sheet thick) and on this one (the bead). The section plane
          holds the surface normal at a rim point and the direction from the
          hole's centre out through that point, so it cuts across the wall;
          every emitted triangle is sliced by it and the segments are drawn to
          scale, 1 mm marked. The dot is the plan's own hole boundary on the
          mid-surface — where the bead's apex must sit.
     3-4  The same hole in 3D, close, base then branch.
     5    The shipping default petal, infill on at the ruled defaults.
     6    The whole bloom at the ruled defaults.
   The base tree is imported from a git worktree of the base commit, so the
   BEFORE is a real build of the old code rather than a remembered one.

   NO PIXEL DELTA IS QUOTED and none is owed: `bloom-soft-render.mjs` is
   deterministic and the sections are arithmetic.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base'), PNG = arg('--png');
if (!DIR || !BASE) { console.error('usage: node tools/shot-bloom-hole-rim.mjs <dir> --base <worktree> [--png <file>]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });

const GB = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const GA = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

const ONE = { petalInfill: 'VORONOI', petalCount: 1, layerCount: 1 };
function firstSlot(G, st, acc) {
  const fr = G.footRing(st, acc); let got = null; const ring = fr.slotRings[0][0];
  G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra,
    phase: ring.phase, placement: st.placement, fan: fr.fan, blade: (slot) => { if (!got) got = { ring: fr.slotRings[0][slot.index], slot }; } });
  return got;
}
function build(G, set) {
  const st = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  const acc0 = new G.MeshBuilder({ exportMode: true });
  const { ring, slot } = firstSlot(G, st, acc0);
  const surface = G.petalSurface(st, ring, slot, null, acc0);
  return { pos: Float64Array.from(acc.positions), tris: acc.triangleCount, F: b.petalsAll[0] && b.petalsAll[0].infill, surface };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

const after = build(GB, ONE), before = build(GA, ONE);
/* THE HOLE: the one nearest mid-blade, from the builder's own apex loops (the
   plan's hole boundary), and the rim point on it farthest along +y (across the
   blade), so the section runs across the wall toward the margin side. */
const L = after.surface.length;
const atP = (q) => { const u = Math.min(1, Math.max(0, q.x / L)); const h = after.surface.profile.laminaHalfAt(u); const v = Math.max(-1, Math.min(1, h > 1e-9 ? q.y / h : 0)); return after.surface.at(u, v); };
const loops = after.F.emittedLoops;
let best = null;
for (const lp of loops) { let cx = 0, cy = 0; for (const q of lp) { cx += q.x; cy += q.y; } cx /= lp.length; cy /= lp.length; const d = Math.abs(cx / L - 0.55); if (!best || d < best.d) best = { lp, c: { x: cx, y: cy }, d }; }
let rimQ = best.lp[0]; for (const q of best.lp) if (q.y - best.c.y > rimQ.y - best.c.y) rimQ = q;
const S0 = atP(rimQ), Sc = atP(best.c);
const nS = nrm(S0.n);
let radial = sub(S0.P, Sc.P); radial = nrm(sub(radial, nS.map((v) => v * dot(radial, nS))));
const planeN = nrm(cross(radial, nS));

function section(pos) {
  const segs = [];
  for (let t = 0; t < pos.length; t += 9) {
    const V = [0, 1, 2].map((k) => [pos[t + k * 3], pos[t + k * 3 + 1], pos[t + k * 3 + 2]]);
    const d = V.map((v) => dot(sub(v, S0.P), planeN));
    const pts = [];
    for (let e = 0; e < 3; e++) { const a = e, b = (e + 1) % 3; if ((d[a] > 0) !== (d[b] > 0)) { const f = d[a] / (d[a] - d[b]); pts.push(V[a].map((x, k) => x + (V[b][k] - x) * f)); } }
    if (pts.length === 2) segs.push(pts.map((p) => { const r = sub(p, S0.P); return [dot(r, radial), dot(r, nS)]; }));
  }
  return segs.filter((s) => s.every(([x, y]) => Math.abs(x) < 1.4 && Math.abs(y) < 1.2));
}
const SW = 620, SH = 460, PX = 190;                  // 190 px per millimetre
function drawSection(segs, label, sub2) {
  const rgb = Buffer.alloc(SW * SH * 3);
  for (let i = 0; i < SW * SH; i++) { rgb[i * 3] = 24; rgb[i * 3 + 1] = 24; rgb[i * 3 + 2] = 28; }
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= SW || y >= SH) return; const i = (y * SW + x) * 3; rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2]; };
  const toPx = ([x, y]) => [SW / 2 + x * PX, SH / 2 + 10 - y * PX];
  const line = (a, b, c, w = 1) => { const [x0, y0] = toPx(a), [x1, y1] = toPx(b); const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let dx = -w; dx <= w; dx++) for (let dy = -w; dy <= w; dy++) put(Math.round(x + dx), Math.round(y + dy), c); } };
  line([-1.4, 0], [1.4, 0], [60, 60, 66], 0);            // the mid-surface's tangent line through the rim point
  line([0, -1.2], [0, 1.2], [60, 60, 66], 0);            // the plan's hole boundary
  for (const s of segs) line(s[0], s[1], [236, 226, 206], 1);
  for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) if (dx * dx + dy * dy <= 16) { const [x, y] = toPx([0, 0]); put(x + dx, y + dy, [111, 183, 174]); }
  line([-1.3, -1.05], [-0.3, -1.05], [111, 183, 174], 1);  // the 1 mm bar
  text(rgb, SW, SH, 14, 12, label, [250, 250, 248], 2);
  text(rgb, SW, SH, 14, 34, sub2, [180, 176, 168], 2);
  text(rgb, SW, SH, Math.round(SW / 2 - 1.3 * PX), SH - 30, '1 MM', [111, 183, 174], 2);
  return rgb;
}
const cells = [];
const add = (name, rgb, w, h, caption) => { const f = path.join(DIR, `${name}.png`); writePng(f, w, h, rgb); cells.push({ name, rgb, w, h, caption, png: fs.readFileSync(f).toString('base64') }); console.log(`rendered ${name}  ${caption}`); };
const bead = after.F.bead;
add('01-section-before', drawSection(section(before.pos), 'BEFORE - A FLAT WALL', 'THE BASE TREE, THE SAME HOLE'), SW, SH,
  `BEFORE (base tree): the hole rim in cross-section — a flat wall one sheet thick, two right-angle corners at the skins. The dot is the plan's hole boundary on the mid-surface.`);
add('02-section-after', drawSection(section(after.pos), 'AFTER - THE BEAD', `R ${bead.radiusMm.toFixed(2)} MM, APEX ON THE HOLE`), SW, SH,
  `AFTER (S5): the same hole — the skins stop ${bead.radiusMm.toFixed(2)} mm short of the boundary and close on the bead, whose apex is the plan's hole boundary (the dot): the mid-plane aperture is the ruled hole, the faces are ${(2 * bead.radiusMm).toFixed(2)} mm wider. Clamped from 0.50 by the ${after.F.wall.toFixed(2)} mm wall on ${bead.clamps.length} of ${bead.beadedHoles} holes.`);

const W = 620, H = 560;
const light = { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3] };
const macro = { dir: nS.map((v, k) => v * 0.55 + planeN[k] * 0.5 - radial[k] * 0.45), up: nS, center: S0.P, halfHeight: 2.2 };
macro.dir = nrm(macro.dir); macro.up = nrm(sub(nS, macro.dir.map((v) => v * dot(nS, macro.dir))));
add('03-macro-before', render(before.pos, W, H, macro, light), W, H, 'BEFORE, in 3D: the same hole close, 4.4 mm across the frame.');
add('04-macro-after', render(after.pos, W, H, macro, light), W, H, 'AFTER, in 3D: the same hole, the same camera.');
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };
{
  const bb = bbox(after.pos);
  add('05-petal', render(after.pos, W, H, { dir: nS, up: nrm(sub([0, 0, 1], nS.map((v) => v * nS[2]))), center: bb.c, halfHeight: Math.max(...bb.d) * 0.6 }, light), W, H,
    `THE SHIPPING DEFAULT PETAL with the infill on at the ruled defaults — ${after.F.achieved} holes, every rim beaded. ${after.tris.toLocaleString('en-US')} triangles (a one-petal bloom).`);
}
{
  const whole = build(GB, { petalInfill: 'VORONOI' });
  const bb = bbox(whole.pos);
  add('06-bloom', render(whole.pos, W, H, { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: bb.c, halfHeight: Math.max(...bb.d) * 0.58 }, light), W, H,
    `THE WHOLE BLOOM at the ruled defaults, infill on — ${whole.tris.toLocaleString('en-US')} triangles in EXPORT (${(100 * whole.tris / GB.EXPORT_TRI_BUDGET).toFixed(1)}% of the budget).`);
}

const html = `<!doctype html><meta charset="utf-8"><title>Hole rims take the edge profile</title>
<style>body{background:#141416;color:#e8e6e0;font:14px/1.5 system-ui,sans-serif;margin:0;padding:28px}figure{display:inline-block;vertical-align:top;margin:0 18px 26px 0}img{display:block;width:620px;border-radius:5px}figcaption{color:#b8b4ac;max-width:620px;margin-top:7px;font-size:13px}</style>
<h1>S5 — the hole rims take the edge profile</h1><p>EXPORT mode (print preview). Base = a worktree of the base commit.</p>
${cells.map((c) => `<figure><img src="data:image/png;base64,${c.png}"><figcaption>${c.caption}</figcaption></figure>`).join('\n')}`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
if (PNG) {
  const CW = 620, CH = 560, cols = 2, rows = Math.ceil(cells.length / cols);
  const out = Buffer.alloc(CW * cols * CH * rows * 3, 20);
  cells.forEach((c, i) => blit(out, CW * cols, CH * rows, c.rgb, c.w, c.h, (i % cols) * CW, Math.floor(i / cols) * CH));
  writePng(PNG, CW * cols, CH * rows, out);
  console.log(`composite -> ${PNG}`);
}
