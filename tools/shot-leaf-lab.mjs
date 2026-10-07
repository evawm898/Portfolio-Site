/* ===================================================================
   shot-leaf-lab.mjs — THE LEAF LAB'S NODE INSTRUMENT. A SCRATCH TOOL FOR A
   DISCOVERY, WIRED TO NO GATE (no workflow names a leaf-lab path).

   Builds the three references (and the exaggerated mum) both ways through
   tools/leaf-lab-core.mjs, in EXPORT mode at the shipped 1.20 mm sheet, and:

     1. SELF-CHECKS (each aborts the run on failure — a self-check that
        reports instead of failing is a log line):
        C1  every primitive is a CLOSED, CONSISTENTLY WOUND shell: 0 unmatched
            directed edges, signed volume > 0 (outward), per shell.
        C2  no panel's lattice folds: every cell's planform area > 0.
        C3  the leaf is ONE connected piece: surface-occupancy voxel flood fill
            at a 0.30 mm cell (re-read at 0.15 mm before calling it two).
        C4  every captured panel goes through the SHIPPED grid writer
            (bloom-grid-gltf.js buildGridGltf) and comes back with one u-strip
            per column and one v-strip per row.
        C5  the prototype's tooth law at skew 0.5 IS the shipped
            lobeCutProfile, and its notch IS the shipped tubeNotchDepth — both
            compared with Object.is over a sweep.
        C6  A and B are the SAME MESH for the carnation and the rose
            (Object.is over every float): for simple and compound leaves the
            two approaches converge, so the decision is about lobed leaves.
        C7  the planform UNION has no pinhole: an enclosed region of
            not-material inside the leaf's outline is a hole through the
            print, and one-piece connectivity (C3) cannot see a hole. Regions
            under 0.01 mm^2 are reported as raster pinches, not failed.
     1b. WHAT /plot's PER-PETAL WARP WOULD MAKE OF EACH LEAF: the shipped
        petalFrame (plot-petal.js) on the captured panels, its axis against
        the leaf's own length — reported, not asserted.
     2. THE WIDTH-LAW TEST on the emitted planform: how many separate runs of
        material a line PERPENDICULAR TO THE MIDRIB crosses on one side (the
        petal's row), and how many a line TILTED FORWARD at B's row angle
        crosses (the chevron's row). One run per side everywhere is what a
        single-valued half-width can draw.
     3. THE PRINT REPORT against MIN_FEATURE_MM (1.00, the shipped bloom
        floor) and SLS PA12's 0.8 / 1.0 mm supported / unsupported wire.
        In-plane thickness is measured on the planform union at 0.05 mm by
        morphological OPENING (material narrower than d) and CLOSING (gaps
        narrower than d); rods and blades are listed with their own numbers.
        SAMPLING NAMED: planform (before arch and cup), EXPORT mode, 0.05 mm
        raster, disks of diameter d.
     4. THE FUSION CONTINUUM: A's one slider swept on the mum's tree (0 to 1,
        the sinus blend at 0, PALMATE), every cell through C1-C4 and C7, with
        one DECLARED failure held to its count both ways (SWEEP_XFAIL).
     5. THE STEM DEMO: the arrangement, swelling and kink with leaves at the
        nodes, every cell closed and one piece.
     6. THE SHEETS: docs/img/leaf-lab-sheet.png (species x approach x front /
        three-quarter), docs/img/leaf-lab-stems.png (the arrangement demo),
        docs/img/leaf-lab-print.png (the thin and gap maps),
        docs/img/leaf-lab-fusion.png (the continuum).

   --control plants must-fails and requires each clause to fire on its plant
   and stay silent on the clean build: a reversed panel (C1), a chevron with
   steep teeth whose innermost cell folds across the V (C2), a detached lobe
   (C3), overlapping toothed blades and the pocket rule switched off (C7),
   both shipped laws perturbed (C5), a two-run outline (the width-law test),
   a 0.6 mm strip beside a 2 mm one (the print instrument).

     node tools/shot-leaf-lab.mjs [--out docs/img] [--control] [--no-sheets]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(ROOT, 'tools/leaf-lab-core.mjs')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const GG = await import(pathToFileURL(path.join(ROOT, 'bloom-grid-gltf.js')).href);
const args = process.argv.slice(2);
const OUT = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(ROOT, 'docs/img');
const CONTROL = args.includes('--control');
const SHEETS = !args.includes('--no-sheets');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'leaf-lab-'));
L.setLoader({
  read: async () => fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8'),
  load: async (src) => { const f = path.join(TMP, 'bloom-geometry.js'); fs.writeFileSync(f, src); return import(pathToFileURL(f).href); },
});
const G = await L.geometry();
const SHEET_MM = 1.2;
const MIN_FEATURE = G.MIN_FEATURE_MM;     // 1.00, read from the shipped module
const SLS_SUPPORTED = 0.8, SLS_UNSUPPORTED = 1.0;
let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL ${msg}`); };
const ok = (msg) => console.log(`  ok   ${msg}`);

/* ---------------- C1: per-shell directed edges and signed volume ---------------- */
function shellCheck(pos, t0, t1) {
  const q = (x) => Math.round(x * 1e6);
  const key = (i) => `${q(pos[i])},${q(pos[i + 1])},${q(pos[i + 2])}`;
  const dir = new Map();
  let vol = 0;
  for (let t = t0; t < t1; t++) {
    const b = t * 9;
    const k = [key(b), key(b + 3), key(b + 6)];
    for (let m = 0; m < 3; m++) { const e = `${k[m]}|${k[(m + 1) % 3]}`; dir.set(e, (dir.get(e) || 0) + 1); }
    const a = [pos[b], pos[b + 1], pos[b + 2]], c = [pos[b + 3], pos[b + 4], pos[b + 5]], d = [pos[b + 6], pos[b + 7], pos[b + 8]];
    vol += (a[0] * (c[1] * d[2] - c[2] * d[1]) - a[1] * (c[0] * d[2] - c[2] * d[0]) + a[2] * (c[0] * d[1] - c[1] * d[0])) / 6;
  }
  let unmatched = 0;
  for (const [e, n] of dir) { const [a, b] = e.split('|'); if ((dir.get(`${b}|${a}`) || 0) !== n) unmatched++; }
  return { unmatched, vol };
}
/* ---------------- C3: surface-occupancy voxel flood fill ---------------- */
function components(pos, cell) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { if (pos[i + k] < lo[k]) lo[k] = pos[i + k]; if (pos[i + k] > hi[k]) hi[k] = pos[i + k]; }
  const n = lo.map((v, k) => Math.ceil((hi[k] - v) / cell) + 3);
  if (n[0] * n[1] * n[2] > 1.2e8) throw new Error(`voxel grid too large (${n.join('x')})`);
  const occ = new Uint8Array(n[0] * n[1] * n[2]);
  const idx = (x, y, z) => (x * n[1] + y) * n[2] + z;
  const mark = (p) => { occ[idx(Math.floor((p[0] - lo[0]) / cell) + 1, Math.floor((p[1] - lo[1]) / cell) + 1, Math.floor((p[2] - lo[2]) / cell) + 1)] = 1; };
  for (let t = 0; t < pos.length; t += 9) {
    const A = [pos[t], pos[t + 1], pos[t + 2]], B = [pos[t + 3], pos[t + 4], pos[t + 5]], C = [pos[t + 6], pos[t + 7], pos[t + 8]];
    const lAB = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), lAC = Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]), lBC = Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]);
    const m = Math.max(1, Math.ceil(Math.max(lAB, lAC, lBC) / (cell * 0.4)));
    for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
      const a = i / m, b = j / m, c = 1 - a - b;
      mark([A[0] * c + B[0] * a + C[0] * b, A[1] * c + B[1] * a + C[1] * b, A[2] * c + B[2] * a + C[2] * b]);
    }
  }
  const seen = new Uint8Array(occ.length);
  const sizes = [];
  const stack = new Int32Array(occ.length);
  for (let s = 0; s < occ.length; s++) {
    if (!occ[s] || seen[s]) continue;
    let sp = 0, size = 0; stack[sp++] = s; seen[s] = 1;
    while (sp) {
      const v = stack[--sp]; size++;
      const z = v % n[2], y = ((v - z) / n[2]) % n[1], x = (v - z - y * n[2]) / (n[1] * n[2]);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const w = idx(x + dx, y + dy, z + dz);
        if (occ[w] && !seen[w]) { seen[w] = 1; stack[sp++] = w; }
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { count: sizes.length, sizes };
}
function connected(pos) {
  const a = components(pos, 0.3);
  if (a.count === 1) return { count: 1, cell: 0.3 };
  const b = components(pos, 0.15);
  return { count: b.count, cell: 0.15, sizes: b.sizes.slice(0, 4), coarse: a.count };
}

/* ---------------- the planform raster ---------------- */
const PX = 0.05;
function raster(leaf) {
  const polys = L.planformPolygons(leaf);
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const p of polys) for (const q of p.poly) { lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])]; hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])]; }
  lo = [lo[0] - 3, lo[1] - 3]; hi = [hi[0] + 3, hi[1] + 3];
  const W = Math.ceil((hi[0] - lo[0]) / PX), H = Math.ceil((hi[1] - lo[1]) / PX);
  const m = new Uint8Array(W * H);
  const owner = new Int16Array(W * H).fill(-1);
  polys.forEach((p, pi) => {
    const P = p.poly;
    let y0 = Infinity, y1 = -Infinity;
    for (const q of P) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    for (let r = Math.max(0, Math.floor((y0 - lo[1]) / PX)); r <= Math.min(H - 1, Math.ceil((y1 - lo[1]) / PX)); r++) {
      const y = lo[1] + (r + 0.5) * PX, xs = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let c = Math.max(0, Math.ceil((xs[k] - lo[0]) / PX - 0.5)); c <= Math.min(W - 1, Math.floor((xs[k + 1] - lo[0]) / PX - 0.5)); c++) {
          const i = r * W + c; m[i] = 1; if (owner[i] < 0) owner[i] = pi;
        }
      }
    }
  });
  return { m, owner, W, H, lo, polys };
}
/* Felzenszwalb-Huttenlocher squared EDT to the set where `f` is 0. */
function edt(mask, W, H, toZeroOf) {
  const INF = 1e20;
  const g = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = (toZeroOf ? mask[i] === 0 : mask[i] !== 0) ? 0 : INF;
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const pass = (len, get, set) => {
    for (let q = 0; q < len; q++) f[q] = get(q);
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
    for (let q = 0; q < len; q++) set(q, d[q]);
  };
  for (let x = 0; x < W; x++) pass(H, (q) => g[q * W + x], (q, val) => { g[q * W + x] = val; });
  for (let y = 0; y < H; y++) pass(W, (q) => g[y * W + q], (q, val) => { g[y * W + q] = val; });
  return g;    // squared distance in pixels
}
/* material narrower than d: material \ opening(material, disk d) */
function thinOf(m, W, H, dMm) {
  const rPx = dMm / 2 / PX;
  const dIn = edt(m, W, H, true);                       // distance to background
  const centers = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) centers[i] = m[i] && dIn[i] >= rPx * rPx ? 1 : 0;
  const dC = edt(centers, W, H, false);                 // distance to nearest centre
  const thin = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) thin[i] = m[i] && dC[i] > rPx * rPx ? 1 : 0;
  return thin;
}
function gapsOf(m, W, H, dMm) {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inv[i] = m[i] ? 0 : 1;
  return thinOf(inv, W, H, dMm);
}
function regions(mask, W, H, lo, owner, polys) {
  const seen = new Uint8Array(W * H), out = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    const st = [s]; seen[s] = 1; let n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sx = 0, sy = 0; const own = new Map();
    while (st.length) {
      const i = st.pop(); n++;
      const x = i % W, y = (i - x) / W;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sx += x; sy += y;
      if (owner && owner[i] >= 0) own.set(owner[i], (own.get(owner[i]) || 0) + 1);
      for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && mask[j] && !seen[j]) { seen[j] = 1; st.push(j); }
    }
    const top = [...own.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({ areaMm2: n * PX * PX, extentMm: Math.hypot(x1 - x0, y1 - y0) * PX, at: [lo[0] + (sx / n + 0.5) * PX, lo[1] + (sy / n + 0.5) * PX], part: top ? polys[top[0]].label : null });
  }
  out.sort((a, b) => b.extentMm - a.extentMm);
  return out;
}
/* ---------------- the width-law test: runs per side along a family of lines ---------------- */
function runsAlong(ras, tanTilt, xFrom, xTo) {
  const { m, W, H, lo } = ras;
  const at = (x, y) => { const c = Math.floor((x - lo[0]) / PX), r = Math.floor((y - lo[1]) / PX); return c >= 0 && r >= 0 && c < W && r < H ? m[r * W + c] : 0; };
  let maxRuns = 0, multi = 0, lines = 0, worstX = null;
  for (let x0 = xFrom; x0 <= xTo; x0 += PX * 2) {
    lines++;
    let lineMax = 0;
    /* A GAP NARROWER THAN MIN_GAP DOES NOT SEPARATE TWO RUNS. Measured, not
       chosen for the answer: a line that runs nearly PARALLEL to an outline
       (a tooth flank along a tilted row) flickers across raster cells and
       read 4 runs on a lattice whose every row is one span by construction;
       exact point-in-polygon on the same lines reads 1. MIN_GAP is three
       raster cells, and a real sinus here is millimetres wide. */
    const MIN_GAP = 3 * PX;
    for (const sg of [1, -1]) {
      let runs = 0, inside = false, gap = Infinity;
      for (let s = PX / 2; s < (H * PX); s += PX / 2) {
        const v = at(x0 + s * tanTilt, sg * s);
        if (v) { if (!inside && gap >= MIN_GAP) runs++; inside = true; gap = 0; }
        else { if (inside) { inside = false; gap = 0; } gap += PX / 2; }
      }
      lineMax = Math.max(lineMax, runs);
    }
    if (lineMax > 1) multi++;
    if (lineMax > maxRuns) { maxRuns = lineMax; worstX = x0; }
  }
  return { maxRuns, fractionMulti: multi / lines, worstX };
}

