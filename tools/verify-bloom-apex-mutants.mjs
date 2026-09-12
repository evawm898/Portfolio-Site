/* ===================================================================
   verify-bloom-apex-mutants.mjs — the POSITIVE CONTROL for the apex family
   A2..A6 (session 32). NOT a matrix gate: it proves the assertions can FIRE.

   WHY IT IS A COMMITTED INSTRUMENT AND NOT A SCRATCH SCRIPT. The smoke gate's
   CLAUSE C checks that every assertion family is CLAIMED by a row's `path`,
   and its own header says what that is worth: "a citation is a claim about the
   PATH a row engages, never evidence the assertion can FIRE there; re-run the
   mutant table when a family is added". This is that table, so the next
   session that adds a clause has something to re-run rather than re-derive.

   WHAT IT ALREADY FOUND, on its first two passes, which is the argument for
   keeping it:
     - A1 was VACUOUS and has been deleted. It read "the cap never widens:
       entry >= terminal" off the descriptor, and no reachable state can make
       that false — the proof is in bloom-harness.mjs where A1 used to be.
       The mutation that removes the very floor it guards fires NOTHING.
     - A5's first scan started at `max(uCap, ROOT_BLEND_END)` and had a blind
       spot: a plateau term added to `terms` only reaches the profile BELOW
       uCap, so its waist sat outside the scanned region. The scan starts at
       the root blend now, which is strictly stronger and measured safe over
       147,744 shipped states.
     - Two of the four original expectations were wrong about which family a
       mutation breaks, not about the gate. They are corrected here rather
       than in the gate, which is the direction that keeps the gate honest.

   A MUTATION THAT FIRES MORE THAN IT NAMES IS FINE AND IS PRINTED; a mutation
   whose named family stays SILENT fails the run, and so does any family
   firing on the clean tree.

   RUN:  node tools/verify-bloom-apex-mutants.mjs
   =================================================================== */
/* POSITIVE CONTROL for the apex family A2-A6. Each mutation is a real edit to
   bloom-geometry.js, served in flight; the run FAILS if the family the mutant
   names stays silent. "A green run does not endorse the assertion" — the
   project's own rule, and hole 5 of the smoke gate says to re-run this table
   whenever a family is added. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, thicknessAssertions, lobeAssertions } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');

/* THE WITNESS CLAUSE (Eva's ruling, session 35). A mutation that lands on the
   right line and changes nothing observable makes a green `names` line
   evidence of nothing — and the match COUNT above cannot see that, because
   the text really did change. So every mutant declares a direct call on the
   MUTATED module proving the behaviour moved, run in Node before the browser
   is asked anything. It returns null when the behaviour moved, or a STRING
   saying what it found when it did not.

   The witness is deliberately NOT the assertion the mutant names: asking the
   gate whether the gate fired is the circularity this whole table exists to
   avoid. It asks the GEOMETRY, from the other side. */
const WDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-apex-wit-'));
async function mutatedModule(id, source) {
  const d = path.join(WDIR, id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'bloom-geometry.js'), source);
  return import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
}
/* THE WITNESS ASKS THE BUILDER, NEVER A PROFILE ASSEMBLED HERE.

   The first version called `widthProfile()` directly with a stub ring
   (`{ width: 6.4 }`) and a hand-written state. It read stations 7.11e-2 away
   from the ones `buildPetalInto` actually emits — because `footRing()` owns
   the ring width, the root blend reads it, and the turning ladder is a
   function of the whole profile — and `stations-not-increasing`'s witness
   consequently reported the mutation inert when it is not. A second producer
   of the profile, inside the instrument written to catch second producers.

   So every witness below drives `buildBloomInto` on the mutated module and
   reads what the builder REPORTS: `tipCap` for the terminal, the captured
   grid's own `halfWidth` per row for the outline, `profileU` for the ladder.
   THE FOOT'S THREE ROWS CARRY u = 0 and are dropped by name: they are three
   equal stations by construction, and counting them reads as two
   non-increasing pairs on every tree. */
