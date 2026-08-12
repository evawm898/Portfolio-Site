// Zone classification: segment the bodice surface into placement zones by
// curvature, cap panel size per zone with the chord rule, and name the
// resulting regions.
//
// Chord rule: a rigid span L standing off a surface of local min radius R
// gaps by the sagitta L^2 / (8R); requiring gap <= tol gives
//   L_max = sqrt(8 * R * tol).
// Doubly curved cells cap the panel's LARGEST dimension (both directions
// curve away); single-curved / planar cells cap only the panel WIDTH — the
// panel may run tall along the (near-)straight direction.

export const CHORD_TOL_MM = 2;
export const chordCap = (R, tol = CHORD_TOL_MM) => Math.sqrt(8 * R * tol);

const PLANAR_KMAX = 1 / 700;  // R > 700 mm in both directions => planar
const SINGLE_RATIO = 0.15;    // |k_min| < 15% of |k_max| => effectively single-curved
const SINGLE_KMIN = 1 / 1500;

export function classifyCells(model, classes, tol = CHORD_TOL_MM) {
  const { nu, nv, curvature } = model;
  const n = nu * nv;
  const category = new Array(n);   // 'planar' | 'single' | 'double'
  const fitClass = new Int16Array(n); // index into classes, -1 = nothing fits
  const ordered = [...classes].sort((a, b) => a.width_mm - b.width_mm); // ascending

  for (let idx = 0; idx < n; idx++) {
    const kmax = Math.abs(curvature.k1[idx]);
    const kmin = Math.abs(curvature.k2[idx]);
    let cat;
    if (kmax < PLANAR_KMAX) cat = 'planar';
    else if (kmin < Math.max(SINGLE_KMIN, SINGLE_RATIO * kmax)) cat = 'single';
    else cat = 'double';
    category[idx] = cat;
    const cap = chordCap(curvature.R[idx], tol);
    let best = -1;
    for (let c = 0; c < ordered.length; c++) {
      const span = cat === 'double'
        ? Math.max(ordered[c].width_mm, ordered[c].height_mm)
        : ordered[c].width_mm;
      if (span <= cap) best = c;
    }
    fitClass[idx] = best;
  }
  return { category, fitClass, orderedClasses: ordered };
}

// Zone key per cell: the largest class that fits there. Segmenting on the
// class alone (not class x curvature-rule) keeps zones readable; the rule
// mix is reported per zone, and placement will re-validate per cell anyway.
function zoneKeys(model, cls) {
  const { nu, nv } = model;
  const keys = new Array(nu * nv);
  for (let idx = 0; idx < nu * nv; idx++) {
    keys[idx] = cls.fitClass[idx] < 0 ? 'X' : `${cls.fitClass[idx]}`;
  }
  return keys;
}

// 3x3 majority filter to knock speckle off the class-fit boundaries.
function smooth(keys, nu, nv, passes = 2) {
  let cur = keys;
  for (let p = 0; p < passes; p++) {
    const next = cur.slice();
    for (let j = 1; j < nv - 1; j++) {
      for (let i = 1; i < nu - 1; i++) {
        const counts = new Map();
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const k = cur[(j + dj) * nu + (i + di)];
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
        }
        // Deterministic, mirror-symmetric tie-break: max count, then the
        // lexicographically smaller key (never scan order, which would bias
        // one body side against the other).
        let bk = null, bc = -1;
        for (const [k, c] of counts) {
          if (c > bc || (c === bc && k < bk)) { bk = k; bc = c; }
        }
        // Never smooth AWAY the exclusion: excluded cells stay excluded.
        next[j * nu + i] = cur[j * nu + i] === 'X' ? 'X' : bk;
      }
    }
    cur = next;
  }
  return cur;
}

function connectedComponents(keys, nu, nv) {
  const comp = new Int32Array(nu * nv).fill(-1);
  const compKey = [];
  let nc = 0;
  const stack = [];
  for (let s = 0; s < nu * nv; s++) {
    if (comp[s] !== -1) continue;
    const key = keys[s];
    comp[s] = nc;
    stack.push(s);
    while (stack.length) {
      const idx = stack.pop();
      const i = idx % nu, j = (idx / nu) | 0;
      const nbrs = [];
      if (i > 0) nbrs.push(idx - 1);
      if (i < nu - 1) nbrs.push(idx + 1);
      if (j > 0) nbrs.push(idx - nu);
      if (j < nv - 1) nbrs.push(idx + nu);
      for (const nb of nbrs) {
        if (comp[nb] === -1 && keys[nb] === key) { comp[nb] = nc; stack.push(nb); }
      }
    }
    compKey.push(key);
    nc++;
  }
  return { comp, compKey, count: nc };
}

