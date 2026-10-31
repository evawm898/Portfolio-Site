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

import { offsetCurve, outerEdge, innerEdge, sweepSpine } from './frame-geometry.js';
import { bandSolid, Mesh, EMBED_MM, FRAME_TRI_BUDGET, solidTriBound, plateOutline } from './frame-relief.js';
import { MIN_FEATURE_MM } from './frame-registry.js';

export const SCROLL_STEP_DEG = 3;
export const SCROLL_MAX_STEP_MM = 1.0;
/* the volute's share of each half's arc length */
export const VOLUTE_SHARE = 0.5;
/* tightness 0 → half a turn of volute, 1 → one and three-quarters */
export const VOLUTE_TURNS = [0.5, 1.75];
/* the body's radius of curvature, as a fraction of the scroll's length */
export const SCROLL_BODY = { C: 0.42, S: 0.6 };
/* THE TAPERED WIRE (phase 3b, Eva's ruling 1): the wire is its full width
   through the root and the body and thins LINEARLY in arc length over each
   volute to TAPER_TIP of it at the eye, floored at the feature — the floor
   applies at the thinnest point, the tip. A wire already at the floor has
   no room to taper (told). Every gap and clamp reads the LOCAL width. */
export const TAPER_TIP = 0.5;
export const taperTip = (t) => Math.max(MIN_FEATURE_MM, TAPER_TIP * t);
/* THE CARVED STROKE (phase 3c, Eva's ruling on the critique: 1B). A carved
   scroll's width follows its own curvature — SELF-SIMILAR: w = CARVED_K · ρ
   (ρ the local radius of curvature), capped at CARVED_CAP of the scroll's
   length and floored at MIN_FEATURE_MM. So the body (ρ large) is the cap and
   the stroke thins in proportion as it curls into the volute — the coils of a
   spiral whose radius shrinks by a fixed ratio a turn keep a fixed ratio of
   room, which is what lets a fat stroke curl at all (on the shipped curve a
   stroke fat everywhere crosses its own coil, measured in the critique
   session). k < 2 is the fold limit (the inner edge reverses where the half
   width passes ρ); 0.7 is the look, from the critique's prototype P1–P3. */
export const CARVED_K = 0.7;
export const CARVED_CAP = 0.1;
export const carvedCap = (L) => Math.max(MIN_FEATURE_MM, CARVED_CAP * L);
export const carvedWidth = (rho, cap) => Math.min(cap, Math.max(MIN_FEATURE_MM, CARVED_K * rho));
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
  // spec.rBody: a chain's STEM (phase 3d) — the same law with a body so
  // flat it follows the band, ending in a volute at each end
  const rMid = spec.rBody ?? SCROLL_BODY[kind] * L;
  // the eye is the floor on the wire's LOCAL width there: the tip, tapered
  const tEye = spec.carved ? MIN_FEATURE_MM : spec.taper ? taperTip(t) : t;
  const re = (tEye + MIN_FEATURE_MM) / 2;
  const share = spec.share ?? VOLUTE_SHARE;
  const rv = [h1, h2].map((h) => voluteStart(h * share, re, turns, rMid));
  const B = halfCurve(h2, rMid, rv[1], re, +1, ramp, 0, share);
  const A = halfCurve(h1, rMid, rv[0], re, kind === 'C' ? -1 : +1, ramp, Math.PI, share);
  const pts = [], tan = [], u = [], kap = [];
  for (let i = A.pts.length - 1; i >= 1; i--) { pts.push(A.pts[i]); tan.push(A.phi[i] - Math.PI); u.push(-A.u[i]); kap.push(-A.kap[i]); }
  for (let i = 0; i < B.pts.length; i++) { pts.push(B.pts[i]); tan.push(B.phi[i]); u.push(B.u[i]); kap.push(B.kap[i]); }
  const nrm = tan.map((f) => [-Math.sin(f), Math.cos(f)]);
  const built = [h1, h2].map((h, i) => linTurn(h * share, rv[i], re) / (2 * Math.PI));
  const out = { kind, pts, nrm, tan, u, kap, root: A.pts.length - 1, info: { L, t, rMid, rv, eye: re, h1, h2, turnsAsked: turns, turnsBuilt: built, share, taper: !!spec.taper, carved: !!spec.carved, tip: tEye } };
  // a CARVED stroke: the local width is the self-similar law on the curve's
  // own curvature at each station (t is the cap)
  if (spec.carved) { out.w = kap.map((k) => carvedWidth(1 / Math.max(1e-12, Math.abs(k)), t)); return out; }
  // the local width at every station: t through the body, linear in arc
  // length over the volute down to the tip at the eye
  if (spec.taper) out.w = u.map((s) => { const h = s < 0 ? h1 : h2, a = Math.abs(s), sv = h * (1 - share); return a <= sv ? t : t + (tEye - t) * Math.min(1, (a - sv) / (h - sv)); });
  return out;
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
    // the gap is the centreline distance less the two LOCAL half widths
    const d = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - (curve.w ? (curve.w[i] + curve.w[j]) / 2 : t);
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
/* PHASE 3b (Eva's ruling 2): move 1 is WITHDRAWN. Growing the volute's
   share bought turns by spending the body — the scroll read as all spiral —
   so the share is held at VOLUTE_SHARE (a long sweeping body ending in a
   smaller curl, rocaille) and ONLY move 2 remains: where the asked turns do
   not fit, the slider's top is the most that prints, told. */
