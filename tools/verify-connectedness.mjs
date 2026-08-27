/*
 * verify-connectedness.mjs — is the exported model ONE printed piece? (issue #43)
 *
 * WHAT THIS IS FOR. The flower-project skill states the invariant plainly: the model is
 * always one connected watertight solid. Two of those three words have had a gate for a
 * long time; "connected" has not. The export gate measures MANIFOLDNESS (boundary edges =
 * 0) and nothing else — and two entirely separate closed solids floating a centimetre apart
 * also have zero boundary edges. A model can pass every gate this project owns and print as
 * a bloom plus a detached stem.
 *
 * WHY THE OBVIOUS MEASURES DO NOT WORK. The skill records both dead ends, and they cost
 * real time:
 *   - Vertex-weld shell count is NOT connectedness. The model is assembled from many
 *     individually-closed primitives that interpenetrate WITHOUT sharing welded vertices,
 *     so union-find over welded vertices reports 15 to 26,684 shells across healthy
 *     configs. It is a labelled diagnostic, never a gate.
 *   - An AABB-overlap graph is WORSE THAN NOTHING. Bounding boxes can overlap when the
 *     shells inside them do not, so it would pass a broken model. A gate that can only
 *     produce false negatives is more dangerous than an absent one.
 * Connectedness is volumetric, so it needs a volumetric measure.
 *
 * WHAT THIS MEASURES. Rasterise every triangle into a voxel grid at a cell below the
 * minimum printable feature (0.8 mm), then 6-connected flood-fill the occupied voxels. One
 * region means every primitive's surface touches or overlaps its neighbours' within one
 * cell, so the slicer unions them into one body. More than one region means the export
 * contains pieces that are not joined — a print that arrives in parts.
 *
 * WHAT IT DOES NOT YET PROVE — read this before quoting a PASS:
 *   - It is a SURFACE occupancy test, not a solid one. Two shells that merely graze within
 *     one cell read as connected. A true solid test would need per-shell interior
 *     classification (ray parity per shell, OR the occupancy grids, then fill); that is the
 *     stronger measure and is not built. This one cannot produce a false ALARM, only a
 *     false pass on a hairline touch — the safe direction for a first gate, and the reason
 *     it is worth shipping before the stronger one exists.
 *   - Cell size is a floor, not a proof: at 0.6 mm a genuine 0.2 mm gap reads as joined.
 *     Lower CELL_MM to tighten it, at cubic cost in memory.
 *   - The config list below is hand-picked, not the export gate's matrix. It covers the
 *     junction corners, the Voronoi region seams, the bare bloom (the state the product
 *     ships in) and every shipped preset. It is NOT general coverage; widen it before
 *     treating a PASS as a claim about designs it does not name.
 *
 * A grid larger than MAX_VOXELS is SKIPPED and reported as skipped, never silently passed.
 *
 * ============================================================================
 * THIS GATE REPORTS xfail ROWS ON `main`, BY INTENT. That is not rot.
 * ============================================================================
 * A row may carry `xfail: <issue number>` — a KNOWN, TRACKED defect. The gate then:
 *   - PASSES when that row exports in more than one piece (known, tracked),
 *   - FAILS when any UNMARKED row does (a regression),
 *   - FAILS HARD when an xfail row comes back as ONE piece — that is the fix landing, and
 *     the marker must come off in the same commit. An xpass is a hard error with a message
 *     that says so, never a warning: a stale xfail is a hole in the gate.
 * Validity assertions (below) are NEVER covered by an xfail. A harness measuring the wrong
 * design fails the run outright, whatever the row expected.
 * There is no open marker today. #84 — the BARE BLOOM exporting in more than one piece —
 * was the last one, and it closed when the junction became unconditional. Every row in this
 * file is hard. If you add a marker, cite the issue and delete it in the commit that fixes
 * the row, never by weakening an assertion.
 *
 * ============================================================================
 * THE HARNESS ASSERTS ITS OWN VALIDITY — three checks, all hard failures.
 * ============================================================================
 * 1. FULL-STATE. Every row loads a FRESH PAGE, then applies BASE then its own set, then
 *    reads back EVERY wired control and compares against DEFAULTS + BASE + set. This is
 *    the fix for a measured defect: BASE used to be a partial list on a reused page, so
 *    `cleftDepth`/`cleftLobes`/`cleftWidth` set by the LOBED row leaked into every row
 *    after it. Extending that list would have fixed today's leak and rotted at the next
 *    row that sets a new id; a reload plus a whole-state read-back cannot.
 *    Preset rows are the one exception and say why at their own call site: applyDesign
 *    MIGRATES a preset before applying it, so the post-migration state is not predictable
 *    here without a second copy of every migration. They get a read-back of the ids the
 *    preset names instead; their isolation comes from the reload, not from an assertion.
 * 2. TAIL PROBE. Each row declares `stem: true | false`, and the geometry has to agree —
 *    this is what stops a row silently becoming a different design and being reported under
 *    a label that says otherwise. The asserted measure is `aspect` (model height over its
 *    width): a stem makes the model taller than it is wide, a bare bloom wider than tall.
 *    `narrowFrac` (how much of the height is a narrow shaft) and `tailXZ` (how wide the
 *    lowest 8% is) are reported alongside it. `tailXZ` used to be the asserted one and no
 *    longer separates anything — see the band below for why, and for what this one assumes.
 * 3. PAIRWISE TRIANGLE COMPARISON. Sepal absence is checked against the SAME design with
 *    sepals on (`moreTrisThan`), never against a global reference — triangle counts differ
 *    across configs for a dozen reasons, so only a matched pair carries information.
 *
 * RUN:  node tools/verify-connectedness.mjs
 *       node tools/verify-connectedness.mjs --negative-control
 *         Deliberately mislabels the tail expectation of one bare row and requires the run
 *         to FAIL. A validity check nobody has ever seen fail is a hope, not a check; this
 *         makes the failure reproducible on demand.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const CELL_MM = 0.6;          // < MIN_FEATURE_MM (0.8): a real gap cannot hide inside a cell
const MAX_VOXELS = 90e6;
const TAIL_FRAC = 0.08;       // "the lowest 8%" of the model's height, for the tail probe
// Tail-probe band — see validity check 2. ONE threshold on `aspect`, from the measured
// spread across every row in this file:
//
//   stemmed  (10 rows)  aspect 0.964 - 1.569      narrowFrac 0.72 - 0.87
//   stemless (21 rows)  aspect 0.200 - 0.414      narrowFrac 0.00 - 0.37
//
// 0.65 sits in the empty gap: 1.48x below the shortest stemmed row, 1.57x above the tallest
// stemless one. `narrowFrac` separates too (1.95x) and is reported, but `aspect` has the
// wider gap so it is the one asserted — one measure, not a conjunction that would fail
// twice for the same reason.
//
// WHY NOT tailXZ, which this used to assert. It asked "is the lowest 8% of the model
// narrow?" and inferred a stem. That inference held only while stemless meant NO JUNCTION.
// Since the junction became unconditional (#84) every design has one and it tapers, so the
// ranges now OVERLAP COMPLETELY — stemless spans 0.0259-1.0000 against stemmed's
// 0.0106-0.1093 — and the measure has no separating power left. It is still reported,
// because "does the junction hang below the bloom" is a real thing to watch; it is just not
// evidence about a stem. Dahlia proves no depth setting rescues it: its underside reads
// ~0.033 at every depth from 0 to 0.5, because its bloom already tapers to a small footprint.
//
// WHAT THIS BAND ASSUMES, so the next person knows when to re-measure it: that a stem makes
// the model TALLER THAN IT IS WIDE (heightMM normalises the largest dimension, so a stemmed
// plant fills the box vertically and a bare bloom fills it horizontally). A row with a very
// SHORT stem, or a stemless bloom closed up into a tall bud, would sit nearer the middle.
// No row here is either. Adding one means re-measuring the band, not widening it.
const STEM_ASPECT_MIN = 0.65;
const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// The registry is the source of truth for what a control is and what its default is, so
// the full-state assertion reads it rather than keeping a second copy. Same filters as
// flower.js's PANEL / WIRED.
const { CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'flower-registry.js')).href);
const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const WIRED = CONTROLS.filter((c) => !c.placeholder && !c.uiOnly);
const DEFAULTS = Object.fromEntries(WIRED.map((c) => [c.id, c.default]));

// Baseline every row starts from — a DELTA over DEFAULTS, applied to a freshly loaded page.
// Deliberately NOT an inventory of ids to clear: that inventory is what leaked. The reload
// plus the full-state assertion is what makes "a row's meaning does not depend on the row
// before it" true rather than promised.
const BASE = [
  { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' },
  { id: 'layerCount', value: '1' }, { id: 'infillType', value: 'veins', evt: 'change' },
  { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'heightMM', value: '120' },
  { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' },
  { id: 'tube', value: '0.4' }, { id: 'stemCurve', value: '0' }, { id: 'stemLength', value: '4' },
  { id: 'stemThickness', value: '1' }, { id: 'receptacleType', value: 'none', evt: 'change' },
];

// A bare bloom: no stem, no sepals, no migration override — so hasReceptacle() is false and
// nothing below the bloom exists to be joined to. THE SHIPPED DEFAULT, and every preset.
const BARE = [
  { id: 'stemType', value: 'none', evt: 'change' },
  { id: 'sepalsType', value: 'none', evt: 'change' },
  { id: 'receptacleType', value: 'none', evt: 'change' },
];

// JUNCTION-RISK CONFIGS. `tube` is the master length scale for every tube/bead primitive —
// including the junction neck radius and the SDF junction feet — so its extremes are the
// values most able to shrink the connective mass below the point where it still overlaps
// the petal feet. `stemCurve` is here because it has never been exported at a non-zero
// value in this project's history: it was unreachable in the UI from the day it shipped, so
// its geometry path is untested rather than tested-and-fine.
const CONFIGS = [
  { label: 'tube 0 (thinnest junction) + stem + sepals', stem: true, set: [{ id: 'tube', value: '0' }] },
  { label: 'tube 0.4 (default)', stem: true, set: [] },
  { label: 'tube 1 (thickest)', stem: true, set: [{ id: 'tube', value: '1' }] },
  { label: 'tube 0, NO STEM (SDF junction seals alone)', stem: false, set: [{ id: 'tube', value: '0' }, { id: 'stemType', value: 'none', evt: 'change' }] },
  { label: 'tube 1, NO STEM', stem: false, set: [{ id: 'tube', value: '1' }, { id: 'stemType', value: 'none', evt: 'change' }] },
  { label: 'tube 0, LEGACY receptacle (continuous margin OFF)', stem: true, set: [{ id: 'tube', value: '0' }, { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'tube 1, LEGACY receptacle', stem: true, set: [{ id: 'tube', value: '1' }, { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'stemCurve -1, long stem', stem: true, set: [{ id: 'stemCurve', value: '-1' }, { id: 'stemLength', value: '8' }] },
  { label: 'stemCurve +1, max length, thinnest stem', stem: true, set: [{ id: 'stemCurve', value: '1' }, { id: 'stemLength', value: '10' }, { id: 'stemThickness', value: '0.5' }] },
  { label: 'stemCurve +1 + tube 0 (thinnest curved stem)', stem: true, set: [{ id: 'stemCurve', value: '1' }, { id: 'stemLength', value: '10' }, { id: 'stemThickness', value: '0.5' }, { id: 'tube', value: '0' }] },
  { label: 'receptacleType ON alone (junction forced, no stem, no sepals)', stem: false, set: [{ id: 'stemType', value: 'none', evt: 'change' }, { id: 'sepalsType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'on', evt: 'change' }] },
  // REGION SEAMS, not a junction corner. Every config above probes the junction — where
  // the petal feet, the centre and the stem meet — so a green result from them says
  // nothing about the seams the Voronoi PARTITION introduces: the divider that runs down
  // each cleft slot to its sinus floor, and the midline where the +Y half meets its own
  // mirror. Those are places where two independently-clipped cells are expected to touch,
  // which is exactly the shape of thing that prints in two pieces if they do not.
  // 4 lobes puts a divider on the midline (an even lobe count places a cleft centre at
  // y = 0, so the divider seam and the mirror seam coincide there — the worst case);
  // voronoi because the partition only exists for it.
  { label: 'LOBED 4 + voronoi (partition region seams + mirror midline)', stem: true, set: [
    { id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'cleftDepth', value: '0.55' },
    { id: 'cleftLobes', value: '4' }, { id: 'cleftWidth', value: '0.3' }] },

  // ===== BARE BLOOM — the state the product actually ships in =====================
  // Every row above sets a stem, sepals, or the migration override, so every row above
  // builds a junction. The shipped DEFAULTS build none: stemType none, sepalsType none,
  // receptacleType none. All seven presets are bare blooms. Until these rows existed this
  // gate had never once looked at the configuration a visitor lands on.
  // `centerArch` selects between FOUR DIFFERENT CORE BUILDERS, so each gets its own row —
  // a green `classic` says nothing about `dense`, `disc` or `petaloid`. Within `classic`,
  // `centerType` chooses stamens / pistil / none; it is INERT for the other three, so
  // `centerType: 'none'` there does not mean "no centre".
  // Eight of these nine exported in pieces until the junction became unconditional (#84);
  // the ninth, `classic + none`, was the only one with no centre geometry to detach, which
  // is what localised the defect. All nine are now unmarked and hard.
  { label: 'BARE bloom, classic + stamens (SHIPPED DEFAULT centre)', stem: false, set: BARE },
  { label: 'BARE bloom, classic + pistil', stem: false, set: [...BARE, { id: 'centerType', value: 'pistil', evt: 'change' }] },
  { label: 'BARE bloom, classic + none', stem: false, set: [...BARE, { id: 'centerType', value: 'none', evt: 'change' }] },
  { label: 'BARE bloom, DENSE CLUSTER centre', stem: false, set: [...BARE, { id: 'centerArch', value: 'dense', evt: 'change' }] },
  { label: 'BARE bloom, DISC centre', stem: false, set: [...BARE, { id: 'centerArch', value: 'disc', evt: 'change' }] },
  { label: 'BARE bloom, PETALOID FILL centre', stem: false, set: [...BARE, { id: 'centerArch', value: 'petaloid', evt: 'change' }] },
  { label: 'BARE bloom, tube 0 (thinnest primitives)', stem: false, set: [...BARE, { id: 'tube', value: '0' }] },
  { label: 'BARE bloom, tube 1 (thickest primitives)', stem: false, set: [...BARE, { id: 'tube', value: '1' }] },
  { label: 'BARE bloom, layerCount 3', stem: false, set: [...BARE, { id: 'layerCount', value: '3' }] },
  // TIGHTNESS 0 — every petal foot ON THE AXIS, so NO footprint is captured at all.
  // `R = PETAL_LENGTH * 0.5 * lerp(0, 1.85, tightness)` for a radial bloom, so at the
  // slider's minimum every placement has r = 0, and `pl.foot` is only captured when
  // `pl.r > 1e-4`. The trunk therefore gets an EMPTY attachment ring: no samples, so no
  // flutes, and it builds a plain round column at the valley radius. That configuration is
  // reachable from the panel and had never been exported by any gate — "unknown, not
  // passing" is the shape the last two defects here took, so it is a row now. The guard
  // itself, and the second site that re-derives the same condition, are #87. Both
  // polarities: without a stem (the trunk is the only thing below the bloom) and with one
  // (the neck has to meet a stem it has no flutes to blend from).
  { label: 'BARE bloom, radial tightness 0 (NO foot captured — empty attach ring)', stem: false,
    set: [...BARE, { id: 'tightness', value: '0' }] },
  { label: 'radial tightness 0 + stem + sepals (empty attach ring, real neck)', stem: true,
    set: [{ id: 'tightness', value: '0' }] },

  // ===== RIM TREATMENTS — the state this gate had never exercised ==================
  // Not one row above sets a tip style, so every row above is a CLEAN margin. That is the
  // same blindness that let #84 ship: the gate never entered the state where the defect
  // lives. TOOTHED emits one mid-vein per tooth (buildJaggedEdge's teethVeins); under
  // continuous margin the rim consumer drops every tooth below rimSpliceU while the
  // mid-vein consumer kept all of them, so a discarded tooth left its vein behind as a
  // free-standing spike. Measured: free iff the tooth station uc < rimSpliceU, tooth by
  // tooth, on every config tried. See docs/flower-rim-treatment-registration.md.
  //
  // BOTH POLARITIES OF `continuousMargin` ARE ROWS, deliberately. The defect exists only
  // with it ON — with it OFF the closed hoop carries every tooth — and an asymmetry that
  // lives only in a comment is one nobody can check. TIP REGION 0.25 / 0.57 / 1.00 are the
  // shipped default, the measured threshold (0.56 clean, 0.57 broken at default
  // bundle/flare) and the far end; the bundle/flare row moves rimSpliceU instead of uStart,
  // which is the other half of the same inequality.
  { label: 'TOOTHED tipRegion 0.25 (shipped default region — CONTROL, clean)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '0.25' }] },
  { label: 'TOOTHED tipRegion 0.57 (measured threshold: 0.56 clean, 0.57 not)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '0.57' }] },
  { label: 'TOOTHED tipRegion 1.00 (teeth run to the base)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '1' }] },
  { label: 'TOOTHED tipRegion 1.00 + bundle 1 / flare 0 (latest splice)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '1' },
          { id: 'bundleTightness', value: '1' }, { id: 'flareRate', value: '0' }] },
  { label: 'TOOTHED tipRegion 1.00 + tipFrequency 40 (most teeth)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '1' },
          { id: 'tipFrequency', value: '40' }] },
  { label: 'TOOTHED tipRegion 1.00, continuous margin OFF (hoop carries every tooth)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'tipRegion', value: '1' },
          { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  // SCALLOPED is UNLISTED but LIVE — the option is hidden+disabled in the picker, and the
  // value still loads and still builds, so a saved design keeps rendering. That makes it a
  // gate row, not a dead branch: its one-piece result is PINNED here rather than assumed.
  // Its own defect (each scallop encloses an empty lens, ~6.7 mm deep at the default
  // height) is a SHAPE defect, not a connectedness one — this gate cannot see it and must
  // not be read as clearing it. Its discarded basal stretch is #94.
  { label: 'SCALLOPED default height (unlisted but live)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'scallop', evt: 'change' }] },
  { label: 'SCALLOPED height 1.0 (tallest scallop)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'scallop', evt: 'change' }, { id: 'scallopHeight', value: '1' }] },
  { label: 'SCALLOPED height 1.0, continuous margin OFF', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'scallop', evt: 'change' }, { id: 'scallopHeight', value: '1' },
          { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  // RUFFLED for contrast: its treatment lives in surfacePoint, so the material field moves
  // with it and there is no appendage to leave behind. A green row here is what says the
  // TOOTHED rows above are about teeth and not about "any tip style".
  { label: 'RUFFLED (surface treatment — contrast row)', stem: false,
    set: [...BARE, { id: 'tipStyle', value: 'ruffled', evt: 'change' }] },

  // VALIDITY PAIR, and a gate row in its own right. The bare rows above claim "no sepals";
  // this is the same design with sepals ON, so the claim is checked against its own match
  // rather than against a global triangle reference that means nothing.
  { label: 'PAIR CONTROL: same design + sepals (validates sepal absence above)', stem: false,
    moreTrisThan: 'BARE bloom, classic + stamens (SHIPPED DEFAULT centre)',
    set: [{ id: 'stemType', value: 'none', evt: 'change' }, { id: 'receptacleType', value: 'none', evt: 'change' }] },
];

// ===== SHIPPED PRESETS — what a visitor actually clicks ==========================
// Loaded by NAME through the real gallery-click path (applyDesign), exactly as the export
// and quality gates load them, so a failure reads "preset: Thistle" rather than "config N".
// All seven are bare blooms (each sets stemType/sepalsType none), so each declares
// stem: false and the tail probe checks that claim rather than trusting it. (This line
// said `stem: true` while the code below said false — a comment contradicting the code
// three lines under it, found while adding the rim-treatment rows.)
// All seven are unmarked: #84 is fixed, so a regression in any of them is a hard failure.
for (const p of PRESETS) CONFIGS.push({ label: `preset: ${p.name}`, presetSlug: p.slug, stem: false });

if (NEGATIVE_CONTROL) {
  // Claim a stem on a row that has none. The tail probe must reject it; if the run still
  // passes, the probe is not measuring anything and no PASS from it is worth quoting.
  const row = CONFIGS.find((c) => c.label.startsWith('BARE bloom, classic + stamens'));
  row.stem = true;
  console.log(`NEGATIVE CONTROL: "${row.label}" mislabelled stem:true. This run MUST fail.\n`);
}

function boundaryEdges(buf) {
  const n = buf.readUInt32LE(80);
  const q = (v) => Math.round(v * 1e5) / 1e5;
  const edges = new Map();
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50; const t = [];
    for (let k = 0; k < 3; k++) { const b = o + 12 + k * 12; t.push(`${q(buf.readFloatLE(b))},${q(buf.readFloatLE(b + 4))},${q(buf.readFloatLE(b + 8))}`); }
    for (let k = 0; k < 3; k++) { const a = t[k], b = t[(k + 1) % 3]; const e = a < b ? `${a}|${b}` : `${b}|${a}`; edges.set(e, (edges.get(e) || 0) + 1); }
  }
  let boundary = 0; for (const c of edges.values()) if (c === 1) boundary++;
  return { tris: n, boundary };
}

/* TAIL PROBE — validity check 2 in the header. XZ extent of the vertices in the lowest
   TAIL_FRAC of the Y range, over the XZ extent of every vertex. Both sides use the same
   estimator (the larger of the two horizontal spans) on the same vertex set, so this is a
   ratio of like to like, not a comparison across sampling resolutions. */
