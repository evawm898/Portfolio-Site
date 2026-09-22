/* ===================================================================
   verify-bloom-census-adjacency.mjs — IS A SHARED CORNER READ AS A FOLD?

   WHY THIS EXISTS. `tools/bloom-self-intersection.mjs` asks whether a closed
   shell passes through ITSELF, and X2 in both STL gates turns its answer into a
   verdict. Two triangles that share a vertex or an edge MEET at that feature by
   topology, and the census has always discarded such a meeting — but it decided
   which meetings to discard by DISTANCE, against an absolute bar of 1e-9 mm on
   coordinates of 20-40 mm. The segment-triangle solve's own conditioning near a
   shared corner delivers about that much error, so the bar was the solve's noise
   and the verdict sat on whichever side of it a vertex happened to fall.
   PR #278 measured 108 matrix rows whose ONLY reported intersections were that.

   The census now decides adjacency from CONNECTIVITY: a hit produced by an edge
   one of whose endpoints the other triangle also carries is discarded outright,
   because a line not parallel to a plane meets it in exactly one point and the
   shared endpoint is already such a point. The theorem and its premises are in
   that file's own header. THIS GATE IS THE WITNESS FOR IT, and it is owed
   because nothing else can see the property: the census's answer is a count, and
   a count that is too low looks exactly like a clean solid.

   WHAT IT MEASURES, in six families, and only two of them discriminate.
     CA0  WRITTEN-DOWN PAIRS — six configurations whose answer fits in a
          sentence: a shared corner and nothing else, a shared edge that is a
          book fold, a shared edge that is a flat quad's own diagonal, a
          duplicate triangle, and two crossing strangers that are two SHELLS and
          therefore cross-shell by design. THEY DO NOT DISCRIMINATE THIS CHANGE
          — every one gives the same answer on main's census as on this one,
          measured — and they are here as a regression guard for the NEXT change.
     CA1  A PLANTED REAL INTERSECTION INSIDE ONE SHELL — two faces crossing by
          0.01 mm with no corner in common, joined into one shell by a bridge
          that touches neither, and the same shell with the face lifted 0.02 mm
          clear. Two triangles that share nothing are two SHELLS, so a planted
          crossing that is not connected is a fixture testing nothing. The pair
          the hit is reported BETWEEN is named too: on a three-triangle fixture
          the right answer by accident is the same number.
     CA2  THE GUARANTEE, AND THE TWO CASES THAT SEPARATE THIS RULE FROM ITS
          ALTERNATIVES. A pair that shares a corner AND crosses elsewhere must
          still be reported — the standing guarantee a per-PAIR rule destroys.
          The same needle-shaped pair at the origin and 30 mm out, which a bar
          scaled by coordinate magnitude answers differently. And main's own
          worst pair from `FRINGE: x the buckle at 0.30 f 3`, where two
          TRANSVERSE triangles each carry an incident edge along the line where
          their planes meet: the count cannot see it and the SPAN can.
     CA3  THE ROWS OF PR #278 AND OF MAIN, as fixtures, IN TWO CLASSES — and the
          second class is what makes the set evidence rather than a tautology.
          Every within-shell pair the census counted is replayed as a standalone
          two-triangle mesh: an ARTEFACT pair must read 0 and a GENUINE one must
          still read 1. BOTH classes are load-bearing and each caught a different
          mutation: the genuine pairs are what a rule discarding on incidence
          alone loses (13 of them, on six main rows), and the artefact pairs are
          what the epsilon-widening #278 measured and rejected fails to clear
          (651 of 2196, on fourteen main rows — see the note on that mutation
          below). Only pairs sharing at least one corner can be replayed this
          way — two triangles with nothing in common are two shells — so a
          genuine crossing between strangers is CA1's fixture.
          (tools/fixtures/bloom-census-adjacency-pr278.jsonl, exported read-only
          from 17cff3a and from origin/main; none of #278's geometry is merged.)
     CA4  THE THEOREM AGAINST INDEPENDENT GROUND TRUTH — thousands of seeded
          random shared-corner pairs at the bloom's own magnitudes, scored
          against a closed-form clip of the two planes' intersection line against
          both triangles. A SOUNDNESS check, not a discriminator: main's census
          scores identically (0 missed, 0 false positive over 120,000 pairs on
          both trees), because random triangles never produce the ill-conditioned
          grazing the artefact needs. What it catches is a rule that MISSES a
          real intersection, which no count can show — and it catches two of the
          six mutations below.
     CA7  THE RULE MAY ONLY DISCARD. Every stored pair is replayed against the
          SAME census with the rule taken out, and must read no more pairs and no
          longer a span with it than without. It exists because the suite was
          once GREEN on a version of this rule that WIDENED a declared row by
          70%: the reference then was a stored number, and stored numbers move
          with the thing they are supposed to check.

   AND TWO MORE THAT ARE NOT FAMILIES OF FIXTURES:
     CA5  `--scope`: the diff against the base names only census and instrument
          files. It REFUSES an empty diff, so it cannot pass by having no
          subject.
     CA6  `--drift-from <sweep.jsonl>`: replays a recorded matrix sweep and FAILS
          on an X2 verdict flip, on any cross-shell movement, or on an
          UNDECLARED row moving its count.

   WHAT IT DOES NOT COVER, said here rather than discovered later.
     - It does NOT run the matrix. "X2 on main is unchanged row for row" is a
       measurement over 909 rows, made by `tools/bloom-census-sweep.mjs` and
       recorded in this PR's outcome doc; `--drift-from <jsonl>` replays a
       recorded sweep against this tree's census rather than re-deriving it.
     - A fixture pair is replayed ALONE, so it exercises the pair rule and NOT
       the grid, the shell partition or the span arithmetic. Those are the
       sweep's to check, and the sweep is what says the row-level counts move.
     - It is blind to a pair sharing an EDGE that lies EXACTLY in one plane and
       folds back on itself: the coplanar arm is gated on fewer than two shared
       vertices, and such a pair produces no hit for anything else to look at.
       The hole is PRE-EXISTING and this rule does not widen it — the
       transversality test keeps a NEARLY coplanar pair's hits, which is the
       whole population main ever counted there. Opening the gate is measured
       (+56 pairs on `petalCup max (1.2)` alone, 13 of the first 163 main rows)
       and is its own piece of work, named in the outcome doc.

   RUN:  node tools/verify-bloom-census-adjacency.mjs
         node tools/verify-bloom-census-adjacency.mjs --negative-control
         node tools/verify-bloom-census-adjacency.mjs --drift-from <sweep.jsonl>
         node tools/verify-bloom-census-adjacency.mjs --scope [--base origin/main]
   Exits non-zero on any failed check, on a vacuous fixture, and on a
   negative-control mutation that does not redden the checks it names.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k, d = null) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const NEG = argv.includes('--negative-control');
const ONLY_SCOPE = argv.includes('--scope');
const DRIFT_FROM = arg('--drift-from');
const BASE = arg('--base', 'origin/main');
const QUIET = argv.includes('--quiet');
const RANDOM_N = Number(arg('--random', '4000'));
const RANDOM_SEED = Number(arg('--seed', '20260922'));
/* Predeclared: what this PR exported. Raise it when a session adds rows. */
const FIXTURE_ROWS_MIN = Number(arg('--fixture-rows-min', '90'));

