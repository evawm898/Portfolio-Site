#!/usr/bin/env node
/* ===================================================================
   verify-bloom-stem-cut.mjs — THE MUST-FAIL FOR THE FLORIST'S CUT, clause by
   clause (Eva's ruling 7, stem session 3): SC0-SC3, the two cut arms of
   ST10 (the end face, the plug under the cut), ST1's cut band, ST12's cut
   ladder, and ID4's pedicel pin for the cut.

   WHY IT EXISTS BESIDE THE MUTANT TABLE. `verify-bloom-apex-mutants.mjs`
   carries three cut mutants, each required to redden the FAMILY it names —
   but a family name is all that table records, and the cut's clauses are
   several arms under three names. A geometry mutation that moves the slope
   moves SC3 and ST10 together, so no geometry mutant can show that SC2
   (the plan's own land) fires on its own, or that ST10's end-face clause and
   its plug clause are two witnesses rather than one. So this plants defects
   into REAL records and requires each arm to fire BY ITS OWN MESSAGE through
   the SHIPPED clause functions — `stemCutClauses`, `pedicelPinClauses` and
   the ST10 / ST1 / ST12 arms as `stemAssertions` runs them — i.e. the same
   path a real failure takes. Each plant must fire its own clause and NO
   OTHER (a plant that reddens two clauses is reported as such and fails the
   run), and each must change the record it plants into.

   HOW. The records are built in Node by the SHIPPED geometry on the widest
   cut stem (60 x 12 mm, hollow), Eva's 3 mm solid stem, the shipped stem
   with the control FLAT, a stem shorter than its own cut, and a noded cut
   stem, shaped exactly as `__bloomMetrics()` shapes them. The restatements
   are the harness's own.

   REFUSES A VACUOUS PLANT: every baseline must be SILENT; the cut baselines
   must carry a cut MADE with an emitted ring and a land of at least three
   vertices, the FLAT one no cut, the short one a cut not made; and every
   plant must change the record it plants into.

   Usage: node tools/verify-bloom-stem-cut.mjs
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DEFAULTS, stemCutClauses, restatedStemNodes, pedicelPinClauses, stemCountClause, stemPlugClauses, stemNodeClauses } from './bloom-harness.mjs';
import { evalPredicate } from '../bloom-registry.js';

const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);

function records(over) {
  const state = { ...DEFAULTS, stemLength: 60, stemDiameter: 12, ...over };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(state, acc);
  const plan = G.stemPlan(state, fr.hub, acc);
  const sacc = new G.MeshBuilder({ exportMode: true });
  const built = G.buildStemInto(sacc, plan);
  const S = {
    lengthMm: plan.lengthMm, outerR: plan.outerR, boreR: plan.boreR, wallMm: plan.wallMm,
    root: [0, 0, plan.rootZ], tip: [...G.stemAxisAt(plan, plan.lengthMm), plan.tipZ],
    stations: plan.stations.slice(), sides: plan.sides, voidStations: plan.voidStations ? plan.voidStations.slice() : null,
    tipPlugMm: plan.tipPlugMm, voidMm: plan.voidMm, voidTopZ: plan.voidTopZ, voidBottomZ: plan.voidBottomZ, solidBandMm: plan.solidBandMm,
    solidThrough: plan.solidThrough, topZ: plan.topZ, tipZ: plan.tipZ,
    cut: JSON.parse(JSON.stringify(plan.cut)), tubeStations: plan.tubeStations.slice(),
    emittedCut: built.emittedCut ? JSON.parse(JSON.stringify(built.emittedCut)) : null,
    emittedTopZ: built.emittedTopZ, emittedTipZ: built.emittedTipZ, emittedVoid: built.emittedVoid,
    emittedVoidTopZ: built.emittedVoidTopZ, emittedVoidBottomZ: built.emittedVoidBottomZ,
    directedMismatch: built.directedMismatch, emittedBottomAreaMm2: built.emittedBottomAreaMm2,
    emittedMaxR: built.emittedMaxR, emittedMinR: built.emittedMinR, emittedAxisOffset: built.emittedAxisOffset,
    nodeLaw: plan.nodeLaw ? JSON.parse(JSON.stringify(plan.nodeLaw)) : null,
    emittedRings: built.emittedRings ? built.emittedRings.map((r) => ({ ...r })) : null,
  };
  return { state, S, stemTris: built.tris, geoAbsent: G.stemCutAbsent(state), regLive: evalPredicate({ ref: 'stemCutLive' }, state) };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const runSC = (r, over = {}) => stemCutClauses({ S: r.S, ui: r.state, NL: restatedStemNodes(r.state), regLive: over.regLive ?? r.regLive, geoAbsent: over.geoAbsent ?? r.geoAbsent });
/* The ST arms the gates run on every row — ST1's count, ST10's block and
   ST12's ladder identity — called exactly as `stemAssertions` and
   `stemNodeClauses` call them. */
