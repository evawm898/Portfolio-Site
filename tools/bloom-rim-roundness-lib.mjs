/* ===================================================================
   tools/bloom-rim-roundness-lib.mjs — the instruments behind
   docs/bloom-infill-roundness-and-bevel.md. MEASUREMENT ONLY: nothing here
   is imported by the generator, and nothing here changes a byte it emits.

   `loadVariant({ K, law })` imports a PATCHED COPY of the shipped
   `bloom-geometry.js` written into a scratch directory (never the repo), with
   exactly two knobs:
     K    — `RIM_BEAD_SEGMENTS`, the bead's segment cap (4 on the shipped tree);
     law  — a replacement for the ONE line in `petalInfillPlan`'s `drawnOf`
            that fillets a hole, called as law(clipped, fr, infillFillet,
            infillInset). `null` leaves the shipped line in place.
   Each variant is its own module instance (a distinct file), so two variants
   never share a constant. The patch REFUSES if an anchor does not match
   exactly once — a disarmed patch would measure the shipped tree and label it
   the variant.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-rim-roundness-'));

function replaceOnce(src, from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`patch anchor matched ${n} times, want 1: ${from}`);
  return src.replace(from, to);
}
let serial = 0;
export async function loadVariant({ K = 4, law = false } = {}) {
  let s = SRC;
  s = replaceOnce(s, 'export const RIM_BEAD_SEGMENTS = 4;', `export const RIM_BEAD_SEGMENTS = ${K};`);
  /* THE LAW REPLACES THE WHOLE HOLE, and the shipped roundness (`infillRound`,
     the roundness-control session) is STOOD DOWN while a law is installed, so a
     variant measures exactly the law it was handed and never that law opened a
     second time by the shipped control. */
  if (law) s = replaceOnce(s, '      const f = infillFillet(clipped, fr, 5, radii);',
    '      const f = globalThis.__holeLaw ? globalThis.__holeLaw(clipped, fr, infillFillet, infillInset) : infillFillet(clipped, fr, 5, radii);');
  if (law) s = replaceOnce(s, '      if (!(round > 0)) { roundOf.set(q, null); return q; }',
    '      if (globalThis.__holeLaw || !(round > 0)) { roundOf.set(q, null); return q; }');
  /* A PASS MARKER, so a probe can keep only the LAST drop pass's holes — the
     ones the plan ships. It calls a hook and changes nothing else. */
  if (law) s = replaceOnce(s, '    const raws = cells.map(rawOf);', '    if (globalThis.__holePass) globalThis.__holePass();\n    const raws = cells.map(rawOf);');
  const f = path.join(SCRATCH, `geo-${serial++}-K${K}${law ? '-law' : ''}.mjs`);
  fs.writeFileSync(f, s);
  return import(pathToFileURL(f).href);
}

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

/* The first slot's ring and slot, the way every Node-side petal tool finds them. */
export function firstSlot(G, st, acc) {
  const fr = G.footRing(st, acc); let got = null; const ring = fr.slotRings[0][0];
  G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra,
    phase: ring.phase, placement: st.placement, fan: fr.fan, blade: (slot) => { if (!got) got = { ring: fr.slotRings[0][slot.index], slot }; } });
  return got;
}
export function coerce(st) { for (const k of Object.keys(st)) if (typeof st[k] === 'string' && st[k] !== '' && !isNaN(Number(st[k]))) st[k] = Number(st[k]); return st; }

/* One whole build, the builder's own record beside it. */
export function build(G, DEFAULTS, set, { exportMode = true, normals = false } = {}) {
  const st = coerce({ ...DEFAULTS, ...set });
  const acc = new G.MeshBuilder({ exportMode, captureGrid: true, captureNormals: normals });
  const b = G.buildBloomInto(acc, st, { below: null });
  const acc0 = new G.MeshBuilder({ exportMode });
  const fs0 = firstSlot(G, st, acc0);
  const surface = fs0 ? G.petalSurface(st, fs0.ring, fs0.slot, null, acc0) : null;
  return { st, acc, b, pos: Float64Array.from(acc.positions), normals: acc.normals ? Float64Array.from(acc.normals) : null,
    tris: acc.triangleCount, F: b.petalsAll && b.petalsAll[0] && b.petalsAll[0].infill, surface };
}

/* A PLANE SECTION of an emitted triangle soup: every triangle the plane crosses
   gives one segment, expressed in the plane's own 2D basis (e1, e2) about O. */
