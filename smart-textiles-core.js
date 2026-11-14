// smart-textiles-core.js — the drawing kit and player behind /smart-textiles.html (Field Notes No. 09).
//
// A scene is { vb: 'x y w h', dur: ms per loop, draw(t, state) -> svg markup, state?: {} }.
// t runs 0 -> 1 and WRAPS: every scene on this page loops for as long as it is on screen (Eva: "nothing
// should be static"), unlike /dyeing's play-once-and-hold. draw() is a pure function of (t, state), so a
// frame can be baked in Node for checking.
//
// COLOUR: every mark strokes var(--st-*) or a site token. Material colours (silver, copper, steel, carbon,
// PEDOT, thermochromic ink) are content per DESIGN.md rule 10 and live on #smart in smart-textiles.css;
// abstract states use the companions (petrol = current / electrons, plum = hot / strained / high,
// indigo = cool / relaxed / low, mint = signal). SVG text is ink or dim only.

export const TAU = Math.PI * 2;
export const C = {
  ink: 'var(--ink, #e9ecec)', ink2: 'var(--color-ink-2, #a7afaf)', dim: 'var(--ink-dim, #8b9494)',
  faint: 'var(--ink-faint, #565f5f)', line: 'var(--line-strong, #34393a)', hair: 'var(--line, #232727)',
  bg: 'var(--black, #060707)', raised: 'var(--black-raised, #0c0e0e)',
  petrol: 'var(--petrol-bright, #2fa3a3)', deep: 'var(--petrol, #1c6b6b)', seafoam: 'var(--color-seafoam, #6fb7ae)',
  plum: 'var(--color-plum, #a98cc8)', indigo: 'var(--color-indigo, #7880d8)', mint: 'var(--color-mint, #b3dbb4)',
  silver: 'var(--st-silver)', copper: 'var(--st-copper)', steel: 'var(--st-steel)', carbon: 'var(--st-carbon)',
  pedot: 'var(--st-pedot)', inkCold: 'var(--st-thermo-cold)', inkHot: 'var(--st-thermo-hot)', magnet: 'var(--st-magnet)',
  skin: 'var(--st-skin)', muscle: 'var(--st-muscle)', ceramic: 'var(--st-ceramic)',
};

// ---------- numbers ----------
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const eseg = (t, a, b) => ease(seg(t, a, b));
export const f1 = v => Math.round(v * 10) / 10;
export const fr = (v) => v - Math.floor(v);
// a 0 -> 1 -> 0 pulse: rises over [a, b], holds to c, falls by d
export const pulse = (t, a, b, c, d) => t < a ? 0 : t < b ? ease((t - a) / (b - a)) : t < c ? 1 : t < d ? 1 - ease((t - c) / (d - c)) : 0;
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// colour k of the way from a to b (k 0..1), whole percent
export const mix = (a, b, k) => k <= 0.005 ? a : k >= 0.995 ? b : `color-mix(in srgb, ${b} ${Math.round(k * 100)}%, ${a})`;

// ---------- markup ----------
export const poly = pts => pts.length < 2 ? '' : 'M' + pts.map(p => f1(p.x) + ',' + f1(p.y)).join('L');
const attrs = o => Object.entries(o).filter(([, v]) => v != null && v !== false).map(([k, v]) => ` ${k}="${typeof v === 'number' ? f1(v) : v}"`).join('');
export const el = (tag, o, inner) => inner == null ? `<${tag}${attrs(o)}/>` : `<${tag}${attrs(o)}>${inner}</${tag}>`;
export const path = (d, o = {}) => el('path', { d, fill: 'none', ...o });
export const line = (x1, y1, x2, y2, o = {}) => el('line', { x1, y1, x2, y2, stroke: C.line, ...o });
export const rect = (x, y, w, h, o = {}) => el('rect', { x, y, width: w, height: h, ...o });
export const circ = (cx, cy, r, o = {}) => el('circle', { cx, cy, r, ...o });
export const grp = (inner, o = {}) => el('g', o, inner);
export function txt(x, y, s, o = {}) {
  return `<text x="${f1(x)}" y="${f1(y)}" fill="${o.fill || C.dim}" font-family="var(--mono, monospace)" font-size="${o.size || 9}"`
    + `${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.op != null ? ` fill-opacity="${o.op}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${s}</text>`;
}
// small caps label used for diagram parts
export const tag = (x, y, s, o = {}) => txt(x, y, s.toUpperCase().replace(/\u039c/g, '\u00b5'), { size: 7.5, ls: 0.8, ...o });
// a leader line + label
export function callout(x1, y1, x2, y2, s, o = {}) {
  const anchor = o.anchor || (x2 >= x1 ? 'start' : 'end');
  return line(x1, y1, x2, y2, { stroke: C.faint, 'stroke-width': 0.7 }) + circ(x1, y1, 1.3, { fill: C.dim })
    + tag(x2 + (anchor === 'start' ? 3 : anchor === 'end' ? -3 : 0), y2 + 2.5, s, { anchor, ...o });
}
// a stroke on a background-coloured halo, so crossings read as over / under
export function strand(d, color, sw = 1.4, o = {}) {
  const halo = o.halo ?? 1.1;
  return (halo ? path(d, { stroke: o.haloColor || C.bg, 'stroke-width': sw + 2 * halo, 'stroke-linecap': o.cap || 'round', 'stroke-linejoin': 'round' }) : '')
    + path(d, { stroke: color, 'stroke-width': sw, 'stroke-linecap': o.cap || 'round', 'stroke-linejoin': 'round', 'stroke-opacity': o.op != null && o.op < 1 ? o.op : null, 'stroke-dasharray': o.dash || null });
}
export function arrow(x1, y1, x2, y2, o = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = o.head || 4, col = o.color || C.dim;
  return line(x1, y1, x2, y2, { stroke: col, 'stroke-width': o.sw || 1, 'stroke-opacity': o.op ?? null })
    + path(`M${f1(x2 - s * Math.cos(a - 0.5))},${f1(y2 - s * Math.sin(a - 0.5))}L${f1(x2)},${f1(y2)}L${f1(x2 - s * Math.cos(a + 0.5))},${f1(y2 - s * Math.sin(a + 0.5))}`, { stroke: col, 'stroke-width': o.sw || 1, 'stroke-opacity': o.op ?? null });
}

