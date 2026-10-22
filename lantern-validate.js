/* lantern-validate.js — the manufacturability judge of a facet's cut pattern
   (lantern-design-doc.md §4, "validity"). Pure, raster: the half-facet is
   drawn as PAPER (1) and VOID (0) at `RES` mm a pixel — void beyond the rim
   edge, void wherever a cut is, paper everywhere else (the ridge, the valley
   line and the base continue into the rest of the sheet, so they are NOT
   boundaries here) — and four questions are asked of the picture:

     islands   paper not reachable from the spine by a flood fill — a piece
               that falls out when the cuts are weeded.
     thin      paper thinner than the bridge width: the opening (erode then
               dilate by bridge/2) loses it. Reported as components with their
               area, ignoring slivers under MIN_FLAG_AREA.
     narrow    a cut narrower than the rule for its kind (a stroke under
               minCut, a solid under minHole): the opening of the CUT loses it.
     keepout   cut pixels inside the spine band, the valley keep-out or the
               rim margin.

   `autoBridge` repairs an island by carving a strip of paper, `bridge` wide,
   from the island to the nearest main paper through the cut, and re-traces
   the cuts that strip crossed from the raster (marching squares, then
   Ramer–Douglas–Peucker at a quarter pixel). Everything else stays vector. */

export const RES = 0.25;            // mm per pixel
export const MIN_FLAG_AREA = 0.6;   // mm² — a thin or narrow component under this is a raster sliver, not a finding

/* ---- raster ---------------------------------------------------------------- */
function rasterPolys(polys, W, H, ox, oy, set, buf) {
  // scanline even-odd fill of each polygon into buf (Uint8Array W×H): set(index)
  for (const poly of polys) {
    let y0 = Infinity, y1 = -Infinity; for (const p of poly) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const r0 = Math.max(0, Math.floor((y0 - oy) / RES)), r1 = Math.min(H - 1, Math.ceil((y1 - oy) / RES));
    const xs = [];
    for (let r = r0; r <= r1; r++) {
      const y = oy + (r + 0.5) * RES; xs.length = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])); }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) { const c0 = Math.max(0, Math.ceil((xs[k] - ox) / RES - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] - ox) / RES - 0.5)); for (let c = c0; c <= c1; c++) set(r * W + c, buf); }
    }
  }
}
/* chamfer 3-4 distance transform: the distance (in px) of every pixel to the nearest pixel where `zero` is true */
function distanceTransform(zero, W, H) {
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = zero[i] ? 0 : INF;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const i = r * W + c; if (!d[i]) continue; let m = d[i]; if (c) m = Math.min(m, d[i - 1] + 3); if (r) { m = Math.min(m, d[i - W] + 3); if (c) m = Math.min(m, d[i - W - 1] + 4); if (c < W - 1) m = Math.min(m, d[i - W + 1] + 4); } d[i] = m; }
  for (let r = H - 1; r >= 0; r--) for (let c = W - 1; c >= 0; c--) { const i = r * W + c; if (!d[i]) continue; let m = d[i]; if (c < W - 1) m = Math.min(m, d[i + 1] + 3); if (r < H - 1) { m = Math.min(m, d[i + W] + 3); if (c < W - 1) m = Math.min(m, d[i + W + 1] + 4); if (c) m = Math.min(m, d[i + W - 1] + 4); } d[i] = m; }
  for (let i = 0; i < W * H; i++) d[i] /= 3;
  return d;
}
/* morphological opening of a mask by radius r px: pixels of the mask that lie within r of some pixel at distance > r from the mask's complement */
function opening(mask, W, H, r) {
  const notMask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) notMask[i] = mask[i] ? 0 : 1;
  const d1 = distanceTransform(notMask, W, H);
  const eroded = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) eroded[i] = d1[i] > r ? 1 : 0;
  const d2 = distanceTransform(eroded, W, H);
  const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = mask[i] && d2[i] <= r ? 1 : 0;
  return out;
}
function components(mask, W, H) {
  const label = new Int32Array(W * H).fill(-1); const comps = []; const stack = [];
  for (let s = 0; s < W * H; s++) { if (!mask[s] || label[s] >= 0) continue; const id = comps.length; const comp = { id, n: 0, sx: 0, sy: 0, minR: 1e9, maxR: -1, minC: 1e9, maxC: -1 }; comps.push(comp); label[s] = id; stack.push(s);
    while (stack.length) { const i = stack.pop(); const r = (i / W) | 0, c = i % W; comp.n++; comp.sx += c; comp.sy += r; comp.minR = Math.min(comp.minR, r); comp.maxR = Math.max(comp.maxR, r); comp.minC = Math.min(comp.minC, c); comp.maxC = Math.max(comp.maxC, c);
      if (c && mask[i - 1] && label[i - 1] < 0) { label[i - 1] = id; stack.push(i - 1); } if (c < W - 1 && mask[i + 1] && label[i + 1] < 0) { label[i + 1] = id; stack.push(i + 1); } if (r && mask[i - W] && label[i - W] < 0) { label[i - W] = id; stack.push(i - W); } if (r < H - 1 && mask[i + W] && label[i + W] < 0) { label[i + W] = id; stack.push(i + W); } }
  }
  return { label, comps };
}

