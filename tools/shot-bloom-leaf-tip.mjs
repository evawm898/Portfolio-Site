/* ===================================================================
   shot-bloom-leaf-tip.mjs — THE LEAF TIP SHAPE AND ITS TERMINAL, the image
   Eva rules from (the leaf tip-shape session).

     node tools/shot-bloom-leaf-tip.mjs [outdir]   ->  <outdir>/leaf-tip-shape.png

   WHAT IT SHOWS. The SHIPPED leaf builder (leafPlan + buildLeafInto — nothing
   scratch, nothing re-derived) at the tip shape control's floor, its default,
   the middle of its range and its ceiling, on two blades: the 12 mm blade the
   brief named, and the widest blade the control reaches. Every cell is the
   whole leaf face-on at ONE scale per row, with a MACRO of the last stretch of
   the tip at ONE fixed px/mm across the whole sheet, so the terminal stub is
   compared at a constant magnification and the rows are not measuring the zoom.
   A third row holds the WIDTH fixed and sweeps the LENGTH, because the finding
   this sheet exists to show is that the terminal's share of the length does not
   move with the length.

   PRINT PREVIEW IS ON: every build is exportMode: true. For the leaf that is a
   distinction without a difference — buildLeafInto floors the half-width at
   TIP_HALF_MM in BOTH modes — and the caption prints the builder's own clamp
   record, which is the same record the panel's read-out prints.

   ITS RENDERER IS ITS OWN AND IS NOT THE APP'S (the Phase A rig's, lifted
   verbatim): orthographic, painter's, flat shaded. No pixel here is evidence
   about what bloom.html draws; what it IS evidence about is the OUTLINE, which
   is geometry. The consequence is that the SAME-TREE CONTROL IS EXACTLY 0
   BYTES BY CONSTRUCTION — every cell is rendered twice and the two buffers are
   compared and the count PRINTED, which is this project's contact-sheet rule
   (a pixel figure needs its own control) satisfied by an identity rather than
   by a noise floor.
   =================================================================== */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const OUT = process.argv[2] || path.join(ROOT, 'docs/img');
const f = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : String(x));

function png(w,h,rgb){
  const raw=Buffer.alloc((w*3+1)*h);
  for(let y=0;y<h;y++){raw[y*(w*3+1)]=0; rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}
  const crcT=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
  const crc=(b)=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
    const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td));
    return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
    chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

/* A 5x7 font. EVERY glyph is exactly 35 bits and the loader THROWS if one is
   not — the first version SKIPPED a malformed glyph, so a whole sheet of
   labels silently rendered as blank and the defect was invisible in the
   output. A loader that cannot complain is a loader that cannot be trusted. */
