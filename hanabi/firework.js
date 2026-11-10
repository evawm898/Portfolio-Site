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
// SPEC SCHEMA (version 3) — every field is plain data, JSON-safe:
//   motif       a MOTIFS id
//   colors      array of hex colours: [primary, secondary], or every standard
//               suit's primary for a multicolour suit
//   size        fraction of the box radius the firework reaches (0..1)
//   seed        integer; every bit of jitter is a pure function of it
//   tier        null, or { motif: 'rosettes', count } — a second
//               tier drawn under the burst at ranks 4 and 5 (Scale only)
//   outerColor, coreColor   optional hex: replace colors[0] / colors[1]
//   rotation    optional degrees about the burst's centre
// classic and the four phase-1 radial bursts also carry the version-1 fields:
//   burstType, starCount, rings, trail, sparkles, core
// the catalogue motifs carry:
//   count       how many stars / lines / pieces (the rank's escalation)
//   rings       concentric rings, where the motif has them
//   core        a bright core at the centre
// the nine FIREWORK TYPES (phase 2, TYPES below) carry their PARAMS:
//   count, length, trail, starSize, tips, core, density — and `rank`, the rank
//   the count escalates to (5 under Count: the rank is told by how many).
//
// INHERITANCE (the Firework board): the type's defaults <- the suit's own
// parameters (suit.firework, only the keys the type takes) <- the cell's
// override (design.fireworks[suitId][rank], per key; `items` there is the
// cell's arrangement and never reaches the spec). Duplicate cards of one
// suit+rank share one spec, so they render identically.
//
// Every renderer is deterministic: the same spec always draws the same SVG.

export const SPEC_VERSION = 3;
export const BURST_TYPES = ['peony', 'chrysanthemum', 'willow', 'crossette'];
// Phase 1's four one-type radial bursts. Their ids now name the phase-2 TYPES,
// so a version-2 design's 'peony' is read as 'radial-peony' (hanabi/deck.js)
// and draws exactly what it drew.
export const LEGACY_RADIAL = Object.fromEntries(BURST_TYPES.map((t) => [t, `radial-${t}`]));
const RADIAL_IDS = Object.values(LEGACY_RADIAL);

// The parameters a firework type can take, with their ranges. One table:
// the editor builds its controls from it, and deck.js validates a saved
// suit's parameters against it.
export const PARAMS = {
  // the ENVELOPE of every type's count (a saved value is read onto it); each type
  // has its own label and range, TYPES[t].count, and paramFor() is what a control reads
  count:      { label: 'Count', min: 1, max: 210, step: 1 },
  length:     { label: 'Length', min: 0.3, max: 1, step: 0.05 },
  trail:      { label: 'Trail length', min: 0, max: 1, step: 0.05 },
  starSize:   { label: 'Star size', min: 0.4, max: 2.5, step: 0.1 },
  density:    { label: 'Detail', min: 0, max: 2, step: 0.1, note: 'the look of the secondary marks; it never changes the count' },
  rotation:   { label: 'Rotation', min: -180, max: 180, step: 5, unit: '°' },
  tips:       { label: 'Tip dots', kind: 'bool' },
  core:       { label: 'Core', kind: 'bool' },
  outerColor: { label: 'Outer colour', kind: 'color' },
  coreColor:  { label: 'Core colour', kind: 'color' },
  // phase 1's rising trail below a Scale / Full-bleed burst at ranks 1-3 (classic
  // and the radial bursts). Its default is the DESIGN's (stemDefault): off for a
  // design made since version 6, on for one saved before.
  stem:       { label: 'Rising trail', kind: 'bool', note: 'the faint dotted trail below the burst, under Scale and Full bleed at ranks 1-3' },
};
const COLOR_PARAMS = ['outerColor', 'coreColor'];

