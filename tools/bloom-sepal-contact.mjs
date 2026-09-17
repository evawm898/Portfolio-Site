/* ===================================================================
   bloom-sepal-contact.mjs — THE SEPAL ANGLE LIMIT AGAINST A DENSER DRAWING,
   THE CENSUS'S VERDICT AT THE BUILT ANGLE, AND THE FOOT AGAINST THE HUB'S
   UNDERSIDE ON ALL THREE STYLES. Node only, no browser, zero bytes.

     node tools/bloom-sepal-contact.mjs [--quick] [--control] [--section A|B|C]

   THREE QUESTIONS the brief asks and the gates cannot answer on their own:

   A. IS THE LIMIT DRAWN OR ANALYTIC, AND DOES A DENSER DRAWING AGREE? It is
      DRAWN: `sepalAngleLimit` scans the slider's own step (1 deg) over the
      builder's OWN lattice (56 rows x 10 columns of the emitted mid-surface,
      both modes) and reports the last angle at which no sepal point sits on
      top of a petal, in it, or crosses it. This section re-draws the same
      petals and the same sepal at FOUR TIMES the lattice (every station and
      its three quarter-points, 40 columns) through the surface's own front
      door (`petalSurface(...).rowAt(u).sect(v)` — no second law) and scans at
      a QUARTER of the step around the builder's answer, over phase x size x
      count, on a flat and on a cupped corolla. The claim is that the dense
      drawing finds contact no earlier than ONE slider step below the
      builder's limit: a coarser lattice can only MISS a contact between its
      lines, so the dense limit is at most the drawn one, and the tool reports
      by how much. It also reports the dense limit's own residual: at what
      quarter-step above the dense limit contact first appears.

   B. IS SEPAL-PETAL INTERPENETRATION A CENSUS FAILURE OR ONLY VISUAL? Both
      answers are measured: at the BUILT angle the export build's within-shell
      census is compared against the identical state with the sepals removed.
      At an INTERLEAVED phase the sepals add exactly 0 within-shell pairs at
      every angle up to the limit — the sepal and its neighbours are separate
      closed shells whose by-design overlap the export contract permits
      (visual only). At an ALIGNED phase the sepal's foot columns can coincide
      with the petal foot's EXACTLY (size x breadth at 3/5 on the shipped
      controls, and identically at size 1.00), the census's exact-position
      weld then reads the two as ONE shell, and the overlap becomes a
      within-shell count: a census failure by the shell definition, declared
      by name in SELF_INTERSECTION_XFAIL. The tool reports the weld as the
      SHELL COUNT going down when sepals are added.

   C. THE FOOT AGAINST THE HUB'S UNDERSIDE, GOBLET / ANGLED / CURVED at every
      amount x length corner. The builder's record (`undersideSlopeDeg`,
      `shoulderDeg`, `footBuriedMm`) reads the plan's thickness law; this
      section reads the underside OFF THE EMITTED HUB TRIANGLES — a different
      owner (the fourth durable rule). THE FIRST RUN OF THIS SECTION FOUND THE
      TANGENT MISLEADING: GOBLET and CURVED arrive at the rim tangent-FLAT
      (the record read 0.00 deg and the analytic tangent IS 0) while the
      emitted underside over the last half millimetre read 15 / 29 / 57 / 72
      deg, because both laws have UNBOUNDED curvature at their edge. So the
      record now carries the CHORD one printable feature in beside the
      tangent, the read-out prints both, and this section checks the flat
      case exactly (0 deg on record and mesh where the blend stops short of
      the rim), the chord against the emitted chord to the nearest station
      (1.5 deg, the station's own offset), and ANGLED's cone against its own
      last segment.

   `--control` breaks the dense drawing on purpose (its sepal lamina is
   rotated the wrong way round the rim tangent) and requires section A to
   report disagreement; a section that cannot fail is a log line.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
const QUICK = process.argv.includes('--quick');
const CONTROL = process.argv.includes('--control');
const SEC = (() => { const i = process.argv.indexOf('--section'); return i >= 0 ? process.argv[i + 1] : null; })();
const want = (x) => !SEC || SEC === x;
const D2R = Math.PI / 180;
const STEP = G.SEPAL_ANGLE_STEP, DENSE_STEP = STEP / 4, DENSE = 4;
let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL ${m}`); };

/* ---- the dense drawing ------------------------------------------------ */
function denseRows(surface, panelRows) {
  /* the builder's own stations plus three quarter-points between each pair,
     restricted to the lamina (u >= ROOT_BLEND_END), each row at DENSE x the
     builder's columns, through the surface's front door */
  const us = panelRows.map((r) => r.u).filter((u) => u >= G.ROOT_BLEND_END);
  const cols = panelRows[0].v.length * DENSE;
  const vs = Array.from({ length: cols }, (_, j) => -1 + (2 * j) / (cols - 1));
  const rows = [];
  for (let i = 0; i < us.length; i++) {
    const u0 = us[i], u1 = i + 1 < us.length ? us[i + 1] : null;
    const list = u1 === null ? [u0] : Array.from({ length: DENSE }, (_, k) => u0 + ((u1 - u0) * k) / DENSE);
    for (const u of list) { const row = surface.rowAt(u); const q = vs.map((v) => row.sect(v)); rows.push({ u, mid: q.map((x) => x.P), normal: q.map((x) => x.n) }); }
  }
  return rows;
}
function densePetals(built, state, mode) {
  const acc = new G.MeshBuilder({ exportMode: mode });
  return built.petalSites.map((site) => {
    const surface = G.petalSurface(state, site.ring, site.slot, site.cap, acc);
    return G.laminaFromPanels(site.p.grid.map((panel) => ({ rows: denseRows(surface, panel.rows) })));
  });
}
function denseSepal(state, sepals, deg, mode, panelRows) {
  const acc = new G.MeshBuilder({ exportMode: mode });
  const slot = { index: 0, azimuth: 0, radius: sepals.ring.radius, z: 0, scale: sepals.scale, tiltExtra: 0 };
  const surface = G.petalSurface(G.sepalBladeState(state, deg), sepals.ring, slot, null, acc);
  return { lamina: G.laminaFromPanels([{ rows: denseRows(surface, panelRows) }]), base: surface.base, tilt: deg };
}
/* the dense limit, scanned at a quarter step from (builder's limit - 2 steps)
   upward; returns the last clear angle and the first contact */
