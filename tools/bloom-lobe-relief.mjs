/* ===================================================================
   bloom-lobe-relief.mjs — WHAT MODEL B DID TO THE RELIEF FADE, WHAT IT
   COST, AND WHERE THE COUNT CEILING NOW SITS. Session 42. Zero bytes: it
   reads the shipped geometry and emits nothing.

     node tools/bloom-lobe-relief.mjs [--section 1|2|3|4|5] [--json <file>]

   WHY IT EXISTS. Session 40 measured the relief fading 2.37 / 1.92 / 0.93 mm
   across three successive notches toward the tip, and session 41 proved it
   INVARIANT to 1.7e-9 mm over the whole shape square — g(1) = 1 exactly at
   every exponent — so the fade belongs to the DEPTH RULE and not to the cut
   law. This tool is the measurement of the rule that replaced it, and of the
   three things that replacement costs.

   NAME THE MODE AND THE SAMPLING. Every figure says LIVE or EXPORT. The
   stationing is mode-free by construction (the arc table runs on the lamina,
   `max(shape, rootBlend, TIP_HALF_MM)`, never the accumulator's floor), so
   what differs between the modes is the OUTLINE the cut is applied to, at
   the tip; both are given wherever they differ. Turn angles are DRAWN
   quantities and every one names the chord it was read through.

   §1 THE FADE, KILLED. The relief at each margin sinus under the shipped law
      against the PROPORTIONAL rule it replaced, on the SAME stationing — so
      the comparison isolates the depth rule and nothing else. The
      proportional column is MODEL A's law evaluated on MODEL B's teeth; it
      is not what MODEL A drew (MODEL A's teeth were elsewhere), and it is
      not claimed to be.
   §2 THE RESIDUAL, REPORTED. Where the material runs out the relief still
      falls, and by exactly how much. The apex has the least material on the
      whole petal; exact parity at the last fraction of a millimetre is not
      available on a 1 mm sheet and is not claimed.
   §3 WHAT THE PER-PERIOD GUARD COSTS. Tip-ward of the last sinus the cut can
      exceed the material and the outline's own floor absorbs it. Measured
      against the PLAIN petal's own floored stretch, which is the only
      honest baseline: the plain petal floors there too.
   §4 THE CORNERS. The treated arc's base end is a CREST, so its join is one
      arm of the corner every interior crest already carries — measured
      against the interior crests at the same exponent, and against the plain
      petal's own worst turn.
   §5 THE COUNT CEILING, at every coverage, with the binding cap named.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);

const argOf = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const ONLY = argOf('section');
const JSON_OUT = argOf('json');
const want = (s) => !ONLY || ONLY === s;
const say = (...a) => { if (!JSON_OUT) console.log(...a); };
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const out = {};

function build(set, exportMode) {
  const state = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode });
  const { ring, slot } = firstSlot(state, acc, 0);
  const surface = G.petalSurface(state, ring, slot, null, acc);
  return { state, acc, ring, slot, surface, p: surface.profile, length: state.petalLength * slot.scale,
    mode: exportMode ? 'export' : 'live' };
}
/* The emitted relief at a station: the base outline less the cut one, read
   off the SHIPPED profile rather than off the lobe record, so a record that
   disagreed with the geometry would show here. */
const reliefAt = (p, u) => p.halfWidthBaseAt(u) - p.halfWidthAt(u);
/* The DRAWN exterior turn at u, in degrees, on the (x = u*length, y = h)
   curve, through a chord of `mm` millimetres in x either side. A turn is a
   drawn quantity: it names its chord, because a corner and a tight bend
   differ only by the scale you look at them on. */
function turnDeg(h, u, length, mm) {
  const e = mm / length;
  const a = [(u - e) * length, h(u - e)], b = [u * length, h(u)], c = [(u + e) * length, h(u + e)];
  const t0 = Math.atan2(b[1] - a[1], b[0] - a[0]), t1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let dt = (t1 - t0) * 180 / Math.PI;
  while (dt > 180) dt -= 360;
  while (dt < -180) dt += 360;
  return dt;
}
const CHORD_MM = 0.20;   // named once, used everywhere a turn is reported

