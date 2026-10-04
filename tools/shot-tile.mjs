#!/usr/bin/env node
/* shot-tile.mjs <dir> — the /tile contact sheet: the page, the tile editor (a
   point picked by a real click), the 3 x 3 preview, each roller WHOLE at an
   angle where its rings visibly wrap round the cylinder (Eva's ruling: every
   blade is a closed ring running AROUND the roller, never a bar along it),
   roller A close on its slanted peg row, roller B close on its toothed collar,
   the guardrails on a pinched tile, and the page at phone width. Every cell is
   the real page; the only test chrome used is the camera placement for the
   roller views (there is no control that puts the camera anywhere in
   particular).

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

// each roller whole, framed by the page and then turned so the camera looks
// along its axis as much as across it: a ring that runs AROUND the roller then
// reads as a band circling the body (a bar along it would read as a line down
// it). World x is the roller's axis, +x its +Z end (A's groove, B's collar).
const L = await T(() => window.__tile.layout());
const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const WRAP = norm([0.7, 0.45, 0.7]);
const wrapView = async (which, pull) => {
  await T((w) => window.__tile.show(w), which);
  const c = await T(() => window.__tile.camera3D());
  const d = Math.hypot(...c.position.map((v, i) => v - c.target[i]));
  await T(([t, dd, r]) => window.__tile.lookAt3D(t, dd, r), [c.target, WRAP, d * pull]);
};
// the marks facing the camera most: a peg (A) or tooth (B) and its neighbour
const facing = async (which, kind) => {
  const all = [];
  for (let i = 0; ; i++) { const a = await T(([w, k, j]) => window.__tile.anchorOf(w, k, j), [which, kind, i]); if (!a) break; all.push(a); }
  const score = (a) => a.out[0] * WRAP[0] + a.out[1] * WRAP[1] + a.out[2] * WRAP[2];
  return all.sort((p, q) => score(q) - score(p));
};

await wrapView('A', 0.85);
save('roller-a.png', await page.locator('.tl-rollers').screenshot(), `roller A whole — ⌀ ${L.dA.toFixed(1)} mm, ${L.LA.toFixed(0)} mm long: ${L.ringsA} teal rings, each edge A's line closed round the roller like a pizza-wheel edge; it rolls along edge A. The white pegs, one on each ring, are the row that presses the track; the groove ring on the near end face (its +Z end) is the orientation mark`);

// roller A: close on two pegs, each standing on its own ring
await T(() => window.__tile.show('A'));
{
  const [p0, p1] = await T(() => [window.__tile.anchorOf('A', 'peg', 1), window.__tile.anchorOf('A', 'peg', 2)]);
  const tgt = p0.at.map((v, i) => 0.5 * v + 0.5 * p1.at[i]);
  const dir = norm([p0.out[0] - 0.45, p0.out[1] + 0.55, p0.out[2] + 0.35]);
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [tgt, dir, 1.9 * L.dA]);
}
save('roller-a-pegs.png', await page.locator('.tl-rollers').screenshot(), `roller A close on its peg row — each white peg stands on its own ring, at that ring's corner of the track column; at 90° the row runs straight along the roller`);

// the same on a tile at 60°: the peg row slants round the roller with the lines
await T((t) => window.__tile.setDesign({ tile: t }), FIXTURES.find((f) => /hook/.test(f.name)).tile);
await T(() => window.__tile.flush());
const LH = await T(() => window.__tile.layout());
{
  // turned so the pegs face the camera: their mean outward direction, plus the axial lean
  await T(() => window.__tile.show('A'));
  const pegs = await facing('A', 'peg');
  const o = norm([0, pegs.reduce((t, q) => t + q.out[1], 0), pegs.reduce((t, q) => t + q.out[2], 0)]);
  const c = await T(() => window.__tile.camera3D());
  const d = Math.hypot(...c.position.map((v, i) => v - c.target[i]));
  await T(([t, dd, r]) => window.__tile.lookAt3D(t, dd, r), [c.target, norm([0.55, 0.8 * o[1] + 0.25, 0.8 * o[2]]), d * 0.85]);
}
save('roller-a-60.png', await page.locator('.tl-rollers').screenshot(), `roller A for the hook tile at 60° — ⌀ ${LH.dA.toFixed(1)} mm: its rings are ${(34 * Math.sin(Math.PI / 3)).toFixed(1)} mm apart (pitch B · sin θ) and each is turned |tB| cos θ further round than the last, so the peg row SLANTS round the roller — a straight row along it only at 90°`);
await T((t) => window.__tile.setDesign({ tile: t }), FIXTURES.find((f) => f.name === 'default').tile);
await T(() => window.__tile.flush());

// roller B whole, from its collar end
await wrapView('B', 1.15);
save('roller-b.png', await page.locator('.tl-rollers').screenshot(), `roller B whole — ⌀ ${L.dB.toFixed(1)} mm, ${L.LB.toFixed(0)} mm long: ${L.ringsB} amber rings of edge B's line, each closed round the roller; it rolls along edge B. The toothed collar on the near end, one tooth per tile round it, rides A's track`);

// roller B: close on its collar, on the two teeth that face the camera most
await T(() => window.__tile.show('B'));
{
  const [t0, t1] = await facing('B', 'tooth');
  const tgt = t0.at.map((v, i) => 0.5 * v + 0.5 * t1.at[i]);
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [tgt, norm([0.6, 0.5, 0.62]), 1.5 * L.dB]);
}
save('roller-b-collar.png', await page.locator('.tl-rollers').screenshot(), `roller B close on its collar — white teeth on a raised band beyond the first ring, one per tile round it; seating any one tooth in any dimple fixes both B's sideways position and its phase`);
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
