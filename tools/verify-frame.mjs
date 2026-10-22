#!/usr/bin/env node
/* verify-frame.mjs — the /frame gate (phase 1: skeleton, molding sweep, shading).

   PART ONE (Node, seconds) drives the shipped frame-geometry.js:
     D  registry: ids unique, defaults in range, every preset's x strictly
        increasing from 0 to 1.
     P  the profile interpolant: a flat preset samples EXACTLY constant; no
        sample leaves the band of its bracketing control points (monotone).
     O  boundary ownership — the claim "mullions and sill read the same offset
        curve as the molding", measured rather than recited:
        O1 every jamb and mullion starts ON the sill's top edge, which is
           innerEdge(sill) — exact doubles;
        O2 the lights' clear widths are equal AND equal to the gap between the
           jamb's innerEdge and the first mullion's outerEdge;
        O3 every sub-arch springs at the one declared sub-spring height, the
           OUTER two on the jambs' INNER EDGES (innerEdge(jamb) — ruling 4,
           phase 1b) and the interior ones on the mullion CENTRELINES, and
           its apex clears innerEdge(head) by at least the mullion band;
        O4 (textual, coverage = this file's own regex) the expression that adds
           `d * normal` to a spine appears exactly once in frame-geometry.js,
           inside offsetCurve, and the consumers named in the charter call it.
     M  the apex MITRE: the head's and every light's inner edge peaks AT the
        apex vertex (a bow-tie puts a neighbour above it).
     T  shading is derived: per preset, darkness across a vertical jamb —
        flat EXACTLY uniform (range 0), cove graded (outer darker by > 0.15);
        and the left jamb reads differently from the right under the one
        fixed light. The per-preset ranges are PRINTED (the brief's number).
     S  SVG: parses, one <g> per band, flat has no crease path, stepped has
        creases, viewBox = box + margin.
     C  a rise taller than the height is CLAMPED AND TOLD.
     W  line weight follows darkness (ruling 1): every hatch run's weight is
        lineWeight × the law restated from the registry's own constants
        (HATCH_WEIGHT_RANGE / STEPS — the declaration, ST3's precedent), a
        flat band carries ONE weight and a graded band several, and a darker
        run is never thinner (W1); the SVG carries exactly those widths on
        its hatch paths, and a flat band's hatch is one path at one width (W2).
     H  cross-hatching (ruling 6): at threshold 1 no band carries a cross
        line and at 0 every band does; at the shipped threshold a band
        carries cross lines IFF its own darkness (rebuilt from toneAcross at
        each vertex normal, not from the cross-hatch code) exceeds it, and
        every cross line's recorded darkness is above it (H1); cross lines
        are chords of offsetCurve — both endpoints lie ON an offset polyline
        of the band's own profile samples (H2).

   PART TWO (Chromium) drives the real page:
     U  every registry control is in the DOM; visibleWhen holds both ways
        (mullionWidth hides at 0 mullions and shows at 1); an ADVANCED-tier
        control is hidden with the toggle off and shown with it on, and no
        Standard control moves either way (U3).
     X  the drawing on screen IS the export string (one geometry path).
     V  every control produces a visible change: a pinned viewBox (fixed
        camera) and a pixel diff of the paper against the defaults, per range
        control at its far end and per choice option. A bounding box cannot
        see shading; pixels can.
     E  the profile editor: a REAL pointer drag on a control point moves the
        drawing and flips the preset to custom.
     Tp the brief's tone claim measured on PIXELS at a close camera: ink
        fraction in three bins across the left jamb's band interior, per
        preset; flat within 0.06 of uniform, cove darker at the outer bin. Printed beside part one's
        geometric figures, which are the same claim from the other side.

   --negative-control  twenty mutations of frame-geometry.js (phase 2b adds
                       nine: the seam offset 0.1 mm on the oval and on the
                       rectangle, a hatch line cut at the seam, a corner not
                       mitred, the oval sampled by parameter, the aspect
                       unread, an arch control leaking into the rectangle, an
                       anchor off its spine, a corner clamp not told), each served to
                       part one through a copy in the repo root (it imports
                       ./frame-registry.js) and required to redden exactly the
                       clauses it names. Part two is NOT mutated: say so
                       rather than imply a sweep.
   --no-browser        part one only.

   NOT COVERED: the hatch's run-out shape (where a line ends along a spine)
   is drawn and reported, not asserted; nothing here is printed or plotted. */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');
