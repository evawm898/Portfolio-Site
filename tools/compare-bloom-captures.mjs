/* ===================================================================
   compare-bloom-captures.mjs — the session-21 retention compare: the newest
   frozen baseline (phase15, 527 rows) on the base tree against the head, row by
   row by LABEL, sha256 of the real Get STL bytes, from diff-bloom-bytes.mjs's
   own captures.

   WHY THIS EXISTS BESIDE `diff-bloom-bytes.mjs --compare`. phase15 was frozen
   at 8524318, BEFORE the centre retirement (session 20), so 55 of its rows name
   the retired centre ids and NO post-retirement tree can apply them as written
   — applyConfig refuses them by design, the capture records 472 rows and exits
   1, and the tool's own --compare refuses an incomplete capture. Session 20's
   retirement mode was for a retirement; a session that retires nothing needs
   the like-for-like close: capture the 472 rows as written and the 55 with
   --strip (the registry's RETIRED_IDS) on BOTH trees, then compare all 527.
   The four captures are named below; the guards are the tool's own restated:
     G1 every phase15 label present exactly once on each side (527 of 527);
     G2 the two trees are DIFFERENT trees (treeSha fingerprints differ) and the
        two captures of one tree share a fingerprint;
     G3 the strip list on the 55-row captures is exactly RETIRED_IDS on both
        sides, and the 472-row captures stripped nothing;
     G4 the expected partition is on the command line and refused otherwise.
   Then the ONE predicted live mover, ALL MAX (it sweeps stamenCount to 120 on
   the head and the base has no such control), captured by EACH TREE'S OWN copy
   of the tool — the matrix is the running tool's, never the served tree's —
   and required to differ.

   RUN, from a directory holding:
     bytes-phase15-base.json         --phase15 --root <base worktree>           (472 rows, exit 1)
     bytes-phase15-base-strip55.json --phase15 --root <base> --only <55 labels> --strip <RETIRED_IDS>
     bytes-phase15-head.json         --phase15 --root <head>                    (472 rows, exit 1)
     bytes-phase15-head-strip55.json --phase15 --root <head> --only <55 labels> --strip <RETIRED_IDS>
     bytes-allmax-base.json          <base>/tools/diff-bloom-bytes.mjs --full --root <base> --only '^ALL MAX$'
     bytes-allmax-head.json          --full --root <head> --only '^ALL MAX$'
   node tools/compare-bloom-captures.mjs <dir> <expectMoved> <expectHeld>
   Session 21's result: 527 compared, 527 HELD, 0 MOVED; ALL MAX moved by
   exactly 120 x 560 triangles (docs/bloom-session-21-outcome.md).
   =================================================================== */
import fs from 'node:fs';
import { phase15Matrix, RETIRED_IDS } from './bloom-harness.mjs';
const S = process.argv[2], expectMove = Number(process.argv[3]), expectHold = Number(process.argv[4]);
const load = (f) => JSON.parse(fs.readFileSync(`${S}/${f}`, 'utf8'));
const side = (plain, strip) => {
  const a = load(plain), b = load(strip);
  if (a.strip && a.strip.length) throw new Error(`${plain} stripped ${a.strip}`);
  const want = RETIRED_IDS.map((r) => r.id).sort().join(',');
  if ((b.strip || []).slice().sort().join(',') !== want) throw new Error(`G3: ${strip} strip is ${b.strip}, RETIRED_IDS is ${want}`);
  if (a.treeSha !== b.treeSha) throw new Error(`G2: ${plain} and ${strip} are not one tree (${a.treeSha} vs ${b.treeSha})`);
  const rows = new Map();
  for (const r of [...a.rows, ...b.rows]) { if (rows.has(r.label)) throw new Error(`G1: duplicate label ${r.label}`); rows.set(r.label, r); }
  return { rows, treeSha: a.treeSha, head: a.head, root: a.root };
};
const base = side('bytes-phase15-base.json', 'bytes-phase15-base-strip55.json');
const head = side('bytes-phase15-head.json', 'bytes-phase15-head-strip55.json');
if (base.treeSha === head.treeSha) throw new Error(`G2: both sides fingerprint ${base.treeSha} — one tree compared with itself`);
const labels = phase15Matrix().map((r) => r.label);
let moved = [], held = 0, missing = [];
for (const l of labels) {
  const a = base.rows.get(l), b = head.rows.get(l);
  if (!a || !b) { missing.push(l); continue; }
  if (a.sha256 === b.sha256) held++; else moved.push({ l, a: a.sha256.slice(0, 12), b: b.sha256.slice(0, 12), ta: a.tris, tb: b.tris });
}
console.log(`phase15: ${labels.length} rows · base ${base.head} (${base.treeSha}) vs head ${head.head} (${head.treeSha})`);
console.log(`  compared ${held + moved.length} · HELD ${held} · MOVED ${moved.length} · missing ${missing.length}`);
for (const m of moved) console.log(`  MOVED: ${m.l}: ${m.a} (${m.ta}) -> ${m.b} (${m.tb})`);
for (const l of missing) console.log(`  MISSING: ${l}`);
if (missing.length) { console.error('G1: not every phase15 row is on both sides'); process.exit(1); }
if (moved.length !== expectMove || held !== expectHold) { console.error(`G4: expected ${expectMove} moved / ${expectHold} held`); process.exit(1); }
/* The predicted live mover. */
const am = load('bytes-allmax-base.json').rows[0], ah = load('bytes-allmax-head.json').rows[0];
console.log(`ALL MAX (live): base ${am.sha256.slice(0, 12)} (${am.tris} tris) vs head ${ah.sha256.slice(0, 12)} (${ah.tris} tris) — ${am.sha256 === ah.sha256 ? 'HELD (NOT predicted)' : 'MOVED (predicted: stamenCount 120 on a ring)'}`);
console.log(`  head ALL MAX resolved stamenCount ${ah.state.stamenCount} · base has no such control (${am.state.stamenCount === undefined ? 'absent' : am.state.stamenCount})`);
if (am.sha256 === ah.sha256) process.exit(1);
console.log('PASS');
