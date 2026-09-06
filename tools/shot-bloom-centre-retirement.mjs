/* ===================================================================
   THE CENTRE RETIREMENT SHEET (session 20, phase 2 B1) — the bare apex beside
   today's DISC, for Eva's ruling. Merge is released by it.

   WHAT IT SHOOTS. Two configurations, each as a BEFORE / AFTER pair:
     (1) the SHIPPING DEFAULT — eight petals, spread 2.00, flat hub;
     (2) the SHIPPING DEFAULT at head rise 0.50 — the sparse dome row on
         which the DISC's seat and rim HOVER were photographed in session 14
         (the dome sheet's `seatSparse` cell: a low camera reaches the button
         there);
     (3) the INCURVE TARGET at head rise 0.50 — the dome row the seat was
         first photographed on. On this row the DISC is BURIED under the
         closing crown from every camera, so the pair differs by the DISC's
         1,056 triangles and by nothing the eye can reach; it is on the sheet
         because that is itself the finding — on the head the rig was
         meant for, the designed centre was never visible.
   For each: the whole bloom, and the hub cropped at hub magnification from
   a low three-quarter that reaches the apex — and on the dome row a third
   view DOWN INTO THE CROWN (75 degrees above the rim plane, the dome sheet's
   own `seatSide` camera), because on the incurve target the standing
   florets hide the apex from every low camera and the low crop widens to
   the whole ball, which shows nothing of the seat. The BEFORE cells are rendered
   from a git worktree of the BASE commit (8524318), where the A/B rig still
   builds its DISC — the per-petal sheet's pattern: a retired look is
   photographed, never only recorded. The AFTER cells are this tree.

   EVERY CELL IS THE PRINT PREVIEW (the export-floored geometry, read back
   from the app's own shownMode after the real box was flipped), chrome
   hidden and auto-rotate off through the asserted stillFrame(), whole state
   read back, one camera per pair sized from the BEFORE cell's live geometry
   so the only thing that differs is the object. The BEFORE cells' triangle
   counts must exceed the AFTER cells' by exactly the DISC's 1,056 on the
   flat pair (the retirement removes one closed solid and nothing else),
   asserted on the sheet itself; on the dome pair the DISC's count is the
   same 1,056 and the assertion is the same.

   RUN:  node tools/shot-bloom-centre-retirement.mjs <out-dir> [base-tree]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf, fullStateDrift, stillFrame, settleBuild, modeTag, shownModeOf, RETIRED_IDS } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-centre-retirement';
const BASE_ROOT = process.argv[3] || '/tmp/base-main';
fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(path.join(BASE_ROOT, 'bloom.html'))) {
  console.error(`HARNESS INVALID: no base tree at ${BASE_ROOT} — this sheet IS the before/after pair, so a missing base is not a cell to skip. Create it with: git worktree add ${BASE_ROOT} 8524318`);
  process.exit(2);
}
const { server, port } = await serveRepo();
const base = await serveRepo(BASE_ROOT);
const baseKinds = await kindsOf(BASE_ROOT);   // the base tree's own registry declares centerStyle; the head's does not
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); base.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const DISC_TRIS = 1056;

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* A frame is decoded and required to carry content; the hub crop widens in
   bounded steps if it comes back all canopy (the dome sheet's rule). */
async function shoot(file, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (frame.at) await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { ...frame, r: frame.r * scale });
    else await page.evaluate((rr) => window.__bloomFrame(rr, 0.15), frame.r);
    await page.waitForTimeout(260);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 800, height: 800 } });
    const { width, height, data } = decodePNG(fs.readFileSync(file));
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.98) return { file: path.basename(file), scale };
    if (frac < 0.02 || !frame.at) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

/* One cell: on the base tree the row also pins centerStyle DISC explicitly
   (the base's own default, pinned so the label names the state it sets); on
   this tree the row carries no centre id at all, and the harness's read-back
   would refuse one. */
