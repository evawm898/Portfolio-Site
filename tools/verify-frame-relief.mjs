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
     SC the scroll primitive (phase 3a step 1; SC7 the fitted tightness range:
        no dead travel at 30/60/120 mm).
     OR the ornament attached (step 2), over 13 rows on all three skeletons:
        closed and one region; the least wire and the least gap off the
        EMITTED walls (a junction must be a true overlap of the embed, never
        a graze); every half-group rooted in the band by the embed (the
        gate's own footprints); the mirror to the bit; filigree off is the
        frame itself.

   --base <worktree>   also compares exportSvg strings against that tree over
                       the rows (the byte-identity claim; `8db018c` is the
                       base this phase was built on). Skipped, and said so,
                       without it.
   --negative-control  seven mutants (an open edge, a detached mullion, a
                       mesh that offsets by itself, the embed removed; phase
                       2b: a closed loop's closing strip dropped, and its seam
                       moved 0.1 mm on the oval and on the rectangle), each
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

const PRESETS = ['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'];
/* the closed skeletons (phase 2b): every rectangle corner treatment, the
   circle, a tall and a wide oval — each under every profile preset */
const CLOSED = [
  ['rect mitre', { skeleton: 'rect', cornerTreatment: 'mitre' }],
  ['rect rounded', { skeleton: 'rect', cornerTreatment: 'rounded' }],
  ['rect notched', { skeleton: 'rect', cornerTreatment: 'notched' }],
  ['rect eared', { skeleton: 'rect', cornerTreatment: 'eared' }],
  ['circle', { skeleton: 'oval', aspect: 1 }],
  ['oval tall', { skeleton: 'oval', aspect: 0.5 }],
  ['oval wide', { skeleton: 'oval', aspect: 2 }],
];
/* ARCH rows: the phase-2 rows, every one compared byte for byte (SVG AND
   STL) against the base tree under --base. */
const ARCH_ROWS = [
  ['default', {}],
  ...['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'].map((k) => [`preset ${k}`, { profilePreset: k }]),
  ['0 mullions', { mullions: 0 }],
  ['4 mullions', { mullions: 4 }],
  ['sill none', { sill: 'none' }],
  ['sill stepped', { sill: 'stepped' }],
  ['backed', { lights: 'backed' }],
  ['backed x 4 mullions', { lights: 'backed', mullions: 4 }],
];
const ROWS = [
  ...ARCH_ROWS,
  ['arch recessed', { lights: 'recessed' }],
  ...CLOSED.flatMap(([n, q]) => PRESETS.map((k) => [`${n} · ${k}`, { ...q, profilePreset: k }])),
  ...CLOSED.flatMap(([n, q]) => [['backed', { lights: 'backed' }], ['recessed', { lights: 'recessed' }]].map(([i, iq]) => [`${n} · ${i}`, { ...q, ...iq }])),
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

async function run(G, R, RL, label = 'shipped', FL = null) {
  const out = [];
  const rec = (name, ok, detail = '') => { out.push({ name, ok: !!ok, detail }); if (label === 'shipped') check(name, ok, detail); };

  // D registry
  const printRows = R.PARAM_SPEC.filter((s) => s.section === 'print').map((s) => s.id);
  rec('D1 the print rows are declared (printHeight, plateThickness, reliefScale, lights) with defaults in range', ['printHeight', 'plateThickness', 'reliefScale', 'lights'].every((id) => printRows.includes(id)) && R.PARAM_SPEC.filter((s) => s.section === 'print' && s.kind === 'range').every((s) => s.default >= s.min && s.default <= s.max), printRows.join(','));
  rec('F0 MIN_FEATURE_MM is 1.0, the embed is that same length, and the module calls it an assumption', R.MIN_FEATURE_MM === 1 && RL.EMBED_MM === R.MIN_FEATURE_MM && /assumed/.test(RL.FLOOR_NOTE), `${R.MIN_FEATURE_MM} mm — "${RL.FLOOR_NOTE}"`);

  // per row: W, C, R, B (+ L on pierced rows with mullions)
  const wRows = [], cRows = [], rRows = [], bRows = [], lRows = [], qRows = [], l2Rows = [];
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
    if (model.info.kind === 'arch' && p.lights !== 'backed' && p.lights !== 'recessed' && (p.mullions ?? R.DEFAULTS.mullions) > 0) {
      const w = model.params.moldingWidth, wm = w * model.params.mullionWidth, n = model.params.mullions;
      const xInL = G.innerEdge(model.spines.find((q) => q.id === 'jambL'), w)[0][0];
      const xInR = G.innerEdge(model.spines.find((q) => q.id === 'jambR'), w)[0][0];
      const clear2d = (xInR - xInL - n * wm) / (n + 1);
      const jamb = relief.parts.find((q) => q.id === 'jambL'), mull = relief.parts.find((q) => q.id === 'mullion1');
      const xj = P[3 * jamb.T(jamb.rowOffset, jamb.C - 1)], xm = P[3 * mull.T(mull.rowOffset, mull.colOffset)];
      const clear3d = (xm - xj) / s;
      lRows.push({ name, clear2d, clear3d, d: Math.abs(clear3d - clear2d) });
    }
    // Q the seam of a CLOSED band, in the mesh: the closing strip exists (row
    // V−1 is joined to row 0 by triangles, no vertex duplicated there), and
    // the top surface turns across the seam row exactly as across its
    // antipode — the gap and the normal discontinuity at the loop start
    const loop = relief.parts.find((q) => q.kind === 'band' && q.closed);
    if (loop) {
      const { V, C } = loop, I = relief.indices;
      const rowOf = (vi) => { const r = vi - loop.base; return r < V * C ? Math.floor(r / C) : Math.floor((r - V * C) / C); };
      let closing = 0;
      for (let t = loop.t0; t < loop.t1; t++) { const rs = [rowOf(I[3 * t]), rowOf(I[3 * t + 1]), rowOf(I[3 * t + 2])]; if (rs.includes(V - 1) && rs.includes(0)) closing++; }
      let dup = Infinity;
      for (let c = 0; c < C; c++) { const a0 = 3 * loop.T(0, c), b0 = 3 * loop.T(V - 1, c); dup = Math.min(dup, Math.hypot(P[a0] - P[b0], P[a0 + 1] - P[b0 + 1], P[a0 + 2] - P[b0 + 2])); }
      // top-face normal of the strip between rows v and v+1 at column c
      const fN = (v, c) => { const A = 3 * loop.T(v, c), B = 3 * loop.T((v + 1) % V, c), D = 3 * loop.T(v, c + 1); const ux = P[B] - P[A], uy = P[B + 1] - P[A + 1], uz = P[B + 2] - P[A + 2], wx = P[D] - P[A], wy = P[D + 1] - P[A + 1], wz = P[D + 2] - P[A + 2]; const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, l = Math.hypot(nx, ny, nz); return [nx / l, ny / l, nz / l]; };
      // atan2(|a×b|, a·b), never acos: acos(1 − ε) turns 1e-16 of rounding into 1e-8 rad
      const dih = (v, c) => { const a = fN((v + V - 1) % V, c), b = fN(v, c); const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; return Math.atan2(Math.hypot(x, y, z), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]); };
      const ap = model.info.seam.antipode;
      let step = 0, seamDih = 0;
      for (let c = 0; c < C - 1; c++) { step = Math.max(step, Math.abs(dih(0, c) - dih(ap, c))); seamDih = Math.max(seamDih, dih(0, c)); }
      // the xy gap: the seam row sits ON the restated bottom centre column line x = 0 (scaled)
      let gap = 0; for (let c = 0; c < C; c++) gap = Math.max(gap, Math.abs(P[3 * loop.T(0, c)]) / s);
      qRows.push({ name, closing, dup, step, seamDih, gap, wantClosing: 4 * (C - 1) + 4 });
      // L2 the opening: the inner wall's width across the sides, in the STL,
      // equals the restated opening (2a − w for the rectangle, 2A − w for the
      // oval) — read off the positions the STL writes
      if (p.lights !== 'backed' && p.lights !== 'recessed') {
        const iR = model.info.anchors.sideR.index, iL = model.info.anchors.sideL.index, w = model.params.moldingWidth;
        const got = (P[3 * loop.T(iR, C - 1)] - P[3 * loop.T(iL, C - 1)]) / s;
        const want = model.info.kind === 'rect' ? model.params.width - w : 2 * model.params.aspect * (model.params.height - w) / 2 - w;
        l2Rows.push({ name, got, want, d: Math.abs(got - want) });
      }
    }
  }
  rec('W boundary edges = 0 on every row (welded float32 STL bytes)', wRows.every((r) => r.boundary === 0), `${wRows.length} rows, ${wRows.filter((r) => r.boundary).length} open${wRows.filter((r) => r.boundary).slice(0, 4).map((r) => `; ${r.name}: boundary ${r.boundary}`).join('')}`);
  rec('C one connected region on every row (0.4 mm voxels; a miss re-read at 0.2)', cRows.every((r) => r.comps === 1), `${cRows.length} rows, ${cRows.filter((r) => r.comps !== 1).length} split${cRows.filter((r) => r.comps !== 1).slice(0, 4).map((r) => `; ${r.name}: ${r.comps}@${r.cell} (first ${r.first}, sizes ${r.sizes})`).join('')}`);
  if (label === 'shipped') {
    console.log('     per row (tris · boundary · nonManifold(unrated) · regions@cell):');
    for (let i = 0; i < wRows.length; i++) console.log(`       ${wRows[i].name.padEnd(30)} ${String(wRows[i].triangles).padStart(6)} · ${wRows[i].boundary} · ${String(wRows[i].nonManifold).padStart(4)} · ${cRows[i].comps}@${cRows[i].cell}${cRows[i].first ? ` (first ${cRows[i].first})` : ''}`);
  }
  rec('R every grid vertex is offsetCurve × scale and plateT + z·depth, exactly; a null offset is the mitre point', rRows.every((r) => r.bad === 0) && rRows.some((r) => r.nulls > 0), `${rRows.reduce((a, r) => a + r.n, 0)} vertices, ${rRows.reduce((a, r) => a + r.bad, 0)} off, ${rRows.reduce((a, r) => a + r.nulls, 0)} at a mitre`);
  rec('L a pierced light\'s clear width in the STL equals the 2-D clear width (1e-6 mm)', lRows.length > 0 && lRows.every((r) => r.d <= 1e-6), lRows.map((r) => `${r.name}: ${r.clear3d.toFixed(6)} vs ${r.clear2d.toFixed(6)}`).join(' · '));
  rec('Q the seam of every closed band: the closing strip is there (row V−1 joined to row 0, no duplicated vertex), the seam row is ON x = 0, and the surface turns across the seam exactly as across its antipode', qRows.length > 0 && qRows.every((r) => r.closing === r.wantClosing && r.dup > 1e-6 && r.step <= 1e-9 && r.gap === 0), `${qRows.length} closed rows; worst |seam turn − antipode turn| ${Math.max(...qRows.map((r) => r.step)).toExponential(1)} rad, seam xy gap ${Math.max(...qRows.map((r) => r.gap)).toExponential(1)} mm, closing strip ${qRows[0] ? qRows[0].closing : '—'} triangles${qRows.filter((r) => !(r.closing === r.wantClosing && r.dup > 1e-6 && r.step <= 1e-9 && r.gap === 0)).slice(0, 3).map((r) => `; ${r.name}: closing ${r.closing}/${r.wantClosing}, dup ${r.dup.toFixed(4)}, step ${r.step.toExponential(1)}, gap ${r.gap.toExponential(1)}`).join('')}`);
  rec('L2 a closed frame\'s opening across its sides in the STL equals the restated opening (2a − w, 2A − w), 1e-6 mm', l2Rows.length > 0 && l2Rows.every((r) => r.d <= 1e-6), `${l2Rows.length} open rows, worst ${Math.max(...l2Rows.map((r) => r.d)).toExponential(1)} mm${l2Rows.filter((r) => r.d > 1e-6).slice(0, 2).map((r) => `; ${r.name} ${r.got.toFixed(4)} vs ${r.want.toFixed(4)}`).join('')}`);
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

  // SC — the SCROLL primitive (phase 3a, step 1: frame-filigree.js), on the
  // vocabulary grid. Every quantity is read off the EMITTED polyline and the
  // mesh, against restatements of the law from the spec and MIN_FEATURE_MM.
  if (FL) {
    const F = R.MIN_FEATURE_MM;
    const grid = [];
    for (const kind of ['C', 'S']) for (const tightness of [0, 0.5, 1]) for (const length of [30, 60, 120]) for (const wire of [1, 1.6, 3.2]) grid.push({ kind, tightness, length, wire, balance: kind === 'C' ? 0.6 : 1 });
    const scs = grid.map((q) => ({ q, c: FL.buildScroll(q) }));
    // turning between consecutive chords (atan2: never acos)
    const turnAt = (P, i) => { const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1]; return Math.atan2(ax * by - ay * bx, ax * bx + ay * by); };
    const circR = (a, b, c) => { const A = Math.hypot(b[0] - c[0], b[1] - c[1]), B = Math.hypot(a[0] - c[0], a[1] - c[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2; return ar > 1e-15 ? A * B * C / (4 * ar) : Infinity; };
    let sc1 = [], sc2 = [], sc3 = [], worstEye = 0, worstTurn = 0, worstGap = Infinity;
    for (const { q, c } of scs) {
      const rel = FL.scrollRelief([c], { baseZ: 1 });
      const a = RL.analyzeStl(RL.exportStl(rel)), cc = RL.connected(rel);
      if (a.boundary !== 0 || cc.comps !== 1) sc1.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire}: boundary ${a.boundary}, ${cc.comps} regions`);
      const P = c.pts, n = P.length, t = Math.max(F, q.wire);
      // the eye: the radius at each END, read off the last three vertices, is
      // the restated floor (t + F)/2 — the wire's inner edge keeps F/2 of radius
      const eyeWant = (t + F) / 2;
      // the radius of curvature is LINEAR in arc length through the volute (a
      // log spiral), so it is extrapolated to the end vertex from the two last
      // triples' circumradii (each the radius at its middle vertex)
      const L2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
      const endR = (Q) => { const r1 = circR(Q[1], Q[2], Q[3]), r0 = circR(Q[0], Q[1], Q[2]); return r0 + (r0 - r1) * L2(Q[0], Q[1]) / L2(Q[1], Q[2]); };
      // the drawn arcs carry the curvature of each step's MIDPOINT, so the end
      // is within one step's change of ρ: the volute's slope is at most
      // (ρ_mid − eye) / (VOLUTE_SHARE · half), ρ_mid = SCROLL_BODY · length —
      // restated from the module's constants and the spec, never the builder
      const betaE = Math.min(1, Math.max(0.3, q.balance)), hS = q.length - q.length / (1 + betaE);
      const slope = (FL.SCROLL_BODY[q.kind] * q.length - eyeWant) / (c.info.share * hS);
      const ends = [[endR([P[0], P[1], P[2], P[3]]), L2(P[0], P[1]) + L2(P[1], P[2])], [endR([P[n - 1], P[n - 2], P[n - 3], P[n - 4]]), L2(P[n - 1], P[n - 2]) + L2(P[n - 2], P[n - 3])]];   // the last step may be a short remainder, so two steps
      for (const [r, ds] of ends) { const e = Math.abs(r - eyeWant) / eyeWant; worstEye = Math.max(worstEye, e); if (Math.abs(r - eyeWant) > slope * ds) sc2.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire}: eye ${r.toFixed(4)} vs ${eyeWant}`); }
      // the turns drawn: sum the emitted turning over each half's volute (its
      // last VOLUTE_SHARE of arc length, from the restated half lengths)
      const beta = Math.min(1, Math.max(0.3, q.balance)), h2 = q.length / (1 + beta), h1 = q.length - h2;
      const arc = [0]; for (let i = 1; i < n; i++) arc.push(arc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      const halves = [[0, h1 * c.info.share], [q.length - h2 * c.info.share, q.length]];
      halves.forEach(([s0, s1], k) => {
        let tt = 0; for (let i = 1; i < n - 1; i++) if (arc[i] > s0 + 1e-9 && arc[i] < s1 - 1e-9) tt += turnAt(P, i);
        const got = Math.abs(tt) / (2 * Math.PI), want = c.info.turnsBuilt[k];
        // the summed chord turning covers the volute less the step straddling
        // each end: at most two steps of SCROLL_STEP_DEG
        const d = Math.abs(got - want) - 2 * FL.SCROLL_STEP_DEG / 360;
        worstTurn = Math.max(worstTurn, Math.abs(got - want));
        if (d > 0) sc2.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire} half ${k}: ${got.toFixed(3)} turns drawn vs ${want.toFixed(3)} reported`);
      });
      if (c.info.turnsHeld > FL.tightnessTurns(q.tightness) + 1e-12 || c.info.turnsHeld > c.info.turnsAsked + 1e-12) sc2.push(`${q.kind}: held ${c.info.turnsHeld} above asked`);
      // the self-gap, RESTATED: every pair of vertices the EMITTED chords turn
      // at least π between, centreline distance less the wire
      let cum = [0]; for (let i = 1; i < n - 1; i++) cum.push(cum[i - 1] + turnAt(P, i)); cum.push(cum[n - 2]);
      let g = Infinity;
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (Math.abs(cum[j] - cum[i]) >= Math.PI) g = Math.min(g, Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - t);
      worstGap = Math.min(worstGap, g);
      // within the chord's own turning step of the curve's π
      if (g < F - 1e-6) sc3.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire}: self-gap ${g.toFixed(4)} mm`);
    }
    rec('SC1 every scroll on the vocabulary grid is a closed solid: boundary 0 and one voxel region', sc1.length === 0, `${scs.length} scrolls${sc1.length ? ': ' + sc1.slice(0, 3).join('; ') : ''}`);
    rec('SC2 the drawn scroll is the law: each eye (the end vertices\' radius, extrapolated) is the restated floor (t + F)/2 within two steps of the spiral\'s own slope, each volute\'s drawn turns are the reported ones, never above the asked', sc2.length === 0, `worst eye ${(100 * worstEye).toFixed(3)}%, worst turns ${worstTurn.toFixed(4)}${sc2.length ? ' — ' + sc2.slice(0, 3).join('; ') : ''}`);
    rec('SC3 no wire comes within a feature of its own coil, eye or mouth (restated off the emitted chords)', sc3.length === 0, `least self-gap ${worstGap.toFixed(4)} mm against ${F}${sc3.length ? ' — ' + sc3.slice(0, 3).join('; ') : ''}`);
    const thin = FL.buildScroll({ kind: 'C', length: 60, tightness: 0.5, wire: 0.6 });
    rec('SC4 a wire under the floor is built AT it and told', thin.info.wire === F && thin.info.told.some((x) => /wire 0\.60/.test(x)), thin.info.told.join('; '));
    // SC5 mirror: x -> -x to the bit, and the group's junctions
    const c0 = scs[4].c, m0 = FL.placeCurve(c0, { mirror: true });
    const mirOk = m0.pts.every((p, i) => Object.is(p[0], -c0.pts[i][0]) && Object.is(p[1], c0.pts[i][1]));
    rec('SC5 a mirrored scroll is its source with x negated, to the bit', mirOk, `${m0.pts.length} vertices`);
    const sc6 = [];
    let leastPair = Infinity, longestWeb = 0;
    for (const n of [2, 3, 4, 5]) for (const tightness of [0, 1]) {
      const g = FL.buildGroup({ n, length: 60, tightness, wire: 1.6 });
      const cs = g.map((x) => x.curve);
      const rel = FL.scrollRelief(cs, { baseZ: 1 });
      if (RL.analyzeStl(RL.exportStl(rel)).boundary !== 0 || RL.connected(rel).comps !== 1) sc6.push(`group ${n}: not one closed region`);
      // each child OVERLAPS its parent by at least the embed at the contact:
      // least centreline distance ≤ (t_p + t_c)/2 − EMBED, restated
      for (const x of g.filter((y) => y.role === 'child')) {
        const p = cs[x.parent], tp = p.info.wire, tc = x.curve.info.wire;
        let d = Infinity; for (const a of x.curve.pts) for (const b of p.pts) d = Math.min(d, Math.hypot(a[0] - b[0], a[1] - b[1]));
        if (d > (tp + tc) / 2 - RL.EMBED_MM + 1e-6) sc6.push(`group ${n}: a child stands ${(d - (tp + tc) / 2).toFixed(3)} mm off its parent (wants an overlap of ${RL.EMBED_MM})`);
      }
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const pg = FL.pairGap(cs[i], cs[j]); leastPair = Math.min(leastPair, pg.gap); longestWeb = Math.max(longestWeb, pg.web); if (pg.gap < F - 1e-9) sc6.push(`group ${n} τ${tightness}: wires ${i}-${j} ${pg.gap.toFixed(3)} mm apart outside their junction`); }
    }
    rec('SC6 a group is one closed region; each child overlaps its parent by the embed; outside each junction no two wires come within a feature', sc6.length === 0, `least pair gap ${leastPair.toFixed(4)} mm, longest junction web ${longestWeb.toFixed(1)} mm${sc6.length ? ' — ' + sc6.slice(0, 3).join('; ') : ''}`);
  }

  // (it costs ~1,800 builds, so a mutant of another file does not pay it)
  if (FL && (label === 'shipped' || MUTANTS.find((m) => m.id === label)?.file === 'filigree')) {
    const F = R.MIN_FEATURE_MM;
    // SC7 no dead travel (Eva's ruling 2 on step 1): over the tightness slider
    // at its own 0.01 step, every step builds MORE turns than the last, at
    // 30 / 60 / 120 mm on three wires — and the top of the range is the most
    // that PRINTS, probed independently of the fit: the top turns keep the
    // gap ≥ F and a hundredth of a turn more closes it (unless the top is the
    // 1¾ ceiling), and a share raised above the base was needed (the base
    // share could not hold 1¾ turns).
    const sc7 = []; let rows = 0;
    for (const kind of ['C', 'S']) for (const length of [30, 60, 120]) for (const wire of [1.0, 1.6, 2.4]) {
      rows++;
      let prev = -Infinity, dead = 0, last = null;
      for (let i = 0; i <= 100; i++) { const c = FL.buildScroll({ kind, length, tightness: i / 100, wire, balance: 0.6 }); if (!(c.info.turnsHeld > prev + 1e-6)) dead++; prev = c.info.turnsHeld; last = c; }
      if (dead) sc7.push(`${kind} L${length} t${wire}: ${dead} dead steps`);
      const sh = last.info.share, top = last.info.turnsHeld, spec = { kind, length, wire, balance: 0.6, share: sh };
      const gapAt = (turns, share = sh) => FL.selfGap(FL.scrollCurve({ ...spec, share, turns }), wire).gap;
      if (gapAt(top) < F) sc7.push(`${kind} L${length} t${wire}: the top ${top.toFixed(3)} turns does not print`);
      if (top < FL.VOLUTE_TURNS[1] - 1e-9 && gapAt(top + 0.01) >= F) sc7.push(`${kind} L${length} t${wire}: ${(top + 0.01).toFixed(3)} turns still prints — the range stops short`);
      if (sh < FL.VOLUTE_SHARE || sh > FL.VOLUTE_SHARE_MAX) sc7.push(`${kind} L${length} t${wire}: share ${sh} outside the declared range`);
      if (sh > FL.VOLUTE_SHARE + 1e-9 && gapAt(FL.VOLUTE_TURNS[1], FL.VOLUTE_SHARE) >= F) sc7.push(`${kind} L${length} t${wire}: the share was raised though the base share holds 1¾ turns`);
    }
    rec('SC7 the tightness slider has no dead travel: every 0.01 step builds more turns, at 30/60/120 mm on 1.0/1.6/2.4 mm wire, and its top is exactly the most that prints', sc7.length === 0, `${rows} scrolls × 101 steps${sc7.length ? ' — ' + sc7.slice(0, 3).join('; ') : ''}`);
  }

  // OR — the ORNAMENT attached (phase 3a, step 2), on every skeleton at the
  // default and at density 5 with every group on, plus a crowded frame where
  // groups must give way. Every quantity is read off the EMITTED mesh (each
  // wire part's first and last column = its two walls), against the gate's
  // OWN band footprints (outerEdge / innerEdge, the boundaries' owner — never
  // frame-filigree's bandRegion), MIN_FEATURE_MM and EMBED_MM.
  if (FL && (label === 'shipped' || MUTANTS.find((m) => m.id === label)?.file === 'filigree')) {
    const F = R.MIN_FEATURE_MM, E = RL.EMBED_MM;
    const ON = { filigree: 'scrolls' };
    const DENSE = { filigree: 'scrolls', ornDensity: 5, ornCrest: 'on', ornCorners: 'on', ornSides: 'on', ornBottom: 'on' };
    const OROWS = [
      ['arch default', ON], ['arch dense', DENSE], ['arch sill none dense', { ...DENSE, sill: 'none' }],
      ['rect default', { skeleton: 'rect', ...ON }], ['rect dense', { skeleton: 'rect', ...DENSE }],
      ...['rounded', 'notched', 'eared'].map((t) => [`rect ${t} dense`, { skeleton: 'rect', cornerTreatment: t, ...DENSE }]),
      ['oval default', { skeleton: 'oval', ...ON }], ['oval dense', { skeleton: 'oval', ...DENSE }], ['circle dense', { skeleton: 'oval', aspect: 1, ...DENSE }],
      ['rect crowded (groups must give way)', { skeleton: 'rect', width: 70, height: 120, ...DENSE, ornScale: 6 }],
      ['dense, round wire, tight, thick', { ...DENSE, ornShape: 'round', ornTightness: 1, ornWire: 3.2 }],
    ];
    // the gate's own band footprints, in print mm: an open band is one
    // polygon, a closed loop two (outer, inner) — never bridged
    const pip = (pt, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
    const feet = (model, s) => model.spines.map((sp) => { const o = G.outerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]), i = G.innerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]); return sp.closed ? { loops: [o, i], inside: (q) => pip(q, o) && !pip(q, i) } : { loops: [[...o, ...i.slice().reverse(), o[0]]], inside: (q) => pip(q, [...o, ...i.slice().reverse()]) }; });
    const depthIn = (fs_, q) => { const ins = fs_.some((f) => f.inside(q)); let d = Infinity; for (const f of fs_) for (const l of f.loops) d = Math.min(d, G.distToPoly(q, l)); return ins ? d : -d; };
    const dseg = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };
    const minD = (A, B) => { let m = Infinity; for (const q of A) for (let k = 0; k < B.length - 1; k++) m = Math.min(m, dseg(q, B[k], B[k + 1])); return m; };
    const or1 = [], or2 = [], or3 = [], or4 = [], or5 = [], or6 = [];
    let leastWire = Infinity, leastGap = Infinity, leastEmbed = Infinity, deepest = 0, built = 0, notBuilt = 0;
    for (const [name, q] of OROWS) {
      const model = FL.withOrnament(G.buildFrame(q));
      const rel = RL.buildRelief(model);
      const a = RL.analyzeStl(RL.exportStl(rel)), cc = RL.connected(rel);
      if (a.boundary !== 0 || cc.comps !== 1) or1.push(`${name}: boundary ${a.boundary}, ${cc.comps} regions`);
      const orn = model.ornament, P = rel.positions;
      // the emitted wires: per part, the two wall columns of the top grid
      const parts = rel.parts.filter((x) => /^orn/.test(x.id));
      if (parts.length !== orn.curves.length || !parts.length) { or1.push(`${name}: ${parts.length} wire solids for ${orn.curves.length} wires`); continue; }
      const W = parts.map((pt) => {
        const c = [], t = [];
        for (let v = 0; v < pt.V; v++) { const i0 = 3 * pt.T(v, 0), i1 = 3 * pt.T(v, pt.C - 1); const A = [P[i0], P[i0 + 1]], B = [P[i1], P[i1 + 1]]; c.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]); t.push(Math.hypot(A[0] - B[0], A[1] - B[1])); }
        return { c, t, wire: Math.min(...t), part: pt };
      });
      for (const w of W) { leastWire = Math.min(leastWire, w.wire); if (w.wire < F - 1e-9) or2.push(`${name}: a wire ${w.wire.toFixed(4)} mm wide`); }
      // which wire is in which group, and which side: groups.flatMap(curves, mirrored)
      const owner = []; let k = 0;
      orn.groups.forEach((g, gi) => { for (const side of ['R', 'L']) for (let i = 0; i < g.curves.length; i++) owner[k++] = { gi, side, i }; });
      built += orn.groups.length; notBuilt += orn.told.filter((m) => /not built/.test(m)).length;
      // OR3 gaps. Within one half-group: every approach under a feature is a
      // TRUE junction (it reaches an overlap of the embed), never a graze;
      // between half-groups (the other side, another group): a feature clear.
      for (let x = 0; x < W.length; x++) {
        // the wire's own coils: stations the emitted centreline turns ≥ π
        // between, centreline distance less the wire
        const C = W[x].c, n = C.length; let cum = [0];
        for (let i = 1; i < n - 1; i++) { const ax = C[i][0] - C[i - 1][0], ay = C[i][1] - C[i - 1][1], bx = C[i + 1][0] - C[i][0], by = C[i + 1][1] - C[i][1]; cum.push(cum[i - 1] + Math.atan2(ax * by - ay * bx, ax * bx + ay * by)); }
        cum.push(cum[n - 2]);
        for (let i = 0; i < n; i += 2) for (let j = i + 2; j < n; j += 2) if (Math.abs(cum[j] - cum[i]) >= Math.PI) { const g = Math.hypot(C[j][0] - C[i][0], C[j][1] - C[i][1]) - W[x].wire; leastGap = Math.min(leastGap, g); if (g < F - 2e-3) { or3.push(`${name}: wire ${x} comes ${g.toFixed(3)} mm from its own coil`); i = n; break; } }
        for (let y = x + 1; y < W.length; y++) {
          const same = owner[x].gi === owner[y].gi && owner[x].side === owner[y].side;
          const half = (W[x].wire + W[y].wire) / 2;
          if (!same) { const d = minD(W[x].c, W[y].c) - half; leastGap = Math.min(leastGap, d); if (d < F - 1e-6) or3.push(`${name}: wires ${x} and ${y} (different groups or sides) ${d.toFixed(3)} mm apart`); continue; }
          // runs of either wire's stations within a feature of the other; each
          // must reach an overlap ≥ E (read from both wires)
          const runs = [];
          for (const [A, B] of [[W[x].c, W[y].c], [W[y].c, W[x].c]]) {
            let run = null;
            A.forEach((qq) => { const d = minD([qq], B) - half; if (d < F) { if (!run) run = { min: d }; run.min = Math.min(run.min, d); } else if (run) { runs.push(run); run = null; } });
            if (run) runs.push(run);
          }
          for (const r of runs) { if (r.min > -E + 1e-6) { or3.push(`${name}: wires ${x} and ${y} graze at ${r.min.toFixed(3)} mm (neither a feature apart nor joined)`); break; } }
          const outside = runs.length ? null : minD(W[x].c, W[y].c) - half; if (outside != null) leastGap = Math.min(leastGap, outside);
        }
      }
      // OR4 every half-group is ROOTED: each of its contacts with the band is
      // a true embed (≥ EMBED_MM into the band footprint), and it has one
      const fs_ = feet(model, rel.scale);
      const halves = new Map();
      W.forEach((w, x) => { const key = `${owner[x].gi}${owner[x].side}`; if (!halves.has(key)) halves.set(key, []); halves.get(key).push(w); });
      for (const [key, ws] of halves) {
        let rooted = false;
        for (const w of ws) {
          let run = null; const runs = [];
          w.c.forEach((qq, i) => { const cl = -depthIn(fs_, qq) - w.t[i] / 2; if (cl < F) { if (!run) run = { min: cl }; run.min = Math.min(run.min, cl); } else if (run) { runs.push(run); run = null; } });
          if (run) runs.push(run);
          for (const r of runs) { if (r.min <= -E + 1e-6) { rooted = true; leastEmbed = Math.min(leastEmbed, -r.min); deepest = Math.max(deepest, -r.min); } else or4.push(`${name} group ${key}: a wire grazes the band at ${r.min.toFixed(3)} mm`); }
        }
        if (!rooted) or4.push(`${name} group ${key}: not rooted in the band (no contact reaches the ${E} mm embed)`);
      }
      // OR5 the mirror, to the bit, on the emitted vertices
      orn.groups.forEach((g, gi) => {
        const base = owner.findIndex((o) => o.gi === gi && o.side === 'R');
        for (let i = 0; i < g.curves.length; i++) {
          const A = parts[base + i], B = parts[base + g.curves.length + i];
          let bad = A.V !== B.V || A.C !== B.C;
          for (let v = 0; v < A.V && !bad; v++) for (let c = 0; c < A.C && !bad; c++) { const ia = 3 * A.T(v, c), ib = 3 * B.T(v, c); if (!Object.is(P[ib], -P[ia]) || !Object.is(P[ib + 1], P[ia + 1]) || !Object.is(P[ib + 2], P[ia + 2])) bad = true; }
          if (bad) or5.push(`${name}: ${g.group} wire ${i}'s mirror is not its source with x negated`);
        }
      });
      // OR6 filigree off is the frame itself
      const off = FL.withOrnament(G.buildFrame({ ...q, filigree: 'none' }));
      if (off.ornament || G.exportSvg(off).svg !== G.exportSvg(G.buildFrame({ ...q, filigree: 'none' })).svg) or6.push(`${name}: off is not the frame`);
    }
    rec('OR1 with the filigree on, every ornament row is watertight (boundary 0) and ONE voxel region, at the default and at density 5 with every group on, on all three skeletons', or1.length === 0, `${OROWS.length} rows${or1.length ? ' — ' + or1.slice(0, 3).join('; ') : ''}`);
    rec('OR2 no wire is narrower than the feature (read off the emitted walls)', or2.length === 0, `least wire ${leastWire.toFixed(4)} mm${or2.length ? ' — ' + or2.slice(0, 2).join('; ') : ''}`);
    rec('OR3 every gap is a feature or a junction: a wire\'s own coils, wires of one half-group (a contact must be a true overlap of the embed, never a graze), and wires of different groups or sides at least a feature apart', or3.length === 0, `least gap ${leastGap.toFixed(4)} mm${or3.length ? ' — ' + or3.slice(0, 3).join('; ') : ''}`);
    rec('OR4 every scroll group is rooted: each half has a contact with the band (the gate\'s own footprints) at least EMBED_MM deep, and no contact is a graze', or4.length === 0, `${built} groups built, ${notBuilt} given way (told); embeds ${leastEmbed.toFixed(3)}–${deepest.toFixed(3)} mm${or4.length ? ' — ' + or4.slice(0, 3).join('; ') : ''}`);
    rec('OR5 the ornament is mirror-symmetric to the bit: every left wire\'s emitted vertices are the right\'s with x negated', or5.length === 0, or5.slice(0, 2).join('; '));
    rec('OR6 the filigree off is the frame itself (no ornament field, the same SVG string)', or6.length === 0, or6.slice(0, 2).join('; '));
  }

  // base-tree byte identity, when a worktree is given
  if (label === 'shipped') {
    if (BASE) {
      const GB = await import(pathToFileURL(path.join(BASE, 'frame-geometry.js')).href);
      const RB = fs.existsSync(path.join(BASE, 'frame-relief.js')) ? await import(pathToFileURL(path.join(BASE, 'frame-relief.js')).href) : null;
      let moved = 0, stlMoved = 0, stlN = 0;
      for (const [, p] of ARCH_ROWS) {
        const m = G.buildFrame(p), mb = GB.buildFrame(p);
        if (G.exportSvg(m).svg !== GB.exportSvg(mb).svg) moved++;
        if (RB) { stlN++; const a = RL.exportStl(RL.buildRelief(m)), b = RB.exportStl(RB.buildRelief(mb)); if (a.length !== b.length || a.some((v, i) => v !== b[i])) stlMoved++; }
      }
      check(`S the SVG strings are byte-identical to ${path.basename(BASE)} on every arch row`, moved === 0, `${moved} of ${ARCH_ROWS.length} moved`);
      if (RB) check(`S2 the STL bytes are byte-identical to ${path.basename(BASE)} on every arch row`, stlMoved === 0, `${stlMoved} of ${stlN} moved`);
      else console.log(`     S2 (STL byte identity): SKIPPED — ${path.basename(BASE)} has no frame-relief.js`);
    } else console.log('     S/S2 (SVG and STL byte identity against a base worktree): SKIPPED — pass --base <worktree of e759041>');
  }
  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'an-open-edge', file: 'relief', from: 'mesh.quad(T(V - 1, c), B(V - 1, c), B(V - 1, c + 1), T(V - 1, c + 1)); // far end', to: '', breaks: ['W', 'SC1', 'SC6'] },   // the scroll wires close on the same far-end cap
  // floats at BOTH ends: a mullion lifted off the sill alone still hangs from its light's springing, one region
  { id: 'a-detached-mullion', file: 'geometry', from: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY], [info.mullionX[i - 1], subSpring], [1, 0], 2);', to: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY + 2], [info.mullionX[i - 1], subSpring - 3], [1, 0], 2);', breaks: ['C', 'B'] },
  { id: 'the-mesh-offsets-by-itself', file: 'relief', from: 'const off = offsetCurve(S, d);', to: 'const off = S.pts.map((q, i) => [q[0] + d * S.nrm[i][0], q[1] + d * S.nrm[i][1]]);', breaks: ['R'] },
  { id: 'the-embed-removed', file: 'relief', from: 'export const EMBED_MM = MIN_FEATURE_MM;', to: 'export const EMBED_MM = 0;', breaks: ['B', 'F0', 'SC6'] },   // a child scroll then only TOUCHES its parent
  // phase 2b: a closed loop left OPEN at its seam, and the seam moved 0.1 mm
  { id: 'the-closing-strip-dropped', file: 'relief', from: 'const strips = closed ? V : V - 1, nx = (v) => (v + 1) % V;', to: 'const strips = V - 1, nx = (v) => (v + 1) % V;', breaks: ['W', 'Q'] },
  { id: 'the-oval-seam-offset-0.1mm', file: 'geometry', from: "const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", to: "pts[0] = [pts[0][0] + 0.1, pts[0][1]]; const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", breaks: ['Q'] },
  // phase 3a, the scroll: the gap clamp removed, the eye under the floor, a
  // child laid off its parent's back
  { id: 'the-scroll-gap-clamp-removed', file: 'filigree', from: 'if (selfGap(scrollCurve({ ...base, turns: asked }), t).gap >= MIN_FEATURE_MM) return', to: 'if (true) return', breaks: ['SC3', 'SC6', 'SC7'] },
  { id: 'the-tightness-range-not-fitted', file: 'filigree', from: 'fitMemo.set(key, fitUncached({ ...spec, wire: t }, t))', to: 'fitMemo.set(key, { share: VOLUTE_SHARE, turnsMax: VOLUTE_TURNS[1] })', breaks: ['SC7'] },
  { id: 'the-eye-under-the-floor', file: 'filigree', from: 'const re = (t + MIN_FEATURE_MM) / 2;', to: 'const re = t / 2 + 0.1;', breaks: ['SC2', 'SC3'] },   // the eye itself is then a gap of 0.2 mm
  { id: 'a-child-floats-off-its-parent', file: 'filigree', from: 'const off = (wire + tw) / 2 - EMBED_MM;', to: 'const off = (wire + tw) / 2 + 0.5;', breaks: ['SC6'] },
  // phase 3a, step 2 — the ornament: a scroll left off its molding, the
  // graze rule removed (a gap under the floor between wire and band), the
  // group-clearance check removed (groups crowd under the floor), the mirror
  // rebuilt off the axis by 0.02 mm
  { id: 'a-scroll-detached', file: 'filigree', from: 'return { curves: cs, push: d };', to: 'return { curves: at(d - 3), push: d };', breaks: ['OR1', 'OR4'] },
  { id: 'the-graze-rule-removed', file: 'filigree', from: '    if (!g.length) break;', to: '    break;', breaks: ['OR4'] },
  { id: 'the-group-clearance-removed', file: 'filigree', from: 'if (worst < MIN_FEATURE_MM) { told.push(', to: 'if (false) { told.push(', breaks: ['OR3'] },
  { id: 'the-mirror-is-broken', file: 'filigree', from: 'export const mirrorCurve = (c) => ({ ...c, pts: c.pts.map(([x, y]) => [-x, y])', to: 'export const mirrorCurve = (c) => ({ ...c, pts: c.pts.map(([x, y]) => [0.02 - x, y])', breaks: ['OR5'] },
  { id: 'the-rect-seam-offset-0.1mm', file: 'geometry', from: 'push(0, yb, 0, 1, false); anchorIdx.bottom = 0;', to: 'push(0.1, yb, 0, 1, false); anchorIdx.bottom = 0;', breaks: ['Q'] },
];

