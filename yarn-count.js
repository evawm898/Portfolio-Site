/* ---------------------------------------------------
   yarn-count.js — yarn count units and the spec-string parser
   (Yarn Characterization, section 01). Pure: no DOM, so the gate
   (tools/verify-yarn-characterization.mjs) imports it in Node and
   the page imports the same file.

   Every unit is converted through TEX (grams per 1,000 m), the one
   internal unit. Each constant is DERIVED from its definition
   rather than typed, so a reader can check it against the unit's
   own wording:

     denier  g per 9,000 m          direct   (heavier = bigger)
     dtex    g per 10,000 m         direct
     tex     g per 1,000 m          direct
     Ne      840-yd hanks per lb    indirect (heavier = smaller)
     Nm      km per kg              indirect

   The yard is 0.9144 m exactly and the pound 453.59237 g exactly
   (the 1959 international definitions), so Ne = 590.54 / tex
   (453.59237 g ÷ 0.768096 km; textbook tables round it to 590.5).
--------------------------------------------------- */

export const YARD_M = 0.9144;
export const POUND_G = 453.59237;
export const HANK_M = 840 * YARD_M;              // 768.096 m

// tex × Ne: a yarn of count Ne has Ne hanks (Ne × 768.096 m) in 453.59237 g,
// so its mass per 1,000 m is 453.59237 / (Ne × 0.768096) g.
export const NE_K = POUND_G / (HANK_M / 1000);   // 590.541…

export const UNITS = [
  { id: 'den',  label: 'Denier',  short: 'D',    kind: 'direct',   def: 'grams per 9,000 m' },
  { id: 'dtex', label: 'Decitex', short: 'dtex', kind: 'direct',   def: 'grams per 10,000 m' },
  { id: 'tex',  label: 'Tex',     short: 'tex',  kind: 'direct',   def: 'grams per 1,000 m' },
  { id: 'Ne',   label: 'Cotton count', short: 'Ne', kind: 'indirect', def: '840-yard hanks per pound' },
  { id: 'Nm',   label: 'Metric count', short: 'Nm', kind: 'indirect', def: 'kilometres per kilogram' }
];

/** Any unit → tex. Returns NaN for a non-positive or non-finite input. */
export function toTex(value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return NaN;
  switch (unit) {
    case 'den':  return v / 9;
    case 'dtex': return v / 10;
    case 'tex':  return v;
    case 'Ne':   return NE_K / v;
    case 'Nm':   return 1000 / v;
    default: throw new Error('unknown unit ' + unit);
  }
}

/** tex → any unit. */
export function fromTex(tex, unit) {
  if (!Number.isFinite(tex) || tex <= 0) return NaN;
  switch (unit) {
    case 'den':  return tex * 9;
    case 'dtex': return tex * 10;
    case 'tex':  return tex;
    case 'Ne':   return NE_K / tex;
    case 'Nm':   return 1000 / tex;
    default: throw new Error('unknown unit ' + unit);
  }
}

/** One value in one unit → every unit. */
export function convertAll(value, unit) {
  const tex = toTex(value, unit);
  const out = {};
  for (const u of UNITS) out[u.id] = fromTex(tex, u.id);
  return out;
}

/** Round to n significant figures for display; '—' for NaN. */
export function sig(x, n = 3) {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(x))));
  const r = Math.round(x * p) / p;
  // toLocaleString drops trailing zeros and keeps thousands separators
  return r.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/* ---------------------------------------------------
   Fibre densities (g/cm³) — typical values for the solid polymer,
   used ONLY to estimate a filament's diameter. Morton & Hearle,
   Physical Properties of Textile Fibres, table of densities.
--------------------------------------------------- */
export const FIBRES = [
  { id: 'polyester', label: 'polyester (PET)', density: 1.38, words: ['polyester', 'pet', 'poly'] },
  { id: 'nylon', label: 'nylon (polyamide)', density: 1.14, words: ['nylon', 'polyamide', 'pa', 'pa6', 'pa66', 'pa6.6'] },
  { id: 'polypropylene', label: 'polypropylene (PP)', density: 0.91, words: ['polypropylene', 'pp'] },
  { id: 'elastane', label: 'elastane (spandex)', density: 1.21, words: ['elastane', 'spandex', 'lycra'] },
  { id: 'cotton', label: 'cotton', density: 1.52, words: ['cotton'] },
  { id: 'wool', label: 'wool', density: 1.31, words: ['wool'] },
  { id: 'viscose', label: 'viscose', density: 1.51, words: ['viscose', 'rayon'] }
];

