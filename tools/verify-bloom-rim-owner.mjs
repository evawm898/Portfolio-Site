/* ===================================================================
   verify-bloom-rim-owner.mjs — ONE OWNER OF EVERY RIM (the Voronoi infill's S5).

     node tools/verify-bloom-rim-owner.mjs
     node tools/verify-bloom-rim-owner.mjs --negative-control

   WHAT IT CLAIMS. `emitRimLoop` in bloom-geometry.js is the one function that
   closes a rim — sweeps a strip joining a TOP-skin point to a BOTTOM-skin
   point — and both callers that close rims reach it: `emitPanel` (a petal's
   own perimeter) and `emitInfillPanel` (every hole the infill cuts, and the
   infilled region's outline edges). Before S5 the infill closed its rims with
   a flat-wall `emitRim` of its own, so the region the bead reached and the
   region it did not had two owners, and the one the bead did not reach was
   the one nobody was looking at.

   HOW. A STATIC reading of the source, because "who emits this" is a claim
   about the code and not about any one mesh:
     O1  `emitRimLoop` is declared, and it emits triangles.
     O2  `emitPanel` and `emitInfillPanel` each CALL `emitRimLoop`.
     O3  NOTHING ELSE MIXES THE SKINS. Every triangle-emitting call — `acc.tri`,
         `acc.triN`, `acc.quad`, and the infill's own `emitTri` — inside those
         two functions, and inside every top-level function either of them
         reaches, is read for its operands; a call carrying a top-skin operand
         (`.T`, `top`, `ht`) AND a bottom-skin operand (`.B`, `bot`, `hb`) is a
         wall, and a wall anywhere but in `emitRimLoop` is a second rim
         emitter. `emitRimLoop` itself is exempt BY NAME — it is the owner.

   The source is read through a character walk that blanks comments and the
   TEXT of string and template literals (keeping `${...}` code), so a word in a
   comment can neither satisfy a clause nor trip one. It asserts it can vouch
   for what it read — same length, nothing left open — and fails otherwise.

   WHAT IT DOES NOT COVER, in its own header:
     - Its operand vocabulary IS its coverage. A wall written with operands
       named something else (`p0`, `q1`) passes O3. The behavioural witness
       for the hole rims is `tools/verify-bloom-hole-rim.mjs` (no hard edge
       within the bead's reach of any hole), which a flat wall fails whatever
       its variables are called.
     - It reads bloom-geometry.js alone; a rim emitted from another file is
       not seen.

   --negative-control applies three written-down mutations to a COPY of the
   source text and requires each to fail the clause it names: S3's flat
   `emitRim` put back for the hole rims (O3), `emitPanel` sweeping its own rim
   inline (O2 + O3), and a new top-level wall helper called from the infill
   arm (O3, through the reachability walk).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');

/* ---- the walk: blank comments and literal TEXT in place, keep newlines ---- */
function blank(src) {
  const out = src.split('');
  let i = 0; const n = src.length;
  const stack = [];                                   // template-literal brace depths
  const kill = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) throw new Error('unterminated block comment'); kill(i, e + 2); i = e + 2; continue; }
    if (c === '/' && d === '/') { let e = src.indexOf('\n', i); if (e < 0) e = n; kill(i, e); i = e; continue; }
    if (c === "'" || c === '"') {
      let e = i + 1; while (e < n && src[e] !== c) { if (src[e] === '\\') e++; if (src[e] === '\n') throw new Error(`unterminated string at ${i}`); e++; }
      kill(i + 1, e); i = e + 1; continue;
    }
    if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
      if (c === '}') stack.pop();
      let e = i + 1;
      while (e < n && src[e] !== '`') { if (src[e] === '\\') { e += 2; continue; } if (src[e] === '$' && src[e + 1] === '{') break; e++; }
      kill(i + 1, e);
      if (src[e] === '$') { stack.push(0); i = e + 2; continue; }
      i = e + 1; continue;
    }
    if (c === '{' && stack.length) stack[stack.length - 1]++;
    if (c === '}' && stack.length) stack[stack.length - 1]--;
    /* A regex literal after an operator: skip its body so a `/` inside it
       cannot open a comment. Conservative — only the shapes this file uses. */
    if (c === '/' && /[=(,:!&|?;{}[\n]\s*$/.test(src.slice(Math.max(0, i - 20), i))) {
      let e = i + 1, cls = false;
      while (e < n && (cls || src[e] !== '/')) { if (src[e] === '\\') e++; else if (src[e] === '[') cls = true; else if (src[e] === ']') cls = false; if (src[e] === '\n') break; e++; }
      if (src[e] === '/') { kill(i + 1, e); i = e + 1; continue; }
    }
    i++;
  }
  if (stack.length) throw new Error('template literal left open');
  const s = out.join('');
  if (s.length !== src.length) throw new Error('the walk changed the length');
  return s;
}

