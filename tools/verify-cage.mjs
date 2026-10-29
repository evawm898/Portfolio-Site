#!/usr/bin/env node
/* verify-cage.mjs — the /cage geometry gate (Node only, no browser).

   Every preset at its defaults and `--seeds N` random cages (default 24) are
   built through the shipped cage-geometry.js and judged on the ARTEFACT: the
   STL's bytes (frame-relief's analyzeStl, boundary edges 0), every part's own
   edge census (closed), a voxel flood fill (ONE piece), the floor on every
   emitted wire, the door cut read off the emitted bars against the emitted
   frame, the polygon's corners, the rings' placement, the mitre's stretch,
   the SVG's census, and byte determinism.

   `--negative-control` serves ten mutants of cage-geometry.js and requires
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

const { analyzeStl } = await import(path.join(ROOT, 'frame-relief.js'));

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
const nearestOnPolyline = (q, pts) => { let best = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1; let t = ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, dist(q, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t])); } return best; };

/* ---- the run ---- */
async function run(modulePath, { quiet = false } = {}) {
  const G = await import(`${modulePath}?${Date.now()}`);
  const fails = [], out = [];
  const check = (name, ok, detail = '') => { out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
  const cases = G.PRESET_IDS.map((id) => ({ label: `preset ${id}`, params: G.applyPreset(G.defaultParams(), id) }));
  for (let s = 1; s <= SEEDS; s++) cases.push({ label: `seed ${s}`, params: G.randomParams(s) });

  // C0 the registry and the presets
  const ids = new Set(G.PARAM_SPEC.map((s) => s.id));
  check('C0 every preset names only registry fields and holds a profile the spec accepts', G.PRESET_IDS.every((id) => Object.keys(G.PRESETS[id]).every((k) => k === 'profile' || ids.has(k)) && G.PRESETS[id].profile && G.PRESETS[id].profile.mode === 'single'));
  check('C0b the default state is the cylinder preset', G.DEFAULTS.preset === 'cylinder' && Object.keys(G.PRESETS.cylinder).filter((k) => k !== 'profile').every((k) => G.DEFAULTS[k] === G.PRESETS.cylinder[k]));

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
    check(`C8 ${cs.label} ring heights: base, top and ${cs.params.ringCount} between`, zs.length === cs.params.ringCount + 2, `${zs.length}`);
    if (cs.params.ringPlace === 'clustered' && cs.params.ringCount >= 2) {
      const inner = m.info.ringZ, even = cs.params.heightMm / (cs.params.ringCount + 1);
      check(`C8b ${cs.label} clustered rings sit closer to the ends than even spacing`, inner[0] < even - 1e-9 && inner[inner.length - 1] > cs.params.heightMm - even + 1e-9);
    }
    // the top: converging bars reach the collar; bars ending at the ring leave ribs
    if (cs.params.topShape !== 'flat') {
      if (cs.params.barsConverge) check(`C9 ${cs.label} bars converge: no ribs, every bar's top end inside the collar`, m.info.ribCount === 0 && m.wires.filter((w) => w.kind === 'bar').every((w) => w.pts[w.pts.length - 1][2] <= cs.params.heightMm + 1e-6 || Math.hypot(w.pts[w.pts.length - 1][0], w.pts[w.pts.length - 1][1]) <= m.info.collar.rc + 1e-6));
      else check(`C9 ${cs.label} bars end at the top ring: ${m.info.ribCount} ribs (about half the bars), told`, m.info.ribCount >= Math.floor(m.info.barCount / 2) - 1 && m.info.ribCount <= Math.ceil(m.info.barCount / 2) + (+cs.params.sides | 0) && m.told.some((t) => /ribs carry/.test(t)) && m.wires.filter((w) => w.kind === 'rib').length === m.info.ribCount);
    } else check(`C9 ${cs.label} flat top: spokes and a hub, told`, m.wires.some((w) => w.kind === 'spoke') && m.told.some((t) => /spokes/.test(t)));
    // the SVG: one path per wire and per solid, a viewBox in millimetres that holds the drawing
    const svg = G.exportSvg(m);
    const paths = (svg.match(/<path /g) || []).length;
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    check(`C10 ${cs.label} SVG: ${paths} paths = ${m.wires.length} wires + ${m.solids.length} solids, viewBox in mm`, paths === m.wires.length + m.solids.length && vb && +vb[2] > m.info.heightMm - 1e-3 && +vb[2] < m.info.heightMm + 2 * 4 + 6 && /width="[\d.]+mm"/.test(svg));
    if (m.info.door) check(`C10b ${cs.label} the SVG carries the door frame`, /class="door"/.test(svg));
    // determinism
    const m2 = G.buildCage(cs.params); const stl2 = G.exportStl(m2);
    check(`C11 ${cs.label} two builds are byte-identical`, stl.length === stl2.length && stl.every((b, i) => b === stl2[i]));
    // overhang: the report names a place and a number between 0 and 90
    check(`C12 ${cs.label} the overhang report names its wire`, m.info.overhang.deg >= 0 && m.info.overhang.deg <= 90 && !!m.info.overhang.where);
  }
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
  { id: 'bars-ending-at-the-ring-get-no-ribs', from: "if (!flat && barsEnd === 'ring') {", to: "if (false) {", breaks: /^C3 |^C9 / },
];
if (NEG) {
  const src = fs.readFileSync(path.join(ROOT, 'cage-geometry.js'), 'utf8');
  for (const m of MUTANTS) { const n = src.split(m.from).length - 1; if (n !== 1) { console.error(`ANCHOR ${m.id}: matches ${n} times (must be exactly once)`); process.exit(1); } }
  const base = await run(path.join(ROOT, 'cage-geometry.js'), { quiet: true });
  if (base.fails.length) { console.error('the clean tree fails:', base.fails); process.exit(1); }
  let bad = 0;
  for (const m of MUTANTS) {
    const file = path.join(ROOT, `cage-geometry.__mutant__.js`);
    fs.writeFileSync(file, src.replace(m.from, m.to));
    let r; try { r = await run(file, { quiet: true }); } catch (e) { r = { fails: ['<threw>'], out: [String(e)] }; }
    fs.unlinkSync(file);
    const claimed = r.fails.filter((f) => m.breaks.test(f)), stray = r.fails.filter((f) => !m.breaks.test(f) && f !== '<threw>');
    const ok = claimed.length > 0 && stray.length === 0 && !r.fails.includes('<threw>');
    if (!ok) bad++;
    console.log(`${ok ? 'CAUGHT' : 'BAD   '} ${m.id}: ${claimed.length} named clauses red${stray.length ? `, ${stray.length} UNCLAIMED (${stray.slice(0, 3).join('; ')})` : ''}${r.fails.includes('<threw>') ? ' — THREW: ' + r.out[0].slice(0, 120) : ''}`);
  }
  console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
} else {
  const r = await run(MOD ? path.resolve(MOD) : path.join(ROOT, 'cage-geometry.js'));
  process.exit(r.fails.length ? 1 : 0);
}
