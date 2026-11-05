/* ===================================================================
   PHOTO-TO-BLOOM CENSUS (discovery, Nov 3 — throwaway, NOT a gate).

   Every user-facing bloom control, classified for a feature that reads a
   flower photo and writes a design file:
     a   readable from ONE front or three-quarter photo
     b   readable only from a SIDE view or a SECOND photo (below, the plant)
     c   not inferable from a photo — leave at the default, or ASK
     d   print / infrastructure / editor state — NEVER set by this feature
   and, beside it, the PHOTO-READABLE SCHEMA (§2 of the doc): the subset the
   feature may emit, each row's range read off the REGISTRY ROW at run time
   (never restated here) and narrowed only where the doc says why.

   THE CENSUS IS CHECKED AGAINST THE REGISTRY IN BOTH DIRECTIONS — every
   registry control is classified and every classified id is a live control —
   because a hand-written list of 201 ids drifts the day a control is added
   (the design file's rule 1; the registration rule). It refuses to print on a
   mismatch. It also refuses a schema row whose control is hidden at DEFAULTS
   behind a NEVER-TRUE predicate, or a choice value the registry marks hidden.

   RUN:  node tools/bloom-photo-census.mjs [--md]     (--md prints the doc tables)
   IMPORT: `SCHEMA`, `SCHEMA_VERSION` and `LAYER_SCHEMA` are exported for
           tools/verify-bloom-photo-subset.mjs; importing runs no census and
           prints nothing (the one load-time check is LAYER_SCHEMA against the
           geometry's own owned list — it throws, it does not print).
   =================================================================== */
