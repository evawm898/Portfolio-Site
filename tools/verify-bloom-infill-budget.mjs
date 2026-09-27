/* ===================================================================
   verify-bloom-infill-budget.mjs — EVERY INFILLED STATE UNDER THE CEILING, ON
   ITS OWN MESH (S5 of the Voronoi infill).

     node tools/verify-bloom-infill-budget.mjs
     node tools/verify-bloom-infill-budget.mjs --negative-control

   WHY. An infilled petal is overwhelmingly RIM, and S5 puts K = 4 bead
   segments on every hole-rim point where S3 drew one flat quad: the rim goes
   from 2 triangles a point to 8. The export refuses anything above
   `EXPORT_TRI_BUDGET` (1,500,000), and the one row that can get near it is
   the feature's own cost corner, `INFILL: x 40 petals x 3 whorls`. So the
   claim is a number per state, not an estimate.

   WHAT IT ASSERTS, for EVERY matrix row whose state engages the infill (the
   guard predicate `infillIsAbsent` false on the row's own coerced state —
   predeclared from the GUARD, not from labels), in BOTH modes:
     B0 THE COUNT IS THIS BUILD'S OWN. A fresh accumulator per row per mode;
        `triangleCount` equals the positions it holds; and the representative
        petal's infill record says it was BUILT on this call (a count read off
        a stale or refused record would be last-good, not this mesh).
     B1 UNDER THE CEILING: export triangles <= EXPORT_TRI_BUDGET, the
        geometry's own constant (imported — one owner).
     B2 MODE-FREE: live and export triangle counts are equal, which both STL
        gates also require. The bead's radius reads the sheet through the
        mode-free floor so the grown ring — the annulus's topology — is the
        same ring in both modes; this is where that is measured.
   It prints every row's count and its share of the budget, worst first.

   --negative-control mutates a copy of the geometry so the hole bead is swept
   at sixteen segments instead of four and requires B1 to fire on the cost
   corner (the mutation is cost-only: B0 and B2 must stay silent).

   WHAT IT DOES NOT COVER: rows the guard keeps off are byte-identical to the
   base tree (the byte partition's claim, not this gate's), and `ALL MAX` —
   uninfilled by construction, since the guard is a CHOICE the blanket sweep
   cannot reach — keeps its own declared refusal in both STL gates (XR1).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEG = process.argv.includes('--negative-control');
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (row) => { const s = { ...H.DEFAULTS }; for (const w of row.set || []) { const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`); s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value; } return s; };

async function loadGeometry(src) {
  if (!src) return import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infill-budget-'));
  const f = path.join(dir, 'bloom-geometry.mjs'); fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}

function run(G, only = null, quiet = false) {
  const bad = [], fired = new Set(), rows = [];
  const add = (id, ok, msg) => { if (!ok) { bad.push(`${id}: ${msg}`); fired.add(id); } };
  for (const r of H.buildMatrix()) {
    if (only && !only.test(r.label)) continue;
    const st = stateOf(r);
    if (G.infillIsAbsent(st)) continue;
    const n = {};
    for (const exportMode of [true, false]) {
      const acc = new G.MeshBuilder({ exportMode });
      const built = G.buildBloomInto(acc, st, { below: null, capability: r.capability || null });
      const mode = exportMode ? 'export' : 'live';
      add('B0', acc.positions.length === acc.triangleCount * 9, `${r.label} ${mode}: triangleCount ${acc.triangleCount} does not match the ${acc.positions.length / 9} triangles the accumulator holds`);
      const F = built.petalsAll && built.petalsAll.find((p) => p && p.infill);
      add('B0', !!F, `${r.label} ${mode}: no petal carries an infill record on this build`);
      n[mode] = acc.triangleCount;
      if (F) n.built = F.infill.built;
    }
    add('B1', n.export <= G.EXPORT_TRI_BUDGET, `${r.label}: ${n.export} export triangles, over the ${G.EXPORT_TRI_BUDGET} budget`);
    add('B2', n.export === n.live, `${r.label}: ${n.export} triangles in export against ${n.live} live`);
    rows.push({ label: r.label, tris: n.export, built: n.built });
  }
  if (!quiet) {
    rows.sort((a, b) => b.tris - a.tris);
    for (const x of rows) console.log(`  ${String(x.tris).padStart(9)}  ${(100 * x.tris / G.EXPORT_TRI_BUDGET).toFixed(1).padStart(5)}%  ${x.built ? 'cut ' : 'not cut'}  ${x.label.slice(0, 90)}`);
  }
  return { bad, fired, rows };
}

const G = await loadGeometry(null);
const res = run(G);
if (!res.rows.length) { console.error('FAIL — no matrix row engages the infill; the gate would be vacuous'); process.exit(1); }
if (res.bad.length) { console.error('FAIL\n  ' + res.bad.join('\n  ')); process.exit(1); }
console.log(`PASS — B0 B1 B2 over ${res.rows.length} infilled rows x 2 modes; worst ${res.rows[0].tris} triangles, ${(100 * res.rows[0].tris / G.EXPORT_TRI_BUDGET).toFixed(1)}% of ${G.EXPORT_TRI_BUDGET}`);

if (NEG) {
  const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  const from = '  const K = rimSegments(tAt(rows[mSplit].u));';
  const hits = SRC.split(from).length - 1;
  if (hits !== 1) { console.error(`NEGATIVE CONTROL: anchor matches ${hits} times — disarmed`); process.exit(1); }
  const GM = await loadGeometry(SRC.replace(from, '  const K = 16;'));
  const m = run(GM, /^INFILL: x 40 petals x 3 whorls/, true);
  const ok = m.fired.has('B1') && !m.fired.has('B0') && !m.fired.has('B2');
  console.log(`  sixteen-segment beads on the cost corner: fired ${[...m.fired].join(', ') || 'nothing'} — ${m.bad[0] || ''}`);
  if (!ok) { console.error('NEGATIVE CONTROL FAILED — B1 alone must fire'); process.exit(1); }
  console.log('NEGATIVE CONTROL PASS');
}
