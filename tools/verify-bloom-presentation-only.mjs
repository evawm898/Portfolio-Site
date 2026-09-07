/* ===================================================================
   verify-bloom-presentation-only.mjs — "0 MOVED BY CONSTRUCTION", PROVED.

   WHAT IT IS FOR. Some bloom sessions add no geometry: a panel restructure
   (session 23), a section move (16, 18), a gate audit (25), the nesting lift
   (3a). Each of them owes the same claim — nothing that shipped before this
   moved — and each of them has made it the same way: by saying so in an
   outcome document, with a byte diff as the only alternative. A byte diff
   re-exports 528 rows through a browser to demonstrate that identical inputs
   produce identical outputs, which is an expensive way to learn nothing.

   THE CONSTRUCTION IS STRONGER AND CHEAPER, and it is this project's own
   rule: "if the inputs to a computation are provably byte-identical, its
   outputs cannot differ, and that is a construction rather than a behavioural
   claim." So this tool proves the INPUTS, against a git worktree of the base
   commit:

     1  THE PREDECLARED UNTOUCHED FILES, by sha256. bloom-geometry.js heads
        the list: "no geometry" stops being a claim the only party who could
        have changed it is making about itself.
     2  buildMatrix() — EVERY ROW OF THE FULL MATRIX, deep-equal and in order.
        Not the smoke subset: the row definitions are what every gate, every
        frozen baseline and every byte diff runs, and a presentation-only
        session must not have moved one of the 528.
     3  THE REGISTRY'S DATA EXPORTS — CONTROLS, SECTIONS, DEFAULTS, PREDICATES,
        RETIRED_IDS — deep-equal WITH EVERY FUNCTION SERIALISED TO ITS SOURCE,
        so a changed `fmt` or a changed `labelFrom` is a visible difference
        rather than the invisible one JSON.stringify would give (it drops
        functions silently, which would make the strongest-looking check here
        the emptiest).
     4  WHAT THE PANEL ACTUALLY PRINTS: every control's `fmt` EVALUATED over
        its whole range or every option, and every section's summary through
        sectionLabel(). Source equality is not output equality — a function
        that closes over a moved constant has identical source — so this is
        the clause that can see what (3) cannot.

   WHAT IT DOES NOT PROVE, in its own header:

     - IT IS NOT A BYTE DIFF AND NEVER REPLACES ONE. It is only valid for a
       session that changed NO geometry input. A session that moves bytes on
       purpose (20, 24, 26) owes tools/diff-bloom-bytes.mjs and a predeclared
       partition; this tool will simply fail it at clause 1, which is the
       correct answer and not a substitute for the diff.
     - IT SAYS NOTHING ABOUT THE PANEL'S BEHAVIOUR. Identical descriptors can
       still be rendered by a broken generator; tools/verify-bloom-panel.mjs
       is what drives the real UI.
     - THE UNTOUCHED LIST IS THE COVERAGE. A geometry input that is not in
       DEFAULT_UNTOUCHED and not passed with --also is not compared. The list
       below is the set whose bytes decide an export; add to it, never quietly
       trim it.

   IT DOES NOT RUN IN CI, and that is a property of what it needs rather than
   an oversight: it takes a WORKTREE OF THE BASE COMMIT, which is a decision
   about which commit a session is claiming to have moved nothing since. That
   is the session's to name, not a workflow's. Run it at the close, against
   the commit the branch was cut from, and quote its output.

   USAGE
     git worktree add /tmp/base <base-sha>
     node tools/verify-bloom-presentation-only.mjs --base /tmp/base [--also f,g]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const BASE = arg('--base');
if (!BASE) {
  console.error('usage: node tools/verify-bloom-presentation-only.mjs --base <worktree of the base commit> [--also a.js,b.js]');
  process.exit(2);
}

/* THE FILES WHOSE BYTES DECIDE AN EXPORT, plus the instruments that read them.
   bloom.js and bloom-registry.js are deliberately NOT here: a presentation
   session is usually editing one of them, and what matters about them is
   clauses 3 and 4, which compare the DATA rather than the file. */
const DEFAULT_UNTOUCHED = [
  'bloom-geometry.js', 'bloom.html', 'bloom.css',
  'tools/bloom-harness.mjs', 'tools/verify-bloom-export.mjs', 'tools/verify-bloom-connectedness.mjs',
  'tools/diff-bloom-bytes.mjs', 'tools/bloom-plan-coverage.mjs', 'tools/bloom-solid-angle-coverage.mjs',
  'tools/bloom-crowding.mjs', 'tools/chromium-harness.mjs',
];
const UNTOUCHED = [...DEFAULT_UNTOUCHED, ...(arg('--also') || '').split(',').map((s) => s.trim()).filter(Boolean)];