import { CONTROLS, SECTIONS, DEFAULTS, evalPredicate, predicateDrivers } from '../bloom-registry.js';
import { SCOPE_LAYER_OWNED, SCOPE_VALUE_GROUPS, SCOPE_LAYER_PLACEMENTS } from '../bloom-geometry.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---- the classification: one entry per control, a class and a reason ---- */
const A = 'a', B = 'b', C = 'c', D = 'd';
const CLASS = {
  // Arrangement
  petalCount: [A, 'count the petals of one whorl'], spread: [A, 'the centre-to-petal proportion (disc diameter / flower diameter)'],
  placement: [A, 'ring / spiral-packed head / continuous / mirror-symmetric fan'], fanPerSide: [A, 'FAN only — petals each side of the plane'],
  fanSpacing: [A, 'FAN only — angle between neighbours'], fanCenterPetal: [A, 'FAN only — a petal on the mirror line or a gap'],
  scopePetals: [D, 'editor toggle that unlocks per-petal scopes — the photo schema writes no per-petal scopes'],
  scopeLayers: [B, 'the Per-layer values switch — schema v2 (S3) turns it ON exactly when it writes `overrides.layers`; v1 wrote no scopes'],
  layerCount: [A, 'single / semi-double / double — but inner layers are hidden in a dense double: confidence low there'],
  layerSize: [A, 'inner petals shorter than outer'], layerPhase: [A, 'inner petals staggered into the gaps or aligned'],
  layerTilt: [B, 'inner whorls more upright than outer — needs a side or low view'],
  varianceSize: [A, 'irregular petal sizes around the ring'], varianceForm: [A, 'irregular curl / cup / twist around the ring'], varianceSpacing: [A, 'irregular spacing'],
  varianceFrequency: [C, 'a wave law over the ring — a photo shows irregularity, not its frequency'], variancePhase: [C, 'where the wave starts — not meaningful from a photo'],
  // Petal shape
  petalLength: [C, 'ABSOLUTE millimetres — a photo carries proportions, never scale; the length is the anchor every other size is read against'],
  petalWidth: [A, 'read as width / length against petalLength'], petalOutlineMode: [A, 'LAW unless the outline needs the drawn curve'],
  petalOutlineCurve: [A, 'the petal outline traced from a face-on petal (a later schema; v1 stays LAW)'],
  petalBaseTaper: [A, 'how the petal narrows into its claw'], petalTipShape: [A, 'pointed / round / held-width tip'], petalTipTaper: [A, 'where the widest point sits along the petal'],
  petalTipEnd: [A, 'a squared tip (carnation)'], fringeCount: [A, 'carnation-style teeth at the tip'], fringeDepth: [A, 'how deep the fringe runs'],
  lobeDepth: [A, 'notched / lobed margins'], lobeCount: [A, 'how many teeth'], lobeCoverage: [A, 'how far round the margin the teeth run'],
  lobeCrestShape: [C, 'sub-millimetre tooth shape — below photo resolution in most pictures'], lobeNotchShape: [C, 'as the crest'],
  // Infill, texture: decoration, not anatomy
  petalInfill: [D, 'a Voronoi lattice — decoration, never in a photo; never set'], infillDensity: [D, 'infill'], infillRelax: [D, 'infill'], infillLaw: [D, 'infill'],
  infillAniso: [D, 'infill'], infillRound: [D, 'infill'], infillBase: [D, 'infill — and hidden by a never-true predicate (parked)'],
  petalTexture: [D, 'a printed surface texture — decoration; never set (PEBBLE / CELLULAR are hidden options and must never be written)'],
  textureHeight: [D, 'texture'], textureSize: [D, 'texture'], bonePoreSize: [D, 'texture'], bonePoreDensity: [D, 'texture'], boneBandRatio: [D, 'texture'],
  bonePatchCoverage: [D, 'texture'], boneCurvature: [D, 'texture'],
  // Tube
  tubeLayer1: [B, 'a fused corolla (bellflower, morning glory) — how far up the petals are joined; from the side'],
  tubeLayer2: [B, 'tube, layer 2'], tubeLayer3: [B, 'tube, layer 3'], tubeLayer4: [B, 'tube, layer 4'], tubeLayer5: [B, 'tube, layer 5'], tubeLayer6: [B, 'tube, layer 6'],
  tubeHeight: [B, 'fusion height'], tubeBlend: [B, 'how the fusion blends'],
  // Petal form
  petalCup: [A, 'cupped across the width / reflexed — shading in a three-quarter view'], petalCupGradient: [B, 'the cup varying along the length — side view'],
  buckleAmp: [A, 'ruffled / wavy margin'], buckleFreq: [A, 'waves along one margin'], buckleEnv: [C, 'how far in from the edge the ruffle reaches — rarely legible'],
  petalApexSweep: [B, 'the tip sweeping out of plane — side view'], petalRoll: [A, 'quilled petals (cactus dahlia)'], petalRollTaper: [B, 'the quill varying along the length'],
  // Petal curl
  petalTilt: [B, 'flat ↔ upright: a face-on photo foreshortens it, and tilt trades against spine curl in a 3/4 view (dry run, double)'],
  petalCurlMode: [B, 'SLIDER unless the spine needs the drawn curve'], petalSpineCurve: [B, 'the spine profile drawn from a side view (a later schema)'],
  petalSpineCurl: [B, 'incurved / reflexed along the length — side view'], curlBias: [B, 'where along the length the curl happens'], curlStart: [B, 'where the curl starts'],
  petalTwist: [A, 'pinwheel twist about the midrib'],
  // Part thickness
  sheetThickness: [D, 'the printed sheet — a print decision, never read from a photo'], tipThinning: [D, 'print'], footDelicacy: [D, 'print / junction plumbing'],
  // Head
  hubShape: [A, 'CAP / SPHERE (a globe head: allium, globe thistle) — SPHERE only under CONTINUOUS'], headRise: [B, 'a domed centre — visible in 3/4, measurable from the side'],
  // Center
  stamenCount: [A, 'a visible ring or disc of stamens — counted roughly'], stamenLayout: [A, 'ring or disc'], stamenSpread: [A, 'how wide the stamen ring stands'],
  stamenLength: [B, 'stamen length against the petal — 3/4 or side'], stamenLengthVariance: [A, 'uneven stamen lengths'], stamenCurl: [B, 'stamens curving — side'],
  stamenCoil: [A, 'coiled / braided filaments'], stamenCoilRadius: [C, 'coil detail'], stamenCoilTurns: [C, 'coil detail'],
  antherSize: [A, 'anther size against the filament'], antherElongation: [C, 'sub-mm anther detail'], antherRoundedness: [C, 'sub-mm anther detail'],
  antherPoints: [C, 'sub-mm anther detail'], antherPinch: [C, 'sub-mm anther detail'], antherLumps: [C, 'sub-mm anther detail'], antherSpread: [C, 'sub-mm anther detail'],
  gynoecium: [A, 'a visible style'], styleLength: [B, 'style length — side'], styleCurl: [B, 'style curvature — side'],
  stigmaSize: [A, 'stigma size'], stigmaLumps: [A, 'lobes of the stigma (a tulip\'s three)'], stigmaElongation: [C, 'sub-mm'], stigmaRoundedness: [C, 'sub-mm'],
  stigmaPoints: [C, 'sub-mm'], stigmaPinch: [C, 'sub-mm'], stigmaSpread: [C, 'sub-mm lobe splay'],
  // Sepals: under the flower
  sepalCount: [B, 'sepals sit under the petals — a side or underneath photo'], sepalTiers: [B, 'stacked sepal tiers — side'], sepalScale: [B, 'sepal size'],
  sepalLength: [B, 'sepal length'], sepalWidth: [B, 'sepal width'], sepalHeight: [D, 'where the sepals attach down the hub-to-stem join — plumbing'],
  sepalPhase: [B, 'sepals between or behind the petals'], sepalFootBreadth: [D, 'junction plumbing'], sepalAngle: [B, 'sepal angle — side'],
  sepalOutlineMode: [B, 'sepal outline'], sepalOutlineCurve: [B, 'sepal outline curve'], sepalBaseTaper: [B, 'sepal shape'], sepalTipShape: [B, 'sepal shape'],
  sepalTipTaper: [B, 'sepal shape'], sepalCup: [B, 'sepal form'], sepalCupGradient: [B, 'sepal form'], sepalBuckleAmp: [B, 'sepal form'], sepalBuckleFreq: [B, 'sepal form'],
  sepalBuckleEnv: [C, 'sepal form detail'], sepalApexSweep: [B, 'sepal form'], sepalRoll: [B, 'sepal form'], sepalRollTaper: [B, 'sepal form'],
  sepalCurlMode: [B, 'sepal curl'], sepalSpineCurve: [B, 'sepal curl'], sepalSpineCurl: [B, 'sepal curl'], sepalCurlBias: [B, 'sepal curl'], sepalCurlStart: [B, 'sepal curl'], sepalTwist: [B, 'sepal curl'],
  // Stem: the plant, a second photo, and scale
  stemLength: [C, 'ABSOLUTE length, and whether to print a stem at all — a design choice; photos crop stems'], stemDiameter: [C, 'absolute — ask, or the default'],
  stemCut: [D, 'how the printed stem ends — fabrication'], stemNodeSwelling: [B, 'nodes on the stem — a whole-plant photo'], stemNodeKink: [B, 'a zigzag stem — whole-plant photo'],
  leafNodes: [B, 'nodes / leaves up the stem — whole-plant photo'], leafPhyllotaxy: [B, 'leaf arrangement'], leafDivergence: [B, 'leaf divergence'],
  leafNodeStart: [B, 'where the leaves start'], leafNodeEnd: [B, 'where they stop'], leafNodeSpacing: [B, 'crowding of the nodes'],
  hubStyle: [B, 'the receptacle\'s silhouette under the head — side view'], hubShapeAmount: [B, 'receptacle'], hubLength: [B, 'receptacle'],
  leafLength: [B, 'a leaf photo (absolute length is c)'], leafType: [B, 'simple / compound / lobed — leaf photo'], leafWidth: [B, 'leaf'], lobedWidth: [B, 'leaf'],
  leafAngle: [B, 'leaf angle off the stem'], leafSizeTaper: [B, 'leaves smaller up the stem'], leafCurlMode: [B, 'leaf'], leafSpineCurve: [B, 'leaf'], leafArch: [B, 'leaf arch'],
  leafCup: [B, 'leaf cup'], leafOutlineMode: [B, 'leaf'], leafOutlineCurve: [B, 'leaf outline traced from a leaf photo'], leafTipShape: [B, 'leaf'],
  leafletPairs: [B, 'compound leaf'], leafletFirst: [B, 'compound leaf'], leafletLast: [B, 'compound leaf'], leafletAngle: [B, 'compound leaf'], leafletLength: [B, 'compound leaf'],
  leafletWidth: [B, 'compound leaf'], leafletBasalRatio: [B, 'compound leaf'], leafletTerminalLength: [B, 'compound leaf'], leafletTerminalWidth: [B, 'compound leaf'],
  leafletOutlineMode: [B, 'compound leaf'], leafletOutlineCurve: [B, 'compound leaf'], leafletTipShape: [B, 'compound leaf'], leafletStalk: [B, 'compound leaf'], leafletTerminalStalk: [B, 'compound leaf'],
  lobedLobes: [B, 'lobed leaf'], lobedFrom: [B, 'lobed leaf'], lobedTo: [B, 'lobed leaf'], lobedSinus: [B, 'lobed leaf'], lobedRound: [C, 'lobed leaf sinus detail'],
  lobedShape: [B, 'lobed leaf'], lobedAngle: [B, 'lobed leaf'], lobedEase: [C, 'lobed leaf detail'],
  leafToothDepth: [B, 'serration'], leafletToothDepth: [B, 'serration'], lobedToothDepth: [B, 'serration'], lobedToothCount: [B, 'serration'], leafToothCount: [B, 'serration'],
  leafCrestShape: [C, 'serration tooth shape'], leafNotchShape: [C, 'serration tooth shape'],
  // Inflorescence: readable when the photo shows the whole head
  inflorescence: [A, 'one flower / a spike (raceme) / an umbel — when the photo shows the whole head'], umbelFlorets: [A, 'florets in the umbel'], umbelHead: [A, 'a terminal flower among the umbel'],
  umbelDepth: [A, 'a compound umbel (hydrangea mophead)'], umbelRays: [A, 'rays of a compound umbel'], umbelRayLength: [B, 'ray length'], umbelRayAngle: [B, 'ray angle'],
  floretNodes: [A, 'nodes on a spike'], floretPhyllotaxy: [A, 'floret arrangement on the spike'], pedicelLength: [B, 'pedicel length'], pedicelGradient: [B, 'lower pedicels longer'],
  pedicelCorymb: [A, 'a flat-topped head'], pedicelAngle: [B, 'pedicel angle'], floretPetals: [A, 'petals per floret'], floretScale: [A, 'floret size against the head'],
  nodeVariance: [C, 'a per-node form wave'],
};