// THE NINE FIREWORK TYPES. Each is a distinct SILHOUETTE, not a recolour — the
// gate holds every pair apart in greyscale (H16). `escalate`: whether the count
// grows with rank under Scale.
export const TYPES = {
  peony:         { label: 'Peony', note: 'rings of stars, no trails', escalate: true,
                   params: ['count', 'starSize', 'density', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Stars', min: 5, max: 200 },
                   defaults: { count: 43, starSize: 1, density: 1, core: true, rotation: 0 } },
  chrysanthemum: { label: 'Chrysanthemum', note: 'trailed arms', escalate: true,
                   params: ['count', 'length', 'trail', 'starSize', 'density', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Spokes', min: 3, max: 60 },
                   defaults: { count: 26, length: 1, trail: 0.75, starSize: 1, density: 1, tips: true, core: true, rotation: 0 } },
  ring:          { label: 'Ring', note: 'a hollow ring of stars', escalate: true,
                   params: ['count', 'starSize', 'density', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Stars', min: 3, max: 210 },
                   defaults: { count: 22, starSize: 1, density: 0, core: false, rotation: 0 } },
  willow:        { label: 'Willow', note: 'trails that droop', escalate: true,
                   params: ['count', 'length', 'trail', 'starSize', 'density', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Trails', min: 3, max: 60 },
                   defaults: { count: 18, length: 1, trail: 0.7, starSize: 1, density: 1, tips: true, core: false, rotation: 0 } },
  palm:          { label: 'Palm', note: 'a few thick curving arms', escalate: false,
                   params: ['count', 'length', 'starSize', 'density', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Arms', min: 3, max: 60 },
                   defaults: { count: 6, length: 1, starSize: 1, density: 0, tips: true, core: true, rotation: 0 } },
  crossette:     { label: 'Crossette', note: 'arms that split', escalate: true,
                   params: ['count', 'length', 'starSize', 'density', 'tips', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Arms', min: 3, max: 60 },
                   defaults: { count: 8, length: 1, starSize: 1, density: 0, tips: true, core: true, rotation: 0 } },
  dahlia:        { label: 'Dahlia', note: 'thick petals', escalate: true,
                   params: ['count', 'length', 'starSize', 'density', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Spokes', min: 3, max: 60 },
                   defaults: { count: 12, length: 1, starSize: 1, density: 0, core: true, rotation: 0 } },
  glitter:       { label: 'Glitter', note: 'a cloud of strobing sparks', escalate: true,
                   params: ['count', 'starSize', 'density', 'core', ...COLOR_PARAMS], count: { label: 'Stars', min: 6, max: 120 },
                   defaults: { count: 34, starSize: 1, density: 1, core: false } },
  blossom:       { label: 'Blossom', note: 'a five-petal flower', escalate: false,
                   params: ['count', 'length', 'starSize', 'density', 'core', 'rotation', ...COLOR_PARAMS], count: { label: 'Petals', min: 3, max: 60 },
                   defaults: { count: 5, length: 1, starSize: 1, density: 0, core: true, rotation: 0 } },
};
export const TYPE_IDS = Object.keys(TYPES);
// COUNT (Nov 10): every type's count is the number of its main elements drawn —
// TYPES[t].count names them (Stars, Spokes, Trails, Arms, Petals) and sets the
// range. Under Count a firework is drawn at rank 5, so it draws exactly that
// many; under Scale an escalating type draws fewer at the lower ranks. Detail
// never changes it.
export function countRange(motif) {
  return TYPES[motif] ? TYPES[motif].count : CATALOGUE_COUNT[motif] || { label: PARAMS.count.label, min: PARAMS.count.min, max: PARAMS.count.max };
}
// The control a parameter is given on a motif: its own label and range for count.
export function paramFor(k, motif) {
  if (k !== 'count') return PARAMS[k];
  if (CATALOGUE_COUNT[motif]) {
    const c = CATALOGUE_COUNT[motif];
    return { ...PARAMS.count, label: c.label, min: c.min, max: c.max, note: `${c.note}; fewer at lower ranks under Scale` };
  }
  if (!TYPES[motif]) return PARAMS[k];
  const c = TYPES[motif].count;
  return { ...PARAMS.count, label: c.label, min: c.min, max: c.max, note: TYPES[motif].escalate ? 'fewer at lower ranks under Scale' : undefined };
}
// The keys a spec inherits, beyond its controls: a migrated glitter's legacy fit
// (version 5, deck.js migrateCounts), which is no control and rides with its count.
export function inheritKeys(motif) {
  return motif === 'glitter' ? [...motifParams(motif), 'legacy'] : motifParams(motif);
}


// group: the panel's optgroup. item: the number in the ruled list.
export const MOTIFS = {
  ...Object.fromEntries(TYPE_IDS.map((id) => [id, { label: TYPES[id].label, group: 'Firework types', note: TYPES[id].note }])),
  classic:       { label: 'Classic', group: 'Phase 1', note: 'peony at 1-2, chrysanthemum at 3-4, crossette at 5' },
  'radial-peony':         { label: 'Radial peony', group: 'Phase 1' },
  'radial-chrysanthemum': { label: 'Radial chrysanthemum', group: 'Phase 1' },
  'radial-willow':        { label: 'Radial willow', group: 'Phase 1' },
  'radial-crossette':     { label: 'Radial crossette', group: 'Phase 1' },
  teardrop:      { label: 'Teardrop peony', group: 'Catalogue', item: 1, ref: '1, 3, 5, 17' },
  doublering:    { label: 'Double-ring peony', group: 'Catalogue', item: 2, ref: '4, 9, 27, 36' },
  sparklecore:   { label: 'Sparkle-core peony', group: 'Catalogue', item: 3, ref: '2, 18, 78, 93' },
  spoke:         { label: 'Spoke disc', group: 'Catalogue', item: 4, ref: '7, 25, 66, 70' },
  spokecore:     { label: 'Spoke disc with a core', group: 'Catalogue', item: 5, ref: '12, 19, 36' },
  weeping:       { label: 'Weeping willow', group: 'Catalogue', item: 6, ref: '8, 53, 72, 98' },
  crowned:       { label: 'Willow with a crown', group: 'Catalogue', item: 7, ref: '10, 11, 35' },
  dome:          { label: 'Dome', group: 'Catalogue', item: 8, ref: '39, 40' },
  split:         { label: 'Split burst', group: 'Catalogue', item: 9, ref: '105' },
  dotring:       { label: 'Dot ring', group: 'Catalogue', item: 10, ref: '89, 105' },
  rosettes:      { label: 'Rosette field', group: 'Catalogue fields', item: 11, ref: '13, 15, 23, 30, 41' },
  starfield:     { label: 'Starfield', group: 'Catalogue fields', item: 12, ref: '34, 67, 86, 90' },
};
export const MOTIF_IDS = Object.keys(MOTIFS);
// The parameters each motif takes: a type its own list; a catalogue burst or a
// phase-1 burst colours and rotation; a field colours only (a rotated field
// would leave its rect).
export function motifParams(motif) {
  if (TYPES[motif]) return TYPES[motif].params;
  if (MOTIFS[motif] && FIELD_MOTIFS.includes(motif)) return ['count', ...COLOR_PARAMS];
  if (CATALOGUE_COUNT[motif]) return ['count', 'rotation', ...COLOR_PARAMS];
  if (motif === 'classic' || RADIAL_IDS.includes(motif)) return ['stem', 'rotation', ...COLOR_PARAMS];
  return MOTIFS[motif] ? ['rotation', ...COLOR_PARAMS] : [];
}
// THE CATALOGUE COUNTS (version 6, Nov 10): the spoke discs' spokes and the two
// fields' rosettes and stars, as a count of their own. The stored count is what a
// firework draws at rank 5 (so exactly, under Count); under Scale the lower ranks
// draw fewer, in the catalogue's own ratios (COUNTS below), and a count left unset
// is the catalogue's own escalation to the mark. A spoke disc with a core also
// draws an inner ring of teardrops (6 + spokes / 8), not on this slider.
export const CATALOGUE_COUNT = {
  spoke:     { label: 'Spokes', min: 6, max: 160, note: 'the rays' },
  spokecore: { label: 'Spokes', min: 6, max: 160, note: 'the outer rays (the core ring follows them)' },
  rosettes:  { label: 'Count', min: 1, max: 30, note: 'the rosettes in the field' },
  starfield: { label: 'Count', min: 1, max: 60, note: 'the stars in the field' },
};
export const catalogueCountDefault = (motif) => COUNTS[motif][4];
// What a catalogue firework of count v draws at rank `rank` (5 under Count).
export function catalogueCountAt(motif, v, rank) {
  const c = COUNTS[motif], r = clampN(rank | 0 || 5, 1, 5);
  return Math.max(CATALOGUE_COUNT[motif].min, Math.round((+v || 0) * c[r - 1] / c[4]));
}
// The rising trail's default: a design made since version 6 says (off); one
// without the field (saved before, or built by an older page) draws it.
export const stemDefault = (design) => !(design && design.stems === false);

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
export const FIELD_MOTIFS = ['rosettes', 'starfield'];
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

// Count+Scale: N fireworks, each growing with rank.
export const COUNTSCALE_SIZES = [0.62, 0.72, 0.82, 0.91, 1.0];

// The default spec for a suit's rank under a motif, tier and composition. The
// seed is the suit and rank only, so changing a suit's motif never re-rolls
// another card. compose: 'scale' (and 'column', 'bleed') escalate the firework
// with rank as phase 1 did; 'count' draws every firework at rank 5's fullness
// (the rank is the count); 'countscale' escalates and shrinks to the ramp above.
export function defaultSpec(suit, rank, allSuits, motif = 'classic', tier = 'none', compose = 'scale') {
  const colors = suit.multicolor
    ? allSuits.filter((s) => !s.multicolor).map((s) => s.primary)
    : [suit.primary, suit.secondary];
  const seed = hashSeed(`${suit.id}:${rank}`);
  const m = MOTIFS[motif] ? motif : 'classic';
  const er = compose === 'count' ? 5 : rank;      // the rank the firework escalates to
  let spec;
  if (m === 'classic') spec = { version: SPEC_VERSION, motif: m, ...RANK_TABLE[er], colors, seed };
  else if (RADIAL_IDS.includes(m)) spec = { version: SPEC_VERSION, motif: m, ...RANK_TABLE[er], burstType: m.slice(7), colors, seed };
  else if (TYPES[m]) spec = { version: SPEC_VERSION, motif: m, size: SIZES[er - 1], colors, seed, rank: er, ...TYPES[m].defaults };
  else {
    spec = { version: SPEC_VERSION, motif: m, size: (FIELD_MOTIFS.includes(m) ? FIELD_SIZES : SIZES)[er - 1], count: COUNTS[m][er - 1], colors, seed, core: er >= 3 };
    // a counted catalogue motif carries its rank-5 count and the rank it draws at
    if (CATALOGUE_COUNT[m]) { spec.count = COUNTS[m][4]; spec.rank = er; }
    if (RINGS[m]) spec.rings = RINGS[m][er - 1];
  }
  if (compose === 'count') spec.size = 1;
  else if (compose === 'countscale') spec.size = COUNTSCALE_SIZES[rank - 1];
  if (compose === 'count' || compose === 'countscale') spec.trail = TYPES[m] ? spec.trail : false;
  spec.tier = TIERS[tier] && tier !== 'none' && TIER_RANKS.includes(rank) ? { motif: tier, count: TIER_COUNTS[tier][rank] } : null;
  return spec;
}

// The cell's own override, less its arrangement.
export function cellOverride(design, suitId, rank) {
  const o = design.fireworks && design.fireworks[suitId] && design.fireworks[suitId][rank];
  if (!o || typeof o !== 'object') return null;
  const { items, place, styles, ...rest } = o;
  return rest;
}

// motifAt: draw one firework of the card as ANOTHER type (a per-firework
// style). That firework starts from its own type's defaults with the suit's
// colours, and the suit's and the card's parameters reach it only as colours —
// they were set for the card's own type. Absent, or the card's own type, this
// is the card's spec exactly.
export function fireworkSpec(design, suit, rank, motifAt) {
  const c = suit.centre || {};
  const compose = c.compose || 'scale';
  const tier = compose === 'scale' ? c.tier : 'none';
  const over = cellOverride(design, suit.id, rank);
  // a cell may override the type itself; the defaults are then that type's
  const cardMotif = over && MOTIFS[over.motif] ? over.motif : c.motif;
  const other = !!(motifAt && MOTIFS[motifAt] && motifAt !== cardMotif);
  const motif = other ? motifAt : cardMotif;
  const spec = defaultSpec(suit, rank, design.suits, motif, tier, compose);
  const takes = inheritKeys(spec.motif).filter((k) => !other || COLOR_PARAMS.includes(k));
  const mine = suit.firework && typeof suit.firework === 'object' ? suit.firework : {};
  for (const k of takes) if (mine[k] !== undefined && mine[k] !== '') spec[k] = mine[k];
  if (!over) return withStem(design, spec);
  if (!other) return withStem(design, { ...spec, ...over });
  for (const k of takes) if (over[k] !== undefined && over[k] !== '') spec[k] = over[k];
  return withStem(design, spec);
}
// Phase 1's rising trail: off where the spec (a suit, a card) or the design says.
function withStem(design, spec) {
  if (spec.trail && (spec.motif === 'classic' || RADIAL_IDS.includes(spec.motif)) && !(spec.stem ?? stemDefault(design))) spec.trail = false;
  return spec;
}

// ---- per-firework styles (schema version 4) ----
// A Count card's fireworks may each carry a style of their own:
// design.fireworks[suitId][rank].styles = { [n]: { motif?, ...params } }, keyed
// by n — the firework it is (its drawing's seed, layout.js countPlacement), so
// a style stays with its firework when the stacking order changes. Absent, a
// firework is the card's spec, and the card draws exactly as it did.
// A field motif fills a rect, so it is not offered as one firework's type.
export const STYLE_MOTIFS = Object.keys(MOTIFS).filter((m) => !FIELD_MOTIFS.includes(m));
export function fireworkStyle(design, suitId, rank, n) {
  const o = design.fireworks && design.fireworks[suitId] && design.fireworks[suitId][rank];
  const st = o && o.styles && o.styles[n];
  return st && typeof st === 'object' && Object.keys(st).length ? st : null;
}
export function fireworkSpecAt(design, suit, rank, n) {
  const st = fireworkStyle(design, suit.id, rank, n);
  if (!st) return fireworkSpec(design, suit, rank);
  const spec = fireworkSpec(design, suit, rank, STYLE_MOTIFS.includes(st.motif) ? st.motif : undefined);
  for (const k of inheritKeys(spec.motif)) if (st[k] !== undefined && st[k] !== '') spec[k] = st[k];
  return spec;
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
  spec = withColours(spec);
  const m = spec.motif;
  if (!m || m === 'classic' || RADIAL_IDS.includes(m) || !(m in MOTIFS)) return rotated(drawRadial(spec, box), spec, box);
  const { cx, cy, r } = box;
  const R = r * Math.max(0.05, Math.min(1, spec.size));
  const rand = rng(spec.seed);
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  if (TYPES[m]) return `<g class="hb-firework" data-motif="${m}">${drawType(spec, cx, cy, R, Math.max(0.26, r * 0.022), rand, colors)}</g>`;
  const w = Math.max(0.26, r * 0.022);
  const s = { ...spec, colors };
  if (CATALOGUE_COUNT[m] && spec.rank) s.count = catalogueCountAt(m, spec.count, spec.rank);
  const sz = Math.max(0.05, Math.min(1, spec.size));
  // A burst is laid out on R less one stroke, so its outermost dots and line
  // caps land inside r rather than on it.
  const body = FIELDS[m] ? FIELDS[m](fieldRect(box, R, sz), s.count, colors, w, rand) : BURSTS[m](s, cx, cy, R - w, w, rand);
  return rotated(`<g class="hb-firework" data-motif="${m}">${body}</g>`, FIELDS[m] ? {} : spec, box);
}

// A phase-1 or catalogue burst turned by spec.rotation: about its centre, so
// it still reaches no further than r. Nothing is wrapped at rotation 0, so an
// unrotated burst is the markup it always was.
function rotated(svg, spec, box) {
  const a = +spec.rotation || 0;
  if (!a) return svg;
  return svg.replace(/^<g class="hb-firework"/, `<g class="hb-firework" transform="rotate(${f(a)} ${f(box.cx)} ${f(box.cy)})"`);
}
// outerColor / coreColor replace the first two colours; unset, nothing moves.
function withColours(spec) {
  if (!spec.outerColor && !spec.coreColor) return spec;
  const colors = [...(spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'])];
  if (spec.outerColor) colors[0] = spec.outerColor;
  if (spec.coreColor) { if (colors.length < 2) colors.push(spec.coreColor); else colors[1] = spec.coreColor; }
  return { ...spec, colors };
}

// The second tier, inside rect = { x, y, w, h }. Nothing when spec.tier is null.
export function renderTier(spec, rect) {
  if (!spec.tier || !FIELDS[spec.tier.motif]) return '';
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const w = Math.max(0.26, Math.min(rect.w, rect.h) * 0.02);
  const rand = rng((spec.seed ^ 0x9e3779b9) >>> 0);
  return `<g class="hb-tier" data-tier="${spec.tier.motif}">${FIELDS[spec.tier.motif](rect, spec.tier.count, [...colors.slice(1), colors[0]], w, rand)}</g>`;
}

// ---------------------------------------------------------------- the nine types
// Each type builds PRIMITIVES in a unit frame — the burst's centre at (0, 0),
// its reach about 1, y down — with stroke widths and dot radii in mm. drawType
// rotates them by spec.rotation, scales them to R (shrinking only, so nothing
// reaches past R including its stroke), and emits absolute coordinates only:
// lines, circles, and paths of M/L/C/Z, which the gate reads point by point.

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// How many arms / stars a type draws at a rank: the base count at rank 5,
// one step fewer per rank below, never under 3.
export function escalatedCount(type, base, rank) {
  const n = Math.max(3, Math.round(+base || 3));
  if (!TYPES[type] || !TYPES[type].escalate) return n;
  const step = Math.max(1, Math.round(n * 0.12));
  return Math.max(3, n - (5 - clampN(rank | 0 || 5, 1, 5)) * step);
}

// STARS IN RINGS (peony, ring). The count is the TOTAL of stars; Detail sets how
// many rings they are spread over. ringCounts() is phase 2's own law for an outer
// ring of n (a peony's rings each at least 5; a ring's inner rings, which Detail
// adds, likewise), and the plan inverts it: the largest outer ring whose rings
// hold no more than the count, the few stars left over on the outer ring. So a
// count phase 2 drew (every count a version-4 design is migrated to) is drawn
// star for star as it was; and under Scale the OUTER ring escalates, as it did.
export const peonyRingsFor = (density) => clampN(Math.round(1 + 2 * (density ?? 1)), 1, 5);
export const ringRingsFor = (density) => 1 + Math.min(4, Math.floor(clampN(+(density ?? 0), 0, 2) * 2 + 1e-9));
export function ringCounts(type, n, rings) {
  if (type === 'peony') return Array.from({ length: rings }, (_, k) => Math.max(5, Math.round(n * (1 - k / (rings + 0.6)))));
  return [n, ...Array.from({ length: rings - 1 }, (_, i) => Math.max(5, Math.round(n * (1 - 0.16 * (i + 1)))))];
}
const sumOf = (a) => a.reduce((x, y) => x + y, 0);
export function starPlan(type, total, density, rank = 5) {
  const T = Math.round(total);
  let rings = type === 'peony' ? peonyRingsFor(density) : ringRingsFor(density);
  while (rings > 1 && sumOf(ringCounts(type, 3, rings)) > T) rings--;
  let n = 3;
  while (sumOf(ringCounts(type, n + 1, rings)) <= T) n++;
  const left = Math.max(0, T - sumOf(ringCounts(type, n, rings)));
  const plan = ringCounts(type, escalatedCount(type, n, rank), rings);
  plan[0] += left;
  return plan;
}

const pol = (a, d) => [Math.cos(a) * d, Math.sin(a) * d];
// a cubic split at t: the second piece's control points
function cubicTail(p0, p1, p2, p3, t) {
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = L(p0, p1), b = L(p1, p2), c = L(p2, p3), d = L(a, b), e = L(b, c), g = L(d, e);
  return [g, e, c, p3];
}
function cubicHead(p0, p1, p2, p3, t) {
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = L(p0, p1), b = L(p1, p2), c = L(p2, p3), d = L(a, b), e = L(b, c), g = L(d, e);
  return [p0, a, d, g];
}
function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}

// DETAIL (the density parameter, 0..2). Every type's drawing at its own default
// density is the drawing phase 2 shipped, element for element. Below a default
// of 1 a type strips its secondary marks back (on an even share of its arms);
// above it, or above a default of 0, it adds finer marks. Added marks are
// flagged `det`: they never enter the fit, so detail never rescales a burst, and
// one that would land outside the burst's own reach is left out.
const detailOf = (s, dflt) => clampN(+(s.density ?? dflt), 0, 2);
// arm i of n keeps its secondary mark at share d (0..1): an even spread, all at 1
const keeps = (i, d) => Math.floor((i + 1) * d + 1e-9) > Math.floor(i * d + 1e-9);
// where the j-th added mark goes along a stroke (0..1): every new mark lands
// between two already there, so more detail only ever ADDS marks
const SPLIT = [0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875];

const TYPE_DRAW = {
  // concentric rings of round stars; no lines at all
  peony(s, n, w, rand, o, c) {
    const plan = s.plan || starPlan('peony', n, s.density, 5);
    const out = [], ss = s.starSize, rings = plan.length;
    const dr = w * 1.55 * ss;
    for (let k = 0; k < rings; k++) {
      const rr = 1 - k / (rings + 0.6), nk = plan[k], ph = rand() * Math.PI * 2;
      for (let i = 0; i < nk; i++) out.push({ k: 'dot', p: pol(ph + (i / nk) * Math.PI * 2, rr), r: dr * (1 - k * 0.12), col: k % 2 ? c : o });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: dr * 1.5, col: c });
    return out;
  },
  // long straight arms, a faint trail behind each bright head
  chrysanthemum(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, tr = clampN(s.trail ?? 0.75, 0, 1), ph = rand() * Math.PI * 2;
    const r0 = Math.max(0.08, len * (1 - tr)), wd = Math.max(0.16, w * 0.62 * s.starSize);
    // detail: below 1 the faint inner trails thin out; above 1, beads along each head
    const dd = detailOf(s, 1), beads = Math.round(Math.max(0, dd - 1) * 3);
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.06, l = len * (0.92 + rand() * 0.08);
      if (r0 > 0.1 && keeps(i, Math.min(1, dd))) out.push({ k: 'line', a: pol(a, 0.06), b: pol(a, r0), w: wd * 0.5, col: o, op: 0.4 });
      out.push({ k: 'line', a: pol(a, r0), b: pol(a, l), w: wd, col: i % 2 ? c : o });
      if (s.tips) out.push({ k: 'dot', p: pol(a, l), r: wd * 1.35, col: o });
      for (let j = 1; j <= beads; j++) out.push({ k: 'dot', det: true, p: pol(a, r0 + (l - r0) * SPLIT[j - 1]), r: wd * 1.3, col: i % 2 ? o : c });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: w * 1.6, col: c });
    return out;
  },
  // one hollow ring of stars; nothing inside but a core
  ring(s, n, w, rand, o, c) {
    const plan = s.plan || starPlan('ring', n, s.density, 5);
    const out = [], dr = w * 1.35 * s.starSize, ph = rand() * Math.PI * 2, n0 = plan[0];
    for (let i = 0; i < n0; i++) out.push({ k: 'dot', p: pol(ph + (i / n0) * Math.PI * 2, 1), r: dr, col: o });
    // detail: the stars spread over a further inner ring every half step, up to four
    const inner = plan.length - 1;
    for (let k = 1; k <= inner; k++) {
      const rr = 1 - 0.16 * k, m = plan[k];
      for (let i = 0; i < m; i++) out.push({ k: 'dot', det: true, p: pol(ph + ((i + (k % 2 ? 0.5 : 0)) / m) * Math.PI * 2, rr), r: dr * (0.75 - 0.08 * k), col: k % 2 ? c : o });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: dr * 1.2, col: c });
    return out;
  },
  // arms thrown out that fall: every trail droops toward the ground
  willow(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, tr = clampN(s.trail ?? 0.7, 0.1, 1), ph = rand() * Math.PI * 2;
    const wd = Math.max(0.16, w * 0.55 * s.starSize);
    // detail: below 1 the faint heads thin out; above 1, droplets down each trail
    const dd = detailOf(s, 1), drops = Math.round(Math.max(0, dd - 1) * 4);
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), L = len * (0.9 + rand() * 0.1);
      const p0 = [cs * 0.05, sn * 0.05], p1 = [cs * L * 0.6, sn * L * 0.6];
      const p2 = [cs * L * 0.82, sn * L * 0.42 + L * 0.3], p3 = [cs * L * 0.74, sn * L * 0.28 + L * 0.62];
      const t0 = 1 - tr;
      if (t0 > 0.02 && keeps(i, Math.min(1, dd))) out.push({ k: 'cubic', pts: cubicHead(p0, p1, p2, p3, t0), w: wd * 0.6, col: o, op: 0.35 });
      out.push({ k: 'cubic', pts: cubicTail(p0, p1, p2, p3, t0), w: wd, col: i % 2 ? c : o });
      if (s.tips) out.push({ k: 'dot', p: p3, r: wd * 1.3, col: o });
      for (let j = 1; j <= drops; j++) out.push({ k: 'dot', det: true, p: cubicAt(p0, p1, p2, p3, t0 + (1 - t0) * SPLIT[j - 1]), r: wd * 1.45, col: i % 2 ? o : c });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: w * 1.5, col: c });
    return out;
  },
  // a few thick tapered fronds, each rising and curling over
  palm(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, ph = -Math.PI / 2 + (rand() - 0.5) * 0.2;
    const W = w * 3.4 * s.starSize;
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), L = len;
      const p0 = [0, 0], p1 = [cs * L * 0.55, sn * L * 0.55], p2 = [cs * L * 0.95, sn * L * 0.78 + L * 0.12], p3 = [cs * L * 0.9, sn * L * 0.62 + L * 0.3];
      const pts = [], hw = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        pts.push(cubicAt(p0, p1, p2, p3, t));
        hw.push((W / 2) * Math.sin(Math.PI * (0.1 + 0.9 * t)) + W * 0.08);   // thickest mid-frond, narrowing to the tip
      }
      out.push({ k: 'ribbon', pts, hw, col: i % 2 ? c : o });
      if (s.tips) out.push({ k: 'dot', p: p3, r: W * 0.3, col: o });
      // detail: pairs of fine leaflets swept back off the frond
      const pairs = Math.round(detailOf(s, 0) * 3);
      for (let j = 1; j <= pairs; j++) {
        const t = 0.2 + 0.62 * SPLIT[j - 1], q = cubicAt(p0, p1, p2, p3, t), q2 = cubicAt(p0, p1, p2, p3, Math.max(0, t - 0.12));
        const tx = q[0] - q2[0], ty = q[1] - q2[1], tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, ll = L * 0.17;
        for (const sd of [1, -1]) out.push({ k: 'line', det: true, a: q, b: [q[0] + (-uy * sd * 0.8 - ux * 0.6) * ll, q[1] + (ux * sd * 0.8 - uy * 0.6) * ll], w: Math.max(0.14, w * 0.42), col: i % 2 ? c : o });
      }
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: W * 0.55, col: c });
    return out;
  },
  // arms that split near their end into a fork (three tines at high density)
  crossette(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, ph = rand() * Math.PI * 2, wd = Math.max(0.16, w * 0.62 * s.starSize);
    // detail: a third tine from 0.5, every tine splits again from 1.0 (with the
    // third tine back from 1.5), and sparks thread the arms at 2.0
    const lvl = Math.min(4, Math.floor(detailOf(s, 0) * 2 + 1e-9));
    const tines = lvl === 1 || lvl >= 3 ? [-0.55, 0, 0.55] : [-0.5, 0.5];
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2, j = pol(a, len * 0.56);
      out.push({ k: 'line', a: pol(a, 0.08), b: j, w: wd, col: o });
      if (lvl === 4) for (const u of [0.24, 0.4]) out.push({ k: 'dot', det: true, p: pol(a, len * u), r: wd * 0.85, col: c });
      for (const da of tines) {
        const e = [j[0] + Math.cos(a + da) * len * 0.4, j[1] + Math.sin(a + da) * len * 0.4];
        out.push({ k: 'line', a: j, b: e, w: wd * 0.85, col: c });
        if (s.tips) out.push({ k: 'dot', p: e, r: wd * 1.3, col: c });
        if (lvl >= 2) {
          const m = [j[0] + Math.cos(a + da) * len * 0.22, j[1] + Math.sin(a + da) * len * 0.22];
          for (const sd of [-0.5, 0.5]) out.push({ k: 'line', det: true, a: m, b: [m[0] + Math.cos(a + da + sd) * len * 0.15, m[1] + Math.sin(a + da + sd) * len * 0.15], w: wd * 0.6, col: o });
        }
      }
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: w * 1.6, col: c });
    return out;
  },
  // short, fat petals of light round a core, gaps between them
  dahlia(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, ph = rand() * Math.PI * 2, W = w * 3.4 * s.starSize;
    // detail: fine spokes in the gaps between petals (to 1.0), then a streak down
    // each petal in the other colour (1.0 to 2.0)
    const dd = detailOf(s, 0);
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2;
      out.push({ k: 'line', a: pol(a, len * 0.36), b: pol(a, len * 0.86), w: W, col: i % 2 ? c : o });
    }
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2;
      if (dd > 0 && keeps(i, Math.min(1, dd))) out.push({ k: 'line', det: true, a: pol(a + Math.PI / n, len * 0.3), b: pol(a + Math.PI / n, len * 0.8), w: Math.max(0.14, w * 0.4), col: o });
      if (dd > 1 && keeps(i, dd - 1)) out.push({ k: 'line', det: true, a: pol(a, len * 0.42), b: pol(a, len * 0.8), w: W * 0.28, col: i % 2 ? o : c });
    }
    if (s.core) {
      const m = Math.max(6, Math.round(n * 0.75));
      for (let i = 0; i < m; i++) out.push({ k: 'dot', p: pol(ph + (i / m) * Math.PI * 2, len * 0.17), r: w * 0.8, col: c });
      out.push({ k: 'dot', p: [0, 0], r: w * 1.3, col: o });
    }
    return out;
  },
  // a cloud of four-point sparks with no structure at all: exactly n of them,
  // every one fitted. Detail: the share drawn as four-point sparks (the rest round
  // stars) — 0 half and half, 1 three in four (phase 2's), 2 every one.
  glitter(s, n, w, rand, o, c) {
    const out = [], m = Math.max(6, n), roundShare = clampN(0.5 - 0.25 * detailOf(s, 1), 0, 0.5);
    for (let i = 0; i < m; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.94, p = pol(a, d), z = (0.05 + rand() * 0.07) * s.starSize;
      const col = i % 3 === 2 ? c : o, wd = Math.max(0.16, w * 0.62);
      if (keeps(i, roundShare)) { out.push({ k: 'dot', p, r: wd * 1.2, col }); continue; }
      out.push({ k: 'line', a: [p[0] - z, p[1]], b: [p[0] + z, p[1]], w: wd, col });
      out.push({ k: 'line', a: [p[0], p[1] - z], b: [p[0], p[1] + z], w: wd, col });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: w * 1.5, col: c });
    return out;
  },
  // GLITTER AS PHASE 2b DREW IT (Detail was the spark count): kept for a design
  // migrated from version 4 with its glitter's Detail set by hand (its `legacy`).
  glitterLegacy(s, n, w, rand, o, c) {
    // detail: the spark count. The cloud is FITTED on the sparks detail 1 draws —
    // below 1 the rest are ghosts (fitted, not drawn), above it the extra are
    // detail — so the cloud keeps its size whatever the setting
    const out = [], base = Math.max(6, n), m = Math.max(6, Math.round(n * detailOf(s, 1))), M = Math.max(m, base);
    for (let i = 0; i < M; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.94, p = pol(a, d), z = (0.05 + rand() * 0.07) * s.starSize;
      const col = i % 3 === 2 ? c : o, wd = Math.max(0.16, w * 0.62), fl = { ...(i >= base ? { det: true } : {}), ...(i >= m ? { ghost: true } : {}) };
      if (i % 4 === 3) { out.push({ k: 'dot', p, r: wd * 1.2, col, ...fl }); continue; }
      out.push({ k: 'line', a: [p[0] - z, p[1]], b: [p[0] + z, p[1]], w: wd, col, ...fl });
      out.push({ k: 'line', a: [p[0], p[1] - z], b: [p[0], p[1] + z], w: wd, col, ...fl });
    }
    if (s.core) out.push({ k: 'dot', p: [0, 0], r: w * 1.5, col: c });
    return out;
  },
  // solid notched petals (the sakura blossom), stamens at the centre
  blossom(s, n, w, rand, o, c) {
    const out = [], len = s.length ?? 1, ph = -Math.PI / 2, k = Math.min(1, 5 / n) * clampN(s.starSize, 0.5, 1.6);
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      const at = (u, v) => [(cs * u - sn * v * k) * len, (sn * u + cs * v * k) * len];
      out.push({ k: 'petal', segs: [at(0.13, 0),
        [at(0.3, 0.3), at(0.7, 0.44), at(0.97, 0.15)], at(0.87, 0), at(0.97, -0.15),
        [at(0.7, -0.44), at(0.3, -0.3), at(0.13, 0)]], col: o });
    }
    // detail: veins drawn into every petal (centre, then the two sides, then a
    // second pair), in the second colour
    const veins = Math.round(detailOf(s, 0) * 2.5), vw = Math.max(0.14, w * 0.32);
    for (let i = 0; i < n && veins; i++) {
      const a = ph + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      const at = (u, v) => [(cs * u - sn * v * k) * len, (sn * u + cs * v * k) * len];
      const vs = [[0, 0.78], [0.12, 0.66], [-0.12, 0.66], [0.24, 0.52], [-0.24, 0.52]].slice(0, veins);
      for (const [v, u] of vs) out.push({ k: 'line', det: true, a: at(0.2, v * 0.3), b: at(u, v), w: vw, col: c });
    }
    if (s.core) {
      for (let i = 0; i < n; i++) {
        const a = ph + ((i + 0.5) / n) * Math.PI * 2;
        out.push({ k: 'line', a: [0, 0], b: pol(a, len * 0.3), w: Math.max(0.14, w * 0.4), col: c });
        out.push({ k: 'dot', p: pol(a, len * 0.3), r: w * 0.7, col: c });
      }
      out.push({ k: 'dot', p: [0, 0], r: w * 1.2, col: c });
    }
    return out;
  },
};

