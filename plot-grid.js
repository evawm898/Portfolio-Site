// plot-grid.js — reading a bloom grid glTF into drawable line segments, for /plot.
//
// THIS FILE IMPORTS NOTHING. Every function here is pure or duck-typed, so the
// gate can drive the SHIPPED arithmetic in Node over fixtures whose answer is
// written down, instead of restating it. `readGridScene()` walks an object
// graph by feel — `children`, `isLine`, `geometry.userData`, `matrixWorld` —
// which is exactly the shape GLTFLoader hands back, and is also a shape a
// three-line test fixture can have.
//
// It is NOT /print's extractor and shares no code with it. /print infers
// structure from triangles; here the curves are already in the file and the
// whole job is to read them out, tag them by family and pair them up.

// The two families the bloom grid exporter tags its strips with. A strip whose
// `extras.kind` is neither is NOT guessed at from its geometry (the export
// format owns that answer) — it lands in `other` and is always drawn, so a
// file we do not fully understand is never silently half-invisible.
export const KINDS = ['u', 'v'];

/* THE STATION COMES FROM THE FILE, NEVER FROM THE POINT'S INDEX — the same
   discipline `kindOf` follows one aisle down, for the same reason. The export
   declares where every point sits along the petal in two places: a v-line
   carries its own `extras.u`, and a u-line's point i sits at row i of its
   panel's declared `u` ladder (`extras.panels[].u` on the petal node). Those
   two declarations are what make a u-line and a v-line agree at the lattice
   crossing they share, and `i / (count - 1)` only happens to equal them when
   the ladder is uniform — which is a property of the grid in front of you and
   not of the format. The bloom's own telemetry records `metricMax` reaching
   4.12 under cup, so evenly spaced `u` is not evenly spaced anything.

   A strip the file does not place gets NO station rather than a guessed one,
   and a petal holding such a strip is not warpable — see `petalList` below.
   Deforming part of a petal and leaving the rest where it was is the one
   outcome worse than refusing. */
export function stationsForStrip(kind, ud, count, panels) {
  if (!(count > 0)) return null;
  if (kind === 'u') {
    const p = panelFor(panels, ud && ud.panel);
    const ladder = p && p.u;
    if (!Array.isArray(ladder) || ladder.length !== count) return null;
    const out = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      if (!Number.isFinite(ladder[i])) return null;
      out[i] = ladder[i];
    }
    return out;
  }
  if (kind === 'v') {
    if (!ud || !Number.isFinite(ud.u)) return null;
    return new Float64Array(count).fill(ud.u);
  }
  return null;
}

/* Which panel a strip belongs to. A cleft petal is three panels, each with its
   own `u` ladder and its own label, and every strip names its own — so the
   match is by label. A file with exactly one panel and a strip that does not
   name it is the single unambiguous case, and is allowed. */
export function panelFor(panels, label) {
  if (!Array.isArray(panels) || !panels.length) return null;
  if (label == null) return panels.length === 1 ? panels[0] : null;
  return panels.find(p => p && p.label === label) || null;
}

// Density slider bounds. 1 is the sparsest, MAX_DENSITY draws every line.
export const MIN_DENSITY = 1;
export const MAX_DENSITY = 12;

/* THE DENSITY SLIDER RUNS THE OTHER WAY FROM THE STRIDE IT SETS, and this is
   its ONE owner — read by the app, by the read-out and by the gate, the same
   discipline `detailToAngleDeg()` follows in /print. Right-hand end = every
   line; dragging left thins the grid out. A slider that got sparser as it
   travelled right would be the one control on the page that did. */
export function densityToEvery(density) {
  const d = Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, Math.round(density)));
  return MAX_DENSITY + 1 - d;
}

// How a stride reads in the read-out.
export function everyLabel(every) {
  if (every <= 1) return 'every line';
  if (every === 2) return 'every 2nd';
  if (every === 3) return 'every 3rd';
  return `every ${every}th`;
}

