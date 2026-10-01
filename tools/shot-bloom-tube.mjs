/* ===================================================================
   SCRATCH PROTOTYPE SHEETS — THE CLOSED-RING TUBE. NOT SHIPPED.

     node tools/shot-bloom-tube.mjs <outDir> [--only hstrip,hform,pgrid,pzoom,round,straight,strips,zoom,web]

   Renders the scratch ring of tools/bloom-tube-ring.mjs (read its header for
   what is patched and why) through tools/bloom-soft-render.mjs, which is
   deterministic: same triangles, same bytes — so no pixel delta is quoted and
   no same-tree control is owed. Every build is EXPORT mode (the print preview:
   the floored sheet, the 0.80 mm tip floor). Fixed camera per sheet, no
   rotation, no chrome (there is no page). Every caption carries the ring's own
   self-intersection count (each ring shell censused ALONE with
   tools/bloom-self-intersection.mjs), so no cell can quietly carry a fold.

   Sheets — PARTIAL FUSION (the default since Eva's ruling on #323):
     tube-partial-h.png         h 0.25 / 0.40 / 0.55 / 0.70 on the default and on
                                5 petals at tilt 60, ROUND and STRAIGHT
     tube-partial-form.png      the same h strip at cup / roll / twist maximum
     tube-partial-round.png     n x k grid at h 0.40, ROUND
     tube-partial-straight.png  n x k grid at h 0.40, STRAIGHT
     tube-partial-zoom.png      the fusion line, a sinus, a slit (h 0.40)
   Sheets — FUSED TO THE NIB (the first round; --only round,straight,strips,zoom,web):
     tube-round.png     rows n = 5, 6, 8, 12; columns every valid k, k = n FREE
     tube-straight.png  the same, STRAIGHT
     tube-strips.png    tilt 60 / 75 / 90; curl default / max; cup max and roll
                        max showing the ring INERT (lobes move, ring does not)
     tube-zoom.png      a slit edge, a lobe join, the base at the hub (one and
                        three layers, from below)
     tube-vs-web.png    the discovery's web (straight and round) beside the
                        ring (ROUND and STRAIGHT) on one clean state
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTube, divisorsOf, measureTube } from './bloom-tube-ring.mjs';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { census } from './bloom-self-intersection.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
if (!outDir) throw new Error('usage: node tools/shot-bloom-tube.mjs <outDir>');
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const PARTIAL = ['hstrip', 'hform', 'pgrid', 'pzoom'];
const want = (k) => (only ? only.includes(k) : PARTIAL.includes(k));

const BG = [16, 16, 18], INK = [206, 214, 205], LOBE = [214, 186, 150];
const CAM = [0.62, -0.72, 0.55];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
function bbox(P) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let q = 0; q < P.length; q += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[q + k]); hi[k] = Math.max(hi[k], P[q + k]); }
  return { lo, hi, ctr: [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2), half: 0.55 * Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
}
/* the ring tinted apart from the lobes and hub, so the reader can see which
   sheet is which: every ring triangle sits after the petals' in the stream */