// A glitter migrated from version 4 with its Detail set by hand keeps the drawing
// it had: `legacy` is the old { count, density }, and it holds only while the
// count is still the one it drew and Detail is back at 1 (what the migration
// wrote). Touch either and the firework is drawn by the count law.
export const legacyGlitterCount = (L) => Math.max(6, Math.round(Math.max(3, Math.round(+L.count || 3)) * clampN(+(L.density ?? 1), 0, 2)));
function glitterLegacyOf(s) {
  const L = s.legacy;
  if (!L || typeof L !== 'object' || !Number.isFinite(+L.count) || !Number.isFinite(+L.density)) return null;
  return +s.count === legacyGlitterCount(L) && +(s.density ?? 1) === 1 ? L : null;
}

function drawType(spec, cx, cy, R, w, rand, colors) {
  const s = { ...TYPES[spec.motif].defaults, ...spec };
  s.starSize = clampN(+s.starSize || 1, PARAMS.starSize.min, PARAMS.starSize.max);
  const cr = TYPES[spec.motif].count, count = clampN(Math.round(+s.count || cr.min), cr.min, cr.max);
  const o = colors[0], c = pick(colors, 1);
  let all;
  const leg = spec.motif === 'glitter' ? glitterLegacyOf(s) : null;
  if (leg) all = TYPE_DRAW.glitterLegacy({ ...s, density: leg.density }, escalatedCount('glitter', leg.count, s.rank), w, rand, o, c);
  else if (spec.motif === 'peony' || spec.motif === 'ring') all = TYPE_DRAW[spec.motif]({ ...s, plan: starPlan(spec.motif, count, s.density, s.rank) }, count, w, rand, o, c);
  else all = TYPE_DRAW[spec.motif](s, escalatedCount(spec.motif, count, s.rank), w, rand, o, c);
  // fit: the unit frame is scaled to R, shrinking until every point plus its
  // stroke or radius lands inside R — on the BASE marks only, so detail never
  // rescales the burst
  let k = R;
  const each = (fn, prims = all.filter((p) => !p.det)) => { for (const p of prims) {
    if (p.k === 'dot') fn(p.p, p.r);
    else if (p.k === 'line') { fn(p.a, p.w / 2); fn(p.b, p.w / 2); }
    else if (p.k === 'cubic') for (const q of p.pts) fn(q, p.w / 2);
    else if (p.k === 'ribbon') p.pts.forEach((q, i) => fn(q, p.hw[i]));
    else for (const g of p.segs) for (const q of (Array.isArray(g[0]) ? g : [g])) fn(q, 0);
  } };
  each((q, pad) => { const d = Math.hypot(q[0], q[1]); if (d > 1e-9) k = Math.min(k, (R - pad) / d); });
  k = Math.max(k, R * 0.05);
  // a ghost is fitted and not drawn; a detail mark that would reach past R is left out
  const prims = all.filter((p) => { if (p.ghost) return false; if (!p.det) return true; let ok = true; each((q, pad) => { if (Math.hypot(q[0], q[1]) * k + pad > R + 1e-9) ok = false; }, [p]); return ok; });
  const rot = ((+spec.rotation || 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const T = (q) => [cx + (q[0] * cs - q[1] * sn) * k, cy + (q[0] * sn + q[1] * cs) * k];
  const Pq = (q) => { const t = T(q); return P(t[0], t[1]); };
  const op = (p) => (p.op ? ` stroke-opacity="${p.op}"` : '');
  return prims.map((p) => {
    if (p.k === 'dot') { const t = T(p.p); return dot(t[0], t[1], p.r, p.col); }
    if (p.k === 'line') { const a = T(p.a), b = T(p.b); return line(a[0], a[1], b[0], b[1], p.col, p.w, op(p)); }
    if (p.k === 'cubic') return `<path d="M${Pq(p.pts[0])} C${Pq(p.pts[1])} ${Pq(p.pts[2])} ${Pq(p.pts[3])}" fill="none" stroke="${p.col}" stroke-width="${f(p.w)}" stroke-linecap="round"${op(p)}/>`;
    if (p.k === 'ribbon') {
      // the centreline in mm, then offset by each sample's half-width (mm)
      const c = p.pts.map(T), left = [], right = [];
      c.forEach((q, i) => {
        const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
        left.push(P(q[0] - (dy / dl) * p.hw[i], q[1] + (dx / dl) * p.hw[i])); right.push(P(q[0] + (dy / dl) * p.hw[i], q[1] - (dx / dl) * p.hw[i]));
      });
      return `<path d="M${[...left, ...right.reverse()].join(' L')} Z" fill="${p.col}"/>`;
    }
    const sg = p.segs;
    return `<path d="M${Pq(sg[0])} C${sg[1].map(Pq).join(' ')} L${Pq(sg[2])} L${Pq(sg[3])} C${sg[4].map(Pq).join(' ')} Z" fill="${p.col}"/>`;
  }).join('');
}
