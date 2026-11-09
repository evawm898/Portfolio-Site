#!/usr/bin/env node
/* verify-cage.mjs — the /cage geometry gate (Node only, no browser).

   Every preset at its defaults and `--seeds N` random cages (default 24) are
   built through the shipped cage-geometry.js and judged on the ARTEFACT: the
   STL's bytes (frame-relief's analyzeStl, boundary edges 0), every part's own
   edge census (closed), a voxel flood fill (ONE piece), the floor on every
   emitted wire, the door cut read off the emitted bars against the emitted
   frame, the polygon's corners, the rings' placement, the mitre's stretch,
   the SVG's census, and byte determinism.

   PHASE 2 (the B family): the ring bands — on the rings the control names (B1), snapped to
   the bars (B2), fused along the run at Eva's 1.8 r / a laurel pitch of ½–¾ (B3), fused to
   their ring (B4) and to every bar they cross (B5, a ray-parity point inside both solids),
   floored and proud of their ring (B6), clear of the door (B7), drawn in the SVG (B8), lying
   on the cage's own shape restated from the control (B9), and inert when off (B0).

   `--negative-control` serves twenty-three mutants of cage-geometry.js and requires
   each to redden exactly the clauses it names (and nothing else); every
   anchor is checked before any mutant runs.

   WHAT IT CANNOT SEE: whether the cage LOOKS antique (the ruling sheet's),
   and anything about the page (verify-cage-page.mjs's). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const SEEDS = args.includes('--seeds') ? +args[args.indexOf('--seeds') + 1] : 24;
const MOD = args.includes('--module') ? args[args.indexOf('--module') + 1] : null;
// --mutant=a,b runs only those mutants (every anchor is still checked first); the run says it is a subset
const ONLY = (args.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);

const { analyzeStl } = await import(path.join(ROOT, 'frame-relief.js'));
// the profile's own law (bloom-curve.js, the CONTROL's owner) — B9 restates the surface from the control's points with it
const { curveFunction } = await import(path.join(ROOT, 'bloom-curve.js'));

/* ---- instruments that read the artefact and share no code with the builder ---- */
function partClosed(mesh, q) {
  // every edge of the part's triangles carried by exactly two of them, in opposite directions
  const I = mesh.indices, P = mesh.positions, key = (i) => `${P[3 * i]},${P[3 * i + 1]},${P[3 * i + 2]}`;
  const dir = new Map();
  for (let t = q.t0; t < q.t1; t++) {
    const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]].map(key);
    for (let k = 0; k < 3; k++) { const e = `${v[k]}|${v[(k + 1) % 3]}`; dir.set(e, (dir.get(e) || 0) + 1); }
  }
  let bad = 0;
  for (const [e, n] of dir) { const [a, b] = e.split('|'); if (n !== 1 || dir.get(`${b}|${a}`) !== 1) bad++; }
  return bad;
}
function voxelRegions(mesh, cell) {
  const P = mesh.positions, I = mesh.indices;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); }
  const nx = Math.ceil((x1 - x0) / cell) + 3, ny = Math.ceil((y1 - y0) / cell) + 3, nz = Math.ceil((z1 - z0) / cell) + 3;
  const vox = new Uint8Array(nx * ny * nz);
  const mark = (x, y, z) => { vox[(Math.floor((z - z0) / cell) + 1) * nx * ny + (Math.floor((y - y0) / cell) + 1) * nx + Math.floor((x - x0) / cell) + 1] = 1; };
  const step = cell * 0.5;
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    const L = Math.max(Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]), Math.hypot(P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]), Math.hypot(P[c] - P[b], P[c + 1] - P[b + 1], P[c + 2] - P[b + 2]));
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const u = i / n, v = j / n, w = 1 - u - v; mark(w * P[a] + u * P[b] + v * P[c], w * P[a + 1] + u * P[b + 1] + v * P[c + 1], w * P[a + 2] + u * P[b + 2] + v * P[c + 2]); }
  }
  const lab = new Int32Array(vox.length), q = new Int32Array(vox.length);
  let comps = 0; const sizes = [];
  for (let s = 0; s < vox.length; s++) {
    if (!vox[s] || lab[s]) continue;
    comps++; let h = 0, tl = 0; q[tl++] = s; lab[s] = comps;
    while (h < tl) { const c = q[h++]; for (const d of [1, -1, nx, -nx, nx * ny, -nx * ny]) { const m = c + d; if (m >= 0 && m < vox.length && vox[m] && !lab[m]) { lab[m] = comps; q[tl++] = m; } } }
    sizes.push(tl);
  }
  return { comps, sizes: sizes.sort((a, b) => b - a) };
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/* POINT IN A CLOSED PART: ray parity (Möller–Trumbore) over the part's own triangles, along an
   irrational direction so no edge or vertex is grazed. The fusion witness: a point inside a band
   element AND inside the wire it must fuse to means the two solids overlap — not merely touch. */
