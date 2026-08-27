# Rim treatments and the filter nobody owned

Two defects on the petal EDGE layer, diagnosed by measurement, one fixed and one delisted.
Written up here because the tooth-by-tooth table below is the part that makes the claim
checkable, and because both defects sat behind a green `boundary === 0` for months.

- **E3 — struts past the serrated edge.** `TOOTHED` emitted a mid-vein for every tooth,
  including the teeth the continuous-margin rim had discarded. Fixed.
- **E2 — SCALLOPED reads as a detached outline.** Every scallop arc encloses an empty lens.
  Delisted (unlisted but live), not fixed. It is a shape defect and it is still open.

Harness: a scratch Chromium hook appended to the served `flower.js` (module scope, so it
shares `readUI` / `resolveParams` / `marginStrands` / `MeshAccumulator` /
`buildExportGeometry` with the real renderer — no second copy of any of them), plus
`tools/verify-connectedness.mjs` with the rows this work added. The scratch harness was
deleted; its numbers are here.

## The hypothesis this started from was wrong

The brief proposed an **ordering** defect: teeth applied to the outline *after* the infill
was generated and clipped, so every rib that reached the old margin overshoots the new one
and projects through the notches.

No infill rib overshoots anything. Every infill terminates on `ribMarginPolyline` /
`ribInnerEdge` (`flower.js` MEET/LOOP capture; Voronoi clips to the same curve), which is
inside the material outline at every station. Measured, one estimator on both sides:

| u | 0.00 | 0.20 | 0.40 | 0.60 | 0.80 | 1.00 |
|---|---|---|---|---|---|---|
| material half-width (mm) | 3.18 | 17.22 | 26.29 | 24.32 | 16.32 | 0.00 |
| rib centreline (mm) | 0.00 | 3.06 | 24.99 | 24.32 | 16.32 | 0.00 |
| **rib inner edge — the infill clip** (mm) | 0.00 | 2.80 | 24.78 | 24.16 | 16.21 | 0.00 |

The clip is never outside the material. The infill cannot reach the notches.

It is also not "two boundaries". It is **one producer with two consumers applying different
filters to it** — which is the registration rule pointed at a *filter* rather than at a
boundary.

## E3 — what was actually happening

`buildJaggedEdge` (`flower-geometry.js`) is one producer, returning
`{ rim, teethVeins, half, uStart }`.

1. **Rim consumer.** With `continuousMargin: on` (the shipped default) the closed hoop is
   replaced by two marginal strands assembled by `treatedStrandPoints`, which keeps only
   the tagged points at or above `rimSpliceU` — `max(margin flare end, treat.uStart)`.
   Below that the strand is deliberately bundled toward the axis for the junction. Teeth
   do not exist down there, correctly.
2. **Mid-vein consumer.** `flower.js` looped **all** of `jag.teethVeins` with no filter.

So a tooth the splice discarded left its mid-vein behind, pointing at where the tooth would
have been: a capped tube from `v = 0.45` inside the blade out to a peak in open air.

### The splice predicts it tooth by tooth

A strut is free **iff `uc < rimSpliceU`**. Not "correlates with" — predicted per strut, and
the prediction was asserted against measured coverage as a hard failure in the harness. It
held for every strut of every row.

| config (4 petals, coiled, 120 mm) | splice u | treatment uStart | free / total |
|---|---|---|---|
| shipped default (TIP REGION 0.25) | 0.6725 | 0.6725 | 0 / 15 |
| TIP REGION 0.50 | 0.4600 | 0.4600 | 0 / 15 |
| TIP REGION 0.55 | 0.4450 | 0.4175 | 0 / 15 |
| TIP REGION 0.56 | 0.4450 | 0.4090 | 0 / 15 |
| **TIP REGION 0.57** | 0.4450 | 0.4005 | **2 / 15** |
| TIP REGION 0.60 | 0.4450 | 0.3750 | 2 / 15 |
| TIP REGION 1.00 | 0.4450 | 0.0500 | **6 / 15** |
| TIP REGION 0.25, BUNDLE 1 / FLARE 0 | 0.7500 | 0.6725 | **4 / 15** |
| TIP REGION 1.00, BUNDLE 1 / FLARE 0 | 0.7500 | 0.0500 | **10 / 15** |
| TIP REGION 1.00, TIP FREQUENCY 40 | 0.4450 | 0.0500 | **16 / 41** |
| TIP REGION 1.00, ROSETTE arrangement | 0.4450 | 0.0500 | 6 / 15 |

