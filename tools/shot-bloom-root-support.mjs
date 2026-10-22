/* ===================================================================
   THE ROOT-SUPPORT SHEET (Eva's rulings, Oct 21: sepals and leaves take the
   root law at their OWN length; the foot clamp is the arc each foot owns at
   its ring). What the session leaves to Eva's eye, on one page:

   (1) A 120 mm SEPAL, BEFORE (a worktree of the base commit, served by its
       own server) and AFTER, from the side, one camera — and a macro on one
       sepal's ROOT edge-on (seen along its width) on each tree.
   (2) A 120 mm LEAF, BEFORE and AFTER — the whole leafed stem, and a macro on
       the blade's root and the petiole that carries it.
   (3) WIDE PETALS (46 mm) at 8 and 40, BEFORE and AFTER, the base from BELOW
       cropped to the hub — the foot the ring's own room allows.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the export watertight with no degenerate triangle, and the
   MEASURED thickness and foot width in the caption. The thickness is READ
   OFF THE EXPORTED FILE: the nearest skin either side of the mid-surface
   along the build's own normal at the blade's centre columns, with the
   locator (where to look, never how thick) taken from that tree's OWN
   geometry module rebuilt in Node — so a before cell is read with the base
   tree's locators and an after cell with this tree's (and the AFTER cells
   additionally pass the T family, which reads the same file). The foot width
   is the ring's EMITTED foot row (2 x its half-width) off the page's own
   metrics. No pixel delta is quoted anywhere (this renderer is not
   deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-root-support.mjs <out-dir> --base <worktree> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import * as H from './bloom-harness.mjs';

const { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl, stlPositions,
        rootTaperAssertions, settleBuild, modeTag, shownModeOf } = H;
const outDir = process.argv[2] || '/tmp/bloom-root-support';
const argOf = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = argOf('--base'), PNG_OUT = argOf('--png');
if (!BASE) { console.error('shot-bloom-root-support: --base <worktree of the base commit> is required (the BEFORE cells are a real render of the old code)'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const here = await serveRepo();
const there = await serveRepo(path.resolve(BASE));
const G_HERE = await import(pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'bloom-geometry.js')).href);
const G_BASE = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-root-support-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); there.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
const KIND = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (sets) => { const s = { ...H.DEFAULTS }; for (const w of sets) { const c = KIND.get(w.id); s[w.id] = c.kind === 'slider' ? Number(w.value) : w.value; } return s; };

/* THE FILE READER: the nearest file vertex either side of P along n, within
   5e-4 mm of the line (the T family's own construction, local to this sheet
   so a BEFORE file can be read with the base tree's locators). */
function reader(positions) {
  const cell = 0.5, map = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < positions.length; i += 3) { const k = key(positions[i], positions[i + 1], positions[i + 2]); let b = map.get(k); if (!b) map.set(k, b = []); b.push(i); }
  return (P, n, smax = 8) => {
    let top = null, bot = null; const r = Math.ceil(smax / cell) + 1;
    const cx = Math.floor(P[0] / cell), cy = Math.floor(P[1] / cell), cz = Math.floor(P[2] / cell);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const b = map.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!b) continue;
      for (const i of b) {
        const vx = positions[i] - P[0], vy = positions[i + 1] - P[1], vz = positions[i + 2] - P[2];
        const s = vx * n[0] + vy * n[1] + vz * n[2];
        if (!(Math.abs(s) > 1e-3 && Math.abs(s) <= smax)) continue;
        const lx = vx - s * n[0], ly = vy - s * n[1], lz = vz - s * n[2];
        if (lx * lx + ly * ly + lz * lz > 2.5e-7) continue;
        if (s > 0 && (top === null || s < top)) top = s;
        if (s < 0 && (bot === null || s > bot)) bot = s;
      }
    }
    return top === null || bot === null ? null : top - bot;
  };
}
/* the locators and the macro framing for one organ, from the tree's own
   module: the root row's two centre columns (u = 0 for a sepal; the first row
   clear of the rim taper for a leaf blade, whose row 0 is held by the petiole) */
function organOf(G, sets, organ) {
  const ui = stateOf(sets);
  const acc = new G.MeshBuilder({ exportMode: true });
  const rec = G.buildBloomInto(acc, ui, { below: null, capability: null, scopes: null });
  let p = null, C = [];
  if (organ === 'sepal') {
    p = rec.sepals.tiers[0].built.find(Boolean);
    C = p.rim.centre.filter((c) => c.u === 0 && (c.panel === 'full' || c.panel === 'base'));
  } else {
    p = rec.leavesBuilt.find(Boolean);
    const T = G.RIM_TAPER_MM + 1e-6;
    C = p.rim.centre.filter((c) => c.panel === 'leaf' && c.arc[0] >= T && c.arc[1] >= T && c.dBase >= T).slice(0, 1);
  }
  if (!C.length) return { rec, frame: null, at: null };
  const c = C[0];
  const at = [(c.P[0][0] + c.P[1][0]) / 2, (c.P[0][1] + c.P[1][1]) / 2, (c.P[0][2] + c.P[1][2]) / 2];
  const w = [c.P[1][0] - c.P[0][0], c.P[1][1] - c.P[0][1], c.P[1][2] - c.P[0][2]], wl = Math.hypot(...w);
  return { rec, c, at, dir: w.map((v) => v / wl), petiole: organ === 'leaf' && p.petioleAxis ? p.petioleAxis : null };
}

