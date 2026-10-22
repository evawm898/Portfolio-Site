/* frame-geometry.js — the /frame model. Pure functions, no DOM, Node-importable.

   Every frame is a SKELETON (a set of spines — polylines with unit normals)
   with a MOLDING PROFILE swept along each spine, and the shading is derived
   from the swept surface's normal against the registry's one fixed LIGHT.

   BOUNDARY OWNERSHIP (charter §4 — the thing to check before touching this):
     offsetCurve(spine, d)  is the ONE producer of every curve parallel to a
                            spine. The band's two edges, every crease line,
                            every hatch line, the sill's top (which the jambs
                            and mullions stand on), the jambs' inner edges
                            (which set the lights' clear widths) and the head's
                            inner edge (which caps the sub-arches) ALL come
                            out of it. Nothing else adds `d * n` to a spine.
     profileSamples(points) is the ONE sampling of the profile across the band
                            (PROFILE_SAMPLES from the registry).
     normalAt(...)          is the ONE place a profile slope becomes a surface
                            normal; lambert() the one place it meets LIGHT.

   Model coordinates are millimetres, x right, y UP (the SVG writer flips y).
   The arch's opening is centred on x = 0 with the sill's underside at y = 0. */

import { DEFAULTS, LIGHT, PROFILE_PRESETS, PROFILE_SAMPLES, PARAM_SPEC, HATCH_WEIGHT_RANGE, HATCH_WEIGHT_STEPS, MIN_FEATURE_MM, ANCHORS } from './frame-registry.js';

export { DEFAULTS, LIGHT, PROFILE_PRESETS, PROFILE_SAMPLES, HATCH_WEIGHT_RANGE, HATCH_WEIGHT_STEPS, ANCHORS };

const spec = (id) => PARAM_SPEC.find((s) => s.id === id);

/* ------------------------------------------------------------------ */
/* Profile: monotone cubic through control points                      */
/* ------------------------------------------------------------------ */

/* Fritsch–Carlson monotone cubic (PCHIP). No overshoot between points, so a
   stepped profile stays stepped and a flat one stays exactly flat (every
   slope is 0, so every tangent is 0 and the interpolant is the constant). */
export function pchip(xs, ys) {
  const n = xs.length;
  if (n < 2) throw new Error('pchip: need two points');
  for (let i = 1; i < n; i++) if (!(xs[i] > xs[i - 1])) throw new Error('pchip: x must be strictly increasing');
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  const m = new Array(n);
  if (n === 2) { m[0] = m[1] = d[0]; }
  else {
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    // written as y_i + Δy·(…) + h·(…tangents) so equal ys give EXACTLY y_i
    return ys[i] + (ys[i + 1] - ys[i]) * (3 * t2 - 2 * t3) + h[i] * (m[i] * (t3 - 2 * t2 + t) + m[i + 1] * (t3 - t2));
  };
}

/* The profile sampled across the band: x in [0,1] (0 the outer edge), z in
   [0,1]. Returns { x: Float64Array, z: Float64Array } of PROFILE_SAMPLES + 1. */
export function profileSamples(points, n = PROFILE_SAMPLES) {
  const f = pchip(points.map((p) => p[0]), points.map((p) => p[1]));
  const x = new Float64Array(n + 1), z = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) { x[i] = i / n; z[i] = Math.min(1, Math.max(0, f(x[i]))); }
  return { x, z };
}

/* ------------------------------------------------------------------ */
/* Spines and the one offset function                                  */
/* ------------------------------------------------------------------ */

/* A spine is { id, pts: [[x,y],...], nrm: [[nx,ny],...] } with unit normals
   pointing to the band's INNER side (x = 1 of the profile). */
function lineSpine(id, a, b, inward, steps = 1) {
  const pts = [], nrm = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    nrm.push(inward);
  }
  return { id, pts, nrm };
}

/* A circular arc about c from angle t0 to t1 (radians, model y-up). The
   normal points toward the centre (inward for an arch head). */
function arcSpine(id, c, r, t0, t1, stepDeg = 1.5) {
  const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / (stepDeg * Math.PI / 180)));
  const pts = [], nrm = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n;
    pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
    nrm.push([-Math.cos(t), -Math.sin(t)]);
  }
  return { id, pts, nrm };
}

/* Join two spines end to start. The shared vertex gets the MITRE normal —
   the bisector scaled by 1/cos(half the turn) — so its offset lands exactly
   where the two offset curves meet; with one arc's normal the two inner
   edges cross past the apex in a bow-tie. (Measured at the default: 0.74 mm
   of crossing at the apex before this, 0 after.) */
export function mitreNormal(n1, n2) {
  const sx = n1[0] + n2[0], sy = n1[1] + n2[1], l = Math.hypot(sx, sy);
  const cosHalf = l / 2;                       // |n1 + n2| / 2 = cos(turn / 2)
  return cosHalf > 1e-9 ? [sx / l / cosHalf, sy / l / cosHalf] : n1;
}
function joinSpines(id, a, b, extra = {}) {
  const mitre = mitreNormal(a.nrm[a.nrm.length - 1], b.nrm[0]);
  return { id, pts: [...a.pts, ...b.pts.slice(1)], nrm: [...a.nrm.slice(0, -1), mitre, ...b.nrm.slice(1)], joins: [a.pts.length - 1], ...extra };
}