/* ---- the judge -------------------------------------------------------------- */
/* `facet`: the geometry's facet type (edge polyline, angle a). `cuts`: the
   tagged cuts [{ poly, kind: 'stroke'|'solid' }] in facet mm. `R`: the rules. */
export function validateFacet(facet, cuts, R, { field = null } = {}) {
  const edge = facet.edge.pts, a = facet.a, tanA = Math.tan(a);
  const xT = edge[0][0];
  let yMax = 0; for (const p of edge) yMax = Math.max(yMax, p[1]);
  const ox = -R.spine, oy = -2 * RES, W = Math.ceil((xT + R.spine) / RES) + 2, H = Math.ceil((yMax + 2 * RES) / RES) + 2;
  // rim y at x (the edge is walked once into a per-column table)
  const rimCol = new Float32Array(W).fill(Infinity);
  for (let i = 1; i < edge.length; i++) { const p = edge[i - 1], q = edge[i]; const c0 = Math.floor((Math.min(p[0], q[0]) - ox) / RES), c1 = Math.ceil((Math.max(p[0], q[0]) - ox) / RES); for (let c = Math.max(0, c0); c <= Math.min(W - 1, c1); c++) { const x = ox + (c + 0.5) * RES; if ((x - p[0]) * (x - q[0]) <= 0) { const u = q[0] === p[0] ? 0 : (x - p[0]) / (q[0] - p[0]); rimCol[c] = Math.min(rimCol[c], p[1] + (q[1] - p[1]) * u); } } }
  for (let c = 0; c < W; c++) { const x = ox + (c + 0.5) * RES; if (x > xT) rimCol[c] = -Infinity; if (x < edge[edge.length - 1][0] && rimCol[c] === Infinity) rimCol[c] = Infinity; }
  const paper = new Uint8Array(W * H).fill(1), voidMask = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) { const y = oy + (r + 0.5) * RES; for (let c = 0; c < W; c++) if (y > rimCol[c]) { paper[r * W + c] = 0; voidMask[r * W + c] = 1; } }
  const cutMask = new Uint8Array(W * H), strokeMask = new Uint8Array(W * H), solidMask = new Uint8Array(W * H);
  rasterPolys(cuts.filter((k) => k.kind === 'stroke').map((k) => k.poly), W, H, ox, oy, (i, b) => { b[i] = 1; }, strokeMask);
  rasterPolys(cuts.filter((k) => k.kind !== 'stroke').map((k) => k.poly), W, H, ox, oy, (i, b) => { b[i] = 1; }, solidMask);
  for (let i = 0; i < W * H; i++) { if (strokeMask[i] || solidMask[i]) { cutMask[i] = 1; paper[i] = 0; } }
  const px = (mm) => mm / RES;
  const toMm = (comp) => [ox + (comp.sx / comp.n + 0.5) * RES, oy + (comp.sy / comp.n + 0.5) * RES];
  const issues = [];
  // islands: flood from the spine (every column at y ≈ 0 is paper by the spine rule)
  const reach = new Uint8Array(W * H); const stack = [];
  const r0 = Math.round((0 - oy) / RES); for (let c = 0; c < W; c++) { const i = r0 * W + c; if (paper[i]) { reach[i] = 1; stack.push(i); } }
  while (stack.length) { const i = stack.pop(); const r = (i / W) | 0, c = i % W; const nb = [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r ? i - W : -1, r < H - 1 ? i + W : -1]; for (const j of nb) if (j >= 0 && paper[j] && !reach[j]) { reach[j] = 1; stack.push(j); } }
  const islandMask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) islandMask[i] = paper[i] && !reach[i] ? 1 : 0;
  const isl = components(islandMask, W, H);
  for (const comp of isl.comps) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue; const at = toMm(comp); issues.push({ kind: 'island', at, areaMm2: area, r: Math.sqrt(area / Math.PI) + 1, text: `an island of ${area.toFixed(1)} mm² — paper with no bridge to the sheet: it falls out when the cuts are weeded` }); }
  // thin paper
  const opened = opening(paper, W, H, px(R.bridge) / 2);
  const thin = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) thin[i] = paper[i] && !opened[i] ? 1 : 0;
  const th = components(thin, W, H);
  for (const comp of th.comps) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue; const at = toMm(comp); issues.push({ kind: 'thin', at, areaMm2: area, r: Math.max(2, (comp.maxC - comp.minC) * RES / 2), text: `paper thinner than the ${R.bridge} mm bridge over ${area.toFixed(1)} mm²` }); }
  // narrow cuts, per kind
  for (const [mask, floor, word] of [[strokeMask, R.minCut, 'stroke'], [solidMask, R.minHole, 'hole']]) {
    const op = opening(mask, W, H, px(floor - RES) / 2);   // one pixel of grace: a cut AT the floor rasterises 3 or 4 px wide depending on where it falls, and the judge must not flag its own sampling
    const nar = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) nar[i] = mask[i] && !op[i] ? 1 : 0;
    const comps = components(nar, W, H).comps;
    for (const comp of comps) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue; issues.push({ kind: 'narrow', at: toMm(comp), areaMm2: area, r: 2, text: `a ${word} narrower than ${floor} mm over ${area.toFixed(1)} mm²` }); }
  }
  // keep-outs
  const dVoid = distanceTransform(voidMask, W, H);
  const ko = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const i = r * W + c; if (!cutMask[i]) continue; const x = ox + (c + 0.5) * RES, y = oy + (r + 0.5) * RES; const spine = y < R.spine / 2 - RES, valley = (x * tanA - y) * Math.cos(a) < R.foldKeepout - RES, rim = dVoid[i] * RES < R.rimMargin - RES; if (spine || valley || rim) ko[i] = 1; }
  for (const comp of components(ko, W, H).comps) { const area = comp.n * RES * RES; if (area < MIN_FLAG_AREA) continue; issues.push({ kind: 'keepout', at: toMm(comp), areaMm2: area, r: 2.5, text: `a cut inside a keep-out (spine, fold or rim margin) over ${area.toFixed(1)} mm²` }); }
  return { issues, raster: { W, H, ox, oy, paper, cutMask, strokeMask, solidMask, islandLabel: isl.label, reach }, counts: { island: issues.filter((i) => i.kind === 'island').length, thin: issues.filter((i) => i.kind === 'thin').length, narrow: issues.filter((i) => i.kind === 'narrow').length, keepout: issues.filter((i) => i.kind === 'keepout').length } };
}

