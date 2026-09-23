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
   The typed mutation's own BAR is parsed out of its replacement text for the
   same reason, so the number 0.05 is written down in exactly one place.

   THE PROBE STATE IS PART OF THE CLAIM, and getting it wrong is how this tool
   first reported a false negative. `the-channel-clearance-is-typed` replaces
   the shipped printable gap with a twentieth of a millimetre, so it moves NO
   GEOMETRY unless some petal stands BETWEEN the two bars: at 8 petals the two
   omitted petals INTERSECT the stem (0.0000 mm, so 0.0500 mm clear of the
   mutant's bar) and the nearest kept stands 4.6410 mm off (3.6410 mm clear of
   the shipped one), so the mutation is inert there and ST9's silence says
   nothing about ST9. That TWO-SIDED margin is what makes it a good inert row
   rather than a lucky one, and it holds unchanged on `main` (4.6451 mm).
   `bore-is-not-evas-rule`, one family later.

   AND THAT IS NOT A CAVEAT ANY MORE, IT IS AN ASSERTION — the thing this tool
   could not say, and had to be diagnosed by hand when the beaded rim landed.
   Every row now measures whether the mutation is LIVE on it, from the two
   builds' OWN TALLIES and with no bar restated anywhere: a separating row must
   build MORE petals under the typed bar than the shipped tree does, and the
   inert row must build EXACTLY AS MANY. So a probe state that drifts out of
   the band fails as `the mutation is inert at this row — the probe state has
   drifted, re-pick it from the sweep` rather than as `the clause cannot see
   the defect it exists for`, which is a sentence about ST9 and was not true.
   The two together are unambiguous: liveness green and ST9 silent means the
   kept petal has risen past ST9's bar; liveness red means the row stopped
   separating at all.

   WHY THESE ROWS, AND WHY THEY ARE NOT THE THREE THAT SHIPPED. Swept over 280
   reachable states — 14 petal counts x {1, 2} turns x 10 stem diameters, every
   state a sphere with a 60 mm stem — 46 separate the two bars on this tree.
   The rows that shipped here were the three whose intruder stood NEAREST the
   shipped bar: 0.9327 / 0.8686 / 0.7546 mm on `main`, which is 0.0673 mm of
   headroom on the best of them. The beaded rim carried the first two OUT
   THROUGH that bar — 0.9327 -> 1.1470 and 0.8686 -> 1.0747, +0.2143 and
   +0.2061 mm — so nothing stood in the band, the typed mutation built the same
   34 petals the shipped tree does, and ST9 had nothing to see; the third moved
   0.7546 -> 0.7495 and is the only reason one row of three still fired.
   SO THESE ARE CHOSEN FOR MARGIN, NOT FOR MAGNITUDE. A row is worth the
   distance from its intruder to the NEARER bar, and these sit near the band's
   middle: 0.4276 mm at the worst, against the 0.21 mm of drift that one change
   produced. They also separate on `main` — 0.3896 / 0.2825 / 0.3453 mm,
   confirmed by running ST9 there rather than only predicted — so they are rows
   about the criterion rather than about one tree's tessellation.

   THE DECLARED FIGURE IS ENFORCED, AND ITS BAND IS THE ROW'S OWN MARGIN. A
   record nobody checks is folklore within two sessions; a record pinned to a
   tolerance reddens this gate for any tessellation change and says nothing.
   So the bar is derived from the declaration itself — the measurement may
   drift by less than the distance from the declared figure to the nearer bar,
   which is exactly the drift that would put the row at risk. Measured against
   the rows it replaces, this fires on the OLD declarations one change before
   they went silent: 0.9327 has 0.0673 mm of margin and drifted 0.2135.

   AND THE MAGNITUDE IS CORROBORATED ACROSS TWO OWNERS. ST9's reported nearest
   is compared against the CLEAN tree's own `stemOmission.approach` record for
   the slots the mutation newly builds — the criterion's own double-precision
   measurement through `freeStemDistanceMm` and the builder's `plan`, against
   ST9's reading of the float32 stream with the cylinder reconstructed from the
   FILE's own three stem rings. Two routes, no shared code. The bound is
   DERIVED and not fitted: ST9 locates those rings with
   `Math.round(z * 1e4) / 1e4`, so its tip and root each carry up to 5e-5 mm of
   quantisation, and float32 on a 40 mm coordinate is about 4e-6 mm — 1e-4 mm
   in total, of which the worst of eight measured states used 46%. It can fail
   in the direction that matters: a nearest vertex ST9 excluded as the hub's
   own, or a region that is not the criterion's, both read as a disagreement
   rather than as a pass.

   WHAT THIS DOES NOT SAY. A gate that names its blindness is the only kind
   whose silence means anything.
     * It does not say the magnitude is RIGHT, only that two routes agree on it
       and that it has not drifted past the row's own margin. A change that
       moved every petal's approach by 0.3 mm passes here — reported as drift,
       and bounded by the margin, which is what the band is buying.
     * The two routes restate ONE FORMULA rather than deriving the distance
       twice. `freeStemDistanceMm` and ST9's inline
       `hypot(max(0, r - outerR), max(0, tipZ - z, z - rootZ))` are the same
       expression written out in two places, over different INPUTS (the
       builder's `plan` against the FILE's own three rings) and different
       SAMPLINGS (doubles against float32). So the corroboration catches a
       wrong reading and a wrong region; a wrong definition of the distance
       would move both sides and it cannot catch that.
     * It measures FOUR states. `46 of 280` is a measurement recorded in this
       comment, not a gated one — the sweep is a scratch instrument. If the
       band emptied everywhere except these rows, nothing here would say so.
     * The liveness clause reads the two builds' TALLIES, not which slots they
       built. The typed bar is strictly looser than the shipped one, so the
       kept set can only grow and a count change IS a set change here — but a
       mutation that swapped one kept petal for another would read as inert.
     * ST9's own declared blindnesses are inherited unchanged and are stated in
       its own header: a triangle that dips nearer between two cleared
       vertices, the root band inside the hub, and a petal within one petiole
       radius of a leaf's rod. No row here carries a leaf, so the petiole
       exemption is exercised by nothing in this file — `runST9`'s note says
       why it is nonetheless built the way the gates build it.

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
import { MIN_FEATURE_MM } from '../bloom-geometry.js';

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

