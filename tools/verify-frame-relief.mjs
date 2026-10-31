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
   --shard=k/n         with --negative-control: only the mutants whose index
                       is k mod n (CI runs n = 3 jobs; changing n is two
                       edits in frame.yml, the matrix list and the n).
                       Every anchor is still checked first.

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

async function run(G, R, RL, label = 'shipped', FL = null, PT = null) {
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
    for (const taper of [false, true]) for (const kind of ['C', 'S']) for (const tightness of [0, 0.5, 1]) for (const length of [30, 60, 120]) for (const wire of [1, 1.6, 3.2]) grid.push({ kind, tightness, length, wire, balance: kind === 'C' ? 0.6 : 1, taper });
    const scs = grid.map((q) => ({ q, c: FL.buildScroll(q) }));
    // turning between consecutive chords (atan2: never acos)
    const turnAt = (P, i) => { const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1]; return Math.atan2(ax * by - ay * bx, ax * bx + ay * by); };
    const circR = (a, b, c) => { const A = Math.hypot(b[0] - c[0], b[1] - c[1]), B = Math.hypot(a[0] - c[0], a[1] - c[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2; return ar > 1e-15 ? A * B * C / (4 * ar) : Infinity; };
    // THE TAPER LAW RESTATED (phase 3b, Eva's ruling 1): full width t through
    // the body, linear in arc length over each volute (its last `share` of the
    // half) down to the tip max(F, ½ t) at the eye — written here from the
    // ruling's numbers and the module's declared share, never from c.w
    const TIP = (t) => Math.max(F, 0.5 * t);
    const lawW = (q, c, s) => { const t = Math.max(F, q.wire); if (!q.taper) return t; const beta = Math.min(1, Math.max(0.3, q.balance)), h2 = q.length / (1 + beta), h1 = q.length - h2, h = s < 0 ? h1 : h2, a = Math.abs(s), sv = h * (1 - c.info.share); return a <= sv ? t : t + (TIP(t) - t) * Math.min(1, (a - sv) / (h - sv)); };
    // the emitted wall widths of a one-wire relief: per row, first to last column
    const wallW = (rel) => { const pt = rel.parts[0], P = rel.positions, w = []; for (let v = 0; v < pt.V; v++) { const i0 = 3 * pt.T(v, 0), i1 = 3 * pt.T(v, pt.C - 1); w.push(Math.hypot(P[i0] - P[i1], P[i0 + 1] - P[i1 + 1])); } return w; };
    const crownZ = (rel) => { const pt = rel.parts[0], P = rel.positions, z = []; for (let v = 0; v < pt.V; v++) { let m = -Infinity; for (let k = 0; k < pt.C; k++) m = Math.max(m, P[3 * pt.T(v, k) + 2]); z.push(m - 1); } return z; };
    let sc1 = [], sc2 = [], sc3 = [], sc8 = [], worstEye = 0, worstTurn = 0, worstGap = Infinity;
    const thinnest = { false: Infinity, true: Infinity }, lawErr = { false: 0, true: 0 }, leastCrown = { false: Infinity, true: Infinity };
    for (const { q, c } of scs) {
      const rel = FL.scrollRelief([c], { baseZ: 1 });
      const a = RL.analyzeStl(RL.exportStl(rel)), cc = RL.connected(rel);
      if (a.boundary !== 0 || cc.comps !== 1) sc1.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire}${q.taper ? ' tapered' : ''}: boundary ${a.boundary}, ${cc.comps} regions`);
      const P = c.pts, n = P.length, t = Math.max(F, q.wire);
      // SC8: the emitted widths ARE the restated law, the thinnest ≥ F, and a
      // tapered crown is never under min(F, its body crown)
      const ww = wallW(rel), cz = crownZ(rel), D = t / 2;
      if (ww.length !== n) sc8.push(`${q.kind} L${q.length}: ${ww.length} rows for ${n} stations`);
      for (let i = 0; i < Math.min(n, ww.length); i++) { const e = Math.abs(ww[i] - lawW(q, c, c.u[i])); lawErr[q.taper] = Math.max(lawErr[q.taper], e); thinnest[q.taper] = Math.min(thinnest[q.taper], ww[i]); leastCrown[q.taper] = Math.min(leastCrown[q.taper], cz[i]); }
      if (Math.min(...ww) < F - 1e-9) sc8.push(`${q.kind} L${q.length} t${q.wire}${q.taper ? ' tapered' : ''}: wire ${Math.min(...ww).toFixed(4)} mm under the floor`);
      if (Math.min(...cz) < Math.min(F, D) - 1e-9) sc8.push(`${q.kind} L${q.length} t${q.wire}${q.taper ? ' tapered' : ''}: crown ${Math.min(...cz).toFixed(4)} mm under min(F, ${D})`);
      // the eye: the radius at each END, read off the last three vertices, is
      // the restated floor (t_eye + F)/2 — the wire's inner edge keeps F/2 of
      // radius on the wire's LOCAL width at the eye (the tip, tapered)
      const eyeWant = ((q.taper ? TIP(t) : t) + F) / 2;
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
      // less the two LOCAL half widths, read off the emitted walls
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (Math.abs(cum[j] - cum[i]) >= Math.PI) g = Math.min(g, Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - (ww[i] + ww[j]) / 2);
      worstGap = Math.min(worstGap, g);
      // within the chord's own turning step of the curve's π
      if (g < F - 1e-6) sc3.push(`${q.kind} τ${q.tightness} L${q.length} t${q.wire}: self-gap ${g.toFixed(4)} mm`);
    }
    rec('SC1 every scroll on the vocabulary grid is a closed solid: boundary 0 and one voxel region', sc1.length === 0, `${scs.length} scrolls${sc1.length ? ': ' + sc1.slice(0, 3).join('; ') : ''}`);
    rec('SC2 the drawn scroll is the law: each eye (the end vertices\' radius, extrapolated) is the restated floor (t + F)/2 within two steps of the spiral\'s own slope, each volute\'s drawn turns are the reported ones, never above the asked', sc2.length === 0, `worst eye ${(100 * worstEye).toFixed(3)}%, worst turns ${worstTurn.toFixed(4)}${sc2.length ? ' — ' + sc2.slice(0, 3).join('; ') : ''}`);
    rec('SC3 no wire comes within a feature of its own coil, eye or mouth (restated off the emitted chords, less the LOCAL widths off the emitted walls)', sc3.length === 0, `least self-gap ${worstGap.toFixed(4)} mm against ${F}${sc3.length ? ' — ' + sc3.slice(0, 3).join('; ') : ''}`);
    rec('SC8 the wire\'s width is the restated law off the emitted walls: constant at t, or tapered — t through the body, linear over each volute to max(F, ½ t) at the eye; never under F, and a tapered crown never under min(F, its body crown)', sc8.length === 0 && lawErr.false < 1e-9 && lawErr.true < 1e-9, `constant: thinnest ${thinnest.false.toFixed(4)} mm, law error ${lawErr.false.toExponential(1)}, least crown ${leastCrown.false.toFixed(4)} · tapered: thinnest ${thinnest.true.toFixed(4)} mm, law error ${lawErr.true.toExponential(1)}, least crown ${leastCrown.true.toFixed(4)}${sc8.length ? ' — ' + sc8.slice(0, 3).join('; ') : ''}`);
    const thin = FL.buildScroll({ kind: 'C', length: 60, tightness: 0.5, wire: 0.6 });
    rec('SC4 a wire under the floor is built AT it and told', thin.info.wire === F && thin.info.told.some((x) => /wire 0\.60/.test(x)), thin.info.told.join('; '));
    // SC5 mirror: x -> -x to the bit, and the group's junctions
    const c0 = scs[4].c, m0 = FL.placeCurve(c0, { mirror: true });
    const mirOk = m0.pts.every((p, i) => Object.is(p[0], -c0.pts[i][0]) && Object.is(p[1], c0.pts[i][1]));
    rec('SC5 a mirrored scroll is its source with x negated, to the bit', mirOk, `${m0.pts.length} vertices`);
    const sc6 = [];
    let leastPair = Infinity, longestWeb = 0, dropped = 0;
    for (const taper of [false, true]) for (const n of [2, 3, 4, 5]) for (const tightness of [0, 1]) {
      const g = FL.buildGroup({ n, length: 60, tightness, wire: 1.6, taper });
      const cs = g.map((x) => x.curve);
      // every asked child is BUILT: a child that cannot join is dropped (told),
      // and a clause over the children that exist would then examine nothing
      const dropTold = g[0].curve.info.told.filter((m) => /not built/.test(m)).length;
      if (g.length + dropTold !== n || g.length < 2) sc6.push(`group ${n}${taper ? ' tapered' : ''} τ${tightness}: ${g.length} of ${n} scrolls built, ${dropTold} told dropped`);
      dropped += n - g.length;
      const rel = FL.scrollRelief(cs, { baseZ: 1 });
      if (RL.analyzeStl(RL.exportStl(rel)).boundary !== 0 || RL.connected(rel).comps !== 1) sc6.push(`group ${n}: not one closed region`);
      // each child OVERLAPS its parent by at least the embed at the contact:
      // least centreline distance ≤ (t_p + t_c)/2 − EMBED, restated
      for (const x of g.filter((y) => y.role === 'child')) {
        const p = cs[x.parent], wl = (c, i) => (c.w ? c.w[i] : c.info.wire);
        // the overlap at the contact, on the LOCAL widths there
        let d = Infinity; x.curve.pts.forEach((a, i) => p.pts.forEach((b, j) => { d = Math.min(d, Math.hypot(a[0] - b[0], a[1] - b[1]) - (wl(x.curve, i) + wl(p, j)) / 2); }));
        // the bar is the embed RESTATED as the feature (charter §3: the embed is
        // MIN_FEATURE_MM, a length from a length) — never RL.EMBED_MM, which is
        // the quantity a broken embed would move with
        if (d > -F + 1e-6) sc6.push(`group ${n}${taper ? ' tapered' : ''}: a child stands ${d.toFixed(3)} mm off its parent (wants an overlap of ${F})`);
      }
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const pg = FL.pairGap(cs[i], cs[j]); leastPair = Math.min(leastPair, pg.gap); longestWeb = Math.max(longestWeb, pg.web); if (pg.gap < F - 1e-9) sc6.push(`group ${n} τ${tightness}: wires ${i}-${j} ${pg.gap.toFixed(3)} mm apart outside their junction`); }
    }
    rec('SC6 a group is one closed region; every asked child is built or told dropped, never all; each child overlaps its parent by the embed; outside each junction no two wires come within a feature', sc6.length === 0, `least pair gap ${leastPair.toFixed(4)} mm, longest junction web ${longestWeb.toFixed(1)} mm, ${dropped} children dropped (told)${sc6.length ? ' — ' + sc6.slice(0, 3).join('; ') : ''}`);
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
    // phase 3b (Eva's ruling 2): the volute's share is HELD at its step-1
    // value, 0.5 — restated here as the ruled number — and the slider's top
    // is the most that prints. The gap is the gate's OWN: the emitted
    // centreline's turning, less the two local half widths of the RESTATED
    // taper law — never frame-filigree's selfGap.
    const RULED_SHARE = 0.5;
    const sc7 = []; let rows = 0; const tops = [];
    for (const taper of [false, true]) for (const kind of ['C', 'S']) for (const length of [30, 60, 120]) for (const wire of [1.0, 1.6, 2.4]) {
      rows++;
      let prev = -Infinity, dead = 0, last = null;
      for (let i = 0; i <= 100; i++) { const c = FL.buildScroll({ kind, length, tightness: i / 100, wire, balance: 0.6, taper }); if (!(c.info.turnsHeld > prev + 1e-6)) dead++; prev = c.info.turnsHeld; last = c; }
      const tag = `${kind} L${length} t${wire}${taper ? ' tapered' : ''}`;
      if (dead) sc7.push(`${tag}: ${dead} dead steps`);
      const sh = last.info.share, top = last.info.turnsHeld, t = Math.max(F, wire);
      tops.push(`${tag} ${top.toFixed(2)}`);
      const tip = taper ? Math.max(F, 0.5 * t) : t, h2 = length / 1.6, h1 = length - h2;
      const wl = (s) => { if (!taper) return t; const h = s < 0 ? h1 : h2, a = Math.abs(s), sv = h * (1 - RULED_SHARE); return a <= sv ? t : t + (tip - t) * Math.min(1, (a - sv) / (h - sv)); };
      const gapAt = (turns) => {
        const c = FL.scrollCurve({ kind, length, wire: t, balance: 0.6, share: RULED_SHARE, turns, taper }), P = c.pts, n = P.length;
        const cum = [0]; for (let i = 1; i < n - 1; i++) { const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1]; cum.push(cum[i - 1] + Math.atan2(ax * by - ay * bx, ax * bx + ay * by)); }
        cum.push(cum[n - 2]);
        let g = Infinity; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (Math.abs(cum[j] - cum[i]) >= Math.PI) g = Math.min(g, Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - (wl(c.u[i]) + wl(c.u[j])) / 2);
        return g;
      };
      if (Math.abs(sh - RULED_SHARE) > 1e-12) sc7.push(`${tag}: share ${sh} — the volute grew past the ruled ${RULED_SHARE}`);
      if (gapAt(top) < F - 2e-3) sc7.push(`${tag}: the top ${top.toFixed(3)} turns does not print (gap ${gapAt(top).toFixed(4)})`);
      if (top < FL.VOLUTE_TURNS[1] - 1e-9 && gapAt(top + 0.01) >= F) sc7.push(`${tag}: ${(top + 0.01).toFixed(3)} turns still prints — the range stops short`);
    }
    rec('SC7 the tightness slider has no dead travel: every 0.01 step builds more turns, at 30/60/120 mm on 1.0/1.6/2.4 mm wire, constant and tapered, the volute share held at the ruled 0.5, and the top exactly the most that prints (the gate\'s own gap on local widths)', sc7.length === 0, `${rows} scrolls × 101 steps; tops (turns): ${tops.join(', ')}${sc7.length ? ' — ' + sc7.slice(0, 3).join('; ') : ''}`);
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
    // the default (phase 3d): carved RUNNING CHAINS; beside it the phase-3c
    // carved GROUPS with their clusters, and the tapered and constant groups
    for (const r of OROWS.splice(0)) { OROWS.push([`${r[0]} · chains`, { ...r[1], ornWireStyle: 'carved', ornLayout: 'chains' }], [`${r[0]} · carved`, { ...r[1], ornWireStyle: 'carved', ornLayout: 'groups' }], [`${r[0]} · tapered`, { ornShape: 'half-round', ...r[1], ornWireStyle: 'tapered', ornLeaves: 'off', ornLayout: 'groups' }], [`${r[0]} · constant`, { ornShape: 'half-round', ...r[1], ornWireStyle: 'constant', ornLeaves: 'off', ornLayout: 'groups' }]); }
    const styleOf = (name) => (/tapered$/.test(name) ? 'tapered' : /(carved|chains)$/.test(name) ? 'carved' : 'constant');
    const ST = { carved: { wire: Infinity, gap: Infinity, e0: Infinity, e1: 0 }, constant: { wire: Infinity, gap: Infinity, e0: Infinity, e1: 0 }, tapered: { wire: Infinity, gap: Infinity, e0: Infinity, e1: 0 } };
    // CL / TB (phase 3c): a leaf lies OVER its host; the relief never passes the budget
    const cl1 = [], tb1 = []; let leavesSeen = 0, leastLap = Infinity, mostTris = 0;
    const BUDGET = 1500000;   // the ruled budget, restated (the bloom's precedent)
    // the gate's own band footprints, in print mm: an open band is one
    // polygon, a closed loop two (outer, inner) — never bridged
    const pip = (pt, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
    const feet = (model, s) => model.spines.map((sp) => { const o = G.outerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]), i = G.innerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]); return sp.closed ? { loops: [o, i], inside: (q) => pip(q, o) && !pip(q, i) } : { loops: [[...o, ...i.slice().reverse(), o[0]]], inside: (q) => pip(q, [...o, ...i.slice().reverse()]) }; });
    const depthIn = (fs_, q) => { const ins = fs_.some((f) => f.inside(q)); let d = Infinity; for (const f of fs_) for (const l of f.loops) d = Math.min(d, G.distToPoly(q, l)); return ins ? d : -d; };
    const dseg = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };
    const minD = (A, B) => { let m = Infinity; for (const q of A) for (let k = 0; k < B.length - 1; k++) m = Math.min(m, dseg(q, B[k], B[k + 1])); return m; };
    // the least wall-to-wall clearance on LOCAL widths: per station of A and
    // segment of B, centreline distance less the two local half widths (the
    // wider end of B's segment — the stricter reading)
    const minDL = (A, tA, B, tB) => { let m = Infinity; for (let i = 0; i < A.length; i++) for (let k = 0; k < B.length - 1; k++) m = Math.min(m, dseg(A[i], B[k], B[k + 1]) - (tA[i] + Math.max(tB[k], tB[k + 1])) / 2); return m; };
    const or1 = [], or2 = [], or3 = [], or4 = [], or5 = [], or6 = [], or7 = [], or8 = [], or9 = [];
    let seatRows = 0, leastCrown = Infinity, worstSink = -Infinity;
    let worstSlit = -Infinity, slitRuns = 0, opened = 0, groupSlits = 0, groupOpen = 0;
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
      const st = ST[styleOf(name)];
      for (const w of W) { leastWire = Math.min(leastWire, w.wire); st.wire = Math.min(st.wire, w.wire); if (w.wire < F - 1e-9) or2.push(`${name}: a wire ${w.wire.toFixed(4)} mm wide`); }
      // which wire is in which group, and which side: groups.flatMap(curves, mirrored)
      const owner = []; let k = 0;
      orn.groups.forEach((g, gi) => { for (const side of g.mirrored.length ? ['R', 'L'] : ['R']) for (let i = 0; i < g.curves.length; i++) owner[k++] = { gi, side, i }; });
      const leafAt = orn.curves.map((c) => c.kind === 'leaf');
      // a leaf's HOST: in a group (phase 3c) the lead, its group's first wire;
      // in a CHAIN (phase 3d) the element of its own chain index; a junction
      // motif's leaf has none (the crossing rule throughout)
      const hostOf = (x) => {
        const c = orn.curves[x];
        if (!leafAt[x] || /^(axis|palmette|rosette)$/.test(c.info.role || '')) return -1;
        if (c.chainIndex != null) return owner.findIndex((o, y) => o.gi === owner[x].gi && o.side === owner[x].side && !leafAt[y] && orn.curves[y].chainIndex === c.chainIndex);
        return owner.findIndex((o) => o.gi === owner[x].gi && o.side === owner[x].side && o.i === 0);
      };
      // TB1 the relief within the budget and within the ornament's own bound
      const tri = rel.indices.length / 3; mostTris = Math.max(mostTris, tri);
      if (tri > BUDGET || tri > orn.tris.bound) tb1.push(`${name}: ${tri} triangles (bound ${orn.tris.bound}, budget ${BUDGET})`);
      // CL1 a leaf lies OVER its host: its emitted top at its root row stands
      // above the host lead's emitted top at the lead's root row
      const topAt = (pt, v) => { let m = -Infinity; for (let c = 0; c < pt.C; c++) m = Math.max(m, P[3 * pt.T(v, c) + 2]); return m; };
      W.forEach((w, x) => {
        if (!leafAt[x]) return;
        const host = hostOf(x);
        if (host < 0) return;
        leavesSeen++;
        const lead = orn.curves[host], lap = topAt(w.part, 0) - topAt(W[host].part, lead.root);
        leastLap = Math.min(leastLap, lap);
        if (!(lap > 1e-6)) cl1.push(`${name}: leaf ${x} stands ${lap.toFixed(4)} mm against its host's crown (under it)`);
      });
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
        for (let i = 0; i < n; i += 2) for (let j = i + 2; j < n; j += 2) if (Math.abs(cum[j] - cum[i]) >= Math.PI) { const g = Math.hypot(C[j][0] - C[i][0], C[j][1] - C[i][1]) - (W[x].t[i] + W[x].t[j]) / 2; leastGap = Math.min(leastGap, g); st.gap = Math.min(st.gap, g); if (g < F - 2e-3) { or3.push(`${name}: wire ${x} comes ${g.toFixed(3)} mm from its own coil`); i = n; break; } }
        for (let y = x + 1; y < W.length; y++) {
          const same = owner[x].gi === owner[y].gi && owner[x].side === owner[y].side;
          // a LEAF and any wire but its host lead CROSS (an overlap of half a
          // feature — the leaf is held by its host); everything else JOINS
          const hostPair = (leafAt[x] && hostOf(x) === y) || (leafAt[y] && hostOf(y) === x);
          const need = (leafAt[x] || leafAt[y]) && !hostPair ? F / 2 : E;
          // two SCROLLS of different groups or sides: a feature clear. A LEAF may
          // cross another group's wire (phase 3d: a junction motif and a chain)
          if (!same && !(leafAt[x] || leafAt[y])) { const d = minDL(W[x].c, W[x].t, W[y].c, W[y].t); leastGap = Math.min(leastGap, d); st.gap = Math.min(st.gap, d); if (d < F - 1e-6) or3.push(`${name}: wires ${x} and ${y} (different groups or sides) ${d.toFixed(3)} mm apart`); continue; }
          // runs of either wire's stations within a feature of the other; each
          // must reach an overlap ≥ E (read from both wires)
          const runs = [];
          for (const [A, B] of [[W[x], W[y]], [W[y], W[x]]]) {
            let run = null;
            A.c.forEach((qq, i) => { const d = minDL([qq], [A.t[i]], B.c, B.t); if (d < F) { if (!run) run = { min: d }; run.min = Math.min(run.min, d); } else if (run) { runs.push(run); run = null; } });
            if (run) runs.push(run);
          }
          for (const r of runs) { if (r.min > -need + 1e-6) { or3.push(`${name}: wires ${x} and ${y} graze at ${r.min.toFixed(3)} mm (neither a feature apart nor ${need === E ? 'joined' : 'crossed'})`); break; } }
          const outside = runs.length ? null : minDL(W[x].c, W[x].t, W[y].c, W[y].t); if (outside != null) { leastGap = Math.min(leastGap, outside); st.gap = Math.min(st.gap, outside); }
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
          for (const r of runs) { if (r.min <= -E + 1e-6) { rooted = true; leastEmbed = Math.min(leastEmbed, -r.min); deepest = Math.max(deepest, -r.min); st.e0 = Math.min(st.e0, -r.min); st.e1 = Math.max(st.e1, -r.min); } else or4.push(`${name} group ${key}: a wire grazes the band at ${r.min.toFixed(3)} mm`); }
        }
        if (!rooted) or4.push(`${name} group ${key}: not rooted in the band (no contact reaches the ${E} mm embed)`);
      }
      // OR7 nothing in the OPENING: no ornament vertex inside the frame's
      // silhouette (plateOutline, the owner of it) and in no band's footprint
      // (the gate's own feet). OR8 NO VISIBLE GAP (phase 3d, Eva's 2B): every
      // stretch of every wire within 2F of the band (2 × MIN_FEATURE_MM —
      // restated, never the module's CHAIN_GAP) reaches an embed; an approach
      // that comes near and does not touch reads as a slit
      const sil = RL.plateOutline(model).map(([x, y]) => [x * rel.scale, y * rel.scale]);
      W.forEach((w, x) => {
        // the chains' rule; the phase-3a groups are counted and reported
        for (const q of w.c) if (pip(q, sil) && depthIn(fs_, q) < 0) { if (!/chains$/.test(name)) { groupOpen++; break; } or7.push(`${name}: wire ${x} reaches into the opening at (${q[0].toFixed(1)}, ${q[1].toFixed(1)})`); opened++; break; }
        let run = null; const runs = [];
        w.c.forEach((qq, i) => { const cl = -depthIn(fs_, qq) - w.t[i] / 2; if (cl < 2 * F) { if (!run) run = { min: cl }; run.min = Math.min(run.min, cl); } else if (run) { runs.push(run); run = null; } });
        if (run) runs.push(run);
        // the CHAINS' rule (phase 3d); the phase-3a groups float by design — their
        // slits are what the ruling replaced, counted and reported, not asserted
        for (const r of runs) { slitRuns++; if (r.min > -E + 1e-6) { if (/chains$/.test(name)) { worstSlit = Math.max(worstSlit, r.min); or8.push(`${name}: wire ${x} comes ${r.min.toFixed(3)} mm from the band without joining it`); } else groupSlits++; break; } }
      });
      // OR9 SEATED ON THE MOLDING (phase 3d, Eva's 2B), the chains only: the
      // molding surface is read off the EMITTED band solids (their top grids,
      // rasterised; where bands embed, the higher), never off the module's
      // moldingLift. No ornament top vertex is below the molding under it (the
      // root stands on the height field — nothing of the band shows through),
      // and every ornament row's crest clears the highest molding under that row
      // by the feature (the top clears the molding top)
      if (/chains$/.test(name)) {
        const cell = 2, grid = new Map(), key = (i, j) => i * 100003 + j, tris = [];
        for (const bp of rel.parts.filter((x) => x.kind === 'band' && !/^orn/.test(x.id))) {   // the MOLDING: the ornament solids are bands too
          const last = bp.closed ? bp.V : bp.V - 1;
          for (let v = 0; v < last; v++) for (let c = 0; c < bp.C - 1; c++) {
            const nv = (v + 1) % bp.V, ids = [bp.T(v, c), bp.T(nv, c), bp.T(nv, c + 1), bp.T(v, c + 1)];
            for (const tri of [[ids[0], ids[1], ids[2]], [ids[0], ids[2], ids[3]]]) {
              const pt3 = tri.map((ix) => [P[3 * ix], P[3 * ix + 1], P[3 * ix + 2]]); const ti = tris.push(pt3) - 1;
              const xs = pt3.map((u) => u[0]), ys = pt3.map((u) => u[1]);
              for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...ys) / cell); j <= Math.floor(Math.max(...ys) / cell); j++) { const kk = key(i, j); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(ti); }
            }
          }
        }
        const surf = (x, y) => { let h = -Infinity; for (const ti of grid.get(key(Math.floor(x / cell), Math.floor(y / cell))) || []) { const [A, B, C2] = tris[ti]; const d = (B[1] - C2[1]) * (A[0] - C2[0]) + (C2[0] - B[0]) * (A[1] - C2[1]); if (Math.abs(d) < 1e-14) continue; const l1 = ((B[1] - C2[1]) * (x - C2[0]) + (C2[0] - B[0]) * (y - C2[1])) / d, l2 = ((C2[1] - A[1]) * (x - C2[0]) + (A[0] - C2[0]) * (y - C2[1])) / d, l3 = 1 - l1 - l2; if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) h = Math.max(h, l1 * A[2] + l2 * B[2] + l3 * C2[2]); } return h; };
        parts.forEach((pt, x) => {
          for (let v = 0; v < pt.V; v++) {
            let crest = -Infinity, under = -Infinity;
            for (let c = 0; c < pt.C; c++) {
              const ix = 3 * pt.T(v, c), z = P[ix + 2], h = surf(P[ix], P[ix + 1]); crest = Math.max(crest, z);
              if (h > -Infinity) { under = Math.max(under, h); worstSink = Math.max(worstSink, h - z); if (h - z > 1e-6) { or9.push(`${name}: wire ${x} row ${v} sits ${(h - z).toFixed(3)} mm under the molding`); break; } }
            }
            if (under > -Infinity) { seatRows++; leastCrown = Math.min(leastCrown, crest - under); if (crest - under < F - 1e-6) or9.push(`${name}: wire ${x} row ${v}'s crest clears the molding by ${(crest - under).toFixed(3)} mm`); }
          }
        });
      }
      // OR5 the mirror, to the bit, on the emitted vertices
      orn.groups.forEach((g, gi) => {
        const base = owner.findIndex((o) => o.gi === gi && o.side === 'R');
        // a motif ON the axis (phase 3d) is its own mirror: column c is column
        // C − 1 − c with x negated (=== so the centre column's ±0 agree)
        if (!g.mirrored.length) {
          for (let i = 0; i < g.curves.length; i++) {
            const A = parts[base + i]; let bad = false;
            for (let v = 0; v < A.V && !bad; v++) for (let c = 0; c < A.C && !bad; c++) { const ia = 3 * A.T(v, c), ib = 3 * A.T(v, A.C - 1 - c); if (P[ib] !== -P[ia] || P[ib + 1] !== P[ia + 1] || P[ib + 2] !== P[ia + 2]) bad = true; }
            if (bad) or5.push(`${name}: the ${g.group} motif on the axis is not its own mirror`);
          }
          return;
        }
        for (let i = 0; i < g.curves.length; i++) {
          const A = parts[base + i], B = parts[base + g.curves.length + i];
          let bad = A.V !== B.V || A.C !== B.C;
          for (let v = 0; v < A.V && !bad; v++) for (let c = 0; c < A.C && !bad; c++) { const ia = 3 * A.T(v, c), ib = 3 * B.T(v, c); if (P[ib] !== -P[ia] || P[ib + 1] !== P[ia + 1] || P[ib + 2] !== P[ia + 2]) bad = true; }   // === (a vertex ON the axis mirrors to −0)
          if (bad) or5.push(`${name}: ${g.group} wire ${i}'s mirror is not its source with x negated`);
        }
      });
      // OR6 filigree off is the frame itself
      const off = FL.withOrnament(G.buildFrame({ ...q, filigree: 'none' }));
      if (off.ornament || G.exportSvg(off).svg !== G.exportSvg(G.buildFrame({ ...q, filigree: 'none' })).svg) or6.push(`${name}: off is not the frame`);
    }
    rec('OR9 the chains are SEATED on the molding: no ornament top vertex below the emitted band surface under it, and every row\'s crest a feature above the highest molding under that row', or9.length === 0, `${seatRows} rows over the band, least crown above the molding ${leastCrown.toFixed(3)} mm, deepest sink ${worstSink.toFixed(4)} mm${or9.length ? ' — ' + or9.slice(0, 3).join('; ') : ''}`);
    rec('OR1 with the filigree on, every ornament row is watertight (boundary 0) and ONE voxel region, at the default and at density 5 with every group on, on all three skeletons', or1.length === 0, `${OROWS.length} rows${or1.length ? ' — ' + or1.slice(0, 3).join('; ') : ''}`);
    rec('OR2 no wire is narrower than the feature (read off the emitted walls)', or2.length === 0, `least wire ${leastWire.toFixed(4)} mm${or2.length ? ' — ' + or2.slice(0, 2).join('; ') : ''}`);
    rec('OR3 every gap is a feature or a junction: a wire\'s own coils, wires of one half-group (a contact must be a true overlap of the embed, never a graze), and wires of different groups or sides at least a feature apart', or3.length === 0, `least gap ${leastGap.toFixed(4)} mm${or3.length ? ' — ' + or3.slice(0, 3).join('; ') : ''}`);
    rec('OR4 every scroll group is rooted: each half has a contact with the band (the gate\'s own footprints) at least EMBED_MM deep, and no contact is a graze', or4.length === 0, `${built} groups built, ${notBuilt} given way (told); embeds ${leastEmbed.toFixed(3)}–${deepest.toFixed(3)} mm${or4.length ? ' — ' + or4.slice(0, 3).join('; ') : ''}`);
    rec('OR5 the ornament is mirror-symmetric to the bit: every left wire\'s emitted vertices are the right\'s with x negated', or5.length === 0, or5.slice(0, 2).join('; '));
    rec('OR6 the filigree off is the frame itself (no ornament field, the same SVG string)', or6.length === 0, or6.slice(0, 2).join('; '));
    rec('OR7 the CHAINS reach nothing into the OPENING: no chain vertex inside the frame\'s silhouette and in no band\'s footprint', or7.length === 0, `${opened} chain wires in the opening; the phase-3a groups put ${groupOpen} there (reported)${or7.length ? ' — ' + or7.slice(0, 3).join('; ') : ''}`);
    rec('OR8 no visible gap between the CHAINS and the band: every stretch of every chain wire within 2F of the band reaches an embed', or8.length === 0, `${slitRuns} approaches${worstSlit > -Infinity ? `, worst ${worstSlit.toFixed(3)} mm` : ', every chain one an embed'}; the phase-3a groups leave ${groupSlits} slits (reported)${or8.length ? ' — ' + or8.slice(0, 3).join('; ') : ''}`);
    rec('CL1 every leaf lies OVER its host scroll: its emitted top at its root stands above the host\'s crown at the host\'s root', leavesSeen > 0 && cl1.length === 0, `${leavesSeen} leaves, least lap ${leastLap.toFixed(4)} mm${cl1.length ? ' — ' + cl1.slice(0, 3).join('; ') : ''}`);
    rec('TB1 every ornament row\'s relief is within the 1,500,000-triangle budget and within the ornament\'s own predicted bound', tb1.length === 0, `most ${mostTris.toLocaleString('en-US')} triangles${tb1.length ? ' — ' + tb1.slice(0, 3).join('; ') : ''}`);
    console.log(`     per wire style (off the emitted mesh): ${['carved', 'constant', 'tapered'].map((k) => `${k}: thinnest wire ${ST[k].wire.toFixed(4)} mm, smallest gap ${ST[k].gap.toFixed(4)} mm, root embeds ${ST[k].e0.toFixed(3)}–${ST[k].e1.toFixed(3)} mm`).join(' · ')}`);
  }

  // CV / AR / LF / TB2 — the CARVED primitives (phase 3c, Eva's rulings on
  // the critique: the self-similar stroke 1B, the arris section P3, the leaf
  // P4; the triangle budget). Every law is RESTATED here from the ruling's
  // numbers and read against the EMITTED geometry — the walls' widths, the
  // centreline's own circumradius, the top grid's heights — never against
  // the module's records.
  if (FL && (label === 'shipped' || MUTANTS.find((m) => m.id === label)?.file === 'filigree')) {
    const F = R.MIN_FEATURE_MM;
    const K = 0.7, CAP = 0.1, LEAF_FOLD = 1.6, LEAF_TURN = 2.2;   // restated: width = 0.7 ρ capped at 0.1 L; a leaf under 1.6 ρ; a leaf turns 2.2 rad
    const circR = (a, b, c) => { const A = Math.hypot(b[0] - c[0], b[1] - c[1]), B = Math.hypot(a[0] - c[0], a[1] - c[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2; return ar > 1e-15 ? A * B * C / (4 * ar) : Infinity; };
    // one solid's emitted walls: per row, centre, width, the two wall points
    const walls = (rel, pt) => { const P = rel.positions, out = []; for (let v = 0; v < pt.V; v++) { const i0 = 3 * pt.T(v, 0), i1 = 3 * pt.T(v, pt.C - 1); const A = [P[i0], P[i0 + 1]], B = [P[i1], P[i1 + 1]]; out.push({ c: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], w: Math.hypot(A[0] - B[0], A[1] - B[1]), A, B }); } return out; };
    // the radius of curvature at each emitted row: the circumradius of the
    // emitted centreline's own triples (the ends take their neighbour's)
    const rhoOf = (Wl) => Wl.map((_, i) => { const j = Math.min(Math.max(i, 1), Wl.length - 2); return circR(Wl[j - 1].c, Wl[j].c, Wl[j + 1].c); });
    const turnSum = (Wl) => { let t = 0; for (let i = 1; i < Wl.length - 1; i++) { const a = Wl[i].c, p0 = Wl[i - 1].c, b = Wl[i + 1].c; const ax = a[0] - p0[0], ay = a[1] - p0[1], bx = b[0] - a[0], by = b[1] - a[1]; t += Math.atan2(ax * by - ay * bx, ax * bx + ay * by); } return t; };
    // no fold: each wall polyline runs WITH its centreline segment
    const folds = (Wl) => { let n = 0; for (let i = 0; i < Wl.length - 1; i++) { const cx = Wl[i + 1].c[0] - Wl[i].c[0], cy = Wl[i + 1].c[1] - Wl[i].c[1]; for (const k of ['A', 'B']) { const dx = Wl[i + 1][k][0] - Wl[i][k][0], dy = Wl[i + 1][k][1] - Wl[i][k][1]; if (dx * cx + dy * cy < 0) n++; } } return n; };
    const cv1 = [], cv2 = [], cv3 = [], cv4 = [], ar1 = [];
    let cvErr = 0, cvThin = Infinity, cvGap = Infinity, cvHalf = 0, arErr = 0, arRows = 0;
    // the arris section restated from its ruled formula (P3)
    const arrisZ = (x) => { const u = Math.abs(2 * x - 1), dome = Math.sqrt(Math.max(0, 1 - u * u)); return Math.max(0, (1 - u) ** 0.55 * (0.72 + 0.28 * Math.cos(Math.PI * u * 1.6) ** 2)) * dome ** 0.25; };
    for (const kind of ['C', 'S']) for (const L of [23, 40, 80, 120]) for (const tightness of [0, 0.5, 1]) {
      const cap = Math.max(F, CAP * L), tag = `${kind} L${L} τ${tightness}`;
      const c = FL.buildScroll({ kind, length: L, tightness, wire: cap, balance: kind === 'C' ? 0.6 : 1, carved: true });
      const rel = FL.scrollRelief([c], { baseZ: 1, shape: 'arris' });
      const a = RL.analyzeStl(RL.exportStl(rel)), cc = RL.connected(rel);
      if (a.boundary !== 0 || cc.comps !== 1) cv1.push(`${tag}: boundary ${a.boundary}, ${cc.comps} regions`);
      const pt = rel.parts[0], Wl = walls(rel, pt), rho = rhoOf(Wl);
      // CV2 the width is the self-similar law: min(cap, max(F, 0.7 ρ)) on
      // the EMITTED curvature. Rows at the floor or the cap are exact; an
      // interior row is compared IN CURVATURE — |0.7 / w − κ| × L ≤ 1 rad —
      // because near an inflection κ → 0 and a 3-point circumradius has an
      // unbounded RELATIVE error on a correct curve (2.3 % shipped, 5.8 % on a
      // longer volute), while its absolute error stays ~ds·|κ'| (0.27 rad
      // per length shipped; a law of 0.6 ρ reads 12)
      for (let i = 1; i < Wl.length - 1; i++) {
        const k = 1 / rho[i], w = Wl[i].w, law = Math.min(cap, Math.max(F, K * rho[i]));
        if (w > F + 1e-9 && w < cap - 1e-9) { const e = Math.abs(K / w - k) * L; cvErr = Math.max(cvErr, e); if (e > 1) { cv2.push(`${tag}: row ${i} width ${w.toFixed(4)} implies κ ${(K / w).toFixed(4)} against the emitted ${k.toFixed(4)}`); break; } }
        else if (Math.abs(w - law) > 1e-6 * law) { cv2.push(`${tag}: clamped row ${i} width ${w.toFixed(4)}, the law ${law.toFixed(4)}`); break; }
        cvThin = Math.min(cvThin, w);
      }
      { const lo = Math.min(...Wl.map((r) => r.w)), hi = Math.max(...Wl.map((r) => r.w)); if (lo < F - 1e-9 || hi > cap + 1e-9) cv2.push(`${tag}: width ${lo.toFixed(4)}–${hi.toFixed(4)} outside [${F}, ${cap}]`); }
      // CV3 no fold: the half width stays under the radius of curvature and
      // no wall runs back against its centreline
      for (let i = 1; i < Wl.length - 1; i++) cvHalf = Math.max(cvHalf, Wl[i].w / 2 / rho[i]);
      const nf = folds(Wl); if (nf || cvHalf >= 1) cv3.push(`${tag}: ${nf} wall segments reversed, half width / ρ up to ${cvHalf.toFixed(3)}`);
      // CV4 the coils: stations the emitted centreline turns ≥ π between are a
      // feature apart (centreline distance less the two emitted widths)
      const cum = [0]; for (let i = 1; i < Wl.length - 1; i++) { const p0 = Wl[i - 1].c, q = Wl[i].c, b = Wl[i + 1].c; const ax = q[0] - p0[0], ay = q[1] - p0[1], bx = b[0] - q[0], by = b[1] - q[1]; cum.push(cum[i - 1] + Math.atan2(ax * by - ay * bx, ax * bx + ay * by)); } cum.push(cum[cum.length - 1]);
      for (let i = 0; i < Wl.length; i++) for (let j = i + 2; j < Wl.length; j++) if (Math.abs(cum[j] - cum[i]) >= Math.PI) { const g = Math.hypot(Wl[j].c[0] - Wl[i].c[0], Wl[j].c[1] - Wl[i].c[1]) - (Wl[i].w + Wl[j].w) / 2; cvGap = Math.min(cvGap, g); if (g < F - 2e-3) { cv4.push(`${tag}: a coil ${g.toFixed(3)} mm from its neighbour`); i = Wl.length; break; } }
      // AR1 the arris section: on every BODY row (the width at the cap) the
      // top grid's heights across the columns are the restated arris × the
      // crown cap/2 on the base, exactly
      const P = rel.positions;
      for (let v = 0; v < pt.V; v++) if (Math.abs(Wl[v].w - cap) < 1e-9) { arRows++; for (let k = 0; k < pt.C; k++) { const e = Math.abs(P[3 * pt.T(v, k) + 2] - (1 + arrisZ(k / (pt.C - 1)) * cap / 2)); arErr = Math.max(arErr, e); } }
      if (pt.C !== 17) ar1.push(`${tag}: ${pt.C} columns across, not the arris's 17`);
    }
    if (arErr > 1e-9 || arRows === 0) ar1.push(`the body rows' heights are ${arErr.toExponential(2)} mm off the restated arris (${arRows} rows)`);
    rec('CV1 every carved scroll (C and S, 23–120 mm, tightness 0 / ½ / 1) is a closed solid: boundary 0 and one voxel region', cv1.length === 0, `24 scrolls${cv1.length ? ' — ' + cv1.slice(0, 3).join('; ') : ''}`);
    rec('CV2 the carved width is the self-similar law on the EMITTED curvature — min(0.1 L, max(F, 0.7 ρ)): the floor and cap rows exact, every other row within 1 rad per scroll length in curvature; never under F nor over the cap', cv2.length === 0, `worst κ error ${cvErr.toFixed(3)} rad per length, thinnest ${cvThin.toFixed(4)} mm${cv2.length ? ' — ' + cv2.slice(0, 3).join('; ') : ''}`);
    rec('CV3 a carved stroke never folds: its half width stays under the radius of curvature and no emitted wall runs back against its centreline', cv3.length === 0, `half width / ρ at most ${cvHalf.toFixed(3)}${cv3.length ? ' — ' + cv3.slice(0, 3).join('; ') : ''}`);
    rec('CV4 a carved scroll\'s coils stay a feature apart (off the emitted walls)', cv4.length === 0, `least coil gap ${cvGap.toFixed(4)} mm${cv4.length ? ' — ' + cv4.slice(0, 3).join('; ') : ''}`);
    rec('AR1 the arris section is the ruled formula: every body row\'s top heights are the restated arris × the crown (cap/2) on the base, exactly, 17 columns across', ar1.length === 0, `${arRows} body rows, worst ${arErr.toExponential(1)} mm${ar1.length ? ' — ' + ar1.slice(0, 2).join('; ') : ''}`);

    // CV5 no dead travel on a carved stroke either (Eva's ruling 2 on step 1,
    // carried to the new law): every 0.01 tightness step builds more turns,
    // and the top is the most that prints — a hundredth of a turn more closes
    // a coil under F, by the gate's own coil gap (turning ≥ π, less the two
    // carried widths), never the module's selfGap
    const cv5 = []; const tops5 = [];
    const gapC = (kind, L, turns) => {
      const cap = Math.max(F, CAP * L), c = FL.scrollCurve({ kind, length: L, wire: cap, balance: kind === 'C' ? 0.6 : 1, share: 0.5, turns, carved: true }), P = c.pts, n = P.length;
      const w = c.w;   // the widths the stroke carries — CV2 holds them to the law off the emitted walls; at the top the gap sits exactly on F, so a second statement 2 % off would flip it
      const cum = [0]; for (let i = 1; i < n - 1; i++) { const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1]; cum.push(cum[i - 1] + Math.atan2(ax * by - ay * bx, ax * bx + ay * by)); } cum.push(cum[n - 2]);
      let g = Infinity; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (Math.abs(cum[j] - cum[i]) >= Math.PI) g = Math.min(g, Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]) - (w[i] + w[j]) / 2);
      return g;
    };
    for (const kind of ['C', 'S']) for (const L of [23, 60, 120]) {
      const cap = Math.max(F, CAP * L); let prev = -Infinity, dead = 0, last = null;
      for (let i = 0; i <= 100; i++) { const c = FL.buildScroll({ kind, length: L, tightness: i / 100, wire: cap, balance: kind === 'C' ? 0.6 : 1, carved: true }); if (!(c.info.turnsHeld > prev + 1e-6)) dead++; prev = c.info.turnsHeld; last = c; }
      const top = last.info.turnsHeld, tag = `${kind} L${L}`; tops5.push(`${tag} ${top.toFixed(2)}`);
      if (dead) cv5.push(`${tag}: ${dead} dead steps`);
      if (gapC(kind, L, top) < F - 2e-3) cv5.push(`${tag}: the top ${top.toFixed(3)} turns does not print`);
      if (top < FL.VOLUTE_TURNS[1] - 1e-9 && gapC(kind, L, top + 0.01) >= F) cv5.push(`${tag}: ${(top + 0.01).toFixed(3)} turns still prints — the range stops short`);
    }
    rec('CV5 a carved scroll\'s tightness slider has no dead travel and its top is exactly the most that prints (the gate\'s own coil gap)', cv5.length === 0, `6 scrolls × 101 steps; tops (turns): ${tops5.join(', ')}${cv5.length ? ' — ' + cv5.slice(0, 3).join('; ') : ''}`);

    // LF the LEAF (P4), on its own grid: 6 / 12 / 30 / 60 mm, both curls
    const lf1 = [], lf2 = [], lf3 = [], lf4 = [];
    let lfErr = 0, lfThin = Infinity, lfHalf = 0, lfTurn = 0;
    const env = (a, Wd) => Wd * Math.pow(Math.sin(Math.PI * Math.pow(a, 0.75)), 0.8) * (0.5 + 0.5 * Math.sqrt(Math.max(0, Math.sin(Math.PI * ((4 * a) % 1)))));   // restated: 4 lobes, notched
    // the fold guard (1.6 ρ) never binds at the shipped curl — the leaf's curl
    // is not a control — so a written-down WITNESS row curls 6 rad, where the
    // guard binds on 26 of its 76 rows (a law of the primitive the sliders
    // cannot reach is still a law, and a gate that never exercises it is blind)
    const LEAVES = []; for (const L of [6, 12, 30, 60]) for (const side of [1, -1]) LEAVES.push([L, side, LEAF_TURN]);
    LEAVES.push([30, 1, 6]);
    for (const [L, side, curl] of LEAVES) {
      const Wd = 0.38 * L, tag = `leaf L${L} ${side > 0 ? 'left' : 'right'}${curl !== LEAF_TURN ? ` curl ${curl}` : ''}`;
      const lf = FL.buildLeaf({ length: L, width: Wd, side, curl });
      const mesh = new RL.Mesh();
      RL.bandSolid(mesh, { id: 'leaf', pts: lf.pts, nrm: lf.nrm, bandWidth: lf.info.wire, widthScale: lf.w.map((x) => x / lf.info.wire) }, FL.wireProfile('leaf'), { scale: 1, plateT: 1, reliefDepth: 0.18 * Wd });
      const rel = { positions: Float64Array.from(mesh.pos), indices: Uint32Array.from(mesh.idx), parts: mesh.parts };
      const a = RL.analyzeStl(RL.exportStl(rel)), cc = RL.connected(rel);
      if (a.boundary !== 0 || cc.comps !== 1) lf1.push(`${tag}: boundary ${a.boundary}, ${cc.comps} regions`);
      const Wl = walls(rel, rel.parts[0]), rho = rhoOf(Wl);
      // the arc length along the EMITTED centreline
      const s = [0]; for (let i = 1; i < Wl.length; i++) s.push(s[i - 1] + Math.hypot(Wl[i].c[0] - Wl[i - 1].c[0], Wl[i].c[1] - Wl[i - 1].c[1]));
      for (let i = 0; i < Wl.length; i++) {
        const law = Math.max(F, Math.min(env(Math.min(1, s[i] / L), Wd), LEAF_FOLD * rho[i])), e = Math.abs(Wl[i].w - law) / law;
        lfErr = Math.max(lfErr, e); lfThin = Math.min(lfThin, Wl[i].w);
        if (e > 0.05) { lf2.push(`${tag}: row ${i} width ${Wl[i].w.toFixed(4)} against ${law.toFixed(4)}`); break; }
      }
      for (let i = 1; i < Wl.length - 1; i++) lfHalf = Math.max(lfHalf, Wl[i].w / 2 / rho[i]);
      const nf = folds(Wl);
      if (Math.min(...Wl.map((r) => r.w)) < F - 1e-9 || nf || lfHalf >= 1) lf3.push(`${tag}: thinnest ${Math.min(...Wl.map((r) => r.w)).toFixed(4)}, ${nf} reversed wall segments, half width / ρ ${lfHalf.toFixed(3)}`);
      // the emitted centreline is a polygon, so its turn misses the
      // curvature in the first and last half steps: restated from the law
      // (κ ∝ s^p, p 2.2), the polygon turns θ[(1 − h)^(p+1) − h^(p+1)], h = ds / 2L
      const hh = s[s.length - 1] / (Wl.length - 1) / 2 / L, want = side * curl * ((1 - hh) ** 3.2 - hh ** 3.2);
      const turn = turnSum(Wl), te = Math.abs(turn - want);
      lfTurn = Math.max(lfTurn, te);
      if (te > 1e-3) lf4.push(`${tag}: turns ${turn.toFixed(4)} rad, the ruled law's polygon ${want.toFixed(4)}`);
    }
    rec('LF1 every leaf (6–60 mm, both curls, and the curl-6 witness) is a closed solid: boundary 0 and one voxel region', lf1.length === 0, `9 leaves${lf1.length ? ' — ' + lf1.slice(0, 3).join('; ') : ''}`);
    rec('LF2 a leaf\'s width is the restated law on the EMITTED centreline: the lobed, notched envelope (4 lobes) held under 1.6 ρ (binding on the curl-6 witness) and floored at F, within 5 %', lf2.length === 0, `worst ${(100 * lfErr).toFixed(2)} %${lf2.length ? ' — ' + lf2.slice(0, 3).join('; ') : ''}`);
    rec('LF3 a leaf is never under the feature and never folds (half width under ρ, no wall reversed)', lf3.length === 0, `thinnest ${lfThin.toFixed(4)} mm, half width / ρ at most ${lfHalf.toFixed(3)}${lf3.length ? ' — ' + lf3.slice(0, 3).join('; ') : ''}`);
    rec('LF4 a leaf turns by the ruled 2.2 rad in the direction of its curl (summed off the emitted centreline, against the law\'s own polygon, within 1e-3 rad)', lf4.length === 0, `worst ${lfTurn.toExponential(1)} rad${lf4.length ? ' — ' + lf4.slice(0, 3).join('; ') : ''}`);

    // TB2 the budget's give-way. No reachable state measured passes 1.5 M
    // (the sliders' ceiling on a 600 mm print reads 831,272 rect / 1,152,588
    // arch / 876,744 oval — crowding drops groups first), so the mechanism
    // is exercised by handing the SHIPPED ornamentFor a budget the default
    // rectangle at its ceiling passes: groups give way whole, told, the
    // relief within it — and the real budget restated as 1,500,000.
    // both layouts: the chains (phase 3d, the default) and the groups
    const tb = [];
    for (const layout of ['chains', 'groups']) {
      const stress = G.buildFrame({ skeleton: 'rect', printHeight: 400, filigree: 'scrolls', ornLayout: layout, ornDensity: 5, ornCrest: 'on', ornCorners: 'on', ornSides: 'on', ornBottom: 'on', ornScale: 6, ornLeafSize: 0.6, ornTightness: 1 });
      const full = FL.withOrnament(stress), fullTris = RL.buildRelief(full).indices.length / 3;
      const cut = Math.round((fullTris + full.ornament.tris.frame) / 2);
      const tight = FL.withOrnament(stress, { triBudget: cut }), tightTris = RL.buildRelief(tight).indices.length / 3, gave = tight.ornament.told.filter((m) => /budget/.test(m));
      tb.push({ layout, ok: gave.length > 0 && tightTris <= cut && tight.ornament.groups.length > 0 && tight.ornament.groups.length < full.ornament.groups.length, msg: `${layout}: ceiling rectangle ${fullTris.toLocaleString('en-US')} tris in ${full.ornament.groups.length} groups; at a ${cut.toLocaleString('en-US')} budget ${tight.ornament.groups.length}, ${tightTris.toLocaleString('en-US')} tris, ${gave.length} told${gave.length ? ' — "' + gave[0] + '"' : ''}` });
    }
    rec('TB2 past the budget a chain (or a group) gives way whole, told, and the relief stays within it — both layouts, exercised at half the ceiling rectangle\'s own count; the shipped budget is 1,500,000', tb.every((t) => t.ok) && RL.FRAME_TRI_BUDGET === 1500000, tb.map((t) => t.msg).join(' · '));
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

  // PT — THE BAND PATTERN (phase 3e, step 1): beads FUSED along a band's
  // edge, or a laurel run of overlapping leaf tips, each seated on the
  // molding's own profile. Every quantity is read off the EMITTED mesh —
  // a bead's centre and radius off its two emitted poles, a leaf's rows off
  // its top grid — against the gate's OWN owners: the band's two edges
  // (outerEdge / innerEdge, the boundaries' owner), the profile samples
  // restated over the element's span, MIN_FEATURE_MM, and the ruled 1.8 r
  // and ½–¾-of-a-leaf pitch bands restated as numbers (never imported from
  // frame-pattern.js, which is the quantity under test).
  if (PT && (label === 'shipped' || MUTANTS.find((m) => m.id === label)?.file === 'pattern')) {
    const F = R.MIN_FEATURE_MM, FUSE = 1.8, LEAF_LO = 0.5, LEAF_HI = 0.75;
    const BEAD = { bandPattern: 'beading' }, LEAF = { bandPattern: 'leaf-tips' };
    const PTROWS = [
      ['arch beading inner', BEAD], ['arch beading both, pitch held (2 mm beads asked 3 mm apart)', { ...BEAD, bandEdge: 'both', bandSize: 2, bandPitch: 3 }],
      ['arch leaf inner, pitch held (6 mm leaves asked 6 mm apart)', { ...LEAF, bandSize: 6, bandPitch: 6 }], ['arch sill none leaf', { ...LEAF, sill: 'none' }],
      ['rect mitre beading', { skeleton: 'rect', ...BEAD }], ['rect eared leaf outer', { skeleton: 'rect', cornerTreatment: 'eared', ...LEAF, bandEdge: 'outer', bandSize: 6, bandPitch: 4 }],
      ['rect rounded beading both', { skeleton: 'rect', cornerTreatment: 'rounded', ...BEAD, bandEdge: 'both' }],
      ['oval reeded beading', { skeleton: 'oval', profilePreset: 'reeded', ...BEAD }], ['circle leaf both', { skeleton: 'oval', aspect: 1, ...LEAF, bandEdge: 'both', bandSize: 8, bandPitch: 5 }],
      ['circle beading, fluted, outer', { skeleton: 'oval', aspect: 1, profilePreset: 'fluted', ...BEAD, bandEdge: 'outer' }],
    ];
    const pt0 = [], pt1 = [], pt2 = [], pt3 = [], pt4 = [], pt5 = [];
    let beadsSeen = 0, leavesSeen = 0, leastNeck = Infinity, widestPitchR = 0, worstSeat = 0, worstStack = Infinity, mostTris = 0, overlapLo = Infinity, overlapHi = 0;
    // PT0 the rows and the branch: four print rows, defaults in range, none by default; off, no pattern field
    const prow = (id) => R.PARAM_SPEC.find((q) => q.id === id);
    const prows = ['bandPattern', 'bandEdge', 'bandSize', 'bandPitch'].map(prow);
    if (!prows.every((q) => q && q.section === 'print')) pt0.push('the four pattern rows are not all in the print section');
    if (prow('bandPattern') && prow('bandPattern').default !== 'none') pt0.push('the pattern is on by default');
    { const m = PT.withPattern(G.buildFrame({})); if (m.pattern) pt0.push('a frame with no pattern carries a pattern field'); }
    const pip = (pt, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
    for (const [name, q] of PTROWS) {
      const model = PT.withPattern(G.buildFrame(q));
      const relief = RL.buildRelief(model), P = relief.positions, s = relief.scale;
      const bytes = RL.exportStl(relief), a = RL.analyzeStl(bytes), c = RL.connected(relief);
      mostTris = Math.max(mostTris, a.triangles);
      if (a.boundary !== 0 || c.comps !== 1) pt1.push(`${name}: boundary ${a.boundary}, ${c.comps} regions`);
      const prof = model.prof, rd = relief.reliefDepth, plateT = relief.plateT, W = model.params.moldingWidth * s;
      // the gate's own band edges, print mm, and the across-fraction of a
      // point: its distance to the outer edge over its distance to both
      // the band(s) a path runs on, named by the record (used to know which
      // part is which, never for a number): the loop, the head and jamb, the sill
      const spinesOf = (key) => (/:loop\|/.test(key) ? ['frame'] : /:head\|/.test(key) ? ['head', 'jambR', 'jambL'] : ['sill']).map((id) => model.spines.find((sp) => sp.id === id)).filter(Boolean);
      const edgeOf = (sp) => ({ o: G.outerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]), i: G.innerEdge(sp, sp.bandWidth).map(([x, y]) => [x * s, y * s]) });
      const edgeMemo = new Map(), edgesFor = (key) => { if (!edgeMemo.has(key)) edgeMemo.set(key, spinesOf(key).map(edgeOf)); return edgeMemo.get(key); };
      // the across-fraction of a point on its band: the distance to the
      // outer edge over its distance to both, on the band of the path's
      // own spines whose two edges the point lies between (the nearest pair)
      const across = (q, key) => { let best = null; for (const e of edgesFor(key)) { const dO = G.distToPoly(q, e.o), dI = G.distToPoly(q, e.i); if (!best || dO + dI < best.sum) best = { sum: dO + dI, f: dO / (dO + dI) }; } return best.f; };
      // ARC LENGTH along the gate's own column: offsetCurve at the pattern's
      // column (the band's half width less the element's half width, the
      // sign the record's edge), the spines of the path concatenated in the
      // builder's own order — the apex to the sill on the arch, the whole
      // loop on a closed frame — so a spacing is measured along the path,
      // where a chord across a mitre reads short
      const columnPoly = (key, half) => {
        const inner = /^inner:/.test(key), d = (inner ? 1 : -1) * (model.params.moldingWidth / 2 - half / s);
        const col = (sp) => { const off = G.offsetCurve(sp, d), joins = sp.joins || []; const near = (i) => { let b = joins[0], bd = Infinity; const n = off.length; for (const j of joins) { const dd = sp.closed ? Math.min((i - j + n) % n, (j - i + n) % n) : Math.abs(i - j); if (dd < bd) { bd = dd; b = j; } } return b; }; return off.map((q, i) => { const r = q || off[near(i)]; return [r[0] * s, r[1] * s]; }); };
        const sps = spinesOf(key);
        if (sps[0].closed) { const c = col(sps[0]); return [...c, c[0]]; }
        if (/:head\|/.test(key)) { const h = col(sps[0]), j = sps[0].joins[0], out = []; for (let i = j; i >= 0; i--) out.push(h[i]); const jr = col(sps[1]); for (let i = jr.length - 1; i >= 0; i--) out.push(jr[i]); const m = out.slice(1).map(([x, y]) => [-x, y]).reverse(); return [...m, ...out]; }   // extended through its mirror past the axis, as the builder's path is (a first leaf's base lies past it)
        return col(sps[0]);
      };
      const arcOn = (poly, q) => { const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1])); let best = Infinity, at = 0; for (let k = 0; k < poly.length - 1; k++) { const A = poly[k], B = poly[k + 1], dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q[0] - A[0]) * dx + (q[1] - A[1]) * dy) / l2)) : 0; const dd = Math.hypot(q[0] - A[0] - t * dx, q[1] - A[1] - t * dy); if (dd < best) { best = dd; at = cum[k] + t * (cum[k + 1] - cum[k]); } } return { s: at, total: cum[cum.length - 1], off: best }; };
      const arcGaps = (poly, pts) => { const ss = pts.map((q) => arcOn(poly, q)), total = ss[0].total, out = []; for (let k = 1; k < ss.length; k++) { let d = Math.abs(ss[k].s - ss[k - 1].s); if (d > total / 2) d = total - d; out.push(d); } return { gaps: out, worstOff: Math.max(...ss.map((x) => x.off)) }; };
      // the profile's highest z over an across span, restated: linear
      // between the samples, so the maximum is at a sample or an end
      const zAt = (f) => { const x = prof.x, z = prof.z; if (f <= x[0]) return z[0]; for (let k = 1; k < x.length; k++) if (f <= x[k]) return z[k - 1] + (z[k] - z[k - 1]) * (f - x[k - 1]) / (x[k] - x[k - 1]); return z[x.length - 1]; };
      const zMax = (f0, f1) => { const lo = Math.max(0, Math.min(f0, f1)), hi = Math.min(1, Math.max(f0, f1)); let m = Math.max(zAt(lo), zAt(hi)); for (let k = 0; k < prof.x.length; k++) if (prof.x[k] >= lo && prof.x[k] <= hi) m = Math.max(m, prof.z[k]); return m; };
      const parts = relief.parts.filter((pp) => pp.pattern);
      const byPath = new Map();
      for (const pp of parts) { const k = `${pp.pattern.path}|${pp.pattern.side}`; if (!byPath.has(k)) byPath.set(k, []); byPath.get(k).push(pp); }
      for (const [key, list] of byPath) {
        list.sort((x, y) => x.pattern.seq - y.pattern.seq);
        const closed = /:loop\|/.test(key);
        if (list[0].kind === 'bead') {
          // the centre and radius off the two emitted poles
          const beads = list.map((pp) => { const t = 3 * pp.base, b = 3 * (pp.base + 1 + (pp.lat - 1) * pp.lon); const top = [P[t], P[t + 1], P[t + 2]], bot = [P[b], P[b + 1], P[b + 2]]; return { c: [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2], r: (top[2] - bot[2]) / 2, bot: bot[2] }; });
          beadsSeen += beads.length;
          // PT3 seated: the bottom pole at the band's highest surface under the
          // bead's span — its across-fraction RESTATED from the record's edge and the
          // emitted radius (the column the bead sits on), never read off the plan;
          // bead's span, less the feature, exactly
          for (const b of beads) { const f = 0.5 + (/^inner:/.test(key) ? 1 : -1) * (W / 2 - b.r) / W, want = plateT + zMax(f - b.r / W, f + b.r / W) * rd - F; worstSeat = Math.max(worstSeat, Math.abs(b.bot - want)); if (Math.abs(b.bot - want) > 1e-6) pt3.push(`${name} ${key}: a bead's bottom ${b.bot.toFixed(4)} against the band's surface less the feature ${want.toFixed(4)}`); }
          // PT2 fused: every neighbouring pair within 1.8 r, with a neck
          const gaps = [];
          // on a closed loop the bead after the last is its own mirror across the seam
          const beadSeq = closed && list[0].pattern.side === 'R' ? [...beads, { ...beads.at(-1), c: [-beads.at(-1).c[0], beads.at(-1).c[1], beads.at(-1).c[2]] }] : beads;
          for (let k = 1; k < beadSeq.length; k++) { const d = Math.hypot(beadSeq[k].c[0] - beadSeq[k - 1].c[0], beadSeq[k].c[1] - beadSeq[k - 1].c[1]), r = Math.min(beadSeq[k].r, beadSeq[k - 1].r); gaps.push(d); widestPitchR = Math.max(widestPitchR, d / r); if (d > FUSE * r + 1e-6) pt2.push(`${name} ${key}: beads ${k - 1}-${k} ${d.toFixed(3)} mm apart on r ${r.toFixed(3)} (${(d / r).toFixed(3)} r)`); leastNeck = Math.min(leastNeck, Math.sqrt(Math.max(0, r * r - d * d / 4))); }
          // PT4 seamless: the run starts ON the axis (its mirror's own bead),
          // every spacing equal, and a closed loop's run ends on the axis too
          // (the seam), so the gap across the seam and across the axis is that
          // same spacing on the mirrored side
          if (list[0].pattern.side === 'R') {
            if (Math.abs(beads[0].c[0]) > 1e-9) pt4.push(`${name} ${key}: the first bead stands ${beads[0].c[0].toFixed(4)} mm off the axis`);
            if (closed && Math.abs(beads[beads.length - 1].c[0]) > 1e-9) pt4.push(`${name} ${key}: the last bead stands ${beads[beads.length - 1].c[0].toFixed(4)} mm off the axis at the seam`);
            // chord spacing is uniform only on a straight: compare ARC spacing
            // along the gate's own edge polylines (the across-fraction's edge,
            // projected)
            const ag = arcGaps(columnPoly(key, beads[0].r), beads.map((b) => b.c)), mean = ag.gaps.reduce((x, y) => x + y, 0) / ag.gaps.length;
            if (ag.worstOff > 1e-3) pt4.push(`${name} ${key}: a bead stands ${ag.worstOff.toFixed(4)} mm off the gate's own column`);
            for (let k = 0; k < ag.gaps.length; k++) if (Math.abs(ag.gaps[k] - mean) > 1e-3 * mean + 1e-6) pt4.push(`${name} ${key}: arc spacing ${k} is ${ag.gaps[k].toFixed(4)} against a mean ${mean.toFixed(4)}`);
          }
        } else {
          // a leaf part: its base row's centre column and its tip row's
          const V = (pp, v, c) => { const ix = 3 * pp.T(v, c); return [P[ix], P[ix + 1], P[ix + 2]]; };
          const mid = Math.floor(list[0].C / 2);
          const leaves = list.map((pp) => { const r0 = pp.rowOffset, rN = pp.V - 1 - (pp.embedEnd ? 1 : 0); const base = V(pp, r0, mid), tip = V(pp, rN, mid); let len = 0; for (let v = r0; v < rN; v++) { const A = V(pp, v, mid), B = V(pp, v + 1, mid); len += Math.hypot(B[0] - A[0], B[1] - A[1]); } let crownBase = -Infinity, crownTip = -Infinity; for (let c = 0; c < pp.C; c++) { crownBase = Math.max(crownBase, V(pp, r0, c)[2]); crownTip = Math.max(crownTip, V(pp, rN, c)[2]); } return { pp, base, tip, len, crownBase, crownTip }; });
          leavesSeen += leaves.length;
          // PT3 seated: every top vertex at or above the band's surface under it
          for (const lf of leaves) for (let v = 0; v < lf.pp.V; v++) for (let c = 0; c < lf.pp.C; c++) { const q = V(lf.pp, v, c), want = plateT + zAt(across(q, key)) * rd; if (q[2] < want - 1e-6) pt3.push(`${name} ${key}: a leaf's top vertex ${q[2].toFixed(4)} under the band's surface ${want.toFixed(4)}`); worstSeat = Math.max(worstSeat, Math.max(0, want - q[2])); }
          // the leaf's width RESTATED from the control and the filigree's own aspect
          // (clamped to the band) — the widest EMITTED row sits under the
          // nominal width by the profile's own shoulder, 0.012 mm here
          const Wl = Math.min(W, FL.LEAF_ASPECT * Math.max(F, model.params.bandSize)), mx = list[0].pattern.side === 'L' ? (q) => [-q[0], q[1] - 0] : (q) => q;
          // on a closed loop the run continues through the seam into its mirror:
          // the element after the last is the last's own mirror image
          const basesSeq = leaves.map((l) => mx(l.base)); if (closed && list[0].pattern.side === 'R') basesSeq.push([-basesSeq.at(-1)[0], basesSeq.at(-1)[1]]);
          const pt5gaps = arcGaps(columnPoly(key, Wl / 2), basesSeq).gaps;
          // PT5 a laurel run: each leaf's base within ½–¾ of the previous
          // leaf's length of its base (they overlap), and STACKED — its base
          // crown at least a feature above the previous leaf's tip crown
          for (let k = 1; k < basesSeq.length; k++) {
            const d = pt5gaps[k - 1], f = d / leaves[k - 1].len;
            overlapLo = Math.min(overlapLo, f); overlapHi = Math.max(overlapHi, f);
            if (f > LEAF_HI + 0.02 || f < LEAF_LO - 0.02) pt5.push(`${name} ${key}: leaf ${k}'s base ${d.toFixed(3)} mm from leaf ${k - 1}'s, ${f.toFixed(3)} of its ${leaves[k - 1].len.toFixed(3)} mm length`);
            if (k >= leaves.length) continue;   // the seam gap has no stack of its own (the mirror's base is this base)
            const st = leaves[k].crownBase - leaves[k - 1].crownTip; worstStack = Math.min(worstStack, st);
            if (st < F - 1e-6) pt5.push(`${name} ${key}: leaf ${k}'s base crown stands only ${st.toFixed(3)} mm over leaf ${k - 1}'s tip (wants the ${F} mm feature)`);
          }
          // PT4 seamless: the first leaf crosses the axis (base past it, so the
          // mirrored pair cross base over base) and on a closed loop the last
          // leaf crosses the seam
          if (list[0].pattern.side === 'R') {
            if (!(leaves[0].base[0] < -1e-6)) pt4.push(`${name} ${key}: the first leaf's base stands at x ${leaves[0].base[0].toFixed(3)} — it does not cross the axis`);
            const last = leaves[leaves.length - 1];
            if (closed && !(last.tip[0] < -1e-6 && last.base[0] > 1e-6)) pt4.push(`${name} ${key}: the last leaf does not cross the seam (base x ${last.base[0].toFixed(3)}, tip x ${last.tip[0].toFixed(3)})`);
            // the leaf's width off its widest emitted row (its two walls)
            const ag = arcGaps(columnPoly(key, Wl / 2), leaves.map((l) => l.base)), mean = ag.gaps.reduce((x, y) => x + y, 0) / ag.gaps.length;
            if (ag.worstOff > 1e-3) pt4.push(`${name} ${key}: a leaf's base stands ${ag.worstOff.toFixed(4)} mm off the gate's own column`);
            for (let k = 0; k < ag.gaps.length; k++) if (Math.abs(ag.gaps[k] - mean) > 1e-3 * mean + 1e-6) pt4.push(`${name} ${key}: leaf arc spacing ${k} is ${ag.gaps[k].toFixed(4)} against a mean ${mean.toFixed(4)}`);
          }
        }
      }
      if (!parts.length) pt1.push(`${name}: no pattern part emitted`);
      if (model.pattern && model.pattern.told.some((t) => /not built/.test(t))) pt1.push(`${name}: ${model.pattern.told.find((t) => /not built/.test(t))}`);
    }
    rec('PT0 the band pattern is four print rows (pattern, edge, size, pitch), none by default, and off it adds no field', pt0.length === 0, pt0.join('; '));
    rec('PT1 every band-pattern row is watertight (boundary 0) and ONE voxel region, beads and leaf tips on all three skeletons, inner / outer / both edges, and every run built', pt1.length === 0, `${PTROWS.length} rows, most ${mostTris.toLocaleString('en-US')} triangles${pt1.length ? ' — ' + pt1.slice(0, 3).join('; ') : ''}`);
    rec('PT2 the beads are FUSED: every neighbouring pair of emitted beads within 1.8 r (restated), so each pair shares a neck', pt2.length === 0, `${beadsSeen} beads, widest pitch ${widestPitchR.toFixed(3)} r, least neck ${leastNeck.toFixed(3)} mm${pt2.length ? ' — ' + pt2.slice(0, 3).join('; ') : ''}`);
    rec('PT3 the pattern is SEATED on the profile: a bead\'s bottom pole at the band\'s highest surface under its span less the feature (restated from the profile samples and the gate\'s own edges), every leaf top vertex at or above the surface under it', pt3.length === 0, `worst seat residual ${worstSeat.toExponential(2)} mm${pt3.length ? ' — ' + pt3.slice(0, 3).join('; ') : ''}`);
    rec('PT4 the pattern is SEAMLESS: it starts on the axis (a bead its own mirror, a leaf crossing it), a closed loop\'s run ends on the axis at the seam, and every spacing along a run — across the apex mitre, the head-to-jamb join and the seam — is the run\'s one spacing', pt4.length === 0, pt4.slice(0, 3).join('; '));
    rec('PT5 the leaf tips OVERLAP as a laurel run: each leaf\'s base ½–¾ of a leaf along from the previous, its base crown a feature above the previous tip (stacked)', pt5.length === 0, `${leavesSeen} leaves, bases ${overlapLo.toFixed(3)}–${overlapHi.toFixed(3)} of a leaf apart, least stack ${worstStack.toFixed(3)} mm${pt5.length ? ' — ' + pt5.slice(0, 3).join('; ') : ''}`);
  }

  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'an-open-edge', file: 'relief', from: 'mesh.quad(T(V - 1, c), B(V - 1, c), B(V - 1, c + 1), T(V - 1, c + 1)); // far end', to: '', breaks: ['W', 'SC1', 'SC6'] },   // the scroll wires close on the same far-end cap
  // floats at BOTH ends: a mullion lifted off the sill alone still hangs from its light's springing, one region
  { id: 'a-detached-mullion', file: 'geometry', from: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY], [info.mullionX[i - 1], subSpring], [1, 0], 2);', to: 'const m = lineSpine(`mullion${i}`, [info.mullionX[i - 1], floorY + 2], [info.mullionX[i - 1], subSpring - 3], [1, 0], 2);', breaks: ['C', 'B'] },
  { id: 'the-mesh-offsets-by-itself', file: 'relief', from: 'const off = offsetCurve(S, d);', to: 'const off = S.pts.map((q, i) => [q[0] + d * S.nrm[i][0], q[1] + d * S.nrm[i][1]]);', breaks: ['R', 'SC3', 'SC8'] },   // it also drops a tapered wire's widthScale: the walls come out constant
  { id: 'the-embed-removed', file: 'relief', from: 'export const EMBED_MM = MIN_FEATURE_MM;', to: 'export const EMBED_MM = 0;', breaks: ['B', 'F0', 'SC6'] },   // a child scroll then only TOUCHES its parent
  // phase 2b: a closed loop left OPEN at its seam, and the seam moved 0.1 mm
  { id: 'the-closing-strip-dropped', file: 'relief', from: 'const strips = closed ? V : V - 1, nx = (v) => (v + 1) % V;', to: 'const strips = V - 1, nx = (v) => (v + 1) % V;', breaks: ['W', 'Q'] },
  { id: 'the-oval-seam-offset-0.1mm', file: 'geometry', from: "const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", to: "pts[0] = [pts[0][0] + 0.1, pts[0][1]]; const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", breaks: ['Q'] },
  // phase 3a, the scroll: the gap clamp removed, the eye under the floor, a
  // child laid off its parent's back
  { id: 'the-scroll-gap-clamp-removed', file: 'filigree', from: 'if (selfGap(scrollCurve({ ...base, turns: asked }), t).gap >= MIN_FEATURE_MM) return', to: 'if (true) return', breaks: ['SC3', 'SC6', 'SC7', 'OR3', 'CV4', 'CV5'] },
  { id: 'the-tightness-range-not-fitted', file: 'filigree', from: 'fitMemo.set(key, fitUncached({ ...spec, wire: t }, t))', to: 'fitMemo.set(key, { share: VOLUTE_SHARE, turnsMax: VOLUTE_TURNS[1] })', breaks: ['SC7', 'CV5'] },
  { id: 'the-eye-under-the-floor', file: 'filigree', from: 'const re = (tEye + MIN_FEATURE_MM) / 2;', to: 'const re = tEye / 2 + 0.1;', breaks: ['SC2', 'SC3', 'SC7'] },   // the eye itself is then a gap of 0.2 mm, so no turn count prints and the slider's top probe fails
  // phase 3b: the tapered wire and the held share
  { id: 'the-taper-tip-under-the-floor', file: 'filigree', from: 'export const taperTip = (t) => Math.max(MIN_FEATURE_MM, TAPER_TIP * t);', to: 'export const taperTip = (t) => TAPER_TIP * t;', breaks: ['SC8', 'OR2', 'SC2', 'SC7'] },   // the eye law and the top probe restate the floored tip too
  { id: 'the-gap-clamp-reads-the-nominal-wire', file: 'filigree', from: '(curve.w ? (curve.w[i] + curve.w[j]) / 2 : t)', to: 't', breaks: ['SC7', 'CV5', 'OR3'] },
  { id: 'the-volute-share-grows', file: 'filigree', from: 'return { share: VOLUTE_SHARE, turnsMax: at(VOLUTE_SHARE) };', to: 'if (at(VOLUTE_SHARE) >= VOLUTE_TURNS[1]) return { share: VOLUTE_SHARE, turnsMax: VOLUTE_TURNS[1] }; return { share: 0.8, turnsMax: at(0.8) };', breaks: ['SC7', 'CV5'] },
  { id: 'a-child-floats-off-its-parent', file: 'filigree', from: 'const off = (wAt(lead, j) + tw) / 2 - EMBED_MM;', to: 'const off = (wAt(lead, j) + tw) / 2 + 0.5;', breaks: ['SC6'] },
  // phase 3a, step 2 — the ornament: a scroll left off its molding, the
  // graze rule removed (a gap under the floor between wire and band), the
  // group-clearance check removed (groups crowd under the floor), the mirror
  // rebuilt off the axis by 0.02 mm
  { id: 'a-scroll-detached', file: 'filigree', from: 'return { curves: cs, push: d };', to: 'return { curves: at(d - 3), push: d };', breaks: ['OR1', 'OR4'] },
  { id: 'the-graze-rule-removed', file: 'filigree', from: '    if (!g.length) break;', to: '    break;', breaks: ['OR4'] },
  { id: 'the-group-clearance-removed', file: 'filigree', from: 'if (worst < MIN_FEATURE_MM) { told.push(', to: 'if (false) { told.push(', breaks: ['OR3'] },
  { id: 'the-mirror-is-broken', file: 'filigree', from: 'export const mirrorCurve = (c) => ({ ...c, pts: c.pts.map(([x, y]) => [-x, y])', to: 'export const mirrorCurve = (c) => ({ ...c, pts: c.pts.map(([x, y]) => [0.02 - x, y])', breaks: ['OR5', 'OR3'] },   // the crest pair stands exactly a feature apart, so 0.02 mm closes it under the floor
  { id: 'the-rect-seam-offset-0.1mm', file: 'geometry', from: 'push(0, yb, 0, 1, false); anchorIdx.bottom = 0;', to: 'push(0.1, yb, 0, 1, false); anchorIdx.bottom = 0;', breaks: ['Q'] },
  // phase 3c, the carved primitives: the self-similar width law broken two
  // ways, the arris section swapped, the leaf's width law broken two ways,
  // its curl, its lift onto the host, the crossing rule and the budget
  { id: 'the-carved-width-ignores-curvature', file: 'filigree', from: 'export const carvedWidth = (rho, cap) => Math.min(cap, Math.max(MIN_FEATURE_MM, CARVED_K * rho));', to: 'export const carvedWidth = (rho, cap) => cap;', breaks: ['CV2', 'CV3', 'CV4', 'CV5'] },
  { id: 'the-carved-floor-removed', file: 'filigree', from: 'export const carvedWidth = (rho, cap) => Math.min(cap, Math.max(MIN_FEATURE_MM, CARVED_K * rho));', to: 'export const carvedWidth = (rho, cap) => Math.min(cap, CARVED_K * rho);', breaks: ['CV2', 'OR2'] },
  { id: 'the-arris-is-a-half-round', file: 'filigree', from: "  if (shape === 'arris') return arrisProfile();", to: "  if (shape === 'arris') return wireProfile('half-round');", breaks: ['AR1'] },
  { id: 'the-leaf-is-unfloored', file: 'filigree', from: 'export const leafWidth = (s, L, W, kap, lobes = LEAF_LOBES) => Math.max(MIN_FEATURE_MM, Math.min(', to: 'export const leafWidth = (s, L, W, kap, lobes = LEAF_LOBES) => (0.1 + Math.min(', breaks: ['LF2', 'LF3', 'OR2'] },
  { id: 'the-leaf-fold-guard-removed', file: 'filigree', from: 'leafEnvelope(s, L, W, lobes), LEAF_FOLD / Math.max(1e-12, Math.abs(kap))));', to: 'leafEnvelope(s, L, W, lobes), 1e9 / Math.max(1e-12, Math.abs(kap))));', breaks: ['LF2', 'LF3'] },
  { id: 'the-leaf-curls-half-as-far', file: 'filigree', from: 'side * theta * (LEAF_CURL_POWER + 1) / L', to: 'side * 0.5 * theta * (LEAF_CURL_POWER + 1) / L', breaks: ['LF4'] },
  { id: 'the-leaf-is-not-lifted', file: 'filigree', from: '  return D * Math.max(Math.min(MIN_FEATURE_MM, D) / D, c.info.hostW / c.info.hostWire);', to: '  return 0;', breaks: ['CL1'] },
  { id: 'the-leaf-crossing-rule-removed', file: 'filigree', from: '|| joinsCleanly(lf, o, LEAF_CROSS));', to: '|| true);', breaks: ['OR3'] },
  { id: 'the-budget-give-way-removed', file: 'filigree', from: 'if (tris + gTris > triBudget) { told.push(`the ${g} group', to: 'if (false) { told.push(`the ${g} group', breaks: ['TB2'] },
  { id: 'the-chain-budget-give-way-removed', file: 'filigree', from: 'if (tris + gTris > triBudget) { told.push(`the ${run.id} chain', to: 'if (false) { told.push(`the ${run.id} chain', breaks: ['TB2'] },
  // phase 3d — the chains
  { id: 'the-chain-is-not-seated', file: 'filigree', from: '    if (c.lift) spine.baseLift = orn.H ?', to: '    if (false) spine.baseLift = orn.H ?', breaks: ['OR9', 'CL1'] },   // unseated, a chain's leaves no longer stand on their host's crown (CL1)
  { id: 'the-chain-slit-rule-removed', file: 'filigree', from: 'export function slitWorst(c, region) {\n  let worst = -Infinity;', to: 'export function slitWorst(c, region) {\n  return -Infinity;\n  let worst = -Infinity;', breaks: ['OR8', 'OR4', 'OR3'] },   // unpushed, an element grazes the band (OR4) and its neighbours (OR3)
  { id: 'the-chain-opening-check-removed', file: 'filigree', from: 'const intrusion = (o) => { if (!opening) return 0;', to: 'const intrusion = (o) => { return 0;', breaks: ['OR7', 'OR3'] },   // left in the opening, elements also crowd each other (OR3)
  { id: 'the-mapped-tangent-wraps', file: 'filigree', from: '  for (let i = 1; i < m; i++) { while (tanA[i] - tanA[i - 1] > Math.PI) tanA[i] -= 2 * Math.PI;', to: '  for (let i = 1; i < 0; i++) { while (tanA[i] - tanA[i - 1] > Math.PI) tanA[i] -= 2 * Math.PI;', breaks: ['OR3'] },   // the coil check blind where a mapped coil closes (found in the 3d build)
  { id: 'the-seat-is-read-off-the-centreline', file: 'filigree', from: 'spine.baseLift = orn.H ? seatEmitted(orn.H, spine, profileFor(c, p), c.lift, depth) : c.lift;', to: 'spine.baseLift = c.lift;', breaks: ['OR9'] },   // the seat read on the centreline's span, not at the emitted columns: crowns 0.989 mm where the floor is 1
  { id: 'a-folded-element-is-built', file: 'filigree', from: ": selfGap(on).gap < F + CHAIN_MARGIN ? 'laid across", to: ": false ? 'laid across", breaks: ['OR3'] },   // an element the path folds (across an ear) is built anyway
  // PHASE 3e — the band pattern (frame-pattern.js)
  { id: 'the-bead-pitch-cap-removed', file: 'pattern', from: 'if (pt > BEAD_FUSE * r) {', to: 'if (false) {', breaks: ['PT2'] },   // 2 mm beads asked 3 mm apart are built 3 mm apart: no neck
  { id: 'the-beads-float', file: 'pattern', from: 'const z = seat + r - F;', to: 'const z = seat + r + 0.5;', breaks: ['PT1', 'PT3'] },   // the beads stand half a feature clear of the band: not seated, and detached
  { id: 'the-seat-ignores-the-profile', file: 'pattern', from: '  let m = 0;\n  for (let k = 0; k <= 16; k++) m = Math.max(m, zAt(lo + (hi - lo) * k / 16));', to: '  let m = 0; return 0;\n  for (let k = 0; k <= 16; k++) m = Math.max(m, zAt(lo + (hi - lo) * k / 16));', breaks: ['PT3'] },   // every element seated on the plate instead of the molding
  { id: 'the-leaf-run-parts', file: 'pattern', from: 'if (pt > LEAF_RUN_PITCH_MAX * len) {', to: 'if (false) {', breaks: ['PT5'] },   // 6 mm leaves asked 6 mm apart are built end to end: no overlap
  { id: 'the-leaves-are-not-stacked', file: 'pattern', from: '(k > 0 ? depth * Math.max(0, 1 - x / Math.max(1e-9, over)) : 0)', to: '0', breaks: ['PT5'] },   // a leaf's base at the molding, under the previous tip
  { id: 'the-seam-is-not-closed', file: 'pattern', from: 'const usable = path.closedPair ? path.L : path.L - endClear;', to: 'const usable = path.closedPair ? path.L - 0.7 * pitch : path.L - endClear;', breaks: ['PT2', 'PT4', 'PT5'] },   // a closed run stops short of the seam: the gap there is 1.4 pitches
  { id: 'the-axis-leaf-is-off-the-axis', file: 'filigree', from: 'lf.pts.map(([, y]) => [0, y])', to: 'lf.pts.map(([, y]) => [0.05, y])', breaks: ['OR5'] },
];


