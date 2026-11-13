#!/usr/bin/env node
// shoot.mjs — contact sheets of every /smart-textiles.html scene, frozen at chosen loop positions.
//   node tools/smart-textiles/shoot.mjs [modules] [t,t,...] [extra query]   (writes PNGs to $OUT or /tmp)
// modules: comma list, default all five (smart-textiles-yarns,...). Uses tools/smart-textiles/sheet.html.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const server = http.createServer((q, r) => { const p = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)||fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const port=server.address().port;
const OUT = process.env.OUT || '/tmp';
const b = await chromium.launch();
const mods=(process.argv[2]||'smart-textiles-yarns,smart-textiles-fabric,smart-textiles-sense,smart-textiles-act,smart-textiles-connect').split(',');
const ts=(process.argv[3]||'0.25,0.6').split(',');
const extra=process.argv[4]||'';
for (const m of mods) for (const t of ts) {
  const page = await b.newPage({ viewport: { width: 1160, height: 900 }, deviceScaleFactor: 1.4 });
  page.on('pageerror', e=>console.log('ERR',m,e.message)); page.on('console', e=>{ if(e.type()==='error'||e.type()==='warning') console.log('CONSOLE',m,e.text())});
  await page.goto(`http://localhost:${port}/tools/smart-textiles/sheet.html?m=${m}&t=${t}${extra}`);
  await page.waitForFunction(()=>document.title==='done'); await page.waitForTimeout(300);
  const out=`${OUT}/${m.replace('smart-textiles-','')}-${t}${extra.replace(/[^a-z0-9]/gi,'')}.png`;
  await page.screenshot({ path: out, fullPage: true }); console.log(out);
  await page.close();
}
await b.close(); server.close();
