/* ===================================================================
   SCRATCH PROTOTYPE — NOT THE SHIPPED CONSTRUCTION, AND NOT A CANDIDATE FOR IT.

     node tools/shot-bloom-fusion-prototype.mjs <out.png>

   Committed so the A/B picture in docs/bloom-corolla-fusion-discovery.md can be
   reproduced, and for nothing else. No gate imports it, nothing in the generator
   reads it, and it REFUSES (throws) on any state where tools/bloom-fusion-margins.mjs
   finds a crossed row — so it can never be mistaken for a construction that works
   where the margins cross. It renders through tools/bloom-soft-render.mjs, which is
   deterministic: the same triangles give the same bytes, so no pixel delta is quoted
   and no same-tree control is owed.
   =================================================================== */
/* WHAT IT IS:
   The brief's own mechanism hypothesis (a web lofted straight from petal i's +v margin to
   petal i+1's -v margin, base to tip) rendered ONLY on states where tools/bloom-fusion-margins.mjs
   finds NO crossed row, so no workaround is involved: the loft is the hypothesis, where it holds.
   Its one purpose is the A/B look question (web at the 1.0 mm rim floor vs at body thickness).
   Simplifications, all stated on the sheet: the petals' fused margins KEEP their bead (the real
   construction would flatten them), the web is closed by flat walls (no bead on its free edge),
   and it is a separate closed shell overlapping the petals (never welded).
   THE WEB ENDS AT THE NIB ENTRY, NOT AT THE TIP — the first cut ran it to the last row and the
   adversarial check measured 678 within-web self-intersection pairs on the tube cell, every one at
   u > 0.9986: the nib's arc swings each margin onto the axis, the two rims a straight rung joins
   pass each other, and a THICK web built on rungs that reverse folds through itself. The literal
   hypothesis ("base to tip") does not survive the apex even where no row crosses; that is a
   finding of the discovery, reported in the doc, not a detail tidied here. Each web is censused
   ALONE with tools/bloom-self-intersection.mjs and the count is printed on its cell, so this
   picture cannot quietly carry a folded web. */
import * as G from '../bloom-geometry.js';
import { stateOf, measure } from './bloom-fusion-margins.mjs';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { census } from './bloom-self-intersection.mjs';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return mul(a, 1 / l); };