function tintFor(b) {
  const ringFrom = b.free ? Infinity : b.tubeTris - b.ringReport.reduce((a, x) => a + x.ringTris, 0);
  return (t) => (t >= ringFrom ? 1 : 0.86);
}
/* each petal (what stands above the ring, blend included) censused ALONE */
function petalSI(b) { return b.free || !b.petalRanges ? 0 : b.petalRanges.reduce((a, r) => a + census(b.positions.slice(r.from * 9, r.to * 9)).within, 0); }
function ringSI(b) { return b.free ? null : b.ringShells.reduce((a, s) => a + census(s.positions).within, 0); }
function cell(out, W, H, b, S, ox, oy, cam, caps) {
  let pos = b.positions, tint = tintFor(b);
  if (cam.slab) {
    const { Tn, R, w } = cam.slab, keep = [], idx = [];
    for (let t = 0; t < pos.length / 9; t++) {
      const c = [0, 1, 2].map((k) => (pos[t * 9 + k] + pos[t * 9 + 3 + k] + pos[t * 9 + 6 + k]) / 3);
      if (Math.abs(c[0] * Tn[0] + c[1] * Tn[1]) <= w && c[0] * R[0] + c[1] * R[1] > -2) { for (let q = 0; q < 9; q++) keep.push(pos[t * 9 + q]); idx.push(t); }
    }
    const base = tint; pos = keep; tint = (t) => base(idx[t]);
  }
  const img = render(pos, S, S, cam, { color: INK, bg: BG, tint });
  blit(out, W, H, img, S, S, ox, oy);
  caps.forEach((c, i) => text(out, W, H, ox + 6, oy + S + 4 + i * 12, c[0], c[1] || [230, 230, 226], 1));
}
const kName = (k, n) => (k === 0 ? 'TUBE (K 0)' : k === n ? `FREE (K ${n})` : `K ${k} - ${k} PANEL${k > 1 ? 'S' : ''} OF ${n / k}`);
const log = [];

async function gridSheet(shape, file, h = null) {
  const NS = [5, 6, 8, 12];
  const cols = Math.max(...NS.map((n) => divisorsOf(n).length + 1));
  const S = 300, CAPH = 40, W = cols * S, H = 40 + NS.length * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, `TUBE - ${shape} RING THROUGH THE MIDRIBS${h === null ? ' TO THE NIB' : ` FUSED TO H ${h.toFixed(2)}, FREE PETALS ABOVE`} - EXPORT - ROWS N 5 6 8 12 - COLUMNS EVERY VALID K`, [240, 240, 236], 2);
  for (const [ri, n] of NS.entries()) {
    const ks = [0, ...divisorsOf(n)];
    let cam = null;
    for (const [ci, k] of ks.entries()) {
      const b = await buildTube({ petalCount: n }, { shape, k, h });
      if (!cam) { const bb = bbox(b.positions); cam = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half }; }
      const si = ringSI(b);
      const pse = petalSI(b);
      cell(out, W, H, b, S, ci * S, 40 + ri * (S + CAPH), cam, [[`N ${n}  ${kName(k, n)}`], [`TRIS ${b.tubeTris} (FREE ${b.plainTris})  RING SELF-X ${si === null ? '-' : si}${h === null ? '' : `  PETALS ${pse}`}`, si || pse ? [255, 120, 100] : [235, 180, 120]]]);
      log.push({ sheet: file, n, k, shape, h, tris: b.tubeTris, free: b.plainTris, ringSI: si, petalSI: petalSI(b) });
    }
  }
  writePng(path.join(outDir, file), W, H, out);
}

