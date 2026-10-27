# Knit Lab — yarn-level knit feasibility spike (Oct 21; phase 2 the same day, phase 3 Oct 21–22, phase 3b Oct 22–23)

`/knit-lab.html` (noindex, unlinked). Ten wales × ten courses of stockinette knitted flat from one
yarn — plain, or with one eyelet row across the middle — the yarn a chain of points relaxed with XPBD,
settled, then **loaded to a load limit and unloaded**. Phase 1 asked whether the browser can do this
at interactive speed and whether the result behaves like a knit (yes, on the CPU, for 10 × 10).
Phase 2 made the physics trustworthy before adding stitches: friction that behaves like yarn, a yarn
that stays inextensible under load, a load–unload cycle, yarn overs and k2tog, and the simulation in a
Web Worker. Phase 3 replaced the continuous pull with a stepped, quasi-static test, found why phase 2's
friction was rate-dependent, added a pull across the courses, and purl, 1×1 rib and ssk. Each phase's
record is kept below the next; where a later phase overturned an earlier one, it says so.


## Resume here (Oct 27)

**State:** the course-direction test works; every test stops at the jam; every step-size and monotonicity
check reads the median of three seeds. 1×1 rib jams at **34% across the courses against jersey's 22% (1.55×)**
and draws in to **0.846×** jersey's width at rest, from the topology alone (gate R, PASS). The gate fails on
seven checks (M rib across ×2, O ×3, F, E ssk), every one a known limitation stated on the page (Phase 4 §6). Every must-fail is rejected.

**Re-run:**
- **Gate:** `node tools/verify-knit-lab.mjs --out <dir>`: 43 simulations, about 8–23 min each, roughly 9 CPU-hours.
  On 4 cores it overruns a 2-hour background limit, so run it in chunks:
  - `--reuse <dir> --out <new dir>` keeps every saved run whose spec is unchanged and runs only the rest.
  - Judging alone (everything reused) takes seconds.
  - `--no-course` leaves the course runs out (iteration only); `KNIT_PROGRESS=1` logs every step.
- **Screenshots:** `node tools/shot-knit-lab.mjs <out-dir> --runs <gate-dir>`, about 15 min.
- Needs `playwright-core` and Chromium. No CI covers knit-lab.

## Phase 4 — the course fixture converges, every test stops at the jam, three seeds (Oct 27)

Eva's decision on the open question: **cap at the jam; do not build smooth contact.** The frictionless loss is
a property of straight-segment contact, present before the jam; it is recorded as the model's baseline and
friction is reported as the excess over it. Priority: make the course test converge by fixing the fixture, not
the solver. Every changed gate has its reason below (§5).

### 1. Why the side jaws never agreed

Held at +3% across the courses on the phase-3b fixture (jersey, μ 0.25), loads per frame:

| frame | left jaw | right jaw |
|---|---|---|
| 150 | 10,136 | 11,687 |
| 1,000 | 10,875 | 8,577 |
| 2,950 | 10,787 | 3,314 |

The left jaw held; the right one fell steadily, with the swatch moving at RMS 0.016–0.025 d/s throughout.

**The x-force balance closes.** The difference between the jaws was carried by the contacts' restitution-0
velocity pass against jaw yarn, which no load cell counts. At frame 1,199: L − R = 2,250, velocity pass 3,221,
pins −414.

**The motion was one loop.** The live loop beside the right jaw (top course, slot 8) and its pin slid toward the
jaw at about 0.12 d/s, and the loop climbed its pin out of the plane, to z ≈ 7 d. It rode up over the clamped
edge loop instead of jamming against it.
- A comb pin runs ±40 d in z and, in a course test, is free along x, so nothing stops that.
- A real needle lies in the fabric's plane.
- The two fixes tried first failed:
  - Extending the out-of-plane spring to the needle course: the drift went on.
  - Clamping the needle course's z at the hold: it jumped a loop already 7 d out and made it worse.

**The fixture fix: both course edges on rails** (`COURSE_TOP: 'rail'`, the default).
- The live course rides a rail exactly as the cast-on does: each point's y and z held, free along x.
- The pins are off, and the swatch's height is held where the wale settle left it (at the preload).
- From the saved settled swatch, released on rails and held at +3%, it came to rest exactly: RMS 1e-10 d/s
  within ~100 frames. Released width 33.76 d (needle fixture: 33.21).

**A second defect, in the clamp: stale velocities.**
- At rest the jaws still read 13,921 against 13,295 (4.5%), with a constant velocity-pass impulse.
- A gripped point's velocity is never derived again (w = 0), but the velocity pass reads it.
- The edge-wale points kept the velocities they had while the width was free, and pushed every free yarn
  touching a jaw by the same amount every substep.
- `clampSides()` now zeroes them, and the driven right jaw carries its own velocity during a move.
- Held at +3%: 13,275 against 13,276 (< 0.03%) over 1,300 frames.
- A small chatter remains (RMS ~1.6e-3 d/s, local to courses 1–2 near slot 5). It does not move the loads.

Neither change touches the solver. Wale tests are unaffected: their jaws are gripped from construction, with
zero velocity.

### 2. Every test stops at the jam

`STOP_AT: 'jam'` (default):
- **How the stop is decided:** a stepped test stops loading the first step `findJam()` (the analysis's own jam,
  the tangent stiffness first 10× the 0.5–10% soft slope, past 10%) finds the jam on the steps recorded so
  far. A continuous test checks every 30 frames.
- **What comes after:** it unloads back to the start.
- **The load limit:** `LOAD_LIMIT` is now only a safety; no test reached it. Peaks: jersey 0.33 M along the
  wales, 0.34 M across; rib 0.22 M / 0.28 M (the old limit was 1 M).
- **`STOP_AT: 'limit'`** is the old behaviour. It is kept only for the untied-tail must-fail (§5).

### 3. Three seeds

The cycle is chaotic at the several-percent level, so every μ 0.25 and μ 0 test the step-size and monotonicity
checks read runs three times: the preload moved by 0, 1 and 2 parts in 1e9 (`-s1`, `-s2`). The checks judge
the median; each seed is printed beside it.

Spread of single seeds, loss / set:
- jersey along the wales: 52.1–54.3% / 8.1–8.5%;
- rib: 46.2–48.5% / 8.1–8.6%;
- jersey across: 32.7–35.9% / 3.0–3.5%;
- rib across: 47.1–47.7% / 6.1–6.6%.

### 4. Results (`node tools/verify-knit-lab.mjs`, 43 runs; medians of three unless one)

