#!/usr/bin/env node
/* verify-hanabi.mjs — the /hanabi deck designer, checked against its own claims.

   NOT IN CI (no workflow names a hanabi file; Eva's brief: no new gate). Run by hand
   before calling a /hanabi change done.

   PART ONE — Node, the pure modules (hanabi/deck.js, symbols.js, firework.js, layout.js)
     H1  the deck is the standard distribution: per suit 3/2/2/2/1, 50 cards, 60 with
         the rainbow suit, plus 8 clue and 3 fuse tokens — restated here, not imported
     H2  every active suit has its own symbol by default, and every card face carries
         its suit's symbol path (colour is never the only cue — the hard requirement)
     H3  rank escalates: each rank's spec is strictly fuller than the one below
         (stars x rings, size), and duplicates of a suit+rank render byte-identically
     H4  a phase-2 override in design.fireworks reaches the card and nothing else
     H5  every layout x corner mode x size preset renders a well-formed SVG whose
         viewBox is the BLEED box of that size
     H6  imposition: every card sits inside the sheet with >= the crop-mark room, no two
         overlap, and each crop mark lies on a trim line (restated from the size)
     H7  the duplex back sheet is the face grid mirrored left to right
     H8  a mark that does not stand off the card (contrast < 3) gets a halo
     H9  the design file round-trips, and a newer version is refused
   PART TWO — Chromium, the real page (cdnjs served from node_modules, fonts blocked)
     B1  the page loads with no page error, grayscale and guides toggles act on the stage
     B2  the three layouts each render 5 cards in the A/B/C view
     B3  the print PDF: page count, and on page 1 rasterised by pdftoppm the crop marks are
         ink at the positions H6 computed and the card art starts exactly at the bleed box
     B4  the PNG zip: one file per face + back, each 300 dpi of the bleed box

   --negative-control re-runs against deliberately broken copies; each must fail the check
   that names it.  --no-browser runs part one alone.  --keep <dir> copies the exported PDFs there.
*/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const NO_BROWSER = ARGS.includes('--no-browser');
const NEG = ARGS.includes('--negative-control');
const KEEP = ARGS.includes('--keep') ? ARGS[ARGS.indexOf('--keep') + 1] : null;   // copy the PDFs here

const MODULES = ['deck.js', 'symbols.js', 'firework.js', 'layout.js', 'export.js'];

const MUTANTS = [
  { id: 'distribution-wrong', file: 'deck.js', from: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 }", to: "COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2 }", breaks: ['H1'] },
  { id: 'corner-drops-symbol', file: 'layout.js', from: "+ symbol(suit.symbol, (w - sym) / 2, digitH * 1.08, sym, suit.primary, halo);", to: ";", breaks: ['H2'] },
  { id: 'rank-does-not-escalate', file: 'firework.js', from: "4: { burstType: 'chrysanthemum', starCount: 18, rings: 3, size: 0.86", to: "4: { burstType: 'chrysanthemum', starCount: 12, rings: 1, size: 0.58", breaks: ['H3'] },
  { id: 'override-ignored', file: 'firework.js', from: "return over ? { ...spec, ...over } : spec;", to: "return spec;", breaks: ['H4'] },
  { id: 'crop-mark-off-trim', file: 'deck.js', from: "xs.add(+s.trimX.toFixed(6));", to: "xs.add(+(s.trimX - g.bleed).toFixed(6));", breaks: ['H6', 'B3'] },
  { id: 'duplex-not-mirrored', file: 'deck.js', from: "return r * imp.cols + c;", to: "return i;", breaks: ['H7'] },
  { id: 'shared-cut-keeps-inner-bleed', file: 'deck.js', from: "const l = c === 0 ? b : 0,", to: "const l = b,", breaks: ['H6'] },
  { id: 'no-halo', file: 'layout.js', from: "const halo = contrast(suit.primary, faceBg) < HALO_BELOW ? haloFor(suit.primary) : null;", to: "const halo = null;", breaks: ['H8'] },
];

