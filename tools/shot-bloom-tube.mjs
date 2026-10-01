/* ===================================================================
   SCRATCH PROTOTYPE SHEETS — THE CLOSED-RING TUBE. NOT SHIPPED.

     node tools/shot-bloom-tube.mjs <outDir> [--only cgrid,cblend,czoom,cform,hstrip,hform,pgrid,pzoom,round,straight,strips,zoom,web]

   Renders the scratch ring of tools/bloom-tube-ring.mjs (read its header for
   what is patched and why) through tools/bloom-soft-render.mjs, which is
   deterministic: same triangles, same bytes — so no pixel delta is quoted and
   no same-tree control is owed. Every build is EXPORT mode (the print preview:
   the floored sheet, the 0.80 mm tip floor). Fixed camera per sheet, no
   rotation, no chrome (there is no page). Every caption carries the ring's own
   self-intersection count (each ring shell censused ALONE with
   tools/bloom-self-intersection.mjs), so no cell can quietly carry a fold.

   Sheets — PART C (the default since Eva's rulings on Part B: ROUND only,
   STRAIGHT dropped; h 0.25; the BLEND slider; petal-edge slits):
     tube-c-grid.png    n x k grid at h 0.25, BLEND 0, the new slit edges
     tube-c-blend.png   BLEND 0 / 0.5 / 1 on the default at h 0.25 and h 0.40,
                        and 5 petals at h 0.40 (where the notch reads), whole
                        and macro, one camera per row
     tube-c-zoom.png    the flare before / after with the old crease marked (an
                        oblique view and a meridian slab), the notch, a slit
                        edge low down (the shingle)
     tube-c-form.png    cup / roll / twist maximum at h 0.25, BLEND 0.5
   Sheets — PARTIAL FUSION (Part B; --only hstrip,hform,pgrid,pzoom):
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
import { buildTube, divisorsOf, measureTube, fusionProfile, notchCorner } from './bloom-tube-ring.mjs';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { census } from './bloom-self-intersection.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
if (!outDir) throw new Error('usage: node tools/shot-bloom-tube.mjs <outDir>');
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const DEFAULTS = ['cgrid', 'cblend', 'czoom', 'cform'];
const want = (k) => (only ? only.includes(k) : DEFAULTS.includes(k));

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
  /* RING BEHIND COINCIDENT PETAL SKIN (Part C sheets): a flared lobe lies ON
     the ring at full thickness by design, so the two closed shells share a
     surface and a z-buffer draws a sawtooth of whichever triangle wins each
     pixel. The ring's triangles are pushed 0.02 mm AWAY from the camera for
     the picture only (the geometry is untouched; the slicer unions the two). */
  if (cam.ringBias && !b.free) {
    const ringFrom = b.tubeTris - b.ringReport.reduce((a, x) => a + x.ringTris, 0);
    const d = norm(cam.dir), q = pos === b.positions ? Array.from(pos) : pos;
    for (let t = ringFrom; t < q.length / 9; t++) for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) q[t * 9 + v * 3 + k] -= d[k] * cam.ringBias;
    pos = q;
  }
  const img = render(pos, S, S, cam, { color: INK, bg: BG, tint });
  blit(out, W, H, img, S, S, ox, oy);
  caps.forEach((c, i) => text(out, W, H, ox + 6, oy + S + 4 + i * 12, c[0], c[1] || [230, 230, 226], 1));
}
const kName = (k, n) => (k === 0 ? 'TUBE (K 0)' : k === n ? `FREE (K ${n})` : `K ${k} - ${k} PANEL${k > 1 ? 'S' : ''} OF ${n / k}`);
const log = [];

