#!/usr/bin/env node
/* THE PANEL IS TODAY'S PANEL WITH BOTH SCOPE TOGGLES OFF (Scoping-b, Eva's
   ruling: "each is a toggle; off = today's panel exactly"). The byte half of
   that sentence is verify-bloom-surface-bytes' (the whole matrix, both modes,
   against a worktree of the base commit); THIS is the panel half, measured on
   the rendered page rather than argued from the registry.

   Two servers, two pages — the BASE tree's and this one — each opened fresh
   and driven to the same state through the real controls. On each, the whole
   `.bl-panel` is cloned and serialised (every attribute: `hidden`, `open`,
   classes, the CSS custom properties `applyCaps` writes; every read-out
   span's text; every label) together with every input's LIVE value, which an
   attribute serialisation would miss. On this tree, and ONLY there, exactly
   three things are taken out before the compare: the two toggle rows'
   wrappers (`scopeLayers`, `scopePetals` — the controls the ruling adds), the
   scope bar (`#scopeBar`, page chrome outside #panelControls that is hidden
   whenever no toggle is live — which this tool also asserts) and the Petal
   roles section's new caption ("Petal roles are off while … is on"), and that
   one ONLY while it is hidden. Anything else that differs is a finding,
   printed as the first differing line.

   The read-out (`#readout`) is compared too, with build timings masked (the
   two pages are different processes; a millisecond figure is not the panel).

   CONTROL: `--control` deletes one ordinary control's wrapper on this tree's
   page before the compare and requires the run to FAIL on it — so "identical"
   is shown able to be false.

   Not in CI: it takes a worktree of the base commit, and which commit a
   session claims to have moved nothing since is the session's to name.

   Run: node tools/verify-bloom-scope-panel-identity.mjs --base <worktree> [--control] */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf } from './bloom-harness.mjs';