const runTen = (r, over = {}) => {
  const NL = restatedStemNodes(r.state);
  return [
    ...stemCountClause({ S: r.S, stemTris: over.stemTris ?? r.stemTris }),
    ...stemPlugClauses({ S: r.S, ui: r.state, NL }),
    ...stemNodeClauses({ S: r.S, ui: r.state, NL, regNodes: evalPredicate({ ref: 'stemNodesPresent' }, r.state), geoAbsent: G.stemNodesAbsent(r.state), hasLeaf: false, leaf: null }),
  ];
};

let fail = false;
const say = (s) => console.log(s);
const wide = records({});
const solid = records({ stemDiameter: 3 });
const flat = records({ stemDiameter: 6, stemCut: 'FLAT' });
const short = records({ stemLength: 1, stemDiameter: 3 });
const noded = records({ stemLength: 100, stemNodeSwelling: 1, stemNodeKink: 1 });

/* ---- the baselines: silent, and not vacuous ---- */
{
  const all = [['wide', wide], ['solid', solid], ['flat', flat], ['short', short], ['noded', noded]];
  for (const [name, r] of all) {
    const a = runSC(r), b = runTen(r);
    say(`BASELINE ${name}: SC ${a.length} message(s), ST ${b.length} message(s); cut ${r.S.cut.made ? 'MADE' : r.S.cut.on ? 'on, not made' : 'off'}, ring ${r.S.emittedCut ? r.S.emittedCut.ring.length : 0} vertices, land ${r.S.emittedCut ? r.S.emittedCut.landCount : 0}`);
    if (a.length || b.length) { for (const m of [...a, ...b]) say(`  *** ${m}`); fail = true; }
  }
  if (!wide.S.cut.made || !wide.S.emittedCut || wide.S.emittedCut.landCount < 3 || !solid.S.cut.made || !noded.S.cut.made || !noded.S.nodeLaw
      || flat.S.cut.on || flat.S.emittedCut || !short.S.cut.on || short.S.cut.made || !short.S.cut.inertShort || !(wide.S.voidMm > 0)) {
    say('VACUOUS: the baselines do not carry the cuts this control needs — refusing to report on the plants'); process.exit(1);
  }
}

/* A plant: returns { rec, over } and the ONE clause whose message must appear;
   every message produced is printed and any OTHER clause firing fails. */