async function gridSheet(shape, file, h = null, extra = {}) {
  const NS = [5, 6, 8, 12];
  const cols = Math.max(...NS.map((n) => divisorsOf(n).length + 1));
  const S = 300, CAPH = 40, W = cols * S, H = 40 + NS.length * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, `TUBE - ${shape} RING THROUGH THE MIDRIBS${h === null ? ' TO THE NIB' : ` FUSED TO H ${h.toFixed(2)}, FREE PETALS ABOVE`}${extra.blend !== undefined ? ` - BLEND ${extra.blend} - SLITS KEEP THE PETAL EDGE` : ''} - EXPORT - ROWS N 5 6 8 12 - COLUMNS EVERY VALID K`, [240, 240, 236], 2);
  for (const [ri, n] of NS.entries()) {
    const ks = [0, ...divisorsOf(n)];
    let cam = null;
    for (const [ci, k] of ks.entries()) {
      const b = await buildTube({ petalCount: n }, { shape, k, h, ...extra });
      if (!cam) { const bb = bbox(b.positions); cam = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half, ...(extra.blend !== undefined ? { ringBias: 0.05 } : {}) }; }
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
/* ---------------- Part C (Eva's rulings on Part B) ---------------- */
const RED = [255, 90, 70], TEAL = [90, 220, 210];
/* a 3D point to this cell's pixel, the renderer's own projection (supersample
   cancels: the image is downsampled to S) */
function projector(cam, S) {
  const nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fwd = nrm(cam.dir.map((c) => -c)), right = nrm(crs(fwd, cam.up)), up = nrm(crs(right, fwd)), sc = (S / 2) / cam.halfHeight;
  return (p) => { const d = sub(p, cam.center); return [S / 2 + dt(d, right) * sc, S / 2 - dt(d, up) * sc]; };
}
function markLine(out, W, H, ox, oy, S, cam, pts, col) {
  const pr = projector(cam, S);
  const xy = pts.map(pr);
  for (let i = 0; i + 1 < xy.length; i++) {
    const [x0, y0] = xy[i], [x1, y1] = xy[i + 1], n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let q = 0; q <= n; q++) {
      const x = Math.round(x0 + (x1 - x0) * q / n), y = Math.round(y0 + (y1 - y0) * q / n);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= S || Y >= S) continue; const o = ((oy + Y) * W + ox + X) * 3; out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; }
    }
  }
}
/* the line where petal p's lobe starts (its flat base wall), on its top skin */
function baseLine(b, row, p = 0) {
  const rows = b.petalRows[p], t = rows[row].tUsed || 1.2;
  return Array.from({ length: 21 }, (_, j) => { const q = rows[row].sect(-1 + j / 10); return [q.P[0] + q.n[0] * t / 2, q.P[1] + q.n[1] * t / 2, q.P[2] + q.n[2] * t / 2]; });
}
const capOf = (b) => { const si = ringSI(b), ps = petalSI(b); return [`RING ${si} PETALS ${ps}  TRIS ${b.tubeTris} (FREE ${b.plainTris})`, si || ps ? [255, 120, 100] : [235, 180, 120]]; };
async function cGrid() { await gridSheet('ROUND', 'tube-c-grid.png', 0.25, { blend: 0 }); }
/* a macro camera on petal 0's base and the sinus after it, the ring's top row */
function joinCam(b, hh = 6, frac = 0.5) {
  const g = b.geo[0], R1 = g.R1, n = b.n;
  const th = Math.atan2(g.midsAll[R1][0][1], g.midsAll[R1][0][0]) + frac * Math.PI / n;
  const P = g.curveAt(R1)(th), N = g.ringN(R1, th);
  return { dir: norm([N[0] + 0.35 * Math.cos(th), N[1] + 0.35 * Math.sin(th), N[2] + 0.35]), up: [0, 0, 1], center: P, halfHeight: hh, ringBias: 0.02 };
}
/* a 2D plot of the measured top-skin height above the ring's mid-surface along
   petal 0's meridian (fusionProfile's own samples), BLEND 0 red against BLEND
   1 teal, the ring's top row and the old crease marked */
