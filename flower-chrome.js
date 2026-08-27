/* ===================================================================
   flower-chrome.js — the frame around the flower.

   PANEL CHROME ONLY. Zero geometry: nothing here reads, writes or derives a flower
   parameter, and it imports nothing from flower.js, flower-geometry.js or flower-sdf.js.
   It is a separate module rather than another section of flower.js precisely so that
   stays true and stays checkable — flower.js is 4,600 lines of geometry and control
   wiring, and chrome has no business in it.

   What lives here:
     - the section tick rail, in place of the browser scrollbar (P2)
     - collapsing the panel to nothing, persisted between loads (P4)
     - dragging the VIEW box, session-only (P6)

   The scrollbar itself (P1) and the panel's flush-right full-height box (P3) are pure
   CSS; see flower.css.

   HOW IT STAYS OUT OF flower.js: the rail has to follow applyVisibility(), which can hide
   a whole accordion section in Standard when none of its controls apply. Rather than have
   flower.js call in, a MutationObserver watches the sections' own `hidden` and `class`
   attributes. That reacts to the DOM state whoever changed it — the visibility pass, the
   accordion's click handler, a preset load — instead of to one caller remembering to
   announce it.
   =================================================================== */
import { SECTIONS } from './flower-registry.js';

const rail = document.getElementById('sectionRail');
const scroller = document.getElementById('panelScroll');
const panelToggle = document.getElementById('panelToggle');
const viewPanel = document.getElementById('viewPanel');

/* ---- SECTION TICK RAIL (P2) ----------------------------------------------------------
   One tick per panel section, down the right edge, doing the two jobs the browser
   scrollbar did badly: say where you are, and let you jump somewhere else.

   The ticks are DERIVED from SECTIONS in flower-registry.js — the one place a section is
   declared — and re-derived whenever a section's state changes. Never a hand-written array
   here: a hand-written copy would drift the first time a section is added, which is the
   class of bug the registry exists to prevent. */
function sectionEl(id) {
  return document.getElementById(id)?.closest('.fl-acc[data-acc]') || null;
}

function liveSections() {
  // Sections that exist in the markup AND are showing. applyVisibility() in flower.js
  // hides a whole section in Standard when none of its controls apply, and a tick that
  // jumped to an empty box would be worse than no tick.
  return SECTIONS.map((s) => ({ ...s, el: sectionEl(s.id) })).filter((s) => s.el && !s.el.hidden);
}

function refreshSectionRail() {
  if (!rail || !scroller) return;
  const live = liveSections();

  // Rebuild only when the SET changed — rebuilding on every pass would drop keyboard focus
  // and restart the transitions mid-hover.
  const signature = live.map((s) => s.id).join('|');
  if (rail.dataset.sig !== signature) {
    rail.dataset.sig = signature;
    rail.replaceChildren(...live.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fl-rail__tick';
      b.dataset.sec = s.id;
      b.title = `Jump to ${s.label}`;
      const mark = document.createElement('span');
      mark.className = 'fl-rail__mark';
      mark.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'fl-rail__name';
      name.textContent = s.label;
      b.append(mark, name);
      return b;
    }));
  }

  // Which section are we in? An open accordion answers it outright; with everything closed
  // the scroll position answers it instead. Skipped while the panel is collapsed — every
  // offset would read zero, and the rail is hidden anyway.
  let currentId = null;
  if (!document.documentElement.classList.contains('fl-collapsed')) {
    const open = live.find((s) => s.el.classList.contains('is-open'));
    if (open) {
      currentId = open.id;
    } else if (live.length) {
      const mark = scroller.scrollTop + scroller.clientHeight * 0.4;
      currentId = live[0].id;
      for (const s of live) if (s.el.offsetTop <= mark) currentId = s.id;
    }
  }
  for (const tick of rail.children) {
    const on = tick.dataset.sec === currentId;
    tick.classList.toggle('is-current', on);
    tick.setAttribute('aria-current', on ? 'true' : 'false');
  }
}

// Click a tick to jump: open that section if it is closed — never toggle it shut. The
// accordion head toggles; the rail navigates.
rail?.addEventListener('click', (e) => {
  const tick = e.target.closest('.fl-rail__tick');
  if (!tick) return;
  const section = sectionEl(tick.dataset.sec);
  if (!section) return;
  if (!section.classList.contains('is-open')) section.querySelector('.fl-acc__head')?.click();
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  refreshSectionRail();
});

