/* marble-render.js — the two VIEWS of a marble document, as pixels.

   BATH   the working view: dark glossy water, the live bath's ink floating on
          it in its diluted colour at its own opacity, rims a little darker.
          No material, no flaws — nothing here has been printed yet.
   PAPER  the "lay paper" view: the paper colour; each layer (printed pulls
          first, the live bath last) rendered to its own canvas — regions,
          granulation specks, the transfer flaws (voids and skips erased, one
          uneven edge erased, a faint touch-down line darkened within the ink),
          mottle multiplied inside the ink only — and composited with MULTIPLY;
          then the paper's own texture multiplied over the whole sheet.

   Everything a layer costs is cached on the layer canvas keyed by the state's
   digest, the size, the material and its index, so a printed layer is drawn
   once and the live bath is the only thing re-rendered on each change. The
   geometry is marble-math.js's; the material records are marble-material.js's;
   this file turns both into pixels and decides nothing about either. */

import * as M from './marble-math.js';
import * as T from './marble-material.js';

const W = M.SHEET.w, H = M.SHEET.h;
export const WATER = Object.freeze({ deep: '#0b161c', mid: '#122a33', gloss: 'rgba(255,255,255,0.10)' });

const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const bytesToCanvas = (bytes, w, h) => { const c = makeCanvas(w, h); c.getContext('2d').putImageData(new ImageData(bytes, w, h), 0, 0); return c; };

/* ---------- bath ---------- */
export function drawWater(ctx, scale) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, WATER.mid); g.addColorStop(0.55, WATER.deep); g.addColorStop(1, '#0e1f27');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // one soft gloss across the surface, under the ink
  const r = ctx.createRadialGradient(W * 0.3, H * 0.18, 0, W * 0.3, H * 0.18, W * 0.9);
  r.addColorStop(0, WATER.gloss); r.addColorStop(0.5, 'rgba(255,255,255,0.03)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
export function renderBath(ctx, state, scale) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  drawWater(ctx, scale);
  M.paintRegions(ctx, state.regions, scale, { rim: true, hairline: false });
  ctx.restore();
}

/* ---------- one printed layer ---------- */
export function renderLayerInk(canvas, state, scale, material, layerIndex) {
  const ctx = canvas.getContext('2d');
  const paper = T.paperOf(material.paper);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const seed = (material.seed + 1) * 131 + layerIndex;
  M.paintRegions(ctx, state.regions, scale, { rim: true, hairline: true, seed });
  // granulation: pigment specks inside each granulating region
  state.regions.forEach((rg, i) => {
    if (!(rg.gran > 0)) return;
    const area = M.polygonArea(rg.pts);
    const specks = T.granulationSpecks(seed, i, rg.gran, rg.pts, area);
    if (!specks.length) return;
    ctx.save(); M.tracePath(ctx, rg.pts); ctx.clip();
    ctx.fillStyle = M.darken(M.inkColour(rg), 0.55); ctx.globalAlpha = (0.25 + 0.35 * rg.gran) * (rg.opa ?? 1);
    ctx.beginPath();
    for (const [x, y, r] of specks) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    ctx.fill(); ctx.restore();
  });
  // transfer flaws: erased where the paper did not take the ink
  const plan = T.flawPlan(material.seed, material.flaws, layerIndex);
  if (plan.voids.length || plan.skips.length) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const v of [...plan.voids, ...plan.skips]) { ctx.moveTo(v.x + v.rx * Math.cos(v.rot), v.y + v.rx * Math.sin(v.rot)); ctx.ellipse(v.x, v.y, v.rx, v.ry, v.rot, 0, Math.PI * 2); }
    ctx.fill(); ctx.restore();
  }
  if (plan.edge) {
    const { side, pts } = plan.edge;
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    ctx.beginPath();
    // the band between the sheet's edge and a wavy curve `depth` inside it
    const pt = (a, d) => side === 0 ? [a, d] : side === 2 ? [a, H - d] : side === 3 ? [d, a] : [W - d, a];
    pts.forEach(([a, d], i) => { const [x, y] = pt(a, d); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    const last = pts[pts.length - 1], first = pts[0];
    ctx.lineTo(...pt(last[0], -50)); ctx.lineTo(...pt(first[0], -50));   // out past the sheet's own edge
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // mottle, multiplied INSIDE the ink only: the field masked by the ink's alpha
  if (paper.mottle > 0 && state.regions.length) {
    const mot = mottleCanvas(material, paper.mottle);
    const mask = makeCanvas(canvas.width, canvas.height);
    const mc = mask.getContext('2d');
    mc.imageSmoothingEnabled = true; mc.drawImage(mot, 0, 0, canvas.width, canvas.height);
    mc.globalCompositeOperation = 'destination-in'; mc.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.9; ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // the touch-down line, darkening only where there is ink
  if (plan.line) {
    const l = plan.line;
    ctx.save(); ctx.scale(scale, scale); ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = `rgba(20,16,12,${l.alpha})`; ctx.lineWidth = l.width;
    ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.lineTo(l.x1, l.y1); ctx.stroke(); ctx.restore();
  }
  return canvas;
}

/* ---------- texture canvases (small, scaled at draw) ---------- */
const texCache = new Map();
function paperCanvas(material) {
  const k = `p${material.paper}:${material.seed}`;
  if (!texCache.has(k)) texCache.set(k, bytesToCanvas(T.paperTexture(material.paper, material.seed), T.TEX_W, T.TEX_H));
  return texCache.get(k);
}
function mottleCanvas(material, amount) {
  const k = `m${material.seed}:${amount}`;
  if (!texCache.has(k)) texCache.set(k, bytesToCanvas(T.mottleTexture(material.seed, amount), T.MOT_W, T.MOT_H));
  return texCache.get(k);
}

/* ---------- the paper view ---------- */
export function makeCache() { return { layers: [] }; }
/* doc: { sheet, material, states: [state…] } — printed layers first, the live bath last */
export function renderPaper(ctx, doc, scale, cache, { texture = true } = {}) {
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const paper = T.paperOf(doc.material.paper);
  const matKey = `${doc.material.paper}:${doc.material.flaws}:${doc.material.seed}`;
  ctx.save();
  ctx.fillStyle = doc.sheet; ctx.fillRect(0, 0, w, h);
  doc.states.forEach((st, i) => {
    const key = `${M.digest(st)}|${w}x${h}|${matKey}|${i}`;
    let ent = cache.layers[i];
    if (!ent || ent.key !== key) {
      const canvas = ent && ent.canvas.width === w && ent.canvas.height === h ? ent.canvas : makeCanvas(w, h);
      renderLayerInk(canvas, st, scale, doc.material, i);
      ent = cache.layers[i] = { key, canvas };
    }
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ent.canvas, 0, 0);
  });
  cache.layers.length = doc.states.length;
  if (texture && paper.textureAlpha > 0) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = paper.textureAlpha;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(paperCanvas(doc.material), 0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.restore();
}
