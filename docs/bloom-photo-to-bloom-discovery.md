# Photo to bloom — discovery (Nov 3)

**What this is.** A discovery for a feature where Eva pastes a photo of a flower and gets a bloom
design file that approximates it, with a few clarifying questions asked only when the photo cannot
answer something that matters. **Nothing ships.** No file the page loads was changed:
`bloom.html`, `bloom.js`, `bloom-geometry.js`, `bloom-registry.js`, `bloom-file.js` and
`netlify/` are untouched (predeclared, checked by `git diff --stat` at close). The PR adds this doc,
two throwaway tools, six hand-written design subsets, the six design files they compose to, one
CC0 photo crop and one sheet.

| file | what |
|---|---|
| `tools/bloom-photo-census.mjs` | the census (§1) and the schema (§2), checked against the registry both ways; `--md` prints the tables below |
| `tools/bloom-photo-dryrun.mjs` | the dry run (§6): subset → complete design file → loaded through the page's own Load path → rendered; `--sheet` composes the sheet |
| `docs/photo-to-bloom/*.subset.json` | what route A would write, by hand, for three flowers, two passes each |
| `docs/photo-to-bloom/*.bloom-design.json` | the complete `bloom-design` v1 files those compose to (loadable on `/bloom` as they are) |
| `docs/img/photo-to-bloom-dry-run.png` | the sheet (the tulip photos are placeholders — §6.1) |

**Eva ruled on all eight open questions on Nov 3 — §7.** The questions as asked are kept below the rulings.

---

## 0. Premises checked before building on them

| premise in the brief | measured |
|---|---|
| "round-trip through the existing saved-design load path, including the **silent** clamping rules already ruled for out-of-range values" | **Half true.** The design-file reader (`bloom-file.js`) clamps an out-of-range slider and snaps an off-step one — and **TELLS**, as a `clamped` note on the status line; a bad choice is `invalid` and not applied. The only *silent* clamp is the sepal twins' (`SEPAL_TWIN_BOUNDS`: a saved `sepalRoll` past ±180 builds at ±180 with no note — Eva's Q-S6 ruling, Oct 9), applied in the geometry, not the reader. So the feature's acceptance check can be strict: **a design it emits must load with zero notes** (§2.4). All six dry-run files did: 201 of 201 controls applied, 0 notes. |
| a subset file is a design file | **No.** Rule 3 of the reader: *a missing field is reported and the page keeps what it has.* A file naming 15 controls loaded onto a page that holds another design keeps the other 186 — the new flower inherits the old one's leftovers, plus 186 `missing` notes. The dry run composes every subset over `DEFAULTS` with the reader's own writer (`composeDoc`) — §2.3, and a question for Eva (Q2). |
| route B "does to the flat no-build stack" something new | **The stack already has a Function.** `netlify.toml` declares `netlify/functions`, `designs.mjs` is a public, rate-limited, Blobs-backed endpoint for the Flower gallery, and `package.json` exists so Netlify installs its dependency at deploy. Route B would be a second Function on an existing pattern, not a first server (§5). |
| photos are available | **Not from this session.** The proxy refuses Wikimedia, iNaturalist's site and API, Unsplash and Flickr; it allows iNaturalist's **open-data** S3 bucket, which serves photos by id with no metadata. One CC0 photo was identified through a Commons file page (search result, verify before reuse); two more were picked by eye from a random sample of the bucket, and their author and licence could not be read here — they are used for the session's own comparison and **not committed** (§6.1). |

---

## 1. Parameter census

201 user-facing controls (`CONTROLS` in `bloom-registry.js`: 168 sliders, 26 choices, 7 curves), every
one classified. The table is printed by `node tools/bloom-photo-census.mjs --md`, which **refuses to
print** if a registry control is unclassified or a classified id is not a control (seen failing: a
copy with `nodeVariance` deleted reads `CENSUS INVALID: unclassified controls: nodeVariance`).

- **a** — readable from ONE front or three-quarter photo
- **b** — readable only from a SIDE view or a SECOND photo (underneath, the stem, a leaf)
- **c** — not inferable from a photo: leave at the default, or ASK
- **d** — print / infrastructure / editor state: **never set by this feature**

**Totals: a 49 · b 102 · c 27 · d 23.** The b column is large because the stem, leaves and sepals
are whole-plant structures (74 of the 102 are stem/leaf/leaflet/sepal controls); a face-on flower
photo reads almost none of them.

**Never written, beyond class d:**

- **`petalTexture`'s `PEBBLE` and `CELLULAR`** are hidden options (kept so old designs load). The
  census refuses a schema row that could emit one.
- **`infillBase`** is hidden at every state by a never-true predicate (parked by ruling). It is d.
- **`scopeLayers` / `scopePetals`** are editor toggles. v1 writes no scopes, so they stay `OFF`.
- **A control hidden by its own predicate under the emitted state** (163 of 201 are hidden at
  `DEFAULTS`) is hidden AND inert, so writing it is harmless but meaningless. The schema emits a
  control only where its predicate is true under the state being emitted (§2.2).
- **`umbelDepth`'s depth-2 overlay** is written only by a HAND switch; a load never writes it.
  A route that wants a mophead must write the overlay's values itself.

<details><summary>The full table (201 rows)</summary>

