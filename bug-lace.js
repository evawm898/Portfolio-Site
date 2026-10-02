/* bug-lace.js — Phase 4 of the Parametric Bug: an imported SVG (LACE) laid on
   a wing, in the wing's own PLANFORM frame (u along the span from the root
   chord, w along the chord, + toward the head, millimetres, before the wing
   transform). Pure 2D, pure ES module (no DOM, no three.js): bug-geometry.js
   calls laceWing() once per wing and builds geometry from what comes back, so
   the SVG and the STL read one record placed by one transform — §1's law.

   PIPELINE (bug-project-design-doc.md §10):
     1. parseSvg — a small, dependency-free SVG reader (path / polygon /
        polyline / rect / circle / ellipse / line, nested <g> transforms,
        fill / stroke / fill-rule / display). The artwork is BINARY: anything
        filled or stroked is ink (the material of the lace), colour is ignored.
        Raster images are out of scope and refused.
     2. laceMapper — WARP the artwork onto the planform: CLIP (a similarity:
        no distortion, trimmed at the region), RADIAL (polar about the root
        chord's middle: x runs out along the radius, y across the angular
        extent of the outline, so the artwork fans like the veins), ENVELOPE
        (the artwork's bounding box stretched onto the outline: x along the
        span, y between the outline's lead and trail at that u). Then pattern
        scale / rotation / offset, and TILE (repeat the artwork's bounding box).
     3. laceWing — everything after the warp happens on ONE raster of the wing
        at LACE_PX (0.05 mm, the HOLES / cut-safe pitch):
          FRAME   the material that is not the import's: in FILL CELLS every
                  cell's edge bands (half the vein width, the margin border),
                  so the VEINS STAY; in REPLACE VEINS the margin border and the
                  root chord only, so the veins are hidden;
          LACE    the warped artwork inside the region (each cell, or the
                  whole outline) — so the lace is CLIPPED to it by construction;
          BLEND   procedural <-> import: below 1 the procedural wing holds the
                  root and the import the margin, meeting on a vein-wide arc
                  about the root chord's middle that moves out as the blend
                  falls; 0 is never reached here — the builder branches to the
                  procedural code;
          VOIDS   too small to hold a minCellMm disc are filled (the HOLES rule);
          FLOOR   material narrower than minDiameter (a raster opening, depth
                  against THIN_DEPTH_FRAC of the floor — the drawn-outline rule)
                  is reported and drawn red, and the STL is BLOCKED;
          ISLANDS material not connected to the frame (HOLES only — a raised
                  lace on a solid wing has none): DROP below a threshold, BRIDGE
                  with floored ties to the nearest frame material, or SVG-ONLY
                  (the STL keeps the procedural venation). No default: while the
                  choice is unset and islands exist, the STL is blocked.
        Then every region is traced back to polygons: the region's EXACT
        polygon with hole loops (HOLES), islands as their own polygons, or
        plates (RIDGES).

   THE STAND-IN. No lace artwork of Eva's is in this repository. Until her
   files exist the default import is STAND_IN_SVG — a geometric test pattern
   of rings, dots and one stroked edge, labelled as a stand-in everywhere. It
   exercises every path (islands, strokes, tiling); it is NOT lace and the
   look cannot be ruled on it. */

import { polyArea, pointInPoly, traceMask, simplifyLoop } from './bug-venation.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const D2R = Math.PI / 180;

export const LACE_PX = 0.05;            // the HOLES / cut-safe raster pitch
export const LACE_MAX_BYTES = 4e6;      // an import larger than this is refused (a lace panel is a few hundred KB)
export const LACE_MAX_TILES = 900;
export const LACE_CLIP_REF_MM = 40;     // CLIP: at scale 1 the artwork's larger side is 40 mm (an absolute size; RADIAL and ENVELOPE are relative to the wing by nature)
export const THIN_DEPTH_FRAC_LACE = 0.5; // same bar as the drawn outline's (bug-geometry THIN_DEPTH_FRAC)
export const LACE_ROLES = ['none', 'fill', 'replace'];
export const LACE_WARPS = ['clip', 'radial', 'envelope'];

/* ------------------------------------------------------------------ */
/* the stand-in test pattern                                            */
/* ------------------------------------------------------------------ */

export const STAND_IN_NAME = 'STAND-IN TEST PATTERN — not lace';
/* 5 x 3 rings on a 20-unit square grid, overlapping their neighbours by 2
   units (outer r 11, inner r 8 — a 3-unit band), a FREE DOT (r 2.5) in each
   ring: fifteen islands by design. One stroked zig-zag along the top edge
   exercises the stroke path. At pattern scale 1 on the default forewing
   (the artwork 40 mm across in CLIP -> 0.38 mm a unit) the band is 1.2 mm, the
   dot 2.0 mm across and the void around it 2.2 mm — clear of every floor. */
export const STAND_IN_SVG = (() => {
  const rings = [], dots = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
    const cx = 11 + 20 * i, cy = 11 + 20 * j;
    rings.push(`<path d="M${cx + 11} ${cy}A11 11 0 1 0 ${cx - 11} ${cy}A11 11 0 1 0 ${cx + 11} ${cy}ZM${cx + 8} ${cy}A8 8 0 1 1 ${cx - 8} ${cy}A8 8 0 1 1 ${cx + 8} ${cy}Z"/>`);
    dots.push(`<circle cx="${cx}" cy="${cy}" r="2.5"/>`);
  }
  let zig = ''; for (let x = 0; x <= 102; x += 6) zig += `${x},${(x / 6) % 2 ? 4 : 1.5} `;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 102 62">\n<title>${STAND_IN_NAME}</title>\n`
    + `<g fill="#000" fill-rule="nonzero">${rings.join('')}</g>\n<g fill="#000">${dots.join('')}</g>\n`
    + `<polyline fill="none" stroke="#000" stroke-width="2.6" points="${zig.trim()}"/>\n</svg>\n`;
})();

/* ------------------------------------------------------------------ */
/* SVG reader                                                           */
/* ------------------------------------------------------------------ */

const IDENT = [1, 0, 0, 1, 0, 0];
const mmul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const mapply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const nums = (s) => (String(s || '').match(NUM) || []).map(Number);

