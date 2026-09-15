/* ===================================================================
   shot-bloom-leaf-phase-a.mjs — THE PHASE A PICTURE. Eva rules the LEAF
   ANGLE default from this sheet; no default is typed in code (ruling 7).

     node tools/shot-bloom-leaf-phase-a.mjs [outdir]

   IT IS A SCRATCH RIG. It ships nothing, emits nothing into the geometry,
   and is imported by nothing. It composes the SHIPPED bloom
   (buildBloomInto) with SCRATCH leaves built from the SHIPPED outline
   (widthProfile) and the SHIPPED form law (petalForm) laid on a PETIOLE
   frame — which is exactly what tools/bloom-leaf-discovery.mjs measured to
   be available (its §1-§4).

   ITS RENDERER IS ITS OWN AND IS NOT THE APP'S. Orthographic, painter's
   algorithm, flat shaded, written here. So NO PIXEL ON THIS SHEET IS
   EVIDENCE ABOUT WHAT bloom.html DRAWS. What it IS evidence about is
   ARRANGEMENT and ANGLE, which are geometry. The consequence is a virtue
   rather than a compromise: with no GPU, no damping and no page session the
   SAME-TREE CONTROL IS EXACTLY 0 BYTES BY CONSTRUCTION — an identity, which
   this project's contact-sheet rule says needs no noise floor, where a
   thresholded pixel claim would have needed a per-row control.

   PRINT PREVIEW IS ON: every build is exportMode: true, the export-floored
   geometry, which is this rig's honest equivalent of the app's toggle.

   ONE SCALE PER ROW-GROUP, from the UNION of that group's projected extents.
   A row whose cells each auto-fit would draw the same leaf at five sizes and
   the angle sweep would be measuring the zoom.
   =================================================================== */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
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
/* The root blend stands down via the cap's declared stalk — A1's measurement:
   with it, ring.width is unread and 0 of 4001 outline samples move. */
const PETIOLE_CAP={stalk:{until:1e-9,halfWidth:0}};

/* THE THREE PHYLLOTAXIES — the flower's own law, ported verbatim (ruling 8).
   alternate: one leaf, flipping 180 deg a node. opposite: two across,
   each node turned 90 (decussate). whorled: three at 120, turning 45 a node. */
function leafAzimuths(phyllo,i){
  if(phyllo==='opposite'){const b=i*Math.PI/2; return [b,b+Math.PI];}
  if(phyllo==='whorled'){const b=i*(Math.PI/4); return [b,b+2*Math.PI/3,b+4*Math.PI/3];}
  return [i*Math.PI];
}
/* NODE PLACEMENT — the flower's law, expressed in MILLIMETRES along the stem
   (ruling 9): evenly spread, inset from both ends, no 48-point polyline and
   no snapping. Returns mm DOWN from the hub's underside. */
function nodeDepthsMm(n,lengthMm){
  return Array.from({length:n},(_,k)=>(n===1?0.55:(0.16+(0.86-0.16)*k/(n-1)))*lengthMm);
}

