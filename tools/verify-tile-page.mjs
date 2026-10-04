#!/usr/bin/env node
/* verify-tile-page.mjs — the /tile page, driven in headless Chromium with REAL
   pointer events, keys and clicks (tile-design-doc.md §9). The geometry is the
   Node gate's (tools/verify-tile.mjs); this asks whether the page's hand lands
   where the geometry says, and whether its buttons give the files they claim.

     P0  the page loads clean: four corners, both copies of every point, nine
         tiles and 4 + 4 cut lines in the 3 x 3, the rollers built and drawn.
     P1  a point dragged on its edge lands under the pointer, and its copy on
         the opposite edge is drawn exactly one lattice step away.
     P2  a point dragged by its COPY moves the edge: it lands under the pointer
         on the copy, the base moves with it.
     P3  a drag that would make the outline cross itself is BLOCKED: the status
         says so, the point stops short of the pointer, the tile stays valid
         (by tile-geometry's validator, run here in Node).
     P4  a click on an edge (5 px off the curve, inside its hit width) adds a
         point ON the curve — the click projected, not the click itself — and
         selects it.
     P5  Delete removes the selected point; a double-click removes a point.
     P6  a corner cannot be deleted (Delete on a selected corner: refused).
     P7  S toggles a point sharp ↔ smooth; on a corner it toggles all four.
     P8  a corner drag resizes about the OPPOSITE corner: during the drag the
         opposite corner stays put on screen and the dragged one is under the
         pointer; the angle does not change.
     P9  the pitch and angle sliders set the tile.
     P10 guardrails: a pinched tile shows its thin parts in red in the editor
         and on all nine 3 x 3 tiles and lists neck and spike; too-close points
         get a ring on both copies.
     P11 a design whose blade cannot clear the dough: the roller buttons are
         disabled and say why; the page's own export refuses.
     P12 Roller A's STL button downloads a binary STL of 84 + 50·n bytes with
         the page's own triangle count n.
     P13 the SVG buttons download the tile (one closed path) and the 3 x 3
         (four A lines and four B lines over nine tiles).
     P14 the zip holds both rollers, the handle, the notes and the design.
     P15 a saved design opens back to the same tile.
     P16 the design survives a reload (local storage).
     P17 the rollers' view draws something.

   --negative-control re-serves deliberately broken copies of tile.js and
   requires each to fail the check that names it. Every anchor is checked first. */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openTile, REPO } from './tile-page-harness.mjs';
import * as G from '../tile-geometry.js';
import { FIXTURES } from './tile-fixtures.mjs';

const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');

async function domPoint(page, sel) {
  return page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = document.getElementById('edSvg').getBoundingClientRect();
    if (e.tagName === 'circle') return [r.left + +e.getAttribute('cx'), r.top + +e.getAttribute('cy')];
    return [r.left + +e.getAttribute('x') + +e.getAttribute('width') / 2, r.top + +e.getAttribute('y') + +e.getAttribute('height') / 2];
  }, sel);
}
const ptSel = (which, i, copy) => `#edSvg [data-which="${which}"][data-i="${i}"][data-copy="${copy}"]`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
async function drag(page, from, to, opts = {}) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps: opts.steps || 10 });
  const during = opts.during ? await opts.during() : null;
  await page.mouse.up();
  return during;
}

