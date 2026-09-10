/* ===================================================================
   bloom-grid-gltf.js — the per-petal mid-surface grid, as a .glb.

   WHAT THIS EXPORTS, AND WHAT IT IS NOT. This is NOT the bloom. The STL
   export is the object; this is the SURFACE STRUCTURE the object was built
   from — one node per petal, each petal's mid-surface as a lattice of
   LINE_STRIPs, plus the point where that petal meets the hub. Nothing here
   is printable and nothing here is a solid: there is no thickness, because
   the mid-surface is exactly the thing the two skins were offset from.

   WHY LINE_STRIP AND NOT A TRIANGULATED PATCH. The grid structure IS the
   deliverable. A triangle mesh of the same points would carry the same
   vertices and throw away which of them are a row and which are a column,
   which is the one property a downstream drawing needs and cannot recover:
   the bloom's own STL already exists and is already a triangle soup with no
   petal identity in it (MeshBuilder is `positions`, 9 floats per triangle,
   no index and no groups). Emitting strips means the row/column partition
   survives the file format rather than being re-inferred from it.

   UNITS ARE MILLIMETRES, matching bloom-geometry.js live and export alike.
   glTF's convention is metres and this file does NOT convert: a consumer
   that silently scaled by 1000 would make every dimension in the read-out
   uncomparable with every dimension in the file. `asset.extras.units` says
   `mm` and the scene is left alone.

   THE MODE TRAVELS WITH THE FILE. Live and export are different geometry
   here — the thickness floor moves the area rule which moves the ring radius
   — so a grid without its mode is a set of coordinates naming a computation
   the reader cannot identify. `asset.extras.mode` is the label, taken from
   the accumulator that built the geometry, never from a caller's intent.

   EVERY PETAL IS IN THE FILE, AND THAT WAS NOT ALWAYS TRUE. This module used
   to read `built.petals`, which is ONE ENTRY PER RING — so a RADIAL bloom of
   eight petals handed it one grid, not eight, and a grid exported from any
   placement but CONTINUOUS was nearly empty. It reads `built.petalsAll` now:
   the same build, every petal the builder emitted, in slot order.
   `built.petals` is untouched and still means what it meant, because four of
   the metrics hook's arrays are INDEX-MATCHED to `fr.rings` through it and
   J1, Z2 and Z6 read them there. Two questions, two arrays.
   `asset.extras.petalsRetained` and `petalsBuilt` are both still written and
   now agree on every placement unless a petal's own grid was not capturable —
   which is a property of that petal, and is what the retention note says.
   =================================================================== */

/* glTF primitive modes, from the spec's own table. Named rather than
   inlined: `mode: 3` at a call site is the kind of literal that gets read as
   a count. */
const MODE_POINTS = 0;
const MODE_LINE_STRIP = 3;
const COMPONENT_FLOAT = 5126;
const TARGET_ARRAY_BUFFER = 34962;

/* THE FOOT ROWS THIS DROPS, and why it is two and not three (Eva's ruling,
   session 28, from the seam measurement in docs/bloom-session-28-outcome.md).

   buildPetalInto emits THREE foot rows and all three carry `u: 0` — they sit
   at -overhang, -overhang/2 and 0 along the ring's radial, so they are three
   positions at one parameter and a grid keyed on u cannot hold them. The
   ruling keeps the LAST of them (s = 0, the row on the ring itself) as u = 0
   and drops the two that overhang inward, which leaves the rows uniform in u
   at 0, 1/NU ... 1.

   WHAT THE MEASUREMENT SAID, because the ruling was made against a concern
   that turned out not to be the live one: the cross-section LAW is exactly
   continuous across that seam — `sectAt` at u = 0 evaluates to the same
   expression `flatSect` does, measured at 0.00e+0 deviation with every form
   control at maximum — so keeping the s = 0 row mixes no laws. What DOES
   step there is the FRAME: the foot lies in the hub plane and the blade
   leaves at petalTilt, so the sheet normal turns by exactly the tilt (25.00
   degrees at the shipping default, 75.00 at the top of the slider). That
   step is the junction's own geometry and it is in the emitted STL too; it
   is not an artifact of the grid. `attachment.footNormal` is carried so a
   consumer can read the angle rather than measure it off the points. */
