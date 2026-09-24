/* ===================================================================
   verify-bloom-infill-bytes.mjs — 0 BYTES MOVED AT THE GUARD (S3).

     node tools/verify-bloom-infill-bytes.mjs --base <worktree> [--quick]
     node tools/verify-bloom-infill-bytes.mjs --base <worktree> --control
     node tools/verify-bloom-infill-bytes.mjs --base <worktree> --control-only

   WHAT IT CLAIMS. Eva's ruling 1 is that the infill SHIPS OFF, and "off" in
   this project means BIT-IDENTICAL and not "close enough": with
   `petalInfill` NONE every float of the exported stream and every value of the
   captured grid is the base tree's own, positionally, under `Object.is`.

   IT IS A CONSTRUCTION AND IT IS MEASURED ANYWAY. At the guard the petal takes
   today's path BY BRANCH — `infillIsAbsent(ps)` is true, no plan is built and
   `emitPanel` is called exactly as it was — so the bytes cannot move. That is
   an argument; this is a number. The project's own rule is that by-construction
   is the reason to expect a result and never a substitute for taking it.

   THE PARTITION IS PREDECLARED FROM THE GUARD PREDICATE, NOT FROM A LIST OF
   LABELS, and is checked in BOTH directions: a state is a MOVER iff
   `infillIsAbsent` is false on it, and every other state is a HOLDER. The
   movers are built on this tree alone (the base tree cannot build them — it
   has no `petalInfill` key, so the control is an extra the registry drops),
   and what is asserted about them is that they MOVED: a mover that held would
   mean the guard reached nothing.

   THE SECOND CLAUSE IS THE ONE THE FEATURE IS ABOUT. Clause 1 is the export
   stream; clause 2 is the CAPTURED GRID, including the new material mask —
   because a build whose triangles are identical and whose captured mask is not
   would pass clause 1 and break `measureWall`, the combination gate and
   `/plot` in silence. A control that fires only clause 1 leaves clause 2
   exactly what this project calls a log line.

   THREE CLAUSES, AND THE THIRD IS THE MASK'S. Clause 1 is the export stream,
   clause 2 the captured grid's existing values, clause 3 the MATERIAL MASK —
   which is a NEW channel the base tree does not carry, so it cannot be in a
   positional comparison against it (folding it in reports 4,720 "moved" values
   on a build whose mesh is identical, which is a number that means nothing).
   What is asserted about it is its own statement: on a HOLDER every station is
   material, and on a MOVER some station is not.

   TWO CONTROLS. `--control` perturbs a HOLDER's first export float, its first
   captured mid coordinate and one station of its mask, and requires all three
   clauses to report; `--control-only` fills a MOVER's mask in and requires
   clause 3 to report, which is the only thing that shows the mask is asserted
   rather than printed.

   WHAT IT DOES NOT COVER, in its own header:
     - THE STATES ARE THE COVERAGE. It is not the matrix; block 39 and the
       full-matrix byte tool (`verify-bloom-surface-bytes.mjs --movers`) are
       what carry that claim.
     - IT IS NODE-SIDE and applies the control sets raw, so it inherits
       nothing about whether a state is reachable through the UI.
   =================================================================== */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
const CONTROL = process.argv.includes('--control');
const CONTROL_ONLY = process.argv.includes('--control-only');

/* THE STATES. Every axis the guard could plausibly leak through: the shipping
   default, the form corners, both ends of the width and the length, the tip
   shapes, the arrangements, a sepal whorl (ruling 4 pins the infill off there)
   and the two families the plan REFUSES. Plus, as MOVERS, the guard on. */