const VIEWS = {
  side: (f) => ({ r: Math.max(f.fit, f.across / 2) * 1.3, at: [0, 0, f.across * 0.05], dir: [0.15, -0.9, 0.4] }),
  leaf: (f) => ({ r: Math.max(f.fit, f.across / 2) * 1.15, at: [0, 0, -f.stemMm * 0.45], dir: [0.2, -1, 0.15] }),
  below: (f) => ({ r: f.R * 2.4 + 6, at: [0, 0, 0], dir: [0.05, -0.12, -1] }),
  root: (f) => ({ r: f.macro, at: f.at, dir: f.dir }),
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
    if (frac >= 0.02 && frac <= 0.98) return path.basename(file);
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

async function cell({ label, tree, sets, views, frame = null, organ = null, ruling = '' }) {
  const port = tree === 'before' ? there.port : here.port;
  const G = tree === 'before' ? G_BASE : G_HERE;
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: ${stl.boundary} boundary edges, ${stl.degenerate} degenerate`);
  const pos = stlPositions(buf);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const ui = await page.evaluate(() => window.__bloomUIState());
  if (tree === 'after') {
    const tb = rootTaperAssertions(pos, { label, set: sets }, m0, ui);
    if (tb.length) await die(`${label}: T: ${tb.join('; ')}`);
  }
  const look = reader(pos);
  let thick = null, petioleMm = null, O = null;
  if (organ) {
    O = organOf(G, sets, organ);
    if (!O.c) await die(`${label}: no ${organ} root locator on the ${tree} tree`);
    const t = [look(O.c.P[0], O.c.n[0]), look(O.c.P[1], O.c.n[1])];
    if (t.some((v) => v === null)) await die(`${label}: the file carries no skin pair at the ${organ}'s root`);
    thick = { mm: (t[0] + t[1]) / 2, u: O.c.u };
    if (O.petiole) petioleMm = 2 * O.petiole.radiusEmittedMm || null;
  }
  const r0 = m0.rings[0];
  const ff = m0.petalRingFootFrames && m0.petalRingFootFrames[0] ? m0.petalRingFootFrames[0].filter(Boolean) : [];
  const footEmittedMm = ff.length ? 2 * ff[0].h : null;
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const own = { R: m0.hubRadius, fit: m0.fitRadius, across: m0.maxDimMm, stemMm: Number(ui.stemLength) || 0 };
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const shots = {};
  for (const view of views) {
    /* the sepal's root is seen along its width from a little below (its
       underside is where the thickened root stands proud of the hub's rim) */
    const dirR = view !== 'root' ? null : organ === 'sepal' ? (() => { const d = [O.dir[0], O.dir[1], O.dir[2] - 0.45], l = Math.hypot(...d); return d.map((v) => v / l); })() : O.dir;
    const fr = view === 'root' ? { macro: organ === 'sepal' ? 22 : 11, at: O.at, dir: dirR } : (frame || own);
    shots[view] = await shoot(path.join(outDir, `${slug(tree + '-' + label)}-${view}.png`), view, fr);
  }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const lines = readout.split('\n').filter((l) => /^(ROOT TAPER|FOOT WIDTH CAPPED|FOOT ROOM UNDER|SEPAL FOOT)/.test(l));
  const rec = { label, tree, ruling, shots, own, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: m.shownTris,
    thick, petioleMm, hubMm: m0.hubThickness, foot: { built: r0.width, asked: r0.widthAskedMm ?? r0.authoredWidth, arc: r0.footArcMm ?? null, emitted: footEmittedMm, radius: r0.radius }, lines };
  console.log(`  [${tree}] ${label.padEnd(44)} ${thick ? `root ${thick.mm.toFixed(3)} mm (file, u ${thick.u.toFixed(3)})` : ''} hub ${Number(m0.hubThickness).toFixed(3)} · foot ${footEmittedMm === null ? '—' : footEmittedMm.toFixed(3)} mm emitted · ${rec.tag}`);
  return rec;
}

