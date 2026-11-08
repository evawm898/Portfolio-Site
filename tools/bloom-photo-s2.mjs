#!/usr/bin/env node
/* ===================================================================
   PHOTO-TO-BLOOM S2 — THE GLOBALS STAGE ON EVA'S OWN PHOTOS (Nov 4).
   Read §10 of docs/bloom-photo-to-bloom-discovery.md before touching it.
   NOT a gate and not in CI; the gate for each file is
   tools/verify-bloom-photo-subset.mjs (load as new, zero notes).

   The files under docs/photo-to-bloom/eva-set/<flower>/ are route A's output
   for three flowers: per version vN, a SUBSET design file
   (`<flower>-vN.subset.bloom-design.json`) and its SIDECAR
   (`<flower>-vN.bloom-photo.json`, §9.3's format). v1 is the FRONT photo
   plus the answers to the questions asked; v2 adds the SIDE photo; v3 is the
   one feedback iteration after the render sheet.

   --check   (Node only, no browser) every sidecar against its subset — §9.3's
             rules, so a sidecar cannot quietly disagree with its design:
               S1 format "bloom-photo" v1, `design` names the subset beside it;
               S2 designSha256 is the subset's bytes (rule 3);
               S3 `controls` names EXACTLY the subset's controls, each value
                  equal (rule 1), each confidence in the enum, each source
                  photo|answer;
               S4 source "answer" names a question that was asked, and every
                  question's `resolves` is a control in the subset or one its
                  answer left at the default (rule 2);
               S5 every photo id a control / unmapped entry cites is declared;
               S6 `revisedFrom.changes` is EXACTLY the difference between this
                  version's composed state and the previous one's — the
                  "which changed and by how much" record, restated here from the
                  two subsets and DEFAULTS, never read from the sidecar.
               S7 (S3, Nov 5) a version that writes `overrides.layers` carries a
                  sidecar `layers` naming EXACTLY the subset's layer entries —
                  every offset equal, its `value` the composed global plus the
                  offset (what the layer OWNS), every owned value equal; each
                  confidence in the enum, each photo declared — and no sidecar
                  `layers` where the subset writes none;
                  (S5, schema v4) a DELTA offset (`LAYER_SCHEMA.deltas`) is recorded
                  `kind: "delta"` with `global: { value, confidence }` — the composed
                  global and the `controls` record's own confidence ("default" where
                  the subset leaves it at its default); an owned one never says delta;
               S6 also restates `revisedFrom.layerChanges` from the two subsets'
                  layer entries (null where absent), never from the sidecar.
             Exits 1 on any finding.

   RENDER:   node tools/bloom-photo-s2.mjs <out-dir> [--sheet <png>] [--photos <dir>] [--sheet-bare <png>]
             Loads every version AS A NEW DESIGN through the page's own
             `__bloomDesign.loadAsNew` (the Load as new button's function), print
             preview ON as shipped (read back from the app's shownMode), and
             shoots TWO views per flower that match the photo angles (VIEWS
             below). The camera target and radius come from the EXPORT mesh's
             bounding box built in Node from the same composed state, so a tall
             bud and a flat star are both framed on themselves. Each view is
             settled on two consecutive byte-identical frames. No pixel delta
             is quoted anywhere: the comparison is Eva's eye.
             --photos <dir> holds <flower>-front.png and <flower>-side.png. The
             photos are NOT in the repository (Eva's ruling, Nov 4: they carry
             stock watermarks), so the committed sheet shows labelled
             placeholders (`--sheet-bare`, the same renders with no photo read)
             and the sheet with photos is sent in-session only.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from '../bloom-registry.js';
import { LAYER_SCHEMA } from './bloom-photo-census.mjs';
import { readNewDesign, scopesForBuild } from '../bloom-file.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SET = path.join(ROOT, 'docs/photo-to-bloom/eva-set');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (k) => { const i = argv.indexOf(k); if (i < 0) return false; argv.splice(i, 1); return true; };

/* the camera per flower, matching the PHOTO's own angles (dir = from the
   target toward the camera, z is the axis the bloom opens along) */
