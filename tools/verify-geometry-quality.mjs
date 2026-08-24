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
   exactly what the renderer uses. Cleft-on-continuous-margin configs were a tracked
   failure — the unsealed sinus, fixed in PR #50 — and are now gated like everything else;
   the xfail machinery below stays for the next tracked debt. Usage:
     node tools/verify-geometry-quality.mjs               # 5 shapes x 5 patterns gate
     node tools/verify-geometry-quality.mjs --report-only # never exit non-zero (just report)
     node tools/verify-geometry-quality.mjs --sweep       # cleftDepth sweep (Lobed), report-only
     GQ_MARGIN_OFF=1 node tools/verify-geometry-quality.mjs   # prove the gate: cleft-aware rim => gap 0
     GQ_JSON=out.json node tools/verify-geometry-quality.mjs  # also dump per-config rows
   Exits non-zero only on a NON-xfail failure (unless --report-only / --sweep).
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHAPES } from '../flower-shapes.js';
import { findChromium } from './chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
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
const T = { minCellAreaMM2: 1e-4, marginGapMM: 1.5, p95CurvDegMM: 40, freeEnds: 6, regOvershootMM: 3.0, regUndershootVoronoiMM: 2, treatmentAmpMM: 1.5 };
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
};

// The five silhouette bundles — imported from flower-shapes.js, the single source of
// truth shared with flower.js's Standard shape picker, so the two can never drift
// apart the way they used to (each keeping its own hand-copied literal).
const PATTERNS = ['veins', 'voronoi', 'strands', 'bone', 'spacecol'];

// Config list. Cleft petals (Lobed) used to render their sinus correctly ONLY when the rim
// was cleft-aware — i.e. continuous margin OFF. With it ON (the Standard default) the two
// un-clefted marginal strands skipped the sinus entirely, so the shape was manifold-but-
// wrong, and these configs were quarantined xfail. Fixed in PR #50: ribPath(P) is now the
// single producer of the boundary and the continuous-margin strands are the two halves of
// the real material contour, so the sinus seals with the margin ON. The marker is gone and
// the gate is HARD here — a Lobed regression breaks the build like anything else.
// cfg.xfail holds the ISSUE REF for a known-failing config (or null); none are open on the
// matrix today. GQ_MARGIN_OFF still routes the cleft through the margin-OFF rim, which must
// pass too: both arms of the same boundary, one producer.
const CLEFT_XFAIL = null;
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
  // CHRYSANTHEMUM reachability: a quilled floret at the new width floor (0.1) +
  // TIP FINENESS (relative tip sharpness) — not a named SHAPES entry (it's a
  // cross-section/width extreme, not a silhouette bundle), but the margin still
  // has to trace this narrow + this sharp across every infill pattern.
  const CHRYSANTHEMUM_UI = {
    width: 0.1, taper: 1, tip: 1, tipFineness: 1,
    clawLength: 0, clawWidth: 0.3, shoulder: 0.5,
    cleftDepth: 0, cleftLobes: 2, cleftWidth: 0.3,
    curlAmount: 0.2, edgeCurve: 0, edgeProfile: 0, petalCup: 0,
    crossSection: 1, crossSectionTaper: 0,
  };
  for (const pat of PATTERNS) {
    CONFIGS.push({ name: `chrysanthemum__${pat}`, ui: { ...CHRYSANTHEMUM_UI, infillType: pat }, xfail: null });
  }
}
// RIM TREATMENTS (issue #53). TOOTHED and SCALLOPED reshape the rim polyline and nothing
// else; under CONTINUOUS MARGIN — the Standard default and the mode most designs use —
// that polyline is discarded and they render identically to CLEAN. These configs are the
// gate that was missing: each is run in both margin modes, so the pair states the defect
// exactly (OFF carries the treatment, ON does not) and, once #53 is fixed, states the fix.
// They are NOT xfail: the ON rows are expected to FAIL until the margin is edge-profile
// aware. A gate landing red is the point — it is the positive control for the fix.
if (!SWEEP && !process.env.GQ_MARGIN_OFF) {
  for (const [style, extra] of [['jagged', { tipLength: 0.5, tipFrequency: 9, tipRegion: 0.35 }],
                                ['scallop', { scallopCount: 9, scallopHeight: 0.8 }]]) {
    for (const cm of ['on', 'off']) {
      CONFIGS.push({
        name: `${style === 'jagged' ? 'toothed' : 'scalloped'}__margin-${cm}`,
        ui: { ...SHAPES.rounded, infillType: 'veins', tipStyle: style, continuousMargin: cm, ...extra },
        xfail: null,
      });
    }
  }
}

// Cross-check: GQ_MARGIN_OFF flips continuous margin off on every config, routing the rim
// through the hoop that traces the same contour. The fidelity gap stays ~0 there too —
// proof the gate measures the RENDERED margin, not merely the presence of a cleft.
if (process.env.GQ_MARGIN_OFF) for (const c of CONFIGS) c.ui.continuousMargin = 'off';
if (process.env.GQ_ANISO) for (const c of CONFIGS) c.ui.voronoiAniso = Number(process.env.GQ_ANISO);

// SHIPPED PRESETS as named correctness fixtures. Each preset's PETAL (its shape + infill +
// edge, measured with the shipping continuous-margin ON) must trace its rim, stay smooth,
// and cap its infill ends — the same bar as the matrix, but reported by name ("preset:
// thistle"). A preset is a full design, so it loads via applyDesign (window.__gqApply),
// not the partial __gqSet the matrix uses. No xfail: a preset that fails IS a regression.
if (!SWEEP && !process.env.GQ_MARGIN_OFF) {
  const { PRESETS, PRESET_SCHEMA } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
  for (const p of PRESETS) CONFIGS.push({ name: `preset:${p.slug}`, preset: true, ui: { ...p.ui, schemaVersion: PRESET_SCHEMA }, xfail: null });
}

