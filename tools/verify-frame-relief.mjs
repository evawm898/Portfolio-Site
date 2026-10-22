#!/usr/bin/env node
/* verify-frame-relief.mjs — the /frame RELIEF gate (phase 2: the STL that is
   the page's primary output). Node only, seconds; no browser. Drives the
   shipped frame-relief.js over frame-geometry.js's model.

   ROWS: the shipped DEFAULT first (the bloom shipped a multi-piece default
   for months because no row exercised it), every profile preset, 0 and 4
   mullions, each sill, pierced and backed, and backed × 4 mullions.

     W  watertight: boundary edges === 0 on the WELDED float32 bytes exportStl
        wrote (the bug gate's census, ported). nonManifold is PRINTED, unrated:
        a jamb's top row and the head's first row are the same 49 points at
        the same z (same offsets, same profile), so those edges count four
        times across two closed shells — a coincident duplicate, the class the
        bug and bloom gates already classify as unrated. Per band on doubles
        every shell reads 0 / 0 (measured; see the header of frame-relief.js).
     C  ONE connected region: surface-occupancy voxels at 0.4 mm, 6-connected
        flood fill; a miss is re-read at 0.2 mm — a real gap survives the
        smaller cell, a sampling artefact vanishes (both cells printed).
     R  registration: on every band, at every ORIGINAL spine vertex and every
        profile sample, the grid vertex's xy IS offsetCurve(spine, (x_i −
        0.5)·w) scaled — the same expression, so the comparison is exact —
        and its z IS plateT + z_i · reliefDepth; where offsetCurve returns
        null (past a join's bisector) the grid vertex is the join's own mitre
        point. A mesh that recomputed d·n itself draws the apex bow-tie and
        fails the null clause.
     L  a pierced light's clear width in the STL — the gap between the jamb's
        INNER wall column and the first mullion's OUTER wall column, read off
        the positions array the STL writes — equals the 2-D clear width
        restated from innerEdge(jamb) to 1e-6 mm.
     B  every declared embed LANDS: the extended end's centre point lies
        strictly inside the footprint (outerEdge ∪ innerEdge) of the band the
        declaration names, and its distance to that boundary is printed; the
        sill's lip under a stepped sill likewise. The voxel fill cannot tell
        a face-to-face contact from an overlap (charter §3, 9), so this is the
        only witness for the overlap.
     F  the floor both ways: the default is told nothing; a plate under
        MIN_FEATURE_MM is built AT it and told; a mullion scaled under it is
        told; a relief shallower than it is told. MIN_FEATURE_MM is quoted as
        an ASSUMPTION in the module's own note (F0), and the embed is that
        same length.
     X2 the SVG never reads the embed: exportSvg of a model with every
        spine's embed field deleted is the same string.
     D  the print rows are in the registry's print section with defaults in
        range.

   --base <worktree>   also compares exportSvg strings against that tree over
                       the rows (the byte-identity claim; `8db018c` is the
                       base this phase was built on). Skipped, and said so,
                       without it.
   --negative-control  four mutants (an open edge, a detached mullion, a
                       mesh that offsets by itself, the embed removed), each
                       served through copies in the repo root and required to
                       redden exactly what it names; every anchor checked
                       before any mutant runs.

   NOT COVERED: free ends (a relief attached at one end only is connected and
   a print hazard — none exists in this skeleton); sub-cell gaps under 0.2
   mm; the 3D view's pixels (the sheet is for the eye; the 2-D gate asserts
   the view draws and leaves the SVG alone); anything printed. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const BASE = args.includes('--base') ? path.resolve(args[args.indexOf('--base') + 1]) : null;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? ' ok ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const ROWS = [
  ['default', {}],
  ...['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'].map((k) => [`preset ${k}`, { profilePreset: k }]),
  ['0 mullions', { mullions: 0 }],
  ['4 mullions', { mullions: 4 }],
  ['sill none', { sill: 'none' }],
  ['sill stepped', { sill: 'stepped' }],
  ['backed', { lights: 'backed' }],
  ['backed x 4 mullions', { lights: 'backed', mullions: 4 }],
];

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// the band's footprint as a CLOSED polygon (first point repeated, so the
// distance reads the closing edge too — the band's end at the far springing)
const footprint = (G, spine) => { const p = [...G.outerEdge(spine, spine.bandWidth), ...G.innerEdge(spine, spine.bandWidth).slice().reverse()]; return [...p, p[0]]; };

async function run(G, R, RL, label = 'shipped') {
  const out = [];
  const rec = (name, ok, detail = '') => { out.push({ name, ok: !!ok, detail }); if (label === 'shipped') check(name, ok, detail); };

  // D registry
  const printRows = R.PARAM_SPEC.filter((s) => s.section === 'print').map((s) => s.id);
  rec('D1 the print rows are declared (printHeight, plateThickness, reliefScale, lights) with defaults in range', ['printHeight', 'plateThickness', 'reliefScale', 'lights'].every((id) => printRows.includes(id)) && R.PARAM_SPEC.filter((s) => s.section === 'print' && s.kind === 'range').every((s) => s.default >= s.min && s.default <= s.max), printRows.join(','));
  rec('F0 MIN_FEATURE_MM is 1.0, the embed is that same length, and the module calls it an assumption', R.MIN_FEATURE_MM === 1 && RL.EMBED_MM === R.MIN_FEATURE_MM && /assumed/.test(RL.FLOOR_NOTE), `${R.MIN_FEATURE_MM} mm — "${RL.FLOOR_NOTE}"`);

  // per row: W, C, R, B (+ L on pierced rows with mullions)
  const wRows = [], cRows = [], rRows = [], bRows = [], lRows = [];
  let worstB = Infinity;
  for (const [name, p] of ROWS) {
    const model = G.buildFrame(p);
    const relief = RL.buildRelief(model);
    const bytes = RL.exportStl(relief);
    const a = RL.analyzeStl(bytes);
    wRows.push({ name, ...a });
    const c = RL.connected(relief);
    cRows.push({ name, ...c });
    const P = relief.positions, s = relief.scale;
    // R registration
    let rBad = 0, rN = 0, nullN = 0;
    for (const part of relief.parts.filter((q) => q.kind === 'band')) {
      const spine = model.spines.find((q) => q.id === part.id);
      const prof = model.prof, w = spine.bandWidth;
      const ext = RL.embedSpine(spine);
      const j = ext.spine.joins && ext.spine.joins.length ? ext.spine.joins[0] : -1;
      for (let i = 0; i < prof.x.length; i++) {
        const d = (prof.x[i] - 0.5) * w;
        const off = G.offsetCurve(spine, d);
        const offExt = G.offsetCurve(ext.spine, d);
        const z = relief.plateT + prof.z[i] * relief.reliefDepth;
        for (let v = 0; v < spine.pts.length; v++) {
          const k = 3 * part.T(v + part.rowOffset, i + part.colOffset);
          const want = off[v] || (nullN++, offExt[j]);
          rN++;
          if (!(P[k] === want[0] * s && P[k + 1] === want[1] * s && P[k + 2] === z)) rBad++;
        }
      }
    }
    rRows.push({ name, bad: rBad, n: rN, nulls: nullN });
    // B embeds land
    for (const part of relief.parts.filter((q) => q.kind === 'band')) {
      const spine = model.spines.find((q) => q.id === part.id);
      const mid = Math.floor((model.prof.x.length - 1) / 2) + part.colOffset;
      const probe = (row, neighbourId, what) => {
        const k = 3 * part.T(row, mid);
        const pt = [P[k] / s, P[k + 1] / s];
        const nb = model.spines.find((q) => q.id === neighbourId);
        if (!nb) { bRows.push({ name, id: part.id, what, ok: false, detail: `names ${neighbourId}, which is not built` }); return; }
        const fp = footprint(G, nb);
        const inside = pointInPoly(pt, fp), dist = G.distToPoly(pt, fp);
        if (inside) worstB = Math.min(worstB, dist);
        bRows.push({ name, id: part.id, what, ok: inside && dist > 0, detail: `${what} → ${neighbourId}: ${inside ? 'inside' : 'OUTSIDE'}, ${dist.toFixed(4)} mm from its boundary` });
      };
      if (part.embedStart) probe(0, spine.embed.start, 'start');
      if (part.embedEnd) probe(part.V - 1, spine.embed.end, 'end');
      if (part.lip) {
        const k = 3 * part.T(0, 0), pt = [P[k] / s, P[k + 1] / s];
        const nb = model.spines.find((q) => q.id === spine.embed.outer);
        const fp = nb ? footprint(G, nb) : null;
        const inside = fp ? pointInPoly(pt, fp) : false, dist = fp ? G.distToPoly(pt, fp) : 0;
        if (inside) worstB = Math.min(worstB, dist);
        bRows.push({ name, id: part.id, what: 'lip', ok: inside && dist > 0, detail: `lip → ${spine.embed.outer}: ${inside ? 'inside' : 'OUTSIDE'}, ${dist.toFixed(4)} mm` });
      }
    }
    // L clear widths, pierced rows with mullions
    if (p.lights !== 'backed' && (p.mullions ?? R.DEFAULTS.mullions) > 0) {
      const w = model.params.moldingWidth, wm = w * model.params.mullionWidth, n = model.params.mullions;
      const xInL = G.innerEdge(model.spines.find((q) => q.id === 'jambL'), w)[0][0];
      const xInR = G.innerEdge(model.spines.find((q) => q.id === 'jambR'), w)[0][0];
      const clear2d = (xInR - xInL - n * wm) / (n + 1);
      const jamb = relief.parts.find((q) => q.id === 'jambL'), mull = relief.parts.find((q) => q.id === 'mullion1');
      const xj = P[3 * jamb.T(jamb.rowOffset, jamb.C - 1)], xm = P[3 * mull.T(mull.rowOffset, mull.colOffset)];
      const clear3d = (xm - xj) / s;
      lRows.push({ name, clear2d, clear3d, d: Math.abs(clear3d - clear2d) });
    }
  }
  rec('W boundary edges = 0 on every row (welded float32 STL bytes)', wRows.every((r) => r.boundary === 0), wRows.map((r) => `${r.name}: ${r.triangles} tris, boundary ${r.boundary}, nonManifold(unrated) ${r.nonManifold}`).join(' · '));
  rec('C one connected region on every row (0.4 mm voxels; a miss re-read at 0.2)', cRows.every((r) => r.comps === 1), cRows.map((r) => `${r.name}: ${r.comps}@${r.cell}${r.first ? ` (first ${r.first}, sizes ${r.sizes})` : ''}`).join(' · '));
  rec('R every grid vertex is offsetCurve × scale and plateT + z·depth, exactly; a null offset is the mitre point', rRows.every((r) => r.bad === 0) && rRows.some((r) => r.nulls > 0), `${rRows.reduce((a, r) => a + r.n, 0)} vertices, ${rRows.reduce((a, r) => a + r.bad, 0)} off, ${rRows.reduce((a, r) => a + r.nulls, 0)} at a mitre`);
  rec('L a pierced light\'s clear width in the STL equals the 2-D clear width (1e-6 mm)', lRows.length > 0 && lRows.every((r) => r.d <= 1e-6), lRows.map((r) => `${r.name}: ${r.clear3d.toFixed(6)} vs ${r.clear2d.toFixed(6)}`).join(' · '));
  rec('B every declared embed lands strictly inside the band it names', bRows.length > 0 && bRows.every((r) => r.ok), `${bRows.length} embeds, nearest to a boundary ${worstB === Infinity ? '—' : worstB.toFixed(4)} mm${bRows.filter((r) => !r.ok).map((r) => `; ${r.name} ${r.id} ${r.detail}`).join('')}`);
  if (label === 'shipped') { const d = bRows.filter((r) => r.name === 'sill stepped'); console.log(`     embeds on 'sill stepped': ${d.map((r) => `${r.id} ${r.detail}`).join(' | ')}`); }

  // F the floor, both ways
  const def = RL.buildRelief(G.buildFrame({}));
  const thin = RL.buildRelief(G.buildFrame({ plateThickness: 0.5 }));
  const small = RL.buildRelief(G.buildFrame({ printHeight: 40, mullions: 4, mullionWidth: 0.3 }));
  const shallow = RL.buildRelief(G.buildFrame({ printHeight: 40, reliefScale: 0.2 }));
  rec('F1 the default is told nothing about the floor', def.info.told.length === 0 && def.info.underFloor.length === 0, `plate ${def.plateT} mm, band ${def.info.bandW.toFixed(2)} mm`);
  rec('F2 a plate under the floor is built AT it and told', thin.plateT === R.MIN_FEATURE_MM && thin.info.told.length === 1, thin.info.told[0] || 'not told');
  rec('F3 a mullion scaled under the floor is told, not refused', small.info.underFloor.some((t) => /mullion/.test(t)) && small.positions.length > 0, small.info.underFloor.join('; '));
  rec('F4 a relief shallower than the floor is told', shallow.info.underFloor.some((t) => /relief/.test(t)), shallow.info.underFloor.join('; '));

  // X2 the SVG never reads the embed
  const m = G.buildFrame({ sill: 'stepped', mullions: 2 });
  const withEmbed = G.exportSvg(m).svg;
  for (const sp of m.spines) delete sp.embed;
  const m2 = { ...m, bands: m.spines.map((sp) => G.sweepSpine(sp, m.prof, m.params)) };
  rec('X2 the SVG is the same string with every embed declaration deleted', G.exportSvg(m2).svg === withEmbed, `${withEmbed.length} chars`);

  // base-tree byte identity, when a worktree is given
  if (label === 'shipped') {
    if (BASE) {
      const GB = await import(pathToFileURL(path.join(BASE, 'frame-geometry.js')).href);
      let moved = 0;
      for (const [, p] of ROWS) if (G.exportSvg(G.buildFrame(p)).svg !== GB.exportSvg(GB.buildFrame(p)).svg) moved++;
      check(`S the SVG strings are byte-identical to ${path.basename(BASE)} on every row`, moved === 0, `${moved} of ${ROWS.length} moved`);
    } else console.log('     S (SVG byte identity against a base worktree): SKIPPED — pass --base <worktree of 8db018c>');
  }
  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'an-open-edge', file: 'relief', from: 'mesh.quad(T(V - 1, c), B(V - 1, c), B(V - 1, c + 1), T(V - 1, c + 1)); // far end', to: '', breaks: ['W'] },
  // floats at BOTH ends: a mullion lifted off the sill alone still hangs from its light's springing, one region
  { id: 'a-detached-mullion', file: 'geometry', from: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY], [info.mullionX[i - 1], subSpring], [1, 0], 2);', to: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY + 2], [info.mullionX[i - 1], subSpring - 3], [1, 0], 2);', breaks: ['C', 'B'] },
  { id: 'the-mesh-offsets-by-itself', file: 'relief', from: 'const off = offsetCurve(S, d);', to: 'const off = S.pts.map((q, i) => [q[0] + d * S.nrm[i][0], q[1] + d * S.nrm[i][1]]);', breaks: ['R'] },
  { id: 'the-embed-removed', file: 'relief', from: 'export const EMBED_MM = MIN_FEATURE_MM;', to: 'export const EMBED_MM = 0;', breaks: ['B', 'F0'] },
];

async function negativeControl() {
  const srcG = fs.readFileSync(path.join(ROOT, 'frame-geometry.js'), 'utf8');
  const srcR = fs.readFileSync(path.join(ROOT, 'frame-relief.js'), 'utf8');
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  for (const m of MUTANTS) {
    const n = (m.file === 'relief' ? srcR : srcG).split(m.from).length - 1;
    if (n !== 1) { console.log(`FAIL anchor ${m.id}: matches ${n} times`); process.exit(1); }
  }
  let bad = 0;
  for (const m of MUTANTS) {
    const gPath = path.join(ROOT, `_frame-geometry-mutant-${m.id}.js`), rPath = path.join(ROOT, `_frame-relief-mutant-${m.id}.js`);
    fs.writeFileSync(gPath, m.file === 'geometry' ? srcG.replace(m.from, m.to) : srcG);
    fs.writeFileSync(rPath, (m.file === 'relief' ? srcR.replace(m.from, m.to) : srcR).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`));
    const G = await import(pathToFileURL(gPath).href + `?${Date.now()}`);
    const RL = await import(pathToFileURL(rPath).href + `?${Date.now()}`);
    const out = await run(G, R, RL, m.id);
    fs.unlinkSync(gPath); fs.unlinkSync(rPath);
    const red = out.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
    const missed = m.breaks.filter((c) => !red.includes(c)), unclaimed = red.filter((c) => !m.breaks.includes(c));
    const ok = missed.length === 0 && unclaimed.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'} mutant ${m.id}: fired ${red.join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
  }
  console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave.`);
  process.exit(bad ? 1 : 0);
}

if (NEG) await negativeControl();
else {
  const G = await import(pathToFileURL(path.join(ROOT, 'frame-geometry.js')).href);
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);
  await run(G, R, RL);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
