# Scene 4 — the studio bay window: room shell and cat locomotion

`/scene.html?scene=4` (`?dev=1` for the tuning harness). Placeholder room, a perch
graph, two black cats. Judged on how the cats move; nothing architectural is final.

## What existed, and what this extends

- **There are no sandpipers in the repo.** Scene 3 (the beach) publishes
  `swashYAt` / `highWaterYAt` "for birds later" and builds none, so there was no
  creature rig to extend. The only creature system is scene 1's koi (a steering
  school with a spine chain), which shares nothing with a legged animal.
- So the cat rig is new, built in the scene conventions: DOM-free modules plus one
  wiring file, the seeded stream (per-cat, carried in the cat's state so a snapshot
  replays exactly), shell-owned loop and input, `state()` / `__pump` test chrome,
  and a Node gate. Slot 4 (slot 2 is where `verify-scene.mjs` injects its probe).
- Shell change, two fields on the host: `dev` (`?dev=1`) and `panel()` (a
  container mounted inside the stage). No scene module reads `location` or touches
  `document`; the shell's listener count is unchanged.

## Files

| file | owns |
|---|---|
| `scene/studio-room.js` | the camera, the room constants, the FURNITURE list (data), the perch NODES and EDGES, route finding |
| `scene/studio-cat.js` | one cat: channels, eased tweens, foot planting and the gait, every program (up-jump, down-jump, step across, actions) |
| `scene/studio-rig.js` | the drawable skeleton: spine, two-bone IK legs with a sliding scapula, 3-D head, sprung tail |
| `scene/studio-cats.js` | the director: two cats, the pair clock, the mirror rule, the shared floor, clicks, dozes, the dev scrub/replay |
| `scene/studio-draw.js` | the room plane (drawn once per resize) and the furniture + cats plane (painter's order) |
| `scene/studio-dev.js` | the `?dev=1` harness and overlay — the only DOM module, fenced to its container |
| `tools/verify-scene-studio.mjs` | the gate (Node + browser; `--negative-control`, 25 mutants) |
| `tools/shot-scene-studio.mjs` | the key-frame contact sheets → `docs/img/studio-cat-jumps.png` |
| `tools/record-scene-studio.mjs` | moving pictures: 60 s of the director at real speed, one leg at 240 Hz (exact frames, the shell paused; videos are NOT committed) |

## The motion, and where each rule of the brief is kept

- **Up-jump** = notice → approach (walk to a launch spot squared up; from the floor
  the standoff is `0.42 × rise` from the target's edge) → gather (500–1200 ms,
  weight back, haunches down, head locked, tail twitch, sometimes a hind tread and a
  butt wiggle; sometimes +300 ms hold; sometimes an abort and a re-gather) → launch
  (80–120 ms, a Hermite from rest into the arc's initial velocity) → flight → touch
  → compress → recover → settle.
- **The flight is solved, not tweened.** Given the planned T (250–450 ms by height)
  and the apex (drawn 15–25 % of the rise above the landing surface), gravity is
  solved and held constant along the arc; horizontal speed decays under a light drag
  (near-linear, measurably not linear). The landing pose is solved so the posed
  forepaw meets the target surface exactly at T, then the hind paws are swung down
  60–100 ms later. Forepaw-first is a construction, and the gate measures it off the
  paw heights, not the event log.
- **The arc reference** is the body centre less 21 cm (the standing centre height),
  i.e. "where the paws would be" — the quantity the apex rule is measured on.
- **Down-jump** is its own program: notice → approach → peer → reach (forepaws over
  the edge) → pour (the body tips nose-down over the edge, hind paws still planted)
  → fall (true free fall, 981 cm/s², hind paws leave last) → touch → a deeper,
  longer compress → recover → settle.
- **Step across** (table ↔ sill, 4 cm, a 10 cm gap) is *walked*: the gait plants each
  paw on whichever surface is under it, and a paw that would land in the gap is
  carried over or held back to the nearer edge.
- **No linear easing anywhere**: there is no linear ease to ask for (`tween()`
  throws), walking speed surges with the gait, turns are springs. The gate samples
  every channel of every program at 1/240 s and fails on a run of constant
  non-zero slope; it caught one (a turn-rate cap I added), which is why it is gone.
- **Feet do not slide**: a lateral-sequence walking gait (HL → FL → HR → FR, quarter
  cycle apart, landing half a stride ahead) and a threshold shuffle at rest, with a
  stance minimum so a diagonal pair cannot starve the other.

## The continuity pass (Nov 5) — one curve per channel, every seam C2

Eva's brief after viewing #493: motion was not smooth, stillness was the default,
and four defects. What changed, and where it is kept:

- **Tweens carry velocity.** `tween()` builds quintic Hermite segments (position,
  velocity and acceleration at both ends); the first segment starts from the
  channel's own rate (`chanRate`: the running segment's derivatives, else what the
  last step measured), waypoints take PCHIP velocities, and only the true ends rest.
  An ease name is now a SKEW on the quintic (`out`, `in`), which keeps the end
  derivatives — so "ease-out" means "arrives slower", never "starts from rest".
- **The free body is data.** In a jump or drop the body's s / y / pitch / length are
  chains of pieces on the cat (`seg`, `glide` under drag, `ballistic` under constant
  gravity), each piece handed the previous one's state at its start, so the push →
  arc → landing seams are C2 by construction and scrub/replay stay exact.
- **The landing is set down, not stopped.** At touchdown the descent continues from
  the arc's own velocity into the crouch in the longest time that stays monotone,
  the forward travel stops in the longest time that does not roll back, and the
  cat is grounded only at the end of recover, at rest. The forepaws swing in the
  last 70 ms of the arc as world-space curves that arrive at rest exactly at its end
  (measured contact speed ≤ 0.37 cm/s); the hind paws peel off at liftoff starting
  from minus the hip's velocity, so they leave at rest instead of being dragged.
- **Paws are continuous arcs.** A swing starts from the paw's own velocity and
  acceleration and ends at rest; its lift vanishes with two derivatives at both ends.
  A step that would over-reach on the gait's schedule is taken early (≥ 3 paws down).
- **No knee flips.** The leg IK's reach is a soft (tanh) limit from 0.86 to 0.985 of
  the leg's length, the same at the folded end, and the scapula/hip slide takes the
  rest — so the knee's motion is continuous in acceleration even at full stretch.
- **The witness is refinement, not a threshold.** Every drawn point (spine, head,
  each knee and paw, the tail tip) is simulated at 1/960 and 1/1920 s; the largest
  per-step change of velocity (and of acceleration) must halve when the step halves.
  A seam reads ~1. Covered: all 21 edges and a chain of nine back-to-back actions.

**The ambient spec, revised** (`studio-cats.js` header):
- a deliberate action every 5–12 s across the PAIR (the pair clock), chosen for the
  cat and its surface: walk somewhere on the floor (wander), sit, look, groom,
  stretch, reposition, a jump, a doze; an action often chains a follow-up;
- both cats may move at once, but the second may not start the same KIND of thing
  within 4 s (`MIRROR_WINDOW`), and a small action is never done by both at once;
- the floor is shared; two cats on it keep `FLOOR_APART` (55 cm) at rest, at a
  walk target, a landing and a launch, and a walk never passes the other cat;
- a doze is 8–20 s and ends on its own; a sleeper wakes before it moves;
- every other surface still holds one cat, and no position is ever set directly.

**The four defects:**
1. **White seams in the silhouette.** A cat is now ONE ink fill (tail, spine, neck,
   near legs, head, muzzle, ears), every subpath wound one way, and every capsule is
   built on its true external tangents (a band on the perpendicular leaves a sliver
   where it meets a disc of a different radius). The far legs are a separate lighter
   fill underneath, on purpose. Not reproducible in headless software raster before
   or after; removed by construction and gated (`draw/…one-ink-fill…`).
2. **Leg over-reach on the pour.** The pour's reach point moved 3.5 cm back from the
   edge and 0.5 cm up (`solveDownJump`), and the IK's soft reach takes the rest;
   largest limb shortfall now 0.60 cm on sill > floor.
3. **The sill's top edge** stopped short of the back wall; it is now cut at the
   wall plane, its aprons follow it, and a nosing line marks the edge.
4. **The chaise** did not read as one: its raised end is now at the bay end, the
   cushion, end and low back are separate parts, and the painter's order is by
   SEPARATING PLANES per part (a cat is in front of a part if it is on the camera's
   side of one of the part's camera-facing faces, or above its top), so a cat on,
   beside, or behind it is drawn correctly.

## Decisions made without a ruling

1. **Greyscale daylight palette.** The section is one ink and one ground; a light
   grey room with two black cats keeps that and reads. Per-scene palettes are a later
   phase.
2. **Chairs face the table**, backs outward, so floor → chair is taken diagonally over
   the seat's open corner (a jump straight into the room's depth reads as a column
   from behind). Most of the bay's furniture is "into the picture", so several jumps
   are foreshortened; that is the camera the brief asks for.
3. **~~"Never the same surface" includes the floor.~~** Superseded Nov 5: the floor is
   shared, at `FLOOR_APART` 55 cm (a chosen number: about two cat lengths at rest).
4. **~~Spontaneous relocation every 20–60 s; sleep after 45–95 s idle.~~** Superseded
   Nov 5 by the revised spec above. Chosen without a ruling: the 4 s mirror window, the
   55 % chance an action chains a follow-up, a 1 s retry when no action can start,
   and "a deliberate action" counting a wander, a jump, a groom, a look, a stretch, a
   reposition, a pose change and a doze alike.
8. **The chaise's raised end moved to the bay end** (Nov 5) so the cushion faces the
   room; the edges to and from it were re-measured.
9. **The body's per-step speed bar is 6 cm per 1/120 s** (was 4): the legal
   floor > sill jump moves the body 4.78 cm in one step at the top of its push, and
   the old bar was below that on `main` too (4.64). Paws keep 15 cm.
5. **Clicks**: one queue slot per cat; ≥ 4 clicks in 5 s → ear flick and 6 s of being
   ignored; a second accepted click inside 1.2 s → ear flick. A click on a floor cat
   relocates it (if the other cat is still); on a perch it picks stretch / groom /
   look-at-viewer / reposition / settle-down, never the action the other cat is doing
   and not the one it just did.
6. **Direct floor → sill** is legal and chosen ~8 % of the time (route costs grow as
   rise^1.8 with per-plan jitter).
7. **Reduced motion** is not specialised yet.

## Measured (gate and sheet, seed-fixed)

**Nov 5 (the continuity pass):**
- Velocity continuity: worst refinement ratio **0.51** over 22 programs × 17 drawn
  points (a seam reads ~1); acceleration **0.60**; forepaw contact ≤ 0.37 cm/s.
- 25-minute director soak (seed 21): 167 actions, **mean 9.0 s apart**; a cat busy
  **83 %** of the time; both travelling at once 1.4 %; closest on the floor 102 cm;
  7 dozes of 9.6–14.3 s; 0 shared perches; 0 same small action together.
- Largest limb shortfall 1.67 cm (sill > table), 0.60 cm on the pour.
- Frame cost under the director, headless Chromium 1280×800, software raster:
  over 180 s, 10,798 frames: **p50 0.40 ms, p99 1.00 ms, worst 5.90 ms** a frame; frame
  interval p99 16.8 ms, 2 frames missed (worst interval 33.4 ms, while another gate
  ran on the same box). The gate holds p99 < 8 ms, worst < 16.7 ms, ≤ 1 % missed.
- `node tools/verify-scene-studio.mjs`: **44/44** (Node 35 + browser 9, the frame-cost check reading
  p99 1.20 ms, worst 2.10 ms, 0 missed over 40 s); `--negative-control`: **25/25** (23 in
  one clean sweep; the two it missed were a mutant list short in the honest direction and a
  real hole — the one-fill check could not see a non-tangent capsule band — both fixed and
  re-run). `node tools/verify-scene.mjs`: **145/145**. Do not run the two gates at once
  on one tree: verify-scene.mjs sweeps `scene/__mutant__*`, which is why this gate now
  names its trees `__studio_mutant__*`.

**Before (Phase 1, #493):**

- Apex 15.8–23.8 % of the rise; fore → hind 71–96 ms (up), 70–120 ms (down);
  gravity constant within 0.00 % per flight; launch squared up within 3.4°.
- Ten gathers from ten seeds: 617–1183 ms, all distinct.
- 25-minute soak: 0 steps with both cats moving, 0 sharing a surface, 0 running one
  action together, every surface change at the end of its own leg; worst body step
  3.5 cm per 1/120 s (flight).
- Largest limb shortfall 1.5 cm (stretched over the table/sill gap).
- Draw cost 0.36 ms a frame; 60 fps headless.
- `node tools/verify-scene-studio.mjs`: 38/38; `--negative-control`: 16/16 mutants
  caught. `node tools/verify-scene.mjs` (shell + scenes 1, 3): 145/145 with its
  registry checks updated for three built scenes.