The threshold at default bundle/flare is **TIP REGION 0.56 clean, 0.57 broken**. The
bundle/flare row moves `rimSpliceU` instead of `uStart` — the other side of the same
inequality, and it breaks at the *shipped* TIP REGION.

### How bad, in millimetres

Per strut, on a 120 mm bloom, at `process: sls`:

| | value |
|---|---|
| triangles per strut | 24 (2 rings × 6 segments = 12 wall + 12 cap) |
| struts per petal at TIP FREQUENCY 14 | 15 |
| total strut triangles | 1,440 of 92,040 export triangles |
| longest strut | 16.22 mm |
| longest **free** length | 16.22 mm (the whole strut) |
| far end to nearest drawn margin | up to 18.02 mm |
| diameter, unfloored | Ø 0.099 mm |
| diameter, **as exported** | **Ø 1.00 mm** |

**Per process — the floor is part of the finding.** The export floor is
`PROCESS_FLOOR_MM`, applied as a diameter:

| process | floor | exported strut Ø | worst free length | aspect |
|---|---|---|---|---|
| `sls` (default) | 1.0 mm | 1.00 mm | 16.22 mm | **16 : 1** |
| `fdm` | 0.8 mm | 0.80 mm | 16.22 mm | **20 : 1** |
| `sla` | 0.4 mm | 0.40 mm | 12.78 mm | **32 : 1** |

At SLS the strut is *at* the 1.0 mm unsupported-wire minimum, not below it — but as a 16 mm
cantilever. At SLA it is below the minimum outright.

### The export gate cannot see any of this

`addTube` caps both ends in export mode, so a free-floating strut is a closed solid.
`boundary === 0` on every one of these designs. The connectedness gate is the one that sees
it. The eleven new rows, run in CI on the gates-only commit (`3b18786`) **before** the fix —
41 configs, 37 one piece, 4 failing:

```
ok    TOOTHED tipRegion 0.25 (CONTROL)                    components=1   stray=0
ok    TOOTHED tipRegion 0.57 (threshold marker)           components=1   stray=0
FAIL  TOOTHED tipRegion 1.00                              components=19  stray=1.45%
FAIL  TOOTHED tipRegion 1.00 + bundle 1 / flare 0         components=37  stray=7.86%
FAIL  TOOTHED tipRegion 1.00 + tipFrequency 40            components=47  stray=3.97%
ok    TOOTHED tipRegion 1.00, continuous margin OFF       components=1   stray=0
ok    SCALLOPED default height                            components=1   stray=0
ok    SCALLOPED height 1.0                                components=1   stray=0
FAIL  SCALLOPED height 1.0, continuous margin OFF         components=2   stray=0.001%
ok    RUFFLED (contrast row)                              components=1   stray=0
```

Nineteen, thirty-seven and forty-seven detached pieces, watertight throughout. Not every
free strut detaches — 6 free × 9 petals is 54 candidates against 19 components — because a
strut whose inner end happens to land on a vein stays attached and merely cantilevers. That
is the gate's own stated false-pass direction, so 19 is a floor.

**The `continuous margin OFF` row is the point of the pair**: same design, same TIP REGION
1.00, one piece. The asymmetry is now a gate row rather than a sentence in a comment.

**Two honest caveats about these rows.**

*The 0.57 row does not detect the defect.* It is the measured threshold — the first TIP
REGION at which a tooth falls below the splice — but its 18 free struts all stay attached at
their inner ends, and the voxel test reads them as one piece. It is a threshold *marker*,
kept because a future change that moves the threshold should be visible; it is not evidence
of detection at that setting. This is not a quirk of one row — see "the gate that caught
this cannot see the hazard it caught" below, and #97.

*The SCALLOPED / continuous-margin-OFF failure was not a geometry defect at all* — see
below.

### The gate that caught this cannot see the hazard it caught

Connectedness counts **detached bodies**. It does not see **free ends**. A strut attached at
its base and dangling at its tip is one connected piece and a 16 mm cantilever at the same
time, and only the first of those is a component.

