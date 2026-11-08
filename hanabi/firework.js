// hanabi/firework.js — the FIREWORK SPEC and its placeholder renderer.
//
// THIS MODULE IS THE PHASE-2 SLOT. Card layout code (hanabi/layout.js) asks
// for exactly two things and knows nothing else about fireworks:
//
//   fireworkSpec(design, suit, rank)  -> spec   (data: what the burst IS)
//   renderFirework(spec, box)         -> string (SVG markup inside a box)
//
// Phase 2's visual builder edits SPECS — it writes partial overrides into
// design.fireworks[suitId][rank], which fireworkSpec() merges over the
// default below — and may replace renderFirework() wholesale. Neither change
// touches layout code, so long as both keep these signatures and the box
// contract: the burst is drawn centred on (cx, cy) and reaches at most r.
//
// SPEC SCHEMA (version 1) — every field is plain data, JSON-safe:
//   burstType   'peony' | 'chrysanthemum' | 'willow' | 'crossette'
//   starCount   stars on the OUTER ring
//   rings       concentric rings of stars (1..4)
//   colors      array of hex colours; ring i uses colors[i % n]
//   size        fraction of the box radius the outer ring reaches (0..1)
//   trail       draw the rising trail under the burst
//   sparkles    small crossette sparks beyond the outer ring
//   core        a bright core at the centre
//   seed        integer; the renderer's jitter is a pure function of it
//
// Rank must read visually: 1 is a small single burst, escalating to 5, the
// fullest and most layered. Duplicate cards of one suit+rank share one spec,
// so they render identically by default.

export const SPEC_VERSION = 1;
export const BURST_TYPES = ['peony', 'chrysanthemum', 'willow', 'crossette'];

const RANK_TABLE = {
  1: { burstType: 'peony',         starCount: 8,  rings: 1, size: 0.42, trail: true,  sparkles: 0,  core: false },
  2: { burstType: 'peony',         starCount: 12, rings: 1, size: 0.58, trail: true,  sparkles: 0,  core: false },
  3: { burstType: 'chrysanthemum', starCount: 14, rings: 2, size: 0.72, trail: true,  sparkles: 0,  core: true },
  4: { burstType: 'chrysanthemum', starCount: 18, rings: 3, size: 0.86, trail: false, sparkles: 6,  core: true },
  5: { burstType: 'crossette',     starCount: 24, rings: 4, size: 1.0,  trail: false, sparkles: 12, core: true },
};

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function defaultSpec(suit, rank, allSuits) {
  const base = RANK_TABLE[rank];
  // A multicolour suit cycles every standard suit's primary around its rings.
  const colors = suit.multicolor
    ? allSuits.filter((s) => !s.multicolor).map((s) => s.primary)
    : [suit.primary, suit.secondary];
  return { version: SPEC_VERSION, ...base, colors, seed: hashSeed(`${suit.id}:${rank}`) };
}

export function fireworkSpec(design, suit, rank) {
  const spec = defaultSpec(suit, rank, design.suits);
  const over = design.fireworks && design.fireworks[suit.id] && design.fireworks[suit.id][rank];
  return over ? { ...spec, ...over } : spec;
}

const f = (v) => +v.toFixed(3);

// The placeholder renderer: a radial burst in SVG. box = { cx, cy, r } in the
// caller's units (mm on a card). `scale` sets stroke weights relative to r.
export function renderFirework(spec, box) {
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
