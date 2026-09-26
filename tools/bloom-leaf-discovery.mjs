/* ===================================================================
   bloom-leaf-discovery.mjs — LEAVES ON THE BLOOM'S STEM, PHASE A.
   Discovery only. ZERO BYTES: it reads the shipped geometry, builds no
   mesh into the repo, places no row, and is imported by nothing.

     node tools/bloom-leaf-discovery.mjs [--section=1|2|3|4|5|6]

   IT ANSWERS TWO QUESTIONS AND FINDS A THIRD.

   A1 — CAN THE OUTLINE AND THE CUT BE SHARED WITHOUT THE FOOT AND THE
        LADDER?  Eva's ruling 2 says a leaf shares the petal's outline and
        serration machinery but must NOT inherit the foot rows, the
        foot-to-blade seam clearance, or the turning-rate ladder. This is
        that ruling's open half and it is answered YES, by measurement.

   A2 — DOES CLOSING THE BORE AT EACH NODE SOLVE THE ATTACHMENT?  The
        proposal was to TEST, not to adopt, and the PREMISE IS TESTED
        BEFORE THE FIX IS. It comes back FALSE as stated: a petiole
        rooted on the axis is NOT detached at ordinary angles, because a
        radial rod crosses the wall annulus on its way out. What IS
        reachable is detachment through the LEAF ANGLE, and a rooting
        radius answers it for nothing.

   §6 — THE TOP NODE INSET. A fraction of the STEM cannot express whether
        the topmost leaf clears the HEAD. 30 of 30 sampled states foul it.

   EVERY FIGURE NAMES ITS MODE AND ITS SAMPLING. The voxel verdict is this
   tool's own, and it is CALIBRATED — and its RESOLUTION is measured (§4b)
   — before any of it is quoted. A near-miss below that resolution is
   reported as saying nothing, never as a pass.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);

const argOf = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const ONLY = argOf('section');
const want = (s) => !ONLY || ONLY === s;
const f = (x, n = 3) => (Number.isFinite(x) ? x.toFixed(n) : String(x));

/* A DEGENERATE STALK stands the root blend down. It is not a proposal for
   how a leaf declares itself — it is the switch that ALREADY EXISTS
   (`widthProfile`'s "a stalk narrower than the foot is the whole point, so
   the foot-continuity floor stands down for it"), and CAPABILITY_CLAW
   exercises it on shipped matrix rows today. */
const PETIOLE_CAP = { stalk: { until: 1e-9, halfWidth: 0 } };
const LEAFY = { petalBaseTaper: 0.9, petalTipTaper: 1.1, petalTipShape: 1.30 };

function leafProfile({ L, W, exportMode, set = {}, cap = PETIOLE_CAP, ringWidth = 6 }) {
  const state = { ...DEFAULTS, ...set, petalLength: L, petalWidth: W };
  const acc = new G.MeshBuilder({ exportMode });
  /* THE RING IS A TWO-FIELD STAND-IN carrying only what widthProfile reads. */
  const ring = { width: ringWidth, thickness: state.sheetThickness };
  return { state, acc, p: G.widthProfile(state, ring, W / 2, cap, acc, L), L, W };
}

