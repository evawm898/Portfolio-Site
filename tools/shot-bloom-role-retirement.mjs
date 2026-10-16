#!/usr/bin/env node
/* ===================================================================
   THE ROLE RETIREMENT SHEET — the stop point's before/after (Q3.4 / Q3.5,
   and Eva's Oct 14 ruling that the RADIAL labellum and hood are DROPPED, not
   migrated). Read docs/bloom-role-retirement-outcome.md beside it.

   Every pair is ONE matrix row built on two trees: BEFORE is a real render
   of the old code, served from a git worktree of the base commit (f95b244)
   over its own HTTP server, where the role controls are live; AFTER is this
   tree, where the same stored set is migrated by `migrateRoles` on the way
   in (the harness's applyConfig does it for the served tree) — the RADIAL
   labellum and hood dropped and told, everything else carried as scope
   offsets. The rows are the class-(a) movers the partition predicted from
   the BASE tree's own records (tools/verify-bloom-role-retirement.mjs); THE
   IRIS ON A SPIRAL, which since Eva's ruling of Oct 16 (a spiral's turns are
   layer scopes) migrates onto a turn entry and must NOT move — its caption
   carries the Node byte comparison of the two trees' export streams, both
   modes; class (b), the FOOT FOLLOWS (her second ruling of Oct 16), drawn
   from this tree's block 64 — no stored row of the base owns a width under
   per-layer values, so these sets are handed to BOTH pages as a scope record
   (`__bloomScopes`, which the base tree has had since Scoping-a): BEFORE the
   offset rides on top of the ramp with the foot and ring on the ramp (and a
   SPIRAL's layer entry is inert there), AFTER the layer's own width builds
   its foot and ring; and a FAN per-petal row as the CONTROL that must not
   move (the exact migration).

   PRINT PREVIEW IS ON in every cell — the app's own `shownMode` is asserted
   to read 'export' and `liveTris` null. The camera is FACE-ON (down the axis,
   +x at the bottom of the frame — the orchid sheet's declared orientation,
   so the labellum sits below) at a radius read from the BEFORE build's own
   `maxDimMm`, and the AFTER cell takes the SAME camera, so a pair differs
   only in the geometry. NO PIXEL DELTA IS QUOTED for any pair: two trees,
   two servers, two page sessions, which this renderer does not support as a
   comparison. Every cell settles to three byte-identical frames.

   RUN:  node tools/shot-bloom-role-retirement.mjs <out-dir> --base <worktree of f95b244> [--only <regex>]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { migrateRoles, DEFAULTS, CONTROLS } from '../bloom-registry.js';

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/bloom-role-retirement';
const baseArg = process.argv.indexOf('--base');
const BASE = baseArg >= 0 ? process.argv[baseArg + 1] : null;
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom.html'))) {
  console.error('shot-bloom-role-retirement: need --base <worktree of f95b244, the tree BEFORE the retirement>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
/* the rows' sets come from the BASE tree's own matrix — the rows as they were */
const BH = await import(pathToFileURL(path.join(path.resolve(BASE), 'tools/bloom-harness.mjs')).href);
const BASE_ROWS = new Map(BH.buildMatrix().map((r) => [r.label, r]));
/* class (b)'s rows are THIS tree's (block 64): the base matrix holds none */
const HH = await import('./bloom-harness.mjs');
const HEAD_ROWS = new Map(HH.buildMatrix().map((r) => [r.label, r]));
/* THE BYTE COMPARISON a must-hold pair carries in its caption: the base row
   built on the base geometry as stored, and on this geometry after this
   registry's migration, every export float compared under Object.is, both
   modes (the partition tool's own comparison, for the one row on the sheet) */