/* ---------------- build ---------------- */
const SPECIES = ['carnation', 'rose', 'mum', 'mumX'];
async function buildOne(sp, ap, override = null) {
  const leaf = L.buildSpecies(sp, ap, override);
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const parts = await L.emitLeaf(leaf, { acc, sheetMm: SHEET_MM });
  return { sp, ap, leaf, acc, parts, pos: acc.positions };
}
function checkLeaf(b, { quiet = false } = {}) {
  const res = { c1: [], c2: [], c3: null, c4: null };
  for (const p of b.parts) {
    const s = shellCheck(b.pos, p.t0, p.t1);
    if (s.unmatched !== 0 || !(s.vol > 0)) res.c1.push(`${p.label}: ${s.unmatched} unmatched directed edges, volume ${s.vol.toFixed(3)} mm^3`);
    if (p.jac && !(p.jac.min > 0)) res.c2.push(`${p.label}: lattice folds (min cell ${p.jac.min.toExponential(3)} mm^2)`);
  }
  res.c3 = connected(b.pos);
  /* C7: the planform union has no HOLES — a background region not connected
     to the raster's border is a pinhole through the leaf, which one-piece
     connectivity cannot see (a holed leaf is still one piece). */
  {
    const ras = raster(b.leaf);
    const bg = new Uint8Array(ras.W * ras.H);
    for (let i = 0; i < bg.length; i++) bg[i] = ras.m[i] ? 0 : 1;
    const seen = new Uint8Array(bg.length), st = [];
    for (let x = 0; x < ras.W; x++) for (const y of [0, ras.H - 1]) { const i = y * ras.W + x; if (bg[i] && !seen[i]) { seen[i] = 1; st.push(i); } }
    for (let y = 0; y < ras.H; y++) for (const x of [0, ras.W - 1]) { const i = y * ras.W + x; if (bg[i] && !seen[i]) { seen[i] = 1; st.push(i); } }
    while (st.length) { const i = st.pop(); const x = i % ras.W; for (const j of [x > 0 ? i - 1 : -1, x < ras.W - 1 ? i + 1 : -1, i - ras.W, i + ras.W]) if (j >= 0 && j < bg.length && bg[j] && !seen[j]) { seen[j] = 1; st.push(j); } }
    const holeMask = new Uint8Array(bg.length);
    for (let i = 0; i < bg.length; i++) holeMask[i] = bg[i] && !seen[i] ? 1 : 0;
    /* a region under 0.01 mm^2 (four raster cells) is a sinus the RASTER
       pinched shut — a gap narrower than 0.05 mm, which the print report's
       gap measure already owns — and is reported as a pinch, not a hole */
    const all = regions(holeMask, ras.W, ras.H, ras.lo, null, ras.polys);
    res.c7 = all.filter((r) => r.areaMm2 >= 0.01);
    res.c7pinch = all.filter((r) => r.areaMm2 < 0.01);
  }
  /* C4: the shipped grid writer */
  try {
    const built = L.gridBuilt([{ leaf: b.leaf, parts: b.parts }]);
    const glb = GG.buildGridGltf(built, { mode: 'export', state: null, generator: 'leaf-lab' });
    const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
    const jlen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jlen)));
    let u = 0, v = 0;
    for (const mesh of json.meshes) for (const pr of mesh.primitives) { if (pr.extras && pr.extras.kind === 'u') u++; if (pr.extras && pr.extras.kind === 'v') v++; }
    const panels = b.parts.filter((p) => p.grid);
    const wantU = panels.length * 10, wantV = panels.reduce((n, p) => n + p.grid.rows.length, 0);
    res.c4 = { bytes: glb.byteLength, u, v, wantU, wantV, ok: u === wantU && v === wantV };
  } catch (e) { res.c4 = { ok: false, error: String(e.message || e) }; }
  if (!quiet) {
    if (res.c1.length) for (const m of res.c1) fail(`C1 ${b.sp}/${b.ap} ${m}`); else ok(`C1 ${b.sp}/${b.ap}: ${b.parts.length} shells closed and outward`);
    if (res.c2.length) for (const m of res.c2) fail(`C2 ${b.sp}/${b.ap} ${m}`); else ok(`C2 ${b.sp}/${b.ap}: no lattice folds (min cell ${Math.min(...b.parts.filter((p) => p.jac).map((p) => p.jac.min)).toExponential(2)} mm^2)`);
    if (res.c3.count !== 1) fail(`C3 ${b.sp}/${b.ap}: ${res.c3.count} pieces at ${res.c3.cell} mm`); else ok(`C3 ${b.sp}/${b.ap}: one connected piece at ${res.c3.cell} mm`);
    if (res.c7.length) fail(`C7 ${b.sp}/${b.ap}: ${res.c7.length} pinhole(s) through the planform, largest ${res.c7[0].areaMm2.toFixed(3)} mm^2 at (${res.c7[0].at[0].toFixed(1)}, ${res.c7[0].at[1].toFixed(1)})`); else ok(`C7 ${b.sp}/${b.ap}: no pinholes in the planform union${res.c7pinch.length ? ` (${res.c7pinch.length} raster-scale pinch(es) under 0.01 mm^2: a sinus narrower than 0.05 mm)` : ''}`);
    if (!res.c4.ok) fail(`C4 ${b.sp}/${b.ap}: grid writer ${res.c4.error || `u ${res.c4.u}/${res.c4.wantU} v ${res.c4.v}/${res.c4.wantV}`}`);
    else ok(`C4 ${b.sp}/${b.ap}: shipped grid writer -> ${res.c4.u} u-strips, ${res.c4.v} v-strips, ${(res.c4.bytes / 1024).toFixed(1)} KiB`);
  }
  return res;
}
function c5(quiet = false, perturb = 0) {
  /* the tooth law at skew 0.5 against the shipped lobeCutProfile */
  let bad = 0, n = 0;
  for (const crest of [0.6, 1, 2, 3]) for (const notch of [0.6, 1, 2, 3]) for (let i = 0; i <= 400; i++) {
    const f = i / 100; n++;
    if (!Object.is(L.toothCut(f, crest + perturb, notch, 0.5), G.lobeCutProfile(f, crest, notch))) bad++;
  }
  /* the notch against the shipped tubeNotchDepth */
  let badN = 0, nN = 0;
  for (const [W, r, beta] of [[2, 2, 0], [2, 1, 0.2], [1.5, 1.2, -0.3], [3, 0.5, 0.6]]) {
    const depth = G.__leafLabTubeNotchDepth([{ c: 0, rho: 1, W, r, beta }]);
    /* the shipped law reads x as |wrap(phi - c)| * rho; the same x is handed to ours */
    const wrapPi = (a) => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    for (let i = -320; i <= 320; i++) { const phi = i / 100; nN++; if (!Object.is(L.notchDepthAt(Math.abs(wrapPi(phi)) * 1, W, r + perturb, beta), depth(phi))) badN++; }
  }
  if (!quiet) {
    if (bad) fail(`C5 tooth law differs from the shipped lobeCutProfile on ${bad} of ${n}`); else ok(`C5 tooth law at skew 0.5 === shipped lobeCutProfile on ${n} of ${n} (Object.is)`);
    if (badN) fail(`C5 notch differs from the shipped tubeNotchDepth on ${badN} of ${nN}`); else ok(`C5 notch === shipped tubeNotchDepth on ${nN} of ${nN} (Object.is)`);
  }
  return bad + badN;
}
function sameMesh(a, b) {
  if (a.pos.length !== b.pos.length) return { same: false, why: `${a.pos.length / 9} vs ${b.pos.length / 9} triangles` };
  let d = 0;
  for (let i = 0; i < a.pos.length; i++) if (!Object.is(a.pos[i], b.pos[i])) d++;
  return { same: d === 0, why: `${d} of ${a.pos.length} floats differ` };
}