async function strips() {
  const S = 300, CAPH = 40;
  const rowsDef = [
    ['TILT (N 8, K 0)', [['TILT 60', { petalTilt: 60 }], ['TILT 75', { petalTilt: 75 }], ['TILT 90', { petalTilt: 90 }]], 'own'],
    ['SPINE CURL CARRIES THROUGH THE MIDRIBS (N 8, K 0)', [['CURL 0 (DEFAULT)', {}], ['CURL 180', { petalSpineCurl: 180 }], ['CURL 360 (MAX)', { petalSpineCurl: 360 }]], 'own'],
    ['INERT IN THE RING - ONLY THE LOBES MOVE (N 8, K 0, ONE CAMERA)', [['DEFAULT', {}], ['CUP 1.2 (MAX)', { petalCup: 1.2 }], ['ROLL 330 (MAX)', { petalRoll: 330 }], ['TWIST 180 (MAX)', { petalTwist: 180 }]], 'shared'],
  ];
  const cols = 8;   // two shapes side by side, up to four states each
  const W = cols * S, H = 40 + rowsDef.length * (S + CAPH + 24);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE STRIPS - LEFT ROUND, RIGHT STRAIGHT - EXPORT - SCRATCH PROTOTYPE', [240, 240, 236], 2);
  for (const [ri, [title, states, camMode]] of rowsDef.entries()) {
    const oy = 40 + ri * (S + CAPH + 24);
    text(out, W, H, 6, oy, title, [240, 200, 120], 1);
    for (const [si, shape] of ['ROUND', 'STRAIGHT'].entries()) {
      let shared = null, ref = null;
      for (const [ci, [nm, set]] of states.entries()) {
        const b = await buildTube(set, { shape, k: 0 });
        const bb = bbox(b.positions);
        if (camMode === 'shared' && !shared) shared = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half };
        const cam = camMode === 'shared' ? shared : { dir: [0.75, -0.6, 0.28], up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half };
        /* inertness, measured on the RING's own floats against the default's */
        const ring = b.ringShells[0].positions;
        let same = null;
        if (camMode === 'shared') { if (!ref) ref = ring; else { same = ref.length === ring.length; for (let q = 0; same && q < ring.length; q++) if (!Object.is(ref[q], ring[q])) same = false; } }
        const sic = ringSI(b);
        const capt = [[`${shape} ${nm}`], [`RING SELF-X ${sic}  TRIS ${b.tubeTris}${same === null ? '' : same ? '  RING BIT-IDENTICAL' : '  RING MOVED'}`, sic ? [255, 120, 100] : [235, 180, 120]]];
        cell(out, W, H, b, S, (si * 4 + ci) * S, oy + 14, cam, capt);
        log.push({ sheet: 'strips', title, shape, nm, ringSI: sic, ringIdenticalToDefault: same, tris: b.tubeTris });
      }
    }
  }
  writePng(path.join(outDir, 'tube-strips.png'), W, H, out);
}

async function zoom() {
  const S = 340, CAPH = 30;
  const W = 4 * S, H = 40 + 2 * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE ZOOM - EXPORT (PRINT PREVIEW) - SLIT EDGE, LOBE JOIN, BASE AT THE HUB - SCRATCH PROTOTYPE', [240, 240, 236], 2);
  const cellsDef = [];
  /* a slit edge: n 8, k 4, at the ring's mid-height, looking straight at the slit */
  for (const shape of ['ROUND', 'STRAIGHT']) cellsDef.push([`${shape} SLIT EDGE N 8 K 4`, { petalCount: 8 }, { shape, k: 4 }, (b) => {
    const rr = b.ringReport[0], r = Math.floor(rr.mids.length * 0.55);
    const n = b.n, D = 2 * Math.PI / n, th0 = Math.atan2(rr.mids[rr.mids.length - 1][0][1], rr.mids[rr.mids.length - 1][0][0]);
    const thS = th0 - D / 2 + 2 * D;   // the slit after panel 0 (m = 2)
    const rho = Math.hypot(rr.mids[r][0][0], rr.mids[r][0][1]);
    const P = [rho * Math.cos(thS), rho * Math.sin(thS), rr.mids[r][0][2]];
    return { dir: norm([Math.cos(thS), Math.sin(thS), 0.7]), up: [0, 0, 1], center: P, halfHeight: 4 };
  }]);
  /* a lobe join: n 5, tilt 60, k 0, at the top row of petal 0 */
  for (const shape of ['ROUND', 'STRAIGHT']) cellsDef.push([`${shape} LOBE JOIN N 5 TILT 60`, { petalCount: 5, petalTilt: 60 }, { shape, k: 0 }, (b) => {
    const rr = b.ringReport[0], P = rr.mids[rr.mids.length - 1][0];
    const th = Math.atan2(P[1], P[0]);
    return { dir: norm([Math.cos(th), Math.sin(th), 0.55]), up: [0, 0, 1], center: P, halfHeight: 3 };
  }]);
  /* the base at the hub, as a SLAB: only the triangles whose centroid lies
     within 3 mm of petal 0's meridian plane (the half-plane through the axis
     and its midrib), seen 35-45 degrees off that plane — a cutaway, so
     the hub slab, the ring's foot rows inside it and the ring rising out of the
     rim read in one picture. One layer and three. */
  for (const [nm, set, hh] of [['BASE SLAB N 8', {}, 5], ['BASE SLAB 3 LAYERS', { layerCount: 3 }, 8]]) for (const shape of ['ROUND', 'STRAIGHT']) cellsDef.push([`${shape} ${nm}`, set, { shape, k: 0 }, (b) => {
    const rr = b.ringReport[0], P = rr.mids[2][0];
    const th = Math.atan2(P[1], P[0]);
    const R = [Math.cos(th), Math.sin(th), 0], Tn = [-Math.sin(th), Math.cos(th), 0];
    return { dir: norm([Tn[0] * 0.75 + R[0] * 0.3, Tn[1] * 0.75 + R[1] * 0.3, 0.5]), up: [0, 0, 1], center: [P[0] - R[0] * (hh - 3), P[1] - R[1] * (hh - 3), P[2] + 1.5], halfHeight: hh, slab: { Tn, R, w: 3 } };
  }]);
  for (const [i, [nm, set, opt, camOf]] of cellsDef.entries()) {
    const b = await buildTube(set, opt);
    const sic = ringSI(b);
    cell(out, W, H, b, S, (i % 4) * S, 40 + Math.floor(i / 4) * (S + CAPH), camOf(b), [[nm], [`RING SELF-X ${sic}`, sic ? [255, 120, 100] : [235, 180, 120]]]);
    log.push({ sheet: 'zoom', nm, ringSI: sic });
  }
  writePng(path.join(outDir, 'tube-zoom.png'), W, H, out);
}

