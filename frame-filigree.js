/* frame-filigree.js — the /frame SCROLL: the filigree's one primitive (phase
   3a, step 1). Pure functions, no DOM, Node-importable. Read docs/frame-charter.md
   §2 (layer 4) and §10 before touching it.

   A scroll is a SPINE — a planar centreline with unit normals, the same
   object every molding band is — swept with a small ROUND or HALF-ROUND wire
   profile by frame-relief's own bandSolid. Nothing here offsets a curve by
   hand: the wire's two edges, its relief grid and its walls are offsetCurve
   of the spine, exactly as a band's are.

   THE CURVE IS DEFINED BY ITS CURVATURE ALONG ITS LENGTH, never by a drawn
   path. Measured from the scroll's MIDDLE (its root — the back of a C, the
   inflection of an S) outward, each half's radius of curvature is

       ρ(s) = min(ρ_body, ρ_eye + k · (h − s))        s ∈ [0, h]

   — a circular BODY of radius ρ_body that hands over, curvature-continuous,
   to a LOGARITHMIC SPIRAL terminal (a log spiral is exactly the curve whose
   radius of curvature is linear in arc length, ρ = k · s to its pole; k is
   its tightness, smaller is more turns) that stops at the EYE, radius ρ_eye.
     C-scroll  both halves curl to the SAME side: two volutes facing each
               other across the C's mouth.
     S-scroll  the halves curl to OPPOSITE sides; the curvature passes through
               zero at the middle over a smoothstep of the first fifth of the
               shorter half, so the inflection is curvature-continuous too.
   `balance` sizes the second half against the first (1 = a symmetric scroll,
   0.6 = one volute three-fifths of the other, the hierarchy ratio the flower's
   rib orders step down by).

   THE EYE IS MEASURED, NOT GUESSED. Its floor is the corners' own law — the
   wire's inner edge keeps half a feature of radius, ρ_eye ≥ (t + F)/2 — and
   then it is RAISED by bisection until the least GAP across the wire's own
   coils (the centreline distance between two stations the curve has turned
   at least π between, less the wire) is at least F: a closed gap prints as
   a solid web, so a coil that would close is opened rather than allowed. The
   raise is reported (info.eye, info.eyeRaised) — the slider asked for more
   turns than a printable wire admits, and the scroll says so.

   Sampling: the arc law — a vertex every SCROLL_STEP_DEG of turning, capped
   at SCROLL_MAX_STEP_MM along a nearly straight stretch — integrated EXACTLY
   per step (a circular arc at the step's mid curvature: the chord is
   ds · sinc(dφ/2)), so the polyline is the curve to the double wherever the
   curvature is constant and to second order elsewhere.

   MIN_FEATURE_MM (registry) is an ASSUMPTION — nothing here has been printed.
   The wire thickness is floored at it and told. */

import { offsetCurve } from './frame-geometry.js';
import { bandSolid, Mesh, EMBED_MM } from './frame-relief.js';
import { MIN_FEATURE_MM } from './frame-registry.js';

export const SCROLL_STEP_DEG = 3;
export const SCROLL_MAX_STEP_MM = 1.0;
/* the volute's share of each half's arc length */
export const VOLUTE_SHARE = 0.5;
/* tightness 0 → half a turn of volute, 1 → one and three-quarters */
export const VOLUTE_TURNS = [0.5, 1.75];
/* the body's radius of curvature, as a fraction of the scroll's length */
export const SCROLL_BODY = { C: 0.42, S: 0.6 };
/* the wire's profile samples across its width */
export const WIRE_SAMPLES = 8;

const sinc = (x) => (Math.abs(x) < 1e-8 ? 1 - x * x / 6 : Math.sin(x) / x);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* The tightness control → the volute's asked turns. */
export const tightnessTurns = (tau) => VOLUTE_TURNS[0] + (VOLUTE_TURNS[1] - VOLUTE_TURNS[0]) * Math.min(1, Math.max(0, tau));


/* The turn of a stretch of length Ls whose radius of curvature runs linearly
   from ra to rb (a log spiral when it runs to the pole):
   ∫ ds/ρ = Ls · ln(ra/rb) / (ra − rb). */
