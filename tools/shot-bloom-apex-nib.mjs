/* ===================================================================
   shot-bloom-apex-nib.mjs — THE CONFIRMATION SHEET for the apex nib.

     node tools/shot-bloom-apex-nib.mjs <out-dir> <base-tree> [--only <re>] [--reuse]

   TWO COLUMNS, TODAY and FULL ROUND, every cell in PRINT PREVIEW — the mode
   where the defect was worst (the flat face is 1.6000 mm across in export
   against 0.3000 live) and the mode that is the object.

   `<base-tree>` is a git worktree of the commit this PR is measured against.
   Both trees are served over their OWN HTTP servers rather than swapped as
   modules, because the two pages report different telemetry: the base has no
   `tipCap.apex` at all, so a shared harness read would throw on half the
   cells. That is the seam-ruling sheet's own construction.

   ONE CAMERA PER ROW, SHARED BY BOTH COLUMNS — a two-way comparison from two
   cameras is not a comparison. THE NIB MOVES THE TIP, so the camera cannot
   sit on either column's apex: it is centred BETWEEN the two tips and widened
   from the measured difference, so the truncation (or the overshoot) is in
   the same frame as the shape.

   THE SEPAL ROW IS HERE BECAUSE A SEPAL IS THE PETAL BUILDER ON A SECOND
   RING and cuts its OWN nib from its own law at its own length — which is a
   claim nothing else on this sheet can show. It is framed from ABOVE, because
   `sepalAngle` 0 lays the blade in the hub's own plane and face-on is
   straight down.

   NO PIXEL DELTA IS QUOTED ANYWHERE — two trees, two servers, two page
   sessions, and this renderer is not deterministic between them (the
   contact-sheet rule). The one pixel number is a SAME-TREE control per row,
   reported and never a bar.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, stillFrame, shownModeOf } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
const baseTree = process.argv[3];
if (!outDir || !baseTree) { console.error('usage: node tools/shot-bloom-apex-nib.mjs <out-dir> <base-tree> [--only <re>] [--reuse]'); process.exit(2); }
if (!fs.existsSync(path.join(baseTree, 'bloom-geometry.js'))) { console.error(`REFUSED: ${baseTree} is not a bloom tree`); process.exit(2); }
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
const REUSE = process.argv.includes('--reuse');
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 560, DPR = 2;
const EVA = { petalLength: 35, petalWidth: 16, petalBaseTaper: 1.00 };
const TREES = { today: { dir: baseTree, label: 'TODAY' }, nib: { dir: ROOT, label: 'FULL ROUND' } };
const COLS = ['today', 'nib'];

const STATES = [
  { id: 'a', r: 4.2, title: 'A &middot; the shipping default &middot; the tip', set: {} },
  { id: 'b', r: 5.0, title: 'B &middot; 35&times;16 &middot; base taper 1.00 &middot; <b>tip shape 0.60</b> &middot; tip taper 1.80 &mdash; the shallowest flank', set: { ...EVA, petalTipShape: 0.60, petalTipTaper: 1.80 } },
  { id: 'c', r: 2.2, title: 'C &middot; <b>tip shape 3.00</b> &mdash; the steepest flank, where the arc is microns', set: { petalTipShape: 3.00 } },
  { id: 'd', r: 3.4, sepal: true, title: 'D &middot; <b>SEPALS</b> &middot; the shipped whorl (8, interleaved, size 0.60) &mdash; a sepal cuts its OWN nib, from above', set: { sepalCount: 8 } },
  { id: 'e', r: 4.2, title: 'E &middot; a lobed rim (depth 0.30 &times; 3) &mdash; the cut and the nib on one outline', set: { lobeDepth: 0.30, lobeCount: 3 } },
];
const CELLS = [];
for (const s of STATES) for (const t of COLS) CELLS.push({ id: `${s.id}-${t}`, state: s, tree: t });
const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const mods = {};
async function geomOf(t) {
  if (mods[t]) return mods[t];
  const d = TREES[t].dir;
  mods[t] = {
    G: await import(pathToFileURL(path.join(d, 'bloom-geometry.js')).href),
    R: await import(pathToFileURL(path.join(d, 'bloom-registry.js')).href),
  };
  return mods[t];
}
const nrm = (a) => { const L = Math.hypot(...a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };

/* THE THREE NUMBERS, OFF THE EMITTED OUTLINE, with definitions that mean the
   same thing on a tree that has no nib. The RUN is the terminal stretch over
   which the outline does not change — the print floor's parallel stub on
   TODAY, and 0 on a strictly converging outline, which is the property under
   test. The FACE is the width the blade ends on. The CORNER is the turn the
   outline makes over its last half-millimetre of arc. */