const bad = [];
const ok = [];
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/* ---- 1. the predeclared untouched files ---- */
for (const f of UNTOUCHED) {
  let a, b;
  try { a = sha(path.join(HEAD, f)); b = sha(path.join(BASE, f)); }
  catch (e) { bad.push(`cannot read "${f}" on one of the two trees: ${e.message} — an unreadable input is never a smaller claim`); continue; }
  if (a !== b) bad.push(`PREDECLARED UNTOUCHED and MOVED: ${f}\n      head ${a}\n      base ${b}`);
}
if (!bad.length) ok.push(`${UNTOUCHED.length} predeclared files byte-identical — bloom-geometry.js among them, so no geometry SOURCE moved`);

const load = async (root) => ({
  h: await import(path.join(root, 'tools/bloom-harness.mjs')),
  r: await import(path.join(root, 'bloom-registry.js')),
});
const A = await load(HEAD);
const B = await load(BASE);

/* Functions rendered as SOURCE — see clause 3 in the header. */
const ser = (x) => JSON.stringify(x, (k, v) => (typeof v === 'function' ? `[fn] ${v.toString()}` : v));

/* ---- 2. the full matrix ---- */
const mA = A.h.buildMatrix(), mB = B.h.buildMatrix();
if (mA.length !== mB.length) bad.push(`buildMatrix(): ${mA.length} rows on head, ${mB.length} on base — a presentation-only session added or removed a row`);
else {
  const moved = [];
  for (let i = 0; i < mA.length; i++) if (ser(mA[i]) !== ser(mB[i])) moved.push(`${i} "${mA[i].label}"`);
  if (moved.length) bad.push(`buildMatrix(): ${moved.length} of ${mA.length} rows differ — ${moved.slice(0, 5).join('; ')}${moved.length > 5 ? ' …' : ''}`);
  else ok.push(`buildMatrix(): all ${mA.length} rows of the FULL matrix deep-equal, in order — every row definition the gates, the frozen baselines and the byte diff run is unchanged`);
}

/* ---- 3. the registry's data ---- */
let dataMoved = 0;
for (const key of ['CONTROLS', 'SECTIONS', 'DEFAULTS', 'PREDICATES', 'RETIRED_IDS']) {
  if (ser(A.r[key]) !== ser(B.r[key])) { dataMoved++; bad.push(`bloom-registry.js: ${key} is NOT deep-equal to the base tree's (functions compared by source)`); }
}
if (!dataMoved) ok.push(`bloom-registry.js: CONTROLS (${A.r.CONTROLS.length}), SECTIONS (${A.r.SECTIONS.length}), DEFAULTS, PREDICATES and RETIRED_IDS all deep-equal, every function compared as its own source`);

/* ---- 4. what the panel prints ---- */
let vals = 0;
const printMoved = [];
for (const c of A.r.CONTROLS) {
  const cb = B.r.CONTROLS.find((x) => x.id === c.id);
  if (!cb || typeof c.fmt !== 'function' || typeof cb.fmt !== 'function') continue;
  const probes = c.kind === 'choice' ? c.options.map((o) => o.value)
    : Array.from({ length: 21 }, (_, i) => c.min + (i * (c.max - c.min)) / 20);
  for (const v of probes) {
    vals++;
    const run = (f, d) => { try { return String(f(v, d)); } catch (e) { return `threw: ${e.message}`; } };
    const x = run(c.fmt, A.r.DEFAULTS), y = run(cb.fmt, B.r.DEFAULTS);
    if (x !== y) printMoved.push(`${c.id} at ${v}: "${x}" against "${y}"`);
  }
}
if (printMoved.length) bad.push(`${printMoved.length} of ${vals} read-out values moved — ${printMoved.slice(0, 5).join('; ')}`);
else if (!vals) bad.push('no control carries an fmt — clause 4 evaluated nothing, so it proved nothing');
else ok.push(`every control's read-out: ${vals} values evaluated across every slider range and every option — identical text on both trees`);

const labMoved = [];
for (const s of A.r.SECTIONS) {
  const sb = B.r.SECTIONS.find((x) => x.id === s.id);
  if (!sb) continue;
  if (A.r.sectionLabel(s, A.r.DEFAULTS) !== B.r.sectionLabel(sb, B.r.DEFAULTS)) labMoved.push(s.id);
}
if (labMoved.length) bad.push(`section summaries moved: ${labMoved.join(', ')}`);
else ok.push(`every section summary, the derived one included, reads the same on both trees at DEFAULTS`);

console.log('bloom: presentation-only — 0 MOVED, BY CONSTRUCTION.\n');
for (const l of ok) console.log(`  ok   ${l}`);
if (bad.length) {
  console.error(`\nFAIL — this is NOT a presentation-only change (${bad.length}):`);
  for (const l of bad) console.error(`  - ${l}`);
  console.error('\nA session that moves bytes on purpose owes tools/diff-bloom-bytes.mjs and a predeclared partition. This tool is not a substitute for one.');
  process.exit(1);
}
console.log('\nPASS — the geometry source, all matrix rows and every registry datum the export path reads are identical to the base tree, so no export can differ. No byte diff is owed; no frozen phase is owed unless a ROW was added, and none was.');