// ---------------------------------------------------------------- part one
async function partOne(dir) {
  const imp = (m) => import(pathToFileURL(path.join(dir, m)).href + `?t=${Date.now()}${Math.random()}`);
  const D = await imp('deck.js'); const S = await imp('symbols.js'); const F = await imp('firework.js'); const L = await imp('layout.js');
  const res = [];
  const check = (id, name, fn) => { try { const r = fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message }); } };
  const symbolPath = (id) => S.SYMBOLS[id].d.slice(0, 40);

  check('H1', 'the standard distribution', () => {
    const d = D.defaultDesign();
    const per = (cards, id) => [1, 2, 3, 4, 5].map((r) => cards.filter((c) => c.suitId === id && c.rank === r).length).join('');
    let cards = D.deckCards(d);
    for (const s of D.activeSuits(d)) if (per(cards, s.id) !== '32221') return `${s.id}: ${per(cards, s.id)}`;
    if (cards.filter((c) => c.kind === 'card').length !== 50) return `${cards.length} cards without rainbow`;
    if (cards.filter((c) => c.kind === 'clue').length !== 8 || cards.filter((c) => c.kind === 'fuse').length !== 3) return 'tokens wrong';
    d.rainbow = true; cards = D.deckCards(d);
    if (cards.filter((c) => c.kind === 'card').length !== 60) return `${cards.length} with rainbow`;
    if (per(cards, 'rainbow') !== '32221') return 'rainbow distribution';
    return true;
  });

  check('H2', 'a symbol on every face', () => {
    const d = D.defaultDesign(); d.rainbow = true;
    if (D.symbolClashes(d).size) return 'default suits share a symbol';
    for (const layout of ['A', 'B', 'C']) for (const corners of ['inverted', 'upright', 'four']) {
      d.layout = layout; d.corners = corners;
      for (const s of D.activeSuits(d)) for (const r of [1, 5]) {
        const svg = L.renderFace(d, { kind: 'card', suitId: s.id, rank: r });
        if (!svg.includes(symbolPath(s.symbol))) return `${layout}/${corners} ${s.id} ${r}: no symbol`;
        for (const o of D.activeSuits(d)) if (o.id !== s.id && svg.includes(symbolPath(o.symbol))) return `${s.id} carries ${o.id}'s symbol`;
      }
    }
    const clash = D.defaultDesign(); clash.suits[1].symbol = clash.suits[0].symbol;
    if (D.symbolClashes(clash).size !== 2) return 'a shared symbol is not reported';
    return true;
  });

  check('H3', 'rank escalates; duplicates identical', () => {
    const d = D.defaultDesign();
    for (const s of d.suits) {
      let prev = null;
      for (const r of [1, 2, 3, 4, 5]) {
        const sp = F.fireworkSpec(d, s, r);
        const fullness = sp.starCount * sp.rings;
        if (prev && !(fullness > prev.fullness && sp.size > prev.size)) return `${s.id} ${r} is not fuller than ${r - 1}`;
        prev = { fullness, size: sp.size };
      }
    }
    const cards = D.deckCards(d).filter((c) => c.kind === 'card' && c.suitId === 'red' && c.rank === 1);
    const svgs = new Set(cards.map((c) => L.renderFace(d, c, { idPrefix: 'x' })));
    return svgs.size === 1 || `${svgs.size} distinct pictures for red 1`;
  });

  check('H4', 'a phase-2 override reaches its card only', () => {
    const d = D.defaultDesign();
    const before = D.deckCards(d).map((c) => L.renderFace(d, c, { idPrefix: 'x' }));
    d.fireworks = { blue: { 3: { burstType: 'willow', colors: ['#00FF00'] } } };
    const after = D.deckCards(d).map((c) => L.renderFace(d, c, { idPrefix: 'x' }));
    const moved = D.deckCards(d).filter((c, i) => before[i] !== after[i]);
    if (!moved.length) return 'override moved nothing';
    if (!moved.every((c) => c.suitId === 'blue' && c.rank === 3)) return 'override moved another card';
    return F.fireworkSpec(d, D.suitById(d, 'blue'), 3).burstType === 'willow' || 'spec not merged';
  });

  check('H5', 'every layout x corners x size renders its bleed box', () => {
    const d = D.defaultDesign();
    const sizes = [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63], ['custom', 70, 120]];
    for (const [preset, w, h] of sizes) for (const layout of ['A', 'B', 'C']) for (const corners of ['inverted', 'upright', 'four']) {
      d.size = { preset, w, h }; d.layout = layout; d.corners = corners;
      const svg = L.renderFace(d, { kind: 'card', suitId: 'green', rank: 4 }, { guides: true });
      const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      if (!vb || Math.abs(+vb[1] - (w + 2 * d.bleed)) > 1e-6 || Math.abs(+vb[2] - (h + 2 * d.bleed)) > 1e-6) return `${preset}/${layout}: viewBox ${vb && vb.slice(1)}`;
      if ((svg.match(/<svg/g) || []).length !== 1 || !svg.endsWith('</svg>') || /NaN|undefined/.test(svg)) return `${preset}/${layout}/${corners}: malformed`;
    }
    return true;
  });

  check('H6', 'imposition: in bounds, no overlap, marks on trim lines', () => {
    for (const size of [['poker', 63.5, 88.9], ['bridge', 57.2, 88.9], ['mini', 44, 63]]) for (const paper of ['letter', 'a4'])
    for (const bleed of [0, 2, 3]) for (const cut of ['separate', 'shared']) {
      const d = D.defaultDesign(); d.size = { preset: size[0], w: size[1], h: size[2] }; d.bleed = bleed; d.print.cut = cut;
      const im = D.imposition(d, paper), P = im.paper, tag = `${size[0]}/${paper}/${bleed}/${cut}`;
      if (im.perSheet < 4) return `${tag}: only ${im.perSheet}`;
      const trimX = new Set(), trimY = new Set();
      for (const s of im.slots) {
        const r = s.draw;
        if (r.x < 5.999 || r.y < 5.999 || r.x + r.w > P.w - 5.999 || r.y + r.h > P.h - 5.999) return `${tag}: art in the mark margin`;
        // the TRIM must be inside the drawn art, with this card's bleed on every outer edge
        if (r.x > s.trimX + 1e-9 || r.y > s.trimY + 1e-9 || r.x + r.w < s.trimX + size[1] - 1e-9 || r.y + r.h < s.trimY + size[2] - 1e-9) return `${tag}: trim not covered`;
        for (const o of im.slots) { const q = o.draw; if (o !== s && r.x < q.x + q.w - 1e-6 && q.x < r.x + r.w - 1e-6 && r.y < q.y + q.h - 1e-6 && q.y < r.y + r.h - 1e-6) return `${tag}: overlap`; }
        if (cut === 'separate' && (Math.abs(r.w - size[1] - 2 * bleed) > 1e-9 || Math.abs(r.h - size[2] - 2 * bleed) > 1e-9)) return `${tag}: a card lost its bleed`;
        trimX.add((s.trimX).toFixed(6)); trimX.add((s.trimX + size[1]).toFixed(6)); trimY.add((s.trimY).toFixed(6)); trimY.add((s.trimY + size[2]).toFixed(6));
      }
      // restated trim: in shared mode every cut is ONE line between two cards
      if (cut === 'shared' && (trimX.size !== im.cols + 1 || trimY.size !== im.rows + 1)) return `${tag}: ${trimX.size} vertical cuts for ${im.cols} columns`;
      const marks = D.cropMarks(im);
      if (marks.length !== 2 * (trimX.size + trimY.size)) return `${tag}: ${marks.length} marks for ${trimX.size}+${trimY.size} trim lines`;
      for (const [x1, y1, x2, y2] of marks) {
        const vertical = x1 === x2;
        if (vertical ? !trimX.has(x1.toFixed(6)) : !trimY.has(y1.toFixed(6))) return `${tag}: a mark off every trim line`;
        const crosses = vertical ? (Math.min(y1, y2) < im.y0 + im.gridH && Math.max(y1, y2) > im.y0) : (Math.min(x1, x2) < im.x0 + im.gridW && Math.max(x1, x2) > im.x0);
        if (crosses) return `${tag}: a mark crosses the art`;
      }
    }
    return true;
  });

  check('H7', 'duplex backs land behind their faces', () => {
    // restated: a long-edge flip mirrors across the long side's axis — left-right on a
    // portrait sheet, top-bottom on a landscape one; short-edge the other way
    for (const [size, paper] of [['mini', 'letter'], ['poker', 'letter']]) for (const flip of ['long', 'short']) {
      const d = D.defaultDesign(); d.size = { preset: size, ...D.SIZE_PRESETS[size] };
      const im = D.imposition(d, paper), P = im.paper;
      const mirrorX = (P.w < P.h) === (flip === 'long');
      for (let i = 0; i < im.slots.length; i++) {
        const f = im.slots[i], bk = im.slots[D.backSlotIndex(im, i, flip)];
        const wantX = mirrorX ? P.w - f.trimX - d.size.w : f.trimX, wantY = mirrorX ? f.trimY : P.h - f.trimY - d.size.h;
        if (Math.abs(bk.trimX - wantX) > 1e-6 || Math.abs(bk.trimY - wantY) > 1e-6) return `${size}/${P.orientation}/${flip}: slot ${i}`;
      }
      if (im.cols < 2 || im.rows < 2) return `${size}: a ${im.cols}x${im.rows} grid cannot show a mirror`;
    }
    return true;
  });

  check('H8', 'a low-contrast mark gets a halo', () => {
    const d = D.defaultDesign(); d.suits[2].primary = '#1A2A60'; d.face.bg = '#0B1018';
    if (L.contrast(d.suits[2].primary, d.face.bg) >= L.HALO_BELOW) return 'fixture is not low contrast';
    const svg = L.renderFace(d, { kind: 'card', suitId: 'blue', rank: 2 });
    return /stroke="#FFFFFF" stroke-width="18"/.test(svg) || 'no halo on the numeral';
  });

  check('H9', 'the design file round-trips; newer refused', () => {
    const d = D.defaultDesign(); d.rainbow = true; d.layout = 'C'; d.suits[0].name = 'Moon'; d.fireworks = { red: { 2: { rings: 2 } } };
    const { design, notes } = D.normaliseDesign(JSON.parse(D.serialiseDesign(d)), S.SYMBOL_IDS);
    if (notes.length) return notes.join('; ');
    if (JSON.stringify(design) !== JSON.stringify({ ...d })) return 'did not come back identical';
    const newer = D.normaliseDesign({ ...d, version: D.VERSION + 1 }, S.SYMBOL_IDS);
    return newer.design === null || 'newer version read';
  });
  return res;
}

