/* ===================================================================
   bloom-texture-ribs.js — RIBS: RADIAL SPOKE RIBBING, THE THIRD TEXTURE
   CHOICE. PROTOTYPE.

   NOT SHIPPED, AND IT TOUCHES NO SHIPPED FILE. Read
   docs/bloom-surface-texture-ribs.md before changing anything here.

   Eva's rulings of Nov 9 (in force here):
     - RIBS is a third choice, NONE / BONE / RIBS, one at a time, never
       layered with BONE;
     - radial spokes about the bloom's axis, ONE shared world field: petals,
       sepals, leaves, the hub and the stem all read the same spokes, and on
       the stem (which runs down the axis) they become vertical flutes;
     - the profile has SHARP CRESTS;
     - coverage everywhere VISIBLE (no BONE patch islands);
     - spacing: RENDER BOTH and she rules from the sheet —
         A  a FIXED spoke count, fanning: the spacing widens with radius;
         B  CONSTANT spacing: new ribs begin partway out, so the arc spacing
            stays near-constant (branching);
       and each must say how it handles the axis on the hub top.
   And the texture rulings in force for every pattern: attachment B (the
   field sampled inside the emitters, the shipped relief pass), OUTWARD ONLY,
   peak-to-valley height 0.4-2.5 mm, visible surfaces only, T5's coverage and
   owner rules, exclusive with the infill, ships OFF as a choice, the one
   EXPORT_TRI_CAP, engine-agreed arithmetic in anything that decides geometry.

   THIS MODULE IS FOUR THINGS, ONE OWNER EACH:
     (1) `ribParams(state)` — the controls as the prototype reads them (every
         range and default a PROPOSAL, §7 of the doc);
     (2) `ribField(params)` — the field: `F(p)` in [0, 1] (1 a crest, 0 the
         sheet), a function of the point's (x, y) about the bloom axis only,
         and `lines`, the SAME schedule's crest / flank lines for the mesher
         (one schedule, two readers: a mesher that re-derived the crests would
         agree with a broken field by being broken alongside it);
     (3) the CREST-LINE CUTTER — every crest (and, in the 'crest+flank' mode,
         every quarter-pitch line) is a vertical HALF-PLANE through the axis,
         so its trace on an organ is where the organ's lattice crosses that
         half-plane: each lattice edge is cut where it crosses, each lattice
         triangle is split along the chords, conforming by construction (a
         cut point is a function of its EDGE alone);
     (4) the patched copy of the shipped geometry, with a hook: the RIBS field
         replaces BONE's field and patch mask inside the shipped relief pass
         (so the masks, the visibility, the coverage and the derived owner are
         the shipped ones, decided on the shipped lattice), and the cutter
         re-meshes each organ's run after the shipped write.

   ENGINE AGREEMENT. The field and the cutter use + - * /, Math.sqrt,
   Math.floor and Math.round only (all correctly rounded / exact in IEEE), an
   arithmetic `eatan2` written here and the shipped arithmetic `esincos`. No
   Math.atan2 / cos / sin / exp / log / hypot / pow decides anything here; the
   gate (R5) refuses them in the decision code by name.
   =================================================================== */
import { esincos, TEXTURE_EDGE_MM, TEXTURE_HEIGHT_RANGE } from './bloom-geometry.js';

/* ---------------------------------------------------------- controls --- */
/* PROPOSED (Eva's to rule, §7 of the doc). */
export const RIB_LAWS = Object.freeze(['A', 'B']);
export const RIB_AXIS_RULES = Object.freeze(['fade', 'start', 'thin']);
export const RIB_STARBURST_REACH = Object.freeze(['edge', 'hub']);
/* THE CENTRE TREATMENTS (Eva, Nov 9): rendered all three for her ruling */
export const RIB_CENTRES = Object.freeze(['collar', 'starburst', 'concentric']);
/* THE ORGANS (Eva's NAMED exclusion, Nov 9 — distinct from the derived
   visibility and curvature rules): ribs on the petals, sepals, leaves and the
   hub's TOP; never on the stem or any rod (stamens, style, braid strands,
   pedicels — a floret's stem — petioles, leaflet stalks). By organ NAME and the
   pass's own rod flag, so a new rod organ must be added here. */
export const RIB_EXCLUDED_ORGANS = Object.freeze(['stem', 'stamen', 'style', 'petiole', 'stalk']);
export function ribExcluded(O, i) {
  if (O.rod || RIB_EXCLUDED_ORGANS.includes(O.organ)) return true;
  /* the hub: its TOP only — a vertex whose own normal faces down or sideways is excluded */
  if (O.organ === 'hub') return !(O.N[i * 3 + 2] > 0);
  return false;
}
export const RIB_SPACING_RANGE = Object.freeze([1.6, 8]);     // mm: A's spacing AT the reference radius, B's target spacing
export const RIB_SPACING_DEFAULT = 2.5;
export const RIB_CREST_RANGE = Object.freeze([0, 0.5]);       // crest rounding, a fraction of the half-pitch; 0 = SHARP (the ruled default)
export const RIB_CREST_DEFAULT = 0;
export const RIB_HEIGHT_DEFAULT = 0.4;
/* A's spokes are counted at this radius: K = round(2 pi R / spacing). The
   petals of the shipped default span ~9-45 mm from the axis; 20 mm is the
   discovery prototype's own reference (RIB_REF_RADIUS_MM there) — a question. */
export const RIB_REF_RADIUS_MM = 20;
/* the smallest spacing a rib may have before the axis rule acts: FOUR shipped
   lattice edges (T3's floor for a feature, 1.6 mm at the 0.4 mm edge) —
   derived from the lattice, never typed per law */
export const RIB_SPACING_FLOOR_MM = 4 * TEXTURE_EDGE_MM;
/* the fewest spokes a branching schedule keeps (B always; A under 'thin') */
export const RIB_MIN_SPOKES = 4;
/* a new rib (B's branching, A's thinning) grows from the flute's floor to
   full height over this many of the ASKED spacings, outward */
export const RIB_EMERGE_K = 1;
/* the 'flank' lines of the crest+flank mesher: lines every 1/RIB_FLANK_LINES
   of a pitch (4: the crest, the two half-flanks, the valley) */
export const RIB_FLANK_LINES = 4;
/* a cut point within this of an edge's end is not inserted (the end is then
   on the line to within it): 3 um, BONE v2's own BONE2_HY_SNAP_MM */
export const RIB_SNAP_MM = 3e-3;