console.log('THE ROOT-SUPPORT SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off; thickness read off the exported file.\n');
const SEPAL = set({ sepalCount: 8, sepalLength: 120 });
const LEAF = set({ stemLength: 60, leafLength: 120 });
/* (1) sepals: one camera, sized from the AFTER cell */
const sA = await cell({ label: '8 sepals x 120 mm', tree: 'after', sets: SEPAL, views: ['root'], organ: 'sepal', ruling: 'the sepal takes the law at its own 120 mm; the hub is held to its root' });
const sB = await cell({ label: '8 sepals x 120 mm', tree: 'before', sets: SEPAL, views: ['root'], organ: 'sepal', ruling: 'the big-petals pin: a sepal\'s root was the sheet at any length' });
const sAs = await cell({ label: '8 sepals x 120 mm (whole)', tree: 'after', sets: SEPAL, views: ['side'], organ: 'sepal' });
const sBs = await cell({ label: '8 sepals x 120 mm (whole)', tree: 'before', sets: SEPAL, views: ['side'], frame: sAs.own, organ: 'sepal' });
/* (2) the leaf */
const lA = await cell({ label: 'leaf 120 mm on a 60 x 6 mm stem', tree: 'after', sets: LEAF, views: ['leaf', 'root'], organ: 'leaf', ruling: 'the blade takes the law at its own 120 mm; the petiole carries the root, CLAMPED where its rooted end must still fit the stem' });
const lB = await cell({ label: 'leaf 120 mm on a 60 x 6 mm stem', tree: 'before', sets: LEAF, views: ['leaf', 'root'], frame: lA.own, organ: 'leaf', ruling: 'never wired: the leaf was the sheet at any length, on the wire petiole' });
/* (3) wide petals, from below */
const wide = [];
for (const n of [8, 40]) {
  const S = set(n === 8 ? { petalWidth: 46 } : { petalWidth: 46, petalCount: 40 });
  const a = await cell({ label: `width 46 x ${n} petals`, tree: 'after', sets: S, views: ['below'], ruling: 'the foot capped at the arc it owns at its ring' });
  const b = await cell({ label: `width 46 x ${n} petals`, tree: 'before', sets: S, views: ['below'], frame: a.own, ruling: 'the fixed 10 mm clamp' });
  wide.push(b, a);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const nums = (c) => [
  `<b>${c.tree === 'before' ? 'BEFORE (base)' : 'AFTER'}</b> · ${esc(c.tag)}`,
  c.thick ? `root <b>${c.thick.mm.toFixed(3)} mm</b> read off the FILE (u ${c.thick.u.toFixed(3)})` : null,
  `hub ${Number(c.hubMm).toFixed(3)} mm`,
  c.petioleMm ? `petiole ${c.petioleMm.toFixed(3)} mm across (emitted)` : null,
  `foot <b>${c.foot.emitted === null ? '—' : c.foot.emitted.toFixed(3)} mm</b> emitted (asked ${Number(c.foot.asked).toFixed(2)}${c.foot.arc ? `, arc ${c.foot.arc.toFixed(2)}` : ''} at r ${c.foot.radius.toFixed(2)} mm)`,
  `${Number(c.tris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha}`,
].filter(Boolean).join(' · ') + (c.lines.length ? `<br><small>${c.lines.map(esc).join('<br>')}</small>` : '');
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap})</i>${c.ruling ? `<br><small>${esc(c.ruling)}</small>` : ''}<br>${nums(c)}</figcaption></figure>`;
const html = `<title>Root support</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>Root support — sepals and leaves take the root law; the foot is the room its ring gives it</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted. BEFORE cells are a real render of the base commit served from its own worktree; AFTER cells pass the T family on the same file. Every thickness quoted is READ OFF THE EXPORTED FILE (the nearest skin either side of the mid-surface at the blade's centre columns, located by that tree's own geometry). The law is the big-petals cantilever against the shipping 35 mm petal on the sheet — UNVALIDATED, nothing here has been printed.</p>
<h2>1. A 120 mm sepal — the root, edge-on (seen along its width)</h2>
<main>${fig(sB, 'root', 'macro on one sepal root')}${fig(sA, 'root', 'macro on one sepal root')}</main>
<main>${fig(sBs, 'side', 'from the side, one camera')}${fig(sAs, 'side', 'from the side, one camera')}</main>
<h2>2. A 120 mm leaf — the leafed stem, and the blade's root on its petiole</h2>
<main>${fig(lB, 'leaf', 'the stem and its leaves, one camera')}${fig(lA, 'leaf', 'the stem and its leaves, one camera')}</main>
<main>${fig(lB, 'root', 'macro on the blade root, along its width')}${fig(lA, 'root', 'macro on the blade root, along its width')}</main>
<h2>3. Wide petals (46 mm) — the base from below, cropped to the hub</h2>
<p class="note">The foot each petal stands on: at 8 petals the ring's arc (2&pi;r / 8) holds more than the fixed 10 mm clamp allowed, so the foot is the asked 18.4 mm; at 40 petals the arc is under 10 mm and the foot is capped to it — crowded caps lower, sparse ones higher, as ruled. The ring itself stands where the asked feet put it (the area rule over the asked foot, floored).</p>
<main>${wide.map((c) => fig(c, 'below', 'from below')).join('')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); here.server.close(); there.server.close();
