// knit-lab-analysis.js — what the page and tools/verify-knit-lab.mjs read off a run. Pure: no DOM,
// no simulator state beyond the arrays handed in.
//
//   legLinks    the knit's TOPOLOGY, measured on the yarn: which loops each loop's legs pass through
//   findJam     where the load-extension curve stops being soft
//   cycleStats  hysteresis and permanent set of a load-unload cycle
//   holes       the largest openings in the fabric, by height band

// ---- topology: does each leg of each loop pass through the loop(s) it was pulled through? -----
// Linking numbers are integers and cannot change unless one yarn passes through another, so this
// is the check that the drawn knit IS the charted knit, and that it still is after relaxing and
// pulling. A whole child loop and its parent are NOT linked (the two legs pierce the parent in
// opposite senses and cancel), so each HALF of the child — foot to head apex — is closed far
// behind the fabric (z = -60, out past every yarn) and linked with the parent loop closed by the
// chord between its feet. Plain knit: each half links its parent once; a k2tog's halves each link
// both parents; a yarn over's link nothing below.
// The closure is only harmless where it runs clear of the parent: if the half's foot or apex lies
// INSIDE the parent's outline seen face-on, the closure itself pierces the parent and the count
// means nothing, so that pair is reported UNDETERMINED rather than counted. On the drawn start
// that never happens; on a relaxed swatch it does (loops overlap in plan), which is why the
// topology after the start rests on the pass-through certificate, not on this.
export function linking(A, B) {        // Gauss linking number of two closed polylines, exact per segment pair
  let lk = 0;
  for (let i = 0; i < A.length; i++) {
    const p1 = A[i], p2 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      const p3 = B[j], p4 = B[(j + 1) % B.length];
      const r13 = sub(p3, p1), r14 = sub(p4, p1), r23 = sub(p3, p2), r24 = sub(p4, p2);
      const n1 = unit(cross(r13, r14)), n2 = unit(cross(r14, r24)), n3 = unit(cross(r24, r23)), n4 = unit(cross(r23, r13));
      const om = asin(dot(n1, n2)) + asin(dot(n2, n3)) + asin(dot(n3, n4)) + asin(dot(n4, n1));
      lk += om * Math.sign(dot(cross(sub(p4, p3), sub(p2, p1)), r13));
    }
  }
  return lk / (4 * Math.PI);
}
function inPlan(p, ring) {            // is p inside the ring's outline in (x, y), the ring closed by its foot chord
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = v => { const l = Math.hypot(v[0], v[1], v[2]); return l > 1e-15 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0]; };
const asin = x => Math.asin(x < -1 ? -1 : x > 1 ? 1 : x);

// x: Float64Array of points; loopOf / uOf: per point, its loop id and loop parameter (from
// buildYarn). Returns { rows: [{ id, kind, through, links: {parentId: [left, right]} }], bad: [...] }.
export function legLinks(topo, x, loopOf, uOf, courses = null) {
  const pts = new Map();
  for (let i = 0; i < loopOf.length; i++) if (loopOf[i] >= 0) { let a = pts.get(loopOf[i]); if (!a) pts.set(loopOf[i], a = []); a.push([x[3 * i], x[3 * i + 1], x[3 * i + 2], uOf[i]]); }
  const P = id => (pts.get(id) || []).slice().sort((a, b) => a[3] - b[3]);
  const close = h => [...h, [h.at(-1)[0], h.at(-1)[1], -60], [h[0][0], h[0][1], -60]];
  const rows = [], bad = [];
  const cs = courses || topo.rows.map((_, c) => c).slice(1);
  for (const c of cs) for (const id of topo.rows[c]) {
    const l = topo.loops[id], L = P(id);
    const halves = [L.filter(p => p[3] <= 0.5), L.filter(p => p[3] >= 0.5).reverse()].map(close);
    const links = {}; let undetermined = 0;
    for (const pid of topo.rows[c - 1]) {
      const ring = P(pid); if (ring.length < 3) continue;
      if (halves.some(h => inPlan(h[0], ring) || inPlan(h[h.length - 3], ring))) { undetermined++; if (l.through.includes(pid)) links[pid] = null; continue; }
      const v = halves.map(h => Math.round(linking(h, ring)));
      if (v[0] || v[1]) links[pid] = v;
    }
    const want = new Set(l.through), got = Object.keys(links).map(Number);
    const ok = got.length === want.size && got.every(p => want.has(p) && (links[p] === null || (Math.abs(links[p][0]) === 1 && links[p][0] === links[p][1])));
    if (!ok) bad.push(`${l.kind} loop ${id} (course ${c}) should pass through [${l.through}] with both legs; measured ${JSON.stringify(links)}`);
    rows.push({ id, kind: l.kind, through: l.through, links, undetermined });
  }
  return { rows, bad, undetermined: rows.reduce((a, r) => a + r.undetermined, 0), pairs: rows.length };
}

