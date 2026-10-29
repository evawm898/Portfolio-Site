/* cage-geometry.js — the Parametric Cage's one model.

   THE LAW. A cage is VERTICAL BARS laid on a surface of revolution (round) or a
   regular prism (4 / 6 / 8 sides) whose SIDE PROFILE is a drawn curve, crossed
   by HORIZONTAL RINGS, with a DOOR cut through the bars and closed by a frame
   wire. `buildCage(params)` is the ONE owner of the geometry: every wire is
   first a CENTRELINE in millimetres (`model.wires`), the STL sweeps those
   centrelines into closed tubes (`model.mesh`) and the SVG projects the SAME
   centrelines onto the front elevation. Neither export reads the parameters.

   WHAT IS IMPORTED, AND WHAT IS NOT. The profile curve is bloom-curve.js's
   value (a 'single' PCHIP function curve; its editor refuses, never clamps).
   The indexed accumulator and the binary STL writer are frame-relief.js's own
   `Mesh` and `exportStl`, called unchanged. The 3D tube sweep is written here:
   nothing else in this repository sweeps a 3D polyline (frame's filigree is a
   planar height field; bloom's rods are its own spine law). `revolve()` is a
   copy of bloom's 12-line `revolveInto` core — a duplication, noted here, kept
   rather than extracted because bloom-geometry.js is CI-filtered by five gates.

   PRINT. The floor is MIN_FEATURE_MM, assumed for SLS PA12 (the process this
   site's generators assume; nothing has been printed). Every wire radius is
   floored to it and the clamp is TOLD in `model.told`. SLS needs no support,
   so overhang is REPORTED, never clamped: `model.overhang` is the shallowest
   angle a wire makes with the horizontal, for an FDM reader to judge.

   EXPORT CONTRACT (the site's): every part is an individually closed solid;
   parts overlap and a slicer unions them. Each tube is closed by its end
   fans; a ring is a torus with no caps; a revolved part closes on its own
   centre fans. Orientation is fixed per part by signed volume.

   AXES. Z up, the base ring at z = 0, the door faces −y (the front elevation
   looks along +y from −y, so x reads left to right on the drawing). */

import { curveFunction, curveShapeRefusal, cloneCurve } from './bloom-curve.js';
import { Mesh, exportStl as writeStl } from './frame-relief.js';

export const MIN_FEATURE_MM = 1.0;
export const PRINT_NOTE = `${MIN_FEATURE_MM.toFixed(1)} mm minimum wire, assumed for SLS PA12 (a declared guess: nothing printed yet)`;
export const FDM_OVERHANG_DEG = 45;      // the angle from horizontal below which an FDM print wants support
export const TUBE_SIDES = 10;            // a wire's section; a 1.4 mm bar's facet is 0.44 mm
export const RING_SECTORS = 96;          // samples round a round ring
export const BODY_STEP_MM = 1.5;         // bar sample spacing up the body
export const CAP_STEP_MM = 1.0;          // and over the top cap, where the curvature is
/* Eva's ruling 1 (Oct 29): bars read as individual wires meeting a collar. They converge until
   neighbouring bars are ONE PRINTABLE GAP apart (pitch = bar diameter + the floor), never until
   they touch — the pack is derived from the floor and the bar, not typed (phase 1's 1.05-diameter
   pack constant is retired). The collar is a turned BOSS with a bead, and the hanger stands on it. */
export const SHOULDER_DEG = 25;          // ruling 5: a profile knot whose chords turn by at least this (in mm) is a shoulder and auto-places a ring

/* ---- the profile curve (bloom-curve.js's own kind) ---- */
export const PROFILE_SPEC = Object.freeze({ modes: ['single'], x: [0, 1], y: [0.08, 1], points: [2, 10], lock: { first: 'x', last: 'x' }, monotoneX: true, owner: 'heightMm' });
const P = (pts) => ({ mode: 'single', points: pts.map((p) => [p[0], p[1]]) });

/* ---- registry ---- */
export const SECTIONS = [
  { id: 'body', label: 'Body', open: true },
  { id: 'top', label: 'Top', open: true },
  { id: 'bars', label: 'Bars', open: true },
  { id: 'rings', label: 'Rings', open: true },
  { id: 'door', label: 'Door', open: true },
  { id: 'base', label: 'Base', open: false },
  { id: 'hanger', label: 'Hanger', open: false },
  { id: 'fine', label: 'Fine', open: false, parent: 'body' },
  { id: 'print', label: 'Print', open: false },
];
const R = (id, section, label, min, max, step, def, unit = '', visibleWhen = null) => ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });
const C = (id, section, label, options, def, visibleWhen = null) => ({ id, section, label, kind: 'choice', options, default: def, visibleWhen });
const B = (id, section, label, def, visibleWhen = null) => ({ id, section, label, kind: 'bool', default: def, visibleWhen });

export const PRESET_IDS = ['cylinder', 'bell', 'cone', 'onion', 'tiered', 'hexLantern'];
export const PRESET_LABELS = { custom: 'Custom', cylinder: 'Cylinder', bell: 'Bell', cone: 'Pyramid / cone', onion: 'Onion', tiered: 'Tiered dome on drum', hexLantern: 'Hex lantern' };
const notFlat = (p) => p.topShape !== 'flat';
const hasDoor = (p) => p.doorShape !== 'none';

