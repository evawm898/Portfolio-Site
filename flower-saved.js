/* Saved Flower Designs gallery.
 *
 * Lists every shared save from the Netlify Function and shows each as a LIVE,
 * rotating 3D preview. The generator is a single monolithic page tightly coupled
 * to its own DOM/scene, so rather than refactor a reusable geometry core (a large,
 * print-safety-sensitive change), each preview embeds the real generator as a
 * `flower.html?preview=1` iframe — guaranteeing the preview is the exact generator
 * output, auto-rotating, with zero duplication.
 *
 * Efficiency (many live WebGL contexts are expensive, and browsers cap them ~16):
 *   - IntersectionObserver: a preview only goes live when its card scrolls into view.
 *   - Hard cap of MAX_LIVE simultaneous live previews; extras stay a static placeholder.
 *   - Cards scrolled out of view are unloaded (iframe removed → context freed), and the
 *     freed slot is handed to the next visible card.
 *   - Preview iframes render at lower detail + pixelRatio 1 (see PREVIEW in flower.js).
 */
const ENDPOINT = '/.netlify/functions/designs';
const MAX_LIVE = 6;                 // simultaneous live previews cap

const gallery = document.getElementById('gallery');
const statusEl = document.getElementById('svStatus');

const cards = [];                   // in DOM order
const visible = new Set();          // cards currently intersecting the viewport
const live = new Set();             // cards with a live preview iframe
const pendingParams = new Map();    // iframe -> params, awaiting its ready handshake

function myIds() {
  try { return new Set(JSON.parse(localStorage.getItem('flowerMyDesigns') || '[]')); }
  catch { return new Set(); }
}
function forgetMyId(id) {
  try {
    const ids = JSON.parse(localStorage.getItem('flowerMyDesigns') || '[]').filter((x) => x !== id);
    localStorage.setItem('flowerMyDesigns', JSON.stringify(ids));
  } catch { /* ignore */ }
}
function ownerToken() {
  try { return localStorage.getItem('flowerOwnerToken') || ''; } catch { return ''; }
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
}
const placeholderHTML = '<div class="sv-card__ph" aria-hidden="true">&#9672;</div>';

// ---- live-preview scheduling ----
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) visible.add(e.target);
    else visible.delete(e.target);
  }
  reconcile();
}, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

function reconcile() {
  // free contexts for cards that scrolled away
  for (const card of [...live]) if (!visible.has(card)) unload(card);
  // fill open slots with visible, not-yet-live cards, in document order
  for (const card of cards) {
    if (live.size >= MAX_LIVE) break;
    if (visible.has(card) && !live.has(card)) goLive(card);
  }
}

function goLive(card) {
  const box = card.querySelector('[data-preview]');
  if (!box) return;
  const iframe = document.createElement('iframe');
  iframe.className = 'sv-frame';
  iframe.setAttribute('title', 'Live preview of ' + card.__name);
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('tabindex', '-1');
  pendingParams.set(iframe, card.__params);
  box.innerHTML = '';
  box.appendChild(iframe);
  iframe.src = 'flower.html?preview=1';
  live.add(card);
}

function unload(card) {
  const box = card.querySelector('[data-preview]');
  if (box) {
    const iframe = box.querySelector('iframe');
    if (iframe) pendingParams.delete(iframe);
    box.innerHTML = placeholderHTML;
  }
  live.delete(card);
}

// When a preview iframe signals it is ready, hand it the design params to render.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  if (!e.data || e.data.type !== 'flowerPreviewReady') return;
  for (const [iframe, params] of pendingParams) {
    if (iframe.contentWindow === e.source) {
      iframe.contentWindow.postMessage({ type: 'flowerLoad', params }, location.origin);
      pendingParams.delete(iframe);
      break;
    }
  }
});

// ---- card construction ----
function makeCard(design, mine) {
  const card = document.createElement('article');
  card.className = 'sv-card';
  card.dataset.id = design.id;
  card.__params = design.params;
  card.__name = design.name;

  const preview = document.createElement('div');
  preview.className = 'sv-card__preview';
  preview.setAttribute('data-preview', '');
  preview.innerHTML = placeholderHTML;

  const meta = document.createElement('div');
  meta.className = 'sv-card__meta';

  const name = document.createElement('h3');
  name.className = 'sv-card__name';
  name.textContent = design.name;            // textContent — never inject user text as HTML

  const date = document.createElement('div');
  date.className = 'sv-card__date';
  date.textContent = fmtDate(design.ts);

  const actions = document.createElement('div');
  actions.className = 'sv-card__actions';

  const openBtn = document.createElement('button');
  openBtn.className = 'fl-btn';
  openBtn.type = 'button';
  openBtn.textContent = 'Open';
  openBtn.addEventListener('click', () => { location.href = 'flower.html?load=' + encodeURIComponent(design.id); });
  actions.appendChild(openBtn);

  if (mine) {
    const delBtn = document.createElement('button');
    delBtn.className = 'fl-btn sv-del';
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteDesign(card, delBtn));
    actions.appendChild(delBtn);
  }

  meta.append(name, date, actions);
  card.append(preview, meta);
  return card;
}

async function deleteDesign(card, btn) {
  if (!window.confirm('Delete this saved design from the shared gallery?')) return;
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Deleting…';
  try {
    const res = await fetch(ENDPOINT + '?id=' + encodeURIComponent(card.dataset.id), {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken() },
    });
    if (!res.ok) throw new Error('delete failed');
    unload(card);
    io.unobserve(card);
    const idx = cards.indexOf(card);
    if (idx >= 0) cards.splice(idx, 1);
    visible.delete(card);
    forgetMyId(card.dataset.id);
    card.remove();
    reconcile();
    if (!cards.length) statusEl.textContent = 'No saved designs yet. Save one from the generator.';
    statusEl.hidden = !!cards.length;
  } catch {
    btn.disabled = false;
    btn.textContent = prev;
    window.alert('Could not delete this design.');
  }
}

// ---- load ----
async function load() {
  let designs = [];
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    designs = Array.isArray(data.designs) ? data.designs : [];
  } catch {
    statusEl.textContent = 'Could not load saved designs. The gallery service may be unavailable.';
    return;
  }
  designs.sort((a, b) => (b.ts || 0) - (a.ts || 0));   // newest first
  if (!designs.length) {
    statusEl.textContent = 'No saved designs yet. Save one from the generator.';
    return;
  }
  statusEl.hidden = true;
  const mine = myIds();
  for (const d of designs) {
    if (!d || !d.id || !d.params) continue;
    const card = makeCard(d, mine.has(d.id));
    cards.push(card);
    gallery.appendChild(card);
    io.observe(card);
  }
}

load();
