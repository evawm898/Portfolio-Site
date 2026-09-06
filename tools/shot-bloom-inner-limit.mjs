/* ===================================================================
   THE INNER-LIMIT SHEET (session 24) — the Vogel disc with and without its
   inner limit, for Eva's ruling. Merge is released by it.

   WHAT IT SHOOTS. Five configurations, each a BEFORE / AFTER pair, plus one
   CONTROL that must not move:
     (1) 6 on the DISC     — the sparse case, where the hole is largest as a
                             fraction of the disc (14.3% of its area);
     (2) 30 on the DISC    — the middle;
     (3) 120 on the DISC   — THE ROOTS-FUSE CASE. On this row the closest pair
                             of roots measures 1.164 mm against a 1.20 mm
                             filament, so the ROOTS FUSE flag fires TODAY; the
                             annulus law takes it to 1.233 mm and clears it.
                             The sheet asserts that flip from the read-out;
     (4) 120 on the DISC WITH A STYLE — the defect this session exists for.
                             The innermost stamen stood at 0.53 mm inside a
                             0.60 mm style, so FILAMENT AGAINST STYLE fired at
                             the root on every disc setting. Asserted to flip;
     (5) 1 stamen on the DISC — THE NO-ROOM CORNER, told and not refused: the
                             disc radius is 1.20 mm, exactly the limit, so the
                             annulus has no width and the stamen stands on the
                             rim. It is a matrix row on both trees, so the
                             corner is covered without adding one;
     (C) 6 on the RING     — the CONTROL. The limit is the disc's law and must
                             not touch a ring, so this pair must come back with
                             the same triangle count, the same hub, the same
                             innermost radius and NO inner-limit clause on
                             either tree. A sheet of only movers cannot show
                             that something held.

   For each: the whole bloom, the hub from a low three-quarter, and the hub
   FROM ABOVE — which is the view the finding actually lives in, because the
   inner limit is a hole in a disc and a hole in a disc is invisible in
   profile.

   THE BEFORE CELLS ARE RENDERED FROM A GIT WORKTREE OF THE BASE COMMIT
   (b847f81), where footRing()'s disc still starts on the axis — the per-petal
   sheet's pattern: a superseded law is photographed, never only recorded.

   WHAT THE SHEET ASSERTS FROM THE TWO TREES' OWN NUMBERS, so the claims are
   measured rather than captioned: the triangle count and the hub radius are
   IDENTICAL across every pair (the limit moves stamens, it adds none and it
   does not reach the ring); the inner-limit clause is absent on the base tree
   and present on this one for every disc, and absent on BOTH for the ring;
   ROOTS FUSE and FILAMENT AGAINST STYLE flip on rows (3) and (4); NO ROOM
   appears on row (5).

   EVERY CELL IS THE PRINT PREVIEW (the export-floored geometry, read back
   from the app's own shownMode after the real box was flipped), chrome
   hidden and auto-rotate off through the asserted stillFrame(), whole state
   read back, one camera per pair sized from the BEFORE cell's live geometry
   so the only thing that differs is the object.

   RUN:  node tools/shot-bloom-inner-limit.mjs <out-dir> [base-tree]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf, fullStateDrift, stillFrame, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-inner-limit';
const BASE_ROOT = process.argv[3] || '/tmp/base-main';
fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(path.join(BASE_ROOT, 'bloom.html'))) {
  console.error(`HARNESS INVALID: no base tree at ${BASE_ROOT} — this sheet IS the before/after pair, so a missing base is not a cell to skip. Create it with: git worktree add ${BASE_ROOT} b847f81`);
  process.exit(2);
}
const { server, port } = await serveRepo();
const base = await serveRepo(BASE_ROOT);
const baseKinds = await kindsOf(BASE_ROOT);
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); base.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* A frame is decoded and required to carry content; the crop widens in
   bounded steps if it comes back all hub (the dome sheet's rule). */
async function shoot(file, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (frame.at) await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, a.up || null), { ...frame, r: frame.r * scale });
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

