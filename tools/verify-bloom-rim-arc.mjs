/* ===================================================================
   verify-bloom-rim-arc.mjs — DOES THE RIM QUERY DESCRIBE THE BOUNDARY THE
   EXPORTED MESH ACTUALLY HAS? (session 38, PR 1)

     node tools/verify-bloom-rim-arc.mjs [--control] [--quick] [--json <file>]

   `petalRim()` answers, for one petal, where the rim is in space and how far
   along it a point sits (arc length s(u) on either margin). Nothing calls it
   yet, so "zero floats moved" is trivially true and proves nothing about it.
   What this tool proves instead is CORRESPONDENCE: that the curve the query
   describes IS the exported mesh's own rim, and that the arc length it reports
   matches the polyline the mesh actually draws, with a residual that is
   BOUNDED and MEASURED across the control space rather than read off one
   sample. Every figure below names its MODE (live / export) and its SAMPLING
   (the query's node count; the mesh's NU stations).

   R1 — THE RIM IS THE MESH'S RIM, exactly. Three sub-clauses, and the reason
        there are three is that the ONE statement that used to carry this
        stopped being true when the edge profile landed.

        WHAT IT USED TO SAY, and why it is gone. Beside the identity in R1a it
        required BOTH of `q +/- n * t / 2` — the two rim-strip vertices the
        exporter offset from the query's point, with the captured normal and
        the row's body thickness — to be in the position stream exactly. That
        rested on a premise the bead broke: `emitPanel` stitched the two skins
        at the boundary with a FLAT WALL, so the reconstruction was the emitted
        vertex BY CONSTRUCTION. It no longer is. The skins are offset by a
        per-column TAPERED half thickness at an INSET sampling of the row, and
        the boundary itself is a half-ellipse profile whose APEX is the
        original mid-surface point. Measured on this sample, over all 64 states
        in both modes: the old expression finds 0 of 14,336 blade stations.
        The precedent for what to do about that is clause 2 of
        tools/verify-bloom-grid.mjs, re-derived for this same reason one file
        over: PIN THE QUERY TO THE BUILDER, never to a formula that used to
        hold.

        R1a  THE QUERY'S POINT IS THE CAPTURED RIM POINT. Unchanged, and still
             the identity it always was: at every blade station on both
             margins `rim.pointAt(u, side)` equals the captured mid point at
             that margin column under `Object.is`, all three coordinates. Two
             producers of one surface — `petalRim` calls `surface.at(u, side)`
             and `emitPanel` calls `row.sect(v)` — so it is a real comparison
             and not a tautology. 14,336 stations.
        R1b  AND THE MESH HAS IT, AS THE BEAD'S APEX. Two statements, because
             one of them alone is worth little. (i) the query's point is in
             the emitted position stream, as the SAME double — which is
             STRICTLY STRONGER than the reconstruction it replaces: an
             identity on the point itself rather than on two points derived
             from it. (ii) the builder's own `{ captureRim: true }` record
             names it as the apex of THAT (panel, row, column) — without which
             (i) is satisfied by any vertex of the petal that happens to sit
             there, and the clause would be about the petal instead of about
             the rim. Measured 14,336 of 14,336 on both.
             WHAT (ii) ACTUALLY PINS IS THE RECORD'S EXISTENCE AND ITS INDEX,
             and saying so is the honest version of it: `e.apex` and the
             captured `mid[col]` are the SAME ARRAY on this tree, so given
             R1a the VALUE half cannot fail on its own — the two would fail
             together. That is grid-gate 2e's own admission about the same
             record, and it is here for the same reason: the (panel, row,
             column) the entry names is what routes the station to R1b rather
             than to R1c, and an index that had drifted would still name a
             real point of the petal and would pass a value test.
             IT CANNOT BE VACUOUS, and that is measured against a worktree of
             `main` rather than reasoned: there the same 14,336 points score
             0 in the stream while the OLD clause scores 14,336 of 14,336.
             The premise did not soften, it inverted, and the two populations
             are disjoint on both trees.
        R1c  WHERE THE TREATMENT DID NOT REACH, THE OLD RECONSTRUCTION IS
             STILL EXACTLY RIGHT — the old clause, verbatim, kept where it is
             still true rather than deleted. Which stations those are is read
             off the BUILDER (`rim.apex` names every treated perimeter vertex;
             `rim.flat` the rest), never off the ramp.
             A STATION IS ROUTED HERE, NEVER FAILED FOR BEING HERE. Each blade
             station goes to R1b if the builder recorded an apex for it and to
             R1c if it did not, so a tree that buried a blade end would be
             checked by the clause that is correct there instead of reddening
             the one that is not — and how many went each way is a figure the
             report prints rather than a premise the code assumes. Today the
             blade sends NONE: measured 0 of 14,336 over this whole sample,
             because on a single-span petal the tip is exposed and the ramp is
             zero only at the foot. So R1c's live subject is the RING ROW, and
             the one foot station the query can address is u = 0. GUARDED, and
             the guard is the query's own DOMAIN rather than a carve-out: on a
             flat foot `rim.pointAt(0)` IS the captured ring-row point as the
             same double (244 of 256 side-builds), and on a dome the ring row
             is an arc across where the blade's row plan is a chord, so the
             query does not address that vertex at all — the 12 excluded are
             the three domed and sphere states x 2 modes x 2 margins, named in
             the report beside R2's own seam figure, worst 5.768e-1 mm. The
             failure this arm doubts is in the SKIN, and the guard reads the
             QUERY against the CAPTURE, so the failure cannot leave the subject
             by moving the guard. 244 side-builds, 488 vertices, all present.
        AND THE PARTITION IS ASSERTED, both ways: every captured perimeter
        margin entry is in exactly one of `rim.apex` and `rim.flat` — 15,104
        of 15,104, 0 in both or neither — so "treated" is the builder's own
        answer and not this tool's guess at it.
   R2 — THE ARC IS NEVER SHORTER THAN THE CHORD, and the deficit is the mesh's.
        Between consecutive stations the reported arc (sAt(u2) - sAt(u1)) is
        >= the emitted chord — an identity of the construction (the query's
        polyline has both stations as nodes, and a refinement of a polyline is
        never shorter), asserted to fp rounding. The TOTAL deficit, reported
        length minus the mesh polyline's length over the blade, is the
        exported boundary's own chord shortfall at NU stations; its maximum
        over the sample is the correspondence residual this tool states.

        THE POLYLINE IS THE APEX POLYLINE NOW, AND THE NUMBER DID NOT MOVE.
        Its vertices are the captured margin mid points, which R1a ties to the
        query and R1b proves are emitted — so where on `main` this measured
        the query against a curve running halfway up a flat wall that the mesh
        never emitted a vertex on, it now measures it against a polyline of
        real mesh vertices. The STATEMENT got stronger; the FIGURES are
        unchanged, and that is measured rather than argued: EVERY scalar of
        the per-state `--json` table is `Object.is`-identical to a run on a
        worktree of `main` at 370521f — 5,248 of them (4,608 R2 and Richardson
        figures over 128 rows x 2 margins, 512 terminal-face, 128 loop length),
        0 differing — because the mid-surface did not move when the edge got a
        bead. The apex is ON it, so the curve R2 sums over is the same curve;
        what changed is that the mesh now has a vertex at every point of it.

        AND THE FIGURE THIS HEADER USED TO QUOTE WAS A SIDE +1 FIGURE WEARING
        THE WORD "WORST". It read "the reported length exceeds the mesh's 56-
        station polyline by at most 0.90% LIVE / 0.75% EXPORT"; the per-mode
        summary lines it was read off indexed `sides[1]` and never `sides[-1]`,
        and the worst state's two margins are not alike. Over BOTH margins the
        same sample reads 1.297% LIVE and 1.035% EXPORT (0.8499 mm of 65.514
        and 0.6657 mm of 64.319, both on ALL FORM MAX x buckle 0.6 f 7 x
        petalTipShape 3.00, side -1). Pre-existing — it reproduces exactly on
        `main` — and corrected here rather than carried, because a label
        naming a computation nobody performed is the defect this project keeps
        finding. The per-mode lines range over both margins now and say so.
   R3 — THE QUERY'S OWN ERROR, by Richardson. The length at RIM_SAMPLES and
        at 2x, 4x and 8x. The CONVERGENCE ORDER is read at the FINE end
        (log2 of the last two differences) and must exceed 1.0 — a kink cut
        by a chord converges at first order at best, and the seam-less ladder
        the control feeds this clause reads about 0. It is NOT asserted to be
        2: measured on this tree, a smooth arc reads 2.0, the LIVE floor's
        steeper apex is pre-asymptotic at 4096 and reaches 2.0 by 16k, and
        the n != 1 apex power laws (a vertical tangent at s = 1 above n = 1,
        at the widest point below it) converge at 1.2–1.7 under the graded
        patch — genuinely, steadily, and boundedly. The BOUND at RIM_SAMPLES
        is then d1 + d2 + d3 * 2^p / (2^p - 1) with p the measured fine-end
        order: the three measured differences plus the geometric tail they
        imply. Its maximum over the sample is the residual bound this tool
        states, per mode.
   R4 — THE INVERSE ROUND-TRIPS: uAt(sAt(u)) = u within 1e-9 on a ladder that
        misses the nodes, and sAt is strictly increasing along it.
   R5 — THE NODES THE QUERY PLACES ARE THE RIM'S OWN TANGENT BREAKS. An
        INDEPENDENT detector walks the rim CURVE P(u, +1) — not halfWidthAt,
        so it sees a break from any producer, the form onset included —
        brackets a jump in the central-difference tangent, bisects to it, and
        classifies each candidate by its one-sided tangents at 1e-6 (a steep
        smooth stretch brackets too and is rejected there). Every genuine
        break it finds, on the six builder arms in both modes, must lie within
        1e-5 of a node the query inserted. The two seams named in the brief
        are probed by name as well, in the mode each belongs to.
   R6 — THE TERMINAL FACE: the width the margins meet across at u = 1, the
        curve and the mesh's NV - 1 chords, reported per state.

   THE SAMPLE. Six builder arms, every petal-reaching slider at both ends,
   the exponent at 0.60 / 1.00 / 2.50 / 3.00, the tapers that move the widest
   point and the seams, cup and cup gradient, roll and its taper, curl, twist,
   tilt, the buckle's three at their corners, the thinnest and thickest sheet,
   the shortest and longest petal, a domed hub, a sphere head, the innermost
   petal of six whorls at the smallest layer size, and two-control products
   (exponent x cup, exponent x buckle, cup x buckle, roll x buckle, all form
   max, all form max x buckle max). Both modes for every state.

   WHAT IT IS BLIND TO, in its own header: the FOOT's edges (s < 0), a cleft's
   inner edges (capability petals have more boundary than two margins), and
   any state it does not name. `--quick` runs two states to prove the rig.

   AND WHAT R1 GAVE UP WHEN IT MOVED ONTO THE APEX, said plainly rather than
   left to be discovered. The old clause tied TWO vertices per station and the
   new one ties ONE. Everything the bead does between those two vertices is
   now invisible here: the tapered half thickness `b`, the inset `a`, the
   profile's intermediate points, the segment count and the corner fan. A bead
   of the wrong thickness, the wrong inset or the wrong segment count passes
   R1 entirely, provided its apex still lands on the mid-surface. That is not
   a hole this tool should fill — the rim floor and the dihedral are E1 and E2
   of tools/verify-bloom-edge-profile.mjs, the tie from the builder's recorded
   top/bot to the stream is its E4 and clause 2e of tools/verify-bloom-grid.mjs,
   and the closed-ness of the shell is the two STL gates' — but it is a real
   narrowing and it is named here rather than left to be discovered.
   R1b is also a MEMBERSHIP test: the query's point being in the stream says
   nothing about which triangles touch it, and R1b(ii) narrows that only to
   what the builder DECLARED, which is a record and not the artefact.
   BETWEEN two consecutive stations R2's polyline is compared against nothing
   at all. Measured, and reported per run rather than asserted, because this
   tool cannot enumerate the rim loop from outside: the mesh inserts 1,024
   extra apexes over 512 of the 14,080 station stretches — the last two
   stretches of each margin of every build, where the dropped tip rows pivot
   the profile about one skin point — and every one of them lies ON the chord
   it was inserted into, worst 3.568e-15 mm off the line. So the length the
   mesh draws over the blade margin IS the station polyline's, and the
   residual above is the whole of it. What the scan cannot see is a rim vertex
   placed FAR off the chord, since it can only recognise an inserted apex by
   its being on the line in the first place.

   `--control` is the positive control and is required before quoting a pass,
   and EACH SUB-CLAUSE GETS A PERTURBATION THAT LANDS INSIDE ITS OWN SUBJECT
   — one perturbation for all three would make two of them vacuous rather
   than red, which is not a control. R1a and R1b are evaluated at u + 1e-9,
   which moves the query off the station it names; R1c is evaluated at the
   ring row's own u with the half thickness scaled by 1 + 1e-9, because
   perturbing ITS u would take the query off the captured ring-row point and
   the arm's guard would then EXCLUDE it instead of failing it. All three
   must fire, and the control checks them by name. R5 is run on a query built
   over a surface that DECLARES NO BREAKS (the same `at`, the same profile,
   `tangentBreaks` returning []) and must fire on every arm that has one; the
   residual that costs is printed beside the declared query's; and the vacuity
   guards are checked. The ORDER clause is not the control's witness: a kink
   cut by chords produces erratic differences, and at the fine end those can
   read any order (measured 2.5 on the default export with no seam nodes at
   all), so R5 carries the seam claim and R3 carries only the tail's
   convergence.

   AND BOTH NEW ARMS WERE SEEN TO FAIL ON A REAL GEOMETRY MUTATION, not only
   on the control's own epsilon — this tool has no committed mutant table, so
   the two were applied by hand to a copy of `bloom-geometry.js` and are
   recorded here with their blast radius, because a clause nobody has watched
   go red is a log line.
     the-bead-apex-is-recomputed — `pts[APEX] = [C + w]` instead of the
       boundary point pushed on as itself. R1b fires and NOTHING ELSE does:
       144 findings over the full sample, all R1b. The number worth keeping is
       how FEW stations it catches — 1 of 56 per margin on the default — which
       is the whole reason the clause is an IDENTITY: `(p - c) + c` is `p` for
       most doubles and not for all, so any clause carrying a tolerance would
       have passed this mutation everywhere. R1a stays green (the CAPTURE is
       not mutated), R1c stays green (at a buried end `w` is the zero vector,
       so `C + 0` IS `C`), and R2-R5 stay green because they read the capture
       and the query rather than the rim.
     the-buried-wall-is-not-the-body-thickness — the flat wall's half
       thickness scaled by 1 - 1e-12, which is invisible wherever the ramp is
       non-zero and therefore invisible to every clause that looks at the
       treated rim. R1c fires on all 244 of its subject and NOTHING ELSE does,
       plus its own vacuity guard (`R1c tied no zero-ramp vertex`), which is
       two true statements and not a double count: the arm fired AND it tied
       nothing. 245 findings, 21 on `--quick` over a subject of 20.
   =================================================================== */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { firstSlot } from './bloom-first-slot.mjs';

