/* ===================================================================
   PHOTO-TO-BLOOM DRY RUN (discovery, Nov 3 — throwaway, NOT a gate).

   Route A of docs/bloom-photo-to-bloom-discovery.md, executed by hand: a
   reader (the session) looked at a photo and wrote ONLY the photo-readable
   subset of the bloom's controls into `docs/photo-to-bloom/<name>.subset.json`.
   This tool turns each subset into a COMPLETE `bloom-design` v1 file —
   DEFAULTS overlaid with the subset, written by bloom-file.js's own
   `composeDoc` (one writer, never a second serialiser) — then loads that file
   into the real page through the page's OWN load path
   (`window.__bloomDesign.load`, the same function the Load button calls),
   prints every note the reader reported, and shoots the result.

   WHY THE FILE IS COMPLETE AND NOT THE SUBSET: rule 3 of the design file is
   "a missing field is reported and the page keeps what it has". A subset file
   loaded onto a page that holds a previous design keeps every control the
   subset does not name — the new bloom inherits the old one's leftovers.
   That is the first finding of the dry run, and composing over DEFAULTS is
   the construction that closes it (doc §2.3).

   EVERY CELL: print preview as shipped (ON — the visitor's view, read back
   from the app's shownMode), chrome hidden through the harness's stillFrame,
   two views, each settled on two consecutive byte-identical frames. No pixel
   delta is quoted (this renderer is not deterministic between page sessions).

   THE SHEET (`--sheet <png>`): one row per flower — the photo, then each
   version's renders. Photos are read from `--photos <dir>` as <flower>.jpg
   (the part of the name before "-v"); a flower whose photo is not there gets a
   labelled placeholder, which is how the committed sheet is made: only the CC0
   daisy photo is in the repository (docs/photo-to-bloom/photos/), the two
   tulip photos are iNaturalist open-data images whose author and licence could
   not be read from this session, so they are named by URL and not copied.

   RUN:  node tools/bloom-photo-dryrun.mjs <out-dir> [--sheet <png>] [--photos <dir>] [name ...]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from '../bloom-registry.js';
import { composeDoc, toText, readDoc } from '../bloom-file.js';
import { serveRepo, launchPage, openBloom, settleBuild, stillFrame, modeTag } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/photo-to-bloom');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const SHEET = opt('--sheet'), PHOTOS = opt('--photos') || path.join(ROOT, 'docs/photo-to-bloom/photos');
const outDir = argv[0] || '/tmp/bloom-photo-dryrun';
const only = argv.slice(1);
fs.mkdirSync(outDir, { recursive: true });

const names = fs.readdirSync(DIR).filter((f) => f.endsWith('.subset.json')).map((f) => f.replace('.subset.json', ''))
  .filter((n) => !only.length || only.includes(n)).sort();

/* the views: FRONT is the photo's own view of a face-on flower (down the
   +z axis the bloom opens along); THREE-QUARTER and SIDE carry what a front
   view cannot (category b of the census). */