// ---------------------------------------------------------------- part two
// findChromium() looks for chrome-linux/; newer installs ship chrome-linux64/.
function chromiumPath() {
  const p = findChromium(); if (p) return p;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(base)) { const c = path.join(base, d, 'chrome-linux64', 'chrome'); if (d.startsWith('chromium-') && fs.existsSync(c)) return c; } } catch { /* none */ }
  return undefined;
}
function serve(root, overrides) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const rel = p.slice(1);
    const body = overrides[rel] ?? (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : null);
    if (body == null) { res.writeHead(404); return res.end(); }
    const ext = path.extname(rel);
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

function readPpm(file) {
  const buf = fs.readFileSync(file);
  const head = buf.toString('latin1', 0, 64).split(/\s+/);
  const w = +head[1], h = +head[2];
  let off = 0, fields = 0;
  while (fields < 4) { while (/\s/.test(String.fromCharCode(buf[off]))) off++; while (!/\s/.test(String.fromCharCode(buf[off]))) off++; fields++; }
  off++;
  return { w, h, px: (x, y) => { const i = off + (y * w + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; } };
}

async function partTwo(overrides = {}) {
  const { chromium } = await import(pathToFileURL(path.join(REPO, 'node_modules/playwright-core/index.mjs')).href);
  for (const m of ['jspdf/dist/jspdf.umd.min.js', 'jszip/dist/jszip.min.js'])
    if (!fs.existsSync(path.join(REPO, 'node_modules', m))) throw new Error(`missing node_modules/${m} — npm i --no-save jspdf@2.5.1 jszip@3.10.1 playwright-core`);
  const server = await serve(REPO, overrides);
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(REPO, 'node_modules', r.request().url().includes('jspdf') ? 'jspdf/dist/jspdf.umd.min.js' : 'jszip/dist/jszip.min.js')) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const res = [];
  const check = async (id, name, fn) => { try { const r = await fn(); res.push({ id, name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { res.push({ id, name, ok: false, detail: 'threw ' + e.message.split('\n')[0] }); } };
  try {
    await page.goto(`${base}/hanabi.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForFunction(() => window.__hanabi);

    await check('B1', 'loads; greyscale and guides act on the stage', async () => {
      if (errs.length) return errs.join(' | ');
      await page.check('#grayscale');
      const gray = await page.$eval('#stage .hb-cards', (el) => getComputedStyle(el).filter);
      await page.uncheck('#grayscale');
      await page.check('#guides');
      const guides = await page.$$eval('#stage .hb-guides', (g) => g.length);
      await page.uncheck('#guides');
      return (gray.includes('grayscale') && guides > 0) || `filter "${gray}", ${guides} guide groups`;
    });

    await check('B2', 'the A/B/C view renders three rows of five', async () => {
      await page.click('[data-view=layouts]');
      const rows = await page.$$eval('#stage .hb-group', (gs) => gs.map((g) => g.querySelectorAll('svg').length));
      await page.click('[data-view=suit]');
      return JSON.stringify(rows) === '[5,5,5]' || JSON.stringify(rows);
    });

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hanabi-'));
    for (const cut of ['separate', 'shared']) await check('B3', `the PDF (${cut}): pages, orientation, crop marks on trim, art to the edge`, async () => {
      const duplex = cut === 'separate';
      const out = await page.evaluate(async ([cut, duplex]) => {
        const d = window.__hanabi.design(); d.print = { ...d.print, paper: 'letter', orientation: 'auto', cut, duplex, flip: 'long', cropMarks: true }; window.__hanabi.setDesign(d);
        const { doc, imp, pages } = await window.__hanabi.exportPdf({ returnDoc: true });
        return { b64: doc.output('datauristring').split(',')[1], cols: imp.cols, rows: imp.rows, perSheet: imp.perSheet, pages };
      }, [cut, duplex]);
      const dir = fs.mkdtempSync(path.join(tmp, cut));
      const pdf = path.join(dir, 'deck.pdf');
      fs.writeFileSync(pdf, Buffer.from(out.b64, 'base64'));
      if (KEEP) { fs.mkdirSync(KEEP, { recursive: true }); fs.copyFileSync(pdf, path.join(KEEP, `hanabi-${cut}.pdf`)); }
      // The reference is RESTATED here from the size and the paper, never read from
      // hanabi/deck.js — an imposition computed wrong there would otherwise agree with itself.
      const B = 3, CW = 63.5, CH = 88.9, ROOM = 6;
      const pX = cut === 'shared' ? CW : CW + 2 * B, pY = cut === 'shared' ? CH : CH + 2 * B, extra = cut === 'shared' ? 2 * B : 0;
      const fitIn = (P) => [Math.floor((P.w - 2 * ROOM - extra) / pX), Math.floor((P.h - 2 * ROOM - extra) / pY)];
      const por = { w: 215.9, h: 279.4 }, lan = { w: 279.4, h: 215.9 };
      const [pc, pr] = fitIn(por), [lc, lr] = fitIn(lan);
      const P = lc * lr > pc * pr ? lan : por, [cols, rows] = lc * lr > pc * pr ? [lc, lr] : [pc, pr];
      if (cols !== out.cols || rows !== out.rows) return `grid ${out.cols}x${out.rows}, want ${cols}x${rows}`;
      const info = execFileSync('pdfinfo', [pdf]).toString();
      const pages = +/Pages:\s+(\d+)/.exec(info)[1];
      const sheets = Math.ceil(61 / (cols * rows)), want = duplex ? 2 * sheets : sheets + 1;
      if (pages !== want || out.pages !== want) return `${pages} pages, want ${want}`;
      const size = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);
      if (Math.abs(+size[1] - P.w / 25.4 * 72) > 1 || Math.abs(+size[2] - P.h / 25.4 * 72) > 1) return `page ${size[1]}x${size[2]} pt, want ${P.w}x${P.h} mm`;
      const DPI = 150;
      execFileSync('pdftoppm', ['-r', String(DPI), '-f', '1', '-l', '1', pdf, path.join(dir, 'p')]);
      const ppm = readPpm(fs.readdirSync(dir).filter((f) => f.endsWith('.ppm')).map((f) => path.join(dir, f))[0]);
      const mm = (v) => Math.round((v / 25.4) * DPI);
      const dark = ([r, g, b]) => r + g + b < 300, white = ([r, g, b]) => r + g + b > 740;
      const gridW = cols * pX + extra, gridH = rows * pY + extra;
      const x0 = (P.w - gridW) / 2, y0 = (P.h - gridH) / 2;
      const xs = new Set(), ys = new Set();
      for (let c = 0; c < cols; c++) { xs.add(+(x0 + B + c * pX).toFixed(4)); xs.add(+(x0 + B + c * pX + CW).toFixed(4)); }
      for (let r = 0; r < rows; r++) { ys.add(+(y0 + B + r * pY).toFixed(4)); ys.add(+(y0 + B + r * pY + CH).toFixed(4)); }
      let bad = 0, n = 0;
      for (const x of xs) for (const y of [y0 - 3, y0 + gridH + 3]) { n++; if (![-1, 0, 1].some((k) => dark(ppm.px(mm(x) + k, mm(y))))) bad++; }
      for (const y of ys) for (const x of [x0 - 3, x0 + gridW + 3]) { n++; if (![-1, 0, 1].some((k) => dark(ppm.px(mm(x), mm(y) + k)))) bad++; }
      if (bad) return `${bad} of ${n} crop marks not inked where computed`;
      // the grid's outer edge: art just inside, paper just outside; and between the
      // first two cards no paper shows (separate: bleed meets bleed; shared: one cut)
      const midY = y0 + B + CH / 2;
      if (white(ppm.px(mm(x0 + 0.4), mm(midY))) || !white(ppm.px(mm(x0 - 0.6), mm(midY)))) return 'outer bleed edge is not where restated';
      const between = x0 + pX + (cut === 'shared' ? B : 0);
      for (const dx of [-0.8, 0, 0.8]) if (white(ppm.px(mm(between + dx), mm(midY)))) return `paper showing between cards at ${dx} mm`;
      return true;
    });

    await check('B4', 'the PNG zip: every face + back at 300 dpi', async () => {
      const r = await page.evaluate(async () => {
        const blob = await window.__hanabi.exportZip({ returnBlob: true });
        const zip = await window.JSZip.loadAsync(blob);
        const names = Object.keys(zip.files).filter((n) => n.endsWith('.png'));
        const first = await zip.file(names[0]).async('uint8array');
        const dv = new DataView(first.buffer);
        return { n: names.length, w: dv.getUint32(16), h: dv.getUint32(20), names };
      });
      const d = (await import(pathToFileURL(path.join(REPO, 'hanabi/deck.js')).href)).defaultDesign();
      const wantW = Math.round(((d.size.w + 2 * d.bleed) / 25.4) * 300), wantH = Math.round(((d.size.h + 2 * d.bleed) / 25.4) * 300);
      if (r.n !== 62) return `${r.n} PNGs, want 61 faces + back`;
      return (r.w === wantW && r.h === wantH) || `${r.w}x${r.h}, want ${wantW}x${wantH}`;
    });
    if (errs.length) res.push({ id: 'B0', name: 'no page errors during the run', ok: false, detail: errs.join(' | ') });
  } finally { await browser.close(); server.close(); }
  return res;
}

// ---------------------------------------------------------------- run
function report(label, res) {
  for (const r of res) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id} ${r.name}${r.ok ? '' : ' — ' + r.detail}`);
  const bad = res.filter((r) => !r.ok);
  console.log(`${label}: ${res.length - bad.length}/${res.length} passed`);
  return bad;
}

if (!NEG) {
  let bad = report('part one', await partOne(path.join(REPO, 'hanabi')));
  if (!NO_BROWSER) bad = bad.concat(report('part two', await partTwo()));
  process.exit(bad.length ? 1 : 0);
} else {
  // anchors first, for every mutant, before any runs
  for (const m of MUTANTS) {
    const src = fs.readFileSync(path.join(REPO, 'hanabi', m.file), 'utf8');
    const count = src.split(m.from).length - 1;
    if (count !== 1) { console.log(`ANCHOR ${m.id}: matches ${count} times`); process.exit(1); }
  }
  let failed = 0;
  for (const m of MUTANTS) {
    const dir = fs.mkdtempSync(path.join(REPO, '.hanabi-mut-'));
    try {
      for (const f of MODULES) fs.copyFileSync(path.join(REPO, 'hanabi', f), path.join(dir, f));
      const p = path.join(dir, m.file);
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(m.from, m.to));
      let res = await partOne(dir);
      if (!NO_BROWSER && m.breaks.some((b) => b.startsWith('B'))) {
        const ov = { __dir: dir }; for (const f of MODULES) ov['hanabi/' + f] = fs.readFileSync(path.join(dir, f));
        res = res.concat(await partTwo(ov));
      }
      const red = res.filter((r) => !r.ok).map((r) => r.id);
      const want = NO_BROWSER ? m.breaks.filter((b) => !b.startsWith('B')) : m.breaks;
      const missed = want.filter((b) => !red.includes(b)), extra = red.filter((r) => !m.breaks.includes(r));
      const ok = !missed.length && !extra.length;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'BAD '} ${m.id}: red ${red.join(',') || 'nothing'}${missed.length ? ` — MISSED ${missed}` : ''}${extra.length ? ` — UNCLAIMED ${extra}` : ''}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  console.log(`negative control: ${MUTANTS.length - failed}/${MUTANTS.length} behave`);
  process.exit(failed ? 1 : 0);
}