function bodyOf(code, name) {
  const re = new RegExp(`\\bfunction\\s+${name}\\s*\\(`, 'g');
  const m = re.exec(code); if (!m) return null;
  let i = code.indexOf(')', m.index);
  let depth = 0; i = code.indexOf('{', i);
  const from = i;
  for (; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}') { depth--; if (depth === 0) return code.slice(from, i + 1); } }
  return null;
}
function callArgs(body, callee) {
  const out = []; const re = new RegExp(`(?:\\bacc\\.|\\b)${callee.replace('.', '\\.')}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(body))) {
    let i = m.index + m[0].length, depth = 1; const from = i;
    for (; i < body.length && depth; i++) { if (body[i] === '(') depth++; else if (body[i] === ')') depth--; }
    out.push(body.slice(from, i - 1));
  }
  return out;
}
const TOP = /\.T\b|\btop\b|\bht\b/, BOT = /\.B\b|\bbot\b|\bhb\b/;
const EMITTERS = ['acc.tri', 'acc.triN', 'acc.quad', 'emitTri'];

function check(src) {
  const bad = [];
  let code;
  try { code = blank(src); } catch (e) { return [`the walk could not vouch for what it read: ${e.message}`]; }
  const owner = bodyOf(code, 'emitRimLoop');
  if (!owner) bad.push('O1: no `function emitRimLoop` is declared');
  else if (!/acc\.triN?\s*\(/.test(owner)) bad.push('O1: `emitRimLoop` emits no triangle');
  for (const f of ['emitPanel', 'emitInfillPanel']) {
    const b = bodyOf(code, f);
    if (!b) { bad.push(`O2: no \`function ${f}\` is declared`); continue; }
    if (!/\bemitRimLoop\s*\(/.test(b)) bad.push(`O2: \`${f}\` does not call emitRimLoop — it closes its rim some other way`);
  }
  /* O3 — the reachability walk from the two callers over top-level functions. */
  const declared = new Set(); { const re = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; while ((m = re.exec(code))) declared.add(m[1]); }
  const seen = new Set(), queue = ['emitPanel', 'emitInfillPanel'];
  while (queue.length) {
    const f = queue.shift(); if (seen.has(f)) continue; seen.add(f);
    const b = bodyOf(code, f); if (!b) continue;
    const re = /\b([A-Za-z_$][\w$]*)\s*\(/g; let m;
    while ((m = re.exec(b))) if (declared.has(m[1]) && !seen.has(m[1]) && m[1] !== 'emitRimLoop') queue.push(m[1]);
  }
  let walls = 0;
  for (const f of seen) {
    if (f === 'emitRimLoop') continue;
    const b = bodyOf(code, f); if (!b) continue;
    for (const e of EMITTERS) for (const a of callArgs(b, e)) {
      if (TOP.test(a) && BOT.test(a)) { walls++; bad.push(`O3: \`${f}\` emits a WALL itself — ${e}(${a.replace(/\s+/g, ' ').trim()}) mixes a top-skin and a bottom-skin operand, so the rim has a second owner`); }
    }
  }
  return { bad, reached: [...seen].sort(), walls };
}

const MUTANTS = [
  { id: 'the-flat-emitRim-is-back-for-the-holes', names: ['O3'],
    from: '        const got = emitHoleRim(sec.innerLoop, ring);',
    to: '        const got = emitHoleRim(sec.innerLoop, ring); const emitRim = (A, B) => { const ps = edgePoints(A, B); for (let i = 0; i + 1 < ps.length; i++) { const p = pt(ps[i]), q = pt(ps[i + 1]); emitTri(q.T, p.T, p.B); emitTri(q.T, p.B, q.B); } }; emitRim(c[0], c[1]);' },
  { id: 'emitPanel-sweeps-its-own-rim', names: ['O2', 'O3'],
    from: '  emitRimLoop(acc, profs, K);',
    to: '  for (let k = 0; k < profs.length; k++) acc.quad(top[0][0], top[0][1], bot[0][1], bot[0][0]);' },
  { id: 'a-new-wall-helper-called-from-the-infill-arm', names: ['O3'],
    from: 'function emitInfillPanel(acc, rows, panel, tAt, rim, plan, cap = null) {',
    to: 'function emitHoleWall(acc, p, q) { acc.quad(p.T, q.T, q.B, p.B); }\nfunction emitInfillPanel(acc, rows, panel, tAt, rim, plan, cap = null) { emitHoleWall(acc, null, null);' },
];

const r = check(SRC);
if (Array.isArray(r)) { console.error(r.join('\n')); process.exit(1); }
console.log(`rim owner: emitRimLoop reached from ${r.reached.length} functions (${r.reached.join(', ')}); walls outside the owner: ${r.walls}`);
if (r.bad.length) { console.error('FAIL\n  ' + r.bad.join('\n  ')); process.exit(1); }
console.log('PASS — O1 O2 O3: every rim in bloom-geometry.js is closed by emitRimLoop');

if (process.argv.includes('--negative-control')) {
  let ok = true;
  for (const m of MUTANTS) {
    const hits = SRC.split(m.from).length - 1;
    if (hits !== 1) { console.error(`  ${m.id}: anchor matches ${hits} times — the mutant is disarmed`); ok = false; continue; }
    const res = check(SRC.replace(m.from, m.to));
    const fired = new Set((Array.isArray(res) ? res : res.bad).map((s) => s.slice(0, 2)));
    const missed = m.names.filter((x) => !fired.has(x));
    const extra = [...fired].filter((x) => !m.names.includes(x));
    if (missed.length || extra.length) { ok = false; console.error(`  ${m.id}: MISSED ${missed.join(',') || '-'} / UNCLAIMED ${extra.join(',') || '-'}`); }
    else console.log(`  ${m.id}: fired ${[...fired].join(', ')} as claimed`);
  }
  if (!ok) { console.error('NEGATIVE CONTROL FAILED'); process.exit(1); }
  console.log(`NEGATIVE CONTROL PASS — ${MUTANTS.length} of ${MUTANTS.length} mutations fail the clause they name`);
}