/* ---------------- run ---------------- */
console.log(`leaf lab — EXPORT mode, sheet ${SHEET_MM} mm, MIN_FEATURE_MM ${MIN_FEATURE} (shipped)`);
const built = {};
for (const sp of SPECIES) for (const ap of ['A', 'B']) built[`${sp}/${ap}`] = await buildOne(sp, ap);
console.log('\nSELF-CHECKS');
const checks = {};
for (const k of Object.keys(built)) checks[k] = checkLeaf(built[k]);
c5();
for (const sp of ['carnation', 'rose']) {
  const s = sameMesh(built[`${sp}/A`], built[`${sp}/B`]);
  if (!s.same) fail(`C6 ${sp}: A and B differ (${s.why})`); else ok(`C6 ${sp}: A and B are the same mesh (${built[`${sp}/A`].pos.length} floats, Object.is)`);
}

/* the counts */
console.log('\nCOUNTS (EXPORT)');
const counts = {};
for (const [k, b] of Object.entries(built)) {
  const kinds = {};
  for (const p of b.parts) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  counts[k] = { tris: b.acc.triangleCount, stlKiB: (84 + 50 * b.acc.triangleCount) / 1024, kinds };
  console.log(`  ${k.padEnd(14)} ${String(b.acc.triangleCount).padStart(7)} tris  ${counts[k].stlKiB.toFixed(1).padStart(8)} KiB STL  ${JSON.stringify(kinds)}`);
}