/* THE offset. Every curve parallel to a spine is this and nothing else.
   Returns one entry per spine vertex; an entry is NULL where the offset falls
   on the far side of a join's bisector — the vertices next to a convex corner
   overshoot the mitre on the concave side (the apex bow-tie), and the mitred
   vertex itself is where the two offset arcs meet. offsetPoly() is the
   null-free form every drawn edge uses; the hatch keeps the indices. */
export function offsetCurve(spine, d) {
  const out = spine.pts.map((p, i) => [p[0] + d * spine.nrm[i][0], p[1] + d * spine.nrm[i][1]]);
  const joins = spine.joins || [], n = out.length;
  for (let k = 0; k < joins.length; k++) {
    const j = joins[k], P = out[j], b = spine.nrm[j];
    // the stretch a join can trim runs to its NEIGHBOURING joins (an open
    // spine with one join: the whole spine, the phase-1 rule unchanged); on
    // a CLOSED loop the stretch wraps through the seam.
    const prev = spine.closed ? joins[(k + joins.length - 1) % joins.length] : (k ? joins[k - 1] : -1);
    const next = spine.closed ? joins[(k + 1) % joins.length] : (k < joins.length - 1 ? joins[k + 1] : n);
    const test = (i, before) => {
      if (!out[i]) return;
      const side = b[0] * (out[i][1] - P[1]) - b[1] * (out[i][0] - P[0]);   // cross(b, q - P)
      if ((before && side < 0) || (!before && side > 0)) out[i] = null;
    };
    if (!spine.closed) {
      for (let i = 0; i < n; i++) if (i !== j && i > prev && i < next) test(i, i < j);
    } else if (joins.length > 1) {
      for (let i = (j + n - 1) % n; i !== prev; i = (i + n - 1) % n) test(i, true);
      for (let i = (j + 1) % n; i !== next; i = (i + 1) % n) test(i, false);
    }
  }
  return out;
}
/* null-free; a CLOSED spine's polyline repeats its first point at the end so
   a drawn edge closes (the spine itself never duplicates a vertex). */
export const offsetPoly = (spine, d) => { const o = offsetCurve(spine, d).filter(Boolean); return spine.closed ? [...o, o[0]] : o; };

/* The band's two edges are offsets at ±half its width. Consumers name the
   edge they read rather than restating the arithmetic. */
export const outerEdge = (spine, bandWidth) => offsetPoly(spine, -bandWidth / 2);
export const innerEdge = (spine, bandWidth) => offsetPoly(spine, +bandWidth / 2);