// ---------- polylines ----------
export function measure(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return cum;
}
export function at(pts, cum, s) {         // s in [0, 1] of the arc length
  const L = cum[cum.length - 1], d = clamp(s) * L;
  let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
  const k = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = pts[i - 1], b = pts[i];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
}
// electrons drifting along a polyline: n dots, spaced evenly, moving `laps` lengths per loop
export function electrons(pts, t, o = {}) {
  const cum = o.cum || measure(pts), n = o.n || 8, laps = o.laps ?? 1, r = o.r || 1.5, col = o.color || C.petrol;
  let s = '';
  for (let i = 0; i < n; i++) {
    let u = fr(i / n + t * laps + (o.phase || 0)); if (o.reverse) u = 1 - u;
    if (o.jitter) u = clamp(u + Math.sin(i * 12.9 + t * TAU * 3) * o.jitter);
    const p = at(pts, cum, u);
    const fade = o.fadeEnds ? Math.min(1, u / 0.08, (1 - u) / 0.08) : 1;
    s += circ(p.x, p.y, r, { fill: col, 'fill-opacity': (o.op ?? 1) * fade < 1 ? f1((o.op ?? 1) * fade * 100) / 100 : null });
  }
  return s;
}
// sample a function into points
export const sample = (n, fn) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

// a helix about a horizontal axis: returns front and back runs (depth by cos)
export function helixRuns(x0, x1, yc, R, pitch, phase, o = {}) {
  const n = o.n || Math.ceil((x1 - x0) / 1.5), runs = [];
  let cur = [], front = null;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n), th = TAU * (x - x0) / pitch + phase;
    const yr = typeof R === 'function' ? R(x) : R;
    const p = { x, y: yc + yr * Math.sin(th) * (o.sign || 1) }, f = Math.cos(th) >= 0;
    if (front === null) front = f;
    if (f !== front) { cur.push(p); runs.push({ pts: cur, front }); cur = [p]; front = f; } else cur.push(p);
  }
  if (cur.length > 1) runs.push({ pts: cur, front });
  return runs;
}

