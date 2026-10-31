#!/usr/bin/env node
/* ===================================================================
   shot-bloom-node-swelling-tight.mjs — THE SHEET FOR BLOOM P1b (Eva's ruling
   of Oct 29: a shorter, tighter node swelling; plus the dark-lozenge
   diagnosis). docs/bloom-node-swelling-tight-outcome.md.

     node tools/shot-bloom-node-swelling-tight.mjs <out.png> --base <worktree>

   `--base` is a git worktree of the commit BEFORE the change (main at
   9921fc6); every BEFORE cell is built by THAT tree's own geometry, never a
   remembered picture. Rendered by `bloom-soft-render.mjs`, deterministic — no
   pixel delta is quoted and none is owed. EXPORT mode.

   ROW 1 — JOB 0, THE DARK LOZENGES. P1's sheet lit every part one colour from
   two lights ABOVE the bloom; the carnation's decussate leaves at nodes 2 and 4
   point straight at the side camera, so the camera sees their UNDERSIDES, lit by
   ambient only, inside a stem of the same colour — a dark diamond that reads as
   a hole. Three cells on the base tree: as P1 drew it; the same with leaves in
   their own tone and a fill light from the camera's side (`PART_LIGHTING`, the
   fix every later cell uses); and the same stem with no leaves (no lozenge).
   ROWS 2-4 — BEFORE / AFTER pairs: the carnation at the defaults, a macro of one
   node with the joint's length, the carnation crowded 0.8 toward the base, the
   narrow run 0.20..0.45, the rose at the defaults and crowded 0.8. ROW 5 — the
   numbers: the spacing clamp asked vs built on both stems, before and after.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
const bi = process.argv.indexOf('--base');
const BASE = bi > 0 ? path.resolve(process.argv[bi + 1]) : null;
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-node-swelling-tight.mjs <out.png> --base <worktree of the pre-change commit>'); process.exit(2); }
const load = async (root) => ({ G: await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href), R: await import(pathToFileURL(path.join(root, 'bloom-registry.js')).href) });
const HEAD = await load(ROOT), BEFORE = await load(BASE);

const CW = 300, CH = 640, CAP = 84, IMG_H = CH - CAP;
/* THE FIX FOR JOB 0, as a lighting choice rather than a geometry one: the
   head, the stem and the leaves each in their own tone, and the second light
   moved to the CAMERA's side and below, so a leaf pointing at the viewer shows
   its underside lit rather than as a black hole in the stem. */