const fitMemo = new Map();
export function tightnessFit(spec) {
  const t = Math.max(spec.wire, MIN_FEATURE_MM);
  const key = [spec.kind, spec.length, t, spec.balance, spec.share, !!spec.taper, !!spec.carved, spec.rBody ?? ''].join('|');
  if (!fitMemo.has(key)) fitMemo.set(key, fitUncached({ ...spec, wire: t }, t));   // pure: tightness does not enter it
  return fitMemo.get(key);
}
function fitUncached(base, t) {
  const spec = base;
  const top = VOLUTE_TURNS[1];
  const at = (share) => printableTurns({ ...base, share }, t, top).turns;
  if (spec.share != null) return { share: spec.share, turnsMax: at(spec.share) };
  return { share: VOLUTE_SHARE, turnsMax: at(VOLUTE_SHARE) };
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
    if (spec.taper && !spec.carved && taperTip(t) >= t) told.push(`tapered wire: a ${t.toFixed(2)} mm wire is already at the ${MIN_FEATURE_MM.toFixed(1)} mm floor — no room to taper, built constant`);
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
export function buildGroup({ n = 3, length = 60, tightness = 0.5, wire = 1.6, ratio = 0.6, balance = 0.6, kind = 'C', taper = false, carved = false } = {}) {
  // a CARVED scroll's cap is its own length's (CARVED_CAP), so the wire
  // control does not reach it
  const lead = buildScroll({ kind, length, tightness, wire: carved ? carvedCap(length) : wire, balance, taper, carved });
  const out = [{ curve: lead, role: 'lead', parent: null, station: null }];
  const stations = [];
  for (let i = 1; i < n; i++) stations.push((i % 2 ? -1 : 1) * (0.18 + 0.14 * Math.floor((i - 1) / 2)));
  const placeChild = (frac, i, tau) => {
    const order = Math.floor(i / 2) + 1;
    const len = length * ratio ** order, tw = carved ? carvedCap(len) : Math.max(MIN_FEATURE_MM, wire * Math.sqrt(ratio) ** order);
    const child = buildScroll({ kind: i % 2 ? 'S' : 'C', length: len, tightness: tau, wire: tw, balance, taper, carved });
    // the lead's station at arc length frac · L from its root, on its BACK
    // (the side opposite its normal)
    const target = frac * lead.info.L;
    let j = lead.root; while (j > 0 && j < lead.u.length - 1 && Math.abs(lead.u[j] - target) > Math.abs(lead.u[j + Math.sign(target)] - target)) j += Math.sign(target);
    const off = (wAt(lead, j) + tw) / 2 - EMBED_MM;   // the local widths at the contact
    const at = [lead.pts[j][0] - off * lead.nrm[j][0], lead.pts[j][1] - off * lead.nrm[j][1]];
    // the child's back faces the lead: its own normal points AWAY from the
    // lead, so it is laid along the lead's tangent and flipped
    return { curve: placeCurve(child, { at, angle: lead.tan[j], flip: true }), role: 'child', parent: 0, station: j, contact: at };
  };
  // A child's volutes must clear every wire already laid, outside its own
  // junction, by a feature: where the asked tightness would cross one (a
  // tighter, longer volute reaching back over the lead), the CHILD's
  // tightness is lowered by bisection until it clears — told.
  // A child JOINS its parent (the lead): every approach under a feature must
  // be a true overlap of the embed, never a graze; it shares no junction with
  // a sibling, so a sibling must stand a full feature clear.
  const clears = (x) => out.every((y, k) => (k === 0 ? joinsCleanly(x.curve, y.curve) : wireClear(x.curve, y.curve) >= MIN_FEATURE_MM));
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
/* THE LEAF and THE CLUSTER (phase 3c, Eva's picks P4 and P5)          */
/* ------------------------------------------------------------------ */

/* A LEAF is a spine like a scroll's — a planar centreline with unit normals,
   swept by the one bandSolid — whose curvature rises toward the tip so the
   tip curls over: κ(s) = side · θ · (p + 1)/L · (s/L)^p, so the whole leaf
   turns by exactly θ (LEAF_CURL) and most of it in its last third. Its width
   is a lobed envelope with notched serrations,
     w(s) = W · sin(π (s/L)^0.75)^0.8 · (½ + ½ √sin(π · frac(lobes · s/L)))
   held under the fold limit (LEAF_FOLD · ρ — the inner edge reverses where
   the half width passes ρ, so 1.6 keeps it at 0.8 of that) and floored at
   MIN_FEATURE_MM, so the tip and the base are a printable feature wide and
   every notch is a dip in the width, never a gap. `side` +1 curls left of
   the direction of growth, −1 right. */
export const LEAF_CURL = 2.2;          // rad: the whole leaf's turn
export const LEAF_CURL_POWER = 2.2;
export const LEAF_LOBES = 4;
export const LEAF_FOLD = 1.6;
export const LEAF_ASPECT = 0.38;       // the blade's width as a fraction of its length
export const LEAF_RELIEF = 0.18;       // the blade's crown as a fraction of its width (× ornament relief)
export const leafKappa = (s, L, side = 1, theta = LEAF_CURL) => side * theta * (LEAF_CURL_POWER + 1) / L * Math.pow(Math.max(0, s) / L, LEAF_CURL_POWER);
export function leafEnvelope(s, L, W, lobes = LEAF_LOBES) {
  const a = Math.min(1, Math.max(0, s / L));
  const env = Math.pow(Math.sin(Math.PI * Math.pow(a, 0.75)), 0.8);
  const fr = (a * lobes) % 1;
  return W * env * (0.5 + 0.5 * Math.sqrt(Math.max(0, Math.sin(Math.PI * fr))));
}
export const leafWidth = (s, L, W, kap, lobes = LEAF_LOBES) => Math.max(MIN_FEATURE_MM, Math.min(leafEnvelope(s, L, W, lobes), LEAF_FOLD / Math.max(1e-12, Math.abs(kap))));
export function buildLeaf({ length, width, side = 1, curl = LEAF_CURL, lobes = LEAF_LOBES } = {}) {
  const L = length, told = [];
  let W = width;
  if (W < MIN_FEATURE_MM) { told.push(`leaf ${W.toFixed(2)} mm wide built at the ${MIN_FEATURE_MM.toFixed(1)} mm assumed minimum feature`); W = MIN_FEATURE_MM; }
  // the arc law, finer than a scroll's step so each lobe is a dozen stations
  const n = Math.max(48, Math.ceil(L / 0.4), 12 * lobes);
  const ds = L / n;
  const pts = [[0, 0]], tan = [0], u = [0], kap = [leafKappa(0, L, side, curl)];
  let x = 0, y = 0, f = 0;
  for (let i = 1; i <= n; i++) {
    const sm = (i - 0.5) * ds, dphi = leafKappa(sm, L, side, curl) * ds, c = ds * sinc(dphi / 2);
    x += c * Math.cos(f + dphi / 2); y += c * Math.sin(f + dphi / 2); f += dphi;
    pts.push([x, y]); tan.push(f); u.push(i * ds); kap.push(leafKappa(i * ds, L, side, curl));
  }
  const nrm = tan.map((g) => [-Math.sin(g), Math.cos(g)]);
  const w = u.map((s, i) => leafWidth(s, L, W, kap[i], lobes));
  return { kind: 'leaf', pts, nrm, tan, u, kap, w, root: 0, info: { kind: 'leaf', L, wire: W, tip: MIN_FEATURE_MM, side, curl, lobes, told } };
}

/* A CLUSTER (P5): a group with two leaves LAPPING its lead scroll's root —
   one growing along each half (LEAF_LAYOUT), curling the way the scroll
   curls. A leaf is a stacked shell (Eva's ruling
   b on the critique: the height field is kept): a closed column from the
   back up to a crown LIFTED by the lead's own crown at its root, so where
   the two overlap the leaf lies over the scroll. A leaf must JOIN the lead
   (every approach a true overlap of the embed) and every other wire of the
   group it comes near; where it would graze or cross one it is shortened
   (×0.85, up to six times) and then dropped — told. */
export const LEAF_SIZE = [0.42, 0.35];   // the two leaves, × the lead's length (the longer on the longer half)
/* the two leaves: [curl side, angle off the lead's root tangent, length ×
   the lead]. The longer leaf grows along the longer half splayed 0.3 rad
   into the C's mouth; the shorter along the shorter half splayed 0.2 rad
   toward the back, both curling toward the mouth — the best of 256 layouts
   swept over 23 / 40 / 80 mm leads × 1 / 2 / 3 / 5 scrolls (mean leaf length
   0.83 of asked; a leaf into the mouth on the short half meets its volute). */
export const LEAF_LAYOUT = [[+1, 0.3, LEAF_SIZE[0]], [-1, Math.PI + 0.2, LEAF_SIZE[1]]];
export const LEAF_CROSS = MIN_FEATURE_MM / 2;
export function buildCluster(group, { size = 1, layout = LEAF_LAYOUT } = {}) {
  const lead = group[0].curve, r = lead.pts[lead.root];
  const others = group.slice(1).map((g) => g.curve);
  const told = [];
  const leaves = [];
  // the host: a JOINT (every approach a true overlap of the embed); every
  // other wire: clear by a feature, or a CROSSING — every approach under a
  // feature reaches an overlap of LEAF_CROSS (the leaf is held by its host,
  // so a crossing needs to be an overlap, never a near miss, not a joint)
  const fits = (lf) => joinsCleanly(lf, lead) && [...others, ...leaves].every((o) => wireClear(lf, o) >= MIN_FEATURE_MM || joinsCleanly(lf, o, LEAF_CROSS));
  layout.forEach(([side, angle, frac], k) => {
    let len = frac * size * lead.info.L, got = null;
    for (let q = 0; q < 7 && !got; q++, len *= 0.85) {
      const lf = placeCurve(buildLeaf({ length: len, width: LEAF_ASPECT * len, side }), { at: r, angle: lead.tan[lead.root] + angle });
      lf.info = { ...lf.info, hostWire: lead.info.wire, hostW: wAt(lead, lead.root), role: 'leaf', shortened: q };
      if (fits(lf)) got = lf;
    }
    if (got) { leaves.push(got); if (got.info.shortened) told.push(`leaf ${k + 1} shortened to ${(100 * 0.85 ** got.info.shortened).toFixed(0)}% — at full length it grazes another wire of the group`); }
    else told.push(`leaf ${k + 1} not built — it grazes another wire of the group at every length`);
  });
  return { leaves, told };
}

/* ------------------------------------------------------------------ */
/* Relief                                                              */
/* ------------------------------------------------------------------ */

/* The wire's cross-section, x 0..1 across, z 0..1 of its crown height:
   half-round is a true semicircle of radius t/2 standing on the base;
   round raises it on a wall of t/2, so the visible top is the upper half of
   a round wire of diameter t. */
export function wireProfile(shape = 'half-round') {
  if (shape === 'arris') return arrisProfile();
  if (shape === 'leaf') return leafProfile();
  const x = new Float64Array(WIRE_SAMPLES + 1), z = new Float64Array(WIRE_SAMPLES + 1);
  for (let i = 0; i <= WIRE_SAMPLES; i++) {
    x[i] = i / WIRE_SAMPLES;
    const c = Math.sqrt(Math.max(0, 1 - (2 * x[i] - 1) ** 2));
    z[i] = shape === 'half-round' ? c : 0.5 + 0.5 * c;
  }
  return { x, z, shape };
}
/* THE ARRIS (phase 3c, Eva's pick P3 from the critique sheet — the default
   carved section): a crisp spine down the stroke's middle with a shallow
   hollow either side, falling to the base at both edges, so the light
   catches a ridge and two shadowed channels the way a carved C-scroll does.
   u = |2x − 1|; z = (1 − u)^0.55 · (0.72 + 0.28 cos²(1.6 π u)) · dome^0.25
   (dome the semicircle). 16 samples across, so the spine is a vertex. */
export const ARRIS_SAMPLES = 16;
export function arrisProfile() {
  const x = new Float64Array(ARRIS_SAMPLES + 1), z = new Float64Array(ARRIS_SAMPLES + 1);
  for (let i = 0; i <= ARRIS_SAMPLES; i++) {
    x[i] = i / ARRIS_SAMPLES;
    const u = Math.abs(2 * x[i] - 1), dome = Math.sqrt(Math.max(0, 1 - u * u));
    z[i] = Math.max(0, (1 - u) ** 0.55 * (0.72 + 0.28 * Math.cos(Math.PI * u * 1.6) ** 2)) * dome ** 0.25;
  }
  return { x, z, shape: 'arris' };
}
/* THE LEAF's section (P4): a raised midrib on a cupped blade — the edges lift
   back up to half the rib so the lobes read as cupped, never as a flat plate. */
export const LEAF_SAMPLES = 16;
export function leafProfile() {
  const x = new Float64Array(LEAF_SAMPLES + 1), z = new Float64Array(LEAF_SAMPLES + 1);
  for (let i = 0; i <= LEAF_SAMPLES; i++) { x[i] = i / LEAF_SAMPLES; const u = 2 * x[i] - 1; z[i] = 0.28 + 0.5 * Math.exp(-((u / 0.12) ** 2)) + 0.22 * u ** 4; }
  return { x, z, shape: 'leaf' };
}
export const wireHeight = (t, shape) => (shape === 'round' ? t : t / 2);

/* The LOCAL wire width at station i (a constant wire: its one width). */
export const wAt = (c, i) => (c.w ? c.w[i] : c.info.wire);

/* A spine for bandSolid from a placed curve. */
export const scrollSpine = (c, id) => { const sp = { id, pts: c.pts, nrm: c.nrm, bandWidth: c.info.wire }; if (c.w) sp.widthScale = c.w.map((x) => x / c.info.wire); return sp; };
/* A tapered wire's crown thins with its width but never under the floor
   (nor above the body's crown): depthScale[i] = max(min(F, D)/D, w_i/t). */
export const crownScale = (c, depth) => { if (!c.w) return null; const fl = Math.min(MIN_FEATURE_MM, depth) / depth; return c.w.map((x) => Math.max(fl, x / c.info.wire)); };

/* Lay a list of placed curves into a mesh as closed wire solids standing on
   a base of `baseZ` (print mm; the vocabulary sheet stands them on a plate of
   that thickness). scale maps the curve's mm to print mm (1 on the sheet). */
export function scrollsIntoMesh(mesh, curves, { scale = 1, baseZ = 1, shape = 'half-round' } = {}) {
  const prof = wireProfile(shape);
  curves.forEach((c, i) => {
    const sp = scrollSpine(c, `scroll${i}`), depth = wireHeight(c.info.wire, shape) * scale, k = crownScale(c, depth);
    if (k) sp.depthScale = k;
    bandSolid(mesh, sp, prof, { scale, plateT: baseZ, reliefDepth: depth });
  });
  return mesh;
}

/* A stand-alone relief of scrolls (the vocabulary sheet's cells). */
export function scrollRelief(curves, opts = {}) {
  const mesh = scrollsIntoMesh(new Mesh(), curves, opts);
  return { positions: Float64Array.from(mesh.pos), indices: Uint32Array.from(mesh.idx), parts: mesh.parts, scale: opts.scale ?? 1 };
}

/* Two wires that JOIN: every run of a's stations within a feature of b
   (centreline distance less the half wires under F) reaches an overlap of
   at least EMBED_MM — the joint is a true overlap, and nowhere do the two
   come within a feature without joining (a graze prints as a web). */
export function joinsCleanly(a, b, depth = EMBED_MM) { return joinsFrom(a, b, depth) && joinsFrom(b, a, depth); }   // read from both wires
function joinsFrom(a, b, depth = EMBED_MM) {
  const half = (a.info.wire + b.info.wire) / 2, local = !!(a.w || b.w);
  let run = null;
  for (let i = 0; i < a.pts.length; i++) {
    const q = a.pts[i];
    let d = Infinity;
    if (local) for (let k = 0; k < b.pts.length - 1; k++) d = Math.min(d, segDist(q, b.pts[k], b.pts[k + 1]) - (wAt(a, i) + Math.max(wAt(b, k), wAt(b, k + 1))) / 2);
    else { for (let k = 0; k < b.pts.length - 1; k++) d = Math.min(d, segDist(q, b.pts[k], b.pts[k + 1])); d -= half; }
    if (d < MIN_FEATURE_MM) run = Math.min(run ?? Infinity, d);
    else if (run !== null) { if (run > -depth + 1e-9) return false; run = null; }
  }
  return run === null || run <= -depth + 1e-9;
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
  // local widths: d is the centreline distance LESS the two local half widths
  const near = (i) => { let m = Infinity, jm = -1; for (let j = 0; j < b.pts.length; j++) { const d = Math.hypot(a.pts[i][0] - b.pts[j][0], a.pts[i][1] - b.pts[j][1]) - (wAt(a, i) + wAt(b, j)) / 2; if (d < m) { m = d; jm = j; } } return [m, jm]; };
  const need = MIN_FEATURE_MM;
  const d = a.pts.map((_, i) => near(i));
  // the junction: the run of a's stations under `need` that contains a's
  // nearest approach
  let i0 = 0; for (let i = 1; i < d.length; i++) if (d[i][0] < d[i0][0]) i0 = i;
  let lo = i0, hi = i0;
  if (d[i0][0] < need) { while (lo > 0 && d[lo - 1][0] < need) lo--; while (hi < d.length - 1 && d[hi + 1][0] < need) hi++; }
  else { lo = i0 + 1; hi = i0; }   // no junction
  let gap = Infinity;
  for (let i = 0; i < d.length; i++) if (i < lo || i > hi) gap = Math.min(gap, d[i][0]);
  const web = hi >= lo ? Math.abs(a.u[hi] - a.u[lo]) : 0;
  return { gap, web, contact: d[i0][0] };
}

export { offsetCurve, EMBED_MM };

/* ================================================================== */
/* ORNAMENT — the scroll groups attached to a frame (phase 3a, step 2) */
/* ================================================================== */

/* Read §10 of docs/frame-charter.md first. The ornament is BUILT IN PRINT
   MILLIMETRES — the wire, its gaps and its embed are print features and the
   floors are print floors — from a frame model whose scale is its own: the
   FRAME's box sets the print scale (printHeight is the frame's height; the
   ornament may project past it, told), so turning the ornament on moves the
   frame by nothing.

   Placement (charter §10.4). Each anchor GROUP names the anchors on the RIGHT
   of the mirror line (x ≥ 0); the left is that geometry with x negated, to the
   double — the mirror is exact because it is never rebuilt. An anchor ON the
   axis (the crest, the bottom) takes a right half shifted along the edge until
   its nearest wire stands half a feature off the axis, so the pair stands a
   feature apart there and each half roots in the molding.

   Attachment. A group is laid with its lead C's MOUTH OUTWARD (its back, and
   the children budding from the back, toward the band), then pushed along the
   inward normal until its deepest wire edge is EMBED_MM inside the band's
   footprint. Every approach of a wire to the band is then either at least a
   feature clear or a TRUE embed (at least EMBED_MM deep): a graze — a wire
   under a feature from the band but not into it — would print as a web, so
   the group is pushed deeper until it becomes an embed, and the depth is
   reported. A group that would come within a feature of an already placed
   one (crest before bottom before corners before sides) is not built, told. */


/* The anchor groups per skeleton type: the RIGHT-hand anchors only. */
export const ORNAMENT_GROUPS = {
  arch: { crest: ['apex'], bottom: ['bottomCentre'], corners: ['springR'], sides: ['sideR'] },
  rect: { crest: ['topCentre'], bottom: ['bottomCentre'], corners: ['cornerTR', 'cornerBR'], sides: ['sideR'] },
  oval: { crest: ['topCentre'], bottom: ['bottomCentre'], sides: ['sideR'] },
};
export const ORNAMENT_ORDER = ['crest', 'bottom', 'corners', 'sides'];
export const GROUP_CONTROL = { crest: 'ornCrest', bottom: 'ornBottom', corners: 'ornCorners', sides: 'ornSides' };

const pip = (pt, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};

/* The frame's band footprints in PRINT mm, read off outerEdge / innerEdge
   (the owners of those boundaries): depth(pt) is the distance to the nearest
   footprint boundary, positive INSIDE a band and negative outside. */
export function bandRegion(model, scale) {
  const sc = (q) => [q[0] * scale, q[1] * scale];
  const regs = [], edges = [];
  for (const s of model.spines) {
    const o = outerEdge(s, s.bandWidth).map(sc), i = innerEdge(s, s.bandWidth).map(sc);
    if (s.closed) { regs.push({ o, i }); edges.push(o, i); }
    else { const poly = [...o, ...i.slice().reverse(), o[0]]; regs.push({ poly }); edges.push(poly); }
  }
  const inside = (pt) => regs.some((r) => (r.poly ? pip(pt, r.poly) : pip(pt, r.o) && !pip(pt, r.i)));
  const make = (segs) => {
    const dist2 = (pt) => { let m = Infinity; for (const [a, b] of segs) m = Math.min(m, segDist(pt, a, b)); return m; };
    return { depth: (pt) => (inside(pt) ? 1 : -1) * dist2(pt), inside };
  };
  const all = []; for (const e of edges) for (let k = 0; k < e.length - 1; k++) all.push([e[k], e[k + 1]]);
  const R = make(all);
  // the same region with only the boundary segments within r of a centre:
  // exact for every point whose nearest boundary is within that reach
  R.near = (c, r) => make(all.filter(([a, b]) => segDist(c, a, b) <= r));
  R.edges = edges;
  return R;
}

/* A rigid motion of a curve: an optional reflection of LOCAL x, a rotation
   by `angle`, a translation by `at`. Normals and tangents follow. */
function rigid(c, { at = [0, 0], angle = 0, mirrorX = false }) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const R = ([x, y]) => { if (mirrorX) x = -x; return [ca * x - sa * y, sa * x + ca * y]; };
  return { ...c, pts: c.pts.map((p) => { const q = R(p); return [q[0] + at[0], q[1] + at[1]]; }), nrm: c.nrm.map(R), tan: c.tan.map((f) => angle + (mirrorX ? Math.PI - f : f)) };
}
const shift = (c, d) => ({ ...c, pts: c.pts.map(([x, y]) => [x + d[0], y + d[1]]) });
/* THE mirror: x negated, the doubles never recomputed. */
export const mirrorCurve = (c) => ({ ...c, pts: c.pts.map(([x, y]) => [-x, y]), nrm: c.nrm.map(([x, y]) => [-x, y]), tan: c.tan.map((f) => Math.PI - f) });

/* A LOWER BOUND on wireClear, from the two wires' padded boxes (cached on
   the curve): the box gap less the two widest half wires. Where it already
   clears the bar, the exact O(n·m) reading is not needed. */
const boxOf = (c) => {
  if (c._box && c._box.pts === c.pts) return c._box;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, w = 0;
  c.pts.forEach(([x, y], i) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); w = Math.max(w, wAt(c, i)); });
  return (c._box = { pts: c.pts, x0, y0, x1, y1, w });
};
export function wireClearBound(a, b) {
  const A = boxOf(a), B = boxOf(b);
  const gx = Math.max(0, A.x0 - B.x1, B.x0 - A.x1), gy = Math.max(0, A.y0 - B.y1, B.y0 - A.y1);
  return Math.hypot(gx, gy) - (A.w + B.w) / 2;
}
/* The least clearance between two wires of DIFFERENT groups: centreline
   distance less the half wires, with no junction excused. */
