#!/usr/bin/env node
/* ===================================================================
   verify-bloom-spacing.mjs — THE MUST-FAIL FOR THE SPACING FAMILY (SV0-SV4),
   one planted defect per clause (organic variance, build 3 —
   docs/bloom-organic-variance-spacing-outcome.md).

     node tools/verify-bloom-spacing.mjs

   WHY IT EXISTS BESIDE THE MUTANT TABLE. `tools/verify-bloom-apex-mutants.mjs`
   carries the two STANDING geometry mutants Eva asked for
   (`spacing-amount-0-is-not-the-identity`, `spacing-is-a-direct-azimuth-
   offset`). A geometry mutation reaches a clause through the whole page, so it
   can redden its neighbours; this tool proves each clause can fire ALONE: it
   builds real records in Node with the SHIPPED geometry, assembles the metrics
   the page hands the gates (the same fields `bloom.js` publishes), plants ONE
   defect into a COPY, and runs the SHIPPED `spacingVarianceAssertions` — the
   function both STL gates call. Each plant must fire EXACTLY the clause it
   names and no other SV clause, the clean record must fire nothing (so no plant
   is vacuous), and every red is printed as the gate itself would print it.

   THE PLANTS (each on the state where its clause, and only it, can see it):
     SV0  the geometry's guard answer flipped on a live field — the two
          statements disagree; the record, the azimuths and the law untouched.
     SV1  at amount 0, ONE emitted azimuth moved by a single ulp — the guard is
          not the identity (the standing mutant's defect, in a record).
     SV2  at 0.9 / 1 cycle, ONE emitted azimuth moved by 1e-6 rad — inside its
          neighbours and far above the floor, so only the law can see it.
     SV3  the controls, the record and the azimuths all agree at an amount PAST
          the ruled maximum (1.2, built directly in Node — no control reaches
          it): the law is the law, the record is the law's, and the pitch is
          NEGATIVE, so two petals pass each other. Only the ORDER clause sees it,
          which is what makes it the witness for the ruled maximum's reason.
     SV4  the record's `aliased` flipped at 5 cycles on 8 slots.

   WHAT IT DOES NOT PROVE: that the page publishes these fields — that is the
   STL gates' own run, where SV0-SV4 read `__bloomMetrics()`. It reuses the
   page's field NAMES; a renamed field in bloom.js is caught by the gates
   (SV0/SV1 report a missing key), not here.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { spacingVarianceAssertions } from './bloom-harness.mjs';

function metricsOf(st) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, st);
  const fr = b.foot;
  return {
    slotAzimuths: b.slotAzimuths.map((r) => [...r]), fan: fr.fan ? { ...fr.fan } : null, continuousMode: fr.continuousMode, sequenceLength: fr.sequenceLength,
    slotCount: fr.slotCount, placement: st.placement, spacingVariance: b.spacingVariance ? { ...b.spacingVariance } : null,
    variance: b.variance || null, formVariance: b.formVariance || null, varianceSpacingAbsent: G.varianceSpacingIsAbsent(st),
  };
}
const fam = (msgs) => [...new Set(msgs.map((x) => (/^(SV\d):/.exec(x) || [])[1]).filter(Boolean))].sort();
const ON = { ...DEFAULTS, varianceSpacing: 0.9, varianceFrequency: 1, variancePhase: 0 };
const PLANTS = [
  { clause: 'SV0', state: ON, plant: (m) => { m.varianceSpacingAbsent = !m.varianceSpacingAbsent; } },
  { clause: 'SV1', state: { ...DEFAULTS }, plant: (m) => { const a = m.slotAzimuths[0][3]; m.slotAzimuths[0][3] = a + Math.abs(a) * Number.EPSILON; } },
  { clause: 'SV2', state: ON, plant: (m) => { m.slotAzimuths[0][2] += 1e-6; } },
  { clause: 'SV3', state: { ...DEFAULTS, varianceSpacing: 1.2, varianceFrequency: 1, variancePhase: 0 }, plant: () => {} },
  { clause: 'SV4', state: { ...ON, varianceFrequency: 5 }, plant: (m) => { m.spacingVariance.aliased = !m.spacingVariance.aliased; } },
];
let failed = 0;
const clean = new Map();
for (const p of PLANTS) {
  const key = JSON.stringify(p.state);
  if (!clean.has(key)) {
    /* THE CLEAN RECORD for each plant's state, except SV3's, whose state is
       unreachable by construction and IS the defect (its control is the
       ruled maximum 0.9, which must be silent). */
    const st = p.clause === 'SV3' ? ON : p.state;
    const msgs = spacingVarianceAssertions(metricsOf(st), st, null);
    clean.set(key, msgs);
    if (msgs.length) { failed++; console.log(`FAIL  clean record at ${p.clause}'s state fires ${fam(msgs).join(',')} — the plant would be vacuous:\n      ${msgs.join('\n      ')}`); }
  }
  const m = metricsOf(p.state);
  p.plant(m);
  const msgs = spacingVarianceAssertions(m, p.state, null);
  const got = fam(msgs);
  const ok = got.length === 1 && got[0] === p.clause;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${p.clause} planted — fired ${got.length ? got.join(',') : 'NOTHING'}${ok ? '' : ` (wanted exactly ${p.clause})`}`);
  for (const x of msgs) console.log(`      ${x}`);
}
console.log(failed ? `verify-bloom-spacing: FAILED — ${failed} problem(s)` : `verify-bloom-spacing: PASS — ${PLANTS.length} plants, each firing exactly its own clause; every clean control silent`);
process.exitCode = failed ? 1 : 0;