const clampTo = (x, r) => (x < r[0] ? r[0] : x > r[1] ? r[1] : x);
export function ribParams(state = {}) {
  const law = String(state.ribLaw ?? 'A');
  if (!RIB_LAWS.includes(law)) throw new Error(`ribLaw ${JSON.stringify(state.ribLaw)} is not one of ${RIB_LAWS.join(' / ')}`);
  const axis = String(state.ribAxis ?? 'fade');
  if (!RIB_AXIS_RULES.includes(axis)) throw new Error(`ribAxis ${JSON.stringify(state.ribAxis)} is not one of ${RIB_AXIS_RULES.join(' / ')}`);
  if (law === 'B' && axis === 'thin') throw new Error("ribAxis 'thin' is B's own law (it halves inward by construction); B takes 'fade' or 'start' for its last level");
  /* THE CENTRE (Eva, Nov 9, on #541): how the ribs end at the hub. When asked,
     it decides the axis: STARBURST is A's thinning (B thins by definition, and
     fades its last 4 spokes); COLLAR and CONCENTRIC end the ribs at a DERIVED
     ring (`ribField`'s setCentre) and take the plain schedule outside it. */
  const centre = state.ribCentre == null ? null : String(state.ribCentre);
  if (centre !== null && !RIB_CENTRES.includes(centre)) throw new Error(`ribCentre ${JSON.stringify(state.ribCentre)} is not one of ${RIB_CENTRES.join(' / ')}`);
  /* THE STARBURST REACHES THE EDGE (Eva, Nov 9, third round: "starburst but have
     it go further along the center closer to the edges"): the hub top is
     ribbed to its own rim, over the petal feet that sit flush with it, with no
     coverage fade (edits 7), so the burst fills the whole centre disc out to
     where the blades rise. 'hub' is the second round's starburst (the ribs
     faded out ~1.9 mm inside the feet's inner edge), kept for the before/after. */
  const reach = centre === 'starburst' ? String(state.ribStarburstReach ?? 'edge') : 'hub';
  if (!RIB_STARBURST_REACH.includes(reach)) throw new Error(`ribStarburstReach ${JSON.stringify(state.ribStarburstReach)} is not one of ${RIB_STARBURST_REACH.join(' / ')}`);
  const axisUsed = centre === 'starburst' ? (law === 'A' ? 'thin' : 'fade') : centre ? 'fade' : axis;
  const s = clampTo(Number(state.ribSpacing ?? RIB_SPACING_DEFAULT), RIB_SPACING_RANGE);
  const crest = clampTo(Number(state.ribCrest ?? RIB_CREST_DEFAULT), RIB_CREST_RANGE);
  const H = clampTo(Number(state.textureHeight ?? RIB_HEIGHT_DEFAULT), TEXTURE_HEIGHT_RANGE);
  return { law, axis: axisUsed, centre, reach, s, crest, H, sMin: RIB_SPACING_FLOOR_MM, refR: RIB_REF_RADIUS_MM, edgeMm: TEXTURE_EDGE_MM };
}

/* ------------------------------------------ engine-agreed arithmetic --- */
export const RIB_TAU = 2 * Math.PI;
const HALF_PI = Math.PI / 2;
/* atan on [0, 1]: two exact half-angle reductions (t / (1 + sqrt(1 + t^2)),
   sqrt correctly rounded) to |t| <= tan(pi/16) = 0.199, then the series to
   t^25 by Horner (the truncation is under 1e-19) */
function eatanUnit(t) {
  t = t / (1 + Math.sqrt(1 + t * t));
  t = t / (1 + Math.sqrt(1 + t * t));
  const y = t * t;
  let a = 1 / 25;
  for (let k = 23; k >= 1; k -= 2) a = 1 / k - y * a;
  return 4 * t * a;
}
/* the angle of (x, y) about the axis in [0, 2 pi), arithmetic only */
export function eatan2(y, x) {
  const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
  if (ax === 0 && ay === 0) return 0;
  let a = ay <= ax ? eatanUnit(ay / ax) : HALF_PI - eatanUnit(ax / ay);
  if (x < 0) a = Math.PI - a;
  if (y < 0) a = -a;
  return a < 0 ? a + RIB_TAU : a;
}
const smoother = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));

/* --------------------------------------------------------- the field --- */
/* THE SCHEDULE: how many spokes stand at radius r, and where new ones begin.
   A count is always n0 x 2^L; level L begins at rStart[L] (rStart[0] = 0),
   and its new ribs (the odd ones of its grid) grow over emerge mm.
     A (fade / start): one level, K = round(2 pi refR / s), never fewer than 4.
     A (thin):  K rounded to 4 x 2^M; going INWARD, every other spoke ends
                where the spacing would fall under sMin (level L's spokes
                exist from n_L sMin / 2 pi outward), down to 4.
     B:         4 x 2^L, unbounded; level L begins where its spacing is s/sqrt2,
                so the spacing runs s/sqrt2 .. s sqrt2 (geometric mean s).
   THE AXIS RULE acts on the innermost level, inside r0 = n0 sMin / 2 pi (where
   its spacing reaches the floor): 'fade' eases the height to 0 between r0/2
   and r0; 'start' holds the ribs at full height to r0 and drops them over one
   lattice edge inside it; 'thin' is A's inward halving (above) and then a fade
   on its last 4 spokes. */
export function ribSchedule(params) {
  const { law, axis, s, sMin, refR } = params;
  let n0, levels;          // levels: [{ n, rStart }], ascending rStart, levels[0].rStart = 0
  if (law === 'A' && axis !== 'thin') {
    const K = Math.max(RIB_MIN_SPOKES, Math.round((RIB_TAU * refR) / s));
    n0 = K; levels = [{ n: K, rStart: 0 }];
  } else if (law === 'A') {
    const K = Math.max(RIB_MIN_SPOKES, Math.round((RIB_TAU * refR) / s));
    /* K rounded to 4 x 2^M: the power of two nearest K / 4 (by doubling, an integer comparison) */
    let M = 0; while ((RIB_MIN_SPOKES * (2 << M)) * (RIB_MIN_SPOKES * (2 << M)) <= 2 * K * K) M++;   // the next power stays within sqrt2 of K
    n0 = RIB_MIN_SPOKES; levels = [{ n: n0, rStart: 0 }];
    for (let L = 1; L <= M; L++) { const n = n0 * (1 << L); levels.push({ n, rStart: (n * sMin) / RIB_TAU }); }
  } else {
    n0 = RIB_MIN_SPOKES; levels = [{ n: n0, rStart: 0 }];
    for (let L = 1; L <= 24; L++) { const n = n0 * (1 << L); levels.push({ n, rStart: (n * s) / (RIB_TAU * Math.SQRT2) }); }
  }
  const r0 = (n0 * sMin) / RIB_TAU;
  const emerge = RIB_EMERGE_K * s;
  const rule = axis === 'thin' ? 'fade' : axis;
  /* the radius inside which the field is exactly 0 */
  const rCut = rule === 'fade' ? r0 / 2 : Math.max(0, r0 - params.edgeMm);
  return { law, axis, rule, n0, levels, r0, rCut, emerge, nMax: levels[levels.length - 1].n };
}
export function levelAt(S, r) {
  let L = 0;
  while (L + 1 < S.levels.length && S.levels[L + 1].rStart <= r) L++;
  return L;
}
/* the profile across a pitch: u = 0 a crest, 1 the valley between two.
   SHARP: g = (1 - u)^2 — concave flutes meeting at a sharp arris (the slope
   at the crest is -2 in u, finite and nonzero: a kink, never a cusp). A
   crest rounding w > 0 replaces u < w by the parabola matching g and g' at w
   with zero slope at the crest, renormalised so the crest is still 1. */
export function ribProfile(u, w) {
  if (!(w > 0) || u >= w) { const g = (1 - u) * (1 - u); return w > 0 ? g / (1 - w) : g; }
  const gw = (1 - w) * (1 - w), dg = -2 * (1 - w);
  return (gw + (dg * (u * u - w * w)) / (2 * w)) / (1 - w);
}
/* u at level n for the angle th: the distance to the nearest crest, in units
   of half a pitch */