const FOOT_ROWS_DROPPED = 2;

/* One petal's captured panel, reduced to the rows this file emits. Returns
   null for a panel with fewer than two usable rows — a lobe panel on a
   heavily trimmed cleft can be short, and a one-row LINE_STRIP is not a
   line. */
function usableRows(panel, footRows) {
  /* THE DROP IS INDEX-BASED AND IT IS THE PANEL'S OWN INDICES. A cleft's
     lobe panels start PANEL_OVERLAP_ROWS below the split, so their first row
     is a BLADE row and there is nothing to drop; the base panel starts at
     row 0 and carries all three feet. Reading `row` (the index into the
     petal's row list, which emitPanel records) rather than counting from the
     front of this panel is what makes both cases right with one rule. */
  const rows = panel.rows.filter((r) => r.row >= footRows - 1);
  return rows.length >= 2 ? rows : null;
}

/* ===================================================================
   The buffer. One growing list of float triples; every accessor is a slice
   of it. Kept as a class so the min/max each accessor owes the spec is
   computed while the points are being written rather than by a second walk.
   =================================================================== */
class PositionBuffer {
  constructor() { this.floats = []; }
  /* Writes `points` (an array of [x,y,z]) and returns the accessor
     descriptor for them. glTF requires POSITION accessors to carry min and
     max; they are accumulated here so no consumer of this class can forget. */
  write(points) {
    const byteOffset = this.floats.length * 4;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const p of points) {
      for (let k = 0; k < 3; k++) {
        /* Math.fround because the buffer is FLOAT32 and the JSON min/max
           must bound what the file actually holds. A double min written
           beside a float32 that rounded outward is a validator error and,
           worse, a bounding box that does not bound. */
        const v = Math.fround(p[k]);
        this.floats.push(v);
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    return { byteOffset, count: points.length, min, max };
  }
  get byteLength() { return this.floats.length * 4; }
}

/* Every value that reaches `extras` must survive JSON.stringify, and a
   Float64Array or an Infinity does not. `rollRadiusMm` is Infinity on an
   unrolled petal and `peakRadiusMm` is Infinity on an uncurled one, so this
   is reached on the shipping default rather than in a corner. */
const jsonSafe = (x) => {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (Array.isArray(x)) return x.map(jsonSafe);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x)) out[k] = jsonSafe(x[k]);
    return out;
  }
  return x;
};

const round = (x, dp = 6) => (Number.isFinite(x) ? +x.toFixed(dp) : null);

/* ===================================================================
   buildGridGltf — the one entry point.

   `built`   what buildBloomInto returned, from an accumulator built with
             `captureGrid: true`. Its `petals` array is read as-is; petals
             that are null (a descriptor with no slot) or that carry no grid
             are skipped and counted.
   `mode`    'live' | 'export' — the accumulator's own mode, passed in by
             the caller that built it. Not defaulted: a mode label that
             could be wrong by omission is the unlabelled-count defect this
             project has a rule about.
   `state`   the UI snapshot the build was made from, recorded verbatim in
             asset.extras so a grid can be reproduced.
   =================================================================== */
