/*
 * shot-panel-matrix.mjs — contact sheet of the CONTROL PANEL across the whole visibility
 * matrix, in both tiers. Writes one PNG per (config x tier) plus MANIFEST.txt of sha256s,
 * so "the panel is unchanged" is a diff of 66 hashes rather than an eyeball of one screen.
 *
 * WHY NOT JUST THE DEFAULT SCREEN: the panel's subject is CONDITIONAL visibility. At the
 * default config most conditions sit at one polarity and never flip, so a sheet taken there
 * exercises almost none of what changed. tools/visibility-matrix.mjs drives every predicate
 * to both polarities; this shoots all of it.
 *
 * The 3D canvas is hidden before shooting — it is not deterministic frame to frame, and a
 * sheet that fails on renderer noise is a sheet nobody reads. This measures the PANEL.
 *
 * Dev-only (not a CI gate): the byte-exact assertion lives in tools/dump-visibility.mjs,
 * which compares every control x every config x both tiers as data. This is the human-eye
 * companion to it — the metric screens, eyes decide.
 *
 * RUN:  node tools/shot-panel-matrix.mjs <outDir>
 *       diff <before>/MANIFEST.txt <after>/MANIFEST.txt
 */
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import crypto from 'node:crypto';
import { findChromium } from './chromium-harness.mjs';
import { RESET, MATRIX } from './visibility-matrix.mjs';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'), THREE_VERSION='0.161.0', OUT=process.argv[2];
fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/flower.html';
  fs.readFile(path.join(ROOT,p),(e,d)=>{if(e){r.writeHead(404);r.end();return;} r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r)); const port=server.address().port;
const browser=await chromium.launch({executablePath:findChromium(),args:['--no-sandbox','--use-gl=swiftshader','--force-device-scale-factor=1','--hide-scrollbars']});
const page=await (await browser.newContext({viewport:{width:1400,height:1000},deviceScaleFactor:1})).newPage();
await page.route('**cdn.jsdelivr.net/**',(rt)=>{const rel=new URL(rt.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`,'');
  try{rt.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(path.join(ROOT,'node_modules/three',rel))});}catch{rt.abort();}});
await page.goto(`http://127.0.0.1:${port}/flower.html`,{waitUntil:'load',timeout:60000});
await page.waitForFunction(()=>{const e=document.getElementById('readout');return e&&/tris/.test(e.textContent);},{timeout:60000});
await page.addStyleTag({content:'canvas{visibility:hidden !important}'});   // panel only; the 3D frame is not deterministic
const tier=async(a)=>{await page.evaluate((x)=>{const t=document.getElementById('advancedToggle');
  if(t.checked!==x){t.checked=x;t.dispatchEvent(new Event('change',{bubbles:true}));}},a); await page.waitForTimeout(160);};
const setv=(ss)=>page.evaluate((s)=>{const bad=[];for(const x of s){const el=document.getElementById(x.id);if(!el){bad.push(x.id+':absent');continue;}
  el.value=x.value;el.dispatchEvent(new Event(x.evt||'input',{bubbles:true}));if((x.evt||'input')!=='change')el.dispatchEvent(new Event('change',{bubbles:true}));
  if(String(el.value)!==String(x.value))bad.push(`${x.id}=${el.value}!=${x.value}`);}return bad;},ss);
const manifest=[];
for(const cfg of MATRIX){
  await tier(true);
  const bad=[...await setv(RESET),...await setv(cfg.set)];
  if(bad.length) throw new Error(`${cfg.label}: read-back failed — ${bad.join('; ')}`);
  for(const adv of [false,true]){
    await tier(adv);
    await page.evaluate(()=>{document.querySelectorAll('.fl-acc__head[aria-expanded]').forEach(h=>{if(h.getAttribute('aria-expanded')!=='true')h.click();});});
    await page.waitForTimeout(220);
    const slug=cfg.label.replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,54)+'--'+(adv?'advanced':'standard');
    const fp=path.join(OUT,slug+'.png');
    await (await page.$('.fl-panel')).screenshot({path:fp});
    manifest.push(`${crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex').slice(0,32)}  ${slug}`);
  }
}
fs.writeFileSync(path.join(OUT,'MANIFEST.txt'),manifest.sort().join('\n')+'\n');
console.log(`${manifest.length} panel shots -> ${OUT}`);
await browser.close(); server.close();
