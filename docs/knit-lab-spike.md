# Knit Lab — yarn-level knit feasibility spike (Oct 21)

`/knit-lab.html` (noindex, unlinked). Ten wales × ten courses of stockinette knitted flat from one
yarn, the yarn a chain of points relaxed with XPBD, settled, then pulled from the top. The question
was whether the browser can do this at interactive speed and whether the result behaves like a knit.

**Short answer: yes for 10 × 10, on the CPU, at about 13–25 frames a second; it settles into
recognisable jersey in 4.9 s of simulated time; no yarn passed through yarn on any substep; and the
pull gives the expected J-shaped curve (soft, then ~30× stiffer as the loops jam). Anything much
bigger than ~12 × 12 needs threads or WebGPU.** The details, and what had to be added to get there,
are below.

## Files

| file | what |
|---|---|
| `knit-lab.html`, `knit-lab.css` | the page (site tokens, Field Notes chrome, `noindex`) |
| `knit-lab.js` | runs the sim, draws it (2D canvas, depth-sorted shaded tubes), drag-to-pull, force log + CSV |
| `knit-lab-sim.js` | the simulator, pure (no DOM): initial geometry, XPBD constraints, jaws, certificate. `PARAMS` at the top holds every constant |
| `knit-lab-topology.js` | the knit record (see below) and its validator |
| `tools/verify-knit-lab.mjs` | every number in this doc, measured in Node on the shipped modules (`--rates` adds the speed sweep) |
| `tools/shot-knit-lab.mjs` | the screenshots, through the real page in headless Chromium |
| `docs/img/knit-lab/1-start.png` … `4-end-of-pull.png` | start, settled, mid-pull (+20%), end (stopped at +39%) |

`textile-knit-loops.js` is imported (its `loopPoint` jersey curve gives the starting x/y) and not
modified. `textile-stretch-simulator.*` is untouched. Nothing from Asunder Knit or any commercial
tool was looked at.

## The topology structure

`knit-lab-topology.js`. A swatch is `rows` — courses bottom first, each a list of loop ids in slot
order — and `loops`, each `{ id, course, slot, kind, through }`. **`through` is the whole topology**:
the ids of the loops of the previous course this loop was pulled through.

- plain knit: `through: [a]` (the only case built)
- yarn over: `through: []`
- k2tog / ssk: `through: [a, b]`, order = which parent lies on top
- cast-on: course 0, `through: []`

`validateTopology()` refuses a parent outside the previous course, a loop nothing holds (it would
ladder) and more than two parents. The solver never reads the record; only the initial-geometry
builder (`placeCourse` in the sim) does, to put each new loop over its parent(s). So a yarn over or a
decrease is **a data change plus one case in `placeCourse`** — not a rewrite. That case is not
written: the builder throws, by name, on any `through` length other than 1, and the gate checks that
it does (a yo-beside-k2tog record validates; the builder refuses it).

Flat knitting is in the record too: the yarn runs left→right on even courses and right→left on odd
ones, turning at the selvedge.

## The model

Per substep, Gauss-Seidel, one sweep (`ITERATIONS_PER_SUBSTEP`), 32 substeps a frame:

1. **contact** — segment–segment capsules, min distance = yarn diameter, pairs from a spatial hash on
   midpoints, reused as a Verlet list until something moves half the margin; unilateral, frictionless
   by default;
2. **comb pins** and **plates** (below);
3. **bending** — `|x_i − (x_{i−1}+x_{i+1})/2|`, rest 0, so energy ∝ angle² (an i/i+2 distance would be
   ∝ angle⁴);
4. **stretch** — near-inextensible, solved last so it is the one met exactly.

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

Friction is implemented (`FRICTION`, Coulomb, position-based) but **off by default**: the brief did
not ask for it, and at μ = 0.1 the loops lock and the pull is carried by yarn stretch (12.7% strain,
measured before the tail was tied — not re-measured since).

## The gate, with numbers

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

## What is untested / not done

- **Yarn overs and decreases**: the record holds them; the geometry builder does not (it refuses).
- **Real units**: forces are model units; no yarn modulus, mass, friction or bending data.
- **Friction off**: implemented and measured once (μ 0.1 locks the loops); the default is frictionless.
- **The plates, comb, tied tail and preload are boundary choices**, each added because the run failed
  without it; a free-edged, freely hanging swatch is not what is simulated.
- **Past the jam** the yarn is not inextensible (iteration-limited XPBD); more iterations or a direct
  solve along the chain would be needed for the yarn-stretch regime.
- **Selvedges** settle loose and irregular; not tuned.
- **Drag-to-pull** was checked once in headless Chromium (a real 120 px pointer drag above the top
  course took the swatch to +18%, no page errors); it has no committed check, and the hand pull has no
  strain stop (only the readout's strain figure).
- **Only headless Chromium on this container** was timed; no real GPU, no other browser, no phone.
- **WebGPU and worker estimates are estimates** — nothing parallel was built.
- **No CI**: no workflow names a `knit-lab*` path. Run `node tools/verify-knit-lab.mjs` (≈ 3 min,
  `--rates` adds ~1.5 min) and `node tools/shot-knit-lab.mjs <dir>` by hand.
