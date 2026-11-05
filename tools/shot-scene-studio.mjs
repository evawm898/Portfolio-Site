#!/usr/bin/env node
// shot-scene-studio.mjs — key-frame contact sheets for scene 4's cat jumps.
//
//   node tools/shot-scene-studio.mjs <dir> [--png <file>]
//
// Drives the REAL page (/scene.html?scene=4&dev=1), sends the cats along legal
// routes with the dev harness's force, and for each jump captured scrubs the
// leg — re-simulated from the snapshot taken as it began — to its key frames
// and photographs them with the ballistic overlay on. Beside each strip it
// plots the leg's own trace (body centre, the arc reference, fore and hind paw
// heights, the two surfaces, the contacts) and prints the spec's numbers as
// MEASURED: apex above the landing surface as a share of the rise, fore-to-
// hind contact, the gather, every phase.
//
// THE FOUR LEGS THE BRIEF NAMES, and how each is reached without a teleport
// (spontaneous moves are held; every leg is a forced, routed traversal):
//   chaise>floor  the down-jump, ink's first leg off its starting perch
//   floor>chairL  ink, from the floor it just reached
//   chairL>table  ink, from that chair
//   chaise>sill   soot first steps down to chairR to free the sill; ink routes
//                 table -> ... -> chaise and the last leg is the one shot.
//
// Nothing here is a gate. tools/verify-scene-studio.mjs is.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find(a => !a.startsWith('--')) || 'studio-sheet');
const pngAt = args.indexOf('--png');
const PNG = pngAt >= 0 ? path.resolve(args[pngAt + 1]) : path.join(OUT, 'sheet.png');
fs.mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const root of [...(process.env.NODE_PATH || '').split(path.delimiter), '/opt/node22/lib/node_modules', '/usr/lib/node_modules']) {
    if (root && fs.existsSync(path.join(root, 'playwright', 'index.js'))) return require(path.join(root, 'playwright'));
  }
  return require('playwright');
}

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const f = path.join(REPO, rel);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const SEQUENCE = [
  { cat: 0, edge: 'chaise>floor', shoot: 'down-jump: chaise > floor' },
  { cat: 0, edge: 'floor>chairL', shoot: 'up-jump: floor > chair' },
  { cat: 0, edge: 'chairL>table', shoot: 'up-jump: chair > table' },
  { cat: 1, edge: 'sill>chairR', shoot: null },
  { cat: 0, edge: 'chaise>sill', shoot: 'up-jump: chaise > windowsill' },
];

const KEYS = ['t', 'Cy', 'y', 'toeFLy', 'toeFRy', 'toeHLy', 'toeHRy', 'hipH', 'shH'];

function keyframes(info, arc) {
  const ph = Object.fromEntries((info.phases || []).map(([k, t]) => [k, t]));
  const phs = info.phases || [];
  const start = (k) => { const p = phs.filter(x => x[0] === k); return p.length ? p[p.length - 1][1] : null; };
  const firstGather = phs.find(x => x[0] === 'gather');
  const fc = (info.contacts || []).find(c => c[0] === 'foreContact');
  const hc = (info.contacts || []).find(c => c[0] === 'hindContact');
  const out = [];
  const add = (label, t) => { if (t != null && Number.isFinite(t)) out.push({ label, t: Math.max(0, t) }); };
  if (arc && arc.kind === 'up') {
    add('notice', (ph.notice ?? 0) + 0.12);
    add('approach', (ph.approach ?? 0) + Math.max(0.05, ((firstGather ? firstGather[1] : ph.approach) - ph.approach) * 0.6));
    const g = start('gather'), l = start('launch');
    add('gather: compressing', g + (l - g) * 0.3);
    add('gather: bottom', l - 0.02);
    add('launch', l + (start('flight') - l) * 0.6);
    const f = start('flight');
    add('flight: rising', f + arc.T * 0.25);
    add('flight: apex', f + arc.vy0 / arc.g);
    add('flight: reaching', f + arc.T * 0.85);
    add('forepaws down', fc ? fc[1] + 0.004 : null);
    add('hind paws down', hc ? hc[1] + 0.004 : null);
    add('compressed', start('recover') - 0.004);
    add('settle', start('settle') + 0.25);
  } else {
    add('notice', (ph.notice ?? 0) + 0.12);
    add('peer', start('peer') + 0.1);
    add('reach', start('pour') - 0.01);
    add('pour', start('pour') + (start('fall') - start('pour')) * 0.6);
    add('hind paws leave', start('fall') + 0.01);
    add('falling', start('fall') + (fc[1] - start('fall')) * 0.5);
    add('forepaws down', fc ? fc[1] + 0.004 : null);
    add('hind paws down', hc ? hc[1] + 0.004 : null);
    add('compressed', start('recover') - 0.004);
    add('settle', start('settle') + 0.25);
  }
  return out;
}

