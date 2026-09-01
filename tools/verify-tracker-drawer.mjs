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
    location:'Los Angeles, CA', date:'2026-10-03', status:'Guest spot NYC Oct 3-10',
    link:'janedoe.example.com', photo:'', tags:['fine line','botanical'] },
  { id:'a2', name:'Sam Reed', handle:'samreed', pronouns:'they/them', category:'touring',
    location:'Berlin', date:'', status:'New EP in spring', link:'', photo:'', tags:['ambient'] },
  { id:'a3', name:'Mira Okonkwo', handle:'@mira.ok', pronouns:'', category:'following',
    location:'Lisbon', date:'', status:'', link:'', photo:'', tags:[] },
];

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
});
const ctx = await browser.newContext({ viewport:{ width:1280, height:900 } });
await ctx.addInitScript(([store, seed]) => {
  sessionStorage.setItem('artistTracker.unlocked', '1');
  localStorage.setItem(store, JSON.stringify(seed));
}, [STORE, SEED]);

async function stub(target){
  await target.route('**://unavatar.io/**', r => r.abort());
  await target.route('**://fonts.googleapis.com/**', r => r.abort());
  await target.route('**://fonts.gstatic.com/**', r => r.abort());
  // Leaflet is only reachable from the deploy preview, not from here.
  await target.route('**://unpkg.com/**', r => r.fulfill({ status:200, body:'window.L=window.L||{};', contentType:'text/javascript' }));
}

const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await stub(page);
await page.goto(URL_, { waitUntil:'domcontentloaded' });
await page.waitForSelector('.entry');

const drawer = page.locator('#drawer');
const isOpen = async () => (await drawer.getAttribute('data-open')) === 'true';
const SLIDE = 400; // longer than the 280ms transition

section('item 7 — the slide-in detail panel');
check('gate bypassed, list rendered', await page.locator('.entry').count() === SEED.length);
check('row carries no anchor any more', await page.locator('.entry a').count() === 0);
check('handle still renders', (await page.locator('.entry').first().innerText()).includes('@janedoe'));

check('drawer starts closed', !(await isOpen()));

// click anywhere on the row (the name, not a control)
await page.locator('.entry', { hasText:'Jane Doe' }).click();
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

check('list still in place behind the drawer', await page.locator('.entry').first().isVisible());
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
await page.locator('.entry', { hasText:'Sam Reed' }).click();
await page.waitForTimeout(SLIDE);
check('second row opens the drawer', await isOpen());
await page.locator('#drawerBackdrop').click({ position:{ x:100, y:400 } });
await page.waitForTimeout(SLIDE);
check('backdrop click closes the drawer', !(await isOpen()));

section('closing: the x button');
await page.locator('.entry', { hasText:'Jane Doe' }).click();
await page.waitForTimeout(SLIDE);
await page.locator('#drawerClose').click();
await page.waitForTimeout(SLIDE);
check('close button closes the drawer', !(await isOpen()));

section('scroll position is not lost');
await page.evaluate(() => window.scrollTo(0, 300));
const beforeScroll = await page.evaluate(() => window.scrollY);
await page.locator('.entry', { hasText:'Jane Doe' }).click();
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
check('tags prefilled', await page.inputValue('#fTags') === 'fine line, botanical');
check('save button says update', (await page.locator('#saveEntry').innerText()).trim().toLowerCase() === 'update entry');

await page.fill('#fLocation', 'Portland, OR');
await page.locator('#saveEntry').click();
await page.waitForTimeout(200);
check('save returns to view mode', await page.locator('#drawerView').isVisible());
check('view shows the edit', (await drawer.innerText()).includes('Portland, OR'));
check('list shows the edit', (await page.locator('.entry', { hasText:'Jane Doe' }).innerText()).includes('Portland, OR'));
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
check('list row shows the photo', (await page.locator('.entry', { hasText:'Jane Doe' }).locator('img.entry-photo').getAttribute('src')) === storedPhoto);

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

