/* ===================================================================
   THE ORGANS' RELIEF SHEET (surface texture T5 — docs/bloom-surface-texture-
   t5-outcome.md; folds in the plan's T6, "the sheet on the shipped
   generator"). Four close-ups, each UNTEXTURED against PEBBLE at the 0.4 mm
   floor and at the 1.5 mm maximum, on ONE camera per row:
     (1) THE HUB'S TOP — the relief over the visible top, smooth under the feet
         (Q7), a 60 mm stem beneath.
     (2) THE STEM — the wall, the stem relieved in its own frame.
     (3) THE LEAF-STEM JOIN at leafAngle 70 — the blade and the wall both
         relieved; the caption carries the EMITTED clearance (the leaf blade's
         vertices against the stem's own relieved triangles), measured here in
         Node on the same state.
     (4) THE TUBE RING — a closed ring on 6 petals (k 0), refined on its own
         lattice; the ring under the petals stays smooth, the sinuses show.
   EVERY CANVAS CELL: PRINT PREVIEW ON (read back from the app's own
   shownMode), chrome hidden, auto-rotate off through stillFrame(), the whole
   state read back, the TX family (TX10 / TX11 included) run before the
   shutter, the STL exported, watertight and free of degenerate triangles, its
   sha in the caption. No pixel delta is quoted (this renderer is not
   deterministic between page sessions — CLAUDE.md).
   RUN:  node tools/shot-bloom-texture-t5.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, settleMsForRow, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, textureAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(HERE, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const { triGrid, nearest } = await import(pathToFileURL(path.join(HERE, 'tools/bloom-inflo-approach.mjs')).href);
const argv = process.argv;
const outDir = argv[2] || '/tmp/bloom-texture-t5';
const flag = (k) => (argv.indexOf(k) > 0 ? argv[argv.indexOf(k) + 1] : null);
const PNG_OUT = flag('--png');
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-texture-t5-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* the leaf-stem join, measured in Node on the very state (EXPORT): every
   blade vertex against the stem's own emitted triangles, the rods excluded by
   the leaf builder's own axes */
function joinClearanceMm(sets) {
  const st = { ...R.DEFAULTS };
  for (const { id, value } of sets) st[id] = Number.isFinite(Number(value)) && value !== '' && typeof R.DEFAULTS[id] === 'number' ? Number(value) : value;
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  const r = b.texture && b.texture.organs.stem ? b.texture.organs.stem.organ.triRange : [b.hubTriEnd, b.stemTriEnd];
  const grid = triGrid(acc.positions, [{ lo: r[0] * 9, hi: r[1] * 9, owner: 'stem' }]);
  let best = Infinity;
  for (const lb of b.leavesBuilt || []) {
    if (!lb || !(lb.triStart >= 0)) continue;
    const axes = Array.isArray(lb.rodAxes) ? lb.rodAxes : [lb.petioleAxis];
    for (let t = lb.triStart; t < lb.triStart + lb.tris; t++) for (let c = 0; c < 3; c++) {
      const o = t * 9 + c * 3, p = [acc.positions[o], acc.positions[o + 1], acc.positions[o + 2]];
      if (axes.some((ax) => ax && G.rodAxisExcessMm(ax, p[0], p[1], p[2]) <= ax.radiusMm * 1e-6)) continue;
      best = nearest(grid, p, null, best);
    }
  }
  return { mm: best, node0: { depth: b.leaf.nodeDepthsMm[0], rootZ: b.stem.rootZ, outerR: b.stem.outerR } };
}

