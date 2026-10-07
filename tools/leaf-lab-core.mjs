/* ===================================================================
   LEAF LAB — THE BROWSER-SAFE CORE. A SCRATCH PROTOTYPE. NOT SHIPPED.

   The leaf + stem discovery's prototype (read docs/bloom-leaf-stem-discovery.md
   first). It builds a carnation, a rose and a chrysanthemum leaf TWO WAYS:

     A  BLADE-TREE + FUSION. One blade primitive on one vein. A simple leaf is
        one blade; a compound leaf is blades on stalks off a rachis; a lobed
        leaf is the SAME tree with the child blades fused back toward the
        midrib by a fusion amount. The fused lamina between two lobes is a WEB
        panel parameterised exactly like the TUBE's ring (#323, #339):
        columns run along the midrib, rows run OUTWARD ALONG THE VEINS, and
        the web's free rim is cut into a U by the TUBE's own notch law.
     B  SEPARATE BUILDERS. One builder per leaf type behind a dropdown:
        LINEAR (one blade), PINNATE COMPOUND (rachis + leaflets), PINNATIFID
        (one CHEVRON lattice: the petal's width law in rows tilted forward).

   WHAT IS SHIPPED CODE AND WHAT IS NOT. Every blade, web and lattice panel is
   emitted through the SHIPPED `emitPanel` (the petal's edge bead, its
   thickness, its /plot grid capture), reached through an anchored in-memory
   patch of `bloom-geometry.js` that only APPENDS an export line — the TUBE
   prototype's route (#323). `bloom-geometry.js` itself is never written, and
   nothing shipped imports this file. The leaf surface map, the trees, the
   builders, the rods and the stem demo are this file's own and are NOT the
   shipped leaf (`buildLeafInto`), which has no bead and no grid capture.

   Pure: no `node:` import, so the page (tools/leaf-lab.html) and the Node
   tool (tools/shot-leaf-lab.mjs) build through the one copy. Where the
   patched source is imported from is the caller's: setLoader({ read, load }).
   =================================================================== */

/* ---------------- the patched copy of the shipped owner ---------------- */
/* NO ANCHORED REPLACEMENT: the patch only APPENDS `export { ... }` for two
   module-private names. Each is checked to be declared exactly once, so a
   shipped rename refuses here rather than exporting something else. */
const PATCH_NAMES = [
  ['emitPanel', /\nfunction emitPanel\(/g],
  ['NV', /\nconst NV = /g],
  ['tubeNotchDepth', /\nfunction tubeNotchDepth\(/g],
];
export function patchSource(src) {
  for (const [name, re] of PATCH_NAMES) {
    const n = (src.match(re) || []).length;
    if (n !== 1) throw new Error(`leaf-lab patch: '${name}' declared ${n} times in bloom-geometry.js (want exactly 1) — the shipped geometry moved; refusing`);
  }
  return `${src}\nexport { emitPanel as __leafLabEmitPanel, NV as __leafLabNV, tubeNotchDepth as __leafLabTubeNotchDepth };\n`;
}
let LOADER = null;
let G = null;
export function setLoader(l) { LOADER = l; G = null; }
export async function geometry() {
  if (G) return G;
  if (!LOADER) throw new Error('leaf-lab: no geometry loader (setLoader)');
  G = await LOADER.load(patchSource(await LOADER.read()));
  return G;
}

/* ---------------- small vector helpers ---------------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const D2R = Math.PI / 180;
const lerp = (a, b, f) => a + (b - a) * f;
const lerp2 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const GOLDEN_DEG = 180 * (3 - Math.sqrt(5));   // 137.5077...

/* ===================================================================
   THE LEAF SURFACE — ONE OWNER PER LEAF. Every panel of a leaf evaluates its
   planform points (x along the midrib from the base, y across, mm) through
   this one map, so two panels that overlap in the planform lie on the same
   mid-surface there and their union is one sheet rather than two sheets
   crossing. ARCH is constant spine curvature along x (positive droops the
   tip, the carnation's arching leaf); CUP is a lift along the arch's own
   normal, quadratic in the distance from the vein the lift is measured from
   (`lift` below). The normal is the cross product of the two partials in
   closed form:
     P = S(x) + y T + l N(x),  N'(x) = k D(x)
     n ∝ (1 + k l) N − (1 + k l) l_y T − l_x D
   =================================================================== */
export function leafMap(archDeg, archLenMm) {
  const k = archLenMm > 0 ? (archDeg * D2R) / archLenMm : 0;
  const T = [0, 1, 0];
  return {
    k,
    frame(x) {
      if (Math.abs(k) < 1e-12) return { S: [x, 0, 0], D: [1, 0, 0], N: [0, 0, 1] };
      const a = k * x, c = Math.cos(a), s = Math.sin(a);
      return { S: [s / k, 0, (c - 1) / k], D: [c, 0, -s], N: [s, 0, c] };
    },
    at(x, y, l, lx, ly) {
      const { S, D, N } = this.frame(x);
      const P = [S[0] + N[0] * l, y + N[1] * l, S[2] + N[2] * l];
      const g = 1 + k * l;
      const n = nrm([g * N[0] - lx * D[0], g * N[1] - g * ly * T[1] - lx * D[1], g * N[2] - lx * D[2]]);
      return { P, n };
    },
  };
}
/* THE LIFT, from a vein LINE (origin o, unit direction e in the planform):
   l = c d^2 / s, d the signed distance across the vein, s the blade's own
   half-span (so `cup` is dimensionless and its curvature 2c/s). A fused child
   reads its PARENT's lift so the union is one sheet; a free child (fusion 0,
   a leaflet on a stalk) cups about its own vein. */
export function liftOf(o, e, c, s) {
  const px = -e[1], py = e[0];
  return (x, y) => {
    const d = (x - o[0]) * px + (y - o[1]) * py;
    const l = (c * d * d) / s;
    const g = (2 * c * d) / s;
    return [l, g * px, g * py];
  };
}

/* ===================================================================
   THE OUTLINE LAWS — single-valued half-width along a blade's OWN u.
   `core` is the shipped petal CORE law (bloom-geometry.js widthProfile:
   u^a (1-u)^b normalised to 1 at its peak a/(a+b)) so a prototype blade is
   the shipped blade's outline family, not a third one. Teeth use the shipped
   `lobeCutProfile` law g(r) = r^a / (r^a + (1-r)^b) with a SKEW the shipped
   law does not have (see `toothCut`).
   =================================================================== */
export function coreLaw(a, b) {
  const uPk = a / (a + b);
  const pk = Math.pow(uPk, a) * Math.pow(1 - uPk, b);
  return (u) => (u <= 0 || u >= 1 ? 0 : (Math.pow(u, a) * Math.pow(1 - u, b)) / pk);
}
/* THE TOOTH LAW. At skew 0.5 this IS the shipped lobeCutProfile (r = 1 −
   |2ph − 1|) — the Node tool asserts the identity to the bit. Away from 0.5
   the notch moves inside the period, so the tooth LEANS: a small skew puts
   the long gentle flank on the base side and the steep one on the apex side,
   a SERRATE (forward-pointing) tooth. The shipped law is phase-symmetric
   (bloom-geometry.js lobeCutProfile, `const r = 1 - Math.abs(2 * ph - 1)`),
   so it draws dentate and crenate teeth and cannot draw a serrate one. */
export function toothCut(f, crest, notch, skew = 0.5) {
  const ph = f - Math.floor(f);
  /* AT 0.5 THE SHIPPED EXPRESSION, BY BRANCH: `2 ph` and `1 - (1 - 2 ph)` are
     the same number in real arithmetic and not always in floating point */
  const r = skew === 0.5 ? 1 - Math.abs(2 * ph - 1) : ph < skew ? ph / skew : (1 - ph) / (1 - skew);
  const P = Math.pow(r, crest), Q = Math.pow(1 - r, notch);
  return P / (P + Q);
}
/* A blade's half-width law in mm. `teeth` cut a relief into the margin over
   [from, to] of the blade's own u; the relief is guarded POINTWISE by the
   material left above the tip floor (the shipped lobe cut rejected a
   pointwise guard for a mid-flank tangent break — recorded, accepted here
   for a prototype). */
export const TIP_HALF_MM = 0.8;   // the shipped TIP_HALF_MM (bloom-geometry.js), restated: the prototype floors where the shipped leaf floors
export function bladeHalf(b) {
  const core = coreLaw(b.baseTaper, b.tipTaper);
  const W2 = b.width / 2;
  const base = b.baseHalf || 0;   // a floor at the base: a broad (truncate / fused) base
  const baseTo = b.baseHalfTo || 0.3;
  return (u) => {
    let h = W2 * core(u);
    if (base > 0) h = Math.max(h, base * (1 - smooth(u / baseTo)));
    const t = b.teeth;
    if (t && t.count > 0 && t.depth > 0 && u > t.from && u < t.to) {
      const f = ((u - t.from) / (t.to - t.from)) * t.count;
      const R = Math.min(t.depth * Math.max(0, W2 - TIP_HALF_MM), Math.max(0, h - TIP_HALF_MM));
      h -= R * toothCut(f, t.crest, t.notch, t.skew);
    }
    return Math.max(h, TIP_HALF_MM);
  };
}

/* ===================================================================
   PANELS. A panel is a (u, v) lattice: rows along u, each row a single span
   v in [-1, 1]. `plan(u, v)` is the planform point, `lift` the surface
   owner's lift. emitPanel offsets the two skins along the surface normal and
   closes the rim with the shipped bead; the BASE end (row 0) is treated as
   buried (flat wall, the bead ramping in over RIM_TAPER_MM) and the LAST row
   as the exposed tip — that is emitPanel's own contract, built for a petal
   foot, and every panel here is oriented to suit it (finding: a free blade
   base, the rose leaflet's, gets the buried treatment too).
   =================================================================== */
function orientSign(plan, us) {
  /* (∂u × ∂v) in the planform must point +z (the surface normal's side) so
     emitPanel's top skin faces +n. Measured at three stations; refused if the
     lattice disagrees with itself (a FOLDED lattice, which is the chevron's
     failure mode, caught here before it reaches a mesh). */
  let pos = 0, neg = 0;
  for (const u of us) {
    const e = 1e-4;
    const pu = sub([...plan(u + e, 0), 0], [...plan(u - e, 0), 0]);
    const pv = sub([...plan(u, e), 0], [...plan(u, -e), 0]);
    const z = pu[0] * pv[1] - pu[1] * pv[0];
    if (z > 0) pos++; else if (z < 0) neg++;
  }
  return pos >= neg ? 1 : -1;
}
/* THE LATTICE JACOBIAN over the whole panel, planform: the smallest and
   largest signed area of a lattice cell relative to the panel's orientation.
   A non-positive minimum is a fold — the lattice crosses itself and the mesh
   would be inside-out there. Every panel reports it; the Node tool fails a
   build on a fold. */
function latticeJacobian(plan, us, sgn, nv = 10) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i + 1 < us.length; i++) {
    for (let j = 0; j + 1 < nv; j++) {
      const v0 = -1 + (2 * j) / (nv - 1), v1 = -1 + (2 * (j + 1)) / (nv - 1);
      const A = plan(us[i], v0 * sgn), B = plan(us[i + 1], v0 * sgn), C = plan(us[i + 1], v1 * sgn), D = plan(us[i], v1 * sgn);
      const area = 0.5 * ((A[0] * B[1] - B[0] * A[1]) + (B[0] * C[1] - C[0] * B[1]) + (C[0] * D[1] - D[0] * C[1]) + (D[0] * A[1] - A[0] * D[1]));
      if (area < min) min = area;
      if (area > max) max = area;
    }
  }
  return { min, max };
}
/* Build a panel record. Nothing is emitted until `emitLeaf`. */
function panel(label, kind, plan, liftFn, us, extra = {}) {
  const sgn = orientSign(plan, [us[1], us[(us.length / 2) | 0], us[us.length - 2]]);
  const pl = (u, v) => plan(u, v * sgn);
  return { label, kind, plan: pl, lift: liftFn, us, jac: latticeJacobian(plan, us, sgn), flipped: sgn < 0, ...extra };
}