// ARRANGEMENT (issue #54). Every check above runs on a single flattened petal via
// resolveParams(ui) — bloomType is never read, so this matrix never sampled it: every
// config ran under whichever bloomType happened to be selected, unvaried and unasserted.
// That is the coverage gap that let a placement claim go unverified for 18 days. These
// configs are measured by window.__gqArrangement (a whorl built with the real
// buildLayerInto) instead of window.__gq, and are run through __gqSet first like every
// other config — so a value that does not take fails loud, same as the rest of the file.
// All three bloom types are sampled; BILATERAL additionally gets a mirror-symmetry check
// (see __gqArrangement) at every petals-per-side count the control allows (1..3) plus a
// claw + cleft + cross-section-roll + spine-curl stress config, mirroring the manual
// #54 investigation. NOTE: the requested contact-sheet counts were 3/5/9 petals; 9 is not
// reachable — bilPerSide is capped at 3 (registry), so bilCenterPetal on tops out at
// 2*3+1=7. Sampled at 3/5/7 instead and reported as such, not padded to fit.
const ARRANGEMENT_CONFIGS = [
  { name: 'arrange:coiled@4', arrangement: true, ui: { bloomType: 'coiled', petalCount: 4 } },
  { name: 'arrange:radial@6', arrangement: true, ui: { bloomType: 'radial', petalCount: 6 } },
  { name: 'arrange:bilateral@3', arrangement: true, ui: { bloomType: 'bilateral', bilPerSide: 1, bilCenterPetal: true, bilSpacing: 45 } },
  { name: 'arrange:bilateral@5', arrangement: true, ui: { bloomType: 'bilateral', bilPerSide: 2, bilCenterPetal: true, bilSpacing: 45 } },
  { name: 'arrange:bilateral@7', arrangement: true, ui: { bloomType: 'bilateral', bilPerSide: 3, bilCenterPetal: true, bilSpacing: 45 } },
  { name: 'arrange:bilateral@6-noCenter', arrangement: true, ui: { bloomType: 'bilateral', bilPerSide: 3, bilCenterPetal: false, bilSpacing: 45 } },
  { name: 'arrange:bilateral-stress', arrangement: true, ui: { bloomType: 'bilateral', bilPerSide: 3, bilCenterPetal: true, bilSpacing: 60,
      clawLength: 0.3, cleftDepth: 0.4, cleftLobes: 3, cleftWidth: 0.3, crossSection: 0.6, curlAmount: 0.6 } },
];
if (!SWEEP && !process.env.GQ_MARGIN_OFF) CONFIGS.push(...ARRANGEMENT_CONFIGS);