function uAt(n, th) {
  const ph = (n * th) / RIB_TAU;
  const d = ph - Math.floor(ph + 0.5);
  return 2 * (d < 0 ? -d : d);
}
export function ribField(params) {
  const S = ribSchedule(params);
  const w = params.crest;
  /* THE CENTRE, its radius DERIVED at the start of the relief pass from the
     organs the pass is handed (setCentre) — never typed:
       R = max(r0, rFeet): r0 the radius where the plain schedule's spacing
       reaches the 1.6 mm floor (A: 12.73 mm at 2.5 mm; B: 1.02 mm), rFeet the
       petal feet's INNER EDGE (the least distance from the axis of any petal
       vertex: where the petals stop covering the hub top). So A's ring stands
       where A can no longer print its spokes, B's where the hub's visible disc
       begins. Snapped to 2^-20 mm (a cut is decided on it).
     COLLAR: a soft raised ring of half-width wC (the floor spacing, 1.6 mm) at
       R, (1 - (d/wC)^2)^2; the ribs rise out of its outer flank over wC; the
       disc inside R - wC is smooth.
     CONCENTRIC: the ribs end at a sharp ring crest at R; inside, concentric
       ridges every sc (the floor spacing — the finest the print floor
       admits), the same sharp profile, faded to 0 inside sc/2 of the axis. */
  const C = { type: params.centre === 'collar' || params.centre === 'concentric' ? params.centre : null, R: null, wC: RIB_SPACING_FLOOR_MM, sc: RIB_SPACING_FLOOR_MM, rFeet: null, rFloor: S.r0, from: null };
  const setCentre = (organs) => {
    if (!C.type) return;
    let m = Infinity;
    for (const O of organs) if (O.organ === 'petal') for (let i = 0; i < O.P.length; i += 3) { const x = Math.round(O.P[i] * RIB_QUANT) / RIB_QUANT, y = Math.round(O.P[i + 1] * RIB_QUANT) / RIB_QUANT, r = Math.sqrt(x * x + y * y); if (r < m) m = r; }
    C.rFeet = Number.isFinite(m) ? m : 0;
    const R = C.rFeet > S.r0 ? C.rFeet : S.r0;
    C.R = Math.round(R * RIB_QUANT) / RIB_QUANT;
    C.from = C.rFeet > S.r0 ? 'the petal feet\'s inner edge' : 'where the spacing reaches the 1.6 mm floor';
  };
  const circles = () => { if (C.type !== 'concentric') return []; const out = []; for (let j = 0; C.R - j * C.sc > C.sc / 2; j++) out.push(C.R - j * C.sc); return out; };
  /* the spokes alone at (th, r): the schedule's level and its emergence */
  const ribsAt = (th, r) => {
    const L = levelAt(S, r);
    let f = ribProfile(uAt(S.levels[L].n, th), w);
    if (L > 0) {
      const a = smoother((r - S.levels[L].rStart) / S.emerge);
      if (a < 1) f = (1 - a) * ribProfile(uAt(S.levels[L - 1].n, th), w) + a * f;
    }
    return f;
  };
  const centreF = (x, y, r) => {
    if (C.R === null) throw new Error(`ribs: the ${C.type} centre's radius was never derived (setCentre is called at the start of the relief pass)`);
    const R = C.R;
    if (C.type === 'collar') {
      if (!(r > R - C.wC)) return 0;
      const d = (r - R) / C.wC, ring = d > -1 && d < 1 ? (1 - d * d) * (1 - d * d) : 0;
      const ribs = r > R ? ribsAt(eatan2(y, x), r) * smoother((r - R) / C.wC) : 0;
      return ring > ribs ? ring : ribs;
    }
    if (r < R) {
      const q = (R - r) / C.sc, dq = q - Math.floor(q + 0.5), u = 2 * (dq < 0 ? -dq : dq);
      return ribProfile(u, w) * smoother(r / (C.sc / 2));
    }
    const ring = ribProfile((2 * (r - R)) / C.sc < 1 ? (2 * (r - R)) / C.sc : 1, w);
    const ribs = ribsAt(eatan2(y, x), r) * smoother((r - R) / (C.sc / 2));
    return ring > ribs ? ring : ribs;
  };
  /* the field at (x, y): the centre, or the schedule's level, the emergence blend, the axis rule */
  const F = (p) => {
    const x = p[0], y = p[1];
    const r = Math.sqrt(x * x + y * y);
    if (C.type) return centreF(x, y, r);
    if (!(r > S.rCut)) return 0;
    const th = eatan2(y, x);
    let f = ribsAt(th, r);
    if (r < S.r0) {
      const m = S.rule === 'fade' ? smoother((r - S.r0 / 2) / (S.r0 / 2)) : smoother((r - (S.r0 - params.edgeMm)) / params.edgeMm);
      f *= m;
    }
    return f;
  };
  /* the local pitch (mm) at radius r: the arc between two crests of the level standing there */
  const pitchAt = (r) => (RIB_TAU * r) / S.levels[levelAt(S, r)].n;
  return { F, S, C, setCentre, circles, pitchAt, params };
}

/* ------------------------------------------------- the lines (mesher) --- */
/* Every line is a half-plane through the axis at angle 2 pi j / G for the
   global grid G = lines-per-pitch x n_max (A) or x n0 x 2^LG (B, LG the
   deepest level the organ reaches); its canonical id is j on the finest grid
   (an exact integer), so a parent crest and the same crest seen on a child's
   grid are ONE line. A line exists outward of max(rCut, its level's rStart). */
export function lineSet(field, linesPerPitch, rMax = Infinity) {
  const S = field.S, m = linesPerPitch;
  const LG = levelAt(S, rMax);
  const G = m * S.levels[LG].n;            // the finest grid (exact: n0 x 2^LG x m)
  /* the level a line belongs to: the coarsest level whose grid holds it */
  const homeLevel = (jG) => { for (let L = 0; L <= LG; L++) { const step = G / (m * S.levels[L].n); if (jG % step === 0) return L; } return LG; };
  /* the radius a line begins at */
  const rStartOf = (jG) => Math.max(S.rCut, S.levels[homeLevel(jG)].rStart, field.C && field.C.type ? field.C.R : 0);
  /* is the line a CREST (u = 0) of the level standing at radius r? Under a
     branching schedule a quarter-pitch line of a coarse level becomes a crest
     of a finer one further out, so this is a question about a POINT */
  const isCrestAt = (jG, r) => { if (jG < 0) return true; const L = Math.min(LG, levelAt(S, r)); const step = G / (m * S.levels[L].n); return jG % step === 0 && ((jG / step) % m) === 0; };
  const isCrest = (jG) => isCrestAt(jG, 0) || m === 1;
  /* the grid of the level standing at radius r (a divisor of G) */
  const gridAt = (r) => m * S.levels[Math.min(LG, levelAt(S, r))].n;
  /* the concentric ring crests (a CONCENTRIC centre): line id -(j + 1) for the ring at circles[j] */
  const circles = field.circles ? field.circles() : [];
  return { G, m, LG, homeLevel, rStartOf, isCrest, isCrestAt, gridAt, circles };
}

/* --------------------------------------------- the cutter, per organ --- */
/* Cut one welded organ (P: 3 x nV doubles, tri: ccw vertex triples, the
   lattice the shipped relief pass relieved) along every line of `LS` it
   crosses. `edgeOk(a, b)` decides, per EDGE, whether it may carry cut points
   (the junction rule; the relief-reach rule) — both triangles on an edge read
   one decision, so the result is conforming. Returns the new vertices (each
   on its source edge, with its line id and its lerp weight), the new
   triangles (each with its parent lattice triangle) and the chords (the
   crest edges the triangulation was constrained to). */
