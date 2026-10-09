/* ===================================================================
   verify-bloom-defaults-bar.mjs — EVERY SHIPPED DEFAULT CLEARS THE PRINTABLE
   BAR (DB0-DB2; Eva's standing rule, inflorescence build 3, Phase A ruling
   3: "Twice now a shipped default has been found under the bar only because
   someone went looking. Add a gate clause asserting that every shipped
   default and every preset clears the printable bar, with a mutant that
   goes red when one does not.")

     node tools/verify-bloom-defaults-bar.mjs             the gate
     node tools/verify-bloom-defaults-bar.mjs --control   the must-fails

   THE SUBJECT, STATED AS A SET. The bloom ships ONE default (`DEFAULTS`,
   the registry's) and NO design presets (`bloom-view-presets.js` is camera
   chrome); what it also ships is each guarded feature's RULED DEFAULTS —
   the state a visitor reaches by turning that one feature on and touching
   nothing else — and both incidents the ruling names were in those: the
   leaf blade 0.876 mm from its pedicel at the shared node's defaults, and
   the raceme's florets 0.676 mm from each other at the raceme's. So the
   table below is DEFAULTS plus one state per feature, EACH PINNED BY NAME
   TO A ROW OF `buildMatrix()` whose control set it must equal (DB0) — a
   renamed or re-ruled anchor row reddens this gate rather than letting it
   measure a state nobody ships. Adding a feature means adding its row
   here; DB2 REPORTS (never asserts) which guard controls of the registry
   the table turns on and which it does not, so the coverage is a printed
   list rather than an assumption.

   THE BAR is `MIN_FEATURE_MM`, IMPORTED (this project's one owner of the
   minimum printable GAP; nothing here restates it). THE MEASURES are the
   combination gate's own, through their own owners — `self` is
   `measureWall(grid).self` from tools/bloom-wall-thickness.mjs; `leaf-stem`
   is the combination gate's exported `measureLeafStemApproachMm`; the five
   inflorescence approaches are `measureInfloApproachMm` from
   tools/bloom-inflo-approach.mjs; the in-sheet infill wall is
   `measureInfillWallMm` — a second implementation of any of them would
   agree with a broken one by being broken alongside it. EXPORT mode
   throughout (the print floor is what the bar is about). Every reading is
   printed with its owner and its location.

   WHAT IS NOT ON THE BAR, SAID: the petal-against-neighbour approach on the
   shipping head (`neighbourFlag`, -1.170 mm — skins through each other)
   is an ACCEPTED LOOK by Eva's variance ruling 1 and is told, never
   gated; it is not a measure here and this file says so rather than
   quietly leaving it out.

   --control: four must-fails and one must-pass, each run through the SHIPPED
   `verify` on a copy of the table or of the geometry; each must-fail is
   required to redden exactly the clause on the state it names and nothing
   else:
     1. the raceme's internode floor put back to the rods' own (two pedicel
        radii) in a COPY of bloom-geometry.js — the 0.676 mm default of
        build 3's Phase A, the incident the rule was written for
     2. the leaf default re-pinned to the STEEP angle (85 deg) in a copy of
        the table — the leaf blade 0.289 mm from the stem
     3. a table row whose control set no longer matches its matrix anchor —
        DB0's own must-fail
     4. the sepal row re-pinned to `sepalAngle` -90 (reflexed) — the sepal's
        own sheet under the bar, which `sepal-self` must see (it re-pinned to
        `sepalRoll` 330 until Eva's §9.1 bounded the sepal roll at -180..180,
        where roll alone clears)
     5. (MUST-PASS) the same re-pinned row through the old measure, `self`,
        stays green — the representative petal cannot see a sepal, which is
        the defect ruling R6 (Oct 9) fixed
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measureInfloApproachMm } from './bloom-inflo-approach.mjs';
import { measureLeafStemApproachMm } from './bloom-combination-gate.mjs';
import { measureInfillWallMm } from './bloom-infill-wall.mjs';
import { measureWall } from './bloom-wall-thickness.mjs';
import { buildMatrix } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.argv.includes('--control');

/* THE TABLE. `matrixRow` is the anchor's label in `buildMatrix()`; `set` must
   EQUAL that row's control set (DB0). `measures` names the owners read. */