const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const QUICK = argv.includes('--quick');
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const G = await load('bloom-geometry.js');
const { DEFAULTS, CONTROLS } = await load('bloom-registry.js');

const NV = 10;   // columns across one span — asserted against the captured grid below
const bad = [];
const table = [];

/* ---------- THE SAMPLE ---------------------------------------------- */
const ctl = (id) => { const c = CONTROLS.find((x) => x.id === id); if (!c) throw new Error(`no control ${id}`); return c; };
const both = (id, extra = {}) => [[`${id} min (${ctl(id).min})`, { [id]: ctl(id).min, ...extra }], [`${id} max (${ctl(id).max})`, { [id]: ctl(id).max, ...extra }]];
const STATES = [];
const push = (name, set, layer = 0) => STATES.push({ name, set, layer });
push('DEFAULT (flat)', {});
push('FORMED (cup + curl + roll + twist)', { petalCup: 0.6, petalSpineCurl: 120, petalRoll: 90, petalTwist: 45 });
push('DOMED (headRise 0.6)', { headRise: 0.6 });
push('CURL FAMILY (bias + start)', { petalSpineCurl: 150, curlBias: 0.5, curlStart: 0.3 });
push('BUCKLED (0.5 x, f 3)', { buckleAmp: 0.5, buckleFreq: 3 });
push('THINNED (tipThinning 0.4)', { tipThinning: 0.4 });
if (!QUICK) {
  for (const v of [0.6, 1, 2.5, 3]) push(`petalTipShape ${v}`, { petalTipShape: v });
  for (const id of ['petalBaseTaper', 'petalTipTaper', 'petalCup', 'petalCupGradient', 'petalRoll', 'petalSpineCurl', 'petalTwist', 'petalTilt', 'petalLength', 'petalWidth', 'sheetThickness', 'footDelicacy', 'headRise']) for (const [n, s] of both(id)) push(n, s);
  push('petalBaseTaper max x petalTipTaper min (widest point far out)', { petalBaseTaper: 3, petalTipTaper: 0.6 });
  push('petalBaseTaper min x petalTipTaper max (widest point at the base)', { petalBaseTaper: 0.3, petalTipTaper: 4 });
  push('tipThinning max (0.8)', { tipThinning: 0.8 });
  for (const [n, s] of both('petalRollTaper', { petalRoll: 330 })) push(`${n} under roll 330`, s);
  for (const [n, s] of both('curlBias', { petalSpineCurl: 360 })) push(`${n} under curl 360`, s);
  for (const [n, s] of both('curlStart', { petalSpineCurl: 360 })) push(`${n} under curl 360`, s);
  push('petalApexSweep max under cup 1.2', { petalApexSweep: 1, petalCup: 1.2 });
  push('buckleAmp max (0.6) at f 3', { buckleAmp: 0.6, buckleFreq: 3 });
  for (const f of [1, 7]) push(`buckleFreq ${f} at amp 0.6`, { buckleAmp: 0.6, buckleFreq: f });
  for (const p of [2, 6]) push(`buckleEnv ${p} at amp 0.6, f 3`, { buckleAmp: 0.6, buckleFreq: 3, buckleEnv: p });
  push('SPHERE head (CONTINUOUS x 24)', { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 24 });
  push('CONTINUOUS x 3 turns', { placement: 'CONTINUOUS', layerCount: 3 });
  push('FAN', { placement: 'FAN' });
  push('6 whorls x layerSize 0.4 — the INNERMOST petal (layer 5)', { layerCount: 6, layerSize: 0.4 }, 5);
  push('petalTipShape 0.60 x cup 1.2', { petalTipShape: 0.6, petalCup: 1.2 });
  push('petalTipShape 3.00 x cup 1.2', { petalTipShape: 3, petalCup: 1.2 });
  push('petalTipShape 0.60 x buckle 0.6 f 7', { petalTipShape: 0.6, buckleAmp: 0.6, buckleFreq: 7 });
  push('petalTipShape 3.00 x buckle 0.6 f 7', { petalTipShape: 3, buckleAmp: 0.6, buckleFreq: 7 });
  push('cup 1.2 x buckle 0.6 f 7', { petalCup: 1.2, buckleAmp: 0.6, buckleFreq: 7 });
  push('roll 330 x buckle 0.6 f 7', { petalRoll: 330, buckleAmp: 0.6, buckleFreq: 7 });
  push('ALL FORM MAX (cup 1.2, curl 360, roll 330, twist 180)', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 });
  push('ALL FORM MAX x buckle 0.6 f 7 x petalTipShape 3.00', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180, buckleAmp: 0.6, buckleFreq: 7, petalTipShape: 3 });
  push('the thinnest sheet x the shortest petal x petalTipShape 0.60', { sheetThickness: 0.6, petalLength: 20, petalTipShape: 0.6 });
}

