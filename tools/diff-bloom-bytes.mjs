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

   RUN:  node tools/diff-bloom-bytes.mjs [--full] --root <dir> --out <file.json>
         ... twice, then:
         node tools/diff-bloom-bytes.mjs --compare <before.json> <after.json>
         node tools/diff-bloom-bytes.mjs --compare <b.json> <a.json> --partition <controlId>
   =================================================================== */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { launchPage, openBloom, applyConfig, exportStl, analyzeStl, legacyMatrix, buildMatrix } from './bloom-harness.mjs';

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
  const movedSet = new Set();
  for (let k = 0; k < labels.length; k++) {
    if (before.rows[k].sha256 !== after.rows[k].sha256) movedSet.add(labels[k]);
  }
  console.log(`byte diff: ${labels.length} configs compared`);
  console.log(`  before: ${before.root} @ ${before.head || 'unrecorded'}`);
  console.log(`  after:  ${after.root} @ ${after.head || 'unrecorded'}\n`);

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
const rows = [];
const validity = [];
for (const row of (FULL ? buildMatrix() : legacyMatrix())) {
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
  rows.push({ label: row.label, pins: row.set.map((s) => s.id), bytes: buf.length, tris: analyzeStl(buf).tris, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
}
await browser.close(); server.close();
fs.rmSync(tmp, { recursive: true, force: true });

if (validity.length) {
  console.error(`byte diff: HARNESS INVALID under ${root} — ${validity.length} assertion(s) failed:`);
  for (const v of validity) console.error(`  - ${v}`);
  process.exit(1);
}
let head = null;
try { head = (await import('node:child_process')).execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { /* not a checkout */ }
fs.writeFileSync(out, JSON.stringify({ root, head, matrix: FULL ? 'full' : 'legacy', rows }, null, 1));
console.log(`hashed ${rows.length} configs from ${root} -> ${out}`);