/* THE LEAF'S LENGTH — the farthest planform x any panel or rod reaches. ONE
   owner, read by both approaches: the arch is spread over this length, so a
   builder that measured "the leaf" differently would bend the same blades
   differently (measured: the first cut had A arch over the rachis, 54 mm, and
   B over the whole leaf, 84 mm, and the rose came out 430,549 floats apart). */
export function leafExtentMm(panels, rods) {
  let m = 0;
  for (const p of panels) for (const u of p.us) for (const v of [-1, 0, 1]) m = Math.max(m, p.plan(u, v)[0]);
  for (const r of rods) for (const q of r.pts2) m = Math.max(m, q[0]);
  return m;
}

/* ---------------- rods: closed tubes, the shipped petiole's shape ---------------- */
/* A rod along a planform polyline, lifted onto the leaf surface (lift 0: the
   rod's axis is ON the arch), radius r per point (the area rule tapers a
   rachis as its children leave). 12 sides, the ring offset a half step (the
   shipped petiole's own reasoning: no vertex on the binormal), end-capped. */
export const ROD_SIDES = 12;
function rod(label, pts2, radii, extendStartMm = 0, extendEndMm = 0) {
  return { label, kind: 'rod', pts2, radii, extendStartMm, extendEndMm };
}

/* ===================================================================
   A — THE BLADE TREE
   A node: { vein: { origin [x, y], angleDeg, lengthMm }, stalkMm, blade |
   null, fusion, children }. The ROOT's vein is the midrib (origin [0, 0],
   angle 0). A child's origin is a station on its parent's vein. A child with
   `fusion` > 0 is lamina joined to its parent's lamina by a WEB between it
   and its neighbour on the same side; with 0 it stands free on its stalk.
   =================================================================== */
export const VENATION = Object.freeze(['PINNATE', 'PALMATE']);

/* Every A parameter has a value, so a preset that does not use a branch (the
   carnation has no children) still hands the page a slider with a number on
   it. Merged UNDER every preset: a key the preset sets is the preset's. */
export const A_DEFAULTS = Object.freeze({
  stalkR: 0.6, rachisR: 0.6, embedStartMm: 0, lengthMm: 40, petioleMm: 10, rootLamina: true, rootWidth: 2.4, rootBaseTaper: 0.2, rootTipTaper: 0.2,
  rootBaseHalf: 0, rootTeeth: null, pairs: 0, firstMm: 4, lastMm: 20, angleDeg: 45, angleBaseDeg: 55, childLenMm: 15, childLenBase: 0.9, childWidth: 8,
  childBaseTaper: 0.7, childTipTaper: 0.9, childBaseHalf: 0, childStalkMm: 0, childTeeth: null, terminal: false, terminalAtMm: 25, terminalLenMm: 15,
  terminalWidth: 10, terminalStalkMm: 0, terminalTeeth: null, fusion: 0, sinusBlend: 1, venation: 'PINNATE', archDeg: 0, cup: 0.2, stipules: null,
});
/* The A parameter set (the draft tree in the doc §5 is this, named). */
export function treeFromParams(p0) {
  const p = { ...A_DEFAULTS, ...p0 };
  const L = p.lengthMm;
  const root = {
    label: 'midrib',
    vein: { origin: [0, 0], angleDeg: 0, lengthMm: L },
    stalkMm: p.petioleMm,
    lamina: p.rootLamina,
    blade: p.rootLamina ? { width: p.rootWidth, baseTaper: p.rootBaseTaper, tipTaper: p.rootTipTaper, baseHalf: p.rootBaseHalf || 0, teeth: p.rootTeeth || null } : null,
    rodRadius: p.rachisR,
    children: [],
  };
  const kids = [];
  const nPairs = p.pairs | 0;
  for (let k = 0; k < nPairs; k++) {
    const f = nPairs > 1 ? k / (nPairs - 1) : 0;      // 0 = basal pair, 1 = apical pair
    const station = p.venation === 'PALMATE' ? p.firstMm : lerp(p.firstMm, p.lastMm, f);
    const ang = p.venation === 'PALMATE'
      ? lerp(p.angleBaseDeg, p.angleDeg, nPairs > 1 ? f : 1)
      : lerp(p.angleBaseDeg, p.angleDeg, f);
    const Lk = p.childLenMm * lerp(p.childLenBase, 1, f);
    for (const side of [1, -1]) {
      kids.push({
        label: `${side > 0 ? 'L' : 'R'}${k + 1}`, side, order: k,
        vein: { origin: [station, 0], angleDeg: side * ang, lengthMm: Lk },
        stalkMm: p.childStalkMm || 0,
        blade: { width: p.childWidth * lerp(p.childLenBase, 1, f), baseTaper: p.childBaseTaper, tipTaper: p.childTipTaper, baseHalf: p.childBaseHalf || 0, teeth: p.childTeeth || null },
        fusion: p.fusion, children: [],
      });
    }
  }
  if (p.terminal) {
    const station = p.venation === 'PALMATE' ? p.firstMm : p.terminalAtMm;
    kids.push({
      label: 'T', side: 0, order: nPairs,
      vein: { origin: [station, 0], angleDeg: 0, lengthMm: p.terminalLenMm },
      stalkMm: p.terminalStalkMm || 0,
      blade: { width: p.terminalWidth, baseTaper: p.childBaseTaper, tipTaper: p.childTipTaper, baseHalf: p.childBaseHalf || 0, teeth: p.terminalTeeth || p.childTeeth || null },
      fusion: p.fusion, children: [],
    });
  }
  if (p.stipules) {
    for (const side of [1, -1]) {
      kids.push({
        label: `S${side > 0 ? 'L' : 'R'}`, side, order: -1, stipule: true,
        /* a stipule sits at the PETIOLE's base, so its station is measured
           back from the blade's base by the petiole */
        vein: { origin: [p.stipules.atMm - p.petioleMm, 0], angleDeg: side * p.stipules.angleDeg, lengthMm: p.stipules.lengthMm },
        stalkMm: 0,
        blade: { width: p.stipules.width, baseTaper: 0.5, tipTaper: 0.9, teeth: null },
        fusion: 0, children: [],
      });
    }
  }
  root.children = kids;
  return { root, params: p };
}

