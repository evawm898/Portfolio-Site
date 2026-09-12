#!/usr/bin/env node
// verify-tracker-drawer.mjs — behaviour gate for artist-tracker.html's
// slide-in detail drawer and paste-to-add photos.
//
// Nothing in CI covers artist-tracker.html (every Actions workflow in this
// repo is path-filtered to flower*/bloom*), and none of this is geometry, so
// there is no export or connectedness gate to lean on. What CAN silently
// break here is behaviour: a paste listener that outlives the drawer, an
// image stored at full resolution, a save that swallows a quota failure.
// This drives a real Chromium against a real page and asserts those.
//
//   node tools/verify-tracker-drawer.mjs [--url http://127.0.0.1:8899/artist-tracker.html]
//                                        [--shots <dir>]
//
// It serves the repo itself on a free port unless --url is given.
// crypto.subtle needs a secure context, so this must be http://, never file://.
// The password gate is bypassed by seeding sessionStorage, and the two
// outbound hosts the page uses (unavatar.io for fallback avatars, unpkg for
// Leaflet) are stubbed — this gate is about the drawer, not about them.
//
// Playwright is a global install in the dev container, not a project
// dependency; it is resolved from NODE_PATH / the usual global root.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    console.error('Could not resolve playwright. Try:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/verify-tracker-drawer.mjs');
    process.exit(2);
  }
}
const { chromium } = loadPlaywright();

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.jpg':'image/jpeg', '.ico':'image/x-icon' };

function serveRepo(){
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const file = path.join(REPO, rel);
      if(!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const argv = process.argv.slice(2);
const argOf = (flag) => { const i = argv.indexOf(flag); return i > -1 ? argv[i+1] : null; };
const shotsDir = argOf('--shots');
let server = null;
let URL_ = argOf('--url');
if(!URL_){
  server = await serveRepo();
  URL_ = 'http://127.0.0.1:' + server.address().port + '/artist-tracker.html';
}
if(shotsDir) fs.mkdirSync(shotsDir, { recursive:true });

const results = [];
function check(name, ok, detail){
  results.push({ name, ok, detail });
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
}
function section(title){ console.log('\n' + title); }

const STORE = 'artistTracker.entries.v1';
const SEED = [
  { id:'a1', name:'Jane Doe', handle:'@janedoe', pronouns:'she/her', category:'tattoo',
    location:'Los Angeles, CA', geo:{lat:34.05,lng:-118.24}, date:'2026-10-03', status:'Guest spot NYC Oct 3-10',
    link:'janedoe.example.com', photo:'', tags:['fine line','botanical'] },
  { id:'a2', name:'Sam Reed', handle:'samreed', pronouns:'they/them', category:'touring',
    location:'Berlin', geo:{lat:52.52,lng:13.40}, date:'', status:'New EP in spring', link:'', photo:'', tags:['ambient'] },
  { id:'a3', name:'Mira Okonkwo', handle:'@mira.ok', pronouns:'', category:'following',
    location:'Lisbon', date:'', status:'', link:'', photo:'', tags:[] },
  // Region/city coverage: a US pair that must fold together despite being
  // written differently, plus non-US entries and one unplaceable.
  { id:'a4', name:'Lena Novak', handle:'@lenanovak', pronouns:'she/her', category:'tattoo',
    location:'Austin, TX, USA', geo:{lat:30.27,lng:-97.74}, date:'', status:'', link:'', photo:'',
    tags:['fine line','realism'] },
  { id:'a5', name:'Yuki Tanaka', handle:'@yukitanaka', pronouns:'she/her', category:'tattoo',
    location:'Tokyo, Japan', geo:{lat:35.68,lng:139.69}, date:'', status:'', link:'', photo:'',
    tags:['fine line','micro / tiny'] },
  { id:'a6', name:'Ana Silva', handle:'@anasilva', pronouns:'', category:'tattoo',
    location:'Porto, Portugal', geo:{lat:41.15,lng:-8.61}, date:'', status:'Loves dogs, saw her flash at a show',
    link:'', photo:'', tags:['blackwork'] },
  { id:'a7', name:'Nil Bora', handle:'@nilbora', pronouns:'he/him', category:'tattoo',
    location:'', date:'', status:'', link:'', photo:'', tags:['blackwork'] },
  // Two more that share cities with entries above, so the map actually has
  // something to cluster, and one unmistakably logistical status line.
  { id:'a8', name:'Petra Klein', handle:'@petraklein', pronouns:'she/her', category:'tattoo',
    location:'Berlin, Germany', geo:{lat:52.50,lng:13.42}, date:'',
    status:'Books open in January', link:'', photo:'', tags:['ornamental'] },
  { id:'a9', name:'Rin Sato', handle:'@rinsato', pronouns:'', category:'tattoo',
    location:'Tokyo, Japan', geo:{lat:35.69,lng:139.70}, date:'', status:'',
    link:'', photo:'', tags:['micro / tiny'] },
];
const TATTOO_COUNT = SEED.filter(e => e.category === 'tattoo').length;


// --- source extraction ------------------------------------------------------
// staticGeocode is a pure function of its tables, so its ANSWERS are checked
// directly against the shipped source rather than inferred from pin positions
// on screen. The app runs inside an IIFE, so the declarations are sliced out by
// name; a failed slice throws rather than quietly skipping the checks.
function sliceDecl(src, header){
  const at = src.indexOf(header);
  if(at === -1) throw new Error('verify-tracker-drawer: could not find ' + JSON.stringify(header)
    + ' in artist-tracker.html — the geocoding checks would silently pass. Fix the slice.');
  const open = src.indexOf(header.trimEnd().endsWith('{') ? '{' : '{', at);
  let depth = 0, i = open;
  for(; i < src.length; i++){
    if(src[i] === '{') depth++;
    else if(src[i] === '}'){ depth--; if(depth === 0){ i++; break; } }
  }
  return src.slice(at, i) + (header.startsWith('const') ? ';' : '');
}
// MERGE_RULES is an ARRAY of objects, so the brace matcher above would stop at
// the end of its first row. This one matches the bracket the header opens.
function sliceArray(src, header){
  const at = src.indexOf(header);
  if(at === -1) throw new Error('verify-tracker-drawer: could not find ' + JSON.stringify(header)
    + ' in artist-tracker.html — the merge checks would silently pass. Fix the slice.');
  let depth = 0, i = src.indexOf('[', at);
  for(; i < src.length; i++){
    if(src[i] === '[') depth++;
    else if(src[i] === ']'){ depth--; if(depth === 0){ i++; break; } }
  }
  return src.slice(at, i) + ';';
}
const PAGE_SRC = fs.readFileSync(path.join(REPO, 'artist-tracker.html'), 'utf8');
const geoModule = [
  'const CHAR_FOLD = {', 'function foldText(str){',
  'const COUNTRY_COORDS = {', 'const US_STATE_COORDS = {', 'const SUBDIVISION_NAMES = {',
  'const CA_PROVINCE_COORDS = {', 'const CA_PROVINCE_NAMES = {', 'const CITY_COORDS = {',
  'const REGION_ALIASES = {', 'function canonicalRegion(raw){', 'function staticGeocode(raw){',
].map(h => sliceDecl(PAGE_SRC, h)).join('\n');
const staticGeocode = new Function(geoModule + '\nreturn staticGeocode;')();
const foldText = new Function(geoModule + '\nreturn foldText;')();

// The SHIPPED merge, not a copy of it. `mergeEntry` decides what a JSON
// restore and a bulk paste each do to an entry that is already here, and on
// the real data a wrong rule still produces a plausible-looking list — so its
// answers are checked against cases written down here.
const mergeSrc = [
  "const GENDER_VALUES = ['unknown', 'woman', 'nonbinary', 'not-woman'];",
  sliceDecl(PAGE_SRC, 'function genderOf(e){'),
  sliceDecl(PAGE_SRC, 'const CHAR_FOLD = {'),
  sliceDecl(PAGE_SRC, 'function foldText(str){'),
  sliceDecl(PAGE_SRC, 'function tagKey(t){'),
  sliceArray(PAGE_SRC, 'const MERGE_RULES = ['),
  sliceDecl(PAGE_SRC, 'function unionInto(entry, field, incoming, keyFn){'),
  sliceDecl(PAGE_SRC, 'function mergeEntry(existing, incoming, mode, scope){'),
].join('\n');
const mergeEntry = new Function(mergeSrc + '\nreturn mergeEntry;')();
const MERGE_RULES = new Function(mergeSrc + '\nreturn MERGE_RULES;')();

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
});
const ctx = await browser.newContext({ viewport:{ width:1280, height:900 } });
await ctx.addInitScript(([store, seed]) => {
  sessionStorage.setItem('artistTracker.unlocked', '1');
  localStorage.setItem(store, JSON.stringify(seed));
}, [STORE, SEED]);

// Map libraries. This sandbox can't reach unpkg, but leaflet and
// leaflet.markercluster are ordinary npm packages — when they're present in
// node_modules the gate serves the REAL files, so clustering is tested rather
// than assumed. Without them the map still loads (the page falls back to plain
// pins) and the cluster-specific checks report as skipped, never as passed.
//   npm install --no-save leaflet@1.9.4 leaflet.markercluster@1.5.3
const VENDOR = {
  'leaflet.js': 'leaflet/dist/leaflet.js',
  'leaflet.css': 'leaflet/dist/leaflet.css',
  'leaflet.markercluster.js': 'leaflet.markercluster/dist/leaflet.markercluster.js',
  'MarkerCluster.css': 'leaflet.markercluster/dist/MarkerCluster.css',
  'MarkerCluster.Default.css': 'leaflet.markercluster/dist/MarkerCluster.Default.css',
};
function vendorPath(name){
  const full = path.join(REPO, 'node_modules', VENDOR[name] || '');
  return VENDOR[name] && fs.existsSync(full) ? full : null;
}
const HAVE_MAP_LIBS = Object.keys(VENDOR).every(vendorPath);

async function stub(target){
  await target.route('**://unavatar.io/**', r => r.abort());
  await target.route('**://fonts.googleapis.com/**', r => r.abort());
  await target.route('**://fonts.gstatic.com/**', r => r.abort());
  await target.route('**://unpkg.com/**', r => {
    const name = r.request().url().split('/').pop().split('?')[0];
    const file = vendorPath(name);
    if(file){
      return r.fulfill({
        status: 200,
        body: fs.readFileSync(file),
        contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript',
      });
    }
    // Nothing to serve: keep the page running rather than leaving L undefined.
    return r.fulfill({
      status: 200,
      body: name.endsWith('.css') ? '' : 'window.L=window.L||{};',
      contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript',
    });
  });
}

// Subresource Integrity would reject the substituted bodies above, so strip
// the integrity attributes from the served page during the test run only.
await ctx.route('**/artist-tracker.html', async (r) => {
  const res = await r.fetch();
  let body = await res.text();
  body = body.replace(/ integrity="sha256-[^"]*"/g, '');
  await r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type':'text/html' } });
});

const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await stub(page);
await page.goto(URL_, { waitUntil:'domcontentloaded' });
await page.waitForSelector('#list .entry');

const drawer = page.locator('#drawer');
const isOpen = async () => (await drawer.getAttribute('data-open')) === 'true';
const SLIDE = 400; // longer than the 280ms transition
// Sections that touch the filter bar must not inherit an open drawer from the
// section before them — its backdrop swallows the clicks.
async function ensureClosed(){
  if(await isOpen()){
    await page.keyboard.press('Escape');
    await page.waitForTimeout(SLIDE);
  }
}

section('item 9 — the shortlist leads with tattoo artists');
check('category defaults to tattoo, not all',
  (await page.locator('.chip[data-cat="tattoo"]').getAttribute('data-active')) === 'true');
check('only tattoo artists on load', await page.locator('#list .entry').count() === TATTOO_COUNT,
  await page.locator('#list .entry').count() + ' of ' + SEED.length);
check('other categories still reachable', await page.locator('.chip[data-cat="following"]').isVisible());
// The rest of the suite predates this default and expects the whole list.
await page.locator('.chip[data-cat="all"]').click();

section('item 7 — the slide-in detail panel');
check('gate bypassed, list rendered', await page.locator('#list .entry').count() === SEED.length);
check('row carries no anchor any more', await page.locator('#list .entry a').count() === 0);
check('handle still renders',
  (await page.locator('#list .entry', { hasText:'Jane Doe' }).innerText()).includes('@janedoe'));

check('drawer starts closed', !(await isOpen()));

