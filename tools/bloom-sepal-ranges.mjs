#!/usr/bin/env node
/* ===================================================================
   tools/bloom-sepal-ranges.mjs — the measurement behind the sepal-only
   bounds (Eva's §9 rulings, Oct 9; docs/bloom-sepal-discovery.md §10).

   ONE MEASURE, ONE OWNER OF IT: `sepal-self` is the wall instrument's own
   `measureWall(grid).self` (imported, never re-implemented) read on EVERY
   sepal the builder emitted and the smallest taken — the quantity R6 put in
   the defaults bar, the wall instrument and the combination gate. EXPORT mode,
   the shipped whorl: `sepalCount` 5, every other control at DEFAULTS (size
   0.60, interleaved, angle 0). The bar is `MIN_FEATURE_MM`, imported.

     node tools/bloom-sepal-ranges.mjs --roll      roll ALONE over its whole petal
                                                   range, 5-degree steps, with the
                                                   census beside the gap; prints
                                                   the last clear step each side
     node tools/bloom-sepal-ranges.mjs --corners   the 26 multi-control corners of
                                                   the five form maxima (cup, cup
                                                   gradient, roll, curl, twist),
                                                   roll at its CURRENT sepal max
     node tools/bloom-sepal-ranges.mjs --allmax    the smallest cuts that bring the
                                                   all-max state over the bar,
                                                   trimming 3, 4 or 5 ranges by
                                                   one common fraction (options
                                                   B / C / D of §10.3)
     node tools/bloom-sepal-ranges.mjs --control   the shipped roll bound, re-proved
                                                   from both sides and on both
                                                   measures: AT each bound the gap
                                                   clears and the census reads 0;
                                                   ONE STEP PAST each bound the
                                                   census folds (the gap cannot see
                                                   +185 or any negative roll); at
                                                   +195 the gap is under too. Exit
                                                   1 if any of it fails to hold
     --json <file>                                 write every reading

   WHAT IT DOES NOT SAY. It reads ONE state family (the shipped whorl at one
   size, on the default petals) and the SELF-APPROACH only: the census of the
   same states is printed beside it on `--roll` because the two disagree —
   a clearing gap is never a claim that the solid does not pass through itself
   (CLAUDE.md, the combination gate: "`self` IS NOT THE CENSUS"). And a
   one-dimensional fraction is ONE line through a five-dimensional box, so the
   option cuts are the smallest ALONG THAT LINE, not a global optimum. The
   options were measured at roll 190 (the gap-only bound first proposed); they
   are re-run at the shipped bound by `--allmax`, which reads the registry. NOT
   IN CI — a measurement tool; `--control` is its must-fail.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { measureWall } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-wall-thickness.mjs')).href);
const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
const BAR = G.MIN_FEATURE_MM;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

export function sepalSelf(set, { withCensus = false } = {}) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, { ...DEFAULTS, sepalCount: 5, ...set });
  const built = m.sepals && m.sepals.built ? m.sepals.built.filter((p) => p && p.grid) : [];
  if (!built.length) throw new Error(`no sepal built for ${JSON.stringify(set)} — the measure would read nothing`);
  let best = null;
  for (const p of built) {
    const ap = p.tipCap && p.tipCap.apex;
    const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
    const r = measureWall(p.grid, { nibFromU });
    if (!best || r.self < best.self) best = r;
  }
  const out = { self: best.self, wall: best.wall, tris: acc.positions.length / 9 };
  if (withCensus) { const c = census(new Float64Array(acc.positions)); out.within = c.within; out.worstSpanMm = c.worstSpanMm; }
  return out;
}

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ctl = (id) => CONTROLS.find((c) => c.id === id);
if (IS_MAIN) {
const PETAL_ROLL = ctl('petalRoll');
const report = {};

if (has('--roll')) {
  const rows = [];
  for (let r = PETAL_ROLL.min; r <= PETAL_ROLL.max; r += PETAL_ROLL.step) {
    const b = sepalSelf({ sepalRoll: r }, { withCensus: true });
    rows.push({ roll: r, ...b });
    console.log(`roll ${String(r).padStart(5)}  self ${b.self.toFixed(4)}  wall ${b.wall.toFixed(4)}  census ${String(b.within).padStart(5)} pairs / ${b.worstSpanMm.toFixed(4)} mm${b.self < BAR ? '   UNDER' : ''}`);
  }
  const clearPos = rows.filter((x) => x.roll >= 0);
  let lastPos = null; for (const x of clearPos) { if (x.self < BAR) break; lastPos = x.roll; }
  let lastNeg = null; for (const x of rows.filter((x) => x.roll <= 0).reverse()) { if (x.self < BAR) break; lastNeg = x.roll; }
  const censusClearPos = (() => { let l = null; for (const x of clearPos) { if (x.within > 0) break; l = x.roll; } return l; })();
  console.log(`\nroll alone: last clear step ${lastPos} on the positive side, ${lastNeg} on the negative (bar ${BAR} mm on sepal-self)`);
  console.log(`census: the last positive step with 0 within-shell pairs is ${censusClearPos}`);
  report.roll = { rows, lastClearPos: lastPos, lastClearNeg: lastNeg, censusClearPos };
}

const FORM = [['sepalCup', 1.2, 0.01], ['sepalCupGradient', 1.2, 0.01], ['sepalRoll', ctl('sepalRoll').max, 5], ['sepalSpineCurl', 360, 5], ['sepalTwist', 180, 5]];
for (const [id, max] of FORM) if (ctl(id).max !== max) throw new Error(`${id}'s registry max is ${ctl(id).max}, this tool expects ${max}`);

if (has('--corners')) {
  const rows = [];
  for (let m = 0; m < 32; m++) {
    const set = {}; const on = [];
    FORM.forEach(([id, max], i) => { if (m & (1 << i)) { set[id] = max; on.push(id); } });
    if (on.length < 2) continue;
    const b = sepalSelf(set);
    rows.push({ on, set, self: b.self });
  }
  rows.sort((a, b) => a.self - b.self);
  for (const r of rows) console.log(`${r.self.toFixed(4)}${r.self < BAR ? ' UNDER' : ' clear'}  ${r.on.map((id) => id.replace('sepal', '')).join(' x ')}`);
  report.corners = rows;
}

if (has('--allmax')) {
  const snap = (v, step) => Math.round(Math.floor(v / step + 1e-9) * step * 100) / 100;
  const at = (trim, l) => Object.fromEntries(FORM.map(([id, max, step]) => [id, trim.includes(id) ? snap(max * l, step) : max]));
  const OPTIONS = [
    ['B', 'three ranges (cup and cup gradient kept)', ['sepalRoll', 'sepalSpineCurl', 'sepalTwist']],
    ['C', 'four ranges (cup gradient kept)', ['sepalCup', 'sepalRoll', 'sepalSpineCurl', 'sepalTwist']],
    ['D', 'all five', FORM.map(([id]) => id)],
  ];
  report.allmax = { asIs: sepalSelf(at([], 1)).self, options: [] };
  console.log(`all-max as the ranges stand: ${report.allmax.asIs.toFixed(4)} mm`);
  for (const [tag, what, trim] of OPTIONS) {
    /* the largest common fraction, in 0.01 steps, at which the all-max corner
       clears — scanned DOWN from 1 so the first clear is the answer along the
       line, in 0.05 steps above 0.40 and 0.01 steps below it (every coarse
       reading above 0.30 is under the bar by an order of magnitude); the scan
       is not assumed monotone, it reports what it read */
    let found = null;
    const ks = []; for (let k = 100; k > 40; k -= 5) ks.push(k); for (let k = 40; k >= 5; k--) ks.push(k);
    for (const k of ks) {
      const s = at(trim, k / 100); const b = sepalSelf(s);
      if (b.self >= BAR) { found = { fraction: k / 100, set: s, self: b.self }; break; }
    }
    report.allmax.options.push({ tag, what, trim, ...found });
    console.log(`${tag} ${what}: fraction ${found && found.fraction} -> ${found && JSON.stringify(found.set)} reads ${found && found.self.toFixed(4)} mm`);
  }
}

