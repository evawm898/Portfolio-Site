/* ===================================================================
   verify-geometry-quality.mjs — geometry-CORRECTNESS gate, alongside the watertight
   export gate. The export gate only proves manifoldness (boundaryEdges=0); a petal can
   be perfectly watertight and still be the WRONG SHAPE — the Lobed cleft is the standing
   example: with continuous margin ON its rim is drawn by two un-clefted marginal strands
   that skip the sinus, so the printed solid is a smooth shield with a decorative interior
   slit, not a bifid petal. That passes the export gate. These three checks catch it,
   measuring the geometry the renderer actually builds, per petal, in flattened 2-D space:

     1. MARGIN FIDELITY / CLOSURE — every point of the true material boundary past the
        neck must be traced by the RENDERED margin (marginStrands when continuous margin
        is on, the cleft-aware contour when off). The max gap is the unsealed-sinus depth
        in mm; a fragmented contour (2+ loops) also fails. THIS is the check that sees the
        Lobed defect (gap ~= the cleft depth) that manifoldness misses.
     2. CONTOUR SMOOTHNESS — turn angle and turn-per-mm (curvature) around the material
        contour. Curvature is sampling-invariant (the cleft contour is sampled far finer
        than the analytic loop), so it, not the raw angle, is gated. Catches a coarse /
        stair-stepped contour. Reports max + p95 of both.
     3. UNCAPPED FREE ENDS — degree-1 nodes (via the same buildRibGraph the terminator
        uses) that land neither on the material boundary nor at the petal foot. Gated for
        the STRUCTURED infills (veins/bone/strands) that are meant to cap onto the margin;
        space-colonization's growth-frontier tips and Voronoi's closed slab rings are
        exempt (bead-capped and watertight by design, not trees hung off the margin).
     4. MARGIN REGISTRATION — does the INFILL meet the rib it's supposed to terminate
        against? This is a DIFFERENT failure from #1: fidelity/closure asks whether the
        rendered rim traces the material boundary; this asks whether the infill's own
        outer edge coincides with where that rib tube actually sits (ribInnerEdge in
        flower-geometry.js), not some other guessed boundary (a constant inset, the raw
        outline, a proportional-to-halfwidth cap). A config can pass #1-#3 — rim closed,
        smooth, infill tips capped somewhere — while the infill still clips to the WRONG
        curve, which reads as a visible gap or crossover between the rib and the pattern.
        Reported as SIGNED gap (rib - outermost infill point) in u-buckets around the
        blade, split into two different failure modes with different baselines:
          OVERSHOOT (infill runs past the rib) is gated for every pattern — every infill
          builder now hard-clamps to ribInnerEdge at generation time, so this should be
          ~0 by construction; a regression means a clamp broke.
          UNDERSHOOT (infill falls short) is gated only for Voronoi, a dense tiled
          pattern meant to have no gaps. Veins/bone/strands/spacecol are sparse tree/fan
          patterns by design — a fractal vein network legitimately doesn't touch the
          margin at every u — so their undershoot is reported, not gated.

   Browser-based (like verify-flower-export): serves flower.js with an appended hook that
   calls the real resolveParams + exported geometry fns (reaching the two exports flower.js
   does not import — buildRibGraph, getCleftContour — via a dynamic import), so it measures
   exactly what the renderer uses. Cleft-on-continuous-margin configs are a KNOWN, tracked
   failure (#64): they are marked xfail so the table shows their real numbers without
   breaking the build; the gate is hard for every shipping (non-cleft) config. Usage:
     node tools/verify-geometry-quality.mjs               # 5 shapes x 5 patterns gate
     node tools/verify-geometry-quality.mjs --report-only # never exit non-zero (just report)
     node tools/verify-geometry-quality.mjs --sweep       # cleftDepth sweep (Lobed), report-only
     GQ_MARGIN_OFF=1 node tools/verify-geometry-quality.mjs   # prove the gate: cleft-aware rim => gap 0
     GQ_JSON=out.json node tools/verify-geometry-quality.mjs  # also dump per-config rows
   Exits non-zero only on a NON-xfail failure (unless --report-only / --sweep).
   =================================================================== */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHAPES as SHIPPED_SHAPES } from '../flower-shapes.js';
