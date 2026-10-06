/* ===================================================================
   verify-bloom-defaults-bytes.mjs — THE BYTE PARTITION OF A DEFAULTS MOVE.

     node tools/verify-bloom-defaults-bytes.mjs --base <worktree> [--shard k/n] [--out <file>] [--control]
     node tools/verify-bloom-defaults-bytes.mjs --merge <file> <file> ...

   WHY IT EXISTS. `verify-bloom-surface-bytes.mjs` builds BOTH trees from THIS
   tree's `DEFAULTS` — right for a change to the geometry's LAW, and blind by
   construction to a change of a registry DEFAULT: hand the base geometry the
   new defaults and it builds the new state too, so every row reads "held".
   A defaults move is a move of the STATE a row describes, so here each tree
   is built from ITS OWN registry DEFAULTS and ITS OWN `buildMatrix()`, the
   two matrices paired BY INDEX (a renamed label is still the same row; the
   pairing refuses a pair whose control SETS differ).

   THE MOVER SET IS PREDECLARED FROM THE BASE TREE'S OWN BUILDER RECORD, never
   from labels and never from the head: a row is a MOVER iff, built on the
   base tree in EXPORT mode, some built petal carries an infill plan that was
   not refused (`petalsAll[p].infill` present and `refused` null). That is the
   population the ruled-defaults session's four infill defaults can reach —
   the three look levers and the density are read only inside
   `petalInfillPlan`, and the solid-base control's visibility is not geometry.
   Checked in BOTH directions: every predeclared mover must move, every holder
   must hold, positionally under `Object.is`, in LIVE and EXPORT, over the
   export stream AND every captured-grid mid/normal value.

   `--control` perturbs one float of the first holder's head stream by 1e-9 and
   requires the holder clause to report it; without it "0 moved" is a log line.

   WHAT IT DOES NOT COVER: triangle ORDER beyond positional equality is the
   claim (so a reordering is a move, deliberately); the mask channel is not
   compared (it is `verify-bloom-infill-bytes.mjs`'s); and it is Node-side.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };

if (argv[0] === '--merge') {
  const parts = argv.slice(1).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const all = parts.flatMap((p) => p.rows);
  const fails = parts.flatMap((p) => p.fails);
  const movers = all.filter((r) => r.mover), holders = all.filter((r) => !r.mover);
  const sum = (k) => all.reduce((s, r) => s + r[k], 0);
  console.log(`${all.length} rows (both modes each): ${movers.length} predeclared MOVERS, ${holders.length} HOLDERS`);
  console.log(`  movers that moved: ${movers.filter((r) => r.moved).length} of ${movers.length}; holders that held: ${holders.filter((r) => !r.moved).length} of ${holders.length}`);
  console.log(`  compared: ${sum('floats').toLocaleString('en-US')} export floats, ${sum('gridValues').toLocaleString('en-US')} captured-grid values`);
  if (parts.some((p) => p.control)) console.log(`  control: ${parts.filter((p) => p.control).map((p) => p.control).join('; ')}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  console.log(fails.length ? `FAIL — ${fails.length} finding(s)` : 'PASS — the partition closes exactly as predeclared.');
  process.exit(fails.length ? 1 : 0);
}

const BASE = arg('--base');
if (!BASE) { console.error('usage: --base <worktree of the base commit> [--shard k/n] [--out file] [--control]'); process.exit(2); }
const [K, N] = (arg('--shard') || '0/1').split('/').map(Number);
const CONTROL = argv.includes('--control');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (dir, f) => import(pathToFileURL(path.join(dir, f)).href);
const [G, R, H, BG, BR, BH] = await Promise.all([
  load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js'), load(ROOT, 'tools/bloom-harness.mjs'),
  load(BASE, 'bloom-geometry.js'), load(BASE, 'bloom-registry.js'), load(BASE, 'tools/bloom-harness.mjs'),
]);

function stateOf(Hm, D, row) {
  const kindOf = new Map(Hm.CONTROLS.map((c) => [c.id, c]));
  const s = { ...D };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
function build(Gm, state, row, exportMode) {
  const acc = new Gm.MeshBuilder({ exportMode, captureGrid: true });
  const built = Gm.buildBloomInto(acc, state, { below: null, capability: row.capability || null });
  const grid = [];
  for (const p of built.petalsAll || []) {
    grid.push(p ? 1 : 0);
    if (!p || !p.grid) continue;
    /* The same walk `verify-bloom-surface-bytes.mjs` owns: the panel shape and
       every station's (v, mid, normal). An unbuilt slot is a VALUE, never a skip. */
    for (const pan of p.grid) {
      grid.push(pan.rowFrom, pan.rowTo, pan.rows.length);
      for (const r of pan.rows) {
        grid.push(r.row, r.u, r.halfWidth, r.thickness, r.v.length);
        for (let j = 0; j < r.v.length; j++) grid.push(r.v[j], r.mid[j][0], r.mid[j][1], r.mid[j][2], r.normal[j][0], r.normal[j][1], r.normal[j][2]);
      }
    }
  }
  return { pos: Float64Array.from(acc.positions), grid, built };
}
const sameArr = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

