#!/usr/bin/env node
// Phase 1 of the bodice placement tool: build the curvature model, classify
// placement zones, and render the zone layer of the front elevation.
//
//   node bodice-placement/run-zones.mjs [--tol mm] [--measurements file.json]
//
// Placement (panel packing + tail routing) is a later phase and is
// intentionally not here yet — zones must be validated first.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildBodiceModel, selfTest, DEFAULT_MEASUREMENTS } from './lib/geometry.mjs';
import { buildZones, CHORD_TOL_MM } from './lib/zones.mjs';
import { loadSizeClasses } from './lib/panels-yaml.mjs';
import { renderZoneSvg } from './lib/svg-zones.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const tol = Number(argOf('--tol') ?? CHORD_TOL_MM);
const measPath = argOf('--measurements');
const meas = measPath
  ? { ...DEFAULT_MEASUREMENTS, ...JSON.parse(readFileSync(measPath, 'utf8')) }
  : DEFAULT_MEASUREMENTS;

const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'inf');
const pad = (s, w) => String(s).padEnd(w);
const rpad = (s, w) => String(s).padStart(w);

console.log('=== bodice zones: curvature model + classification ===\n');

// 1. Curvature operator self-test on analytic surfaces.
const st = selfTest();
console.log('curvature operator self-test:');
for (const l of st.lines) console.log('  ' + l);
if (!st.pass) {
  console.error('\nSELF-TEST FAILED — aborting.');
  process.exit(1);
}

// 2. Model.
const model = buildBodiceModel(meas);
console.log('\nmodel (front half-torso loft + solved bust prominence):');
console.log(`  grid ${model.nu} x ${model.nv} (theta x height), heights 0..${meas.centerFrontLength} mm`);
console.log(`  bust prominence solved: ${fmt(model.apex.prominence)} mm along the section normal` +
  (model.solveNote ? `  [${model.solveNote}]` : ''));
console.log('  tape-girth check (convex hull of section, mm):');
for (const [k, v] of Object.entries(model.girthCheck)) {
  console.log(`    ${pad(k, 10)} target ${rpad(fmt(v.target, 0), 4)}   model ${rpad(fmt(v.model, 0), 4)}   Δ ${fmt(v.model - v.target)}`);
}

// 3. Size classes from the shared registry.
const classesPath = join(here, '..', 'panels.yaml');
const classes = loadSizeClasses(classesPath);
console.log(`\nsize classes (${classesPath}):`);
for (const c of classes) console.log(`  ${pad(c.id, 4)} ${rpad(c.width_mm, 3)} x ${rpad(c.height_mm, 3)} mm  (diag ${fmt(c.diag_mm)})`);

// 4. Zones.
const zr = buildZones(model, classes, tol);
const totalArea = zr.zones.reduce((s, z) => s + z.area, 0);
console.log(`\nchord rule: max span = sqrt(8 * R * tol), tol = ${tol} mm`);
console.log('  doubly curved  -> caps the panel LARGEST dimension');
console.log('  single/planar  -> caps the panel WIDTH (may run tall)\n');

console.log('zones (dbl% = share capping the largest dimension; fit% = share where the class fits per-cell):');
console.log('  ' + pad('name', 24) + rpad('minR', 6) + rpad('medR', 7) +
  rpad('cap', 7) + rpad('dbl%', 7) + rpad('fit%', 7) + '  ' + pad('class', 9) + rpad('area cm2', 9) + rpad('%', 7) + '   centroid (x,y)');
for (const z of zr.zones) {
  console.log('  ' +
    pad(z.name, 24) +
    rpad(fmt(z.minR, 0), 6) + rpad(fmt(z.medianR, 0), 7) +
    rpad(fmt(z.cap, 0), 7) + rpad(fmt(z.doublePct, 0), 7) + rpad(z.excluded ? '—' : fmt(z.fitPct, 0), 7) + '  ' +
    pad(z.excluded ? 'EXCLUDED' : z.sizeClass.id, 9) +
    rpad(fmt(z.area / 100, 1), 9) + rpad(fmt((100 * z.area) / totalArea, 1), 7) +
    `   (${fmt(z.cx, 0)}, ${fmt(z.cy, 0)})`);
}
const excl = zr.zones.filter((z) => z.excluded);
const exclArea = excl.reduce((s, z) => s + z.area, 0);
console.log(`\n  total front surface ${fmt(totalArea / 100, 1)} cm2; ` +
  `excluded ${fmt(exclArea / 100, 1)} cm2 (${fmt((100 * exclArea) / totalArea, 1)}%) in ${excl.length} region(s)`);

// Curvature extremes for orientation.
let minR = Infinity, minIdx = -1;
for (let idx = 0; idx < model.nu * model.nv; idx++) {
  if (model.curvature.R[idx] < minR) { minR = model.curvature.R[idx]; minIdx = idx; }
}
const mi = minIdx % model.nu, mj = (minIdx / model.nu) | 0;
const mp = model.P[mj][mi];
console.log(`  tightest radius on surface: R = ${fmt(minR, 1)} mm at (x=${fmt(mp[0], 0)}, y=${fmt(mp[1], 0)}) — expect at/near an apex`);

// 5. SVG.
const outDir = join(here, 'output');
mkdirSync(outDir, { recursive: true });
const svgPath = join(outDir, 'bodice-zones.svg');
writeFileSync(svgPath, renderZoneSvg(model, zr, zr.cls.orderedClasses));
console.log(`\nwrote ${svgPath}`);
