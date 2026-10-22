# Knit Lab — yarn-level knit feasibility spike (Oct 21; phase 2 the same day, phase 3 Oct 21–22)

`/knit-lab.html` (noindex, unlinked). Ten wales × ten courses of stockinette knitted flat from one
yarn — plain, or with one eyelet row across the middle — the yarn a chain of points relaxed with XPBD,
settled, then **loaded to a load limit and unloaded**. Phase 1 asked whether the browser can do this
at interactive speed and whether the result behaves like a knit (yes, on the CPU, for 10 × 10).
Phase 2 made the physics trustworthy before adding stitches: friction that behaves like yarn, a yarn
that stays inextensible under load, a load–unload cycle, yarn overs and k2tog, and the simulation in a
Web Worker. Phase 3 replaced the continuous pull with a stepped, quasi-static test, found why phase 2's
friction was rate-dependent, added a pull across the courses, and purl, 1×1 rib and ssk. Each phase's
record is kept below the next; where a later phase overturned an earlier one, it says so.

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
| `tools/verify-knit-lab.mjs` | every phase-3 number in this doc and its must-fails (`--browser` the worker gate, `--scale` the size table, `--reuse <dir>` re-judges saved runs; ≈ 2 h on 4 cores) |
| `tools/shot-knit-lab.mjs` | the screenshots, through the real page in headless Chromium (`--runs <gate out>` draws the course plot from the gate's runs; `--phase2` the phase-2 set) |
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