export function buildWithWebs(set, { slits = [], webT = 'A', M = 8, round = false } = {}) {
  const st = stateOf(set);
  const m = measure(set);
  if (m.layers[0].summary.crossed) throw new Error(`state crosses (${m.layers[0].summary.crossed} rows) — the prototype is only drawn where the hypothesis holds`);
  const acc = new G.MeshBuilder({ exportMode: true });
  const built = G.buildBloomInto(acc, st, { below: null });
  const pos = acc.positions.slice();
  const n = built.foot.slotCount;
  let webTris = 0;
  const webs = [];   // each web's own triangles, so each closed web is censused ALONE
  let cur = null;
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c); cur.push(...a, ...b, ...c); webTris++; };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let i = 0; i < n; i++) {
    if (slits.includes(i)) continue;            // seam i (between slot i and i+1) left open
    cur = []; webs.push(cur);
    const P = built.petalsAll[i].lamina[0].rows, Q = built.petalsAll[(i + 1) % n].lamina[0].rows;
    const NV = P[0].mid.length;
    /* the nib entry, the plan's own (tipCap.apex.xLawMm / drawnLengthMm — the expression the
       combination gate uses for the same region): the web stops at the last row below it */
    const nibU = (p) => { const ap = p.tipCap && p.tipCap.apex; return ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : 1; };
    const uEnd = Math.min(nibU(built.petalsAll[i]), nibU(built.petalsAll[(i + 1) % n]));
    const R0 = 2; let R1 = R0; while (R1 + 1 < P.length && P[R1 + 1].u < uEnd) R1++;
    const grid = [];   // [r][m] -> { X, nrm, t }
    for (let r = R0; r <= R1; r++) {
      const A = P[r].mid[NV - 1], B = Q[r].mid[0];
      const nRef = unit(add(P[r].normal[NV - 1], Q[r].normal[0]));
      const t = webT === 'A' ? 1.0 : (P[r].thickness + Q[r].thickness) / 2;   // A: the 1.0 mm rim floor; B: the petals' own body thickness at this row
      const row = [];
      /* straight: the chord A->B (a ruled, faceted web). round: interpolated in the axis's own
         cylindrical coordinates (radius, azimuth, height), so the web follows the circle round the
         axis — the second across-shape the ruling's words allow, drawn for comparison only */
      const cyl = (X) => [Math.hypot(X[0], X[1]), Math.atan2(X[1], X[0]), X[2]];
      const cA = cyl(A), cB = cyl(B); let dth = cB[1] - cA[1]; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth <= -Math.PI) dth += 2 * Math.PI;
      for (let k = 0; k <= M; k++) {
        const f = k / M;
        if (!round) { row.push({ X: add(A, mul(sub(B, A), f)), nRef, t }); continue; }
        const rr = cA[0] + (cB[0] - cA[0]) * f, th = cA[1] + dth * f, zz = cA[2] + (cB[2] - cA[2]) * f;
        row.push({ X: [rr * Math.cos(th), rr * Math.sin(th), zz], nRef, t });
      }
      grid.push(row);
    }
    const NR = grid.length;
    for (let r = 0; r < NR; r++) for (let k = 0; k <= M; k++) {
      const g = grid[r][k];
      const du = sub(grid[Math.min(r + 1, NR - 1)][k].X, grid[Math.max(r - 1, 0)][k].X);
      const dv = sub(grid[r][Math.min(k + 1, M)].X, grid[r][Math.max(k - 1, 0)].X);
      let nn = unit(cross(du, dv)); if (dot(nn, g.nRef) < 0) nn = mul(nn, -1);
      g.top = add(g.X, mul(nn, g.t / 2)); g.bot = sub(g.X, mul(nn, g.t / 2));
    }
    for (let r = 0; r < NR - 1; r++) for (let k = 0; k < M; k++) {
      const a = grid[r][k], b = grid[r + 1][k], c = grid[r + 1][k + 1], d = grid[r][k + 1];
      quad(a.top, b.top, c.top, d.top); quad(a.bot, d.bot, c.bot, b.bot);
    }
    for (let r = 0; r < NR - 1; r++) {   // the two seam walls
      const a = grid[r][0], b = grid[r + 1][0]; quad(a.top, a.bot, b.bot, b.top);
      const c = grid[r][M], d = grid[r + 1][M]; quad(c.top, d.top, d.bot, c.bot);
    }
    for (let k = 0; k < M; k++) {        // base and the free outer edge
      const a = grid[0][k], b = grid[0][k + 1]; quad(a.top, b.top, b.bot, a.bot);
      const c = grid[NR - 1][k], d = grid[NR - 1][k + 1]; quad(c.top, c.bot, d.bot, d.top);
    }
  }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let q = 0; q < pos.length; q += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[q + k]); hi[k] = Math.max(hi[k], pos[q + k]); }
  /* every web censused on its own: a closed web that passes through itself is a fold this
     picture must not carry (cross-shell overlap with the petals is the export contract's own) */
  const webWithin = webs.map((w) => census(w).within);
  return { pos, webTris, webWithin, bloomTris: acc.positions.length / 9, lo, hi, built };
}