/* ---- the PHOTO-READABLE SCHEMA (v1): what the feature may emit -------------
   `range` overrides the registry's only where the doc gives the reason; every
   other row emits the control's full registry range. */
export const SCHEMA = [
  // structure
  { id: 'placement', group: 'structure', values: ['RADIAL', 'SPIRAL', 'CONTINUOUS', 'FAN'] },
  { id: 'petalCount', group: 'structure' }, { id: 'layerCount', group: 'structure' }, { id: 'layerSize', group: 'structure' },
  { id: 'layerPhase', group: 'structure' }, { id: 'layerTilt', group: 'structure', ask: true },
  { id: 'fanPerSide', group: 'structure' }, { id: 'fanSpacing', group: 'structure' }, { id: 'fanCenterPetal', group: 'structure' },
  { id: 'spread', group: 'structure' }, { id: 'hubShape', group: 'structure' }, { id: 'headRise', group: 'structure' },
  // the anchor
  { id: 'petalLength', group: 'scale', ask: true, note: 'the scale anchor: from the answer to Q1, else the default 35 mm' },
  // outline
  { id: 'petalWidth', group: 'outline' }, { id: 'petalBaseTaper', group: 'outline' }, { id: 'petalTipShape', group: 'outline' },
  { id: 'petalTipTaper', group: 'outline' }, { id: 'petalTipEnd', group: 'outline' }, { id: 'fringeCount', group: 'outline' }, { id: 'fringeDepth', group: 'outline' },
  { id: 'lobeDepth', group: 'outline' }, { id: 'lobeCount', group: 'outline' }, { id: 'lobeCoverage', group: 'outline' },
  // form
  { id: 'petalTilt', group: 'form', ask: true }, { id: 'petalSpineCurl', group: 'form', ask: true }, { id: 'petalCup', group: 'form' },
  { id: 'petalTwist', group: 'form' }, { id: 'petalRoll', group: 'form' }, { id: 'buckleAmp', group: 'form' }, { id: 'buckleFreq', group: 'form' },
  { id: 'varianceSize', group: 'form', range: [0, 0.25], note: 'half the slider: a photo of one flower supports "slightly irregular", not a wave' },
  { id: 'varianceForm', group: 'form', range: [0, 0.5], note: 'as varianceSize' },
  // centre
  { id: 'stamenCount', group: 'centre' }, { id: 'stamenLayout', group: 'centre' }, { id: 'stamenSpread', group: 'centre' },
  { id: 'stamenLength', group: 'centre' }, { id: 'antherSize', group: 'centre' },
  { id: 'gynoecium', group: 'centre' }, { id: 'styleLength', group: 'centre' }, { id: 'stigmaSize', group: 'centre' }, { id: 'stigmaLumps', group: 'centre' },
  // tube (side-view, asked)
  { id: 'tubeLayer1', group: 'tube', ask: true }, { id: 'tubeHeight', group: 'tube', ask: true },
  // sepals (only from a second photo or an answer)
  { id: 'sepalCount', group: 'sepals', ask: true }, { id: 'sepalScale', group: 'sepals' }, { id: 'sepalAngle', group: 'sepals' },
  /* SCHEMA v3 (S4, Nov 5 — the outline stage): the drawn outline, global. The
     46 rows above are v1's, unchanged. CURVE replaces the whole boundary law
     (F6-sym): the tapers, tip shape, squared end, lobes and fringe hide and go
     inert, so a v3 subset that sets CURVE drops them. The curve value carries
     the Symmetric / Asymmetric toggle as its own `mode`. The sepal outline is
     included because the sepal controls (count, size, angle) are already on
     the schema — a reading of the S4 brief, flagged in §12 of the doc. */
  { id: 'petalOutlineMode', group: 'outline', values: ['LAW', 'CURVE'], since: 3 },
  { id: 'petalOutlineCurve', group: 'outline', since: 3, note: 'symmetric or two-sided (the toggle); traced from a face-on petal' },
  { id: 'sepalOutlineMode', group: 'sepals', values: ['LAW', 'CURVE'], since: 3 },
  { id: 'sepalOutlineCurve', group: 'sepals', since: 3, note: 'symmetric or two-sided; one curve for every sepal (no FAN pairing on sepals)' },
];