/* WHERE A CHILD'S BLADE SITS: its vein from its origin, the blade starting
   after its stalk. Returns planform helpers in the child's own frame. */
function veinFrame(v) {
  const a = v.angleDeg * D2R;
  const e = [Math.cos(a), Math.sin(a)], q = [-Math.sin(a), Math.cos(a)];
  return { o: v.origin, e, q, L: v.lengthMm };
}
const at2 = (F, s, w) => [F.o[0] + F.e[0] * s + F.q[0] * w, F.o[1] + F.e[1] * s + F.q[1] * w];

/* A blade panel on a vein: rows uniform in its own u over [start, start+len]
   along the vein, the span the half-width law. */
function bladePanel(label, F, startMm, lenMm, half, liftFn, rows) {
  const us = Array.from({ length: rows + 1 }, (_, i) => i / rows);
  const plan = (u, v) => at2(F, startMm + u * lenMm, v * half(u));
  return panel(label, 'blade', plan, liftFn, us, { half, lenMm, startMm, frame: F });
}
const rowsFor = (lenMm, teeth) => Math.max(40, Math.ceil(lenMm / 0.6), teeth && teeth.count ? teeth.count * 12 + 20 : 0);

/* ---------------- THE NOTCH: the TUBE's law, generalised to two leans ---------------- */
/* tubeNotchDepth (bloom-geometry.js) restated as a pure function of the
   distance x from the sinus centre along the rim, for ONE sinus of half
   width W, radius r and lean beta. Copied, not imported: the shipped one is
   module-private and closes over the ring's azimuth (`tWrapPi(phi - sn.c) *
   sn.rho`); what transfers is the profile, and this is that profile term for
   term. A closed sinus (W <= 0) is inert, as in the TUBE. */
export function notchDepthAt(x, W, r, beta) {
  if (!(W > 0) || !(r > 0)) return 0;
  const ax = Math.abs(x);
  if (ax >= W) return 0;
  const cx = W - r * Math.cos(beta), cy = r * Math.sin(beta);
  return ax <= cx ? r - cy : Math.sqrt(Math.max(0, r * r - (ax - cx) ** 2)) - cy;
}

/* A — build the panels and rods of one leaf from its tree. */
export function buildTreeLeaf(tree, opts = {}) {
  const p = tree.params;
  const root = tree.root;
  const rows = opts.rowsScale ? (n) => Math.max(8, Math.round(n * opts.rowsScale)) : (n) => n;
  const panels = [], rods = [], notes = [];
  const Ltot = p.petioleMm + root.vein.lengthMm;
  /* THE ROOT LIFT: cup about the midrib, measured against the leaf's own
     half-span so a fused leaf cups as one sheet. */
  const span = Math.max(p.rootWidth / 2, ...root.children.filter((c) => !c.stipule).map((c) => {
    const F = veinFrame(c.vein); return Math.abs(at2(F, c.vein.lengthMm, 0)[1]) + c.blade.width / 2;
  }), 1);
  const rootLift = liftOf([0, 0], [1, 0], p.cup, span);
  /* x is measured from the LEAF's base (the petiole's root); the tree's
     stations are from the BLADE's base, so everything shifts by the petiole. */
  const X0 = p.petioleMm;
  const shift = (F) => ({ ...F, o: [F.o[0] + X0, F.o[1]] });
  /* THE ROOT: a petiole rod to the blade, then either a lamina (simple,
     lobed) or a bare rachis rod (compound). */
  const rootF = shift(veinFrame(root.vein));
  if (p.petioleMm > 0 || !root.lamina) {
    const endMm = root.lamina ? 0 : root.vein.lengthMm;
    /* the rachis tapers by the AREA RULE as children leave it (r² = Σ r_child²) */
    const stations = [0, X0];
    const leafKids = root.children.filter((c) => !c.stipule);
    if (!root.lamina) for (const c of leafKids) stations.push(X0 + c.vein.origin[0]);
    if (!root.lamina) stations.push(X0 + endMm);
    const uniq = [...new Set(stations.map((s) => +s.toFixed(6)))].sort((a, b) => a - b);
    const rLeaf = p.stalkR;
    const radii = uniq.map((s) => {
      const beyond = leafKids.filter((c) => X0 + c.vein.origin[0] >= s - 1e-6).length;
      return root.lamina ? p.rachisR : Math.max(rLeaf, Math.sqrt(Math.max(1, beyond)) * rLeaf);
    });
    rods.push(rod(root.lamina ? 'petiole' : 'petiole+rachis', uniq.map((s) => [s, 0]), radii, p.embedStartMm || 0, root.lamina ? 2.0 : 0.6));
  }
  if (root.lamina) {
    const half = bladeHalf(root.blade);
    panels.push(bladePanel('midrib-blade', rootF, 0, root.vein.lengthMm, half, rootLift, rows(rowsFor(root.vein.lengthMm, root.blade.teeth))));
  }
  /* THE CHILDREN */
  const placed = [];
  for (const c of root.children) {
    const F = shift(veinFrame(c.vein));
    const fused = !c.stipule && c.fusion > 0 && root.lamina;
    const half = bladeHalf(c.blade);
    const liftC = fused ? rootLift : liftOf(at2(F, c.stalkMm, 0), F.e, p.cup, c.blade.width / 2);
    if (c.stalkMm > 0) {
      rods.push(rod(`stalk ${c.label}`, [F.o, at2(F, c.stalkMm, 0)], [p.stalkR, p.stalkR], 0.4, 1.6));
    }
    const pn = bladePanel(c.stipule ? `stipule ${c.label}` : `blade ${c.label}`, F, c.stalkMm, c.vein.lengthMm, half, liftC, rows(rowsFor(c.vein.lengthMm, c.blade.teeth)));
    pn.child = c;
    panels.push(pn);
    if (!c.stipule) placed.push({ c, F, half, pn, fused });
  }
  /* THE WEBS — fusion. Between consecutive fused children on one side
     (ordered along the leaf; the terminal child closes both sides), a panel
     whose COLUMNS run from one vein to the next and whose ROWS run outward
     along the interpolated vein direction to the fusion reach, the free rim
     cut by the TUBE's notch. */
  const webs = [];
  if (root.lamina && p.fusion > 0) {
    for (const side of [1, -1]) {
      const seq = placed.filter((x) => x.fused && (x.c.side === side || x.c.side === 0)).sort((a, b) => a.c.order - b.c.order);
      for (let i = 0; i + 1 < seq.length; i++) {
        const w = webPanel(seq[i], seq[i + 1], side, p, rootLift, rows, opts);
        if (w.panel) { panels.push(w.panel); webs.push(w.record); } else notes.push(w.note);
      }
    }
  }
  const ext = leafExtentMm(panels, rods);
  void Ltot;
  return { panels, rods, webs, notes, map: leafMap(p.archDeg, ext), lengthMm: ext, approach: 'A' };
}