const headRows = H.buildMatrix(), baseRows = BH.buildMatrix();
const fails = [], out = [];
if (headRows.length !== baseRows.length) fails.push(`the two matrices differ in length (${headRows.length} here, ${baseRows.length} on the base) — pairing by index is not available`);
let control = null;
/* THE CONTROL'S HOLDER, BY NAME (gate-hygiene session, Oct 6). It was the
   FIRST holder of whatever shard ran, and it retired the LAST "a HOLDER moved"
   finding it saw — so a genuine holder move elsewhere in the shard could
   satisfy the control and be deleted while the plant stayed. One named row
   now: the control must run on the shard that holds it, the row must be a
   predeclared HOLDER, and only that row's own finding counts and is retired. */
const CONTROL_HOLDER = 'DEFAULT (the shipping configuration)';
if (CONTROL) {
  const ci = headRows.findIndex((r) => r.label === CONTROL_HOLDER);
  if (ci < 0) { console.error(`REFUSED: the named control holder "${CONTROL_HOLDER}" is not in the matrix.`); process.exit(2); }
  if (ci % N !== K) { console.error(`REFUSED: the named control holder "${CONTROL_HOLDER}" is row ${ci}, which shard ${K}/${N} does not build — run --control on shard ${ci % N}/${N}.`); process.exit(2); }
}
for (let i = 0; i < Math.min(headRows.length, baseRows.length); i++) {
  if (i % N !== K) continue;
  const hr = headRows[i], br = baseRows[i];
  if (JSON.stringify(hr.set) !== JSON.stringify(br.set) || JSON.stringify(hr.capability || null) !== JSON.stringify(br.capability || null)) { fails.push(`row ${i}: the control sets differ ("${hr.label}" / "${br.label}") — not the same row`); continue; }
  const hs = stateOf(H, R.DEFAULTS, hr), bs = stateOf(BH, BR.DEFAULTS, br);
  let mover = null, moved = false, floats = 0, gridValues = 0;
  for (const exportMode of [true, false]) {
    const b = build(BG, bs, br, exportMode), h = build(G, hs, hr, exportMode);
    if (exportMode) mover = (b.built.petalsAll || []).some((p) => p && p.infill && !p.infill.refused);
    if (CONTROL && exportMode && hr.label === CONTROL_HOLDER) {
      if (mover) { fails.push(`control: the named holder "${CONTROL_HOLDER}" is a predeclared MOVER on the base tree, so it cannot carry the holder control — name a row this change holds`); }
      else { h.pos[0] += 1e-9; control = `perturbed "${hr.label}" by 1e-9`; }
    }
    floats += b.pos.length; gridValues += b.grid.length;
    const d = !sameArr(b.pos, h.pos) || !sameArr(b.grid, h.grid);
    moved = moved || d;
  }
  out.push({ i, label: hr.label, mover, moved, floats, gridValues });
  if (mover && !moved) fails.push(`row ${i} "${hr.label}": a predeclared MOVER held to the bit in both modes`);
  if (!mover && moved) fails.push(`row ${i} "${hr.label}": a HOLDER moved`);
  console.error(`${String(i).padStart(4)} ${mover ? 'MOVER ' : 'holder'} ${moved ? 'moved' : 'held '} ${hr.label.slice(0, 80)}`);
}
if (CONTROL) {
  const own = (f) => f.includes(`"${CONTROL_HOLDER}": a HOLDER moved`);
  const j = fails.findIndex(own);
  if (!control) fails.push(`control: the named holder "${CONTROL_HOLDER}" was never perturbed`);
  else if (j < 0) fails.push(`control: ${control} and the holder clause did NOT report it`);
  else { control += ' — the holder clause reported it'; fails.splice(j, 1); }
}
const res = { base: BASE, shard: `${K}/${N}`, rows: out, fails, control };
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(res));
console.log(`shard ${K}/${N}: ${out.length} rows, ${out.filter((r) => r.mover).length} movers, ${fails.length} finding(s)${control ? ` · control: ${control}` : ''}`);
process.exit(fails.length ? 1 : 0);