function insidePart(mesh, q, Q) {
  const P = mesh.positions, I = mesh.indices, d = [0.5773, 0.3321, 0.7458];
  let hits = 0;
  for (let t = q.t0; t < q.t1; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(det) < 1e-14) continue;
    const f = 1 / det, sv = [Q[0] - P[a], Q[1] - P[a + 1], Q[2] - P[a + 2]];
    const u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]); if (u < 0 || u > 1) continue;
    const qq = [sv[1] * e1[2] - sv[2] * e1[1], sv[2] * e1[0] - sv[0] * e1[2], sv[0] * e1[1] - sv[1] * e1[0]];
    const v = f * (d[0] * qq[0] + d[1] * qq[1] + d[2] * qq[2]); if (v < 0 || u + v > 1) continue;
    if (f * (e2[0] * qq[0] + e2[1] * qq[1] + e2[2] * qq[2]) > 1e-12) hits++;
  }
  return hits % 2 === 1;
}
const partVerts = (mesh, q) => { const P = mesh.positions, out = []; for (let v = q.v0; v < q.v1; v++) out.push([P[3 * v], P[3 * v + 1], P[3 * v + 2]]); return out; };
const bbox = (vs) => vs.reduce((b, v) => [Math.min(b[0], v[0]), Math.min(b[1], v[1]), Math.min(b[2], v[2]), Math.max(b[3], v[0]), Math.max(b[4], v[1]), Math.max(b[5], v[2])], [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
const inBox = (b, Q, m = 0) => Q[0] >= b[0] - m && Q[0] <= b[3] + m && Q[1] >= b[1] - m && Q[1] <= b[4] + m && Q[2] >= b[2] - m && Q[2] <= b[5] + m;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/* the bar's centreline at height z, interpolated along the emitted polyline (null where the bar does not reach z) */
const barAt = (pts, z) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if ((a[2] - z) * (b[2] - z) <= 0 && a[2] !== b[2]) { const t = (z - a[2]) / (b[2] - a[2]); return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), z]; } } return null; };
/* Eva's rulings and this gate's own restatements — never imported from the builder */
const RULED_BEAD_FUSE = 1.8;                 // frame §15.0: beading fused at ≤ 1.8 r
const RULED_LEAF_PITCH = [0.5, 0.75];        // frame §15: a laurel run's pitch, × the leaf
const RESTATED_OVER_RING = 1.25;             // a band element stands 1.25 × proud of its ring (cage §8)

const nearestOnPolyline = (q, pts) => { let best = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1; let t = ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, dist(q, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t])); } return best; };

