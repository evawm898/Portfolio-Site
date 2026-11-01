#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone2-plate.mjs — THE MESHING COMPARISON ON A CHARTED
   DOMAIN (BONE v2 prototype; docs/bloom-surface-texture-bone-v2.md §5).
   Not a gate and not shipped: an instrument.

   ONE FIELD, FOUR MESHES of the same patch, every number measured on the
   EMITTED triangles:
     lattice — the v2 field sampled on the shipped 0.4 mm lattice (v1's mesh):
               the control, what v2 looks like with no refinement;
     grid    — the 0.4 mm lattice refined by longest-edge bisection to the
               DERIVED edge (half the lip's drawn width at the smallest pore);
     grid=   — the same refiner at the edge that spends the RINGS' triangle
               count on the same patch: the two compared at EQUAL COST;
     rings   — every pore meshed with its own rings about its centre (the
               profile's breakpoints, staggered), its nested pits with theirs,
               the plateau filled at the smallest pore's radius, Delaunay in
               the chart.
   Two domains: a FLAT plate (z = 0) and a CYLINDER patch (a petal's cup
   curvature, radius 6 mm) — both charts are isometric, which is what the
   rings need (§6: what porting them to the generator's organs takes).

   Measured per mesh: triangles per mm2 and build time per mm2; per ISOLATED,
   fully admitted pore: the drawn outline at mid-wall (the level-0.5 contour
   of the emitted heights) — its segment count (edges per circumference) and
   its largest radial deviation from the true mid-wall circle (mm and % of
   the pore's radius) — and the drawn depth / drawn diameter; the thinnest
   wall between two adjacent pores (on the field, at mid-height).

     node tools/bloom-texture-bone2-plate.mjs [--size 8] [--H 0.4] [--D 0.5]
       [--spread 3] [--domain plate|cylinder] [--json out.json] [--quiet]
   =================================================================== */
/* browser-safe: the field module by URL, Node's own modules only in the CLI */
const B = await import(new URL('../bloom-texture-bone2.js', import.meta.url).href);

/* ---------------------------------------------------------- domains --- */
export function plateDomain() {
  return { name: 'plate', map: (x, y) => ({ p: [x, y, 0], n: [0, 0, 1] }), chartOf: (c) => [c[0], c[1]], axes: () => ({ ex: [1, 0, 0], ey: [0, 1, 0] }) };
}
export function cylinderDomain(Rc = 6) {
  return {
    name: `cylinder R${Rc}`, Rc,
    map: (x, s) => { const a = s / Rc; return { p: [x, Rc * Math.sin(a), Rc * Math.cos(a)], n: [0, Math.sin(a), Math.cos(a)] }; },
    chartOf: (c) => [c[0], Rc * Math.atan2(c[1], c[2])],
    axes: (x, s) => { const a = s / Rc; return { ex: [1, 0, 0], ey: [0, Math.cos(a), -Math.sin(a)] }; },
  };
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* the shipped-like lattice: equilateral triangles of edge e over [x0,x1]x[y0,y1] */
function latticeChart(x0, x1, y0, y1, e) {
  const h = e * Math.sqrt(3) / 2;
  const nx = Math.ceil((x1 - x0) / e) + 2, ny = Math.ceil((y1 - y0) / h) + 1;
  const xy = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) xy.push(x0 + (i - 0.5 + (j % 2) * 0.5) * e, y0 + j * h);
  const tri = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (j % 2 === 0) tri.push(a, b, c, b, d, c); else tri.push(a, b, d, a, d, c);
  }
  return { xy, tri };
}

/* ------------------------------------------------- one mesh, one domain */
export function meshPatch(method, dom, field, params, { x0, x1, y0, y1 }, opts = {}) {
  const t0 = performance.now();
  const H = params.H;
  const margin = params.Dmax * 1.3;
  let chartXY, tri, nested = 0, ringPores = 0, eUsed = null;
  if (method === 'lattice' || method === 'grid' || method === 'grid=') {
    const L = latticeChart(x0 - margin, x1 + margin, y0 - margin, y1 + margin, 0.4);
    chartXY = L.xy; tri = L.tri;
    if (method !== 'lattice') {
      eUsed = method === 'grid' ? B.bone2GridEdgeMm(params) : opts.edge;
      /* the refiner runs in the CHART here (both charts are isometric, and a
         chart midpoint maps onto the surface, not onto a chord) */
      const P3 = []; for (let i = 0; i < chartXY.length / 2; i++) P3.push(chartXY[i * 2], chartXY[i * 2 + 1], 0);
      const porous = new Uint8Array(tri.length / 3).fill(1);
      const R = B.gridRefine(P3, tri, [], porous, eUsed);
      chartXY = []; for (let i = 0; i < R.P.length / 3; i++) chartXY.push(R.P[i * 3], R.P[i * 3 + 1]);
      tri = R.tri;
    }
  } else if (method === 'rings') {
    /* the pores, from the field's OWN list, laid in the chart */
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const [x, y] of [[x0 - margin, y0 - margin], [x1 + margin, y0 - margin], [x0 - margin, y1 + margin], [x1 + margin, y1 + margin], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
      const { p } = dom.map(x, y); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    }
    const chartPores = [];
    for (const pore of field.poresIn(lo, hi)) {
      const [px, py] = dom.chartOf(pore.centre);
      if (px < x0 - margin || px > x1 + margin || py < y0 - margin || py > y1 + margin) continue;
      const { p: ps, n } = dom.map(px, py);
      const disc = field.discOf(pore, ps, n);
      if (!disc) continue;
      ringPores++;
      const [cx, cy] = dom.chartOf(disc.centre);
      const fr = field.frame(n), ax = dom.axes(cx, cy);
      const nestedC = disc.nested.map((q) => { const o = [q.ox * fr.t1[0] + q.oy * fr.t2[0], q.ox * fr.t1[1] + q.oy * fr.t2[1], q.ox * fr.t1[2] + q.oy * fr.t2[2]]; nested++; return { x: cx + dot(o, ax.ex), y: cy + dot(o, ax.ey), R: q.R }; });
      chartPores.push({ x: cx, y: cy, R: disc.rho, nested: nestedC });
    }
    const en = params.D / 2;
    eUsed = en;
    const bx = [x0 - margin, y0 - margin, x1 + margin, y1 + margin];
    const Mx = B.ringsMeshChart({ pores: chartPores, layout: opts.layout || 'full', fill: { spacing: en, inside: (x, y) => x >= bx[0] && x <= bx[2] && y >= bx[1] && y <= bx[3], clearOf: () => Infinity, bbox: bx } });
    chartXY = Mx.xy; tri = Mx.tri;
  } else throw new Error(`method ${method}`);
  /* map to the surface, sample the field, displace */
  const nV = chartXY.length / 2;
  const P = new Float64Array(nV * 3), Fv = new Float64Array(nV), N = new Float64Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    const { p, n } = dom.map(chartXY[i * 2], chartXY[i * 2 + 1]);
    const f = field.F(p, n);
    Fv[i] = f;
    for (let k = 0; k < 3; k++) { P[i * 3 + k] = p[k] + n[k] * H * f; N[i * 3 + k] = n[k]; }
  }
  const ms = performance.now() - t0;
  /* keep the window's triangles */
  const inW = (i) => chartXY[i * 2] >= x0 && chartXY[i * 2] <= x1 && chartXY[i * 2 + 1] >= y0 && chartXY[i * 2 + 1] <= y1;
  const triW = [];
  for (let t = 0; t < tri.length; t += 3) if (inW(tri[t]) && inW(tri[t + 1]) && inW(tri[t + 2])) triW.push(tri[t], tri[t + 1], tri[t + 2]);
  const areaW = (x1 - x0) * (y1 - y0);
  return { method, dom: dom.name, chartXY, P, F: Fv, N, tri: triW, triAll: tri, ms, areaW, trisPerMm2: triW.length / 3 / areaW, msPerMm2: ms / ((x1 - x0 + 2 * margin) * (y1 - y0 + 2 * margin)), eUsed, ringPores, nested };
}

/* ------------------------------------------------------ measurements --- */
/* every fully admitted pore inside the window with no other admitted pore's
   lip within reach: its drawn mid-wall outline and its drawn depth */
export function poreRoundness(M, dom, field, params, win) {
  const { x0, x1, y0, y1 } = win;
  const lo = [x0 - 3, y0 - 3, -10], hi = [x1 + 3, y1 + 3, 10];
  const lo3 = [Infinity, Infinity, Infinity], hi3 = [-Infinity, -Infinity, -Infinity];
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) { const { p } = dom.map(x, y); for (let k = 0; k < 3; k++) { lo3[k] = Math.min(lo3[k], p[k] - 2); hi3[k] = Math.max(hi3[k], p[k] + 2); } }
  void lo; void hi;
  const all = field.poresIn(lo3, hi3).map((pore) => { const [px, py] = dom.chartOf(pore.centre); const { p, n } = dom.map(px, py); const d = field.discOf(pore, p, n); if (!d) return null; const [cx, cy] = dom.chartOf(d.centre); return { pore: { ...pore, R: d.rho, D: 2 * d.rho }, cx, cy, a: d.a }; }).filter((q) => q && q.a > 0);
  const reach = 1 + B.B2_LIP_K / B.B2_LIP_SLOPE + 0.02;
  const cand = all.filter((q) => q.a === 1 && q.cx - q.pore.R * 1.5 > x0 && q.cx + q.pore.R * 1.5 < x1 && q.cy - q.pore.R * 1.5 > y0 && q.cy + q.pore.R * 1.5 < y1);
  /* the contour of the emitted heights at a level: the MID-WALL — half way
     between the top and the pore's own floor (0.5 for a plain pore; between
     its shelf and the top for one with nested pits) */
  const T = M.tri, F = M.F, XY = M.chartXY;
  const contour = (level) => {
    const segs = [];
    for (let t = 0; t < T.length; t += 3) {
      const v = [T[t], T[t + 1], T[t + 2]];
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const a = v[k], b = v[(k + 1) % 3];
        const fa = F[a] - level, fb = F[b] - level;
        if ((fa < 0) !== (fb < 0)) { const s = fa / (fa - fb); pts.push([XY[a * 2] + s * (XY[b * 2] - XY[a * 2]), XY[a * 2 + 1] + s * (XY[b * 2 + 1] - XY[a * 2 + 1])]); }
      }
      if (pts.length === 2) segs.push(pts);
    }
    return segs;
  };
  const segsAt = new Map();
  /* a contour point is THIS pore's when no other admitted pore (or nested pit
     of this one) reaches it: the outline the pore draws alone */
  const owned = (q, pt) => all.every((o) => o === q || Math.hypot(pt[0] - o.cx, pt[1] - o.cy) > o.pore.R * reach + 0.01);
  const out = [];
  for (const q of cand) {
    const shelf = q.pore.nested.length ? B.B2_NEST_SHELF : 0;
    const level = (1 + shelf) / 2;
    const rStar = B.bone2LevelU(level, shelf) * q.pore.R;
    if (!segsAt.has(level)) segsAt.set(level, contour(level));
    const segs = segsAt.get(level);
    let n = 0, dev = 0, arc = 0;
    for (const [a, b] of segs) {
      const ra = Math.hypot(a[0] - q.cx, a[1] - q.cy), rb = Math.hypot(b[0] - q.cx, b[1] - q.cy);
      if (ra > q.pore.R * 1.25 || rb > q.pore.R * 1.25 || ra < q.pore.R * 0.75 || rb < q.pore.R * 0.75) continue;
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (!owned(q, a) || !owned(q, b)) continue;
      n++;
      arc += Math.abs(Math.atan2((a[0] - q.cx) * (b[1] - q.cy) - (a[1] - q.cy) * (b[0] - q.cx), (a[0] - q.cx) * (b[0] - q.cx) + (a[1] - q.cy) * (b[1] - q.cy)));
      for (const r of [ra, rb, Math.hypot(m[0] - q.cx, m[1] - q.cy)]) dev = Math.max(dev, Math.abs(r - rStar));
    }
    if (arc < Math.PI) continue;   /* at least half its outline its own */
    /* drawn depth: the highest vertex within 1.4 R minus the lowest within 0.6 R */
    let top = -Infinity, bot = Infinity;
    for (let i = 0; i < F.length; i++) { const r = Math.hypot(XY[i * 2] - q.cx, XY[i * 2 + 1] - q.cy); if (r < q.pore.R * 1.4 && F[i] > top) top = F[i]; if (r < q.pore.R * 0.6 && F[i] < bot) bot = F[i]; }
    out.push({ D: q.pore.D, R: q.pore.R, nested: q.pore.nested.length, edges: Math.round((n * 2 * Math.PI) / arc), ownedFrac: arc / (2 * Math.PI), devMm: dev, devPct: (100 * dev) / q.pore.R, depthMm: (top - bot) * params.H, diameterMm: 2 * rStar });
  }
  return out;
}
/* the thinnest wall between two adjacent, fully admitted pores, on the
   FIELD (the design quantity, independent of the mesh): along the line
   between their centres, the length over which F stays at or above a level */
export function wallThickness(dom, field, params, win, level = 0.5) {
  const { x0, x1, y0, y1 } = win;
  const lo3 = [Infinity, Infinity, Infinity], hi3 = [-Infinity, -Infinity, -Infinity];
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) { const { p } = dom.map(x, y); for (let k = 0; k < 3; k++) { lo3[k] = Math.min(lo3[k], p[k] - 2); hi3[k] = Math.max(hi3[k], p[k] + 2); } }
  const all = field.poresIn(lo3, hi3).map((pore) => { const [px, py] = dom.chartOf(pore.centre); const { p, n } = dom.map(px, py); const d = field.discOf(pore, p, n); if (!d) return { a: 0 }; const [cx, cy] = dom.chartOf(d.centre); return { pore: { ...pore, R: d.rho, D: 2 * d.rho }, cx, cy, a: d.a }; })
    .filter((q) => q.a === 1 && q.cx > x0 && q.cx < x1 && q.cy > y0 && q.cy < y1);
  let thinnest = Infinity, merged = 0, pairs = 0;
  const walls = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const A = all[i], Bq = all[j];
    const d = Math.hypot(A.cx - Bq.cx, A.cy - Bq.cy);
    if (d > (A.pore.R + Bq.pore.R) * 1.6 || d < 1e-9) continue;
    /* adjacent: no third pore's centre nearer the segment's middle than either end's radius */
    pairs++;
    const steps = Math.ceil(d / 0.002);
    let run = 0, best = 0, inA = true;
    for (let s = 0; s <= steps; s++) {
      const x = A.cx + ((Bq.cx - A.cx) * s) / steps, y = A.cy + ((Bq.cy - A.cy) * s) / steps;
      const { p, n } = dom.map(x, y);
      const f = field.F(p, n);
      if (f >= level) { run += d / steps; if (run > best) best = run; } else run = 0;
      void inA;
    }
    if (best === 0) merged++; else { walls.push(best); if (best < thinnest) thinnest = best; }
  }
  walls.sort((a, b) => a - b);
  return { pairs, merged, thinnestMm: Number.isFinite(thinnest) ? thinnest : null, p10Mm: walls.length ? walls[Math.floor(walls.length * 0.1)] : null, medianMm: walls.length ? walls[Math.floor(walls.length / 2)] : null };
}