const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const BASE = argOf('--base');
const CONTROL = argv.includes('--control');
if (!BASE || !existsSync(path.join(BASE, 'bloom.js'))) { console.error('usage: node tools/verify-bloom-scope-panel-identity.mjs --base <worktree of the base commit> [--control]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/* the states, each written as control sets both trees know — the ones where
   the role sections change shape (the toggles' whole subject) plus the common
   families, so a scope-view side effect anywhere in the panel would show */
const STATES = [
  ['DEFAULTS', []],
  ['RADIAL x 3 layers', [{ id: 'layerCount', value: '3' }]],
  ['ORCHID: 2 layers in step, labellum + hood', [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }, { id: 'labellumCup', value: '0.5' }, { id: 'hoodTilt', value: '20' }]],
  ['RADIAL x 3 layers x phase 0.5', [{ id: 'layerCount', value: '3' }, { id: 'layerPhase', value: '0.5' }]],
  ['FAN', [{ id: 'placement', value: 'FAN' }]],
  ['FAN x 3 layers x petal 2 cup', [{ id: 'placement', value: 'FAN' }, { id: 'layerCount', value: '3' }, { id: 'petal2Cup', value: '0.5' }]],
  ['FAN centre OFF x ALL curl', [{ id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'OFF' }, { id: 'allCurl', value: '60' }]],
  ['SPIRAL x 2 layers', [{ id: 'placement', value: 'SPIRAL' }, { id: 'layerCount', value: '2' }]],
  ['CONTINUOUS', [{ id: 'placement', value: 'CONTINUOUS' }]],
  ['the infill', [{ id: 'petalInfill', value: 'VORONOI' }]],
  ['the buckle x lobes', [{ id: 'buckleAmp', value: '0.3' }, { id: 'lobeDepth', value: '0.3' }]],
  ['the tube', [{ id: 'tubeLayer1', value: '2' }]],
  ['3 layers x INNER curl', [{ id: 'layerCount', value: '3' }, { id: 'innerCurl', value: '90' }]],
];

async function snapshot(page, strip, plant) {
  return page.evaluate(({ strip, plant }) => {
    if (plant) { const el = document.getElementById(plant); if (el) el.closest('.bl-ctrl').remove(); }
    const panel = document.querySelector('.bl-panel');
    const bar = document.getElementById('scopeBar');
    const clone = panel.cloneNode(true);
    const values = [];
    for (const el of panel.querySelectorAll('input, select')) values.push(`${el.id}=${el.type === 'checkbox' ? el.checked : el.value}`);
    if (strip) {
      for (const id of ['scopeLayers', 'scopePetals']) { const el = clone.querySelector(`#${id}`); if (el) el.closest('.bl-ctrl').remove(); }
      const b = clone.querySelector('#scopeBar'); if (b) b.remove();
      /* the Petal roles section's new hiddenReason caption ("Petal roles are
         off while … is on") — taken out ONLY while it is HIDDEN; a visible one
         is a difference a visitor can see and stays in the compare */
      for (const w of clone.querySelectorAll('p.bl-why[data-why="roles"]')) if (w.hidden) w.remove();
    }
    /* source comments are not the panel (this tree's markup documents the
       scope bar in one) — every comment node is dropped from BOTH sides */
    const tw = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = []; while (tw.nextNode()) comments.push(tw.currentNode);
    for (const c of comments) c.remove();
    const html = clone.outerHTML.replace(/>\s*</g, '>\n<');
    const readout = (document.getElementById('readout') || {}).textContent || '';
    return { html, values: values.filter((v) => !(strip && /^(scopeLayers|scopePetals|scopePick)=/.test(v))), readout: readout.replace(/\d+(\.\d+)?\s*ms\b/g, '# ms'), barHidden: bar ? bar.hidden : null };
  }, { strip, plant });
}
const firstDiff = (a, b) => {
  const A = a.split('\n'), B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return `line ${i + 1}: base «${(A[i] || '').slice(0, 160)}» / here «${(B[i] || '').slice(0, 160)}»`;
  return null;
};

const baseSrv = await serveRepo(BASE), headSrv = await serveRepo(ROOT);
const baseKinds = await kindsOf(BASE);
const { browser, page } = await launchPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const findings = [];
let n = 0;
try {
  for (const [label, sets] of STATES) {
    await openBloom(page, baseSrv.port);
    const bb = await applyConfig(page, sets, baseKinds);
    if (bb.length) { findings.push(`${label}: the BASE page refused the state: ${bb.join('; ')}`); continue; }
    const a = await snapshot(page, false, null);
    await openBloom(page, headSrv.port);
    const hb = await applyConfig(page, sets);
    if (hb.length) { findings.push(`${label}: this tree refused the state: ${hb.join('; ')}`); continue; }
    const b = await snapshot(page, true, CONTROL && n === 0 ? 'petalTwist' : null);
    n++;
    if (b.barHidden !== true) findings.push(`${label}: the scope bar is not hidden with both toggles OFF`);
    const d1 = firstDiff(a.html, b.html);
    if (d1) findings.push(`${label}: the panel differs — ${d1}`);
    const d2 = firstDiff(a.values.join('\n'), b.values.join('\n'));
    if (d2) findings.push(`${label}: the live input values differ — ${d2}`);
    if (a.readout !== b.readout) findings.push(`${label}: the read-out differs — ${firstDiff(a.readout, b.readout) || '(whitespace)'}`);
  }
} finally {
  await browser.close();
  baseSrv.server.close(); headSrv.server.close();
}
if (errors.length) findings.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(`${n} states, this tree against ${BASE}${CONTROL ? ' (CONTROL: one ordinary control removed on this tree\'s page)' : ''}`);
if (CONTROL) {
  const caught = findings.some((f) => /the panel differs/.test(f));
  console.log(caught ? 'CONTROL: PASS — the removed control was seen as a difference' : 'CONTROL: FAIL — the removed control was NOT seen; the comparison measures nothing');
  process.exit(caught ? 0 : 1);
}
if (findings.length) { console.log(`\nFAIL — ${findings.length} finding(s):`); for (const f of findings) console.log('  ' + f); process.exit(1); }
console.log(`\nPASS — with both toggles OFF the panel (every attribute, label and read-out span), every live input value and the read-out are the base tree's on all ${n} states, but for the two toggle rows, the hidden scope bar and the hidden roles caption.`);