/* ---- the run ---- */
async function run(modulePath, { quiet = false } = {}) {
  const G = await import(`${modulePath}?${Date.now()}`);
  const fails = [], out = [];
  const check = (name, ok, detail = '') => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const cases = G.PRESET_IDS.map((id) => ({ label: `preset ${id}`, params: G.applyPreset(G.defaultParams(), id) }));
  for (let s = 1; s <= SEEDS; s++) cases.push({ label: `seed ${s}`, params: G.randomParams(s) });
  // phase 2: every preset in each band style, the ring selections, a bead under its ring, the fuse cap at its edge
  for (const st of ['beading', 'leaf']) for (const id of G.PRESET_IDS) cases.push({ label: `${st} on ${id}`, params: { ...G.applyPreset(G.defaultParams(), id), bandStyle: st, bandRings: 'all' } });
  for (const on of ['inner', 'ends', 'top']) cases.push({ label: `beading on the bell, ${on}`, params: { ...G.defaultParams(), bandStyle: 'beading', bandRings: on } });
  cases.push({ label: 'beads asked under their ring (1.5 mm)', params: { ...G.defaultParams(), bandStyle: 'beading', beadMm: 1.5 } });
  cases.push({ label: 'beading at the widest spacing (0.90)', params: { ...G.defaultParams(), bandStyle: 'beading', bandSpacing: 0.9 } });
  cases.push({ label: 'leaf run at the widest spacing (0.90)', params: { ...G.defaultParams(), bandStyle: 'leaf', bandSpacing: 0.9 } });

  // C0 the registry and the presets
  const ids = new Set(G.PARAM_SPEC.map((s) => s.id));
  check('C0 every preset names only registry fields and holds a profile the spec accepts', G.PRESET_IDS.every((id) => Object.keys(G.PRESETS[id]).every((k) => k === 'profile' || ids.has(k)) && G.PRESETS[id].profile && G.PRESETS[id].profile.mode === 'single'));
  check('C0b the default state is the bell preset (90 × 140, dome 0.6, 1.1 mm bars — Eva, Oct 29)', G.DEFAULTS.preset === 'bell' && G.DEFAULTS.widthMm === 90 && G.DEFAULTS.heightMm === 140 && G.DEFAULTS.topHeight === 0.6 && G.DEFAULTS.barMm === 1.1 && Object.keys(G.PRESETS.bell).filter((k) => k !== 'profile').every((k) => G.DEFAULTS[k] === G.PRESETS.bell[k]) && G.DEFAULTS.profile === G.PRESETS.bell.profile);
  check('C0c every registry slider default agrees with the default preset (one owner, not two)', G.PARAM_SPEC.filter((s) => s.id in G.PRESETS.bell).every((s) => s.default === G.PRESETS.bell[s.id]));
  check('C0d the default bar sits at or above the print floor, so no floor binds on it', G.DEFAULTS.barMm >= G.MIN_FEATURE_MM && G.PRESET_IDS.every((id) => G.PRESETS[id].barMm === 1.1));
  check('C0e the onion carries a ring in its neck taper (the upper of three, at 0.75 H)', G.PRESETS.onion.ringCount === 3);

  let sumTris = 0, worstFloor = Infinity;
  for (const cs of cases) {
    let m; try { m = G.buildCage(cs.params); } catch (e) { check(`C1 ${cs.label} builds`, false, String(e && e.message || e)); continue; }
    sumTris += m.info.triangles;
    const stl = G.exportStl(m);
    const a = analyzeStl(stl);
    check(`C1 ${cs.label} STL watertight (boundary edges 0)`, a.boundary === 0, `boundary ${a.boundary}, nonManifold ${a.nonManifold}, ${m.info.triangles} tris`);
    const open = m.mesh.parts.map((q) => partClosed(m.mesh, q)).filter((n) => n > 0).length;
    check(`C2 ${cs.label} every part is its own closed shell`, open === 0, `${open} of ${m.mesh.parts.length} parts carry an unmatched directed edge`);
    const vr = voxelRegions(m.mesh, 1.0);
    check(`C3 ${cs.label} is ONE piece (voxel flood fill at 1.0 mm)`, vr.comps === 1, `${vr.comps} regions${vr.comps > 1 ? ', sizes ' + vr.sizes.slice(0, 4).join('/') : ''}`);
    const floor = Math.max(G.MIN_FEATURE_MM, cs.params.minFeature || 0);
    const under = m.wires.filter((w) => !w.drawOnly && 2 * w.r < floor - 1e-9).length;
    worstFloor = Math.min(worstFloor, ...m.wires.filter((w) => !w.drawOnly).map((w) => 2 * w.r));
    check(`C4 ${cs.label} every emitted wire is at or above the ${floor.toFixed(1)} mm floor`, under === 0, `${under} under`);
    // the door: a bar's cut end lies ON the frame wire; no bar passes through the opening
    if (m.info.door) {
      const frame = m.wires.find((w) => w.kind === 'door');
      const ends = [];
      for (const w of m.wires) if (w.kind === 'bar' || w.kind === 'ring' || w.kind === 'frame') for (const e of [w.pts[0], w.pts[w.pts.length - 1]]) {
        if (w.closed) continue;
        const atBase = Math.abs(e[2]) < 1e-6, atTop = Math.abs(e[2] - cs.params.heightMm) < 1e-6 || e[2] > cs.params.heightMm - 1e-6;
        if (atBase || atTop) continue;
        ends.push(nearestOnPolyline(e, [...frame.pts, frame.pts[0]]));
      }
      const off = ends.filter((d) => d > frame.r + 1e-6).length;
      check(`C5 ${cs.label} every bar and ring cut by the door ends ON its frame wire (${ends.length} ends)`, ends.length > 0 && off === 0, `${off} ends off the frame`);
      // C5c NO SAMPLE of any bar or ring lies inside the opening — the opening restated from the EMITTED frame
      // wire alone (a point-in-polygon test in (arc, z) about the door's own mean radius), never from the builder's law
      const fr = frame.pts, rhoF = fr.reduce((s, q) => s + Math.hypot(q[0], q[1]), 0) / fr.length;
      const thF = fr.reduce((s, q) => s + Math.atan2(q[1], q[0]), 0) / fr.length;
      const arcOf = (q) => Math.atan2(Math.sin(Math.atan2(q[1], q[0]) - thF), Math.cos(Math.atan2(q[1], q[0]) - thF)) * rhoF;
      const poly = fr.map((q) => [arcOf(q), q[2]]);
      const inPoly = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
      const edgeDist = (x, y) => { let b = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; const dx = xj - xi, dy = yj - yi, l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / l2)); b = Math.min(b, Math.hypot(x - xi - dx * t, y - yi - dy * t)); } return b; };
      let intruders = 0;
      for (const w of m.wires) if (w.kind === 'bar' || w.kind === 'ring' || w.kind === 'frame') for (const q of w.pts) { const x = arcOf(q), y = q[2]; if (inPoly(x, y) && edgeDist(x, y) > frame.r + 1e-6) intruders++; }
      check(`C5c ${cs.label} no bar or ring sample lies inside the door opening (restated from the emitted frame)`, intruders === 0, `${intruders} inside`);
      // and the door is not empty of cuts: at least two bars were cut (a door narrower than a bar pitch would be a different design)
      const cutBars = m.wires.filter((w) => w.kind === 'bar' && !w.closed && w.pts.some((q) => Math.abs(q[2] - cs.params.heightMm) < 1e-6)).length;
      check(`C5b ${cs.label} the door cuts through bars (bars reaching the top but not the base: ${cutBars})`, cutBars >= 1);
    }
    // the polygon: bars a multiple of N, every corner carrying one
    const N = +cs.params.sides | 0;
    if (N) {
      const az = m.wires.filter((w) => w.kind === 'bar').map((w) => Math.atan2(w.pts[0][1], w.pts[0][0]));
      const corners = Array.from({ length: N }, (_, k) => 2 * Math.PI * k / N);
      const hit = corners.every((c) => az.some((t) => Math.abs(Math.atan2(Math.sin(t - c), Math.cos(t - c))) < 1e-6));
      check(`C6 ${cs.label} ${N}-gon: ${m.info.barCount} bars, a multiple of ${N}, every corner carrying one`, m.info.barCount % N === 0 && hit);
      // the mitre: a corner section is stretched by 1 / cos(π/N) along the bend — read off the base ring's own vertices
      const base = m.mesh.parts.find((q) => q.name === 'base ring'), P = m.mesh.positions;
      const r = m.wires.find((w) => w.kind === 'frame').r, R = Math.hypot(...m.wires.find((w) => w.kind === 'frame' && w.closed).pts[0].slice(0, 2));
      let maxOut = 0; for (let v = base.v0; v < base.v1; v++) maxOut = Math.max(maxOut, Math.hypot(P[3 * v], P[3 * v + 1]));
      check(`C7 ${cs.label} the ring's corner section is the elliptical mitre (reach R + r/cos(π/N))`, Math.abs(maxOut - (R + r / Math.cos(Math.PI / N))) < 1e-6, `${maxOut.toFixed(4)} vs ${(R + r / Math.cos(Math.PI / N)).toFixed(4)}`);
    }
    // rings: the count, and clustered ones sit nearer the ends than even ones would
    const loops = m.wires.filter((w) => w.kind === 'ring' || w.kind === 'frame');
    const zs = [...new Set(loops.map((w) => +w.pts[0][2].toFixed(6)))];
    // ruling 5: every profile SHOULDER (restated here from the CONTROL's own points by the chord law) carries a ring,
    // and the ring count is the asked count plus the shoulders that landed clear of one (within 1e-6 of a shoulder = its own)
    const Rb = cs.params.widthMm / 2, Hb = cs.params.heightMm, pp = cs.params.profile.points;
    const shoulders = []; for (let i = 1; i < pp.length - 1; i++) { const a0 = Math.atan2(Rb * (pp[i][1] - pp[i - 1][1]), Hb * (pp[i][0] - pp[i - 1][0])), a1 = Math.atan2(Rb * (pp[i + 1][1] - pp[i][1]), Hb * (pp[i + 1][0] - pp[i][0])); if (Math.abs(a1 - a0) * 180 / Math.PI >= G.SHOULDER_DEG - 1e-9) shoulders.push(Hb * pp[i][0]); }
    const rRingE = Math.max(floor, cs.params.ringMm) / 2, rFrameE = Math.max(floor, cs.params.ringMm * cs.params.frameRingMult) / 2, nearRing = Math.max(3 * rRingE, 2 * rFrameE + rRingE);
    const own = shoulders.filter((sz) => zs.some((z) => Math.abs(z - sz) < 1e-6)).length;
    check(`C8 ${cs.label} ring heights: base, top, ${cs.params.ringCount} between and ${own} of ${shoulders.length} shoulder${shoulders.length === 1 ? '' : 's'}`, zs.length === cs.params.ringCount + 2 + own, `${zs.length}`);
    if (shoulders.length) check(`C8c ${cs.label} every profile shoulder carries a ring within ${nearRing.toFixed(2)} mm (restated from the control's chords)`, shoulders.every((sz) => zs.some((z) => Math.abs(z - sz) < nearRing)) && m.told.some((t) => /shoulder/.test(t)));
    if (cs.params.ringPlace === 'clustered' && cs.params.ringCount >= 2) {
      const inner = m.info.ringZ, even = cs.params.heightMm / (cs.params.ringCount + 1);
      check(`C8b ${cs.label} clustered rings sit closer to the ends than even spacing`, inner[0] < even - 1e-9 && inner[inner.length - 1] > cs.params.heightMm - even + 1e-9);
    }
    // the top: converging bars reach the collar; bars ending at the ring leave ribs
    if (cs.params.topShape !== 'flat') {
      if (cs.params.barsConverge && !(+cs.params.sides | 0)) {
        // ruling 1: neighbouring bars meet the collar ONE PRINTABLE GAP apart — the chord between the bars' last
        // cap stations (the point before the bury) against the pitch 2·rBar + floor, restated from the controls
        const B = m.info.barCount, ends = m.wires.filter((w) => w.kind === 'bar' && w.pts[w.pts.length - 1][2] > cs.params.heightMm).map((w) => w.pts[w.pts.length - 2]);
        const pitch = Math.max(floor, cs.params.barMm) + floor, sinc = Math.sin(Math.PI / B) / (Math.PI / B);
        let worst = Infinity; for (const e of ends) { const th = Math.atan2(e[1], e[0]); const nb = ends.find((q) => q !== e && Math.abs(Math.atan2(Math.sin(Math.atan2(q[1], q[0]) - th - 2 * Math.PI / B), Math.cos(Math.atan2(q[1], q[0]) - th - 2 * Math.PI / B))) < 1e-6); if (nb) worst = Math.min(worst, Math.hypot(nb[0] - e[0], nb[1] - e[1], nb[2] - e[2])); }
        check(`C9b ${cs.label} neighbouring bars meet the collar one printable gap apart (${worst.toFixed(3)} mm chord against a ${pitch.toFixed(2)} mm pitch)`, ends.length >= 2 && worst >= pitch * sinc - 1e-6 && worst <= pitch + 1e-6);
      }
      if (cs.params.barsConverge) check(`C9 ${cs.label} bars converge: no ribs, every bar's top end inside the collar`, m.info.ribCount === 0 && m.wires.filter((w) => w.kind === 'bar').every((w) => w.pts[w.pts.length - 1][2] <= cs.params.heightMm + 1e-6 || Math.hypot(w.pts[w.pts.length - 1][0], w.pts[w.pts.length - 1][1]) <= m.info.collar.rc + 1e-6));
      else check(`C9 ${cs.label} bars end at the top ring: ${m.info.ribCount} ribs (about half the bars), told`, m.info.ribCount >= Math.floor(m.info.barCount / 2) - 1 && m.info.ribCount <= Math.ceil(m.info.barCount / 2) + (+cs.params.sides | 0) && m.told.some((t) => /ribs carry/.test(t)) && m.wires.filter((w) => w.kind === 'rib').length === m.info.ribCount);
    } else check(`C9 ${cs.label} flat top: spokes and a hub, told`, m.wires.some((w) => w.kind === 'spoke') && m.told.some((t) => /spokes/.test(t)));
    // ruling 9: the skirt's cusps (the shallowest points of its edge) sit ON bars, and their count divides the bar count
    if (cs.params.baseStyle === 'skirt') {
      const sk = m.wires.find((w) => w.kind === 'skirt'), e = sk.pts.slice(0, -1), n = e.length;
      const cusps = []; for (let i = 0; i < n; i++) { const z = e[i][2], zp = e[(i + n - 1) % n][2], zn = e[(i + 1) % n][2]; if (z > zp + 1e-9 && z >= zn - 1e-9 && !(z > zp && Math.abs(z - zn) < 1e-9 && cusps.length && cusps[cusps.length - 1] === (i + n - 1) % n)) cusps.push(i); }
      const barAz = m.wires.filter((w) => w.kind === 'bar').map((w) => Math.atan2(w.pts[0][1], w.pts[0][0]));
      const onBar = cusps.every((i) => { const th = Math.atan2(e[i][1], e[i][0]); return barAz.some((b) => Math.abs(Math.atan2(Math.sin(b - th), Math.cos(b - th))) < 1e-6); });
      const asked = Math.round(cs.params.scallopCount);
      check(`C16 ${cs.label} skirt: ${cusps.length} scallop cusps, a divisor of ${m.info.barCount} bars nearest the asked ${asked}, every cusp on a bar`, cusps.length === m.info.scallops && m.info.barCount % cusps.length === 0 && onBar && (cusps.length === asked || m.told.some((t) => /scallops built as/.test(t))));
    }
    // ---- PHASE 2: the ring bands, judged on the emitted parts ----
    const bandParts = m.mesh.parts.filter((q) => q.kind === 'bead' || q.kind === 'leaf');
    const style = cs.params.bandStyle || 'none';
    if (style !== 'none') {
      const isBead = style === 'beading';
      const rings = m.wires.filter((w) => w.kind === 'ring' || w.kind === 'frame');
      const ringZs = [...new Set(rings.map((w) => +w.pts[0][2].toFixed(6)))].sort((a, b) => a - b);
      const ringR = (z) => rings.find((w) => Math.abs(w.pts[0][2] - z) < 1e-6).r;
      const kindAt = (z) => rings.find((w) => Math.abs(w.pts[0][2] - z) < 1e-6).kind;
      const H = cs.params.heightMm, sel = cs.params.bandRings;
      const expected = ringZs.filter((z) => sel === 'all' || (sel === 'inner' && kindAt(z) === 'ring') || (sel === 'ends' && kindAt(z) === 'frame') || (sel === 'top' && Math.abs(z - H) < 1e-6));
      const els = bandParts.map((q) => { const vs = partVerts(m.mesh, q), b = bbox(vs), c = vs.reduce((a, v) => [a[0] + v[0] / vs.length, a[1] + v[1] / vs.length, a[2] + v[2] / vs.length], [0, 0, 0]); return { q, vs, b, c, z: ringZs.reduce((best, z) => (Math.abs(z - c[2]) < Math.abs(best - c[2]) ? z : best), ringZs[0]) }; });
      const onRing = new Map(); for (const e of els) { if (!onRing.has(e.z)) onRing.set(e.z, []); onRing.get(e.z).push(e); }
      // B1 the rings the control names carry the band, and no other ring does (restated from the emitted rings)
      const got = [...onRing.keys()].sort((a, b) => a - b);
      check(`B1 ${cs.label} the band rides exactly the rings "${sel}" names (${got.length} of ${ringZs.length})`, got.length === expected.length && got.every((z, i) => Math.abs(z - expected[i]) < 1e-6) && els.length > 0);
      const bars = m.wires.filter((w) => w.kind === 'bar');
      const B = m.info.barCount, Nside = +cs.params.sides | 0;
      const doorCut = (z) => m.info.door && z > m.info.door.z0 && z < m.info.door.z0 + m.info.door.Dh;
      let notOn = 0, notMult = 0, fuseBad = [], pitchBad = [], ringBad = 0, barBad = 0, exempt = 0, crossings = 0, floorBad = 0, shapeBad = 0, worstShape = 0;
      for (const [z, list] of onRing) {
        const rr = ringR(z);
        const cross = bars.map((w) => barAt(w.pts, z)).filter(Boolean);
        // a bead sits ON a bar when its centre is inside the bar's own wire (the emitted bar is a polyline,
        // so its crossing carries the polyline's chord error — on a profile step that is tenths of a mm)
        const barR = bars.length ? bars[0].r : 0;
        // B2 the snap: on a ring the door leaves whole, the count is the bars times a whole number, and
        // (beading) a bead's centre sits ON every bar's crossing
        if (!doorCut(z) && list.length % B !== 0) notMult++;
        if (isBead && !doorCut(z)) for (const X of cross) if (!list.some((e) => Math.hypot(e.c[0] - X[0], e.c[1] - X[1], e.c[2] - X[2]) < barR)) notOn++;
        // B3 the run is fused: neighbours (by azimuth) within Eva's 1.8 r for beads, a leaf's pitch inside ½–¾ of it (round cages)
        const byAz = [...list].sort((a, b) => Math.atan2(a.c[1], a.c[0]) - Math.atan2(b.c[1], b.c[0]));
        for (let i = 0; i < byAz.length; i++) {
          const a = byAz[i], b = byAz[(i + 1) % byAz.length]; if (a === b) continue;
          if (isBead) {
            const r = (a.b[5] - a.b[2]) / 2, d = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]);
            if (d > 3 * r) continue;                                     // the two ends either side of the door
            if (d > RULED_BEAD_FUSE * r + 1e-6) fuseBad.push(`${d.toFixed(2)} > ${(RULED_BEAD_FUSE * r).toFixed(2)}`);
          } else if (!Nside) {
            // on a round cage the development is θ = s / a0, so a leaf's angular extent times the ring's radius IS its length
            const R0 = Math.hypot(...rings.find((w) => Math.abs(w.pts[0][2] - z) < 1e-6).pts[0].slice(0, 2));
            const ext = (e) => { const th0 = Math.atan2(e.c[1], e.c[0]); let lo = 0, hi = 0; for (const v of e.vs) { const d = angDiff(Math.atan2(v[1], v[0]), th0); lo = Math.min(lo, d); hi = Math.max(hi, d); } return (hi - lo) * R0; };
            const L = ext(a), pitch = Math.abs(angDiff(Math.atan2(b.c[1], b.c[0]), Math.atan2(a.c[1], a.c[0]))) * R0;
            if (pitch > L) continue;                                     // across the door's gap
            if (pitch / L > RULED_LEAF_PITCH[1] + 0.02 || pitch / L < RULED_LEAF_PITCH[0] - 0.02) pitchBad.push((pitch / L).toFixed(3));
          }
        }
        // B4 every element is fused to its ring: a point of the ring's centreline, a quarter-ring out, lies inside it
        const ringW = rings.filter((w) => Math.abs(w.pts[0][2] - z) < 1e-6);
        for (const e of list) {
          if (isBead) { const dc = Math.min(...ringW.map((w) => nearestOnPolyline(e.c, w.closed ? [...w.pts, w.pts[0]] : w.pts))); if (dc > rr) ringBad++; }
          else { const th = Math.atan2(e.c[1], e.c[0]), R0 = Math.hypot(...ringW[0].pts[0].slice(0, 2)); const rad = Nside ? null : R0; const Q = rad ? [(rad + rr / 2) * Math.cos(th), (rad + rr / 2) * Math.sin(th), z] : null; if (Q && !insidePart(m.mesh, e.q, Q)) ringBad++; }
          // B6 the floor: an element at or over the floor and 1.25 × its ring's diameter across the ring, read off its own
          // vertices as the width of their (radius, z) cloud — its extent along the widest of 64 directions in that plane
          // (a sloped band's z extent alone reads short)
          let across = 0; const rz = e.vs.map((v) => [Math.hypot(v[0], v[1]), v[2]]);
          for (let k = 0; k < 64; k++) { const c = Math.cos(Math.PI * k / 64), sn = Math.sin(Math.PI * k / 64); let lo = Infinity, hi = -Infinity; for (const [R, zz] of rz) { const pr = R * c + zz * sn; lo = Math.min(lo, pr); hi = Math.max(hi, pr); } across = Math.max(across, hi - lo); }
          if (across < (Math.max(floor, RESTATED_OVER_RING * 2 * rr)) * Math.cos(Math.PI / 128) - 1e-6) floorBad++;
        }
        // B5 fused to every bar it crosses: the crossing, nudged outward by half the thinner wire, lies inside an element
        for (const X of cross) {
          crossings++;
          const R = Math.hypot(X[0], X[1]), k = (R + Math.min(...bars.map((w) => w.r), rr) / 2) / R, Q = [X[0] * k, X[1] * k, z];
          const host = list.filter((e) => inBox(e.b, Q)).some((e) => insidePart(m.mesh, e.q, Q));
          if (!host) { if (doorCut(z) && Math.abs(angDiff(Math.atan2(X[1], X[0]), -Math.PI / 2)) < (m.info.door.W / R) + 4 * Math.PI / B) exempt++; else barBad++; }
        }
        // B9 the band follows the cage's shape (round cages): every leaf's underside lies on the cone segment through its
        // ring — within twice the profile's own chord sagitta across the leaf's height, the profile restated from the
        // CONTROL's points; a bead's centre lies on the surface of revolution
        if (!Nside) {
          const f = curveFunction(cs.params.profile.points, G.PROFILE_SPEC), rho = (zz) => cs.params.widthMm / 2 * f(Math.min(1, Math.max(0, zz / H)));
          for (const e of list) {
            if (isBead) { const d = Math.abs(Math.hypot(e.c[0], e.c[1]) - rho(e.c[2])); worstShape = Math.max(worstShape, d); if (d > 1e-6) shapeBad++; continue; }
            const z0 = e.b[2], z1 = e.b[5]; let sag = 0; for (let i = 0; i <= 16; i++) { const zz = z0 + (z1 - z0) * i / 16; sag = Math.max(sag, Math.abs(rho(zz) - (rho(z0) + (rho(z1) - rho(z0)) * i / 16))); }
            let under = Infinity; for (const v of e.vs) under = Math.min(under, Math.hypot(v[0], v[1]) - rho(v[2]));
            worstShape = Math.max(worstShape, Math.abs(under)); if (Math.abs(under) > 2 * sag + 1e-6) shapeBad++;
          }
        }
      }
      check(`B2 ${cs.label} the count snaps to the bars: ${isBead ? 'a bead on every bar crossing, ' : ''}a whole number a bar on every unbroken ring${m.told.some((t) => /snapped to the bars/.test(t)) ? ' (told)' : ''}`, notOn === 0 && notMult === 0, `${notOn} crossings without a bead, ${notMult} rings off the multiple`);
      check(`B3 ${cs.label} the run is fused (${isBead ? `beads within ${RULED_BEAD_FUSE} r` : `leaf pitch ${RULED_LEAF_PITCH.join('–')} × the leaf`})`, (isBead ? fuseBad.length : pitchBad.length) === 0 || m.told.some((t) => /too uneven/.test(t)), (isBead ? fuseBad : pitchBad).slice(0, 4).join(', '));
      check(`B4 ${cs.label} every element is fused to its ring (${els.length} elements)`, ringBad === 0, `${ringBad} off their ring`);
      check(`B5 ${cs.label} the band is fused to every bar it crosses (${crossings} crossings, ${exempt} beside the door)`, barBad === 0, `${barBad} crossings outside every element`);
      check(`B6 ${cs.label} every element is at or over the floor and ${RESTATED_OVER_RING} × its ring across it`, floorBad === 0 && (!isBead || cs.params.beadMm >= RESTATED_OVER_RING * Math.max(floor, cs.params.ringMm) || m.told.some((t) => /proud of their ring/.test(t))), `${floorBad} under`);
      if (!Nside) check(`B9 ${cs.label} the band lies on the cage's own shape (worst ${worstShape.toFixed(4)} mm off the profile restated from the control)`, shapeBad === 0, `${shapeBad} off`);
      // B7 nothing of the band reaches into the door opening (the opening restated from the emitted frame, as C5c)
      if (m.info.door) {
        const fr = m.wires.find((w) => w.kind === 'door').pts, frR = m.wires.find((w) => w.kind === 'door').r;
        const rhoF = fr.reduce((a, q) => a + Math.hypot(q[0], q[1]), 0) / fr.length, thF = fr.reduce((a, q) => a + Math.atan2(q[1], q[0]), 0) / fr.length;
        const arcOf = (q) => angDiff(Math.atan2(q[1], q[0]), thF) * rhoF, poly = fr.map((q) => [arcOf(q), q[2]]);
        const inPoly = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
        const edgeDist = (x, y) => { let b = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; const dx = xj - xi, dy = yj - yi, l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / l2)); b = Math.min(b, Math.hypot(x - xi - dx * t, y - yi - dy * t)); } return b; };
        let into = 0; for (const e of els) if (Math.abs(angDiff(Math.atan2(e.c[1], e.c[0]), thF)) < Math.PI / 2) for (const v of e.vs) { const x = arcOf(v), y = v[2]; if (inPoly(x, y) && edgeDist(x, y) > frR + 1e-6) into++; }
        check(`B7 ${cs.label} no band vertex lies inside the door opening`, into === 0, `${into} inside`);
      }
    } else check(`B0b ${cs.label} plain rings: no band part`, bandParts.length === 0);
    // the SVG: one path per wire, per solid and per band element, a viewBox in millimetres that holds the drawing
    let svg = ''; try { svg = G.exportSvg(m); } catch (e) { svg = `<!-- threw: ${e.message} -->`; }   // a throw is C10's red, not an abort
    const paths = (svg.match(/<path /g) || []).length;
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (bandParts.length) check(`B8 ${cs.label} the SVG draws every band element (${bandParts.length})`, (svg.match(/<path class="(bead|leaf)"/g) || []).length === bandParts.length);
    check(`C10 ${cs.label} SVG: ${paths} paths = ${m.wires.length} wires + ${m.solids.length} solids + ${bandParts.length} band elements, viewBox in mm`, paths === m.wires.length + m.solids.length + bandParts.length && vb && +vb[2] > m.info.heightMm - 1e-3 && +vb[2] < m.info.heightMm + 2 * 4 + 6 && /width="[\d.]+mm"/.test(svg));
    if (m.info.door) check(`C10b ${cs.label} the SVG carries the door frame`, /class="door"/.test(svg));
    // determinism
    const m2 = G.buildCage(cs.params); const stl2 = G.exportStl(m2);
    check(`C11 ${cs.label} two builds are byte-identical`, stl.length === stl2.length && stl.every((b, i) => b === stl2[i]));
    // overhang: the report names a place and a number between 0 and 90
    check(`C12 ${cs.label} the overhang report names its wire`, m.info.overhang.deg >= 0 && m.info.overhang.deg <= 90 && !!m.info.overhang.where);
  }
  // B0 PLAIN RINGS ARE THE PHASE-1 CAGE, by branch: band fields moved while the band is off move no byte
  { const a = G.defaultParams(), b = { ...a, bandStyle: 'none', bandRings: 'top', beadMm: 5.5, leafMm: 12, bandSpacing: 0.52 };
    const ma = G.buildCage(a), mb = G.buildCage(b), sa = G.exportStl(ma), sb = G.exportStl(mb);
    check('B0 plain rings build no band part, and the band controls are inert while it is off (byte-identical STL)', a.bandStyle === 'none' && sa.length === sb.length && sa.every((x, i) => x === sb[i]) && !ma.mesh.parts.some((q) => q.kind === 'bead' || q.kind === 'leaf') && G.exportSvg(ma) === G.exportSvg(mb)); }
  // C13 the floor clamp is TOLD: a bar asked under the floor is raised and said
  { const p = G.defaultParams(); p.barMm = 0.8; p.minFeature = 1.0; const m = G.buildCage(p); const bar = m.wires.find((w) => w.kind === 'bar'); check('C13 a 0.8 mm bar under a 1.0 mm floor is raised to it and told', Math.abs(2 * bar.r - 1.0) < 1e-9 && m.told.some((t) => /bar 0.80 mm raised/.test(t))); }
  // C14 a profile the spec refuses throws, by name
  { const p = G.defaultParams(); p.profile = { mode: 'single', points: [[0, 1], [0.5, 1.4], [1, 1]] }; let msg = ''; try { G.buildCage(p); } catch (e) { msg = e.message; } check('C14 a profile outside the box is refused, not clamped', /profile:/.test(msg)); }
  // C15 the hex lantern's rounding is told when the count moves
  { const p = G.applyPreset(G.defaultParams(), 'hexLantern'); p.barCount = 20; const m = G.buildCage(p); check('C15 20 bars on a 6-gon become 18, told', m.info.barCount === 18 && m.told.some((t) => /rounded to 18/.test(t))); }
  if (!quiet) { for (const l of out) console.log(l); console.log(`\n${out.length - fails.length} of ${out.length} checks pass · ${cases.length} cages · ${sumTris.toLocaleString()} triangles in all · thinnest emitted wire ${worstFloor.toFixed(2)} mm`); }
  return { fails, out };
}

