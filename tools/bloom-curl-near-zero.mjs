/* ===================================================================
   bloom-curl-near-zero.mjs — THE UNIFORM ARC'S SINGULAR BRANCH, and the
   reflexed-seam positive control. The organic-variance discovery's second
   instrument (docs/bloom-organic-variance-discovery.md). An INSTRUMENT
   ONLY: wired to no gate, asserts nothing, emits no geometry.

     node tools/bloom-curl-near-zero.mjs [--section 1|2|3]

   WHY IT EXISTS. `petalFormIsFlat` guards the flat branch on EXACT zeros,
   and the uniform spine arc is built from the closed form
   (sin p1 - sin p0) / k, kept verbatim for byte identity. That form cancels
   as k -> 0. No slider can reach the band (spine curl steps by 5 degrees),
   but a per-slot FIELD can: at 8 petals a wave 180 cos(theta) hands the
   slots at 90 and 270 degrees a curl of 1.1e-14, not 0. Every figure below
   is EXPORT, the whole default bloom, the census's own triangles.

   §1 THE LADDER: curl 1e-14 / 1e-12 / 1e-9 / 1e-6 / 1e-3 / 0.05 .. 5 and the
      negative side; cup, twist, roll and cup gradient at the same tiny
      values. Prints within-shell pairs, worst span, and the tip's plan
      radius and height so the collapse is visible as geometry, not only as
      a count.
   §2 THE CURL-GRADED WHORL, petal by petal: 180 cos(theta) on the default
      8, census per petal, then single-petal builds at the fine values
      90..180 to show the fold is the near-zero slots' alone.
   §3 THE REFLEXED SEAM: the positive control the sepal session named
      (a petal at tilt -40 .. -90, which no control reaches), curl added on
      top of it, and the curl / twist / cup corners at tilt 0, 25 and 75 —
      the measurement behind "graded curl, cup and twist cannot reach the
      seam fold".

   WHAT IT DOES NOT SAY. The 1e-6 .. 1e-3 band's pairs read at worst span
   0.0000: span-zero touches of a near-flat sheet against itself, the
   session-42 knife-edge class, an instrument reading and not a fold. The
   1e-14 rows are a fold (the tip lands on the hub plane). Both are real
   for a gate that counts pairs; only one is real geometry.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { census } from './bloom-self-intersection.mjs';

const T_SHEET = G.SHEET_THICKNESS_MM;
const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function whole(set) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const b = G.buildBloomInto(acc, { ...DEFAULTS, ...set });
  const c = census(new Float64Array(acc.positions), { collect: true });
  return { acc, b, c };
}

function section1() {
  console.log('§1 THE NEAR-ZERO LADDER — whole default bloom, EXPORT, one control off the slider grid.');
  const run = (set, label) => {
    const { b, c } = whole(set); const p = b.petalsAll[0]; const tip = p.grid[0].rows.at(-1).mid[4];
    console.log(`  ${label.padEnd(24)} within ${String(c.within).padStart(6)} worst span ${c.worstSpanMm.toFixed(4)} mm | tip plan r ${Math.hypot(tip[0], tip[1]).toFixed(3)} z ${tip[2].toFixed(3)} | flat branch ${G.petalFormIsFlat({ ...DEFAULTS, ...set })}`);
  };
  run({}, 'default (flat)');
  for (const v of [1e-14, 1e-12, 1e-9, 1e-6, 1e-3, 0.05, 0.5, 1, 2.5, 5]) run({ petalSpineCurl: v }, `curl ${v}`);
  for (const v of [-1e-14, -1e-6, -1, -5]) run({ petalSpineCurl: v }, `curl ${v}`);
  for (const v of [1e-14, 1e-6, 1e-3, 0.01]) run({ petalCup: v }, `cup ${v}`);
  for (const v of [1e-14, 1e-6, 0.01, 5]) run({ petalTwist: v }, `twist ${v}`);
  for (const v of [1e-14, 0.01, 5]) run({ petalRoll: v }, `roll ${v}`);
  run({ petalCupGradient: 1e-14 }, 'cupGradient 1e-14');
  run({ petalSpineCurl: 1e-14, curlBias: 1 }, 'curl 1e-14 bias 1 (general law)');
  run({ petalSpineCurl: 1e-14, petalTilt: 0 }, 'curl 1e-14 tilt 0');
}

function section2() {
  console.log('§2 THE CURL-GRADED WHORL — 8 petals, curl = 180 cos(theta), census per petal, EXPORT.');
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const state = { ...DEFAULTS }; const fr = G.footRing(state, acc); const ring = fr.slotRings[0][0]; const parts = [];
  G.buildWhorlInto({ count: fr.slotCount, radius: ring.radius, height: 0, sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra, phase: ring.phase, placement: 'RADIAL', fan: null, blade: (slot) => {
    const curl = clampTo(180 * Math.cos(slot.azimuth), -180, 360); const before = acc.triangleCount;
    G.buildPetalInto(acc, { ...state, petalSpineCurl: curl }, fr.slotRings[0][slot.index], slot, null, false);
    parts.push({ curl, az: slot.azimuth * 180 / Math.PI, tri: [before, acc.triangleCount] });
  } });
  const all = census(new Float64Array(acc.positions));
  console.log(`  whole whorl: within ${all.within} shells ${all.shells} worst span ${all.worstSpanMm.toFixed(4)} mm`);
  for (const p of parts) { const c = census(new Float64Array(acc.positions.slice(p.tri[0] * 9, p.tri[1] * 9))); console.log(`    petal at ${p.az.toFixed(0).padStart(4)} deg  curl handed ${p.curl.toExponential(3).padStart(11)}  within ${String(c.within).padStart(5)} worst ${c.worstSpanMm.toFixed(4)}`); }
  console.log('  single-petal builds at fine curl values (whole default bloom):');
  for (const curl of [90, 100, 110, 120, 125, 127.3, 130, 140, 150, 160, 170, 180, -127.3, -180]) { const { c } = whole({ petalSpineCurl: curl }); console.log(`    curl ${String(curl).padStart(7)} within ${c.within} worst ${c.worstSpanMm.toFixed(4)}`); }
}

function section3() {
  console.log('§3 THE REFLEXED SEAM — positive control at tilts no control reaches, then the curl / twist / cup corners, EXPORT.');
  const run = (set, label) => {
    const { b, c } = whole(set);
    let under = 0, zmin = Infinity, zmax = -Infinity, rmin = Infinity, rmax = 0;
    for (const s of c.sites) { const z = s.at[2], r = Math.hypot(s.at[0], s.at[1]); if (z <= -T_SHEET / 2 + 0.05) under++; zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
    const rows = b.petalsAll[0].grid[0].rows; const mid = (i) => rows[i].mid[4].map((x, k) => (x + rows[i].mid[5][k]) / 2);
    const chord = (i, j) => { const A = mid(i), B = mid(j); return (Math.atan2(B[2] - A[2], Math.hypot(B[0], B[1]) - Math.hypot(A[0], A[1])) * 180) / Math.PI; };
    const where = c.sites.length ? `sites ${c.sites.length}, under the slab ${under}, z [${zmin.toFixed(2)}, ${zmax.toFixed(2)}], r [${rmin.toFixed(1)}, ${rmax.toFixed(1)}]` : 'no sites';
    console.log(`  ${label.padEnd(38)} within ${String(c.within).padStart(6)} worst ${c.worstSpanMm.toFixed(4)} | ${where} | seam chords rows 3->4 ${chord(3, 4).toFixed(1)} deg, 4->8 ${chord(4, 8).toFixed(1)}, 16->30 ${chord(16, 30).toFixed(1)}`);
  };
  for (const tilt of [-40, -50, -55, -60, -90]) run({ petalTilt: tilt }, `POSITIVE CONTROL tilt ${tilt}`);
  run({ petalTilt: -60, petalSpineCurl: -180 }, 'tilt -60 x curl -180');
  run({ petalTilt: -60, petalSpineCurl: 180 }, 'tilt -60 x curl +180');
  for (const tilt of [0, 25, 75]) for (const bias of [0, 1]) run({ petalTilt: tilt, petalSpineCurl: -180, curlBias: bias }, `curl -180 tilt ${tilt} bias ${bias}`);
  run({ petalTilt: 25, petalSpineCurl: -180, curlStart: 0.5 }, 'curl -180 tilt 25 start 0.5');
  run({ petalSpineCurl: 360 }, 'curl 360 (declared 1008)');
  for (const tw of [-180, 180]) run({ petalTwist: tw }, `twist ${tw}`);
  for (const cup of [-0.8, 1.2]) run({ petalCup: cup }, `cup ${cup} (declared)`);
  run({ petalTilt: 0, petalSpineCurl: -180, petalCup: 1.2, petalTwist: 180 }, 'tilt 0 curl -180 cup 1.2 twist 180');
  run({ petalTilt: 0, petalSpineCurl: -180, petalRoll: 330 }, 'tilt 0 curl -180 roll 330 (roll declared)');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const sec = (argv.find((a) => a.startsWith('--section')) || '').split('=')[1] || argv[argv.indexOf('--section') + 1];
  const want = sec ? new Set(String(sec).split(',').map(Number)) : new Set([1, 2, 3]);
  const t0 = Date.now();
  if (want.has(1)) section1();
  if (want.has(2)) section2();
  if (want.has(3)) section3();
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s. INSTRUMENT ONLY — nothing above is asserted and no gate reads it.`);
}