/* ---- one leaf: a petiole rod + a blade on a PETIOLE frame ------------- */
function leafInto(acc,state,{L,W,angleDeg,az,node,petioleR,petioleLen}){
  const th=angleDeg*Math.PI/180;
  const R=[Math.cos(az),Math.sin(az),0], T=[-Math.sin(az),Math.cos(az),0];
  const form=G.petalForm(state,W/2,state.sheetThickness);
  const prof=G.widthProfile(state,{width:6,thickness:state.sheetThickness},W/2,PETIOLE_CAP,acc,L);
  const t=acc.floorThickness(state.sheetThickness);
  /* the outward-and-up unit vector, frameAt's own D at u = 0 */
  const D0=form?form.frameAt(R,T,th,0).D:[R[0]*Math.cos(th),R[1]*Math.cos(th),Math.sin(th)];
  /* THE PETIOLE IS ROOTED IN THE WALL, NOT ON THE AXIS — A2's finding. It
     starts at the bore wall's mid-thickness so it is embedded at every angle. */
  const base=[node.r0*R[0],node.r0*R[1],node.z];
  const sides=12, rp=petioleR;
  const ax=D0, up=T, bi=[ax[1]*up[2]-ax[2]*up[1],ax[2]*up[0]-ax[0]*up[2],ax[0]*up[1]-ax[1]*up[0]];
  const pring=(s)=>Array.from({length:sides},(_,i)=>{const a=2*Math.PI*i/sides,cc=Math.cos(a)*rp,ss=Math.sin(a)*rp;
    return [base[0]+ax[0]*s+up[0]*cc+bi[0]*ss, base[1]+ax[1]*s+up[1]*cc+bi[1]*ss, base[2]+ax[2]*s+up[2]*cc+bi[2]*ss];});
  const PA=pring(-node.embed),PB=pring(petioleLen);
  for(let i=0;i<sides;i++){const j=(i+1)%sides; acc.quad(PA[i],PA[j],PB[j],PB[i]);}
  for(let i=1;i<sides-1;i++){acc.tri(PA[0],PA[i+1],PA[i]); acc.tri(PB[0],PB[i],PB[i+1]);}
  /* ---- the blade, UNIFORM stations (A1: no ladder, no seam, no foot) ---- */
  const bladeBase=[base[0]+ax[0]*petioleLen,base[1]+ax[1]*petioleLen,base[2]+ax[2]*petioleLen];
  const rows=[];
  for(let i=0;i<=NU_LEAF;i++){
    const u=i/NU_LEAF;
    const fr=form?form.frameAt(R,T,th,u):{D:D0,T,N:[ -R[0]*Math.sin(th),-R[1]*Math.sin(th),Math.cos(th)]};
    const C=[bladeBase[0]+fr.D[0]*u*L,bladeBase[1]+fr.D[1]*u*L,bladeBase[2]+fr.D[2]*u*L];
    const h=Math.max(prof.halfWidthAt(u),G.TIP_HALF_MM);
    const hb=Math.max(prof.halfWidthBaseAt(u),G.TIP_HALF_MM);
    const sect=form?form.sectAt(C,fr.T,fr.N,h,u,hb):null;
    const cols=[];
    for(let j=0;j<=NV_LEAF;j++){const v=-1+2*j/NV_LEAF;
      if(sect){const s=sect(v); cols.push({P:s.P,n:s.n});}
      else cols.push({P:[C[0]+fr.T[0]*h*v,C[1]+fr.T[1]*h*v,C[2]+fr.T[2]*h*v],n:fr.N});}
    rows.push(cols);
  }
  const off=(p,n,s)=>[p[0]+n[0]*s,p[1]+n[1]*s,p[2]+n[2]*s];
  for(let i=0;i<NU_LEAF;i++)for(let j=0;j<NV_LEAF;j++){
    const A=rows[i][j],B=rows[i][j+1],C2=rows[i+1][j+1],D=rows[i+1][j];
    acc.quad(off(A.P,A.n,t/2),off(D.P,D.n,t/2),off(C2.P,C2.n,t/2),off(B.P,B.n,t/2));
    acc.quad(off(A.P,A.n,-t/2),off(B.P,B.n,-t/2),off(C2.P,C2.n,-t/2),off(D.P,D.n,-t/2));
  }
  for(let i=0;i<NU_LEAF;i++)for(const j of [0,NV_LEAF]){
    const A=rows[i][j],B=rows[i+1][j];
    acc.quad(off(A.P,A.n,t/2),off(B.P,B.n,t/2),off(B.P,B.n,-t/2),off(A.P,A.n,-t/2));
  }
  for(const i of [0,NU_LEAF])for(let j=0;j<NV_LEAF;j++){
    const A=rows[i][j],B=rows[i][j+1];
    acc.quad(off(A.P,A.n,t/2),off(B.P,B.n,t/2),off(B.P,B.n,-t/2),off(A.P,A.n,-t/2));
  }
  return {prof,form};
}

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

/* THE BLOOM IS AT ITS SHIPPED DEFAULTS. Only the LEAF carries the serration
   and the cup — two states, because a lobeDepth on the shared state serrates
   the PETALS too, which would photograph a bloom nobody asked for. */