const NOBROWSER = args.includes('--no-browser') || NEG;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? ' ok ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ================= PART ONE ================= */
async function partOne(G, R, label = 'shipped') {
  const out = [];
  const rec = (name, ok, detail = '') => { out.push({ name, ok: !!ok, detail }); if (label === 'shipped') check(name, ok, detail); };

  // D registry
  const ids = R.PARAM_SPEC.map((s) => s.id);
  rec('D1 ids are unique', new Set(ids).size === ids.length);
  rec('D2 every default is inside its own range', R.PARAM_SPEC.every((s) => s.kind !== 'range' || (s.default >= s.min && s.default <= s.max)));
  rec('D3 every preset runs 0..1 strictly increasing', Object.values(R.PROFILE_PRESETS).every((pts) => pts[0][0] === 0 && pts[pts.length - 1][0] === 1 && pts.every((p, i) => i === 0 || p[0] > pts[i - 1][0])));

  // P interpolant
  const flat = G.profileSamples(R.PROFILE_PRESETS.flat);
  rec('P1 flat samples EXACTLY constant', flat.z.every((z) => z === flat.z[0]), `z = ${flat.z[0]}`);
  let overshoot = 0;
  for (const [name, pts] of Object.entries(R.PROFILE_PRESETS)) {
    const s = G.profileSamples(pts);
    for (let i = 0; i < s.x.length; i++) {
      let k = 0; while (k < pts.length - 2 && pts[k + 1][0] < s.x[i]) k++;
      const lo = Math.min(pts[k][1], pts[k + 1][1]) - 1e-12, hi = Math.max(pts[k][1], pts[k + 1][1]) + 1e-12;
      if (s.z[i] < lo || s.z[i] > hi) overshoot++;
    }
  }
  rec('P2 no sample overshoots its bracketing points (monotone cubic)', overshoot === 0, `${overshoot} overshoots`);

  // O ownership
  const p4 = G.buildFrame({ mullions: 4, pointedness: 0.8, sill: 'plain' });
  const spineOf = (m, id) => m.spines.find((s) => s.id === id);
  const sillTop = G.innerEdge(spineOf(p4, 'sill'), p4.params.moldingWidth);
  const standing = p4.spines.filter((s) => /^jamb|^mullion/.test(s.id));
  const offSill = standing.map((s) => Math.abs(s.pts[0][1] - sillTop[0][1]));
  rec('O1 every jamb and mullion starts ON innerEdge(sill)', offSill.every((d) => d === 0), `${standing.length} spines, worst ${Math.max(...offSill)} mm`);
  const w = p4.params.moldingWidth, wm = w * p4.params.mullionWidth;
  const jambInL = G.innerEdge(spineOf(p4, 'jambL'), w)[0][0];
  const m1OutL = G.outerEdge(spineOf(p4, 'mullion1'), wm)[0][0];
  const gaps = [m1OutL - jambInL];
  for (let i = 1; i < 4; i++) gaps.push(G.outerEdge(spineOf(p4, `mullion${i + 1}`), wm)[0][0] - G.innerEdge(spineOf(p4, `mullion${i}`), wm)[0][0]);
  gaps.push(G.innerEdge(spineOf(p4, 'jambR'), w)[0][0] - G.innerEdge(spineOf(p4, 'mullion4'), wm)[0][0]);
  const gapSpread = Math.max(...gaps) - Math.min(...gaps);
  rec('O2 light clear widths are equal, jamb edge to mullion edge', gapSpread < 1e-9, `gaps ${gaps.map((g) => g.toFixed(4)).join(' / ')} mm`);
  const headIn = G.innerEdge(spineOf(p4, 'head'), w);
  // the light boundaries, rebuilt from OTHER owners than archSkeleton's
  // bounds list: the jambs' inner edges off offsetCurve, the mullions'
  // declared x — never info.lightBounds, which is the quantity under test.
  const jambInR = G.innerEdge(spineOf(p4, 'jambR'), w)[0][0];
  const centres = [jambInL, ...p4.info.mullionX, jambInR];
  let springOk = true, clearOk = true, worstClear = Infinity;
  const springDetail = [];
  for (let i = 0; i <= 4; i++) {
    const L = spineOf(p4, `light${i}`);
    const a = L.pts[0], b = L.pts[L.pts.length - 1];
    if (!(near(a[0], centres[i + 1]) && near(b[0], centres[i]) && near(a[1], p4.info.subSpringY) && near(b[1], p4.info.subSpringY))) { springOk = false; springDetail.push(`light${i} ends ${b[0].toFixed(3)}..${a[0].toFixed(3)} wanted ${centres[i].toFixed(3)}..${centres[i + 1].toFixed(3)}`); }
    const apex = L.pts.reduce((m, q) => (q[1] > m[1] ? q : m));
    const d = G.distToPoly(apex, headIn);
    worstClear = Math.min(worstClear, d);
    if (d < wm - 1e-6) clearOk = false;
  }
  rec('O3 sub-arches spring at ONE height, outer ones on innerEdge(jamb), inner on the centrelines, and clear innerEdge(head)', springOk && clearOk, springDetail.join('; ') || `outer springs at ${jambInL.toFixed(3)} / ${jambInR.toFixed(3)} (jamb inner edges), nearest apex-to-head ${worstClear.toFixed(3)} mm ≥ ${wm.toFixed(3)}`);
  const src = fs.readFileSync(process.env.FRAME_GATE_SOURCE || path.join(ROOT, 'frame-geometry.js'), 'utf8');
  const adds = (src.match(/\+ d \* spine\.nrm\[i\]\[0\]/g) || []).length;
  const consumers = ['outerEdge', 'innerEdge', 'sweepSpine'].filter((f) => new RegExp(`${f}[\\s\\S]*?offsetCurve\\(`).test(src));
  rec('O4 (textual) `d * normal` is added to a spine exactly once, in offsetCurve', adds === 1 && /export function offsetCurve[\s\S]*?\+ d \* spine\.nrm/.test(src), `${adds} sites; consumers calling offsetCurve: ${consumers.join(', ')}`);

  // M mitre
  let mitreOk = true, mitreDetail = [];
  for (const [pp, mu] of [[0, 0], [0.5, 2], [1, 4]]) {
    const m = G.buildFrame({ pointedness: pp, mullions: mu });
    for (const s of m.spines.filter((q) => /^head|^light/.test(q.id))) {
      const inner = G.innerEdge(s, s.bandWidth);
      const k = Math.floor(inner.length / 2);
      const top = Math.max(...inner.map((q) => q[1]));
      if (!near(inner[k][1], top, 1e-9)) { mitreOk = false; mitreDetail.push(`${s.id}@p${pp}: apex ${inner[k][1].toFixed(4)} < top ${top.toFixed(4)}`); }
    }
  }
  rec('M1 inner edges peak AT the apex vertex (mitred join, no bow-tie)', mitreOk, mitreDetail.join('; ') || 'p 0 / 0.5 / 1');

  // T tone
  const toneTable = {};
  for (const name of Object.keys(R.PROFILE_PRESETS)) {
    const m = G.buildFrame({ profilePreset: name });
    const l = Array.from(G.toneAcross(m.prof, m.params, [1, 0]));
    const r = Array.from(G.toneAcross(m.prof, m.params, [-1, 0]));
    toneTable[name] = { lmin: Math.min(...l), lmax: Math.max(...l), rmin: Math.min(...r), rmax: Math.max(...r), l };
  }
  const t = toneTable;
  rec('T1 flat band is EXACTLY uniform across the band', t.flat.lmax - t.flat.lmin === 0, `darkness ${t.flat.lmin.toFixed(4)} on every sample`);
  const cove = t.cove.l;
  rec('T2 cove grades across the band: outer edge darker than inner by > 0.15', cove[0] - cove[cove.length - 1] > 0.15, `outer ${cove[0].toFixed(3)} → inner ${cove[cove.length - 1].toFixed(3)}, range ${t.cove.lmin.toFixed(3)}–${t.cove.lmax.toFixed(3)}`);
  rec('T3 the left jamb and the right jamb read differently under the one light', Math.abs(t.cove.lmax - t.cove.rmax) > 0.02 || Math.abs(t.cove.lmin - t.cove.rmin) > 0.02, `cove left ${t.cove.lmin.toFixed(3)}–${t.cove.lmax.toFixed(3)}, right ${t.cove.rmin.toFixed(3)}–${t.cove.rmax.toFixed(3)}`);
  if (label === 'shipped') {
    console.log(`     tone across the band (darkness, intensity ${R.DEFAULTS.shadeIntensity.toFixed(2)}), left jamb / right jamb:`);
    for (const [n, v] of Object.entries(t)) console.log(`       ${n.padEnd(8)} ${v.lmin.toFixed(3)}–${v.lmax.toFixed(3)}   ${v.rmin.toFixed(3)}–${v.rmax.toFixed(3)}`);
  }

  // S svg
  const mf = G.buildFrame({ profilePreset: 'flat' }), ms = G.buildFrame({ profilePreset: 'stepped' });
  const sf = G.exportSvg(mf), ss = G.exportSvg(ms);
  const nG = (s) => (s.svg.match(/<g /g) || []).length, nCrease = (s) => (s.svg.match(/class="crease"/g) || []).length;
  rec('S1 one <g> per band', nG(sf) === mf.bands.length && nG(ss) === ms.bands.length, `${nG(sf)} / ${mf.bands.length}`);
  rec('S2 flat emits no crease path; stepped emits one per band', nCrease(sf) === 0 && nCrease(ss) === ms.bands.length, `flat ${nCrease(sf)}, stepped ${nCrease(ss)} of ${ms.bands.length}`);
  const vb = sf.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  rec('S3 viewBox is the drawing box plus margin', vb && near(+vb[1], mf.box.x1 - mf.box.x0 + 16, 1e-3) && near(+vb[2], mf.box.y1 - mf.box.y0 + 16, 1e-3), vb && `${vb[1]} × ${vb[2]} mm`);
  rec('S4 every coordinate is finite', !/NaN|Infinity/.test(sf.svg + ss.svg));

  // C clamp
  const mc = G.buildFrame({ width: 400, height: 80, pointedness: 1 });
  rec('C1 a rise taller than the height is clamped AND told', mc.info.clamped.length >= 1 && near(mc.info.springY, mc.info.apexY - mc.info.rise), mc.info.clamped[0] || 'not told');

  // W line weight follows darkness. The law is RESTATED here from the
  // registry's constants (the declaration), never read from hatchWeight.
  const [W0, W1] = R.HATCH_WEIGHT_RANGE, WS = R.HATCH_WEIGHT_STEPS;
  const lawWeight = (dark, lw) => lw * (W0 + (W1 - W0) * (Math.min(WS - 1, Math.max(0, Math.floor(dark * WS))) + 0.5) / WS);
  let lawBad = 0, monoBad = 0, runs = 0, flatSet = new Set(), gradedSet = new Set();
  for (const name of Object.keys(R.PROFILE_PRESETS)) {
    const m = G.buildFrame({ profilePreset: name });
    for (const b of m.bands) {
      const sorted = [...b.hatch].sort((x, y) => x.dark - y.dark);
      for (let k = 0; k < sorted.length; k++) {
        runs++;
        if (!near(sorted[k].weight, lawWeight(sorted[k].dark, m.params.lineWeight), 1e-12)) lawBad++;
        if (k && sorted[k].weight < sorted[k - 1].weight - 1e-12) monoBad++;
        (name === 'flat' ? flatSet : gradedSet).add(sorted[k].weight.toFixed(6));
      }
    }
  }
  rec('W1 every hatch run is at lineWeight × the registry law of its darkness; flat is ONE weight, graded several; darker is never thinner', lawBad === 0 && monoBad === 0 && flatSet.size === 1 && gradedSet.size >= 3, `${runs} runs, ${lawBad} off the law, ${monoBad} non-monotone; flat ${[...flatSet].join('/')} mm, ${gradedSet.size} distinct weights over the other presets`);
  const svgWidths = (m, cls) => Array.from(G.exportSvg(m).svg.matchAll(new RegExp(`class="${cls}" stroke-width="([\\d.]+)"`, 'g'))).map((x) => +x[1]);
  const mo = G.buildFrame({ profilePreset: 'ogee' });
  const wantW = new Set(mo.bands.flatMap((b) => b.hatch.map((h) => +h.weight.toFixed(3))));
  const gotW = new Set(svgWidths(mo, 'hatch'));
  const flatW = svgWidths(mf, 'hatch');
  rec('W2 the SVG carries exactly the hatch weights the law gave (per band, one path per distinct width); flat is one width per band', [...wantW].every((v) => gotW.has(v)) && [...gotW].every((v) => wantW.has(v)) && flatW.length === mf.bands.length && new Set(flatW).size === 1 && near(flatW[0], +lawWeight(mf.bands[0].hatch[0].dark, mf.params.lineWeight).toFixed(3), 1e-9), `ogee widths ${[...gotW].sort().join('/')} mm; flat ${flatW[0]} mm on ${flatW.length} bands`);

  // H cross-hatch threshold
  const noCross = Object.keys(R.PROFILE_PRESETS).every((n) => G.buildFrame({ profilePreset: n, crossHatchThreshold: 1 }).bands.every((b) => b.cross.length === 0));
  const allCross = Object.keys(R.PROFILE_PRESETS).every((n) => G.buildFrame({ profilePreset: n, crossHatchThreshold: 0 }).bands.every((b) => b.cross.length > 0));
  let iffBad = 0, belowBad = 0, nCross = 0, crossBands = 0, allBands = 0, hBad = 0;
  const hDetail = [];
  for (const name of Object.keys(R.PROFILE_PRESETS)) {
    const m = G.buildFrame({ profilePreset: name });
    const thr = m.params.crossHatchThreshold;
    for (const b of m.bands) {
      const sp = m.spines.find((q) => q.id === b.id);
      // the band's own darkness, rebuilt from toneAcross at every vertex normal
      let dmax = -Infinity;
      for (const nrm of sp.nrm) for (const d of G.toneAcross(m.prof, m.params, nrm)) dmax = Math.max(dmax, d);
      allBands++;
      if ((b.cross.length > 0) !== (dmax > thr)) { iffBad++; hDetail.push(`${name}/${b.id}: ${b.cross.length} lines, max darkness ${dmax.toFixed(3)} vs ${thr}`); }
      if (b.cross.length) crossBands++;
      for (const c of b.cross) { nCross++; if (!(c.dark > thr)) belowBad++;
        // H2: each endpoint ON some offset polyline of the band's own samples (chord of offsetCurve)
        for (const e of c.pts) {
          let best = Infinity;
          for (let i = 0; i < m.prof.x.length; i++) best = Math.min(best, G.distToPoly(e, G.offsetPoly(sp, (m.prof.x[i] - 0.5) * sp.bandWidth)));
          if (best > 1e-6) hBad++;
        }
      }
    }
  }
  rec('H1 cross-hatch IFF the band\'s own darkness exceeds the threshold: none at 1, all at 0, every line above the threshold', noCross && allCross && iffBad === 0 && belowBad === 0, hDetail.slice(0, 3).join('; ') || `${nCross} cross lines on ${crossBands} of ${allBands} bands at ${R.DEFAULTS.crossHatchThreshold}; none at 1: ${noCross}, all at 0: ${allCross}`);
  rec('H2 every cross line is a chord of offsetCurve (both ends on an offset polyline of the band)', hBad === 0 && nCross > 0, `${hBad} endpoints off, over ${nCross} lines`);

  // ---------------- phase 2b: the closed skeletons ----------------
  const CLOSED = [
    ['rect mitre', { skeleton: 'rect', cornerTreatment: 'mitre' }],
    ['rect rounded', { skeleton: 'rect', cornerTreatment: 'rounded' }],
    ['rect notched', { skeleton: 'rect', cornerTreatment: 'notched' }],
    ['rect eared', { skeleton: 'rect', cornerTreatment: 'eared' }],
    ['circle', { skeleton: 'oval', aspect: 1 }],
    ['oval tall', { skeleton: 'oval', aspect: 0.5 }],
    ['oval wide', { skeleton: 'oval', aspect: 2 }],
  ];
  // segment-segment proper intersection, for "the edge is a simple polygon"
  const segX = (a, b, c, d) => {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
  };
  const selfCrossings = (poly) => { let n = 0; for (let i = 0; i < poly.length - 1; i++) for (let j = i + 2; j < poly.length - 1; j++) { if (i === 0 && j === poly.length - 2) continue; if (segX(poly[i], poly[i + 1], poly[j], poly[j + 1])) n++; } return n; };
  // K1 the loop: one spine, closed, no duplicated vertex, its edges close on
  // themselves and are simple polygons
  let k1Bad = []; const k1Detail = [];
  for (const [name, q] of CLOSED) {
    const m = G.buildFrame(q);
    const sp = m.spines[0];
    const n = sp.pts.length;
    let minGap = Infinity; for (let i = 0; i < n; i++) { const a = sp.pts[i], b = sp.pts[(i + 1) % n]; minGap = Math.min(minGap, Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const outer = G.outerEdge(sp, sp.bandWidth), inner = G.innerEdge(sp, sp.bandWidth);
    const closesO = outer[0] === outer[outer.length - 1] || (outer[0][0] === outer[outer.length - 1][0] && outer[0][1] === outer[outer.length - 1][1]);
    const closesI = inner[0][0] === inner[inner.length - 1][0] && inner[0][1] === inner[inner.length - 1][1];
    const xO = selfCrossings(outer), xI = selfCrossings(inner);
    const ok = m.spines.length === 1 && sp.closed === true && minGap > 1e-6 && closesO && closesI && xO === 0 && xI === 0 && outer.length === n + 1;
    if (!ok) k1Bad.push(name);
    k1Detail.push(`${name}: ${n} v, min edge ${minGap.toFixed(3)} mm, crossings ${xO}/${xI}`);
  }
  rec('K1 a closed skeleton is ONE closed spine, no duplicated vertex, its edges close exactly and never cross themselves', k1Bad.length === 0, k1Bad.length ? 'BAD: ' + k1Bad.join(', ') + ' — ' + k1Detail.join(' · ') : k1Detail.join(' · '));

  // K2 the skeleton RESTATED from the controls (never read from the builder)
  const k2 = [];
  for (const [name, q] of CLOSED) {
    const m = G.buildFrame(q); const pp = m.params, sp = m.spines[0], w = pp.moldingWidth;
    let worst = 0, nWorst = 0;
    if (pp.skeleton === 'rect') {
      const a = pp.width / 2, b = (pp.height - w) / 2, yb = w / 2, yt = pp.height - w / 2, s0 = pp.cornerSize;
      // every centreline vertex lies on the restated rectangle (mitre), on a
      // quarter circle of radius s0 inside each corner (rounded), or on the
      // restated step polygon (notched / eared) — the corners as four lists
      // each corner with the inverse of the quarter turns that carry the
      // bottom-right corner's frame (travel +x then +y) onto it
      const corners = [[a, yb, (X, Y) => [X, Y]], [a, yt, (X, Y) => [Y, -X]], [-a, yt, (X, Y) => [-X, -Y]], [-a, yb, (X, Y) => [-Y, X]]];
      for (const [x, y] of sp.pts) {
        let d = Infinity;
        // the straight sides between corner regions
        const onSide = (Math.abs(Math.abs(x) - a) < 1e-9 && Math.abs(y - (yb + yt) / 2) <= b) || (Math.abs(y - yb) < 1e-9 || Math.abs(y - yt) < 1e-9) && Math.abs(x) <= a;
        if (onSide) d = 0;
        for (const [cx, cy, inv] of corners) {
          const [lx, ly] = inv(x - cx, y - cy);              // the bottom-right frame: lx ≤ 0 along the side arrived on, ly ≥ 0 along the side left by
          if (pp.cornerTreatment === 'rounded') { const ccx = -s0, ccy = s0; if (lx >= -s0 - 1e-9 && ly <= s0 + 1e-9) d = Math.min(d, Math.abs(Math.hypot(lx - ccx, ly - ccy) - s0)); }
          if (pp.cornerTreatment === 'notched') for (const [px, py] of [[-s0, 0], [-s0, s0], [0, s0]]) d = Math.min(d, Math.hypot(lx - px, ly - py));
          if (pp.cornerTreatment === 'eared') for (const [px, py] of [[-s0, 0], [-s0, -s0], [s0, -s0], [s0, s0], [0, s0]]) d = Math.min(d, Math.hypot(lx - px, ly - py));
        }
        if (d > worst) worst = d; if (d > 1e-9) nWorst++;
      }
      // the mitre corners: the inner edge's corner is the restated inner rectangle's corner
      if (pp.cornerTreatment === 'mitre') { const inner = G.innerEdge(sp, w); const want = [a - w / 2, yb + w / 2]; const got = inner.reduce((m0, q0) => (q0[0] - q0[1] > m0[0] - m0[1] ? q0 : m0)); worst = Math.max(worst, Math.hypot(got[0] - want[0], got[1] - want[1])); }
    } else {
      const B = (pp.height - w) / 2, A = pp.aspect * B, cy = w / 2 + B;
      for (let i = 0; i < sp.pts.length; i++) {
        const [x, y] = sp.pts[i];
        const e = Math.abs(Math.sqrt((x / A) ** 2 + ((y - cy) / B) ** 2) - 1) * Math.min(A, B);   // ≈ mm off the ellipse
        const gx = x / (A * A), gy = (y - cy) / (B * B), gl = Math.hypot(gx, gy);
        const nn = sp.nrm[i], ang = Math.abs(Math.atan2(-gx / gl * nn[1] + gy / gl * nn[0], -(gx / gl) * nn[0] - (gy / gl) * nn[1]));
        const d = Math.max(e, ang * 1e3);   // a radian of normal error weighs as a metre
        if (d > worst) worst = d; if (d > 1e-9) nWorst++;
      }
    }
    k2.push({ name, worst, nWorst });
  }
  rec('K2 every centreline vertex lies on the skeleton RESTATED from the controls (rectangle corners / the ellipse and its normal), 1e-9', k2.every((r) => r.worst <= 1e-9), k2.map((r) => `${r.name}: worst ${r.worst.toExponential(1)}${r.nWorst ? ` (${r.nWorst} off)` : ''}`).join(' · '));

  // K3 hidden AND inert, both ways: a control that belongs to another type
  // moves nothing; a type's own controls do move it
  const svgOf = (q) => G.exportSvg(G.buildFrame(q)).svg;
  const inertRows = [
    ['rect', { skeleton: 'rect' }, [{ pointedness: 1 }, { mullions: 4 }, { sill: 'none' }, { mullionWidth: 1 }, { aspect: 2 }]],
    ['oval', { skeleton: 'oval' }, [{ pointedness: 1 }, { mullions: 0 }, { sill: 'stepped' }, { cornerTreatment: 'eared' }, { cornerSize: 60 }, { width: 400 }]],
    ['arch', {}, [{ cornerTreatment: 'rounded' }, { cornerSize: 60 }, { aspect: 2 }]],
    ['rect mitre', { skeleton: 'rect', cornerTreatment: 'mitre' }, [{ cornerSize: 60 }]],
  ];
  const leaks = [], live = [];
  for (const [nm, base, probes] of inertRows) { const b0 = svgOf(base); for (const pr of probes) if (svgOf({ ...base, ...pr }) !== b0) leaks.push(`${nm} ← ${JSON.stringify(pr)}`); }
  for (const [nm, q] of [['rect cornerSize', { skeleton: 'rect', cornerTreatment: 'rounded', cornerSize: 40 }], ['rect corners', { skeleton: 'rect', cornerTreatment: 'eared' }], ['oval aspect', { skeleton: 'oval', aspect: 1.5 }], ['rect width', { skeleton: 'rect', width: 300 }]]) {
    const base = { skeleton: q.skeleton, ...(q.cornerTreatment === 'rounded' ? { cornerTreatment: 'rounded' } : {}) };
    if (svgOf(q) === svgOf(base)) live.push(nm);
  }
  rec('K3 another type\'s controls are inert on a skeleton (SVG byte-identical) and a type\'s own controls move it', leaks.length === 0 && live.length === 0, leaks.length || live.length ? `LEAKS: ${leaks.join('; ')} DEAD: ${live.join('; ')}` : `${inertRows.reduce((n, r) => n + r[2].length, 0)} cross-type probes inert, 4 own controls live`);

  // K4 clamped AND told
  const k4 = [
    ['rounded radius under the band', { skeleton: 'rect', cornerTreatment: 'rounded', cornerSize: 2 }],
    ['notch past the next corner', { skeleton: 'rect', cornerTreatment: 'notched', cornerSize: 80, width: 100, height: 120 }],
    ['ear folding the band', { skeleton: 'rect', cornerTreatment: 'eared', cornerSize: 4 }],
    ['oval aspect folding the inner edge', { skeleton: 'oval', aspect: 0.4, height: 80, moldingWidth: 30 }],
  ].map(([nm, q]) => { const m = G.buildFrame(q); const sp = m.spines[0]; return { nm, told: m.info.clamped.length, x: selfCrossings(G.innerEdge(sp, sp.bandWidth)) + selfCrossings(G.outerEdge(sp, sp.bandWidth)), msg: m.info.clamped[0] || '' }; });
  rec('K4 a corner or aspect the band cannot carry is clamped AND told, and the clamped edges do not cross', k4.every((r) => r.told >= 1 && r.x === 0), k4.map((r) => `${r.nm}: ${r.told ? '"' + r.msg + '"' : 'NOT TOLD'}${r.x ? ` ${r.x} CROSSINGS` : ''}`).join(' · '));

  // K5 (ruling 5, phase 3a): the clamps sit where the fold is MEASURED. At the
  // floor itself (asked exactly at the clamp) nothing is told, nothing folds
  // on either edge, and the least feature on the inner edge — read off the
  // EMITTED polyline, a triple's circumradius on a curve, a segment's length
  // on a step — is exactly what the clamp promises (F/2 of inner radius; F of
  // ear step; F of notch jog). Just past it the corner is told and built AT
  // the floor (the same SVG string as the boundary row). The floors are
  // restated here from MIN_FEATURE_MM and the band, never read from the
  // builder; tools/frame-fold-boundary.mjs is the measurement that put them there.
  const Fm = R.MIN_FEATURE_MM;
  const foldsOn = (sp, w) => { let r = 0; const n = sp.pts.length; for (const d of [-w / 2, w / 2]) { const off = G.offsetCurve(sp, d); const keep = []; for (let i = 0; i < n; i++) if (off[i]) keep.push(i); for (let k = 0; k < keep.length; k++) { const i = keep[k], j = keep[(k + 1) % keep.length]; const a = sp.pts[i], b = sp.pts[j], P0 = off[i], P1 = off[j]; if ((b[0] - a[0]) * (P1[0] - P0[0]) + (b[1] - a[1]) * (P1[1] - P0[1]) < 0) r++; } } return r; };
  const circR = (a, b, c) => { const A = Math.hypot(b[0] - c[0], b[1] - c[1]), B = Math.hypot(a[0] - c[0], a[1] - c[1]), C = Math.hypot(a[0] - b[0], a[1] - b[1]); const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2; return ar > 1e-12 ? A * B * C / (4 * ar) : Infinity; };
  const leastRadius = (poly) => { let m = Infinity; for (let i = 1; i < poly.length - 1; i++) m = Math.min(m, circR(poly[i - 1], poly[i], poly[i + 1])); return m; };
  const leastSeg = (poly) => { let m = Infinity; for (let i = 0; i < poly.length - 1; i++) { const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]); if (l > 1e-9) m = Math.min(m, l); } return m; };
  const segDist = (a, b, c, d) => Math.min(G.distToPoly(a, [c, d]), G.distToPoly(b, [c, d]), G.distToPoly(c, [a, b]), G.distToPoly(d, [a, b]));
  const k5Rows = [];
  for (const w of [18, 30]) {
    const B80 = (80 - w) / 2;
    const cases = [
      ['rounded', (v) => ({ skeleton: 'rect', cornerTreatment: 'rounded', cornerSize: v, moldingWidth: w }), (w + Fm) / 2, -0.5, (sp) => leastRadius(G.innerEdge(sp, w)), Fm / 2, 'inner radius'],
      // the ear: at w + F the inner edge's loop has opened — its last offset
      // face ends F short of its first, both ways, so the least distance
      // between non-adjacent inner segments is the F × F diagonal, √2·F
      ['eared', (v) => ({ skeleton: 'rect', cornerTreatment: 'eared', cornerSize: v, moldingWidth: w }), w + Fm, -0.5, (sp) => { const inn = G.innerEdge(sp, w); let m = Infinity; for (let i = 0; i < inn.length - 1; i++) for (let j = i + 2; j < inn.length - 1; j++) { if (i === 0 && j === inn.length - 2) continue; m = Math.min(m, segDist(inn[i], inn[i + 1], inn[j], inn[j + 1])); } return m; }, Math.SQRT2 * Fm, 'inner ear clearance'],
      ['notched', (v) => ({ skeleton: 'rect', cornerTreatment: 'notched', cornerSize: Math.max(2, v), moldingWidth: w }), 2, 0, (sp) => leastSeg(G.innerEdge(sp, w)), 2, 'notch jog (range floor 2 mm ≥ F)'],
      ['oval narrow', (v) => ({ skeleton: 'oval', aspect: v, moldingWidth: w, height: 80 }), Math.sqrt(((w + Fm) / 2) / B80), -0.02, (sp) => leastRadius(G.innerEdge(sp, w)), Fm / 2, 'inner radius'],
    ];
    if (B80 / ((w + Fm) / 2) <= 2.5) cases.push(['oval wide', (v) => ({ skeleton: 'oval', aspect: v, moldingWidth: w, height: 80 }), B80 / ((w + Fm) / 2), +0.05, (sp) => leastRadius(G.innerEdge(sp, w)), Fm / 2, 'inner radius']);
    for (const [nm, mk, lo, past, feat, want, unit] of cases) {
      const mA = G.buildFrame(mk(lo)), spA = mA.spines[0];
      const got = feat(spA);
      const atOk = mA.info.clamped.length === 0 && foldsOn(spA, w) === 0 && got >= want * (1 - 1e-6) && got <= want * 1.01;
      let pastOk = true, pastMsg = '—';
      if (past) {
        const mP = G.buildFrame(mk(lo + past));
        pastOk = mP.info.clamped.length >= 1 && G.exportSvg(mP).svg === G.exportSvg(mA).svg && foldsOn(mP.spines[0], w) === 0;
        pastMsg = mP.info.clamped[0] || 'NOT TOLD';
      }
      k5Rows.push({ ok: atOk && pastOk, d: `${nm} w${w}: floor ${lo.toFixed(4)} → ${unit} ${got.toFixed(4)} (want ${want})${atOk ? '' : ` BOUNDARY BAD (told ${mA.info.clamped.length}, folds ${foldsOn(spA, w)})`}; past → ${pastOk ? 'held at it, told' : 'NOT HELD: ' + pastMsg}` });
    }
  }
  rec('K5 every clamp sits on the MEASURED fold: at the floor nothing is told or folds and the inner edge\'s least feature is the promised one; just past it the corner is told and built AT the floor', k5Rows.every((r) => r.ok), k5Rows.map((r) => r.d).join(' · '));

  // Q the seam, in the plane: the loop's first vertex IS the restated bottom
  // centre (0, w/2) with the normal (0, 1) — the gap and the normal
  // discontinuity at the loop start, measured; the turn across the seam
  // equals the turn across its antipode; and no hatch run is cut there.
  const qRows = [];
  for (const [name, q] of CLOSED) {
    const m = G.buildFrame(q); const sp = m.spines[0], n = sp.pts.length, w = m.params.moldingWidth;
    const gap = Math.hypot(sp.pts[0][0] - 0, sp.pts[0][1] - w / 2);
    const nAng = Math.abs(Math.atan2(sp.nrm[0][0], sp.nrm[0][1]));
    const turn = (i) => { const a = sp.nrm[(i + n - 1) % n], b = sp.nrm[i], c = sp.nrm[(i + 1) % n]; const t1 = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]); const t2 = Math.atan2(b[0] * c[1] - b[1] * c[0], b[0] * c[0] + b[1] * c[1]); return [t1, t2]; };
    const [s1, s2] = turn(0), ap = m.info.seam.antipode, [a1, a2] = turn(ap);
    const turnStep = Math.max(Math.abs(s1 - a1), Math.abs(s2 - a2), Math.abs(s1 - s2) > 1e-12 && Math.abs(Math.abs(s1 - s2) - Math.abs(a1 - a2)) > 1e-12 ? 1 : 0);
    // a hatch stroke with an endpoint on the seam vertex's own offset point is
    // a closed ring, or its line genuinely breaks there (off, or a weight-level
    // change across the seam)
    const band = m.bands[0];
    let cut = 0;
    const nLines = Math.max(1, Math.floor(w / m.params.hatchPitch));
    for (let k = 0; k < nLines; k++) {
      const x = (k + 0.5) / nLines, i = Math.round(x * (m.prof.x.length - 1)), d = (x - 0.5) * w;
      const P0 = G.offsetCurve(sp, d)[0];
      if (!P0) { cut++; continue; }                 // the seam vertex trimmed away: the line cannot reach it
      const dk = (v) => G.darknessAt(m.prof, i, m.params, sp.nrm[v]), thr = G.vdc(k);
      const broken = !(dk(n - 1) > thr && dk(0) > thr) || G.weightLevel(dk(n - 1)) !== G.weightLevel(dk(0));
      if (broken) continue;
      for (const h of band.hatch) {
        const f = h.pts[0], l = h.pts[h.pts.length - 1];
        const atS = (q0) => q0[0] === P0[0] && q0[1] === P0[1];
        const ring = f[0] === l[0] && f[1] === l[1];
        if ((atS(f) || atS(l)) && !ring) cut++;
      }
    }
    qRows.push({ name, gap, nAng, turnStep, cut });
  }
  rec('Q1 the seam: the loop starts ON the restated bottom centre with the restated normal (gap 0, normal 0), turns across the seam as across its antipode, and cuts no hatch line', qRows.every((r) => r.gap === 0 && r.nAng === 0 && r.turnStep <= 1e-12 && r.cut === 0), qRows.map((r) => `${r.name}: gap ${r.gap.toExponential(1)} mm, normal ${r.nAng.toExponential(1)} rad, turn step ${r.turnStep.toExponential(1)}, cut ${r.cut}`).join(' · '));

  // AN the named anchors: exactly the registry's list for the type (its
  // `when` evaluated), each ON its spine, mirrored pairs x -> -x to the bit
  const anRows = [];
  for (const [name, q] of [['arch', {}], ['arch no sill', { sill: 'none' }], ...CLOSED]) {
    const m = G.buildFrame(q);
    const want = R.ANCHORS[m.params.skeleton].filter((a) => !a.when || a.when(m.params)).map((a) => a.id).sort();
    const got = Object.keys(m.info.anchors).sort();
    let off = 0, mir = 0;
    for (const [id, a] of Object.entries(m.info.anchors)) {
      const sp = m.spines.find((x) => x.id === a.spine);
      const on = !sp ? false : a.index != null ? (sp.pts[a.index][0] === a.pt[0] && sp.pts[a.index][1] === a.pt[1]) : G.distToPoly(a.pt, sp.pts) === 0;
      if (!on) off++;
    }
    // to the BIT on the closed skeletons (built from mirrored doubles); the
    // arch is NOT bit-mirrored and never was — its left springing is R·sin π
    // (~4e-14 mm) above its right and its apex x is ~1e-14 — so the arch is
    // held to 1e-9 mm and its residue printed (its bytes are frozen, phase 2)
    const tol = m.params.skeleton === 'arch' ? 1e-9 : 0;
    let res = 0;
    for (const [l, r] of R.ANCHOR_MIRRORS) { const A = m.info.anchors[l], B = m.info.anchors[r]; if (!A !== !B) { mir++; continue; } if (!A) continue; const e = Math.max(Math.abs(A.pt[0] + B.pt[0]), Math.abs(A.pt[1] - B.pt[1])); res = Math.max(res, e); if (e > tol) mir++; }
    for (const id of ['apex', 'topCentre', 'bottomCentre']) { const A = m.info.anchors[id]; if (!A) continue; res = Math.max(res, Math.abs(A.pt[0])); if (Math.abs(A.pt[0]) > tol) mir++; }
    anRows.push({ name, ok: JSON.stringify(want) === JSON.stringify(got) && off === 0 && mir === 0, detail: `${name}: ${got.length} (${off} off, ${mir} unmirrored, mirror residue ${res.toExponential(1)} mm)${JSON.stringify(want) !== JSON.stringify(got) ? ' WANT ' + want.join(',') + ' GOT ' + got.join(',') : ''}` });
  }
  rec('AN every skeleton names exactly its registry anchors, each ON its spine, mirrored pairs exact under x -> -x', anRows.every((r) => r.ok), anRows.map((r) => r.detail).join(' · '));
  if (label === 'shipped') for (const [k, list] of Object.entries(R.ANCHORS)) console.log(`     anchors ${k.padEnd(5)} ${list.map((a) => a.id + (a.when ? '*' : '')).join(', ')}`);

  // W and H on the closed skeletons too (the law is the same law)
  let lawBad2 = 0, iffBad2 = 0, hBad2 = 0, nCross2 = 0;
  for (const [, q] of CLOSED) for (const name of ['ogee', 'cove', 'stepped']) {
    const m = G.buildFrame({ ...q, profilePreset: name });
    const sp = m.spines[0], b = m.bands[0], thr = m.params.crossHatchThreshold;
    for (const h of b.hatch) if (!near(h.weight, lawWeight(h.dark, m.params.lineWeight), 1e-12)) lawBad2++;
    let dmax = -Infinity; for (const nrm of sp.nrm) for (const d of G.toneAcross(m.prof, m.params, nrm)) dmax = Math.max(dmax, d);
    if ((b.cross.length > 0) !== (dmax > thr)) iffBad2++;
    for (const c of b.cross) { nCross2++; for (const e of c.pts) { let best = Infinity; for (let i = 0; i < m.prof.x.length; i++) best = Math.min(best, G.distToPoly(e, G.offsetPoly(sp, (m.prof.x[i] - 0.5) * sp.bandWidth))); if (best > 1e-6) hBad2++; } }
  }
  rec('W3 on the closed skeletons every hatch run is at the law of its darkness; cross-hatch IFF the band exceeds the threshold, every line a chord of offsetCurve', lawBad2 === 0 && iffBad2 === 0 && hBad2 === 0 && nCross2 > 0, `${lawBad2} off the law, ${iffBad2} iff failures, ${hBad2} endpoints off over ${nCross2} cross lines (7 skeletons × ogee/cove/stepped)`);

  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'no-mitre', from: 'return cosHalf > 1e-9 ? [sx / l / cosHalf, sy / l / cosHalf] : n1;', to: 'return n1;', breaks: ['M1', 'K1', 'K2', 'Q1', 'W3', 'K5'] },   // mitreNormal has two owners since 2b: the arch apex AND every rectangle corner, so the corners fold (K1/K2) and the seam vertex is trimmed (Q1)
  { id: 'shading-ignores-the-profile', from: 'return p.shadeIntensity * (1 - lambert(normalAt(dzds, nrm)));', to: 'return p.shadeIntensity * 0.3;', breaks: ['T2', 'T3', 'W1', 'H2', 'W3'] },   // one darkness everywhere: one weight, and no band reaches the cross-hatch threshold (H2's vacuity guard)
  { id: 'sill-top-restated-as-a-constant', from: 'floorY = innerEdge(sill, w)[0][1];', to: 'floorY = w * 0.9;', breaks: ['O1'] },
  { id: 'lights-measured-from-the-centreline', from: "const xInL = innerEdge(spines.find((s) => s.id === 'jambL'), w)[0][0];", to: 'const xInL = -a;', breaks: ['O2', 'O3'] },   // the outer light springs on that same xInL since ruling 4, so O3 reads it too
  { id: 'creases-never-found', from: 'export const CREASE_DEG = 22;', to: 'export const CREASE_DEG = 999;', breaks: ['S2'] },
  { id: 'a-second-offset-expression', from: 'const sillHalf = halfSpan + w / 2;', to: 'const sillHalf = halfSpan + w / 2; void ((spine, d) => spine.pts.map((q, i) => [q[0] + d * spine.nrm[i][0], q[1] + d * spine.nrm[i][1]]));', breaks: ['O4'] },
  // phase 1b
  { id: 'outer-light-springs-on-the-centreline', from: 'const bounds = [xInL];', to: 'const bounds = [-a];', breaks: ['O3'] },
  { id: 'weight-ignores-darkness', from: 'return lineWeight * (HATCH_WEIGHT_RANGE[0] + (HATCH_WEIGHT_RANGE[1] - HATCH_WEIGHT_RANGE[0]) * q);', to: 'return lineWeight * (0 * q + 1);', breaks: ['W1', 'W2', 'W3'] },
  { id: 'svg-ignores-the-weight', from: 'for (const h of list) { const k = f(h.weight);', to: 'for (const h of list) { const k = f(lw);', breaks: ['W2'] },
  { id: 'cross-hatch-ignores-the-threshold', from: 'const thr = p.crossHatchThreshold;', to: 'const thr = 0;', breaks: ['H1'] },
  { id: 'cross-hatch-never-drawn', from: 'const cross = crossHatch(spine, prof, p);', to: 'const cross = [];', breaks: ['H1', 'H2', 'W3'] },
  // phase 2b: the closed skeletons
  { id: 'the-oval-seam-offset-0.1mm', from: "const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", to: "pts[0] = [pts[0][0] + 0.1, pts[0][1]]; const loop = { id: 'frame', pts, nrm, joins: [], closed: true, bandWidth: w };", breaks: ['K2', 'Q1', 'AN', 'K5'] },
  // a 0.1 mm shift ALONG the bottom side stays on the restated rectangle, so K2 is right to stay silent; the seam clause and the anchor's mirror see it
  { id: 'the-rect-seam-offset-0.1mm', from: 'push(0, yb, 0, 1, false); anchorIdx.bottom = 0;', to: 'push(0.1, yb, 0, 1, false); anchorIdx.bottom = 0;', breaks: ['Q1', 'AN'] },
  { id: 'a-hatch-line-cut-at-the-seam', from: 'const order = spine.closed ? closedOrder(run, (v) => weightLevel(darknessAt(prof, i, p, spine.nrm[v]))) : null;', to: 'const order = spine.closed ? run.map((_, v) => v) : null;', breaks: ['Q1'] },
  { id: 'a-rect-corner-not-mitred', from: "if (treat === 'mitre') Q.push([0, 0, ...mitreNormal([0, 1], [-1, 0]), true]);", to: "if (treat === 'mitre') Q.push([0, 0, 0, 1, true]);", breaks: ['K2', 'Q1', 'W3'] },   // the wrong corner normal also trims the seam vertex away (the bottom-left corner's stretch reaches it)
  { id: 'the-oval-sampled-by-parameter', from: 'pts.push([A * A * c / den, cy + B * B * s / den]);', to: 'pts.push([A * c, cy + B * s]);', breaks: ['K2', 'K5'] },
  { id: 'the-aspect-not-read', from: 'let k = p.aspect;', to: 'let k = 1;', breaks: ['K2', 'K3', 'K4', 'K5'] },   // an unread aspect cannot be clamped, so K4's folding-aspect row is never told
  { id: 'an-arch-control-leaks-into-the-rect', from: 'const a = p.width / 2;\n  let b = (p.height - w) / 2;', to: 'const a = p.width / 2 + (p.mullions - 2);\n  let b = (p.height - w) / 2;', breaks: ['K3'] },
  { id: 'an-anchor-off-its-spine', from: 'topCentre: anchorAt(loop, anchorIdx.top),', to: 'topCentre: { ...anchorAt(loop, anchorIdx.top), pt: [0, 1] },', breaks: ['AN'] },
  // ruling 5: a clamp removed; the notch's floor back at phase 2b's guess (w + F, not a fold); the ear held only where a segment REVERSES ((w + F)/2 — its inner edge still loops through itself)
  { id: 'the-rounded-clamp-removed', from: 'if (sz < lo) { info.clamped.push(`corner radius', to: 'if (false) { info.clamped.push(`corner radius', breaks: ['K4', 'K5'] },
  { id: 'the-oval-clamp-removed', from: 'if (k < kLo) {', to: 'if (false) {', breaks: ['K4', 'K5'] },
  { id: 'the-notch-floor-at-the-old-guess', from: "const lo = treat === 'eared' ? w + F : F,", to: "const lo = w + F,", breaks: ['K5'] },
  { id: 'the-ear-held-only-to-its-reversal', from: "const lo = treat === 'eared' ? w + F : F,", to: "const lo = treat === 'eared' ? (w + F) / 2 : F,", breaks: ['K4', 'K5'] },
  { id: 'a-corner-clamp-not-told', from: 'if (sz < lo) { info.clamped.push(`corner radius', to: 'if (sz < lo) { void (`corner radius', breaks: ['K4', 'K5'] },
];

