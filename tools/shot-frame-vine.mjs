#!/usr/bin/env node
/* shot-frame-vine.mjs <dir> [--refs <dir>] [--quick] — phase 3e step 3's
   contact sheet: the VINE and its scale hierarchy, for Eva's ruling.
     - all three skeletons at the default and dense (density 5, every run),
       at hierarchy 0 (phase 3d's chains), ½ and 1 (the default) — the
       page's own 3D view of the STL, one pinned camera per row;
     - the weight field w(s) of each skeleton, plotted from the crest along
       the right half (frame-vine's weightProfile, the law the gate restates),
       at hierarchy 1 and ½, the class bands drawn and every item the default
       build placed marked at its station;
     - close cameras on the crest, a corner / springing / the oval's side,
       and a mid-run stretch;
     - the band pattern (beading, leaf tips) on and off under the vine;
     - Eva's references 2, 3 and 4 beside it when --refs names the directory
       holding 2.png / 3.png / 4.png (the photographs are not in the
       repository).
   No pixel claim anywhere: for ruling by eye. Writes <dir>/index.html and
   <dir>/frame-vine-sheet.png. --quick: one skeleton row only (iteration). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-vine-sheet');
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });

// ---- the weight plots, in Node off the shipped modules ----
const G = await import(pathToFileURL(path.join(ROOT, 'frame-geometry.js')).href);
const FL = await import(pathToFileURL(path.join(ROOT, 'frame-filigree.js')).href);
const V = await import(pathToFileURL(path.join(ROOT, 'frame-vine.js')).href);
const SK = [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]];
const ALLRUNS = { filigree: 'scrolls', ornSides: 'on', ornBottom: 'on' };
const plot = (sk, q) => {
  const model = G.buildFrame({ ...q, ...ALLRUNS });
  const prof1 = V.weightProfile(model, 1), profH = V.weightProfile(model, 0.5);
  const built = FL.withOrnament(G.buildFrame({ ...q, ...ALLRUNS })).ornament;
  const Wd = 520, Ht = 170, pad = 30, X = (s) => pad + (Wd - 2 * pad) * s / prof1.total, Y = (w) => Ht - pad - (Ht - 2 * pad) * w;
  const line = (samples, key, col) => `<polyline fill="none" stroke="${col}" stroke-width="1.6" points="${samples.map((a) => `${X(a.s).toFixed(1)},${Y(a[key]).toFixed(1)}`).join(' ')}"/>`;
  const bands = [[V.HIER.heavy, 1.05, 'heavy'], [V.HIER.medium, V.HIER.heavy, 'medium'], [0, V.HIER.medium, 'light']].map(([a, b, l], i) => `<rect x="${pad}" y="${Y(b).toFixed(1)}" width="${Wd - 2 * pad}" height="${(Y(a) - Y(b)).toFixed(1)}" fill="${['#2a3a3a', '#202a2a', '#16191a'][i]}"/><text x="${Wd - pad + 3}" y="${((Y(a) + Y(b)) / 2 + 3).toFixed(1)}" fill="#8A8A85" font-size="9">${l}</text>`).join('');
  const ticks = prof1.runs.flatMap((r, i) => [i === 0 ? [r.s0, r.from, r.classFrom] : null, [r.s0 + r.L, r.to, r.classTo]]).filter(Boolean).map(([s, id, cls]) => `<line x1="${X(s)}" x2="${X(s)}" y1="${pad - 4}" y2="${Ht - pad}" stroke="#5FA0A0" stroke-dasharray="2,3"/><text x="${X(s) + 2}" y="${pad - 8}" fill="#5FA0A0" font-size="9">${id} (${cls})</text>`).join('');
  const off = new Map(); for (const r of prof1.runs) off.set(r.id, r.s0);
  const marks = (built.items || []).map((it) => `<circle cx="${X(off.get(it.run) + it.x).toFixed(1)}" cy="${Y(it.w).toFixed(1)}" r="2.6" fill="${{ cluster: '#EDEDE8', rosette: '#d6a15c', leaf: '#6fb7ae', bud: '#b07fc0', sprig: '#7a7a74' }[it.kind]}"><title>${it.kind}</title></circle>`).join('');
  const motifs = (built.motifs || []).map((m) => { const r = prof1.runs.find((q2) => q2.from === m.anchor || q2.to === m.anchor); const s = r.from === m.anchor ? r.s0 : r.s0 + r.L; return `<text x="${X(s) - 6}" y="${Y(m.w) - 5}" fill="#EDEDE8" font-size="10">${m.kind}</text><rect x="${X(s) - 3}" y="${Y(m.w) - 3}" width="6" height="6" fill="#EDEDE8"/>`; }).join('');
  return `<svg width="${Wd + 40}" height="${Ht}" style="background:#0A0A0C">${bands}${ticks}${line(profH.samples, 'wh', '#8A8A85')}${line(prof1.samples, 'wh', '#EDEDE8')}${marks}${motifs}<text x="${pad}" y="${Ht - 8}" fill="#8A8A85" font-size="9">s (mm from the crest, right half) → ${prof1.total.toFixed(0)} · white w_h at hierarchy 1, grey at ½ · dots: items placed (white cluster, amber rosette, teal leaf, violet bud, grey sprig) · squares: junction motifs</text></svg>`;
};
const plots = SK.map(([sk, q]) => ({ sk, svg: plot(sk, q) }));

// ---- the renders, through the page ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });

const FRONT = { dir: [0, 0, 1], radius: 300 }, THREEQ = { dir: [0.45, 0.3, 1], radius: 360 };
const ON = { filigree: 'scrolls' };
const DENSE = { filigree: 'scrolls', ornDensity: 5, ornCrest: 'on', ornCorners: 'on', ornSides: 'on', ornBottom: 'on' };
const at = (anchor, dir, radius) => ({ anchor, dir, radius });
const HS = [[0, 'hierarchy 0 — phase 3d\'s chains'], [0.5, 'hierarchy ½'], [1, 'hierarchy 1 (default)']];
const skRows = QUICK ? SK.slice(0, 1) : SK;
const cells = [
  ...skRows.flatMap(([sk, q]) => [['default', ON], ['dense', DENSE]].map(([l, o]) => HS.map(([h, hl]) => ({ row: `${sk} — ${l}, front`, label: `${sk} · ${l} · ${hl}`, params: { ...q, ...o, ornHierarchy: h }, cam: FRONT }))).flat()),
  ...skRows.map(([sk, q]) => ({ row: 'the default, three-quarter', label: `${sk} · default`, params: { ...q, ...ON }, cam: THREEQ })),
  { row: 'close: the crest (the heaviest point)', label: 'arch apex · default', params: { ...ON }, cam: at('apex', [0.2, 0.3, 1], 75) },
  { row: 'close: the crest (the heaviest point)', label: 'rectangle top centre · default', params: { skeleton: 'rect', ...ON }, cam: at('topCentre', [0.2, 0.3, 1], 75) },
  { row: 'close: the crest (the heaviest point)', label: 'oval top · default', params: { skeleton: 'oval', ...ON }, cam: at('topCentre', [0.2, 0.3, 1], 75) },
  { row: 'close: a secondary peak (corner, springing, the oval\'s side)', label: 'rectangle top-right corner · default', params: { skeleton: 'rect', ...ON }, cam: at('cornerTR', [0.3, 0.25, 1], 75) },
  { row: 'close: a secondary peak (corner, springing, the oval\'s side)', label: 'arch right springing · default', params: { ...ON }, cam: at('springR', [0.3, 0.25, 1], 75) },
  { row: 'close: a secondary peak (corner, springing, the oval\'s side)', label: 'oval right side · bottom on', params: { skeleton: 'oval', ...ON, ornBottom: 'on' }, cam: at('sideR', [0.3, 0.25, 1], 75) },
  { row: 'close: mid-run (the lightest stretch)', label: 'arch jamb middle · default', params: { ...ON }, cam: at('sideR', [0.3, 0.3, 1], 60) },
  { row: 'close: mid-run (the lightest stretch)', label: 'rectangle side middle · default', params: { skeleton: 'rect', ...ON }, cam: at('sideR', [0.3, 0.3, 1], 60) },
  { row: 'close: mid-run (the lightest stretch)', label: 'rectangle side middle · hierarchy ½', params: { skeleton: 'rect', ...ON, ornHierarchy: 0.5 }, cam: at('sideR', [0.3, 0.3, 1], 60) },
  { row: 'band pattern off / on under the vine', label: 'rectangle corner · no pattern', params: { skeleton: 'rect', ...ON }, cam: at('cornerTR', [0.3, 0.25, 1], 90) },
  { row: 'band pattern off / on under the vine', label: 'rectangle corner · beading (sight edge)', params: { skeleton: 'rect', ...ON, bandPattern: 'beading' }, cam: at('cornerTR', [0.3, 0.25, 1], 90) },
  { row: 'band pattern off / on under the vine', label: 'rectangle corner · leaf tips (both edges)', params: { skeleton: 'rect', ...ON, bandPattern: 'leaf-tips', bandEdge: 'both' }, cam: at('cornerTR', [0.3, 0.25, 1], 90) },
  ...skRows.map(([sk, q]) => ({ row: 'the engraving (SVG) — the default vine', label: `${sk}`, params: { ...q, ...ON }, svg: true })),
];

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  let png = null;
  if (c.svg) {
    await page.evaluate(() => window.__frame.setView('svg'));
    await page.waitForTimeout(150);
    png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } });
    await page.evaluate(() => window.__frame.setView('3d'));
    await page.waitForFunction(() => window.__frame.view3dInk() !== null, null, { timeout: 60000 });
  } else {
    let cam = c.cam;
    if (cam.anchor) {
      const { pt, scale, plateT } = await page.evaluate((id) => { const m = window.__frame.model(); const s = window.__frame.stl().info; return { pt: m.info.anchors[id].pt, scale: s.scale, plateT: s.plateT }; }, cam.anchor);
      cam = { dir: cam.dir, radius: cam.radius, target: [pt[0] * scale, pt[1] * scale, plateT] };
    }
    await page.evaluate((v) => window.__frame.pinCamera(v), cam);
    await page.waitForTimeout(150);
    let prev = null;
    for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 900 } }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  }
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: [lines[0].replace(/ · floor:.*/, ''), lines.find((l) => /^ornament/.test(l)) || ''].join(' · ') });
}
await page.evaluate(() => window.__frame.pinCamera(null));

const rows = [...new Set(out.map((c) => c.row))];
const refs = REFS ? `<h2>Eva's references 2, 3, 4</h2><div class="row">${['2', '3', '4'].map((n) => { const f = path.join(REFS, n + '.png'); return fs.existsSync(f) ? `<div class="cell"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><div class="cap"><b>ref ${n}</b></div></div>` : ''; }).join('')}</div>` : '<h2>references 2, 3, 4 — not in the repository: hold the sheet beside them</h2>';
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3e step 3: the vine</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:250px}.cell img{width:250px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3e step 3: the elements wired in — a continuous vine with a scale hierarchy</h1><div>the STL's own positions under the one fixed light; the engraving is the SVG the button saves. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${refs}<h2>the weight field w(s), from the crest along the right half (every run on)</h2><div class="row">${plots.map((p) => `<div><div class="cap"><b>${p.sk}</b></div>${p.svg}</div>`).join('')}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-vine-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-vine-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