/* y of a polyline at a given x (first crossing), or null. */
function yAtX(poly, x) {
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[i + 1];
    if ((x0 <= x && x <= x1) || (x1 <= x && x <= x0)) {
      if (x1 === x0) return Math.max(y0, y1);
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* The arch skeleton                                                   */
/* ------------------------------------------------------------------ */

/* Pointed arch over half-span a: both arc centres sit on the spring line,
   each a distance R - a inside the OPPOSITE springing. R = a (1 + 2p):
   p = 0 semicircle, p = 0.5 equilateral (R = span), p = 1 lancet (R = 3a). */
export function archArcs(a, pointedness) {
  const R = a * (1 + 2 * pointedness);
  const cx = R - a;                            // |centre x|; 0 at the semicircle
  const rise = Math.sqrt(R * R - cx * cx);
  const tApex = Math.atan2(rise, cx);          // from the right arc centre (-cx, 0) to the apex (0, rise)
  return { R, cx, rise, tApex };
}

/* Build every spine of the arch. Returns { spines, info } where info carries
   the derived numbers the read-out prints and the gate checks. */
export function archSkeleton(p) {
  const w = p.moldingWidth, wm = p.moldingWidth * p.mullionWidth;
  const halfSpan = p.width / 2;               // between the jamb CENTRELINES
  const a = halfSpan;
  const { R, cx, rise, tApex } = archArcs(a, p.pointedness);

  const spines = [];
  const info = { clamped: [], springY: 0, apexY: 0, lights: [], mullionX: [], subSpringY: null };

  // Sill first: everything stands on its TOP EDGE, read off offsetCurve.
  let floorY = 0;                              // where the jambs begin
  const sillInward = [0, 1];                   // the sill's inner side faces up, into the opening
  if (p.sill !== 'none') {
    const sillHalf = halfSpan + w / 2;         // runs to the jambs' outer edges
    const sill = lineSpine('sill', [-sillHalf, w / 2], [sillHalf, w / 2], sillInward);
    spines.push(sill);
    floorY = innerEdge(sill, w)[0][1];         // the sill's top edge: a CONSUMER of offsetCurve
    if (p.sill === 'stepped') {
      // a second, wider step below the sill, half the depth: its own spine
      const step = lineSpine('sillStep', [-sillHalf - w * 0.6, -w * 0.35], [sillHalf + w * 0.6, -w * 0.35], sillInward);
      step.bandWidth = w * 0.7;
      spines.push(step);
    }
  }

  // Spring line: total height is sill underside to apex; jambs take what the
  // rise leaves. A rise taller than the height clamps the jambs to zero and
  // is TOLD (info.clamped), never silently stretched.
  let springY = p.height - rise;
  if (springY < floorY + w) { info.clamped.push(`arch rise ${rise.toFixed(1)} mm leaves no jamb under a ${p.height} mm height — jambs held at ${w.toFixed(1)} mm`); springY = floorY + w; }
  info.springY = springY; info.apexY = springY + rise; info.rise = rise; info.R = R;

  spines.push(lineSpine('jambL', [-a, floorY], [-a, springY], [1, 0], 2));
  spines.push(lineSpine('jambR', [a, floorY], [a, springY], [-1, 0], 2));
  // head: right arc from the right springing up to the apex, then the left
  // arc down — one spine, apex a shared vertex, normals toward the centres.
  const right = arcSpine('headR', [-cx, springY], R, 0, tApex);
  const left = arcSpine('headL', [cx, springY], R, Math.PI - tApex, Math.PI);
  spines.push(joinSpines('head', right, left));

  // Lights and mullions. Clear widths are measured between the JAMBS' INNER
  // EDGES (offsetCurve again) less the mullions' own bands, and made equal.
  const n = p.mullions | 0;
  if (n > 0) {
    const head = spines.find((s) => s.id === 'head');
    const xInL = innerEdge(spines.find((s) => s.id === 'jambL'), w)[0][0];
    const xInR = innerEdge(spines.find((s) => s.id === 'jambR'), w)[0][0];
    const clear = (xInR - xInL - n * wm) / (n + 1);
    // Light boundaries: the OUTER two are the jambs' inner edges (ruling 4,
    // phase 1b — read off innerEdge above, never a new boundary), so the
    // outer sub-arches terminate ON the jamb rather than half-buried in it;
    // the interior ones are the mullion CENTRELINES, so a sub-arch's end is
    // half-buried in the mullion band (accepted, ruling 3).
    const bounds = [xInL];
    for (let i = 1; i <= n; i++) {
      const x = xInL + i * clear + (i - 1) * wm + wm / 2;
      info.mullionX.push(x); bounds.push(x);
    }
    bounds.push(xInR);
    info.lightBounds = bounds;
    // Sub-arch over each light: same pointedness on the light's own half-span.
    // Its spring line is the main spring line unless the apex would run into
    // the head's INNER EDGE, in which case it drops until it clears by wm.
    const headIn = innerEdge(head, w);
    const subArcs = [];
    for (let i = 0; i <= n; i++) {
      const x0 = bounds[i], x1 = bounds[i + 1], ai = (x1 - x0) / 2, xc = (x0 + x1) / 2;
      subArcs.push({ xc, ai, arcs: archArcs(ai, p.pointedness) });
    }
    // The sub-arches spring on the main spring line unless an apex would come
    // within one mullion band of the head's INNER EDGE (offsetCurve again);
    // then the spring line is bisected down until the nearest apex clears it.
    const clearanceAt = (s) => Math.min(...subArcs.map(({ xc, arcs }) => distToPoly([xc, s + arcs.rise], headIn)));
    let subSpring = springY;
    if (clearanceAt(subSpring) < wm) {
      let lo = floorY + wm, hi = subSpring;
      if (clearanceAt(lo) >= wm) { for (let k = 0; k < 48; k++) { const mid = (lo + hi) / 2; if (clearanceAt(mid) >= wm) lo = mid; else hi = mid; } subSpring = lo; }
      else subSpring = lo;
    }
    if (subSpring < floorY + wm) { info.clamped.push(`lights too narrow for their sub-arches: sub-arch spring held at ${(floorY + wm).toFixed(1)} mm`); subSpring = floorY + wm; }
    info.subSpringY = subSpring;
    for (let i = 1; i <= n; i++) {
      const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY], [info.mullionX[i - 1], subSpring], [1, 0], 2);
      m.bandWidth = wm; spines.push(m);
    }
    subArcs.forEach(({ xc, ai, arcs }, i) => {
      const r = arcSpine(`light${i}R`, [xc - arcs.cx, subSpring], arcs.R, 0, arcs.tApex);
      const l = arcSpine(`light${i}L`, [xc + arcs.cx, subSpring], arcs.R, Math.PI - arcs.tApex, Math.PI);
      spines.push(joinSpines(`light${i}`, r, l, { bandWidth: wm }));
      info.lights.push({ xc, halfSpan: ai, apexY: subSpring + arcs.rise });
    });
  }
  for (const s of spines) if (s.bandWidth === undefined) s.bandWidth = w;
  // EMBED declarations (phase 2, charter §4): where a band's END touches a
  // neighbour face to face — a jamb standing ON the sill's top edge, the head
  // starting AT the jamb's top, a mullion ending AT its light's springing —
  // the relief extends that end INTO the neighbour named here, so the two
  // closed shells overlap rather than graze. The sub-arches need none: half
  // their band is already buried in the jamb or mullion they end on (ruling
  // 4 / ruling 3). A stepped sill's band touches the step along y = 0, so the
  // sill declares an OUTER lip into it. Only frame-relief.js reads these; the
  // SVG and every 2-D consumer never do (the gate measures that: the default's
  // SVG is byte-identical with the field present).
  const hasSill = p.sill !== 'none';
  for (const s of spines) {
    if (/^jamb/.test(s.id)) s.embed = { start: hasSill ? 'sill' : null, end: 'head' };
    else if (/^mullion/.test(s.id)) s.embed = { start: hasSill ? 'sill' : null, end: `light${s.id.slice(7) - 1}` };
    else if (s.id === 'head') s.embed = { start: 'jambR', end: 'jambL' };
    else if (s.id === 'sill') s.embed = { outer: p.sill === 'stepped' ? 'sillStep' : null };
  }
  // named anchors (registry ANCHORS.arch): every one ON a spine
  const sp = (id) => spines.find((s) => s.id === id);
  const head = sp('head'), jL = sp('jambL'), jR = sp('jambR');
  const anchors = {
    apex: anchorAt(head, head.joins[0]),
    springR: anchorAt(head, 0),
    springL: anchorAt(head, head.pts.length - 1),
    sideL: anchorAt(jL, 1), sideR: anchorAt(jR, 1),
  };
  if (hasSill) {
    const sill = sp('sill');
    anchors.sillL = anchorAt(sill, 0); anchors.sillR = anchorAt(sill, sill.pts.length - 1);
    anchors.bottomCentre = { spine: 'sill', index: null, pt: [0, sill.pts[0][1]], nrm: sill.nrm[0] };   // ON the sill's one segment (its ends are mirror images)
  }
  info.anchors = anchors;
  info.kind = 'arch';
  return { spines, info };
}