async function run(override = null) {
  const res = [];
  const ok = (c, m) => res.push([!!c, m]);
  const s = await openTile({ storage: '', override });
  const { page, errors } = s;
  const T = (expr, ...a) => page.evaluate(expr, ...a);
  try {
    await T(() => window.__tile.flush());
    // P0
    const ec = await T(() => window.__tile.editorCounts()), pc = await T(() => window.__tile.patchCounts()), lay = await T(() => window.__tile.layout());
    const t0 = await T(() => window.__tile.tile());
    ok(ec.corners === 4 && ec.points === 2 * (t0.edgeA.length + t0.edgeB.length) && pc.tiles === 9 && pc.aLines === 4 && pc.bLines === 4 && lay && lay.trisA > 0, `P0: the page loads — ${ec.corners} corners, ${ec.points} point handles, ${pc.tiles} tiles, ${pc.aLines} + ${pc.bLines} cut lines, rollers ${lay ? lay.trisA + '/' + lay.trisB : 'not built'} triangles`);

    // P1 drag edge A point 0 by its base copy
    {
      const a = await domPoint(page, ptSel('A', 0, 0));
      const to = [a[0] + 14, a[1] - 9];
      const got = await drag(page, a, to, { during: () => domPoint(page, ptSel('A', 0, 0)) });
      const base = await domPoint(page, ptSel('A', 0, 0)), copy = await domPoint(page, ptSel('A', 0, 1));
      const c0 = await domPoint(page, '#edSvg [data-corner="0"]'), c3 = await domPoint(page, '#edSvg [data-corner="3"]');
      const step = [c3[0] - c0[0], c3[1] - c0[1]];
      ok(got && dist(got, to) < 0.75 && Math.abs(copy[0] - base[0] - step[0]) < 0.02 && Math.abs(copy[1] - base[1] - step[1]) < 0.02,
        `P1: a dragged point lands under the pointer (${got ? dist(got, to).toFixed(3) : '—'} px off) and its copy is drawn one lattice step away (${(copy[0] - base[0] - step[0]).toFixed(4)}, ${(copy[1] - base[1] - step[1]).toFixed(4)} px)`);
    }
    // P2 drag edge B point 1 by its COPY (the right edge)
    {
      const before = await T(() => window.__tile.tile());
      const c = await domPoint(page, ptSel('B', 1, 1));
      const to = [c[0] - 10, c[1] + 12];
      const got = await drag(page, c, to, { during: () => domPoint(page, ptSel('B', 1, 1)) });
      const after = await T(() => window.__tile.tile());
      const moved = before.edgeB[1][0] !== after.edgeB[1][0] || before.edgeB[1][1] !== after.edgeB[1][1];
      ok(got && dist(got, to) < 0.75 && moved, `P2: a point dragged by its copy lands under the pointer (${got ? dist(got, to).toFixed(3) : '—'} px off) and the edge's point moved`);
    }
    // P3 a drag into a crossing is blocked
    {
      const b0 = await T(() => window.__tile.blocked());
      const a = await domPoint(page, ptSel('A', 0, 0)), c0 = await domPoint(page, '#edSvg [data-corner="0"]');
      const to = [c0[0] - 60, c0[1] - 40];                       // through the left edge and out of the tile
      const got = await drag(page, a, to, { steps: 24, during: () => domPoint(page, ptSel('A', 0, 0)) });
      const st = await T(() => window.__tile.status()), b1 = await T(() => window.__tile.blocked());
      const t = await T(() => window.__tile.tile());
      ok(/^Blocked/.test(st) && b1 > b0 && G.validate(t).ok && got && dist(got, to) > 5, `P3: a drag through the left edge is BLOCKED ("${st}"), ${b1 - b0} blocked steps, the point stopped ${got ? dist(got, to).toFixed(1) : '—'} px short, the tile is valid`);
    }
    await T(() => window.__tile.setDesign({ tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true, edgeA: [[0.3, 0.13, 0], [0.7, -0.13, 0]], edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]] } }));
    // P4 click on edge B (copy 0) a little off the curve: a point is added ON the curve
    {
      const before = await T(() => window.__tile.tile());
      const q = await T(() => window.__tile.edgeScreen('B', 0, 0.5)), q2 = await T(() => window.__tile.edgeScreen('B', 0, 0.52));
      const tn = [q2[0] - q[0], q2[1] - q[1]], L = Math.hypot(...tn), nrm = [-tn[1] / L, tn[0] / L];
      const click = [q[0] + 5 * nrm[0], q[1] + 5 * nrm[1]];
      const denseBefore = G.edgeDense(before, 'B').pts;
      await page.mouse.click(click[0], click[1]);
      const after = await T(() => window.__tile.tile()), sel = await T(() => window.__tile.selection());
      const added = after.edgeB.length === before.edgeB.length + 1 && sel && sel.which === 'B';
      let off = Infinity;
      if (added) { const p = G.toMm(after, after.edgeB[sel.i][0], after.edgeB[sel.i][1]); for (let k = 0; k + 1 < denseBefore.length; k++) off = Math.min(off, G.segDist(p, denseBefore[k], denseBefore[k + 1])); }
      ok(added && off < 1e-6, `P4: a click 5 px off edge B adds a point ON the curve (${Number.isFinite(off) ? off.toExponential(1) : '—'} mm from it) and selects it`);
    }
    // P5 Delete removes the selected point; a double-click removes a point
    {
      const n0 = (await T(() => window.__tile.tile())).edgeB.length;
      await page.keyboard.press('Delete');
      const n1 = (await T(() => window.__tile.tile())).edgeB.length;
      const p = await domPoint(page, ptSel('A', 1, 0));
      const nA0 = (await T(() => window.__tile.tile())).edgeA.length;
      await page.mouse.dblclick(p[0], p[1]);
      const nA1 = (await T(() => window.__tile.tile())).edgeA.length;
      ok(n1 === n0 - 1 && nA1 === nA0 - 1, `P5: Delete removed the selected point (${n0} → ${n1} on edge B) and a double-click another (${nA0} → ${nA1} on edge A)`);
    }
    // P6 a corner cannot be deleted
    {
      const tb = await T(() => window.__tile.tile());
      const c = await domPoint(page, '#edSvg [data-corner="1"]');
      await page.mouse.click(c[0], c[1]);
      await page.keyboard.press('Delete');
      const ta = await T(() => window.__tile.tile()), st = await T(() => window.__tile.status());
      ok(JSON.stringify(ta) === JSON.stringify(tb) && /cannot be deleted/.test(st), `P6: Delete on a corner is refused ("${st}") and the tile is unchanged`);
    }
    // P7 S toggles: a corner (all four), then a point
    {
      const c0 = (await T(() => window.__tile.tile())).cornerSmooth;
      await page.keyboard.press('s');
      const c1 = (await T(() => window.__tile.tile())).cornerSmooth;
      const p = await domPoint(page, ptSel('B', 0, 0));
      await page.mouse.click(p[0], p[1]);
      const s0 = (await T(() => window.__tile.tile())).edgeB[0][2];
      await page.keyboard.press('s');
      const s1 = (await T(() => window.__tile.tile())).edgeB[0][2];
      await page.keyboard.press('s');
      ok(c1 === !c0 && !!s1 === !s0, `P7: S flipped the corners ${c0 ? 'smooth → sharp' : 'sharp → smooth'} and a point ${s0 ? 'sharp → smooth' : 'smooth → sharp'}`);
    }
    // P8 a corner drag resizes about the opposite corner — dragging C0, the
    // corner every other point is measured from, so its opposite C2 must be HELD
    {
      const tb = await T(() => window.__tile.tile());
      const c0 = await domPoint(page, '#edSvg [data-corner="0"]'), c2 = await domPoint(page, '#edSvg [data-corner="2"]');
      const to = [c0[0] - 30, c0[1] + 22];
      const during = await drag(page, c0, to, { during: async () => ({ c0: await domPoint(page, '#edSvg [data-corner="0"]'), c2: await domPoint(page, '#edSvg [data-corner="2"]') }) });
      const ta = await T(() => window.__tile.tile());
      ok(during && dist(during.c0, to) < 0.75 && dist(during.c2, c2) < 0.5 && ta.angle === tb.angle && ta.pitchA > tb.pitchA && ta.pitchB > tb.pitchB,
        `P8: a corner drag keeps the opposite corner put (${during ? dist(during.c2, c2).toFixed(3) : '—'} px) with the dragged one under the pointer (${during ? dist(during.c0, to).toFixed(3) : '—'} px); pitches ${tb.pitchA.toFixed(1)}/${tb.pitchB.toFixed(1)} → ${ta.pitchA.toFixed(1)}/${ta.pitchB.toFixed(1)} mm, θ ${ta.angle}°`);
    }
    // P9 sliders
    {
      await page.locator('details.tl-sec').first().evaluate((d) => { d.open = true; });
      await page.locator('#pitchA').fill('52');
      await page.locator('#angle').fill('70');
      const t = await T(() => window.__tile.tile());
      ok(t.pitchA === 52 && t.angle === 70 && G.validate(t).ok, `P9: the sliders set pitch A ${t.pitchA} mm and θ ${t.angle}°`);
    }
    // P10 guardrails drawn
    {
      const pinch = FIXTURES.find((f) => /pinch/.test(f.name)).tile;
      await T((tt) => window.__tile.setDesign({ tile: tt }), pinch); await T(() => window.__tile.flush());
      const ecp = await T(() => window.__tile.editorCounts()), pcp = await T(() => window.__tile.patchCounts()), fl = await T(() => window.__tile.flags());
      const closeT = FIXTURES.find((f) => f.name === 'close points').tile;
      await T((tt) => window.__tile.setDesign({ tile: tt }), closeT); await T(() => window.__tile.flush());
      const ecc = await T(() => window.__tile.editorCounts());
      ok(ecp.thin === 1 && pcp.thin === 9 && fl.some((f) => f.id === 'neck') && fl.some((f) => f.id === 'spike') && ecc.rings === 4,
        `P10: the pinch shows its thin parts (editor ${ecp.thin}, 3 x 3 ${pcp.thin}) and lists ${fl.map((f) => f.id).join(', ')}; too-close points get ${ecc.rings} rings`);
    }
    await T(() => window.__tile.setDesign({ tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true, edgeA: [[0.3, 0.13, 0], [0.7, -0.13, 0]], edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]] } }));
    // P11 refusal
    {
      await T(() => window.__tile.setDesign({ print: { ...window.__tile.print(), dough: 6, bladeHeight: 7 } })); await T(() => window.__tile.flush());
      const dis = await page.locator('[data-stl="A"]').isDisabled(), msg = await page.locator('#exportMsg').textContent(), r = await T(() => window.__tile.tryStl('A'));
      ok(dis && /refused/i.test(msg) && !r.ok, `P11: a blade that cannot clear the dough — buttons disabled, "${msg.slice(0, 70)}…", the export refuses`);
      await T(() => window.__tile.setDesign({ print: { ...window.__tile.print(), dough: 5, bladeHeight: 8 } })); await T(() => window.__tile.flush());
    }
    // P12 STL download
    {
      const lay2 = await T(() => window.__tile.layout());
      const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-stl="A"]').click()]);
      const buf = fs.readFileSync(await dl.path());
      const n = buf.readUInt32LE(80), head = buf.subarray(0, 80).toString('latin1');
      ok(n === lay2.trisA && buf.length === 84 + 50 * n && /Tessellation roller A/.test(head) && /roller-A\.stl$/.test(dl.suggestedFilename()), `P12: Roller A STL — ${dl.suggestedFilename()}, ${buf.length} bytes, ${n} triangles (the page's ${lay2.trisA})`);
    }
    // P13 SVGs
    {
      const [d1] = await Promise.all([page.waitForEvent('download'), page.locator('#svgTile').click()]);
      const svg1 = fs.readFileSync(await d1.path(), 'utf8');
      const [d2] = await Promise.all([page.waitForEvent('download'), page.locator('#svgPatch').click()]);
      const svg2 = fs.readFileSync(await d2.path(), 'utf8');
      const cut2 = (svg2.split('<g id="cut"')[1] || '').split('</g>')[0];
      ok((svg1.match(/<path /g) || []).length === 1 && /Z"\/>/.test(svg1) && (cut2.match(/<path /g) || []).length === 8 && (svg2.split('<g id="tiles"')[1] || '').split('</g>')[0].split('<path').length - 1 === 9,
        `P13: tile SVG one closed path; 3 x 3 SVG ${(cut2.match(/<path /g) || []).length} cut lines over nine tiles`);
    }
    // P14 zip
    {
      const [dz] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.locator('#zipAll').click()]);
      const z = fs.readFileSync(await dz.path()).toString('latin1');
      const names = ['roller-A.stl', 'roller-B.stl', 'handle.stl', 'README.txt', 'design.json'];
      ok(names.every((n) => z.includes(n)) && z.startsWith('PK'), `P14: the zip holds ${names.filter((n) => z.includes(n)).join(', ')}`);
    }
    // P15 save then open
    {
      const saved = await T(() => window.__tile.tile());
      const [ds] = await Promise.all([page.waitForEvent('download'), page.locator('#saveDesign').click()]);
      const file = path.join(os.tmpdir(), `tile-design-${process.pid}.json`); fs.copyFileSync(await ds.path(), file);
      await T(() => window.__tile.setDesign({ tile: { pitchA: 30, pitchB: 30, angle: 90, cornerSmooth: false, edgeA: [], edgeB: [] } }));
      await page.locator('#openDesign').setInputFiles(file);
      await page.waitForFunction(() => /Opened/.test(document.getElementById('designMsg').textContent));
      const back = await T(() => window.__tile.tile());
      ok(JSON.stringify(back) === JSON.stringify(saved), `P15: a saved design opens back to the same tile`);
      fs.rmSync(file, { force: true });
    }
    // P16 autosave across a reload
    {
      const want = { pitchA: 44, pitchB: 36, angle: 80, cornerSmooth: true, edgeA: [[0.5, 0.15, 0]], edgeB: [[-0.1, 0.5, 1]] };
      await T((w) => window.__tile.setDesign({ tile: w }), want); await T(() => window.__tile.flush());
      await page.waitForTimeout(500);
      await page.reload(); await page.waitForFunction(() => !!window.__tile && !!window.__tile.layout());
      const back = await T(() => window.__tile.tile());
      ok(JSON.stringify(back) === JSON.stringify(want), `P16: the design survives a reload`);
    }
    // P17 the rollers are drawn
    {
      await T(() => window.__tile.flush());
      const png = await page.locator('#rollCanvas').screenshot();
      const { decodePNG } = await import('./pngdec.mjs');
      const im = decodePNG(png);
      let ink = 0; for (let i = 0; i < im.data.length; i += 4) if (Math.abs(im.data[i] - 0x12) + Math.abs(im.data[i + 1] - 0x12) + Math.abs(im.data[i + 2] - 0x15) > 24) ink++;
      const share = ink / (im.width * im.height);
      ok(share > 0.03, `P17: the rollers' view draws ${(100 * share).toFixed(1)}% of its pixels`);
    }
    ok(errors.length === 0, `P: no page errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
  } catch (e) {
    ok(false, `P: the run threw — ${e.message.split('\n')[0]}`);
  } finally { await s.close(); }
  return res;
}

const MUTANTS = [
  ['a drag ignores which copy it holds', "const q = sub2(sub2(w, org), copyOffset(tile, drag.which, drag.copy));", 'const q = sub2(w, org);', 'P2'],
  ['a blocked edit is not told', "  status = what ? `Blocked (${what}): ${r.reason}.` : `Blocked: ${r.reason}.`;\n", '', 'P3'],
  ['a click on an edge adds the click itself, not its point on the curve', 'const r = G.insertPoint(tile, which, G.toLattice(tile, at[0], at[1]));', 'const r = G.insertPoint(tile, which, G.toLattice(tile, q[0], q[1]));', 'P4'],
  ['Delete does nothing', "if (ev.key === 'Delete' || ev.key === 'Backspace') { if (sel) { ev.preventDefault(); deleteSelected(); } }", "if (ev.key === 'Delete' || ev.key === 'Backspace') { if (sel) { ev.preventDefault(); } }", 'P5'],
  ['a double-click selects but never deletes', "    if (d.i !== undefined) { sel = { which: d.which, i: +d.i }; deleteSelected(); }\n    else { sel = { corner: +d.corner };", "    if (d.i !== undefined) { sel = { which: d.which, i: +d.i }; }\n    else { sel = { corner: +d.corner };", 'P5'],
  ['a corner drag does not hold the opposite corner', "if (commit(G.resizeFromCorner(tile, drag.k, w, drag.opposite), 'resize')) org = sub2(drag.opposite, G.cornerAt(tile, drag.o));", "commit(G.resizeFromCorner(tile, drag.k, w, drag.opposite), 'resize');", 'P8'],
  ['the 3 x 3 never shows the thin parts', 'if (thin && thinUrl) {\n    const fr = thin.frame;\n    for (const q of tiles)', 'if (false) {\n    const fr = thin.frame;\n    for (const q of tiles)', 'P10'],
  ['the roller buttons ignore a refusal', "  return RL.exportStl(built[which].mesh, which, { layout: built.layout });", "  return RL.exportStl(built[which].mesh, which, {});", 'P11'],
  ['the design is never kept', "try { localStorage.setItem(STORE, JSON.stringify(designDoc())); } catch", 'try { void 0; } catch', 'P16'],
];

if (!NEG) {
  const res = await run();
  let bad = 0;
  for (const [c, m] of res) { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) bad++; }
  console.log(`\n${res.length - bad}/${res.length} page checks pass.`);
  console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
  process.exit(bad ? 1 : 0);
} else {
  const src = fs.readFileSync(path.join(REPO, 'tile.js'), 'utf8');
  let good = true;
  for (const [name, from] of MUTANTS) { const n = src.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR ${name}: matches ${n} times (must be 1) — disarmed`); good = false; } }
  if (!good) { console.log('\nNEGATIVE CONTROL FAIL (anchors)'); process.exit(1); }
  const clean = await run();
  const cleanBad = clean.filter(([c]) => !c);
  console.log(cleanBad.length ? `CLEAN RUN FAILED: ${cleanBad.map(([, m]) => m).join(' | ')}` : `clean run: ${clean.length}/${clean.length}`);
  if (cleanBad.length) good = false;
  for (const [name, from, to, claim] of MUTANTS) {
    const res = await run({ '/tile.js': src.replace(from, to) });
    const fails = res.filter(([c]) => !c).map(([, m]) => m);
    const fired = fails.some((m) => m.startsWith(claim + ':'));
    console.log(`${fired ? 'CAUGHT' : 'MISSED'} ${name.padEnd(70)} by ${claim} — ${(fails.find((m) => m.startsWith(claim + ':')) || fails[0] || 'nothing fired').slice(0, 140)}`);
    if (!fired) good = false;
  }
  console.log(good ? '\nNEGATIVE CONTROL PASS' : '\nNEGATIVE CONTROL FAIL');
  process.exit(good ? 0 : 1);
}