async function cell({ label, sets, onBase, frames }) {
  await openBloom(page, onBase ? base.port : port);
  const bad = await applyConfig(page, sets, onBase ? baseKinds : null);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  if (!m0.androecium) await die(`${label}: no androecium on a row that pins one — the cell is not the state it claims`);
  const own = { hub: m0.hubRadius, fit: m0.fitRadius, apexZ: m0.hubDome ? m0.hubDome.H : 0 };
  const fr = frames || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const shots = {
    whole: await shoot(path.join(outDir, `${slug(label)}-whole.png`), { r: fr.fit }),
    hub: await shoot(path.join(outDir, `${slug(label)}-hub.png`), { r: Math.max(fr.hub * 1.9, 6), at: [0, 0, fr.apexZ], dir: [0.5, -0.65, 0.57] }),
    /* FROM ABOVE — the view the inner hole lives in. Held a few degrees off
       the axis so the camera basis never degenerates, with `up` given. */
    above: await shoot(path.join(outDir, `${slug(label)}-above.png`), { r: Math.max(fr.hub * 1.6, 5), at: [0, 0, fr.apexZ], dir: [0.02, -0.12, 0.993], up: [0, 1, 0] }),
  };
  await setPreview(false);
  const stam = readout.split('\n').find((l) => /^STAMENS /.test(l)) || '';
  const A = m.androecium;
  const rec = {
    label, onBase, tag: modeTag(m), shots, own, shownTris: m.shownTris, hub: m.hubRadius,
    stamenLine: stam,
    r0: A.stamens[0].radius, rN: A.stamens[A.stamens.length - 1].radius,
    innerLimit: A.innerLimit ?? null, innerUsed: A.innerUsed ?? null, noRoom: A.noRoom ?? null,
    limitSaid: /the disc runs from /.test(stam), noRoomSaid: /NO ROOM FOR THE INNER LIMIT/.test(stam),
    fuse: /\(ROOTS FUSE\)/.test(stam), against: /FILAMENT AGAINST STYLE/.test(stam),
    nearestRoots: (stam.match(/nearest roots ([\d.]+) mm/) || [])[1] || null,
    nearestStyle: (stam.match(/nearest filament to the style ([\d.]+) mm/) || [])[1] || null,
  };
  console.log(`  ${label.padEnd(58)} ${onBase ? 'BASE ' : 'HEAD '} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} r0 ${rec.r0.toFixed(3)} rN ${rec.rN.toFixed(3)}${rec.nearestRoots ? ` roots ${rec.nearestRoots}${rec.fuse ? ' FUSE' : ''}` : ''}${rec.nearestStyle ? ` style ${rec.nearestStyle}${rec.against ? ' AGAINST' : ''}` : ''} · ${modeTag(m)}`);
  return rec;
}