export const PARAM_SPEC = [
  C('preset', 'body', 'Preset', ['custom', ...PRESET_IDS].map((k) => [k, PRESET_LABELS[k]]), 'bell'),
  R('widthMm', 'body', 'Width', 40, 160, 1, 90, 'mm'),
  R('heightMm', 'body', 'Body height', 40, 240, 1, 140, 'mm'),
  C('sides', 'body', 'Cross-section', [['0', 'round'], ['4', '4 sides'], ['6', '6 sides'], ['8', '8 sides']], '0'),
  C('topShape', 'top', 'Top', [['flat', 'flat'], ['dome', 'dome'], ['spire', 'point / spire'], ['onion', 'onion']], 'dome'),
  R('topHeight', 'top', 'Top height (× top radius)', 0.2, 1.6, 0.05, 0.6, '', notFlat),
  R('barCount', 'bars', 'Bars', 6, 48, 1, 22),
  R('barMm', 'bars', 'Bar thickness', 0.8, 3, 0.1, 1.1, 'mm'),
  B('barsConverge', 'bars', 'bars converge at the apex (off: end at the top ring)', true, notFlat),
  R('ringCount', 'rings', 'Rings between base and top', 0, 8, 1, 3),
  C('ringPlace', 'rings', 'Placement', [['even', 'even'], ['clustered', 'clustered toward the ends']], 'even'),
  R('ringMm', 'rings', 'Ring thickness', 0.8, 4, 0.1, 1.8, 'mm'),
  C('doorShape', 'door', 'Door', [['none', 'none'], ['rect', 'rectangle'], ['arch', 'round arch'], ['gothic', 'gothic point'], ['ogee', 'ogee']], 'arch'),
  R('doorWidth', 'door', 'Door width', 10, 90, 1, 28, 'mm', hasDoor),
  R('doorHeight', 'door', 'Door height', 10, 180, 1, 46, 'mm', hasDoor),
  R('doorY', 'door', 'Door position (bottom, of the body height)', 0, 1, 0.01, 0.08, '', hasDoor),
  R('doorFrameMm', 'door', 'Door frame thickness', 1, 4, 0.1, 2.0, 'mm', hasDoor),
  C('baseStyle', 'base', 'Base', [['ring', 'plain ring'], ['tray', 'tray'], ['skirt', 'scalloped skirt'], ['feet', 'feet']], 'tray'),
  R('skirtMm', 'base', 'Skirt depth', 4, 20, 0.5, 9, 'mm', (p) => p.baseStyle === 'skirt'),
  R('scallopCount', 'base', 'Scallops (built as a divisor of the bar count, cusps on bars)', 2, 24, 1, 8, '', (p) => p.baseStyle === 'skirt'),
  R('footCount', 'base', 'Feet', 3, 8, 1, 4, '', (p) => p.baseStyle === 'feet'),
  C('hanger', 'hanger', 'Hanger', [['none', 'none'], ['ring', 'ring'], ['hook', 'hook'], ['finial', 'finial + ring']], 'finial'),
  R('hangerMm', 'hanger', 'Hanger size', 4, 16, 0.5, 7, 'mm', (p) => p.hanger !== 'none'),
  R('frameRingMult', 'fine', 'Base and top ring (× ring)', 1, 2, 0.05, 1.25),
  R('collarMult', 'fine', 'Apex collar (× the radius the bars meet it at)', 1, 2, 0.05, 1.0, '', notFlat),
  R('minFeature', 'print', 'Minimum wire (print floor)', 0.8, 2, 0.1, MIN_FEATURE_MM, 'mm'),
];
export const PRESET_FIELD_IDS = PARAM_SPEC.filter((s) => s.section !== 'print' && s.id !== 'preset').map((s) => s.id);

/* THE PRESETS — whole states, not proportions: picking one writes every field
   it names and the profile; editing any of them afterwards makes the preset
   'custom' (the page does that; this file only says what a preset IS).
   THE DEFAULT IS THE BELL (Eva, Oct 29, second round): 90 W × 140 H, dome 0.6 — an antique
   wrought cage, clearly taller than wide — on 1.1 mm bars, which every preset carries as the
   default bar. 1.1 sits above MIN_FEATURE_MM (1.0), so no floor binds on it. The onion carries
   three rings, the upper one (0.75 H) in its neck taper. */
export const PRESETS = {
  cylinder: { profile: P([[0, 1], [1, 1]]), sides: '0', topShape: 'dome', topHeight: 0.6, barCount: 20, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'arch', doorWidth: 30, doorHeight: 48, doorY: 0.1, baseStyle: 'ring', hanger: 'ring', widthMm: 90, heightMm: 110 },
  bell: { profile: P([[0, 1], [0.3, 0.96], [0.65, 0.8], [1, 0.64]]), sides: '0', topShape: 'dome', topHeight: 0.6, barCount: 22, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'arch', doorWidth: 28, doorHeight: 46, doorY: 0.08, baseStyle: 'tray', hanger: 'finial', widthMm: 90, heightMm: 140 },
  cone: { profile: P([[0, 1], [1, 0.48]]), sides: '4', topShape: 'spire', topHeight: 1.1, barCount: 16, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'gothic', doorWidth: 26, doorHeight: 50, doorY: 0.1, baseStyle: 'tray', hanger: 'ring', widthMm: 100, heightMm: 120 },
  onion: { profile: P([[0, 0.72], [0.3, 0.96], [0.55, 1], [1, 0.74]]), sides: '0', topShape: 'onion', topHeight: 1.15, barCount: 24, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'ogee', doorWidth: 28, doorHeight: 50, doorY: 0.12, baseStyle: 'feet', hanger: 'finial', widthMm: 96, heightMm: 100 },
  tiered: { profile: P([[0, 1], [0.58, 1], [0.66, 0.7], [1, 0.7]]), sides: '0', topShape: 'dome', topHeight: 0.65, barCount: 24, barMm: 1.1, barsConverge: true, ringCount: 4, ringPlace: 'clustered', ringMm: 1.8, doorShape: 'rect', doorWidth: 30, doorHeight: 40, doorY: 0.1, baseStyle: 'skirt', scallopCount: 8, hanger: 'finial', widthMm: 100, heightMm: 130 },
  hexLantern: { profile: P([[0, 1], [1, 1]]), sides: '6', topShape: 'spire', topHeight: 0.85, barCount: 18, barMm: 1.1, barsConverge: true, ringCount: 2, ringPlace: 'even', ringMm: 1.8, doorShape: 'rect', doorWidth: 28, doorHeight: 52, doorY: 0.12, baseStyle: 'feet', hanger: 'hook', widthMm: 86, heightMm: 120 },
};

export const DEFAULTS = Object.freeze({ ...Object.fromEntries(PARAM_SPEC.map((s) => [s.id, s.default])), ...PRESETS.bell, preset: 'bell' });
export const defaultParams = () => ({ ...DEFAULTS, profile: cloneCurve(DEFAULTS.profile) });
export function applyPreset(params, id) {
  const pr = PRESETS[id]; if (!pr) throw new Error(`no preset ${id}`);
  const out = { ...params, ...pr, profile: cloneCurve(pr.profile), preset: id };
  return out;
}

