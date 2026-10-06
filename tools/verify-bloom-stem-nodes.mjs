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
import { ROOT, DEFAULTS, stemNodeClauses, restatedStemNodes, pedicelPinClauses } from './bloom-harness.mjs';

const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);

function records(over) {
  const state = { ...DEFAULTS, stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 3, ...over };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(state, acc);
  const plan = G.stemPlan(state, fr.hub, acc);
  const built = G.buildStemInto(new G.MeshBuilder({ exportMode: true }), plan);
  const lp = G.leafPlan(state, plan, acc);
  const S = {
    root: [0, 0, plan.rootZ], stations: plan.stations.slice(), sides: plan.sides,
    nodeLaw: plan.nodeLaw ? JSON.parse(JSON.stringify(plan.nodeLaw)) : null,
    emittedRings: built.emittedRings ? built.emittedRings.map((r) => ({ ...r })) : null,
  };
  const leaf = lp.present ? { nodeDepthsMm: lp.nodeDepthsMm.slice(), azimuths: lp.azimuths.map((a) => a.slice()) } : null;
  return { state, S, leaf, geoAbsent: G.stemNodesAbsent(state) };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const run = (r, NL, over = {}) => stemNodeClauses({ S: r.S, ui: r.state, NL, regNodes: over.regNodes ?? !r.geoAbsent, geoAbsent: over.geoAbsent ?? r.geoAbsent,
  hasLeaf: over.hasLeaf ?? !!r.leaf, leaf: 'leaf' in over ? over.leaf : r.leaf });

let fail = false;
const say = (s) => console.log(s);
const on = records({ stemNodeProminence: 0.48 });
const off = records({ stemNodeProminence: 0 });
const NLon = restatedStemNodes(on.state);
const NLoff = restatedStemNodes(off.state);
/* RULING 6 (stem session 2): a BARE stem — golden-angle nodes, no leaf record
   — and a bare stem whose eight nodes MERGE (60 mm, sqrt(2) spindles), the
   state the (f) arm speaks on. */
const bare = records({ stemNodeProminence: 0.48, leafLength: 0 });
const NLbare = restatedStemNodes(bare.state);
const merged = records({ stemNodeProminence: 0.48, leafLength: 0, stemLength: 60, leafNodes: 8 });
const NLmerged = restatedStemNodes(merged.state);

/* ---- the baseline: silent, and not vacuous ---- */
{
  const a = run(on, NLon), b = run(off, NLoff);
  const resolvable = NLon ? NLon.nodes.filter((n, k, all) =>
    (k === 0 || n.s - all[k - 1].s >= 2 * NLon.w) && (k === all.length - 1 || all[k + 1].s - n.s >= 2 * NLon.w)).length : 0;
  say(`BASELINE: noded ${a.length} message(s), prominence 0 ${b.length} message(s); law ${on.S.nodeLaw ? 'declared' : 'MISSING'}, ${on.S.emittedRings ? on.S.emittedRings.length : 0} emitted rings, ${resolvable} resolvable node(s), restated off-state law ${NLoff ? 'PRESENT' : 'null'}`);
  if (a.length || b.length) { for (const m of [...a, ...b]) say(`  *** ${m}`); fail = true; }
  const c = run(bare, NLbare), d = run(merged, NLmerged);
  say(`BASELINE (bare): golden-angle stem ${c.length} message(s), merged stem ${d.length} message(s); bare law ${bare.S.nodeLaw ? 'declared' : 'MISSING'} with leaf record ${bare.leaf ? 'PRESENT' : 'absent'}, merged pairs ${merged.S.nodeLaw ? merged.S.nodeLaw.mergedPairs.length : 'n/a'}`);
  if (c.length || d.length) { for (const m of [...c, ...d]) say(`  *** ${m}`); fail = true; }
  if (!NLbare || !bare.S.nodeLaw || bare.leaf || !NLbare.bare || !merged.S.nodeLaw || merged.S.nodeLaw.mergedPairs.length < 2 || on.S.nodeLaw.mergedPairs.length !== 0) {
    say('VACUOUS: the bare baseline is not a bare noded stem, or the merged one does not merge, or the leafed one does — refusing to report on the plants'); process.exit(1);
  }
  if (!NLon || !on.S.nodeLaw || !on.S.emittedRings || on.S.emittedRings.length < 10 || resolvable < 3 || NLoff) {
    say('VACUOUS: the baseline does not carry the noded stem this control needs — refusing to report on the plants'); process.exit(1);
  }
}

/* A plant: a function that returns { rec, NL, over } and the arm whose message
   must appear. Every message the plant produces is printed — the red is the
   deliverable, not a count. */
/* THE RADIUS PLANT'S RING, BY NAME (gate-hygiene session, Oct 6): emitted
   ring 1, an OUTER ring. It was the first outer ring after ring 0 in emission
   order, so a reordering of the emitted rings re-pointed it and a stem with no
   such ring crashed on a TypeError instead of refusing. Named beside the
   centre plant's own fixed ring 7, and checked. */
const NAMED_RADIUS_RING = 1;
const namedRadiusRing = (r) => {
  const g = r.S.emittedRings[NAMED_RADIUS_RING];
  if (!g || g.which !== 'outer') { say(`REFUSED: the radius plant's named ring ${NAMED_RADIUS_RING} is ${g ? `a "${g.which}" ring` : 'absent'}, not an OUTER ring — name another`); process.exit(2); }
  return g;
};
const plants = [
  { arm: '(a) the two statements', want: 'stemNodesPresent says', make: () => ({ rec: on, NL: NLon, over: { geoAbsent: true } }) },
  { arm: '(b) identity: a law declared at prominence 0', want: 'must be the identity', make: () => { const r = clone(off); r.S.nodeLaw = on.S.nodeLaw; return { rec: r, NL: NLoff }; } },
  { arm: '(b) identity: noded rings at prominence 0', want: 'noded arm ran where the straight one should have', make: () => { const r = clone(off); r.S.emittedRings = on.S.emittedRings; return { rec: r, NL: NLoff }; } },
  { arm: '(b) identity: a ladder at prominence 0', want: 'station ladder [', make: () => { const r = clone(off); r.S.stations = [0, 50, 100]; return { rec: r, NL: NLoff }; } },
  { arm: '(c) the control never reached the stem', want: 'the control never reached the stem', make: () => { const r = clone(on); r.S.nodeLaw = null; return { rec: r, NL: NLon }; } },
  { arm: '(c) no noded rings reported', want: 'reports no noded rings', make: () => { const r = clone(on); r.S.emittedRings = null; return { rec: r, NL: NLon }; } },
  { arm: "(c) a ring's centre a micron off", want: "ring's centre stands", make: () => { const r = clone(on); r.S.emittedRings[7].cx += 1e-6; return { rec: r, NL: NLon }; } },
  { arm: "(c) a ring's radius a micron off", want: "ring's radius is", make: () => { const r = clone(on); const g = namedRadiusRing(r); g.r += 1e-6; return { rec: r, NL: NLon }; } },
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
  /* ---- RULING 6's ARMS (stem session 2) ---- */
  { arm: '(c) bare: the bare stem kinks by the LEAF law (the golden angle was not applied)', want: "ring's centre stands",
    make: () => { const r = clone(bare), rootZ = r.S.root[2];
      const leafLaw = { ...NLbare, nodes: NLbare.nodes.map((n, i) => { const az = i * Math.PI + Math.PI; return { ...n, az, dx: Math.cos(az), dy: Math.sin(az) }; }) };
      const ax = (s) => { let x = 0, y = 0; for (const n of leafLaw.nodes) { const p = s - n.s; if (!(p > 0)) continue; const q = Math.min(1, p / NLbare.ramp), d = NLbare.slope * p * q * q * (3 - 2 * q); x += n.dx * d; y += n.dy * d; } return [x, y]; };
      for (const g of r.S.emittedRings) { const c = ax(rootZ - g.z); g.cx = c[0]; g.cy = c[1]; }
      return { rec: r, NL: NLbare }; } },
  { arm: "(e) a leafed stem's nodes are not its leaves' nodes", want: "are not the leaves' own nodes", only: true,
    make: () => { const r = clone(on); r.leaf.nodeDepthsMm[1] += 0.5; return { rec: r, NL: NLon }; } },
  { arm: '(e) a leafed stem with no leaf record', want: 'the leaf builder reports no node record', only: true,
    make: () => ({ rec: on, NL: NLon, over: { leaf: null } }) },
  { arm: '(e) a bare stem reporting a leaf record (the two laws met on one stem)', want: 'must never meet on one stem', only: true,
    make: () => ({ rec: bare, NL: NLbare, over: { hasLeaf: true } }) },
  { arm: '(f) merged swellings not reported', want: 'reports merged swellings at node pair', only: true,
    make: () => { const r = clone(merged); r.S.nodeLaw.mergedPairs = []; return { rec: r, NL: NLmerged }; } },
  { arm: '(f) merged swellings reported where none merge', want: 'reports merged swellings at node pair', only: true,
    make: () => { const r = clone(on); r.S.nodeLaw.mergedPairs = [{ a: 0, b: 1, gapMm: 1 }]; return { rec: r, NL: NLon }; } },
  { arm: '(f) no merge report at all', want: 'reports no `mergedPairs`', only: true,
    make: () => { const r = clone(merged); delete r.S.nodeLaw.mergedPairs; return { rec: r, NL: NLmerged }; } },
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
/* ---- ID4's PEDICEL PIN, clause by clause (ruling 6) — real records from a
   raceme whose head asks for prominence 1, shaped as `__bloomMetrics()`
   shapes `inflorescenceBuilt`, through `pedicelPinClauses`. ---- */
{
  const st = { ...DEFAULTS, stemLength: 120, stemDiameter: 6, inflorescence: 'RACEME', stemNodeProminence: 1 };
  const b = G.buildBloomInto(new G.MeshBuilder({ exportMode: true }), st);
  const ib = b.inflorescenceBuilt, us = ib && ib.unit && ib.unit.stem;
  const F = ib ? { ...ib.floretState } : null;
  const U = us ? { stemPresent: !!us.present, stemNodeCount: us.nodeLaw ? us.nodeLaw.nodes.length : 0, stemStationCount: us.stations.length } : null;
  const base = F && U ? pedicelPinClauses(F, U) : ['no raceme record'];
  say(`BASELINE (pedicel pin): ${base.length} message(s); floret prominence ${F && F.stemNodeProminence}, floret stem ${U && U.stemNodeCount} node(s) on ${U && U.stemStationCount} stations`);
  if (base.length || !F || !U || !U.stemPresent) { for (const m of base) say(`  *** ${m}`); say('VACUOUS or RED: the raceme baseline is not a pinned pedicel'); fail = true; }
  else {
    for (const p of [
      { arm: 'ID4 pin: the floret built from an unpinned prominence', want: 'stemNodeProminence = 1', F: { ...F, stemNodeProminence: 1 }, U },
      { arm: "ID4 pin: the floret's own stem carries nodes", want: "floret's own stem was built with 3 node(s)", F, U: { ...U, stemNodeCount: 3, stemStationCount: 70 } },
    ]) {
      const got = pedicelPinClauses(p.F, p.U), ok = got.length === 1 && got[0].includes(p.want);
      say(`${ok ? 'FIRED ' : '*** MISSED'} ${p.arm}`); for (const m of got) say(`    ${m}`);
      if (!ok) fail = true;
    }
  }
}
say(fail ? '\nSTEM NODES MUST-FAIL: FAILED' : `\nSTEM NODES MUST-FAIL: every one of ST12's six arms fired on its own plant, through stemNodeClauses — ${plants.length} plants, baseline silent — and ID4's two pedicel-pin clauses each fired alone on its own plant`);
process.exit(fail ? 1 : 0);