const FIXTURES = path.join(HERE, 'tools/fixtures/bloom-census-adjacency-pr278.jsonl');

/* THE SCOPE ALLOWLIST IS PREDECLARED, which is what makes it evidence rather
   than a claim made afterwards by the only party who could have broken it. */
const SCOPE_ALLOW = [
  'tools/bloom-self-intersection.mjs',
  'tools/bloom-harness.mjs',
  'tools/verify-bloom-census-adjacency.mjs',
  'tools/bloom-census-sweep.mjs',
  'tools/fixtures/bloom-census-adjacency-pr278.jsonl',
  'docs/bloom-census-adjacency-outcome.md',
  /* AND THE PROJECT'S OWN POINTER FILE. A rule that changes what the census
     COUNTS, and re-records 67 entries of `SELF_INTERSECTION_XFAIL` while doing
     it, is exactly the kind of thing a later session must not have to rediscover
     — so it is named here rather than quietly permitted, on the same grounds as
     the workflow below. The scope this gate exists to hold is GEOMETRY: no
     `bloom-geometry.js`, no `bloom.js`, no `bloom-registry.js`, no `flower.*`. */
  'CLAUDE.md',
  /* THE ONE FILE BEYOND THE CENSUS ITSELF, AND IT IS DELIBERATE. This repo's
     standing rule is that a gate a developer has to remember to run is not a
     safety net, so the two steps below ride in the export gate beside
     arc-stability, for arc-stability's own reasons. It is named here rather
     than quietly permitted. */
  '.github/workflows/bloom-export-watertight.yml',
];

const F = (a) => new Float64Array(a.flat(2));

/* TAKING THE RULE OUT, in one place. CA7 needs it to build its reference and the
   negative control needs it as a mutation; written twice they would drift, and
   the one that drifted would be the one nobody ran. */
const RULE_EDITS = [
  { from: `        if (!isFeature(C1[c], C1[d], T2)) {`, to: `        if (true) {` },
  { from: `        if (!isFeature(C2[c], C2[d], T1)) {`, to: `        if (true) {` },
];

/* ------------------------------------------------------------ CA0 fixtures */
/* Every one of these has its answer in its own name. `within` is the
   within-shell count; two triangles sharing nothing are two shells and are
   counted as CROSS, which is why the crossing fixtures carry a bridge. */
const A_FLAT = [[0, 0, 0], [4, 0, 0], [0, 4, 0]];          // the z = 0 reference triangle

const CA0 = [
  { id: 'shared-vertex-and-nothing-else', within: 0,
    tris: [A_FLAT, [[0, 0, 0], [6, -2, 1], [6, -3, 2]]],
    why: 'one corner in common and no crossing — the meeting IS the topology' },
  { id: 'shared-vertex-and-a-real-stab', within: 1,
    tris: [A_FLAT, [[0, 0, 0], [2, 1, -2], [2, 1, 2]]],
    why: 'one corner in common AND the free edge stabs the interior — the exclusion must not hide it' },
  { id: 'shared-edge-not-coplanar', within: 0,
    tris: [A_FLAT, [[0, 0, 0], [4, 0, 0], [0, 2, 3]]],
    why: 'two triangles hinged on an edge, planes meeting in that edge\'s own line' },
  { id: 'shared-edge-coplanar-a-flat-quad', within: 0,
    tris: [A_FLAT, [[4, 0, 0], [0, 4, 0], [4, 4, 0]]],
    why: 'the two halves of a flat quad, sharing its diagonal — ordinary mesh topology' },
  { id: 'the-same-triangle-twice', within: 0,
    tris: [A_FLAT, A_FLAT],
    why: 'a duplicate primitive shares all three corners and adds no fold' },
  { id: 'two-crossing-triangles-that-share-nothing', within: 0, cross: 1,
    tris: [A_FLAT, [[1, 1, -1], [3, 1, 1], [1, 3, 1]]],
    why: 'a real crossing, but the two are two SHELLS — the census counts it cross-shell by design, which is why CA1 carries a bridge' },
];

/* ------------------------------------------------- CA1 the planted crossing */
/* A stabs-by-0.01mm fixture that is genuinely ONE shell. The bridge shares one
   corner with each of the two and stands clear of the z = 0 plane except at the
   corner it shares with A, so it can contribute no crossing of its own. */
const CROSS_B  = [[1, 1, -0.01], [2, 1, 0.5], [1, 2, 0.5]];   // dips 0.01 mm through A
const CLEAR_B  = [[1, 1,  0.01], [2, 1, 0.5], [1, 2, 0.5]];   // the same face, lifted clear
const bridgeFor = (B) => [[0, 4, 0], B[2], [0, 6, 3]];