/* EVERY INPUT THE CUTTER DECIDES ON IS SNAPPED TO 2^-20 mm (BONE v2's own
   BONE2_QUANT): the shipped lattice's doubles differ in the last bit between
   Node and Chromium (its petals are laid with Math.cos / Math.sin; float32
   hides it, which is why the lattice build agrees to the bit), and a cut
   decides discrete things — which line crosses which edge, which diagonal a
   piece takes — so it must decide them on values both engines hold exactly.
   Measured before this: equal counts, 4,910 float32s apart (a quad's other
   diagonal, up to 0.53 mm). The new points are laid on the SNAPPED edge (off
   the emitted edge by at most 7e-7 mm; both triangles on an edge share the
   point, so nothing cracks). */
export const RIB_QUANT = 1048576;   // 2^20
export function cutOrgan(P0, tri, LS, field, edgeOk, opts = {}) {
  const P = new Float64Array(P0.length);
  for (let i = 0; i < P0.length; i++) P[i] = Math.round(P0[i] * RIB_QUANT) / RIB_QUANT;
  const nV = P.length / 3, nT = tri.length / 3;
  const snap = opts.snapMm ?? RIB_SNAP_MM;
  const S = field.S, G = LS.G;
  const theta = new Float64Array(nV), rad = new Float64Array(nV);
  for (let v = 0; v < nV; v++) { const x = P[v * 3], y = P[v * 3 + 1]; rad[v] = Math.sqrt(x * x + y * y); theta[v] = eatan2(y, x); }
  const dirCache = new Map();
  const dirOf = (jG) => { let d = dirCache.get(jG); if (!d) { const [s, c] = esincos((RIB_TAU * jG) / G); d = [c, s]; dirCache.set(jG, d); } return d; };
  /* per undirected edge (lo < hi), its cut points sorted by t from lo */
  const edgePts = new Map();
  const newP = [], newSrc = [];   // newSrc: [lo, hi, t, lineId]
  const ekey = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const cutEdge = (a, b) => {
    const k = ekey(a, b);
    if (edgePts.has(k)) return edgePts.get(k);
    const lo = a < b ? a : b, hi = a < b ? b : a;
    let pts = [];
    if (edgeOk(lo, hi)) {
      const ax = P[lo * 3], ay = P[lo * 3 + 1], bx = P[hi * 3], by = P[hi * 3 + 1];
      const ex = bx - ax, ey = by - ay, ez = P[hi * 3 + 2] - P[lo * 3 + 2], len = Math.sqrt(ex * ex + ey * ey + ez * ez);
      const rMax = rad[lo] > rad[hi] ? rad[lo] : rad[hi];
      if ((rMax > S.rCut || LS.circles.length) && len > 2 * snap) {
        let d = theta[hi] - theta[lo];
        if (d > Math.PI) d -= RIB_TAU; else if (d < -Math.PI) d += RIB_TAU;
        const t0 = d >= 0 ? theta[lo] : theta[lo] + d, t1 = d >= 0 ? theta[lo] + d : theta[lo];
        /* candidates on the grid of the level standing at the edge's outer end (every line there is on it) */
        const Ge = LS.gridAt(rMax), mul = G / Ge;
        const j0 = Math.ceil((t0 * Ge) / RIB_TAU), j1 = Math.floor((t1 * Ge) / RIB_TAU);
        for (let j = j0; j <= j1; j++) {
          const jG = (((j % Ge) + Ge) % Ge) * mul;
          const [cx, sy] = dirOf(jG);
          const cA = cx * ay - sy * ax, cB = cx * by - sy * bx;
          if (!((cA <= 0 && cB >= 0) || (cA >= 0 && cB <= 0)) || cA === cB) continue;
          if ((cA < 0 ? -cA : cA) <= snap && (cB < 0 ? -cB : cB) <= snap) continue;   // the edge lies ALONG this line: it is claimed whole, never cut
          const t = cA / (cA - cB);
          if (t * len < snap || (1 - t) * len < snap) continue;
          const px = ax + t * (bx - ax), py = ay + t * (by - ay);
          if (cx * px + sy * py <= 0) continue;          // the other half of the plane
          const rc = Math.sqrt(px * px + py * py);
          if (rc < LS.rStartOf(jG)) continue;
          pts.push({ t, jG });
        }
        /* the concentric rings: |A + t (B - A)| = Rc in the plan, both roots */
        if (LS.circles.length) {
          const dx = bx - ax, dy = by - ay, qa = dx * dx + dy * dy, qb = 2 * (ax * dx + ay * dy);
          const rLo = Math.min(rad[lo], rad[hi]) - len, rHi = rMax;
          if (qa > 0) LS.circles.forEach((Rc, j) => {
            if (Rc < rLo || Rc > rHi) return;
            const qc = ax * ax + ay * ay - Rc * Rc, disc = qb * qb - 4 * qa * qc;
            if (!(disc > 0)) return;
            const sq = Math.sqrt(disc);
            for (const t of [(-qb - sq) / (2 * qa), (-qb + sq) / (2 * qa)]) {
              if (!(t > 0 && t < 1) || t * len < snap || (1 - t) * len < snap) continue;
              const ra = rad[lo] - Rc, rb = rad[hi] - Rc;
              if ((ra < 0 ? -ra : ra) <= snap && (rb < 0 ? -rb : rb) <= snap) continue;   // the edge lies along the ring
              pts.push({ t, jG: -(j + 1) });
            }
          });
        }
        pts.sort((p, q) => p.t - q.t);
        /* two lines within the snap of each other on one edge (near the axis): keep the first */
        const kept = [];
        for (const q of pts) if (!kept.length || (q.t - kept[kept.length - 1].t) * len >= snap) kept.push(q);
        pts = kept.map((q) => {
          const id = nV + newP.length / 3;
          for (let c = 0; c < 3; c++) newP.push(P[lo * 3 + c] + q.t * (P[hi * 3 + c] - P[lo * 3 + c]));
          newSrc.push([lo, hi, q.t, q.jG]);
          return { id, t: q.t, jG: q.jG };
        });
      }
    }
    edgePts.set(k, pts);
    return pts;
  };
  const allP = (v) => (v < nV ? [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]] : [newP[(v - nV) * 3], newP[(v - nV) * 3 + 1], newP[(v - nV) * 3 + 2]]);
  const outTri = [], parent = [], chords = [];
  let split = 0, centroids = 0, onLine = 0;
  /* A LATTICE EDGE ALREADY ON A LINE (both ends within the snap of one
     half-plane — the stem's sector columns stand exactly on B's flutes) is a
     crest edge as it stands: it is claimed as a chord and nothing is cut */
  const vLine = new Float64Array(nV).fill(-1);
  for (let v = 0; v < nV; v++) {
    if (!(rad[v] > S.rCut)) continue;
    const Ge = LS.gridAt(rad[v]), mul = G / Ge, j = Math.round((theta[v] * Ge) / RIB_TAU), jG = (((j % Ge) + Ge) % Ge) * mul;
    const [cx, sy] = dirOf(jG), x = P[v * 3], y = P[v * 3 + 1], cr = cx * y - sy * x;
    if ((cr < 0 ? -cr : cr) <= snap && cx * x + sy * y > 0 && rad[v] >= LS.rStartOf(jG)) vLine[v] = jG;
  }
  const latticeChord = new Set();
  const steiner = [];   // [parentTri, l0, l1, l2]
  for (let t = 0; t < nT; t++) {
    const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
    const sides = [[a, b], [b, c], [c, a]];
    const poly = [], lineOf = new Map();
    let any = false;
    for (const [u, v] of sides) {
      poly.push(u);
      let pts = cutEdge(u, v);
      if (pts.length) any = true;
      if (u > v) pts = pts.slice().reverse();
      for (const q of pts) { poly.push(q.id); lineOf.set(q.id, q.jG); }
    }
    for (const [u, v] of sides) if (vLine[u] >= 0 && vLine[u] === vLine[v] && edgeOk(u < v ? u : v, u < v ? v : u)) { const k = ekey(u, v); if (!latticeChord.has(k)) { latticeChord.add(k); chords.push([u, v, vLine[u], t]); onLine++; } }
    if (!any) { outTri.push(a, b, c); parent.push(t); continue; }
    split++;
    /* the chords: a line with exactly two points in this triangle */
    const byLine = new Map();
    for (const [id, jG] of lineOf) { const l = byLine.get(jG); if (l) l.push(id); else byLine.set(jG, [id]); }
    let pieces = [poly];
    for (const [jG, ids] of byLine) {
      if (ids.length !== 2) continue;
      const [p, q] = ids;
      const k = pieces.findIndex((pc) => pc.includes(p) && pc.includes(q));
      if (k < 0) continue;
      const pc = pieces[k], i = pc.indexOf(p), j = pc.indexOf(q);
      const lo = Math.min(i, j), hi = Math.max(i, j);
      if (hi - lo < 2 || (lo === 0 && hi === pc.length - 1)) continue;   // already a side
      const A1 = pc.slice(lo, hi + 1), B1 = pc.slice(hi).concat(pc.slice(0, lo + 1));
      pieces.splice(k, 1, A1, B1);
      chords.push([p, q, jG, t]);
    }
    for (const pc of pieces) {
      const tris = fanConvex(pc, allP);
      if (tris) { for (const x of tris) outTri.push(x); for (let i = 0; i < tris.length / 3; i++) parent.push(t); }
      else {
        /* no apex gives a non-degenerate fan: a Steiner point at the piece's centroid */
        const id = nV + newP.length / 3;
        const cen = [0, 0, 0];
        for (const v of pc) { const q = allP(v); for (let k = 0; k < 3; k++) cen[k] += q[k] / pc.length; }
        for (let k = 0; k < 3; k++) newP.push(cen[k]);
        newSrc.push(['centroid', t, pc.slice()]);
        centroids++;
        for (let i = 0; i < pc.length; i++) { outTri.push(id, pc[i], pc[(i + 1) % pc.length]); parent.push(t); }
      }
    }
  }
  return { nV, newP, newSrc, tri: outTri, parent, chords, split, centroids, onLine, steiner, Pq: P };
}
/* a non-degenerate fan over a convex polygon whose sides may carry collinear
   points: the apex whose fan has the largest smallest triangle */
