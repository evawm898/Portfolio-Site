# Bloom — stamen length variance and the 120 mm ceiling (F1.2)

Session outcome, Oct 13. Eva's rulings of Oct 12 (`docs/reference-flower-feature-map.md` §11,
Q2.1 / Q2.2) govern; nothing here re-litigates them. Base: `main` at `c1fc595`.

## §1 What shipped

- `stamenLengthVariance` (Androecium, 0–1, step 0.05, default **0**): each filament is built at
  `length × (1 + amount × u_i)`, `u_i` in [−1, 1] **random per stamen and seeded from the stamen's own
  index** — never a control, never the shared variance wave (Q2.1). Hidden and inert with no
  androecium; at 0 the built length IS the control's double, by branch.
- `stamenLength`'s ceiling is a **fixed 120 mm** (Q2.2), the floor stays 5; both ends are the
  geometry's `STAMEN_LENGTH_RANGE`, imported by the registry and the clamp alike.
- A varied length is **clamped to 5..120 mm and told** on the control, on the STAMENS line
  (`±50% random per stamen (seeded from its index) → 15.2–21.6 mm built, 3 of 6 CLAMPED …`) and on
  the SLENDERNESS line, which now reads the **longest built filament**: at 120 mm on the shipping sheet
  **L/d 100.0 — UNMEASURED — no coupon has been printed**, verbatim. Nothing clamps on it.

## §2 The law and its one owner

`stamenLengthFor(i, lengthMm, amount)` in `bloom-geometry.js` is the one owner; `footRing()` stamps
`lengthMm` / `lengthAskedMm` / `lengthClamped` on each stamen's record and `buildStamenInto` reads
`s.lengthMm` and computes nothing. The seed is an integer mix (`Math.imul`, `>>>`) of `index + 1`,
exact in every engine, so the page's V8 and Node's hand every stamen the same unit and X0 has no last
bit to disagree on.

**A defect the Node probe found before any gate ran:** the first cut's last XOR produced a SIGNED
int32, so half the units fell below −1 and six filaments at `20 mm × 0.5` read `5.00 18.14 16.25 5.00
5.00 15.24` — three on the floor. Every step now ends in `>>> 0`. Units 0..11 read
`0.084 −0.186 −0.375 0.155 0.054 −0.476 −0.654 −0.419 0.761 −0.385 −0.758 0.651`.

## §3 The gate families

- **JS8** (new, in `stamenAssertions`, both STL gates): the law restated from the controls and the
  index — the hash written out a second time in the harness on purpose — read against the EMITTED
  rods: each rod's outer-root-to-tip chord must be `L_i · sinc(c/2)` (the uniform arc's own chord;
  `L_i` at curl 0, `2L_i/π` at 180). Both directions on the clamp, the owner's clamped count and
  extremes, SLENDERNESS as the longest built length over the diameter, and at amount 0 every chord the
  control's own length. The builder's `lengthMm` record is read by nothing here as a reference.
