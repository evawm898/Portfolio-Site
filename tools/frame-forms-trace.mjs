/* frame-forms-trace.mjs — the flow study's round 4: six elements of the bronze oval (R2, 2.webp, 600 × 800 px)
   TRACED by eye on 7–9× crops gridded every 5 px, and their measured profiles (docs/frame-flow-grammar.md §9).

     node tools/frame-forms-trace.mjs [--json] [--png <file>] [--refs <dir with 2.webp>]

   The centrelines are data, in the photograph's own pixels (± 2 px ≈ ± 0.05 M). Each is smoothed (three Chaikin
   passes), resampled every 0.5 px, and measured: its length in M (M = 38 px, the band on the flank — grammar §0),
   its turn (the heading's change over 2π), and its CURVATURE PROFILE κ·M at eleven stations (0, 0.1 … 1 of its
   length, smoothed over ± 4 px). The WIDTHS are read by eye off the crops (a threshold transect reads the
   bronze's highlights as gaps and its shadows as metal — measured, so the widths are a reading, stated as one).

   --png draws the traces as line art (the centrelines, their widths as offset strokes, the eyes) — no photograph;
   --refs lays them over the photograph into the output directory instead, which is NOT committed (a stock image). */
import fs from 'node:fs';
import path from 'node:path';

const M = 38;
export const TRACE = {
  E1: { name: 'the shoulder C-scroll (root at the waist → volute toward the crest)', at: 'arc 0.09–0.19 of the half, crown 0.84 M out',
    pts: [[168, 186], [166, 170], [169, 153], [176, 140], [187, 130], [200, 125], [213, 124], [225, 127], [235, 134], [239, 144], [236, 152], [229, 155], [225, 149], [229, 144], [233, 146]],
    width: { root: 0.45, crown: 0.47, entry: 0.37 }, end: 'volute: outer Ø 0.75 M, ≈ 1.05 turns, a ball eye Ø 0.16 M in a dark ring', tail: 'its root curls the same way into a small volute (outer Ø 0.5 M) inside the arch', leaves: 'a pointed TONGUE (0.5 × 0.26 M) hangs from the crown on the inner side' },
  E2: { name: 'the crest C-scroll (from under the shell → volute facing the shell)', at: 'arc 0.05, eye 0.97 M out',
    pts: [[280, 113], [264, 110], [248, 109], [235, 105], [228, 97], [230, 88], [239, 83], [249, 86], [252, 94], [247, 98], [244, 94]],
    width: { root: 0.32, crown: 0.3, entry: 0.26 }, end: 'volute: outer Ø 0.55 M, ≈ 0.9 turn, a ball eye Ø 0.15 M', tail: 'none — its root runs under the shell', leaves: 'none' },
  E3: { name: 'the foot (a reeded strap from under the bottom shell, curling under)', at: 'arc 0.88, eye 2.3 M out',
    pts: [[215, 725], [195, 721], [176, 719], [160, 722], [149, 731], [145, 743], [150, 754], [161, 759], [170, 754], [170, 745], [163, 741], [158, 745]],
    width: { root: 0.53, crown: 0.53, entry: 0.4 }, end: 'a CLOSED curl: outer Ø 0.8–0.9 M round a dark hollow Ø 0.4–0.5 M, ≈ 0.9 turn', tail: 'none', leaves: 'five reeds (≈ 0.1 M each) run its length' },
  E4: { name: 'the node (the lower stem rolled over outward)', at: 'arc 0.63, 1.26 M out',
    pts: [[88, 440], [84, 470], [80, 492], [72, 505], [60, 510], [49, 517], [45, 528], [49, 538], [58, 540], [63, 533], [59, 526]],
    width: { root: 0.55, crown: 0.55, entry: 0.5 }, end: 'a ROLL: outer Ø 0.95 M round a hollow Ø 0.18 M, ≈ 0.75 turn — a curl of near-constant radius, not a spiral', tail: 'none', leaves: 'the flank flames spring from the frame just above it (arc 0.55)' },
  E5: { name: 'a flank flame (a reeded acanthus, its tip rolled out)', at: 'roots arc 0.55, tips arc 0.37 at 1.45 M out',
    pts: [[100, 440], [92, 400], [82, 370], [68, 345], [54, 328], [42, 312], [36, 302], [40, 295], [47, 297], [49, 304]],
    width: { root: 0.35, crown: 0.75, entry: 0.45 }, end: 'a HOOK: outer Ø 0.6 M, the hollow open (≈ 0.3 M), ≈ 0.6 turn', tail: 'none', leaves: '3–4 reeds converging at the root; 2–3 lobes stepped down the OUTER edge in the last 40 %' },
  E6: { name: 'the crest shell (a cupped fan)', at: 'base on the axis at the molding, rim 1.8 M',
    pts: [[300, 92], [300, 24]],
    width: { root: 0.3, crown: 2.4, entry: 2.4 }, end: 'five broad LOBES (≈ 0.47 M at the rim, touching — a scalloped rim), each tip rolled; ≈ 22 fine flutes (pitch ≈ 0.08 M) radiating from the base; the lobes span ± 58°', tail: 'two small volutes at its base', leaves: 'the crest C-scrolls pour out from under its lower lobes' },
};

