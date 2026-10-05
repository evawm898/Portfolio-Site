/* ===================================================================
   bloom-inflo-approach.mjs — THE INFLORESCENCE'S FOUR APPROACHES (the
   inflorescence node-laws session, Eva's ruling 1 restated Oct 3: "the
   combination grid rebuilt with its join exclusions").

   WHAT IT MEASURES: the NEAREST APPROACH IN MILLIMETRES between two parts of
   one raceme that must not meet, on the EMITTED triangles of one EXPORT build,
   in the combination gate's own unit against its own bar (`MIN_FEATURE_MM`,
   which this file never restates — the gate owns the bar). Four measures,
   one engine:

     floret-floret   every floret's own vertices against every OTHER floret's
                     triangles — two heads, or a head and a neighbour's pedicel
     floret-head     every floret's own vertices against the TERMINAL HEAD's
                     triangles (the petals and the hub, `[0, hubTriEnd)`, the
                     builder's own declared index — never re-derived)
     floret-stem     every STALKED floret's own vertices, its own pedicel rod
                     excluded, against the free rachis solid through the
                     geometry's own `freeStemDistanceMm` (the gate's
                     `leaf-stem` measure's own owner)
     leaf-floret     every subtending LEAF's vertices against every floret's
                     triangles, its PEDICEL included — the shared node's own
                     approach (ruling 5's "leaf x pedicel", with the floret it
                     carries)

   THE INTENDED JOINS ARE EXCLUDED BY CONSTRUCTION, NAMED, AND NEVER DECLARED
   AS A FAILING MAGNITUDE (the brief, verbatim: "excluded by construction with
   the reason recorded, not declared as a failing magnitude"):
     * A FLORET AND ITS OWN PEDICEL are one build (the pedicel IS the floret's
       stem), so no floret is ever measured against its own block — the pair
       is never formed, which is the construction.
     * THE PEDICEL-TO-RACHIS JOIN, AND THE PETIOLE-TO-RACHIS ONE, live inside
       the rachis's own solid by design (rooted at the wall's mid-thickness,
       reaching back to the bore). Every part there is FUSED TO THE RACHIS, so
       a contact inside it is over-connection by construction — the crowding
       ruling's own grounds (Eva, Sep 3) — and two pedicels of a whorled node
       overlap there on every whorled row. So vertices STRICTLY INSIDE the
       free rachis's own solid (`freeStemDistanceMm === 0`, the geometry's
       answer) are not measured by floret-floret and leaf-floret. This is a
       REGION and that is said plainly: it is the one region where the design
       puts every part into one solid, and a petal driven INTO it is
       floret-stem's to report, which does not exclude it.
     * floret-stem EXCLUDES THE FLORET'S OWN PEDICEL ROD by the builder's
       emitted `pedicelAxis` (ST9's remedy: name the rod, never widen the
       region), and EXCLUDES SESSILE FLORETS WHOLE: a sessile floret's hub IS
       its join with the rachis (ruling 7, rooted one wall deep), so its
       approach to the rachis is 0 by the root law and the measure says so in
       its record rather than reading it as a hazard.

   THE CROSSING IS PART OF THE MEASURE, because two closed solids that pass
   through each other have a vertex-to-surface distance that is POSITIVE —
   the vertex sits inside the other body, a millimetre from its skin. So any
   edge of one part that crosses a triangle of the other reads 0, which is
   what an interpenetration is. Both halves are reported (`crossings`).

   NAMES ITS SAMPLING (the durable mode-and-sampling rule): EXPORT mode, the
   emitted VERTICES of the measured side against the emitted TRIANGLES of the
   other, searched out to `SEARCH_CAP_MM` (a reading past it is reported AT
   the cap and says so — the bar is 1 mm, so a cap of 15 mm reports every
   number the bar can care about exactly and saturates only far beyond it).
   Each vertex position is measured ONCE (a triangle soup repeats every
   shared vertex about six times).
   =================================================================== */

export const SEARCH_CAP_MM = 15;
const CELL_MM = 3;

function closestOnTri(p, a, b, c) {
  /* Ericson, Real-Time Collision Detection §5.1.5 — the standard Voronoi-region walk. */
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w];
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/* Segment p-q against triangle a-b-c (Moller-Trumbore on the segment's own
   parameter): does the closed segment pass through the triangle's interior? */
