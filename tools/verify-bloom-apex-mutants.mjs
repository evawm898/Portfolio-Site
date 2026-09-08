/* ===================================================================
   verify-bloom-apex-mutants.mjs — the POSITIVE CONTROL for the apex family
   A2..A6 (session 32). NOT a matrix gate: it proves the assertions can FIRE.

   WHY IT IS A COMMITTED INSTRUMENT AND NOT A SCRATCH SCRIPT. The smoke gate's
   CLAUSE C checks that every assertion family is CLAIMED by a row's `path`,
   and its own header says what that is worth: "a citation is a claim about the
   PATH a row engages, never evidence the assertion can FIRE there; re-run the
   mutant table when a family is added". This is that table, so the next
   session that adds a clause has something to re-run rather than re-derive.

   WHAT IT ALREADY FOUND, on its first two passes, which is the argument for
   keeping it:
     - A1 was VACUOUS and has been deleted. It read "the cap never widens:
       entry >= terminal" off the descriptor, and no reachable state can make
       that false — the proof is in bloom-harness.mjs where A1 used to be.
       The mutation that removes the very floor it guards fires NOTHING.
     - A5's first scan started at `max(uCap, ROOT_BLEND_END)` and had a blind
       spot: a plateau term added to `terms` only reaches the profile BELOW
       uCap, so its waist sat outside the scanned region. The scan starts at
       the root blend now, which is strictly stronger and measured safe over
       147,744 shipped states.
     - Two of the four original expectations were wrong about which family a
       mutation breaks, not about the gate. They are corrected here rather
       than in the gate, which is the direction that keeps the gate honest.

   A MUTATION THAT FIRES MORE THAN IT NAMES IS FINE AND IS PRINTED; a mutation
   whose named family stays SILENT fails the run, and so does any family
   firing on the clean tree.

   RUN:  node tools/verify-bloom-apex-mutants.mjs
   =================================================================== */
/* POSITIVE CONTROL for the apex family A2-A6. Each mutation is a real edit to
   bloom-geometry.js, served in flight; the run FAILS if the family the mutant
   names stays silent. "A green run does not endorse the assertion" — the
   project's own rule, and hole 5 of the smoke gate says to re-run this table
   whenever a family is added. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, thicknessAssertions } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');

const MUTANTS = [
  { id: 'A2+A5', why: 'the cap INTERPOLATION is inverted — entry and terminal swapped in the emitted rows',
    find: '        return hEntry + (hEnd - hEntry) * g;',
    into: '        return hEnd + (hEntry - hEnd) * g;', names: ['A2', 'A5'] },
  { id: 'A2', why: 'the last emitted row is not the terminus (the cap stops one row short)',
    find: '        const s = (u - uCap) / (1 - uCap);\n        /* THE APEX CURVE.',
    into: '        const s = 0.96 * (u - uCap) / (1 - uCap);\n        /* THE APEX CURVE.', names: ['A2'] },
  { id: 'A3', why: 'the terminal floor is removed — a TRUE APEX, which collapses NV columns onto one edge (the retired centre dome\'s own bug)',
    find: '  const hEnd = Math.max(state.petalTipEnd * halfW, tipFloor);',
    into: '  const hEnd = state.petalTipEnd * halfW;', names: ['A3'] },
  { id: 'A4', why: 'the terminal ignores the control (always the mode floor)',
    find: '  const hEnd = Math.max(state.petalTipEnd * halfW, tipFloor);',
    into: '  const hEnd = Math.max(0 * halfW, tipFloor);', names: ['A4'] },
  { id: 'A5', why: 'the retired TIP_PLATEAU is back — a rising ramp max-ed with the apex, waist and flare',
    find: '        return hEntry + (hEnd - hEntry) * g;',
    into: '        return Math.max(hEntry + (hEnd - hEntry) * g, 0.3 * halfW * clamp((u - uPk) / (1 - uPk), 0, 1));', names: ['A5'] },
  { id: 'A6', why: 'the shape exponent is silently held at 1',
    find: '  const m = state.petalTipShape;',
    into: '  const m = 1;', names: ['A6'] },
];

/* Rows chosen so every mutation has something to bite on. */
const ROWS = [
  { label: 'default', set: [] },
  { label: 'end 0.30 x shape 0.50 (the poppy)', set: [{ id: 'petalTipEnd', value: '0.3' }, { id: 'petalTipShape', value: '0.5' }] },
  { label: 'end 0.60 x shape 3.50', set: [{ id: 'petalTipEnd', value: '0.6' }, { id: 'petalTipShape', value: '3.5' }] },
  { label: 'the parallel-stub corner (width 8, end 0.60, taper 4)', set: [{ id: 'petalWidth', value: '8' }, { id: 'petalTipEnd', value: '0.6' }, { id: 'petalTipTaper', value: '4' }] },
];

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 700, height: 700 } });
let SERVE = SRC;
await page.route('**/bloom-geometry.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: SERVE }));

async function famsOn(rows) {
  const seen = new Set();
  for (const row of rows) {
    await openBloom(page, port);
    await stillFrame(page);
    const bad = await applyConfig(page, row.set);
    if (bad.length) { console.log(`    (row "${row.label}" refused: ${bad[0]})`); continue; }
    await page.waitForTimeout(300);
    for (const msg of await thicknessAssertions(page, row)) {
      const mm = /^(A\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
  }
  return seen;
}

console.log('CONTROL (unmutated tree): the family must be SILENT on every row');
const clean = await famsOn(ROWS);
console.log(`  fired: ${clean.size ? [...clean].sort().join(', ') : '(none)'}\n`);
let fail = clean.size > 0;

for (const mu of MUTANTS) {
  const n = SRC.split(mu.find).length - 1;
  if (n !== 1) { console.log(`  ${mu.id}: MUTATION DID NOT APPLY (matched ${n}x) — ${mu.why}`); fail = true; continue; }
  SERVE = SRC.replace(mu.find, mu.into);
  const got = await famsOn(ROWS);
  const want = mu.names;
  const missed = want.filter((f) => !got.has(f));
  console.log(`  ${mu.id}: ${mu.why}`);
  console.log(`      names ${want.join(', ')} · fired ${got.size ? [...got].sort().join(', ') : '(NOTHING)'}` + (missed.length ? `   *** SILENT: ${missed.join(', ')}` : '   ok'));
  if (missed.length) fail = true;
  SERVE = SRC;
}
await browser.close(); server.close();
console.log(fail ? '\nAPEX MUTANT TABLE: FAILED' : '\nAPEX MUTANT TABLE: every family fires on a mutation that names it, and is silent on the clean tree');
process.exit(fail ? 1 : 0);