/* ---- the randomizer: seeded, every field inside its own range ---- */
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function randomParams(seed) {
  const rnd = mulberry32(seed >>> 0);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const within = (lo, hi, step) => { const v = lo + rnd() * (hi - lo); return +(Math.round(v / step) * step).toFixed(4); };
  const base = applyPreset(defaultParams(), pick(PRESET_IDS));
  const p = { ...base, preset: 'custom' };
  p.widthMm = within(60, 130, 1); p.heightMm = within(70, 180, 1);
  p.sides = pick(['0', '0', '0', '4', '6', '8']);
  p.topShape = pick(['dome', 'dome', 'spire', 'onion', 'flat']);
  p.topHeight = within(0.4, 1.3, 0.05);
  p.barCount = within(12, 36, 1); p.barMm = within(1.0, 2.0, 0.1); p.barsConverge = rnd() < 0.7;
  p.ringCount = within(1, 6, 1); p.ringPlace = pick(['even', 'even', 'clustered']); p.ringMm = within(1.2, 2.6, 0.1);
  p.doorShape = pick(['rect', 'arch', 'arch', 'gothic', 'ogee']); p.doorWidth = within(20, 40, 1); p.doorHeight = within(30, 70, 1); p.doorY = within(0, 0.3, 0.01);
  p.baseStyle = pick(['ring', 'tray', 'skirt', 'feet']); p.scallopCount = within(4, 14, 1); p.hanger = pick(['none', 'ring', 'hook', 'finial']);
  // the profile: one of five families, jittered — a function of height, monotone in x by construction
  const fam = rnd();
  const j = () => within(-0.08, 0.08, 0.01);
  let pts;
  if (fam < 0.25) pts = [[0, 1], [1, 1]];
  else if (fam < 0.5) pts = [[0, 1], [0.35, within(0.9, 1, 0.01)], [1, within(0.5, 0.8, 0.01)]];
  else if (fam < 0.7) pts = [[0, within(0.65, 0.85, 0.01)], [0.32, within(0.92, 1, 0.01)], [0.6, 1], [1, within(0.65, 0.85, 0.01)]];
  else if (fam < 0.85) { const s = within(0.5, 0.65, 0.01); pts = [[0, 1], [s, 1], [+(s + 0.07).toFixed(2), within(0.6, 0.78, 0.01)], [1, within(0.6, 0.78, 0.01)]]; }
  else pts = [[0, 1], [1, within(0.35, 0.6, 0.01)]];
  pts = pts.map(([x, y], i) => [x, Math.min(1, Math.max(0.3, y + (i && i < pts.length - 1 ? j() : 0)))]);
  p.profile = { mode: 'single', points: pts };
  if (curveShapeRefusal(p.profile, PROFILE_SPEC)) p.profile = cloneCurve(PRESETS.cylinder.profile);
  return p;
}

/* ---- vector helpers ---- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const TAU = Math.PI * 2;
const wrapPi = (a) => { a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a; };

/* ---- the surface: radius at (azimuth, body height) ---- */
/* A regular N-gon of circumradius r: the boundary at azimuth θ. Corners at
   θ = 2πk/N; the face between two corners is a chord, so the boundary radius
   is the apothem over the cosine of the angle from the face's centre. */
export function polyRadius(r, theta, N) {
  if (!N) return r;
  const faceC = Math.PI / N;
  let a = ((theta % (2 * faceC)) + 2 * faceC) % (2 * faceC) - faceC;   // angle from the nearest face centre, in [-π/N, π/N]
  return r * Math.cos(faceC) / Math.cos(a);
}

/* THE TOP CAP LAW g(s): the cap radius as a fraction of the body's top radius,
   s = 0 at the top ring, 1 at the apex. Each is 1 at s = 0 and 0 at s = 1. */
export function capLaw(shape, s) {
  s = Math.min(1, Math.max(0, s));
  if (shape === 'dome') return Math.sqrt(Math.max(0, 1 - s * s));
  if (shape === 'spire') return Math.pow(1 - s, 1.35);
  if (shape === 'onion') return Math.pow(Math.max(0, 1 - Math.pow(s, 2.6)), 0.55) * (1 + 0.34 * Math.sin(Math.PI * Math.pow(s, 0.85)));
  return 0;   // flat: no cap
}

/* THE PROFILE'S SHOULDERS (ruling 5): a knot of the drawn profile whose two chords, in
   millimetres (radius Rb·y against height H·x), turn by SHOULDER_DEG or more. PCHIP is C1 at
   every knot, so a one-sided slope cannot see a step; the chords can. Returns body heights. */
export function profileShoulders(points, Rb, H) {
  const out = [];
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const a0 = Math.atan2(Rb * (y1 - y0), H * (x1 - x0)), a1 = Math.atan2(Rb * (y2 - y1), H * (x2 - x1));
    if (Math.abs(a1 - a0) * 180 / Math.PI >= SHOULDER_DEG - 1e-9) out.push(H * x1);
  }
  return out;
}

/* THE DOOR OUTLINE: the top edge's height above the sill at arc offset s from
   the door's centre, |s| ≤ a (half the door width); the outline is pointed at
   s = 0 for gothic and ogee, round for the arch, flat for the rectangle. */
export function doorTop(shape, s, a, h) {
  const u = Math.min(1, Math.abs(s) / a);
  if (shape === 'rect') return h;
  if (shape === 'arch') { const r = Math.min(a, 0.5 * h); return h - r + Math.sqrt(Math.max(0, r * r - Math.pow(u * a, 2) * (r / a) * (r / a))); }
  if (shape === 'gothic') { const rise = Math.min(0.6 * h, 0.866 * 2 * a); const zs = h - rise; const R2 = (2 * a) * (2 * a); return zs + (rise / (0.866 * 2 * a)) * Math.sqrt(Math.max(0, R2 - Math.pow(u * a + a, 2))); }
  if (shape === 'ogee') { const rise = Math.min(0.55 * h, 1.1 * a); const zs = h - rise; return zs + rise * (1 - u) * (1 - 0.55 * Math.sin(Math.PI * u)); }
  return h;
}

/* ---- mesh primitives ---- */
function signedVolume(mesh, t0) {
  const Pp = mesh.pos, I = mesh.idx; let v = 0;
  for (let t = t0; t < I.length / 3; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    v += Pp[a] * (Pp[b + 1] * Pp[c + 2] - Pp[b + 2] * Pp[c + 1]) - Pp[a + 1] * (Pp[b] * Pp[c + 2] - Pp[b + 2] * Pp[c]) + Pp[a + 2] * (Pp[b] * Pp[c + 1] - Pp[b + 1] * Pp[c]);
  }
  return v / 6;
}
function beginPart(mesh, kind, name) { mesh.parts.push({ kind, name, v0: mesh.pos.length / 3, t0: mesh.idx.length / 3 }); }
function endPart(mesh) {
  const q = mesh.parts[mesh.parts.length - 1];
  q.v1 = mesh.pos.length / 3; q.t1 = mesh.idx.length / 3;
  if (signedVolume(mesh, q.t0) < 0) for (let t = q.t0; t < q.t1; t++) { const k = 3 * t + 1, tmp = mesh.idx[k]; mesh.idx[k] = mesh.idx[k + 1]; mesh.idx[k + 1] = tmp; }
}

