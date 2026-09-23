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
import { render, writePng } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', 'docs/img/infill-conforming-emitter.png');
const STATE = { petalRoll: 330 };
const CW = 640, CH = 520, PAD = 10, BAR = 26;

/* a 5x7 font, enough for the labels */
const FONT = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '11111001000010000100001000010011111',
  L: '10000100001000010000100001000011111', M: '10001110111010110001100011000110001', N: '10001110011010110011100011000110001',
  O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000011000101110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110001101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100',
  ' ': '00000000000000000000000000000000000', '-': '00000000000000011111000000000000000', '.': '00000000000000000000000000110001100',
  ':': '00000001100011000000001100011000000', '/': '00001000010001000100010001000010000', '%': '11001110010001000100010001001100111',
  '(': '00010001000100001000010000100000010', ')': '01000001000001000010000100010001000', ',': '00000000000000000000000001100001000',
  '+': '00000001000010011111001000010000000', '=': '00000000001111100000111110000000000', '<': '00010001000100010000010000010000010',
};
function text(rgb, w, h, x0, y0, str, col = [250, 250, 248], sc = 2) {
  for (let i = 0; i < str.length; i++) {
    const g = FONT[str[i].toUpperCase()]; if (!g) continue;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (g[r * 5 + c] !== '1') continue;
      for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++) {
        const x = x0 + (i * 6 + c) * sc + dx, y = y0 + r * sc + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const o = (y * w + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
      }
    }
  }
}
function blit(dst, dw, dh, src, sw, sh, ox, oy) {
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= dw || Y >= dh) continue;
    const s = (y * sw + x) * 3, d = (Y * dw + X) * 3;
    dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2];
  }
}

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