export const linTurn = (Ls, ra, rb) => (Math.abs(ra - rb) < 1e-12 * ra ? Ls / ra : Ls * Math.log(ra / rb) / (ra - rb));
/* The radius at which a volute of length Lv must START to make `turns`
   full turns down to the eye re (bisection; the turn falls as the start
   radius grows). Past what Lv can hold at any start radius (Lv / re radians)
   it returns re: the most the length admits, reported as such. */
export function voluteStart(Lv, re, turns, rMax) {
  const want = turns * 2 * Math.PI;
  if (Lv / re <= want) return re;
  if (linTurn(Lv, rMax, re) >= want) return rMax;
  let lo = re, hi = rMax;
  for (let i = 0; i < 200 && hi - lo > 1e-12 * hi; i++) { const m = (lo + hi) / 2; if (linTurn(Lv, m, re) > want) lo = m; else hi = m; }
  return hi;
}

/* One half, marched outward from the middle. The radius of curvature runs
   linearly from the body's rMid down to the volute's start rv over the
   body's share of the half, then linearly from rv to the eye re over the
   volute (a log spiral) — continuous everywhere, tightening all the way out.
   sign: +1 curls left of the direction of march, −1 right. ramp: the
   S-scroll's smoothstep length. */
function halfCurve(h, rMid, rv, re, sign, ramp, phi0, share) {
  const sv = h * (1 - share), Lv = h - sv;
  const rho = (s) => (s <= sv ? rMid + (rv - rMid) * s / sv : rv + (re - rv) * (s - sv) / Lv);
  const kap = (s) => sign * (ramp > 0 ? smooth(s / ramp) : 1) / rho(s);
  const pts = [[0, 0]], phi = [phi0], kk = [kap(0)], u = [0];
  let s = 0, x = 0, y = 0, f = phi0;
  const dTh = SCROLL_STEP_DEG * Math.PI / 180;
  while (s < h - 1e-12) {
    let ds = Math.min(SCROLL_MAX_STEP_MM, rho(s) * dTh, h - s);
    ds = Math.min(SCROLL_MAX_STEP_MM, rho(s + ds / 2) * dTh, h - s);     // re-read at the step's midpoint
    const kmid = kap(s + ds / 2), dphi = kmid * ds;
    const c = ds * sinc(dphi / 2);
    x += c * Math.cos(f + dphi / 2); y += c * Math.sin(f + dphi / 2);
    f += dphi; s += ds;
    pts.push([x, y]); phi.push(f); kk.push(kap(s)); u.push(s);
  }
  return { pts, phi, kap: kk, u };
}

/* The scroll's centreline. spec: { kind 'C'|'S', length (mm), tightness
   0..1, wire (mm), balance 0.3..1, turns (optional: the volute turns
   ACTUALLY drawn — the gap clamp's own probe) }. Built about the origin: the
   root (the middle) at (0,0) with its tangent along +x, the first half to
   −x and the second to +x; a C curls toward +y (its mouth faces +y, its BACK
   — the root — is the lowest point of the wire's convex side). Both halves'
   volutes take the same asked turns; balance shortens the first half. The
   eye is the printable floor (the wire's inner edge keeps half a feature of
   radius, the corners' own law); the turns come from where the volute
   STARTS, solved per half. */
