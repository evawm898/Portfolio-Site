#!/usr/bin/env node
/* frame-flow-envelope.mjs <out.png> [--refs <dir>] — round 2 of the flow
   study (docs/frame-flow-study.md §9): the composed oval's TARGET ENVELOPE
   (frame-compose.js's ENVELOPES.oval, eased between its keypoints exactly as
   the composer eases them) and the envelope the composer actually BUILT (the
   farthest wire beyond the molding, binned along the side), against R2's
   envelope as traced by eye (tools/frame-flow-trace.mjs's outermost points).

   Two pictures:
   - a chart: projection beyond the molding, in units of the band M, against
     the arc fraction from the crest (0) to the bottom (1) — the three curves;
   - R2's measured molding with the traced envelope (grey dots) and the
     composed TARGET mapped onto it by arc fraction and M (red dashes) — and,
     with --refs <dir> (the photographs, never committed), the same over
     2.webp written beside the output as *-photo.png.
   Line art only in the committed picture. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-flow-envelope.png');
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const G = await imp('frame-geometry.js'), FL = await imp('frame-filigree.js'), FC = await imp('frame-compose.js');

// R2's molding and the traced envelope (the trace tool's own numbers, px)
const C = [300, 413], A = 215, B = 287, MPX = 38;
const ENV = [[300, 32], [250, 70], [236, 84], [222, 116], [182, 128], [150, 160], [110, 198], [44, 256], [30, 316], [36, 380], [44, 470], [42, 545], [76, 590], [112, 640], [138, 668], [160, 760], [210, 735], [300, 760]];
// the outer ellipse sampled crest (top, θ = −π/2) → bottom down the LEFT side, with arc length
const N = 4000, ell = [];
for (let k = 0; k <= N; k++) { const th = -Math.PI / 2 - Math.PI * k / N; ell.push([C[0] + A * Math.cos(th), C[1] + B * Math.sin(th)]); }
const arc = [0]; for (let k = 1; k <= N; k++) arc.push(arc[k - 1] + Math.hypot(ell[k][0] - ell[k - 1][0], ell[k][1] - ell[k - 1][1]));
const Ltot = arc[N];
const nearestOn = (q) => { let b = 0, bd = Infinity; for (let k = 0; k <= N; k++) { const d = Math.hypot(q[0] - ell[k][0], q[1] - ell[k][1]); if (d < bd) { bd = d; b = k; } } const inside = ((q[0] - C[0]) / A) ** 2 + ((q[1] - C[1]) / B) ** 2 < 1; return { t: arc[b] / Ltot, e: (inside ? -bd : bd) / MPX, k: b }; };
const r2 = ENV.map(nearestOn).sort((a, b) => a.t - b.t);
const atFrac = (t) => { const s = t * Ltot; let k = arc.findIndex((v) => v >= s); if (k < 1) k = 1; const p = ell[k], q = ell[k - 1], tx = p[0] - q[0], ty = p[1] - q[1], l = Math.hypot(tx, ty); return { p, n: [-ty / l, tx / l] }; };   // outward: the side runs anticlockwise on screen (y down)

// the composed oval: its keypoints eased as the composer eases them, and its built reach
const m = FL.withOrnament(G.buildFrame({ ...G.DEFAULTS, filigree: 'scrolls', skeleton: 'oval', ornBottom: 'on', ornFlow: 'composed' }));
const o = m.ornament, f = o.flow, M = o.length, kp = f.keypoints, L = f.envelope.length - 1;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const eAt = (s) => { if (s <= kp[0].s) return kp[0].e; if (s >= kp[kp.length - 1].s) return kp[kp.length - 1].e; let i = 0; while (i < kp.length - 2 && kp[i + 1].s < s) i++; return kp[i].e + (kp[i + 1].e - kp[i].e) * smooth((s - kp[i].s) / Math.max(1e-9, kp[i + 1].s - kp[i].s)); };
const target = []; for (let s = 0; s <= L; s += 1) target.push({ t: s / L, e: eAt(s) });
// built: every right-side wire point, its distance beyond the band's outer edge in M, binned on the envelope's s
const bins = new Array(Math.ceil(L / 4) + 1).fill(-Infinity);
for (const c of o.groups[0].curves) for (const q of c.pts) {
  let b = 0, bd = Infinity; f.envelope.forEach((p, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = i; } });
  bins[Math.floor(b / 4)] = Math.max(bins[Math.floor(b / 4)], -o.region.depth(q) / M);
}
for (const el of o.elements) for (const l of el.loops) for (const q of l) { if (q[0] < 0) continue; let b = 0, bd = Infinity; f.envelope.forEach((p, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = i; } }); bins[Math.floor(b / 4)] = Math.max(bins[Math.floor(b / 4)], -o.region.depth(q) / M); }
const built = bins.map((e, i) => ({ t: Math.min(1, (i * 4 + 2) / L), e })).filter((b) => b.e > -Infinity);

// the chart
const W = 760, H = 330, X = (t) => 60 + t * (W - 80), Y = (e) => H - 40 - e * 90;
const poly = (pts, col, dash, w = 2) => `<polyline points="${pts.map((p) => `${X(p.t).toFixed(1)},${Y(Math.max(-0.2, p.e)).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
let chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="monospace" font-size="11"><rect width="${W}" height="${H}" fill="#EDEDE8"/>`;
for (const e of [0, 1, 2, 3]) chart += `<line x1="60" x2="${W - 20}" y1="${Y(e)}" y2="${Y(e)}" stroke="#bbb"/><text x="30" y="${Y(e) + 4}">${e} M</text>`;
for (const t of [0, 0.25, 0.5, 0.75, 1]) chart += `<text x="${X(t) - 10}" y="${H - 18}">${t}</text>`;
chart += `<text x="${X(0.3)}" y="${H - 4}">arc fraction along the side, crest (0) → bottom (1)</text>`;
chart += poly(r2, '#7A7A72', '2 4', 2.5) + r2.map((p) => `<circle cx="${X(p.t)}" cy="${Y(p.e)}" r="3" fill="#7A7A72"/>`).join('');
chart += poly(target, '#c33', '6 3', 2) + poly(built, '#0A0A0C', null, 1.5);
chart += `<text x="70" y="20" fill="#7A7A72">● R2, traced envelope (outermost traced points)</text><text x="70" y="36" fill="#c33">– – the composed oval's TARGET envelope (ENVELOPES.oval)</text><text x="70" y="52">— what the composer BUILT (farthest wire / motif beyond the molding, 4 mm bins)</text></svg>`;
// the target mapped onto R2's molding
let over = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">`;
const overParts = (photo) => {
  let s = photo ? `<image href="data:image/webp;base64,${fs.readFileSync(path.join(REFS, '2.webp')).toString('base64')}" x="0" y="0" width="600" height="800" opacity="0.6"/>` : '<rect width="600" height="800" fill="#EDEDE8"/>';
  s += `<ellipse cx="${C[0]}" cy="${C[1]}" rx="${A}" ry="${B}" fill="none" stroke="#0A0A0C" stroke-width="1.2"/>`;
  s += `<polyline points="${ENV.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#7A7A72" stroke-width="1.5" stroke-dasharray="2 5"/>`;
  for (const sg of [1, -1]) s += `<polyline points="${target.filter((_, i) => i % 3 === 0).map((p) => { const { p: q, n } = atFrac(p.t), x = q[0] + n[0] * p.e * MPX, y = q[1] + n[1] * p.e * MPX; return `${(sg > 0 ? x : 600 - x).toFixed(1)},${y.toFixed(1)}`; }).join(' ')}" fill="none" stroke="#c33" stroke-width="2" stroke-dasharray="6 3"/>`;
  return s;
};
const page = async (svg, file, w, h) => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: w, height: h } }); await pg.setContent(`<body style="margin:0">${svg}</body>`); await pg.screenshot({ path: file }); await b.close(); };
const both = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 380}" height="500"><rect width="${W + 380}" height="500" fill="#EDEDE8"/><g transform="translate(0,75)">${chart.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g><g transform="translate(${W + 10},0) scale(0.6)">${overParts(false)}</g><text x="${W + 14}" y="492" font-family="monospace" font-size="10">R2's molding, traced envelope (grey), the composed target (red)</text></svg>`;
await page(both, OUT, W + 380, 500);
if (REFS) { const photo = OUT.replace(/\.png$/, '-photo.png'); await page(`${over}${overParts(true)}</svg>`, photo, 600, 800); console.log(`wrote ${photo} (not for committing)`); }
// the numbers, for the study's §9
const sample = (arr, t) => { let b = arr[0]; for (const p of arr) if (Math.abs(p.t - t) < Math.abs(b.t - t)) b = p; return b.e; };
console.log('t      R2 traced   target   built');
for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) console.log(`${t.toFixed(1)}    ${sample(r2, t).toFixed(2).padStart(6)}   ${sample(target, t).toFixed(2).padStart(6)}   ${sample(built, t).toFixed(2).padStart(6)}`);
console.log(`wrote ${OUT}`);
