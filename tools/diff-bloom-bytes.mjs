/* ===================================================================
   diff-bloom-bytes.mjs — did adding a control move any existing export?

   THE CONVENTION IT ENFORCES: a new control defaults to current behaviour,
   verified by byte diff. Anything that cannot be byte-identical gets a schema
   bump, a migration and a per-design change report — never a silent shift.
   For `spread` and `centerStyle` the byte-identity is a property of the code
   (spread multiplies by exactly 1.00, and IEEE-754 makes x * 1.0 === x; NONE
   emits no triangles at all), so this tool CONFIRMS a construction rather
   than establishing an empirical result. A single moved byte would mean the
   construction argument is wrong, which is a stop-and-report, not a migration.

   WHAT IT COMPARES. Either matrix, run against two trees, hashing the exact
   bytes the real Get STL button produced.
     default    `legacyMatrix()` — the 47 rows the scaffold's matrix held at
                37e160d, frozen in bloom-harness.mjs. Like for like: those rows
                set only the four original sliders, which exist in both trees.
                THE 0/47 RESULT IS PINNED TO ONE MOMENT — the commit where
                `spread` and `centerStyle` landed at defaults that reproduced
                the old behaviour. A LATER, DELIBERATE CHANGE TO A DEFAULT MAKES
                THIS COMPARISON SHOW MOVES, CORRECTLY. That is not the earlier
                result being overturned; it is a different question. Do not
                re-run this against 37e160d after a default moves and read the
                moves as a regression.
     --full     the live `buildMatrix()` — for comparing two trees that share a
                matrix, where the question is not "did anything move" but
                "did exactly the right things move".
     --phase3   `phase3Matrix()` — the 86 rows frozen at 6626961, the commit
                before the four form curves. The like-for-like baseline for
                the FORM layer. Run BOTH this and --phase2 for a form
                change: the 76 are then the rows whose bytes are unmoved
                across two consecutive feature layers, which neither matrix
                claims on its own.
     --phase8   `phase8Matrix()` — the 246 rows frozen at 7877bdf, the commit
                that shipped the mirror plane, slot roles and the orchid.
                NOW THE STRONGEST of the eight, on the reasoning that promoted
                each of its predecessors: the only one carrying BOTH
                zygomorphy sessions' corners — the iris, the orchid, the
                parity rows, every clamp corner and the four GATED states —
                which is the region a fourth placement value is most likely to
                disturb, since the role derivation and the area rule's
                grouping are what it touches.
     --phase7   `phase7Matrix()` — the 205 rows frozen at f626828, the commit
                that shipped the override architecture and per-layer roles.
                Carries session A's zygomorphy corners.
     --phase6   `phase6Matrix()` — the 158 rows frozen at c1886d0, the commit
                before the continuous spiral. NOW THE STRONGEST of the frozen
                baselines, on the same reasoning that promoted --phase5 and
                --phase4 before it: it is the only one carrying the LAYER
                corners and the SPIRAL count sweep, which is exactly the
                region a placement change is most likely to disturb. A change
                that moved a layered or spiral export while leaving the older
                baselines clean would be invisible to every matrix below.
     --phase5   `phase5Matrix()` — the 125 rows frozen at deacded, the commit
                before layers and spiral placement. The strongest of the
                frozen baselines until --phase6: it is the only one below that
                carries the THICKNESS layer's own corners (the seven THIN
                rows, the five TIP rows, and the tip cap's held/moved
                partition) as well as everything --phase4 had.
     --phase4   `phase4Matrix()` — the 106 rows frozen at 3c542fb, the commit
                before the thickness layer. The STRONGEST of the frozen
                baselines: it is the only one that carries the seven named
                FORM corners and all four CAPABILITY rows, so a change that
                moved a curled, rolled or clefted petal's bytes at the new
                defaults shows here and in neither of the others.
     --phase2   `phase2Matrix()` — the 76 rows frozen at 21d4602, the commit
                before the petal silhouette model. This is the like-for-like
                baseline for the silhouette engine: `--full` cannot do that
                job (the live matrix sets control ids the old tree has no
                inputs for, so every row fails read-back against it), and the
                47 legacy rows would leave the whole centre rig unmeasured.
                Its whole-state check covers the ids the row PINS, which for
                these rows is the set that existed at 21d4602.

   THE REGION MODE — `--region foot`.

   WHAT IT HASHES: the export triangles ALL THREE of whose vertices satisfy
   |z| <= t/2 + 1e-3, where t is THE EXPORTED SHEET THICKNESS OF THAT ROW —
   recorded per row from the app's own live state, exactly as `tilt` is, and
   floored the way the export floors it. It was a hardcoded 0.6 until the
   thickness layer, correctly, because the sheet was a constant; with
   `sheetThickness` a control that constant would have sliced a 2.40 mm
   design at 0.60 mm, quietly hashing part of the hub and calling it the
   foot. --compare requires the two runs to AGREE on a row's half-slab and
   reports the row rather than mis-slicing it if they do not.

   WHAT THE SLAB ACTUALLY CONTAINS — corrected, because the claim this header
   used to make was not the computation being performed. It said the set is
   "the three FOOT rows plus the hub disc PLUS WHATEVER OF THE CENTRE LIES IN
   THE SLAB" — the centre clause was right and is kept: a seated DOME or DISC
   starts at z = -t/2 - t/8 and its base and lower wall are inside the slab,
   which is why turning a centre on moves this region on every row that does
   it, correctly and by design.

   What was WRONG was the word "exactly", and the reasoning behind it: that
   the first blade row reaches z = 1.07 mm at the default tilt. That is the
   row's TOP surface. Its BOTTOM surface sits at 0.528 - 0.544 = -0.016 mm,
   inside the slab, and so does the second row's at 0.513 mm — so the region
   has always also carried the UNDERSIDE of the first two blade rows at the
   shipping default, and more of them on a thicker sheet, fewer on a thinner
   one.

   That does not invalidate any earlier result and it is worth being precise
   about why: the region is a SUPERSET of foot + hub, so "bit-identical over
   this slab" is a STRONGER statement than "the foot did not move", not a
   weaker one. Every prior 0-moved run stands, and stands for more than it
   claimed. What was wrong was the label, which is this codebase's most
   repeated defect shape and is worse in a tool header than anywhere else.
   The kept-triangle count is printed per moved row so the extent is visible
   rather than inferred.

   WHY: it turns "the silhouette does not touch the foot, so the junction
   argument is unchanged" from a sentence into a per-row measurement. The
   foot rows and the hub are the entire junction argument — flat in the hub
   plane at ring.width/2, landing on ring.radius, overhanging inward by
   ring.overhang, spanned by a disc of exactly ring.radius — and none of
   those four quantities is a function of the silhouette. This mode is what
   says so with a hash instead of a claim.

   WHAT IT DOES NOT COVER, and this is not a detail:
     - petalTilt === 0. With no tilt the blade lies IN the hub plane, so the
       criterion cannot separate foot from blade and those rows are reported
       as OUT OF SCOPE, never as passes and never as failures. In the frozen
       76 that is 5 rows (petalTilt min, ALL MIN, and ALL MIN x each style).
     - Anything below the slab. There is nothing below the bloom today
       (`below: null`); when a stem exists this criterion admits it and the
       region stops meaning "foot + hub". Re-derive the criterion then rather
       than trusting this sentence.
     - **THE BASE TREE MUST BE THE COMMIT THIS CHANGE SITS ON, not the commit
       the MATRIX is named after.** The two are different choices and
       conflating them cost a wrong reading (Aug 31): `--phase2` against
       21d4602 came back 49 of 76 moved, which is not a regression and is not
       this session's change at all — it is #115's deliberate DISC default
       landing, since these rows pin only pre-21d4602 controls and inherit
       every later default. `--partition centerStyle` on that same pair
       returns the two-sided equality exactly (49 inherit and all 49 moved,
       27 pin and all 27 identical), which is what says so. The MATRIX picks
       which rows to measure; the `--root` picks what the change is being
       measured against, and for a byte-identity claim that root is always
       the parent commit.
     - **A FOOT CONTROL MOVES THE FOOT REGION, LEGITIMATELY.** `sheetThickness`
       and `footDelicacy` are the foot's own cross-section, so a row that
       sets either MUST move this region — that is the control working, not
       a leak. This mode's invariant claim is therefore scoped to matrices
       whose rows do not set a foot control, which is every FROZEN matrix by
       construction (they pin only the controls that existed at their
       commit). On `--full` the question stops being "did the foot move" and
       becomes "did exactly the right rows move it", and the instrument for
       that is `--partition`, not `--region`. Do not read a `--full --region
       foot` failure on a thickness row as a defect; read the partition.
     - **A FROZEN MATRIX CANNOT SEE A FORM LEAK, and this cost a wrong
       prediction to find (Aug 31).** The region mode proves whatever the
       MATRIX exercises, and a frozen matrix pins only the controls that
       existed at its commit — so every one of its rows sits at the defaults
       of every LATER control. The form curves default to exactly 0, where
       the guard short-circuits to the flat path, so a deformation leaking
       onto the foot is IDENTICALLY ABSENT from all 86 frozen rows. Measured,
       not reasoned: a mutant that deforms the feet on purpose came back
       `81/81 BIT-IDENTICAL` on `--phase3`, and `21 of 98 in-scope rows
       MOVED` on `--full`, whose 103 rows include 25 that set a curve.
       So the two claims are DIFFERENT and only one of them is this mode's:
         `--phase3 --region foot`  the form layer does not move the foot AT
                                   DEFAULTS. That is the byte-identity
                                   question, and it is what the acceptance
                                   bar needs.
         `--full --region foot`    the foot is invariant UNDER FORM — but
                                   only against a tree that shares the live
                                   matrix.
       Neither replaces `formAssertions()` in the two gates, which asserts
       foot invariance per row in exact arithmetic on every row of the live
       matrix. Do not quote a frozen-matrix foot pass as evidence that a
       deformation stayed off the foot.
     - It is a HASH, not a geometric argument: it proves the bytes in that
       region did not move between two trees. It cannot tell you the region
       was correct in the first place.
   The criterion is stated in ONE place — footRegionHash() below — and both
   the header and the run output quote it from there.

   THE PARTITION MODE is for that second question. Changing a control's DEFAULT
   moves every row that INHERITS it and must leave every row that PINS it
   bit-identical. "Mostly moved, looks right" is not a result; the sharp claim
   is a two-sided set equality — the moved set equals the inheriting set
   exactly, no more and no less. A row that pins the control and moved anyway
   means the change leaked somewhere it had no business being; a row that
   inherits it and did NOT move means the control is not reaching that row's
   geometry. Both are stop-and-report, and only the equality can tell them
   apart from success.

   NEVER MUTATE THE WORKING TREE TO BUILD A BEFORE. `git checkout <sha> -- .`
   stages the revert, so a stray commit pushes the un-fixed code and a
   container restart between mutation and restore leaves the branch reverted.
   This tool takes a --root and the caller points it at a `git worktree`; the
   live tree is never touched and there is no restore step to forget.

   VALIDITY, and its LIMITS — stated because this tool runs against a tree
   whose registry it is not importing:
     - Fresh page per row, and every set value READ BACK through the real
       input. A row whose value did not take fails the RUN.
     - The whole-state comparison is restricted to the four LEGACY ids, since
       the old tree's app has no other controls to report. So this tool does
       NOT prove the new tree's new controls are at their defaults — the two
       gates' fullStateDrift does that, over the full registry, on every row.
     - Bytes only. It says nothing about whether the geometry is right; the
       export and connectedness gates own that.

   RUN:  node tools/diff-bloom-bytes.mjs [--full|--phase2|--phase3|--phase4|--phase5|--phase6] --root <dir> --out <file.json>
         ... twice, then:
         node tools/diff-bloom-bytes.mjs --compare <before.json> <after.json>
         node tools/diff-bloom-bytes.mjs --compare <b.json> <a.json> --partition <controlId>
         node tools/diff-bloom-bytes.mjs --compare <b.json> <a.json> --region foot
   =================================================================== */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchPage, openBloom, applyConfig, exportStl, analyzeStl, legacyMatrix, buildMatrix, phase2Matrix, phase3Matrix, phase4Matrix, phase5Matrix, phase6Matrix, phase7Matrix, phase8Matrix } from './bloom-harness.mjs';

