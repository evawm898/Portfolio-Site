# The stem's nodes — the flower's swelling and kink, ported (outcome)

**What shipped.** `stemNodeProminence` (Stem, 0–1, step 0.01, **default 0**) is one
control that does two things: it swells the stem into a spindle around each node, and
it kinks the stem at each node. This follows Eva's ruling that the kink and the swelling
are ONE control. At 0 nothing changes: `stemNodeLaw` returns null, `stemPlan` takes
`stemStations` verbatim, and `buildStemInto` takes its straight arm, which is the
pre-session code character for character. The shipping default is therefore identical by
branch, and the byte partition below measures that rather than assuming it.

The inputs are the ones already ruled:
- `stemDiameter` is the diameter at the flower (Sep 27).
- The flower's taper is NOT adopted.
- #299's measurements stand and were not re-derived.

The sheet is `docs/img/stem-nodes.png` (`node tools/shot-bloom-stem-nodes.mjs <out>`).

## 1. The law, carried over from the flower's own constants

`flower.js:1777–1830`, as read by #299. On the flower, `t` is a fraction of the stem
length, the stem length is 4, and the tube radius is 0.0168. That gives a top radius of
4 × 0.0168 = 0.0672. The spindle's half-width in `t`, 0.055, is therefore
**0.055 × 4 / 0.0672 = 3.2738 stem radii**. That ratio is what is ported, not a
fraction of the length. The `the-spindle-is-a-fraction-of-the-length` mutant exists to
catch the wrong version.

| | flower | bloom (this PR) |
|---|---|---|
| swelling | `prom · 0.6 · exp(-((t-tk)/0.055)²)` | `prom · 0.6 · exp(-((s-sk)/w)²)`, w = **3.2738 · outerR** |
| at 0.48 | +28.8% of radius | +28.8% of radius |
| kink | drift `prom · L · 0.13 · past · smoothstep(0, 0.12, past)` | the same slope, 0.13 · prom, eased in over **2.1818 · w** (0.12/0.055 of the spindle) |
| turn a node | atan(0.13 · prom) | the same: **3.57° at 0.48**, 7.4° at 1.00 |
| where the bend peaks | just below the node | **0.375 × the ramp = 0.818 of the spindle below the node** — inside the swelling |
| kink direction | golden angle per node | **away from the node's first leaf** (see §4) |
| tip off straight, 100 mm / 3 nodes | ~3.3 mm | **2.60 mm** at 6 mm, **2.84 mm** at 3 mm (0.48) |

**The phasing is the part to get exactly right, and it is exact.** The drift's second
derivative, the curvature of the kink, is smoothstep′′. It peaks at 0.375 of the ramp
past the node. The ramp is 0.12/0.055 = 2.1818 spindles long, so the curvature peaks
0.818 spindles below the node, and the spindle's own half-width is 1. That places the
bend peak inside the swelling at every prominence and every stem diameter, because both
lengths scale with the same radius. The read-out prints it as a number (on the 3 mm stem, `peaking
4.02 mm below it (0.818 of the spindle — inside the swelling)`). ST12(d) reads it off the
EMITTED rings (§5).

The tip reads 2.60 mm off straight here against #299's ~3.3. The difference is the node
positions and where the stem ends, not the law. The flower's nodes are fixed at t
0.16..0.86. The bloom's nodes are the LEAVES' nodes (§4), so the last node's ramp runs
off the end of a 100 mm stem and part of its drift is never reached.

**The rings stay horizontal. Only their centres move.** This is an axis offset
(`stemNodeAxisMm`), not a swept frame, and not a general stem centreline. The brief's
stop condition did not fire, because none was needed. Every ring is still a horizontal
circle at its own z, so the bore, the root band, the tip plug and the hub join all keep
their meaning. This is also exactly how the flower builds its stem: horizontal circles on
a displaced centreline.

## 2. The axis consumers, enumerated before any of them changed

**Geometry, `bloom-geometry.js`:**