| | loss | set | jam | over the frictionless baseline |
|---|---|---|---|---|
| jersey, wales, 1% / 0.5% | 53.8 / 54.4% | 8.17 / 8.71% | 17 / 18% | loss +43.2, set +7.59 points (1%) |
| rib, wales, 1% / 0.5% | 47.5 / 49.6% | 8.41 / 8.45% | 19 / 19% | loss +38.7, set +4.51 points |
| jersey, courses, 1% / 0.5% | 34.7 / 35.3% | 3.30 / 3.24% | 22 / 22% | loss +28.2, set +2.83 points |
| rib, courses, 1% / 0.5% | 47.1 / 46.8% | 6.38 / 6.41% | 34 / 33% | (no frictionless rib-course run) |
| **baseline μ 0**: jersey wales / rib wales / jersey courses (1 run) | 10.6 / 8.9 / 6.5% | 0.58 / 3.90 / 0.47% | 18 / 18 / 22% | — |

**Rib against jersey across the courses (gate R): PASS.**
- Jam: 34% against 22%, 1.55× (seeds 33–34% / 21–22%).
- Width at rest, released: 28.6 d against 33.8 d, 0.846×.
- Phase 3 (plates and comb, old solver) had read 71% against 50% (1.42×) and 0.843×; the width ratio
  reproduces, the jam figures do not carry over.

Jersey across the courses against along the wales (gate D): jam 22% against 17%, and softer per d across the
pull (14,677 against 16,900 per unit strain per d, 0.87×). PASS.

### 5. The gates, and what changed in them

| gate | result | numbers |
|---|---|---|
| **K (new)** course jaws agree within 2%, every step | PASS ×13 | every μ 0.25 course run: 0 unconverged, ≤ 0.20%; frictionless: 1 unconverged step, 0.30% |
| K must-fail: the phase-3b fixture (pins + stale velocities) | rejected | 9 of 11 steps unconverged, jaws 401% apart |
| Q step size, medians, within 10% | PASS ×4 | spreads 1.1–6.6% |
| Q must-fail: phase-2 test at two speeds | rejected | set 6.00 / 4.00% |
| Q frictionless | **recorded, not gated** | 10.6 / 8.9 / 6.5% |
| M monotone and closed, median | PASS 4, **FAIL 2** | rib across: 1 (1%) and 3 (0.5%) unloading steps rise, at the bottom of the branch (§6) |
| M must-fail: phase-2 friction | rejected | unloading above loading by 78.5% |
| H held at the peak | PASS | −0.1% (phase-2 friction +5.6%) |
| T topology | PASS | 3 must-fails rejected |
| O decreases' order | **FAIL 3** | k2tog after the test −0.14 d; ssk settled −0.15 / −1.26 d, after −0.00 / −0.69 d (§6) |
| F soft region ≤ 2× frictionless | **FAIL** | 2.46× (18,651 against 7,576 per d) |
| I strain, collapse, ended on the jam | PASS ×18 | worst strain before the jam 0.062% (rib across) |
| I must-fails | rejected ×3 | compliant yarn 6.86% strain; Gauss-Seidel 2.00% strain before the jam; untied tail (loaded to the old limit) fell to 36% of its peak at 57% |
| C friction adds the loop | PASS ×3 | +43.2 / +38.7 / +28.2 points |
| E eyelets open | PASS / **FAIL** | k2tog 4 settled, 5 at +20%; ssk 2 settled, 4 at +20% |
| E jam elsewhere | PASS ×2 | 39% and 34% against 17% |
| D, R | PASS | §4 |
| S no pass-through | PASS ×4 | certificate clean on every substep; closest 0.736 d |

**Changed gate definitions, with the reasons:**

- **Q frictionless** (< 2% lost) is no longer gated. The loss is a property of straight-segment contact
  (phase 3b §2b), present before the jam, and Eva's decision keeps that contact.
  - It is recorded as the model's baseline, and Q/C report friction's loss and set as the excess over it.
  - The page says so in one sentence.
  - The must-fail that only existed for that bar (μ 0.25 under 2%) went with it.