let REGISTRY_DEFAULTS = null;
function builtOn(M, set = {}, mode = 'export') {
  const acc = new M.MeshBuilder({ exportMode: mode === 'export', captureGrid: true });
  const m = M.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set });
  const footRows = m.petal.footRows;
  return {
    tipCap: m.petal.tipCap,
    halves: m.petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.halfWidth),
    stations: m.petal.profileU.slice(footRows),
    us: m.petal.grid[0].rows.filter((r) => r.row >= footRows).map((r) => r.u),
  };
}
const terminalOf = (M, mode) => builtOn(M, {}, mode).tipCap.lastRowHalf;
const outlineMoved = (M, C, set = {}, mode = 'export') => {
  const a = builtOn(M, set, mode).halves, b = builtOn(C, set, mode).halves;
  if (a.length !== b.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
  return worst;
};


/* THE LOBE WITNESS. Drives the module under test to a lobed rim and reads the
   LOCAL POWER of the removed material at a crest and at a sinus off the
   EMITTED half-width — the same quantity L7 measures, but reached here
   through the module directly rather than through the gate, so the witness
   and the assertion have different owners. Returns null when the row builds
   no measurable cut, which the witness clauses report rather than swallow. */
function lobePowers(M) {
  const state = { ...REGISTRY_DEFAULTS, lobeDepth: 0.3, lobeCount: 3, lobeCoverage: 1, lobeCrestShape: 1, lobeNotchShape: 2.5 };
  const acc = new M.MeshBuilder({ exportMode: true });
  let got;
  try {
    const fr = M.footRing(state, acc);
    const ring = fr.slotRings[0][0];
    let slot = null;
    M.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale,
      angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: state.placement, fan: fr.fan,
      blade: (sl) => { if (!slot) slot = sl; } });
    got = M.petalSurface(state, ring, slot, null, acc).profile;
  } catch { return null; }
  const L = got.lobes;
  if (!L || L.noRoom || L.countBuilt < 2 || L.depthClamped) return null;
  const removed = (u) => got.halfWidthBaseAt(u) - got.halfWidthAt(u);
  const span = (L.windowU[1] - L.windowU[0]) / L.countBuilt;
  const ternary = (lo, hi, want) => {
    for (let k = 0; k < 220; k++) {
      const a1 = lo + (hi - lo) / 3, b1 = hi - (hi - lo) / 3;
      const fa = removed(a1), fb = removed(b1);
      if (want === 'min' ? fa <= fb : fa >= fb) hi = b1; else lo = a1;
    }
    return (lo + hi) / 2;
  };
  const powerAt = (uf, dir) => {
    const at0 = removed(uf), d1 = span * 1e-3, d2 = span * 1e-2;
    const r1 = Math.abs(removed(uf + dir * d1) - at0), r2 = Math.abs(removed(uf + dir * d2) - at0);
    if (!(r1 > 0 && r2 > r1)) return NaN;
    return Math.log(r2 / r1) / Math.log(10);
  };
  const us = ternary(L.sinusU[Math.floor(L.sinusU.length / 2)] - span * 0.35, L.sinusU[Math.floor(L.sinusU.length / 2)] + span * 0.35, 'max');
  const uc = ternary(L.crestU[1] - span * 0.35, L.crestU[1] + span * 0.35, 'min');
  const notch = powerAt(us, -1), crest = powerAt(uc, +1);
  return Number.isFinite(notch) && Number.isFinite(crest) ? { crest, notch } : null;
}