const BG = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const HG = await import('../bloom-geometry.js');
const HR = await import('../bloom-registry.js');
const HF = await import('../bloom-file.js');
function bytesSame(row) {
  const coerce = (C, D, set) => { const k = new Map(C.map((c) => [c.id, c.kind])); const st = { ...D }; let sc = null; for (const w of set) { if (w.id === HR.SCOPES_SET_ID) { sc = w.value; continue; } st[w.id] = k.get(w.id) === 'slider' ? Number(w.value) : w.value; } return { st, sc }; };
  const b = coerce(BH.CONTROLS, BH.DEFAULTS, BH.migrateSet(row.set)), h = coerce(HR.CONTROLS, HR.DEFAULTS, HR.migrateSet(row.set));
  let floats = 0, differ = 0;
  for (const exportMode of [false, true]) {
    const A = new BG.MeshBuilder({ exportMode }); BG.buildBloomInto(A, { ...b.st }, { below: null, capability: row.capability || null });
    const B = new HG.MeshBuilder({ exportMode }); HG.buildBloomInto(B, { ...h.st }, { below: null, capability: row.capability || null, scopes: HF.scopesForBuild(h.sc) });
    floats += A.positions.length;
    if (A.positions.length !== B.positions.length) differ += Math.max(A.positions.length, B.positions.length);
    else for (let i = 0; i < A.positions.length; i++) if (!Object.is(A.positions[i], B.positions[i])) differ++;
  }
  return { floats, differ };
}
/* THE BASE TREE'S OWN CONTROL KINDS, handed to applyConfig for every BEFORE
   cell: without them the harness migrates against THIS tree's registry and
   the base page is handed a set with its labellum already dropped — a
   BEFORE cell drawing the AFTER bloom, which is what the first run of this
   sheet photographed (session 20's served-tree rule) */
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);
const BASE_KINDS = Object.fromEntries(BR.CONTROLS.map((c) => [c.id, c.kind]));

const VIEW = 520, DPR = 1.5;
const here = await serveRepo();
const there = await serveRepo(path.resolve(BASE));
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); there.server.close(); process.exit(2); }); }

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 120; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return k;
    a = b; b = c;
  }
  return -1;
}
async function previewOn(id) {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const got = await shownModeOf(page);
  if (got !== 'export') await die(`${id}: print preview ON asked for, app reports shownMode "${got}"`);
}
/* FACE-ON: down the axis, +x (slot 0, the labellum's slot) at the BOTTOM */
const FACE = [0, 0, 1], UP = [-1, 0, 0];

async function cell(row, treeName, radius) {
  const tree = treeName === 'base' ? there : here;
  await openBloom(page, tree.port);
  const bad = await applyConfig(page, row.set, treeName === 'base' ? BASE_KINDS : null);
  if (bad.length) await die(`${row.label} [${treeName}]: ${bad.join('; ')}`);
  await previewOn(row.label);
  const still = await stillFrame(page);
  if (still.length) await die(`${row.label} [${treeName}]: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${row.label} [${treeName}]: not the export build on screen`);
  const r = radius ?? (m.maxDimMm / 2) * 1.08;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, [0, 0, 0], a.dir, a.up), { r, dir: FACE, up: UP });
  const settled = await settleOnly();
  if (settled < 0) await die(`${row.label} [${treeName}]: never came to rest`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  const scopes = await page.evaluate(() => (window.__bloomDesign ? window.__bloomDesign.scopes() : null));
  /* on the BEFORE page the role controls must have been written as asked —
     read back off the page, so a migrated BEFORE cell cannot pass silently */
  if (treeName === 'base') {
    const roleIds = row.set.map((w) => w.id).filter((id) => /^(all|inner|labellum|hood|petal\d)/.test(id));
    const got = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, document.getElementById(id) ? document.getElementById(id).value : null])), roleIds);
    for (const id of roleIds) { const want = row.set.find((w) => w.id === id).value; if (got[id] === null || Number(got[id]) !== Number(want)) await die(`${row.label} [base]: ${id} reads ${got[id]} on the base page, asked ${want}`); }
  }
  return { buf, m, r, scopes };
}