import { findChromium, serveRepo, routeThreeCDN } from './flower-gate-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const SWEEP = argv.includes('--sweep');
const REPORT_ONLY = argv.includes('--report-only') || SWEEP;

// Thresholds — each set with DELIBERATE headroom above the worst shipping value so a
// small regression does not sit on the line (worst / threshold, from the 20 non-cleft
// configs; the residuals are inherent, see notes):
//   marginGapMM  <= 1.5   worst 0.29 (pointed) -> 5.2x. The rendered rim must trace the
//                         material boundary; residual is TIP sampling only (worst point is
//                         at u~0.98 where the strand polyline and the outline both collapse
//                         to y=0 and their vertices don't quite coincide) — sub-print-floor
//                         (0.8mm) and not reducible without denser sampling, which isn't
//                         worth it. A skipped sinus is 8-19mm, so the guard has ~11x margin
//                         on the thing it actually protects.
//   p95CurvDegMM <= 40    worst 12.8 (clawed claw-shoulder) -> 3.1x. A stair-stepped contour
//                         spikes the per-mm turn rate well past 100; 40 sits clear of both.
//   freeEnds     <= 6     worst 2 (clawed veins) -> 3x. Deep venation tips beyond captureDist
//                         are an inherent 0-2 baseline; 6 still catches a gross un-termination
//                         (edge-termination breaking -> dozens of loose ends).
//   regOvershootMM <= 3.0  worst 1.275 (preset:rose, veins+loop termination) -> 2.4x. Every
//                         infill builder hard-clamps to ribInnerEdge at generation time
//                         (growBranch, buildBone, buildStrands, buildSpaceColonization's
//                         inside(), buildVoronoi's clipPoly), so this is near-0 almost
//                         everywhere (25/27 configs < 0.5mm); the Rose residual is
//                         terminateEdges' MEET/LOOP projecting onto ribMarginPolyline's
//                         56-segment polygon approximation on a sharp-curvature preset —
//                         the same class of sub-print-floor polygon-sampling residual
//                         marginGapMM's own note above already documents and tolerates,
//                         not an unclamped path. A nonzero jump past this means a clamp
//                         broke, which is exactly the failure mode the Poppy/Growth bug
//                         report was about. Gated for every pattern.
//   regUndershootVoronoiMM <= 2  worst 0.001 (all configs) -> ~2000x, deliberately loose:
//                         Voronoi's cell clip is an exact geometric constraint (Lloyd
//                         relaxation against ribMarginPolyline), so it is essentially always
//                         ~0 today; the threshold has slack for param combinations this
//                         sweep didn't cover (extreme density/lloyd/anisotropy), while still
//                         catching the original bug class (was several mm, see PR history).
//                         Voronoi is a dense TILED sheet meant to have no gaps, so undershoot
//                         here is diagnostic the same way it is for Cells specifically.
//                         Gated ONLY for voronoi — veins/
//                         strands/bone/spacecol are SPARSE tree/fan patterns by design (a
//                         fractal vein network or a strand fan legitimately doesn't touch
//                         the margin at every u), so their undershoot (measured worst ~27mm,
//                         clawed__strands) reflects the pattern's own open structure, not a
//                         registration bug — reported per-config, not gated.
const T = { marginGapMM: 1.5, p95CurvDegMM: 40, freeEnds: 6, regOvershootMM: 3.0, regUndershootVoronoiMM: 2 };
// The connectivity check applies only to the STRUCTURED infills that are meant to cap
// onto the margin. Space-colonization's free tips are its growth frontier (bead-capped
// and watertight per the export gate), and Voronoi is closed slab rings — neither is a
// tree hung off the margin, so a degree-1 tip there is by design, not an uncapped end.
const ENDS_INFILLS = new Set(['veins', 'bone', 'strands']);