/* WHAT /plot's PER-PETAL WARP WOULD MAKE OF A LEAF. The grid writer accepts
   every captured panel (C4), but /plot's `petalFrame` (plot-petal.js) builds a
   petal's AXIS by pooling every u-line point that shares a declared u value,
   across all of that petal's panels, and taking their centroid. That is right
   for a cleft petal, whose panels are v-sub-intervals of ONE row ladder; an A
   leaf's panels each run u along their OWN vein. This feeds the captured mid
   points to the SHIPPED petalFrame (read-only import) and measures the axis it
   returns against the leaf's own midrib. SAMPLING NAMED: the captured grid
   (every row, all ten columns), the midrib sampled at 400 points. */
const PP = await import(pathToFileURL(path.join(ROOT, 'plot-petal.js')).href);
console.log('\n/plot PETAL FRAME — the shipped petalFrame on each leaf\'s captured panels');
const plotFrame = {};
for (const [k, b] of Object.entries(built)) {
  const strips = [];
  for (const part of b.parts) {
    if (!part.grid || !part.grid.rows || !part.grid.rows.length) continue;
    const rows = part.grid.rows, nc = rows[0].mid.length;
    for (let j = 0; j < nc; j++) {
      const pts = new Float32Array(rows.length * 3);
      rows.forEach((r, i) => { pts[i * 3] = r.mid[j][0]; pts[i * 3 + 1] = r.mid[j][1]; pts[i * 3 + 2] = r.mid[j][2]; });
      strips.push({ kind: 'u', count: rows.length, points: pts, stations: Float64Array.from(rows.map((r) => r.u)) });
    }
  }
  const fr = PP.petalFrame(strips);
  const mid = Array.from({ length: 401 }, (_, i) => b.leaf.map.frame((b.leaf.lengthMm * i) / 400).S);
  let midLen = 0; for (let i = 1; i < mid.length; i++) midLen += Math.hypot(mid[i][0] - mid[i - 1][0], mid[i][1] - mid[i - 1][1], mid[i][2] - mid[i - 1][2]);
  const near = (c) => { let bi = 0, bd = Infinity; for (let i = 0; i < mid.length; i++) { const d = Math.hypot(c[0] - mid[i][0], c[1] - mid[i][1], c[2] - mid[i][2]); if (d < bd) { bd = d; bi = i; } } return { i: bi, d: bd }; };
  let worst = 0, back = 0, prev = -1;
  for (const r of fr.rows) { const n = near(r.c); if (n.d > worst) worst = n.d; if (prev >= 0 && n.i < prev) back++; prev = n.i; }
  plotFrame[k] = { rows: fr.rows.length, panels: b.parts.filter((p) => p.grid).length, axisMm: fr.length, midribMm: midLen, ratio: fr.length / midLen, worstOffMm: worst, backSteps: back };
  const f = plotFrame[k];
  console.log(`  ${k.padEnd(14)} ${String(f.panels).padStart(2)} panel(s): axis ${f.axisMm.toFixed(1)} mm against a ${f.midribMm.toFixed(1)} mm midrib (x${f.ratio.toFixed(2)}), ${f.rows} rows, centroid up to ${f.worstOffMm.toFixed(2)} mm off the midrib, ${f.backSteps} backward step(s)`);
}

/* the width-law test */
console.log('\nWIDTH-LAW TEST — runs of material per side, planform union, 0.05 mm raster');
const widthLaw = {};
const rasters = {};
for (const [k, b] of Object.entries(built)) {
  const ras = raster(b.leaf);
  rasters[k] = ras;
  const x0 = b.leaf.panels.length ? Math.min(...b.leaf.panels.map((p) => p.plan(0, 0)[0])) : 0;
  const x1 = b.leaf.lengthMm;
  const perp = runsAlong(ras, 0, x0 + 0.5, x1);
  const tiltDeg = L.B_PRESETS[b.sp].type === 'PINNATIFID' ? L.B_PRESETS[b.sp].q.lobeAngleDeg : 0;
  const tilt = runsAlong(ras, Math.tan(tiltDeg * Math.PI / 180), x0 + 0.5, x1);
  widthLaw[k] = { perp, tilt, tiltDeg };
  console.log(`  ${k.padEnd(14)} perpendicular rows: max ${perp.maxRuns} runs/side, ${(100 * perp.fractionMulti).toFixed(1)}% of rows cut more than once${perp.maxRuns > 1 ? ` (worst at x ${perp.worstX.toFixed(1)} mm)` : ''}`
    + (tiltDeg ? `;  rows tilted ${tiltDeg} deg: max ${tilt.maxRuns}, ${(100 * tilt.fractionMulti).toFixed(1)}%` : ''));
}