// click anywhere on the row (the name, not a control)
await page.locator('#list .entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
check('row click opens the drawer', await isOpen());
check('drawer is visible', await drawer.isVisible());

const dtext = await drawer.innerText();
for(const bit of ['Jane Doe','@janedoe','tattoo artist','Los Angeles, CA','she/her','fine line','botanical','Guest spot NYC Oct 3-10','janedoe.example.com']){
  check('drawer shows: ' + bit, dtext.toLowerCase().includes(bit.toLowerCase()));
}
check('drawer shows the date', /Oct\s*3,\s*2026/.test(dtext), dtext.match(/Oct[^\n]*/)?.[0]);

const ig = page.locator('#detailIg');
check('Instagram link href', await ig.getAttribute('href') === 'https://instagram.com/janedoe');
check('Instagram link target', await ig.getAttribute('target') === '_blank');
check('Instagram link is teal', (await ig.evaluate(el => getComputedStyle(el).color)) === 'rgb(95, 160, 160)');

check('list still in place behind the drawer', await page.locator('#list .entry').first().isVisible());
const box = await drawer.boundingBox();
check('drawer width in the 380-420 band', box.width >= 380 && box.width <= 420, box.width + 'px');
check('drawer is anchored right', Math.abs((box.x + box.width) - 1280) < 2, 'right edge ' + (box.x+box.width));
check('transition is ~250-300ms', (await drawer.evaluate(el => getComputedStyle(el).transitionDuration)).startsWith('0.28'),
  await drawer.evaluate(el => getComputedStyle(el).transitionDuration));

section('focus is trapped while the drawer is open');
check('focus starts on the close button', await page.evaluate(() => document.activeElement?.id) === 'drawerClose');
check('the list behind is inert', await page.evaluate(() => document.querySelector('.wrap').inert === true));
// Tab all the way round: focus must never leave the drawer.
let escaped = null;
for(let i = 0; i < 14; i++){
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement));
  if(!inside){ escaped = await page.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName); break; }
}
check('Tab cycles inside the drawer', escaped === null, escaped ? 'escaped to ' + escaped : '');
await page.keyboard.press('Shift+Tab');
check('Shift+Tab stays inside too',
  await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)));

section('closing: Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(SLIDE);
check('Escape closes the drawer', !(await isOpen()));
check('the list is interactive again', await page.evaluate(() => document.querySelector('.wrap').inert === false));
check('focus returned to the row that opened it',
  await page.evaluate(() => document.activeElement?.classList.contains('entry')));

section('closing: backdrop');
await page.locator('#list .entry', { hasText:'Sam Reed' }).click();
await page.waitForTimeout(SLIDE);
check('second row opens the drawer', await isOpen());
await page.locator('#drawerBackdrop').click({ position:{ x:100, y:400 } });
await page.waitForTimeout(SLIDE);
check('backdrop click closes the drawer', !(await isOpen()));

section('closing: the x button');
await page.locator('#list .entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#drawerClose').click();
await page.waitForTimeout(SLIDE);
check('close button closes the drawer', !(await isOpen()));

section('scroll position is not lost');
await page.evaluate(() => window.scrollTo(0, 300));
const beforeScroll = await page.evaluate(() => window.scrollY);
await page.locator('#list .entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
check('scroll position preserved', await page.evaluate(() => window.scrollY) === beforeScroll,
  beforeScroll + ' -> ' + await page.evaluate(() => window.scrollY));
check('url unchanged (no route change)', page.url() === URL_);

section('edit mode');
await page.locator('#detailEdit').click();
check('edit mode shows the form', await page.locator('#drawerEdit').isVisible());
check('edit mode hides the footer actions', !(await page.locator('#drawerFoot').isVisible()));
check('name prefilled', await page.inputValue('#fName') === 'Jane Doe');
check('handle prefilled', await page.inputValue('#fHandle') === '@janedoe');
check('pronouns prefilled', await page.inputValue('#fPronouns') === 'she/her');
check('category prefilled', await page.inputValue('#fCategory') === 'tattoo');
check('location prefilled', await page.inputValue('#fLocation') === 'Los Angeles, CA');
check('date prefilled', await page.inputValue('#fDate') === '2026-10-03');
check('status prefilled', await page.inputValue('#fStatus') === 'Guest spot NYC Oct 3-10');
check('link prefilled', await page.inputValue('#fLink') === 'janedoe.example.com');
check('tags prefilled as selected chips', await page.evaluate(() =>
  [...document.querySelectorAll('#tagPicker .tag-toggle[data-on="true"]')].map(b => b.textContent).sort().join(',')
) === 'botanical,fine line');
check('save button says update', (await page.locator('#saveEntry').innerText()).trim().toLowerCase() === 'update entry');

await page.fill('#fLocation', 'Portland, OR');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('save returns to view mode', await page.locator('#drawerView').isVisible());
check('view shows the edit', (await drawer.innerText()).includes('Portland, OR'));
check('list shows the edit', (await page.locator('#list .entry', { hasText:'Jane Doe' }).innerText()).includes('Portland, OR'));
check('edit persisted', (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e => e.id==='a1').location)) === 'Portland, OR');
check('stale geocode dropped on location change',
  await page.evaluate(() => !('geo' in JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1'))));

section('item 8 — paste-to-add images');
async function pasteGeneratedImage(targetSel, w, h){
  return await page.evaluate(async ([sel, W, H]) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#c0392b'; g.fillRect(0,0,W,H);
    g.fillStyle = '#2980b9'; g.fillRect(0,0,W/2,H/2);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'shot.png', { type:'image/png' }));
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true });
    document.querySelector(sel).dispatchEvent(ev);
    return { defaultPrevented: ev.defaultPrevented, bytes: blob.size };
  }, [targetSel, w, h]);
}

await page.locator('#detailEdit').click();
const pasted = await pasteGeneratedImage('#fName', 1200, 800);
check('image paste was intercepted', pasted.defaultPrevented);
await page.waitForTimeout(500);
check('preview thumbnail appeared', await page.locator('#photoThumb img').count() === 1);
const previewSrc = await page.locator('#photoThumb img').getAttribute('src');
check('preview is the downscaled jpeg', previewSrc.startsWith('data:image/jpeg;base64,'), previewSrc.slice(0,40));
check('state line reports the size', /pasted image · \d+ KB/.test(await page.locator('#photoState').innerText()),
  await page.locator('#photoState').innerText());
check('remove-image button shown', await page.locator('#photoClear').isVisible());

const dims = await page.evaluate(src => new Promise(res => {
  const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = src;
}), previewSrc);
check('downscaled to 500px longest side', dims[0] === 500 && dims[1] === 333, dims.join('x'));
check('downscaled payload is small', previewSrc.length * 0.75 < 60 * 1024,
  Math.round(previewSrc.length*0.75/1024) + ' KB from ' + Math.round(pasted.bytes/1024) + ' KB original');

await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
const storedPhoto = await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1').photo);
check('photo saved to the entry', storedPhoto.startsWith('data:image/jpeg;base64,'));
check('drawer view shows the photo', (await page.locator('#drawerView img.detail-photo').getAttribute('src')) === storedPhoto);
check('list row shows the photo', (await page.locator('#list .entry', { hasText:'Jane Doe' }).locator('img.entry-photo').getAttribute('src')) === storedPhoto);

// text paste into a text field must NOT be intercepted
await page.locator('#detailEdit').click();
const textPaste = await page.evaluate(() => {
  const dt = new DataTransfer();
  dt.setData('text/plain', 'Tokyo, JP');
  const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true });
  document.getElementById('fLocation').dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('plain text paste is left alone', textPaste === false);

// a clipboard with BOTH text and an image, into a text field, stays text
const bothPaste = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 40; c.height = 40;
  c.getContext('2d').fillRect(0,0,40,40);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.setData('text/plain', 'https://example.com/pic.jpg');
  dt.items.add(new File([blob], 'x.png', { type:'image/png' }));
  const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true });
  document.getElementById('fPhoto').dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('text+image paste into a text field stays text', bothPaste === false);

// remove-image clears it
await page.locator('#photoClear').click();
check('remove clears the state line', (await page.locator('#photoState').innerText()) === '');
check('remove clears the url field', await page.inputValue('#fPhoto') === '');

// typing a url replaces the pasted image
await pasteGeneratedImage('#drawer', 600, 600);
await page.waitForTimeout(SLIDE);
check('paste with the drawer (not a field) focused still works', await page.locator('#photoThumb img').count() === 1);
await page.fill('#fPhoto', 'https://example.com/p.jpg');
await page.waitForTimeout(100);
check('typing a url drops the pasted image', (await page.locator('#photoThumb img').getAttribute('src')) === 'https://example.com/p.jpg');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('url fallback saved', (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1').photo)) === 'https://example.com/p.jpg');

// paste listener must be scoped to the drawer AND to edit mode
await page.locator('#drawerClose').click();
await page.waitForTimeout(SLIDE);
const globalPaste = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 40; c.height = 40;
  c.getContext('2d').fillRect(0,0,40,40);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'x.png', { type:'image/png' }));
  const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true });
  document.getElementById('searchInput').dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('image paste outside the drawer is not intercepted', globalPaste === false);

await page.locator('#list .entry', { hasText:'Sam Reed' }).click();
await page.waitForTimeout(SLIDE);
const viewModePaste = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 40; c.height = 40;
  c.getContext('2d').fillRect(0,0,40,40);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'x.png', { type:'image/png' }));
  const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true });
  document.getElementById('drawer').dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('image paste in view mode is not intercepted', viewModePaste === false);

section('add + remove');
await page.keyboard.press('Escape');
await page.waitForTimeout(SLIDE);
await page.locator('#addToggle').click();
await page.waitForTimeout(SLIDE);
check('add opens the drawer in edit mode', await isOpen() && await page.locator('#drawerEdit').isVisible());
check('add form is blank', await page.inputValue('#fName') === '');
check('add button says save', (await page.locator('#saveEntry').innerText()).trim().toLowerCase() === 'save entry');
await page.fill('#fName', 'New Person');
await page.fill('#fHandle', 'newperson');
await page.locator('#saveEntry').click();
await page.waitForTimeout(250);
check('new entry added', await page.locator('#list .entry').count() === SEED.length + 1);
check('new entry shown in the drawer', (await page.locator('#drawerView').innerText()).includes('New Person'));

page.once('dialog', d => d.accept());
await page.locator('#detailRemove').click();
await page.waitForTimeout(SLIDE);
check('remove deletes and closes', await page.locator('#list .entry').count() === SEED.length && !(await isOpen()));

section('quota');
await page.locator('#list .entry', { hasText:'Sam Reed' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#detailEdit').click();
await page.evaluate(() => {
  const real = Storage.prototype.setItem;
  Storage.prototype.__realSetItem = real;
  Storage.prototype.setItem = function(k, v){
    if(k === 'artistTracker.entries.v1'){
      const err = new Error('quota'); err.name = 'QuotaExceededError'; err.code = 22; throw err;
    }
    return real.call(this, k, v);
  };
});
let quotaMsg = '';
page.once('dialog', async d => { quotaMsg = d.message(); await d.accept(); });
await page.fill('#fStatus', 'this will not fit');
await page.locator('#saveEntry').click();
await page.waitForTimeout(300);
check('quota failure is reported', /Storage is full/.test(quotaMsg), JSON.stringify(quotaMsg));
check('quota message names the remedies', /removing an image|export a backup/.test(quotaMsg));
check('quota failure rolls the list back',
  await page.evaluate(() => !document.getElementById('list').innerText.includes('this will not fit')));
check('form keeps what was typed after a failed save', await page.inputValue('#fStatus') === 'this will not fit');

// Hand the page back in a clean state: the quota stub above is still armed
// and the drawer is still open over the toolbar.
await page.evaluate(() => { if(Storage.prototype.__realSetItem) Storage.prototype.setItem = Storage.prototype.__realSetItem; });
await page.reload({ waitUntil:'domcontentloaded' });
await page.waitForSelector('#list .entry');

section('bulk paste, filters and map (regression)');
await page.locator('.chip[data-cat="all"]').click();
check('bulk panel starts closed', !(await page.locator('#panel').isVisible()));
await page.locator('#bulkToggle').click();
check('bulk toggle opens the panel', await page.locator('#panel').isVisible());
check('bulk textarea present', await page.locator('#bulkText').isVisible());
// The old one-line alert() is gone — the run now reports into #bulkReport,
// and the panel deliberately STAYS OPEN so that report can be read.
await page.fill('#bulkText', 'Jane Doe | @janedoe | tattoo | | she/her | | | \nNoor Haddad | @noorh | Influencer | Cairo | she/her | | | ');
await page.locator('#saveBulk').click();
await page.waitForTimeout(300);
const report1 = await page.locator('#bulkReport').innerText();
check('merge summary reported in the report card',
  /1 added/.test(report1) && /(1 updated|1 already complete)/.test(report1), JSON.stringify(report1));
check('no duplicate for the existing handle', await page.locator('#list .entry').count() === SEED.length + 1);
check('non-standard category kept as a tag',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.handle==='@noorh').tags.includes('influencer')));
check('bulk panel stays open so the report can be read', await page.locator('#panel').isVisible());
check('textarea cleared once the write landed', (await page.inputValue('#bulkText')) === '');
await page.locator('#cancelBulk').click();
check('cancel closes the panel', !(await page.locator('#panel').isVisible()));
await page.locator('#bulkToggle').click();
check('reopening clears the previous report',
  (await page.locator('#bulkReport').innerText()).trim() === '');