const CA1 = [
  { id: 'a-face-crossing-another-by-0.01mm-in-one-shell', within: 1, pair: [0, 1],
    tris: [A_FLAT, CROSS_B, bridgeFor(CROSS_B)],
    why: 'the census must still find a real interpenetration between faces that share no corner' },
  { id: 'the-same-shell-with-the-face-lifted-clear', within: 0,
    tris: [A_FLAT, CLEAR_B, bridgeFor(CLEAR_B)],
    why: 'the control: 0.02 mm of travel is the whole difference between the two' },
];

/* ------------------------------------------- CA2 the exclusion's guarantee */
/* AND THE ONE CASE THAT SEPARATES THIS RULE FROM THE BAR #278 REJECTED, which
   is the only reason this family is not just CA0 restated. Both candidates
   clear all 122 stored artefact pairs and keep all 232 stored genuine ones —
   MEASURED, not assumed — so the stored fixtures cannot tell them apart. What
   does is a real crossing that happens to land NEAR a shared corner: a bar
   scaled by coordinate magnitude swallows it, and how near is "near" then
   depends on where the object stands. The pair below is the same shape twice,
   once at the origin and once 30 mm out, and a rule that answers differently
   for the two is answering about the translation rather than the geometry. */
const needle = (o) => [
  [[o + 0, o + 0, 0], [o + 4, o + 0, 0], [o + 0, o + 4, 0]],
  [[o + 0, o + 0, 0], [o + 2e-8, o + 0, -1], [o + 0, o + 2e-8, 1]],
];
/* AND THE CASE THE DISCARD'S PREMISE IS REALLY ABOUT. Two triangles sharing one
   corner, TRANSVERSE (their normals are perpendicular here), each with an
   INCIDENT edge running along the line where their planes meet. Their
   intersection is a real 1.5 mm segment, and its far end is found by an incident
   edge and by nothing else — the free edges miss it. A rule that discards on
   incidence alone throws a genuine contact away; the shipped one asks whether
   the edge LEAVES the other plane at its far end, and this one does not. */
const EDGE_ALONG_L = [
  [[0, 0, 0], [2, 0, 0], [0, 1, 0]],        // in z = 0; its edge p->(2,0,0) is the x axis
  [[0, 0, 0], [1.5, 0, 0], [0, 0, 1]],      // in y = 0; its edge p->(1.5,0,0) is the x axis too
];
/* AND THE SAME SHAPE AS THE REAL MESH MAKES IT, taken off `main`'s own
   `FRINGE: x the buckle at 0.30 f 3` — the worst pair of that row. The two share
   ONE corner and their planes are transverse (n1.n2 = -0.9200), and each has an
   INCIDENT edge whose sine to the other plane is ~3e-15 over 1.5315 mm: the edges
   run along the line where the planes meet, so the meeting is a SEGMENT and its
   far end is a real intersection point. THE COUNT CANNOT SEE THIS — a free edge
   finds the pair either way, and it reads 1 on every version. What moves is the
   SPAN: 1.464541 mm on main and here, 0.000000 with the discard made
   incidence-only. The bar is set at 1.0 mm rather than on the figure, because a
   bar on the last bits of a transcendental would be a bar on noise; the two
   populations are 1.46 and 0.00 apart, so nothing needs a tight one. */
const FRINGE_BUCKLE_WORST_PAIR = [
  [[19.727748134118062, 27.304719130506165, 11.743799148437134], [20.90523254992156, 28.223012696846855, 12.08401832742976], [20.540794651761455, 28.014974326198598, 11.219878431973417]],
  [[19.727748134118062, 27.304719130506165, 11.743799148437134], [20.329082724870027, 27.297651647967115, 12.585773554915505], [20.905232549921564, 28.22301269684685, 12.08401832742976]],
];
const CA2 = [
  { id: 'a-real-transverse-pair-whose-incident-edges-run-along-the-planes-meeting-line', within: 1, spanAtLeast: 1.0,
    tris: FRINGE_BUCKLE_WORST_PAIR,
    why: 'main reads span 1.464541 mm here; discarding on incidence ALONE reads 0.000000 and the count does not move, so this is the one fixture that can see it' },
  { id: 'a-constructed-pair-whose-incident-edges-lie-EXACTLY-along-that-line', within: 1,
    tris: EDGE_ALONG_L,
    why: 'the written-down companion: exactly in-plane, so the parallel guard produces no hit at all and only a free edge finds the pair — which is why the real mesh, at 3e-15 off, is the discriminating fixture and this one is not' },
  { id: 'shared-vertex-and-a-real-stab', within: 1,
    tris: [A_FLAT, [[0, 0, 0], [2, 1, -2], [2, 1, 2]]],
    why: 'the standing guarantee: a pair that shares a corner AND crosses elsewhere is still reported' },
  { id: 'shared-vertex-and-nothing-else', within: 0,
    tris: [A_FLAT, [[0, 0, 0], [6, -2, 1], [6, -3, 2]]],
    why: 'its control: the same two triangles with the crossing taken away' },
  { id: 'a-crossing-1.4e-8mm-from-the-shared-corner-at-the-origin', within: 1,
    tris: needle(0),
    why: 'a free edge really does pass through the other triangle, close to the corner they share' },
  { id: 'the-same-shape-30mm-out', within: 1,
    tris: needle(30),
    why: 'THE DISCRIMINATOR — a bar scaled by coordinate magnitude reads 0 here and 1 at the origin, so it answers about where the object stands; connectivity does not move when the object does' },
];

