/* ===================================================================
   verify-bloom-sphere-stem-bytes.mjs — THE SPHERE STEM CHANNEL'S BYTE
   PARTITION, AND THE CLAIM THAT ONLY THE OMITTED PETALS WENT.

     node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree>
        [--change omission|band|plug] [--control] [--control-only] [--rows N] [--only re]

   TWO CLAUSES, and the second is the one this feature is actually about.

   CLAUSE 1 — THE PARTITION. Every predeclared MOVER must move and every
   HOLDER must hold, both modes, every export float compared with `Object.is`
   so a -0 is distinguished. A feature that adds a part cannot claim "0 moved"
   over the whole matrix, and a tool that only checked the holders would pass
   on a feature that does nothing at all.

   CLAUSE 2 — ONLY THE OMITTED PETALS' BYTES DISAPPEARED. On every mover, the
   branch's stream must be EXACTLY the base's with the omitted petals' triangle
   blocks deleted and the stem's own triangles appended after the hub. Float for
   float. If any SURVIVING petal moved, the omission renumbered or re-placed
   something (the ruling's condition 2); if the HUB moved, it was sized from the
   survivors (condition 3). The partition names which.

   HOW THE BLOCKS ARE LOCATED, and it is not a guess: `buildBloomInto` emits the
   petals in slot order, then the hub, then the stem, and under SPHERE the
   androecium and the gynoecium are hidden AND inert so nothing follows. Each
   petal's own triangle count is read by building THAT petal, on the BASE tree's
   own module, into a throwaway accumulator — the same construction the channel
   itself uses, and legitimate for the same reason: the geometry does not depend
   on accumulator state. The tool REFUSES rather than guesses if the counts it
   derives do not add up to the base stream it is slicing.

   UNDER `--change plug` CLAUSE 2 ASKS THE QUESTION THE BAND'S COULD NOT. It
   keeps the band's two halves — every differing float inside the stem's own
   envelope, and the outer cylinder wall bit-identical — and adds the one the
   band's header had to declare itself blind to: THE BOTTOM FACE'S OWN AREA.
   On the base it is the tube's section, `poly(R) - poly(b)`; on the branch it
   is a full disc, `poly(R)` — a 56% difference at the widest bore. The
   reference is the closed form of a regular N-gon's area, owned by neither
   `stemPlan` nor `buildStemInto`; the measured side is the emitted triangles'
   own cross products. That clause exists because half (b) DEFINES the wall as
   the triangles not all at one height, and the bottom face is exactly the
   triangles all at one height — so without it the one surface this change is
   about would be the one surface clause 2 had defined itself out of, correct,
   in scope and empty at any plug length on any row (the fifth durable rule,
   and the band's own recorded trap).

   ITS MOVERS ARE THE WIDEST OF THE THREE: a row moves iff `stemPlan` reports a
   stem PRESENT with a BORE to close, which is every hollow stem in the matrix
   and nothing else. A stem at or under the 3 mm floor has no bore and is a
   HOLDER; so is every row at `stemLength` 0. Rows where the two closures MEET
   are movers, and have to be — the bore they used to carry is gone entirely.

   UNDER `--change band` CLAUSE 2 ASKS A DIFFERENT QUESTION OF THE SAME BUILDER:
   the band may only change the stem's INTERIOR. Two halves. (a) every float
   that differs, on either side, lies inside the stem's own envelope (radius
   <= outerR, z within [tipZ, topZ]) — so a band that reached the head, a petal
   or the hub is named rather than absorbed; (b) the stem's OUTER CYLINDER WALL
   is bit-identical, triangle for triangle, sorted — so the silhouette from any
   side is untouched.

   ITS DECLARED BLINDNESS, because the first version of this file claimed more
   than it could see: (b) EXCLUDES the top and bottom faces by construction
   (their rim fans also sit at outerR, and are separated from the wall by having
   all three vertices at one height). The band DOES change the top face — that is
   what closing a bore is — and on the rows where a band exists the head is by
   the condition narrower than the tube, so that face is exposed with the band
   and without it. What (b) carries is therefore "the tube's side is untouched",
   never "nothing the eye can reach moved". The first draft of this header said
   the latter; it was corrected by re-reading the diff against the clause, not
   by a red.

   THE PARTITION IS PREDECLARED FROM THE BUILDER'S OWN RECORD, never from the
   control set (session 41's discipline): a row moves iff the builder actually
   reports a stem channel on it — a stem present on a sphere — which is the only
   thing on this branch that can move a byte. A row that sets `stemDiameter` to
   an extreme with `stemLength` 0 is correctly a HOLDER, and so is every sphere
   row that shipped before this session.

   AND A ROW MOVES UNDER `--change band` IFF `stemPlan` ITSELF REPORTS A BAND
   (`solidBandMm > 0`) — the plan's own record again, not the control set, so a
   row that merely sets a wide stem on a normal head is correctly a HOLDER and
   the inert-by-branch claim is measured rather than argued.

   THE CONTROL IS `--control`, required before quoting a pass from a changed
   harness: it perturbs one coordinate of every HOLDER by 1e-9 and requires the
   comparison to fail. `--rows N` narrows it — the control's claim is that this
   comparison DETECTS a perturbation, which any row it fires on establishes,
   where the PASS claim is about the whole matrix and must run it.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null;
const CONTROL = process.argv.includes('--control');
/* THE SECOND CONTROL, AND IT IS OWED RATHER THAN OPTIONAL. `--control`
   perturbs a HOLDER and exercises CLAUSE 1 only — it SKIPS clause 2 entirely,
   so the clause this whole feature is about would have been a log line that
   had never been shown able to fail. That is this repo's own recorded lesson
   ("a control that fires only the first leaves the second a log line",
   `verify-bloom-seam-bytes.mjs`'s `--control-mode`), and the hole was found by
   re-reading the tool after its first clean run rather than by a failure.
   `--control-only` moves the FIRST float of a MOVER's emitted stream, which is
   the first SURVIVING petal's first vertex and therefore by construction not
   in any omitted petal's block — exactly the condition-2 violation (a petal
   that was kept but moved) clause 2 exists to catch. Clause 1 stays clean
   under it, because a mover that moves is all clause 1 asks.
   UNDER `--change band` THE SAME FLOAT IS THE FIRST PETAL'S OR (on the bare
   corner, which builds none) THE HUB'S — either way OUTSIDE the stem, which is
   half (a)'s own claim, so it is the band escaping the stem that is exercised.
   Half (b) is exercised by the mutation the apex table would carry rather than
   from here: a wall triangle can only move if the band's own ladder reaches the
   tube, and no perturbation of the emitted stream can manufacture that without
   also violating (a) first. Named so the asymmetry is a declared property of
   this control and not an oversight. */
