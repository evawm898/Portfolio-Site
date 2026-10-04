#!/usr/bin/env node
/* shot-tile.mjs <dir> — the /tile contact sheet: the page, the tile editor (a
   point picked by a real click), the 3 x 3 preview, roller A close on its
   pegged bar, roller B close on its toothed collar, the guardrails on a
   pinched tile, and the page at phone width. Every cell is the real page; the
   only test chrome used is the camera placement for the two roller close-ups
   (there is no control that puts the camera anywhere in particular).

   Writes <dir>/*.png and <dir>/index.html. No pixel claim is made anywhere: the
   sheet is for looking at. */

import fs from 'node:fs';
import path from 'node:path';
import { openTile } from './tile-page-harness.mjs';
import { FIXTURES } from './tile-fixtures.mjs';

const OUT = path.resolve(process.argv[2] || 'tile-sheet');
fs.mkdirSync(OUT, { recursive: true });
const cells = [];
const save = (name, buf, caption) => { fs.writeFileSync(path.join(OUT, name), buf); cells.push({ name, caption }); console.log(`${name.padEnd(22)} ${caption}`); };

const s = await openTile({ storage: '', viewport: { width: 1440, height: 900 }, dsf: 2 });
const { page } = s;
const T = (f, ...a) => page.evaluate(f, ...a);
await T(() => window.__tile.flush());
await page.waitForTimeout(200);
save('page.png', await page.screenshot(), 'the page as it opens: the default tile, its 3 x 3, both rollers and the handle');

// the editor, with a point picked by a real click
const p = await T(() => window.__tile.pointScreen('A', 0, 0));
await page.mouse.click(p[0], p[1]);
save('editor.png', await page.locator('.tl-editor').screenshot(), 'the tile editor — edge A (teal) bottom and its copy on top, edge B (amber) left and right; a point picked (filled) is the same point on both copies');
save('patch.png', await page.locator('.tl-patch').screenshot(), 'the 3 x 3 — roller A cuts the teal lines, roller B the amber; they meet only at the lattice corners (dots)');
await page.keyboard.press('Escape');

// roller A: close on its pegged bar
const L = await T(() => window.__tile.layout());
await T(() => window.__tile.show('A'));
const pegMid = await T(() => window.__tile.anchorOf('A', 'peg', 2));
const pegEnd = await T(() => window.__tile.anchorOf('A', 'peg', 0));
{
  const tgt = pegMid.at.map((v, i) => 0.6 * v + 0.4 * pegEnd.at[i]);
  const dir = [pegMid.out[0] + 0.25, pegMid.out[1] + 0.55, pegMid.out[2] + 0.35];
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [tgt, dir, 2.6 * L.dA]);
}
save('roller-a.png', await page.locator('.tl-rollers').screenshot(), `roller A — ⌀ ${L.dA.toFixed(1)} mm, ${L.LA.toFixed(0)} mm long: the blades (teal) carry edge A's line round the roller; the row of white pegs on one bar presses the track`);
// whole rollers: framed by the page, then turned so the pegged bar / the collar's teeth face the camera
const turnTo = async (out) => {
  const c = await T(() => window.__tile.camera3D());
  const d = Math.hypot(...c.position.map((v, i) => v - c.target[i]));
  await T(([t, dir, r]) => window.__tile.lookAt3D(t, dir, r), [c.target, [out[0] + 0.15, out[1] + 0.75, out[2] + 0.15], d]);
};
await T(() => window.__tile.show('A'));
await turnTo(pegMid.out);
save('roller-a-whole.png', await page.locator('.tl-rollers').screenshot(), 'roller A whole, the pegged bar toward you — the groove on the right-hand end face (its +Z end) is the orientation mark');

// roller B: close on its collar
await T(() => window.__tile.show('B'));
const t0 = await T(() => window.__tile.anchorOf('B', 'tooth', 0));
const t1 = await T(() => window.__tile.anchorOf('B', 'tooth', 1));
{
  const tgt = t0.at.map((v, i) => 0.5 * v + 0.5 * t1.at[i]);
  const dir = [t0.out[0] - 0.55, t0.out[1] + 0.45, t0.out[2] + 0.25];
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [tgt, dir, 2.4 * L.dB]);
}
save('roller-b.png', await page.locator('.tl-rollers').screenshot(), `roller B — ⌀ ${L.dB.toFixed(1)} mm, ${L.LB.toFixed(0)} mm long: edge B's line in amber; the toothed collar at one end rides A's track`);
await T(() => window.__tile.show('B'));
await turnTo(t0.out);
save('roller-b-whole.png', await page.locator('.tl-rollers').screenshot(), 'roller B whole — the collar band and its teeth at one end, one tooth per bar');
await T(() => window.__tile.show('all'));

// the guardrails on a pinched tile
await T((t) => window.__tile.setDesign({ tile: t }), FIXTURES.find((f) => /pinch/.test(f.name)).tile);
await T(() => window.__tile.flush());
save('guardrails.png', await page.screenshot(), 'the guardrails — a pinched tile: its neck and spike in red on the tile and on all nine 3 x 3 copies, listed under Checks');
await s.close();

// phone width
const m = await openTile({ storage: '', viewport: { width: 390, height: 844 }, dsf: 2 });
await m.page.evaluate(() => window.__tile.flush());
save('phone.png', await m.page.screenshot({ fullPage: true }), 'at phone width: the cards stack, the panel follows');
await m.close();

const html = `<!doctype html><meta charset="utf-8"><title>/tile contact sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:12px 'Space Mono',monospace;margin:24px}figure{margin:0 0 28px}img{max-width:100%;border:1px solid #333}figcaption{color:#8A8A85;margin-top:6px}</style>
<h1 style="font-family:Georgia,serif;font-weight:600">/tile — contact sheet</h1>
${cells.map((c) => `<figure><img src="${c.name}" alt=""><figcaption>${c.name} — ${c.caption}</figcaption></figure>`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`\nwrote ${cells.length} cells to ${OUT}`);
