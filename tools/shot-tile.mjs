#!/usr/bin/env node
/* shot-tile.mjs <dir> — the /tile contact sheet: the page, the tile editor (a
   point picked by a real click), the 3 x 3 preview, each roller WHOLE at an
   angle where its rings visibly wrap round the cylinder (Eva's ruling: every
   blade is a closed ring running AROUND the roller, never a bar along it),
   roller A close on its fiducial pin, the start detent (the notch in the end
   face and the handle's tab clicked into it), roller B IN USE with a sight
   arm's pointer hanging over the contact line and its pinhole, B at 60° on its
   two pinholes, the guardrails on a pinched tile, and the page at phone
   width. Every cell is
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
save('page.png', await page.screenshot(), 'the page as it opens: the default tile, its 3 x 3, both rollers and the handles');

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
await wrapView('A', 0.85);
save('roller-a.png', await page.locator('.tl-rollers').screenshot(), `roller A whole — ⌀ ${L.dA.toFixed(1)} mm, ${L.LA.toFixed(0)} mm long: ${L.ringsA} teal rings, each edge A's line closed round the roller like a pizza-wheel edge; it rolls along edge A. The white pin on its first ring is the fiducial; the groove ring on the near end face (its +Z end) is the orientation mark`);

// roller A: close on its fiducial pin, standing on ring 0 at a corner
await T(() => window.__tile.show('A'));
{
  const p0 = await T(() => window.__tile.anchorOf('A', 'pin', 0));
  const dir = norm([p0.out[0] + 0.35, p0.out[1] + 0.25, p0.out[2] + 0.45]);
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [p0.at, dir, 0.75 * L.dA]);
}
save('roller-a-pin.png', await page.locator('.tl-rollers').screenshot(), `roller A close on its fiducial pin — a ${3} mm post standing on the first ring at a tile corner, flush with the blade tips (so it punches through the dough and never lifts the roller), flaring 45° into the body. On the default design the two fiducials B needs are exactly one revolution of A apart, so ONE pin lays both`);

// the notch alone: roller B's −Z end face, nothing mounted, at a grazing angle
await T(() => window.__tile.show('B'));
{
  const n = await T(() => window.__tile.notchAnchor('B'));
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [n.at, norm([-0.55 + 0.5 * n.out[0], 0.5 * n.out[1] + 0.2, 0.5 * n.out[2]]), 22]);
}
save('notch.png', await page.locator('.tl-rollers').screenshot(), `the detent notch on roller B's −Z end face, nothing mounted — a 90° V, ${0.6} mm deep, running radially; the handle's nub drops into it at the roller's start pose (the contact line is on the opposite side, at the bottom)`);
// the detent: roller B in use, close on its −Z end face: the notch and the tab's nub in it
{
  let u = await T(() => window.__tile.useView('B', true));
  // the −Z end is at world x = −L/2; the notch is at the TOP (opposite the contact), at radius notchR; the handle ghosted
  const tgt = [-u.L / 2, u.notchR - 2, 0];
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [tgt, norm([-1, 0.35, 0.3]), 0.55 * u.Rtip]);
  save('detent.png', await page.locator('.tl-rollers').screenshot(), `the start detent on roller B's −Z end — the handle (ghosted teal) on its axle pin; its spring tab runs up the end face and the nub on its tip sits in the V notch cut in the face (${0.6} mm deep) opposite the start pose. Turn the roller in its handles until both ends click; it lets go as soon as it rolls`);
  // the sight arm over the contact line: looking along the roll direction at the −Z end
  u = await T(() => window.__tile.useView('B'));
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [[-u.L / 2 - u.gap, -u.Rtip + 8, 0], norm([-0.45, 0.12, 1]), 2.2 * u.Rtip]);
  save('sight-arm.png', await page.locator('.tl-rollers').screenshot(), `a sight arm over the contact line — roller B in use at its start pose on the board (dark) under ${u.dough} mm of dough (translucent): the handle's arm hangs straight down just past the roller's end, its pointer ${0.5} mm above the dough, over the red contact line where B touches the sheet, and over A's pinhole (black)`);
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [[0, -u.Rtip + 10, 0], norm([0.12, 0.42, 1]), 1.15 * u.L]);
  save('in-use-b.png', await page.locator('.tl-rollers').screenshot(), `roller B in use, whole — both handles clicked to its start, both pointers on A's two pinholes, ${(u.L + 2 * u.gap).toFixed(0)} mm apart along the contact line. Press, then roll`);
}
// B at 60° on its two pinholes: the line through them is square to B's roll, not along A's rows
await T((t) => window.__tile.setDesign({ tile: t }), FIXTURES.find((f) => /hook/.test(f.name)).tile);
await T(() => window.__tile.flush());
{
  const u = await T(() => window.__tile.useView('B'));
  await T(([t, d, r]) => window.__tile.lookAt3D(t, d, r), [[0, -u.Rtip + 10, 0], norm([0.12, 0.6, 1]), 1.15 * u.L]);
  save('in-use-b-60.png', await page.locator('.tl-rollers').screenshot(), `the hook tile at 60°: roller B in use on its two pinholes — at θ ≠ 90° the contact line through them is square to B's roll, so one pinhole is a corner on A's ring and the other a post on A's body between its rings, both in the side borders`);
}
await T((t) => window.__tile.setDesign({ tile: t }), FIXTURES.find((f) => f.name === 'default').tile);
await T(() => window.__tile.flush());
await T(() => window.__tile.show('all'));

// roller B whole
await wrapView('B', 1.15);
save('roller-b.png', await page.locator('.tl-rollers').screenshot(), `roller B whole — ⌀ ${L.dB.toFixed(1)} mm, ${L.LB.toFixed(0)} mm long: ${L.ringsB} amber rings of edge B's line, each closed round the roller; it rolls along edge B. It carries nothing but its rings and its two notches: its handles' pointers do the aligning`);
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