export function section(pos, O, N, e1, e2, win) {
  const segs = [];
  for (let t = 0; t < pos.length; t += 9) {
    const V = [0, 1, 2].map((k) => [pos[t + k * 3], pos[t + k * 3 + 1], pos[t + k * 3 + 2]]);
    const d = V.map((v) => dot(sub(v, O), N));
    const pts = [];
    for (let e = 0; e < 3; e++) { const a = e, b = (e + 1) % 3; if ((d[a] > 0) !== (d[b] > 0)) { const f = d[a] / (d[a] - d[b]); pts.push(V[a].map((x, k) => x + (V[b][k] - x) * f)); } }
    if (pts.length === 2) {
      const s = pts.map((p) => { const r = sub(p, O); return [dot(r, e1), dot(r, e2)]; });
      if (!win || s.every(([x, y]) => Math.abs(x) <= win[0] && Math.abs(y) <= win[1])) segs.push(s);
    }
  }
  return segs;
}
/* CHAIN the segments into polylines by shared endpoints (to 1e-7 mm), then
   merge collinear runs (a quad is two triangles, so one facet cuts as two
   collinear segments). Returns the polylines as vertex lists. */
export function chain(segs, tol = 1e-7) {
  const key = (p) => `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)}`;
  const adj = new Map();
  const add = (k, i) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); };
  segs.forEach((s, i) => { add(key(s[0]), i); add(key(s[1]), i); });
  const used = new Array(segs.length).fill(false); const lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = true;
    let line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const end = dir ? line[line.length - 1] : line[0];
        const nx = (adj.get(key(end)) || []).find((j) => !used[j]);
        if (nx === undefined) break;
        used[nx] = true;
        const s = segs[nx]; const other = key(s[0]) === key(end) ? s[1] : s[0];
        if (dir) line.push(other); else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines.map((l) => {
    const out = [l[0]];
    for (let i = 1; i < l.length - 1; i++) {
      const a = out[out.length - 1], b = l[i], c = l[i + 1];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const lu = Math.hypot(...u), lv = Math.hypot(...v);
      if (lu < 1e-9) continue;
      if (lv < 1e-9) continue;
      const turn = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
      if (turn > 1e-4) out.push(b);
    }
    out.push(l[l.length - 1]);
    return out;
  });
}
export function turnsOf(line) {
  const r = [];
  for (let i = 1; i < line.length - 1; i++) {
    const a = line[i - 1], b = line[i], c = line[i + 1];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const cr = u[0] * v[1] - u[1] * v[0], dt = u[0] * v[0] + u[1] * v[1];
    r.push({ at: b, deg: (Math.atan2(cr, dt) * 180) / Math.PI, lenIn: Math.hypot(...u), lenOut: Math.hypot(...v) });
  }
  return r;
}

/* ---------------- the hole laws the roundness sweep compares ----------------
   Every law below is handed the CLIPPED inset polygon (the hole before its
   corners are treated — convex, CCW, plan millimetres) and returns the hole.
   `R` is in plan millimetres; on the default petal the plan is FLAT
   (`infillPlanIsFlat`), so a plan millimetre is a surface millimetre and the
   laws are compared on the state they would ship on. */
export function inradiusOf(poly, infillInset) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (infillInset(poly, m)) lo = m; else hi = m; }

}
/* THE OPENING: erode by R, dilate by R with round joins — the union of every
   R-disc that fits in the polygon. On a convex polygon it IS a fillet of radius
   R on every corner with no clamp, and it tends to the inscribed circle (or a
   stadium, where two sides bind) as R tends to the inradius. It never removes
   the largest inscribed disc, so the ruled 1.50 mm WIDTH of a hole is
   invariant under it — only its AREA falls. */