function denseLimit(state, built, mode) {
  const sepals = built.foot.sepals, L = built.sepals.limit;
  const t = new G.MeshBuilder({ exportMode: mode }).floorThickness(Number(state.sheetThickness));
  const petals = densePetals(built, state, mode);
  const grid = G.laminaGrid(petals, t);
  /* the sepal's own ladder — the builder's stations at this angle, from one
     sepal built into a throwaway accumulator with the lamina captured (the
     bloom's own sepals are emitted with the capture off) */
  const stationsAt = (deg) => {
    const acc = new G.MeshBuilder({ exportMode: mode, captureLamina: true });
    const slot = { index: 0, azimuth: 0, radius: sepals.ring.radius, z: 0, scale: sepals.scale, tiltExtra: 0 };
    return G.buildPetalInto(acc, G.sepalBladeState(state, deg), sepals.ring, slot, null, false).grid[0].rows;
  };
  const lo = L.limitDeg === null ? G.SEPAL_ANGLE_RANGE[0] : Math.max(G.SEPAL_ANGLE_RANGE[0], L.limitDeg - 2 * STEP);
  const hi = Math.min(G.SEPAL_ANGLE_RANGE[1], (L.limitDeg === null ? G.SEPAL_ANGLE_RANGE[0] : L.limitDeg) + 2 * STEP);
  let lastClear = null, first = null;
  const trials = new Map();
  for (let deg = lo; deg <= hi + 1e-9; deg += DENSE_STEP) {
    const seamStep = G.seamLatticeStep(G.seamClearanceMm(Math.abs(deg) * D2R, Number(state.sheetThickness)), Number(state.petalLength) * sepals.scale);
    let trial = trials.get(seamStep);
    if (!trial) { trial = denseSepal(state, sepals, deg, mode, stationsAt(deg)); trials.set(seamStep, trial); }
    let hit = null;
    for (let j = 0; j < sepals.count && !hit; j++) {
      const S = G.rotateLamina(trial.lamina, sepals.azimuths[j], trial.base, (CONTROL ? -1 : 1) * (deg - trial.tilt) * D2R);
      hit = G.laminaContact(S, petals, grid, t);
      if (hit) hit = { deg, sepal: j, ...hit };
    }
    if (hit) { first = hit; break; }
    lastClear = deg;
  }
  return { lastClear, first, lo, hi };
}

