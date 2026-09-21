/* ===================================================================
   verify-bloom-sepal-decoupled.mjs — A SEPAL'S BLADE DOES NOT MOVE WHEN A
   PETAL CONTROL DOES. Zero bytes: it builds into throwaway accumulators and
   emits nothing.

     node tools/verify-bloom-sepal-decoupled.mjs [--control]

   WHY IT EXISTS. A sepal IS the petal builder (Eva's ruling, sepals part 1):
   `buildSepalsInto` calls `buildPetalInto` on the sepal ring with
   `sepalBladeState(state, angle)` — the whole control set spread, with every
   twinned petal control REPLACED by the sepal's own copy and the rim family
   (`petalTipEnd`, `fringeCount`, `lobeDepth`) zeroed. That replacement table
   (`SEPAL_TWINS`) is the claim, and a table is exactly what goes stale when a
   control is added — so this checks it as an IDENTITY rather than trusting
   it: sweep every non-sepal control across its own registry range and require
   that not ONE emitted sepal float moves, under `Object.is`.

   THE RING AND THE SLOT ARE PINNED. Where a sepal STANDS is the hub's and the
   petals' by design (the sepal ring is on the hub — partway down its flare at
   `sepalHeight`, or the rim where there is no flare — the ceiling is the petal
   count, the angle limit is drawn against the petals), so a sweep over the
   whole bloom would report placement as coupling: the stem's and the hub's
   own controls MOVE the attachment, by ruling, and are not what this asks. This sweep is about the
   BLADE: one sepal, on the base state's own ring, at slot 0, at a fixed angle,
   so a difference is SHAPE and nothing else.

   THE PART THICKNESS SECTION AND THE PETAL'S SIZE ARE SHARED BY DECLARATION,
   and they are the only ones. The brief rules "thickness derived from part
   thickness; no sepal thickness control", so every control of the registry's
   `thickness` section (`sheetThickness` — the MATERIAL, the leaf's own
   exception — `tipThinning` and `footDelicacy`) is the sepal's too, READ OFF
   THE REGISTRY rather than named here so a control added to that section is
   shared the day it exists. And `petalLength` / `petalWidth`, because
   `sepalScale` is RULED as a fraction of the petal (0.2–1.0 of it) and a sepal
   that kept its size while the petals grew would stop being that fraction.
   Every other non-sepal control must be inert on the blade. (The first run of
   this sweep found `tipThinning` reaching the sepal and it is RIGHT to: it is
   the thickness law, which is what the ruling says the sepal derives.)

   `--control` neuters one twin (the sepal's cup starts reading the PETAL's)
   through a real mutated copy of the module and REQUIRES the sweep to find
   it; without that the run is a green light with no demonstrated ability to
   fail.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const CONTROL = process.argv.includes('--control');

const SHARED = new Set([...CONTROLS.filter((c) => c.section === 'thickness').map((c) => c.id), 'petalLength', 'petalWidth']);
const isPetalSide = (c) => !c.id.startsWith('sepal') && !SHARED.has(c.id);

/* A whorl with sepals on it — so the base state's own ring exists to pin. */
const BASE = { ...DEFAULTS, sepalCount: 5, sepalCup: 0.3, sepalSpineCurl: 40, sepalTipShape: 2.2 };
const ANGLE = 0;

let MUT = G;
if (CONTROL) {
  const fs = await import('node:fs');
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  const from = 'for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = Number(state[sepalId]);';
  if (src.split(from).length !== 2) { console.error(`the control's anchor matches ${src.split(from).length - 1}x — re-anchor it`); process.exit(2); }
  const out = path.join(ROOT, '.sepal-decoupled-control.mjs');
  /* The cup twin is skipped: the sepal's cup then reads the petal's. */
  fs.writeFileSync(out, src.replace(from, "for (const [petalId, sepalId] of SEPAL_TWINS) if (petalId !== 'petalCup') s[petalId] = Number(state[sepalId]);"));
  MUT = await import(pathToFileURL(out).href);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch { /* nothing to clean */ } });
}

/* THE PINNED RING AND SLOT, from the BASE state, per mode — read once. */
const pinned = {};
for (const mode of [false, true]) {
  const acc = new MUT.MeshBuilder({ exportMode: mode });
  const fr = MUT.footRing(BASE, acc);
  if (!fr.sepals) { console.error('the base state places no sepals — the sweep would be vacuous'); process.exit(2); }
  pinned[mode] = { ring: fr.sepals.ring, slot: { index: 0, azimuth: fr.sepals.azimuths[0], radius: fr.sepals.ring.radius, z: fr.sepals.height, scale: fr.sepals.scale, tiltExtra: 0 } };   // the whorl's own height (0: the base has no stem, so the attachment falls back to the rim)
}
function sepalFloats(state, mode) {
  const solo = new MUT.MeshBuilder({ exportMode: mode });
  MUT.buildPetalInto(solo, MUT.sepalBladeState(state, ANGLE), pinned[mode].ring, pinned[mode].slot, null, true);
  return solo.positions;
}

let swept = 0, moved = 0;
const findings = [];
const ref = { live: sepalFloats(BASE, false), export: sepalFloats(BASE, true) };
for (const c of CONTROLS.filter(isPetalSide)) {
  const values = c.kind === 'choice' ? c.options.map((o) => o.value)
    : [c.min, c.max].filter((v) => v !== undefined && v !== null);
  for (const v of values) {
    if (String(v) === String(DEFAULTS[c.id])) continue;
    swept++;
    for (const mode of [false, true]) {
      let got;
      try { got = sepalFloats({ ...BASE, [c.id]: v }, mode); } catch (e) { findings.push(`${c.id} -> ${v} [${mode ? 'export' : 'live'}]: the build THREW (${e.message.slice(0, 80)})`); moved++; continue; }
      const r = mode ? ref.export : ref.live;
      let d = got.length !== r.length ? -1 : 0;
      if (d === 0) for (let i = 0; i < r.length; i++) if (!Object.is(got[i], r[i])) d++;
      if (d !== 0) { moved++; findings.push(`${c.id} -> ${v} [${mode ? 'export' : 'live'}]: ${d < 0 ? 'the sepal changed LENGTH' : `${d} sepal float(s) moved`}`); }
    }
  }
}
console.log(`\nsepal decoupling — ${swept} non-sepal control values x 2 modes, ${ref.live.length.toLocaleString('en-US')} sepal floats a build (live), ring and slot pinned, angle ${ANGLE}, Object.is`);
console.log(`  shared by declaration: ${[...SHARED].join(', ')} (the Part thickness section, read off the registry, and the size the sepal is a ruled fraction of)`);
console.log(`  values that moved a sepal float: ${moved}`);
for (const f of findings.slice(0, 14)) console.log(`    - ${f}`);
if (findings.length > 14) console.log(`    … and ${findings.length - 14} more`);
if (CONTROL) {
  console.log(moved ? `\nCONTROL OK — the sweep found the neutered twin (${moved} value(s)); it can fail.` : '\nCONTROL FAILED — the sweep stayed silent with a twin neutered.');
  process.exit(moved ? 0 : 1);
}
console.log(moved ? '\nFAIL — a petal-side control reaches the sepal blade' : '\nPASS — no petal-side control reaches the sepal blade');
process.exit(moved ? 1 : 0);   // (the first version had these the wrong way round and exited 1 on a PASS — caught the day it was re-run)