/* The two routes agree to this, and the number is ST9's own z grid rather than
   a tolerance chosen to pass the data in hand — see the header. */
const AGREE_MM = 1e-4;

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
/* [label, control set, the declared nearest intruder in mm — the EXPORT-mode
   approach of the petal the typed bar newly builds, measured on this tree] */
const SEPARATING = [
  ['6 petals x 2 turns, stem 60 x 6 mm', { petalCount: 6, layerCount: 2, stemDiameter: 6 }, 0.5427],
  ['24 petals x 1 turn, stem 60 x 7 mm', { petalCount: 24, stemDiameter: 7 }, 0.4776],
  ['14 petals x 2 turns, stem 60 x 12 mm', { petalCount: 14, layerCount: 2, stemDiameter: 12 }, 0.5112],
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
  /* THE `m` THIS HANDS ST9 IS THE SHAPE THE GATES HAND IT, and the leaf record
     is in it for a reason that is about the future rather than about today:
     ST9 excuses the PETIOLES (a leaf is rooted through the stem's wall, so it
     stands inside the free stem's own cylinder by design), and it reads that
     exemption off `m.leaf.petioleAxes`. None of the rows below carries a leaf,
     so `leaf` is null on every one of them and this is measured inert — but a
     witness that fed ST9 a DIFFERENT input from the gates would stop being a
     witness for the clause that ships the first time somebody wrote a leafy
     probe row, and it would fail in the confusing direction: ST9 firing here
     while the gates stay green. Built from the BUILDER's own per-leaf records,
     exactly as bloom.js's metrics hook builds it. */
  const m = { sphereMode: true,
              leaf: b.leaf && b.leaf.present ? { petioleAxes: (b.leavesBuilt || []).map((r) => r.petioleAxis) } : null };
  return { fired: stemChannelAssertions(p, null, m, ui),
           om: b.stemOmission,
           built: b.stemOmission ? b.stemOmission.built : b.petalsBuilt };
}
const nearestOf = (fired) => {
  const m = fired.length ? fired[0].match(/nearest ([\d.]+) mm/) : null;
  return m ? Number(m[1]) : null;
};