const HOLDERS = [
  ['DEFAULT', {}],
  ['petalCup 1.2', { petalCup: 1.2 }],
  ['ALL FORM MAX', { petalCup: 1.2, petalCupGradient: 1, petalRoll: 330, petalTwist: 180, petalSpineCurl: 360 }],
  ['petalWidth 8', { petalWidth: 8 }],
  ['petalWidth 30', { petalWidth: 30 }],
  ['petalLength 20', { petalLength: 20 }],
  ['petalTipShape 3', { petalTipShape: 3 }],
  ['lobes 5 x 0.6', { lobeDepth: 0.6, lobeCount: 5 }],
  ['fringe 4', { petalTipEnd: 1, fringeCount: 4 }],
  ['3 layers', { layerCount: 3 }],
  ['CONTINUOUS', { placement: 'CONTINUOUS' }],
  ['SPHERE', { placement: 'CONTINUOUS', hubShape: 'SPHERE' }],
  ['sepals 8', { sepalCount: 8 }],
  ['a stem and leaves', { stemLength: 60, leafLength: 40 }],
  ['ALL MAX-ish (the blanket corner is a CHOICE away)', { petalCount: 40, layerCount: 6 }],
];
const MOVERS = [
  ['infill ON', { petalInfill: 'VORONOI' }],
  ['infill ON x density 8', { petalInfill: 'VORONOI', infillDensity: 8 }],
  ['infill ON x cup x curl', { petalInfill: 'VORONOI', petalCup: 1.2, petalSpineCurl: 360 }],
];
const QUICK_RE = /DEFAULT|ALL FORM MAX|SPHERE|infill ON$/;

function streamOf(G, DEFAULTS, set, exportMode) {
  const acc = new G.MeshBuilder({ exportMode, captureGrid: true });
  const built = G.buildBloomInto(acc, { ...DEFAULTS, ...set });
  /* THE CAPTURED GRID AS A FLAT LIST OF VALUES, with the material mask in it.
     `p<N>.built` is in the stream because a slot DECLARED and NOT BUILT is a
     thing this project's own instruments have been caught skipping — a skip
     defines the subject so as to exclude the case it doubts. */
  const grid = [], mask = [];
  const petals = built.petalsAll || [];
  for (let p = 0; p < petals.length; p++) {
    grid.push(`p${p}.built:${petals[p] ? 1 : 0}`);
    const g = petals[p] && petals[p].grid;
    if (!g) continue;
    for (let q = 0; q < g.length; q++) {
      const pan = g[q];
      grid.push(`p${p}.${q}.label:${pan.label}`, pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        grid.push(r.row, r.u, r.halfWidth, r.thickness, r.v.length);
        for (let j = 0; j < r.v.length; j++) {
          grid.push(r.v[j], r.mid[j][0], r.mid[j][1], r.mid[j][2], r.normal[j][0], r.normal[j][1], r.normal[j][2]);
          /* THE MATERIAL MASK IS ITS OWN STREAM AND NOT PART OF THE POSITIONAL
             COMPARISON, because the BASE TREE HAS NONE — a new channel cannot
             be compared positionally against a tree that does not carry it, and
             folding it in would report 4,720 "moved" values on a build whose
             mesh is identical, which is a number that means nothing. What is
             asserted about it instead is clause 3: on a HOLDER every station is
             material, which is the mask's own statement of "the guard is off".*/
          mask.push(r.material && r.material[j] ? 1 : 0);
        }
      }
    }
  }
  return { pos: acc.positions, grid, mask, tris: acc.triangleCount };
}