export const SHIPPED_STATES = Object.freeze([
  { id: 'the shipped default', matrixRow: null, set: {}, measures: ['self'] },
  { id: 'the stem at its ruled middle', matrixRow: 'STEM: the shipped middle (60 mm x 6 mm, hollow, a 1.5 mm wall)', set: { stemLength: 60, stemDiameter: 6 }, measures: ['self'] },
  /* THE SEPAL ROW MEASURES THE SEPAL (Eva's ruling R6, Oct 9 — docs/bloom-sepal-discovery.md
     §1.7 and §6). It read `self` until then, and `self` reads `m.petal`, the
     REPRESENTATIVE PETAL, which is never a sepal (`b.sepals.built.includes(b.petal)`
     is false): 1.2377 mm with the five sepals and 1.2377 without them, bit for bit.
     A clause whose subject excludes the thing it doubts cannot fail — this file's
     fifth durable rule. `sepal-self` is the same `measureWall(grid).self`, read on
     EVERY sepal the builder emitted (`built.sepals.built`, each with its own grid),
     the smallest of them. Control leg 4 re-pins this row to `sepalAngle` -90 and
     requires it to go red; leg 5 asks the OLD measure the same question and
     requires it to stay green, which is the blindness stated as a must-pass. */
  { id: 'the sepals at the shipped whorl', matrixRow: 'SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)', set: { sepalCount: 5 }, measures: ['sepal-self'] },
  { id: 'the androecium candidate', matrixRow: 'STAMENS: 6 on a RING (the six-stamen candidate)', set: { stamenCount: 6 }, measures: ['self'] },
  { id: 'the leaves at the ruled 35 deg', matrixRow: 'LEAVES: alternate x 3 nodes at the ruled 35 deg', set: { stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafAngle: 35, leafNodes: 3, leafPhyllotaxy: 'alternate' }, measures: ['self', 'leaf-stem'] },
  /* THE COMPOUND LEAF (leaf/stem build S3) — the leaf type is a guarded feature,
     so its shipped defaults join the table the day it lands (ruling 3). The
     defaults are the session's, put to Eva from the sheet; when she rules them
     this row follows the ruling. */
  { id: 'the compound leaf at its shipped defaults', matrixRow: 'COMPOUND: the shipped compound defaults (2 pairs + terminal on a 40 mm rachis, 3 alternate nodes)', set: { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 3, leafType: 'COMPOUND' }, measures: ['self', 'leaf-stem'] },
  /* THE LOBED (CHEVRON) LEAF (leaf/stem build S4) — the third leaf type, a
     guarded feature, joins the table the day it lands on the same terms: the
     defaults are the session's proposal toward the chrysanthemum, put to Eva
     from the sheet; when she rules them this row follows. */
  { id: 'the lobed leaf at its shipped defaults', matrixRow: 'LOBED: the shipped lobed defaults (a 46 mm blade, 34 mm envelope, 3 alternate nodes)', set: { stemLength: 90, stemDiameter: 6, leafLength: 46, leafNodes: 3, leafType: 'LOBED' }, measures: ['self', 'leaf-stem'] },
  { id: 'the infill at its ruled defaults', matrixRow: 'INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)', set: { petalInfill: 'VORONOI' }, measures: ['self', 'infill-wall'] },
  { id: 'the raceme at its defaults', matrixRow: 'INFLO: the raceme (5 nodes x 1, 5-petal florets on 20 mm pedicels)', set: { stemLength: 120, inflorescence: 'RACEME' }, measures: ['self', 'floret-floret', 'floret-head', 'floret-stem'] },
  { id: 'the shared node — a leaf under every pedicel', matrixRow: 'NODE LAWS: SHARED NODE — a raceme with a leaf under every pedicel', set: { stemLength: 120, inflorescence: 'RACEME', leafLength: 40 }, measures: ['leaf-floret', 'leaf-pedicel', 'floret-floret', 'floret-head', 'leaf-stem'] },
]);

async function loadTree(root) {
  const [G, R, W] = await Promise.all([
    import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href),
    import(pathToFileURL(path.join(root, 'bloom-registry.js')).href),
    import(pathToFileURL(path.join(root, 'tools', 'bloom-wall-thickness.mjs')).href),
  ]);
  return { G, R, W };
}

