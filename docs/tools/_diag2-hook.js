// ---- ROUND 2: viability of a cleft-aware clip bound, and the two candidate fixes ----
window.__diag2 = async function (SIMPLIFY_BOUND, WANT_DRAW) {
  SIMPLIFY_BOUND = !!SIMPLIFY_BOUND;
  const G = window.__diag2Geom || (window.__diag2Geom = await import('./flower-geometry.js'));
  const ui = readUI(); const P = resolveParams(ui); const cfg = G.cleftConfig(P);
  const MM = 26;
  const out = { lobes: cfg ? cfg.count : 0, depth: P.cleftDepth, density: P.density, L: P.L };

  let __drawClipOnly = [], __drawPartition = [], __drawRegions = [];
  const area = (poly) => { let a=0; for (let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length]; a+=p.x*q.y-q.x*p.y;} return Math.abs(a*0.5); };
  const inPoly = (x,y,poly) => { let s=false; for (let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    if (((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/(yj-yi)+xi)) s=!s;} return s; };
  const crossings = (poly) => { let mx=0; for (let k=1;k<40;k++){ const X=P.L*k/40; let c=0;
    for (let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length]; if((p.x<=X)!==(q.x<=X))c++;} if(c>mx)mx=c;} return mx; };
  const perimInVoid = (poly) => { let tot=0, bad=0;
    for (let i=0;i<poly.length;i++){ const p=poly[i],q=poly[(i+1)%poly.length];
      const len=Math.hypot(q.x-p.x,q.y-p.y); if(len<1e-12) continue;
      const st=Math.max(2,Math.min(40,Math.ceil(len/(P.L*0.004))));
      for(let k=0;k<st;k++){const t=(k+0.5)/st; tot+=len/st;
        if (G.petalMask(p.x+(q.x-p.x)*t, p.y+(q.y-p.y)*t, P, cfg) < -1e-9) bad+=len/st;} }
    return tot>0?bad/tot:0; };
  const areaInVoid = (poly, n) => { let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(const p of poly){if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;}
    let ins=0,vd=0; for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const x=x0+(x1-x0)*(i+0.5)/n, y=y0+(y1-y0)*(j+0.5)/n;
      if(!inPoly(x,y,poly))continue; ins++; if(G.petalMask(x,y,P,cfg)<0)vd++; }
    return ins?vd/ins:0; };

  // ---------- (1) A CLEFT-AWARE INNER BOUND: the mask level set at ribRadius(u) ----------
  // Marching squares over f = petalMask - ribRadius(u). Same construction maskContours
  // uses at f = petalMask; the only change is the threshold, which is what makes it an
  // INSET of the contour rather than the contour.
  const contMargin = !!P.continuousMargin && !P.solidBlade;
  const rAt = (x) => G.ribRadius(Math.max(0, Math.min(1, x / P.L)), P, contMargin);
  // The flare is a y-SCALE on the boundary (ribCenterline = outerAt * marginFlareFactor),
  // so apply it to the mask's y before thresholding: mask(x, y / f) - r(x). At f = 1
  // (continuous margin off) this is exactly petalMask - ribRadius.
  const flareAt = (x) => contMargin
    ? Math.max(1e-3, G.marginFlareFactor(Math.max(0, Math.min(1, x / P.L)), P.bundleTightness, P.flareRate))
    : 1;
  const boundField = (x, y) => G.petalMask(x, y / flareAt(x), P, cfg) * flareAt(x) - rAt(x);
  const levelContour = (nu) => {
    const L = Math.max(P.L, 1e-4);
    let Wmax = 1e-4; for (let i=0;i<=64;i++) Wmax = Math.max(Wmax, G.petalHalfWidth(i/64, P));
    const padY = Wmax*0.08 + L/nu, y0=-Wmax-padY, y1=Wmax+padY, x0=-L/nu, x1=L+L/nu;
    const dx=(x1-x0)/nu, nv=Math.max(8,Math.round((y1-y0)/dx)), dy=(y1-y0)/nv;
    const gx=(i)=>x0+i*dx, gy=(j)=>y0+j*dy;
    const val=new Float64Array((nu+1)*(nv+1));
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const X=gx(i),Y=gy(j);
      val[j*(nu+1)+i] = boundField(X, Y); }
    const V=(i,j)=>val[j*(nu+1)+i];
    const le=(xa,ya,va,xb,yb,vb)=>{const t=va/(va-vb);return {x:xa+(xb-xa)*t,y:ya+(yb-ya)*t};};
    const segs=[];
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
      const a=gx(i),b=gx(i+1),c=gy(j),d=gy(j+1);
      const v00=V(i,j),v10=V(i+1,j),v11=V(i+1,j+1),v01=V(i,j+1);
      let code=0; if(v00>0)code|=1; if(v10>0)code|=2; if(v11>0)code|=4; if(v01>0)code|=8;
      if(code===0||code===15)continue;
      const eB=()=>le(a,c,v00,b,c,v10), eR=()=>le(b,c,v10,b,d,v11), eT=()=>le(b,d,v11,a,d,v01), eL=()=>le(a,d,v01,a,c,v00);
      const p=(u,v)=>segs.push([u,v]);
      switch(code){ case 1: case 14: p(eL(),eB());break; case 2: case 13: p(eB(),eR());break;
        case 3: case 12: p(eL(),eR());break; case 4: case 11: p(eR(),eT());break;
        case 6: case 9: p(eB(),eT());break; case 7: case 8: p(eT(),eL());break;
        case 5: p(eL(),eT()); p(eB(),eR()); break; case 10: p(eL(),eB()); p(eR(),eT()); break; }
    }
    const key=(q)=>Math.round(q.x/(dx*0.25))+'_'+Math.round(q.y/(dy*0.25));
    const adj=new Map(); const add=(k,si,eA)=>{if(!adj.has(k))adj.set(k,[]);adj.get(k).push({si,eA});};
    for(let si=0;si<segs.length;si++){add(key(segs[si][0]),si,true);add(key(segs[si][1]),si,false);}
    const used=new Uint8Array(segs.length); const loops=[];
    for(let s0=0;s0<segs.length;s0++){ if(used[s0])continue; const loop=[]; let ci=s0, fa=true;
      while(ci>=0 && !used[ci]){ used[ci]=1; const cur=segs[ci];
        const A=fa?cur[0]:cur[1], B=fa?cur[1]:cur[0]; loop.push(A);
        const nb=adj.get(key(B))||[]; let ni=-1,nf=true;
        for(const e of nb){ if(!used[e.si]){ ni=e.si; nf=e.eA; break; } } ci=ni; fa=nf; }
      if(loop.length>=3) loops.push(loop); }
    loops.sort((a,b)=>area(b)-area(a));
    return loops;
  };
  const loops = levelContour(240);
  let bound = loops[0] || [];
  // COST CONTROL. cellAnnulus emits SUB(=5) ring points PER CELL EDGE, so slab triangles
  // scale with cell VERTEX count, not cell count. A raw marching-squares contour carries
  // ~1.3-1.9k vertices where the envelope carries 480, and every cell clipped against it
  // inherits a slice of that. flower-geometry.js already solves exactly this for the rim
  // with Douglas-Peucker ("most lie on nearly straight runs; lofting all of them would
  // multiply the rim's triangle count for nothing"), so measure the bound both raw and
  // simplified rather than assuming the fix must be expensive.
  const simplify = (pts, tol) => {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length-1] = 1;
    const st = [[0, pts.length-1]], t2 = tol*tol;
    while (st.length) { const [i0,i1] = st.pop(); if (i1 <= i0+1) continue;
      const a = pts[i0], b = pts[i1], dx = b.x-a.x, dy = b.y-a.y, l2 = dx*dx+dy*dy;
      let best = -1, bd = 0;
      for (let k = i0+1; k < i1; k++) { const q = pts[k]; let d2;
        if (l2 < 1e-18) { const ex=q.x-a.x, ey=q.y-a.y; d2 = ex*ex+ey*ey; }
        else { const t = Math.max(0, Math.min(1, ((q.x-a.x)*dx + (q.y-a.y)*dy)/l2));
               const ex = q.x-(a.x+dx*t), ey = q.y-(a.y+dy*t); d2 = ex*ex+ey*ey; }
        if (d2 > bd) { bd = d2; best = k; } }
      if (bd > t2 && best > 0) { keep[best] = 1; st.push([i0,best],[best,i1]); } }
    const o = []; for (let i = 0; i < pts.length; i++) if (keep[i]) o.push(pts[i]);
    return o; };
  // Tolerance at a quarter of the printable minimum feature (0.8 mm / 26 mm-per-unit),
  // so simplification cannot move the boundary by a printable amount.
  const SIMP_TOL = (0.8 / 26) * 0.25;
  const boundRaw = bound;
  const boundSimplified = simplify(bound, SIMP_TOL);
  out.boundSimplify = { rawVerts: boundRaw.length, simplifiedVerts: boundSimplified.length,
                        tolMM: +(SIMP_TOL * 26).toFixed(3) };
  if (SIMPLIFY_BOUND) bound = boundSimplified;
  out.insetBound = { loops: loops.length, verts: bound.length, area: area(bound),
                     maxCrossings: crossings(bound), areaInVoid: areaInVoid(bound, 200),
                     perimInVoid: perimInVoid(bound) };
  const envBound = G.ribMarginPolyline(P, 240);
  // AGREEMENT CHECK: on a SMOOTH petal the envelope IS the boundary, so the level set and
  // ribMarginPolyline must describe the same curve. Max |y| per u-bin, both curves, in mm.
  { const NB = 60; const binMax = (poly) => { const b = new Array(NB).fill(null);
      for (const q of poly) { const u = Math.max(0, Math.min(0.999, q.x / P.L));
        const bi = Math.floor(u * NB); const ay = Math.abs(q.y);
        if (b[bi] == null || ay > b[bi]) b[bi] = ay; } return b; };
    const A = binMax(bound), B = binMax(envBound);
    let worst = 0, worstU = 0, n = 0, sum = 0;
    for (let i = 0; i < NB; i++) { if (A[i] == null || B[i] == null) continue;
      const d = Math.abs(A[i] - B[i]); n++; sum += d;
      if (d > worst) { worst = d; worstU = (i + 0.5) / NB; } }
    out.boundAgreementMM = { bins: n, meanMM: +(sum / Math.max(n,1) * MM).toFixed(3),
                             maxMM: +(worst * MM).toFixed(3), atU: +worstU.toFixed(2) }; }
  out.envBound = { verts: envBound.length, area: area(envBound), maxCrossings: crossings(envBound),
                   areaInVoid: areaInVoid(envBound, 200) };

  // Is petalMask a usable distance? |grad| should be ~1 for a true distance field.
  { const h = P.L * 0.002; const g = [];
    for (let i=1;i<24;i++) for (let j=1;j<24;j++){
      const x = P.L*i/24, y = -cfg?0:0; }
    let n=0, sum=0, mn=1e9, mx=0;
    for (let i=1;i<40;i++) for (let j=-20;j<=20;j++){
      const x=P.L*i/40, y=(P.W*1.1)*j/20;
      if (G.petalMask(x,y,P,cfg) <= 0) continue;
      const gxv=(G.petalMask(x+h,y,P,cfg)-G.petalMask(x-h,y,P,cfg))/(2*h);
      const gyv=(G.petalMask(x,y+h,P,cfg)-G.petalMask(x,y-h,P,cfg))/(2*h);
      const m=Math.hypot(gxv,gyv); if(!isFinite(m))continue;
      n++; sum+=m; if(m<mn)mn=m; if(m>mx)mx=m; }
    out.maskGradient = { samples:n, mean:n?sum/n:0, min:mn===1e9?null:mn, max:mx }; }

  // ---------- (2) SEED SAMPLER REPLICA, verified against the real buildVoronoi ----------
  const mkRng=(s)=>{let t=s>>>0;return()=>{t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),1|t);
    x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296;};};
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const lerp=(a,b,t)=>a+(b-a)*t;
  function sampleSeeds(rng) {
    const density = clamp(Math.round(P.density||7),3,12);
    const perHalf = Math.round(lerp(9,34,(density-3)/9));
    const sil = G.buildSilhouette(P, 72);
    const margin=(u)=>G.petalHalfWidth(clamp(u,0,1),P);
    const xLo=P.L*0.05, xHi=P.L*0.96, minHW=0.06, axisGap=0.05*P.W;
    const cellLaw = clamp(P.voronoiDensityLaw!=null?P.voronoiDensityLaw:0,0,1);
    let Wmax=minHW; for(let i=0;i<=100;i++) Wmax=Math.max(Wmax,margin(i/100));
    const spaceW=(x)=>{const w=lerp(Wmax,margin(x/P.L),cellLaw);return w>1e-3?w:1e-3;};
    const nAxis=clamp(Math.round(perHalf*0.4),2,14); const axis=[];
    { let guard=0; while(axis.length<nAxis && guard<nAxis*400){ let best=null,bestD=-1;
        for(let c=0;c<12;c++){ guard++; const x=lerp(xLo,xHi,rng()); if(margin(x/P.L)<minHW)continue;
          let d=1e9; for(const s of axis) d=Math.min(d,(s.x-x)**2);
          const sc=d/(spaceW(x)**2); if(sc>bestD){bestD=sc;best={x,y:0};} }
        if(best)axis.push(best); } }
    const half=[];
    { let guard=0; while(half.length<perHalf && guard<perHalf*800){ let best=null,bestD=-1;
        for(let c=0;c<10;c++){ guard++; const x=lerp(xLo,xHi,rng()); const hw=margin(x/P.L);
          if(hw<minHW)continue;
          const y=lerp(Math.max(axisGap,0.02*hw+0.015),hw*0.95,rng());
          if(!inPoly(x,y,sil))continue;
          let d=1e9; for(const s of half) d=Math.min(d,(s.x-x)**2+(s.y-y)**2);
          for(const s of axis) d=Math.min(d,(s.x-x)**2+y*y);
          const sc=d/(spaceW(x)**2); if(sc>bestD){bestD=sc;best={x,y};} }
        if(best)half.push(best); } }
    return { axis, half };
  }
  const SH=(poly,a,b,c)=>{const o=[];const n=poly.length;
    for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n];
      const dp=a*p.x+b*p.y+c, dq=a*q.x+b*q.y+c;
      if(dp<=0)o.push(p);
      if((dp<0)!==(dq<0)){const t=dp/(dp-dq);o.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}}
    return o;};
  const anisoMetric=(Tx,Ty,a2)=>({m00:Tx*Tx+a2*Ty*Ty,m01:Tx*Ty*(1-a2),m11:Ty*Ty+a2*Tx*Tx});
  const cellOf=(s,seeds,sil,M,allow)=>{
    const {m00,m01,m11}=M; const sMs=m00*s.x*s.x+2*m01*s.x*s.y+m11*s.y*s.y;
    let cell=sil;
    for(const t of seeds){ if(t===s)continue; if(allow && !allow(s,t))continue;
      const dxs=t.x-s.x, dys=t.y-s.y;
      const tMt=m00*t.x*t.x+2*m01*t.x*t.y+m11*t.y*t.y;
      cell=SH(cell,2*(m00*dxs+m01*dys),2*(m01*dxs+m11*dys),sMs-tMt);
      if(cell.length<3)return null; }
    return cell; };
  const fullSeeds=(sd)=>{const arr=[]; for(const s of sd.axis)arr.push(s);
    for(const s of sd.half){arr.push(s);arr.push({x:s.x,y:-s.y});} return arr;};

  // REPLICA CHECK: same seeds + the ENVELOPE clip must reproduce the real builder's cells.
  const sd = sampleSeeds(mkRng(12345));
  const a2 = Math.pow(clamp(P.voronoiAniso!=null?P.voronoiAniso:1,1,4),2);
  const M0 = anisoMetric(1,0,a2);
  const seedsAll = fullSeeds(sd);
  // Every seed in the full set, mirrors included — the real builder emits an outer polygon
  // per +Y cell AND its -Y mirror, so a replica over axis+half only is half a petal.
  const replica = [];
  for (const s of seedsAll) { const c=cellOf(s,seedsAll,envBound,M0,null); if(c) replica.push(c); }
  const real = G.buildVoronoi(P, mkRng(12345), { density:P.density, softness:P.softness,
    lloyd:P.voronoiLloyd, anisotropy:P.voronoiAniso, cellDensityLaw:P.voronoiDensityLaw,
    weightHierarchy:P.voronoiWeight, weightFalloff:P.voronoiWeightFalloff,
    slabTaper:P.voronoiSlabTaper, minCellSize:0 });
  // real emits +Y cells and their -Y mirrors; replica builds +Y and -Y explicitly for half
  // seeds only through the mirror seeds, so compare TOTAL AREA and count of unmirrored cells.
  out.replica = { replicaCells: replica.length, realSlabs: real.slabs.length,
                  replicaArea: replica.reduce((a,c)=>a+area(c),0),
                  realOuterArea: real.slabs.reduce((a,s)=>a+area(s.outer),0) };

  // ---------- star-shape assertion (the print-safety constraint) ----------
  const centroid=(poly)=>{let a=0,cx=0,cy=0;
    for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];
      const cr=p.x*q.y-q.x*p.y;a+=cr;cx+=(p.x+q.x)*cr;cy+=(p.y+q.y)*cr;}
    if(Math.abs(a)<1e-12){let vx=0,vy=0;for(const p of poly){vx+=p.x;vy+=p.y;}return{x:vx/poly.length,y:vy/poly.length};}
    a*=0.5; return {x:cx/(6*a),y:cy/(6*a)};};
  // cellAnnulus builds outer[k]/inner[k] on rays from the centroid: every boundary vertex
  // must be visible from the centroid INSIDE the cell, or the annulus is garbage.
  const starViolations=(poly)=>{ const c=centroid(poly); let bad=0;
    if(!inPoly(c.x,c.y,poly)) return poly.length;             // centroid outside: total failure
    for(const v of poly){ for(let k=1;k<10;k++){ const t=k/10;
      const x=c.x+(v.x-c.x)*t, y=c.y+(v.y-c.y)*t;
      if(!inPoly(x,y,poly)){ bad++; break; } } }
    return bad; };
  const summarise=(cells,label)=>{
    let starBad=0, starBadCells=0, voidCells=0, voidPerim=0, verts=0, ar=0;
    for(const c of cells){ verts+=c.length; ar+=area(c);
      const sv=starViolations(c); if(sv>0){starBad+=sv;starBadCells++;}
      const pv=perimInVoid(c); voidPerim+=pv; if(pv>0.02)voidCells++; }
    // A diagram that tiles has total cell area ~= the bound's area. Much more means the
    // cells overlap — it is no longer a partition.
    return { label, cells:cells.length, totalVerts:verts, totalArea:ar,
             areaOverBound: +(ar / Math.max(area(bound), 1e-9)).toFixed(3),
             cellsNotStarShaped:starBadCells, starViolatingVerts:starBad,
             cellsPerimCrossingVoid:voidCells,
             meanPerimInVoid: cells.length? voidPerim/cells.length : 0 };
  };
  const reg=(cells)=>{ const NBIN=48; const outerY=new Array(NBIN).fill(null);
    let over=0;
    for(const c of cells) for(const pt of c){
      const u=clamp(pt.x/P.L,0,1), ay=Math.abs(pt.y);
      const bi=Math.min(NBIN-1,Math.floor(u*NBIN));
      if(outerY[bi]==null||ay>outerY[bi]) outerY[bi]=ay;
      const rib=G.ribInnerEdge(u,P); if(rib<1e-4)continue;
      if(ay-rib>over) over=ay-rib; }
    let under=0; for(let bi=0;bi<NBIN;bi++){ if(outerY[bi]==null)continue;
      const u=(bi+0.5)/NBIN, rib=G.ribInnerEdge(u,P); if(rib<1e-4)continue;
      const d=rib-outerY[bi]; if(d>under)under=d; }
    return { overshootMM:+(over*MM).toFixed(2), undershootMM:+(under*MM).toFixed(2) }; };
  const __drawToday = replica;
  out.today = summarise(replica, 'today (envelope clip, all-pairs adjacency)');
  out.today.gate = reg(replica);

  // ---------- OPTION 1: cleft-aware clip only (no partition, no adjacency filter) ----------
  { const cells=[]; for(const s of seedsAll){ const c=cellOf(s,seedsAll,bound,M0,null); if(c)cells.push(c); }
    __drawClipOnly = cells;
    out.optClipOnly = summarise(cells, 'cleft-aware clip only'); out.optClipOnly.gate = reg(cells); }

  // ---------- OPTION 2: material-aware adjacency + cleft-aware clip ----------
  const visible=(a,b)=>{ const N=24; for(let k=0;k<=N;k++){ const t=k/N;
      if(G.petalMask(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t, P, cfg) < 0) return false; } return true; };
  { const cells=[]; for(const s of seedsAll){ const c=cellOf(s,seedsAll,bound,M0,visible); if(c)cells.push(c); }
    out.optAdjacency = summarise(cells, 'material-aware adjacency + cleft-aware clip'); out.optAdjacency.gate = reg(cells); }

  // ---------- OPTION 3: per-lobe partition + cleft-aware clip ----------
  // region id: 'base' below the sinus floor, else the lobe index (centres split y).
  const xFloor = cfg ? cfg.uFloor * P.L : Infinity;
  const regionOf=(p)=>{ if(!cfg) return 0; if(p.x<=xFloor) return -1;
    let k=0; for(const c of cfg.centers) if(p.y>c) k++; return k; };
  const regionPoly=(r)=>{ if(!cfg) return bound;
    if(r===-1) return SH(bound, 1, 0, -xFloor);                     // base: x <= xFloor
    let p = SH(bound, -1, 0, xFloor);                                // lobe: x >= xFloor
    if (r > 0)                 p = SH(p, 0, -1,  cfg.centers[r-1]);  // y >= centers[r-1]
    if (r < cfg.centers.length) p = SH(p, 0,  1, -cfg.centers[r]);   // y <= centers[r]
    return p; };
  { const cells=[]; const R=new Map();
    for(const s of seedsAll){ const r=regionOf(s); if(!R.has(r))R.set(r,[]); R.get(r).push(s); }
    const RP=new Map(); for(const r of R.keys()) RP.set(r, regionPoly(r));
    for(const s of seedsAll){ const r=regionOf(s); const rp=RP.get(r);
      if(!rp || rp.length<3) continue;
      const c=cellOf(s, R.get(r), rp, M0, null); if(c)cells.push(c); }
    __drawPartition = cells; __drawRegions = [...RP.values()];
    out.optPartition = summarise(cells, 'per-lobe partition + cleft-aware clip'); out.optPartition.gate = reg(cells);
    out.partitionRegions = [...R.entries()].map(([k,v])=>({region:k===-1?'base':'lobe'+k, seeds:v.length})); }

  // ---------- COST: the same partition against a Douglas-Peucker-simplified bound ----------
  // The cleft-aware bound is a marching-squares polyline where today's is a 480-vertex
  // band, and cells inherit boundary vertices, which is where the triangle cost lands.
  // The codebase already answers this for the rim with simplifyPath; measure the same idea.
  const dp = (pts, tol) => { if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length-1] = 1;
    const stack = [[0, pts.length-1]], t2 = tol*tol;
    while (stack.length) { const [i0,i1] = stack.pop(); if (i1 <= i0+1) continue;
      const a = pts[i0], b = pts[i1], dx = b.x-a.x, dy = b.y-a.y, len2 = dx*dx+dy*dy;
      let best=-1, bestD=0;
      for (let k=i0+1;k<i1;k++){ const q=pts[k]; let d2;
        if (len2 < 1e-18) { const ex=q.x-a.x, ey=q.y-a.y; d2=ex*ex+ey*ey; }
        else { const t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/len2));
               const ex=q.x-(a.x+dx*t), ey=q.y-(a.y+dy*t); d2=ex*ex+ey*ey; }
        if (d2>bestD){bestD=d2;best=k;} }
      if (bestD>t2 && best>0){ keep[best]=1; stack.push([i0,best],[best,i1]); } }
    const o=[]; for (let i=0;i<pts.length;i++) if (keep[i]) o.push(pts[i]); return o; };
  for (const tolMM of [0.25, 0.5]) {
    const simp = dp(bound, tolMM / MM);
    const cells = []; const R2 = new Map();
    for (const s2 of seedsAll) { const r = regionOf(s2); if (!R2.has(r)) R2.set(r, []); R2.get(r).push(s2); }
    const RPs = new Map();
    for (const r of R2.keys()) { let p2;
      if (!cfg) p2 = simp;
      else if (r === -1) p2 = SH(simp, 1, 0, -xFloor);
      else { p2 = SH(simp, -1, 0, xFloor);
             if (r > 0) p2 = SH(p2, 0, -1, cfg.centers[r-1]);
             if (r < cfg.centers.length) p2 = SH(p2, 0, 1, -cfg.centers[r]); }
      RPs.set(r, p2); }
    for (const s2 of seedsAll) { const r = regionOf(s2), rp = RPs.get(r);
      if (!rp || rp.length < 3) continue;
      const c = cellOf(s2, R2.get(r), rp, M0, null); if (c) cells.push(c); }
    out['optPartitionSimplified' + String(tolMM).replace('.','p')] =
      Object.assign(summarise(cells, 'per-lobe partition, bound simplified to ' + tolMM + ' mm'),
                    { boundVerts: simp.length, boundVoid: areaInVoid(simp, 160) });
  }

  // ---------- (3) WHAT THE QUALITY GATE WOULD SAY ----------
  // verify-geometry-quality's registration metric compares the outermost infill |y| per
  // u-bin against ribInnerEdge(u) — the SCALAR ENVELOPE. Compute it for each option.
  if (WANT_DRAW) {
    out.__draw = { L: P.L, W: P.W, lobes: cfg ? cfg.count : 0,
                   xFloor: cfg ? cfg.uFloor * P.L : null,
                   centers: cfg ? cfg.centers.slice() : [],
                   material: G.buildSilhouette(P, 220),
                   bound, cellsToday: __drawToday, cellsClipOnly: __drawClipOnly,
                   cellsPartition: __drawPartition,
                   regionPolys: __drawRegions };
  }
  out.gate = { thresholdUndershootVoronoiMM: 2, thresholdOvershootMM: 3, note: 'per-option figures are on each option object' };
  return out;
};
window.__diag2Geom = null;

// ---- geometry dump for the seam contact sheet ----
// Returns the drawable polygons for one config: the true material contour, the
// cleft-aware bound, and the cells under each candidate. The seam is a LOOK question.
window.__diagCells = async function (SIMPLIFY_BOUND) {
  const r = await window.__diag2(SIMPLIFY_BOUND, true);
  return r.__draw;
};
window.__diag2Ready = true;