/* the print report */
console.log(`\nPRINT REPORT — SLS PA12: wire >= ${SLS_UNSUPPORTED} mm unsupported, >= ${SLS_SUPPORTED} supported; bloom MIN_FEATURE_MM ${MIN_FEATURE}`);
const printRep = {};
for (const [k, b] of Object.entries(built)) {
  const ras = rasters[k];
  const thin10 = thinOf(ras.m, ras.W, ras.H, 1.0), thin08 = thinOf(ras.m, ras.W, ras.H, 0.8);
  const gap10 = gapsOf(ras.m, ras.W, ras.H, 1.0);
  const t10 = regions(thin10, ras.W, ras.H, ras.lo, ras.owner, ras.polys);
  const t08 = regions(thin08, ras.W, ras.H, ras.lo, ras.owner, ras.polys);
  /* a gap region is only a SINUS (two parts that would fuse) if it is longer
     than it is wide; a corner wedge at a concave turn is shorter than d */
  const g10 = regions(gap10, ras.W, ras.H, ras.lo, null, ras.polys).filter((g) => g.extentMm > 1.0);
  const rods = b.leaf.rods.map((r) => {
    let Lm = 0; for (let i = 0; i + 1 < r.pts2.length; i++) Lm += Math.hypot(r.pts2[i + 1][0] - r.pts2[i][0], r.pts2[i + 1][1] - r.pts2[i][1]);
    const d = 2 * Math.min(...r.radii);
    /* per SEGMENT, at that segment's own thinner end: a rachis tapers by the
       area rule, so one diameter over the whole length overstates nothing and
       understates where it is thin */
    const segments = [];
    let acc0 = 0;
    for (let i = 0; i + 1 < r.pts2.length; i++) {
      const len = Math.hypot(r.pts2[i + 1][0] - r.pts2[i][0], r.pts2[i + 1][1] - r.pts2[i][1]);
      const dd = 2 * Math.min(r.radii[i], r.radii[i + 1]);
      segments.push({ from: acc0, to: acc0 + len, len, d: dd, slenderness: len / dd });
      acc0 += len;
    }
    return { label: r.label, diameterMm: d, lengthMm: Lm, slenderness: Lm / d, segments };
  });
  const blades = b.leaf.panels.filter((p) => p.kind !== 'web').map((p) => ({ label: p.label, lengthMm: p.lenMm || b.leaf.lengthMm, tipMm: 2 * L.TIP_HALF_MM }));
  const longest = blades.reduce((m, x) => (x.lengthMm > m.lengthMm ? x : m), blades[0]);
  printRep[k] = {
    sheetMm: b.acc.floorThickness(SHEET_MM),
    thin10: { regions: t10.length, areaMm2: t10.reduce((s, r) => s + r.areaMm2, 0), worst: t10[0] || null },
    thin08: { regions: t08.length, areaMm2: t08.reduce((s, r) => s + r.areaMm2, 0), worst: t08[0] || null },
    gaps10: { regions: g10.length, longest: g10[0] || null },
    rods, thinnestRod: rods.reduce((m, r) => (!m || r.diameterMm < m.diameterMm || (r.diameterMm === m.diameterMm && r.slenderness > m.slenderness) ? r : m), null),
    longestBlade: longest, cantilever: longest ? longest.lengthMm / b.acc.floorThickness(SHEET_MM) : null,
  };
  const rimParts = b.parts.filter((p) => p.rimThinnest);
  const rimWorst = rimParts.reduce((m, p) => (!m || p.rimThinnest.mm < m.rimThinnest.mm ? p : m), null);
  printRep[k].rim = { clampedPoints: b.parts.reduce((n, p) => n + (p.rimClamps || 0), 0), thinnestMm: rimWorst ? rimWorst.rimThinnest.mm : null, at: rimWorst ? rimWorst.rimThinnest.at : null, part: rimWorst ? rimWorst.label : null };
  const pr = printRep[k];
  const w = pr.thin10.worst;
  console.log(`  ${k}`);
  console.log(`    sheet ${pr.sheetMm.toFixed(2)} mm (export) — longest blade ${longest.label} ${longest.lengthMm.toFixed(1)} mm = ${pr.cantilever.toFixed(1)} sheet thicknesses; every blade ends on the ${(2 * L.TIP_HALF_MM).toFixed(2)} mm tip floor`);
  console.log(`    in-plane material narrower than 1.00 mm: ${pr.thin10.regions} regions, ${pr.thin10.areaMm2.toFixed(2)} mm^2${w ? `; largest ${w.extentMm.toFixed(2)} mm long at (${w.at[0].toFixed(1)}, ${w.at[1].toFixed(1)}) on ${w.part}` : ''}`);
  console.log(`    narrower than 0.80 mm: ${pr.thin08.regions} regions, ${pr.thin08.areaMm2.toFixed(2)} mm^2${pr.thin08.worst ? `; largest ${pr.thin08.worst.extentMm.toFixed(2)} mm at (${pr.thin08.worst.at[0].toFixed(1)}, ${pr.thin08.worst.at[1].toFixed(1)}) on ${pr.thin08.worst.part}` : ''}`);
  console.log(`    gaps narrower than 1.00 mm longer than 1 mm (would fuse): ${pr.gaps10.regions}${pr.gaps10.longest ? `; longest ${pr.gaps10.longest.extentMm.toFixed(2)} mm at (${pr.gaps10.longest.at[0].toFixed(1)}, ${pr.gaps10.longest.at[1].toFixed(1)})` : ''}`);
  console.log(`    rim bead below RIM_FLOOR_MM (1.00) on a narrow span: ${pr.rim.clampedPoints} skin points${pr.rim.thinnestMm != null ? `; thinnest ${pr.rim.thinnestMm.toFixed(3)} mm at (${pr.rim.at[0].toFixed(1)}, ${pr.rim.at[1].toFixed(1)}) on ${pr.rim.part}` : ''}`);
  for (const r of rods) for (const sgm of r.segments) if (sgm.slenderness > 4) console.log(`    rod ${r.label} segment ${sgm.from.toFixed(1)}-${sgm.to.toFixed(1)} mm: ${sgm.d.toFixed(2)} mm x ${sgm.len.toFixed(1)} mm (L/d ${sgm.slenderness.toFixed(1)})`);
  if (pr.thinnestRod) console.log(`    thinnest rod: ${pr.thinnestRod.label} ${pr.thinnestRod.diameterMm.toFixed(2)} mm diameter, ${pr.thinnestRod.lengthMm.toFixed(1)} mm long${pr.thinnestRod.segments.some((g) => Math.abs(g.d - pr.thinnestRod.diameterMm) > 1e-9) ? ' (it TAPERS — whole-rod L/d at its thinnest diameter would overstate it; the per-segment lines above are the figures)' : ` (L/d ${pr.thinnestRod.slenderness.toFixed(1)})`}`);
}

/* THE FUSION CONTINUUM — A's one slider from a compound leaf to an entire
   one, on the mum's tree, plus PALMATE venation and the sinus blend at 0.
   Every build is checked (C1, C2, C3, C7) because a continuum that is only
   valid at its presets is not a continuum. */