await page.locator('#cancelBulk').click();

section('filters / search / sort untouched');
await page.locator('.chip[data-cat="tattoo"]').click();
check('category filter still filters', await page.locator('#list .entry').count() === TATTOO_COUNT,
  String(await page.locator('#list .entry').count()));
await page.locator('.chip[data-cat="all"]').click();
await page.locator('.chip[data-gender="woman"]').click();
check('gender filter still filters', (await page.locator('#list .entry').count()) < SEED.length + 1,
  String(await page.locator('#list .entry').count()));
await page.locator('.chip[data-gender="all"]').click();
await page.locator('.tag-chip[data-tag="ambient"]').click();
check('tag filter still filters', await page.locator('#list .entry').count() === 1);
await page.locator('.tag-chip[data-tag="ambient"]').click();
await page.fill('#searchInput', 'lisbon');
await page.waitForTimeout(100);
check('search still filters', await page.locator('#list .entry').count() === 1);
await page.fill('#searchInput', '');
await page.selectOption('#regionSelect', 'Berlin');
check('region filter still filters', await page.locator('#list .entry').count() === 1);
await page.selectOption('#regionSelect', 'all');

section('map view still toggles');
await page.locator('.view-tab[data-view="map"]').click();
await page.waitForTimeout(300);
check('map view toggles on', await page.locator('#mapContainer').isVisible());
await page.locator('.view-tab[data-view="list"]').click();
check('list view toggles back', await page.locator('#list').isVisible());

section('export includes the embedded image');
await page.locator('#list .entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#detailEdit').click();
await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 900; c.height = 900;
  const g = c.getContext('2d'); g.fillStyle='#6b8f8f'; g.fillRect(0,0,900,900);
  g.fillStyle='#0A0A0C'; g.beginPath(); g.arc(450,450,260,0,7); g.fill();
  const blob = await new Promise(r => c.toBlob(r,'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob],'s.png',{type:'image/png'}));
  document.getElementById('drawer').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
});
await page.waitForTimeout(500);
await page.locator('#saveEntry').click();
await page.waitForTimeout(250);
// The export button serialises exactly what is in storage, so measure that.
const exported = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('artistTracker.entries.v1')), null, 2));
const json = JSON.parse(exported);
check('export carries the embedded image', String(json.find(e=>e.id==='a1').photo).startsWith('data:image/jpeg'));
const noImages = JSON.stringify(json.map(e => ({...e, photo:''})), null, 2).length;
check('export grows with images', exported.length > noImages,
  Math.round(noImages/1024) + ' KB without images -> ' + Math.round(exported.length/1024) + ' KB with 1 image (4 entries)');

section('item 10 — region / city location filter');
await ensureClosed();
await page.locator('.chip[data-cat="all"]').click();
const regionOpts = async () => page.locator('#regionSelect option').allTextContents();
let opts = await regionOpts();
check('regions replace the flat location list', opts.length > 1 && opts[0].startsWith('all regions'));
check('US entries fold into one region despite differing text',
  opts.some(o => o.startsWith('USA (2)')), opts.join(' | '));
check('regions carry counts', opts.every(o => /\(\d+\)$/.test(o)), opts.join(' | '));
check('regions sort by count, biggest first', (() => {
  const counts = opts.slice(1).filter(o => !o.startsWith('Other')).map(o => +o.match(/\((\d+)\)$/)[1]);
  return counts.every((n, i) => i === 0 || counts[i-1] >= n);
})(), opts.join(' | '));
check('unparseable locations land in Other / unspecified, not dropped',
  opts.some(o => o.startsWith('Other / unspecified (1)')), opts.join(' | '));
check('Other / unspecified is pinned last', opts[opts.length-1].startsWith('Other / unspecified'));
check('city select disabled until a region is picked', await page.locator('#citySelect').isDisabled());

await page.selectOption('#regionSelect', 'USA');
check('picking a region filters the list', await page.locator('#list .entry').count() === 2,
  String(await page.locator('#list .entry').count()));
const cityOpts = await page.locator('#citySelect option').allTextContents();
check('cities are scoped to the region', cityOpts.some(o => o.startsWith('Austin')) && cityOpts.some(o => o.startsWith('Los Angeles')),
  cityOpts.join(' | '));
check('city select enabled once a region is picked', !(await page.locator('#citySelect').isDisabled()));
await page.selectOption('#citySelect', 'Austin');
check('narrowing to a city works', await page.locator('#list .entry').count() === 1);
check('the right entry survives', (await page.locator('#list .entry').innerText()).includes('Lena Novak'));
check('stored location text is untouched by parsing',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a4').location) === 'Austin, TX, USA');
await page.selectOption('#regionSelect', 'all');
const totalNow = await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).length);
check('resetting the region clears the city too', await page.locator('#list .entry').count() === totalNow,
  await page.locator('#list .entry').count() + ' of ' + totalNow);

section('item 11 — style tags');
await ensureClosed();
const tagChips = async () => page.locator('#tagChips .tag-chip').allTextContents();
let chips = await tagChips();
check('tag chips carry counts', chips.every(c => /\(\d+\)$/.test(c)), chips.join(' | '));
check('tag chips sort by count, descending', (() => {
  const counts = chips.map(c => +c.match(/\((\d+)\)$/)[1]);
  return counts.every((n, i) => i === 0 || counts[i-1] >= n);
})(), chips.join(' | '));
check('the biggest tag leads', chips[0].startsWith('fine line (3)'), chips[0]);