The two counters in this PR measure the same rows, so the gap is exact. The triangle deltas
give the true number of free struts (24 tris each, 9 petals); the gate gives components:

| row (9 petals) | free struts removed | components the gate saw | struts it saw |
|---|---|---|---|
| TOOTHED tipRegion 0.57 | 432 ÷ 24 = **18** | 1 | **0** |
| TOOTHED tipRegion 1.00 | 1,296 ÷ 24 = **54** | 19 | 18 (33%) |
| TOOTHED tipRegion 1.00 + bundle 1 / flare 0 | 2,160 ÷ 24 = **90** | 37 | 36 (40%) |
| TOOTHED tipRegion 1.00 + tipFrequency 40 | 3,456 ÷ 24 = **144** | 47 | 46 (32%) |

A free end becomes a component only when it detaches at **both** ends, so roughly a third of
these registered. **The 0.57 row is the one that matters: eighteen free-ended struts, and the
gate is entirely clean.** At `process: sla` each of those is Ø 0.40 mm with 12.78 mm free —
a 32:1 unsupported cantilever, and no gate in this repository can see it.

So connectedness caught this defect by luck, not by design: it caught the configurations
where enough struts happened to detach at both ends. A design with one or two free struts
per petal — a real print hazard — passes every gate the project owns.

That is a fifth instance of a gate measuring the property *adjacent* to the one that
matters, after the four the working agreements already record, and it is the one with a
physical consequence. The project states a 1.0 mm minimum for unsupported wire in its
printing constraints and has **no gate that measures it**: `boundary === 0` cannot (a free
strut is a capped closed solid), `shells` cannot, and connectedness only in the extreme.
Filed as **#97**, with a pointer to the instrumentation this diagnosis already built — the
per-strut free-length and diameter measurement is most of that gate.

### The row that failed for a reason nobody predicted

`SCALLOPED height 1.0, continuous margin OFF` reported 2 components on a commit containing
**no geometry change**, so it was pre-existing on `main`. The second component was a
**single voxel with a 0×0×0 bounding box** at (33.842, 7.771, −14.240) mm.

That is the gate, not the flower. Two independent signatures on the same STL buffer:

| probe | result |
|---|---|
| 6-connected, cell 0.60 mm (shipped) | **2 components** |
| 26-connected, cell 0.60 mm | 1 component |
| 6-connected, cell 0.45 mm | 1 component |
| 6-connected, cell 0.30 mm | 1 component |

A real gap does not close when the cell *shrinks*. The rasteriser sampled each triangle at
`cell × 0.5`, derived from the triangle's longest edge, and `Math.round` snaps each sample
to the nearest cell centre — so a thin oblique feature can occupy a cell none of whose six
face-neighbours were ever sampled. Sample-step sweep at the shipped cell, 6-connectivity
throughout:

| sample step | components | occupied voxels |
|---|---|---|
| `cell × 0.50` (shipped) | **2** | 124,634 |
| `cell × 0.35` | 1 | 126,761 |
| `cell × 0.25` | 1 | 128,267 |
| `cell × 0.20` | 1 | 129,037 |

The shipped step was missing ~1.7% of the cells the surface passes through. Fixed to
`cell × 0.25` (+47% on the voxel pass: 1007 ms → 1482 ms on that row). **Not a loosening**,
though it turns a red green: denser sampling can only add voxels the surface genuinely
passes through, so it can never bridge a real gap — only stop splitting one surface from
itself.

The gate's header claimed it "cannot produce a false ALARM, only a false pass on a hairline
touch". That was false, and this was the counterexample. Corrected in place and recorded as
**#96**, which stays open for the residual risk: a quarter cell is a margin, not a proof.

### The fix

`rimCoversStation(u, P, treat)` in `flower-geometry.js` answers *is the treated rim present
at this station?* once. `treatedStrandPoints` asks it (its two halves are now complementary
by construction rather than by two hand-written inequalities), and the mid-vein consumer in
`flower.js` asks it. `teethVeins` entries carry the station of the tooth that was actually
built (`t.uc`), not a re-derivation from `tipRegionRange` + TIP FREQUENCY.

Adding `>= rimSpliceU` at the second call site would have cleared the symptom and left two
consumers each deciding for themselves what the splice means. That is the defect in
miniature, and this codebase now has instances of the same rule at six granularities.