/* WHICH LINES A STRIDE KEEPS. `index` is the strip's own position within its
   petal — `extras.column` for a u-line, `extras.row` for a v-line — so the
   pattern is the same on every petal instead of drifting with a global count.
   BOTH MARGINS ARE ALWAYS KEPT: for the u family those two lines are the
   petal's own outline (v = -1 and v = +1), and dropping one of them at an even
   stride makes every petal on screen read lopsided. `last` is the largest
   index present in that petal's family. */
export function keepsIndex(index, last, every) {
  if (every <= 1) return true;
  if (index === 0 || index === last) return true;
  return index % every === 0;
}

/* ---- reading the scene ------------------------------------------------- */

function isStripObject(o) {
  // LINE_STRIP becomes THREE.Line. LineSegments and LineLoop also answer
  // `isLine`, and pair their vertices differently, so they are excluded here
  // and counted separately rather than mis-drawn.
  return o.isLine === true && o.isLineSegments !== true && o.isLineLoop !== true;
}

function kindOf(o) {
  const k = o.geometry && o.geometry.userData && o.geometry.userData.kind;
  return k === 'u' || k === 'v' ? k : 'other';
}

// A strip's index within its petal, from the exporter's own extras. u-lines are
// numbered by `column`, v-lines by `row`. Anything else has no index and is
// never thinned.
function indexOf(o, kind) {
  const ud = (o.geometry && o.geometry.userData) || {};
  const n = kind === 'u' ? ud.column : kind === 'v' ? ud.row : undefined;
  return Number.isFinite(n) ? n : -1;
}

// The node the exporter hung this strip's petal off — the one carrying
// `petalIndex`. Its extras hold the panel ladders the station comes from and
// the azimuth / role the read-out names the petal by, so it is found once and
// read for both rather than walked twice.
function petalNodeOf(ancestors) {
  for (const a of ancestors) {
    if (a.userData && Number.isFinite(a.userData.petalIndex)) return a;
  }
  return null;
}

