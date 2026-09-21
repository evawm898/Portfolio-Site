#!/usr/bin/env node
// Contact sheet for one question: do the rating and marker glyphs read badly
// at the size of the real library?
//
// It is asked at 240 rows because that is the ledger's actual size, and it is
// asked TWICE -- once as the library looks the day the feature ships (nothing
// rated, nothing marked) and once as it looks after a triage pass (most rows
// carrying something). The second is the one that matters and the one nobody
// can see by opening the page today, which is the whole reason this exists.
//
//   node tools/shot-tracker-marks.mjs <dir>
//
// Every number it prints is measured off the rendered page, never asserted.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright is a GLOBAL install in this environment, not a project
// dependency, so a bare ESM import cannot resolve it. Same loader the gate
// uses, for the same reason.
function loadPlaywright(){
  const require = createRequire(import.meta.url);
  const roots = [
    ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules',
    '/usr/lib/node_modules',
    '/usr/local/lib/node_modules',
  ].filter(Boolean);
  for(const root of roots){
    const entry = path.join(root, 'playwright', 'index.js');
    if(fs.existsSync(entry)) return require(entry);
  }
  try{ return require('playwright'); }
  catch(e){
    console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/shot-tracker-marks.mjs <dir>');
    process.exit(2);
  }
}
const { chromium } = loadPlaywright();

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
if(!outDir){ console.error('usage: node tools/shot-tracker-marks.mjs <dir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer((req, res) => {
  const file = path.join(REPO, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if(!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
    res.writeHead(404).end('nope'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = 'http://127.0.0.1:' + server.address().port + '/artist-tracker.html';

// A distribution shaped like the real file: 240 artists, 97 tagged, 29 with no
// location, tags drawn from the nine in the proportions Eva reported.
const NINE = ['illustrative','botanical & animal','ornamental & traditional','blackwork',
  'fine line','dark & gothic','color','realism','anime & pop culture'];
const WEIGHTS = [41,34,24,23,20,19,15,13,12];
const CITIES = ['Berlin, Germany','Seoul, South Korea','Los Angeles, CA','London, UK',
  'Lisbon, Portugal','Tokyo, Japan','Austin, TX, USA','Oslo, Norway','Paris, France',''];

function build(rated){
  const rows = [];
  const bag = [];
  NINE.forEach((t, i) => { for(let k = 0; k < WEIGHTS[i]; k++) bag.push(t); });
  for(let i = 0; i < 240; i++){
    const tagged = i < 97;
    // Deterministic, so two runs of this sheet are comparable.
    // Deterministic, so two runs of this sheet are comparable -- but the
    // modulus must NOT share a factor with the name pools, or the fixture
    // correlates rating with name and the default sort clumps one class at
    // the top. Measured: with `% 1000` every "Ada Vance" (i a multiple of 10)
    // hashed to a multiple of 10 and therefore to rating 0, so the first two
    // dozen rows were ALL unrated and the cell meant to show ratings showed
    // none. 9973 is prime and coprime to the pools' 10.
    const r = (i * 2654435761 + i * i * 97 + 17) % 9973;
    rows.push({
      id: 'k' + i,
      name: ['Ada','Bo','Cyd','Dara','Esme','Finn','Gem','Hana','Ivo','Juno'][i % 10]
        + ' ' + ['Vance','Reyes','Marr','Okonkwo','Lindqvist','Sato','Baptiste','Novak','Reid','Iyer'][(i * 7) % 10],
      handle: '@artist' + i,
      category: 'tattoo',
      location: CITIES[i % CITIES.length],
      pronouns: '',
      notes: i % 3 === 0 ? 'Loved the linework on her healed set.' : '',
      status: '',
      link: '', photo: '',
      tags: tagged ? [bag[i % bag.length]] : [],
      gender: 'unknown',
      addedAt: '2026-09-01T00:00:00.000Z',
      // "rated" is the state AFTER a triage pass: most rows carry something.
      stars:   rated ? [0,1,2,3,2,1,3,0,2,1][r % 10] : 0,
      markers: rated && (r % 7 === 0) ? ['booked'] : [],
    });
  }
  return rows;
}

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
});

async function shoot(name, rows, viewport, note, scrollTo){
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(([seed]) => {
    sessionStorage.setItem('artistTracker.unlocked', '1');
    localStorage.setItem('artistTracker.entries.v1', JSON.stringify(seed));
  }, [rows]);
  await ctx.route('**/artist-tracker.html', async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace(/ integrity="sha256-[^"]*"/g, '');
    await r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type':'text/html' } });
  });
  // No network for avatars or map tiles; an unavatar miss falls back to
  // initials, which is what the sheet should show anyway.
  await ctx.route('**unavatar.io**', r => r.abort());
  await ctx.route('**unpkg.com**', r => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#list .entry');

  // Scroll INTO the list BEFORE measuring. The first version of this sheet
  // framed the header and two rows, both unrated, so the cell meant to answer
  // "do the glyphs read at this size" contained no glyphs -- and the second
  // version measured before scrolling, so its numbers described a frame it
  // did not capture. Scroll, then measure, then shoot, in that order.
  if(scrollTo){
    await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await page.waitForTimeout(250);
  }

  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#list .entry')];
    const glyphs = document.querySelectorAll('#list .marker-glyph').length;
    const litStars = document.querySelectorAll('#list .star[data-on="true"]').length;
    const zeroed = [...document.querySelectorAll('#list .entry-stars[data-stars="0"]')].length;
    const filters = document.querySelectorAll('.filter-row').length;
    const bar = document.querySelector('#starChips').getBoundingClientRect();
    const tagBar = document.querySelector('#tagChips').getBoundingClientRect();
    return {
      rows: rows.length,
      markerGlyphs: glyphs,
      litStars,
      unratedRows: zeroed,
      filterRows: filters,
      ratingRowPx: Math.round(bar.height),
      tagRowPx: Math.round(tagBar.height),
      rowPx: rows.length ? Math.round(rows[0].getBoundingClientRect().height) : 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      // What the FRAME actually contains, not what the fixture contains. A
      // whole-list total says 360 lit stars while the twelve rows on screen
      // show none, which is exactly how the first version of this sheet
      // photographed an empty marks column and called it the rated cell.
      onScreen: (() => {
        const vis = rows.filter(r => {
          const b = r.getBoundingClientRect();
          return b.bottom > 0 && b.top < window.innerHeight;
        });
        return {
          rowsInFrame: vis.length,
          ratedInFrame: vis.filter(r => r.querySelector('.entry-stars[data-stars]')
            && r.querySelector('.entry-stars').dataset.stars !== '0').length,
          markedInFrame: vis.filter(r => r.querySelector('.marker-glyph')).length,
        };
      })(),
    };
  });

  await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: false });
  console.log('  ' + name.padEnd(26) + JSON.stringify(m));
  await ctx.close();
  return { name, note, m };
}

