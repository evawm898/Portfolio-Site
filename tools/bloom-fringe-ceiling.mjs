/* ===================================================================
   bloom-fringe-ceiling.mjs — THE COUNT CEILING ACROSS THE PETAL-SIZE RANGE.
   Eva's ruling, Sep 13: "re-derive it properly rather than carrying that
   number, report it across the petal-size range". Zero bytes: it reads the
   shipped geometry and emits nothing.

     node tools/bloom-fringe-ceiling.mjs

   IT READS THE SHIPPED PLAN'S OWN `ceiling` and never re-derives it here — a
   tool that restated the law would agree with itself by construction and
   could not catch a geometry that had stopped obeying it. What it adds is the
   SWEEP: the law is one line, and which of the two caps binds where is not.

   MODE: the ceiling is MODE-FREE by construction (the plan computes on
   `max(shapeBaseAt, rootBlend, TIP_HALF_MM)`, never the accumulator's floor,
   because the panel decomposition is TOPOLOGY). Both modes are BUILT and
   compared rather than that being asserted — the run prints the differences
   it found, and "NONE" is a measurement.

   THE petalLength SWEEP IS THE OTHER HALF and is there because the picture
   session's central finding was that LENGTH buys nothing: the ceiling must
   not move with it, and the DEPTH must, being a fraction of it. =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = '/home/user/Portfolio-Site';
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);
const plan = (set, em) => { const st = { ...DEFAULTS, ...set, fringeCount: 10 };
  const acc = new G.MeshBuilder({ exportMode: em }); const { ring, slot } = firstSlot(st, acc, 0);
  return G.petalSurface(st, ring, slot, null, acc).profile.fringe; };
const W = [8, 12, 16, 22, 30], T = [0, 0.15, 0.30, 0.50, 0.70, 0.85, 1.00];
console.log(`Ceiling = floor((W_min / MIN_FEATURE_MM + 1) / 2) at the fringe region's NARROWEST station.`);
console.log(`MIN_FEATURE_MM ${G.MIN_FEATURE_MM}.  "--" = NO ROOM (the end does not clear ${G.TIP_HALF_MM} mm, so no teeth are cut).\n`);
process.stdout.write('petalWidth |');
for (const t of T) process.stdout.write(` t=${t.toFixed(2)}`.padStart(9));
console.log('\n-----------+' + '-'.repeat(9 * T.length));
const modeDiff = [];
for (const w of W) {
  process.stdout.write(`   ${String(w).padStart(2)} mm   |`);
  for (const t of T) {
    const e = plan({ petalWidth: w, petalTipEnd: t }, true), l = plan({ petalWidth: w, petalTipEnd: t }, false);
    const ce = e.noRoom ? null : e.ceiling, cl = l.noRoom ? null : l.ceiling;
    if (ce !== cl) modeDiff.push(`${w}mm t=${t}: export ${ce} live ${cl}`);
    process.stdout.write(String(ce === null ? '--' : ce).padStart(9));
  }
  console.log('');
}
console.log(`\nMODE DIFFERENCES: ${modeDiff.length ? modeDiff.join('; ') : 'NONE — the ceiling is identical in live and export on every cell, which is what "the panel decomposition is topology" means'}`);
/* AND WHAT petalLength DOES: nothing, and it is measured rather than argued. */
console.log('\npetalLength sweep at petalWidth 16, t = 1.00 (the ceiling should not move — length is not width):');
for (const L of [20, 35, 45, 60]) {
  const f = plan({ petalLength: L, petalTipEnd: 1 }, true);
  console.log(`   ${String(L).padStart(2)} mm long: end ${(2 * f.wMinMm / 2).toFixed(3)} mm, ceiling ${f.ceiling}, depth ${f.depthMm.toFixed(2)} mm at the shipped 0.20`);
}
