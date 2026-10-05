/* bug-wing-angles-review.mjs — the WING-ANGLE review page (design doc §14),
   called by `node tools/bug-wing-angles.mjs review [--out <dir>]` after
   `measure` and `sweep`. Writes <out>/review.html, one self-contained file:

     1. the groups — shapes that are the same wing at different angles: each
        group's forewings and hindwings overlaid ALIGNED (turned onto their
        own axes), one colour each, with their angles;
     2. the near pairs — the closest shapes that are not a group, the same way;
     3. every shape: its bug's top-down SVG with the measured fore / hind angle
        drawn as lines from each hinge (on the SOURCE CROP when the gitignored
        sheets are present — they were not, this session: said on the page);
     4. the angle ladder: three shapes at -20, -10, 0, +10, +20 deg from their
        measured angles (both pairs turned), the SVG, the 3D 3/4 view and a
        close-up of the root, rendered by the real page.
   Every number is read off the model or the measurement JSON. */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import * as G from '../bug-geometry.js';
let canonicalDense, posedShape;   // handed over by bug-wing-angles.mjs (importing it back would be a cycle)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LADDER = [5, 13, 31];
export const RUNGS = [-20, -10, 0, 10, 20];
const COLORS = ['#c0287a', '#2a6fdb', '#1a9a5c', '#d98a00', '#7a3cc0', '#00838f'];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function overlay(ids, which, size = 360) {
  const lib = G.WING_LIBRARY.map(posedShape), sets = ids.map((id) => { const s = lib.find((x) => x.id === id), w = s[which]; return canonicalDense(w.points, w.stretch, G.wingAngleOf(w.points, w.stretch), which === 'hind' ? s.tail : null, 400); });
  // align each to the first (the same residual search the measure uses, 0.25 deg)
  const rot = (P, d) => { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return P.map(([u, b]) => [u * c + b * s, -u * s + b * c]); };
  const H = (A, B) => { const one = (X, Y) => { let m = 0; for (const p of X) { let d = Infinity; for (const q of Y) d = Math.min(d, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2); m = Math.max(m, d); } return m; }; return Math.sqrt(Math.max(one(A, B), one(B, A))); };
  const al = sets.map((P, i) => { if (!i) return P; let best = [Infinity, 0]; for (let d = -12; d <= 12; d += 0.25) { const h = H(sets[0], rot(P, d)); if (h < best[0]) best = [h, d]; } return rot(P, best[1]); });
  // full outlines (root zone included) for the drawing, turned the same way
  const full = ids.map((id, i) => { const s = lib.find((x) => x.id === id), w = s[which]; const a = G.wingAngleOf(w.points, w.stretch); const comp = which === 'hind' && s.tail ? G.composeOutline(w.points, { ...s.tail, on: true }).points : w.points; const d = G.sampleOutline(comp).map(([u, ww]) => [u, ww * w.stretch]); return rot(d, -a); });
  let x0 = 0, x1 = 1, y0 = -0.5, y1 = 0.5; for (const P of full) for (const [u, b] of P) { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  const m = 0.05, W = x1 - x0 + 2 * m, Hh = y1 - y0 + 2 * m, sc = size / Math.max(W, Hh);
  const pt = ([u, b]) => `${((u - x0 + m) * sc).toFixed(1)},${((y1 - b + m) * sc).toFixed(1)}`;
  const paths = full.map((P, i) => `<polyline fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="1.6" points="${P.map(pt).join(' ')}"/>`).join('');
  return `<svg width="${(W * sc).toFixed(0)}" height="${(Hh * sc).toFixed(0)}" style="background:#fff;border:1px solid #ddd"><line x1="${pt([0, 0]).split(',')[0]}" y1="${pt([0, 0]).split(',')[1]}" x2="${pt([1.1, 0]).split(',')[0]}" y2="${pt([1.1, 0]).split(',')[1]}" stroke="#999" stroke-dasharray="4 3"/>${paths}</svg>`;
}

/* the bug's top-down SVG with the angle lines from both hinges */
function svgWithAngles(params) {
  const m = G.buildBug(params), E = G.exportSvg(m);
  let add = '';
  for (const k of [0, 1].filter((k) => k < params.wingPairs)) {
    const F = G.editorFrame(params, k), W = k === 0 ? params.wings.first : params.wings.last, a = G.wingAngleOf(W.points, W.stretch) * Math.PI / 180;
    const L = F.length * 1.05, h = F.hinge, tip = [h[0] + L * Math.cos(a), h[1] - L * Math.sin(a)], col = k ? '#2a6fdb' : '#c0287a';
    for (const sx of [1, -1]) {
      const [X0, Y0] = G.svgFromWorld(E.frame, sx * h[0], h[1]), [X1, Y1] = G.svgFromWorld(E.frame, sx * tip[0], tip[1]);
      add += `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y1}" stroke="${col}" stroke-width="0.5"/><circle cx="${X0}" cy="${Y0}" r="0.7" fill="${col}"/>`;
    }
    // the span direction (0 deg), dashed, right side only
    const [X0, Y0] = G.svgFromWorld(E.frame, h[0], h[1]), [X2, Y2] = G.svgFromWorld(E.frame, h[0] + L, h[1]);
    add += `<line x1="${X0}" y1="${Y0}" x2="${X2}" y2="${Y2}" stroke="#888" stroke-width="0.3" stroke-dasharray="1.5 1"/>`;
  }
  return E.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"').replace('</svg>', add + '</svg>');
}

function rung(s, off) {
  // each wing turned by `off`, CLAMPED to its own measured range (said on the rung)
  const p = G.applyWingShape(G.defaultParams(), s), clamps = [];
  for (const [which, w, tailOk] of [['first', s.fore, false], ['last', s.hind, true]]) {
    const R = w.range || [-20, 20], o = Math.max(R[0], Math.min(R[1], off));
    if (o !== off) clamps.push(`${which === 'first' ? 'fore' : 'hind'} clamped at ${o > 0 ? '+' : ''}${o}°`);
    const W = p.wings[which], r = G.setWingAngle(W.points, W.stretch, G.wingAngleOf(W.points, W.stretch) + o, tailOk && s.tail ? p.wings.tail : null);
    if (!r.ok) return { ok: false, reason: `${which}: ${r.reason}` };
    W.points = r.points; W.stretch = r.stretch; if (r.tail) p.wings.tail = r.tail;
  }
  return { ok: true, params: p, clamps };
}

async function renders(jobs) {
  // the real page: 3D 3/4 and a root close-up per job
  const { chromium } = await import('playwright-core');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**cdn.jsdelivr.net/**', (route) => { const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', ''); try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); } });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort()); await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/bug.html`);
  await page.waitForFunction(() => !!window.__bug);
  await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });
  const png = async () => (await page.screenshot({ type: 'png' })).toString('base64');
  for (const j of jobs) {
    await page.evaluate((q) => window.__bug.setParams(q), j.params); await page.evaluate(() => window.__bug.flushBuild());
    await page.evaluate(() => window.__bug.setView('three')); await page.waitForTimeout(150);
    j.three = await png();
    // the right forewing's root, from above-front-outside, 14 mm off
    const F = G.editorFrame(j.params, 0), h = F.hinge;
    await page.evaluate((t) => window.__bug.lookAt(t, [0.55, 0.35, 0.9], 16), [h[0] + 3, h[1] - 2, 0]); await page.waitForTimeout(100);
    j.root = await png();
  }
  await browser.close(); server.close();
  return errors;
}

export async function review(OUT, helpers) {
  ({ canonicalDense, posedShape } = helpers);
  const A = JSON.parse(fs.readFileSync(path.join(OUT, 'angles.json'), 'utf8'));
  const SW = fs.existsSync(path.join(OUT, 'sweep.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'sweep.json'), 'utf8')) : null;
  const sheets = fs.existsSync(path.join(ROOT, 'tools/bug-wing-sources')) && fs.readdirSync(path.join(ROOT, 'tools/bug-wing-sources')).filter((f) => /^sheet-\d/.test(f));
  const mm = (f) => (f * 41).toFixed(2);
  const pairOf = (a, b) => A.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  let html = `<!doctype html><meta charset="utf-8"><title>Wing angles — review</title><style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;max-width:1500px;color:#222}h2{margin-top:2.2em;border-bottom:2px solid #333}
.g{border:1px solid #ccc;padding:12px;margin:14px 0;border-radius:6px}.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.sh{width:460px;border:1px solid #ddd;padding:8px;border-radius:4px}.sh svg{width:100%;height:auto;background:#fff}
.cap{font-size:12px;color:#444}.k{display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:4px}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 7px;font-size:13px}img{max-width:100%;cursor:zoom-in}
.lad{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.lad>div{border:1px solid #ddd;padding:4px}.bad{color:#b00020;font-weight:600}
img.z,svg.z{position:fixed;inset:2vh 2vw;width:96vw;height:96vh;object-fit:contain;background:#fff;z-index:9;border:2px solid #333;cursor:zoom-out}
</style><script>addEventListener('click',e=>{const t=e.target.closest('img,.sh svg,.lad svg');if(t)t.classList.toggle('z')})</script>
<h1>Wing angles — the library's presets at the angle they were found</h1>
<p><b>Angle convention</b> (one for every wing): ${esc(A.convention)}. <b>Same shape</b>: once both wings are turned onto their own axes, the forewings AND the hindwings are each within ${mm(A.sameBar)} mm (the library's dedupe bar, 3% of the 72 mm wingspan, at the default 41 mm wing), the root zone (r &lt; ${A.rootZone} of the length) left out. <b>Near</b>: within ${mm(A.nearBar)} mm. Distances are in units of each wing's own length, shown in mm at a 41 mm wing. Click any picture to zoom.</p>
<p class="bad">${sheets && sheets.length ? `Source sheets present: ${sheets.join(', ')}.` : 'The source sheets are NOT in tools/bug-wing-sources/ in this session (they arrived as pictures in the chat, not as files), so section 3 draws each angle on the fitted bug only — the check against the source picture is not done.'}</p>`;

  // 1. groups
  html += `<h2>1. Same shape, different angle — ${A.groups.length} group(s)</h2>`;
  for (const g of A.groups) {
    const rows = []; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const p = pairOf(g[i], g[j]); rows.push(`<tr><td>#${p.a} ~ #${p.b}</td><td>${mm(p.fore)} (${mm(p.foreRaw)})</td><td>${mm(p.hind)} (${mm(p.hindRaw)})</td><td>${p.dFore}°</td><td>${p.dHind}°</td><td>×${p.ratio}</td></tr>`); }
    html += `<div class="g"><b>${g.map((id) => `#${id}`).join(' · ')}</b> — ${g.map((id, i) => { const s = A.shapes.find((x) => x.id === id); return `<span class="k" style="background:${COLORS[i]}"></span>#${id}: fore ${s.fore}°, hind ${s.hind}°`; }).join(' &nbsp; ')}
<div class="row"><div><div class="cap">forewings, aligned on their own axes (dashed: the axis)</div>${overlay(g, 'fore')}</div><div><div class="cap">hindwings, aligned</div>${overlay(g, 'hind')}</div></div>
<table><tr><th>pair</th><th>fore mm aligned (as drawn)</th><th>hind mm aligned (as drawn)</th><th>Δ fore angle</th><th>Δ hind angle</th><th>hind length ratio</th></tr>${rows.join('')}</table></div>`;
  }
  // 2. near pairs: the closest 16 by the larger of the two aligned distances, and how much of the drawn difference the angle explains
  const near = A.pairs.filter((p) => !A.groups.some((g) => g.includes(p.a) && g.includes(p.b))).sort((x, y) => Math.max(x.fore, x.hind) - Math.max(y.fore, y.hind)).slice(0, 16);
  html += `<h2>2. Near pairs — the 16 closest that are not a group</h2><p>"as drawn" is the same distance with the wings left at the angles they were found at; where it is much larger than "aligned", the two differ mostly BY ANGLE.</p>`;
  for (const p of near) html += `<div class="g"><b>#${p.a} ~ #${p.b}</b> — fore ${mm(p.fore)} mm aligned (${mm(p.foreRaw)} as drawn), Δ ${p.dFore}° · hind ${mm(p.hind)} mm aligned (${mm(p.hindRaw)} as drawn), Δ ${p.dHind}° · hind length ×${p.ratio}<div class="row"><div>${overlay([p.a, p.b], 'fore', 300)}</div><div>${overlay([p.a, p.b], 'hind', 300)}</div></div></div>`;

  // 3. every shape
  html += `<h2>3. Every shape — the measured angles from the hinges (fore magenta, hind blue; dashed grey: 0°, the span square to the body)</h2><div class="row">`;
  for (const s of G.WING_LIBRARY) {
    const p = G.applyWingShape(G.defaultParams(), s), a = A.shapes.find((x) => x.id === s.id);
    const sw = SW ? SW.result.filter((r) => r.id === s.id) : [], swBad = sw.filter((r) => !r.ok), ref = SW ? SW.refused.filter((r) => r.id === s.id) : [];
    html += `<div class="sh"><b>#${s.id}</b> <span class="cap">${esc(s.source)}</span> — fore <b>${a.fore}°</b>, hind <b>${a.hind}°</b><br>${svgWithAngles(p)}<div class="cap">${SW ? `±20° sweep: ${sw.length - swBad.length}/${sw.length} built rows pass${swBad.length ? ` — <span class="bad">${swBad.map((r) => `${r.which} ${r.d > 0 ? '+' : ''}${r.d}: ${esc(r.why[0] || '')}`).join('; ')}</span>` : ''}${ref.length ? ` — <span class="bad">refused: ${ref.map((r) => `${r.which} ${r.d > 0 ? '+' : ''}${r.d} (${esc(r.reason)})`).join('; ')}</span>` : ''}` : ''}</div></div>`;
  }
  html += '</div>';

  // 4. the ladder
  const jobs = [];
  for (const id of LADDER) for (const off of RUNGS) { const s = G.WING_LIBRARY.find((x) => x.id === id), r = rung(s, off); jobs.push({ id, off, ...r }); }
  const errors = await renders(jobs.filter((j) => j.ok));
  html += `<h2>4. The angle ladder — both pairs turned together, ${RUNGS.join(', ')}° from the measured angles</h2><p>Each wing is turned by the rung's offset, clamped to its own measured range (the clamp is printed). Each rung: the SVG with the angle lines, the page's 3D 3/4 view, and a close-up of the right forewing's root (the bridge from the root chord, square to the body, to the turned blade). Page errors while rendering: ${errors.length ? esc(errors.join(' | ')) : 'none'}.</p>`;
  for (const id of LADDER) {
    const a = A.shapes.find((x) => x.id === id);
    const sh = G.WING_LIBRARY.find((x) => x.id === id);
    html += `<div class="g"><b>#${id}</b> — found at fore ${a.fore}°, hind ${a.hind}° · measured range fore ${sh.fore.range.join('..')}°, hind ${sh.hind.range.join('..')}°<div class="lad">`;
    for (const j of jobs.filter((q) => q.id === id)) {
      if (!j.ok) { html += `<div><b>${j.off > 0 ? '+' : ''}${j.off}°</b><p class="bad">refused: ${esc(j.reason)}</p></div>`; continue; }
      const W = j.params.wings;
      html += `<div><b>${j.off > 0 ? '+' : ''}${j.off}°</b> <span class="cap">fore ${G.wingAngleOf(W.first.points, W.first.stretch).toFixed(1)}°, hind ${G.wingAngleOf(W.last.points, W.last.stretch).toFixed(1)}°${j.clamps.length ? ` — <span class="bad">${j.clamps.join(', ')}</span>` : ''}</span>${svgWithAngles(j.params)}<img src="data:image/png;base64,${j.three}"><img src="data:image/png;base64,${j.root}"></div>`;
    }
    html += '</div></div>';
  }
  fs.writeFileSync(path.join(OUT, 'review.html'), html);
  console.log(`review: ${path.join(OUT, 'review.html')} (${(fs.statSync(path.join(OUT, 'review.html')).size / 1e6).toFixed(1)} MB)`);
}
