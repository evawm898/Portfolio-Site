/* ===================================================================
   bloom-foot-cap.mjs — THE DERIVED FOOT CAP, MEASURED (root support,
   Oct 21 — Eva's ruling 2; docs/bloom-root-support-outcome.md §4).

     node tools/bloom-foot-cap.mjs [--base <worktree>]

   For petalWidth 8..46 (the slider's own range, whole millimetres) at 8 / 16
   / 40 petals on one RADIAL whorl, the rest at DEFAULTS, in EXPORT mode:
     - how often the cap BINDS (the asked foot, floored, against the arc each
       foot owns at its ring) on THIS tree, and how often the retired 10 mm
       clamp bound on the base;
     - the foot built, the ring, and the arc, at the widths the doc quotes;
     - the crowding raster's D_max (`tools/bloom-crowding.mjs`, the same
       stackDepth + refineDepth the export gate prints) on both trees.
   Every number is read off each tree's OWN builder record; nothing here
   restates the cap (FC1 in the harness is that clause's job).
   =================================================================== */
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOf = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = argOf('--base');
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { stackDepth, refineDepth, cellFor } = await import('./bloom-crowding.mjs');
async function tree(root) {
  const G = await import(pathToFileURL(path.join(root, 'bloom-geometry.js')).href);
  return (n, W) => {
    const acc = new G.MeshBuilder({ exportMode: true });
    const b = G.buildBloomInto(acc, { ...DEFAULTS, petalCount: n, petalWidth: W });
    const r = b.foot.rings[0];
    const feet = G.footList(b), R = b.foot.hub.radius, cell = cellFor(R);
    const dmax = refineDepth(feet, stackDepth(feet, R, cell, b.foot.hub.dome), cell, b.foot.hub.dome).dmax;
    const asked = Math.max(G.FOOT_MIN_WIDTH_MM, r.widthAskedMm ?? r.authoredWidth);
    return { asked, width: r.width, radius: r.radius, arc: r.footArcMm ?? null, capped: r.width < asked - 1e-12, dmax };
  };
}
const here = await tree(ROOT);
const there = BASE ? await tree(path.resolve(BASE)) : null;
const QUOTE = new Set([8, 16, 24, 30, 46]);
for (const n of [8, 16, 40]) {
  let bindH = 0, bindB = 0, dH = [], dB = [];
  const lines = [];
  for (let W = 8; W <= 46; W++) {
    const h = here(n, W), b = there ? there(n, W) : null;
    if (h.capped) bindH++;
    if (b && b.capped) bindB++;
    dH.push(h.dmax); if (b) dB.push(b.dmax);
    if (QUOTE.has(W)) lines.push(`  width ${String(W).padStart(2)}: asked ${h.asked.toFixed(2)} mm · built ${h.width.toFixed(3)} (arc ${h.arc.toFixed(3)} at r ${h.radius.toFixed(2)})${b ? ` · base ${b.width.toFixed(3)} at r ${b.radius.toFixed(2)}` : ''} · D_max ${h.dmax}${b ? ` (base ${b.dmax})` : ''}`);
  }
  const rng = (a) => (a.length ? `${Math.min(...a)}..${Math.max(...a)}` : '—');
  console.log(`${n} petals: the cap binds on ${bindH} of 39 widths${there ? ` (the retired 10 mm clamp bound on ${bindB})` : ''} · D_max ${rng(dH)}${there ? ` (base ${rng(dB)})` : ''}`);
  for (const l of lines) console.log(l);
}
