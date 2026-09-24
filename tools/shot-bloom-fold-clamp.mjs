/* ===================================================================
   shot-bloom-fold-clamp.mjs — THE FOLD CLAMP, LOOKED AT
   (Eva's ruling on the 36 undeclared census rows, the apex-nib session:
   "a small sheet: rows C, petalCup min (-0.8) and sepalCup min; columns
   current branch | cup fix; PRINT PREVIEW, tip close-ups.")

     node tools/shot-bloom-cup-nib.mjs <dir> --nofix <worktree of the pre-fix head>

   WHAT THE SHEET IS ABOUT. `sectAt`'s cup term is `c * a^2 / hb`, so the
   mid-surface cross-section leaves the midrib with radius `hb/(2c)`; a sheet
   is that surface offset by +/- t/2, and an offset surface INVERTS where the
   offset exceeds the radius. The nib draws the outline down to
   APEX_END_HALF_MM, so the radius follows it down and the skins fold. The fix
   scales the cup coefficient by `h / TIP_HALF_MM` INSIDE THE NIB ONLY, which
   is exactly 1 at the nib's entry (the entry IS the law's crossing of
   TIP_HALF_MM) and makes the curvature constant across the nib at the value
   it already had there. So the question a picture has to answer is whether
   the tip visibly stops curling — the numbers say the fold is gone, and only
   the eye says what it cost.

   TWO TREES, SERVED, NOT MUTATED (`shot-bloom-seam-ruling.mjs`'s rule): the
   pre-fix head and this working tree, each over its own HTTP server.

   THE CAMERA IS SHARED ACROSS A ROW and measured once on the FIX tree, then
   written verbatim to both — the fix moves no outline, so unlike the A8
   sheet there is no drawn-length difference to make a shared centre wrong.

   EVERY NUMBER IN A CAPTION IS MEASURED IN THE PAGE THAT CELL RENDERS,
   except the census pair counts, which are Node's and are LABELLED as such.

   NO PIXEL DELTA IS QUOTED — two trees, two servers, two page sessions.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, shownModeOf, buildMatrix } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-cup-nib';
const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null; };
const NOFIX = argOf('--cuponly');
if (!NOFIX) { console.error('usage: node tools/shot-bloom-fold-clamp.mjs <dir> --cuponly <worktree of the cup-scale-only head>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CENSUS = JSON.parse(argOf('--census') ? fs.readFileSync(argOf('--census'), 'utf8') : '{}');

const matrix = buildMatrix();
const rowOf = (p) => { const r = matrix.find((x) => x.label.startsWith(p)); if (!r) { console.error('no row ' + p); process.exit(2); } return r; };

const SIX = [
  ['cupgrad',  'petalCupGradient max (1.2)'],
  ['gradthin', 'GRADIENT: cup gradient max x ALL THIN x spread min'],
  ['sepalcup', 'SEPALS: sepalCup min (-0.8)'],
  ['slotmin',  'SLOT: ALL MIN x 2 whorls in step'],
  ['fanpetal', 'FAN x PER-PETAL: petal 1 x 3 layers x inner*'],
  ['lobes666', 'LOBES: x cup 1.2'],
];
const ROWS = SIX.map(([key, prefix]) => {
  const r = rowOf(prefix);
  return { key, title: r.label, label: r.label, set: r.set, note: '' };
});
const TREES = [
  { key: 'nofix', root: NOFIX, label: 'cup scale only' },
  { key: 'fix', root: HERE, label: 'cup scale + FOLD CLAMP' },
];

function die(msg) { console.error('HARNESS INVALID: ' + msg); process.exit(2); }
const servers = [];
async function treePage(root) {
  const { server, port } = await serveRepo(root);
  servers.push(server);
  const { browser, page } = await launchPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 2 });
  return { browser, page, port };
}

async function measure(page) {
  return page.evaluate(() => {
    const m = window.__bloomMetrics();
    const pu = (m.petalProfileU || []), pr = (m.petalProfile || []);
    const cap = m.petalTipCap || null, apex = cap && cap.apex;
    const lastH = pr.length ? pr[pr.length - 1] : null;
    const onNibRows = (apex && apex.active && apex.xLawMm != null && apex.drawnLengthMm)
      ? pu.filter((u) => u > 0 && u * apex.drawnLengthMm > apex.xLawMm + 1e-12).length : null;
    const cc = (m.petalForm && m.petalForm.cupClamp) || (m.petalCupClamp || null);
    return { clamp: cc, tris: m.exportTris ?? m.liveTris ?? null,
             drawn: apex && apex.active ? apex.drawnLengthMm : (m.petalLengthMm ?? null),
             lastH, onNibRows, nibFromU: apex && apex.active ? (apex.xLawMm / apex.drawnLengthMm) : null,
             sheet: m.sheetThicknessMm ?? null };
  });
}

async function cell({ page, port, row, file, frame }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, row.set);
  if (bad.length) die(`${row.label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) die(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const still = await stillFrame(page);
  if (still.length) die(`${row.label}: ${still.join('; ')}`);
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  await page.waitForTimeout(150);
  const mode = await shownModeOf(page);
  if (mode !== 'export') die(`${row.label}: print preview ON asked for, app reports shownMode "${mode}"`);
  const met = await measure(page);
  const fit = frame ? frame : await page.evaluate(() => {
    const m = window.__bloomMetrics();
    const v3 = (q, d) => (q ? [q[0] ?? q.x, q[1] ?? q.y, q[2] ?? q.z] : d);
    const t = v3(m.petalTip, [30, 0, 12]), nv = v3(m.petalNormal, [0, 0, 1]);
    const mid = v3(m.petalMid, [t[0] * 0.6, 0, t[2] * 0.6]);
    /* EDGE ON, NOT FACE ON — this sheet is about a cross-section curling, so
       the camera looks ALONG the blade's own length at the tip. `petalTip`
       and `petalMid` are the builder's; the direction is the one that puts
       the section in the picture plane. */
    const along = [0, 1, 2].map((i) => t[i] - mid[i]);
    const L = Math.hypot(...along) || 12;
    const dir = along.map((x) => x / L);
    const near = [0, 1, 2].map((i) => t[i] + (mid[i] - t[i]) * 0.10);
    return { nib: { r: 2.2, at: t, dir: nv },
             sect: { r: 2.6, at: near, dir },
             tip: { r: L * 0.30, at: [0, 1, 2].map((i) => t[i] + (mid[i] - t[i]) * 0.22), dir: nv } };
  });
  const notes = [];
  for (const view of ['sect', 'nib']) {
    await page.evaluate((f) => window.__bloomFrame(f.r, 0.05, f.at, f.dir), fit[view]);
    let prev = null, settled = false;
    const f = file.replace(/\.png$/, `-${view}.png`);
    for (let i = 0; i < 40 && !settled; i++) {
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 760, height: 760 } });
      if (prev && Buffer.compare(prev, buf) === 0) { fs.writeFileSync(f, buf); settled = true; }
      prev = buf;
    }
    if (!settled) { fs.writeFileSync(f, prev); notes.push(`${view}: no two identical frames`); }
  }
  return { fit, mode, met, notes };
}