scroller?.addEventListener('scroll', refreshSectionRail, { passive: true });

// A section opening, closing, or being hidden by the visibility pass all move "where you
// are". Watching the attributes rather than being called keeps flower.js untouched.
if (rail && scroller) {
  const obs = new MutationObserver(() => refreshSectionRail());
  for (const s of SECTIONS) {
    const el = sectionEl(s.id);
    if (el) obs.observe(el, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }
  refreshSectionRail();
}

/* ---- COLLAPSE (P4) -------------------------------------------------------------------
   Collapsed hides the panel and the rail outright (display:none, in flower.css) — no stub,
   nothing tabbable, only the arrows left to say a menu is there. The state persists,
   because collapsing is a stated intent and a returning visitor meant it; the pre-paint
   script in flower.html restores it before the first frame, and this keeps the button's
   label and ARIA in step from there.

   display:none is safe here because nothing in this codebase reads a control's rendered
   geometry — there is no getBoundingClientRect / offset* / client* call against any panel
   element in flower.js — so a zero-size layout breaks nothing. The one place that WOULD
   read zeros is this file's own scroll maths, and refreshSectionRail() skips it while
   collapsed rather than reading them.

   The VIEW box (P5) is deliberately NOT in the collapse rule: separate element, separate
   rules, so the flower can still be re-framed with the panel gone. */
const COLLAPSED_KEY = 'flowerPanelCollapsed';

function syncPanelToggle() {
  if (!panelToggle) return;
  const collapsed = document.documentElement.classList.contains('fl-collapsed');
  panelToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  const label = collapsed ? 'Expand the controls panel' : 'Collapse the controls panel';
  panelToggle.title = label;
  const sr = panelToggle.querySelector('.fl-sr');
  if (sr) sr.textContent = label;
}

panelToggle?.addEventListener('click', () => {
  const collapsed = document.documentElement.classList.toggle('fl-collapsed');
  try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  syncPanelToggle();
  refreshSectionRail();
});
syncPanelToggle();

/* ---- DRAGGABLE VIEW BOX (P6) ---------------------------------------------------------
   Session-only BY CONSTRUCTION: the position goes to inline style and nothing else ever
   reads or writes it — not localStorage, not readUI(), not the design payload — so every
   load starts from the CSS position. A box dragged half off-screen never follows anyone
   around. It is also clamped to the window during the drag, so it cannot be put half off
   in the first place.

   It does not fight the canvas. OrbitControls is bound to the canvas element
   (`new OrbitControls(camera, canvas)` in flower.js) and only attaches its move/up
   handlers to the document after a pointerdown ON the canvas; a pointerdown on this aside
   never reaches it. stopPropagation + setPointerCapture make that explicit rather than
   incidental, and preventDefault kills the browser's own text-drag on the labels.

   The controls opt out: a pointerdown on the select, the checkbox or their labels belongs
   to that control, not to a drag. */
if (viewPanel) {
  const MARGIN = 8;                 // never let the box cross the window edge
  let drag = null;

  viewPanel.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, select, button, label, option, a')) return;
    const r = viewPanel.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height };
    // Pin to the current pixel box first, so the first move does not jump when the CSS
    // top/left are in rem.
    viewPanel.style.left = `${r.left}px`;
    viewPanel.style.top = `${r.top}px`;
    viewPanel.style.right = 'auto';
    viewPanel.classList.add('is-dragging');
    viewPanel.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });

  viewPanel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const maxX = Math.max(MARGIN, window.innerWidth - drag.w - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - drag.h - MARGIN);
    viewPanel.style.left = `${Math.min(Math.max(e.clientX - drag.dx, MARGIN), maxX)}px`;
    viewPanel.style.top = `${Math.min(Math.max(e.clientY - drag.dy, MARGIN), maxY)}px`;
    e.stopPropagation();
  });

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    viewPanel.classList.remove('is-dragging');
    try { viewPanel.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  viewPanel.addEventListener('pointerup', endDrag);
  viewPanel.addEventListener('pointercancel', endDrag);
}
