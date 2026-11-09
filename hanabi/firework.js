// hanabi/firework.js — the FIREWORK SPEC and its renderers.
//
// THIS MODULE IS THE PHASE-2 SLOT. Card layout code (hanabi/layout.js) asks
// for exactly three things and knows nothing else about fireworks:
//
//   fireworkSpec(design, suit, rank)  -> spec   (data: what the firework IS)
//   renderFirework(spec, box)         -> string (SVG markup inside a box;
//                                        box = { cx, cy, r, rect? })
//   renderTier(spec, rect)            -> string (the lower tier, when spec.tier)
//
// Phase 2's visual builder edits SPECS — it writes partial overrides into
// design.fireworks[suitId][rank], which fireworkSpec() merges over the
// default below — and may replace the renderers wholesale. Neither change
// touches layout code, so long as both keep these signatures and the box
// contracts: a burst is drawn centred on (cx, cy) and reaches at most r; a
// FIELD motif fills box.rect when the layout gives one (the free centre of
// the card, scaled about its middle by spec.size), else the square inscribed
// in r; a tier stays inside its rect.
//
// MOTIFS. Each suit picks one (suit.centre.motif). 'classic' is phase 1's
// burst, which changes TYPE with rank (peony -> chrysanthemum -> crossette);
// the four originals hold one type across the ranks; the rest are drawn
// after the Hirayama fireworks catalogue (1883) — redrawn here in the deck's
// own line style, never traced. `item` is the number in the list Eva ruled
// on (#528's follow-up); `ref` the catalogue cards it stands for.
//
// SPEC SCHEMA (version 2) — every field is plain data, JSON-safe:
//   motif       a MOTIFS id
//   colors      array of hex colours: [primary, secondary], or every standard
//               suit's primary for a multicolour suit
//   size        fraction of the box radius the firework reaches (0..1)
//   seed        integer; every bit of jitter is a pure function of it
//   tier        null, or { motif: 'rosettes', count } — a second
//               tier drawn under the burst at ranks 4 and 5 (layout 'single')
// classic and the four originals also carry the version-1 fields:
//   burstType, starCount, rings, trail, sparkles, core
// every other motif carries:
//   count       how many stars / lines / pieces (the rank's escalation)
//   rings       concentric rings, where the motif has them
//   core        a bright core at the centre
//
// Rank must read visually: 1 is small and sparse, escalating to 5, the
// fullest. Duplicate cards of one suit+rank share one spec, so they render
// identically by default.

export const SPEC_VERSION = 2;
export const BURST_TYPES = ['peony', 'chrysanthemum', 'willow', 'crossette'];

// group: the panel's optgroup. item: the number in the ruled list.
export const MOTIFS = {
  classic:       { label: 'Classic', group: 'Originals', note: 'peony at 1-2, chrysanthemum at 3-4, crossette at 5' },
  peony:         { label: 'Peony', group: 'Originals' },
  chrysanthemum: { label: 'Chrysanthemum', group: 'Originals' },
  willow:        { label: 'Willow', group: 'Originals' },
  crossette:     { label: 'Crossette', group: 'Originals' },
  teardrop:      { label: 'Teardrop peony', group: 'Single bursts', item: 1, ref: '1, 3, 5, 17' },
  doublering:    { label: 'Double-ring peony', group: 'Single bursts', item: 2, ref: '4, 9, 27, 36' },
  sparklecore:   { label: 'Sparkle-core peony', group: 'Single bursts', item: 3, ref: '2, 18, 78, 93' },
  spoke:         { label: 'Spoke disc', group: 'Single bursts', item: 4, ref: '7, 25, 66, 70' },
  spokecore:     { label: 'Spoke disc with a core', group: 'Single bursts', item: 5, ref: '12, 19, 36' },
  weeping:       { label: 'Weeping willow', group: 'Single bursts', item: 6, ref: '8, 53, 72, 98' },
  crowned:       { label: 'Willow with a crown', group: 'Single bursts', item: 7, ref: '10, 11, 35' },
  dome:          { label: 'Dome', group: 'Single bursts', item: 8, ref: '39, 40' },
  split:         { label: 'Split burst', group: 'Single bursts', item: 9, ref: '105' },
  dotring:       { label: 'Dot ring', group: 'Single bursts', item: 10, ref: '89, 105' },
  rosettes:      { label: 'Rosette field', group: 'Fields', item: 11, ref: '13, 15, 23, 30, 41' },
  starfield:     { label: 'Starfield', group: 'Fields', item: 12, ref: '34, 67, 86, 90' },
};
export const MOTIF_IDS = Object.keys(MOTIFS);

