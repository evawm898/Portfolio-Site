# The petal-origin surface — position paper

**Write-up only.** This document proposes; it changes no geometry, no controls, no ids, no
registry entries, no gates. The construction it describes exists as **uncommitted scratch
work** in one worktree (`surface4-tree`, based on main `11091ab`, 164 insertions in
`flower.js` alone), built across six scratch looks. Nothing from that tree is ported here.
Every number below was re-checked against the scratch tree's probe files or the repository;
where the brief that commissioned this paper disagreed with the measurements, the
measurement is printed and the disagreement is called out.

A note before anything else, because citations have burned this project before (the #64/#67/#68
lesson, and the BILATERAL quarantine): the brief named three documents to read —
`claude/junction-vs-receptacle.md`, `claude/panel-audit-rulings.md`,
`claude/roadmap-remaining-aug-2026.md` — and a fourth, `claude/sepals-overhaul.md`.
**None of the four exists.** A sweep of all 64 remote refs found zero `claude/` tree paths
on any branch. The material those names point at lives elsewhere, and this paper cites the
real artifacts: the governing comment blocks in `flower.js` on main, the registry's
junction/ornament role split (`flower-registry.js:327-342`), the continuous-spine proposal
(`docs/flower-continuous-spine-proposal.md` — surviving only at closed PR #103's head
commit `e0d704c`; the branch named on that PR has since been reused to carry this paper
and no longer holds the file), the control-panel
audit with Eva's Rulings (`docs/flower-control-panel-audit.md`, branch
`claude/flower-project-audit-fajdza`), the Standard-visibility proposal
(`docs/flower-standard-visibility-proposal.md`, branch
`claude/flower-visibility-proposal-3z1hqv`), and issues #106/#108/#90. "Hypanthium"
appears **zero** times anywhere on main; it enters the record here, in prose only.

---

## 1. The construction

A surface of revolution sits beneath the bloom. **Petals originate on it; their direction
does not come from it.** A petal's tilt is computed exactly as on main — the
`elevation → slope → RECEPTACLE_TILT·atan(slope)` chain (`flower.js:2970-2973` on main,
`RECEPTACLE_TILT = 0.55`) — and the surface block never touches it: no surface normal, no
tangent, no blend. Only the origin point (`height`, `radialOffset`) is replaced.

The curve, parameterised by `s` from pole to end:

- `R = rMax · RADIUS` — equator radius, off the arrangement's own layout radius
  (`rMax = spread·√(max(1, count−1))`), chosen before any petal exists — never off feet.
- `H = max(1e-4, R · HEIGHT)` — rise above the equator; `E = max(0, R · EXTENT)` —
  continuation below it, curving back under (the tuck-under; outermost petals point down
  because their *origins* sit low and outboard, not because anything re-aims them).
- `sEq = H/(H+E)` splits the parameter at the equator; both branches are quarter-cosine:
  `r = R·cos(π/2·u)`, `y = H·u` above, `y = −E·v` below (scratch `flower.js:3149-3154`).
- Ordered arrangements (coiled golden/custom — four of the seven presets) map their radial
  order `rho ∈ [0,1]` onto `s ∈ [START, 1]`: `rhoEff = START + (1−START)·rho`. START moves
  the innermost petal down the curve; the outermost stays pinned at `s = 1`; the same
  petals pack into the remaining span. **The surface is never truncated** — this is the
  critical distinction from the failed CAP experiment. Nothing is cut; only the
  distribution's starting position moves.
- Arrangements with **no radial ordering** (RADIAL, BILATERAL, coiled-EVEN — every petal in
  the ring at one shared `pl.r`) anchor every petal to the equator, `rhoEff = sEq`. That is
  the radial-symmetry fix: index-based distribution correlated origin with azimuth
  (corr = ±1.0, centroid offset 19–27 % of R) and rendered lopsided; the equator anchor
  measures exactly 0 on both. **START is a deliberate no-op for these arrangements** — they
  do not distribute along the curve at all, so there is nothing for START to move. Stated,
  not invented: the scratch code implements exactly this, and the sweep confirms daisy18
  probe-identical across all four START values (every recorded summary field unchanged —
  not a byte diff; the ship-time STL byte-diff convention still applies).
