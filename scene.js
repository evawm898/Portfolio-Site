// scene.js — the /scene shell. It hosts up to eight independent scene modules,
// one at a time, and owns everything that outlives any of them.
//
// THE SCENE CONTRACT. A scene module default-exports a FACTORY taking a host
// and returning an object; every method is optional except `frame`:
//
//   frame(dt, wallSeconds)   advance and draw. dt is CLAMPED (see MAX_DT).
//   resize(w, h)             the viewport changed, in CSS px.
//   pointer(x, y, wall)      a click or tap on the stage, in CSS px.
//   wheel(deltaY, deltaMode) a raw wheel event's numbers, for the scene to read.
//   dispose()                release anything the host does not own.
//   state()                  test chrome; the gate's only window in.
//
// and the host it is handed:
//
//   canvas2d()               a DPR-correct 2D canvas, mounted and auto-resized.
//   width, height            live CSS pixels.
//   reducedMotion, seed
//
// TWO GUARANTEES MAKE A SWAP CLEAN, AND BOTH ARE STRUCTURAL RATHER THAN RULES
// SOMEBODY HAS TO KEEP:
//
//   THERE IS ONE ANIMATION LOOP AND THE SHELL OWNS IT. A scene never calls
//   requestAnimationFrame. A scene that owned its own loop could leave it
//   running after it was torn down, and the symptom — a disposed scene still
//   drawing into a canvas the next scene now owns, or quietly burning a core
//   forever — is invisible until it is a battery complaint. Here a disposed
//   scene simply stops being called.
//
//   THERE IS ONE SET OF INPUT LISTENERS AND THE SHELL OWNS THEM. They are
//   attached once at boot against a mutable `active`, and routed. A scene never
//   adds a window listener, so it cannot leak one, and swapping scenes rebinds
//   nothing. (This is /print's own "the wiring is registered once at module
//   load against mutable module-level state" discipline, one level up.)
//
// AND A STALE LOAD IS DISCARDED. Scene modules are imported dynamically, so a
// click on 3 while 2 is still fetching would otherwise mount 2 on top of 3
// whenever the network reordered them. Every activation takes a token and the
// resolved module is dropped if the token has moved on.

import { SCENES, MAX_SCENES, isBuilt, sceneById, randomSceneId, sceneFromUrl } from './scene/registry.js';
import { seedFromUrl } from './scene/rng.js';

const MAX_DT = 1 / 20;        // a tab switch must not teleport a simulation
const MAX_DPR = 2;            // thin lines are crisp at 2x; 3x quadruples fill
const CLICK_SLOP_PX = 6;      // a pointer that travelled further was a drag
const HINT_MS = 7000;

const stage = document.getElementById('scene-stage');
const navScenes = document.getElementById('scene-nav-scenes');
const hintEl = document.getElementById('scene-hint');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let active = null;            // { id, instance, meta }
let loadToken = 0;
let raf = 0;
let last = 0;
let halted = false;
let w = 0, h = 0, dpr = 1;
const canvases = [];          // only ever the CURRENT scene's
let hintTimer = 0;
let downAt = null;
let frames = 0;               // what a leaked loop would keep advancing

// --- viewport ------------------------------------------------------------
function measure() {
  w = Math.max(1, stage.clientWidth);
  h = Math.max(1, stage.clientHeight);
  dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
}

function sizeCanvas(entry) {
  const { el, ctx } = entry;
  el.width = Math.max(1, Math.round(w * dpr));
  el.height = Math.max(1, Math.round(h * dpr));
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  // Setting .width resets the whole context state, so the transform goes on
  // afterwards. Everything a scene draws is then in CSS pixels and no scene
  // has to know what a device pixel is.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeHost(seed) {
  return {
    get width() { return w; },
    get height() { return h; },
    reducedMotion,
    seed,
    canvas2d() {
      const el = document.createElement('canvas');
      el.className = 'scene-canvas';
      stage.appendChild(el);
      const ctx = el.getContext('2d', { alpha: false });
      const entry = { el, ctx };
      canvases.push(entry);
      sizeCanvas(entry);
      return { canvas: el, ctx };
    },
  };
}

// --- the loop ------------------------------------------------------------
function tick(now) {
  raf = requestAnimationFrame(tick);
  frames++;
  if (!active || halted) return;
  const dt = last ? Math.min(MAX_DT, (now - last) / 1000) : 1 / 60;
  last = now;
  try {
    active.instance.frame(dt, now / 1000);
  } catch (err) {
    // A scene that throws every frame would throw sixty times a second and
    // bury whatever the first one said. Stop, and say so once.
    halted = true;
    console.error('[/scene] scene', active.id, 'threw while drawing; stopped.', err);
  }
}

