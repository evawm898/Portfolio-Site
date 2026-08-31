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
   |z| <= t/2 + 1e-3, with t the sheet thickness (1.2 mm live and export
   alike, above the 1.0 mm floor, so t/2 = 0.6 mm). At any petalTilt > 0 that
   set is exactly the three FOOT rows plus the hub disc plus whatever of the
   centre lies in the slab — the first blade row already reaches z = 1.07 mm
   at the default tilt, and a triangle spanning the last foot row and the
   first blade row has vertices on both sides and is therefore excluded.

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

   RUN:  node tools/diff-bloom-bytes.mjs [--full|--phase2|--phase3] --root <dir> --out <file.json>
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
import { launchPage, openBloom, applyConfig, exportStl, analyzeStl, legacyMatrix, buildMatrix, phase2Matrix, phase3Matrix } from './bloom-harness.mjs';

/* THE ONE OWNER of the foot-region criterion. Both the header above and the
   run output quote this string rather than restating the rule — a region
   definition written twice is a region definition that drifts, and the
   tilt-range caveat is the half that would be dropped. */
const FOOT_T_HALF = 0.6;        // sheet thickness 1.2 mm / 2 — live and export alike
const FOOT_EPS = 1e-3;
export const FOOT_REGION_RULE =
  `all three vertices with |z| <= ${FOOT_T_HALF} + ${FOOT_EPS} mm (= foot rows + hub disc at any petalTilt > 0; UNDEFINED at petalTilt 0, where the blade lies in the same plane)`;

/* Hash of the foot region alone. Triangles are hashed in file order — the
   builders are deterministic, so order is part of "did it move". */
function footRegionHash(buf) {
  const n = buf.readUInt32LE(80);
  const h = crypto.createHash('sha256');
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    let inside = true;
    for (let k = 0; k < 3 && inside; k++) if (Math.abs(buf.readFloatLE(o + 12 + k * 12 + 8)) > FOOT_T_HALF + FOOT_EPS) inside = false;
    if (!inside) continue;
    kept++;
    h.update(buf.subarray(o + 12, o + 48));
  }
  return { hash: h.digest('hex'), tris: kept };
}

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
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
    const scoped = [], skipped = [], movedFoot = [];
    for (let k = 0; k < labels.length; k++) {
      const b = before.rows[k], a = after.rows[k];
      /* petalTilt 0 is OUT OF SCOPE, never a pass and never a failure — with
         no tilt the blade lies in the hub plane and the criterion cannot
         separate it from the foot. Read from the row's own recorded tilt, so
         a matrix change cannot silently move a row in or out of scope. */
      if (Number(b.tilt) === 0 || Number(a.tilt) === 0) { skipped.push(labels[k]); continue; }
      scoped.push(labels[k]);
      if (b.footHash !== a.footHash || b.footTris !== a.footTris) movedFoot.push({ l: labels[k], b, a });
    }
    for (const m of movedFoot) console.log(`  MOVED ${m.l}: ${m.b.footTris} -> ${m.a.footTris} tris, ${m.b.footHash.slice(0, 12)} -> ${m.a.footHash.slice(0, 12)}`);
    console.log(`  ${scoped.length - movedFoot.length}/${scoped.length} in-scope rows have a BIT-IDENTICAL foot region`);
    console.log(`  ${skipped.length} row(s) OUT OF SCOPE (petalTilt 0 — not a pass): ${skipped.join(', ') || 'none'}`);
    console.log(`  whole-export moves on the same rows: ${movedSet.size}/${labels.length} (that is the blade changing, which is the point)`);
    if (movedFoot.length) {
      console.error(`\nbyte diff: FAIL — ${movedFoot.length} row(s) moved bytes INSIDE the foot region. The silhouette reached the foot or the hub; the junction argument no longer holds by construction.`);
      process.exit(1);
    }
    console.log('\nbyte diff: PASS — the foot region is bit-identical on every in-scope row.');
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
/* Exactly one matrix. The guard and the LABEL are derived from one list so a
   new matrix cannot be added to the runner while the recorded label silently
   keeps saying something else — which is what happened when --phase3 landed:
   its runs recorded matrix:"legacy" while running phase3Matrix(), a label
   naming a computation nobody performed, in this project's most repeated
   defect shape. --compare does not read the field, so nothing drew a wrong
   conclusion from it; it was wrong in the record, which is enough. */
const MATRIX_FLAGS = [[FULL, 'full'], [PHASE3, 'phase3'], [PHASE2, 'phase2']];
const chosen = MATRIX_FLAGS.filter(([on]) => on);
if (chosen.length > 1) { console.error(`pick one matrix: ${MATRIX_FLAGS.map(([, n]) => '--' + n).join(' or ')}`); process.exit(2); }
const MATRIX = chosen.length ? chosen[0][1] : 'legacy';
const rows = [];
const validity = [];
for (const row of (FULL ? buildMatrix() : PHASE3 ? phase3Matrix() : PHASE2 ? phase2Matrix() : legacyMatrix())) {
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
  const foot = footRegionHash(buf);
  /* `tilt` is recorded from the app's LIVE state, not from the row's label
     or its set — the region mode uses it to decide scope, and a row that
     inherits the default tilt must not be scoped by what its label omits. */
  rows.push({
    label: row.label, pins: row.set.map((s) => s.id), tilt: Number(got.petalTilt),
    bytes: buf.length, tris: analyzeStl(buf).tris,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    footHash: foot.hash, footTris: foot.tris,
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