/* ------------------------- CA4 the theorem against independent ground truth */
/* THE STRONGEST THING IN THIS FILE, and the only family that does not take the
   census's own word for anything. For two triangles sharing exactly one corner
   `p` and not coplanar, their planes meet in the single line L through `p`, so
   T1 n T2 is (L n T1) n (L n T2) — two intervals about s = 0 on that line,
   computable in closed form by clipping L against each triangle's three edges.
   The pair properly intersects iff that overlap extends away from `p` at all.
   Nothing in that derivation is the census, or a tolerance, or this PR's rule.

   The pairs are RANDOM but the stream is SEEDED, so a run is reproducible and a
   failure can be re-run. They are generated at the bloom's own magnitudes —
   corners 0-40 mm from the origin, facets 0.05-2 mm — because the defect this
   PR fixes is a function of exactly that ratio: the artefact sits ~1e-9 mm from
   a corner 20-40 mm out.

   THE BAND IS DECLARED AND THE AMBIGUOUS CASES ARE COUNTED, NOT HIDDEN. A pair
   whose true overlap is longer than CA4_CLEAR mm must be found; one whose
   overlap is exactly zero must not be; anything between is the discretisation's
   own grey zone and is reported as such rather than scored. A run in which one
   class is empty proves nothing and fails as vacuous. */
const CA4_CLEAR = 1e-6;      // mm of true overlap beyond the shared corner
const CA4_NONE  = 1e-13;     // mm below which the true overlap is nothing

const xsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const xcrs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const xdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const xlen = (a) => Math.hypot(a[0], a[1], a[2]);

/* The s-interval on P(s) = p + s*d that lies inside triangle T. Each edge gives
   one linear constraint, taken with the sign of the opposite corner so no
   winding convention is assumed. */
function clipLineToTriangle(p, d, T) {
  const n = xcrs(xsub(T[1], T[0]), xsub(T[2], T[0]));
  let lo = -Infinity, hi = Infinity;
  for (let e = 0; e < 3; e++) {
    const V0 = T[e], V1 = T[(e + 1) % 3], W = T[(e + 2) % 3];
    const m = xcrs(n, xsub(V1, V0));
    const sw = xdot(m, xsub(W, V0));
    if (sw === 0) return null;                      // degenerate triangle
    const sgn = sw > 0 ? 1 : -1;
    const f0 = sgn * xdot(m, xsub(p, V0));
    const fd = sgn * xdot(m, d);
    if (fd === 0) { if (f0 < 0) return [0, 0]; continue; }
    const s = -f0 / fd;
    if (fd > 0) lo = Math.max(lo, s); else hi = Math.min(hi, s);
  }
  return lo > hi ? [0, 0] : [lo, hi];
}

/* The true overlap length of T1 n T2 away from the shared corner. */
function trueOverlapMm(T1, T2, p) {
  const n1 = xcrs(xsub(T1[1], T1[0]), xsub(T1[2], T1[0]));
  const n2 = xcrs(xsub(T2[1], T2[0]), xsub(T2[2], T2[0]));
  let d = xcrs(n1, n2);
  const dl = xlen(d);
  if (!(dl > 0)) return null;                       // coplanar: not this family's question
  const s1 = Math.abs(xdot(n1, n2)) / (xlen(n1) * xlen(n2));
  if (s1 > 1 - 1e-12) return null;                  // near-coplanar: the arm's question, not the rule's
  d = [d[0] / dl, d[1] / dl, d[2] / dl];
  const a = clipLineToTriangle(p, d, T1), b = clipLineToTriangle(p, d, T2);
  if (!a || !b) return null;
  const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
  if (lo > hi) return 0;
  return Math.max(hi, 0) - Math.min(lo, 0) === 0 ? 0 : Math.max(Math.max(hi, 0), -Math.min(lo, 0));
}

/* A seeded stream — mulberry32. Nothing here may depend on Math.random. */
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function randomSharedVertexPairs(n, seed) {
  let s = seed; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return rng(s)(); };
  const out = [];
  while (out.length < n) {
    const p = [R() * 40, R() * 40, R() * 40];
    const scale = 0.05 + R() * 1.95;                // a bloom facet is 0.05-2 mm
    const v = () => { const k = scale * (0.2 + R()); return [(R() - 0.5) * k, (R() - 0.5) * k, (R() - 0.5) * k]; };
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const T1 = [p, add(p, v()), add(p, v())];
    const T2 = [p, add(p, v()), add(p, v())];
    out.push([T1, T2]);
  }
  return out;
}

function runRandom(SI, n, seed) {
  const pairs = randomSharedVertexPairs(n, seed);
  let mustFind = 0, mustNot = 0, grey = 0, skipped = 0, missed = 0, falsePos = 0;
  let worstMiss = 0;
  for (const [T1, T2] of pairs) {
    const L = trueOverlapMm(T1, T2, T1[0]);
    if (L === null) { skipped++; continue; }
    const got = SI.census(F([T1, T2])).within > 0;
    if (L > CA4_CLEAR) { mustFind++; if (!got) { missed++; worstMiss = Math.max(worstMiss, L); } }
    else if (L <= CA4_NONE) { mustNot++; if (got) falsePos++; }
    else grey++;
  }
  return { n, mustFind, mustNot, grey, skipped, missed, falsePos, worstMiss };
}

/* ---------------------------------------------------------------- the run */
async function loadCensus(file) {
  return import(pathToFileURL(file).href + `?t=${file.length}-${fs.statSync(file).mtimeMs}`);
}

function runFixtures(SI, list) {
  const bad = [];
  for (const f of list) {
    const r = SI.census(F(f.tris), f.pair ? { collect: true } : {});
    if (r.within !== f.within) bad.push(`${f.id}: reads ${r.within} within-shell pair(s), must be ${f.within} — ${f.why}`);
    if (f.cross !== undefined && r.cross !== f.cross) bad.push(`${f.id}: reads ${r.cross} cross-shell pair(s), must be ${f.cross}`);
    /* A COUNT IS NOT A DEPTH EITHER. Where the two populations are a whole
       millimetre apart the bar is a bar, not a tolerance. */
    if (f.spanAtLeast !== undefined && !(r.worstSpanMm >= f.spanAtLeast)) bad.push(`${f.id}: the worst span reads ${r.worstSpanMm.toFixed(6)} mm, must be at least ${f.spanAtLeast} — ${f.why}`);
    /* A COUNT IS NOT A LOCATION. On a three-triangle fixture the right answer by
       accident — the bridge reported instead of the crossing — is the same
       number, so the pair is named where it matters. */
    if (f.pair) {
      const got = (r.sites || []).map((s) => s.pair.join(','));
      if (got.length !== 1 || got[0] !== f.pair.join(',')) bad.push(`${f.id}: the hit is between triangles [${got.join('] [')}], must be exactly [${f.pair}] — the count is right and the location is not`);
    }
  }
  return bad;
}