function startLoop() { last = 0; halted = false; if (!raf) raf = requestAnimationFrame(tick); }
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }

// --- activation ----------------------------------------------------------
function teardown() {
  stopLoop();
  if (active && typeof active.instance.dispose === 'function') {
    try { active.instance.dispose(); } catch (err) { console.error('[/scene] dispose threw', err); }
  }
  active = null;
  canvases.length = 0;
  // Everything the outgoing scene put on the stage goes, whether the shell
  // handed it over or the scene mounted it itself.
  stage.replaceChildren();
}

async function activate(id, { updateUrl = true } = {}) {
  const slot = sceneById(id);
  if (!slot || !isBuilt(slot)) return false;

  // THE TOKEN IS TAKEN BEFORE THE EARLY RETURN, AND THAT ORDER IS THE POINT.
  // Asking for the scene that is already showing is a no-op for the stage —
  // but it must still CANCEL anything in flight, or the sequence "click 2,
  // change your mind, click 1" leaves 2's import running against a live token
  // and 2 arrives a second later over the scene you went back to.
  const token = ++loadToken;
  if (active && active.id === id) return true;
  let mod;
  try {
    mod = await slot.load();
  } catch (err) {
    console.error('[/scene] scene', id, 'failed to load', err);
    return false;
  }
  if (token !== loadToken) return false;   // the stale-load guard
  if (typeof mod.default !== 'function') {
    console.error('[/scene] scene', id, 'has no default export factory');
    return false;
  }

  teardown();
  measure();
  const host = makeHost(seedFromUrl(window.location.search));
  let instance;
  try {
    instance = mod.default(host);
  } catch (err) {
    // The stage is already empty at this point, so the alternative to catching
    // is a blank page and a rejection escaping an async call nobody awaits.
    console.error('[/scene] scene', id, 'threw while being built', err);
    stage.replaceChildren();
    paintNav();
    return false;
  }
  active = { id, instance, meta: mod.meta || {} };
  if (typeof instance.resize === 'function') instance.resize(w, h);

  paintNav();
  const title = active.meta.title || `Scene ${id}`;
  document.title = `${title} — Scene — Eva Maskalenko`;
  stage.setAttribute('aria-label', title);
  if (updateUrl) writeUrl(id);
  showHint(active.meta.blurb);
  startLoop();
  return true;
}