const STEM={stemLength:70,stemDiameter:6};
const LEAF_STATE={...DEFAULTS,...STEM,
  petalBaseTaper:0.85,petalTipTaper:1.15,petalTipShape:1.30,   // lanceolate
  lobeDepth:0.26,lobeCount:9,lobeCoverage:1.00,
  lobeCrestShape:1.00,lobeNotchShape:1.00,                     // the triangle wave: serrate
  petalCup:0.45, petalTwist:0};
const LEAF={L:52,W:17,petioleR:0.9,petioleLen:7};

function plant({phyllo,nodes,angleDeg}){
  const state={...DEFAULTS,...STEM};
  const acc=new G.MeshBuilder({exportMode:true});
  const rep=G.buildBloomInto(acc,state);
  const bloomTris=acc.triangleCount;
  const plan=rep.stem;
  const depths=nodeDepthsMm(nodes,plan.lengthMm);
  let leaves=0;
  depths.forEach((d,i)=>{
    const node={r0:(plan.boreR+plan.outerR)/2, z:plan.rootZ-d, embed:1.5};
    for(const az of leafAzimuths(phyllo,i)){
      leafInto(acc,LEAF_STATE,{...LEAF,angleDeg,az,node}); leaves++;
    }
  });
  return {acc,bloomTris,leaves,plan};
}

const DIR=[0,1,-0.16];                       // a low three-quarter, so the angle reads
const ACC=[198,166,112];                     // the leaves, so they separate from the bloom
const INK=[196,206,196], DIM=[128,136,132];

/* ---- pass 1: every cell, to find ONE scale the whole sheet shares ------ */
const cells=[];
for(const nodes of [3,5]) for(const phyllo of ['alternate','opposite','whorled'])
  cells.push({kind:'grid',phyllo,nodes,angleDeg:35});
for(const angleDeg of [0,20,35,50,70])
  cells.push({kind:'angle',phyllo:'alternate',nodes:3,angleDeg});

const built=cells.map(c=>({c,...plant(c)}));
const CW=500, CH=560, CW2=300, CH2=420;
/* ONE SCALE PER ROW-GROUP, from the UNION of that group's projected extents,
   so every cell in a group fits and none of them is scaled to itself. A row
   whose cells each auto-fit would show the same leaf at five sizes and the
   sweep would be measuring the zoom (this repo's own recorded lesson). */
function groupFit(list,W,H,pad=0.10){
  let mnx=Infinity,mxx=-Infinity,mny=Infinity,mxy=-Infinity;
  for(const b of list){ const r=render(b.acc.positions,{W,H,dir:DIR,measureOnly:true});
    mnx=Math.min(mnx,r.bounds.mnx); mxx=Math.max(mxx,r.bounds.mxx);
    mny=Math.min(mny,r.bounds.mny); mxy=Math.max(mxy,r.bounds.mxy); }
  const s=Math.min(W*(1-2*pad)/((mxx-mnx)||1), H*(1-2*pad)/((mxy-mny)||1));
  return {s,cx:(mnx+mxx)/2,cy:(mny+mxy)/2};
}
const gridCells=built.filter(b=>b.c.kind==='grid'), angleCells=built.filter(b=>b.c.kind==='angle');
const FIT_G=groupFit(gridCells,CW,CH), FIT_A=groupFit(angleCells,CW2,CH2);
console.log(`grid rows share ${FIT_G.s.toFixed(2)} px/mm ; the angle row shares ${FIT_A.s.toFixed(2)} px/mm`);

/* ---- pass 2: draw ------------------------------------------------------ */
const SW=1500, SH=168+CH+CH+CH2+96;
const sheet=Buffer.alloc(SW*SH*3);
for(let i=0;i<SW*SH;i++){sheet[i*3]=16;sheet[i*3+1]=16;sheet[i*3+2]=18;}
const blit=(src,sw,sh,x0,y0)=>{for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
  const d=((y0+y)*SW+(x0+x))*3,s2=(y*sw+x)*3;
  if(y0+y<0||y0+y>=SH||x0+x<0||x0+x>=SW)continue;
  sheet[d]=src[s2];sheet[d+1]=src[s2+1];sheet[d+2]=src[s2+2];}};