export function wireClear(a, b) {
  let m = Infinity;
  if (a.w || b.w) {
    for (let i = 0; i < a.pts.length; i++) for (let k = 0; k < b.pts.length - 1; k++) m = Math.min(m, segDist(a.pts[i], b.pts[k], b.pts[k + 1]) - (wAt(a, i) + Math.max(wAt(b, k), wAt(b, k + 1))) / 2);
    return m;
  }
  for (const p of a.pts) for (let k = 0; k < b.pts.length - 1; k++) m = Math.min(m, segDist(p, b.pts[k], b.pts[k + 1]));
  return m - (a.info.wire + b.info.wire) / 2;
}

/* A group's contacts with the band: per curve, the runs of stations whose
   wire edge comes within a feature of the band (clearance c < F, where c is
   the distance outside the footprint less the half wire); each run's deepest
   point must be a true embed (c ≤ −EMBED_MM) or it is a graze. */
export function bandContacts(curves, region) {
  const runs = [];
  curves.forEach((c, ci) => {
    const cl = c.pts.map((p, i) => -region.depth(p) - wAt(c, i) / 2);
    let run = null;
    cl.forEach((v, i) => {
      if (v < MIN_FEATURE_MM) { if (!run) run = { curve: ci, from: i, to: i, min: v }; run.to = i; run.min = Math.min(run.min, v); }
      else if (run) { runs.push(run); run = null; }
    });
    if (run) runs.push(run);
  });
  return runs;
}

/* Push a group along `inward` until its deepest wire edge is EMBED_MM inside
   the band, then on until no contact run is a graze. Returns the moved curves
   and the push (mm). */