function measureSelf(G, W, state) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, state);
  if (!m.petal || !m.petal.grid) throw new Error('self: the build retained no petal with a grid — a state with no representative petal needs a different measure, not a skip');
  const ap = m.petal.tipCap && m.petal.tipCap.apex;
  const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
  const r = W.measureWall(m.petal.grid, { nibFromU });
  return { mm: r.self, at: { u: r.selfAt[0], v: r.selfAt[1] } };
}
/* THE SEPAL'S OWN SHEET: `self` on every sepal the builder emitted, the
   smallest. A state that builds no sepal REFUSES — it is a table row that no
   longer measures what it names, never a skip. */
export function measureSepalSelf(G, W, state) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const m = G.buildBloomInto(acc, state);
  const built = m.sepals && m.sepals.built ? m.sepals.built.filter((p) => p && p.grid) : [];
  if (!built.length) throw new Error('sepal-self: the build emitted no sepal with a grid — a sepal row that builds no sepal measures nothing');
  let best = { mm: Infinity };
  built.forEach((p, i) => {
    const ap = p.tipCap && p.tipCap.apex;
    const nibFromU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
    const r = W.measureWall(p.grid, { nibFromU });
    if (r.self < best.mm) best = { mm: r.self, at: { sepal: i, u: Number(r.selfAt[0].toFixed(4)), v: Number(r.selfAt[1].toFixed(4)) } };
  });
  return { ...best, sepals: built.length };
}
function measureOne({ G, R, W }, state, measure) {
  if (measure === 'self') return measureSelf(G, W, state);
  if (measure === 'sepal-self') return measureSepalSelf(G, W, state);
  if (measure === 'leaf-stem') return measureLeafStemApproachMm(G, state, true);
  if (measure === 'infill-wall') return measureInfillWallMm(G, R.DEFAULTS, state);
  return measureInfloApproachMm(G, state, measure);
}

/* THE SHIPPED VERIFY — the table and the tree are parameters so the control
   can hand it a planted copy of either. */
export function verify(tree, table, matrix, { quiet = false } = {}) {
  const { G, R } = tree;
  const bar = G.MIN_FEATURE_MM;
  const bad = [];
  const say = (s) => { if (!quiet) console.log(s); };
  say(`defaults bar: ${table.length} shipped states against the ${bar} mm printable gap (MIN_FEATURE_MM, imported) · EXPORT mode`);
  const byLabel = new Map(matrix.map((r) => [r.label, r]));
  const same = (a, b) => JSON.stringify(Object.entries(a).map(([k, v]) => [k, String(v)]).sort()) === JSON.stringify(b.map((s) => [s.id, String(s.value)]).sort());
  for (const row of table) {
    /* DB0 — pinned to the matrix */
    if (row.matrixRow !== null) {
      const mr = byLabel.get(row.matrixRow);
      if (!mr) { bad.push(`DB0: "${row.id}" is pinned to a matrix row "${row.matrixRow}" that buildMatrix() does not hold`); continue; }
      if (!same(row.set, mr.set)) { bad.push(`DB0: "${row.id}" declares ${JSON.stringify(row.set)} and its anchor row "${row.matrixRow}" holds ${JSON.stringify(Object.fromEntries(mr.set.map((s) => [s.id, s.value])))} — the table is not the state the matrix ships`); continue; }
    } else if (Object.keys(row.set).length) bad.push(`DB0: "${row.id}" has no anchor row and a non-empty set — only the registry's own default may stand unpinned`);
    const state = { ...R.DEFAULTS, ...row.set };
    for (const measure of row.measures) {
      let r;
      try { r = measureOne(tree, state, measure); } catch (e) { bad.push(`DB1: "${row.id}" / ${measure}: ${e.message}`); continue; }
      const mm = Number(r.mm);
      say(`  ${mm >= bar ? 'ok  ' : 'FAIL'} ${row.id.padEnd(46)} ${measure.padEnd(14)} ${Number.isFinite(mm) ? mm.toFixed(4).padStart(8) + ' mm' : '   (inf)  '}${r.why ? ` — ${r.why}` : ''}${r.at ? ` at ${JSON.stringify(r.at)}` : ''}`);
      /* DB1 — the bar, every measure, every state */
      if (!(mm >= bar)) bad.push(`DB1: "${row.id}" reads ${mm.toFixed(4)} mm on ${measure} — a SHIPPED DEFAULT under the ${bar} mm printable bar${r.at ? ` (${JSON.stringify(r.at)})` : ''}`);
    }
  }
  /* DB2 — coverage, REPORTED: which registry controls that gate other
     controls (predicate drivers) the table turns on, and which it does not */
  const drivers = new Set();
  const walk = (p) => { if (!p || typeof p !== 'object') return; if (p.id) drivers.add(p.id); for (const k of ['all', 'any']) if (Array.isArray(p[k])) p[k].forEach(walk); if (p.ref && R.PREDICATES && R.PREDICATES[p.ref]) walk(R.PREDICATES[p.ref]); };
  for (const c of R.CONTROLS) walk(c.visibleWhen);
  const turned = new Set(table.flatMap((row) => Object.keys(row.set)));
  const on = [...drivers].filter((d) => turned.has(d)), off = [...drivers].filter((d) => !turned.has(d));
  say(`  DB2 coverage (reported, never asserted): ${on.length} guard control(s) turned on by the table — ${on.join(', ')}; ${off.length} not — ${off.join(', ')}`);
  return bad;
}

