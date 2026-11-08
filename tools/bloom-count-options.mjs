#!/usr/bin/env node
/* ===================================================================
   PETAL COUNT PER WHORL — THREE OPTIONS, PROTOTYPED, MEASURED AND RENDERED
   SIDE BY SIDE. NOTHING HERE SHIPS. (read §18 of
   docs/bloom-photo-to-bloom-discovery.md; the ring options' tool,
   tools/bloom-ring-options.mjs, is this one's shape)

   THE GAP. `petalCount` is whole-whorl: footRing() places `petalCount` feet on
   every ringed whorl and buildBloomInto() lays `fr.slotCount` slots on each.
   Under Per-layer values a layer owns its length, width, tilt, curves, outline
   and ring — never how many petals it has. The lotus wants a few broad body
   petals inside more, narrower outer ones; the water lily ~4 long outer and
   ~10 shorter inner.

   THE OPTIONS, each an ANCHORED EDIT of a temporary copy of the shipped
   geometry (every anchor must match exactly once, or the run refuses). NONE
   touches the registry, the design file or the page: the count rides the
   build's layer scope (A, B) or the state (C), the way the ring options' A
   rode `e.ring`.
     A  a per-layer OWNED count (Per-layer values, RADIAL / SPIRAL): a layer
        entry's `count` REPLACES the whorl's count. Absent, the global double.
     B  a per-layer count OFFSET on the global (Per-layer values): a layer
        entry's `countOffset` is ADDED to Petal count (scoping's own delta
        semantics, Q3.2), rounded and clamped to the slider's 3..40.
     C  (the code's suggestion) a whole-bloom COUNT RAMP, `layerSize`'s shape:
        whorl L carries round(Petal count x r^L), clamped 3..40. One number, no
        scope, RADIAL / SPIRAL with or without Per-layer values. r = 1 (or
        absent) is the global double, by branch.
   In every option the per-layer count flows to the THREE places the code
   reads a whorl's count: the area rule's foot count (so R0 follows the feet
   that are really there), the slot map's length, and the whorl primitive's
   `count` (its RADIAL azimuth divisor; SPIRAL restarts its golden-angle run
   per whorl, so a per-turn count is a run of that length). With no count set
   all three are the old doubles — the identity is by branch, and the
   saved-design compare is what says so.

   RUN:  node tools/bloom-count-options.mjs --measure [--quick]
           every option's flowers in EXPORT mode: rings, hub, counts, body and
           whole h:w, petal coverage of each ring, rim floor, census,
           neighbour gap, triangles
         node tools/bloom-count-options.mjs --interactions
           SPIRAL, TUBE, infill, texture, FAN and CONTINUOUS under each option
         node tools/bloom-count-options.mjs --write <A|B|C|A-broken> <dir>
           writes that option's patched bloom-geometry.js into <dir> (a
           worktree of main) for verify-bloom-load-unchanged.mjs; `A-broken`
           is the must-fail (a count that moves on layer 1 with nothing set)
         node tools/bloom-count-options.mjs --sheet <png> [--photos <dir>]
           the side-by-side sheet (soft renderer, export mesh). Without
           --photos the photo column is a placeholder (never committed).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SET = path.join(ROOT, 'docs/photo-to-bloom/eva-set');

/* THE ANCHORS — copied from the shipped bloom-geometry.js */
const SLOT_LINE = '  const slotCount = fanMode ? fanCount : state.petalCount;';
const OWN_LINE = '    const own = layerOwnedValues(tierScopes, L, slotCount, state);';
const FOOT_LINE = '    const footCount = slotCount;';
const GUARD_LINE = '    ? raw[0].rFoot * Math.sqrt(slotCount)   // area rule';
const CAP_LINE = '* Math.sqrt(slotCount) : Math.sqrt(s2);';
const MAP_LINE = 'for (let L = 0; L < layerCount; L++) byLayer.push(new Array(n).fill(';
const WHORL_LINE = '      count: fr.slotCount,';
const TERM_LINE = 'slot.scopeTerm = scopeOffsetsFor(scopes, { layer: d.lambda, slot: slot.index, n: fr.slotCount, state });';