// Merge components smaller than minArea (mm^2) into the neighbor they share
// the most boundary with (exclusion components are never absorbed away).
function mergeSmall(comp, compKey, count, keys, nu, nv, areaW, minArea) {
  const areas = new Float64Array(count);
  for (let idx = 0; idx < nu * nv; idx++) areas[comp[idx]] += areaW[idx];
  let changed = true;
  while (changed) {
    changed = false;
    for (let c = 0; c < count; c++) {
      if (areas[c] === 0 || areas[c] >= minArea || compKey[c] === 'X') continue;
      const border = new Map();
      for (let idx = 0; idx < nu * nv; idx++) {
        if (comp[idx] !== c) continue;
        const i = idx % nu, j = (idx / nu) | 0;
        for (const nb of [i > 0 ? idx - 1 : -1, i < nu - 1 ? idx + 1 : -1, j > 0 ? idx - nu : -1, j < nv - 1 ? idx + nu : -1]) {
          if (nb >= 0 && comp[nb] !== c && compKey[comp[nb]] !== 'X') {
            border.set(comp[nb], (border.get(comp[nb]) ?? 0) + 1);
          }
        }
      }
      let target = -1, bc = 0;
      for (const [t, cnt] of border) if (cnt > bc) { target = t; bc = cnt; }
      if (target < 0) continue;
      for (let idx = 0; idx < nu * nv; idx++) {
        if (comp[idx] === c) { comp[idx] = target; keys[idx] = compKey[target]; }
      }
      areas[target] += areas[c];
      areas[c] = 0;
      changed = true;
    }
  }
  return areas;
}

export function buildZones(model, classes, tol = CHORD_TOL_MM) {
  const { nu, nv, curvature, measurements: m } = model;
  const cls = classifyCells(model, classes, tol);
  let keys = zoneKeys(model, cls);
  keys = smooth(keys, nu, nv, 2);
  const { comp, compKey, count } = connectedComponents(keys, nu, nv);
  const areas = mergeSmall(comp, compKey, count, keys, nu, nv, curvature.areaW, 2000); // < 20 cm^2

  // Per-zone stats.
  const zones = [];
  for (let c = 0; c < count; c++) {
    if (areas[c] === 0) continue;
    const cells = [];
    for (let idx = 0; idx < nu * nv; idx++) if (comp[idx] === c) cells.push(idx);
    if (!cells.length) continue;
    const key = compKey[c];
    const excluded = key === 'X';
    const clsIdx = excluded ? -1 : parseInt(key, 10);
    let ax = 0, ay = 0, aw = 0, minR = Infinity, doubleArea = 0, fitArea = 0;
    const rs = [];
    const bbox = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const idx of cells) {
      const i = idx % nu, j = (idx / nu) | 0;
      const p = model.P[j][i];
      const w = curvature.areaW[idx];
      ax += p[0] * w; ay += p[1] * w; aw += w;
      if (cls.category[idx] === 'double') doubleArea += w;
      if (!excluded && cls.fitClass[idx] >= clsIdx) fitArea += w;
      minR = Math.min(minR, curvature.R[idx]);
      rs.push(curvature.R[idx]);
      bbox.x0 = Math.min(bbox.x0, p[0]); bbox.x1 = Math.max(bbox.x1, p[0]);
      bbox.y0 = Math.min(bbox.y0, p[1]); bbox.y1 = Math.max(bbox.y1, p[1]);
    }
    rs.sort((a, b) => a - b);
    zones.push({
      comp: c, key, excluded,
      doublePct: (100 * doubleArea) / aw, // share where the largest dimension is capped (rest: width only)
      fitPct: excluded ? 0 : (100 * fitArea) / aw, // share where the zone's class truly fits per-cell
      sizeClass: clsIdx >= 0 ? cls.orderedClasses[clsIdx] : null,
      area: aw, cx: ax / aw, cy: ay / aw, bbox,
      minR, medianR: rs[(rs.length / 2) | 0],
      cap: chordCap(minR, tol),
      cells,
    });
  }
  zones.sort((a, b) => b.area - a.area);
  nameZones(zones, m, model);
  return { zones, comp, compKey, cls, tol };
}

// Semantic names; the wearer's LEFT is +x. A zone is named by how its AREA
// distributes over three vertical bands (below underbust / bust level /
// above the bust), since merged curvature zones often span more than a
// centroid suggests.
function nameZones(zones, m, model) {
  const sepHalf = m.apexSeparation / 2;
  const hLow = model.hUnderbust, hHigh = m.apexHeight + 40;
  const { nu } = model;
  const used = new Map();
  for (const z of zones) {
    let low = 0, mid = 0, high = 0;
    for (const idx of z.cells) {
      const j = (idx / nu) | 0;
      const y = model.P[j][idx % nu][1];
      const w = model.curvature.areaW[idx];
      if (y < hLow) low += w; else if (y > hHigh) high += w; else mid += w;
    }
    const bands = [
      ['waist-underbust', low], ['bust-level', mid], ['upper-chest', high],
    ].sort((a, b) => b[1] - a[1]);
    const side = z.cx > 12 ? 'left' : z.cx < -12 ? 'right' : '';
    const spansCF = z.bbox.x0 < -25 && z.bbox.x1 > 25;
    let base;
    if (z.excluded) {
      base = `apex-exclusion-${side || 'center'}`;
    } else {
      base = bands[0][0];
      if (bands[1][1] > 0.35 * z.area) base += `+${bands[1][0]}`;
      if (base === 'bust-level' && !spansCF) {
        base = Math.abs(z.cx) > sepHalf + 45 ? 'side' : 'bust';
      } else if (base === 'bust-level' && z.bbox.x0 < -sepHalf && z.bbox.x1 > sepHalf) {
        base = 'bust-ring'; // wraps both apexes (and the sternum valley between)
      } else if (base === 'bust-level' && Math.abs(z.cx) < sepHalf - 45) {
        base = 'sternum';
      }
      if (!spansCF && side) base += `-${side}`;
    }
    const nUsed = used.get(base) ?? 0;
    used.set(base, nUsed + 1);
    z.name = nUsed === 0 ? base : `${base}-${nUsed + 1}`;
  }
}