| control | kind | section | range / options | default | class | why |
|---|---|---|---|---|---|---|
| `petalCount` | slider | Arrangement | 3..40 | 8 | **a** | count the petals of one whorl |
| `petalLength` | slider | petal › Petal shape | 20..100 | 35 | **c** | ABSOLUTE millimetres — a photo carries proportions, never scale; the length is the anchor every other size is read against |
| `petalWidth` | slider | petal › Petal shape | 8..46 | 16 | **a** | read as width / length against petalLength |
| `petalOutlineMode` | choice | petal › Petal shape | LAW / CURVE | "LAW" | **a** | LAW unless the outline needs the drawn curve |
| `petalOutlineCurve` | curve | petal › Petal shape | curve | {"mode":"symmetric | **a** | the petal outline traced from a face-on petal (a later schema; v1 stays LAW) — _hidden at defaults_ |
| `petalBaseTaper` | slider | petal › Petal shape | 0.3..3 | 1 | **a** | how the petal narrows into its claw |
| `petalTipShape` | slider | petal › Petal shape | 0.6..3 | 1.7 | **a** | pointed / round / held-width tip |
| `petalTipTaper` | slider | petal › Petal shape | 0.6..4 | 1.8 | **a** | where the widest point sits along the petal |
| `petalTipEnd` | slider | petal › Petal shape | 0..1 | 0 | **a** | a squared tip (carnation) |
| `fringeCount` | slider | petal › Petal shape › Fringe | 0..10 | 0 | **a** | carnation-style teeth at the tip |
| `fringeDepth` | slider | petal › Petal shape › Fringe | 0.05..0.5 | 0.2 | **a** | how deep the fringe runs — _hidden at defaults_ |
| `lobeDepth` | slider | petal › Petal shape › Lobes | 0..1 | 0 | **a** | notched / lobed margins |
| `lobeCount` | slider | petal › Petal shape › Lobes | 1..10 | 6 | **a** | how many teeth — _hidden at defaults_ |
| `lobeCoverage` | slider | petal › Petal shape › Lobes | 0.1..1 | 0.8 | **a** | how far round the margin the teeth run — _hidden at defaults_ |
| `petalInfill` | choice | petal › Infill | NONE / VORONOI | "NONE" | **d** | a Voronoi lattice — decoration, never in a photo; never set |
| `infillDensity` | slider | petal › Infill | 8..40 | 20 | **d** | infill — _hidden at defaults_ |
| `infillRelax` | slider | petal › Infill | 0..12 | 5 | **d** | infill — _hidden at defaults_ |
| `infillLaw` | slider | petal › Infill | 0..2 | 0.3 | **d** | infill — _hidden at defaults_ |
| `infillAniso` | slider | petal › Infill | 1..3 | 1.65 | **d** | infill — _hidden at defaults_ |
| `infillRound` | slider | petal › Infill | 0..1 | 0.6 | **d** | infill — _hidden at defaults_ |
| `infillBase` | slider | petal › Infill | 0..1 | 0 | **d** | infill — and hidden by a never-true predicate (parked) — _HIDDEN ALWAYS (never-true predicate)_ |
| `petalTexture` | choice | petal › Texture | NONE / BONE / PEBBLE (hidden) / CELLULAR (hidden) | "NONE" | **d** | a printed surface texture — decoration; never set (PEBBLE / CELLULAR are hidden options and must never be written) — _has hidden options_ |
| `textureHeight` | slider | petal › Texture | 0.4..2.5 | 0.4 | **d** | texture — _hidden at defaults_ |
| `textureSize` | slider | petal › Texture | 1.6..12 | 4 | **d** | texture — _hidden at defaults_ |
| `bonePoreSize` | slider | petal › Texture | 0.5..1 | 0.5 | **d** | texture — _hidden at defaults_ |
| `bonePoreDensity` | slider | petal › Texture | 0.2..1 | 0.9 | **d** | texture — _hidden at defaults_ |
| `boneBandRatio` | slider | petal › Texture | 1.5..3 | 3 | **d** | texture — _hidden at defaults_ |
| `bonePatchCoverage` | slider | petal › Texture | 0.1..1 | 0.6 | **d** | texture — _hidden at defaults_ |
| `boneCurvature` | slider | petal › Texture | 0.2..4 | 1 | **d** | texture — _hidden at defaults_ |
| `tubeLayer1` | slider | petal › Tube | 0..40 | 40 | **b** | a fused corolla (bellflower, morning glory) — how far up the petals are joined; from the side |
| `tubeLayer2` | slider | petal › Tube | 0..40 | 40 | **b** | tube, layer 2 — _hidden at defaults_ |
| `tubeLayer3` | slider | petal › Tube | 0..40 | 40 | **b** | tube, layer 3 — _hidden at defaults_ |
| `tubeLayer4` | slider | petal › Tube | 0..40 | 40 | **b** | tube, layer 4 — _hidden at defaults_ |
| `tubeLayer5` | slider | petal › Tube | 0..40 | 40 | **b** | tube, layer 5 — _hidden at defaults_ |
| `tubeLayer6` | slider | petal › Tube | 0..40 | 40 | **b** | tube, layer 6 — _hidden at defaults_ |
| `tubeHeight` | slider | petal › Tube › Fusion | 0.1..0.7 | 0.25 | **b** | fusion height — _hidden at defaults_ |
| `tubeBlend` | slider | petal › Tube › Fusion | 0..1 | 1 | **b** | how the fusion blends — _hidden at defaults_ |
| `lobeCrestShape` | slider | petal › Petal shape › Lobes | 0.6..3 | 2 | **c** | sub-millimetre tooth shape — below photo resolution in most pictures — _hidden at defaults_ |
| `lobeNotchShape` | slider | petal › Petal shape › Lobes | 0.6..3 | 2 | **c** | as the crest — _hidden at defaults_ |
| `petalCup` | slider | petal › Petal form | -0.8..1.2 | 0 | **a** | cupped across the width / reflexed — shading in a three-quarter view |
| `petalCupGradient` | slider | petal › Petal form | -0.8..1.2 | 0 | **b** | the cup varying along the length — side view |
| `buckleAmp` | slider | petal › Petal form | 0..0.6 | 0 | **a** | ruffled / wavy margin |
| `buckleFreq` | slider | petal › Petal form | 1..7 | 3 | **a** | waves along one margin — _hidden at defaults_ |
| `buckleEnv` | slider | petal › Petal form | 2..6 | 3 | **c** | how far in from the edge the ruffle reaches — rarely legible — _hidden at defaults_ |
| `petalApexSweep` | slider | petal › Petal form | 0..1 | 0 | **b** | the tip sweeping out of plane — side view |
| `petalTilt` | slider | petal › Petal curl | 0..120 | 25 | **b** | flat ↔ upright: a face-on photo foreshortens it, and tilt trades against spine curl in a 3/4 view (dry run, double) |
| `petalCurlMode` | choice | petal › Petal curl | SLIDER / CURVE | "SLIDER" | **b** | SLIDER unless the spine needs the drawn curve |
| `petalSpineCurve` | curve | petal › Petal curl | curve | {"mode":"single"," | **b** | the spine profile drawn from a side view (a later schema) — _hidden at defaults_ |
| `petalSpineCurl` | slider | petal › Petal curl | -180..360 | 0 | **b** | incurved / reflexed along the length — side view |
| `curlBias` | slider | petal › Petal curl | 0..1 | 0 | **b** | where along the length the curl happens — _hidden at defaults_ |
| `curlStart` | slider | petal › Petal curl | 0..0.95 | 0 | **b** | where the curl starts — _hidden at defaults_ |
| `petalRoll` | slider | petal › Petal form | -330..330 | 0 | **a** | quilled petals (cactus dahlia) |
| `petalRollTaper` | slider | petal › Petal form | -1..1 | 0 | **b** | the quill varying along the length — _hidden at defaults_ |
| `petalTwist` | slider | petal › Petal curl | -180..180 | 0 | **a** | pinwheel twist about the midrib |
| `sheetThickness` | slider | Part thickness | 0.6..2.4 | 1.2 | **d** | the printed sheet — a print decision, never read from a photo |
| `tipThinning` | slider | Part thickness | 0..0.8 | 0 | **d** | print |
| `footDelicacy` | slider | Part thickness | 0.25..1 | 1 | **d** | print / junction plumbing |
| `spread` | slider | Arrangement | 0.6..6 | 2 | **a** | the centre-to-petal proportion (disc diameter / flower diameter) |
| `hubShape` | choice | Head | CAP / SPHERE | "CAP" | **a** | CAP / SPHERE (a globe head: allium, globe thistle) — SPHERE only under CONTINUOUS — _hidden at defaults_ |
| `headRise` | slider | Head | 0..1 | 0 | **b** | a domed centre — visible in 3/4, measurable from the side |
| `placement` | choice | Arrangement | RADIAL / SPIRAL / CONTINUOUS / FAN | "RADIAL" | **a** | ring / spiral-packed head / continuous / mirror-symmetric fan |
| `fanPerSide` | slider | Arrangement | 1..8 | 3 | **a** | FAN only — petals each side of the plane — _hidden at defaults_ |
| `fanSpacing` | slider | Arrangement | 15..170 | 45 | **a** | FAN only — angle between neighbours — _hidden at defaults_ |
| `fanCenterPetal` | choice | Arrangement | OFF / ON | "ON" | **a** | FAN only — a petal on the mirror line or a gap — _hidden at defaults_ |
| `scopePetals` | choice | Arrangement | OFF / ON | "OFF" | **d** | editor toggle that unlocks per-petal scopes — v1 writes no scopes — _hidden at defaults_ |
| `layerCount` | slider | Arrangement | 1..6 | 1 | **a** | single / semi-double / double — but inner layers are hidden in a dense double: confidence low there |
| `layerSize` | slider | Arrangement | 0.35..0.9 | 0.72 | **a** | inner petals shorter than outer — _hidden at defaults_ |
| `layerPhase` | slider | Arrangement | 0..1 | 0.5 | **a** | inner petals staggered into the gaps or aligned — _hidden at defaults_ |
| `layerTilt` | slider | Arrangement | 0..30 | 12 | **b** | inner whorls more upright than outer — needs a side or low view — _hidden at defaults_ |
| `scopeLayers` | choice | Arrangement | OFF / ON | "OFF" | **d** | editor toggle that unlocks per-layer scopes — v1 writes no scopes |
| `varianceSize` | slider | Arrangement › Variance | 0..0.5 | 0 | **a** | irregular petal sizes around the ring |
| `varianceForm` | slider | Arrangement › Variance | 0..1 | 0 | **a** | irregular curl / cup / twist around the ring |
| `varianceSpacing` | slider | Arrangement › Variance | 0..0.9 | 0 | **a** | irregular spacing |
| `varianceFrequency` | slider | Arrangement › Variance | 0..20 | 1 | **c** | a wave law over the ring — a photo shows irregularity, not its frequency — _hidden at defaults_ |
| `variancePhase` | slider | Arrangement › Variance | 0..360 | 0 | **c** | where the wave starts — not meaningful from a photo — _hidden at defaults_ |
| `stamenCount` | slider | Center › Androecium | 0..120 | 0 | **a** | a visible ring or disc of stamens — counted roughly |
| `stamenLayout` | choice | Center › Androecium | RING / DISC | "RING" | **a** | ring or disc — _hidden at defaults_ |
| `stamenSpread` | slider | Center › Androecium | 0.6..6 | 2 | **a** | how wide the stamen ring stands — _hidden at defaults_ |
| `stamenLength` | slider | Center › Androecium | 5..120 | 20 | **b** | stamen length against the petal — 3/4 or side — _hidden at defaults_ |
| `stamenLengthVariance` | slider | Center › Androecium | 0..1 | 0 | **a** | uneven stamen lengths — _hidden at defaults_ |
| `stamenCurl` | slider | Center › Androecium | -180..180 | 0 | **b** | stamens curving — side — _hidden at defaults_ |
| `stamenCoil` | choice | Center › Androecium | NONE / INDEPENDENT / BRAIDED | "NONE" | **a** | coiled / braided filaments — _hidden at defaults_ |
| `stamenCoilRadius` | slider | Center › Androecium | 0..10 | 1.5 | **c** | coil detail — _hidden at defaults_ |
| `stamenCoilTurns` | slider | Center › Androecium | 0.5..12 | 3 | **c** | coil detail — _hidden at defaults_ |
| `antherSize` | slider | Center › Androecium › Anther | 0.6..6 | 1.6 | **a** | anther size against the filament — _hidden at defaults_ |
| `antherElongation` | slider | Center › Androecium › Anther | 1..6 | 2.5 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `antherRoundedness` | slider | Center › Androecium › Anther | 0..1 | 1 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `antherPoints` | slider | Center › Androecium › Anther | 2..12 | 4 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `antherPinch` | slider | Center › Androecium › Anther | 0.05..7 | 1 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `antherLumps` | slider | Center › Androecium › Anther | 1..6 | 1 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `antherSpread` | slider | Center › Androecium › Anther | 0..90 | 0 | **c** | sub-mm anther detail — _hidden at defaults_ |
| `stigmaSize` | slider | Center › Gynoecium › Stigma | 0.6..6 | 1.6 | **a** | stigma size — _hidden at defaults_ |
| `stigmaElongation` | slider | Center › Gynoecium › Stigma | 1..6 | 2.5 | **c** | sub-mm — _hidden at defaults_ |
| `stigmaRoundedness` | slider | Center › Gynoecium › Stigma | 0..1 | 1 | **c** | sub-mm — _hidden at defaults_ |
| `stigmaPoints` | slider | Center › Gynoecium › Stigma | 2..12 | 4 | **c** | sub-mm — _hidden at defaults_ |
| `stigmaPinch` | slider | Center › Gynoecium › Stigma | 0.05..7 | 1 | **c** | sub-mm — _hidden at defaults_ |
| `stigmaLumps` | slider | Center › Gynoecium › Stigma | 1..6 | 3 | **a** | lobes of the stigma (a tulip's three) — _hidden at defaults_ |
| `stigmaSpread` | slider | Center › Gynoecium › Stigma | 0..90 | 40 | **c** | sub-mm lobe splay — _hidden at defaults_ |
| `gynoecium` | choice | Center › Gynoecium | NONE / STYLE | "NONE" | **a** | a visible style |
| `styleLength` | slider | Center › Gynoecium | 5..40 | 25 | **b** | style length — side — _hidden at defaults_ |
| `styleCurl` | slider | Center › Gynoecium | -180..180 | 0 | **b** | style curvature — side — _hidden at defaults_ |
| `sepalCount` | slider | Sepals | 0..40 | 0 | **b** | sepals sit under the petals — a side or underneath photo |
| `sepalTiers` | slider | Sepals | 1..4 | 1 | **b** | stacked sepal tiers — side — _hidden at defaults_ |
| `sepalScale` | slider | Sepals | 0.2..1 | 0.6 | **b** | sepal size — _hidden at defaults_ |
| `sepalLength` | slider | Sepals | 0..120 | 0 | **b** | sepal length — _hidden at defaults_ |
| `sepalWidth` | slider | Sepals | 0..30 | 0 | **b** | sepal width — _hidden at defaults_ |
| `sepalHeight` | slider | Sepals | 0..1 | 0.75 | **d** | where the sepals attach down the hub-to-stem join — plumbing — _hidden at defaults_ |
| `sepalPhase` | slider | Sepals | 0..1 | 0.5 | **b** | sepals between or behind the petals — _hidden at defaults_ |
| `sepalFootBreadth` | slider | Sepals | 0.25..1.5 | 1 | **d** | junction plumbing — _hidden at defaults_ |
| `sepalAngle` | slider | Sepals › Sepal curl | -90..90 | 0 | **b** | sepal angle — side — _hidden at defaults_ |
| `sepalOutlineMode` | choice | Sepals › Sepal shape | LAW / CURVE | "LAW" | **b** | sepal outline — _hidden at defaults_ |
| `sepalOutlineCurve` | curve | Sepals › Sepal shape | curve | {"mode":"symmetric | **b** | sepal outline curve — _hidden at defaults_ |
| `sepalBaseTaper` | slider | Sepals › Sepal shape | 0.3..3 | 1 | **b** | sepal shape — _hidden at defaults_ |
| `sepalTipShape` | slider | Sepals › Sepal shape | 0.6..3 | 1.7 | **b** | sepal shape — _hidden at defaults_ |
| `sepalTipTaper` | slider | Sepals › Sepal shape | 0.6..4 | 1.8 | **b** | sepal shape — _hidden at defaults_ |
| `sepalCup` | slider | Sepals › Sepal form | -0.8..1.2 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalCupGradient` | slider | Sepals › Sepal form | -0.8..1.2 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalBuckleAmp` | slider | Sepals › Sepal form | 0..0.6 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalBuckleFreq` | slider | Sepals › Sepal form | 1..7 | 3 | **b** | sepal form — _hidden at defaults_ |
| `sepalBuckleEnv` | slider | Sepals › Sepal form | 2..6 | 3 | **c** | sepal form detail — _hidden at defaults_ |
| `sepalApexSweep` | slider | Sepals › Sepal form | 0..1 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalRoll` | slider | Sepals › Sepal form | -180..180 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalRollTaper` | slider | Sepals › Sepal form | -1..1 | 0 | **b** | sepal form — _hidden at defaults_ |
| `sepalCurlMode` | choice | Sepals › Sepal curl | SLIDER / CURVE | "SLIDER" | **b** | sepal curl — _hidden at defaults_ |
| `sepalSpineCurve` | curve | Sepals › Sepal curl | curve | {"mode":"single"," | **b** | sepal curl — _hidden at defaults_ |
| `sepalSpineCurl` | slider | Sepals › Sepal curl | -180..360 | 0 | **b** | sepal curl — _hidden at defaults_ |
| `sepalCurlBias` | slider | Sepals › Sepal curl | 0..1 | 0 | **b** | sepal curl — _hidden at defaults_ |
| `sepalCurlStart` | slider | Sepals › Sepal curl | 0..0.95 | 0 | **b** | sepal curl — _hidden at defaults_ |
| `sepalTwist` | slider | Sepals › Sepal curl | -180..180 | 0 | **b** | sepal curl — _hidden at defaults_ |
| `stemLength` | slider | Stem | 0..120 | 0 | **c** | ABSOLUTE length, and whether to print a stem at all — a design choice; photos crop stems |
| `stemDiameter` | slider | Stem | 3..12 | 6 | **c** | absolute — ask, or the default — _hidden at defaults_ |
| `stemCut` | choice | Stem | FLORIST / FLAT | "FLORIST" | **d** | how the printed stem ends — fabrication — _hidden at defaults_ |
| `stemNodeSwelling` | slider | Stem | 0..1 | 0 | **b** | nodes on the stem — a whole-plant photo — _hidden at defaults_ |
| `stemNodeKink` | slider | Stem | 0..1 | 0 | **b** | a zigzag stem — whole-plant photo — _hidden at defaults_ |
| `leafNodes` | slider | Stem | 1..8 | 3 | **b** | nodes / leaves up the stem — whole-plant photo — _hidden at defaults_ |
| `leafPhyllotaxy` | choice | Stem | alternate / opposite / whorled | "alternate" | **b** | leaf arrangement — _hidden at defaults_ |
| `leafDivergence` | slider | Stem | 90..180 | 180 | **b** | leaf divergence — _hidden at defaults_ |
| `leafNodeStart` | slider | Stem | 0.05..0.95 | 0.16 | **b** | where the leaves start — _hidden at defaults_ |
| `leafNodeEnd` | slider | Stem | 0.05..0.95 | 0.86 | **b** | where they stop — _hidden at defaults_ |
| `leafNodeSpacing` | slider | Stem | -1..1 | 0 | **b** | crowding of the nodes — _hidden at defaults_ |
| `hubStyle` | choice | Stem › Hub | GOBLET / ANGLED / CURVED | "CURVED" | **b** | the receptacle's silhouette under the head — side view — _hidden at defaults_ |
| `hubShapeAmount` | slider | Stem › Hub | 0..2 | 0.5 | **b** | receptacle — _hidden at defaults_ |
| `hubLength` | slider | Stem › Hub | 0..40 | 0 | **b** | receptacle — _hidden at defaults_ |
| `leafLength` | slider | Stem › Leaves | 0..120 | 0 | **b** | a leaf photo (absolute length is c) — _hidden at defaults_ |
| `leafType` | choice | Stem › Leaves | SIMPLE / COMPOUND / LOBED | "SIMPLE" | **b** | simple / compound / lobed — leaf photo — _hidden at defaults_ |
| `leafWidth` | slider | Stem › Leaves | 3..40 | 17 | **b** | leaf — _hidden at defaults_ |
| `lobedWidth` | slider | Stem › Leaves | 3..40 | 34 | **b** | leaf — _hidden at defaults_ |
| `leafAngle` | slider | Stem › Leaves | -60..90 | 35 | **b** | leaf angle off the stem — _hidden at defaults_ |
| `leafSizeTaper` | slider | Stem › Leaves | -0.75..0.75 | 0 | **b** | leaves smaller up the stem — _hidden at defaults_ |
| `leafCurlMode` | choice | Stem › Leaves | SLIDER / CURVE | "SLIDER" | **b** | leaf — _hidden at defaults_ |
| `leafSpineCurve` | curve | Stem › Leaves | curve | {"mode":"single"," | **b** | leaf — _hidden at defaults_ |
| `leafArch` | slider | Stem › Leaves | -90..180 | 0 | **b** | leaf arch — _hidden at defaults_ |
| `leafCup` | slider | Stem › Leaves | -0.8..1.2 | 0.35 | **b** | leaf cup — _hidden at defaults_ |
| `leafOutlineMode` | choice | Stem › Leaves | LAW / CURVE | "LAW" | **b** | leaf — _hidden at defaults_ |
| `leafOutlineCurve` | curve | Stem › Leaves | curve | {"mode":"symmetric | **b** | leaf outline traced from a leaf photo — _hidden at defaults_ |
| `leafTipShape` | slider | Stem › Leaves | 0.6..3 | 1.3 | **b** | leaf — _hidden at defaults_ |
| `leafletPairs` | slider | Stem › Leaves › Leaflets | 1..4 | 2 | **b** | compound leaf — _hidden at defaults_ |
| `leafletFirst` | slider | Stem › Leaves › Leaflets | 0.05..0.45 | 0.15 | **b** | compound leaf — _hidden at defaults_ |
| `leafletLast` | slider | Stem › Leaves › Leaflets | 0.5..1 | 0.65 | **b** | compound leaf — _hidden at defaults_ |
| `leafletAngle` | slider | Stem › Leaves › Leaflets | 20..90 | 62 | **b** | compound leaf — _hidden at defaults_ |
| `leafletLength` | slider | Stem › Leaves › Leaflets | 4..60 | 26 | **b** | compound leaf — _hidden at defaults_ |
| `leafletWidth` | slider | Stem › Leaves › Leaflets | 3..40 | 17 | **b** | compound leaf — _hidden at defaults_ |
| `leafletBasalRatio` | slider | Stem › Leaves › Leaflets | 0.4..1.4 | 0.8 | **b** | compound leaf — _hidden at defaults_ |
| `leafletTerminalLength` | slider | Stem › Leaves › Leaflets | 4..60 | 30 | **b** | compound leaf — _hidden at defaults_ |
| `leafletTerminalWidth` | slider | Stem › Leaves › Leaflets | 3..40 | 19 | **b** | compound leaf — _hidden at defaults_ |
| `leafletOutlineMode` | choice | Stem › Leaves › Leaflets | LAW / CURVE | "LAW" | **b** | compound leaf — _hidden at defaults_ |
| `leafletOutlineCurve` | curve | Stem › Leaves › Leaflets | curve | {"mode":"symmetric | **b** | compound leaf — _hidden at defaults_ |
| `leafletTipShape` | slider | Stem › Leaves › Leaflets | 0.6..3 | 1.6 | **b** | compound leaf — _hidden at defaults_ |
| `leafletStalk` | slider | Stem › Leaves › Leaflets | 0..20 | 2.5 | **b** | compound leaf — _hidden at defaults_ |
| `leafletTerminalStalk` | slider | Stem › Leaves › Leaflets | 0..30 | 7 | **b** | compound leaf — _hidden at defaults_ |
| `lobedLobes` | slider | Stem › Leaves › Lobes | 1..6 | 3 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedFrom` | slider | Stem › Leaves › Lobes | 0.02..0.4 | 0.08 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedTo` | slider | Stem › Leaves › Lobes | 0.5..0.95 | 0.8 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedSinus` | slider | Stem › Leaves › Lobes | 0..0.9 | 0.55 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedRound` | slider | Stem › Leaves › Lobes | 0..0.5 | 0.12 | **c** | lobed leaf sinus detail — _hidden at defaults_ |
| `lobedShape` | slider | Stem › Leaves › Lobes | 0.5..2.5 | 0.55 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedAngle` | slider | Stem › Leaves › Lobes | 0..60 | 22 | **b** | lobed leaf — _hidden at defaults_ |
| `lobedEase` | slider | Stem › Leaves › Lobes | 0.5..0.95 | 0.9 | **c** | lobed leaf detail — _hidden at defaults_ |
| `leafToothDepth` | slider | Stem › Leaves › Serration | 0..1 | 0.26 | **b** | serration — _hidden at defaults_ |
| `leafletToothDepth` | slider | Stem › Leaves › Serration | 0..1 | 0 | **b** | serration — _hidden at defaults_ |
| `lobedToothDepth` | slider | Stem › Leaves › Serration | 0..1 | 0.22 | **b** | serration — _hidden at defaults_ |
| `lobedToothCount` | slider | Stem › Leaves › Serration | 1..6 | 4 | **b** | serration — _hidden at defaults_ |
| `leafToothCount` | slider | Stem › Leaves › Serration | 1..12 | 9 | **b** | serration — _hidden at defaults_ |
| `leafCrestShape` | slider | Stem › Leaves › Serration | 0.6..3 | 2 | **c** | serration tooth shape — _hidden at defaults_ |
| `leafNotchShape` | slider | Stem › Leaves › Serration | 0.6..3 | 2 | **c** | serration tooth shape — _hidden at defaults_ |
| `inflorescence` | choice | Inflorescence | NONE / RACEME / UMBEL | "NONE" | **a** | one flower / a spike (raceme) / an umbel — when the photo shows the whole head — _hidden at defaults_ |
| `umbelFlorets` | slider | Inflorescence | 2..12 | 6 | **a** | florets in the umbel — _hidden at defaults_ |
| `umbelHead` | choice | Inflorescence | OFF / ON | "OFF" | **a** | a terminal flower among the umbel — _hidden at defaults_ |
| `umbelDepth` | choice | Inflorescence | 1 / 2 | "1" | **a** | a compound umbel (hydrangea mophead) — _hidden at defaults_ |
| `umbelRays` | slider | Inflorescence | 2..12 | 12 | **a** | rays of a compound umbel — _hidden at defaults_ |
| `umbelRayLength` | slider | Inflorescence | 5..120 | 40 | **b** | ray length — _hidden at defaults_ |
| `umbelRayAngle` | slider | Inflorescence | -60..90 | 50 | **b** | ray angle — _hidden at defaults_ |
| `floretNodes` | slider | Inflorescence | 1..12 | 5 | **a** | nodes on a spike — _hidden at defaults_ |
| `floretPhyllotaxy` | choice | Inflorescence | alternate / opposite / whorled | "alternate" | **a** | floret arrangement on the spike — _hidden at defaults_ |
| `pedicelLength` | slider | Inflorescence | 0..250 | 20 | **b** | pedicel length — _hidden at defaults_ |
| `pedicelGradient` | slider | Inflorescence | 0..3 | 1 | **b** | lower pedicels longer — _hidden at defaults_ |
| `pedicelCorymb` | choice | Inflorescence | OFF / ON | "OFF" | **a** | a flat-topped head — _hidden at defaults_ |
| `pedicelAngle` | slider | Inflorescence | -60..90 | 35 | **b** | pedicel angle — _hidden at defaults_ |
| `floretPetals` | slider | Inflorescence › Floret | 3..12 | 5 | **a** | petals per floret — _hidden at defaults_ |
| `floretScale` | slider | Inflorescence › Floret | 0.2..1 | 0.6 | **a** | floret size against the head — _hidden at defaults_ |
| `nodeVariance` | slider | Inflorescence › Floret | 0..1 | 0 | **c** | a per-node form wave — _hidden at defaults_ |

</details>

---

## 2. The photo-readable schema

### 2.1 The subset

46 controls. Every range is the **registry row's own**, read at run time (the census tool never
restates one); two rows are narrowed, and the table says why. "Asked" marks a row whose value comes
from a question when confidence is low (§3).

| group | control | emitted range | default | asked when unsure | note |
|---|---|---|---|---|---|
| structure | `placement` | RADIAL / SPIRAL / CONTINUOUS / FAN | "RADIAL" |  |  |
| structure | `petalCount` | 3..40 step 1 | 8 |  |  |
| structure | `layerCount` | 1..6 step 1 | 1 |  |  |
| structure | `layerSize` | 0.35..0.9 step 0.01 | 0.72 |  |  |
| structure | `layerPhase` | 0..1 step 0.01 | 0.5 |  |  |
| structure | `layerTilt` | 0..30 step 1 | 12 | yes |  |
| structure | `fanPerSide` | 1..8 step 1 | 3 |  |  |
| structure | `fanSpacing` | 15..170 step 1 | 45 |  |  |
| structure | `fanCenterPetal` | OFF / ON | "ON" |  |  |
| structure | `spread` | 0.6..6 step 0.05 | 2 |  |  |
| structure | `hubShape` | CAP / SPHERE | "CAP" |  |  |
| structure | `headRise` | 0..1 step 0.01 | 0 |  |  |
| scale | `petalLength` | 20..100 step 1 | 35 | yes | the scale anchor: from the answer to Q1, else the default 35 mm |
| outline | `petalWidth` | 8..46 step 1 | 16 |  |  |
| outline | `petalBaseTaper` | 0.3..3 step 0.05 | 1 |  |  |
| outline | `petalTipShape` | 0.6..3 step 0.05 | 1.7 |  |  |
| outline | `petalTipTaper` | 0.6..4 step 0.05 | 1.8 |  |  |
| outline | `petalTipEnd` | 0..1 step 0.05 | 0 |  |  |
| outline | `fringeCount` | 0..10 step 1 | 0 |  |  |
| outline | `fringeDepth` | 0.05..0.5 step 0.01 | 0.2 |  |  |
| outline | `lobeDepth` | 0..1 step 0.01 | 0 |  |  |
| outline | `lobeCount` | 1..10 step 1 | 6 |  |  |
| outline | `lobeCoverage` | 0.1..1 step 0.05 | 0.8 |  |  |
| form | `petalTilt` | 0..120 step 1 | 25 | yes |  |
| form | `petalSpineCurl` | -180..360 step 5 | 0 | yes |  |
| form | `petalCup` | -0.8..1.2 step 0.01 | 0 |  |  |
| form | `petalTwist` | -180..180 step 5 | 0 |  |  |
| form | `petalRoll` | -330..330 step 5 | 0 |  |  |
| form | `buckleAmp` | 0..0.6 step 0.01 | 0 |  |  |
| form | `buckleFreq` | 1..7 step 1 | 3 |  |  |
| form | `varianceSize` | 0..0.25 (registry 0..0.5) | 0 |  | half the slider: a photo of one flower supports "slightly irregular", not a wave |
| form | `varianceForm` | 0..0.5 (registry 0..1) | 0 |  | as varianceSize |
| centre | `stamenCount` | 0..120 step 1 | 0 |  |  |
| centre | `stamenLayout` | RING / DISC | "RING" |  |  |
| centre | `stamenSpread` | 0.6..6 step 0.05 | 2 |  |  |
| centre | `stamenLength` | 5..120 step 1 | 20 |  |  |
| centre | `antherSize` | 0.6..6 step 0.05 | 1.6 |  |  |
| centre | `gynoecium` | NONE / STYLE | "NONE" |  |  |
| centre | `styleLength` | 5..40 step 1 | 25 |  |  |
| centre | `stigmaSize` | 0.6..6 step 0.05 | 1.6 |  |  |
| centre | `stigmaLumps` | 1..6 step 1 | 3 |  |  |
| tube | `tubeLayer1` | 0..40 step 1 | 40 | yes |  |
| tube | `tubeHeight` | 0.1..0.7 step 0.01 | 0.25 | yes |  |
| sepals | `sepalCount` | 0..40 step 1 | 0 | yes |  |
| sepals | `sepalScale` | 0.2..1 step 0.05 | 0.6 |  |  |
| sepals | `sepalAngle` | -90..90 step 1 | 0 |  |  |

What is **not** in v1, on purpose:

- **The curve controls** (`petalOutlineCurve`, `petalSpineCurve`). A traced outline is the most
  photo-faithful single thing the bloom can take, and the obvious v2. But a curve value has
  validators that refuse edits (floor, fold limit), so it needs its own round-trip work.
- **Scopes** (per-layer, per-petal values). A tulip's outer and inner tepals differ, and the
  scoping model can hold that. v1 emits globals only.
- **Stem, leaves, inflorescence.** These are class b, from a second photo. The stem's length is
  a design choice (Q1).

### 2.2 Emission rules

1. **Write a complete file.** Overlay the subset on `DEFAULTS` and write it through
   `bloom-file.js`'s own `composeDoc`. That is one writer, never a second serialiser (§2.3).
2. **Never write a class-d control, a hidden option, or a scope.**
3. **Write a schema control only where its `visibleWhen` predicate is true under the emitted state.**
   A `fringeDepth` with `fringeCount` 0 is inert; leave it at its default.
4. **Stay inside each row's registry range and on its step.**
5. **Each emitted value carries a confidence and its source:** `photo`, `answer` or `default`. This
   lives in the route's output beside the file, never inside it (§4, Q6).

### 2.3 Why the file is complete and not the subset

**[Ruled Nov 3, §7 ruling 2: the page gets a "load as new design" mode and route A emits SUBSETS — construction (ii) below.]**

A subset loaded onto a page that already holds a design inherits that design's leftovers (rule 3,
above). There are two ways out:

- **(i)** the route always writes a complete file composed over `DEFAULTS` — what the dry run does;
- **(ii)** the page gains a "load as a new design" path that resets to `DEFAULTS` first and then
  applies a partial file.

(i) needs no page change, but a chat model writing 201 keys by hand is error-prone (§5, route A).
(ii) is a page change. **This is Q2 for Eva.**

### 2.4 The round-trip check, and what it measured

**A design the feature emits must load with zero notes.** Rule 3 of the reader makes every
departure a note, so zero notes means every field arrived as written.

The dry tool runs the reader (`readDoc`) on its own output BEFORE loading. It then reports the
notes from the page's own `__bloomDesign.load`. On all six files: **201/201 controls applied,
0 notes.**

---

## 3. Question bank

**Rule: a question is asked only when the photo leaves a parameter at low confidence AND that
parameter changes the result a lot.** It is never a fixed questionnaire. Each question below names
the parameters it resolves, its trigger, and its default if unanswered (unanswered is allowed).

The order is by how much a wrong guess cost in the dry run (§6).

| # | question | resolves | ask when | default if unanswered |
|---|---|---|---|---|
| Q-scale | "About how big should the printed flower be? (petal length or overall width in mm)" | `petalLength` (the scale anchor; every other size is read as a ratio against it) | **[Ruled Nov 3, ruling 1: only when the proportions look wrong at 35 mm]** ~~always, unless a size was given with the photo~~; a photo never carries scale | 35 mm (the registry default) |
| Q-profile | "Seen from the side, is it flat, a shallow bowl, a deep cup, a closed globe, or reflexed (petals bending back)?" | `petalTilt`, `petalSpineCurl`, `layerTilt` | no side or low view, and the face-on silhouette fits more than one profile. **Tilt and spine curl trade against each other in a 3/4 view** — the double tulip overshot both ways (§6) | the profile class the photo suggests, at middle values |
| Q-focal | "There are several flowers — which one?" (or "the open one or the bud?") | the whole design | more than one flower in focus, or flowers at different stages (the tulip photo: an open bloom and a closed one) | the largest, sharpest flower |
| Q-layers | "Is it single, semi-double or fully double?" | `layerCount`, `layerSize` | inner petals hidden or the centre not visible | from the visible rings |
| Q-count | "Roughly how many petals in the outer ring?" | `petalCount` | petals overlap so much the ring cannot be counted, or the flower is seen edge-on | the visible count ×(360°/visible arc) |
| Q-centre | "Is the centre a flat disc, a dome, or a tuft of stamens?" | `headRise`, `stamenCount`, `stamenLayout`, `gynoecium` | centre in shadow or covered | flat, no stamens |
| Q-ruffle | "Are the petal edges ruffled/wavy, or are those creases and shadows?" | `buckleAmp`, `buckleFreq` | margin waviness at the photo's resolution limit (the double tulip) | not ruffled |
| Q-tube | "Are the petals joined into a tube at the base?" | `tubeLayer1`, `tubeHeight` | a funnel/bell silhouette with no visible base | not joined |
| Q-sepals | "Are there green sepals under the petals? (a photo from below helps)" | `sepalCount`, `sepalScale`, `sepalAngle` | sepal tips visible between petals but their count is not | none |
| Q-stem | "Should it have a stem? Leaves? (a photo of the whole plant helps)" | `stemLength`, and the leaf family from a second photo | only if Eva wants the plant, not just the head — a design choice, not a reading | no stem |

Two meta-rules for the route:

- **At most three questions before the first render.** The rest can come after it. The cheapest
  answer is often the render itself (§5).
- **A "second photo" answer is a better question than a word answer** for anything class b.
  Offer it.

---

## 4. Unmappable features — report, never approximate silently

The output carries a list of what the photo shows that the bloom cannot build. Each entry names the
feature, and the nearest thing the design did instead (or "nothing").

**[Ruled Nov 3, §7 ruling 6: in a sidecar file beside the design file; the reader is untouched.]** **Where the list lives was Q6.** The design file's reader reports any unknown top-level key as an
`unknown` note and drops it. So `unmapped` cannot ride inside a v1 file without breaking §2.4's
zero-note check.

| feature in the photo | the bloom today | report as |
|---|---|---|
| **colour, colour pattern, veining, blotches** (the tulip's black base, the daisy's pink-tipped rays) | none: one material, no colour | always reported when present; never approximated |
| **nodding / pendant / drooping heads, bells hanging down** | the head always opens along +z; articulation is gated and not built | "head orientation: upright only" + the nearest upright form |
| **composite disc florets** (daisy, sunflower centres) | the hub is a smooth cap; `stamenLayout DISC` at the floor length (5 mm) reads as **bristles**, not florets (dry run, daisy v2) | "disc florets: smooth dome" — and do NOT approximate with stamens (§6) |
| **ruffles finer or deeper than the buckle allows** | `buckleAmp` is clamped by curvature; `buckleFreq` caps at 7 cycles | built at the clamp, with the asked-vs-built numbers the read-out already prints |
| **petals differing by whorl** (tulip outer vs inner tepals, iris falls vs standards on a radial bloom) | possible through layer / per-petal scopes; v1 writes globals | "whorls differ: averaged" |
| **an S-curved or reflexed-tip tepal** (open tulip tips flaring out over a cup) | the spine curve can draw it; v1 uses the slider curl | "tip reflex: not drawn" |
| **petal overlap / imbrication** | petals pass through each other. This is the accepted look, but it shows as crossings at the foot when petals are wide and upright (tulip v2) | "petals overlap: drawn interpenetrating" |
| **corona, spurs, nectar tubes, hoods** | corona reserved, not built; no spurs | named, nothing built |
| **hairs, fuzz, translucency, waxy sheen** | none | always |
| **a flower outside the printable size range** (an 8 mm daisy ray; petals are 20–100 mm) | `petalLength` floor 20 mm | "printed at ≥ N× life size" |
| **leaves, stem, sepals visible but not classifiable from this photo** | class b | "needs a second photo" |
| **florets in a dense head (pompon, allium)** beyond the budget | the inflorescence and the budget clamp | the clamp's own told count |

---

## 5. Two delivery routes — side by side, not chosen

**[Ruled Nov 3, §7 ruling 3: route A for v1; route B deferred, no key, no Function work. The B column stays as its costing.]**

|  | **A. Chat-side** | **B. In-site** |
|---|---|---|
| **flow** | Eva pastes a photo into a Claude chat or session. Claude asks ≤ 3 questions and writes a `bloom-design.json`. Eva loads it on `/bloom` (Load button or drop). To iterate, she pastes a screenshot of the render back. | A paste box on `/bloom` posts the photo to a Netlify Function, which calls the Claude API. The function returns the subset, per-value confidences, the questions and the unmapped list. The page asks the questions inline, composes over `DEFAULTS` and loads the result through its own `applyDesign`. |
| **who writes the complete file** | the chat model, all 201 keys, by hand. It needs `DEFAULTS` in context (a saved default design is 4 KB of JSON to paste in). A dropped key loads as `missing` and inherits the page's value. **Or** the page gains Q2's "load as a new design" path, and Claude writes only the subset. | the page, with `composeDoc`. The model emits only the subset, constrained by a JSON schema derived from the census tool, and cannot drop a key. |
| **iteration** | Strong: Claude sees the render screenshot next to the photo, which is what the dry run's second pass was. Costs Eva a screenshot and a paste each round. | The page can send `canvas.toDataURL()` of the render back for one refinement call. Automatic, and doubles the cost of a design. |
| **API key** | none: Eva's own Claude subscription | `ANTHROPIC_API_KEY` as a Netlify environment variable, read only by the Function, never shipped to the client. **Deploy previews are public URLs and get the same env var unless it is scoped to production** — the key would be spendable from any PR preview. |
| **cost per design** (estimate, list prices from the `claude-api` skill, cached Oct 6) | inside the subscription | One call ≈ 1.6 k image tokens + 5 k schema/system tokens (cacheable) + 2–3 k output with thinking. **Opus 5.5 ($4 / $20 per M): ≈ $0.07–0.10. Sonnet 5.5 ($2 / $10): ≈ $0.04–0.05. Haiku 5.5 ($0.10 / $0.50): < $0.01.** With one refinement round, roughly double. Image token counts are an estimate, not measured — `count_tokens` on a real photo before quoting. |
| **abuse** | none | **A public endpoint that spends money.** `designs.mjs` already has the pattern: per-IP rate limit in Blobs, payload caps, a separate preview store. Add a per-day global spend ceiling, or gate behind the tracker's password or a `?dev` flag. |
| **stack impact** | nothing on the site | One more file in `netlify/functions/`, and `@anthropic-ai/sdk` in `package.json`. Netlify installs it at deploy, the precedent `@netlify/blobs` set. The page stays no-build (a `fetch` to `/.netlify/functions/…`). **Not testable in this repo's CI as it stands**: no workflow runs Functions, and a live-API test spends money. |
| **privacy** | the photo goes to Claude under Eva's account terms | the photo goes to the Anthropic API from a public page, on behalf of whoever uses it. A privacy note on the page is owed. |
| **failure modes** | a hand-written file with a typo'd key or a value off its step. The reader tells (`unknown`, `clamped`) and keeps loading. | the model's output fails the schema: refuse and show the error. A refusal or `max_tokens` stop: show it. Network or rate limit: say so. The design file stays the only thing the page loads either way. |
| **what it would take** | a prompt (the schema, the question bank, the unmapped list), plus Q2's decision. Arguably zero code. | a Function, a schema export from the census tool, a page panel, a rate limiter and a spend ceiling. A real session. |

Things both routes share, so not a reason to choose: the schema (§2), the question bank (§3), the
unmapped list (§4) and the zero-note acceptance check (§2.4). Route A is a strict subset of route B's
work, so building A first loses nothing.

---

## 6. Dry run — three flowers, route A by hand

Three structurally different flowers:

- a **single composite** (common daisy, *Bellis perennis*, face-on);
- a **cupped single** (garden tulip, three-quarter side view, with a closed bud beside it);
- a **dense double** (double "peony" tulips, three-quarter).

For each, the session looked at the photo and wrote the photo-readable subset by hand (`-v1`, the
blind pass). It then looked at that render beside the photo and wrote one revision (`-v2`), which
is route A's iteration loop.

`node tools/bloom-photo-dryrun.mjs <out> --sheet <png>` composes each subset over `DEFAULTS`,
writes the complete file, and loads it through `window.__bloomDesign.load` (the Load button's own
function). It renders with print preview ON, as a visitor sees it, chrome hidden, each view settled
on two byte-identical frames. **No pixel delta is quoted**: the comparison is Eva's eye.

![dry run](img/photo-to-bloom-dry-run.png)

### 6.1 The photos

| flower | source | in the repo |
|---|---|---|
| daisy | iNaturalist photo **26598961**, *Bellis perennis*, Peter de Lange — **CC0** per its Wikimedia Commons file page's iNaturalist review (read from a search result; verify before reuse) | a 480 px crop, `docs/photo-to-bloom/photos/daisy-inat-26598961.jpg` |
| tulip | iNaturalist photo **270483011** (open-data bucket, `photos/270483011/large.jpeg`) | **not committed**: author and licence unreadable from this session |
| double | iNaturalist photo **193335846** (open-data bucket), cropped to one yellow double tulip | **not committed**, same reason |

The committed sheet shows placeholders for the two tulips. The full sheet with all three photos was
sent to Eva in the session and not committed.

### 6.2 What each pass wrote, and what came back

| file | controls written (beyond DEFAULTS) | page load | export tris | max dimension |
|---|---|---|---|---|
| `daisy-v1` | `petalCount` 22, `layerCount` 2, `layerSize` 0.9, `layerPhase` 0.5, `layerTilt` 4, `petalLength` 35, `petalWidth` 8, `petalTipShape` 2, `petalTilt` 6, `petalCup` 0.1, `spread` 3.5, `headRise` 0.35 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 138,184 | 120.3 mm |
| `daisy-v2` | `petalCount` 20, `layerCount` 2, `layerSize` 0.9, `layerPhase` 0.5, `layerTilt` 4, `petalLength` 35, `petalWidth` 11, `petalTipShape` 2.6, `petalTilt` 6, `petalCup` 0.1, `spread` 2.4, `headRise` 0.4, `stamenCount` 120, `stamenLayout` DISC, `stamenLength` 5, `stamenSpread` 6, `antherSize` 1.2, `antherElongation` 1 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 280,496 | 108.1 mm |
| `double-v1` | `placement` RADIAL, `petalCount` 8, `layerCount` 6, `layerSize` 0.82, `layerPhase` 0.5, `layerTilt` 8, `petalLength` 40, `petalWidth` 30, `petalTipShape` 2.5, `petalTilt` 55, `petalCup` 0.6, `buckleAmp` 0.15, `buckleFreq` 3 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 217,056 | 94.1 mm |
| `double-v2` | `placement` RADIAL, `petalCount` 8, `layerCount` 5, `layerSize` 0.86, `layerPhase` 0.5, `layerTilt` 5, `petalLength` 40, `petalWidth` 32, `petalTipShape` 2.5, `petalTilt` 72, `petalCup` 0.7, `buckleAmp` 0.15, `buckleFreq` 3, `petalSpineCurl` 40 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 180,912 | 55.2 mm |
| `tulip-v1` | `placement` RADIAL, `petalCount` 3, `layerCount` 2, `layerSize` 0.9, `layerPhase` 0.5, `layerTilt` 6, `petalLength` 45, `petalWidth` 30, `petalTipShape` 2, `petalTilt` 65, `petalCup` 0.6, `stamenCount` 6, `stamenLength` 12, `antherSize` 1.6, `antherElongation` 4, `gynoecium` STYLE, `styleLength` 10, `stigmaSize` 3, `stigmaLumps` 3 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 22,884 | 52.3 mm |
| `tulip-v2` | `placement` RADIAL, `petalCount` 3, `layerCount` 2, `layerSize` 0.9, `layerPhase` 0.5, `layerTilt` 6, `petalLength` 45, `petalWidth` 36, `petalTipShape` 2, `petalTilt` 62, `petalCup` 0.8, `stamenCount` 6, `stamenLength` 12, `antherSize` 1.6, `antherElongation` 4, `gynoecium` STYLE, `styleLength` 10, `stigmaSize` 3, `stigmaLumps` 3, `petalBaseTaper` 0.6, `petalSpineCurl` 25 | loaded, 201/201 applied, 0 notes (reader before load: 0) | 22,884 | 43.8 mm |

### 6.3 Misses, attributed

| miss | flower | cause | evidence |
|---|---|---|---|
| disc too large against the rays (v1) | daisy | **reader's estimate** — `spread` 3.5 overshot the disc:flower ratio (≈0.30 in the photo) | v2 at `spread` 2.4 reads ≈0.38; one iteration closed most of it |
| rays narrow and gapped (v1) | daisy | **reader's estimate** — `petalWidth` 8 is the registry floor; the photo's rays overlap | v2 at 11 overlaps |
| disc reads as a smooth dome (v1), as bristles (v2) | daisy | **missing mechanism** — no disc-floret texture; stamens at their 5 mm floor are spikes, not florets | v2's stamen disc reads worse than v1's plain dome. The approximation is rejected (§4). |
| ray tips rounder and toothed in the photo | daisy | **missing at photo resolution** — a 2-tooth notch at the apex is below the lobe floor on a 35 mm ray | not attempted |
| absolute size | daisy | **photo ambiguity** (scale) — a real *Bellis* ray is ≈8 mm, under the 20 mm floor; printed at ≈4× life | Q-scale |
| tepals separate, with slits between them (v1) | tulip | **reader's estimate** — width 30 on 45 mm | v2 at 36 overlaps |
| v2 closed into a bud | tulip | **photo ambiguity** — the photo holds an open bloom AND a closed one, and the profile drifted toward the bud once spine curl was added | Q-focal, Q-profile |
| tips flare outward over the cup in the photo | tulip | **missing in v1's schema** (S-curve needs the spine CURVE) | §4, §2.1 |
| crossing "X" marks at the foot where wide tepals meet | tulip | **mechanism** — petals interpenetrate at the root (the accepted look), visible when wide and upright | §4 |
| outer and inner tepals differ in the photo | tulip | **v1 schema** (scopes exist; not emitted) | §2.1 |
| black basal blotch, red colour | tulip | **no colour** | §4 |
| v1 an open bowl, v2 a closed barrel; the photo is between | double | **photo ambiguity** — tilt and spine curl trade off in a 3/4 view, and the low-resolution crop pins neither | Q-profile; the strongest evidence for it |
| inner layers invisible in v2 | double | **consequence of the above** — a closed outer whorl hides the inner five | — |
| ruffled margins | double | **mapped** (`buckleAmp` 0.15, f 3) — reads as wavy edges in both passes; whether the photo's are ruffles or creases is Q-ruffle | — |

**Tally, over the 14 rows:**

- **3 are the reader's own estimates** (disc size, ray width, tepal width). One iteration closed
  all three.
- **3 are photo ambiguity** (scale, which flower, side profile), plus one row that is a consequence
  of the profile. The questions exist for these.
- **4 are missing mechanisms**: disc florets, sub-resolution tip teeth, colour, and petals
  interpenetrating at the foot.
- **2 are the v1 schema leaving out what the bloom can do** (the spine curve, scopes).
- **1 mapped** (the ruffle).

**The hand-written files stepped outside the schema once.** `antherElongation` (class c, sub-mm
detail) appears in `tulip-v1`, `tulip-v2` and `daisy-v2`. The reader reached for it: long tulip
anthers, round florets. It is recorded rather than edited out, because it is evidence either that
the schema should carry it or that a route needs the schema enforced on its output (route B
enforces it by construction; route A does not). Every other written control is a schema row.

The strongest single finding: **a single three-quarter photo does not pin the side profile.** That
makes Q-profile the most valuable question after scale.

---

## 7. Rulings (Eva, Nov 3)

The eight questions as they were asked are kept below the rulings, so each ruling can be read
against the question it answers.

1. **Scale.** The default is **35 mm `petalLength`**. Ask only when the flower's proportions look
   wrong at that scale. This supersedes §3's "Q-scale: always, unless a size was given": Q-scale is
   now a low-confidence question like the others.
2. **Partial files.** The page gets a **"load as new design" mode**: reset to `DEFAULTS`, then apply
   the subset. **Route A emits SUBSETS, not complete 201-control files.** This supersedes §2.3's
   construction (i) and emission rule 1 of §2.2 for the feature.
   - The dry run's complete files remain what a subset composes to today. They stay valid and
     loadable through the existing Load button.
   - The new mode is a page change and is not built here.
3. **Route A for v1. Route B is deferred**: no API key, no Netlify Function work. §5's route-B
   column stays as the costing for whenever it is reopened.
4. **v1 scope, STAGED.** Globals, then the traced petal outline (`petalOutlineCurve`), then
   per-layer values. **The globals must pass the zero-notes load check (§2.4) on test photos
   before the outline is added; the outline must pass before per-layer values are added.**
5. **Disc florets.** Reported as **unmapped** (§4 stands: never approximated with stamens).
   **Logged as a new bloom backlog item, the disc-floret feature, NOT scheduled** — see the entry
   below.
6. **Confidences and the unmapped list** live in a **sidecar file beside the design file**. **The
   reader is untouched**: no new top-level field, so the zero-notes check stands. The sidecar's
   name and shape are the building session's to propose. A natural one is
   `<name>.bloom-photo.json`, holding each emitted control's value, confidence and source, the
   questions asked and answered, and the unmapped list.
7. **Test photos: Eva supplies her own.** No network access for future sessions. The tulip
   placeholders on the committed sheet therefore stay placeholders. The real test set arrives with
   the building session.
8. **Second photo: an optional first-class input** (side, underneath, or the whole plant). A
   single photo still works. §3's "a second photo is a better question than a word answer" becomes
   an offer the route makes, not a requirement.

### 7.1 The backlog entry (ruling 5)

The bloom backlog lives **outside this repository** (the state-of-play docs say so, and this session
cannot reach it). The item is written here so it can be pasted in as it stands:

> **Disc florets on the hub (bloom backlog — logged Nov 3, not scheduled).** A composite's centre
> (daisy, sunflower, aster) is a domed disc of tightly packed tiny florets. The bloom's hub is a
> smooth cap. The nearest existing approximation, an androecium on `stamenLayout` DISC at the
> 5 mm filament floor, reads as BRISTLES, not florets (photo-to-bloom dry run, `daisy-v2`, §6 of
> `docs/bloom-photo-to-bloom-discovery.md`). It is not cheap either: that row reads 280,496 export
> triangles against `daisy-v1`'s 138,184, though the stamens' own share was not measured apart from
> the other v2 changes. Until built, photo-to-bloom reports disc florets
> as unmapped. Open: whether it is a hub surface treatment (a relief field like BONE's on the
> hub), a new centre part beside the androecium, or a third androecium layout. Each has a
> different owner.

### 7.2 The questions as asked

1. **Q1 — scale.** Default 35 mm `petalLength` when unasked, or always ask? A real daisy ray (≈8 mm)
   prints at ≈4× life at the 20 mm floor. Is "life size where possible" a goal at all?
2. **Q2 — the partial-file problem (§2.3).** Should the route always write a complete 201-key file
   (no page change; error-prone in a chat)? Or should the page gain a "load as a new design" path
   that resets to `DEFAULTS` before applying a partial file (a page change, and a new reader mode
   whose missing-field rule differs from rule 3)?
3. **Q3 — route A or B (§5).** Not chosen. Route A is a subset of B's work. If B: which model
   (cost table in §5), behind what gate (public / password / `?dev`), and is the key scoped to
   production so deploy previews cannot spend it?
4. **Q4 — v1 schema scope.** Ship v1 globals-only (46 controls), or include the traced petal
   outline (`petalOutlineCurve`, the most photo-faithful single control) and per-layer scopes
   (tulip whorls) from the start?
5. **Q5 — the disc-floret approximation.** The dry run shows stamens-as-florets reads as bristles.
   Report-only (as §4 proposes), or is a disc-floret texture on the hub a mechanism worth
   scheduling?
6. **Q6 — where confidences, sources and the unmapped list live.** Options:
   - beside the file, in the chat or API response;
   - in a new optional top-level field. That is a reader change: today it is an `unknown` note,
     which breaks the zero-note check.
   - in `savedAt`-style metadata the reader already tolerates. None exists today.
7. **Q7 — photos.** This session could not fetch or attribute photos beyond one CC0 daisy. For the
   real feature's test set, should Eva supply her own photos (the bug's image-fit session had the
   same gap), or should a future session be given network access to Wikimedia/iNaturalist?
8. **Q8 — the second photo.** Should the route accept a second photo (side, below, whole plant)
   as a first-class input, since 102 of the 201 controls are class b?

---

## 8. How to reproduce

```
npm i --no-save three@0.161.0 playwright-core
node tools/bloom-photo-census.mjs            # the totals; --md prints §1/§2's tables
CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium node tools/bloom-photo-dryrun.mjs /tmp/dry --sheet /tmp/sheet.png
```

`CHROMIUM_EXECUTABLE` is needed on this container: `findChromium()` looks for
`chromium-*/chrome-linux/chrome`, and the installed browser lives under `chrome-linux64/`. That is
pre-existing and recorded here, not fixed (it is shared harness code). Neither tool is a gate or
runs in CI.