/* ---------- helpers -------------------------------------------------- */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const key = (p) => `${p[0]},${p[1]},${p[2]}`;
/* The instrument's OWN chord sum over an arbitrary node list — a second
   route to the same quantity, used only to show the order clause can see a
   seam-less ladder (the control). Never the answer. */
/* THE OLD CLAUSE, AS ONE EXPRESSION, so the two places it is still used —
   the ring row and any untreated blade station — cannot drift apart. Both of
   `P +/- n * t/2` must be in the emitted stream exactly. Under `--control` the
   half thickness is scaled by 1 + 1e-9, which is the perturbation that lands
   inside R1c's own subject (perturbing its `u` instead would take the query
   off the captured ring-row point and its guard would EXCLUDE it rather than
   fail it — a control that makes a clause vacuous is not a control). */
const reconstructed = (P, n, t, verts) => {
  const h = (t / 2) * (CONTROL ? 1 + 1e-9 : 1);
  return verts.has(key([P[0] + n[0] * h, P[1] + n[1] * h, P[2] + n[2] * h]))
      && verts.has(key([P[0] - n[0] * h, P[1] - n[1] * h, P[2] - n[2] * h]));
};
const chordSum = (surface, side, nodes) => { let s = 0, prev = surface.at(nodes[0], side).P; for (let i = 1; i < nodes.length; i++) { const q = surface.at(nodes[i], side).P; s += dist(q, prev); prev = q; } return s; };