/** Diameter in µm of a SOLID ROUND filament of `dtexPerFilament` and density ρ (g/cm³).
 *  Mass per metre = dtex × 1e-4 g; area = that ÷ (ρ × 1e6 g/m³); d = √(4A/π). */
export function filamentDiameterUm(dtexPerFilament, density) {
  if (!(dtexPerFilament > 0) || !(density > 0)) return NaN;
  const areaM2 = (dtexPerFilament * 1e-4) / (density * 1e6);
  return Math.sqrt(4 * areaM2 / Math.PI) * 1e6;
}

export const PROCESSES = {
  poy: { label: 'POY', name: 'partially oriented yarn', note: 'Spun fast and only partly drawn. A feedstock for draw-texturing, not a yarn sold for fabric.' },
  fdy: { label: 'FDY', name: 'fully drawn yarn', note: 'Drawn to full orientation in one step. Flat, smooth and lustrous; no crimp.' },
  dty: { label: 'DTY', name: 'draw-textured yarn', note: 'POY drawn and false-twist textured. The filaments keep a helical crimp: bulk and some stretch.' },
  aty: { label: 'ATY', name: 'air-textured yarn', note: 'Filament blown into loops by an air jet. A spun-like, matte hand with little stretch.' }
};

/* ---------------------------------------------------
   The spec parser. It reads the shapes people meet on a sheet:

     150D/48F   150d/48f   167dtex/48f   150D      (direct count, filaments)
     2/150D/48F   150D/48F x2   2x150D/48F         (plied filament)
     2/150/48   1/75/36                            (plies/denier/filaments, no units)
     30s   Ne 30   2/30s   30/2 Ne                 (cotton count)
     Nm 48   Nm 48/2   2/48 Nm                     (metric count)

   plus an optional process word (POY / FDY / DTY / ATY) and fibre.
   For the INDIRECT systems the ply number and the count are written
   in either order by different regions (2/30s, 30/2), so the rule is
   stated rather than guessed: the smaller number (at most 6) is the
   number of plies. Resultant counts ignore twist take-up (a few %).
--------------------------------------------------- */
const MAX_PLIES = 6;