console.log('\nmeasured on the rendered page, 240 rows:\n');
const cells = [];
cells.push(await shoot('01-unrated-desktop', build(false), { width:1280, height:1000 },
  'As the library looks the day this ships: nothing rated, nothing marked. The marks column draws nothing and the row is what it was.', 1150));
cells.push(await shoot('02-rated-desktop', build(true), { width:1280, height:1000 },
  'After a triage pass — the state nobody can see by opening the page today, and the one the question is actually about. Scrolled into the list so the rows are the subject.', 1150));
cells.push(await shoot('02b-rated-filters', build(true), { width:1280, height:1000 },
  'The same library at the filter bar: five rows now, and the two new ones are symbols where the tags below them are words.'));
cells.push(await shoot('03-rated-mobile', build(true), { width:390, height:900 },
  'On a phone, where .entry-index is hidden and the stars are NOT a target at all (pointer-events, behind hover:hover and pointer:fine).', 1500));
cells.push(await shoot('04-unrated-mobile', build(false), { width:390, height:900 },
  'The same phone view with nothing set — no star column, no marker slot, the row as it was.', 1500));

const html = `<!doctype html><meta charset="utf-8"><title>tracker — rating + markers at 240 rows</title>
<style>
 body{background:#0A0A0C;color:#EDEDE8;font:13px/1.7 ui-monospace,monospace;margin:0;padding:32px;}
 h1{font:400 26px/1.2 Georgia,serif;margin:0 0 6px;}
 p.lede{color:#8a8a84;max-width:70ch;margin:0 0 28px;}
 figure{margin:0 0 34px;}
 figcaption{color:#8a8a84;margin:8px 0 0;max-width:80ch;}
 figcaption b{color:#5FA0A0;font-weight:400;}
 img{max-width:100%;border:1px solid #23232a;display:block;}
 code{color:#5FA0A0;}
</style>
<h1>Rating and markers at 240 rows</h1>
<p class="lede">240 seeded artists in the real file's proportions. Every number below is measured off
the rendered page. The question is whether the glyphs read badly at this size — and the cell that
answers it is <b>02</b>, because a library nobody has rated yet cannot show you what rating it looks like.</p>
${cells.map(c => `<figure>
  <img src="${c.name}.png" alt="${c.name}">
  <figcaption><b>${c.name}</b> — ${c.note}<br>
  <code>${JSON.stringify(c.m)}</code></figcaption>
</figure>`).join('\n')}
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('\nwrote ' + path.join(outDir, 'index.html'));
await browser.close();
server.close();