const MUTANTS = [
  /* ===================================================================
     THE LOBE SHAPE (session 41). L7's own two mutations, and its witness is
     the LOCAL POWER the mutated module actually emits — deliberately NOT
     the assertion L7 makes, because asking the gate whether the gate fired
     is the circularity the table exists to avoid (session 35).

     WHY THESE TWO. The retired one-exponent family's error was ONE control
     over TWO quantities; the two failure modes of the replacement are
     exactly the ways that error could come back — the controls exchanged,
     or both features served from one of them. Both leave L0-L6 completely
     unchanged: the count, the two caps, the window, the pitch, the demand
     and the crests-at-the-ends identity are all blind to WHICH SHAPE the
     cut carries, so without L7 either mutation ships silently.
     =================================================================== */
  { id: 'shapes-swapped', why: 'the crest exponent is applied at the notch and the notch exponent at the crest — the two controls exchanged',
    find: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);',
    into: '  const P = Math.pow(r, notch), Q = Math.pow(1 - r, crest);', names: ['L7'],
    witness: (M, C) => {
      const m = lobePowers(M), c = lobePowers(C);
      if (!m || !c) return 'the lobed row built no measurable cut';
      return (Math.abs(m.crest - c.notch) < 0.05 && Math.abs(m.notch - c.crest) < 0.05)
        ? null
        : `the emitted powers did not exchange: clean (crest ${c.crest.toFixed(3)}, notch ${c.notch.toFixed(3)}), mutant (crest ${m.crest.toFixed(3)}, notch ${m.notch.toFixed(3)})`;
    } },
  { id: 'shapes-coupled', why: 'both features read the CREST exponent, so one control moves two quantities — the retired family’s own error, returning',
    find: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);',
    into: '  const P = Math.pow(r, crest), Q = Math.pow(1 - r, crest);', names: ['L7'],
    witness: (M, C) => {
      const m = lobePowers(M), c = lobePowers(C);
      if (!m || !c) return 'the lobed row built no measurable cut';
      return (Math.abs(m.notch - m.crest) < 0.05 && Math.abs(c.notch - c.crest) > 0.5)
        ? null
        : `the notch did not follow the crest: clean (crest ${c.crest.toFixed(3)}, notch ${c.notch.toFixed(3)}), mutant (crest ${m.crest.toFixed(3)}, notch ${m.notch.toFixed(3)})`;
    } },
  /* THE THREE LERP MUTATIONS ARE GONE WITH THE LERP (session 32, PR THREE).
     `inverted-lerp`, `short-cap` and `curved-cap` all bit on
     `return hEntry + (tipFloor - hEntry) * s;`, which the cap demotion
     deleted — the cap is a print-floor clamp now and there is no chord to
     invert, shorten or curve. They are not weakened, they are UNREACHABLE,
     and leaving them would have reported "mutation did not apply" for the
     rest of the project's life. What replaces their coverage: `floored-tip`
     and `wrong-terminal` still hold the terminal, and A6's own three
     mutations below hold the shape the lerp used to own.

     NOTE FOR WHOEVER READS THE OLD COMMENT IN GIT: `curved-cap` was
     described as "the mutation the superellipse ruling will eventually make
     on purpose". It did. That is why it is retired rather than repaired. */
  /* A2 — the terminal is no longer the last row's own value. */
  { id: 'floored-tip', why: 'the last row is not floored, so the emitted terminal is not the declared one',
    find: '      return Math.max(shape, rootBlend(u), tipFloor);',
    into: '      return Math.max(shape, rootBlend(u), u >= 1 ? 0 : tipFloor);', names: ['A2', 'A3'],
    witness: (M) => (terminalOf(M, 'export') === 0 ? null : `the terminal is still ${terminalOf(M, 'export')} mm, not 0`) },
  /* A3 — the mode floor removed, so live converges to a true apex vertex:
     NV columns onto one edge, the retired centre dome's own defect. */
  { id: 'true-apex', why: 'the terminal floor is removed, so the apex collapses to a vertex',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : 0;', names: ['A3', 'A4'],
    witness: (M) => (terminalOf(M, 'live') === 0 ? null : `the live terminal is still ${terminalOf(M, 'live')} mm, not 0`) },
  /* A4 — the terminal is a number of its own rather than the mode floor, so
     live and export stop differing where the floor says they should. */
  { id: 'wrong-terminal', why: 'the terminal ignores the mode and is a constant',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = 0.4;', names: ['A4'],
    witness: (M) => (terminalOf(M, 'live') === 0.4 && terminalOf(M, 'export') === 0.4 ? null
      : `the terminal is ${terminalOf(M, 'live')} live / ${terminalOf(M, 'export')} export, not 0.4 in both`) },
  /* A5 — the retired TIP_PLATEAU put back: a RISING ramp max-ed against the
     FALLING core, which waists the blade and widens it back out to the tip.
     Both STL gates are blind to it — watertight, one piece, same triangle
     count — which is the whole reason A5 exists. */
  /* THE AMPLITUDE IS 0.6 — the retired control's OWN MAXIMUM — and it has to
     be, which is a finding rather than a tuning. With the cap unconditional
     and its terminal pinned to the mode floor, the plateau is MOSTLY MASKED:
     the cap owns everything from where the core falls to twice the print
     floor, and the ramp only exceeds the core below that. Measured over the
     four rows here: at 0.30 and 0.45 it produces NO waist anywhere; at 0.60 it
     produces one on the default taper only; on taper 0.6 and on the narrowest
     petal it produces none at any amplitude up to 0.9. So A5's coverage
     against "the retired term comes back" is narrower than it was before the
     cap became unconditional — its stronger witness is `inverted-lerp`, which
     fires it on every row. Do not weaken this to 0.3 to make it "cleaner":
     that is the version that fires nothing. */
  { id: 'plateau-returns', why: 'the retired TIP_PLATEAU is back at its own former maximum, max-ed with the core',
    /* THE FIND STRING MOVED when the tip law landed (session 32): the CORE
       term now reads `tipLaw(u)` rather than `core(u)`. Recorded because the
       control caught it as "MUTATION DID NOT APPLY" rather than as a false
       pass, which is the one failure mode that makes a disarmed mutant
       survivable — session 34's own lesson, arriving here. */
    find: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },",
    into: "    { name: 'CORE', from: stalk ? stalk.until : 0, to: 1, at: (u) => halfW * tipLaw(u) },\n    { name: 'MUTANT_PLATEAU', from: 0, to: 1, at: (u) => 0.6 * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },",
    names: ['A5'],
    witness: (M, C) => {
      const w = outlineMoved(M, C);
      return w > 1e-9 ? null : `the emitted plan outline is identical to the clean tree (worst ${w.toExponential(2)} mm)`;
    } },
  /* A6 — THE LAW DRAWS A DIFFERENT EXPONENT FROM THE ONE ASKED. The blend is
     `(1 - s^n)^(1/n)`; squaring the inner exponent leaves a perfectly
     plausible tip — still convex, still monotone, still watertight, still the
     same triangle count — that simply is not the curve the control names.
     Both STL gates are blind to it by construction. */
  { id: 'wrong-exponent', why: 'the superellipse is built at n^2 rather than n',
    find: '    return Math.pow(Math.max(0, 1 - Math.pow(s, n)), 1 / n);',
    into: '    return Math.pow(Math.max(0, 1 - Math.pow(s, n * n)), 1 / (n * n));', names: ['A6'],
    witness: (M, C) => {
      const w = outlineMoved(M, C);
      return w > 1e-9 ? null : `the emitted plan outline is identical to the clean tree (worst ${w.toExponential(2)} mm)`;
    } },
  /* A6 — the law is fitted THROUGH the print floor rather than on the active
     branch. This is the session's own fourth-instance bug reproduced as a
     mutation: it does not change the geometry at all, it changes where the
     law stops being the active branch, so a gate that fits through the floor
     reads an exponent that is not the asked one. */
  { id: 'law-past-the-floor', why: 'the tip floor is raised so it owns a large share of the apex',
    find: '  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;',
    into: '  const tipFloor = (acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM) * 3;', names: ['A4'],
    witness: (M, C) => (Math.abs(terminalOf(M, 'export') - 3 * terminalOf(C, 'export')) < 1e-12 ? null
      : `the terminal is ${terminalOf(M, 'export')} mm, not 3x the clean ${terminalOf(C, 'export')}`) },
  /* A7 — the ladder resamples the root blend. The held rows stop being the
     uniform ones, which moves a boundary footRing() owns. Watertight, one
     piece, identical triangle count; nothing else here can see it. */
  { id: 'ladder-eats-the-base', why: 'the ladder redistributes every row, including the ones the root blend owns',
    find: 'export const HELD_ROWS = Math.floor(ROOT_BLEND_END * NU);',
    /* A7 ONLY, and the claim was corrected by the control rather than the
       check by the claim: with the held count at 0 the ladder still respects
       its gap bound, so A8 is RIGHT not to fire here. */
    into: 'export const HELD_ROWS = 0;', names: ['A7'],
    witness: (M, C) => {
      const a = builtOn(M).stations, b = builtOn(C).stations;
      const held = Math.floor(0.30 * C.BLADE_ROWS);
      for (let i = 0; i < held; i++) if (!Object.is(a[i], b[i])) return null;
      return `every station the root blend holds is unmoved (first ${held} of ${a.length})`;
    } },
  /* A7 — two rows land on one station. The de-duplication pass is removed, so
     a ladder that saturates emits a zero-length panel.
     IT NEEDS THE BUCKLED ROW, and that is a finding rather than a detail:
     measured over 288 unbuckled states the pass never once fires, so on the
     taper rows alone this mutation is a no-op and reported SILENT.

     AND THE ROW HAS TO SATURATE IN *LIVE* MODE, which is the second half of
     the same finding. `__bloomMetrics()` reports the LIVE build, so a state
     that only saturates under the export floor is invisible to this harness:
     the first row tried here (amplitude 0.6, f 1, exponent 1.5) produced one
     non-increasing pair in export and NONE in live, and the mutation was
     reported silent while being perfectly real. Amplitude 0.30 at f 1 and
     exponent 1.00 saturates in live, which is what this row is. */
  { id: 'stations-not-increasing', why: 'the strictly-increasing pass is removed',
    find: '  for (let i = 1; i < NU; i++) if (out[i] <= out[i - 1]) out[i] = Math.min(1, out[i - 1] + 1e-5);',
    into: '  for (let i = 1; i < NU; i++) if (false) out[i] = Math.min(1, out[i - 1] + 1e-5);', names: ['A7'],
    /* THE ONLY WITNESS THAT NEEDS A SATURATING BUCKLED LADDER, for the reason
       the comment above already records: over 288 unbuckled states the pass
       never fires, so on a plain profile this edit is a no-op and a witness
       that did not buckle would report a defect that is not there. */
    /* THE WITNESS ASSERTS BOTH DIRECTIONS: the CLEAN ladder is strictly
       increasing (or the repair is not doing its job and nothing here can be
       read) and the UNREPAIRED one is not. That is the pass's own contract,
       and it is only assertable on a row where the pass actually engages.

       THE PASS IS RARELY ENGAGED: swept at NU 56 over 9,072 buckled states,
       2,232 move the ladder at all when the repair is removed — worst 5.2e-5
       in u — and only 159 produce a non-increasing pair. So this mutant is a
       no-op on the taper rows by construction and needs the one row above. */
    witness: (M, C) => {
      const st = { buckleAmp: 0.3, buckleFreq: 1 };
      const nonIncr = (arr) => { let n = 0; for (let i = 1; i < arr.length; i++) if (arr[i] <= arr[i - 1]) n++; return n; };
      const a = nonIncr(builtOn(M, st, 'live').stations), b = nonIncr(builtOn(C, st, 'live').stations);
      if (b !== 0) return `the CLEAN ladder already has ${b} non-increasing pairs — the repair is not doing its job and this mutant cannot be read`;
      return a > 0 ? null : 'the unrepaired ladder is still strictly increasing — the pass is inert on this state and the mutant proves nothing';
    } },
  /* ===================================================================
     A7 — THE SEAM CLEARANCE (session 38). Four mutations, one per clause the
     floor added, because a clause with no mutation that fires it is a
     computation nobody has shown can produce a verdict.

     EVERY ONE OF THEM NEEDS `THE SEAM FLOOR BINDING` IN `ROWS`, and that is
     this table's own durable rule (session 35: a row chosen against a branch
     must state which branch and assert that it still reaches it). The four
     taper rows all sit at the shipping tilt of 25 degrees, where the
     clearance is 0.2536 mm against a first station at 0.625 mm — the floor
     does not bind, the new branch is never entered, and all four of these
     would report SILENT on them. Each witness therefore drives the binding
     state itself and asserts the mutated module's own behaviour moved.
     =================================================================== */
  /* A7 — the clearance is gone, so the first blade row goes back to row 1
     and the foot-to-blade offset fold returns (measured on main: 376 pairs
     on a SINGLE layer at tilt 75, length 20, sheet 2.4). */
  { id: 'seam-floor-removed', why: 'the foot-to-blade clearance is zero, so the first blade row sits on the kink',
    find: '  return seamHalfThicknessMm(sheetMm) * Math.sin(Math.max(0, Math.min(turnRad, Math.PI / 2)));',
    into: '  return 0 * seamHalfThicknessMm(sheetMm) * Math.sin(Math.max(0, Math.min(turnRad, Math.PI / 2)));', names: ['A7'],
    witness: (M, C) => {
      const t = 75 * Math.PI / 180;
      const a = M.seamClearanceMm(t, 2.4), b = C.seamClearanceMm(t, 2.4);
      if (!(a === 0)) return `the mutated clearance is ${a} mm at a 75 degree kink, not 0`;
      if (!(b > 0)) return `the CLEAN clearance is ${b} mm — this mutant cannot be read`;
      return M.seamLatticeStep(a, 20) === 1 && C.seamLatticeStep(b, 20) > 1 ? null
        : `the lattice step is ${M.seamLatticeStep(a, 20)} on the mutant and ${C.seamLatticeStep(b, 20)} on the clean tree — the floor did not stop binding`;
    } },
  /* A7 — THE FIRST DRAFT, kept as a mutation because Eva ruled against it by
     name: floor each station instead of translating the lattice, and let the
     strictly-increasing repair separate the survivors. It PILES — every row
     the floor swallowed ends up 1e-5 apart against the floor — which trades
     this defect for another and measured WORSE than main. */
  { id: 'seam-piles-instead-of-redistributing', why: 'the held rows are floored individually rather than translated as a lattice',
    find: '    ? Array.from({ length: held }, (_, i) => (mUsed + i) / NU)',
    into: '    ? Array.from({ length: held }, (_, i) => Math.max((i + 1) / NU, mUsed / NU))', names: ['A7'],
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const gap = (T) => { const st = builtOn(T, set).stations; let g = Infinity;
        for (let i = 1; i < Math.floor(0.30 * T.BLADE_ROWS); i++) g = Math.min(g, st[i] - st[i - 1]); return g; };
      const a = gap(M), b = gap(C);
      if (!(b > 1e-3)) return `the CLEAN ladder's tightest held gap is already ${b} — this mutant cannot be read`;
      return a < 1e-3 ? null : `the mutated ladder's tightest held gap is ${a}, not a pile against the floor`;
    } },
  /* A7 — the clearance starts reading the sheet as authored rather than as
     the export floors it. Row positions are topology; a ladder that moves
     with the mode splits a cleft's panels at a different row (session 32's
     own defect, which is why `ladderHalfAt` reads the export floor in both
     modes). ONE OWNER makes this a one-line mutation AND makes it visible in
     the live gate at all. */
  { id: 'seam-reads-the-live-sheet', why: 'the clearance is built on the authored sheet rather than the export floor',
    find: 'export function seamHalfThicknessMm(sheetMm) { return Math.max(sheetMm, MIN_FEATURE_MM) / 2; }',
    into: 'export function seamHalfThicknessMm(sheetMm) { return sheetMm / 2; }', names: ['A7'],
    /* THE WITNESS NAMES THE ONLY SHEET THAT CAN SEE IT. On the default 1.20
       and on the 2.40 row above, `max(sheet, MIN_FEATURE_MM)` IS the sheet
       and this edit changes nothing at all — so the witness asks about 0.60,
       and the row list carries a 0.60 state for the assertion to bite on. */
    witness: (M, C) => {
      if (M.seamHalfThicknessMm(1.2) !== C.seamHalfThicknessMm(1.2)) return 'the mutation moved the DEFAULT sheet, which it must not — the export floor does not bind there';
      return M.seamHalfThicknessMm(0.6) === 0.3 && C.seamHalfThicknessMm(0.6) === 0.5 ? null
        : `the half-thickness on a 0.6 mm sheet is ${M.seamHalfThicknessMm(0.6)} on the mutant and ${C.seamHalfThicknessMm(0.6)} on the clean tree — the export floor is still being read`;
    } },
  /* A7 — the clearance is computed for an angle this build does not have.
     petalSurface() derives the seam turn as |tilt|; the builder re-reads it
     off the two EMITTED frames and reports the difference of the cosines,
     which is exactly 0 on every hub shape measured. Halving the owner's
     angle leaves a perfectly plausible ladder and a clearance sized for a
     kink that is not there. */
  { id: 'seam-turn-is-not-the-kink', why: 'the clearance is built on half the turn the frames actually make',
    find: '  const seamTurnRad = Math.abs(tilt);',
    into: '  const seamTurnRad = Math.abs(tilt) / 2;', names: ['A7'],
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const turn = (T) => { const acc = new T.MeshBuilder({ exportMode: true });
        return T.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set }).petal.bladeLadder.seamTurnDeg; };
      const a = turn(M), b = turn(C);
      return Math.abs(a - b / 2) < 1e-9 && Math.abs(b - 75) < 1e-9 ? null
        : `the seam turn is ${a} degrees on the mutant against ${b} on the clean tree — the owner's angle did not move`;
    } },
  /* A8 — the buckle's bar stops being read. The ladder takes rows the wave
     needs, which DOUBLES the buckle's along-margin chord error at the
     frequency ceiling (measured: 0.2808 -> 0.5626 mm) while every other gate
     here stays green. */
  { id: 'ladder-ignores-the-buckle', why: 'the gap bound stops deriving from the buckle frequency',
    find: '  if (!buckleFreq) return LADDER_MAX_GAP_FACTOR;',
    into: '  if (true) return LADDER_MAX_GAP_FACTOR;', names: ['A8'],
    witness: (M, C) => (M.ladderGapFactor(7) === M.LADDER_MAX_GAP_FACTOR && C.ladderGapFactor(7) < C.LADDER_MAX_GAP_FACTOR ? null
      : `ladderGapFactor(7) is ${M.ladderGapFactor(7)} on the mutant and ${C.ladderGapFactor(7)} on the clean tree — the bound still reads the frequency`) },
  /* A8 — THE LEADING GAP COMES BACK INTO THE LADDER'S OWN MEASURE, which is
     `main`'s own defect restored (session 39). That gap is the seam-to-first-
     row offset, placed by the clearance law and pinned by A7, and `mix()`
     cannot move it — so counting it makes the cap unsatisfiable on every
     seam-shifted row, the bisection lands on 0 and the turning-rate ladder is
     thrown away. The blade is then EXACTLY uniform: watertight, one piece,
     the right triangle count, inside every bound, and invisible to every
     assertion here until A8 gained its blend clause. The SEAM FLOOR BINDING
     row is what this bites on; at the shipping tilt the seam step is 1 and
     the mutation is a no-op. */
  { id: 'widest-counts-the-seam-offset', why: 'the ladder measures the structural seam offset as its own redistribution',
    find: '  const widest = (r) => { let m = 0; for (let i = 1; i < NU; i++) m = Math.max(m, r[i] - r[i - 1]); return m; };',
    into: '  const widest = (r) => { let m = r[0]; for (let i = 1; i < NU; i++) m = Math.max(m, r[i] - r[i - 1]); return m; };', names: ['A8'],
    /* THE WITNESS IS THE BLEND THE BUILDER DECLARES, never the assertion A8
       makes: the mutant must collapse it to 0 where the clean tree keeps a
       real ladder. Read off buildBloomInto's own report on the seam row. */
    witness: (M, C) => {
      const set = { petalTilt: 75, petalLength: 20, sheetThickness: 2.4 };
      const blend = (T) => { const acc = new T.MeshBuilder({ exportMode: true });
        return T.buildBloomInto(acc, { ...REGISTRY_DEFAULTS, ...set }).petal.bladeLadder.blend; };
      const a = blend(M), b = blend(C);
      return a === 0 && b > 0 ? null
        : `the blend is ${a} on the mutant against ${b} on the clean tree — the ladder was not discarded`;
    } },
];