// ---------- plots ----------
// A live read-out: a framed plot whose trace is drawn up to "now" (u) and ghosted after it.
//   mode 'time': y = f(u) for u in [0, 1] across the plot; the cursor sweeps with the scene's loop
//   mode 'xy':   p = curve(u) -> {x, y} in [0, 1]^2; drawn up to u (a hysteresis loop, a sweep)
export function plot(o) {
  const { x, y, w, h } = o, u = o.u ?? 0, n = o.n || 90, col = o.color || C.petrol;
  const X = v => x + v * w, Y = v => y + h - clamp(v, -0.05, 1.05) * h;
  let s = rect(x, y, w, h, { fill: C.raised, stroke: C.hair, 'stroke-width': 0.8, rx: 2 });
  for (const g of (o.grid || [0.25, 0.5, 0.75])) s += line(x, Y(g), x + w, Y(g), { stroke: C.hair, 'stroke-width': 0.5 });
  if (o.ref != null) for (const r of [].concat(o.ref)) s += line(x, Y(r.v ?? r), x + w, Y(r.v ?? r), { stroke: r.color || C.faint, 'stroke-width': 0.8, 'stroke-dasharray': '3 2' }) + (r.label ? tag(x + w - 2, Y(r.v) - 2, r.label, { anchor: 'end', size: 6.5 }) : '');
  const series = o.series || [{ f: o.f, curve: o.curve, color: col }];
  for (const sr of series) {
    const c = sr.color || col, pts = [], ghost = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n, p = sr.curve ? sr.curve(v) : { x: v, y: sr.f(v) };
      const q = { x: X(p.x), y: Y(p.y) };
      if (o.full || v <= u) pts.push(q); else ghost.push(q);
    }
    if (o.mode !== 'xy' || sr.ghost) {
      const gp = o.mode === 'xy' ? sample(n, v => { const p = sr.curve(v); return { x: X(p.x), y: Y(p.y) }; }) : [pts[pts.length - 1], ...ghost].filter(Boolean);
      s += path(poly(gp), { stroke: c, 'stroke-width': 1, 'stroke-opacity': 0.22 });
    }
    s += path(poly(pts), { stroke: c, 'stroke-width': sr.sw || 1.4, 'stroke-dasharray': sr.dash || null });
    const p = sr.curve ? sr.curve(u) : { x: u, y: sr.f(u) };
    if (!sr.noDot) s += circ(X(p.x), Y(p.y), 2.2, { fill: c, stroke: C.bg, 'stroke-width': 0.8 });
  }
  if (o.title) s += tag(x, y - 4, o.title, { fill: C.dim });
  if (o.readout) s += txt(x + w, y - 4, o.readout, { anchor: 'end', size: 8, fill: C.ink });
  if (o.yl) s += tag(x - 3, y + 7, o.yl, { anchor: 'end', size: 6.5 });
  if (o.yl0) s += tag(x - 3, y + h, o.yl0, { anchor: 'end', size: 6.5 });
  if (o.xl) s += tag(x + w, y + h + 8, o.xl, { anchor: 'end', size: 6.5 });
  if (o.xl0) s += tag(x, y + h + 8, o.xl0, { size: 6.5 });
  return s;
}