/* THE WEB between child a and child b (b further toward the apex). */
function webPanel(A, B, side, p, rootLift, rowsF, opts = {}) {
  const f = p.fusion;
  const Fa = A.F, Fb = B.F;
  const ra = A.c.stalkMm + f * A.c.vein.lengthMm, rb = B.c.stalkMm + f * B.c.vein.lengthMm;
  /* the meridian at column kappa: origin along the midrib, direction the
     normalised interpolation of the two veins (the TUBE's meridian), reach
     the interpolated fusion reach. PALMATE: both origins are one point. */
  const ang = (kap) => {
    const aa = Math.atan2(Fa.e[1], Fa.e[0]), bb = Math.atan2(Fb.e[1], Fb.e[0]);
    return lerp(aa, bb, kap);
  };
  const orig = (kap) => lerp2(Fa.o, Fb.o, kap);
  const dir = (kap) => { const a = ang(kap); return [Math.cos(a), Math.sin(a)]; };
  const reach0 = (kap) => lerp(ra, rb, kap);
  const rim0 = (kap) => { const o = orig(kap), d = dir(kap), r = reach0(kap); return [o[0] + d[0] * r, o[1] + d[1] * r]; };
  /* inside a child's blade? (its own frame: s along the vein from its
     origin, w across) */
  const inside = (X, P) => {
    const dx = P[0] - X.F.o[0], dy = P[1] - X.F.o[1];
    const s = dx * X.F.e[0] + dy * X.F.e[1], w = dx * X.F.q[0] + dy * X.F.q[1];
    const u = (s - X.c.stalkMm) / X.c.vein.lengthMm;
    return u >= 0 && u <= 1 && Math.abs(w) <= X.half(u);
  };
  /* the open sinus along the UNNOTCHED rim: where the rim leaves blade a and
     enters blade b, by bisection on kappa */
  const N = 400;
  let ka = 0, kb = 1;
  for (let i = 0; i <= N; i++) { if (inside(A, rim0(i / N))) ka = i / N; else break; }
  for (let i = N; i >= 0; i--) { if (inside(B, rim0(i / N))) kb = i / N; else break; }
  /* arc length along the rim */
  const sOf = (k0, k1) => { let s = 0, prev = rim0(k0); for (let i = 1; i <= 64; i++) { const q = rim0(k0 + ((k1 - k0) * i) / 64); s += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; } return s; };
  const open = kb > ka;
  const W = open ? sOf(ka, kb) / 2 : 0;
  /* THE LEAN, in the web's OWN oblique frame (rim tangent, meridian). The
     margin's direction decomposed onto (rim tangent, meridian), lean =
     atan(tangent part / meridian part), signed positive where the margin
     diverges from the sinus centre going outward — the TUBE's convention.
     Tangency is affine-invariant, so a U tangent to the margins in this
     frame is tangent to them in the planform. */
  const leanAt = (X, kap, sgnAway) => {
    const d = dir(kap), o = orig(kap);
    const P = rim0(kap);
    const dx = P[0] - X.F.o[0], dy = P[1] - X.F.o[1];
    const s = dx * X.F.e[0] + dy * X.F.e[1];
    const u = clamp((s - X.c.stalkMm) / X.c.vein.lengthMm, 1e-4, 1 - 1e-4);
    const wSide = (dx * X.F.q[0] + dy * X.F.q[1]) >= 0 ? 1 : -1;
    const du = 1e-4;
    const m0 = at2(X.F, X.c.stalkMm + u * X.c.vein.lengthMm, wSide * X.half(u));
    const m1 = at2(X.F, X.c.stalkMm + (u + du) * X.c.vein.lengthMm, wSide * X.half(u + du));
    const dm = [m1[0] - m0[0], m1[1] - m0[1]];
    const r0 = rim0(kap - 1e-4), r1 = rim0(kap + 1e-4);
    const tg = [r1[0] - r0[0], r1[1] - r0[1]];
    /* solve dm = a tg^ + b d  (oblique components) */
    const tl = Math.hypot(tg[0], tg[1]) || 1, th = [tg[0] / tl, tg[1] / tl];
    const det = th[0] * d[1] - th[1] * d[0];
    const a = (dm[0] * d[1] - dm[1] * d[0]) / det, b = (th[0] * dm[1] - th[1] * dm[0]) / det;
    void o;
    return Math.atan2(sgnAway * a, Math.abs(b));
  };
  /* "closed" means closed ANYWHERE beyond the rim: the sinus's centre
     meridian re-entering a blade further out (a tooth reaching across) closes
     it exactly as an overlap at the rim does — measured on the exaggerated
     mum, where L4-T read OPEN at the rim and still enclosed 1.40 mm^2. */
  let closedBeyond = false;
  if (open) {
    const kc = (ka + kb) / 2, o = orig(kc), d = dir(kc);
    const Rmax = Math.max(A.c.stalkMm + A.c.vein.lengthMm, B.c.stalkMm + B.c.vein.lengthMm) * 1.2;
    let left = false;
    for (let r = reach0(kc); r <= Rmax; r += 0.05) {
      const P = [o[0] + d[0] * r, o[1] + d[1] * r];
      const isIn = inside(A, P) || inside(B, P);
      if (!isIn) left = true; else if (left) { closedBeyond = true; break; }
    }
  }
  let beta = 0, ba = 0, bbv = 0;
  if (open) {
    ba = leanAt(A, ka, -1);     // a's margin: away from the centre is toward kappa < ka
    bbv = leanAt(B, kb, 1);
    beta = clamp((ba + bbv) / 2, -60 * D2R, 60 * D2R);
  }
  const r = open ? (p.sinusBlend * W) / Math.cos(beta) : 0;
  const sC = open ? sOf(0, ka) + W : 0;
  const depthAt = (kap) => {
    if (!open || (closedBeyond && !opts.noPocketRule)) return 0;
    const x = sOf(0, kap) - sC;
    return notchDepthAt(x, W, Math.min(r, W / Math.cos(beta)), beta);
  };
  /* THE WEB SPANS VEIN TO VEIN (kappa 0 to 1), so near the midrib — where
     narrow-based lobes have already parted — it covers everything between the
     two veins. The first cut spanned only the open sinus plus a pad and left
     PINHOLES through the leaf at every lobe junction near the midrib (the
     print map showed them; one-piece connectivity cannot see a hole, which is
     why C7 exists). The ten columns (NV, the grid writer's fixed count — a
     finer U would need `nv`, which the grid capture cannot carry) are
     concentrated across the sinus by a knot map: one interval from each vein
     to the sinus, seven across it. */
  const pad = 0.02;
  const k0 = 0, k1 = 1;
  const sa = Math.max(0.05, (open ? ka : 0.5) - pad), sb = Math.min(0.95, (open ? kb : 0.5) + pad);
  /* A CLOSED SINUS STILL GETS ITS WEB, WITHOUT A NOTCH. The first cut built
     nothing there (the TUBE's "inert"), and between two narrow-based lobes
     that overlap further out that left an ENCLOSED pinhole near the midrib —
     C7 found four on the exaggerated mum. Fusion asks for lamina between the
     veins whether or not the rim is open; only the notch is inert. */
  const minReach = (p.rootWidth || 1) / 2 + 0.6;
  const kapOf = (v) => {
    const c = ((v + 1) / 2) * 9;             // 0..9 column units
    if (c <= 1) return lerp(k0, sa, c);
    if (c >= 8) return lerp(sb, k1, c - 8);
    return lerp(sa, sb, (c - 1) / 7);
  };
  /* depth table (arc length is not cheap) */
  const TAB = 129, tab = [];
  for (let i = 0; i < TAB; i++) { const kap = lerp(k0, k1, i / (TAB - 1)); tab.push(Math.min(depthAt(kap), Math.max(0, reach0(kap) - minReach))); }
  const depthT = (kap) => { const t = ((kap - k0) / (k1 - k0)) * (TAB - 1); const i = clamp(Math.floor(t), 0, TAB - 2); return lerp(tab[i], tab[i + 1], t - i); };
  let clampedDepth = 0;
  for (let i = 0; i < TAB; i++) { const kap = lerp(k0, k1, i / (TAB - 1)); if (depthAt(kap) > tab[i] + 1e-9) clampedDepth++; }
  /* A CLOSED SINUS CAN ENCLOSE A POCKET. Two blades that overlap FURTHER OUT
     than the fusion rim leave a region between the rim and their crossing
     that belongs to no panel — a hole through the leaf (C7 measured 1.40 mm^2
     on the exaggerated mum with the rim at the fusion reach). The rule,
     derived rather than tuned: on a closed sinus each column's web runs out
     along its meridian until the blades take over FOR GOOD — the last
     outside-to-inside transition — plus a 0.3 mm overlap. An open sinus has
     no such transition beyond the rim and keeps the fusion reach. */
  const cover = new Float64Array(TAB);
  if ((!open || closedBeyond) && !opts.noPocketRule) {
    const Rmax = Math.max(A.c.stalkMm + A.c.vein.lengthMm, B.c.stalkMm + B.c.vein.lengthMm) * 1.2;
    for (let i = 0; i < TAB; i++) {
      const kap = lerp(k0, k1, i / (TAB - 1)), o = orig(kap), d = dir(kap);
      let last = 0, wasIn = true;
      for (let r = 0.05; r <= Rmax; r += 0.05) {
        const P = [o[0] + d[0] * r, o[1] + d[1] * r];
        const isIn = inside(A, P) || inside(B, P) || r <= reach0(kap);
        if (isIn && !wasIn) last = r;
        wasIn = isIn;
      }
      cover[i] = last > 0 ? last + 0.3 : 0;
    }
  }
  const coverT = (kap) => { const t = ((kap - k0) / (k1 - k0)) * (TAB - 1); const i = clamp(Math.floor(t), 0, TAB - 2); return lerp(cover[i], cover[i + 1], t - i); };
  const reach = (kap) => Math.max(reach0(kap) - depthT(kap), coverT(kap));
  /* PALMATE: every vein leaves ONE point, so the web's row 0 would be a single
     point (a degenerate base). It starts on a small arc instead, buried in the
     midrib blade's base — the TUBE's hub, in the plane. */
  const r0 = p.venation === 'PALMATE' ? (p.rootWidth || 1) / 2 + 0.6 : 0;
  const plan = (u, v) => { const kap = kapOf(v), o = orig(kap), d = dir(kap), rr = lerp(r0, reach(kap), u); return [o[0] + d[0] * rr, o[1] + d[1] * rr]; };
  const nr = rowsF(Math.max(24, Math.ceil(Math.max(ra, rb) / 0.5)));
  const us = Array.from({ length: nr + 1 }, (_, i) => i / nr);
  const pn = panel(`web ${A.c.label}-${B.c.label}`, 'web', plan, rootLift, us);
  return {
    panel: pn,
    record: { label: pn.label, side, open, closedBeyond, pocketCovered: cover.some((c) => c > 0), W, beta: beta * 180 / Math.PI, betaA: ba * 180 / Math.PI, betaB: bbv * 180 / Math.PI, r, depthMm: notchDepthAt(0, W, r, beta), clampedColumns: clampedDepth, ka, kb },
  };
}

