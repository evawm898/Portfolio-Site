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
import { Mesh, exportStl as writeStl, bandSolid, sphereSolid, PATTERN_LAT, PATTERN_LON } from './frame-relief.js';
/* PHASE 2 — the ring bands consume /frame's band pattern UNCHANGED (docs/frame-charter.md §15):
   the bead is frame-relief's sphereSolid on its own lattice, the leaf is frame-filigree's
   buildLeaf swept by frame-relief's bandSolid in its own leaf section, and the rules — beads
   fused at ≤ BEAD_FUSE × r, a laurel run's pitch inside [LEAF_RUN_PITCH_MIN, MAX] × the leaf,
   one lobe, sixteen stations — are frame-pattern's own constants, imported, never restated. */
import { BEAD_FUSE, LEAF_RUN_PITCH_MIN, LEAF_RUN_PITCH_MAX, LEAF_RUN_LOBES, PATTERN_LEAF_STATIONS } from './frame-pattern.js';
import { buildLeaf, leafProfile, LEAF_ASPECT, LEAF_RELIEF } from './frame-filigree.js';

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
export const SHOULDER_DEG = 25;
/* A band reads as a band only if its element stands proud of the ring it rides: a bead's
   diameter, and a leaf's width, are held at or over this multiple of the ring's own diameter
   (a decision made without a ruling — told when it binds). */
export const BAND_OVER_RING = 1.25;          // ruling 5: a profile knot whose chords turn by at least this (in mm) is a shoulder and auto-places a ring

/* ---- the profile curve (bloom-curve.js's own kind) ---- */
export const PROFILE_SPEC = Object.freeze({ modes: ['single'], x: [0, 1], y: [0.08, 1], points: [2, 10], lock: { first: 'x', last: 'x' }, monotoneX: true, owner: 'heightMm' });
const P = (pts) => ({ mode: 'single', points: pts.map((p) => [p[0], p[1]]) });