export function parseSpec(input) {
  const raw = String(input || '').trim();
  const res = { ok: false, input: raw, terms: [], notes: [] };
  if (!raw) { res.error = 'empty'; return res; }

  let s = raw.toLowerCase().replace(/[×*]/g, 'x').replace(/\s+/g, ' ');

  // process and fibre words, removed before the numbers are read
  for (const key of Object.keys(PROCESSES)) {
    const re = new RegExp('\\b' + key + '\\b');
    if (re.test(s)) { res.process = key; s = s.replace(re, ' '); }
  }
  for (const f of FIBRES) {
    for (const w of f.words) {
      const re = new RegExp('(^|[^a-z0-9.])' + w.replace('.', '\\.') + '(?![a-z0-9])');
      if (re.test(s)) { res.fibre = f.id; s = s.replace(re, '$1 '); break; }
    }
    if (res.fibre) break;
  }
  s = s.replace(/\b(recycled|filament|yarn|textured|spun|crimp)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const NUM = '(\\d+(?:\\.\\d+)?)';
  let m;

  // --- direct count with a unit, optional /NNf, optional plies before or after
  m = s.match(new RegExp('^(?:' + NUM + ' ?(?:x|/) ?)?' + NUM + ' ?(denier|den|dtex|tex|d)\\b(?: ?/ ?' + NUM + ' ?f(?:il)?)?(?: ?x ?' + NUM + ')?$'));
  if (m) {
    const unit = m[3] === 'denier' || m[3] === 'den' || m[3] === 'd' ? 'den' : m[3];
    return direct(res, Number(m[1] || m[5] || 1), Number(m[2]), unit, m[4] ? Number(m[4]) : null,
      m[1] ? 'before' : (m[5] ? 'after' : null));
  }

  // --- plies/denier/filaments, no units (2/150/48)
  m = s.match(new RegExp('^' + NUM + ' ?/ ?' + NUM + ' ?/ ?' + NUM + '$'));
  if (m) {
    res.notes.push('Read as plies / denier / filaments, the usual shorthand for synthetic filament.');
    return direct(res, Number(m[1]), Number(m[2]), 'den', Number(m[3]), 'shorthand');
  }

  // --- cotton count: 30s, ne 30, 30 ne, 2/30s, 30/2s, 30/2 ne, ne 30/2
  m = s.match(new RegExp('^(?:ne ?)?' + NUM + '(?: ?/ ?' + NUM + ')? ?(?:s|ne)?$'));
  if (m && (/ne|s$/.test(s))) return indirect(res, m[1], m[2], 'Ne');

  // --- metric count: nm 48, 48 nm, nm 48/2, 2/48 nm
  m = s.match(new RegExp('^(?:nm ?)?' + NUM + '(?: ?/ ?' + NUM + ')? ?(?:nm)?$'));
  if (m && /nm/.test(s)) return indirect(res, m[1], m[2], 'Nm');

  res.error = /^\d+(\.\d+)? ?\/ ?\d+(\.\d+)?$/.test(s)
    ? 'ambiguous: two bare numbers could be denier/filaments or a ply/count pair. Add a unit, e.g. 150D/48F or 2/30s.'
    : 'not understood. Try 150D/48F, 167dtex/48f, 2/150/48, 2/30s or Nm 48/2.';
  return res;
}

function direct(res, plies, count, unit, filaments, pliesWritten) {
  if (!(count > 0) || !(plies >= 1) || plies > MAX_PLIES || (filaments !== null && !(filaments >= 1))) {
    res.error = 'numbers out of range'; return res;
  }
  if (!Number.isInteger(plies)) { res.error = 'the ply number must be whole'; return res; }
  if (filaments !== null && !Number.isInteger(filaments)) { res.error = 'the filament count must be whole'; return res; }
  const texPerPly = toTex(count, unit);
  res.ok = true;
  res.system = 'direct';
  res.plies = plies;
  res.texPerPly = texPerPly;
  res.texTotal = texPerPly * plies;
  res.filaments = filaments;                       // per ply
  res.filamentsTotal = filaments ? filaments * plies : null;
  res.dpf = filaments ? fromTex(texPerPly, 'den') / filaments : null;
  res.dtexPerFilament = filaments ? fromTex(texPerPly, 'dtex') / filaments : null;
  const fib = FIBRES.find(f => f.id === (res.fibre || 'polyester'));
  res.densityAssumed = !res.fibre;
  res.density = fib.density;
  res.filamentDiameterUm = filaments ? filamentDiameterUm(res.dtexPerFilament, fib.density) : null;
  if (filaments && res.fibre && ['cotton', 'wool'].includes(res.fibre)) {
    res.notes.push('Cotton and wool are staple fibres; a filament count does not apply to them.');
  }
  if (plies > 1) res.notes.push('Resultant count is plies × count per ply; real plied yarn weighs a few % more (twist take-up).');
  return res;
}

function indirect(res, a, b, unit) {
  let count = Number(a), plies = 1;
  if (b !== undefined) {
    const x = Number(a), y = Number(b);
    if (Math.min(x, y) > MAX_PLIES) {
      res.error = 'one of the two numbers should be the ply count (6 or fewer).'; return res;
    }
    plies = Math.min(x, y); count = Math.max(x, y);
    res.notes.push('In the ' + unit + ' system regions write ply/count (2/30s) or count/ply (30/2); the smaller number is read as the plies.');
  }
  if (!Number.isInteger(plies) || !(count > 0)) { res.error = 'numbers out of range'; return res; }
  const texPerPly = toTex(count, unit);
  res.ok = true;
  res.system = 'indirect';
  res.unitWritten = unit;
  res.countPerPly = count;
  res.plies = plies;
  res.texPerPly = texPerPly;
  res.texTotal = texPerPly * plies;
  res.resultant = count / plies;                   // in the same indirect unit
  res.filaments = null;
  res.dpf = null;
  if (plies > 1) res.notes.push('Resultant count is count ÷ plies; real plied yarn is a little heavier (twist take-up).');
  return res;
}