/* the discovery prototype's web, its own function SLICED from its source (the
   file renders its sheet at import, so it cannot be imported) */
async function webBuilder() {
  const src = fs.readFileSync(path.join(HERE, 'shot-bloom-fusion-prototype.mjs'), 'utf8');
  const a = src.indexOf('export function buildWithWebs('), b = src.indexOf('const CELLS = [');
  if (a < 0 || b < a) throw new Error('could not slice buildWithWebs from shot-bloom-fusion-prototype.mjs');
  const G = await import('../bloom-geometry.js');
  const { stateOf, measure } = await import('./bloom-fusion-margins.mjs');
  const pre = src.slice(src.indexOf('const sub ='), a);
  return new Function('G', 'stateOf', 'measure', 'census', `${pre}\n${src.slice(a, b).replace('export function', 'function')}\nreturn buildWithWebs;`)(G, stateOf, measure, census);
}
async function vsWeb() {
  const buildWithWebs = await webBuilder();
  const set = { petalCount: 5, petalTilt: 60 };
  const S = 380, CAPH = 40, W = 4 * S, H = 40 + S + CAPH;
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'RING VS WEB - 5 PETALS TILT 60 (A CLEAN STATE FOR THE WEB) - ONE CAMERA - EXPORT', [240, 240, 236], 2);
  const ringR = await buildTube(set, { shape: 'ROUND', k: 0 });
  const bb = bbox(ringR.positions);
  const cam = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half * 1.05 };
  const cellsDef = [];
  for (const round of [false, true]) {
    const w = buildWithWebs(set, { slits: [], webT: 'B', round });
    const fold = w.webWithin.reduce((s, x) => s + x, 0);
    cellsDef.push([`WEB ${round ? 'ROUND' : 'STRAIGHT'} (DISCOVERY S6, BODY T)`, w.pos, `TRIS ${w.bloomTris + w.webTris}  WEB SELF-X ${fold}`, fold, w.bloomTris * 9]);
  }
  for (const shape of ['ROUND', 'STRAIGHT']) {
    const b = shape === 'ROUND' ? ringR : await buildTube(set, { shape, k: 0 });
    const sic = ringSI(b);
    cellsDef.push([`RING ${shape} (THIS PROTOTYPE)`, b.positions, `TRIS ${b.tubeTris}  RING SELF-X ${sic}`, sic, (b.tubeTris - b.ringReport[0].ringTris) * 9]);
  }
  for (const [i, [nm, pos, cap, si, split]] of cellsDef.entries()) {
    const img = render(pos, S, S, cam, { color: INK, bg: BG, tint: (t) => (t * 9 >= split ? 1 : 0.86) });
    blit(out, W, H, img, S, S, i * S, 40);
    text(out, W, H, i * S + 6, 40 + S + 4, nm, [230, 230, 226], 1);
    text(out, W, H, i * S + 6, 40 + S + 16, cap, si ? [255, 120, 100] : [235, 180, 120], 1);
    log.push({ sheet: 'web', nm, cap });
  }
  writePng(path.join(outDir, 'tube-vs-web.png'), W, H, out);
}


