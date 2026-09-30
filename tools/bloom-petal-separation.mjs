/* ===================================================================
   bloom-petal-separation.mjs — DOES ANY PETAL COME OFF THE HUB?

     node tools/bloom-petal-separation.mjs [--field size|form|both] [--only <i,j,..>] [--live]
     node tools/bloom-petal-separation.mjs --foot     (the hub-ring check alone, seconds)

   AN INSTRUMENT, WIRED TO NO GATE — the reason it lives in tools/ is the one
   bloom-neighbour-gap.mjs and bloom-curl-near-zero.mjs give: the organic
   variance builds (size, form, spacing) each ask the same question — "at the
   limit of the amount, at the extremes of the arrangement, is the bloom still
   ONE connected piece?" — and so does any future range opening. The STL gates
   answer it over the matrix; this answers it over a product the matrix does
   not hold (the matrix varies one control at a time).

   WHAT IT BUILDS: `buildBloomInto(new MeshBuilder({ exportMode }), state)` —
   exactly what both STL gates and every Node byte tool call — at the defaults,
   at each END of petalCount, layerCount, layerSize, footDelicacy and
   petalTilt, and at four stacked corners (the heaviest 40 petals x 6 layers x
   layerSize 0.35 x footDelicacy 0.25, with and without tilt 120, and the same
   on CONTINUOUS), crossed with amount 0 / half / max, frequency 1 and 20,
   phase 0 and 90. EXPORT mode by default (the object; `--live` adds LIVE).

   WHAT IT MEASURES: a voxel flood fill over the export stream at the gate's
   own 0.6 mm cell (tools/verify-bloom-connectedness.mjs), re-read at 0.3 mm
   where 0.6 reports more than one region (the gate's own half-cell rule).
   CALIBRATED IN THE TOOL before any verdict is quoted — two OVERLAPPING boxes
   must read 1 region and two SEPARATED boxes 2 — and the run REFUSES rather
   than reporting on an instrument it has not checked. It also reports the
   triangle count per (base, amount), the smallest size factor the builder
   RECORDED (`built.variance.factors`, never recomputed here), and for the form
   field the widest per-slot delta the builder recorded.

   `--foot` VERIFIES, rather than cites, the reason size variance cannot move a
   foot: it drives `petalSurface` (the shipped owner) on the first slot the real
   whorl primitive emits, once at the slot's own scale and once at half of it,
   and compares every foot row's centre, normal and half-width under
   `Object.is`. The foot is laid from `ring.radius`, `ring.width`,
   `ring.overhang` and `slot.z` and from no `slot.scale` (petalSurface's
   `footRowsAt`), which is what this reads back.

   Figures for SIZE (the first run, docs/bloom-organic-variance-size-outcome.md
   §13): 144 builds, EXPORT, 128 with the field on, smallest factor exactly
   0.50, every build ONE connected piece at 0.6 mm, triangle count independent
   of the amount.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { firstSlot } from './bloom-first-slot.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const FIELD = opt('--field', 'size');
const LIVE = argv.includes('--live');
const ONLY = opt('--only', null);
/* `--amounts a,b` and `--settings f:ph,...` restrict a run so a heavy base
   (a 730,000-triangle corner is ~1 min a build here) closes in pieces that fit
   a foreground call; a restricted run is REPORTED as a subset, never a sweep. */
const AMOUNTS = opt('--amounts', null);
const SETTINGS_ONLY = opt('--settings', null);