function plotSvg(tr, arc, kfs) {
  const W = 760, H = 230, pad = 34;
  const ti = tr.keys.indexOf('t');
  const rows = tr.rows;
  const t0 = rows[0][ti], t1 = rows[rows.length - 1][ti];
  const ys = [];
  for (const r of rows) for (const k of ['Cy', 'toeFLy', 'toeHLy']) ys.push(r[tr.keys.indexOf(k)]);
  const y0 = Math.min(...ys, arc.srcY, arc.dstY) - 4, y1 = Math.max(...ys) + 6;
  const X = (t) => pad + (W - 2 * pad) * (t - t0) / (t1 - t0);
  const Y = (y) => H - pad + (-(H - 2 * pad)) * (y - y0) / (y1 - y0);
  const path = (key, f = (v) => v) => rows.map((r, i) => `${i ? 'L' : 'M'}${X(r[ti]).toFixed(1)},${Y(f(r[tr.keys.indexOf(key)])).toFixed(1)}`).join('');
  const ki = (k) => tr.keys.indexOf(k);
  const ref = rows.map((r, i) => `${i ? 'L' : 'M'}${X(r[ti]).toFixed(1)},${Y(r[ki('y')]).toFixed(1)}`).join('');
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border:1px solid #ccc">`;
  for (const [y, lab] of [[arc.srcY, 'from'], [arc.dstY, 'to']]) s += `<line x1="${pad}" x2="${W - pad}" y1="${Y(y)}" y2="${Y(y)}" stroke="#1f6f68" stroke-dasharray="4 3"/><text x="${W - pad + 2}" y="${Y(y) + 4}" font-size="10" fill="#1f6f68">${lab} ${y}</text>`;
  for (const e of tr.events) if (e[0] === 'foreContact' || e[0] === 'hindContact') s += `<line x1="${X(e[1])}" x2="${X(e[1])}" y1="${pad}" y2="${H - pad}" stroke="${e[0] === 'foreContact' ? '#b0632a' : '#a3365a'}"/>`;
  for (const k of kfs) s += `<line x1="${X(k.t)}" x2="${X(k.t)}" y1="${H - pad}" y2="${H - pad + 5}" stroke="#555"/>`;
  s += `<path d="${path('Cy')}" fill="none" stroke="#111" stroke-width="1.6"/>`;
  s += `<path d="${ref}" fill="none" stroke="#a3365a" stroke-width="1.2" stroke-dasharray="3 2"/>`;
  s += `<path d="${path('toeFLy')}" fill="none" stroke="#b0632a" stroke-width="1.2"/>`;
  s += `<path d="${path('toeHLy')}" fill="none" stroke="#5a6fa8" stroke-width="1.2"/>`;
  if (arc.kind === 'up') {
    const ya = arc.ya - arc.H;
    s += `<line x1="${pad}" x2="${W - pad}" y1="${Y(ya)}" y2="${Y(ya)}" stroke="#a3365a" stroke-width=".6"/>`;
  }
  s += `<text x="${pad}" y="14" font-size="11" fill="#111">body centre</text><text x="${pad + 90}" y="14" font-size="11" fill="#a3365a">arc reference (centre - ${arc.H} cm)</text><text x="${pad + 300}" y="14" font-size="11" fill="#b0632a">forepaw</text><text x="${pad + 370}" y="14" font-size="11" fill="#5a6fa8">hind paw</text><text x="${pad + 440}" y="14" font-size="11" fill="#555">ticks = the frames above · ${Math.round((t1 - t0) * 1000)} ms</text>`;
  return s + '</svg>';
}