/* ===================== §1  ring.width IS UNREAD ====================== */
if (want('1')) {
  console.log('=== §1  ONCE THE ROOT BLEND STANDS DOWN, ring.width IS UNREAD ===');
  console.log('    The identity: the SAME outline sampled at 4001 stations with ring.width');
  console.log('    at two wildly different values, compared with Object.is. The foot cannot');
  console.log('    reach the outline if no float moves.\n');
  for (const mode of [false, true]) {
    const base = { L: 70, W: 22, exportMode: mode, set: { ...LEAFY, lobeDepth: 0.30, lobeCount: 7, lobeCoverage: 1, lobeCrestShape: 1, lobeNotchShape: 1 } };
    /* halfWidthAt, NOT shapeAt. `shapeAt` is the shape term BEFORE the floors,
       so it is not what the builder emits — and a clause whose MEASURED side is
       not the artefact measures something else (session 41's L7, twice over).
       Read on shapeAt this comparison is 174; on the emitted half-width it is
       917, and the claim is about the emitted outline. */
    const sample = (q) => Array.from({ length: 4001 }, (_, i) => q.p.halfWidthAt(i / 4000));
    const cmp = (A, B) => { const a = sample(A), b = sample(B); let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) d++; return d; };
    const on = [leafProfile({ ...base, ringWidth: 3, cap: null }), leafProfile({ ...base, ringWidth: 40, cap: null })];
    const off = [leafProfile({ ...base, ringWidth: 3 }), leafProfile({ ...base, ringWidth: 40 })];
    console.log(`  [${mode ? 'EXPORT' : 'LIVE  '}]  root blend LIVE : ${String(cmp(on[0], on[1])).padStart(4)} of 4001 differ  <- ring.width IS read`);
    console.log(`            root blend DOWN : ${String(cmp(off[0], off[1])).padStart(4)} of 4001 differ  <- ring.width is NOT read`);
  }
  console.log(`\n    footHalf is still REPORTED on the record (${f(leafProfile({ L: 70, W: 22, exportMode: true }).p.footHalf, 2)} mm) — carried, never consulted.`);
  console.log('    widthProfile reads exactly TWO fields off `ring`: `width` (the root blend');
  console.log('    alone) and `thickness` (the lobe pitch floor, which a leaf owns anyway).');
}

/* ===================== §2  petalForm TAKES ITS FRAME ================= */
if (want('2')) {
  console.log('\n=== §2  THE FORM LAW TAKES ITS FRAME AS AN ARGUMENT (ruling 3) ===');
  console.log('    petalForm(state, halfW, t) reads NOTHING off a ring; sectAt(C, T1, N1, h,');
  console.log('    u, hb) and frameAt(R, T, phi, u, up) take every input from the caller. So a');
  console.log('    leaf supplies a PETIOLE frame and gets cup and twist unchanged. Measured');
  console.log('    below with no ring in existence.\n');
  const halfW = 11, R = [1, 0, 0], T = [0, 1, 0];
  for (const [name, set] of [['flat         ', {}], ['cup 0.80     ', { petalCup: 0.80 }], ['twist 60     ', { petalTwist: 60 }], ['cup + twist  ', { petalCup: 0.80, petalTwist: 60 }]]) {
    const state = { ...DEFAULTS, ...LEAFY, ...set };
    const form = G.petalForm(state, halfW, G.SHEET_THICKNESS_MM);
    if (!form) { console.log(`  ${name} petalForm() === null (the FLAT guard) — a planar blade`); continue; }
    const sect = form.sectAt([0, 0, 0], T, [0, 0, 1], halfW, 0.60);
    const zs = [-1, -0.5, 0, 0.5, 1].map((v) => sect(v).P[2]);
    const f0 = form.frameAt(R, T, 0, 0), f1 = form.frameAt(R, T, 0, 1);
    const dot = f0.T[0] * f1.T[0] + f0.T[1] * f1.T[1] + f0.T[2] * f1.T[2];
    console.log(`  ${name} section rise at u=0.60: ${f(Math.max(...zs) - Math.min(...zs), 4).padStart(8)} mm    frame rotation base->tip: ${f(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI, 4).padStart(9)} deg`);
  }
}

