/* ===================================================================
   shot-bloom-infill-whorls.mjs — THE INFILL ON SEVERAL WHORLS, BEFORE AND
   AFTER THE SEAM WAS MADE ONE DOUBLE (the infill-whorls session, Oct 19 —
   docs/bloom-infill-whorls-outcome.md).

     node tools/shot-bloom-infill-whorls.mjs <out.png> --base <worktree of the base commit>

   WHAT IT SHOWS, every cell the EXPORT-mode geometry (the print preview's
   own mesh — the export floor applied), built in Node on each tree from that
   tree's own modules:
     row 1  the 3-whorl LAW flower x the infill (#421's 736 pairs), whole,
            BEFORE and AFTER, every within-shell census site circled in red;
     row 2  a macro on one inner-whorl petal's seam, BEFORE and AFTER, the
            cells tinted, the sites circled;
     row 3  the 2-whorl twin (320 pairs before), whole, BEFORE and AFTER;
     row 4  a cut section through the hub (the half y < 0 removed, the cut face
            seen from -y), BEFORE and AFTER, cropped to the hub and the whorls'
            roots — the seam sits where each blade leaves its foot.
   Every caption carries the tree, the census (pairs / worst span) and the
   triangle count, read off THIS run's own build and census, never typed.

   DETERMINISTIC: `tools/bloom-soft-render.mjs` is a software rasteriser, so the
   same triangles give the same bytes and no pixel delta is quoted or owed.
   An instrument, not a gate; it asserts only that the BEFORE tree reads
   pairs (or the comparison is vacuous) and refuses otherwise.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { census } from './bloom-self-intersection.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--base');
const BASE = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!OUT || !BASE) { console.error('usage: node tools/shot-bloom-infill-whorls.mjs <out.png> --base <worktree of the base commit>'); process.exit(2); }
const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = async (root) => ({ G: await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href), R: await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href) });
const trees = { before: await load(BASE), after: await load(HERE) };

const build = (T, set) => {
  const acc = new T.G.MeshBuilder({ exportMode: true });
  const b = T.G.buildBloomInto(acc, { ...T.R.DEFAULTS, ...set }, { below: null });
  const pos = new Float64Array(acc.positions);
  const c = census(pos, { collect: true });
  const cellR = (b.petalsAll || []).filter((p) => p && p.infill && p.infill.emittedTriRange).map((p) => p.infill.emittedTriRange);
  return { pos, c, cellR, n: (set.petalCount || T.R.DEFAULTS.petalCount), petals: b.petalsAll };
};
const S3 = { layerCount: 3, petalInfill: 'VORONOI' };
const S2 = { layerCount: 2, petalInfill: 'VORONOI' };
const m3 = { before: build(trees.before, S3), after: build(trees.after, S3) };
const m2 = { before: build(trees.before, S2), after: build(trees.after, S2) };
if (!(m3.before.c.within > 0 && m2.before.c.within > 0)) { console.error(`REFUSED: the BEFORE tree reads ${m3.before.c.within} / ${m2.before.c.within} pairs — the comparison is vacuous; is --base the base commit?`); process.exit(1); }

const W = 520, H = 440;
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* the renderer's own projection, restated for the circles (bloom-soft-render's `proj` at ss 1) */
const projector = (cam) => {
  const fwd = norm(cam.dir.map((c) => -c)); const right = norm(cross(fwd, cam.up)); const up = norm(cross(right, fwd));
  const scale = (H / 2) / cam.halfHeight;
  return (p) => { const d = [p[0] - cam.center[0], p[1] - cam.center[1], p[2] - cam.center[2]]; return [W / 2 + dot(d, right) * scale, H / 2 - dot(d, up) * scale]; };
};
const circle = (rgb, x, y, r, col = [235, 60, 50]) => {
  for (let a = 0; a < 360; a += 2) for (const rr of [r, r + 1]) {
    const px = Math.round(x + rr * Math.cos(a * Math.PI / 180)), py = Math.round(y + rr * Math.sin(a * Math.PI / 180));
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const o = (py * W + px) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
  }
};
const inCell = (m, t) => m.cellR.some((q) => t >= q[0] && t < q[1]);
const cell = (m, cam, label, { tintCells = false, filter = null, sites = true, siteKeep = null } = {}) => {
  let pos = m.pos, map = null;
  if (filter) {
    const keep = []; map = [];
    for (let t = 0; t < m.pos.length / 9; t++) if (filter(t)) { map.push(t); for (let k = 0; k < 9; k++) keep.push(m.pos[t * 9 + k]); }
    pos = new Float64Array(keep);
  }
  const rgb = render(pos, W, H, cam, { bg: [22, 22, 26], colorOf: tintCells ? (t) => (inCell(m, map ? map[t] : t) ? [160, 196, 214] : [214, 206, 190]) : null });
  const P = projector(cam);
  let shown = 0;
  if (sites) for (const s of m.c.sites) { if (siteKeep && !siteKeep(s.at)) continue; const [x, y] = P(s.at); if (x >= 0 && y >= 0 && x < W && y < H) { circle(rgb, x, y, 7); shown++; } }
  text(rgb, W, H, 8, 8, label, [250, 250, 248], 2);
  text(rgb, W, H, 8, 26, `${m.c.within} PAIRS / ${m.c.worstSpanMm.toFixed(4)} MM  ${(m.pos.length / 9).toLocaleString('en-US')} TRIS`, [250, 250, 248], 2);
  if (sites && m.c.within) text(rgb, W, H, 8, 44, `${shown} SITES IN FRAME (RED)`, [235, 60, 50], 2);
  return rgb;
};