/* the shared plumbing: every option defines `countOf(L)` and returns
   `slotCount` ITSELF (the same double) where nothing asks for another count */
const PLUMBING = [
  [OWN_LINE, '    const layerN = countOf(L);\n    const own = layerOwnedValues(tierScopes, L, layerN, state);'],
  [FOOT_LINE, '    const footCount = layerN;'],
  [GUARD_LINE, '    ? raw[0].rFoot * Math.sqrt(raw[0].footCount)   // area rule'],
  [CAP_LINE, '* Math.sqrt(raw[0].footCount) : Math.sqrt(s2);'],
  [MAP_LINE, 'for (let L = 0; L < layerCount; L++) byLayer.push(new Array(Math.round(raw[L].footCount)).fill('],
  [WHORL_LINE, '      count: slotsFor.length === Math.round(fr.slotCount) ? fr.slotCount : slotsFor.length,'],
  [TERM_LINE, 'slot.scopeTerm = scopeOffsetsFor(scopes, { layer: d.lambda, slot: slot.index, n: slotsFor.length === Math.round(fr.slotCount) ? fr.slotCount : slotsFor.length, state });'],
];
const CLAMP = (x) => `Math.max(3, Math.min(40, Math.round(${x})))`;
const layerEntry = (field) => `(tierScopes && scopeLayersLive(state) && !fanMode && !continuousMode ? (tierScopes.layers || []).find((q) => q.layer === L && typeof q.${field} === 'number') : null)`;
export const OPTIONS = {
  A: {
    title: 'A — an owned count per layer',
    countOf: `const countOf = (L) => { const e = ${layerEntry('count')}; return e ? ${CLAMP('e.count')} : slotCount; };`,
  },
  B: {
    title: 'B — a count offset on the global',
    countOf: `const countOf = (L) => { const e = ${layerEntry('countOffset')}; return e && e.countOffset !== 0 ? ${CLAMP('Math.round(state.petalCount) + e.countOffset')} : slotCount; };`,
  },
  C: {
    title: 'C — a whole-bloom count ramp',
    countOf: `const countOf = (L) => { const r = Number(state.layerCountRamp); return (fanMode || continuousMode || !(r > 0) || r === 1) ? slotCount : ${CLAMP('state.petalCount * Math.pow(r, L)')}; };`,
  },
  /* THE MUST-FAIL for the saved-design compare: a count that moves with
     nothing set (layer 1 under Per-layer values takes one petal more) */
  'A-broken': {
    title: 'A-broken — a count moves with nothing asked',
    countOf: 'const countOf = (L) => (L === 1 && tierScopes && scopeLayersLive(state) && !fanMode && !continuousMode ? slotCount + 1 : slotCount);',
  },
};
function edit(src, edits, opt) {
  for (const [from, to] of edits) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`option ${opt}: anchor matches ${n} times (want exactly 1): ${from.slice(0, 80)}`);
    src = src.replace(from, to);
  }
  return src;
}
export function patchedGeometry(opt) {
  const o = OPTIONS[opt];
  if (!o) throw new Error(`no option ${opt}`);
  return edit(fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8'), [[SLOT_LINE, `${SLOT_LINE}\n  ${o.countOf}`], ...PLUMBING], opt);
}
async function loadTree(opt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `count-${opt || 'main'}-`));
  for (const f of ['bloom-geometry.js', 'bloom-registry.js', 'bloom-file.js', 'bloom-curve.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  if (opt) fs.writeFileSync(path.join(dir, 'bloom-geometry.js'), patchedGeometry(opt));
  const G = await import(pathToFileURL(path.join(dir, 'bloom-geometry.js')).href);
  const F = await import(pathToFileURL(path.join(dir, 'bloom-file.js')).href);
  return { G, F, dir, opt };
}

/* THE FLOWERS. Each option reaches the SAME counts where it can, through its
   own parameter; where it cannot (C is one ratio) it takes its nearest and
   the table says so. */
const read = (f, v) => JSON.parse(fs.readFileSync(path.join(SET, f, `${f}-${v}.subset.bloom-design.json`), 'utf8'));
const layerOf = (sub, L) => sub.overrides.layers.find((e) => e.layer === L);
/* the lotus: S6 v11, the body (L2 / L3) at 3 broad petals inside 6 / 5
   narrower outer ones — and the body's widths taken back up (v11 had narrowed
   them to 24 / 21 mm to keep five from crowding small rings) to 32 / 28 mm */
export const TARGETS = {
  lotus: { counts: [6, 5, 3, 3], global: 5, widthOffsets: { 2: 4, 3: 0 } },
  waterlily: { counts: [4, 10], global: 8 },
};
const RAMP = { lotus: { global: 6, r: 0.8 }, waterlily: { global: 4, r: 2.5 } };
function withCounts(opt, flower, s, widths = true) {
  const T = TARGETS[flower];
  const counts = {};
  if (widths && T.widthOffsets) for (const [L, w] of Object.entries(T.widthOffsets)) layerOf(s, Number(L)).offsets.petalWidth = w;
  if (opt === 'A') T.counts.forEach((n, L) => { counts[L] = { count: n }; });
  else if (opt === 'B') T.counts.forEach((n, L) => { counts[L] = { countOffset: n - T.global }; });
  else if (opt === 'C') { s.controls.petalCount = RAMP[flower].global; return { subset: s, counts: null, ramp: RAMP[flower].r }; }
  return { subset: s, counts, ramp: null };
}
export function flowersFor(opt) {
  const daisy13 = (() => { const s = read('daisy', 'v7'); s.controls.petalCount = 13; return s; })();
  if (!opt) return [
    { flower: 'lotus', label: 'S6 v11', subset: read('lotus', 'v11') },
    { flower: 'waterlily', label: 'v7 (8 + 8)', subset: read('waterlily', 'v7') },
    { flower: 'daisy', label: 'v7 (11 x 2)', subset: read('daisy', 'v7') },
  ];
  return [
    { flower: 'lotus', label: `v11 + ${opt}`, ...withCounts(opt, 'lotus', read('lotus', 'v11')) },
    /* the count alone, v11's own body widths kept (24 / 21 mm): what the count
       does with nothing else moved */
    { flower: 'lotus-counts-only', label: `v11 + ${opt} count only`, ...withCounts(opt, 'lotus', read('lotus', 'v11'), false) },
    { flower: 'waterlily', label: `v7 + ${opt}`, ...withCounts(opt, 'waterlily', read('waterlily', 'v7')) },
    /* the daisy needs no per-whorl count: both whorls take the same, so it is the
       GLOBAL count (13 x 2 = 26 rays), built on the option's own tree */
    { flower: 'daisy', label: 'global 13 x 2', subset: daisy13 },
  ];
}

export async function build(T, f, { captureGrid = false, state = null } = {}) {
  const r = T.F.readNewDesign(f.subset);
  if (!r.ok) throw new Error(`${f.flower}: ${r.error}`);
  const scopes = T.F.scopesForBuild(r.doc.overrides);
  if (f.counts) for (const [L, x] of Object.entries(f.counts)) {
    let e = scopes.layers.find((q) => q.layer === Number(L));
    if (!e) { e = { layer: Number(L), offsets: {} }; scopes.layers.push(e); }
    Object.assign(e, x);
  }
  const controls = { ...r.doc.controls, ...(state || {}) };
  if (f.ramp) controls.layerCountRamp = f.ramp;
  const acc = new T.G.MeshBuilder({ exportMode: true, captureGrid, captureRim: captureGrid });
  const b = T.G.buildBloomInto(acc, controls, { below: null, scopes });
  return { acc, b, notes: r.notes.length, controls, scopes };
}

/* §11.6's measure (the ring options' own): the export mesh, each petal by its
   own emitted range; the BODY is the inner half of the layers */
export function measure({ acc, b, controls, scopes }) {
  const P = acc.positions;
  const all = (b.petalsAll || []).filter((p) => p && p.triRange);
  const nR = Math.max(...all.map((p) => p.whorl)) + 1;
  const ext = (ps) => { let zl = Infinity, zh = -Infinity, rr = 0; for (const p of ps) { const [a, c] = p.triRange; for (let t = a; t < c; t++) for (let j = 0; j < 9; j += 3) { const i = t * 9 + j; zl = Math.min(zl, P[i + 2]); zh = Math.max(zh, P[i + 2]); rr = Math.max(rr, Math.hypot(P[i], P[i + 1])); } } return { h: zh - zl, w: 2 * rr }; };
  const whole = ext(all), body = ext(all.filter((p) => p.whorl >= Math.ceil(nR / 2)));
  const fr = b.foot || {};
  const rings = (fr.rings || []).map((r) => r.radius);
  const counts = (b.slotAzimuths || []).map((a) => a.length);
  /* how much of each ring's circumference the whorl's blades cover at their
     widest: n x (that whorl's petal width) / (2 pi r) — read off the built
     petals' own widest half-width, never the controls */
  const cover = [];
  for (let L = 0; L < counts.length; L++) {
    const ps = all.filter((p) => p.whorl === L);
    const half = Math.max(...ps.map((p) => (p.tipCap && p.tipCap.peakHalf) || 0));
    cover.push(rings[L] > 0 ? (counts[L] * 2 * half) / (2 * Math.PI * rings[L]) : null);
  }
  let thin = Infinity, under = 0, declared = 0, profiles = 0;
  for (const p of all) for (const a of (p.rim && p.rim.apex) || []) {
    profiles++;
    const t = Math.hypot(a.top[0] - a.bot[0], a.top[1] - a.bot[1], a.top[2] - a.bot[2]);
    thin = Math.min(thin, t);
    if (t < Math.min(1.0, a.bodyMm) - 1e-6) { if (a.clamped) declared++; else under++; }
  }
  const nb = b.neighbour || {};
  const neighbour = nb.blade ? { skinGapMm: nb.blade.skinGapMm, pair: nb.blade.pair, feetD: nb.feet ? nb.feet.d : null } : null;
  return { counts, cover, neighbour, whole: whole.h / whole.w, wholeMm: [whole.h, whole.w], body: body.h / body.w, bodyMm: [body.h, body.w], rings, hub: fr.hub ? fr.hub.radius : null, hubGrowth: fr.hub ? fr.hub.growth : null, tris: P.length / 9, rim: { profiles, thin, under, declared } };
}

const fmt = (x, d = 3) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : Number(x).toFixed(d));
async function cmdMeasure() {
  const { census } = await import('./bloom-self-intersection.mjs');
  const QUICK = process.argv.includes('--quick');
  const only = (process.argv.find((a) => a.startsWith('--opts=')) || '').slice(7).split(',').filter(Boolean);
  const opts = only.length ? only.map((o) => (o === 'main' ? null : o)) : [null, 'A', 'B', 'C'];
  for (const opt of opts) {
    const T = await loadTree(opt);
    for (const f of flowersFor(opt)) {
      const B = await build(T, f, { captureGrid: !QUICK });
      const m = measure(B);
      const c = QUICK ? null : census(B.acc.positions, {});
      console.log(`${(opt || 'main').padEnd(4)} ${f.flower.padEnd(9)} ${f.label.padEnd(15)} notes ${B.notes} · counts ${m.counts.join('/')} · rings ${m.rings.map((r) => r.toFixed(2)).join('/')} mm · hub ${fmt(m.hub, 2)}${m.hubGrowth ? ` (GROWN ${m.hubGrowth.byMm.toFixed(2)})` : ''} · cover ${m.cover.map((x) => fmt(x, 2)).join('/')} · body h:w ${fmt(m.body)} (${m.bodyMm.map((x) => x.toFixed(1)).join(' x ')}) · whole ${fmt(m.whole)} · tris ${m.tris}`);
      if (!QUICK) console.log(`       rim ${m.rim.profiles} profiles, thinnest ${fmt(m.rim.thin, 4)} mm, ${m.rim.under} UNDECLARED under the floor, ${m.rim.declared} declared clamps · census ${c.within} within-shell / ${c.cross} cross-shell pairs (worst span ${fmt(c.worstSpanMm, 4)}) · neighbour skin gap ${m.neighbour ? fmt(m.neighbour.skinGapMm) : 'n/a'} mm (petals ${m.neighbour ? m.neighbour.pair.join('/') : ''}), feet nearest ${m.neighbour && m.neighbour.feetD !== null ? fmt(m.neighbour.feetD, 2) : 'n/a'}`);
    }
  }
}

