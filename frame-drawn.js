/* frame-drawn.js — the HAND-DRAWN filigree (Nov 14): Eva's drawings bent along
   the composed flow. A prototype behind the hidden param `ornFlow: 'drawn'`;
   with it absent nothing here runs and every frame builds as on `main`, by
   branch (withOrnament). Read docs/frame-drawing-guide.md (the contract for the
   person drawing) and docs/frame-flow-study.md §12 first.

   The round-4 study (frame-forms.js) built every element's outline from a few
   measured numbers and missed the bar; its PLACEMENTS, its raster and its relief
   did not (§11). So this file keeps all three and replaces only where an
   outline comes from: a drawn SVG (frame-svg-import.js reads it).

   FOR EACH SLOT the forms round records (formsFor's `slots`: the crest and
   bottom shells, the crest / shoulder / corner C-scrolls, the flank flames, the
   stem, the foot, the fan, the sheath, the curl-under leaf), in the side's
   local frame:
   - the drawing is CHOSEN among the drawn variants of the slot's kind (a slot
     with no drawing of its kind falls back down FALLBACK and says so) — the
     variant whose size box has the proportion nearest the slot's (its spine
     length over its width), so a drawing is stretched as little as it can be;
   - a BODY (c-scroll, s-scroll, flame, foot, leaf) is BENT along the slot's
     spine. The warp is the SKELETAL (path-deform) map: a point (x, y) of the
     drawing goes to S(sx·x) + sy·y·N(sx·x), S the spine by arc length, N its
     unit normal, sx = spine length / the size box's length, sy = the slot's
     width / the size box's height. Arc length and the offset are preserved
     exactly; what distorts is a line ACROSS the spine, which keeps its length
     but the material on the INSIDE of a turn is compressed along the spine by
     (1 − κ·y) and the outside stretched by (1 + κ·y) — so a shape drawn wide
     on the inside of a tight turn is squeezed, and where κ·y reaches 1 it would
     fold through the spine's centre of curvature. The fold is measured on every
     outline vertex (max κ·y is reported per placement) and an offset past
     DRAWN.fold / κ is held at that, told. sx ≠ sy also stretches the drawing
     (reported as the anisotropy sx/sy per placement);
   - an END (a volute) and a SHELL are placed WHOLE (a rigid map, uniformly
     scaled): a volute at its body's end, entering along the body's end tangent,
     curling to the side the slot's own end curled to, scaled so its entry width
     is the body's end width; a shell on the axis, opening along the slot's
     direction, scaled so its size box's length is the slot's radius. An element
     with a `rigid` guide is placed whole too (root at the slot's root, along its
     first tangent, scaled to its box's height).
   DEPTH: each outline part declares back / mid / front (or takes its kind's
   default); the level sets the part's height in the relief and its priority
   (a front part owns the cells it shares with a back one: it lies over it, by
   stacking, inside the flat-back relief). A hole cuts only its own element and
   what lies beneath it. Detail lines become ridges (or grooves) in the relief.

   Pure functions, no DOM; every transcendental through frame-math.js. */

import { formsFor, ownersGrid, reliefFromOwners, FORMS, RISE } from './frame-forms.js';
import { importDrawing, ringBox } from './frame-svg-import.js';
import { PLACEHOLDER_SVG } from './frame-drawn-placeholders.js';
import { edt, siteLine } from './frame-mass.js';
import * as FM from './frame-math.js';

