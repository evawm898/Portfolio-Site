#!/usr/bin/env node
/* ===================================================================
   verify-bloom-stem-nodes.mjs — THE MUST-FAIL FOR ST12, arm by arm (#299's
   port: the stem's nodes).

   WHY IT EXISTS BESIDE THE MUTANT TABLE. `verify-bloom-apex-mutants.mjs`
   carries six node mutants, each witnessed on the MUTATED module and each
   required to redden the family it names — but a family name is all that
   table records, and ST12 has FOUR arms: (a) the two statements, (b)
   prominence 0 is the identity at the plan, (c) the law off the emitted
   rings, (d) the phasing off the emitted rings. A mutation of the geometry
   moves (c) whenever it moves anything, so no geometry mutant can show that
   (d) fires on its own — and (d) is the arm that holds what Eva actually
   likes. So this plants defects into REAL records and requires each arm to
   fire, BY ITS OWN MESSAGE, through `stemNodeClauses` — the function
   `stemAssertions` calls on every row, i.e. the same path a real failure
   takes.

   HOW. The records are built in Node by the SHIPPED geometry on the flower's
   own setting (100 x 6 mm, three alternate leaves, prominence 0.48) and on
   the same stem at prominence 0, shaped exactly as `__bloomMetrics()` shapes
   them. The restated law (`restatedStemNodes`) is the harness's own.

   REFUSES A VACUOUS PLANT: the baseline must be SILENT, must carry a node
   law, at least ten emitted rings and three resolvable nodes; and every plant
   must change the record it plants into. A plant that fires the wrong arm,
   or none, fails the run.

   Usage: node tools/verify-bloom-stem-nodes.mjs
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DEFAULTS, stemNodeClauses, restatedStemNodes } from './bloom-harness.mjs';

const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);

function records(over) {
  const state = { ...DEFAULTS, stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 3, ...over };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(state, acc);
  const plan = G.stemPlan(state, fr.hub, acc);
  const built = G.buildStemInto(new G.MeshBuilder({ exportMode: true }), plan);
  const lp = G.leafPlan(state, plan, acc);
  const S = {
    root: [0, 0, plan.rootZ], stations: plan.stations.slice(),
    nodeLaw: plan.nodeLaw ? JSON.parse(JSON.stringify(plan.nodeLaw)) : null,
    emittedRings: built.emittedRings ? built.emittedRings.map((r) => ({ ...r })) : null,
  };
  const leaf = { nodeDepthsMm: lp.nodeDepthsMm.slice(), azimuths: lp.azimuths.map((a) => a.slice()) };
  return { state, S, leaf, geoAbsent: G.stemNodesAbsent(state) };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const run = (r, NL, over = {}) => stemNodeClauses({ S: r.S, ui: r.state, NL, regNodes: over.regNodes ?? !r.geoAbsent, geoAbsent: over.geoAbsent ?? r.geoAbsent, hasLeaf: true });

let fail = false;
const say = (s) => console.log(s);
const on = records({ stemNodeProminence: 0.48 });
const off = records({ stemNodeProminence: 0 });
const NLon = restatedStemNodes(on.state, on.leaf);
const NLoff = restatedStemNodes(off.state, off.leaf);

/* ---- the baseline: silent, and not vacuous ---- */
{
  const a = run(on, NLon), b = run(off, NLoff);
  const resolvable = NLon ? NLon.nodes.filter((n, k, all) =>
    (k === 0 || n.s - all[k - 1].s >= 2 * NLon.w) && (k === all.length - 1 || all[k + 1].s - n.s >= 2 * NLon.w)).length : 0;
  say(`BASELINE: noded ${a.length} message(s), prominence 0 ${b.length} message(s); law ${on.S.nodeLaw ? 'declared' : 'MISSING'}, ${on.S.emittedRings ? on.S.emittedRings.length : 0} emitted rings, ${resolvable} resolvable node(s), restated off-state law ${NLoff ? 'PRESENT' : 'null'}`);
  if (a.length || b.length) { for (const m of [...a, ...b]) say(`  *** ${m}`); fail = true; }
  if (!NLon || !on.S.nodeLaw || !on.S.emittedRings || on.S.emittedRings.length < 10 || resolvable < 3 || NLoff) {
    say('VACUOUS: the baseline does not carry the noded stem this control needs — refusing to report on the plants'); process.exit(1);
  }
}

