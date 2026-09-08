/* ===================================================================
   shot-bloom-apex-states.mjs — SCRATCH RIG for the four apex states
   (session 32, phase C). Nothing here ships and nothing here is a gate.

   WHY IT EXISTS. Eva withdrew the `blunt` ruling: it answered the wrong
   question. What she wants is ONE control with four named states and the tip
   CONVERGING throughout — elliptical, circular cap, straight point, acute
   point — and the curve begins at the WIDEST POINT (measured: u = 0.357 on
   the shipping petal, so 18 of 28 blade rows, against the converging cap's 6).
   Terminal width is not part of it. This sheet is so she can recognise her own
   shape without reading a mechanism description.

   THE LAW ON TRIAL is the SUPERELLIPSE in the widest-point-to-tip parameter:

       s = (u - uPk) / (1 - uPk),   h = halfW * (1 - s^n)^(1/n)

   n = 2 is the ellipse exactly, n = 1 is the straight point exactly, n < 1 is
   the acute point, and the circular cap sits between 2 and 1. It is patched
   into bloom-geometry.js IN FLIGHT through page.route(), the way phase A's
   candidates were — three substitutions, each asserted to match exactly once.
   NO SHIPPED SOURCE IS TOUCHED.

   THE CONVERGING CAP IS NEUTRALISED TO A FLOOR, not removed: the mesh still
   needs a non-degenerate terminal face (collapsing NV columns onto one edge is
   the retired centre dome's own 48-degenerate-triangle bug), so the last row
   is floored at the mode floor and nothing else. That is the smallest change
   that lets the region [widest, tip] be one curve — and it is exactly what the
   measurement says the cap costs today: it takes the roundest reachable core
   from a best-fit n of 1.725 to 1.585.

   RUN:  node tools/shot-bloom-apex-states.mjs <out-dir> [--quick]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         DEFAULTS, modeTag } from './bloom-harness.mjs';
import { decodePNG } from './pngdec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outDir = argv.find((a) => !a.startsWith('--')) || '/tmp/bloom-apex-states';
const QUICK = argv.includes('--quick');
const VIEW = 900, DPR = 2;
fs.mkdirSync(outDir, { recursive: true });

const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const PATCHES = [
  { why: 'read the trial exponent off the capability hook',
    find: `  const hEnd = Math.max(state.petalTipEnd * halfW, tipFloor);`,
    into: `  const hEnd = Math.max(state.petalTipEnd * halfW, tipFloor);
  const __n = (cap && cap.apexN) || null;` },
  { why: 'the cap becomes a FLOOR, not a shape, so the region [widest, tip] can be one curve',
    find: `      if (u >= uCap) {`,
    into: `      if (__n !== null) {
        const t = (u - uPk) / (1 - uPk);
        if (t <= 0) return Math.max(shape, rootBlend(u), tipFloor);
        const q = halfW * Math.pow(Math.max(0, 1 - Math.pow(t, __n)), 1 / __n);
        return Math.max(q, tipFloor);
      }
      if (u >= uCap) {` },
  { why: 'the trial law owns the whole falling limb, so the plain floor below the cap is unchanged',
    find: `      return Math.max(shape, rootBlend(u), tipFloor);
    },
  };`,
    into: `      return Math.max(shape, rootBlend(u), tipFloor);
    },
  };` },
];
const PATCHED = (() => {
  let s = SRC;
  for (const p of PATCHES) {
    const n = s.split(p.find).length - 1;
    if (n !== 1) { console.error(`HARNESS INVALID: patch "${p.why}" matched ${n} times, expected 1`); process.exit(2); }
    s = s.replace(p.find, p.into);
  }
  return s;
})();
console.log(`patched bloom-geometry.js: ${PATCHES.length} substitutions, each matched exactly once`);

/* THE IDENTITY CONTROL: with no `apexN` on the hook the patched module must be
   the shipped law to the BIT, or every cell below is measuring the patch. */
{
  const shipped = await import(path.join(ROOT, 'bloom-geometry.js'));
  const tmp = path.join(outDir, '_states-patched.mjs');
  fs.writeFileSync(tmp, PATCHED);
  const cand = await import(tmp);
  let n = 0, bad = 0;
  for (const a of [0.3, 1, 2, 3]) for (const b of [0.6, 1.8, 4]) for (const end of [0, 0.3, 0.6])
    for (const em of [false, true]) for (const halfW of [4, 8, 15]) {
      const st = { petalBaseTaper: a, petalTipTaper: b, petalTipEnd: end, petalTipShape: 1 };
      const P = shipped.widthProfile(st, { width: 6.4 }, halfW, null, { exportMode: em });
      const Q = cand.widthProfile(st, { width: 6.4 }, halfW, null, { exportMode: em });
      for (let i = 0; i <= 28; i++) { const u = i / 28; n++; if (!Object.is(P.halfWidthAt(u), Q.halfWidthAt(u))) bad++; }
    }
  if (bad) { console.error(`HARNESS INVALID: the patched module is not the identity — ${bad} of ${n} differ`); process.exit(2); }
  console.log(`identity control: ${n.toLocaleString('en-US')} half-widths, 0 differ — with no apexN the patch IS the shipped law`);
  fs.unlinkSync(tmp);
}

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
let SERVE = SRC;
await page.route('**/bloom-geometry.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: SERVE }));
function die(m) { console.error('HARNESS INVALID: ' + m); return browser.close().then(() => { server.close(); process.exit(2); }); }

function pixelDiff(fa, fb) {
  const A = decodePNG(fs.readFileSync(fa)), B = decodePNG(fs.readFileSync(fb));
  let n = 0, worst = 0;
  for (let o = 0; o < A.data.length; o += 4) {
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > 0) { n++; if (d > worst) worst = d; }
  }
  return { pixels: n, worst };
}
async function shoot(file, frame) {
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), frame);
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let p1 = null, p2 = null, buf = null, ok = false;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    buf = await page.screenshot({ clip, timeout: 180000 });
    if (p1 && p2 && buf.equals(p1) && p1.equals(p2)) { ok = true; break; }
    p2 = p1; p1 = buf;
  }
  if (!ok) await die(`${path.basename(file)}: never settled`);
  fs.writeFileSync(file, buf);
  return { file: path.basename(file), mmPerPx: (2 * frame.r) / (VIEW * DPR) };
}