text(sheet,SW,SH,24,22,'LEAVES ON THE BLOOM STEM - PHASE A',INK,3);
text(sheet,SW,SH,24,52,"SCRATCH RIG - SHIPS NOTHING. THIS RENDERER IS NOT THE APP'S. EXPORT MODE (PRINT PREVIEW ON).",DIM,2);
text(sheet,SW,SH,24,68,'SAME-TREE CONTROL = 0 BYTES, AN IDENTITY (NO GPU, NO PAGE SESSION).',DIM,2);
text(sheet,SW,SH,24,84,`STEM ${STEM.stemLength} x ${STEM.stemDiameter} MM . BLOOM AT DEFAULTS . LEAF ${LEAF.L} x ${LEAF.W} MM . PETIOLE ${f(2*LEAF.petioleR,1)} MM DIA x ${LEAF.petioleLen} MM`,DIM,2);
text(sheet,SW,SH,24,100,`GRID ROWS ${f(FIT_G.s,2)} Px/MM . ANGLE ROW ${f(FIT_A.s,2)} Px/MM (ITS 0-DEG CELL IS WIDER)`,DIM,2);

let idx=0;
for(let row=0;row<2;row++){
  for(let col=0;col<3;col++){
    const b=built[idx++]; const c=b.c;
    const r=render(b.acc.positions,{W:CW,H:CH,dir:DIR,accent:ACC,accentFrom:b.bloomTris,fixed:FIT_G});
    const x0=col*CW, y0=110+row*CH;
    blit(r.buf,CW,CH,x0,y0);
    text(sheet,SW,SH,x0+16,y0+12,`${c.phyllo.toUpperCase()} . ${c.nodes} NODES . ${b.leaves} LEAVES`,INK,2);
    text(sheet,SW,SH,x0+16,y0+30,`${LEAF.L}x${LEAF.W} MM . ${c.angleDeg} DEG . 9 TEETH`,DIM,2);
  }
}
const yA=152+2*CH;
text(sheet,SW,SH,24,yA+2,'THE ANGLE - WHAT THIS SHEET IS FOR. ALTERNATE, 3 NODES, ONE SCALE.',INK,2);
text(sheet,SW,SH,24,yA+18,'OVERHANG IS MEASURED FROM VERTICAL: A LEAF AT 0 DEG IS A PURE OVERHANG.',DIM,2);
for(let col=0;col<5;col++){
  const b=built[idx++]; const c=b.c;
  const r=render(b.acc.positions,{W:CW2,H:CH2,dir:DIR,accent:ACC,accentFrom:b.bloomTris,fixed:FIT_A});
  const x0=col*CW2, y0=yA+40;
  blit(r.buf,CW2,CH2,x0,y0);
  const over=90-c.angleDeg;
  text(sheet,SW,SH,x0+12,y0+8,`${c.angleDeg} DEG`,INK,2);
  text(sheet,SW,SH,x0+12,y0+26,`OVERHANG ${over}`,over>45?[214,150,120]:DIM,2);
  text(sheet,SW,SH,x0+12,y0+42,over>45?'PAST 45 - SUPPORT':'UNDER 45 - OK',over>45?[214,150,120]:[140,180,140],2);
}
text(sheet,SW,SH,24,SH-52,'THE 45 DEG OVERHANG RULE IS THE CLASSIC FDM ONE AND IS A DECLARED GUESS,',DIM,2);
text(sheet,SW,SH,24,SH-36,'LIKE EVERY FLOOR HERE - NOTHING IN THIS PROJECT HAS EVER BEEN PRINTED.',DIM,2);
text(sheet,SW,SH,24,SH-18,'EVA RULES THE DEFAULT ANGLE FROM THIS ROW. NO DEFAULT IS TYPED IN CODE.',INK,2);

fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(`${OUT}/leaf-phase-a.png`,png(SW,SH,sheet));
console.log(`wrote ${OUT}/leaf-phase-a.png  ${SW}x${SH}`);
for(const b of built) console.log(`  ${b.c.kind==='grid'?'grid ':'angle'} ${b.c.phyllo.padEnd(9)} nodes=${b.c.nodes} angle=${String(b.c.angleDeg).padStart(2)}  leaves=${b.leaves}  tris=${b.acc.triangleCount} (bloom ${b.bloomTris})`);