/* ===================== §3  THE CUT, AND WHAT STILL COUPLES =========== */
if (want('3')) {
  console.log('\n=== §3  THE CUT BUILDS ON A BARE RING — AND WHAT STILL COUPLES ===');
  console.log('    The lobe arc table is `rimArcTable((u) => [u*length, laminaHalf(u), 0], ...)`');
  console.log('    — a FLAT 2D outline. It touches no surface, no foot, no ladder.');
  console.log('    EXPORT, a 70 x 22 mm blade, count 10 asked.\n');
  const SHAPES = [['serrate  (1.00/1.00)', { lobeCrestShape: 1, lobeNotchShape: 1 }],
                  ['crenate  (3.00/1.00)', { lobeCrestShape: 3, lobeNotchShape: 1 }],
                  ['dentate  (1.00/3.00)', { lobeCrestShape: 1, lobeNotchShape: 3 }],
                  ['default  (2.00/2.00)', { lobeCrestShape: 2, lobeNotchShape: 2 }]];
  for (const [name, sh] of SHAPES) {
    const q = leafProfile({ L: 70, W: 22, exportMode: true, set: { ...LEAFY, ...sh, lobeDepth: 0.30, lobeCount: 10, lobeCoverage: 1 } });
    const L2 = q.p.lobes;
    console.log(`  ${name}  demand/period=${String(L2.samplesPerLobe).padStart(2)}  built=${String(L2.countBuilt).padStart(2)}/10  cap=${String(L2.countCap).padStart(2)} by ${String(L2.clampedBy)}  capacity=${L2.rowsCapacity}`);
  }
  console.log('\n    TWO THINGS STILL REACH IN, and both are one substitution each:');
  console.log(`      (a) the WINDOW's lower bound is ROOT_BLEND_END (${G.ROOT_BLEND_END}) — the petal's`);
  console.log('          foot constant standing for "where the lamina begins". On a leaf that');
  console.log('          is the petiole junction. Measured cost below.');
  console.log(`      (b) the COUNT CAP goes through ladderWindowCapacity, which reads HELD_ROWS`);
  console.log(`          (${G.HELD_ROWS()}) and ladderGapFactor — the LADDER's constants deciding a leaf's`);
  console.log('          tooth count. Conservative (it under-counts a leaf\'s rows), not wrong.\n');
  for (const [L, W] of [[70, 22], [45, 14], [90, 30]]) {
    const q = leafProfile({ L, W, exportMode: true, set: { ...LEAFY, lobeDepth: 0.30, lobeCount: 7, lobeCoverage: 1, lobeCrestShape: 1, lobeNotchShape: 1 } });
    const lamina = (u) => Math.max(q.p.halfWidthBaseAt(u), G.TIP_HALF_MM);
    const table = G.rimArcTable((u) => [u * L, lamina(u), 0], q.p.slopeBreaks(4096), q.p.uPk, 1024);
    const all = table.sAt(1) - table.sAt(0), rb = table.sAt(1) - table.sAt(G.ROOT_BLEND_END);
    console.log(`    leaf ${String(L).padStart(2)} x ${String(W).padStart(2)} mm: the window floor withholds ${f(all - rb, 2)} of ${f(all, 2)} mm of margin = ${f(100 * (all - rb) / all, 1)}% of the rim`);
  }
}