const RAW={
 ' ':'00000 00000 00000 00000 00000 00000 00000',
 'A':'01110 10001 10001 11111 10001 10001 10001','B':'11110 10001 11110 10001 10001 10001 11110',
 'C':'01111 10000 10000 10000 10000 10000 01111','D':'11110 10001 10001 10001 10001 10001 11110',
 'E':'11111 10000 10000 11110 10000 10000 11111','F':'11111 10000 10000 11110 10000 10000 10000',
 'G':'01111 10000 10000 10111 10001 10001 01111','H':'10001 10001 10001 11111 10001 10001 10001',
 'I':'11111 00100 00100 00100 00100 00100 11111','J':'00111 00010 00010 00010 00010 10010 01100',
 'K':'10001 10010 10100 11000 10100 10010 10001','L':'10000 10000 10000 10000 10000 10000 11111',
 'M':'10001 11011 10101 10101 10001 10001 10001','N':'10001 11001 10101 10011 10001 10001 10001',
 'O':'01110 10001 10001 10001 10001 10001 01110','P':'11110 10001 10001 11110 10000 10000 10000',
 'Q':'01110 10001 10001 10001 10101 10010 01101','R':'11110 10001 10001 11110 10100 10010 10001',
 'S':'01111 10000 10000 01110 00001 00001 11110','T':'11111 00100 00100 00100 00100 00100 00100',
 'U':'10001 10001 10001 10001 10001 10001 01110','V':'10001 10001 10001 10001 10001 01010 00100',
 'W':'10001 10001 10001 10101 10101 11011 10001','X':'10001 10001 01010 00100 01010 10001 10001',
 'Y':'10001 10001 01010 00100 00100 00100 00100','Z':'11111 00001 00010 00100 01000 10000 11111',
 '0':'01110 10001 10011 10101 11001 10001 01110','1':'00100 01100 00100 00100 00100 00100 01110',
 '2':'01110 10001 00001 00110 01000 10000 11111','3':'11111 00010 00100 00010 00001 10001 01110',
 '4':'00010 00110 01010 10010 11111 00010 00010','5':'11111 10000 11110 00001 00001 10001 01110',
 '6':'00110 01000 10000 11110 10001 10001 01110','7':'11111 00001 00010 00100 01000 01000 01000',
 '8':'01110 10001 10001 01110 10001 10001 01110','9':'01110 10001 10001 01111 00001 00010 01100',
 '.':'00000 00000 00000 00000 00000 01100 01100','-':'00000 00000 00000 11111 00000 00000 00000',
 ',':'00000 00000 00000 00000 01100 00100 01000','(':'00010 00100 01000 01000 01000 00100 00010',
 ')':'01000 00100 00010 00010 00010 00100 01000','/':'00001 00010 00010 00100 01000 01000 10000',
 ':':'00000 01100 01100 00000 01100 01100 00000','+':'00000 00100 00100 11111 00100 00100 00000',
 '=':'00000 00000 11111 00000 11111 00000 00000','x':'00000 00000 10001 01010 00100 01010 10001',
 '%':'11001 11010 00010 00100 01000 01011 10011','*':'00000 10101 01110 11111 01110 10101 00000',
 "'":'00100 00100 00000 00000 00000 00000 00000','!':'00100 00100 00100 00100 00100 00000 00100',
};
const FONT={};
for(const [k,v] of Object.entries(RAW)){
  const bits=v.replace(/ /g,'');
  if(bits.length!==35) throw new Error(`font glyph '${k}' is ${bits.length} bits, not 35`);
  FONT[k]=bits;
}
function text(buf,W,H,x0,y0,s,col,scale=1){
  let x=x0;
  for(const ch of String(s)){
    const g=FONT[ch]!==undefined?FONT[ch]:FONT[ch.toUpperCase()];
    if(g===undefined){x+=6*scale;continue;}
    for(let r=0;r<7;r++)for(let c=0;c<5;c++){ if(g[r*5+c]!=='1')continue;
      for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
        const px=x+c*scale+dx, py=y0+r*scale+dy;
        if(px>=0&&py>=0&&px<W&&py<H){const i=(py*W+px)*3; buf[i]=col[0];buf[i+1]=col[1];buf[i+2]=col[2];}}}
    x+=6*scale;}
  return x;
}