function seat(curves, inward, region, bracket) {
  const deepest = (cs) => Math.min(...cs.map((c) => Math.min(...c.pts.map((p, i) => -region.depth(p) - wAt(c, i) / 2))));
  const at = (d) => curves.map((c) => shift(c, [inward[0] * d, inward[1] * d]));
  // the push at which the deepest wire edge is exactly EMBED_MM in. The
  // clearance is NOT monotone in the push (pushed through the band a wire
  // comes out over the opening), so the crossing NEAREST the anchor is
  // found by walking from 0 in quarter-millimetre steps, then bisected
  const deep = (d) => deepest(at(d)) <= -EMBED_MM;
  const STEP = 0.25, dirn = deep(0) ? -1 : 1;
  let a = 0, b = null;
  for (let k = 1; k * STEP <= bracket; k++) { const x = dirn * k * STEP; if (deep(x) !== deep(a)) { b = x; break; } a = x; }
  if (b === null) return { curves, push: NaN };
  let lo = Math.min(a, b), hi = Math.max(a, b);          // deep(hi) is true
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (deep(m)) hi = m; else lo = m; }
  let d = hi, cs = at(d);
  for (let k = 0; k < 40; k++) {
    const g = bandContacts(cs, region).filter((r) => r.min > -EMBED_MM);
    if (!g.length) break;
    d += Math.max(...g.map((r) => r.min)) + EMBED_MM + 1e-6;
    cs = at(d);
  }
  return { curves: cs, push: d };
}

/* The outer-edge point and outward normal of a frame at an anchor, print mm. */
function anchorFrame(model, anchor, scale) {
  const s = model.spines.find((q) => q.id === anchor.spine), w = s.bandWidth;
  const nl = Math.hypot(anchor.nrm[0], anchor.nrm[1]), out = [-anchor.nrm[0] / nl, -anchor.nrm[1] / nl];
  let Po;
  if (anchor.index == null) Po = [anchor.pt[0] - anchor.nrm[0] * w / 2, anchor.pt[1] - anchor.nrm[1] * w / 2];
  else Po = offsetCurve(s, -w / 2)[anchor.index];
  return { Po: [Po[0] * scale, Po[1] * scale], out };
}

/* ================================================================== */
/* RUNNING CHAINS (phase 3d, Eva's ruling 4B)                          */
/* ================================================================== */

/* A RUN is a stretch of band between two consecutive right-hand anchors,
   read as a path at depth δ inside the band's OUTER edge — offsetCurve, the
   one producer of every parallel curve, at d = −w/2 + δ — in print mm, cut
   between the two anchors' own points and resampled by arc length. The
   chain lies in that path's frame: x its arc length from the run's first
   anchor, y outward (−nrm: every spine's normal points into the opening). */
export const CHAIN_RUNS = {
  arch: [
    { id: 'head', spine: 'head', from: 'apex', to: 'springR', control: 'ornCrest' },
    { id: 'jamb', spine: 'jambR', from: 'springR', to: 'sillR', control: 'ornSides' },
  ],
  rect: [
    { id: 'top', spine: 'frame', from: 'topCentre', to: 'cornerTR', control: 'ornCrest' },
    { id: 'side', spine: 'frame', from: 'cornerTR', to: 'cornerBR', control: 'ornSides' },
    { id: 'bottom', spine: 'frame', from: 'cornerBR', to: 'bottomCentre', control: 'ornBottom' },
  ],
  oval: [
    { id: 'upper', spine: 'frame', from: 'topCentre', to: 'sideR', control: 'ornCrest' },
    { id: 'lower', spine: 'frame', from: 'sideR', to: 'bottomCentre', control: 'ornBottom' },
  ],
};
export const CHAIN_STEP_MM = 0.5;
export const CHAIN_LEAD = 2.5;       // × molding width: the lead the element count is read against (the scale slider's own default, so every default measurement holds)
export const CHAIN_SEAT = 0.3;       // the elements' backs lie this share of the molding width inside its outer edge
export const CHAIN_PATH_SMOOTH = 24;

const nearestOn = (poly, cum, q) => {
  let best = Infinity, at = 0;
  for (let k = 0; k < poly.length - 1; k++) {
    const a = poly[k], b = poly[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
    if (d < best) { best = d; at = cum[k] + t * (cum[k + 1] - cum[k]); }
  }
  return at;
};
const pointAt = (poly, cum, s) => {
  let k = 0; while (k < cum.length - 2 && cum[k + 1] < s) k++;
  const t = (s - cum[k]) / Math.max(1e-12, cum[k + 1] - cum[k]);
  return [poly[k][0] + t * (poly[k + 1][0] - poly[k][0]), poly[k][1] + t * (poly[k + 1][1] - poly[k][1])];
};

/* The run's path: { pts, s (arc length), tan, out (outward unit normal),
   length } in print mm, from its first anchor to its second. */
export function runPath(model, run, scale, depth) {
  const sp = model.spines.find((q) => q.id === run.spine), w = sp.bandWidth;
  const full = offsetCurve(sp, -w / 2 + depth / scale);
  const raw = full.filter(Boolean).map(([x, y]) => [x * scale, y * scale]);
  const poly = sp.closed ? [...raw, raw[0]] : raw;
  const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]));
  const A = model.info.anchors[run.from], B = model.info.anchors[run.to];
  // an anchor that is a VERTEX of this spine maps to that vertex's own offset
  // point (at a corner: the mitre, where the two edges meet); any other
  // anchor projects onto the path
  const target = (Q) => (Q.spine === run.spine && Q.index != null && full[Q.index] ? [full[Q.index][0] * scale, full[Q.index][1] * scale] : [Q.pt[0] * scale, Q.pt[1] * scale]);
  let sa = nearestOn(poly, cum, target(A)), sb = nearestOn(poly, cum, target(B));
  // an anchor ON the axis: the run starts where the path crosses x = 0 (the
  // join's own trimming leaves the nearest vertex a hair past it)
  const onAxis = (Q) => Math.abs(Q.pt[0]) < 1e-9;
  const crossing = (s0) => { let best = s0, bd = Infinity; for (let k = 0; k < poly.length - 1; k++) { const a = poly[k], b = poly[k + 1]; if ((a[0] <= 0) !== (b[0] <= 0) || a[0] === 0) { const t = a[0] === b[0] ? 0 : a[0] / (a[0] - b[0]); const q = cum[k] + t * (cum[k + 1] - cum[k]); if (Math.abs(q - s0) < bd) { bd = Math.abs(q - s0); best = q; } } } return best; };
  if (onAxis(A)) sa = crossing(sa);
  if (onAxis(B)) sb = crossing(sb);
  const total = cum[cum.length - 1];
  // a closed loop's run may cross the seam; walk the short way round on the
  // right half (x ≥ 0)
  let dirn = sb >= sa ? 1 : -1, len = Math.abs(sb - sa);
  if (sp.closed && len > total / 2) { len = total - len; dirn = -dirn; }
  const n = Math.max(2, Math.ceil(len / CHAIN_STEP_MM) + 1);
  const at = (k) => { let q = sa + dirn * len * k / (n - 1); q = sp.closed ? ((q % total) + total) % total : Math.min(total, Math.max(0, q)); return pointAt(poly, cum, q); };
  const pts = []; for (let k = 0; k < n; k++) pts.push(at(k));
  // the band's polyline kinks at every vertex (an arc sampled every ~2 mm),
  // and a carved width read off mapped curvature would jitter at each one:
  // smooth the resampled path (ends held). 24 passes at 0.5 mm move a 46 mm
  // arc by ~0.03 mm; a straight run is a fixed point
  for (let it = 0; it < CHAIN_PATH_SMOOTH; it++) { const q = pts.map((p) => p.slice()); for (let k = 1; k < n - 1; k++) { pts[k] = [(q[k - 1][0] + 2 * q[k][0] + q[k + 1][0]) / 4, (q[k - 1][1] + 2 * q[k][1] + q[k + 1][1]) / 4]; } }
  const tan = pts.map((_, k) => { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; });
  // outward: the side away from the spine's own (inward) normal
  const n0 = sp.nrm[0];
  let out = tan.map(([tx, ty]) => [ty, -tx]);
  const mid = Math.floor(n / 2), probe = [pts[mid][0] + out[mid][0], pts[mid][1] + out[mid][1]];
  const inside = offsetCurve(sp, 0).filter(Boolean).map(([x, y]) => [x * scale, y * scale]);
  const dCentre = (q) => Math.min(...inside.map((c) => Math.hypot(q[0] - c[0], q[1] - c[1])));
  if (dCentre(probe) < dCentre(pts[mid])) out = out.map(([x, y]) => [-x, -y]);
  void n0;
  const s = pts.map((_, k) => len * k / (n - 1));
  return { pts, s, tan, out, length: len };
}

/* A curve laid in a run's frame: local x is arc length along the path from
   x0, local y the outward offset. Points, tangents and normals are re-read
   off the mapped polyline; a CARVED curve's width is re-derived from the
   MAPPED curvature (the law is the curve's own, wherever it lies). */