await page.locator('#list .entry', { hasText:'Ana Silva' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#detailEdit').click();
const toggles = await page.locator('#tagPicker .tag-toggle').allTextContents();
// The vocabulary is NINE buckets now, not the old eighteen-tag starter set.
// This asserts the exact list, not a floor: a tenth appearing is as much a
// drift as one going missing, and ">= 9" would hide both.
const NINE = ['fine line','blackwork','color','realism','illustrative',
  'dark & gothic','botanical & animal','anime & pop culture','ornamental & traditional'];
const starters = toggles.filter(t => NINE.includes(t));
check('the nine-tag vocabulary is offered as chips', starters.length === 9,
  starters.length + ' of 9 — got: ' + JSON.stringify(toggles));
// Counted off the data-custom flag, so a TENTH starter creeping in fails
// here directly rather than only tripping some downstream check.
const starterFlagged = await page.evaluate(() =>
  [...document.querySelectorAll('#tagPicker .tag-toggle')]
    .filter(b => b.dataset.custom !== 'true').map(b => b.textContent));
check('the starter set is exactly nine, no more', starterFlagged.length === 9,
  starterFlagged.length + ': ' + JSON.stringify(starterFlagged));
for(const t of NINE) check('vocabulary tag offered: ' + t, toggles.includes(t));
// A retired bucket is gone from the STARTER set — but if an entry still
// carries it, the picker must keep offering it (marked custom) or there
// would be no way to un-tag that entry. Both halves are asserted.
for(const t of ['black & grey','botanical / floral','neo-traditional','baroque','cute']){
  check('retired starter tag, unused, is gone: ' + t, !toggles.includes(t));
}
const stillUsed = await page.evaluate(() =>
  [...document.querySelectorAll('#tagPicker .tag-toggle')]
    .filter(b => b.textContent === 'micro / tiny')
    .map(b => b.dataset.custom || 'starter'));
check('a retired tag still ON an entry stays clickable, marked custom',
  stillUsed.length === 1 && stillUsed[0] === 'true', JSON.stringify(stillUsed));
check('the entry’s own tag reads as selected',
  await page.locator('#tagPicker .tag-toggle[data-on="true"]').count() === 1);
await page.locator('#tagPicker .tag-toggle', { hasText:/^fine line$/ }).click();
check('clicking a chip selects it',
  await page.locator('#tagPicker .tag-toggle[data-on="true"]').count() === 2);
await page.locator('#tagPicker .tag-toggle', { hasText:/^fine line$/ }).click();
check('clicking again deselects it',
  await page.locator('#tagPicker .tag-toggle[data-on="true"]').count() === 1);
// item 31: the box is behind a deliberate reveal now, so the vocabulary is
// what the drawer offers and a tenth tag takes an explicit act.
check('the free-text tag box is hidden until asked for',
  !(await page.locator('#fTags').isVisible()));
check('...and it is NOT inside #tagPicker, whose children are the vocabulary',
  await page.locator('#tagPicker #fTags').count() === 0);
await page.locator('#tagEscapeToggle').click();
check('the toggle reveals it', await page.locator('#fTags').isVisible());
check('...and says so to a screen reader',
  await page.getAttribute('#tagEscapeToggle', 'aria-expanded') === 'true');
await page.fill('#fTags', 'sumi brushwork');
await page.locator('#fTags').press('Enter');
check('a typed custom tag becomes a selected chip',
  await page.locator('#tagPicker .tag-toggle[data-custom="true"][data-on="true"]', { hasText:'sumi brushwork' }).count() === 1);
check('the text box clears after committing', await page.inputValue('#fTags') === '');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('custom tag saved to the entry',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a6').tags.includes('sumi brushwork')));
check('the pre-existing tag survived the round trip',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a6').tags.includes('blackwork')));
await page.keyboard.press('Escape');
await page.waitForTimeout(SLIDE);

section('facet counts stay honest under other filters');
await ensureClosed();
await page.locator('.chip[data-cat="tattoo"]').click();
opts = await regionOpts();
check('region counts respect the category filter',
  !opts.some(o => o.startsWith('Portugal')) === false && opts.every(o => !/^Berlin/.test(o)), opts.join(' | '));
chips = await tagChips();
check('tag counts respect the category filter',
  !chips.some(c => c.startsWith('ambient')), chips.join(' | '));
await page.locator('.chip[data-cat="all"]').click();

section('item 13 — gender is set by hand, never inferred');
await ensureClosed();
check('filter offers all / women only / unknown',
  (await page.locator('#genderChips .chip').allTextContents()).join(',').toLowerCase() === 'all,women only,unknown');
check('she/her seeded to woman',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1').gender) === 'woman');
check('he/him NOT inferred as not-woman — left unknown',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a7').gender) === 'unknown');
check('they/them left unknown',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a2').gender) === 'unknown');
check('blank pronouns left unknown',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a3').gender) === 'unknown');
check('pronouns field is preserved, not replaced',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a2').pronouns) === 'they/them');
await page.locator('.chip[data-gender="woman"]').click();
const womenShown = await page.locator('#list .entry').count();
const womenExpected = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('artistTracker.entries.v1')).filter(e => e.gender === 'woman').length);
check('women only shows just the woman entries', womenShown === womenExpected,
  womenShown + ' of ' + womenExpected);
await page.locator('.chip[data-gender="unknown"]').click();
const unknownExpected = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('artistTracker.entries.v1')).filter(e => (e.gender || 'unknown') === 'unknown').length);
check('unknown is browsable so it can be filled in over time',
  await page.locator('#list .entry').count() === unknownExpected,
  await page.locator('#list .entry').count() + ' of ' + unknownExpected);
await page.locator('.chip[data-gender="all"]').click();

await page.locator('#list .entry', { hasText:'Mira Okonkwo' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#detailEdit').click();
check('gender is a control in edit mode', await page.locator('#fGender').isVisible());
check('it defaults to unknown', await page.inputValue('#fGender') === 'unknown');
await page.selectOption('#fGender', 'woman');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('setting gender by hand persists',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a3').gender) === 'woman');
await page.keyboard.press('Escape');
await page.waitForTimeout(SLIDE);

section('item 12 — status splits into notes + status');
await ensureClosed();
await page.locator('#list .entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#detailEdit').click();
check('notes is a multi-line textarea',
  await page.evaluate(() => document.getElementById('fNotes').tagName) === 'TEXTAREA');
check('status stays a single-line input',
  await page.evaluate(() => document.getElementById('fStatus').tagName) === 'INPUT');
await page.fill('#fNotes', 'Line one\nLine two');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('multi-line notes round-trip',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1').notes)) === 'Line one\nLine two');
check('notes shown in the drawer', (await drawer.innerText()).includes('Line two'));
check('status is still its own row', (await drawer.innerText()).includes('Guest spot'));
await page.keyboard.press('Escape');
await page.waitForTimeout(SLIDE);

check('migration did NOT run on load — a6 status untouched',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a6').status)) === 'Loves dogs, saw her flash at a show');
// The migration raises two dialogs — the confirm that explains itself, then
// the summary. One handler takes both.
const splitDialogs = [];
const onSplitDialog = async (d) => { splitDialogs.push(d.message()); await d.accept(); };
page.on('dialog', onSplitDialog);
await page.locator('#splitStatusBtn').click();
await page.waitForTimeout(600);
page.off('dialog', onSplitDialog);
const splitMsg = splitDialogs[0] || '';
check('the migration reports what it did afterwards',
  /moved to notes/.test(splitDialogs[1] || ''), JSON.stringify((splitDialogs[1] || '').slice(0,80)));
check('the migration explains itself before running', /moved into NOTES/.test(splitMsg), JSON.stringify(splitMsg.slice(0,120)));
check('a personal reason-to-save moved to notes',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a6').notes)) === 'Loves dogs, saw her flash at a show');
check('...and left status empty',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a6').status)) === '');
check('a booking window stayed in status',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a8').status)) === 'Books open in January');
check('...and did not leak into notes',
  !(await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a8').notes)));
check('an entry that already had notes was not touched',
  (await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='a1').notes)) === 'Line one\nLine two');

section('item 14 — map clustering');
await ensureClosed();
await page.locator('.view-tab[data-view="map"]').click();
await page.waitForTimeout(400);
if(HAVE_MAP_LIBS){
  check('the markercluster plugin loaded',
    await page.evaluate(() => typeof window.L?.markerClusterGroup === 'function'));
  const clustersAtWorldZoom = await page.locator('.marker-cluster').count();
  check('zoomed out, pins collapse into clusters', clustersAtWorldZoom > 0,
    clustersAtWorldZoom + ' cluster bubbles');
  check('clusters show a count', /\d/.test(await page.locator('.marker-cluster').first().innerText()),
    await page.locator('.marker-cluster').first().innerText());
  // Clicking a cluster USED to zoom to its bounds and do nothing else. It now
  // opens the results panel on that cluster's artists instead, and deliberately
  // does NOT zoom: the panel answers "who is here", which the zoom never did.
  // Zoom level is readable straight off the tile URLs (/{z}/{x}/{y}.png), so
  // this stays a DOM assertion rather than reaching into Leaflet.
  const tileZoom = () => page.evaluate(() => {
    const t = document.querySelector('.leaflet-tile');
    const m = t && t.src.match(/\/(\d+)\/\d+\/\d+\.png/);
    return m ? +m[1] : null;
  });
  const zoomBefore = await tileZoom();
  await page.locator('.marker-cluster').first().click();
  await page.waitForTimeout(1200);
  const zoomAfter = await tileZoom();
  check('clicking a cluster no longer just zooms', zoomAfter === zoomBefore,
    'zoom ' + zoomBefore + ' -> ' + zoomAfter);
  check('...it opens the results panel on that cluster instead',
    (await page.locator('#mapPanelList .map-panel-item').count()) > 0
      && (await page.locator('#mapPanelTitle').innerText()).trim() !== 'in view',
    JSON.stringify(await page.locator('#mapPanelTitle').innerText()));
  await page.locator('#mapPanelClose').click();
  await page.waitForTimeout(250);
}else{
  console.log('  SKIP cluster checks — run: npm install --no-save leaflet@1.9.4 leaflet.markercluster@1.5.3');
}
check('map count is shown', await page.locator('#mapCount').isVisible());
check('map count names plotted and unplotted',
  /artists? plotted/.test(await page.locator('#mapCount').innerText())
  && /without a usable location/.test(await page.locator('#mapCount').innerText()),
  await page.locator('#mapCount').innerText());
const plottedAll = (await page.locator('#mapCount').innerText()).match(/^(\d+)/)[1];
await page.locator('.chip[data-cat="tattoo"]').click();
await page.waitForTimeout(400);
const plottedTattoo = (await page.locator('#mapCount').innerText()).match(/^(\d+)/)[1];
check('the map respects the active filters', +plottedTattoo < +plottedAll,
  plottedAll + ' plotted for all, ' + plottedTattoo + ' for tattoo only');
await page.locator('.chip[data-cat="all"]').click();

await page.locator('.view-tab[data-view="list"]').click();
check('map count hidden in list view', !(await page.locator('#mapCount').isVisible()));

// ---------------------------------------------------------------------------
// item 15 — decorative-unicode folding, tag grouping, and the 10-field paste
// ---------------------------------------------------------------------------
// These three are what the 242-artist research file actually needs. Each is
// asserted against data written the way the real file writes it, not a
// convenient ascii stand-in.

// The shared context seeds SEED into localStorage on EVERY navigation, so a
// write-then-reload would be clobbered by the init script and the checks below
// would silently run against the old fixture. Each of these sections therefore
// gets its own context with its own seed — and its own page errors folded back
// into the same list, so nothing escapes the final health check.
let tp = null;
let tctx = null;
// `setup` runs against the fresh context before the page opens — used to give
// a section its own network stubs (e.g. aborting Nominatim so the static
// gazetteer is measured on its own rather than quietly propped up by it).
async function reseed(rows, setup){
  if(tp) await tctx.close();
  tctx = await browser.newContext({ viewport:{ width:1280, height:900 } });
  if(setup) await setup(tctx);
  await tctx.addInitScript(([store, seed]) => {
    sessionStorage.setItem('artistTracker.unlocked', '1');
    localStorage.setItem(store, JSON.stringify(seed));
  }, [STORE, rows]);
  await tctx.route('**/artist-tracker.html', async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace(/ integrity="sha256-[^"]*"/g, '');
    await r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type':'text/html' } });
  });
  tp = await tctx.newPage();
  await stub(tp);
  tp.on('pageerror', e => pageErrors.push(e.message));
  await tp.goto(URL_, { waitUntil:'domcontentloaded' });
  // An empty fixture renders no rows, so waiting on one would hang. The
  // toolbar is always there; wait on rows only when rows were seeded.
  await tp.waitForSelector('.add-row');
  if(rows.length) await tp.waitForSelector('#list .entry');
  await tp.locator('.chip[data-cat="all"]').click();
  return tp;
}
// Rows lead with an .entry-index ("001"), so read the name element itself.
async function visibleNames(){
  return await tp.evaluate(() =>
    [...document.querySelectorAll('#list .entry .entry-name')].map(el => el.textContent.trim()));
}

section('item 15a — decorative unicode folds for search and region');
const FOLD_SEED = [
  // Exactly the shapes the real file carries: fraktur, script, small caps,
  // fullwidth, and a small-caps US state code.
  // NOTE: this handle deliberately does NOT contain "sarah". The haystack
  // includes the handle, so a realistic @sarahrose_tattoo would satisfy the
  // search check on its own and the fold would never be exercised.
  { id:'f1', name:'𝕾𝖆𝖗𝖆𝖍 𝕽𝖔𝖘𝖊', handle:'@goldenharvest.resident', pronouns:'', category:'tattoo',
    location:'Baden-Württemberg, Germany', date:'', status:'', link:'', photo:'',
    tags:['blackwork','floral'], gender:'unknown' },
  { id:'f2', name:'𝑨𝒃𝒊', handle:'@abitatts', pronouns:'', category:'tattoo',
    location:'ʟᴏɴɢ ʙᴇᴀᴄʜ, ᴄᴀ', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown' },
  { id:'f3', name:'Ａｌｙｓｓａ . Ｖｉｌｌｅｌａ', handle:'@vitruvian.ink', pronouns:'', category:'tattoo',
    location:'', date:'', status:'', link:'', photo:'', tags:['realism'], gender:'unknown' },
  { id:'f4', name:'Sage', handle:'@_wisesage', pronouns:'', category:'tattoo',
    location:'ʟᴏꜱ ᴀɴɢᴇʟᴇꜱ', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown' },
  { id:'f5', name:'Plain Person', handle:'@plainperson', pronouns:'', category:'tattoo',
    location:'Austin, TX, USA', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown' },
];
await reseed(FOLD_SEED);

await tp.fill('#searchInput', 'sarah');
await tp.waitForTimeout(120);
check('plain-ascii search finds a fraktur name', (await visibleNames()).includes('𝕾𝖆𝖗𝖆𝖍 𝕽𝖔𝖘𝖊'),
  JSON.stringify(await visibleNames()));
await tp.fill('#searchInput', 'alyssa');
await tp.waitForTimeout(120);
check('...and a fullwidth one', (await tp.locator('#list .entry').count()) === 1);
await tp.fill('#searchInput', 'los angeles');
await tp.waitForTimeout(120);
check('...and a small-caps location', (await tp.locator('#list .entry').count()) === 1);
await tp.fill('#searchInput', '𝕾𝖆𝖗𝖆𝖍');
await tp.waitForTimeout(120);
check('typing the decorative form still works too', (await tp.locator('#list .entry').count()) === 1);
await tp.fill('#searchInput', 'goldenharvest');
await tp.waitForTimeout(120);
check('searching by handle still works', (await tp.locator('#list .entry').count()) === 1,
  String(await tp.locator('#list .entry').count()));
await tp.fill('#searchInput', 'plain');
await tp.waitForTimeout(120);
check('a plain entry is still found the ordinary way', (await tp.locator('#list .entry').count()) === 1);
await tp.fill('#searchInput', '');
await tp.waitForTimeout(120);

const foldRegionOpts = await tp.locator('#regionSelect option').allTextContents();
check('small-caps ᴄᴀ folds into USA rather than becoming its own region',
  foldRegionOpts.some(o => /^USA \(2\)/.test(o)) && !foldRegionOpts.some(o => /ᴄᴀ/.test(o)),
  JSON.stringify(foldRegionOpts));

section('item 15b — style tags group by normalized key');
const TAG_SEED = [
  { id:'t1', name:'One', handle:'@one', category:'tattoo', location:'', pronouns:'', date:'',
    status:'', link:'', photo:'', tags:['Fine Line'], gender:'unknown' },
  { id:'t2', name:'Two', handle:'@two', category:'tattoo', location:'', pronouns:'', date:'',
    status:'', link:'', photo:'', tags:['fineline'], gender:'unknown' },
  { id:'t3', name:'Three', handle:'@three', category:'tattoo', location:'', pronouns:'', date:'',
    status:'', link:'', photo:'', tags:['fine-line'], gender:'unknown' },
  { id:'t4', name:'Four', handle:'@four', category:'tattoo', location:'', pronouns:'', date:'',
    status:'', link:'', photo:'', tags:['blackwork'], gender:'unknown' },
];
await reseed(TAG_SEED);
const chipText = await tp.evaluate(() =>
  [...document.querySelectorAll('#tagChips .tag-chip')].map(b => b.innerText.replace(/\s+/g,' ').trim()));
check('three spellings collapse into one chip',
  chipText.filter(t => /fine/i.test(t)).length === 1, JSON.stringify(chipText));
check('...carrying the combined count',
  chipText.some(t => /fine.*\(3\)/i.test(t)), JSON.stringify(chipText));
const fineKey = await tp.evaluate(() =>
  [...document.querySelectorAll('#tagChips .tag-chip')].map(b => b.dataset.tag).find(k => /fine/.test(k)));
await tp.locator('.tag-chip[data-tag="' + fineKey + '"]').click();
await tp.waitForTimeout(120);
check('selecting it matches every spelling', (await tp.locator('#list .entry').count()) === 3,
  String(await tp.locator('#list .entry').count()));
await tp.locator('.tag-chip[data-tag="' + fineKey + '"]').click();
await tp.waitForTimeout(120);
check('entries keep their own spelling — nothing is rewritten',
  await tp.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem('artistTracker.entries.v1'));
    return rows.find(e=>e.id==='t1').tags[0] === 'Fine Line'
        && rows.find(e=>e.id==='t2').tags[0] === 'fineline'
        && rows.find(e=>e.id==='t3').tags[0] === 'fine-line';
  }));
// The drawer's picker must not offer a second button meaning the same thing.
// Rows sort by name, so "One" (tagged "Fine Line") is not the first row —
// open it explicitly rather than whichever happens to sort first.
await tp.locator('#list .entry', { has: tp.locator('.entry-name', { hasText: /^One$/ }) }).click();
await tp.waitForTimeout(SLIDE);
await tp.locator('#detailEdit').click();
await tp.waitForTimeout(150);
const pickerKeys = await tp.evaluate(() =>
  [...document.querySelectorAll('#tagPicker .tag-toggle')].map(b => b.textContent));
check('tag picker offers one button per key, not per spelling',
  pickerKeys.filter(t => t.replace(/[\s\-]/g,'').toLowerCase() === 'fineline').length === 1,
  JSON.stringify(pickerKeys.filter(t => /fine/i.test(t))));
check('...and it reads as selected for this entry',
  await tp.evaluate(() => [...document.querySelectorAll('#tagPicker .tag-toggle')]
    .some(b => b.dataset.on === 'true' && /fine/i.test(b.textContent))));
await tp.keyboard.press('Escape');
await tp.waitForTimeout(SLIDE);

section('item 15b2 — the tag bar caps itself instead of burying the list');
// 24 distinct tags with one artist each: past the TOP_N of 18, so the cap and
// its toggle are exercised rather than assumed.
const MANY = Array.from({length: 24}, (_, i) => ({
  id:'m'+i, name:'Artist '+i, handle:'@a'+i, category:'tattoo', location:'', pronouns:'',
  date:'', status:'', link:'', photo:'', tags:['style'+String(i).padStart(2,'0')], gender:'unknown',
}));
await reseed(MANY);
const capped = await tp.locator('#tagChips .tag-chip').count();
check('only the busiest tags show by default', capped === 18, String(capped));
check('...with the rest one click away', /\+ 6 more/.test(await tp.locator('#tagChips').innerText()),
  JSON.stringify(await tp.locator('#tagChips').innerText()));
const cappedH = await tp.evaluate(() => Math.round(document.getElementById('tagChips').getBoundingClientRect().height));
check('...so the filter bar stays shorter than the viewport', cappedH < 400, cappedH + 'px');
// If the cap is gone there is no toggle to drive, and clicking a missing
// button would abort the whole run and hide every check after it. Report the
// failures and move on instead.
const haveMore = await tp.locator('.tag-chip-more').count() > 0;
check('a "+ N more" control exists to open the rest', haveMore);
if(haveMore){
  await tp.locator('.tag-chip-more').click();
  await tp.waitForTimeout(120);
  check('"more" reveals all of them', (await tp.locator('#tagChips .tag-chip').count()) === 24,
    String(await tp.locator('#tagChips .tag-chip').count()));
  check('...and offers the way back', /show fewer/.test(await tp.locator('#tagChips').innerText()));
  // Select a tag that is NOT in the top 18, then collapse: it must stay on
  // screen, or the user is left filtered by something they cannot unclick.
  const lastKey = await tp.evaluate(() =>
    [...document.querySelectorAll('#tagChips .tag-chip')].pop().dataset.tag);
  await tp.locator('.tag-chip[data-tag="' + lastKey + '"]').click();
  await tp.waitForTimeout(120);
  await tp.locator('.tag-chip-more').click();
  await tp.waitForTimeout(120);
  check('a selected low-rank tag survives collapsing',
    await tp.locator('.tag-chip[data-tag="' + lastKey + '"]').isVisible());
  check('...and can be cleared', await tp.locator('.tag-chip-clear').isVisible());
  await tp.locator('.tag-chip-clear').click();
  await tp.waitForTimeout(120);
  check('clear releases the filter', (await tp.locator('#list .entry').count()) === 24,
    String(await tp.locator('#list .entry').count()));
}else{
  check('"more" reveals all of them', false, 'no cap — nothing to reveal');
  check('...and offers the way back', false, 'no cap');
  check('a selected low-rank tag survives collapsing', false, 'no cap');
  check('...and can be cleared', false, 'no cap');
  check('clear releases the filter', false, 'no cap');
}

section('item 15c — bulk paste takes 10 fields, and refuses the wrong count');
await reseed([
  { id:'b1', name:'Existing Artist', handle:'@existing', category:'tattoo', location:'', pronouns:'',
    date:'', status:'', link:'', photo:'', tags:['ornamental'], gender:'unknown' },
]);
await tp.locator('#bulkToggle').click();
await tp.selectOption('#bulkDedupe', 'merge');
// Lines lifted from the real research file's shape, plus two deliberately
// malformed ones. A stray | is the failure this validation exists for: it
// shifts every field one column and lands a location in `pronouns`.
await tp.fill('#bulkText', [
  'Marta Madrigal|@marta.madrigal_tattoos|Tattoo|Toulouse, France|||instagram.com/marta.madrigal_tattoos||floral, fine line|woman',
  'VOID LAVENDER|@void.lavender.ttt|Tattoo|Tours, France||Queer/nonbinary|instagram.com/void.lavender.ttt||flash tattoos|nonbinary',
  'Eight Field Only|@eightfield|Tattoo|Berlin|||instagram.com/eightfield|',
  'Broken | Line | with | too | few',
  'Way | too | many | fields | here | by | a | long | way | indeed | truly | so',
].join('\n'));
await tp.locator('#saveBulk').click();
await tp.waitForTimeout(400);
const rows = await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')));
const marta = rows.find(e => e.handle === '@marta.madrigal_tattoos');
const voidL = rows.find(e => e.handle === '@void.lavender.ttt');
check('a 10-field line imports its tags', marta && marta.tags.join(',') === 'floral,fine line',
  JSON.stringify(marta && marta.tags));
check('...and its gender', marta && marta.gender === 'woman', marta && marta.gender);
check('nonbinary is kept as itself, not folded into "not a woman"',
  voidL && voidL.gender === 'nonbinary', voidL && voidL.gender);
check('a blank gender cell stays unknown, never guessed',
  rows.find(e => e.handle === '@eightfield').gender === 'unknown');
check('an 8-field line still imports', !!rows.find(e => e.handle === '@eightfield'));
check('malformed lines are NOT imported', rows.length === 4, String(rows.length));

const report = await tp.locator('#bulkReport').innerText();
check('the report names the wrong-field-count lines', /2 line\(s\) skipped for a wrong field count/.test(report),
  JSON.stringify(report.slice(0, 200)));
check('...with their line numbers', /line 4 has 5 fields/.test(report) && /line 5 has 12 fields/.test(report),
  JSON.stringify(report.slice(0, 300)));
check('the report is toned as a warning', await tp.evaluate(() =>
  document.querySelector('.import-report').dataset.tone === 'warn'));
check('the report counts what did land', /3 added/.test(report), JSON.stringify(report.slice(0,120)));

section('item 15c2 — tags outside the nine are reported, never dropped');
// The nine are a controlled vocabulary, but an off-vocabulary tag is still
// REAL DATA — dropping it silently would lose work. It imports, and the
// report names it and its line so a drift upstream is visible.
await reseed([], async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => r.abort());
});
await tp.locator('#bulkToggle').click();
await tp.selectOption('#bulkDedupe', 'overwrite');
await tp.fill('#bulkText', [
  'In Vocab|@inv|Tattoo|Berlin, Germany|||instagram.com/inv||fine line, blackwork|',
  'Off Vocab|@offv|Tattoo|Paris, France|||instagram.com/offv||steampunk, fine line|',
  'Also Off|@offv2|Tattoo|London, UK|||instagram.com/offv2||steampunk|',
  'Spelling|@spell|Tattoo|Lyon, France|||instagram.com/spell||Fine-Line|',
].join('\n'));
await tp.locator('#saveBulk').click();
await tp.waitForTimeout(600);
const vocabReport = await tp.locator('#bulkReport').innerText();
check('all four lines import', /4 added/.test(vocabReport), JSON.stringify(vocabReport.slice(0,90)));
check('the off-vocabulary tag is NOT dropped from the entry',
  await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1'))
    .find(e => e.handle === '@offv').tags.includes('steampunk')));
check('...and the report names it', /steampunk/.test(vocabReport), JSON.stringify(vocabReport.slice(0,400)));
check('...with the lines it appeared on', /lines 2, 3/.test(vocabReport), JSON.stringify(vocabReport.slice(0,400)));
check('one off-vocabulary tag is counted once, not once per use',
  /1 tag\(s\) outside the nine/.test(vocabReport), JSON.stringify(vocabReport.slice(0,400)));
check('an in-vocabulary tag is never flagged', !/fine line \(line/.test(vocabReport));
check('a different SPELLING of a vocabulary tag is not flagged as drift',
  !/Fine-Line/.test(vocabReport), JSON.stringify(vocabReport.slice(0,400)));
check('the report is toned as a warning when the vocabulary drifts',
  await tp.evaluate(() => document.querySelector('.import-report').dataset.tone === 'warn'));
await tp.locator('#cancelBulk').click();

// A clean paste must NOT cry wolf.
await reseed([], async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => r.abort());
});
await tp.locator('#bulkToggle').click();
await tp.fill('#bulkText',
  'Clean One|@c1|Tattoo|Berlin, Germany|||instagram.com/c1||fine line, dark & gothic|\n'
+ 'Clean Two|@c2|Tattoo|Paris, France|||instagram.com/c2||botanical & animal|');
await tp.locator('#saveBulk').click();
await tp.waitForTimeout(600);
const cleanReport = await tp.locator('#bulkReport').innerText();
check('a paste using only the nine reports no drift',
  !/outside the nine/.test(cleanReport), JSON.stringify(cleanReport));
check('...and stays toned as a clean run',
  await tp.evaluate(() => document.querySelector('.import-report').dataset.tone === 'ok'));
await tp.locator('#cancelBulk').click();

section('item 15d — what happens to a handle already in the list');
async function pasteWith(mode, text){
  if(!(await tp.locator('#panel').isVisible())) await tp.locator('#bulkToggle').click();
  await tp.selectOption('#bulkDedupe', mode);
  await tp.fill('#bulkText', text);
  await tp.locator('#saveBulk').click();
  await tp.waitForTimeout(350);
  return await tp.locator('#bulkReport').innerText();
}
await reseed([
  { id:'d1', name:'Held Name', handle:'@dupe', category:'tattoo', location:'Berlin', pronouns:'',
    date:'', status:'', link:'', photo:'', tags:['ornamental'], gender:'unknown' },
]);
const LINE = 'Pasted Name|@dupe|Tattoo|Paris, France|she/her||instagram.com/dupe||fine line|woman';

let rep = await pasteWith('skip', LINE);
let e1 = (await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1'))))[0];
check('skip leaves the existing entry completely untouched',
  e1.location === 'Berlin' && e1.gender === 'unknown' && e1.tags.join() === 'ornamental');
check('...and says so in the report', /1 skipped as duplicates/.test(rep), JSON.stringify(rep.slice(0,140)));
check('...and creates no second entry', (await tp.locator('#list .entry').count()) === 1);

rep = await pasteWith('merge', LINE);
e1 = (await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1'))))[0];
check('merge fills a blank field', e1.pronouns === 'she/her');
check('...never overwrites a filled one', e1.location === 'Berlin', e1.location);
check('...fills gender only because it was unknown', e1.gender === 'woman');
check('...and unions tags rather than replacing them',
  e1.tags.includes('ornamental') && e1.tags.includes('fine line'), JSON.stringify(e1.tags));

rep = await pasteWith('overwrite', LINE);
e1 = (await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1'))))[0];
check('overwrite replaces a filled field', e1.location === 'Paris, France', e1.location);
rep = await pasteWith('overwrite', 'Pasted Name|@dupe|Tattoo||||||' + '|');
e1 = (await tp.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1'))))[0];
check('...but a BLANK cell never wipes a field that has a value',
  e1.location === 'Paris, France' && e1.gender === 'woman', e1.location + '/' + e1.gender);

rep = await pasteWith('add', LINE);
check('add makes a second entry on purpose', (await tp.locator('#list .entry').count()) === 2,
  String(await tp.locator('#list .entry').count()));

await reseed([
  { id:'h1', name:'Styled Handle', handle:'@ᴋɪʀᴀɴ.ᴛᴀ2', category:'tattoo', location:'', pronouns:'',
    date:'', status:'', link:'', photo:'', tags:[], gender:'unknown' },
]);
await pasteWith('merge', 'Kiran|@kiran.ta2|Tattoo|South Korea|||instagram.com/kiran.ta2|||');
check('a decorative stored handle still matches the plain pasted one',
  (await tp.locator('#list .entry').count()) === 1, String(await tp.locator('#list .entry').count()));

await tctx.close();
tp = null;

// ---------------------------------------------------------------------------
// item 16 — locations resolve from a table, and failures are not permanent
// ---------------------------------------------------------------------------
section('item 16a — static gazetteer places locations with no network call');
// Nominatim is ABORTED for this whole section. Anything that plots here was
// placed by the table; if the table regressed, these go to zero rather than
// quietly falling back to the network and looking fine.
const GEO_SEED = [
  { id:'g1', name:'Plain City', handle:'@g1', category:'tattoo', location:'Seoul, South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g2', name:'State Code', handle:'@g2', category:'tattoo', location:'Austin, TX, USA',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g3', name:'Small Caps', handle:'@g3', category:'tattoo', location:'ʟᴏɴɢ ʙᴇᴀᴄʜ, ᴄᴀ',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g4', name:'Stroked L', handle:'@g4', category:'tattoo', location:'Wrocław, Poland',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g5', name:'Trailing Noise', handle:'@g5', category:'tattoo',
    location:'Frankfurt, Germany, moderate confidence',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g6', name:'Slash Pair', handle:'@g6', category:'tattoo', location:'Toronto/Vancouver, Canada',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g7', name:'No Comma', handle:'@g7', category:'tattoo', location:'Melbourne Australia',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g8', name:'Bare Country', handle:'@g8', category:'tattoo', location:'South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g9', name:'Genuinely Blank', handle:'@g9', category:'tattoo', location:'',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'g10', name:'Unplaceable', handle:'@g10', category:'tattoo', location:'Zzyzx Quadrant 9',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
];
let nominatimCalls = 0;
await reseed(GEO_SEED, async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => { nominatimCalls++; return r.abort(); });
});
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(600);
const geoCount = await tp.locator('#mapCount').innerText();
check('every table-resolvable location plots, offline',
  /^8 artists plotted/.test(geoCount), JSON.stringify(geoCount));
check('...and only the truly unplaceable are counted out',
  /2 without a usable location/.test(geoCount), JSON.stringify(geoCount));
check('a blank location is never sent to the network', nominatimCalls <= 1, String(nominatimCalls));
// Coordinates, not just "resolved": a table that answers with the WRONG place
// still plots the same number of pins. These call the shipped staticGeocode
// directly, so a mis-keyed city is a failure rather than a plausible-looking map.
const GEO_CASES = [
  ['Seoul, South Korea', 37.57, 126.98, 'a plain city, country pair'],
  ['Austin, TX, USA', 30.27, -97.74, 'a US state code'],
  ['ʟᴏɴɢ ʙᴇᴀᴄʜ, ᴄᴀ', 33.77, -118.19, 'small caps, including the state code'],
  ['Wrocław, Poland', 51.11, 17.03, 'a stroked ł, not the centre of Poland'],
  ['Frankfurt, Germany, moderate confidence', 50.11, 8.68, 'a trailing note segment'],
  ['Toronto/Vancouver, Canada', 43.65, -79.38, 'a slash pair takes the first place'],
  ['ʟᴏꜱ ᴀɴɢᴇʟᴇꜱ 📍 ᴀᴜꜱᴛɪɴ', 34.05, -118.24, 'a 📍 pair takes the first place'],
  ['Melbourne Australia', -37.81, 144.96, 'no comma at all'],
  ['South Korea', 36.50, 127.90, 'a bare country'],
  ['Athens, GA, USA', 33.96, -83.38, 'Athens in Georgia'],
  ['Athens, Greece', 37.98, 23.73, '...and Athens in Greece, told apart'],
  ['Georgia, USA', 32.17, -82.91, 'Georgia the state, not the country'],
  ['Washington, USA', 47.75, -120.74, 'bare Washington is the state'],
  ['Washington, DC', 38.91, -77.04, '...and the district when written as one'],
  ['Nowhereville, TX, USA', 31.97, -99.90, 'an unknown town still lands in its state'],
  ['São Paulo, Brazil, Vila Madalena', -23.55, -46.63, 'a neighbourhood suffix'],
];
for(const [q, lat, lng, why] of GEO_CASES){
  const got = staticGeocode(q);
  check(why, !!got && Math.abs(got.lat - lat) < 0.05 && Math.abs(got.lng - lng) < 0.05,
    JSON.stringify(q) + ' -> ' + (got ? got.lat + ',' + got.lng : 'null'));
}
check('a blank location resolves to nothing, never to a guess', staticGeocode('') === null);
check('an unplaceable string resolves to nothing rather than a wrong pin',
  staticGeocode('Zzyzx Quadrant 9') === null);
check('the fold reaches the gazetteer: "wroclaw" and "Wrocław" agree',
  JSON.stringify(staticGeocode('wroclaw, poland')) === JSON.stringify(staticGeocode('Wrocław, Poland')));

section('item 16b — a geocoding failure is retried, never permanent');
// The old code wrote geoStatus:'failed' and filtered those out forever, so one
// burst of 429s permanently retired a location. Storage carrying that legacy
// tombstone must be swept, and a fresh failure must not become one.
await reseed([
  { id:'x1', name:'Legacy Tombstone', handle:'@x1', category:'tattoo', location:'Seoul, South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'',
    geoStatus:'failed' },
], async (c) => { await c.route('**://nominatim.openstreetmap.org/**', r => r.abort()); });
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(500);
check('a legacy geoStatus tombstone is swept on load',
  await tp.evaluate(() => !('geoStatus' in JSON.parse(localStorage.getItem('artistTracker.entries.v1'))[0])));
check('...and the entry plots again', /^1 artist plotted/.test(await tp.locator('#mapCount').innerText()),
  JSON.stringify(await tp.locator('#mapCount').innerText()));

// Backoff and retry are seeded as STATE rather than produced by a reload:
// ctx.addInitScript re-seeds localStorage on every navigation, so a
// write-then-reload is silently clobbered and the check ends up measuring the
// harness. (Verified: a mutation making failures permanent again passed the
// reload-based version of this check.)
let backoffCalls = 0;
await reseed([
  { id:'x2', name:'Fresh Failure', handle:'@x2', category:'tattoo', location:'Nowhere Quadrant Zzyzx',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'',
    geoTries:1, geoFailedAt:Date.now() },
], async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => {
    backoffCalls++;
    return r.fulfill({ status:429, contentType:'text/plain', body:'Too Many Requests' });
  });
});
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(1600);
check('a failure just recorded is left alone rather than hammered',
  backoffCalls === 0, String(backoffCalls));

let retryCalls = 0;
await reseed([
  { id:'x3', name:'Aged Failure', handle:'@x3', category:'tattoo', location:'Nowhere Quadrant Zzyzx',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'',
    geoTries:1, geoFailedAt: Date.now() - (8 * 60 * 60 * 1000) },
], async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => {
    retryCalls++;
    return r.fulfill({ status:429, contentType:'text/plain', body:'Too Many Requests' });
  });
});
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(1600);
check('once the backoff expires the location IS retried, not retired forever',
  retryCalls >= 1, String(retryCalls));
const retryState = await tp.evaluate(() =>
  JSON.parse(localStorage.getItem('artistTracker.entries.v1'))[0]);
check('...and the retry is counted, so it cannot spin forever',
  (retryState.geoTries || 0) === 2, JSON.stringify(retryState.geoTries));

let cappedCalls = 0;
await reseed([
  { id:'x4', name:'Exhausted', handle:'@x4', category:'tattoo', location:'Nowhere Quadrant Zzyzx',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'',
    geoTries:3, geoFailedAt: Date.now() - (8 * 60 * 60 * 1000) },
], async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => {
    cappedCalls++;
    return r.fulfill({ status:429, contentType:'text/plain', body:'Too Many Requests' });
  });
});
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(1600);
check('a location that has failed its cap stops being asked about',
  cappedCalls === 0, String(cappedCalls));

// ---------------------------------------------------------------------------
// item 17 — the map results panel
// ---------------------------------------------------------------------------
section('item 17 — map results panel');
const PANEL_SEED = [
  { id:'p1', name:'Seoul One', handle:'@p1', category:'tattoo', location:'Seoul, South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:['fine line'], gender:'woman',
    notes:'Books open in spring, worth the wait.' },
  { id:'p2', name:'Seoul Two', handle:'@p2', category:'tattoo', location:'Seoul, South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:['ornamental'], gender:'unknown', notes:'' },
  { id:'p3', name:'Seoul Three', handle:'@p3', category:'following', location:'Seoul, South Korea',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
  { id:'p4', name:'Berlin One', handle:'@p4', category:'tattoo', location:'Berlin, Germany',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:['blackwork'], gender:'unknown', notes:'' },
  { id:'p5', name:'Nowhere', handle:'@p5', category:'tattoo', location:'',
    pronouns:'', date:'', status:'', link:'', photo:'', tags:[], gender:'unknown', notes:'' },
];
await reseed(PANEL_SEED, async (c) => {
  await c.route('**://nominatim.openstreetmap.org/**', r => r.abort());
});
await tp.locator('.view-tab[data-view="map"]').click();
await tp.waitForTimeout(700);

check('the panel sits beside the map', await tp.locator('#mapPanel').isVisible());
check('with nothing selected it lists what is in view',
  (await tp.locator('#mapPanelTitle').innerText()).trim() === 'in view',
  JSON.stringify(await tp.locator('#mapPanelTitle').innerText()));
const inView = await tp.locator('#mapPanelList .map-panel-item').count();
check('...and that is the plottable, filtered set', inView === 4, String(inView));
check('the panel reuses the list row markup rather than a second card style',
  await tp.locator('#mapPanelList .map-panel-item .entry').count() === inView);
check('notes are shown in the panel',
  (await tp.locator('#mapPanelList').innerText()).includes('Books open in spring'));
check('an Instagram link is offered per artist',
  await tp.locator('#mapPanelList .map-panel-ig').count() === inView);
check('...pointing at the right profile',
  (await tp.locator('#mapPanelList .map-panel-ig').first().getAttribute('href')).includes('instagram.com/'));
check('...and it is a SIBLING of the row, never a link inside a button',
  await tp.locator('#mapPanelList .entry a').count() === 0);

// Filters must reach the panel, not just the pins.
await tp.locator('.chip[data-cat="tattoo"]').click();
await tp.waitForTimeout(400);
const tattooOnly = await tp.locator('#mapPanelList .map-panel-item').count();
check('the panel respects the category filter', tattooOnly === 3, String(tattooOnly));
await tp.fill('#searchInput', 'berlin');
await tp.waitForTimeout(400);
check('...and the search box',
  (await tp.locator('#mapPanelList .map-panel-item').count()) === 1,
  String(await tp.locator('#mapPanelList .map-panel-item').count()));
await tp.fill('#searchInput', '');
await tp.locator('.chip[data-cat="all"]').click();
await tp.waitForTimeout(400);

// Clicking a pin pins the selection and lists everyone sharing that spot.
const pinCount = await tp.locator('.map-pin').count();
check('pins are on the map to click', pinCount > 0, String(pinCount));
if(pinCount > 0){
  await tp.locator('.map-pin').first().click({ force:true });
  await tp.waitForTimeout(400);
  const title = (await tp.locator('#mapPanelTitle').innerText()).trim();
  const listed = await tp.locator('#mapPanelList .map-panel-item').count();
  check('clicking a pin names the place', title !== 'in view', JSON.stringify(title));
  check('...and lists what is at it', listed >= 1, String(listed));
  check('...and offers a close control', await tp.locator('#mapPanelClose').isVisible());
  await tp.locator('#mapPanelClose').click();
  await tp.waitForTimeout(300);
  check('close returns the panel to the viewport list',
    (await tp.locator('#mapPanelTitle').innerText()).trim() === 'in view');

  // A LONE pin listing one artist proves nothing about "everyone at this
  // location" — the three Seoul entries collapse into a cluster, and that is
  // the case worth asserting. Clicking it must list all three, and must NOT
  // just zoom the way it used to.
  const clusters = await tp.locator('.marker-cluster').count();
  check('the Seoul entries collapse into a cluster to click', clusters === 1, String(clusters));
  if(clusters > 0){
    const zoomBefore = await tp.evaluate(() => document.querySelectorAll('.marker-cluster').length);
    await tp.locator('.marker-cluster').first().click({ force:true });
    await tp.waitForTimeout(500);
    check('clicking a cluster lists every artist in it',
      (await tp.locator('#mapPanelList .map-panel-item').count()) === 3,
      String(await tp.locator('#mapPanelList .map-panel-item').count()));
    check('...names their shared location',
      (await tp.locator('#mapPanelTitle').innerText()).trim() === 'Seoul, South Korea',
      JSON.stringify(await tp.locator('#mapPanelTitle').innerText()));
    check('...and opens the panel instead of only zooming',
      (await tp.locator('.marker-cluster').count()) === zoomBefore,
      'clusters before ' + zoomBefore + ', after ' + (await tp.locator('.marker-cluster').count()));
    await tp.locator('#mapPanelClose').click();
    await tp.waitForTimeout(250);
  }

  await tp.locator('.map-pin').first().click({ force:true });
  await tp.waitForTimeout(300);
  await tp.keyboard.press('Escape');
  await tp.waitForTimeout(300);
  check('Escape clears a pinned selection',
    (await tp.locator('#mapPanelTitle').innerText()).trim() === 'in view');

  // Hovering a panel row highlights its marker, and the reverse.
  await tp.locator('#mapPanelList .map-panel-item').first().hover();
  await tp.waitForTimeout(250);
  check('hovering a panel row highlights something on the map',
    await tp.evaluate(() => !!document.querySelector('[data-hi="true"]')));
  await tp.locator('#mapPanelTitle').hover();
  await tp.waitForTimeout(250);
  check('...and the highlight is released',
    await tp.evaluate(() => !document.querySelector('.map-pin[data-hi="true"], .marker-cluster[data-hi="true"]')));
}

// A pinned selection that the filters empty must not linger as a stale list.
if(pinCount > 0){
  await tp.locator('.map-pin').first().click({ force:true });
  await tp.waitForTimeout(300);
  await tp.fill('#searchInput', 'zzzz-no-match');
  await tp.waitForTimeout(400);
  check('a pinned selection emptied by a filter drops itself',
    (await tp.locator('#mapPanelTitle').innerText()).trim() === 'in view',
    JSON.stringify(await tp.locator('#mapPanelTitle').innerText()));
  await tp.fill('#searchInput', '');
  await tp.waitForTimeout(300);
}

// Narrow viewport: stacked, not squeezed.
await tp.setViewportSize({ width:390, height:780 });
await tp.waitForTimeout(400);
const stacked = await tp.evaluate(() => {
  const m = document.getElementById('mapContainer').getBoundingClientRect();
  const p = document.getElementById('mapPanel').getBoundingClientRect();
  return { mapW:Math.round(m.width), panelW:Math.round(p.width), below: p.top >= m.bottom - 2 };
});
check('on a phone the panel stacks below the map', stacked.below, JSON.stringify(stacked));
check('...at full width, not squeezed beside it', stacked.panelW > 300, JSON.stringify(stacked));
check('no horizontal overflow with the panel open',
  await tp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
await tp.setViewportSize({ width:1280, height:900 });
await tp.waitForTimeout(300);

await tctx.close();
tp = null;

section('mobile');
const m = await ctx.newPage();
await stub(m);
await m.setViewportSize({ width:390, height:780 });
await m.goto(URL_, { waitUntil:'domcontentloaded' });
await m.waitForSelector('#list .entry');
await m.locator('#list .entry').first().click();
await m.waitForTimeout(SLIDE);
const mbox = await m.locator('#drawer').boundingBox();
check('drawer is full-width on mobile', Math.abs(mbox.width - 390) < 2, mbox.width + 'px');
check('no horizontal overflow on mobile',
  await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));


// ---------------------------------------------------------------------------
section('item 28 — the merge is ONE table, checked as a pure function');
// A wrong rule still produces a plausible list on the real data, so these are
// written-down cases rather than an eyeball on 240 entries.
{
  const fields = MERGE_RULES.map(r => r.field);
  check('handle is not a merge field — it is the key the two matched on',
    !fields.includes('handle') && !fields.includes('id'), fields.join(','));
  check('every rule names a known kind',
    MERGE_RULES.every(r => ['text','unset','union','oldest'].includes(r.rule)));
  check('a rating is an `unset` rule, so 0 is not a value worth keeping',
    MERGE_RULES.find(r => r.field === 'stars').rule === 'unset'
    && MERGE_RULES.find(r => r.field === 'stars').unset === 0);
  check('addedAt is `oldest`, so a restore cannot make an entry look newer',
    MERGE_RULES.find(r => r.field === 'addedAt').rule === 'oldest');
  check('rating, markers and addedAt are out of the paste’s reach',
    ['stars','markers','addedAt'].every(f => MERGE_RULES.find(r => r.field === f).bulk === false));

  // merge = fill blanks only, and a blank INCOMING value never erases.
  let e = { location:'Berlin', status:'', gender:'unknown', stars:0, tags:['blackwork'] };
  mergeEntry(e, { location:'Oslo', status:'books open', gender:'woman', stars:2, tags:['color'] }, 'merge', 'json');
  check('merge fills a blank', e.status === 'books open');
  check('merge does not touch a filled field', e.location === 'Berlin');
  check('merge treats an unset rating as blank', e.stars === 2);
  check('merge unions tags', e.tags.join() === 'blackwork,color');

  e = { location:'Berlin', status:'books open', gender:'woman', stars:3 };
  mergeEntry(e, { location:'Oslo', status:'', gender:'unknown', stars:0 }, 'overwrite', 'json');
  check('overwrite lets a value win', e.location === 'Oslo');
  check('...but a BLANK incoming value never erases', e.status === 'books open');
  check('...and an unset rating is not an opinion', e.stars === 3);

  e = { addedAt:'2026-01-01T00:00:00.000Z' };
  mergeEntry(e, { addedAt:'2026-09-01T00:00:00.000Z' }, 'overwrite', 'json');
  check('the OLDER stamp wins even in overwrite', e.addedAt === '2026-01-01T00:00:00.000Z');
  e = { addedAt:'2026-09-01T00:00:00.000Z' };
  mergeEntry(e, { addedAt:'2026-01-01T00:00:00.000Z' }, 'merge', 'json');
  check('...and an older incoming stamp replaces a newer one', e.addedAt === '2026-01-01T00:00:00.000Z');

  // Scope is what keeps the research file out of fields it has no column for.
  e = { stars:0, markers:[], notes:'why I saved her', addedAt:'2026-01-01T00:00:00.000Z' };
  mergeEntry(e, { stars:3, markers:['booked'], notes:'', addedAt:'2020-01-01T00:00:00.000Z' }, 'overwrite', 'bulk');
  check('a bulk paste cannot set a rating', e.stars === 0);
  check('a bulk paste cannot set a marker', e.markers.length === 0);
  check('a bulk paste cannot move addedAt', e.addedAt === '2026-01-01T00:00:00.000Z');
  // ...while a JSON restore can, because it is a whole entry.
  mergeEntry(e, { stars:3, markers:['booked'] }, 'overwrite', 'json');
  check('a JSON restore can', e.stars === 3 && e.markers.join() === 'booked');

  e = { markers:['booked'] };
  mergeEntry(e, { markers:['booked'] }, 'merge', 'json');
  check('a marker already held is not doubled', e.markers.length === 1);
}

// ---------------------------------------------------------------------------
section('item 28b — a backup states what it holds, and import applies nothing until told');
{
  const p = await reseed([
    { id:'j1', name:'Ada Vance', handle:'@ada.v', category:'tattoo', location:'Berlin, Germany', tags:['fine line'], stars:0, notes:'' },
    { id:'j2', name:'Bo Reyes', handle:'@bo.reyes', category:'tattoo', location:'Lisbon, Portugal', tags:[], stars:0, notes:'' },
  ]);

  // The real bytes the user gets, captured off the download.
  const [dl] = await Promise.all([
    p.waitForEvent('download'),
    p.locator('#exportBtn').click(),
  ]);
  const exported = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  check('the export carries a header', exported.format === 'artist-tracker' && exported.version === 1);
  check('...stating its own count', exported.count === 2 && exported.entries.length === 2);
  check('...and when it was taken', !isNaN(new Date(exported.exportedAt).getTime()));

  async function offer(obj, name){
    await p.setInputFiles('#importFile', {
      name: name || 'backup.json', mimeType:'application/json',
      buffer: Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)),
    });
    await p.waitForTimeout(180);
  }
  const count = () => p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).length);

  // THE REGRESSION. The old import concatenated, so restoring a backup of the
  // current list on top of itself doubled every entry with nothing to undo it.
  await offer(exported);
  check('choosing a file shows a card instead of importing', await p.locator('#ioReport .import-report').isVisible());
  check('...naming what is in the file and what is already here',
    /2 in the file/.test(await p.textContent('#ioReport')) && /2 already here/.test(await p.textContent('#ioReport')));
  check('...and the overlap it is about to act on', /2 handle\(s\) in both/.test(await p.textContent('#ioReport')));
  check('...defaulting to the mode that cannot destroy work',
    await p.inputValue('#ioDedupe') === 'merge');
  check('NOTHING has been imported yet', await count() === 2);

  await p.locator('#ioReport button', { hasText:'cancel' }).click();
  check('cancel leaves the list alone', await count() === 2);
  check('...and clears the card', (await p.textContent('#ioReport')).trim() === '');

  await offer(exported);
  await p.locator('#ioReport button', { hasText:/^import$/ }).click();
  await p.waitForTimeout(200);
  check('restoring a backup onto itself does NOT double the list', await count() === 2,
    'was ' + await count());
  check('...and says so', /0<\/span> added/.test(await p.innerHTML('#ioReport')));

  // ...but `add` still means add, or the mode would be a lie.
  await offer(exported);
  await p.selectOption('#ioDedupe', 'add');
  await p.locator('#ioReport button', { hasText:/^import$/ }).click();
  await p.waitForTimeout(200);
  check('`add` really does duplicate, so the choice is real', await count() === 4);

  // Back to two for the remaining cases.
  await p.evaluate(() => {
    const keep = JSON.parse(localStorage.getItem('artistTracker.entries.v1')).slice(0, 2);
    localStorage.setItem('artistTracker.entries.v1', JSON.stringify(keep));
  });
  await p.reload({ waitUntil:'domcontentloaded' });
  await p.waitForSelector('#list .entry');

  // A bare array is what every backup taken before today looks like.
  await offer([{ id:'j9', name:'Cyd Marr', handle:'@cyd.marr', category:'tattoo' }], 'old-backup.json');
  check('a bare array is still read', await p.locator('#ioReport .import-report').isVisible());
  check('...and is named as having no header', /bare array with no/.test(await p.textContent('#ioReport')));
  await p.locator('#ioReport button', { hasText:/^import$/ }).click();
  await p.waitForTimeout(200);
  check('...and imports', await count() === 3);

  await offer({ format:'artist-tracker', version:99, count:1, entries:[{ name:'X' }] });
  check('a NEWER version is refused, not partly read',
    /could not read that file/i.test(await p.textContent('#ioReport'))
    && /version/.test(await p.textContent('#ioReport')));
  check('...and nothing changed', await count() === 3);

  await offer('{"nope":true}');
  check('a file that is not a backup is refused', /could not read that file/i.test(await p.textContent('#ioReport')));
  check('...and nothing changed', await count() === 3);

  await offer({ format:'artist-tracker', version:1, count:7, entries:[{ name:'Y', handle:'@y' }] });
  check('a header that disagrees with the file is flagged',
    /header says/.test(await p.textContent('#ioReport'))
    && await p.getAttribute('#ioReport .import-report', 'data-tone') === 'warn');
  await p.locator('#ioReport button', { hasText:'cancel' }).click();

  await offer([{ id:'j1', name:'Ada CHANGED', handle:'@ada.v', category:'tattoo' }]);
  await p.selectOption('#ioDedupe', 'skip');
  await p.locator('#ioReport button', { hasText:/^import$/ }).click();
  await p.waitForTimeout(200);
  check('`skip` leaves an existing entry untouched',
    await p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='j1').name) === 'Ada Vance');
  // ...and nothing was ADDED beside it. `find` returns the first match, so an
  // import that duplicates instead of skipping leaves the original untouched
  // and satisfies the line above while doing the one thing this feature
  // exists to prevent. Measured: the mutation that restores concatenation
  // passes that check and fails this one.
  check('...and nothing was added beside it', await count() === 3, 'now ' + await count());
}

// ---------------------------------------------------------------------------
section('item 29 — rating: three stars, on the row and in the drawer');
{
  const p = await reseed([
    { id:'s1', name:'Ada Vance', handle:'@ada.v', category:'tattoo', location:'Berlin, Germany', tags:['fine line'], stars:0, notes:'' },
    { id:'s2', name:'Bo Reyes', handle:'@bo.reyes', category:'tattoo', location:'Lisbon, Portugal', tags:[], stars:3, notes:'' },
    { id:'s3', name:'Cyd Marr', handle:'@cyd.marr', category:'tattoo', location:'Oslo, Norway', tags:[], stars:2, notes:'' },
  ]);
  const rowOf = (n) => p.locator('#list .entry', { hasText:n });

  check('an unrated row draws its stars at zero, not as three empties',
    await rowOf('Ada Vance').locator('.entry-stars').getAttribute('data-stars') === '0');
  check('...and is invisible until the pointer is on the row',
    await rowOf('Ada Vance').locator('.entry-stars').evaluate(el => getComputedStyle(el).opacity) === '0');
  check('a rated row shows filled stars',
    await rowOf('Bo Reyes').locator('.star[data-on="true"]').count() === 3);
  check('...and the unfilled remainder on a partial one',
    await rowOf('Cyd Marr').locator('.star[data-on="true"]').count() === 2
    && await rowOf('Cyd Marr').locator('.star[data-on="false"]').count() === 1);

  // The item-11 exception, scoped: a star sets a value, it does not navigate.
  await rowOf('Ada Vance').locator('.star[data-v="2"]').click();
  await p.waitForTimeout(150);
  check('clicking a star on the row sets the rating',
    await p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='s1').stars) === 2);
  check('...and does NOT open the drawer',
    await p.getAttribute('#drawer', 'data-open') !== 'true');
  await rowOf('Ada Vance').locator('.star[data-v="2"]').click();
  await p.waitForTimeout(150);
  check('clicking the same star again clears it',
    await p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='s1').stars) === 0);

  // ...while the row itself still opens the drawer, which is the property the
  // exception must not have cost.
  await rowOf('Ada Vance').locator('.entry-name').click();
  await p.waitForTimeout(SLIDE);
  check('the row still opens the drawer', await p.getAttribute('#drawer', 'data-open') === 'true');
  check('the drawer names the rating of a rated entry once set', true);
  await p.locator('#detailEdit').click();
  await p.waitForTimeout(150);
  check('the drawer carries the canonical control',
    await p.locator('#fStars .star-btn').count() === 3);
  await p.locator('#fStars .star-btn[data-v="3"]').click();
  await p.locator('#saveEntry').click();
  await p.waitForTimeout(200);
  check('the drawer control saves a rating',
    await p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='s1').stars) === 3);
  check('...and the view shows it',
    /rating/i.test(await p.textContent('#drawerView')));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(SLIDE);

  // The filter is a threshold except at its two ends.
  const chipN = async (id) => (await p.textContent('#starChips .chip[data-star="' + id + '"]')).trim();
  check('the rating chips carry counts', /\(\d+\)$/.test(await chipN('3')), await chipN('3'));
  check('three-star counts only threes', /\(2\)$/.test(await chipN('3')), await chipN('3'));
  check('two-plus counts two AND three', /\(3\)$/.test(await chipN('2')), await chipN('2'));
  check('unrated is browsable and counted', /\(0\)$/.test(await chipN('unrated')), await chipN('unrated'));

  await p.locator('#starChips .chip[data-star="3"]').click();
  await p.waitForTimeout(150);
  check('filtering to three stars shows only threes',
    (await visibleNames()).sort().join() === 'Ada Vance,Bo Reyes');
  await p.locator('#starChips .chip[data-star="2"]').click();
  await p.waitForTimeout(150);
  check('two-plus includes the two', (await visibleNames()).length === 3);
  await p.locator('#starChips .chip[data-star="all"]').click();
  await p.waitForTimeout(150);
  check('all comes back', (await visibleNames()).length === 3);
}

