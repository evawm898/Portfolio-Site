# Knit Lab — yarn-level knit feasibility spike (Oct 21, phase 2 the same day)

`/knit-lab.html` (noindex, unlinked). Ten wales × ten courses of stockinette knitted flat from one
yarn — plain, or with one eyelet row across the middle — the yarn a chain of points relaxed with XPBD,
settled, then **loaded to a load limit and unloaded**. Phase 1 asked whether the browser can do this
at interactive speed and whether the result behaves like a knit (yes, on the CPU, for 10 × 10).
Phase 2 made the physics trustworthy before adding stitches: friction that behaves like yarn, a yarn
that stays inextensible under load, a load–unload cycle, yarn overs and k2tog, and the simulation in a
Web Worker. Phase 1's record is kept below the phase-2 section; where phase 2 overturned it, it says so.

## Phase 2 — what changed and what it measured

All numbers: `node tools/verify-knit-lab.mjs --browser --rates` on this container (Intel Xeon @ 2.10 GHz,
4 cores, Node 22, headless Chromium with a software canvas). Model units throughout (no newtons).

### 1. Friction: the cause was not friction

Diagnosed before tuning, against the three hypotheses in the brief:

- **Is the Coulomb cap the normal correction of THAT substep?** Yes — and it already was: the normal
  multiplier is zeroed every substep and there was one iteration, so the cap read this substep's
  correction. Phase 2 makes that explicit for any number of iterations (a per-pair tangential budget
  `μ·λn − λt`, both zeroed every substep). The opposite — a cap read from a normal multiplier that
  ACCUMULATES across substeps — is the gate's must-fail mutant: its soft region is 2.47× the
  frictionless one and the yarn tears to 218% strain.
- **Contact stiffness?** Not the cause: contacts are hard (compliance 0) in every run, frictionless
  ones included, and those rearrange freely.
- **Rest gauge too tight?** It is tight — 17.4 d of yarn a loop, so the plain swatch jams at ~22–25%
  — and a looser gauge (wale pitch 5.0, 20.4 d a loop) lengthens the soft region to ~35% and shrinks
  friction's share; but μ 0.25 does not lock at the tight gauge either, so it was left as it is.
- **What it actually was:** the phase-1 measurement ("μ 0.1 locks the loops, 12.7% strain") was taken
  before the yarn's end was tied, and it read the end of the pull: the swatch unravelling from its
  free tail plus the one-sweep stretch solve letting the yarn run to 12% past the jam. Re-measured with
  the tail tied, μ 0.1 and μ 0.25 keep the soft region (0–10% stiffness ×1.3 of frictionless) — the
  yarn stretch past the jam was the stretch solver's, which item 2 fixed.

**Measured (gate F): at μ 0.25 the soft region is 9,191 load per d of jaw travel against 7,353
frictionless (1.25×), and the jam (stiffness 10× the soft region) is at 22% against 25%.** μ 0.25 is
now the default.

### 2. Inextensible under load: a direct solve along the yarn

The stretch constraints are now solved **all at once each substep**: J·W·Jᵀ for a chain is
tridiagonal (diagonal w_i + w_{i+1}, off-diagonal −w_{i+1} n_i·n_{i+1}), so one Thomas sweep —
the same O(n) cost as a Gauss-Seidel sweep — is the exact linearised solve (Deul et al. 2018 do this for
rods). A pinned point splits the chain by itself. Not more iterations (4 Gauss-Seidel iterations cost
2.8× and still reached 2% strain at 35%), and not long-range constraints (a knitted yarn is curved, so
a distance bound to an anchor is slack and does nothing).

| | strain at rest | strain at the jam | at the load limit | what ended the loading |
|---|---|---|---|---|
| phase 1 (one Gauss-Seidel sweep) | 0.87% | ~1% | 5% stop at +39% | the 5% strain stop |
| phase 2 (tridiagonal) | 0.00% | 0.00% | **0.04% (plain), 0.08% (eyelet)** | the load limit |

The test now ends on `LOAD_LIMIT` (10⁶, several times the load at the jam: 162k plain, 99k eyelet);
the 5% strain stop stays as a safety and the gate asserts it never fires. Past the jam the load rises
monotonically to the limit (never below 100% of its running peak). Must-fails: a yarn 2,000× more
compliant trips the 1% check; the old one-sweep solver ends on the strain stop; an untied tail
collapses the load past the jam to 44% of its peak.

### 3. The load–unload cycle

