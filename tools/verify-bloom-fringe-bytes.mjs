/* ===================================================================
   verify-bloom-fringe-bytes.mjs — THE CARNATION FRINGE'S BYTE PARTITION.

     node tools/verify-bloom-fringe-bytes.mjs --base <worktree> [--control] [--rows N]

   THE CLAIM IS TWO-DIRECTIONAL, because a feature that adds rows cannot claim
   "0 moved" over the whole matrix and a tool that only checked the holders
   would pass on a feature that does nothing at all. Every predeclared MOVER
   must move and every HOLDER must hold, both modes, every export float
   compared with `Object.is` so a -0 is distinguished.

   THE PARTITION IS PREDECLARED FROM THE BUILDER'S OWN RECORD, never from the
   control set (session 41's discipline). `movesByRecord` asks whether the
   emitted OUTLINE or the PANEL DECOMPOSITION actually differs from the same
   state with the three controls at their defaults — which is the only thing
   that can move a byte — so a row that sets a control to a value the geometry
   ignores is correctly a holder. `fringeCount max (10)` is exactly that: with
   no terminal it is NO ROOM, nothing is cut, and it holds.

   THE CONTROL IS `--control`, and it is required before quoting a pass from a
   changed harness: it perturbs one coordinate of every HOLDER by 1e-9 and
   requires the comparison to fail. `--rows N` narrows it — the control's claim
   is that this comparison DETECTS a perturbation, which any row it fires on
   establishes, where the PASS claim is about the whole matrix and must run it.
   The run says which it did, and a `--rows` run prints "never a pass".

   MEASURED, Sep 13, against a worktree of 994aea4: 736 rows, 30 predeclared
   movers, 706 holders, 682,971,192 export floats. 0 movers failed to move and
   0 holders moved. The control fires on the first 40 rows.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
/* `--base <worktree>`, named rather than positional so the flag order does
   not matter and a missing base cannot be silently read as a flag. */
const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null;
const CONTROL = process.argv.includes('--control');
if (!BASE || !fs.existsSync(BASE)) { console.error('verify-bloom-fringe-bytes: need --base <worktree of the base commit>'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NEW = new Set(['petalTipEnd', 'fringeCount', 'fringeDepth']);
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const GB = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { DEFAULTS: DB } = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
const H = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-harness.mjs')).href);
const LIMIT = process.argv.includes('--rows') ? Number(process.argv[process.argv.indexOf('--rows') + 1]) : 0;
/* `--rows N` is for the CONTROL only: the positive control's claim is that
   this comparison DETECTS a 1e-9 perturbation, and that is established by any
   row it fires on — where the pass claim is about the whole matrix and must
   run it. The run says which it did. */
const rows = LIMIT ? H.buildMatrix().slice(0, LIMIT) : H.buildMatrix();
const setOf = (r) => Object.fromEntries(r.set.map((x) => [x.id, isNaN(Number(x.value)) ? x.value : Number(x.value)]));
/* PREDECLARED, from the builder's own record — the same sweep that produced
   the partition, restated here as a predicate so the two cannot drift. */
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);
function movesByRecord(set) {
  const base = { ...set }; for (const k of NEW) delete base[k];
  for (const em of [true, false]) {
    const pr = (st) => { const acc = new G.MeshBuilder({ exportMode: em }); const { ring, slot } = firstSlot({ ...DEFAULTS, ...st }, acc, 0);
      const p = G.petalSurface({ ...DEFAULTS, ...st }, ring, slot, null, acc).profile;
      const h = []; for (let i = 0; i <= 4000; i++) h.push(p.halfWidthAt(i / 4000));
      return { h, fr: p.fringe && !p.fringe.noRoom ? p.fringe.count : 0 }; };
    const a = pr(base), b = pr(set);
    if (a.fr !== b.fr) return true;
    for (let i = 0; i < a.h.length; i++) if (!Object.is(a.h[i], b.h[i])) return true;
  }
  return false;
}
const mesh = (M, D, set, em) => { const acc = new M.MeshBuilder({ exportMode: em }); M.buildBloomInto(acc, { ...D, ...set }); return acc.positions; };
let movers = 0, holders = 0, badHold = [], badMove = [], floats = 0;
for (const r of rows) {
  const set = setOf(r);
  const declaredMover = movesByRecord(set);
  let differs = false, n = 0;
  for (const em of [true, false]) {
    const a = mesh(GB, DB, Object.fromEntries(Object.entries(set).filter(([k]) => !NEW.has(k))), em);
    const b = mesh(G, DEFAULTS, set, em);
    if (CONTROL && !declaredMover) b[0] += 1e-9;
    if (a.length !== b.length) { differs = true; n += Math.abs(a.length - b.length); continue; }
    for (let i = 0; i < a.length; i++) { floats++; if (!Object.is(a[i], b[i])) { differs = true; n++; } }
  }
  if (declaredMover) { movers++; if (!differs) badMove.push(r.label); }
  else { holders++; if (differs) badHold.push(`${r.label} (${n} floats)`); }
}
console.log(`BASE ${BASE}${LIMIT ? `  (FIRST ${LIMIT} ROWS ONLY — a control run, never a pass)` : ''}`);
console.log(`${rows.length} rows · ${movers} predeclared MOVERS · ${holders} predeclared HOLDERS · ${floats.toLocaleString('en-US')} export floats compared with Object.is`);
console.log(`movers that did NOT move: ${badMove.length}`);
for (const b of badMove) console.log('   ' + b);
console.log(`holders that MOVED: ${badHold.length}`);
for (const b of badHold.slice(0, 12)) console.log('   ' + b);
const pass = !badMove.length && !badHold.length;
console.log(CONTROL ? (pass ? '\nCONTROL FAILED TO FIRE — the comparison cannot see a 1e-9 perturbation, so neither clause is evidence' : '\nCONTROL OK — the perturbation was detected on the holders')
                    : (pass ? '\nPASS — every predeclared mover moved and every holder held, both modes.' : '\nFAIL'));
process.exit(CONTROL ? (pass ? 1 : 0) : (pass ? 0 : 1));