/* ===================================================================== */
if (want('1')) {
  const rows = [];
  for (const exportMode of [false, true]) {
    const plain = build({}, exportMode);
    const lamina = (u) => Math.max(plain.p.halfWidthBaseAt(u), G.TIP_HALF_MM);
    for (const [depth, count, cov] of [[0.30, 3, 0.8], [0.30, 5, 0.8], [0.30, 7, 1], [0.60, 5, 1], [0.30, 5, 1]]) {
      const b = build({ lobeDepth: depth, lobeCount: count, lobeCoverage: cov }, exportMode);
      const L = b.p.lobes;
      if (!L || L.noRoom) continue;
      /* THE PROPORTIONAL RULE, evaluated on THIS build's own sinus stations:
         depth x the local half-width, which is what MODEL A removed. */
      const shipped = L.sinusU.map((u) => reliefAt(b.p, u));
      const proportional = L.sinusU.map((u) => depth * lamina(u));
      rows.push({ mode: b.mode, depth, count, cov, built: L.countBuilt, sinusU: L.sinusU,
        shipped, proportional, asked: L.reliefAskedMm,
        spreadShipped: Math.max(...shipped) - Math.min(...shipped),
        spreadProportional: Math.max(...proportional) - Math.min(...proportional) });
    }
  }
  out.section1 = { rows };
  say('=== §1 — THE FADE, KILLED =================================================');
  say('  The relief at each MARGIN sinus, base to apex, on the shipped build. The PROPORTIONAL');
  say('  column is MODEL A\'s rule (depth x the local half-width) evaluated on the SAME stations,');
  say('  so the comparison isolates the depth rule; it is not what MODEL A drew.\n');
  say('  mode   depth cnt cov  built | SHIPPED relief (mm, base->apex)          spread | PROPORTIONAL                            spread');
  for (const r of rows) {
    say(`  ${r.mode.padEnd(6)} ${f3(r.depth)} ${String(r.count).padStart(3)} ${f3(r.cov)} ${String(r.built).padStart(5)} | `
      + `${r.shipped.map(f3).join(' ').padEnd(38)} ${f3(r.spreadShipped).padStart(6)} | ${r.proportional.map(f3).join(' ').padEnd(38)} ${f3(r.spreadProportional).padStart(6)}`);
  }
}

/* ===================================================================== */
if (want('2')) {
  const rows = [];
  for (const exportMode of [false, true]) {
    for (const [depth, count, cov] of [[0.30, 6, 0.8], [0.30, 7, 1], [0.60, 5, 1], [1.00, 5, 1], [0.30, 2, 0.1], [0.30, 1, 0.1]]) {
      const b = build({ lobeDepth: depth, lobeCount: count, lobeCoverage: cov }, exportMode);
      const L = b.p.lobes;
      if (!L) continue;
      if (L.noRoom) { rows.push({ mode: b.mode, depth, count, cov, noRoom: L.noRoomWhy }); continue; }
      const margin = L.sinusU.map((u) => reliefAt(b.p, u));
      rows.push({ mode: b.mode, depth, count, cov, built: L.countBuilt, asked: L.reliefAskedMm,
        apex: L.apexIsCrest ? 'crest' : 'notch', apexRelief: L.apexReliefMm, limited: L.reliefLimited,
        margin, worstShortfall: margin.length ? L.reliefAskedMm - Math.min(...margin) : null,
        depthCap: L.depthCap });
    }
  }
  out.section2 = { rows };
  say('\n=== §2 — THE RESIDUAL, REPORTED ===========================================');
  say('  What is LEFT of the fade: the periods whose own sinus has less material than the');
  say('  target asks for. The apex has the least material on the petal and exact parity there');
  say('  is not available on a 1 mm sheet — the shortfall is the honest statement of it.\n');
  say('  mode   depth cnt cov  built apex  asked(mm) | margin relief base->apex           limited worst shortfall  saturates at');
  for (const r of rows) {
    if (r.noRoom) { say(`  ${r.mode.padEnd(6)} ${f3(r.depth)} ${String(r.count).padStart(3)} ${f3(r.cov)}  NO ROOM (${r.noRoom})`); continue; }
    say(`  ${r.mode.padEnd(6)} ${f3(r.depth)} ${String(r.count).padStart(3)} ${f3(r.cov)} ${String(r.built).padStart(5)} ${r.apex.padEnd(5)} ${f3(r.asked).padStart(9)} | `
      + `${r.margin.map(f3).join(' ').padEnd(34)} ${String(r.limited).padStart(7)} ${f3(r.worstShortfall).padStart(14)}  ${f3(r.depthCap)}x`);
  }
}

