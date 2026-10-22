/* ===================================================================
   bloom-weld-attribute.mjs — IS A DECLARED WITHIN-SHELL PAIR A WELD OR A FOLD?

   WHY THIS EXISTS. The self-intersection census (`tools/bloom-self-intersection.mjs`)
   decides what a "shell" is by EXACT-POSITION VERTEX WELDING: two triangles
   sharing one coordinate triple are one shell. So two closed primitives that
   overlap by design (a petal on a tube's ring, a sepal on its petal) and that
   happen to land ONE vertex on the same double are read as one shell, and
   their by-design overlap is counted as a within-shell FOLD. That is the
   aligned-weld class (the sepal ALIGNED WELD, the tube's sinus knots, the leaf
   petiole's half step), and it is a property of the census's shell
   definition, not of the geometry.

   This tool separates the two, per pair:
     PRIMITIVE  a connected component over shared EDGES (welded vertex pairs).
                Every closed surface the builder emits is edge-connected by
                itself; two closed surfaces welded only at isolated vertices
                are NOT, so a census shell made of two primitives was joined
                by the weld alone.
     WELD       a within-shell pair whose two triangles were emitted as two
                DIFFERENT PARTS (the tube, or two different petals) — which
                are separate closed surfaces by construction, so the pair is
                within one census shell only because a vertex coincides — an overlap the census sees only because a vertex
                coincides. Removing the coincident vertex removes the pair.
     FOLD       a within-shell pair whose two triangles were emitted as ONE
                part — a closed surface crossing itself, which no change
                to a shared vertex can touch.

   It also counts the coincident vertices themselves, by the parts that meet
   there: foot (a petal primitive's vertex at u = 0 on its own captured rows)
   against a neighbouring foot, and foot against a tube panel.

   MODE AND SAMPLING, named: EXPORT mode, the builder's own doubles (X0's
   path), the shipped lattice. A pair count is a property of the tessellation.

   THE PART is read per triangle from the emitter (the tube's own range) and the
   nearest captured petal lamina — not from the primitive, because two
   surfaces coinciding along a whole EDGE are one edge-connected primitive (the
   12-petal k 6 tube is that case). BLIND TO a part the lamina does not carry
   (hub, stem, centre — reported as `other`). It reports and
   asserts nothing; X1 owns the magnitudes, X2 the undeclared rows.

   RUN:
     node tools/bloom-weld-attribute.mjs --only <regex> [--root <tree>] [--json]
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const ROOT = arg('--root') ? path.resolve(arg('--root')) : HERE;
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const JSON_OUT = argv.includes('--json');
if (!ONLY) { console.error('--only <regex> is required'); process.exit(2); }

const load = (root, f) => import(pathToFileURL(path.join(root, f)).href);
const [H, SI] = await Promise.all([load(HERE, 'tools/bloom-harness.mjs'), load(HERE, 'tools/bloom-self-intersection.mjs')]);
const [G, R] = await Promise.all([load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js')]);

const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (row) => {
  const s = { ...R.DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === '@scopes') continue;
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
};

export function attribute(G, state, row) {
  const acc = new G.MeshBuilder({ exportMode: true, captureLamina: true });
  const built = G.buildBloomInto(acc, state, { below: null, capability: row.capability || null, scopes: H.rowScopesForBuild(row) });
  const pos = new Float64Array(acc.positions);
  const nTri = pos.length / 9;
  const cen = SI.census(pos, { collect: true });

  /* the census's own weld key */
  const key = new Map(); const vidx = new Int32Array(nTri * 3); const vpos = [];
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const o = t * 9 + c * 3; const k = `${pos[o]},${pos[o + 1]},${pos[o + 2]}`;
    let id = key.get(k); if (id === undefined) { id = vpos.length; vpos.push([pos[o], pos[o + 1], pos[o + 2]]); key.set(k, id); }
    vidx[t * 3 + c] = id;
  }
  /* PRIMITIVES — union over shared undirected EDGES */
  const par = new Int32Array(nTri).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const edge = new Map();
  for (let t = 0; t < nTri; t++) for (let c = 0; c < 3; c++) {
    const a = vidx[t * 3 + c], b = vidx[t * 3 + (c + 1) % 3];
    const k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    const o = edge.get(k); if (o === undefined) edge.set(k, t); else { const x = find(o), y = find(t); if (x !== y) par[y] = x; }
  }
  const prim = new Int32Array(nTri); for (let t = 0; t < nTri; t++) prim[t] = find(t);

  /* PART LABELS — the tube's own emitted range, each petal's own (`triRange`),
     and the nearest captured lamina point only where neither names it */
  const tubeRanges = ((built.tube && built.tube.rings) || []).map((r) => [r.triFrom, r.triTo]);
  const inTube = (t) => tubeRanges.some(([a, b]) => t >= a && t < b);
  const lam = [];
  (built.petalsAll || []).forEach((p, i) => { if (p && p.lamina) for (const panel of p.lamina) for (const row2 of panel.rows) for (const P of row2.mid) lam.push({ P, u: row2.u, idx: i }); });
  const near = (P) => { let best = null, bd = Infinity; for (const q of lam) { const d = (q.P[0] - P[0]) ** 2 + (q.P[1] - P[1]) ** 2 + (q.P[2] - P[2]) ** 2; if (d < bd) { bd = d; best = q; } } return { q: best, mm: Math.sqrt(bd) }; };

  /* COINCIDENT VERTICES — a welded vertex touched by two or more primitives */

  /* THE PART A TRIANGLE WAS EMITTED AS — the tube's own range, else the petal
     whose captured lamina is nearest the triangle's centroid. Read per TRIANGLE,
     not per primitive: where a petal and a tube panel coincide along a whole
     EDGE they are one primitive (§ blind above) and only the emitter can tell
     the two surfaces apart. */
  const emitter = new Array(nTri).fill(null);
  (built.petalsAll || []).forEach((p, i) => { if (p && p.triRange) for (let t = p.triRange[0]; t < p.triRange[1]; t++) emitter[t] = `petal ${i}`; });
  ((built.sepals && built.sepals.built) || []).forEach((p, i) => { if (p && p.triRange) for (let t = p.triRange[0]; t < p.triRange[1]; t++) emitter[t] = `sepal ${i}`; });
  const partOf = (t) => {
    if (inTube(t)) return 'tube';
    if (emitter[t]) return emitter[t];
    const c = [0, 1, 2].map((a) => (pos[t * 9 + a] + pos[t * 9 + 3 + a] + pos[t * 9 + 6 + a]) / 3);
    const { q, mm } = near(c);
    return q && mm < 3 ? `petal ${q.idx}` : 'other';
  };
  /* COINCIDENT VERTICES — a welded vertex touched by two or more PARTS */
  const vParts = new Map();
  for (let t = 0; t < nTri; t++) {
    const pt = emitter[t] || (inTube(t) ? 'tube' : null);
    if (!pt) continue;
    for (let c = 0; c < 3; c++) { const v = vidx[t * 3 + c]; let S = vParts.get(v); if (!S) { S = new Set(); vParts.set(v, S); } S.add(pt); }
  }
  const shared = new Map();
  for (const S of vParts.values()) {
    if (S.size < 2) continue;
    const k = [...S].map((l) => l.replace(/ \d+$/, '')).sort().join(' / ');
    shared.set(k, (shared.get(k) || 0) + 1);
  }
  let weld = 0, fold = 0; const weldBy = new Map(), foldBy = new Map(); let weldWorst = 0, foldWorst = 0;
  for (const s of cen.sites) {
    const [i, j] = s.pair;
    if (partOf(i) !== partOf(j)) {
      weld++; weldWorst = Math.max(weldWorst, s.span);
      const k = [partOf(i), partOf(j)].map((l) => l.replace(/ \d+$/, '')).sort().join(' x ');
      weldBy.set(k, (weldBy.get(k) || 0) + 1);
    } else {
      fold++; foldWorst = Math.max(foldWorst, s.span);
      const { q } = near(s.at);
      const reg = !q ? '?' : q.u <= 0 ? 'foot' : q.u < G.ROOT_BLEND_END ? 'root blend' : 'blade';
      const k = `${partOf(i).replace(/ \d+$/, '')} ${reg}`;
      foldBy.set(k, (foldBy.get(k) || 0) + 1);
    }
  }
  const nPrim = new Set(prim).size;
  return { tris: nTri, shells: cen.shells, primitives: nPrim, within: cen.within, worstMm: cen.worstSpanMm,
    weld, weldWorst, weldBy: Object.fromEntries(weldBy), fold, foldWorst, foldBy: Object.fromEntries(foldBy),
    sharedVertices: Object.fromEntries(shared), foot: built.foot && built.foot.rings ? built.foot.rings.map((r) => ({ width: r.width, arc: r.footArcMm, capped: r.footCapped })) : null };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const out = [];
  for (const row of H.buildMatrix().filter((r) => ONLY.test(r.label))) {
    const t0 = Date.now();
    const a = attribute(G, stateOf(row), row);
    out.push({ label: row.label, ...a });
    if (!JSON_OUT) {
      console.log(`\n${row.label}   (${Date.now() - t0} ms)`);
      console.log(`  ${a.tris} tris · ${a.shells} census shells over ${a.primitives} edge-connected primitives · within ${a.within} (worst ${a.worstMm.toFixed(4)} mm)`);
      console.log(`  WELD ${a.weld} (worst ${a.weldWorst.toFixed(4)})  ${JSON.stringify(a.weldBy)}`);
      console.log(`  FOLD ${a.fold} (worst ${a.foldWorst.toFixed(4)})  ${JSON.stringify(a.foldBy)}`);
      console.log(`  coincident vertices between primitives: ${JSON.stringify(a.sharedVertices)}`);
      if (a.foot) console.log(`  feet: ${a.foot.map((f) => `${f.width.toFixed(6)}/${f.arc === undefined ? "(no arc on this tree)" : f.arc.toFixed(6)}${f.capped ? ' CAPPED' : ''}`).join('  ')}`);
    }
  }
  if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
}