/* THE INTERACTIONS — each option against the arrangements and features the
   count touches. A build that throws is a FINDING, printed, never hidden. */
async function cmdInteractions() {
  const rows = [];
  for (const opt of ['A', 'B', 'C']) {
    const T = await loadTree(opt);
    const wl = flowersFor(opt).find((f) => f.flower === 'waterlily');
    const cases = [
      ['RADIAL (as written)', {}],
      ['SPIRAL', { placement: 'SPIRAL' }],
      ['FAN', { placement: 'FAN' }],
      ['CONTINUOUS', { placement: 'CONTINUOUS' }],
      ['Voronoi infill', { petalInfill: 'VORONOI' }],
      ['texture BONE', { petalTexture: 'BONE' }],
      /* `tubeLayerN` is a SLIT COUNT snapped to a divisor of the whorl's count
         (tubePlan reads ONE n, the global); whorl 2 carries 10 petals under the
         prototype against a global of 4 (C) or 8 (A / B) */
      ['TUBE whorl 2, 1 slit (per-layer OFF)', { scopeLayers: 'OFF', tubeLayer2: 1 }],
      ['TUBE whorl 2, 2 slits (per-layer OFF)', { scopeLayers: 'OFF', tubeLayer2: 2 }],
      ['TUBE whorl 2, 5 slits (per-layer OFF)', { scopeLayers: 'OFF', tubeLayer2: 5 }],
      ['TUBE whorl 2, 1 slit (per-layer ON)', { tubeLayer2: 1 }],
      ['sepals 40', { sepalCount: 40 }],
    ];
    for (const [name, st] of cases) {
      try {
        const B = await build(T, wl, { state: st });
        const m = measure(B);
        const tube = B.b.tube ? `tube ${B.b.tube.active ? 'BUILT' : 'not built'} (plan n ${B.b.tube.n ?? (B.b.tube.plan && B.b.tube.plan.n)}, slits ${JSON.stringify((B.b.tube.layers || (B.b.tube.plan && B.b.tube.plan.layers) || []).map((x) => x.k))})` : 'no tube';
        const sep = B.b.sepals ? `sepals ${B.b.sepals.count}` : '';
        rows.push(`${opt} ${name.padEnd(32)} counts ${m.counts.join('/')} · tris ${m.tris} · ${tube} ${sep} · infill ${(B.b.petalsAll || []).some((p) => p && p.infill && p.infill.cells) ? 'cut' : '-'} · texture ${B.b.texture ? 'yes' : '-'}`);
      } catch (e) { rows.push(`${opt} ${name.padEnd(32)} THROWS: ${String(e.message).slice(0, 160)}`); }
    }
  }
  for (const r of rows) console.log(r);
}