function segHitsTri(p, q, a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < 1e-18) return false;
  const f = 1 / det;
  const s = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
  if (u < 0 || u > 1) return false;
  const qv = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = f * (d[0] * qv[0] + d[1] * qv[1] + d[2] * qv[2]);
  if (v < 0 || u + v > 1) return false;
  const t = f * (e2[0] * qv[0] + e2[1] * qv[1] + e2[2] * qv[2]);
  return t >= 0 && t <= 1;
}

/* A hash grid over a set of triangles, each tagged with an owner id. */
export function triGrid(P, ranges) {
  const cells = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  const tris = [];
  for (const { lo, hi, owner } of ranges) {
    for (let t = lo; t < hi; t += 9) {
      const a = [P[t], P[t + 1], P[t + 2]], b = [P[t + 3], P[t + 4], P[t + 5]], c = [P[t + 6], P[t + 7], P[t + 8]];
      const id = tris.length;
      tris.push({ a, b, c, owner });
      const mn = [0, 1, 2].map((x) => Math.floor(Math.min(a[x], b[x], c[x]) / CELL_MM));
      const mx = [0, 1, 2].map((x) => Math.floor(Math.max(a[x], b[x], c[x]) / CELL_MM));
      for (let i = mn[0]; i <= mx[0]; i++) for (let j = mn[1]; j <= mx[1]; j++) for (let k = mn[2]; k <= mx[2]; k++) {
        const kk = key(i, j, k);
        let l = cells.get(kk);
        if (!l) { l = []; cells.set(kk, l); }
        l.push(id);
      }
    }
  }
  /* EACH OWNER'S BOX, so a vertex whose distance to every other owner's box
     already exceeds the best reading so far is skipped without a search —
     a lower bound, so it can only skip what cannot win. */
  const boxes = new Map();
  for (const T of tris) {
    let b = boxes.get(T.owner);
    if (!b) { b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; boxes.set(T.owner, b); }
    for (const v of [T.a, T.b, T.c]) for (let x = 0; x < 3; x++) { if (v[x] < b[x]) b[x] = v[x]; if (v[x] > b[x + 3]) b[x + 3] = v[x]; }
  }
  return { cells, tris, key, boxes };
}

function boxLowerBound(grid, p, skipOwner) {
  let lb = Infinity;
  for (const [owner, b] of grid.boxes) {
    if (owner === skipOwner) continue;
    const dx = Math.max(b[0] - p[0], 0, p[0] - b[3]), dy = Math.max(b[1] - p[1], 0, p[1] - b[4]), dz = Math.max(b[2] - p[2], 0, p[2] - b[5]);
    const d = Math.hypot(dx, dy, dz);
    if (d < lb) lb = d;
  }
  return lb;
}

/* Nearest distance from point p to any triangle in the grid whose owner is
   not `skipOwner`, searched in growing shells out to SEARCH_CAP_MM. */
export function nearest(grid, p, skipOwner, best) {
  if (boxLowerBound(grid, p, skipOwner) >= best) return best;
  const ci = [0, 1, 2].map((x) => Math.floor(p[x] / CELL_MM));
  const maxR = Math.ceil(SEARCH_CAP_MM / CELL_MM);
  let d = best;
  for (let r = 0; r <= maxR; r++) {
    if ((r - 1) * CELL_MM > d) break;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
      if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
      const l = grid.cells.get(grid.key(ci[0] + i, ci[1] + j, ci[2] + k));
      if (!l) continue;
      for (const id of l) {
        const T = grid.tris[id];
        if (T.owner === skipOwner) continue;
        const q = closestOnTri(p, T.a, T.b, T.c);
        const dd = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        if (dd < d) d = dd;
      }
    }
  }
  return d;
}

/* Does any edge of a triangle in `src` (owner `own`) cross a triangle of
   the grid with a different owner? */
export function crosses(grid, P, lo, hi, own, keep) {
  for (let t = lo; t < hi; t += 9) {
    const v = [[P[t], P[t + 1], P[t + 2]], [P[t + 3], P[t + 4], P[t + 5]], [P[t + 6], P[t + 7], P[t + 8]]];
    for (let e = 0; e < 3; e++) {
      const p = v[e], q = v[(e + 1) % 3];
      if (keep && !keep(p) && !keep(q)) continue;
      const mn = [0, 1, 2].map((x) => Math.floor(Math.min(p[x], q[x]) / CELL_MM));
      const mx = [0, 1, 2].map((x) => Math.floor(Math.max(p[x], q[x]) / CELL_MM));
      for (let i = mn[0]; i <= mx[0]; i++) for (let j = mn[1]; j <= mx[1]; j++) for (let k = mn[2]; k <= mx[2]; k++) {
        const l = grid.cells.get(grid.key(i, j, k));
        if (!l) continue;
        for (const id of l) {
          const T = grid.tris[id];
          if (T.owner === own) continue;
          if (segHitsTri(p, q, T.a, T.b, T.c)) return true;
        }
      }
    }
  }
  return false;
}