const VIEWS = {
  hub: (f) => ({ r: f.R * 0.95, at: [0, 0, 0.6], dir: [0.28, -0.42, 0.86] }),
  stem: (f) => ({ r: 13, at: [0, 0, -25], dir: [0.25, -0.95, 0.18] }),
  join: (f) => ({ r: 10, at: [f.join.outerR + 3, 0, f.join.rootZ - f.join.depth + 2], dir: [0.15, -0.95, 0.27] }),
  tube: (f) => ({ r: f.R * 1.9, at: [0, 0, 3], dir: [0.35, -0.85, 0.4] }),
  /* an explicit frame (the florets: each floret's own hub, one floret-local view) */
  at: (f) => ({ r: f.r, at: f.at, dir: f.dir, up: f.up }),
  /* the hub's underside where it meets the stem, from below (the fade) */
  under: (f) => ({ r: 7, at: [0, 0, -1.2], dir: [0.3, -0.55, -0.78] }),
};
async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}
async function shoot(file, view, frame) {
  const f = VIEWS[view](frame);
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, a.up || null), f);
  let prev = null, buf = null;
  for (let k = 0; k < 20; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 800 } }); if (prev && buf.equals(prev)) break; prev = buf; }
  fs.writeFileSync(file, buf);
  const { width, height, data } = decodePNG(buf);
  let content = 0;
  for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  const frac = content / (width * height);
  if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
  return path.basename(file);
}
async function cell({ label, set: sets = [], view, frame = null, ruling = '', join = false, cap = null }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets, null, { settleMs: settleMsForRow(label) });
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  /* a BEFORE cell (Eva's Oct 25 rulings): the old behaviour through a lever no
     control reaches, photographed on this very tree; the TX family is NOT run
     on it (TX12 / TX13 are the clauses the old behaviour fails) */
  if (cap) { await page.evaluate((c) => window.__bloomCapability(c), cap); await settleBuild(page); }
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: sets };
  const jct = await junctionAssertions(page, row);
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const tx = cap ? [] : await textureAssertions(page, row);
  if (tx.length) await die(`${label}: TX: ${tx.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const jm = join ? joinClearanceMm(sets) : null;
  const own = { R: m0.hubRadius, join: jm ? jm.node0 : null };
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const shot = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, frame || own);
  if (cap) { await page.evaluate(() => window.__bloomCapability(null)); }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const T = m.texture;
  const organs = T ? Object.fromEntries(Object.entries(T.organs || {}).filter(([, r]) => r.organ).map(([k, r]) => [k, { ...r.organ, relief: r.reliefMaxMm, displaced: r.displaced }])) : {};
  const rec = { label, ruling, shot, own, before: !!cap, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, organs, edge: T && T.edgeCap ? T.edgeCap.usedMm : null, join: jm, texLine: readout.split('\n').find((l) => /^TEXTURE/.test(l)) || 'no TEXTURE line (untextured)' };
  console.log(`  ${label.padEnd(64)} ${String(rec.tris).padStart(8)} tris · ${Object.entries(organs).map(([k, o]) => `${k} ${o.shippedTris}->${o.refinedTris} vis ${o.visible}/bur ${o.buried}`).join(' · ')}${jm ? ` · join clearance ${jm.mm.toFixed(3)} mm` : ''} · ${rec.tag}`);
  return rec;
}

console.log('THE ORGANS\' RELIEF SHEET (T5) — every canvas cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, junction and TX (TX10 / TX11 included) asserted before the shutter.\n');
const rows = [];
const heights = [null, 0.4, 1.5];
const tex = (H) => (H ? { petalTexture: 'PEBBLE', textureHeight: H } : {});
const name = (H) => (H ? `PEBBLE ${H.toFixed(1)} mm` : 'untextured');
for (const [title, base, view, ruling, join] of [
  ['the hub\'s top (a 60 mm stem beneath)', { stemLength: 60 }, 'hub', 'the relief over the visible top and rim; smooth under the feet, which cover it (Q7)', false],
  ['the stem', { stemLength: 60 }, 'stem', 'the wall relieved in its own frame, outward along its own radial; the bore unrefined (Q15)', false],
  ['the leaf-stem join at leafAngle 70', { stemLength: 70, leafLength: 52, leafWidth: 17, leafNodes: 3, leafAngle: 70 }, 'join', 'the blade and the wall both relieved; the clearance is the emitted one (blade vertices against the stem\'s own relieved triangles)', true],
  ['the tube ring (6 petals, k 0)', { petalCount: 6, tubeLayer1: 0 }, 'tube', 'the closed ring refined on its own lattice, its own law\'s normals; the ring under the petals stays smooth', false],
]) {
  const cells = [];
  for (const H of heights) cells.push(await cell({ label: `${title} — ${name(H)}`, set: set({ ...base, ...tex(H) }), view, frame: cells[0] ? cells[0].own : null, ruling, join }));
  rows.push({ title, cells });
}

/* ---------- EVA'S OCT 25 RULINGS: before and after, on this tree ---------- */
const ruled = [];
{
  /* ruling 1 — the hub's top under the petal feet: coverage off (the T5 build) against on */
  const base = { petalTexture: 'PEBBLE', textureHeight: 1.5 };
  const cells = [];
  cells.push(await cell({ label: 'ruling 1 — the hub top, coverage OFF (as T5 shipped)', set: set(base), view: 'hub', ruling: 'the hub top textured under the feet: coincident with each foot\'s top skin, its escape ray left the union', cap: { label: 'sheet: coverage off', textureCoverageOff: true } }));
  cells.push(await cell({ label: 'ruling 1 — the hub top, coverage ON (shipped)', set: set(base), view: 'hub', frame: cells[0].own, ruling: 'smooth wherever another part\'s face lies within the relief\'s own height along the normal (derived from the emitted feet); the exposed top stays textured' }));
  ruled.push({ title: 'Ruling 1 — the hub top is smooth under the petal feet (PEBBLE 1.5 mm, no stem)', cells });
}
{
  /* ruling 2 — the fade at the hub-to-stem junction, typed 2H against derived */
  const H = 1.5, base = { petalTexture: 'PEBBLE', textureHeight: H, stemLength: 60 };
  const cells = [];
  cells.push(await cell({ label: `ruling 2 — the fade typed at 2H = ${(2 * H).toFixed(3)} mm (as T5 shipped)`, set: set(base), view: 'under', ruling: `steepest ramp the fade adds: 15/8 x H / 2H = 0.9375 (43.2 deg)`, cap: { label: 'sheet: typed fade', textureFadeWidthMm: 2 * H } }));
  cells.push(await cell({ label: `ruling 2 — the fade derived, max(H x 15/8, e) = ${G.textureFadeWidthMm(H, 0.4).toFixed(4)} mm (shipped)`, set: set(base), view: 'under', frame: cells[0].own, ruling: `steepest ramp exactly 45 deg; the edge term (one lattice edge) does not bind on today's ranges` }));
  ruled.push({ title: 'Ruling 2 — the fade width is derived from the height and the lattice edge (PEBBLE 1.5 mm, a 60 mm stem, the hub underside from below)', cells });
}
{
  /* ruling 5 — two florets of one umbel, one floret-local view each */
  const st = { ...R.DEFAULTS, petalTexture: 'PEBBLE', textureHeight: 1.5, inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 };
  const acc = new G.MeshBuilder({ exportMode: true }), b = G.buildBloomInto(acc, st, { below: null });
  const pl = b.inflorescenceBuilt.placed, P = acc.positions;
  const loc = (q, k) => { const M = q.M, x = P[q.at + k] - M[3], y = P[q.at + k + 1] - M[7], z = P[q.at + k + 2] - M[11]; return [M[0] * x + M[4] * y + M[8] * z, M[1] * x + M[5] * y + M[9] * z, M[2] * x + M[6] * y + M[10] * z]; };
  let dmax = 0; for (let k = 0; k < pl[0].tris * 9; k += 3) { const p = loc(pl[0], k), q = loc(pl[1], k); dmax = Math.max(dmax, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])); }
  const rot = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[4] * v[0] + M[5] * v[1] + M[6] * v[2], M[8] * v[0] + M[9] * v[1] + M[10] * v[2]];
  const hubR = b.inflorescenceBuilt.units[0].hubRadius;
  const frameOf = (q) => ({ r: hubR * 2.2, at: [q.M[3], q.M[7], q.M[11]], dir: rot(q.M, [0.35, -0.55, -0.76]), up: rot(q.M, [0, 0, 1]) });
  const sets = set({ petalTexture: 'PEBBLE', textureHeight: 1.5, inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 });
  const cells = [];
  for (const i of [0, 1]) cells.push(await cell({ label: `ruling 5 — floret ${i + 1} of ${pl.length}, its own hub from below (one floret-local view)`, set: sets, view: 'at', frame: frameOf(pl[i]), ruling: `the two florets differ by up to ${dmax.toFixed(3)} mm in their own frame (T5: 0.000 — one copy laid ${pl.length} times)` }));
  ruled.push({ title: 'Ruling 5 — floret hubs in the WORLD frame: no two florets carry the same copy (PEBBLE 1.5 mm, an umbel, head ON)', cells });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const orgLine = (o, k) => `${k}: ${o.shippedTris.toLocaleString('en-US')} shipped &rarr; <b>${o.refinedTris.toLocaleString('en-US')}</b> lattice tris · <b>${o.visible}</b> visible / <b>${o.buried}</b> buried${o.covered ? ` (<b>${o.covered}</b> of them covered)` : ''} of ${o.relievable} vertices · relief 0..${o.relief.toFixed(3)} mm · fade ${o.fadeMm.toFixed(4)} mm${o.cavityTris ? ` · ${o.cavityTris} cavity tris as shipped` : ''}`;
