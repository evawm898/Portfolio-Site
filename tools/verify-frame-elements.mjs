#!/usr/bin/env node
/* verify-frame-elements.mjs [--negative-control] [--only=<id,...>]
   — the /frame PLACED ELEMENTS gate (phase 3e, step 2; charter §16): the
   shell, the palmette with its boss, the rose, the rosette and the bud in
   its leaf cup, each built alone by frame-elements.js in print mm.

   EL0  every element is a CLOSED solid: boundary edges 0 on the exported STL.
   EL1  every element is ONE voxel region at 0.4 mm AND at 0.2 mm (a real gap
        survives the finer cell; a sampling artefact does not).
   EL2  FLOORS: every height-field patch stands at least MIN_FEATURE_MM above
        the base over its whole top surface (read off the emitted vertices,
        every top vertex), every blade row is at least the feature across
        (its two margin columns), and every bead's emitted diameter is at
        least the feature — the assumption named, nothing printed.
   EL3  COST: each element's triangle count is reported and under its own
        declared bound (a lattice that silently doubled would show here and
        nowhere else).
   EL4  SMOOTH: on every patch, the dihedral between neighbouring TOP-face
        triangles (read off the emitted lattice, interior edges only) is
        under the element's declared cap — the rose and the rosette and the
        palmette's leaves and the bud's cup are smooth shells; the shell's
        ribs and scallops are declared sharper by design and carry a wider
        cap, said rather than hidden.
   EL5  the element's own record agrees with the file: `info.triangles` and
        `info.heightMm` are the mesh's (a report that is not the artefact's
        is the class this repo keeps meeting).

   --negative-control: five mutants in a COPY of frame-elements.js, every
   anchor checked before any runs; each must redden exactly what it claims.
   Nothing here renders; the sheet is tools/shot-frame-elements.mjs. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
const F = R.MIN_FEATURE_MM;

/* the caps, declared per element: triangles, and the top-face dihedral in degrees */
const CAPS = {   // measured on the shipped tree: shell 78.7°, palmette 46.5°, rose 40.3°, rosette 40.8°, bud 49.0°
  shell: { tris: 16000, dihedral: 85, why: 'the ribs are cos² crests and the rim is scalloped: sharp by design' },
  palmette: { tris: 16000, dihedral: 55, why: 'blades with a raised midrib on a cushion' },
  rose: { tris: 40000, dihedral: 45, why: 'blunt cushioned petals, no facet' },
  rosette: { tris: 16000, dihedral: 45, why: 'flat wide petals' },
  bud: { tris: 12000, dihedral: 55, why: 'cupped leaves with a midrib' },
};