function readFixtures() {
  if (!fs.existsSync(FIXTURES)) return null;
  return fs.readFileSync(FIXTURES, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

/* A fixture pair replayed alone. The weld is by EXACT position, so which corners
   the two have in common is recoverable from the coordinates and nothing about
   the original mesh needs storing. */
const sharedCorners = (t1, t2) => {
  let n = 0;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
    if (t1[a * 3] === t2[b * 3] && t1[a * 3 + 1] === t2[b * 3 + 1] && t1[a * 3 + 2] === t2[b * 3 + 2]) n++;
  return n;
};

/* A row may supply BOTH classes, and `petalCup max (1.2)` on main does: 32 of
   its 64 shared-corner pairs are the artefact and 32 are real crossings between
   triangles that happen to touch. That row alone is the discriminator, on the
   tree that must not drift. So the class is per PAIR, not per row. */
function runRowFixtures(SI, rows) {
  const bad = [];
  let shareless = 0, nArte = 0, nGen = 0, rowsArte = 0, rowsGen = 0;
  const hist = {};
  const look = (t1, t2) => {
    const sh = sharedCorners(t1, t2);
    hist[sh] = (hist[sh] || 0) + 1;
    if (sh === 0) shareless++;
    return SI.census(F([t1, t2])).within;
  };
  for (const row of rows) {
    const arte = row.artefact || [], gen = row.genuine || [];
    if (arte.length) rowsArte++;
    if (gen.length) rowsGen++;
    let stillFolds = 0, stoppedFolding = 0;
    for (const [t1, t2] of arte) { nArte++; if (look(t1, t2) > 0) stillFolds++; }
    for (const [t1, t2] of gen) { nGen++; if (look(t1, t2) === 0) stoppedFolding++; }
    if (stillFolds) bad.push(`CA3 artefact: "${row.label}" [${row.source}] — ${stillFolds} of ${arte.length} replayed pair(s) still read as a within-shell intersection`);
    if (stoppedFolding) bad.push(`CA3 genuine: "${row.label}" [${row.source}] — ${stoppedFolding} of ${gen.length} replayed pair(s) STOPPED reading as an intersection; these folds are real and the rule must not reach them`);
  }
  return { bad, shareless, hist, nArte, nGen, rowsArte, rowsGen, pairs: nArte + nGen };
}

/* ------------------------------------------------------------------- MAIN */
if (ONLY_SCOPE) {
  let out = '';
  try { out = execSync(`git diff --name-only ${BASE}...HEAD`, { cwd: HERE, encoding: 'utf8' }); }
  catch (e) {
    /* THE BASE MUST BE REACHABLE, AND ON A RUNNER IT USUALLY IS NOT BY DEFAULT.
       `${BASE}...HEAD` is a MERGE-BASE diff, so it needs a common ancestor in
       the clone — and `actions/checkout` takes a PR's merge ref at depth 1,
       where there is neither an origin/<base> ref nor any ancestry. That is a
       REFUSAL rather than a skip on purpose (a scope check that quietly opts
       out is the clause-with-no-subject failure), so the message names the
       remedy instead: fetch-depth 0. */
    console.log(`CA5 scope: could not diff against ${BASE} — ${e.message}`);
    console.log(`CA5 scope: the base has to be IN the clone and share an ancestor with HEAD — on a runner that means fetch-depth: 0, since a PR checkout is the merge ref at depth 1. Refusing rather than skipping: a scope check with no subject would pass on anything.`);
    process.exit(1);
  }
  const files = out.split('\n').map((s) => s.trim()).filter(Boolean);
  const stray = files.filter((f) => !SCOPE_ALLOW.includes(f));
  /* A SCOPE CHECK OVER NOTHING PASSES TRIVIALLY, which is the shape of a clause
     whose subject excludes the thing it doubts. On a PR the diff is never empty,
     so an empty one means the base is wrong or the work is uncommitted, and
     either way the answer below would be worth nothing. */
  if (!files.length) { console.log(`CA5 scope: nothing differs from ${BASE} — the check has no subject, so its PASS would be vacuous. Commit the work, or name the right base with --base.`); process.exit(1); }
  console.log(`CA5 scope — ${files.length} file(s) changed against ${BASE}:`);
  for (const f of files) console.log(`  ${SCOPE_ALLOW.includes(f) ? 'ok  ' : 'STRAY'} ${f}`);
  if (stray.length) { console.log(`\nCA5 FAIL — ${stray.length} file(s) outside the predeclared census/instrument allowlist.`); process.exit(1); }
  console.log('\nCA5 PASS — only census and instrument files moved; no geometry, no emitter, no flower.*.');
  process.exit(0);
}

/* `--census <file>` scores ANOTHER tree's census against the same fixtures and
   the same ground truth. It is how the comparison in the outcome doc was made
   and how a later reader can remake it; the default is this tree's own. */
/* A run killed mid-mutation leaves a copy behind; clear any before starting so
   a stray cannot be mistaken for source. */
for (const f of fs.readdirSync(path.join(HERE, 'tools'))) {
  if (f.startsWith('.census-mutant-') && f.endsWith('.mjs')) fs.unlinkSync(path.join(HERE, 'tools', f));
}

const SELF = arg('--census') ? path.resolve(arg('--census')) : path.join(HERE, 'tools/bloom-self-intersection.mjs');

async function checkTree(file, { label = 'this tree', quiet = false } = {}) {
  const SI = await loadCensus(file);
  const fired = new Set();
  const lines = [];
  const ca0 = runFixtures(SI, CA0); if (ca0.length) fired.add('CA0');
  const ca1 = runFixtures(SI, CA1); if (ca1.length) fired.add('CA1');
  const ca2 = runFixtures(SI, CA2); if (ca2.length) fired.add('CA2');
  const ca4 = runRandom(SI, RANDOM_N, RANDOM_SEED);
  if (ca4.missed || ca4.falsePos) fired.add('CA4');
  const rows = readFixtures();
  let ca3 = { bad: [], pairs: 0, shareless: 0, hist: {}, nArte: 0, nGen: 0, rowsArte: 0, rowsGen: 0 };
  if (rows) { ca3 = runRowFixtures(SI, rows); if (ca3.bad.length) fired.add('CA3'); }
  if (!quiet) {
    lines.push(`CA0 written-down pairs      : ${CA0.length - ca0.length}/${CA0.length} as written`);
    for (const b of ca0) lines.push(`    FAIL ${b}`);
    lines.push(`CA1 a planted crossing      : ${CA1.length - ca1.length}/${CA1.length} as written`);
    for (const b of ca1) lines.push(`    FAIL ${b}`);
    lines.push(`CA2 the guarantee + the bar : ${CA2.length - ca2.length}/${CA2.length} as written`);
    for (const b of ca2) lines.push(`    FAIL ${b}`);
    if (rows) {
      lines.push(`CA3 stored rows             : ${rows.length} (${ca3.rowsArte} carrying artefact pairs, ${ca3.rowsGen} carrying genuine ones)`);
      lines.push(`    ${ca3.nArte} pair(s) must CLEAR and ${ca3.nGen} must STILL FOLD`);
      lines.push(`    shared-corner histogram ${JSON.stringify(ca3.hist)}${ca3.shareless ? `  — ${ca3.shareless} pair(s) share NO corner` : ''}`);
      for (const b of ca3.bad.slice(0, 8)) lines.push(`    FAIL ${b}`);
      if (ca3.bad.length > 8) lines.push(`    ... and ${ca3.bad.length - 8} more`);
    } else lines.push(`CA3 the rows of PR #278     : SKIPPED — ${path.relative(HERE, FIXTURES)} is not present`);
    lines.push(`CA4 against ground truth    : ${ca4.n} random shared-corner pair(s), seed ${RANDOM_SEED}`);
    lines.push(`    ${ca4.mustFind} must be found (missed ${ca4.missed}${ca4.missed ? `, worst true overlap ${ca4.worstMiss.toExponential(3)} mm` : ''}) · ${ca4.mustNot} must not be (false positives ${ca4.falsePos})`);
    lines.push(`    ${ca4.grey} in the grey band between ${CA4_NONE} and ${CA4_CLEAR} mm, not scored · ${ca4.skipped} coplanar or degenerate, this family's own scope`);
  }
  return { fired, lines, ca3, rows, ca4 };
}

if (!NEG) {
  const { fired, lines, ca3, rows, ca4 } = await checkTree(SELF);
  for (const l of lines) console.log(l);

  /* CA7 — THE RULE MAY ONLY EVER DISCARD, AND THAT IS CHECKED RATHER THAN
     ASSERTED. It is written to remove candidate points and never to add one, so
     on every pair the shipped census's count and span must be at most what the
     census reads with the rule taken out. This clause exists because the suite
     was once GREEN on a version of the rule that WIDENED the census by 70% on a
     declared row: the arm's gate had become a tautology, every family passed,
     and a count comparison against a stored number could not see it because the
     stored numbers moved with it. Here the reference is built from the SAME
     source with the rule removed, so a widening has nowhere to hide. */
  const bad = [];
  if (rows) {
    const src0 = fs.readFileSync(SELF, 'utf8');
    const edits = RULE_EDITS;
    const misAnchored = edits.filter((e) => src0.split(e.from).length - 1 !== 1);
    if (misAnchored.length) {
      bad.push('CA7: the rule could not be located to remove it, so monotonicity is unchecked');
    } else {
      const tmp = path.join(HERE, 'tools/.census-norule.mjs');
      fs.writeFileSync(tmp, edits.reduce((t, e) => t.replace(e.from, e.to), src0));
      const SI = await loadCensus(SELF);
      let widerCount = 0, widerSpan = 0, pairs = 0;
      try {
        const NR = await loadCensus(tmp);
        for (const row of rows) for (const [t1, t2] of [...(row.artefact || []), ...(row.genuine || [])]) {
          pairs++;
          const m = F([t1, t2]);
          const a = SI.census(m), b = NR.census(m);
          if (a.within > b.within) widerCount++;
          if (a.worstSpanMm > b.worstSpanMm) widerSpan++;
        }
      } finally { fs.unlinkSync(tmp); }
      console.log(`CA7 the rule only discards  : ${pairs} stored pair(s) replayed against the same census with the rule removed — ${widerCount} read MORE pairs, ${widerSpan} read a LONGER span (both must be 0)`);
      if (widerCount) bad.push(`CA7: ${widerCount} stored pair(s) read as an intersection WITH the rule and not without it — the rule is adding, and it is written only to remove`);
      if (widerSpan) bad.push(`CA7: ${widerSpan} stored pair(s) read a LONGER span with the rule than without it`);
      if (!pairs) bad.push('CA7: no stored pair to replay, so monotonicity is unchecked');
    }
  }

  /* VACUITY. A fixture that would read 0 even with the rule removed proves
     nothing, and a pair sharing no corner cannot be in one shell at all. */
  if (rows) {
    if (ca3.shareless) bad.push(`CA3 vacuity: ${ca3.shareless} stored pair(s) share NO corner — such a pair is two shells and can never read within-shell, so it tests nothing`);
    if (!ca3.pairs) bad.push('CA3 vacuity: the fixture file holds no pairs');
    if (!ca3.nGen) bad.push('CA3 vacuity: the fixture set carries no GENUINE pair — a set of pairs that must all CLEAR cannot tell this rule from the epsilon widening that was rejected, because that one clears them too');
    if (!ca3.nArte) bad.push('CA3 vacuity: the fixture set carries no ARTEFACT pair');
    /* THE SET'S OWN SIZE IS DECLARED, so shrinking it is a red rather than a
       quieter run. Predeclared from the sweep that built it. */
    if (rows.length < FIXTURE_ROWS_MIN) bad.push(`CA3: the fixture file holds ${rows.length} row(s), fewer than the ${FIXTURE_ROWS_MIN} this PR exported — a fixture set that shrank is a gate that got weaker without saying so`);
  }
  if (!ca4.mustFind || !ca4.mustNot) {
    bad.push(`CA4 vacuity: the random stream produced ${ca4.mustFind} pair(s) that must be found and ${ca4.mustNot} that must not — a run with either class empty scores nothing`);
  }

  if (DRIFT_FROM) {
    const raw = fs.readFileSync(DRIFT_FROM, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    /* DEDUPE BY LABEL AND REFUSE A DISAGREEMENT. The sweep's out file is
       appended and resumable, so two shards can write one row twice; counting
       it twice inflates every population below, and a duplicate that DISAGREES
       is a hard failure because the census is deterministic. The sweep's own
       report does this; a replay that did not would report a different number
       for the same file. */
    const byLabel = new Map(); const disagreed = [];
    for (const r of raw) {
      const was = byLabel.get(r.label);
      if (was === undefined) { byLabel.set(r.label, r); continue; }
      if (JSON.stringify(was) !== JSON.stringify(r)) disagreed.push(r.label);
    }
    const recs = [...byLabel.values()];
    const dupes = raw.length - recs.length;
    const cen = recs.filter((r) => r.a && r.b);
    const verdict = (r, side) => r[side].within > 0 && !r.declared;
    const flipped = cen.filter((r) => verdict(r, 'a') !== verdict(r, 'b'));
    const moved = cen.filter((r) => r.a.within !== r.b.within);
    const crossMoved = cen.filter((r) => r.a.cross !== r.b.cross);
    console.log(`\nCA6 drift, replayed from ${path.basename(DRIFT_FROM)} — ${recs.length} row(s) (${dupes} repeated line(s) deduped, ${disagreed.length} disagreeing), ${cen.length} censused`);
    console.log(`    X2 VERDICT changed on : ${flipped.length}`);
    for (const r of flipped.slice(0, 20)) console.log(`      ${verdict(r, 'a') ? 'fired' : 'silent'} -> ${verdict(r, 'b') ? 'fires' : 'silent'}  ${r.label}`);
    console.log(`    CROSS-shell count moved on : ${crossMoved.length}`);
    console.log(`    within-shell COUNT moved on : ${moved.length} row(s) (X1's business, not X2's — re-recorded in the same commit)`);
    /* IT MUST BE ABLE TO FAIL. A replay that only PRINTS its findings is a log
       line, and this repo's own rule is that a self-check which does not abort
       is not a self-check. */
    if (!cen.length) bad.push(`CA6: ${path.basename(DRIFT_FROM)} holds no censused row — a replay over nothing is not a replay`);
    if (disagreed.length) bad.push(`CA6: ${disagreed.length} row(s) appear twice in the sweep and DISAGREE — the census is deterministic, so that is a defect in the reading: ${disagreed.slice(0, 3).join(', ')}`);
    if (flipped.length) bad.push(`CA6: ${flipped.length} row(s) changed their X2 verdict in the replayed sweep`);
    if (crossMoved.length) bad.push(`CA6: ${crossMoved.length} row(s) moved their cross-shell count, which this rule cannot reach`);
    if (moved.some((r) => !r.declared)) bad.push(`CA6: ${moved.filter((r) => !r.declared).length} UNDECLARED row(s) moved their count — a finding, not a re-record`);
  }

  for (const b of bad) console.log(`FAIL ${b}`);
  const ok = fired.size === 0 && bad.length === 0;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} — ${ok ? 'a shared corner is read as topology and a real fold is still read as a fold.' : `${[...fired].join(', ')}${bad.length ? ' + vacuity' : ''}`}`);
  process.exit(ok ? 0 : 1);
}

/* ------------------------------------------------------- negative control */
/* Each mutation NAMES the families it must redden. A mutation that reddens a
   family it did not name is as much a failure as one that reddens nothing —
   that is how a mutation which merely breaks the module gets caught wearing a
   defect's coat. The anchors are checked for ALL mutants before any runs,
   because a refactor disarms a mutant either by moving its `from` or by making
   it match twice, and the one nobody sees is inside a mutant a subset skipped. */
const MUTANTS = [
  { id: 'adjacency-rule-removed', breaks: ['CA3'],
    why: 'the rule is what clears the artefact pairs; with it gone every stored one must read as an intersection again',
    edits: RULE_EDITS },

  { id: 'adjacency-rule-is-per-pair', breaks: ['CA0', 'CA2', 'CA3', 'CA4'],
    why: 'the blanket "skip a pair that shares a vertex" the census header has warned against since session 35 — it also hides a pair that shares a corner AND crosses elsewhere',
    from: `        if (!sa && !sb) return false;
        if (sa && sb) return true;
        return offPlane(sa ? b.p : a.p, T);`,
    to: `        return true;` },

  { id: 'adjacency-rule-reads-one-endpoint', breaks: ['CA3'],
    why: 'an edge is the shared feature\'s at EITHER end; reading only the first leaves half the artefacts',
    from: `        const sa = sharedIdx.has(a.v), sb = sharedIdx.has(b.v);`,
    to: `        const sa = sharedIdx.has(a.v), sb = false;` },

  /* CA3 is collateral it is ALLOWED and REQUIRED to cause, and it is the
     measurement that says the fixture set is evidence: with main's own moved
     rows stored, this mutation silently loses 13 genuine pairs across six of
     them (five FRINGE rows and the stamens' apex corner). The mutation is not
     subtle on a span and is invisible on a count, which is why CA2 carries a
     SPAN fixture for it and CA3 carries real rows. */
  { id: 'the-discard-ignores-transversality', breaks: ['CA2', 'CA3'],
    why: 'discarding on incidence ALONE throws away a real segment of contact, because an incident edge that lies along the two planes\' meeting line does not meet the other triangle at the corner — it meets it all the way along',
    from: `        return offPlane(sa ? b.p : a.p, T);`,
    to: `        return true;` },

  /* NOT a mutation of how the shared SET is gathered: that is a set of three
     indices either way, so reading it in the emitted order rather than the
     sorted one is a genuine no-op and was measured as one. What can really go
     wrong is the PAIRING — the edge is taken from the SORTED corners and its
     indices must come from the same place. */
  { id: 'the-edge-is-sorted-and-its-indices-are-not', breaks: ['CA3', 'CA4'],
    why: 'tri() sorts a triangle\'s corners by coordinate for winding-invariance; testing the sorted edge against the EMITTED corner\'s index asks about a different edge',
    edits: [
      { from: `        if (!isFeature(C1[c], C1[d], T2)) {`, to: `        if (!isFeature({ v: vidx[i*3+c], p: C1[c].p }, { v: vidx[i*3+d], p: C1[d].p }, T2)) {` },
      { from: `        if (!isFeature(C2[c], C2[d], T1)) {`, to: `        if (!isFeature({ v: vidx[j*3+c], p: C2[c].p }, { v: vidx[j*3+d], p: C2[d].p }, T1)) {` },
    ] },

  /* THE ROUTE #278 MEASURED AND REJECTED, kept here as a mutation so the
     difference between the two is a red line rather than a paragraph. AN
     EARLIER VERSION OF THIS COMMENT CLAIMED IT CLEARS EVERY STORED ARTEFACT
     PAIR AND THAT CA3 STAYS GREEN UNDER IT, and that was true of #278's rows
     alone and is FALSE once main's own moved rows are stored: it leaves 651 of
     2196 artefact pairs still reading as a fold, on fourteen rows, 572 of them
     on `DEPTH: 6 turns x layerSize min x petalCount 40`. The mechanism is
     measured and is why no bar can do this job — the ill-conditioned solve does
     not place its phantom point NEAR the shared corner, it places it anywhere
     along the incident edge: over the 666 surviving hits the distance from the
     nearest shared corner runs 1.0e-9 mm to 2.0933 mm, median 1.3e-8, with 80
     past 1e-5 mm and 40 past 0.1 mm. A bar wide enough to clear the worst of
     them would bar every real crossing within two millimetres of a corner. So
     this mutation reddens CA2 (translation dependence, the discriminator that
     holds even on #278's own rows) AND CA3 (it does not do the job). */
  { id: 'the-discard-bar-is-widened-instead', breaks: ['CA2', 'CA3'],
    why: 'scaling the metric bar by coordinate magnitude answers about where the object stands, and does not clear the artefact anyway: the phantom point sits anywhere along the incident edge, up to 2.09 mm from the shared corner',
    edits: [
      ...RULE_EDITS,
      { from: `  for (const S of shared) if (Math.hypot(P[0] - S[0], P[1] - S[1], P[2] - S[2]) <= PT_EPS) return true;`,
        to: `  const PT_REL = PT_EPS * Math.max(1, Math.abs(P[0]), Math.abs(P[1]), Math.abs(P[2]));
  for (const S of shared) if (Math.hypot(P[0] - S[0], P[1] - S[1], P[2] - S[2]) <= PT_REL) return true;` },
    ] },
];

const src = fs.readFileSync(SELF, 'utf8');
const editsOf = (m) => m.edits || [{ from: m.from, to: m.to }];
const applyEdits = (text, m) => editsOf(m).reduce((t, e) => t.replace(e.from, e.to), text);
let anchorBad = 0;
for (const m of MUTANTS) for (const e of editsOf(m)) {
  const n = src.split(e.from).length - 1;
  if (n !== 1) { console.log(`ANCHOR ${m.id}: a find-string matches ${n} time(s), must be exactly 1 — the mutant is disarmed`); anchorBad++; }
}
if (anchorBad) { console.log(`\nnegative control FAIL — ${anchorBad} mutant anchor(s) do not match exactly once.`); process.exit(1); }
console.log(`anchors: ${MUTANTS.length}/${MUTANTS.length} match exactly once\n`);

const base = await checkTree(SELF, { quiet: true });
if (base.fired.size) { console.log(`negative control FAIL — the UNMUTATED tree already reddens ${[...base.fired].join(', ')}; nothing below means anything.`); process.exit(1); }
if (!base.rows) { console.log('negative control FAIL — the fixture file is absent, so CA3 cannot be exercised.'); process.exit(1); }

let fails = 0;
for (const m of MUTANTS) {
  const tmp = path.join(HERE, `tools/.census-mutant-${m.id}.mjs`);
  fs.writeFileSync(tmp, applyEdits(src, m));
  let fired;
  try { ({ fired } = await checkTree(tmp, { quiet: true })); }
  finally { fs.unlinkSync(tmp); }
  const want = new Set(m.breaks);
  const missed = [...want].filter((f) => !fired.has(f));
  const extra = [...fired].filter((f) => !want.has(f));
  const ok = !missed.length && !extra.length;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${m.id.padEnd(42)} claims ${[...want].join(',').padEnd(9)} fired ${[...fired].join(',') || '(nothing)'}`);
  if (missed.length) console.log(`       MISSED (stayed green): ${missed.join(', ')} — ${m.why}`);
  if (extra.length) console.log(`       UNCLAIMED (also red)  : ${extra.join(', ')}`);
}
console.log(fails
  ? `\nnegative control FAIL — ${fails} of ${MUTANTS.length} mutant(s) did not behave.`
  : `\nnegative control PASS — every mutation reddens exactly the families it names, and the clean tree is silent on all of them.`);
process.exit(fails ? 1 : 0);