export function parseTransform(s) {
  let m = IDENT;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let r;
  while ((r = re.exec(String(s || '')))) {
    const a = nums(r[2]); let t = IDENT;
    if (r[1] === 'matrix' && a.length >= 6) t = a.slice(0, 6);
    else if (r[1] === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (r[1] === 'scale') t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (r[1] === 'rotate') {
      const c = Math.cos((a[0] || 0) * D2R), sn = Math.sin((a[0] || 0) * D2R), x = a[1] || 0, y = a[2] || 0;
      t = mmul(mmul([1, 0, 0, 1, x, y], [c, sn, -sn, c, 0, 0]), [1, 0, 0, 1, -x, -y]);
    } else if (r[1] === 'skewX') t = [1, 0, Math.tan((a[0] || 0) * D2R), 1, 0, 0];
    else if (r[1] === 'skewY') t = [1, Math.tan((a[0] || 0) * D2R), 0, 1, 0, 0];
    m = mmul(m, t);
  }
  return m;
}

/* path data -> subpaths of points (curves flattened) */
export function parsePathD(d) {
  const toks = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  const subs = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', lc = null, lq = null, i = 0;
  const isCmd = (t) => /^[A-Za-z]$/.test(t);
  const n = () => +toks[i++];
  const start = (px, py) => { cur = { pts: [[px, py]], closed: false }; subs.push(cur); sx = px; sy = py; };
  const line = (px, py) => { if (!cur) start(x, y); cur.pts.push([px, py]); };
  while (i < toks.length) {
    if (isCmd(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { if (cur) { cur.closed = true; x = sx; y = sy; cur = null; } lc = lq = null; continue; }
    if (i >= toks.length || isCmd(toks[i])) { if (C !== 'Z') i += 0; if (isCmd(toks[i] || 'Z')) continue; }
    if (C === 'M') { const px = n() + (rel ? x : 0), py = n() + (rel ? y : 0); start(px, py); x = px; y = py; cmd = rel ? 'l' : 'L'; lc = lq = null; }
    else if (C === 'L') { const px = n() + (rel ? x : 0), py = n() + (rel ? y : 0); line(px, py); x = px; y = py; lc = lq = null; }
    else if (C === 'H') { const px = n() + (rel ? x : 0); line(px, y); x = px; lc = lq = null; }
    else if (C === 'V') { const py = n() + (rel ? y : 0); line(x, py); y = py; lc = lq = null; }
    else if (C === 'C' || C === 'S') {
      let x1, y1;
      if (C === 'C') { x1 = n() + (rel ? x : 0); y1 = n() + (rel ? y : 0); } else { x1 = lc ? 2 * x - lc[0] : x; y1 = lc ? 2 * y - lc[1] : y; }
      const x2 = n() + (rel ? x : 0), y2 = n() + (rel ? y : 0), px = n() + (rel ? x : 0), py = n() + (rel ? y : 0);
      if (!cur) start(x, y);
      for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t; cur.pts.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * px, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * py]); }
      lc = [x2, y2]; lq = null; x = px; y = py;
    } else if (C === 'Q' || C === 'T') {
      let x1, y1;
      if (C === 'Q') { x1 = n() + (rel ? x : 0); y1 = n() + (rel ? y : 0); } else { x1 = lq ? 2 * x - lq[0] : x; y1 = lq ? 2 * y - lq[1] : y; }
      const px = n() + (rel ? x : 0), py = n() + (rel ? y : 0);
      if (!cur) start(x, y);
      for (let k = 1; k <= 12; k++) { const t = k / 12, u = 1 - t; cur.pts.push([u * u * x + 2 * u * t * x1 + t * t * px, u * u * y + 2 * u * t * y1 + t * t * py]); }
      lq = [x1, y1]; lc = null; x = px; y = py;
    } else if (C === 'A') {
      let rx = Math.abs(n()), ry = Math.abs(n()); const phi = n() * D2R, fa = n(), fs = n();
      const px = n() + (rel ? x : 0), py = n() + (rel ? y : 0);
      if (!cur) start(x, y);
      if (!(rx > 0 && ry > 0) || (px === x && py === y)) { cur.pts.push([px, py]); x = px; y = py; lc = lq = null; continue; }
      // endpoint -> centre parameterisation (SVG implementation notes, F.6.5)
      const cph = Math.cos(phi), sph = Math.sin(phi), dx = (x - px) / 2, dy = (y - py) / 2;
      const x1p = cph * dx + sph * dy, y1p = -sph * dx + cph * dy;
      const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
      const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
      const cxp = co * ((rx * y1p) / ry), cyp = co * (-(ry * x1p) / rx);
      const cx = cph * cxp - sph * cyp + (x + px) / 2, cy = sph * cxp + cph * cyp + (y + py) / 2;
      const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
      const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
      const steps = Math.max(2, Math.ceil(Math.abs(dt) / (6 * D2R)));
      for (let k = 1; k <= steps; k++) {
        const t = t1 + (dt * k) / steps, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
        cur.pts.push(k === steps ? [px, py] : [cph * ex - sph * ey + cx, sph * ex + cph * ey + cy]);
      }
      x = px; y = py; lc = lq = null;
    } else i++;
  }
  return subs.filter((s) => s.pts.length >= 2);
}

const SKIP = new Set(['defs', 'clipPath', 'mask', 'pattern', 'symbol', 'marker', 'style', 'script', 'title', 'desc', 'metadata', 'linearGradient', 'radialGradient', 'filter', 'text', 'foreignObject']);
const attrsOf = (s) => {
  const out = {}; const re = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let r;
  while ((r = re.exec(s))) out[r[1]] = r[3] ?? r[4] ?? '';
  if (out.style) for (const kv of out.style.split(';')) { const k = kv.indexOf(':'); if (k > 0) out[kv.slice(0, k).trim()] = kv.slice(k + 1).trim(); }
  return out;
};
const painted = (v) => v != null && v !== '' && !/^(none|transparent)$/i.test(String(v).trim());

/* Returns { ok, reason?, elements: [{ fill, rule, stroke, subpaths }], bbox,
   notes }. Every coordinate is in the file's own user units with every
   transform applied. */