// The second tier under a burst (items 21 and 24 of the ruled list).
export const TIERS = {
  none: 'None',
  rosettes: 'Over a rosette field',
};
export const TIER_IDS = Object.keys(TIERS);
export const TIER_RANKS = [4, 5];

const RANK_TABLE = {
  1: { burstType: 'peony',         starCount: 8,  rings: 1, size: 0.42, trail: true,  sparkles: 0,  core: false },
  2: { burstType: 'peony',         starCount: 12, rings: 1, size: 0.58, trail: true,  sparkles: 0,  core: false },
  3: { burstType: 'chrysanthemum', starCount: 14, rings: 2, size: 0.72, trail: true,  sparkles: 0,  core: true },
  4: { burstType: 'chrysanthemum', starCount: 18, rings: 3, size: 0.86, trail: false, sparkles: 6,  core: true },
  5: { burstType: 'crossette',     starCount: 24, rings: 4, size: 1.0,  trail: false, sparkles: 12, core: true },
};
const SIZES = [0.42, 0.58, 0.72, 0.86, 1.0];
// A field escalates mostly by COUNT, so it starts larger: a rank-1 field of
// three rosettes at a burst's 0.42 is a smudge.
const FIELD_MOTIFS = ['rosettes', 'starfield'];
const FIELD_SIZES = [0.72, 0.8, 0.88, 0.94, 1.0];
// Per motif, per rank 1..5: the count, and the rings where the motif has them.
const COUNTS = {
  teardrop: [10, 14, 18, 22, 26],     doublering: [10, 14, 18, 22, 26],  sparklecore: [12, 16, 20, 24, 28],
  spoke: [24, 36, 50, 64, 80],        spokecore: [24, 36, 50, 64, 80],
  weeping: [16, 22, 30, 38, 48],      crowned: [16, 22, 30, 38, 48],     dome: [16, 22, 30, 38, 48],
  split: [16, 22, 30, 38, 46],        dotring: [1, 1, 2, 2, 3],
  rosettes: [3, 5, 8, 11, 15],        starfield: [6, 10, 14, 19, 26],
};
const RINGS = { teardrop: [1, 1, 1, 2, 2], doublering: [1, 2, 2, 2, 3] };
const TIER_COUNTS = { rosettes: { 4: 5, 5: 8 } };

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// The default spec for a suit's rank under a motif and tier. The seed is the
// suit and rank only, so changing a suit's motif never re-rolls another card.
export function defaultSpec(suit, rank, allSuits, motif = 'classic', tier = 'none') {
  const colors = suit.multicolor
    ? allSuits.filter((s) => !s.multicolor).map((s) => s.primary)
    : [suit.primary, suit.secondary];
  const seed = hashSeed(`${suit.id}:${rank}`);
  const m = MOTIFS[motif] ? motif : 'classic';
  let spec;
  if (m === 'classic') spec = { version: SPEC_VERSION, motif: m, ...RANK_TABLE[rank], colors, seed };
  else if (BURST_TYPES.includes(m)) spec = { version: SPEC_VERSION, motif: m, ...RANK_TABLE[rank], burstType: m, colors, seed };
  else {
    spec = { version: SPEC_VERSION, motif: m, size: (FIELD_MOTIFS.includes(m) ? FIELD_SIZES : SIZES)[rank - 1], count: COUNTS[m][rank - 1], colors, seed, core: rank >= 3 };
    if (RINGS[m]) spec.rings = RINGS[m][rank - 1];
  }
  spec.tier = TIERS[tier] && tier !== 'none' && TIER_RANKS.includes(rank) ? { motif: tier, count: TIER_COUNTS[tier][rank] } : null;
  return spec;
}

export function fireworkSpec(design, suit, rank) {
  const c = suit.centre || {};
  const tier = c.layout === undefined || c.layout === 'single' ? c.tier : 'none';
  const spec = defaultSpec(suit, rank, design.suits, c.motif, tier);
  const over = design.fireworks && design.fireworks[suit.id] && design.fireworks[suit.id][rank];
  return over ? { ...spec, ...over } : spec;
}
const f = (v) => +v.toFixed(3);