/* THE TUBE SWEEP. A polyline of 3D points → a closed tube of radius r with K
   sides. The section frame is a rotation-minimising frame (double reflection)
   along the polyline; at every interior vertex the section is placed in the
   BISECTOR plane and stretched by 1 / cos(half the turn) along the in-bend
   direction — the exact elliptical mitre, so a polygon ring's 60° corners are
   true mitres and a smooth curve's vertices stretch by ~1. A CLOSED loop
   spreads its frame's end-to-end twist evenly round the loop so the seam
   matches to the bit; an OPEN run is closed by a fan at each end. */
export function tube(mesh, pts, r, { closed = false, sides = TUBE_SIDES, kind = 'wire', name = '' } = {}) {
  const n = pts.length;
  if (n < 2) return;
  beginPart(mesh, kind, name);
  const tang = [], T = [];
  for (let i = 0; i < n; i++) {
    const prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const next = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
    const tin = i === 0 && !closed ? sub(pts[1], pts[0]) : sub(pts[i], prev);
    const tout = i === n - 1 && !closed ? sub(pts[n - 1], pts[n - 2]) : sub(next, pts[i]);
    tang.push([norm(tin), norm(tout)]);
    T.push(norm(add(norm(tin), norm(tout))));
  }
  // first normal: anything perpendicular to T[0]
  let N0 = cross(T[0], Math.abs(T[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]); N0 = norm(N0);
  const Ns = [N0];
  for (let i = 1; i < n; i++) {
    // double reflection (Wang et al.) from (pts[i-1], T[i-1], N[i-1]) to (pts[i], T[i])
    const v1 = sub(pts[i], pts[i - 1]); const c1 = dot(v1, v1) || 1;
    const rL = sub(Ns[i - 1], mul(v1, 2 * dot(v1, Ns[i - 1]) / c1));
    const tL = sub(T[i - 1], mul(v1, 2 * dot(v1, T[i - 1]) / c1));
    const v2 = sub(T[i], tL); const c2 = dot(v2, v2) || 1;
    Ns.push(norm(sub(rL, mul(v2, 2 * dot(v2, rL) / c2))));
  }
  let twist = 0;
  if (closed) {
    // the frame carried round the loop against the first normal: spread the mismatch
    const v1 = sub(pts[0], pts[n - 1]); const c1 = dot(v1, v1) || 1;
    const rL = sub(Ns[n - 1], mul(v1, 2 * dot(v1, Ns[n - 1]) / c1));
    const tL = sub(T[n - 1], mul(v1, 2 * dot(v1, T[n - 1]) / c1));
    const v2 = sub(T[0], tL); const c2 = dot(v2, v2) || 1;
    const Nend = norm(sub(rL, mul(v2, 2 * dot(v2, rL) / c2)));
    const B0 = cross(T[0], Ns[0]);
    twist = Math.atan2(dot(Nend, B0), dot(Nend, Ns[0]));
  }
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = T[i]; let nn = Ns[i];
    if (closed && twist) { const a = -twist * i / n, b = cross(t, nn); nn = norm(add(mul(nn, Math.cos(a)), mul(b, Math.sin(a)))); }
    const bb = cross(t, nn);
    // the mitre: stretch along the in-bend direction by 1/cos(half turn)
    const [tin, tout] = tang[i];
    const cosTurn = Math.max(-1, Math.min(1, dot(tin, tout)));
    const half = Math.acos(cosTurn) / 2;
    const stretch = half < 1.2 ? 1 / Math.cos(half) : 1 / Math.cos(1.2);   // a hairpin is capped rather than infinite
    let inb = sub(tout, tin); const il = len(inb);
    inb = il > 1e-9 ? norm(sub(inb, mul(t, dot(inb, t)))) : nn;
    const ring = [];
    for (let k = 0; k < sides; k++) {
      const a = TAU * k / sides;
      const d = add(mul(nn, Math.cos(a)), mul(bb, Math.sin(a)));
      const along = dot(d, inb);
      const dd = add(d, mul(inb, along * (stretch - 1)));
      ring.push(mesh.vertex(pts[i][0] + r * dd[0], pts[i][1] + r * dd[1], pts[i][2] + r * dd[2]));
    }
    rings.push(ring);
  }
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = rings[i], b = rings[(i + 1) % n];
    for (let k = 0; k < sides; k++) { const k2 = (k + 1) % sides; mesh.quad(a[k], a[k2], b[k2], b[k]); }
  }
  if (!closed) {
    const c0 = mesh.vertex(...pts[0]), c1 = mesh.vertex(...pts[n - 1]);
    for (let k = 0; k < sides; k++) { const k2 = (k + 1) % sides; mesh.tri(c0, rings[0][k2], rings[0][k]); mesh.tri(c1, rings[n - 1][k], rings[n - 1][k2]); }
  }
  endPart(mesh);
}

/* THE REVOLVE — bloom-geometry.js's `revolveInto` core, copied: a profile of
   (r, z) pairs about the z axis, `sectors` round, closed by a centre fan at
   each end (a profile ending at r = 0 fans onto the axis). `azimuth(r, θ)`
   lets a polygon prism revolve the same profile. */
export function revolve(mesh, profile, { sectors = 48, cx = 0, cy = 0, kind = 'solid', name = '', poly = 0 } = {}) {
  beginPart(mesh, kind, name);
  const rings = profile.map(([r, z]) => {
    const ring = [];
    for (let j = 0; j < sectors; j++) { const th = TAU * j / sectors, rr = polyRadius(r, th, poly); ring.push(mesh.vertex(cx + rr * Math.cos(th), cy + rr * Math.sin(th), z)); }
    return ring;
  });
  for (let i = 1; i < rings.length; i++) for (let j = 0; j < sectors; j++) { const j2 = (j + 1) % sectors; mesh.quad(rings[i - 1][j], rings[i - 1][j2], rings[i][j2], rings[i][j]); }
  const s = mesh.vertex(cx, cy, profile[0][1]), nth = mesh.vertex(cx, cy, profile[profile.length - 1][1]);
  const last = rings[rings.length - 1];
  for (let j = 0; j < sectors; j++) { const j2 = (j + 1) % sectors; mesh.tri(s, rings[0][j2], rings[0][j]); mesh.tri(nth, last[j], last[j2]); }
  endPart(mesh);
}