const VIEWS = {
  daisy: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -0.9, 0.42], up: [0, 0, 1] } },
  lotus: { front: { dir: [0.0, -0.62, 0.79], up: [0, 0, 1] }, side: { dir: [0.0, -1, 0.05], up: [0, 0, 1] } },
  waterlily: { front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] }, side: { dir: [0.0, -1, 0.14], up: [0, 0, 1] } },
};
const CONF = new Set(['low', 'medium', 'high']);

function versions() {
  const out = [];
  for (const flower of fs.readdirSync(SET).filter((f) => fs.statSync(path.join(SET, f)).isDirectory()).sort()) {
    for (const f of fs.readdirSync(path.join(SET, flower)).filter((x) => x.endsWith('.subset.bloom-design.json')).sort()) {
      const v = f.replace('.subset.bloom-design.json', '').replace(`${flower}-`, '');
      out.push({ flower, v, n: Number(v.replace(/^v/, '')), design: path.join(SET, flower, f), sidecar: path.join(SET, flower, `${flower}-${v}.bloom-photo.json`) });
    }
  }
  /* by the version's NUMBER: a filename sort puts v10 between v1 and v2, and S6's
     "the previous version" then compared v10 against v1 (S6, Nov 7) */
  return out.sort((a, b) => a.flower.localeCompare(b.flower) || a.n - b.n);
}
const composed = (subset) => { const r = readNewDesign(subset); if (!r.ok) throw new Error(r.error); return r.doc.controls; };
const scopesOf = (subset) => { const r = readNewDesign(subset); if (!r.ok) throw new Error(r.error); return r.doc.overrides; };
/* every (layer, offsets|values, id) a subset's layer entries carry — one owner for S6 and S7 */
const layerFields = (subset) => { const m = {}; for (const e of ((subset.overrides || {}).layers || [])) for (const g of ['offsets', 'values']) for (const [k, x] of Object.entries(e[g] || {})) m[`${e.layer}:${g}.${k}`] = x; return m; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function check() {
  const bad = [];
  const all = versions();
  for (const it of all) {
    const tag = `${it.flower}-${it.v}`;
    const bytes = fs.readFileSync(it.design);
    const subset = JSON.parse(bytes);
    if (!fs.existsSync(it.sidecar)) { bad.push(`${tag}: no sidecar`); continue; }
    const sc = JSON.parse(fs.readFileSync(it.sidecar, 'utf8'));
    if (sc.format !== 'bloom-photo' || sc.version !== 1) bad.push(`${tag} S1: format/version ${sc.format}/${sc.version}`);
    if (sc.design !== path.basename(it.design)) bad.push(`${tag} S1: design names ${sc.design}`);
    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    if (sc.designSha256 !== sha) bad.push(`${tag} S2: designSha256 ${sc.designSha256} is not the subset's ${sha}`);
    const sk = Object.keys(subset.controls || {}).sort(), ck = Object.keys(sc.controls || {}).sort();
    if (!same(sk, ck)) bad.push(`${tag} S3: sidecar controls [${ck}] != subset [${sk}]`);
    const asked = new Set((sc.questions || []).map((q) => q.id));
    const photoIds = new Set((sc.photos || []).map((p) => p.id));
    for (const [id, c] of Object.entries(sc.controls || {})) {
      if (!same(c.value, subset.controls[id])) bad.push(`${tag} S3: ${id} value ${JSON.stringify(c.value)} != subset ${JSON.stringify(subset.controls[id])}`);
      if (!CONF.has(c.confidence)) bad.push(`${tag} S3: ${id} confidence ${c.confidence}`);
      if (c.source !== 'photo' && c.source !== 'answer') bad.push(`${tag} S3: ${id} source ${c.source}`);
      if (c.source === 'answer' && !asked.has(c.question)) bad.push(`${tag} S4: ${id} is an answer to ${c.question}, which was not asked`);
      if (c.source === 'photo' && !(c.photos || []).length) bad.push(`${tag} S5: ${id} is from a photo and names none`);
      for (const p of c.photos || []) if (!photoIds.has(p)) bad.push(`${tag} S5: ${id} cites undeclared photo ${p}`);
    }
    for (const q of sc.questions || []) for (const id of q.resolves || []) {
      if (!(id in subset.controls) && !(id in DEFAULTS)) bad.push(`${tag} S4: ${q.id} resolves ${id}, not a control`);
    }
    for (const u of sc.unmapped || []) for (const p of u.photos || []) if (!photoIds.has(p)) bad.push(`${tag} S5: unmapped "${u.feature}" cites undeclared photo ${p}`);
    /* S7: the per-layer record */
    const lf = layerFields(subset);
    if (!Object.keys(lf).length) { if (sc.layers) bad.push(`${tag} S7: a sidecar 'layers' where the subset writes no layer entry`); }
    else {
      const g = composed(subset);
      const sf = {};
      for (const L of sc.layers || []) for (const grp of ['offsets', 'values']) for (const [k, x] of Object.entries(L[grp] || {})) {
        sf[`${L.layer}:${grp}.${k}`] = grp === 'offsets' ? x.offset : x.value;
        if (grp === 'offsets' && !same(x.value, +(Number(g[k]) + x.offset).toFixed(9))) bad.push(`${tag} S7: layers[${L.layer}] ${k} records value ${x.value}, the global ${g[k]} + offset ${x.offset} is ${Number(g[k]) + x.offset}`);
        if (!CONF.has(x.confidence)) bad.push(`${tag} S7: layers[${L.layer}] ${k} confidence ${x.confidence}`);
        /* schema v4 (S5): a DELTA offset (petalCup / petalSpineCurl) says so, and carries the GLOBAL it rides
           on with that global's own confidence — the composed global, and the `controls` record's confidence
           (or "default" where the subset leaves the global at its default) */
        if (grp === 'offsets' && LAYER_SCHEMA.deltas.includes(k)) {
          const gc = sc.controls && sc.controls[k] ? sc.controls[k].confidence : 'default';
          if (x.kind !== 'delta') bad.push(`${tag} S7: layers[${L.layer}] ${k} is a delta offset and is not recorded as kind "delta"`);
          if (!x.global || !same(x.global.value, g[k])) bad.push(`${tag} S7: layers[${L.layer}] ${k} records global ${JSON.stringify(x.global && x.global.value)}, the composed global is ${g[k]}`);
          else if (x.global.confidence !== gc) bad.push(`${tag} S7: layers[${L.layer}] ${k} records the global's confidence ${x.global.confidence}, the sidecar's controls say ${gc}`);
        } else if (grp === 'offsets' && x.kind === 'delta') bad.push(`${tag} S7: layers[${L.layer}] ${k} is recorded as a delta and is an OWNED quantity`);
        if (!(x.photos || []).length) bad.push(`${tag} S7: layers[${L.layer}] ${k} names no photo`);
        for (const p of x.photos || []) if (!photoIds.has(p)) bad.push(`${tag} S5: layers[${L.layer}] ${k} cites undeclared photo ${p}`);
      }
      const a = Object.keys(lf).sort(), b = Object.keys(sf).sort();
      if (!same(a, b)) bad.push(`${tag} S7: sidecar layer fields [${b}] != subset [${a}]`);
      for (const k of a) if (k in sf && !same(sf[k], lf[k])) bad.push(`${tag} S7: ${k} sidecar ${JSON.stringify(sf[k])} != subset ${JSON.stringify(lf[k])}`);
    }
    /* S6: restate the revision from the two subsets, never from the sidecar */
    const prev = all.filter((x) => x.flower === it.flower && x.n < it.n).pop();
    if (prev) {
      const a = composed(JSON.parse(fs.readFileSync(prev.design, 'utf8'))), b = composed(subset);
      const want = Object.keys(b).filter((id) => !same(a[id], b[id])).sort();
      const got = Object.keys((sc.revisedFrom && sc.revisedFrom.changes) || {}).sort();
      if (!sc.revisedFrom || sc.revisedFrom.design !== path.basename(prev.design)) bad.push(`${tag} S6: revisedFrom does not name ${path.basename(prev.design)}`);
      if (!same(want, got)) bad.push(`${tag} S6: changes [${got}] != the composed difference [${want}]`);
      for (const id of want) {
        const c = sc.revisedFrom.changes[id];
        if (c && (!same(c.from, a[id]) || !same(c.to, b[id]))) bad.push(`${tag} S6: ${id} recorded ${c.from} -> ${c.to}, composed ${a[id]} -> ${b[id]}`);
      }
      const pa = layerFields(JSON.parse(fs.readFileSync(prev.design, 'utf8'))), pb = layerFields(subset);
      const wantL = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter((k) => !same(pa[k], pb[k])).sort()
        .map((k) => ({ layer: +k.split(':')[0], field: k.split(':')[1], from: pa[k] ?? null, to: pb[k] ?? null }));
      const gotL = ((sc.revisedFrom && sc.revisedFrom.layerChanges) || []).slice().sort((x, y) => `${x.layer}:${x.field}`.localeCompare(`${y.layer}:${y.field}`));
      if (!same(wantL, gotL)) bad.push(`${tag} S6: layerChanges ${JSON.stringify(gotL)} != the subsets' difference ${JSON.stringify(wantL)}`);
    } else if (sc.revisedFrom) bad.push(`${tag} S6: a first version carries revisedFrom`);
  }
  for (const b of bad) console.log('FAIL ' + b);
  console.log(`SIDECARS: ${all.length} versions, ${bad.length ? `${bad.length} finding(s) — FAIL` : 'PASS'}`);
  return bad.length === 0;
}

async function bbox(state, overrides) {
  const G = await import('../bloom-geometry.js');
  const acc = new G.MeshBuilder({ exportMode: true });
  /* WITH the file's scopes (S3): a scoped version built without them is a
     different bloom, and the camera would frame the wrong one */
  const built = G.buildBloomInto(acc, state, { below: null, scopes: scopesForBuild(overrides) });
  const P = acc.positions, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  /* THE PROPORTIONS a side photo is read against, on the EXPORT mesh: the
     whole flower's height (z) over its widest horizontal diameter, and the
     same for the petals of every layer but the outermost (the closed BODY of
     a bud with its splayed outer whorl excluded) — by each petal's own emitted
     triangle range, read from the builder's record. */
  const ext = (tris) => { let zl = Infinity, zh = -Infinity, r = 0; for (const [a, b] of tris) for (let t = a; t < b; t++) for (let j = 0; j < 9; j += 3) { const i = t * 9 + j; zl = Math.min(zl, P[i + 2]); zh = Math.max(zh, P[i + 2]); r = Math.max(r, Math.hypot(P[i], P[i + 1])); } return { h: zh - zl, w: 2 * r }; };
  /* the BODY is the inner half of the layers (layer >= ceil(n/2)): petalsAll is
     built ring by ring, one ring per layer, so a petal's layer is its index over
     the per-ring count — read off the builder's own list, scoped or not */
  const all = built.petalsAll || [], nRings = (built.rings || []).length || 1, per = all.length / nRings;
  const tagged = all.map((p, i) => ({ p, layer: Math.floor(i / per) })).filter((x) => x.p && x.p.triRange);
  const whole = ext(tagged.map((x) => x.p.triRange)), inner = ext(tagged.filter((x) => x.layer >= Math.ceil(nRings / 2)).map((x) => x.p.triRange));
  return { lo, hi, petalsHW: +(whole.h / whole.w).toFixed(3), petalsHmm: +whole.h.toFixed(1), petalsWmm: +whole.w.toFixed(1), bodyLayers: `${Math.ceil(nRings / 2)}..${nRings - 1}`, bodyHW: nRings > 1 ? +(inner.h / inner.w).toFixed(3) : null, bodyHmm: +inner.h.toFixed(1), bodyWmm: +inner.w.toFixed(1) };
}

async function render(outDir, SHEET, PHOTOS, BARE) {
  const { serveRepo, launchPage, openBloom, settleBuild, stillFrame, modeTag } = await import('./bloom-harness.mjs');
  fs.mkdirSync(outDir, { recursive: true });
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1 });
  const report = {};
  try {
    for (const it of versions().filter((x) => !ONLY_V.length || ONLY_V.includes(x.v) || ONLY_V.includes(`${x.flower}:${x.v}`))) {
      const tag = `${it.flower}-${it.v}`;
      const text = fs.readFileSync(it.design, 'utf8');
      const state = composed(JSON.parse(text));
      const { lo, hi, ...prop } = await bbox(state, scopesOf(JSON.parse(text)));
      await openBloom(page, port, { asShipped: true });
      const res = await page.evaluate(([t, n]) => window.__bloomDesign.loadAsNew(t, n), [text, path.basename(it.design)]);
      await settleBuild(page, 180000);
      const m = await page.evaluate(() => window.__bloomMetrics());
      const read = await page.evaluate(() => (document.getElementById('readout') || {}).textContent || '');
      const bad = await stillFrame(page);
      if (bad.length) throw new Error(`${tag}: ${bad.join('; ')}`);
      const shots = {};
      const at = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2);
      for (const [v, view] of Object.entries(VIEWS[it.flower])) {
        /* the radius: the bounding box's own half-extent seen across this view */
        const ext = [0, 1, 2].map((k) => (hi[k] - lo[k]) / 2);
        const r = Math.hypot(...ext) * 0.8;
        await page.evaluate(([rr, aa, vv]) => window.__bloomFrame(rr, 0, aa, vv.dir, vv.up), [r, at, view]);
        let prev = null, buf = null;
        for (let k = 0; k < 30; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 640, height: 640 } }); if (prev && buf.equals(prev)) break; prev = buf; }
        const f = path.join(outDir, `${tag}-${v}.png`);
        fs.writeFileSync(f, buf);
        shots[v] = f;
      }
      const notes = (res && res.notes) || [];
      report[tag] = {
        flower: it.flower, v: it.v, named: Object.keys(JSON.parse(text).controls).length,
        load: { action: res && res.action, applied: res && res.applied, notes: notes.map((x) => `${x.kind}: ${x.text}`) },
        mode: modeTag(m), exportTris: m.shownMode === 'export' ? m.shownTris : null, maxDimMm: m.maxDimMm,
        bboxMm: hi.map((h, k) => +(h - lo[k]).toFixed(1)), proportions: prop,
        scopes: m.scopes ? { layersLive: m.scopes.layersLive, scopedLayers: m.scopes.scopedLayers, keptLayers: m.scopes.keptLayers } : null,
        told: read.split(/(?<=[.)])\s+/).filter((s) => /CLAMP|FOLD LIMIT|NO ROOM|EXHAUSTED|SATURAT|HUB GROWN/.test(s)).map((s) => s.trim().slice(0, 240)),
        shots,
      };
      console.log(`${tag}: ${report[tag].load.action}, ${notes.length} notes; ${report[tag].mode}; bbox ${report[tag].bboxMm.join(' x ')} mm${report[tag].told.length ? `; told: ${report[tag].told.length}` : ''}`);
    }
    if (SHEET) await sheet(browser, report, SHEET, PHOTOS);
    if (BARE) await sheet(browser, report, BARE, null);
  } finally {
    const slim = Object.fromEntries(Object.entries(report).map(([k, r]) => [k, { ...r, shots: Object.fromEntries(Object.entries(r.shots).map(([v, f]) => [v, path.basename(f)])) }]));
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(slim, null, 2));
    await browser.close(); server.close();
  }
}