const NU_LEAF=40, NV_LEAF=10;
function render(positions,{W,H,dir,upHint=[0,0,1],pad=0.06,bg=[16,16,18],
  base=[168,196,168], accent=null, accentFrom=0, fixed=null, measureOnly=false}){
  const n=positions.length/9;
  const nz=(v)=>{const L=Math.hypot(...v);return [v[0]/L,v[1]/L,v[2]/L];};
  const cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const f=nz(dir);                       // view direction (from camera into scene)
  let r=cr(f,upHint); if(Math.hypot(...r)<1e-6) r=cr(f,[1,0,0]); r=nz(r);
  const u=nz(cr(r,f));                   // screen up
  const px=[],py=[],pz=[];
  for(let i=0;i<positions.length;i+=3){
    const p=[positions[i],positions[i+1],positions[i+2]];
    px.push(p[0]*r[0]+p[1]*r[1]+p[2]*r[2]);
    py.push(p[0]*u[0]+p[1]*u[1]+p[2]*u[2]);
    pz.push(p[0]*f[0]+p[1]*f[1]+p[2]*f[2]);
  }
  /* NOT Math.min(...px): the spread blows the stack past ~125k args, which the
     small proof cell was too small to show. A loop has no such limit. */
  let mnx=Infinity,mxx=-Infinity,mny=Infinity,mxy=-Infinity;
  for(let i=0;i<px.length;i++){ if(px[i]<mnx)mnx=px[i]; if(px[i]>mxx)mxx=px[i];
    if(py[i]<mny)mny=py[i]; if(py[i]>mxy)mxy=py[i]; }
  const sw=mxx-mnx, sh=mxy-mny;
  /* A FIXED SCALE AND CENTRE ACROSS A ROW, or the sweep measures the zoom
     rather than the angle (this repo's own recorded lesson). Auto-fit only
     when the caller does not supply them. */
  if(measureOnly) return {bounds:{mnx,mxx,mny,mxy}};
  const s=fixed?fixed.s:Math.min(W*(1-2*pad)/(sw||1), H*(1-2*pad)/(sh||1));
  const cx=fixed?fixed.cx:(mnx+mxx)/2, cy=fixed?fixed.cy:(mny+mxy)/2;
  const ox=W/2-cx*s, oy=H/2+cy*s;
  const X=px.map(v=>v*s+ox), Y=py.map(v=>oy-v*s);
  const buf=Buffer.alloc(W*H*3);
  for(let i=0;i<W*H;i++){buf[i*3]=bg[0];buf[i*3+1]=bg[1];buf[i*3+2]=bg[2];}
  const zb=new Float32Array(W*H).fill(Infinity);
  const light=nz([0.4,-0.7,0.6]);
  for(let t=0;t<n;t++){
    const a=t*3,b=t*3+1,c=t*3+2;
    const A=[positions[t*9],positions[t*9+1],positions[t*9+2]];
    const B=[positions[t*9+3],positions[t*9+4],positions[t*9+5]];
    const C=[positions[t*9+6],positions[t*9+7],positions[t*9+8]];
    const N=cr([B[0]-A[0],B[1]-A[1],B[2]-A[2]],[C[0]-A[0],C[1]-A[1],C[2]-A[2]]);
    const NL=Math.hypot(...N); if(NL<1e-12)continue; const nn=[N[0]/NL,N[1]/NL,N[2]/NL];
    let lam=Math.abs(nn[0]*light[0]+nn[1]*light[1]+nn[2]*light[2]);
    const face=(accent&&t>=accentFrom)?accent:base;
    const sh2=0.30+0.70*lam;
    const col=[Math.min(255,face[0]*sh2)|0,Math.min(255,face[1]*sh2)|0,Math.min(255,face[2]*sh2)|0];
    const x0=Math.max(0,Math.floor(Math.min(X[a],X[b],X[c]))),x1=Math.min(W-1,Math.ceil(Math.max(X[a],X[b],X[c])));
    const y0=Math.max(0,Math.floor(Math.min(Y[a],Y[b],Y[c]))),y1=Math.min(H-1,Math.ceil(Math.max(Y[a],Y[b],Y[c])));
    const d=(X[b]-X[a])*(Y[c]-Y[a])-(X[c]-X[a])*(Y[b]-Y[a]); if(Math.abs(d)<1e-12)continue;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const w0=((X[b]-X[a])*(y+0.5-Y[a])-(x+0.5-X[a])*(Y[b]-Y[a]))/d;
      const w1=((x+0.5-X[a])*(Y[c]-Y[a])-(X[c]-X[a])*(y+0.5-Y[a]))/d;
      const w2=1-w0-w1; if(w0<0||w1<0||w2<0)continue;
      const z=pz[a]*w2+pz[b]*w1+pz[c]*w0;
      const k=y*W+x; if(z>=zb[k])continue; zb[k]=z;
      buf[k*3]=col[0];buf[k*3+1]=col[1];buf[k*3+2]=col[2];
    }
  }
  return {buf,scale:s,bounds:{mnx,mxx,mny,mxy}};
}


/* ONE LEAF, ALONE, from the SHIPPED builder — the decoupled tool's own
   construction: the plan is the real plan off a real stem, the node is pinned
   at z = 0 so every cell stands at one height, and the leaf goes into a
   throwaway accumulator so nothing else is in frame. Level (angle 0) so the
   blade lies in the x/y plane and a face-on view is a plan view. */
function leaf(over) {
  const state = { ...DEFAULTS, stemLength: 70, stemDiameter: 6, leafNodes: 1, leafAngle: 0, ...over };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(state, acc);
  const plan = G.leafPlan(state, G.stemPlan(state, fr.hub, acc), acc);
  if (!plan.present) throw new Error('no leaf built');
  plan.rootZ = 0; plan.nodeDepthsMm = plan.nodeDepthsMm.map(() => 0);
  const solo = new G.MeshBuilder({ exportMode: true });
  const rep = G.buildLeafInto(solo, plan, state, 0, 0);
  return { acc: solo, rep, plan, state };
}
const tipCtl = CONTROLS.find((c) => c.id === 'leafTipShape');
const name = (n) => tipCtl.fmt(String(n), DEFAULTS, null).split(' · ')[1];

/* The tip is at +x on a level leaf at azimuth 0 (R = [1,0,0]); the blade's
   normal is +z, so the face-on view looks down -z. */