console.log('\nFUSION CONTINUUM (A, the mum tree; EXPORT)');
const sweep = [];
/* A DECLARED FAILURE, held to its count both ways: at fusion 0.25 the terminal
   lobe's margin crosses L2's teeth and encloses three tooth notches as
   pinholes — A's overlapping-toothed-blades failure, mid-continuum. It is a
   finding about the approach (§3 of the doc), not a bug this prototype fixes;
   if the count changes in EITHER direction the run fails, so a fix announces
   itself and a regression cannot hide under the declaration. */
const SWEEP_XFAIL = { 'FUSION 0.25': { pinholes: 3 } };
for (const [lab, ov] of [['FUSION 0', { fusion: 0 }], ['FUSION 0.25', { fusion: 0.25 }], ['FUSION 0.5', { fusion: 0.5 }], ['FUSION 0.75', { fusion: 0.75 }], ['FUSION 1', { fusion: 1 }],
  ['BLEND 0 AT 0.5', { fusion: 0.5, sinusBlend: 0 }], ['PALMATE 0.5', { fusion: 0.5, venation: 'PALMATE', lengthMm: 22, firstMm: 2, angleDeg: 32, angleBaseDeg: 80, childLenMm: 20, terminalAtMm: 2, terminalLenMm: 24 }]]) {
  const b = await buildOne('mum', 'A', ov);
  const r = checkLeaf(b, { quiet: true });
  const bad = [...r.c1, ...r.c2].length + (r.c3.count !== 1 ? 1 : 0) + r.c7.length + (r.c4.ok ? 0 : 1);
  const ras = raster(b.leaf);
  const runs = runsAlong(ras, 0, b.leaf.panels[0].plan(0, 0)[0] + 0.5, b.leaf.lengthMm);
  const msg = `${lab.padEnd(15)} ${String(b.acc.triangleCount).padStart(6)} tris, ${b.leaf.webs.length} webs (${b.leaf.webs.filter((w) => w.open && !w.closedBeyond).length} notched), perpendicular runs/side max ${runs.maxRuns}, C1-C4/C7 ${bad ? `${bad} FAILED` : 'clean'}`;
  const xf = SWEEP_XFAIL[lab];
  if (xf) {
    const other = [...r.c1, ...r.c2].length + (r.c3.count !== 1 ? 1 : 0) + (r.c4.ok ? 0 : 1);
    if (other === 0 && r.c7.length === xf.pinholes) ok(`SWEEP ${lab.padEnd(15)} DECLARED: ${r.c7.length} pinholes as recorded (${r.c7.map((h) => `${h.areaMm2.toFixed(3)} mm^2 at (${h.at[0].toFixed(1)}, ${h.at[1].toFixed(1)})`).join(', ')}) — overlapping toothed blades`);
    else fail(`SWEEP ${lab}: declared ${xf.pinholes} pinholes and nothing else, measured ${r.c7.length} pinholes and ${other} other failures — re-record or remove the declaration`);
    sweep.push({ lab, b });
    continue;
  }
  if (bad) fail(`SWEEP ${msg}: ${[...r.c1, ...r.c2, r.c3.count !== 1 ? `${r.c3.count} pieces` : '', ...r.c7.map((h) => `pinhole ${h.areaMm2.toFixed(3)} mm^2 at (${h.at[0].toFixed(1)}, ${h.at[1].toFixed(1)})`)].filter(Boolean).join('; ')}`); else ok(`SWEEP ${msg}`);
  sweep.push({ lab, b });
}

/* the stem demo, both connectivity and counts */
console.log('\nSTEM DEMO (EXPORT, A leaves; the mum also with B)');
const stems = {};
for (const [name, sp, ap] of [['carnation', 'carnation', 'A'], ['rose', 'rose', 'A'], ['mum', 'mum', 'A'], ['mum-B', 'mum', 'B'], ['whorled', 'carnation', 'A']]) {
  const leaf = L.buildSpecies(sp, ap, name === 'whorled' ? { lengthMm: 34, rootWidth: 5, archDeg: 35 } : null);
  const acc = new G.MeshBuilder({ exportMode: true });
  const sp0 = L.STEM_PRESETS[name === 'mum-B' ? 'mum' : name];
  const { parts, plan } = await L.emitStemDemo(acc, sp0, leaf, { sheetMm: SHEET_MM });
  const pos = acc.positions;
  let c1 = 0; for (const p of parts) { const s = shellCheck(pos, p.t0, p.t1); if (s.unmatched || !(s.vol > 0)) c1++; }
  const conn = components(pos, 0.4);
  stems[name] = { acc, parts, plan, tris: acc.triangleCount, leaves: plan.nodes.reduce((n, nd) => n + nd.az.length, 0), nodes: plan.nodes.length, c1, pieces: conn.count };
  const msg = `${name}: ${plan.nodes.length} nodes, ${stems[name].leaves} leaves, ${acc.triangleCount} tris, ${c1} bad shells, ${conn.count} piece(s) at 0.40 mm; azimuths ${plan.nodes.map((n) => n.az.map((a) => (((a % 360) + 360) % 360).toFixed(0)).join('/')).join(' ')}`;
  if (c1 || conn.count !== 1) fail(`STEM ${msg}`); else ok(`STEM ${msg}`);
}

