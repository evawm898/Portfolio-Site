/* ===================================================================
   THE SURFACE-TEXTURE SHEET (T3 — docs/bloom-surface-texture-t3-outcome.md).
   Composed so what the session leaves to Eva's eye is on one page:

   (1) PEBBLE and CELLULAR at the 0.4 mm floor and the 1.5 mm maximum on the
       shipping default, one camera, beside the untextured default.
   (2) THE BEAD, CLOSE — a macro on one petal's margin, textured against
       untextured at one camera, with the OUTLINE DISPLACEMENT read off the
       builder's own apex samples (the relief runs OVER the bead, Q4/Q5).
   (3) THE 0.40 mm NIB at PEBBLE 1.5 — the one state the bead tool found
       folding (19 within-shell pairs), rendered rather than masked.
   (4) THE EXCLUSIVITY STATE (Q9) — the panel with the infill on and the
       texture control greyed, and with BOTH on (neither greyed, told).
   (5) THE WHOLE BLOOM with sepals and a leaf: the sheets carry the field,
       the hub / stem / rods / tube ring do not (T5).
   (6) THE CORNER-CAP OPTIONS — the numbers from tools/bloom-texture-corner.mjs,
       mechanism by mechanism, NONE PICKED (Eva's question).

   EVERY CANVAS CELL: PRINT PREVIEW ON (read back from the app's own
   shownMode), chrome hidden, auto-rotate off through the asserted
   stillFrame(), whole state read back, the TX family run before the shutter,
   the STL sha of that cell, every frame decoded and required to carry
   content. No pixel delta is quoted anywhere (this renderer is not
   deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-texture-t3.mjs <out-dir> [--png <file>]
                [--bead <bead.json>] [--corner <corner.json>]
   (the two JSON files come from tools/bloom-texture-bead.mjs --json and
   tools/bloom-texture-corner.mjs --json; without them those captions say
   the number was not measured in this run)
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, textureAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const argv = process.argv;
const outDir = argv[2] || '/tmp/bloom-texture-t3';
const flag = (k) => (argv.indexOf(k) > 0 ? argv[argv.indexOf(k) + 1] : null);
const PNG_OUT = flag('--png');
const BEAD = flag('--bead') ? JSON.parse(fs.readFileSync(flag('--bead'), 'utf8')) : null;
const CORNER = flag('--corner') ? JSON.parse(fs.readFileSync(flag('--corner'), 'utf8')) : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-texture-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

const VIEWS = {
  whole: (f) => ({ r: Math.max(f.fit, f.across / 2) * 1.2, at: [0, 0, f.across * 0.05], dir: [0.2, -0.6, 0.78] }),
  /* the petal at azimuth 0, its -y margin about mid-blade, from above and beside */
  bead: (f) => ({ r: 7, at: [f.R + 14, -5.5, 6.5], dir: [0.1, -0.75, 0.65] }),
  /* the tip of the petal at azimuth 0: the blade leaves the ring at the
     default tilt (25 deg) and the tip-shape-0.60 nib closes it ~5 mm short of
     the asked 35 mm (the apex-nib doc's 8.59 mm at 60 mm, scaled), so the
     apex sits near R + 30 cos(25) along x and 30 sin(25) up */
  nib: (f) => ({ r: 6, at: [f.R + 30 * Math.cos(25 * Math.PI / 180), 0, 30 * Math.sin(25 * Math.PI / 180)], dir: [0.3, -0.55, 0.78] }),
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const f = VIEWS[view](frame); f.r *= scale;
    await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
    let prev = null, buf = null;
    for (let k = 0; k < 20; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 800 } }); if (prev && buf.equals(prev)) break; prev = buf; }
    fs.writeFileSync(file, buf);
    const { width, height, data } = decodePNG(buf);
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.98) return { file: path.basename(file), scale };
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