const CONTROL_ONLY = process.argv.includes('--control-only');
/* PER CHANGE, NOT PER TOOL — the seam tool's own precedent (session 39): this
   file is named for its FIRST caller and the tool is not. `omission` is the
   channel that named it; `band` is the SOLID ROOT BAND, whose movers and whose
   second clause are different questions about the same builder. */
const CHANGE = process.argv.includes('--change') ? process.argv[process.argv.indexOf('--change') + 1] : 'omission';
if (!['omission', 'band', 'plug'].includes(CHANGE)) { console.error(`--change must be omission|band|plug, not ${CHANGE}`); process.exit(2); }
if (!BASE || !fs.existsSync(BASE)) { console.error('verify-bloom-sphere-stem-bytes: need --base <worktree of the base commit>'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const GB = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { DEFAULTS: DB } = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const LIMIT = process.argv.includes('--rows') ? Number(process.argv[process.argv.indexOf('--rows') + 1]) : 0;
/* `--only <regex>` narrows to named rows while proving the TOOL on two of them
   before the grid — the charter's "debug an instrument on two rows". Like
   `--rows` it is never a pass, and the run says so. */
const ONLY = process.argv.includes('--only') ? new RegExp(process.argv[process.argv.indexOf('--only') + 1]) : null;
const rows = (LIMIT ? H.buildMatrix().slice(0, LIMIT) : H.buildMatrix()).filter((r) => !ONLY || ONLY.test(r.label));
const NARROWED = !!(LIMIT || ONLY);
const setOf = (r) => Object.fromEntries(r.set.map((x) => [x.id, isNaN(Number(x.value)) ? x.value : Number(x.value)]));

const build = (M, D, set, em) => { const acc = new M.MeshBuilder({ exportMode: em }); const b = M.buildBloomInto(acc, { ...D, ...set }); return { acc, b }; };

/* PREDECLARED FROM THE BUILDER'S OWN OWNERS, never from the control set: a row
   moves iff `stemPlan` reports a stem PRESENT on a head `footRing` reports as a
   SPHERE, which is `stemOmission`'s own guard read from the two objects that
   answer it rather than from the labels a row happens to carry. It is asked of
   both modes because the plan reads the accumulator's floor. Deliberately NOT a
   full `buildBloomInto` — footRing and stemPlan emit nothing, and running the
   whole builder twice more per row to read one flag costs half the tool's
   runtime on `ALL MAX` alone. */
function movesByRecord(set) {
  for (const em of [true, false]) {
    const acc = new G.MeshBuilder({ exportMode: em });
    const st = { ...DEFAULTS, ...set };
    const fr = G.footRing(st, acc);
    if (CHANGE === 'band') {
      /* THE BAND'S OWN RECORD, and it is the BUILT length rather than the
         condition that decides it: `solidBandMm > 0` is the one thing on this
         change that can move a byte. A row whose head merely happens to be
         small, or that sets `stemDiameter` wide with `stemLength` 0, is
         correctly a HOLDER — which is Eva's constraint 2 stated as a
         predicate rather than checked afterwards. */
      if (!fr.hub) continue;
      const plan = G.stemPlan(st, fr.hub, acc);
      if (plan.present && plan.solidBandMm > 0) return true;
    } else if (CHANGE === 'plug') {
      /* THE PLUG'S OWN RECORD, and it is the widest predicate of the three
         because the plug is the widest change: a row moves iff the plan reports
         a stem that is PRESENT and has a BORE to close. Not "iff a plug was
         built" — that would be the same statement with an extra step, since
         `tipPlugMm` is non-zero exactly when `boreR` is. Rows where the two
         closures MEET are movers too, and have to be: the bore they used to
         carry is gone entirely, which is a bigger move than plugging one end.
         Both halves are mode-free (`stemDiameter` and `stemLength` are the only
         inputs), so the two-mode loop here can only agree with itself — kept
         for the shape the other two changes need rather than for its own sake. */
      if (!fr.hub) continue;
      const plan = G.stemPlan(st, fr.hub, acc);
      if (plan.present && plan.boreR > 0) return true;
    } else if (fr.sphereMode && G.stemPlan(st, fr.hub, acc).present) return true;
  }
  return false;
}

/* CLAUSE 2 FOR THE BAND — TWO HALVES, and the second is Eva's constraint 4
   measured instead of argued.

   (a) NOTHING OUTSIDE THE STEM MOVED. Every differing float must belong to a
       vertex inside the stem's own envelope (radius <= outerR, z within
       [tipZ, topZ]). If the head, a petal or the hub moved, the band reached
       something it has no business reaching.

   (b) THE OUTER CYLINDER WALL IS BIT-IDENTICAL — and what that does NOT mean is
       stated here, because the first version of this comment got it wrong and
       the clause was built around the error. It said the wall plus the bottom
       face is "the whole of what can be seen of a stem, since the top face lies
       inside the head's own hollow". THAT IS FALSE where the stem is wider than
       the head, which is the only place the band ever fires: measured on the
       bare corner, 80.4% of the closed top face lies outside the head's
       silhouette and IS seen from above. Worse, this clause's own definition of
       "wall" excludes triangles that share one height — which is exactly the top
       face — so it could not have noticed.

       SO (b) IS THE NARROWER CLAIM IT ACTUALLY TESTS: the stem's outer CYLINDER
       did not move, so the band did not reach a surface it has no business
       reaching. It is NOT a claim that the band is invisible; the band is
       visible, that is the closure itself, and §11d records the number.
       Identified geometrically rather than by stream offset, so it holds
       whatever order the builder emits in. */
function onlyTheStemsInteriorWent(set, em) {
  const { acc: accB, b: repB } = build(G, DEFAULTS, set, em);
  if (CONTROL_ONLY && accB.positions.length) accB.positions[0] += 1e-9;
  const { acc: accA, b: repA } = build(GB, DB, set, em);
  const st = { ...DEFAULTS, ...set };
  const plan = G.stemPlan(st, G.footRing(st, new G.MeshBuilder({ exportMode: em })).hub,
                          new G.MeshBuilder({ exportMode: em }));
  const R = plan.outerR, EPS = 1e-9;
  const a = accA.positions, b = accB.positions;
  if (a.length !== b.length) {
    /* A LENGTH CHANGE IS EXPECTED HERE — the band emits a different triangle
       count — so this is not a failure by itself; the wall check below is what
       carries the claim, and the envelope check runs over the shorter stream's
       own triangles on each side independently. */
  }
  const outside = (pos) => {
    const bad = [];
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.hypot(pos[i], pos[i + 1]), z = pos[i + 2];
      if (r > R + 1e-6 || z > plan.topZ + 1e-6 || z < plan.tipZ - 1e-6) bad.push(i);
    }
    return bad;
  };
  /* The wall's triangles: all three vertices at radius outerR, and NOT all at
     one height (which is what separates the wall from the top and bottom
     faces, whose rim fans also sit at outerR). */
  const wall = (pos) => {
    const out = [];
    for (let i = 0; i < pos.length; i += 9) {
      let onR = true; const zs = [];
      for (let k = 0; k < 3; k++) {
        const r = Math.hypot(pos[i + k * 3], pos[i + k * 3 + 1]);
        if (Math.abs(r - R) > 1e-6) { onR = false; break; }
        zs.push(pos[i + k * 3 + 2]);
      }
      if (onR && !(zs[0] === zs[1] && zs[1] === zs[2])) out.push(pos.slice(i, i + 9).join(','));
    }
    return out.sort();
  };
  const wa = wall(a), wb = wall(b);
  if (wa.length !== wb.length) return `the stem's OUTER WALL has ${wa.length} triangles on the base and ${wb.length} on the branch — the ${CHANGE} changed a surface that can be SEEN`;
  for (let i = 0; i < wa.length; i++) if (wa[i] !== wb[i]) return `a stem OUTER WALL triangle moved (${wa[i]} -> ${wb[i]}) — the ${CHANGE} moved the tube's own side, which neither closure has any business reaching`;
  /* (a) — AND UNDER `--change plug` IT IS A CONTIGUOUS-RUN COMPARISON, because
     an INDEX-ALIGNED one is wrong the moment anything follows the stem.

     `buildBloomInto` emits petals, then the hub, then the STEM, then the
     androecium and the gynoecium. The band only ever fires on SPHERE rows,
     where the centre is hidden AND inert so nothing follows — there the
     index-aligned form below is valid, and it is left alone. The PLUG fires on
     every hollow stem, including rows that carry a centre, and there the stem's
     own triangle count changing (576 -> 476) SHIFTS everything after it: the
     comparison then reads a stem vertex against a stamen's and reports a
     difference the geometry does not have. MEASURED — the first whole-matrix
     run failed on exactly the two rows with parts after the stem (`ALL MAX` and
     `STEM: x the whole centre`), naming "(r 1.5000, z 0.6000) against
     (r 8.2447, z -0.6000)", which is the bore's own ring against the hub's rim.

     THE REPLACEMENT IS STRICTLY STRONGER, not a loosening. Scanning in from
     BOTH ENDS finds the one contiguous run that differs; everything outside it
     is then bit-identical BY CONSTRUCTION rather than by assertion. Three
     claims follow: the run is contained in the stem's own envelope, the two
     streams' LENGTH difference is exactly the stem's own triangle delta, and
     the outer cylinder wall (below) is untouched. A change that moved a petal
     as well as the stem would widen the run past the envelope; one that moved
     something and compensated elsewhere would break the length identity. */
  if (CHANGE === 'plug') {
    const la = a.length, lb = b.length;
    const stemA = repA.stemBuilt ? repA.stemBuilt.tris : 0;
    const stemB = repB.stemBuilt ? repB.stemBuilt.tris : 0;
    if (la - lb !== (stemA - stemB) * 9) {
      return `the two streams differ by ${la - lb} floats while the STEM's own triangle count differs by ${stemA - stemB} (${(stemA - stemB) * 9} floats) — something other than the stem changed size`;
    }
    const lim = Math.min(la, lb);
    let i0 = 0; while (i0 < lim && Object.is(a[i0], b[i0])) i0++;
    let k0 = 0; while (k0 < lim - i0 && Object.is(a[la - 1 - k0], b[lb - 1 - k0])) k0++;
    if (i0 >= lim && la === lb) return null;                 // nothing differed at all
    const inEnv = (x, y, z) => Math.hypot(x, y) <= R + 1e-6 && z <= plan.topZ + 1e-6 && z >= plan.tipZ - 1e-6;
    /* The run is walked on VERTEX boundaries: `i0` can land mid-vertex, so it is
       rounded down to a multiple of 3 and the tail up, which only ever WIDENS
       the region being checked. */
    const lo = Math.floor(i0 / 3) * 3;
    for (const [arr, len] of [[a, la], [b, lb]]) {
      const hi = Math.ceil((len - k0) / 3) * 3;
      for (let i = lo; i < hi && i + 2 < len; i += 3) {
        if (!inEnv(arr[i], arr[i + 1], arr[i + 2])) {
          return `the one contiguous run that differs reaches OUTSIDE the stem's own envelope at float ${i}: (r ${Math.hypot(arr[i], arr[i + 1]).toFixed(4)}, z ${arr[i + 2].toFixed(4)}) against a stem of radius ${R} spanning z ${plan.tipZ.toFixed(4)}..${plan.topZ.toFixed(4)} — the plug reached the head, a petal, the hub or the centre`;
        }
      }
    }
    return bottomFaceClause(a, b, plan, R);
  }
  /* (a) — compare only where the two streams align; the differing tail is the
     band's own, and its vertices are checked against the envelope. */
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 3) {
    if (Object.is(a[i], b[i]) && Object.is(a[i + 1], b[i + 1]) && Object.is(a[i + 2], b[i + 2])) continue;
    const rA = Math.hypot(a[i], a[i + 1]), rB = Math.hypot(b[i], b[i + 1]);
    const inA = rA <= R + 1e-6 && a[i + 2] <= plan.topZ + 1e-6 && a[i + 2] >= plan.tipZ - 1e-6;
    const inB = rB <= R + 1e-6 && b[i + 2] <= plan.topZ + 1e-6 && b[i + 2] >= plan.tipZ - 1e-6;
    if (!inA || !inB) return `a vertex OUTSIDE the stem's own envelope moved at float ${i}: base (r ${rA.toFixed(4)}, z ${a[i + 2].toFixed(4)}) against branch (r ${rB.toFixed(4)}, z ${b[i + 2].toFixed(4)}) — the ${CHANGE} reached the head, a petal or the hub`;
  }
  const strayB = outside(b.slice(n)), strayA = outside(a.slice(n));
  if (strayA.length || strayB.length) return `the differing tail holds ${strayA.length + strayB.length} vertices outside the stem's own envelope`;
  /* (c) — AND UNDER `--change plug`, THE BOTTOM FACE IS THE FEATURE, SO IT IS
     ASSERTED RATHER THAN EXCLUDED.

     THIS CLAUSE EXISTS BECAUSE (b) CANNOT HOLD IT, and that is the fifth
     durable rule rather than an oversight: (b) defines "the stem's outer wall"
     as the triangles NOT all at one height, and the bottom face is exactly the
     triangles all at one height — so the one surface this change is about is
     the one surface (b) had defined itself out of. The band's own header
     records that trap; here the same clause would have been correct, in scope
     and EMPTY at any plug length on any row.

     SO THE SUBJECT IS STATED AS A SET AND THE FAILURE IS IN IT: the triangles
     whose three vertices all sit at the stem's own tip z. Their total AREA is
     the claim — an ANNULUS on the base (the tube's section, `poly(R) - poly(b)`)
     and a full DISC on the branch (`poly(R)`), a 56% difference at the widest
     bore. The reference is the CLOSED FORM of a regular N-gon's area, whose
     owner is neither `stemPlan` nor `buildStemInto`; the measured side is the
     emitted triangles' own cross products. Neither side can move with a defect
     in the other.

     It is the file-side clause ST10 declares itself blind to, arriving here
     because this tool already holds both streams and ST10 does not. */
  return null;
}