/* ---------------- the must-fail controls ---------------- */
if (CONTROL) {
  console.log('\nMUST-FAIL CONTROLS');
  let missed = 0;
  const expect = (name, fired, clean) => { if (fired && !clean) console.log(`  ok   ${name}: fires on the plant, silent on the clean build`); else { missed++; console.log(`  FAIL ${name}: plant ${fired ? 'fired' : 'SILENT'}, clean ${clean ? 'FIRED' : 'silent'}`); } };
  /* C1: a panel emitted with its normal reversed (an inside-out shell) */
  {
    const b = await buildOne('mum', 'A');
    const leaf = L.buildSpecies('mum', 'A');
    const pn = leaf.panels[1]; const plan = pn.plan; pn.plan = (u, v) => plan(u, -v);   // mirror v: winding against n
    const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
    const parts = await L.emitLeaf(leaf, { acc });
    const r = checkLeaf({ sp: 'mum', ap: 'A', leaf, acc, parts, pos: acc.positions }, { quiet: true });
    expect('C1 reversed panel', r.c1.length > 0, checkLeaf(b, { quiet: true }).c1.length > 0);
  }
  /* C2: a chevron whose half-width falls steeply. emitPanel samples NV = 10
     columns, NINE intervals, so no column lies on v = 0 and the innermost
     cell spans v in [-1/9, 1/9] — ACROSS the V's apex. Its two sides sit at
     x + (h/9) sin tau, so it folds where h drops faster than (NV - 1) / sin tau
     per mm of midrib. In the continuum the h' terms cancel; the lattice is
     what folds. */
  {
    const leaf = L.buildSpecies('mumX', 'B', { teeth: { count: 40, depth: 0.5, crest: 1, notch: 1, skew: 0.5 } });
    expect('C2 folded chevron (40 teeth at depth 0.5: the V row inverts at the midrib)', !(leaf.panels[0].jac.min > 0), !(built['mumX/B'].parts[0].jac.min > 0));
  }
  /* C3: a lobe moved 6 mm off its vein — detached */
  {
    const leaf = L.buildSpecies('mum', 'A', { fusion: 0 });
    const pn = leaf.panels.find((p) => p.label === 'blade L1'); const plan = pn.plan; pn.plan = (u, v) => { const q = plan(u, v); return [q[0], q[1] + 6]; };
    const acc = new G.MeshBuilder({ exportMode: true });
    await L.emitLeaf(leaf, { acc });
    expect('C3 detached lobe', connected(acc.positions).count !== 1, checks['mum/A'].c3.count !== 1);
  }
  /* C7, two plants on the exaggerated mum at its FIRST-CUT values (apical pair
     at 34 degrees x 20 mm, terminal 10 mm wide), where blades overlap past the
     webs: (a) C7 fires; (b) with the pocket rule off, the 1.40 mm^2 web pocket
     comes back on top of the tooth-notch pockets no web can reach. */
  {
    const firstCut = { ...L.A_PRESETS.mumX, angleDeg: 34, childLenMm: 20, terminalWidth: 10 };
    const holesOf = async (opts) => {
      const leaf = L.buildTreeLeaf(L.treeFromParams(firstCut), opts);
      const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
      const parts = await L.emitLeaf(leaf, { acc });
      return checkLeaf({ sp: 'mumX', ap: 'A', leaf, acc, parts, pos: acc.positions }, { quiet: true }).c7;
    };
    const on = await holesOf({}), off = await holesOf({ noPocketRule: true });
    expect('C7 overlapping toothed blades enclose tooth notches', on.length > 0, checks['mumX/A'].c7.length > 0);
    const big = (h) => h.some((r) => r.areaMm2 > 1.0);
    expect('C7 pocket rule off: the 1.40 mm^2 web pocket returns', big(off) && !big(on), checks['mumX/A'].c7.length > 0);
    console.log(`       (first-cut values: ${on.length} hole(s) with the rule, largest ${on[0] ? on[0].areaMm2.toFixed(3) : 0} mm^2; ${off.length} without, largest ${off[0] ? off[0].areaMm2.toFixed(3) : 0} mm^2)`);
  }
  /* C5: a tooth law with a perturbed exponent */
  expect('C5 perturbed laws', c5(true, 1e-9) > 0, c5(true, 0) > 0);
  /* the width-law instrument: a two-run outline must read 2 */
  {
    const fake = { panels: [], rods: [], lengthMm: 20 };
    const two = { m: null };
    void fake; void two;
    const W = 400, H = 400, m = new Uint8Array(W * H);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const y = r * PX - 10; if ((y > 1 && y < 3) || (y > 5 && y < 7)) m[r * W + c] = 1; }
    const rr = runsAlong({ m, W, H, lo: [0, -10] }, 0, 1, 19);
    expect('width-law instrument reads two runs', rr.maxRuns === 2, widthLaw['carnation/A'].perp.maxRuns !== 1);
  }
  /* the print instrument: a 0.6 mm wide strip must be found thin */
  {
    const W = 400, H = 200, m = new Uint8Array(W * H);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const y = r * PX; if (y > 4 && y < 4.6) m[r * W + c] = 1; if (y > 6 && y < 8) m[r * W + c] = 1; }
    const th = regions(thinOf(m, W, H, 1.0), W, H, [0, 0], null, []);
    const thinStrip = th.some((t) => t.at[1] > 4 && t.at[1] < 4.6 && t.extentMm > 15), wideClean = !th.some((t) => t.at[1] > 6.3 && t.at[1] < 7.7 && t.extentMm > 1);
    expect('print instrument finds a 0.6 mm strip and spares a 2 mm one', thinStrip && wideClean, false);
  }
  if (missed) { failures += missed; console.log(`  ${missed} control(s) did not behave`); }
}