/* ---- the build ---- */
export function buildCage(paramsIn) {
  const p = { ...paramsIn };
  const told = [];
  const floor = Math.max(MIN_FEATURE_MM, +p.minFeature || MIN_FEATURE_MM);
  const wireR = (mm, what) => { const r = mm / 2; if (r < floor / 2) { told.push(`${what} ${mm.toFixed(2)} mm raised to the ${floor.toFixed(1)} mm floor`); return floor / 2; } return r; };
  const N = +p.sides | 0;                       // 0 = round
  const Rb = p.widthMm / 2, H = p.heightMm;
  const why = curveShapeRefusal(p.profile, PROFILE_SPEC);
  if (why) throw new Error(`profile: ${why}`);
  const f = curveFunction(p.profile.points, PROFILE_SPEC);
  const rho = (z) => Rb * (f(Math.min(1, Math.max(0, z / H))) ?? 1);   // circumradius at body height z
  const rTop = rho(H);
  const flat = p.topShape === 'flat';
  const Hc = flat ? 0 : p.topHeight * rTop;
  const capR = (s) => rTop * capLaw(p.topShape, s);
  // the bars: a polygon's corners must carry one, so the count is a multiple of N (told when it moved)
  let barCount = Math.round(p.barCount);
  if (N && barCount % N) { const bc = Math.max(N, Math.round(barCount / N) * N); told.push(`${barCount} bars rounded to ${bc} so every corner of the ${N}-gon carries one`); barCount = bc; }
  const rBar = wireR(p.barMm, 'bar'), rRing = wireR(p.ringMm, 'ring'), rFrame = wireR(p.ringMm * p.frameRingMult, 'base/top ring');
  const rDoor = wireR(p.doorFrameMm, 'door frame');
  const surf = (th, z) => { const r = polyRadius(rho(z), th, N); return [r * Math.cos(th), r * Math.sin(th), z]; };
  const capPt = (th, s) => { const r = polyRadius(capR(s), th, N); return [r * Math.cos(th), r * Math.sin(th), H + s * Hc]; };

  const mesh = new Mesh();
  const wires = [];        // { kind, pts, r } centrelines for the SVG and the gate
  const solids = [];       // { kind, profile, cx, cy } revolved parts for the SVG silhouette
  const stations = [];     // body z samples, bottom to top
  const nz = Math.max(24, Math.ceil(H / BODY_STEP_MM));
  for (let i = 0; i <= nz; i++) stations.push(H * i / nz);

  /* the apex collar: bars converge until neighbouring bars are one printable
     gap apart (pitch = 2·rBar + floor), which fixes the collar's radius from the
     bar count, the bar and the floor rather than from a typed number */
  const collarPitch = 2 * rBar + floor;
  let collar = null;
  if (!flat) {
    const packR = Math.max(2 * rBar, barCount * collarPitch / TAU);
    // the cap station where its radius reaches packR (bisection on a decreasing law)
    let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (capR(m) > packR) lo = m; else hi = m; }
    const sC = hi, zC = H + sC * Hc;
    const rc = packR * p.collarMult;
    collar = { sC, zC, rc, packR, pitch: collarPitch, zTop: H + Hc, zBot: zC - Math.max(2.0, rc * 0.6) };
    if (sC < 0.3) told.push(`${barCount} bars at ${(2 * rBar).toFixed(1)} mm, one ${floor.toFixed(1)} mm gap apart, meet the collar at ${(100 * (1 - sC)).toFixed(0)}% of the cap's height — a wide collar; fewer or thinner bars tighten it`);
  }

  /* the door, in (arc s, height z) on the surface, facing -y */
  const thD = -Math.PI / 2;
  let door = null;
  if (p.doorShape !== 'none') {
    const circ0 = TAU * rho(0) * 0.42;   // no door wider than 42% of the circumference at the sill
    let W = p.doorWidth; if (W > circ0) { told.push(`door width ${W} mm held to ${circ0.toFixed(0)} mm (42% of the circumference)`); W = circ0; }
    let Dh = Math.min(p.doorHeight, H * 0.92); if (Dh < p.doorHeight) told.push(`door height ${p.doorHeight} mm held to ${Dh.toFixed(0)} mm inside the body`);
    const z0 = Math.max(rFrame + rDoor, p.doorY * (H - Dh));
    const a = W / 2;
    const top = (s) => z0 + doorTop(p.doorShape, s, a, Dh);
    const inside = (s, z) => Math.abs(s) < a && z > z0 && z < top(s);
    // the arc offset of azimuth θ at height z: the surface distance from the door's centre meridian
    const sOf = (th, z) => wrapPi(th - thD) * polyRadius(rho(z), th, N);
    door = { W, Dh, z0, a, top, inside, sOf, shape: p.doorShape };
    // the frame wire: sill, right jamb up, the top edge right→left, the left jamb down
    const fpts = [];
    // the inverse of sOf — ONE owner of the surface arc coordinate for the frame, the bars and the rings:
    // bisect the azimuth whose arc offset is s (s(θ) = (θ − θd)·ρ(θ) is monotone over the door's span)
    const onSurf = (s, z) => { let lo = thD - Math.PI * 0.9, hi = thD + Math.PI * 0.9; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (sOf(m, z) < s) lo = m; else hi = m; } return surf((lo + hi) / 2, z); };
    const nTop = 48, nJ = Math.max(4, Math.ceil(Dh / 2));
    for (let i = 0; i < nJ; i++) fpts.push(onSurf(a, z0 + (top(a) - z0) * i / nJ));
    for (let i = 0; i <= nTop; i++) { const s = a - 2 * a * i / nTop; fpts.push(onSurf(s, top(s))); }
    for (let i = 1; i <= nJ; i++) fpts.push(onSurf(-a, top(-a) - (top(-a) - z0) * i / nJ));
    for (let i = 1; i < nTop; i++) fpts.push(onSurf(-a + 2 * a * i / nTop, z0));
    // a pointed top edge repeats its apex: drop coincident consecutive points
    const fp = fpts.filter((q, i) => i === 0 || len(sub(q, fpts[i - 1])) > 1e-6);
    tube(mesh, fp, rDoor, { closed: true, kind: 'door', name: 'door frame' });
    wires.push({ kind: 'door', pts: fp, r: rDoor, closed: true });
  }

  /* the bars */
  const dz = (z) => { const e = Math.min(0.5, H * 1e-3); return (rho(z + e) - rho(z - e)) / (2 * e); };
  const overhang = { deg: 90, where: '' };
  const noteSlope = (v, where) => { const deg = Math.atan2(Math.abs(v[2]), Math.hypot(v[0], v[1])) * 180 / Math.PI; if (deg < overhang.deg) { overhang.deg = deg; overhang.where = where; } };
  const cutRuns = (pts, isInside) => {
    // split a polyline where `isInside` holds, ending each run exactly where it crosses the door outline (bisected)
    const runs = []; let cur = [];
    const cross = (A, B) => { let lo = 0, hi = 1; const ia = isInside(A); for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; const Q = [A[0] + (B[0] - A[0]) * m, A[1] + (B[1] - A[1]) * m, A[2] + (B[2] - A[2]) * m]; if (isInside(Q) === ia) lo = m; else hi = m; } const m = (lo + hi) / 2; return [A[0] + (B[0] - A[0]) * m, A[1] + (B[1] - A[1]) * m, A[2] + (B[2] - A[2]) * m]; };
    for (let i = 0; i < pts.length; i++) {
      const inA = isInside(pts[i]);
      if (!inA) { if (i && isInside(pts[i - 1])) cur.push(cross(pts[i - 1], pts[i])); cur.push(pts[i]); }
      else if (i && !isInside(pts[i - 1])) { cur.push(cross(pts[i - 1], pts[i])); runs.push(cur); cur = []; }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((r) => r.length >= 2);
  };
  const barInside = door ? (q) => { const th = Math.atan2(q[1], q[0]); return door.inside(door.sOf(th, q[2]), q[2]); } : () => false;
  const ribsOverCap = (th, from) => {
    const out = [];
    const ns = Math.max(8, Math.ceil(Hc * collar.sC / CAP_STEP_MM));
    for (let i = from ? 1 : 0; i <= ns; i++) out.push(capPt(th, collar.sC * i / ns));
    // bury the end in the collar: on past the collar's radius toward the axis
    const last = out[out.length - 1]; const rr = Math.hypot(last[0], last[1]); const k = rr > 1e-9 ? Math.max(0, rr - collar.rc * 0.55) / rr : 0;
    out.push([last[0] * k, last[1] * k, last[2]]);
    return out;
  };
  const barsEnd = flat ? 'ring' : p.barsConverge ? 'apex' : 'ring';
  for (let j = 0; j < barCount; j++) {
    const th = TAU * j / barCount;
    const pts = stations.map((z) => surf(th, z));
    // the bar stands in the base ring and the top ring (the tube is centred on the ring's centreline, so it is buried)
    if (barsEnd === 'apex') { const cap = ribsOverCap(th, true); pts.push(...cap); }
    // the slope census stops before the last point: that segment is the bury into the collar, inside it
    const slopeTo = barsEnd === 'apex' ? pts.length - 1 : pts.length;
    for (let i = 1; i < slopeTo; i++) noteSlope(sub(pts[i], pts[i - 1]), barsEnd === 'apex' && pts[i][2] > H ? 'the bars over the top cap' : 'the bars');
    for (const run of cutRuns(pts, barInside)) { tube(mesh, run, rBar, { kind: 'bar', name: `bar ${j}` }); wires.push({ kind: 'bar', pts: run, r: rBar }); }
  }
  // bars that end at the top ring: the cap takes half their number as ribs (every other azimuth)
  let ribCount = 0;
  if (!flat && barsEnd === 'ring') {
    ribCount = Math.max(N || 3, Math.round(barCount / 2));
    if (N && ribCount % N) ribCount = Math.round(ribCount / N) * N || N;
    for (let j = 0; j < ribCount; j++) { const th = TAU * j / ribCount; const pts = ribsOverCap(th, false); for (let i = 1; i < pts.length - 1; i++) noteSlope(sub(pts[i], pts[i - 1]), 'the dome ribs'); tube(mesh, pts, rBar, { kind: 'rib', name: `rib ${j}` }); wires.push({ kind: 'rib', pts, r: rBar }); }
    told.push(`bars end at the top ring; ${ribCount} ribs carry the ${p.topShape} to the apex`);
  }

  /* the rings: base and top (frame weight), the interior count placed even or clustered,
     and (ruling 5) one at every profile SHOULDER — a knot where the chords either side turn
     by SHOULDER_DEG or more, measured in mm, so a step or a tier always carries a ring */
  const ringZ = [];
  for (let i = 1; i <= p.ringCount; i++) {
    const t = i / (p.ringCount + 1);
    const u = 2 * t - 1;
    const tc = p.ringPlace === 'clustered' ? 0.5 + 0.5 * Math.sign(u) * Math.pow(Math.abs(u), 0.45) : t;
    ringZ.push(H * tc);
  }
  const shoulderZ = profileShoulders(p.profile.points, Rb, H);
  const nearRing = Math.max(3 * rRing, 2 * rFrame + rRing);
  for (const z of shoulderZ) {
    if ([0, H, ...ringZ].some((q) => Math.abs(q - z) < nearRing)) continue;   // a ring is already there
    ringZ.push(z);
  }
  ringZ.sort((a, b) => a - b);
  if (shoulderZ.length) told.push(`${shoulderZ.length} profile shoulder${shoulderZ.length > 1 ? 's' : ''} (${shoulderZ.map((z) => z.toFixed(0) + ' mm').join(', ')}) carr${shoulderZ.length > 1 ? 'y' : 'ies'} a ring`);
  const ringLoop = (z, rr, kind, name) => {
    // a polygon ring samples each face too (16 a face, the corners exact), so a door on a face can cut it
    const M = N ? N * 16 : RING_SECTORS;
    const pts = [];
    for (let j = 0; j < M; j++) pts.push(surf(TAU * j / M, z));
    if (door && z > door.z0 && z < door.top(0)) {
      // the ring crosses the opening: find the arc |s| < s* inside it and drop it, ending in the jambs / top edge
      let lo = 0, hi = door.a; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (door.inside(m, z)) lo = m; else hi = m; }
      const sStar = hi;
      const insideRing = (q) => { const th = Math.atan2(q[1], q[0]); return Math.abs(door.sOf(th, z)) < sStar; };
      // rotate the loop so the cut is not at the seam, then cut
      const seq = []; const start = (() => { let best = 0, bd = -1; pts.forEach((q, i) => { const d = Math.abs(wrapPi(Math.atan2(q[1], q[0]) - thD)); if (d > bd) { bd = d; best = i; } }); return best; })();
      for (let i = 0; i <= M; i++) seq.push(pts[(start + i) % M]);
      const runs = cutRuns(seq, insideRing);
      // the loop's seam is opposite the door, so the first and last runs meet there: one run, not two ends
      if (runs.length >= 2 && runs[runs.length - 1][runs[runs.length - 1].length - 1] === runs[0][0]) { const last = runs.pop(); runs[0] = [...last.slice(0, -1), ...runs[0]]; }
      for (const run of runs) { tube(mesh, run, rr, { kind, name }); wires.push({ kind, pts: run, r: rr }); }
      return;
    }
    tube(mesh, pts, rr, { closed: true, kind, name }); wires.push({ kind, pts, r: rr, closed: true });
  };
  ringLoop(0, rFrame, 'frame', 'base ring');
  ringLoop(H, rFrame, 'frame', 'top ring');
  ringZ.forEach((z, i) => ringLoop(z, rRing, 'ring', `ring ${i + 1}`));

  /* the collar at the apex, or the flat top's spokes and hub */
  const rH = wireR(Math.max(p.barMm, 1.2), 'hanger wire');
  let apexZ = H;
  if (collar) {
    // a turned BOSS (ruling 1): a band where the bars enter, a bead standing proud of it above
    // them, then a crown easing to a flat seat at the apex the hanger stands on
    const rc = collar.rc, zb = collar.zBot, zc = collar.zC, zt = collar.zTop, hT = zt - zc;
    const bead = rc * 1.14, seat = Math.max(rc * 0.3, rH * 1.6);
    const prof = [[0.001, zb], [rc * 0.9, zb], [rc, zb + 0.35 * (zc - zb)], [rc, zc + 0.1 * hT], [bead, zc + 0.28 * hT], [bead, zc + 0.5 * hT], [rc * 0.92, zc + 0.68 * hT], [rc * 0.66, zc + 0.88 * hT], [seat, zt], [0.001, zt]];
    revolve(mesh, prof, { sectors: 32, kind: 'collar', name: 'apex collar', poly: 0 });
    solids.push({ kind: 'collar', profile: prof });
    apexZ = collar.zTop;
  } else {
    const hubR = Math.max(2 * rBar, barCount * collarPitch / TAU * 0.5);
    const spokes = N || 4;
    for (let j = 0; j < spokes * 2; j++) { const th = TAU * j / (spokes * 2); const pts = [surf(th, H), [hubR * 0.5 * Math.cos(th), hubR * 0.5 * Math.sin(th), H]]; tube(mesh, pts, rBar, { kind: 'spoke', name: `spoke ${j}` }); wires.push({ kind: 'spoke', pts, r: rBar }); }
    const prof = [[0.001, H - rBar], [hubR, H - rBar], [hubR, H + rBar], [0.001, H + rBar]];
    revolve(mesh, prof, { sectors: 32, kind: 'collar', name: 'top hub' });
    solids.push({ kind: 'collar', profile: prof });
    apexZ = H + rBar;
    told.push(`flat top: ${spokes * 2} spokes and a hub carry the hanger`);
  }

  /* the base */
  const r0 = rho(0);
  let scallops = 0;
  if (p.baseStyle === 'tray') {
    const tT = Math.max(floor, 1.6), lip = 3.5, lipT = Math.max(floor, 1.2);
    const prof = [[0.001, -tT], [r0 + lip, -tT], [r0 + lip, 2.5], [r0 + lip - lipT, 2.5], [r0 + lip - lipT, 0], [0.001, 0]];
    revolve(mesh, prof, { sectors: N ? N * 8 : 96, kind: 'base', name: 'tray', poly: N });
    solids.push({ kind: 'tray', profile: prof, poly: N });
  } else if (p.baseStyle === 'skirt') {
    // ruling 9: fewer, wider scallops, their count a control; built as the divisor of the bar
    // count nearest the asked one so every cusp sits ON a bar (told when it moved)
    const D = p.skirtMm, t = Math.max(floor, p.barMm);
    const divisors = []; for (let d = 1; d <= barCount; d++) if (barCount % d === 0) divisors.push(d);
    const asked = Math.round(p.scallopCount);
    scallops = divisors.reduce((best, d) => Math.abs(d - asked) < Math.abs(best - asked) || (Math.abs(d - asked) === Math.abs(best - asked) && d > best) ? d : best, divisors[0]);
    if (scallops !== asked) told.push(`${asked} scallops built as ${scallops}, the divisor of ${barCount} bars nearest it, so every cusp sits on a bar`);
    const M = scallops * 24;
    const depth = (th) => { const u = ((th * scallops / TAU) % 1 + 1) % 1; return D * (0.4 + 0.6 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)))); };
    beginPart(mesh, 'base', 'scalloped skirt');
    const col = [];
    for (let j = 0; j < M; j++) {
      const th = TAU * j / M, rb = polyRadius(r0, th, N), zb = -depth(th);
      const c = Math.cos(th), s = Math.sin(th);
      col.push([mesh.vertex((rb + t / 2) * c, (rb + t / 2) * s, 0), mesh.vertex((rb + t / 2) * c, (rb + t / 2) * s, zb), mesh.vertex((rb - t / 2) * c, (rb - t / 2) * s, zb), mesh.vertex((rb - t / 2) * c, (rb - t / 2) * s, 0)]);
    }
    for (let j = 0; j < M; j++) { const a = col[j], b = col[(j + 1) % M]; for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; mesh.quad(a[k], a[k2], b[k2], b[k]); } }
    endPart(mesh);
    const edge = []; for (let j = 0; j <= M; j++) { const th = TAU * j / M, rb = polyRadius(r0, th, N); edge.push([rb * Math.cos(th), rb * Math.sin(th), -depth(th)]); }
    wires.push({ kind: 'skirt', pts: edge, r: t / 2, closed: true, drawOnly: true });
  } else if (p.baseStyle === 'feet') {
    const fh = 7, fr = Math.max(2.4, 1.3 * rFrame);
    const prof = [[0.001, -fh], [fr * 0.55, -fh], [fr, -fh + 1.8], [fr * 0.9, -fh + 4.2], [fr * 0.6, -1.2], [fr * 0.7, rFrame * 0.5], [0.001, rFrame * 0.5]];
    for (let j = 0; j < p.footCount; j++) {
      const th = TAU * (j + 0.5) / p.footCount, rb = polyRadius(r0, th, N) - fr * 0.1;
      revolve(mesh, prof, { sectors: 20, cx: rb * Math.cos(th), cy: rb * Math.sin(th), kind: 'base', name: `foot ${j}` });
      solids.push({ kind: 'foot', profile: prof, cx: rb * Math.cos(th), cy: rb * Math.sin(th) });
    }
  }

  /* the hanger: it stands on the collar's seat (or the flat top's hub) — ruling 1 */
  const hz = apexZ;
  const hs = p.hangerMm;
  let topZ = hz;
  const ringAt = (zc) => { const pts = []; const M = 40; for (let j = 0; j < M; j++) { const a = TAU * j / M; pts.push([hs * Math.cos(a), 0, zc + hs * Math.sin(a)]); } return pts; };
  if (p.hanger === 'ring') {
    const pts = ringAt(hz + hs - rH * 0.6); tube(mesh, pts, rH, { closed: true, kind: 'hanger', name: 'hanger ring' }); wires.push({ kind: 'hanger', pts, r: rH, closed: true }); topZ = hz + 2 * hs;
    for (let i = 1; i < pts.length; i++) noteSlope(sub(pts[i], pts[i - 1]), 'the hanger ring');
  } else if (p.hanger === 'hook') {
    const pts = [[0, 0, hz - rH], [0, 0, hz + hs * 0.6]];
    const M = 28; for (let j = 0; j <= M; j++) { const a = -Math.PI / 2 + Math.PI * j / M; pts.push([hs * 0.75 * (Math.cos(a) - 0) - 0 + 0 * j, 0, hz + hs * 0.6 + hs * 0.75 * (Math.sin(a) + 1)]); }
    // the arc above runs from the stem's top over to the open end, which turns back down
    const o = pts.length - 1; pts.push([pts[o][0], 0, pts[o][2] - hs * 0.5]);
    tube(mesh, pts, rH, { kind: 'hanger', name: 'hook' }); wires.push({ kind: 'hanger', pts, r: rH }); topZ = hz + hs * 0.6 + hs * 1.5 + rH;
    for (let i = 1; i < pts.length; i++) noteSlope(sub(pts[i], pts[i - 1]), 'the hook');
  } else if (p.hanger === 'finial') {
    const L = hs * 1.9, w = Math.max(1.6, hs * 0.42);
    const prof = [[0.001, hz - 1], [w * 0.55, hz - 1], [w * 0.4, hz + L * 0.12], [w * 0.95, hz + L * 0.3], [w, hz + L * 0.42], [w * 0.75, hz + L * 0.58], [w * 0.3, hz + L * 0.68], [w * 0.5, hz + L * 0.86], [w * 0.3, hz + L], [0.001, hz + L]];
    revolve(mesh, prof, { sectors: 32, kind: 'hanger', name: 'finial' }); solids.push({ kind: 'finial', profile: prof });
    const pts = ringAt(hz + L + hs - rH * 0.8); tube(mesh, pts, rH, { closed: true, kind: 'hanger', name: 'hanger ring' }); wires.push({ kind: 'hanger', pts, r: rH, closed: true }); topZ = hz + L + 2 * hs;
    for (let i = 1; i < pts.length; i++) noteSlope(sub(pts[i], pts[i - 1]), 'the hanger ring');
  }

  const lowZ = p.baseStyle === 'tray' ? -Math.max(floor, 1.6) : p.baseStyle === 'skirt' ? -p.skirtMm : p.baseStyle === 'feet' ? -7 : -rFrame;
  const triangles = mesh.idx.length / 3;
  const info = {
    barCount, ribCount, barsEnd, ringZ, shoulderZ, scallops, rTop, Hc, collar, door: door ? { W: door.W, Dh: door.Dh, z0: door.z0, shape: door.shape } : null,
    heightMm: topZ - lowZ, widthMm: 2 * Math.max(...stations.map((z) => rho(z))) + (p.baseStyle === 'tray' ? 7 : 0),
    triangles, parts: mesh.parts.length, floor, process: 'SLS PA12 (assumed)',
    overhang: { deg: +overhang.deg.toFixed(1), where: overhang.where, fdmSupport: overhang.deg < FDM_OVERHANG_DEG },
  };
  return { mesh: { positions: mesh.pos, indices: mesh.idx, parts: mesh.parts }, wires, solids, told, info, params: p };
}