/* THE ONE OWNER of the foot-region criterion. Both the header above and the
   run output quote this string rather than restating the rule — a region
   definition written twice is a region definition that drifts, and the
   tilt-range caveat is the half that would be dropped. */
const FOOT_T_HALF_LEGACY = 0.6;   // the sheet was a constant 1.2 mm before the thickness layer
const FOOT_MIN_FEATURE = 1.0;     // the export floor, so the slab matches the EXPORTED sheet
const FOOT_EPS = 1e-3;
/* The exported half-thickness for a row, from that run's own live state. A
   tree with no `sheetThickness` control (anything at or before 3c542fb)
   reports undefined and falls back to the constant it actually built with —
   which is what makes a frozen-matrix comparison across the two trees
   like-for-like rather than a comparison of two different slabs. */
export const footHalfSlab = (sheetThickness) =>
  (sheetThickness === undefined || sheetThickness === null
    ? FOOT_T_HALF_LEGACY
    : Math.max(Number(sheetThickness), FOOT_MIN_FEATURE) / 2);
export const FOOT_REGION_RULE =
  `all three vertices with |z| <= (exported sheet thickness)/2 + ${FOOT_EPS} mm, per row`
  + ` (a SUPERSET of foot rows + hub disc: it also carries whatever of the CENTRE lies in the slab,`
  + ` and the underside of the first blade rows — two at the shipping default — so bit-identical here is`
  + ` a stronger claim than "the foot did not move", and a row that turns a centre ON moves it by design;`
  + ` UNDEFINED at petalTilt 0, where the blade lies in the same plane)`;

