/* ===================================================================
   verify-bloom-sphere-stem-bytes.mjs — THE SPHERE STEM CHANNEL'S BYTE
   PARTITION, AND THE CLAIM THAT ONLY THE OMITTED PETALS WENT.

     node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree> [--control] [--rows N]

   TWO CLAUSES, and the second is the one this feature is actually about.

   CLAUSE 1 — THE PARTITION. Every predeclared MOVER must move and every
   HOLDER must hold, both modes, every export float compared with `Object.is`
   so a -0 is distinguished. A feature that adds a part cannot claim "0 moved"
   over the whole matrix, and a tool that only checked the holders would pass
   on a feature that does nothing at all.

   CLAUSE 2 — ONLY THE OMITTED PETALS' BYTES DISAPPEARED. On every mover, the
   branch's stream must be EXACTLY the base's with the omitted petals' triangle
   blocks deleted and the stem's own triangles appended after the hub. Float for
   float. If any SURVIVING petal moved, the omission renumbered or re-placed
   something (the ruling's condition 2); if the HUB moved, it was sized from the
   survivors (condition 3). The partition names which.

   HOW THE BLOCKS ARE LOCATED, and it is not a guess: `buildBloomInto` emits the
   petals in slot order, then the hub, then the stem, and under SPHERE the
   androecium and the gynoecium are hidden AND inert so nothing follows. Each
   petal's own triangle count is read by building THAT petal, on the BASE tree's
   own module, into a throwaway accumulator — the same construction the channel
   itself uses, and legitimate for the same reason: the geometry does not depend
   on accumulator state. The tool REFUSES rather than guesses if the counts it
   derives do not add up to the base stream it is slicing.

   THE PARTITION IS PREDECLARED FROM THE BUILDER'S OWN RECORD, never from the
   control set (session 41's discipline): a row moves iff the builder actually
   reports a stem channel on it — a stem present on a sphere — which is the only
   thing on this branch that can move a byte. A row that sets `stemDiameter` to
   an extreme with `stemLength` 0 is correctly a HOLDER, and so is every sphere
   row that shipped before this session.

   THE CONTROL IS `--control`, required before quoting a pass from a changed
   harness: it perturbs one coordinate of every HOLDER by 1e-9 and requires the
   comparison to fail. `--rows N` narrows it — the control's claim is that this
   comparison DETECTS a perturbation, which any row it fires on establishes,
   where the PASS claim is about the whole matrix and must run it.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null;
const CONTROL = process.argv.includes('--control');
/* THE SECOND CONTROL, AND IT IS OWED RATHER THAN OPTIONAL. `--control`
   perturbs a HOLDER and exercises CLAUSE 1 only — it SKIPS clause 2 entirely,
   so the clause this whole feature is about would have been a log line that
   had never been shown able to fail. That is this repo's own recorded lesson
   ("a control that fires only the first leaves the second a log line",
   `verify-bloom-seam-bytes.mjs`'s `--control-mode`), and the hole was found by
   re-reading the tool after its first clean run rather than by a failure.
   `--control-only` moves the FIRST float of a MOVER's emitted stream, which is
   the first SURVIVING petal's first vertex and therefore by construction not
   in any omitted petal's block — exactly the condition-2 violation (a petal
   that was kept but moved) clause 2 exists to catch. Clause 1 stays clean
   under it, because a mover that moves is all clause 1 asks. */