const CELLS = [
  ['5 PETALS TILT 60 TUBE  A 1.0 MM', { petalCount: 5, petalTilt: 60 }, { slits: [], webT: 'A' }],
  ['5 PETALS TILT 60 TUBE  B BODY 1.2', { petalCount: 5, petalTilt: 60 }, { slits: [], webT: 'B' }],
  ['5 PETALS TILT 60 NO WEB (TODAY)', { petalCount: 5, petalTilt: 60 }, { slits: [0, 1, 2, 3, 4], webT: 'A' }],
  ['SHEET 2.4  A 1.0 MM', { petalCount: 5, petalTilt: 60, sheetThickness: 2.4 }, { slits: [], webT: 'A' }],
  ['SHEET 2.4  B BODY 2.4', { petalCount: 5, petalTilt: 60, sheetThickness: 2.4 }, { slits: [], webT: 'B' }],
  ['6 PETALS TILT 45 2 SLITS  A', { petalCount: 6, petalTilt: 45 }, { slits: [0, 3], webT: 'A' }],
  ['5 PETALS TILT 60 TUBE  ROUND WEB A', { petalCount: 5, petalTilt: 60 }, { slits: [], webT: 'A', round: true }],
  ['6 PETALS TILT 45 2 SLITS  ROUND A', { petalCount: 6, petalTilt: 45 }, { slits: [0, 3], webT: 'A', round: true }],
  ['5 PETALS TILT 25 (DEFAULT TILT) TUBE A', { petalCount: 5 }, { slits: [], webT: 'A' }],
];
const S = 420, COLS = 3;
const ROWS = Math.ceil(CELLS.length / COLS) + 1;
const ZOOM_ROW = Math.ceil(CELLS.length / COLS);
const W = COLS * S, H = (ROWS - 1) * (S + 30) + 36 + ((S / 2) | 0) + 24;
const out = Buffer.alloc(W * H * 3, 16);
text(out, W, H, 8, 8, 'SCRATCH PROTOTYPE - THE LOFT WHERE NO ROW CROSSES - A VS B - NOT THE SHIPPED CONSTRUCTION', [240, 240, 236], 2);
const report = [];
CELLS.forEach(([name, set, opt], c) => {
  const b = buildWithWebs(set, opt);
  const ctr = [0, 1, 2].map((k) => (b.lo[k] + b.hi[k]) / 2);
  const half = 0.55 * Math.max(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]);
  const cam = { dir: [0.62, -0.72, 0.55], up: [0, 0, 1], center: ctr, halfHeight: half };
  const img = render(b.pos, S, S, cam, { color: [206, 214, 205], bg: [16, 16, 18] });
  const ox = (c % COLS) * S, oy = 36 + Math.floor(c / COLS) * (S + 30);
  blit(out, W, H, img, S, S, ox, oy);
  const fold = b.webWithin.reduce((s, x) => s + x, 0);
  text(out, W, H, ox + 6, oy + S + 4, name, [230, 230, 226], 1);
  text(out, W, H, ox + 6, oy + S + 16, `BLOOM ${b.bloomTris} + WEBS ${b.webTris} TRIS - WEB SELF-X ${fold} PAIRS`, [235, 180, 120], 1);
  report.push({ name, bloomTris: b.bloomTris, webTris: b.webTris, webs: b.webWithin.length, webSelfIntersectionPairs: fold });
});
/* the zoom strip: a fused seam (A, B) and a slit seam, 5 petals tilt 60 with ONE slit (seam 0),
   at sheet 2.4 where A and B differ by 1.4 mm, and at the shipped 1.2 sheet where they differ by 0.2;
   seen down the seam at u ~ 0.55, so the web is in cross-section */
{
  const Z = (S / 2) | 0;
  const zcells = [
    ['FUSED A SHEET 2.4', { petalCount: 5, petalTilt: 60, sheetThickness: 2.4 }, 'A', 1],
    ['FUSED B SHEET 2.4', { petalCount: 5, petalTilt: 60, sheetThickness: 2.4 }, 'B', 1],
    ['SLIT SHEET 2.4', { petalCount: 5, petalTilt: 60, sheetThickness: 2.4 }, 'A', 0],
    ['FUSED A SHEET 1.2', { petalCount: 5, petalTilt: 60 }, 'A', 1],
    ['FUSED B SHEET 1.2', { petalCount: 5, petalTilt: 60 }, 'B', 1],
    ['SLIT SHEET 1.2', { petalCount: 5, petalTilt: 60 }, 'A', 0],
  ];
  zcells.forEach(([nm, set, webT, seam], z) => {
    const b = buildWithWebs(set, { slits: [0], webT });
    const rows = b.built.petalsAll[seam].lamina[0].rows;
    const r = Math.floor(rows.length * 0.55);
    /* looking DOWN THE SEAM (along the margin's own tangent, from further up the petal), so the
       web is seen in cross-section and its thickness is the thing in frame — the one view in which
       A and B can differ at all; from any other side a 0.2 mm step is invisible */
    const at = rows[r].mid[rows[r].mid.length - 1];
    const up2 = rows[Math.min(r + 4, rows.length - 1)].mid[rows[r].mid.length - 1];
    const tg = unit(sub(up2, at));
    const cam = { dir: tg, up: [0, 0, 1], center: at, halfHeight: 4.5 };
    const img = render(b.pos, Z, Z, cam, { color: [206, 214, 205], bg: [16, 16, 18] });
    const ox = (z % 6) * Z, oy = 36 + ZOOM_ROW * (S + 30);
    blit(out, W, H, img, Z, Z, ox, oy);
    text(out, W, H, ox + 4, oy + Z + 4, nm, [230, 230, 226], 1);
  });
}
writePng(process.argv[2] || '/tmp/corolla-fusion-prototype.png', W, H, out);
console.log(JSON.stringify(report, null, 1));