const plants = [
  /* Each plant is chosen to be visible to ONE clause: the two SC0 sentences
     are separated by which side is moved, and the SC1 plant leaves the
     emitted ring alone so the "cut face on an uncut stem" sentence stays
     silent. */
  { arm: 'SC0 the two statements (registry says not live while the geometry says present)', want: 'SC0: the registry', make: () => ({ rec: wide, over: { regLive: false, geoAbsent: false } }) },
  { arm: 'SC0 the plan on while the geometry says absent', want: 'SC0: the plan says', make: () => ({ rec: wide, over: { regLive: false, geoAbsent: true } }) },
  { arm: 'SC1 made on a stem shorter than its cut', want: 'SC1: the plan says the cut is MADE', make: () => { const r = clone(short); r.S.cut.made = true; r.S.cut.inertShort = false; return { rec: r }; } },
  { arm: 'SC1 inertShort not told', want: 'SC1: the plan reports inertShort', make: () => { const r = clone(short); r.S.cut.inertShort = false; return { rec: r }; } },
  { arm: 'SC1 a cut face on a FLAT end', want: 'SC1: the builder emitted a cut face', make: () => { const r = clone(flat); r.S.emittedCut = clone(wide.S.emittedCut); return { rec: r }; } },
  { arm: "SC2 the plan's land a column DEEP (over the floor, so only the lattice clause speaks)", want: 'SC2: the plan draws a', make: () => { const r = clone(wide); r.S.cut.landIdx += 1; r.S.cut.landMm *= 1.4; return { rec: r }; } },
  { arm: "SC2 the plan's span off by a hair", want: "SC2: the plan's cut spans", make: () => { const r = clone(wide); r.S.cut.spanMm += 1e-6; return { rec: r }; } },
  { arm: 'SC3 no emitted ring', want: 'SC3: the builder reports no emitted cut ring', make: () => { const r = clone(wide); r.S.emittedCut = null; return { rec: r }; } },
  { arm: 'SC3 a cut vertex a micron off the plane', want: 'SC3: the emitted cut ring\'s column', make: () => { const r = clone(wide); r.S.emittedCut.ring[20][2] += 1e-6; return { rec: r }; } },
  { arm: "SC3 a cut vertex a micron off its own ring (the noded stem)", want: 'off its own depth\'s ring', make: () => { const r = clone(noded); r.S.emittedCut.ring[30][0] += 1e-6; return { rec: r }; } },
  { arm: 'SC3 a land vertex lifted (the land count)', want: 'emitted cut vertices sit on the land', only: true,
    make: () => { const r = clone(wide); const j = r.S.cut.landIdx; r.S.emittedCut.ring[j][2] += 1e-6; r.S.emittedCut.landCount -= 1; return { rec: r, also: ['SC3: the emitted cut ring\'s column'] }; } },
  { arm: "SC3 the builder's land count disagrees with its own ring", want: 'SC3: the builder counts', make: () => { const r = clone(wide); r.S.emittedCut.landCount += 1; return { rec: r }; } },
  /* ---- ST10's two cut arms, and ST1's and ST12's ---- */
  { arm: 'ST10 the cut face does not cover the section', want: 'ST10: the cut face\'s PROJECTED area', ten: true, make: () => { const r = clone(wide); r.S.emittedCut.projectedAreaMm2 *= 0.9; return { rec: r }; } },
  { arm: 'ST10 the cut face on too few triangles', want: 'ST10: the cut face is', ten: true, make: () => { const r = clone(wide); r.S.emittedCut.faceTris -= 1; return { rec: r }; } },
  { arm: 'ST10 the land not at the full length', want: 'ST10: the cut face\'s lowest vertex', ten: true, make: () => { const r = clone(wide); r.S.emittedCut.faceMinZ += 1e-6; return { rec: r }; } },
  { arm: 'ST10 the face reaching the wrong height', want: 'ST10: the cut face\'s highest vertex', ten: true, make: () => { const r = clone(wide); r.S.emittedCut.faceMaxZ += 1e-6; return { rec: r }; } },
  { arm: 'ST10 the plan asks the flat plug under a cut', want: 'ST10: the tip plug is', ten: true, make: () => { const r = clone(wide); r.S.tipPlugMm = 1.5; return { rec: r }; } },
  { arm: 'ST10 the bore emitted through the cut face (the plug built flat)', want: 'the bore opens through the cut face', ten: true, make: () => { const r = clone(wide); r.S.emittedVoidBottomZ = r.S.emittedTipZ + 1.5; return { rec: r }; } },
  { arm: 'ST10 no cut face reported under a cut', want: 'ST10: the plan says the stem ends on a florist\'s cut and the builder reports no cut face', ten: true, make: () => { const r = clone(wide); r.S.emittedCut = null; return { rec: r }; } },
  { arm: 'ST1 the cut band emitted as a full quad strip (two degenerate triangles kept)', want: 'ST1: the builder emitted', ten: true, make: () => ({ rec: wide, over: { stemTris: wide.stemTris + 2 } }) },
  { arm: 'ST12 the ladder under a cut with the short-point station a millimetre off (the count unmoved, so ST1 stays silent)', want: 'ST12: a stem with no nodes carries', ten: true, make: () => { const r = clone(wide); r.S.stations[1] -= 1; return { rec: r }; } },
];
for (const p of plants) {
  const { rec, over, also } = p.make();
  const msgs = p.ten ? runTen(rec, over || {}) : runSC(rec, over || {});
  const hit = msgs.filter((m) => m.includes(p.want));
  const others = msgs.filter((m) => !m.includes(p.want) && !(also || []).some((a) => m.includes(a)));
  const ok = hit.length > 0 && others.length === 0;
  say(`${ok ? 'FIRED ' : '***   '} ${p.arm}`);
  for (const m of msgs) say(`        ${m}`);
  if (!hit.length) { say(`        *** SILENT — expected a message containing "${p.want}"`); fail = true; }
  if (others.length) { say(`        *** ${others.length} OTHER clause(s) fired — a plant must fire its own witness and nothing else`); fail = true; }
}
/* ---- ID4's pin for the cut ---- */
{
  const F = { inflorescence: 'NONE', leafLength: 0, stemNodeSwelling: 0, stemNodeKink: 0, stemCut: 'FLAT' };
  const U = { stemPresent: true, stemNodeCount: 0, stemStationCount: 2, stemCutOn: false, stemCutMade: false, stemCutEmitted: false };
  const base = pedicelPinClauses(F, U);
  say(`BASELINE pedicel pin: ${base.length} message(s)`);
  if (base.length) { for (const m of base) say(`  *** ${m}`); fail = true; }
  for (const [arm, f, u, want] of [
    ['ID4 the floret state carries the cut', { ...F, stemCut: 'FLORIST' }, U, 'ID4: the floret was built with stemCut'],
    ['ID4 the pedicel\'s own stem emitted a cut face', F, { ...U, stemCutEmitted: true }, 'ID4: the floret\'s own stem EMITTED a cut face'],
    ['ID4 the pedicel\'s own stem declares a cut made', F, { ...U, stemCutMade: true }, 'declares a cut made'],
  ]) {
    const msgs = pedicelPinClauses(f, u);
    const hit = msgs.filter((m) => m.includes(want)), others = msgs.filter((m) => !m.includes(want));
    say(`${hit.length && !others.length ? 'FIRED ' : '***   '} ${arm}`);
    for (const m of msgs) say(`        ${m}`);
    if (!hit.length || others.length) fail = true;
  }
}
say(fail ? '\nSTEM CUT MUST-FAIL: FAILED — a plant stayed silent, fired another clause, or a baseline was red' : '\nSTEM CUT MUST-FAIL: OK — every arm of SC0-SC3, ST10\'s two cut arms, ST1\'s cut band, ST12\'s cut ladder and ID4\'s cut pin fires on its own plant, by its own message and no other, and every baseline is silent');
process.exit(fail ? 1 : 0);