/* ---------------- partial fusion (Eva's ruling on #323) ---------------- */
const HS = [0.25, 0.40, 0.55, 0.70];
async function hStrip(file, title, states) {
  const S = 300, CAPH = 40;
  const W = HS.length * 2 * S, H = 40 + states.length * (S + CAPH + 18);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, title, [240, 240, 236], 2);
  for (const [ri, [nm, set]] of states.entries()) {
    const oy = 40 + ri * (S + CAPH + 18);
    text(out, W, H, 6, oy, `${nm} - LEFT ROUND, RIGHT STRAIGHT - H 0.25 / 0.40 / 0.55 / 0.70 - ONE CAMERA PER ROW`, [240, 200, 120], 1);
    let cam = null;
    for (const [si, shape] of ['ROUND', 'STRAIGHT'].entries()) for (const [hi, h] of HS.entries()) {
      const b = await buildTube(set, { shape, k: 0, h });
      if (!cam) { const bb = bbox(b.positions); cam = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half }; }
      const si1 = ringSI(b), ps = petalSI(b);
      const bi = b.blendInfo[0];
      cell(out, W, H, b, S, (si * HS.length + hi) * S, oy + 14, cam, [[`${shape} H ${h.toFixed(2)} (RING TO U ${bi.uTop.toFixed(3)})`], [`RING ${si1} PETALS ${ps}  TRIS ${b.tubeTris} (FREE ${b.plainTris})`, si1 || ps ? [255, 120, 100] : [235, 180, 120]]]);
      log.push({ sheet: file, nm, shape, h, ringSI: si1, petalSI: ps, tris: b.tubeTris, free: b.plainTris });
    }
  }
  writePng(path.join(outDir, file), W, H, out);
}
async function zoomPartial() {
  const S = 340, CAPH = 30;
  const W = 4 * S, H = 40 + 2 * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE H 0.40 ZOOM - EXPORT (PRINT PREVIEW) - FUSION LINE, SINUS, SLIT', [240, 240, 236], 2);
  const cellsDef = [];
  for (const shape of ['ROUND', 'STRAIGHT']) {
    /* the fusion line on petal 0: the ring's top row to the blend's end, seen square to the petal */
    cellsDef.push([`${shape} FUSION LINE N 8 H 0.40`, {}, { shape, k: 0, h: 0.4 }, (b) => {
      const g = b.geo[0], bi = b.blendInfo[0], r = Math.round((bi.R1 + bi.bEnd) / 2);
      const P = g.midsAll[r][0], N = g.normalsAll[r][0];
      return { dir: norm([N[0] + 0.3 * P[0] / Math.hypot(P[0], P[1]), N[1] + 0.3 * P[1] / Math.hypot(P[0], P[1]), N[2]]), up: [0, 0, 1], center: P, halfHeight: 9 };
    }]);
    /* the sinus: the ring's top edge between petal 0 and petal 1 */
    cellsDef.push([`${shape} SINUS N 8 H 0.40`, {}, { shape, k: 0, h: 0.4 }, (b) => {
      const g = b.geo[0], R1 = g.R1, n = b.n;
      const th = Math.atan2(g.midsAll[R1][0][1], g.midsAll[R1][0][0]) + Math.PI / n;
      const P = g.curveAt(R1)(th), N = g.ringN(R1, th);
      return { dir: norm([N[0] + 0.4 * Math.cos(th), N[1] + 0.4 * Math.sin(th), N[2] + 0.3]), up: [0, 0, 1], center: P, halfHeight: 6 };
    }]);
  }
  for (const shape of ['ROUND', 'STRAIGHT']) {
    /* a slit: n 8, k 4, at the ring's mid-height */
    cellsDef.push([`${shape} SLIT N 8 K 4 H 0.40`, {}, { shape, k: 4, h: 0.4 }, (b) => {
      const g = b.geo[0], r = Math.max(3, Math.floor(g.R1 * 0.6)), n = b.n, D = 2 * Math.PI / n;
      const th0 = Math.atan2(g.midsAll[g.R1][0][1], g.midsAll[g.R1][0][0]), thS = th0 - D / 2 + 2 * D;
      const P = g.curveAt(r)(thS), N = g.ringN(r, thS);
      return { dir: norm([N[0] + 0.3 * Math.cos(thS), N[1] + 0.3 * Math.sin(thS), N[2] + 0.4]), up: [0, 0, 1], center: P, halfHeight: 5 };
    }]);
    /* the fusion line at tilt 60 x 5, where the ring is a deep cup */
    cellsDef.push([`${shape} FUSION LINE N 5 TILT 60 H 0.40`, { petalCount: 5, petalTilt: 60 }, { shape, k: 0, h: 0.4 }, (b) => {
      const g = b.geo[0], bi = b.blendInfo[0], r = Math.round((bi.R1 + bi.bEnd) / 2);
      const P = g.midsAll[r][0];
      const th = Math.atan2(P[1], P[0]);
      return { dir: norm([Math.cos(th), Math.sin(th), 0.25]), up: [0, 0, 1], center: P, halfHeight: 9 };
    }]);
  }
  for (const [i, [nm, set, opt, camOf]] of cellsDef.entries()) {
    const b = await buildTube(set, opt);
    const sic = ringSI(b), ps = petalSI(b);
    cell(out, W, H, b, S, (i % 4) * S, 40 + Math.floor(i / 4) * (S + CAPH), camOf(b), [[nm], [`RING ${sic} PETALS ${ps}  BLEND ${b.blendMm} MM`, sic || ps ? [255, 120, 100] : [235, 180, 120]]]);
    log.push({ sheet: 'zoom-partial', nm, ringSI: sic, petalSI: ps });
  }
  writePng(path.join(outDir, 'tube-partial-zoom.png'), W, H, out);
}
if (want('hstrip')) await hStrip('tube-partial-h.png', 'TUBE FUSED PARTWAY - THE H STRIP ON THE DEFAULT - EXPORT', [['DEFAULT (N 8)', {}], ['N 5 TILT 60', { petalCount: 5, petalTilt: 60 }]]);
if (want('hform')) await hStrip('tube-partial-form.png', 'TUBE FUSED PARTWAY - THE PETALS STILL RESPOND ABOVE THE LINE - EXPORT', [['CUP 1.2 (MAX)', { petalCup: 1.2 }], ['ROLL 330 (MAX)', { petalRoll: 330 }], ['TWIST 180 (MAX)', { petalTwist: 180 }]]);
if (want('pgrid')) { await gridSheet('ROUND', 'tube-partial-round.png', 0.4); await gridSheet('STRAIGHT', 'tube-partial-straight.png', 0.4); }
if (want('pzoom')) await zoomPartial();
if (want('round')) await gridSheet('ROUND', 'tube-round.png');
if (want('straight')) await gridSheet('STRAIGHT', 'tube-straight.png');
if (want('strips')) await strips();
if (want('zoom')) await zoom();
if (want('web')) await vsWeb();
fs.writeFileSync(path.join(outDir, 'tube-sheets.json'), JSON.stringify(log, null, 1));
console.log(`${log.length} cells -> ${outDir}`);
