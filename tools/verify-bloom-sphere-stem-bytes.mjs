/* ===================================================================
   verify-bloom-sphere-stem-bytes.mjs — THE SPHERE STEM CHANNEL'S BYTE
   PARTITION, AND THE CLAIM THAT ONLY THE OMITTED PETALS WENT.

     node tools/verify-bloom-sphere-stem-bytes.mjs --base <worktree>
        [--change omission|band|plug|cut] [--control] [--control-only] [--rows N] [--only re]

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
if (!['omission', 'band', 'plug', 'cut'].includes(CHANGE)) { console.error(`--change must be omission|band|plug|cut, not ${CHANGE}`); process.exit(2); }
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
    } else if (CHANGE === 'cut') {
      /* THE CUT'S OWN RECORD (ruling 7, stem session 3): a row moves iff THIS
         tree's plan reports a cut MADE — the control ON, a stem present, and
         the stem longer than its own cut. The base tree has no cut and cannot
         say; this is the guard predicate the whole partition is declared
         from, read off the plan rather than the labels. A row with the
         control FLAT, or a stem too short to cut, is a HOLDER and must hold
         to the bit — which is the by-branch claim measured. */
      if (!fr.hub) continue;
      const plan = G.stemPlan(st, fr.hub, acc);
      if (plan.present && plan.cut && plan.cut.made) return true;
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
  /* THE ENVELOPE ON A NODED STEM IS THE SWOLLEN, LEANING ONE. `outerR` is the
     tube's nominal radius; under `stemNodeProminence` the rings swell to the
     plan's own `nodeMaxOuterR` (the law evaluated AT the stations the rings sit
     on, so it is exact over the emitted vertices) and their centres walk off the
     axis by up to `nodeTipOffsetMm` (the offset grows monotonically with depth,
     so the tip's is the largest). Both are the PLAN's own numbers about the
     tube, which is not the quantity this clause doubts (something OUTSIDE the
     stem moving). On a straight stem both collapse to `outerR` and 0, so the
     envelope is the one every earlier change was measured against. Measured
     before this existed: `--change cut` reported all seven `BARE NODES:` rows
     as runs reaching "outside" a radius-3 envelope at r 3.14..3.62, which is
     the node's own swelling. */
  /* AND THE SWELLING IS SAMPLED AT EACH TREE'S OWN STATIONS: `nodeMaxOuterR` is
     the law's maximum over the plan's stations, and under `--change cut` the
     branch re-places the tube's ladder over `L - span`, so the base's rings can
     sit nearer the peak than the branch's (`STEM NODES: on the widest bore`
     read r 10.2198 against the branch plan's 10.1770 — a BASE ring). The
     envelope is the larger of the two plans' own extents. */
  const stA = { ...DB, ...set };
  const planA = GB.stemPlan(stA, GB.footRing(stA, new GB.MeshBuilder({ exportMode: em })).hub,
                            new GB.MeshBuilder({ exportMode: em }));
  /* Per STATION, radius plus the axis offset THERE: the drifts of different
     nodes point in different directions, so |offset| is not monotone in depth
     and the tip's is not the largest (`STEM NODES: whorled x 8` reads a ring at
     r 12.1596 against nodeMaxOuterR + nodeTipOffsetMm = 12.1325). */
  const extentOf = (M, pl) => {
    if (!pl.nodeLaw) return pl.outerR;
    let e = 0;
    for (const sd of pl.stations) { const c = M.stemNodeAxisMm(pl.nodeLaw, sd); e = Math.max(e, M.stemNodeRadiusMm(pl.nodeLaw, sd) + Math.hypot(c[0], c[1])); }
    return e;
  };
  const ENV_R = Math.max(extentOf(G, plan), extentOf(GB, planA));
  /* THE STEM'S OWN TRIANGLE BLOCK on each stream: `buildBloomInto` emits the
     stem directly after the hub (`hubTriEnd`) and reports its tally, so the
     block is [hubTriEnd, hubTriEnd + stemBuilt.tris) on each tree. The cut-face
     clause reads ONLY this block — a leaf's petiole rooted near the tip or a
     pedicel on a short rachis is a down-facing triangle inside the cut's window
     and the tube's radius, and the first sweep summed them into the face
     (`LEAVES: the STEEP angle` 113.85 against 112.77; `INFLO: 12 nodes on a
     20 mm rachis` 32.24 against 28.19 — the pedicels). */
  const blockOf = (rep) => rep.stemBuilt ? [rep.hubTriEnd * 9, (rep.hubTriEnd + rep.stemBuilt.tris) * 9] : [0, 0];
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
  /* UNDER `--change cut` THE WALL'S TRIANGLES ARE NOT THE SAME TRIANGLES —
     the tube's ladder gains the short-point station and its last band ends on
     the plane — so bit-identity of the wall is not the claim; what IS the
     claim is in `cutFaceClause` (iv): every branch wall vertex still lies ON
     the cylinder, and none hangs below the cut plane. The two closures'
     wall-identity clause stays exactly as it was for them. */
  if (CHANGE !== 'cut') {
    const wa = wall(a), wb = wall(b);
    if (wa.length !== wb.length) return `the stem's OUTER WALL has ${wa.length} triangles on the base and ${wb.length} on the branch — the ${CHANGE} changed a surface that can be SEEN`;
    for (let i = 0; i < wa.length; i++) if (wa[i] !== wb[i]) return `a stem OUTER WALL triangle moved (${wa[i]} -> ${wb[i]}) — the ${CHANGE} moved the tube's own side, which neither closure has any business reaching`;
  }
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
  if (CHANGE === 'plug' || CHANGE === 'cut') {
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
    const inEnv = (x, y, z) => Math.hypot(x, y) <= ENV_R + 1e-6 && z <= plan.topZ + 1e-6 && z >= plan.tipZ - 1e-6;
    /* The run is walked on VERTEX boundaries: `i0` can land mid-vertex, so it is
       rounded down to a multiple of 3 and the tail up, which only ever WIDENS
       the region being checked. */
    const lo = Math.floor(i0 / 3) * 3;
    for (const [arr, len] of [[a, la], [b, lb]]) {
      const hi = Math.ceil((len - k0) / 3) * 3;
      for (let i = lo; i < hi && i + 2 < len; i += 3) {
        if (!inEnv(arr[i], arr[i + 1], arr[i + 2])) {
          return `the one contiguous run that differs reaches OUTSIDE the stem's own envelope at float ${i}: (r ${Math.hypot(arr[i], arr[i + 1]).toFixed(4)}, z ${arr[i + 2].toFixed(4)}) against a stem of radius ${ENV_R} spanning z ${plan.tipZ.toFixed(4)}..${plan.topZ.toFixed(4)} — the plug reached the head, a petal, the hub or the centre`;
        }
      }
    }
    return CHANGE === 'cut' ? cutFaceClause(a, b, plan, R, blockOf(repA), blockOf(repB)) : bottomFaceClause(a, b, plan, R);
  }
  /* (a) — compare only where the two streams align; the differing tail is the
     band's own, and its vertices are checked against the envelope. */
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 3) {
    if (Object.is(a[i], b[i]) && Object.is(a[i + 1], b[i + 1]) && Object.is(a[i + 2], b[i + 2])) continue;
    const rA = Math.hypot(a[i], a[i + 1]), rB = Math.hypot(b[i], b[i + 1]);
    const inA = rA <= ENV_R + 1e-6 && a[i + 2] <= plan.topZ + 1e-6 && a[i + 2] >= plan.tipZ - 1e-6;
    const inB = rB <= ENV_R + 1e-6 && b[i + 2] <= plan.topZ + 1e-6 && b[i + 2] >= plan.tipZ - 1e-6;
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

/* (c') — UNDER `--change cut`, THE END FACE IS THE FEATURE, AND THE FLAT
   CLAUSE ABOVE CANNOT HOLD IT (ruling 7, stem session 3). `bottomFaceClause`
   defines the end face as "the triangles all at one height", and a 45-degree
   face is at no one height: kept, it would read the LAND alone on the branch
   and call the end open on every cut stem; dropped, the one surface this
   change is about would be asserted by nothing. RE-DERIVED, NOT LOOSENED:
     (i)  the BASE's end is the flat closed disc it was (the plug landed
          before this change), read exactly as before — a tool that reads the
          wrong face reports on itself first;
     (ii) the BRANCH's end face is every stem triangle facing DOWN (its normal's
          z under -1/2: the land at -1, the 45-degree plane at -0.707, the
          wall at 0, the void's floor at +1) whose vertices all lie in the cut's
          own window, and its PROJECTED area must be the regular N-gon's — the
          same closed form the flat clause used, in projection, which a face
          missing its land fan or its plane fan cannot reach;
     (iii) THE BORE DOES NOT OPEN THROUGH THE FACE: every branch vertex on the
          bore (radius `boreR`) stands at least Eva's wall, measured SQUARE to
          the cut plane, above that plane at its own x — the plug's own law,
          read off the file rather than off the plan that asked for it. This
          is the clause `the-bore-opens-through-the-cut-face` moves, and the
          projected-area clause cannot see it (the face is intact; the void
          pierces it).
   The window and the plane are the plan's own declaration of WHERE the cut
   is; the claims are about what the file holds there. */
function cutFaceClause(a0, b0, plan, R0, blockA, blockB) {
  if (blockA[1] <= blockA[0] || blockB[1] <= blockB[0]) return 'no stem block on one of the trees — the cut-face clause has nothing to read';
  const a = Float64Array.from(a0.slice(blockA[0], blockA[1])), b = Float64Array.from(b0.slice(blockB[0], blockB[1]));
  /* ON A NODED STEM THE END IS THE TIP'S OWN RING: its radius is the law's
     `rTip` (the plan's own, carried on `cut.rTip`) and its centre is the node
     axis at the tip's depth, `stemNodeAxisMm(law, rootZ - z)` — the builder's
     own `ringAtS` mapping, restated here so every radial test below is taken
     about the ring's own centre rather than the world axis. On a straight stem
     `rTip === outerR` and the centre is [0, 0], so the straight case is the
     expression it was. */
  const C = plan.cut;
  const R = C && C.made ? C.rTip : R0;
  const centreAt = (z) => plan.nodeLaw ? G.stemNodeAxisMm(plan.nodeLaw, plan.rootZ - z) : [0, 0];
  const radiusAt = (z) => plan.nodeLaw ? G.stemNodeRadiusMm(plan.nodeLaw, plan.rootZ - z) : R0;
  const rAbout = (x, y, z) => { const c = centreAt(z); return Math.hypot(x - c[0], y - c[1]); };
  /* THE FACE'S HEIGHT IS A FUNCTION OF THE AZIMUTH, not of x: the builder's cut
     ring puts the vertex at azimuth th at `tipZ + h(th)` with
     `h = max(0, slope * rTip * (cosJ - cos th))`, and on a noded stem that
     vertex sits on ITS OWN DEPTH's ring (the law's centre and radius there),
     so the surface is only a plane where the tube is a cylinder. Taken about
     the vertex's own ring centre, `h(th)` is the same law in both cases. */
  const faceZAt = (x, y, z) => {
    if (!C || !C.made) return plan.tipZ;
    const c = centreAt(z), th = Math.atan2(y - c[1], x - c[0]);
    return plan.tipZ + Math.max(0, C.slope * R * (C.cosJ - Math.cos(th)));
  };
  const poly = (rad) => 0.5 * plan.sides * rad * rad * Math.sin(2 * Math.PI / plan.sides);
  /* The closed end's area: a flat polygon of the tip's radius on a straight
     stem, and on a noded one the shoelace area of the cut ring the law gives
     (each vertex at its own depth's centre and radius) — `restatedCutRing`'s
     own expression in the harness, restated here from the plan's law. */
  const expectedFace = () => {
    if (!plan.nodeLaw || !C || !C.made) return poly(R);
    const N = plan.sides, ring = [];
    for (let i = 0; i < N; i++) {
      const th = (i * 2 * Math.PI) / N;
      const h = Math.max(0, C.slope * R * (C.cosJ - Math.cos(Math.min(i, N - i) * (2 * Math.PI / N))));
      const z = plan.tipZ + h, c = centreAt(z), rad = radiusAt(z);
      ring.push([c[0] + rad * Math.cos(th), c[1] + rad * Math.sin(th)]);
    }
    let a2 = 0;
    for (let i = 0; i < N; i++) { const p = ring[i], q = ring[(i + 1) % N]; a2 += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a2) / 2;
  };
  const tol = 1e-6 * Math.max(1, poly(R));
  const faceAreaAt = (pos, z) => {
    let A = 0;
    for (let i = 0; i < pos.length; i += 9) {
      if (!(pos[i + 2] === z && pos[i + 5] === z && pos[i + 8] === z)) continue;
      if (rAbout(pos[i], pos[i + 1], z) > R + 1e-6) continue;
      const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1];
      const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1];
      A += Math.abs(ux * vy - uy * vx) / 2;
    }
    return A;
  };
  const gotBase = faceAreaAt(a, plan.tipZ);
  if (Math.abs(gotBase - poly(R)) > tol) return `the BASE's bottom face measures ${gotBase.toFixed(4)} mm^2 at z = ${plan.tipZ}; a closed flat disc is ${poly(R).toFixed(4)} — this tool is not reading the face it thinks it is`;
  if (!C || !C.made) return 'the plan declares no cut made on a row predeclared as a cut mover';
  const zTop = plan.tipZ + C.spanMm + 1e-9;
  const want = expectedFace();
  let projected = 0, faceTris = 0;
  const faceTriangles = [];
  for (let i = 0; i < b.length; i += 9) {
    const z0 = b[i + 2], z1 = b[i + 5], z2 = b[i + 8];
    if (z0 > zTop || z1 > zTop || z2 > zTop || z0 < plan.tipZ - 1e-9 || z1 < plan.tipZ - 1e-9 || z2 < plan.tipZ - 1e-9) continue;
    if (rAbout(b[i], b[i + 1], z0) > radiusAt(z0) + 1e-6 || rAbout(b[i + 3], b[i + 4], z1) > radiusAt(z1) + 1e-6 || rAbout(b[i + 6], b[i + 7], z2) > radiusAt(z2) + 1e-6) continue;
    const ux = b[i + 3] - b[i], uy = b[i + 4] - b[i + 1], uz = z1 - z0;
    const vx = b[i + 6] - b[i], vy = b[i + 7] - b[i + 1], vz = z2 - z0;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz);
    if (!(L > 0) || nz / L > -0.5) continue;
    projected += Math.abs(nz) / 2; faceTris++;
    faceTriangles.push([[b[i], b[i + 1], z0], [b[i + 3], b[i + 4], z1], [b[i + 6], b[i + 7], z2]]);
  }
  if (Math.abs(projected - want) > tol) return `the branch's cut face (${faceTris} down-facing triangles in the cut's window) projects to ${projected.toFixed(4)} mm^2 against a closed end's ${want.toFixed(4)} — the end does not cover the section`;
  /* (iii) THE BORE DOES NOT OPEN THROUGH THE FACE, as the DISTANCE from every
     bore vertex in the plug's window to the emitted face triangles — the
     wall Eva's 1.5 mm is a wall SQUARE TO THE FACE, and a point-to-triangle
     solve is that quantity whatever the face's shape. The first cut of this
     clause subtracted a per-azimuth plane height from the vertex's own z,
     which is exact on a cylinder and reads SHORT on a noded stem (1.65 mm on
     `BARE NODES: eight nodes on 60 mm` against a solved 3.05), because a bore
     ring's centre and the face vertex's at the same azimuth sit at different
     depths of a leaning axis. Measured, every noded row's true clearance is
     above the straight stem's own 2.34. On a straight stem with the plug put
     back to the flat 1.5 mm the floor and the face INTERSECT and this reads 0. */
  if (plan.boreR > 0 && plan.voidMm > 0) {
    const W = 1.5;
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]], dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const closest = (p, A, B, Cc) => {
      const ab = sub(B, A), ac = sub(Cc, A), ap = sub(p, A); const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return A;
      const bp = sub(p, B); const d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return B;
      const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [A[0] + ab[0] * v, A[1] + ab[1] * v, A[2] + ab[2] * v]; }
      const cp = sub(p, Cc); const d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return Cc;
      const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [A[0] + ac[0] * w, A[1] + ac[1] * w, A[2] + ac[2] * w]; }
      const va = d3 * d6 - d5 * d4; if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [B[0] + (Cc[0] - B[0]) * w, B[1] + (Cc[1] - B[1]) * w, B[2] + (Cc[2] - B[2]) * w]; }
      const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w];
    };
    const zWin = plan.tipZ + plan.tipPlugMm + C.spanMm + 1e-6;
    let worst = Infinity, probed = 0;
    for (let i = 0; i < b.length; i += 3) {
      if (b[i + 2] > zWin || b[i + 2] < plan.tipZ) continue;
      if (Math.abs(rAbout(b[i], b[i + 1], b[i + 2]) - plan.boreR) > 1e-6) continue;
      probed++;
      const p = [b[i], b[i + 1], b[i + 2]];
      for (const t of faceTriangles) { const q = closest(p, t[0], t[1], t[2]); const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < worst) worst = d; }
    }
    if (!probed) return 'no bore vertex was found in the plug window on a hollow cut stem — this clause is not reading the bore it thinks it is';
    if (worst < W - 1e-9) return `a bore vertex stands ${worst.toFixed(4)} mm from the cut face where Eva's ${W} mm wall square to the ${C.deg}-degree face asks for ${W} — the bore opens through the cut face`;
  }
  /* (iv) THE CUT REMOVED MATERIAL AND ADDED NONE: every branch vertex at the
     stem's radius stands ON or ABOVE the cut plane at its own x (the land at
     the long point, the plane everywhere else), and every differing vertex
     at that radius lies in the cut's window — the tube above the short point
     is the cylinder it was. */
  let below = 0, worstBelow = 0;
  for (let i = 0; i < b.length; i += 3) {
    if (Math.abs(rAbout(b[i], b[i + 1], b[i + 2]) - radiusAt(b[i + 2])) > 1e-6) continue;
    const planeZ = faceZAt(b[i], b[i + 1], b[i + 2]);
    if (b[i + 2] < planeZ - 1e-9) { below++; worstBelow = Math.max(worstBelow, planeZ - b[i + 2]); }
  }
  if (below) return `${below} branch vertex/vertices at the stem's radius hang up to ${worstBelow.toFixed(4)} mm BELOW the cut plane — the cut added material under the face`;
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
      const why = CHANGE === 'band' || CHANGE === 'plug' || CHANGE === 'cut' ? onlyTheStemsInteriorWent(set, em) : onlyTheOmittedWent(set, em);
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
  console.log(CHANGE === 'cut'
    ? `CLAUSE 2  movers where anything outside the stem moved, the base's end was not the flat disc, the cut face does not cover the section, or the bore opens through it: ${badOnly.length}`
    : CHANGE === 'plug'
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
    ? `\nCONTROL-ONLY OK — CLAUSE 2 reported ${badOnly.length} of ${movers * 2} (mover x mode) builds where ${CHANGE === 'band' || CHANGE === 'plug' || CHANGE === 'cut' ? 'a float OUTSIDE the stem had moved' : 'a KEPT petal had moved'}`
    : '\nCONTROL-ONLY FAILED TO FIRE — clause 2 cannot see a kept petal moving, so its PASS is not evidence');
  if (!movers) console.log('   (and there were NO MOVERS in this row set, so the control was vacuous — narrow to rows that build a stem on a sphere)');
  process.exit(fired && movers ? 0 : 1);
}
console.log(CONTROL ? (pass ? '\nCONTROL FAILED TO FIRE — the comparison cannot see a 1e-9 perturbation, so neither clause is evidence' : '\nCONTROL OK — CLAUSE 1 detected the perturbation on the holders (clause 2 is NOT exercised here — that is `--control-only`)')
                    : (pass ? (NARROWED ? '\nOK on the named rows — NOT a pass of the matrix.' : (CHANGE === 'cut'
                        ? '\nPASS — every predeclared mover moved, every holder held, and on every mover every float that went lies INSIDE the stem, its cut face covers the section and the bore stays Eva\'s wall clear of it.'
                        : CHANGE === 'plug'
                        ? '\nPASS — every predeclared mover moved, every holder held, and on every mover every float that went lies INSIDE the stem, its outer wall stayed bit-identical, and its bottom face came out a CLOSED DISC where the base had an annulus.'
                        : CHANGE === 'band'
                        ? '\nPASS — every predeclared mover moved, every holder held, and on every mover every float that went lies INSIDE the stem while its outer wall stayed bit-identical.'
                        : '\nPASS — every predeclared mover moved, every holder held, and on every mover the ONLY floats that went are the omitted petals\' own.')) : '\nFAIL'));
process.exit(CONTROL ? (pass ? 1 : 0) : (pass ? 0 : 1));