export function scrollCurve(spec) {
  const kind = spec.kind === 'S' ? 'S' : 'C';
  const L = spec.length, t = spec.wire, beta = Math.min(1, Math.max(0.3, spec.balance ?? 1));
  const turns = spec.turns ?? tightnessTurns(spec.tightness ?? 0.5);
  const h2 = L / (1 + beta), h1 = L - h2;
  const ramp = kind === 'S' ? 0.2 * Math.min(h1, h2) : 0;
  const rMid = SCROLL_BODY[kind] * L;
  const re = (t + MIN_FEATURE_MM) / 2;
  const share = spec.share ?? VOLUTE_SHARE;
  const rv = [h1, h2].map((h) => voluteStart(h * share, re, turns, rMid));
  const B = halfCurve(h2, rMid, rv[1], re, +1, ramp, 0, share);
  const A = halfCurve(h1, rMid, rv[0], re, kind === 'C' ? -1 : +1, ramp, Math.PI, share);
  const pts = [], tan = [], u = [], kap = [];
  for (let i = A.pts.length - 1; i >= 1; i--) { pts.push(A.pts[i]); tan.push(A.phi[i] - Math.PI); u.push(-A.u[i]); kap.push(-A.kap[i]); }
  for (let i = 0; i < B.pts.length; i++) { pts.push(B.pts[i]); tan.push(B.phi[i]); u.push(B.u[i]); kap.push(B.kap[i]); }
  const nrm = tan.map((f) => [-Math.sin(f), Math.cos(f)]);
  const built = [h1, h2].map((h, i) => linTurn(h * share, rv[i], re) / (2 * Math.PI));
  return { kind, pts, nrm, tan, u, kap, root: A.pts.length - 1, info: { L, t, rMid, rv, eye: re, h1, h2, turnsAsked: turns, turnsBuilt: built } };
}

/* The least gap ACROSS a wire's own coils: centreline distance between two
   stations the curve has turned at least π between (so they face each other —
   across the eye, across adjacent coils, across a closing mouth), less the
   wire. A convex stretch under half a turn is not a gap. */
export function selfGap(curve, t) {
  const P = curve.pts, T = curve.tan, n = P.length;
  let best = Infinity, at = null;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (Math.abs(T[j] - T[i]) < Math.PI) continue;
    const d = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - t;
    if (d < best) { best = d; at = [i, j]; }
  }
  return { gap: best, at };
}

/* The most volute turns (≤ `asked`) a scroll admits with every coil gap at
   least F: bisection, the gap rising as the turns fall (0 turns is the bare
   body). Returns the turns and whether the clamp bound. */
function printableTurns(base, t, asked) {
  if (selfGap(scrollCurve({ ...base, turns: asked }), t).gap >= MIN_FEATURE_MM) return { turns: asked, bound: false };
  let lo = 0, hi = asked;
  for (let i = 0; i < 40 && hi - lo > 1e-4; i++) { const m = (lo + hi) / 2; if (selfGap(scrollCurve({ ...base, turns: m }), t).gap >= MIN_FEATURE_MM) lo = m; else hi = m; }
  return { turns: lo, bound: true };
}

/* THE TIGHTNESS RANGE IS FITTED TO THE SCROLL (Eva's ruling 2 on step 1:
   no dead travel). A coil needs its own wire plus a feature of room, so a
   short scroll cannot hold the 1¾ turns a long one can, and a fixed range
   left most of the slider held at one shape (measured at 60 mm on a 1.6 mm
   wire: everything above tightness 0.27 built 0.84 turns). Two moves, in
   this order:
     1. the volute's SHARE of each half rises from VOLUTE_SHARE toward
        VOLUTE_SHARE_MAX until the top of the range fits — a longer spiral
        spaces its coils further apart, so a small scroll gives its body to
        its volute (bisection on the share, the printable turns rising with
        it);
     2. where even the largest share cannot hold 1¾ turns, the range's TOP is
        the most that prints, and tightness spans [½ turn, that] — so every
        step of the slider changes the scroll, and tightness 1 means "as
        tight as this wire and length print" (told, with the number).
   Below half a turn nothing is left to span: the slider is inert, told. */
export const VOLUTE_SHARE_MAX = 0.8;
const fitMemo = new Map();
export function tightnessFit(spec) {
  const t = Math.max(spec.wire, MIN_FEATURE_MM);
  const key = [spec.kind, spec.length, t, spec.balance, spec.share].join('|');
  if (!fitMemo.has(key)) fitMemo.set(key, fitUncached({ ...spec, wire: t }, t));   // pure: tightness does not enter it
  return fitMemo.get(key);
}
function fitUncached(base, t) {
  const spec = base;
  const top = VOLUTE_TURNS[1];
  const at = (share) => printableTurns({ ...base, share }, t, top).turns;
  if (spec.share != null) return { share: spec.share, turnsMax: at(spec.share) };
  if (at(VOLUTE_SHARE) >= top) return { share: VOLUTE_SHARE, turnsMax: top };
  const capT = at(VOLUTE_SHARE_MAX);
  if (capT < top) return { share: VOLUTE_SHARE_MAX, turnsMax: capT };
  let lo = VOLUTE_SHARE, hi = VOLUTE_SHARE_MAX;
  for (let i = 0; i < 30 && hi - lo > 1e-4; i++) { const m = (lo + hi) / 2; if (at(m) >= top) hi = m; else lo = m; }
  return { share: hi, turnsMax: top };
}