const CONTROL_ONLY = process.argv.includes('--control-only');
if (!BASE || !fs.existsSync(BASE)) { console.error('verify-bloom-sphere-stem-bytes: need --base <worktree of the base commit>'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const GB = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { DEFAULTS: DB } = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const LIMIT = process.argv.includes('--rows') ? Number(process.argv[process.argv.indexOf('--rows') + 1]) : 0;
/* `--only <regex>` narrows to named rows while proving the TOOL on two of them
   before the grid — the charter's "debug an instrument on two rows". Like
   `--rows` it is never a pass, and the run says so. */
const ONLY = process.argv.includes('--only') ? new RegExp(process.argv[process.argv.indexOf('--only') + 1]) : null;
const rows = (LIMIT ? H.buildMatrix().slice(0, LIMIT) : H.buildMatrix()).filter((r) => !ONLY || ONLY.test(r.label));
const NARROWED = !!(LIMIT || ONLY);
const setOf = (r) => Object.fromEntries(r.set.map((x) => [x.id, isNaN(Number(x.value)) ? x.value : Number(x.value)]));

const build = (M, D, set, em) => { const acc = new M.MeshBuilder({ exportMode: em }); const b = M.buildBloomInto(acc, { ...D, ...set }); return { acc, b }; };

/* PREDECLARED FROM THE BUILDER'S OWN OWNERS, never from the control set: a row
   moves iff `stemPlan` reports a stem PRESENT on a head `footRing` reports as a
   SPHERE, which is `stemOmission`'s own guard read from the two objects that
   answer it rather than from the labels a row happens to carry. It is asked of
   both modes because the plan reads the accumulator's floor. Deliberately NOT a
   full `buildBloomInto` — footRing and stemPlan emit nothing, and running the
   whole builder twice more per row to read one flag costs half the tool's
   runtime on `ALL MAX` alone. */
function movesByRecord(set) {
  for (const em of [true, false]) {
    const acc = new G.MeshBuilder({ exportMode: em });
    const st = { ...DEFAULTS, ...set };
    const fr = G.footRing(st, acc);
    if (fr.sphereMode && G.stemPlan(st, fr.hub, acc).present) return true;
  }
  return false;
}

/* CLAUSE 2's slicer. Returns null (with a reason) rather than guessing. */
function onlyTheOmittedWent(set, em) {
  const { acc: accB, b: bb } = build(G, DEFAULTS, set, em);
  /* `--control-only`: a kept petal moves by 1e-9. See the flag's own note. */
  if (CONTROL_ONLY && accB.positions.length) accB.positions[0] += 1e-9;
  const { acc: accA, b: ba } = build(GB, DB, set, em);
  const om = new Set(bb.stemOmission.omitted);
  const K = ba.rings.length;
  if (bb.rings.length !== K) return `the two trees declare ${bb.rings.length} and ${K} descriptors — the SEQUENCE moved, not just which of it was built`;
  /* The base tree's per-petal triangle counts, built one at a time on its own
     module through its own whorl primitive — never a second copy of the
     azimuth law. */
  const frA = GB.footRing({ ...DB, ...set }, new GB.MeshBuilder({ exportMode: em }));
  const counts = new Array(K).fill(0);
  GB.buildWhorlInto({
    count: frA.rings.length, radius: (i) => frA.rings[i].radius, height: 0,
    sizeRamp: (i) => frA.rings[i].scale, angleRamp: (i) => frA.rings[i].tiltExtra,
    phase: frA.rings[0].phase, placement: ({ ...DB, ...set }).placement,
    blade: (slot) => { const p = new GB.MeshBuilder({ exportMode: em });
      GB.buildPetalInto(p, { ...DB, ...set }, frA.rings[slot.index], slot, null);
      counts[slot.index] = p.triangleCount; },
  });
  const petalTrisA = counts.reduce((a, c) => a + c, 0);
  const hubA = ba.hubBuilt.tris;
  if (petalTrisA + hubA !== accA.triangleCount) {
    return `the base stream is ${accA.triangleCount} triangles; ${petalTrisA} petals + ${hubA} hub is ${petalTrisA + hubA} — the slicer cannot locate the blocks, so no claim is made`;
  }
  /* Slice the base: keep the blocks of the slots the branch built. */
  const kept = [];
  let at = 0;
  for (let k = 0; k < K; k++) {
    const n = counts[k] * 9;
    if (!om.has(k)) for (let i = at; i < at + n; i++) kept.push(accA.positions[i]);
    at += n;
  }
  for (let i = at; i < accA.positions.length; i++) kept.push(accA.positions[i]);   // the hub
  /* And the branch, less its own stem, which is the only thing appended. */
  const stemTris = bb.stemBuilt ? bb.stemBuilt.tris : 0;
  const bLen = accB.positions.length - stemTris * 9;
  if (bLen !== kept.length) return `the branch carries ${bLen / 9} triangles beside its ${stemTris}-triangle stem; the base less the ${om.size} omitted petals is ${kept.length / 9}`;
  for (let i = 0; i < bLen; i++) {
    if (!Object.is(accB.positions[i], kept[i])) {
      const tri = Math.floor(i / 9);
      return `float ${i} (triangle ${tri} of ${bLen / 9}) differs: branch ${accB.positions[i]} against base ${kept[i]} — something other than the omitted petals moved`;
    }
  }
  return null;
}

let movers = 0, holders = 0; const badHold = [], badMove = [], badOnly = [];
let floats = 0;
for (const r of rows) {
  const set = setOf(r);
  const declaredMover = movesByRecord(set);
  let differs = false, n = 0;
  for (const em of [true, false]) {
    const a = build(GB, DB, set, em).acc.positions;
    const b = build(G, DEFAULTS, set, em).acc.positions;
    if (CONTROL && !declaredMover) b[0] += 1e-9;
    if (a.length !== b.length) { differs = true; n += Math.abs(a.length - b.length); continue; }
    for (let i = 0; i < a.length; i++) { floats++; if (!Object.is(a[i], b[i])) { differs = true; n++; } }
  }
  if (declaredMover) {
    movers++;
    if (!differs) badMove.push(r.label);
    if (!CONTROL) for (const em of [true, false]) {
      const why = onlyTheOmittedWent(set, em);
      if (why) badOnly.push(`${r.label} [${em ? 'EXPORT' : 'LIVE'}]: ${why}`);
    }
  } else { holders++; if (differs) badHold.push(`${r.label} (${n} floats)`); }
}
console.log(`BASE ${BASE}${NARROWED ? `  (${rows.length} NAMED ROWS ONLY — never a pass of the matrix)` : ''}`);
console.log(`${rows.length} rows · ${movers} predeclared MOVERS · ${holders} predeclared HOLDERS · ${floats.toLocaleString('en-US')} export floats compared with Object.is`);
console.log(`CLAUSE 1  movers that did NOT move: ${badMove.length}`);
for (const b of badMove) console.log('   ' + b);
console.log(`CLAUSE 1  holders that MOVED: ${badHold.length}`);
for (const b of badHold.slice(0, 12)) console.log('   ' + b);
if (!CONTROL) {
  console.log(`CLAUSE 2  movers where something OTHER than the omitted petals moved: ${badOnly.length}`);
  for (const b of badOnly.slice(0, 12)) console.log('   ' + b);
}
const pass = !badMove.length && !badHold.length && !badOnly.length;
/* THE TWO CONTROLS HAVE TWO VERDICTS, because each is about a different
   clause and a run that reported "the control fired" without saying WHICH
   would be the conflation this second control exists to undo. */
if (CONTROL_ONLY) {
  const fired = badOnly.length > 0;
  console.log(fired
    ? `\nCONTROL-ONLY OK — CLAUSE 2 reported ${badOnly.length} of ${movers * 2} (mover x mode) builds where a KEPT petal had moved`
    : '\nCONTROL-ONLY FAILED TO FIRE — clause 2 cannot see a kept petal moving, so its PASS is not evidence');
  if (!movers) console.log('   (and there were NO MOVERS in this row set, so the control was vacuous — narrow to rows that build a stem on a sphere)');
  process.exit(fired && movers ? 0 : 1);
}
console.log(CONTROL ? (pass ? '\nCONTROL FAILED TO FIRE — the comparison cannot see a 1e-9 perturbation, so neither clause is evidence' : '\nCONTROL OK — CLAUSE 1 detected the perturbation on the holders (clause 2 is NOT exercised here — that is `--control-only`)')
                    : (pass ? (NARROWED ? '\nOK on the named rows — NOT a pass of the matrix.' : '\nPASS — every predeclared mover moved, every holder held, and on every mover the ONLY floats that went are the omitted petals\' own.') : '\nFAIL'));
process.exit(CONTROL ? (pass ? 1 : 0) : (pass ? 0 : 1));
