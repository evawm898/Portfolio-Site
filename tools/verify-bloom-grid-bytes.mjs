#!/usr/bin/env node
/* THE /plot GRID EXPORT DOES NOT MOVE — byte for byte, against another tree.
   ============================================================================

   WHY THIS EXISTS AND WHY IT IS A CROSS-TREE TOOL. The edge-profile change
   rewrites how the two skins are offset from the petal's mid-surface: a taper
   across the row and a bead that closes the edge. It does NOT move the
   mid-surface — the bead's apex is ON it — and /plot draws the MID-SURFACE,
   the petal's own construction curves. Those curves must not move for a reason
   that is not about them, and "must not move" is a claim about BYTES that only
   a second tree can settle. `tools/verify-bloom-grid.mjs` clause 1 is a
   different claim entirely (that turning the capture ON moves no emitted
   float, on ONE tree) and is blind to this one.

   WHAT IT COMPARES. `buildGridGltf(built, { mode, state })` on both trees, for
   every row of a declared set, in BOTH modes, byte for byte over the whole
   .glb — the JSON chunk and the BIN chunk together. Not a field-by-field
   comparison: a field nobody thought to compare is exactly the failure a
   field-by-field comparison cannot see (#274's own lesson in the composition
   file), and the .glb is the artefact /plot actually reads.

   RUN: node tools/verify-bloom-grid-bytes.mjs --base <worktree of main>
        node tools/verify-bloom-grid-bytes.mjs --base <worktree> --control
          (REQUIRED: perturbs ONE captured mid-surface value by 1e-9 on this
          tree and demands the comparison find it. A byte comparison that has
          never been shown able to fail is a log line.)
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const BASE = (() => { const i = argv.indexOf('--base'); return i >= 0 ? path.resolve(argv[i + 1]) : null; })();
const CONTROL = argv.includes('--control');
const ONLY = (() => { const i = argv.indexOf('--only'); return i >= 0 ? new RegExp(argv[i + 1]) : null; })();
if (!BASE) { console.error('verify-bloom-grid-bytes: --base <worktree> is required.'); process.exit(2); }

const load = async (root) => ({
  G: await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href),
  R: await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href),
  X: await import(pathToFileURL(path.join(root, 'bloom-grid-gltf.js')).href),
});
const A = await load(HERE), B = await load(BASE);
const H = await import(pathToFileURL(path.join(HERE, 'tools', 'bloom-harness.mjs')).href);

const stateFor = (D, row) => {
  const st = { ...D };
  for (const { id, value } of (row.set || [])) {
    if (!(id in D)) { st[id] = value; continue; }
    const d = D[id];
    st[id] = typeof d === 'number' ? Number(value) : typeof d === 'boolean' ? (value === true || value === 'true') : value;
  }
  return st;
};

/* THE ROW SET is the smoke subset's own rows — one per matrix block plus the
   rows a feature session pinned — because the claim is about every SHAPE the
   grid can describe, not about every slider value. Named here so a reader can
   see what was and was not compared. */
const MATRIX = H.buildMatrix();
const seen = new Set();
const ROWS = MATRIX.filter((r) => {
  if (ONLY) return ONLY.test(r.label);
  const head = r.label.split(':')[0].replace(/[0-9].*$/, '').trim();
  if (seen.has(head)) return false;
  seen.add(head); return true;
});

const gltfOf = (T, row, exportMode, perturb) => {
  const acc = new T.G.MeshBuilder({ exportMode, captureGrid: true });
  const built = T.G.buildBloomInto(acc, stateFor(T.R.DEFAULTS, row), { below: null, capability: row.capability || null });
  if (perturb) {
    /* ONE captured mid-surface value, by 1e-3 mm, AND THE SIZE IS THE FILE'S
       OWN RESOLUTION RATHER THAN A CHOICE. The .glb stores positions as
       FLOAT32 and its JSON through `toFixed(6)`, so a micron is about the
       smallest move that can reach the bytes at a 40 mm coordinate; a 1e-9
       perturbation — this tool's first version — is invisible by construction
       and the control reported 0 of 242 while claiming the comparison worked.
       So the claim this gate makes is bounded: it sees the grid move by a
       micron, not by an ulp. Said here rather than implied. */
    /* THE LAST ROW, NOT THE FIRST — and the control found that for itself.
       `bloom-grid-gltf.js` drops every captured row below `footRows - 1`, so a
       perturbation planted on row 0 never reaches the file and the control
       reported 0 of 242 while claiming the comparison worked. A control that
       has not been seen to fire is a log line; this one fired at itself. */
    for (const p of (built.petalsAll || [])) {
      const g = p && p.grid && p.grid[0];
      if (g && g.rows && g.rows.length) { g.rows[g.rows.length - 1].mid[0][0] += 1e-3; break; }
    }
  }
  return new Uint8Array(T.X.buildGridGltf(built, { mode: exportMode ? 'export' : 'live', state: stateFor(T.R.DEFAULTS, row) }));
};

let compared = 0, moved = 0, threwBoth = 0;
const findings = [];
for (const row of ROWS) {
  for (const exportMode of [false, true]) {
    let a, b;
    try { a = gltfOf(A, row, exportMode, CONTROL); } catch (e) { a = e; }
    try { b = gltfOf(B, row, exportMode, false); } catch (e) { b = e; }
    if (a instanceof Error && b instanceof Error) { threwBoth++; continue; }
    if (a instanceof Error || b instanceof Error) {
      findings.push(`${row.label} [${exportMode ? 'export' : 'live'}]: threw on ONE tree only — ${(a instanceof Error ? a : b).message}`);
      continue;
    }
    compared++;
    if (a.length !== b.length) { moved++; findings.push(`${row.label} [${exportMode ? 'export' : 'live'}]: the .glb is ${a.length} bytes against ${b.length}`); continue; }
    let at = -1;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { at = i; break; }
    if (at >= 0) { moved++; findings.push(`${row.label} [${exportMode ? 'export' : 'live'}]: byte ${at} of ${a.length} differs (${a[at]} against ${b[at]})`); }
  }
}

console.log(`grid-bytes: ${compared} builds compared over ${ROWS.length} rows, both modes` + (threwBoth ? ` (${threwBoth} threw on BOTH trees and carry no information)` : ''));
if (CONTROL) {
  if (moved === compared && compared > 0) { console.log(`grid-bytes control: PASS — the 1e-3 mm perturbation (the file's own float32 resolution) was found on all ${moved} of ${compared} builds.`); }
  else { console.error(`grid-bytes control: FAILED — the perturbation was found on ${moved} of ${compared} builds; the comparison cannot see what it claims to see.`); process.exit(1); }
} else if (moved) {
  console.error(`grid-bytes: FAILED — the /plot grid export moved on ${moved} of ${compared} builds.`);
  for (const f of findings.slice(0, 25)) console.error('  ' + f);
  process.exit(1);
} else {
  if (!compared) { console.error('grid-bytes: FAILED — nothing was compared.'); process.exit(1); }
  console.log(`grid-bytes: PASS — the /plot grid glTF is byte-identical to ${path.basename(BASE)} on every build.`);
}
