/* frame-svg-import.js — the hand-drawn filigree's IMPORTER (Nov 14): reads an
   SVG of drawn ornament elements into each element's own frame, and says what
   is wrong with it. Pure, no DOM (it runs in Node and in the page alike); every
   transcendental through frame-math.js. Read docs/frame-drawing-guide.md first:
   it is the contract this file implements, written for the person drawing.

   THE FILE. One SVG (docs/frame-drawing-template.svg is the template). Each
   ELEMENT is a group named `<kind>-<n>` — c-scroll, s-scroll, volute, flame,
   shell, foot, leaf — and inside it, groups (layers) named by ROLE:
     outline          closed filled shapes, unioned (the element's body), at the
                      kind's default depth; outline-back / outline-mid /
                      outline-front put a part at another depth;
     detail / ridge   stroked lines that become RAISED ridges in the relief
                      (a midrib, veins, a reed, an arris);
     groove           stroked lines that become INCISED grooves;
     holes            closed shapes cut THROUGH the relief (an eye, a slit);
     guides           not built: `root` (a circle — the element's origin),
                      `size` (a rect — the size box at the default scale),
                      `ruler` (a rect or line one printable floor long:
                      1 mm at a 180 mm print), `rigid` (if present, the
                      element is placed whole and never bent), anything else.
   A group's NAME is its inkscape:label, its data-name, or its id, read the way
   Illustrator writes them (`_x2D_` escapes decoded, a trailing `_2_`
   duplicate suffix dropped), lower-cased.

   THE ELEMENT'S FRAME. The `root` circle's centre is the origin; the element
   grows along +x (to the right on the page); y is UP the page (the SVG's y
   flipped). "Up" is the side the element's end curls toward. The `size` box,
   in the same frame, is what the generator fits to its slot. The `ruler`
   fixes the file's units: its longer side is 1 mm at the default 180 mm print.

   What it returns: { unitsPerMm, elements: [{ name, kind, n, rigid, root,
   size: {x0,x1,y0,y1}, parts: [{ depth, rings: [[x,y],...] }], holes: [rings],
   ridges: [polylines], grooves: [polylines] }], problems: [{ level, element,
   message }] } — every coordinate in MILLIMETRES at the default print, in the
   element's own frame. */

import * as FM from './frame-math.js';

export const KINDS = ['c-scroll', 's-scroll', 'volute', 'flame', 'shell', 'foot', 'leaf'];
export const DEPTHS = ['back', 'mid', 'front'];
const ROLE = /^(outline(?:-(back|mid|front))?|detail|ridge|groove|holes?|guides?)$/;
const ELEMENT = new RegExp(`^(${KINDS.join('|')})-(\\d+)$`);
// a layer or guide may carry its element's name as a prefix (`flame-2-outline`, `flame-2-root`) so ids stay unique
const unprefix = (nm) => nm.replace(new RegExp(`^(${KINDS.join('|')})-\\d+-`), '');

