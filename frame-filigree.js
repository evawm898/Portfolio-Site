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
/* THE TAPERED WIRE (phase 3b, Eva's ruling 1): the wire is its full width
   through the root and the body and thins LINEARLY in arc length over each
   volute to TAPER_TIP of it at the eye, floored at the feature — the floor
   applies at the thinnest point, the tip. A wire already at the floor has
   no room to taper (told). Every gap and clamp reads the LOCAL width. */
export const TAPER_TIP = 0.5;
export const taperTip = (t) => Math.max(MIN_FEATURE_MM, TAPER_TIP * t);
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
  // the eye is the floor on the wire's LOCAL width there: the tip, tapered
  const tEye = spec.taper ? taperTip(t) : t;
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
  const out = { kind, pts, nrm, tan, u, kap, root: A.pts.length - 1, info: { L, t, rMid, rv, eye: re, h1, h2, turnsAsked: turns, turnsBuilt: built, share, taper: !!spec.taper, tip: tEye } };
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
  const key = [spec.kind, spec.length, t, spec.balance, spec.share, !!spec.taper].join('|');
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
    if (spec.taper && taperTip(t) >= t) told.push(`tapered wire: a ${t.toFixed(2)} mm wire is already at the ${MIN_FEATURE_MM.toFixed(1)} mm floor — no room to taper, built constant`);
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
export function buildGroup({ n = 3, length = 60, tightness = 0.5, wire = 1.6, ratio = 0.6, balance = 0.6, kind = 'C', taper = false } = {}) {
  const lead = buildScroll({ kind, length, tightness, wire, balance, taper });
  const out = [{ curve: lead, role: 'lead', parent: null, station: null }];
  const stations = [];
  for (let i = 1; i < n; i++) stations.push((i % 2 ? -1 : 1) * (0.18 + 0.14 * Math.floor((i - 1) / 2)));
  const placeChild = (frac, i, tau) => {
    const order = Math.floor(i / 2) + 1;
    const len = length * ratio ** order, tw = Math.max(MIN_FEATURE_MM, wire * Math.sqrt(ratio) ** order);
    const child = buildScroll({ kind: i % 2 ? 'S' : 'C', length: len, tightness: tau, wire: tw, balance, taper });
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
export function joinsCleanly(a, b) { return joinsFrom(a, b) && joinsFrom(b, a); }   // read from both wires
function joinsFrom(a, b) {
  const half = (a.info.wire + b.info.wire) / 2, local = !!(a.w || b.w);
  let run = null;
  for (let i = 0; i < a.pts.length; i++) {
    const q = a.pts[i];
    let d = Infinity;
    if (local) for (let k = 0; k < b.pts.length - 1; k++) d = Math.min(d, segDist(q, b.pts[k], b.pts[k + 1]) - (wAt(a, i) + Math.max(wAt(b, k), wAt(b, k + 1))) / 2);
    else { for (let k = 0; k < b.pts.length - 1; k++) d = Math.min(d, segDist(q, b.pts[k], b.pts[k + 1])); d -= half; }
    if (d < MIN_FEATURE_MM) run = Math.min(run ?? Infinity, d);
    else if (run !== null) { if (run > -EMBED_MM + 1e-9) return false; run = null; }
  }
  return run === null || run <= -EMBED_MM + 1e-9;
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

/* The ornament of a frame model: groups at the asked anchors, built in print
   mm, mirrored, seated and checked. p carries the ornament controls. */
export function ornamentFor(model) {
  const p = model.params;
  const kind = model.info.kind;
  const frameH = model.box.y1 - model.box.y0, scale = p.printHeight / frameH;
  const region = bandRegion(model, scale);
  const told = [];
  const length = p.ornScale * p.moldingWidth * scale;
  const groups = [];                         // { group, anchor, curves (right), mirrored (left) }
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
      const local = buildGroup({ n: p.ornDensity, length, tightness: p.ornTightness, wire: p.ornWire, balance: 0.6, taper: p.ornWireStyle === 'tapered' });
      let curves = local.map((x) => rigid(x.curve, { at: Po, angle: theta, mirrorX }));
      const childTold = local.flatMap((x) => x.curve.info.told.filter((m) => /^child/.test(m)));
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
  return { scale, length, wire, style: p.ornWireStyle === 'tapered' ? 'tapered' : 'constant', tip, groups, curves: all, region, told };
}

/* The model with its ornament: the frame's bands unchanged and first, the
   wire bands after them (the SVG draws them with the frame's own hatching, a
   half-round wire's true section), the box widened to hold them and the
   frame's own box kept as frameBox (the print scale's owner). Off, the model
   comes back as itself. */
export function withOrnament(model) {
  const p = model.params;
  if (p.filigree !== 'scrolls') return model;
  const orn = ornamentFor(model);
  const s = orn.scale;
  const shape = p.ornShape === 'round' ? 'round' : 'half-round';
  // a tapered wire's local width rides on the spine as widthScale (the one
  // offsetCurve reads); its crown thins with it but never under the floor
  const wScale = (c) => (c.w ? c.w.map((x) => x / c.info.wire) : null);
  const spines = orn.curves.map((c, i) => { const sp = { id: `orn${i}`, pts: c.pts.map(([x, y]) => [x / s, y / s]), nrm: c.nrm, bandWidth: c.info.wire / s }; const k = wScale(c); if (k) sp.widthScale = k; return sp; });
  const drawProf = wireProfile('half-round');
  const bands = spines.map((sp, i) => sweepSpine(sp, drawProf, { ...p, moldingWidth: orn.curves[i].info.wire / s, moldingDepth: orn.curves[i].info.wire / 2 / s }));
  let { x0, y0, x1, y1 } = model.box, strokes = model.strokes;
  for (const b of bands) for (const poly of [...b.edges, ...b.creases, ...b.hatch.map((h) => h.pts), ...b.cross.map((h) => h.pts)]) {
    strokes++;
    for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const prof = wireProfile(shape);
  const solids = orn.curves.map((c, i) => {
    const depth = wireHeight(c.info.wire, shape) * p.ornProjection;
    const spine = { id: `orn${i}`, pts: c.pts, nrm: c.nrm, bandWidth: c.info.wire };
    const k = wScale(c);
    if (k) { spine.widthScale = k; spine.depthScale = crownScale(c, depth); }
    return { spine, prof, depth };
  });
  return { ...model, bands: [...model.bands, ...bands], frameBox: model.box, box: { x0, y0, x1, y1 }, strokes, ornament: { ...orn, spines, solids, shape } };
}