function bottomFaceClause(a, b, plan, R) {
  const poly = (rad) => 0.5 * plan.sides * rad * rad * Math.sin(2 * Math.PI / plan.sides);
  const faceArea = (pos, z) => {
    let A = 0;
    for (let i = 0; i < pos.length; i += 9) {
      if (!(pos[i + 2] === z && pos[i + 5] === z && pos[i + 8] === z)) continue;
      const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1];
      const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1];
      A += Math.abs(ux * vy - uy * vx) / 2;
    }
    return A;
  };
  const tip = plan.tipZ;
  const wantBase = poly(R) - poly(plan.boreR);          // the tube's own section: an annulus
  const wantBranch = poly(R);                           // closed: a full disc
  const gotBase = faceArea(a, tip), gotBranch = faceArea(b, tip);
  const tol = 1e-6 * Math.max(1, poly(R));
  if (Math.abs(gotBase - wantBase) > tol) {
    return `the BASE's bottom face measures ${gotBase.toFixed(4)} mm^2 at z = ${tip}; the tube's own section is ${wantBase.toFixed(4)} — this tool is not reading the face it thinks it is`;
  }
  if (Math.abs(gotBranch - wantBranch) > tol) {
    return `the bottom face measures ${gotBranch.toFixed(4)} mm^2 against a closed disc's ${wantBranch.toFixed(4)} — the bore is NOT closed at the tip and the stem still ends as a cut pipe`;
  }
  return null;
}