export function components(positions, cell) {
  const n = positions.length / 9; if (!n) return 0;
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) { const v = positions[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  const pad = 2, dim = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - lo[k]) / cell) + 1 + 2 * pad));
  const N = dim[0] * dim[1] * dim[2]; if (N > 120e6) return -1;
  const buf = new Uint8Array(N), idx = (a, b, c) => (a * dim[1] + b) * dim[2] + c;
  const put = (x, y, z) => { buf[idx(Math.round((x - lo[0]) / cell) + pad, Math.round((y - lo[1]) / cell) + pad, Math.round((z - lo[2]) / cell) + pad)] = 1; };
  const P = positions;
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const e = Math.max(Math.hypot(P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]), Math.hypot(P[o + 6] - P[o + 3], P[o + 7] - P[o + 4], P[o + 8] - P[o + 5]), Math.hypot(P[o] - P[o + 6], P[o + 1] - P[o + 7], P[o + 2] - P[o + 8]));
    const s = Math.max(2, Math.ceil((2 * e) / cell));
    for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) { const u = i / s, v = j / s, w = 1 - u - v;
      put(P[o] * w + P[o + 3] * u + P[o + 6] * v, P[o + 1] * w + P[o + 4] * u + P[o + 7] * v, P[o + 2] * w + P[o + 5] * u + P[o + 8] * v); }
  }
  let comps = 0; const seen = new Uint8Array(N), st = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!buf[i] || seen[i]) continue; comps++; let sp = 0; st[sp++] = i; seen[i] = 1;
    while (sp) { const q = st[--sp]; const c = q % dim[2], b = ((q - c) / dim[2]) % dim[1], a = ((q - c) / dim[2] - b) / dim[1];
      for (const [x, y, z] of [[a + 1, b, c], [a - 1, b, c], [a, b + 1, c], [a, b - 1, c], [a, b, c + 1], [a, b, c - 1]]) {
        if (x < 0 || y < 0 || z < 0 || x >= dim[0] || y >= dim[1] || z >= dim[2]) continue;
        const j = idx(x, y, z); if (buf[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; } } }
  }
  return comps;
}

function calibrate() {
  const box = (a, x0, x1) => { const c = [[x0, 0, 0], [x1, 0, 0], [x1, 10, 0], [x0, 10, 0], [x0, 0, 10], [x1, 0, 10], [x1, 10, 10], [x0, 10, 10]];
    a.quad(c[0], c[3], c[2], c[1]); a.quad(c[4], c[5], c[6], c[7]); a.quad(c[0], c[1], c[5], c[4]); a.quad(c[1], c[2], c[6], c[5]); a.quad(c[2], c[3], c[7], c[6]); a.quad(c[3], c[0], c[4], c[7]); };
  const A = new G.MeshBuilder({ exportMode: true }); box(A, 0, 10); box(A, 5, 15);
  const B = new G.MeshBuilder({ exportMode: true }); box(B, 0, 10); box(B, 40, 50);
  const ov = components(A.positions, 0.6), sp = components(B.positions, 0.6);
  console.log(`CALIBRATION: two overlapping boxes -> ${ov} region(s); two separated -> ${sp}`);
  if (ov !== 1 || sp !== 2) { console.error('!! the flood fill cannot tell them apart — nothing below is quotable'); process.exit(1); }
}

function footCheck() {
  let rows = 0, bad = 0;
  for (const set of [{}, { petalCount: 40, layerCount: 6, layerSize: 0.35, footDelicacy: 0.25 }, { headRise: 0.5 }]) for (const exportMode of [true, false]) {
    const state = { ...DEFAULTS, ...set };
    const acc = new G.MeshBuilder({ exportMode });
    const { ring, slot } = firstSlot(state, acc);
    const a = G.petalSurface(state, ring, slot, null, acc).footRowsAt();
    const b = G.petalSurface(state, ring, { ...slot, scale: slot.scale * 0.5 }, null, acc).footRowsAt();
    if (a.length !== b.length) { bad++; continue; }
    for (let i = 0; i < a.length; i++) {
      rows++;
      const same = [0, 1, 2].every((k) => Object.is(a[i].C[k], b[i].C[k]) && Object.is(a[i].N[k], b[i].N[k])) && Object.is(a[i].h, b[i].h);
      if (!same) bad++;
    }
  }
  console.log(`FOOT: ${rows} foot rows compared at the slot's own scale and at half of it (defaults, the 40 x 6 corner, a dome; both modes) — ${bad} differ under Object.is`);
  return bad === 0;
}

const AXES = { petalCount: [3, 40], layerCount: [1, 6], layerSize: [0.35, 0.9], footDelicacy: [0.25, 1], petalTilt: [0, 120] };
export const BASES = (() => {
  const b = [{}];
  for (const [k, [lo, hi]] of Object.entries(AXES)) { b.push({ [k]: lo }); b.push({ [k]: hi }); }
  b.push({ petalCount: 40, layerCount: 6, layerSize: 0.35, footDelicacy: 0.25 });
  b.push({ petalCount: 40, layerCount: 6, layerSize: 0.35, footDelicacy: 0.25, petalTilt: 120 });
  b.push({ placement: 'CONTINUOUS', layerCount: 6, petalCount: 40, layerSize: 0.35, footDelicacy: 0.25 });
  b.push({ petalCount: 3, layerCount: 6, layerSize: 0.35, footDelicacy: 0.25, petalTilt: 120 });
  b.push({ petalCount: 3, footDelicacy: 0.25, petalTilt: 0 });
  return b;
})();

