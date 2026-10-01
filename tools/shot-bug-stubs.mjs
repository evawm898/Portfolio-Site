#!/usr/bin/env node
/* shot-bug-stubs.mjs <base-tree> <out.png> — what the Phase 1 sheet's "two stubs
   below the hindwings" on the butterfly were, read off that tree's own export.

   Imports <base-tree>/bug-geometry.js (a worktree or checkout of the Phase 1
   commit, 4a96b3f), builds its 'butterfly' preset, exports the layered SVG and
   recolours only the fill of two part groups: LEGS red, the hindwing TAILS blue.
   Every outline is the exporter's own; nothing is redrawn.

   Usage: git worktree add /tmp/bug-p1 4a96b3f
          node tools/shot-bug-stubs.mjs /tmp/bug-p1 docs/img/bug-phase1-stubs.png */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const [base, outPng] = process.argv.slice(2);
if (!base || !outPng) { console.error('usage: shot-bug-stubs.mjs <base-tree> <out.png>'); process.exit(2); }
const G = await import(pathToFileURL(path.resolve(base, 'bug-geometry.js')).href);
const m = G.buildBug(G.presetParams('butterfly'));
let svg = G.exportSvg(m).svg;
const recolour = (kind, colour) => { svg = svg.replace(new RegExp(`(data-part="${kind}[^"]*" d="[^"]*" fill=")#0A0A0C`, 'g'), `$1${colour}`); };
recolour('leg', '#c0392b'); recolour('tail', '#2c6fbb');
const legs = (svg.match(/data-part="leg/g) || []).length, tails = (svg.match(/data-part="tail/g) || []).length;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 720, height: 640 } });
await p.setContent(`<body style="margin:0;background:#EDEDE8;font:12px monospace;color:#333">
  <div style="padding:8px 12px">Phase 1 butterfly preset, its own SVG export: <b style="color:#c0392b">legs red</b> (${legs} parts) · <b style="color:#2c6fbb">hindwing tails blue</b> (${tails} parts)</div>
  ${svg.replace('<svg ', '<svg style="width:700px;height:590px;display:block;margin:0 10px" ')}</body>`);
await p.screenshot({ path: outPng });
await b.close();
console.log(`wrote ${outPng} — ${legs} leg parts, ${tails} tail parts`);
