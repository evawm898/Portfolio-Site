/* ===================================================================
   verify-bloom-grid.mjs — the per-petal mid-surface capture and its .glb.

   WHAT THIS MEASURES THAT NOTHING ELSE CAN. Both STL gates are structurally
   blind to everything in this file. The capture emits no triangles, so no
   edge census can move and no flood fill can split; the .glb is not the
   export path at all. A grid that described a DIFFERENT surface from the one
   the mesh was built out of would pass verify-bloom-export, pass
   verify-bloom-connectedness, produce an identical triangle count and an
   identical STL byte length, and be wrong in the only way that matters.

   THE CLAUSES, and what each would miss on its own:

     1  THE CAPTURE MOVES NO BYTE. `acc.positions` with captureGrid off and
        on, compared with Object.is float by float, live and export. This is
        the load-bearing clause — the whole argument for putting the capture
        inside emitPanel is that it reads values already computed. Blind to
        a grid that is wrong; clause 2 is that.
     2  THE GRID IS THE MESH'S OWN MID-SURFACE. Five sub-clauses, and the
        reason there are five is that the ONE statement that used to carry
        this stopped being true when the edge profile landed.

        WHAT IT USED TO SAY, and why it is gone. It re-offset every captured
        point by its own normal and half-thickness and required BOTH results
        among the emitted vertices, exactly. That rested on a premise the
        bead broke: `emitPanel` offset the two skins from the very vectors it
        captured, so the reconstruction was the emitted vertex BY
        CONSTRUCTION. It no longer is. The skins are now offset by a
        per-column TAPERED half thickness at an INSET sampling of the row, so
        on this tree the old expression finds 480 of 9,440 on the shipping
        default — exactly the foot, and nothing else. The precedent for what
        to do about that is clause 3's own comment one screen down: PIN THE
        FILE TO THE BUILDER, never to a formula that used to hold.

        2a  THE APEX IDENTITY — the silhouette did not move. The capture and
            the skin are two samplings of ONE mid-surface now, and they are
            tied at the boundary: every captured mid point on a panel's
            PERIMETER is the emitted bead APEX, present as the SAME double.
            The perimeter is the loop `emitPanel` itself walks — column 0 and
            column NV-1 of every row, plus every column of the FIRST row (the
            inner end cap) and of the LAST row (the tip) — so the subject is
            the whole of the thing under test rather than a part of it. Not a
            proximity claim: `emitPanel` pushes the boundary point onto the
            profile as itself precisely so this is an identity, and mutant
            `the-bead-apex-is-recomputed` is what says so. Measured on the
            shipping default, both modes: 1,072 of 1,072 per bloom — of which
            944 are margin points, 64 the inner end cap's interior and 64 the
            tip's. IT CANNOT BE VACUOUS, and that is measured against a
            worktree of `main` rather than reasoned: there the same 1,072
            points score 0, because nothing sits on the mid-surface at all —
            while the OLD clause scores 9,440 of 9,440. The premise did not
            soften, it inverted.
        2b  THE ZERO-RAMP ENDS STILL RECONSTRUCT — the old clause, verbatim,
            kept exactly where it is still true rather than deleted. The
            treatment ramps to nothing at every BURIED end, so where the ramp
            is zero the skin samples the original span at the body's own half
            thickness and `mid +/- normal * thickness / 2` is the emitted
            vertex again. Which rows those are is read off the capture, not
            off the ramp: a panel's FIRST row, every row at u = 0 (the foot),
            and a BURIED panel's last row. Measured 480 of 480 on the default
            and 1,280 of 1,280 on a four-tooth fringe, with the interior
            reading 0 of 8,960 — so the two populations are disjoint and the
            clause is not quietly re-asserting the whole petal.
        2c  THE CAPTURED PAIR IS THE SURFACE'S OWN, FROM ANOTHER OWNER. The
            apex identity ties the capture's mid points to the mesh at the
            BOUNDARY and says nothing about the interior columns, and nothing
            at all about the normals. So the row is rebuilt independently —
            `petalSurface(state, ring, slot).rowAt(u).sect(v)` on
            footRing()'s own ring and the whorl primitive's own slot — and
            every captured mid AND normal must equal it under Object.is.
            Measured 0 of 3,360 values differing per row, 0 of 63,840 over
            the whole table, and the slot payload matching on all 19.
            The foot rows are excluded and that is declared, not silent:
            they come from `footRowsAt()`, a different producer, and 2b is
            what covers them.
        2d  A BENT ROW'S NORMALS VARY. 2c reads one petal per row; this reads
            EVERY petal, from a third owner again — the captured MID points,
            which the normal is not. A cross-section whose mid points depart
            from their own chord cannot carry one normal, so
            `bend > BEND_REL_BAR` implies the spread is strictly positive.
            The two populations are twelve orders apart, measured over the
            whole matrix of rows here: the least bend on a varying-normal row
            is 1.470e-2 and the worst on a constant-normal row is 1.885e-14,
            with the least spread 1.188e-1. The converse is REPORTED and not
            asserted — a form that rotated the normal along v without bending
            the section would be legal geometry, and no such form exists here
            today (0 rows of the 16,225 this gate builds).
        2e  THE RIM RECORD POINTS AT THE ARTEFACT, and is 2a's own non-vacuity
            witness. `{ captureRim: true }` makes `emitPanel` record one entry
            per TREATED perimeter vertex; the apex and both skin meeting
            points must be emitted vertices, the entry must name the captured
            point it came from, and the count must be positive — otherwise a
            tree whose inset collapsed to zero would satisfy 2a by having no
            bead at all. It also measures that the flag moves no byte.
        Blind to the ROW/COLUMN partition being scrambled; clause 3 is that.
     3  THE ROWS ARE THE BUILDER'S OWN LADDER AFTER THE FOOT DROP — exactly
        NU+1 of them, the first at 0, strictly increasing, the last at 1, and
        the file's declared list agreeing with the emitted v-lines. THIS
        HEADLINE USED TO READ "uniform in u", which the clause's own comment
        below has retracted since the turning ladder shipped (session 32) —
        corrected here in passing, because a header naming a property nobody
        asserts is exactly the label-over-a-computation defect this project
        keeps finding. Blind to the points being wrong.
     4  THE SEAM'S LAW IS CONTINUOUS. `sectAt` at u = 0 evaluated against a
        straight chord with every form control at maximum — the measurement
        the foot-drop ruling rests on, asserted rather than remembered. Note
        what it does NOT say: the FRAME steps by petalTilt there, by design,
        and clause 4b pins that step to the tilt so a future change that
        moved it could not pass silently.
     5  THE .glb IS WELL FORMED. Magic, version, declared length, both chunk
        types, both paddings (JSON pads with SPACES and BIN with ZEROS — a
        zero-padded JSON chunk is a parse error in strict readers), every
        accessor in range of its bufferView, byteStride present because
        accessors share a view, and every accessor's min/max actually
        BOUNDING the floats in the binary chunk.
     6  THE MODE CANNOT BE OMITTED. buildGridGltf throws without one, and the
        label in the file matches the accumulator that built the geometry.
     7  THE RETENTION GAP IS REPORTED. petalsEmitted vs petalsBuilt, and they
        genuinely differ on RADIAL — the file must say so rather than look
        like a one-petal bloom.
     8  THE METRIC TELEMETRY TRAVELS, and is NULL on a flat build rather than
        a plausible 1.0. v is uniform in parameter and not in arc length, so
        this is the number a downstream drawing needs and cannot recompute.

   WHAT IT IS BLIND TO, stated here because a gate's own header is the worst
   place for a label naming a computation nobody performs:
     - It does not run the browser. The button, the download and the
       read-out line are unexercised; only the module is driven.
     - It does not compare against the BASE COMMIT. "Nothing moved since
       main" is tools/diff-bloom-bytes.mjs's question and needs a worktree;
       clause 1 only says the FLAG moves nothing on this tree.
     - It does not open the .glb in a glTF reader. It validates the
        structure it wrote; a spec violation both this and the writer share
        would pass.
     - Clauses 2a/2b are membership tests. A grid carrying EXTRA points
       that correspond to nothing emitted would pass them; 2c is what bounds
       that, and it reads ONE petal per row.
     - 2c compares the module under test against a SECOND CALL of its own
       petalSurface. A defect INSIDE petalSurface moves both sides together
       and is invisible here — the same declared blindness
       tools/verify-bloom-surface-offstation.mjs carries.
     - No panel with a BURIED tip is reachable from the ROWS table: every
       one of its 19 states builds a single 'full' panel running to the last
       row. The buried branch is exercised by its own block after the loop,
       on a four-tooth fringe, because putting a fringe in ROWS would put a
       51-row base panel in front of clause 3's NU+1 row count.

   RUN:  node tools/verify-bloom-grid.mjs
         node tools/verify-bloom-grid.mjs --negative-control
   The negative control re-imports deliberately broken copies of the source
   files and FAILS if a mutation does not apply, if the clause it names stays
   green, or if a clause it did not name goes red — which is how a mutation
   that just breaks everything gets caught pretending to be a negative
   control. It names SUB-CLAUSES (2a..2e) rather than a bare 2, so a mutation
   claiming the apex identity cannot be excused by reddening the normal
   instead; a mutation that genuinely breaks several says several.
   =================================================================== */
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* THE SLOT PAYLOAD'S ONE OWNER (session 37). Clause 2c needs a ring and a
   slot to call `petalSurface` with, and `buildWhorlInto`'s callback is the
   only producer of a slot record — a tool that synthesised one would be a
   second producer of exactly the payload it is checking a consumer against.
   DECLARED BLINDNESS: this helper imports the REPOSITORY's bloom-geometry.js,
   not the temp copy the negative control mutates, so a mutation to footRing()
   or buildWhorlInto() would leave it reading the clean tree. That is why
   clause 2c asserts the payload it was handed EQUALS the one the petal under
   test recorded before it compares a single coordinate: the two modules
   disagreeing is a failure, not a silent comparison against the wrong petal. */