const VIEWS = {
  daisy: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -0.9, 0.42], up: [0, 0, 1] } },
  lotus: { front: { dir: [0.0, -0.62, 0.79], up: [0, 0, 1] }, side: { dir: [0.0, -1, 0.05], up: [0, 0, 1] } },
  waterlily: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -1, 0.14], up: [0, 0, 1] } },
};
async function cmdSheet(out, photos) {
  const R = await import('./bloom-soft-render.mjs');
  const C = 230, PAD = 6, LAB = 20;
  const cols = ['photo', null, 'A', 'B', 'C'];
  const flowers = ['lotus', 'waterlily', 'daisy'];
  const W = cols.length * (C + PAD) + PAD, Hh = flowers.length * 2 * (C + PAD) + flowers.length * (LAB + 30) + 40;
  const rgb = Buffer.alloc(W * Hh * 3, 18);
  R.text(rgb, W, Hh, PAD, 8, 'PETAL COUNT PER WHORL - PROTOTYPES, NOT SHIPPED - EXPORT MESH', [235, 235, 230], 2);
  const trees = {}, frames = {};
  for (const c of cols) if (c !== 'photo') trees[c || 'main'] = await loadTree(c);
  const decodePng = photos ? (await import('./pngdec.mjs')).decodePNG : null;
  for (let fi = 0; fi < flowers.length; fi++) {
    const fl = flowers[fi];
    const y0 = 34 + fi * (2 * (C + PAD) + LAB + 30);
    for (let ci = 0; ci < cols.length; ci++) {
      const c = cols[ci], x0 = PAD + ci * (C + PAD);
      const f = c === 'photo' ? null : flowersFor(c).find((q) => q.flower === fl);
      const head = c === 'photo' ? fl : c === null ? `MAIN ${f.label}` : `OPTION ${c}`;
      R.text(rgb, W, Hh, x0, y0, head.toUpperCase(), [200, 220, 215], 2);
      if (c === 'photo') {
        for (let vi = 0; vi < 2; vi++) {
          const v = ['front', 'side'][vi], yy = y0 + LAB + vi * (C + PAD);
          const fp = photos ? path.join(photos, `${fl}-${v}.png`) : null;
          if (fp && fs.existsSync(fp) && decodePng) {
            const im = decodePng(fs.readFileSync(fp));
            const s = Math.max(im.width, im.height) / C;
            for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
              const sx = Math.floor((x - (C - im.width / s) / 2) * s), sy = Math.floor((y - (C - im.height / s) / 2) * s);
              if (sx < 0 || sy < 0 || sx >= im.width || sy >= im.height) continue;
              const o = (sy * im.width + sx) * 4, d = ((yy + y) * W + x0 + x) * 3;
              rgb[d] = im.data[o]; rgb[d + 1] = im.data[o + 1]; rgb[d + 2] = im.data[o + 2];
            }
          } else {
            for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const d = ((yy + y) * W + x0 + x) * 3; const e = x === 0 || y === 0 || x === C - 1 || y === C - 1; rgb[d] = rgb[d + 1] = rgb[d + 2] = e ? 90 : 30; }
            R.text(rgb, W, Hh, x0 + 8, yy + C / 2 - 20, `${v} photo`, [150, 150, 150], 2);
            R.text(rgb, W, Hh, x0 + 8, yy + C / 2, 'NOT COMMITTED', [150, 150, 150], 2);
          }
        }
        continue;
      }
      const B = await build(trees[c || 'main'], f);
      const m = measure(B);
      const P = B.acc.positions;
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
      /* ONE FRAME PER FLOWER — main's build, so every option reads at one scale */
      if (c === null) frames[fl] = { center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], half: 0.6 * Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) };
      const { center, half } = frames[fl];
      for (let vi = 0; vi < 2; vi++) {
        const v = ['front', 'side'][vi], yy = y0 + LAB + vi * (C + PAD);
        R.blit(rgb, W, Hh, R.render(P, C, C, { ...VIEWS[fl][v], center, halfHeight: half }), C, C, x0, yy);
      }
      const yc = y0 + LAB + 2 * (C + PAD);
      R.text(rgb, W, Hh, x0 + 2, yc, `N ${m.counts.join('/')}`, [235, 220, 120], 1);
      if (fl === 'lotus') R.text(rgb, W, Hh, x0 + 2, yc + 9, `BODY ${m.body.toFixed(2)} WHOLE ${m.whole.toFixed(2)}`, [235, 220, 120], 1);
      else R.text(rgb, W, Hh, x0 + 2, yc + 9, `${m.tris} TRIS`, [235, 220, 120], 1);
    }
  }
  R.writePng(out, W, Hh, rgb);
  console.log(`wrote ${out}`);
}

const argv = process.argv.slice(2);
if (argv[0] === '--write') {
  const [, opt, dir] = argv;
  fs.writeFileSync(path.join(dir, 'bloom-geometry.js'), patchedGeometry(opt));
  console.log(`option ${opt} written into ${dir}`);
} else if (argv[0] === '--measure') await cmdMeasure();
else if (argv[0] === '--interactions') await cmdInteractions();
else if (argv[0] === '--sheet') { const pi = argv.indexOf('--photos'); await cmdSheet(argv[1], pi >= 0 ? argv[pi + 1] : null); }
else if (argv.length) { console.error('usage: --measure [--quick] [--opts=main,A,B,C] | --interactions | --write <A|B|C|A-broken> <dir> | --sheet <png> [--photos <dir>]'); process.exit(2); }