/* Hash of the foot region alone. Triangles are hashed in file order — the
   builders are deterministic, so order is part of "did it move". */
function footRegionHash(buf, tHalf) {
  const n = buf.readUInt32LE(80);
  const h = crypto.createHash('sha256');
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    let inside = true;
    for (let k = 0; k < 3 && inside; k++) if (Math.abs(buf.readFloatLE(o + 12 + k * 12 + 8)) > tHalf + FOOT_EPS) inside = false;
    if (!inside) continue;
    kept++;
    h.update(buf.subarray(o + 12, o + 48));
  }
  return { hash: h.digest('hex'), tris: kept };
}

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

/* ===================================================================
   --verify-frozen — THE CHECK THE HEADERS HAVE BEEN CITING SINCE #114,
   WHICH DID NOT EXIST UNTIL NOW (found Aug 31, this session).

   phase3Matrix()'s header said, in as many words, that transcribing 86 rows
   by hand "is exactly the sort of thing that looks right and is not, so it
   is not trusted either: `--verify-frozen` proves this function deep-equal
   to the base commit's own buildMatrix() output rather than to a reading of
   it." No such flag existed anywhere in tools/. That is a label naming a
   computation nobody performed — this codebase's most repeated defect — in
   the tool built to prevent it, and it had been load-bearing for two frozen
   matrices. This is the computation.

   WHAT IT DOES. Imports the BASE TREE's own bloom-harness.mjs and calls its
   buildMatrix(), then deep-compares against the named frozen matrix in the
   LIVE tree. Row order, labels, the set list (ids AND values, in order) and
   any capability spec must all agree exactly. A frozen matrix that has
   drifted from the commit it claims to snapshot makes every byte report
   built on it a comparison of two things nobody characterised.

   WHAT IT CANNOT CLAIM: that the frozen matrix is a GOOD matrix, or that
   the base commit is the right baseline. It proves one equality — these
   rows are those rows — which is exactly the claim the headers make.

   The base tree needs its dependencies resolvable (the harness imports
   playwright-core at module load); point --base at a `git worktree` with a
   node_modules symlink, never at a mutated working tree.

   RUN: node tools/diff-bloom-bytes.mjs --verify-frozen --phase2 --base <dir>
   =================================================================== */