function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = L2 > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2)) : 0;
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}

/* THE ONE ENTRY POINT. Builds the state once in EXPORT mode and answers the
   named measure off that build's own emitted stream and records. */
export function measureInfloApproachMm(G, state, measure) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const m = G.buildBloomInto(acc, state);
  const B = m.inflorescenceBuilt;
  if (!m.stem || !m.stem.present) return { mm: Infinity, why: 'no rachis is built' };
  if (!B || !B.count) return { mm: Infinity, why: 'no floret is built' };
  const P = acc.positions;
  const rachis = m.stem;
  /* inside the rachis's own solid: the joins' region (see the header) */
  const outsideRachis = (p) => G.freeStemDistanceMm(rachis, p[0], p[1], p[2]) > 0;
  const blocks = B.placed.map((q, k) => ({ lo: q.at, hi: q.at + q.tris * 9, owner: `floret${k}`, q }));
  const capped = (d) => (d >= SEARCH_CAP_MM ? SEARCH_CAP_MM : d);

  if (measure === 'floret-stem') {
    let best = Infinity, at = null, verts = 0, sessile = 0;
    for (const b of blocks) {
      if (b.q.sessile) { sessile++; continue; }
      const ax = b.q.pedicelAxis;
      for (let j = b.lo; j < b.hi; j += 3) {
        const p = [P[j], P[j + 1], P[j + 2]];
        if (ax && segDist(p, ax.inner, ax.outer) <= ax.radiusMm * (1 + 1e-6)) continue;   // its OWN rod, named
        verts++;
        const d = G.freeStemDistanceMm(rachis, p[0], p[1], p[2]);
        if (d < best) { best = d; at = { node: b.q.nodeIndex, azDeg: (b.q.az * 180) / Math.PI }; }
      }
    }
    if (!verts) return { mm: Infinity, why: sessile ? `every floret is SESSILE — its hub is its join with the rachis (ruling 7), excluded by construction` : 'no floret vertex off its own pedicel rod' };
    return { mm: best, at, verts, sessileExcluded: sessile };
  }

  if (measure === 'floret-floret' || measure === 'floret-head') {
    const head = measure === 'floret-head';
    const ranges = head ? [{ lo: 0, hi: m.hubTriEnd * 9, owner: 'head' }] : blocks.map(({ lo, hi, owner }) => ({ lo, hi, owner }));
    if (!head && blocks.length < 2) return { mm: Infinity, why: 'one floret — there is no other floret to approach' };
    const grid = triGrid(P, ranges);
    let best = SEARCH_CAP_MM, at = null, verts = 0, crossing = false;
    for (const b of blocks) {
      const seen = new Set();
      for (let j = b.lo; j < b.hi; j += 3) {
        const sk = `${P[j]},${P[j + 1]},${P[j + 2]}`;
        if (seen.has(sk)) continue;
        seen.add(sk);
        const p = [P[j], P[j + 1], P[j + 2]];
        if (!head && !outsideRachis(p)) continue;                  // the pedicel-to-rachis join, by construction
        verts++;
        const d = nearest(grid, p, b.owner, best);
        if (d < best) { best = d; at = { node: b.q.nodeIndex, azDeg: (b.q.az * 180) / Math.PI }; }
      }
      if (best > 0 && crosses(grid, P, b.lo, b.hi, b.owner, head ? null : outsideRachis)) { best = 0; crossing = true; at = { node: b.q.nodeIndex, azDeg: (b.q.az * 180) / Math.PI, crossing: true }; }
    }
    return { mm: capped(best), at, verts, crossing, capped: best >= SEARCH_CAP_MM };
  }

  if (measure === 'leaf-floret') {
    if (!m.leaf || !m.leaf.present || !m.leaf.shared) return { mm: Infinity, why: 'no subtending leaf is built (the shared node needs a raceme and a leaf length)' };
    const grid = triGrid(P, blocks.map(({ lo, hi, owner }) => ({ lo, hi, owner })));
    let best = SEARCH_CAP_MM, at = null, verts = 0, crossing = false, leaves = 0;
    for (let i = 0; i < m.leaf.azimuths.length; i++) {
      /* a node whose length cap leaves no blade builds no leaf (the plan says so) */
      if (m.leaf.nodeLengthsMm && !(m.leaf.nodeLengthsMm[i] > 0)) continue;
      for (const az of m.leaf.azimuths[i]) {
        /* THE SHIPPED BUILDER into a throwaway accumulator — the gate's own
           `leaf-stem` construction, so the leaf measured is the leaf built. */
        const probe = new G.MeshBuilder({ exportMode: true });
        G.buildLeafInto(probe, m.leaf, state, i, az);
        const Q = probe.positions;
        leaves++;
        const seen = new Set();
        for (let j = 0; j < Q.length; j += 3) {
          const sk = `${Q[j]},${Q[j + 1]},${Q[j + 2]}`;
          if (seen.has(sk)) continue;
          seen.add(sk);
          const p = [Q[j], Q[j + 1], Q[j + 2]];
          if (!outsideRachis(p)) continue;                          // the petiole-to-rachis join, by construction
          verts++;
          const d = nearest(grid, p, 'leaf', best);
          if (d < best) { best = d; at = { node: i, azDeg: (az * 180) / Math.PI, p: p.map((x) => Number(x.toFixed(3))) }; }
        }
        if (best > 0 && crosses(grid, Q, 0, Q.length, 'leaf', outsideRachis)) { best = 0; crossing = true; at = { node: i, azDeg: (az * 180) / Math.PI, crossing: true }; }
      }
    }
    if (!leaves) return { mm: Infinity, why: 'the shared node seated no leaf (every pedicel lacks room)' };
    return { mm: capped(best), at, verts, leaves, crossing, capped: best >= SEARCH_CAP_MM };
  }
  if (measure === 'leaf-pedicel') {
    /* EVERY SUBTENDING LEAF AGAINST EVERY PEDICEL ROD — its own and every
       other node's (Eva's change 1, "check the widened seating from the other
       side"). The rods are the floret builder's own EMITTED ones
       (`pedicelAxis`, ST9's segment), read as the cylinders they are: the
       distance is the segment distance less the emitted radius, and a leaf
       vertex INSIDE a rod reads 0 (an interpenetration). Where the florets of a
       dense raceme overlap each other, `leaf-floret` reads 0 whatever the leaf
       does; this measure is what can still say where the leaf stands against
       the node below. The petiole-to-rachis join is excluded, as above. */
    if (!m.leaf || !m.leaf.present || !m.leaf.shared) return { mm: Infinity, why: 'no subtending leaf is built (the shared node needs a raceme and a leaf length)' };
    let best = SEARCH_CAP_MM, at = null, leaves = 0;
    const rods = B.placed.filter((q) => q.pedicelAxis);
    if (!rods.length) return { mm: Infinity, why: 'every floret is SESSILE — there is no pedicel rod' };
    for (let i = 0; i < m.leaf.azimuths.length; i++) {
      if (m.leaf.nodeLengthsMm && !(m.leaf.nodeLengthsMm[i] > 0)) continue;
      for (const az of m.leaf.azimuths[i]) {
        const probe = new G.MeshBuilder({ exportMode: true });
        G.buildLeafInto(probe, m.leaf, state, i, az);
        const Q = probe.positions;
        leaves++;
        for (let j = 0; j < Q.length; j += 3) {
          const p = [Q[j], Q[j + 1], Q[j + 2]];
          if (!outsideRachis(p)) continue;
          for (const q of rods) {
            const ax = q.pedicelAxis;
            const d = Math.max(0, segDist(p, ax.inner, ax.outer) - ax.radiusMm);
            if (d < best) { best = d; at = { node: i, azDeg: (az * 180) / Math.PI, rodNode: q.nodeIndex, rodAzDeg: (q.az * 180) / Math.PI, own: q.nodeIndex === i && Math.abs(q.az - az) < 1e-9 }; }
          }
        }
      }
    }
    if (!leaves) return { mm: Infinity, why: 'the shared node seated no leaf with a blade' };
    return { mm: capped(best), at, leaves, capped: best >= SEARCH_CAP_MM };
  }
  throw new Error(`bloom-inflo-approach: unknown measure ${JSON.stringify(measure)}`);
}