function fanConvex(pc, allP) {
  const n = pc.length;
  if (n === 3) return [pc[0], pc[1], pc[2]];
  const Q = pc.map(allP);
  let ext = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const dx = Q[i][0] - Q[j][0], dy = Q[i][1] - Q[j][1], dz = Q[i][2] - Q[j][2], d = dx * dx + dy * dy + dz * dz; if (d > ext) ext = d; }
  const area2 = (A, B, C) => { const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]; const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; return Math.sqrt(x * x + y * y + z * z); };
  let best = -1, bestMin = 0;
  for (let k = 0; k < n; k++) {
    let mn = Infinity;
    for (let i = 1; i < n - 1; i++) { const A = area2(Q[k], Q[(k + i) % n], Q[(k + i + 1) % n]); if (A < mn) mn = A; }
    if (mn > bestMin) { bestMin = mn; best = k; }
  }
  if (best < 0 || bestMin < 1e-9 * ext) return null;
  const out = [];
  for (let i = 1; i < n - 1; i++) out.push(pc[best], pc[(best + i) % n], pc[(best + i + 1) % n]);
  return out;
}

/* ===================================== THE PATCHED COPY OF THE GEOMETRY --- */
/* The shipped bloom-geometry.js is read as TEXT and five anchored edits are
   applied to a COPY in memory (each anchor must match exactly once, or the
   load refuses). The shipped module is never written. With the hook OFF the
   copy is the shipped geometry to the byte (R7 of the gate builds BONE both
   ways). The edits:
     1  the hook's slot, before the first import;
     2  BONE's texture record, with the hook on, takes the RIBS field for `f`,
        the constant 1 for the patch mask `mp` (everywhere — no islands), and
        no BONE v2 record (so its FULL allocator never runs: RIBS has its own
        meshing, 'mode' below);
     3  BONE v2's field is not built under the hook (it is unused and costs
        a second);
     4  the relief pass hands the hook its per-organ records after the shipped
        COARSE write (the masks, the visibility, the coverage and the derived
        owner decided on the shipped lattice), and the hook re-meshes;
     5  the record says RIBS;
     6  (Nov 9, second round) the relief pass tells the hook where it begins
        (the centre's radius is derived there) and asks it, per vertex, for
        EVA'S NAMED EXCLUSION (the stem and the rods);
     7  (Nov 9, third round: the STARBURST REACHES THE EDGE) four edits in the
        relief pass's organ branch, every one inert unless the hook asks: a hub
        vertex the petal feet COVER is marked, is not a seed of the coverage
        fade, and takes full weight. So the hub top is ribbed to its own rim,
        over the feet (which sit flush with it and stay as shipped beneath it:
        at a flute floor the two surfaces are one plane), with no fade inward of
        the feet's edge. Tried first and withdrawn: ribbing the feet's own top
        skin, which folded at the foot-to-blade crease (161 within-shell pairs at
        H 2.5) and at the feet's buried inner wall. */