- The translucent debug plate is a viewer-only `LatheGeometry` added to the scene group;
  the export path builds a fresh accumulator and never traverses the scene, so it cannot
  reach an STL. **No watertightness claim is made for any of the scratch work.**

Two consequences the brief did not state, both measured:

1. **Radial blooms respond to RADIUS only.** The equator anchor pins their origins at
   `(r = R, y = 0)` whatever H and E are — daisy18's full-precision extents and junction
   triangle count (39,528) are identical in every HEIGHT/EXTENT column, lily6's likewise
   (10,596). For a flat rosette that is arguably
   the right answer, but it must be a stated property, not a surprise (open question 6).
2. **The equator radius is currently owned by the wrong formula for radial blooms.**
   `rMax` is the coiled spread law; radial's own ring is `PETAL_LENGTH·0.5·lerp(0,1.85,tightness)`.
   The mismatch moves footprints by design-dependent amounts: daisy18 **+11 %** (2.878→3.200),
   lily6 **−9.5 %** (3.047→2.756, every surface column). The build-out should let each
   arrangement own its equator radius (registration rule: one owner), with the RADIUS
   control as a multiplier on it — that change is *proposed here*, not in the scratch tree.

## 2. What was tried and rejected — recorded so it is not re-derived

- **Surface chasing petals** (inflated plate sized to reach the outermost foot). Required
  peak radius grew ×9.99 on thistle across the inflation slider (1.838→18.359 units;
  ×8.68–8.73 on the other three — the brief's "10×" is thistle's number), and the clamped
  render still fell short by up to 1.38 units while spheres swallowed the camera
  (`inflate-meta.json`). The surface must be an *input*, sized from the arrangement, never
  from where petals end up.
- **Petals following the surface curve** (origin *and* direction from the surface).
  Petal-base-inside-surface intersections rose with height on all four designs:
  thistle 12.1→45.9 %, daisy18 2.8→66.2 %, rose 0.9→38.8 %, dahlia 0.9→7.7 % across the
  height ladder, worst case 78.9 % (thistle extent-part). The brief's "12–79 %" is the
  thistle-to-worst-case span; the full-matrix floor is 0.7 % (`surface2-meta.json`).
  Fixed by decoupling direction — which is why direction-independence is an invariant of
  this construction, not a preference.
- **CAP** (truncating the dome with a flat top). Never fixed the intersections it targeted
  (thistle 28.2→25.1 % at best) and made rose **6.0× worse** (5.8→34.8 %) and daisy18
  **4.4× worse** (12.1→53.1 %) at cap-large; read as a visible table (`surface3-meta.json`).
  Wrong diagnosis; dropped entirely. START is not CAP: the dome keeps its full rounded
  shape to the pole.
- **The continuous spine** (closed PR #103, proposal on its branch; Phase A implementation
  closed as PR #105) and **#101's three junction approach laws** (merged rig, laws measured
  and rejected). Both assumed petals sit away from the axis at flat-placement radii and
  need *gathering* down and inward into a trunk. The petal-origin surface removes that
  premise: petals begin on the base, so there is nothing to gather — only a (much shorter)
  connection from the surface to the stem and centre remains. The measuring instruments
  survive and stay valuable: #101's A/B rig (`?junctionLaw=`) and probe
  (`?junctionProbe=1`), #107's `verify-junction-continuity.mjs`, and the area rule itself.

## 3. Measured state — with the brief's numbers corrected

All from the scratch session's probe files (same estimator both modes; `current` rows are
the no-surface baseline). One honesty note about provenance: those probe files
(`surface4-meta*`, `start-sweep`, `radial-symmetry-*`, `lily6-meta-*`, and §2's
`inflate-meta` / `surface2-meta` / `surface3-meta`) are **session-local artifacts, not
committed anywhere** — like the scratch code itself. The tables in this paper are their
only durable record; the implementing session re-derives them from its own probes rather
than resolving these filenames.