/* A plant: a function that returns { rec, NL, over } and the arm whose message
   must appear. Every message the plant produces is printed — the red is the
   deliverable, not a count. */
const plants = [
  { arm: '(a) the two statements', want: 'stemNodesPresent says', make: () => ({ rec: on, NL: NLon, over: { geoAbsent: true } }) },
  { arm: '(b) identity: a law declared at prominence 0', want: 'must be the identity', make: () => { const r = clone(off); r.S.nodeLaw = on.S.nodeLaw; return { rec: r, NL: NLoff }; } },
  { arm: '(b) identity: noded rings at prominence 0', want: 'noded arm ran where the straight one should have', make: () => { const r = clone(off); r.S.emittedRings = on.S.emittedRings; return { rec: r, NL: NLoff }; } },
  { arm: '(b) identity: a ladder at prominence 0', want: 'station ladder where', make: () => { const r = clone(off); r.S.stations = [0, 50, 100]; return { rec: r, NL: NLoff }; } },
  { arm: '(c) the control never reached the stem', want: 'the control never reached the stem', make: () => { const r = clone(on); r.S.nodeLaw = null; return { rec: r, NL: NLon }; } },
  { arm: '(c) no noded rings reported', want: 'reports no noded rings', make: () => { const r = clone(on); r.S.emittedRings = null; return { rec: r, NL: NLon }; } },
  { arm: "(c) a ring's centre a micron off", want: "ring's centre stands", make: () => { const r = clone(on); r.S.emittedRings[7].cx += 1e-6; return { rec: r, NL: NLon }; } },
  { arm: "(c) a ring's radius a micron off", want: "ring's radius is", make: () => { const r = clone(on); const g = r.S.emittedRings.find((q) => q.which === 'outer' && q !== r.S.emittedRings[0]); g.r += 1e-6; return { rec: r, NL: NLon }; } },
  /* (d) ALONE — the reference and the artefact moved TOGETHER, so (c) cannot
     see it: every ring's centre is re-drawn from a law whose kinks start a
     whole ramp ABOVE their nodes, and the restated law handed in is that same
     moved law. Only the phasing arm, reading the node depths against where the
     emitted line bends hardest, can say the stem no longer turns at its joint. */
  { arm: '(d) phasing: the bend peaks above its node (reference moved with it)', want: 'bend peaks between depths', only: true,
    make: () => {
      const r = clone(on), rootZ = r.S.root[2];
      const moved = { ...NLon, axis: (s) => NLon.axis(s + NLon.ramp) };
      for (const g of r.S.emittedRings) { const c = moved.axis(rootZ - g.z); g.cx = c[0]; g.cy = c[1]; }
      return { rec: r, NL: moved };
    } },
  { arm: '(d) phasing: the swelling widest away from its node (reference moved with it)', want: 'emitted swelling is widest', only: true,
    make: () => {
      const r = clone(on), rootZ = r.S.root[2];
      const moved = { ...NLon, radius: (s) => NLon.radius(s - 0.8 * NLon.w) };
      for (const g of r.S.emittedRings) if (g.which === 'outer') g.r = moved.radius(rootZ - g.z);
      return { rec: r, NL: moved };
    } },
];
for (const p of plants) {
  const { rec, NL, over } = p.make();
  const got = run(rec, NL, over || {});
  const hit = got.filter((m) => m.includes(p.want));
  const other = got.filter((m) => !m.includes(p.want));
  const ok = hit.length > 0 && (!p.only || other.length === 0);
  say(`${ok ? 'FIRED ' : '*** MISSED'} ${p.arm}`);
  for (const m of got) say(`    ${m}`);
  if (!got.length) say('    (nothing — the clause was silent)');
  if (!ok) fail = true;
}
say(fail ? '\nSTEM NODES MUST-FAIL: FAILED' : `\nSTEM NODES MUST-FAIL: every one of ST12's four arms fired on its own plant, through stemNodeClauses — ${plants.length} plants, baseline silent`);
process.exit(fail ? 1 : 0);
