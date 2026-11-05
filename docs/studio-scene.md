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
| `scene/studio-cats.js` | the director: two cats, scheduling, exclusivity, clicks, sleep, the dev scrub/replay |
| `scene/studio-draw.js` | the room plane (drawn once per resize) and the furniture + cats plane (painter's order) |
| `scene/studio-dev.js` | the `?dev=1` harness and overlay — the only DOM module, fenced to its container |
| `tools/verify-scene-studio.mjs` | the gate (Node + browser; `--negative-control`, 16 mutants) |
| `tools/shot-scene-studio.mjs` | the key-frame contact sheets → `docs/img/studio-cat-jumps.png` |

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

## Decisions made without a ruling

1. **Greyscale daylight palette.** The section is one ink and one ground; a light
   grey room with two black cats keeps that and reads. Per-scene palettes are a later
   phase.
2. **Chairs face the table**, backs outward, so floor → chair is taken diagonally over
   the seat's open corner (a jump straight into the room's depth reads as a column
   from behind). Most of the bay's furniture is "into the picture", so several jumps
   are foreshortened; that is the camera the brief asks for.
3. **"Never the same surface" includes the floor** (literal reading).
4. **Spontaneous relocation** is scheduled 20–60 s after the last one *ended*;
   measured ~one per 50 s over 25 min. **Sleep** after 45–95 s idle on a comfortable
   perch (sill, chaise, chairs); a sleeper always runs a wake beat before a leg.
5. **Clicks**: one queue slot per cat; ≥ 4 clicks in 5 s → ear flick and 6 s of being
   ignored; a second accepted click inside 1.2 s → ear flick. A click on a floor cat
   relocates it (if the other cat is still); on a perch it picks stretch / groom /
   look-at-viewer / reposition / settle-down, never the action the other cat is doing
   and not the one it just did.
6. **Direct floor → sill** is legal and chosen ~8 % of the time (route costs grow as
   rise^1.8 with per-plan jitter).
7. **Reduced motion** is not specialised yet.

## Measured (gate and sheet, seed-fixed)

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