/* ===================== §4  THE LADDER IS NOT NEEDED ================== */
if (want('4')) {
  console.log('\n=== §4  UNIFORM STATIONING DRAWS THE TOOTH — no ladder, no seam ===');
  console.log('    drawn amplitude / analytic amplitude at the worst period, swept over 200');
  console.log(`    phase offsets. NU = ${G.BLADE_ROWS}; a leaf with no foot spends none of them on a`);
  console.log('    root blend. EXPORT, a 70 x 22 mm blade.\n');
  const SHAPES = [['serrate ', { lobeCrestShape: 1, lobeNotchShape: 1 }], ['crenate ', { lobeCrestShape: 3, lobeNotchShape: 1 }],
                  ['dentate ', { lobeCrestShape: 1, lobeNotchShape: 3 }], ['default ', { lobeCrestShape: 2, lobeNotchShape: 2 }]];
  for (const [name, sh] of SHAPES) for (const count of [5, 7, 10]) {
    const q = leafProfile({ L: 70, W: 22, exportMode: true, set: { ...LEAFY, ...sh, lobeDepth: 0.30, lobeCount: count, lobeCoverage: 1 } });
    const Lr = q.p.lobes; if (Lr.noRoom) { console.log(`  ${name} n=${count}: NO ROOM`); continue; }
    const [u0, u1] = Lr.windowU;
    const rows = Math.round(G.BLADE_ROWS * (u1 - u0));
    let worst = Infinity;
    for (let ph = 0; ph < 200; ph++) {
      const st = Array.from({ length: rows }, (_, i) => u0 + ((i + ph / 200) / rows) * (u1 - u0));
      const near = (u) => st.reduce((b, x) => (Math.abs(x - u) < Math.abs(b - u) ? x : b), st[0]);
      let ratio = Infinity;
      for (let k = 0; k < Lr.sinusU.length; k++) {
        const s = Lr.sinusU[k], c = Lr.crestU[k];
        if (!(s > u0 && s < u1 && c > u0 && c < u1)) continue;
        const a = q.p.halfWidthBaseAt(c) - q.p.shapeAt(s); if (!(a > 1e-9)) continue;
        ratio = Math.min(ratio, (q.p.shapeAt(near(c)) - q.p.shapeAt(near(s))) / a);
      }
      worst = Math.min(worst, ratio);
    }
    console.log(`  ${name} n=${String(count).padStart(2)}  built=${String(Lr.countBuilt).padStart(2)}  rows/period=${f(rows / Lr.periods, 2)}  demand=${Lr.samplesPerLobe}  worst drawn/analytic = ${f(100 * worst, 1)}%`);
  }
  console.log('\n    80-95% of the analytic amplitude at the WORST phase. That is not a');
  console.log('    staircase — session 38\'s staircase was 3.0 rows per lobe at NU 28.');
}

/* ============ §5  THE ATTACHMENT — the premise, then the fix ========= */
function stemOf(set) {
  const state = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(state, acc);
  return { state, acc, fr, plan: G.stemPlan(state, fr.hub, acc) };
}
/* A voxel flood fill. CALIBRATED below, and its RESOLUTION measured, before
   any verdict is quoted: a surface raster merges two shells closer than one
   cell, so a near miss reads as an attachment. */
function components(positions, cell) {
  const n = positions.length / 9; if (!n) return { comps: 0 };
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) { const v = positions[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  const pad = 2, dim = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - lo[k]) / cell) + 1 + 2 * pad));
  const N = dim[0] * dim[1] * dim[2]; if (N > 60e6) return { skipped: true };
  const buf = new Uint8Array(N), idx = (a, b, c) => (a * dim[1] + b) * dim[2] + c;
  const put = (p) => { const a = Math.round((p[0] - lo[0]) / cell) + pad, b = Math.round((p[1] - lo[1]) / cell) + pad, c = Math.round((p[2] - lo[2]) / cell) + pad;
    if (a >= 0 && b >= 0 && c >= 0 && a < dim[0] && b < dim[1] && c < dim[2]) buf[idx(a, b, c)] = 1; };
  for (let t = 0; t < n; t++) {
    const A = positions.slice(t * 9, t * 9 + 3), B = positions.slice(t * 9 + 3, t * 9 + 6), C = positions.slice(t * 9 + 6, t * 9 + 9);
    const e = Math.max(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]), Math.hypot(A[0] - C[0], A[1] - C[1], A[2] - C[2]));
    const s = Math.max(2, Math.ceil((2 * e) / cell));
    for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) { const u = i / s, v = j / s, w = 1 - u - v;
      put([A[0] * w + B[0] * u + C[0] * v, A[1] * w + B[1] * u + C[1] * v, A[2] * w + B[2] * u + C[2] * v]); }
  }
  let comps = 0; const seen = new Uint8Array(N), st = new Int32Array(N);
  for (let i = 0; i < N; i++) { if (!buf[i] || seen[i]) continue; comps++; let sp = 0; st[sp++] = i; seen[i] = 1;
    while (sp) { const q = st[--sp]; const c = q % dim[2], b = ((q - c) / dim[2]) % dim[1], a = ((q - c) / dim[2] - b) / dim[1];
      for (const [x, y, z] of [[a + 1, b, c], [a - 1, b, c], [a, b + 1, c], [a, b - 1, c], [a, b, c + 1], [a, b, c - 1]]) {
        if (x < 0 || y < 0 || z < 0 || x >= dim[0] || y >= dim[1] || z >= dim[2]) continue;
        const j = idx(x, y, z); if (buf[j] && !seen[j]) { seen[j] = 1; st[sp++] = j; } } } }
  return { comps };
}
function rod(acc, { base, ax, up, len, r, sides = 24, from = 0 }) {
  const bi = [ax[1] * up[2] - ax[2] * up[1], ax[2] * up[0] - ax[0] * up[2], ax[0] * up[1] - ax[1] * up[0]];
  const ring = (s) => Array.from({ length: sides }, (_, i) => { const a = 2 * Math.PI * i / sides, c = Math.cos(a) * r, d = Math.sin(a) * r;
    return [base[0] + ax[0] * s + up[0] * c + bi[0] * d, base[1] + ax[1] * s + up[1] * c + bi[1] * d, base[2] + ax[2] * s + up[2] * c + bi[2] * d]; });
  const A = ring(from), B = ring(len);
  for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; acc.quad(A[i], A[j], B[j], B[i]); }
  for (let i = 1; i < sides - 1; i++) { acc.tri(A[0], A[i + 1], A[i]); acc.tri(B[0], B[i], B[i + 1]); }
}