- **Q step size and M** judge the median of three seeds, not one run.
  - The bars are unchanged (10% relative; M's own slack).
  - The reason: one run scatters at the several-percent level (phase 3b: a 1e-9 replica read 44.2% against 31.3%).
  - **The rib 12.9% loading fall** (phase 3b's M failure) reproduces on seed 0 at 0→1% and on neither other
    seed. The median curve is clean, so it is run-to-run chaos, not the model's response.
- **I "ended on the load limit"** now reads "ended on the jam" (§2).
  - "No collapse past the jam" now covers only the step or two recorded past it.
  - Its must-fail, the untied tail, unravels only past the jam. Stopped at the jam it was ACCEPTED, so it
    loads to the old limit (`STOP_AT: 'limit'`) to show the check can still fail.
- **The Gauss-Seidel must-fail** reads strain-before-jam and the stop together. It reached the jam at 53% with
  2.0% strain, where it used to end on the strain stop.
- **K is new:** the course jaws within 2% at every recorded step (Eva's gate). Unconverged steps are reported
  there and judged by M.
- **D and E's jam comparisons take a 1e-9 grid tolerance.**
  - The jam is read on 1% bins, so a 5-point difference is exactly 0.05 on the grid.
  - `0.17 + 0.05` is `0.22000000000000003`, which read jersey's 22%-against-17% as under the 5-point bar.
- **The course runs are back in the default gate run** (`--no-course` for iteration).

### 6. Known limitations, diagnosed (each on the page)

- **O and E, the decreases.** Settle-only runs, eyelet row at course 5, frictionless settle (the default):
  - A decrease's moving head slides back off the stack toward its own wale: the two heads' x separation grows
    from ~0.2 to 1–2 d.
  - The head-depth reading then flips: ssk loops 52 and 54 at −0.15 and −1.26 d, and the ssk row opens 2 holes ≥ 1 d.
  - The k2tog stays positive by margins as thin as 0.02 d.
  - **Settled with friction (μ 0.25) from the same start, every decrease keeps its order:** dz 0.43–0.90 d,
    heads within 0.28 d in x. The ssk row opens 4 holes (2.47, 2.00, 1.90, 1.80 d).
  - **A deeper drawn stack (`back` 1.2) made it worse** (one head at −2.54 d), so it is not the starting
    geometry: nothing but friction holds two stacked heads stacked.
  - Not changed. Frictionless settling is what makes μ 0 and μ 0.25 start from one stress-free swatch, and
    giving that up is Eva's call.
- **M, rib across the courses.** The unloading steps that rise sit at the bottom of the branch.
  - Where: near zero load and below it, where the swatch, longer than it started (set 6.4%), goes into compression.
  - Seed 0: 8% 7,069 → 8,303; 4% −127 → 2,069; 1% −6,934 → −3,939.
  - Size: up to about 1% of the 0.28 M peak.
  - Jersey across the courses passes on the median, with each 0.5% seed showing one rise.
- **F.** μ 0.25's soft region is 2.46× the frictionless one, unchanged from phase 3b.
- **The frictionless baseline** (§4), and the test capped at the jam.

### 7. Files

- `knit-lab-sim.js`: `COURSE_TOP`, `STOP_AT`, `jamReached()`, the velocity zeroing in `clampSides()`, the driven
  jaw's velocity.
- `tools/verify-knit-lab.mjs`: seeds and medians, K, the baseline, the changed checks, mutant
  `jaw-velocity-stale`, `--no-course`.
- `knit-lab.js`, `knit-lab-engine.js`, `knit-lab.html`: wording, the course jaws' loads, the known limitations.
- `tools/shot-knit-lab.mjs`: `rib-mid-course-pull.png` and `course-plot.png`.
- New images in `docs/img/knit-lab/`: `jersey-rib-clamped.png`, `rib-mid-wale-pull.png`,
  `rib-mid-course-pull.png`, `panel.png`, `wale-plot.png`, `course-plot.png`.

### 8. Untested

- The page's drag-to-pull.
- A frictionless rib-course run (no baseline for rib across the courses).
- Whether the friction-settled eyelets keep the other gates' results.
- Anything above 10 × 10.

## Phase 3b — the clamp fixture; what absorbs the work without friction; friction through the jam (Oct 22)

**Outcome: not merged.** The fixture is now a tensile tester's (§1). Without friction the cycle still loses
9.7% of the work against the 2% bar, and the cause is found (§2): the yarn is a chain of straight
segments, and a yarn sliding over one rides a bump at every vertex. The bumps act like friction (an
effective coefficient of about 0.26). A contact between smooth curves removes them: the same excursion
comes back to within 0.4% instead of 4%. But on that contact the swatch never comes to rest, so it is in
the code and switched off. Along the wales, μ 0.25 jersey loads monotonically through the jam and unloads on a
clean closed branch at both step sizes; rib does not, by one step each way (§3). **Across the courses the test does not
reach equilibrium on this model at all** (§4), so it is out of the gate run (`--course` puts it back) and
the page says so. Numbers: `node tools/verify-knit-lab.mjs` on this container, unless a section says
otherwise.

### 1. The fixture: jaws across the full width, free side edges, no plates

- **Bottom jaw:** the cast-on course, as before.
- **Top jaw** (`FIXTURE: 'clamp'`): every point of the last course across the full width, plus the yarn's
  end. It is not a comb of pins.
- **Side edges:** free. The plates are gone (`PLATE_HALF_GAP: Infinity`).
- **The start-up squeeze stays.** The drawn start is 2.5× deep and is squeezed to ±1.6 d while the yarn
  reels in to length, then opened over 60 frames. It touches nothing once the swatch starts to settle.
  Without it the loops shorten while still deep and the swatch crumples.
- **Out-of-plane spring.** Free curl, frictionless and weightless, did not settle: the swatch crumpled,
  jaw gap 33 → 21 d. So, as the brief allowed, a weak restoring force acts on interior nodes only
  (`OUT_OF_PLANE_K`):
  - each loop not in an edge wale or an edge course feels −K × the z of its own centroid, spread over its
    points;
  - it acts along the depth only, so it never enters a jaw's load;
  - the edge wales and courses are free to curl;
  - **K = 300 load units per d per loop.** At 100 or below the swatch still crumples; from 150 up it holds;
  - on the settled swatch interior loop centroids sit within about 1.5 d of the mid-plane. The spring
    therefore carries at most about 450 per loop, against jaw loads of 10⁴–10⁶.
- **Width at rest.** jersey's settled wale-centre span is 34.9 d (drawn 37.8), and the jaw gap 31.6 d.

The fixture moved the frictionless loss nowhere: **9.24%** between clamps (K 300), against 9.1%
between plates. So it was not the plates. The rest of this section is what it was.

### 2. What absorbs the work without friction

**(a) The contacts bounced.** Held still at +12%, frictionless, with damping 15/s, the swatch never came to
rest:

| held at +12% | RMS point speed |
|---|---|
| 32 substeps a frame | 0.14 d/s |
| 128 substeps | 0.014 d/s |
| 64 substeps, with the velocity pass below | 0.0000 d/s |

A positional contact pushes the yarns apart by however far the prediction left them overlapping.
Deriving velocity from positions turns that push into a separating velocity, the next substep carries it,
and the contact pushes again. That is energy pumped in every substep, which only the damping takes out.

The fix is `CONTACT_VELOCITY`: XPBD's restitution-0 velocity pass. After the velocity update, every contact
active in that substep, and every pin push, loses its relative normal velocity. At 64 substeps a held
swatch then comes to rest exactly (RMS 0.0000 d/s after 1,000 frames); at 32 it does not. The defaults are
now 64 substeps a frame with the pass on.

**This did not change the frictionless loss: 9.66%.** The swatch now rests between steps, and the loss is
still there.

**(b) The polyline corrugation.** With the swatch truly at rest (RMS < 1e-5 d/s at every hold), an
excursion at one extension does not come back.

Small excursions at +12%, frictionless; "back" is the load on returning to +12%:

| excursion | start | back after +d | back after −d | back after +d again |
|---|---|---|---|---|
| ±0.5% | 45,304 | 43,345 | 43,907 | 43,234 |
| ±2% | 45,304 | 40,387 | 42,138 | 40,303 |

The loop width is about 9% of the excursion's load swing at both sizes, so it acts like friction.

The two rest states at one extension differ by 0.1–0.3 d all over the swatch. It is not the edges: the
edge loops' RMS difference is 0.117 d, the interior's 0.151. It survives every solver knob:

| knob changed | result |
|---|---|
| iterations 1 / 4 / 8 | down/up 0.91 / 0.93 / 0.92 |
| 64 substeps | 0.92 |
| damping 50 (before the velocity pass) | loss 8.9% |
| spring K 3,000, or on every loop | unchanged |
| softer contact, skip arc 3 d | unchanged |
| stiffer or softer bend | unchanged |

**It grows with the segment length.** The ±2% loop is 9% of the swing at 0.5 d segments and 14% at 0.75 d,
with the bend compliance scaled as seg³ so the yarn is the same. At 0.25 d it did not settle at 64
substeps.

The mechanism: between two vertices the chord runs inside the curve by the sagitta seg² κ / 8, so the
contact tube is corrugated. A yarn sliding over a bent one climbs and drops at every vertex, and with hard
contacts that pins it. The effective friction coefficient is about π · seg · κ / 4, which is 0.26 on the
knit's ~1.5 d bends at 0.5 d segments — about the real μ.

**Testing the mechanism.** `CONTACT_SMOOTH` takes the contact between the smooth curves the points define,
at their own closest points (Newton from the chords' answer), as an 8-point constraint. With the
Catmull-Rom curve, the ±2% excursion at +12% comes back to **34,503 after +d and 34,379 after −d**, from
34,459. That is 0.4% instead of 4%, so the corrugation is the loss.

**But on the smooth contact the swatch never comes to rest:**

| smooth-contact variant | RMS held still |
|---|---|
| Catmull-Rom; uniform quadratic B-spline (C1) | 0.11–0.13 d/s |
| no velocity pass; a softer contact; 2 iterations | 0.11–0.13 d/s |
| a softer bend | 0.07 d/s |
| 128 substeps | 0.02 d/s |
| normal projected off both tangents | blew up (139 d/s) |

The loads drift 0.3–0.5% per 1,000 frames, so a stepped hold cannot converge. A gate-style run with it
recorded no test in 50 minutes. **So `CONTACT_SMOOTH` is off.** What it needs is a smooth contact that is
also a fixed point of the solver; it is the next thing to do.

**Frictionless gate: FAIL — 9.7% lost** along the wales on the chord contact.

### 3. Friction through the jam, along the wales

With the solver at rest between steps, every step of every μ 0.25 wale test converged, at 1% and 0.5%
steps, for jersey and for rib. **Jersey** loads monotonically through the jam and comes back on a clean
closed branch at both step sizes (23 / 22 and 44 / 43 steps, none out of order). **Rib does not**, by one
step each way: at 1% steps its load at 1% is 12.9% below its load at 0% (the teal curve's first two points
in `docs/img/knit-lab/wale-plot.png`; why is not established), and at 0.5% steps one unloading step rises. Nothing was tuned to make
rib pass.

**Loss and set across the two step sizes:** rib agrees (loss 46.7 / 49.1%, set 8.34 / 8.67%, spreads 5.0 /
4.0%). Jersey does not (loss 31.3 / 43.3%), and the reason is not the step size: a replica at the SAME
settings, the preload moved by one part in 1e9, reads 44.2% / 8.23%. Jersey's cycle is chaotic at the 10%
level on this model, so a step-size comparison cannot be read to 10% from one run each.

The suspects in the brief, checked against the code:

- **The friction cap** is already this substep's normal multiplier. `lamC` and `lamT` are zeroed every
  substep, and the budget is μ · λn − λt of that substep. The must-fail is
  `friction-cap-accumulates`, which still breaks the F gate.
- **Static/kinetic switching:** not separately instrumented this round.

Phase 3's ratchet past the jam was measured across the courses: held at 56%, the load went 0.91 → 2.03 M.
That test cannot be run on this model now (§4), so the ratchet there is **untested**, not fixed. Along the
wales the held peak was already steady with memory friction (gate H). The working hypothesis is that the
ratchet was the bouncing contacts of §2a — a chattering contact under load lets a little slip through
every substep — but it is not demonstrated.

### 4. Across the courses: not measurable on this model

**Both top and bottom free, at zero load** (the brief's free edges):

- the frictionless swatch shrinks in height from 29 to 21 d;
- its cast-on edge flops up to 7 d out of plane;
- it keeps moving at about 1 d/s whatever the damping. Nothing holds it.

**Pretension instead** (`COURSE_BOTTOM: 'rail'`, `COURSE_EDGE_LOAD: 1500`):

- the cast-on rides a rail (y and z kept, free along x);
- the live stitches go onto a needle, the pins free along x, force-controlled to 1,500 while the width
  is released and **held fixed once the side jaws clamp**;
- this is a small pretension across the pull, as in a biaxial test.

The width at rest comes out of this release (§5). The pull still does not settle. At +3%, held still, the
two side jaws disagree:

| frames held | left / right jaw |
|---|---|
| 0 | −32% |
| 140 | 0% |
| 300 onward | +9% to +12%, and stays there |

Every step reached the 900-frame cap unconverged.

The moving points sit next to a jaw: a free yarn pressed on the clamped edge-wale yarn at one of its
vertices. It flips between two segments' normals at about 1e-4 d a substep, with zero net displacement.
Against a segment that cannot move, the velocity-pass impulses carry force that no jaw reading counts. It
is the polyline-corner family of §2b again. The course tests are left out of the gate run (`--course` puts
them back), and the page says the course test does not settle.

### 5. Rib against jersey across the courses

**Width at rest, released.** One settle and width release each on this fixture (`scratchpad restw`, both
1× runs):

| | drawn | settled between jaws | released |
|---|---|---|---|
| jersey | 37.8 d | 34.9 d | 33.21 d |
| 1×1 rib | 37.7 d | 37.9 d | 30.13 d |

So rib draws in to **0.907×** jersey's width, from the topology alone; phase 3 measured 0.843× with the
plates. **The jam across the courses** is not measurable on this fixture (§4). Phase 3's figure, on the
plates-and-comb fixture with the old solver, was rib at 71% against jersey at 50% (1.42×), from a run past
that gate's 60% range.

### 6. Gate results (phase 3b)

`node tools/verify-knit-lab.mjs` (wale direction; `--course` not run — §4). **9 checks fail; every
must-fail is rejected.** Full log: one run on this container, the untied-tail must-fail capped at 60%
extension (unravelling, it never reaches the load limit and would otherwise walk to 300%).

| gate | check | result | numbers |
|---|---|---|---|
| Q | μ 0, wale: cycle loses < 2% | **FAIL** | 9.7% lost, set 1.31% (§2: the chord corrugation) |
| Q | μ 0, course: cycle loses < 2% | not run | the course test does not settle (§4) |
| Q | μ 0.25 jersey: loss and set within 10% at 1% / 0.5% steps | **FAIL** | loss 31.3 / 43.3% (spread 38.5%), set 7.15 / 8.24%; a same-settings replica reads 44.2% / 8.23% |
| Q | μ 0.25 rib: the same | PASS | loss 46.7 / 49.1% (5.0%), set 8.34 / 8.67% (4.0%) |
| Q | must-fails: the phase-2 test at two speeds; μ 0.25 under the 2% bar | rejected / rejected | spread 50% in set; 31.3% lost |
| M | jersey, 1% and 0.5% steps: monotone loading through the jam, closed unloading | PASS / PASS | 23 / 22 and 44 / 43 steps, 0 unconverged, 0 out of order |
| M | rib, 1% steps | **FAIL** | one loading step fell 12.9% (0% → 1%) |
| M | rib, 0.5% steps | **FAIL** | one unloading step rose |
| M | must-fail: the phase-2 friction | rejected | the way back above the way out on 21 steps, worst 169.8% |
| H | held at the peak, the load stays put | PASS | 1,207,967 → 1,203,913 (−0.3%) over 600 frames; phase-2 friction +25.0% |
| T | every chart's drawn start passes its record (plain, eyelet, eyelet-ssk, rib) | PASS | 3 must-fails rejected |
| O | k2tog leans right, drawn and settled | PASS | top head in front by 0.14–1.83 d settled |
| O | k2tog after the test | **FAIL** | loop 51's top head −0.02 d (one of four) |
| O | ssk settled / after the test | **FAIL / FAIL** | loop 52's top head −0.15 d settled, −0.67 d after |
| F | μ 0.25's soft region ≤ 2× the frictionless | **FAIL** | 2.46× (18,651 against 7,576 per d), jam at 17% |
| I | strain < 1% before the jam; no collapse past it; the load limit ends the test | PASS ×12 | worst strain 0.008% (plain), peaks 1.22 M / 0.85 M / 0.69 M / 0.88 M |
| I | must-fails: compliant yarn; Gauss-Seidel stretch at 32 substeps; comb fixture, untied tail | rejected ×3 | 6.86% strain; the 5% strain stop; load fell to 36% of its peak at 57% |
| C | friction makes the loop | PASS | loss 31.3% against 9.7% (+21.6 points), set 7.15% against 1.31% |
| E | the yo-k2tog row opens (≥ 4 holes ≥ 1 d) | PASS | 4 settled, 5 at +20% |
| E | the ssk-yo row opens | **FAIL** | 2 settled, 4 at +20% |
| E | the eyelet swatches jam elsewhere | PASS / PASS | 39% and 34% against 17% |
| S | no pass-through (plain, eyelet, rib) | PASS | 0 deep overlaps; certificate clean on every step; closest 0.736 d |

**Rib against jersey, restated:**

- **Course direction:** not measurable on this fixture (§4). Phase 3's figure, on the plates-and-comb
  fixture with the old solver, was rib jamming at 71% against jersey's 50% (1.42×). It is not carried
  forward as a phase 3b result.
- **Width at rest, released:** rib 30.13 d against jersey 33.21 d, **0.907×** (phase 3: 0.843×).
- **Along the wales (not gated, read off the same runs):** rib jams at 18% against jersey's 17%, its recorded
  peak is 0.85 M against 1.22 M, and it loses more of its work (46.7% against 31.3%).

Nothing was tuned to make rib pass.

## Phase 3 — quasi-static test, the course direction, purl / rib / ssk (Oct 21–22)

**Outcome: not merged.** Gate Q's frictionless half fails (9.1% of the work lost against a 2% bar), the
course-direction test blows up in the jam (gate I), and the step-size half of Q passes on this draw but
replicas at fixed settings scatter more than the bar allows. **The rib question has an answer:** across
the courses 1×1 rib draws in at rest (0.84× jersey's width) and jams later (71% against 50%, measured on a
run past the gate's 60% range), both from the topology alone (§7). Every number below:
`node tools/verify-knit-lab.mjs --browser --scale` on this container (Intel Xeon @ 2.10 GHz, 4 cores,
Node 22), unless a section says otherwise. Model units throughout. Phase 2's record is below; where
phase 3 overturned it, it says so there too.

### 1. The stepped, quasi-static test

`PROTOCOL: 'stepped'` (the default; `'continuous'` is phase 2's test, kept for comparison). The driven
jaw moves one step — `STEP_EXT`, 1% of the gauge — at `STEP_SPEED` 0.5 d/s and stops. The swatch is
then HELD, the stationary jaw's load averaged over windows of `STEP_WINDOW` (10) frames, and the step is
recorded once, over the last window, **the two jaws read the same load and it is the load of the window
before**, both within `STEP_TOL` (0.2%) of max(|load|, 1,500), or after 900 frames, counted
unconverged. The first criterion is static equilibrium itself: nothing but the two jaws pulls along the
test axis (the plates push only in z, the cast-on rail only in y and z, the comb's pins slide freely in
x in a course test), so a swatch whose jaws disagree is still moving. Loading ends on a settled load
within 3% of `LOAD_LIMIT`; unloading steps back to where the jaws were clamped. One point per settled
step is logged and plotted.

Four things had to be fixed before the protocol measured anything:

- **The comb read low.** The tied tail's reaction was added to the pins' with the opposite sign
  convention, so the comb under-read by twice the tail's share: held at +30% the bottom jaw read 346,543
  and the comb 327,490. Fixed, they read 404,099 / 404,099. The bottom jaw — phase 2's load cell — was
  never affected; the comb's preload control was, so the settled swatch differs slightly from phase 2's.
- **The peak depended on the step.** Past the jam the load grows about exponentially (doubling every
  1–2%), so the first step past the limit landed anywhere from 1.0 to 2.1 M, and the peak sets how much
  work a cycle can lose. The last steps are shortened to the extension the last two steps' own growth
  says reaches the limit (`approachStep`), and a loading move stops the frame either jaw reads the limit
  (that step then ends the loading). Every wale run now peaks at 0.97–1.10 M.
- **The move itself was too fast.** At 1.5 d/s a step's move still carried dynamics: 22.1% / 19.4% of
  the work lost at 1% / 0.5% steps, against 25.0% / 23.6% at 0.5 d/s (μ 0.25, everything else equal).
- **The gate's child processes cut their own output.** A run wrote ~100 KB of JSON and called
  `process.exit()`; through a pipe that truncates it, and the parent died on the parse after two hours.
  The child exits in the write's callback now.

### 2. Why phase 2's friction was rate-dependent: no contact ever stayed stuck

The brief: phase 2 lost 29.5% of the work at 1.5 d/s and 9.1% at 0.5 d/s; find the cause. Found by
holding the swatch still: **at a fixed +25% with μ 0.25 the load climbed 319k → 467k in 1,500 frames and
→ 3.8 M in 3,000 (RMS point speed 0.4 → 4.2 d/s); at +10% it held.** The jaws were not moving.

The mechanism. Friction (`FRICTION_MODE 'substep'`, phase 2) cancels a contact's slip since the start
of the substep, up to μ × its normal multiplier — inside the contact pass. The stretch solve runs LAST
(it is the one met exactly) and slides the yarn along every contact to keep its length. So the slip
friction sees in a substep is only the prediction, and the slide it should have stopped happens after
it, every substep, unresisted. A stuck contact therefore creeps by one stretch-slide a substep, at a rate
set by the TIME STEP, not by μ: the resistance a test sees depends on how fast it pulls against that
creep (phase 2's rate dependence), and held in the jam the creep ratchets the knit tighter without end.
Ruled out on that hold: more substeps (48 still climbed; 64 held at μ 0.25 and blew up at μ 0.5), more
iterations (2 climbed, 3–4 crept), the closest-point solve on nearly parallel segments (no change),
friction moved after the stretch solve (the swatch froze, then broke its own length), and under-relaxed
friction (stable, but weaker than Coulomb and itself rate-dependent).

The fix (`FRICTION_MODE 'memory'`, the default): each contact carries the slip it let through — measured
at the END of the substep, after the stretch solve, at its own material points (s, t), so a contact that
rolls accumulates nothing — and the next substep's friction cancels that together with its own slip, up
to the same Coulomb cap. A contact that hits the cap is slipping and forgets it. **Held 600 frames at the
wale test's peak (1.05 M), the load moves 0.006% (gate H); phase 2's friction, held the same way, climbs
from 1.16 M to 2.82 M.**

Friction makes the knit stiffer early, as it should: with static friction that really sticks, a swatch
settled WITH friction carried stress frozen in from the drawn guess (soft region 18,300 per d, 32% of
the work lost). So the swatch now settles frictionless (`SETTLE_FRICTION 0`, a wet relaxation) and
friction comes on for the test; μ 0 and μ 0.25 start from the same swatch.

### 3. Gate Q: rate-independent now, but not repeatable to 10%

| run (μ 0.25 unless noted) | steps | lost | set | jam | peak |
|---|---|---|---|---|---|
| 1% steps, tol 0.2% (`plain`) | 61 | 24.7% | 7.64% | 23% | 1.05 M |
| 0.5% steps | 117 | 23.6% | 8.14% | 23% | 1.01 M |
| tol 0.05% | 59 | 22.7% | 7.68% | 22% | 0.98 M |
| 0.5% steps, tol 0.05% | 119 | 24.6% | 7.49% | 22% | 1.10 M |
| replica: preload × (1 + 1e-9) | 61 | 27.9% | 8.05% | 22% | 0.97 M |
| replica: preload × (1 + 2e-9) | 61 | 24.1% | 7.65% | 22% | 0.98 M |
| μ 0, 1% steps | 65 | **9.1%** | 3.22% | 23% | 0.97 M |
| phase 2's test, 1.5 / 0.5 d/s | — | 31.3% / 6.2% | 7.0 / 3.0% | 21% | 1.0 M |
| phase 2's test, μ 0 | — | 1.0% | 2.0% | 25% | 1.0 M |

- **Step size and tolerance: spread 8.8% in loss and 8.7% in set — under the 10% bar.** The phase-2
  test's 31.3% / 6.2% across speeds is the must-fail, and is rejected.
- **But the same test, its preload moved by one part in a billion, scatters 16% in loss** (24.1–27.9%).
  A first, uncapped set of three replicas read 21.6 / 25.0 / 26.6% (23%). The step / tolerance spread is
  inside that scatter, so the pass is a draw, not a margin: with friction the knit's path through the
  jam is chaotic and the work it loses varies run to run by more than the bar. Set is steadier (5–7%).
- **Frictionless, the cycle loses 9.1%, not under 2%: gate Q FAILS here.** Next section.

### 4. Frictionless: the knit has two shapes at the same extension

Phase 2 read the frictionless remainder (4.5%) as solver dissipation, and the phase-2 test itself now
reads 1.0% (it moves continuously at 1.5 d/s and never stops to settle). The stepped test does not
remove it — it exposes it: **frictionless, it loses 9–16% of the work** (9.1% at 1% steps, 15.5% at 0.5%
steps). It is not the hold: held 3,000 frames at +20%, the frictionless swatch rests at **62,309 on the
way up and 55,439–55,711 on the way down**, both still (and 27,728 / 15,472 at 64 substeps, 29,808 /
24,949 with the plates at ±2.5). Two equilibria at one extension. The two states differ by 1–5 d all
over the swatch and the loop heads sit at different depths — many pressed against a plate in one state
and not in the other: the stockinette between the plates curls and buckles out of plane, and that has
more than one stable shape. Closer plates (±1.2) take the frictionless loss to 6.0%, not to zero. A
frictionless knit with unilateral contacts can be multistable; this one is, and a quasi-static cycle
that passes from one state to the other loses work without friction. **Not fixed, because nothing about
it is wrong as mechanics**; the gate's premise (a frictionless cycle closes) does not hold for this
boundary condition. What would test it: a swatch with no plates and some other way to stop the curl
(gravity, a backing), or a frictionless cycle small enough to stay on one branch.

### 5. Pulling across the courses

`startTest('course')` (the page's "Pull across the courses"). Two stages, both in the sim:

1. **The width is released** (`releaseWidth`, phase `freeing`). After the ordinary settle the cast-on
   is on its jaw at the width it was DRAWN, which says nothing about the knit's own width. So the
   cast-on moves onto a RAIL (each point keeps its y and z, free along x), the comb's pins slide freely
   along x (a pin's push is shared between the pin and the yarn, the pin carrying mass 1), the comb
   keeps holding the preload, and the swatch settles again — frictionless, like the first settle —
   until the wale-centre span stops drifting. That span is the swatch's width at rest: **jersey 36.8 d
   after 198 frames** (drawn at 37.0).
2. **Side jaws grip the edge wales** (`clampSides`): every point of the first and last loop of every
   course and every selvedge turn, plus the tied tail on its own side — 367 + 376 points on jersey. The
   left jaw is fixed and is the load cell (its reaction along x); the right one is driven out along x by
   the same stepped protocol. Top and bottom stay where the release left them (the comb at the preload,
   the cast-on on its rail). The gauge is the distance between the two jaws: 37.6 d.

The two side jaws agree at every converged step (the convergence criterion requires it): nothing else
carries load along x. Early holds come fully to rest (RMS speed 0.000 d/s from +2%).

**Jersey, wale against course (gate D passes):**

| extension | 5% | 10% | 20% | 30% | 40% | 50% | 55% |
|---|---|---|---|---|---|---|---|
| along the wales | 20k | 33k | 123k | 1.05 M (limit) | | | |
| across the courses | 9k | 17k | 34k | 54k | 89k | 171k | 570k |

The jam (`findJam`: past 10%, where the tangent stiffness first reaches 10× the soft region's, 0.5–10%) comes at **23% along
the wales and 50% across the courses**; the soft region, per unit strain and per d of fabric across the
pull (so the two directions compare), is **6,972 along and 5,487 across (0.79×)**. Softer and jamming
later across the courses: the loops' heads and sinkers straighten before anything binds.

**Past the jam across the courses, friction ratchets and the run blows up (gate I fails).** The last
settled step, 55.97%, read 912k; the next (0.19%) never settled: held with both jaws still, the load
wandered at 0.76–0.98 M for ~140 frames, climbed to 1.17 M, then the yarn's strain jumped 0.65% → 8% in
20 frames and the run reached 2.95 M and 54% strain (the 5% strain stop ends the loading only when a step
is recorded). The unloading
curve then lies ABOVE the loading one, which is the −825% "loss" the gate prints. Forked from that
55.97% state and held 600 frames, jaws still:

| held at 55.97% | load after 600 frames | strain | RMS speed |
|---|---|---|---|
| as shipped (memory friction, μ 0.25) | 0.91 → 2.03 M | 23% | 14 d/s |
| 64 substeps a frame | → 10.9 M | 52% | 35 d/s |
| 2 iterations a substep | → 3.84 M (then stuck) | 2.1% | 0 |
| frictionless | → **0.267 M, steady** | 0.06% | 0.02 d/s |

So it is friction, and more substeps make it WORSE — not a time-step artefact that refining would cure.
Along the wales the same friction holds the jam still (gate H: 600 frames at 1.05 M, −0.006%). The
difference is the load path: across the courses the yarn is pulled ALONG its own length round every
loop, a capstan. The hypothesis, not isolated: friction stops the yarn sliding round the loop, the
tension rises, the contact's normal multiplier rises with it, and that raises friction's own cap — a
loop that position-based Coulomb friction, solved before the stretch, does not bound the way the real
capstan law (T₂/T₁ ≤ e^{μθ}) does. **Not fixed**: a fix is a change to the friction model (a capstan-
aware cap, or friction and stretch solved together), and it would re-open every friction number above.
The frictionless state at the same extension holds 267k, so roughly two thirds of the 912k was being
carried by friction.

### 6. Purl, 1×1 rib and ssk — topology, nothing tuned

- **Purl** is a loop pulled through its parent from the FRONT. In the record it is `kind: 'purl'` with
  one parent; in the geometry it is the knit loop with its depth sign flipped (`sgn(id)` in
  `buildYarn`): its legs go back through the parent and its head sits in front. The selvedge turn and
  the cast-on take the sign of the loop they belong to. The solver never reads the record and did not
  change.
- **The linking check knows the sign** (`LINK_SIGN`): a knit half links its parent −1, a purl half +1.
  Gate T: every leg of the rib's drawn start passes through its parent the right way; must-fail
  `purl-drawn-knitwise` (the purl drawn with the knit sign) makes 45 loops wrong.
- **1×1 rib** (`makeRib`): stockinette with every odd wale purl — k1, p1 across every course. Same
  yarn, same 10 × 10 stitches, same drawn gauge as jersey; 3,648 points against 3,476 (18.24 d of yarn a
  loop against 17.37: a purl next to a knit has to cross the fabric).
- **ssk** is k2tog mirrored: the LEFT parent's head is drawn over the right one's, the new loop stands
  on the RIGHT parent's wale, and the yarn over goes on the other side — `makeEyelet(…, 'ssk')`, course
  5 = `k1, (yo, ssk) × 4, k1`. Gate O checks the decreases' order (the top parent's head in front; k2tog
  leaning right, ssk left) on the drawn start, the settled swatch and after the test; must-fail
  `decrease-head-not-moved`.

### 7. What the new stitches do

**1×1 rib against jersey, across the courses (gate R: the two halves, read separately):**

- **At rest, rib draws in: 31.0 d wide against jersey's 36.8 (0.843×)**, both released from the same
  drawn width (37 d) by the same frictionless width settle (rib in 502 frames, jersey 198). The bar was
  ≤ 0.95×.
- **Rib does not jam within the test's 60% range; jersey jams at 50%.** Rib reaches 60% at 119k — where
  jersey is at 171k by 50% and 570k by 55% — with no jam by `findJam`'s definition, so the gate's ratio
  is NaN and the check FAILS as written (the bar, ≥ 1.25× jersey's jam, is 62.5%, outside the range).
  **Run on to 150% (`PULL_MAX_EXTENSION` 1.5, one run, not audited, not part of the gate): rib jams at
  71%, at 152k — 1.42× jersey's 50%, past the gate's 1.25× bar.** Its curve: 50k at 30%, 82k at 50%,
  113k at 60%, 134k at 70%, 299k at 80%; past its own jam the same friction ratchet as jersey's (§5) ends
  it on the strain stop at 89% (519k, 10.6% strain). Its released width that run was 30.7 d (31.0 in the
  gate run, 30.5 in the page): the width settle scatters by about 1%.
  So both halves of the rib result come out of the topology, untuned: **it draws in (0.83–0.84×) and it
  jams later (1.42×)**. The gate fails only because its test range (60%) stops short of the rib's jam;
  widening the range for course runs is one constant and an hour of gate time, not done here.
- Rib's soft region per unit strain per d of height is 5,008 against jersey's 5,487 (0.91×).
- The rib's cycle (to 60%, 119k) loses 73% of its small loading work with a 23% set — read nothing
  into it: it never loaded the knit.

Nothing was tuned for either result: rib is jersey's chart with every other wale's sign flipped.

**ssk eyelets against k2tog eyelets (along the wales):**

| | jam | soft region per d | lost | set | openings ≥ 1 d, settled / at +20% | loading ended on |
|---|---|---|---|---|---|---|
| plain | 23% | 8,417 | 24.7% | 7.6% | 0 / 0 | load (1.05 M) |
| yo, k2tog | 47% | 5,499 | 60.4% | 34.5% | 4 / 5 | **extension** (60%, 818k) |
| ssk, yo | 42% | 3,914 | 48.4% | 24.7% | **2** / 4 | load (0.93 M) |

- Both decreases keep their recorded order through the test, and ssk leans left — except **one ssk,
  settled, whose two parent heads sit level (−0.04 d), so which is on top is not decided there (gate O
  FAILS on it)**; by the end of the test it is back on top (+0.03 d), and the other three are clearly
  ordered throughout.
- **The ssk row opens only 2 holes of radius ≥ 1 d at rest (gate E FAILS on it; 4 at +20%)**; k2tog's
  opens 4. The ssk swatch is also the softer of the two and jams earlier. Whether that is the ssk itself
  or the drawn start (the ssk's depth choreography is k2tog's mirrored, not re-swept) is not isolated.
- **The k2tog eyelet swatch reaches the 60% extension cap at 818k, before the load limit (gate I
  FAILS)**; its loss and set are therefore from a cycle that stopped short.

### 8. Gate results

`node tools/verify-knit-lab.mjs --browser --scale` (19 simulations, 4 at a time, 6,699 s), then
re-judged with `--reuse` after the frictionless must-fail was corrected. **8 checks fail.** Every check
has a must-fail, and every must-fail rejects.

| gate | what | result |
|---|---|---|
| Q | μ 0.25: loss and set across step 1% / 0.5% × tolerance 0.2% / 0.05% | PASS — 8.9% / 8.6% spread (but replicas scatter 16%, §3) |
| Q | μ 0: the stepped cycle loses under 2% | **FAIL — 9.1%** (§4) |
| H | held 600 frames at the peak, the load stays put | PASS — −0.006% (phase 2's friction: +141%) |
| T | each drawn start is its chart (plain, k2tog, ssk, rib) | PASS — 4 / 4; must-fails 8, 8, 45 loops wrong |
| O | decreases keep their order (k2tog right, ssk left), drawn / settled / after | 5 / 6 — **FAIL: one ssk settled level (−0.04 d)** |
| F | μ 0.25 still has a soft region before the jam | PASS — 1.94× the frictionless |
| I | strain < 1% before the jam, every run | PASS — ≤ 0.08% |
| I | no collapse past the jam | PASS — except **rib: no jam reached** |
| I | the load limit, not a safety, ends the loading | **FAIL ×3** — k2tog eyelet: 60% extension; jersey course: strain stop (§5); rib course: 60% extension |
| C | friction adds to the loop (μ 0.25 vs 0) | PASS — 24.7% vs 9.1%, set 7.64% vs 3.22% |
| E | eyelet rows open (≥ 4 openings ≥ 1 d, settled and at +20%) | k2tog PASS (4 / 5); **ssk FAIL (2 / 4)** |
| E | the eyelet swatches jam at a different extension | PASS — 47% and 42% against 23% |
| D | jersey is softer and jams later across the courses | PASS — jam 50% vs 23%; 0.79× as stiff |
| R | rib jams ≥ 1.25× later across the courses, and draws in ≤ 0.95× at rest | **FAIL as written** — no jam within 60%; width 0.843×. Run to 150%: jam at 71% = 1.42× (§7) |
| S | no pass-through (plain, eyelet, rib course; audited) | PASS — 0 deep overlaps; certificate 2.65 M / 2.65 M substeps |
| W | the page keeps drawing while it settles (worker) | PASS — p95 33.4 ms, longest 66.7 (main thread: 166.7 / 199.9) |

### 9. Size against speed (this solver, settling frames; not gated)

`--scale`, stockinette N × N, settling, on this container (with the gate's four simulations running
beside it, so read the ratios more than the absolutes):

| swatch | points | contact pairs | ms a substep | ms a 32-substep frame | µs a point |
|---|---|---|---|---|---|
| 10 × 10 | 3,476 | 13,702 | 1.47 | 47 | 0.42 |
| 20 × 20 | 13,781 | 56,241 | 6.73 | 215 | 0.49 |
| 30 × 30 | 30,909 | 117,084 | 17.74 | 568 | 0.57 |
| 40 × 40 | 54,861 | 188,108 | 33.21 | 1,063 | 0.61 |

About linear in points, a little worse per point as the swatch grows (the contact list). The stepped
test costs far more WALL time than the continuous one at the same solver speed: a 10 × 10 wale cycle is
~61 steps of ~80 held frames (≈ 7,000 frames, 8–20 min in Node depending on load), a course cycle
~26,000 frames (≈ 45 min), the audited rib course ≈ 110 min. 10 × 10 is still the only size that is
interactive (~20 sim frames a second on one core); 20 × 20 is ~5.

### 10. Screenshots

`docs/img/knit-lab/`: `jersey-rib-settled.png` (stockinette and 1×1 rib settled, side by side, cast-on
still pinned at the drawn width), `rib-mid-course-pull.png` (rib held at +30% across the courses),
`course-plot.png` (rib and jersey along the courses, log load), `panel.png`. Phase 2's and phase 1's
are kept.

### 11. What is untested / not done (phase 3)

- **The course direction past the jam** (§5): friction ratchets there; jersey's course cycle and its loss
  are not meaningful past its last settled step (0.91 M at 56%).
- **Repeatability**: one replica pair per settings is measured; a real error bar wants tens.
- **Frictionless multistability** is diagnosed (two rest states at one extension) but not removed.
- **Rib and ssk are checked against their charts on the drawn start only** (linking numbers); after the
  start the pass-through certificate carries topology, as before.
- **Purl-only fabric (reverse stockinette), seed, other ribs** are one-line charts and untested.
- **The page's course test** runs the same code; it was driven once by the screenshot tool; the page's
  numbers differ from the gate's in the last bits, as in phase 2.
- **No CI** covers any knit-lab file; run the gate by hand (≈ 2 h on 4 cores, the audited rib course
  pull being the longest run; `--reuse` re-judges a finished run's output in seconds).

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

### Rate (superseded by phase 3 §2–§3)

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

- ~~**Rate dependence of friction's loss** (above) — measured, not explained.~~ Explained and fixed in phase 3 §2.
- **Permanent set read off the curves, not off a released swatch**: releasing the comb to the preload
  after unloading was tried and the comb reading is unreliable in compression (the comb moved down
  while the bottom jaw read near zero), so it was dropped.
- ~~**Only the eyelet chart** exercises yo / k2tog; ssk is the same case with the list reversed and is
  untested;~~ ssk built and gated in phase 3; increases (two children in one parent) are allowed by the record and never built.
- **The decrease geometry is one sweep's optimum** at this gauge and yarn; another wale pitch may need
  the sweep re-run (the gate's linking check will say so).
- **The page's drag-to-pull** goes through the worker and has no committed check.
- Everything in phase 1's list below still applies except where marked superseded.

## Files

| file | what |
|---|---|
| `knit-lab.html`, `knit-lab.css` | the page (site tokens, Field Notes chrome, `noindex`) |
| `knit-lab.js` | the page: draws what the engine reports (2D canvas, depth-sorted shaded tubes), swatch choice (stockinette, k2tog / ssk eyelets, 1×1 rib), pull direction (along the wales / across the courses, side jaws drawn), drag-to-pull (wales only), the load–unload plot (settled steps) + CSV |
| `knit-lab-engine.js`, `knit-lab-worker.js` | runs a `KnitSim` and reports by message; the worker hosts it (`#WORKER=0`: on the page's thread) |
| `knit-lab-sim.js` | the simulator, pure (no DOM): initial geometry (knit and purl), XPBD constraints, friction with slip memory, jaws (comb, cast-on, rail, side jaws), the stepped test, certificate. `PARAMS` and `DECREASE_SHAPE` at the top hold every constant |
| `knit-lab-topology.js` | the knit record (see below), `makeStockinette` (any knit / purl per wale), `makeRib`, `makeEyelet` (k2tog or ssk) and the validator |
| `knit-lab-analysis.js` | linking numbers (signed: knit −1, purl +1), the decreases' order, the jam, hysteresis and set (per settled step), holes — read by the page and the gate |
| `tools/verify-knit-lab.mjs` | every phase-4 number in this doc and its must-fails, three seeds per checked test (`--browser` the worker gate, `--scale` the size table, `--reuse <dir>` reuses saved runs, `--no-course` iteration only; ≈ 9 CPU-hours, 43 runs) |
| `tools/shot-knit-lab.mjs` | the screenshots, through the real page in headless Chromium (`--runs <gate out>` draws the wale and course plots from the gate's runs; `--phase2` the phase-2 set) |
| `docs/img/knit-lab/` | phase 3: `jersey-rib-settled.png`, `rib-mid-course-pull.png`, `course-plot.png`, `panel.png`; phase 2: both swatches settled and at +20%, the load–unload plot; phase 1: `1-start.png` … `4-end-of-pull.png` |

`textile-knit-loops.js` is imported (its `loopPoint` jersey curve gives the starting x/y) and not
modified. `textile-stretch-simulator.*` is untouched. Nothing from Asunder Knit or any commercial
tool was looked at.

## The topology structure

`knit-lab-topology.js`. A swatch is `rows` — courses bottom first, each a list of loop ids in slot
order — and `loops`, each `{ id, course, slot, kind, through }`. **`through` is the whole topology**:
the ids of the loops of the previous course this loop was pulled through.

- plain knit: `through: [a]`
- purl (phase 3): `kind: 'purl'`, `through: [a]` — pulled through from the front
- yarn over: `through: []`
- k2tog / ssk: `through: [a, b]`, order = which parent lies on top (k2tog: the right one; ssk: the left)
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