async function cell({ label, sets, onBase, frames }) {
  await openBloom(page, onBase ? base.port : port);
  const rowSet = onBase ? [...sets, { id: 'centerStyle', value: 'DISC' }] : sets;
  const bad = await applyConfig(page, rowSet, onBase ? baseKinds : null);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  if (!onBase) {
    const drift = await fullStateDrift(page, rowSet);
    if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
    const stray = await page.evaluate((ids) => ids.filter((id) => document.getElementById(id) !== null), RETIRED_IDS.map((r) => r.id));
    if (stray.length) await die(`${label}: retired id(s) render on this tree: ${stray.join(', ')}`);
  }
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const own = { hub: m0.hubRadius, fit: m0.fitRadius, apexZ: m0.hubDome ? m0.hubDome.H : 0 };
  const fr = frames || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const shots = {
    whole: await shoot(path.join(outDir, `${slug(label)}-whole.png`), { r: fr.fit }),
    hub: await shoot(path.join(outDir, `${slug(label)}-hub.png`), { r: Math.max(fr.hub * 1.9, 6), at: [0, 0, fr.apexZ], dir: [0.5, -0.65, 0.57] }),
  };
  if (fr.apexZ > 0) shots.crown = await shoot(path.join(outDir, `${slug(label)}-crown.png`), { r: Math.max(fr.hub * 0.75, 4), at: [0, 0, fr.apexZ], dir: [0.2, -0.2, 0.96] });
  await setPreview(false);
  /* The SUMMARY line begins `petals`; line 0 is the on-screen mode line. */
  const summary = readout.split('\n').find((l) => /^petals /.test(l)) || '';
  const centreSaid = /\bcent(er|re)\b/i.test(summary);
  const rec = { label, onBase, tag: modeTag(m), shots, own, shownTris: m.shownTris, hub: m.hubRadius, readoutFirst: summary, centreSaid,
    centerTris: onBase ? (m.centerTris ?? null) : null };
  console.log(`  ${label.padEnd(64)} ${onBase ? 'BASE ' : 'HEAD '} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris}${onBase ? ` (centre ${m.centerTris})` : ''} · ${modeTag(m)} · read-out: "${rec.readoutFirst}"`);
  return rec;
}

const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 };

console.log('THE CENTRE RETIREMENT SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');
const pairs = [];
for (const [name, sets] of [
  ['the SHIPPING DEFAULT (8 petals, spread 2.00, flat hub)', []],
  ['the SHIPPING DEFAULT at head rise 0.50 (the sparse dome row the seat HOVER was photographed on, Sep 4)', set({ headRise: 0.5 })],
  ['the INCURVE TARGET at head rise 0.50 (the DISC is buried under the crown from every camera)', set(INCURVE)],
]) {
  const before = await cell({ label: `BEFORE — ${name} — DISC, on the base tree`, sets, onBase: true });
  const after = await cell({ label: `AFTER — ${name} — the bare apex, on this tree`, sets, onBase: false, frames: before.own });
  /* THE RETIREMENT REMOVES ONE CLOSED SOLID AND NOTHING ELSE — asserted on the
     sheet from the two trees' own counts, not from a sentence. */
  if (before.centerTris !== DISC_TRIS) await die(`${name}: the base tree reports a centre of ${before.centerTris} triangles, not the DISC's ${DISC_TRIS}`);
  if (before.shownTris - after.shownTris !== DISC_TRIS) await die(`${name}: BEFORE ${before.shownTris} − AFTER ${after.shownTris} = ${before.shownTris - after.shownTris} triangles, not the DISC's ${DISC_TRIS} — the retirement moved more than the centre`);
  if (before.hub !== after.hub) await die(`${name}: the hub radius moved (${before.hub} -> ${after.hub}) — the retirement reached the ring`);
  if (!before.centreSaid) await die(`${name}: the base tree's read-out does not name its centre — the BEFORE cell is not the state it claims`);
  if (after.centreSaid) await die(`${name}: this tree's read-out still names a centre: "${after.readoutFirst}"`);
  pairs.push({ name, before, after });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c, view, cap) => `<figure class="${c.onBase ? 'base' : 'head'}"><img src="${c.shots[view].file}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.shots[view].scale > 1 ? `, camera widened ${c.shots[view].scale.toFixed(2)}x` : ''})</i><br><small>${esc(c.tag)} · read-out: "${esc(c.readoutFirst)}"</small><br>hub R ${c.hub.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview)${c.onBase ? ` of which the DISC is ${c.centerTris}` : ''}</figcaption></figure>`;
const html = `<title>The centre retirement — the bare apex beside today's DISC</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}figure.base img{border-color:#6b4b2a}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The centre retirement — the bare apex beside today's DISC (session 20, phase 2 B1)</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted. LEFT (amber border): the base tree at 8524318, where the A/B rig still builds its DISC — the shipping default until this merge. RIGHT: this tree, the bare hub apex. Each pair shares one camera sized from the BEFORE cell. The sheet asserts, from the two trees' own counts, that BEFORE − AFTER is exactly the DISC's ${DISC_TRIS} triangles and that the hub radius did not move: the retirement removes one closed solid and nothing else. DISC, DOME and RING are retired on Eva's ruling (Sep 5); the centre is the reproductive parts and nothing else, and they are B2's.</p>
${pairs.map((p) => `<h2>${esc(p.name)}</h2><main>${fig(p.before, 'whole', 'whole bloom')}${fig(p.after, 'whole', 'whole bloom')}</main><main>${fig(p.before, 'hub', 'the hub, low three-quarter at hub magnification')}${fig(p.after, 'hub', 'the hub, low three-quarter at hub magnification')}</main>${p.before.shots.crown ? `<main>${fig(p.before, 'crown', 'down into the crown, 75 deg above the rim plane')}${fig(p.after, 'crown', 'down into the crown, 75 deg above the rim plane')}</main>` : ''}`).join('')}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); base.server.close();