/* CLAUSE 2's slicer. Returns null (with a reason) rather than guessing. */
function onlyTheOmittedWent(set, em) {
  const { acc: accB, b: bb } = build(G, DEFAULTS, set, em);
  /* `--control-only`: a kept petal moves by 1e-9. See the flag's own note. */
  if (CONTROL_ONLY && accB.positions.length) accB.positions[0] += 1e-9;
  const { acc: accA, b: ba } = build(GB, DB, set, em);
  const om = new Set(bb.stemOmission.omitted);
  const K = ba.rings.length;
  if (bb.rings.length !== K) return `the two trees declare ${bb.rings.length} and ${K} descriptors — the SEQUENCE moved, not just which of it was built`;
  /* The base tree's per-petal triangle counts, built one at a time on its own
     module through its own whorl primitive — never a second copy of the
     azimuth law. */
  const frA = GB.footRing({ ...DB, ...set }, new GB.MeshBuilder({ exportMode: em }));
  const counts = new Array(K).fill(0);
  GB.buildWhorlInto({
    count: frA.rings.length, radius: (i) => frA.rings[i].radius, height: 0,
    sizeRamp: (i) => frA.rings[i].scale, angleRamp: (i) => frA.rings[i].tiltExtra,
    phase: frA.rings[0].phase, placement: ({ ...DB, ...set }).placement,
    blade: (slot) => { const p = new GB.MeshBuilder({ exportMode: em });
      GB.buildPetalInto(p, { ...DB, ...set }, frA.rings[slot.index], slot, null);
      counts[slot.index] = p.triangleCount; },
  });
  const petalTrisA = counts.reduce((a, c) => a + c, 0);
  const hubA = ba.hubBuilt.tris;
  if (petalTrisA + hubA !== accA.triangleCount) {
    return `the base stream is ${accA.triangleCount} triangles; ${petalTrisA} petals + ${hubA} hub is ${petalTrisA + hubA} — the slicer cannot locate the blocks, so no claim is made`;
  }
  /* Slice the base: keep the blocks of the slots the branch built. */
  const kept = [];
  let at = 0;
  for (let k = 0; k < K; k++) {
    const n = counts[k] * 9;
    if (!om.has(k)) for (let i = at; i < at + n; i++) kept.push(accA.positions[i]);
    at += n;
  }
  for (let i = at; i < accA.positions.length; i++) kept.push(accA.positions[i]);   // the hub
  /* And the branch, less its own stem, which is the only thing appended. */
  const stemTris = bb.stemBuilt ? bb.stemBuilt.tris : 0;
  const bLen = accB.positions.length - stemTris * 9;
  if (bLen !== kept.length) return `the branch carries ${bLen / 9} triangles beside its ${stemTris}-triangle stem; the base less the ${om.size} omitted petals is ${kept.length / 9}`;
  for (let i = 0; i < bLen; i++) {
    if (!Object.is(accB.positions[i], kept[i])) {
      const tri = Math.floor(i / 9);
      return `float ${i} (triangle ${tri} of ${bLen / 9}) differs: branch ${accB.positions[i]} against base ${kept[i]} — something other than the omitted petals moved`;
    }
  }
  return null;
}