const DIR = [0, 0, -1], UP = [0, 1, 0];
const INK = [196, 206, 196], DIM = [128, 136, 132], HOT = [214, 150, 120], OK = [150, 210, 150];

const NS = [0.6, 1.3, 1.8, 3.0];
const ROWS = [
  { title: 'THE 12 MM BLADE (12 ACROSS X 36 LONG) - THE TERMINAL IS 13.3% OF THE WIDTH', W: 12, L: 36, ns: NS },
  { title: 'THE WIDEST BLADE (40 ACROSS X 120 LONG) - THE TERMINAL IS 4.0% OF THE WIDTH', W: 40, L: 120, ns: NS },
];
const LEN_ROW = { title: 'WIDTH HELD AT 17 MM, THE LENGTH SWEPT, AT THE DEFAULT 1.30 - THE SHARE DOES NOT MOVE', W: 17, Ls: [12, 36, 52, 120], n: 1.3 };

const cells = [];
for (const r of ROWS) for (const n of r.ns) cells.push({ row: r, W: r.W, L: r.L, n });
for (const L of LEN_ROW.Ls) cells.push({ row: LEN_ROW, W: LEN_ROW.W, L, n: LEN_ROW.n });
for (const c of cells) Object.assign(c, leaf({ leafLength: c.L, leafWidth: c.W, leafTipShape: c.n }));

/* Every cell is rendered TWICE and the two buffers compared: the control. */
let controlDiff = 0, controlCells = 0;
function shot(c, W, H, fixed) {
  const a = render(c.acc.positions, { W, H, dir: DIR, upHint: UP, fixed });
  const b = render(c.acc.positions, { W, H, dir: DIR, upHint: UP, fixed });
  controlCells++; for (let i = 0; i < a.buf.length; i++) if (a.buf[i] !== b.buf[i]) { controlDiff++; break; }
  return a;
}
function fitOf(list, W, H, pad = 0.08) {
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const c of list) { const r = render(c.acc.positions, { W, H, dir: DIR, upHint: UP, measureOnly: true });
    mnx = Math.min(mnx, r.bounds.mnx); mxx = Math.max(mxx, r.bounds.mxx); mny = Math.min(mny, r.bounds.mny); mxy = Math.max(mxy, r.bounds.mxy); }
  return { s: Math.min(W * (1 - 2 * pad) / ((mxx - mnx) || 1), H * (1 - 2 * pad) / ((mxy - mny) || 1)), cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2 };
}
/* THE MACRO: one fixed px/mm for the whole sheet, centred on the tip so the
   last MACRO_MM of every blade fills the frame at the same magnification. */
const CW = 440, CH = 300, MW = 440, MH = 170, MACRO_PXMM = 28, MACRO_MM = 14;
function macro(c) {
  const r = render(c.acc.positions, { W: MW, H: MH, dir: DIR, upHint: UP, measureOnly: true });
  const tipX = r.bounds.mxx;
  return { s: MACRO_PXMM, cx: tipX - MACRO_MM / 2 + 1, cy: (r.bounds.mny + r.bounds.mxy) / 2 };
}

const SW = CW * 4, ROWH = 62 + CH + MH + 44, SH = 170 + ROWH * 3 + 90;
const sheet = Buffer.alloc(SW * SH * 3);
for (let i = 0; i < SW * SH; i++) { sheet[i * 3] = 16; sheet[i * 3 + 1] = 16; sheet[i * 3 + 2] = 18; }
const blit = (src, sw, sh, x0, y0) => { for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
  if (y0 + y < 0 || y0 + y >= SH || x0 + x < 0 || x0 + x >= SW) continue;
  const d = ((y0 + y) * SW + (x0 + x)) * 3, s2 = (y * sw + x) * 3;
  sheet[d] = src[s2]; sheet[d + 1] = src[s2 + 1]; sheet[d + 2] = src[s2 + 2]; } };

