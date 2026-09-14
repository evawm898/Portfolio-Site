/* ===================================================================
   ST9 HAS A WITNESS NOW — THE CLAUSE THAT READS THE EXPORTED FILE.

     node tools/verify-bloom-stem-channel.mjs [--control]

   WHY IT IS OWED. `tools/verify-bloom-apex-mutants.mjs` calls
   `stemAssertions` and never `stemChannelAssertions`, which takes the EXPORTED
   STL — so ST9 cannot fire there at all, and the two mutants that named it
   reported MISSED, which is indistinguishable from a clause that is genuinely
   blind (`/plot`'s own lesson). Those claims came off that table with the
   reason written down, and this is the thing they were traded for: ST9's
   entanglement was found by RE-READING the clause, and a fix that rests on a
   re-reading rests on nothing that can fail.

   HOW IT RUNS ST9 WITHOUT A BROWSER. ST9 is a PURE function of
   (positions, row, m, ui) — `row` is unread, `m` only for `sphereMode`. So the
   artefact is built in Node on a MUTATED geometry module and the clause is
   imported from the UNMUTATED harness: the bar (`MIN_FEATURE_MM`) and the
   geometry then have DIFFERENT OWNERS, which is the whole point of the fix
   under test (`the-channel-clearance-is-typed` shrank ST9's own bar along with
   the geometry's, and ST9 stayed silent).

   THE POSITIONS ARE ROUNDED TO float32, because that is what the file stores
   and what `stlPositions` hands the shipped clause. Running the builder's own
   doubles would measure a different object from the one the gate measures.

   ONE OWNER OF THE MUTATION TEXT. The `find`/`into` pair for each mutant is
   PARSED OUT OF the apex table's source by id rather than restated here, and
   the run REFUSES if the id is missing, if the pair is not a single-line
   literal, or if the anchor does not match `bloom-geometry.js` exactly once —
   the apex table's own anchor pre-check, applied to the rows this tool borrows.

   THE PROBE STATE IS PART OF THE CLAIM, and getting it wrong is how this tool
   first reported a false negative. `the-channel-clearance-is-typed` replaces
   the 1.00 mm bar with 0.05, so it moves NO GEOMETRY unless some petal stands
   BETWEEN the two: at 8 petals the omitted petals INTERSECT the stem (0.00 mm)
   and the nearest kept stands 6.14 mm off, so the mutation is inert there and
   ST9's silence says nothing about ST9. A sweep over 160 reachable states
   found 34 that separate the bars; the three widest are the SEPARATING rows
   below, and the 8-petal state is kept as a declared INERT row where ST9 must
   be SILENT even under the mutation. `bore-is-not-evas-rule`, one family later.

   RUN: with --control, `the-channel-clearance-is-typed`'s replacement is
   swapped for its own find-string — an edit that applies and changes nothing —
   and the run must FAIL, because a tool that cannot tell a live mutation from
   a dead one is measuring its own plumbing.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stemChannelAssertions } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
/* `--table <path>` exists so the PARSE GUARD below has a must-fail: a check
   nobody has seen fail is a hope. Point it at a copy with an id renamed or a
   find-string moved and the run must refuse rather than quietly test nothing.
   It defaults to the real table and no gate ever passes it. */
const TABLE_AT = (process.argv.includes('--table') ? process.argv[process.argv.indexOf('--table') + 1] : null)
  || path.join(ROOT, 'tools/verify-bloom-apex-mutants.mjs');
const TABLE = fs.readFileSync(TABLE_AT, 'utf8');
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const CONTROL = process.argv.includes('--control');
const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-st9-'));
const bad = [];

/* ---- the mutation text, from the apex table and nowhere else ---------- */
function mutationFor(id) {
  const at = TABLE.indexOf(`id: '${id}'`);
  if (at < 0) return { err: `no mutant with id '${id}' in tools/verify-bloom-apex-mutants.mjs` };
  const block = TABLE.slice(at, TABLE.indexOf('\n\n  {', at) + 1 || undefined);
  const one = (key) => {
    const m = block.match(new RegExp(`\\n\\s*${key}:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")\\s*,`));
    if (!m) return null;
    try { return JSON.parse(m[1][0] === "'" ? `"${m[1].slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"` : m[1]); }
    catch { return null; }
  };
  const find = one('find'), into = one('into');
  if (find === null || into === null) return { err: `'${id}' does not carry find/into as single-line literals — this tool parses them and must not guess` };
  const n = SRC.split(find).length - 1;
  if (n !== 1) return { err: `'${id}' anchor matches bloom-geometry.js ${n} times, not once — the mutant is DISARMED` };
  return { find, into };
}