let movers = 0, holders = 0; const badHold = [], badMove = [], badOnly = [];
let floats = 0;
for (const r of rows) {
  const set = setOf(r);
  const declaredMover = movesByRecord(set);
  let differs = false, n = 0;
  for (const em of [true, false]) {
    const a = build(GB, DB, set, em).acc.positions;
    const b = build(G, DEFAULTS, set, em).acc.positions;
    if (CONTROL && !declaredMover) b[0] += 1e-9;
    if (a.length !== b.length) { differs = true; n += Math.abs(a.length - b.length); continue; }
    for (let i = 0; i < a.length; i++) { floats++; if (!Object.is(a[i], b[i])) { differs = true; n++; } }
  }
  if (declaredMover) {
    movers++;
    if (!differs) badMove.push(r.label);
    if (!CONTROL) for (const em of [true, false]) {
      const why = CHANGE === 'band' || CHANGE === 'plug' ? onlyTheStemsInteriorWent(set, em) : onlyTheOmittedWent(set, em);
      if (why) badOnly.push(`${r.label} [${em ? 'EXPORT' : 'LIVE'}]: ${why}`);
    }
  } else { holders++; if (differs) badHold.push(`${r.label} (${n} floats)`); }
}
console.log(`BASE ${BASE}  ·  --change ${CHANGE}${NARROWED ? `  (${rows.length} NAMED ROWS ONLY — never a pass of the matrix)` : ''}`);
console.log(`${rows.length} rows · ${movers} predeclared MOVERS · ${holders} predeclared HOLDERS · ${floats.toLocaleString('en-US')} export floats compared with Object.is`);
console.log(`CLAUSE 1  movers that did NOT move: ${badMove.length}`);
for (const b of badMove) console.log('   ' + b);
console.log(`CLAUSE 1  holders that MOVED: ${badHold.length}`);
for (const b of badHold.slice(0, 12)) console.log('   ' + b);
if (!CONTROL) {
  console.log(CHANGE === 'plug'
    ? `CLAUSE 2  movers where the stem's OUTER WALL moved, anything outside the stem did, or the bottom face is not a closed DISC: ${badOnly.length}`
    : CHANGE === 'band'
    ? `CLAUSE 2  movers where the stem's OUTER WALL moved, or anything outside the stem did: ${badOnly.length}`
    : `CLAUSE 2  movers where something OTHER than the omitted petals moved: ${badOnly.length}`);
  for (const b of badOnly.slice(0, 12)) console.log('   ' + b);
}
const pass = !badMove.length && !badHold.length && !badOnly.length;
/* THE TWO CONTROLS HAVE TWO VERDICTS, because each is about a different
   clause and a run that reported "the control fired" without saying WHICH
   would be the conflation this second control exists to undo. */