import { firstSlot } from './bloom-first-slot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEG = process.argv.includes('--negative-control');

/* THE ROWS. Chosen to reach every branch the capture can take: the shipping
   default, each form curve alone and all together (so clause 2 sees curved
   cross-sections whose normals vary across the width), the dome and the
   sphere (where the foot rows are arcs on a cap rather than flat), every
   placement (so clause 7 sees both retention arms), and both modes. */
const ROWS = [
  { label: 'default', state: {} },
  { label: 'default (export)', state: {}, mode: 'export' },
  { label: 'roll 360', state: { petalRoll: 360 } },
  { label: 'cup 1.0 + gradient', state: { petalCup: 1.0, petalCupGradient: 1.0 } },
  { label: 'curl 360', state: { petalSpineCurl: 360 } },
  { label: 'twist 180', state: { petalTwist: 180 } },
  { label: 'all form', state: { petalRoll: 360, petalCup: 1.0, petalSpineCurl: 150, petalTwist: 180 } },
  { label: 'all form (export)', state: { petalRoll: 360, petalCup: 1.0, petalSpineCurl: 150, petalTwist: 180 }, mode: 'export' },
  { label: 'thin sheet 0.60', state: { sheetThickness: 0.60, tipThinning: 0.5 }, mode: 'export' },
  { label: 'headRise 1.0', state: { headRise: 1.0 } },
  { label: 'headRise 0.5 + form', state: { headRise: 0.5, petalRoll: 180, petalCup: 0.6 } },
  { label: 'SPHERE', state: { placement: 'CONTINUOUS', hubShape: 'SPHERE' } },
  { label: 'CONTINUOUS', state: { placement: 'CONTINUOUS' } },
  { label: 'CONTINUOUS 60', state: { placement: 'CONTINUOUS', petalCount: 60 } },
  { label: 'SPIRAL', state: { placement: 'SPIRAL' } },
  { label: 'FAN', state: { placement: 'FAN' } },
  { label: '3 layers', state: { layerCount: 3 } },
  { label: '3 layers + zygomorphy', state: { layerCount: 3, innerCup: 0.5, innerCurl: 60 } },
  { label: 'layerSize 0.90 x 6', state: { layerCount: 6, layerSize: 0.90 } },
];

/* Exact float identity as a string key. `String(v)` is the shortest
   representation that round-trips, so two keys are equal iff the doubles are
   — no tolerance, which is the point: clause 2 is an identity claim about
   values that came out of the same expression, not a proximity claim. */
const key3 = (x, y, z) => `${x},${y},${z}`;

/* THE BEND BAR (clause 2d). Not a tolerance on a quantity that ought to be
   zero — a SEPARATOR between two measured populations. Over every row the
   ROWS table builds (16,225 of them, printed by the run rather than written
   down here), the least relative sagitta on a row whose
   normals vary is 1.470e-2 and the worst on a row whose normals are all one
   vector is 1.885e-14. The bar sits at 1e-8: six orders above the flat
   population and six below the bent one, set from both distributions rather
   than from the data in hand on one side of it. The CONSEQUENT carries no
   tolerance at all — the spread must be strictly positive, and the least one
   measured is 1.188e-1. */
const BEND_REL_BAR = 1e-8;

/* The row's cross-section sagitta against its own chord, relative — a row is
   16 mm across at its widest and 1.6 mm at the tip, and the question is about
   SHAPE, not size. */
function rowBendRel(mid) {
  const n = mid.length, a = mid[0], b = mid[n - 1];
  const cx = b[0] - a[0], cy = b[1] - a[1], cz = b[2] - a[2];
  const L = Math.hypot(cx, cy, cz);
  let d = 0;
  for (let j = 1; j < n - 1; j++) {
    const px = mid[j][0] - a[0], py = mid[j][1] - a[1], pz = mid[j][2] - a[2];
    const t = L > 0 ? (px * cx + py * cy + pz * cz) / (L * L) : 0;
    d = Math.max(d, Math.hypot(px - t * cx, py - t * cy, pz - t * cz));
  }
  return L > 0 ? d / L : d;
}

/* How far the row's per-point normals depart from its first one. EXACTLY zero
   iff every column carries the same vector, which is what storing the row's
   constant normal makes true on every row of every petal. */
function normalSpread(normal) {
  let s = 0;
  for (let j = 1; j < normal.length; j++) {
    s = Math.max(s, Math.hypot(normal[j][0] - normal[0][0], normal[j][1] - normal[0][1], normal[j][2] - normal[0][2]));
  }
  return s;
}

/* ONE WALK OVER THE CAPTURE, for 2a / 2b / 2d. The ROWS loop and the
   buried-tip block both read this rather than carrying two walks that could
   drift — clause 3's own lesson about second statements of one property.

   `lastRow` is the highest row index any panel of this build reaches, and it
   is what makes "is this panel's tip BURIED" a question answered by the
   CAPTURE rather than by a flag: `emitPanel` calls a tip exposed when
   `panel.rowTo === rows.length - 1`, and the union of a petal's panels covers
   its whole ladder, so the maximum over panels IS `rows.length - 1`. */