function run(EL, label) {
  const out = [];
  const rec = (name, ok, detail) => { out.push({ name, ok, detail }); console.log(`${ok ? ' ok ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const el0 = [], el1 = [], el2 = [], el3 = [], el4 = [], el5 = [], report = [];
  for (const kind of Object.keys(EL.ELEMENTS)) {
    const m = EL.buildElement(kind), P = m.positions, I = m.indices;
    const a = RL.analyzeStl(RL.exportStl(m));
    if (a.boundary !== 0) el0.push(`${kind}: ${a.boundary} boundary edges`);
    const c4 = RL.connected(m);
    if (c4.comps !== 1) el1.push(`${kind}: ${c4.comps} regions at ${c4.cell} mm`);
    // EL2 floors
    let minTop = Infinity, minBead = Infinity;
    for (const pp of m.parts) {
      if (pp.kind === 'patch') { for (let i = 0; i < pp.nu; i++) for (let j = 0; j < pp.nv; j++) minTop = Math.min(minTop, P[3 * pp.T(i, j) + 2]); }
      if (pp.kind === 'bead') { const t = 3 * pp.base, b = 3 * (pp.base + 1 + (pp.lat - 1) * pp.lon); minBead = Math.min(minBead, P[t + 2] - P[b + 2]); }
    }
    // and every blade ROW at least the feature across, margin to margin (a
    // patch whose first and last columns are its two margins — every blade;
    // the shell, the discs and the dome are read by their heights alone)
    let minRow = Infinity;
    for (const pp of m.parts) { if (pp.kind !== 'patch' || !/leaf|rose|petal|rosette-|cup/.test(pp.id)) continue; for (let i = 0; i < pp.nu; i++) { const a = 3 * pp.T(i, 0), b = 3 * pp.T(i, pp.nv - 1); minRow = Math.min(minRow, Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1])); } }
    if (minRow < F - 1e-9) el2.push(`${kind}: a blade row ${minRow.toFixed(4)} mm across, under the ${F} mm feature`);
    if (minTop < F - 1e-9) el2.push(`${kind}: a patch's top surface at ${minTop.toFixed(4)} mm over the base, under the ${F} mm feature`);
    if (minBead < F - 1e-9) el2.push(`${kind}: a bead ${minBead.toFixed(4)} mm across, under the ${F} mm feature`);
    // EL3 cost
    if (a.triangles > CAPS[kind].tris) el3.push(`${kind}: ${a.triangles} triangles over its ${CAPS[kind].tris} bound`);
    // EL4 smooth: the dihedral across every interior edge of every patch's top lattice
    let worstDeg = 0;
    for (const pp of m.parts) {
      if (pp.kind !== 'patch') continue;
      // a quad's normal from the top lattice's own four corners (the cross
      // of its diagonals), never from the triangle list — the Mesh drops
      // degenerate triangles, so a triangle index is not a lattice index
      const quadN = (i, j) => { const a = 3 * pp.T(i, j), b = 3 * pp.T(i + 1, j), c = 3 * pp.T(i + 1, j + 1), d = 3 * pp.T(i, j + 1); const ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2], vx = P[d] - P[b], vy = P[d + 1] - P[b + 1], vz = P[d + 2] - P[b + 2]; const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(...n); return l < 1e-12 ? null : n.map((x) => x / l); };
      const grid = []; for (let i = 0; i < pp.nu - 1; i++) { const row = []; for (let j = 0; j < pp.nv - 1; j++) row.push(quadN(i, j)); grid.push(row); }
      const ang = (a1, a2) => !a1 || !a2 ? 0 : Math.acos(Math.max(-1, Math.min(1, a1[0] * a2[0] + a1[1] * a2[1] + a1[2] * a2[2]))) * 180 / Math.PI;
      for (let i = 0; i < grid.length; i++) for (let j = 0; j < grid[0].length; j++) { if (i + 1 < grid.length) worstDeg = Math.max(worstDeg, ang(grid[i][j], grid[i + 1][j])); if (j + 1 < grid[0].length) worstDeg = Math.max(worstDeg, ang(grid[i][j], grid[i][j + 1])); }
    }
    if (worstDeg > CAPS[kind].dihedral) el4.push(`${kind}: neighbouring top facets turn ${worstDeg.toFixed(1)}° against the ${CAPS[kind].dihedral}° cap (${CAPS[kind].why})`);
    // EL5 the record
    let z1 = 0; for (let i = 2; i < P.length; i += 3) z1 = Math.max(z1, P[i]);
    if (m.info.triangles !== a.triangles || Math.abs(m.info.heightMm - z1) > 1e-9) el5.push(`${kind}: the record says ${m.info.triangles} triangles / ${m.info.heightMm} mm, the mesh ${a.triangles} / ${z1}`);
    report.push(`${kind} ${a.triangles} tris · ${z1.toFixed(2)} mm high · top ≥ ${minTop.toFixed(2)} mm${Number.isFinite(minBead) ? ` · beads ≥ ${minBead.toFixed(2)} mm` : ''} · facets turn ≤ ${worstDeg.toFixed(1)}°`);
  }
  rec('EL0 every element is a closed solid (boundary edges 0)', el0.length === 0, el0.join('; ') || `${Object.keys(EL.ELEMENTS).length} elements`);
  rec('EL1 every element is ONE voxel region, at 0.4 mm and at 0.2 mm', el1.length === 0, el1.join('; '));
  rec('EL2 floors: every patch top at least the feature over the base, every bead at least the feature across', el2.length === 0, el2.join('; '));
  rec('EL3 cost: every element under its declared triangle bound', el3.length === 0, el3.join('; ') || report.join(' | '));
  rec('EL4 smooth: neighbouring top facets turn under the element\'s declared cap (the shell sharper by design)', el4.length === 0, el4.join('; '));
  rec('EL5 the record is the mesh\'s (triangles, height)', el5.length === 0, el5.join('; '));
  const failed = out.filter((o) => !o.ok);
  console.log(`${label}: ${out.length - failed.length} of ${out.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  return out;
}

const MUTANTS = [
  { id: 'the-patch-has-no-bottom', from: "for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { mesh.quad(T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)); mesh.quad(B(i, j), B(i, j + 1), B(i + 1, j + 1), B(i + 1, j)); }", to: "for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) { mesh.quad(T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)); }", breaks: ['EL0'], note: 'every patch an open shell' },
  { id: 'the-berries-float', from: "F + 0.3 + 1.2 * crown + 0.35 * r]", to: "F + 0.3 + 1.2 * crown + 0.35 * r + 6 * r]", breaks: ['EL1'], note: 'the bud\'s berries lifted clear of the cup: detached' },
  { id: 'the-crown-is-under-the-floor', from: "const bluntHalf = (W, n = 2.6, b = 0.35) => (u) => Math.max(F / 2,", to: "const bluntHalf = (W, n = 2.6, b = 0.35) => (u) => Math.max(0.1,", breaks: ['EL2'], note: 'blunt petals narrow to a hair at their ends: under the feature across' },
  { id: 'the-rose-lattice-doubles', from: "nu: 22, nv: 16 });\n    patchSolid(mesh, g, `rose-${k}`);", to: "nu: 44, nv: 32 });\n    patchSolid(mesh, g, `rose-${k}`);", breaks: ['EL3'], note: 'four times the rose\'s triangles' },
  { id: 'the-petals-are-faceted', from: "crown: (u, v) => kL * crown * (0.25 + 0.75 * Math.pow(u, 1.3)) * (0.55 + 0.45 * Math.pow(Math.abs(v), 1.8))", to: "crown: (u, v) => kL * crown * (0.25 + 0.75 * Math.pow(u, 1.3)) * (0.55 + 0.45 * Math.pow(Math.abs(v), 1.8)) + (Math.floor(u * 6) % 2) * crown", breaks: ['EL4'], note: 'the rose\'s petals stepped along their length: facets' },
  { id: 'the-record-lies', from: "info: { ...info, triangles: indices.length / 3, heightMm: z1 } };", to: "info: { ...info, triangles: indices.length / 3 - 2, heightMm: z1 } };", breaks: ['EL5'], note: 'the record under-reports the mesh' },
];

const args = process.argv.slice(2);
if (!args.includes('--negative-control')) {
  const EL = await import(pathToFileURL(path.join(ROOT, 'frame-elements.js')).href);
  const out = run(EL, 'shipped');
  process.exit(out.every((o) => o.ok) ? 0 : 1);
}
const src = fs.readFileSync(path.join(ROOT, 'frame-elements.js'), 'utf8');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
let bad = 0;
for (const m of MUTANTS) { const n = src.split(m.from).length - 1; if (n !== 1) { console.log(`FAIL mutant ${m.id}: its anchor matches ${n} times (wants exactly one)`); bad++; } }
if (bad) process.exit(1);
const RUN = only.length ? MUTANTS.filter((m) => only.includes(m.id)) : MUTANTS;
let behaved = 0;
for (const m of RUN) {
  const file = path.join(ROOT, `_frame-elements-mutant-${m.id}.js`);
  fs.writeFileSync(file, src.replace(m.from, m.to));
  const EL = await import(pathToFileURL(file).href + `?${Date.now()}`);
  console.log(`\n--- mutant ${m.id} (${m.note}) ---`);
  const out = run(EL, m.id);
  fs.unlinkSync(file);
  const fired = out.filter((o) => !o.ok).map((o) => o.name.slice(0, 3));
  const missed = m.breaks.filter((b) => !fired.includes(b)), unclaimed = fired.filter((f) => !m.breaks.includes(f));
  if (!missed.length && !unclaimed.length) { behaved++; console.log(`ok mutant ${m.id}: fired ${fired.join(',')}`); }
  else console.log(`FAIL mutant ${m.id}: fired ${fired.join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
}
console.log(`\n${behaved} of ${RUN.length} mutants behave${RUN.length < MUTANTS.length ? ` (a SUBSET — ${MUTANTS.length - RUN.length} of ${MUTANTS.length} not run)` : ''}`);
process.exit(behaved === RUN.length ? 0 : 1);