async function negativeControl() {
  const srcG = fs.readFileSync(path.join(ROOT, 'frame-geometry.js'), 'utf8');
  const srcR = fs.readFileSync(path.join(ROOT, 'frame-relief.js'), 'utf8');
  const srcF = fs.readFileSync(path.join(ROOT, 'frame-filigree.js'), 'utf8');
  const srcP = fs.readFileSync(path.join(ROOT, 'frame-pattern.js'), 'utf8');
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  for (const m of MUTANTS) {
    const n = (m.file === 'relief' ? srcR : m.file === 'filigree' ? srcF : m.file === 'pattern' ? srcP : srcG).split(m.from).length - 1;
    if (n !== 1) { console.log(`FAIL anchor ${m.id}: matches ${n} times`); process.exit(1); }
  }
  let bad = 0;
  // --only=<id>[,...] re-verifies a subset (reported as one; every anchor
  // above was still checked)
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  // --shard=k/n runs the mutants whose INDEX in MUTANTS is k mod n (CI runs
  // n jobs, k = 0..n-1, so every mutant is in exactly one shard by
  // construction; a mutant added anywhere in the list lands in some shard)
  const shardArg = (process.argv.find((a) => a.startsWith('--shard=')) || '').slice(8);
  let shard = null;
  if (shardArg) {
    const mm = /^(\d+)\/(\d+)$/.exec(shardArg);
    if (!mm || +mm[2] < 1 || +mm[1] >= +mm[2]) { console.log(`FAIL --shard=${shardArg}: want k/n with 0 <= k < n`); process.exit(1); }
    if (only.length) { console.log('FAIL --shard and --only together'); process.exit(1); }
    shard = { k: +mm[1], n: +mm[2] };
  }
  const RUN = only.length ? MUTANTS.filter((m) => only.includes(m.id)) : shard ? MUTANTS.filter((_, i) => i % shard.n === shard.k) : MUTANTS;
  if (only.length && RUN.length !== only.length) { console.log(`FAIL --only names a mutant that does not exist: ${only.filter((id) => !MUTANTS.some((m) => m.id === id)).join(', ')}`); process.exit(1); }
  if (shard) console.log(`shard ${shard.k}/${shard.n}: ${RUN.length} of ${MUTANTS.length} mutants — ${RUN.map((m) => m.id).join(', ')}`);
  for (const m of RUN) {
    const gPath = path.join(ROOT, `_frame-geometry-mutant-${m.id}.js`), rPath = path.join(ROOT, `_frame-relief-mutant-${m.id}.js`);
    fs.writeFileSync(gPath, m.file === 'geometry' ? srcG.replace(m.from, m.to) : srcG);
    fs.writeFileSync(rPath, (m.file === 'relief' ? srcR.replace(m.from, m.to) : srcR).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`));
    const fPath = path.join(ROOT, `_frame-filigree-mutant-${m.id}.js`);
    fs.writeFileSync(fPath, (m.file === 'filigree' ? srcF.replace(m.from, m.to) : srcF).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`).replace("from './frame-relief.js'", `from './${path.basename(rPath)}'`));
    const G = await import(pathToFileURL(gPath).href + `?${Date.now()}`);
    const RL = await import(pathToFileURL(rPath).href + `?${Date.now()}`);
    const FL = await import(pathToFileURL(fPath).href + `?${Date.now()}`);
    const pPath = path.join(ROOT, `_frame-pattern-mutant-${m.id}.js`);
    fs.writeFileSync(pPath, (m.file === 'pattern' ? srcP.replace(m.from, m.to) : srcP).replace("from './frame-geometry.js'", `from './${path.basename(gPath)}'`).replace("from './frame-relief.js'", `from './${path.basename(rPath)}'`).replace("from './frame-filigree.js'", `from './${path.basename(fPath)}'`));
    const PT = await import(pathToFileURL(pPath).href + `?${Date.now()}`);
    const out = await run(G, R, RL, m.id, FL, PT);
    fs.unlinkSync(gPath); fs.unlinkSync(rPath); fs.unlinkSync(fPath); fs.unlinkSync(pPath);
    const red = out.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
    const missed = m.breaks.filter((c) => !red.includes(c)), unclaimed = red.filter((c) => !m.breaks.includes(c));
    const ok = missed.length === 0 && unclaimed.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'} mutant ${m.id}: fired ${red.join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
  }
  console.log(`\n${RUN.length - bad} of ${RUN.length} mutants behave${only.length ? ` (a SUBSET — ${MUTANTS.length - RUN.length} of ${MUTANTS.length} not run)` : shard ? ` (shard ${shard.k}/${shard.n} — the other shards run the rest)` : ''}.`);
  process.exit(bad ? 1 : 0);
}

if (NEG) await negativeControl();
else {
  const G = await import(pathToFileURL(path.join(ROOT, 'frame-geometry.js')).href);
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);
  const FL = await import(pathToFileURL(path.join(ROOT, 'frame-filigree.js')).href);
  const PT = await import(pathToFileURL(path.join(ROOT, 'frame-pattern.js')).href);
  await run(G, R, RL, 'shipped', FL, PT);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