/* ---- SCHEMA VERSION 2 (photo-to-bloom S3, Nov 5): THE PER-LAYER ROWS ------
   The 46 global rows above are UNCHANGED (v1's). v2 adds what a LAYER entry
   (`overrides.layers[i]`) may carry, restricted to what a layer OWNS OUTRIGHT
   rather than offsets (§9.6, §11 of the doc):
     offsets  petalLength / petalWidth / petalTilt — Q3.5: a layer entry naming
              one of these OWNS it (the layer's value is global + offset, and
              the `layerSize` / `layerTilt` ramp's term is left out for it);
     values   the spine — `petalCurlMode` / `petalSpineCurve` (F3-scope);
              and since v3 (S4) the OUTLINE — `petalOutlineMode` /
              `petalOutlineCurve` (F6-scope): each layer owns its curve, the
              Oct 11 ruling, replacing the whole bloom's outright.
   NOT in v2, each a W1 when written:
     - every other offset (the ~30 delta-on-global sliders: petalCup,
       petalSpineCurl, … — a layer cannot own them, only nudge the global);
     - (v2 only) the OUTLINE values — v3 adds them (ruling (d), §11.8);
     - petal / tier / strand entries (per-petal is FAN only; tiers are sepals).
   The switch: `scopeLayers` ON, under one of `placements` — the geometry's own
   SCOPE_LAYER_PLACEMENTS. The owned list is RESTATED here and checked against
   the geometry's SCOPE_LAYER_OWNED at load, both directions: importing it
   would let a quantity added to the geometry enter the photo schema silently. */
