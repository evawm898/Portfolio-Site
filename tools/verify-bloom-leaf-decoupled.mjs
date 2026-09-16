/* ===================================================================
   verify-bloom-leaf-decoupled.mjs — A LEAF DOES NOT MOVE WHEN A PETAL
   CONTROL DOES. Zero bytes: it builds into throwaway accumulators and
   emits nothing.

     node tools/verify-bloom-leaf-decoupled.mjs [--control]

   WHY IT EXISTS. Sharing the MACHINERY is not sharing the VALUES. The leaf
   blade runs the petal's own outline law (`widthProfile`) and form law
   (`petalForm`), and `leafBladeState` builds the state they read by spreading
   the whole control set and overriding every field that could carry a petal's
   value into a leaf. That override list is the claim, and a list is exactly
   the kind of thing that goes stale when a control is added — so this checks
   it as an IDENTITY rather than trusting it: sweep every petal-side control
   across its own registry range and require that not ONE emitted leaf float
   moves, under `Object.is`.

   IT IS NOT AN ASSERTION FAMILY, deliberately. A clause would have to restate
   the override list to know what to look for, which is a second owner of the
   very thing under test (`seam-floor-removed`'s lesson). The identity needs no
   list: it drives the REAL controls and reads the REAL leaf floats.

   `sheetThickness` IS SHARED AND IS THE DECLARED EXCEPTION — it is the
   MATERIAL, not a petal control, and a leaf on a different sheet from the
   petals it grows with would be two materials in one print. It is excluded by
   name below, and by nothing else.

   `--control` neuters one override (the leaf's own tip shape starts reading
   the petal's) and REQUIRES the sweep to find it; without that the run is a
   green light with no demonstrated ability to fail.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS, CONTROLS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const CONTROL = process.argv.includes('--control');

/* THE DECLARED EXCEPTION, and the only one. */
const SHARED = new Set(['sheetThickness']);
/* The leaf's own controls are not "petal-side" — moving them SHOULD move the
   leaf, which is what every other clause is about. */
const isPetalSide = (c) => !c.id.startsWith('leaf') && !SHARED.has(c.id)
  && !['stemLength', 'stemDiameter'].includes(c.id);

const BASE = { ...DEFAULTS, stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 3 };

function leafFloats(state, mode, MOD = G) {
  const acc = new MOD.MeshBuilder({ exportMode: mode });
  const fr = MOD.footRing(state, acc);
  const plan = MOD.stemPlan(state, fr.hub, acc);
  const lp = MOD.leafPlan(state, plan, acc);
  if (!lp.present) return null;
  /* THE NODE IS PINNED, and this is a correction the first run forced twice.
     `headRise` moved 7,644 leaf floats and it is RIGHT to — doming the head
     moves the hub's underside, which moves the stem's root, which moves every
     node hanging off it; a leaf following the stem it grows on is not a petal
     control reaching a leaf. Subtracting the base afterwards was the first fix
     and it was WRONG TOO: it reintroduces its own rounding on a large z and
     left 6,597 floats "moved" on a leaf whose shape had not changed. Pinning
     the node's own height before the build is exact — the leaf is then
     constructed at an identical base on every state, so a difference is
     SHAPE and nothing else. */
  lp.rootZ = 0;
  lp.nodeDepthsMm = lp.nodeDepthsMm.map(() => 0);
  /* ONE leaf into a THROWAWAY accumulator, so the petals and the hub cannot
     drown the comparison: the claim is about the LEAF's own floats. */
  const solo = new MOD.MeshBuilder({ exportMode: mode });
  MOD.buildLeafInto(solo, lp, state, 0, 0);
  return solo.positions;
}

/* THE CONTROL — one override neutered, by building the blade state the way it
   would look if the leaf's tip shape were inherited instead of its own. */
/* THE CONTROL neuters ONE override — the leaf's own tip shape starts reading
   the PETAL's. An ES module binding cannot be redefined in place (measured:
   "Cannot redefine property"), so this does what the mutant table does and
   imports a real MUTATED COPY of the module. Written into the repo root
   because that is where the module's own resolution works from. */
let MUT = G;
if (CONTROL) {
  const fs = await import('node:fs');
  const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  /* RE-ANCHORED when the tip shape became the leaf's own control (the leaf
     tip-shape session): the override is now `Number(state.leafTipShape)`, and
     the neutered form reads the PETAL's exponent instead. */
  const from = 'petalTipShape: Number(state.leafTipShape),';
  if (!src.includes(from)) { console.error('the control\'s anchor is no longer in the source — it would mutate nothing'); process.exit(2); }
  const out = path.join(ROOT, '.leaf-decoupled-control.mjs');
  if (src.split(from).length !== 2) { console.error(`the control's anchor matches ${src.split(from).length - 1}x — re-anchor it`); process.exit(2); }
  fs.writeFileSync(out, src.replace(from, 'petalTipShape: Number(state.petalTipShape),'));
  MUT = await import(pathToFileURL(out).href);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch { /* nothing to clean */ } });
}

let swept = 0, moved = 0;
const findings = [];
const ref = { live: leafFloats(BASE, false, MUT), export: leafFloats(BASE, true, MUT) };
if (!ref.live || !ref.export) { console.error('the base state builds no leaf — the sweep would be vacuous'); process.exit(2); }

for (const c of CONTROLS.filter(isPetalSide)) {
  const values = c.kind === 'choice' ? c.options.map((o) => o.value)
    : [c.min, c.max].filter((v) => v !== undefined && v !== null);
  for (const v of values) {
    if (String(v) === String(DEFAULTS[c.id])) continue;
    swept++;
    for (const mode of [false, true]) {
      let got;
      try { got = leafFloats({ ...BASE, [c.id]: v }, mode, MUT); } catch { continue; }
      const r = mode ? ref.export : ref.live;
      if (!got) continue;
      let d = got.length !== r.length ? -1 : 0;
      if (d === 0) for (let i = 0; i < r.length; i++) if (!Object.is(got[i], r[i])) d++;
      if (d !== 0) { moved++; findings.push(`${c.id} -> ${v} [${mode ? 'export' : 'live'}]: ${d < 0 ? 'the leaf changed LENGTH' : `${d} leaf float(s) moved`}`); }
    }
  }
}
console.log(`\nleaf decoupling — ${swept} petal-side control values x 2 modes, ${ref.live.length.toLocaleString('en-US')} leaf floats a build, Object.is`);
console.log(`  shared by declaration: ${[...SHARED].join(', ')} (the MATERIAL, not a petal control)`);
console.log(`  values that moved a leaf float: ${moved}`);
for (const f of findings.slice(0, 10)) console.log(`    - ${f}`);
if (findings.length > 10) console.log(`    … and ${findings.length - 10} more`);
if (CONTROL) {
  console.log(moved ? `\nCONTROL OK — the sweep found the neutered override (${moved} value(s)); it can fail.`
                    : '\nCONTROL FAILED — the sweep stayed silent with an override neutered.');
  process.exit(moved ? 0 : 1);
}
console.log(moved ? '\nFAIL — a petal control reaches the leaf' : '\nPASS — no petal control reaches the leaf');
process.exit(moved ? 0 : 1);
