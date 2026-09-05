/* ===================================================================
   bloom-smoke.mjs — THE NAMED SMOKE SUBSET. FOR ITERATION, NEVER FOR MERGE.

   WHAT THIS IS. A written-down, derived, auditable subset of
   buildMatrix() — 28 of 499 rows — run through the REAL export gate with
   its own `--only` flag. It exists so a session can find out in ~2 minutes
   whether it has broken something, instead of in ~44. It is ADDITIVE: it
   changes nothing about what certifies the work.

   **THE FULL MATRIX REMAINS THE MERGE CRITERION, UNCHANGED.** Both STL
   gates on all 499 rows, in CI, on the merge commit. Nothing here may be
   quoted as a pass of the matrix, and this tool prints a banner saying so
   on every run, because the gate's own summary line ("28/28 configs
   watertight") does not carry the scope of a filtered run.

   =================================================================== */

/* WHY THE EXPORT GATE AND NOT BOTH (measured, session 17).

   The two STL gates run the SAME per-row assertion set — formAssertions,
   curlAssertions (C1-C3), thicknessAssertions, junctionAssertions (J1-J9),
   zygoAssertions (Z1-Z9), exportFloorAssertion, applyCapability,
   shownModeAssertion, footCrowding (R1-R5). The export gate adds the edge
   census, the degenerate count and plan coverage; the connectedness gate
   adds ONE thing the export gate does not have: the voxel flood fill.

   Across sessions 7, 10, 11, B, 13, 14, 15 and 16 the charter records that
   flood fill catching NOTHING — every positive control reads "1 piece". It
   was re-measured on this head rather than inherited: session 14's P1 (the
   hub ignores the owner's dome) and P2 (feet lifted but horizontal) driven
   through the connectedness gate over this subset read 21/21 ONE CONNECTED
   PIECE on every row it measured, while J3 and J1 respectively fired on the
   export gate. So a second 83 s of flood fill buys nothing during
   iteration. It remains half the merge criterion.

   **AND THAT ARGUMENT HAS AN EXPIRY: --conn IS REQUIRED, NOT OPTIONAL, WHEN
   A SESSION INTRODUCES A NEW GEOMETRY MODE (Eva, session 17).** The reason
   the flood fill catches nothing is that J1-J9 fire first — which is a fact
   about modes whose junction assertions EXIST. A brand-new mode is exactly
   where the assertions may not model the failure yet, and the flood fill is
   the backstop for failures the assertions do not model. So: a session
   adding a placement, a junction shape, or any new geometry mode runs
   `--conn` until that mode's junction assertions are established AND have
   been shown to fire on a mutant. Then it may drop back to export-only.

   =================================================================== */

/* WHAT THIS SUBSET IS BLIND TO — read this before believing a green run.
   Not a caveat paragraph: five named holes, four of them structural.

   1. EVERY MATRIX-LEVEL CLAIM. crowdingCoverage(), curlCoverage() and the
      "some row asserts plan coverage" clause are claims about the MATRIX,
      and both gates correctly suppress them under `--only`. A flag that
      becomes stuck-on, or that stops being raised anywhere, is invisible
      here by construction.

   2. THE 471 ROWS IT DOES NOT RUN. A defect reachable only at a particular
      petalCount, a particular centre sub-control value, one of the GATED
      inertness rows, the fan's arc-limit corners, or DEPTH 4 and 5, is not
      in scope. "Not run" is unknown, never passing.

   3. BYTE MOVEMENT. This is a gate run, not a byte diff. It cannot report a
      moved row. tools/diff-bloom-bytes.mjs is untouched by it and remains
      the close-out instrument for byte identity.

   4. THE VOXEL FLOOD FILL, whenever --conn is off. See the note above:
      measured to have caught neither dome mutant, and never to have caught
      anything in this project. "Never has" is not "cannot".

   5. **A NEW ASSERTION FAMILY WITH NO SMOKE ROW — AND THE DRIFT GUARD BELOW
      CANNOT SEE THIS ONE.** The guard counts matrix BLOCKS, not assertion
      families. Every family runs on every row, so "is J10 covered?" is
      trivially true and tells you nothing; what you actually want to know is
      "can some smoke row make it FIRE", and that is the mutant table, which
      cannot be derived statically. **Closing this hole means RE-RUNNING THE
      MUTANT TABLE when an assertion family is added** — there is no check
      that will do it for you. (Ruled session 17: a static fix was looked for
      and does not exist.)

   =================================================================== */