async function negativeControl() {
  const src = fs.readFileSync(path.join(ROOT, 'frame-geometry.js'), 'utf8');
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  // anchors first, for every mutant, before any runs
  for (const m of MUTANTS) {
    const n = src.split(m.from).length - 1;
    if (n !== 1) { console.log(`FAIL anchor ${m.id}: matches ${n} times`); process.exit(1); }
  }
  let bad = 0;
  for (const m of MUTANTS) {
    let mutated = src.replace(m.from, m.to);
    // O4 reads the shipped file by name; point its scan at the mutated copy
    const tmp = path.join(ROOT, `_frame-mutant-${m.id}.js`);
    fs.writeFileSync(tmp, mutated);
    const G = await import(pathToFileURL(tmp).href + `?${Date.now()}`);
    process.env.FRAME_GATE_SOURCE = tmp;             // O4's textual scan reads the mutated copy
    const out = await partOne(G, R, m.id);
    delete process.env.FRAME_GATE_SOURCE;
    fs.unlinkSync(tmp);
    const red = out.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
    const claimed = m.breaks;
    const missed = claimed.filter((c) => !red.includes(c));
    const unclaimed = red.filter((c) => !claimed.includes(c));
    const ok = missed.length === 0 && unclaimed.length === 0;
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'} mutant ${m.id}: fired ${red.join(',') || 'nothing'}${missed.length ? ' MISSED ' + missed.join(',') : ''}${unclaimed.length ? ' UNCLAIMED ' + unclaimed.join(',') : ''}`);
  }
  console.log(`\n${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave. Part two (browser) is NOT mutated.`);
  process.exit(bad ? 1 : 0);
}