**What was explicitly not done:** extending the splice so teeth reach the base. Below the
splice the margin is deliberately the bundled strands — that is what continuous margin is
for. Wanting teeth further down is a margin-design change with a contact sheet, not a
repair.

## Verification — the fix removes exactly the predicted geometry, and nothing else

The two commits differ only by the fix, so CI's own per-row triangle counts are a matched
change report. Every delta is **24 triangles × (predicted free struts per petal) × 9
petals** — 24 being one strut's export cost (2 rings × 6 segments = 12 wall + 12 cap).

| connectedness row (9 petals, radial) | before `3b18786` | after `3ecacc9` | Δ | predicted |
|---|---|---|---|---|
| TOOTHED tipRegion 0.25 (control) | 223,332 | 223,332 | **0** | 0 free → 0 |
| TOOTHED tipRegion 0.57 | 217,284 | 216,852 | **−432** | 2 × 9 × 24 = 432 |
| TOOTHED tipRegion 1.00 | 213,252 | 211,956 | **−1,296** | 6 × 9 × 24 = 1,296 |
| TOOTHED tipRegion 1.00 + bundle 1 / flare 0 | 202,122 | 199,962 | **−2,160** | 10 × 9 × 24 = 2,160 |
| TOOTHED tipRegion 1.00 + tipFrequency 40 | 234,420 | 230,964 | **−3,456** | 16 × 9 × 24 = 3,456 |
| TOOTHED tipRegion 1.00, continuous margin OFF | 188,386 | 188,386 | **0** | hoop keeps every tooth |
| SCALLOPED default height | 219,948 | 219,948 | **0** | no mid-veins to filter |
| SCALLOPED height 1.0 | 219,948 | 219,948 | **0** | — |
| SCALLOPED height 1.0, continuous margin OFF | 203,290 | 203,290 | **0** | — |
| RUFFLED | 292,148 | 292,148 | **0** | — |
| every other row, and **all seven presets** | — | — | **0** | — |

The live view agrees, on a different arrangement (5 petals, radial) and a different cost per
strut (12 tris — the live build emits no caps):

| frame | before | after | Δ | free struts × 5 petals × 12 |
|---|---|---|---|---|
| tipRegion 0.25 (control) | 103,384 | 103,384 | 0 | 0 |
| tipRegion 0.57 | 100,024 | 99,904 | **−120** | 2 × 5 × 12 |
| tipRegion 1.00 | 97,784 | 97,424 | **−360** | 6 × 5 × 12 |
| tipRegion 1.00 + bundle 1 / flare 0 | 91,926 | 91,326 | **−600** | 10 × 5 × 12 |
| SCALLOPED height 1.0 | 102,404 | 102,404 | 0 | — |

**The per-petal free-strut counts — 2, 6, 10, 16 — were derived on a 4-petal COILED bloom
and reproduce exactly on a 5-petal ROSETTE and a 9-petal ROSETTE.** That is the diagnosis's
central claim, that the condition is `uc < rimSpliceU` and nothing about petal shape or
arrangement enters it, confirmed on three arrangements by two independent counters.

`connectedness: PASS — 41/41 configs are ONE connected piece` on `3ecacc9`, with
`boundary === 0` throughout and all six CI gates green.

### The byte report, and the claim it refuted

`docs/tools/diff-export-bytes.mjs` over all 188 configs, pre-fix tree against fixed tree.
The pre-fix side was built in a **git worktree** with only `flower.js` and
`flower-geometry.js` reverted, so the sole difference is the E3 fix and the config matrix is
identical on both sides. Reproducibility control first: two full runs of the fixed tree gave
**188/188 identical hashes** (the only diff in the whole file was a node PID in a warning
line), so a hash difference between trees means a real change.

**161 / 188 byte-identical. 27 changed.** I had predicted a much smaller set, on the
argument that the guard sits inside `if (jag && …)` and so cannot reach a design without a
toothed edge. **That argument was wrong**, and the byte report is what caught it — the
triangle counts in CI did not, because every connectedness row is `BARE` and `BARE` turns
sepals off.