async function main() {
  const base = arg('--base', null);
  if (!base) { console.log('usage: --base <worktree of the base commit>'); process.exitCode = 1; return; }
  const bg = path.resolve(base, 'bloom-geometry.js');
  const br = path.resolve(base, 'bloom-registry.js');
  if (!existsSync(bg) || !existsSync(br)) { console.log(`--base ${base} is not a tree with bloom-geometry.js and bloom-registry.js in it`); process.exitCode = 1; return; }
  const G = await import('../bloom-geometry.js');
  const R = await import('../bloom-registry.js');
  const BG = await import(pathToFileURL(bg).href);
  const BR = await import(pathToFileURL(br).href);

  /* A VACUOUS RUN IS A FAILURE. The base tree must NOT carry the guard — if it
     does, this is comparing a tree against itself and the whole claim is
     empty. */
  if (BR.DEFAULTS.petalInfill !== undefined) {
    console.log('HARNESS INVALID — the BASE tree already declares `petalInfill`, so "0 moved at the guard" would be a comparison of a tree with itself');
    console.log('FAIL'); process.exitCode = 1; return;
  }
  console.log(`0 BYTES MOVED AT THE GUARD — against ${base}. The base tree carries no \`petalInfill\`, which is what makes this a claim.`);
  console.log('');

  const holders = QUICK ? HOLDERS.filter(([n]) => QUICK_RE.test(n)) : HOLDERS;
  const movers = QUICK ? MOVERS.filter(([n]) => QUICK_RE.test(n)) : MOVERS;
  let fails = 0, exportFloats = 0, gridValues = 0;
  let c1 = 0, c2 = 0, c3 = 0;

  console.log('state                                             mode      export floats moved   grid values moved   mask holes');
  for (const [name, set] of holders) {
    for (const mode of ['export', 'live']) {
      const a = streamOf(G, R.DEFAULTS, set, mode === 'export');
      const b = streamOf(BG, BR.DEFAULTS, set, mode === 'export');
      if (CONTROL && name === holders[0][0] && mode === 'export') { a.pos[0] += 1e-9; a.grid[a.grid.findIndex((v) => typeof v === 'number') + 1] += 1e-9; a.mask[0] = 0; }
      let movedPos = a.pos.length !== b.pos.length ? -1 : 0;
      if (movedPos === 0) for (let i = 0; i < a.pos.length; i++) if (!Object.is(a.pos[i], b.pos[i])) movedPos++;
      let movedGrid = a.grid.length !== b.grid.length ? -1 : 0;
      if (movedGrid === 0) for (let i = 0; i < a.grid.length; i++) if (!Object.is(a.grid[i], b.grid[i])) movedGrid++;
      exportFloats += a.pos.length; gridValues += a.grid.length;
      const holes = a.mask.filter((m) => !m).length;
      if (movedPos !== 0) { c1++; fails++; }
      if (movedGrid !== 0) { c2++; fails++; }
      if (holes !== 0) { c3++; fails++; }
      console.log(`${name.padEnd(49)} ${mode.padEnd(8)} ${String(movedPos === -1 ? 'LENGTH' : movedPos).padStart(19)}   ${String(movedGrid === -1 ? 'LENGTH' : movedGrid).padStart(17)}   ${String(holes).padStart(10)}${movedPos || movedGrid || holes ? '   <<< MOVED' : ''}`);
    }
  }

  console.log('');
  console.log('MOVERS — built on this tree only (the base has no guard to turn on); what is asserted is that they MOVED.');
  for (const [name, set] of movers) {
    const a = streamOf(G, R.DEFAULTS, set, true);
    const off = streamOf(G, R.DEFAULTS, { ...set, petalInfill: 'NONE' }, true);
    let moved = a.pos.length !== off.pos.length;
    if (!moved) for (let i = 0; i < a.pos.length; i++) if (!Object.is(a.pos[i], off.pos[i])) { moved = true; break; }
    let holes = a.mask.filter((m) => !m).length;
    if (CONTROL_ONLY && name === movers[0][0]) {
      /* THE MASK'S OWN CONTROL: fill the mask in and require clause 3 to see
         it, which is the only thing that shows the mask is asserted at all. */
      holes = 0;
    }
    const ok = moved && holes > 0;
    if (!ok) { fails++; if (!(holes > 0)) c3++; }
    console.log(`${name.padEnd(49)} ${moved ? 'MOVED' : 'HELD  <<<'} · ${a.tris} tris against ${off.tris} with the guard off · the mask calls ${holes} stations a hole${holes ? '' : '  <<< a mover whose mask is all material is a mask nobody wrote'}`);
  }

  console.log('');
  console.log(`${holders.length} HOLDERS x 2 modes over ${exportFloats.toLocaleString('en-US')} export floats and ${gridValues.toLocaleString('en-US')} captured-grid values positionally under Object.is, plus the material mask asserted in its own clause.`);
  if (CONTROL || CONTROL_ONLY) {
    const got = `clause 1 fired on ${c1} build(s), clause 2 on ${c2}, clause 3 on ${c3}`;
    const ok = CONTROL ? (c1 >= 1 && c2 >= 1 && c3 >= 1) : c3 >= 1;
    console.log(`CONTROL: ${got} — ${ok ? 'both clauses are shown able to fail' : 'A CLAUSE DID NOT FIRE'}`);
    if (!ok) { console.log('FAIL — the control did not fire every clause it exercises'); process.exitCode = 1; return; }
    console.log(CONTROL ? 'PASS (control) — the perturbations were detected; the run above is EXPECTED to report moves.' : 'PASS (control-only)');
    return;
  }
  console.log(fails === 0 ? 'PASS — 0 floats moved, 0 captured-grid values moved, and every station of every holder is material.' : `FAIL — ${fails} finding(s)`);
  if (fails) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
