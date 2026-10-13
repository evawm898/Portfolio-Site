#!/usr/bin/env node
/* PRINT PREVIEW ALWAYS ON (F7) — THE EXPORT IS UNMOVED, row by row, against a
   base tree. Eva's ruling: "exports are unaffected: they must remain full print
   geometry, byte-identical to today."

   For every row of the smoke subset (SMOKE_LABELS, 218 rows at F7), on a FRESH
   PAGE opened AS SHIPPED — so on this tree the print-preview box is CHECKED and
   the viewport is export geometry, and on a base tree from before F7 it is
   unchecked and live — the row's controls are set through the real inputs and
   read back, a capability row gets its hook, and the real Get STL button is
   clicked. The bytes are hashed. Nothing is built in Node: the claim is about
   what the page hands a visitor.

   EVERY ROW REPORTS, and that is the point of the tool rather than a nicety: a
   row that does not reach the export is recorded with its reason (`failed`)
   and a row whose export the app refuses is recorded as `refused` with the
   read-out's own words. `--compare` refuses to pass unless both captures
   cover EXACTLY the same labels, every row is accounted for in one of four
   classes — IDENTICAL, DIFFERS, REFUSED ON BOTH, FAILED — and DIFFERS and
   FAILED are both empty. A capture that silently lost rows cannot pass.

   USAGE (one tree per capture; resumable, so it runs in foreground chunks):
     node tools/verify-bloom-print-preview-bytes.mjs --root <tree> --out <file.json> [--resume] [--max-seconds N]
     node tools/verify-bloom-print-preview-bytes.mjs --compare <base.json> <head.json>
   `--max-seconds` stops cleanly after the row in flight (the out file is written
   after EVERY row with `complete: false`), so a chunk never dies mid-write.

   NOT A CI GATE: it needs a worktree of the base commit, and which commit a
   session claims to have moved nothing since is the session's to name. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { serveRepo, launchPage, openBloom, applyConfig, applyCapability, exportStl, buildMatrix, kindsOf } from './bloom-harness.mjs';
import { SMOKE_LABELS } from './bloom-smoke.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };

if (process.argv.includes('--compare')) {
  const i = process.argv.indexOf('--compare');
  const A = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const B = JSON.parse(fs.readFileSync(process.argv[i + 2], 'utf8'));
  const bad = [];
  if (!A.complete || !B.complete) bad.push(`a capture is incomplete (base complete ${A.complete}, head complete ${B.complete})`);
  const la = A.rows.map((r) => r.label), lb = B.rows.map((r) => r.label);
  if (la.length !== lb.length || la.some((l, k) => l !== lb[k])) bad.push(`the two captures do not cover the same labels in order (${la.length} vs ${lb.length})`);
  const cls = { identical: [], differs: [], refusedBoth: [], failed: [] };
  const byB = new Map(B.rows.map((r) => [r.label, r]));
  for (const a of A.rows) {
    const b = byB.get(a.label);
    if (!b) continue;
    if (a.status === 'failed' || b.status === 'failed') cls.failed.push(`${a.label} — base: ${a.status}${a.reason ? ` (${a.reason})` : ''}; head: ${b.status}${b.reason ? ` (${b.reason})` : ''}`);
    else if (a.status === 'refused' && b.status === 'refused') cls.refusedBoth.push(a.label);
    else if (a.status === 'stl' && b.status === 'stl' && a.sha === b.sha) cls.identical.push(a.label);
    else cls.differs.push(`${a.label} — base ${a.status} ${a.tris ?? ''} ${a.sha ? a.sha.slice(0, 12) : ''}; head ${b.status} ${b.tris ?? ''} ${b.sha ? b.sha.slice(0, 12) : ''}`);
  }
  const accounted = cls.identical.length + cls.differs.length + cls.refusedBoth.length + cls.failed.length;
  if (accounted !== A.rows.length) bad.push(`${A.rows.length - accounted} row(s) fell into no class`);
  if (A.expected !== A.rows.length || B.expected !== B.rows.length) bad.push(`a capture holds fewer rows than it set out to (base ${A.rows.length}/${A.expected}, head ${B.rows.length}/${B.expected})`);
  console.log(`base ${A.root} @ ${A.head}\nhead ${B.root} @ ${B.head}`);
  console.log(`rows ${A.rows.length}: IDENTICAL ${cls.identical.length} · DIFFERS ${cls.differs.length} · REFUSED ON BOTH ${cls.refusedBoth.length} · FAILED ${cls.failed.length}`);
  for (const l of cls.refusedBoth) console.log(`  refused on both: ${l}`);
  for (const l of cls.differs) console.log(`  DIFFERS: ${l}`);
  for (const l of cls.failed) console.log(`  FAILED: ${l}`);
  if (cls.differs.length) bad.push(`${cls.differs.length} row(s) export different bytes`);
  if (cls.failed.length) bad.push(`${cls.failed.length} row(s) did not reach an export on one tree or both`);
  for (const b of bad) console.log(`FAIL: ${b}`);
  console.log(bad.length ? '\nPRINT-PREVIEW BYTES: FAILED' : `\nPRINT-PREVIEW BYTES: PASS — ${cls.identical.length} of ${A.rows.length} rows byte-identical, ${cls.refusedBoth.length} refused on both`);
  process.exit(bad.length ? 1 : 0);
}

const root = path.resolve(arg('--root') || '.');
const out = arg('--out');
if (!out) { console.error('--out <file.json> is required'); process.exit(2); }
const maxSeconds = Number(arg('--max-seconds') || Infinity);
const matrix = buildMatrix();
const want = SMOKE_LABELS.map((l) => {
  const r = matrix.find((x) => x.label === l);
  if (!r) throw new Error(`smoke label not in the matrix: ${l}`);
  return r;
});
let state = { root, head: null, expected: want.length, complete: false, rows: [] };
if (process.argv.includes('--resume') && fs.existsSync(out)) {
  state = JSON.parse(fs.readFileSync(out, 'utf8'));
  if (state.root !== root) throw new Error(`--resume: ${out} is a capture of ${state.root}, not ${root}`);
}
try { state.head = (await import('node:child_process')).execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { state.head = 'unknown'; }
const kinds = await kindsOf(root);
const done = new Set(state.rows.map((r) => r.label));
const t0 = Date.now();
const { server, port } = await serveRepo(root);
const { browser, page: first } = await launchPage({ viewport: { width: 1000, height: 800 } });
await first.close();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-pp-bytes-'));
try {
  for (const row of want) {
    if (done.has(row.label)) continue;
    if ((Date.now() - t0) / 1000 > maxSeconds) break;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.setDefaultTimeout(300000);
    await page.route('**cdn.jsdelivr.net/**', (route) => {
      const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
      try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(process.cwd(), 'node_modules/three', rel)) }); } catch { route.abort(); }
    });
    await page.route('**fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**fonts.gstatic.com/**', (r) => r.abort());
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const rec = { label: row.label };
    try {
      await openBloom(page, port, { asShipped: true });
      rec.boxChecked = await page.evaluate(() => { const el = document.getElementById('printPreview'); return el ? el.checked : null; });
      const bad = await applyConfig(page, row.set, kinds, { settleMs: 300000 });
      if (bad.length) throw new Error(`read-back: ${bad.join('; ')}`);
      const cap = await applyCapability(page, row);
      if (cap.length) throw new Error(`capability: ${cap.join('; ')}`);
      const buf = await exportStl(page, tmp);
      if (!buf) {
        const txt = await page.evaluate(() => document.getElementById('readout').textContent);
        const m = /[^\n]*(refus|over the|budget)[^\n]*/i.exec(txt);
        rec.status = 'refused'; rec.reason = m ? m[0].slice(0, 160) : 'no download and no refusal line in the read-out';
        if (!m) rec.status = 'failed';
      } else {
        rec.status = 'stl'; rec.tris = buf.readUInt32LE(80); rec.bytes = buf.length; rec.sha = crypto.createHash('sha256').update(buf).digest('hex');
      }
    } catch (e) {
      rec.status = 'failed'; rec.reason = String(e).split('\n')[0].slice(0, 200);
    }
    await ctx.close();
    state.rows.push(rec);
    fs.writeFileSync(out, JSON.stringify(state, null, 1));
    console.log(`${state.rows.length}/${want.length} ${rec.status.padEnd(7)} ${rec.tris ?? ''} ${row.label}${rec.reason ? ` — ${rec.reason}` : ''}`);
  }
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
state.complete = state.rows.length === want.length;
fs.writeFileSync(out, JSON.stringify(state, null, 1));
console.log(state.complete ? `complete: ${state.rows.length} rows` : `partial: ${state.rows.length} of ${want.length} rows — re-run with --resume`);
