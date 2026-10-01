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

   --negative-control  eleven mutations of frame-geometry.js, each served to
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

  return out;
}

/* ================= NEGATIVE CONTROL ================= */
const MUTANTS = [
  { id: 'no-mitre', from: 'const mitre = cosHalf > 1e-9 ? [sx / l / cosHalf, sy / l / cosHalf] : n1;', to: 'const mitre = n1;', breaks: ['M1'] },
  { id: 'shading-ignores-the-profile', from: 'return p.shadeIntensity * (1 - lambert(normalAt(dzds, nrm)));', to: 'return p.shadeIntensity * 0.3;', breaks: ['T2', 'T3', 'W1', 'H2'] },   // one darkness everywhere: one weight, and no band reaches the cross-hatch threshold (H2's vacuity guard)
  { id: 'sill-top-restated-as-a-constant', from: 'floorY = innerEdge(sill, w)[0][1];', to: 'floorY = w * 0.9;', breaks: ['O1'] },
  { id: 'lights-measured-from-the-centreline', from: "const xInL = innerEdge(spines.find((s) => s.id === 'jambL'), w)[0][0];", to: 'const xInL = -a;', breaks: ['O2', 'O3'] },   // the outer light springs on that same xInL since ruling 4, so O3 reads it too
  { id: 'creases-never-found', from: 'export const CREASE_DEG = 22;', to: 'export const CREASE_DEG = 999;', breaks: ['S2'] },
  { id: 'a-second-offset-expression', from: 'const sillHalf = halfSpan + w / 2;', to: 'const sillHalf = halfSpan + w / 2; void ((spine, d) => spine.pts.map((q, i) => [q[0] + d * spine.nrm[i][0], q[1] + d * spine.nrm[i][1]]));', breaks: ['O4'] },
  // phase 1b
  { id: 'outer-light-springs-on-the-centreline', from: 'const bounds = [xInL];', to: 'const bounds = [-a];', breaks: ['O3'] },
  { id: 'weight-ignores-darkness', from: 'return lineWeight * (HATCH_WEIGHT_RANGE[0] + (HATCH_WEIGHT_RANGE[1] - HATCH_WEIGHT_RANGE[0]) * q);', to: 'return lineWeight * (0 * q + 1);', breaks: ['W1', 'W2'] },
  { id: 'svg-ignores-the-weight', from: 'for (const h of list) { const k = f(h.weight);', to: 'for (const h of list) { const k = f(lw);', breaks: ['W2'] },
  { id: 'cross-hatch-ignores-the-threshold', from: 'const thr = p.crossHatchThreshold;', to: 'const thr = 0;', breaks: ['H1'] },
  { id: 'cross-hatch-never-drawn', from: 'const cross = crossHatch(spine, prof, p);', to: 'const cross = [];', breaks: ['H1', 'H2'] },
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

  // X one geometry path
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
  for (const s of R.PARAM_SPEC) {
    const states = s.kind === 'range' ? [[s.default === s.max ? s.min : s.max]] : s.options.map(([v]) => [v]).filter(([v]) => v !== s.default);
    for (const [v] of states) {
      const p = { [s.id]: v };
      if (s.id === 'mullionWidth') p.mullions = 3;
      if (s.id === 'profilePreset' && v === 'custom') continue;      // reached by the editor (E1), not by the select
      await page.evaluate((q) => window.__frame.setParams(q), p);
      const n = diff(baseImg, await decode(await shot()));
      vrows.push({ id: s.id, v, n });
    }
  }
  await page.evaluate(() => window.__frame.setParams({}));
  const dead = vrows.filter((r) => r.n < 200);
  check('V1 every control moves pixels at a fixed camera (≥ 200 px)', dead.length === 0, dead.length ? 'DEAD: ' + dead.map((r) => `${r.id}=${r.v} (${r.n})`).join(', ') : vrows.map((r) => `${r.id}=${r.v}:${r.n}`).join(' '));

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