let statesRun = 0, stationsR1 = 0, apexTiedR1 = 0, flatTiedR1 = 0, pairsR2 = 0, r3Assessed = 0;
let flatSubjectR1 = 0, flatExcludedR1 = 0, partitionProbed = 0, bladeUntreatedR1 = 0;
let insertedApexes = 0, insertedStretches = 0, stretchesScanned = 0, rimBytesMoved = 0;
let worstOffLine = { v: -1 }, worstFlatGap = { v: -1 };
const flatExcludedWhere = [];
let maxDeficitRel = { v: -1 }, maxDeficitMm = { v: -1 }, maxR3 = { v: -1 }, maxR3Rel = { v: -1 }, minArcMinusChord = { v: Infinity }, minOrder = { v: null };
let worstSeamGap = { v: -1 };

for (const st of STATES) {
  for (const exportMode of [false, true]) {
    const modeTag = exportMode ? 'EXPORT' : 'LIVE';
    const state = { ...DEFAULTS, ...st.set };
    /* THE RIM CAPTURE IS A PRECONDITION OF R1b, SO ITS INERTNESS IS ASSERTED
       HERE AND NOT ASSUMED. If `{ captureRim: true }` moved a float, every
       number below would be about a mesh nobody ships. Clause 2e of
       tools/verify-bloom-grid.mjs asks the same question of whole blooms on
       five states; this asks it of one petal on all 64, which is a different
       sample and is the one R1 actually reads. Measured 0 of 128 builds. */
    const plain = new G.MeshBuilder({ exportMode, captureGrid: true });
    { const fs0 = firstSlot(state, plain, st.layer); G.buildPetalInto(plain, state, fs0.ring, fs0.slot, null); }
    const acc = new G.MeshBuilder({ exportMode, captureGrid: true, captureRim: true });
    const { ring, slot } = firstSlot(state, acc, st.layer);
    const rep = G.buildPetalInto(acc, state, ring, slot, null);
    {
      let moved = -1;
      if (plain.positions.length !== acc.positions.length) moved = -2;
      else for (let i = 0; i < plain.positions.length; i++) if (!Object.is(plain.positions[i], acc.positions[i])) { moved = i; break; }
      if (moved !== -1) { rimBytesMoved++; bad.push(`VALIDITY: ${st.name} [${modeTag}]: the rim capture moved float ${moved} (${moved === -2 ? 'triangle count differs' : `${plain.positions[moved]} vs ${acc.positions[moved]}`}) — R1 would be measuring a mesh the exporter does not build`); }
    }
    const surface = G.petalSurface(state, ring, slot, null, acc);
    const rim = G.petalRim(surface);
    const rim2 = G.petalRim(surface, 2 * G.RIM_SAMPLES);
    const rim4 = G.petalRim(surface, 4 * G.RIM_SAMPLES);
    const rim8 = G.petalRim(surface, 8 * G.RIM_SAMPLES);
    statesRun++;
    if (rep.grid.length !== 1) { bad.push(`${st.name} [${modeTag}]: ${rep.grid.length} panels — this tool describes single-span petals only`); continue; }
    const rows = rep.grid[0].rows;
    if (rows.some((r) => r.v.length !== NV)) { bad.push(`${st.name} [${modeTag}]: a captured row has ${rows.find((r) => r.v.length !== NV).v.length} columns, not ${NV}`); continue; }
    const blade = rows.filter((r) => r.u > 0);
    const ringRow = rows[rep.footRows - 1];
    if (!blade.length || !ringRow || ringRow.u !== 0) { bad.push(`${st.name} [${modeTag}]: no blade rows or no ring row captured`); continue; }
    const verts = new Set();
    const vlist = [];
    for (let i = 0; i < acc.positions.length; i += 3) {
      const k = key([acc.positions[i], acc.positions[i + 1], acc.positions[i + 2]]);
      if (!verts.has(k)) { verts.add(k); vlist.push([acc.positions[i], acc.positions[i + 1], acc.positions[i + 2]]); }
    }
    /* WHICH PERIMETER VERTICES THE TREATMENT REACHED, from the BUILDER. Keyed
       by (panel, row, column) rather than by value: a record whose index had
       drifted would still name a real point of the petal and would pass a
       value test. `rim.flat` carries only the point, so the partition below
       reads it by value and the apex record by key — two routes, which is
       what makes "exactly one of the two" a claim rather than a restatement. */
    const panel = rep.grid[0];
    /* GUARDED, not assumed: a build that returned no rim record is a FINDING,
       and dereferencing it would take the run down instead of reporting one —
       this project's own lesson about a clause whose detail string assumes its
       own premise, one step earlier. */
    if (!rep.rim || !Array.isArray(rep.rim.apex) || !Array.isArray(rep.rim.flat)) {
      bad.push(`R1: ${st.name} [${modeTag}]: the builder returned no rim.apex/rim.flat record under { captureRim: true } — R1b and R1c have nothing to read`);
      continue;
    }
    const apexRec = new Map();
    for (const e of rep.rim.apex) apexRec.set(`${e.panel}|${e.row}|${e.col}`, e);
    const flatPts = new Set(rep.rim.flat.map((q) => key(q)));
    for (const r of rows) {
      for (const cj of [0, NV - 1]) {
        partitionProbed++;
        const treated = apexRec.has(`${panel.label}|${r.row}|${cj}`);
        const listedFlat = flatPts.has(key(r.mid[cj]));
        if (treated === listedFlat) bad.push(`R1: ${st.name} [${modeTag}]: the perimeter vertex at row ${r.row} col ${cj} is ${treated ? 'in BOTH' : 'in NEITHER'} rim.apex and rim.flat — the builder's own partition of the perimeter does not partition it`);
      }
    }

    const rec = { state: st.name, mode: modeTag, set: st.set, layer: st.layer, stations: blade.length, samples: rim.samples, breaks: rim.breaks.map((b) => ({ u: b.u, kind: b.kind, from: b.from, to: b.to })), sides: {} };
    for (const side of G.RIM_SIDES) {
      const col = side > 0 ? NV - 1 : 0;
      /* R1a / R1b — the query's point is the captured rim point, and the mesh
         has it, as the bead's apex. The old third statement (both of
         `q +/- n*t/2` present) is gone from the blade and lives on in R1c at
         the one station where the ramp is exactly zero; see the header. */
      let r1Pts = 0, r1Stream = 0, r1Rec = 0, r1Flat = 0;
      /* WHICH ARM A STATION LANDS IN IS THE BUILDER'S ANSWER, NOT A BRANCH ON
         A MEASURED QUANTITY, and it is routed rather than asserted: a station
         the treatment did not reach is not a finding, it is R1c's. Today the
         blade sends 0 stations that way (the routing is what makes that a
         measurement the report prints rather than a premise the code assumes),
         and a tree that buried a blade end would be checked by the clause that
         is correct there instead of reddening the one that is not. */
      for (const r of blade) {
        if (r.v[col] !== side) { bad.push(`${st.name} [${modeTag}]: column ${col} carries v = ${r.v[col]}, not ${side} — the margin is not where this tool thinks`); break; }
        const q = rim.pointAt(CONTROL ? r.u + 1e-9 : r.u, side);
        stationsR1++;
        for (let k = 0; k < 3; k++) if (!Object.is(q[k], r.mid[col][k])) { r1Pts++; break; }
        const e = apexRec.get(`${panel.label}|${r.row}|${col}`);
        if (e) {
          /* R1b (i) IN THE STREAM, as the same double. */
          if (verts.has(key(q))) apexTiedR1++; else r1Stream++;
          /* R1b (ii) AND IT IS THIS STATION'S APEX. The record is the
             builder's, the point is petalRim's; neither owner writes the
             other, so this is what makes (i) a claim about the RIM rather
             than about any vertex of the petal that happens to sit there. */
          if (!(Object.is(q[0], e.apex[0]) && Object.is(q[1], e.apex[1]) && Object.is(q[2], e.apex[2]))) r1Rec++;
        } else {
          bladeUntreatedR1++;
          if (reconstructed(q, r.normal[col], r.thickness, verts)) flatTiedR1 += 2; else r1Flat++;
        }
      }
      if (r1Pts) bad.push(`R1a: ${st.name} [${modeTag}] side ${side}: ${r1Pts} of ${blade.length} stations — the rim point is not the captured rim point`);
      if (r1Stream) bad.push(`R1b: ${st.name} [${modeTag}] side ${side}: ${r1Stream} of ${blade.length} stations — the query's own point is absent from the emitted position stream`);
      if (r1Rec) bad.push(`R1b: ${st.name} [${modeTag}] side ${side}: ${r1Rec} of ${blade.length} stations — the query's point is not the apex the builder recorded at that (panel, row, column)`);
      if (r1Flat) bad.push(`R1c: ${st.name} [${modeTag}] side ${side}: ${r1Flat} of ${blade.length} stations are UNTREATED and the two vertices offset from the query's point by the body's own half thickness are absent from the emitted stream`);

      /* R1c — THE ZERO-RAMP END STILL RECONSTRUCTS, at the one station the
         query addresses: the ring row. Guarded on the query reaching that
         vertex at all (exact on a flat foot; on a dome the ring row is an arc
         across where the blade's row plan is a chord — R2's seamAtRingMm
         reports the gap). The guard reads the QUERY against the CAPTURE and
         the failure this arm doubts is in the SKIN, so the failure cannot
         leave the subject by moving the guard. */
      {
        const q0 = rim.pointAt(0, side), P0 = ringRow.mid[col];
        const gap = dist(q0, P0);
        if (Object.is(q0[0], P0[0]) && Object.is(q0[1], P0[1]) && Object.is(q0[2], P0[2])) {
          flatSubjectR1++;
          if (apexRec.has(`${panel.label}|${ringRow.row}|${col}`)) {
            bad.push(`R1c: ${st.name} [${modeTag}] side ${side}: the ring row's margin is a TREATED perimeter vertex — the ramp is not zero at the buried end, and the foot no longer emits the flat wall`);
          } else if (reconstructed(q0, ringRow.normal[col], ringRow.thickness, verts)) {
            flatTiedR1 += 2;
          } else {
            bad.push(`R1c: ${st.name} [${modeTag}] side ${side}: at the untreated ring row the two vertices offset from the query's point by the body's own half thickness are absent from the emitted stream`);
          }
        } else {
          flatExcludedR1++;
          flatExcludedWhere.push(`${st.name} [${modeTag}] side ${side}`);
          if (gap > worstFlatGap.v) worstFlatGap = { v: gap, where: `${st.name} [${modeTag}] side ${side}` };
        }
      }

      /* THE STRETCHES BETWEEN STATIONS, reported and not asserted — see the
         header. An emitted vertex strictly between two consecutive station
         apexes and ON the chord between them is an apex the rim inserted;
         counting them is what says R2's polyline is the whole of what the
         mesh draws there rather than a subsample of it. It cannot see a rim
         vertex placed FAR off the chord, which is why it reports. */
      for (let i = 1; i < blade.length; i++) {
        const A = blade[i - 1].mid[col], B = blade[i].mid[col];
        const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], L2 = dx * dx + dy * dy + dz * dz;
        stretchesScanned++;
        if (!(L2 > 0)) continue;
        let n = 0;
        for (const P of vlist) {
          const t = ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy + (P[2] - A[2]) * dz) / L2;
          if (!(t > 1e-9 && t < 1 - 1e-9)) continue;
          const d = Math.hypot(A[0] + dx * t - P[0], A[1] + dy * t - P[1], A[2] + dz * t - P[2]);
          if (d < 1e-9) { n++; if (d > worstOffLine.v) worstOffLine = { v: d, where: `${st.name} [${modeTag}] side ${side} rows ${blade[i - 1].row}->${blade[i].row}` }; }
        }
        if (n) { insertedStretches++; insertedApexes += n; }
      }

      /* R2 */
      let poly = 0, minAmC = Infinity, maxChordDeficit = { v: -1, u: null }, prevS = rim.sAt(blade[0].u, side), prevP = blade[0].mid[col];
      for (let i = 1; i < blade.length; i++) {
        const s = rim.sAt(blade[i].u, side), arc = s - prevS, chord = dist(blade[i].mid[col], prevP);
        pairsR2++;
        poly += chord;
        const d = arc - chord;
        if (d < minAmC) minAmC = d;
        if (d > maxChordDeficit.v) maxChordDeficit = { v: d, u: blade[i].u };
        prevS = s; prevP = blade[i].mid[col];
      }
      const S = rim.sAt(1, side) - rim.sAt(blade[0].u, side);
      const deficit = S - poly, deficitRel = deficit / S;
      if (minAmC < -1e-9 * S) bad.push(`R2: ${st.name} [${modeTag}] side ${side}: a station pair's reported arc is SHORTER than its emitted chord by ${(-minAmC).toExponential(3)} mm — the query's polyline does not contain the stations`);
      if (minAmC < minArcMinusChord.v) minArcMinusChord = { v: minAmC, where: `${st.name} [${modeTag}] side ${side}` };
      if (deficitRel > maxDeficitRel.v) maxDeficitRel = { v: deficitRel, where: `${st.name} [${modeTag}] side ${side}`, S, poly };
      if (deficit > maxDeficitMm.v) maxDeficitMm = { v: deficit, where: `${st.name} [${modeTag}] side ${side}`, S, poly };
      /* The u = 0 seam: the rim's own start against the ring row's margin.
         Exact on a flat foot (same expression); on a dome the ring row is an
         arc across and the blade's row plan a chord, so the gap is the arc's
         own sagitta at v = +/-1 — reported, not asserted. */
      const seam0 = dist(rim.pointAt(0, side), ringRow.mid[col]);

      /* R3 */
      const L1 = rim.length(side), L2 = rim2.length(side), L4 = rim4.length(side), L8 = rim8.length(side);
      const d1 = Math.abs(L2 - L1), d2 = Math.abs(L4 - L2), d3 = Math.abs(L8 - L4);
      let orderCoarse = null, orderFine = null, bound = null;
      if (d2 > 1e-10 * L1 && d3 > 1e-12 * L1) {
        orderCoarse = d1 > 0 ? Math.log2(d1 / d2) : null;
        orderFine = Math.log2(d2 / d3);
        r3Assessed++;
        if (!(orderFine > 1.0)) bad.push(`R3: ${st.name} [${modeTag}] side ${side}: the length converges at order ${orderFine.toFixed(2)} at the fine end (${d2.toExponential(2)} -> ${d3.toExponential(2)} mm per doubling) — at or below first order a kink is being cut by a chord: a tangent break this surface did not declare`);
        const p = Math.max(orderFine, 0.5);
        bound = d1 + d2 + d3 * Math.pow(2, p) / (Math.pow(2, p) - 1);
      } else {
        /* Differences at fp noise: the bound is the noise itself. */
        bound = d1 + d2 + d3;
      }
      if (bound > maxR3.v) maxR3 = { v: bound, where: `${st.name} [${modeTag}] side ${side}`, L1, L8, orderFine };
      if (bound / L1 > maxR3Rel.v) maxR3Rel = { v: bound / L1, where: `${st.name} [${modeTag}] side ${side}` };
      if (orderFine !== null && (minOrder.v === null || orderFine < minOrder.v)) minOrder = { v: orderFine, where: `${st.name} [${modeTag}] side ${side}` };

      /* R4 */
      let r4 = 0, mono = 0, prev = -1;
      for (const u of [0.0137, 0.0579, 0.1, 0.2, 0.357, 0.5, 0.7, 0.9, 0.97, 0.9924, 0.9996, 1]) {
        const s = rim.sAt(u, side);
        if (!(s > prev)) mono++;
        prev = s;
        const back = rim.uAt(s, side);
        if (Math.abs(back - u) > 1e-9) r4++;
      }
      if (r4) bad.push(`R4: ${st.name} [${modeTag}] side ${side}: uAt(sAt(u)) missed u by more than 1e-9 at ${r4} probes`);
      if (mono) bad.push(`R4: ${st.name} [${modeTag}] side ${side}: sAt is not strictly increasing at ${mono} probes`);

      rec.sides[side] = { length: L1, meshPolyline: poly, bladeArc: S, deficitMm: deficit, deficitRel, maxChordDeficitMm: maxChordDeficit.v, maxChordDeficitAtU: maxChordDeficit.u, minArcMinusChord: minAmC, richardson: { L1, L2, L4, L8, d1, d2, d3, orderCoarse, orderFine, boundMm: bound }, seamAtRingMm: seam0 };
    }
    rec.tipFace = { ...rim.tipFace, twoH: 2 * surface.profile.halfWidthAt(1) };
    rec.loopLength = rim.loopLength;
    table.push(rec);
  }
}