/* ------------------------------------------------------------------ */
/* a small XML reader: tags, attributes, nesting (no text, no entities) */
/* ------------------------------------------------------------------ */
function parseXml(src) {
  const root = { tag: '#root', attrs: {}, kids: [] }, stack = [root];
  const text = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(text))) {
    const [, close, tag, attrSrc, self] = m;
    if (close) { const t = tag.replace(/^svg:/, ''); let k = stack.length - 1; while (k > 0 && stack[k].tag !== t) k--; if (k > 0) stack.length = k; continue; }
    const attrs = {}, ar = /([^\s=>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let a; while ((a = ar.exec(attrSrc))) attrs[a[1]] = a[2] !== undefined ? a[2] : a[3];
    const node = { tag: tag.replace(/^svg:/, ''), attrs, kids: [] };
    stack[stack.length - 1].kids.push(node);
    if (!self && !/^(path|rect|circle|ellipse|line|polyline|polygon|use|image)$/.test(node.tag)) stack.push(node);
  }
  return root;
}

/* a node's NAME, Illustrator's and Inkscape's spellings read alike */
export function nodeName(attrs) {
  let s = attrs['inkscape:label'] || attrs['data-name'] || attrs.id || '';
  s = s.replace(/_x([0-9A-Fa-f]{2,4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/_\d+_$/, '').trim().toLowerCase().replace(/\s+/g, '-');
  return s;
}

/* ------------------------------------------------------------------ */
/* transforms (2×3 affine: [a b c d e f], x' = a x + c y + e)          */
/* ------------------------------------------------------------------ */
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const app = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const ID = [1, 0, 0, 1, 0, 0];
const nums = (s) => (String(s || '').match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || []).map(Number);
function parseTransform(src) {
  let m = ID;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(src || ''))) {
    const v = nums(t[2]); let k = ID;
    if (t[1] === 'matrix') k = v.slice(0, 6);
    else if (t[1] === 'translate') k = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (t[1] === 'scale') k = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
    else if (t[1] === 'rotate') {
      const a = (v[0] || 0) * Math.PI / 180, c = FM.cos(a), s = FM.sin(a);
      k = [c, s, -s, c, 0, 0];
      if (v.length >= 3) k = mul(mul([1, 0, 0, 1, v[1], v[2]], k), [1, 0, 0, 1, -v[1], -v[2]]);
    } else if (t[1] === 'skewX') k = [1, 0, FM.tan((v[0] || 0) * Math.PI / 180), 1, 0, 0];
    else k = [1, FM.tan((v[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    m = mul(m, k);
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* shapes to subpaths: { pts, closed }, curves flattened to `tol` units */
/* ------------------------------------------------------------------ */
function flatCubic(out, p0, p1, p2, p3, tol) {
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  const n = Math.max(2, Math.min(400, Math.ceil(L / tol)));
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
}
function flatArc(out, p0, rx, ry, phiDeg, large, sweep, p1, tol) {
  // the SVG arc's endpoint form to its centre form (SVG 1.1 F.6.5)
  if (rx === 0 || ry === 0) { out.push(p1); return; }
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = phiDeg * Math.PI / 180, cp = FM.cos(phi), sp = FM.sin(phi);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2, x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
  let lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = co * rx * y1 / ry, cy1 = -co * ry * x1 / rx;
  const cx = cp * cx1 - sp * cy1 + (p0[0] + p1[0]) / 2, cy = sp * cx1 + cp * cy1 + (p0[1] + p1[1]) / 2;
  const ang = (ux, uy, vx, vy) => FM.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.min(400, Math.ceil(Math.abs(dt) * Math.max(rx, ry) / tol)));
  for (let i = 1; i <= n; i++) {
    const t = t1 + dt * i / n, ex = rx * FM.cos(t), ey = ry * FM.sin(t);
    out.push(i === n ? p1 : [cx + cp * ex - sp * ey, cy + sp * ex + cp * ey]);
  }
}
export function pathSubpaths(d, tol = 0.5) {
  const toks = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const subs = []; let cur = null, i = 0, cmd = null, p = [0, 0], start = [0, 0], lastC = null, lastQ = null;
  const num = () => Number(toks[i++]);
  const isNum = () => i < toks.length && !/^[A-Za-z]$/.test(toks[i]);
  const begin = (q) => { if (cur && cur.pts.length) subs.push(cur); cur = { pts: [q], closed: false }; start = q; };
  while (i < toks.length) {
    if (/^[A-Za-z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const pt = (x, y) => (rel ? [p[0] + x, p[1] + y] : [x, y]);
    if (C === 'Z') { if (cur) { cur.closed = true; subs.push(cur); cur = null; } p = start; lastC = lastQ = null; continue; }
    if (C === 'M') { const q = pt(num(), num()); begin(q); p = q; cmd = rel ? 'l' : 'L'; lastC = lastQ = null; continue; }
    if (!cur) begin(p);
    if (C === 'L') { const q = pt(num(), num()); cur.pts.push(q); p = q; lastC = lastQ = null; }
    else if (C === 'H') { const x = num(), q = [rel ? p[0] + x : x, p[1]]; cur.pts.push(q); p = q; lastC = lastQ = null; }
    else if (C === 'V') { const y = num(), q = [p[0], rel ? p[1] + y : y]; cur.pts.push(q); p = q; lastC = lastQ = null; }
    else if (C === 'C') { const a = pt(num(), num()), b = pt(num(), num()), q = pt(num(), num()); flatCubic(cur.pts, p, a, b, q, tol); lastC = b; lastQ = null; p = q; }
    else if (C === 'S') { const a = lastC ? [2 * p[0] - lastC[0], 2 * p[1] - lastC[1]] : p, b = pt(num(), num()), q = pt(num(), num()); flatCubic(cur.pts, p, a, b, q, tol); lastC = b; lastQ = null; p = q; }
    else if (C === 'Q') { const a = pt(num(), num()), q = pt(num(), num()); flatCubic(cur.pts, p, [p[0] + 2 / 3 * (a[0] - p[0]), p[1] + 2 / 3 * (a[1] - p[1])], [q[0] + 2 / 3 * (a[0] - q[0]), q[1] + 2 / 3 * (a[1] - q[1])], q, tol); lastQ = a; lastC = null; p = q; }
    else if (C === 'T') { const a = lastQ ? [2 * p[0] - lastQ[0], 2 * p[1] - lastQ[1]] : p, q = pt(num(), num()); flatCubic(cur.pts, p, [p[0] + 2 / 3 * (a[0] - p[0]), p[1] + 2 / 3 * (a[1] - p[1])], [q[0] + 2 / 3 * (a[0] - q[0]), q[1] + 2 / 3 * (a[1] - q[1])], q, tol); lastQ = a; lastC = null; p = q; }
    else if (C === 'A') { const rx = num(), ry = num(), ph = num(), la = num(), sw = num(), q = pt(num(), num()); flatArc(cur.pts, p, rx, ry, ph, la ? 1 : 0, sw ? 1 : 0, q, tol); p = q; lastC = lastQ = null; }
    else { i++; continue; }
  }
  if (cur && cur.pts.length) subs.push(cur);
  // a subpath whose last point is its first is closed
  for (const s of subs) { const a = s.pts[0], b = s.pts[s.pts.length - 1]; if (s.pts.length > 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6 * (1 + Math.abs(a[0]) + Math.abs(a[1]))) { s.pts.pop(); s.closed = true; } if (s.closed && s.pts.length > 2) { const c = s.pts[s.pts.length - 1]; if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1e-9) s.pts.pop(); } }
  return subs;
}
function shapeSubpaths(node, tol) {
  const A = node.attrs, f = (k, d = 0) => (A[k] === undefined ? d : Number(A[k]));
  switch (node.tag) {
    case 'path': return pathSubpaths(A.d, tol);
    case 'polygon': case 'polyline': { const v = nums(A.points), pts = []; for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]]); return pts.length ? [{ pts, closed: node.tag === 'polygon' }] : []; }
    case 'line': return [{ pts: [[f('x1'), f('y1')], [f('x2'), f('y2')]], closed: false }];
    case 'rect': { const x = f('x'), y = f('y'), w = f('width'), h = f('height'); return w > 0 && h > 0 ? [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }] : []; }
    case 'circle': case 'ellipse': {
      const cx = f('cx'), cy = f('cy'), rx = node.tag === 'circle' ? f('r') : f('rx'), ry = node.tag === 'circle' ? f('r') : f('ry');
      if (!(rx > 0 && ry > 0)) return [];
      const n = Math.max(16, Math.min(720, Math.ceil(2 * Math.PI * Math.max(rx, ry) / tol))), pts = [];
      for (let k = 0; k < n; k++) { const t = 2 * Math.PI * k / n; pts.push([cx + rx * FM.cos(t), cy + ry * FM.sin(t)]); }
      return [{ pts, closed: true, circle: { cx, cy, r: (rx + ry) / 2 } }];
    }
    default: return [];
  }
}

/* every drawable with its ancestors' names and its transform */
function walkShapes(node, ctm, names, out) {
  const m = node.attrs && node.attrs.transform ? mul(ctm, parseTransform(node.attrs.transform)) : ctm;
  const nm = node.tag === '#root' ? null : nodeName(node.attrs || {});
  const chain = nm ? [...names, nm] : names;
  if (/^(path|polygon|polyline|line|rect|circle|ellipse)$/.test(node.tag)) out.push({ node, ctm: m, names: chain });
  if (node.tag === 'defs' || node.tag === 'clipPath' || node.tag === 'mask' || node.tag === 'symbol') return;
  for (const k of node.kids) walkShapes(k, m, chain, out);
}

/* ------------------------------------------------------------------ */
/* geometry checks on a ring (the element's frame, mm)                 */
/* ------------------------------------------------------------------ */
const segX = (a, b, c, d) => {
  const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]), d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
  const d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]), d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};