/* Rows chosen so every mutation has something to bite on. */
const ROWS = [
  /* THE APEX HAS NO CONTROL, so these drive the cap through the things that
     DO reach it: the two taper exponents (which decide where the cap enters
     and how wide it starts) and the petal width (which decides how much of
     the tip the mode floor is). Both cap-entry rules are covered — the 0.80
     clamp at a broad falling limb, the crossing at a steep one. */
  { label: 'the shipping default', set: [] },
  /* A LOBED ROW, so L7 has an outline to measure. Both of its measurements
     must RUN on it, which needs an UNCLAMPED depth (a clamped one holds the
     sinus on the print floor, where the removed material is the floor's and
     not the law's) and an INTERIOR crest, which exists only from two lobes
     up. The two exponents are set APART so a swap is observable: a mutation
     that exchanged them on equal values would be undetectable by
     construction. */
  { label: 'a lobed rim, the two shape exponents apart (crest 1.00, notch 2.50, 3 lobes at 0.30x)',
    set: [{ id: 'lobeDepth', value: '0.3' }, { id: 'lobeCount', value: '3' },
          { id: 'lobeCoverage', value: '1' },
          { id: 'lobeCrestShape', value: '1' }, { id: 'lobeNotchShape', value: '2.5' }] },
  /* THE SEAM FLOOR BINDING, and it is a SINGLE LAYER on purpose: layer count
     was the proxy the brief mistook for the cause, and this row is the
     measured counter-example — tilt 75, length 20, sheet 2.4 folds 376 pairs
     on main with no layers involved at all. At the shipping tilt the
     clearance is 0.2536 mm against a first station at 0.625 mm, so without
     this row all four seam mutations are no-ops. */
  { label: 'the seam floor binding (tilt 75, length 20, sheet 2.4 — a SINGLE layer)',
    set: [{ id: 'petalTilt', value: '75' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '2.4' }] },
  /* THE EXPORT FLOOR BINDING TOO, and it is a second row rather than a wider
     one because the two floors bind in opposite directions. `MIN_FEATURE_MM`
     only raises a sheet UNDER 1.00 mm, so on the 1.20 mm default — and on the
     2.40 mm row above — `max(sheet, MIN_FEATURE_MM)` IS the sheet and
     `seam-reads-the-live-sheet` is a no-op. Measured: that mutant fired
     NOTHING until this row existed. 0.60 is the control's own minimum. */
  { label: 'the seam floor binding on a sheet UNDER the export floor (0.60, tilt 75, length 20)',
    set: [{ id: 'petalTilt', value: '75' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '0.6' }] },
  { label: 'taper 0.60 — the cap entry at the 0.80 clamp', set: [{ id: 'petalTipTaper', value: '0.6' }] },
  { label: 'taper 4 — the cap entry from the crossing', set: [{ id: 'petalTipTaper', value: '4' }] },
  { label: 'the narrowest petal (width 8, taper 4)', set: [{ id: 'petalWidth', value: '8' }, { id: 'petalTipTaper', value: '4' }] },
  /* THE TWO LADDER ROWS (session 32). The taper rows above drive the OUTLINE;
     neither of the ladder's two arms is reachable from them. `A0.6 f1 n1.5`
     is the one state measured to saturate the station measure, so it is what
     `stations-not-increasing` bites on; `A0.2 f7` is the frequency ceiling,
     the only place the buckle-derived gap bound is not simply the constant,
     so it is what `ladder-ignores-the-buckle` bites on. */
  /* THE EXPONENT CAME OFF THIS ROW AT NU 56 (session 35), and the one value is
     the whole finding. The row was pinned to `petalTipShape 1` when it was
     chosen at NU 28; at NU 56 that is precisely the value where the ladder
     stops saturating, so the de-duplication pass had nothing to do here and
     `stations-not-increasing` named A7 while firing nothing — red on `main`,
     and red because a row count changed underneath a state that was chosen
     against it. Swept at NU 56: 159 of 9,072 buckled states DO make the
     unrepaired ladder non-increasing, and the one nearest the shipped defaults
     is this row with the exponent simply left alone. */
  { label: 'the ladder saturated in LIVE mode (buckle 0.30 at f 1, the default exponent)', set: [{ id: 'buckleAmp', value: '0.3' }, { id: 'buckleFreq', value: '1' }] },
  { label: 'the buckle at its frequency ceiling (0.20 at f 7 — the bound is exactly uniform)', set: [{ id: 'buckleAmp', value: '0.2' }, { id: 'buckleFreq', value: '7' }] },
];

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 700, height: 700 } });
let SERVE = SRC;
await page.route('**/bloom-geometry.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: SERVE }));

async function famsOn(rows) {
  const seen = new Set();
  for (const row of rows) {
    await openBloom(page, port);
    await stillFrame(page);
    const bad = await applyConfig(page, row.set);
    if (bad.length) { console.log(`    (row "${row.label}" refused: ${bad[0]})`); continue; }
    await page.waitForTimeout(300);
    /* BOTH FAMILIES. The apex table was A-only; session 41 added L7, whose
       witness is the emitted outline's local powers, and "re-run the mutant
       table when a family is added" is this project's own rule. A lobe
       mutation that fired nothing would otherwise look exactly like a clean
       tree. */
    for (const msg of await thicknessAssertions(page, row)) {
      const mm = /^(A\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
    for (const msg of await lobeAssertions(page, row)) {
      const mm = /^(L\d)/.exec(msg); if (mm) seen.add(mm[1]);
    }
  }
  return seen;
}

console.log('CONTROL (unmutated tree): the family must be SILENT on every row');
const clean = await famsOn(ROWS);
console.log(`  fired: ${clean.size ? [...clean].sort().join(', ') : '(none)'}\n`);
let fail = clean.size > 0;

/* `--neuter=<id>` makes ONE edit APPLY while changing nothing: the source
   differs, so the match count is satisfied, and only the witness can see that
   the behaviour did not move. A positive control on the witness clause. */
const NEUTER = (process.argv.find((a) => a.startsWith('--neuter=')) || '').split('=')[1] || null;
REGISTRY_DEFAULTS = (await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href)).DEFAULTS;
const CLEAN = await mutatedModule('__clean', SRC);
for (const mu of MUTANTS) {
  const n = SRC.split(mu.find).length - 1;
  if (n !== 1) { console.log(`  ${mu.id}: MUTATION DID NOT APPLY (matched ${n}x) — ${mu.why}`); fail = true; continue; }
  const into = NEUTER === mu.id ? mu.find + ' /* neutered */' : mu.into;
  SERVE = SRC.replace(mu.find, into);
  /* THE WITNESS, before the browser is asked anything. */
  let verdict = 'the mutant declares no witness';
  try { verdict = await mu.witness(await mutatedModule(mu.id, SERVE), CLEAN); }
  catch (e) { verdict = `the witness threw: ${e.message}`; }
  if (verdict !== null) {
    console.log(`  ${mu.id}: the edit applied but the BEHAVIOUR did not move — ${verdict}`);
    fail = true; SERVE = SRC; continue;
  }
  const got = await famsOn(ROWS);
  const want = mu.names;
  const missed = want.filter((f) => !got.has(f));
  console.log(`  ${mu.id}: ${mu.why}`);
  console.log(`      names ${want.join(', ')} · fired ${got.size ? [...got].sort().join(', ') : '(NOTHING)'}` + (missed.length ? `   *** SILENT: ${missed.join(', ')}` : '   ok'));
  if (missed.length) fail = true;
  SERVE = SRC;
}
await browser.close(); server.close();
if (NEUTER) {
  console.log(fail ? `\nguard check: the sweep REPORTED the neutered mutant "${NEUTER}" — the witness clause fires.`
                   : `\nguard check: FAIL — "${NEUTER}" was neutered and the sweep stayed green.`);
  process.exit(fail ? 0 : 1);
}
console.log(fail ? '\nAPEX MUTANT TABLE: FAILED' : '\nAPEX MUTANT TABLE: every family fires on a mutation that names it, and is silent on the clean tree');
process.exit(fail ? 1 : 0);