export function mapToPath(c, path, x0 = 0) {
  const S = path.s, L = path.length, n = S.length;
  const frameAt = (x) => {
    const q = Math.min(L, Math.max(0, x)), k = Math.min(n - 2, Math.floor(q / L * (n - 1))), t = (q - S[k]) / Math.max(1e-12, S[k + 1] - S[k]);
    const P = [path.pts[k][0] + t * (path.pts[k + 1][0] - path.pts[k][0]), path.pts[k][1] + t * (path.pts[k + 1][1] - path.pts[k][1])];
    const N = [path.out[k][0] + t * (path.out[k + 1][0] - path.out[k][0]), path.out[k][1] + t * (path.out[k + 1][1] - path.out[k][1])], l = Math.hypot(N[0], N[1]);
    // past either end the path continues straight along its end tangent
    const over = x - q, T = [N[1] / l, -N[0] / l], sgn = Math.sign(path.tan[k][0] * T[0] + path.tan[k][1] * T[1]) || 1;
    return { P: [P[0] + over * sgn * T[0], P[1] + over * sgn * T[1]], N: [N[0] / l, N[1] / l] };
  };
  const pts = c.pts.map(([x, y]) => { const f = frameAt(x0 + x); return [f.P[0] + y * f.N[0], f.P[1] + y * f.N[1]]; });
  const m = pts.length;
  const tanA = pts.map((_, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  // UNWRAPPED (atan2 wraps at ±π): selfGap finds a coil by stations whose
  // tangents differ by a half turn or more, and a wrapped angle hides a
  // stretch that turned a whole turn — the mapped coil's check went blind
  // exactly where a coil closes
  for (let i = 1; i < m; i++) { while (tanA[i] - tanA[i - 1] > Math.PI) tanA[i] -= 2 * Math.PI; while (tanA[i] - tanA[i - 1] < -Math.PI) tanA[i] += 2 * Math.PI; }
  // keep the source's sense of left: the mapped normal is the source normal
  // carried through the frame, re-orthogonalised against the new tangent
  const nrm = tanA.map((f, i) => { const nn = [-Math.sin(f), Math.cos(f)]; const src = c.nrm[i], fr = frameAt(x0 + c.pts[i][0]); const tl = [fr.N[1], -fr.N[0]]; const carried = [src[0] * tl[0] + src[1] * fr.N[0], src[0] * tl[1] + src[1] * fr.N[1]]; return nn[0] * carried[0] + nn[1] * carried[1] >= 0 ? nn : [-nn[0], -nn[1]]; });
  const out = { ...c, pts, nrm, tan: tanA };
  if (c.info && c.info.carved && c.w) {
    const cap = c.info.wire;
    const circ = (a, b, q) => { const A2 = Math.hypot(b[0] - q[0], b[1] - q[1]), B2 = Math.hypot(a[0] - q[0], a[1] - q[1]), C2 = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / 2; return ar > 1e-15 ? A2 * B2 * C2 / (4 * ar) : Infinity; };
    out.w = pts.map((_, i) => { const j = Math.min(Math.max(i, 1), m - 2); return carvedWidth(circ(pts[j - 1], pts[j], pts[j + 1]), cap); });
    out.kap = pts.map((_, i) => { const j = Math.min(Math.max(i, 1), m - 2); return 1 / circ(pts[j - 1], pts[j], pts[j + 1]); });
  }
  return out;
}

/* THE CHAIN on one run (Eva's ruling 4B: C–S–C, sized to the run). A run of
   length L takes N = max(3, round(L / lead)) ELEMENTS laid TANGENTIALLY
   along the band, each over a footprint L / N: a C at each junction and S's
   between. Every element is a carved scroll whose BACK lies on the molding
   (its root at the path, which runs `depth` inside the outer edge) and whose
   volutes curl outward — an S's second volute curls back over the molding.
   A C faces its junction: its SHORT half (balance 0.6) toward the run's
   end. Footprints are measured off the built curve (its x extent) and the
   element scaled so footprint = L / N less a feature between neighbours.
   Leaves lap each element's root, one either side. Choices made without a
   ruling, each one constant: the element count law, the leaf layout. */
export const CHAIN_ELEMENT_ASPECT = { C: 0.46, S: 0.52 };   // a scroll's x extent ÷ its length (measured, carved, tightness ½)
export const CHAIN_S_TILT = 0.0;                            // rad
export const CHAIN_JUNCTION = 0.35;     // × a footprint: a run stops this short of an INTERIOR junction (its leaf stands there)
export const CHAIN_MARGIN = 0.1;        // mm: the build's clearances stand this far past F (the gate reads the emitted walls, ~0.07 mm off a centreline estimate)
export const CHAIN_GAP = 2;             // × MIN_FEATURE_MM: an element's approach to the band is an embed or at least this far off (no visible slit)
export function buildChain(path, { moldW, lead, density = 3, tightness = 0.5, leaves = true, leafSize = 0.42, startAxis = false, endAxis = false, region = null, opening = null }) {
  const F = MIN_FEATURE_MM, told = [];
  // the junction allowances: at the AXIS the two mirrored start C's stand a
  // feature apart (F/2 each side); at an interior junction the run stops
  // CHAIN_JUNCTION of a footprint short, for the junction's leaf
  const N = Math.max(3, Math.round(path.length / lead * density / 3));
  let foot = path.length / N;
  // (at the AXIS too: the palmette stands between the two start C's)
  const j0 = CHAIN_JUNCTION * foot, j1 = CHAIN_JUNCTION * foot;
  const L = path.length - j0 - j1; foot = L / N;
  // the elements, LAID SEQUENTIALLY in the path's own geometry: each pushed
  // along until it clears the one before (and, at the axis, its own mirror)
  // by a feature, read off the MAPPED curves — a curved run compresses
  // whatever lies over the molding (y < 0) — and, when the chain overruns
  // the run, every element's length scaled down and the chain laid again
  const kinds = []; for (let k = 0; k < N; k++) kinds.push(k === 0 || k === N - 1 ? 'C' : 'S');
  // NO VISIBLE GAP (Eva's 2B): every stretch of an element within
  // CHAIN_GAP × F of the band's footprint must reach an embed (it is one
  // contact, rooted) — an approach that comes near and does not touch reads
  // as a slit. Read on the mapped curve; the element is pushed onto the
  // molding (−y) until it holds
  const slit = (on) => (region ? slitWorst(on, region) : -Infinity);
  const make = (k, len, x) => {
    const kind = kinds[k];
    let c = buildScroll({ kind, length: len, tightness, wire: carvedCap(len), balance: 0.6, carved: true });
    const place = (cc, dy) => { const local = shift(rigid(cc, { at: [0, 0], angle: 0, mirrorX: kind === 'C' && k === N - 1 }), [x, dy]); const on = mapToPath(local, path, 0); on.local = local; return on; };
    let dy = 0, on = place(c, dy);
    // the coils, re-read after mapping (a curved run can close them), at
    // the element's seat — read again once the seat moves: fewer turns until
    // a feature (and the margin) apart, told
    const holdCoils = () => {
      if (selfGap(on).gap >= F + CHAIN_MARGIN) return;
      let lo = 0, hi = c.info.turnsHeld;
      for (let it = 0; it < 16; it++) { const m = (lo + hi) / 2; if (selfGap(place(buildScroll({ kind, length: len, turns: m, wire: carvedCap(len), balance: 0.6, carved: true }), dy)).gap >= F + CHAIN_MARGIN) lo = m; else hi = m; }
      const held = c.info.turnsHeld;
      c = buildScroll({ kind, length: len, turns: lo, wire: carvedCap(len), balance: 0.6, carved: true }); on = place(c, dy);
      told.push(`element ${k + 1}: volutes held at ${lo.toFixed(2)} of ${held.toFixed(2)} turns — laid on the run, a closer coil leaves a gap under the feature`);
    };
    holdCoils();
    // and NOTHING IN THE OPENING: an element pushed onto the molding stops at
    // its inner edge — pushed back out by its deepest intrusion; an element
    // that cannot hold both is given way (told by the caller)
    const intrusion = (o) => { if (!opening) return 0; let m = 0; o.pts.forEach((q, i) => { if (opening(q)) m = Math.max(m, -region.depth(q) + wAt(o, i) / 2); }); return m; };
    let held = false;
    for (let it = 0; it < 16; it++) {
      const o = intrusion(on); if (o > 0) { dy += o + 0.05; on = place(c, dy); continue; }
      const w = slit(on); if (!(w > -Infinity)) { held = true; break; }
      dy -= w + EMBED_MM + 1e-3; on = place(c, dy);
    }
    if (held) { holdCoils(); held = !(intrusion(on) > 0) && !(slit(on) > -Infinity); }
    // fewer turns cannot undo a fold the PATH makes (an element laid across a
    // corner sharper than itself): if its coils still close, it gives way
    on.unseated = !held ? 'it cannot lie on the molding without reaching into the opening or leaving a gap' : selfGap(on).gap < F + CHAIN_MARGIN ? 'laid across the band\'s corner it would fold onto itself' : null;
    on.info = { ...c.info, role: kind === 'C' ? (k === 0 ? 'start' : 'end') : 'link', seatPush: -dy };
    on.localY = on.local.pts.map((q) => q[1]); on.chainIndex = k; on.len = len;
    return on;
  };
  const extentX = (on) => { let lo = Infinity, hi = -Infinity; on.local.pts.forEach(([x], i) => { const h = wAt(on, i) / 2; lo = Math.min(lo, x - h); hi = Math.max(hi, x + h); }); return [lo, hi]; };
  const clearOf = (on, prev) => (prev ? wireClear(on, prev) : startAxis ? wireClear(on, mirrorCurve(on)) : Infinity);
  const lay = (lens) => {
    const out = []; let x = j0;
    for (let k = 0; k < N; k++) {
      // the first guess: the extent's left end at x
      let c = make(k, lens[k], 0); const [lo] = extentX(c); let at = x - lo; c = make(k, lens[k], at);
      const prev = out[k - 1] || null;
      // push on until a feature clear (a step growing from 2 % of a footprint,
      // then bisected sixteen times — 2^-16 of the last step)
      let a = at, b = at;
      if (clearOf(c, prev) < F + CHAIN_MARGIN) { let step = 0.02 * foot; for (let it = 0; it < 40 && clearOf(c, prev) < F + CHAIN_MARGIN; it++) { a = b; b += step; step *= 1.6; c = make(k, lens[k], b); } for (let it = 0; it < 16; it++) { const m = (a + b) / 2, cm = make(k, lens[k], m); if (clearOf(cm, prev) >= F + CHAIN_MARGIN) { b = m; c = cm; } else a = m; } }
      out.push(c); x = extentX(c)[1];
    }
    return { out, end: x };
  };
  let lens = kinds.map((kind) => (foot - F) / CHAIN_ELEMENT_ASPECT[kind]);
  let laid = lay(lens);
  for (let it = 0; it < 6 && laid.end > path.length - j1 + 1e-6; it++) { const f = (path.length - j1 - j0) / (laid.end - j0); lens = lens.map((l) => l * Math.min(0.995, f)); laid = lay(lens); }
  if (laid.end > path.length - j1 + 1e-6) told.push(`the chain overruns its run by ${(laid.end - path.length + j1).toFixed(2)} mm`);
  const curves = [];
  for (const on of laid.out) {
    if (on.unseated) { told.push(`element ${on.chainIndex + 1} not built — ${on.unseated}`); continue; }
    curves.push(on);
    if (leaves) {
      const k = on.chainIndex, len = on.len, r = on.local.pts[on.local.root];
      for (const [side, ang, frac] of [[+1, 0.35, leafSize], [-1, Math.PI - 0.35, leafSize * 0.85]]) {
        const make2 = (ll) => {
          const lf0 = buildLeaf({ length: ll, width: LEAF_ASPECT * ll, side });
          const lfl = rigid(lf0, { at: r, angle: ang });
          const lon = mapToPath(lfl, path, 0);
          lon.info = { ...lf0.info, hostWire: on.info.wire, hostW: wAt(on, on.root), role: 'leaf' };
          lon.localY = lfl.pts.map((q) => q[1]);
          lon.chainIndex = k;
          lon.remake = (f) => make2(ll * f);
          return lon;
        };
        curves.push(make2(frac * len));
      }
    }
  }
  return { curves, told, n: N, foot };
}

/* SEATED ON THE MOLDING (Eva's ruling 2B): a chain curve's crown stands on
   the molding's own height under it. A row at local y (its centre's offset
   outward from the path, which runs `depth` inside the outer edge) spanning
   its own width w covers the band across-fraction [(depth − y − w/2)/W,
   (depth − y + w/2)/W] (0 at the outer edge); its lift is the profile's
   HIGHEST z over that span × the relief depth, so the crown clears the
   molding under every part of it. Past the outer edge the lift falls
   linearly to the plate over one stem width (the ornament steps down off
   the molding rather than dropping off it). */
/* The worst SLIT of a wire against the band: over every stretch within
   G of the band's footprint that reaches no embed, the nearest approach
   (−Infinity when there is none). Read at BOTH G = CHAIN_GAP × F and G = F:
   a stretch that leaves the band and curls back is one run at 2F and two at
   F, and the second is a graze the coarser reading alone would let through. */
export function slitWorst(c, region) {
  let worst = -Infinity;
  for (const G of [CHAIN_GAP * MIN_FEATURE_MM, MIN_FEATURE_MM]) {
    let run = null;
    c.pts.forEach((q, i) => { const cl = -region.depth(q) - wAt(c, i) / 2; if (cl < G) { if (!run) run = { min: cl }; run.min = Math.min(run.min, cl); } else if (run) { if (run.min > -EMBED_MM) worst = Math.max(worst, run.min); run = null; } });
    if (run && run.min > -EMBED_MM) worst = Math.max(worst, run.min);
  }
  return worst;
}

/* THE MOLDING'S OWN HEIGHT FIELD (phase 3d, Eva's 2B): the frame's bands
   built by the relief's own bandSolid into a scratch mesh (print mm, plate 0)
   and their top grids rasterised — so a seat reads the surface the STL will
   carry, the highest band where bands embed, at every junction, jog and ear,
   not the run's own profile in the run's own frame (which drifts wherever
   the band does not follow the path). Returns q → height above the plate,
   −Infinity off every band. */
export function moldingHeightField(model, scale) {
  const p = model.params, mesh = new Mesh();
  const reliefDepth = p.moldingDepth * scale * p.reliefScale;
  for (const sp of model.spines) bandSolid(mesh, sp, model.prof, { scale, plateT: 0, reliefDepth });
  const P = mesh.pos, cell = 2, grid = new Map(), tris = [], key = (i, j) => i * 100003 + j;
  for (const bp of mesh.parts) {
    const last = bp.closed ? bp.V : bp.V - 1;
    for (let v = 0; v < last; v++) for (let c = 0; c < bp.C - 1; c++) {
      const nv = (v + 1) % bp.V, ids = [bp.T(v, c), bp.T(nv, c), bp.T(nv, c + 1), bp.T(v, c + 1)];
      for (const t of [[ids[0], ids[1], ids[2]], [ids[0], ids[2], ids[3]]]) {
        const q = t.map((ix) => [P[3 * ix], P[3 * ix + 1], P[3 * ix + 2]]), ti = tris.push(q) - 1;
        const xs = q.map((u) => u[0]), ys = q.map((u) => u[1]);
        for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...ys) / cell); j <= Math.floor(Math.max(...ys) / cell); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(ti); }
      }
    }
  }
  return ([x, y]) => {
    let h = -Infinity;
    for (const ti of grid.get(key(Math.floor(x / cell), Math.floor(y / cell))) || []) {
      const [A, B, C] = tris[ti], d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(d) < 1e-14) continue;
      const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d, l3 = 1 - l1 - l2;
      if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) h = Math.max(h, l1 * A[2] + l2 * B[2] + l3 * C[2]);
    }
    return h;
  };
}
/* The seat READ AT THE EMITTED COLUMNS: the wire's own solid built (by the
   relief's bandSolid, into a scratch mesh) on its first seat, and every row
   lifted to the highest molding under that row's own top vertices — the
   positions the STL carries, which stand off the centreline's normal by the
   spine's own offset curves (a wire whose seat was read on the centreline's
   span cleared the molding by 0.989 mm where its crown is the 1 mm floor).
   An embed row beyond either end lifts the end row it extends. */