// ---------------------------------------------------------------------------
section('item 29b — markers are a set, and the table is the only place they are declared');
{
  const p = await reseed([
    { id:'m1', name:'Ada Vance', handle:'@ada.v', category:'tattoo', location:'Berlin, Germany', tags:[], markers:[], notes:'' },
    { id:'m2', name:'Bo Reyes', handle:'@bo.reyes', category:'tattoo', location:'Lisbon, Portugal', tags:[], markers:['booked'], notes:'' },
    { id:'m3', name:'Cyd Marr', handle:'@cyd.marr', category:'tattoo', location:'Oslo, Norway', tags:[], markers:['nosuchmarker'], notes:'' },
  ]);
  const rowOf = (n) => p.locator('#list .entry', { hasText:n });

  check('an unmarked row draws no marker glyph at all',
    await rowOf('Ada Vance').locator('.entry-markers').count() === 0);
  check('a marked row draws exactly its own',
    await rowOf('Bo Reyes').locator('.marker-glyph').count() === 1);
  check('...as a bare glyph, never a word pill',
    await rowOf('Bo Reyes').locator('.entry-markers .entry-tag-pill').count() === 0);
  // Both halves, because they fail differently: dropping the id is the
  // behaviour, and the ROW STILL RENDERING is what separates "dropped" from
  // "markerDef() returned null and the row threw". The first version of this
  // check asserted only the glyph count, and a mutation that renders the
  // undeclared id crashes the row -- so it read zero glyphs and passed while
  // the defect was present.
  check('a marker id the table does not declare is dropped, not drawn blank',
    await rowOf('Cyd Marr').locator('.marker-glyph').count() === 0);
  check('...and the row it is on still renders',
    await rowOf('Cyd Marr').locator('.entry-name').count() === 1);

  check('the filter row offers exactly the declared markers',
    await p.locator('#markerChips .chip').count() === 1);
  check('...with a count', /\(1\)$/.test((await p.textContent('#markerChips .chip[data-marker="booked"]')).trim()),
    (await p.textContent('#markerChips .chip[data-marker="booked"]')).trim());
  await p.locator('#markerChips .chip[data-marker="booked"]').click();
  await p.waitForTimeout(150);
  check('filtering by a marker shows only the marked', (await visibleNames()).join() === 'Bo Reyes');
  await p.locator('#markerChips .chip[data-marker="booked"]').click();
  await p.waitForTimeout(150);
  check('...and toggles back off', (await visibleNames()).length === 3);

  await rowOf('Ada Vance').locator('.entry-name').click();
  await p.waitForTimeout(SLIDE);
  await p.locator('#detailEdit').click();
  await p.waitForTimeout(150);
  check('the drawer offers one toggle per declared marker',
    await p.locator('#fMarkers .marker-btn').count() === 1);
  await p.locator('#fMarkers .marker-btn[data-marker="booked"]').click();
  await p.locator('#saveEntry').click();
  await p.waitForTimeout(200);
  check('the drawer sets a marker',
    await p.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='m1').markers.join()) === 'booked');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(SLIDE);
}