| Claim in the brief | Measured |
|---|---|
| "Intersections 0.1–0.4 % and flat with height" | **Height columns only**: 0.00–0.41 %, roughly flat (thistle 0.20–0.21, dahlia 0.13–0.14, rose 0.24–0.25, lily6 0.00–0.09; daisy18 rises 0.16→0.41). **Extent columns disagree**: thistle **41.6/42.4 %**, dahlia 8.5/6.2 %, rose 2.8/0.9 % (daisy18 0.50, lily6 0.0). The extent residual is a real open problem, not a rounding error. |
| "Radial symmetry exactly 0" | **Verified where probed.** corr(az,rhoEff) = corr(az,y) = 0, centroid offset = 0, spreads = 0 — daisy18 across every column *and* all four START values; lily6 across its three probed columns at default START (START unswept for lily6 — a no-op for radial by construction, but unmeasured). |
| "Bloom radius at or above current" | Thistle/dahlia/daisy18 yes. **Rose extent columns −0.5 %** (2.689 vs 2.702). **Lily6 −9.5 %** in every surface column (the rMax-vs-radial-ring mismatch, §1). |
| "Junction triangles 1.05–1.3× current" | **0.795–1.418×.** Lily6 0.795× everywhere; height-high rows 1.34–1.42× (thistle 1.346, rose 1.345, dahlia 1.418); rose extent 1.001–1.003; daisy18 1.249 flat. 11 of the 25 surface columns fall outside the brief's range. |
| "Petal count unchanged under every control" | Verified for every column probed (40/34/24/18 across all four START and three HEIGHT values); extent columns and lily6 were not in that sweep — no counterexample anywhere, but "every control" is verified only where measured. |

## 4. The controls

Five registry entries, one of them the gate that keeps every saved design byte-identical.
All candidate ids below were collision-checked against the 164 live ids, the 3
`RETIRED_IDS`, all DEFAULTS keys, and all 62 option values on main: **all clear**. (Of the
wider candidate set only `receptacleType` collided — a registered id whose control is
inert; see §5.)

| id | kind | range | default | tier | visibleWhen |
|---|---|---|---|---|---|
| `bloomBase` | select `none` / `dome` | — | **`none`** | Standard | always |
| `bloomBaseRadius` | slider | 0.6–1.4 | 1.0 | Advanced | `{not:{id:"bloomBase",oneOf:["none"]}}` |
| `bloomBaseHeight` | slider | 0.05–1.2 | 0.5 | Advanced | same |
| `bloomBaseExtent` | slider | 0–1.2 | 0 | Advanced | same |
| `bloomBaseStart` | slider | 0–0.5 | 0 | Advanced | same |

- **Default reproduces current, by construction.** `bloomBase: 'none'` takes the exact
  code path main ships today; the four sliders are inert until the select moves. This is
  the only honest way to satisfy "nothing saved changes until a slider moves" — there is no
  neutral surface value that reproduces the flat placement, because the surface *is* a
  different placement law. Verified the way the convention demands: STL byte-diff at
  defaults before ship.
- Ranges, honestly labeled: the measured envelope is HEIGHT 0.15–1.1 and EXTENT 0–1.1
  (ratio sweeps in the v4 probes); the table extends modestly past it (0.05 and 1.2 ends),
  and **RADIUS was never varied in this construction at all** — every v4 probe ran at
  mult 1.0; only the *rejected* follow-the-curve look swept radius (0.5/1.6). So three
  slider ends and the whole RADIUS range are proposed, not swept. They ship only behind
  §9's export/connectedness rows at exactly those extremes — the unmeasured ends get
  measured by the gates before anyone can reach them.
- Semantics as in §1: RADIUS multiplies the arrangement-owned equator radius; HEIGHT and
  EXTENT are ratios of it; START is the fraction of `s` where the innermost ordered petal
  begins. All four are silhouette controls; `bloomBase` itself belongs in Standard under
  the "geometry and silhouette controls are DESIGN tier" rule; where the four sliders sit
  is genuinely Eva's call and is put to her as open question 8 rather than decided here.