if (want('5')) {
  console.log('\n=== §5  THE ATTACHMENT. THE PREMISE IS TESTED BEFORE THE FIX IS ===');
  console.log(`    stemDiameter ${G.STEM_DIAMETER_RANGE.join('..')} mm ; STEM_MIN_WALL_MM = ${G.STEM_MIN_WALL_MM};`);
  console.log('    bore = max(0, R - 1.5), so 3.0 mm is the ONLY solid setting and every');
  console.log('    diameter from 3.5 up is hollow with a wall of exactly 1.5 mm.\n');
  for (const d of [3, 3.5, 6, 12]) { const { plan } = stemOf({ stemLength: 60, stemDiameter: d });
    console.log(`    dia ${String(d).padStart(4)}: outerR ${f(plan.outerR, 2)}  boreR ${f(plan.boreR, 3)}  wall ${f(plan.wallMm, 3)}  void ${f(plan.voidMm, 2)} mm  plug ${f(plan.tipPlugMm, 2)} mm`); }

  /* CALIBRATION, in the tool rather than in a memory of having done it: a
     probe that cannot tell two overlapping boxes from two separated ones
     cannot be quoted about anything below, and the run REFUSES rather than
     reporting on an instrument it has not checked. */
  {
    const box = (a, x0, x1) => { const c = [[x0,0,0],[x1,0,0],[x1,10,0],[x0,10,0],[x0,0,10],[x1,0,10],[x1,10,10],[x0,10,10]];
      a.quad(c[0],c[3],c[2],c[1]); a.quad(c[4],c[5],c[6],c[7]); a.quad(c[0],c[1],c[5],c[4]);
      a.quad(c[1],c[2],c[6],c[5]); a.quad(c[2],c[3],c[7],c[6]); a.quad(c[3],c[0],c[4],c[7]); };
    const A = new G.MeshBuilder({ exportMode: true }); box(A, 0, 10); box(A, 5, 15);
    const B = new G.MeshBuilder({ exportMode: true }); box(B, 0, 10); box(B, 40, 50);
    const ov = components(A.positions, 0.6).comps, sep = components(B.positions, 0.6).comps;
    console.log(`\n  -- CALIBRATION: two OVERLAPPING boxes -> ${ov} ; two SEPARATED -> ${sep} --`);
    if (ov !== 1 || sep !== 2) { console.error('  !! the probe cannot tell them apart — nothing below is quotable'); process.exit(1); }
  }
  console.log('\n  -- the probe, RESOLVED --');
  const probe = (dia, r0, len, rp, th, label) => {
    const { acc, plan } = stemOf({ stemLength: 60, stemDiameter: dia });
    G.buildStemInto(acc, plan);
    const c = Math.cos(th * Math.PI / 180), s = Math.sin(th * Math.PI / 180);
    rod(acc, { base: [r0, 0, (plan.rootZ + plan.tipZ) / 2], ax: [c, 0, s], up: [0, 1, 0], len, r: rp });
    return { c6: components(acc.positions, 0.6).comps, c3: components(acc.positions, 0.3).comps, plan };
  };
  console.log('     a petiole standing CLEAR of the outer surface by g mm is NOT attached at');
  console.log('     any g > 0; the sweep says where the raster stops merging the two shells.');
  for (const g of [0.2, 0.4, 0.7, 1.0, 2.0]) {
    const { plan } = stemOf({ stemLength: 60, stemDiameter: 6 });
    const r = probe(6, plan.outerR + g, 14, 1.2, 0);
    console.log(`       gap ${f(g, 2)} mm -> ${r.c6} @0.6mm, ${r.c3} @0.3mm${r.c3 === 1 ? '   <- MERGED: below resolution, says nothing' : ''}`);
  }
  console.log('     => this probe resolves a gap of 0.7 mm and up. Anything under that is');
  console.log('        reported as saying nothing, never as a pass.');

  console.log('\n  -- THE PREMISE: is a petiole on the axis detached? --');
  for (const [dia, r0, name] of [[6, 0, 'ON THE AXIS, 6 mm stem  '], [6, 1.5, 'at the BORE WALL, 6 mm  '], [12, 0, 'ON THE AXIS, 12 mm stem ']]) {
    const r = probe(dia, r0, 14, 1.2, 0);
    console.log(`     ${name} -> ${r.c3} component(s) @0.3mm   it CROSSES the wall annulus`);
  }
  console.log('     NO. A radial rod from the axis crosses the wall on its way out, and that');
  console.log(`     crossing is a real solid overlap: exactly 2 x wall = ${f(2 * G.STEM_MIN_WALL_MM, 2)} mm of material`);
  console.log('     at EVERY hollow diameter, because Eva\'s bore rule fixes the wall.');

  console.log('\n  -- WHAT *IS* REACHABLE: the LEAF ANGLE (ruling 7) --');
  console.log('     a 10 mm axis-rooted petiole on a 12 mm stem, angle from horizontal:');
  for (const th of [0, 45, 75, 85]) {
    const { acc, plan } = stemOf({ stemLength: 60, stemDiameter: 12 });
    G.buildStemInto(acc, plan);
    const c = Math.cos(th * Math.PI / 180), s = Math.sin(th * Math.PI / 180);
    rod(acc, { base: [0, 0, (plan.rootZ + plan.tipZ) / 2], ax: [c, 0, s], up: [0, 1, 0], len: 10, r: 0.75 });
    const comps = components(acc.positions, 0.3).comps;
    console.log(`       ${String(th).padStart(2)} deg: reaches radius ${f(10 * c, 2)} mm (outerR ${f(plan.outerR, 2)}) -> ${comps} component(s)${comps > 1 ? '   <- DETACHED' : ''}`);
  }
  console.log('\n     The escape length is outerR / cos(th), which RUNS AWAY as the angle');
  console.log('     steepens — and ruling 7 puts a control on that angle. Rooted in the');
  console.log('     WALL instead, the petiole only gets MORE embedded (wall / cos(th)):');
  const P6 = stemOf({ stemLength: 60, stemDiameter: 6 }).plan;
  for (const th of [0, 45, 75, 85]) { const c = Math.cos(th * Math.PI / 180);
    console.log(`       ${String(th).padStart(2)} deg: axis-rooted needs ${f(P6.outerR / c, 2).padStart(6)} mm to escape ; wall-rooted crosses ${f(P6.wallMm / c, 2).padStart(6)} mm of solid`); }
}