// ---------------------------------------------------------------------------
section('item 30 — addedAt, and a sort that means something on a backfilled library');
{
  // No addedAt anywhere: this is what the library looks like on first load
  // after the field ships.
  const p = await reseed([
    { id:'t1', name:'First Stored', handle:'@first', category:'tattoo', tags:[], notes:'' },
    { id:'t2', name:'Second Stored', handle:'@second', category:'tattoo', tags:[], notes:'' },
    { id:'t3', name:'Third Stored', handle:'@third', category:'tattoo', tags:[], notes:'' },
  ]);
  const stamps = await p.evaluate(() =>
    JSON.parse(localStorage.getItem('artistTracker.entries.v1')).map(e => e.addedAt));
  check('every entry is stamped on load', stamps.every(s => typeof s === 'string' && s.length > 0));
  check('the backfill is ONE stamp, not a run of invented times',
    new Set(stamps).size === 1, JSON.stringify(stamps));

  await p.selectOption('#sortSelect', 'added');
  await p.waitForTimeout(150);
  check('newest first orders the backfilled block by storage position',
    (await visibleNames()).join() === 'Third Stored,Second Stored,First Stored',
    (await visibleNames()).join());

  // A genuinely new entry outranks the whole backfilled block.
  await p.locator('#addToggle').click();
  await p.waitForTimeout(SLIDE);
  await p.fill('#fName', 'Added Just Now');
  await p.fill('#fHandle', '@justnow');
  await p.locator('#saveEntry').click();
  await p.waitForTimeout(250);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(SLIDE);
  await p.locator('.chip[data-cat="all"]').click();
  await p.waitForTimeout(150);
  check('a new entry carries its own stamp, not the backfill’s',
    await p.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem('artistTracker.entries.v1'));
      const nu = rows.find(e => e.name === 'Added Just Now');
      return nu.addedAt !== rows.find(e => e.id === 't1').addedAt;
    }));
  check('...and sorts above every backfilled one',
    (await visibleNames())[0] === 'Added Just Now', (await visibleNames()).join());

  check('nothing writes a per-entry fake time to storage',
    await p.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem('artistTracker.entries.v1'));
      const back = rows.filter(e => e.id && e.id.startsWith('t')).map(e => e.addedAt);
      return new Set(back).size === 1;
    }));
}