/* the ring's self-crossings (non-adjacent edges that cross), up to `cap` */
export function selfCrossings(ring, cap = 5) {
  const n = ring.length, out = [];
  const box = ring.map((a, i) => { const b = ring[(i + 1) % n]; return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; });
  for (let i = 0; i < n && out.length < cap; i++) for (let j = i + 2; j < n && out.length < cap; j++) {
    if (i === 0 && j === n - 1) continue;
    const A = box[i], B = box[j];
    if (A[1] < B[0] || B[1] < A[0] || A[3] < B[2] || B[3] < A[2]) continue;
    if (segX(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) out.push(ring[i]);
  }
  return out;
}
export const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const ringBox = (rs) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const r of rs) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1 }; };
export function pointInRing(q, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
/* the least distance between two rings' boundaries (0 if they cross) */
export function ringGap(A, B) {
  let d = Infinity;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
    const a = A[i], a2 = A[(i + 1) % A.length], b = B[j], b2 = B[(j + 1) % B.length];
    if (segX(a, a2, b, b2)) return 0;
    d = Math.min(d, segDist(a, b, b2), segDist(b, a, a2));
  }
  return d;
}
/* the least width of a ring: twice the largest distance from its inside to its edge, on a lattice — a conservative
   reading of "is this hole at least the floor across" */
