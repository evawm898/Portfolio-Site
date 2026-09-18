/*
 * proposal-panel-mock.mjs — renders the mock in docs/flower-standard-panel-mock.html.
 *
 * NOT A GATE, and it never writes to flower-registry.js. It imports the registry, applies
 * a proposal file to an IN-MEMORY copy (tier -> standard, plus any standardVisibleWhen the
 * proposal names), and evaluates the real `evalPredicate` for each view's state. So the
 * mock cannot show a panel the registry could not actually produce — it is generated from
 * the source of truth, not drawn to resemble it.
 *
 * RUN:  node docs/tools/proposal-panel-mock.mjs docs/tools/proposal.json out.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { CONTROLS, SECTIONS, evalPredicate } = await import(pathToFileURL(path.join(ROOT,'flower-registry.js')).href);
const PROP = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const OUT  = process.argv[3];

const FMT = { int:v=>String(v), f2:v=>(+v).toFixed(2), f1:v=>(+v).toFixed(1), f3:v=>(+v).toFixed(3),
  f2x:v=>(+v).toFixed(2)+'×', f1x:v=>(+v).toFixed(1)+'×', deg:v=>v+'°', f1deg:v=>(+v).toFixed(1)+'°',
  rounddeg:v=>Math.round(+v)+'°', signed2:v=>{const n=+v;return (n>0?'+':'')+n.toFixed(2);}, mm:v=>Math.round(+v)+' mm' };

// in-memory promotion: tier -> standard, plus standardVisibleWhen where the proposal says one is needed
const promoted = new Map(PROP.promotions.map(p=>[p.id,p]));
const REG = CONTROLS.map(c=>{ const p = promoted.get(c.id); if(!p) return c;
  return { ...c, tier:'standard', ...(p.standardVisibleWhen ? {standardVisibleWhen:p.standardVisibleWhen} : {}) }; });
const W = REG.filter(c=>!c.placeholder);
const DEF = Object.fromEntries(W.filter(c=>!c.uiOnly).map(c=>[c.id,c.default]));

const stdVisible = (state)=> W.filter(c=>c.tier==='standard').filter(c=>{
  const pred = c.standardVisibleWhen !== undefined ? c.standardVisibleWhen : c.visibleWhen;
  return evalPredicate(pred, state); });

const label = (c, state) => {
  if (PROP.amountSlot && PROP.amountSlot[c.id] && PROP.amountSlot[c.id] === state.tipStyle) return 'Amount';
  return c.label; };

const valueOf = (c,state)=>{ const v = state[c.id] ?? c.default;
  if (c.kind==='slider') return c.fmt ? FMT[c.fmt](v) : String(v);
  if (c.kind==='checkbox') return v ? 'ON' : 'OFF';
  if (c.kind==='select') { const o=(c.options||[]).find(o=>String(o.value)===String(v)); return o?o.text:String(v); }
  return String(v); };

const pct = (c,state)=>{ const v=Number(state[c.id] ?? c.default); return Math.round(((v-c.min)/(c.max-c.min))*100); };

function panel(title, sub, state){
  const vis = stdVisible(state);
  let h = `<section class="panel"><header><h2>${title}</h2><p class="sub">${sub}</p>
    <p class="count">${vis.length} controls</p></header>`;
  for (const s of SECTIONS){
    const rows = vis.filter(c=>c.section===s.id);
    if (!rows.length) continue;
    h += `<div class="sec"><div class="sec-head">${s.label}<span class="sec-n">${rows.length}</span></div>`;
    for (const c of rows){
      const isNew = promoted.has(c.id);
      h += `<div class="ctrl${isNew?' is-new':''}">`;
      h += `<div class="row"><span class="lab">${label(c,state)}${isNew?'<i class="tag">new</i>':''}</span><span class="val">${valueOf(c,state)}</span></div>`;
      if (c.kind==='slider') h += `<div class="track"><span style="left:${pct(c,state)}%"></span></div>`;
      else if (c.kind==='select') h += `<div class="sel">${valueOf(c,state)} <i>▾</i></div>`;
      else h += `<div class="chk"><i class="${state[c.id]?'on':''}"></i></div>`;
      h += `</div>`;
    }
    h += `</div>`;
  }
  return h + `</section>`;
}

const panels = [ panel('DEFAULTS','what a visitor sees on load', {...DEF}) ];
for (const v of PROP.views) panels.push(panel(v.title, v.sub, {...DEF, ...v.set}));

const css = `
:root{--ink:#e9ecec;--ink-dim:#8b9494;--ink-faint:#565f5f;--petrol:#1c6b6b;--petrol-bright:#2fa3a3;
--line:rgba(233,236,236,.13);--line-strong:rgba(233,236,236,.28);--mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;}
*{box-sizing:border-box}
body{margin:0;padding:1.6rem;background:#0b0d0d;color:var(--ink);font-family:var(--mono);}
h1{font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:var(--petrol-bright);margin:0 0 .4rem;}
.lede{font-size:11.5px;line-height:1.7;color:var(--ink-dim);max-width:62ch;margin:0 0 1.6rem;letter-spacing:.04em}
.grid{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start}
.panel{width:300px;flex:none;background:rgba(12,14,14,.86);border:1px solid var(--line-strong);padding:1.1rem 1.1rem .9rem;}
.panel header{border-bottom:1px solid var(--line);padding-bottom:.8rem;margin-bottom:.9rem}
h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--petrol-bright);margin:0 0 .35rem}
.sub{font-size:10px;letter-spacing:.05em;color:var(--ink-dim);margin:0 0 .3rem;line-height:1.5}
.count{font-size:10px;color:var(--ink-faint);margin:0;letter-spacing:.12em;text-transform:uppercase}
.sec{margin-bottom:1rem}
.sec-head{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-dim);border-bottom:1px solid var(--line);padding-bottom:.45rem;margin-bottom:.7rem}
.sec-n{color:var(--ink-faint)}
.ctrl{margin-bottom:.8rem}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;margin-bottom:.35rem}
.lab{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-dim)}
.val{font-size:10.5px;color:var(--petrol-bright);font-variant-numeric:tabular-nums;white-space:nowrap}
.track{position:relative;height:2px;background:var(--line-strong)}
.track span{position:absolute;top:-4px;width:10px;height:10px;margin-left:-5px;background:var(--petrol-bright)}
.sel{border:1px solid var(--line-strong);padding:.35rem .5rem;font-size:10.5px;color:var(--ink);display:flex;justify-content:space-between;letter-spacing:.06em}
.sel i{color:var(--ink-faint);font-style:normal}
.chk i{display:inline-block;width:11px;height:11px;border:1px solid var(--line-strong)}
.chk i.on{background:var(--petrol-bright);border-color:var(--petrol-bright)}
.is-new .lab{color:var(--petrol-bright)}
.is-new .track{background:rgba(47,163,163,.35)}
.tag{font-style:normal;font-size:8.5px;letter-spacing:.14em;margin-left:.4rem;color:#0b0d0d;background:var(--petrol-bright);padding:.05rem .25rem;vertical-align:middle}
.key{font-size:10.5px;color:var(--ink-dim);margin:0 0 1.4rem;letter-spacing:.05em}
.key b{color:var(--petrol-bright);font-weight:400}
`;
fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>${PROP.title}</title><style>${css}</style>
<h1>${PROP.title}</h1><p class="lede">${PROP.lede}</p>
<p class="key"><b>Teal label + “new”</b> = the control this proposal promotes. Everything else is Standard today. Rendered from <code>flower-registry.js</code> with the proposal applied in memory — no registry file was edited.</p>
<div class="grid">${panels.join('\n')}</div>`);
console.log('wrote', OUT, panels.length, 'panels');
