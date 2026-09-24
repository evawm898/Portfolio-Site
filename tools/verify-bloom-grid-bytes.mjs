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
const CONTROL_ONLY = argv.includes('--control-only');
/* A DECLARED CHANGE, NAMED ON THE COMMAND LINE. Without one this tool makes
   the claim it was written for — the .glb does not move at all. With one it
   makes the two-clause claim that change is entitled to and NOTHING WIDER, so
   a session that moves these bytes has to say which change moved them and the
   default stays strict for every other change. `verify-bloom-seam-bytes.mjs`'s
   own `--change` shape. */
const CHANGE = (() => { const i = argv.indexOf('--change'); return i >= 0 ? argv[i + 1] : null; })();
const KNOWN_CHANGES = new Set(['mask']);
if (CHANGE && !KNOWN_CHANGES.has(CHANGE)) {
  console.error(`verify-bloom-grid-bytes: unknown --change ${CHANGE}; known: ${[...KNOWN_CHANGES].join(', ')}`);
  process.exit(2);
}
const ONLY = (() => { const i = argv.indexOf('--only'); return i >= 0 ? new RegExp(argv[i + 1]) : null; })();
if (!BASE) { console.error('verify-bloom-grid-bytes: --base <worktree> is required.'); process.exit(2); }

const load = async (root) => ({
  G: await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href),
  R: await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href),
  X: await import(pathToFileURL(path.join(root, 'bloom-grid-gltf.js')).href),
});
const A = await load(HERE), B = await load(BASE);
/* THE CONTROL-SET DELTA, MEASURED FROM THE TWO TREES RATHER THAN TYPED. The
   .glb echoes the whole control set at `asset.extras.state`, so ADDING a
   registry key moves those bytes on every row — not because the grid moved but
   because the generator grew a control. Reading the delta out of the two
   `DEFAULTS` objects makes that a measurement: a typed list would go stale, and
   worse, would let a key this tool was never told about pass as declared. */
const ADDED_KEYS = Object.keys(A.R.DEFAULTS).filter((k) => !(k in B.R.DEFAULTS));
const REMOVED_KEYS = Object.keys(B.R.DEFAULTS).filter((k) => !(k in A.R.DEFAULTS));
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

/* THE TWO CHUNKS, SEPARATELY, because the partition a telemetry addition is
   entitled to is exactly "the geometry did not move and the JSON grew by one
   declared key". A whole-file comparison cannot express that; it can only say
   everything moved, which is true and useless. */
function chunksOf(glb) {
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jLen = dv.getUint32(12, true);
  const json = new Uint8Array(glb.buffer, glb.byteOffset + 20, jLen);
  const bOff = 20 + jLen;
  const bLen = dv.getUint32(bOff, true);
  const bin = new Uint8Array(glb.buffer, glb.byteOffset + bOff + 8, bLen);
  return { json, bin };
}
const sameBytes = (a, b) => {
  if (a.length !== b.length) return -2;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
};
const jsonText = (u8) => new TextDecoder().decode(u8).replace(/\s+$/, '');

/* STRIP THE DECLARED KEY AND RENORMALISE. Both sides go through the SAME
   parse -> stringify, so the comparison cannot be fooled by formatting — and
   the bound that introduces is turned into a measured fact rather than left as
   prose: `renormIsIdentity` below asserts that the BASE tree's own JSON
   round-trips to itself byte for byte, so on that side the normalisation is
   provably the identity and the only thing this comparison can be hiding is a
   formatting change THIS tree introduced. */
function strippedJson(u8, change, counter) {
  const doc = JSON.parse(jsonText(u8));
  if (change === 'mask') {
    for (const n of (doc.nodes || [])) {
      for (const pan of ((n.extras && n.extras.panels) || [])) {
        if ('material' in pan) { delete pan.material; counter.stripped++; }
      }
    }
  }
  return doc;
}

/* THE STATE ECHO IS COMPARED AS AN OBJECT, NEVER NORMALISED AWAY. Every key
   the two trees share must carry an EQUAL value, and the keys present on only
   one must be exactly the registry delta measured above. That is strictly
   stronger than blanking the echo: a control whose DEFAULT moved, or a key
   this tool was not told about, is a finding rather than a formatting
   difference. */