const anchorAt = (spine, i) => ({ spine: spine.id, index: i, pt: spine.pts[i], nrm: spine.nrm[i] });

/* ------------------------------------------------------------------ */
/* The closed skeletons: rectangle and oval (phase 2b)                 */
/* ------------------------------------------------------------------ */

/* A closed loop is ONE spine with `closed: true`: its last vertex joins its
   first, no vertex is duplicated, and no consumer caps its ends. It is
   traversed COUNTER-CLOCKWISE with the inward normal on the left of travel
   (the arch head's own sense), and it STARTS at the bottom centre — a point
   on a straight side (rectangle) or the oval's bottom vertex — so the seam
   sits where the shape is mirror-symmetric and its antipode (the top centre,
   vertex V/2) is the seam's twin, which is what the gate compares it with.
   Every corner that turns is a join carrying the MITRE normal (mitreNormal,
   the arch apex's own law), so offsetCurve meets itself exactly there. */

/* cos/sin of 90·j/m degrees for j = 0..m, MIRROR-EXACT: the upper half of
   the table is the lower half with cos and sin SWAPPED, so the angle t and
   its complement 90 − t are built from the same two doubles and a point and
   its mirror image (about either axis or a corner's bisector) agree to the
   bit. quarterPoint(m, i) is the unit vector at −90 + 90·i/m degrees (i in
   0..4m), rotated by whole quarter turns, which negate and swap exactly. */
export function quarterTable(m) {
  const T = new Array(m + 1);
  for (let j = 0; 2 * j <= m; j++) { const t = (90 * j / m) * Math.PI / 180; T[j] = [Math.cos(t), Math.sin(t)]; }
  for (let j = 0; 2 * j < m; j++) T[m - j] = [T[j][1], T[j][0]];
  if (m % 2 === 0) T[m / 2] = [Math.SQRT1_2, Math.SQRT1_2];   // 45°: cos and sin are ONE double (Math.cos and Math.sin differ there by an ulp)
  return T;
}
function quarterPoint(T, m, i) {
  const qd = Math.floor(i / m) % 4, j = i - Math.floor(i / m) * m;
  let c = T[j][1], s = -T[j][0];             // −90° + 90·j/m: (sin t, −cos t)
  for (let k = 0; k < qd; k++) [c, s] = [-s, c];
  return [c, s];
}

/* The rectangle's centreline: half-width a (between the side bands'
   centrelines, the arch's convention), the outer box from y = 0 to the
   height. The corner treatments replace each corner symmetrically about its
   own bisector, so the corner anchor is the vertex ON that bisector. */