export function parseSvg(text) {
  const notes = [];
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'the file is empty' };
  if (text.length > LACE_MAX_BYTES) return { ok: false, reason: `the file is ${(text.length / 1e6).toFixed(1)} MB; the limit is ${(LACE_MAX_BYTES / 1e6).toFixed(0)} MB` };
  const src = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  if (!/<svg[\s>]/i.test(src)) return { ok: false, reason: 'not an SVG file (no <svg> element)' };
  const elements = [];
  const stack = [{ m: IDENT, fill: '#000', stroke: null, sw: 1, rule: 'nonzero', hidden: false, tag: 'root' }];
  let skip = 0, images = 0, uses = 0, unknown = new Set();
  const re = /<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let r;
  while ((r = re.exec(src))) {
    const [, close, rawTag, rest, self] = r;
    const tag = rawTag.replace(/^svg:/, '');
    if (close) { if (skip) { if (SKIP.has(tag)) skip--; continue; } if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop(); continue; }
    if (skip) { if (SKIP.has(tag) && !self) skip++; continue; }
    if (SKIP.has(tag)) { if (!self) skip++; continue; }
    const a = attrsOf(rest), top = stack[stack.length - 1];
    const st = {
      m: a.transform ? mmul(top.m, parseTransform(a.transform)) : top.m,
      fill: 'fill' in a ? a.fill : top.fill, stroke: 'stroke' in a ? a.stroke : top.stroke,
      sw: 'stroke-width' in a ? (nums(a['stroke-width'])[0] ?? 1) : top.sw,
      rule: 'fill-rule' in a ? a['fill-rule'] : top.rule,
      hidden: top.hidden || a.display === 'none' || a.visibility === 'hidden' || +a['fill-opacity'] === 0 && +a['stroke-opacity'] === 0, tag,
    };
    if (+a['fill-opacity'] === 0) st.fill = 'none';
    if (+a['stroke-opacity'] === 0) st.stroke = 'none';
    if (tag === 'svg' || tag === 'g' || tag === 'a' || tag === 'switch') { if (!self) stack.push(st); continue; }
    if (tag === 'image') { images++; continue; }
    if (tag === 'use') { uses++; continue; }
    let subs = null;
    const g = (k, d = 0) => (k in a ? (nums(a[k])[0] ?? d) : d);
    if (tag === 'path') subs = parsePathD(a.d);
    else if (tag === 'polygon' || tag === 'polyline') {
      const v = nums(a.points), pts = []; for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]]);
      subs = pts.length >= 2 ? [{ pts, closed: tag === 'polygon' }] : [];
    } else if (tag === 'rect') {
      const x = g('x'), y = g('y'), w = g('width'), h = g('height');
      let rx = g('rx', NaN), ry = g('ry', NaN); if (!Number.isFinite(rx)) rx = Number.isFinite(ry) ? ry : 0; if (!Number.isFinite(ry)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (w > 0 && h > 0) {
        const pts = [];
        if (rx > 0 && ry > 0) {
          const corner = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const t = (a0 + (k * 90) / 6) * D2R; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } };
          corner(x + w - rx, y + ry, -90); corner(x + w - rx, y + h - ry, 0); corner(x + rx, y + h - ry, 90); corner(x + rx, y + ry, 180);
        } else pts.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
        subs = [{ pts, closed: true }];
      } else subs = [];
    } else if (tag === 'circle' || tag === 'ellipse') {
      const cx = g('cx'), cy = g('cy'), rx = tag === 'circle' ? g('r') : g('rx'), ry = tag === 'circle' ? g('r') : g('ry');
      const pts = []; if (rx > 0 && ry > 0) for (let k = 0; k < 64; k++) { const t = (2 * Math.PI * k) / 64; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
      subs = pts.length ? [{ pts, closed: true }] : [];
    } else if (tag === 'line') subs = [{ pts: [[g('x1'), g('y1')], [g('x2'), g('y2')]], closed: false }];
    else { unknown.add(tag); continue; }
    if (st.hidden || !subs || !subs.length) continue;
    const fill = painted(st.fill), sw = painted(st.stroke) ? st.sw : 0;
    if (!fill && !(sw > 0)) continue;
    const det = Math.abs(st.m[0] * st.m[3] - st.m[1] * st.m[2]);
    elements.push({
      fill, rule: /evenodd/i.test(st.rule) ? 'evenodd' : 'nonzero', stroke: sw > 0 ? sw * Math.sqrt(det) : 0,
      subpaths: subs.map((s) => ({ pts: s.pts.map(([px, py]) => mapply(st.m, px, py)), closed: s.closed })),
    });
  }
  if (images) notes.push(`${images} raster image${images === 1 ? '' : 's'} ignored (SVG import only — raster is out of scope)`);
  if (uses) notes.push(`${uses} <use> reference${uses === 1 ? '' : 's'} ignored (not supported: expand them in the drawing program first)`);
  if (unknown.size) notes.push(`ignored elements: ${[...unknown].slice(0, 6).join(', ')}`);
  if (!elements.length) return { ok: false, reason: 'nothing filled or stroked was found in the file', notes };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of elements) for (const s of e.subpaths) for (const [x, y] of s.pts) {
    const h = e.stroke / 2; x0 = Math.min(x0, x - h); x1 = Math.max(x1, x + h); y0 = Math.min(y0, y - h); y1 = Math.max(y1, y + h);
  }
  if (!(x1 > x0 && y1 > y0)) return { ok: false, reason: 'the drawing has no extent', notes };
  const pts = elements.reduce((n, e) => n + e.subpaths.reduce((m, s) => m + s.pts.length, 0), 0);
  return { ok: true, elements, bbox: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }, notes, counts: { elements: elements.length, points: pts } };
}

const CACHE = new Map();
/* The import a params.lace record names: its own text, or the stand-in. */
export function lacePattern(lace) {
  const text = lace && typeof lace.svg === 'string' && lace.svg.trim() ? lace.svg : STAND_IN_SVG;
  const standIn = text === STAND_IN_SVG;
  if (!CACHE.has(text)) {
    if (CACHE.size > 8) CACHE.clear();
    CACHE.set(text, parseSvg(text));
  }
  const p = CACHE.get(text);
  return { ...p, standIn, name: standIn ? STAND_IN_NAME : (lace.name || 'imported SVG') };
}

/* ------------------------------------------------------------------ */
/* warp                                                                  */
/* ------------------------------------------------------------------ */