/* HOW THE SUBSET WAS SELECTED — the method, so it can be argued with.

   1. Enumerate the branches actually present in bloom-geometry.js:
      footRing()'s ringed / continuous / fan arms, roleForSlot,
      roleForLayer, ROLE_ALL, petalForm, spineLaw, buildHubInto's flat and
      dome arms, the four centre styles, and every guard and floor.
   2. Cross that with the assertion families that need a witness.
   3. For each path take the CHEAPEST matrix row that engages it, preferring
      a row that engages several at once, and preferring pinned / GATED /
      named corners over blanket-sweep rows.
   4. Reject any row costing more than ~15 s unless nothing cheaper carries
      the path.

   Rule 4 did real work: it rejected `DOME: the INCURVE TARGET x rise 0.5`
   (50.2 s) and `DOME LEAN: EVA_CONFIG x rise 1` (80.5 s), and kept the FLAT
   incurve row (14.4 s), which is the other of only two rows in the whole
   matrix that ASSERT plan coverage.

   THE PATH -> ROW MAPPING IS THE `path` FIELD ON EVERY ENTRY BELOW. A
   subset nobody can audit is a subset nobody should trust.

   =================================================================== */

/* THE DRIFT GUARD — two clauses, both machine-checked, no escape hatch.

   The flower project's edge-treatment lesson, one level up: ONE OWNER for
   "is this station covered". Adding a matrix block later without a smoke
   row would silently narrow this instrument while every run stayed green.

   CLAUSE A — BLOCK COVERAGE. buildMatrix()'s own source is parsed for its
   `/* N. TITLE` markers and SMOKE_BLOCKS must declare exactly that set. A
   new block fails the guard BY NAME. There is deliberately no "why no row"
   field: a guard with an escape hatch is a guard that narrows quietly, and
   filling one in is easier than adding a row.

   CLAUSE B — MEMBERSHIP, VERIFIED RATHER THAN ASSERTED. Each block declares
   its FIRST row's label as an `anchor`. The guard resolves every anchor
   against the live matrix, requires the indices strictly increasing and
   starting at 0, derives each block's index range from consecutive anchors,
   and requires each of that block's smoke rows to fall INSIDE its own
   range. So a smoke row attributed to the wrong block is a red run, and a
   block that grows at its head breaks its anchor loudly.

   DERIVING THE ROW->BLOCK MAP FROM SOURCE TEXT WAS TRIED AND IS NOT SOUND:
   labels are template literals and short labels ("petalCount 3") match text
   inside other blocks. The anchor scheme is what makes membership a
   measurement instead of a claim.

   Note the block NUMBERS have gaps — 1..13 and 16..21, because sessions 11
   and 13 folded the per-petal sets into block 13. A block's identity here
   is its marker, never its position.

   =================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildMatrix, ROOT } from './bloom-harness.mjs';

const HARNESS = path.join(ROOT, 'tools/bloom-harness.mjs');

/* ---------- THE SUBSET ---------------------------------------------- */