export function rectSkeleton(p) {
  const w = p.moldingWidth, F = MIN_FEATURE_MM;
  const info = { clamped: [], kind: 'rect' };
  const a = p.width / 2;
  let b = (p.height - w) / 2;
  const bMin = (w + F) / 2;                    // the opening at least one feature tall (inner edges a feature apart)
  if (b < bMin) { info.clamped.push(`a ${p.height} mm height leaves no opening under a ${w} mm band — the centreline held ${(2 * bMin).toFixed(1)} mm tall`); b = bMin; }
  const cy = w / 2 + b;                        // the centreline's centre; bottom side at y = w/2
  const treat = p.cornerTreatment;
  // the corner size, clamped to what the band and the sides admit, TOLD
  let sz = p.cornerSize;
  if (treat === 'rounded') {
    const lo = (w + F) / 2, hi = Math.min(a, b) - F / 2;   // inner arc radius ≥ F/2; a straight side ≥ F
    if (sz < lo) { info.clamped.push(`corner radius ${sz} mm is inside the ${w} mm band — held at ${lo.toFixed(2)} mm (inner radius ${(F / 2).toFixed(1)} mm)`); sz = lo; }
    if (sz > hi) { info.clamped.push(`corner radius ${sz} mm leaves no straight side — held at ${hi.toFixed(2)} mm`); sz = hi; }
  } else if (treat === 'notched' || treat === 'eared') {
    // the floors are MEASURED (ruling 5, phase 3a — tools/frame-fold-boundary.mjs
    // finds the fold on the emitted edges of a clamp-free copy): an EAR's
    // inner edge loops back through its own step for every sz < w, so it is
    // held a feature clear of that, w + F; a NOTCH never folds at any size
    // (each offset step keeps length sz: one end convex, one concave), so its
    // floor is the feature itself, F. Phase 2b's w + F for the notch was not
    // a fold and is withdrawn.
    const lo = treat === 'eared' ? w + F : F, hi = Math.min(a, b) - (w + F) / 2;   // the side between two steps ≥ F
    if (sz < lo) { info.clamped.push(treat === 'eared' ? `a ${sz} mm ear folds the ${w} mm band — held at ${lo.toFixed(2)} mm` : `a ${sz} mm notch is under the ${F.toFixed(1)} mm feature — held at it`); sz = lo; }
    if (sz > hi) { info.clamped.push(`a ${sz} mm ${treat} step meets the next corner — held at ${hi.toFixed(2)} mm`); sz = Math.max(lo, hi); }
  }
  info.cornerSize = treat === 'mitre' ? 0 : sz;
  info.a = a; info.b = b; info.cy = cy;
  // one quadrant of the loop, the BOTTOM-RIGHT corner, built in coordinates
  // relative to the corner c = (a, yb) travelling +x then +y; the other
  // three are its exact mirror images, so the loop is mirror-exact.
  // Each entry: [dx, dy, nx, ny, join]
  const Q = [];
  if (treat === 'mitre') Q.push([0, 0, ...mitreNormal([0, 1], [-1, 0]), true]);
  else if (treat === 'rounded') {
    const n = 2 * Math.ceil(45 / 1.5), r = sz, T = quarterTable(n);   // the arc's own 1.5° step (arcSpine's law); even, so the 45° point is a vertex
    for (let k = 0; k <= n; k++) {
      const [c, si] = quarterPoint(T, n, k);                 // from straight down to straight right about the arc centre
      Q.push([-r + r * c, r + r * si, -c, -si, false]);
    }
  } else if (treat === 'notched') {
    Q.push([-sz, 0, ...mitreNormal([0, 1], [-1, 0]), true]);   // turn up (left)
    Q.push([-sz, sz, ...mitreNormal([-1, 0], [0, 1]), true]);  // turn right (+x)
    Q.push([0, sz, ...mitreNormal([0, 1], [-1, 0]), true]);    // turn up
  } else {   // eared
    Q.push([-sz, 0, ...mitreNormal([0, 1], [1, 0]), true]);    // turn down (right turn)
    Q.push([-sz, -sz, ...mitreNormal([1, 0], [0, 1]), true]);  // turn +x
    Q.push([sz, -sz, ...mitreNormal([0, 1], [-1, 0]), true]);  // turn +y
    Q.push([sz, sz, ...mitreNormal([-1, 0], [0, -1]), true]);  // turn -x
    Q.push([0, sz, ...mitreNormal([0, -1], [-1, 0]), true]);   // turn +y (right turn)
  }
  const cornerMid = treat === 'mitre' ? 0 : treat === 'rounded' ? (Q.length - 1) / 2 : treat === 'notched' ? 1 : 2;
  // assemble: bottom mid, BR, right mid, TR, top mid, TL, left mid, BL.
  // A corner's quadrant list is mapped by the corner's two signs: (sx, sy)
  // for BR (+,+ in the corner's local frame), TR reflects y (travel +y then
  // -x is BR's travel turned a quarter: its entries are BR's with (dx,dy) ->
  // (-dy, dx) about the TR corner) — built by rotating the BR quadrant, which
  // a rectangle's symmetry makes the same set of points.
  const yb = w / 2;
  const pts = [], nrm = [], joins = [], anchorIdx = {};
  const push = (x, y, nx, ny, j) => { if (j) joins.push(pts.length); pts.push([x, y]); nrm.push([nx, ny]); };
  const corner = (cx0, cy0, rot) => {   // rot: quarter turns applied to the BR template
    const rk = (x, y) => { let X = x, Y = y; for (let k = 0; k < rot; k++) [X, Y] = [-Y, X]; return [X, Y]; };
    // the BR template is in a frame whose axes are swapped for odd rotations
    // of a NON-square rectangle only by position, never by shape, so the
    // corner shape is congruent at all four corners.
    Q.forEach(([dx, dy, nx, ny, j], i) => {
      const [X, Y] = rk(dx, dy), [NX, NY] = rk(nx, ny);
      if (i === cornerMid) anchorIdx[rot] = pts.length;
      push(cx0 + X, cy0 + Y, NX, NY, j);
    });
  };
  push(0, yb, 0, 1, false); anchorIdx.bottom = 0;
  corner(a, yb, 0);
  anchorIdx.right = pts.length; push(a, cy, -1, 0, false);
  corner(a, cy + b, 1);
  anchorIdx.top = pts.length; push(0, cy + b, 0, -1, false);
  corner(-a, cy + b, 2);
  anchorIdx.left = pts.length; push(-a, cy, 1, 0, false);
  corner(-a, yb, 3);
  const loop = { id: 'frame', pts, nrm, joins, closed: true, bandWidth: w };
  info.anchors = {
    bottomCentre: anchorAt(loop, anchorIdx.bottom), topCentre: anchorAt(loop, anchorIdx.top),
    sideR: anchorAt(loop, anchorIdx.right), sideL: anchorAt(loop, anchorIdx.left),
    cornerBR: anchorAt(loop, anchorIdx[0]), cornerTR: anchorAt(loop, anchorIdx[1]),
    cornerTL: anchorAt(loop, anchorIdx[2]), cornerBL: anchorAt(loop, anchorIdx[3]),
  };
  info.seam = { index: 0, antipode: anchorIdx.top };
  return { spines: [loop], info };
}

/* The oval: an ellipse centreline with semi-axes A = aspect · B (across) and
   B = (height − w)/2 (up), centred so the outer bottom is y = 0. Sampled
   UNIFORMLY IN THE NORMAL'S ANGLE — the arc's own 1.5° of turning per step,
   generalised — so the point for normal angle φ is (A² cos φ, B² sin φ) /
   √(A² cos² φ + B² sin² φ): the inward normal is exactly −(cos φ, sin φ), and
   a circle (aspect 1) is the arc law itself. The inner edge stays a curve
   (no swallowtail) iff the band's half-width is under the ellipse's least
   radius of curvature min(A,B)²/max(A,B); the aspect is clamped so the inner
   edge keeps a radius of at least half a feature, and TOLD. */