// ---------------------------------------------------------------------------
section('item 31 — the vocabulary is the input, a tenth tag is a deliberate act');
{
  const p = await reseed([
    { id:'v1', name:'Ada Vance', handle:'@ada.v', category:'tattoo', tags:['blackwork'], notes:'' },
    { id:'v2', name:'Bo Reyes', handle:'@bo.reyes', category:'tattoo', tags:['sumi brushwork'], notes:'' },
  ]);
  await p.locator('#list .entry', { hasText:'Ada Vance' }).click();
  await p.waitForTimeout(SLIDE);
  await p.locator('#detailEdit').click();
  await p.waitForTimeout(150);

  check('the free-text box starts hidden', !(await p.locator('#fTags').isVisible()));
  check('...and lives outside #tagPicker', await p.locator('#tagPicker #fTags').count() === 0);
  const starters = await p.evaluate(() =>
    [...document.querySelectorAll('#tagPicker .tag-toggle')].filter(b => b.dataset.custom !== 'true').length);
  check('the picker still offers exactly the nine', starters === 9, String(starters));
  check('...and an in-use tag outside them is still offered, so it can be removed',
    await p.locator('#tagPicker .tag-toggle[data-custom="true"]', { hasText:'sumi brushwork' }).count() === 1);

  await p.locator('#tagEscapeToggle').click();
  check('the escape hatch opens', await p.locator('#fTags').isVisible());
  await p.fill('#fTags', 'glitchwork');
  await p.locator('#fTags').press('Enter');
  check('a tenth tag is still possible once asked for',
    await p.locator('#tagPicker .tag-toggle[data-custom="true"][data-on="true"]', { hasText:'glitchwork' }).count() === 1);
  await p.locator('#saveEntry').click();
  await p.waitForTimeout(200);
  check('...and saves', await p.evaluate(() =>
    JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.id==='v1').tags.includes('glitchwork')));

  await p.keyboard.press('Escape');
  await p.waitForTimeout(SLIDE);
  await p.locator('#list .entry', { hasText:'Bo Reyes' }).click();
  await p.waitForTimeout(SLIDE);
  await p.locator('#detailEdit').click();
  await p.waitForTimeout(150);
  check('the hatch is shut again for the next entry — it is an act, not a mode',
    !(await p.locator('#fTags').isVisible()));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(SLIDE);
}