- Visibility is declared in the registry predicates above and nowhere else, per the
  registry rule; `verify-registry-sync` / `verify-tier-visibility` / the visibility dump
  cover the new rows automatically.

**The START range problem, addressed specifically.** Headroom (highest petal vertex minus
surface apex) obeys `headroom(START) = headroom(0) − START·H` exactly in the sweep, so the
START value where petals stop breaking through the apex is computable per design — and it
is *roughly the same value* where the bare hole appears, because both are "petals no longer
reach the apex". Zero-crossings at the height-high column, derived from that measured
linear law (sampled at START 0/0.15/0.4/0.7; dahlia's extrapolates just past the last
sample): **rose ≈ 0.51, thistle ≈ 0.57, dahlia ≈ 0.73** (daisy18: no-op, radial). So
thistle and rose have essentially no
band where breakthrough is gone *and* the apex is still covered; dahlia has one. Two
consequences:

1. **Bound the slider at 0.5** — under the lowest derived crossing (rose 0.507), so every
   shipped coiled preset keeps its apex covered at any slider position. A safe default is
   one drag away from the thing being avoided; the cap makes the whole range safe. The
   crossings move with H, petal length, and bloom angle — the 0.5 figure is from the
   measured envelope, and the export matrix should carry a row at the cap to keep it
   honest. Runner-up: derive a per-design cap from the innermost petal's reach at build
   time. More correct, but it needs the petal's built extent (a feedback pass), and a
   static cap can ship first without precluding it.
2. **Do not sell START as the breakthrough fix.** At START = 0 the innermost petals break
   the dome silhouette at height-high on thistle (+1.12), dahlia (+0.82) and rose (+0.56);
   START *does* pull that down steeply (at 0.4: +0.33/+0.37/+0.12) because those are
   exactly the petals it moves — measured, not assumed. But the breakthrough exists at the
   default START = 0 and is its own defect; a control whose purpose is a bare centre merely
   masks it at high values.

Where the bare centre stops reading as deliberate and starts reading as a hole: at the
measured crossings above (thistle and rose just past mid-range, dahlia near the top). Note
that the bared region is the pole cap — precisely where the centre ornament sits — so under
a real centre the "hole" reading may vanish. The centre is downstream of this paper (§11),
but that interaction is why the 0.5 cap is a shipping bound, not an aesthetic ceiling.

## 5. What this replaces

The three governing statements below are the real, load-bearing ones on main; the named
documents that supposedly carried them do not exist (see the note at the top).