/* ===================================================================== */
if (want('3')) {
  const rows = [];
  const N = 4001;
  for (const exportMode of [false, true]) {
    const plain = build({}, exportMode);
    let plainFloored = 0;
    for (let i = 0; i <= N - 1; i++) { const u = G.ROOT_BLEND_END + (1 - G.ROOT_BLEND_END) * i / (N - 1); if (plain.p.halfWidthAt(u) <= plain.p.tipFloor + 1e-12) plainFloored++; }
    for (const [depth, count, cov] of [[0.30, 6, 0.8], [0.30, 7, 1], [0.60, 5, 1], [1.00, 5, 1]]) {
      const b = build({ lobeDepth: depth, lobeCount: count, lobeCoverage: cov }, exportMode);
      const L = b.p.lobes;
      if (!L || L.noRoom) continue;
      let floored = 0, below = 0, worstBelow = 0, nonSingle = 0;
      for (let i = 0; i <= N - 1; i++) {
        const u = G.ROOT_BLEND_END + (1 - G.ROOT_BLEND_END) * i / (N - 1);
        const h = b.p.halfWidthAt(u);
        if (h <= b.p.tipFloor + 1e-12) floored++;
        if (!(h > 0)) nonSingle++;
        const lamBase = Math.max(b.p.halfWidthBaseAt(u), G.TIP_HALF_MM);
        const keep = lamBase - reliefAt(b.p, u);
        if (keep < G.TIP_HALF_MM - 1e-9) { below++; worstBelow = Math.max(worstBelow, G.TIP_HALF_MM - keep); }
      }
      rows.push({ mode: b.mode, depth, count, cov, plainFloored, floored, absorbed: floored - plainFloored,
        belowPrintFloor: below, worstBelow, severed: nonSingle });
    }
  }
  out.section3 = { rows, samples: N };
  say('\n=== §3 — WHAT THE PER-PERIOD GUARD COSTS ==================================');
  say('  The envelope is constant within a period (no tangent break at a smooth crest), so');
  say(`  tip-ward of the last sinus the cut can exceed the material and the outline's own floor`);
  say('  absorbs it. Measured over 4001 samples of [ROOT_BLEND_END, 1], against the PLAIN');
  say(`  petal's own floored stretch — the plain petal floors there too, and that is the baseline.\n`);
  say('  mode   depth cnt cov  | plain floored  lobed floored  ABSORBED by the cut | samples under the print floor on the LAMINA (worst mm) | severed');
  for (const r of rows) {
    say(`  ${r.mode.padEnd(6)} ${f3(r.depth)} ${String(r.count).padStart(3)} ${f3(r.cov)} | ${String(r.plainFloored).padStart(13)} ${String(r.floored).padStart(14)} ${String(r.absorbed).padStart(19)} | ${String(r.belowPrintFloor).padStart(12)} (${f3(r.worstBelow)}) | ${r.severed}`);
  }
}