console.log('THE INNER-LIMIT SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');
const ROWS = [
  { name: '6 on the DISC — the sparse case; the hole is 14.3% of the disc AREA', sets: set({ stamenCount: 6, stamenLayout: 'DISC' }), disc: true },
  { name: '30 on the DISC — the middle', sets: set({ stamenCount: 30, stamenLayout: 'DISC' }), disc: true },
  { name: '120 on the DISC — THE ROOTS-FUSE CASE: the flag fires today and must clear', sets: set({ stamenCount: 120, stamenLayout: 'DISC' }), disc: true, wasFuse: true },
  { name: '120 on the DISC WITH A STYLE — the defect: FILAMENT AGAINST STYLE at the root', sets: set({ stamenCount: 120, stamenLayout: 'DISC', gynoecium: 'STYLE' }), disc: true, wasAgainst: true },
  { name: '1 stamen on the DISC — THE NO-ROOM CORNER, told and not refused', sets: set({ stamenCount: 1, stamenLayout: 'DISC' }), disc: true, noRoom: true },
  { name: '6 on the RING — THE CONTROL: the limit is the disc’s law and must not touch a ring', sets: set({ stamenCount: 6, stamenLayout: 'RING' }), disc: false },
];
const pairs = [];
for (const row of ROWS) {
  const before = await cell({ label: `BEFORE — ${row.name}`, sets: row.sets, onBase: true });
  const after = await cell({ label: `AFTER — ${row.name}`, sets: row.sets, onBase: false, frames: before.own });
  /* THE LIMIT MOVES STAMENS AND ADDS NONE — asserted from the two trees' own
     counts, never from a sentence. */
  if (before.shownTris !== after.shownTris) await die(`${row.name}: BEFORE ${before.shownTris} tris, AFTER ${after.shownTris} — the inner limit must move stamens, never add or drop one`);
  if (before.hub !== after.hub) await die(`${row.name}: the hub radius moved (${before.hub} -> ${after.hub}) — the limit reached the ring`);
  if (before.limitSaid) await die(`${row.name}: the BASE tree's read-out already names an inner limit — the BEFORE cell is not the state it claims`);
  if (row.disc) {
    if (!after.limitSaid && !after.noRoomSaid) await die(`${row.name}: this tree's STAMENS line names no inner limit on a DISC: "${after.stamenLine}"`);
    if (after.r0 <= before.r0) await die(`${row.name}: the innermost stamen did not move outward (${before.r0} -> ${after.r0})`);
    if (after.innerLimit === null) await die(`${row.name}: this tree's descriptor reports no innerLimit on a DISC`);
  } else {
    /* THE CONTROL: nothing about a ring may move. */
    if (after.limitSaid || after.noRoomSaid) await die(`${row.name}: this tree's read-out names an inner limit on a RING — the limit is the disc's law`);
    if (before.r0 !== after.r0 || before.rN !== after.rN) await die(`${row.name}: a RING stamen moved (${before.r0} -> ${after.r0}) — the limit must not touch it`);
    if (after.innerUsed !== null || after.noRoom !== null) await die(`${row.name}: the RING reports innerUsed ${after.innerUsed} / noRoom ${after.noRoom} — a claim nothing can make must read as absent`);
  }
  if (row.wasFuse) {
    if (!before.fuse) await die(`${row.name}: the base tree does NOT report ROOTS FUSE (${before.nearestRoots} mm) — this row is on the sheet because it does`);
    if (after.fuse) await die(`${row.name}: this tree still reports ROOTS FUSE (${after.nearestRoots} mm) — the annulus law was measured to clear it`);
  }
  if (row.wasAgainst) {
    if (!before.against) await die(`${row.name}: the base tree does NOT report FILAMENT AGAINST STYLE (${before.nearestStyle} mm) — this row is the defect the session exists for`);
    if (after.against) await die(`${row.name}: this tree still reports FILAMENT AGAINST STYLE (${after.nearestStyle} mm)`);
  }
  if (row.noRoom) {
    if (!after.noRoomSaid) await die(`${row.name}: this tree's read-out does not say NO ROOM on the corner where the disc is inside the limit: "${after.stamenLine}"`);
    if (after.noRoom !== true) await die(`${row.name}: the descriptor reports noRoom ${after.noRoom} on the corner row`);
  }
  pairs.push({ row, before, after });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c, view, cap) => `<figure class="${c.onBase ? 'base' : 'head'}"><img src="${c.shots[view].file}"><figcaption><b>${esc(c.onBase ? 'BEFORE — the disc starts on the axis' : 'AFTER — the disc starts at the inner limit')}</b> <i>(${cap}${c.shots[view].scale > 1 ? `, camera widened ${c.shots[view].scale.toFixed(2)}x` : ''})</i><br>innermost stamen <b>${c.r0.toFixed(3)} mm</b> · outermost ${c.rN.toFixed(3)} mm${c.innerLimit !== null ? ` · limit ${c.innerLimit.toFixed(2)} mm${c.noRoom ? ' (NO ROOM)' : ''}` : ''}<br><small>${esc(c.tag)} · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · hub R ${c.hub.toFixed(2)} mm</small><br><small class="ro">${esc(c.stamenLine)}</small></figcaption></figure>`;
const html = `<title>The Vogel disc's inner limit — with and without</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.55 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:30px 0 4px}p.note{color:#9fb3a9;max-width:112ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}figure.base img{border-color:#6b4b2a}
figcaption{margin-top:8px}small{color:#7f948a}small.ro{font-family:ui-monospace,monospace;font-size:11px;line-height:1.45;display:block;margin-top:5px}</style>
<h1>The Vogel disc's inner limit — with and without (session 24)</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted. LEFT (amber border): the base tree at <b>b847f81</b>, where the disc still starts on the axis. RIGHT: this tree, where it starts at <b>r<sub>Fil</sub> + r<sub>Sty</sub></b> — where a filament's tube clears a style's, and exactly the filament-against-style flag's own threshold. Each pair shares one camera sized from the BEFORE cell.</p>
<p class="note">The law is the equal-area law re-based on the annulus [inner, R] instead of the disc [0, R] — &ldquo;start the spiral's index past zero&rdquo; with the integer rounded away, so every annulus keeps exactly the same area and the spread slider never jumps. <b>The sheet asserts, from the two trees' own numbers</b>, that the triangle count and hub radius are identical on every pair, that the inner-limit clause is absent on the base tree and present here for every disc and on neither for the ring, that ROOTS FUSE and FILAMENT AGAINST STYLE both flip, and that NO ROOM appears on the corner row.</p>
${pairs.map((p) => `<h2>${esc(p.row.name)}</h2><main>${fig(p.before, 'above', 'the hub FROM ABOVE — the view the hole lives in')}${fig(p.after, 'above', 'the hub FROM ABOVE — the view the hole lives in')}</main><main>${fig(p.before, 'hub', 'the hub, low three-quarter')}${fig(p.after, 'hub', 'the hub, low three-quarter')}</main><main>${fig(p.before, 'whole', 'whole bloom')}${fig(p.after, 'whole', 'whole bloom')}</main>`).join('')}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); base.server.close();