export function seatEmitted(H, spine, prof, lift, depth) {
  const mesh = new Mesh();
  bandSolid(mesh, { ...spine, baseLift: lift }, prof, { scale: 1, plateT: 0, reliefDepth: depth });
  const part = mesh.parts[0], P = mesh.pos, n = lift.length, out = lift.slice();
  for (let v = 0; v < part.V; v++) {
    const i = Math.min(n - 1, Math.max(0, v - part.rowOffset));
    // read at the vertex AND its mirror image: the raster is not symmetric to
    // the bit, and a seat read on one side only would break the mirror (OR5)
    for (let c = 0; c < part.C; c++) { const ix = 3 * part.T(v, c); out[i] = Math.max(out[i], H([P[ix], P[ix + 1]]), H([-P[ix], P[ix + 1]])); }
  }
  return out;
}
/* The highest molding under a wire's row: the height field across the
   row's whole span (its local width, padded a tenth for the emitted columns'
   own offset), at 17 stations. */
export const SEAT_PAD = 0.1;
export function seatOn(H, c, i) {
  const w = wAt(c, i) * (1 + SEAT_PAD), q = c.pts[i], n = c.nrm[i];
  let m = -Infinity;
  for (let k = 0; k <= 16; k++) { const t = (k / 16 - 0.5) * w; m = Math.max(m, H([q[0] + t * n[0], q[1] + t * n[1]])); }
  return m;
}

export function moldingLift(y, w, { depth, moldW, prof, reliefDepth, ramp }) {
  const zAt = (f) => { const x = prof.x; if (f <= x[0]) return prof.z[0]; for (let k = 1; k < x.length; k++) if (f <= x[k]) return prof.z[k - 1] + (prof.z[k] - prof.z[k - 1]) * (f - x[k - 1]) / (x[k] - x[k - 1]); return prof.z[x.length - 1]; };
  const a = (depth - y - w / 2) / moldW, b = (depth - y + w / 2) / moldW;
  if (b <= 0) { const over = -b * moldW; return zAt(0) * reliefDepth * Math.max(0, 1 - over / ramp); }
  let m = 0; const lo = Math.max(0, a), hi = Math.min(1, b);
  for (let k = 0; k <= 16; k++) m = Math.max(m, zAt(lo + (hi - lo) * k / 16));
  for (let k = 0; k < prof.x.length; k++) if (prof.x[k] >= lo && prof.x[k] <= hi) m = Math.max(m, prof.z[k]);
  return m * reliefDepth;
}

/* SETTLING the chains: the contact rules the groups obey, applied to every
   wire of every chain, both sides, and the junctions'. Scroll elements: a
   feature clear of every other scroll element — a later element that is not
   gives way (told). Leaves: a JOINT with their host element (the embed), and
   with every other wire either a feature clear or a CROSSING (every approach
   under a feature an overlap of LEAF_CROSS); a leaf that is neither is
   shortened 15 % at a time from its root, up to seven times, then dropped
   (told). A junction or axis leaf has no host: the crossing rule throughout.
   The mirror is re-taken from each settled right half, so it stays exact. */
function settleChains(groups, told, region, opening) {
  const F = MIN_FEATURE_MM, Fm = F + CHAIN_MARGIN;
  const clear = (a, b) => (wireClearBound(a, b) >= Fm ? Infinity : wireClear(a, b));
  const near = (c) => { const B = boxOf(c); return region.near([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2], Math.hypot(B.x1 - B.x0, B.y1 - B.y0) / 2 + B.w + 3 * F); };
  // a leaf's own band rule: no slit (every approach within CHAIN_GAP × F an
  // embed) and nothing in the opening
  const bandOK = (c) => !c.pts.some((q) => opening(q)) && !(slitWorst(c, near(c)) > -Infinity);
  const isLeaf = (c) => c.kind === 'leaf';
  // the scroll elements first, in build order, against everything kept
  const keptScroll = [];
  for (const g of groups) {
    const keep = [];
    for (const c of g.curves) {
      if (isLeaf(c)) { keep.push(c); continue; }
      const mates = [c, ...(g.mirrored.length ? [mirrorCurve(c)] : [])];
      let worst = Infinity; for (const m of mates) for (const o of keptScroll) worst = Math.min(worst, clear(m, o));
      if (g.mirrored.length) worst = Math.min(worst, clear(c, mates[1]));
      if (worst < Fm) { told.push(`chain ${g.group}: element ${c.chainIndex + 1} not built — it would come ${worst.toFixed(2)} mm from another`); continue; }
      keep.push(c); keptScroll.push(...mates);
    }
    g.curves = keep;
  }
  // then the leaves, against every scroll and every leaf already kept — the
  // junction MOTIFS first (a chain's leaf gives way to a motif, never the
  // reverse: the motif is what marks the junction)
  const keptLeaves = [];
  const MOTIF = new Set(['axis', 'palmette', 'rosette']);
  for (const g of [...groups.filter((q) => MOTIF.has(q.group)), ...groups.filter((q) => !MOTIF.has(q.group))]) {
    const keep = [];
    for (const c of g.curves) {
      if (!isLeaf(c)) { keep.push(c); continue; }
      const host = c.chainIndex != null ? g.curves.find((h) => !isLeaf(h) && h.chainIndex === c.chainIndex) : null;
      if (c.chainIndex != null && !host) continue;               // its element gave way
      let got = null, q = 0, cur = c;
      for (; q < 8 && !got; q++) {
        const mates = [cur, ...(g.mirrored.length ? [mirrorCurve(cur)] : [])];
        const others = [...keptScroll, ...keptLeaves].filter((o) => o !== host);
        const ok = bandOK(cur) && (host ? joinsCleanly(cur, host) : true) && mates.every((m) => others.every((o) => o === host || clear(m, o) >= Fm || joinsCleanly(m, o, LEAF_CROSS)))
          && (mates.length < 2 || clear(mates[0], mates[1]) >= Fm || joinsCleanly(mates[0], mates[1], LEAF_CROSS));
        if (ok) { got = cur; break; }
        if (c.remake) { cur = c.remake(0.85 ** (q + 1)); if (c.finish) c.finish(cur); } else cur = truncateCurve(cur, 0.85);
      }
      if (!got) { told.push(`chain ${g.group}: a leaf not built — it grazes another wire at every length`); continue; }
      if (q) told.push(`chain ${g.group}: a leaf shortened to ${(100 * 0.85 ** q).toFixed(0)}% — at full length it grazes another wire`);
      keep.push(got); keptLeaves.push(got, ...(g.mirrored.length ? [mirrorCurve(got)] : []));
    }
    g.curves = keep;
    g.mirrored = g.mirrored.length || g.group !== 'axis' ? keep.map(mirrorCurve) : [];
  }
}
/* A curve cut to a fraction of its stations from its root (row 0): every
   per-station array sliced alike. */