/* ---------- R5: the rim's tangent breaks, independently ---------------- */
const NAMED = { LIVE: [0.057939, 0.999562], EXPORT: [0.057939, 0.992424] };
const ARMS = STATES.slice(0, QUICK ? 2 : 6);
let r5Found = 0, r5Fired = 0;
const unit = (v) => { const L = Math.hypot(v[0], v[1], v[2]); return [v[0] / L, v[1] / L, v[2] / L]; };
const angleDeg = (a, b) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
for (const st of ARMS) {
  for (const exportMode of [false, true]) {
    const modeTag = exportMode ? 'EXPORT' : 'LIVE';
    const state = { ...DEFAULTS, ...st.set };
    const acc = new G.MeshBuilder({ exportMode });
    const { ring, slot } = firstSlot(state, acc, st.layer);
    const surface = G.petalSurface(state, ring, slot, null, acc);
    /* THE CONTROL'S SURFACE: the same law, declaring no breaks. */
    const probed = CONTROL ? { ...surface, tangentBreaks: () => [] } : surface;
    const rim = G.petalRim(probed);
    const P = (u) => surface.at(u, 1).P;
    const tc = (u) => { const e = 1e-6; return unit([P(u + e)[0] - P(u - e)[0], P(u + e)[1] - P(u - e)[1], P(u + e)[2] - P(u - e)[2]]); };
    const tf = (u) => { const e = 1e-6; return unit([P(u + e)[0] - P(u)[0], P(u + e)[1] - P(u)[1], P(u + e)[2] - P(u)[2]]); };
    const tb = (u) => { const e = 1e-6; return unit([P(u)[0] - P(u - e)[0], P(u)[1] - P(u - e)[1], P(u)[2] - P(u - e)[2]]); };
    /* THE GRID IS OFFSET BY A GOLDEN FRACTION so no designed constant lands
       on a node: a kink exactly ON a grid point evades bracket-then-bisect
       (both bracket ends see the same side of it and the bisection converges
       to nothing), which is how FORM_ONSET_END = 0.30 = 1200/4000 went
       unreported on the first run while its corner measured 24-55 degrees. */
    const N = 4000, OFF = 0.3819660112501051, JUMP_DEG = 1, found = [];
    let prevT = tc((2 + OFF) / N);
    for (let i = 2; i < N - 2; i++) {
      let a = (i + OFF) / N, b = (i + 1 + OFF) / N;
      const tB = tc(b);
      const jump = angleDeg(prevT, tB) > JUMP_DEG;
      prevT = tB;
      if (!jump) continue;
      const tL = tf(a), tR = tb(b);
      for (let k = 0; k < 60; k++) { const m = (a + b) / 2, tm = tf(m); if (angleDeg(tm, tR) < angleDeg(tm, tL)) b = m; else a = m; }
      const u = (a + b) / 2;
      const e = 1e-6;
      const L = [(P(u)[0] - P(u - e)[0]) / e, (P(u)[1] - P(u - e)[1]) / e, (P(u)[2] - P(u - e)[2]) / e];
      const R = [(P(u + e)[0] - P(u)[0]) / e, (P(u + e)[1] - P(u)[1]) / e, (P(u + e)[2] - P(u)[2]) / e];
      const nl = Math.hypot(...L), nr = Math.hypot(...R);
      const deg = angleDeg(unit(L), unit(R));
      const genuine = deg > 0.5 || Math.abs(nr / nl - 1) > 0.02;
      if (genuine && !found.some((f) => Math.abs(f.u - u) < 1e-6)) found.push({ u, deg, ratio: nr / nl });
    }
    r5Found += found.length;
    const missed = [];
    for (const f of found) {
      const gap = rim.breaks.length ? Math.min(...rim.breaks.map((b) => Math.abs(b.u - f.u))) : Infinity;
      /* THE ANGLE IS RE-READ AT THE QUERY'S EXACT NODE when one matches: the
         detector lands within ~1e-6 of a kink, so one-sided differences at
         e = 1e-6 taken THERE straddle it and read about half the true break
         (measured: 12.1 deg at the onset where the exact node reads 24.2). */
      if (gap <= 1e-5) {
        const ub = rim.breaks.reduce((a, b) => (Math.abs(b.u - f.u) < Math.abs(a.u - f.u) ? b : a)).u, e = 1e-6;
        const L = [(P(ub)[0] - P(ub - e)[0]) / e, (P(ub)[1] - P(ub - e)[1]) / e, (P(ub)[2] - P(ub - e)[2]) / e];
        const R = [(P(ub + e)[0] - P(ub)[0]) / e, (P(ub + e)[1] - P(ub)[1]) / e, (P(ub + e)[2] - P(ub)[2]) / e];
        f.deg = angleDeg(unit(L), unit(R)); f.ratio = Math.hypot(...R) / Math.hypot(...L); f.exact = ub;
      }
      if (gap > worstSeamGap.v) worstSeamGap = { v: gap, u: f.u, mode: modeTag, state: st.name };
      if (gap > 1e-5) { missed.push(f); bad.push(`R5: ${st.name} [${modeTag}]: the rim's tangent breaks at u = ${f.u.toFixed(6)} (${f.deg.toFixed(2)} deg, |dP/du| ratio ${f.ratio.toFixed(3)}) and the query placed no node within 1e-5 of it (nearest ${Number.isFinite(gap) ? gap.toExponential(2) : 'none'})`); }
    }
    if (missed.length) r5Fired++;
    if (st === STATES[0]) {
      for (const u of NAMED[modeTag]) {
        const gap = rim.breaks.length ? Math.min(...rim.breaks.map((b) => Math.abs(b.u - u))) : Infinity;
        if (gap > 1e-5) bad.push(`R5 [${modeTag}]: the named seam u = ${u} has no query node within 1e-5 (nearest ${Number.isFinite(gap) ? gap.toExponential(2) : 'none'})`);
      }
    }
    console.log(`R5 ${st.name} [${modeTag}]: detector ${found.length ? found.map((f) => `u ${f.u.toFixed(6)} (${f.deg.toFixed(2)} deg at v = +1${f.exact !== undefined ? ', read at the node' : ''})`).join(', ') : 'no tangent break'}`);
    console.log(`   query nodes:  ${rim.breaks.length ? rim.breaks.map((b) => `${b.kind === 'TERM_CHANGE' ? `${b.from}->${b.to}` : b.kind === 'FORM_ONSET' ? 'form onset' : 'tip-law join'} @ ${b.u.toFixed(6)}`).join(', ') : 'NONE DECLARED'}`);
    if (CONTROL) {
      const declared = G.petalRim(surface), ref = G.petalRim(surface, 8 * G.RIM_SAMPLES);
      console.log(`   control residual at ${G.RIM_SAMPLES} against 8x: no breaks ${Math.abs(rim.length(1) - ref.length(1)).toExponential(2)} mm, declared ${Math.abs(declared.length(1) - ref.length(1)).toExponential(2)} mm`);
    }
  }
}
if (!r5Found) bad.push('R5: VACUOUS — the independent detector found no tangent break on any arm, which contradicts the outline\'s Math.max construction; the detector is broken');
/* ---------- validity --------------------------------------------------- */
if (!statesRun) bad.push('VACUOUS: no state was built');
if (!stationsR1) bad.push('VACUOUS: R1a compared no stations');
if (!CONTROL && !apexTiedR1) bad.push('VACUOUS: R1b tied no apex to the emitted stream');
if (!CONTROL && !flatTiedR1) bad.push('VACUOUS: R1c tied no zero-ramp vertex to the emitted stream');
/* THE SUBJECT COUNTS ARE CHECKED UNDER THE CONTROL TOO, because the control
   perturbs each arm's MEASURED value and leaves its subject alone — so an arm
   that had quietly stopped having anything to look at would report as fired
   rather than as empty. R1c's guard is the one that can empty itself. */