export const RIB_EDITS = Object.freeze([
  ['hook-slot', "import { curveSamples,", "let __RIB = null;\nexport function __setRibs(x) { __RIB = x; }\nimport { curveSamples,"],
  ['field', 'f: refused ? null : (p, n) => field.F(p, n), mp: refused ? null : bonePatchField(b.coverage, patchScaleMm) };',
    "f: refused ? null : (__RIB ? __RIB.field(state, heightMm) : (p, n) => field.F(p, n)), mp: refused ? null : (__RIB ? () => 1 : bonePatchField(b.coverage, patchScaleMm)) };"],
  ['bone2-off', "    bone2: refused ? null : { field, params, full: null },", "    bone2: refused || __RIB ? null : { field, params, full: null }, ribs: __RIB ? __RIB.stats : undefined,"],
  ['bone2-field-skip', "  const field = refused ? null : bone2Field(params);", "  const field = refused || __RIB ? null : bone2Field(params);"],
  ['begin', "function boneReliefPass(acc, T, organs, capability = null) {\n", "function boneReliefPass(acc, T, organs, capability = null) {\n  if (__RIB && __RIB.begin) __RIB.begin(organs);\n"],
  ['excluded', "      if (!(w0[i] > 0) || !(mc[i] > 0)) continue;\n", "      if (!(w0[i] > 0) || !(mc[i] > 0) || (__RIB && __RIB.excluded(O, i))) continue;\n"],
  ['cover-decl', "    let visible = 0, buried = 0, covered = 0, coveredUnder = 0;\n    let visDist = null;", "    let visible = 0, buried = 0, covered = 0, coveredUnder = 0;\n    let visDist = null;\n    const __cov = __RIB && __RIB.coverFull ? new Uint8Array(nV) : null;"],
  ['cover-mark', "{ vis[i] = 0; covered++; if (n[2] < 0) coveredUnder++; }", "{ vis[i] = 0; covered++; if (n[2] < 0) coveredUnder++; if (__cov) __cov[i] = 1; }"],
  ['cover-seed', "        if (O.relievable[i]) buried++;\n        seed[i] = 1;\n      }\n      visDist = boneGeodesic(O.P, adj, seed, nV, Lam);", "        if (O.relievable[i]) buried++;\n        seed[i] = __cov && __cov[i] ? 0 : 1;\n      }\n      visDist = boneGeodesic(O.P, adj, seed, nV, Lam);"],
  ['cover-full', "      for (let i = 0; i < nV; i++) if (O.relievable[i] && vis[i]) w0[i] = visDist[i] >= Lam ? 1 : rimEase(visDist[i] / Lam);\n    }",
    "      for (let i = 0; i < nV; i++) if (O.relievable[i] && vis[i]) w0[i] = visDist[i] >= Lam ? 1 : rimEase(visDist[i] / Lam);\n      if (__cov) { const vs = new Uint8Array(nV); for (let i = 0; i < nV; i++) if (w0[i] > 0) vs[i] = 1; const dIn = boneGeodesic(O.P, adj, vs, nV, Lam); for (let i = 0; i < nV; i++) if (__cov[i] && O.relievable[i]) w0[i] = 1; }\n    }"],
  ['rim-ridge', "    for (let i = 0; i < nV; i++) { const d = ridgeDist ? ridgeDist[i] : Infinity; mc[i] = d >= Lam ? 1 : rimEase(d / Lam); }",
    "    const __Lr = __RIB && __RIB.coverFull && O.organ === 'hub' ? T.edgeMm : Lam;\n    for (let i = 0; i < nV; i++) { const d = ridgeDist ? ridgeDist[i] : Infinity; mc[i] = d >= __Lr ? 1 : rimEase(d / __Lr); }"],
  ['write-hook', "  if (T.bone2) T.bone2.full = full ? bone2FullWrite(acc, T, per, G2, capability) : null;", "  if (__RIB && __RIB.write) __RIB.write(acc, T, per, capability);\n  if (T.bone2) T.bone2.full = full ? bone2FullWrite(acc, T, per, G2, capability) : null;"],
]);
export function applyEdits(src, edits) {
  let out = src;
  for (const [label, from, to] of edits) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`ribs: edit '${label}' anchor matched ${n} times (must be exactly once)`);
    out = out.replace(from, () => to);
  }
  return out;
}
const IS_NODE = typeof window === 'undefined';
const GEO_BY_URL = new Map();
/* the copy, loaded once per geometry URL: in Node a temporary file, in the
   browser a Blob URL. `geoUrl` defaults to the shipped module beside this file. */
export async function ribsGeometry(geoUrl = new URL('./bloom-geometry.js', import.meta.url)) {
  const key = String(geoUrl);
  if (GEO_BY_URL.has(key)) return GEO_BY_URL.get(key);
  const curveUrl = new URL('./bloom-curve.js', geoUrl);
  let src;
  if (IS_NODE) { const fs = await import('node:fs'); src = fs.readFileSync(new URL(geoUrl), 'utf8'); }
  else src = await (await fetch(geoUrl)).text();
  src = applyEdits(src, [['curve-import', "from './bloom-curve.js'", `from '${curveUrl.href}'`], ...RIB_EDITS]);
  let GEO;
  if (IS_NODE) {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), { pathToFileURL } = await import('node:url');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ribs-'));
    const file = path.join(dir, 'bloom-geometry-ribs.mjs');
    fs.writeFileSync(file, src);
    try { GEO = await import(pathToFileURL(file).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  } else { const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); try { GEO = await import(url); } finally { URL.revokeObjectURL(url); } }
  GEO_BY_URL.set(key, GEO);
  return GEO;
}

/* ============================== THE MESHING INSIDE THE RELIEF PASS --- */
/* RIBS as a build state: BONE's slot with the ribs' own controls beside it.
   (BONE's curvature control is the curvature MASK the shipped pass applies —
   left at BONE's default 1 /mm unless a row says otherwise: the brief asks
   what that rule does to rods, the bead and the nib, and the rule is reported
   rather than special-cased.) */
export function ribState(base, extra = {}) {
  return { ...base, petalTexture: 'BONE', ribLaw: 'A', ribAxis: 'fade', ribSpacing: RIB_SPACING_DEFAULT, ribCrest: RIB_CREST_DEFAULT, ...extra };
}
export const RIB_MODES = Object.freeze(['lattice', 'crest', 'crest+flank']);
/* the hook: `mode` 'lattice' writes the shipped coarse stream (the field on
   the shipped 0.4 mm lattice); 'crest' cuts every organ along its crest lines;
   'crest+flank' along the crest, half-flank and valley lines (4 a pitch).
   `samples` asks for crest samples per organ kind (for the section instrument). */