function walkGrid(built, emitted, lastRow) {
  const o = {
    apexProbed: 0, apexMissing: 0, apexFirst: null, marginProbed: 0, marginMissing: 0,
    zeroProbed: 0, zeroMissing: 0, zeroFirst: null, insideProbed: 0, insidePresent: 0,
    rows: 0, bentRows: 0, bentConstant: 0, bentFirst: null, flatRows: 0, flatVarying: 0,
    minBentRel: Infinity, maxFlatRel: 0, minSpread: Infinity,
    panelsBuried: 0, panelsExposed: 0, labels: new Set(),
  };
  for (const p of built.petalsAll) {
    if (!p || !p.grid) continue;
    for (const pan of p.grid) {
      const tipBuried = pan.rowTo !== lastRow;
      o.labels.add(`${pan.label}${tipBuried ? ' (buried tip)' : ''}`);
      tipBuried ? o.panelsBuried++ : o.panelsExposed++;
      for (let ri = 0; ri < pan.rows.length; ri++) {
        const r = pan.rows[ri];
        const isFirst = ri === 0, isLast = ri === pan.rows.length - 1;
        /* WHERE THE RAMP IS EXACTLY ZERO, read off the capture. `emitPanel`
           fades the treatment to nothing at every BURIED end, and the ends it
           calls buried are: the panel's own first row (its `baseEnd` scan
           starts there, so the ramp's argument is <= 0 and rimEase clamps),
           every row the foot carries at u = 0, and — only when the tip is
           buried — the last row. */
        const zeroRamp = r.row === pan.rowFrom || r.u === 0 || (tipBuried && r.row === pan.rowTo);
        const where = `${pan.label} row ${r.row} u=${r.u}`;
        for (let j = 0; j < r.mid.length; j++) {
          const P = r.mid[j], n = r.normal[j], t = r.thickness;
          const isMargin = j === 0 || j === r.mid.length - 1;
          /* THE WHOLE PERIMETER, which is exactly the loop `emitPanel` walks:
             the inner end cap is the FIRST row's every column, the two margins
             are column 0 and NV-1 of every row, and the tip is the LAST row's
             every column. Anything less would carve the subject down to part
             of the thing under test. */
          if (isMargin || isFirst || isLast) {
            o.apexProbed++;
            if (isMargin) o.marginProbed++;
            /* EITHER AN APEX OR A WALL, and the disjunction is exhaustive
               rather than a softening. A perimeter point the treatment
               REACHED is the bead's apex and is emitted as the same double; a
               point at a BURIED end — the foot under the hub, a cleft's or a
               fringe's base panel under what overlaps it — is still the flat
               wall, where the point is the mid-surface and what is emitted is
               the two skins offset from it. Those are the only two cases the
               emitter has, they are mutually exclusive on any one point (an
               inset skin cannot reconstruct), and 2e pins the treated set
               non-vacuously from the builder's own rim record. Asserting the
               apex alone was right until the untreated profile stopped being
               a subdivided wall and became the wall itself. */
            const isApex = emitted.has(key3(P[0], P[1], P[2]));
            const isWall = emitted.has(key3(P[0] + n[0] * t / 2, P[1] + n[1] * t / 2, P[2] + n[2] * t / 2))
                        && emitted.has(key3(P[0] - n[0] * t / 2, P[1] - n[1] * t / 2, P[2] - n[2] * t / 2));
            if (!isApex && !isWall) {
              o.apexMissing++;
              if (isMargin) o.marginMissing++;
              if (!o.apexFirst) o.apexFirst = `${where} col ${j} (${isMargin ? 'margin' : isFirst ? 'inner end cap' : 'tip'})`;
            }
          }
          for (const sgn of [+1, -1]) {
            const k = key3(P[0] + n[0] * sgn * t / 2, P[1] + n[1] * sgn * t / 2, P[2] + n[2] * sgn * t / 2);
            if (zeroRamp) {
              o.zeroProbed++;
              if (!emitted.has(k)) { o.zeroMissing++; if (!o.zeroFirst) o.zeroFirst = `${where} col ${j} side ${sgn}`; }
            } else {
              o.insideProbed++;
              if (emitted.has(k)) o.insidePresent++;
            }
          }
        }
        o.rows++;
        const bend = rowBendRel(r.mid), spread = normalSpread(r.normal);
        if (bend > BEND_REL_BAR) {
          o.bentRows++;
          o.minBentRel = Math.min(o.minBentRel, bend);
          if (spread > 0) o.minSpread = Math.min(o.minSpread, spread);
          else { o.bentConstant++; if (!o.bentFirst) o.bentFirst = `${where} bends ${bend.toExponential(3)} of its chord and carries ONE normal`; }
        } else {
          o.flatRows++;
          o.maxFlatRel = Math.max(o.maxFlatRel, bend);
          if (spread > 0) o.flatVarying++;
        }
      }
    }
  }
  return o;
}

/* The highest row index any panel reaches — see walkGrid. */
function lastRowOf(built) {
  let last = -1;
  for (const p of built.petalsAll) if (p && p.grid) for (const pan of p.grid) if (pan.rowTo > last) last = pan.rowTo;
  return last;
}

const fails = [];
const notes = [];
let checks = 0;
const check = (clause, ok, msg) => {
  checks++;
  if (!ok) fails.push(`${clause}: ${msg}`);
  return ok;
};

/* ------------------------------------------------------------------ */
function parseGlb(glb) {
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const out = { errors: [] };
  if (dv.getUint32(0, true) !== 0x46546c67) out.errors.push('magic is not glTF');
  if (dv.getUint32(4, true) !== 2) out.errors.push(`version ${dv.getUint32(4, true)} != 2`);
  if (dv.getUint32(8, true) !== glb.byteLength) out.errors.push(`declared length ${dv.getUint32(8, true)} != actual ${glb.byteLength}`);
  if (glb.byteLength % 4 !== 0) out.errors.push('total length is not 4-byte aligned');
  const jLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a) out.errors.push('chunk 0 is not JSON');
  if (jLen % 4 !== 0) out.errors.push('JSON chunk length is not 4-byte aligned');
  const jBytes = new Uint8Array(glb.buffer, glb.byteOffset + 20, jLen);
  /* THE PAD BYTE IS PART OF THE FORMAT. A JSON chunk padded with NUL parses
     in most readers and is invalid; checking it is the difference between
     "it worked here" and "it is correct".

     THE STRIP IS DELIBERATELY LENIENT AND THE CHECK IS NOT, and that split
     was put here by the negative control: stripping only 0x20 meant a
     NUL-padded chunk failed to parse, `json` came back null, and every later
     clause that reads asset.extras went red alongside clause 5 — a mutation
     reddening three clauses is not a negative control, it is a broken build
     wearing one. So the reader tolerates either pad byte and clause 5 alone
     judges which one was written. */
  let jEnd = jLen;
  while (jEnd > 0 && (jBytes[jEnd - 1] === 0x20 || jBytes[jEnd - 1] === 0x00)) jEnd--;
  for (let i = jEnd; i < jLen; i++) if (jBytes[i] !== 0x20) { out.errors.push('JSON chunk padded with something other than 0x20'); break; }
  let json = null;
  try { json = JSON.parse(new TextDecoder().decode(jBytes.subarray(0, jEnd))); }
  catch (e) { out.errors.push(`JSON chunk does not parse: ${e.message}`); }
  const bOff = 20 + jLen;
  const bLen = dv.getUint32(bOff, true);
  if (dv.getUint32(bOff + 4, true) !== 0x004e4942) out.errors.push('chunk 1 is not BIN');
  if (bLen % 4 !== 0) out.errors.push('BIN chunk length is not 4-byte aligned');
  const bin = new Uint8Array(glb.buffer, glb.byteOffset + bOff + 8, bLen);
  out.json = json; out.bin = bin;
  return out;
}

function validateGltf(json, bin) {
  const errs = [];
  if (!json) return ['no JSON'];
  const bv = json.bufferViews[0];
  if (bv === undefined) errs.push('no bufferView');
  else {
    if (bv.byteStride === undefined && json.accessors.length > 1) errs.push('several accessors share a bufferView with no byteStride');
    if (bv.byteLength > bin.byteLength) errs.push(`bufferView byteLength ${bv.byteLength} exceeds BIN chunk ${bin.byteLength}`);
    if (json.buffers[0].byteLength !== bv.byteLength) errs.push('buffer byteLength disagrees with its bufferView');
  }
  const f32 = new Float32Array(bin.buffer, bin.byteOffset, Math.floor(bin.byteLength / 4));
  for (let ai = 0; ai < json.accessors.length; ai++) {
    const a = json.accessors[ai];
    if (a.type !== 'VEC3' || a.componentType !== 5126) { errs.push(`accessor ${ai} is not VEC3 float`); continue; }
    const end = a.byteOffset + a.count * 12;
    if (end > bv.byteLength) { errs.push(`accessor ${ai} runs past its bufferView`); continue; }
    if (a.byteOffset % 4 !== 0) errs.push(`accessor ${ai} byteOffset is not 4-byte aligned`);
    if (!a.min || !a.max) { errs.push(`accessor ${ai} has no min/max`); continue; }
    /* THE MIN/MAX MUST ACTUALLY BOUND. A writer that emitted plausible but
       wrong bounds produces a file every viewer frustums incorrectly, and
       nothing else here would notice. */
    const base = a.byteOffset / 4;
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = f32[base + i * 3 + k];
        if (!(v >= a.min[k]) || !(v <= a.max[k])) { errs.push(`accessor ${ai} value ${v} outside declared [${a.min[k]}, ${a.max[k]}]`); i = a.count; break; }
      }
    }
  }
  /* Every node's mesh and child index must resolve. */
  for (let ni = 0; ni < json.nodes.length; ni++) {
    const n = json.nodes[ni];
    if (n.mesh !== undefined && !json.meshes[n.mesh]) errs.push(`node ${ni} names a missing mesh`);
    for (const c of n.children || []) if (!json.nodes[c]) errs.push(`node ${ni} names a missing child`);
  }
  for (const s of json.scenes) for (const r of s.nodes) if (!json.nodes[r]) errs.push('scene names a missing node');
  return errs;
}