// ---- the curve ----------------------------------------------------------------------------------
// rows: one per frame, { ext, load, phase } with phase 'pulling' while loading and 'unloading' /
// 'returned' after. Loads are the bottom jaw's (the load cell), extensions fractions of the rest
// gap. Everything below is read off the loading rows binned to 1% of extension.
export const JAM_RATIO = 10;          // the jam: where the tangent stiffness first reaches this many
                                      // times the stiffness of the soft region (0-10%)
export function bin(rows, step = 0.01) {
  const m = new Map();
  for (const r of rows) { const k = Math.round(r.ext / step); const a = m.get(k) || { n: 0, load: 0 }; a.n++; a.load += r.load; m.set(k, a); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, a]) => ({ ext: k * step, load: a.load / a.n }));
}
const slope = pts => { const n = pts.length; if (n < 2) return NaN; const mx = pts.reduce((a, p) => a + p.ext, 0) / n, my = pts.reduce((a, p) => a + p.load, 0) / n; let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.ext - mx) * (p.load - my); sxx += (p.ext - mx) ** 2; } return sxy / sxx; };
export function findJam(rows, ratio = JAM_RATIO) {
  const b = bin(rows.filter(r => r.phase === 'pulling'));
  const soft = slope(b.filter(p => p.ext >= 0.005 && p.ext <= 0.10));
  for (let i = 0; i + 2 < b.length; i++) {
    const k = slope(b.slice(i, i + 3));
    if (b[i].ext > 0.10 && k >= ratio * soft) return { ext: b[i + 1].ext, load: b[i + 1].load, soft, stiffness: k, bins: b };
  }
  return { ext: NaN, load: NaN, soft, stiffness: NaN, bins: b };
}

// Hysteresis: the work done loading minus the work given back unloading (load x jaw travel, in
// load·d), and that as a fraction of the loading work. Permanent set: how much further the
// unloading curve sits than the loading curve at the same small load — the extension where each
// first carries SET_LOAD (2% of the peak, above the preload): a residual extension at a reference
// load, as an elastic-recovery test reads it. (The extension where unloading reaches zero load is
// not used: both curves are nearly flat there, so the answer is whatever the noise says.)
export const SET_LOAD = 0.02;
export function cycleStats(rows, restHeight, ref = SET_LOAD) {
  const load = rows.filter(r => r.phase === 'pulling'), un = rows.filter(r => r.phase === 'unloading' || r.phase === 'returned');
  const work = rs => { let w = 0; for (let i = 1; i < rs.length; i++) w += 0.5 * (rs[i].load + rs[i - 1].load) * (rs[i].ext - rs[i - 1].ext) * restHeight; return w; };
  const wLoad = work(load), wUn = -work(un);
  const lb = bin(load), ub = bin(un);
  const peak = Math.max(...lb.map(p => p.load));
  const L0 = lb.find(p => p.ext >= 0)?.load ?? 0, thr = L0 + ref * peak;
  const up = lb.find(p => p.load >= thr)?.ext ?? NaN;                 // loading: first bin at the reference load
  let down = NaN; for (let i = ub.length - 1; i >= 0; i--) if (ub[i].load <= thr) { down = ub[i].ext; break; }   // unloading, from the top
  return { workLoad: wLoad, workUnload: wUn, hysteresis: wLoad - wUn, lossFraction: (wLoad - wUn) / wLoad, set: down - up, setLoad: thr, setAtLoading: up, setAtUnloading: down, peak, preload: L0 };
}