function tipNumbers(prof, L) {
  const hEnd = prof.halfWidthAt(1);
  let lo = 0, hi = 1;
  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (prof.halfWidthAt(m) > hEnd + 1e-9) lo = m; else hi = m; }
  const runMm = (1 - hi) * L;
  const pt = (u) => [u * L, prof.halfWidthAt(u)];
  let uBack = 0, arc = 0, prev = pt(1);
  for (let i = 1; i <= 200000; i++) {
    const u = 1 - i / 200000, q = pt(u);
    arc += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q;
    if (arc >= 0.5) { uBack = u; break; }
  }
  const A = pt(uBack), B = pt(1), mv = [B[0] - A[0], B[1] - A[1]];
  const cornerDeg = 180 - (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, -mv[1] / Math.hypot(mv[0], mv[1]))));
  return { runMm, faceMm: 2 * hEnd, cornerDeg, L };
}

/* THE BLADE THIS ROW IS ABOUT, and it is chosen by the row rather than
   assumed: the SEPAL row frames a sepal, every other row the first petal.
   Returns the builder's own record, so a tree with no sepal support REFUSES
   rather than silently framing a petal instead. */
function bladeOf(built, wantSepal) {
  if (!wantSepal) return (built.petalsAll || built.petals || []).filter(Boolean)[0];
  const s = built.sepalsBuilt || (built.sepals && built.sepals.built ? built.sepals : null);
  const list = s && (s.built || s);
  if (!Array.isArray(list) || !list.length) return null;
  return list[0];
}

const camCache = new Map();
const factCache = new Map();
async function factsFor(treeId, state) {
  const key = `${treeId}:${state.id}`;
  if (factCache.has(key)) return factCache.get(key);
  const { G, R } = await geomOf(treeId);
  const st = { ...R.DEFAULTS, ...state.set };
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const built = G.buildBloomInto(acc, st, { below: null, capability: null });
  const blade = bladeOf(built, state.sepal);
  if (!blade) throw new Error(`${treeId}: ${state.id} built no ${state.sepal ? 'sepal' : 'petal'} to frame`);
  const rows = blade.grid && blade.grid[0] ? blade.grid[0].rows.filter((r) => r.u > 0) : null;
  const tip = rows ? rows[rows.length - 1].mid[Math.floor(rows[rows.length - 1].mid.length / 2)] : blade.tip;
  const prof = { halfWidthAt: (u) => {
    const P = blade.profile, U = blade.profileU;
    let best = 0, bd = Infinity;
    for (let i = 0; i < U.length; i++) { const d = Math.abs(U[i] - u); if (d < bd) { bd = d; best = i; } }
    return P[best];
  } };
  const out = { blade, rows, tip, len: blade.length, asked: blade.askedLength === undefined ? blade.length : blade.askedLength,
                apex: blade.tipCap && blade.tipCap.apex ? blade.tipCap.apex : null,
                num: tipNumbers(prof, blade.length), tris: acc.triangleCount };
  factCache.set(key, out);
  return out;
}

async function planFor(c) {
  const s = c.state;
  const f = await factsFor(c.tree, s);
  if (!camCache.has(s.id)) {
    const a = await factsFor('today', s), b = await factsFor('nib', s);
    const mid = [(a.tip[0] + b.tip[0]) / 2, (a.tip[1] + b.tip[1]) / 2, (a.tip[2] + b.tip[2]) / 2];
    const gap = Math.hypot(a.tip[0] - b.tip[0], a.tip[1] - b.tip[1], a.tip[2] - b.tip[2]);
    let dir;
    if (s.sepal) {
      dir = [0, 0, 1];                                   // face-on to a blade lying in the hub plane
    } else {
      const r = a.rows, last = r[r.length - 1], back = r[Math.max(0, r.length - 4)];
      const m = Math.floor(last.mid.length / 2);
      let N = nrm(last.normal[m]);
      if (last.mid[m][0] * N[0] + last.mid[m][1] * N[1] < 0) N = [-N[0], -N[1], -N[2]];
      const Ld = nrm([last.mid[m][0] - back.mid[m][0], last.mid[m][1] - back.mid[m][1], last.mid[m][2] - back.mid[m][2]]);
      dir = nrm([N[0] + Ld[0], N[1] + Ld[1], N[2] + Ld[2]]);
    }
    camCache.set(s.id, { at: mid, dir, radius: s.r + gap / 2, gap });
  }
  return { f, cam: camCache.get(s.id) };
}