await page.locator('.entry', { hasText:'Sam Reed' }).click();
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
check('new entry added', await page.locator('.entry').count() === SEED.length + 1);
check('new entry shown in the drawer', (await page.locator('#drawerView').innerText()).includes('New Person'));

page.once('dialog', d => d.accept());
await page.locator('#detailRemove').click();
await page.waitForTimeout(SLIDE);
check('remove deletes and closes', await page.locator('.entry').count() === SEED.length && !(await isOpen()));

section('quota');
await page.locator('.entry', { hasText:'Sam Reed' }).click();
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
await page.waitForSelector('.entry');

section('bulk paste, filters and map (regression)');
check('bulk panel starts closed', !(await page.locator('#panel').isVisible()));
await page.locator('#bulkToggle').click();
check('bulk toggle opens the panel', await page.locator('#panel').isVisible());
check('bulk textarea present', await page.locator('#bulkText').isVisible());
let msg = '';
page.once('dialog', async d => { msg = d.message(); await d.accept(); });
await page.fill('#bulkText', 'Jane Doe | @janedoe | tattoo | | she/her | | | \nNoor Haddad | @noorh | Influencer | Cairo | she/her | | | ');
await page.locator('#saveBulk').click();
await page.waitForTimeout(300);
check('merge summary reported', /1 updated, 1 added, 0 unchanged|0 updated, 1 added, 1 unchanged/.test(msg), JSON.stringify(msg));
check('no duplicate for the existing handle', await page.locator('.entry').count() === SEED.length + 1);
check('non-standard category kept as a tag',
  await page.evaluate(() => JSON.parse(localStorage.getItem('artistTracker.entries.v1')).find(e=>e.handle==='@noorh').tags.includes('influencer')));
check('bulk panel closed after save', !(await page.locator('#panel').isVisible()));

section('filters / search / sort untouched');
await page.locator('.chip[data-cat="tattoo"]').click();
check('category filter still filters', await page.locator('.entry').count() === 1);
await page.locator('.chip[data-cat="all"]').click();
await page.locator('.chip[data-gender="they/them"]').click();
check('gender filter still filters', await page.locator('.entry').count() === 1);
await page.locator('.chip[data-gender="all"]').click();
await page.locator('.tag-chip[data-tag="ambient"]').click();
check('tag filter still filters', await page.locator('.entry').count() === 1);
await page.locator('.tag-chip[data-tag="ambient"]').click();
await page.fill('#searchInput', 'lisbon');
await page.waitForTimeout(100);
check('search still filters', await page.locator('.entry').count() === 1);
await page.fill('#searchInput', '');
await page.selectOption('#locationSelect', 'Berlin');
check('location filter still filters', await page.locator('.entry').count() === 1);
await page.selectOption('#locationSelect', 'all');

section('map view still toggles');
await page.locator('.view-tab[data-view="map"]').click();
await page.waitForTimeout(300);
check('map view toggles on', await page.locator('#mapContainer').isVisible());
await page.locator('.view-tab[data-view="list"]').click();
check('list view toggles back', await page.locator('#list').isVisible());

section('export includes the embedded image');
await page.locator('.entry', { hasText:'Jane Doe' }).click();
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

section('mobile');
const m = await ctx.newPage();
await stub(m);
await m.setViewportSize({ width:390, height:780 });
await m.goto(URL_, { waitUntil:'domcontentloaded' });
await m.waitForSelector('.entry');
await m.locator('.entry').first().click();
await m.waitForTimeout(SLIDE);
const mbox = await m.locator('#drawer').boundingBox();
check('drawer is full-width on mobile', Math.abs(mbox.width - 390) < 2, mbox.width + 'px');
check('no horizontal overflow on mobile',
  await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));


section('screenshots + page health');
if(shotsDir){
  if(await isOpen()){ await page.keyboard.press('Escape'); await page.waitForTimeout(SLIDE); }
  await page.locator('.entry').first().click();
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