/* ---- section A ------------------------------------------------------- */
if (want('A')) {
console.log('\nA. THE DRAWN LIMIT AGAINST A DENSER DRAWING (4x the lattice, 1/4 the step), both modes');
const phases = QUICK ? [0, 0.5] : [0, 0.25, 0.5, 1];
const scales = QUICK ? [0.6] : [0.2, 0.6, 1];
const counts = QUICK ? [5] : [1, 5, 8];
const corollas = [['flat', {}], ['cupped 0.6', { petalCup: 0.6 }]];
let worstEarly = 0, statesA = 0, disagree = 0;
for (const [cName, cSet] of corollas) for (const phase of phases) for (const scale of scales) for (const count of counts) {
  const state = { ...DEFAULTS, ...cSet, sepalCount: count, sepalPhase: phase, sepalScale: scale, sepalAngle: 90 };
  const line = [];
  for (const mode of [false, true]) {
    const acc = new G.MeshBuilder({ exportMode: mode });
    const built = G.buildBloomInto(acc, state);
    const L = built.sepals.limit;
    const d = denseLimit(state, built, mode);
    const builderLimit = L.perMode[mode ? 'export' : 'live'].limitDeg;
    const early = builderLimit === null || d.lastClear === null ? 0 : builderLimit - d.lastClear;
    if (early > worstEarly) worstEarly = early;
    if (early > STEP + 1e-9) { disagree++; fail(`${cName} phase ${phase} size ${scale} x${count} [${mode ? 'export' : 'live'}]: the dense drawing finds contact ${early.toFixed(2)} deg below the builder's limit ${builderLimit} — more than one step`); }
    if (d.lastClear !== null && builderLimit !== null && d.lastClear > builderLimit + STEP + 1e-9) { disagree++; fail(`${cName} phase ${phase} size ${scale} x${count} [${mode ? 'export' : 'live'}]: the dense drawing is clear at ${d.lastClear} where the builder found contact at ${L.perMode[mode ? 'export' : 'live'].contactDeg}`); }
    line.push(`${mode ? 'export' : 'live'} builder ${builderLimit === null ? 'floor' : builderLimit + '°'} (contact ${L.perMode[mode ? 'export' : 'live'].contactDeg ?? 'none'} ${L.perMode[mode ? 'export' : 'live'].kind || ''}) · dense ${d.lastClear === null ? 'floor' : d.lastClear.toFixed(2) + '°'} (first ${d.first ? `${d.first.deg.toFixed(2)}° ${d.first.kind} on petal ${d.first.petal}` : 'none in window'})`);
  }
  statesA++;
  console.log(`  ${cName.padEnd(10)} phase ${phase} size ${scale} x${count}: ${line.join(' | ')}`);
}
console.log(`  ${statesA} states · worst early-contact under the dense drawing ${worstEarly.toFixed(2)}° (bar: one step, ${STEP}°) · disagreements ${disagree}`);
if (CONTROL) {
  console.log(disagree ? `\nCONTROL OK — with the dense sepal rotated the wrong way section A reported ${disagree} disagreement(s); it can fail.` : '\nCONTROL FAILED — section A stayed silent with its drawing broken.');
  process.exit(disagree ? 0 : 1);
}
}

