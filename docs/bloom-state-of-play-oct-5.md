# State of play — a snapshot on `2885afe`, 2026-10-05

**Taken 2026-10-05 against `main` at `2885afe`** ("Build 3: the close — §20, the merge sha,
the frozen-tag read-back", #365). This supersedes `docs/bloom-state-of-play-oct-2026.md`
(#302, a snapshot on `8c1ea07`, Sep 29), which stays as it was: it records a different sha.

**This is a dated snapshot, not a plan.** It changed no geometry, registry, gate, workflow,
xfail entry or issue. This file is the only thing it wrote. Every figure was measured on
`2885afe` or read from the GitHub API on Oct 5, and the method is given beside each one.
Figures quoted from a doc rather than measured say so.

**How it was taken.**
- Git history (`git log --first-parent 798516f..2885afe`).
- Node imports of `tools/bloom-harness.mjs`, `bloom-registry.js` and `bloom-geometry.js`.
- `node tools/bloom-smoke.mjs --check`.
- `node tools/bloom-combination-gate.mjs`, run on this box.
- `git ls-remote --tags origin 'refs/tags/frozen/*'`.
- The Actions API (`bloom-export-watertight`, `bloom-connectedness`, `bloom-frozen-tags` runs).
- Two read-only research passes over the thread docs, whose citations were spot-checked
  against source.

No browser gate, byte partition or census was run.

---

## 0. Findings against the brief's own premises

The brief asked for this section by saying "expect many". Source wins in every case below.

| # | The brief says | Source says |
|---|---|---|
| P1 | `798516f` is "the gate-coverage PR, Sep 29" | `798516f` is **#321**, *form variance: headroom scaling replaces the clamp; four combination-gate triples*, merged **Sep 30**. The gate-coverage PR is **#307** (`398b9e7`, Sep 29). Four bloom PRs sit between them: #303, #304, #320 and #321. Q1 lists the window as asked, from `798516f`, and §1a adds those four. |
| P2 | Threads: variance, inflorescence, TUBE, stem, sepals, infill, gates | **Variance, sepals, infill and gates had zero PRs in the window.** The window's bloom work was exactly three threads: TUBE, stem and inflorescence. **Of the 42 merges, 15 are bloom and 27 are other pages** (bug, tile, marble, weave, frame, gauge reader, cards, textile, tracker, build). |
| P3 | "#303's 28 prose corrections" | The 28 corrections are §11 of `docs/bloom-state-of-play-oct-2026.md`, which is **#302** (`0488d2b`). #303 is the build-order PR (`a4dc836`). |
| P4 | Six declared tag refusals | **Seven**: `phase49` was added by #339 on Oct 1 (§4). |
| P5 | The coupon is bars at 2/3/4/6/8 mm × 20/40/60/80 mm | **That specification does not appear anywhere in the repository.** The charter's coupon plan is "cantilevers at stepped diameters and free lengths", plus a min-wall coupon and a 1.00/0.60/0.40/0.20/0.10 mm nib set (`docs/bloom-charter.md:183-215`). Read as given, **its smallest bar is twice the 1.00 mm floor** (§6). |
| P6 | The leaves are the weakest part of the shipped default | **The shipped default has no leaves.** `leafLength` defaults to 0, and so do `stemLength`, `sepalCount` and `stamenCount`; `petalInfill` defaults to NONE (§7). |
| P7 | The leaves have looked cruder "since the Voronoi infill landed" | **Infill is off by default** (`petalInfill: 'NONE'`). The gap opened when the petals got #278's bead rim and #283's nib and the leaf got neither (§7). |
| P8 | A collar at "~20 mm radius" | **No doc gives a radius for the crossing collar.** The measured figure is a skin-to-skin overlap of −1.170 mm at the shipping default, pinned by VS5 at u 0.323 (`CLAUDE.md`, the variance size block). |

New stale prose found today (not in #302's list):
- **`CLAUDE.md` says build 3 "takes the matrix to 1110".** That is the pre-merge figure. After stem session 3's block 48 merged, the live matrix is **1,123** (§3).
- **`CLAUDE.md` says "#355 closed on the grid that found it."** Issue #355 is still **OPEN** on GitHub.
- **`CLAUDE.md`'s build-2 block calls the 1,517,196-triangle NODE LAWS row "a declared refusal row".** `EXPORT_REFUSED_XFAIL` holds only `ALL MAX`. Build 3 retired that row, which now exports at 10.1%.
- **`CLAUDE.md`'s frozen-tag rule is falsified as worded by `phase50`.** See §4.
- **The stem cut's mover count disagrees with itself.** The charter says 156 stem rows; `docs/bloom-stem-cut-outcome.md` §0 measures 161 of 1,102.
- **`docs/bloom-inflorescence-state-oct-2026.md` says the pedicel range floors at 5 mm.** `PEDICEL_LENGTH_RANGE` is `[0, 250]`.

---

## 1. Q1 — the log: every merge since `798516f`

**42 first-parent merges, `da8bf62` (Sep 30) → `2885afe` (Oct 5).**

### Bloom — TUBE / corolla fusion (3)

| PR | sha | title | what it changed |
|---|---|---|---|
| #322 | `da8bf62` | Corolla fusion: discovery stops on crossing margins | No build. Neighbouring margins cross on the shipping default, so a margin-to-margin web has nowhere to be. |
| #323 | `f266606` | TUBE: closed-ring prototype | The scratch reference for the build session. It is also `frozen/phase49`'s base. |
| #339 | `bf1e4ee` | TUBE: ship corolla fusion | Adds `tubeLayer1..6`, `tubeHeight` and `tubeBlend`. Each whorl gets a closed ring, trimmed under the petals, with a mode-free notch. Ships TU0–TU6 and block 45 (54 rows). Registers `phase49` and pre-declares it refused. |

### Bloom — stem (5)

| PR | sha | title | what it changed |
|---|---|---|---|
| #351 | `c97d149` | docs: stem state, Oct 2026 | A ruling-by-ruling status table. Nodes and the cut are costed. |
| #352 | `a82f025` | Stem session 1 | Records rulings 5–7. Ruling 5 ships byte-inert. Ruling 6 stopped on the kink law. |
| #356 | `23b13bd` | Stem session 2 | Ruling 6: nodes are decoupled from leaves, and bare nodes kink at the golden angle. Adds `PEDICEL_PINS`, block 47 and `phase51`. |
| #362 | `a22ca83` | Stem session 3 | Ruling 7: the 45° florist's cut, `stemCut` defaulting ON. Ships SC0–SC3, block 48 and `phase52`. Every stem gains +94 triangles. |
| #364 | `0424d94` | Stem session 3 follow-up | The cut must-fail joins the export preflight, edited after `phase52` was read back. |

### Bloom — inflorescence (6)

| PR | sha | title | what it changed |
|---|---|---|---|
| #347 | `ae401c4` | docs: inflorescence state, Oct 2026 | Ruling-by-ruling status and the next build scoped. |
| #348 | `8e15f14` | docs: Eva's Oct 3 rulings | Superseded by #350. |
| #350 | `754e3aa` | docs: restated Oct 3 rulings | Build 2 is the node laws. Also `frozen/phase50`'s base. |
| #353 | `af15342` | Build 2: node laws | Adds the pedicel gradient, corymb, sessile root, shared leaf node, SN0–SN4, block 46 and `phase50`. |
| #357 | `f812047` | Build 3 | Phase A: the florets' own internode floor, the gradient cap at the head, and the defaults-bar gate DB0–DB2. Phase B: `nodeVariance`. Also ID9/ID10, NV0–NV4 and blocks 49–50. |
| #365 | `2885afe` | Build 3: the close | §20 records the merge sha and the frozen-tag read-back. Docs only. |

### Bloom — variance, sepals, infill, gates/instruments: none in the window

The last PRs in each thread:

| thread | last PRs |
|---|---|
| variance | #320 (`1f0b3f0`, build 2 form) and #321 (`798516f`, headroom and triples), Sep 30 |
| sepals | #243 (`eb2aaa7`, Sep 17, part 1); #304 touched the sepal scan only |
| infill | #300 (`c170500`, roundness), Sep 28 |
| gates | #307 (`398b9e7`), Sep 29 |

### Other pages (27)

| page | PRs |
|---|---|
| `/bug` (11) | #324, #326, #341, #342, #344, #345, #346, #349, #358, #361 |
| gauge reader (6) | #325, #327, #328, #329, #331, #338 |
| `/tile` (2) | #354, #363 |
| `/marble` (2) | #336, #359 |
| `/weave` (2) | #333, #337 |
| `/frame` (2) | #330, #335 — #335 also narrowed the flower gates' path filters |
| cards | #360 |
| textile 101 | #332 |
| artist tracker | `7ff2c5c` (item 33, Nominatim; no PR number in the message) |
| build | #340 (package-lock committed, Node 22 pinned) |

### 1a. Between the brief's "Sep 29" and `798516f`

| PR | sha | what it changed |
|---|---|---|
| #303 | `a4dc836` | Builds are order-independent (measured); `NU` leaks within one build. |
| #304 | `eab84b2` | The leaf, rod and sepal scan are pinned to their own row counts. Adds LF10 and `phase46`. |
| #307 | `398b9e7` | Gate coverage holes closed. The connectedness gate is sharded 4 ways. |
| #320 | `1f0b3f0` | Variance build 2 (form). |
| #321 | `798516f` | Headroom scaling and four triples. |

---

## 2. Q2 — thread status

### Variance

- **Ships, all OFF:**
  - `varianceSize`: build 1.
  - `varianceForm`: build 2, with the offset law and headroom scaling.
  - `varianceFrequency` and `variancePhase`, shared by both fields.
  - The told neighbour flag on every build.
  - Five combination-gate triples.
- **Half-built: build 2 of 3 is done, so it is ONE session from done.** Build 3 (spacing, ruled at A 0.9, discovery §9 ruling 3) has no code. `varianceSpacing` exists in no file.
- **Ruled, not built:**
  - Ruling 5: independent sepal amounts, "defaulting to the petals'".
  - The registry has no mechanism for a default that follows another control. The form-outcome doc proposes a PETALS/OWN choice per property.
  - Sepal size variance is costed and deferred until after build 3.
- **Next session:** build 3, spacing.
- **Eva's:** the sepal follow mechanism.

### Inflorescence

- **Ships, all OFF** (`inflorescence: NONE`):
  - Build 1 (instancing and a raceme), build 2 (node laws) and build 3 (both phases).
  - `floretNodes` 5, `floretPhyllotaxy` alternate, `pedicelLength` 20 on a 0–250 range (0 is sessile).
  - `pedicelGradient` 1, `pedicelCorymb` OFF, `pedicelAngle` 35°.
  - `floretPetals` 5, `floretScale` 0.60, `nodeVariance` 0.
- **The three numbered builds are done.** What the state doc calls next is "Build 4: terminal flower and axis-0" (the indeterminate raceme, umbel/fascicle).
- **Ruled, not built:**
  - TUBE on florets (Oct 3 ruling 4, "after budget headroom").
  - Openness / bud pose (ruling 6).
  - Droop and axis curvature (ruling 8).
  - Cymes (ruling 12).
  - The 544% corner row (Oct 3 ruling 7), which is blocked on #231.
- **Count:** at least four sessions of ruled work remain — build 4, TUBE on florets, openness, droop — plus cymes. None is scheduled.
- **Eva's:** may three full-size florets on one node share a 6 mm rachis?

### TUBE (corolla fusion)

- **Ships, OFF by default:**
  - `tubeLayer1..6`, default 40 = FREE.
  - `tubeHeight` 0.25 and `tubeBlend` 1.
  - RADIAL only. It refuses sphere, variance, buckle, fringe, infill, raceme and slot overrides.
- **Half-built:** nothing in flight.
- **Six parked questions for Eva** (`docs/bloom-tube-outcome.md` §8):
  - the `snapsBelow` predicate;
  - the panel placement;
  - the sepal limit being drawn against FREE petals;
  - `TUBE_TRIM_KEEP` 0.5;
  - whether the notch bar is a half or a full sinus;
  - roll 330.
- **Ruled, not built:** the tube on florets. **A1, a seamless corolla with a throat, is still Eva's.**
- **Next session:** none named.
- **Declared:**
  - three census xfails: tilt 105 at 320/0.3800, headRise 1 at 318/0.3512, curl 270 × h 0.58 at 400/0.1985;
  - one E2 entry: the buckle GATED row at +3.295°.

### Stem

| ruling | status |
|---|---|
| 1 — widening below the flower | **not built**: no taper law has ever been ruled |
| 2 — taper OFF | holds vacuously |
| 3 | shipped |
| 4 | shipped (#301) |
| 5 | byte-inert |
| 6 | shipped (#356) |
| 7 — 45° cut, `stemCut` FLORIST default ON | shipped (#362) |

- **Ships:**
  - `stemLength` 0, so **the default has no stem**, and `stemDiameter` 6.
  - `stemNodeProminence` 0 (OFF).
  - Hub `GOBLET` / 1 / 0.
- **Half-built: the taper.** Ruling 1's widening half needs a ruled law first (`docs/bloom-stem-taper-laws.md`), and the 3 mm-bore question waits on it.
- **Open, not ruled:** the ruling-6 tip shortfall clamp, costed at 16 live and 50 frozen rows.
- **Next session:** none named. The state doc's "session 1 = ruling 6, session 2 = the cut" is complete.
- **Eva's:** the taper law, the tip-shortfall clamp, and whether `leafPhyllotaxy` shows on a bare stem.

### Sepals

- **Part 1 ships, OFF** (`sepalCount` 0): 21 controls, including `sepalHeight` 0.75.
- **Part 2 (the rim family) is ONE session**, costed and not built (`docs/bloom-sepals-outcome.md:343-362`). It means:
  - 8 more `SEPAL_TWINS`;
  - no new geometry;
  - about 17 matrix rows.
- `sepalBladeState` still zeroes `petalTipEnd`, `fringeCount` and `lobeDepth`, and pins `petalInfill` to NONE.
- **Eva's:**
  - `sepalScale` 0.60 (the session's pick);
  - the axial-extent reading of `sepalHeight`;
  - the descending-seam fold (A26, unscheduled).

### Voronoi infill

- **Ships, OFF** (`petalInfill: NONE`):
  - S1–S5, the margin bead, and roundness 0.60.
  - Ruled defaults: density 20, relax 5, law 0.30, stretch 1.65.
  - `infillBase` is parked as hidden.
- The infilled default is **109,104 triangles** (measured).
- **Every remaining item needs a ruling before it is a session:**
  - lobed blades, still refused with `outline`;
  - a metric cell size, still flat;
  - the basal V and base narrowing, which are constants rather than controls (A21);
  - sepal infill (ruling 4 pins it off);
  - `/plot` line splitting.
- **Known defects:**
  - `rimProfile`'s along-sweep normal at the petal ends (1,872 triangles, pre-existing, recorded);
  - `I1_XFAIL` ALL FORM MAX 1.4799 mm;
  - **no apex mutant names an I or MB clause.**

### Gates and instruments

- **Built since #307:**
  - DB0–DB2, the defaults-bar standing rule;
  - the cut and node must-fails in the export preflight;
  - TU0–TU6 in the preflight.
- **Open:**
  - #231 — the budget refuses only after a full build, which blocks a ruled row;
  - #237 — ST9 is outside the mutant table;
  - #221 — "No mutant names L5"; the code says the table now carries L5 mutants, but the issue is OPEN;
  - #79 — a PR can read green because nothing ran.
- **The hygiene items are Q5.**

---

## 3. Q3 — the numbers, from source on `2885afe`

| quantity | value | how |
|---|---|---|
| live matrix | **1,123 rows** | `buildMatrix().length` |
| blocks | **46**, numbered 1–50 with no blocks 2, 3, 14 or 15 | `bloom-smoke --check`; `/\* N. /` headers |
| assertion families | **146**, each claimed by a smoke row in both directions | `bloom-smoke --check` |
| smoke subset | **164 rows** | same |
| newest frozen phase | **`phase52` = the 1,089 rows at `23b13bd`** | `FROZEN_BASE_COMMITS` / `FROZEN_MATRICES` |
| frozen phases declared | **51** (`phase2` … `phase52`, none missing) | same |
| frozen tags on the remote | **44** | `git ls-remote`, excluding `^{}` |
| declared `TAG_PUSH_XFAIL` | **7**: phase5, 22, 23, 42, 43, 45 and 49 | `tools/publish-frozen-tags.sh:120-128` |
| absent tags | **7, the same set**, so nothing is unpublished and undeclared | 51 − 44 |
| `SELF_INTERSECTION_XFAIL` | **239** entries | harness export |
| `EXPORT_REFUSED_XFAIL` | **1** (`ALL MAX`, 3,090,910 triangles) | harness export |
| panel | **177 controls in 40 sections**; 12 retired ids | registry import |
| shipping default | **24,688 triangles live and export** (3,062 a petal × 8 + 192 hub) | `buildBloomInto` |
| combination gate | **513 cells (120 in triples) over 31 pairs (7 · 18 · 6 by tier) + 5 triples; 145 under the bar, all 145 declared, across 23 pairs/triples; 652 s (10.9 min) on this box** | run here, exit 0; CG0–CG7 clean. #302 read 294 cells / 22 pairs / 64 declared. Wall time is this box's; CI's preflight time was not read |
| `bloom-export-watertight` (8 shards + verdict) | **58.4 · 58.2 · 75.6 · 62.2 min** — the last four successes, Oct 5 00:59 → 08:50 | Actions API, `updated_at − run_started_at` |
| `bloom-connectedness` (4 shards + verdict) | **56.7 · 70.6 · 73.4 min** — the last three successes | same |

**What changed in shape since #302:**
- Connectedness is no longer the ~200-minute long pole. #307 sharded it, and both long gates now run in about an hour.
- The push runs on `f812047` were in progress at the snapshot.
- As the standing rule says, size a wait from `actions_list` at the time, never from this table.

---

## 4. Q4 — the seventh refusal

**The seventh is `phase49`** — the 993 rows at `f266606`, the TUBE prototype.
- **Declared:** in advance by #339 (`bf1e4ee`, Oct 1), because that PR edits `bloom-export-watertight.yml` (the TU preflight step) after its base.
- **Fits the rule:** yes. Its first dispatch was run 36926883156 on `bf1e4ee`. Between the base and that head, five workflow files changed, all of them modifications or additions:
  - `bloom-export-watertight.yml`
  - `flower-export-watertight.yml`
  - `flower-geometry-quality.yml`
  - `bug-gate.yml` (new)
  - `frame.yml` (new)
- **Status:** it is absent on the remote, as predicted.

**The rule as `CLAUDE.md` words it is now falsified by `phase50`.** Every phase registered in the window was tested against every main dispatch after its registration:

| phase | base | first dispatch head | workflow files base → head | outcome |
|---|---|---|---|---|
| 46 | `a4dc836` | `eab84b2` | identical | published |
| 47 | `2fee3f7` | `798516f` | identical | published |
| 48 | `1f0b3f0` | `798516f` | identical | published |
| 49 | `f266606` | `bf1e4ee` | **modified** + added | **refused** |
| 50 | `754e3aa` | `af15342` | **added only** (`tile-gate.yml`, #354) | **published** |
| 51 | `af15342` | `23b13bd` | identical | published |
| 52 | `23b13bd` | `a22ca83` | identical | published |

`phase50`'s base is on `main`, and its workflow files differed from the dispatch head. **The rule says refused; it published.** The only difference was a file that did not exist at the base.

A narrower wording fits all seven rows and every declared refusal: **refused when a workflow file that EXISTS at the base differs from `main` HEAD.** That would be consistent with GitHub refusing to *update* a workflow but not objecting to the absence of one the tag never carries. `phase24` remains the known unexplained counterexample (its file was modified and it published).

This is a wording correction to an operational rule of thumb. It is not a reopening of the mechanism, which Eva closed on Sep 29. It matters for one practical reason: **adding a new workflow file does not cost frozen tags; editing an existing one does.**

---

## 5. Q5 — the hygiene backlog, with honest sizes

### 5a. #302's 28 prose corrections — **21 remain open, 3 fixed, 3 partly fixed, 1 unfixable**

Checked by grep against `2885afe` and the issue states.

- **Fixed (3):**
  - **#4** — the "THIRTY of the thirty-three" and "THE THREE THAT REMAIN" headlines are gone.
  - **#7** — the frozen-tag mechanism paragraphs were replaced by #307's rule of thumb.
  - **#12** — the tracker branch claim.
- **Partly fixed (3):**
  - **#3** — `CLAUDE.md` now strikes "ZERO module-level mutable state", but `docs/bloom-inflorescence-discovery.md` still asserts it.
  - **#14** — one of five infill sentences is fixed: the `INFILL_SUB_IDS` one. "BLOCKED BY THE EMITTER", "default **16**" and "2,354,268" (×2) remain.
  - **#24** — #43 is closed, but #221 is still OPEN.
- **Unfixable (1):** **#26**, the squash-merge messages, which are immutable history.
- **Still open (21):**

| # | what is still wrong |
|---|---|
| 1 | "107,485" appears 3× in `CLAUDE.md`; the tree reads 91,808 |
| 2 | "`ALL MAX` reads 24,688" |
| 5 | #221 is open; "No mutant names L5" is still present tense |
| 6 | "does not gate MAGNITUDE" appears 4× |
| 8 | "318-ROW" |
| 9 | the smoke figures "111/34" and "85/29"; the tree reads 164/46 |
| 10 | "262 cells" appears 2× |
| 11 | `/scene` "slots 2-8" |
| 13 | `MAX_INSTANCES` "is 8"; the tree has 12 |
| 15 | "74.3%" and "next highest at 46%" |
| 16 | the retired tip-breadth controls described as live |
| 17 | "Four of the eight" |
| 18 | #286's title |
| 19 | "stays the newest baseline" appears 4× |
| 20 | `docs/bloom-frozen-tags-outcome.md` §5 still says the dispatch is Eva's |
| 21 | "it is four" |
| 22 | "`bloom.js`'s `EXPORT_TRI_BUDGET`" |
| 23 | "Twenty controls" / "NINE controls" |
| 25 | `project-state.md`'s dormant-PR list |
| 27 | two cited docs that do not exist |
| 28 | the flower's `MIN_FEATURE_MM` 0.8 |

- **Cost:** one docs-only session, self-mergeable under the standing exception. Most is mechanical. #1, #10, #19 and #15 need the right current figure, which this document supplies. Add the six new items in §0.

### 5b. The 17 first-match witness controls — **no new drift found; one still drifting; 16 not re-audited**

- **Rechecked directly:** the edge-profile control's `CONTROL_ROWS` (`tools/verify-bloom-edge-profile.mjs:893-894`).
  - Its regex matches 8 rows on today's matrix.
  - `.slice(0, 5)` keeps DEFAULT plus four `THIN:` rows, which is exactly the drift recorded on Sep 30.
  - The cleft and the carnation are still dropped, and `^LOBES: the shipped` still matches nothing.
- **The other 16 were not individually re-audited here.**
  - Each has a loud guard (the leg must fire, or the run refuses).
  - Every gate is green on `f03bf57`, so none has gone silently empty.
  - "Green" cannot see a witness that still fires but has moved to an easier row.
- **Cost to convert the 10 table-driven ones to witness-by-name:** about one session.
  - Each needs a named row.
  - Each needs a refusal if the name is missing.
  - Each needs a must-fail that renames the row.
- Fold the edge-profile fix into that session.

### 5c. `measureWall` cannot see a petal folding into its own foot

- **The cause:** `measureWall` filters `r.row >= footRows` (`tools/bloom-wall-thickness.mjs:206`), so the foot rows are neither queries nor targets.
- **The shape of the fix:** add the foot rows as TARGETS only. Exclude query-target pairs within the seam neighbourhood, derived from the builder's own `seamStep`, so the foot-to-blade kink is not read as approach.
- **Compute cost:** small — about 3 rows added to ~56–112 per panel. The combination gate's run time moves a few percent.
- **The real cost is the re-record:**
  - Every `SELF_XFAIL` and every declared combination magnitude whose worst site is near the root may move. A run decides how many.
  - A mutant that drops the foot targets.
  - A witness row: block 44's composed state reads 1,968 census pairs.
  - Check whether the `self-every` measure (inner whorls) needs the same change.
- **Estimate:** one session, gate-side only, zero geometry bytes. Block 44 guards one instance; the class stays unguarded until this lands.

### 5d. The four declared pair hazards (accept or fix)

**Magnitudes after variance and the triples: UNMOVED on the slider grid** — every worst cell and every declared count is what #302 read on `8c1ea07`. That is expected: both variance fields default to 0, so the pair grids never see them. The triples add deeper corners (`cup × tipShape × width` 0.390 mm; `cup × roll × curl` and `curl × twist × roll` reach 0.000 / 0.007, both PAIR-REACHES).

| pair | this run | pre-variance (`8c1ea07`) |
|---|---|---|
| curl × twist | **0.007 mm**, 6 cells, PRODUCT-ONLY | 0.007 (unmoved) |
| cup × roll | **0.002 mm**, 11 cells, SINGLE-REACHES (roll 330 alone 0.658) | 0.002 (unmoved) |
| cup × petalTipShape | **0.743 mm**, 5 cells, PRODUCT-ONLY | 0.743 (unmoved) |
| leafAngle × stem | **0.000 mm**, 6 cells, SINGLE-REACHES | 0.000 (unmoved) |

- **What the variance work measured** (`docs/bloom-organic-variance-form-outcome.md` §19d): the per-petal excursion under the variance fields.
  - cup × roll: 0.000 mm.
  - curl × twist: 0.000 mm.
  - cup × tip shape: 0.001 mm.
  - leaf × stem: identical to the bit.
- That means **with a form field on, some petal reaches contact (0.000–0.001 mm) at those pairs' declared grid settings**, and more runs fall under the bar than the slider grid alone shows (33 of 40 for curl × twist, 16 of 20 for cup × roll, 24 of 28 for cup × tip shape).
- **No ruling has been recorded on any of the four.**

---

## 6. Q6 — what a print would settle

Ranked by how much a wrong assumption would cost to unwind. "Coupon" means the brief's bars (2/3/4/6/8 mm × 20/40/60/80 mm). As noted in P5, that specification is not in the repository.

| rank | assumption | owner in source | what a print tells us that CI cannot | covered by the bars? | unwind cost if wrong |
|---|---|---|---|---|---|
| 1 | **1.00 mm print floor** | `MIN_FEATURE_MM` | Whether a 1.00 mm sheet, foot and rod survive build and post-processing, at the orientation printed. | **No** — the smallest bar is 2 mm. Needs 0.6–1.2 mm sheet and rod sections. | **Highest.** It floors every export thickness, the rim floor, tip and foot floors, the infill wall, the stem land, the sphere-channel clearance and the combination bar. A change moves bytes on essentially every export row and every frozen tag, and re-records most of the 239 census entries. |
| 2 | **1.0 mm advisory self-approach / printable gap** | the same constant, read as a GAP | Whether two surfaces 1.0 mm apart print apart or fuse. CI measures distance and never fusion. | **No** — bars have no gaps. Needs paired plates at 0.4–1.5 mm gaps. | **High.** It is also a geometric input: the sphere stem channel omits petals by it, and build 3's reach inset and internode floor add it, so a change moves node counts and omitted petals as well as 145+ declared magnitudes. |
| 3 | **1.5 mm stem wall** | `STEM_MIN_WALL_MM` | Whether a 1.5 mm tube wall survives a 60–120 mm lever, and bore cleanout. | **No** — bars are solid. Needs hollow tubes at 1.0/1.5/2.0 mm walls. | **Medium.** The bore law, root band, tip plug, cut plug, join and petiole root all read it; about 161 stem rows move. |
| 4 | **The crossing collar** | not a constant | The shipping default's neighbour skins overlap by −1.170 mm (u ≈ 0.32), and a slicer unions them. Only a print shows whether that reads as a web or lump, or vanishes. | **No.** Needs a full head, or a two-petal fragment. | **Medium–high, but of a different kind.** The fix is a spacing law on the default — variance build 3's territory — and it moves the shipping default's bytes. |
| 5 | **The 0.40 / 0.10 mm apex nib** | `APEX_HALF_MM` | Whether the first authored sub-floor feature exists at all once printed. | **No.** The charter already specifies a 1.00/0.60/0.40/0.20/0.10 flat-and-nib set. | **Medium.** The nib touches every petal row (#283 moved 877 rows). |
| 6 | **45° cut, 1.00 mm land** | `STEM_CUT_LAND_MIN_MM` | Whether the point survives and whether the land is needed. | **No** — bars have square ends. Needs one cut stem end at 2–3 land widths. | **Low.** One constant, stem rows only. |
| 7 | **60 mm cantilever** | reported, not gated (`UNMEASURED`) | Real deflection and break at L/d. | **Yes, the one item the bars cover** — 60 mm × 3/6 mm brackets the pedicel and stem. It does not reach the leaf petiole (1.2 mm, L/d 100) or the 1.2 mm filament and style. | **Lowest.** Nothing is clamped on it; only labels change. |
| — | **0.4 mm nozzle** | `NOZZLE_MM` | **This is a PROCESS question, and it is upstream of every row above.** | n/a | **Cheap to edit, expensive to have wrong.** |

**On the nozzle:**
- The land is `max(1.00, 2 × 0.4)`, so the nozzle does not bind today.
- **But the rest of the project assumes SLS PA12** ("Nylon 12 White", support-free nesting, the 1.0 mm unsupported-wire minimum), where a nozzle does not exist.
- **The repository holds both premises.** Which process the first print uses decides what every other row means: FDM adds orientation and support, and SLS adds powder escape from the bore.

**Bottom line for Q6:** the bars as specified settle **one of seven** — the cantilever, the cheapest to be wrong about. A coupon that pays for itself must reach **below** 2 mm: rods and sheets at 0.6/0.8/1.0/1.2 mm, gap pairs, hollow tubes, the nib set and a cut end. **And the process has to be named first.**

---

## 7. Q7 — the shipped default, honestly

**What the default builds, measured:**
- One whorl of 8 flat petals, 35 × 16 mm, tilt 25°.
- `petalTipShape` 1.70, closing on the 0.40 mm nib with #278's bead rim.
- A flat cap hub, 192 triangles.
- Nothing else: no centre (`stamenCount` 0, `gynoecium` NONE), no stem, no leaves, no sepals, no infill, no tube, no variance.
- **24,688 triangles live and export** (3,062 a petal), 1,205.6 KiB.

**The weakest-looking part of what ships is the CENTRE: there is none.**
- The petals now carry a bead rim, a nib and a turning-rate ladder.
- They meet over a bare 192-triangle disc. A25 ("moving the default to a present centre waits on Eva") has been open since session 22.
- The second weakness is invisible in a render and real in a print: **neighbouring petals pass through each other** by 1.170 mm at the root, and the read-out says so on every build.

**On the leaves — confirmed as crude, corrected as to why.** When switched on (row `LEAVES: alternate x 3 nodes`, 52 × 17 mm on a 70 mm stem), a leaf is:

| property | leaf | petal |
|---|---|---|
| triangles | **2,548** | 3,062, on a 35 mm blade (the leaf is 52 mm) |
| teeth | cost **0 triangles** — cut into a fixed 10-column lattice, so 9 teeth at depth 0.26 are drawn by the same vertices as a plain leaf | — |
| rim | a **flat 90° wall**: raw `acc.quad` side and end rims (`bloom-geometry.js:14516-14527`), not `emitRimLoop` | half-round bead (#278) |
| tip | ends on a **1.60 mm flat face**: excluded from the nib by declaration; 2.1% of the length at tip shape 1.30 | 0.40 mm nib (#283) |
| rows | uniform 56 rows | turning-rate ladder |
| form | cup fixed at `LEAF_CUP` 0.35, twist 0 | controllable |

- **Form telemetry available for leaves:**
  - LF9's tip exponent, read back to 3.9e-10;
  - `tipClamp`;
  - L/d 100 slenderness;
  - the blade-to-stem approach, under the 1 mm gap from 70°.
- **What made them look cruder** was the petals gaining #278 and #283 in September, not infill.
- The fix is the leaf-parity session in §8. It needs Eva's three nib questions (`docs/bloom-apex-nib-outcome.md` §11).

---

## 8. Q8 — the ranked board, next six sessions

1. **Docs hygiene sweep** — the 21 open corrections in §5a, the 6 new ones in §0, and closing #355 and #221 if Eva agrees. *Avoided:* deferred across three snapshots; every session starts by reading stale figures. One session, docs-only.
2. **The print: name the process, then design a coupon that reaches the floors** (§6). *The most avoided item in the project.* Every floor, gap and wall is a guess, and the planned bars test only the cheapest one. This is a ruling plus a coupon-geometry session (an STL, not a bloom feature).
3. **Close the foot-fold class in `measureWall`, plus witness-by-name for the 10 table-driven controls** (§5b, §5c). *Avoided:* both were counted and parked on Sep 30. One gate-side session, zero geometry.
4. **Leaf parity: bead rim through `emitRimLoop`, and the nib once Eva rules §11's three questions.** The most visible quality gap on any part a user can switch on.
5. **Variance build 3 (spacing).** The only ruled-and-unbuilt build in a numbered programme, one session from closing it. It is also the lever on the crossing collar.
6. **#231 — predict the export budget before building.** It blocks a ruled matrix row (the 544% corner). The full-build-then-refuse path is a gate-timeout risk on every refused row. *Avoided:* open since Sep 13.

**Not in the six, and why:**
- Sepals part 2: one session, but no ruling asks for it now.
- Inflorescence build 4: unscheduled.
- TUBE follow-ups: six questions for Eva first.
- Stem taper: no law ruled.
- Infill follow-ons: each needs a ruling.

---

## 9. Questions for Eva, ranked

1. **Which process is the first print — SLS PA12 or FDM with a 0.4 mm nozzle?** Every row of §6 means something different under each, and the repository currently assumes both.
2. The coupon as specified (2–8 mm bars) cannot test the 1.00 mm floor, the gap, the wall, the nib or the cut. Extend it below 2 mm and add gap pairs and hollow tubes?
3. The leaf nib's three questions (`docs/bloom-apex-nib-outcome.md` §11): asked or drawn length; acceptance of a two-feature partition; should an acute leaf end in a point.
4. The four declared pair hazards: accept as a look, or fix?
5. Adopt the narrower frozen-tag wording ("a workflow file that exists at the base differs"), and so stop pre-declaring refusals for PRs that only ADD a workflow?
6. Close #355 (build 3 cleared its cells) and #221 (the table carries L5 mutants)?