// ---------- player ----------
// <figure data-st="name"> hosts get an <svg>; a single rAF loop draws only the scenes on screen
// (~30 fps; the markup is rebuilt each frame, which is cheap at this size). Controls:
// <button data-st-for="name" data-st-key="k" data-st-value="v"> sets state (a choice), or toggles it
// without data-st-value. prefers-reduced-motion: one still frame per scene, and a click plays it.
// Narrow screens (opts.textFloor, the study page). A scene shown narrower than its `narrow.below` (560 px by
// default) is laid out again from the markup its draw() returns, so a read-out and the drawing it describes
// can't disagree; the layout only decides what sits where:
//   narrow.panels   [x, y, w, h] windows onto the drawing, stacked one above the next (default: the whole vb)
//   narrow.readout  [x, y, w, h] boxes whose text leaves the drawing and is set as lines of HTML under it,
//                   where it wraps instead of running off the side
// In every window a label that would render under MIN_TEXT_PX is enlarged to it, and a drawing shown whole
// (any width, any scene) gets the same floor. st._narrow tells a scene which layout it is drawing for.
export const MIN_TEXT_PX = 10;
export const NARROW_W = 340, PANEL_GAP = 12;
export function floorText(markup, w, px, floorPx = MIN_TEXT_PX) {
  const floor = floorPx * 1.02 * w / px;   // units per rendered px is w / px
  return markup.replace(/font-size="([\d.]+)"/g, (a, v) => +v < floor ? `font-size="${floor.toFixed(2)}"` : a);
}
const TEXT_RE = /<text x="([-\d.]+)" y="([-\d.]+)" fill="([^"]*)"[^>]*?font-size="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
export function splitReadout(markup, boxes) {
  const lines = [];
  const rest = markup.replace(TEXT_RE, (all, x, y, fill, size, s) => {
    const inBox = boxes.some(([x0, y0, w, h]) => +x >= x0 && +x <= x0 + w && +y >= y0 && +y <= y0 + h);
    if (!inBox || !s.trim()) return all;
    lines.push({ x: +x, y: +y, fill, size: +size, s });
    return '';
  });
  lines.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const l of lines) { const r = rows[rows.length - 1]; if (r && Math.abs(r.y - l.y) < 4) r.parts.push(l); else rows.push({ y: l.y, parts: [l] }); }
  const html = rows.map(r => `<p>${r.parts.map(q => `<span style="color:${q.fill}"${q.size >= 12 ? ' data-big' : ''}>${q.s}</span>`).join(' ')}</p>`).join('');
  return { rest, html, n: lines.length };
}
export function narrowMarkup(markup, panels, px, floorPx = MIN_TEXT_PX) {
  let y = 0, out = '';
  for (const [x0, y0, w, h] of panels) {
    const ph = h * NARROW_W / w;
    out += `<svg x="0" y="${f1(y)}" width="${NARROW_W}" height="${f1(ph)}" viewBox="${x0} ${y0} ${w} ${h}" overflow="hidden" data-panel="${x0} ${y0} ${w} ${h}">${floorText(markup, w, px, floorPx)}</svg>`;
    y += ph + PANEL_GAP;
  }
  return { vb: `0 0 ${NARROW_W} ${f1(y - PANEL_GAP)}`, out };
}
export function mount(SCENES, root = document, opts = {}) {
  const reduce = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const players = [];
  for (const host of root.querySelectorAll('[data-st]')) {
    const name = host.dataset.st, scene = SCENES[name];
    if (!scene) { console.warn('[smart-textiles] no scene', name); continue; }
    const holder = host.querySelector('.st-anim') || host;
    const svg = holder.querySelector('svg') || holder.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.setAttribute('viewBox', scene.vb);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const p = { name, host, svg, scene, state: { ...(scene.state || {}) }, t0: performance.now() - (scene.offset || 0) * scene.dur, last: -1e9, visible: false, running: !reduce, px: 0, narrow: false };
    const [, , vw, vh] = scene.vb.split(/\s+/).map(Number);
    const panels = scene.narrow?.panels || [[0, 0, vw, vh]];
    p.draw = t => {
      try {
        if (opts.textFloor) p.state._narrow = p.narrow;
        let m = scene.draw(t, p.state);
        if (p.narrow) {
          let html = '';
          if (scene.narrow.readout) ({ rest: m, html } = splitReadout(m, scene.narrow.readout));
          const n = narrowMarkup(m, panels, p.px);
          if (svg.getAttribute('viewBox') !== n.vb) svg.setAttribute('viewBox', n.vb);
          svg.innerHTML = n.out;
          if (p.readout && p.readout.innerHTML !== html) p.readout.innerHTML = html;
        } else { if (svg.getAttribute('viewBox') !== scene.vb) svg.setAttribute('viewBox', scene.vb); svg.innerHTML = p.px ? floorText(m, vw, p.px) : m; }
        if (p.mirror) p.mirror.innerHTML = svg.innerHTML;
        p.lastT = t;
      } catch (e) { console.error('[smart-textiles]', name, e); p.running = false; }
    };
    if (opts.textFloor && typeof ResizeObserver === 'function') {
      const fit = () => {
        const px = holder.clientWidth - (parseFloat(getComputedStyle(holder).paddingLeft) || 0) - (parseFloat(getComputedStyle(holder).paddingRight) || 0);
        const narrow = !!scene.narrow && px > 0 && px < (scene.narrow.below ?? 560);
        if (px !== p.px || narrow !== p.narrow) {
          p.px = px; p.narrow = !!narrow; svg.dataset.narrow = String(p.narrow);
          if (scene.narrow?.readout && !p.readout) { p.readout = document.createElement('div'); p.readout.className = 'st-readout'; holder.appendChild(p.readout); }
          if (p.readout) { p.readout.hidden = !p.narrow; if (!p.narrow) p.readout.innerHTML = ''; }
          p.draw(p.lastT ?? (opts.at ?? scene.still ?? 0.55));
        }
      };
      new ResizeObserver(fit).observe(holder);
      p.fit = fit;
    }
    p.draw(opts.at ?? scene.still ?? 0.55);
    if (reduce) host.addEventListener('click', () => { p.running = !p.running; p.t0 = performance.now(); });
    players.push(p);
  }
  for (const btn of root.querySelectorAll('[data-st-for]')) {
    const p = players.find(q => q.name === btn.dataset.stFor); if (!p) continue;
    btn.addEventListener('click', () => {
      const key = btn.dataset.stKey, choice = btn.dataset.stValue;
      const val = choice != null ? choice : !p.state[key];
      p.state[key] = val; p.t0 = performance.now(); p.draw(0);
      for (const b of root.querySelectorAll(`[data-st-for="${p.name}"][data-st-key="${key}"]`)) b.setAttribute('aria-pressed', String(choice != null ? b.dataset.stValue === val : val));
      opts.onState?.(p);
    });
  }
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(es => es.forEach(e => { const p = players.find(q => q.host === e.target); if (p) p.visible = e.isIntersecting; }), { rootMargin: '80px' });
    players.forEach(p => io.observe(p.host));
  } else players.forEach(p => { p.visible = true; });
  if (opts.static) return players;
  const frame = now => {
    for (const p of players) {
      if (!(p.visible || p.mirror) || !p.running || now - p.last < 32) continue;
      p.last = now; p.draw(fr((now - p.t0) / p.scene.dur));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return players;
}
