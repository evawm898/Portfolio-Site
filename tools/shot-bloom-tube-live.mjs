/* ===================================================================
   THE TUBE ON THE LIVE PAGE — the shimmer check for MUST FIX 1.

   `node tools/shot-bloom-tube-live.mjs <dir> [--png <file>]`

   The real bloom.html, the shipped controls set through the real inputs
   (applyConfig, read back), LIVE mode (print preview off), the camera put on
   petal 0's midrib at the ring's top row (the builder's own `topMid0`). Each
   cell is shot twice: with the ring UNTRIMMED (a capability lever no control
   reaches — the prototype's coincident ring) and as it ships (trimmed). The
   prototype's shimmer is z-fighting between a petal and the ring drawn on the
   same surface; on a still frame it shows as a sawtooth of the two shells'
   facets interleaving. No pixel delta is quoted: two page states, two
   renders, and this renderer is not deterministic between sessions (CLAUDE.md,
   contact sheets). Every cell settles until two consecutive frames are
   byte-identical.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame } from './bloom-harness.mjs';

const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-bloom-tube-live.mjs <dir> [--png <file>]'); process.exit(2); }
const pngArg = process.argv.indexOf('--png');
fs.mkdirSync(out, { recursive: true });
const FRAME_R = Number(process.env.FRAME_R || 6);
const CELLS = [];
for (const h of [0.25, 0.58]) for (const k of [0, 2]) for (const trim of [false, true]) CELLS.push({ h, k, trim });

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 700, height: 560 } });
const shots = [];
try {
  for (const c of CELLS) {
    await openBloom(page, port);
    const bad = await applyConfig(page, [{ id: 'tubeLayer1', value: String(c.k) }, { id: 'tubeHeight', value: String(c.h) }, { id: 'tubeBlend', value: '1' }]);
    if (bad.length) throw new Error(`read-back: ${bad.join('; ')}`);
    await page.evaluate((trim) => window.__bloomCapability(trim ? null : { tubeTrimKeep: 1 }), c.trim);
    const m = await page.evaluate(() => window.__bloomMetrics());
    if (m.shownMode !== 'live') throw new Error('not LIVE');
    const r = m.tube && m.tube.rings[0];
    if (!r) throw new Error(`no ring built for ${JSON.stringify(c)}`);
    const at = r.topMid0;
    const rho = Math.hypot(at[0], at[1]);
    const dir = (process.env.FRAME_DIR || "0.35,0.25,1").split(",").map(Number); { const ux = at[0] / rho, uy = at[1] / rho, a = dir[0], b = dir[1]; dir[0] = ux * a - uy * b; dir[1] = uy * a + ux * b; }
    await stillFrame(page);
    await page.evaluate(({ at, dir, R }) => window.__bloomFrame(R, 0, at, dir), { at, dir, R: FRAME_R });
    let prev = null, buf = null;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); buf = await page.screenshot(); if (prev && buf.equals(prev)) break; prev = buf; }
    const name = `tube-h${c.h}-k${c.k}-${c.trim ? 'trimmed' : 'untrimmed'}.png`;
    fs.writeFileSync(path.join(out, name), buf);
    shots.push({ ...c, name, tris: m.liveTris, uTop: r.uTop, notch: r.notch.sinuses.filter((x) => x.r > 0).length });
    console.log(`${name}  tris(live) ${m.liveTris}  ring top u ${r.uTop.toFixed(3)}`);
  }
} finally { await browser.close(); server.close(); }
/* the sheet: one HTML page, both columns per row */
const rows = [];
for (const h of [0.25, 0.58]) for (const k of [0, 2]) {
  const a = shots.find((s) => s.h === h && s.k === k && !s.trim), b = shots.find((s) => s.h === h && s.k === k && s.trim);
  rows.push(`<tr><td>h ${h} · ${k === 0 ? 'TUBE' : 'K ' + k} · BLEND 1<br>LIVE, ring top u ${b.uTop.toFixed(3)}</td><td><img src="${a.name}"><br>untrimmed (the prototype)</td><td><img src="${b.name}"><br>trimmed (ships)</td></tr>`);
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset=utf-8><title>Tube live</title><style>body{background:#111;color:#ddd;font:13px monospace}img{width:420px}td{padding:6px;vertical-align:top}</style><table>${rows.join('')}</table>`);
if (pngArg > 0) {
  const { browser: b2, page: p2 } = await launchPage({ viewport: { width: 1000, height: 400 } });
  await p2.goto('file://' + path.resolve(out, 'index.html'));
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: process.argv[pngArg + 1], fullPage: true });
  await b2.close();
}
