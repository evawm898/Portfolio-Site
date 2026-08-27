/*
 * verify-flower-export.mjs — print-safety gate for the Flower Bloom generator.
 *
 * WHY: STL export + watertight/manifold geometry are a hard, non-negotiable
 * requirement for the flower generator (see CLAUDE.md). A change can look
 * perfect on screen and still export broken geometry, so every geometry change
 * must be checked by actually exporting an STL and inspecting it. This script
 * does that headlessly.
 *
 * WHAT IT DOES: serves the repo, loads /flower.html in headless Chromium, and
 * for a range of configurations clicks "Export STL", captures the downloaded
 * binary STL, and asserts it has ZERO boundary edges (i.e. it encloses a
 * volume — printable). Exits non-zero if any configuration fails.
 *
 * REQUIREMENTS (dev-only; the deployed site needs none of this):
 *   npm i three@0.161.0 playwright-core        # both are npm-registry allowlisted
 * The flower page imports three from a CDN; this script intercepts that request
 * and serves the npm copy from node_modules/three so it runs fully offline.
 * Keep the pinned three version in sync with the importmap in flower.html.
 *
 * BROWSER: uses Chromium via playwright-core. Set CHROMIUM_EXECUTABLE to point
 * at a chrome binary, else it auto-detects a pre-installed one, else it falls
 * back to playwright-core's default resolution.
 *
 * RUN:  node tools/verify-flower-export.mjs           # full matrix (all configs)
 *       node tools/verify-flower-export.mjs --smoke   # smoke subset only (see isSmoke() below)
 * When you add a geometry feature, add a config below that exercises it. If it's a
 * likely-to-break case (heaviest, a new junction/margin combo, a new fragile shape),
 * flag it smoke:true too.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';   // must match the importmap in flower.html
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };


// Boundary/non-manifold/connectivity analysis of a binary STL. Vertices are
// quantised so coincident corners of adjacent closed shells weld; an undirected
// edge used by exactly one triangle is a boundary (open) edge — the failure we
// guard against. `shells` is the connected-component count over that same welded
// vertex graph (union-find).
//
// IMPORTANT — what `shells` does and does NOT measure: this codebase's geometry
// is built from many individually-closed primitives (tube segments, beads, slab
// panels) that physically INTERPENETRATE rather than share welded vertices —
// CLAUDE.md is explicit that "overlapping closed shells are fine, the slicer
// unions them." A vertex-welding graph cannot see that kind of fusion, so
// `shells` is always in the hundreds-to-thousands range even for correct,
// print-safe designs (measured: min 15, max 26684 across the full sweep, all
// boundary=0). It is NOT a connected-solid gate — see the report-only note where
// it's printed below for why, and what a real one would need to measure instead.
function analyzeStl(buf) {
  const tris = buf.readUInt32LE(80);
  const edges = new Map();
  const q = (x) => Math.round(x * 1e4) / 1e4;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  // Union-find over quantised vertex keys — the same weld precision `edges`
  // already uses, so a shell only counts as fused to its neighbour where the
  // mesh actually welds, not merely where two shells happen to sit close.
  const parent = new Map();
  const root = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); let c = x; while (parent.get(c) !== r) { const next = parent.get(c); parent.set(c, r); c = next; } return r; };
  const union = (a, b) => { const ra = root(a), rb = root(b); if (ra !== rb) parent.set(ra, rb); };

  let off = 84;
  for (let i = 0; i < tris; i++) {
    off += 12; // skip normal
    const v = [];
    for (let k = 0; k < 3; k++) { v.push(q(buf.readFloatLE(off)) + ',' + q(buf.readFloatLE(off + 4)) + ',' + q(buf.readFloatLE(off + 8))); off += 12; }
    off += 2; // attribute byte count
    for (const p of v) if (!parent.has(p)) parent.set(p, p);
    union(v[0], v[1]); union(v[1], v[2]);
    for (let k = 0; k < 3; k++) { const e = key(v[k], v[(k + 1) % 3]); edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0, nonManifold = 0;
  for (const c of edges.values()) { if (c === 1) boundary++; else if (c > 2) nonManifold++; }
  const roots = new Set();
  for (const v of parent.keys()) roots.add(root(v));
  const shells = tris > 0 ? roots.size : 0;
  return { tris, boundary, nonManifold, shells };
}

// --smoke: every config's mutations still get applied in order (cumulative state must
// stay byte-identical to the full run — see the loop below), but only configs flagged
// smoke:true (or preset:true — presets are always smoke-worthy, see below) actually
// export+analyze. Picked for what's most likely to break, not for a tidy sample:
//   - heavy Growth (space colonization) — a dense/RANDOM-pattern config, not the
//     42-petal/closed-mode extreme: that combo is a currently-open crash (issue #44,
//     ~27M live tris, browser dies on export) and belongs in a regression fixture once
//     it's actually fixed, not in a gate that every PR has to sit through red for a bug
//     nobody touched. Don't re-add a max-petal/closed-mode config here without checking
//     #44 first.
//   - continuous margin ON (the SDF receptacle is a separate polygonised solid
//     overlapping the feet/stem — its own registration surface)
//   - the cleft/Lobed configs — the project's historically fragile margin area
//     (the unsealed sinus, fixed in PR #50)
//   - all 7 shipped presets — what a visitor actually clicks; a preset break is
//     user-facing and gets caught on every PR, not just on dispatch/schedule
// Full 142-config matrix still runs on workflow_dispatch and a schedule.
const argv = process.argv.slice(2);
const SMOKE = argv.includes('--smoke');
const isSmoke = (cfg) => !!(cfg.smoke || cfg.preset);

// Each config: a label + UI mutations {id, value, evt}. 'change' for <select>,
// 'input' (default) for sliders. Applied on top of the previous config's state.
const CONFIGS = [
  { label: 'default (veins)', set: [] },
  { label: 'voronoi', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }] },
  { label: 'strands', set: [{ id: 'infillType', value: 'strands', evt: 'change' }] },
  { label: 'bone', set: [{ id: 'infillType', value: 'bone', evt: 'change' }] },
  { label: 'veins FADE (legacy termination)', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'fade', evt: 'change' }] },
  { label: 'veins MEET termination', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' }] },
  { label: 'veins LOOP termination', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'loop', evt: 'change' }] },
  { label: 'bone MEET termination', set: [{ id: 'infillType', value: 'bone', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' }] },
  { label: 'voronoi Lloyd 0 (legacy)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'voronoiLloyd', value: '0' }] },
  { label: 'voronoi Lloyd 20 (max relax) + serrated', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'voronoiLloyd', value: '20' }] },
  { label: 'voronoi shared grammar (aniso + density law + weight + slab taper)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'density', value: '10' }, { id: 'voronoiAniso', value: '2.5' }, { id: 'voronoiDensityLaw', value: '1' }, { id: 'voronoiWeight', value: '1' }, { id: 'voronoiWeightFalloff', value: '1.5' }, { id: 'voronoiSlabTaper', value: '0.6' }] },
  { label: 'space colonization CLOSED (loops) + LOOP termination', set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }, { id: 'spaceMode', value: 'closed', evt: 'change' }] },
  { label: 'space colonization OPEN (tree) + MEET termination', set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }, { id: 'spaceMode', value: 'open', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' }] },
  { label: 'space colonization dense + RANDOM pattern + serrated', smoke: true, set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }, { id: 'spaceMode', value: 'closed', evt: 'change' }, { id: 'spaceDensity', value: '0.9' }, { id: 'spacePattern', value: 'random', evt: 'change' }, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipLength', value: '0.4' }] },
  { label: '+ strap sepals', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'strap', evt: 'change' }] },
  { label: '+ solid sepals', set: [{ id: 'sepalStyle', value: 'solid', evt: 'change' }] },
  { label: 'full plant (FLARE/SOLID receptacle + stem + solid sepals)', set: [{ id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'receptConstruction', value: 'solid', evt: 'change' }, { id: 'receptCollar', value: 'none', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: 'receptacle CONE/RIBBED (ex-ironwork) + stem', set: [{ id: 'receptProfile', value: 'cone', evt: 'change' }, { id: 'receptConstruction', value: 'ribbed', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'ribMultiplier', value: '1.5' }, { id: 'spiralTightness', value: '0.7' }, { id: 'spiralThickness', value: '0.6' }] },
  { label: 'receptacle RIBBED dense + thin ribs (min feature)', set: [{ id: 'receptProfile', value: 'cone', evt: 'change' }, { id: 'receptConstruction', value: 'ribbed', evt: 'change' }, { id: 'ribMultiplier', value: '3' }, { id: 'receptSolidity', value: '1' }, { id: 'spiralTightness', value: '1' }, { id: 'spiralThickness', value: '0' }] },
  { label: 'receptacle DOME/SOLID (ex-bulb) + stem', set: [{ id: 'receptProfile', value: 'dome', evt: 'change' }, { id: 'receptConstruction', value: 'solid', evt: 'change' }, { id: 'ribMultiplier', value: '1' }, { id: 'spiralThickness', value: '0.5' }, { id: 'bulbSize', value: '0.7' }, { id: 'bulbHeight', value: '0.7' }] },
  { label: 'receptacle CONE/RIBBED (ex-soft; GATHERED retired) + open solidity', set: [{ id: 'receptProfile', value: 'cone', evt: 'change' }, { id: 'receptConstruction', value: 'ribbed', evt: 'change' }, { id: 'receptSolidity', value: '0.3' }, { id: 'blendSmoothness', value: '0.8' }] },
  { label: '+ 3 layers (uniform count)', set: [{ id: 'layerCount', value: '3' }] },
  { label: '+ 4 layers, per-layer counts (rose/peony)', set: [{ id: 'layerCount', value: '4' }, { id: 'petalsPerLayer', value: '6,10,14,18' }] },
  { label: 'petal cup +1 (cupped, single layer)', set: [{ id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'petalCup', value: '1' }] },
  { label: 'petal cup -1 (reflexed) + solid sepals', set: [{ id: 'petalCup', value: '-1' }] },
  { label: 'radial rosette (flat, no sphere)', set: [{ id: 'petalCup', value: '0' }, { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '8' }] },
  { label: 'edge noise 0.7 on CLEAN tip', set: [{ id: 'bloomType', value: 'coiled', evt: 'change' }, { id: 'petalCount', value: '4' }, { id: 'edgeNoise', value: '0.7' }, { id: 'edgeNoiseScale', value: '0.6' }] },
  { label: 'edge noise 1.0 dense + RUFFLED (peony edge)', set: [{ id: 'tipStyle', value: 'ruffled', evt: 'change' }, { id: 'edgeNoise', value: '1' }, { id: 'edgeNoiseScale', value: '1' }] },
  { label: 'stem nodes + thickness (prominent)', set: [{ id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'edgeNoise', value: '0' }, { id: 'edgeNoiseScale', value: '0' }, { id: 'stemNodeCount', value: '5' }, { id: 'stemNodeProminence', value: '1' }, { id: 'stemThickness', value: '2.2' }] },
  { label: 'tight side bud (veins)', set: [{ id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  { label: 'early-bloom side bud + voronoi infill', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'stemBudMode', value: 'early', evt: 'change' }] },
  { label: 'compound leaves (rose), alternate', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }, { id: 'stemNodeCount', value: '4' }, { id: 'stemThickness', value: '1' }, { id: 'leafType', value: 'compound', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'alternate', evt: 'change' }] },
  { label: 'lobed leaves (poppy), opposite', set: [{ id: 'leafType', value: 'lobed', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'opposite', evt: 'change' }] },
  { label: 'oval leaves, whorled + tight bud', set: [{ id: 'leafType', value: 'oval', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'whorled', evt: 'change' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  { label: 'narrow leaves, opposite (no bud)', set: [{ id: 'leafType', value: 'narrow', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'opposite', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }] },
  { label: 'center: DENSE CLUSTER (150 stamens) on full plant', set: [{ id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'edgeNoise', value: '0' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'centerArch', value: 'dense', evt: 'change' }, { id: 'denseStamenCount', value: '150' }] },
  { label: 'center: DISC (domed + ring stamens)', set: [{ id: 'centerArch', value: 'disc', evt: 'change' }, { id: 'discHeight', value: '0.8' }, { id: 'ringStamenCount', value: '60' }] },
  { label: 'center: PETALOID FILL ranunculus (tight bloom, small inner, 120)', set: [{ id: 'centerArch', value: 'petaloid', evt: 'change' }, { id: 'fillPetalCount', value: '120' }, { id: 'fillBloomAngle', value: '6' }, { id: 'fillOuterSize', value: '0.20' }, { id: 'fillInnerSize', value: '0.05' }, { id: 'fillDensity', value: '0.8' }] },
  { label: 'center: PETALOID FILL mum (open bloom, large inner) + lobed leaves', set: [{ id: 'centerArch', value: 'petaloid', evt: 'change' }, { id: 'fillPetalCount', value: '90' }, { id: 'fillBloomAngle', value: '60' }, { id: 'fillOuterSize', value: '0.26' }, { id: 'fillInnerSize', value: '0.22' }, { id: 'fillDensity', value: '0.4' }, { id: 'leafType', value: 'lobed', evt: 'change' }, { id: 'stemNodeCount', value: '3' }] },
  // Unified trunk (approach D) edge cases:
  // receptacle WITHOUT a stem — the lofted trunk must still seal (bottom cap at the neck).
  { label: 'trunk: receptacle only, no stem, high blend', set: [{ id: 'centerArch', value: 'classic', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'receptConstruction', value: 'solid', evt: 'change' }, { id: 'blendSmoothness', value: '1' }, { id: 'receptacleDepth', value: '0.8' }] },
  // many attachments (petals + solid sepals) + tight deep neck — drives the sector count M toward its cap.
  { label: 'trunk: 20 petals + solid sepals, tight deep neck + stem', set: [{ id: 'petalCount', value: '20' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'solid', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'blendSmoothness', value: '1' }, { id: 'convergenceTightness', value: '1' }, { id: 'receptacleDepth', value: '1' }, { id: 'stemThickness', value: '2.5' }, { id: 'stemNodeCount', value: '5' }, { id: 'stemNodeProminence', value: '1' }, { id: 'leafType', value: 'oval', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'whorled', evt: 'change' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  // SIDE-BUD RECEPTACLE: the bud gets its own scaled receptacle (buildTrunkInto in the
  // bud's own accumulator) when BOTH the receptacle dropdown and the side-bud dropdown
  // are on. Its neck bottom cap seals inside the offshoot tube (overlapping closed
  // shells) — must still export with zero boundary edges. Self-contained (sets every
  // relevant id) so it does not depend on carried state.
  { label: 'bud receptacle: early bud + blended receptacle + stem, deep neck', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'petalCount', value: '5' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'receptConstruction', value: 'solid', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'stemThickness', value: '1' }, { id: 'stemNodeCount', value: '0' }, { id: 'stemNodeProminence', value: '0' }, { id: 'blendSmoothness', value: '1' }, { id: 'receptacleDepth', value: '1' }, { id: 'convergenceTightness', value: '0.7' }, { id: 'stemBudMode', value: 'early', evt: 'change' }] },
  // low blend => sharpest bud flutes (highest sector count), plus the pricey voronoi bud.
  { label: 'bud receptacle: tight bud + voronoi + sharp flutes (low blend)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'blendSmoothness', value: '0' }, { id: 'receptacleDepth', value: '0.6' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  // Stem length range now 0..10 (default 4). Exercise the new MAX and the 0 = no-stem edge.
  { label: 'stem length MAX (10) + receptacle + tight bud', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'blendSmoothness', value: '1' }, { id: 'receptacleDepth', value: '1' }, { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'receptConstruction', value: 'solid', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'stemLength', value: '10' }, { id: 'stemBudMode', value: 'tight', evt: 'change' }] },
  // stem length 0 with a stem + receptacle both enabled => no stem zone; the receptacle
  // must still seal at its neck (bottom cap) and export watertight.
  { label: 'stem length 0 (no stem) + receptacle enabled', set: [{ id: 'stemLength', value: '0' }, { id: 'stemBudMode', value: 'none', evt: 'change' }] },
  // Classic PISTIL with the new shape controls at extremes: max LENGTH (3), thickest
  // filament, largest + fully OBLONG stigma tip — exercises addOblongBead + the floor.
  { label: 'center: PISTIL long + thick + oblong tip (max)', set: [{ id: 'centerArch', value: 'classic', evt: 'change' }, { id: 'centerType', value: 'pistil', evt: 'change' }, { id: 'centerLength', value: '3' }, { id: 'centerFilThick', value: '1' }, { id: 'centerTipSize', value: '1' }, { id: 'centerTipShape', value: '1' }, { id: 'stemBudMode', value: 'none', evt: 'change' }] },
  // Classic STAMENS, THINNEST filament + oblong anthers — drives the export feature
  // floor on both the filament radius and the oblong bead minor radius.
  { label: 'center: STAMENS thin filament + oblong anthers', set: [{ id: 'centerType', value: 'stamens', evt: 'change' }, { id: 'centerFilThick', value: '0' }, { id: 'centerTipShape', value: '1' }, { id: 'centerTipSize', value: '0' }] },
  // Sepals with NO receptacle: bases now anchor to the stem-top surface (strap + stem).
  { label: 'sepals, no receptacle, stem-top attach (strap)', set: [{ id: 'centerLength', value: '0.5' }, { id: 'centerTipShape', value: '0' }, { id: 'centerFilThick', value: '0.5' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'strap', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' }] },
  // SERRATED modified-leaf sepals — the jagged tooth edge + per-tooth mid-veins on the
  // sepal blade must still export watertight (skeletal path, like a serrated petal).
  { label: 'sepals SERRATED (modified leaf) + stem', set: [{ id: 'sepalStyle', value: 'strap', evt: 'change' }, { id: 'sepalTipStyle', value: 'jagged', evt: 'change' }, { id: 'sepalTipShape', value: '0.95' }, { id: 'sepalTipFreq', value: '16' }, { id: 'sepalTipRegion', value: '0.6' }, { id: 'sepalTipLength', value: '0.7' }] },
  // CLAW / caryophyllaceous silhouette (kept LAST so the cumulative state these
  // configs set never leaks into the configs above). The first config resets the
  // scene back to a clean single-whorl petal so the claw cases stay interpretable.
  { label: 'CLAW veins (caryophyllaceous, L.35)', set: [{ id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'edgeCurve', value: '0' }, { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'clawLength', value: '0.35' }] },
  { label: 'CLAW voronoi + density law (neck crowds, floor culls)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'clawLength', value: '0.35' }, { id: 'voronoiDensityLaw', value: '1' }, { id: 'density', value: '10' }] },
  { label: 'CLAW strands', set: [{ id: 'infillType', value: 'strands', evt: 'change' }, { id: 'clawLength', value: '0.4' }] },
  { label: 'CLAW spacecol CLOSED', set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }, { id: 'spaceMode', value: 'closed', evt: 'change' }, { id: 'clawLength', value: '0.35' }] },
  { label: 'CLAW extreme: narrow neck + abrupt shoulder', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'clawLength', value: '0.5' }, { id: 'clawWidth', value: '0.05' }, { id: 'shoulder', value: '1' }] },
  { label: 'CLAW + edge-curve billow + jagged tip (outline compose)', set: [{ id: 'clawLength', value: '0.3' }, { id: 'clawWidth', value: '0.3' }, { id: 'shoulder', value: '0.5' }, { id: 'edgeCurve', value: '0.8' }, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipLength', value: '0.35' }] },
  { label: 'RELIEF radial (T-aligned) + voronoi', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'reliefAmp', value: '0.7' }, { id: 'reliefMode', value: 'radial', evt: 'change' }] },
  { label: 'RELIEF transverse fine + veins', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'reliefAmp', value: '0.8' }, { id: 'reliefFreq', value: '0.85' }, { id: 'reliefMode', value: 'transverse', evt: 'change' }] },
  { label: 'RELIEF irregular (bullate) + bone', set: [{ id: 'infillType', value: 'bone', evt: 'change' }, { id: 'reliefAmp', value: '0.7' }, { id: 'reliefMode', value: 'irregular', evt: 'change' }] },
  { label: 'TWIST + SKEW + asymmetric edge noise', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'petalTwist', value: '0.7' }, { id: 'petalSkew', value: '0.5' }, { id: 'edgeNoise', value: '0.6' }, { id: 'edgeNoiseScale', value: '0.5' }] },
  { label: 'THICKNESS knife edge (b) + voronoi', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'thickEdge', value: '1' }] },
  { label: 'THICKNESS taper + knife + thin global', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'thickTaper', value: '1' }, { id: 'thickEdge', value: '1' }, { id: 'thickScale', value: '0.6' }] },
  { label: 'THICKNESS knife on SOLID leaf blade (b, per-vertex)', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'stemNodeCount', value: '3' }, { id: 'leafType', value: 'oval', evt: 'change' }, { id: 'leafPhyllotaxy', value: 'alternate', evt: 'change' }, { id: 'thickEdge', value: '1' }, { id: 'thickTaper', value: '0.8' }] },
  { label: 'SURFACE all: relief + twist + skew + knife', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'reliefAmp', value: '0.6' }, { id: 'petalTwist', value: '0.5' }, { id: 'petalSkew', value: '0.4' }, { id: 'thickTaper', value: '0.8' }, { id: 'thickEdge', value: '1' }] },
  { label: 'reset to a clean single petal (for LOBED block)', smoke: true, set: [{ id: 'petalCount', value: '1' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'density', value: '7' }, { id: 'voronoiAniso', value: '1' }, { id: 'voronoiDensityLaw', value: '0' }, { id: 'voronoiLloyd', value: '8' }, { id: 'voronoiWeight', value: '0' }, { id: 'voronoiWeightFalloff', value: '1.5' }, { id: 'voronoiSlabTaper', value: '0' }, { id: 'reliefAmp', value: '0' }, { id: 'petalTwist', value: '0' }, { id: 'petalSkew', value: '0' }, { id: 'thickTaper', value: '0' }, { id: 'thickEdge', value: '0' }, { id: 'thickScale', value: '1' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' }, { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' }] },
  { label: 'LOBED bifid voronoi (cleft 0.5)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '2' }] },
  { label: 'LOBED bifid veins + LOOP termination', smoke: true, set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '2' }, { id: 'edgeTermination', value: 'loop', evt: 'change' }] },
  { label: 'LOBED ragged robin (4 lobes, cleft 0.55) veins', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' }, { id: 'cleftDepth', value: '0.55' }, { id: 'cleftLobes', value: '4' }, { id: 'cleftWidth', value: '0.35' }] },
  { label: 'LOBED 4-lobe voronoi + anisotropy (per-point T metric)', smoke: true, set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '4' }, { id: 'voronoiAniso', value: '2.5' }, { id: 'voronoiDensityLaw', value: '1' }, { id: 'density', value: '5' }] },
  { label: 'LOBED fringed (7 lobes, cleft 0.6) veins', set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'cleftDepth', value: '0.6' }, { id: 'cleftLobes', value: '7' }, { id: 'cleftWidth', value: '0.4' }] },
  { label: 'LOBED bifid spacecol CLOSED', set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }, { id: 'spaceMode', value: 'closed', evt: 'change' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '2' }] },
  { label: 'LOBED bifid bone', set: [{ id: 'infillType', value: 'bone', evt: 'change' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '3' }] },
  // CLEFT DEPTH 0.5 x LOBE COUNT 2..7 — the full lobe-count range at a deep cleft, the
  // configuration PR #50's rim fix has to hold across: each strand is now a half of the real
  // material contour, so the number of sinuses it weaves through is the thing that varies.
  // Every one must still export with 0 boundary edges and 0 non-manifold edges.
  { label: 'LOBED depth 0.5 x 2 lobes (rim contour split)', smoke: true, set: [{ id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'cleftWidth', value: '0.3' }, { id: 'clawLength', value: '0' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '2' }] },
  { label: 'LOBED depth 0.5 x 3 lobes (rim contour split)', set: [{ id: 'cleftLobes', value: '3' }] },
  { label: 'LOBED depth 0.5 x 4 lobes (rim contour split)', set: [{ id: 'cleftLobes', value: '4' }] },
  { label: 'LOBED depth 0.5 x 5 lobes (rim contour split)', set: [{ id: 'cleftLobes', value: '5' }] },
  { label: 'LOBED depth 0.5 x 6 lobes (rim contour split)', set: [{ id: 'cleftLobes', value: '6' }] },
  { label: 'LOBED depth 0.5 x 7 lobes (rim contour split)', smoke: true, set: [{ id: 'cleftLobes', value: '7' }] },
  { label: 'LOBED + CLAW compose (Dianthus superbus)', smoke: true, set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'cleftDepth', value: '0.55' }, { id: 'cleftLobes', value: '5' }, { id: 'clawLength', value: '0.3' }] },
  // ===== CROSS-SECTION: rolls the flat blade into a channel / quill (flat ->
  // channelled -> quilled), with a second axis (TAPER) that opens the roll into a
  // spoon near one end. It is a pure per-point displacement through surfacePoint
  // (flower-geometry.js) — no new triangles for the default wire infill (veins),
  // so most of these exercise CORRECTNESS (seam normals at v=+-1, margin
  // registration, the solid-blade rolled end cap) rather than budget; the
  // high-petal-count and solid-sepal rows are the ones actually worth flagging.
  { label: 'reset to a clean strap petal (for CROSS-SECTION block)', smoke: true, set: [
    { id: 'petalShape', value: 'strap', evt: 'change' },
    { id: 'petalCount', value: '6' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' },
    { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' },
    { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' },
    { id: 'petalCup', value: '0' }, { id: 'crossSection', value: '0' }, { id: 'crossSectionTaper', value: '0' },
    { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' },
    { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' },
    { id: 'stemBudMode', value: 'none', evt: 'change' },
  ] },
  { label: 'CROSS-SECTION channelled (0.35)', set: [{ id: 'crossSection', value: '0.35' }] },
  { label: 'CROSS-SECTION quilled (1, near-closed tube)', set: [{ id: 'crossSection', value: '1' }] },
  { label: 'CROSS-SECTION quilled, reverse roll direction (-1)', set: [{ id: 'crossSection', value: '-1' }] },
  { label: 'CROSS-SECTION spoon: rolled at the base, opening flat at the tip (taper +1)', set: [{ id: 'crossSection', value: '1' }, { id: 'crossSectionTaper', value: '1' }] },
  { label: 'CROSS-SECTION spoon mirror: flat base, rolled tip (taper -1)', set: [{ id: 'crossSectionTaper', value: '-1' }] },
  { label: 'CROSS-SECTION quilled + max petal cup (auto-dampen stress)', set: [{ id: 'crossSectionTaper', value: '0' }, { id: 'petalCup', value: '1' }] },
  { label: 'CROSS-SECTION quilled + voronoi infill (rolled slab normals)', smoke: true, set: [{ id: 'petalCup', value: '0' }, { id: 'infillType', value: 'voronoi', evt: 'change' }] },
  { label: 'CROSS-SECTION quilled + 30 petals (triangle-budget stress)', smoke: true, set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'petalCount', value: '30' }] },
  { label: 'CROSS-SECTION quilled + solid sepals (rolled solid-blade end caps)', smoke: true, set: [{ id: 'petalCount', value: '6' }, { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'solid', evt: 'change' }] },
  // CHRYSANTHEMUM reachability (#gaps): the new width floor (0.1), TIP FINENESS
  // (relative tip sharpness), and per-petal VARIANCE all stack on the quilled
  // cross-section at once — the combination a quilled-mum design actually needs.
  // Self-contained so it doesn't depend on the CROSS-SECTION block's carried state.
  { label: 'CHRYSANTHEMUM: min width + tip fineness + variance on a quilled tube', smoke: true, set: [
    { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' },
    { id: 'stemType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' },
    { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' },
    { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' }, { id: 'petalCount', value: '30' },
    { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' },
    { id: 'width', value: '0.1' }, { id: 'taper', value: '1' },
    { id: 'tip', value: '1' }, { id: 'tipFineness', value: '1' },
    { id: 'crossSection', value: '1' }, { id: 'crossSectionTaper', value: '0' }, { id: 'petalCup', value: '0' },
    { id: 'variance', value: '0.6' },
  ] },
  // ===== SPINE CURL: bends the spine along its LENGTH (as opposed to CROSS-SECTION,
  // which bends it across its WIDTH) — flat -> gentle arc -> full circle -> a
  // tight multi-turn fiddlehead/crozier. Two axes: curlAmount (strength/direction)
  // and curlBias (0 uniform/circular -> 1 tip-loaded crozier). A tight, tip-loaded
  // coil pushes spineSampleCount/outlineN well past their defaults (see
  // flower-geometry.js), so this is the real stress case for that densification —
  // and, combined with CROSS-SECTION, the spider-chrysanthemum case (quilled +
  // fiddleheaded) the two axes have to compose for.
  { label: 'reset to a clean strap petal (for SPINE CURL block)', smoke: true, set: [
    { id: 'petalShape', value: 'strap', evt: 'change' },
    { id: 'petalCount', value: '6' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' },
    { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' },
    { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'meet', evt: 'change' },
    { id: 'petalCup', value: '0' }, { id: 'crossSection', value: '0' }, { id: 'crossSectionTaper', value: '0' },
    { id: 'curlAmount', value: '0' }, { id: 'curlBias', value: '0' },
    { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' },
    { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' },
    { id: 'stemBudMode', value: 'none', evt: 'change' },
  ] },
  { label: 'SPINE CURL gentle arc (0.3, uniform)', set: [{ id: 'curlAmount', value: '0.3' }] },
  { label: 'SPINE CURL full circle (1, uniform)', set: [{ id: 'curlAmount', value: '1' }, { id: 'curlBias', value: '0' }] },
  { label: 'SPINE CURL FIDDLEHEAD (1, tip-loaded crozier)', smoke: true, set: [{ id: 'curlAmount', value: '1' }, { id: 'curlBias', value: '1' }] },
  { label: 'SPINE CURL reverse direction fiddlehead (-1, tip-loaded)', set: [{ id: 'curlAmount', value: '-1' }] },
  { label: 'SPINE CURL fiddlehead + solid sepals (rim/solid-blade densification)', smoke: true, set: [{ id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'solid', evt: 'change' }] },
  { label: 'SPINE CURL fiddlehead + PETALOID FILL centre (inherited curl on tiny blades)', smoke: true, set: [
    { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'centerArch', value: 'petaloid', evt: 'change' },
    { id: 'fillPetalCount', value: '60' }, { id: 'fillBloomAngle', value: '30' },
    { id: 'fillOuterSize', value: '0.2' }, { id: 'fillInnerSize', value: '0.08' }, { id: 'fillDensity', value: '0.5' },
  ] },
  { label: 'SPINE CURL fiddlehead + max petal count (30, triangle-budget stress)', smoke: true, set: [{ id: 'centerArch', value: 'classic', evt: 'change' }, { id: 'petalCount', value: '30' }] },
  { label: 'SPINE CURL + CROSS-SECTION composed (quilled fiddlehead, spider-mum)', smoke: true, set: [
    { id: 'petalCount', value: '10' }, { id: 'crossSection', value: '1' }, { id: 'crossSectionTaper', value: '0' },
  ] },
  { label: 'SPINE CURL mid bias (0.5) bilateral per-slot (Petal 1)', set: [
    { id: 'crossSection', value: '0' }, { id: 'curlAmount', value: '0.4' }, { id: 'curlBias', value: '0.5' },
    { id: 'bloomType', value: 'bilateral', evt: 'change' }, { id: 'bilCurlAmount1', value: '-1' }, { id: 'bilCurlAmount2', value: '1' }, { id: 'bilCurlAmount3', value: '0' },
  ] },
  // ===== BLOOM GRADIENTS: a shared per-petal POSITION value (0 centre .. 1 edge,
  // defined for coiled/radial/layered alike) feeding two signed gradients —
  // CURL GRADIENT (grades curlAmount by position) and SIZE GRADIENT (grades L/W by
  // position, single-whorl only — layerSizeFalloff already owns size-by-LAYER) —
  // plus the independent CURL START axis (where along u curl begins). All three
  // default to 0, an exact no-op; this block exercises both signs / extremes and
  // the interaction with layering.
  { label: 'reset to a clean coiled golden-spiral bloom (for BLOOM GRADIENTS block)', smoke: true, set: [
    { id: 'bloomType', value: 'coiled', evt: 'change' }, { id: 'divergenceMode', value: 'golden', evt: 'change' },
    { id: 'petalShape', value: 'rounded', evt: 'change' }, { id: 'petalCount', value: '12' },
    { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' },
    { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' },
    { id: 'crossSection', value: '0' }, { id: 'crossSectionTaper', value: '0' }, { id: 'petalCup', value: '0' },
    { id: 'curlAmount', value: '0.4' }, { id: 'curlBias', value: '0' }, { id: 'curlStart', value: '0' },
    { id: 'curlGradient', value: '0' }, { id: 'sizeGradient', value: '0' }, { id: 'variance', value: '0' },
    { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemType', value: 'none', evt: 'change' },
    { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' },
    { id: 'stemBudMode', value: 'none', evt: 'change' },
  ] },
  { label: 'CURL GRADIENT +1 (outer curls off, inner doubles, golden spiral incl. i=0 at position 0)', set: [{ id: 'curlGradient', value: '1' }] },
  { label: 'CURL GRADIENT -1 (reversed: inner curls off, outer doubles)', set: [{ id: 'curlGradient', value: '-1' }] },
  { label: 'CURL GRADIENT +1 on RADIAL rosette (single ring, canonical position=1)', set: [
    { id: 'curlGradient', value: '1' }, { id: 'bloomType', value: 'radial', evt: 'change' },
  ] },
  { label: 'SIZE GRADIENT +1, single whorl (inner shrinks to the 0.2 floor at position 0)', set: [
    { id: 'bloomType', value: 'coiled', evt: 'change' }, { id: 'curlGradient', value: '0' }, { id: 'sizeGradient', value: '1' },
  ] },
  { label: 'SIZE GRADIENT -1, single whorl (reversed: outer shrinks)', set: [{ id: 'sizeGradient', value: '-1' }] },
  { label: 'SIZE GRADIENT +1 GATED OFF under 3 layers (must no-op; layerSizeFalloff owns size-by-layer)', set: [
    { id: 'layerCount', value: '3' }, { id: 'layerSizeFalloff', value: '0.7' },
  ] },
  { label: 'CURL START 0.7 (only the outer 30% curls) at max curl — the tightest compressed-curvature case', set: [
    { id: 'layerCount', value: '1' }, { id: 'sizeGradient', value: '0' },
    { id: 'curlAmount', value: '1' }, { id: 'curlBias', value: '0' }, { id: 'curlStart', value: '0.7' },
  ] },
  { label: 'BLOOM GRADIENTS + CURL START + CROSS-SECTION combined (spider-chrysanthemum attempt)', smoke: true, set: [
    { id: 'petalCount', value: '24' }, { id: 'petalShape', value: 'strap', evt: 'change' },
    { id: 'curlAmount', value: '0.7' }, { id: 'curlBias', value: '0.3' }, { id: 'curlStart', value: '0.4' },
    { id: 'curlGradient', value: '0.6' }, { id: 'sizeGradient', value: '-0.5' },
    { id: 'crossSection', value: '0.8' }, { id: 'crossSectionTaper', value: '0.4' },
    { id: 'centerArch', value: 'dense', evt: 'change' },
  ] },
];

// ===== Receptacle JUNCTION axis matrix: PROFILE x CONSTRUCTION x COLLAR =====
// The receptacle is three orthogonal axes now; every combination must export
// watertight. GENTLE clamps to SOLID internally (its non-solid rows re-run the same
// solid geometry, still exercised). A self-contained reset establishes a clean 9-petal
// bloom + stem so the claw/lobed state from the block above never leaks in; each matrix
// row then sets all three axes explicitly (they persist cumulatively otherwise).
const MPROFILES = ['flare', 'dome', 'cone', 'urn', 'gentle'];
const MCONS = ['solid', 'ribbed', 'cored'];   // GATHERED retired (folded onto RIBBED)
const MCOLLARS = ['none', 'band', 'ferrule'];
const MATRIX_START = CONFIGS.length + 1;   // 1-based index of the first matrix row (for the pass fraction)
CONFIGS.push({ label: 'matrix reset: clean 9-petal bloom + stem + receptacle ON', set: [
  { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' },
  { id: 'cleftDepth', value: '0' }, { id: 'cleftLobes', value: '2' }, { id: 'clawLength', value: '0' }, { id: 'clawWidth', value: '0.15' }, { id: 'shoulder', value: '0' }, { id: 'edgeCurve', value: '0' },
  { id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'loop', evt: 'change' },
  { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' },
  { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'stemLength', value: '5' }, { id: 'stemThickness', value: '1' }, { id: 'stemNodeCount', value: '3' }, { id: 'stemNodeProminence', value: '0.4' },
  { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptReach', value: '0.3' }, { id: 'receptSolidity', value: '0.5' }, { id: 'ribMultiplier', value: '1.5' },
] });
for (const prof of MPROFILES) for (const con of MCONS) for (const collar of MCOLLARS) {
  CONFIGS.push({ label: `matrix ${prof}/${con}/${collar}`, matrix: true, set: [
    { id: 'receptProfile', value: prof, evt: 'change' },
    { id: 'receptConstruction', value: con, evt: 'change' },
    { id: 'receptCollar', value: collar, evt: 'change' },
  ] });
}

// ===== CONTINUOUS MARGIN + SDF RECEPTACLE: the petal edge becomes two strands rooted at the
// foot, and the receptacle is rebuilt as ONE implicit surface (SDF) those strands GATHER into
// (see flower-sdf.js). ABSORPTION (blend radius) replaces CONSTRUCTION; BUTTON SIZE (neck swell)
// and GATHER HEIGHT shape the button; BUNDLE TIGHTNESS / FLARE RATE set the strand splay; PROFILE
// is a radius multiplier and COLLAR a radius bump. The junction is a separate polygonised solid
// overlapping the feet + stem, so re-run the print-safety gate with it ON across those junction
// params, profile, collar, infills, bloom types, layers and sepals —
// every one must still export watertight (0 boundary edges).
const CM_START = CONFIGS.length + 1;   // 1-based index of the first continuous-margin row
CONFIGS.push({ label: 'cont-margin reset: 9-petal veins + sepals + stem, ON', cm: true, smoke: true, set: [
  { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' }, { id: 'layerCount', value: '1' }, { id: 'petalsPerLayer', value: '' },
  { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' }, { id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'infillType', value: 'veins', evt: 'change' }, { id: 'edgeTermination', value: 'loop', evt: 'change' },
  { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalStyle', value: 'strap', evt: 'change' }, { id: 'leafType', value: 'none', evt: 'change' }, { id: 'stemBudMode', value: 'none', evt: 'change' },
  { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'stemLength', value: '5' }, { id: 'stemThickness', value: '1' },
  { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'receptCollar', value: 'none', evt: 'change' },
  { id: 'receptReach', value: '0.4' },
  { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'bundleTightness', value: '0.6' }, { id: 'flareRate', value: '0.5' },
  { id: 'absorption', value: '0.85' }, { id: 'buttonSize', value: '0.4' }, { id: 'gatherHeight', value: '0.25' },
] });
CONFIGS.push({ label: 'cont-margin BUTTON 0 (bare gather web)', cm: true, set: [{ id: 'buttonSize', value: '0' }] });
CONFIGS.push({ label: 'cont-margin BUTTON 1 (max daisy disc)', cm: true, set: [{ id: 'buttonSize', value: '1' }] });
CONFIGS.push({ label: 'cont-margin ABSORPTION low 0.15 (distinct strands)', cm: true, set: [{ id: 'buttonSize', value: '0.4' }, { id: 'absorption', value: '0.15' }] });
CONFIGS.push({ label: 'cont-margin ABSORPTION high 1.0 (fully fused)', cm: true, set: [{ id: 'absorption', value: '1' }] });
// gatherRadius/mergeStart/mergeRate were dead wiring (passed to the SDF builder, never read)
// and have been removed; these rows now sweep the LIVE junction params at their extremes.
CONFIGS.push({ label: 'cont-margin GATHER shallow (height 0.05, up under bloom)', cm: true, set: [{ id: 'absorption', value: '0.6' }, { id: 'buttonSize', value: '0.4' }, { id: 'gatherHeight', value: '0.05' }] });
CONFIGS.push({ label: 'cont-margin GATHER deep (height 0.6, dropped toward stem)', cm: true, set: [{ id: 'gatherHeight', value: '0.6' }] });
CONFIGS.push({ label: 'cont-margin BUNDLE tight 1 / flare 0 (max neck, quick taper)', cm: true, set: [{ id: 'gatherHeight', value: '0.15' }, { id: 'bundleTightness', value: '1' }, { id: 'flareRate', value: '0' }] });
CONFIGS.push({ label: 'cont-margin NECK swell max (buttonSize 1) + bundle default', cm: true, set: [{ id: 'bundleTightness', value: '0.75' }, { id: 'flareRate', value: '0.5' }, { id: 'buttonSize', value: '1' }] });
CONFIGS.push({ label: 'cont-margin PROFILE dome (radius mult) + band collar', cm: true, set: [{ id: 'buttonSize', value: '0.4' }, { id: 'receptProfile', value: 'dome', evt: 'change' }, { id: 'receptCollar', value: 'band', evt: 'change' }] });
CONFIGS.push({ label: 'cont-margin PROFILE urn (radius mult) + ferrule collar', cm: true, set: [{ id: 'receptProfile', value: 'urn', evt: 'change' }, { id: 'receptCollar', value: 'ferrule', evt: 'change' }] });
CONFIGS.push({ label: 'cont-margin PROFILE cone + collar none', cm: true, set: [{ id: 'receptProfile', value: 'cone', evt: 'change' }, { id: 'receptCollar', value: 'none', evt: 'change' }] });
CONFIGS.push({ label: 'cont-margin voronoi infill', cm: true, set: [{ id: 'receptProfile', value: 'flare', evt: 'change' }, { id: 'infillType', value: 'voronoi', evt: 'change' }] });
CONFIGS.push({ label: 'cont-margin bone (no outline) infill', cm: true, set: [{ id: 'infillType', value: 'bone', evt: 'change' }] });
CONFIGS.push({ label: 'cont-margin bundle 0 / flare 1 (loose, quick) + reach 1', cm: true, set: [{ id: 'infillType', value: 'veins', evt: 'change' }, { id: 'bundleTightness', value: '0' }, { id: 'flareRate', value: '1' }, { id: 'receptReach', value: '1' }] });
CONFIGS.push({ label: 'cont-margin coiled bloom + 3 layers', cm: true, set: [{ id: 'bloomType', value: 'coiled', evt: 'change' }, { id: 'petalCount', value: '12' }, { id: 'layerCount', value: '3' }, { id: 'bundleTightness', value: '0.6' }, { id: 'flareRate', value: '0.5' }, { id: 'receptReach', value: '0.4' }] });
CONFIGS.push({ label: 'cont-margin no stem (SDF seals on its own)', cm: true, smoke: true, set: [{ id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' }, { id: 'layerCount', value: '1' }, { id: 'stemType', value: 'none', evt: 'change' }] });

// NOT HERE: a max-petals x closed-mode Growth config. That combination is a currently-open
// crash (issue #44 — ~27M live tris, browser dies on export), not a fixed-and-guarded case
// to regression-test. See the comment on isSmoke() above before adding one back.

// ===== RIM TREATMENTS UNDER CONTINUOUS MARGIN (issue #53) =====
// The teeth/scallops now ride the two marginal strands instead of a closed hoop, which
// means an OPEN tapered tube whose path detours out to a peak and back. That is exactly
// the shape most likely to self-intersect or leave a boundary edge at the splice, so it
// is gated at both ends of the range: a long/frequent tooth set and a tall scallop set,
// each with the receptacle on so the strand feet are also being consumed by the junction.
CONFIGS.push({ label: 'cont-margin reset for rim treatments', cm: true, set: [
  { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'bloomType', value: 'radial', evt: 'change' },
  { id: 'petalCount', value: '9' }, { id: 'layerCount', value: '1' }, { id: 'infillType', value: 'veins', evt: 'change' },
  { id: 'cleftDepth', value: '0' }, { id: 'clawLength', value: '0' }, { id: 'crossSection', value: '0' }, { id: 'curlAmount', value: '0.3' },
  { id: 'petalCup', value: '0' }, { id: 'receptacleType', value: 'on', evt: 'change' }, { id: 'stemType', value: 'stem', evt: 'change' },
  { id: 'tipStyle', value: 'clean', evt: 'change' },
] });
CONFIGS.push({ label: 'cont-margin TOOTHED (teeth on the strands)', cm: true, smoke: true, set: [{ id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipLength', value: '0.5' }, { id: 'tipFrequency', value: '9' }, { id: 'tipRegion', value: '0.35' }] });
CONFIGS.push({ label: 'cont-margin TOOTHED long + irregular + max cup', cm: true, set: [{ id: 'tipLength', value: '1' }, { id: 'tipIrregularity', value: '0.8' }, { id: 'tipFrequency', value: '15' }, { id: 'petalCup', value: '1' }] });
CONFIGS.push({ label: 'cont-margin SCALLOPED tall', cm: true, smoke: true, set: [{ id: 'petalCup', value: '0' }, { id: 'tipIrregularity', value: '0' }, { id: 'tipStyle', value: 'scallop', evt: 'change' }, { id: 'scallopCount', value: '9' }, { id: 'scallopHeight', value: '1' }] });
CONFIGS.push({ label: 'cont-margin SCALLOPED max count + quilled cross-section', cm: true, set: [{ id: 'scallopCount', value: '30' }, { id: 'crossSection', value: '1' }] });
CONFIGS.push({ label: 'cont-margin TOOTHED + cleft (treatment on a clefted strand)', cm: true, set: [{ id: 'crossSection', value: '0' }, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipLength', value: '0.5' }, { id: 'cleftDepth', value: '0.5' }, { id: 'cleftLobes', value: '2' }] });
// TIP REGION PAST THE SPLICE. Every other TOOTHED config here sits at tipRegion 0.25-0.35,
// i.e. entirely above the margin flare end, so none of them ever exercised a tooth the
// continuous-margin rim discards. That is where the tooth mid-veins used to be emitted for
// teeth that were never built (free-ended struts; connectedness gate read 19 and 37 pieces
// at boundary === 0). 0.57 is the measured threshold at default bundle/flare — 0.56 is
// clean — and the bundle/flare row moves the splice instead of the region, which is the
// other side of the same inequality. See docs/flower-rim-treatment-registration.md.
CONFIGS.push({ label: 'cont-margin TOOTHED tipRegion 0.57 (first station past the splice)', cm: true, smoke: true, set: [{ id: 'cleftDepth', value: '0' }, { id: 'cleftLobes', value: '2' }, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipLength', value: '0.5' }, { id: 'tipRegion', value: '0.57' }] });
CONFIGS.push({ label: 'cont-margin TOOTHED tipRegion 1.0 + bundle 1 / flare 0 (deepest discard)', cm: true, smoke: true, set: [{ id: 'tipRegion', value: '1' }, { id: 'bundleTightness', value: '1' }, { id: 'flareRate', value: '0' }] });
CONFIGS.push({ label: 'cont-margin reset after the splice rows', cm: true, set: [{ id: 'tipRegion', value: '0.25' }, { id: 'bundleTightness', value: '0.5' }, { id: 'flareRate', value: '0.5' }] });
CONFIGS.push({ label: 'cont-margin reset after rim treatments', cm: true, set: [{ id: 'tipStyle', value: 'clean', evt: 'change' }, { id: 'cleftDepth', value: '0' }, { id: 'tipLength', value: '0.3' }, { id: 'tipFrequency', value: '14' }, { id: 'tipRegion', value: '0.25' }, { id: 'scallopCount', value: '9' }, { id: 'scallopHeight', value: '0.4' }] });

// ===== SHIPPED PRESETS: every curated preset (flower-presets.js) is a permanent
// regression fixture — named, so a failure reads "Thistle broke", not "config N". Each
// is loaded the way a visitor loads it: by clicking its gallery cell (the real
// applyDesign path), which fully replaces state, so no cumulative leak between them. =====
const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const PRESET_START = CONFIGS.length + 1;   // 1-based index of the first preset row
for (const p of PRESETS) CONFIGS.push({ label: `preset: ${p.name}`, preset: true, presetSlug: p.slug });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
// Accept any export dialog (a build-failure/refusal alert, #44) so a heavy config
// still runs to completion instead of the headless auto-dismiss aborting it. The
// export gate no longer confirm()s past a heavy model — it's a plain on-screen
// line under EXPORT_TRI_BUDGET, a hard alert()-and-refuse over it (flower.js).
page.on('dialog', (d) => d.accept().catch(() => {}));

// Serve the CDN three import from the local npm package (offline + pinned).
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  const fp = path.join(ROOT, 'node_modules/three', rel);
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(fp) }); }
  catch { route.abort(); }
});

await page.goto(`http://localhost:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });

// ADVANCED. Advanced-tier CONTROLS (tipRegion, bundleTightness, flareRate, the cleft and
// cross-section sets) are hidden in Standard, so a config naming one of them is only
// meaningful with this on. It is NOT about tipStyle: `advancedOnly` appears nowhere in
// flower-registry.js today, so ADV_OPTIONS is {} and no option is tier-rewritten by
// anything — the older claim here, that Standard rewrites tipStyle 'jagged'/'scallop' to
// 'clean' and bloomType 'bilateral' to 'coiled', stopped being true and stayed in four
// files for months, which is the defect this codebase repeats most. The MECHANISM is
// still live for any future advancedOnly option, and the read-back assertion below is
// what actually catches it — not this comment.
await page.evaluate(() => {
  const t = document.getElementById('advancedToggle');
  if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
});
await page.waitForTimeout(200);
// Export STL now lives inside the collapsed "Make" accordion — open it so the click lands.
await page.evaluate(() => {
  const head = document.querySelector('.fl-acc__head[aria-controls="acc-make"]');
  if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
});
await page.waitForTimeout(120);

const results = [];
const setFailures = [];   // configs whose control values did not take (see below)
for (const cfg of CONFIGS) {
  if (cfg.presetSlug) {
    // Load the preset by clicking its gallery cell — the real applyDesign path.
    const clicked = await page.evaluate((slug) => {
      const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`);
      if (!cell) return false; cell.click(); return true;
    }, cfg.presetSlug);
    if (!clicked) { if (isSmoke(cfg)) results.push({ label: cfg.label, ok: false, preset: true, note: 'gallery cell not found' }); continue; }
  } else {
    // SET, THEN READ BACK. A control can refuse what it is handed (a tier fallback, an
    // option a select does not have, a slider clamp), and a config that did not take
    // exports a design nobody asked for under a label that says otherwise.
    for (const s of cfg.set) {
      const got = await page.evaluate(({ id, value, evt }) => {
        const el = document.getElementById(id);
        if (!el) return { missing: true };
        el.value = value;
        el.dispatchEvent(new Event(evt || 'input', { bubbles: true }));
        return { value: el.value };
      }, s);
      if (got.missing) { setFailures.push(`${cfg.label}: no control #${s.id}`); continue; }
      const bothNum = s.value !== '' && got.value !== '' && isFinite(Number(s.value)) && isFinite(Number(got.value));
      const ok = bothNum ? Math.abs(Number(s.value) - Number(got.value)) < 1e-9 : String(s.value) === String(got.value);
      if (!ok) setFailures.push(`${cfg.label}: ${s.id} set "${s.value}" but reads back "${got.value}"`);
    }
  }
  await page.waitForTimeout(160); // let the double-rAF rebuild settle
  // SMOKE MODE: still walk every config's mutations above (cheap — cumulative state must
  // stay byte-identical to the full run) but only export+download+analyze the ones flagged
  // smoke-worthy — that's the expensive part. See isSmoke() for what's selected and why.
  if (SMOKE && !isSmoke(cfg)) continue;
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 45000 }).catch(() => null),   // headroom for the ~1M-tri configs (STL build + download)
    page.click('#exportStl'),
  ]);
  if (!dl) { results.push({ label: cfg.label, ok: false, matrix: !!cfg.matrix, cm: !!cfg.cm, note: 'no STL download' }); continue; }
  const buf = fs.readFileSync(await dl.path());
  const a = analyzeStl(buf);
  results.push({ label: cfg.label, ok: a.boundary === 0, matrix: !!cfg.matrix, cm: !!cfg.cm, preset: !!cfg.preset, ...a });
}

await browser.close();
server.close();

let failed = 0;
console.log('Flower STL export — watertightness gate\n');
for (const r of results) {
  if (!r.ok) failed++;
  const detail = r.note ? r.note : `${r.tris.toLocaleString()} tris, boundaryEdges=${r.boundary}, nonManifold(overlaps)=${r.nonManifold}, shells=${r.shells}`;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(46)} ${detail}`);
}
const mat = results.filter((r) => r.matrix);
const matPass = mat.filter((r) => r.ok).length;
if (mat.length) console.log(`\nReceptacle PROFILE×CONSTRUCTION×COLLAR matrix: ${matPass}/${mat.length} export watertight.`);
const cm = results.filter((r) => r.cm);
const cmPass = cm.filter((r) => r.ok).length;
if (cm.length) console.log(`Continuous-margin SDF receptacle (absorption × gather × profile × collar): ${cmPass}/${cm.length} export watertight.`);
const pre = results.filter((r) => r.preset);
const prePass = pre.filter((r) => r.ok).length;
if (pre.length) console.log(`Shipped presets (flower-presets.js): ${prePass}/${pre.length} export watertight.`);
if (setFailures.length) {
  console.log('\nCONFIG VALUES THAT DID NOT TAKE (the harness would have measured a different design):');
  for (const f of setFailures) console.log('  ! ' + f);
  failed += setFailures.length;
}
if (pageErrors.length) {
  const real = pageErrors.filter((e) => !/fonts\.googleapis/.test(e));
  if (real.length) { console.log('\nPage errors:'); real.forEach((e) => console.log('  ! ' + e)); failed += real.length; }
}
// CONNECTED-COMPONENT MEASUREMENT (report-only — NOT gated, see below).
// `shells` above is a union-find over EXACT welded (quantised) vertices. Measured
// against the full sweep, every config reports shells in the hundreds to tens of
// thousands (e.g. 'default (veins)': 1624, '+ 4 layers': 26684) despite
// boundaryEdges=0 everywhere. That is NOT 142 disconnection bugs — it is this
// architecture working as designed: CLAUDE.md is explicit that "overlapping
// closed shells are fine — the slicer unions them," and the geometry is built
// from many individually-closed primitives (tube segments, beads, slab panels)
// that physically INTERPENETRATE without sharing a single welded vertex. A
// vertex-welding graph can never see that kind of fusion — it under-counts
// connectivity by construction, so it cannot be the gate this invariant needs.
// Left in as a diagnostic only; a real gate needs spatial/volumetric overlap
// (e.g. proximity-bucketed shell-vs-shell AABB or surface intersection), which
// is a different and more expensive algorithm. Not implemented here — flagging
// per the standing rule to stop before shipping a gate that would fail every
// correct design.
const withShells = results.filter((r) => r.shells != null);
if (withShells.length) {
  const counts = withShells.map((r) => r.shells).sort((a, b) => a - b);
  console.log(`\nConnected-component count (vertex-welding only, NOT a pass/fail gate — see comment above): `
    + `min=${counts[0]} max=${counts[counts.length - 1]} median=${counts[Math.floor(counts.length / 2)]} across ${counts.length} configs.`);
}
console.log(failed === 0 ? '\nAll configurations export watertight (0 boundary edges). ✓' : `\n${failed} FAILURE(S) — geometry is not print-safe. ✗`);
process.exit(failed === 0 ? 0 : 1);
