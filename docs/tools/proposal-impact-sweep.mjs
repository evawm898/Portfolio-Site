/*
 * proposal-impact-sweep.mjs — evidence for docs/flower-standard-visibility-proposal.md.
 *
 * NOT A GATE. It asserts nothing and is not wired into CI; it lives under docs/ so it is
 * never mistaken for one. It is read-only with respect to the repository — it drives the
 * live page in a headless browser and writes one JSON file.
 *
 * WHAT IT MEASURES: for each Standard choice that gates controls, render that choice's
 * default, then drive every gated control to each end of its range and count changed
 * pixels against that baseline. Fixed camera, no refit between shots. Pixel diff, never
 * bounding box — 48 controls in this project measure 0.000 mm of envelope change and 46
 * of them change the flower completely, so an envelope metric would rank them all zero.
 *
 * WHAT IT DOES NOT MEASURE: anything hidden from the default camera (the sepals and the
 * junction sit behind the bloom), and it under-rewards a control that DELETES geometry,
 * which can only score on the pixels it vacates. Ranking within one choice is meaningful;
 * magnitudes across choices are not.
 *
 * Every value is applied and read back — a value the UI silently rewrites would measure a
 * different design from the one it names.
 *
 * RUN:  npm i --no-save three@0.161.0 playwright-core playwright
 *       IMPACT_OUT=/tmp/impact.json node docs/tools/proposal-impact-sweep.mjs [choice ...]
 *       (no arguments = every choice, ~9 min; chunk it by naming choices)
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from '../../tools/chromium-harness.mjs';
import { decodePNG } from '../../tools/pngdec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml' };
const { CONTROLS, evalPredicate } = await import(pathToFileURL(path.join(ROOT,'flower-registry.js')).href);
const WIRED = CONTROLS.filter(c=>!c.placeholder && !c.uiOnly);
const DEF = Object.fromEntries(WIRED.map(c=>[c.id,String(c.default)]));
const byId = Object.fromEntries(WIRED.map(c=>[c.id,c]));

const CHOICES = [
  ['bloomType/bilateral', {bloomType:'bilateral'}],
  ['infillType/strands',  {infillType:'strands'}],
  ['infillType/bone',     {infillType:'bone'}],
  ['infillType/spacecol', {infillType:'spacecol'}],
  ['tipStyle/jagged',     {tipStyle:'jagged'}],
  ['tipStyle/scallop',    {tipStyle:'scallop'}],
  ['centerArch/classic',  {centerArch:'classic'}],
  ['centerArch/dense',    {centerArch:'dense'}],
  ['centerArch/disc',     {centerArch:'disc'}],
  ['centerArch/petaloid', {centerArch:'petaloid'}],
  ['sepalsType/sepals',   {sepalsType:'sepals'}],
  ['leafType/compound',   {stemType:'stem', leafType:'compound'}],
  ['leafType/lobed',      {stemType:'stem', leafType:'lobed'}],
  ['leafType/oval',       {stemType:'stem', leafType:'oval'}],
  ['leafType/narrow',     {stemType:'stem', leafType:'narrow'}],
  ['EXTRA/defaults',      {}],
  ['EXTRA/stem',          {stemType:'stem'}],
];
const EXTRA_IDS = { 'EXTRA/defaults': ['width','taper','petalCup','curlAmount','crossSection','layerCount','thickScale','petalTwist','reliefAmp','veinBranchStart','edgeTermination'], 'EXTRA/stem': ['stemLength','stemThickness','stemCurve','stemNodeCount','stemBudMode'] };

const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/flower.html';
  fs.readFile(path.join(ROOT,p),(err,data)=>{ if(err){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'}); res.end(data); }); });
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: findChromium(), args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport:{width:560,height:560}, deviceScaleFactor:1 });
const page = await ctx.newPage();
page.on('dialog', d=>d.accept().catch(()=>{}));
await page.route('**cdn.jsdelivr.net/**', route=>{ const rel=new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`,'');
  try{ route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(path.join(ROOT,'node_modules/three',rel))}); }catch{ route.abort(); } });
await page.goto(`http://127.0.0.1:${port}/flower.html`,{waitUntil:'load',timeout:60000});
await page.waitForFunction(()=>{const el=document.getElementById('readout');return el&&/tris/.test(el.textContent);},{timeout:60000});
// Freeze the camera: auto-rotate off, and no refit between shots.
await page.evaluate(()=>{ const t=document.getElementById('autoRotate'); if(t&&t.checked){t.checked=false;t.dispatchEvent(new Event('change',{bubbles:true}));} });

const setMany = async (kv)=> { const bad = await page.evaluate((o)=>{ const out=[];
    for (const [id,value] of Object.entries(o)) { const el=document.getElementById(id); if(!el){out.push(id+':absent');continue;}
      if (el.type==='checkbox') { const want = (value===true||value==='true'); if(el.checked!==want){el.checked=want; el.dispatchEvent(new Event('change',{bubbles:true}));} continue; }
      el.value=String(value); el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));
      if (el.tagName!=='SELECT') el.dispatchEvent(new Event('change',{bubbles:true}));
      if (String(el.value)!==String(value)) out.push(`${id}: set ${value} reads ${el.value}`); }
    return out; }, kv); return bad; };

const shot = async ()=>{ await page.waitForTimeout(280);
  const buf = await page.locator('#flower-canvas').screenshot({ type:'png' });
  const tris = await page.evaluate(()=>document.getElementById('readout')?.textContent||'');
  return { px: decodePNG(buf), tris: (tris.match(/([\d,]+)\s*tris/)||[])[1] || '?' }; };

const diff = (a,b)=>{ const A=a.data,B=b.data; let n=0, tot=0; const N=Math.min(A.length,B.length);
  for(let i=0;i<N;i+=4){ const d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]); if(d>18)n++; tot++; }
  return n/tot; };

const out = {}; const T0=Date.now();
const ONLY = process.argv.slice(2);
for (const [label, cfg] of CHOICES.filter(c=>!ONLY.length||ONLY.includes(c[0]))) {
  await setMany(DEF); await setMany(cfg);
  const state = {...DEF, ...cfg};
  const cands = EXTRA_IDS[label] ? EXTRA_IDS[label].map(i=>byId[i]).filter(Boolean) : WIRED.filter(c=>c.id!=='bloomType'&&!(c.id in cfg)&&evalPredicate(c.visibleWhen,state)&&
      Object.keys(cfg).some(k=>{ const alt = byId[k].options.find(o=>String(o.value)!==String(cfg[k])); return alt && !evalPredicate(c.visibleWhen,{...state,[k]:alt.value}); }));
  const base = await shot();
  const rows = [];
  for (const c of cands) {
    const vals = c.kind==='checkbox' ? [String(!c.default)] : c.kind==='select' ? c.options.map(o=>o.value).filter(v=>String(v)!==String(c.default)) : [String(c.min), String(c.max)];
    let best=0, bestv=null, tri='';
    for (const v of vals) { const bad=await setMany({[c.id]:v}); const s=await shot(); const d=diff(base.px,s.px);
      if(d>best){best=d;bestv=v;tri=s.tris;} if(bad.length) rows.push({id:c.id,note:'SETFAIL '+bad.join(';')}); }
    await setMany({[c.id]: String(c.default)});
    rows.push({ id:c.id, label:c.label, kind:c.kind, pct:+(best*100).toFixed(2), at:bestv, tris:tri, std:c.tier==='standard'||false });
  }
  rows.sort((a,b)=>(b.pct||0)-(a.pct||0));
  out[label] = { baseTris: base.tris, rows };
  console.error('done', label, Date.now()-T0, 'ms');
}
await browser.close(); server.close();
fs.writeFileSync(process.env.IMPACT_OUT||'/tmp/impact.json', JSON.stringify(out,null,1));