/* ---- the rows --------------------------------------------------------- */
const PAIRS = [
  { cls: 'a', label: 'ORCHID: the labellum and the hood (the flower has a face) x 2 whorls in step', title: 'THE ORCHID at two whorls in step' },
  { cls: 'a', label: 'ORCHID x 3 layers x phase 0 (slot roles x layer roles)', title: 'the orchid on three layers' },
  { cls: 'a', label: 'ORCHID x petalCount 40 (even at scale) x 2 whorls in step', title: 'the orchid at 40 petals' },
  { cls: 'a', label: 'ORCHID x the IRIS (both role axes, one bloom)', title: 'the orchid x the iris — the INNER half carried, the face dropped' },
  { cls: 'a', label: 'DOME: rise 1 x ORCHID at two whorls in step', title: 'the orchid on a hemisphere' },
  { cls: 'a', label: 'SLOT: ALL MAX x 2 whorls in step', title: 'every slot-role slider at its maximum' },
  { cls: 'a', label: 'CURL: ORCHID x labellum curl x bias max (the modifier rides the COMPOSED curl)', title: 'the labellum curl with the curl bias' },
  { cls: 'hold', label: 'ZYGO: the iris x SPIRAL (roles exist, azimuth differs)', title: 'MUST HOLD: the iris on a SPIRAL — its INNER carried onto turn 2 (a spiral\'s turns are layer scopes, Oct 16)', bytes: true },
  { cls: 'b', head: true, label: 'PER-LAYER: RADIAL x 3 layers — layer 2 owns a 12 mm width, layer 1 a 14 mm one (the foot and the ring follow; layer 1\'s ring stays the rim)', title: 'class (b): an owned width drives the foot and the ring (RADIAL)' },
  { cls: 'b', head: true, label: 'PER-LAYER: SPIRAL x 3 turns — turn 2 owns its width, turn 3 its length and tilt (no foot, no ring)', title: 'class (b): the same on a SPIRAL — inert on the base, where per-layer values were RADIAL only' },
  { cls: 'b', head: true, label: 'PER-LAYER: RADIAL x 4 layers — layer 4 asks a width past the outer whorl\'s (the HUB GROWS to its ring, told)', title: 'class (b): a ring that asks past the rim GROWS THE HUB to it (Oct 16)' },
  { cls: 'control', label: 'FAN x PER-PETAL: a MIDDLE group only (petal 2 — an orbit that was LATERAL and had no controls)', title: 'CONTROL: a FAN group, migrated EXACTLY to a pair scope' },
];
const chosen = ONLY ? PAIRS.filter((p) => ONLY.test(p.label)) : PAIRS;
const kindOf = new Map(CONTROLS.map((c) => [c.id, c.kind]));
const shots = [];
for (const p of chosen) {
  const row = p.head ? HEAD_ROWS.get(p.label) : BASE_ROWS.get(p.label);
  if (!row) await die(`"${p.label}" is not a row of the ${p.head ? "THIS tree's" : 'BASE'} matrix`);
  const before = await cell(row, 'base', null);
  const after = await cell(row, 'here', before.r);
  /* the migration's own notes, from THIS tree's registry — what the design file would tell */
  const whole = { ...DEFAULTS };
  for (const w of row.set) whole[w.id] = kindOf.get(w.id) === 'slider' ? Number(w.value) : (kindOf.has(w.id) ? w.value : Number(w.value));
  const notes = migrateRoles(whole).notes.filter((n) => n.kind !== 'identity').map((n) => `[${n.kind}] ${n.text}`);
  const same = p.bytes ? bytesSame(row) : null;
  if (same) { notes.push(`[measured] ${same.differ} of ${same.floats.toLocaleString()} export floats differ between the two trees, live and export, under Object.is`); if (same.differ) await die(`${p.label}: a must-hold pair moved ${same.differ} floats`); }
  if (p.head) {
    const rings = after.m.rings || [];
    notes.push(`[after] rings ${rings.map((r) => `${r.radius.toFixed(2)} mm${r.ownWidth !== null && r.ownWidth !== undefined ? ` (own ${r.ownWidth} mm, foot ${r.width.toFixed(2)})` : ''}`).join(' / ')} · hub ${Number(after.m.hubRadius).toFixed(2)} mm${after.m.hubGrowth ? ` (GROWN +${after.m.hubGrowth.byMm.toFixed(2)} mm for layer ${after.m.hubGrowth.layer + 1})` : ''}`);
    notes.push(`[before] rings ${(before.m.rings || []).map((r) => `${r.radius.toFixed(2)} mm (foot ${r.width.toFixed(2)})`).join(' / ')} · hub ${Number(before.m.hubRadius).toFixed(2)} mm`);
  }
  shots.push({ ...p, row, before, after, notes });
  console.log(`${p.cls}  ${p.label}\n    before ${modeTag(before.m)} · ${before.m.shownTris} tris · r ${before.r.toFixed(1)} mm\n    after  ${modeTag(after.m)} · ${after.m.shownTris} tris · scopes ${JSON.stringify(after.scopes)}\n    ${notes.join('\n    ')}`);
}

