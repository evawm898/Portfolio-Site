#!/usr/bin/env node
/* ===================================================================
   bloom-texture-t5.mjs — THE ORGANS' RELIEF, MEASURED (surface texture T5,
   docs/bloom-surface-texture-t5-outcome.md). Every figure the outcome doc
   quotes comes out of this tool, each AS A FUNCTION OF THE HEIGHT where it
   can be, so it carries over to BONE (Q12):
     (A) LEAF TO STEM — the combination gate's own measure (`leaf-stem`: every
         leaf BLADE vertex against the free stem as a solid cylinder, the rods
         named and excluded) on the textured leaf, and the EMITTED measure the
         gate cannot take (every blade vertex against the stem's own relieved
         triangles), at leafAngle 35 and 70 on the gate's own base state.
     (B) PETAL / SEPAL TO HUB — per VISIBLE hub vertex of the lattice, the
         distance to the nearest petal (and sepal) triangle with nothing
         relieved (the organs latticed, the relief withheld, the petals pinned
         smooth — two capability hooks no control reaches) against the same
         vertex relieved with the petals textured. A gap NEWLY CLOSED is a
         vertex whose untextured clearance was a printable gap (>= MIN_FEATURE_MM)
         and whose textured one is not; a vertex newly TOUCHING is one that
         stood clear and now meets a petal.
     (C) THE BUDGET — T3's refusals table (§7b) re-run with the organs' surfaces
         added: the derived edge per state and which states NEWLY COARSEN or
         NEWLY REFUSE against T3's own figures (written down below, from §7b).
     (D) Q15 — the stem's bore: how many of its vertices see the open air
         (the escape test the builder uses), measured, never assumed.
   Node only, EXPORT unless said. RUN: node tools/bloom-texture-t5.mjs [--quick]
   =================================================================== */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(HERE, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const C = await import(pathToFileURL(path.join(HERE, 'tools/bloom-combination-gate.mjs')).href);
const { triGrid, nearest } = await import(pathToFileURL(path.join(HERE, 'tools/bloom-inflo-approach.mjs')).href);
const QUICK = process.argv.includes('--quick');
const HEIGHTS = QUICK ? [0.4, 1.5] : [0.4, 0.8, 1.2, 1.5];
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const build = (st, cap = null, ex = true) => { const acc = new G.MeshBuilder({ exportMode: ex }); const b = G.buildBloomInto(acc, st, { below: null, capability: cap }); return { acc, b }; };

/* ---------------------------------------------------------------- (A) */
console.log('(A) LEAF TO STEM — the combination gate\'s base state (stem 70 x 6 mm, a 52 x 17 mm leaf, 3 nodes), EXPORT');
const LEAF_BASE = { ...R.DEFAULTS, stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3, stemDiameter: 6 };
for (const angle of [35, 70]) {
  const row = [];
  for (const H of [0, ...HEIGHTS]) {
    const st = { ...LEAF_BASE, leafAngle: angle, ...(H ? { petalTexture: 'PEBBLE', textureHeight: H } : {}) };
    const gate = C.measureLeafStemApproachMm(G, st, true).mm;
    /* the emitted measure: every blade vertex of the whole build against the
       stem's own emitted (relieved) triangles */
    const { acc, b } = build(st);
    const stemRange = b.texture && b.texture.organs.stem ? b.texture.organs.stem.organ.triRange : [b.hubTriEnd, b.stemTriEnd];
    const grid = triGrid(acc.positions, [{ lo: stemRange[0] * 9, hi: stemRange[1] * 9, owner: 'stem' }]);
    let best = Infinity;
    for (const lb of b.leavesBuilt || []) {
      if (!lb || !(lb.triStart >= 0)) continue;
      const axes = Array.isArray(lb.rodAxes) ? lb.rodAxes : [lb.petioleAxis];
      for (let t = lb.triStart; t < lb.triStart + lb.tris; t++) for (let c = 0; c < 3; c++) {
        const o = t * 9 + c * 3, p = [acc.positions[o], acc.positions[o + 1], acc.positions[o + 2]];
        if (axes.some((ax) => ax && G.rodAxisExcessMm(ax, p[0], p[1], p[2]) <= ax.radiusMm * 1e-6)) continue;
        best = nearest(grid, p, null, best);
      }
    }
    row.push(`${H ? `H ${H.toFixed(1)}` : 'untextured'}: gate ${fmt(gate)} / emitted ${fmt(best)}`);
  }
  console.log(`  leafAngle ${angle}: ${row.join(' · ')}`);
}

/* ---------------------------------------------------------------- (B) */
console.log('\n(B) PETAL / SEPAL TO HUB — per visible hub vertex, the nearest petal or sepal triangle, untextured (latticed, relief withheld, petals pinned smooth) against textured, EXPORT');
const hubStates = [['the default (8 petals, no stem)', {}], ['8 sepals on a 60 mm stem', { sepalCount: 8, stemLength: 60 }], ['40 petals', { petalCount: 40 }], ['a dome (rise 0.5) x a stem', { headRise: 0.5, stemLength: 60 }]];
for (const [name, o] of hubStates) {
  const out = [];
  for (const H of HEIGHTS) {
    const st = { ...R.DEFAULTS, petalTexture: 'PEBBLE', textureHeight: H, ...o };
    const U = build(st, { noTexture: true, organReliefOff: true });
    const T = build(st);
    const rec = T.b.texture.organs.hub;
    if (!rec) { out.push(`H ${H}: no hub record`); continue; }
    const [x, y] = rec.organ.triRange, xU = U.b.texture.organs.hub.organ.triRange[0];
    if (U.b.texture.organs.hub.organ.refinedTris !== rec.organ.refinedTris) { out.push(`H ${H}: the two hub lattices differ (${U.b.texture.organs.hub.organ.refinedTris} against ${rec.organ.refinedTris})`); continue; }
    const owners = (b) => { const rs = [{ lo: 0, hi: b.petalTriEnd * 9, owner: 'petal' }]; for (const tier of (b.sepals && b.sepals.tiers) || []) for (const s of (tier && tier.built) || []) if (s && s.triRange) rs.push({ lo: s.triRange[0] * 9, hi: s.triRange[1] * 9, owner: 'sepal' }); return rs; };
    const gU = triGrid(U.acc.positions, owners(U.b)), gT = triGrid(T.acc.positions, owners(T.b));
    const seen = new Set();
    let n = 0, closed = 0, touch = 0, minU = Infinity, minT = Infinity, openMinT = Infinity, openAtU = null;
    for (let t = x; t < y; t++) for (let c = 0; c < 3; c++) {
      /* the same lattice vertex in the two builds: its index WITHIN the hub range */
      const o = t * 9 + c * 3, ou = (xU + (t - x)) * 9 + c * 3;
      const pu = [U.acc.positions[ou], U.acc.positions[ou + 1], U.acc.positions[ou + 2]], pt = [T.acc.positions[o], T.acc.positions[o + 1], T.acc.positions[o + 2]];
      const k = pu.join('|'); if (seen.has(k)) continue; seen.add(k);
      if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;   // not relieved (buried, faded to 0, or a cavity)
      const dU = nearest(gU, pu, null, 4), dT = nearest(gT, pt, null, 4);
      if (!(dU < 4)) continue;
      n++;
      if (dU < minU) minU = dU; if (dT < minT) minT = dT;
      if (dU >= G.MIN_FEATURE_MM && dT < G.MIN_FEATURE_MM) closed++;
      /* the narrowest OPEN gap: a vertex that stood clear of every petal and
         sepal untextured (more than 0.05 mm), and what it reads relieved */
      if (dU > 0.05 && dT < openMinT) { openMinT = dT; openAtU = dU; }
      if (dU > 1e-6 && dT <= 1e-6) touch++;
    }
    out.push(`H ${H.toFixed(1)}: ${n} relieved hub vertices within 4 mm of a petal/sepal (the feet sit ON the hub: nearest ${fmt(minU)} -> ${fmt(minT)} mm); the narrowest open gap relieved is ${fmt(openMinT)} mm (it was ${fmt(openAtU)}); ${closed} printable gaps (>= ${G.MIN_FEATURE_MM} mm) newly closed, ${touch} newly touching`);
  }
  console.log(`  ${name}:\n    ${out.join('\n    ')}`);
}

/* ---------------------------------------------------------------- (C) */
console.log('\n(C) THE BUDGET — T3\'s §7b states with the organs\' surfaces added (PEBBLE, EXPORT, the derived edge)');
/* T3's own figures (docs/bloom-surface-texture-t3-outcome.md §7b), written
   down so "newly" is a comparison against the record, not a memory */
const T3 = [
  ['40 x 3 whorls', { petalCount: 40, layerCount: 3 }, 0.41, true],
  ['40 x 3 + 8 sepals + a 60 mm leaf on a 60 mm stem', { petalCount: 40, layerCount: 3, sepalCount: 8, stemLength: 60, leafLength: 60 }, 0.43, true],
  ['40 x 3 x sheet 2.4', { petalCount: 40, layerCount: 3, sheetThickness: 2.4 }, 0.41, true],
  ['40 x 3 + 40 sepals on a 120 mm stem', { petalCount: 40, layerCount: 3, sepalCount: 40, stemLength: 120 }, 0.45, true],
  ['40 x 1 + 40 sepals x 4 tiers + whorled leaves (8) on 120', { petalCount: 40, sepalCount: 40, sepalTiers: 4, stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' }, 0.45, true],
  ['8 x 1 x length 100 x width 46 + 40 sepals 120 x 30 x 4 tiers', { petalLength: 100, petalWidth: 46, sepalCount: 40, sepalLength: 120, sepalWidth: 30, sepalTiers: 4, stemLength: 120 }, 0.41, true],
  ['40 x 3 + whorled leaves (8) on 120', { petalCount: 40, layerCount: 3, stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' }, 0.5, false],
  ['40 x 2 + 40 sepals + whorled leaves on 120', { petalCount: 40, layerCount: 2, sepalCount: 40, stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' }, 0.5, false],
  ['the matrix refusal row (40 x 3 x 40 sepals x 4 tiers x whorled leaves on 120)', { petalCount: 40, layerCount: 3, sepalCount: 40, sepalTiers: 4, stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' }, 0.5, false],
  ['40 x 2 whorls', { petalCount: 40, layerCount: 2 }, 0.4, true],
  ['24 x 3', { petalCount: 24, layerCount: 3 }, 0.4, true],
  ['CONTINUOUS 120', { placement: 'CONTINUOUS', petalCount: 120 }, 0.4, true],
  ['40 x 3 x the tube', { petalCount: 40, layerCount: 3, tubeLayer1: 0 }, 0.4, true],
  ['the default x a 120 mm stem x 12 mm', { stemLength: 120, stemDiameter: 12 }, 0.4, true],
];
const B = G.EXPORT_TRI_BUDGET;
for (const [name, o, e3, fits3] of QUICK ? T3.slice(0, 3) : T3) {
  const { acc, b } = build({ ...R.DEFAULTS, petalTexture: 'PEBBLE', ...o });
  const E = b.texture.edgeCap, org = b.texture.organs;
  const organTris = ['hub', 'stem', 'tube'].map((k) => (org[k] ? `${k} ${org[k].organ.refinedTris.toLocaleString('en-US')}` : null)).filter(Boolean).join(', ');
  const change = E.usedMm !== e3 || E.fits !== fits3 ? `  <- ${E.fits !== fits3 ? (E.fits ? 'NEWLY FITS' : 'NEWLY REFUSED') : 'NEWLY COARSENED'} (T3: ${e3.toFixed(2)}${fits3 ? '' : ', refused'})` : '';
  console.log(`  ${name}: edge ${E.usedMm.toFixed(2)} mm, ${acc.triangleCount.toLocaleString('en-US')} tris = ${(100 * acc.triangleCount / B).toFixed(1)}%${E.fits ? '' : ' — REFUSED'} (organs: ${organTris})${change}`);
}

/* ---------------------------------------------------------------- (D) */
console.log('\n(D) Q15 — the stem\'s bore, by the builder\'s own escape test (6 mm hollow stem, 60 mm, EXPORT)');
{
  const { acc, b } = build({ ...R.DEFAULTS, petalTexture: 'PEBBLE', stemLength: 60 }, { organReliefOff: true });
  const grid = G.textureVisibilityGrid(acc.positions);
  const stem = b.stem, [x, y] = b.texture.organs.stem.organ.triRange;
  const seen = new Set();
  let bore = 0, visible = 0, onTop = 0, visibleBelow = 0;
  for (let t = x; t < y; t++) for (let c = 0; c < 3; c++) {
    const o = t * 9 + c * 3, p = [acc.positions[o], acc.positions[o + 1], acc.positions[o + 2]];
    const r = Math.hypot(p[0], p[1]);
    if (Math.abs(r - stem.boreR) > 1e-6 || seen.has(p.join('|'))) continue;
    seen.add(p.join('|')); bore++;
    const n = [-p[0] / r, -p[1] / r, 0];   // into the bore: the cavity face's outward
    const v = G.textureVertexVisible(grid, p, n);
    if (v) visible++;
    /* the bore's TOP ring lies on the hub's top plane (the stem's top annulus
       is coplanar with the hub's top face, which covers the hole): a ray that
       leaves exactly on that plane meets the face at t = 0 and reads as an
       escape — a knife edge of coincident faces, said apart */
    if (Math.abs(p[2] - stem.topZ) < 1e-9) onTop++; else if (v) visibleBelow++;
  }
  /* and the bore's own wall AWAY from every edge: 48 azimuths x 5 heights */
  let probes = 0, probeVisible = 0;
  for (let a = 0; a < 48; a++) for (let h = 1; h <= 5; h++) {
    const th = (a + 0.5) * Math.PI / 24, z = stem.topZ - (h / 6) * (stem.topZ - (stem.tipZ ?? (stem.topZ - 10)));
    const p = [stem.boreR * Math.cos(th), stem.boreR * Math.sin(th), z];
    probes++; if (G.textureVertexVisible(grid, p, [-Math.cos(th), -Math.sin(th), 0])) probeVisible++;
  }
  console.log(`  ${probes} probes on the bore's wall away from every edge: ${probeVisible} see the air${probeVisible ? '' : ' — the bore is a closed cavity (the hub\'s top face over it, the void\'s cap under it): BURIED, so Q7 and Q15 agree'}`);
  console.log(`  ${bore} bore-wall vertices (the bore is unrefined: ${b.texture.organs.stem.organ.cavityTris} cavity triangles left as shipped); ${visible} read as seeing the air, ${onTop} of the bore's vertices lie on the hub's top plane (the coplanar knife edge), and ${visibleBelow} below it — ${visibleBelow ? 'NOT BURIED BELOW THE TOP PLANE' : 'every vertex below the top plane is enclosed: the bore is a closed cavity under the hub\'s top face'}`);
}
