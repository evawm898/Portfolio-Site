#!/usr/bin/env node
/* bloom-leaf-tip-neck.mjs — THE TIP-NECK INSTRUMENT (leaf/stem build S5b,
   Eva's ruling of Oct 11: "where a tooth pair would neck the converging tip,
   the tip gives that pair up"). docs/bloom-leaf-tip-neck-outcome.md.

   WHAT IT MEASURES, on ANY tree (`--root`), from that tree's OWN profile and
   lobe layout — never from the S5b geometry's `tipNeck` record, which is the
   quantity under test:
     for every built leaf blade (a SIMPLE leaf, each COMPOUND leaflet, a LOBED
     chevron), every MARGIN period of its teeth, from the apex down: the
     notch's worst fraction of the way to the midrib — the cut against the
     base outline it is cut from, `(base - law) / base`, off the nib (where no
     tooth is drawn) — and the pairs the RESTATED rule gives up: walking down
     from the apex while the sinus lies past the blade's widest point, a pair
     whose fraction is past the BAR is given up and the walk goes on; the
     first pair at or under it stops it. The bar is half, or the BODY's own
     deepest tooth (below the widest point, the root-most period excepted)
     where that is deeper: a tip is necked only where it is parted MORE than
     the blade's own serration parts it.

   THE CRITERION IS RESTATED, NOT IMPORTED. A notch past halfway to the midrib
   parts the blade (`NECK_HALF`, the definition). Each period's cut uses only
   that period's own relief, so the walk is exact on a tree that has no
   give-up at all — which is what lets the BASE tree predeclare the movers.

   SAMPLING, NAMED: each period is sampled at `SAMPLES` (2,048) stations,
   four times the geometry's 512; a sampled maximum reads LOW, so a state the
   two disagree on sits within the samplers' own bias of the bar and is
   REPORTED, never decided here.

   `--rows <regex>` prints every matching live-matrix row's give-ups (default:
   every row that builds a leaf); `--defaults` prints the three default
   blades' full fraction tables (the outcome doc's §1 table). */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const NECK_HALF = 1 / 2;
const SAMPLES = 2048;

/* the blade profiles a tree builds, rebuilt through its OWN exported law */
function bladeProfiles(G, st, built, plan) {
  const out = [];
  const acc = new G.MeshBuilder({ exportMode: true });
  const lengths = plan.nodeLengthsMm ? plan.azimuths.flatMap((a, k) => a.map(() => plan.nodeLengthsMm[k])) : built.map(() => plan.lengthMm);
  built.forEach((L, i) => {
    if (!L) return;
    if (L.leaflets) {
      for (const q of L.leaflets) {
        const bs = G.leafletBladeState(st, q.lengthMm, q.widthMm);
        const cap = { petiole: true, rowCapacity: G.LEAF_BLADE_ROWS, toothReliefFloorMm: G.MIN_FEATURE_MM };
        out.push({ leaf: i, type: 'COMPOUND', role: q.role, lengthMm: q.lengthMm,
          prof: G.widthProfile(bs, { width: 0, thickness: st.sheetThickness }, q.widthMm / 2, cap, acc, q.lengthMm) });
      }
      return;
    }
    const Lmm = lengths[i];
    if (L.lobed) { out.push({ leaf: i, type: 'LOBED', lengthMm: Lmm, prof: G.lobedOutline(st, Lmm, true).prof }); return; }
    const bs = G.leafBladeState({ ...st, leafLength: Lmm });
    const cap = { petiole: true, rowCapacity: G.LEAF_BLADE_ROWS, toothReliefFloorMm: G.MIN_FEATURE_MM };
    out.push({ leaf: i, type: 'SIMPLE', lengthMm: Lmm, prof: G.widthProfile(bs, { width: 0, thickness: st.sheetThickness }, Number(plan.widthMm) / 2, cap, acc, Lmm) });
  });
  return out;
}

/* every margin period's worst fraction, apex first, and the restated walk */
export function neckWalk(prof) {
  const lb = prof.lobes;
  if (!lb || lb.noRoom || !Array.isArray(lb.sinusU) || !lb.sinusU.length) return null;
  const periods = [];
  for (let k = lb.sinusU.length - 1; k >= 0; k--) {
    const a = lb.crestU[k] === undefined ? 0 : lb.crestU[k], b = lb.crestU[k + 1] === undefined ? 1 : lb.crestU[k + 1];
    let frac = 0, atU = lb.sinusU[k];
    for (let i = 0; i <= SAMPLES; i++) {
      const u = a + ((b - a) * i) / SAMPLES;
      if (prof.onNib(u)) continue;
      const base = prof.halfWidthBaseAt(u), law = prof.shapeAt(u);
      if (!(base > 0)) continue;
      const f = (base - law) / base;
      if (f > frac) { frac = f; atU = u; }
    }
    periods.push({ k, sinusU: lb.sinusU[k], spanU: [a, b], fraction: frac, atU, tip: lb.sinusU[k] > prof.uPk });
  }
  /* the BODY's own teeth: below the widest point, the root-most period (k 0,
     from the treated arc's root end) excepted */
  const bodyFraction = periods.filter((p) => !p.tip && p.k > 0).reduce((m, p) => Math.max(m, p.fraction), 0);
  const bar = Math.max(NECK_HALF, bodyFraction);
  const given = [];
  for (const p of periods) { if (!p.tip || !(p.fraction > bar)) break; given.push(p.sinusU); }
  return { periods, given, bodyFraction, bar, countBuilt: lb.countBuilt };
}