/* ---- the rows, each declaring what it is for ------------------------- */
const SEPARATING = [
  ['40 petals x 1 turn, stem 60 x 6 mm', { petalCount: 40, stemDiameter: 6 }, 0.932],
  ['20 petals x 2 turns, stem 60 x 7 mm', { petalCount: 20, layerCount: 2, stemDiameter: 7 }, 0.868],
  ['5 petals x 1 turn, stem 60 x 10 mm', { petalCount: 5, stemDiameter: 10 }, 0.755],
];
const INERT = ['8 petals x 1 turn, stem 60 x 6 mm', { petalCount: 8, stemDiameter: 6 }];
const stateOf = (set) => ({ ...DEFAULTS, placement: 'CONTINUOUS', hubShape: 'SPHERE', stemLength: 60, ...set });

async function moduleOf(tag, src) {
  const d = path.join(WDIR, tag); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), src);
  return import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
}
function runST9(G, ui) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, ui);
  const p = new Float64Array(acc.positions.length);
  for (let i = 0; i < p.length; i++) p[i] = Math.fround(acc.positions[i]);
  return { fired: stemChannelAssertions(p, null, { sphereMode: true }, ui),
           built: b.stemOmission ? b.stemOmission.built : b.petalsBuilt };
}

/* ---- 1. the clean tree: ST9 must be SILENT on every row -------------- */
const CLEAN = await moduleOf('__clean', SRC);
console.log('CLEAN TREE — ST9 must be silent on every row');
for (const [name, set] of [...SEPARATING.map(([n, s]) => [n, s]), INERT]) {
  const r = runST9(CLEAN, stateOf(set));
  console.log(`  ${name.padEnd(38)} built=${String(r.built).padStart(3)}  ST9 ${r.fired.length ? 'FIRED' : 'silent'}`);
  if (r.fired.length) bad.push(`ST9 fired on the CLEAN tree at ${name}: ${r.fired[0]}`);
}

/* ---- 2. the two mutations ------------------------------------------- */
const MUTS = [
  { id: 'the-stem-channel-never-fires',
    what: 'the channel is computed and thrown away, so every petal is built and the stem passes straight through the pole-most ones',
    inertSilent: false },     // every row separates: the omitted petals INTERSECT the stem
  { id: 'the-channel-clearance-is-typed',
    what: 'the printable gap the channel clears is replaced by a twentieth of a millimetre',
    inertSilent: true },      // the 8-petal row's bars AGREE, so the mutation moves nothing there
];
for (const mu of MUTS) {
  const m = mutationFor(mu.id);
  if (m.err) { bad.push(m.err); console.log(`\n${mu.id}: ${m.err}`); continue; }
  let into = m.into;
  if (CONTROL && mu.id === 'the-channel-clearance-is-typed') into = m.find;   // applies, changes nothing
  const G = await moduleOf(mu.id.replace(/[^a-z0-9-]/gi, '_') + (CONTROL ? '_ctl' : ''), SRC.replace(m.find, into));
  console.log(`\n${mu.id}${CONTROL && into === m.find ? '  [CONTROL: the replacement IS the find-string]' : ''}\n  ${mu.what}`);
  for (const [name, set, near] of SEPARATING) {
    const r = runST9(G, stateOf(set));
    const got = r.fired.length ? r.fired[0].match(/nearest ([\d.]+) mm/) : null;
    console.log(`  ${name.padEnd(38)} built=${String(r.built).padStart(3)}  ST9 ${r.fired.length ? `FIRED (nearest ${got ? got[1] : '?'} mm, declared ~${near})` : 'SILENT'}`);
    if (!r.fired.length) bad.push(`${mu.id}: ST9 stayed SILENT at ${name}, a row declared to separate the two bars — the clause cannot see the defect it exists for`);
  }
  const r = runST9(G, stateOf(INERT[1]));
  const wantSilent = mu.inertSilent;
  console.log(`  ${(INERT[0] + '  [declared ' + (wantSilent ? 'INERT' : 'live') + ']').padEnd(38)} built=${String(r.built).padStart(3)}  ST9 ${r.fired.length ? 'FIRED' : 'silent'}`);
  if (wantSilent && r.fired.length) bad.push(`${mu.id}: ST9 fired at ${INERT[0]}, which is declared INERT for this mutation — either the declaration is wrong or the clause is reading something else`);
  if (!wantSilent && !r.fired.length) bad.push(`${mu.id}: ST9 stayed silent at ${INERT[0]}, where the mutation is live`);
}

/* ---- 3. the verdict, on stdout on BOTH branches (#220) --------------- */
console.log('');
if (CONTROL) {
  if (bad.length) { console.log(`CONTROL OK — the neutered mutation was caught (${bad.length} finding(s)):`); for (const b of bad) console.log(`  - ${b}`); process.exit(0); }
  console.log('CONTROL FAILED — an edit that applies and changes nothing was not caught. This tool is measuring its own plumbing.');
  process.exit(1);
}
if (bad.length) { console.log(`ST9 WITNESS: FAILED — ${bad.length} finding(s)`); for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
console.log('ST9 WITNESS: ST9 is silent on the clean tree and FIRES on both mutations at every row declared to separate the bars, and stays silent where a mutation is declared inert.');
process.exit(0);