// ---- holes: openings in the fabric seen face-on -------------------------------------------------
// The yarn is drawn as a band one diameter wide in (x, y) on a grid of `res` d; empty cells not
// connected to the outside are openings. Each opening reports its area (d²), its INSCRIBED radius
// (the largest disc that fits, from an exact Euclidean distance transform; the radius a stitch
// marker could pass through) and its centre. Jersey has small openings between its loops too, so
// an eyelet is read as an opening much larger than any the same swatch has elsewhere.
export function holes(x, n, d = 1, res = 0.1) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const a = x[3 * i], b = x[3 * i + 1]; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
  x0 -= 2 * d; y0 -= 2 * d; x1 += 2 * d; y1 += 2 * d;
  const W = Math.ceil((x1 - x0) / res), H = Math.ceil((y1 - y0) / res), full = new Uint8Array(W * H), r = d / 2, rc = Math.ceil(r / res) + 1;
  for (let i = 0; i + 1 < n; i++) {                   // stamp each segment as a capsule
    const ax = x[3 * i], ay = x[3 * i + 1], bx = x[3 * i + 3], by = x[3 * i + 4], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1;
    const gx0 = Math.max(0, Math.floor((Math.min(ax, bx) - x0) / res) - rc), gx1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) - x0) / res) + rc);
    const gy0 = Math.max(0, Math.floor((Math.min(ay, by) - y0) / res) - rc), gy1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) - y0) / res) + rc);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const px = x0 + (gx + 0.5) * res, py = y0 + (gy + 0.5) * res;
      let t = ((px - ax) * ex + (py - ay) * ey) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - ax - t * ex, dy = py - ay - t * ey;
      if (dx * dx + dy * dy <= r * r) full[gy * W + gx] = 1;
    }
  }
  // label the empty cells; the component touching the border is the outside
  const lab = new Int32Array(W * H).fill(-1), comps = [], stack = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (full[s0] || lab[s0] >= 0) continue;
    const id = comps.length, c = { cells: [], border: false };
    lab[s0] = id; stack.push(s0);
    while (stack.length) {
      const s = stack.pop(), gx = s % W, gy = (s - gx) / W; c.cells.push(s);
      if (gx === 0 || gy === 0 || gx === W - 1 || gy === H - 1) c.border = true;
      for (const t of [s - 1, s + 1, s - W, s + W]) if (t >= 0 && t < W * H && !full[t] && lab[t] < 0 && Math.abs((t % W) - gx) <= 1) { lab[t] = id; stack.push(t); }
    }
    comps.push(c);
  }
  const dist = edt(full, W, H);                       // squared distance (cells) to the nearest yarn cell
  const out = [];
  for (const c of comps) {
    if (c.border) continue;
    let best = 0, bx = 0, by = 0, sx = 0, sy = 0;
    for (const s of c.cells) { const gx = s % W, gy = (s - gx) / W; sx += gx; sy += gy; if (dist[s] > best) { best = dist[s]; bx = gx; by = gy; } }
    out.push({ area: c.cells.length * res * res, r: Math.sqrt(best) * res, x: x0 + (bx + 0.5) * res, y: y0 + (by + 0.5) * res, cx: x0 + (sx / c.cells.length + 0.5) * res, cy: y0 + (sy / c.cells.length + 0.5) * res });
  }
  return out.sort((a, b) => b.r - a.r);
}
// exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), to the nearest set cell
function edt(full, W, H) {
  const INF = 1e20, f = new Float64Array(Math.max(W, H)), out = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = full[i] ? 0 : INF;
  const pass = (get, set, len) => {
    for (let q = 0; q < len; q++) f[q] = get(q);
    const v = new Int32Array(len), z = new Float64Array(len + 1); let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; set(q, (q - v[k]) * (q - v[k]) + f[v[k]]); }
  };
  for (let x = 0; x < W; x++) pass(q => out[q * W + x], (q, val) => { out[q * W + x] = val; }, H);
  for (let y = 0; y < H; y++) pass(q => out[y * W + q], (q, val) => { out[y * W + q] = val; }, W);
  return out;
}

// The openings in the band of one course: centres between the mean heights of the courses either side.
export function holesInCourse(hs, x, course, n, c) {
  const my = cc => { let s = 0, k = 0; for (let i = 0; i < n; i++) if (course[i] === cc) { s += x[3 * i + 1]; k++; } return s / k; };
  const lo = my(c - 1), hi = my(c + 1);
  return hs.filter(h => h.y > lo && h.y < hi);
}