if (process.argv.includes('--verify-frozen')) {
  const base = arg('--base');
  if (!base) { console.error('--verify-frozen needs --base <dir> (a git worktree of the commit the matrix claims to snapshot)'); process.exit(2); }
  const which = ['phase2', 'phase3', 'phase4', 'phase5', 'phase6', 'phase7', 'phase8'].filter((n) => process.argv.includes('--' + n));
  if (which.length !== 1) { console.error('--verify-frozen needs exactly one of --phase2 --phase3 --phase4 --phase5 --phase6 --phase7 --phase8'); process.exit(2); }
  const name = which[0];
  const frozen = { phase2: phase2Matrix, phase3: phase3Matrix, phase4: phase4Matrix, phase5: phase5Matrix, phase6: phase6Matrix, phase7: phase7Matrix, phase8: phase8Matrix }[name]();
  const baseHarness = await import(pathToFileURL(path.join(path.resolve(base), 'tools', 'bloom-harness.mjs')).href);
  const live = baseHarness.buildMatrix();
  /* Normalised to exactly what a row MEANS to every consumer: its label, the
     ordered (id, value) pairs it sets, and its capability. Values are
     stringified because a row may carry 2 or '2' and applyConfig sets a DOM
     value either way — a difference there is not a matrix difference. */
  const norm = (rows) => rows.map((r) => JSON.stringify({
    label: r.label,
    set: (r.set || []).map((s) => [s.id, String(s.value)]),
    capability: r.capability || null,
  }));
  const A = norm(live), B = norm(frozen);
  const diffs = [];
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (A[i] !== B[i]) diffs.push(`  row ${i}:\n    base   ${A[i] ?? '(missing)'}\n    frozen ${B[i] ?? '(missing)'}`);
  }
  console.log(`--verify-frozen ${name}: base ${base} buildMatrix() = ${A.length} rows; ${name}Matrix() = ${B.length} rows`);
  if (diffs.length) {
    console.error(`\nFAIL — ${diffs.length} row(s) differ. The frozen matrix is NOT the commit it claims to snapshot:`);
    for (const d of diffs.slice(0, 8)) console.error(d);
    if (diffs.length > 8) console.error(`  ... and ${diffs.length - 8} more`);
    process.exit(1);
  }
  console.log(`PASS — ${name}Matrix() is deep-equal to the base commit's own buildMatrix(), row for row.`);
  process.exit(0);
}
const LEGACY_IDS = ['petalCount', 'petalLength', 'petalWidth', 'petalTilt'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

if (process.argv.includes('--compare')) {
  const i = process.argv.indexOf('--compare');
  const before = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const after = JSON.parse(fs.readFileSync(process.argv[i + 2], 'utf8'));
  const labels = before.rows.map((r) => r.label);
  if (labels.join('|') !== after.rows.map((r) => r.label).join('|')) {
    console.error('byte diff: INVALID — the two runs do not cover the same rows.');
    process.exit(1);
  }
  const pi = process.argv.indexOf('--partition');
  const partition = pi > 0 ? process.argv[pi + 1] : null;
  const ri = process.argv.indexOf('--region');
  const region = ri > 0 ? process.argv[ri + 1] : null;
  const movedSet = new Set();
  for (let k = 0; k < labels.length; k++) {
    if (before.rows[k].sha256 !== after.rows[k].sha256) movedSet.add(labels[k]);
  }
  console.log(`byte diff: ${labels.length} configs compared`);
  console.log(`  before: ${before.root} @ ${before.head || 'unrecorded'}`);
  console.log(`  after:  ${after.root} @ ${after.head || 'unrecorded'}\n`);

  if (region) {
    if (region !== 'foot') { console.error(`byte diff: unknown region "${region}" — only "foot" exists.`); process.exit(2); }
    if (before.rows.some((r) => !r.footHash) || after.rows.some((r) => !r.footHash)) {
      console.error('byte diff: INVALID — one of the runs carries no foot-region hash. Re-run both captures with this version of the tool.');
      process.exit(1);
    }
    console.log(`region "foot": ${FOOT_REGION_RULE}\n`);
    const scoped = [], skipped = [], movedFoot = [], mismatched = [];
    for (let k = 0; k < labels.length; k++) {
      const b = before.rows[k], a = after.rows[k];
      /* petalTilt 0 is OUT OF SCOPE, never a pass and never a failure — with
         no tilt the blade lies in the hub plane and the criterion cannot
         separate it from the foot. Read from the row's own recorded tilt, so
         a matrix change cannot silently move a row in or out of scope. */
      if (Number(b.tilt) === 0 || Number(a.tilt) === 0) { skipped.push(labels[k]); continue; }
      /* The two runs must be slicing the SAME slab. A row whose exported
         sheet thickness differs between the trees is not a foot that moved —
         it is two different regions being compared, and hashing them against
         each other would be a number with no meaning. Reported, never folded
         into either the passes or the failures. */
      const bh = b.footHalf ?? 0.6, ah = a.footHalf ?? 0.6;
      if (bh !== ah) { mismatched.push(`${labels[k]}: slab ${bh} mm vs ${ah} mm`); continue; }
      scoped.push(labels[k]);
      if (b.footHash !== a.footHash || b.footTris !== a.footTris) movedFoot.push({ l: labels[k], b, a });
    }
    for (const m of movedFoot) console.log(`  MOVED ${m.l}: ${m.b.footTris} -> ${m.a.footTris} tris, ${m.b.footHash.slice(0, 12)} -> ${m.a.footHash.slice(0, 12)}`);
    console.log(`  ${scoped.length - movedFoot.length}/${scoped.length} in-scope rows have a BIT-IDENTICAL foot region`);
    console.log(`  ${skipped.length} row(s) OUT OF SCOPE (petalTilt 0 — not a pass): ${skipped.join(', ') || 'none'}`);
    if (mismatched.length) console.log(`  ${mismatched.length} row(s) NOT COMPARABLE (the two trees export different sheet thicknesses, so the slab differs — not a pass and not a failure): ${mismatched.join('; ')}`);
    console.log(`  region extent at the default row: ${(before.rows[0] || {}).footTris} of ${(before.rows[0] || {}).tris} export triangles`);
    console.log(`  whole-export moves on the same rows: ${movedSet.size}/${labels.length} (that is the blade changing, which is the point)`);
    if (movedFoot.length) {
      console.error(`\nbyte diff: FAIL — ${movedFoot.length} row(s) moved bytes INSIDE the foot region. The silhouette reached the foot or the hub; the junction argument no longer holds by construction.`);
      process.exit(1);
    }
    console.log('\nbyte diff: PASS — the foot region is bit-identical on every in-scope row.');
    process.exit(0);
  }

  /* MODE DISPATCH ORDER, stated because getting it wrong is silent. Every
     mode below ends in process.exit, so a mode added AFTER the plain-compare
     block never runs — its flag is accepted, the plain compare answers a
     different question, and the run looks like a considered result. That
     happened to --partition-value on its first run, and it is the same shape
     as --phase4 falling through to legacyMatrix(). Order: region, then
     partition-value, then partition, then plain.

     PARTITION BY VALUE: the moved set must EQUAL the set of rows whose
     RESOLVED value of a control equals a given value — asserted both ways.

     Why this is a second mode and not a flag on the first: `--partition <id>`
     splits on whether a row SET the control, which is the right axis for a
     default change (every row that inherits the new default moves). The
     tip-cap ruling changes behaviour for a VALUE — the pointed family, i.e.
     petalTipBreadth === 0 — regardless of whether the row named it. Those two
     splits disagree on real rows here (`petalTipBreadth min (0)` pins and
     moves; `ALL MAX` pins 0.6 and holds), so collapsing them into one flag
     would have produced a confident, wrong report. */
  const vi = process.argv.indexOf('--partition-value');
  if (vi > 0) {
    const id = process.argv[vi + 1], want = process.argv[vi + 2];
    if (before.rows.some((r) => !r.state) || after.rows.some((r) => !r.state)) {
      console.error('byte diff: INVALID — one of the runs carries no per-row state. Re-run both captures with this version of the tool.');
      process.exit(1);
    }
    const valueOf = (r) => String(r.state[id]);
    for (let k = 0; k < labels.length; k++) {
      if (valueOf(before.rows[k]) !== valueOf(after.rows[k])) {
        console.error(`byte diff: INVALID — row "${labels[k]}" resolves ${id} to ${valueOf(before.rows[k])} in one run and ${valueOf(after.rows[k])} in the other.`);
        process.exit(1);
      }
    }
    const inSet = labels.filter((l, k) => valueOf(before.rows[k]) === String(want));
    const outSet = labels.filter((l, k) => valueOf(before.rows[k]) !== String(want));
    const heldButIn = inSet.filter((l) => !movedSet.has(l));
    const movedButOut = outSet.filter((l) => movedSet.has(l));
    console.log(`partition on ${id} === ${want}: ${inSet.length} rows are IN the ruled set, ${outSet.length} are OUT\n`);
    console.log(`  moved   : ${movedSet.size}`);
    console.log(`  expected: ${inSet.length} (exactly the rows in the ruled set)\n`);
    for (const l of outSet) {
      const b = before.rows[labels.indexOf(l)];
      console.log(`  ${movedSet.has(l) ? 'MOVED!' : 'held  '} [${id}=${valueOf(b)}] ${l.padEnd(46)} ${b.bytes}B/${b.tris}t`);
    }
    if (heldButIn.length) {
      console.error(`\nbyte diff: FAIL — ${heldButIn.length} row(s) are IN the ruled set and did NOT move; the ruling is not reaching that geometry:`);
      for (const l of heldButIn) console.error(`  - ${l}`);
    }
    if (movedButOut.length) {
      console.error(`\nbyte diff: FAIL — ${movedButOut.length} row(s) are OUTSIDE the ruled set and moved anyway; the change leaked past the ruling:`);
      for (const l of movedButOut) console.error(`  - ${l}`);
    }
    if (heldButIn.length || movedButOut.length) process.exit(1);
    console.log(`\nbyte diff: PASS — the moved set EQUALS the ruled set exactly.`);
    console.log(`  ${inSet.length} rows have ${id} === ${want} and all ${inSet.length} moved; ${outSet.length} do not and all ${outSet.length} are bit-identical.`);
    process.exit(0);
  }

  if (!partition) {
    for (const l of labels) if (movedSet.has(l)) {
      const b = before.rows[labels.indexOf(l)], a = after.rows[labels.indexOf(l)];
      console.log(`  MOVED ${l}: ${b.bytes}B/${b.tris}t ${b.sha256.slice(0, 12)} -> ${a.bytes}B/${a.tris}t ${a.sha256.slice(0, 12)}`);
    }
    console.log(`${labels.length - movedSet.size}/${labels.length} byte-identical; ${movedSet.size} moved`);
    if (movedSet.size) {
      console.error('\nbyte diff: FAIL — a default-behaviour change is a STOP-AND-REPORT, not a migration.');
      process.exit(1);
    }
    console.log('byte diff: PASS — 0 of ' + labels.length + ' configs moved. Defaults are bit-identical.');
    process.exit(0);
  }

  /* PARTITION: the moved set must EQUAL the set of rows that inherit the named
     control's default — asserted in both directions. */
  const pins = new Map(before.rows.map((r) => [r.label, (r.pins || []).includes(partition)]));
  for (const r of after.rows) {
    if (pins.get(r.label) !== (r.pins || []).includes(partition)) {
      console.error(`byte diff: INVALID — row "${r.label}" pins ${partition} in one run and not the other.`);
      process.exit(1);
    }
  }
  const inherits = labels.filter((l) => !pins.get(l));
  const pinning = labels.filter((l) => pins.get(l));
  const movedButPins = pinning.filter((l) => movedSet.has(l));
  const heldButInherits = inherits.filter((l) => !movedSet.has(l));

  console.log(`partition on "${partition}": ${inherits.length} rows INHERIT its default, ${pinning.length} PIN it explicitly\n`);
  console.log(`  moved   : ${movedSet.size}`);
  console.log(`  expected: ${inherits.length} (exactly the inheriting rows)\n`);
  for (const l of pinning) {
    const b = before.rows[labels.indexOf(l)];
    console.log(`  ${movedSet.has(l) ? 'MOVED!' : 'held  '} [pins ${partition}] ${l.padEnd(34)} ${b.bytes}B/${b.tris}t`);
  }
  const ok = movedButPins.length === 0 && heldButInherits.length === 0;
  if (movedButPins.length) {
    console.error(`\nbyte diff: FAIL — ${movedButPins.length} row(s) PIN ${partition} and moved anyway; the change leaked past the control:`);
    for (const l of movedButPins) console.error(`  - ${l}`);
  }
  if (heldButInherits.length) {
    console.error(`\nbyte diff: FAIL — ${heldButInherits.length} row(s) INHERIT ${partition} and did NOT move; the control is not reaching that geometry:`);
    for (const l of heldButInherits) console.error(`  - ${l}`);
  }
  if (!ok) process.exit(1);
  console.log(`\nbyte diff: PASS — the moved set EQUALS the inheriting set exactly.`);
  console.log(`  ${inherits.length} inherit ${partition} and all ${inherits.length} moved; ${pinning.length} pin it and all ${pinning.length} are bit-identical.`);
  process.exit(0);
}

const root = path.resolve(arg('--root') || '.');
const out = arg('--out');
if (!out) { console.error('need --out <file.json>'); process.exit(2); }
if (!fs.existsSync(path.join(root, 'bloom.html'))) { console.error(`no bloom.html under ${root}`); process.exit(2); }

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/bloom.html';
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
const port = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const { browser, page } = await launchPage();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-bytes-'));

const FULL = process.argv.includes('--full');
const PHASE2 = process.argv.includes('--phase2');
const PHASE3 = process.argv.includes('--phase3');
const PHASE4 = process.argv.includes('--phase4');
const PHASE5 = process.argv.includes('--phase5');
const PHASE8 = process.argv.includes('--phase8');
const PHASE7 = process.argv.includes('--phase7');
const PHASE6 = process.argv.includes('--phase6');
/* Exactly one matrix. The guard and the LABEL are derived from one list so a
   new matrix cannot be added to the runner while the recorded label silently
   keeps saying something else — which is what happened when --phase3 landed:
   its runs recorded matrix:"legacy" while running phase3Matrix(), a label
   naming a computation nobody performed, in this project's most repeated
   defect shape. --compare does not read the field, so nothing drew a wrong
   conclusion from it; it was wrong in the record, which is enough. */
const MATRIX_FLAGS = [[FULL, 'full'], [PHASE8, 'phase8'], [PHASE7, 'phase7'], [PHASE6, 'phase6'], [PHASE5, 'phase5'], [PHASE4, 'phase4'], [PHASE3, 'phase3'], [PHASE2, 'phase2']];
const chosen = MATRIX_FLAGS.filter(([on]) => on);
if (chosen.length > 1) { console.error(`pick one matrix: ${MATRIX_FLAGS.map(([, n]) => '--' + n).join(' or ')}`); process.exit(2); }
const MATRIX = chosen.length ? chosen[0][1] : 'legacy';
const rows = [];
const validity = [];
const MATRIX_FN = { full: buildMatrix, phase8: phase8Matrix, phase7: phase7Matrix, phase6: phase6Matrix, phase5: phase5Matrix, phase4: phase4Matrix, phase3: phase3Matrix, phase2: phase2Matrix, legacy: legacyMatrix };
/* ONE list decides the flag, the recorded LABEL and the rows. It used to be
   two — a flag list for the guard and a ternary chain for the rows — and the
   chain silently fell through for any flag the chain did not know. That is
   how `--phase3` once recorded matrix:"legacy" while running phase3Matrix();
   it happened again in the other direction the moment `--phase4` was added
   (the flag was accepted, legacyMatrix() ran, and the record said so while
   nobody read it). The record was honest both times and the second copy was
   the defect, so there is now only one. */
for (const row of MATRIX_FN[MATRIX]()) {
  await openBloom(page, port);
  const bad = await applyConfig(page, row.set);
  if (bad.length) { validity.push(`${row.label}: config did not take: ${bad.join('; ')}`); continue; }
  /* Legacy-id whole-state check — see LIMITS in the header. */
  const got = await page.evaluate(() => window.__bloomUIState());
  const want = { petalCount: 8, petalLength: 35, petalWidth: 16, petalTilt: 25 };
  for (const s of row.set) want[s.id] = Number(s.value);
  for (const id of LEGACY_IDS) {
    if (Math.abs(Number(want[id]) - Number(got[id])) > 1e-9) validity.push(`${row.label}: ${id} expected ${want[id]}, live ${got[id]}`);
  }
  const buf = await exportStl(page, tmp);
  if (!buf) { validity.push(`${row.label}: no STL download`); continue; }
  /* `pins` records which controls the row set EXPLICITLY — the partition mode
     reads it rather than re-deriving the row's intent from its label. */
  const footHalf = footHalfSlab(got.sheetThickness);
  const foot = footRegionHash(buf, footHalf);
  /* `tilt` is recorded from the app's LIVE state, not from the row's label
     or its set — the region mode uses it to decide scope, and a row that
     inherits the default tilt must not be scoped by what its label omits. */
  rows.push({
    label: row.label, pins: row.set.map((s) => s.id), tilt: Number(got.petalTilt),
    /* THE ROW'S RESOLVED STATE, from the app's own snapshot. `pins` answers
       "did this row set the control"; this answers "what value did it end up
       at", and those are different questions with different partitions. The
       tip-cap ruling needs the second: `petalTipBreadth min (0)` PINS the
       control and must MOVE, while `ALL MAX` pins it at 0.6 and must HOLD, so
       a pins-vs-inherits split would have been the wrong axis entirely. */
    state: got,
    bytes: buf.length, tris: analyzeStl(buf).tris,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    footHash: foot.hash, footTris: foot.tris, footHalf,
  });
}
await browser.close(); server.close();
fs.rmSync(tmp, { recursive: true, force: true });

if (validity.length) {
  console.error(`byte diff: HARNESS INVALID under ${root} — ${validity.length} assertion(s) failed:`);
  for (const v of validity) console.error(`  - ${v}`);
  process.exit(1);
}
/* The recorded head must distinguish the two trees, and a COMMIT SHA ALONE
   DOES NOT when one of them is a dirty working tree: a before/after pair
   both reading "21d4602" looks exactly like a comparison of one tree with
   itself, which is the shape of a result that proves nothing. The dirty
   marker is therefore part of the identity, not a nicety. */
let head = null;
try {
  const cp = await import('node:child_process');
  const sha = cp.execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  const dirty = cp.execSync('git status --porcelain', { cwd: root }).toString().trim().length > 0;
  head = dirty ? `${sha}+dirty` : sha;
} catch { /* not a checkout */ }
fs.writeFileSync(out, JSON.stringify({ root, head, matrix: MATRIX, footRegionRule: FOOT_REGION_RULE, rows }, null, 1));
console.log(`hashed ${rows.length} configs from ${root} -> ${out}`);
