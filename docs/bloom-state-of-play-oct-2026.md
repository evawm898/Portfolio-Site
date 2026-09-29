# State of play — a snapshot on `8c1ea07`, not a roadmap

**Taken 2026-09-29 (≈01:50–03:00 UTC), on `main` at `8c1ea076d786905268d0cf0a723ebebf9ba71945`**
("Bloom stem: the flower's node swelling and kink as one control, shipped off", #301,
committed 2026-09-28 20:31 −0400).

**THIS SUPERSEDES `docs/bloom-state-of-play.md`** (#258, `9853a4f`, a snapshot on `e804027`
taken 2026-09-18). That file is left exactly as it was: it is a record of a different sha, and
editing it would turn a dated snapshot into a living document, which is the thing both
snapshots exist to avoid. Read this one instead of it; read it as history in eleven days.

**THIS IS A SNAPSHOT AND IT IS DATED ON PURPOSE.** Every figure below was measured or read
against that one sha at that one time. Nothing here is a plan, a recommendation or a schedule.
Eva's rulings and the session backlog live outside this repository and this session cannot see
them; where a question is Eva's, it is named as hers and left alone.

**What this session did.** It read, measured and reported. It changed no geometry, no registry,
no gate, no workflow, no threshold, no xfail entry and no issue; it opened, closed and commented
on nothing on GitHub. The one file it wrote is this one. Where something below is broken or
ambiguous, it is **recorded, not fixed, and not resolved**.

**How it was taken.** Git history and the tree at `8c1ea07`; the GitHub API (PRs, issues,
workflow runs, tags); and Node imports of `bloom-registry.js`, `bloom-geometry.js` and
`tools/bloom-harness.mjs`. Four instruments were RUN (the harness load, `bloom-smoke --check`,
`bloom-wall-thickness`, `bloom-combination-gate`); no browser gate, no byte partition and no
census was run. Where a figure is quoted from a commit message or a doc rather than measured
here, that is said beside it.

**A note on the local clone.** The session's checkout was shallow; `git fetch --deepen` was
used (object fetch only) wherever older history was needed. It changes nothing on disk that is
in this diff.

---

## 1. `main` as it stands

**Current sha:** `8c1ea07` (2026-09-28 20:31 −0400).

**Measured here, on this sha:**

| quantity | value | how |
|---|---|---|
| live matrix | **970 rows**, 37 blocks | `buildMatrix()` via the harness; block count from `bloom-smoke --check` |
| smoke subset | **127 rows** over 37 blocks | `node tools/bloom-smoke.mjs --check` (exit 0) |
| assertion families | **120**, every one claimed by a smoke row in both directions | same |
| frozen baselines declared | **44** (`phase2` … `phase45`) | `Object.keys(FROZEN_BASE_COMMITS)` |
| `SELF_INTERSECTION_XFAIL` | **233** entries | harness export |
| `EXPORT_REFUSED_XFAIL` | **1** entry (`ALL MAX`) | harness export |
| panel controls | **164** in **38** sections; 12 retired ids | `bloom-registry.js` import (§8) |
| shipping default bloom | **24,688 triangles live and export; 1,205.6 KiB STL** | `buildBloomInto(new MeshBuilder({exportMode}), DEFAULTS)` |
| the same with `petalInfill: VORONOI` | **109,104 triangles**, both modes | same |