// ---- the geometry-quality hook, appended to the served flower.js (module scope, so it
//      shares resolveParams / readUI / inputs / the imported geometry fns). Exports
//      flower.js does NOT import (buildRibGraph, getCleftContour) are reached through a
//      dynamic import of the geometry module (same relative specifier flower.js uses). --
const GQ_HOOK = `
const MM = 26;   // MM_PER_UNIT — report gaps in mm, the unit that matters for print.
// SET, THEN READ BACK. A control can refuse the value it was handed — the Standard
// tier rewrites tipStyle 'jagged'/'scallop' back to 'clean' (ADV_OPTIONS), a select
// silently keeps its old value when handed an option it does not have, and a slider
// clamps out of range. Every one of those makes the harness measure a DIFFERENT
// design from the one the config names, while reporting the config's name — the
// exact failure family this project keeps hitting. So the setter returns what did
// not take, and the runner fails the config rather than measuring the wrong petal.
window.__gqSet = function(obj) {
  const rejected = [];
  for (const k in obj) {
    const el = inputs[k];
    if (!el) { rejected.push(k + ': no such control'); continue; }
    if (el.type === 'checkbox') { el.checked = !!obj[k]; if (el.checked !== !!obj[k]) rejected.push(k + ': refused ' + obj[k]); continue; }
    el.value = obj[k];
    // compare numerically for sliders (el.value normalises '0.50' -> '0.5'), by string for selects
    const want = obj[k], got = el.value;
    const bothNum = want !== '' && got !== '' && isFinite(Number(want)) && isFinite(Number(got));
    const ok = bothNum ? Math.abs(Number(want) - Number(got)) < 1e-9 : String(want) === String(got);
    if (!ok) rejected.push(k + ': set ' + JSON.stringify(want) + ' but reads back ' + JSON.stringify(got));
  }
  return rejected;
};
window.__gqGeom = null;
// Even-odd point-in-polygon, for the hole-containment assertion below (#74).
function __gqPointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const __gqPolyArea = (c) => { let a = 0; for (let i = 0; i < c.length; i++) { const u = c[i], v = c[(i + 1) % c.length]; a += u.x * v.y - v.x * u.y; } return a * 0.5; };
// point -> distance to the nearest segment of a 3D polyline
function __gqDist3(p, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx*dx + dy*dy + dz*dz;
    let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + t*dx, qy = a.y + t*dy, qz = a.z + t*dz;
    const d = Math.hypot(p.x - qx, p.y - qy, p.z - qz);
    if (d < best) best = d;
  }
  return best;
}
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
  // SPINE CURL densifies the outline/rib-margin sampling the same way flower.js's
  // buildPetalInto does (outlineN there) — read via the same exported helpers so
  // this diagnostic can't drift from what the real renderer resolves to.
  const outlineN = G.spineCurlPeakRate(P) > 0
    ? Math.max(P.outlineSteps || 56, G.spineSampleCount(P))
    : (P.outlineSteps || 56);

  // MATERIAL BOUNDARY — the true cleft-aware outline of the printed material (closed
  // ring). buildSilhouette resolves clefts via the marching-squares contour.
  const material = buildSilhouette(P, outlineN);
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
      // #44: SPACECOL_LIVE_CAP (an input-side source-count cap) is gone from flower.js —
      // the real render path now passes the FULL source count on both live and export,
      // bounded instead by nodeBudget (an OUTPUT triangle budget). Match that exactly so
      // this gate measures the same network the renderer builds, not a stale proxy.
      else if (P.infillType === 'spacecol') veins = (getSpaceColonization(P, spaceColSeed(P, seed), { mode: P.spaceMode, sourceCount: P.spaceSourceCount, birthDist: P.spaceBirth, killDist: P.spaceKill, growthStep: P.spaceStep, seedPattern: P.spacePattern, nodeBudget: SC_NODE_BUDGET_LIVE }).veins) || [];
      else veins = (buildVenation(P, rng, { secondaries: P.secondaries, crossPerStrip: P.crossPerStrip, maxDepth: P.maxDepth, softness: P.softness, branchStart: P.branchStart, continuousMargin: P.continuousMargin }).veins) || [];
    } catch (e) { return { error: 'infill:' + e.message }; }
    if (cfg && veins.length) { try { veins = clipVeinsToMask(veins, P, cfg) || veins; } catch (e) {} }
    if ((P.infillType === 'veins' || P.infillType === 'bone' || P.infillType === 'spacecol') && P.edgeTermination && P.edgeTermination !== 'fade') {
      // Must match the real render path (flower.js's buildPetalInto) exactly: captures
      // onto ribMarginPolyline (the rib's actual inner edge), not 'material' (the true
      // outline) — using 'material' here was the gate's OWN stale copy of the bug this
      // metric exists to catch, pulling free tips out past where the rib really sits.
      try { const term = terminateEdges(veins, G.ribMarginPolyline(P, outlineN), P, P.edgeTermination, P.captureDist); for (const v of term.veins) veins.push(v); } catch (e) {}
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
  let holeEscapeCells = 0, holeEscapePoints = 0, holeZeroArea = 0, holeWithArea = 0, voronoiCells = 0;
  let voronoiCulled = 0, voronoiCulledDegenerate = 0, minCellAreaMM2 = null, selfCheck = null, tileRatio = null, tileVsMaterial = null, selfIntersectCells = 0, selfIntersectPairs = 0, isoEscMax = null, isoOkMin = null, isoOkP05 = null, qDump = null, dbEscMin = null, dbOkMax = null;
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
      // (7) THE HOLE IS INSIDE ITS OWN CELL — #74.
      //     addSlab pairs outer[k] with inner[k] and lofts the ring between them, so every
      //     inner[k] must lie inside its own outer ring. When it does not, the strut crosses
      //     its own hole. No other metric here can see it: boundary edges stay 0, the model
      //     stays connected, and the registration metric only ever looks at the OUTER ring.
      //
      //     ASSERTED ON THE OUTCOME, NOT ON STAR-SHAPEDNESS. Star-shapedness is a property
      //     cellAnnulus's centroid-ray construction happens to need, not the property that
      //     matters; a hole built along the boundary normal would be correct without it, and
      //     a gate written against the means would fail its own repair.
      //
      //     SPLIT BY CAUSE, because there are two and they need different fixes: a cell with
      //     ZERO AREA cannot contain anything (the ring is a collapsed sliver, and it lofts
      //     into zero-area triangles), while a cell WITH area whose hole still escapes is a
      //     containment failure of the offset itself.
      let escCells = 0, escPts = 0, escZeroArea = 0, escWithArea = 0;
      for (const slab of (vor.slabs || [])) {
        if (!slab.inner || slab.inner.length !== slab.outer.length) { escCells++; continue; }
        let bad = 0;
        for (const q of slab.inner) if (!__gqPointInPoly(q.x, q.y, slab.outer)) bad++;
        if (!bad) continue;
        escCells++; escPts += bad;
        if (Math.abs(__gqPolyArea(slab.outer)) < 1e-9) escZeroArea++; else escWithArea++;
      }
      holeEscapeCells = escCells; holeEscapePoints = escPts;
      holeZeroArea = escZeroArea; holeWithArea = escWithArea;
      voronoiCells = (vor.slabs || []).length;
      voronoiCulled = vor.culled || 0;
      voronoiCulledDegenerate = vor.culledDegenerate || 0;
      // (8) NO CELL IS DEGENERATE — the second assertion, and it is NOT implied by the
      //     first. A tiling check (sum of cell area over bound area) cannot see a
      //     collapsed cell: it contributes zero to the sum, so a diagram full of them
      //     still tiles at exactly 1.00. Two properties, two assertions — the first
      //     catches overlap, this one catches collapse, and neither catches the other.
      //     Reported in mm^2 because the threshold is a printability question.
      let smallest = Infinity;
      for (const slab of (vor.slabs || [])) {
        const a = Math.abs(__gqPolyArea(slab.outer));
        if (a < smallest) smallest = a;
      }
      minCellAreaMM2 = smallest === Infinity ? null : smallest * MM * MM;
      // (9) THE DIAGRAM IS A PARTITION. Sum of cell area over the area of the bound they
      //     were clipped to. A Voronoi diagram tiles: 1.00 or it is not a diagram. Above 1
      //     the cells OVERLAP, which no existing gate can see — boundary edges stay 0, the
      //     model stays connected, and overlapping slabs are simply redundant mesh in the
      //     export. Independent of the degeneracy assertion above and blind to it: a
      //     collapsed cell contributes zero to this sum, so a diagram full of them still
      //     tiles at exactly 1.00.
      //
      //     REPORTED, NOT GATED — deliberately, and this is not timidity. Every config in
      //     the shipped matrix tiles at exactly 1.000, INCLUDING lobed__voronoi. The one
      //     configuration that does not is LOBED with CONTINUOUS MARGIN OFF: sum 37.006
      //     against a 2.660 bound, ratio 13.912, and identical at anisotropy 1 and 4 — so
      //     whatever it is, it is not the per-seed metric. Two candidates remain and have
      //     NOT been separated: genuine cell overlap, or a shoelace area taken over
      //     self-intersecting rings, which would make the sum meaningless rather than
      //     alarming. Note margin-off is also where ribInnerEdge is the constant hoop
      //     radius subtracted from the binned envelope, which on a cleft petal can floor
      //     at the axis — a plausible source of a degenerate clip polygon, unverified.
      //     Gating a number nobody can yet interpret would either quarantine a config
      //     behind an xfail or invite someone to "fix" an artifact.
      let sumA = 0;
      for (const slab of (vor.slabs || [])) sumA += Math.abs(__gqPolyArea(slab.outer));
      const boundA = Math.abs(__gqPolyArea(G.ribMarginPolyline(P, 72)));
      tileRatio = boundA > 1e-12 ? +(sumA / boundA).toFixed(3) : null;
      // TILING AGAINST THE MATERIAL — the denominator that can actually see the defect.
      // Cells tiling the CLIP POLYGON faithfully give 1.000 even when the clip polygon is
      // the wrong region, which is why tileRatio above is 1.000 everywhere and useless
      // as an assertion. Against the MATERIAL the same sum is > 1 on overlap and < 1 on
      // void, and it catches both:
      //
      //   margin OFF, anisotropy 1:  smooth 0.981-0.990   lobed 1.220
      //   margin OFF, anisotropy 4:  smooth 0.981-0.990   lobed 16.966
      //
      // The lobed elevation at anisotropy 1 is cells spanning the sinuses; the 16.966 at
      // anisotropy 4 is genuine overlap from per-seed metrics (#73), and it is genuine
      // rather than a shoelace artifact because selfIntersectCells is 0 in every config.
      //
      // REPORTED, NOT GATED, and for a stated reason: with continuous margin ON the clip
      // is inset from the material by the rib radius, so a correct diagram lands at
      // 0.564-0.948 rather than 1.000. There is no threshold that means the same thing in
      // both margin modes. Gating this needs a rib-aware denominator — the inset material
      // — which is the cleft-aware bound that does not exist yet.
      const matA = Math.abs(__gqPolyArea(G.buildSilhouette(P, 200)));
      tileVsMaterial = matA > 1e-12 ? +(sumA / matA).toFixed(3) : null;
      // SELF-INTERSECTION CENSUS — the one test that separates 'genuine overlap' from
      // 'meaningless number'. A shoelace sum over a figure-eight returns nonsense with no
      // overlapping area behind it. Measured 0 cells and 0 crossing pairs in every config,
      // including lobed at anisotropy 4 where the tiling sum reaches 16.966x the material,
      // so that sum is real area and not an artifact of the measure.
      const segX = (a, b, c, d) => {
        const r1 = (b.x-a.x), r2 = (b.y-a.y), s1 = (d.x-c.x), s2 = (d.y-c.y);
        const den = r1*s2 - r2*s1; if (Math.abs(den) < 1e-14) return false;
        const t = ((c.x-a.x)*s2 - (c.y-a.y)*s1) / den;
        const u = ((c.x-a.x)*r2 - (c.y-a.y)*r1) / den;
        return t > 1e-9 && t < 1-1e-9 && u > 1e-9 && u < 1-1e-9;
      };
      // ISOPERIMETRIC CENSUS — one measure for both symptoms. Q = 4*pi*A / P^2: 1 for a
      // circle, ~0.78 for a square, and it collapses toward 0 as a cell grows a spike,
      // because the spike adds perimeter and no area. Measured here for every cell, split
      // by whether the cell's hole escapes, so the threshold is chosen from the gap
      // between the two populations rather than picked.
      //
      // MEASURED, and the gap is real but THIN at the extremes:
      //   config          escapes   Q max ESCAPING   Q min LEGITIMATE
      //   rounded            1          0.129            0.702
      //   pointed            1          0.116            0.638
      //   strap              2          0.007            0.616
      //   clawed             1          0.083            0.356
      //   lobed              3          0.327            0.603
      //   chrysanthemum      4          0.015            0.612
      //   preset:poppy       1          0.178            0.744
      //
      // Within any one config the two populations are separated by at least 1.8x. ACROSS
      // configs the window is narrow: the worst escaping cell (lobed, 0.327) and the worst
      // legitimate cell (clawed, 0.356) are 9% apart, so a single global threshold has to
      // land in that 0.327-0.356 band. That is enough to separate everything measured and
      // not enough to be comfortable, so the census ships REPORTED and the threshold is
      // not yet chosen. Recorded here rather than resolved by picking a round number.
      const isoQ = (poly) => { const A = Math.abs(__gqPolyArea(poly));
        let per = 0; for (let i = 0; i < poly.length; i++) { const u = poly[i], v = poly[(i+1)%poly.length];
          per += Math.hypot(v.x-u.x, v.y-u.y); }
        return per > 1e-12 ? (4 * Math.PI * A) / (per * per) : 0; };
      // DOUBLED-BACK CENSUS. The picture of the two threshold-deciding cells says Q is the
      // wrong measure: clawed's worst LEGITIMATE cell is a long thin TRIANGLE (low Q from
      // honest elongation, hole correctly inside), while lobed's best ESCAPING cell is a
      // compact quadrilateral WITH a zero-width spike. Q punishes both and cannot tell
      // them apart, which is what makes the global window only 9% wide.
      // What actually distinguishes them is whether the ring DOUBLES BACK on itself — a
      // spike is two ring sections lying on top of each other. That is one concept
      // covering a fully collapsed ring (doubled back everywhere) and a spiked wedge
      // (doubled back along the spike), and it does not penalise a thin cell at all.
      //
      // MEASURED, against the isoperimetric window it replaces:
      //   config          DB min ESCAPING   DB max LEGITIMATE     (Q window, for contrast)
      //   rounded             0.560              0.00              0.129 / 0.702
      //   pointed             0.632              0.00              0.116 / 0.638
      //   strap               0.792              0.00              0.007 / 0.616
      //   clawed              0.594              0.00              0.083 / 0.356
      //   lobed               0.765              0.00              0.327 / 0.603
      //   chrysanthemum       0.694              0.44              0.015 / 0.612
      //   preset:poppy        0.533              0.00              0.178 / 0.744
      //
      // Six of seven configs put EVERY legitimate cell at exactly 0, and the seventh is
      // NOT an exception — measured, chrysanthemum's 0.44 cell has 22 of its 50 ring
      // points EXACTLY coincident with a non-adjacent segment. It is a spiked cell whose
      // hole has not escaped yet, not a healthy cell being maligned: Q 0.7628 and a mean
      // width of 0.86 mm make it look entirely fine to both of the other measures.
      //
      // So the populations are 0 and >= 0.44, and THERE IS NO THRESHOLD TO PICK. Any
      // doubling back at all is a collapsed section. The criterion is db > 0, with the
      // only tolerance being the 1e-6 coincidence distance below — no magic number, and
      // no gap for the next design to straddle.
      //
      // This is also strictly STRONGER than the escape test it replaces: it catches every
      // cell that escapes, plus the latent ones like chrysanthemum's that will escape once
      // the spike outgrows the strut.
      const doubledBack = (poly) => {
        const n = poly.length; let hit = 0;
        const d2seg = (p, a, b) => { const dx = b.x-a.x, dy = b.y-a.y, L2 = dx*dx+dy*dy;
          let t = L2 ? ((p.x-a.x)*dx + (p.y-a.y)*dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = a.x+dx*t, qy = a.y+dy*t; return (p.x-qx)**2 + (p.y-qy)**2; };
        const SKIP = 3;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const gap = Math.min(Math.abs(i-j), n - Math.abs(i-j));
            if (gap <= SKIP) continue;
            if (d2seg(poly[i], poly[j], poly[(j+1)%n]) < 1e-12) { hit++; break; }
          }
        }
        return hit / n;
      };
      const dbEsc = [], dbOk = [];
      const qEsc = [], qOk = [];
      for (const slab of (vor.slabs || [])) {
        let bad = 0;
        if (slab.inner && slab.inner.length === slab.outer.length)
          for (const q of slab.inner) if (!__gqPointInPoly(q.x, q.y, slab.outer)) bad++;
        (bad ? qEsc : qOk).push(isoQ(slab.outer));
        (bad ? dbEsc : dbOk).push(doubledBack(slab.outer));
      }
      // capture the two cells that decide the global threshold: the worst-Q legitimate
      // cell and the best-Q escaping one. Whether the window is really 9% wide depends on
      // what those two actually are.
      if (window.__qDump !== false) {
        let worstOk = null, bestEsc = null;
        for (const slab of (vor.slabs || [])) {
          let bad = 0;
          if (slab.inner && slab.inner.length === slab.outer.length)
            for (const q of slab.inner) if (!__gqPointInPoly(q.x, q.y, slab.outer)) bad++;
          const q = isoQ(slab.outer);
          if (bad) { if (!bestEsc || q > bestEsc.q) bestEsc = { q, outer: slab.outer, inner: slab.inner }; }
          else if (!worstOk || q < worstOk.q) worstOk = { q, outer: slab.outer, inner: slab.inner };
        }
        // also the worst DOUBLED-BACK legitimate cell — the one that decides whether the
        // db window is 0.44-0.533 or 0-0.533.
        let worstDbOk = null;
        for (const slab of (vor.slabs || [])) {
          let bad = 0;
          if (slab.inner && slab.inner.length === slab.outer.length)
            for (const q of slab.inner) if (!__gqPointInPoly(q.x, q.y, slab.outer)) bad++;
          if (bad) continue;
          const db = doubledBack(slab.outer);
          if (!worstDbOk || db > worstDbOk.db) worstDbOk = { db, q: isoQ(slab.outer), outer: slab.outer, inner: slab.inner };
        }
        qDump = { worstOk, bestEsc, worstDbOk };
      }
      qEsc.sort((a,b)=>a-b); qOk.sort((a,b)=>a-b);
      dbEsc.sort((a,b)=>a-b); dbOk.sort((a,b)=>a-b);
      dbEscMin = dbEsc.length ? +dbEsc[0].toFixed(4) : null;
      dbOkMax  = dbOk.length  ? +dbOk[dbOk.length-1].toFixed(4) : null;
      isoEscMax = qEsc.length ? +qEsc[qEsc.length-1].toFixed(5) : null;
      isoOkMin  = qOk.length  ? +qOk[0].toFixed(5) : null;
      isoOkP05  = qOk.length  ? +qOk[Math.floor(qOk.length*0.05)].toFixed(5) : null;
      let siCells = 0, siPairs = 0;
      for (const slab of (vor.slabs || [])) {
        const R = slab.outer, n = R.length; let hit = 0;
        for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          if (segX(R[i], R[(i+1)%n], R[j], R[(j+1)%n])) hit++;
        }
        if (hit) { siCells++; siPairs += hit; }
      }
      selfIntersectCells = siCells; selfIntersectPairs = siPairs;
      // SELF-CHECK. A measurement tool that does not assert its own validity reports
      // whatever it happens to compute — this gate spent three rounds reporting zeros from
      // a shadowed declaration before that was noticed. If the classification does not
      // account for every escaping cell, the split is lying and the run is void, not odd.
      if (escZeroArea + escWithArea !== escCells) {
        selfCheck = 'hole classification lost cells: ' + escZeroArea + ' + ' + escWithArea + ' != ' + escCells;
      }
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

  // (6) RIM TREATMENT AMPLITUDE — is the tooth/scallop displacement present in the
  //     edge the renderer ACTUALLY lofts? Every other metric here is blind to this:
  //     margin fidelity compares the rim against the SMOOTH material boundary, which
  //     a discarded treatment matches perfectly. TOOTHED and SCALLOPED shipped inert
  //     under continuous margin for weeks because nothing measured the one thing that
  //     distinguishes them from CLEAN (issue #53).
  //     Method: build the rim the render path builds (buildJaggedEdge / buildScallopEdge
  //     when the hoop is drawn, the marginal strands when continuous margin is on), map
  //     both it and the untreated outline onto the surface, and take the largest
  //     excursion of the lofted rim away from the untreated one over the tip region.
  //     The floor is deliberately far below the real reach (teeth at TIP LENGTH 0.4
  //     travel ~5 mm, scallops at HEIGHT 0.8 ~7 mm) and far above zero: this asks "is
  //     the treatment there at all", not "is it exactly this tall", so it does not
  //     re-implement the amplitude constants as a second definition of them.
  let treatmentAmpMM = null;
  if (P.tipStyle === 'jagged' || P.tipStyle === 'scallop') {
    try {
      const spine3 = G.buildSpine(P);
      const jag = G.buildJaggedEdge(P, spine3, mulberry32((seed ^ 0x9e3779b9) >>> 0)) || G.buildScallopEdge(P, spine3);
      const smooth3 = material.map((p) => G.mapPointToSurface(p, P, spine3));
      const drawRim3 = !(P.infillType === 'bone' && P.boneOutline === false) && !contMargin;
      // Under continuous margin the strands legitimately leave the outline near the
      // foot (the bundle/flare), which would read as a huge "treatment" — so there the
      // measurement is restricted to the same tip region marginGap uses, using the
      // flattened points where u is known. The hoop rim has no flare, so it is measured
      // whole.
      let lofted = [];
      if (contMargin) {
        // Assembled by the SAME function the renderer uses (treatedStrandPoints), not by
        // this hook's own idea of what a strand is — a gate modelling the rendered margin
        // itself is how a fixed renderer still reads as broken, and vice versa.
        for (const st of marginStrands(P)) {
          const pts = G.treatedStrandPoints(st.points, st.side, jag, P, (p) => G.mapPointToSurface(p, P, spine3));
          const uS = G.rimSpliceU(P, jag);
          const flatCount = st.points.filter((p) => (p.x / P.L) < uS).length;
          pts.forEach((q, i) => { if (i >= flatCount || (st.points[i] && st.points[i].x / P.L >= neck)) lofted.push(q); });
        }
      } else {
        lofted = (jag && drawRim3) ? jag.rim : smooth3;
      }
      let amp = 0;
      for (const q of lofted) { const d = __gqDist3(q, smooth3); if (d > amp) amp = d; }
      treatmentAmpMM = +(amp * MM).toFixed(3);
    } catch (e) { treatmentAmpMM = -1; }
  }

  // (5) RIB-PATH SPLIT INTEGRITY — ribPath cuts the boundary into its two halves at
  //     the contour's own y = 0 crossings. If that split is degenerate it falls back
  //     to the analytic envelope, which IS the pre-#50 defect: a rim that skips every
  //     sinus. The fallback is a real code path, so it is gated here rather than left
  //     to a console warning nobody reads — false on every shipped config today, and
  //     the thing that catches a future outline change that makes it trip.
  const rp = G.ribPath(P);
  const ribSplit = { fallback: !!rp.diag.fallback, crossings: rp.diag.crossings,
                     coverage: !!rp.diag.coverage, sidePure: !!rp.diag.sidePure };

  return { infill: P.infillType, cleftDepth: +(P.cleftDepth || 0).toFixed(2), contMargin, numLoops, marginClosed, ribSplit,
           tipStyle: P.tipStyle, treatmentAmpMM, boneOutline: P.boneOutline !== false,
           marginGapMM: +marginGapMM.toFixed(3), worstU: +worstU.toFixed(2), neck: +neck.toFixed(2),
           maxTurnDeg: +maxTurn.toFixed(1), p95TurnDeg: +p95Turn.toFixed(1),
           maxCurvDegMM: +maxCurv.toFixed(1), p95CurvDegMM: +p95Curv.toFixed(1),
           degree1, onMargin, atBase, freeEnds, marginPts: n, L: +P.L.toFixed(3),
           regOvershootMaxMM: +regOvershootMaxMM.toFixed(3), regUndershootMaxMM: +regUndershootMaxMM.toFixed(3),
           regUndershootMeanMM: +regUndershootMeanMM.toFixed(3), regWorstU: +regWorstU.toFixed(2),
           holeEscapeCells, holeEscapePoints, holeZeroArea, holeWithArea, voronoiCells,
           voronoiCulled, voronoiCulledDegenerate, minCellAreaMM2, selfCheck, tileRatio, tileVsMaterial, selfIntersectCells, selfIntersectPairs, isoEscMax, isoOkMin, isoOkP05, qDump, dbEscMin, dbOkMax };
};
// A preset is a full design; load it through applyDesign (merge over DEFAULTS) so its
// petal params are set cleanly, not layered on the previous config's partial state.
window.__gqApply = function(d) { applyDesign(d); };

// ARRANGEMENT — issue #54 found the per-petal checks above measure the flattened petal
// only: resolveParams(ui) never reads bloomType, so every config in the shape x pattern
// matrix has always run under whatever bloomType happened to be selected, unvaried and
// unasserted. That is why a real placement defect (or, as #54 turned out, a claim of one)
// could sit unchecked for 18 days: nothing here ever built a whorl. This calls
// buildLayerInto directly — the exact function flower.js's generate() calls, not a
// reimplementation of it — and checks the ARRANGEMENT invariants placement math must
// hold, per bloom type:
//   COILED / RADIAL — placements.length must equal the petal count actually requested.
//   BILATERAL       — every non-centre seedIdx must appear in exactly one mirror pair
//                      (az and -az, equal r/height/tilt — the fields buildPetalInto's
//                      transform consumes), and a centre petal (when on) must sit at
//                      az=0 exactly. expectedCount is recomputed here independently
//                      (2*bilPerSide + center), deliberately not read off the code under
//                      test — a census gate that trusted the formula it is checking
//                      would not have caught the formula being wrong.
window.__gqArrangement = function() {
  const ui = readUI();
  const P = resolveParams(ui);
  const acc = new MeshAccumulator();
  const layer = { index: 0, total: 1, scale: 1, dHeight: 0, dRot: 0, dBloom: 0 };
  const count = Math.max(1, Math.min(40, Math.round(ui.petalCount) || 1));
  let built;
  try { built = buildLayerInto(acc, ui, P, count, layer); }
  catch (e) { return { error: 'buildLayerInto:' + e.message }; }
  const placements = built.placements;
  const bloomType = ui.bloomType;
  const out = { bloomType, count: placements.length, mirrorFailures: [], centerFailures: [] };
  if (bloomType === 'bilateral') {
    const bilPerSide = Math.max(1, Math.min(3, Math.round(ui.bilPerSide)));
    const bilCenter = !!ui.bilCenterPetal;
    out.expectedCount = 2 * bilPerSide + (bilCenter ? 1 : 0);
    const bySeed = new Map();
    for (const pl of placements) { const arr = bySeed.get(pl.seedIdx) || []; arr.push(pl); bySeed.set(pl.seedIdx, arr); }
    for (const [seedIdx, arr] of bySeed) {
      if (seedIdx === 0 && bilCenter) {
        if (arr.length !== 1) out.centerFailures.push('seedIdx 0: expected 1 centre placement, got ' + arr.length);
        else if (Math.abs(arr[0].az) > 1e-9) out.centerFailures.push('centre petal az=' + arr[0].az + ', expected 0');
        continue;
      }
      if (arr.length !== 2) { out.mirrorFailures.push('seedIdx ' + seedIdx + ': expected a mirror pair (2), got ' + arr.length); continue; }
      const [a, b] = arr;
      const azSum = a.az + b.az;               // should cancel exactly: az and -az
      const azOk = Math.abs(azSum) < 1e-9 && Math.abs(a.az) > 1e-9;
      const rOk = Math.abs(a.r - b.r) < 1e-9;
      const heightOk = Math.abs((a.footHeight ?? 0) - (b.footHeight ?? 0)) < 1e-9;
      if (!azOk) out.mirrorFailures.push('seedIdx ' + seedIdx + ': az ' + a.az + ' / ' + b.az + ' do not mirror (sum=' + azSum + ')');
      if (!rOk) out.mirrorFailures.push('seedIdx ' + seedIdx + ': r mismatch ' + a.r + ' vs ' + b.r);
      if (!heightOk) out.mirrorFailures.push('seedIdx ' + seedIdx + ': footHeight mismatch ' + a.footHeight + ' vs ' + b.footHeight);
      // WORLD-SPACE footprint check — the actual transform outcome buildPetalInto/
      // placePoint produced, not just the placement inputs above. A foot sample is
      // {az, r, y} in world cylindrical coords; a mirror pair's feet must overlay
      // exactly (r, y equal; az negated), or the placed petal itself — not merely its
      // inputs — is not a mirror image of its partner. petalBaseFootprint samples each
      // spine step at [+margin, -margin] (indices 2k, 2k+1); mirroring an azimuth flips
      // the surface frame's handedness, so petal A's +margin at step k lines up with
      // petal B's -margin at the SAME step (index 2k+1), not its own index — confirmed
      // by direct inspection (r/y matched exactly pairwise; az only matched cross-margin).
      // Pairing index-for-index here would flag the correct geometry as broken.
      if (a.foot && b.foot && a.foot.length === b.foot.length) {
        let footBad = 0;
        for (let i = 0; i < a.foot.length; i++) {
          const fa = a.foot[i], fb = b.foot[i % 2 === 0 ? i + 1 : i - 1];
          const ok = Math.abs(fa.r - fb.r) < 1e-6 && Math.abs(fa.y - fb.y) < 1e-6 && Math.abs(fa.az + fb.az) < 1e-6;
          if (!ok) footBad++;
        }
        if (footBad) out.mirrorFailures.push('seedIdx ' + seedIdx + ': ' + footBad + '/' + a.foot.length + ' world-space foot samples do not mirror');
      } else if (a.foot || b.foot) {
        out.mirrorFailures.push('seedIdx ' + seedIdx + ': foot sample count mismatch');
      }
    }
  } else {
    out.expectedCount = count === 1 ? 1 : count;
  }
  return out;
};
window.__gqReady = true;
`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/flower.html';
  const abs = path.join(ROOT, u);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    if (abs.endsWith('flower.js')) res.end(buf.toString('utf8') + '\n' + GQ_HOOK); else res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const THREE_VERSION = '0.161.0';
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.route('**/cdn.jsdelivr.net/**', (route) => {
  const m = route.request().url().match(new RegExp('three@' + THREE_VERSION.replace(/\./g, '\\.') + '/(.*)$'));
  if (!m) return route.continue();
  try { return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(THREE_DIR, m[1])) }); }
  catch { return route.fulfill({ status: 404, body: 'nf' }); }
});
await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction('window.__gqReady === true', { timeout: 30000 });
// ADVANCED. In Standard the tier rewrites tipStyle 'jagged'/'scallop' back to 'clean'
// (ADV_OPTIONS in flower.js), so a tooth config set in Standard would silently measure a
// CLEAN petal. __gqSet's read-back would now catch that as a hard failure rather than a
// green row — this switch is what lets the tooth configs mean what they say.
await page.evaluate(() => { const t = document.getElementById('advancedToggle'); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); } });
await page.waitForTimeout(300);