export const SMOKE_BLOCKS = [
  {
    n: 1,
    anchor: 'DEFAULT (the shipping configuration)',
    rows: [
      { label: 'DEFAULT (the shipping configuration)',
        path: 'the shipping state; every guard OFF at once — petalFormIsFlat, domeIsFlat, thicknessIsUniform, curlIsUniform, one whorl, RADIAL, DISC' },
    ],
  },
  {
    n: 2,
    anchor: 'NONE × spread min (0.6)',
    rows: [
      { label: 'RING × spread max (6)',
        path: 'buildCenterInto RING arm (the open torus collar) against the widest hub plate' },
    ],
  },
  {
    n: 3,
    anchor: 'DOME × centerSize min (0.25)',
    rows: [
      { label: 'DISC × centerDish max (0.9)',
        path: 'the centre sub-controls — the DISC arm dished to its maximum' },
    ],
  },
  {
    n: 4,
    anchor: 'ALL MIN (centre off)',
    rows: [
      { label: 'ALL MIN (centre off)',
        path: 'the blanket minimum corner, centre off — the bare bloom the flower shipped in seven pieces for months' },
    ],
  },
  {
    n: 5,
    anchor: 'FORM: QUILL (roll alone, toward a tube)',
    rows: [
      { label: 'FORM: FIDDLEHEAD (spine curl alone)',
        path: 'uniform spine curl — the closed-form arc branch, and C2\'s only witness (the integrator\'s own validity)' },
      { label: 'FORM: ROLL CLAMP (roll max x narrowest petal)',
        path: 'cross-section roll and the roll curvature floor, saturating and told' },
      { label: 'THIN: ALL THIN × spread min',
        path: 'the thickness layer, the export feature-size floor diverging from live, and the foot-hub overlap box at its worst reachable corner' },
      { label: 'TIP: truncate (breadth max) — must NOT converge',
        path: 'the tip-cap partition on petalTipBreadth === 0 — the authored-truncate arm, which must NOT converge' },
    ],
  },
  {
    n: 6,
    anchor: 'CAPABILITY: claw (non-monotone width)',
    rows: [
      { label: 'CAPABILITY: cleft (two-span domain)',
        path: 'the trim domain with two spans per row — the panel-per-span construction, reached only through window.__bloomCapability' },
    ],
  },
  {
    n: 7,
    anchor: 'SPIRAL x petalCount 3 (below the legibility flag)',
    rows: [
      { label: 'SPIRAL x defaults',
        path: 'the SPIRAL placement arm and the low-count legibility flag' },
    ],
  },
  {
    n: 8,
    anchor: '6 layers x layerSize min (0.35)',
    rows: [
      { label: '6 layers x layerSize min (0.35)',
        path: 'the layer sub-control sweep at the deepest reachable whorl — a blade narrower than its own root' },
    ],
  },
  {
    n: 9,
    anchor: 'LAYERS: 3 x spread min',
    rows: [
      { label: 'LAYERS: 3 x ALL THIN x spread min',
        path: 'RADIAL layers — J1-J4 at the thinnest junction the matrix reaches (the wrong-hub mutation\'s region)' },
    ],
  },
  {
    n: 10,
    anchor: 'CONTINUOUS x petalCount 3 x 3 turns (9 in sequence)',
    rows: [
      { label: 'CONTINUOUS x 3 turns',
        path: 'the CONTINUOUS arm — the non-integer layer index, J5 (there are no layers) and J6 (the quantizer identity)' },
    ],
  },
  {
    n: 11,
    anchor: 'ZYGO: THE IRIS (falls curl down, standards rise)',
    rows: [
      { label: 'ZYGO: 3 layers x ALL INNER MAX (one role over two whorls)',
        path: 'layer roles (roleForLayer) — Z1-Z3 and Z6, one role spanning more than one whorl' },
    ],
  },
  {
    n: 12,
    anchor: 'SLOT: labellumSize min (0.5) x 2 whorls in step',
    rows: [
      { label: 'ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step',
        path: 'slot roles and the mirror plane (roleForSlot) — Z4a, Z4b and Z5\'s conditional collapse' },
    ],
  },
  {
    n: 13,
    anchor: 'FAN: defaults (3/side, a mirror-line petal, 45deg)',
    rows: [
      { label: 'FAN x PER-PETAL: petal 1 extreme x toggle OFF (the same sliders now drive the INNER PAIR)',
        path: 'the FAN arm and the per-petal orbits on the fixed-point-free involution — J7 (the arc and the notch), Z7, Z8, Z9' },
    ],
  },
  {
    n: 16,
    anchor: 'ALL PETALS: max (curl +360, cup +1.20, tip +0.60)',
    rows: [
      { label: 'ALL PETALS: max x every base at max (curl 360+360, cup 1.2+1.2, tip 0.6+0.6 — every clamp binds)',
        path: 'the one-whorl all-petals group (ROLE_ALL) with every composition clamp binding at once' },
    ],
  },
  {
    n: 17,
    anchor: 'CROWDING: the mum run — 120 CONTINUOUS x spread min x feet floored (ruled BAD, Eva Sep 3)',
    rows: [
      { label: 'CROWDING: the mum run — 120 CONTINUOUS x spread min x feet floored (ruled BAD, Eva Sep 3)',
        path: 'the crowding flag RAISED — the only ruled-BAD configuration, D_max >= 11 (the flag\'s other direction is every other row here)' },
    ],
  },
  {
    n: 18,
    anchor: 'DEPTH: 4 layers x RADIAL x spread min (0.6)',
    rows: [
      { label: 'DEPTH: 6 layers x ALL THIN x spread min (feet across the axis on every ring)',
        path: 'depth beyond three, with footRing()\'s underFootFloor and crossesAxis telemetry flags both raised' },
    ],
  },
  {
    n: 19,
    anchor: 'DOME: rise 1 x RADIAL x spread min (0.6)',
    rows: [
      { label: 'DOME: rise 0.5 x petalCount 8 (the default count)',
        path: 'headRise: the cap, the shell, the rigidly rotated blade frame and domeLean — J1, J3, J8, J9' },
      { label: 'DOME: GATED — rise 0 pinned (must be bit-identical to the default: the guard)',
        path: 'the dome GUARD — domeIsFlat() must reproduce the pre-dome expression, domeGuardResidual exactly 0' },
      { label: 'DOME: the APEX CORNER — ALL MIN x sheet 2.40 x spread min x rise 1 (the floor binds, CLAMPED to 0.25)',
        path: 'the apex-radius floor, the one reachable corner where the rise saturates and the read-out says CLAMPED' },
      { label: 'DOME: the INCURVE TARGET, flat (40/turn x 3, spread 1.60, length 20, tilt 75, curl 150, ALL THIN feet) · curl family pinned at identity, COVERAGE ASSERTED',
        path: 'plan coverage ASSERTED — one of only two rows in the matrix that assert it (the rise-0.5 twin costs 50.2 s and is deliberately out)' },
    ],
  },
  {
    n: 20,
    anchor: 'DOME LEAN: EVA_CONFIG flat (the headRise-independent baseline the lean must not touch)',
    rows: [
      { label: 'DOME LEAN: EVA_CONFIG flat (the headRise-independent baseline the lean must not touch)',
        path: 'the dome-lean block\'s flat baseline. NOTE, honestly: this row is FLAT, so domeLean is 0 on it — the domeLean LAW\'s witness in this subset is block 19\'s rise-0.5 row, not this one. It is here because its two domed siblings cost 80.5 s and because the guard has no escape hatch, which is deliberate' },
    ],
  },
  {
    n: 21,
    anchor: 'CURL: bias max x incurve target x rise 0.5 (documented: re-opens 16.0% of the crown, tips 5-11 mm out)',
    rows: [
      { label: 'CURL: FIDDLEHEAD x start 0.5 (SELF-CONTACT: the tip lands on its own mid-blade)',
        path: 'curl START engaged — spineLaw()\'s table rather than the arc, the spine floor, and the SELF-CONTACT flag raised' },
      { label: 'CURL: FIDDLEHEAD x bias max (a crozier winds inside itself: no self-contact)',
        path: 'curl BIAS engaged — the turn redistributed toward the tip' },
      { label: 'TAPER: QUILL x taper max (roll clamp; opens toward the tip)',
        path: 'the roll-taper envelope along the length' },
      { label: 'GRADIENT: cup gradient max x cup max x widest petal (the metric reaches 2.6 at the tip)',
        path: 'cup gradient composing onto cup, at the widest reachable petal' },
    ],
  },
];

