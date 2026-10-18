#!/usr/bin/env node
/* ===================================================================
   verify-bloom-outline-asym-equal.mjs — AN ASYMMETRIC OUTLINE WITH EQUAL
   HALVES IS THE SYMMETRIC ONE, TO THE BIT (F6-asym; read
   docs/bloom-outline-curve-asym-outcome.md).

   THE CLAIM. Under CURVE mode the outline is either one half mirrored about the
   midrib (Symmetric) or two independent half-curves (Asymmetric). With the
   right half equal to the left, the two-sided build must be the symmetric one
   float for float — the exported stream positionally under `Object.is` and the
   captured mid-surface — in BOTH modes. Every combination of the halves in the
   geometry (a max, a min, a mean, a deduplicated union, a ratio of one) is
   chosen so this holds by construction; this tool is what says it does.

   WHY IT IS ITS OWN CHECK. The byte partition compares this tree against the
   base, where the two-sided path does not exist; it can say an EQUAL row holds
   against the base's mirrored left half, but only on the rows the matrix holds.
   This one runs every CURVE row of the live matrix (each converted both ways,
   whatever mode the row stored) plus a written-down set of states that reach
   every per-side reader (the cup, the buckle, the roll, the twist, the apex
   sweep, the cup gradient, the infill flat and curved, the tube's throat, the
   sphere, the sepals, several whorls).

   `--control` makes the right half differ from the left by one ULP at one
   point's y and REQUIRES the comparison to see it on the first state — so a
   tool that silently built both arms the same way cannot pass.

   RUN: node tools/verify-bloom-outline-asym-equal.mjs [--control] [--only <re>]
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const ONLY = argv.includes('--only') ? new RegExp(argv[argv.indexOf('--only') + 1]) : null;

const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...H.DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === H.SCOPES_SET_ID) continue;
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
const curveOf = (s) => (typeof s.petalOutlineCurve === 'string' ? JSON.parse(s.petalOutlineCurve) : s.petalOutlineCurve);

/* the written-down states, every one in CURVE mode on the default curve unless
   it says otherwise */
const C = { petalOutlineMode: 'CURVE' };
const EXTRA = [
  ['default curve', {}], ['cup 1.2', { petalCup: 1.2 }], ['curl 360', { petalSpineCurl: 360 }],
  ['roll 330', { petalRoll: 330 }], ['twist 120', { petalTwist: 120 }], ['buckle 0.6 f3', { buckleAmp: 0.6 }],
  ['apex sweep 1 x cup 0.6', { petalApexSweep: 1, petalCup: 0.6 }], ['cup gradient 1 x cup 0.9', { petalCupGradient: 1, petalCup: 0.9 }],
  ['infill', { petalInfill: 'VORONOI' }], ['infill x cup 1.2 x curl 360', { petalInfill: 'VORONOI', petalCup: 1.2, petalSpineCurl: 360 }],
  ['infill x roll 330', { petalInfill: 'VORONOI', petalRoll: 330 }], ['tube k0', { tubeLayer1: 0, petalCount: 5 }],
  ['3 whorls', { layerCount: 3 }], ['CONTINUOUS x 3', { placement: 'CONTINUOUS', layerCount: 3 }],
  ['SPHERE', { placement: 'CONTINUOUS', hubShape: 'SPHERE' }], ['5 sepals', { sepalCount: 5 }],
  ['petalWidth 30', { petalWidth: 30 }], ['petalLength 60', { petalLength: 60 }], ['headRise 0.5', { headRise: 0.5 }],
].map(([label, set]) => ({ label: `EXTRA: ${label}`, state: { ...H.DEFAULTS, ...C, ...set } }));

const cases = [];
for (const row of H.buildMatrix()) {
  const st = stateOf(row);
  if (!G.outlineIsCurve(st)) continue;
  cases.push({ label: row.label, state: st, opts: { below: null, capability: row.capability ?? null, scopes: H.rowScopesForBuild(row) } });
}
for (const e of EXTRA) cases.push({ label: e.label, state: e.state, opts: { below: null, capability: null, scopes: null } });
const run = ONLY ? cases.filter((c) => ONLY.test(c.label)) : cases;
if (!run.length) { console.error('no CURVE state selected — refusing a vacuous run'); process.exit(2); }