export const DRAWN = {
  levels: { back: 2.2, mid: 2.8, front: 3.4 },
  kindDepth: { 'c-scroll': 'mid', 's-scroll': 'back', flame: 'mid', foot: 'mid', leaf: 'back', volute: 'mid', shell: 'front' },
  kindRank: { leaf: 0, 's-scroll': 1, foot: 1, flame: 2, 'c-scroll': 3, volute: 3, shell: 3 },
  fold: 0.9,                 // an offset past fold / κ on the inside of a turn is held there (a fold through the centre)
  relax: 0.8,
  stack: 0.4,                // mm: a part lying over another stands at least this much above it there                // a spine turning tighter than relax / (the drawing's reach) is relaxed there first
  step: 0.2,                 // mm: the mapped outlines are resampled to this, so a bent edge follows its spine
};
// the slot's kind, the drawn kind it takes, the fall-back order, and the END a body is closed with
const SLOT_KIND = { c: 'c-scroll', flame: 'flame', stem: 's-scroll', foot: 'foot', leaf: 'leaf', shell: 'shell' };
const FALLBACK = { 'c-scroll': ['c-scroll', 's-scroll', 'flame'], 's-scroll': ['s-scroll', 'flame', 'c-scroll'], flame: ['flame', 's-scroll', 'c-scroll'], foot: ['foot', 's-scroll', 'flame'], leaf: ['leaf', 'flame'], shell: ['shell'], volute: ['volute'] };
const END = { c: 1, foot: 1, flame: 2, stem: 2 };              // volute-1 is the closed curl round a ball eye, volute-2 the open hook
const RISE_OF = { c: RISE.c, flame: RISE.flame, stem: RISE.stem, foot: RISE.foot, leaf: RISE.leaf };

/* THE BEND (the skeletal map): a drawing's point (x, y) to S(sx·x) + sy·y·side·N(sx·x); an offset on the inside of a
   turn past DRAWN.fold of its radius is held there (counted). Exported for the gate's identities. */
export function bendMap(sp, sx, sy, side) {
  const stats = { foldMax: 0, held: 0 };
  const f = ([x, y]) => {
    const X = x * sx, s = spineAt(sp, X);
    let Y = y * sy * side;
    const risk = s.k * Y;                       // > 0: Y on the inside of the turn
    if (risk > stats.foldMax) stats.foldMax = risk;
    if (risk > DRAWN.fold) { Y = DRAWN.fold / s.k; stats.held++; }
    return [s.p[0] + Y * s.n[0], s.p[1] + Y * s.n[1]];
  };
  return { f, stats };
}

const cache = new Map();
export function drawingFor(text) {
  const t = text || PLACEHOLDER_SVG;
  if (!cache.has(t)) { if (cache.size > 4) cache.clear(); cache.set(t, importDrawing(t)); }
  return cache.get(t);
}

/* the chord of a set of rings at x, in the interval that holds (or is nearest) y = 0 */
function chordAt(rings, x) {
  const xs = [];
  for (const r of rings) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if ((a[0] <= x) !== (b[0] <= x)) xs.push(a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])); }
  xs.sort((p, q) => p - q);
  let best = null;
  for (let k = 0; k + 1 < xs.length; k += 2) { const lo = xs[k], hi = xs[k + 1], d = lo <= 0 && hi >= 0 ? 0 : Math.min(Math.abs(lo), Math.abs(hi)); if (!best || d < best.d) best = { lo, hi, d }; }
  return best ? best.hi - best.lo : 0;
}
/* a ring resampled so no edge is longer than `step` */
function densify(ring, step, closed = true) {
  const out = [], n = ring.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = ring[i], b = ring[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  if (!closed) out.push(ring[n - 1]);
  return out;
}

/* a world spine: arc length, unit tangents, left normals, signed curvature */
export function spineOf(P) {
  const Q = [P[0]];
  for (let i = 1; i < P.length; i++) if (Math.hypot(P[i][0] - Q[Q.length - 1][0], P[i][1] - Q[Q.length - 1][1]) > 1e-6) Q.push(P[i]);
  const n = Q.length, u = [0], T = [], K = [];
  for (let i = 1; i < n; i++) u.push(u[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]));
  for (let i = 0; i < n; i++) { const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; T.push([(b[0] - a[0]) / l, (b[1] - a[1]) / l]); }
  const ang = T.map((t) => FM.atan2(t[1], t[0]));
  for (let i = 1; i < n; i++) { while (ang[i] - ang[i - 1] > Math.PI) ang[i] -= 2 * Math.PI; while (ang[i] - ang[i - 1] < -Math.PI) ang[i] += 2 * Math.PI; }
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2); K.push(u[b] > u[a] ? (ang[b] - ang[a]) / (u[b] - u[a]) : 0); }
  return { P: Q, u, T, N: T.map(([x, y]) => [-y, x]), K, L: u[n - 1], turn: ang[n - 1] - ang[0] };
}
/* the spine's point, normal and curvature at arc length X (past either end: carried along that end's tangent) */
export function spineAt(sp, X) {
  const { P, u, T, N, K, L } = sp, n = P.length;
  if (X <= 0) return { p: [P[0][0] + X * T[0][0], P[0][1] + X * T[0][1]], n: N[0], t: T[0], k: 0 };
  if (X >= L) { const e = X - L; return { p: [P[n - 1][0] + e * T[n - 1][0], P[n - 1][1] + e * T[n - 1][1]], n: N[n - 1], t: T[n - 1], k: 0 }; }
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (u[m] <= X) lo = m; else hi = m; }
  const f = (X - u[lo]) / Math.max(1e-12, u[hi] - u[lo]);
  const nx = N[lo][0] + (N[hi][0] - N[lo][0]) * f, ny = N[lo][1] + (N[hi][1] - N[lo][1]) * f, nl = Math.hypot(nx, ny) || 1;
  return { p: [P[lo][0] + (P[hi][0] - P[lo][0]) * f, P[lo][1] + (P[hi][1] - P[lo][1]) * f], n: [nx / nl, ny / nl], t: [ny / nl, -nx / nl], k: K[lo] + (K[hi] - K[lo]) * f };
}

