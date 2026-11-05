#!/usr/bin/env node
/* ===================================================================
   #495 — WHERE A WHORL'S RING GOES UNDER PER-LAYER VALUES: FOUR OPTIONS,
   PROTOTYPED, MEASURED AND RENDERED SIDE BY SIDE. NOTHING HERE SHIPS.
   (read §15 of docs/bloom-photo-to-bloom-discovery.md and evawm898/Portfolio-Site#495)

   THE DEFECT. With Per-layer values ON, a whorl's ring is placed by
   `footRing()`'s `ringFactor`: the hidden `layerSize` ramp (`layerSize^L`,
   default 0.72 because the control hides) unless the layer OWNS its width, in
   which case `own width / Petal width` (Eva's Oct 16 ruling; a ring past the
   outer one GROWS THE HUB, her third Oct 16 ruling). So a ring cannot be
   chosen without choosing the petal width: the lotus's broad body petals
   cannot stand on small rings.

   THE OPTIONS, each an ANCHORED EDIT of a temporary copy of the shipped
   modules (every anchor must match exactly once, or the run refuses):
     A  a per-layer OWNED RING (a fraction of the area rule's ring R0). Absent,
        the ring is today's derived value, by branch. A ring past R0 grows the
        hub (the Oct 16 hub ruling, kept). PROTOTYPED IN THE GEOMETRY ONLY: the
        ring rides the build's layer scope as `ring` — no registry control, no
        design-file field and no page (how it would ship is §15's).
     B  a layer's own LENGTH places its ring (`own length / Petal length`,
        layer 0 at R0), ahead of its width; a ring past R0 grows the hub.
        Supersedes the RING half of the Oct 16 width ruling (the foot still
        follows the width).
     C  Layer size stays LIVE (unhidden) under Per-layer values. A registry
        edit only: the geometry already reads it for every layer that does not
        own its width, and an owned width still places its ring (Oct 16 kept).
     D  (the code's suggestion) Layer size is LIVE and is the ring's ONE owner
        under Per-layer values: every ring is `R0 x layerSize^L`; an owned
        width sets the foot and the blade only. Supersedes the RING half of the
        Oct 16 width ruling; the hub ruling becomes unreachable (no ring can
        pass R0: layerSize <= 0.90).

   RUN:  node tools/bloom-ring-options.mjs --measure [--quick]
           builds every option's flowers (lotus from S5 v9, daisy and water
           lily v7) in EXPORT mode and prints rings, hub, proportions, the
           1.0 mm rim floor, the census and the combination gate's wall measure
         node tools/bloom-ring-options.mjs --write <option> <dir>
           writes that option's patched bloom-geometry.js and bloom-registry.js
           into <dir> (a git worktree of the base), for the page-side checks
         node tools/bloom-ring-options.mjs --sheet <png> [--photos <dir>]
           renders the side-by-side sheet (the soft renderer: deterministic,
           export mesh — the print preview). Without --photos the photo column
           is a placeholder (the photos are never committed — Eva's ruling).
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SET = path.join(ROOT, 'docs/photo-to-bloom/eva-set');

/* THE EDITS. `from` is copied from the shipped file and must occur exactly once. */
const RING_LINE = 'const ringFactor = ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;';
const PUSH_LINE = 'raw.push({ lambda: L, scale, authoredWidth, width, rFoot, footCount, ownWidth, ringFactor });';
const GROW_LINE = 'if (raw[k].ownWidth !== null && raw[k].ringFactor > growFactor)';
const LS_VIS = "    /* hidden under Per-layer values (Q3.5): a layer given its own size owns it (blade, foot and ring, Oct 16); a layer with none still takes the shrink */\n    visibleWhen: { all: [{ id: 'layerCount', min: 2 }, { not: { ref: 'scopeLayersLive' } }] } },";
const LS_LIVE = "    /* #495 PROTOTYPE: Layer size stays live under Per-layer values */\n    visibleWhen: { all: [{ id: 'layerCount', min: 2 }] } },";
/* C and D unhide Layer size, and the harness asserts at MODULE LOAD that both
   ramp controls hide exactly when per-layer values are live (Q3.5) — so either
   option owes that statement a change (Layer tilt keeps it). For the
   prototype's page-side checks the statement is narrowed to Layer tilt. */
