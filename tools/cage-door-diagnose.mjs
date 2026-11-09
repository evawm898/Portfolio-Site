#!/usr/bin/env node
/* cage-door-diagnose.mjs [--module <cage-geometry.js>] [--json <file>] — /cage's DOOR DIAGNOSTIC.

   Builds every preset × cross-section (round, 4, 6, 8) × door shape (rect, arch, gothic,
   ogee), plus the size extremes, through the given cage-geometry.js (default: this tree's;
   pass a worktree's to read the base), and reads the EMITTED model — the wires and the
   info — for the four things that make a door look wrong:

     CORNER   a polygon corner lies strictly inside the door's span, so the opening folds
              across two faces (the frame bends round the corner)
     JAMB     a bar crosses a jamb: a bar's cut end lands on the jamb's straight run rather
              than on the sill or the head — the jamb cuts the bar at an arbitrary height
              instead of replacing it; and a bar running UNCUT within a bar pitch of the
              jamb (a near-miss sliver of opening beside the frame)
     STUB     a bar run left inside the door's span shorter than a bar pitch
     RING     the head crosses a profile shoulder's ring or a banded ring, or a ring passes
              within (ring + frame) of the sill or the head without being either (a ring
              grazing the frame), or the sill floats with no ring under it
     SURF     a frame point off the cage's own surface (the frame not lying on the cage)

   Every measurement is read off the model; the only things restated are the polygon's
   corner rule (corners every 2π/N, offset by `info.polyPhase` when the builder reports one)
   and the surface (the profile restated through bloom-curve.js, as B9 does). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const MOD = args.includes('--module') ? path.resolve(args[args.indexOf('--module') + 1]) : path.join(ROOT, 'cage-geometry.js');
const JSON_OUT = args.includes('--json') ? path.resolve(args[args.indexOf('--json') + 1]) : null;
const G = await import(pathToFileURL(MOD).href);
const { curveFunction } = await import(pathToFileURL(path.join(path.dirname(MOD), 'bloom-curve.js')).href);

const TAU = Math.PI * 2;
const ang = (q) => Math.atan2(q[1], q[0]);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const nearSeg = (q, pts) => { let best = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1; let t = ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, dist(q, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t])); } return best; };

export function diagnose(G, params) {
  const m = G.buildCage(params);
  const issues = [];
  const d = m.info.door;
  if (!d) return { m, issues: ['no door'] };
  const N = +params.sides | 0, H = params.heightMm, Rb = params.widthMm / 2;
  const f = curveFunction(params.profile.points, G.PROFILE_SPEC);
  const rho = (z) => Rb * f(Math.min(1, Math.max(0, z / H)));
  const phase = (m.info.polyPhase || 0);
  const poly = (r, th) => { if (!N) return r; const fc = Math.PI / N; let a = (((th - phase) % (2 * fc)) + 2 * fc) % (2 * fc) - fc; return r * Math.cos(fc) / Math.cos(a); };
  const frame = m.wires.find((w) => w.kind === 'door');
  const fp = frame.pts, closedFp = [...fp, fp[0]];
  const zSill = Math.min(...fp.map((q) => q[2])), zHead = Math.max(...fp.map((q) => q[2]));
  const thC = ang(fp.reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]).concat(0));
  // the frame's azimuth span at every height it occupies
  const thAt = fp.map((q) => wrap(ang(q) - thC));
  const thMin = Math.min(...thAt), thMax = Math.max(...thAt);
  const out = { shape: d.shape, W: d.W, Dh: d.Dh, z0: zSill, zTop: zHead, thSpanDeg: (thMax - thMin) * 180 / Math.PI, centreDeg: thC * 180 / Math.PI };
  // CORNER
  if (N) {
    const corners = Array.from({ length: N }, (_, k) => phase + TAU * k / N);
    const inside = corners.filter((c) => { const a = wrap(c - thC); return a > thMin + 1e-6 && a < thMax - 1e-6; });
    if (inside.length) issues.push(`CORNER: ${inside.length} corner${inside.length > 1 ? 's' : ''} inside the door (at ${inside.map((c) => (wrap(c - thC) * 180 / Math.PI).toFixed(1) + '°').join(', ')} from its centre) — the opening folds across faces`);
    const faceOff = Math.min(...Array.from({ length: N }, (_, k) => Math.abs(wrap(phase + TAU * (k + 0.5) / N - thC)))) * 180 / Math.PI;
    out.faceOffDeg = faceOff;
  }
  // JAMB / STUB: bar runs and their cut ends
  const bars = m.wires.filter((w) => w.kind === 'bar');
  const pitchAt = (z) => TAU * rho(z) / m.info.barCount;
  let jambCuts = 0, stubs = 0, nearMiss = 0;
  const jambEnds = [];
  // which part of the frame each frame point belongs to: the builder's order when it reports it
  // (frame.parts), else the Phase 1 builder's own order — right jamb up (nJ points), the top edge
  // right to left (48 + 1), the left jamb down (nJ), the sill (47) — reconstructed from Dh
  let part = frame.parts;
  if (!part) {
    const nJ = Math.max(4, Math.ceil(d.Dh / 2)), nTop = 48;
    const raw = [];
    for (let i = 0; i < nJ; i++) raw.push(i === 0 ? 'corner' : 'jamb');
    for (let i = 0; i <= nTop; i++) raw.push(i === 0 || i === nTop ? 'corner' : 'head');
    for (let i = 1; i <= nJ; i++) raw.push(i === nJ ? 'corner' : 'jamb');
    for (let i = 1; i < nTop; i++) raw.push('sill');
    part = raw.length === fp.length ? raw : null;
  }
  const partOf = (e) => { let bi = 0, bd = Infinity; fp.forEach((q, i) => { const dd = dist(q, e); if (dd < bd) { bd = dd; bi = i; } }); return part ? part[bi] : '?'; };
  for (const w of bars) {
    const th0 = wrap(ang(w.pts[0]) - thC);
    for (const e of [w.pts[0], w.pts[w.pts.length - 1]]) {
      if (e[2] < 1e-6 || e[2] > H - 1e-6) continue;
      if (nearSeg(e, closedFp) > frame.r + 1e-6) continue;
      // a cut end on a jamb's straight run, clear of the sill (the jamb's foot) by more than the frame wire
      if (partOf(e) === 'jamb' && e[2] > zSill + 2 * frame.r) { jambCuts++; jambEnds.push(+e[2].toFixed(1)); }
    }
    // a run inside the door's azimuth span between sill and head that is shorter than a pitch: a stub
    const inSpan = w.pts.every((q) => { const a = wrap(ang(q) - thC); return a > thMin - 1e-6 && a < thMax + 1e-6 && q[2] >= zSill - 1e-6 && q[2] <= zHead + 1e-6; });
    if (inSpan) { let L = 0; for (let i = 1; i < w.pts.length; i++) L += dist(w.pts[i], w.pts[i - 1]); if (L < pitchAt(zSill)) stubs++; }
    // an uncut bar beside a jamb (it runs base to top) whose azimuth sits within a third of a pitch of the jamb at the sill
    const full = w.pts[0][2] < 1e-6 && w.pts[w.pts.length - 1][2] >= H - 1e-6;
    if (full) {
      const jambA = [thMin, thMax];
      const gap = Math.min(...jambA.map((j) => Math.abs(th0 - j))) * rho(zSill);
      if (gap > 1e-3 && gap < pitchAt(zSill) / 3) nearMiss++;
    }
  }
  if (jambCuts) issues.push(`JAMB: ${jambCuts} bar end${jambCuts > 1 ? 's' : ''} cut on a jamb (z ${[...new Set(jambEnds)].slice(0, 4).join(', ')} mm) — the jamb cuts a bar mid-height instead of replacing it`);
  if (stubs) issues.push(`STUB: ${stubs} bar stub${stubs > 1 ? 's' : ''} inside the door's span, shorter than a bar pitch`);
  if (nearMiss) issues.push(`SLIVER: ${nearMiss} uncut bar${nearMiss > 1 ? 's' : ''} within a third of a pitch of a jamb — a sliver of opening beside the frame`);
  out.jambCuts = jambCuts; out.stubs = stubs; out.nearMiss = nearMiss;
  // RING: rings against the sill and the head
  const loops = m.wires.filter((w) => w.kind === 'ring' || w.kind === 'frame');
  const ringZs = [...new Set(loops.map((w) => +w.pts[0][2].toFixed(4)))].sort((a, b) => a - b);
  const rRing = Math.max(...loops.map((w) => w.r));
  const shoulders = (m.info.shoulderZ || []).map((sz) => ringZs.reduce((b, z) => (Math.abs(z - sz) < Math.abs(b - sz) ? z : b), ringZs[0]));
  const bandZ = (m.bandRings || []).map((r) => r.z);
  const headZ = zHead, sillZ = zSill;
  for (const z of shoulders) if (z > sillZ + 1e-6 && z < headZ - 1e-6) issues.push(`RING: the door crosses the shoulder ring at ${z.toFixed(1)} mm`);
  for (const z of bandZ) if (z > sillZ + 1e-6 && z < headZ - 1e-6) issues.push(`RING: the door crosses the banded ring at ${z.toFixed(1)} mm`);
  const graze = rRing + frame.r;
  for (const z of ringZs) {
    if (Math.abs(z - sillZ) > 1e-3 && Math.abs(z - sillZ) < graze) issues.push(`RING: the ring at ${z.toFixed(1)} grazes the sill (${Math.abs(z - sillZ).toFixed(2)} mm off, under ${graze.toFixed(2)})`);
    if (z > sillZ && Math.abs(z - headZ) < graze && Math.abs(z - headZ) > 1e-3) issues.push(`RING: the ring at ${z.toFixed(1)} grazes the head (${Math.abs(z - headZ).toFixed(2)} mm off)`);
  }
  const onRing = ringZs.some((z) => Math.abs(z - sillZ) < 1e-3);
  if (!onRing) out.sillFloat = Math.min(...ringZs.map((z) => Math.abs(z - sillZ)));
  if (!onRing) issues.push(`SILL: the sill sits on no ring (${out.sillFloat.toFixed(1)} mm from the nearest)`);
  out.sillOnRing = onRing;
  // SURF: the frame on the surface
  let worst = 0;
  for (const q of fp) { const th = ang(q), r = Math.hypot(q[0], q[1]); worst = Math.max(worst, Math.abs(r - poly(rho(q[2]), th))); }
  out.surfMm = worst;
  if (worst > 1e-3) issues.push(`SURF: frame up to ${worst.toFixed(3)} mm off the surface`);
  return { m, issues, out };
}

export function diagnosticCases(G) {
  const cases = [];
  for (const id of G.PRESET_IDS) for (const sides of ['0', '4', '6', '8']) for (const shape of ['rect', 'arch', 'gothic', 'ogee']) {
    cases.push({ label: `${id} · ${sides === '0' ? 'round' : sides + '-gon'} · ${shape}`, group: 'matrix', preset: id, sides, shape, params: { ...G.applyPreset(G.defaultParams(), id), sides, doorShape: shape } });
  }
  const D = G.defaultParams();
  const ext = [
    ['default', {}],
    ['narrow body 40 mm', { widthMm: 40 }], ['wide body 160 mm', { widthMm: 160 }],
    ['short body 40 mm', { heightMm: 40 }], ['tall body 240 mm', { heightMm: 240 }],
    ['door 10 mm wide', { doorWidth: 10 }], ['door 90 mm wide', { doorWidth: 90 }],
    ['door 10 mm tall', { doorHeight: 10 }], ['door 180 mm tall', { doorHeight: 180 }],
    ['door at the bottom (0)', { doorY: 0 }], ['door at the top (1)', { doorY: 1 }],
    ['door 90 mm wide on a 4-gon', { doorWidth: 90, sides: '4' }],
    ['bell banded every ring', { bandStyle: 'beading', bandRings: 'all' }],
    ['tiered, tall door', { ...G.PRESETS.tiered, doorHeight: 120 }],
  ];
  for (const [label, over] of ext) cases.push({ label: `extreme · ${label}`, group: 'extreme', params: { ...D, ...over } });
  return cases;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = [];
  let bad = 0;
  const tally = {};
  for (const c of diagnosticCases(G)) {
    let r; try { r = diagnose(G, c.params); } catch (e) { r = { issues: [`BUILD: ${e.message}`], out: {} }; }
    if (r.issues.length) bad++;
    for (const i of r.issues) { const k = i.split(':')[0]; tally[k] = (tally[k] || 0) + 1; }
    rows.push({ label: c.label, group: c.group, preset: c.preset, sides: c.sides, shape: c.shape, issues: r.issues, out: r.out, told: r.m ? r.m.told.filter((t) => /door/.test(t)) : [] });
    console.log(`${r.issues.length ? 'WRONG' : 'ok   '} ${c.label}${r.issues.length ? '\n        ' + r.issues.join('\n        ') : ''}`);
  }
  console.log(`\n${bad} of ${rows.length} cases look wrong · by class: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(rows, null, 1));
}