/* ---------------------------------------------------------------- CLI --- */
const IS_CLI = typeof process !== 'undefined' && process.argv && process.argv[1] && (await import('node:url')).fileURLToPath(import.meta.url) === (await import('node:path')).resolve(process.argv[1]);
if (IS_CLI) {
  const fs = await import('node:fs');
  const args = process.argv.slice(2);
  const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const size = Number(arg('--size', 8));
  const params = B.bone2Params({ textureHeight: Number(arg('--H', 0.4)), bonePoreSize: Number(arg('--D', 0.5)), boneBandRatio: Number(arg('--spread', 3)) });
  const dom = arg('--domain', 'plate') === 'cylinder' ? cylinderDomain(6) : plateDomain();
  const field = B.bone2Field(params);
  const win = { x0: 10, x1: 10 + size, y0: -size / 2, y1: size / 2 };
  const res = {};
  const rings = meshPatch('rings', dom, field, params, win);
  res['rings-lean'] = meshPatch('rings', dom, field, params, win, { layout: 'lean' });
  /* grid= : the edge whose grid spends the rings' count on the window */
  /* grid= : the bisection level (0.4 / 2^k) whose count is nearest the rings' */
  let eq = null, best = Infinity;
  for (let k = 1; k <= 4; k++) { const e = 0.4 / 2 ** k * 1.0001; const M = meshPatch('grid=', dom, field, params, win, { edge: e }); const d = Math.abs(Math.log(M.trisPerMm2 / rings.trisPerMm2)); if (d < best) { best = d; eq = e; } }
  for (const m of ['lattice', 'grid', 'grid=']) res[m] = meshPatch(m, dom, field, params, win, { edge: eq });
  res.rings = rings;
  const report = { params, domain: dom.name, window: win, edges: { grid: B.bone2GridEdgeMm(params), gridEq: eq, network: B.bone2NetworkEdgeMm(params) }, wall: wallThickness(dom, field, params, win), methods: {}, poresPerMm2: rings.ringPores / ((win.x1 - win.x0 + 2 * params.Dmax * 1.3) * (win.y1 - win.y0 + 2 * params.Dmax * 1.3)) };
  for (const [m, M] of Object.entries(res)) {
    const rr = poreRoundness(M, dom, field, params, win);
    const med = (k) => { const v = rr.map((q) => q[k]).filter((x) => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const mx = (k) => { const v = rr.map((q) => q[k]).filter((x) => x !== null); return v.length ? Math.max(...v) : null; };
    report.methods[m] = { tris: M.tri.length / 3, trisPerMm2: +M.trisPerMm2.toFixed(1), ms: +M.ms.toFixed(1), msPerMm2: +M.msPerMm2.toFixed(3), edge: M.eUsed, ringPores: M.ringPores, nested: M.nested, pores: rr.length, edgesMedian: med('edges'), devPctMedian: med('devPct'), devPctMax: mx('devPct'), depthOverDiamMedian: rr.length ? rr.map((q) => q.depthMm / q.diameterMm).sort((a, b) => a - b)[Math.floor(rr.length / 2)] : null, perPore: args.includes('--per-pore') ? rr : undefined };
    if (!args.includes('--quiet')) console.log(`${m.padEnd(8)} ${String(report.methods[m].tris).padStart(8)} tris  ${report.methods[m].trisPerMm2.toString().padStart(8)}/mm2  ${report.methods[m].ms.toString().padStart(8)} ms  edge ${M.eUsed === null ? '0.4 lattice' : M.eUsed.toFixed(4)}  pores ${rr.length}  edges/circ ${report.methods[m].edgesMedian}  dev ${report.methods[m].devPctMedian?.toFixed(1)}% (max ${report.methods[m].devPctMax?.toFixed(1)}%)  depth/diam ${report.methods[m].depthOverDiamMedian?.toFixed(2)}`);
  }
  if (!args.includes('--quiet')) console.log('wall', report.wall, 'edges', report.edges, 'pores/mm2', report.poresPerMm2.toFixed(2));
  if (arg('--json', null)) fs.writeFileSync(arg('--json'), JSON.stringify(report, null, 1));
}