const VIEWS = QUICK ? ['petal'] : ['petal', 'tip'];
let shotN = 0;
async function cell({ label, apexN = null, tag }) {
  SERVE = apexN === null ? SRC : PATCHED;
  await openBloom(page, port);
  const bad0 = await stillFrame(page); if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, []); if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, []); if (drift.length) await die(`${label}: ${drift.join('; ')}`);
  if (apexN !== null) {
    const got = await page.evaluate((s) => window.__bloomCapability(s), { label: 'APEXN', apexN });
    if (!got || got.label !== 'APEXN') await die(`${label}: the trial exponent did not reach the app`);
  }
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!m.petalMid) await die(`${label}: no petal midpoint`);
  const shots = {};
  for (const v of VIEWS) {
    shots[v] = await shoot(path.join(outDir, `cell-${String(++shotN).padStart(3, '0')}-${v}.png`),
      v === 'petal' ? { r: Number(DEFAULTS.petalLength) * 0.62, at: m.petalMid, dir: m.petalNormal }
                    : { r: Number(DEFAULTS.petalLength) * 0.30, at: m.petalTip, dir: m.petalNormal });
  }
  const prof = m.petalProfile, tip = prof[prof.length - 1];
  console.log(`  ${label.padEnd(46)} tip ${tip.toFixed(3)} mm · tris(live) ${m.liveTris}`);
  return { label, tag, shots,
    caption: `${apexN === null ? '<b>the shipped law</b> (no trial exponent)' : `<b>n = ${apexN}</b>`}`
      + `<br>last six rows ${prof.slice(-6).map((h) => h.toFixed(2)).join(' → ')} mm · tris (live) ${m.liveTris.toLocaleString('en-US')} · ${modeTag(m)}` };
}

const ROWS = [
  { tag: 'today', label: 'TODAY — the shipping petal', apexN: null,
    note: 'The reference. Its falling limb best-fits a superellipse of n = 1.05 and its last 20% is the converging cap\'s straight lerp, not a curve.' },
  { tag: 'ellipse', label: '1 · ELLIPTICAL — n = 2.00', apexN: 2,
    note: 'A perfect curve from the widest point to the tip. n = 2 IS the ellipse, exactly, by construction rather than by fit.' },
  { tag: 'cap', label: '2 · CIRCULAR CAP — n = 1.45', apexN: 1.45,
    note: 'The sides straighten and the curve tightens toward the tip. This is the state named by where it sits rather than by a formula, and this cell is what says whether the superellipse passes through it.' },
  { tag: 'straight', label: '3 · STRAIGHT POINT — n = 1.00', apexN: 1,
    note: 'Straight sides meeting at a vertex. n = 1 IS the straight line, exactly.' },
  { tag: 'acute', label: '4 · ACUTE POINT — n = 0.62', apexN: 0.62,
    note: 'The vertex drawn out. The sides bow INWARD, which is the only way to narrow the tip angle with the widest point and the length both held — and it sharpens the SHOULDER as it does so, which is the thing to judge here.' },
  { tag: 'acute-more', label: '4b · MORE ACUTE — n = 0.45', apexN: 0.45,
    note: 'How far the acute end can usefully go before the shoulder becomes the feature instead of the tip.' },
];