/* cameras — from the after build's own extent */
const ext = (pos) => { let r = 0; for (let i = 0; i < pos.length; i += 3) r = Math.max(r, Math.hypot(pos[i], pos[i + 1])); return r; };
const R3 = ext(m3.after.pos), R2 = ext(m2.after.pos);
const top = (R) => ({ dir: [0.25, -0.35, 1], up: [0, 1, 0], center: [0, 0, 2], halfHeight: R * 1.05 });
/* the macro: frame the FIRST before-site of an inner whorl (layer 1), so the seam is in shot */
const nPer = m3.before.n;
const site0 = m3.before.c.sites.find((s) => s.pair.some((t) => m3.before.cellR.findIndex((q) => t >= q[0] && t < q[1]) >= nPer));
const mc = site0 ? site0.at : [10, 3, 1.8];
const macro = { dir: [0.25, -0.35, 1], up: [0, 1, 0], center: mc, halfHeight: 5 };
/* the section: keep the half y >= 0 and look at its cut face from -y */
const side = { dir: [0, -1, 0.12], up: [0, 0, 1], center: [0, 0, 0.6], halfHeight: 7 };
const cut = (m) => (t) => (m.pos[t * 9 + 1] + m.pos[t * 9 + 4] + m.pos[t * 9 + 7]) / 3 >= 0;

const cells = [
  cell(m3.before, top(R3), 'BEFORE 169FD5B 3 WHORLS'), cell(m3.after, top(R3), 'AFTER 3 WHORLS'),
  cell(m3.before, macro, 'BEFORE SEAM MACRO', { tintCells: true }), cell(m3.after, macro, 'AFTER SEAM MACRO', { tintCells: true }),
  cell(m2.before, top(R2), 'BEFORE 2 WHORLS'), cell(m2.after, top(R2), 'AFTER 2 WHORLS'),
  cell(m3.before, side, 'BEFORE SECTION THROUGH THE HUB', { filter: cut(m3.before), tintCells: true, siteKeep: (p) => p[1] >= 0 }), cell(m3.after, side, 'AFTER SECTION THROUGH THE HUB', { filter: cut(m3.after), tintCells: true }),
];
const HEAD = 40, GW = 2 * W + 12, GH = HEAD + 4 * (H + 8);
const sheet = Buffer.alloc(GW * GH * 3, 14);
text(sheet, GW, GH, 8, 10, 'INFILL ON SEVERAL WHORLS - THE SEAM MADE ONE DOUBLE. EXPORT GEOMETRY. CELLS BLUE IN ROWS 2, 4.', [250, 250, 248], 2);
cells.forEach((c, i) => blit(sheet, GW, GH, c, W, H, (i % 2) * (W + 12), HEAD + Math.floor(i / 2) * (H + 8)));
writePng(OUT, GW, GH, sheet);
console.log(`wrote ${OUT} (${GW}x${GH}) — 3 whorls ${m3.before.c.within} -> ${m3.after.c.within} pairs, 2 whorls ${m2.before.c.within} -> ${m2.after.c.within}`);