- The mutant table (`tools/verify-bloom-apex-mutants.mjs`) **never ran `stamenAssertions` before this
  session** — every JS clause was invisible there by construction. It runs them now (`/^(JS\d+):/`),
  with four mutants each witnessed on the MUTATED module's own descriptor: `the-length-variance-is-
  ignored`, `the-variance-is-the-same-for-every-stamen`, `the-seed-is-not-the-index`,
  `the-ceiling-is-unclamped` (probed at 120 × 1, where half the draws ask past the ceiling; inert on
  the 20 mm row by construction). Results: §3a below.
- Block 23 gains five rows (1302 → 1307) and its two length-max rows move to 120; `STAMEN_MAX`
  carries the variance at 1, so the three GATED rows police the new control's inertness under SPHERE
  and at count 0. The smoke subset gains two rows (220 over 56 blocks; 178 families both ways).
- The harness refuses to load if the registry's `stamenLength` / `stamenLengthVariance` bounds are not
  the geometry's.

### §3a The mutant table

`node tools/verify-bloom-apex-mutants.mjs --only=<the four> --rows='stamen|shipping default'`: **4 of 4 fire JS8 and the clean tree is silent on every row; 162 anchors, 162 matching their find-string exactly once.** A row subset (3 of 70 rows), not a sweep of the table; the full table runs in CI (`bloom-apex-mutants`).

## §4 The byte partition

Predicate `stamen-length` in `tools/verify-bloom-surface-bytes.mjs`: a row moves iff the BASE tree's
own `footRing()` builds an androecium on it, the row asks a variance above 0, and the law — restated in
the tool, never imported — hands some stamen a length other than the control's. The 120 mm ceiling
alone moves nothing (both trees build the state they are handed). Predeclared: the five new block-23
rows minus the plain `length max (120)` one, i.e. **4 movers**; `ALL MAX` a holder (the variance is a
STAMEN_SUB, out of the blanket sweep).

**MEASURED, PASS: 4 of 4 predeclared movers MOVED and 0 floats moved on the 1,303 holders, positionally under `Object.is`, over the whole 1,307-row matrix in both modes — 1,594,298,592 export floats over 177,144,288 triangles and 84,145,484 captured-grid values** (four `--range` chunks closed by `--merge`, each chunk against a worktree of `c1fc595`). The four movers are block 23's `length variance 0.5`, `120 DISC x length variance max`, `length max (120) x variance max` and `length min (5) x variance max`; the two length-max rows at 120, the long-rod corner and `ALL MAX` are holders. `--control` perturbs one coordinate by 1e-9 and fires both clauses (export stream and captured grid).

## §5 The combination check — the long-rod corner

A new measure, `stamen-stamen` (every rod segment and anther of one stamen against every one of
another, the builder's own stations and the owner's radii, floored at 0), on two tier-3 pairs,
`stamenlength-x-curl` (six on a ring; length 20/60/120 × curl 0/90/180/−180) and
`stamenlength-x-count` (the disc; length 20/60/120 × count 0/6/30/120).

**The length is inert on both — measured, 1.3e-15 mm and exactly 0 across 20..120 — and the hazard
is the curl's and the count's alone.** Six filaments at a positive curl all bend in over the centre and
cross at the axis at every length (0.000 mm, −1.200 unfloored: two rods coincident); on the disc the
approach is set at the roots and straight rods keep it to the tip (six 0.000, thirty 0.017, the
120-cushion 0.000). Fifteen cells declared by value, both length axes in `COMBINATION_INERT`, both
verdicts `single-reaches`. Nothing clamped; the read-out's ROOTS FUSE / ANTHERS TOUCH flags already say
it. The guess written into the curl pair before measuring ("clears") was wrong the other way and is
recorded as such in the pair's `why`.

## §6 ALL MAX, before and after

`ALL MAX` is a holder by construction: `stamenLength` is a STAMEN_SUB (hidden at DEFAULTS, out of the
blanket sweep, as it always was — the brief's premise that the sweep hands it its new max is false on
this tree and was checked), and so is the variance. Census through `bloom-xfail-magnitudes
--include-refused`: **93,107 pairs / 13.6547 mm, reproducing its recorded entry exactly**. Refusal
entry 2,716,406 triangles.

Triangle count, measured in Node on both trees: **2,716,406 in EXPORT and in LIVE on `c1fc595` and on this tree alike**, with `stamenLength` 20 and the variance 0 (absent on the base) on the row's own coerced control set. The refusal entry is untouched.

## §7 Census

`node tools/verify-bloom-export.mjs --only '^STAMENS: '`: **29 of 29 attempted rows reached the results and export watertight**; 26 of 29 free of within-shell self-intersection and the 3 declared ones (`120 DISC x Head rise 1`, the APEX CORNER, the INCURVE-sphere GATED row) still failing at their recorded magnitudes (X1). **Every new row reads 0 pairs**, so no entry is added. The two new smoke rows read `components=1 stray=0` through the connectedness gate (a first `bloom-smoke --conn` went red on a 30 s settle timeout while the byte partition saturated the box; re-run alone, green).

## §8 The sheet

`node tools/shot-bloom-stamen-variance.mjs <dir>` → `docs/img/stamen-length-variance.png`: six on a
ring and 120 on the disc at variance 0 / 0.50 / 1.00, one camera per row, from the side and off the
axis; the 120 mm end from the side (straight, with the variance at its maximum, and at the curl
ceiling); and the byte claim (the variance at maximum with count 0 exports the default's own sha,
required equal). Print preview on, JS0–JS8 asserted before every shutter, no pixel delta quoted.

## §9 Frozen phase

`frozen/phase65` is the **1302 rows at `c1fc595`**, registered in `FROZEN_MATRICES` and
`FROZEN_BASE_COMMITS` (65 was the newest number on `main` at registration; the parallel design-file
session adds no rows). Owed because block 23 grows by five rows and two of its row definitions move.

**The tag dispatch, read back (run 38441209204, from `main` at `50fafc9`, after the merge):**
56 tags published and correct, 7 missing but declared, and **`frozen/phase65` REFUSED** —
`refusing to allow a GitHub App to create or update workflow .github/workflows/bloom-panel.yml`.
The design-file session (#403) edited that file after `c1fc595` and merged while #402 was in CI,
so the base's `bloom-panel.yml` differs from `main` HEAD's and the rule of thumb in `CLAUDE.md`
applies. Two sessions in flight against one base make a refusal nobody could declare in advance;
it is declared in `TAG_PUSH_XFAIL` now, by the follow-up PR. The registration is the load-bearing
half: `bloom-frozen-matrices` proves phase65 deep-equal on every push, and `c1fc595` is on `main`.

**And the mutant sweep's shard 1 was cancelled by the 150-minute job cap at 38 of 41 mutants,
every one `ok`** — 3.9 min a mutant against shard 0's 3.05 on the same table; the re-run passed
in 2h12m. The workflow goes to six shards in the follow-up PR. Nothing in the geometry.