export function buildGridGltf(built, { mode, state, generator = 'bloom-grid-gltf' } = {}) {
  if (mode !== 'live' && mode !== 'export') {
    throw new Error(`mode must be 'live' or 'export', got ${JSON.stringify(mode)} — an unlabelled grid is not exportable`);
  }
  const buf = new PositionBuffer();
  const accessors = [];
  const meshes = [];
  const nodes = [];
  const roots = [];

  const addAccessor = (points) => {
    const a = buf.write(points);
    accessors.push({
      bufferView: 0, byteOffset: a.byteOffset, componentType: COMPONENT_FLOAT,
      count: a.count, type: 'VEC3', min: a.min, max: a.max,
    });
    return accessors.length - 1;
  };

  let skipped = 0;
  let emittedPetals = 0;
  let totalPoints = 0;

  /* EVERY PETAL THE BUILDER EMITTED, not one per ring. `built.petals` answers
     "one representative per RING" and four of the metrics hook's arrays are
     index-matched to `fr.rings` through it; this file wants the other question,
     and `petalsAll` is where it is answered. Before this, a RADIAL bloom of
     eight petals reached here as ONE and the file was nearly empty — a known
     gap, closed, and the retention note below no longer has anything to
     apologise for on any placement. */
  const allPetals = built.petalsAll || built.petals;
  for (let pi = 0; pi < allPetals.length; pi++) {
    const p = allPetals[pi];
    if (!p || !p.grid) { skipped++; continue; }

    const primitives = [];
    const panelMeta = [];

    for (const panel of p.grid) {
      const rows = usableRows(panel, p.footRows);
      if (!rows) { panelMeta.push({ label: panel.label, emitted: false, why: 'fewer than two rows after the foot drop' }); continue; }
      const nCols = rows[0].v.length;

      /* U-LINES: one strip per column, walking base to tip. These are the
         lines that run the length of the petal. */
      for (let j = 0; j < nCols; j++) {
        primitives.push({
          attributes: { POSITION: addAccessor(rows.map((r) => r.mid[j])) },
          mode: MODE_LINE_STRIP,
          extras: { kind: 'u', v: round(rows[0].v[j]), column: j, panel: panel.label },
        });
        totalPoints += rows.length;
      }
      /* V-LINES: one strip per row, walking margin to margin. These are the
         cross-sections — and they are the family whose spacing is NOT
         uniform in arc length; see `metric` in the petal's extras. */
      for (let i = 0; i < rows.length; i++) {
        primitives.push({
          attributes: { POSITION: addAccessor(rows[i].mid) },
          mode: MODE_LINE_STRIP,
          extras: { kind: 'v', u: round(rows[i].u), row: i, panel: panel.label },
        });
        totalPoints += nCols;
      }
      panelMeta.push({
        label: panel.label, emitted: true,
        rows: rows.length, cols: nCols,
        u: rows.map((r) => round(r.u)),
        v: rows[0].v.map((v) => round(v)),
        halfWidthMm: rows.map((r) => round(r.halfWidth, 5)),
        thicknessMm: rows.map((r) => round(r.thickness, 5)),
      });
    }

    if (!primitives.length) { skipped++; continue; }

    meshes.push({ name: `petal_${pi}_grid`, primitives });
    const gridMesh = meshes.length - 1;

    /* THE ATTACHMENT, as its own child node. The POINT ITSELF is the node's
       `translation` and the mesh is a single POINTS primitive at the origin,
       so a consumer reads the position out of the node transform without
       decoding an accessor — and still sees something when the file is
       opened in a viewer. Both say the same thing; the transform is the one
       a program should read. */
    meshes.push({
      name: `petal_${pi}_attachment`,
      primitives: [{ attributes: { POSITION: addAccessor([[0, 0, 0]]) }, mode: MODE_POINTS }],
    });
    totalPoints += 1;
    const attachMesh = meshes.length - 1;

    const a = p.attachment;
    nodes.push({
      name: `petal_${pi}_attachment`,
      mesh: attachMesh,
      translation: a.point.map((x) => Math.fround(x)),
      extras: jsonSafe({
        point: a.point.map((x) => round(x)),
        /* The frame the blade LEAVES the hub with, and the foot's own plane
           beside it. These differ by petalTilt — 25 degrees at the shipping
           default — and that angle is the seam at u = 0. */
        dir: a.dir.map((x) => round(x)),
        normal: a.normal.map((x) => round(x)),
        tangent: a.tangent.map((x) => round(x)),
        footNormal: a.footNormal.map((x) => round(x)),
        tiltDeg: round((a.tiltRad * 180) / Math.PI, 4),
        azimuthDeg: round((a.azimuth * 180) / Math.PI, 4),
        ringRadiusMm: round(a.ringRadius), ringZMm: round(a.ringZ),
      }),
    });
    const attachNode = nodes.length - 1;

    nodes.push({
      name: `petal_${pi}`,
      mesh: gridMesh,
      children: [attachNode],
      extras: jsonSafe({
        petalIndex: pi,
        slotIndex: p.slotIndex,
        azimuthDeg: round((p.azimuth * 180) / Math.PI, 4),
        role: p.role, slotRole: p.slotRole, petalRole: p.petalRole, allRole: p.allRole,
        panels: panelMeta,
        footRowsDropped: FOOT_ROWS_DROPPED,
        /* THE CROSS-WIDTH METRIC — the reason a consumer cannot space lines
           evenly across the petal by spacing them evenly in v.

           v is uniform in PARAMETER. |dP/dv| relative to the flat sheet is
           `metric`: exactly 1 under roll (the roll is an isometric bend) and
           up to 4.12 under cup with a gradient, so at the extreme a step in v
           near the margin covers four times the millimetres it covers at the
           midrib. `polyline` is the second, different number: the ratio of
           the EMITTED chord path's length to the flat row's, which is what a
           drawing made from these ten columns actually traverses.

           NULL ON A FLAT BUILD, and that is the shipping default: petalForm
           returns no telemetry when no form curve is engaged, and a 1.0
           written here instead would be a number standing in for a
           measurement nobody took. A consumer reading null may take the
           sheet as flat — that is what null means here — but it should read
           it, not assume it. */
        metric: p.form ? { min: round(p.form.metricMin), max: round(p.form.metricMax) } : null,
        polyline: p.form ? { min: round(p.form.polylineMin), max: round(p.form.polylineMax) } : null,
        form: p.form ? jsonSafe({
          cup: p.form.cup, curlDeg: p.form.curlDeg, rollDeg: p.form.rollDeg, twistDeg: p.form.twistDeg,
          cupGradient: p.form.cupGradient, rollTaper: p.form.rollTaper,
          rollRadiusMm: round(p.form.rollRadiusMm), rollClamped: p.form.rollClamped,
          sheetThicknessMm: round(p.form.sheetThicknessMm), onsetEnd: p.form.onsetEnd,
        }) : null,
        /* The spine as the builder emitted it — the centreline the u-lines
           are laid along, carried because a consumer cannot recover it from
           the grid (NV is EVEN, so no column lies on v = 0 and the midrib is
           not one of the emitted lines). */
        spine: {
          lengthMm: round(p.spine.length),
          tiltDeg: round((p.spine.tiltRad * 180) / Math.PI, 4),
          turnAskedDeg: round(p.spine.turnAskedDeg, 4), turnBuiltDeg: round(p.spine.turnBuiltDeg, 4),
          clamped: p.spine.clamped,
          rows: p.spine.rows.map((c) => c.map((x) => round(x))),
        },
        tipCap: jsonSafe(p.tipCap),
      }),
    });
    roots.push(nodes.length - 1);
    emittedPetals++;
  }

  if (!roots.length) throw new Error('no petal carried a captured grid — was the accumulator built with captureGrid: true?');

  const json = {
    asset: {
      version: '2.0',
      generator,
      extras: jsonSafe({
        /* THE MODE, first, because every length below is only meaningful
           with it. */
        mode,
        units: 'mm',
        /* THE HONEST COUNT. These differ on every placement but CONTINUOUS:
           buildBloomInto retains one petal per DESCRIPTOR, so a RADIAL bloom
           of eight petals reaches this module as one. A reader must be able
           to see that from the file rather than infer a one-petal bloom. */
        petalsRetained: allPetals.length,
        petalsBuilt: built.petalsBuilt,
        petalsEmitted: emittedPetals,
        petalsSkipped: skipped,
        /* THE NOTE IS STILL WRITTEN, AND IT NOW SAYS WHAT IS ACTUALLY MISSING
           RATHER THAN A STANDING CAVEAT. `buildBloomInto` retains every petal;
           the only way a petal is absent from the file now is that its own grid
           was not capturable (a panel with fewer than two rows after the foot
           drop), which is a property of that petal and is worth naming. */
        retentionNote: emittedPetals < built.petalsBuilt
          ? `${emittedPetals} of ${built.petalsBuilt} petals are in this file. The ${built.petalsBuilt - emittedPetals} that are not carried no capturable grid — see petalsSkipped.`
          : 'every petal the builder emitted is in this file',
        footRowsDropped: FOOT_ROWS_DROPPED,
        footDropNote: 'buildPetalInto emits three foot rows, all at u = 0. The two that overhang inward are dropped; the s = 0 row on the ring is kept as u = 0, leaving the rows uniform in u. The cross-section law is continuous across that seam (measured 0.00e+0); the sheet NORMAL turns by petalTilt there, which is the junction geometry and is in the STL too.',
        gridPointsTotal: totalPoints,
        ringRadiusMm: round(built.ring.radius),
        hubRadiusMm: round(built.hub.radius),
        state: state ? jsonSafe(state) : null,
      }),
    },
    scene: 0,
    scenes: [{ name: `bloom grid (${mode})`, nodes: roots }],
    nodes,
    meshes,
    accessors,
    bufferViews: [{
      buffer: 0, byteOffset: 0, byteLength: buf.byteLength,
      /* DEFINED because several accessors share this view, which the spec
         requires. Every accessor here is VEC3 float, so one stride is
         correct for all of them. */
      byteStride: 12,
      target: TARGET_ARRAY_BUFFER,
    }],
    buffers: [{ byteLength: buf.byteLength }],
  };

  return packGlb(json, new Float32Array(buf.floats));
}