async function negativeControl() {
  const srcG = fs.readFileSync(path.join(ROOT, 'frame-geometry.js'), 'utf8');
  const srcR = fs.readFileSync(path.join(ROOT, 'frame-relief.js'), 'utf8');
  const srcF = fs.readFileSync(path.join(ROOT, 'frame-filigree.js'), 'utf8');
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  for (const m of MUTANTS) {
    const n = (m.file === 'relief' ? srcR : m.file === 'filigree' ? srcF : srcG).split(m.from).length - 1;
    if (n !== 1) { console.log(`FAIL anchor ${m.id}: matches ${n} times`); process.exit(1); }
  }
  let bad = 0;
  for (const m of MUTANTS) {
    const gPath = path.join(ROOT, `_frame-geometry-mutant-${m.id}.js`), rPath = path.join(ROOT, `_frame-relief-mutant-${m.id}.js`);
    fs.writeFileSync(gPath, m.file === 'geometry' ? srcG.replace(m.from, m.to) : srcG);
    fs.writeFileSync(rPath, (m.file === 'relief' ? srcR.replace(m.from, m.to) : srcR).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`));
    const fPath = path.join(ROOT, `_frame-filigree-mutant-${m.id}.js`);
    fs.writeFileSync(fPath, (m.file === 'filigree' ? srcF.replace(m.from, m.to) : srcF).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`).replace("from './frame-relief.js'", `from './${path.basename(rPath)}'`));
    const G = await import(pathToFileURL(gPath).href + `?${Date.now()}`);
    const RL = await import(pathToFileURL(rPath).href + `?${Date.now()}`);
    const FL = await import(pathToFileURL(fPath).href + `?${Date.now()}`);
    const out = await run(G, R, RL, m.id, FL);
    fs.unlinkSync(gPath); fs.unlinkSync(rPath); fs.unlinkSync(fPath);
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
  const FL = await import(pathToFileURL(path.join(ROOT, 'frame-filigree.js')).href);
  await run(G, R, RL, 'shipped', FL);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