if (has('--control')) {
  /* THE BOUND'S OWN MUST-PASS AND MUST-FAILS, against the REGISTRY's bound
     (the control the panel draws), never a number typed here. */
  const r = ctl('sepalRoll'), step = r.step;
  const legs = [];
  const at = (roll) => sepalSelf({ sepalRoll: roll }, { withCensus: true });
  for (const [end, v] of [['max', r.max], ['min', r.min]]) {
    const inside = at(v), past = at(v + (end === 'max' ? step : -step));
    legs.push([`AT the ${end} (${v}): the gap clears`, inside.self >= BAR, inside.self.toFixed(4) + ' mm']);
    legs.push([`AT the ${end} (${v}): the census reads 0`, inside.within === 0, inside.within + ' pairs']);
    legs.push([`ONE STEP PAST the ${end} (${v + (end === 'max' ? step : -step)}): the census folds`, past.within > 0, past.within + ' pairs / ' + past.worstSpanMm.toFixed(4) + ' mm']);
  }
  const far = at(195);
  legs.push(['at +195: the gap is under the bar too (what the wall instrument\'s past-the-limit leg reads)', far.self < BAR, far.self.toFixed(4) + ' mm']);
  let bad = 0;
  for (const [what, ok, got] of legs) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what} — ${got}`); if (!ok) bad++; }
  console.log(bad ? `\nsepal ranges --control: FAIL — ${bad} leg(s)` : `\nsepal ranges --control: PASS — ${legs.length} of ${legs.length} legs (the bound ${r.min}..${r.max} is clean on both measures and one step past it is not)`);
  report.control = legs;
  if (bad) process.exitCode = 1;
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
if (!['--roll', '--corners', '--allmax', '--control'].some(has)) console.log('usage: --roll | --corners | --allmax | --control  [--json <file>]');
}