/* ------------------------------------------------------------------ */
async function run(geomUrl, gltfUrl, registryUrl) {
  const { MeshBuilder, buildBloomInto, petalForm, petalSurface, BLADE_ROWS } = await import(geomUrl);
  const { buildGridGltf } = await import(gltfUrl);
  const { DEFAULTS } = await import(registryUrl);

  /* THE ROW COUNT IS THE GEOMETRY'S, IMPORTED. It was a literal 28 under a
     comment claiming it was "read back from the emitted rows, never assumed"
     — a label naming a computation nobody performed, which is this project's
     most repeated defect, and it went red the moment NU moved to 56 (session
     34). One owner: `BLADE_ROWS`. The check is unchanged; only where the
     number comes from is. Fails loudly rather than defaulting if the geometry
     ever stops exporting it. */
  if (typeof BLADE_ROWS !== 'number') throw new Error('the geometry does not export BLADE_ROWS — this gate cannot check the row count against a number it invented');
  const NU_EXPECTED = BLADE_ROWS;

  /* CLAUSE 2d's TWO POPULATIONS, accumulated across every row so the bar's
     own headroom is a number this run printed rather than a number somebody
     wrote down once. `BEND_REL_BAR` sits between them; if a future form ever
     closed the gap, this line is where it would show. */
  const pop = { rows: 0, bent: 0, flat: 0, minBentRel: Infinity, maxFlatRel: 0, minSpread: Infinity, flatVarying: 0 };

  for (const row of ROWS) {
    const mode = row.mode || 'live';
    const exportMode = mode === 'export';
    const state = { ...DEFAULTS, ...row.state };

    /* ---- clause 1: the capture moves no byte ---- */
    const accOff = new MeshBuilder({ exportMode });
    buildBloomInto(accOff, state);
    const accOn = new MeshBuilder({ exportMode, captureGrid: true });
    const built = buildBloomInto(accOn, state);

    let moved = -1;
    if (accOff.positions.length !== accOn.positions.length) {
      check('1', false, `${row.label}: triangle count moved with the capture on (${accOff.positions.length / 9} vs ${accOn.positions.length / 9})`);
    } else {
      for (let i = 0; i < accOff.positions.length; i++) {
        if (!Object.is(accOff.positions[i], accOn.positions[i])) { moved = i; break; }
      }
      check('1', moved === -1, `${row.label}: float ${moved} moved with the capture on (${accOff.positions[moved]} vs ${accOn.positions[moved]})`);
    }

    /* ---- clause 2: the grid is the mesh's own mid-surface ----
       2a the apex identity - 2b the zero-ramp ends still reconstruct -
       2c the captured pair is petalSurface's own - 2d a bent row's normals
       vary. The header says what each is for and what it would miss alone. */
    const emitted = new Set();
    for (let i = 0; i < accOn.positions.length; i += 3) {
      emitted.add(key3(accOn.positions[i], accOn.positions[i + 1], accOn.positions[i + 2]));
    }
    /* EVERY PETAL, not one per ring - the file holds them all, so this covers
       the whole bloom rather than one blade of each whorl. */
    const w = walkGrid(built, emitted, lastRowOf(built));

    check('2a', w.apexMissing === 0,
      `${row.label}: ${w.apexMissing} of ${w.apexProbed} captured boundary mid points are not emitted bead apexes `
      + `(${w.marginMissing} of ${w.marginProbed} of them on a margin; first: ${w.apexFirst})`);
    check('2a', w.apexProbed > 0, `${row.label}: nothing was probed — the capture produced no grid`);

    check('2b', w.zeroMissing === 0,
      `${row.label}: ${w.zeroMissing} of ${w.zeroProbed} zero-ramp skin points are not among the emitted vertices `
      + `(first: ${w.zeroFirst})`);
    check('2b', w.zeroProbed > 0, `${row.label}: no zero-ramp row was found — every panel has a foot and a first row`);

    /* ---- 2c: the captured pair IS petalSurface's own ----
       THE PETAL IS FOUND BY ITS SLOT PAYLOAD, never by index. A build can
       leave a declared slot unbuilt (the sphere stem's omission mask is the
       first thing here that does), so `petalsAll[0]` is not a petal this gate
       may assume exists — and if the helper's slot and the build's disagree,
       that is a finding rather than a licence to compare the wrong petal. */
    {
      const acc3 = new MeshBuilder({ exportMode });
      const { ring, slot } = firstSlot(state, acc3);
      const same = (a, b) => a.index === b.index && a.azimuth === b.azimuth && a.scale === b.scale
        && a.tiltExtra === b.tiltExtra && a.z === b.z;
      const mine = built.petalsAll.filter((q) => q && q.grid && same(q.slot, slot));
      check('2c', mine.length === 1,
        `${row.label}: the whorl primitive's first slot matches ${mine.length} of the ${built.petalsAll.length} built petals `
        + `(index ${slot.index}, azimuth ${slot.azimuth}, scale ${slot.scale})`);
      if (mine.length === 1) {
        const surface = petalSurface(state, ring, slot, null, acc3);
        let probed = 0, differ = 0, worst = 0, first = null, footCols = 0;
        for (const pan of mine[0].grid) {
          for (const r of pan.rows) {
            /* THE FOOT IS EXCLUDED AND THAT IS DECLARED. Its rows come from
               `footRowsAt()`, a different producer from `rowAt`, and asking
               rowAt(0) for them would compare two things that were never
               meant to agree. Clause 2b is what covers those rows. */
            if (r.u === 0) { footCols += r.mid.length; continue; }
            const plan = surface.rowAt(r.u);
            for (let jj = 0; jj < r.mid.length; jj++) {
              const q = plan.sect(r.v[jj]);
              for (let k = 0; k < 3; k++) {
                probed += 2;
                if (!Object.is(q.P[k], r.mid[jj][k])) {
                  differ++; worst = Math.max(worst, Math.abs(q.P[k] - r.mid[jj][k]));
                  if (!first) first = `mid at ${pan.label} row ${r.row} u=${r.u} col ${jj}`;
                }
                if (!Object.is(q.n[k], r.normal[jj][k])) {
                  differ++; worst = Math.max(worst, Math.abs(q.n[k] - r.normal[jj][k]));
                  if (!first) first = `normal at ${pan.label} row ${r.row} u=${r.u} col ${jj}`;
                }
              }
            }
          }
        }
        check('2c', differ === 0,
          `${row.label}: ${differ} of ${probed} captured values are not petalSurface's own `
          + `(worst |d| ${worst.toExponential(3)}; first: ${first})`);
        check('2c', probed > 0, `${row.label}: no blade row was compared against the surface (${footCols} foot columns skipped)`);
      }
    }

    /* ---- 2d: a bent row cannot carry one normal ---- */
    check('2d', w.bentConstant === 0,
      `${row.label}: ${w.bentConstant} of ${w.bentRows} bent rows carry a constant normal across the width `
      + `(first: ${w.bentFirst})`);
    pop.rows += w.rows; pop.bent += w.bentRows; pop.flat += w.flatRows; pop.flatVarying += w.flatVarying;
    pop.minBentRel = Math.min(pop.minBentRel, w.minBentRel);
    pop.maxFlatRel = Math.max(pop.maxFlatRel, w.maxFlatRel);
    pop.minSpread = Math.min(pop.minSpread, w.minSpread);
    notes.push(`${row.label}: rows ${w.rows} — bent ${w.bentRows} (least ${w.bentRows ? w.minBentRel.toExponential(3) : '—'} of chord, `
      + `least normal spread ${w.bentRows ? w.minSpread.toExponential(3) : '—'}), straight ${w.flatRows} (worst `
      + `${w.maxFlatRel.toExponential(3)} of chord, ${w.flatVarying} of them with a varying normal); apex ${w.apexProbed - w.apexMissing}/${w.apexProbed}, `
      + `zero-ramp ${w.zeroProbed - w.zeroMissing}/${w.zeroProbed}, interior reconstructions surviving ${w.insidePresent}/${w.insideProbed}; `
      + `panels ${[...w.labels].join(', ')}`);

    /* ---- clause 3: the rows are the BUILDER's stations after the foot drop ----
       THIS USED TO ASSERT THE ROWS WERE UNIFORM IN u, and that stopped being
       true when the turning ladder landed (session 32, PR THREE): the row
       COUNT is fixed and the row POSITIONS are a function of the profile. A
       gate asserting `i / NU` was asserting the old sampling, not a property
       of the export — the same second-independent-statement defect the C1
       clause carried. What is asserted instead is stronger, because it pins
       the file to the builder rather than to a formula: the count, the first
       row at exactly 0, strictly increasing stations ending at 1, and the
       file's declared list agreeing with the emitted v-lines. */
    for (const p of built.petalsAll) {
      if (!p || !p.grid) continue;
      const base = p.grid.find((g) => g.label === 'full' || g.label === 'base');
      if (!base) continue;
      const kept = base.rows.filter((r) => r.row >= p.footRows - 1);
      check('3', kept.length === NU_EXPECTED + 1, `${row.label}: ${kept.length} rows after the foot drop, expected ${NU_EXPECTED + 1}`);
      let bad = null;
      if (kept.length && kept[0].u !== 0) bad = `the first kept row is u=${kept[0].u}, not the s = 0 foot row`;
      for (let i = 1; !bad && i < kept.length; i++) {
        if (!(kept[i].u > kept[i - 1].u)) bad = `row ${i} u=${kept[i].u} does not exceed row ${i - 1} u=${kept[i - 1].u}`;
      }
      if (!bad && kept.length && kept[kept.length - 1].u !== 1) bad = `the last kept row is u=${kept[kept.length - 1].u}, not 1`;
      check('3', bad === null, `${row.label}: the row stations are not a valid ladder — ${bad}`);
      /* The three foot rows must ALL carry u = 0, which is what makes the
         drop a drop of positions rather than of parameters. */
      const feet = base.rows.filter((r) => r.row < p.footRows);
      check('3', feet.length === p.footRows && feet.every((r) => r.u === 0),
        `${row.label}: the foot rows do not all sit at u = 0 (${feet.map((r) => r.u).join(', ')})`);
      break;
    }

    /* ---- clause 7 + 8: what the file must say about itself ---- */
    const glb = buildGridGltf(built, { mode, state });
    const { json, bin, errors } = parseGlb(glb);
    check('5', errors.length === 0, `${row.label}: malformed .glb — ${errors.join('; ')}`);
    const vErrs = validateGltf(json, bin);
    check('5', vErrs.length === 0, `${row.label}: invalid glTF — ${vErrs.slice(0, 3).join('; ')}`);

    check('6', json && json.asset.extras.mode === mode, `${row.label}: file says mode ${json && json.asset.extras.mode}, built as ${mode}`);
    check('6', json && json.asset.extras.units === 'mm', `${row.label}: units label missing`);

    const emittedPetals = built.petalsAll.filter((p) => p && p.grid).length;
    check('7', json && json.asset.extras.petalsEmitted === emittedPetals, `${row.label}: petalsEmitted disagrees with the build`);
    check('7', json && json.asset.extras.petalsBuilt === built.petalsBuilt, `${row.label}: petalsBuilt disagrees with the build`);
    check('7', json && typeof json.asset.extras.retentionNote === 'string' && json.asset.extras.retentionNote.length > 0,
      `${row.label}: no retention note`);

    /* ---- clause 9: EVERY petal the builder emitted is in the file ----
       This is the claim the retention change makes, and it is the one that
       would regress silently: `built.petals` is ONE ENTRY PER RING, so a
       reader that went back to it would write a RADIAL bloom of eight petals
       as ONE — a perfectly valid .glb of a perfectly valid petal, with a
       plausible census and a retention note explaining itself. Nothing else in
       this gate would notice: clause 2 would reconstruct the one petal it was
       given, clause 3 would find its ladder, clause 5 would validate the file,
       and the count clauses above compare the file against a build measured
       the same way.
         So the number is anchored to `petalsBuilt` — the BUILDER's own tally,
       computed in the whorl loop and reaching this module by a different route
       from either petal array. `petal_N` nodes are counted in the file rather
       than taken from the extras, because the extras are what the mutation
       would be lying in. */
    const petalNodes = json ? json.nodes.filter((n) => /^petal_\d+$/.test(n.name || '')).length : 0;
    check('9', built.petalsAll.length === built.petalsBuilt,
      `${row.label}: buildBloomInto emitted ${built.petalsBuilt} petals and handed the exporter `
      + `${built.petalsAll.length}`);
    check('9', petalNodes === built.petalsBuilt,
      `${row.label}: the file holds ${petalNodes} petal nodes against the ${built.petalsBuilt} the `
      + `builder emitted (the per-RING array would give ${built.petals.length})`);
    check('9', json && json.asset.extras.petalsRetained === built.petalsBuilt,
      `${row.label}: petalsRetained says ${json && json.asset.extras.petalsRetained}, `
      + `the builder emitted ${built.petalsBuilt}`);

    const p0 = json && json.nodes.find((n) => n.name === 'petal_0');
    check('7', !!p0, `${row.label}: no petal_0 node`);
    if (p0) {
      const anyForm = built.petalsAll.find((p) => p && p.grid && p.form);
      const hasForm = !!(built.petalsAll[0] && built.petalsAll[0].form);
      /* NULL WHEN FLAT, A NUMBER WHEN NOT — both directions, because a
         constant 1.0 would satisfy the first half of this on every row that
         happens to be flat. */
      check('8', hasForm ? (p0.extras.metric && typeof p0.extras.metric.min === 'number') : p0.extras.metric === null,
        `${row.label}: metric is ${JSON.stringify(p0.extras.metric)} on a ${hasForm ? 'formed' : 'flat'} build`);
      check('8', hasForm ? (p0.extras.polyline && typeof p0.extras.polyline.min === 'number') : p0.extras.polyline === null,
        `${row.label}: polyline is ${JSON.stringify(p0.extras.polyline)} on a ${hasForm ? 'formed' : 'flat'} build`);
      if (hasForm) {
        check('8', Math.abs(p0.extras.metric.min - built.petalsAll[0].form.metricMin) < 1e-5
          && Math.abs(p0.extras.metric.max - built.petalsAll[0].form.metricMax) < 1e-5,
          `${row.label}: metric in the file disagrees with the builder's own telemetry`);
      }
      if (anyForm) notes.push(`${row.label}: metric ${anyForm.form.metricMin.toFixed(4)}..${anyForm.form.metricMax.toFixed(4)}`);

      /* The attachment node's translation IS the builder's attachment point,
         at float32. */
      const an = json.nodes[p0.children[0]];
      const ap = built.petalsAll[0].attachment.point;
      check('7', an && an.translation.every((v, k) => Math.abs(v - ap[k]) < 1e-4),
        `${row.label}: attachment translation ${JSON.stringify(an && an.translation)} != builder's ${JSON.stringify(ap)}`);

      /* 3 IN THE FILE, NOT ONLY IN THE BUILDER. The negative control put
         this here: the clause above reads `built.petals[].grid` and applies
         its OWN foot filter, so it could not see the EXPORT dropping a
         different number of rows — the drops-all-three-foot-rows mutation
         changed the .glb and left it green. The uniform-u property is a
         property of the FILE, so it is asserted against the file's own
         declared `u` list and against the u carried on each v-line. */
      const gm0 = json.meshes[p0.mesh];
      const fp = p0.extras.panels.find((x) => x.emitted && (x.label === 'full' || x.label === 'base'));
      check('3', !!fp, `${row.label}: the file declares no full/base panel`);
      if (fp) {
        check('3', fp.rows === NU_EXPECTED + 1, `${row.label}: the file declares ${fp.rows} rows, expected ${NU_EXPECTED + 1}`);
        check('3', p0.extras.footRowsDropped === 2, `${row.label}: the file says it dropped ${p0.extras.footRowsDropped} foot rows, expected 2`);
        /* The file's own list must be a valid ladder — strictly increasing
           from 0 to 1. /plot reads a point's station off this list rather
           than from its index (`plot-petal.js`'s own rule), so a list that
           disagreed with the emitted rows would silently misplace every
           bend on a warped petal. */
        let badU = null;
        for (let i = 1; i < fp.u.length; i++) {
          if (!(fp.u[i] > fp.u[i - 1])) { badU = `index ${i} u=${fp.u[i]} does not exceed ${fp.u[i - 1]}`; break; }
        }
        if (!badU && fp.u.length && fp.u[fp.u.length - 1] !== 1) badU = `the last declared station is ${fp.u[fp.u.length - 1]}, not 1`;
        check('3', badU === null, `${row.label}: the file's u list is not a valid ladder — ${badU}`);
        check('3', fp.u[0] === 0, `${row.label}: the file's first row is u=${fp.u[0]}, not the s = 0 foot row`);
        const vLineUs = gm0.primitives.filter((q) => q.extras && q.extras.kind === 'v' && q.extras.panel === fp.label).map((q) => q.extras.u);
        check('3', vLineUs.length === fp.u.length && vLineUs.every((u, i) => Math.abs(u - fp.u[i]) < 1e-9),
          `${row.label}: the emitted v-lines' u values disagree with the declared list`);
        /* The v-line at u = 0 must carry the FOOT's half-width, which is the
           whole content of "keep the s = 0 row": a file that kept a blade row
           instead would be uniform in u and wrong about the junction. */
        check('3', Math.abs(fp.halfWidthMm[0] - built.petalsAll[0].profile[built.petalsAll[0].footRows - 1]) < 1e-6,
          `${row.label}: the u = 0 row's half-width is not the foot's`);
      }

      /* One LINE_STRIP per column plus one per row, and a POINTS for the
         attachment — the partition, not just a count of primitives. */
      const gm = json.meshes[p0.mesh];
      const uL = gm.primitives.filter((q) => q.extras && q.extras.kind === 'u').length;
      const vL = gm.primitives.filter((q) => q.extras && q.extras.kind === 'v').length;
      check('5', gm.primitives.every((q) => q.mode === 3), `${row.label}: a grid primitive is not LINE_STRIP`);
      check('5', uL > 0 && vL > 0, `${row.label}: missing a line family (u=${uL}, v=${vL})`);
      const pm = p0.extras.panels.filter((x) => x.emitted);
      const wantU = pm.reduce((s, x) => s + x.cols, 0);
      const wantV = pm.reduce((s, x) => s + x.rows, 0);
      check('5', uL === wantU && vL === wantV, `${row.label}: line counts ${uL}/${vL} != declared ${wantU}/${wantV}`);
    }
  }

  /* THE BAR'S HEADROOM, MEASURED, not recited — and asserted in BOTH
     directions, because a separator that has stopped separating is worth
     nothing whichever side closed on it. */
  check('2d', pop.maxFlatRel < BEND_REL_BAR && (pop.bent === 0 || pop.minBentRel > BEND_REL_BAR),
    `the bend bar no longer separates its two populations: constant-normal rows reach `
    + `${pop.maxFlatRel.toExponential(3)} and varying-normal rows fall to ${pop.minBentRel.toExponential(3)}, `
    + `either side of ${BEND_REL_BAR.toExponential(0)}`);
  notes.push(`clause 2d: over ${pop.rows} rows — ${pop.bent} bent (least ${pop.bent ? pop.minBentRel.toExponential(3) : '—'} of chord, `
    + `least normal spread ${pop.bent ? pop.minSpread.toExponential(3) : '—'}), ${pop.flat} straight (worst `
    + `${pop.maxFlatRel.toExponential(3)} of chord); bar ${BEND_REL_BAR.toExponential(0)}; `
    + `straight rows with a varying normal ${pop.flatVarying} (reported, not asserted)`);

  /* ---- clause 2e: the rim record points at the artefact, and the buried tip ----
     TWO THINGS NEITHER THE ROWS LOOP NOR THE MUTANT TABLE CAN REACH.

     FIRST, 2a's NON-VACUITY. 2a says every captured boundary point is an
     emitted vertex. A tree whose inset had collapsed to zero everywhere would
     satisfy it trivially — the apex would be the skin's own mid point, the
     bead would be the flat wall again, and the silhouette claim would be true
     because nothing had been built. `{ captureRim: true }` is the builder's
     own answer to "which perimeter vertices did the treatment actually
     reach": `emitPanel` records an entry only where the apex is NOT the skin
     point, which is a branch on an exact zero and not a threshold. The entry
     carries the apex and the two points where the bead meets the skins, as
     the SAME arrays the mesh received, so all three are required present
     before the rim's own thickness is read off two of them.

     SECOND, THE BURIED TIP. Every one of the 19 states in ROWS builds a
     single 'full' panel that runs to the last row, so `tipBuried` is false on
     all of them and the branch 2a and 2b must both handle is unexercised
     there. A four-tooth fringe is the shipped control that produces one: a
     'base' panel ending five rows short of the ladder, under four 'tooth'
     panels that reach it. It is NOT in ROWS because its base panel is 51 rows
     where clause 3 requires NU + 1 = 57 — a state that would redden a clause
     it has nothing to do with. */
  {
    const RIM_ROWS = [
      { label: 'default', state: {}, mode: 'live' },
      { label: 'default (export)', state: {}, mode: 'export' },
      { label: 'all form', state: { petalRoll: 360, petalCup: 1.0, petalSpineCurl: 150, petalTwist: 180 }, mode: 'live' },
      { label: 'fringe x 4 (a buried base panel)', state: { petalTipEnd: 1, fringeCount: 4 }, mode: 'live' },
      { label: 'fringe x 4 (export)', state: { petalTipEnd: 1, fringeCount: 4 }, mode: 'export' },
    ];
    for (const r of RIM_ROWS) {
      const exportMode = r.mode === 'export';
      const state = { ...DEFAULTS, ...r.state };
      const plain = new MeshBuilder({ exportMode, captureGrid: true });
      buildBloomInto(plain, state);
      const acc = new MeshBuilder({ exportMode, captureGrid: true, captureRim: true });
      const built = buildBloomInto(acc, state);

      /* THE FLAG MOVES NO BYTE EITHER. Clause 1's question, asked of the
         other capture, because this one is new and nothing else asks it. */
      let moved = -1;
      if (plain.positions.length !== acc.positions.length) moved = -2;
      else for (let i = 0; i < plain.positions.length; i++) if (!Object.is(plain.positions[i], acc.positions[i])) { moved = i; break; }
      check('2e', moved === -1, `${r.label}: the rim capture moved float ${moved} (${moved === -2 ? 'triangle count differs' : `${plain.positions[moved]} vs ${acc.positions[moved]}`})`);

      const emitted = new Set();
      for (let i = 0; i < acc.positions.length; i += 3) emitted.add(key3(acc.positions[i], acc.positions[i + 1], acc.positions[i + 2]));
      const last = lastRowOf(built);
      const w = walkGrid(built, emitted, last);

      /* 2a and 2b again, here for the buried panel the ROWS table cannot
         build. Stated as the same two claims rather than weaker ones. */
      check('2a', w.apexMissing === 0, `${r.label}: ${w.apexMissing} of ${w.apexProbed} captured boundary mid points are not emitted bead apexes (first: ${w.apexFirst})`);
      check('2b', w.zeroMissing === 0, `${r.label}: ${w.zeroMissing} of ${w.zeroProbed} zero-ramp skin points are not among the emitted vertices (first: ${w.zeroFirst})`);
      check('2e', w.panelsBuried === (r.state.fringeCount ? built.petalsAll.filter((q) => q && q.grid).length : 0),
        `${r.label}: ${w.panelsBuried} panels have a buried tip, expected ${r.state.fringeCount ? 'one per petal' : 'none'} (panels: ${[...w.labels].join(', ')})`);

      /* The rim record: every treated vertex present, and naming the captured
         point it came from. The apex is looked up in the CAPTURE by (panel,
         row, column) rather than by value — an index that had drifted would
         still be a real point of the petal and would pass a value test.
         SAID PLAINLY: on this tree `rim.apex[n].apex` and the captured
         `mid[col]` are the SAME ARRAY OBJECT, so the value comparison is a
         tautology today and what the clause actually pins is the INDEXING —
         that the row and column the record names are the ones the point came
         from. It is here for the drift, not for a defect it can see now. */
      const byPanel = new Map();
      for (const q of built.petalsAll) {
        if (!q || !q.grid) continue;
        const m = new Map();
        for (const pan of q.grid) m.set(pan.label, pan);
        byPanel.set(q, m);
      }
      let treated = 0, missA = 0, missT = 0, missB = 0, mismatched = 0, minT = Infinity, maxT = 0, maxInset = 0, firstBad = null;
      for (const q of built.petalsAll) {
        if (!q || !q.rim) continue;
        for (const e of q.rim.apex) {
          treated++;
          if (!emitted.has(key3(e.apex[0], e.apex[1], e.apex[2]))) { missA++; if (!firstBad) firstBad = `apex ${e.panel} row ${e.row} col ${e.col}`; }
          if (!emitted.has(key3(e.top[0], e.top[1], e.top[2]))) { missT++; if (!firstBad) firstBad = `top ${e.panel} row ${e.row} col ${e.col}`; }
          if (!emitted.has(key3(e.bot[0], e.bot[1], e.bot[2]))) { missB++; if (!firstBad) firstBad = `bot ${e.panel} row ${e.row} col ${e.col}`; }
          /* GUARDED, not assumed: a rim entry naming a panel this petal has
             no capture for is a FINDING, and dereferencing it would take the
             run down instead of reporting one — this file's own lesson about
             a detail string that assumes its own premise. */
          const pm = byPanel.get(q);
          const pan = pm && pm.get(e.panel);
          const cap = pan && pan.rows[e.row - pan.rowFrom];
          const P = cap && cap.mid[e.col];
          if (!P || !Object.is(P[0], e.apex[0]) || !Object.is(P[1], e.apex[1]) || !Object.is(P[2], e.apex[2])) {
            mismatched++; if (!firstBad) firstBad = `${e.panel} row ${e.row} col ${e.col} is not the captured mid point there`;
          }
          const th = Math.hypot(e.top[0] - e.bot[0], e.top[1] - e.bot[1], e.top[2] - e.bot[2]);
          minT = Math.min(minT, th); maxT = Math.max(maxT, th);
          /* REPORTED, NOT BOUNDED, and the name matters: this is the apex's
             distance from the MIDPOINT of its own two skin meeting points, and
             at the two corners where the margin run hands over to the tip run
             the profile's skin point is a whole ladder gap away from its apex.
             It is not the inset, and calling it one would be a label naming a
             computation nobody performed. */
          const cx = (e.top[0] + e.bot[0]) / 2, cy = (e.top[1] + e.bot[1]) / 2, cz = (e.top[2] + e.bot[2]) / 2;
          maxInset = Math.max(maxInset, Math.hypot(e.apex[0] - cx, e.apex[1] - cy, e.apex[2] - cz));
        }
      }
      check('2e', treated > 0, `${r.label}: the builder recorded no treated perimeter vertex — clause 2a would be vacuous`);
      check('2e', missA + missT + missB === 0, `${r.label}: the rim record names ${missA + missT + missB} points that are not emitted vertices (apex ${missA}, top ${missT}, bot ${missB}; first: ${firstBad})`);
      check('2e', mismatched === 0, `${r.label}: ${mismatched} rim entries do not name the captured mid point at their own (panel, row, column) — first: ${firstBad}`);
      if (treated) {
        notes.push(`clause 2e: ${r.label} — ${treated} treated perimeter vertices, rim ${minT.toFixed(4)}..${maxT.toFixed(4)} mm thick, `
          + `widest apex-to-skin offset ${maxInset.toFixed(4)} mm (the corner profiles carry a whole ladder gap, not an inset), ${w.panelsBuried} buried / ${w.panelsExposed} exposed panels; `
          + `interior reconstructions surviving ${w.insidePresent}/${w.insideProbed}`);
      }
    }
  }

  /* ---- clause 4: the seam's law is continuous, and the frame step IS the tilt ---- */
  {
    const extreme = {
      ...DEFAULTS, petalRoll: 360, petalCup: 1.0, petalCupGradient: 1.0,
      petalRollTaper: 1.0, petalTwist: 180, petalSpineCurl: 360,
    };
    const f = petalForm(extreme, 8, 1.2);
    const T = [0, 1, 0], N = [0, 0, 1], C = [0, 0, 0];
    const s0 = f.sectAt(C, T, N, 8, 0);
    let off = 0;
    for (let j = 0; j < 10; j++) {
      const v = -1 + (2 * j) / 9;
      const q = s0(v);
      /* A straight segment along T through C: no component along N, and the
         normal is exactly N. Every form control is at maximum here. */
      off = Math.max(off, Math.abs(q.P[0]), Math.abs(q.P[2]), Math.abs(q.n[0]), Math.abs(q.n[1]), Math.abs(q.n[2] - 1));
    }
    check('4', off === 0, `sectAt at u = 0 is not exactly flatSect — max deviation ${off.toExponential(3)} with every form control at maximum`);
    notes.push(`clause 4: sectAt(u=0) deviation from a straight chord, all form at max = ${off.toExponential(1)}`);
  }
  {
    /* 4b — the frame step across the seam IS petalTilt, on a flat hub. Pinned
       so that a change moving the junction could not pass as "the grid is
       fine": the ruling to keep the s = 0 row was made knowing this step is
       the tilt and nothing else. 120 is here because the tilt range opened to
       it (Sep 19) and the new ceiling is past a RIGHT ANGLE, where the two
       normals' dot product goes negative — the one arithmetic the clause had
       never been handed. Measured exactly 120.000000 before it was added, as
       0 / 25 / 75 / 90 / 105 all are. */
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const nrm = (a) => Math.hypot(a[0], a[1], a[2]);
    for (const tilt of [0, 25, 75, 120]) {
      const acc = new MeshBuilder({ exportMode: false, captureGrid: true });
      const b = buildBloomInto(acc, { ...DEFAULTS, petalTilt: tilt });
      const g = b.petalsAll[0].grid[0].rows, nF = b.petalsAll[0].footRows;
      const a = g[nF - 1].normal[4], c = g[nF].normal[4];
      const deg = (Math.acos(Math.max(-1, Math.min(1, dot(a, c) / (nrm(a) * nrm(c))))) * 180) / Math.PI;
      check('4b', Math.abs(deg - tilt) < 1e-6, `frame step across the seam is ${deg.toFixed(4)} deg at petalTilt ${tilt} — expected exactly the tilt`);
      notes.push(`clause 4b: petalTilt ${tilt} -> seam frame step ${deg.toFixed(4)} deg`);
    }
  }

  /* ---- clause 6: the mode cannot be omitted ---- */
  {
    const acc = new MeshBuilder({ exportMode: false, captureGrid: true });
    const b = buildBloomInto(acc, { ...DEFAULTS });
    let threw = false;
    try { buildGridGltf(b, { state: {} }); } catch { threw = true; }
    check('6', threw, 'buildGridGltf accepted a build with no mode label');
    let threw2 = false;
    try { buildGridGltf(b, { mode: 'preview', state: {} }); } catch { threw2 = true; }
    check('6', threw2, 'buildGridGltf accepted a mode that is neither live nor export');
  }
  /* ---- clause 1b: an accumulator with no capture yields no grid ---- */
  {
    const acc = new MeshBuilder({ exportMode: false });
    const b = buildBloomInto(acc, { ...DEFAULTS });
    check('1b', b.petalsAll.every((p) => !p || p.grid === null), 'a petal carried a grid from an accumulator that was not asked to capture');
    let threw = false;
    try { buildGridGltf(b, { mode: 'live', state: {} }); } catch { threw = true; }
    check('1b', threw, 'buildGridGltf produced a file from a build with no captured grid');
  }
}