/* ---- section B ------------------------------------------------------- */
if (want('B')) {
console.log('\nB. THE CENSUS AT THE BUILT ANGLE (export build) — within-shell pairs with and without the sepals, and the shell count');
const rowsB = [
  ['interleaved, shipped size, angle 0', { sepalCount: 5, sepalAngle: 0 }],
  ['interleaved, shipped size, at the limit (90 asked)', { sepalCount: 5, sepalAngle: 90 }],
  ['interleaved, size 1.00, at the limit', { sepalCount: 5, sepalScale: 1, sepalAngle: 90 }],
  ['interleaved, 8 on 8, at the limit', { sepalCount: 8, sepalAngle: 90 }],
  ['ALIGNED, shipped size (3/5 — the weld)', { sepalCount: 8, sepalPhase: 0 }],
  ['ALIGNED, size 1.00 (the foot IS the petal foot)', { sepalCount: 8, sepalPhase: 0, sepalScale: 1 }],
  ['ALIGNED, size 0.55 (no bit-equal column products)', { sepalCount: 8, sepalPhase: 0, sepalScale: 0.55 }],
  ['ALIGNED, size 0.55, breadth 1.2', { sepalCount: 8, sepalPhase: 0, sepalScale: 0.55, sepalFootBreadth: 1.2 }],
];
if (!QUICK) rowsB.push(['interleaved, 40 on 40, at the limit', { petalCount: 40, sepalCount: 40, sepalAngle: 90 }]);
for (const [name, set] of rowsB) {
  const st = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true }); const built = G.buildBloomInto(acc, st);
  const c = census(acc.positions);
  const acc0 = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(acc0, { ...st, sepalCount: 0 });
  const c0 = census(acc0.positions);
  const added = c.within - c0.within, welded = c0.shells + built.sepals.count - c.shells;
  const interleaved = Number(st.sepalPhase ?? DEFAULTS.sepalPhase) === 0.5;
  console.log(`  ${name.padEnd(48)} angle built ${String(built.sepals.limit.angleBuiltDeg).padStart(3)}° · within ${c.within} (without sepals ${c0.within}) → the sepals add ${added} · shells ${c.shells} vs ${c0.shells} + ${built.sepals.count}: ${welded > 0 ? `${welded} sepal(s) WELDED to a petal` : 'every sepal its own shell'}`);
  if (interleaved && added !== 0) fail(`${name}: interleaved sepals added ${added} within-shell pairs — interpenetration is supposed to be cross-shell (visual) here`);
  if (added > 0 && welded <= 0) fail(`${name}: within-shell pairs were added without a weld — a real fold, not the shell definition's`);
}
}