/* the whole build: every blade's walk, through the tree's own plan chain */
export function tipNeckOf(G, st) {
  if (G.leafIsAbsent && G.leafIsAbsent(st)) return { blades: [], given: 0 };
  const acc = new G.MeshBuilder({ exportMode: true });
  const fr = G.footRing(st, acc);
  if (!fr.hub) return { blades: [], given: 0 };
  const sp = G.stemPlan(st, fr.hub, acc);
  const ip = G.inflorescencePlan(st, sp, acc);
  const lp = G.leafPlan(st, sp, acc, ip, ip && ip.present ? ip.unitMemo : null);
  if (!(lp.present && lp.built > 0)) return { blades: [], given: 0 };
  const b = G.buildBloomInto(new G.MeshBuilder({ exportMode: true }), st);
  const blades = bladeProfiles(G, st, b.leavesBuilt || [], lp).map((x) => ({ ...x, walk: neckWalk(x.prof) }));
  return { blades, given: blades.reduce((n, x) => n + (x.walk ? x.walk.given.length : 0), 0) };
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const argv = process.argv.slice(2);
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const TREE = path.resolve(opt('--root') || ROOT);
  const G = await import(pathToFileURL(path.join(TREE, 'bloom-geometry.js')).href);
  const R = await import(pathToFileURL(path.join(TREE, 'bloom-registry.js')).href);
  if (argv.includes('--defaults')) {
    const C = { 'SIMPLE (46 mm, the default leaf)': { leafLength: 46, stemLength: 70, stemDiameter: 6, leafNodes: 1 },
      'the MUM (LOBED, 46 mm)': { leafLength: 46, leafType: 'LOBED', stemLength: 70, stemDiameter: 6, leafNodes: 1 },
      'the ROSE, leaflets toothed at 0.26': { leafType: 'COMPOUND', leafLength: 40, stemLength: 90, stemDiameter: 6, leafNodes: 1, leafletToothDepth: 0.26 } };
    for (const [nm, o] of Object.entries(C)) {
      const r = tipNeckOf(G, { ...R.DEFAULTS, ...o });
      const x = r.blades.find((q) => q.type !== 'COMPOUND' || q.role === 'terminal');
      console.log(`${nm}: ${x.walk ? `${x.walk.countBuilt} laid out, ${x.walk.given.length} pair(s) given` : 'no teeth'}`);
      if (x.walk) console.log(`   bar ${(100 * x.walk.bar).toFixed(1)}% (half, or the body's own deepest tooth ${(100 * x.walk.bodyFraction).toFixed(1)}%)`);
      if (x.walk) for (const p of x.walk.periods) console.log(`   sinus u ${p.sinusU.toFixed(4)}  ${(100 * p.fraction).toFixed(1)}% of the way to the midrib${p.tip ? '' : '  (below the widest point)'}${x.walk.given.includes(p.sinusU) ? '  NECK -> given up' : ''}`);
    }
    process.exit(0);
  }
  const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
  const re = new RegExp(opt('--rows') || '.');
  let n = 0, movers = 0;
  for (const row of H.buildMatrix()) {
    if (!re.test(row.label)) continue;
    const set = Object.fromEntries(row.set.map((w) => [w.id, Number.isFinite(Number(w.value)) && w.value !== '' ? Number(w.value) : w.value]));
    let r;
    try { r = tipNeckOf(G, { ...R.DEFAULTS, ...set }); } catch (e) { console.log(`THREW ${row.label}: ${e.message}`); continue; }
    if (!r.blades.length) continue;
    n++;
    if (r.given) movers++;
    const kinds = [...new Set(r.blades.map((x) => x.type))].join('+');
    const near = r.blades.flatMap((x) => (x.walk ? x.walk.periods.filter((p) => p.tip && Math.abs(p.fraction - x.walk.bar) < 0.005) : []));
    console.log(`${r.given ? 'GIVES' : 'keeps'} ${String(r.given).padStart(3)}  ${kinds.padEnd(9)} ${row.label}${near.length ? `  [${near.length} tip period(s) within 0.005 of the bar]` : ''}`);
  }
  console.log(`${n} rows build a leaf; ${movers} give at least one pair up`);
}