// Known, tracked correctness failures — each a DEBT WITH A DUE DATE, not a permanent
// exemption. An xfail carries an issue ref + the date it was quarantined; the gate reports
// its age and FAILS the build if any debt is older than XFAIL_MAX_AGE_DAYS, if the number of
// distinct open debts exceeds XFAIL_MAX, or if a debt's configs all go green (fixed — the
// marker must be DELETED, not left passing). That keeps the ledger from silently accreting.
const XFAIL_MAX_AGE_DAYS = 30;
const XFAIL_MAX = 3;
const XFAILS = {
  '#64': { since: '2026-08-19', reason: 'continuous-margin rim not cleft-aware (Lobed sinus unsealed)' },
};

// The four shipped silhouette bundles now come from flower-shapes.js — the same
// object the live picker imports, so this gate can no longer drift from what it's
// meant to be measuring (it previously carried its own hand-copied 'rounded' that
// nothing checked against the picker's). LOBED is added back in locally: it is
// deliberately NOT a picker bundle (see flower-shapes.js), so it has no shared
// source — this gate keeps its own copy purely to regression-test the known #64
// defect (cleft renders wrong under continuous margin).
const SHAPES = {
  ...SHIPPED_SHAPES,
  lobed: { width: 0.95, taper: 0.35, clawLength: 0, clawWidth: 0.3, shoulder: 0.55, cleftDepth: 0.45, cleftLobes: 2, cleftWidth: 0.3, tip: 0.5, centerCurve: 0.4, edgeCurve: 0.05, edgeProfile: 0, petalCup: 0.1 },
};
const PATTERNS = ['veins', 'voronoi', 'strands', 'bone', 'spacecol'];

// Config list. Cleft petals (Lobed) render their sinus correctly ONLY when the rim is
// cleft-aware — i.e. continuous margin OFF. With it ON (the Standard default) the two
// un-clefted marginal strands skip the sinus entirely, so the shape is manifold-but-wrong.
// That is a KNOWN, tracked defect (#64), so cleft-on-continuous-margin configs are marked
// xfail: they still appear in the table with their real numbers, but a known failure does
// not break the build. When #64 makes the strands cleft-aware, drop the marker and the
// gate goes hard. A cleft config that UNEXPECTEDLY passes (xpass) is surfaced too.
// cfg.xfail holds the ISSUE REF for a known-failing config (or null). GQ_MARGIN_OFF routes
// the cleft through the good (cleft-aware) rim, so it clears the quarantine — the configs
// must then PASS on their own, which is the gate's credibility check.
const CLEFT_XFAIL = process.env.GQ_MARGIN_OFF ? null : '#64';
const CONFIGS = [];
if (SWEEP) {
  for (const depth of [0.10, 0.15, 0.20, 0.25, 0.30, 0.35]) {
    for (const pat of PATTERNS) {
      CONFIGS.push({ name: `d${depth.toFixed(2)}__${pat}`, ui: { ...SHAPES.lobed, cleftDepth: depth, cleftLobes: 2, infillType: pat }, xfail: CLEFT_XFAIL });
    }
  }
} else {
  for (const shape of Object.keys(SHAPES)) for (const pat of PATTERNS) {
    const cleft = (SHAPES[shape].cleftDepth || 0) > 0;
    CONFIGS.push({ name: `${shape}__${pat}`, ui: { ...SHAPES[shape], infillType: pat }, xfail: cleft ? CLEFT_XFAIL : null });
  }
}
// Credibility check: GQ_MARGIN_OFF flips continuous margin off on every config, routing
// the rim through the cleft-aware contour. The fidelity gap must then collapse to ~0 —
// proof the gate measures the RENDERED margin, not merely the presence of a cleft.
if (process.env.GQ_MARGIN_OFF) for (const c of CONFIGS) c.ui.continuousMargin = 'off';

// SHIPPED PRESETS as named correctness fixtures. Each preset's PETAL (its shape + infill +
// edge, measured with the shipping continuous-margin ON) must trace its rim, stay smooth,
// and cap its infill ends — the same bar as the matrix, but reported by name ("preset:
// thistle"). A preset is a full design, so it loads via applyDesign (window.__gqApply),
// not the partial __gqSet the matrix uses. No xfail: a preset that fails IS a regression.
if (!SWEEP && !process.env.GQ_MARGIN_OFF) {
  const { PRESETS, PRESET_SCHEMA } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
  for (const p of PRESETS) CONFIGS.push({ name: `preset:${p.slug}`, preset: true, ui: { ...p.ui, schemaVersion: PRESET_SCHEMA }, xfail: null });
}