// The placeholder renderer: a radial burst in SVG. box = { cx, cy, r } in the
// caller's units (mm on a card). `scale` sets stroke weights relative to r.
function drawRadial(spec, box) {
  const { cx, cy, r } = box;
  const R = r * Math.max(0.05, Math.min(1, spec.size));
  const rand = rng(spec.seed);
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const w = Math.max(0.26, r * 0.022);          // base stroke weight, floored so a small burst still reads
  const out = [];

  if (spec.trail) {
    const y1 = cy + r * 0.98, y0 = cy + R * 0.18;
    out.push(`<path d="M${f(cx)} ${f(y1)} Q${f(cx + r * 0.05)} ${f((y0 + y1) / 2)} ${f(cx)} ${f(y0)}" fill="none" stroke="${colors[0]}" stroke-opacity="0.45" stroke-width="${f(w * 0.8)}" stroke-linecap="round" stroke-dasharray="${f(w * 1.2)} ${f(w * 2.2)}"/>`);
  }

  const rings = Math.max(1, Math.min(4, spec.rings | 0));
  for (let k = rings - 1; k >= 0; k--) {
    const ringR = R * (1 - k * 0.24);
    const n = Math.max(4, Math.round(spec.starCount * (1 - k * 0.22)));
    const col = colors[k % colors.length];
    const phase = rand() * Math.PI * 2;
    const inner = ringR * (spec.burstType === 'peony' ? 0.28 : 0.12);
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.08;
      const len = ringR * (0.9 + rand() * 0.1);
      const x0 = cx + Math.cos(a) * inner, y0 = cy + Math.sin(a) * inner;
      const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len;
      const ci = colors.length > 2 ? colors[(i + k) % colors.length] : col;
      if (spec.burstType === 'willow') {
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - ringR * 0.08;
        out.push(`<path d="M${f(x0)} ${f(y0)} Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1 + ringR * 0.18)}" fill="none" stroke="${ci}" stroke-width="${f(w)}" stroke-linecap="round"/>`);
      } else {
        out.push(`<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${ci}" stroke-width="${f(w * (k === 0 ? 1 : 0.8))}" stroke-linecap="round"/>`);
      }
      out.push(`<circle cx="${f(x1)}" cy="${f(y1)}" r="${f(w * (k === 0 ? 1.6 : 1.25))}" fill="${ci}"/>`);
    }
  }

  const sparks = spec.sparkles | 0;
  for (let i = 0; i < sparks; i++) {
    const a = rand() * Math.PI * 2, d = R * (1.02 + rand() * 0.06);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, s = w * 2.2;
    const col = colors[(i + 1) % colors.length];
    out.push(`<path d="M${f(x - s)} ${f(y)} L${f(x + s)} ${f(y)} M${f(x)} ${f(y - s)} L${f(x)} ${f(y + s)}" stroke="${col}" stroke-width="${f(w * 0.7)}" stroke-linecap="round"/>`);
  }

  if (spec.core) {
    out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.09)}" fill="${colors[colors.length > 1 ? 1 : 0]}"/>`);
    out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.045)}" fill="#FFFFFF"/>`);
  } else {
    out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(w * 1.4)}" fill="${colors[0]}"/>`);
  }
  return `<g class="hb-firework">${out.join('')}</g>`;
}

// ---------------------------------------------------------------- the catalogue motifs
// Every motif below is drawn from straight lines, circles and cubic paths in
// absolute coordinates (no arcs, no transforms), so the gate can read every
// point a motif puts down and hold it to its box.

const P = (x, y) => `${f(x)} ${f(y)}`;
const line = (x0, y0, x1, y1, col, w, extra = '') =>
  `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"${extra}/>`;
const dot = (x, y, r, col, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}"${extra}/>`;
const pick = (colors, i) => colors[i % colors.length];

