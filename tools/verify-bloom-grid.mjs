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
     2  THE GRID IS THE MESH'S OWN MID-SURFACE. Every captured point is
        re-offset by its own normal and half-thickness and required to be
        present EXACTLY (shortest-round-trip string, not a tolerance) among
        the emitted vertices. This is what makes "the grid describes the
        exported solid" a measurement rather than a claim about shared code.
        Blind to the ROW/COLUMN partition being scrambled; clause 3 is that.
     3  THE ROWS ARE UNIFORM IN u AFTER THE FOOT DROP. Exactly 0, 1/NU ... 1,
        and exactly NU+1 of them. Blind to the points being wrong.
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
     - Clause 2 is a membership test. A grid carrying EXTRA points that
       correspond to nothing emitted would pass it.

   RUN:  node tools/verify-bloom-grid.mjs
         node tools/verify-bloom-grid.mjs --negative-control
   The negative control re-imports six deliberately broken copies of the two
   source files and FAILS if a mutation does not apply, if the clause it
   names stays green, or if a clause it did not name goes red — which is how
   a mutation that just breaks everything gets caught pretending to be a
   negative control.
   =================================================================== */
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  const { MeshBuilder, buildBloomInto, petalForm } = await import(geomUrl);
  const { buildGridGltf } = await import(gltfUrl);
  const { DEFAULTS } = await import(registryUrl);

  const NU_EXPECTED = 28;   // read back from the emitted rows below, never assumed

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

    /* ---- clause 2: the grid is the mesh's own mid-surface ---- */
    const emitted = new Set();
    for (let i = 0; i < accOn.positions.length; i += 3) {
      emitted.add(key3(accOn.positions[i], accOn.positions[i + 1], accOn.positions[i + 2]));
    }
    let missing = 0, probed = 0, firstMiss = null;
    for (const p of built.petals) {
      if (!p || !p.grid) continue;
      for (const panel of p.grid) {
        for (const r of panel.rows) {
          for (let j = 0; j < r.mid.length; j++) {
            const P = r.mid[j], n = r.normal[j], t = r.thickness;
            for (const s of [+1, -1]) {
              probed++;
              const k = key3(P[0] + n[0] * s * t / 2, P[1] + n[1] * s * t / 2, P[2] + n[2] * s * t / 2);
              if (!emitted.has(k)) { missing++; if (!firstMiss) firstMiss = `u=${r.u} v=${r.v[j]} side=${s}`; }
            }
          }
        }
      }
    }
    check('2', missing === 0, `${row.label}: ${missing} of ${probed} reconstructed skin points are not among the emitted vertices (first: ${firstMiss})`);
    check('2', probed > 0, `${row.label}: nothing was probed — the capture produced no grid`);

    /* ---- clause 3: rows uniform in u after the foot drop ---- */
    for (const p of built.petals) {
      if (!p || !p.grid) continue;
      const base = p.grid.find((g) => g.label === 'full' || g.label === 'base');
      if (!base) continue;
      const kept = base.rows.filter((r) => r.row >= p.footRows - 1);
      check('3', kept.length === NU_EXPECTED + 1, `${row.label}: ${kept.length} rows after the foot drop, expected ${NU_EXPECTED + 1}`);
      let bad = null;
      for (let i = 0; i < kept.length; i++) {
        const want = i / NU_EXPECTED;
        if (Math.abs(kept[i].u - want) > 1e-12) { bad = `row ${i} u=${kept[i].u} want ${want}`; break; }
      }
      check('3', bad === null, `${row.label}: rows are not uniform in u — ${bad}`);
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

    const emittedPetals = built.petals.filter((p) => p && p.grid).length;
    check('7', json && json.asset.extras.petalsEmitted === emittedPetals, `${row.label}: petalsEmitted disagrees with the build`);
    check('7', json && json.asset.extras.petalsBuilt === built.petalsBuilt, `${row.label}: petalsBuilt disagrees with the build`);
    check('7', json && typeof json.asset.extras.retentionNote === 'string' && json.asset.extras.retentionNote.length > 0,
      `${row.label}: no retention note`);

    const p0 = json && json.nodes.find((n) => n.name === 'petal_0');
    check('7', !!p0, `${row.label}: no petal_0 node`);
    if (p0) {
      const anyForm = built.petals.find((p) => p && p.grid && p.form);
      const hasForm = !!(built.petals[0] && built.petals[0].form);
      /* NULL WHEN FLAT, A NUMBER WHEN NOT — both directions, because a
         constant 1.0 would satisfy the first half of this on every row that
         happens to be flat. */
      check('8', hasForm ? (p0.extras.metric && typeof p0.extras.metric.min === 'number') : p0.extras.metric === null,
        `${row.label}: metric is ${JSON.stringify(p0.extras.metric)} on a ${hasForm ? 'formed' : 'flat'} build`);
      check('8', hasForm ? (p0.extras.polyline && typeof p0.extras.polyline.min === 'number') : p0.extras.polyline === null,
        `${row.label}: polyline is ${JSON.stringify(p0.extras.polyline)} on a ${hasForm ? 'formed' : 'flat'} build`);
      if (hasForm) {
        check('8', Math.abs(p0.extras.metric.min - built.petals[0].form.metricMin) < 1e-5
          && Math.abs(p0.extras.metric.max - built.petals[0].form.metricMax) < 1e-5,
          `${row.label}: metric in the file disagrees with the builder's own telemetry`);
      }
      if (anyForm) notes.push(`${row.label}: metric ${anyForm.form.metricMin.toFixed(4)}..${anyForm.form.metricMax.toFixed(4)}`);

      /* The attachment node's translation IS the builder's attachment point,
         at float32. */
      const an = json.nodes[p0.children[0]];
      const ap = built.petals[0].attachment.point;
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
        let badU = null;
        for (let i = 0; i < fp.u.length; i++) {
          if (Math.abs(fp.u[i] - i / NU_EXPECTED) > 1e-6) { badU = `index ${i} u=${fp.u[i]} want ${i / NU_EXPECTED}`; break; }
        }
        check('3', badU === null, `${row.label}: the file's u list is not uniform — ${badU}`);
        check('3', fp.u[0] === 0, `${row.label}: the file's first row is u=${fp.u[0]}, not the s = 0 foot row`);
        const vLineUs = gm0.primitives.filter((q) => q.extras && q.extras.kind === 'v' && q.extras.panel === fp.label).map((q) => q.extras.u);
        check('3', vLineUs.length === fp.u.length && vLineUs.every((u, i) => Math.abs(u - fp.u[i]) < 1e-9),
          `${row.label}: the emitted v-lines' u values disagree with the declared list`);
        /* The v-line at u = 0 must carry the FOOT's half-width, which is the
           whole content of "keep the s = 0 row": a file that kept a blade row
           instead would be uniform in u and wrong about the junction. */
        check('3', Math.abs(fp.halfWidthMm[0] - built.petals[0].profile[built.petals[0].footRows - 1]) < 1e-6,
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
       the tilt and nothing else. */
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const nrm = (a) => Math.hypot(a[0], a[1], a[2]);
    for (const tilt of [0, 25, 75]) {
      const acc = new MeshBuilder({ exportMode: false, captureGrid: true });
      const b = buildBloomInto(acc, { ...DEFAULTS, petalTilt: tilt });
      const g = b.petals[0].grid[0].rows, nF = b.petals[0].footRows;
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
    check('1b', b.petals.every((p) => !p || p.grid === null), 'a petal carried a grid from an accumulator that was not asked to capture');
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
    id: 'grid-stores-the-row-normal', clause: '2', file: 'bloom-geometry.js',
    from: 'gm && (gm.v.push(v), gm.mid.push(P), gm.normal.push(n));',
    to: 'gm && (gm.v.push(v), gm.mid.push(P), gm.normal.push(row.N));',
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
    id: 'mode-defaults-to-live', clause: '6', file: 'bloom-grid-gltf.js',
    from: "  if (mode !== 'live' && mode !== 'export') {",
    to: "  if (mode === undefined) mode = 'live';\n  if (false) {",
  },
];

async function negativeControl() {
  const SRC = ['bloom-geometry.js', 'bloom-grid-gltf.js', 'bloom-registry.js'];
  const problems = [];
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
      const firedClauses = new Set(fails.map((f) => f.split(':')[0]));
      const named = firedClauses.has(m.clause);
      const others = [...firedClauses].filter((c) => c !== m.clause && c !== m.clause + 'b');
      if (!named) problems.push(`${m.id}: clause ${m.clause} stayed GREEN under its own mutation`);
      /* A mutation that reddens clauses it did not name is not a negative
         control, it is a broken build wearing one. `threw` is allowed only
         for the mode mutant, whose whole point is that nothing throws. */
      if (others.length) problems.push(`${m.id}: also reddened unnamed clause(s) ${others.join(', ')} — the mutation is not surgical`);
      console.log(`  ${named && !others.length ? 'OK  ' : 'BAD '} ${m.id.padEnd(30)} clause ${m.clause}  fired: [${[...firedClauses].sort().join(' ')}]  (${fails.length} failures of ${checks} checks)`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
if (NEG) {
  console.log('verify-bloom-grid --negative-control: six mutations, each naming the clause it must break\n');
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
  console.log(`PASS — ${checks} checks over ${ROWS.length} rows.`);
  console.log('Blind to: the browser path, the base commit (that is diff-bloom-bytes), a spec');
  console.log('violation shared by the writer and this validator, and extra grid points that');
  console.log('correspond to nothing emitted.');
}
