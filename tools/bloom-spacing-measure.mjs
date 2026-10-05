#!/usr/bin/env node
/* ===================================================================
   bloom-spacing-measure.mjs — WHAT THE SPACING FIELD DOES TO THE NEIGHBOURS
   (organic variance, build 3; docs/bloom-organic-variance-spacing-outcome.md).
   An INSTRUMENT ONLY: wired to no gate, asserts nothing, emits no geometry.
   Every build goes through the SHIPPED builder with the SHIPPED field —
   `buildBloomInto` for the told flag, the crowding raster's inputs and the
   within-shell census; `tools/bloom-neighbour-gap.mjs`'s `buildPetals` with
   `fields: true` (the real fields handed to the real whorl primitive) where a
   per-petal triangle range is needed for the cross-shell census.

     node tools/bloom-spacing-measure.mjs [--section A|B|C] [--quick]

   EVERY FIGURE NAMES ITS MODE (EXPORT throughout) AND ITS SAMPLING:
     pitch     the told flag's tightest emitted pitch over nominal (all whorls)
     blade     the told flag's nearest petal approach, skin to skin, on the
               builder's 56 x 10 lamina above ROOT_BLEND_END (negative = the
               skins cross) — the drawn-blade closest approach
     feet      the told flag's nearest feet, centre to centre, in foot widths
     D_max     the crowding raster's deepest stack (stackDepth + refineDepth on
               footList's feet), CROWDED at >= 11
     X2        the within-shell census over the whole export stream (pairs)
     cross     petal-against-petal crossing pairs OUTSIDE the hub disc — the
               discovery's §2 quantity, CROSS-SHELL, which no gate reads; the
               shipped default's 1,504 is a one-off census number, not a
               baseline

   §A  THE STATES THE RULING NAMED: 8 and 40 petals, the amount at 0 and at its
       limit 0.9, frequency 1 and past n/2, phase 0 and 90.
   §B  THE CLOSEST APPROACH THE FIXED 0.9 MAXIMUM PERMITS, swept over every
       frequency 0..20 and phase in 15-degree steps at 3, 5, 8 and 40 petals:
       the tightest angle, the nearest feet and the drawn blade approach.
   §C  THE FOUR PAIR HAZARDS (on hold pending the SLS print): each pair's
       declared grid through the combination gate's OWN measure, with the
       field off and with it on at 0.9 (f 1 and past n/2, phase 0 and 90).
       Reported, never acted on.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { census } from './bloom-self-intersection.mjs';
import { buildPetals, petalCrossOutside } from './bloom-neighbour-gap.mjs';

const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
async function crowdingOf(built) {
  const { stackDepth, refineDepth, cellFor } = await import('./bloom-crowding.mjs');
  const feet = G.footList(built);
  const R = built.foot.hub.radius;
  const cell = cellFor(R);
  const d = stackDepth(feet, R, cell, built.foot.hub.dome);
  const fine = refineDepth(feet, d, cell, built.foot.hub.dome);
  return fine.dmax;
}
export async function measure(state, { cross = true } = {}) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, state);
  const N = b.neighbour;
  const out = {
    pitch: N.pitch ? N.pitch.ratio : null, tightDeg: N.pitch ? N.pitch.tightDeg : null,
    blade: N.blade ? N.blade.skinGapMm : null, feetQ: N.feet.q, feetD: N.feet.d,
    dmax: await crowdingOf(b), x2: census(acc.positions).within, tris: acc.triangleCount,
  };
  if (cross) {
    const { acc: a2, fr, petals } = buildPetals(state, { fields: true });
    out.cross = petalCrossOutside(a2, petals, fr.hub.radius).cross;
  }
  return out;
}
async function sectionA(quick) {
  console.log('§A THE NAMED STATES (EXPORT). pitch = tightest emitted / nominal; blade = nearest skin-to-skin approach (mm, negative crosses); feet = nearest feet in foot widths; D_max crowding; X2 within-shell pairs; cross = petal-vs-petal crossing pairs outside the hub (cross-shell, no gate reads it).');
  for (const n of (quick ? [8] : [8, 40])) {
    const past = Math.floor(n / 2) + 1;
    const rows = [['amount 0 (the shipped spacing)', {}]];
    for (const f of [1, past]) for (const ph of [0, 90]) rows.push([`0.9 f ${f}${f > n / 2 ? ' (past n/2)' : ''} phase ${ph}`, { varianceSpacing: 0.9, varianceFrequency: f, variancePhase: ph }]);
    for (const [label, set] of rows) {
      const r = await measure({ ...DEFAULTS, petalCount: n, ...set });
      console.log(`  n ${String(n).padStart(2)}  ${label.padEnd(30)} pitch ${fmt(r.pitch)} (${fmt(r.tightDeg, 2)}°)  blade ${fmt(r.blade)} mm  feet ${fmt(r.feetQ)} (${fmt(r.feetD, 2)} mm)  D_max ${r.dmax}  X2 ${r.x2}  cross ${r.cross}  tris ${r.tris}`);
    }
  }
}
async function sectionB(quick) {
  console.log('§B THE CLOSEST APPROACH THE FIXED 0.9 MAXIMUM PERMITS (EXPORT), over f 0..20 and phase 0..345 in 15-degree steps (no cross-shell census here — it is §A\'s):');
  for (const n of (quick ? [8] : [3, 5, 8, 40])) {
    let best = { pitch: Infinity }, bestBlade = { blade: Infinity }, bestFeet = { feetQ: Infinity };
    const base = await measure({ ...DEFAULTS, petalCount: n }, { cross: false });
    for (let f = 0; f <= 20; f++) for (let ph = 0; ph < 360; ph += (f === 0 || !quick ? 15 : 45)) {
      const st = { ...DEFAULTS, petalCount: n, varianceSpacing: 0.9, varianceFrequency: f, variancePhase: ph };
      const acc = new G.MeshBuilder({ exportMode: true });
      const b = G.buildBloomInto(acc, st);
      const N = b.neighbour;
      const r = { pitch: N.pitch.ratio, tightDeg: N.pitch.tightDeg, blade: N.blade ? N.blade.skinGapMm : Infinity, feetQ: N.feet.q, feetD: N.feet.d, f, ph };
      if (r.pitch < best.pitch) best = r;
      if (r.blade < bestBlade.blade) bestBlade = r;
      if (r.feetQ < bestFeet.feetQ) bestFeet = r;
    }
    console.log(`  n ${String(n).padStart(2)}  amount 0: pitch 1.000, blade ${fmt(base.blade)} mm, feet ${fmt(base.feetQ)} (${fmt(base.feetD, 2)} mm)`);
    console.log(`        at 0.9: tightest pitch ${fmt(best.pitch, 4)} (${fmt(best.tightDeg, 2)}°) at f ${best.f} phase ${best.ph}; nearest feet ${fmt(bestFeet.feetQ)} foot widths (${fmt(bestFeet.feetD, 2)} mm) at f ${bestFeet.f} phase ${bestFeet.ph}; drawn blade ${fmt(bestBlade.blade)} mm at f ${bestBlade.f} phase ${bestBlade.ph}`);
  }
}
async function sectionC() {
  console.log('§C THE FOUR PAIR HAZARDS — ON HOLD pending the SLS print; magnitudes reported, nothing else. Each pair\'s worst cell over its declared grid through the combination gate\'s own measure (EXPORT), field off against field on:');
  const CG = await import('./bloom-combination-gate.mjs');
  const ids = ['curl-x-twist', 'cup-x-roll', 'cup-x-tipshape', 'leafangle-x-stem'];
  const fields = [['off', {}], ['0.9 f 1 phase 0', { varianceSpacing: 0.9, varianceFrequency: 1, variancePhase: 0 }], ['0.9 f 1 phase 90', { varianceSpacing: 0.9, varianceFrequency: 1, variancePhase: 90 }], ['0.9 f 5 phase 0', { varianceSpacing: 0.9, varianceFrequency: 5, variancePhase: 0 }], ['0.9 f 5 phase 90', { varianceSpacing: 0.9, varianceFrequency: 5, variancePhase: 90 }]];
  for (const id of ids) {
    const p0 = CG.PAIRS.find((p) => p.id === id);
    const parts = [];
    for (const [label, set] of fields) {
      const pair = { ...p0, base: { ...(p0.base || {}), ...set } };
      const res = await CG.run({ pairs: [pair], triples: [] });
      let worst = Infinity, where = null;
      for (const row of res.rows[0].grid) for (const c of row) if (c.mm < worst) { worst = c.mm; where = c.key.split(' @ ')[1]; }
      parts.push(`${label}: ${fmt(worst)} mm (${where})`);
    }
    console.log(`  ${id} [${p0.measure || 'self'}]  ${parts.join(' | ')}`);
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const quick = argv.includes('--quick');
  const sec = (argv.find((a) => a.startsWith('--section=')) || '').split('=')[1];
  const want = new Set(sec ? sec.split(',') : ['A', 'B', 'C']);
  const t0 = Date.now();
  if (want.has('A')) await sectionA(quick);
  if (want.has('B')) await sectionB(quick);
  if (want.has('C')) await sectionC();
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