function tailProbe(buf, frac = TAIL_FRAC) {
  const n = buf.readUInt32LE(80);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const pts = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    for (let k = 0; k < 3; k++) {
      const b = o + 12 + k * 12;
      for (let d = 0; d < 3; d++) {
        const v = buf.readFloatLE(b + d * 4);
        pts[i * 9 + k * 3 + d] = v;
        if (v < lo[d]) lo[d] = v;
        if (v > hi[d]) hi[d] = v;
      }
    }
  }
  const whole = Math.max(hi[0] - lo[0], hi[2] - lo[2]);
  const height = hi[1] - lo[1];
  const cut = lo[1] + height * frac;
  const tlo = [Infinity, Infinity], thi = [-Infinity, -Infinity];
  let count = 0;
  // SLAB PROFILE, for narrowFrac below: the XZ extent at each of SLABS heights.
  const SLABS = 100;
  const slo = Array.from({ length: SLABS }, () => [Infinity, Infinity]);
  const shi = Array.from({ length: SLABS }, () => [-Infinity, -Infinity]);
  for (let i = 0; i < n * 3; i++) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    if (height > 0) {
      const k = Math.min(SLABS - 1, Math.max(0, Math.floor(((y - lo[1]) / height) * SLABS)));
      if (x < slo[k][0]) slo[k][0] = x;
      if (x > shi[k][0]) shi[k][0] = x;
      if (z < slo[k][1]) slo[k][1] = z;
      if (z > shi[k][1]) shi[k][1] = z;
    }
    if (y > cut) continue;
    count++;
    if (x < tlo[0]) tlo[0] = x;
    if (x > thi[0]) thi[0] = x;
    if (z < tlo[1]) tlo[1] = z;
    if (z > thi[1]) thi[1] = z;
  }
  if (!count || !isFinite(whole) || whole <= 0) return { tailXZ: NaN, narrowFrac: NaN, aspect: NaN, tailVerts: count };
  // narrowFrac — how much of the model's HEIGHT, measured up from the bottom, is narrower
  // than half the model's full width. A stem is long, so most of the model is narrow; a
  // junction taper is short, so only a sliver is. This is the property that still separates
  // them now that EVERY design has a junction and "narrow at the very bottom" no longer does.
  let k = 0;
  for (; k < SLABS; k++) {
    const w = Math.max(shi[k][0] - slo[k][0], shi[k][1] - slo[k][1]);
    if (isFinite(w) && w >= 0.5 * whole) break;
  }
  return {
    tailXZ: +(Math.max(thi[0] - tlo[0], thi[1] - tlo[1]) / whole).toFixed(4),
    narrowFrac: +(k / SLABS).toFixed(3),
    // aspect — does the model stand taller than it is wide? heightMM normalises the LARGEST
    // dimension, so a stemmed plant is tall-and-thin and a bare bloom is wide-and-flat.
    aspect: +(height / whole).toFixed(3),
    tailVerts: count,
  };
}