export const OVAL_STEP_DEG = 1.5;
export function ovalSkeleton(p) {
  const w = p.moldingWidth, F = MIN_FEATURE_MM;
  const info = { clamped: [], kind: 'oval' };
  const q = (w + F) / 2;                       // least centreline radius of curvature admitted
  let B = (p.height - w) / 2;
  if (B < q) { info.clamped.push(`a ${p.height} mm height leaves no opening under a ${w} mm band — the centreline held ${(2 * q).toFixed(1)} mm tall`); B = q; }
  let k = p.aspect;
  const kLo = Math.sqrt(q / B), kHi = B / q;
  if (k < kLo) { info.clamped.push(`aspect ${k.toFixed(2)} folds the inner edge at the sides — held at ${kLo.toFixed(3)}`); k = kLo; }
  if (k > kHi) { info.clamped.push(`aspect ${k.toFixed(2)} folds the inner edge at the top — held at ${kHi.toFixed(3)}`); k = kHi; }
  const A = k * B, cy = w / 2 + B;
  info.A = A; info.B = B; info.cy = cy; info.aspect = k;
  info.minRadius = Math.min(A, B) ** 2 / Math.max(A, B);
  const m = 2 * Math.ceil(45 / OVAL_STEP_DEG), n = 4 * m;   // a multiple of 8: both axes' ends and the diagonals are vertices
  const T = quarterTable(m);
  const pts = [], nrm = [];
  for (let i = 0; i < n; i++) {
    const [c, s] = quarterPoint(T, m, i);
    const den = Math.sqrt(A * A * c * c + B * B * s * s);
    pts.push([A * A * c / den, cy + B * B * s / den]);
    nrm.push([-c, -s]);
  }
  const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };
  info.anchors = {
    bottomCentre: anchorAt(loop, 0), sideR: anchorAt(loop, n / 4),
    topCentre: anchorAt(loop, n / 2), sideL: anchorAt(loop, 3 * n / 4),
  };
  info.seam = { index: 0, antipode: n / 2 };
  return { spines: [loop], info };
}

/* The one dispatch: every skeleton type returns { spines, info } and feeds
   the same sweep, relief and SVG. */
export function skeletonFor(p) {
  if (p.skeleton === 'rect') return rectSkeleton(p);
  if (p.skeleton === 'oval') return ovalSkeleton(p);
  return archSkeleton(p);
}

/* ------------------------------------------------------------------ */
/* Sweep + shading                                                     */
/* ------------------------------------------------------------------ */

/* Surface normal where the profile's across-slope is dzds (mm per mm) on a
   spine whose inward 2D normal is nrm. The band is in the picture plane, so
   the normal tilts about the spine's tangent only. */
export function normalAt(dzds, nrm) {
  const l = Math.hypot(dzds, 1);
  return [-dzds * nrm[0] / l, -dzds * nrm[1] / l, 1 / l];
}
export function lambert(N) { return Math.max(0, N[0] * LIGHT[0] + N[1] * LIGHT[1] + N[2] * LIGHT[2]); }

/* Darkness (0..1) of the band at profile sample i on a spine vertex with
   inward normal nrm. One expression: intensity × (1 − Lambert). */
export function darknessAt(prof, i, p, nrm) {
  const n = prof.x.length - 1;
  const i0 = Math.max(0, i - 1), i1 = Math.min(n, i + 1);
  const dzdx = (prof.z[i1] - prof.z[i0]) / (prof.x[i1] - prof.x[i0]);
  const dzds = dzdx * p.moldingDepth / p.moldingWidth;
  return p.shadeIntensity * (1 - lambert(normalAt(dzds, nrm)));
}

/* Creases: profile samples where the across-slope turns by more than
   CREASE_DEG — the edges of reeds, steps and flutes — get a drawn line. */
export const CREASE_DEG = 22;
function creaseIndices(prof, p) {
  const out = [];
  const n = prof.x.length - 1, k = p.moldingDepth / p.moldingWidth;
  for (let i = 1; i < n; i++) {
    const a0 = Math.atan((prof.z[i] - prof.z[i - 1]) / (prof.x[i] - prof.x[i - 1]) * k);
    const a1 = Math.atan((prof.z[i + 1] - prof.z[i]) / (prof.x[i + 1] - prof.x[i]) * k);
    if (Math.abs(a1 - a0) * 180 / Math.PI > CREASE_DEG) out.push(i);
  }
  return out;
}

/* Sweep the profile along one spine. Returns the strokes that draw the band:
     edges    the outer and inner edge polylines (offsetCurve at ±w/2)
     creases  offsetCurve at each crease sample
     hatch    engraving lines PARALLEL to the spine: the band is walked across
              at the hatch pitch and a line is laid wherever the accumulated
              darkness (per vertex, so a curved spine shades differently along
              its length) crosses one — 1-D error diffusion, which keeps the
              line count proportional to darkness without a threshold.
   Every polyline here is an offsetCurve of the spine. */
/* van der Corput base 2: 0, .5, .25, .75, .125, ... — evenly spread thresholds. */
export function vdc(k) { let r = 0, f = 0.5; for (let n = k + 1; n > 0; n = Math.floor(n / 2), f /= 2) if (n & 1) r += f; return r; }