/* ===================================================================
   B — SEPARATE BUILDERS, one per leaf type.
   =================================================================== */
export const B_TYPES = Object.freeze(['LINEAR', 'PINNATE_COMPOUND', 'PINNATIFID']);
export function buildTypedLeaf(type, q) {
  if (type === 'LINEAR') return bLinear(q);
  if (type === 'PINNATE_COMPOUND') return bCompound(q);
  if (type === 'PINNATIFID') return bChevron(q);
  throw new Error(`leaf-lab: no B builder '${type}'`);
}
/* LINEAR — one blade on the midrib: the petal's width law, sessile or on a
   petiole. */
function bLinear(q) {
  const Ltot = q.petioleMm + q.lengthMm;
  const F = { o: [q.petioleMm, 0], e: [1, 0], q: [0, 1], L: q.lengthMm };
  const half = bladeHalf({ width: q.width, baseTaper: q.baseTaper, tipTaper: q.tipTaper, baseHalf: q.baseHalf || 0, baseHalfTo: q.baseHalfTo, teeth: q.teeth || null });
  const lift = liftOf([0, 0], [1, 0], q.cup, q.width / 2);
  const panels = [bladePanel('blade', F, 0, q.lengthMm, half, lift, rowsFor(q.lengthMm, q.teeth))];
  const rods = q.petioleMm > 0 ? [rod('petiole', [[0, 0], [q.petioleMm, 0]], [q.stalkR, q.stalkR], q.embedStartMm || 0, 2)] : [];
  const ext = leafExtentMm(panels, rods);
  void Ltot;
  return { panels, rods, webs: [], notes: [], map: leafMap(q.archDeg, ext), lengthMm: ext, approach: 'B', type: 'LINEAR' };
}
/* PINNATE COMPOUND — a rachis with leaflet pairs and a terminal leaflet,
   each leaflet the LINEAR builder's blade on its own short stalk, stipules
   at the petiole base. Its own placement code, written independently of A's
   tree: the Node tool compares the two. */
function bCompound(q) {
  const X0 = q.petioleMm;
  const panels = [], rods = [];
  const rachisEnd = X0 + q.rachisMm;
  const st = [];
  for (let k = 0; k < q.pairs; k++) st.push(X0 + (q.pairs > 1 ? q.firstMm + ((q.lastMm - q.firstMm) * k) / (q.pairs - 1) : q.firstMm));
  /* the rachis by the area rule, from the tip back */
  const nLeaf = 2 * q.pairs + 1;
  const pts = [[0, 0], [X0, 0], ...st.map((s) => [s, 0]), [rachisEnd, 0]];
  const rr = pts.map(([s]) => { const beyond = 1 + 2 * st.filter((x) => x >= s - 1e-6).length; return Math.max(q.stalkR, Math.sqrt(beyond) * q.stalkR); });
  void nLeaf;
  rods.push(rod('petiole+rachis', pts, rr, q.embedStartMm || 0, 0.6));
  const leaflet = (label, o, angDeg, Lmm, Wmm, stalk) => {
    const a = angDeg * D2R; const e = [Math.cos(a), Math.sin(a)]; const qq = [-e[1], e[0]];
    const F = { o, e, q: qq, L: Lmm };
    if (stalk > 0) rods.push(rod(`stalk ${label}`, [o, [o[0] + e[0] * stalk, o[1] + e[1] * stalk]], [q.stalkR, q.stalkR], 0.4, 1.6));
    const half = bladeHalf({ width: Wmm, baseTaper: q.leafletBaseTaper, tipTaper: q.leafletTipTaper, teeth: q.teeth || null });
    const base = [o[0] + e[0] * stalk, o[1] + e[1] * stalk];
    panels.push(bladePanel(`leaflet ${label}`, F, stalk, Lmm, half, liftOf(base, e, q.cup, Wmm / 2), rowsFor(Lmm, q.teeth)));
  };
  st.forEach((s, k) => {
    const g = q.pairs > 1 ? k / (q.pairs - 1) : 1;
    const Lm = q.leafletLenMm * lerp(q.basalScale, 1, g), Wm = q.leafletWidth * lerp(q.basalScale, 1, g);
    leaflet(`L${k + 1}`, [s, 0], q.leafletAngleDeg, Lm, Wm, q.lateralStalkMm);
    leaflet(`R${k + 1}`, [s, 0], -q.leafletAngleDeg, Lm, Wm, q.lateralStalkMm);
  });
  leaflet('T', [rachisEnd, 0], 0, q.terminalLenMm, q.terminalWidth, q.terminalStalkMm);
  if (q.stipules) {
    for (const sd of [1, -1]) {
      const a = sd * q.stipules.angleDeg * D2R; const e = [Math.cos(a), Math.sin(a)];
      const F = { o: [q.stipules.atMm, 0], e, q: [-e[1], e[0]], L: q.stipules.lengthMm };
      panels.push(bladePanel(`stipule ${sd > 0 ? 'SL' : 'SR'}`, F, 0, q.stipules.lengthMm, bladeHalf({ width: q.stipules.width, baseTaper: 0.5, tipTaper: 0.9 }), liftOf(F.o, e, q.cup, q.stipules.width / 2), 40));
    }
  }
  const Ltot = rachisEnd + q.terminalStalkMm + q.terminalLenMm;
  const ext = leafExtentMm(panels, rods);
  void Ltot;
  return { panels, rods, webs: [], notes: [], map: leafMap(q.archDeg, ext), lengthMm: ext, approach: 'B', type: 'PINNATE_COMPOUND' };
}
/* PINNATIFID — ONE CHEVRON LATTICE. The petal's width law, with every row
   TILTED FORWARD by tau(u) from the perpendicular: row u leaves the midrib
   at x(u) and runs outward-and-forward, mirrored across the midrib (each
   row is a V). Forward lobes are then single-valued along the rows — the
   lobes are bumps in h(u) and the sinuses dips — so the whole leaf is ONE
   panel, ONE bead, ONE grid. tau eases to 0 toward the apex so the terminal
   lobe ends on the midrib, and the lattice Jacobian is checked because the
   lattice CAN fold, two ways. (1) In the continuum the planform Jacobian is
   h (L cos tau + v h tau') — the h' terms cancel exactly — so a tilt that
   eases faster than L cos tau / (v h) folds the outer cells. (2) emitPanel's
   NV = 10 columns are NINE intervals, so no column lies on v = 0: the
   innermost cell spans v in [-1/9, 1/9], ACROSS the V's apex, and folds
   where h falls faster than (NV - 1) / sin tau per mm of midrib — steep
   teeth or a steep sinus flank. (2) is the one the presets come nearest. */