/* ---- registry ---- */
export const SECTIONS = [
  { id: 'body', label: 'Body', open: true },
  { id: 'top', label: 'Top', open: true },
  { id: 'bars', label: 'Bars', open: true },
  { id: 'rings', label: 'Rings', open: true },
  { id: 'bands', label: 'Ring bands', open: true },
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
const banded = (p) => p.bandStyle && p.bandStyle !== 'none';
/* which rings carry the band (the bands and the door both read it: the door never crosses a banded ring) */
const bandWants = (p, rg) => p.bandRings === 'all' || (p.bandRings === 'inner' && rg.kind === 'ring') || (p.bandRings === 'ends' && rg.kind === 'frame') || (p.bandRings === 'top' && rg.name === 'top ring');

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
  C('bandStyle', 'bands', 'Band', [['none', 'plain rings'], ['beading', 'beading'], ['leaf', 'leaf-tip run']], 'none'),
  C('bandRings', 'bands', 'On', [['all', 'every ring'], ['inner', 'the rings between'], ['ends', 'base and top rings'], ['top', 'top ring only']], 'all', banded),
  R('beadMm', 'bands', 'Bead diameter', 1.5, 6, 0.1, 3.0, 'mm', (p) => p.bandStyle === 'beading'),
  R('leafMm', 'bands', 'Leaf length', 3, 14, 0.5, 8, 'mm', (p) => p.bandStyle === 'leaf'),
  R('bandSpacing', 'bands', 'Spacing (× the bead or leaf; snapped so one sits on every bar)', 0.5, 0.9, 0.01, 0.7, '', banded),
  C('doorShape', 'door', 'Door', [['none', 'none'], ['rect', 'rectangle'], ['arch', 'round arch'], ['gothic', 'gothic point'], ['ogee', 'ogee']], 'arch'),
  R('doorWidth', 'door', 'Door width (snapped to whole bar gaps)', 10, 90, 1, 26, 'mm', hasDoor),
  R('doorHeight', 'door', 'Door height', 10, 180, 1, 46, 'mm', hasDoor),
  R('doorY', 'door', 'Door position (the sill sits on the nearest ring)', 0, 1, 0.01, 0, '', hasDoor),
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
  cylinder: { profile: P([[0, 1], [1, 1]]), sides: '0', topShape: 'dome', topHeight: 0.6, barCount: 20, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'arch', doorWidth: 28, doorHeight: 48, doorY: 0, baseStyle: 'ring', hanger: 'ring', widthMm: 90, heightMm: 110 },
  bell: { profile: P([[0, 1], [0.3, 0.96], [0.65, 0.8], [1, 0.64]]), sides: '0', topShape: 'dome', topHeight: 0.6, barCount: 22, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'arch', doorWidth: 26, doorHeight: 46, doorY: 0, baseStyle: 'tray', hanger: 'finial', widthMm: 90, heightMm: 140 },
  cone: { profile: P([[0, 1], [1, 0.48]]), sides: '4', topShape: 'spire', topHeight: 1.1, barCount: 16, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'gothic', doorWidth: 29, doorHeight: 50, doorY: 0, baseStyle: 'tray', hanger: 'ring', widthMm: 100, heightMm: 120 },
  onion: { profile: P([[0, 0.72], [0.3, 0.96], [0.55, 1], [1, 0.74]]), sides: '0', topShape: 'onion', topHeight: 1.15, barCount: 24, barMm: 1.1, barsConverge: true, ringCount: 3, ringPlace: 'even', ringMm: 1.8, doorShape: 'ogee', doorWidth: 27, doorHeight: 47, doorY: 0, baseStyle: 'feet', hanger: 'finial', widthMm: 96, heightMm: 100 },
  tiered: { profile: P([[0, 1], [0.58, 1], [0.66, 0.7], [1, 0.7]]), sides: '0', topShape: 'dome', topHeight: 0.65, barCount: 24, barMm: 1.1, barsConverge: true, ringCount: 4, ringPlace: 'clustered', ringMm: 1.8, doorShape: 'rect', doorWidth: 26, doorHeight: 40, doorY: 0.15, baseStyle: 'skirt', scallopCount: 8, hanger: 'finial', widthMm: 100, heightMm: 130 },
  hexLantern: { profile: P([[0, 1], [1, 1]]), sides: '6', topShape: 'spire', topHeight: 0.85, barCount: 24, barMm: 1.1, barsConverge: true, ringCount: 2, ringPlace: 'even', ringMm: 1.8, doorShape: 'rect', doorWidth: 20, doorHeight: 52, doorY: 0, baseStyle: 'feet', hanger: 'hook', widthMm: 86, heightMm: 120 },
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
  // phase 2: drawn LAST, so every field above is the sequence it always was
  p.bandStyle = pick(['none', 'none', 'beading', 'leaf']); p.bandRings = pick(['all', 'inner', 'ends', 'top']);
  p.beadMm = within(2, 4.5, 0.1); p.leafMm = within(5, 11, 0.5); p.bandSpacing = within(0.55, 0.85, 0.01);
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
  if (shape === 'gothic') { const S3 = Math.sqrt(3); const rise = Math.min(0.6 * h, S3 * a); const zs = h - rise; const R2 = (2 * a) * (2 * a); return zs + (rise / (S3 * a)) * Math.sqrt(Math.max(0, R2 - Math.pow(u * a + a, 2))); }   // √3·a is the equilateral arch's own rise, so the point lands at h
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

  /* the rings' heights (laid out here, before the door, because the door SITS ON them): base and
     top (frame weight), the interior count placed even or clustered, and (ruling 5) one at every
     profile SHOULDER — a knot where the chords either side turn by SHOULDER_DEG or more, measured
     in mm, so a step or a tier always carries a ring */
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
  // every ring the build lays, bottom to top, marked with what the door must not cross
  const ringPlan = [{ z: 0, r: rFrame, kind: 'frame', name: 'base ring' }, ...ringZ.map((z, i) => ({ z, r: rRing, kind: 'ring', name: `ring ${i + 1}` })), { z: H, r: rFrame, kind: 'frame', name: 'top ring' }];
  for (const sz of shoulderZ) { const R = ringPlan.reduce((b, q) => (Math.abs(q.z - sz) < Math.abs(b.z - sz) ? q : b)); if (Math.abs(R.z - sz) < nearRing) R.shoulder = true; }
  for (const rg of ringPlan) rg.banded = banded(p) && bandWants(p, rg);

  /* THE DOOR (docs/cage-phase-1.md §9). It is cut where the LATTICE is, not wherever a width in mm
     happens to fall:
       - its two jambs ARE bars: the door spans k whole bar gaps (k snapped from the asked width,
         measured at the sill), and the frame's jambs replace the jamb bars — a jamb never cuts a
         bar part-way up and no sliver of opening stands beside one;
       - it is centred on the front (−y, ruling 4): on a round cage on a bar (k even) or on a gap
         (k odd); on a polygon on a FACE centre, never a corner, with k at most the bars of the face
         (k = the face's own count makes the corner bars its jambs);
       - the lattice is laid in its own frame and the door placed in it at `thD`; the whole cage
         (everything but the hanger) turns once at the end by `turn` so that centre is the front;
       - its sill SITS ON A RING — the one nearest the asked position that keeps the asked height,
         else the one that holds the tallest door — and its head stays one printable gap
         (`gapOf`: the two wires and the floor) under the first shoulder ring, banded ring or the
         top ring above it, and clear of every other ring by the same gap; shortened, and told;
       - its outline lives in (u, z), u ∈ [−1, 1] the lateral fraction of the door at that height
         (of the arc on a round cage, of the flat face on a polygon), so the door follows the bars
         up a tapering profile and every frame point is a point of the cage's own surface. */
  const dPhi = TAU / barCount;
  const mod = (a, n) => ((a % n) + n) % n;
  let door = null, turn = 0;
  if (p.doorShape !== 'none') {
    const gapOf = (rg) => rg.r + rDoor + floor;
    const Dh0 = Math.min(p.doorHeight, H * 0.92);
    if (Dh0 < p.doorHeight) told.push(`door height ${p.doorHeight} mm held to ${Dh0.toFixed(0)} mm inside the body`);
    const zAsk = p.doorY * (H - Dh0);
    const DOOR_MIN = Math.max(10, 4 * rDoor + floor);
    // every ring a sill can sit on, and the tallest door it holds
    const sills = [];
    for (let i = 0; i < ringPlan.length - 1; i++) {
      const S = ringPlan[i], above = ringPlan.slice(i + 1);
      if (above.some((R) => R.z - S.z < gapOf(R))) continue;            // a ring grazing it: not a sill
      const stop = above.find((R) => R.shoulder || R.banded || R === ringPlan[ringPlan.length - 1]);
      let apex = S.z + Dh0, why = null;
      if (apex > stop.z - gapOf(stop)) { apex = stop.z - gapOf(stop); why = stop; }
      for (let it = 0; it <= ringPlan.length; it++) {
        const R = above.find((q) => Math.abs(q.z - apex) < gapOf(q) - 1e-9);
        if (!R) break;
        apex = R.z - gapOf(R); why = R;
      }
      sills.push({ S, Dh: apex - S.z, why });
    }
    const fits = sills.filter((c) => c.Dh >= DOOR_MIN - 1e-9);
    if (!fits.length) told.push(`no ring has room above it for a ${DOOR_MIN.toFixed(0)} mm door clear of the rings — no door built`);
    else {
      const full = fits.filter((c) => c.Dh >= Dh0 - 1e-9);
      const tallest = Math.max(...fits.map((c) => c.Dh));
      const pool = full.length ? full : fits.filter((c) => c.Dh >= tallest - 1e-9);
      const ch = pool.reduce((b, c) => (Math.abs(c.S.z - zAsk) < Math.abs(b.S.z - zAsk) - 1e-9 ? c : b));
      const z0 = ch.S.z, Dh = ch.Dh, apex = z0 + Dh;
      if (Math.abs(z0 - zAsk) > 0.5) told.push(`door sill on the ${ch.S.name} at ${z0.toFixed(0)} mm (asked ${zAsk.toFixed(0)} mm) — a sill sits on a ring`);
      if (ch.why) told.push(`door height ${Dh0.toFixed(0)} mm shortened to ${Dh.toFixed(0)} mm, one printable gap under the ${ch.why.shoulder ? 'shoulder ' : ch.why.banded ? 'banded ' : ''}${ch.why.name} at ${ch.why.z.toFixed(0)} mm`);
      // the width: k whole bar gaps, nearest the asked width at the sill
      const ap = (z) => rho(z) * (N ? Math.cos(Math.PI / N) : 1);
      const widthOf = (k) => (N ? 2 * ap(z0) * Math.tan(k * dPhi / 2) : k * dPhi * rho(z0));
      const m = N ? barCount / N : 0, ks = [];
      if (N) for (let k = m % 2 ? 1 : 2; k <= m; k += 2) ks.push(k);
      else for (let k = 1; k <= Math.max(1, Math.floor(0.42 * barCount)); k++) ks.push(k);
      const k = ks.reduce((b, c) => (Math.abs(widthOf(c) - p.doorWidth) < Math.abs(widthOf(b) - p.doorWidth) - 1e-9 ? c : b), ks[0]);
      const W = widthOf(k), half = k / 2;
      if (Math.abs(W - p.doorWidth) > 0.5) told.push(`door width ${p.doorWidth} mm snapped to ${W.toFixed(1)} mm — ${k} bar gap${k > 1 ? 's' : ''}, both jambs on bars${N ? `, centred on a face${k === m ? ' (its corner bars are the jambs)' : ''}` : ''}`);
      // the centre, in bar-index units: a face centre (polygon), else a bar (k even) or a gap (k odd), nearest −y
      const cIdx = N ? mod((Math.round(0.75 * N - 0.5) + 0.5) * m, barCount) : mod(k % 2 ? Math.round(0.75 * barCount - 0.5) + 0.5 : Math.round(0.75 * barCount), barCount);
      const thD = TAU * cIdx / barCount;
      turn = wrapPi(-Math.PI / 2 - thD); if (Math.abs(turn) < 1e-12) turn = 0;
      if (N && turn) told.push(`the ${N}-gon turns ${(turn * 180 / Math.PI).toFixed(1)}° so the door is centred on a face, at the front`);
      const tH = Math.tan(half * dPhi);
      const uOfOff = (o) => (N ? Math.tan(o * dPhi) / tH : o / half);                     // o: an offset from the centre, in bar gaps
      const dOfU = (u) => (N ? Math.atan(u * tH) : u * half * dPhi);                       // u → the azimuth offset
      const uOfTheta = (th) => { const d = wrapPi(th - thD); if (Math.abs(d) >= Math.PI / 2) return d > 0 ? Infinity : -Infinity; return uOfOff(d / dPhi); };
      // the outline's half width in mm at the springing (fixed point: the rise depends on it)
      const aAt = (z) => (N ? ap(z) * tH : half * dPhi * rho(z));
      let aRef = aAt(z0); for (let it = 0; it < 4; it++) aRef = aAt(z0 + doorTop(p.doorShape, aRef, aRef, Dh));
      const top = (u) => z0 + doorTop(p.doorShape, u * aRef, aRef, Dh);
      const inside = (u, z) => Math.abs(u) < 1 && z > z0 && z < top(u);
      const jR = mod(cIdx + half, barCount), jL = mod(cIdx - half, barCount);
      const thR = TAU * jR / barCount, thL = TAU * jL / barCount;
      // the door's bars: offset from the centre (exact in bar-index units), and u
      const barU = new Map();
      for (let j = 0; j < barCount; j++) { let o = mod(j - cIdx, barCount); if (o >= barCount / 2) o -= barCount; if (Math.abs(o) <= half) barU.set(j, Math.abs(o) === half ? Math.sign(o) : uOfOff(o)); }
      // the rings the door crosses, and where each is cut: at the jambs below the springing, on the head above it
      const cross = new Map();
      const zSpring = top(1);
      for (const rg of ringPlan) {
        if (!(rg.z > z0 + 1e-9 && rg.z < apex - 1e-9)) continue;
        if (rg.z <= zSpring) { cross.set(rg, { u: 1, thA: thR, thB: thL, d: half * dPhi }); continue; }
        let lo = 0, hi = 1; for (let it = 0; it < 60; it++) { const mm = (lo + hi) / 2; if (top(mm) > rg.z) lo = mm; else hi = mm; }
        const u = (lo + hi) / 2, d = dOfU(u);
        cross.set(rg, { u, thA: thD + d, thB: thD - d, d });
      }
      door = { W, Dh, z0, apex, k, half, m, thD, cIdx, turn, aRef, top, inside, uOfTheta, barU, cross, shape: p.doorShape, centre: N ? 'face' : k % 2 ? 'gap' : 'bar' };
      // THE FRAME: right jamb up, the head right → left, the left jamb down, the sill left → right. Every
      // vertex is surf() of an azimuth and a height; at a bar, at a jamb and at a ring's cut the azimuth is
      // THAT bar's / ring end's own, so a cut end and a frame vertex are the same point to the bit
      const nJ = Math.max(4, Math.ceil((zSpring - z0) / 2)), nTop = 48;
      const jambZ = []; for (let i = 0; i < nJ; i++) jambZ.push(z0 + (zSpring - z0) * i / nJ);
      for (const [rg, c] of cross) if (c.u === 1) jambZ.push(rg.z);
      jambZ.sort((a, b) => a - b);
      const jz = jambZ.filter((z, i) => i === 0 || z - jambZ[i - 1] > 1e-6);
      const head = [];
      for (let i = 0; i <= nTop; i++) { const u = 1 - 2 * i / nTop; head.push({ u, th: thD + dOfU(u), z: top(u) }); }
      for (const [j, u] of barU) head.push({ u, th: TAU * j / barCount, z: top(u), bar: true });
      for (const [rg, c] of cross) if (c.u !== 1) { head.push({ u: c.u, th: c.thA, z: rg.z, bar: true }); head.push({ u: -c.u, th: c.thB, z: rg.z, bar: true }); }
      head.sort((a, b) => b.u - a.u || (b.bar ? 1 : 0) - (a.bar ? 1 : 0));
      const headU = head.filter((q, i) => i === 0 || head[i - 1].u - q.u > 1e-9);
      headU[0] = { u: 1, th: thR, z: zSpring }; headU[headU.length - 1] = { u: -1, th: thL, z: top(-1) };
      // a pointed or round head rises steeply from its springing: split every head chord longer than a cap step
      // (in u, by halves) so the frame follows the outline there too, not only the uniform u samples
      for (let i = 0; i < headU.length - 1; i++) {
        const A = headU[i], B = headU[i + 1];
        if (Math.hypot(B.z - A.z, aRef * (B.u - A.u)) <= CAP_STEP_MM || A.u - B.u < 1e-6) continue;
        const u = (A.u + B.u) / 2; headU.splice(i + 1, 0, { u, th: thD + dOfU(u), z: top(u) }); i--;
      }
      const fpts = [], parts = [];
      const fsurf = (th, z) => surf(th, z);            // the frame's points: the cage's own surface
      const add = (q, part) => { if (fpts.length && len(sub(q, fpts[fpts.length - 1])) <= 1e-9) return; fpts.push(q); parts.push(part); };
      jz.forEach((z, i) => add(fsurf(thR, z), i === 0 ? 'corner' : 'jamb'));
      headU.forEach((q, i) => add(fsurf(q.th, q.z), i === 0 || i === headU.length - 1 ? 'corner' : 'head'));
      for (let i = jz.length - 1; i >= 0; i--) add(fsurf(thL, jz[i]), i === 0 ? 'corner' : 'jamb');
      // the sill runs left → right under the same lateral stations as the head, the bars' own azimuths at the bars
      const sillPts = [];
      for (let i = 1; i < nTop; i++) { const u = -1 + 2 * i / nTop; sillPts.push({ u, th: thD + dOfU(u) }); }
      for (const [j, u] of barU) if (Math.abs(u) < 1) sillPts.push({ u, th: TAU * j / barCount, bar: true });
      sillPts.sort((a, b) => a.u - b.u || (b.bar ? 1 : 0) - (a.bar ? 1 : 0));
      sillPts.filter((q, i) => i === 0 || q.u - sillPts[i - 1].u > 1e-9).forEach((q) => add(fsurf(q.th, z0), 'sill'));
      const fp = fpts.filter((q, i) => i === fpts.length - 1 ? len(sub(q, fpts[0])) > 1e-9 : true);
      tube(mesh, fp, rDoor, { closed: true, kind: 'door', name: 'door frame' });
      wires.push({ kind: 'door', pts: fp, r: rDoor, closed: true, parts: parts.slice(0, fp.length) });
    }
  }

  /* the bars */
  const dz = (z) => { const e = Math.min(0.5, H * 1e-3); return (rho(z + e) - rho(z - e)) / (2 * e); };
  const overhang = { deg: 90, where: '' };
  const noteSlope = (v, where) => { const deg = Math.atan2(Math.abs(v[2]), Math.hypot(v[0], v[1])) * 180 / Math.PI; if (deg < overhang.deg) { overhang.deg = deg; overhang.where = where; } };
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
    const cap = barsEnd === 'apex' ? ribsOverCap(th, true) : [];
    pts.push(...cap);
    // the slope census stops before the last point: that segment is the bury into the collar, inside it
    const slopeTo = barsEnd === 'apex' ? pts.length - 1 : pts.length;
    for (let i = 1; i < slopeTo; i++) noteSlope(sub(pts[i], pts[i - 1]), barsEnd === 'apex' && pts[i][2] > H ? 'the bars over the top cap' : 'the bars');
    // a bar of the door (inside it, or one of its jambs) stops on the sill and starts again on the head,
    // its two cut ends ON the frame's own vertices at that azimuth; every other bar runs whole
    let runs = [pts];
    if (door && door.barU.has(j)) {
      const zt = door.top(door.barU.get(j));
      const lower = stations.filter((z) => z < door.z0 - 1e-6).map((z) => surf(th, z));
      if (door.z0 > 1e-9) lower.push(surf(th, door.z0));
      const upper = [surf(th, zt), ...stations.filter((z) => z > zt + 1e-6).map((z) => surf(th, z)), ...cap];
      runs = [lower, upper].filter((r) => r.length >= 2);
    }
    for (const run of runs) { tube(mesh, run, rBar, { kind: 'bar', name: `bar ${j}` }); wires.push({ kind: 'bar', pts: run, r: rBar }); }
  }
  // bars that end at the top ring: the cap takes half their number as ribs (every other azimuth)
  let ribCount = 0;
  if (!flat && barsEnd === 'ring') {
    ribCount = Math.max(N || 3, Math.round(barCount / 2));
    if (N && ribCount % N) ribCount = Math.round(ribCount / N) * N || N;
    for (let j = 0; j < ribCount; j++) { const th = TAU * j / ribCount; const pts = ribsOverCap(th, false); for (let i = 1; i < pts.length - 1; i++) noteSlope(sub(pts[i], pts[i - 1]), 'the dome ribs'); tube(mesh, pts, rBar, { kind: 'rib', name: `rib ${j}` }); wires.push({ kind: 'rib', pts, r: rBar }); }
    told.push(`bars end at the top ring; ${ribCount} ribs carry the ${p.topShape} to the apex`);
  }

  /* the rings, laid on the heights above; a ring the door crosses is cut at the door's own outline */
  const ringRec = [];      // every ring built: { z, r, kind, name, cut, sill } — the bands read it
  const ringLoop = (rg) => {
    const { z, r: rr, kind, name } = rg;
    const cr = door ? door.cross.get(rg) : null;
    ringRec.push({ z, r: rr, kind, name, cut: !!cr, sill: !!door && Math.abs(z - door.z0) < 1e-9 });
    // a polygon ring samples each face too (16 a face, the corners exact), so a door on a face can cut it
    const M = N ? N * 16 : RING_SECTORS;
    if (cr) {
      // the ring outside the opening: from the right cut end round the back to the left one, both ends ON the frame
      const run = [surf(cr.thA, z)];
      const samp = [];
      for (let j = 0; j < M; j++) { const th = TAU * j / M; if (Math.abs(wrapPi(th - door.thD)) > cr.d + 1e-9) samp.push([mod(th - cr.thA, TAU), th]); }
      samp.sort((a, b) => a[0] - b[0]);
      for (const [, th] of samp) run.push(surf(th, z));
      run.push(surf(cr.thB, z));
      tube(mesh, run, rr, { kind, name }); wires.push({ kind, pts: run, r: rr });
      return;
    }
    const pts = [];
    for (let j = 0; j < M; j++) pts.push(surf(TAU * j / M, z));
    tube(mesh, pts, rr, { closed: true, kind, name }); wires.push({ kind, pts, r: rr, closed: true });
  };
  ringLoop(ringPlan[0]);
  ringLoop(ringPlan[ringPlan.length - 1]);
  ringPlan.slice(1, -1).forEach((rg) => ringLoop(rg));
  const bandOut = banded(p) ? buildBands() : null;

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

  /* THE TURN: the lattice was laid in its own frame with the door at `thD`; everything built so far
     (not the hanger, which is drawn square to the front) turns about the axis once, so the door's
     centre — a face, a bar or a gap — is the front, −y. turn 0 leaves every float alone. */
  if (turn) {
    const c = Math.cos(turn), s = Math.sin(turn);
    const rot = (q) => [q[0] * c - q[1] * s, q[0] * s + q[1] * c, q[2]];
    const P = mesh.pos; for (let i = 0; i < P.length; i += 3) { const x = P[i], y = P[i + 1]; P[i] = x * c - y * s; P[i + 1] = x * s + y * c; }
    for (const w of wires) w.pts = w.pts.map(rot);
    for (const sd of solids) if (sd.cx || sd.cy) { const q = rot([sd.cx || 0, sd.cy || 0, 0]); sd.cx = q[0]; sd.cy = q[1]; }
    if (bandOut) for (const el of bandOut.elements) { if (el.c) el.c = rot(el.c); if (el.outline) el.outline = el.outline.map(rot); }
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

  /* PHASE 2 — THE RING BANDS. Each banded ring carries a running ornament: beads strung on
     it, or a laurel run of overlapping leaves lying across it. Every element is built by
     /frame's own code in a flat development (along the ring s, across it t, out of the
     surface w — the bead in 3D directly) and mapped onto the CONE SEGMENT through the ring:
     the frustum through the ring's centreline whose slope is the chord of the profile across
     the band (docs/cage-phase-1.md §5.10 — a bell's sections are not developable; the cylinder
     and the polygon's faces are exact). On a round section the map is the exact development of
     that cone (the arc at slant t is θ·r(t)); on a polygon each face is a plane and the along
     distance x from the face's centre is kept, so it is exact on every face and folds at the
     corners. THE COUNT SNAPS TO THE BARS: every bar gap holds the same n elements, the first ON
     the bar (a bead's centre on the bar crossing; a leaf's base), so the motif never runs at a
     random phase to the bars; told when the built spacing is not the asked one. A ring the door
     cuts drops every element that would reach into the opening. */
  function buildBands() {
    const style = p.bandStyle, out = { style, rings: [], elements: [], sagMax: 0 };
    const cN = N ? Math.cos(Math.PI / N) : 1, tN = N ? Math.tan(Math.PI / N) : 0;
    const ra = (z) => rho(z) * cN;                       // the apothem (the radius on a round cage)
    const want = (rg) => bandWants(p, rg);
    const snapped = [], raised = [];
    const barTh = Array.from({ length: barCount }, (_, j) => TAU * j / barCount);
    for (const rg of ringRec) {
      if (!want(rg)) continue;
      const zc = rg.z, rr = rg.r;
      // the element, floored and held proud of its ring
      let size, half, loF, hiF;
      if (style === 'beading') { size = Math.max(p.beadMm, floor, BAND_OVER_RING * 2 * rr); if (size > p.beadMm + 1e-9) raised.push(`${rg.name} ${p.beadMm.toFixed(1)} → ${size.toFixed(2)} mm`); half = size / 2; loF = 0.5; hiF = BEAD_FUSE / 2; }
      else { const Lmin = Math.max(floor, BAND_OVER_RING * 2 * rr) / LEAF_ASPECT; size = Math.max(p.leafMm, Lmin); if (size > p.leafMm + 1e-9) raised.push(`${rg.name} ${p.leafMm.toFixed(1)} → ${size.toFixed(2)} mm`); half = LEAF_ASPECT * size / 2; loF = LEAF_RUN_PITCH_MIN; hiF = LEAF_RUN_PITCH_MAX; }
      // the cone segment: the chord slope of the apothem profile across the band, through the ring
      let er = 0, ez = 1;
      for (let k = 0; k < 4; k++) { const dzz = Math.max(1e-6, half * ez); const dr = ra(zc + dzz) - ra(zc - dzz); const l = Math.hypot(dr, 2 * dzz); er = dr / l; ez = 2 * dzz / l; }
      const nr = ez, nz = -er, a0 = ra(zc);
      let sag = 0; for (let k = -8; k <= 8; k++) { const t = half * k / 8; sag = Math.max(sag, Math.abs((ra(zc + t * ez) - (a0 + t * er)) * ez)); }
      out.sagMax = Math.max(out.sagMax, sag);
      const side0 = 2 * a0 * tN, L0 = N ? N * side0 : TAU * a0;
      const map = (s, t, w) => {
        const a = a0 + t * er + w * nr, z = zc + t * ez + w * nz;
        if (!N) { const th = s / a0; return [a * Math.cos(th), a * Math.sin(th), z]; }
        const ss = ((s % L0) + L0) % L0; let k = Math.floor(ss / side0), x = ss - (k + 0.5) * side0;
        const hl = (a0 + t * er) * tN;                     // the face's half length at this slant
        if (x > hl) { k += 1; x -= 2 * hl; } else if (x < -hl) { k -= 1; x += 2 * hl; }
        const ph = (2 * k + 1) * Math.PI / N, ux = Math.cos(ph), uy = Math.sin(ph);
        return [a * ux - x * uy, a * uy + x * ux, z];
      };
      const sOfTheta = (th) => { th = ((th % TAU) + TAU) % TAU; if (!N) return th * a0; const k = Math.min(N - 1, Math.floor(th / (TAU / N))); return k * side0 + side0 / 2 + a0 * Math.tan(th - (2 * k + 1) * Math.PI / N); };
      // the snap: n elements in every bar gap, the first on the bar
      const sb = barTh.map(sOfTheta), gaps = sb.map((v, j) => (j + 1 < sb.length ? sb[j + 1] : sb[0] + L0) - v);
      const gMax = Math.max(...gaps), gMin = Math.min(...gaps), asked = p.bandSpacing * size;
      const nMin = Math.ceil(gMax / (hiF * size) - 1e-9), nMax = Math.floor(gMin / (loF * size) + 1e-9);
      let n = Math.max(1, Math.round((L0 / barCount) / asked));
      n = nMin > nMax ? Math.max(1, nMin) : Math.min(nMax, Math.max(nMin, n));
      const pMin = gMin / n / size, pMax = gMax / n / size;
      if (Math.abs(pMin - p.bandSpacing) > 0.02 || Math.abs(pMax - p.bandSpacing) > 0.02) snapped.push(`${rg.name} ${n} a bar (${(n * barCount)}), spacing ${pMin.toFixed(2)}${pMax - pMin > 0.005 ? '–' + pMax.toFixed(2) : ''}`);
      if (nMin > nMax) told.push(`${rg.name}: the bars are too uneven for one ${style === 'beading' ? 'bead' : 'leaf'} count to hold every gap inside ${loF}–${hiF} × the ${style === 'beading' ? 'bead' : 'leaf'}; built ${n} a bar`);
      const rec = { z: zc, r: rr, kind: rg.kind, name: rg.name, n, count: 0, dropped: 0, size, spacing: [pMin, pMax], sag, er, ez };
      const drop = (pts) => door && (rg.cut || rg.sill) && pts.some((q) => door.inside(door.uOfTheta(Math.atan2(q[1], q[0])), q[2]));
      const lf = style === 'leaf' ? buildLeaf({ length: size, width: LEAF_ASPECT * size, side: 1, curl: 0, lobes: LEAF_RUN_LOBES, step: size / PATTERN_LEAF_STATIONS, minStations: PATTERN_LEAF_STATIONS }) : null;
      const prof2 = lf ? leafProfile() : null, depth = lf ? Math.max(floor, LEAF_RELIEF * LEAF_ASPECT * size) : 0;
      for (let j = 0; j < sb.length; j++) for (let k = 0; k < n; k++) {
        const s0 = sb[j] + gaps[j] * k / n, pitch = gaps[j] / n;
        const scr = new Mesh();
        if (lf) {
          // the laurel stack: each base lies a crown over the previous leaf's tip (frame's own law)
          const over = Math.max(1e-9, size - pitch);
          const lift = lf.u.map((u) => rr + depth * Math.max(0, 1 - u / over));
          bandSolid(scr, { id: 'leaf', pts: lf.pts, nrm: lf.nrm, bandWidth: LEAF_ASPECT * size, widthScale: lf.w.map((x) => x / (LEAF_ASPECT * size)), baseLift: lift }, prof2, { scale: 1, plateT: 0, reliefDepth: depth });
        } else sphereSolid(scr, map(s0, 0, 0), size / 2, PATTERN_LAT, PATTERN_LON);
        const vs = []; for (let i = 0; i < scr.pos.length; i += 3) vs.push(lf ? map(s0 + scr.pos[i], scr.pos[i + 1], scr.pos[i + 2]) : [scr.pos[i], scr.pos[i + 1], scr.pos[i + 2]]);
        if (drop(vs)) { rec.dropped++; continue; }
        beginPart(mesh, style === 'beading' ? 'bead' : 'leaf', `${rg.name} ${style} ${rec.count}`);
        const base = mesh.pos.length / 3;
        for (const q of vs) mesh.vertex(q[0], q[1], q[2]);
        for (const i of scr.idx) mesh.idx.push(base + i);
        endPart(mesh);
        const el = { kind: style === 'beading' ? 'bead' : 'leaf', ring: out.rings.length, s: s0, onBar: k === 0 ? j : -1 };
        if (lf) {
          // the planform for the drawing: the blade's two margins at their crown
          const top = (u, i, sgn) => map(s0 + lf.pts[i][0], sgn * lf.w[i] / 2, lift0(i));
          const lift0 = (i) => rr + depth * (0.5 + Math.max(0, 1 - lf.u[i] / Math.max(1e-9, size - pitch)));
          el.outline = [...lf.u.map((u, i) => top(u, i, 1)), ...lf.u.map((u, i) => top(u, i, -1)).reverse()];
          el.len = size; el.width = LEAF_ASPECT * size;
        } else { el.c = map(s0, 0, 0); el.r = size / 2; }
        out.elements.push(el); rec.count++;
      }
      out.rings.push(rec);
    }
    if (snapped.length) told.push(`${style === 'beading' ? 'beading' : 'leaf-tip run'} snapped to the bars — ${snapped.join('; ')}`);
    if (raised.length) told.push(`${style === 'beading' ? 'beads' : 'leaves'} held ${BAND_OVER_RING}× proud of their ring — ${raised.join('; ')}`);
    if (out.rings.some((r) => r.dropped)) told.push(`the door takes ${out.rings.reduce((a, r) => a + r.dropped, 0)} band elements where it cuts a ring`);
    if (!out.rings.length) told.push(`no ring matches "${p.bandRings}" — no band built`);
    return out;
  }

  const lowZ = p.baseStyle === 'tray' ? -Math.max(floor, 1.6) : p.baseStyle === 'skirt' ? -p.skirtMm : p.baseStyle === 'feet' ? -7 : -rFrame;
  const triangles = mesh.idx.length / 3;
  const info = {
    barCount, ribCount, barsEnd, ringZ, shoulderZ, scallops, rTop, Hc, collar, door: door ? { W: door.W, Dh: door.Dh, z0: door.z0, apex: door.apex, shape: door.shape, k: door.k, centre: door.centre, turnDeg: door.turn * 180 / Math.PI } : null, polyPhase: N ? turn : 0, turn,
    heightMm: topZ - lowZ, widthMm: 2 * Math.max(...stations.map((z) => rho(z))) + (p.baseStyle === 'tray' ? 7 : 0),
    triangles, parts: mesh.parts.length, floor, process: 'SLS PA12 (assumed)',
    bands: bandOut ? { style: bandOut.style, elements: bandOut.elements.length, sagMax: bandOut.sagMax, rings: bandOut.rings.map(({ er, ez, ...r }) => r) } : null,
    overhang: { deg: +overhang.deg.toFixed(1), where: overhang.where, fdmSupport: overhang.deg < FDM_OVERHANG_DEG },
  };
  return { mesh: { positions: mesh.pos, indices: mesh.idx, parts: mesh.parts }, wires, solids, bands: bandOut ? bandOut.elements : [], bandRings: bandOut ? bandOut.rings : [], told, info, params: p };
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
  const bands = model.bands || [];
  for (const b of bands) if (b.kind === 'bead') { see(b.c[0] - b.r, b.c[2] - b.r); see(b.c[0] + b.r, b.c[2] + b.r); } else for (const q of b.outline) see(q[0], q[2]);
  const W = x1 - x0 + 2 * margin, Hh = z1 - z0 + 2 * margin;
  const X = (x) => fx(x - x0 + margin), Z = (z) => fx(z1 - z + margin);
  const paths = [];
  const order = ['skirt', 'frame', 'ring', 'bar', 'rib', 'spoke', 'door', 'hanger'];
  const wires = [...model.wires].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const w of wires) {
    const d = w.pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Z(q[2])}`).join(' ') + (w.closed ? ' Z' : '');
    paths.push(`<path class="${w.kind}" d="${d}" stroke-width="${fx(2 * w.r)}"/>`);
  }
  // phase 2: the band elements as outlines — a bead's silhouette circle, a leaf's projected planform
  for (const b of bands) {
    if (b.kind === 'bead') { const r = fx(b.r); paths.push(`<path class="bead" d="M${X(b.c[0] - b.r)} ${Z(b.c[2])} A${r} ${r} 0 1 0 ${X(b.c[0] + b.r)} ${Z(b.c[2])} A${r} ${r} 0 1 0 ${X(b.c[0] - b.r)} ${Z(b.c[2])} Z" stroke-width="0.25"/>`); }
    else paths.push(`<path class="leaf" d="${b.outline.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Z(q[2])}`).join(' ')} Z" stroke-width="0.25"/>`);
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