text(sheet, SW, SH, 24, 22, 'THE LEAF TIP SHAPE AND ITS TERMINAL', INK, 3);
text(sheet, SW, SH, 24, 52, 'SHIPPED BUILDER (LEAFPLAN + BUILDLEAFINTO), PRINT PREVIEW ON, SERRATION AT ITS DEFAULT. THIS RENDERER IS NOT THE APP-S.', DIM, 2);
text(sheet, SW, SH, 24, 68, `THE END IS 2 X TIP_HALF_MM = ${f(2 * G.TIP_HALF_MM, 2)} MM ACROSS AT EVERY EXPONENT, IN BOTH MODES. THE CONTROL MOVES THE SHOULDER.`, INK, 2);
text(sheet, SW, SH, 24, 84, 'A POINTIER EXPONENT HUGS THE FLOOR FOR LONGER: THE ACUTE END LENGTHENS THE 1.6 MM STUB, IT DOES NOT SHARPEN IT.', HOT, 2);
text(sheet, SW, SH, 24, 100, `MACRO: THE LAST ${MACRO_MM} MM OF EVERY BLADE AT ${MACRO_PXMM} PX/MM, ONE MAGNIFICATION FOR THE WHOLE SHEET. WHOLE-LEAF CELLS SHARE ONE SCALE PER ROW.`, DIM, 2);
text(sheet, SW, SH, 24, 116, 'STUB FIGURES ARE THE BUILDER-S OWN CLAMP RECORD, THE ONE THE PANEL-S READ-OUT PRINTS.', DIM, 2);

let y = 150, idx = 0;
const rowGroups = [cells.slice(0, 4), cells.slice(4, 8), cells.slice(8, 12)];
const titles = [ROWS[0].title, ROWS[1].title, LEN_ROW.title];
rowGroups.forEach((group, gi) => {
  text(sheet, SW, SH, 24, y + 4, titles[gi], INK, 2);
  const fit = fitOf(group, CW, CH);
  text(sheet, SW, SH, 24, y + 22, `${f(fit.s, 2)} PX/MM ACROSS THIS ROW`, DIM, 2);
  group.forEach((c, col) => {
    const x0 = col * CW, y0 = y + 40;
    const r = shot(c, CW, CH, fit); blit(r.buf, CW, CH, x0, y0);
    const m = shot(c, MW, MH, macro(c)); blit(m.buf, MW, MH, x0, y0 + CH + 4);
    const cl = c.rep.tipClamp;
    const isDef = c.n === G.LEAF_TIP_SHAPE;
    text(sheet, SW, SH, x0 + 10, y0 + 8, `N ${f(c.n, 2)}${isDef ? ' (DEFAULT)' : ''}`, isDef ? OK : INK, 2);
    text(sheet, SW, SH, x0 + 10, y0 + 26, name(c.n).toUpperCase().replace(' (THE SHIPPED LEAF)', ''), DIM, 2);
    text(sheet, SW, SH, x0 + 10, y0 + 44, `${c.W} X ${c.L} MM`, DIM, 2);
    text(sheet, SW, SH, x0 + 10, y0 + CH + MH + 10, `STUB ${f(cl.mm, 2)} MM = ${f(100 * cl.fraction, 1)}% OF LENGTH`, cl.fraction > 0.05 ? HOT : INK, 2);
    text(sheet, SW, SH, x0 + 10, y0 + CH + MH + 28, `END ${f(cl.terminalMm, 2)} MM = ${f(100 * cl.ofWidth, 1)}% OF WIDTH, U ${f(cl.fromU, 4)}`, DIM, 2);
  });
  y += ROWH + 30;
});
text(sheet, SW, SH, 24, SH - 44, `SAME-TREE CONTROL: ${controlCells} CELLS RENDERED TWICE, ${controlDiff} DIFFER (AN IDENTITY - NO GPU, NO DAMPING, NO PAGE SESSION).`, DIM, 2);
text(sheet, SW, SH, 24, SH - 26, 'THE STUB-S SHARE OF THE LENGTH IS SET BY THE WIDTH AND THE EXPONENT, NEVER BY THE LENGTH: (W/2) F(U) = 0.8 MM IS A WIDTH EQUATION.', INK, 2);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/leaf-tip-shape.png`, png(SW, SH, sheet));
console.log(`wrote ${OUT}/leaf-tip-shape.png  ${SW}x${SH}`);
console.log(`same-tree control: ${controlCells} cells rendered twice, ${controlDiff} differ`);
for (const c of cells) { const cl = c.rep.tipClamp;
  console.log(`  ${String(c.W).padStart(2)} x ${String(c.L).padStart(3)} mm  n ${f(c.n, 2)}  clamp from u ${f(cl.fromU, 4)}  ${f(cl.mm, 3)} mm  ${f(100 * cl.fraction, 2)}% of length  terminal ${f(100 * cl.ofWidth, 1)}% of width  tris ${c.acc.triangleCount}`); }