/* frame: { outline (planform mm, the drawn polygon), span } */
export function laceMapper(pattern, spec, frame) {
  const b = pattern.bbox, warp = LACE_WARPS[clamp(Math.round(spec.laceWarp), 0, 2)];
  const th = (spec.laceRotate || 0) * D2R, ct = Math.cos(th), st = Math.sin(th);
  const scale = Math.max(1e-3, spec.laceScale), span = frame.span;
  const O = frame.outline;
  let umin = Infinity, umax = -Infinity, wmin = Infinity, wmax = -Infinity, cu = 0, cw = 0;
  for (const [u, w] of O) { umin = Math.min(umin, u); umax = Math.max(umax, u); wmin = Math.min(wmin, w); wmax = Math.max(wmax, w); }
  { let A = 0; for (let i = 0; i < O.length; i++) { const p = O[i], q = O[(i + 1) % O.length], c = p[0] * q[1] - q[0] * p[1]; A += c; cu += (p[0] + q[0]) * c; cw += (p[1] + q[1]) * c; } cu /= 3 * A; cw /= 3 * A; }
  const offU = (spec.laceOffsetU || 0) * span, offW = (spec.laceOffsetW || 0) * span;
  if (warp === 'clip') {
    // CLIP keeps the artwork's own proportions at an ABSOLUTE size, so the
    // threads are the same width on every wing of the bug: scale 1 makes the
    // artwork's larger side LACE_CLIP_REF_MM across
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, k = (scale * LACE_CLIP_REF_MM) / Math.max(b.w, b.h);
    const map = (x, y) => { const dx = x - cx, dy = -(y - cy); return [cu + offU + k * (ct * dx - st * dy), cw + offW + k * (st * dx + ct * dy)]; };
    const inv = (u, w) => { const du = (u - cu - offU) / k, dw = (w - cw - offW) / k; const dx = ct * du + st * dw, dy = -st * du + ct * dw; return [cx + dx, cy - dy]; };
    return { warp, linear: true, map, inv, k, domain: { umin, umax, wmin, wmax } };
  }
  // normalised pattern coordinates n in [0,1]^2, then rotated / zoomed / offset about the centre
  const toN = (x, y) => [(x - b.x0) / b.w, (y - b.y0) / b.h];
  const nPrime = (x, y) => { const [nx, ny] = toN(x, y), dx = nx - 0.5, dy = ny - 0.5; return [0.5 + scale * (ct * dx - st * dy) + spec.laceOffsetU, 0.5 + scale * (st * dx + ct * dy) + spec.laceOffsetW]; };
  const invN = (a, c) => { const dx = (a - 0.5 - spec.laceOffsetU) / scale, dy = (c - 0.5 - spec.laceOffsetW) / scale; const nx = 0.5 + ct * dx + st * dy, ny = 0.5 - st * dx + ct * dy; return [b.x0 + nx * b.w, b.y0 + ny * b.h]; };
  if (warp === 'envelope') {
    // the outline's lead / trail at each u: vertical slices of the polygon
    const N = 512, lo = new Float64Array(N + 1), hi = new Float64Array(N + 1), ok = new Uint8Array(N + 1);
    for (let s = 0; s <= N; s++) {
      const u = umin + ((umax - umin) * s) / N; let a = Infinity, c = -Infinity;
      for (let i = 0; i < O.length; i++) { const p = O[i], q = O[(i + 1) % O.length]; if ((p[0] <= u) !== (q[0] <= u)) { const w = p[1] + ((u - p[0]) / (q[0] - p[0])) * (q[1] - p[1]); a = Math.min(a, w); c = Math.max(c, w); } }
      if (a < c) { lo[s] = a; hi[s] = c; ok[s] = 1; }
    }
    for (let s = 0; s <= N; s++) if (!ok[s]) { let t = 1; while (t <= N) { if (s - t >= 0 && ok[s - t]) { lo[s] = lo[s - t]; hi[s] = hi[s - t]; break; } if (s + t <= N && ok[s + t]) { lo[s] = lo[s + t]; hi[s] = hi[s + t]; break; } t++; } }
    const slice = (u) => { const f = clamp(((u - umin) / (umax - umin)) * N, 0, N), s0 = Math.floor(f), s1 = Math.min(N, s0 + 1), t = f - s0; return [lo[s0] + (lo[s1] - lo[s0]) * t, hi[s0] + (hi[s1] - hi[s0]) * t]; };
    const map = (x, y) => { const [a, c] = nPrime(x, y); const u = umin + a * (umax - umin), [l, h] = slice(u); return [u, h - c * (h - l)]; };
    return { warp, linear: false, map, invN, domain: { umin, umax, wmin, wmax } };
  }
  // radial: polar about the middle of the root chord
  const lead = O.reduce((m, q) => (q[0] === 0 && q[1] > m[1] ? q : m), [0, -Infinity]), trail = O.reduce((m, q) => (q[0] === 0 && q[1] < m[1] ? q : m), [0, Infinity]);
  const ou = 0, ow = Number.isFinite(lead[1]) && Number.isFinite(trail[1]) ? (lead[1] + trail[1]) / 2 : cw;
  let flo = Infinity, fhi = -Infinity, Rmax = 0;
  for (const [u, w] of O) { if (u <= 1e-9) continue; const f = Math.atan2(w - ow, u - ou); flo = Math.min(flo, f); fhi = Math.max(fhi, f); Rmax = Math.max(Rmax, Math.hypot(u - ou, w - ow)); }
  // a tile copy beyond the pattern box reaches a < 0 and an angle past the
  // fan: a NEGATIVE radius at an angle past a right angle reflects through
  // the origin back INTO the wing (measured: the diagonal tile copies flooded
  // the hindwing solid). So the radius is clamped at the origin and the angle
  // to within a half turn of the fan — both only ever move points that lie
  // outside the wing already.
  const map = (x, y) => { const [a, c] = nPrime(x, y); const rr = Math.max(0, a) * Rmax, f = clamp(fhi - c * (fhi - flo), flo - Math.PI, fhi + Math.PI); return [ou + rr * Math.cos(f), ow + rr * Math.sin(f)]; };
  return { warp, linear: false, map, invN, origin: [ou, ow], Rmax, phi: [flo, fhi], domain: { umin, umax, wmin, wmax } };
}

/* every tile copy (pattern-unit offsets) the region needs */
function tilesFor(pattern, spec, M) {
  const b = pattern.bbox;
  if (!(Math.round(spec.laceTile) >= 1)) return [[0, 0]];
  let pts;
  if (M.linear) {
    const d = M.domain; pts = [[d.umin, d.wmin], [d.umax, d.wmin], [d.umax, d.wmax], [d.umin, d.wmax]].map(([u, w]) => M.inv(u, w));
  } else pts = [[-0.05, -0.05], [1.05, -0.05], [1.05, 1.05], [-0.05, 1.05]].map(([a, c]) => M.invN(a, c));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const i0 = Math.floor((x0 - b.x1) / b.w) + 1, i1 = Math.ceil((x1 - b.x0) / b.w) - 1, j0 = Math.floor((y0 - b.y1) / b.h) + 1, j1 = Math.ceil((y1 - b.y0) / b.h) - 1;
  const out = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { out.push([i * b.w, j * b.h]); if (out.length >= LACE_MAX_TILES) return out; }
  return out.length ? out : [[0, 0]];
}