/* The scroll as built: the wire floored at F (told); the tightness mapped
   onto the scroll's own fitted range; and, as a safety, the volutes' turns
   lowered by bisection should the gap still fall under F — a coil or a mouth
   that would close is opened rather than printed as a web — with the turns
   built reported beside the turns asked. An explicit spec.turns (the gap
   clamp's own probe) bypasses the fit. */
export function buildScroll(spec) {
  const told = [];
  let t = spec.wire;
  if (t < MIN_FEATURE_MM) { told.push(`wire ${t.toFixed(2)} mm built at the ${MIN_FEATURE_MM.toFixed(1)} mm assumed minimum feature`); t = MIN_FEATURE_MM; }
  let base = { ...spec, wire: t }, asked, fit = null;
  if (spec.turns != null) asked = spec.turns;
  else {
    fit = tightnessFit(base);
    base = { ...base, share: fit.share };
    const tau = Math.min(1, Math.max(0, spec.tightness ?? 0.5));
    const lo = Math.min(VOLUTE_TURNS[0], fit.turnsMax);
    asked = lo + (fit.turnsMax - lo) * tau;
    if (fit.turnsMax < VOLUTE_TURNS[1]) told.push(fit.turnsMax <= VOLUTE_TURNS[0]
      ? `tightness inert — a ${(spec.length).toFixed(0)} mm scroll on a ${t.toFixed(1)} mm wire prints at most ${fit.turnsMax.toFixed(2)} turns`
      : `tightness spans ${lo.toFixed(2)}–${fit.turnsMax.toFixed(2)} turns — the most a ${(spec.length).toFixed(0)} mm scroll on a ${t.toFixed(1)} mm wire prints (volute ${(fit.share * 100).toFixed(0)}% of each half)`);
  }
  const held = printableTurns(base, t, asked);
  const turns = held.turns;
  const c = scrollCurve({ ...base, turns });
  const g = selfGap(c, t);
  if (held.bound) told.push(`volutes held at ${turns.toFixed(2)} of ${asked.toFixed(2)} turns — a closer coil leaves a gap under the ${MIN_FEATURE_MM.toFixed(1)} mm feature`);
  c.info = { ...c.info, wire: t, share: base.share ?? VOLUTE_SHARE, fit, turnsAsked: asked, turnsHeld: turns, selfGap: g.gap, gapAt: g.at, told };
  return c;
}

/* Place a curve: rotate by `angle` about its root, then translate the root to
   `at`; `mirror` reflects x → −x AFTER placing (exact: the doubles are
   negated, never recomputed). */
export function placeCurve(c, { at = [0, 0], angle = 0, flip = false, mirror = false } = {}) {
  const ca = Math.cos(angle), sa = Math.sin(angle), r0 = c.pts[c.root];
  const map = ([x, y]) => { let X = x - r0[0], Y = y - r0[1]; if (flip) Y = -Y; return [at[0] + ca * X - sa * Y, at[1] + sa * X + ca * Y]; };
  const rot = ([x, y]) => { if (flip) y = -y; return [ca * x - sa * y, sa * x + ca * y]; };
  let pts = c.pts.map(map), nrm = c.nrm.map(rot);
  const tan = c.tan.map((f) => (flip ? -f : f) + angle);
  if (mirror) { pts = pts.map(([x, y]) => [-x, y]); nrm = nrm.map(([x, y]) => [-x, y]); }
  return { ...c, pts, nrm, tan: mirror ? tan.map((f) => Math.PI - f) : tan };
}