function truncateCurve(c, frac) {
  const n = Math.max(3, Math.round(c.pts.length * frac));
  const cut = (a) => (Array.isArray(a) ? a.slice(0, n) : a);
  const out = { ...c, pts: c.pts.slice(0, n), nrm: c.nrm.slice(0, n), tan: c.tan.slice(0, n) };
  for (const k of ['w', 'kap', 'u', 'localY', 'lift']) if (c[k]) out[k] = cut(c[k]);
  return out;
}

/* The ornament as RUNNING CHAINS: one chain per run whose control is on,
   mirrored; the same record ornamentFor returns. */
export function chainsFor(model, { triBudget = FRAME_TRI_BUDGET } = {}) {
  const p = model.params, kind = model.info.kind;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  // a chain is sized by its RUN (its elements share the run's length), so
  // the scale slider is the groups' and is hidden here; the lead the element
  // count is read against is CHAIN_LEAD × the molding width
  const moldW = p.moldingWidth * scale, length = CHAIN_LEAD * p.moldingWidth * scale;
  const groups = [], ends = [];
  // the OPENING: inside the frame's silhouette (plateOutline, its owner) and
  // in no band's footprint
  const sil = plateOutline(model).map(([x, y]) => [x * scale, y * scale]);
  const opening = (q) => pip(q, sil) && !region.inside(q);
  const H = moldingHeightField(model, scale);
  const depth = CHAIN_SEAT * moldW;
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;
  for (const run of CHAIN_RUNS[kind] || []) {
    if (p[run.control] !== 'on') continue;
    if (!model.info.anchors[run.from] || !model.info.anchors[run.to]) { told.push(`no ${!model.info.anchors[run.from] ? run.from : run.to} on this frame — its ${run.id} chain is not built`); continue; }
    const path = runPath(model, run, scale, depth);
    const axis = (id) => Math.abs(model.info.anchors[id].pt[0]) < 1e-9;
    const ch = buildChain(path, { moldW, lead: length, density: p.ornDensity, tightness: p.ornTightness, leaves: p.ornLeaves === 'on', leafSize: p.ornLeafSize, startAxis: axis(run.from), endAxis: axis(run.to), region: region.near(path.pts[Math.floor(path.pts.length / 2)], path.length + 6 * length), opening });
    ends.push({ id: run.from, P: path.pts[0], N: path.out[0], axis: axis(run.from), foot: ch.foot, path, at: 0 }, { id: run.to, P: path.pts.at(-1), N: path.out.at(-1), axis: axis(run.to), foot: ch.foot, path, at: path.length });
    const reliefDepth = p.moldingDepth * scale * p.reliefScale;
    const lp = { depth, moldW, prof: model.prof, reliefDepth, ramp: 0.35 * moldW };
    const finish = (c) => {
      // on the molding's own height field; off the band, the ramp down from its edge
      c.lift = c.localY.map((y, i) => Math.max(moldingLift(y, wAt(c, i), lp), seatOn(H, c, i)));
      // a LEAF lies over the scroll it laps: its base on the host's crown at
      // the host's root (the stacked shell of phase 3c, standing on the molding)
      if (c.kind === 'leaf') { const host = ch.curves.find((h) => h.kind !== 'leaf' && h.chainIndex === c.chainIndex); const hc = wireHeight(c.info.hostW, p.ornShape === 'round' ? 'round' : 'half-round') * p.ornProjection; const hl = host.lift[host.root]; c.lift = c.lift.map((z) => Math.max(z, hl) + hc); }
      c.finish = finish;
      return c;
    };
    for (const c of ch.curves) finish(c);
    const curves = ch.curves, mirrored = curves.map(mirrorCurve);
    const mine = [...curves, ...mirrored];
    const gTris = mine.reduce((a, c) => a + solidTriBound(c.pts.length, profileFor(c, p).x.length), 0);
    if (tris + gTris > triBudget) { told.push(`the ${run.id} chain is not built — it would take the relief to ${(tris + gTris).toLocaleString('en-US')} triangles, past the ${triBudget.toLocaleString('en-US')} budget`); continue; }
    tris += gTris;
    groups.push({ group: run.id, anchor: `${run.from}→${run.to}`, onAxis: false, curves, mirrored, push: depth, told: ch.told, chain: { path, depth, elements: ch.n, foot: ch.foot } });
  }
  // THE JUNCTIONS: one straight LEAF per anchor a built run ends at — on the
  // AXIS (the crest, the bottom) a single leaf, its own mirror, pointing out
  // between the two mirrored start C's; at an interior junction (a corner, a
  // springing, an oval's side) a leaf on the bisector of the runs' outward
  // normals, when Corners / springings is on. Its root on the molding at the
  // runs' seat; its lift the molding's height there.
  const byId = new Map(); for (const e of ends) { if (!byId.has(e.id)) byId.set(e.id, []); byId.get(e.id).push(e); }
  for (const [id, es] of byId) {
    const isAxis = es[0].axis;
    if (!isAxis && p.ornCorners !== 'on') continue;
    let nx = 0, ny = 0; for (const e of es) { nx += e.N[0]; ny += e.N[1]; } const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const foot = Math.min(...es.map((e) => e.foot));
    const P = isAxis ? [0, es[0].P[1]] : es.reduce((a, e) => [a[0] + e.P[0] / es.length, a[1] + e.P[1] / es.length], [0, 0]);
    const e0 = es[0], lpE = { depth, moldW, prof: model.prof, reliefDepth: p.moldingDepth * scale * p.reliefScale, ramp: 0.35 * moldW };
    const base = Math.atan2(ny, nx);
    // a leaf of the motif: straight or curled, at an angle off the bisector
    const motifLeaf = (ll, ang, curl, side, lobes, role) => {
      const make = (L1) => {
        let lf = rigid(buildLeaf({ length: L1, width: LEAF_ASPECT * L1, side, curl, lobes }), { at: P, angle: ang });
        // ON THE AXIS the centre leaf is its own mirror, exactly: its straight
        // centreline on x = 0 and its normal along ∓x, so every column's
        // offset is ±d to the bit
        if (role === 'axis') lf = { ...lf, pts: lf.pts.map(([, y]) => [0, y]), nrm: lf.nrm.map(() => [-Math.sign(ny), 0]) };
        lf.localY = lf.pts.map((q) => (q[0] - e0.P[0]) * e0.N[0] + (q[1] - e0.P[1]) * e0.N[1]);
        lf.lift = lf.localY.map((y, k) => Math.max(moldingLift(y, wAt(lf, k), lpE), seatOn(H, lf, k)) + MIN_FEATURE_MM / 2);
        lf.info = { ...lf.info, hostWire: lf.info.wire, hostW: 0, role };
        lf.remake = (f) => make(L1 * f);
        return lf;
      };
      return make(ll);
    };
    if (isAxis) {
      // THE PALMETTE (ref 3's crest): a straight centre leaf on the axis, and
      // a leaf either side fanning 0.6 rad off it, curling away
      const ang = Math.sign(ny) * Math.PI / 2;
      groups.push({ group: 'axis', anchor: id, onAxis: true, curves: [motifLeaf(1.0 * foot, ang, 0, 1, LEAF_LOBES, 'axis')], mirrored: [], push: depth, told: [] });
      const side = motifLeaf(0.8 * foot, ang - Math.sign(ny) * 0.6, LEAF_CURL, -Math.sign(ny), LEAF_LOBES, 'palmette');
      groups.push({ group: 'palmette', anchor: id, onAxis: false, curves: [side], mirrored: [mirrorCurve(side)], push: depth, told: [] });
    } else {
      // THE ROSETTE (ref 2's side flowers): five short straight petals of two
      // lobes radiating from the junction, one along the bisector
      const petals = []; for (let k = 0; k < 5; k++) petals.push(motifLeaf(0.45 * foot, base + k * 2 * Math.PI / 5, 0, 1, 2, 'rosette'));
      groups.push({ group: 'rosette', anchor: id, onAxis: false, curves: petals, mirrored: petals.map(mirrorCurve), push: depth, told: [] });
    }
  }
  settleChains(groups, told, region, opening);
  // the budget, once everything is settled (a junction leaf counted too)
  for (const g of groups) if (['axis', 'palmette', 'rosette'].includes(g.group)) tris += [...g.curves, ...g.mirrored].reduce((a, c) => a + solidTriBound(c.pts.length, profileFor(c, p).x.length), 0);
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : MIN_FEATURE_MM;
  return { scale, length, wire: MIN_FEATURE_MM, style: 'carved', layout: 'chains', tip, groups, curves: all, region, H, told, tris: { bound: tris, frame: frameTris, budget: triBudget } };
}

/* The ornament of a frame model: groups at the asked anchors, built in print
   mm, mirrored, seated and checked. p carries the ornament controls. */