/* ------------------------------------------------------------------ */
/* raster helpers                                                       */
/* ------------------------------------------------------------------ */

function makeGrid(outline, px, pad = 6) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const nx = Math.ceil((x1 - x0) / px) + 2 * pad, ny = Math.ceil((y1 - y0) / px) + 2 * pad;
  const gx = x0 - pad * px, gy = y0 - pad * px;
  return { nx, ny, gx, gy, px, cx: (i) => gx + (i + 0.5) * px, cy: (j) => gy + (j + 0.5) * px };
}
/* scanline fill of loops (pixel centres), nonzero or even-odd; calls set(k) */
function fillLoops(G, loops, rule, set) {
  const { nx, ny, gx, gy, px } = G;
  let ylo = Infinity, yhi = -Infinity;
  const edges = [];
  for (const L of loops) for (let i = 0; i < L.length; i++) {
    const a = L[i], b = L[(i + 1) % L.length];
    if (a[1] === b[1]) continue;
    edges.push([a[0], a[1], b[0], b[1]]); ylo = Math.min(ylo, a[1], b[1]); yhi = Math.max(yhi, a[1], b[1]);
  }
  if (!edges.length) return;
  const j0 = Math.max(0, Math.floor((ylo - gy) / px - 0.5)), j1 = Math.min(ny - 1, Math.ceil((yhi - gy) / px - 0.5));
  if (j1 < j0) return;
  const rows = Array.from({ length: j1 - j0 + 1 }, () => []);
  for (const e of edges) {
    // one row of slack each side: the bucket is computed by a division and
    // the crossing test below by a product, and where an edge ends exactly on
    // a pixel centre the two disagree by an ulp — leaving the edge out of the
    // row it crosses drew a one-pixel HAIRLINE of material across a hole
    // (measured on the blend at 0.25). The crossing test is exact, so a
    // bucket too wide costs nothing.
    const a = Math.max(j0, Math.ceil((Math.min(e[1], e[3]) - gy) / px - 0.5) - 1), c = Math.min(j1, Math.floor((Math.max(e[1], e[3]) - gy) / px - 0.5) + 1);
    for (let j = a; j <= c; j++) rows[j - j0].push(e);
  }
  for (let j = j0; j <= j1; j++) {
    const yc = gy + (j + 0.5) * px, xs = [];
    for (const e of rows[j - j0]) if ((e[1] <= yc) !== (e[3] <= yc)) xs.push([e[0] + ((yc - e[1]) / (e[3] - e[1])) * (e[2] - e[0]), e[3] > e[1] ? 1 : -1]);
    if (xs.length < 2) continue;
    xs.sort((p, q) => p[0] - q[0]);
    let wnd = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      wnd += rule === 'evenodd' ? 1 : xs[k][1];
      if (rule === 'evenodd' ? wnd % 2 === 0 : wnd === 0) continue;
      const i0 = Math.max(0, Math.ceil((xs[k][0] - gx) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1][0] - gx) / px - 0.5));
      for (let i = i0; i <= i1; i++) set(j * nx + i);
    }
  }
}
/* paint a capsule (segment ab, radius r) where ok(k) */
function capsule(G, a, b, r, set, ok = null) {
  const { nx, ny, gx, gy, px } = G, r2 = r * r;
  const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-18;
  const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - gx) / px)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + r - gx) / px));
  const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - gy) / px)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + r - gy) / px));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * nx + i; if (ok && !ok(k)) continue;
    const x = gx + (i + 0.5) * px, y = gy + (j + 0.5) * px;
    const t = clamp(((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / L2, 0, 1);
    const dx = x - a[0] - t * ab[0], dy = y - a[1] - t * ab[1];
    if (dx * dx + dy * dy < r2) set(k);
  }
}
/* exact Euclidean distance transform (Felzenszwalb): distance in PIXELS from
   every pixel to the nearest pixel where feat[k] is set; optional nearest
   feature index. */
function edt(feat, nx, ny, withIndex = false) {
  const INF = 1e20, N = nx * ny, f = new Float64Array(N), near = withIndex ? new Int32Array(N) : null;
  for (let k = 0; k < N; k++) f[k] = feat[k] ? 0 : INF;
  const n = Math.max(nx, ny), d = new Float64Array(n), z = new Float64Array(n + 1), v = new Int32Array(n), g = new Float64Array(n), gi = new Int32Array(n), di = new Int32Array(n);
  const pass = (len, get, put) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 0; q < len; q++) { g[q] = get(q); gi[q] = q; }
    for (let q = 1; q < len; q++) {
      let s;
      for (;;) { const p = v[k]; s = ((g[q] + q * q) - (g[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k] && k > 0) k--; else break; }
      if (s <= z[k]) { v[0] = q; z[0] = -INF; z[1] = INF; k = 0; continue; }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + g[p]; di[q] = p; }
    for (let q = 0; q < len; q++) put(q, d[q], di[q]);
  };
  const colNear = withIndex ? new Int32Array(N) : null;
  for (let i = 0; i < nx; i++) pass(ny, (q) => f[q * nx + i], (q, val, p) => { f[q * nx + i] = val; if (colNear) colNear[q * nx + i] = p * nx + i; });
  const row = new Float64Array(nx);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) row[i] = f[j * nx + i];
    pass(nx, (q) => row[q], (q, val, p) => { f[j * nx + q] = val; if (near) near[j * nx + q] = colNear[j * nx + p]; });
  }
  for (let k = 0; k < N; k++) f[k] = Math.sqrt(f[k]);
  return withIndex ? { dist: f, near } : f;
}
/* 4-connected components of mask; returns { lab (1-based), count, sizes } */
function label4(mask, nx, ny) {
  const N = nx * ny, lab = new Int32Array(N), q = new Int32Array(N), sizes = [0];
  let count = 0;
  for (let s = 0; s < N; s++) {
    if (!mask[s] || lab[s]) continue;
    count++; let h = 0, t = 0; q[t++] = s; lab[s] = count;
    while (h < t) {
      const c = q[h++], ci = c % nx;
      if (ci > 0 && mask[c - 1] && !lab[c - 1]) { lab[c - 1] = count; q[t++] = c - 1; }
      if (ci < nx - 1 && mask[c + 1] && !lab[c + 1]) { lab[c + 1] = count; q[t++] = c + 1; }
      if (c >= nx && mask[c - nx] && !lab[c - nx]) { lab[c - nx] = count; q[t++] = c - nx; }
      if (c < N - nx && mask[c + nx] && !lab[c + nx]) { lab[c + nx] = count; q[t++] = c + nx; }
    }
    sizes.push(t);
  }
  return { lab, count, sizes };
}
/* a material SADDLE (two material pixels touching only at a corner) is filled
   in, so material and void are both unambiguously 4-connected — the marching
   squares tracer separates a diagonal pair, and the topology the labels see
   must be the topology the polygons have. The pinch it fills is narrower than
   any floor and is reported by the floor analysis anyway. */