// ---- the geometry-quality hook, appended to the served flower.js (module scope, so it
//      shares resolveParams / readUI / inputs / the imported geometry fns). Exports
//      flower.js does NOT import (buildRibGraph, getCleftContour) are reached through a
//      dynamic import of the geometry module (same relative specifier flower.js uses). --
const GQ_HOOK = `
const MM = 26;   // MM_PER_UNIT — report gaps in mm, the unit that matters for print.
window.__gqSet = function(obj) {
  for (const k in obj) { const el = inputs[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!obj[k]; else el.value = obj[k]; }
};
window.__gqGeom = null;
// point -> distance to the nearest segment across a set of polylines [{points:[...]}...]
function __gqDistToSegs(p, polys) {
  let best = Infinity;
  for (const pl of polys) { const pts = pl.points || pl; for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + t * dx, qy = a.y + t * dy, d = Math.hypot(p.x - qx, p.y - qy);
    if (d < best) best = d;
  } }
  return best;
}
window.__gq = async function() {
  const G = window.__gqGeom || (window.__gqGeom = await import('./flower-geometry.js'));
  const ui = readUI();
  const P = resolveParams(ui);
  const cfg = cleftConfig(P);
  const seed = 12345;

  // MATERIAL BOUNDARY — the true cleft-aware outline of the printed material (closed
  // ring). buildSilhouette resolves clefts via the marching-squares contour.
  const material = buildSilhouette(P, P.outlineSteps || 56);
  if (!material || material.length < 3) return { error: 'empty-silhouette' };
  const n = material.length;
  const matRing = [{ points: material.concat([material[0]]) }];   // closed for seg distance

  // RENDERED MARGIN — the polyline(s) the renderer actually traces the rim from. This is
  // the crux: with continuous margin ON (the Standard default) the margin is TWO strands
  // on +/- petalHalfWidth(u) that do NOT know about the cleft; with it OFF the rim is the
  // cleft-aware contour. Measuring against THIS (not the material contour) is what makes
  // the gate see the real defect instead of the manifold-but-wrong shape.
  const contMargin = !!P.continuousMargin && !P.solidBlade;
  let rendered;
  if (contMargin) rendered = marginStrands(P, P.bundleTightness, P.flareRate);   // [{points,side}...]
  else rendered = matRing;                                                        // drawRim traces the contour

  // (3) MARGIN FIDELITY / CLOSURE — every point of the material boundary on the BLADE must
  //     be traced by the rendered margin. The tulip-neck flare legitimately leaves the
  //     outline near the foot (the strands hug the axis up to flareEnd), so exclude exactly
  //     that span — computed as marginStrands computes it — instead of a blunt 0.4L cutoff
  //     that leaks the ramp into the residual. The floor keeps a real blade span for a fast
  //     flare; the cleft cap guarantees a sinus is never partly skipped. The max gap is the
  //     unsealed-sinus depth: ~0 when the rim is cleft-aware, ~the cleft depth when the
  //     un-clefted strands skip it. Also flag a contour that fragments into 2+ loops.
  let numLoops = 1;
  if (cfg) { const cc = G.getCleftContour(P); numLoops = (cc && cc.loops) ? cc.loops.length : 0; }
  const _bt = Math.max(0, Math.min(1, P.bundleTightness != null ? P.bundleTightness : 0.5));
  const _fr = Math.max(0, Math.min(1, P.flareRate != null ? P.flareRate : 0.5));
  const _flareStart = 0.02 + (0.20 - 0.02) * _bt;
  const _flareEnd = Math.min(0.96, _flareStart + (0.55 + (0.12 - 0.55) * _fr));
  let neck = Math.max(0.42, _flareEnd);
  if ((P.cleftDepth || 0) > 0) neck = Math.min(neck, 1 - P.cleftDepth - 0.03);   // never skip a sinus
  let marginGap = 0, worstU = 0;
  for (const p of material) { const u = p.x / P.L; if (u <= neck) continue; const d = __gqDistToSegs(p, rendered); if (d > marginGap) { marginGap = d; worstU = u; } }
  const marginGapMM = marginGap * MM;
  const marginClosed = numLoops === 1;

  // (1) CONTOUR SMOOTHNESS — turn angle AND turn-per-mm (curvature) at each vertex of the
  //     material ring. Raw turn angle is sampling-dependent (the cleft contour is sampled
  //     far finer than the analytic loop), so curvature = turn / segment-length-mm is the
  //     comparable measure: a stair-step is a big turn over a tiny grid segment -> huge
  //     curvature; a smooth arc stays bounded; a single sharp tip shows in max, not p95.
  const turns = [], curv = [];
  for (let i = 0; i < n; i++) {
    const a = material[(i - 1 + n) % n], b = material[i], c = material[(i + 1) % n];
    const v1x = b.x - a.x, v1y = b.y - a.y, v2x = c.x - b.x, v2y = c.y - b.y;
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y); if (l1 < 1e-9 || l2 < 1e-9) continue;
    let cs = (v1x * v2x + v1y * v2y) / (l1 * l2); cs = cs < -1 ? -1 : cs > 1 ? 1 : cs;
    const t = Math.acos(cs) * 180 / Math.PI;
    turns.push(t); curv.push(t / (0.5 * (l1 + l2) * MM));
  }
  const pct = (arr, q) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
  const maxTurn = turns.length ? Math.max(...turns) : 0;
  const p95Turn = pct(turns, 0.95);
  const maxCurv = curv.length ? Math.max(...curv) : 0;
  const p95Curv = pct(curv, 0.95);

  // (2) UNCAPPED FREE ENDS — build the infill exactly as the render does (dispatch -> clip
  //     to the cleft mask -> terminate onto the contour), then count DEGREE-1 nodes with
  //     the SAME buildRibGraph the terminator uses. A degree-1 node that lands neither on
  //     the material boundary (where caps go) nor at the petal foot is an uncapped end.
  //     Voronoi is slab rings already clipped to the silhouette, so it does not apply.
  let veins = [], applies = P.infillType !== 'voronoi';
  if (applies) {
    const rng = mulberry32(seed);
    try {
      if (P.infillType === 'strands') veins = (buildStrands(P, { count: P.strandCount, width: P.strandWidth, taper: P.strandTaper, curvature: P.strandCurvature, irregularity: P.strandIrregularity, seed }).veins) || [];
      else if (P.infillType === 'bone') veins = (buildBone(P, { count: P.boneCount, width: P.boneWidth, curve: P.boneCurve, spread: P.boneSpread }).veins) || [];
      else if (P.infillType === 'spacecol') veins = (getSpaceColonization(P, spaceColSeed(P, seed), { mode: P.spaceMode, sourceCount: Math.min(P.spaceSourceCount, SPACECOL_LIVE_CAP), birthDist: P.spaceBirth, killDist: P.spaceKill, growthStep: P.spaceStep, seedPattern: P.spacePattern }).veins) || [];
      else veins = (buildVenation(P, rng, { secondaries: P.secondaries, crossPerStrip: P.crossPerStrip, maxDepth: P.maxDepth, softness: P.softness, branchStart: P.branchStart, continuousMargin: P.continuousMargin }).veins) || [];
    } catch (e) { return { error: 'infill:' + e.message }; }
    if (cfg && veins.length) { try { veins = clipVeinsToMask(veins, P, cfg) || veins; } catch (e) {} }
    if ((P.infillType === 'veins' || P.infillType === 'bone' || P.infillType === 'spacecol') && P.edgeTermination && P.edgeTermination !== 'fade') {
      // Must match the real render path (flower.js's buildPetalInto) exactly: captures
      // onto ribMarginPolyline (the rib's actual inner edge), not 'material' (the true
      // outline) — using 'material' here was the gate's OWN stale copy of the bug this
      // metric exists to catch, pulling free tips out past where the rib really sits.
      try { const term = terminateEdges(veins, G.ribMarginPolyline(P, P.outlineSteps || 56), P, P.edgeTermination, P.captureDist); for (const v of term.veins) veins.push(v); } catch (e) {}
    }
  }
  let degree1 = 0, onMargin = 0, atBase = 0, freeEnds = 0;
  if (applies && veins.length) {
    const g = G.buildRibGraph(veins);
    const eps = Math.max(P.L * 0.02, 0.1);   // ~ the rib weld radius
    for (const nd of g.nodes) {
      if (nd.deg !== 1) continue;
      degree1++;
      if (__gqDistToSegs(nd, matRing) < eps) { onMargin++; continue; }
      if (nd.x < eps) { atBase++; continue; }   // rooted at the petal foot (u = 0)
      freeEnds++;
    }
  }

  // (4) MARGIN REGISTRATION — does the infill actually terminate AT the rib's real
  //     inner edge, or against some other guessed boundary? This is the check the
  //     other three miss: margin fidelity/closure is about the RIM tracing the
  //     material boundary; this is about the INFILL meeting the RIM. A petal can
  //     pass all three above with the infill clipped to a constant inset, the raw
  //     outline, or a proportional-to-halfwidth guess — any curve OTHER than the
  //     rib's actual inner edge — and still show a visible gap or crossover, which
  //     is exactly what the Cells/Growth bug this metric was added for looked like.
  //
  //     Method: bucket every infill boundary vertex by u (veins/bone/strands/
  //     spacecol polyline points; Voronoi's outer slab-ring points), keep the
  //     OUTERMOST |y| per bucket, and diff it against G.ribInnerEdge(u, P) — the
  //     SAME curve the renderer's rib tube actually occupies (flower-geometry.js's
  //     "THE MARGIN RIB" section). ~0 = flush by construction. Buckets where the
  //     rib itself has collapsed toward the axis (the base bundle, u below the
  //     flare) are skipped — there is no meaningful "margin" to register against
  //     there, by design (see marginFlareFactor).
  // Two different measurements, deliberately NOT the same computation:
  //   OVERSHOOT is a LOCAL violation test — does THIS point exceed ribInnerEdge
  //   evaluated at THIS point's own exact u? Comparing a point to the curve at its
  //   own parameter (not a bucket-centre approximation) means zero discretization
  //   noise: a straight per-point inequality, exact regardless of curvature.
  //   UNDERSHOOT is a REGIONAL coverage question — is there infill roughly out
  //   here at all? That needs bucketing (the outermost point in a u-band), because
  //   sparse patterns have real, deliberate gaps BETWEEN individual veins/strands
  //   that a per-point test would misread as "no coverage" everywhere.
  // (Using bucket-vs-bucket-centre for BOTH directions was tried first — it over-
  // reported "overshoot" on high-curvature shapes like Clawed purely from comparing
  // a 72-segment clip polygon against an 80-bin curve evaluation at a different
  // phase, the same class of sampling residual marginGapMM's own header notes
  // already document for this gate. The per-point test below has no such residual.)
  const NBIN = 80;
  const outerY = new Array(NBIN).fill(null);
  let regOverMax = 0, regOverU = 0;
  const recordPt = (x, y) => {
    const u = Math.max(0, Math.min(1, x / P.L));
    const ay = Math.abs(y);
    const bi = Math.min(NBIN - 1, Math.floor(u * NBIN));
    if (outerY[bi] == null || ay > outerY[bi]) outerY[bi] = ay;
    const rib = G.ribInnerEdge(u, P);
    if (rib < 1e-4) return;             // rib collapsed to the axis here — no meaningful target
    const over = ay - rib;              // > 0 means this exact point sits past the rib
    if (over > regOverMax) { regOverMax = over; regOverU = u; }
  };
  if (P.infillType === 'voronoi') {
    try {
      const vor = buildVoronoi(P, mulberry32(seed), {
        density: P.density, softness: P.softness, lloyd: P.voronoiLloyd,
        anisotropy: P.voronoiAniso, cellDensityLaw: P.voronoiDensityLaw,
        weightHierarchy: P.voronoiWeight, weightFalloff: P.voronoiWeightFalloff,
        slabTaper: P.voronoiSlabTaper, minCellSize: 3 * P.tubeRadius * SLAB_THICK,
      });
      for (const slab of (vor.slabs || [])) for (const pt of slab.outer) recordPt(pt.x, pt.y);
    } catch (e) {}
  } else {
    for (const v of veins) for (const pt of v.points) recordPt(pt.x, pt.y);
  }
  let regUnderSum = 0, regUnderCount = 0, regUnderMax = 0, regUnderU = 0;
  for (let bi = 0; bi < NBIN; bi++) {
    if (outerY[bi] == null) continue;
    const u = (bi + 0.5) / NBIN;
    const rib = G.ribInnerEdge(u, P);
    if (rib < 1e-4) continue;
    const under = rib - outerY[bi];       // > 0 means this u-band's outermost point falls short
    if (under <= 0) continue;             // this band already meets/exceeds the rib (no gap here)
    regUnderSum += under; regUnderCount++;
    if (under > regUnderMax) { regUnderMax = under; regUnderU = u; }
  }
  const regOvershootMaxMM = regOverMax * MM;
  const regUndershootMaxMM = regUnderMax * MM;
  const regUndershootMeanMM = (regUnderCount ? regUnderSum / regUnderCount : 0) * MM;
  const regWorstU = regOverMax * MM >= regUndershootMaxMM ? regOverU : regUnderU;

  return { infill: P.infillType, cleftDepth: +(P.cleftDepth || 0).toFixed(2), contMargin, numLoops, marginClosed,
           marginGapMM: +marginGapMM.toFixed(3), worstU: +worstU.toFixed(2), neck: +neck.toFixed(2),
           maxTurnDeg: +maxTurn.toFixed(1), p95TurnDeg: +p95Turn.toFixed(1),
           maxCurvDegMM: +maxCurv.toFixed(1), p95CurvDegMM: +p95Curv.toFixed(1),
           degree1, onMargin, atBase, freeEnds, marginPts: n, L: +P.L.toFixed(3),
           regOvershootMaxMM: +regOvershootMaxMM.toFixed(3), regUndershootMaxMM: +regUndershootMaxMM.toFixed(3),
           regUndershootMeanMM: +regUndershootMeanMM.toFixed(3), regWorstU: +regWorstU.toFixed(2) };
};
// A preset is a full design; load it through applyDesign (merge over DEFAULTS) so its
// petal params are set cleanly, not layered on the previous config's partial state.
window.__gqApply = function(d) { applyDesign(d); };
window.__gqReady = true;
`;