/* ---- compose ONE image -------------------------------------------------- */
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tris = (m) => (m.shownTris ?? "?");
const scopeLine = (s) => !s ? 'no scope record' : [
  ...(s.layers || []).map((e) => `layer ${e.layer + 1}: ${Object.entries(e.offsets).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${+v.toFixed(3)}`).join(', ')}`),
  ...(s.petals || []).map((e) => `layer ${e.layer + 1} pair ${e.slot}: ${Object.entries(e.offsets).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${+v.toFixed(3)}`).join(', ')}`)].join(' · ') || 'an empty record';
const pairHtml = (s) => `<div class="pair">
  <h3>${s.cls === 'a' ? '(a) ' : ''}${esc(s.title)}</h3>
  <p class="lbl">${esc(s.label)}</p>
  <div class="grid">
    <figure><img src="${dataUri(s.before.buf)}"><figcaption><b>BEFORE</b> — f95b244, ${s.head ? 'the same scope record (an offset on top of the ramp, the foot and ring the ramp\'s)' : 'the role controls live'} · ${tris(s.before.m)} tris · ${esc(modeTag(s.before.m))}</figcaption></figure>
    <figure><img src="${dataUri(s.after.buf)}"><figcaption><b>AFTER</b> — this tree, the stored set migrated · ${tris(s.after.m)} tris · ${esc(modeTag(s.after.m))}<br>${esc(scopeLine(s.after.scopes))}</figcaption></figure>
  </div>
  <p class="notes">${s.notes.map(esc).join('<br>') || '(nothing to migrate)'}</p>
</div>`;
const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h3{font-size:14.5px;margin:22px 0 2px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 8px;max-width:1080px}
  .lbl{color:#8d8d8d;font-size:11.5px;margin:0 0 6px}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:1080px}
  figure{margin:0} img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:5px;line-height:1.4}
  .notes{color:#a8a8a8;font-size:11px;margin:6px 0 0;max-width:1080px;line-height:1.4}
  b{color:#e8e8e8}
</style>
<h1>The role retirement — (a) the RADIAL labellum and hood dropped, (b) the foot follows an owned width, and the iris held</h1>
<p class="sub">Each pair is ONE matrix row on two trees, FACE-ON (slot 0 — the labellum's — at the bottom), print preview ON (<code>shownMode</code> 'export' asserted), the AFTER cell on the BEFORE cell's own camera. BEFORE is a real render of f95b244 served from its own worktree; AFTER is this tree with the stored set migrated by <code>migrateRoles</code>. The notes under each pair are the migration's own words, what a design file loading that set is told. No pixel delta is quoted: two trees, two servers, two page sessions.</p>
${shots.map(pairHtml).join('\n')}`;
await page.setViewportSize({ width: 1130, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'role-retirement.png'), sheet);
console.log(`\nwrote ${path.join(outDir, 'role-retirement.png')}`);
await browser.close(); here.server.close(); there.server.close();