(#258 read 852 rows / 31 blocks / 102 families / 98 smoke rows / 146 controls / 19,040 default
triangles on `e804027`. The default moved to 24,688 with #278's edge profile.)

### 1a. Every merge into `main` in the last 14 days

**50 first-parent merges, 2026-09-17 → 2026-09-28** (none on 09-15/16). "Bytes?" is the
merge's **own** claim, quoted briefly; it is not an independent re-measurement.

| sha | date | PR | what it shipped | class | byte claim in its own message |
|---|---|---|---|---|---|
| `8c1ea07` | 09-28 | #301 | Stem nodes: `stemNodeProminence` (swelling + kink), ST12, block 41, `frozen/phase45` | bloom generator | "11 movers moved, 0 floats moved on 959 holders" |
| `c170500` | 09-28 | #300 | Infill roundness control `infillRound` (0–1, def 0.60), I12, `phase44` | bloom generator | **none** (squash body is WIP bullets) |
| `21ddbbd` | 09-28 | #299 | The flower's stem read from source against the bloom's | docs | "docs only" |
| `38a4893` | 09-28 | #298 | Stem taper-laws discovery | docs | "docs only" |
| `edbf410` | 09-28 | #297 | Infill: bead the outer margin (`insetPlan`, MB0–MB2), `phase43` | bloom generator | "29/29 movers moved, 924 holders held" |
| `2457d12` | 09-27 | #295 | Infill bevel/roundness discovery (tools + docs, nothing built) | tools | "no generator or flower file touched" |
| `2a6ce59` | 09-27 | #296 | Stem form discovery | docs | "discovery only; one file" |
| `0993c6e` | 09-27 | #294 | `bloom-export-watertight` sharded 8 ways + verdict job | tools/CI | "no geometry … no row moved" |
| `800307f` | 09-27 | #293 | Declare `frozen/phase42` in `TAG_PUSH_XFAIL` | tools | — |
| `b4088e3` | 09-27 | #292 | Infill **S5**: hole rims on the edge profile; `emitRimLoop` owns every rim; `phase42` | bloom generator | "28 of 28 movers moved, 0 floats on the 924 holders" |
| `03a1042` | 09-27 | #291 | Infill ruled defaults (20 / 5 / 0.30 / 1.65); solid base parked; `phase41` | bloom generator | "27 movers / 924 holders" |
| `a8cea82` | 09-26 | #290 | Infill **S4**: relaxation / law / stretch / base controls, I8–I11; `phase40` | bloom generator | only "default plan bit-identical by construction" |
| `4f3d31b` | 09-26 | #289 | Apex: live smooth shading + budget-capped row ramp above tip shape 2.50 | bloom generator | spot checks + "mover sweep 19 / 1 / 922" (no float count) |
| `387a984` | 09-25 | #288 | Cards: built-in suit-glyph families, per-suit override, stretch | cards | n/a |
| `429500d` | 09-24 | #287 | Docs: #286 cross-links, frozen-tags ruling, git/refs refutation | docs | "docs-only" |
| `6ebf784` | 09-24 | #283 | **Apex nib** + cup fold clamp, AN0–AN3, `phase39` | bloom generator | "877 moved / 32 held … 117 of 117 … 0 floats on 803 holders" |
| `8bb8685` | 09-24 | #284 | Infill **S3**: builder, CHOICE guard, material mask, I0–I7, `phase38` | bloom generator | "shipping default does not move a byte"; 15 holders × 2 modes |
| `55ca84c` | 09-23 | #282 | Infill **S2**: metric plan (prototype, tools only) | tools | "bloom-geometry.js sha256-identical" |
| `eb102d3` | 09-23 | #281 | Infill **S1**: conforming emitter (prototype, tools only) | tools | "sha256-identical to the base" |
| `2464d50` | 09-23 | #278 | Petal edge profile: taper + bead rim, corner-fan gate, E0–E6 | bloom generator | "13 moved / 896 held" (see §1b) |
| `b26dccf` | 09-22 | #280 | Infill port plan + Eva's seven rulings | docs | "docs only" |
| `8f5e209` | 09-22 | #279 | Census: a shared corner is topology (CA0–CA7) | tools | "instrument only" |
| `370521f` | 09-21 | #273 | **Organic variance build 1 of 3**: size field + told flag, VS0–VS5, `phase37` | bloom generator | "24 moved / 885 held over 909 rows" |
| `ad17bc3` | 09-21 | #276 | Scene 1 rain retune + widened gate window | scene | n/a |
| `55ab8a8` | 09-21 | #275 | Scene 3 stall is an environment artefact | docs | "docs only" |
| `bbf5058` | 09-21 | #274 | Scene 3 stall correction | docs | "docs only" |
| `6f8c72b` | 09-21 | #271 | Scene 3: the wave as an object | scene | n/a |
| `625c572` | 09-21 | #260 | Scene 1 ripple/storm/pad tuning | scene | n/a |
| `dd65f2d` | 09-21 | #218 | `docs/project-state.md` snapshot | docs | — |
| `e83a9b8` | 09-21 | #110 | Flower petal-origin position paper | docs | "no geometry" |
| `af6763c` | 09-21 | #71 | Flower Standard-panel proposal | docs | "no registry change" |
| `e87ebdc` | 09-21 | #78 | CLAUDE.md: `update_trigger` on a spent one-shot | docs | — |
| `29e10be` | 09-21 | #64 | Flower control-panel audit | docs | "docs only" |
| `f1fbdf9` | 09-20 | #272 | **Inflorescence**: instancing + one raceme, 7 controls, `phase36` | bloom generator | "21 moved / 862 held over 883 rows" |
| `3ed45df` | 09-20 | #270 | `diff-bloom-bytes`: a refusal is not a broken export | tools | "zero geometry" |
| `426f4fa` | 09-20 | #268 | Delete the ROOT BLEND read-out line; panel route (v) retired | bloom.js read-out only | "860/860 byte-identical" |
| `71b73c1` | 09-20 | #269 | Scene 3 beach/swash foundation | scene | n/a |
| `d6fdbb3` | 09-20 | #267 | Root blend at ≥3 layers is FIXED — record corrected | docs | "sha256-identical" |
| `8fd48e4` | 09-20 | #266 | Frozen-tags self-test count derived | tools | "zero geometry" |
| `8a9476b` | 09-19 | #265 | Combination gate tiers 2 + 3 | tools | "0 of 836,485,992 floats" |
| `c29a8b5` | 09-19 | #264 | Combination gate cost on the runner | docs | "docs-only" |
| `634b1a0` | 09-19 | #263 | Combination gate tier 1 | tools | "0 of 836,485,992 floats" |
| `937263a` | 09-19 | #262 | seam-bytes: declared-redefinition clause scoped to the live matrix | tools | "no geometry" |
| `622d4a7` | 09-19 | #261 | `petalTilt` 0..120, role-override envelope, block 36, `phase35` | bloom generator | "28 moved / 822 held / 2 redefined, +8 added" |
| `0db9969` | 09-18 | #259 | Tilt-range ruling recorded, not shipped | docs | "no byte moved" |
| `9853a4f` | 09-18 | #258 | The previous state-of-play snapshot | docs | "one file" |
| `e804027` | 09-18 | #257 | Uniform arc sinc-stable, AS0–AS4 | bloom generator | "116 moved / 736 held of 852" |
| `ae90b70` | 09-18 | #255 | Frozen-tags self-test tagger identity | tools | — |
| `b6f62e5` | 09-18 | #256 | Infill basal boundary owner; `profile.laminaSlopeBreaks()` | bloom generator (one accessor) | "0 bytes move over 832,328,424 floats" |
| `09e2aca` | 09-17 | #254 | Frozen-tags outcome doc | docs | "docs only" |

Class counts: bloom generator 16 · other page 5 (4 scene, 1 cards) · tools-only 12 · docs-only 17.

### 1b. Claims checked against the diff

Cheap, concrete claims (file counts, "docs only", "no geometry", named tools and symbols
present, frozen phases registered at the named sha, movers + holders summing to the row count)
all check out on every merge except the following. None of these says a geometric outcome is
false; each says a sentence is narrower, staler or differently scoped than it reads.

1. **`387a984` (#288, cards)** claims "Four hand-authored glyph families (Classic, Minimal,
   Bold, Hand-drawn), 16 SVGs total". The diff adds **12** SVGs in three directories and there
   is no `bold/`; `cards/glyph-presets.js:20` says the fourth ("Ornate", id `bold`) "was
   dropped". The squash message was not updated.
2. **`2464d50` (#278)** — "Byte partition: 13 moved / 896 held" is **not** the merge's movement
   against `main`: the same message says the default goes 19,040 → 24,688 triangles and the
   matrix 50.4M → 64.8M, i.e. essentially every petal row moved. `docs/bloom-edge-profile-outcome.md`
   §19 shows 13/896 is the corner-fan gate + bead floor measured against the branch's own pre-gate
   tree. No whole-change partition against `main` is quoted in the message.
3. **`4f3d31b` (#289)** — the squash body still carries a sub-commit's "No geometry files
   touched; bloom-geometry.js is byte-identical to main", while the merge changes
   `bloom-geometry.js` by +211 lines, `bloom.js` and `bloom.html`. Its byte evidence is five
   spot-checked exponents, `ALL MAX`, and a "mover sweep" (19 / 1 / 922) with no float count;
   no whole-matrix comparison is claimed although it rewires `buildBloomInto` for every row.
4. **`4f3d31b` (#289) also makes #272's stated premise false without saying so** — see §11,
   item 3 (module-level mutable state).
5. **`8bb8685` (#284, S3)** claims "the shipping default does not move a byte" and 15 holders ×
   2 modes; it adds 22 matrix rows and a material mask to every `.glb`, and quotes no whole-matrix
   partition.
6. **`8f5e209` (#279)** — its message says "1 predeclared worst-span move, 68 within-shell count
   moves" over 68 moved rows; `CLAUDE.md`'s account of the same change says 1 + 67 = 68. The
   message double-counts one row.
7. **`6ebf784` (#283)** — "THE FILE THAT STATES THEM DOES NOT MOVE IN THIS PR" (of Eva's
   frozen-tags ruling in `CLAUDE.md`) while `CLAUDE.md` is +342 in the diff. It holds for that
   paragraph only; loose, not wrong.
8. **`8a9476b` (#265)** says "Closes #265" — its own PR number. Harmless.

**Touched bloom generator source with no byte claim in the message:**
- **`c170500` (#300)** — `bloom-geometry.js` +244, `bloom-registry.js`, `bloom.js`; the squash
  body is six WIP titles. The "31 movers / 926 holders" figure exists only in `CLAUDE.md`.
- **`a8cea82` (#290, S4)**, borderline — only "the default plan is bit-identical by
  construction"; partition figures deferred to the outcome doc and `CLAUDE.md`.

### 1c. The five programmes, where each actually stands

Established from code, docs and history only; nothing here says what should happen next.

**Petal tip / apex nib.** Shipped: `6ebf784` (#283, the nib + cup fold clamp), `429500d`
(#287, docs), `4f3d31b` (#289, live smooth shading + NU 56 → 112 row ramp over tip shape
2.30–2.70, budget-capped). **#285 and #286 are GitHub ISSUES, not PRs** — both open, both split
out of #283 on Eva's ruling. What is still owed on each is in §2a. No branch or PR works on
either.

**Voronoi infill port** (`docs/bloom-infill-port-plan.md` §6, line 356):

| session | what the plan says it is | status |
|---|---|---|
| S1 | conforming emitter | shipped `eb102d3` (#281), plan marks DONE |
| S2 | metric (arc-length) plan | shipped `55ca84c` (#282), plan marks DONE |
| S3 | builder, guard, material mask | shipped `8bb8685` (#284); **the plan carries no DONE marker for it** |
| S4 | the remaining controls | shipped `a8cea82` (#290), plan marks DONE |
| S5 | hole rims take the edge profile | shipped `b4088e3` (#292), plan marks DONE |
| S6 | the sheet and the remaining rulings (`:440`) | **no DONE marker; no merge claims "S6"**. #291 records Eva ruling the defaults from the live preview, and several `shot-bloom-infill-*` sheets exist, so S6's substance may have happened; no doc says so. |

Merges outside the S-numbering: `b6f62e5` (#256, pre-S1 basal boundary), `b26dccf` (#280, the
plan), `03a1042` (#291, ruled defaults, solid base parked), `0993c6e` (#294, export gate
sharded because the infill's cost took one job to 342 min), `2457d12` (#295, roundness/bevel
discovery), `edbf410` (#297, margin bead — fixes S5's declared flat outer wall), `c170500`
(#300, the roundness control). Named as not done in the infill docs: §7 items B11–B16 and C2–C6.

**Organic variance.** Shipped: `e804027` (#257, its declared prerequisite — ruling 6) and
`370521f` (#273, **build 1 of 3**: size). Build 2 = **form**, build 3 = **spacing**
(`docs/bloom-organic-variance-discovery.md:329`, ruling 7; five controls in all, ruling 2
`:318`). **No code, branch or commit exists for builds 2 or 3** (no `varianceForm` /
`varianceSpacing` identifier anywhere; `git log --all` shows only #257 and #273). Sepal size
variance is deferred "to its own PR, after build 3" (`docs/bloom-organic-variance-size-outcome.md` §9).

**Inflorescence.** Shipped: `f1fbdf9` (#272, instancing + one raceme). Nothing merged since
touches it. Defined next: per-node deltas ("the natural next session",
`docs/bloom-inflorescence-outcome.md:391` §7), presets (ruling 10), and the Q12 grouping
(`docs/bloom-inflorescence-discovery.md:734`): umbel/fascicle; spike/corymb/botryoid; openness
ramp (after the bell session's pose sheet); droop (its own axis-curvature session); cymes;
compound depth 2–3 — "8–10 sessions". The grid `.glb` does not carry florets.

**Stem form.** Discovery: `2a6ce59` (#296, recommended taper → curvature → nodes → section),
`38a4893` (#298, asked whether nodes matter more than taper), `21ddbbd` (#299, "a
node-and-straightness problem, not a taper problem"; nodes first, taper "afterwards, if at
all"). Shipped: `8c1ea07` (#301, **nodes**). Full swept-frame curvature, taper and
cross-section are **discovery only**. **The "one more stem session in flight" is not visible on
the remote**: no open PR, no `refs/pull/302`, and the only remote branch with "stem" in its
name is `claude/junction-phase2-stem-join` (`977aa88`, an Aug 28 FLOWER branch). If it exists,
it has not pushed.

---

## 2. Open pull requests

**Two, both drafts, neither a bloom PR, neither carrying a gate result on its head.**

| PR | branch | base | head | draft | created | last update | what | mergeable_state |
|---|---|---|---|---|---|---|---|---|
| #230 | `claude/deploy-preview-snapshot` | `main` | `544f2ee` | yes | 09-13 | 09-21 | "Standing deploy-preview snapshot of main (no-op)" | not reported by the list API (base recorded at `f1fbdf9`, eight bloom merges behind) |
| #111 | `claude/flower-bloombase-phase-a-91zmld` | `main` | `d449cf3` | yes | 08-31 | 08-31 | Flower bloomBase Phase A | not reported; last CI on its head `flower-base-continuity` success 08-31 |

**Nothing is green and sitting.** #258 listed eight open PRs; #64, #71, #78 and #110 have since
merged (as docs), and the rest other than #111 and #230 are closed.

### 2a. #285 and #286 — issues, and what each still owes

**#285 "Nib arc: along-u fold under cup" (open, 1 comment).** `LOBES: x cup 1.2` is declared in
`SELF_INTERSECTION_XFAIL` as an authored exception at **1,104 pairs / 0.1095 mm**. Owed: a fix.
The issue records two ruled-out mechanisms (cup amplitude — non-monotone, worst with no cup;
`APEX_ARC_ROWS` 6 → 1 — every row worse) and **one hypothesis to test, not adopt**: a tip
thickness taper. Nothing has been built against it since #283.

**#286 "INFILL: the ruled defaults folds …" (open, 2 comments).** Its own checklist:
- [x] "four of the eight" → "five" in §12 of `docs/bloom-apex-nib-outcome.md` — done in #287.
- [x] link from §12 — done in #287.
- [x] the CLAUDE.md frozen-tags ruling edit (added by a comment) — done in #287.
- [~] link #286 from each of the eight `SELF_INTERSECTION_XFAIL` notes — **the four entries
  that remain carry "Tracked as #286"**; the other four rows are no longer declared (below).
  **Those four notes still say** "which owes the same link in doc section 12 … and its own
  four-of-the-eight to five correction, both deferred to the next PR touching that doc" —
  stale, since #287 did both.

**What the eight rows read now** (from the list at `8c1ea07`): still declared — `x petalWidth 8`
(384 / 0.0000), `x petalWidth 30` (1248 / 1.1442), `x footDelicacy 0.25` (832 / 0.4333),
`x petalTipShape 3.00` (1344 / 0.5399), each re-recorded several times by later infill PRs.
**No longer declared** — `INFILL: the ruled defaults` (the issue's headline row;
`docs/bloom-infill-ruled-defaults.md:108` records it reading 0), `x density 40`,
`x tipThinning 0.80`, `x sepals 8`. **The issue's title names a row that no longer folds.**
Still owed: the fix it names and did not take — the infill's conformance bar as a function of
the outline's local turn. Whether the issue should now be closed, narrowed or kept is not
established here.

---

## 3. Branches with no open PR

21 remote branches besides `main` (this session's own branch is not counted).

| branch | head | date | PR | state |
|---|---|---|---|---|
| `claude/awesome-shannon-sa9d7s-backup` | `6f95235` | 09-22 | none | backup of #278's branch (`claude/awesome-shannon-sa9d7s`, merged as `2464d50`); 16 commits not on `main` by ancestry. Whether its content is a subset of #278's squash was not established. |
| `claude/bold-babbage-khfl3g` | `635acfa` | 09-21 | #277 closed unmerged | **FLOWER** "taper + round bead on the solid blade's free rim" — 4 commits of code + docs; genuinely unmerged work. Its last run of `preset-thumbs` is a **failure** (09-21). Why it was closed is not recorded in the repo. |
| `claude/zealous-galileo-th8c9k` | `1e27253` | 09-21 | #260 merged | two commits past the merged head; their content (`scene/koi-rain.js`, `koi-ripples.js`, `verify-scene.mjs`) landed identically via #276 (`ad17bc3`, same file stats; the two scene files diff to 0 lines). Merged-by-content, undeleted. |
| `claude/deploy-preview-snapshot` | `544f2ee` | 09-21 | #230 open | the standing snapshot PR |
| `claude/great-rubin-k566uz` | `6121c89` | 09-14 | #232 closed | a revert of a koi-turn experiment, closed |
| `claude/admiring-goldberg-3hmq0v` | `7a13adc` | 09-10 | none | one docs commit (session 38 root-blend discovery, 276 lines). **0 of its 186 long lines appear on `main`** in `docs/bloom-session-38-outcome.md` or `docs/bloom-foot-to-blade-seam-outcome.md`. Orphaned text; its conclusion shipped by other routes (#210, `docs/bloom-root-blend-superseded.md`). |
| `claude/print-bundle-import-8k4n0a` | `a41173f` | 09-05 | #156 merged | merged-and-undeleted |
| `claude/view-presets-fan-snap-awikrc` | `49ad2c8` | 09-02 | #135 closed | the Sep 2 duplicate-session incident |
| `claude/fan-placement-discovery-0ubyt8` | `026f583` | 09-02 | #130 closed | the Sep 2 duplicate-session incident |
| `claude/flower-bloombase-phase-a-91zmld` | `d449cf3` | 08-31 | #111 open | — |
| `claude/flower-spine-phase-a-91zmld` | `d19a861` | 08-28 | #105 closed | flower |
| `claude/junction-phase2-stem-join` | `977aa88` | 08-28 | none found | flower |
| `claude/lobed-voronoi-diagnosis` | `e23d7cf` | 08-24 | #72 closed | flower |
| `claude/cell-annulus-star-shape` | `738d384` | 08-24 | #75 closed | flower |
| `claude/thermo-nuclear-code-quality-9on5p3` | `f506141` | 08-21 | #41 closed | flower |
| `claude/bodice-placement-curvature-31iz21` | `7e52b6b` | 08-14 | #31 closed | dress |
| `claude/flower-bloom-generator-wvxlwk` | `4655dea` | 08-11 | #16 merged, #19 closed | flower |
| `claude/eva-maskalenko-portfolio-qod1hn` | `9151afe` | 08-07 | none found | portfolio pages |
| `claude/yarn-characterization-section-qgxjk3` | `0941573` | 08-06 | #1 closed | portfolio |
| `checkpoint/pre-stabilization-e0766f7` | `e0766f7` | 08-06 | — | a checkpoint ref |

"none found" means no PR among the 262 the list API returned names that head branch; very old
PRs past that page were not searched. **No bloom branch newer than `main` exists.** The branch
the tracker section of `CLAUDE.md` names (`claude/tracker-ratings-markers`) does not exist — see
§11.

---

## 4. CI

### 4a. In flight at the snapshot

| workflow | run | head | started | note |
|---|---|---|---|---|
| `bloom-connectedness` | 36503526045 | `8c1ea07` (push to `main`) | 2026-09-29 00:31 Z | ≈85 min elapsed at 01:54 Z; its recent runs take 134–204 min |

Every other workflow's latest run on `8c1ea07` had completed **success**:
`bloom-export-watertight` (run 36503526063, 50.6 min wall), `bloom-panel`, `bloom-grid`,
`bloom-frozen-matrices`, `flower-export-watertight`, `flower-geometry-quality`, and the
`bloom-frozen-tags` dispatch. **So `main`'s head is not yet certified by the connectedness gate
at the moment of this snapshot** — its PR head `a00ccbc` (the merge of #300 into the stem-node
branch) passed it in 194.4 min.

### 4b. Runtimes — the five most recent successes of each workflow, read from the API at the time

Wall time is `updated_at − run_started_at` of the WORKFLOW RUN. For the sharded export gate that
is the longest job path, not the sum of runner minutes.

| workflow | five most recent successes (min @ head) |
|---|---|
| `bloom-export-watertight` | 50.6 @ `8c1ea07` · 45.4 @ `a00ccbc` · 52.7 @ `c170500` · 58.3 @ `69ba9e4` · 48.5 @ `0c5c13d` |
| `bloom-connectedness` | 194.4 @ `a00ccbc` · 203.8 @ `c170500` · 200.8 @ `69ba9e4` · 193.2 @ `0c5c13d` · 134.3 @ `edbf410` |
| `bloom-panel` | 5.8 · 6.8 · 6.7 · 6.3 · 6.8 |
| `bloom-grid` | 6.1 · 6.3 · 5.8 · 5.8 · 4.1 |
| `bloom-frozen-matrices` | 0.8 · 1.1 · 0.9 · 1.0 · 1.0 |
| `bloom-frozen-tags` (dispatch) | 0.8 · 0.7 · 0.7 · 0.6 · 0.7 |
| `flower-export-watertight` | 6.0 · 7.0 · 7.2 · 6.2 · 7.8 |
| `flower-geometry-quality` | 1.3 · 1.2 · 1.4 · 1.3 · 1.1 |
| `flower-connectedness` | 9.3 · 9.4 · 8.9 · 9.7 · 7.4 (latest 09-21) |
| `flower-tier-visibility` | 2.6 · 2.5 · 2.7 · 2.4 · 2.5 (latest 09-21) |
| `flower-junction-continuity` | 0.9 · 1.0 · 1.0 · 1.0 · 1.0 (latest 09-21) |
| `preset-thumbs` | 1.2 · 1.0 · 1.1 · 1.1 · 1.1 — **its latest run is a FAILURE** (09-21, on `635acfa`, the closed #277 branch) |
| `registry-sync` | 0.3 · 0.3 · 0.3 · 0.2 · 0.2 (latest 08-31) |
| `textile-gauge-tests` | 1.4 · 0.7 · 0.6 · 0.7 (only four runs; latest 09-03) |
| `static` (Pages) | 0.5 · 0.5 · 9.0 · 10.1 · 0.3 (latest 08-07) |
| `flower-gates`, `flower-base-continuity` | one and two runs ever (08-21, 08-31) |

**Two changes of SHAPE since #258, and they matter more than the numbers.** (i) The export gate
is sharded (#294), so its WALL time fell from 150–220 min to 45–58 min. (ii) **The connectedness
gate is now the long pole at ~193–204 min**, still one un-sharded job under GitHub's default
360-minute limit, which is the situation that forced the export gate's sharding at 342 min. Per
`CLAUDE.md`'s own rule, **size a wait off `actions_list` at the time, never off this table.**

---

## 5. Frozen tags

| | count | which |
|---|---|---|
| declared in `FROZEN_BASE_COMMITS` | **44** | `phase2` … `phase45` (the harness loads, so the key sets of `FROZEN_BASE_COMMITS` and `FROZEN_MATRICES` agree — it throws otherwise) |
| on the remote (`git ls-remote --tags origin 'refs/tags/frozen/*'`) | **38** | every declared phase except the six below |
| absent | **6** | `phase5`, `phase22`, `phase23`, `phase42`, `phase43`, `phase45` |
| declared in `TAG_PUSH_XFAIL` (`tools/publish-frozen-tags.sh:120`) | **6** | exactly the same six |

**The prompt's premise that the refused set is four (`phase5`, `phase22`, `phase23`, `phase45`)
is false: it is SIX.** `phase42` was added by #293 (refused on run 36345899457, GitHub naming
`bloom-export-watertight.yml`), `phase43` was pre-declared by #297 and `phase45` by #301, each
because that PR edits `bloom-export-watertight.yml` after its base commit. **The absent set and
the declared set are identical**, so no registered phase is unpublished-and-undeclared.
`phase44` (`38a4893`) is published.

**The self-test's `REFUSED` constant still agrees with its fixture.** `REFUSED=3`
(`tools/publish-frozen-tags-selftest.sh:78`) counts the refs the FIXTURE's own hook rejects —
`phase5`, `phase22`, `phase23` (the `case` at the hook) — and is deliberately NOT derived from
`TAG_PUSH_XFAIL` (the header says so, `:70-77`). So the fixture refuses three while the script
declares six; in the fixture the other three declared refs publish and are reported as `STALE
EXCEPTION`, which the script prints and does not fail on (`:240-244`, `:288-293`). The latest
`bloom-frozen-tags` dispatch (on `8c1ea07`) concluded success, which includes the self-test.

**Sessions now dispatch `bloom-frozen-tags` themselves after their own merge** (Eva, Sep 24,
recorded in `CLAUDE.md`); the last five dispatches are on `8c1ea07`, `c170500`, `edbf410`,
`800307f` and `03a1042`. **No phase is registered and unpublished beyond the six declared.**

---

## 6. Harness health

| instrument | result on `8c1ea07` |
|---|---|
| `tools/bloom-harness.mjs` import | **loads** in ~1.1 s; 238 exports; 970 live rows; 44 frozen phases; `SELF_INTERSECTION_XFAIL` 233, `EXPORT_REFUSED_XFAIL` 1 |
| `node tools/bloom-smoke.mjs --check` | **exit 0** — 127 smoke rows over 37 blocks of 970; 120 families asserted, 120 claimed, both directions |
| `node tools/bloom-wall-thickness.mjs` | **exit 0**, 7.8 s — V1 calibration · V2 reachability · V3 guard · V4 normal · V5 self-approach all clean; 3 V5 xfails and 2 V4 xfails each still failing at their recorded magnitude (roll-max 0.658, form-max 0.008, buckle-on-form 0.300; V4 0.142 and 0.565) |
| `node tools/bloom-combination-gate.mjs` | **exit 0**, 6 min 8 s on this box — **22 pairs (7 tier-1 · 9 tier-2 · 6 tier-3), 294 cells; 64 cells under the bar, all 64 declared, across 13 pairs**; CG0–CG7 all clean |

Not run here, deliberately: any browser gate, any byte partition, `bloom-xfail-magnitudes`, any
`--negative-control`. So whether all 233 declared census magnitudes still reproduce on
`8c1ea07` is **not confirmed by this document**; the export gate's success on this sha is the
evidence that they do (X1 holds each to its record exactly).

---

## 7. Every declared open item

Grouped by what it blocks. Each item cites where it is declared. "SoP #n" is the item's number in
#258's §7 list; its status there is carried forward in §7h. Item numbers here (A1, B3, …) are
this document's own and are what §10 refers to.

### 7a. A ruling owed by Eva — no session can proceed without it

| # | item | declared at | status |
|---|---|---|---|
| A1 | **Bell/corolla Q1, second half**: a fused corolla (seamless tube with a throat)? The corolla primitive is not scheduled until she says. | `docs/bloom-bell-corolla-discovery.md:565-571` | open. §9 rulings exist; Q1 half-ruled (the hung head IS a bell). |
| A2 | Bell Q3: fusion fraction vs lathe (downstream of A1) | same doc `:630-632` | open |
| A3 | Bell Q4: nodding — orientation-only, or an oblique-root stopgap? | `:634-636` | open |
| A4 | Bell Q5 (§9 numbering): schedule the axis-curvature/droop session. **§8's Q5 is a different question** (the cup fold at 0.7+). | `:638-640`, `:544` | open |
| A5 | Bell Q6: a "hanging" view preset. §9 answers "nothing printed", which does not address the preset. | `:546`, `:642-643` | open, unanswered as asked |
| A6 | Sepals round 1: `sepalScale` 0.60 is the session's pick; the reflexed-seam fold is the seam owner's; two readings of "hub axial extent" | `docs/bloom-sepals-outcome.md:365-388` (SoP #6) | open, doc unchanged since #258 |
| A7 | Sepals round 2: 0.75 is 0.33 mm at the default stem (the lever may be `hubLength`); the limit tightens at the default (21 → 18°); join vs whole-body reading | `docs/bloom-sepals-outcome.md:650-661` (SoP #7) | open |
| A8 | Three floors coexist: `MIN_FEATURE_MM` 1.0, `SHEET_THICKNESS_MM` 1.2, `STEM_MIN_WALL_MM` 1.5 — only a coupon resolves it | `docs/bloom-session-43-outcome.md:77-92`; `CLAUDE.md:2748` (SoP #8) | open |
| A9 | **Nothing has ever been printed.** The coupon now also carries the 0.40 / 0.10 mm apex nib, the first floor deliberately placed below `MIN_FEATURE_MM` | `docs/bloom-charter.md:182-227`; `CLAUDE.md:1743`; `docs/bloom-apex-nib-outcome.md:1357` (SoP #9) | open; scope grew |
| A10 | Hub naming: `hubStyle` option names (GOBLET/ANGLED/CURVED); `hubShapeAmount` beside `hubShape` | `docs/bloom-hub-shape-outcome.md:164-168` (SoP #10) | open, names unchanged |
| A11 | Leaf tip-shape panel: Petal roles as Petal's 4th child, and the children's full names, placed without a ruling | `CLAUDE.md:3538` (SoP #11) | open |
| A12 | Whether lobe crest/notch 2.00/2.00 is the shipped tooth (ruled non-blocking) | `CLAUDE.md:2411-2416`; `docs/bloom-session-41-outcome.md` §5 (SoP #35) | open |
| A13 | Leaf-blade-to-stem approach at `leafAngle` ≥ 70°: accept the top fifth of the range, or bound it? | `docs/bloom-combination-gate.md:580-583` (SoP #20) | open; gated as `single-reaches`, 6 cells declared |
| A14 | The declared combination hazards (`cup × petalTipShape`, `curl × twist`, `cup × roll`, …): accept as a look, or fix? See §7g. | `docs/bloom-combination-gate.md:580-586`; `8a9476b` "NOT DONE, BY INSTRUCTION" (SoP #21) | open; **no doc records a ruling on any of them** |
| A15 | `leafangle-x-tooth`: CG1 refuses its second axis; ships with the inertness declared; 6 of its 12 cells duplicate `leafangle-x-stem`. Worth 12 builds a run? | `docs/bloom-combination-gate.md:573-576`; `docs/bloom-charter.md` (#265 entry) | open |
| A16 | `LADDER_MAX_GAP_FACTOR = 1.4` is typed; its stated reason is false; it caps the lobe count; session 39 ruling 2 proposes removing the arm. **It now does a fourth job**: #289's A8 ceiling reads it for ramped petals. | `docs/bloom-session-39-outcome.md` §1; `docs/bloom-apex-shading-and-ramp-outcome.md:342-374` (SoP #33) | open; more entangled |
| A17 | **Stem nodes: the wall measured square to a leaning axis is 1.5·cos(lean)** — 3 µm under at 0.48, 12.5 µm at 1.00; closing it is `1/cos(lean)` on the bore | `docs/bloom-stem-nodes-outcome.md:297-338`; `docs/bloom-charter.md:6338-6340` | open (new, #301) |
| A18 | Stem nodes: four/five decisions made without a ruling (nodes are the leaves' nodes; inert under a raceme; kink away from the first leaf; mode-free pitch floor; the placer) | `docs/bloom-stem-nodes-outcome.md:99-127`; charter `:6335-6337` | open (new) |
| A19 | Stem taper: which law reads as a stem; does `stemDiameter` stay the diameter at the hub; which ratio (1.3 / 1.6 / 2.0) | `docs/bloom-stem-taper-laws.md:242-246`; `docs/bloom-stem-form-discovery.md:339-345` | open; #299 later recommends taper "afterwards, if at all" |
| A20 | Stem form "later": do floret nodes swell the rachis; does a future section apply the bore rule to the inscribed radius; does taper reach pedicels | `docs/bloom-stem-form-discovery.md:209, 346-348` | open |
| A21 | Infill basal V (`INFILL_CONVERGE`) and base cell size (`INFILL_BASE_NARROW`) — still constants; a fifth control would be Eva's | `docs/bloom-infill-basal-grading.md:307-318`; `docs/bloom-infill-port-plan.md:455-469`; `docs/bloom-infill-s4-outcome.md:277-282` | open |
| A22 | Infill bead segments K > 4 — a budget ruling (K = 6 refuses two shipped rows) | `docs/bloom-infill-roundness-and-bevel.md:234` | standing: K stays 4 |
| A23 | E6: whether two float32-degenerate LIVE triangles are worth a rim-loop change carrying a watertightness risk | `tools/verify-bloom-edge-profile.mjs:670-678` (`E6_XFAIL`) | open, "Eva's call" |
| A24 | Apex ramp: 2.50 is Eva's authored override of the derived 2.00–2.05 crossing | `CLAUDE.md` apex-facet block | ruled; disagreement recorded only |
| A25 | The centre ships empty; moving the default to a present centre "waits on Eva's ruling" | `CLAUDE.md:867-868` | open |
| A26 | The DESCENDING seam fold (tilt < 0; sepal angle < −55°) — "the seam owner's, unscheduled" | `docs/bloom-tilt-range-shipped.md:371`; `docs/bloom-bell-corolla-discovery.md:600-613`; `docs/bloom-sepals-outcome.md` §8 (SoP #19) | open, unscheduled |
| A27 | Beach scene: peel-direction bias; `TONE.deep` 0.70 vs 0.62; a ramped face depth; the 17.6 s swash latency — "the four things that are Eva's" | `docs/beach-wave-object.md:224-294` | open |
| A28 | `/scene`: `noindex`, a nav link, the lightning placeholder | `CLAUDE.md:8731-8735` | open |
| A29 | `/plot`: per-petal defaults ("NOT A RULING"); multi-bloom decisions made without a ruling; anchor drag plane and placement | `CLAUDE.md:7141, 7747, 7936` | open |
| A30 | `/plot`: the droop direction is a fixed axis | `CLAUDE.md:6596` | open |
| A31 | `/print`: fan defaults merged off, "NOT tuned by Eva" | `CLAUDE.md:6181` | open |
| A32 | Flower petal-origin surface: eight questions | `docs/flower-petal-origin-surface.md:377-428` | open (flower); draft #111 predates it |

### 7b. Ruled but not built — authorised work with no code

| # | item | declared at | status |
|---|---|---|---|
| B1 | Inflorescence beyond session 1: per-node deltas ("the natural next session"), presets, umbel/spike/corymb/botryoid, cymes, compound depth 2–3, florets in the grid `.glb` | `docs/bloom-inflorescence-discovery.md:681-762`; `docs/bloom-inflorescence-outcome.md:391-399` (SoP #1) | partial — #272 only |
| B2 | Organic variance builds 2 (form) and 3 (spacing); sepal variance after build 3 | `docs/bloom-organic-variance-discovery.md:310-331`; `docs/bloom-organic-variance-size-outcome.md:277-293` (SoP #2) | partial — #273 only; no code for 2 or 3 |
| B3 | Droop / axis-curvature session (inflorescence ruling 8): a stem centreline and a curved root. #301's node kink is a per-node lean, not this. | `docs/bloom-inflorescence-discovery.md` ruling 8; `docs/bloom-bell-corolla-discovery.md:461-480` (every straight-axis site enumerated) (SoP #3) | open |
| B4 | Bud pose / maturation ramp (ruling 6, deferred to the bell session) | `docs/bloom-inflorescence-discovery.md:706-710` (SoP #4) | open |
| B5 | Leaf apex nib: a leaf still ends on a 1.60 mm flat (21.3% of a leaf at tip shape 0.60) | `docs/bloom-apex-nib-outcome.md:1363-1432` §11 | open, "scheduled, not taken" |
| B6 | Bead-radius clamp at tight curvature ("deferred to its own session") | `docs/bloom-edge-profile-outcome.md:669-677` | open |
| B7 | Arc stability's "noisy band" second PR — span-0 knife edges on the arc path at 1e-6..1e-3 | `docs/bloom-arc-stability-outcome.md:121, 415, 425-430` | open |
| B8 | Ladder search residual: interpolation + X0 re-derived as an ULP bound — "a whole-matrix partition and its own session" | `docs/bloom-session-42-outcome.md:356-366` (SoP #16) | open |
| B9 | Charter scheduled fix: a value map so `frozen/phase19`/`phase20` can be byte-re-exported | `docs/bloom-charter.md:231-251` | open |
| B10 | V4 refinement pair for `buckle A=0.30 f=3 p=6` (0.142 mm) | `tools/bloom-wall-thickness.mjs:468` | open (declared V4 xfail) |
| B11 | `/plot` line-splitting at infill holes (the `.glb` carries the mask; `plot*.js` does not read it) | `docs/bloom-infill-builder.md:141, 191` | open; blocked on `verify-plot.mjs` not being in CI (51+ mutants) |
| B12 | Infill on a lobed blade (non-convex tessellation); refused today with the word `outline` | `docs/bloom-infill-builder.md:604-607` | open |
| B13 | Metric-sized Voronoi cells (cell size still flat) | `docs/bloom-infill-metric-plan.md:250-255`; `docs/bloom-infill-builder.md:608-611` | open |
| B14 | Parked `infillBase`: unhide if the basal V makes the base fillable | `docs/bloom-infill-ruled-defaults.md:50-72` | parked |
| B15 | Infill per-cell wall taper; per-petal seed ownership | `docs/bloom-infill-voronoi-salvage.md:223-227` | open |
| B16 | Infill `baseReach` / `tipGamma` never swept | `docs/bloom-infill-basal-grading.md:324-329` | open |
| B17 | B2b: crowding-raster extensions, anther-against-blade, independent stamen splay | `docs/bloom-session-21-outcome.md:364-381` (SoP #30) | parked |
| B18 | Blade-to-blade crowding instrument above the root | `CLAUDE.md:626` (SoP #31) | recorded, not built |
| B19 | Terminal width as a separate shape family | `CLAUDE.md:1256-1257` | open |
| B20 | The FORM ONSET tangent break at u 0.30 (a partition event if smoothed) | `CLAUDE.md:2115-2121` | recorded, not ruled |
| B21 | `/plot`: twist warp; UI overhaul ("most pressing"); the global tail (per-bloom buffers, composed extent); slider `input` onto the drag tail; lock / background shapes / cut-and-pull | `CLAUDE.md:8096-8131, 7644, 7735, 7860-7865, 8016` | open |
| B22 | `/print`: rename `assets/print-test/`; interleave-safe extractor; AET sweep; re-shoot hatch/flow on the real leaf; multi-part bundles; per-petal fans | `CLAUDE.md:5373, 5617-5619, 5752, 5963, 6133, 6210` (SoP #40) | open |
| B23 | Beach marks register (weight and length) handed forward to the sand-marking session | `docs/beach-drawing-layer.md:579-600` | not built by design |
| B24 | Combination gate: a sepal measure (`measureWall` reads `m.petal.grid`) | `docs/bloom-combination-gate.md:577-579` | open |
| B25 | Combination gate for inflorescence / variance: a new MEASURE and a new BAR (not `MIN_FEATURE_MM`) | `docs/bloom-inflorescence-outcome.md:400-431`; `docs/bloom-organic-variance-size-outcome.md:295-305` | open |
| B26 | Stem-node triangle cost avoidable at a named price (16 sectors, or 49 fixed stations) | `docs/bloom-stem-nodes-outcome.md:368-376` | trade recorded, not taken |
| B27 | Infill S6 ("the sheet and the remaining rulings") | `docs/bloom-infill-port-plan.md:440` | no DONE marker; see §1c |

### 7c. Known defects and limits, recorded and not fixed

| # | item | declared at | status |
|---|---|---|---|
| C1 | **#285** `LOBES: x cup 1.2` — 1,104 pairs / 0.1095 mm; the nib arc's along-u radius, which no cross-section clamp reaches | `CLAUDE.md:1720-1733`; `docs/bloom-apex-nib-outcome.md:1275`; `SELF_INTERSECTION_XFAIL` | open (§2a) |
| C2 | **#286** nib × infill folds in the root blend (`toLaw` moves the basal outline 0.0135 mm) | `docs/bloom-apex-nib-outcome.md:1440-1500`; four harness entries | partial — 4 of 8 rows still declared; the headline row reads 0 (§2a) |
| C3 | I1: the builder's bar estimator disagrees with the on-object width — ALL FORM MAX keeps a sub-bar hole (declared in `I1_XFAIL`) | `docs/bloom-infill-ruled-defaults.md:74-102`; `tools/verify-bloom-infill.mjs:393` | open; "the estimator is the fix" |
| C4 | `rimProfile`'s closed-form normal omits the along-sweep term at the petal ENDS — 1,872 triangles > 60° off their face in print preview; plain petal, pre-existing | `CLAUDE.md:4970-4971`; `docs/bloom-infill-margin-bead.md:237` | open |
| C5 | Margin clip in plan space: on a curved plan the band edge is approximate | `docs/bloom-infill-margin-bead.md:234-236` | accepted |
| C6 | Infill stretch reshuffles mid-drag (8 of 100 steps), told not fixed | `docs/bloom-infill-s4-outcome.md:283-284` | accepted |
| C7 | **#231** — the export refusal costs a full build (120 s on ALL MAX) | issue #231 | open |
| C8 | ALL MAX times out `settleBuild`'s 30 s on a slow box, both trees — CI only | `CLAUDE.md:1654`; `docs/bloom-infill-builder.md:619-621` | environment |
| C9 | The sphere-stem root band's `headInsideBore` is mode-dependent on 2,400 states; remedy is a union over both modes | `bloom-geometry.js:12523`; `docs/bloom-stem-tip-plug-outcome.md` (SoP #39) | open |
| C10 | A7 degrades silently: `Math.min(ld.held, blade.length)` | `tools/bloom-harness.mjs:2772`; `docs/bloom-infill-base-boundary.md:301-304` (SoP #17) | open, line present |
| C11 | `measureCurvature`'s `uMin = 0.15` starts inside the basal zone; the function has no caller | `tools/bloom-wall-thickness.mjs:317` (SoP #18) | open |
| C12 | `bloom-infill-base-panel.mjs` types its own `FOOT_ROWS = 3` | `tools/bloom-infill-base-panel.mjs:86` (SoP #24) | open |
| C13 | `INFILL_DEGENERATE_AREA_MM2` deliberately duplicates the harness's bar | `docs/bloom-infill-builder.md:612-615` | declared duplication |
| C14 | Model B limits: 1 lobe at coverage 0.10; an even count spends its apex notch on the print floor | `docs/bloom-session-42-outcome.md` (SoP #34) | declared limit |
| C15 | Lamina floor not optimal on a thin-footed petal (4.9 points) | `docs/bloom-infill-lamina-floor.md:482-484` | reported |
| C16 | A frozen row whose label is now false (`STEM: GATED — SPHERE…` in phase28/29) — cannot be fixed | `CLAUDE.md` sphere-stem block (SoP #38) | permanent |
| C17 | A scene-3 check went red once and has not reproduced | `docs/beach-drawing-layer.md:642-667` | recorded |
| C18 | Tracker: the unavatar.io photo mystery; the bulk files not yet pasted into the real tracker | `CLAUDE.md:9278-9319` | open |
| C19 | **New here:** `bloom-export-watertight.yml`'s `paths` filter omits six tools the gate executes via imports (`bloom-crowding`, `bloom-first-slot`, `bloom-infill-wall`, `bloom-plan-coverage`, `bloom-rim-roundness-lib`, `bloom-solid-angle-coverage`); an edit to one of them alone runs no bloom gate (it does run the two FLOWER gates via `'tools/**'`). `bloom-connectedness.yml` likewise omits `bloom-crowding` and `bloom-first-slot`. | the workflow files | recorded, not fixed |
| C20 | **New here:** `bloom-connectedness` runs the whole 970-row matrix in one job with no `timeout-minutes` (GitHub default 360); its recent successes take 193–204 min. The export gate was sharded (#294) after reaching 342 of 360 min. | `.github/workflows/bloom-connectedness.yml`; §4b | recorded |
| C21 | **New here:** `SELF_INTERSECTION_XFAIL['ALL MAX']`'s own note still describes the row as refused at "2,059,816 triangles" and ends at "195996 → 107485 pairs", while its numbers are 91,808 and `EXPORT_REFUSED_XFAIL` holds 3,090,816. The NUMBERS are right (measured here — §11 item 1); the note is stale. | `tools/bloom-harness.mjs:8240` | recorded |

### 7d. Instrument gaps — "no mutant names X", "recorded as a gap"

| # | gap | declared at | status |
|---|---|---|---|
| D1 | No committed mutant names **X0** | `CLAUDE.md:471` | open |
| D2 | No mutant names **C2a** | `CLAUDE.md:3760` | open |
| D3 | No apex-table mutant names an **I** clause (the family's own must-fails carry it) | `docs/bloom-infill-builder.md:616-618` | open |
| D4 | No apex-table mutant names an **MB** clause | `docs/bloom-infill-margin-bead.md:238-239` | open |
| D5 | **#237** ST9 outside the mutant table — a Node witness exists (`verify-bloom-stem-channel.mjs`) | issue #237 | issue open; witness built |
| D6 | Root-band EXTENT asserted by nothing (too long is invisible) | `docs/bloom-sphere-stem-outcome.md` §8 (SoP #37) | open |
| D7 | Whole-mesh directed-edge census | `CLAUDE.md:3172` (SoP #22) | recorded, not built |
| D8 | Duplicate-expression gate | `CLAUDE.md:4333-4334` (SoP #23) | recorded, not built |
| D9 | Nothing asserts the stem channel region is the FREE stem (declared blindness) | `CLAUDE.md` sphere-stem block | declared |
| D10 | The three `APEX_*` constants are imported, so AN1/AN2 cannot see a constant mutation (declared blindness) | `CLAUDE.md` apex-nib block | declared |
| D11 | `/plot`, `/print`, `/scene`, `/cards` and tracker gates are not in CI | `CLAUDE.md:5598, 7649, 8720` | open |
| D12 | #79: no gate asserts the expected workflows produced a run for the head SHA | issue #79 | open |
| D13 | **New here:** the frozen-tags self-test's fixture refuses 3 refs while `TAG_PUSH_XFAIL` declares 6, so no self-test case exercises how the three newer entries (`phase42/43/45`) are handled; in the fixture they publish and are printed as STALE, which does not fail. By design `REFUSED` is independent of the table; the coverage gap is a consequence. | `tools/publish-frozen-tags-selftest.sh:78, 100-104` | recorded |
| D14 | Several bloom gates with must-fails run in NO workflow: `verify-bloom-edge-profile` (E0–E6), `verify-bloom-infill-conform` (C), `verify-bloom-infill-metric` (M), `verify-bloom-rim-arc`, `verify-bloom-surface-offstation`, the two `-decoupled` tools, and `verify-bloom-apex-mutants` itself (read as data only) | §9 | recorded |

### 7e. xfail lists and whether each entry carries a magnitude the gate reads

| list | file | entries | magnitude? | both directions? |
|---|---|---|---|---|
| `SELF_INTERSECTION_XFAIL` | `tools/bloom-harness.mjs:8160` | **233** | yes `{pairs, worstMm}`; the module refuses to load otherwise | yes (X1) — **except `ALL MAX`**, which is export-refused so X1 never reads it; only `bloom-xfail-magnitudes --include-refused` does |
| `EXPORT_REFUSED_XFAIL` | `tools/bloom-harness.mjs:8095` | 1 (`ALL MAX`, 3,090,816 tris) | yes | yes (XR1/XR2) |
| `SELF_XFAIL` + V4 markers | `tools/bloom-wall-thickness.mjs:406, 468, 497` | 3 + 2 | yes | yes (±5e-4 mm) |
| `COMBINATION_XFAIL` | `tools/bloom-combination-gate.mjs:548` | **64 over 13 pairs** | yes | yes (CG2/CG3) |
| `COMBINATION_INERT` | same `:783` | 3 (`density-x-cup`, `density-x-curl`, `leafangle-x-tooth`) | yes (`maxMoveMm: 0`) | yes (CG7) |
| `I1_XFAIL` | `tools/verify-bloom-infill.mjs:393` | 1 | yes | yes |
| `E2_TURN_XFAIL` | `tools/verify-bloom-edge-profile.mjs:145` | 5 | yes | yes — **but this gate is not in CI** |
| `E6_XFAIL` | same `:679` | 1 | yes | yes — not in CI |
| `H1_XFAIL` | `tools/verify-bloom-hole-rim.mjs:109` | 4 | yes (±0.01°) | yes |
| `MB1_XFAIL` | `tools/verify-bloom-infill-margin.mjs:111` | 5 | yes | yes |
| `TRI_COUNT_XFAIL_BY_CHANGE` | `tools/verify-bloom-seam-bytes.mjs:237` | seam 1, widest 3, arc 0, tilt 0 | yes | yes |
| **`TAG_PUSH_XFAIL`** | `tools/publish-frozen-tags.sh:120` | **6** | **no** — a credential refusal with a reason string | reported (not failed) if one starts publishing |
| **flower connectedness `xfail: 106`** | `tools/verify-connectedness.mjs:227-234` | **5 rows** (#258 said 6; the sixth grep hit is a comment) | **no** — an issue number only | XPASS fails hard |
| **`XFAIL_LAW_MISSING_ISSUE`** | `tools/verify-junction-continuity.mjs:104` | 1 (#106) | **no** — an issue number only | XPASS fails hard |

**Declared without a magnitude bar:** `TAG_PUSH_XFAIL` (6), the 5 flower `xfail: 106` rows and
`XFAIL_LAW_MISSING_ISSUE` (1). Every bloom GEOMETRY list carries a number read in both
directions, with the one exception of the export-refused `ALL MAX` census entry, which no CI gate
reads.

### 7f. Open GitHub issues (32) and PRs (2)

- **Bloom (5):** #286, #285, #237, #231, #221 (resolved in code — §11 item 5).
- **Flower (27)**, including #106 and #108, which `CLAUDE.md` says are FLOWER issues "whatever a
  kickoff prompt says" (their titles say "Bloom centre", meaning the flower's bloom): #108, #106,
  #100, #98, #97, #96, #94, #93, #92, #90, #89, #88, #87, #83, #73, #70, #68, #66, #63, #62, #61,
  #60, #55, #54, #52, #43; and **process: #79**. **#43** asks for the connected-component gate
  that `tools/verify-connectedness.mjs` now is; it is still open.
- **Closed since #258:** #236 (now closed, resolving #258's §7e #41).
- **PRs:** #230 and #111, both drafts (§2).

### 7g. The combination-gate hazards #265 named, and where each stands now

#265's message lists "FOUR MEASUREMENTS THE EXPANSION MADE THAT NOTHING HAD" plus the "NOT DONE,
BY INSTRUCTION" items. Status at `8c1ea07` (the gate was RUN here — §6):

| # | hazard as #265 recorded it | now | fixed or ruled? |
|---|---|---|---|
| 1 | `petalSpineCurl × petalTwist` reaches **0.012 mm** with both singles clear | still `product-only`, 6 declared cells; **re-recorded by the apex nib (#283)** — the cells #265 quoted now read 0.053 and 0.007 | neither fixed nor ruled |
| 2 | `petalCup × petalRoll` is the widest failing region, 11 cells down to 0.010 | still 11 declared, `single-reaches`; re-recorded by the nib (e.g. 0.034 → 0.002) | neither |
| 3 | The measure depends on the SUM of cup and cup gradient (8 declared cells) | **cleared** by #283's fold clamp — all eight cells read an identical 1.0967; the pair is now `clears` with 0 cells. The sum rule is no longer visible in the gate. | fixed as a side effect; not ruled |
| 4 | Two pairs NOT monotone in their second control (`buckle-x-tipshape`, `curl-x-twist`) | `buckle-x-tipshape`: cleared by the nib, then **re-opened by #289's row ramp** with 3 new cells (`product-only`); `curl-x-twist` now reads monotone | changed by other work; not ruled |
| — | "NOT DONE BY INSTRUCTION": `cup × petalTipShape` | 5 cells remain after #289 (worst 0.743) | not ruled |
| — | the leaf-against-stem approach | `leafangle-x-stem` 6 cells, unchanged | not ruled (A13) |
| — | the `leafToothDepth` inert pair's 12 builds | unchanged (A15) | not ruled |

Net: **78 declared cells over 16 pairs (#265) → 64 over 13 pairs (now), in a gate grown from 20
to 22 pairs** (#290 added `density-x-cup` and `density-x-curl`, both `clears`). The #283 clamp
also created one new hazard (`cup-x-width` at cup 1.2 × width 23) and cleared
`cup-x-apexsweep` and `cup-x-length`.

### 7h. #258's 44 items, carried forward

| SoP # | now | SoP # | now |
|---|---|---|---|
| 1 inflorescence | partial (B1) | 23 duplicate-expression gate | open (D8) |
| 2 variance | partial (B2) | 24 `FOOT_ROWS = 3` | open (C12) |
| 3 droop | open (B3) | 25 N fixed at 16 | superseded (density is a control) |
| 4 bud pose | open (B4) | 26 infill blocked by the emitter | **done** (#281) |
| 5 bell/corolla | changed: §9 rulings exist; Q2 shipped as tilt 0..120 (#261); Q1 half-ruled; Q3–Q6 open (A1–A5) | 27 no infill in the generator | **done** (#284 … #300) |
| 6, 7 sepals | open (A6, A7) | 28 three unpublishable tags | changed: **six** now (§5) |
| 8 three floors | open (A8) | 29 #231 | open (C7) |
| 9 never printed | open, grew (A9) | 30 B2b | parked (B17) |
| 10 hub naming | open (A10) | 31 blade-to-blade crowding | open (B18) |
| 11 leaf panel placement | open (A11) | 32 lobe apex join | superseded (sessions 41–42) |
| 12 root blend ≥ 3 layers | **superseded** — fixed by #210, record corrected by #267 | 33 `LADDER_MAX_GAP_FACTOR` | open, more entangled (A16) |
| 13 wall instrument lacks infill | **done** (S3 material mask) | 34 Model B limits | open (C14) |
| 14 hole rims unsampled | **done** (H family, S5) | 35 lobe tooth 2.00/2.00 | open (A12) |
| 15 `splitRow` fixed 0.30 | superseded (derived lamina floor) | 36 no mutant names L5 | **done in code**; #221 still open |
| 16 ladder residual | open (B8) | 37 band extent | open (D6) |
| 17 A7 `Math.min` | open (C10) | 38 false frozen label | permanent (C16) |
| 18 `measureCurvature` window | open (C11) | 39 band mode-dependence | open (C9) |
| 19 descending seam fold | open (A26) | 40 `assets/print-test/` | open (B22) |
| 20 leaf-stem approach | open (A13) | 41 #236 open vs "closed" | **resolved** — #236 closed |
| 21 `cup × tipShape` | open (A14, §7g) | 42 `CLAUDE.md` "318-row" | still stale (§11) |
| 22 directed-edge census | open (D7) | 43 smoke figure | still stale (§11) |
| | | 44 merges without a byte claim | re-audited for this window (§1b) |

---

## 8. What actually ships — every control the panel exposes today

Read by importing `bloom-registry.js` at `8c1ea07` — `CONTROLS` (which already contains the
generated rows: both tip families, the sepal twins and the per-petal role overrides),
`SECTIONS`, `DEFAULTS`, `RETIRED_IDS`. **164 controls in 38 sections; 154 sliders and 10
choices** (there is no checkbox kind — `fanCenterPetal` is an OFF/ON choice); every control's
tier is `standard`; `DEFAULTS` has exactly 164 keys, each equal to its control's `default`; 32
controls are visible at DEFAULTS.

### 8a. The section tree, in declaration order

```
arrangement (10) › variance (3)
petal (0) › shape (6) › lobes (5), fringe (2)
          › form (8) · curl (5)
          › roles (4) › labellumGroup "Petal 1" (4) · hoodGroup (derived label, "Petal 5" at DEFAULTS) (3)
                      · petal1 … petal9 (4 each)
          › infill (7)
head (2)
center (0) › androecium (5) › antherTip "Anther" (7)
           › gynoecium (3) › stigmaTip "Stigma" (7)
sepals (5) › sepalShape (3) · sepalForm (8) · sepalCurl (5)
stem (3) › hub (3) · leaves (6) › leafSerration "Serration" (4)
inflorescence (5) › floret (2)
thickness "Part thickness" (3)
```

`labellumGroup` and `hoodGroup` carry a `hiddenReason`. The Inflorescence section is invisible
at DEFAULTS (its Type choice needs a stem).

### 8b. Changes since #258's snapshot (146 controls, 34 sections)

**18 added, 0 removed, 1 changed; 4 sections added (`variance`, `infill`, `inflorescence`,
`floret`); retired ids unchanged at 12.**
- **Added:** `petalInfill`, `infillDensity`, `infillRelax`, `infillLaw`, `infillAniso`,
  `infillRound`, `infillBase` (Petal › Infill); `varianceSize`, `varianceFrequency`,
  `variancePhase` (Arrangement › Variance); `stemNodeProminence` (Stem); `inflorescence`,
  `floretNodes`, `floretPhyllotaxy`, `pedicelLength`, `pedicelAngle` (Inflorescence);
  `floretPetals`, `floretScale` (Inflorescence › Floret).
- **Changed:** `petalTilt` range 0–75 → **0–120** (#261). The per-petal and role TILT deltas stay
  −75..75.
- `infillBase` exists with default 0 and is **hidden at every state** (`{ all: [infillPresent,
  { any: [] }] }`) — parked, not retired.

### 8c. The 164 controls

Ranges are the control's own `min – max (step)`; the default is `DEFAULTS[id]`.

| section | id | kind | range / options | default |
|---|---|---|---|---|
| Arrangement | `petalCount` | slider | 3 – 40 (step 1) | 8 |
| Arrangement | `spread` | slider | 0.6 – 6 (step 0.05) | 2 |
| Arrangement | `placement` | choice | RADIAL / SPIRAL / CONTINUOUS / FAN | RADIAL |
| Arrangement | `fanPerSide` | slider | 1 – 8 (step 1) | 3 |
| Arrangement | `fanSpacing` | slider | 15 – 170 (step 1) | 45 |
| Arrangement | `fanCenterPetal` | choice | OFF / ON | ON |
| Arrangement | `layerCount` | slider | 1 – 6 (step 1) | 1 |
| Arrangement | `layerSize` | slider | 0.35 – 0.9 (step 0.01) | 0.72 |
| Arrangement | `layerPhase` | slider | 0 – 1 (step 0.01) | 0.5 |
| Arrangement | `layerTilt` | slider | 0 – 30 (step 1) | 12 |
| Arrangement › Variance | `varianceSize` | slider | 0 – 0.5 (step 0.01) | 0 |
| Arrangement › Variance | `varianceFrequency` | slider | 0 – 20 (step 1) | 1 |
| Arrangement › Variance | `variancePhase` | slider | 0 – 360 (step 5) | 0 |
| Petal › Petal shape | `petalLength` | slider | 20 – 60 (step 1) | 35 |
| Petal › Petal shape | `petalWidth` | slider | 8 – 30 (step 1) | 16 |
| Petal › Petal shape | `petalBaseTaper` | slider | 0.3 – 3 (step 0.05) | 1 |
| Petal › Petal shape | `petalTipShape` | slider | 0.6 – 3 (step 0.05) | 1.7 |
| Petal › Petal shape | `petalTipTaper` | slider | 0.6 – 4 (step 0.05) | 1.8 |
| Petal › Petal shape | `petalTipEnd` | slider | 0 – 1 (step 0.05) | 0 |
| Petal › Petal shape › Lobes | `lobeDepth` | slider | 0 – 1 (step 0.01) | 0 |
| Petal › Petal shape › Lobes | `lobeCount` | slider | 1 – 10 (step 1) | 6 |
| Petal › Petal shape › Lobes | `lobeCoverage` | slider | 0.1 – 1 (step 0.05) | 0.8 |
| Petal › Petal shape › Lobes | `lobeCrestShape` | slider | 0.6 – 3 (step 0.05) | 2 |
| Petal › Petal shape › Lobes | `lobeNotchShape` | slider | 0.6 – 3 (step 0.05) | 2 |
| Petal › Petal shape › Fringe | `fringeCount` | slider | 0 – 10 (step 1) | 0 |
| Petal › Petal shape › Fringe | `fringeDepth` | slider | 0.05 – 0.5 (step 0.01) | 0.2 |
| Petal › Petal form | `petalCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal form | `petalCupGradient` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal form | `buckleAmp` | slider | 0 – 0.6 (step 0.01) | 0 |
| Petal › Petal form | `buckleFreq` | slider | 1 – 7 (step 1) | 3 |
| Petal › Petal form | `buckleEnv` | slider | 2 – 6 (step 0.1) | 3 |
| Petal › Petal form | `petalApexSweep` | slider | 0 – 1 (step 0.05) | 0 |
| Petal › Petal form | `petalRoll` | slider | -330 – 330 (step 5) | 0 |
| Petal › Petal form | `petalRollTaper` | slider | -1 – 1 (step 0.01) | 0 |
| Petal › Petal curl | `petalTilt` | slider | 0 – 120 (step 1) | 25 |
| Petal › Petal curl | `petalSpineCurl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal curl | `curlBias` | slider | 0 – 1 (step 0.01) | 0 |
| Petal › Petal curl | `curlStart` | slider | 0 – 0.95 (step 0.01) | 0 |
| Petal › Petal curl | `petalTwist` | slider | -180 – 180 (step 5) | 0 |
| Petal › Petal roles | `allCurl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles | `allCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles | `innerCurl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles | `innerCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 1 | `labellumSize` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 1 | `labellumTilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 1 | `labellumCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 1 | `labellumCurl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › (hoodGroup, derived label) | `hoodSize` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › (hoodGroup, derived label) | `hoodTilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › (hoodGroup, derived label) | `hoodCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 1 | `petal1Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 1 | `petal1Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 1 | `petal1Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 1 | `petal1Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 2 | `petal2Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 2 | `petal2Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 2 | `petal2Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 2 | `petal2Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 3 | `petal3Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 3 | `petal3Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 3 | `petal3Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 3 | `petal3Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 4 | `petal4Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 4 | `petal4Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 4 | `petal4Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 4 | `petal4Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 5 | `petal5Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 5 | `petal5Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 5 | `petal5Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 5 | `petal5Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 6 | `petal6Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 6 | `petal6Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 6 | `petal6Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 6 | `petal6Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 7 | `petal7Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 7 | `petal7Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 7 | `petal7Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 7 | `petal7Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 8 | `petal8Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 8 | `petal8Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 8 | `petal8Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 8 | `petal8Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Petal roles › Petal 9 | `petal9Size` | slider | 0.5 – 2 (step 0.05) | 1 |
| Petal › Petal roles › Petal 9 | `petal9Tilt` | slider | -75 – 75 (step 1) | 0 |
| Petal › Petal roles › Petal 9 | `petal9Cup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Petal › Petal roles › Petal 9 | `petal9Curl` | slider | -180 – 360 (step 5) | 0 |
| Petal › Infill | `petalInfill` | choice | NONE / VORONOI | NONE |
| Petal › Infill | `infillDensity` | slider | 8 – 40 (step 1) | 20 |
| Petal › Infill | `infillRelax` | slider | 0 – 12 (step 1) | 5 |
| Petal › Infill | `infillLaw` | slider | 0 – 2 (step 0.05) | 0.3 |
| Petal › Infill | `infillAniso` | slider | 1 – 3 (step 0.05) | 1.65 |
| Petal › Infill | `infillRound` | slider | 0 – 1 (step 0.05) | 0.6 |
| Petal › Infill | `infillBase` | slider | 0 – 1 (step 0.05) | 0 |
| Head | `hubShape` | choice | CAP / SPHERE | CAP |
| Head | `headRise` | slider | 0 – 1 (step 0.01) | 0 |
| Center › Androecium | `stamenCount` | slider | 0 – 120 (step 1) | 0 |
| Center › Androecium | `stamenLayout` | choice | RING / DISC | RING |
| Center › Androecium | `stamenSpread` | slider | 0.6 – 6 (step 0.05) | 2 |
| Center › Androecium | `stamenLength` | slider | 5 – 40 (step 1) | 20 |
| Center › Androecium | `stamenCurl` | slider | -180 – 180 (step 5) | 0 |
| Center › Androecium › Anther | `antherSize` | slider | 0.6 – 6 (step 0.05) | 1.6 |
| Center › Androecium › Anther | `antherElongation` | slider | 1 – 6 (step 0.05) | 2.5 |
| Center › Androecium › Anther | `antherRoundedness` | slider | 0 – 1 (step 0.05) | 1 |
| Center › Androecium › Anther | `antherPoints` | slider | 2 – 12 (step 1) | 4 |
| Center › Androecium › Anther | `antherPinch` | slider | 0.05 – 7 (step 0.05) | 1 |
| Center › Androecium › Anther | `antherLumps` | slider | 1 – 6 (step 1) | 1 |
| Center › Androecium › Anther | `antherSpread` | slider | 0 – 90 (step 5) | 0 |
| Center › Gynoecium | `gynoecium` | choice | NONE / STYLE | NONE |
| Center › Gynoecium | `styleLength` | slider | 5 – 40 (step 1) | 25 |
| Center › Gynoecium | `styleCurl` | slider | -180 – 180 (step 5) | 0 |
| Center › Gynoecium › Stigma | `stigmaSize` | slider | 0.6 – 6 (step 0.05) | 1.6 |
| Center › Gynoecium › Stigma | `stigmaElongation` | slider | 1 – 6 (step 0.05) | 2.5 |
| Center › Gynoecium › Stigma | `stigmaRoundedness` | slider | 0 – 1 (step 0.05) | 1 |
| Center › Gynoecium › Stigma | `stigmaPoints` | slider | 2 – 12 (step 1) | 4 |
| Center › Gynoecium › Stigma | `stigmaPinch` | slider | 0.05 – 7 (step 0.05) | 1 |
| Center › Gynoecium › Stigma | `stigmaLumps` | slider | 1 – 6 (step 1) | 3 |
| Center › Gynoecium › Stigma | `stigmaSpread` | slider | 0 – 90 (step 5) | 40 |
| Sepals | `sepalCount` | slider | 0 – 40 (step 1) | 0 |
| Sepals | `sepalScale` | slider | 0.2 – 1 (step 0.05) | 0.6 |
| Sepals | `sepalHeight` | slider | 0 – 1 (step 0.05) | 0.75 |
| Sepals | `sepalPhase` | slider | 0 – 1 (step 0.01) | 0.5 |
| Sepals | `sepalFootBreadth` | slider | 0.25 – 1.5 (step 0.05) | 1 |
| Sepals › Sepal shape | `sepalBaseTaper` | slider | 0.3 – 3 (step 0.05) | 1 |
| Sepals › Sepal shape | `sepalTipShape` | slider | 0.6 – 3 (step 0.05) | 1.7 |
| Sepals › Sepal shape | `sepalTipTaper` | slider | 0.6 – 4 (step 0.05) | 1.8 |
| Sepals › Sepal form | `sepalCup` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Sepals › Sepal form | `sepalCupGradient` | slider | -0.8 – 1.2 (step 0.01) | 0 |
| Sepals › Sepal form | `sepalBuckleAmp` | slider | 0 – 0.6 (step 0.01) | 0 |
| Sepals › Sepal form | `sepalBuckleFreq` | slider | 1 – 7 (step 1) | 3 |
| Sepals › Sepal form | `sepalBuckleEnv` | slider | 2 – 6 (step 0.1) | 3 |
| Sepals › Sepal form | `sepalApexSweep` | slider | 0 – 1 (step 0.05) | 0 |
| Sepals › Sepal form | `sepalRoll` | slider | -330 – 330 (step 5) | 0 |
| Sepals › Sepal form | `sepalRollTaper` | slider | -1 – 1 (step 0.01) | 0 |
| Sepals › Sepal curl | `sepalAngle` | slider | -90 – 90 (step 1) | 0 |
| Sepals › Sepal curl | `sepalSpineCurl` | slider | -180 – 360 (step 5) | 0 |
| Sepals › Sepal curl | `sepalCurlBias` | slider | 0 – 1 (step 0.01) | 0 |
| Sepals › Sepal curl | `sepalCurlStart` | slider | 0 – 0.95 (step 0.01) | 0 |
| Sepals › Sepal curl | `sepalTwist` | slider | -180 – 180 (step 5) | 0 |
| Stem | `stemLength` | slider | 0 – 120 (step 1) | 0 |
| Stem | `stemDiameter` | slider | 3 – 12 (step 0.5) | 6 |
| Stem | `stemNodeProminence` | slider | 0 – 1 (step 0.01) | 0 |
| Stem › Hub | `hubStyle` | choice | GOBLET / ANGLED / CURVED | GOBLET |
| Stem › Hub | `hubShapeAmount` | slider | 0 – 2 (step 0.05) | 1 |
| Stem › Hub | `hubLength` | slider | 0 – 40 (step 0.5) | 0 |
| Stem › Leaves | `leafLength` | slider | 0 – 120 (step 1) | 0 |
| Stem › Leaves | `leafWidth` | slider | 3 – 40 (step 0.5) | 17 |
| Stem › Leaves | `leafAngle` | slider | -60 – 90 (step 1) | 35 |
| Stem › Leaves | `leafNodes` | slider | 1 – 8 (step 1) | 3 |
| Stem › Leaves | `leafPhyllotaxy` | choice | alternate / opposite / whorled | alternate |
| Stem › Leaves | `leafTipShape` | slider | 0.6 – 3 (step 0.05) | 1.3 |
| Stem › Leaves › Serration | `leafToothDepth` | slider | 0 – 1 (step 0.01) | 0.26 |
| Stem › Leaves › Serration | `leafToothCount` | slider | 1 – 12 (step 1) | 9 |
| Stem › Leaves › Serration | `leafCrestShape` | slider | 0.6 – 3 (step 0.05) | 2 |
| Stem › Leaves › Serration | `leafNotchShape` | slider | 0.6 – 3 (step 0.05) | 2 |
| Inflorescence | `inflorescence` | choice | NONE / RACEME | NONE |
| Inflorescence | `floretNodes` | slider | 1 – 12 (step 1) | 5 |
| Inflorescence | `floretPhyllotaxy` | choice | alternate / opposite / whorled | alternate |
| Inflorescence | `pedicelLength` | slider | 5 – 60 (step 1) | 20 |
| Inflorescence | `pedicelAngle` | slider | -60 – 90 (step 1) | 35 |
| Inflorescence › Floret | `floretPetals` | slider | 3 – 12 (step 1) | 5 |
| Inflorescence › Floret | `floretScale` | slider | 0.2 – 1 (step 0.05) | 0.6 |
| Part thickness | `sheetThickness` | slider | 0.6 – 2.4 (step 0.05) | 1.2 |
| Part thickness | `tipThinning` | slider | 0 – 0.8 (step 0.01) | 0 |
| Part thickness | `footDelicacy` | slider | 0.25 – 1 (step 0.01) | 1 |

### 8d. The 12 retired ids (unchanged since #258)

| id | retired in session | what it was |
|---|---|---|
| `centerStyle`, `centerSize`, `centerRise`, `centerDish`, `centerBore` | 20 | the NONE/DOME/DISC/RING centre rig and its four sub-sliders |
| `antherSharpness`, `stigmaSharpness` | 31 | the tip outline exponent carried directly — replaced by the Pinch |
| `petalTipBreadth`, `allTipBreadth`, `innerTipBreadth`, `labellumTipBreadth` | 32 | the TIP_PLATEAU amplitude and its three deltas |
| `lobeTipShape` | 41 | the single lobe-cut exponent — replaced by crest and notch shape |

---

## 9. The instruments

**`tools/` holds 189 files at the top level** (273 recursively: `dress-shell/` 74, `skirt-panelizer/`
9, `fixtures/` 1). **+41 since #258 (148), none removed or renamed.** "Wired" means named in a
workflow `run:` step, or reached from one by a real `import` / spawn; mentions in prose are not
counted.

| group | count |
|---|---|
| wired to CI (28 invoked directly, 11 only via another wired tool) | 39 |
| bloom measurement, standalone | 19 |
| bloom byte / structure / verify, standalone | 22 |
| contact sheets `shot-*` (bloom 60 · plot 6 · print 6 · flower 5 · scene 4 · cards 1 · tracker 1) | 81 |
| flower, standalone | 4 |
| other pages (plot, print, scene, cards, tracker, Field Notes, dress), standalone | 19 |
| shared libraries, standalone | 5 |

### 9a. Wired to CI (39)

| tool | workflow (direct) or via | what it measures |
|---|---|---|
| `verify-bloom-export.mjs` | export-watertight (shards) | every matrix row through real Get STL; boundary 0 + every assertion family |
| `bloom-export-shards.mjs` | export-watertight (verdict) | shard membership by matrix index; census reconcile; `--negative-control` |
| `bloom-wall-thickness.mjs` | export-watertight (preflight) | emitted wall and SELF approach; V1–V5; `SELF_XFAIL` |
| `bloom-combination-gate.mjs` | export-watertight (preflight) | two controls at once, nearest approach vs `MIN_FEATURE_MM`; CG0–CG7 |
| `verify-bloom-arc-stability.mjs` | export-watertight (preflight) | AS0–AS4, the uniform arc as curvature → 0 |
| `verify-bloom-infill.mjs` | export-watertight (preflight) | I0–I12, the infill's own gate |
| `verify-bloom-rim-owner.mjs` | export-watertight (preflight) | O1–O3, `emitRimLoop` owns every rim (static) |
| `verify-bloom-hole-rim.mjs` | export-watertight (preflight) | H0–H3, hole rims on the edge profile |
| `verify-bloom-infill-margin.mjs` | export-watertight (preflight) | MB0–MB2, the infilled outer margin |
| `verify-bloom-infill-budget.mjs` | export-watertight (preflight) | B0–B2, infilled states under the triangle budget |
| `verify-bloom-census-adjacency.mjs` | export-watertight (preflight) | CA0–CA7, a shared corner is topology |
| `verify-bloom-stem-channel.mjs` | export-watertight (preflight) | ST9 in Node on a mutated module (parses the apex table's text) |
| `verify-bloom-stem-nodes.mjs` | export-watertight (preflight) | ST12 must-fail, arm by arm |
| `verify-bloom-connectedness.mjs` | connectedness | voxel flood fill over the whole matrix |
| `verify-bloom-panel.mjs` | panel | every control renders once in its section; routes (a)…(aa) |
| `verify-bloom-grid.mjs` | grid | per-petal mid-surface capture and `.glb`, clauses 1–10 |
| `bloom-smoke.mjs` | frozen-matrices | the smoke census (`--check --negative-control`) |
| `diff-bloom-bytes.mjs` | frozen-matrices | `--verify-frozen`: every frozen matrix's row definitions deep-equal |
| `publish-frozen-tags.sh`, `publish-frozen-tags-selftest.sh` | frozen-tags (dispatch) | pin each baseline's base commit; seven self-test cases |
| `bloom-harness.mjs` | via most bloom tools | the live matrix, 44 frozen matrices, every family, every bloom xfail list |
| `bloom-self-intersection.mjs` | via harness | the within-shell census (X family), orientation |
| `bloom-crowding.mjs`, `bloom-plan-coverage.mjs`, `bloom-solid-angle-coverage.mjs`, `bloom-sagitta.mjs` | via the export gate | crowding flag, plan coverage, solid-angle coverage, sagitta |
| `bloom-first-slot.mjs`, `bloom-infill-wall.mjs`, `bloom-rim-roundness-lib.mjs` | via harness / infill gate / combination gate | libraries |
| `chromium-harness.mjs` | via every browser gate | shared launcher |
| `verify-flower-export.mjs`, `verify-geometry-quality.mjs`, `verify-connectedness.mjs`, `verify-junction-continuity.mjs`, `verify-tier-visibility.mjs`, `dump-visibility.mjs`, `visibility-matrix.mjs`, `verify-registry-sync.mjs`, `gen-preset-thumbs.mjs` | the flower workflows | the flower gates |

Read as DATA by a CI step but never run: `verify-bloom-apex-mutants.mjs` (its mutation text) and
`tools/fixtures/bloom-census-adjacency-pr278.jsonl`. Neither is in any `paths` filter.

### 9b. Standalone

- **Bloom measurement (19):** `bloom-basal-grading` `bloom-census-attribute` `bloom-census-sweep`
  `bloom-curl-near-zero` `bloom-fringe-ceiling` `bloom-infill-base-panel`
  `bloom-infill-lamina-floor` `bloom-ladder-gap-bound` `bloom-leaf-discovery`
  `bloom-lobe-composition` `bloom-lobe-model-b` `bloom-lobe-relief` `bloom-lobe-resolution`
  `bloom-neighbour-gap` `bloom-roundness-law-match` `bloom-sepal-contact` `bloom-voronoi-cost`
  `bloom-voronoi-proto` `bloom-xfail-magnitudes`.
- **Bloom byte / structure / verify (22):** `compare-bloom-captures` `verify-bloom-apex-mutants`
  `verify-bloom-defaults-bytes` `verify-bloom-edge-profile` `verify-bloom-fringe-bytes`
  `verify-bloom-grid-bytes` `verify-bloom-infill-bytes` `verify-bloom-infill-conform`
  `verify-bloom-infill-metric` `verify-bloom-leaf-bytes` `verify-bloom-leaf-decoupled`
  `verify-bloom-petalsall-bytes` `verify-bloom-presentation-only` `verify-bloom-rim-arc`
  `verify-bloom-seam-bytes` `verify-bloom-sepal-bytes` `verify-bloom-sepal-decoupled`
  `verify-bloom-sphere-stem-bytes` `verify-bloom-surface-bytes` `verify-bloom-surface-offstation`
  `verify-bloom-tip-bytes` `verify-bloom-winding-bytes`. **Every byte tool needs a base worktree
  and is therefore run by a session, never by CI.**
- **Contact sheets (81):** 60 `shot-bloom-*`, plus `shot-beach*` (3), `shot-cards-glyph-presets`,
  `shot-flower`, `shot-panel-chrome`, `shot-panel-matrix`, `shot-plot*` (6), `shot-print-*` (6),
  `shot-scene-pads`, `shot-shape-picker`, `shot-tracker-marks`, `shot-voronoi-contact`.
- **Flower (4):** `audit-hires` `probe-junction` `rib-graph-stats` `test-petal-flow`.
- **Other pages (19):** `verify-plot` `verify-print-scaffold` `verify-print-infill`
  `verify-print-tone` `verify-print-axis` `verify-print-fan` `verify-scene` `beach-reference`
  `verify-cards-fonts` `verify-cards-svg-glyphs` `verify-cards-glyph-presets`
  `gen-google-fonts-catalog` `pdfimg` `shrink-print-bundle` `verify-tracker-drawer`
  `verify-color-change` `verify-stretch-sim` `verify-trace-sim` `verify-shape-editor-impact`.
- **Shared (5):** `_svg2png` `bloom-soft-render` `diff-contact` `make-contact-sheet` `pngdec`.
- **Subdirectories:** `dress-shell/` and `skirt-panelizer/` are standalone Python projects.

**Added since #258 (41):** 9 newly CI-wired directly (`bloom-combination-gate`,
`bloom-export-shards`, `verify-bloom-census-adjacency`, `-hole-rim`, `-infill-budget`,
`-infill-margin`, `-infill`, `-rim-owner`, `-stem-nodes`), 2 wired via import
(`bloom-infill-wall`, `bloom-rim-roundness-lib`), 3 bloom measurement, 6 bloom byte/verify,
15 `shot-bloom-*`, 4 beach, 2 cards.

**Cited but absent:** `tools/shot-beach-mockup.mjs` and `tools/shot-beach-stages.mjs`
(`docs/beach-drawing-layer.md:220-221`, `docs/beach-wave-object.md:303` — deleted in #271, cited as
replaced), `tools/shot-bloom-lobes.mjs` (`docs/bloom-session-38-outcome.md:531` — "withdrawn …
not in the tree"). No workflow and nothing in `CLAUDE.md` cites a missing tool.

### 9c. The workflows (14 files, unchanged in number since #258)

| workflow | triggers | `paths` | jobs / what runs |
|---|---|---|---|
| `bloom-export-watertight` | PR, push `main`, dispatch | `bloom.{html,css,js}`, `bloom-geometry.js`, `bloom-registry.js`, 17 named tools, own yml (PR) | **`preflight`** (timeout 60): 20 Node steps — wall, combination gate (+control), arc stability (+nc), infill (+nc), rim-owner nc, hole-rim (+nc), infill-margin (+nc), census-adjacency (+nc, + PR-only CA5 scope), stem-channel (+control), stem-nodes, infill-budget nc · **`shard` × 8** (timeout 150, fail-fast off): `verify-bloom-export.mjs --shard N/8 --census` · **`verdict`** (timeout 20, `if: always()`): `bloom-export-shards --plan`, `--negative-control`, `--merge`; fails if preflight did not pass |
| `bloom-connectedness` | PR, push `main`, dispatch | `bloom.*`, geometry, registry, `verify-bloom-connectedness`, harness, self-intersection, chromium-harness | one job, **no timeout** (default 360): `verify-bloom-connectedness.mjs` |
| `bloom-panel` | PR, push `main`, dispatch | `bloom.*`, registry, geometry, `verify-bloom-panel`, harness, chromium-harness | `verify-bloom-panel.mjs` + `--negative-control` |
| `bloom-grid` | PR, push `main`, dispatch | geometry, registry, `bloom-grid-gltf.js`, `verify-bloom-grid` | no browser: `verify-bloom-grid.mjs` + `--negative-control` |
| `bloom-frozen-matrices` | PR, push `main`, dispatch | registry, geometry, harness, `diff-bloom-bytes`, `bloom-smoke` | `bloom-smoke --check --negative-control`; for each of the 44 phases a worktree of its base and `diff-bloom-bytes --verify-frozen` |
| `bloom-frozen-tags` | **dispatch only** (`check_only` input); `contents: write` | — | self-test, then `publish-frozen-tags.sh` |
| `flower-export-watertight` | PR, push `main`, **weekly cron Sun 07:00 UTC**, dispatch | flower files + **`'tools/**'`** | `verify-flower-export.mjs` (`--smoke` on PR/push) |
| `flower-geometry-quality` | PR, push `main`, dispatch | flower files + **`'tools/**'`** | `verify-geometry-quality.mjs` |
| `flower-connectedness` | PR, push `main` | flower files, `verify-connectedness`, chromium-harness | `verify-connectedness.mjs` |
| `flower-junction-continuity` | PR, push `main` | flower files, its tool | `verify-junction-continuity.mjs --law spine` |
| `flower-tier-visibility` | PR, push `main` | flower.js/registry/html, visibility tools | `verify-tier-visibility.mjs`, `dump-visibility.mjs` |
| `preset-thumbs` | PR, push `main` | flower files, `gen-preset-thumbs`, `assets/presets/**` (**PR only** — push omits it) | `gen-preset-thumbs.mjs --check` |
| `registry-sync` | PR, push `main` | `flower.html`, `flower-registry.js`, its tool | `verify-registry-sync.mjs` |
| `textile-gauge-tests` | PR, push `main` | `textile-gauge-reader/**` | pytest |

Only `bloom-export-watertight` changed since #258 (nine commits; #294 split it into three jobs).
The Actions API also lists four workflows with no file on `main` or very few runs:
`flower-gates` (1 run, Aug 21), `flower-base-continuity` (2 runs, Aug 31, #111's branch),
`static` (Pages, last Aug 7) and Dependency Graph. **Nothing covers `/plot`, `/print`, `/scene`,
`/cards`, the tracker, Field Notes, or dress/skirt.** A PR touching any `tools/` file runs both
flower gates (`'tools/**'`), which test only flower geometry.

---

## 10. Collision map

For each outstanding item in §7, the files and code regions a session addressing it would touch,
and which other items share them. **Paths, not a verdict** — whether two items can run in
parallel is a decision for whoever holds the rulings. Two structural rules apply to any item that
reaches them and are stated once here: a change to the ROW SET owes a frozen phase in BOTH
`FROZEN_BASE_COMMITS` and `FROZEN_MATRICES` (the harness throws otherwise), and a phase whose
base commit precedes an edit to `.github/workflows/bloom-export-watertight.yml` has, on every
observation so far, needed a `TAG_PUSH_XFAIL` entry. `CLAUDE.md`'s "ONE REGISTRY PR IN FLIGHT AT
A TIME" rule covers `bloom-registry.js` and `bloom-geometry.js` together.

### 10a. Hot paths

| path / region | items reaching it |
|---|---|
| `bloom-geometry.js` (any) | A1–A5, A6, A7, A10, A16, A17, A19, A20, A21, A25, A26, B1–B6, B7, B8, B12, B13, B14, B15, B16, B19, B20, B26, C1, C2, C3, C4, C9, C14 |
| `bloom-registry.js` | A1 (a corolla primitive), A6/A7 (sepal defaults), A10, A11, A12, A19 (a taper control), A21 (a fifth infill control), A25, B1, B2, B14, B19 |
| `tools/bloom-harness.mjs` — `buildMatrix()`, the families, `SELF_INTERSECTION_XFAIL`, the frozen maps | nearly every geometry item; specifically **`SELF_INTERSECTION_XFAIL`**: C1, C2, B6, B7, B8, A26, and C21; **the frozen maps**: B1, B2, B3, B5, A19, and any item adding a matrix block; **A7's clause**: C10, A16, B8 |
| `bladeStations` / `ladderGapFactor` / `ladderDemand` | A16, B8, C1 (if respacing), B20 — and #289's ramp now reads `LADDER_MAX_GAP_FACTOR`, so A16 moves the apex ramp's A8 ceiling |
| `widthProfile` / `apexNibPlan` / `toLaw` | C1, C2, B5, B19, A12 |
| the infill: `petalInfillPlan`, `emitInfillPanel`, `insetPlan`, `emitRimLoop`, `rimProfile` | C2, C3, C4, C5, C6, B12, B13, B14, B15, B16, A21, A22 |
| `stemPlan` / `stemStations` / `buildStemInto` / `stemNodeLaw` / `buildHubInto` | A17, A18, A19, A20, B3, C9, D6, B26 |
| `footRing()` (the dome, the rings, the androecium, gynoecium and sepals descriptors) | A6, A7, A25, B1, B2, B17 |
| `sepalAttachment` / `sepalAngleLimit` / `sepalBladeState` / `seamClearanceMm` | A6, A7, A26, B2 (sepal variance) |
| `inflorescencePlan` / `floretState` / `appendTransformed` | B1, B3, B4, A20, B25 |
| `tools/bloom-combination-gate.mjs` | A13, A14, A15, B24, B25, §7g |
| `tools/bloom-wall-thickness.mjs` | B10, C11, B24 (its `measureWall` is the gate's `self`) |
| `tools/verify-bloom-apex-mutants.mjs` | D1, D2, D3, D4, D5 (#237), D6 — and it is parsed by `verify-bloom-stem-channel.mjs` in CI, so a stale anchor there is a CI refusal |
| `tools/publish-frozen-tags.sh` + `-selftest.sh` | D13, and every new phase |
| `.github/workflows/bloom-export-watertight.yml` | C19 (path filter), D14 (gates not in CI), and any new preflight step (which also makes the next phase need a `TAG_PUSH_XFAIL` entry) |
| `.github/workflows/bloom-connectedness.yml` | C19, C20 |
| `bloom.js` | C7 (#231, the STL handler's order), any read-out text (A17 is told there), B11 no (that is `/plot`) |
| `plot*.js`, `tools/verify-plot.mjs` | B11, B21, A29, A30 |
| `print*.js`, `assets/print-test/` | B22, A31 |
| `scene/*`, `tools/verify-scene.mjs` | A27, A28, C17 |
| `CLAUDE.md`, `docs/*` | every §11 item |

### 10b. Per item group

| item(s) | paths a session would touch | shares paths with |
|---|---|---|
| **C1 #285** (nib arc along-u fold; tip thickness taper hypothesis) | `bloom-geometry.js` `apexNibPlan`, `sectAt`/thickness law, possibly `bladeStations`; harness `SELF_INTERSECTION_XFAIL` (the `LOBES: x cup 1.2` entry and every nib-affected entry); byte partition; possibly a frozen phase | C2, B5, B6, A16, B8, A12 |
| **C2 #286** (infill conformance bar vs local turn) | `bloom-geometry.js` infill emitter's split decision; harness 4 infill entries; `tools/verify-bloom-infill.mjs`; byte partition | C3–C6, B12–B16, A21, C1 (both read `toLaw`'s output) |
| **C3–C6, B12–B16, A21, A22, B27** (the infill's remaining items) | infill region of `bloom-geometry.js`; `bloom-registry.js` if a fifth control; `tools/verify-bloom-infill*.mjs`, `-hole-rim`, `-infill-margin`, `bloom-infill-wall.mjs`; harness infill entries; `.glb` exporter for the mask | C2, C1, B11 |
| **B11** (`/plot` line splitting) | `plot-export.js`, `plot-grid.js`, `tools/verify-plot.mjs` | B21 only |
| **B1, B3, B4, A20, B25** (inflorescence) | `inflorescencePlan`/`floretState`, `bloom-registry.js`, harness block + ID family, `bloom-grid-gltf.js` (florets), `stemPlan` for droop, a combination-gate measure | A17–A19 (stem), B2, A1–A5 (bell/bud pose), B24 |
| **B2** (variance builds 2, 3; sepal variance) | `sizeVarianceField`'s siblings in `bloom-geometry.js`, `buildWhorlInto`, `petalFormIsFlat` **and the harness's `FORM_IDS` (two owners of "is this flat?")**, `bloom-registry.js`, VS family, `tools/bloom-neighbour-gap.mjs`, `tools/bloom-curl-near-zero.mjs` | A6, A7 (sepal half), B7 (the arc's noisy band — build 2 hands near-zero curls to the arc), B1 |
| **A17–A20, B3, B26, C9, D6** (stem) | `stemPlan`, `stemStations`, `buildStemInto`, `stemNodeLaw`, `buildHubInto`, `leafPlan`; ST family; `tools/verify-bloom-stem-nodes.mjs`, `-stem-channel.mjs`; `verify-bloom-sphere-stem-bytes.mjs` | B1 (pedicels are floret stems), B3 |
| **A1–A5, A26, B4** (bell / corolla / descending seam) | `seamClearanceMm`, `bladeStations`, `petalForm`, a corolla primitive, `bloom-registry.js` (`petalTilt`'s range is a registry bound), harness A7 + seam families | A6, A7, A16, B8, B1 |
| **A6, A7** (sepals) | `sepalAttachment`, `sepalAngleLimit`, `sepalBladeState`, registry defaults, SP family, `tools/bloom-sepal-contact.mjs` | A26, B2 |
| **A16, B8, B20** (ladder) | `bladeStations`, `ladderGapFactor`, `ladderOutsideMinima`, `LOBE_DEMAND_ROWS`; harness A7/A8/L family; `tools/bloom-ladder-gap-bound.mjs`, `-lobe-resolution.mjs`; `verify-bloom-seam-bytes.mjs` (a new `--change`); a whole-matrix byte partition; a `SELF_INTERSECTION_XFAIL` re-baseline | C1, A12, A26, #289's apex ramp |
| **A10, A11, A25, A12** (naming, placement, defaults) | `bloom-registry.js` (`SECTIONS`, option names; a rename is `RETIRED_IDS` + a new id), `tools/verify-bloom-panel.mjs` | any other registry item |
| **A13–A15, B24, §7g** (combination gate) | `tools/bloom-combination-gate.mjs` (`PAIRS`, `COMBINATION_XFAIL`, `COMBINATION_INERT`), `tools/bloom-wall-thickness.mjs` | B10, C11 |
| **D1–D6, D13, D14** (instrument gaps) | `tools/verify-bloom-apex-mutants.mjs`, `publish-frozen-tags-selftest.sh`, the export workflow (to add gates) | C19, any geometry item whose anchors they would pin |
| **C19, C20** (workflow filters, connectedness runtime) | `.github/workflows/bloom-export-watertight.yml`, `bloom-connectedness.yml`, possibly `tools/verify-bloom-connectedness.mjs` (to shard) | D14; and any phase registered after the edit (TAG_PUSH_XFAIL) |
| **C7 #231** | `bloom.js` STL handler; possibly a triangle-count predictor in `bloom-geometry.js` | B1 (an `INFLO: ALL MAX` refusal would pay the same cost) |
| **C10, C11, C12, C21** (small tool defects) | `tools/bloom-harness.mjs:2772`, `tools/bloom-wall-thickness.mjs:317`, `tools/bloom-infill-base-panel.mjs:86`, the `ALL MAX` note at `bloom-harness.mjs:8240` | any harness item |
| **A27, A28, C17** (scene) | `scene/*`, `tools/verify-scene.mjs` | nothing in the bloom |
| **B21, A29, A30** (`/plot`) | `plot*.js`, `tools/verify-plot.mjs` | B11 |
| **B22, A31** (`/print`) | `print*.js`, `assets/print-test/`, three `/print` tools | nothing in the bloom |
| **§11 items** (documentation) | `CLAUDE.md`, `docs/*`, GitHub issue states (#221, #43, #286) | a docs-only change touches no gated path; a correction inside `tools/bloom-harness.mjs` (C21, #286's notes) does |

---

## 11. Where the docs disagree with the code

A new session reads `CLAUDE.md` first, top to bottom, and #258 recorded one such disagreement
costing a whole session. Most consequential first. "Right" says which side matches the tree
where that could be established.

1. **`ALL MAX`'s census.** `CLAUDE.md:442`, `:523` and `:1659` say it reads **107,485 pairs /
   10.1332 mm** ("unmoved", "measured rather than carried forward").
   `SELF_INTERSECTION_XFAIL['ALL MAX']` is **91,808 / 10.1332**, and
   `docs/bloom-apex-nib-outcome.md:1256` records the move 107,485 → 91,808 in the same PR — while
   `:1350` of the same doc says "reads 107,485 … against a declared 107,485". **Measured here:
   `node tools/bloom-xfail-magnitudes.mjs --only '^ALL MAX$' --include-refused` reads 91,808 /
   10.1332 (300 s) — the tree is right, the three `CLAUDE.md` sentences and doc `:1350` are
   stale.** Note that no CI gate reads this entry (the row is export-refused), so a drift here is
   invisible to CI by construction; and the entry's own note text is stale too (§7c C21).
2. **"`ALL MAX` reads 24,688 triangles, unchanged"** (`CLAUDE.md:4721-4722`; the same in
   `docs/bloom-infill-builder.md:43, 543`). 24,688 is the shipping DEFAULT's count;
   `EXPORT_REFUSED_XFAIL['ALL MAX'].tris` is **3,090,816**, which XR1 asserts exactly. The prose is
   wrong — a copy of the default's figure.
3. **"`bloom-geometry.js` holds ZERO module-level mutable state"** (`CLAUDE.md:5011`;
   `docs/bloom-inflorescence-discovery.md:95`; `docs/bloom-inflorescence-outcome.md:20`). True at
   `f1fbdf9`; **false since #289 (`4f3d31b`)**: `let NU = NU_BASE` (`:3733`),
   `let RAMP_FORCE_BASE`, `let RAMP_PROBE_STEP` (`:3769-3770`), `let BUDGET_DECISION_ACTIVE`
   (`:15358`). The inflorescence's "the head is a pure function of (state, acc)" argument rested
   on it. Whether those variables are reset per build (and so harmless) was not established here.
4. **Frozen-tag publication.** `CLAUDE.md:1878` "the remote carries THIRTY of the thirty-three
   declared baselines"; `:1888` "THE THREE THAT REMAIN … DECLARED BY NAME"; `:1948` "18
   `frozen/*` tags are on the remote". Tree and remote: **44 declared, 38 published, 6 declared
   absent** (§5). Later `CLAUDE.md` blocks do say phase43/45 are pre-declared, so the file
   contradicts itself and the headline a reader meets first is the stale one. The prompt for this
   session carried a third variant ("four") — also stale.
5. **#221.** `CLAUDE.md:2695` "#221 IS CLOSED" — the code agrees (the apex table carries L5
   mutants, `tools/verify-bloom-apex-mutants.mjs:455, 509, 524`, whose comment says it closes
   #221) — but **GitHub issue #221 is OPEN**. And `CLAUDE.md:2537` (session 41) still says "No
   mutant names L5" in the present tense. Code right; the issue state and `:2537` are stale.
6. **"#213's list does not gate MAGNITUDE"**, in the present tense at `CLAUDE.md:517, 2305, 3418,
   3937, 4041, 4060, 4253`. #213 is CLOSED (by #246) and X1/XR1 gate magnitudes exactly
   (`CLAUDE.md:282` says so). The tree is right. **`:517` was written after #246 merged**, so it
   was wrong when written.
7. **The refusal mechanism for frozen tags.** `CLAUDE.md:1896-1932` says the workflow-divergence
   mechanism is REFUTED and "what actually refuses the push is NOT ESTABLISHED" (with phase21 as a
   counter-example). `tools/publish-frozen-tags.sh:125-126` pre-declares phase43 and phase45 on
   exactly that predictor ("edits bloom-export-watertight.yml after <base>, the shape GitHub
   refused for phase42"). Observations 42–45 fit the predictor; `CLAUDE.md`'s phase21
   counter-example does not. **Cannot establish which is right**; the two texts now disagree about
   whether a predictor exists.
8. **`CLAUDE.md:77`**, the session-36 headline: "A 318-ROW XFAIL LIST MEASURED ON `main`".
   `SELF_INTERSECTION_XFAIL` has **233**. (#258 flagged this at 280; it moved again.)
9. **Smoke-subset figures.** `CLAUDE.md:529` "111 rows over 34 blocks … 115 families"; `:3512` "85
   rows, 29 blocks, 90 families". Measured: **127 / 37 / 120**. The last increments `CLAUDE.md`
   records sum to 125; two smoke rows were added by the infill PRs between `4f3d31b` and `c170500`
   without a `CLAUDE.md` figure.
10. **The combination-gate block** (`CLAUDE.md:4580-4621`, `:1697`, `:1818-1819`): "twenty pairs,
    262 cells, 78 declared cells across sixteen pairs", the verdict split "12 · 4 · 4", "74 → 63
    declared", "`curl-x-twist` … 0.012 at 120° and 0.025 at 180°" (NOT monotone), and the cup +
    gradient "sum rule" read off eight declared cells. **Measured here: 22 pairs, 294 cells, 64
    declared across 13 pairs**; `cup-x-gradient` now `clears` with 0 cells; `curl-x-twist` reads
    0.053 / 0.007. The gate's own note on `curl-x-twist` still says "NOT monotone". Tree right.
    The declared count is 64 against the last stated 63 — an unrecorded +1 that was not traced.
11. **`/scene` has a scene 3.** `CLAUDE.md:8144-8145` "Scene 1 … is built; slots 2-8 are declared
    and render as disabled nav numbers"; `:8738` scenes 2–8 out of scope. `scene/registry.js:27-29`
    registers scene 3 ("Beach swash line", `scene-beach.js`), seven `scene/beach-*.js` files exist,
    merged as #269 and #271. `CLAUDE.md` has no section on it (its docs are
    `docs/beach-drawing-layer.md`, `docs/beach-wave-object.md`). The gate figures ("97 checks",
    "thirty-nine mutations", `:8653, 8660`) are stale: part one alone passes 91/91 and the MUTANTS
    array holds ~70 entries by a static count. Tree right.
12. **Artist Tracker.** `CLAUDE.md:8748-8752` "Items 29–32 are in review on branch
    `claude/tracker-ratings-markers`". That branch does not exist on the remote; `MARKERS`,
    `addedAt` and the rating control are in `artist-tracker.html` on `main`. The merging PR was not
    identified. Tree right.
13. **`/plot`'s `MAX_INSTANCES`.** `CLAUDE.md` multi-bloom decision 4 says 8; `plot.js:335` is
    **12**. (`docs/project-state.md:138` already noted it.)
14. **Infill "not done" sentences superseded lower in the same file:** "the four SUB-sliders
    still owe an `INFILL_SUB_IDS` entry" (`CLAUDE.md:3574-3577`, and the code comment
    `bloom-registry.js:1722`) — the harness has `INFILL_SUBS` / `INFILL_SUB_IDS`
    (`tools/bloom-harness.mjs:8980-8981`); "THE PORT … IS BLOCKED BY THE EMITTER" (`:3687`);
    "the cells' outline edges … are STILL FLAT" (`:4916`) and "91 of 95 margin stations are a
    1.200 mm flat wall" — fixed by #297; `infillDensity` "default **16**" (the S3 block) — the
    registry default is 20; "a declared 2,354,268-triangle export refusal" (`:3579`) — now
    3,090,816. Code right in every case; the paragraphs read as current state.
15. **`INFLO: ALL MAX` headroom:** `CLAUDE.md:5097` "1,114,828 export triangles … 74.3%";
    `CLAUDE.md:405` (written later) "1,425,468 of the 1,500,000 budget, 95.0% … the next highest at
    46%". The later figure supersedes the earlier; "next highest at 46%" is itself stale (the
    infill's `x 40 x 3` row sits at 75–82% by `CLAUDE.md`'s own infill blocks). Not re-measured here.
16. **Retired controls described as live.** The petal-roles block (`CLAUDE.md:4493-4498`,
    `:4480`) describes `allTipBreadth` and "Petal shape's Tip breadth" as live deltas; all four
    tip-breadth ids are in `RETIRED_IDS` (session 32). The code comment `bloom-geometry.js:3449`
    ("max tip breadth against the steepest falling core") describes the same retired control.
17. **"Four of the eight read span EXACTLY 0.0000"** (`CLAUDE.md:1755`). #286, the harness notes
    and the corrected §12 of the apex-nib doc all say **five**. `CLAUDE.md` is the last copy saying
    four. Separately, the four `SELF_INTERSECTION_XFAIL` notes that cite #286 still say the §12
    link and the four → five fix are "deferred to the next PR touching that doc" — #287 did both.
18. **Issue #286's title** names `INFILL: the ruled defaults` as folding; that row is no longer
    declared and reads 0 (`docs/bloom-infill-ruled-defaults.md:108`). The issue body is right as a
    record of the day it was filed; the title no longer describes the tree. Whether the issue should
    change is not this document's to say.
19. **Present-tense "newest baseline" claims:** `CLAUDE.md:4318` (phase24), `:1311` (phase21
    "newest fully replayable"), `:3669`/`:3951` (phase34), `:4707` (phase35). The newest is
    **phase45**. Each was true in its session.
20. **`docs/bloom-frozen-tags-outcome.md:344-347`** still says the tag dispatch is Eva's.
    `CLAUDE.md` records Eva's Sep 24 ruling handing it to sessions, and the dispatch history
    (§5) shows sessions firing it. The doc is stale.
21. **CI arithmetic:** `CLAUDE.md:573` "two of the six CI jobs on a bloom PR are FLOWER gates … it
    is four" predates the sharding; the port plan's "export gate lands near 293 min against the
    360-minute job limit" is superseded by #294. "Bloom gate count stays at FIVE" (`:1227` etc.)
    is right by workflow count.
22. **`EXPORT_TRI_BUDGET`'s owner.** `CLAUDE.md:4047` "`bloom.js`'s `EXPORT_TRI_BUDGET`"; it
    moved to `bloom-geometry.js:3781-3785` in #289 and `bloom.js` imports it. Value unchanged.
23. **Count drift, not contradiction:** "Sepals: twenty controls" (now 21 — `sepalHeight`);
    "Leaves: nine controls" (now 10 — `leafTipShape`); the inflorescence block places all six floret
    sub-controls "in a nested Floret section" — only `floretPetals` and `floretScale` are in
    `floret`; `floretNodes`, `floretPhyllotaxy`, `pedicelLength` and `pedicelAngle` are in the
    top-level `inflorescence` section. `/plot`'s panel count ("twenty-four controls … seven
    panels" at `:8111` vs "thirty-two controls … eight panels" in the multi-bloom block).
24. **Open issues whose premise the tree has discharged:** #43 (asks for the connectedness gate,
    which exists) and #221 (item 5). **#236**, which #258 flagged, is now closed — resolved.
25. **`project-state.md:153-163`** lists six dormant PRs; five have since merged or closed and only
    #111 remains open.
26. **Squash messages** (§1b): #288's "four families / 16 SVGs" (12 shipped), #278's "13 moved /
    896 held" (not the change against `main`), #289's "bloom-geometry.js byte-identical to main"
    (+211 lines), #279's "68 within-shell count moves" (67).
27. **Cited files that do not exist:** `docs/flower-continuous-spine-proposal.md` (cited from
    `tools/verify-connectedness.mjs:207`, `tools/verify-junction-continuity.mjs`,
    `docs/flower-petal-origin-surface.md`), `docs/flower-lobed-voronoi-findings.md` (from
    `docs/flower-partition-remeasure.md`), and the three tools in §9b. Every path `CLAUDE.md`
    itself cites exists.
28. **Flower `MIN_FEATURE_MM`.** The flower section says the export floor is `MIN_FEATURE_MM = 0.8`;
    `flower.js:297` is `const MIN_FEATURE_MM = 0.8; // fallback floor if no process set`, so the
    live floor may be process-dependent. Not investigated; possibly an understatement rather than
    a contradiction.

Checked and consistent (no finding): every constant and range `CLAUDE.md` quotes for the bloom
(`MIN_FEATURE_MM` 1.0, `SHEET_THICKNESS_MM` 1.2, `STEM_MIN_WALL_MM` 1.5, `TIP_HALF_MM` 0.8,
`NU_BASE` 56, `APEX_NU_BAND` [2.30, 2.70], `APEX_NU_ABOVE` 112, `LADDER_MAX_GAP_FACTOR` 1.4,
`RIM_BEAD_SEGMENTS` 4, `MAX_LAYERS` 6, budget 1,500,000, the infill defaults, `petalTilt`,
`petalTipShape`, `leafTipShape`); "phase45 is the 957 rows at `c170500`"; "block 41 is 13 rows";
the `/plot` gate's "233 checks and 93 mutants" (static count); issues #220, #231, #236, #285,
#286 match their prose.

---

## 12. What this snapshot cannot tell you

1. **Eva's rulings and the session backlog are outside this repository.** Anything in §7 marked
   as Eva's may already have been ruled somewhere this session cannot see. The rulings that ARE in
   the repo (the infill's seven, inflorescence's twelve, variance's seven, the bell §9, the stem
   nodes) are quoted from the docs that carry them.
2. **Which item is next is not knowable from the code.** §7 says what is declared open, §10 what
   shares a path; neither is an ordering, and none is offered.
3. **The "one more stem session in flight"** is not visible: no PR, no pushed branch. If it
   exists, it is local to a session that has not pushed.
4. **`main`'s head was not fully certified at the snapshot**: `bloom-connectedness` on `8c1ea07`
   was still running (§4a). If it goes red, §1's "clean" reading is wrong and this file will not
   have been updated.
5. **No browser gate, byte partition or census sweep was run.** The four instruments run here
   (harness load, smoke `--check`, wall, combination gate) plus one targeted
   `bloom-xfail-magnitudes` row are what this document MEASURED; everything else is what the tree
   DECLARES or a commit CLAIMS. In particular whether all 233 census magnitudes reproduce is
   established only by CI's success on `8c1ea07`, not here.
6. **"Moved geometry bytes"** in §1a is each merge's own claim. A merge that moved bytes and did
   not say so appears as "no claim", not as a finding; proving otherwise needs a worktree and a
   full partition per merge.
7. **Why some things were done is not recorded:** why #277 (flower rim bead) was closed unmerged;
   whether `claude/awesome-shannon-sa9d7s-backup`'s 16 commits are a subset of #278's squash;
   whether #289's module-level `let`s are reset per build; which PR merged tracker items 29–32;
   whether infill S6 is considered done.
8. **Contact sheets were not rendered and no image was opened.** Every §7a question that is a
   look is a question whose answer is a picture.
9. **Issue bodies were read for #285 and #286 only;** the other 30 open issues were read by title.
10. **`/print`, `/plot`, `/scene`, `/cards` and the tracker were read only where the bloom or the
    prose touches them.** No gate for them was run and nothing in CI covers them.
11. **Runtimes (§4b) are one reading.** Size any CI wait off `actions_list` at the time.
12. **This is a snapshot on `8c1ea07` taken 2026-09-29.** Re-take it rather than update it; the
    command behind each number is named beside it.

---

*Snapshot ends.*