/* ---------- THE GUARD ------------------------------------------------ */

/* buildMatrix()'s own block markers, read from the harness source. ONE
   owner: the frozen-matrices CI job calls this function, it does not
   restate the check. */
export function matrixBlockMarkers(src = fs.readFileSync(HARNESS, 'utf8')) {
  const lines = src.split('\n');
  const from = lines.findIndex((l) => l.includes('export function buildMatrix'));
  const to = lines.findIndex((l, i) => i > from && /^export function phase9Matrix/.test(l));
  if (from < 0 || to < 0) throw new Error('bloom-smoke: cannot locate buildMatrix() in the harness source — the guard cannot read the block markers');
  const out = [];
  for (let i = from; i < to; i++) {
    const m = lines[i].match(/^ {2}\/\* (\d+)\. (.*)$/);
    if (m) out.push({ n: Number(m[1]), title: m[2].replace(/\s+\*\/\s*$/, '').trim().slice(0, 70) });
  }
  return out;
}

/* THROWS on any failure. Every message names the block or the row, because
   a guard that says "coverage changed" sends a reader to the wrong place. */
export function assertSmokeCoverage(matrix = buildMatrix()) {
  const bad = [];
  const markers = matrixBlockMarkers();
  const declared = new Set(SMOKE_BLOCKS.map((b) => b.n));
  const present = new Set(markers.map((m) => m.n));

  /* CLAUSE A — every block in the matrix has at least one smoke row. */
  for (const m of markers) {
    if (!declared.has(m.n)) {
      bad.push(`DRIFT: matrix block ${m.n} (${m.title}) has NO smoke row. Add one to SMOKE_BLOCKS with its path, or the subset has silently narrowed. There is no "why no row" field on purpose.`);
    }
  }
  for (const b of SMOKE_BLOCKS) {
    if (!present.has(b.n)) bad.push(`DRIFT: SMOKE_BLOCKS declares block ${b.n}, which buildMatrix() no longer has. A removed block is a removed claim — delete the entry deliberately.`);
  }

  /* CLAUSE B — anchors resolve, are ordered, and each smoke row is inside
     its own block's range. */
  const idxOf = new Map();
  matrix.forEach((r, i) => { if (!idxOf.has(r.label)) idxOf.set(r.label, i); });

  const ordered = SMOKE_BLOCKS.filter((b) => present.has(b.n)).slice().sort((a, b) => a.n - b.n);
  const anchors = [];
  for (const b of ordered) {
    const i = idxOf.get(b.anchor);
    if (i === undefined) {
      bad.push(`DRIFT: block ${b.n}'s anchor row is not in the matrix any more: "${b.anchor}". The anchor is the block's FIRST row — re-read buildMatrix() and update it.`);
    }
    anchors.push({ n: b.n, i });
  }
  if (anchors.every((a) => a.i !== undefined)) {
    if (anchors.length && anchors[0].i !== 0) bad.push(`DRIFT: block ${anchors[0].n}'s anchor sits at row ${anchors[0].i}, not row 0 — the first declared block must start the matrix.`);
    for (let k = 1; k < anchors.length; k++) {
      if (!(anchors[k].i > anchors[k - 1].i)) bad.push(`DRIFT: anchors out of order — block ${anchors[k].n} at row ${anchors[k].i} does not follow block ${anchors[k - 1].n} at row ${anchors[k - 1].i}. Block ranges cannot be derived.`);
    }
    for (let k = 0; k < ordered.length; k++) {
      const lo = anchors[k].i, hi = k + 1 < anchors.length ? anchors[k + 1].i : matrix.length;
      for (const r of ordered[k].rows) {
        const i = idxOf.get(r.label);
        if (i === undefined) { bad.push(`DRIFT: smoke row not in the matrix: "${r.label}" (declared for block ${ordered[k].n}). A renamed row is a row this subset stopped covering.`); continue; }
        if (i < lo || i >= hi) bad.push(`DRIFT: smoke row "${r.label}" sits at matrix row ${i}, outside block ${ordered[k].n}'s range [${lo}, ${hi}) — it is declared for a block it is not in.`);
      }
    }
  }

  if (bad.length) throw new Error(`bloom-smoke: the smoke subset no longer covers the matrix.\n  ${bad.join('\n  ')}`);
  return { blocks: markers.length, rows: SMOKE_BLOCKS.reduce((n, b) => n + b.rows.length, 0), matrixRows: matrix.length };
}