function bChevron(q) {
  const L = q.lengthMm, X0 = q.petioleMm;
  const tauMax = q.lobeAngleDeg * D2R;
  /* tau(u): full tilt over the lobed stretch, easing to 0 over the terminal */
  const tau = (u) => tauMax * (1 - smooth((u - q.tiltEaseFrom) / Math.max(1e-6, 1 - q.tiltEaseFrom)));
  /* h(u) along the tilted rows: an envelope with q.lobes bumps, each lobe a
     raised-cosine, the sinus depth a fraction of the envelope; teeth on the
     lobes as a second, finer modulation (the shipped tooth law). */
  const env = coreLaw(q.baseTaper, q.tipTaper);
  const W2 = q.width / 2;
  const lobeAt = (u) => {
    if (u < q.lobeFrom || u > q.lobeTo) return 1;
    const ph = ((u - q.lobeFrom) / (q.lobeTo - q.lobeFrom)) * q.lobes;
    const fr = ph - Math.floor(ph);
    const crest = 0.5 * (1 + Math.cos(2 * Math.PI * fr));   // 1 at a lobe's crest (the stretch's two ends, continuous with the unlobed outline), 0 at a sinus
    return 1 - q.sinusDepth * (1 - Math.pow(crest, q.lobeShape));
  };
  const tooth = (u) => {
    if (!q.teeth || !q.teeth.count) return 0;
    if (u < q.lobeFrom || u > 1) return 0;
    const f = ((u - q.lobeFrom) / (1 - q.lobeFrom)) * q.teeth.count;
    return q.teeth.depth * toothCut(f, q.teeth.crest, q.teeth.notch, q.teeth.skew);
  };
  const half = (u) => Math.max(TIP_HALF_MM, W2 * env(u) * lobeAt(u) * (1 - tooth(u)));
  const plan = (u, v) => {
    const x = X0 + u * L;
    const t = tau(u), h = half(u) * Math.abs(v), sg = v < 0 ? -1 : 1;
    return [x + h * Math.sin(t), sg * h * Math.cos(t)];
  };
  const rows = Math.max(120, (q.lobes + (q.teeth ? q.teeth.count : 0)) * 14);
  const us = Array.from({ length: rows + 1 }, (_, i) => i / rows);
  const lift = liftOf([0, 0], [1, 0], q.cup, W2);
  const pn = panel('chevron', 'chevron', plan, lift, us, { half, tau, lenMm: L });
  const rods = q.petioleMm > 0 ? [rod('petiole', [[0, 0], [X0, 0]], [q.stalkR, q.stalkR], q.embedStartMm || 0, 2)] : [];
  const ext = leafExtentMm([pn], rods);
  return { panels: [pn], rods, webs: [], notes: [], map: leafMap(q.archDeg, ext), lengthMm: ext, approach: 'B', type: 'PINNATIFID' };
}

/* ===================================================================
   THE SPECIES — the three references, described in words (Eva's photos are
   not in the repository; nothing here was fetched) and the parameter values
   each approach uses to approach them. The values are this session's, by
   eye from the render sheet, and are NOT ruled.
   =================================================================== */
export const REFERENCES = {
  carnation: 'CARNATION (Dianthus): opposite leaves, each pair at 90 degrees to the one below (decussate). Simple, linear-lanceolate, sessile and clasping, arching. Visibly swollen nodes.',
  rose: 'ROSE: alternate, spiralling (about 137 degrees). ONE compound leaf: petiole into rachis, 3-5 leaflets (terminal + lateral pairs), ovate, finely serrate, stipules at the petiole base. The stem kinks a few degrees at each node (a slight zigzag).',
  mum: 'CHRYSANTHEMUM: alternate. Simple leaf, short petiole, pinnately lobed with deep sinuses; the lobes point forward and are themselves toothed.',
  mumX: 'CHRYSANTHEMUM, EXAGGERATED (stress case): deep lobes, more lobe pairs, many teeth.',
};
const COMMON = { stalkR: 0.6, rachisR: 0.6, embedStartMm: 0 };
export const A_PRESETS = {
  carnation: { ...COMMON, lengthMm: 60, petioleMm: 0, rootLamina: true, rootWidth: 6, rootBaseTaper: 0.4, rootTipTaper: 0.85, rootBaseHalf: 2.4, rootTeeth: null,
    pairs: 0, terminal: false, fusion: 0, sinusBlend: 1, venation: 'PINNATE', archDeg: 70, cup: 0.35, stipules: null },
  rose: { ...COMMON, lengthMm: 40, petioleMm: 14, rootLamina: false, rootWidth: 0, rootBaseTaper: 1, rootTipTaper: 1,
    pairs: 2, firstMm: 6, lastMm: 26, angleDeg: 62, angleBaseDeg: 62, childLenMm: 20, childLenBase: 0.8, childWidth: 12, childBaseTaper: 0.75, childTipTaper: 0.85,
    childStalkMm: 2.5, childTeeth: { count: 13, depth: 0.12, crest: 1.6, notch: 1.6, skew: 0.3, from: 0.12, to: 0.97 },
    terminal: true, terminalAtMm: 40, terminalLenMm: 23, terminalWidth: 13.8, terminalStalkMm: 7,
    fusion: 0, sinusBlend: 1, venation: 'PINNATE', archDeg: 12, cup: 0.28,
    stipules: { atMm: 2.5, angleDeg: 22, lengthMm: 8, width: 2.6 } },
  mum: { ...COMMON, lengthMm: 44, petioleMm: 12, rootLamina: true, rootWidth: 2.4, rootBaseTaper: 0.2, rootTipTaper: 0.2, rootBaseHalf: 0,
    pairs: 2, firstMm: 3, lastMm: 14, angleDeg: 36, angleBaseDeg: 58, childLenMm: 18, childLenBase: 0.88, childWidth: 9.5, childBaseTaper: 0.7, childTipTaper: 0.9,
    childBaseHalf: 0, childStalkMm: 0, childTeeth: { count: 3, depth: 0.3, crest: 1.4, notch: 1.6, skew: 0.35, from: 0.42, to: 0.98 },
    terminal: true, terminalAtMm: 24, terminalLenMm: 21, terminalWidth: 13, terminalTeeth: { count: 4, depth: 0.3, crest: 1.4, notch: 1.6, skew: 0.5, from: 0.3, to: 0.98 },
    fusion: 0.5, sinusBlend: 0.9, venation: 'PINNATE', archDeg: 18, cup: 0.22, stipules: null },
  mumX: { ...COMMON, lengthMm: 54, petioleMm: 10, rootLamina: true, rootWidth: 2.4, rootBaseTaper: 0.2, rootTipTaper: 0.2,
    pairs: 4, firstMm: 3, lastMm: 30, angleDeg: 44, angleBaseDeg: 66, childLenMm: 17, childLenBase: 0.6, childWidth: 7, childBaseTaper: 0.7, childTipTaper: 0.9,
    childBaseHalf: 0, childStalkMm: 0, childTeeth: { count: 6, depth: 0.5, crest: 1.2, notch: 1.8, skew: 0.3, from: 0.25, to: 0.98 },
    terminal: true, terminalAtMm: 38, terminalLenMm: 18, terminalWidth: 9, terminalTeeth: { count: 7, depth: 0.5, crest: 1.2, notch: 1.8, skew: 0.5, from: 0.2, to: 0.98 },
    fusion: 0.3, sinusBlend: 1, venation: 'PINNATE', archDeg: 18, cup: 0.18, stipules: null },
};
export const B_PRESETS = {
  carnation: { type: 'LINEAR', q: { ...COMMON, lengthMm: 60, petioleMm: 0, width: 6, baseTaper: 0.4, tipTaper: 0.85, baseHalf: 2.4, teeth: null, archDeg: 70, cup: 0.35 } },
  rose: { type: 'PINNATE_COMPOUND', q: { ...COMMON, petioleMm: 14, rachisMm: 40, pairs: 2, firstMm: 6, lastMm: 26, leafletAngleDeg: 62, leafletLenMm: 20, leafletWidth: 12,
    basalScale: 0.8, terminalLenMm: 23, terminalWidth: 13.8, leafletBaseTaper: 0.75, leafletTipTaper: 0.85, lateralStalkMm: 2.5, terminalStalkMm: 7,
    teeth: { count: 13, depth: 0.12, crest: 1.6, notch: 1.6, skew: 0.3, from: 0.12, to: 0.97 }, archDeg: 12, cup: 0.28,
    stipules: { atMm: 2.5, angleDeg: 22, lengthMm: 8, width: 2.6 } } },
  mum: { type: 'PINNATIFID', q: { ...COMMON, lengthMm: 46, petioleMm: 12, width: 34, baseTaper: 0.6, tipTaper: 1.25, lobes: 3, lobeFrom: 0.08, lobeTo: 0.8,
    sinusDepth: 0.62, lobeShape: 0.7, lobeAngleDeg: 38, tiltEaseFrom: 0.9, teeth: { count: 9, depth: 0.12, crest: 1.4, notch: 1.6, skew: 0.5 }, archDeg: 18, cup: 0.22 } },
  mumX: { type: 'PINNATIFID', q: { ...COMMON, lengthMm: 54, petioleMm: 10, width: 40, baseTaper: 0.55, tipTaper: 1.2, lobes: 5, lobeFrom: 0.05, lobeTo: 0.85,
    sinusDepth: 0.82, lobeShape: 0.6, lobeAngleDeg: 40, tiltEaseFrom: 1, teeth: { count: 22, depth: 0.16, crest: 1.2, notch: 1.8, skew: 0.5 }, archDeg: 18, cup: 0.18 } },
};
export function buildSpecies(species, approach, override = null) {
  if (approach === 'A') return buildTreeLeaf(treeFromParams({ ...A_PRESETS[species], ...(override || {}) }));
  const pr = B_PRESETS[species];
  return buildTypedLeaf(override && override.type ? override.type : pr.type, { ...pr.q, ...(override || {}) });
}