const TONES = { head: [214, 206, 190], stem: [214, 206, 190], leaf: [150, 178, 132] };
const PART_LIGHTING = (b, dir) => ({
  colorOf: (t) => (t < b.hubTriEnd ? TONES.head : t < b.stemTriEnd ? TONES.stem : TONES.leaf),
  light2: [dir[0] * 0.8, dir[1] * 0.8, -0.6],
});
function build(T, over) {
  const st = { ...T.R.DEFAULTS, ...over };
  const acc = new T.G.MeshBuilder({ exportMode: true });
  const b = T.G.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, S: b.stem, leaf: b.leaf };
}
const rowOf = (c, z) => Math.round(IMG_H / 2 - ((z - c.center[2]) / (2 * c.halfHeight)) * IMG_H);
function cell(bl, lines, cam, opts = {}) {
  const img = render(bl.acc.positions, CW, IMG_H, cam, opts.lit === false ? { color: [214, 206, 190] } : { ...PART_LIGHTING(bl.b, cam.dir), color: [214, 206, 190] });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IMG_H, 0, CAP);
  const D = bl.S && bl.S.nodeLaw ? bl.S.nodeLaw.nodes.map((q) => q.s) : (bl.leaf && bl.leaf.present ? bl.leaf.nodeDepthsMm : []);
  if (opts.ticks !== false) for (const d of D) {
    const y = CAP + rowOf(cam, bl.S.rootZ - d);
    if (y < CAP || y >= CH - 2) continue;
    for (let x = 0; x < 16; x++) for (let t = 0; t < 2; t++) { const o = ((y + t) * CW + x) * 3; rgb[o] = 120; rgb[o + 1] = 210; rgb[o + 2] = 200; }
    text(rgb, CW, CH, 18, y - 3, `${d.toFixed(1)}`, [120, 210, 200], 1);
  }
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  text(rgb, CW, CH, 6, CH - 12, `${((2 * cam.halfHeight) / IMG_H).toFixed(3)} MM/PX  ${cam.dir[0] ? '45 DEG' : 'SIDE ON'}, EXPORT`, [170, 170, 160], 1);
  return rgb;
}
const side = (S, L) => ({ dir: [0, -1, 0], up: [0, 0, 1], center: [0, 0, S.rootZ - L / 2 - 4], halfHeight: L / 2 + 22 });
const nodeLine = (bl) => {
  const L = bl.S.nodeLaw; if (!L) return 'NO NODE LAW';
  const j = L.jointMm !== undefined ? L.jointMm : null;
  return j !== null ? `JOINT ${j.toFixed(2)} MM (HALF-WIDTH ${L.swellMm.toFixed(2)})` : `SPINDLE HALF-WIDTH ${L.spreadMm.toFixed(2)} MM (BULGE ~${(2 * Math.SQRT2 * L.spreadMm).toFixed(1)} MM)`;
};
const runLine = (bl) => {
  const N = bl.leaf && bl.leaf.nodeRun; if (!N) return '';
  return `SPACING ASKED ${N.spacingAsked.toFixed(2)} BUILT ${N.spacingBuilt.toFixed(3)}${N.spacingClamped ? ' (CLAMPED)' : ''}`;
};
const gapLine = (bl) => {
  const d = bl.leaf && bl.leaf.present ? bl.leaf.nodeDepthsMm : (bl.S.nodeLaw ? bl.S.nodeLaw.nodes.map((q) => q.s) : []);
  const L = bl.S.nodeLaw;
  if (d.length < 2) return `${d.length} NODE`;
  const g = d.slice(1).map((q, i) => q - d[i]);
  return `INTERNODES ${g.map((x) => x.toFixed(1)).join('/')} MM${L && L.mergedPairs.length ? `  ${L.mergedPairs.length} MERGED` : ''}`;
};

const CARN = { stemLength: 100, stemDiameter: 6, leafLength: 40, leafWidth: 6, leafNodes: 5, leafPhyllotaxy: 'opposite', stemNodeSwelling: 1, stemNodeKink: 0 };
const ROSE = { stemLength: 100, stemDiameter: 6, leafLength: 40, leafType: 'COMPOUND', leafNodes: 4, leafDivergence: 137.5, stemNodeSwelling: 0.25, stemNodeKink: 0.8 };
const rows = [];
/* ROW 1 — JOB 0 */
{
  const a = build(BEFORE, CARN), c = build(BEFORE, { ...CARN, leafLength: 0 });
  const cam = side(a.S, 100);
  rows.push([
    cell(a, ['JOB 0: THE DARK LOZENGES', 'AS P1 DREW IT (BASE TREE)', 'ONE TONE, BOTH LIGHTS ABOVE', 'THE DIAMONDS ARE NODES 2 AND 4\'S LEAVES', 'POINTING AT THE CAMERA, UNDERSIDE UP'], cam, { lit: false }),
    cell(a, ['JOB 0: THE SAME BUILD', 'LEAVES IN THEIR OWN TONE', 'FILL LIGHT FROM THE CAMERA SIDE', 'THE LOZENGE IS A LEAF, SEEN END-ON', 'THE STEM BEHIND IT IS WHOLE'], cam),
    cell(c, ['JOB 0: NO LEAVES (BASE TREE)', 'THE SAME STEM, LEAF LENGTH 0', 'NO LOZENGE ANYWHERE', 'WALL >= 1.5 MM EVERYWHERE, BOTH MODES', 'NOT GEOMETRY: THE PRINT IS FINE'], cam),
  ]);
}
/* ROWS 2-4 — BEFORE / AFTER */
const pair = (base, over, title, camFor) => {
  const a = build(BEFORE, { ...base, ...over }), b = build(HEAD, { ...base, ...over });
  const cam = camFor(b);
  return [
    cell(a, [title, 'BEFORE (P1, THE FLOWER SPINDLE)', nodeLine(a), runLine(a), gapLine(a)], cam),
    cell(b, [title, 'AFTER (P1B, THE TIGHT JOINT)', nodeLine(b), runLine(b), gapLine(b)], cam),
  ];
};
const whole = (bl) => side(bl.S, Number(bl.st.stemLength));
/* the macro looks from 45 deg so the decussate leaves stand to either side
   rather than in front of the joint (the very occlusion Job 0 diagnosed) */
