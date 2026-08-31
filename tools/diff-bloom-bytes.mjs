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

   WHAT IT COMPARES. `legacyMatrix()` — the 47 rows the scaffold's matrix held
   at 37e160d, frozen in bloom-harness.mjs — run against two trees, hashing
   the exact bytes the real Get STL button produced. Like for like: those rows
   set only the four original sliders, which exist in both trees, and the new
   controls sit at their defaults in the new one.

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

   RUN:  node tools/diff-bloom-bytes.mjs --root <dir> --out <file.json>
         ... twice, then:
         node tools/diff-bloom-bytes.mjs --compare <before.json> <after.json>
   =================================================================== */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { launchPage, openBloom, applyConfig, exportStl, analyzeStl, legacyMatrix } from './bloom-harness.mjs';

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
  const moved = [];
  for (let k = 0; k < labels.length; k++) {
    const b = before.rows[k], a = after.rows[k];
    if (b.sha256 !== a.sha256) moved.push({ label: labels[k], b, a });
  }
  console.log(`byte diff: ${labels.length} configs compared (the frozen legacy matrix), new controls at their defaults\n`);
  console.log(`  before: ${before.root}\n  after:  ${after.root}\n`);
  for (const m of moved) {
    console.log(`  MOVED ${m.label}: ${m.b.bytes}B/${m.b.tris}t ${m.b.sha256.slice(0, 12)} -> ${m.a.bytes}B/${m.a.tris}t ${m.a.sha256.slice(0, 12)}`);
  }
  console.log(`${labels.length - moved.length}/${labels.length} byte-identical; ${moved.length} moved`);
  if (moved.length) {
    console.error('\nbyte diff: FAIL — a default-behaviour change is a STOP-AND-REPORT, not a migration.');
    process.exit(1);
  }
  console.log('byte diff: PASS — 0 of ' + labels.length + ' configs moved. Defaults are bit-identical.');
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

const rows = [];
const validity = [];
for (const row of legacyMatrix()) {
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
  rows.push({ label: row.label, bytes: buf.length, tris: analyzeStl(buf).tris, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
}
await browser.close(); server.close();
fs.rmSync(tmp, { recursive: true, force: true });

if (validity.length) {
  console.error(`byte diff: HARNESS INVALID under ${root} — ${validity.length} assertion(s) failed:`);
  for (const v of validity) console.error(`  - ${v}`);
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify({ root, rows }, null, 1));
console.log(`hashed ${rows.length} configs from ${root} -> ${out}`);