/* ---- auto-bridge ------------------------------------------------------------- */
/* Repairs islands at the ELEMENT level, so every cut stays the vector it was
   drawn as: for each island the shortest route through cut pixels to paper that
   reaches the spine is found, the element whose cut it crosses is identified,
   and that element is SPLIT there if it is a stroke (its centreline cut into
   two, `bridge` plus its own width apart) or DROPPED if it is not (a ring's
   arc or a dot — a loop arc removed opens the ring; a dot cannot hold an
   island). `cutsOf(e)` turns an element into its polygons. Returns the new
   element list and how many bridges were made. */
export function autoBridgeElements(facet, placed, R, cutsOf) {
  const tagged = []; placed.forEach((e, i) => { for (const poly of cutsOf(e)) if (poly && poly.length >= 3) tagged.push({ poly, kind: e.kind === 'stroke' || e.arc ? 'stroke' : 'solid', elem: i }); });
  const v = validateFacet(facet, tagged, R);
  if (!v.issues.some((i) => i.kind === 'island')) return { placed, bridged: 0 };
  const { W, H, ox, oy, paper, cutMask, reach } = v.raster;
  const idMap = new Int32Array(W * H).fill(-1);
  tagged.forEach((k, idx) => rasterPolys([k.poly], W, H, ox, oy, (i, b) => { b[i] = idx; }, idMap));
  const isl = components(new Uint8Array(W * H).map((_, i) => (paper[i] && !reach[i] ? 1 : 0)), W, H);
  const edits = new Map();   // elem index -> [{ at: [x, y] }]
  for (const comp of isl.comps) {
    if (comp.n * RES * RES < MIN_FLAG_AREA) continue;
    const prev = new Int32Array(W * H).fill(-2); const q = [];
    for (let i = 0; i < W * H; i++) if (isl.label[i] === comp.id) { prev[i] = -1; q.push(i); }
    let hit = -1, head = 0;
    while (head < q.length && hit < 0) { const i = q[head++]; const r = (i / W) | 0, c = i % W; for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r ? i - W : -1, r < H - 1 ? i + W : -1]) { if (j < 0 || prev[j] !== -2) continue; if (paper[j] && reach[j]) { prev[j] = i; hit = j; break; } if (cutMask[j]) { prev[j] = i; q.push(j); } } }
    if (hit < 0) continue;
    // the cut pixels along the route, and which tagged cut each belongs to: the crossing is the majority owner
    const route = []; for (let i = prev[hit]; i >= 0 && prev[i] !== -1; i = prev[i]) if (cutMask[i]) route.push(i);
    if (!route.length) continue;
    const votes = new Map(); for (const i of route) if (idMap[i] >= 0) votes.set(idMap[i], (votes.get(idMap[i]) || 0) + 1);
    let best = -1, bn = 0; for (const [k, n] of votes) if (n > bn) { bn = n; best = k; }
    if (best < 0) continue;
    const mid = route[route.length >> 1];
    const at = [ox + ((mid % W) + 0.5) * RES, oy + (((mid / W) | 0) + 0.5) * RES];
    const elem = tagged[best].elem;
    if (!edits.has(elem)) edits.set(elem, []);
    edits.get(elem).push({ at });
  }
  if (!edits.size) return { placed, bridged: 0 };
  const out = []; let bridged = 0;
  placed.forEach((e, i) => {
    const ed = edits.get(i);
    if (!ed) { out.push(e); return; }
    if (e.kind !== 'stroke' || !e.line || e.line.length < 2) { bridged += ed.length; return; }   // dropped
    // split the centreline: remove the stretch within (bridge/2 + hw) of each crossing, measured along the line
    const n = e.line.length, hwAt = (u) => (typeof e.hw === 'function' ? e.hw(u) : e.hw);
    const cum = [0]; for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(e.line[k][0] - e.line[k - 1][0], e.line[k][1] - e.line[k - 1][1]));
    const total = cum[n - 1] || 1;
    const drop = new Uint8Array(n);
    for (const { at } of ed) {
      let kb = 0, bd = Infinity; for (let k = 0; k < n; k++) { const d = Math.hypot(e.line[k][0] - at[0], e.line[k][1] - at[1]); if (d < bd) { bd = d; kb = k; } }
      const span = R.bridge / 2 + hwAt(kb / (n - 1)) + RES;
      for (let k = 0; k < n; k++) if (Math.abs(cum[k] - cum[kb]) <= span) drop[k] = 1;
      bridged++;
    }
    let k = 0;
    while (k < n) {
      while (k < n && drop[k]) k++;
      const k0 = k; while (k < n && !drop[k]) k++;
      if (k - k0 >= 2 && cum[k - 1] - cum[k0] >= R.minCut * 2) { const u0 = k0 / (n - 1), u1 = (k - 1) / (n - 1); out.push({ ...e, line: e.line.slice(k0, k), hw: (u) => hwAt(u0 + (u1 - u0) * u), discs: undefined, split: true }); }
    }
  });
  return { placed: out, bridged };
}