const VIEWS = {
  front: { dir: [0.001, -0.02, 1], up: [0, 1, 0] },
  threequarter: { dir: [0.6, -0.8, 0.55], up: [0, 0, 1] },
  low: { dir: [0.45, -0.85, 0.3], up: [0, 0, 1] },
  side: { dir: [0.0, -1, 0.12], up: [0, 0, 1] },
};

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1 });
const report = {};
try {
  for (const name of names) {
    const subset = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.subset.json`), 'utf8'));
    /* `views`, `frame` and `frameZ` are CAMERA, not design — they are never written to the file */
    const { views = ['front', 'threequarter'], frame = 1, frameZ = 0.08 } = subset;
    const controls = subset.controls;
    /* the subset is checked through the file's own reader FIRST, so a value the
       schema should never emit (a bad choice, a value off its range) is told
       here and not discovered on the page */
    const doc = composeDoc({ ...DEFAULTS, ...controls }, { savedAt: '2026-11-03T00:00:00.000Z' });
    const pre = readDoc(JSON.parse(toText(doc)));
    const text = toText(doc);
    fs.writeFileSync(path.join(DIR, `${name}.bloom-design.json`), text);

    await openBloom(page, port, { asShipped: true });
    const res = await page.evaluate(([t, n]) => window.__bloomDesign.load(t, n), [text, `${name}.bloom-design.json`]);
    await settleBuild(page, 120000);
    const m = await page.evaluate(() => window.__bloomMetrics());
    const read = await page.evaluate(() => document.getElementById('readout') && document.getElementById('readout').textContent);
    const bad = await stillFrame(page);
    if (bad.length) throw new Error(`${name}: ${bad.join('; ')}`);
    const shots = {};
    for (const v of views) {
      const r = (m.maxDimMm || 80) * 0.5 * frame;
      const z = (m.maxDimMm || 80) * frameZ;
      await page.evaluate(([rr, zz, vv]) => window.__bloomFrame(rr, 0, [0, 0, zz], vv.dir, vv.up), [r, z, VIEWS[v]]);
      let prev = null, buf = null;
      for (let k = 0; k < 25; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 640, height: 640 } }); if (prev && buf.equals(prev)) break; prev = buf; }
      const f = path.join(outDir, `${name}-${v}.png`);
      fs.writeFileSync(f, buf);
      shots[v] = f;
    }
    report[name] = {
      controlsSet: Object.keys(controls).length,
      readerNotesBeforeLoad: pre.notes.map((x) => `${x.kind}: ${x.text}`),
      pageLoad: { action: res.action, applied: res.applied, fields: res.fields, notes: (res.notes || []).map((x) => `${x.kind}: ${x.text}`) },
      mode: modeTag(m),
      tris: m.shownMode === 'export' ? m.shownTris : null,   // the EXPORT count: print preview is on, so the shown build is the export one
      maxDimMm: m.maxDimMm ?? null,
      readout: (read || '').replace(/\s+/g, ' ').slice(0, 1600),
      shots,
    };
    report[name].subset = controls;
    console.log(`${name}: ${res.action}, ${res.applied}/${res.fields} controls applied, ${(res.notes || []).length} notes; ${modeTag(m)}`);
    for (const n of report[name].pageLoad.notes) console.log('   note ' + n);
  }
  if (SHEET) await sheet();
} finally {
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); server.close();
}

/* THE SHEET, composed in the same browser: one row per FLOWER, the photo first,
   then every version's views with the version's control count and the page's
   own reported triangle count in the caption. Nothing is measured off the
   pixels — the comparison is Eva's eye. */
async function sheet() {
  const SOURCES = {
    daisy: 'iNaturalist photo 26598961 (Bellis perennis), Peter de Lange, CC0 — crop committed',
    tulip: 'iNaturalist photo 270483011 (garden tulip) — open-data bucket; author/licence not readable from this session, not committed',
    double: 'iNaturalist photo 193335846 (double "peony" tulips, crop) — open-data bucket; author/licence not readable from this session, not committed',
  };
  const flowers = [...new Set(Object.keys(report).map((n) => n.replace(/-v\d+$/, '')))];
  const img = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
  let html = `<html><body style="margin:0;background:#16181a;color:#e8e8e4;font:13px monospace;padding:16px;width:${Math.max(...flowers.map((f) => 1 + Object.keys(report).filter((n) => n.startsWith(f + '-')).reduce((a, n) => a + Object.keys(report[n].shots).length, 0))) * 268}px">`;
  html += '<h2 style="margin:0 0 8px">Photo to bloom — dry run of route A (hand-written design files, loaded through the page\'s own Load path; PRINT PREVIEW on)</h2>';
  for (const f of flowers) {
    const cand = ['jpg', 'jpeg', 'png'].map((e) => path.join(PHOTOS, `${f}.${e}`)).concat(fs.existsSync(PHOTOS) ? fs.readdirSync(PHOTOS).filter((x) => x.startsWith(f + '-')).map((x) => path.join(PHOTOS, x)) : []);
    const photo = cand.find((p) => fs.existsSync(p));
    html += `<div style="margin:14px 0 4px;font-size:15px">${f.toUpperCase()} — ${SOURCES[f] || ''}</div><div style="display:flex;gap:8px;align-items:flex-start">`;
    html += photo ? `<div><img src="${img(photo)}" style="width:260px;height:260px;object-fit:cover"><div>photo</div></div>`
      : `<div style="width:260px;height:260px;border:1px dashed #888;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;box-sizing:border-box">photo not committed —<br>${SOURCES[f] || f}</div>`;
    for (const n of Object.keys(report).filter((x) => x.startsWith(f + '-')).sort()) {
      const r = report[n];
      for (const [v, file] of Object.entries(r.shots)) html += `<div><img src="${img(file)}" style="width:260px;height:260px"><div>${n} · ${v}<br>${r.controlsSet} controls set · ${(r.tris || 0).toLocaleString('en-US')} tris (export)</div></div>`;
    }
    html += '</div>';
  }
  html += '</body></html>';
  const p2 = await browser.newPage();
  await p2.setContent(html);
  await p2.screenshot({ path: SHEET, fullPage: true });
  await p2.close();
}