| consumer | where | what it now reads |
|---|---|---|
| the node law and its guard | `stemNodesAbsent` :11860, `stemNodeLaw` :11907, `stemNodeRadiusMm` :11931, `stemNodeAxisMm` :11942, `stemNodeTiltRad` :11959 | new, one owner |
| the station placer | `stemNodeStations` :11985 | new; `stemStations` untouched and used at 0 |
| the bore | `stemPlan` :12044 | **unchanged**. Eva's `max(0, r − 1.5)` is taken at the stem's CONTROL radius, so a swelling thickens the wall rather than widening the bore |
| the root band | `stemPlan` :12238–12239 (`headInsideBore`, `solidBandMm`) | unchanged. The band closes the bore where the head sits inside it; the bore is unchanged |
| the tip plug | `stemPlan` :12304–12311 | unchanged in length. The void's ladder is the plan's own `voidStations` (:12329–12335), noded where the stem is, so ST1 predicts it |
| the free-stem distance (the sphere channel mask, ST9's region, the combination gate's `leaf-stem`) | `freeStemDistanceMm` :12436 → `nodedStemDistanceMm` :12454 | the union of the emitted horizontal discs, per station interval, not a straight cylinder |
| the meridian packing | `meridianPacking` :12613, :12621 | `stemOuterRAt(plan, 0)`, the radius where the stem leaves the head (a node's swelling can reach that far) |
| the stem builder | `buildStemInto` :12679, noded arm from :12735 | each ring centred on `stemNodeAxisMm` at its own depth, outer radius `stemNodeRadiusMm`. The straight arm is verbatim |
| the leaf layout | `leafNodeLayout` :11879, `leafPlan` :13139 | one owner of node depths, read by the law and by the leaves |
| the petiole root | `leafPlan` :13180–13183, `buildLeafInto` :13268, :13281 | rooted on the DISPLACED axis at its node's depth (`nodeOffsets`), with clearance against the SWOLLEN radius (`nodeOuterR`) |

**The page, `bloom.js`:**
- `stemNodesLine` :1706 (the read-out).
- The stem record's `tip` (:2331), which now reads `stemAxisAt`.
- `voidStations`, `nodeLaw` and `emittedRings` in the metrics hook.

**The gate, `tools/bloom-harness.mjs`:** ST0–ST11 are enumerated below with what each
one now does. The restated law is `restatedStemNodes` (:5561). It reads the FLOWER's
registry defaults and the harness's own constant 3.2738, and never
`bloom-geometry.js`'s node constants.

## 3. ST clauses — what changed and why

| clause | changed? | why |
|---|---|---|
| ST0 | no | stem present/absent is unchanged |
| **ST1** (triangle prediction) | **yes** | the void's bands come from `S.voidStations` (:5820). The void ladder is noded when the stem is, so a count from the straight ladder would be wrong |
| **ST2** (on the axis, length) | **yes**, not relaxed | on a noded stem the tip is expected at the RESTATED law's axis (:5839–5844), to 1e-9. The emitted-axis-offset clause reads against each ring's own noded centre. Root on the axis, length, and the station order are all untouched |
| **ST3** (Eva's bore, emitted radii) | **yes** | the widest emitted vertex is the restated law's maximum over the emitted outer rings, not the control's radius. Bore and narrowest vertex are unchanged |
| ST4, ST5, ST6, ST8, ST11 | no | the root, the join, the channel's two statements and the hub shape do not read the axis |
| **ST7** (meridian margin) | **yes** | `Rst = NL ? NL.radius(0) : emittedMaxR` (:6243). On a noded stem the widest vertex is a swelling far below the pole; the stem leaves the head at the radius at depth 0, which is still an owner the channel does not write |
| **ST9** (channel clear in the FILE) | **new arm** | `nodedChannelAssertions` (:7568): it locates the tip ring from the restated law, confirms the root with a ring at r(0), scans its own distance at 0.02 mm, and keeps the petiole exemption. The straight arm is unchanged |
| **ST10** (plug closed) | **yes** | the bottom face area uses the restated radius AT THE TIP, because the tip may sit inside a spindle |
| **ST12** | **new** | §5 |

## 4. Decisions made without a ruling (each reversible, each named)

1. **Nodes are the leaves' nodes.** The flower puts nodes at fixed t, and its leaves sit
   on some of them. The bloom has one owner of node depths (`leafNodeDepthsMm`, via
   `leafNodeLayout`), and a node with nothing growing from it is a node nobody can see
   being a node. Consequence: **the control is inert without leaves** (hidden and inert,
   `stemNodesEligible`, the GATED row). *Undo:* give `stemNodeLaw` its own depths.
2. **Inert under an inflorescence.** A raceme's rachis carries pedicels at
   `leafNodeDepthsMm` spacing, and kinking it moves every floret. That is its own
   question. *Undo:* one term in `stemNodesAbsent` plus its registry twin.
3. **The kink turns AWAY FROM THE NODE'S FIRST LEAF**, not at the flower's golden
   angle. CLAUDE.md records that the flower's `stemCenterline` kinks at `k · GOLDEN_ANGLE`
   while its `leafAzimuths` flips leaves 180° — two laws for one arrangement — and that
   this "must not be reproduced when curvature arrives". This is the arrival. Every node
   still turns a different way for alternate, opposite and whorled leaves alike.
   *Undo:* one line in `stemNodeLaw`.
4. **The leaf-node pitch floor is mode-free now**:
   `leafNodePitchFloorMm = max(sheet, MIN_FEATURE_MM)`, where it was
   `acc.floorThickness(sheet)`. Node depths are TOPOLOGY for the stem as soon as the stem
   bends at them, and the export floor may not move them (session 32's rule). This moves
   no byte of the live matrix: the byte partition is predeclared to include any row whose
   live leaf node count differs between the trees, and none does (§6).
5. **The station placer is equal chord error**, not the flower's 49 fixed stations. The
   tolerance is `eps = R(1 − cos(π/48))`, the 48-sector ring's own sagitta, and the
   density is `sqrt(κ / 8eps)` over the radius and axis curvatures. Stations are snapped
   to a 2⁻¹² mm grid, so Node and Chromium place identical stations. This is
   `INFILL_PLAN_GRID`'s lesson learned before it cost a CI cycle.

## 5. ST12 — the new family, and its must-fails

Four arms, in `stemNodeClauses` (harness :5660), called by `stemAssertions` on every row:
- **(a) the two statements.** `stemNodesPresent` in the registry and `stemNodesAbsent`
  in the geometry must be exact complements.
- **(b) prominence 0 is the identity.** No node law, no noded rings, and stations exactly
  `[0, L]`.
- **(c) the law, off the emitted rings.** Every ring's centre and radius must match the
  restated law to 1e-9. The reference is the flower's own constants, which the geometry
  does not own.
- **(d) the phasing, off the emitted rings.** For every node with room either side, the
  emitted line's bend, read along the node's own kink direction, must peak between the
  node and one spindle below it, allowing the station gaps. The emitted swelling must be
  widest within half a spindle of the node.

**Named subject:** nodes closer than two spindles to a neighbour, or to an end, are not
read by (d). Overlapping spindles have no single peak to read. A guard clause fires if
this exclusion ever removes the only node it could speak on. This is what the
`0.01` and `whorled × 8` rows taught: the first cut of (d) fired on both, on a tree that
was right.

**`node tools/verify-bloom-stem-nodes.mjs`** is the must-fail for (a)–(d), arm by arm. It
works like #273's control: plant into REAL records built by the shipped geometry,
require each arm to fire BY ITS OWN MESSAGE, and go through `stemNodeClauses`, the same
path a real failure takes. It refuses a vacuous baseline: the baseline must be silent,
carry a law, have at least ten emitted rings and three resolvable nodes, and the
off-state must restate no law.

The two (d) plants move the reference WITH the artefact, so (c) is blind to them and only
the phasing arm can fire. The rule for those two plants is **fires alone or it has not
been shown**. Output, red and all:

```
BASELINE: noded 0 message(s), prominence 0 0 message(s); law declared, 98 emitted rings, 3 resolvable node(s), restated off-state law null
FIRED  (a) the two statements
    ST12: the registry's stemNodesPresent says true and the geometry says the stem's nodes are ABSENT on this state; the two must be exact complements
FIRED  (b) identity: a law declared at prominence 0
    ST12: node prominence 0 with leaves restates NO node law, yet the plan declares one with 3 node(s) — prominence 0 (or a stem with nothing to node) must be the identity
FIRED  (b) identity: noded rings at prominence 0
    ST12: the builder reports 98 noded rings on a stem the flower's law gives no nodes — the noded arm ran where the straight one should have
FIRED  (b) identity: a ladder at prominence 0
    ST12: a stem with no nodes carries a 3-station ladder where `stemStations` gives exactly [0, 100]
FIRED  (c) the control never reached the stem
    ST12: prominence 0.48 over the leaves' 3 node(s) restates a node law, and the plan declares none — the control never reached the stem
FIRED  (c) no noded rings reported
    ST12: the builder reports no noded rings on a stem the flower's law gives nodes — the shape of the stem is then asserted by nothing
FIRED  (c) a ring's centre a micron off
    ST12: an emitted ring's centre stands 1.000e-6 mm off the flower's node law (worst near depth 19.966 mm) — the kink the builder drew is not the one the control and the leaves ask for
FIRED  (c) a ring's radius a micron off
    ST12: an emitted ring's radius is 1.000e-6 mm off the flower's node law (worst near depth 42.939 mm) — the swelling the builder drew is not the one asked for
FIRED  (d) phasing: the bend peaks above its node (reference moved with it)
    ST12: node 0's bend peaks between depths 50.937 and 54.515 mm on the emitted stem (its station gaps), where the flower's phasing puts it just BELOW the node (22.943) and INSIDE its 9.821 mm swelling — the stem does not turn at its joint
    ST12: node 1's bend peaks between depths 83.907 and 87.262 mm on the emitted stem (its station gaps), where the flower's phasing puts it just BELOW the node (54.472) and INSIDE its 9.821 mm swelling — the stem does not turn at its joint
    ST12: node 2's bend peaks between depths 75.528 and 81.929 mm on the emitted stem (its station gaps), where the flower's phasing puts it just BELOW the node (86.000) and INSIDE its 9.821 mm swelling — the stem does not turn at its joint
FIRED  (d) phasing: the swelling widest away from its node (reference moved with it)
    ST12: node 0's emitted swelling is widest at depth 30.530 mm, not within half a spindle (4.911 mm) of the node at 22.943 even allowing its station gaps
    ST12: node 1's emitted swelling is widest at depth 61.475 mm, not within half a spindle (4.911 mm) of the node at 54.472 even allowing its station gaps
    ST12: node 2's emitted swelling is widest at depth 94.508 mm, not within half a spindle (4.911 mm) of the node at 86.000 even allowing its station gaps

STEM NODES MUST-FAIL: every one of ST12's four arms fired on its own plant, through stemNodeClauses — 10 plants, baseline silent
```

It runs in `bloom-export-watertight.yml`'s preflight job.

**Mutant witnesses** (`tools/verify-bloom-apex-mutants.mjs`) are witnessed on the MUTATED
module's own plan over two new rows: the flower's 0.48 stem, and the same stem at 0.
- `the-node-field-never-reaches-the-stem` → ST12, ST2 (also ST10)
- `prominence-zero-is-not-the-identity` → ST12
- `the-bend-peaks-above-its-node` → ST12, ST2
- `the-spindle-is-a-fraction-of-the-length` → ST12, ST3
- `the-noded-rings-stay-on-the-world-axis` → ST2, ST12
- `the-petiole-roots-on-the-world-axis` → LF2
- `the-meridian-margin-reads-the-bore` was re-anchored onto the new `stemOuterRAt` line,
  because the anchor pre-check reported it disarmed (0 matches), and it re-ran green on
  ST7.

**Run, subset of 7 of 78 (`--only`), NOT a sweep:**

```
CONTROL (unmutated tree): the family must be SILENT on every row
  fired: (none)
  the-meridian-margin-reads-the-bore         names ST7 · fired ST7   ok
  the-node-field-never-reaches-the-stem      names ST12, ST2 · fired ST10, ST12, ST2   ok
  prominence-zero-is-not-the-identity        names ST12 · fired ST12   ok
  the-bend-peaks-above-its-node              names ST12, ST2 · fired ST12, ST2   ok
  the-spindle-is-a-fraction-of-the-length    names ST12, ST3 · fired ST10, ST12, ST2, ST3   ok
  the-noded-rings-stay-on-the-world-axis     names ST2, ST12 · fired ST12, ST2   ok
  the-petiole-roots-on-the-world-axis        names LF2 · fired LF2   ok
```

**The `--neuter` control, run on both mutants the brief names.** The edit applies, the
source differs, and nothing about the behaviour changes. The run must then be REPORTED,
and it was:

```
the-node-field-never-reaches-the-stem: the edit applied but the BEHAVIOUR did not move — the mutant's stem carries 49 stations against the clean tree's 49
guard check: the sweep REPORTED the neutered mutant "the-node-field-never-reaches-the-stem" — the witness clause fires.
prominence-zero-is-not-the-identity: the edit applied but the BEHAVIOUR did not move — at prominence 0 the mutant's plan carries no node law and the clean tree's carries no one
guard check: the sweep REPORTED the neutered mutant "prominence-zero-is-not-the-identity" — the witness clause fires.
```

**The 22 PRE-EXISTING stem, leaf and hub mutants were also re-run**, because six ST clauses
changed (§3). Every one fired what it names, with one exception.
`join-reaches-past-where-it-says-it-stops` claimed ST5 and fired only ST11. **It fails
identically on a worktree of `main` at 21ddbbd**, so it was red before this PR, not because of
it. The claim was stale, not the check. ST5 asserts the join's thickness, which this mutation
does not move. The blend radius it does move has been ST11's since #242, and ST11 is what
fired. The claim is corrected to ST11 with that reason in the source, and it now reads
`names ST11 · fired ST11 ok`.

So the ST, LF and hub rows of the table are 29 of 29, as two subset runs. **This is not a
full sweep**: 78 mutants exist, and the 49 over the apex, lobe, infill, variance and
inflorescence families were not run, because this PR touches none of their code.

## 6. The prominence-0 byte partition

**Predeclared from the GUARD PREDICATE, not from labels.** `--movers-predicate stem-nodes` in
`tools/verify-bloom-surface-bytes.mjs` calls a row a mover iff THIS tree's `stemNodesAbsent`
is false on it, OR the live leaf node count differs between this tree and the base. The second
clause is there because the pitch floor went mode-free (§4.4), and it names no row. The run
covered the whole 966-row matrix in both modes against a worktree of `21ddbbd`. It went in 25
resumable `--range` chunks (`--json`), closed by `--merge`, which refuses chunks that do not
tile the matrix:

```
MERGED 25 chunks over 966 rows x 2 modes, predicate stem-nodes, base <scratch>/base
partition     : 11 of 11 predeclared movers MOVED (every one must), 955 holders compared to the bit
export stream : 1,269,415,764 floats over 141,046,196 triangles
captured grid : 80,252,220 values over 9,241 panels (live)

PASS — 0 floats moved on the 955 holders, positionally, under Object.is; all 11 predeclared movers moved.
```

The 11 movers are block 41's non-GATED rows. The 955 holders are all 953 rows of `main` plus
block 41's two GATED rows, so hidden-and-inert is measured rather than argued. **The shipping
default holds by branch.** `ALL MAX` is a holder, because it has no leaves and the control
needs them.

The tool's must-fail (`--control`, one coordinate perturbed by 1e-9) fires BOTH clauses,
export stream and captured grid:

```
FAIL — 3 finding(s):
  DEFAULT (the shipping configuration) (live): 1 of 222192 floats moved, first at index 0 (tri 0): 5.306790136879714 against 5.306790135879714
  DEFAULT (the shipping configuration) (live): grid — 1 of 4430 values moved, first at 2: 1e-9 against 0
```

(The third line of that run, `VACUOUS`, is the tool refusing a range that holds no mover.
That is correct on rows 0–6 and is a third way the tool can fail.)

**Frozen:** `--verify-frozen --phase44` PASS, deep-equal. No older phase's bytes are moved by this change, and
both halves of the predicate were checked on the frozen rows. The prominence half: no frozen row sets the control, which
did not exist. The pitch-floor half, measured over every row of every registered frozen matrix (25,413
rows, 201 with leaves), in both modes, against the base tree: **0 rows whose leaf node
depths differ.**

## 7. The wall, measured square to a leaning axis — REPORTED, Eva's to rule

Eva's bore rule is `bore = max(0, r − 1.5)`, stated on a HORIZONTAL section. The node law
leans the axis, and the rings stay horizontal. A tube of horizontal circles on a leaning
centre line is a SHEARED tube. Its wall measured square to its own axis is the horizontal
wall × cos(lean).

**It is a real property of the geometry, not a measurement artefact.** The material
between the bore and the outside, measured the way a load crosses it, is thinner by
exactly that factor. Where the swelling has died away and the lean has reached the node's
full turn, the wall is closed-form: **1.5 · cos(atan(0.13 · prom))**.

Measured by `stemPlan.nodeWallPerpMm`: the minimum of (r(s) − bore) · cos(tilt(s)) on a
0.25 mm grid. EXPORT and LIVE agree, because the bore and the law are mode-free.

| stem | prom 0.24 | 0.48 | 0.75 | 1.00 |
|---|---|---|---|---|
| 3 mm | solid | solid | solid | solid |
| 3.5 – 6 mm | 1.4993 | **1.4971** | 1.4929 | **1.4875** |
| 8 mm | 1.5002 | 1.4989 | 1.4958 | 1.4912 |
| 10 mm | 1.5139 | 1.5258 | 1.5365 | 1.5435 |
| 12 mm | 1.5608 | 1.6216 | 1.6900 | 1.7533 |

Sampling: the worst of three and eight alternate-leaf nodes on stems of 40, 100 and
200 mm, per cell.

- At the flower's 0.48 the wall is **3 microns under** the stated 1.5 (0.19%). At the
  maximum it is 12.5 microns under (0.83%).
- The shallowest dip is on the plain stretch between spindles, where the radius is back
  to the control's and the lean is at its full turn.
- At 10 mm and up, the swellings are wide enough in absolute terms to never let the
  radius return fully before the next node on these stems, so the wall stays over.
- **On the flower's own 100 × 6 mm three-leaf stem the wall reads 1.5037 at 0.48**,
  because the stem ends before any stretch returns to the plain radius.
- **At `stemDiameter` 3 the stem is solid and the question does not arise**, as the
  brief says. `nodeWallPerpMm` is null there and the read-out says so.

**What would close it if Eva wants it closed:** widen the wall by `1/cos(lean)` where the
axis leans, i.e. `bore = max(0, r − 1.5 / cos(tilt(s)))`. That is one line in the
builder's inner ring and moves only noded rows. It was **not** done, and no clause
asserts either reading. The read-out prints the measured figure on every hollow noded
stem.

## 8. Triangle cost — why it is higher than the flower's 1,568, and whether it is avoidable

| stem (EXPORT, 100 mm, three alternate leaves) | stem triangles | stations |
|---|---|---|
| any, prominence 0 | 476 | 2 |
| 6 mm, 0.24 | 6,812 | 35 |
| 6 mm, 0.48 | **9,404** | 49 |
| 3 mm, 0.48 (Eva's approved, solid) | **5,948** | 61 |
| 6 mm, 1.00 | 13,436 | 70 |
| 4 mm bore, 1.00 | 16,700 | — |
| whorled × 8, 0.48 | 11,420 | — |

Whole bloom at the flower's setting is **43,368** (6 mm) and **39,912** (3 mm), against
34,440 / 34,248 at prominence 0 (measured, EXPORT).

Worst reachable row in block 41 is `whorled × 8` at 98,892 tris, 6.6% of the budget.

The flower's stem is `49 stations × 16 points × 2 = 1,568`, and it is solid. The bloom's
stem ring is `HUB_SECTORS` = 48 points, three times the flower's, so the stem matches
the hub it joins. A hollow stem draws a second, bore ring at every station on top of that.

So at an equal station count the bloom pays **3×** for the ring and **2×** for the bore:
6 × 1,568 ≈ 9,400. That is what the 6 mm row reads, at 49 stations.

The solid 3 mm stem pays only the 3×, but it takes MORE stations (61). The placer holds
the chord error to the ring's own sagitta, which scales with R, while the curvature
scales as 1/R. So the station count scales as L/R.

**Avoidable, at a named price, and not done:**
1. **A 16-sector noded arm** would cut a third of it. But the ring would then change
   facet count as the control leaves 0, so the stem at 0.01 would visibly re-facet
   against its unnoded neighbour, and the hub join's 48-sector seam would stop meeting a
   48-sector stem.
2. **The flower's 49 fixed stations** instead of the chord-error placer would hold the
   3 mm stem at the 6 mm figure. But the 3 mm stem's spindles are 4.9 mm long, and 49
   uniform stations over 100 mm put about two rows across each one. The phasing would
   then be drawn by chance.

## 9. Frozen phase, smoke, matrix

- **`frozen/phase44`** is the 953 rows at `21ddbbd`. It is registered in both
  `FROZEN_MATRICES` and `FROZEN_BASE_COMMITS`, and `--verify-frozen --phase44` reads
  PASS, deep-equal. It is pre-declared in `TAG_PUSH_XFAIL`, because this PR edits
  `bloom-export-watertight.yml` after 21ddbbd (phase42's refusal class).
- **Block 41, "STEM NODES"**, is 13 rows (953 → 966). Two of them are GATED holders.
- **Smoke block 41** is 4 rows. `--check` reads **126 smoke rows over 37 blocks** of 966;
  the block count rose from 36.
- All 13 export watertight through `verify-bloom-export.mjs --only "^STEM NODES:"`:
  degenerate 0, 0 within-shell census pairs, O1 OK, and live tris = export tris on every
  row.

## 10. Local gates run before the push

| gate | result |
|---|---|
| `verify-bloom-export.mjs` + `verify-bloom-connectedness.mjs` over the smoke subset **less `ALL MAX`** | **PASS 125 of 125** each: watertight, one connected body. `ALL MAX` hits the harness's 30 s settle timeout on this box and does so on the base tree too (CLAUDE.md records it), so it is left to CI, where the full matrix is the merge criterion |
| `verify-bloom-panel.mjs` / `--negative-control` | PASS / all twenty routes observed the failure |
| `bloom-smoke --check` | 126 smoke rows over 37 blocks (was 36), 120 families claimed |
| `verify-bloom-stem-nodes.mjs` | 10 of 10 plants fired, baseline silent |
| `verify-bloom-stem-channel`, `bloom-wall-thickness`, `bloom-combination-gate` | clean |
| `verify-bloom-leaf-decoupled` | PASS. **It exited 1 on a PASS on `main` too** (reversed branches — the sepal tool's defect one tool later); fixed in this PR |
| `--verify-frozen --phase44` | PASS |