**(a) "Petals arrive at flat-placement radii and the junction gathers them inward."**
The SDF gather tree (`flower.js:2376-2387`: feet as "LEAVES of a GATHER tree: they run
INWARD… into a compact button… and only THEN does a single trunk descend") and the spine
proposal's merge tree are both answers to that premise. **Dead as the governing model of
attachment.** Petals now originate on the base; the space the gather crossed no longer
exists. What survives: the area rule (`r_parent² = Σ r_child²`, `flower-sdf.js:98-99`) for
whatever still descends — the surface-to-stem coupling — and the #101/#103 measuring
instruments.

**(b) "The junction is derived plumbing, never exposed, as small and quiet as possible."**
(`flower.js:1866-1874`; the skill's junction-vs-ornament table.) **Split, not survived
whole.** The *base surface* is user-chosen, visible design — four controls. The *junction
invariant* — one connected watertight solid, achieved by derived, uncontrolled connective
mass — survives untouched underneath it. The two-column junction/ornament table becomes
three rows of one object: placement law (controlled), printed body (visible), connective
plumbing (derived, inside it). The registry's role tags (`flower-registry.js:327-342`)
stop describing the world once this ships.

**(c) "The base's size is derived from what is beneath (`below: 'stem'|'branch'|null`,
DEPTH_BOTTOM/TOP/CAP 0.18/1.15/0.3)."** (`flower.js:299-306`, `2195-2205`.) **Survives with
reduced scope.** The descent *below the surface* stays derived from what is present; the
surface's own H and E are chosen. The era of "nothing about the base's shape is a slider"
ends deliberately — that is the point of the paper, and it is what the brief's word
"buildable" means.

**Control dispositions, by real id.** The registry carries nine `role:"junction"` rows
(eight shaping controls plus the inert `receptacleType`) and ten `role:"ornament"` rows.

| id(s) | disposition |
|---|---|
| `bundleTightness`, `flareRate` | **Survive; re-tag `role:"petal"`.** Measured (spine proposal §3): they drive `marginFlareFactor`, the petal's marginal strands — the registry tag is wrong today independent of this paper. |
| `absorption` | Survives while the SDF path remains the sub-surface connective builder (it is the field blend radius). Candidate for derivation later. |
| `receptacleDepth` | Survives — descent below the base, still meaningful, still derived-top. |
| `buttonSize` | **Retire** at the schema bump, with a migration that deletes the key and a `RETIRED_IDS` entry. It scales an arrival swell at a circle this construction removes. (The spine proposal reached the same verdict from the other direction.) |
| `gatherHeight` | **Retire**, same mechanics. The gather span it sizes is the thing §5(a) declares dead; if an SDF gather survives as internal plumbing, its span is derived, not a control. |
| `receptacleType` | **Retire at this schema bump.** Its own `hiddenReason` (registry line 348) has planned this for one release: "removing it is a migration, and that belongs with the base-ornament work that will replace this block." This paper is that work arriving. Migration deletes the key from designs; the id is reserved forever. Note this *supersedes* audit Ruling 2 ("`receptacleType`… unhidden into Advanced") — that ruling's stated ground was that the decorative rework was separate future work; the rework is now here, so the ruling is put back to Eva rather than silently overridden (open question 4). |
| `convergenceTightness` | cm=off legacy path only (registry-gated to it; audit: DEAD under the shipped default). Fate rides the legacy-path decision, open question 4. |
| `blendSmoothness` | **Unresolved — the audit's DEAD-under-default verdict is 17 commits stale and contradicted by a documented life outside the legacy path**: it drives the base body's angular resolution (`M = clamp(round(rimFeet·lerp(11,7,blend)), 40, 120)`), inert at the shipped default only because 3 feet clamp to 40 (the spine proposal recorded the same "stem-tessellation life"). Re-measure before disposing; rides open question 4. |
| `receptProfile`, `receptConstruction`, `receptCollar`, `receptReach`, `receptSolidity`, `ribMultiplier`, `spiralTightness`, `spiralThickness`, `bulbSize`, `bulbHeight` | The ornament cluster — the visible base body the surface replaces. **Recommended: retire with delete-migrations when the surface becomes the printed base** (open question 4; each follows the four-step retirement, ids reserved forever). `receptProfile`'s silhouette job is taken over by HEIGHT/EXTENT on the dome. |
| `LEGACY_RECEPT` | **Already dead on main — nothing for this paper to dispose of.** The audit flagged it as an undeclared hardcoded hide list; Ruling 4 has since *landed*: `applyVisibility()` records having replaced it (`flower.js:~3521-3527`), the cm=off conditions are registry `visibleWhen` predicates, and `verify-registry-sync` fails the build if such a list comes back. Recorded here only so the stale audit finding is not re-inherited (a defect report is a claim with an expiry date). |
| sepal cluster (`sepalsType` … `sepalTipLength`), stem cluster | **Untouched.** Sepals are a whorl; they will later attach *to the receptacle body*, designed together with the base ornament per the skill — after this layer settles (§9). |

Retired ids are reserved permanently and never reused — and the reservation must be
enforced, not just declared: `morphLength` is the standing counter-example (set by
`migrateV10toV11`, never deleted, not in `RETIRED_IDS`, swept into `extras` verbatim on
every re-save, forever). Every retirement above ships with its delete-migration in the same
bump.

## 6. Receptacle, hypanthium, base ornament, junction — one object

Four names, one location. The resolution: **one object, and the name that survives is
`receptacle`.**

- The petal-origin surface *is* the receptacle — botanically, the receptacle is the
  thickened axis petals insert on, which is exactly what this surface does. The control's
  never-rendered helper text (a hint span in `flower.html:1285` that no code path ever
  shows) already says it: "the junction node that joins the petal & sepal feet, the center
  bundle and the stem into one printable body."
- "Hypanthium" is the botanical term for the cup that forms when that axis extends up and
  around — i.e. **the EXTENT > 0 regime of the same object**, not a second object. It
  appears nowhere in the codebase today and should stay prose, never an id.
- "Base ornament" survives as the *decorative family on the receptacle* (with sepals — one
  family, designed together, per the skill). It is not a competing body.
- "Junction" survives as the *invariant and the derived plumbing that maintains it* — a
  property of the model, not a nameable body part. The audit found "five names for one
  subsystem"; this section is the rename that ends it.

The brief attributes to `claude/sepals-overhaul.md` the wish for "a profile of revolution
for the calyx body." That document does not exist and the claim could not be verified
against any file; the nearest real artifacts (the skill's one-`Whorl`-primitive note and
the ornament cluster) are consistent with it. If such a wish stands, it strengthens the
one-object answer: the calyx body and the petal base would be the same profile of
revolution read at two heights — one owner, two consumers, exactly the registration rule.

**The consequence that matters:** in the scratch looks the surface is a placement law only
(the debug plate is never exported). Making it the *printed* receptacle body is the heart
of the build-out, because three problems resolve at once:

1. The EXTENT intersections (thistle's 41.6–42.4 %) stop being defects: a petal base inside
   the printed solid is embedded overlap, and the export contract already blesses
   overlapping closed shells — the slicer unions them. Whether petals *visually* emerging
   from inside the dome is acceptable is Eva's call (open question 7).
2. Issue #108's defect — the centre attaching only because the lathe's top shoulder happens
   to sit under it — **does not survive the full construction**: the centre sits on the
   receptacle's pole region as a stated member with the centre as an explicit input, which
   is precisely what #108 asks for, plus its named gate row. Under a placement-only
   ship (no printed body), **#108 survives and may worsen** — moving petal origins changes
   which shells overlap the old lathe, and nothing in the scratch work measured that. This
   is the strongest single argument for printing the body (open question 1).
3. Issue #106 finally gets a specifiable property: the surface is the one owner of "where
   petals begin", so petal-to-base continuity has reference geometry for the first time.

## 7. Presets

All seven presets were authored against the flat placement, and all seven load through
`applyDesign` as deltas over DEFAULTS. With `bloomBase` defaulting to `'none'`:

- **Until rebuilt, every preset is byte-identical to today.** They don't carry the new
  keys; DEFAULTS backfills `'none'`; the current code path runs.
- **Eva rebuilds them herself** — per the commissioning conversation (carried from the
  brief, for Eva to confirm here), and the right owner regardless: a preset is
  authored taste. Each rebuilt preset gains explicit `bloomBase*` keys in its `ui` delta.
  Before she starts she should know two measured facts: the three radial presets (daisy,
  lily, poppy) respond to RADIUS only (§1), and lily's footprint shifts −9.5 % unless the
  arrangement-owned-radius change (§1) lands first — sequence that fix ahead of her pass.
- The implementing session's share is mechanical: wire the controls, land her values,
  regenerate `assets/presets/` thumbnails and the drift manifest
  (`node tools/gen-preset-thumbs.mjs`), and let the three geometry gates cover every preset
  by name automatically, as they already do. `PRESET_SCHEMA` (17) moves only if the preset
  file format changes — it does not; values ride the normal path.

## 8. Saved designs

- **Schema:** `CURRENT_SCHEMA` 19 → **20**. `migrateV19toV20`: backfill the five new keys
  from DEFAULTS (`bloomBase: 'none'`, …) and **delete `receptacleType`, `buttonSize`, and
  `gatherHeight`** — the three retirements this paper itself concludes (§5), each with its
  own `RETIRED_IDS` entry. The ornament cluster and the cm=off pair ride open question 4;
  whichever of those Eva confirms get their deletes in the same bump.
- **A design saved today**, loaded after this ships: migrates to v20, renders
  byte-identically (surface off), and on re-save carries the five new keys at their inert
  defaults and no longer carries `receptacleType`. No pin is needed — a pin protects an
  aesthetic choice, and "no base surface" remains expressible forever as `bloomBase:'none'`.
- **A design saved after** Eva turns the surface on somewhere: carries explicit `bloomBase*`
  values like any other control; `migrateDesign()`'s `extras` sweep continues to protect
  unknown keys, which is exactly why every retirement must delete its key (the
  `morphLength` lesson, §5).

## 9. Gates

Today **nothing exercises the surface anywhere** — it is scratch. What must be exercised
when it ships, and how it lands on the two open issues:

- **Export gate** (`verify-flower-export.mjs`, 187 static + 7 preset configs at runtime):
  add dome-on rows at the control extremes — RADIUS 0.6/1.4, HEIGHT 0.05/1.2, EXTENT 1.2,
  START at the 0.5 cap — crossed with stem/sepals/each centre builder, *before* running the
  change report (the TOOTHED-splice lesson: a matrix with no rows in the affected region
  reports a clean sheet). While in the file, fix its stale "Full 142-config matrix" comment
  by printing `CONFIGS.length` instead of a hand count — the hand count is *how* it went
  stale.
- **Connectedness gate** (`verify-connectedness.mjs`, 41 static + 7 preset rows): the
  blindness rule says check the states that *hide* the defect — so the critical new rows
  are **dome-on bare blooms** (no stem, no sepals): petals anchored at the equator with
  nothing printed beneath is exactly the state where the bloom could export detached, and
  no existing row can see it. Plus dome+stem, dome+EXTENT-full (thistle), dome+START-cap,
  and a dome row per rebuilt preset (free — presets are already named rows). Its header's
  "There is no open marker today" line is already false on main (five `xfail: 106` rows sit
  below it) — correct it in passing; a stale header is this codebase's most repeated defect.
- **Quality gate**: origin translation does not deform the petal, so margin fidelity should
  be untouched — assert that with one dome config rather than assuming it.
- **Registry/tier gates and the visibility dump** cover the five new rows automatically;
  diff the dump against a pre-change capture since the addition is meant to be
  visibility-neutral for every existing control.
- **#106** (petal-to-base continuity has no gate coverage; the junction gates' five
  `xfail: 106` connectedness rows and `XFAIL_LAW_MISSING_ISSUE` in
  `verify-junction-continuity.mjs` are the placeholders): this construction is a candidate
  for the "satisfying base construction" those markers await, and the landing PR must
  delete them in the same commit. **One enforcement caveat the markers' own story hides:**
  XPASS-hard-fail fires only if the construction arrives through the `?junctionLaw` slot
  the five rows name (`law: 'spine'`). This paper's construction lands through a
  `bloomBase` control path instead — in that case no XPASS ever fires, the spine rows keep
  xfailing green against a law that never ships, and the markers go *silently* stale.
  So marker retirement is a stated obligation of the landing PR (folded into open
  question 1's recommendation), not something the machinery will catch. The continuity
  gate's laws get their reference geometry from the surface (§6.3).
- **#108** (centre attaches by accident): resolved by the printed body, survives a
  placement-only ship — spelled out in §6. Either way the deliberate-attachment gate row
  #108 demands gets written against the receptacle, not against the lathe shoulder.
- **#90** (Dahlia's junction cone, accepted "for the base ornament to reshape"): this is
  the reshaping vehicle; the named Dahlia connectedness row already exists to hold it to
  one piece.

One scope note: this construction sits at layer 1 of the build order (petal arrangement —
the silhouette). Settling it is the prerequisite the sepals/base-ornament family has been
waiting on; refining those against today's base would be work done twice.

## 10. Open questions for Eva

1. **Printed body now, or placement-law first?**
   **Recommendation:** print the receptacle body in the first build-out — it resolves the
   EXTENT embedding, #108, and #106's reference geometry in one move (§6). Either way, the
   PR that lands the construction as the base retires the five `xfail: 106` spine rows and
   `XFAIL_LAW_MISSING_ISSUE` deliberately, in the same commit — §9 explains why nothing
   mechanical will catch them if it lands outside the `?junctionLaw` slot.
   Runner-up: placement-only behind the new gates first; smaller step, but #108 stays live
   and thistle's 42 % embedding stays a visible defect instead of becoming structure.
2. **START bound.** **Recommendation:** static cap at 0.5 (§4).
   Runner-up: per-design derived cap from measured petal reach — more machinery, can come
   second without conflict.
3. **Equator-radius owner for no-radial-order arrangements.** **Recommendation:** each
   arrangement owns its ring radius; RADIUS multiplies it (fixes lily's −9.5 % and daisy's
   +11 % silently different footprints). Runner-up: keep the rMax formula and let your
   preset rebuild compensate per design — cheaper, but bakes the mismatch into authored data.
4. **The legacy base: ornament cluster (10 ids), cm=off path, `blendSmoothness`/
   `convergenceTightness` — and your audit Ruling 2, whose full headline is "Receptacle
   controls are not deleted," with three named unhides (`receptacleType`, `stemCurve`,
   `tube`).** A yes here revises that whole ruling, not just its `receptacleType` clause —
   you should see everything it covers before answering; the ruling's stated ground (the
   decorative rework being separate future work) is what this paper changes.
   **Recommendation:** retire the ornament cluster and cm=off pair with delete-migrations
   when the surface ships as the printed base (re-measuring `blendSmoothness` first — §5),
   keeping the `stemCurve`/`tube` unhides untouched (they are stem controls, not base) —
   one object, one name, and the audit's "five names for one subsystem" finding closes.
   Runner-up: freeze cm=off as-is behind Advanced until your preset rebuild
   is done, and retire in a second bump — slower, but nothing decorative is lost before its
   replacement exists.