export const SCHEMA_VERSION = 3;
export const LAYER_SCHEMA = Object.freeze({
  switch: 'scopeLayers',
  placements: ['RADIAL', 'SPIRAL'],
  offsets: ['petalLength', 'petalWidth', 'petalTilt'],
  values: ['petalCurlMode', 'petalSpineCurve', 'petalOutlineMode', 'petalOutlineCurve'],
});
{
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!same(LAYER_SCHEMA.offsets, SCOPE_LAYER_OWNED)) throw new Error(`LAYER_SCHEMA.offsets [${LAYER_SCHEMA.offsets}] is not the geometry's SCOPE_LAYER_OWNED [${SCOPE_LAYER_OWNED}]`);
  const owned = [...SCOPE_VALUE_GROUPS.spine, ...SCOPE_VALUE_GROUPS.outline];
  if (!same(LAYER_SCHEMA.values, owned)) throw new Error(`LAYER_SCHEMA.values [${LAYER_SCHEMA.values}] is not the geometry's spine + outline value groups [${owned}]`);
  if (!same(LAYER_SCHEMA.placements, SCOPE_LAYER_PLACEMENTS)) throw new Error(`LAYER_SCHEMA.placements [${LAYER_SCHEMA.placements}] is not the geometry's SCOPE_LAYER_PLACEMENTS [${SCOPE_LAYER_PLACEMENTS}]`);
}