function gridOf(petals) {
  const out = [];
  for (const p of petals) {
    out.push(p ? 1 : 0);
    if (!p || !p.grid) continue;
    for (const pan of p.grid) for (const r of pan.rows) {
      out.push(r.u, r.halfWidth, r.halfWidthRight ?? r.halfWidth, r.thickness);
      for (let j = 0; j < r.v.length; j++) out.push(r.v[j], ...r.mid[j], ...r.normal[j]);
    }
  }
  return out;
}

let floats = 0, grid = 0, bad = 0, controlSeen = false, twoSidedSeen = 0;
for (let ci = 0; ci < run.length; ci++) {
  const c = run[ci];
  const v = curveOf(c.state);
  const sym = { mode: 'symmetric', points: v.points };
  const right = v.points.map((p) => [...p]);
  const controlHere = CONTROL && ci === 0;
  if (controlHere) {
    /* one ULP on an interior point's y: invisible to the eye, never to Object.is */
    const k = Math.floor(right.length / 2); right[k][1] = right[k][1] + Number.EPSILON * Math.max(1, right[k][1]);
  }
  const two = { mode: 'two-sided', points: v.points, right };
  for (const exportMode of [false, true]) {
    const tag = `${c.label} (${exportMode ? 'export' : 'live'})`;
    const A = new G.MeshBuilder({ exportMode, captureGrid: true }), B = new G.MeshBuilder({ exportMode, captureGrid: true });
    const ba = G.buildBloomInto(A, { ...c.state, petalOutlineCurve: JSON.stringify(sym) }, c.opts);
    const bb = G.buildBloomInto(B, { ...c.state, petalOutlineCurve: JSON.stringify(two) }, c.opts);
    if (bb.petalsAll && bb.petalsAll.some((p) => p && p.tipCap && p.tipCap.twoSided)) twoSidedSeen++;
    const pa = A.positions, pb = B.positions;
    let diff = pa.length !== pb.length ? -1 : 0;
    if (!diff) for (let i = 0; i < pa.length; i++) if (!Object.is(pa[i], pb[i])) diff++;
    const ga = gridOf(ba.petalsAll || ba.petals), gb = gridOf(bb.petalsAll || bb.petals);
    let gdiff = ga.length !== gb.length ? -1 : 0;
    if (!gdiff) for (let i = 0; i < ga.length; i++) if (!Object.is(ga[i], gb[i])) gdiff++;
    floats += pa.length; grid += ga.length;
    if (diff || gdiff) {
      if (controlHere) { controlSeen = true; continue; }
      bad++;
      console.log(`FAIL ${tag}: ${diff < 0 ? `the triangle count moved (${pa.length} against ${pb.length})` : `${diff} export floats differ`}; ${gdiff < 0 ? 'the grid shape moved' : `${gdiff} grid values differ`}`);
    }
  }
}
const nExtra = run.filter((c) => c.label.startsWith('EXTRA: ')).length;
console.log(`${run.length} CURVE states x 2 modes (${run.length - nExtra} matrix rows + ${nExtra} written down) — ${floats} export floats, ${grid} grid values compared under Object.is; ${twoSidedSeen} two-sided builds observed`);
if (!twoSidedSeen) { console.log('FAIL: no build was two-sided — the comparison compared the symmetric path with itself'); process.exit(1); }
if (CONTROL) {
  if (!controlSeen) { console.log('FAIL --control: a one-ULP right half was NOT seen — the comparison is blind to the right half'); process.exit(1); }
  console.log('--control: a one-ULP difference on the right half was seen, as it must be');
}
if (bad) { console.log(`FAIL: ${bad} build(s) where equal halves are not the symmetric outline`); process.exit(1); }
console.log('PASS — an Asymmetric outline with equal halves is the Symmetric one, to the bit, in both modes');