function fillSaddles(M, inside, nx, ny) {
  let filled = 0;
  for (let pass = 0; pass < 8; pass++) {
    let n = 0;
    for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      const A = M[a], B = M[b], C = M[c], D = M[d];
      if (A && C && !B && !D) { if (inside[b]) { M[b] = 1; n++; } else if (inside[d]) { M[d] = 1; n++; } }
      else if (B && D && !A && !C) { if (inside[a]) { M[a] = 1; n++; } else if (inside[c]) { M[c] = 1; n++; } }
    }
    filled += n; if (!n) break;
  }
  return filled;
}

/* ------------------------------------------------------------------ */
/* the pipeline                                                         */
/* ------------------------------------------------------------------ */

/* Trace one labelled component (or a union of labels) in its own bounding
   box; returns its loops, largest first, each CCW-positive for the outer. */
function traceComp(test, G, box) {
  const [i0, j0, i1, j1] = box, w = i1 - i0 + 1, h = j1 - j0 + 1;
  const m = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[j * w + i] = test((j + j0) * G.nx + (i + i0)) ? 1 : 0;
  const loops = traceMask(m, w, h, (i) => G.cx(i + i0), (j) => G.cy(j + j0));
  return loops.sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)));
}
function boxes(lab, count, nx, ny) {
  const B = Array.from({ length: count + 1 }, () => [Infinity, Infinity, -Infinity, -Infinity]);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const l = lab[j * nx + i]; if (!l) continue; const b = B[l]; if (i < b[0]) b[0] = i; if (j < b[1]) b[1] = j; if (i > b[2]) b[2] = i; if (j > b[3]) b[3] = j; }
  return B;
}
const orientCCW = (L, ccw) => ((polyArea(L) > 0) === ccw ? L : L.slice().reverse());

/* segment-crossing test over a set of loops (grid-bucketed) */
function loopsCross(loops) {
  const segs = [];
  loops.forEach((L, li) => { for (let i = 0; i < L.length; i++) segs.push([L[i], L[(i + 1) % L.length], li, i, L.length]); });
  if (segs.length < 2) return false;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [a] of segs) { x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]); }
  const cs = Math.max((x1 - x0), (y1 - y0)) / Math.max(4, Math.sqrt(segs.length)) || 1;
  const grid = new Map();
  segs.forEach((s, k) => {
    const ia = Math.floor((Math.min(s[0][0], s[1][0]) - x0) / cs), ib = Math.floor((Math.max(s[0][0], s[1][0]) - x0) / cs);
    const ja = Math.floor((Math.min(s[0][1], s[1][1]) - y0) / cs), jb = Math.floor((Math.max(s[0][1], s[1][1]) - y0) / cs);
    for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) { const key = i * 100003 + j; (grid.get(key) || grid.set(key, []).get(key)).push(k); }
  });
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const hit = (a, b, c, d) => { const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d); return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)); };
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  for (const list of grid.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
    const s = segs[list[x]], t = segs[list[y]];
    if (s[2] === t[2] && (Math.abs(s[3] - t[3]) <= 1 || Math.abs(s[3] - t[3]) === s[4] - 1)) continue;   // neighbours on one loop
    if (same(s[0], t[0]) || same(s[0], t[1]) || same(s[1], t[0]) || same(s[1], t[1])) return true;
    if (hit(s[0], s[1], t[0], t[1])) return true;
  }
  return false;
}
/* simplify traced loops at the largest tolerance that keeps every loop simple
   and leaves no two loops (or a loop and the fixed outer polygon) crossing */
function simplifySet(loops, fixed, px) {
  for (const tol of [0.9, 0.6, 0.35, 0]) {
    const out = loops.map((L) => {
      let P = tol > 0 ? simplifyLoop(L, tol * px) : L.slice();
      const dd = []; for (const q of P) if (!dd.length || Math.hypot(q[0] - dd[dd.length - 1][0], q[1] - dd[dd.length - 1][1]) > 1e-4) dd.push(q);
      while (dd.length > 3 && Math.hypot(dd[0][0] - dd[dd.length - 1][0], dd[0][1] - dd[dd.length - 1][1]) <= 1e-4) dd.pop();
      return dd;
    });
    if (out.some((L) => L.length < 3)) continue;
    if (tol === 0 || !loopsCross(fixed ? [fixed, ...out] : out)) return out;
  }
  return loops;
}

/* laceWing(input) — the whole raster pipeline for ONE wing.
   input: { outline (drawn planform mm, any orientation), regions: [{ id,
   polygon (CCW), bands: [[a, b, r], ...] }], pattern, spec (the pair's
   resolved fields), mode ('holes' | 'ridges'), role ('fill' | 'replace'),
   floor, minCellMm, islands ('unset' | 'drop' | 'bridge' | 'svg'), dropMm2,
   tieMm, proc ({ holes } in HOLES, { capsules } in RIDGES: the procedural
   material the BLEND morphs from), span }. */