function stateFinding(aDoc, bDoc) {
  const as = (aDoc.asset && aDoc.asset.extras && aDoc.asset.extras.state) || {};
  const bs = (bDoc.asset && bDoc.asset.extras && bDoc.asset.extras.state) || {};
  for (const k of Object.keys(as)) {
    if (!(k in bs)) { if (!ADDED_KEYS.includes(k)) return `the file's state echo gained \`${k}\`, which is not one of the ${ADDED_KEYS.length} key(s) the registry added`; continue; }
    if (JSON.stringify(as[k]) !== JSON.stringify(bs[k])) return `the file's state echo carries ${k}=${JSON.stringify(as[k])} against ${JSON.stringify(bs[k])}`;
  }
  for (const k of Object.keys(bs)) {
    if (!(k in as) && !REMOVED_KEYS.includes(k)) return `the file's state echo LOST \`${k}\`, which the registry still declares`;
  }
  return null;
}

const gltfOf = (T, row, exportMode, perturb) => {
  const acc = new T.G.MeshBuilder({ exportMode, captureGrid: true });
  const built = T.G.buildBloomInto(acc, stateFor(T.R.DEFAULTS, row), { below: null, capability: row.capability || null });
  if (perturb === 'halfWidth') {
    /* THE SECOND CONTROL, AND IT EXISTS BECAUSE THE FIRST CANNOT FIRE CLAUSE
       2. A mid-surface perturbation lands in the BIN chunk, so `--control`
       exercises clause 1 and SKIPS the clause this change is actually about —
       this repo's own `--control-mode` lesson, one tool later. `halfWidth` is
       carried in the JSON as `halfWidthMm` and nowhere else, so moving it
       moves the stripped JSON and leaves BIN alone. */
    for (const p of (built.petalsAll || [])) {
      const g = p && p.grid && p.grid[0];
      if (g && g.rows && g.rows.length) { g.rows[g.rows.length - 1].halfWidth += 1e-3; break; }
    }
  } else if (perturb) {
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
let binMoved = 0, jsonMoved = 0, stateMoved = 0, renormBad = 0;
const counter = { stripped: 0 };
const findings = [];
const perturbation = CONTROL_ONLY ? 'halfWidth' : (CONTROL ? true : false);
for (const row of ROWS) {
  for (const exportMode of [false, true]) {
    let a, b;
    try { a = gltfOf(A, row, exportMode, perturbation); } catch (e) { a = e; }
    try { b = gltfOf(B, row, exportMode, false); } catch (e) { b = e; }
    if (a instanceof Error && b instanceof Error) { threwBoth++; continue; }
    if (a instanceof Error || b instanceof Error) {
      findings.push(`${row.label} [${exportMode ? 'export' : 'live'}]: threw on ONE tree only — ${(a instanceof Error ? a : b).message}`);
      continue;
    }
    compared++;
    const tag = `${row.label} [${exportMode ? 'export' : 'live'}]`;

    if (CHANGE) {
      /* CLAUSE 1 — THE GEOMETRY DID NOT MOVE. The BIN chunk is every emitted
         position; a telemetry key cannot reach it, so this is the half that
         says /plot still draws the same curves. */
      const ca = chunksOf(a), cb = chunksOf(b);
      const binAt = sameBytes(ca.bin, cb.bin);
      if (binAt !== -1) { binMoved++; findings.push(`${tag}: clause 1 — the BIN chunk moved (${binAt === -2 ? `${ca.bin.length} bytes against ${cb.bin.length}` : `byte ${binAt}`})`); }

      /* CLAUSE 2 — AND THE JSON MOVED ONLY BY THE DECLARED KEY. */
      const baseText = jsonText(cb.json);
      if (JSON.stringify(JSON.parse(baseText)) !== baseText) renormBad++;
      const docA = strippedJson(ca.json, CHANGE, counter);
      const docB = strippedJson(cb.json, CHANGE, { stripped: 0 });
      const sf = stateFinding(docA, docB);
      if (sf) { stateMoved++; findings.push(`${tag}: clause 2a — ${sf}`); }
      /* The echo is compared above and then set aside, so the byte comparison
         below is about the GRID and nothing else. */
      if (docA.asset && docA.asset.extras) docA.asset.extras.state = null;
      if (docB.asset && docB.asset.extras) docB.asset.extras.state = null;
      const strippedA = JSON.stringify(docA), strippedB = JSON.stringify(docB);
      if (strippedA !== strippedB) {
        jsonMoved++;
        let k = 0; while (k < strippedA.length && k < strippedB.length && strippedA[k] === strippedB[k]) k++;
        findings.push(`${tag}: clause 2 — the JSON moved somewhere OTHER than the declared key, first at ${k}: `
          + `${JSON.stringify(strippedA.slice(Math.max(0, k - 40), k + 40))} against ${JSON.stringify(strippedB.slice(Math.max(0, k - 40), k + 40))}`);
      }
      if (binAt !== -1 || strippedA !== strippedB || sf) moved++;
      continue;
    }

    if (a.length !== b.length) { moved++; findings.push(`${tag}: the .glb is ${a.length} bytes against ${b.length}`); continue; }
    const at = sameBytes(a, b);
    if (at >= 0) { moved++; findings.push(`${tag}: byte ${at} of ${a.length} differs (${a[at]} against ${b[at]})`); }
  }
}

console.log(`grid-bytes: ${compared} builds compared over ${ROWS.length} rows, both modes` + (threwBoth ? ` (${threwBoth} threw on BOTH trees and carry no information)` : ''));

if (CHANGE) {
  /* THE NORMALISATION IS PROVED TO BE THE IDENTITY ON THE BASE, so the only
     thing clause 2 can be hiding is a formatting change THIS tree introduced —
     stated as a measured fact rather than as a caveat. */
  if (renormBad) {
    console.error(`grid-bytes: FAILED — the base tree's own JSON does not round-trip through parse/stringify on ${renormBad} of ${compared} builds, so clause 2's normalisation is not the identity and its result cannot be read.`);
    process.exit(1);
  }
  /* VACUOUS IF THE DECLARED KEY IS NOWHERE, because then clause 2 is the
     unchanged whole-file comparison wearing a new name. */
  if (!CONTROL && !CONTROL_ONLY && counter.stripped === 0) {
    console.error(`grid-bytes: FAILED — --change ${CHANGE} stripped nothing from any build, so clause 2 is vacuous.`);
    process.exit(1);
  }
  if (CONTROL) {
    if (binMoved === compared && compared > 0) console.log(`grid-bytes control: PASS — the 1e-3 mm mid-surface perturbation fired CLAUSE 1 on all ${binMoved} of ${compared} builds.`);
    else { console.error(`grid-bytes control: FAILED — clause 1 saw the perturbation on ${binMoved} of ${compared} builds.`); process.exit(1); }
  } else if (CONTROL_ONLY) {
    if (jsonMoved === compared && compared > 0) console.log(`grid-bytes control-only: PASS — the 1e-3 mm half-width perturbation fired CLAUSE 2 on all ${jsonMoved} of ${compared} builds (clause 1 saw ${binMoved}, which is the point: the two controls are two claims).`);
    else { console.error(`grid-bytes control-only: FAILED — clause 2 saw the perturbation on ${jsonMoved} of ${compared} builds; the clause this change is ABOUT has not been shown able to fail.`); process.exit(1); }
  } else if (moved) {
    console.error(`grid-bytes --change ${CHANGE}: FAILED — of ${compared} builds, ${binMoved} moved the BIN chunk, ${jsonMoved} moved the JSON outside the declared key and ${stateMoved} moved the state echo beyond the registry delta.`);
    for (const f of findings.slice(0, 25)) console.error('  ' + f);
    process.exit(1);
  } else {
    console.log(`grid-bytes --change ${CHANGE}: PASS — over ${compared} builds the BIN chunk is byte-identical to ${path.basename(BASE)} on EVERY one (the geometry /plot draws did not move); the JSON is byte-identical once the ${counter.stripped} declared \`material\` key(s) are stripped; and the state echo differs only by the registry delta measured from the two trees (added: ${ADDED_KEYS.join(', ') || 'none'}; removed: ${REMOVED_KEYS.join(', ') || 'none'}), every shared control carrying an equal value. Nothing else moved.`);
  }
  process.exit(0);
}

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