/* Everything below runs only when this file is RUN. The photo-subset validator
   imports SCHEMA (one owner of the 46 rows) and must not inherit the census's
   process.exit. */
const IS_MAIN = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
/* ---- checks: both directions, the hidden options, the never-true gates ---- */
const ids = new Set(CONTROLS.map((c) => c.id));
const missing = CONTROLS.filter((c) => !CLASS[c.id]).map((c) => c.id);
const stray = Object.keys(CLASS).filter((k) => !ids.has(k));
const bad = [];
if (missing.length) bad.push(`unclassified controls: ${missing.join(', ')}`);
if (stray.length) bad.push(`classified ids that are not controls: ${stray.join(', ')}`);
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
for (const r of SCHEMA) {
  const c = byId[r.id];
  if (!c) { bad.push(`schema row ${r.id} is not a control`); continue; }
  if (CLASS[r.id][0] === D) bad.push(`schema row ${r.id} is class d — never set`);
  if (c.kind === 'choice') {
    const hiddenOpts = (c.options || []).filter((o) => o.hidden).map((o) => o.value);
    for (const v of r.values || c.options.map((o) => o.value)) if (hiddenOpts.includes(v)) bad.push(`schema row ${r.id} would emit the hidden option ${v}`);
  }
  if (r.range && c.kind === 'slider' && (r.range[0] < c.min || r.range[1] > c.max)) bad.push(`schema row ${r.id} widens the registry range`);
}
if (CLASS[LAYER_SCHEMA.switch] && CLASS[LAYER_SCHEMA.switch][0] === D) bad.push(`the per-layer switch ${LAYER_SCHEMA.switch} is class d — never set`);
for (const id of [...LAYER_SCHEMA.offsets, ...LAYER_SCHEMA.values, LAYER_SCHEMA.switch]) if (!byId[id]) bad.push(`per-layer schema row ${id} is not a control`);
if (bad.length) { console.error('CENSUS INVALID:\n  ' + bad.join('\n  ')); process.exit(2); }