// A teardrop star: a round head of radius h centred at (hx, hy), its point
// toward the burst's centre along the unit vector -u. Four cubics, so the
// path is closed and every control point is a plain coordinate pair.
function teardrop(hx, hy, ux, uy, h, col) {
  const vx = -uy, vy = ux, L = h * 2.4, k = 0.552;
  const at = (a, b) => P(hx + a * ux + b * vx, hy + a * uy + b * vy);
  return `<path d="M${at(-L, 0)} C${at(-L * 0.55, 0.15 * h)} ${at(-h * 0.55, h)} ${at(0, h)} C${at(k * h, h)} ${at(h, k * h)} ${at(h, 0)} `
    + `C${at(h, -k * h)} ${at(k * h, -h)} ${at(0, -h)} C${at(-h * 0.55, -h)} ${at(-L * 0.55, -0.15 * h)} ${at(-L, 0)} Z" fill="${col}"/>`;
}

// A ring of n teardrop stars, heads reaching radius ringR, each on a thin
// stem from stemFrom (a radius) to its point.
function teardropRing(cx, cy, ringR, n, col, w, rand, stemFrom, headScale = 1) {
  const out = [];
  const h = Math.min(ringR * Math.PI / n * 0.62, ringR * 0.11) * headScale;
  const d = ringR - h, phase = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    const tip = d - h * 2.4;
    if (stemFrom < tip) out.push(line(cx + ux * stemFrom, cy + uy * stemFrom, cx + ux * tip, cy + uy * tip, col, Math.max(0.16, w * 0.45)));
    out.push(teardrop(cx + ux * d, cy + uy * d, ux, uy, h, col));
  }
  return out.join('');
}

function rays(cx, cy, n, r0, r1, col, w, rand, from = 0, span = Math.PI * 2, tips = true) {
  const out = [];
  const phase = span >= Math.PI * 2 ? rand() * Math.PI * 2 : 0;
  for (let i = 0; i < n; i++) {
    const a = from + phase + (span >= Math.PI * 2 ? i / n : (i + 0.5) / n) * span;
    const len = r1 * (0.94 + rand() * 0.06);
    const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len;
    out.push(line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, x1, y1, col, Math.max(0.16, w * 0.55)));
    if (tips) out.push(dot(x1, y1, Math.max(0.12, w * 0.7), col));
  }
  return out.join('');
}

function core(cx, cy, R, colors, w, rand, big) {
  const c = pick(colors, 1);
  if (!big) return dot(cx, cy, Math.max(w * 1.4, R * 0.06), c);
  return rays(cx, cy, 14, 0, R * 0.2, c, w, rand, 0, Math.PI * 2, false) + dot(cx, cy, R * 0.07, c) + dot(cx, cy, R * 0.035, colors[0]);
}

// The weeping canopy: lines from an apex falling outward and down like a
// jellyfish bell. `top` is the apex's y, `bottom` the hem's.
function canopy(cx, top, bottom, halfW, n, col, w) {
  const out = [], H = bottom - top;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
    const ex = cx + u * halfW * 0.92, ey = bottom - u * u * H * 0.07;
    out.push(`<path d="M${P(cx, top)} C${P(cx + u * halfW * 0.5, top + H * 0.01)} ${P(cx + u * halfW * 1.04, top + H * 0.32)} ${P(ex, ey)}" fill="none" stroke="${col}" stroke-width="${f(Math.max(0.16, w * 0.55))}" stroke-linecap="round"/>`);
  }
  return out.join('');
}

// Scatter n items of radius rho in a rect without overlap. Deterministic in
// the seed; if a dart cannot land, rho shrinks and the throw restarts, so all
// n always land.
function scatter(rect, n, rand, rhoFrac = 0.5) {
  let rho = Math.min(Math.sqrt((rhoFrac * rect.w * rect.h) / (n * Math.PI)), Math.min(rect.w, rect.h) / 4);
  for (let tries = 0; tries < 40; tries++) {
    const pts = [];
    let fails = 0;
    while (pts.length < n && fails < 400) {
      const x = rect.x + rho + rand() * (rect.w - 2 * rho), y = rect.y + rho + rand() * (rect.h - 2 * rho);
      if (pts.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= (2.1 * rho) ** 2)) pts.push({ x, y }); else fails++;
    }
    if (pts.length === n) return { pts, rho };
    rho *= 0.92;
  }
  return { pts: [], rho };
}