const THREE_VERSION = '0.161.0';
const { server, port } = await serveRepo(ROOT, { hook: GQ_HOOK });
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await routeThreeCDN(page, ROOT, THREE_VERSION);
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction('window.__gqReady === true', { timeout: 30000 });
await page.waitForTimeout(300);

const rows = [];
let fails = 0, xfails = 0, xpasses = 0;
const ledger = {};   // issue ref -> { total, failing }
console.log(`config`.padEnd(20), 'gapMM'.padStart(7), 'p95Curv'.padStart(8), 'maxTurn'.padStart(8), 'loops'.padStart(6), 'free'.padStart(5), 'overMM'.padStart(7), 'underMM'.padStart(8), '  verdict');
for (const cfg of CONFIGS) {
  if (cfg.preset) await page.evaluate((d) => window.__gqApply(d), cfg.ui);
  else await page.evaluate((ui) => window.__gqSet(ui), cfg.ui);
  const q = await page.evaluate(() => window.__gq());
  if (q.error) { console.log(cfg.name.padEnd(20), 'ERROR', q.error); rows.push({ name: cfg.name, error: q.error }); fails++; continue; }
  const badFidelity = q.marginGapMM > T.marginGapMM || !q.marginClosed;
  const badSmooth = q.p95CurvDegMM > T.p95CurvDegMM;
  const badEnds = ENDS_INFILLS.has(q.infill) && q.freeEnds > T.freeEnds;
  // MARGIN REGISTRATION — does the infill meet the rib it's supposed to terminate
  // against? Overshoot (infill crossing past the rib) is gated for every pattern —
  // it should be structurally impossible now (every builder hard-clamps to
  // ribInnerEdge), so any nonzero regression here is real. Undershoot is gated only
  // for Voronoi, the one dense/tiled pattern where a gap is diagnostic the same way
  // it was for the original Poppy bug report; the sparse tree/fan patterns (veins/
  // bone/strands/spacecol) leave legitimate open structure by design, so their
  // undershoot is reported per-config but not gated.
  const badOvershoot = q.regOvershootMaxMM > T.regOvershootMM;
  const badUndershoot = q.infill === 'voronoi' && q.regUndershootMaxMM > T.regUndershootVoronoiMM;
  const bad = badFidelity || badSmooth || badEnds || badOvershoot || badUndershoot;
  const reasons = [badFidelity ? 'fidelity' : '', badSmooth ? 'smooth' : '', badEnds ? 'ends' : '', badOvershoot ? 'overshoot' : '', badUndershoot ? 'undershoot' : ''].filter(Boolean).join(',');
  let verdict;
  if (cfg.xfail) {
    const s = ledger[cfg.xfail] || (ledger[cfg.xfail] = { total: 0, failing: 0 });
    s.total++;
    if (bad) { s.failing++; xfails++; verdict = `xfail(${cfg.xfail}:${reasons})`; }        // known, tracked — not a build failure
    else { xpasses++; verdict = `XPASS(${cfg.xfail})`; }                                    // quarantined config now passes
  } else if (bad) { verdict = `FAIL(${reasons})`; fails++; }                               // real regression — breaks the build
  else verdict = 'ok';
  rows.push({ name: cfg.name, xfail: cfg.xfail || null, ...q, verdict });
  console.log(cfg.name.padEnd(20), String(q.marginGapMM).padStart(7), String(q.p95CurvDegMM).padStart(8), String(q.maxTurnDeg).padStart(8), String(q.numLoops).padStart(6), String(q.freeEnds).padStart(5), String(q.regOvershootMaxMM).padStart(7), String(q.regUndershootMaxMM).padStart(8), '  ' + verdict);
}
if (process.env.GQ_JSON) fs.writeFileSync(process.env.GQ_JSON, JSON.stringify(rows, null, 1));