/* ================= PART TWO ================= */
async function partTwo(G, R) {
  const { chromium } = await import('playwright-core');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  // three.js is served from node_modules at the exact jsDelivr URLs frame.html
  // pins (the bloom harness's route), so the Relief view needs no CDN egress
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { route.abort(); }
  });
  await page.goto(`${base}/frame.html`);
  await page.waitForFunction(() => !!window.__frame);

  // U controls
  const present = await page.evaluate((ids) => ids.map((id) => !!document.getElementById(id)), R.PARAM_SPEC.map((s) => s.id));
  check('U1 every registry control is in the DOM', present.every(Boolean), `${present.filter(Boolean).length} of ${present.length}`);
  await page.evaluate(() => window.__frame.setParams({ mullions: 0 }));
  const hid0 = await page.evaluate(() => window.__frame.controls().mullionWidth);
  await page.evaluate(() => window.__frame.setParams({ mullions: 1 }));
  const hid1 = await page.evaluate(() => window.__frame.controls().mullionWidth);
  check('U2 mullionWidth hides at 0 mullions and shows at 1 (both directions)', hid0 === false && hid1 === true, `0 → ${hid0}, 1 → ${hid1}`);
  const advIds = R.PARAM_SPEC.filter((s) => s.tier === 'advanced').map((s) => s.id);
  const stdIds = R.PARAM_SPEC.filter((s) => s.tier !== 'advanced' && !s.visibleWhen).map((s) => s.id);
  const vis = async (on) => { await page.evaluate((o) => window.__frame.setAdvanced(o), on); return page.evaluate(() => window.__frame.controls()); };
  const vOff = await vis(false), vOn = await vis(true); await vis(false);
  check('U3 Advanced-tier controls hide with the toggle off and show with it on; Standard controls move neither way', advIds.length > 0 && advIds.every((id) => vOff[id] === false && vOn[id] === true) && stdIds.every((id) => vOff[id] === true && vOn[id] === true), `advanced: ${advIds.join(',')}; ${stdIds.length} standard controls unmoved`);

  // U4 each skeleton type shows its own controls and hides the others' (both directions)
  const own = { arch: ['pointedness', 'mullions', 'mullionWidth', 'sill', 'width'], rect: ['cornerTreatment', 'cornerSize', 'width'], oval: ['aspect'] };
  const vis4 = {};
  for (const sk of ['arch', 'rect', 'oval']) { await page.evaluate((q) => window.__frame.setParams(q), { skeleton: sk, cornerTreatment: 'rounded', mullions: 2 }); vis4[sk] = await page.evaluate(() => window.__frame.controls()); }
  const u4bad = [];
  for (const sk of Object.keys(own)) for (const id of new Set(Object.values(own).flat())) { const want = own[sk].includes(id); if (vis4[sk][id] !== want) u4bad.push(`${sk}/${id}: ${vis4[sk][id]}`); }
  await page.evaluate(() => window.__frame.setParams({ skeleton: 'rect', cornerTreatment: 'mitre' }));
  const mitreSize = await page.evaluate(() => window.__frame.controls().cornerSize);
  check('U4 each skeleton shows exactly its own controls (arch: pointedness, mullions, sill; rect: corners, size; oval: aspect, no width) and a mitred corner hides its size', u4bad.length === 0 && mitreSize === false, u4bad.join('; ') || 'arch / rect / oval both ways');

  // X one geometry path — on every skeleton type
  const sameAll = [];
  for (const q of [{ skeleton: 'rect', cornerTreatment: 'eared' }, { skeleton: 'oval' }]) {
    await page.evaluate((v) => window.__frame.setParams(v), q);
    sameAll.push(await page.evaluate(() => { const ds = (root) => Array.from(root.querySelectorAll('path')).map((e) => e.getAttribute('d')); const a = ds(document.getElementById('paper')), b = ds(new DOMParser().parseFromString(window.__frame.svg(), 'image/svg+xml')); return a.length > 0 && a.length === b.length && a.every((d, i) => d === b[i]); }));
  }
  check('X2 on the rectangle and the oval too, the drawing on screen IS the export string', sameAll.every(Boolean), sameAll.join(','));
  await page.evaluate(() => window.__frame.setParams({}));
  const same = await page.evaluate(() => {
    const ds = (root) => Array.from(root.querySelectorAll('path')).map((e) => e.getAttribute('d'));
    const shown = ds(document.getElementById('paper'));
    const exported = ds(new DOMParser().parseFromString(window.__frame.svg(), 'image/svg+xml'));
    return { n: shown.length, same: shown.length === exported.length && shown.every((d, i) => d === exported[i]) };
  });
  check('X1 the drawing on screen IS the export string (every path d, in order)', same.same, `${same.n} paths`);

  // V pixel diff at a fixed camera
  const VIEW = { x0: -240, y0: -40, x1: 240, y1: 640 };
  await page.addStyleTag({ content: '.fr-panel,.fr-header{display:none!important} .fr-stage{right:0!important;padding:10px!important}' });
  await page.evaluate((v) => window.__frame.setFixedView(v), VIEW);
  const shot = async () => {
    const el = await page.$('#paper svg');
    const buf = await el.screenshot({ type: 'png' });
    return buf;
  };
  const decode = async (buf) => {
    // decode through the browser itself: draw into a canvas and read back
    return page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const g = new Uint8Array(c.width * c.height);
      for (let i = 0; i < g.length; i++) g[i] = (d[4 * i] + d[4 * i + 1] + d[4 * i + 2]) / 3;
      return { w: c.width, h: c.height, g: Array.from(g) };
    }, buf.toString('base64'));
  };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.g.length; i++) if (Math.abs(a.g[i] - b.g[i]) > 40) n++; return n; };
  const baseImg = await decode(await shot());
  const baseAgain = await decode(await shot());
  check('V0 the fixed camera is repeatable (same state twice)', diff(baseImg, baseAgain) === 0, `${diff(baseImg, baseAgain)} px differ, ${baseImg.w}×${baseImg.h}`);
  const vrows = [];
  // a control that belongs to one skeleton type is probed IN that type,
  // against that type's own baseline (phase 2b) — never against the arch
  const CONTEXT = { cornerTreatment: { skeleton: 'rect' }, cornerSize: { skeleton: 'rect', cornerTreatment: 'rounded' }, aspect: { skeleton: 'oval' } };
  const baseOf = {};
  for (const s of R.PARAM_SPEC) {
    if (s.section === 'print') continue;        // the print rows reach the STL, never the paper: V2 below
    const ctx = CONTEXT[s.id] || {};
    const key = JSON.stringify(ctx);
    if (!baseOf[key]) { await page.evaluate((q) => window.__frame.setParams(q), ctx); baseOf[key] = await decode(await shot()); }
    const states = s.kind === 'range' ? [[s.default === s.max ? s.min : s.max]] : s.options.map(([v]) => [v]).filter(([v]) => v !== (ctx[s.id] ?? s.default));
    for (const [v] of states) {
      const p = { ...ctx, [s.id]: v };
      if (s.id === 'mullionWidth') p.mullions = 3;
      if (s.id === 'profilePreset' && v === 'custom') continue;      // reached by the editor (E1), not by the select
      await page.evaluate((q) => window.__frame.setParams(q), p);
      const n = diff(baseOf[key], await decode(await shot()));
      vrows.push({ id: s.id, v, n });
    }
  }
  await page.evaluate(() => window.__frame.setParams({}));
  const dead = vrows.filter((r) => r.n < 200);
  check('V1 every drawing control moves pixels at a fixed camera (≥ 200 px)', dead.length === 0, dead.length ? 'DEAD: ' + dead.map((r) => `${r.id}=${r.v} (${r.n})`).join(', ') : vrows.map((r) => `${r.id}=${r.v}:${r.n}`).join(' '));
  // V2 the print rows move the STL and leave the paper alone (phase 2)
  const stl0 = await page.evaluate(() => window.__frame.stl());
  const svg0 = await page.evaluate(() => window.__frame.svg());
  const prows = [];
  for (const s of R.PARAM_SPEC.filter((q) => q.section === 'print')) {
    const states = s.kind === 'range' ? [s.default === s.max ? s.min : s.max] : s.options.map(([v]) => v).filter((v) => v !== s.default);
    for (const v of states) {
      await page.evaluate((q) => window.__frame.setParams(q), { [s.id]: v });
      const stl = await page.evaluate(() => window.__frame.stl());
      const svg = await page.evaluate(() => window.__frame.svg());
      prows.push({ id: s.id, v, moved: stl.hash !== stl0.hash, paper: svg === svg0, tris: stl.triangles });
    }
  }
  await page.evaluate(() => window.__frame.setParams({}));
  check('V2 every print control moves the STL and none moves the SVG', prows.length > 0 && prows.every((r) => r.moved && r.paper), prows.map((r) => `${r.id}=${r.v}:${r.moved ? 'stl moved' : 'STL UNMOVED'}${r.paper ? '' : ' PAPER MOVED'}`).join(' '));

  // P3 the STL button writes the relief: a real download, watertight
  const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);
  // the panel is hidden at this point in the sweep, so the click is dispatched on the element itself
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('exportStl').click())]);
  const dlPath = await dl.path();
  const dlBytes = new Uint8Array(fs.readFileSync(dlPath));
  const census = RL.analyzeStl(dlBytes);
  const inPage = await page.evaluate(() => window.__frame.stl());
  check('P3 Get STL downloads the relief: a binary STL, boundary edges 0, the bytes the page holds', dlBytes.length === inPage.bytes && census.boundary === 0 && census.triangles === inPage.triangles && /\.stl$/.test(dl.suggestedFilename()), `${dl.suggestedFilename()}: ${census.triangles} tris, ${(dlBytes.length / 1024).toFixed(0)} KiB, boundary ${census.boundary}`);

  // P4 the Relief view draws the relief and leaves the SVG alone; the Drawing view comes back
  const svgBefore = await page.evaluate(() => window.__frame.svg());
  await page.evaluate(() => window.__frame.setView('3d'));
  await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const ink3d = await page.evaluate(() => window.__frame.view3dInk());
  const vis3d = await page.evaluate(() => ({ canvas: !document.getElementById('stage3d').hidden, paper: document.getElementById('paper').hidden }));
  const svgAfter = await page.evaluate(() => window.__frame.svg());
  await page.evaluate(() => window.__frame.setView('svg'));
  const back = await page.evaluate(() => ({ canvas: !document.getElementById('stage3d').hidden, paper: document.getElementById('paper').hidden, view: window.__frame.view() }));
  check('P4 the Relief view draws (ink on the canvas), hides the paper, leaves the SVG string unchanged, and the Drawing view returns', ink3d > 0.02 && vis3d.canvas && vis3d.paper && svgAfter === svgBefore && !back.canvas && !back.paper && back.view === 'svg', `relief ink ${(100 * ink3d).toFixed(1)}% of the canvas`);

  // E editor drag
  await page.addStyleTag({ content: '.fr-panel{display:block!important}' });
  const pt = await page.evaluate(() => {
    const c = document.getElementById('profileEditor'); const r = c.getBoundingClientRect();
    const pts = window.__frame.getProfile(); const p = pts[Math.floor(pts.length / 2)];
    const PAD = 14; return { x: r.left + PAD + p[0] * (r.width - 2 * PAD), y: r.top + (r.height - PAD) + p[1] * (2 * PAD - r.height), idx: Math.floor(pts.length / 2) };
  });
  const before = await decode(await shot());
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x, pt.y + 30, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(80);
  const after = await decode(await shot());
  const prof = await page.evaluate(() => window.__frame.getParams().profilePreset);
  check('E1 a real drag on a profile point moves the drawing and flips the preset to custom', diff(before, after) > 50 && prof === 'custom', `${diff(before, after)} px, preset ${prof}`);
  await page.evaluate(() => window.__frame.setParams({}));

  // Tp tone on pixels: the left jamb's band at mid-height, through its OWN
  // close camera (the whole-frame view is ~1.3 px/mm, where a 0.4 mm hatch
  // line is anti-aliased grey and never reads as ink). Three bins across the
  // band's interior (0.10..0.85 of the width, clear of both edge lines): a bin
  // has to be wider than the pitch of the SPARSEST line set the shipped
  // intensity produces, or uniform shading reads as banding. Coarse, and said so.
  const a0 = R.DEFAULTS.width / 2, w0 = R.DEFAULTS.moldingWidth;
  const VIEW_T = { x0: -a0 - w0, y0: 40, x1: -a0 + w0, y1: 160 };
  await page.evaluate((v) => window.__frame.setFixedView(v), VIEW_T);
  const toneRows = {};
  for (const name of Object.keys(R.PROFILE_PRESETS)) {
    await page.evaluate((q) => window.__frame.setParams(q), { profilePreset: name });
    const img = await decode(await shot());
    const ppm = img.w / (VIEW_T.x1 - VIEW_T.x0 + 16);
    const xL = (-a0 - w0 / 2 - (VIEW_T.x0 - 8)) * ppm, xR = (-a0 + w0 / 2 - (VIEW_T.x0 - 8)) * ppm;
    const bins = 3, frac = [];
    for (let b = 0; b < bins; b++) {
      const f0 = 0.10 + 0.75 * b / bins, f1 = 0.10 + 0.75 * (b + 1) / bins;
      let ink = 0, n = 0;
      for (let y = Math.round(img.h * 0.2); y < img.h * 0.8; y++) for (let x = Math.round(xL + (xR - xL) * f0); x < xL + (xR - xL) * f1; x++) { n++; if (img.g[y * img.w + x] < 160) ink++; }
      frac.push(ink / n);
    }
    toneRows[name] = frac;
  }
  await page.evaluate(() => window.__frame.setParams({}));
  const spread = (f) => Math.max(...f) - Math.min(...f);
  check('Tp1 flat band: pixel ink is uniform across the band (3 bins within 0.06)', spread(toneRows.flat) <= 0.06, `bins ${toneRows.flat.map((v) => v.toFixed(3)).join(' ')}`);
  // one hatch line across this window is ~0.06 of ink, so a bin reads in steps
  // of that size: the pixel clause asserts the DIRECTION (outer darker, never
  // lighter inward) and T2 carries the magnitude on the geometry.
  const c = toneRows.cove;
  check('Tp2 cove: pixel ink is darker at the outer bin and never rises inward', c[0] > c[2] && c[0] >= c[1] && c[1] >= c[2], `bins ${c.map((v) => v.toFixed(3)).join(' ')} (one line ≈ 0.059)`);
  console.log(`     pixel ink fraction across the left jamb band interior, outer → inner, 3 bins (close camera, intensity ${R.DEFAULTS.shadeIntensity.toFixed(2)}, weight follows darkness):`);
  for (const [n, f] of Object.entries(toneRows)) console.log(`       ${n.padEnd(8)} ${f.map((v) => v.toFixed(3)).join('  ')}   spread ${spread(f).toFixed(3)}`);

  check('page: no errors', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
}

/* ================= main ================= */
if (NEG) { await negativeControl(); }
else {
  const G = await import(pathToFileURL(path.join(ROOT, 'frame-geometry.js')).href);
  const R = await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href);
  await partOne(G, R);
  if (!NOBROWSER) await partTwo(G, R);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed${failed.length ? ' — FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