// Apply a 4x4 column-major matrix (three's `.elements` order) to (x,y,z).
function applyMat4(e, x, y, z, out) {
  const w = 1 / ((e[3] * x + e[7] * y + e[11] * z + e[15]) || 1);
  out[0] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
  out[1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
  out[2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/* Walk a loaded glTF scene and pull out every LINE_STRIP, its family, its
   index within its petal and its points baked into the root's own space.
   Also counts what ELSE is in the file, because "this has no line strips" is
   only a useful message if it can say what it found instead. */
export function readGridScene(root) {
  const strips = [];
  const petals = new Set();
  const nodes = new Map();     // petal index -> the node carrying its extras
  const attachments = [];
  let triangles = 0, meshes = 0, lineSegments = 0, lineLoops = 0, points = 0;

  const p = [0, 0, 0];
  const visit = (o, ancestors) => {
    if (o.isMesh === true) {
      meshes++;
      const g = o.geometry, pos = g && g.getAttribute && g.getAttribute('position');
      if (pos) triangles += Math.floor((g.index ? g.index.count : pos.count) / 3);
    } else if (o.isPoints === true) {
      points++;
      // The exporter's per-petal attachment marker: one POINTS primitive at the
      // node's own translation. Kept for the read-out and for the Z-up check.
      const e = o.matrixWorld ? o.matrixWorld.elements : IDENTITY;
      applyMat4(e, 0, 0, 0, p);
      attachments.push({ name: o.name || '', world: [p[0], p[1], p[2]] });
    } else if (o.isLineSegments === true) {
      lineSegments++;
    } else if (o.isLineLoop === true) {
      lineLoops++;
    } else if (isStripObject(o)) {
      const g = o.geometry;
      const pos = g && g.getAttribute && g.getAttribute('position');
      if (pos && pos.count >= 2) {
        const kind = kindOf(o);
        const e = o.matrixWorld ? o.matrixWorld.elements : IDENTITY;
        const pts = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          applyMat4(e, pos.getX(i), pos.getY(i), pos.getZ(i), p);
          pts[i * 3] = p[0]; pts[i * 3 + 1] = p[1]; pts[i * 3 + 2] = p[2];
        }
        const node = petalNodeOf(ancestors);
        const nd = (node && node.userData) || {};
        const petal = Number.isFinite(nd.petalIndex) ? nd.petalIndex : -1;
        if (petal >= 0 && !nodes.has(petal)) nodes.set(petal, node);
        if (petal >= 0) petals.add(petal);
        const ud = (g.userData) || {};
        strips.push({
          kind, petal, index: indexOf(o, kind), points: pts,
          count: pos.count, segments: pos.count - 1,
          panel: ud.panel || null,
          // WHERE EVERY POINT SITS ALONG THE PETAL, from the file's own
          // declarations and never from the index — see `stationsForStrip`.
          // null when the file did not place it.
          stations: stationsForStrip(kind, ud, pos.count, nd.panels),
        });
      }
    }
    const kids = o.children || [];
    for (let i = 0; i < kids.length; i++) visit(kids[i], [o, ...ancestors]);
  };
  visit(root, []);

  // The largest index present per (petal, kind) — the "last line" the stride
  // rule always keeps.
  const lastByGroup = new Map();
  for (const s of strips) {
    const key = `${s.petal}/${s.kind}`;
    lastByGroup.set(key, Math.max(lastByGroup.get(key) ?? -1, s.index));
  }
  for (const s of strips) s.last = lastByGroup.get(`${s.petal}/${s.kind}`) ?? -1;

  return { strips, attachments, census: census(strips), petals: petals.size,
           petalList: petalList(strips, nodes),
           found: { triangles, meshes, lineSegments, lineLoops, points } };
}

/* THE PETALS, AS THINGS THAT CAN BE PICKED — one entry per petal node the file
   declares, in the file's own order, carrying what the read-out names it by and
   whether the whole of it can be placed along its own axis.

   `warpable` is a property of the FILE, not of the app: a petal is warpable
   when every strip under it has a station and it has u-lines to measure an axis
   from. A petal holding one unplaced strip is refused whole — deforming the
   rest of it and leaving that strip behind would tear the grid internally,
   which is the failure the drawing is least able to show. */
export function petalList(strips, nodes) {
  const by = new Map();
  for (const s of strips) {
    if (s.petal < 0) continue;
    let e = by.get(s.petal);
    if (!e) by.set(s.petal, e = { index: s.petal, strips: 0, u: 0, v: 0, placed: 0 });
    e.strips++;
    if (s.kind === 'u') e.u++;
    if (s.kind === 'v') e.v++;
    if (s.stations) e.placed++;
  }
  return [...by.values()].sort((a, b) => a.index - b.index).map(e => {
    const node = nodes && nodes.get(e.index);
    const ud = (node && node.userData) || {};
    const unplaced = e.strips - e.placed;
    return {
      index: e.index,
      name: (node && node.name) || `petal_${e.index}`,
      azimuthDeg: Number.isFinite(ud.azimuthDeg) ? ud.azimuthDeg : null,
      role: ud.role || null,
      slotIndex: Number.isFinite(ud.slotIndex) ? ud.slotIndex : null,
      panels: Array.isArray(ud.panels) ? ud.panels.length : 0,
      strips: e.strips, uLines: e.u, vLines: e.v, unplaced,
      warpable: unplaced === 0 && e.u > 0,
      why: unplaced > 0
        ? `${unplaced} of its ${e.strips} strips carry no declared u`
        : e.u === 0 ? 'it has no u-lines to measure an axis from' : '',
    };
  });
}

export function census(strips) {
  const c = { u: 0, v: 0, other: 0, strips: strips.length,
              uSegments: 0, vSegments: 0, otherSegments: 0, segments: 0 };
  for (const s of strips) {
    c[s.kind]++;
    c[`${s.kind}Segments`] += s.segments;
    c.segments += s.segments;
  }
  return c;
}

/* ---- selecting and packing --------------------------------------------- */

/* Which strips are drawn, given the family switch and the two density
   sliders. `other` is drawn unconditionally: it is the bucket for a strip the
   format did not tag, and hiding it behind a family switch that cannot name it
   would make it unreachable. */
export function selectStrips(strips, opts) {
  const families = opts.families || 'both';
  const uEvery = densityToEvery(opts.uDensity ?? MAX_DENSITY);
  const vEvery = densityToEvery(opts.vDensity ?? MAX_DENSITY);
  const wantU = families === 'both' || families === 'u';
  const wantV = families === 'both' || families === 'v';
  const out = [];
  for (const s of strips) {
    if (s.kind === 'other') { out.push(s); continue; }
    if (s.kind === 'u' && !wantU) continue;
    if (s.kind === 'v' && !wantV) continue;
    const every = s.kind === 'u' ? uEvery : vEvery;
    if (s.index < 0 || keepsIndex(s.index, s.last, every)) out.push(s);
  }
  return out;
}

/* A LINE_STRIP of n points is n-1 segments; LineSegmentsGeometry wants each
   segment as its own pair of endpoints, so this is where a strip stops being a
   strip. Six floats per segment. */
export function stripsToSegments(strips) {
  let segments = 0;
  for (const s of strips) segments += s.segments;
  const positions = new Float32Array(segments * 6);
  let o = 0;
  for (const s of strips) {
    const p = s.points;
    for (let i = 0; i + 1 < s.count; i++) {
      positions[o++] = p[i * 3];     positions[o++] = p[i * 3 + 1];     positions[o++] = p[i * 3 + 2];
      positions[o++] = p[i * 3 + 3]; positions[o++] = p[i * 3 + 4];     positions[o++] = p[i * 3 + 5];
    }
  }
  return { positions, segments };
}

export function boundsOf(strips) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const s of strips) {
    for (let i = 0; i < s.count; i++) {
      for (let a = 0; a < 3; a++) {
        const val = s.points[i * 3 + a];
        if (val < min[a]) min[a] = val;
        if (val > max[a]) max[a] = val;
      }
    }
  }
  if (!Number.isFinite(min[0])) return null;
  const center = [0, 1, 2].map(a => (min[a] + max[a]) / 2);
  let r = 0;
  for (const s of strips) {
    for (let i = 0; i < s.count; i++) {
      const dx = s.points[i * 3] - center[0];
      const dy = s.points[i * 3 + 1] - center[1];
      const dz = s.points[i * 3 + 2] - center[2];
      r = Math.max(r, Math.hypot(dx, dy, dz));
    }
  }
  return { min, max, center, radius: r };
}