/* ------------------------------------------------------------------ */
/* THE MUTATIONS. Each names the clause it must break. `apply` must actually
   change the source — a mutation that silently matched nothing would make
   the whole negative control vacuous, so a no-op is a failure of the control
   itself, not a pass. */
const MUTANTS = [
  {
    id: 'capture-moves-a-byte', clause: '1', file: 'bloom-geometry.js',
    from: '    const t = tAt(row.u);',
    to: '    const t = acc.captureGrid ? tAt(row.u) * 1.0000001 : tAt(row.u);',
  },
  {
    /* RE-ANCHORED (the edge-profile session). Its site was
       `gm && (gm.v.push(v), gm.mid.push(P), gm.normal.push(n));`, one push per
       COLUMN inside the emission loop, and the rewrite that built the bead
       moved the capture to one push per ROW over arrays the boundary pass
       already holds. The negative control reported it as a vacuous mutation —
       a refactor disarming a mutant, which is the survivable half of that
       failure and only survivable because the control says so.
         IT ALSO CHANGED WHAT CATCHES IT. The old clause 2 caught it through
       the skin reconstruction, and that reconstruction is gone from every
       blade row. What catches it now are three clauses with three different
       owners: 2c rebuilds the row from `petalSurface` (the surface's own
       producer, not the capture's), 2d reads the captured MID points (which
       this mutation does not touch) and requires a bent section to carry more
       than one normal, and 2b catches the buried tip of the fringe's base
       panel, whose cross-section is curved where the foot's is not. It is NOT
       caught on the foot: at u = 0 `sectAt` IS `flatSect` (clause 4 measures
       that deviation as exactly 0), so the per-point normal and the row's own
       already agree there and the mutation moves nothing. */
    /* 2a IS CLAIMED HERE BECAUSE 2a's SUBJECT GREW, NOT BECAUSE THE MUTATION
       BROKE THE PAGE. 2a became an exhaustive disjunction when the edge
       profile landed — a captured boundary point is an emitted BEAD APEX, or
       (where the treatment never reached it) its two SKIN points are emitted —
       and that second half reconstructs `P +/- n * t / 2`, so it reads the
       stored normal. The apex half reads `P` alone and cannot be touched by a
       normal mutation, so every point this reddens is one that was passing on
       the wall half. Measured: 112 of 1072 per bloom, all at `row 0 u = 0` (the
       buried foot), and ONLY on `headRise 1.0`, `headRise 0.5 + form` and
       `SPHERE` — the rows where the row's normal and the per-column
       mid-surface normal actually differ. On a flat hub they agree and 2a stays
       silent. A true statement about the mutation, so it is declared. */
    id: 'grid-stores-the-row-normal', clause: ['2a', '2b', '2c', '2d'], file: 'bloom-geometry.js',
    from: 'mid: oP[k], normal: oN[k] });',
    to: 'mid: oP[k], normal: oN[k].map(() => rows[i].N) });',
  },
  {
    /* THE APEX IS RECOMPUTED INSTEAD OF PUSHED. `emitPanel` places the
       profile's apex by pushing the ORIGINAL boundary point onto it as
       itself; this rebuilds it as `C + (apex - C)`, which is the same point
       in real arithmetic and not the same double in IEEE-754. That is the
       whole content of clause 2a: the silhouette claim is an IDENTITY, and an
       apex within an ulp of the boundary is a silhouette that moved.
         THE PROBE STATE IS PART OF THE CLAIM. Measured on this gate's own
       table, over the perimeter 2a actually probes: the mutation moves 660 of
       36,850 apexes and fires on 16 of the 19 rows — and reads EXACTLY ZERO
       on all three EXPORT rows
       (`default (export)`, `all form (export)`, `thin sheet 0.60`), where the
       two roundings happen to cancel on every one of 1,008 points. So its
       witness is a LIVE row; a subset run that kept only the export rows
       would report it as a mutation that does nothing. The inner end cap
       contributes none of the 660 either, and that is the construction rather
       than luck: its ramp is exactly zero, so there the apex IS `C` and
       `C + (C - C)` hands back the same double. It is surgical
       otherwise: the capture, the skins and the rim record are untouched, so
       2b, 2c, 2d and clause 1 all stay green under it.
         IT NAMES 2e AS WELL, and that is a widening of the CLAIM rather than
       a loosening of a clause. The control caught it: 2e requires the apex the
       builder RECORDED on `rim.apex` to be an emitted vertex, and moving the
       emitted apex off the recorded one is exactly what this mutation does —
       a true statement about it, so it is declared rather than exempted. What
       is not allowed is a clause nobody claimed, which is why the run said so
       instead of passing. */
    id: 'the-bead-apex-is-recomputed', clause: ['2a', '2e'], file: 'bloom-geometry.js',
    /* RE-ANCHORED after the flat-profile branch landed between the two
       statements this used to match as one line. The anchor pre-check is what
       said so — it refused the whole run before any mutant executed, which is
       the survivable half of a refactor disarming a mutant. */
    from: 'pts[APEX] = apex;',
    to: 'pts[APEX] = [C[0] + (apex[0] - C[0]), C[1] + (apex[1] - C[1]), C[2] + (apex[2] - C[2])];',
  },
  {
    id: 'drops-all-three-foot-rows', clause: '3', file: 'bloom-grid-gltf.js',
    from: 'const FOOT_ROWS_DROPPED = 2;',
    to: 'const FOOT_ROWS_DROPPED = 3;\nconst _unused = 0;',
    also: { from: 'r.row >= footRows - 1', to: 'r.row >= footRows' },
  },
  {
    id: 'json-chunk-padded-with-nul', clause: '5', file: 'bloom-grid-gltf.js',
    from: 'for (let i = 0; i < jsonPad; i++) out[o++] = 0x20;',
    to: 'for (let i = 0; i < jsonPad; i++) out[o++] = 0x00;',
  },
  {
    id: 'metric-defaults-to-one', clause: '8', file: 'bloom-grid-gltf.js',
    from: 'metric: p.form ? { min: round(p.form.metricMin), max: round(p.form.metricMax) } : null,',
    to: 'metric: p.form ? { min: round(p.form.metricMin), max: round(p.form.metricMax) } : { min: 1, max: 1 },',
  },
  {
    /* BACK TO ONE PETAL PER RING — what this module read before the retention
       change, and what made a RADIAL bloom of eight petals export as one. The
       file is valid, the petal in it is correct, the census agrees with itself
       and the retention note explains the gap in prose. Only a count anchored
       to the BUILDER's own tally can tell. */
    id: 'the-exporter-keeps-one-petal-per-ring', clause: ['9', '7'], file: 'bloom-grid-gltf.js',
    from: '  const allPetals = built.petalsAll || built.petals;',
    to: '  const allPetals = built.petals;',
  },
  {
    id: 'mode-defaults-to-live', clause: '6', file: 'bloom-grid-gltf.js',
    from: "  if (mode !== 'live' && mode !== 'export') {",
    to: "  if (mode === undefined) mode = 'live';\n  if (false) {",
  },
];