if (!flatSubjectR1) bad.push(`VACUOUS: R1c addressed no ring row — the query's u = 0 point coincided with the captured ring row on 0 of ${flatSubjectR1 + flatExcludedR1} side-builds`);
if (!partitionProbed) bad.push("VACUOUS: the rim.apex / rim.flat partition was probed on no perimeter vertex");
if (!pairsR2) bad.push('VACUOUS: R2 compared no station pairs');
if (!r3Assessed) bad.push('VACUOUS: R3 assessed no convergence order (every difference sat at fp noise)');

/* ---------- report ----------------------------------------------------- */
console.log(`\n${statesRun} builds (${STATES.length} states x 2 modes), ${stationsR1.toLocaleString()} station x margin comparisons, ${pairsR2.toLocaleString()} station pairs.`);
console.log(`R1 — the query against the exported mesh (the rim capture moved a float on ${rimBytesMoved} of ${statesRun} builds):`);
console.log(`   R1b: ${apexTiedR1.toLocaleString()} of ${stationsR1.toLocaleString()} blade stations whose own point is an emitted vertex, and the apex the builder recorded there`);
console.log(`   R1c: ${flatTiedR1.toLocaleString()} zero-ramp vertices reconstructed; ${bladeUntreatedR1} of ${stationsR1.toLocaleString()} blade stations were routed here as UNTREATED, plus the ring row on ${flatSubjectR1} of ${flatSubjectR1 + flatExcludedR1} side-builds; ${flatExcludedR1} excluded where the query's u = 0 point is not the captured ring row (worst gap ${worstFlatGap.v === -1 ? 'n/a' : worstFlatGap.v.toExponential(3) + ' mm [' + worstFlatGap.where + ']'})`);
if (flatExcludedR1) console.log(`        excluded: ${[...new Set(flatExcludedWhere.map((w) => w.replace(/ side -?1$/, '')))].join(', ')}`);
console.log(`   partition: ${partitionProbed.toLocaleString()} perimeter margin entries, each in exactly one of rim.apex and rim.flat`);
console.log(`   BETWEEN stations (REPORTED, never asserted): ${insertedApexes.toLocaleString()} emitted vertices lie on the chord strictly between two consecutive station apexes, over ${insertedStretches.toLocaleString()} of ${stretchesScanned.toLocaleString()} stretches; worst ${worstOffLine.v === -1 ? 'n/a' : worstOffLine.v.toExponential(3) + ' mm off the line [' + worstOffLine.where + ']'}`);
console.log(`\nR2 — the exported boundary against the reported arc (NU ${G.BLADE_ROWS} stations below the apex row ramp's band (${G.APEX_NU_BAND[0]}), up to ${G.APEX_NU_ABOVE} on the petalTipShape >= ${G.APEX_NU_BAND[1]} rows this table also carries; the query at ${G.RIM_SAMPLES} cells + seam nodes):`);
console.log(`   min (arc - chord) over every station pair: ${minArcMinusChord.v.toExponential(3)} mm  [${minArcMinusChord.where}]  — never negative beyond rounding`);
console.log(`   max total deficit, relative: ${(100 * maxDeficitRel.v).toFixed(3)}% of ${maxDeficitRel.S.toFixed(3)} mm (mesh polyline ${maxDeficitRel.poly.toFixed(3)})  [${maxDeficitRel.where}]`);
console.log(`   max total deficit, absolute: ${maxDeficitMm.v.toFixed(4)} mm of ${maxDeficitMm.S.toFixed(3)}  [${maxDeficitMm.where}]`);
console.log(`R3 — the query's own residual bound at RIM_SAMPLES (three measured doublings plus the tail the fine-end order implies), ${r3Assessed} sides with a measurable order:`);
console.log(`   max ${maxR3.v.toExponential(3)} mm  (${maxR3.L1.toFixed(6)} at 1x -> ${maxR3.L8.toFixed(6)} at 8x, fine-end order ${maxR3.orderFine === null ? 'n/a' : maxR3.orderFine.toFixed(2)})  [${maxR3.where}]`);
console.log(`   max relative ${maxR3Rel.v.toExponential(3)}  [${maxR3Rel.where}]`);
console.log(`   lowest fine-end order ${minOrder.v === null ? 'n/a' : minOrder.v.toFixed(2)}  [${minOrder.where}]  (a chord across an undeclared kink reads <= 1)`);
console.log(`R5 — worst gap between an independently located seam and the nearest query node: ${worstSeamGap.v === -1 ? 'n/a' : worstSeamGap.v.toExponential(2)} (u ${worstSeamGap.u?.toFixed(6)}, ${worstSeamGap.mode})`);
/* OVER BOTH MARGINS. These lines indexed `sides[1]` and never `sides[-1]`,
   so they reported a side +1 figure under the word "worst" — and the header
   quoted them (0.90% LIVE / 0.75% EXPORT) as the tool's stated residual. The
   worst state's two margins are not alike: over both it is 1.297% and 1.035%.
   Reproduces exactly on a worktree of `main`, so it is pre-existing and not
   the edge profile's. */
