// smart-textiles.js — entry point for /smart-textiles.html (Field Notes No. 09). Gathers every scene from
// the part modules and hands them to the player in smart-textiles-core.js. window.__st exposes the players
// for tools/smart-textiles/verify-page.mjs.
import { mount, MIN_TEXT_PX } from './smart-textiles-core.js';
import { YARN_SCENES } from './smart-textiles-yarns.js';
import { FABRIC_SCENES } from './smart-textiles-fabric.js';
import { SENSE_SCENES } from './smart-textiles-sense.js';
import { ACT_SCENES, POWER_SCENES } from './smart-textiles-act.js';
import { TIER_SCENES, CONNECT_SCENES } from './smart-textiles-connect.js';

export const SCENES = { ...TIER_SCENES, ...YARN_SCENES, ...FABRIC_SCENES, ...SENSE_SCENES, ...ACT_SCENES, ...POWER_SCENES, ...CONNECT_SCENES };
window.__st = mount(SCENES, document.getElementById('smart'));

// Enlarge. The diagrams scale to fit the column, so on a phone their labels can render well under 10 px
// (the tiers and the conductivity ladder at about 3). A diagram whose smallest label is under MIN_TEXT_PX
// at the width it is shown gets an Enlarge button: it opens the same live drawing in a dialog, drawn at the
// size that puts its smallest label at MIN_TEXT_PX, which pans where it is wider than the screen.
const zoom = document.createElement('dialog');
zoom.className = 'st-zoom';
zoom.setAttribute('aria-label', 'Enlarged diagram');
zoom.innerHTML = '<div class="st-zoom__bar"><span class="st-zoom__title"></span><button type="button" class="st-btn" data-zoom-close>Close</button></div><div class="st-zoom__body"></div>';
document.body.append(zoom);
let zoomed = null;
const figName = p => (p.host.querySelector('.label') || p.host.querySelector('figcaption') || p.host.closest('figure')?.querySelector('figcaption'))?.textContent.trim().split(/\n/)[0].slice(0, 70) || 'Diagram';
const minUnits = p => Math.min(...[...p.svg.querySelectorAll('text')].map(t => +t.getAttribute('font-size') || Infinity));
const minPx = p => { const m = p.svg.getScreenCTM(); return m ? minUnits(p) * m.a : Infinity; };
function closeZoom() { if (!zoomed) return; zoomed.mirror = null; const b = zoomed.zoomBtn; zoomed = null; zoom.querySelector('.st-zoom__body').innerHTML = ''; if (zoom.open) zoom.close(); b?.focus({ preventScroll: true }); }
function openZoom(p) {
  closeZoom();
  const [, , vw] = p.scene.vb.split(/\s+/).map(Number), k = MIN_TEXT_PX * 1.02 / minUnits(p);
  const body = zoom.querySelector('.st-zoom__body'), big = p.svg.cloneNode(true);
  big.removeAttribute('class'); big.style.width = `${Math.ceil(vw * k)}px`; big.style.height = 'auto';
  body.append(big); body.scrollLeft = 0;
  zoom.querySelector('.st-zoom__title').textContent = figName(p);
  zoomed = p; p.mirror = big; zoom.showModal();
}
zoom.addEventListener('close', closeZoom);
zoom.querySelector('[data-zoom-close]').addEventListener('click', closeZoom);
for (const p of window.__st) {
  const holder = p.host.querySelector('.st-anim') || p.host;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'st-btn st-zoom-btn'; btn.dataset.zoomFor = p.name; btn.hidden = true;
  btn.innerHTML = 'Enlarge <span aria-hidden="true">&#x2922;</span>';
  btn.setAttribute('aria-label', `Enlarge: ${figName(p)}`);
  btn.addEventListener('click', () => openZoom(p));
  holder.after(btn); p.zoomBtn = btn;
  const fit = () => { btn.hidden = !(minPx(p) < MIN_TEXT_PX); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(holder); else fit();
}