export function ribHook({ mode = 'lattice', stats = {}, samples = null } = {}) {
  if (!RIB_MODES.includes(mode)) throw new Error(`ribs mode ${mode} is not one of ${RIB_MODES.join(' / ')}`);
  let FIELD = null, FIELD_KEY = null;
  stats.mode = mode;
  return {
    stats,
    field(state, H) {
      const params = ribParams({ ...state, textureHeight: H });
      const key = JSON.stringify(params);
      if (key !== FIELD_KEY) { FIELD = ribField(params); FIELD_KEY = key; }
      stats.params = params;
      stats.schedule = { n0: FIELD.S.n0, levels: FIELD.S.levels.filter((l) => l.rStart < 400).map((l) => ({ n: l.n, rStart: +l.rStart.toFixed(4) })), r0: FIELD.S.r0, rCut: FIELD.S.rCut, emerge: FIELD.S.emerge };
      return (p) => FIELD.F(p);
    },
    /* the start of the relief pass: the centre's radius derived from the organs it is handed */
    begin(organs) { if (FIELD) { FIELD.setCentre(organs); stats.centre = FIELD.C.type ? { type: FIELD.C.type, R: FIELD.C.R, from: FIELD.C.from, rFeet: FIELD.C.rFeet, rFloor: FIELD.C.rFloor, wC: FIELD.C.wC, sc: FIELD.C.sc, circles: FIELD.circles() } : null; } },
    excluded: ribExcluded,
    /* the starburst's reach (edits 7): read inside the relief pass, after field() */
    get coverFull() { return !!(FIELD && FIELD.params.reach === 'edge'); },
    write(acc, T, per, capability) {
      const t0 = performance.now();
      const noRelief = !!(capability && capability.boneNoRelief);
      const H = T.heightMm, f32 = Math.fround;
      const field = FIELD;
      stats.organs = {}; stats.ranges = []; stats.samples = []; stats.chordsTotal = 0; stats.split = 0; stats.centroids = 0; stats.withdrawn = 0; stats.flips = 0; stats.newVertices = 0;
      /* the junction rule: a position two ORGANS both emit (the derived owner's
         own float32 key) never carries a cut point beside it, so no new vertex
         sits on an edge two organs share */
      const owners = new Map();
      per.forEach((X, oi) => { for (let i = 0; i < X.nV; i++) { const k = `${f32(X.O.P[i * 3])}|${f32(X.O.P[i * 3 + 1])}|${f32(X.O.P[i * 3 + 2])}`; const o = owners.get(k); if (o === undefined) owners.set(k, oi); else if (o !== oi) owners.set(k, -1); } });
      const junction = (O, v) => owners.get(`${f32(O.P[v * 3])}|${f32(O.P[v * 3 + 1])}|${f32(O.P[v * 3 + 2])}`) === -1;
      /* one line set for the whole pass, on the grid of the level at the farthest
         point any organ reaches (so a line's id is the same in every organ) */
      let rMaxAll = 0;
      for (const X of per) for (let i = 0; i < X.nV; i++) { const x = X.O.P[i * 3], y = X.O.P[i * 3 + 1], r = Math.sqrt(x * x + y * y); if (r > rMaxAll) rMaxAll = r; }
      const crestLS = lineSet(field, 1, rMaxAll);
      const LS = mode === 'crest+flank' ? lineSet(field, RIB_FLANK_LINES, rMaxAll) : crestLS;
      const relief = (X) => { const w = new Float64Array(X.nV); for (let i = 0; i < X.nV; i++) w[i] = X.w0[i] > 0 && X.mc[i] > 0 && !ribExcluded(X.O, i) ? X.w0[i] * X.mc[i] : 0; return w; };
      /* per organ: the crest samples (on the shipped lattice, the same in every mode) */
      const sampleOrgan = (X, w) => {
        if (!samples) return;
        const want = samples[X.O.organ] || 0;
        if (!want) return;
        const got = stats.samples.filter((q) => q.organ === X.O.organ).length;
        if (got >= want) return;
        const C = cutOrgan(X.O.P, X.O.tri, crestLS, field, (a, b) => w[a] > 0.999 && w[b] > 0.999);
        const pts = (v) => (v < C.nV ? [C.Pq[v * 3], C.Pq[v * 3 + 1], C.Pq[v * 3 + 2]] : [C.newP[(v - C.nV) * 3], C.newP[(v - C.nV) * 3 + 1], C.newP[(v - C.nV) * 3 + 2]]);
        const cand = [];
        for (let k = 0; k < C.chords.length; k++) {
          const [p, q, jG] = C.chords[k];
          if (!crestLS.isCrest(jG)) continue;
          const A = pts(p), B = pts(q), mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
          const nrm = (v) => { if (v < C.nV) return [X.O.N[v * 3], X.O.N[v * 3 + 1], X.O.N[v * 3 + 2]]; const [lo, hi, t] = C.newSrc[v - C.nV]; return [0, 1, 2].map((c) => X.O.N[lo * 3 + c] + t * (X.O.N[hi * 3 + c] - X.O.N[lo * 3 + c])); };
          const n = nrm(p).map((v, c) => v + nrm(q)[c]); const Ln = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
          const tc = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]; const Lt = Math.sqrt(tc[0] * tc[0] + tc[1] * tc[1] + tc[2] * tc[2]);
          if (!(Ln > 0) || !(Lt > 1e-6)) continue;
          /* full-strength crests only (no axis fade, no emerging rib), and on an
             organ, its UPWARD faces (the hub top, never its underside) */
          if (!(field.F(mid) >= 0.999)) continue;
          if (!X.O.sheet && n[2] / Ln < 0.5 && X.O.organ === 'hub') continue;
          const r = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1]);
          cand.push({ organ: X.O.organ, sheet: !!X.O.sheet, p: mid, n: n.map((v) => v / Ln), tc: tc.map((v) => v / Lt), r, pitch: field.pitchAt(r), wantMm: H, jG, G: crestLS.G });
        }
        /* evenly through the organ's own chord order */
        const step = cand.length / (want - got);
        for (let k = 0; k < want - got && Math.floor(k * step) < cand.length; k++) stats.samples.push(cand[Math.floor(k * step)]);
      };
      const results = per.map((X) => {
        const w = relief(X);
        sampleOrgan(X, w);
        return { X, w, cut: null, allow: null };
      });
      if (mode !== 'lattice') {
        /* cut, then withdraw any edge whose new point another organ also carries (float32), and recut */
        const disallowed = results.map(() => new Set());
        for (let pass = 0; pass < 4; pass++) {
          for (const [i, R] of results.entries()) {
            if (R.cut && !R.redo) continue;
            const O = R.X.O, dis = disallowed[i];
            R.cut = cutOrgan(O.P, O.tri, LS, field, (a, b) => (R.w[a] > 1e-9 || R.w[b] > 1e-9) && !junction(O, a) && !junction(O, b) && !dis.has(a * R.X.nV + b));
            R.redo = false;
          }
          const seen = new Map();
          results.forEach((R, i) => { const O = R.X.O; for (let v = 0; v < R.X.nV; v++) { const k = `${f32(O.P[v * 3])}|${f32(O.P[v * 3 + 1])}|${f32(O.P[v * 3 + 2])}`; const o = seen.get(k); seen.set(k, o === undefined || o === i ? i : -1); } for (let v = 0; v < R.cut.newP.length / 3; v++) { const k = `${f32(R.cut.newP[v * 3])}|${f32(R.cut.newP[v * 3 + 1])}|${f32(R.cut.newP[v * 3 + 2])}`; const o = seen.get(k); seen.set(k, o === undefined || o === i ? i : -1); } });
          let any = false;
          results.forEach((R, i) => { for (let v = 0; v < R.cut.newP.length / 3; v++) { const k = `${f32(R.cut.newP[v * 3])}|${f32(R.cut.newP[v * 3 + 1])}|${f32(R.cut.newP[v * 3 + 2])}`; if (seen.get(k) === -1) { const s = R.cut.newSrc[v]; if (s[0] !== 'centroid') { disallowed[i].add(s[0] * R.X.nV + s[1]); R.redo = true; any = true; stats.withdrawn++; } } } });
          if (!any) break;
        }
      }
      /* the displaced output per organ */
      const repl = [];
      for (const R of results) {
        const X = R.X, O = X.O, nV = X.nV;
        let out;
        if (mode === 'lattice' || !R.cut || R.cut.split === 0) {
          if (mode === 'lattice') { repl.push({ X, out: null, from: O.from, to: O.to, chords: [] }); continue; }
        }
        const C = R.cut;
        const nN = nV + C.newP.length / 3;
        const D = new Float64Array(nN * 3), U = new Float64Array(nN * 3), Sv = new Float64Array(nN), isCrestV = new Uint8Array(nN);
        for (let i = 0; i < nN; i++) {
          let p, n, s;
          if (i < nV) { p = [O.P[i * 3], O.P[i * 3 + 1], O.P[i * 3 + 2]]; n = [O.N[i * 3], O.N[i * 3 + 1], O.N[i * 3 + 2]]; s = X.s[i] + X.clr[i]; }
          else {
            const src = C.newSrc[i - nV];
            p = [C.newP[(i - nV) * 3], C.newP[(i - nV) * 3 + 1], C.newP[(i - nV) * 3 + 2]];
            let wv;
            if (src[0] === 'centroid') {
              const ids = src[2]; n = [0, 0, 0]; wv = 0;
              for (const v of ids) { const nn = v < nV ? [O.N[v * 3], O.N[v * 3 + 1], O.N[v * 3 + 2]] : null; if (nn) for (let c = 0; c < 3; c++) n[c] += nn[c]; }
              /* a centroid's weight: the smallest of its piece's lattice corners (never more relief than its corners) */
              wv = Math.min(...ids.filter((v) => v < nV).map((v) => R.w[v]));
            } else {
              const [lo, hi, t, jG] = src;
              n = [0, 1, 2].map((c) => O.N[lo * 3 + c] + t * (O.N[hi * 3 + c] - O.N[lo * 3 + c]));
              wv = R.w[lo] + t * (R.w[hi] - R.w[lo]);
              if (LS.isCrestAt(jG, Math.sqrt(p[0] * p[0] + p[1] * p[1]))) isCrestV[i] = 1;
            }
            const Ln = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
            n = Ln > 0 ? n.map((v) => v / Ln) : [0, 0, 0];
            s = wv > 0 && Ln > 0 ? wv * H * field.F(p) : 0;
          }
          if (noRelief) s = 0;
          Sv[i] = s;
          for (let k = 0; k < 3; k++) { U[i * 3 + k] = p[k]; D[i * 3 + k] = p[k] + (s > 0 ? n[k] * s : 0); }
        }
        out = new Float64Array(C.tri.length * 3);
        for (let j = 0; j < C.tri.length; j++) for (let k = 0; k < 3; k++) out[j * 3 + k] = D[C.tri[j] * 3 + k];
        /* the fold count: a refined triangle whose displaced normal faces against its parent lattice triangle's */
        let flips = 0;
        for (let t = 0; t < C.tri.length / 3; t++) {
          const tp = C.parent[t], a = O.tri[tp * 3], b = O.tri[tp * 3 + 1], c = O.tri[tp * 3 + 2];
          const n0 = triN(U, a, b, c), n1 = triN(D, C.tri[t * 3], C.tri[t * 3 + 1], C.tri[t * 3 + 2]);
          if (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] < 0) flips++;
        }
        stats.flips += flips;
        stats.chordsTotal += C.chords.length; stats.split += C.split; stats.centroids += C.centroids; stats.newVertices += C.newP.length / 3;
        repl.push({ X, out, from: O.from, to: O.to, chords: C.chords, crestV: isCrestV, C, D, U, Sv, w: R.w });
      }
      /* the stream rebuilt (the shipped coarse write is already in acc for 'lattice') */
      repl.sort((a, b) => a.from - b.from);
      const old = acc.positions, oldN = acc.normals;
      const pos = [], nrm = oldN ? [] : null;
      let cur = 0;
      const pushOld = (a, b) => { for (let i = a * 9; i < b * 9; i++) pos.push(old[i]); if (nrm) for (let i = a * 9; i < b * 9; i++) nrm.push(oldN[i]); };
      const crestEdges = [];
      for (const r of repl) {
        if (r.from < cur) continue;
        pushOld(cur, r.from);
        const outFrom = pos.length / 9;
        if (!r.out) pushOld(r.from, r.to);
        else {
          for (let i = 0; i < r.out.length; i++) pos.push(r.out[i]);
          if (nrm) for (let t = 0; t < r.out.length / 9; t++) { const n = triN(r.out, t * 3, t * 3 + 1, t * 3 + 2); for (let c = 0; c < 3; c++) nrm.push(n[0], n[1], n[2]); }
          /* the claimed crest edges, as displaced endpoint pairs (R2 finds each among the output's edges) */
          for (const [p, q, jG, tp] of r.chords) if (LS.isCrestAt(jG, midR(r.U, p, q))) crestEdges.push({ a: [r.D[p * 3], r.D[p * 3 + 1], r.D[p * 3 + 2]], b: [r.D[q * 3], r.D[q * 3 + 1], r.D[q * 3 + 2]], ua: [r.U[p * 3], r.U[p * 3 + 1], r.U[p * 3 + 2]], ub: [r.U[q * 3], r.U[q * 3 + 1], r.U[q * 3 + 2]], lattice: p < r.C.nV && q < r.C.nV, jG, G: LS.G, m: LS.m, parent: tp, organ: r.X.O.organ, from: r.X.O.from });
        }
        stats.ranges.push({ organ: r.X.O.organ, sheet: !!r.X.O.sheet, rod: !!r.X.O.rod, from: outFrom, to: pos.length / 9, refined: !!r.out });
        const st = stats.organs[r.X.O.organ] || (stats.organs[r.X.O.organ] = { parts: 0, latticeTris: 0, tris: 0, areaMm2: 0, reliefArea: 0 });
        st.parts++; st.latticeTris += r.X.O.tri.length / 3; st.tris += (pos.length / 9 - outFrom);
        for (let t = 0; t < r.X.O.tri.length / 3; t++) st.areaMm2 += triArea(r.X.O.P, r.X.O.tri[t * 3], r.X.O.tri[t * 3 + 1], r.X.O.tri[t * 3 + 2]);
        cur = r.to;
      }
      pushOld(cur, old.length / 9);
      acc.positions = pos; if (nrm) acc.normals = nrm;
      for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const x = pos[i + k]; if (x < acc.lo[k]) acc.lo[k] = x; if (x > acc.hi[k]) acc.hi[k] = x; }
      Object.defineProperty(stats, 'crestEdges', { value: crestEdges, enumerable: false, configurable: true, writable: true });
      Object.defineProperty(stats, 'repl', { value: repl.map((r) => ({ organ: r.X.O.organ, O: r.X.O, X: r.X, C: r.C || null, D: r.D || null, U: r.U || null, Sv: r.Sv || null, w: r.w || null, crestV: r.crestV || null })), enumerable: false, configurable: true, writable: true });
      stats.passMs = performance.now() - t0;
      stats.tris = pos.length / 9;
    },
  };
}
function midR(U, p, q) { const x = (U[p * 3] + U[q * 3]) / 2, y = (U[p * 3 + 1] + U[q * 3 + 1]) / 2; return Math.sqrt(x * x + y * y); }
function triN(A, a, b, c) {
  const ux = A[b * 3] - A[a * 3], uy = A[b * 3 + 1] - A[a * 3 + 1], uz = A[b * 3 + 2] - A[a * 3 + 2];
  const vx = A[c * 3] - A[a * 3], vy = A[c * 3 + 1] - A[a * 3 + 1], vz = A[c * 3 + 2] - A[a * 3 + 2];
  const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const L = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / L, y / L, z / L];
}
function triArea(P, a, b, c) { const n = [0, 0, 0]; const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2]; n[0] = uy * vz - uz * vy; n[1] = uz * vx - ux * vz; n[2] = ux * vy - uy * vx; return Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) / 2; }

/* ------------------------------------------------------------ a build --- */
/* one RIBS build: the copy, the hook, the state; returns the accumulator, the
   bloom record, the hook's stats and the build's milliseconds */
export async function ribsBuild(base, extra = {}, { mode = 'lattice', exportMode = true, capability = null, samples = null, GEO = null } = {}) {
  GEO = GEO || (await ribsGeometry());
  const stats = {};
  GEO.__setRibs(ribHook({ mode, stats, samples }));
  try {
    const acc = new GEO.MeshBuilder({ exportMode, boneDetail: 'coarse' });
    const t0 = performance.now();
    const rec = GEO.buildBloomInto(acc, ribState(base, extra), { below: null, capability, scopes: null });
    return { acc, rec, stats, ms: performance.now() - t0 };
  } finally { GEO.__setRibs(null); }
}