function voxelComponents(buf, cell) {
  const n = buf.readUInt32LE(80);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], tri = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50, t = [];
    for (let k = 0; k < 3; k++) {
      const b = o + 12 + k * 12, p = [buf.readFloatLE(b), buf.readFloatLE(b + 4), buf.readFloatLE(b + 8)];
      for (let d = 0; d < 3; d++) { if (p[d] < lo[d]) lo[d] = p[d]; if (p[d] > hi[d]) hi[d] = p[d]; }
      t.push(p);
    }
    tri.push(t);
  }
  const dim = hi.map((h, k) => Math.max(1, Math.ceil((h - lo[k]) / cell) + 1));
  if (dim[0] * dim[1] * dim[2] > MAX_VOXELS) return { skipped: true, dim };
  const occ = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const at = (x, y, z) => (z * dim[1] + y) * dim[0] + x;
  // Barycentric sampling at half a cell, so no cell a triangle passes through is skipped.
  for (const t of tri) {
    const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]];
    const e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]];
    const s = Math.max(2, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2)) / (cell * 0.5)));
    for (let a = 0; a <= s; a++) for (let b = 0; b + a <= s; b++) {
      const u = a / s, v = b / s;
      const x = Math.round((t[0][0] + e1[0] * u + e2[0] * v - lo[0]) / cell);
      const y = Math.round((t[0][1] + e1[1] * u + e2[1] * v - lo[1]) / cell);
      const z = Math.round((t[0][2] + e1[2] * u + e2[2] * v - lo[2]) / cell);
      if (x >= 0 && y >= 0 && z >= 0 && x < dim[0] && y < dim[1] && z < dim[2]) occ[at(x, y, z)] = 1;
    }
  }
  const seen = new Uint8Array(occ.length), stack = [];
  let comps = 0, biggest = 0, total = 0;
  for (let i = 0; i < occ.length; i++) if (occ[i]) total++;
  for (let i = 0; i < occ.length; i++) {
    if (!occ[i] || seen[i]) continue;
    comps++; let sz = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const c = stack.pop(); sz++;
      const x = c % dim[0], y = Math.floor(c / dim[0]) % dim[1], z = Math.floor(c / (dim[0] * dim[1]));
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= dim[0] || ny >= dim[1] || nz >= dim[2]) continue;
        const j = at(nx, ny, nz); if (occ[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (sz > biggest) biggest = sz;
  }
  return { dim, comps, biggest, total, strayFraction: total ? +(1 - biggest / total).toFixed(5) : 0 };
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
// A FRESH PAGE PER ROW. This is what makes "a row's meaning does not depend on the row
// before it" structurally true rather than promised: there is no row before it. The
// previous version reused one page and cleared a hand-kept list of ids, which is an
// inventory that every new row has to remember to extend — and did not: `cleftDepth` /
// `cleftLobes` / `cleftWidth` from the LOBED row leaked into everything after it. A reload
// costs a few seconds a row and cannot rot.
async function freshPage() {
  await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
  // Advanced, and open the Make accordion so the export button is clickable.
  await page.evaluate(() => {
    const t = document.getElementById('advancedToggle'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true }));
    const h = document.querySelector('.fl-acc__head[aria-controls="acc-make"]');
    if (h && h.getAttribute('aria-expanded') !== 'true') h.click();
  });
  await page.waitForTimeout(200);
}
await freshPage();