// ---- xfail ledger: age each open debt, and force it to expire. A debt older than
//      XFAIL_MAX_AGE_DAYS, a debt whose configs all now pass (fixed -> delete the marker),
//      or more than XFAIL_MAX distinct debts each breaks the build so the quarantine list
//      can never quietly become permanent.
const DAY = 86400000, now = Date.now();
const openIssues = Object.keys(ledger);
let debtBreaks = false;
if (openIssues.length) {
  console.log('\nxfail ledger (debt with a due date):');
  for (const iss of openIssues) {
    const meta = XFAILS[iss] || {};
    const age = meta.since ? Math.floor((now - Date.parse(meta.since + 'T00:00:00Z')) / DAY) : null;
    const s = ledger[iss];
    let flag = '';
    if (s.failing === 0) { flag = ' → RESOLVED: all configs pass — DELETE this xfail marker'; debtBreaks = true; }
    else if (age != null && age > XFAIL_MAX_AGE_DAYS) { flag = ` → EXPIRED (>${XFAIL_MAX_AGE_DAYS}d): fix ${iss} or consciously renew 'since'`; debtBreaks = true; }
    console.log(`  ${iss}  age ${age == null ? '?' : age + 'd'} (since ${meta.since || '?'})  ${s.failing}/${s.total} failing  "${meta.reason || ''}"${flag}`);
  }
  if (openIssues.length > XFAIL_MAX) { console.log(`  ${openIssues.length} distinct debts > cap ${XFAIL_MAX}: burn some down before quarantining more`); debtBreaks = true; }
}
const okCount = CONFIGS.length - fails - xfails - xpasses;
console.log(`\n${okCount} ok, ${xfails} xfail, ${xpasses} xpass, ${fails} FAIL / ${CONFIGS.length}. thresholds: marginGap<=${T.marginGapMM}mm p95Curv<=${T.p95CurvDegMM}deg/mm freeEnds<=${T.freeEnds} marginClosed=true regOvershoot<=${T.regOvershootMM}mm regUndershoot(voronoi)<=${T.regUndershootVoronoiMM}mm`);
await browser.close(); server.close();
process.exit(REPORT_ONLY ? 0 : ((fails || debtBreaks) ? 1 : 0));