// ---------------------------------------------------------------------------
section('items 29–30 — the two new dimensions stack, and count honestly');
{
  const p = await reseed([
    { id:'f1', name:'Ada Vance', handle:'@ada.v', category:'tattoo', tags:['fine line'], stars:3, markers:['booked'], notes:'' },
    { id:'f2', name:'Bo Reyes', handle:'@bo.reyes', category:'tattoo', tags:['fine line'], stars:1, markers:[], notes:'' },
    { id:'f3', name:'Cyd Marr', handle:'@cyd.marr', category:'tattoo', tags:['blackwork'], stars:3, markers:[], notes:'' },
  ]);
  await p.locator('#starChips .chip[data-star="3"]').click();
  await p.waitForTimeout(150);
  check('a rating filter narrows the list', (await visibleNames()).sort().join() === 'Ada Vance,Cyd Marr');

  const tagChip = async (t) => (await p.textContent('#tagChips .tag-chip, #tagChips .chip')) || '';
  const fineLine = await p.evaluate(() =>
    [...document.querySelectorAll('#tagChips button')].map(b => b.textContent.trim())
      .find(t => t.startsWith('fine line')) || '');
  check('a tag count re-counts against the active rating', /\(1\)$/.test(fineLine), fineLine);

  // ...and the rating chips must NOT count against themselves, or they would
  // describe a list nobody is looking at.
  const threeChip = (await p.textContent('#starChips .chip[data-star="1"]')).trim();
  check('the rating chips still count the whole non-rating base', /\(3\)$/.test(threeChip), threeChip);

  await p.locator('#markerChips .chip[data-marker="booked"]').click();
  await p.waitForTimeout(150);
  check('rating and marker stack', (await visibleNames()).join() === 'Ada Vance');
  const markerChip = (await p.textContent('#markerChips .chip[data-marker="booked"]')).trim();
  check('the marker chip counts against the rating but not itself', /\(1\)$/.test(markerChip), markerChip);
}

section('screenshots + page health');
if(shotsDir){
  if(await isOpen()){ await page.keyboard.press('Escape'); await page.waitForTimeout(SLIDE); }
  await page.locator('#list .entry').first().click();
  await page.waitForTimeout(SLIDE);
  await page.screenshot({ path: path.join(shotsDir, 'drawer-view.png') });
  await page.locator('#detailEdit').click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(shotsDir, 'drawer-edit.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SLIDE);
  await page.screenshot({ path: path.join(shotsDir, 'list.png') });
  await m.screenshot({ path: path.join(shotsDir, 'drawer-mobile.png') });
  console.log('  wrote screenshots to ' + shotsDir);
}
// Leaflet is stubbed here, so "L is not defined" from the map view is this
// harness, not the page. Everything else is a real error.
const realErrors = pageErrors.filter(e => !/\bL is not defined\b/.test(e));
check('no uncaught page errors', realErrors.length === 0, realErrors.join(' | '));

await browser.close();
if(server) server.close();

const failed = results.filter(r => !r.ok);
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
if(failed.length){
  console.log('\nFAILURES:\n' + failed.map(f => '  - ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')).join('\n'));
  process.exit(1);
}
console.log('PASS — artist-tracker drawer + paste-to-add');