/* Line weight follows darkness (ruling 1): the ONE place a darkness becomes
   a stroke width. Darkness is quantised onto HATCH_WEIGHT_STEPS levels (the
   level's midpoint is what the law reads) so a line splits into a handful of
   widths along its length rather than one per vertex. */
export function weightLevel(dark) { return Math.min(HATCH_WEIGHT_STEPS - 1, Math.max(0, Math.floor(dark * HATCH_WEIGHT_STEPS))); }
export function hatchWeight(dark, lineWeight) {
  const q = (weightLevel(dark) + 0.5) / HATCH_WEIGHT_STEPS;
  return lineWeight * (HATCH_WEIGHT_RANGE[0] + (HATCH_WEIGHT_RANGE[1] - HATCH_WEIGHT_RANGE[0]) * q);
}

/* A drawn stroke: { pts, dark, weight } — dark is the mean darkness the
   stroke was drawn at and weight its stroke width in mm. */
const stroke = (pts, dark, p) => ({ pts, dark, weight: hatchWeight(dark, p.lineWeight) });

/* The vertex order a hatch line is walked in on a CLOSED loop: from the
   first vertex where a run breaks (off, or a weight-level change) once round
   back to it; with no break anywhere, the whole ring plus its first vertex
   again, so the stroke closes. */
function closedOrder(run, levelOf) {
  const nv = run.length;
  let s0 = run.indexOf(false);
  if (s0 < 0) {
    for (let v = 0; v < nv && s0 < 0; v++) if (levelOf(v) !== levelOf((v + nv - 1) % nv)) s0 = v;
    if (s0 < 0) s0 = 0;
  }
  const order = [];
  for (let k = 0; k < nv; k++) order.push((s0 + k) % nv);
  if (run[s0]) order.push(s0);                 // every vertex on: end where it began
  return order;
}

export function sweepSpine(spine, prof, p) {
  const w = spine.bandWidth;
  const edges = [outerEdge(spine, w), innerEdge(spine, w)];
  const creases = creaseIndices(prof, p).map((i) => offsetPoly(spine, (prof.x[i] - 0.5) * w));
  // hatch candidates: across positions at the pitch, each mapped to the
  // nearest profile sample for its darkness. Line k is drawn over the
  // vertices where darkness exceeds an ORDERED threshold (van der Corput
  // over k, so thresholds are evenly spread across the band and the line
  // count is proportional to darkness) — a line then runs out exactly where
  // the tone along the spine falls under its threshold, the engraver's own
  // mark, instead of breaking into dashes.
  const nLines = Math.max(1, Math.floor(w / p.hatchPitch));
  const hatch = [];
  const nv = spine.pts.length;
  const tone = [];                              // per candidate: mean darkness, reported
  for (let k = 0; k < nLines; k++) {
    const x = (k + 0.5) / nLines;
    const i = Math.round(x * (prof.x.length - 1));
    const d = (x - 0.5) * w;
    const thr = vdc(k);
    let on = 0, sum = 0;
    const run = [];
    for (let v = 0; v < nv; v++) {
      const dk = darknessAt(prof, i, p, spine.nrm[v]);
      sum += dk;
      if (dk > thr) { run.push(true); on++; } else run.push(false);
    }
    tone.push(sum / nv);
    if (on) {
      const off = offsetCurve(spine, d);
      // a run is split where its WEIGHT LEVEL changes (the boundary vertex is
      // shared), so the line swells and thins along the spine; a run of one
      // vertex is no line. On a CLOSED loop the walk starts where a run
      // already breaks (an off vertex, else a level change) and goes once
      // round, so no run is cut at the seam; a line on at every vertex at one
      // level closes on its own first point.
      const order = spine.closed ? closedOrder(run, (v) => weightLevel(darknessAt(prof, i, p, spine.nrm[v]))) : null;
      let seg = null, segLevel = -1, segSum = 0;
      const close = () => { if (seg && seg.length >= 2) hatch.push(stroke(seg, segSum / seg.length, p)); seg = null; };
      for (let t = 0, len = order ? order.length : nv; t < len; t++) {
        const v = order ? order[t] : t;
        const dk = darknessAt(prof, i, p, spine.nrm[v]);
        if (run[v] && off[v]) {
          const lv = weightLevel(dk);
          if (seg && lv !== segLevel) { seg.push(off[v]); segSum += dk; close(); seg = [off[v]]; segSum = dk; segLevel = lv; continue; }
          if (!seg) { seg = []; segSum = 0; segLevel = lv; }
          seg.push(off[v]); segSum += dk;
        } else close();
      }
      close();
    }
  }
  const cross = crossHatch(spine, prof, p);
  return { id: spine.id, edges, creases, hatch, cross, tone };
}

/* Cross-hatching (ruling 6): lines ACROSS the band, one every hatch pitch
   ALONG the spine, drawn only over the stretch of the profile whose darkness
   exceeds crossHatchThreshold — a deep cove, a shadowed step. Each line is a
   chord between two of offsetCurve's own polylines (the profile samples
   bracketing the dark stretch), interpolated along the spine, so it is a
   CONSUMER of the one offset and runs out where the tone drops under the
   threshold — never drawn across the band and trimmed. Stations are placed
   from a LENGTH (the pitch in mm), never a count. */