export function ornamentFor(model, { triBudget = FRAME_TRI_BUDGET } = {}) {
  const p = model.params;
  const kind = model.info.kind;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const length = p.ornScale * p.moldingWidth * scale;
  const groups = [];                         // { group, anchor, curves (right), mirrored (left) }
  // the frame's own bands' triangles, bounded (the embed rows and the lip
  // column included), so the budget is the whole relief's
  let tris = model.spines.reduce((a, sp) => a + solidTriBound(sp.pts.length + 2, model.prof.x.length + 1), 0);
  const frameTris = tris;
  const accepted = [];
  const yMid = (model.box.y0 + model.box.y1) / 2 * scale;
  for (const g of ORNAMENT_ORDER) {
    const ids = (ORNAMENT_GROUPS[kind] || {})[g];
    if (!ids || p[GROUP_CONTROL[g]] !== 'on') continue;
    for (const id of ids) {
      const anchor = model.info.anchors[id];
      if (!anchor) { told.push(`no ${id} on this frame — its ${g} group is not built`); continue; }
      const { Po, out } = anchorFrame(model, anchor, scale);
      const onAxis = Math.abs(Po[0]) < 1e-9;
      const theta = Math.atan2(-out[0], out[1]);
      // the long half's direction: along +x local under theta; on the axis it
      // points away from the axis (right); elsewhere away from the frame's
      // middle — up in the upper half, down in the lower, up at the sides
      const dir = [Math.cos(theta), Math.sin(theta)];
      let mirrorX = false;
      if (onAxis) mirrorX = dir[0] < 0;
      else { const upper = Po[1] >= yMid - 1e-9; mirrorX = upper ? dir[1] < 0 : dir[1] > 0; }
      const local = buildGroup({ n: p.ornDensity, length, tightness: p.ornTightness, wire: p.ornWire, balance: 0.6, taper: p.ornWireStyle === 'tapered', carved: p.ornWireStyle === 'carved' });
      const childTold = local.flatMap((x) => x.curve.info.told.filter((m) => /^child/.test(m)));
      // the CLUSTER: two leaves lapping the lead's root (phase 3c)
      let localCurves = local.map((x) => x.curve);
      if (p.ornLeaves === 'on') { const cl = buildCluster(local, { size: p.ornLeafSize / LEAF_SIZE[0] }); localCurves = [...localCurves, ...cl.leaves]; childTold.push(...cl.told); }
      let curves = localCurves.map((c) => rigid(c, { at: Po, angle: theta, mirrorX }));
      if (onAxis) {
        // slide along the edge's tangent (here: x) until the nearest wire
        // edge stands F/2 off the axis — the mirrored pair a feature apart
        const minX = Math.min(...curves.map((c) => Math.min(...c.pts.map(([x], i) => x - wAt(c, i) / 2))));
        curves = curves.map((c) => shift(c, [MIN_FEATURE_MM / 2 - minX, 0]));
        // a TAPERED wire's edge between two stations can stand nearer the axis
        // than its vertices do: clear the pair on the local-width measure
        // wireClear owns (constant wires already clear it by construction)
        for (let k = 0; k < 20; k++) {
          // measured against the reflection ABOUT THE AXIS itself, never
          // through mirrorCurve: a clearance read through the producer of the
          // left halves would push the pair apart to hide a broken mirror
          const mir = curves.map((c) => ({ ...c, pts: c.pts.map(([x, y]) => [-x, y]) }));
          let m = Infinity; for (const a of curves) for (const b of mir) m = Math.min(m, wireClear(a, b));
          if (m >= MIN_FEATURE_MM - 1e-9) break;
          curves = curves.map((c) => shift(c, [(MIN_FEATURE_MM - m) / 2 + 1e-9, 0]));
        }
      }
      const reach = 3 * length + 20;
      const seated = seat(curves, [-out[0], -out[1]], region.near(Po, 2 * reach), reach);
      if (!Number.isFinite(seated.push)) { told.push(`the ${g} group at ${id} is not built — it does not reach the band within ${reach.toFixed(0)} mm`); continue; }
      curves = seated.curves;
      const mirrored = curves.map(mirrorCurve);
      // clear of every group already placed, both sides
      const mine = onAxis ? [...curves, ...mirrored] : [...curves, ...mirrored];
      let worst = Infinity, against = null;
      for (const a of mine) for (const b of accepted) { const d = wireClear(a, b.curve); if (d < worst) { worst = d; against = b.group; } }
      if (worst < MIN_FEATURE_MM) { told.push(`the ${g} group at ${id} is not built — it would come ${worst.toFixed(2)} mm from the ${against} group (under the ${MIN_FEATURE_MM.toFixed(1)} mm feature)`); continue; }
      // THE TRIANGLE BUDGET (phase 3c): a group that would take the relief
      // past FRAME_TRI_BUDGET gives way whole, in the same priority, told —
      // the count is the solids' own upper bound (degenerate drops only lower it)
      const gTris = mine.reduce((a, c) => a + solidTriBound(c.pts.length, profileFor(c, p).x.length), 0);
      if (tris + gTris > triBudget) { told.push(`the ${g} group at ${id} is not built — it would take the relief to ${(tris + gTris).toLocaleString('en-US')} triangles, past the ${triBudget.toLocaleString('en-US')} budget`); continue; }
      tris += gTris;
      for (const c of mine) accepted.push({ curve: c, group: g });
      groups.push({ group: g, anchor: id, onAxis, curves, mirrored, push: seated.push, told: childTold });
      for (const m of childTold) { const prev = told.find((q) => q.endsWith(`: ${m}`) && q.startsWith('groups ')); if (prev) told[told.indexOf(prev)] = prev.replace(/^groups ([^:]*):/, `groups $1, ${id}:`); else told.push(`groups ${id}: ${m}`); }
    }
  }
  const all = groups.flatMap((g) => [...g.curves, ...g.mirrored]);
  const wire = Math.max(MIN_FEATURE_MM, p.ornWire);
  if (p.ornWire < MIN_FEATURE_MM) told.push(`wire ${p.ornWire.toFixed(2)} mm built at the ${MIN_FEATURE_MM.toFixed(1)} mm assumed minimum feature`);
  const fit = all.length ? groups[0].curves[0].info : null;
  if (fit) for (const m of fit.told.filter((q) => /^tightness/.test(q))) told.push(`lead scroll: ${m}`);
  const tip = all.length ? Math.min(...all.map((c) => c.info.tip ?? c.info.wire)) : wire;
  return { scale, length, wire, style: p.ornWireStyle === 'tapered' || p.ornWireStyle === 'carved' ? p.ornWireStyle : 'constant', tip, groups, curves: all, region, told, tris: { bound: tris, frame: frameTris, budget: triBudget } };
}

/* The print section of a placed curve: a leaf's own, else the ornament wire
   control's (arris by default). */
export const profileFor = (c, p) => wireProfile(c.kind === 'leaf' ? 'leaf' : p.ornShape === 'round' ? 'round' : p.ornShape === 'half-round' ? 'half-round' : 'arris');
/* A leaf's lift: its host's crown at the host's root — the host's depth for
   its section and relief, times the host's own crown scale there. */
export function leafLift(c, shape, projection) {
  const D = wireHeight(c.info.hostWire, shape) * projection;
  return D * Math.max(Math.min(MIN_FEATURE_MM, D) / D, c.info.hostW / c.info.hostWire);
}

/* The model with its ornament: the frame's bands unchanged and first, the
   wire bands after them (the SVG draws them with the frame's own hatching, a
   half-round wire's true section), the box widened to hold them and the
   frame's own box kept as frameBox (the print scale's owner). Off, the model
   comes back as itself. */
export function withOrnament(model, opts = {}) {
  const p = model.params;
  if (p.filigree !== 'scrolls') return model;
  const orn = p.ornLayout === 'chains' ? chainsFor(model, opts) : ornamentFor(model, opts);
  const s = orn.scale;
  const shape = p.ornShape === 'round' ? 'round' : p.ornShape === 'half-round' ? 'half-round' : 'arris';
  // a tapered wire's local width rides on the spine as widthScale (the one
  // offsetCurve reads); its crown thins with it but never under the floor
  const wScale = (c) => (c.w ? c.w.map((x) => x / c.info.wire) : null);
  const spines = orn.curves.map((c, i) => { const sp = { id: `orn${i}`, pts: c.pts.map(([x, y]) => [x / s, y / s]), nrm: c.nrm, bandWidth: c.info.wire / s }; const k = wScale(c); if (k) sp.widthScale = k; return sp; });
  // the drawing: a wire's half-round section whatever is printed (the print
  // section never reaches the paper); a LEAF is drawn with its own section
  const drawProf = wireProfile('half-round'), leafDraw = wireProfile('leaf');
  const bands = spines.map((sp, i) => { const c = orn.curves[i], lf = c.kind === 'leaf'; return sweepSpine(sp, lf ? leafDraw : drawProf, { ...p, moldingWidth: c.info.wire / s, moldingDepth: (lf ? LEAF_RELIEF * c.info.wire : c.info.wire / 2) / s }); });
  let { x0, y0, x1, y1 } = model.box, strokes = model.strokes;
  for (const b of bands) for (const poly of [...b.edges, ...b.creases, ...b.hatch.map((h) => h.pts), ...b.cross.map((h) => h.pts)]) {
    strokes++;
    for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const solids = orn.curves.map((c, i) => {
    const lf = c.kind === 'leaf';
    // a CARVED stroke's crown and a leaf's are floored at the feature
    // (phase 3c): a short child's cap and a small leaf's blade would
    // otherwise print a ridge under MIN_FEATURE_MM high at the defaults (the
    // tapered and constant wires keep their own told floor, by branch)
    const raw = lf ? LEAF_RELIEF * c.info.wire * p.ornProjection : wireHeight(c.info.wire, shape) * p.ornProjection;
    const depth = lf || orn.style === 'carved' ? Math.max(MIN_FEATURE_MM, raw) : raw;
    const spine = { id: `orn${i}`, pts: c.pts, nrm: c.nrm, bandWidth: c.info.wire };
    const k = wScale(c);
    if (k) { spine.widthScale = k; spine.depthScale = crownScale(c, depth); }
    // a leaf is a STACKED shell: its crown is lifted by its host's crown at
    // the host's root, so where the two overlap the leaf lies over the scroll
    if (c.lift) spine.baseLift = orn.H ? seatEmitted(orn.H, spine, profileFor(c, p), c.lift, depth) : c.lift;
    const lift = c.lift ? 0 : lf ? leafLift(c, shape, p.ornProjection) : 0;
    return { spine, prof: profileFor(c, p), depth, lift, kind: lf ? 'leaf' : 'scroll' };
  });
  return { ...model, bands: [...model.bands, ...bands], frameBox: model.box, box: { x0, y0, x1, y1 }, strokes, ornament: { ...orn, spines, solids, shape } };
}