/* ===================================================================
   EMISSION. Each panel through the shipped emitPanel; each rod our own
   closed tube. Records every primitive's triangle range so the Node tool can
   check each shell on its own (directed edges, signed volume) and so the
   renderer can colour parts.
   `place(P, n)` maps leaf-local points into the world (the stem demo); the
   identity by default.
   =================================================================== */
export async function emitLeaf(leaf, { acc, sheetMm = 1.2, place = null, tag = '' } = {}) {
  const G = await geometry();
  const emitPanel = G.__leafLabEmitPanel;
  const t = acc.floorThickness(sheetMm);
  const tAt = () => t;
  const map = leaf.map;
  const X = place || ((P) => P);
  const XN = place ? (n, P) => place.normal(n, P) : (n) => n;
  const parts = [];
  for (const pn of leaf.panels) {
    const rows = pn.us.map((u) => ({
      u, h: 0,
      sect: (v) => {
        const [x, y] = pn.plan(u, v);
        const [l, lx, ly] = pn.lift(x, y);
        const s = map.at(x, y, l, lx, ly);
        return place ? { P: X(s.P), n: XN(s.n, s.P) } : s;
      },
    }));
    /* halfWidth for the grid record: half the planform row span */
    for (const r of rows) { const a = pn.plan(r.u, -1), b = pn.plan(r.u, 1); r.h = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2; }
    const t0 = acc.triangleCount;
    /* the shipped rim telemetry: `clamps` lists every skin point whose bead
       thinned the sheet below RIM_FLOOR_MM on a narrow span — the 3D thinnest
       feature, which the planform raster cannot see */
    const rim = { clamps: [], pivots: [], pivotsSkipped: 0, apex: [], flat: [], corner: [], segments: 0, drawnMaxMm: 0, tipAxisMm: null };
    const grid = emitPanel(acc, rows, { label: pn.label, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, rim);
    const thin = rim.clamps.reduce((m, c) => (!m || c.thicknessMm < m.thicknessMm ? c : m), null);
    parts.push({ label: `${tag}${pn.label}`, kind: pn.kind, t0, t1: acc.triangleCount, grid: grid ? { label: pn.label, rows: grid } : null, jac: pn.jac, flipped: pn.flipped,
      rimClamps: rim.clamps.length, rimThinnest: thin ? { mm: thin.thicknessMm, at: pn.plan(thin.u, thin.col < 5 ? -1 : 1), u: thin.u } : null });
  }
  for (const rd of leaf.rods) {
    const t0 = acc.triangleCount;
    emitRod(acc, rd, map, X);
    parts.push({ label: `${tag}${rd.label}`, kind: 'rod', t0, t1: acc.triangleCount, rod: rd });
  }
  return parts;
}
/* A closed tube along the rod's planform polyline (lifted onto the arch at
   lift 0), parallel-transported frames, half-step ring, fan caps wound
   outward. Extensions push the ends past their points along the end tangent
   (the embed into the stem wall, or into the blade it holds). */
function emitRod(acc, rd, map, X) {
  const pts = rd.pts2.map(([x, y]) => map.at(x, y, 0, 0, 0).P);
  const radii = rd.radii.slice();
  if (pts.length < 2) return;
  const t0 = nrm(sub(pts[1], pts[0])), t1 = nrm(sub(pts[pts.length - 1], pts[pts.length - 2]));
  if (rd.extendStartMm > 0) { pts.unshift(sub(pts[0], mul(t0, rd.extendStartMm))); radii.unshift(radii[0]); }
  if (rd.extendEndMm > 0) { pts.push(add(pts[pts.length - 1], mul(t1, rd.extendEndMm))); radii.push(radii[radii.length - 1]); }
  /* densify long segments on a curved arch */
  const P = [], R = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const L = len(sub(pts[i + 1], pts[i]));
    const n = Math.max(1, Math.ceil(L / 2));
    for (let k = 0; k < n; k++) { const f = k / n; P.push(add(pts[i], mul(sub(pts[i + 1], pts[i]), f))); R.push(lerp(radii[i], radii[i + 1], f)); }
  }
  P.push(pts[pts.length - 1]); R.push(radii[radii.length - 1]);
  const S = ROD_SIDES;
  let tan = nrm(sub(P[1], P[0]));
  let a = Math.abs(tan[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let nx = nrm(cross(tan, a)), ny = cross(tan, nx);
  const rings = [];
  for (let i = 0; i < P.length; i++) {
    const tn = i === 0 ? nrm(sub(P[1], P[0])) : i === P.length - 1 ? nrm(sub(P[i], P[i - 1])) : nrm(sub(P[i + 1], P[i - 1]));
    /* parallel transport */
    const b = cross(tan, tn); const bl = len(b);
    if (bl > 1e-12) {
      const ax = mul(b, 1 / bl), ang = Math.atan2(bl, dot(tan, tn));
      const rot = (v) => add(add(mul(v, Math.cos(ang)), mul(cross(ax, v), Math.sin(ang))), mul(ax, dot(ax, v) * (1 - Math.cos(ang))));
      nx = rot(nx); ny = rot(ny);
    }
    tan = tn;
    rings.push(Array.from({ length: S }, (_, j) => {
      const th = (2 * Math.PI * (j + 0.5)) / S;
      return X(add(P[i], add(mul(nx, Math.cos(th) * R[i]), mul(ny, Math.sin(th) * R[i]))));
    }));
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let j = 0; j < S; j++) {
    const jn = (j + 1) % S;
    acc.quad(rings[i][j], rings[i][jn], rings[i + 1][jn], rings[i + 1][j]);
  }
  const A0 = rings[0], A1 = rings[rings.length - 1];
  for (let j = 1; j < S - 1; j++) { acc.tri(A0[0], A0[j + 1], A0[j]); acc.tri(A1[0], A1[j], A1[j + 1]); }
}

/* ---------------- planform outlines (for the analysis) ---------------- */
/* Each panel's planform polygon (its lattice's boundary, the emitted
   silhouette: emitPanel puts the bead APEX on these points), each rod's as
   a capsule strip. */
export function planformPolygons(leaf) {
  const polys = [];
  for (const pn of leaf.panels) {
    const us = pn.us, poly = [];
    for (let j = 0; j < 10; j++) poly.push(pn.plan(us[0], -1 + (2 * j) / 9));
    for (let i = 1; i < us.length; i++) poly.push(pn.plan(us[i], 1));
    for (let j = 8; j >= 0; j--) poly.push(pn.plan(us[us.length - 1], -1 + (2 * j) / 9));
    for (let i = us.length - 2; i > 0; i--) poly.push(pn.plan(us[i], -1));
    /* the BASE row runs -1 -> +1 at u = 0; ensure orientation-free fill */
    polys.push({ label: pn.label, kind: pn.kind, poly });
  }
  for (const rd of leaf.rods) {
    for (let i = 0; i + 1 < rd.pts2.length; i++) {
      const A = rd.pts2[i], B = rd.pts2[i + 1];
      const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L, d[0] / L];
      const ra = rd.radii[i], rb = rd.radii[i + 1];
      polys.push({ label: rd.label, kind: 'rod', poly: [[A[0] + n[0] * ra, A[1] + n[1] * ra], [B[0] + n[0] * rb, B[1] + n[1] * rb], [B[0] - n[0] * rb, B[1] - n[1] * rb], [A[0] - n[0] * ra, A[1] - n[1] * ra]] });
    }
  }
  return polys;
}

/* ===================================================================
   THE STEM DEMO — arrangement, swelling, kink, internodes. The STEM is this
   file's own tube (horizontal rings, centres displaced: the shipped node
   law's own construction, `stemNodeAxisMm`, restated), not `buildStemInto`.
   NODE properties (how many leaves per node, where, the rotation) are the
   arrangement's; LEAF properties are the leaf's. Leaflet count is never here.
   =================================================================== */
export const ARRANGEMENTS = Object.freeze(['ALTERNATE', 'OPPOSITE', 'WHORLED']);
/* the azimuths at node k (degrees) */
export function nodeAzimuths(arr, k) {
  if (arr.type === 'ALTERNATE') return [k * arr.divergenceDeg];
  if (arr.type === 'OPPOSITE') { const b = arr.decussate ? k * 90 : 0; return [b, b + 180]; }
  const n = Math.max(2, arr.whorlN | 0), b = arr.whorlAlternate ? (k % 2) * (180 / n) : 0;
  return Array.from({ length: n }, (_, i) => b + (360 * i) / n);
}
/* The shipped constants this restates (bloom-geometry.js STEM_NODE_*:
   swell 0.6, slope 0.13, spread 3.2738 stem radii, ramp 0.12/0.055 spreads)
   are copied, not imported, so the demo runs on its own sliders. */
export const NODE_SPREAD_RADII = 3.2738, NODE_RAMP_SPREADS = 0.12 / 0.055, NODE_SWELL_MAX = 0.6;
export function stemDemoPlan(s) {
  const nodes = [];
  for (let k = 0; k < s.nodes; k++) {
    const depth = s.topMm + k * s.internodeMm * Math.pow(s.internodeGrowth, k);
    if (depth > s.lengthMm - 4) break;
    const az = nodeAzimuths(s.arrangement, k);
    /* THE KINK TURNS AWAY FROM THE NODE'S FIRST LEAF — the shipped rule
       (stemNodeLaw), so leaves and bends never disagree */
    const away = (az[0] + 180) * D2R;
    nodes.push({ k, depth, az, dx: Math.cos(away), dy: Math.sin(away) });
  }
  const r0 = s.diameterMm / 2;
  const spread = NODE_SPREAD_RADII * r0, ramp = NODE_RAMP_SPREADS * spread;
  const slope = Math.tan(s.kinkDeg * D2R);
  const radiusAt = (d) => { let sw = 0; for (const n of nodes) { const z = (d - n.depth) / spread; sw += Math.exp(-z * z); } return r0 * (1 + s.swell * NODE_SWELL_MAX * sw); };
  const axisAt = (d) => {
    let x = 0, y = 0;
    for (const n of nodes) { const past = d - n.depth; if (!(past > 0)) continue; const q = Math.min(1, past / ramp); const sm = q * q * (3 - 2 * q); x += n.dx * slope * past * sm; y += n.dy * slope * past * sm; }
    return [x, y];
  };
  return { nodes, r0, spread, ramp, radiusAt, axisAt, lengthMm: s.lengthMm };
}
export function emitStem(acc, plan) {
  const S = 24, rings = [];
  const n = Math.max(40, Math.ceil(plan.lengthMm / 0.8));
  for (let i = 0; i <= n; i++) {
    const d = (plan.lengthMm * i) / n, r = plan.radiusAt(d), [ax, ay] = plan.axisAt(d);
    rings.push(Array.from({ length: S }, (_, j) => { const th = (2 * Math.PI * j) / S; return [ax + r * Math.cos(th), ay + r * Math.sin(th), -d]; }));
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let j = 0; j < S; j++) {
    const jn = (j + 1) % S;
    acc.quad(rings[i][j], rings[i + 1][j], rings[i + 1][jn], rings[i][jn]);
  }
  const top = rings[0], bot = rings[rings.length - 1];
  for (let j = 1; j < S - 1; j++) { acc.tri(top[0], top[j], top[j + 1]); acc.tri(bot[0], bot[j + 1], bot[j]); }
}
/* place a leaf at a node: leaf-local x out along the midrib's start
   direction (angle from horizontal), y across, z the adaxial normal; the
   leaf base at the stem's wall mid-thickness on its displaced axis. */
export function nodePlacement(plan, node, azDeg, angleDeg, sheetMm, embedMm) {
  const phi = azDeg * D2R, th = angleDeg * D2R;
  const R = [Math.cos(phi), Math.sin(phi), 0], T = [-Math.sin(phi), Math.cos(phi), 0];
  const D = [R[0] * Math.cos(th), R[1] * Math.cos(th), Math.sin(th)];
  const N = cross(D, T);
  const [ax, ay] = plan.axisAt(node.depth);
  const rr = plan.radiusAt(node.depth) - Math.max(sheetMm, 1) / 2 - embedMm;
  const base = [ax + R[0] * rr, ay + R[1] * rr, -node.depth];
  const f = (P) => add(base, add(mul(D, P[0]), add(mul(T, P[1]), mul(N, P[2]))));
  f.normal = (n) => add(mul(D, n[0]), add(mul(T, n[1]), mul(N, n[2])));
  return f;
}
export const STEM_PRESETS = {
  carnation: { lengthMm: 120, diameterMm: 4, topMm: 16, nodes: 4, internodeMm: 26, internodeGrowth: 1.0, swell: 1.0, kinkDeg: 0, leafAngleDeg: 30,
    arrangement: { type: 'OPPOSITE', decussate: true } },
  rose: { lengthMm: 120, diameterMm: 4.5, topMm: 18, nodes: 4, internodeMm: 24, internodeGrowth: 1.0, swell: 0.25, kinkDeg: 6, leafAngleDeg: 35,
    arrangement: { type: 'ALTERNATE', divergenceDeg: GOLDEN_DEG } },
  mum: { lengthMm: 120, diameterMm: 4, topMm: 16, nodes: 5, internodeMm: 20, internodeGrowth: 1.0, swell: 0.15, kinkDeg: 2, leafAngleDeg: 35,
    arrangement: { type: 'ALTERNATE', divergenceDeg: GOLDEN_DEG } },
  whorled: { lengthMm: 120, diameterMm: 4, topMm: 18, nodes: 3, internodeMm: 32, internodeGrowth: 1.0, swell: 0.6, kinkDeg: 0, leafAngleDeg: 30,
    arrangement: { type: 'WHORLED', whorlN: 3, whorlAlternate: true } },
};
/* Build a stem with leaves at every node, each leaf the given leaf builder's
   output. Returns the parts for colouring and checking. */
export async function emitStemDemo(acc, stemParams, leaf, { sheetMm = 1.2 } = {}) {
  const plan = stemDemoPlan(stemParams);
  const parts = [];
  let t0 = acc.triangleCount;
  emitStem(acc, plan);
  parts.push({ label: 'stem', kind: 'stem', t0, t1: acc.triangleCount });
  for (const node of plan.nodes) {
    for (const az of node.az) {
      const place = nodePlacement(plan, node, az, stemParams.leafAngleDeg, sheetMm, 0.4);
      const ps = await emitLeaf(leaf, { acc, sheetMm, place, tag: `node${node.k}@${az.toFixed(0)} ` });
      parts.push(...ps);
    }
  }
  return { parts, plan };
}

/* ===================================================================
   THE /plot ADAPTER — a leaf's captured panels through the SHIPPED grid
   writer (bloom-grid-gltf.js buildGridGltf), read-only. The writer is
   PETAL-SHAPED: it names every node `petal_N` and requires a spine, a tip
   cap, a ring and a hub. The fields it requires and a leaf does not have are
   filled here with the leaf's own nearest equivalent and LISTED, because a
   label naming a computation nobody performed is this project's commonest
   defect — the list is the finding (§1e of the doc).
   =================================================================== */
export const GRID_FAKED_FIELDS = Object.freeze([
  'spine (the midrib polyline; tilt 0, no curl record)', 'tipCap (null)', 'ring.radius (0)', 'hub.radius (0)',
  'attachment (the leaf base; footNormal = normal)', 'node name petal_N (there is no leaf node kind)',
]);
export function gridBuilt(leaves) {
  const petalsAll = leaves.map((lf, i) => {
    const panels = lf.parts.filter((p) => p.grid && p.grid.rows && p.grid.rows.length).map((p) => p.grid);
    const sp = lf.leaf.map;
    const rows = Array.from({ length: 21 }, (_, k) => sp.frame((lf.leaf.lengthMm * k) / 20).S);
    return {
      grid: panels, footRows: 1, slotIndex: i, azimuth: 0, role: 'leaf', slotRole: null, petalRole: null, allRole: null,
      attachment: { point: [0, 0, 0], dir: [1, 0, 0], normal: [0, 0, 1], tangent: [0, 1, 0], footNormal: [0, 0, 1], tiltRad: 0, azimuth: 0, ringRadius: 0, ringZ: 0 },
      form: null,
      spine: { length: lf.leaf.lengthMm, tiltRad: 0, turnAskedDeg: 0, turnBuiltDeg: 0, clamped: false, rows },
      tipCap: null,
    };
  });
  return { petalsAll, petalsBuilt: petalsAll.length, ring: { radius: 0 }, hub: { radius: 0 } };
}