/* ============ §6  THE TOP NODE INSET ================================= */
if (want('6')) {
  console.log('\n=== §6  A FRACTION OF THE STEM CANNOT SAY WHETHER THE TOP LEAF CLEARS ===');
  console.log("    The flower's law puts the topmost node at 0.16 of stem length below the");
  console.log('    hub. A leaf of length Lf at angle th rises Lf*sin(th) above its own node.');
  console.log('    The inset scales with the STEM; the rise scales with the LEAF and its');
  console.log('    ANGLE — three different lengths, and no fraction of one holds the other two.\n');
  console.log('    stem  inset    Lf=40          Lf=52          Lf=70');
  console.log('    (mm)  (mm)   30deg  50deg   30deg  50deg   30deg  50deg');
  let foul = 0, total = 0;
  for (const S of [30, 50, 70, 90, 120]) {
    const inset = 0.16 * S, cells = [];
    for (const Lf of [40, 52, 70]) for (const th of [30, 50]) {
      const over = Lf * Math.sin(th * Math.PI / 180) - inset; total++; if (over > 0) foul++;
      cells.push(`${over > 0 ? '+' : ''}${f(over, 1)}`.padStart(6));
    }
    console.log(`    ${String(S).padStart(4)}  ${f(inset, 1).padStart(5)}  ${cells[0]} ${cells[1]}  ${cells[2]} ${cells[3]}  ${cells[4]} ${cells[5]}`);
  }
  console.log(`\n    positive = the leaf tip stands ABOVE the hub underside, i.e. INTO the head.`);
  console.log(`    ${foul} of ${total} sampled states foul the head. The inset a leaf needs is`);
  console.log('    derived from the LEAF: inset >= Lf*sin(th), clamped and told — which is');
  console.log("    ruling 9's own reason ('express it in MILLIMETRES'), as a measurement.");
}