After loading, the comb returns to where it was clamped at the same speed and holds 90 frames, still
logging. Hysteresis = loading work − work given back (as a fraction of the loading work); permanent
set = how much further out the unloading curve is than the loading curve at the same small load
(2% of the peak above the preload).

| swatch | μ | work lost | permanent set |
|---|---|---|---|
| plain | 0.25 | **29.5%** | **8%** |
| plain | 0 | **4.5%** | **3%** |
| eyelet | 0.25 | 31.5% | 15% |

**With friction: a clear loop and a nonzero set. Without: they nearly vanish — but not to zero, and
here is why.** The frictionless remainder is rate-dependent: at 0.5 d/s instead of 1.5 it falls to
2.4% lost (and friction's to 9%; see "rate" below). It is the solver's own dissipation — a
position-based contact is perfectly inelastic, so loops that slide past each other lose the normal
part of their relative velocity — plus the jaw-relative damping. **That damping was the big part:**
at the phase-1 value (15/s, a settling device) the frictionless swatch lagged the jaw on the way back
and lost 20.6% with 14% set, almost as much as with friction. The test now uses `PULL_DAMPING` 1;
settling keeps 15. The plot on the page is log-load against extension, loading in petrol and unloading
in ink, the other swatch's last test in grey.

### 4. Yarn over and k2tog

`placeCourse` now has a case per parent count, and the solver did not change:

- **k2tog** (`through: [right, left]`): the new loop stands on the LEFT parent's wale, and the RIGHT
  parent's head is drawn over the left one's (wider, its inner leg crossing in front of the new loop's
  legs, its head between those legs and the left parent's head, which steps back). The depth
  choreography (`DECREASE_SHAPE`) was found by a sweep that maximised the start's closest approach.
- **yarn over** (`through: []`): stands between its neighbours in the course, in the gap the decrease
  left; its legs pass through nothing.
- At the knit's own depth there is not a diameter between the new loop's legs and the two stacked
  heads, so **the start is drawn 2.5× deep (`INITIAL_DEPTH`) and the plates close to ±1.6 d over 90
  frames while the yarn reels in to its true length** (resampled at the true yarn's arc length, so the
  yarn is exactly as long as the flat drawing). Plain stockinette goes through the same start.
- **Linking numbers prove the drawn start is the charted knit** (`legLinks`, gate T): each half of each
  loop, closed far behind the fabric, must link exactly the loops it was pulled through, once. A whole
  child loop does not link its parent (its two legs cancel), so halves are used. Plain: every leg −1
  through its parent; eyelet: every k2tog leg through both parents, every yarn over through nothing.
  Must-fail: the k2tog drawn without the right parent's head moved over (8 loops wrong).
  **It is only valid on the drawn start**: once relaxed loops overlap in plan, the far closure itself
  can pierce a parent, so the check reports those pairs UNDETERMINED; after the start, topology rests on
  the pass-through certificate (held on every substep of both audited runs).

Demo chart (`makeEyelet`, 3,560 points against plain's 3,476): stockinette with course 5 = `k1, (yo, k2tog) × 4, k1` — the usual eyelet
row, with plain edge stitches so no yarn over hangs off a selvedge (the first cut put one there).

**Does the eyelet row open into visible holes? Yes.** Openings measured face-on (the yarn drawn as a
band one diameter wide, enclosed empty regions, their inscribed radius): **4 openings of radius ≥ 1 d
in the eyelet course, settled (r 1.79, 1.60, 1.17, 1.03 d) and at +20% (2.01, 1.80, 1.43, 1.40 d)**;
the plain swatch's same course has none (largest 0.85 d, at a selvedge; interior ≤ 0.45 d).

**Does it jam at a different extension? Yes, much later: 43% against 22%**, with a soft region less
than half as stiff (4,040 per d against 9,191) — the yarn overs carry a loop's worth of slack each and
the decreases pull the course in, so the swatch lengthens a long way before anything jams.

### 5. The Web Worker

`knit-lab-engine.js` runs a `KnitSim` and reports by message; `knit-lab-worker.js` hosts it; the page
only draws, reads and sends. `#WORKER=0` runs the same engine on the page's thread with the first
version's 80 ms bursts. **Measured over 6 s of settling (gate W, two runs): with the worker, gaps
between animation frames p50 33 ms, p95 50 ms, longest 67–83 ms (headless Chromium paints at ~30 fps
here with nothing to do); on the page's thread p50 133 ms, p95 150–167, longest 167–183.** The bar is
p95 < 60 and nothing over 100 ms; the worker's longest gap is closer to it than the p95 is. No other
performance work: a sim frame is still ~40–45 ms (1.3 ms a substep), so the swatch moves at ~22 frames
a second of simulation while the page draws at its own rate.

### Rate

`--rates` (0.5 d/s instead of 1.5): plain μ 0.25 loses 9.1% with 4% set (29.5% / 8% at 1.5),
frictionless 2.4% with 2% set (4.5% / 3%).
Friction's share falls with speed too, which a pure Coulomb model would not do — the hypothesis (not
isolated) is that at 1.5 d/s the swatch's own vibration adds frictional micro-slip. Quasi-static
answers want a slower test; the page runs at 1.5 d/s to stay under a minute.

### Page against Node

The page and the gate run the same modules; the page's numbers come out a little different (plain
30.2% lost / 8% set, eyelet 30.6% / 14%, eyelet jam 43%) because the browser's V8 and Node's differ in
the last bits of transcendental functions and the run is chaotic enough to amplify that. The gate's
figures are the reference.

### Screenshots

`docs/img/knit-lab/`: `plain-settled.png`, `eyelet-settled.png`, `plain-mid-pull.png`,
`eyelet-mid-pull.png` (both at +20%), `load-unload-plot.png` (both swatches' cycles), and the
phase-1 `1-start.png` … `4-end-of-pull.png`.

### What is untested / not done (phase 2)

- **Rate dependence of friction's loss** (above) — measured, not explained.
- **Permanent set read off the curves, not off a released swatch**: releasing the comb to the preload
  after unloading was tried and the comb reading is unreliable in compression (the comb moved down
  while the bottom jaw read near zero), so it was dropped.
- **Only the eyelet chart** exercises yo / k2tog; ssk is the same case with the list reversed and is
  untested; increases (two children in one parent) are allowed by the record and never built.
- **The decrease geometry is one sweep's optimum** at this gauge and yarn; another wale pitch may need
  the sweep re-run (the gate's linking check will say so).
- **The page's drag-to-pull** goes through the worker and has no committed check.
- Everything in phase 1's list below still applies except where marked superseded.

## Files

| file | what |
|---|---|
| `knit-lab.html`, `knit-lab.css` | the page (site tokens, Field Notes chrome, `noindex`) |
| `knit-lab.js` | the page: draws what the engine reports (2D canvas, depth-sorted shaded tubes), swatch choice, drag-to-pull, the load–unload plot + CSV |
| `knit-lab-engine.js`, `knit-lab-worker.js` | runs a `KnitSim` and reports by message; the worker hosts it (`#WORKER=0`: on the page's thread) |
| `knit-lab-sim.js` | the simulator, pure (no DOM): initial geometry, XPBD constraints, jaws, the test protocol, certificate. `PARAMS` and `DECREASE_SHAPE` at the top hold every constant |
| `knit-lab-topology.js` | the knit record (see below), `makeStockinette`, `makeEyelet` and the validator |
| `knit-lab-analysis.js` | linking numbers, the jam, hysteresis and set, holes — read by the page and the gate |
| `tools/verify-knit-lab.mjs` | every phase-2 number in this doc and its must-fails (`--browser` the worker gate, `--rates` the slow runs) |
| `tools/shot-knit-lab.mjs` | the screenshots, through the real page in headless Chromium |
| `docs/img/knit-lab/` | phase 2: both swatches settled and at +20%, the load–unload plot; phase 1: `1-start.png` … `4-end-of-pull.png` |

`textile-knit-loops.js` is imported (its `loopPoint` jersey curve gives the starting x/y) and not
modified. `textile-stretch-simulator.*` is untouched. Nothing from Asunder Knit or any commercial
tool was looked at.

## The topology structure

`knit-lab-topology.js`. A swatch is `rows` — courses bottom first, each a list of loop ids in slot
order — and `loops`, each `{ id, course, slot, kind, through }`. **`through` is the whole topology**:
the ids of the loops of the previous course this loop was pulled through.

- plain knit: `through: [a]`
- yarn over: `through: []`
- k2tog / ssk: `through: [a, b]`, order = which parent lies on top
- cast-on: course 0, `through: []`

`validateTopology()` refuses a parent outside the previous course, a loop nothing holds (it would
ladder) and more than two parents. The solver never reads the record; only the initial-geometry
builder (`placeCourse` in the sim) does, to put each new loop over its parent(s). So a yarn over or a
decrease is **a data change plus one case in `placeCourse`** — not a rewrite. Phase 2 wrote those
cases (0 and 2 parents) without touching the solver; the builder throws, by name, on more than two.

Flat knitting is in the record too: the yarn runs left→right on even courses and right→left on odd
ones, turning at the selvedge.

## The model (phase 1; superseded where marked)

Per substep, Gauss-Seidel, one sweep (`ITERATIONS_PER_SUBSTEP`), 32 substeps a frame:

1. **contact** — segment–segment capsules, min distance = yarn diameter, pairs from a spatial hash on
   midpoints, reused as a Verlet list until something moves half the margin; unilateral, frictionless
   by default;
2. **comb pins** and **plates** (below);
3. **bending** — `|x_i − (x_{i−1}+x_{i+1})/2|`, rest 0, so energy ∝ angle² (an i/i+2 distance would be
   ∝ angle⁴);
4. **stretch** — near-inextensible, solved last so it is the one met exactly. *(Phase 2: one
   tridiagonal solve along the chain instead of a sweep.)*

Damping is applied to velocity **relative to the jaws' uniform stretch**, so it never resists the pull
itself (a world-frame drag did: the bottom jaw read ~9,000 load units less than the comb).

### Four things had to be added before it would settle — each found by running it

1. **A comb of pins through the live stitches.** With the top course free, a frictionless knit has no
   rest state: bending energy falls as the yarn straightens, so the top course pulls out of the one
   below and the whole swatch unravelled into a tangle. One rigid pin per top loop, perpendicular to
   the fabric, where the next course's legs would be. The cast-on course is pinned (the bottom jaw).
2. **The yarn's end tied to the comb.** Under load the swatch unravelled from its free tail at the
   top-left (two pins left empty on the +70% frame), which showed up as the load *falling* 20% after
   the jam — and as an apparent 4× rate dependence that disappeared once the tail was tied.
3. **Two frictionless plates** (`PLATE_HALF_GAP` 1.6 d on the yarn centreline). Without them the free
   side edges roll up indefinitely — real stockinette curls, and with no friction or weight nothing
   stops it — and the rolling keeps shortening the swatch (comb load crept up ~6,000 over 1,400 frames
   after "settling"). `Infinity` turns them off.
4. **A small tensile preload while settling** (`PRELOAD` 1,500). The comb follows the load until the
   swatch carries that tension. Aiming at exactly zero overshot into compression, the sheet buckled,
   and the contacts locked the crumple in (screenshotted; it does not recover).

~~Friction is implemented (`FRICTION`, Coulomb, position-based) but **off by default**: the brief did
not ask for it, and at μ = 0.1 the loops lock and the pull is carried by yarn stretch (12.7% strain,
measured before the tail was tied — not re-measured since).~~ **Superseded by phase 2 §1**: re-measured
with the tail tied, friction does not lock the loops; μ 0.25 is the default.

## Phase 1 gate, with numbers (Gauss-Seidel stretch, frictionless — superseded where phase 2 re-measured)

Machine: this session's container, Intel Xeon @ 2.10 GHz, 4 cores, Node 22.22, headless Chromium
(software 2D canvas). Single-threaded throughout.

### Time to settle, ms per step

| | |
|---|---|
| swatch | 10 × 10, 3,476 points, 17.37 d of yarn per loop, segment 0.50 d |
| settle | **295 frames = 4.9 s simulated = 9,440 substeps** (deterministic: identical in Node and the page) |
| ms per substep | **1.16–1.33 ms** (Node 1.16, page 1.29–1.33); contact solve is ~75% of it |
| ms per frame (32 substeps) | **37–44 ms** sim + **3 ms** draw |
| settle wall time | **17.4 s in the page** (headless Chromium, drawing as it goes); ~11 s pure compute in Node |
| frame rate while running | **~13 fps** in headless Chromium (sim + draw + readouts) |

Settled = the jaw gap moved < 0.1 d over 120 frames. "Every point at rest" never passes: the RMS point
speed floors at ~0.2–0.5 d/s from residual edge motion while the jaw gap is still.

### Recognisable jersey

Yes — `docs/img/knit-lab/2-settled.png` shows the V legs and interlocked heads across the interior;
the selvedges are irregular (loose edge loops) and the top course hangs on the comb.
`3-mid-pull.png` (+20%) and `4-end-of-pull.png` (+39%) are clean, elongated jersey with the swatch
necking in (mid-height width 40.9 → 31.1 d). `1-start.png` is the rough starting guess.

### Yarn through yarn

**None.** Two instruments:

- **pass-through certificate**, every substep (`auditBefore/After`): a pair's distance at the start of
  a substep must exceed the sum of its endpoints' largest displacements — if it does, the two segments
  cannot have crossed during it. **Held on 9,440 / 9,440 settling substeps (worst margin 0.28 d) and
  17,344 / 17,344 pulling substeps (worst margin 0.91 d).** Pairs off the Verlet list are covered by
  the list's reach.
- **contact violations** (pairs closer than ½ d), sampled every 10–20 frames: **0** throughout.
  Closest approach 0.757 d while settling (the starting guess's 0.760 d), 0.968 d while pulling.

### Largest swatch at interactive speed; is WebGPU necessary?

Cost is linear in points (~0.37 µs per point per substep), measured:

| swatch | points | contact pairs | ms / substep | ms / 32-substep frame |
|---|---|---|---|---|
| 10 × 10 | 3,476 | 17,813 | 1.16 | 37 |
| 20 × 20 | 13,781 | 72,135 | 5.09 | 163 |
| 30 × 30 | 30,909 | 162,995 | 11.6 | 372 |
| 40 × 40 | 54,861 | 291,494 | 20.2 | 648 |

At 32 substeps and a 30 fps budget, single-threaded CPU holds **~2,500 points (~8 × 8)**; at 15 fps,
**~10 × 10 to 12 × 12**. That is the ceiling for this JS. **Estimate (not measured):** a worker pool
with graph-coloured contacts might give ~3× on 4 cores (≈ 15 × 15–20 × 20); the contact and
constraint passes are embarrassingly parallel under Jacobi/colouring, so WebGPU is the route for
anything garment-sized (40 × 40 is 648 ms a frame here). **WebGPU looks necessary beyond ~20 × 20;
it is not necessary for a 10 × 10 demo.** Substeps cannot simply be cut: on an earlier configuration
of this file, 16 a frame ran with ~4× the residual RMS speed of 32 and the yarn strained 3–16% where
32 held it under 1%.

### Force–extension shape

Bottom-jaw reaction (model units, not newtons) against jaw-to-jaw extension, 1.5 d/s:

| extension | 0% | 5% | 10% | 15% | 20% | 25% | 30% | 35% |
|---|---|---|---|---|---|---|---|---|
| load | 7.3k | 19.5k | 33.3k | 48.8k | 84.5k | 166k | 340k | 738k |

**Yes, the expected shape**: a soft, nearly linear region to ~15% (≈ 8,500 per d of jaw travel), then
stiffening that roughly doubles every 5% as the loops jam — 30.6× the soft stiffness by 30%. The
automatic pull **stops at +39%** when any segment reaches 5% strain (`STRAIN_STOP`): past the jam the
yarn carries the load, and one solver sweep a substep cannot keep a 1,700 d chain inextensible under
it — pulled on, a segment reached 384% and the load collapsed at ~+55%. Static check: held at the
stop, bottom jaw 1.24 M vs comb 1.18 M (5% apart).

Rate (`--rates`, same settled swatch): from 25% up the curves at 4, 1.5 and 0.5 d/s agree within
~15% (35%: 753k / 741k / 749k); in the soft region the faster pull reads higher (10%: 42k / 33k /
27k) — the damping, which is relative to the jaws but not zero for non-uniform motion.

## What was untested / not done after phase 1

- ~~**Yarn overs and decreases**: the record holds them; the geometry builder does not (it refuses).~~ Built in phase 2.
- **Real units**: forces are model units; no yarn modulus, mass, friction or bending data.
- ~~**Friction off**~~: phase 2, μ 0.25 default; the lock was not friction's.
- **The plates, comb, tied tail and preload are boundary choices**, each added because the run failed
  without it; a free-edged, freely hanging swatch is not what is simulated.
- ~~**Past the jam** the yarn is not inextensible~~: phase 2's direct solve keeps it under 0.1%.
- **Selvedges** settle loose and irregular; not tuned.
- **Drag-to-pull** was checked once in headless Chromium (a real 120 px pointer drag above the top
  course took the swatch to +18%, no page errors); it has no committed check, and the hand pull has no
  strain stop (only the readout's strain figure).
- **Only headless Chromium on this container** was timed; no real GPU, no other browser, no phone.
- **WebGPU estimates are estimates** — phase 2 moved the simulation to ONE worker (responsiveness,
  not speed); nothing parallel was built.
- **No CI**: no workflow names a `knit-lab*` path. Run `node tools/verify-knit-lab.mjs --browser`
  (≈ 5 min on 4 cores) and `node tools/shot-knit-lab.mjs <dir>` by hand. (Phase 1's scaling table was
  measured with the Gauss-Seidel solver; the tridiagonal solve costs about the same per substep —
  1.29 ms against 1.16–1.33 in the page — and was not re-swept.)