/* ---- negative control ---- */
const MUTANTS = [
  { id: 'the-door-leaves-the-bars-uncut', from: "const barInside = door ? (q) => { const th = Math.atan2(q[1], q[0]); return door.inside(door.sOf(th, q[2]), q[2]); } : () => false;", to: "const barInside = () => false;", breaks: /^C5[bc]? / },
  { id: 'a-ring-at-the-door-is-not-cut', from: "if (door && z > door.z0 && z < door.top(0)) {", to: "if (false) {", breaks: /^C5c / },
  { id: 'the-floor-is-not-applied', from: "const wireR = (mm, what) => { const r = mm / 2; if (r < floor / 2)", to: "const wireR = (mm, what) => { const r = mm / 2; if (false)", breaks: /^C4 |^C13 / },
  { id: 'a-polygon-corner-carries-no-bar', from: "if (N && barCount % N) {", to: "if (false) {", breaks: /^C6 |^C15 / },
  { id: 'the-tube-is-left-open', from: "    const c0 = mesh.vertex(...pts[0]), c1 = mesh.vertex(...pts[n - 1]);\n    for (let k = 0; k < sides; k++)", to: "    const c0 = mesh.vertex(...pts[0]), c1 = mesh.vertex(...pts[n - 1]);\n    for (let k = 0; k < 0; k++)", breaks: /^C1 |^C2 / },
  { id: 'the-mitre-is-dropped', from: "const stretch = half < 1.2 ? 1 / Math.cos(half) : 1 / Math.cos(1.2);", to: "const stretch = 1;", breaks: /^C7 / },
  { id: 'the-svg-drops-the-door', from: "const order = ['skirt', 'frame', 'ring', 'bar', 'rib', 'spoke', 'door', 'hanger'];\n  const wires = [...model.wires]", to: "const order = ['skirt', 'frame', 'ring', 'bar', 'rib', 'spoke', 'door', 'hanger'];\n  const wires = [...model.wires].filter((w) => w.kind !== 'door')", breaks: /^C10b? / },
  { id: 'the-collar-is-not-built', from: "revolve(mesh, prof, { sectors: 32, kind: 'collar', name: 'apex collar', poly: 0 });", to: "", breaks: /^C3 / },
  { id: 'clustered-rings-are-even', from: "const tc = p.ringPlace === 'clustered' ?", to: "const tc = false ?", breaks: /^C8b / },
  { id: 'a-profile-step-gets-no-ring', from: "const shoulderZ = profileShoulders(p.profile.points, Rb, H);", to: "const shoulderZ = [];", breaks: /^C8c? / },
  { id: 'bars-pack-until-they-touch', from: "const collarPitch = 2 * rBar + floor;", to: "const collarPitch = 2 * rBar * 1.05;", breaks: /^C9b / },
  { id: 'the-scallop-cusps-leave-the-bars', from: "const u = ((th * scallops / TAU) % 1 + 1) % 1;", to: "const u = ((th * (scallops + 1) / TAU) % 1 + 1) % 1;", breaks: /^C16 / },
  // phase 2 — the ring bands
  { id: 'the-band-runs-at-a-random-phase-to-the-bars', from: "const s0 = sb[j] + gaps[j] * k / n, pitch = gaps[j] / n;", to: "const s0 = sb[j] + gaps[j] * (k + 0.37) / n, pitch = gaps[j] / n;", breaks: /^B2 / },
  { id: 'the-bead-fuse-cap-is-dropped', from: "const nMin = Math.ceil(gMax / (hiF * size) - 1e-9)", to: "const nMin = 1", breaks: /^(B3|B5) / },   // a parted run also leaves bars crossing the ring outside every element
  { id: 'the-laurel-run-parts', from: "loF = LEAF_RUN_PITCH_MIN; hiF = LEAF_RUN_PITCH_MAX;", to: "loF = LEAF_RUN_PITCH_MIN; hiF = 1.2;", breaks: /^(B3|B5) / },   // parted leaves leave bars between them
  { id: 'a-bead-floats-off-its-ring', from: "} else sphereSolid(scr, map(s0, 0, 0), size / 2, PATTERN_LAT, PATTERN_LON);", to: "} else sphereSolid(scr, map(s0, 0, size), size / 2, PATTERN_LAT, PATTERN_LON);", breaks: /^(B2|B3|B4|B5|B9|C3) / },   // floated out, the beads also sit on a wider circle, so neighbours part
  { id: 'the-door-keeps-its-band', from: "const drop = (pts) => door && rg.cut &&", to: "const drop = (pts) => false &&", breaks: /^(B4|B7) / },   // kept in the opening, an element sits where the ring was cut away
  { id: 'the-band-ignores-the-profile-slope', from: "const nr = ez, nz = -er, a0 = ra(zc);", to: "er = 0; ez = 1; const nr = ez, nz = -er, a0 = ra(zc);", breaks: /^B9 / },
  { id: 'the-svg-drops-the-bands', from: "  for (const b of bands) {\n    if (b.kind === 'bead')", to: "  for (const b of []) {\n    if (b.kind === 'bead')", breaks: /^(B8|C10) / },
  { id: 'every-ring-carries-the-band', from: "const want = (rg) => p.bandRings === 'all' ||", to: "const want = (rg) => true ||", breaks: /^B1 / },
  { id: 'bands-build-on-plain-rings', from: "const bandOut = banded(p) ? buildBands() : null;", to: "const bandOut = (p.bandStyle = banded(p) ? p.bandStyle : 'beading', buildBands());", breaks: /^B0b? / },
  { id: 'beads-sit-inside-their-ring', from: "size = Math.max(p.beadMm, floor, BAND_OVER_RING * 2 * rr);", to: "size = Math.max(p.beadMm, floor);", breaks: /^B6 / },
  { id: 'bars-ending-at-the-ring-get-no-ribs', from: "if (!flat && barsEnd === 'ring') {", to: "if (false) {", breaks: /^C3 |^C9 / },
];
if (NEG) {
  const src = fs.readFileSync(path.join(ROOT, 'cage-geometry.js'), 'utf8');
  for (const m of MUTANTS) { const n = src.split(m.from).length - 1; if (n !== 1) { console.error(`ANCHOR ${m.id}: matches ${n} times (must be exactly once)`); process.exit(1); } }
  const base = await run(path.join(ROOT, 'cage-geometry.js'), { quiet: true });
  if (base.fails.length) { console.error('the clean tree fails:', base.fails); process.exit(1); }
  let bad = 0;
  const RUN = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
  if (ONLY.length && RUN.length !== ONLY.length) { console.error(`--mutant names ${ONLY.length - RUN.length} mutant(s) not in the table`); process.exit(1); }
  for (const m of RUN) {
    const file = path.join(ROOT, `cage-geometry.__mutant__.js`);
    fs.writeFileSync(file, src.replace(m.from, m.to));
    let r; try { r = await run(file, { quiet: true }); } catch (e) { r = { fails: ['<threw>'], out: [String(e)] }; }
    fs.unlinkSync(file);
    const claimed = r.fails.filter((f) => m.breaks.test(f)), stray = r.fails.filter((f) => !m.breaks.test(f) && f !== '<threw>');
    const ok = claimed.length > 0 && stray.length === 0 && !r.fails.includes('<threw>');
    if (!ok) bad++;
    console.log(`${ok ? 'CAUGHT' : 'BAD   '} ${m.id}: ${claimed.length} named clauses red${stray.length ? `, ${stray.length} UNCLAIMED (${stray.slice(0, 3).join('; ')})` : ''}${r.fails.includes('<threw>') ? ' — THREW: ' + r.out[0].slice(0, 120) : ''}`);
  }
  console.log(`\n${RUN.length - bad} of ${RUN.length} mutants behave${ONLY.length ? ` (a SUBSET of ${MUTANTS.length})` : ''}`);
  process.exit(bad ? 1 : 0);
} else {
  const r = await run(MOD ? path.resolve(MOD) : path.join(ROOT, 'cage-geometry.js'));
  process.exit(r.fails.length ? 1 : 0);
}