if (CONTROL_ONLY) {
  const fired = badOnly.length > 0;
  console.log(fired
    ? `\nCONTROL-ONLY OK — CLAUSE 2 reported ${badOnly.length} of ${movers * 2} (mover x mode) builds where ${CHANGE === 'band' || CHANGE === 'plug' ? 'a float OUTSIDE the stem had moved' : 'a KEPT petal had moved'}`
    : '\nCONTROL-ONLY FAILED TO FIRE — clause 2 cannot see a kept petal moving, so its PASS is not evidence');
  if (!movers) console.log('   (and there were NO MOVERS in this row set, so the control was vacuous — narrow to rows that build a stem on a sphere)');
  process.exit(fired && movers ? 0 : 1);
}
console.log(CONTROL ? (pass ? '\nCONTROL FAILED TO FIRE — the comparison cannot see a 1e-9 perturbation, so neither clause is evidence' : '\nCONTROL OK — CLAUSE 1 detected the perturbation on the holders (clause 2 is NOT exercised here — that is `--control-only`)')
                    : (pass ? (NARROWED ? '\nOK on the named rows — NOT a pass of the matrix.' : (CHANGE === 'plug'
                        ? '\nPASS — every predeclared mover moved, every holder held, and on every mover every float that went lies INSIDE the stem, its outer wall stayed bit-identical, and its bottom face came out a CLOSED DISC where the base had an annulus.'
                        : CHANGE === 'band'
                        ? '\nPASS — every predeclared mover moved, every holder held, and on every mover every float that went lies INSIDE the stem while its outer wall stayed bit-identical.'
                        : '\nPASS — every predeclared mover moved, every holder held, and on every mover the ONLY floats that went are the omitted petals\' own.')) : '\nFAIL'));
process.exit(CONTROL ? (pass ? 1 : 0) : (pass ? 0 : 1));