/* ===================================================================== */
if (want('4')) {
  const rows = [];
  for (const exportMode of [false, true]) {
    const plain = build({}, exportMode);
    let worstPlain = 0, atPlain = 0;
    for (let i = 1; i < 3000; i++) {
      const u = G.ROOT_BLEND_END + (1 - G.ROOT_BLEND_END) * i / 3000;
      const t = turnDeg((x) => plain.p.halfWidthAt(x), u, plain.length, CHORD_MM);
      if (Math.abs(t) > Math.abs(worstPlain)) { worstPlain = t; atPlain = u; }
    }
    for (const crest of [0.60, 1.00, 2.00, 3.00]) {
      const b = build({ lobeDepth: 0.30, lobeCount: 5, lobeCoverage: 0.8, lobeCrestShape: crest }, exportMode);
      const L = b.p.lobes;
      if (!L || L.noRoom) continue;
      const h = (u) => b.p.halfWidthAt(u);
      const base = turnDeg(h, L.windowU[0], b.length, CHORD_MM);
      const interior = L.crestU.slice(1).map((u) => turnDeg(h, u, b.length, CHORD_MM));
      const sinus = L.sinusU.map((u) => turnDeg(h, u, b.length, CHORD_MM));
      rows.push({ mode: b.mode, crest, worstPlain, atPlain, base, interior, sinus });
    }
  }
  out.section4 = { chordMm: CHORD_MM, rows };
  say('\n=== §4 — THE CORNERS ======================================================');
  say(`  Drawn turns through a ${CHORD_MM} mm chord in x. MODEL B has no apex join to measure — the`);
  say('  treatment does not end there. What survives is the treated arc\'s BASE end, which is a');
  say('  CREST: one arm of the corner every INTERIOR crest already carries at the same exponent,');
  say('  so it cannot be the sharper of the two and the user who asks for a pointed crest is');
  say('  asking for that corner everywhere.\n');
  say('  mode   crest | plain worst (at u)    | BASE end | interior crests                | sinuses');
  for (const r of rows) {
    say(`  ${r.mode.padEnd(6)} ${f3(r.crest)} | ${f3(r.worstPlain).padStart(8)} (${f3(r.atPlain)}) | ${f3(r.base).padStart(8)} | ${r.interior.map(f3).join(' ').padEnd(30)} | ${r.sinus.map(f3).join(' ')}`);
  }
}

/* ===================================================================== */
if (want('5')) {
  const rows = [];
  for (const exportMode of [true]) {
    for (const [cl, nl, lbl] of [[2, 2, 'the shipped shape'], [1, 1, 'the triangle wave'], [0.6, 0.6, 'both cusped'], [3, 3, 'both flat']]) {
      for (const cov of [0.10, 0.20, 0.40, 0.80, 1.00]) {
        const b = build({ lobeDepth: 0.30, lobeCount: G.LOBE_COUNT_RANGE[1], lobeCoverage: cov, lobeCrestShape: cl, lobeNotchShape: nl }, exportMode);
        const L = b.p.lobes;
        if (!L) continue;
        rows.push({ mode: b.mode, shape: lbl, crest: cl, notch: nl, cov,
          noRoom: L.noRoom ? L.noRoomWhy : null,
          built: L.countBuilt, rowsCap: L.countRowsCap, pitchCap: L.countFloorCap,
          capacity: L.rowsCapacity, floor: L.samplesPerLobe,
          binds: L.noRoom ? L.noRoomWhy : (L.countRowsCap <= L.countFloorCap && L.countRowsCap < G.LOBE_COUNT_RANGE[1] ? 'rows'
            : L.countFloorCap < G.LOBE_COUNT_RANGE[1] ? 'pitch' : 'neither — the range\'s own maximum'),
          apex: L.noRoom ? null : (L.apexIsCrest ? 'crest' : 'notch'),
          perPeriod: L.noRoom ? null : (L.rowsPerPeriod || null) });
      }
    }
  }
  out.section5 = { rows };
  say('\n=== §5 — THE COUNT CEILING, under MODEL B =================================');
  say(`  EXPORT, the shipping default petal, ${G.LOBE_COUNT_RANGE[1]} asked (the range's own maximum), depth 0.30.`);
  say('  The ladder is the SHIPPED bladeStations(); the demand is PER PERIOD, so the ceiling is');
  say('  the largest count whose periods each ask no more than the capacity can give.\n');
  say('  shape             cov  | BUILT apex   caps: rows/pitch  capacity  floor | binds');
  for (const r of rows) {
    say(`  ${r.shape.padEnd(17)} ${f3(r.cov)} | ${String(r.noRoom ? `NO ROOM (${r.noRoom})` : r.built).padStart(5)} ${String(r.apex || '-').padEnd(6)} ${String(r.rowsCap).padStart(5)}/${String(r.pitchCap).padEnd(5)} ${String(r.capacity).padStart(8)} ${String(r.floor).padStart(6)} | ${r.binds}`);
  }
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