const rows = [];
let fails = 0, xfails = 0, xpasses = 0;
const ledger = {};   // issue ref -> { total, failing }
console.log(`config`.padEnd(20), 'gapMM'.padStart(7), 'p95Curv'.padStart(8), 'maxTurn'.padStart(8), 'loops'.padStart(6), 'free'.padStart(5), 'overMM'.padStart(7), 'underMM'.padStart(8), 'rimAmp'.padStart(7), 'holeEsc'.padStart(8), 'cullDgn'.padStart(8), 'cullMin'.padStart(8), 'minAmm2'.padStart(8), 'tile'.padStart(6), 'tileMat'.padStart(8), 'selfX'.padStart(6), '  verdict');
for (const cfg of CONFIGS) {
  let rejected = [];
  if (cfg.preset) await page.evaluate((d) => window.__gqApply(d), cfg.ui);
  else rejected = await page.evaluate((ui) => window.__gqSet(ui), cfg.ui);
  if (rejected && rejected.length) {
    // Not a geometry failure — a harness failure. Reported loudly and counted as a
    // FAIL, because the alternative is a green row measuring a petal nobody asked for.
    console.log(cfg.name.padEnd(20), 'CONFIG DID NOT TAKE — ' + rejected.join('; '));
    rows.push({ name: cfg.name, error: 'config-rejected: ' + rejected.join('; ') });
    fails++; continue;
  }
  if (cfg.arrangement) {
    const a = await page.evaluate(() => window.__gqArrangement());
    if (a.error) { console.log(cfg.name.padEnd(20), 'ERROR', a.error); rows.push({ name: cfg.name, error: a.error }); fails++; continue; }
    const countOk = a.count === a.expectedCount;
    const mirrorOk = a.mirrorFailures.length === 0 && a.centerFailures.length === 0;
    const bad = !countOk || !mirrorOk;
    const reasons = [!countOk ? `count(${a.count}!=${a.expectedCount})` : '', ...a.mirrorFailures, ...a.centerFailures].filter(Boolean).join(' | ');
    const verdict = bad ? `FAIL(${reasons})` : 'ok';
    if (bad) fails++;
    rows.push({ name: cfg.name, ...a, verdict });
    console.log(cfg.name.padEnd(20), String(a.count).padStart(7), a.bloomType.padStart(8), ('exp ' + a.expectedCount).padStart(8), '', '', '', '', '', '  ' + verdict);
    continue;
  }
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
  // The rib-path split either held or the rim silently reverted to the pre-#50
  // envelope. There is no tolerance to set here: it is a boolean, and it is hard.
  // #74: hard and zero-tolerance, on the UNIFIED criterion. A cell that doubles back on
  // itself has a collapsed section, whether or not its hole has escaped through it yet.
  const badHole = (q.dbEscMin != null || (q.dbOkMax || 0) > 0);
  // The second assertion: no emitted cell is degenerate. Independent of the first — a
  // collapsed cell adds nothing to a tiling sum, so a partition check is blind to it.
  // The threshold catches COLLAPSE, not smallness: the smallest legitimate cell in this
  // matrix is 0.069 mm^2 (chrysanthemum), so 1e-4 sits ~700x below anything real while
  // still being ~150x above the builder's own degeneracy cull. A threshold set near the
  // smallest real cell would fail the next design that is legitimately denser.
  const badDegenerate = q.infill === 'voronoi' && q.minCellAreaMM2 != null && q.minCellAreaMM2 < T.minCellAreaMM2;
  // The gate's own validity. Not a geometry failure; a failure to be measuring anything.
  const badSelf = !!q.selfCheck;
  const badSplit = !q.ribSplit || q.ribSplit.fallback || !q.ribSplit.coverage || !q.ribSplit.sidePure;
  // A selected rim treatment must be present in the geometry that actually gets lofted.
  // Applies wherever a rim is drawn at all — BONE with the outline off has no rim to
  // carry it, and is exempt for that reason and no other.
  const rimBearing = !(q.infill === 'bone' && q.boneOutline === false);
  const badTreat = (q.tipStyle === 'jagged' || q.tipStyle === 'scallop') && rimBearing
                   && !(q.treatmentAmpMM >= T.treatmentAmpMM);
  const bad = badFidelity || badSmooth || badEnds || badOvershoot || badUndershoot || badSplit || badTreat || badHole || badDegenerate || badSelf;
  const reasons = [badFidelity ? 'fidelity' : '', badSmooth ? 'smooth' : '', badEnds ? 'ends' : '', badOvershoot ? 'overshoot' : '', badUndershoot ? 'undershoot' : '', badSplit ? 'ribsplit' : '', badTreat ? 'rimtreat' : '', badHole ? `doubledBack(escaping ${q.holeEscapeCells}/${q.voronoiCells}, worst latent ${q.dbOkMax})` : '', badDegenerate ? `degenerate(min ${q.minCellAreaMM2}mm2 < ${T.minCellAreaMM2})` : '', badSelf ? `SELFCHECK(${q.selfCheck})` : ''].filter(Boolean).join(',');
  let verdict;
  if (cfg.xfail) {
    const s = ledger[cfg.xfail] || (ledger[cfg.xfail] = { total: 0, failing: 0 });
    s.total++;
    if (bad) { s.failing++; xfails++; verdict = `xfail(${cfg.xfail}:${reasons})`; }        // known, tracked — not a build failure
    else { xpasses++; verdict = `XPASS(${cfg.xfail})`; }                                    // quarantined config now passes
  } else if (bad) { verdict = `FAIL(${reasons})`; fails++; }                               // real regression — breaks the build
  else verdict = 'ok';
  rows.push({ name: cfg.name, xfail: cfg.xfail || null, ...q, verdict });
  console.log(cfg.name.padEnd(20), String(q.marginGapMM).padStart(7), String(q.p95CurvDegMM).padStart(8), String(q.maxTurnDeg).padStart(8), String(q.numLoops).padStart(6), String(q.freeEnds).padStart(5), String(q.regOvershootMaxMM).padStart(7), String(q.regUndershootMaxMM).padStart(8), String(q.treatmentAmpMM == null ? '-' : q.treatmentAmpMM).padStart(7), String(q.infill === 'voronoi' ? `${q.holeEscapeCells}/${q.voronoiCells}` : '-').padStart(8), String(q.infill === 'voronoi' ? q.voronoiCulledDegenerate : '-').padStart(8), String(q.infill === 'voronoi' ? q.voronoiCulled : '-').padStart(8), String(q.minCellAreaMM2 == null ? '-' : q.minCellAreaMM2.toFixed(3)).padStart(8), String(q.tileRatio == null ? '-' : q.tileRatio).padStart(6), String(q.tileVsMaterial == null ? '-' : q.tileVsMaterial).padStart(8), String(q.infill === 'voronoi' ? q.selfIntersectCells : '-').padStart(6), '  ' + verdict);
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
console.log(`\n${okCount} ok, ${xfails} xfail, ${xpasses} xpass, ${fails} FAIL / ${CONFIGS.length}. thresholds: marginGap<=${T.marginGapMM}mm p95Curv<=${T.p95CurvDegMM}deg/mm freeEnds<=${T.freeEnds} marginClosed=true regOvershoot<=${T.regOvershootMM}mm regUndershoot(voronoi)<=${T.regUndershootVoronoiMM}mm ribSplit=held rimTreatment>=${T.treatmentAmpMM}mm noDoubledBackCells minCellArea>${T.minCellAreaMM2}mm2 (#74)`);
await browser.close(); server.close();
process.exit(REPORT_ONLY ? 0 : ((fails || debtBreaks) ? 1 : 0));