/* A GROUP of n scrolls (2..5): a LEAD C-scroll and n − 1 smaller scrolls
   budding from its BACK — each child's own back (its root) kissing the lead's
   convex side at a station along it, curling the other way, so the two wires
   meet at one point and part in both directions. Children step down in size
   by `ratio` (0.6 — the rib-order ratio), alternate C and S, and take
   stations spread evenly over the middle of the lead's back, alternating
   sides of its root. The child's root sits (t_lead + t_child)/2 − EMBED_MM
   off the lead's centreline, so the two closed shells OVERLAP by the embed
   at the contact (never a graze). */
export function buildGroup({ n = 3, length = 60, tightness = 0.5, wire = 1.6, ratio = 0.6, balance = 0.6, kind = 'C' } = {}) {
  const lead = buildScroll({ kind, length, tightness, wire, balance });
  const out = [{ curve: lead, role: 'lead', parent: null, station: null }];
  const stations = [];
  for (let i = 1; i < n; i++) stations.push((i % 2 ? -1 : 1) * (0.18 + 0.14 * Math.floor((i - 1) / 2)));
  const placeChild = (frac, i, tau) => {
    const order = Math.floor(i / 2) + 1;
    const len = length * ratio ** order, tw = Math.max(MIN_FEATURE_MM, wire * Math.sqrt(ratio) ** order);
    const child = buildScroll({ kind: i % 2 ? 'S' : 'C', length: len, tightness: tau, wire: tw, balance });
    // the lead's station at arc length frac · L from its root, on its BACK
    // (the side opposite its normal)
    const target = frac * lead.info.L;
    let j = lead.root; while (j > 0 && j < lead.u.length - 1 && Math.abs(lead.u[j] - target) > Math.abs(lead.u[j + Math.sign(target)] - target)) j += Math.sign(target);
    const off = (wire + tw) / 2 - EMBED_MM;
    const at = [lead.pts[j][0] - off * lead.nrm[j][0], lead.pts[j][1] - off * lead.nrm[j][1]];
    // the child's back faces the lead: its own normal points AWAY from the
    // lead, so it is laid along the lead's tangent and flipped
    return { curve: placeCurve(child, { at, angle: lead.tan[j], flip: true }), role: 'child', parent: 0, station: j, contact: at };
  };
  // A child's volutes must clear every wire already laid, outside its own
  // junction, by a feature: where the asked tightness would cross one (a
  // tighter, longer volute reaching back over the lead), the CHILD's
  // tightness is lowered by bisection until it clears — told.
  const clears = (x) => out.every((y) => pairGap(x.curve, y.curve).gap >= MIN_FEATURE_MM);
  stations.forEach((frac, i) => {
    let x = placeChild(frac, i, tightness);
    if (clears(x)) { out.push(x); return; }
    // first the child's tightness; where even a half-turn volute crosses (the
    // lead's own volute has coiled back over the station), the station slides
    // toward the root a tenth at a time; a child that clears nowhere is not
    // built — every step told
    for (let k = 10; k >= 3; k--) {
      const f = frac * k / 10;
      if (!clears(placeChild(f, i, 0))) continue;
      let lo = 0, hi = tightness, best = placeChild(f, i, 0);
      for (let q = 0; q < 20 && hi - lo > 1e-3; q++) { const m = (lo + hi) / 2, y = placeChild(f, i, m); if (clears(y)) { lo = m; best = y; } else hi = m; }
      if (k < 10) best.curve.info.told.push(`child ${i} moved from ${(100 * Math.abs(frac)).toFixed(0)}% to ${(100 * Math.abs(f)).toFixed(0)}% of the lead's length from its root — at its station the lead's volute crosses it`);
      if (lo < tightness - 1e-3) best.curve.info.told.push(`child ${i} held at tightness ${lo.toFixed(2)} of ${tightness.toFixed(2)} — a tighter volute crosses another wire of the group`);
      best.heldTightness = lo; out.push(best); return;
    }
    out.dropped = (out.dropped || 0) + 1;
    (out[0].curve.info.told).push(`child ${i} not built — it crosses another wire of the group at every station and tightness`);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Relief                                                              */
/* ------------------------------------------------------------------ */

/* The wire's cross-section, x 0..1 across, z 0..1 of its crown height:
   half-round is a true semicircle of radius t/2 standing on the base;
   round raises it on a wall of t/2, so the visible top is the upper half of
   a round wire of diameter t. */
export function wireProfile(shape = 'half-round') {
  const x = new Float64Array(WIRE_SAMPLES + 1), z = new Float64Array(WIRE_SAMPLES + 1);
  for (let i = 0; i <= WIRE_SAMPLES; i++) {
    x[i] = i / WIRE_SAMPLES;
    const c = Math.sqrt(Math.max(0, 1 - (2 * x[i] - 1) ** 2));
    z[i] = shape === 'half-round' ? c : 0.5 + 0.5 * c;
  }
  return { x, z, shape };
}
export const wireHeight = (t, shape) => (shape === 'half-round' ? t / 2 : t);

/* A spine for bandSolid from a placed curve. */
export const scrollSpine = (c, id) => ({ id, pts: c.pts, nrm: c.nrm, bandWidth: c.info.wire });

/* Lay a list of placed curves into a mesh as closed wire solids standing on
   a base of `baseZ` (print mm; the vocabulary sheet stands them on a plate of
   that thickness). scale maps the curve's mm to print mm (1 on the sheet). */
export function scrollsIntoMesh(mesh, curves, { scale = 1, baseZ = 1, shape = 'half-round' } = {}) {
  const prof = wireProfile(shape);
  curves.forEach((c, i) => bandSolid(mesh, scrollSpine(c, `scroll${i}`), prof, { scale, plateT: baseZ, reliefDepth: wireHeight(c.info.wire, shape) * scale }));
  return mesh;
}

/* A stand-alone relief of scrolls (the vocabulary sheet's cells). */
export function scrollRelief(curves, opts = {}) {
  const mesh = scrollsIntoMesh(new Mesh(), curves, opts);
  return { positions: Float64Array.from(mesh.pos), indices: Uint32Array.from(mesh.idx), parts: mesh.parts, scale: opts.scale ?? 1 };
}

/* The least gap between two DIFFERENT wires outside their junction: the
   centreline distance less the half wires, over station pairs; pairs inside
   the JUNCTION — the contiguous stretch around the contact where the wires
   are closer than the gap floor allows, which prints as the joint's web — are
   excluded and their length reported, so a junction cannot hide a second
   near-contact elsewhere. */
export function pairGap(a, b) {
  // read from BOTH wires: the junction is found along the first argument, so
  // one order alone can mistake a crossing for the junction and miss it
  const x = pairGapFrom(a, b), y = pairGapFrom(b, a);
  return x.gap <= y.gap ? x : y;
}
function pairGapFrom(a, b) {
  const ta = a.info.wire, tb = b.info.wire, need = (ta + tb) / 2 + MIN_FEATURE_MM;
  const near = (i) => { let m = Infinity, jm = -1; for (let j = 0; j < b.pts.length; j++) { const d = Math.hypot(a.pts[i][0] - b.pts[j][0], a.pts[i][1] - b.pts[j][1]); if (d < m) { m = d; jm = j; } } return [m, jm]; };
  const d = a.pts.map((_, i) => near(i));
  // the junction: the run of a's stations under `need` that contains a's
  // nearest approach
  let i0 = 0; for (let i = 1; i < d.length; i++) if (d[i][0] < d[i0][0]) i0 = i;
  let lo = i0, hi = i0;
  if (d[i0][0] < need) { while (lo > 0 && d[lo - 1][0] < need) lo--; while (hi < d.length - 1 && d[hi + 1][0] < need) hi++; }
  else { lo = i0 + 1; hi = i0; }   // no junction
  let gap = Infinity;
  for (let i = 0; i < d.length; i++) if (i < lo || i > hi) gap = Math.min(gap, d[i][0] - (ta + tb) / 2);
  const web = hi >= lo ? Math.abs(a.u[hi] - a.u[lo]) : 0;
  return { gap, web, contact: d[i0][0] - (ta + tb) / 2 };
}

export { offsetCurve, EMBED_MM };