async function cell({ label, set: sets = [], views = ['whole'], frame = null, ruling = '' }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: sets };
  const jct = await junctionAssertions(page, row);
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const tx = await textureAssertions(page, row);
  if (tx.length) await die(`${label}: TX: ${tx.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const own = { R: m0.hubRadius, fit: m0.fitRadius, across: m0.maxDimMm };
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const fr = frame || own;
  const shots = {};
  for (const view of views) shots[view] = (await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr)).file;
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const texLine = readout.split('\n').find((l) => /^TEXTURE/.test(l)) || 'no TEXTURE line (untextured)';
  const T = m.texture;
  const petal = T && T.organs && T.organs.petal;
  const rec = { label, ruling, shots, own, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, shownTris: m.shownTris, texLine,
    ratio: petal && petal.floorTris ? petal.skinTris / petal.floorTris : null, relief: petal ? petal.reliefMaxMm : null, refused: T ? T.refused : null };
  console.log(`  ${label.padEnd(62)} ${String(stl.tris).padStart(8)} tris · ${rec.ratio ? rec.ratio.toFixed(3) + 'x floor' : '—'} · ${rec.tag}`);
  return rec;
}

/* THE PANEL — the one cell that is not a canvas: the Texture and Infill
   sections open, every other chrome shown, the disabled state read back. */
async function panelCell({ label, set: sets, ruling }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const st = await page.evaluate(() => {
    for (const d of document.querySelectorAll('details.bl-sec')) d.open = d.dataset.section === 'petal';
    const q = (id) => { const el = document.getElementById(id); return el ? { disabled: el.disabled, value: el.value, hidden: !!el.closest('.bl-ctrl')?.hidden } : null; };
    return { petalTexture: q('petalTexture'), petalInfill: q('petalInfill'), textureHeight: q('textureHeight'), infillDensity: q('infillDensity'),
      readout: (document.getElementById('readout').textContent.split('\n').find((l) => /^TEXTURE/.test(l)) || '') };
  });
  await page.waitForTimeout(200);
  /* the panel scrolls inside a fixed column, so the two SECTIONS are shot
     (each scrolled into view), not the column */
  const files = [];
  for (const sec of ['texture', 'infill']) {
    const el = await page.$(`details.bl-sec[data-section="${sec}"]`);
    if (!el) await die(`${label}: no ${sec} section on the panel`);
    /* the panel is an accordion — a sibling closes when this one opens — so
       each section is opened just before its own shot */
    await page.evaluate((id) => { const d = document.querySelector(`details.bl-sec[data-section="${id}"]`); d.open = true; }, sec);
    await page.waitForTimeout(150);
    const file = path.join(outDir, `${slug(label)}-${sec}.png`);
    await el.screenshot({ path: file });
    files.push(path.basename(file));
  }
  console.log(`  ${label.padEnd(62)} texture ${st.petalTexture.disabled ? 'GREYED' : 'live'} (${st.petalTexture.value}) · infill ${st.petalInfill.disabled ? 'GREYED' : 'live'} (${st.petalInfill.value})`);
  return { label, ruling, files, st };
}

console.log('THE SURFACE-TEXTURE SHEET — every canvas cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, junction and TX asserted before the shutter.\n');
/* (1) one camera, sized from the untextured default */
const plain = await cell({ label: 'the default, untextured', views: ['whole'], ruling: 'the shipping default — byte-identical to main (the choice guard)' });
const row1 = [plain];
for (const type of ['PEBBLE', 'CELLULAR']) for (const H of [0.4, 1.5]) row1.push(await cell({ label: `${type} ${H.toFixed(1)} mm`, set: set({ petalTexture: type, textureHeight: H }), frame: plain.own, ruling: H === 0.4 ? 'the floor — the default height (unvalidated, Q13)' : 'the slider maximum' }));
/* (2) the bead close */
const beadCells = [];
beadCells.push(await cell({ label: 'the bead — untextured', set: set({ petalCount: 3 }), views: ['bead'], ruling: 'the edge-profile ruling\'s half-round bead on its fixed outline' }));
for (const H of [0.4, 1.5]) beadCells.push(await cell({ label: `the bead — PEBBLE ${H.toFixed(1)} mm`, set: set({ petalCount: 3, petalTexture: 'PEBBLE', textureHeight: H }), views: ['bead'], ruling: 'the relief runs over the bead (Q4/Q5): the apex moves out along the bead\'s own normal by g·H·f' }));
/* (3) the nib fold */
const nibCells = [];
for (const [type, H] of [['CELLULAR', 1.5], ['PEBBLE', 1.5]]) nibCells.push(await cell({ label: `the 0.40 mm nib (tip shape 0.60) — ${type} ${H.toFixed(1)} mm`, set: set({ petalCount: 3, petalTipShape: 0.6, petalTexture: type, textureHeight: H }), views: ['nib'], ruling: type === 'PEBBLE' ? 'FOLDS: the bead tool reads 19 within-shell pairs / 0.5011 mm here — the two margins of a 0.40 mm face each pushed out by up to 1.5 mm meet; rendered, not masked, Eva\'s to rule' : 'the matrix row (CELLULAR): 0 within-shell pairs' }));
/* (4) exclusivity */
const panels = [];
panels.push(await panelCell({ label: 'infill ON — texture greyed', set: set({ petalInfill: 'VORONOI' }), ruling: 'Q9: with the infill on the texture control is disabled, never switched' }));
panels.push(await panelCell({ label: 'texture ON — infill greyed', set: set({ petalTexture: 'PEBBLE' }), ruling: 'and the other way round' }));
panels.push(await panelCell({ label: 'BOTH on (a loaded design) — neither greyed, texture refused and TOLD', set: set({ petalTexture: 'PEBBLE', petalInfill: 'VORONOI' }), ruling: 'a saved design with both: the read-out reports it (TEXTURE NOT BUILT — … exclusive (Q9); told, not picked); an ON control is never greyed so either can be turned off' }));
/* (5) the whole bloom with sepals and a leaf */
const whole = await cell({ label: 'PEBBLE 0.4 mm with 8 sepals and a leaf on a 60 mm stem', set: set({ petalTexture: 'PEBBLE', sepalCount: 8, stemLength: 60, leafLength: 60 }), views: ['whole'], ruling: 'petals, sepals and the leaf carry the one field; the hub, stem, petiole and rods stay smooth (T5)' });

/* captions */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const beadOf = (state, type, H) => BEAD && BEAD.find((b) => b.state.startsWith(state) && b.type === type && Math.abs(b.H - H) < 1e-9);
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.tris).toLocaleString('en-US')} tris in the file${c.ratio ? ` · petal lattice skin <b>${c.ratio.toFixed(3)}x</b> its conforming floor (bar 1.25x)` : ''}${c.relief != null ? ` · relief 0..${c.relief.toFixed(3)} mm` : ''} · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB)<br><small>${esc(c.texLine)}</small>`;
const fig = (c, view, extra = '') => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b><br><small>${esc(c.ruling)}</small><br>${num(c)}${extra}</figcaption></figure>`;
const beadNum = (type, H, state = 'the default') => { const b = beadOf(state, type, H); return b ? `<br>bead tool: apex moves out <b>max ${b.apexMax.toFixed(3)} / mean ${b.apexMean.toFixed(3)} mm</b> of H ${H} over ${b.apexN} samples · within-shell pairs ${b.within} (untextured ${b.withinTwin}) worst ${b.worstMm.toFixed(4)} mm · nearest neighbour blade ${b.gapMm.toFixed(3)} mm (untextured ${b.gapTwinMm.toFixed(3)})` : '<br><i>bead tool not run in this invocation (--bead)</i>'; };
const cornerHtml = () => {
  if (!CORNER) return '<p class="note"><i>corner tool not run in this invocation (--corner)</i></p>';
  const pct = (t) => `${Number(t).toLocaleString('en-US')} (${(100 * t / CORNER.budget).toFixed(1)}%)`;
  const rows = Object.entries(CORNER.corners).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${pct(v)}</td></tr>`).join('');
  const heads = Object.entries(CORNER.headCount).map(([L, h]) => `<tr><td>${L} whorl${L === '1' ? '' : 's'}</td><td>${h.fits} petals fit at ${pct(h.fitsTris)}${h.next ? `; ${h.next} does not (${pct(h.nextTris)})` : ' — 40 fits'}</td></tr>`).join('');
  const edges = Object.entries(CORNER.edges).sort((a, b) => a[0] - b[0]).map(([e, t]) => `<tr><td>${e} mm</td><td>${pct(t)}</td></tr>`).join('');
  return `<p class="note">PEBBLE at the 0.4 mm floor, EXPORT, against the ${CORNER.budget.toLocaleString('en-US')} budget:</p>
<table><tr><th>state</th><th>export triangles</th></tr>${rows}</table>
<h3>A. Refuse — the page already does this</h3><p class="note">The export handler refuses above the budget with the count (XR1's path). Cost: a textured 40 × 3 head is unexportable at every height and size; nothing else changes.</p>
<h3>B. Cap the HEAD COUNT a texture may be built on</h3><table><tr><th>whorls</th><th>the largest petal count that fits</th></tr>${heads}</table><p class="note">Cost: a slider position that builds untextured and refuses to texture (told); the cap moves with the sheet, the length and the width, so it is a derived number, not a constant.</p>
<h3>C. Coarsen the LATTICE EDGE where the count would breach</h3><table><tr><th>edge</th><th>40 × 3 export triangles</th></tr>${edges}</table><p class="note">The finest edge that fits the 40 × 3 head is <b>${CORNER.finestEdgeThatFits} mm</b>. Cost: Eva's 0.4 mm edge ruling is given up on the corner, and the relief at 1.5 mm is drawn on a coarser lattice there than anywhere else; the bar (1.25x the conforming floor) would also move with it.</p>
<p class="note"><b>None is picked.</b> This is the brief's step 6 and Eva's question.</p>`;
};
const panelFig = (p) => `<figure><div style="display:flex;gap:8px">${p.files.map((f) => `<img src="${f}" style="width:calc(50% - 4px)">`).join('')}</div><figcaption><b>${esc(p.label)}</b><br><small>${esc(p.ruling)}</small><br>read back: petalTexture <b>${p.st.petalTexture.disabled ? 'DISABLED' : 'enabled'}</b> (${esc(p.st.petalTexture.value)}) · petalInfill <b>${p.st.petalInfill.disabled ? 'DISABLED' : 'enabled'}</b> (${esc(p.st.petalInfill.value)})${p.st.readout ? `<br><small>${esc(p.st.readout)}</small>` : ''}</figcaption></figure>`;
const html = `<title>Surface texture T3</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}h3{font-size:15px;margin:14px 0 2px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}main.five{grid-template-columns:repeat(5,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}table{border-collapse:collapse;margin:6px 0}td,th{border:1px solid #26302b;padding:3px 10px;text-align:left}th{color:#9fb3a9}</style>
<h1>Surface texture (T3) — one field over the sheets, outward, over the bead</h1>
<p class="note"><b>Every canvas cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the junction assertions and the TX family ran before every shutter. The texture ships OFF behind a choice guard; the height floor of 0.4 mm is Eva's ruling and <b>unvalidated</b> — nothing in this project has been printed.</p>
<h2>1. PEBBLE and CELLULAR at the floor and the maximum, one camera</h2>
<main class="five">${row1.map((c) => fig(c, 'whole', c.ratio ? beadNum(/PEBBLE/.test(c.label) ? 'PEBBLE' : 'CELLULAR', /1\.5/.test(c.label) ? 1.5 : 0.4) : '')).join('')}</main>
<h2>2. The bead, close — textured against untextured (3 petals, one camera)</h2>
<main>${beadCells.map((c) => fig(c, 'bead', c.ratio ? beadNum('PEBBLE', /1\.5/.test(c.label) ? 1.5 : 0.4) : '')).join('')}</main>
<p class="note">The relief runs OVER the bead (Q4/Q5): the bead's apex and both skins move outward along their own normals, so a textured petal's outline moves out by up to H and an untextured one keeps the edge-profile ruling's outline byte for byte. The displacement quoted is read off the builder's own apex samples by tools/bloom-texture-bead.mjs.</p>
<h2>3. The 0.40 mm nib at the maximum height</h2>
<main class="two">${nibCells.map((c) => fig(c, 'nib', beadNum(/PEBBLE/.test(c.label) ? 'PEBBLE' : 'CELLULAR', 1.5, 'the 0.40 mm nib'))).join('')}</main>
<p class="note">The brief's stop condition: a fold at the bead is reported with a render, never masked. PEBBLE at 1.5 mm on the 0.40 mm nib folds (19 pairs); CELLULAR there does not (its field is 0 on every cell wall, so the margins rarely both stand proud). The default height reads 0 pairs on every state the bead tool measured.</p>
<h2>4. Texture and infill are exclusive (Q9)</h2>
<main>${panels.map(panelFig).join('')}</main>
<h2>5. The whole bloom — which sheets carry the field</h2>
<main class="two">${fig(whole, 'whole')}</main>
<h2>6. The worst corner (40 petals × 3 whorls) — the cap's options, none picked</h2>
${cornerHtml()}`;
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