const out = [];
for (const row of ROWS) {
  let frame = null;
  const got = {};
  /* THE FIX TREE GOES FIRST so its camera is the one both cells share. */
  for (const tree of [TREES[1], TREES[0]]) {
    const { browser, page, port } = await treePage(tree.root);
    const r = await cell({ page, port, row, frame, file: path.join(outDir, `${row.key}-${tree.key}.png`) });
    if (!frame) frame = r.fit;
    got[tree.key] = r;
    await browser.close();
  }
  out.push({ row, got });
  console.log(`${row.key}: nofix tris ${got.nofix.met.tris}  fix tris ${got.fix.met.tris}  ` +
              `lastH ${got.fix.met.lastH?.toFixed(5)}  nib from u ${got.fix.met.nibFromU?.toFixed(6)}  ` +
              `rows on nib ${got.fix.met.onNibRows}`);
}
for (const s of servers) s.close();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let html = `<!doctype html><meta charset="utf-8"><title>The cup at the nib</title>
<style>body{background:#0A0A0C;color:#d8d8d8;font:14px/1.5 ui-monospace,monospace;margin:28px;max-width:1700px}
h1{font-size:20px}h2{font-size:16px;margin-top:34px;border-bottom:1px solid #333;padding-bottom:6px}
table{border-collapse:collapse;margin:10px 0}td{vertical-align:top;padding:6px}
img{width:420px;display:block;border:1px solid #222}
.cap{font-size:12px;color:#9a9a9a;max-width:420px;margin-top:5px}
.k{color:#6fb7ae}.note{color:#b9b9b9;max-width:1100px}</style>
<h1>The cup at the nib — current branch against the cup fix</h1>
<p class=note>The cup term is <span class=k>c&middot;a&sup2;/hb</span>, so the mid-surface cross-section leaves the midrib with radius <span class=k>hb/(2c)</span>. A sheet is that surface offset by &plusmn;t/2, and an offset surface inverts where the offset exceeds the radius. The nib draws the outline down to <span class=k>APEX_END_HALF_MM</span> = 0.05&nbsp;mm, so the radius follows it down: measured on <span class=k>petalCup min (&minus;0.8)</span> it runs 0.12544&nbsp;mm at the nib's entry row to 0.03125 at its end, against a half-thickness of 0.6000. Main never reached it because main's outline stopped at the 0.80&nbsp;mm floor.</p>
<p class=note>The fix scales the cup coefficient by <span class=k>h / TIP_HALF_MM</span> inside the nib and nowhere else. The nib's entry is by construction the station where the law crosses <span class=k>TIP_HALF_MM</span>, so the factor is exactly 1 there and the blade below is untouched to the bit; above it the curvature is <span class=k>2c/TIP_HALF_MM</span>, constant across the whole nib at the value it already had at the entry.</p>
<p class=note>Print preview is ON in every cell and every caption carries the app's own <span class=k>shownMode</span>. No pixel delta is quoted &mdash; two trees, two servers, two page sessions.</p>`;
for (const { row, got } of out) {
  html += `\n<h2>${esc(row.title)}</h2><p class=note>${esc(row.note)}</p>`;
  const cen = CENSUS[row.label] || null;
  if (cen) html += `<p class=note>Census (Node, EXPORT, within-shell): current branch <span class=k>${cen.before}</span> pairs &middot; with the fix <span class=k>${cen.after}</span> &middot; on main <span class=k>${cen.main ?? 0}</span>.</p>`;
  for (const view of ['sect', 'nib', 'tip']) {
    html += `<table><tr>`;
    for (const tree of TREES) {
      const g = got[tree.key], m = g.met;
      html += `<td><img src="${row.key}-${tree.key}-${view}.png"><div class=cap><b>${esc(tree.label)}</b> &middot; ${view}<br>
        shownMode <span class=k>${esc(g.mode)}</span> &middot; ${m.tris?.toLocaleString?.() ?? m.tris} tris<br>
        drawn ${m.drawn?.toFixed(4)} mm &middot; last half-width ${m.lastH?.toFixed(5)} mm<br>
        nib from u ${m.nibFromU?.toFixed(6)} &middot; ${m.onNibRows} rows on it<br>
        ${m.clamp ? `<b>CUP CLAMPED</b> at u ${m.clamp.u.toFixed(4)} &middot; asked R ${m.clamp.askedRadiusMm.toFixed(4)} mm, drawn ${m.clamp.drawnRadiusMm.toFixed(4)} &middot; ${m.clamp.rows} rows` : 'cup clamp: did not bind'}
        ${g.notes.length ? '<br><b>' + esc(g.notes.join('; ')) + '</b>' : ''}</div></td>`;
    }
    html += `</tr></table>`;
  }
}
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('\nwrote ' + path.join(outDir, 'index.html'));