export function measure(pts) {
  let P = pts.map((q) => q.slice());
  for (let pass = 0; pass < 3; pass++) { const Q = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1]; Q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } Q.push(P[P.length - 1]); P = Q; }
  const u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = u[u.length - 1], step = 0.5, n = Math.floor(L / step), S = [];
  let k = 0; for (let i = 0; i <= n; i++) { const w = i * step; while (k < P.length - 2 && u[k + 1] < w) k++; const t = (w - u[k]) / Math.max(1e-9, u[k + 1] - u[k]); S.push([P[k][0] + t * (P[k + 1][0] - P[k][0]), P[k][1] + t * (P[k + 1][1] - P[k][1])]); }
  const h = S.map((_, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
  for (let i = 1; i < h.length; i++) { while (h[i] - h[i - 1] > Math.PI) h[i] -= 2 * Math.PI; while (h[i] - h[i - 1] < -Math.PI) h[i] += 2 * Math.PI; }
  const W = 8;   // ± 4 px
  const kap = h.map((_, i) => { const a = Math.max(0, i - W), b = Math.min(h.length - 1, i + W); return (h[b] - h[a]) / ((b - a) * step); });
  const prof = []; for (let q = 0; q <= 10; q++) prof.push(Math.abs(kap[Math.round(q / 10 * (kap.length - 1))]) * M);
  return { L: L / M, turns: Math.abs(h[h.length - 1] - h[0]) / (2 * Math.PI), prof, S };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const out = {};
  for (const [id, e] of Object.entries(TRACE)) {
    if (id === 'E6') { out[id] = { name: e.name, rimM: Math.hypot(e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]) / M, ...e }; continue; }
    const r = measure(e.pts);
    out[id] = { name: e.name, L: r.L, turns: r.turns, kappaM: r.prof, width: e.width, end: e.end };
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, (k, v) => (k === 'pts' || k === 'S' ? undefined : typeof v === 'number' ? +v.toFixed(2) : v), 1));
  else for (const [id, o] of Object.entries(out)) {
    if (id === 'E6') { console.log(`${id} ${o.name}: rim ${o.rimM.toFixed(2)} M — ${o.end}`); continue; }
    console.log(`${id} ${o.name}\n   length ${o.L.toFixed(2)} M · turns ${o.turns.toFixed(2)} · κ·M at 0, 0.1 … 1: ${o.kappaM.map((v) => v.toFixed(2)).join(' ')}\n   width (M, by eye) root ${o.width.root} · crown ${o.width.crown} · entering its end ${o.width.entry} — ${o.end}`);
  }
  const pngArg = process.argv.indexOf('--png'), refsArg = process.argv.indexOf('--refs');
  if (pngArg > 0 || refsArg > 0) {
    const { chromium } = await import('playwright-core');
    const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 600, height: 800 } });
    const ref = refsArg > 0 ? fs.readFileSync(path.join(process.argv[refsArg + 1], '2.webp')).toString('base64') : null;
    const traces = Object.fromEntries(Object.entries(TRACE).map(([id, e]) => [id, { pts: id === 'E6' ? e.pts : measure(e.pts).S, w: e.width, name: e.name }]));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">${ref ? `<image href="data:image/webp;base64,${ref}" width="600" height="800" opacity="0.55"/>` : '<rect width="600" height="800" fill="#fff"/>'}
      <ellipse cx="300" cy="413" rx="215" ry="287" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4 3"/>
      ${Object.entries(traces).map(([id, t]) => id === 'E6' ? `<circle cx="300" cy="92" r="68" fill="none" stroke="#c33" stroke-width="1.5" stroke-dasharray="3 2"/><text x="335" y="20" font-size="13" fill="#c33" font-family="monospace">${id}</text>`
        : `<polyline points="${t.pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#2a5d9f" stroke-opacity="0.35" stroke-width="${(t.w.crown * M).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${t.pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#c33" stroke-width="1.5"/><text x="${t.pts[0][0] + 6}" y="${t.pts[0][1] + 4}" font-size="13" fill="#c33" font-family="monospace">${id}</text>`).join('')}
    </svg>`;
    await p.setContent(`<body style="margin:0">${svg}</body>`);
    const file = pngArg > 0 ? process.argv[pngArg + 1] : path.join(process.argv[refsArg + 1], 'frame-forms-trace-over-2.png');
    await p.screenshot({ path: file }); await b.close(); console.log('wrote', file);
  }
}