/* ---------------- sheets ---------------- */
const COL = { blade: [104, 158, 98], web: [150, 176, 84], rod: [138, 108, 78], chevron: [104, 158, 98], stem: [124, 140, 92] };
const BG = [250, 250, 247];
function bbox(pos) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
  return { lo, hi, c: lo.map((v, k) => (v + hi[k]) / 2) };
}
function colourOf(parts, n) { const col = new Array(n); for (const p of parts) for (let t = p.t0; t < p.t1; t++) col[t] = COL[p.kind] || [200, 200, 200]; return (t) => col[t]; }
function wrap(str, n) { const out = []; let line = ''; for (const w of str.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
function sheet(file, rowsSpec, cell, cols, headerFor) {
  const capH = 78;
  const W = cell * cols, H = rowsSpec.length * (cell + capH) + 30;
  const img = Buffer.alloc(W * H * 3, 255);
  for (let i = 0; i < W * H; i++) { img[i * 3] = BG[0]; img[i * 3 + 1] = BG[1]; img[i * 3 + 2] = BG[2]; }
  rowsSpec.forEach((row, r) => {
    const y0 = r * (cell + capH);
    headerFor(row).forEach((ln, i) => R.text(img, W, H, 8, y0 + 8 + i * 16, ln, i === 0 ? [30, 60, 30] : [70, 70, 70], 2));
    row.cells.forEach((c, k) => { R.blit(img, W, H, c.img, cell, cell, k * cell, y0 + capH); if (c.label) R.text(img, W, H, k * cell + 6, y0 + capH + 6, c.label, [40, 40, 40], 2); });
  });
  R.writePng(file, W, H, img);
}
if (SHEETS) {
  fs.mkdirSync(OUT, { recursive: true });
  const CELL = 300;
  const front = (c, hh) => ({ dir: [0, 0, 1], up: [1, 0, 0], center: c, halfHeight: hh });
  const tq = (c, hh) => ({ dir: [-0.5, -0.45, 0.74], up: [0, 0, 1], center: c, halfHeight: hh });
  const rowsSpec = [];
  const names = { carnation: 'CARNATION', rose: 'ROSE', mum: 'CHRYSANTHEMUM', mumX: 'CHRYSANTHEMUM, EXAGGERATED' };
  const btype = (sp) => L.B_PRESETS[sp].type.replace('_', ' ');
  for (const sp of SPECIES) {
    const cells = [];
    const pa = built[`${sp}/A`], pb = built[`${sp}/B`];
    const bb = [bbox(pa.pos), bbox(pb.pos)];
    const hh = Math.max(...bb.map((x) => Math.max(x.hi[0] - x.lo[0], x.hi[1] - x.lo[1]))) / 2 * 1.06;
    for (const [b, lab] of [[pa, 'A FRONT'], [pa, 'A 3/4'], [pb, 'B FRONT'], [pb, 'B 3/4']]) {
      const c = bbox(b.pos).c;
      const cam = lab.endsWith('FRONT') ? front(c, hh) : tq(c, hh);
      cells.push({ img: R.render(b.pos, CELL, CELL, cam, { colorOf: colourOf(b.parts, b.acc.triangleCount), bg: BG }), label: lab });
    }
    rowsSpec.push({ sp, cells, text: [`${names[sp]}   A: BLADE TREE ${sp === 'rose' ? '(FUSION 0, STALKS)' : sp === 'carnation' ? '(ONE BLADE)' : `(FUSION ${L.A_PRESETS[sp].fusion}, SINUS BLEND ${L.A_PRESETS[sp].sinusBlend})`}   B: ${btype(sp)}`, `EXPORT TRIANGLES  A ${counts[`${sp}/A`].tris}  B ${counts[`${sp}/B`].tris}`, ...wrap(L.REFERENCES[sp].toUpperCase().replace(/[;~']/g, ','), 96).slice(0, 2)] });
  }
  sheet(path.join(OUT, 'leaf-lab-sheet.png'), rowsSpec, CELL, 4, (row) => row.text);
  /* stems */
  const sRows = [];
  const sCells = [];
  for (const name of ['carnation', 'rose', 'mum', 'mum-B', 'whorled']) {
    const s = stems[name];
    const bb = bbox(s.acc.positions);
    const hh = Math.max(bb.hi[2] - bb.lo[2], bb.hi[0] - bb.lo[0], bb.hi[1] - bb.lo[1]) / 2 * 1.04;
    const cam = { dir: [0.62, -0.62, 0.48], up: [0, 0, 1], center: bb.c, halfHeight: hh };
    const arr = L.STEM_PRESETS[name === 'mum-B' ? 'mum' : name].arrangement;
    const lab = arr.type === 'ALTERNATE' ? `ALT ${arr.divergenceDeg.toFixed(1)}` : arr.type === 'OPPOSITE' ? `OPP${arr.decussate ? ' DECUSS.' : ''}` : `WHORL ${arr.whorlN}`;
    sCells.push({ img: R.render(s.acc.positions, 340, 340, cam, { colorOf: colourOf(s.parts, s.acc.triangleCount), bg: BG }), label: `${name === 'whorled' ? 'GENERIC' : name.toUpperCase()} ${lab}` });
  }
  sRows.push({ cells: sCells, text: ['STEM DEMO - ARRANGEMENT (NODE PROPERTIES), SWELLING, KINK AWAY FROM THE FIRST LEAF, INTERNODES', 'CARNATION: OPPOSITE DECUSSATE, SWOLLEN NODES. ROSE: ALTERNATE 137.5 DEG, 6 DEG KINK. MUM: ALTERNATE,', 'A LEAVES THEN B LEAVES. GENERIC: WHORLED 3, ALTERNATING WHORLS. EXPORT MODE, 1.2 MM SHEET.'] });
  sheet(path.join(OUT, 'leaf-lab-stems.png'), sRows, 340, 5, (row) => row.text);
  /* the print map: material (grey), thinner than 1.0 (red), gaps under 1.0 (blue) */
  const PC = 300, pRows = [];
  for (const sp of SPECIES) {
    const cells = [];
    for (const ap of ['A', 'B']) {
      const ras = rasters[`${sp}/${ap}`];
      const thin = thinOf(ras.m, ras.W, ras.H, 1.0), gap = gapsOf(ras.m, ras.W, ras.H, 1.0);
      const img = Buffer.alloc(PC * PC * 3);
      /* the leaf's tip UP: planform +x is image up, planform y is image x */
      const span = Math.max(ras.W, ras.H) * PX, s = span / PC, blk = Math.max(1, Math.round(s / PX));
      const cx = ras.lo[0] + (ras.W * PX) / 2, cy = ras.lo[1] + (ras.H * PX) / 2;
      for (let yi = 0; yi < PC; yi++) for (let xi = 0; xi < PC; xi++) {
        const X = cx + (PC / 2 - yi) * s, Y = cy + (xi - PC / 2) * s;
        const c0 = Math.floor((X - ras.lo[0]) / PX), r0 = Math.floor((Y - ras.lo[1]) / PX);
        let anyM = 0, anyT = 0, anyG = 0;
        for (let dr = 0; dr < blk; dr++) for (let dc = 0; dc < blk; dc++) {
          const c = c0 + dc, r = r0 + dr; if (c < 0 || r < 0 || c >= ras.W || r >= ras.H) continue;
          const i = r * ras.W + c; anyM |= ras.m[i]; anyT |= thin[i]; anyG |= gap[i];
        }
        const col = anyT ? [214, 40, 40] : anyG ? [40, 90, 214] : anyM ? [150, 160, 150] : BG;
        const o = (yi * PC + xi) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2];
      }
      cells.push({ img, label: `${ap} ${sp === 'mumX' ? 'MUM EXAGG.' : sp === 'mum' ? 'MUM' : names[sp]}` });
    }
    pRows.push({ cells, sp });
  }
  const pairs = [];
  for (let i = 0; i < pRows.length; i += 2) pairs.push({ cells: [...pRows[i].cells, ...(pRows[i + 1] ? pRows[i + 1].cells : [])], text: i === 0 ? ['PRINT MAP - PLANFORM, EXPORT, 0.05 MM RASTER, TIP UP. RED: MATERIAL NARROWER', 'THAN 1.00 MM. BLUE: GAPS NARROWER THAN 1.00 MM. GREY: MATERIAL (RODS AT THEIR DIAMETER).'] : [''] });
  sheet(path.join(OUT, 'leaf-lab-print.png'), pairs, PC, 4, (row) => row.text);
  /* the continuum strip */
  {
    const C = 240, cells = [];
    const boxes = sweep.map((x) => bbox(x.b.pos));
    const hh = Math.max(...boxes.map((x) => Math.max(x.hi[0] - x.lo[0], x.hi[1] - x.lo[1]))) / 2 * 1.04;
    sweep.forEach((x, i) => cells.push({ img: R.render(x.b.pos, C, C, front(boxes[i].c, hh), { colorOf: colourOf(x.b.parts, x.b.acc.triangleCount), bg: BG }), label: x.lab }));
    sheet(path.join(OUT, 'leaf-lab-fusion.png'), [{ cells, text: ['APPROACH A - ONE TREE, ONE FUSION SLIDER: COMPOUND (0) TO ENTIRE (1). LIGHTER GREEN = THE WEBS.', 'THE MUM TREE, EXPORT. LAST TWO: THE SINUS BLEND AT 0 (NO TUBE NOTCH), AND PALMATE VENATION.'] }], C, cells.length, (row) => row.text);
  }
  console.log(`\nSHEETS -> ${path.relative(ROOT, OUT)}/leaf-lab-sheet.png, leaf-lab-stems.png, leaf-lab-print.png, leaf-lab-fusion.png`);
}
fs.writeFileSync(path.join(TMP, 'report.json'), JSON.stringify({ counts, plotFrame, widthLaw, printRep, checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { c1: v.c1, c2: v.c2, c3: v.c3, c4: v.c4, c7: v.c7 }])), stems: Object.fromEntries(Object.entries(stems).map(([k, v]) => [k, { tris: v.tris, leaves: v.leaves, nodes: v.nodes, pieces: v.pieces }])) }, null, 1));
console.log(`\nreport json: ${path.join(TMP, 'report.json')}`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASS');
process.exitCode = failures ? 1 : 0;
