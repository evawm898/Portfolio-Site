# The full-sphere head, session 18 — what was built, what the instruments say, and the two things left to a ruling

Session 18 built the FULL SPHERE: a `hubShape` enum (CAP / SPHERE) in a new Head section
with `headRise` regrouped as the cap's own sub-control, the sphere as the CONTINUOUS spiral
re-keyed on polar angle (one equal-area sequence pole to pole on a closed shell, lean 0,
the far pole reserved), four new assertions (S1–S4), four generalised ones (J5, J8, J9,
crowding R4), J6 nulled under SPHERE, the crowding raster evaluated in the surface's own
coordinates over the full arc, a LOUD plan-coverage skip, matrix block 22 with its smoke
rows, panel route (m), and the sphere sheet. The charter's session-18 entry carries the
rulings and the doctrine; this document carries the numbers, the mutant table, and the two
things Eva asked to be said in so many words.

Everything below is the EXPORT reading unless it says live, registered against a real STL.

## Two things the kickoff prompt had wrong, said plainly so the next reader does not inherit them

- **#106 and #108 are FLOWER issues, not bloom ones.** Both cite `flower-sdf.js`'s lathe
  shoulder and the flower gates' `xfail: 106` rows; no bloom file references either. The
  bloom's centre attaches by construction on a flat hub (footprint inside the hub disc,
  z-span crossing the slab) and by a measured patch on a cap (session 14). Neither was
  touched, on Eva's ruling.
- **The head-rise arc domain is 0–90°, as the prompt assumed — but the reason the cap cannot
  be continued past the equator is not the arc, it is the KEY.** Every ring descriptor was
  keyed on plan radius (`asin(radius / Rd)`, a positive square root for the height), and plan
  radius is not injective past the equator. The sphere arm re-keys on polar angle; that is
  the whole structural change, and it lives inside `footRing()`'s continuous arm as a branch.

## The two guarantees, stated apart (Eva, Sep 5)

1. **The geometry guarantee.** SPHERE is a value nothing pre-existing selects, so every
   earlier export is bit-identical by construction — the CONTINUOUS and FAN precedent.
   Measured on the retention ruling's terms: phase14 (499 rows frozen at 5312845) on a
   worktree of 5312845 and on the branch head — **499/499 bit-identical, 0 moved, defaults bit-identical** (`tools/diff-bloom-bytes.mjs --compare`; the base tree reads "5312845+dirty" from the gitignored node_modules symlink, nothing else).
2. **The UI move.** `headRise`'s predicate (`not sphereMode`) is TRUE on every pre-existing
   row, so its move from ARRANGEMENT into the Head section changes no predicate's value and
   no byte — session 16's PETAL FORM / PETAL CURL precedent. The three-value FLAT / DOMED /
   SPHERICAL enum was rejected because it could not make this claim: 35 phase13 rows and 42
   live rows pin `headRise` above zero with no hub-shape value and would have built flat.

The live partition, by label, against the base tree's phase14 export: <<LIVE>>.

## The mode, in numbers

| configuration | feet | tris (live = export) | STL | sphere R | reserved pole clear | nearest foot end to the face pole |
|---|---|---|---|---|---|---|
| shipping sliders, SPHERE | 8 | 17,664 | 863 KiB | 8.84 mm | see sheet | see sheet |
| the INCURVE sliders, SPHERE (the headline) | 120 | 156,096 | 7,622 KiB | 12.51 mm | 1.62 mm (7.40°) | 0.12 mm (no foot crosses it) |
| 40 per turn × 6 turns, SPHERE | 240 | 304,416 | 14,864 KiB | 32.72 mm | 2.99 mm | feet cross it |
| the mum's sliders, SPHERE | 120 | 156,096 | 7,622 KiB | 4.69 mm | see sheet | see sheet |