const HARNESS_Q35 = "if (layerCount >= 2 && shown === owned) bad.push(";
const HARNESS_Q35_C = "if (layerCount >= 2 && shown === owned && c.id !== 'layerSize') bad.push(";
export const OPTIONS = {
  A: {
    title: 'A — an owned ring per layer', geometry: [
      [RING_LINE, `const ownRing = tierScopes && scopeLayersLive(state) ? (((tierScopes.layers || []).find((e) => e.layer === L && typeof e.ring === 'number')) || {}).ring ?? null : null;
    const ringFactor = ownRing !== null ? ownRing : ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;`],
      [PUSH_LINE, 'raw.push({ lambda: L, scale, authoredWidth, width, rFoot, footCount, ownWidth, ringFactor, ownRing });'],
      [GROW_LINE, 'if ((raw[k].ownWidth !== null || raw[k].ownRing != null) && raw[k].ringFactor > growFactor)'],
    ], registry: [],
  },
  B: {
    title: 'B — an owned length places the ring', geometry: [
      [RING_LINE, `const ownLength = own && 'petalLength' in own ? own.petalLength : null;
    const ringFactor = ownLength !== null ? (L === 0 ? 1 : ownLength / state.petalLength) : ownWidth === null ? scale : L === 0 ? 1 : ownWidth / state.petalWidth;`],
      [PUSH_LINE, 'raw.push({ lambda: L, scale, authoredWidth, width, rFoot, footCount, ownWidth, ringFactor, ownLength });'],
      [GROW_LINE, 'if ((raw[k].ownWidth !== null || raw[k].ownLength != null) && raw[k].ringFactor > growFactor)'],
    ], registry: [],
  },
  C: { title: 'C — Layer size stays live', geometry: [], registry: [[LS_VIS, LS_LIVE]], harness: [[HARNESS_Q35, HARNESS_Q35_C]] },
  D: {
    title: 'D — Layer size owns every ring', geometry: [[RING_LINE, 'const ringFactor = scale;']],
    registry: [[LS_VIS, LS_LIVE]], harness: [[HARNESS_Q35, HARNESS_Q35_C]],
  },
};
function edit(src, edits, file, opt) {
  for (const [from, to] of edits) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`option ${opt}: anchor matches ${n} times in ${file} (want exactly 1): ${from.slice(0, 80)}`);
    src = src.replace(from, to);
  }
  return src;
}
export function patchedSources(opt) {
  const o = OPTIONS[opt];
  return {
    'bloom-geometry.js': edit(fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8'), o.geometry, 'bloom-geometry.js', opt),
    'bloom-registry.js': edit(fs.readFileSync(path.join(ROOT, 'bloom-registry.js'), 'utf8'), o.registry, 'bloom-registry.js', opt),
    'tools/bloom-harness.mjs': edit(fs.readFileSync(path.join(ROOT, 'tools/bloom-harness.mjs'), 'utf8'), o.harness || [], 'tools/bloom-harness.mjs', opt),
  };
}
/* a tree to import: the shipped modules with the option's two files replaced */
async function loadTree(opt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ring-${opt || 'main'}-`));
  for (const f of ['bloom-geometry.js', 'bloom-registry.js', 'bloom-file.js', 'bloom-curve.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  if (opt) for (const [f, s] of Object.entries(patchedSources(opt))) if (!f.includes('/')) fs.writeFileSync(path.join(dir, f), s);
  const G = await import(pathToFileURL(path.join(dir, 'bloom-geometry.js')).href);
  const F = await import(pathToFileURL(path.join(dir, 'bloom-file.js')).href);
  return { G, F, dir };
}

/* THE FLOWERS. The lotus is S5 v9 with its broad inner petals KEPT BROAD, and
   each option's own way of pulling the body's rings in; the daisy and the water
   lily are v7 as committed (nothing regresses — or the table says what does). */
const read = (f, v) => JSON.parse(fs.readFileSync(path.join(SET, f, `${f}-${v}.subset.bloom-design.json`), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const layerOf = (sub, L) => sub.overrides.layers.find((e) => e.layer === L);
/* the option-specific lotus: `knob` is the option's one free number (A: the
   owned rings, C / D: Layer size), chosen by `--measure`'s sweep and written here */
export const LOTUS_KNOBS = { A: { rings: { 2: 0.64, 3: 0.51 } }, C: { layerSize: 0.84 }, D: { layerSize: 0.8 } };
function lotusFor(opt, knob = LOTUS_KNOBS[opt]) {
  const s = read('lotus', 'v9');
  if (opt === 'C') {
    /* C keeps the width ruling, so a ring can move only where the layer does
       NOT own its width: L2 / L3 drop their owned widths and take the ramp
       (their blades narrow with the ring — the coupling C does not break) */
    s.controls.layerSize = knob.layerSize;
    for (const L of [2, 3]) delete layerOf(s, L).offsets.petalWidth;
  }
  if (opt === 'D') s.controls.layerSize = knob.layerSize;
  return { subset: s, rings: opt === 'A' ? knob.rings : null };
}
function flowersFor(opt) {
  return [
    { flower: 'lotus', label: opt ? `v9 + option ${opt}` : 'S5 v9', ...(opt ? lotusFor(opt) : { subset: read('lotus', 'v9'), rings: null }) },
    { flower: 'daisy', label: 'v7 as written', subset: read('daisy', 'v7'), rings: null },
    { flower: 'waterlily', label: 'v7 as written', subset: read('waterlily', 'v7'), rings: null },
  ];
}

async function build(T, f, { captureGrid = false } = {}) {
  const r = T.F.readNewDesign(f.subset);
  if (!r.ok) throw new Error(`${f.flower}: ${r.error}`);
  const scopes = T.F.scopesForBuild(r.doc.overrides);
  if (f.rings) for (const [L, x] of Object.entries(f.rings)) { const e = scopes.layers.find((q) => q.layer === Number(L)); e.ring = x; }
  const acc = new T.G.MeshBuilder({ exportMode: true, captureGrid, captureRim: captureGrid });
  const b = T.G.buildBloomInto(acc, r.doc.controls, { below: null, scopes });
  return { acc, b, notes: r.notes.length, hidden: r.notes.filter((n) => n.kind === 'hidden').map((n) => n.id || n.text) };
}
/* §11.6's measure: the export mesh, each petal by its own emitted range; the
   BODY is the inner half of the layers */
function measure({ acc, b }) {
  const P = acc.positions;
  const all = (b.petalsAll || []).filter((p) => p && p.triRange);
  const nR = Math.max(...all.map((p) => p.whorl)) + 1;
  const ext = (ps) => { let zl = Infinity, zh = -Infinity, rr = 0; for (const p of ps) { const [a, c] = p.triRange; for (let t = a; t < c; t++) for (let j = 0; j < 9; j += 3) { const i = t * 9 + j; zl = Math.min(zl, P[i + 2]); zh = Math.max(zh, P[i + 2]); rr = Math.max(rr, Math.hypot(P[i], P[i + 1])); } } return { h: zh - zl, w: 2 * rr }; };
  const whole = ext(all), body = ext(all.filter((p) => p.whorl >= Math.ceil(nR / 2)));
  const fr = b.foot || {};
  const rings = (fr.rings || []).map((r) => r.radius);
  /* the 1.0 mm rim floor (E1's bar, min(RIM_FLOOR_MM, the body) — read off every
     treated profile's own apex record; a profile under it is a CLAMP the builder
     declared, or a finding) */
  let thin = Infinity, under = 0, declared = 0, profiles = 0;
  for (const p of all) for (const a of (p.rim && p.rim.apex) || []) {
    profiles++;
    const t = Math.hypot(a.top[0] - a.bot[0], a.top[1] - a.bot[1], a.top[2] - a.bot[2]);
    thin = Math.min(thin, t);
    if (t < Math.min(1.0, a.bodyMm) - 1e-6) { if (a.clamped) declared++; else under++; }
  }
  /* the builder's own neighbour flag (`neighbourFlag`): the nearest approach of two
     DIFFERENT petals' laminae, skin to skin — negative where they pass through
     each other (the accepted look, ruling 1 of the variance discovery); the
     feet's nearest pair. Moving rings in moves these, and only these. */
  const nb = b.neighbour || {};
  const neighbour = nb.blade ? { skinGapMm: nb.blade.skinGapMm, pair: nb.blade.pair, crossing: nb.blade.crossing, feetD: nb.feet ? nb.feet.d : null, feetQ: nb.feet ? nb.feet.q : null } : null;
  return { neighbour, whole: whole.h / whole.w, wholeMm: [whole.h, whole.w], body: body.h / body.w, bodyMm: [body.h, body.w], rings, hub: fr.hub ? fr.hub.radius : null, hubGrowth: fr.hub ? fr.hub.growth : null, tris: P.length / 9, rim: { profiles, thin, under, declared } };
}

async function cmdMeasure() {
  const { census } = await import('./bloom-self-intersection.mjs');
  const W = await import('./bloom-wall-thickness.mjs');
  const QUICK = process.argv.includes('--quick');
  const rows = [];
  for (const opt of [null, 'A', 'B', 'C', 'D']) {
    const T = await loadTree(opt);
    for (const f of flowersFor(opt)) {
      const B = await build(T, f, { captureGrid: !QUICK });
      const m = measure(B);
      const c = QUICK ? null : census(B.acc.positions, {});
      let wall = null;
      if (!QUICK) {
        wall = {};
        for (const p of B.b.petalsAll || []) {
          if (!p || !p.grid) continue;
          const ap = p.tipCap && p.tipCap.apex;
          const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
          const w = W.measureWall(p.grid, { nibFromU });
          if (!(p.whorl in wall) || w.self < wall[p.whorl]) wall[p.whorl] = w.self;
        }
      }
      rows.push({ opt: opt || 'main', flower: f.flower, label: f.label, notes: B.notes, hidden: B.hidden, ...m, within: c ? c.within : null, span: c ? c.worstSpanMm : null, wall });
      const fmt = (x, d = 3) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
      console.log(`${(opt || 'main').padEnd(4)} ${f.flower.padEnd(9)} ${f.label.padEnd(14)} notes ${B.notes}${B.hidden.length ? ` (hidden ${B.hidden.join(',')})` : ''} · rings ${m.rings.map((r) => r.toFixed(2)).join(' / ')} mm · hub ${fmt(m.hub, 2)}${m.hubGrowth ? ` (GROWN by ${m.hubGrowth.byMm.toFixed(2)} for layer ${m.hubGrowth.layer})` : ''} · body h:w ${fmt(m.body)} (${m.bodyMm.map((x) => x.toFixed(1)).join(' x ')}) · whole ${fmt(m.whole)} · tris ${m.tris}`);
      if (!QUICK) console.log(`       rim: ${m.rim.profiles} profiles, thinnest ${fmt(m.rim.thin, 4)} mm, ${m.rim.under} UNDECLARED under the floor, ${m.rim.declared} declared clamps · census ${c.within} within-shell pairs (worst span ${fmt(c.worstSpanMm, 4)} mm) · neighbour skin gap ${m.neighbour ? fmt(m.neighbour.skinGapMm) : 'n/a'} mm (petals ${m.neighbour ? m.neighbour.pair.join('/') : ''}), feet nearest ${m.neighbour && m.neighbour.feetD !== null ? fmt(m.neighbour.feetD, 2) : 'n/a'} mm · wall self ${Object.entries(wall).map(([k, v]) => `L${k} ${v.toFixed(3)}`).join(' · ')}`);
    }
  }
  return rows;
}

/* the sweep that chose LOTUS_KNOBS — the body h:w per knob value, against the photo's ≈ 1.45 */
async function cmdSweep() {
  for (const opt of ['A', 'C', 'D']) {
    const T = await loadTree(opt);
    const knobs = opt === 'A'
      ? [[0.8, 0.7], [0.7, 0.6], [0.66, 0.54], [0.62, 0.48], [0.58, 0.44], [0.55, 0.4], [0.5, 0.36]].map(([a, b]) => ({ rings: { 2: a, 3: b } }))
      : [0.9, 0.84, 0.8, 0.78, 0.76, 0.74, 0.72, 0.68, 0.64].map((x) => ({ layerSize: x }));
    for (const k of knobs) {
      const { subset, rings } = (() => { const l = lotusFor(opt, k); return l; })();
      const m = measure(await build(T, { flower: 'lotus', subset, rings }));
      console.log(`${opt} ${JSON.stringify(k)} -> body h:w ${m.body.toFixed(3)} (${m.bodyMm.map((x) => x.toFixed(1)).join(' x ')}) whole ${m.whole.toFixed(3)} rings ${m.rings.map((r) => r.toFixed(2)).join('/')}`);
    }
  }
}

/* THE SHEET — the export mesh through the soft renderer (deterministic: no
   pixel control is owed), at the photo's own two angles (bloom-photo-s2.mjs's
   VIEWS, restated here because that tool runs on import) */
const VIEWS = {
  daisy: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -0.9, 0.42], up: [0, 0, 1] } },
  lotus: { front: { dir: [0.0, -0.62, 0.79], up: [0, 0, 1] }, side: { dir: [0.0, -1, 0.05], up: [0, 0, 1] } },
  waterlily: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -1, 0.14], up: [0, 0, 1] } },
};
async function cmdSheet(out, photos) {
  const R = await import('./bloom-soft-render.mjs');
  const C = 230, PAD = 6, LAB = 20;
  const cols = ['photo', null, 'A', 'B', 'C', 'D'];
  const flowers = ['lotus', 'daisy', 'waterlily'];
  const W = cols.length * (C + PAD) + PAD, Hh = flowers.length * 2 * (C + PAD) + flowers.length * LAB + 40;
  const rgb = Buffer.alloc(W * Hh * 3, 18);
  R.text(rgb, W, Hh, PAD, 8, '#495 RING OPTIONS - PROTOTYPES, NOT SHIPPED - EXPORT MESH (PRINT PREVIEW)', [235, 235, 230], 2);
  const trees = {}, frames = {};
  for (const c of cols) if (c !== 'photo') trees[c || 'main'] = await loadTree(c);
  let decodePng = null;
  if (photos) decodePng = (await import('./pngdec.mjs')).decodePNG;
  for (let fi = 0; fi < flowers.length; fi++) {
    const fl = flowers[fi];
    const y0 = 34 + fi * (2 * (C + PAD) + LAB);
    for (let ci = 0; ci < cols.length; ci++) {
      const c = cols[ci], x0 = PAD + ci * (C + PAD);
      const head = c === 'photo' ? `${fl}` : c === null ? (fl === 'lotus' ? 'MAIN S5 V9' : 'MAIN V7') : `OPTION ${c}`;
      R.text(rgb, W, Hh, x0, y0, head, [200, 220, 215], 2);
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
      const T = trees[c || 'main'];
      const f = flowersFor(c).find((q) => q.flower === fl);
      const B = await build(T, f);
      const m = measure(B);
      const P = B.acc.positions;
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
      /* ONE FRAME PER FLOWER — the main tree's own build, taken in its column
         (which comes before the options') — so a grown hub or a pulled-in ring
         reads at one scale across the row */
      if (c === null) frames[fl] = { center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], half: 0.6 * Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) };
      const { center, half } = frames[fl];
      for (let vi = 0; vi < 2; vi++) {
        const v = ['front', 'side'][vi], yy = y0 + LAB + vi * (C + PAD);
        const img = R.render(P, C, C, { ...VIEWS[fl][v], center, halfHeight: half });
        R.blit(rgb, W, Hh, img, C, C, x0, yy);
      }
      const cap = fl === 'lotus' ? `BODY ${m.body.toFixed(2)} WHOLE ${m.whole.toFixed(2)}` : `RINGS ${m.rings.map((r) => r.toFixed(1)).join(' ')}`;
      R.text(rgb, W, Hh, x0 + 4, y0 + LAB + 2 * (C + PAD) - PAD - 14, cap, [235, 220, 120], 1);
    }
  }
  R.writePng(out, W, Hh, rgb);
  console.log(`wrote ${out}`);
}

const argv = process.argv.slice(2);
if (argv[0] === '--write') {
  const [, opt, dir] = argv;
  for (const [f, s] of Object.entries(patchedSources(opt))) fs.writeFileSync(path.join(dir, f), s);
  console.log(`option ${opt} written into ${dir}`);
} else if (argv[0] === '--measure') await cmdMeasure();
else if (argv[0] === '--sweep') await cmdSweep();
else if (argv[0] === '--sheet') { const pi = argv.indexOf('--photos'); await cmdSheet(argv[1], pi >= 0 ? argv[pi + 1] : null); }
else if (argv.length) { console.error('usage: --measure [--quick] | --sweep | --write <A|B|C|D> <dir> | --sheet <png> [--photos <dir>]'); process.exit(2); }