/* ---- depth dimming ------------------------------------------------------ */

/* THE DIM SLIDER IS EXACT, NOT A FEEL. Three's linear fog fades by
   `smoothstep(near, far, depth)`, so the amount a slider promises can be
   delivered by SOLVING for the far plane rather than by picking a range that
   looks about right: with `near` pinned at the nearest point of the model, the
   far plane is placed so that the FARTHEST point of the model lands at exactly
   `amount`. The read-out can then say what the number means — at 60% the
   farthest line in the grid is drawn at 40% of its brightness — and the gate
   can check the arithmetic instead of eyeballing a gradient.

   The inverse of smoothstep is closed form: for t^2(3-2t) = y,
   t = 1/2 - sin(asin(1-2y)/3). Returns null when there is nothing to fade. */
export function dimToFog(amount, dNear, dFar) {
  const y = Math.min(1, Math.max(0, amount));
  if (y <= 0) return null;
  if (!(dFar > dNear)) return null;
  const near = Math.max(1e-4, dNear);
  const t = 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);
  if (!(t > 1e-6)) return null;
  return { near, far: near + (dFar - near) / t, amount: y };
}

// Three's own linear-fog factor, so the gate checks `dimToFog` against the
// arithmetic that will actually run in the shader.
export function fogFactor(near, far, depth) {
  const t = Math.min(1, Math.max(0, (depth - near) / (far - near)));
  return t * t * (3 - 2 * t);
}