function rosette(x, y, rho, col, w) {
  const out = [], k = 8;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    out.push(line(x + ux * rho * 0.3, y + uy * rho * 0.3, x + ux * rho * 0.68, y + uy * rho * 0.68, col, Math.max(0.14, w * 0.45)));
    out.push(dot(x + ux * rho * 0.84, y + uy * rho * 0.84, rho * 0.16, col));
  }
  return out.join('') + dot(x, y, rho * 0.14, col);
}

// ---- fields: each draws inside a rect, so the same painter serves a centre
// motif and a lower tier.
const FIELDS = {
  rosettes(rect, n, colors, w, rand) {
    const { pts, rho } = scatter(rect, n, rand);
    return pts.map((p, i) => rosette(p.x, p.y, rho, pick(colors, i), w)).join('');
  },
  starfield(rect, n, colors, w, rand) {
    const { pts, rho } = scatter(rect, n, rand, 0.32);
    return pts.map((p, i) => {
      const s = rho * (0.75 + rand() * 0.25), col = pick(colors, i), out = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2, len = k % 2 ? s * 0.55 : s;
        out.push(line(p.x, p.y, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len, col, Math.max(0.16, w * 0.6)));
      }
      return out.join('') + dot(p.x, p.y, Math.max(0.14, w * 0.6), col);
    }).join('');
  },
};

// ---- single bursts, inside the circle (cx, cy, R)
const BURSTS = {
  teardrop(s, cx, cy, R, w, rand) {
    let out = teardropRing(cx, cy, R, s.count, s.colors[0], w, rand, R * 0.22);
    if (s.rings > 1) out += teardropRing(cx, cy, R * 0.58, Math.round(s.count * 0.6), pick(s.colors, 1), w, rand, R * 0.16, 0.8);
    return out + core(cx, cy, R, s.colors, w, rand, s.core);
  },
  doublering(s, cx, cy, R, w, rand) {
    let out = teardropRing(cx, cy, R, s.count, s.colors[0], w, rand, s.rings > 1 ? R * 0.62 : R * 0.2);
    if (s.rings > 1) out += teardropRing(cx, cy, R * 0.52, Math.round(s.count * 0.62), pick(s.colors, 1), w, rand, R * 0.12, 0.85);
    if (s.rings > 2) out += teardropRing(cx, cy, R * 0.27, Math.round(s.count * 0.36), s.colors[0], w, rand, R * 0.05, 0.8);
    return out + dot(cx, cy, Math.max(w * 1.4, R * 0.05), pick(s.colors, 1));
  },
  sparklecore(s, cx, cy, R, w, rand) {
    const out = [teardropRing(cx, cy, R, s.count, s.colors[0], w, rand, R * 0.66)];
    const glit = pick(s.colors, 1);
    for (let i = 0; i < s.count * 3; i++) {
      const a = rand() * Math.PI * 2, r0 = R * (0.06 + rand() * 0.5), len = R * (0.07 + rand() * 0.12);
      out.push(line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), glit, Math.max(0.14, w * 0.35), ' stroke-opacity="0.85"'));
    }
    return out.join('') + core(cx, cy, R, s.colors, w, rand, s.core);
  },
  spoke(s, cx, cy, R, w, rand) {
    return rays(cx, cy, s.count, R * 0.05, R, s.colors[0], w, rand) + core(cx, cy, R, s.colors, w, rand, false);
  },
  spokecore(s, cx, cy, R, w, rand) {
    return rays(cx, cy, s.count, R * 0.36, R, s.colors[0], w, rand)
      + teardropRing(cx, cy, R * 0.3, Math.round(6 + s.count / 8), pick(s.colors, 1), w, rand, R * 0.05)
      + dot(cx, cy, Math.max(w * 1.2, R * 0.04), s.colors[0]);
  },
  weeping(s, cx, cy, R, w) {
    // proportions fit the bell inside R (its widest point measured at 0.96 R)
    return canopy(cx, cy - R * 0.96, cy + R * 0.64, R * 0.8, s.count, s.colors[0], w);
  },
  crowned(s, cx, cy, R, w, rand) {
    const top = cy - R * 0.7;
    return canopy(cx, top, cy + R * 0.72, R * 0.76, s.count, s.colors[0], w)
      + teardropRing(cx, top, R * 0.26, 8 + Math.round(s.count / 8), pick(s.colors, 1), w, rand, R * 0.04)
      + dot(cx, top, Math.max(w * 1.2, R * 0.04), s.colors[0]);
  },
  dome(s, cx, cy, R, w) {
    const top = cy - R * 0.55, rimY = cy + R * 0.16, rx = R * 0.9, ry = R * 0.2, out = [];
    const sw = f(Math.max(0.16, w * 0.55));
    for (let i = 0; i < s.count; i++) {
      const u = -1 + (2 * i) / (s.count - 1);
      const ex = cx + u * rx, ey = rimY + Math.sqrt(Math.max(0, 1 - u * u)) * ry;
      out.push(`<path d="M${P(cx, top)} C${P(cx + u * R * 0.45, top)} ${P(cx + u * R * 1.0, rimY - R * 0.42)} ${P(ex, ey)}" fill="none" stroke="${s.colors[0]}" stroke-width="${sw}" stroke-linecap="round"/>`);
    }
    const m = Math.round(s.count * 0.75), fy = rimY + R * 0.09, fr = Math.max(0.14, w * 1.1);
    for (let i = 0; i <= m; i++) {
      const t = (i / m) * Math.PI;
      out.push(dot(cx + Math.cos(t) * rx * 1.03, fy + Math.sin(t) * ry * 1.15, fr, pick(s.colors, 1)));
    }
    return out.join('');
  },
  split(s, cx, cy, R, w, rand) {
    const out = [rays(cx, cy, s.count, R * 0.05, R, s.colors[0], w, rand, Math.PI / 2, Math.PI)];
    const m = Math.round(s.count / 4) + 2, dr = R * 0.07;
    for (let i = 0; i < m; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / m) * Math.PI;
      out.push(dot(cx + Math.cos(a) * (R - dr), cy + Math.sin(a) * (R - dr), dr, pick(s.colors, i + 1)));
    }
    return out.join('') + dot(cx, cy, Math.max(w * 1.4, R * 0.05), s.colors[0]);
  },
  dotring(s, cx, cy, R, w) {
    const out = [], dr = w * 1.8;
    for (let k = 0; k < s.count; k++) {
      const rr = R * (1 - k * 0.26) - dr, n = Math.max(6, Math.round((2 * Math.PI * rr) / (dr * 3.2)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.3;
        out.push(dot(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, dr, pick(s.colors, i + k)));
      }
    }
    return out.join('');
  },
};