// READ-BACK: a value the UI silently rewrites would make this measure a different design
// from the one it names, and report a pass for it. Fail the config; never warn.
const applySets = (sets) => page.evaluate((ss) => {
  const bad = [];
  for (const s of ss) {
    const el = document.getElementById(s.id);
    if (!el) { bad.push(`${s.id}: not in the DOM`); continue; }
    el.value = s.value;
    el.dispatchEvent(new Event(s.evt || 'input', { bubbles: true }));
    if ((s.evt || 'input') !== 'change') el.dispatchEvent(new Event('change', { bubbles: true }));
    const got = el.value;
    const num = s.value !== '' && got !== '' && isFinite(Number(s.value)) && isFinite(Number(got));
    if (!(num ? Math.abs(Number(s.value) - Number(got)) < 1e-9 : String(s.value) === String(got))) bad.push(`${s.id}: set "${s.value}", reads back "${got}"`);
  }
  return bad;
}, sets);

const wiredSpec = WIRED.map((c) => ({ id: c.id, checkbox: c.kind === 'checkbox' }));
const readAll = () => page.evaluate((list) => {
  const out = {};
  for (const { id, checkbox } of list) {
    const el = document.getElementById(id);
    out[id] = el ? (checkbox ? el.checked : el.value) : '<MISSING>';
  }
  return out;
}, wiredSpec);