const modes = ['LIVE', 'EXPORT'];
for (const m of modes) {
  let wd = { v: -1 }, wb = { v: -1 };
  for (const r of table.filter((x) => x.mode === m)) for (const side of G.RIM_SIDES) {
    const x = r.sides[side];
    if (x.deficitRel > wd.v) wd = { v: x.deficitRel, state: r.state, side, mm: x.deficitMm, S: x.bladeArc };
    if (x.richardson.boundMm > wb.v) wb = { v: x.richardson.boundMm, state: r.state, side };
  }
  if (wd.v >= 0) console.log(`   ${m}: worst mesh deficit over BOTH margins ${(100 * wd.v).toFixed(3)}% (${wd.mm.toFixed(4)} mm of ${wd.S.toFixed(3)}) [${wd.state} side ${wd.side}]; worst query bound ${wb.v.toExponential(2)} mm [${wb.state} side ${wb.side}]`);
}
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ samples: G.RIM_SAMPLES, stationsBelowBand: G.BLADE_ROWS, apexNuBand: G.APEX_NU_BAND, apexNuAbove: G.APEX_NU_ABOVE, table }, null, 1)); console.log(`\nper-state table written to ${JSON_OUT}`); }

if (bad.length) {
  console.log(`\n${CONTROL ? 'CONTROL RESULT' : 'FAIL'} — ${bad.length} finding(s):`);
  for (const b of bad.slice(0, 60)) console.log('  ' + b);
  if (bad.length > 60) console.log(`  ... and ${bad.length - 60} more`);
  if (CONTROL) {
    /* EACH ARM BY NAME. A control that only asked whether "R1" fired would be
       satisfied by R1a alone, and R1b and R1c — the two this session wrote —
       would be log lines. */
    const r1a = bad.some((b) => b.startsWith('R1a'));
    const r1b = bad.some((b) => b.startsWith('R1b'));
    const r1c = bad.some((b) => b.startsWith('R1c'));
    const r5Any = bad.some((b) => b.startsWith('R5'));
    const nothingElse = bad.every((b) => b.startsWith('R1') || b.startsWith('R5'));
    console.log(`\npositive control: R1a fired ${r1a}; R1b fired ${r1b}; R1c fired ${r1c}; R5 fired on the break-less query on ${r5Fired} of ${ARMS.length * 2} arm x mode builds; nothing else fired ${nothingElse}`);
    console.log(`   subjects under the control (the perturbation is on each arm's MEASURED value, so these must not collapse): R1a/R1b ${stationsR1.toLocaleString()} stations, R1c ${flatSubjectR1} of ${flatSubjectR1 + flatExcludedR1} side-builds`);
    process.exit(r1a && r1b && r1c && r5Any && r5Fired === ARMS.length * 2 && nothingElse ? 0 : 1);
  }
  process.exit(1);
}
if (CONTROL) { console.log('\nCONTROL DID NOT FIRE'); process.exit(1); }
console.log('\nPASS — the rim query is the exported mesh\'s own rim at every station, its arc is never shorter than the emitted chord, and its residual is bounded as stated above.');