export function ringInWidth(r, step = 0.1) {
  const b = ringBox([r]); let best = 0;
  for (let x = b.x0 + step / 2; x < b.x1; x += step) for (let y = b.y0 + step / 2; y < b.y1; y += step) {
    if (!pointInRing([x, y], r)) continue;
    let m = Infinity; for (let i = 0; i < r.length; i++) m = Math.min(m, segDist([x, y], r[i], r[(i + 1) % r.length]));
    if (m > best) best = m;
  }
  return 2 * best;
}

/* ------------------------------------------------------------------ */
/* the import                                                          */
/* ------------------------------------------------------------------ */
export function importDrawing(svgText, { floorMm = 1.0, tolMm = 0.04 } = {}) {
  const problems = [], say = (level, element, message) => problems.push({ level, element, message });
  const doc = parseXml(svgText), shapes = [];
  walkShapes(doc, ID, [], shapes);
  // the units: the first `ruler` (its longer side 1 mm at the default print)
  const rulers = shapes.filter((s) => s.names.includes('ruler'));
  let unitsPerMm = 10;
  if (rulers.length) {
    const r = rulers[0], sub = shapeSubpaths(r.node, 1e9)[0];
    const P = sub.pts.map((q) => app(r.ctm, q)), b = ringBox([P]);
    unitsPerMm = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    if (!(unitsPerMm > 0)) { unitsPerMm = 10; say('error', null, 'the ruler has no length — units assumed 10 per mm'); }
  } else say('warn', null, 'no `ruler` guide found — units assumed 10 per mm (the template\'s)');
  const tol = tolMm * unitsPerMm;
  // group the shapes by element (the nearest ancestor named <kind>-<n>) and role (the nearest role-named layer)
  const byEl = new Map();
  for (const s of shapes) {
    const ei = s.names.findIndex((nm) => ELEMENT.test(nm)); if (ei < 0) continue;
    const name = s.names[ei];
    let role = null, depth = null;
    for (let k = s.names.length - 1; k > ei; k--) { const m = ROLE.exec(unprefix(s.names[k])); if (m) { role = m[1].replace(/^holes?$/, 'holes').replace(/^guides?$/, 'guides').replace(/^ridge$/, 'detail'); depth = m[2] || null; if (role.startsWith('outline')) role = 'outline'; break; } }
    const leaf = unprefix(s.names[s.names.length - 1]);
    if (!byEl.has(name)) byEl.set(name, []);
    byEl.get(name).push({ ...s, role, depth, leaf });
  }
  const elements = [];
  for (const [name, list] of byEl) {
    const [, kind, nStr] = ELEMENT.exec(name), n = Number(nStr);
    const rootShape = list.find((s) => s.role === 'guides' && s.leaf === 'root') || list.find((s) => s.leaf === 'root');
    let root = null;
    // the root: a circle's own centre (the box of its flattened polygon is off by the flattening), else the shape's box centre
    if (rootShape) { const sub = shapeSubpaths(rootShape.node, tol)[0]; if (sub) { if (sub.circle) root = app(rootShape.ctm, [sub.circle.cx, sub.circle.cy]); else { const P = sub.pts.map((q) => app(rootShape.ctm, q)), b = ringBox([P]); root = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; } } }
    if (!root) { say('error', name, 'no `root` guide (a small circle at the element\'s origin) — the element is skipped'); continue; }
    // the element's frame: origin at the root, x to the right, y UP the page, millimetres
    const toEl = (q) => [(q[0] - root[0]) / unitsPerMm, (root[1] - q[1]) / unitsPerMm];
    const sizeShape = list.find((s) => s.leaf === 'size');
    let size = null;
    if (sizeShape) { const sub = shapeSubpaths(sizeShape.node, tol)[0]; if (sub) size = ringBox([sub.pts.map((q) => toEl(app(sizeShape.ctm, q)))]); }
    const el = { name, kind, n, rigid: list.some((s) => s.leaf === 'rigid'), root, size, parts: [], holes: [], ridges: [], grooves: [] };
    const partBy = new Map();
    for (const s of list) {
      if (!s.role || s.role === 'guides') { if (!s.role && !['root', 'size', 'ruler', 'rigid'].includes(s.leaf)) say('warn', name, `a shape outside any role layer (outline / detail / groove / holes / guides) is ignored`); continue; }
      for (const sub of shapeSubpaths(s.node, tol)) {
        const P = sub.pts.map((q) => toEl(app(s.ctm, q)));
        if (s.role === 'outline' || s.role === 'holes') {
          if (!sub.closed) say('error', name, `an open path in \`${s.role}\` (every ${s.role === 'holes' ? 'hole' : 'outline'} must be closed) — closed for the build`);
          if (P.length < 3) continue;
          const xs = selfCrossings(P, 1);
          if (xs.length) say('error', name, `${s.role === 'holes' ? 'a hole' : 'an outline'} crosses itself near (${xs[0][0].toFixed(2)}, ${xs[0][1].toFixed(2)}) mm`);
          if (Math.abs(ringArea(P)) < 1e-6) continue;
          if (s.role === 'holes') el.holes.push(P);
          else { const d = s.depth || null; if (!partBy.has(d)) partBy.set(d, []); partBy.get(d).push(P); }
        } else (s.role === 'groove' ? el.grooves : el.ridges).push(P);
      }
    }
    for (const [depth, rings] of partBy) el.parts.push({ depth, rings });
    if (!el.parts.length) { say('error', name, 'no closed outline — the element is skipped'); continue; }
    if (!size) { size = ringBox(el.parts.flatMap((p) => p.rings)); el.size = size; say('warn', name, 'no `size` guide — the outline\'s own box is fitted to the slot'); }
    // the floor: every hole at least `floorMm` across; outline pieces of one element either joined or ≥ the floor apart
    for (const h of el.holes) { const w = ringInWidth(h, Math.min(0.1, floorMm / 8)); if (w < floorMm - 1e-6) say('error', name, `a hole ${w.toFixed(2)} mm across — under the ${floorMm} mm floor (it would print shut)`); }
    const rings = el.parts.flatMap((p) => p.rings);
    for (let i = 0; i < rings.length; i++) for (let j = i + 1; j < rings.length; j++) {
      const bi = ringBox([rings[i]]), bj = ringBox([rings[j]]);
      if (bi.x0 - floorMm > bj.x1 || bj.x0 - floorMm > bi.x1 || bi.y0 - floorMm > bj.y1 || bj.y0 - floorMm > bi.y1) continue;
      const g = ringGap(rings[i], rings[j]);
      if (g > 1e-6 && g < floorMm) { const inside = pointInRing(rings[j][0], rings[i]) || pointInRing(rings[i][0], rings[j]); if (!inside) say('warn', name, `two outline pieces ${g.toFixed(2)} mm apart — under the ${floorMm} mm floor (they will print fused, or as a sliver)`); }
    }
    // a ring wholly inside another is a hole drawn in the outline layer by mistake (outlines are unioned)
    for (let i = 0; i < rings.length; i++) for (let j = 0; j < rings.length; j++) if (i !== j && Math.abs(ringArea(rings[j])) < Math.abs(ringArea(rings[i])) && rings[j].every((q) => pointInRing(q, rings[i]))) { say('warn', name, 'an outline piece lies wholly inside another — outlines are unioned; a hole belongs in `holes`'); i = rings.length; break; }
    elements.push(el);
  }
  for (const k of KINDS) if (!elements.some((e) => e.kind === k) && k !== 'leaf') say('warn', null, `no ${k} drawn — its slots fall back to the nearest kind that is`);
  return { unitsPerMm, elements, problems };
}