export function laceWing(I) {
  const t0 = Date.now(), px = LACE_PX;
  const G = makeGrid(I.outline, px), { nx, ny } = G, N = nx * ny;
  const notes = [];
  // which region each pixel is in
  const reg = new Int32Array(N).fill(-1), inside = new Uint8Array(N);
  I.regions.forEach((R, ri) => fillLoops(G, [R.polygon], 'evenodd', (k) => { reg[k] = ri; inside[k] = 1; }));
  // the FRAME: each region's own bands (painted inside that region only)
  const F = new Uint8Array(N);
  I.regions.forEach((R, ri) => { for (const [a, b, r] of R.bands) capsule(G, a, b, r, (k) => { F[k] = 1; }, (k) => reg[k] === ri); });
  // a region the plan keeps SOLID (the pterostigma) is all frame
  I.regions.forEach((R, ri) => { if (R.solid) for (let k = 0; k < N; k++) if (reg[k] === ri) F[k] = 1; });
  // the LACE, warped and tiled, inside the regions
  const Lm = new Uint8Array(N);
  const M0 = laceMapper(I.pattern, I.spec, { outline: I.outline, span: I.span });
  const tiles = tilesFor(I.pattern, I.spec, M0);
  const maxSeg = 0.25;
  const mapSub = (pts, dx, dy, closed) => {
    const out = [[...M0.map(pts[0][0] + dx, pts[0][1] + dy), 1]];
    const n = pts.length, last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const rec = (pa, pb, ma, mb, depth) => {
        const mm = Math.hypot(mb[0] - ma[0], mb[1] - ma[1]);
        if (M0.linear || depth >= 9 || mm <= maxSeg) { const pl = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1e-12; out.push([mb[0], mb[1], mm / pl]); return; }
        const pm = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2], m = M0.map(pm[0] + dx, pm[1] + dy);
        rec(pa, pm, ma, m, depth + 1); rec(pm, pb, m, mb, depth + 1);
      };
      rec(a, b, out[out.length - 1], M0.map(b[0] + dx, b[1] + dy), 0);
    }
    if (closed) out.pop();
    return out;
  };
  const gx1 = G.gx + nx * px, gy1 = G.gy + ny * px;
  let painted = 0;
  for (const [dx, dy] of tiles) for (const e of I.pattern.elements) {
    const subs = e.subpaths.map((s) => ({ pts: mapSub(s.pts, dx, dy, s.closed || e.fill), closed: s.closed }));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of subs) for (const q of s.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    if (x1 < G.gx || x0 > gx1 || y1 < G.gy || y0 > gy1) continue;
    painted++;
    if (e.fill) fillLoops(G, subs.map((s) => s.pts), e.rule, (k) => { Lm[k] = 1; });
    if (e.stroke > 0) for (const s of subs) for (let i = 0; i + 1 < s.pts.length + (s.closed ? 1 : 0); i++) {
      const a = s.pts[i], b = s.pts[(i + 1) % s.pts.length], r = (e.stroke / 2) * (b[2] || a[2] || (M0.k || 1));
      capsule(G, a, b, r, (k) => { Lm[k] = 1; });
    }
  }
  for (let k = 0; k < N; k++) Lm[k] &= inside[k];
  // MATERIAL: frame + lace (the import), or the morph toward the procedural
  const b = clamp(I.spec.laceBlend, 0, 1);
  const M = new Uint8Array(N);
  for (let k = 0; k < N; k++) M[k] = F[k] | Lm[k];
  let seam = null;
  if (b < 1 && I.proc) {
    // BLEND: the procedural wing near the root, the import beyond an arc about
    // the middle of the root chord — the arc moving out from the root as the
    // blend falls (1: all import; toward 0: the import only at the margin; 0
    // never reaches here, the builder branches to the procedural wing). The
    // arc itself is a VEIN (frame), so the two halves meet on material and a
    // lace piece the arc cuts off is joined to it. A signed-distance MORPH of
    // the two materials was built first and refused on measurement: at blend
    // 0.25 / 0.5 / 0.75 on the default it thinned both drawings under the
    // floor (depth 1.55 / 1.00 / 2.50 mm) — a morph's middle is neither.
    const P = new Uint8Array(N);
    if (I.mode === 'holes') { for (let k = 0; k < N; k++) P[k] = inside[k]; fillLoops(G, I.proc.holes || [], 'nonzero', (k) => { P[k] = 0; }); }
    else { for (let k = 0; k < N; k++) P[k] = F[k]; for (const [a, c, r] of I.proc.capsules || []) capsule(G, a, c, r, (k) => { P[k] = 1; }, (k) => inside[k] === 1); }
    const O = I.outline;
    const rootPts = O.filter((q) => q[0] === 0), ou = 0, ow = rootPts.length ? rootPts.reduce((sm, q) => sm + q[1], 0) / rootPts.length : 0;
    let Rmax = 0; for (const [u, w] of O) Rmax = Math.max(Rmax, Math.hypot(u - ou, w - ow));
    const R = (1 - b) * Rmax, half = I.seamWidth / 2 + 1.5 * px;
    seam = { origin: [ou, ow], radius: R, width: I.seamWidth };
    for (let k = 0; k < N; k++) {
      if (!inside[k]) { M[k] = 0; continue; }
      const d = Math.hypot(G.cx(k % nx) - ou, G.cy(Math.floor(k / nx)) - ow);
      if (Math.abs(d - R) < half) { F[k] = 1; M[k] = 1; continue; }
      M[k] = F[k] || (d < R ? P[k] : Lm[k]) ? 1 : 0;
    }
  }
  // VOIDS too small to hold a minCellMm disc are filled (the HOLES rule)
  const fillSmallVoids = () => {
    const V = new Uint8Array(N); for (let k = 0; k < N; k++) V[k] = inside[k] && !M[k] ? 1 : 0;
    const notV = new Uint8Array(N); for (let k = 0; k < N; k++) notV[k] = V[k] ? 0 : 1;
    const dv = edt(notV, nx, ny), { lab, count } = label4(V, nx, ny), big = new Float64Array(count + 1);
    for (let k = 0; k < N; k++) if (lab[k] && dv[k] > big[lab[k]]) big[lab[k]] = dv[k];
    let n = 0; const need = (I.minCellMm / 2) / px;
    for (let k = 0; k < N; k++) if (lab[k] && big[lab[k]] < need) { M[k] = 1; n++; }
    return n;
  };
  let voidsFilled = fillSmallVoids();
  let saddles = fillSaddles(M, inside, nx, ny);
  // ISLANDS (HOLES only): material components with no frame pixel
  const stats = { tiles: tiles.length, painted, islandsFound: 0, dropped: 0, bridged: 0, kept: 0, voidsFilled: 0, saddles: 0, holes: 0, plates: 0 };
  const ties = [], islandsOut = [];
  let islandArea = [];
  const labelMaterial = () => { const L = label4(M, nx, ny), con = new Uint8Array(L.count + 1); for (let k = 0; k < N; k++) if (F[k] && L.lab[k]) con[L.lab[k]] = 1; return { ...L, con }; };
  if (I.mode === 'holes') {
    let LM = labelMaterial();
    const isl = []; for (let c = 1; c <= LM.count; c++) if (!LM.con[c]) isl.push(c);
    stats.islandsFound = isl.length;
    islandArea = isl.map((c) => LM.sizes[c] * px * px);
    if (isl.length && I.islands === 'drop') {
      const drop = new Set(isl.filter((c) => LM.sizes[c] * px * px < I.dropMm2));
      for (let k = 0; k < N; k++) if (drop.has(LM.lab[k])) M[k] = 0;
      stats.dropped = drop.size;
    } else if (isl.length && I.islands === 'bridge') {
      // one feature transform from the frame-connected material: every island
      // ties STRAIGHT to its nearest connected pixel (the straight segment
      // cannot leave the region: the region's edge is frame, and frame
      // nearer than the target would have been the target)
      const conn = new Uint8Array(N); for (let k = 0; k < N; k++) conn[k] = LM.lab[k] && LM.con[LM.lab[k]] ? 1 : 0;
      const { dist, near } = edt(conn, nx, ny, true);
      const best = new Map();
      for (let k = 0; k < N; k++) { const l = LM.lab[k]; if (!l || LM.con[l]) continue; const cur = best.get(l); if (cur === undefined || dist[k] < dist[cur]) best.set(l, k); }
      const r = Math.max(I.tieMm, I.floor) / 2 + 0.5 * px;
      for (const [l, k] of best) {
        const q = near[k], a = [G.cx(k % nx), G.cy(Math.floor(k / nx))], c = [G.cx(q % nx), G.cy(Math.floor(q / nx))], ri = reg[k];
        capsule(G, a, c, r, (kk) => { M[kk] = 1; }, (kk) => reg[kk] === ri);
        ties.push({ a, b: c, width: 2 * (r - 0.5 * px), island: l });
      }
      stats.bridged = best.size;
      voidsFilled += fillSmallVoids(); saddles += fillSaddles(M, inside, nx, ny);
    }
    stats.voidsFilled = voidsFilled; stats.saddles = saddles;
  } else { stats.voidsFilled = voidsFilled; stats.saddles = saddles; }

  // FLOOR: a raster opening of the final material by a floor-wide disc;
  // outside the wing counts as material (the outline has its own floor)
  const floorPx = I.floor / 2 / px;
  const V = new Uint8Array(N); for (let k = 0; k < N; k++) V[k] = inside[k] && !M[k] ? 1 : 0;
  const dVoid = edt(V, nx, ny);
  const C = new Uint8Array(N); for (let k = 0; k < N; k++) C[k] = dVoid[k] >= floorPx ? 1 : 0;
  const dC = edt(C, nx, ny);
  const covered = new Uint8Array(N); for (let k = 0; k < N; k++) covered[k] = dC[k] <= floorPx ? 1 : 0;
  const dCov = edt(covered, nx, ny);
  const thinMask = new Uint8Array(N); let depth = 0, thinPx = 0;
  for (let k = 0; k < N; k++) if (inside[k] && M[k] && !covered[k]) { thinMask[k] = 1; thinPx++; if (dCov[k] > depth) depth = dCov[k]; }
  const depthMm = depth * px, thin = depthMm > THIN_DEPTH_FRAC_LACE * I.floor;
  const thinLoops = thin ? (() => { const L = label4(thinMask, nx, ny), B = boxes(L.lab, L.count, nx, ny), out = []; for (let c = 1; c <= L.count; c++) { const lp = traceComp((k) => L.lab[k] === c, G, B[c]); if (lp.length) out.push(simplifyLoop(lp[0], px)); } return out; })() : [];

  // EXTRACT polygons
  const out = { seam, regions: [], islands: [], plates: [], ties, thin: { thin, depthMm, thinPx, loops: thinLoops }, stats, notes, grid: { nx, ny, px }, mapper: { warp: M0.warp, linear: M0.linear } };
  const LM = label4(M, nx, ny), con = new Uint8Array(LM.count + 1);
  for (let k = 0; k < N; k++) if (F[k] && LM.lab[k]) con[LM.lab[k]] = 1;
  if (I.mode === 'holes') {
    // per region: the holes of its frame-connected material (void AND any
    // island inside the void: a hole loop goes round both), then the islands
    I.regions.forEach((R, ri) => {
      const hm = new Uint8Array(N); let any = false;
      for (let k = 0; k < N; k++) if (reg[k] === ri && !(LM.lab[k] && con[LM.lab[k]])) { hm[k] = 1; any = true; }
      const holes = [];
      if (any) {
        const HL = label4(hm, nx, ny), B = boxes(HL.lab, HL.count, nx, ny);
        for (let c = 1; c <= HL.count; c++) { const lp = traceComp((k) => HL.lab[k] === c, G, B[c]); if (lp.length && Math.abs(polyArea(lp[0])) > px * px) holes.push(orientCCW(lp[0], true)); }
      }
      const isl = [];
      const IL = label4(new Uint8Array(N).map((_, k) => (reg[k] === ri && LM.lab[k] && !con[LM.lab[k]] ? 1 : 0)), nx, ny), IB = boxes(IL.lab, IL.count, nx, ny);
      for (let c = 1; c <= IL.count; c++) {
        const lp = traceComp((k) => IL.lab[k] === c, G, IB[c]);
        if (!lp.length) continue;
        isl.push({ loops: lp, area: IL.sizes[c] * px * px });
      }
      // one simplification across the region: holes, island outers and island holes together, against the exact region polygon
      const all = [...holes, ...isl.flatMap((x) => x.loops)];
      const simp = simplifySet(all, R.polygon, px);
      const sh = simp.slice(0, holes.length);
      let o = holes.length;
      const islands = isl.map((x) => { const L = simp.slice(o, o + x.loops.length); o += x.loops.length; return { outer: orientCCW(L[0], true), holes: L.slice(1).map((h) => orientCCW(h, true)), area: x.area, region: R.id }; });
      out.regions.push({ id: R.id, polygon: R.polygon, holes: sh, islands });
      out.islands.push(...islands);
      stats.holes += sh.length;
    });
    stats.kept = out.islands.length;
  } else {
    // RIDGES: every material component is a plate on the solid wing
    const B = boxes(LM.lab, LM.count, nx, ny);
    const raw = [];
    for (let c = 1; c <= LM.count; c++) { const lp = traceComp((k) => LM.lab[k] === c, G, B[c]); if (lp.length) raw.push(lp); }
    const flat = raw.flat(), simp = simplifySet(flat, null, px);
    let o = 0;
    for (const lp of raw) { const L = simp.slice(o, o + lp.length); o += lp.length; out.plates.push({ outer: orientCCW(L[0], true), holes: L.slice(1).map((h) => orientCCW(h, true)) }); }
    stats.plates = out.plates.length;
  }
  stats.islandAreas = islandArea;
  stats.ms = Date.now() - t0;
  return out;
}