/* THE GUARD RUNS AT MODULE LOAD, on verifySections()'s own precedent: every
   consumer gets it checked for free and nobody has to remember to call it. */
const COVERAGE = assertSmokeCoverage();

export const SMOKE_LABELS = SMOKE_BLOCKS.flatMap((b) => b.rows.map((r) => r.label));

/* The gates take a regex over the LABEL. Escaped, anchored, exact — a
   loose pattern silently runs the wrong rows, which is how a subset stops
   being the subset it names. */
export const SMOKE_REGEX = `^(?:${SMOKE_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`;

/* ---------- CLI ------------------------------------------------------ */

function banner(withConn) {
  console.log('=================================================================');
  console.log(`SMOKE SUBSET — ${COVERAGE.rows} of ${COVERAGE.matrixRows} rows, ${COVERAGE.blocks} matrix blocks covered.`);
  console.log('FOR ITERATION, NOT FOR MERGE. This is NOT a pass of the matrix.');
  console.log(`Gates: export${withConn ? ' + connectedness' : ' ONLY (--conn adds the flood fill; REQUIRED for a new geometry mode)'}`);
  console.log('Blind to: every matrix-level claim, the rows it does not run, byte');
  console.log('movement, and a new assertion family with no smoke row (re-run the');
  console.log('mutant table when one is added). See this file\'s header.');
  console.log('=================================================================\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    console.log(`bloom-smoke: coverage OK — ${COVERAGE.rows} smoke rows over ${COVERAGE.blocks} matrix blocks of ${COVERAGE.matrixRows} rows.`);
    process.exit(0);
  }
  if (argv.includes('--list')) {
    banner(false);
    for (const b of SMOKE_BLOCKS) for (const r of b.rows) console.log(`  block ${String(b.n).padStart(2)}  ${r.label}\n            ^ ${r.path}\n`);
    process.exit(0);
  }
  const withConn = argv.includes('--conn');
  banner(withConn);
  const gates = ['tools/verify-bloom-export.mjs', ...(withConn ? ['tools/verify-bloom-connectedness.mjs'] : [])];
  let failed = false;
  for (const g of gates) {
    const t = Date.now();
    const r = spawnSync(process.execPath, [g, '--only', SMOKE_REGEX], { cwd: ROOT, stdio: 'inherit' });
    console.log(`\n^ ${g} on the smoke subset: ${Math.round((Date.now() - t) / 1000)}s\n`);
    if (r.status !== 0) failed = true;
  }
  console.log(failed
    ? 'SMOKE: FAILED — fix it, then run the full matrix before quoting anything.'
    : 'SMOKE: clean. This is NOT a matrix pass — the full 499 rows on both gates, in CI, is the merge criterion.');
  process.exit(failed ? 1 : 0);
}