const servers = {};
async function serverFor(t) {
  if (!servers[t]) servers[t] = await serveRepo(TREES[t].dir);
  return servers[t];
}

const results = [];
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
for (const c of chosen) {
  const file = path.join(outDir, `${c.id}.png`);
  const { f, cam } = await planFor(c);
  if (REUSE && fs.existsSync(file)) { results.push({ c, f, cam, reused: true }); continue; }
  const srv = await serverFor(c.tree);
  await openBloom(page, srv.port);
  const bad = await applyConfig(page, Object.entries({ ...c.state.set }).map(([id, value]) => ({ id, value: String(value) })));
  if (bad.length) { console.error(`REFUSED ${c.id}: ${bad[0]}`); process.exit(1); }
  await page.evaluate(() => { const b = document.querySelector('#printPreview'); if (b && !b.checked) b.click(); });
  const shown = await shownModeOf(page);
  if (shown !== 'export') { console.error(`REFUSED ${c.id}: print preview reads ${shown}`); process.exit(1); }
  await page.evaluate(([at, dir, radius]) => {
    const s = window.__bloomScaffold || window.__bloomView;
    if (s && s.setView) s.setView(at, dir, radius);
    else if (window.__bloomCamera) window.__bloomCamera(at, dir, radius);
  }, [cam.at, cam.dir, cam.radius]);
  await stillFrame(page);
  await page.screenshot({ path: file });
  results.push({ c, f, cam, reused: false });
  console.log(`  ${c.id.padEnd(10)} face ${f.num.faceMm.toFixed(4)} mm · run ${f.num.runMm.toFixed(3)} mm · corner ${f.num.cornerDeg.toFixed(1)}° · drawn ${f.len.toFixed(3)}/${f.asked.toFixed(2)} · tris ${f.tris}`);
}
await browser.close();
for (const s of Object.values(servers)) s.server.close();

const fm = (x, n = 3) => Number(x).toFixed(n);
const rows = STATES.filter((s) => results.some((r) => r.c.state.id === s.id)).map((s) => {
  const cells = COLS.map((t) => {
    const r = results.find((q) => q.c.state.id === s.id && q.c.tree === t);
    if (!r) return '<td>—</td>';
    const a = r.f.apex;
    return `<td><img src="${r.c.id}.png" width="${VIEW}"><div class=cap><b>${TREES[t].label}</b><br>`
      + `face <b>${fm(r.f.num.faceMm, 4)} mm</b> &middot; parallel run ${fm(r.f.num.runMm)} mm &middot; corner ${fm(r.f.num.cornerDeg, 1)}&deg;<br>`
      + `drawn ${fm(r.f.len)} / asked ${fm(r.f.asked, 2)} mm (${r.f.len >= r.f.asked ? '+' : ''}${fm(r.f.len - r.f.asked)})<br>`
      + (a && a.active ? `nib: law cut at u ${fm(a.uLaw, 5)} &middot; flank ${fm(a.slope)} mm/mm &middot; arc r ${fm(a.radiusMm)} mm` : `nib: ${a ? a.why : 'not on this tree'}`)
      + `<br>${r.f.tris.toLocaleString('en-US')} tris</div></td>`;
  }).join('');
  return `<tr><td colspan=2 class=hd>${s.title} &mdash; PRINT PREVIEW, one camera for both columns (radius ${fm(camCache.get(s.id).radius, 2)} mm, tips ${fm(camCache.get(s.id).gap, 3)} mm apart)</td></tr><tr>${cells}</tr>`;
}).join('\n');

fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><meta charset=utf-8>
<title>apex nib — confirmation</title>
<style>body{background:#0A0A0C;color:#d8d8d8;font:13px/1.5 ui-monospace,monospace;margin:24px}
table{border-collapse:collapse}td{vertical-align:top;padding:6px}
.hd{color:#7fd6c8;padding-top:22px;font-size:14px}.cap{max-width:${VIEW}px;color:#9a9a9a;padding-top:6px}
img{background:#000;display:block}</style>
<h1>The apex nib &mdash; TODAY against FULL ROUND</h1>
<p>Every cell PRINT PREVIEW. One camera per row, shared by both columns, centred between the two tips and widened from the measured difference. <b>No pixel delta is quoted</b>: two trees, two servers, two page sessions, and this renderer is not deterministic between them.</p>
<p>Base tree: <code>${baseTree}</code></p>
<table>${rows}</table>`);
console.log(`\nwrote ${outDir}/index.html (${results.length} cells)`);
