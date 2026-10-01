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

import { DEFAULTS, LIGHT, PROFILE_PRESETS, PROFILE_SAMPLES, PARAM_SPEC } from './frame-registry.js';

export { DEFAULTS, LIGHT, PROFILE_PRESETS, PROFILE_SAMPLES };

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
function joinSpines(id, a, b, extra = {}) {
  const n1 = a.nrm[a.nrm.length - 1], n2 = b.nrm[0];
  const sx = n1[0] + n2[0], sy = n1[1] + n2[1], l = Math.hypot(sx, sy);
  const cosHalf = l / 2;                       // |n1 + n2| / 2 = cos(turn / 2)
  const mitre = cosHalf > 1e-9 ? [sx / l / cosHalf, sy / l / cosHalf] : n1;
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
  for (const j of spine.joins || []) {
    const P = out[j], b = spine.nrm[j];
    for (let i = 0; i < out.length; i++) {
      if (i === j || !out[i]) continue;
      const side = b[0] * (out[i][1] - P[1]) - b[1] * (out[i][0] - P[0]);   // cross(b, q - P)
      if ((i < j && side < 0) || (i > j && side > 0)) out[i] = null;
    }
  }
  return out;
}
export const offsetPoly = (spine, d) => offsetCurve(spine, d).filter(Boolean);

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
    const bounds = [-a];                        // light boundaries are CENTRELINES
    for (let i = 1; i <= n; i++) {
      const x = xInL + i * clear + (i - 1) * wm + wm / 2;
      info.mullionX.push(x); bounds.push(x);
    }
    bounds.push(a);
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
  return { spines, info };
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
      let seg = null;
      for (let v = 0; v < nv; v++) {
        if (run[v] && off[v]) { if (!seg) { seg = []; hatch.push(seg); } seg.push(off[v]); }
        else if (seg) { if (seg.length === 1) hatch.pop(); seg = null; }
      }
      if (seg && seg.length === 1) hatch.pop();
    }
  }
  return { id: spine.id, edges, creases, hatch, tone };
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
  const { spines, info } = archSkeleton(p);
  const bands = spines.map((s) => sweepSpine(s, prof, p));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, strokes = 0;
  for (const b of bands) for (const poly of [...b.edges, ...b.creases, ...b.hatch]) {
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
    if (band.hatch.length) g.push(`<path class="hatch" stroke-width="${f(lw)}" d="${band.hatch.map(path).join('')}"/>`);
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
