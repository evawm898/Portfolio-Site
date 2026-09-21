/*
 * diff-contact.mjs — pixel delta between two contact-sheet directories.
 *
 * PIXEL DIFF, NOT BOUNDING BOX. A bounding box is satisfied by two entirely
 * different pictures of the same size; the question here is whether anything
 * moved, and only per-pixel comparison answers it.
 *
 * ASSERTS ITS OWN VALIDITY. A harness that reports 0% because it compared a file
 * with itself is worse than no harness. Every pair must resolve to two distinct
 * paths, both must decode, and the dimensions must match — any of those failing
 * is an error, never a 0.
 *
 * RUN:  node tools/diff-contact.mjs <beforeDir> <afterDir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) { console.error('usage: node tools/diff-contact.mjs <beforeDir> <afterDir>'); process.exit(2); }
if (path.resolve(beforeDir) === path.resolve(afterDir)) { console.error('before and after are the same directory'); process.exit(2); }

const names = fs.readdirSync(beforeDir).filter((f) => f.endsWith('.png')).sort();
if (!names.length) { console.error('no PNGs in ' + beforeDir); process.exit(2); }

const THRESH = 8;          // per-channel 0-255; below this is renderer noise, not a change
let bad = 0;
console.log('pixel delta: before=' + beforeDir + '  after=' + afterDir + '\n');
console.log('config'.padEnd(18), 'changed%'.padStart(9), 'maxΔ'.padStart(5), 'meanΔ(changed)'.padStart(15));
const rows = [];
for (const n of names) {
  const bp = path.join(beforeDir, n), ap = path.join(afterDir, n);
  if (!fs.existsSync(ap)) { console.log(n.padEnd(18), '   MISSING in after'); bad++; continue; }
  const A = decodePNG(fs.readFileSync(bp)), B = decodePNG(fs.readFileSync(ap));
  if (A.width !== B.width || A.height !== B.height) {
    console.log(n.padEnd(18), `   SIZE MISMATCH ${A.width}x${A.height} vs ${B.width}x${B.height}`); bad++; continue;
  }
  const px = A.width * A.height;
  let changed = 0, maxD = 0, sumD = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o+1] - B.data[o+1]), Math.abs(A.data[o+2] - B.data[o+2]));
    if (d > maxD) maxD = d;
    if (d >= THRESH) { changed++; sumD += d; }
  }
  const pct = (100 * changed / px);
  rows.push({ name: n.replace(/\.png$/, ''), pct: +pct.toFixed(3), maxD, meanD: changed ? +(sumD / changed).toFixed(1) : 0, px });
  console.log(n.replace(/\.png$/, '').padEnd(18), pct.toFixed(3).padStart(9), String(maxD).padStart(5), String(changed ? (sumD/changed).toFixed(1) : '0').padStart(15));
}
// POSITIVE CONTROL: if every pair reads 0.000 the likely cause is that the two runs
// rendered the same tree, not that a geometry change was invisible. Say so.
const allZero = rows.length && rows.every((r) => r.pct === 0 && r.maxD === 0);
console.log('');
if (allZero) { console.log('ALL PAIRS IDENTICAL AT THE BYTE LEVEL — suspect the two directories were rendered from the same tree, not that the change is invisible.'); bad++; }
if (bad) { console.log(bad + ' problem(s) — this diff is not trustworthy.'); process.exit(1); }
console.log('threshold: a pixel counts as changed when any channel differs by >= ' + THRESH + '/255.');