/* ---- 1. the clean tree: ST9 must be SILENT on every row -------------- */
/* The clean build is kept per row, because it is the reference the mutated
   runs are read against: its TALLY says whether a mutation moved anything,
   and its `approach` record is the criterion's own measurement of the very
   distance ST9 will report. Both have owners the mutation does not touch. */
const CLEAN = await moduleOf('__clean', SRC);
const ROWS = [...SEPARATING.map(([n, s, near]) => ({ n, s, near, sep: true })), { n: INERT[0], s: INERT[1], near: null, sep: false }];
console.log('CLEAN TREE — ST9 must be silent on every row');
for (const row of ROWS) {
  row.clean = runST9(CLEAN, stateOf(row.s));
  console.log(`  ${row.n.padEnd(38)} built=${String(row.clean.built).padStart(3)}/${String(row.clean.om ? row.clean.om.asked : '?').padEnd(3)} ST9 ${row.clean.fired.length ? 'FIRED' : 'silent'}`);
  if (row.clean.fired.length) bad.push(`ST9 fired on the CLEAN tree at ${row.n}: ${row.clean.fired[0]}`);
  if (!row.clean.om) bad.push(`the clean build at ${row.n} carries no stem-channel record, so this row's probe state cannot be measured and nothing it reports is trustworthy`);
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
  const typed = mu.id === 'the-channel-clearance-is-typed';
  /* THE MUTANT'S OWN BAR, parsed out of its replacement text — the header's
     one-owner rule applied to the number as well as to the edit. It is only
     used to say where a DECLARED figure sits between the two bars; no
     measurement below is compared against it. */
  let typedBar = null;
  if (typed) {
    const g = m.into.match(/=\s*([0-9.]+)\s*;/);
    if (!g) { bad.push(`'${mu.id}' replacement text carries no numeric bar this tool can read, so the declared rows cannot be checked against it`); }
    else typedBar = Number(g[1]);
  }
  let into = m.into;
  if (CONTROL && typed) into = m.find;   // applies, changes nothing
  const G = await moduleOf(mu.id.replace(/[^a-z0-9-]/gi, '_') + (CONTROL ? '_ctl' : ''), SRC.replace(m.find, into));
  console.log(`\n${mu.id}${CONTROL && into === m.find ? '  [CONTROL: the replacement IS the find-string]' : ''}\n  ${mu.what}`);
  for (const row of ROWS) {
    const want = row.sep ? true : !mu.inertSilent;     // must ST9 fire on this row under this mutation?
    const r = runST9(G, stateOf(row.s));
    const got = nearestOf(r.fired);
    const asked = row.clean.om ? row.clean.om.asked : null;
    const tag = row.sep ? '' : `  [declared ${mu.inertSilent ? 'INERT' : 'live'}]`;
    console.log(`  ${(row.n + tag).padEnd(38)} built=${String(r.built).padStart(3)}  ST9 ${r.fired.length ? `FIRED (nearest ${got === null ? '?' : got.toFixed(4)} mm)` : 'SILENT'}`);

    /* (a) IS THE MUTATION LIVE ON THIS ROW? Read off the two builds' own
       tallies, so the answer needs no bar and cannot be read out of the
       record the mutation damages. */
    if (typed) {
      if (row.sep && !(r.built > row.clean.built)) {
        bad.push(`${mu.id}: the mutation is INERT at ${row.n} — it builds ${r.built} petal(s) against the shipped tree's ${row.clean.built}, so no petal stands between the two bars and ST9 has nothing to see. The probe state has drifted; re-pick this row from the sweep in this file's header.`);
      }
      if (!row.sep && r.built !== row.clean.built) {
        bad.push(`${mu.id}: the mutation is LIVE at ${row.n}, which is declared INERT — it builds ${r.built} petal(s) against the shipped tree's ${row.clean.built}, so this row's silence is no longer the claim it was declared to make.`);
      }
    } else if (asked !== null && r.built !== asked) {
      /* the channel thrown away means EVERY slot is built — the mutation's own
         effect, measured on the mutated module rather than assumed from the
         edit applying. */
      bad.push(`${mu.id}: at ${row.n} the mutated build kept ${r.built} of ${asked} slot(s); with the channel thrown away every slot must be built, so the mutation did not do what this row is reading it for.`);
    }

    /* (b) DID ST9 SEE IT? unchanged — this is the clause under test. */
    if (want && !r.fired.length) {
      bad.push(row.sep
        ? `${mu.id}: ST9 stayed SILENT at ${row.n}, a row declared to separate the two bars — the clause cannot see the defect it exists for`
        : `${mu.id}: ST9 stayed silent at ${INERT[0]}, where the mutation is live`);
    }
    if (!want && r.fired.length) {
      bad.push(`${mu.id}: ST9 fired at ${row.n}, which is declared INERT for this mutation — either the declaration is wrong or the clause is reading something else`);
    }

    /* (c) DOES ITS MAGNITUDE AGREE WITH THE CRITERION'S OWN? Only the typed
       mutation has a criterion-side prediction to compare against: the slots
       it newly builds are exactly the clean tree's omitted set less its own,
       and their EXPORT approach is what ST9 must report. */
    if (typed && row.sep && got !== null && row.clean.om && r.om) {
      const flipped = row.clean.om.omitted.filter((i) => !r.om.omittedSet.has(i));
      const pred = flipped.length ? Math.min(...flipped.map((i) => row.clean.om.approach.export[i])) : null;
      if (pred === null) {
        bad.push(`${mu.id}: ST9 fired at ${row.n} but the shipped tree omits no slot the mutation keeps, so the criterion offers no prediction to corroborate the reading against`);
      } else if (!(Math.abs(pred - got) <= AGREE_MM)) {
        bad.push(`${mu.id}: at ${row.n} ST9 reports ${got.toFixed(6)} mm and the criterion's own record predicts ${pred.toFixed(6)} mm for the slot(s) it newly builds — ${Math.abs(pred - got).toExponential(2)} mm apart against ${AGREE_MM.toExponential(0)} mm of quantisation. The two are not measuring the same distance.`);
      } else {
        /* (d) AND THE DECLARED RECORD, against its own margin — see header. */
        const margin = typedBar === null ? null : Math.min(row.near - typedBar, MIN_FEATURE_MM - row.near);
        if (margin !== null && !(margin > 0)) {
          bad.push(`${mu.id}: ${row.n} declares ${row.near} mm, which is not strictly between the mutant's ${typedBar} mm bar and the shipped ${MIN_FEATURE_MM} mm gap — a row declared outside the band cannot separate it`);
        } else if (margin !== null && !(Math.abs(got - row.near) < margin)) {
          bad.push(`${mu.id}: ${row.n} measures ${got.toFixed(4)} mm against its declared ${row.near} mm — ${Math.abs(got - row.near).toFixed(4)} mm of drift against the ${margin.toFixed(4)} mm this row has to the nearer bar. Re-record it, and re-pick it if it is no longer near the band's middle.`);
        }
        console.log(`    corroborated: criterion ${pred.toFixed(4)} mm, ST9 ${got.toFixed(4)} mm (${Math.abs(pred - got).toExponential(2)} mm apart)`
          + `, declared ${row.near} mm, drift ${Math.abs(got - row.near).toFixed(4)} mm`
          + (typedBar === null ? '' : `, margin to the nearer bar ${Math.min(row.near - typedBar, MIN_FEATURE_MM - row.near).toFixed(4)} mm`));
      }
    }
  }
}

/* ---- 3. the verdict, on stdout on BOTH branches (#220) --------------- */
console.log('');
if (CONTROL) {
  if (bad.length) { console.log(`CONTROL OK — the neutered mutation was caught (${bad.length} finding(s)):`); for (const b of bad) console.log(`  - ${b}`); process.exit(0); }
  console.log('CONTROL FAILED — an edit that applies and changes nothing was not caught. This tool is measuring its own plumbing.');
  process.exit(1);
}
if (bad.length) { console.log(`ST9 WITNESS: FAILED — ${bad.length} finding(s)`); for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
console.log('ST9 WITNESS: ST9 is silent on the clean tree and FIRES on both mutations at every row declared to separate the bars, and stays silent where a mutation is declared inert. Every separating row is measured LIVE under the typed bar from the two builds\' own tallies, and ST9\'s magnitude is corroborated against the criterion\'s own record.');
process.exit(0);