/* ---- STL: frame-relief's writer over this model's own buffers ---- */
export function exportStl(model) { return writeStl(model.mesh, 'Parametric Cage — eva-maskalenko.com/cage — mm'); }

/* ---- SVG: the FRONT ELEVATION as a line drawing — the same centrelines the
   STL swept, projected orthographically along +y (x right, z up), every wire
   drawn at its own diameter, revolved parts as their profile's silhouette.
   Hidden lines are drawn: a cage IS its wires and a drawing of one shows the
   back bars through the front. ---- */
export function exportSvg(model, { margin = 4 } = {}) {
  const fx = (v) => (+v.toFixed(3)).toString();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const see = (x, z) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); };
  for (const w of model.wires) for (const q of w.pts) { see(q[0] - w.r, q[2] - w.r); see(q[0] + w.r, q[2] + w.r); }
  for (const s of model.solids) for (const [r, z] of s.profile) { const cx = s.cx || 0; see(cx - r, z); see(cx + r, z); }
  const W = x1 - x0 + 2 * margin, Hh = z1 - z0 + 2 * margin;
  const X = (x) => fx(x - x0 + margin), Z = (z) => fx(z1 - z + margin);
  const paths = [];
  const order = ['skirt', 'frame', 'ring', 'bar', 'rib', 'spoke', 'door', 'hanger'];
  const wires = [...model.wires].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const w of wires) {
    const d = w.pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Z(q[2])}`).join(' ') + (w.closed ? ' Z' : '');
    paths.push(`<path class="${w.kind}" d="${d}" stroke-width="${fx(2 * w.r)}"/>`);
  }
  for (const s of model.solids) {
    const cx = s.cx || 0;
    const right = s.profile.map(([r, z], i) => `${i ? 'L' : 'M'}${X(cx + r)} ${Z(z)}`).join(' ');
    const left = [...s.profile].reverse().map(([r, z]) => `L${X(cx - r)} ${Z(z)}`).join(' ');
    paths.push(`<path class="${s.kind} solid" d="${right} ${left} Z" fill="#0A0A0C" stroke-width="0.2"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fx(W)} ${fx(Hh)}" width="${fx(W)}mm" height="${fx(Hh)}mm">
<title>Parametric Cage — front elevation, mm</title>
<rect width="100%" height="100%" fill="#EDEDE8"/>
<g fill="none" stroke="#0A0A0C" stroke-linecap="round" stroke-linejoin="round">
${paths.join('\n')}
</g>
</svg>
`;
}