The hub's triangle count is a three-valued branch now: 192 flat, 3,456 cap, 6,720 sphere
(two concentric spheres of 36 latitude steps, each closed by an explicit apex fan at both
poles; the cap arm handed 180° would have collapsed its rim band onto 48 coincident points,
the DOME centre's own 48-degenerate-triangle defect). The panel gate asserts all three.

**Crowding on the sphere, the export reading on the surface** (R1–R5 all pass on 120 and
240 far-side feet — the (s, θ) raster and its fine pass converge):

| configuration | cap (rise 1 or flat) | SPHERE D_max / D_mean | at the FACE pole | at the RESERVED pole |
|---|---|---|---|---|
| the incurve sliders | 5 / 2.06 (rise 0.5) | **2 / 1.00** | 1 | 1 |
| 40 × 6 | — | 2 / 1.01 | 1 | 1 |

A full sphere has four times the surface of its equatorial disc, and the equal-area
lattice gives every foot the same patch: the incurve sliders that stack five deep on the
cap stack two deep on the sphere, and depth 1 within one step of either pole. The blind
spot is unchanged and still the one the sheet is for — this instrument reads the ROOT
EXIT, never blade-to-blade crowding above it, and the face pole's question is the blades.

## Q1b — lean 0, and what the faded lean would cost

Built: lean 0. On the sphere `domeLean` is exactly 0 on every ring, J9 asserts it, and the
blade leaves the surface at its authored tilt from the local tangent, heading away from the
face pole, everywhere. The cap's law (`domeLean = slope`, "restore the flat ring's global
aim") continued past the equator gives a far-pole petal an effective tilt of tilt + 180°:
minus the local direction, aiming back up into the bloom. Mutant M-J9 below is that law
continued, and J9 is its witness. The mirror alternative (flip the tilt's sign below the
equator) is a jump of twice the tilt in aim across the equator — a seam.

**The faded lean, costed and not built:** `domeLean = slope · cos²(φ/2)` — the cap's value
to first order near the face pole, 45° at the equator, 0 at the reserved pole; continuous,
seam-free, and a fitted law rather than the primitive's own. Cost: one expression in
`footRing()`'s sphere arm, J9's `wantLean` arm reconstructing it from the ring's own slope
(the J9 doctrine: from OTHER owners), a mutant (the fade at the wrong power), two matrix
rows, and a before/after pair on the sphere sheet. It moves no cap or flat byte (the cap
arm is a branch). What decides it is the face-pole crop on the sheet: if the face pole
reads reflexed and bald under lean 0, the fade is the lever; if it reads as a crown, lean
0 stands.

## S1–S4, and the mutant table

| assertion | what it reads | first family to fire, on the smoke SPHERE rows |
|---|---|---|
| S1 | polar angle strictly decreasing; cos φ steps by exactly 2/K; mirror-symmetric about the equator; reaches both poles within one step; arc / height / radius are the sphere's own functions of φ | **S1** (M-S1) |
| S2 | the hub builder's own report says `closed` iff the owner declares a sphere | **S2** (M-S2) |
| S3 | no emitted foot row at or past the reserved pole; the clearance is positive AND at most one equal-area step; the read-out's number is the geometry's | S1 first, **S3 alone with S1 suppressed** (M-S3) |
| S4 | under SPHERE the rise is inert (rise 1 / built 1, hub radius = sphere radius, centre on the equator); the bit-identity across the slider's range is the GATED rows | the byte diff and route (m) |
| J9 (sphere arm) | `domeLean` exactly 0 on every ring | **J9** (M-J9) |
| the loud coverage skip | a SPHERE row that emits a plan number fails the RUN | **the run fails** (M-COV: a false clean of 0.0% / 0.08 mm on the incurve sphere) |

| mutant (a throwaway copy of the tree, the five smoke SPHERE rows) | boundary / degen | live = export | RADIAL control row | first family to fire | with S1 suppressed |
|---|---|---|---|---|---|
| shipped tree | 0 / 0 | yes | clean | **silent, 5 of 5** | — |
| M-S1 the sequence stops at the equator (cos φ runs −1..0) | 0 / 0 | yes | clean | **S1**, 4 of 4 sphere rows (the step is half of 2/K; rings 0 and K−1 are not mirror images; the last foot is 0.94 in cos φ from the face pole) | — |
| M-S2 the hub builds the cap arm under a sphere | 0 / 0 | yes | clean | **S2**, 4 of 4 ("the hub builder reports an open cap") | — |
| M-S3 the sequence shifted half a step onto the reserved pole | 0 / 0 | yes | clean | S1's mirror clause, then S3 | **S3 alone**, 4 of 4 ("0 mm past the reserved pole"; "a foot row at polar angle 180°") |
| M-J9 the cap's lean continued onto the sphere (`domeLean = slope`) | 0 / 0 | yes | clean | **J9**, 4 of 4 (lean 151° on the defaults' first ring, 172.6° on the incurve sphere's — the built tilt past 180°) | — |
| M-COV the plan raster forgets to skip the sphere | 0 / 0 | yes | clean | **the loud skip**, 4 of 4 — and the number it emitted on the incurve sphere was 0.0% uncovered, bald cap 0.08 mm: THE FALSE CLEAN, read from below | — |

Every mutant exports watertight (boundary 0, 0 degenerate) at identical live and export counts on every row; the STL gates see none of it. M-S3 is the session-17 case: a red-then-green control names a witness EXISTS, and S3 is named its own witness only because S1 was suppressed and it fired alone.

Every mutant exports watertight with zero degenerate triangles at identical live and export
triangle counts — the STL gates see none of it, which is why the assertions exist.

## The reserved pole — the finding for the report

Eva's Q4 reading, confirmed and asserted: the pole opposite the arc origin is clear of feet
by construction (feet run toward the face pole along the meridian; the nearest ring row sits
one half-step from the pole — 1.62 mm at 120 feet on a 12.51 mm sphere, 2.99 mm at 240 on a
32.72 mm one), and S3 holds that in both directions. Whether the converging blade tips COVER
it is a solid-angle question the sheet answers by eye until session two's instrument exists:
<<RESERVED_FINDING>>.

## A pre-existing defect in the `--conn` path, found by running it

`node tools/bloom-smoke.mjs --conn` — REQUIRED for a new geometry mode (session 17's
ruling) — could not pass before this session: the connectedness gate's VALIDITY 2 (the
petalCount 3 / 40 triangle pair) and VALIDITY 3 (the DEFAULT row against the three
foot-response rows) are matrix-level claims with no `--only` guard, so every filtered run
reported HARNESS INVALID with "rows missing from results" while all 33 rows read one piece.
The crowding-coverage claim one line below them already carried the guard, and the export
gate suppresses all of its matrix-level claims under `--only`. Session 17's own `--conn`
measurement (21/21 one piece on the dome mutants) was therefore quotable only as the voxel
verdict with the run self-reporting invalid — which is how the charter records it. Both
checks now carry the same guard; per-row validity is untouched, and a filtered run is still
never a pass of the matrix.