async function main() {
  const { chromium } = loadPlaywright();
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/scene.html?scene=4&seed=5&dev=1`);
  await page.waitForFunction(() => window.__scene && window.__scene.activeId === 4);
  await page.waitForTimeout(500);
  const dev = (c) => page.evaluate((x) => window.__scene.sceneQuery('dev', x), c);
  await dev({ op: 'hold', on: true });
  await page.evaluate(() => window.__scene.pause(true));
  // the panel is chrome; the sheet photographs the room
  await page.addStyleTag({ content: '.scene-dev{display:none!important}.scene-nav{display:none!important}' });

  const sections = [];
  for (const step of SEQUENCE) {
    const r = await dev({ op: 'force', cat: step.cat, edge: step.edge });
    if (!String(r).startsWith('ok')) throw new Error(`force ${step.edge}: ${r}`);
    // run the whole traversal in simulated time
    for (let k = 0; k < 60; k++) {
      await page.evaluate(() => window.__scene.scenePump(1));
      const st = await page.evaluate(() => window.__scene.sceneState());
      if (!st.cats[step.cat].moving && !st.cats[step.cat].action) break;
    }
    if (!step.shoot) continue;
    const info = await dev({ op: 'legLength' });
    if (info.edge !== step.edge) throw new Error(`the last leg was ${info.edge}, not ${step.edge}`);
    const tr = await dev({ op: 'trace', keys: KEYS, every: 2 });
    const kfs = keyframes(info, tr.arc);
    // a stable crop: the union of the cat's bounds over every key frame
    let box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    // (from the gather / peer on: the approach walk would make it the room)
    const from = kfs.findIndex(k => /gather|peer/.test(k.label));
    for (const k of kfs.slice(Math.max(0, from))) {
      await dev({ op: 'scrub', t: k.t });
      const b = await dev({ op: 'bounds', cat: info.cat });
      box = { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) };
    }
    const m = 26;
    const clip = { x: Math.max(0, box.x0 - m), y: Math.max(0, box.y0 - m) };
    clip.width = Math.min(1280 - clip.x, box.x1 - box.x0 + 2 * m);
    clip.height = Math.min(800 - clip.y, box.y1 - box.y0 + 2 * m);
    const frames = [];
    for (let n = 0; n < kfs.length; n++) {
      await dev({ op: 'scrub', t: kfs[n].t });
      await page.evaluate(() => window.__scene.step());
      const file = `${step.edge.replace('>', '-to-')}-${String(n).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(OUT, file), clip });
      frames.push({ file, ...kfs[n] });
    }
    // the whole room at the apex / mid-fall, for context
    const mid = kfs.find(k => k.label.includes('apex') || k.label === 'falling');
    await dev({ op: 'scrub', t: mid.t });
    await page.evaluate(() => window.__scene.step());
    const wide = `${step.edge.replace('>', '-to-')}-room.png`;
    await page.screenshot({ path: path.join(OUT, wide) });
    // put the leg back at its end, so the cat is where it went and nobody is moving
    await dev({ op: 'scrub', t: info.dur + 0.05 });
    await dev({ op: 'resume' });
    const ph = info.phases;
    const fc = info.contacts.find(c => c[0] === 'foreContact'), hc = info.contacts.find(c => c[0] === 'hindContact');
    const arc = tr.arc;
    const durs = ph.map(([k, t], i) => [k, Math.round(((i + 1 < ph.length ? ph[i + 1][1] : info.dur) - t) * 1000)]);
    sections.push({ title: step.shoot, edge: step.edge, frames, wide, svg: plotSvg(tr, arc, kfs), durs,
      apexPct: arc.kind === 'up' ? ((arc.ya - arc.H - arc.dstY) / arc.rise * 100) : null,
      lag: fc && hc ? Math.round((hc[1] - fc[1]) * 1000) : null, T: Math.round(arc.T * 1000), kind: arc.kind });
    console.log(step.edge, 'frames', frames.length, 'apex', sections.at(-1).apexPct?.toFixed(1), 'lag', sections.at(-1).lag);
  }

  // GATHER VARIES, measured on the shipped modules in Node: eight jumps of one
  // edge from eight seeds.
  const { rehearse } = await import(path.join(REPO, 'scene/studio-cats.js'));
  const gathers = [];
  for (let s = 1; s <= 8; s++) {
    const R = rehearse('floor>chairL', { seed: s * 7919 });
    const ph = R.events.filter(e => e.type === 'phase');
    for (let i = 0; i < ph.length - 1; i++) if (ph[i].k === 'gather') gathers.push(Math.round((ph[i + 1].t - ph[i].t) * 1000));
  }

  const html = `<!doctype html><meta charset="utf-8"><title>Studio cats — jump contact sheet</title>
<style>body{font:13px/1.4 "IBM Plex Mono",monospace;background:#f4f2ee;color:#222;margin:20px;width:1500px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px}
.strip{display:flex;flex-wrap:wrap;gap:6px}.f{background:#fff;border:1px solid #ccc;padding:3px}.f img{display:block;height:170px}
.f div{font-size:11px;text-align:center}.meta{display:flex;gap:20px;align-items:flex-start;margin:6px 0}
table{border-collapse:collapse;font-size:12px}td{padding:1px 8px 1px 0}.ok{color:#1f6f68}.wide img{height:230px;border:1px solid #ccc}</style>
<h1>Scene 4 — cat jump contact sheet</h1>
<div>Real page renders, scrubbed from each leg's own snapshot at a fixed 1/240 s step. Amber = body-centre arc, rose dashed = arc reference (centre less ${'H'}), teal = the landing surface. Spec: apex 15–25% of the rise above the landing surface · forepaws first, hind 60–100 ms later · no linear segments in any channel · gather randomised 500–1200 ms.</div>
<div style="margin-top:6px">Gather, eight floor&gt;chair jumps from eight seeds: <b>${gathers.join(' · ')} ms</b> (all distinct: ${new Set(gathers).size === gathers.length ? 'yes' : 'NO'})</div>
${sections.map(s => `<h2>${s.title}</h2>
<div class="meta"><div class="wide"><img src="${s.wide}"></div><div>${s.svg}</div>
<table><tr><td>edge</td><td>${s.edge}</td></tr><tr><td>${s.kind === 'up' ? 'flight' : 'fall'}</td><td>${s.T} ms</td></tr>
${s.apexPct != null ? `<tr><td>apex</td><td class="ok">${s.apexPct.toFixed(1)}% of rise above landing</td></tr>` : ''}
<tr><td>fore → hind</td><td class="ok">${s.lag} ms</td></tr>
${s.durs.map(([k, d]) => `<tr><td>${k}</td><td>${d} ms</td></tr>`).join('')}</table></div>
<div class="strip">${s.frames.map(f => `<div class="f"><img src="${f.file}"><div>${f.label} · ${Math.round(f.t * 1000)} ms</div></div>`).join('')}</div>`).join('')}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const sheet = await browser.newPage({ viewport: { width: 1540, height: 900 }, deviceScaleFactor: 1 });
  await sheet.setContent(html.replace(/src="([^"]+\.png)"/g, (_, f) => `src="data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString('base64')}"`));
  await sheet.waitForTimeout(300);
  await sheet.screenshot({ path: PNG, fullPage: true });
  console.log('errors', errs.length ? errs : 'none');
  console.log('sheet', PNG);
  await browser.close();
  server.close();
}

main().catch(e => { console.error(e); process.exit(1); });