**Sepals are built through the same `buildPetalInto`.** `sepalTipStyle: SERRATED` runs the
same `buildJaggedEdge`, emits the same tooth mid-veins, and is governed by the same
`uc < rimSpliceU` inequality, with `sepalTipRegion` playing the part `tipRegion` plays for
petals. A design can have CLEAN petals and SERRATED sepals — and then it is a "non-TOOTHED
design" that the fix changes.

The arithmetic closes exactly, at 24 triangles per strut:

| config | Δ tris | struts | petal | sepal |
|---|---|---|---|---|
| cont-margin BUNDLE tight 1 / flare 0 | −1,200 | 50 | 0 | **50** |
| cont-margin SCALLOPED tall, voronoi, PROFILE …, and 20 more | −240 | 10 | 0 | **10** |
| cont-margin TOOTHED tipRegion 0.57 | −672 | 28 | 18 = 2 × 9 | **10** |
| cont-margin TOOTHED tipRegion 1.0 + bundle 1 / flare 0 | −3,360 | 140 | 90 = 10 × 9 | **50** |

The sepal contribution is 10 at default bundle/flare and 50 at bundle 1 / flare 0, and those
two numbers are consistent across all four rows — two independent equations agreeing, not
one fitted constant. The `SCALLOPED` rows change for the same reason: scalloped *petals*
have no mid-veins, but their *sepals* are still serrated.

Why so many rows: `diff-export-bytes` applies configs cumulatively on one page, and
`sepalTipStyle: 'jagged'` is set once (with `sepalTipRegion: 0.6`, past the threshold) and
**never reset**, so every later config inherits serrated sepals.

At shipped defaults `sepalTipRegion` is 0.3, below the threshold, so a default serrated sepal
is clean — exactly as `tipRegion` 0.25 is for petals. The slider reaches 1.0 either way.

**Coverage consequence.** Every rim-treatment row added here uses `BARE`, which sets
`sepalsType: none`, so none of them can see a serrated sepal. A row with serrated sepals is
added for that state. Its value is coverage, not detection: per #97 the connectedness gate
sees free ends only once they detach at both ends, so a green result there is not evidence
the struts are gone — the byte delta is.

## E2 — SCALLOPED, and why it is a different defect

`buildScallopEdge` returns `teethVeins: []`. There are no struts on any scalloped row
(measured: 0), and it exports as one piece. E2 is not a free-end problem.

TOOTHED and SCALLOPED are the same construction — an appendage bulging off a
treatment-blind material boundary — but TOOTHED ships a filler for it and SCALLOPED ships
none. The material field never learns about either: `fieldCacheKey` carries no scallop
parameter at all, and `tipStyle` only for the ruffle's *surface* displacement.

A second scallop finding, filed separately as **#94**: `buildScallopEdge` never calls
`tipRegionRange`, so it generates arcs across the whole margin and the splice then discards
the basal ~44% of every chain under continuous margin (excursion 6.63 mm on vs 7.13 mm off).
That is true independently of the empty lens and will still be true when SCALLOPED returns.

Max distance from the lofted rim to the nearest geometry that could fill the loop it
encloses:

| edge style | rim excursion past material | rim → nearest filling geometry |
|---|---|---|
| CLEAN | 0.00 mm | 0.18 mm |
| RUFFLED | 0.32 mm | 0.25 mm |
| TOOTHED | 3.80 mm | **1.34 mm** (each tooth is filled by its mid-vein) |
| SCALLOPED, height 0.4 (default) | 6.63 mm | **6.67 mm** |
| SCALLOPED, height 1.0 | 10.95 mm | **11.04 mm** |
| SCALLOPED on LOBED | 14.00 mm | 7.68 mm |

An empty lens 6.7 mm deep at the *default* height. That is the doubled silhouette.

### Disposition: unlisted but live

The option is `hidden` + `disabled` in `flower-registry.js` and `flower.html`
(`verify-registry-sync.mjs` asserts the two agree). The value stays reserved and still
builds, so a saved design that chose it renders byte-identically. **No migration** — a
deleted `<option>` would make `applyDesign`'s `el.value = v` fall back to CLEAN silently,
which is a migration nobody asked for. It returns by removing the two flags.