/* ---- section C ------------------------------------------------------- */
if (want('C')) {
console.log('\nC. THE FOOT AGAINST THE HUB\'S UNDERSIDE — the record vs the EMITTED hub triangles, three styles x amount x length (stem 60 x 6, 5 sepals, export)');
console.log('   Two numbers per corner, because the tangent alone misleads: the ANALYTIC tangent at the rim (the record) and the CHORD one printable feature in, read off the emitted hub — GOBLET and CURVED arrive tangent-flat with unbounded curvature at their edge.');
const amounts = QUICK ? [1, 2] : [0.5, 1, 2];
const lengths = QUICK ? [0, 40] : [0, 10, 40];
let worstChord = 0;
for (const style of G.HUB_STYLES) for (const amount of amounts) for (const len of lengths) {
  const st = { ...DEFAULTS, sepalCount: 5, stemLength: 60, stemDiameter: 6, hubStyle: style, hubShapeAmount: amount, hubLength: len };
  const acc = new G.MeshBuilder({ exportMode: true }); const built = G.buildBloomInto(acc, st);
  const S = built.sepals, R0 = built.hub.radius;
  /* the hub's triangles are the block after the petals (the stream order:
     petals, hub, ...) — its underside vertices, by radius */
  const petalTris = built.petalsAll.reduce((n, p) => n + p.tris, 0);
  const from = petalTris * 9, to = from + built.hubBuilt.tris * 9;
  const byR = new Map();
  for (let o = from; o < to; o += 3) { const x = acc.positions[o], y = acc.positions[o + 1], z = acc.positions[o + 2]; const r = Math.hypot(x, y); if (z < 0 && r <= R0 + 1e-9 && r > R0 - 1.5) { const k = r.toFixed(6); if (!byR.has(k) || byR.get(k).z > z) byR.set(k, { r, z }); } }
  const ring = [...byR.values()].sort((a, b) => b.r - a.r);   // outermost first; the LOWEST z at each radius is the underside
  if (ring.length < 2) { fail(`${style} ${amount} ${len}: fewer than two distinct radii on the hub's underside near the rim`); continue; }
  const rim = ring[0];
  /* the emitted LAST SEGMENT (the mesh's own tangent at the rim) and the
     emitted chord to the vertex nearest one printable feature in */
  const seg = ring[1];
  const lastSegDeg = Math.atan((seg.z - rim.z) / (rim.r - seg.r)) * 180 / Math.PI;
  const near = ring.reduce((best, v) => (Math.abs(rim.r - v.r - S.undersideChordMm) < Math.abs(rim.r - best.r - S.undersideChordMm) ? v : best), ring[1]);
  const chordDeg = Math.atan((near.z - rim.z) / (rim.r - near.r)) * 180 / Math.PI;
  /* the record's chord is over exactly MIN_FEATURE_MM; the emitted one is to
     the nearest STATION, so compare through the law at the emitted radius —
     no: compare the two chords and report the station offset beside them */
  const dChord = Math.abs(Math.abs(chordDeg) - Math.abs(S.undersideChordDeg));
  /* FLAT means the blend stops short of the rim by MORE than the chord's own
     length — the first cut read `!blendReachesRim` and went red on every
     corner where the blend stopped 0.03-0.43 mm short: the tangent AT the rim
     is on the flat annulus there and the chord one feature in is not. */
  const flat = S.blendGapMm !== null && S.blendGapMm >= S.undersideChordMm;
  console.log(`  ${style.padEnd(6)} amount ${amount} length ${String(len).padStart(2)}: record tangent ${S.undersideSlopeDeg.toFixed(2)}° (shoulder ${S.shoulderDeg.toFixed(2)}°, blend ${S.blendReachesRim ? 'reaches the rim' : `stops ${S.blendGapMm.toFixed(2)} mm short`}, foot buried ${S.footBuriedMm.toFixed(2)} mm) · record chord over ${S.undersideChordMm.toFixed(2)} mm ${S.undersideChordDeg.toFixed(2)}° · EMITTED last segment ${lastSegDeg.toFixed(2)}° (${(rim.r - seg.r).toFixed(3)} mm), chord ${chordDeg.toFixed(2)}° over ${(rim.r - near.r).toFixed(3)} mm`);
  if (flat) {
    /* the blend stops short of the rim: the annulus there is FLAT, exactly,
       on the record and on the mesh alike */
    if (Math.abs(lastSegDeg) > 1e-9 || Math.abs(chordDeg) > 1e-9 || Math.abs(S.undersideChordDeg) > 1e-9) fail(`${style} ${amount} ${len}: the blend stops more than one feature short of the rim but the underside is not flat there (${lastSegDeg.toFixed(3)}° / ${chordDeg.toFixed(3)}°)`);
  } else {
    if (Math.abs(rim.r - near.r - S.undersideChordMm) > 0.25) fail(`${style} ${amount} ${len}: no emitted station within 0.25 mm of one printable feature inside the rim (nearest ${(rim.r - near.r).toFixed(3)} mm)`);
    else if (dChord > 1.5) fail(`${style} ${amount} ${len}: the record's chord ${S.undersideChordDeg.toFixed(2)}° and the emitted chord ${chordDeg.toFixed(2)}° disagree by more than 1.5°`);
    if (dChord > worstChord) worstChord = dChord;
    /* a cone's last segment IS its slope — where the cone reaches the last
       segment at all: a blend stopping short of the rim by any length leaves
       the last segment straddling its edge (part flat, part cone — measured
       −72.22° against a 73.32° cone at 0.03 mm short), so the clause asks
       only where the record says the cone reaches the rim */
    if (style === 'ANGLED' && S.blendReachesRim && Math.abs(Math.abs(lastSegDeg) - Math.abs(S.shoulderDeg)) > 0.5) fail(`${style} ${amount} ${len}: a cone's emitted last segment (${lastSegDeg.toFixed(2)}°) is not the record's shoulder (${S.shoulderDeg.toFixed(2)}°)`);
  }
}
console.log(`  worst record-vs-emitted chord disagreement where the blend reaches the rim ${worstChord.toFixed(3)}° (bar 1.5°, the station offset; ${'flat corners are asserted exactly'})`);
}
console.log(failures ? `\nFAIL — ${failures} finding(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