function amountsFor(field) {
  const sz = G.VARIANCE_SIZE_RANGE[1];
  const fm = G.VARIANCE_FORM_RANGE ? G.VARIANCE_FORM_RANGE[1] : null;
  if (field === 'size') return [[0, 0], [sz / 2, 0], [sz, 0]];
  if (field === 'form') { if (fm == null) throw new Error('--field form: this tree has no form variance'); return [[0, 0], [0, fm / 2], [0, fm]]; }
  if (field === 'both') { if (fm == null) throw new Error('--field both: this tree has no form variance'); return [[0, 0], [sz, fm]]; }
  throw new Error(`--field ${field}: size | form | both`);
}

function run() {
  calibrate();
  const footOk = footCheck();
  if (argv.includes('--foot')) process.exit(footOk ? 0 : 1);
  const only = ONLY ? new Set(ONLY.split(',').map(Number)) : null;
  const rows = [];
  for (const [bi, set] of BASES.entries()) {
    if (only && !only.has(bi)) continue;
    for (const exportMode of (LIVE ? [true, false] : [true])) for (const [aS, aF] of amountsFor(FIELD)) {
      const on = aS > 0 || aF > 0;
      if (AMOUNTS && !AMOUNTS.split(',').map(Number).includes(aS + aF)) continue;
      for (const f of (on ? [1, 20] : [1])) for (const ph of (on ? [0, 90] : [0])) {
        if (SETTINGS_ONLY && on && !SETTINGS_ONLY.split(',').includes(`${f}:${ph}`)) continue;
        const state = { ...DEFAULTS, ...set, varianceSize: aS, varianceFrequency: f, variancePhase: ph };
        if ('varianceForm' in DEFAULTS) state.varianceForm = aF;
        const acc = new G.MeshBuilder({ exportMode });
        const built = G.buildBloomInto(acc, state);
        const fac = built.variance?.factors?.flat?.() ?? [];
        const deltas = built.formVariance?.deltas ?? [];
        const c6 = components(acc.positions, 0.6);
        const c3 = c6 > 1 ? components(acc.positions, 0.3) : c6;
        const r = { base: bi, set: JSON.stringify(set), mode: exportMode ? 'export' : 'live', size: aS, form: aF, f, ph, tris: acc.triangleCount, c6, c3,
          minFactor: fac.length ? Math.min(...fac) : null,
          maxCurlDelta: deltas.length ? Math.max(...deltas.map((d) => Math.abs(d.petalSpineCurl ?? 0))) : null };
        rows.push(r);
        console.log(JSON.stringify(r));
      }
    }
  }
  if (AMOUNTS || SETTINGS_ONLY || ONLY) console.log(`\nA SUBSET (--only ${ONLY ?? 'all'} --amounts ${AMOUNTS ?? 'all'} --settings ${SETTINGS_ONLY ?? 'all'}) — not a sweep`);
  const off = rows.filter((r) => r.c3 !== 1);
  const withField = rows.filter((r) => r.size > 0 || r.form > 0);
  const byBase = new Map(); for (const r of rows) (byBase.get(r.base) ?? byBase.set(r.base, []).get(r.base)).push(r);
  const trisMove = [...byBase.values()].filter((v) => new Set(v.filter((r) => r.mode === 'export').map((r) => r.tris)).size > 1).length;
  console.log(`\n${rows.length} builds (${withField.length} with the field on); NOT one piece at 0.6 mm: ${rows.filter((r) => r.c6 !== 1).length}; after the 0.3 mm re-read: ${off.length}`);
  const facs = withField.map((r) => r.minFactor).filter((x) => x != null);
  if (facs.length) console.log(`smallest size factor the builder recorded: ${Math.min(...facs)}`);
  console.log(`bases whose EXPORT triangle count moves with the amount: ${trisMove} of ${byBase.size}`);
  for (const r of off) console.log('SEPARATED:', JSON.stringify(r));
  process.exit(off.length || !footOk ? 1 : 0);
}
run();