function writeUrl(id) {
  const params = new URLSearchParams(window.location.search);
  params.set('scene', String(id));
  history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

// --- nav -----------------------------------------------------------------
let randomBtn = null;

function buildNav() {
  for (const slot of SCENES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scene-nav__btn';
    b.dataset.scene = String(slot.id);
    b.textContent = String(slot.id);
    if (isBuilt(slot)) {
      b.title = slot.title;
      b.setAttribute('aria-label', `Scene ${slot.id} — ${slot.title}`);
      b.addEventListener('click', () => activate(slot.id));
    } else {
      b.disabled = true;
      b.title = `Scene ${slot.id} — not built yet`;
      b.setAttribute('aria-label', `Scene ${slot.id} — not built yet`);
    }
    navScenes.appendChild(b);
  }

  randomBtn = document.createElement('button');
  randomBtn.type = 'button';
  randomBtn.className = 'scene-nav__btn scene-nav__btn--random';
  randomBtn.textContent = '?';
  randomBtn.dataset.scene = 'random';
  randomBtn.addEventListener('click', goRandom);
  navScenes.appendChild(randomBtn);
  paintNav();
}

function paintNav() {
  for (const b of navScenes.querySelectorAll('[data-scene]')) {
    const isCurrent = active && b.dataset.scene === String(active.id);
    b.classList.toggle('is-active', !!isCurrent);
    if (isCurrent) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  }
  // The "?" excludes what is showing, so with one scene built it has nowhere
  // to go. Disabled says that; a button that did nothing would look broken.
  const choices = active ? SCENES.filter(isBuilt).filter(s => s.id !== active.id).length : 0;
  randomBtn.disabled = choices === 0;
  randomBtn.title = choices === 0
    ? 'Random scene — needs a second scene to choose from'
    : 'Random scene (excluding this one)';
}

function goRandom() {
  const id = randomSceneId(active ? active.id : null);
  if (id != null) activate(id);
}

// --- the one-off hint ----------------------------------------------------
// A JUDGEMENT CALL, FLAGGED. The brief says no chrome besides the nav, and
// this is a line of text that fades out and never returns — but it is still
// something on screen that the brief did not ask for. It is here because the
// two interactions (click the water, scroll for wind) are otherwise
// undiscoverable, and an interactive piece nobody discovers is an ambient one.
// Deleting it is one call to showHint() and one element.
function showHint(text) {
  if (!hintEl) return;
  clearTimeout(hintTimer);
  if (!text) { hintEl.hidden = true; return; }
  hintEl.textContent = text;
  hintEl.hidden = false;
  hintEl.classList.remove('is-gone');
  hintTimer = setTimeout(dismissHint, HINT_MS);
}

function dismissHint() {
  if (!hintEl || hintEl.hidden) return;
  clearTimeout(hintTimer);
  hintEl.classList.add('is-gone');
}

// --- input, owned here and routed --------------------------------------
function route(method, ...args) {
  if (!active || halted) return;
  const fn = active.instance[method];
  if (typeof fn !== 'function') return;
  try { fn.call(active.instance, ...args); }
  catch (err) { console.error('[/scene]', method, 'threw', err); }
}

function bindInput() {
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    downAt = { x: e.clientX, y: e.clientY };
  });

  stage.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    // A pointer that travelled was a drag (which is how wind is given on a
    // touch screen), not a tap on the water.
    if (moved > CLICK_SLOP_PX) return;
    const r = stage.getBoundingClientRect();
    dismissHint();
    route('pointer', e.clientX - r.left, e.clientY - r.top, performance.now() / 1000);
  });

  stage.addEventListener('pointercancel', () => { downAt = null; });

  // THE PAGE IS A TAKEOVER, SO THE WHEEL IS OURS. There is nothing to scroll,
  // so preventDefault costs nothing and stops a trackpad from rubber-banding
  // the document or triggering a browser back-swipe over the scene.
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    dismissHint();
    route('wheel', e.deltaY, e.deltaMode);
  }, { passive: false });

  // Touch drag is the same input by another name: there is no wheel on a
  // phone, and a vertical drag is the gesture that means "scroll".
  let touchY = null;
  stage.addEventListener('touchstart', (e) => {
    touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
  }, { passive: true });
  stage.addEventListener('touchmove', (e) => {
    if (touchY == null || e.touches.length !== 1) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    // Dragging the finger UP is content moving down, which is a positive
    // wheel delta — the same sign a wheel gives for the same intent.
    route('wheel', touchY - y, 0);
    if (Math.abs(touchY - y) > 2) dismissHint();
    touchY = y;
  }, { passive: false });
  stage.addEventListener('touchend', () => { touchY = null; }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key >= '1' && e.key <= String(MAX_SCENES)) { activate(Number(e.key)); return; }
    if (e.key === '?' || e.key === 'r' || e.key === 'R') { goRandom(); }
  });

  window.addEventListener('resize', () => {
    measure();
    for (const entry of canvases) sizeCanvas(entry);
    route('resize', w, h);
  });

  document.addEventListener('visibilitychange', () => {
    // Coming back from a hidden tab, the first timestamp is arbitrarily far
    // from the last one. MAX_DT already bounds it; clearing `last` means the
    // first frame back is a clean 1/60 rather than a clamped lurch.
    if (!document.hidden) last = 0;
  });
}

// --- test chrome ---------------------------------------------------------
// The page has no panel by design, so this is how tools/verify-scene.mjs asks
// what is true. It reports; it never decides anything.
window.__scene = {
  get frames() { return frames; },
  get activeId() { return active ? active.id : null; },
  get running() { return raf !== 0 && !halted; },
  get halted() { return halted; },
  get canvasCount() { return canvases.length; },
  get stageChildren() { return stage.children.length; },
  get viewport() { return { w, h, dpr }; },
  get reducedMotion() { return reducedMotion; },
  slots: () => SCENES.map(s => ({ id: s.id, title: s.title, built: isBuilt(s) })),
  sceneState: () => (active && typeof active.instance.state === 'function')
    ? active.instance.state() : null,
  activate: (id) => activate(id),
};

// --- boot ----------------------------------------------------------------
measure();
buildNav();
bindInput();
const first = sceneFromUrl(window.location.search);
if (first != null) activate(first);
else console.warn('[/scene] no scene is built yet');