export function crossHatch(spine, prof, p) {
  const out = [];
  const thr = p.crossHatchThreshold;
  const w = spine.bandWidth, n = prof.x.length - 1, nv = spine.pts.length;
  const offs = new Array(n + 1);
  const offAt = (i) => offs[i] || (offs[i] = offsetCurve(spine, (prof.x[i] - 0.5) * w));
  const lerp = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  let carry = 0;                                   // distance to the next station, in mm
  // an open spine walks its nv - 1 segments; a closed loop walks nv, the
  // last being the closing segment through the seam
  for (let v = 0, segs = spine.closed ? nv : nv - 1; v < segs; v++) {
    const vn = (v + 1) % nv;
    const [ax, ay] = spine.pts[v], [bx, by] = spine.pts[vn];
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    // the dark stretches across the band at this vertex's normal
    const dark = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) dark[i] = darknessAt(prof, i, p, spine.nrm[v]);
    const runs = [];
    for (let i = 0; i <= n; i++) {
      if (dark[i] > thr) { if (runs.length && runs[runs.length - 1][1] === i - 1) runs[runs.length - 1][1] = i; else runs.push([i, i]); }
    }
    for (let s = carry; s < len; s += p.hatchPitch) {
      const t = s / len;
      for (const [i0, i1] of runs) {
        if (i1 === i0) continue;                    // one sample is no length
        const A0 = offAt(i0)[v], A1 = offAt(i0)[vn], B0 = offAt(i1)[v], B1 = offAt(i1)[vn];
        if (!A0 || !A1 || !B0 || !B1) continue;     // past a join's bisector
        let sum = 0; for (let i = i0; i <= i1; i++) sum += dark[i];
        out.push(stroke([lerp(A0, A1, t), lerp(B0, B1, t)], sum / (i1 - i0 + 1), p));
      }
    }
    carry = ((carry - len) % p.hatchPitch + p.hatchPitch) % p.hatchPitch;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

export function profileFor(p, custom) {
  if (p.profilePreset === 'custom') return custom || PROFILE_PRESETS.flat;
  return PROFILE_PRESETS[p.profilePreset] || PROFILE_PRESETS.flat;
}

export function buildFrame(params, customProfile = null) {
  const p = { ...DEFAULTS, ...params };
  for (const s of PARAM_SPEC) if (s.kind === 'range') p[s.id] = Math.min(s.max, Math.max(s.min, +p[s.id]));
  const points = profileFor(p, customProfile);
  const prof = profileSamples(points);
  const { spines, info } = skeletonFor(p);
  const bands = spines.map((s) => sweepSpine(s, prof, p));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, strokes = 0;
  for (const b of bands) for (const poly of [...b.edges, ...b.creases, ...b.hatch.map((h) => h.pts), ...b.cross.map((h) => h.pts)]) {
    strokes++;
    for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { params: p, profile: points, prof, spines, bands, info, box: { x0, y0, x1, y1 }, strokes };
}

/* ------------------------------------------------------------------ */
/* SVG                                                                 */
/* ------------------------------------------------------------------ */

export const SVG_INK = '#0A0A0C', SVG_PAPER = '#EDEDE8';

/* viewBox is in model mm with y flipped; a `view` {x0,y0,x1,y1} pins the
   frame (the gate's fixed camera), otherwise it fits the drawing + margin. */
export function exportSvg(model, { view = null, margin = 8, paper = true } = {}) {
  const b = view || model.box;
  const W = b.x1 - b.x0 + 2 * margin, H = b.y1 - b.y0 + 2 * margin;
  const ox = b.x0 - margin, oy = b.y1 + margin;      // top-left in model space
  const f = (v) => +v.toFixed(3);
  const path = (poly) => poly.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x - ox)} ${f(oy - y)}`).join('');
  const lw = model.params.lineWeight;
  const parts = [];
  if (paper) parts.push(`<rect width="${f(W)}" height="${f(H)}" fill="${SVG_PAPER}"/>`);
  for (const band of model.bands) {
    const g = [`<g id="${band.id}" fill="none" stroke="${SVG_INK}" stroke-linecap="round" stroke-linejoin="round">`];
    g.push(`<path class="edge" stroke-width="${f(lw * 1.4)}" d="${band.edges.map(path).join('')}"/>`);
    if (band.creases.length) g.push(`<path class="crease" stroke-width="${f(lw)}" d="${band.creases.map(path).join('')}"/>`);
    // one <path> per DISTINCT weight per band, so the file stays a few
    // dozen paths while every stroke carries the width the law gave it
    for (const [cls, list] of [['hatch', band.hatch], ['cross', band.cross]]) {
      const byW = new Map();
      for (const h of list) { const k = f(h.weight); if (!byW.has(k)) byW.set(k, []); byW.get(k).push(h.pts); }
      for (const [k, polys] of [...byW.entries()].sort((a, b) => a[0] - b[0])) g.push(`<path class="${cls}" stroke-width="${k}" d="${polys.map(path).join('')}"/>`);
    }
    g.push('</g>');
    parts.push(g.join(''));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}mm" height="${f(H)}mm">${parts.join('')}</svg>`;
  return { svg, widthMm: W, heightMm: H };
}

/* ------------------------------------------------------------------ */
/* Instruments (read by the gate and the page's read-out)              */
/* ------------------------------------------------------------------ */

/* Darkness across the band of a STRAIGHT spine with inward normal nrm, per
   profile sample — the number "a flat band is uniform, a cove grades" is
   stated on. */
export function toneAcross(prof, p, nrm = [1, 0]) {
  const n = prof.x.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = darknessAt(prof, i, p, nrm);
  return out;
}

/* Distance from a point to a polyline (for the gate's ownership checks). */
export function distToPoly(pt, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(pt[0] - (ax + t * dx), pt[1] - (ay + t * dy)));
  }
  return best;
}

export const controlSpec = spec;