async function negativeControl() {
  const SRC = ['bloom-geometry.js', 'bloom-grid-gltf.js', 'bloom-registry.js'];
  const problems = [];

  /* THE ANCHOR PRE-CHECK, OVER EVERY MUTANT, BEFORE ANY OF THEM RUNS.
     A refactor disarms a mutant in two ways and only one of them is loud. A
     `from` that has MOVED is reported by the run itself — that is how
     `grid-stores-the-row-normal` was found dead after the edge profile
     rewrote emitPanel's capture. A `from` that now matches TWICE is not: the
     run mutates the FIRST occurrence, the mutant still fires, and it is
     testing somewhere other than where it is described. So both are checked
     here, for ALL mutants rather than the ones about to run, in under a
     second rather than after a sweep. `also` is counted on the original
     source; no mutation in this table changes the other's site. */
  {
    const src = {};
    for (const f of SRC) src[f] = await readFile(join(ROOT, f), 'utf8');
    const hits = (f, t) => src[f].split(t).length - 1;
    for (const m of MUTANTS) {
      for (const [what, anchor] of [['from', m.from], ...(m.also ? [['also.from', m.also.from]] : [])]) {
        const n = hits(m.file, anchor);
        if (n !== 1) problems.push(`${m.id}: its ${what} anchor matches ${n} times in ${m.file} — the mutation would ${n === 0 ? 'not apply at all' : 'land on the first of ' + n + ' sites'}`);
      }
    }
    if (problems.length) return problems;
  }

  for (const m of MUTANTS) {
    const dir = mkdtempSync(join(tmpdir(), 'bloom-grid-neg-'));
    try {
      for (const f of SRC) copyFileSync(join(ROOT, f), join(dir, f));
      let src = await readFile(join(ROOT, m.file), 'utf8');
      if (!src.includes(m.from)) { problems.push(`${m.id}: the mutation site was not found in ${m.file} — the control is vacuous`); continue; }
      src = src.replace(m.from, m.to);
      if (m.also) {
        if (!src.includes(m.also.from)) { problems.push(`${m.id}: the second mutation site was not found — the control is vacuous`); continue; }
        src = src.replace(m.also.from, m.also.to);
      }
      writeFileSync(join(dir, m.file), src);

      fails.length = 0; notes.length = 0; checks = 0;
      const stamp = Date.now() + Math.random();
      try {
        await run(
          pathToFileURL(join(dir, 'bloom-geometry.js')).href + `?v=${stamp}`,
          pathToFileURL(join(dir, 'bloom-grid-gltf.js')).href + `?v=${stamp}`,
          pathToFileURL(join(dir, 'bloom-registry.js')).href + `?v=${stamp}`,
        );
      } catch (e) {
        fails.push(`threw: ${e.message}`);
      }
      /* `clause` MAY NAME SEVERAL, and that is a widening rather than a
         loosening. A mutation that genuinely breaks two clauses has to say
         both — the retention mutant below reddens clause 9 (the count against
         the builder's own tally) AND clause 7 (the file's own census against
         the same build), and both are true statements about it. What is not
         allowed is a mutation reddening a clause nobody claimed, which is a
         broken build wearing a negative control's coat. */
      const claimed = Array.isArray(m.clause) ? m.clause : [m.clause];
      const firedClauses = new Set(fails.map((f) => f.split(':')[0]));
      const missed = claimed.filter((c) => !firedClauses.has(c));
      const others = [...firedClauses].filter((c) => !claimed.includes(c) && !claimed.includes(c.replace(/b$/, '')));
      for (const c of missed) problems.push(`${m.id}: clause ${c} stayed GREEN under its own mutation`);
      if (others.length) problems.push(`${m.id}: also reddened unnamed clause(s) ${others.join(', ')} — the mutation is not surgical`);
      console.log(`  ${!missed.length && !others.length ? 'OK  ' : 'BAD '} ${m.id.padEnd(38)} clause ${claimed.join('+')}  fired: [${[...firedClauses].sort().join(' ')}]  (${fails.length} failures of ${checks} checks)`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
if (NEG) {
  console.log(`verify-bloom-grid --negative-control: ${MUTANTS.length} mutations, each naming the clause(s) it must break\n`);
  const problems = await negativeControl();
  console.log('');
  if (problems.length) {
    console.log(`NEGATIVE CONTROL FAILED (${problems.length}):`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('NEGATIVE CONTROL PASSED — every mutation reddened the clause it named, and nothing else.');
} else {
  await run(
    pathToFileURL(join(ROOT, 'bloom-geometry.js')).href,
    pathToFileURL(join(ROOT, 'bloom-grid-gltf.js')).href,
    pathToFileURL(join(ROOT, 'bloom-registry.js')).href,
  );
  for (const n of notes) console.log(`  ${n}`);
  console.log('');
  if (fails.length) {
    console.log(`FAIL — ${fails.length} of ${checks} checks:`);
    for (const f of fails) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`PASS — ${checks} checks over ${ROWS.length} rows, plus the five states clause 2e builds of its own (two of them a fringe, for the buried tip ROWS cannot reach).`);
  console.log('Blind to: the browser path, the base commit (that is diff-bloom-bytes), a spec');
  console.log('violation shared by the writer and this validator, extra grid points that');
  console.log('correspond to nothing emitted, and a defect inside petalSurface itself —');
  console.log('clause 2c calls it a second time, so such a defect moves both sides together.');
}