// The rect a field motif fills: the layout's rect scaled about its middle by
// the size, else the square inscribed in R.
function fieldRect(box, R, size) {
  if (!box.rect) return { x: box.cx - R * 0.7, y: box.cy - R * 0.7, w: R * 1.4, h: R * 1.4 };
  const q = box.rect, w = q.w * size, h = q.h * size;
  return { x: q.x + (q.w - w) / 2, y: q.y + (q.h - h) / 2, w, h };
}

// box = { cx, cy, r } in the caller's units (mm on a card).
export function renderFirework(spec, box) {
  const m = spec.motif;
  if (!m || m === 'classic' || BURST_TYPES.includes(m) || !(m in MOTIFS)) return drawRadial(spec, box);
  const { cx, cy, r } = box;
  const R = r * Math.max(0.05, Math.min(1, spec.size));
  const rand = rng(spec.seed);
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const w = Math.max(0.26, r * 0.022);
  const s = { ...spec, colors };
  const sz = Math.max(0.05, Math.min(1, spec.size));
  // A burst is laid out on R less one stroke, so its outermost dots and line
  // caps land inside r rather than on it.
  const body = FIELDS[m] ? FIELDS[m](fieldRect(box, R, sz), s.count, colors, w, rand) : BURSTS[m](s, cx, cy, R - w, w, rand);
  return `<g class="hb-firework" data-motif="${m}">${body}</g>`;
}

// The second tier, inside rect = { x, y, w, h }. Nothing when spec.tier is null.
export function renderTier(spec, rect) {
  if (!spec.tier || !FIELDS[spec.tier.motif]) return '';
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const w = Math.max(0.26, Math.min(rect.w, rect.h) * 0.02);
  const rand = rng((spec.seed ^ 0x9e3779b9) >>> 0);
  return `<g class="hb-tier" data-tier="${spec.tier.motif}">${FIELDS[spec.tier.motif](rect, spec.tier.count, [...colors.slice(1), colors[0]], w, rand)}</g>`;
}