export function drawnFor(model, orn, SF, opts = {}) {
  const D = drawingFor(opts.drawing), told = [];
  const plan = formsFor(model, orn, SF, { slotsOnly: true });
  const { slots, M, cell } = plan;
  const { sil, g, R, groove, rib, eyeD } = ownersGrid(model, orn, cell, M);
  const { nx, ny, n, c: cs, y0 } = g;
  const L = SF.L, W = (q) => SF.W(Math.max(0, Math.min(L, q[0])), q[1]);
  const els = [], holes = [], placed = [];
  const errs = D.problems.filter((p) => p.level === 'error');
  if (errs.length) told.push(`the drawing has ${errs.length} problem${errs.length > 1 ? 's' : ''} (${errs[0].element ? errs[0].element + ': ' : ''}${errs[0].message}${errs.length > 1 ? ' …' : ''})`);
  const byKind = (k) => D.elements.filter((e) => e.kind === k);

  // ---- one PART (an outline layer of one element) into the owners' raster ----
  const stampPart = (worldRings, el, uOf) => {
    let bx = ringBox(worldRings);
    const i0 = Math.max(0, Math.floor(bx.x0 / cs) + n - 2), i1 = Math.min(nx - 1, Math.ceil(bx.x1 / cs) + n + 2);
    const j0 = Math.max(0, Math.floor((bx.y0 - y0) / cs) - 2), j1 = Math.min(ny - 1, Math.ceil((bx.y1 - y0) / cs) + 2);
    if (i1 < i0 || j1 < j0) return 0;
    const w = i1 - i0 + 1, h = j1 - j0 + 1, mask = new Uint8Array(w * h);
    for (const r of worldRings) {
      // NONZERO winding, not even-odd: where a bend folds a ring over itself the overlap stays material (a fold
      // through the centre of a tight turn makes a reversed loop, which even-odd would punch out as a hole)
      for (let j = 0; j < h; j++) {
        const y = y0 + (j0 + j) * cs, xs = [];
        for (let k = 0; k < r.length; k++) { const a = r[k], b = r[(k + 1) % r.length]; if ((a[1] <= y) !== (b[1] <= y)) xs.push([a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), b[1] > a[1] ? 1 : -1]); }
        xs.sort((p, q) => p[0] - q[0]);
        let wn = 0;
        for (let k = 0; k + 1 < xs.length; k++) {
          wn += xs[k][1];
          if (!wn) continue;
          const a = Math.max(0, Math.ceil(xs[k][0] / cs) + n - i0), b = Math.min(w - 1, Math.floor(xs[k + 1][0] / cs) + n - i0);
          for (let i = a; i <= b; i++) mask[j * w + i] = 1;
        }
      }
    }
    // the part's own distance to its edge: a dome off the drawn outline (crown 0, edge 1)
    const d2 = edt(w, h, (k) => !mask[k]);
    let dMax = 0; for (let k = 0; k < w * h; k++) if (mask[k]) dMax = Math.max(dMax, Math.sqrt(d2[k]));
    const dRef = Math.max(1, 0.75 * dMax);
    let cells = 0; const list = [], est = [];
    const riseF = (u) => (el.rise ? el.rise[0] + (el.rise[1] - el.rise[0]) * (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)) : 1);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!mask[j * w + i]) continue;
      const kk = (j0 + j) * nx + i0 + i; list.push(kk); const aa = 1 - Math.min(1, Math.sqrt(d2[j * w + i]) / dRef);
      R.A[kk] = 1; cells++;
      const u = uOf ? uOf((i0 + i - n) * cs, y0 + (j0 + j) * cs) : 0;
      est.push(el.lvl * riseF(u));
      if (el.pri > R.pri[kk] || (el.pri === R.pri[kk] && aa < Math.abs(R.acr[kk]))) { R.pri[kk] = el.pri; R.own[kk] = el.id; R.acr[kk] = aa; R.alu[kk] = u; }
    }
    el.cells = Int32Array.from(list); el.est = Float32Array.from(est);
    return cells;
  };
  const addEl = (dEl, depth) => {
    const dp = depth || DRAWN.kindDepth[dEl.kind] || 'mid', rank = { back: 0, mid: 1, front: 2 }[dp];
    const el = { id: els.length, kind: 'drawn', pri: 1 + 4 * rank + (DRAWN.kindRank[dEl.kind] || 0), lvl: DRAWN.levels[dp], depth: dp, from: dEl.name };
    els.push(el); return el;
  };
  // ---- place one drawn element by a map from its frame (mm) to the world; its parts, holes and lines ----
  const placeWith = (dEl, map, rise, uOf, slotRole) => {
    const rec = { slot: slotRole, drawing: dEl.name, parts: [] };
    let topPri = 0;
    for (const part of dEl.parts) {
      const el = addEl(dEl, part.depth); el.rise = rise; topPri = Math.max(topPri, el.pri);
      const rings = part.rings.map((r) => densify(r, DRAWN.step / map.scale).map(map.f));
      el.rings = rings;
      rec.parts.push({ depth: el.depth, level: el.lvl, cells: stampPart(rings, el, uOf) });
    }
    const basePri = Math.min(...dEl.parts.map((p) => { const dp = p.depth || DRAWN.kindDepth[dEl.kind] || 'mid'; return 1 + 4 * { back: 0, mid: 1, front: 2 }[dp] + (DRAWN.kindRank[dEl.kind] || 0); }));
    for (const h of dEl.holes) holes.push({ poly: densify(h, DRAWN.step / map.scale).map(map.f), pri: basePri, from: dEl.name });
    for (const ln of dEl.ridges) siteLine(g, rib, densify(ln, DRAWN.step / map.scale, false).map(map.f));
    for (const ln of dEl.grooves) siteLine(g, groove, densify(ln, DRAWN.step / map.scale, false).map(map.f));
    { let ax = 0, ay = 0, nn = 0; for (const e of els.slice(els.length - dEl.parts.length)) for (const r of e.rings) for (const [x, y] of r) { ax += x; ay += y; nn++; } rec.at = nn ? [ax / nn, ay / nn] : null; }
    placed.push(rec);
    return rec;
  };

  // ---- the slots ----
  const pick = (kind, want) => {
    for (const k of FALLBACK[kind] || [kind]) {
      const cand = byKind(k).filter((e) => e.size && e.size.x1 > 0 && e.size.y1 > e.size.y0);
      if (!cand.length) continue;
      if (!want) return { el: cand.sort((a, b) => a.n - b.n)[0], fell: k !== kind ? k : null };
      // the variant that needs the LEAST scaling to fill the slot (its size box is drawn at the default scale): the
      // stretch along and the scale across, both counted — so a slot gets the drawing its proportions AND width suit
      let best = null;
      for (const e of cand) { const d = Math.abs(FM.log(want.L / e.size.x1)) + Math.abs(FM.log(want.w / (e.size.y1 - e.size.y0))); if (!best || d < best.d - 1e-12 || (Math.abs(d - best.d) <= 1e-12 && e.n < best.el.n)) best = { el: e, d }; }
      return { el: best.el, fell: k !== kind ? k : null };
    }
    return null;
  };
  const fellBack = new Set();
  for (const sl of slots) {
    const kind = SLOT_KIND[sl.slot];
    if (sl.slot === 'shell') {
      const pk = pick('shell'); if (!pk) { told.push(`no shell drawn — the ${sl.role} is left out`); continue; }
      const dEl = pk.el, k = sl.R / dEl.size.x1, out = sl.out, perp = [-out[1], out[0]];
      const f = ([x, y]) => [sl.base[0] + k * (x * out[0] + y * perp[0]), sl.base[1] + k * (x * out[1] + y * perp[1])];
      const rec = placeWith(dEl, { f, scale: k }, null, null, sl.role); rec.rigid = true; rec.k = k;
      continue;
    }
    // the slot's spine in the world; where the side's map JUMPS (at a convex corner a point offset outward lands on the
    // next side: one local step becomes ~15 mm), the spine is cut there and the longer piece kept — the forms round's
    // capsules bridged such a jump, a bent drawing would fold across it
    let Pw = sl.path.P.map(W), cut = 0;
    { const pieces = [[Pw[0]]];
      for (let i = 1; i < Pw.length; i++) {
        const dl = Math.hypot(sl.path.P[i][0] - sl.path.P[i - 1][0], sl.path.P[i][1] - sl.path.P[i - 1][1]), dw = Math.hypot(Pw[i][0] - Pw[i - 1][0], Pw[i][1] - Pw[i - 1][1]);
        if (dw > 1 && dw > 4 * dl) { pieces.push([Pw[i]]); cut++; } else pieces[pieces.length - 1].push(Pw[i]);
      }
      if (cut) Pw = pieces.reduce((a, b) => (b.length > a.length ? b : a)); }
    let sp = spineOf(Pw);
    if (!(sp.L > 1)) continue;
    const pk = pick(kind, { L: sp.L, w: sl.w });
    if (!pk) { told.push(`nothing drawn for the ${sl.role} — left out`); continue; }
    if (pk.fell) fellBack.add(`${kind} → ${pk.fell}`);
    const dEl = pk.el, sz = dEl.size, boxH = sz.y1 - sz.y0;
    // the side the slot's end curls to (its recorded centre); a leaf: the side its spine turns to
    const e = sp.P.length - 1;
    let side = 1;
    if (sl.cen) side = ((sl.cen[0] - sp.P[e][0]) * sp.N[e][0] + (sl.cen[1] - sp.P[e][1]) * sp.N[e][1]) >= 0 ? 1 : -1;
    else side = sp.turn >= 0 ? 1 : -1;
    if (dEl.rigid) {
      const k = sl.w / boxH, t = sp.T[0], nn = [-t[1] * side, t[0] * side], p0 = sp.P[0];
      const f = ([x, y]) => [p0[0] + k * (x * t[0] + y * nn[0]), p0[1] + k * (x * t[1] + y * nn[1])];
      const rec = placeWith(dEl, { f, scale: k }, null, null, sl.role); rec.rigid = true; rec.k = k;
      continue;
    }
    // the spine RELAXED where it turns tighter than the drawing is wide THERE: at each station, the drawing's reach
    // on the INSIDE of the turn (its widest |y| on that side, in the drawing's own x near the station, at this slot's
    // scale) may come to at most DRAWN.relax of the turn's radius — a Laplacian step on the offending stations, both
    // ends held, up to 240 passes; the slot's path everywhere else is unmoved
    const NB = 48, up = new Float64Array(NB), dn = new Float64Array(NB), syR = sl.w / boxH;
    for (const p of dEl.parts) for (const r of p.rings) for (const [x, y] of r) { const bi = Math.max(0, Math.min(NB - 1, Math.floor(x / sz.x1 * NB))); if (y > up[bi]) up[bi] = y; if (-y > dn[bi]) dn[bi] = -y; }
    const reachAt = (u, k) => { const bi = Math.max(0, Math.min(NB - 1, Math.floor(u / sp.L * NB))); let m = 0; for (let d = -1; d <= 1; d++) { const q = Math.max(0, Math.min(NB - 1, bi + d)); m = Math.max(m, k * side > 0 ? up[q] : dn[q]); } return m * syR; };
    let relaxed = 0;
    for (let pass = 0; pass < 240; pass++) {
      const bad = sp.K.map((k, i) => Math.abs(k) * reachAt(sp.u[i], k) > DRAWN.relax);
      if (!bad.some((b, i) => b && i > 0 && i < bad.length - 1)) break;
      const P = sp.P.map((q) => q.slice());
      for (let i = 1; i < P.length - 1; i++) if (bad[i] || bad[i - 1] || bad[i + 1]) { P[i][0] = 0.5 * sp.P[i][0] + 0.25 * (sp.P[i - 1][0] + sp.P[i + 1][0]); P[i][1] = 0.5 * sp.P[i][1] + 0.25 * (sp.P[i - 1][1] + sp.P[i + 1][1]); }
      sp = spineOf(P); relaxed = pass + 1;
    }
    const sx = sp.L / sz.x1, sy = sl.w / boxH;
    const bend = bendMap(sp, sx, sy, side), f = bend.f;
    // u along the element: the arc length of the nearest spine point, over the spine's length
    const uOf = (x, y) => { let bi = 0, bd = Infinity; for (let i = 0; i < sp.P.length; i += 2) { const dx = sp.P[i][0] - x, dy = sp.P[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } return Math.min(1, sp.u[bi] / sp.L); };
    const rec = placeWith(dEl, { f, scale: Math.max(sx, sy) }, RISE_OF[sl.slot] || null, uOf, sl.role);
    const { foldMax, held } = bend.stats;
    Object.assign(rec, { sx, sy, aniso: sx / sy, foldMax, held, side, L: sp.L, w: sl.w, relaxed, cut, cen: sl.cen || null, endP: sp.P[sp.P.length - 1], endT: sp.T[sp.T.length - 1] });
    if (held) told.push(`${sl.role}: ${dEl.name} bent past its spine's turn — ${held} point${held > 1 ? 's' : ''} held at ${DRAWN.fold} of the turn's radius`);
    // the END: a volute placed whole at the spine's end, entering along its tangent, curling to the same side
    if (END[sl.slot]) {
      const want = byKind('volute').find((v) => v.n === END[sl.slot]) || byKind('volute')[0];
      if (want) {
        const allRings = dEl.parts.flatMap((p) => p.rings), wBody = chordAt(allRings, sz.x1 - 1e-3) * sy;
        const vr = want.parts.flatMap((p) => p.rings), wIn = chordAt(vr, 1e-3);
        if (wBody > 0 && wIn > 0) {
          const k = wBody / wIn, s = spineAt(sp, sp.L), t = s.t, nn = [s.n[0] * side, s.n[1] * side], p0 = s.p;
          const fv = ([x, y]) => [p0[0] + k * (x * t[0] + y * nn[0]), p0[1] + k * (x * t[1] + y * nn[1])];
          const rv = placeWith(want, { f: fv, scale: k }, null, null, `${sl.role} — end`); rv.rigid = true; rv.k = k; rec.end = want.name; rec.endAt = rv.at;
        } else told.push(`${sl.role}: ${!(wBody > 0) ? dEl.name + ' has no width at its size box\'s end' : want.name + ' has no width at its entry'} — no end placed`);
      }
    }
  }
  // STACKING: wherever a part lies over a lower one, its height there is held at least DRAWN.stack above that part's
  // own (its level and its rise along its length) — so a front part rooted low still stands over what it covers
  R.under = new Float32Array(R.A.length);
  for (const e of els) if (e.cells) for (let i = 0; i < e.cells.length; i++) { const k = e.cells[i]; if (e.pri < R.pri[k] && e.est[i] > R.under[k]) R.under[k] = e.est[i]; }
  R.stack = DRAWN.stack;
  for (const fb of fellBack) told.push(`no drawing of the slot's own kind (${fb.split(' → ')[0]}) — ${fb.split(' → ')[1]} used`);
  const r = reliefFromOwners({ g, R, els, holes, groove, rib, eyeD, sil, orn, told, cell, emb: FORMS.embed, stats: { cell, placed, problems: D.problems, unitsPerMm: D.unitsPerMm, drawn: D.elements.map((e) => e.name), slots: slots.length } });
  r.debug.els = els;
  return r;
}