const out = [];
console.log(`\nrendering ${ROWS.length} row(s) x 2 (same-tree control) x ${VIEWS.length} view(s)\n`);
for (const r of ROWS) {
  const a = await cell(r), b = await cell({ ...r, label: '  (same-tree control)' });
  const ctrl = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, a.shots[v].file), path.join(outDir, b.shots[v].file))]));
  console.log(`    control: ${VIEWS.map((v) => `${v} ${ctrl[v].pixels} px`).join(' · ')}`);
  out.push({ ...r, ...a, ctrl });
}
const dist = Object.fromEntries(VIEWS.map((v) => { const xs = out.map((o) => o.ctrl[v].pixels).sort((x, y) => x - y);
  return [v, { n: xs.length, min: xs[0], max: xs[xs.length - 1], all: xs }]; }));
console.log('\nSAME-TREE CONTROL DISTRIBUTION:');
for (const v of VIEWS) console.log(`  ${v.padEnd(6)} n=${dist[v].n} min ${dist[v].min} max ${dist[v].max}  [${dist[v].all.join(', ')}]`);

fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>The Four Apex States</title>
<style>
 body{background:#0c0f0e;color:#dfe7e3;font:14px/1.55 system-ui,sans-serif;margin:0;padding:28px 32px;max-width:1500px}
 h1{font-size:22px;margin:0 0 4px} p{max-width:105ch;color:#b8c4bf}
 .grid{display:flex;flex-wrap:wrap;gap:22px;margin-top:14px}
 .cell{margin:0;width:${QUICK ? 470 : 940}px;max-width:100%;box-sizing:border-box;background:#121614;border:1px solid #1e2724;border-radius:8px;padding:12px}
 .shots{display:flex;gap:10px;flex-wrap:wrap} .shots>div{flex:1 1 380px;min-width:0}
 .shots img{width:100%;max-width:450px;aspect-ratio:1;height:auto;display:block;border-radius:4px;background:#000}
 .lab{color:#6f8079;font-size:11px;padding-top:3px} figcaption{font-size:12px;color:#9fb0a9;padding-bottom:9px}
 .note{color:#c9b98a} .ctrl{color:#6f8079} b{color:#e8f2ee}
 pre{background:#121614;border:1px solid #1e2724;border-radius:8px;padding:12px;overflow-x:auto;color:#b8c4bf;font-size:12px}
</style>
<h1>The four apex states</h1>
<p>Session 32, <b>phase C</b> — a scratch rig, at the size petals actually ship (35 &times; 16 mm, the
default). <b>Nothing here ships.</b> The law is patched into <code>bloom-geometry.js</code> in flight,
three substitutions each asserted to match exactly once, and with no trial exponent the patched module
is the shipped law to the bit.</p>
<p>The curve runs from the <b>widest point</b> to the tip &mdash; measured at u = 0.357 on this petal,
so <b>18 of 28 blade rows</b>, against the converging cap's 6. The tip converges in every state; terminal
width is not part of this axis. The law on trial is the superellipse
<code>h = halfW &times; (1 &minus; s<sup>n</sup>)<sup>1/n</sup></code>, in which <b>n = 2 is the ellipse
exactly and n = 1 is the straight point exactly</b>.</p>
<pre>${VIEWS.map((v) => `${v.padEnd(6)} same-tree control  n=${dist[v].n}  min ${dist[v].min}  max ${dist[v].max}   [${dist[v].all.join(', ')}]`).join('\n')}</pre>
<div class="grid">${out.map((o) => `<figure class="cell">
  <figcaption><b>${o.label}</b><br>${o.caption}<br><span class="note">${o.note}</span>
  <br><span class="ctrl">same-tree control: ${VIEWS.map((v) => `${v} ${o.ctrl[v].pixels} px`).join(' · ')}</span></figcaption>
  <div class="shots">${VIEWS.map((v) => `<div><img src="${o.shots[v].file}"><div class="lab">${v} &middot; ${o.shots[v].mmPerPx.toFixed(4)} mm/px</div></div>`).join('')}</div>
</figure>`).join('')}</div>
`);
await browser.close(); server.close();
console.log(`\nwrote ${out.length} cell(s) -> ${path.join(outDir, 'index.html')}`);