function profilePlot(out, W, H, ox, oy, S, profs, cols, labels) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = ((oy + y) * W + ox + x) * 3; out[o] = 22; out[o + 1] = 22; out[o + 2] = 26; }
  const all = profs.flatMap((p) => p.samples);
  const s0 = Math.min(...all.map((o) => o.s)), s1 = Math.max(...all.map((o) => o.s));
  const h0 = 0.30, h1 = 0.65;
  const X = (s) => 30 + ((s - s0) / (s1 - s0)) * (S - 40), Y = (h) => S - 30 - ((h - h0) / (h1 - h0)) * (S - 60);
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= S || y >= S) return; const o = ((oy + y) * W + ox + x) * 3; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; };
  for (const hh of [0.4, 0.5, 0.6]) { for (let x = 30; x < S - 10; x += 3) put(x, Y(hh), [70, 70, 76]); text(out, W, H, ox + 2, oy + Y(hh) - 3, hh.toFixed(1), [150, 150, 150], 1); }
  profs.forEach((p, i) => { for (let q = 0; q + 1 < p.samples.length; q++) { const a = p.samples[q], c = p.samples[q + 1]; const n = 20; for (let k = 0; k <= n; k++) { const x = X(a.s + (c.s - a.s) * k / n), y = Y(Math.max(h0, a.height + (c.height - a.height) * k / n)); put(x, y, cols[i]); put(x, y + 1, cols[i]); } } });
  labels.forEach((l, i) => text(out, W, H, ox + 34, oy + 8 + i * 12, l, cols[i] || [220, 220, 220], 1));
  text(out, W, H, ox + 34, oy + S - 20, 'X MIDRIB ARC - Y TOP SKIN ABOVE MID-SURFACE (MM)', [180, 180, 180], 1);
}
async function cBlend() {
  const BL = [0, 0.5, 1], S = 300, CAPH = 40;
  const rowsDef = [['DEFAULT (N 8) H 0.25', {}, 0.25], ['DEFAULT (N 8) H 0.40', {}, 0.4], ['N 5 H 0.40 - WHERE THE NOTCH HAS ROOM', { petalCount: 5 }, 0.4]];
  const W = 6 * S, H = 40 + rowsDef.length * (S + CAPH + 18);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE ROUND - THE BLEND STRIP 0 / 0.5 / 1 - LEFT WHOLE, RIGHT MACRO ON PETAL 0 AND THE SINUS - EXPORT', [240, 240, 236], 2);
  for (const [ri, [nm, set, h]] of rowsDef.entries()) {
    const oy = 40 + ri * (S + CAPH + 18);
    text(out, W, H, 6, oy, `${nm} - ONE CAMERA PER HALF ROW`, [240, 200, 120], 1);
    let camW = null, camM = null;
    for (const [bi, blend] of BL.entries()) {
      const b = await buildTube(set, { shape: 'ROUND', k: 0, h, blend });
      if (!camW) { const bb = bbox(b.positions); camW = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half, ringBias: 0.05 }; camM = joinCam(b); }
      const nc = notchCorner(b), fp = fusionProfile(b), rr = b.ringReport[0];
      const l2 = `FLARE ${rr.flare.rows}/${rr.flare.need} ROWS  JOIN TURN ${fp.maxTurnDeg.toFixed(1)} DEG`;
      const l3 = nc.engaged ? `NOTCH R ${nc.r.toFixed(2)} DEPTH ${nc.depthMm.toFixed(2)} MM  CORNER TURN ${nc.turnBeforeDeg.toFixed(0)} TO ${nc.turnAfterDeg.toFixed(1)} DEG` : nc.gapMm > 0 ? `NOTCH OFF AT BLEND 0 (SINUS ${nc.gapMm.toFixed(2)} MM, CORNER TURN ${nc.turnBeforeDeg.toFixed(0)} DEG)` : `NOTCH INERT (SINUS ${nc.gapMm.toFixed(2)} MM, CLOSED)`;
      cell(out, W, H, b, S, bi * S, oy + 14, camW, [[`BLEND ${blend}`], capOf(b)]);
      cell(out, W, H, b, S, (3 + bi) * S, oy + 14, camM, [[`BLEND ${blend} MACRO`], [l2, [200, 220, 200]], [l3, [200, 220, 200]]]);
      log.push({ sheet: 'tube-c-blend.png', nm, blend, flare: rr.flare, joinTurn: fp.maxTurnDeg, notch: nc, ringSI: ringSI(b), petalSI: petalSI(b), tris: b.tubeTris, free: b.plainTris });
    }
  }
  writePng(path.join(outDir, 'tube-c-blend.png'), W, H, out);
}
async function cZoom() {
  const S = 340, CAPH = 30, W = 4 * S, H = 40 + 2 * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE ROUND ZOOM - EXPORT - THE FLARE (RED = THE CREASE AT BLEND 0, TEAL = WHERE IT WAS), THE NOTCH, A SLIT EDGE', [240, 240, 236], 2);
  const b0 = await buildTube({}, { shape: 'ROUND', k: 0, h: 0.25, blend: 0 }), b1 = await buildTube({}, { shape: 'ROUND', k: 0, h: 0.25, blend: 1 });
  const g = b0.geo[0], R1 = g.R1, P = g.midsAll[R1 - 1][0], th = Math.atan2(P[1], P[0]), N = g.ringN(R1, th);
  const crease = baseLine(b0, b0.blendInfo[0].S);
  const obl = { dir: norm([N[0] + 0.2 * Math.cos(th), N[1] + 0.2 * Math.sin(th), N[2] + 0.5]), up: [0, 0, 1], center: P, halfHeight: 5, ringBias: 0.02 };
  const f0 = fusionProfile(b0), f1 = fusionProfile(b1);
  const cells = [
    [b0, obl, [`FLARE BLEND 0 - THE CREASE (RED)`], [`JOIN TURN ${f0.maxTurnDeg.toFixed(1)} DEG  TOP SKIN ${f0.heightMin.toFixed(3)}-${f0.heightMax.toFixed(3)} MM`, [255, 160, 140]], RED],
    [b1, obl, [`FLARE BLEND 1 - SAME CAMERA`], [`JOIN TURN ${f1.maxTurnDeg.toFixed(1)} DEG  TOP SKIN ${f1.heightMin.toFixed(3)}-${f1.heightMax.toFixed(3)} MM`, [160, 230, 200]], TEAL],
  ];
  for (const [i, [b, cam, c1, c2, col]] of cells.entries()) {
    cell(out, W, H, b, S, i * S, 40, cam, [c1, c2]);
    markLine(out, W, H, i * S, 40, S, cam, crease, col);
  }
  const bh = await buildTube({}, { shape: 'ROUND', k: 0, h: 0.25, blend: 0.5 });
  const fh = fusionProfile(bh);
  profilePlot(out, W, H, 2 * S, 40, S, [f0, fh, f1], [RED, [240, 200, 120], TEAL], ['BLEND 0', 'BLEND 0.5', 'BLEND 1']);
  text(out, W, H, 2 * S + 6, 40 + S + 4, 'PETAL 0 MERIDIAN - EMITTED MESH', [230, 230, 226], 1);
  text(out, W, H, 2 * S + 6, 40 + S + 16, `MAX FACET TURN ${f0.maxTurnDeg.toFixed(1)} / ${fh.maxTurnDeg.toFixed(1)} / ${f1.maxTurnDeg.toFixed(1)} DEG`, [235, 180, 120], 1);
  const fs1 = fusionProfile(b0, { frac: 0.5 }), fs2 = fusionProfile(b1, { frac: 0.5 });
  profilePlot(out, W, H, 3 * S, 40, S, [fs1, fs2], [RED, TEAL], ['BLEND 0', 'BLEND 1']);
  text(out, W, H, 3 * S + 6, 40 + S + 4, 'HALF WAY TO THE NEXT PETAL', [230, 230, 226], 1);
  text(out, W, H, 3 * S + 6, 40 + S + 16, `MAX FACET TURN ${fs1.maxTurnDeg.toFixed(1)} / ${fs2.maxTurnDeg.toFixed(1)} DEG`, [235, 180, 120], 1);
  /* row 2: the notch at 5 petals h 0.40 (b 0, b 1), the default's notch at h 0.40 b 1, a slit edge low down */
  const n0 = await buildTube({ petalCount: 5 }, { shape: 'ROUND', k: 0, h: 0.4, blend: 0 }), n1 = await buildTube({ petalCount: 5 }, { shape: 'ROUND', k: 0, h: 0.4, blend: 1 });
  const camN = joinCam(n0, 7, 1);
  const d1 = await buildTube({}, { shape: 'ROUND', k: 0, h: 0.4, blend: 1 });
  const camD = joinCam(d1, 2.5, 1);
  const sl = await buildTube({}, { shape: 'ROUND', k: 4, h: 0.25, blend: 0 });
  const gs = sl.geo[0], r = 6, D = 2 * Math.PI / sl.n, th0 = Math.atan2(gs.midsAll[gs.R1][0][1], gs.midsAll[gs.R1][0][0]), thS = th0 + 1.5 * D;
  const PS = gs.curveAt(r)(thS), NS = gs.ringN(r, thS);
  const camS = { dir: norm([NS[0] + 0.4 * Math.cos(thS), NS[1] + 0.4 * Math.sin(thS), NS[2] + 0.2]), up: [0, 0, 1], center: PS, halfHeight: 6, ringBias: 0.02 };
  const m = await measureTube({}, { shape: 'ROUND', k: 4, h: 0.25, blend: 0, conn: false, petals: false });
  const sp = m.slitPairs.find((x) => x.slit === 0);
  const nc0 = notchCorner(n0), nc1 = notchCorner(n1), ncd = notchCorner(d1);
  const row2 = [
    [n0, camN, [`NOTCH N 5 H 0.40 BLEND 0`], [`CORNER TURN ${nc0.turnBeforeDeg.toFixed(1)} DEG  SINUS ${nc0.gapMm.toFixed(2)} MM`, [255, 160, 140]]],
    [n1, camN, [`NOTCH N 5 H 0.40 BLEND 1`], [`R ${nc1.r.toFixed(2)} DEPTH ${nc1.depthMm.toFixed(2)} MM  TURN ${nc1.turnAfterDeg.toFixed(1)} DEG`, [160, 230, 200]]],
    [d1, camD, [`NOTCH DEFAULT H 0.40 BLEND 1 (3 MM FRAME)`], [`R ${ncd.r.toFixed(2)} DEPTH ${ncd.depthMm.toFixed(2)} MM  SINUS ${ncd.gapMm.toFixed(2)}`, [200, 220, 200]]],
    [sl, camS, [`SLIT EDGE N 8 K 4 LOW DOWN (ROW ${r})`], [`SHINGLE ${sp.ours.between} PAIRS (TODAY ${sp.today.between})  EDGE SELF-X ${sp.ours.withinA + sp.ours.withinB}`, sp.ours.withinA + sp.ours.withinB ? [255, 120, 100] : [235, 180, 120]]],
  ];
  for (const [i, [b, cam, c1, c2]] of row2.entries()) cell(out, W, H, b, S, i * S, 40 + S + CAPH, cam, [c1, c2]);
  log.push({ sheet: 'tube-c-zoom.png', flare0: { turn: f0.maxTurnDeg, hmin: f0.heightMin }, flare1: { turn: f1.maxTurnDeg, hmin: f1.heightMin }, notch: [nc0, nc1, ncd], slit: sp });
  writePng(path.join(outDir, 'tube-c-zoom.png'), W, H, out);
}
async function cForm() {
  const S = 300, CAPH = 40, states = [['DEFAULT', {}], ['CUP 1.2 (MAX)', { petalCup: 1.2 }], ['ROLL 330 (MAX)', { petalRoll: 330 }], ['TWIST 180 (MAX)', { petalTwist: 180 }]];
  const W = 4 * S, H = 40 + 2 * (S + CAPH);
  const out = Buffer.alloc(W * H * 3, 16);
  text(out, W, H, 8, 8, 'TUBE ROUND H 0.25 BLEND 0.5 - FORM AT MAXIMUM - ONE CAMERA PER ROW (WHOLE, THEN MACRO) - EXPORT', [240, 240, 236], 2);
  let camW = null, camM = null;
  for (const [i, [nm, set]] of states.entries()) {
    const b = await buildTube(set, { shape: 'ROUND', k: 0, h: 0.25, blend: 0.5 });
    if (!camW) { const bb = bbox(b.positions); camW = { dir: CAM, up: [0, 0, 1], center: bb.ctr, halfHeight: bb.half, ringBias: 0.05 }; camM = joinCam(b, 9); }
    cell(out, W, H, b, S, i * S, 40, camW, [[nm], capOf(b)]);
    cell(out, W, H, b, S, i * S, 40 + S + CAPH, camM, [[`${nm} MACRO`], capOf(b)]);
    log.push({ sheet: 'tube-c-form.png', nm, ringSI: ringSI(b), petalSI: petalSI(b), tris: b.tubeTris });
  }
  writePng(path.join(outDir, 'tube-c-form.png'), W, H, out);
}
if (want('cgrid')) await cGrid();
if (want('cblend')) await cBlend();
if (want('czoom')) await cZoom();
if (want('cform')) await cForm();
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