/* one row per flower: the two photos (or labelled placeholders), then each
   version's front and side renders, captioned with the version's named control
   count, the page's own EXPORT triangle count and what the version changed */
async function sheet(browser, report, SHEET, PHOTOS) {
  const img = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  const flowers = [...new Set(Object.values(report).map((r) => r.flower))];
  const cols = 2 + Math.max(...flowers.map((f) => Object.values(report).filter((r) => r.flower === f).length * 2));
  const W = 232;
  let html = `<html><body style="margin:0;background:#16181a;color:#e8e8e4;font:12px monospace;padding:14px;width:${cols * (W + 8) + 20}px">`;
  html += TITLE ? `<h2 style="margin:0 0 6px">${TITLE}</h2>` : '<h2 style="margin:0 0 6px">Photo to bloom S2 — globals stage on Eva\'s set. Every design loaded AS A NEW DESIGN (zero notes); PRINT PREVIEW on.</h2>';
  html += `<div style="margin-bottom:8px;color:#aab">${SUBTITLE || 'v1 = front photo + the Q-profile answer · v2 = + the side photo · v3 = one feedback iteration after the sheet. Cameras match the photo angles. No pixel delta is quoted.'}</div>`;
  for (const f of flowers) {
    html += `<div style="margin:12px 0 4px;font-size:14px">${f.toUpperCase()}</div><div style="display:flex;gap:8px;align-items:flex-start">`;
    for (const v of ['front', 'side']) {
      const p = PHOTOS && path.join(PHOTOS, `${f}-${v}.png`);
      html += p && fs.existsSync(p)
        ? `<div><img src="${img(p)}" style="width:${W}px;height:${W}px;object-fit:contain;background:#fff"><div>photo · ${v}</div></div>`
        : `<div style="width:${W}px;height:${W}px;border:1px dashed #888;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;box-sizing:border-box">photo · ${v}<br>not committed (stock watermark — Eva's ruling, Nov 4)</div>`;
    }
    for (const r of Object.values(report).filter((x) => x.flower === f)) {
      const sc = JSON.parse(fs.readFileSync(path.join(SET, f, `${f}-${r.v}.bloom-photo.json`), 'utf8'));
      const val = (x) => (x && typeof x === 'object' ? 'curve' : x);
      const ch = sc.revisedFrom ? [...Object.entries(sc.revisedFrom.changes).map(([id, c]) => `${id} ${val(c.from)}→${val(c.to)}`), ...((sc.revisedFrom.layerChanges || []).map((c) => `L${c.layer} ${c.field.replace(/^offsets\./, '').replace(/^values\./, '')} ${typeof c.from === 'object' && c.from ? 'curve' : c.from}→${typeof c.to === 'object' && c.to ? 'curve' : c.to}`))].join(', ') : 'first pass';
      const own = (sc.layers || []).map((L) => `L${L.layer}: ${['petalLength', 'petalTilt', 'petalCup', 'petalSpineCurl'].filter((k) => L.offsets && L.offsets[k]).map((k) => `${({ petalLength: 'len', petalTilt: 'tilt', petalCup: 'cup', petalSpineCurl: 'curl' })[k]} ${L.offsets[k].value}`).join(' ')}${L.values && L.values.petalSpineCurve ? ' +spine' : ''}${L.values && L.values.petalOutlineCurve ? ' +outline' : ''}${L.values && L.values.layerRing ? ` ring ${L.values.layerRing.value}` : ''}`).join(' · ');
      for (const [v, file] of Object.entries(r.shots)) {
        html += `<div style="width:${W}px"><img src="${img(file)}" style="width:${W}px;height:${W}px"><div>${r.v} · ${v} · ${r.named} named · ${(r.exportTris || 0).toLocaleString('en-US')} tris (export)</div>${v === 'front' ? `<div style="color:#9ab;font-size:10px">${ch}</div>` : `<div style="color:#cb9;font-size:10px">${own || 'no per-layer values'}${r.proportions && r.proportions.bodyHW ? ` · inner-half h:w ${r.proportions.bodyHW}` : ''} · petals h:w ${r.proportions ? r.proportions.petalsHW : '?'}</div>`}</div>`;
      }
    }
    html += '</div>';
  }
  html += '</body></html>';
  const p2 = await browser.newPage();
  await p2.setContent(html);
  await p2.screenshot({ path: SHEET, fullPage: true });
  await p2.close();
}

if (flag('--check')) process.exit(check() ? 0 : 1);
const SHEET = opt('--sheet'), PHOTOS = opt('--photos'), BARE = opt('--sheet-bare');
const ONLY_V = (opt('--versions') || '').split(',').filter(Boolean), TITLE = opt('--title'), SUBTITLE = opt('--subtitle');
if (!check()) process.exit(1);
await render(argv[0] || '/tmp/bloom-photo-s2', SHEET, PHOTOS, BARE);