export function openingLaw(poly, R, infillInset, stepRad = Math.PI / 20, circle = false) {
  const rIn = inradiusOf(poly, infillInset);
  /* AT THE INRADIUS THE ERODED CORE IS A POINT (or a segment), and dilating
     a vanishing polygon's near-coincident vertices would hand the emitter
     slivers — so the ceiling is drawn as what it is: the inscribed circle,
     centred on the core that remains a hair inside it. */
  if (circle) {
    const core = infillInset(poly, rIn * 0.999) || poly;
    let cx = 0, cy = 0; for (const q of core) { cx += q.x; cy += q.y; } cx /= core.length; cy /= core.length;
    const r = rIn * 0.999, N = Math.ceil((2 * Math.PI) / stepRad), out = [];
    for (let k = 0; k < N; k++) { const a = (2 * Math.PI * k) / N; out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
    return out;
  }
  /* THE OPENING'S OWN CEILING IS NOT A CIRCLE: at R -> rIn it is the union
     of every maximal inscribed disc, which is a STADIUM wherever two sides
     bind at once. `circle` asks for the circle explicitly — a further cut
     along the long axis, measured separately so the jump is visible. */
  const Re = Math.min(R, rIn * 0.999);
  const E = infillInset(poly, Re);
  if (!E || E.length < 3) return poly;
  /* THE EXACT BOUNDARY, then DECIMATED BY TURNING. The opening is traced
     densely (a vertex arc at 1 degree), then a point is KEPT whenever the
     boundary has turned stepRad since the last kept point, or where a
     straight run longer than `STRAIGHT_MM` begins or ends. So a hole costs
     ~2 pi / stepRad arc points plus two per straight side — the shipped
     fillet's own shape (straight sides, arcs at ~9 degrees a segment) —
     whatever the eroded core's vertex count happens to be. */
  const STRAIGHT_MM = 0.1;
  const n = E.length, dense = [];
  let area2 = 0; for (let i = 0; i < n; i++) { const a = E[i], b = E[(i + 1) % n]; area2 += a.x * b.y - b.x * a.y; }
  const ccw = area2 > 0 ? 1 : -1;
  const nrmOf = (a, b) => { const ex = b.x - a.x, ey = b.y - a.y, L = Math.hypot(ex, ey) || 1; return ccw > 0 ? [ey / L, -ex / L] : [-ey / L, ex / L]; };
  for (let i = 0; i < n; i++) {
    const P = E[(i - 1 + n) % n], Q = E[i], Nx = E[(i + 1) % n];
    const na = nrmOf(P, Q), nb = nrmOf(Q, Nx);
    const a1 = Math.atan2(na[1], na[0]), a2 = Math.atan2(nb[1], nb[0]);
    let da = (a2 - a1) * ccw; while (da < 0) da += 2 * Math.PI; while (da > 2 * Math.PI) da -= 2 * Math.PI;
    const segs = Math.max(1, Math.ceil(da / (Math.PI / 180)));
    for (let k = 0; k <= segs; k++) { const a = a1 + ccw * da * k / segs; dense.push({ x: Q.x + Re * Math.cos(a), y: Q.y + Re * Math.sin(a) }); }
  }
  const m = dense.length, keep = new Array(m).fill(false);
  const dirOf = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  let acc = 0; keep[0] = true;
  for (let i = 1; i < m; i++) {
    const a = dense[i - 1], b = dense[i], c = dense[(i + 1) % m];
    const la = Math.hypot(b.x - a.x, b.y - a.y), lb = Math.hypot(c.x - b.x, c.y - b.y);
    if (la < 1e-9 || lb < 1e-9) continue;
    let t = dirOf(b, c) - dirOf(a, b); while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI;
    acc += Math.abs(t);
    if (acc >= stepRad || la > STRAIGHT_MM || lb > STRAIGHT_MM) { keep[i] = true; acc = 0; }
  }
  const out = []; for (let i = 0; i < m; i++) if (keep[i]) { const l = out[out.length - 1]; if (!l || Math.hypot(dense[i].x - l.x, dense[i].y - l.y) > 1e-6) out.push(dense[i]); }
  if (out.length > 2 && Math.hypot(out[0].x - out.at(-1).x, out[0].y - out.at(-1).y) <= 1e-6) out.pop();
  return out;
}
export const polyArea = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };
export function segDist(px, py, a, b) { const ex = b.x - a.x, ey = b.y - a.y, L2 = ex * ex + ey * ey; let t = L2 > 0 ? ((px - a.x) * ex + (py - a.y) * ey) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - a.x - t * ex, py - a.y - t * ey); }
export function polyDist(px, py, poly) { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(px, py, poly[i], poly[(i + 1) % poly.length])); return d; }
/* How far round a hole is: 1 at a circle, less at a polygon — the isoperimetric
   quotient 4 pi A / P^2 (0.785 for a square, 0.907 for a regular hexagon). */
export function roundnessOf(poly) { let per = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; per += Math.hypot(b.x - a.x, b.y - a.y); } return 4 * Math.PI * polyArea(poly) / (per * per); }

/* The plan alone, for one state — `petalInfillPlan` on the builder's own rows,
   the way tools/bloom-infill-wall.mjs builds it, with the variant module. */
export function planFor(G, DEFAULTS, set, exportMode = true) {
  const st = coerce({ ...DEFAULTS, ...set, petalInfill: 'VORONOI' });
  const acc0 = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlot(G, st, acc0);
  const a = new G.MeshBuilder({ exportMode, captureGrid: true });
  const petal = G.buildPetalInto(a, st, ring, slot, null, true);
  const surface = G.petalSurface(st, ring, slot, null, acc0);
  const g = petal.grid[0];
  const panel = { rowFrom: g.rowFrom, rowTo: g.rowTo, label: g.label, spanAt: () => [-1, 1] };
  const plan = G.petalInfillPlan(surface, g.rows, panel, { density: st.infillDensity, passes: st.infillRelax, gamma: st.infillLaw, aniso: st.infillAniso, baseFrac: st.infillBase, round: st.infillRound });
  return { st, petal, surface, plan, tris: a.triangleCount };
}