const fig = (c) => `<figure><img src="${c.shot}"><figcaption><b>${esc(c.label)}</b><br><small>${esc(c.ruling)}</small><br><b>${esc(c.tag)}</b> · ${c.tris.toLocaleString('en-US')} tris in the file${c.edge ? ` · edge ${c.edge.toFixed(2)} mm` : ''} · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB)${Object.entries(c.organs).map(([k, o]) => `<br>${orgLine(o, k)}`).join('')}${c.join ? `<br>leaf-stem clearance (emitted, EXPORT): <b>${c.join.mm.toFixed(3)} mm</b>` : ''}</figcaption></figure>`;
const html = `<title>Surface texture T5</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>Surface texture (T5) — the hub, the stem and the tube ring take the field</h1>
<p class="note"><b>Every canvas cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the junction assertions and the whole TX family (TX10 / TX11 included) ran before every shutter, and every STL exported watertight with no degenerate triangle. Each row is one camera: untextured, PEBBLE at the 0.4 mm floor, PEBBLE at the 1.5 mm maximum. VISIBLE faces only (Q7): a face inside another part, or on a closed cavity, stays smooth. The rods (filaments, the style, anthers, pedicels, petioles) stay smooth, pending the BONE sheet (Q12).</p>
${rows.map((r) => `<h2>${esc(r.title)}</h2><main>${r.cells.map(fig).join('')}</main>`).join('\n')}
<h1 style="margin-top:34px">Eva's rulings of Oct 25 — before and after, on this tree</h1>
<p class="note">Each BEFORE cell is the T5 behaviour through a lever no control reaches (coverage off; the fade pinned at 2H), photographed on this tree with the TX family withheld (TX12 / TX13 are exactly the clauses it fails); each AFTER cell ran every clause. The floret pair is two cells of ONE build, each framed by that floret's own placement matrix, so a copy would photograph identically.</p>
${ruled.map((r) => `<h2>${esc(r.title)}</h2><main style="grid-template-columns:repeat(2,minmax(0,1fr))">${r.cells.map(fig).join('')}</main>`).join('\n')}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); server.close();