const secLabel = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label || s.id]));
const secParent = Object.fromEntries(SECTIONS.map((s) => [s.id, s.parent || null]));
const pathOf = (id) => { const p = []; let s = id; while (s) { p.unshift(secLabel[s]); s = secParent[s]; } return p.join(' › '); };
const rangeOf = (c) => c.kind === 'slider' ? `${c.min}..${c.max}` : c.kind === 'choice' ? c.options.map((o) => o.value + (o.hidden ? ' (hidden)' : '')).join(' / ') : 'curve';
const visDefault = (c) => !c.visibleWhen || evalPredicate(c.visibleWhen, DEFAULTS);
const neverTrue = (c) => c.visibleWhen && JSON.stringify(c.visibleWhen).includes('"any":[]');

const counts = { a: 0, b: 0, c: 0, d: 0 };
for (const c of CONTROLS) counts[CLASS[c.id][0]]++;
if (!process.argv.includes('--md')) {
  console.log(`CENSUS: ${CONTROLS.length} controls — a ${counts.a} · b ${counts.b} · c ${counts.c} · d ${counts.d}; schema v${SCHEMA_VERSION}: ${SCHEMA.length} global rows (${SCHEMA.filter((r) => !r.since).length} v1 + ${SCHEMA.filter((r) => r.since === 3).length} outline, v3) + per-layer (${LAYER_SCHEMA.switch} ON under ${LAYER_SCHEMA.placements.join('/')}; offsets ${LAYER_SCHEMA.offsets.join(', ')}; values ${LAYER_SCHEMA.values.join(', ')}); every control classified, every class an id`);
  process.exit(0);
}
console.log(`| control | kind | section | range / options | default | class | why |\n|---|---|---|---|---|---|---|`);
for (const c of CONTROLS) {
  const [k, why] = CLASS[c.id];
  const flags = [neverTrue(c) ? 'HIDDEN ALWAYS (never-true predicate)' : (!visDefault(c) ? 'hidden at defaults' : ''), (c.options || []).some((o) => o.hidden) ? 'has hidden options' : ''].filter(Boolean).join('; ');
  console.log(`| \`${c.id}\` | ${c.kind} | ${pathOf(c.section)} | ${rangeOf(c)} | ${JSON.stringify(c.default).slice(0, 18)} | **${k}** | ${why}${flags ? ` — _${flags}_` : ''} |`);
}
console.log(`\nTotals: **a ${counts.a} · b ${counts.b} · c ${counts.c} · d ${counts.d}** of ${CONTROLS.length}.\n`);
console.log(`| group | control | emitted range | default | asked when unsure | note |\n|---|---|---|---|---|---|`);
for (const r of SCHEMA) {
  const c = byId[r.id];
  const rng = c.kind === 'choice' ? (r.values || c.options.filter((o) => !o.hidden).map((o) => o.value)).join(' / ') : (r.range ? `${r.range[0]}..${r.range[1]} (registry ${c.min}..${c.max})` : `${c.min}..${c.max} step ${c.step}`);
  console.log(`| ${r.group} | \`${r.id}\` | ${rng} | ${JSON.stringify(c.default)} | ${r.ask ? 'yes' : ''} | ${r.note || ''} |`);
}
}