/* ===================================================================
   packGlb — JSON chunk + BIN chunk, both padded to four bytes.

   Written here rather than pulled from three.js's GLTFExporter because that
   exporter walks a THREE scene graph, and what this module has is arrays:
   routing them through a scene to get them back out as a buffer would
   introduce a second representation of the grid for no gain.
   =================================================================== */
function packGlb(json, floats) {
  const enc = new TextEncoder();
  let jsonBytes = enc.encode(JSON.stringify(json));
  /* The JSON chunk pads with SPACES (0x20) and the BIN chunk with ZEROS —
     the spec names both, and a zero-padded JSON chunk is a parse error in
     strict readers. */
  const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
  const binBytes = new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
  const binPad = (4 - (binBytes.byteLength % 4)) % 4;

  const total = 12 + 8 + jsonBytes.byteLength + jsonPad + 8 + binBytes.byteLength + binPad;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let o = 0;
  dv.setUint32(o, 0x46546c67, true); o += 4;   // 'glTF'
  dv.setUint32(o, 2, true); o += 4;            // version
  dv.setUint32(o, total, true); o += 4;

  dv.setUint32(o, jsonBytes.byteLength + jsonPad, true); o += 4;
  dv.setUint32(o, 0x4e4f534a, true); o += 4;   // 'JSON'
  out.set(jsonBytes, o); o += jsonBytes.byteLength;
  for (let i = 0; i < jsonPad; i++) out[o++] = 0x20;

  dv.setUint32(o, binBytes.byteLength + binPad, true); o += 4;
  dv.setUint32(o, 0x004e4942, true); o += 4;   // 'BIN\0'
  out.set(binBytes, o); o += binBytes.byteLength;
  for (let i = 0; i < binPad; i++) out[o++] = 0x00;

  return out;
}