const macro = (bl) => { const n = bl.S.nodeLaw.nodes[2]; return { dir: [-Math.SQRT1_2, -Math.SQRT1_2, 0], up: [0, 0, 1], center: [0, 0, bl.S.rootZ - n.s], halfHeight: 12 }; };
rows.push([...pair(CARN, {}, 'CARNATION, THE DEFAULTS', whole), ...pair(CARN, {}, 'CARNATION, ONE NODE (MACRO)', macro)]);
rows.push([...pair(CARN, { leafNodeSpacing: 0.8 }, 'CARNATION, CROWDED 0.8 TO BASE', whole), ...pair(CARN, { leafNodeStart: 0.2, leafNodeEnd: 0.45 }, 'CARNATION, NARROW RUN .20-.45', whole)]);
rows.push([...pair(ROSE, {}, 'ROSE, THE DEFAULTS', whole), ...pair(ROSE, { leafNodeSpacing: 0.8 }, 'ROSE, CROWDED 0.8 TO BASE', whole)]);
/* ROW 5 — THE NUMBERS */
{
  const lines = ['THE SPACING CLAMP, ASKED VS BUILT (EXPORT)', ''];
  for (const [name, base] of [['CARNATION SW 1, 5 NODES', CARN], ['ROSE SW 0.25, 4 NODES', ROSE]]) {
    for (const sp of [0.8, -0.8]) {
      const a = build(BEFORE, { ...base, leafNodeSpacing: sp }), b = build(HEAD, { ...base, leafNodeSpacing: sp });
      const f = (bl) => `${bl.leaf.nodeRun.spacingBuilt.toFixed(3)}${bl.leaf.nodeRun.spacingClamped ? ' CLAMPED' : ''}`;
      lines.push(`${name} ASKED ${sp.toFixed(1)}: BEFORE ${f(a)}  AFTER ${f(b)}`);
    }
  }
  const n0 = build(BEFORE, { ...CARN, leafNodeStart: 0.2, leafNodeEnd: 0.45 }), n1 = build(HEAD, { ...CARN, leafNodeStart: 0.2, leafNodeEnd: 0.45 });
  lines.push('', `NARROW RUN .20-.45: MERGED PAIRS BEFORE ${n0.S.nodeLaw.mergedPairs.length}  AFTER ${n1.S.nodeLaw.mergedPairs.length}`);
  lines.push(`MERGE GAP BEFORE ${n0.S.nodeLaw.mergeGapMm.toFixed(2)} MM  AFTER ${n1.S.nodeLaw.mergeGapMm.toFixed(2)} MM (6 MM STEM)`);
  lines.push(`JOINT AFTER ${n1.S.nodeLaw.jointMm.toFixed(2)} MM = 1.25 STEM DIAMETERS`);
  const W = 3 * CW + 8, rgb = Buffer.alloc(W * CH * 3, 18);
  lines.forEach((l, i) => text(rgb, W, CH, 10, 14 + i * 20, l, [240, 236, 226], 2));
  rows.push([{ wide: rgb, w: W }]);
}
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => { let x = 0; for (const c of r) { if (c.wide) { blit(sheet, W, H, c.wide, c.w, CH, x, ri * (CH + 4)); x += c.w + 4; } else { blit(sheet, W, H, c, CW, CH, x, ri * (CH + 4)); x += CW + 4; } } });
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