const sameValue = (a, b) => {
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b);
  const an = Number(a), bn = Number(b);
  if (a !== '' && b !== '' && isFinite(an) && isFinite(bn)) return Math.abs(an - bn) < 1e-9;
  return String(a) === String(b);
};

// FULL-STATE ASSERTION — validity check 1. Returns the ids whose live value is not what
// DEFAULTS + delta says it should be. Anything here means the row measured a design nobody
// asked for, under a label claiming otherwise.
async function stateDrift(sets) {
  const expected = { ...DEFAULTS };
  for (const s of sets) expected[s.id] = s.value;
  const got = await readAll();
  const bad = [];
  for (const c of WIRED) if (!sameValue(expected[c.id], got[c.id])) bad.push(`${c.id}: expected "${expected[c.id]}", live "${got[c.id]}"`);
  return bad;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flower-conn-'));
const results = [];
const validity = [];   // harness-validity failures — never suppressed by an xfail
for (const cfg of CONFIGS) {
  await freshPage();
  if (cfg.presetSlug) {
    // Load the preset by clicking its gallery cell — the real applyDesign path.
    const clicked = await page.evaluate((slug) => {
      const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`);
      if (!cell) return false;
      cell.click();
      return true;
    }, cfg.presetSlug);
    if (!clicked) { validity.push(`${cfg.label}: gallery cell not found`); continue; }
    // NOT the full-state assertion. A preset is a delta over DEFAULTS applied through
    // applyDesign, which MIGRATES it first — the seven are authored at PRESET_SCHEMA 17
    // and their `centerCurve` is carried onto the current `curlAmount` by the migration
    // that retired it. Predicting the post-migration state here would mean a second copy
    // of every migration, which is the drift this project keeps paying for. The reload
    // above already guarantees isolation, so what is left to check is that the preset
    // actually took: every id it names reads back its value, and every id it names that
    // is NOT a control today is genuinely gone from the panel rather than silently
    // ignored.
    const p = PRESETS.find((x) => x.slug === cfg.presetSlug);
    const bad = await page.evaluate((ui) => {
      const out = [];
      for (const [id, value] of Object.entries(ui)) {
        const el = document.getElementById(id);
        if (!el) continue;                       // retired by a migration — checked below
        const got = el.type === 'checkbox' ? el.checked : el.value;
        const num = value !== '' && got !== '' && isFinite(Number(value)) && isFinite(Number(got));
        if (!(num ? Math.abs(Number(value) - Number(got)) < 1e-9 : String(value) === String(got))) out.push(`${id}: preset says "${value}", reads back "${got}"`);
      }
      return out;
    }, p.ui);
    const live = new Set(WIRED.map((c) => c.id));
    for (const id of Object.keys(p.ui)) {
      const inPanel = await page.evaluate((x) => !!document.getElementById(x), id);
      if (!live.has(id) && inPanel) bad.push(`${id}: not a registry control, yet present in the panel — this preset key is being applied by something undeclared`);
    }
    if (bad.length) { validity.push(`${cfg.label}: preset did not take: ${bad.join('; ')}`); continue; }
  } else {
    const bad = [...await applySets(BASE), ...await applySets(cfg.set)];
    if (bad.length) { validity.push(`${cfg.label}: config did not take: ${bad.join('; ')}`); continue; }
    const drift = await stateDrift([...BASE, ...cfg.set]);
    if (drift.length) { validity.push(`${cfg.label}: state is not DEFAULTS+BASE+set: ${drift.join('; ')}`); continue; }
  }
  await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.click('#exportStl')]);
  if (!dl) { validity.push(`${cfg.label}: no STL download`); continue; }
  const fp = path.join(tmp, 'x.stl');
  await dl.saveAs(fp);
  const buf = fs.readFileSync(fp);
  const e = boundaryEdges(buf);
  const t = tailProbe(buf);
  const v = voxelComponents(buf, CELL_MM);
  if (v.skipped) results.push({ cfg, label: cfg.label, ok: null, ...e, ...t, note: `SKIPPED — grid ${v.dim.join('x')} exceeds ${MAX_VOXELS.toLocaleString()} voxels` });
  else results.push({ cfg, label: cfg.label, ok: v.comps === 1, ...e, ...t, ...v });
}
await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });

// ---- VALIDITY 2: tail probe. Every row declares the shape of its own underside. ----
for (const r of results) {
  const want = r.cfg.stem;
  if (typeof want !== 'boolean') { validity.push(`${r.label}: row declares no \`stem\` — the tail probe has nothing to check`); continue; }
  if (!isFinite(r.tailXZ)) { validity.push(`${r.label}: tail probe returned NaN (${r.tailVerts} vertices in the lowest ${TAIL_FRAC * 100}%)`); continue; }
  if (!isFinite(r.aspect)) { validity.push(`${r.label}: aspect is not finite`); continue; }
  if (want && r.aspect < STEM_ASPECT_MIN) validity.push(`${r.label}: declared stem:true but aspect=${r.aspect} < ${STEM_ASPECT_MIN} — this model is not tall enough to have a stem`);
  if (!want && r.aspect >= STEM_ASPECT_MIN) validity.push(`${r.label}: declared stem:false but aspect=${r.aspect} >= ${STEM_ASPECT_MIN} — this model is tall like a stemmed one`);
}
// ---- VALIDITY 3: pairwise triangle comparison, never a global reference. ----
for (const r of results) {
  if (!r.cfg.moreTrisThan) continue;
  const other = results.find((x) => x.label === r.cfg.moreTrisThan);
  if (!other) { validity.push(`${r.label}: pair partner "${r.cfg.moreTrisThan}" produced no result`); continue; }
  if (!(r.tris > other.tris)) validity.push(`${r.label}: ${r.tris} tris is not more than "${other.label}" at ${other.tris} — the paired difference this row exists to prove did not happen`);
}

console.log(`connectedness: voxel flood fill at ${CELL_MM} mm (min printable feature is 0.8 mm)\n`);
const xfails = [], xpasses = [], regressions = [];
for (const r of results) {
  const marked = r.cfg.xfail != null;
  let verdict;
  if (r.ok === null) verdict = 'SKIP';
  else if (r.ok && marked) { verdict = 'XPASS'; xpasses.push(r); }
  else if (r.ok) verdict = 'ok';
  else if (marked) { verdict = 'xfail'; xfails.push(r); }
  else { verdict = 'FAIL'; regressions.push(r); }
  const detail = r.comps !== undefined
    ? `components=${r.comps} stray=${r.strayFraction} tris=${r.tris} boundary=${r.boundary} tailXZ=${r.tailXZ} narrowFrac=${r.narrowFrac} aspect=${r.aspect}`
    : (r.note || '');
  console.log(`  ${verdict.padEnd(5)} ${r.label.padEnd(62)} ${detail}${marked && !r.ok ? ` (#${r.cfg.xfail})` : ''}`);
}
const clean = results.filter((r) => r.ok === true && r.cfg.xfail == null).length;
const skipped = results.filter((r) => r.ok === null);
console.log(`\n${clean}/${results.length} configs are ONE connected piece`
  + (xfails.length ? `; ${xfails.length} known-failing (xfail)` : '')
  + (skipped.length ? `; ${skipped.length} skipped (grid too large — NOT a pass)` : ''));
console.log('LIMITS: surface occupancy, not solid — two shells grazing within one cell read as joined. '
  + 'These configs are junction corners, the bare bloom and the shipped presets, not the export matrix; '
  + 'a pass here is not a general claim. See the header.');

let bad = false;
if (validity.length) {
  bad = true;
  console.error(`\nconnectedness: HARNESS INVALID — ${validity.length} validity assertion(s) failed. `
    + 'No result above is trustworthy, and an xfail marker does not cover these.');
  for (const v of validity) console.error(`  - ${v}`);
}
if (regressions.length) {
  bad = true;
  console.error(`\nconnectedness: FAIL — ${regressions.length} unmarked config(s) export as more than one piece:`);
  for (const f of regressions) console.error(`  - ${f.label}: ${f.comps} components, ${(f.strayFraction * 100).toFixed(2)}% of surface detached`);
}
if (xpasses.length) {
  bad = true;
  console.error(`\nconnectedness: FAIL (XPASS) — ${xpasses.length} config(s) marked xfail now export as ONE piece.`);
  console.error('  That is the fix landing. Remove the `xfail` marker from these rows in the SAME commit as');
  console.error('  the fix, or the gate stops protecting them. A stale xfail is a hole, so this is a hard error.');
  for (const f of xpasses) console.error(`  - ${f.label} (was tracked by #${f.cfg.xfail})`);
}
if (NEGATIVE_CONTROL) {
  // The point of the control run is that the harness REJECTS a mislabelled row.
  if (bad) { console.log('\nNEGATIVE CONTROL: PASS — the harness rejected the mislabelled row, as it must.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — the harness accepted a row whose declared base shape was wrong.');
  console.error('The validity checks are not measuring anything. Do not trust a PASS from this gate.');
  process.exit(1);
}
if (bad) process.exit(1);
console.log(`\nconnectedness: PASS — every unmarked config above exports as a single connected body`
  + (xfails.length ? ', and every xfail row is still failing as tracked.' : '.'));