async function main() {
  const tree = await loadTree(ROOT);
  const matrix = buildMatrix();
  if (!CONTROL) {
    const bad = verify(tree, SHIPPED_STATES, matrix);
    if (bad.length) { console.log(`defaults bar: FAILED — ${bad.length} finding(s)`); for (const b of bad) console.log('  - ' + b); process.exitCode = 1; return; }
    console.log(`defaults bar: PASS — ${SHIPPED_STATES.length} shipped states, every measure at or over the bar`);
    return;
  }
  /* --control */
  const legs = [];
  /* a leg must redden the clause it NAMES; collateral it is ALLOWED to cause
     is written down per leg (`mayAlso`), and anything outside both lists is
     a failure of the control — the apex table's own `breaks` / `mayAlso` */
  const expectOnly = (name, bad, re, mayAlso = []) => {
    const hit = bad.filter((b) => re.test(b)), other = bad.filter((b) => !re.test(b) && !mayAlso.some((m) => m.test(b)));
    legs.push({ name, ok: hit.length > 0 && other.length === 0, hit: hit.length, other, sample: hit[0], collateral: bad.length - hit.length - other.length });
  };
  /* 1. the rod floor restored, in a COPY of the geometry */
  {
    const src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
    const from = 'const pitchFloorMm = Math.max(pitchFloorRodMm, pitchFloretMm);';
    if (src.split(from).length !== 2) throw new Error(`control 1: anchor matched ${src.split(from).length - 1} times — re-anchor`);
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-db-'));
    fs.writeFileSync(path.join(d, 'bloom-geometry.js'), src.replace(from, 'const pitchFloorMm = pitchFloorRodMm;'));
    const G2 = await import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href);
    const bad = verify({ ...tree, G: G2 }, SHIPPED_STATES, matrix, { quiet: true });
    /* COLLATERAL, MEASURED AND NAMED: under the old floor the shared node's
       16.4 mm internode also puts its leaf THROUGH the floret of the node
       below (leaf-floret reads a crossing), which is true of that floor and
       is allowed; it is not the clause this leg names. */
    expectOnly('1 the internode floor put back to the rods\' own (the 0.676 mm raceme)', bad, /^DB1: "the raceme at its defaults" reads 0\.\d+ mm on floret-floret/,
      [/^DB1: "the shared node — a leaf under every pedicel" reads 0\.\d+ mm on (leaf-floret|leaf-pedicel|floret-floret)/]);
  }
  /* 2. the leaf default re-pinned to the steep angle, in a copy of the table */
  {
    const table = SHIPPED_STATES.map((r) => (r.id.startsWith('the leaves') ? { ...r, matrixRow: 'LEAVES: the STEEP angle (85 deg — nearly along the stem)', set: { ...r.set, leafAngle: 85 } } : r));
    const anchor = matrix.find((r) => r.label.startsWith('LEAVES: the STEEP angle'));
    if (!anchor) throw new Error('control 2: the matrix holds no "LEAVES: the STEEP angle" row to re-pin to');
    table.find((r) => r.id.startsWith('the leaves')).set = Object.fromEntries(anchor.set.map((s) => [s.id, isNaN(Number(s.value)) ? s.value : Number(s.value)]));
    table.find((r) => r.id.startsWith('the leaves')).matrixRow = anchor.label;
    const bad = verify(tree, table, matrix, { quiet: true });
    expectOnly('2 the leaf default re-pinned to 85 deg (the blade 0.289 mm from the stem)', bad, /^DB1: "the leaves at the ruled 35 deg" reads 0\.\d+ mm on leaf-stem/);
  }
  /* 3. a row whose set drifts from its anchor */
  {
    const table = SHIPPED_STATES.map((r) => (r.id.startsWith('the raceme') ? { ...r, set: { ...r.set, pedicelLength: 21 } } : r));
    const bad = verify(tree, table, matrix, { quiet: true });
    expectOnly('3 a table row whose set no longer matches its matrix anchor', bad, /^DB0: "the raceme at its defaults" declares/);
  }
  /* 4. THE SEPAL ROW PUSHED UNDER THE BAR — re-pinned to `sepalAngle` -90, the
     descending seam bringing the reflexed blade back over its own foot (0.804
     mm; docs/bloom-sepal-discovery.md §9.2). It re-pinned to `sepalRoll` 330
     until Eva's §9.1 (Oct 9) bounded the sepal roll at -180..180, where the
     matrix's roll rows CLEAR (1.128 / 1.136 mm) and could no longer be a must-fail. The row
     must go red on `sepal-self`. */
  const ROLL_ROW = 'SEPALS: angle min (-90 — reflexed straight down)';
  const rollRow = matrix.find((r) => r.label === ROLL_ROW);
  if (!rollRow) throw new Error(`control 4: the matrix holds no "${ROLL_ROW}" row to re-pin to`);
  const rollSet = Object.fromEntries(rollRow.set.map((s) => [s.id, isNaN(Number(s.value)) ? s.value : Number(s.value)]));
  {
    const table = SHIPPED_STATES.map((r) => (r.id.startsWith('the sepals') ? { ...r, matrixRow: rollRow.label, set: rollSet } : r));
    const bad = verify(tree, table, matrix, { quiet: true });
    expectOnly('4 the sepal row re-pinned to sepalAngle -90 (the reflexed sepal over its own foot)', bad, /^DB1: "the sepals at the shipped whorl" reads 0\.\d+ mm on sepal-self/);
  }
  /* 5. THE BLINDNESS, AS A MUST-PASS: the same re-pinned row asked through the
     OLD measure (`self`, the representative petal) stays green — which is why
     the row had to change. A leg that expects NO finding; it fails if `self`
     ever starts seeing the sepal, which would mean this leg's premise moved. */
  {
    const table = SHIPPED_STATES.map((r) => (r.id.startsWith('the sepals') ? { ...r, matrixRow: rollRow.label, set: rollSet, measures: ['self'] } : r));
    const bad = verify(tree, table, matrix, { quiet: true });
    legs.push({ name: '5 the same row through the OLD measure (self, the petal) stays green — the blindness R6 fixed', ok: bad.length === 0, hit: 0, other: bad, collateral: 0 });
  }
  for (const l of legs) console.log(`  ${l.ok ? 'ok  ' : 'FAIL'} ${l.name}: ${l.hit} finding(s) on the named clause${l.collateral ? `, ${l.collateral} named collateral` : ''}${l.other.length ? `, ${l.other.length} OTHER — ${l.other[0]}` : ''}${l.sample ? `\n        ${l.sample.slice(0, 160)}` : ''}`);
  if (legs.some((l) => !l.ok)) { console.log('defaults bar --control: FAILED'); process.exitCode = 1; return; }
  console.log(`defaults bar --control: PASS — ${legs.length} of ${legs.length} legs behave (the must-fails redden exactly the clause they name; the must-pass stays green)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