This was ruled on the premise that SCALLOPED was hard to reach. It was not:
`advancedOnly` appears **nowhere** in `flower-registry.js`, so `ADV_OPTIONS` is `{}` and
`tipStyle` is `tier: "standard"`. Verified in a real Standard-tier page — all four options
rendered un-hidden and un-disabled, and selecting `scallop` stuck with no fallback rewrite.
It was two clicks from the default landing state.

## Filed separately, not fixed here

- **#92** — GROWTH's export triangle count changes between the first and second export of
  the same state (111,110 → 125,830), the same pair in both full runs. Deterministic, so
  something is cached across exports. Not #88. It puts a question mark over past change
  reports touching a GROWTH config as well as future ones.
- **#93** — the margin strand is Ø 0.613 mm at the foot and Ø 0.119 mm at the tip, below
  every process floor, so `MARGIN_W_BASE` / `MARGIN_W_TIP` and their 5:1 taper have no
  effect on any exported model.
- **#94** — `buildScallopEdge` and the discarded basal 44%, above.
- **#96** — the connectedness gate's false-alarm mode, above. The sampler is fixed here;
  the issue stays open for conservative voxelisation, which would be a proof rather than a
  sample-step margin.
- **#97** — no gate measures the minimum-wire rule. Connectedness counts detached bodies,
  not free ends, and misses roughly two thirds of the free struts it is looking straight at.
- **#98** — `verify-registry-sync.mjs` tokenises options with a regex over raw markup and
  does not skip comments, so prose containing a tag is read as live markup.

## Eight claims with nothing enforcing them, found in one PR

This is the defect this repository repeats most, so they are counted rather than listed
loosely. Instances 1-4 are the same sentence in four files; 5-8 were each found by *using*
the thing that carried them, which is the only way any of them surface.

### 1-4. The tier-rewrite claim

The claim *"in Standard the tier rewrites `tipStyle` 'jagged'/'scallop' → 'clean' and
`bloomType` 'bilateral' → 'coiled' (ADV_OPTIONS)"* was live in four files and false in all
four — `ADV_OPTIONS` has been `{}` since the FAN quarantine was lifted:

- `tools/verify-flower-export.mjs`
- `tools/verify-geometry-quality.mjs` (twice)
- `docs/tools/diff-export-bytes.mjs`

### 5. A shipped preset's rationale

`flower-presets.js` carried *"scallop is inert under the Standard continuous margin; that
edge lives in Advanced"* on Poppy — both halves false (#53 made the scallop live, measured
excursion 6.63 mm on / 7.13 mm off; it was never in Advanced). Load-bearing: it is the
stated reason a shipped preset ships smooth.

### 6. A comment contradicting the code three lines below it

`verify-connectedness.mjs` said its preset rows "declare `stem: true`" directly above code
declaring `stem: false`.

### 7. The caption on the evidence itself

`tools/make-contact-sheet.mjs` hardcoded the right-hand caption as `after (#77)` and kept
saying so long after #77 merged — so every contact sheet produced since has been labelled
with the wrong PR. Found by reading a sheet made *for this PR*, whose entire subject is
claims with nothing enforcing them. A caption is a claim about which tree produced the
frame; a hardcoded one is a claim nothing checks. Both captions are arguments now,
defaulting to the directory basename, which cannot go stale.

### 8. A gate's own header, falsified by one of its own new rows

`verify-connectedness.mjs` claimed it "cannot produce a false ALARM, only a false pass on a
hairline touch". It can, and one of the rows added here produced one. Corrected in place;
**#96**. This is the worst of the eight, because it is the claim a reader would most
reasonably trust without checking — a gate's account of its own failure modes.

The Advanced toggle that instances 1-4 justified is still needed, for a different and true
reason: Advanced-tier *controls* are hidden in Standard.

## Gate coverage

Not one row of `verify-connectedness.mjs` set a tip style before this work — the same
blindness that let #84 ship. Eleven rows added: TOOTHED at TIP REGION 0.25 / 0.57 / 1.00,
TIP REGION 1.00 with BUNDLE 1 / FLARE 0, TIP REGION 1.00 at TIP FREQUENCY 40, both
`continuousMargin` polarities, SCALLOPED at two heights and both polarities, and RUFFLED as
a contrast row. The `continuousMargin` asymmetry — E3 exists only with it ON — is recorded
as a gate row rather than as a comment.

They were added first and run red, then fixed. A row that has never been seen red is not
evidence.