5. **Naming: `bloomBase*` family (all ids clear today) vs `recept*` family.**
   **Recommendation:** `bloomBase*` — no collision, no confusion with the legacy cluster
   mid-transition, and the select can sit in Standard immediately.
   Runner-up: `recept*` names for botanical continuity, adopted only after the retirements
   in §5 clear the namespace.
6. **Radial blooms: accept RADIUS-only response?** **Recommendation:** yes — a flat
   rosette's petals share one ring by definition, and the symmetry fix depends on them
   sharing one origin. Runner-up: a chosen anchor-`s` for radial (one more control, moves
   the ring up/down the dome) — defer until a design actually wants it.
7. **Thistle's EXTENT residual (41.6–42.4 % embedded).** **Recommendation:** accept as
   embedding once the body prints (slicer unions it), gated by a contact-sheet look at the
   tuck-under before ship — the metric screens, eyes decide. Runner-up: bound EXTENT
   per-design below the embedding knee — protective, but it spends a control range on a
   defect the printed body may dissolve.
8. **Tier for the four sliders.** `bloomBase` itself sits in Standard (a silhouette
   select); the sliders strain two rules against each other — "geometry and silhouette
   controls are DESIGN tier" (a rule the skill notes has been got wrong repeatedly) versus
   the Standard-growth budget your visibility rulings manage deliberately.
   **Recommendation:** sliders start in Advanced and are promoted together with your
   preset rebuild, when their useful ranges are settled by authored designs rather than by
   sweeps. Runner-up: Standard immediately per the DESIGN-tier rule, accepting four more
   Standard rows now.

## 11. Out of scope, deliberately

The **centre ornament** (stamens, carpels, fills) is not decided here. What this paper
changes about it: the centre now sits on a surface with a real, controlled size — the
receptacle's pole cap, whose radius follows from RADIUS/HEIGHT and whose bareness START
governs — instead of floating at a height. Its redesign is downstream of this construction
and should not start until this layer settles. Sepals and the base ornament likewise: one
family, designed together, on the receptacle body (§5, §6).