/* ============ §7  THE CANTILEVER — REPORTED, NEVER SOLVED =========== */
if (want('7')) {
  console.log('\n=== §7  THE LEVER. A COUPON QUESTION, REPORTED AND NOT BLOCKING ===');
  console.log('    A leaf on a petiole is a cantilever, and this project has never printed');
  console.log('    anything — so slenderness here joins SLENDERNESS on the stamens and the');
  console.log('    style, verbatim: UNMEASURED — no coupon has been printed.\n');
  console.log('    The blade is ONE SHEET THICK (the petal\'s own rule), so its mass scales');
  console.log('    with L x W and the moment at the root scales with L^2 x W.\n');
  const sheet = G.SHEET_THICKNESS_MM, floor = Math.max(sheet, G.MIN_FEATURE_MM);
  console.log('      leaf LxW    petiole dia   L/d      blade area   sheet    moment arm x area');
  for (const [L, W] of [[30, 10], [52, 17], [80, 26], [120, 40]]) {
    for (const d of [1.8, 3.0]) {
      const area = 0.62 * L * W;                        /* a lanceolate blade fills ~62% of its box */
      console.log(`      ${String(L).padStart(3)} x ${String(W).padStart(2)} mm   ${f(d, 1)} mm       ${f(L / d, 1).padStart(5)}   ${f(area, 0).padStart(6)} mm2   ${f(floor, 2)} mm   ${f(area * L / 2, 0).padStart(7)} mm3`);
    }
  }
  console.log('\n    THE WORST LEVER a plausible control range reaches is the LONGEST leaf on');
  console.log('    the THINNEST petiole. At 120 mm on a 1.8 mm petiole that is L/d = 66.7,');
  console.log('    against the filament\'s and style\'s own slenderness figures which are');
  console.log('    themselves unmeasured. Nothing here is a limit, because there is no');
  console.log('    measurement to set one from — this is the number, and the coupon is the');
  console.log('    only thing that can turn it into a bound. CLAMP AND TELL, never refuse.');
}