## What this session did not touch, verified at close

The predeclared list, byte-identical to 5312845 by `sha1sum -c`: every `flower*` file and
flower tool, `tools/chromium-harness.mjs`, cards, the tracker, and the twelve frozen matrix
functions phase2–phase13 with `FROZEN_BASE_COMMITS`'s twelve entries above phase14. Eleven
`frozen/*` tags on the remote, as session 17 left them. Verified at close: `git diff --stat 5312845 HEAD` over every flower file and tool, the cards and tracker files and `tools/chromium-harness.mjs` is EMPTY; all 13 older frozen functions (legacy, phase2–phase13) deep-equal to 5312845's by a JSON comparison of their output; `FROZEN_BASE_COMMITS` phase2–phase13 identical; `git ls-remote --tags origin` reads 11 `frozen/*` tags, as session 17 left them.

**Owed after the merge:** `frozen/phase14` (base 5312845, a commit on `main`) is published
by dispatching the `bloom-frozen-tags` workflow from `main`; until it is, the base is kept
alive by `main`'s history alone.

## Verification

- Smoke subset with the flood fill (`node tools/bloom-smoke.mjs --conn`, 33 rows over 20
  blocks — block 22's five rows derived by the guard's own method): clean — export gate 33/33 watertight, 0 degenerate, identical counts, every family green, 4 SPHERE rows a labelled coverage skip (299 s); connectedness 33/33 ONE piece (271 s), on this box under load, timings anecdotal.
- Export gate on all 28 block-22 rows: 28/28 watertight, 0 degenerate, identical counts,
  every family green, 28/28 labelled coverage skips, 295 s on this box.
- Panel gate: PASS — the Head section's path-route witness drives `headRise` to 0.5 inside the collapsed section and the hub builder's own count moves 192 → 3,456; route (m) walks CAP → SPHERE → rise 1 hidden (the build does not move) → CAP → RADIAL with SPHERE stored → CONTINUOUS → the apex corner (CLAMPED), asserting the hidden rise, the closed hub, the three hub counts and the HEAD: FULL SPHERE line with its reserved-pole number against the owner; negative control: PASS, 1,392 deliberate breaks caught, ALL ELEVEN ROUTES fired (the sphere line frozen is what route (m) sees).
- `--verify-frozen --phase14` against a worktree of 5312845: PASS, 499 rows deep-equal.
- The full 527-row matrix on both STL gates runs in CI on the merge commit — the merge
  criterion, not run locally (session 17's ruling).

## The sheet

`node tools/shot-bloom-sphere.mjs <dir>` — every cell PRINT PREVIEW ON, chrome hidden,
auto-rotate off, asserted; the incurve sliders on a sphere beside the same sliders on a cap
at a hemisphere on one camera; the FACE-POLE crop (25° off the axis, and straight down it)
for Q1b; the RESERVED pole from below; the 240-foot row; the sparse and mum cases; and the
byte claim on the sheet itself (Head rise 1 under SPHERE REQUIRED to export the headline's
sha; SPHERE stored under RADIAL REQUIRED to export the default's). Held for Eva's ruling;
merge is released by it.

WAITING ON EVA: the sheet ruling
