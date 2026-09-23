/* ===================================================================
   shot-bloom-conform.mjs — THE CHORD, AS A PICTURE.
     node tools/shot-bloom-conform.mjs [--out docs/img/infill-conforming-emitter.png]

   ONE PAIR, NOT A SHEET. S1's deliverable is the before/after on `petalRoll 330` so the
   chord is visible as more than a number; the render sheet is S2's
   (`docs/bloom-infill-port-plan.md` §6). Four cells:
     top    — A BAND OF THE BLADE SEEN DOWN THE SPINE, legacy against conforming. Only
              triangles whose whole plan footprint lies in the band are drawn, so the
              rolled cross-section reads as a curve and the flat fan's chord reads as a
              straight line drawn ACROSS it. The band is centred on the LEGACY emitter's
              own worst facet, found at run time rather than chosen.
     bottom — the same two petals whole, face-on, so the object is legible.

   The rasteriser is `bloom-soft-render.mjs`: orthographic, software, deterministic, so
   the same triangles give the same bytes and no same-tree pixel control is owed. The
   labels are a 5x7 bitmap font written here because a picture that needs its caption to
   say which half is which is half a picture.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import * as P from './bloom-voronoi-proto.mjs';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', 'docs/img/infill-conforming-emitter.png');
const STATE = { petalRoll: 330 };
const CW = 640, CH = 520, PAD = 10, BAR = 26;

const ctx = P.context(STATE);
const F = P.fieldSalvage(ctx, 16);
const lat = P.latticeChordDevMm(ctx, F.uOv);
const k3 = (a) => `${a[0].toFixed(7)},${a[1].toFixed(7)},${a[2].toFixed(7)}`;

function build(conform) {
  const r = P.cutThrough(ctx, F, P.WALL_DEFAULT, { conform, capturePlan: true });
  const planOf = new Map();
  for (const o of r.canon.values()) { planOf.set(k3(o.T), { x: o.x, y: o.y, s: 1 }); planOf.set(k3(o.B), { x: o.x, y: o.y, s: -1 }); }
  const pos = r.acc.pos;
  let worst = 0, worstX = 0;
  const tris = [];
  for (let ti = r.baseTris; ti < pos.length / 9; ti++) {
    const V = [0, 1, 2].map((c) => [pos[ti * 9 + c * 3], pos[ti * 9 + c * 3 + 1], pos[ti * 9 + c * 3 + 2]]);
    const pl = V.map((v) => planOf.get(k3(v)));
    tris.push({ V, pl });
    if (pl.some((p) => !p) || pl[0].s !== pl[1].s || pl[1].s !== pl[2].s) continue;
    const d = P.facetDevMm(ctx, pl);
    if (d > worst) { worst = d; worstX = (pl[0].x + pl[1].x + pl[2].x) / 3; }
  }
  return { r, tris, worst, worstX, pos };
}
const L = build(false), C = build(true);
const bandX = L.worstX, HALF = 1.6;                                   // mm of blade either side of the legacy's own worst facet
const bandOf = (b) => { const out = []; for (const t of b.tris) { if (!t.pl.every((p) => p && Math.abs(p.x - bandX) <= HALF)) continue; out.push(...t.V[0], ...t.V[1], ...t.V[2]); } return new Float32Array(out); };

const TILT = (ctx.st.petalTilt ?? 25) * Math.PI / 180;
const NRM = [-Math.sin(TILT), 0, Math.cos(TILT)], BLADE = [Math.cos(TILT), 0, Math.sin(TILT)];
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx, c: mn.map((m, k) => (m + mx[k]) / 2) }; };

const bandL = bandOf(L), bandC = bandOf(C);
const bandCenter = bbox(bandL).c;
const sectionCam = { dir: BLADE, up: NRM, center: bandCenter, halfHeight: 5.2 };
const whole = (b) => new Float32Array(b.pos.slice(b.r.baseTris * 9));
/* a three-quarter view for the whole cells: face-on to the sheet NORMAL is meaningless
   on a blade rolled into a tube — it reads as a strip */
const nrm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const QDIR = nrm3([NRM[0] * 0.75 + 0.45, NRM[1] * 0.75 + 0.55, NRM[2] * 0.75 + 0.2]);
const wholeCam = { dir: QDIR, up: BLADE, center: bbox(whole(L)).c, halfHeight: 20 };
const OPT = { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3] };

const panels = [
  { rgb: render(bandL, CW, CH, sectionCam, OPT), label: `LEGACY - THE FLAT FAN   WORST FACET ${L.worst.toFixed(4)} MM` },
  { rgb: render(bandC, CW, CH, sectionCam, OPT), label: `CONFORMING              WORST FACET ${C.worst.toFixed(4)} MM` },
  { rgb: render(whole(L), CW, CH, wholeCam, OPT), label: `LEGACY WHOLE   ${L.r.tris} TRIS` },
  { rgb: render(whole(C), CW, CH, wholeCam, OPT), label: `CONFORMING WHOLE   ${C.r.tris} TRIS` },
];
const W = CW * 2 + PAD * 3, H = (CH + BAR) * 2 + PAD * 3 + BAR * 2;
const out = Buffer.alloc(W * H * 3, 0x14);
panels.forEach((p, i) => {
  const ox = PAD + (i % 2) * (CW + PAD), oy = PAD + Math.floor(i / 2) * (CH + BAR + PAD);
  blit(out, W, H, p.rgb, CW, CH, ox, oy);
  text(out, W, H, ox + 4, oy + CH + 7, p.label, [235, 233, 226], 2);
});
text(out, W, H, PAD + 4, H - BAR * 2 + 4,
  `PETALROLL 330, 16 CELLS, WALL 1.0 MM, EXPORT. THE TOP ROW IS A ${(2 * HALF).toFixed(1)} MM BAND`, [170, 168, 160], 2);
text(out, W, H, PAD + 4, H - BAR + 4,
  `OF BLADE AT X ${bandX.toFixed(2)} MM SEEN DOWN THE SPINE. SHIPPED LATTICE ${lat.devMm.toFixed(4)} MM`, [170, 168, 160], 2);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
writePng(OUT, W, H, out);
console.log(`${OUT} — ${W}x${H}. legacy worst facet ${L.worst.toFixed(4)} mm / ${L.r.tris} tris; conforming ${C.worst.toFixed(4)} mm / ${C.r.tris} tris; the shipped lattice's own worst is ${lat.devMm.toFixed(4)} mm. Band ${(2 * HALF).toFixed(1)} mm at x ${bandX.toFixed(3)} mm (the legacy's own worst facet), ${bandL.length / 9} against ${bandC.length / 9} triangles in it.`);
