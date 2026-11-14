#!/usr/bin/env node
/* frame-drawn-check.mjs — try a drawing (docs/frame-drawing-guide.md): import it, say what is wrong with it, build
   the three default frames from it and say where every piece landed, how far it was stretched and bent, and whether
   the relief prints.

     node tools/frame-drawn-check.mjs <drawing.svg> [--stl <dir>]

   With no drawing it checks the template's placeholders. --stl writes oval.stl, rect.stl and arch.stl (the relief,
   as the page's Get STL writes it). For a picture, run tools/shot-frame-drawn.mjs <dir> --drawing <drawing.svg>. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTree, flowMetrics } from './frame-flow-measure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
const drawing = file ? fs.readFileSync(file, 'utf8') : null;
const stlDir = arg('--stl') ? path.resolve(arg('--stl')) : null;
const T = await loadTree(ROOT);
const SI = await import(pathToFileURL(path.join(ROOT, 'frame-svg-import.js')).href);
const PH = await import(pathToFileURL(path.join(ROOT, 'frame-drawn-placeholders.js')).href);

const D = SI.importDrawing(drawing || PH.PLACEHOLDER_SVG);
console.log(`${file ? path.basename(file) : 'the template\'s placeholders'}: ${D.elements.length} drawings at ${D.unitsPerMm} units per mm`);
for (const e of D.elements) console.log(`  ${e.name.padEnd(11)} ${e.parts.map((p) => `${p.rings.length} outline${p.rings.length > 1 ? 's' : ''}${p.depth ? ` (${p.depth})` : ''}`).join(' + ')}, ${e.holes.length} holes, ${e.ridges.length} ridges, ${e.grooves.length} grooves${e.rigid ? ', placed whole' : ''} · size box ${e.size.x1.toFixed(1)} × ${(e.size.y1 - e.size.y0).toFixed(1)} mm`);
const errs = D.problems.filter((q) => q.level === 'error'), warns = D.problems.filter((q) => q.level === 'warn');
for (const q of D.problems) console.log(`  ${q.level.toUpperCase()}${q.element ? ' ' + q.element : ''}: ${q.message}`);
if (!D.problems.length) console.log('  no problems');
if (stlDir) fs.mkdirSync(stlDir, { recursive: true });
for (const [sk, q] of [['oval', { skeleton: 'oval', ornBottom: 'on' }], ['rect', { skeleton: 'rect', ornBottom: 'on' }], ['arch', {}]]) {
  const t0 = Date.now();
  const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, filigree: 'scrolls', ornFlow: 'drawn', ...q }), { drawing });
  const r = T.RL.buildRelief(m), mt = flowMetrics(m, r, { RL: T.RL, FP: T.FP, print: true }), S = m.ornament.drawnStats;
  console.log(`\n${sk} (${((Date.now() - t0) / 1000).toFixed(1)} s): ${r.info.triangles.toLocaleString('en-US')} triangles (${(100 * r.info.triangles / 1.5e6).toFixed(1)} % of the budget) · boundary edges ${mt.print.boundary} · ${mt.print.regions} region${mt.print.regions > 1 ? 's' : ''} · narrowest feature ${mt.print.feature.toFixed(2)} mm, narrowest pierced neck ${mt.coverage.slit.toFixed(2)} mm · fill ${(100 * mt.coverage.fill).toFixed(1)} % of the zone`);
  for (const p of S.placed) console.log(`  ${p.slot.padEnd(30)} ← ${p.drawing.padEnd(11)} ${p.rigid ? `placed whole, scale ${p.k.toFixed(2)}` : `stretched ${p.sx.toFixed(2)} along × ${p.sy.toFixed(2)} across (anisotropy ${p.aniso.toFixed(2)}), bent to κ·y ${p.foldMax.toFixed(2)}${p.relaxed ? `, its spine relaxed ${p.relaxed}×` : ''}${p.held ? `, ${p.held} points HELD at the fold` : ''}`}`);
  for (const t of m.ornament.told) console.log(`  TOLD: ${t}`);
  if (stlDir) { fs.writeFileSync(path.join(stlDir, `${sk}.stl`), T.RL.exportStl(r)); console.log(`  wrote ${path.join(stlDir, sk + '.stl')}`); }
}
process.exit(errs.length ? 1 : 0);
