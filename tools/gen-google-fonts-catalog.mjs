/*
 * gen-google-fonts-catalog.mjs — regenerates cards/google-fonts-catalog.js,
 * the family list behind the /cards font picker.
 *
 * WHY A COMMITTED ARTIFACT: cards.html is a no-build-step static page, and the
 * Google Fonts Developer API (webfonts/v1) needs an API key — a key shipped in
 * client JS is a key published. So the catalog is generated here, at authoring
 * time, and committed, exactly the way assets/presets/ thumbnails are (see
 * CLAUDE.md, "Preset thumbnails are a build-time artifact"). The runtime never
 * asks anyone for the family list; it only fetches the ONE family a visitor
 * actually picks, from fonts.googleapis.com.
 *
 * SOURCES, in priority order:
 *   1. GOOGLE_FONTS_API_KEY in the environment — the canonical source:
 *      https://www.googleapis.com/webfonts/v1/webfonts?key=...&sort=popularity
 *   2. a local `npm i --no-save google-font-metadata` install, whose
 *      data/api-response.json is a verbatim capture of that same endpoint.
 *      (Dev-only dependency; see the note in .gitignore about why local dev
 *      deps are not listed in package.json.)
 *
 * WHAT IT WRITES: name, category and the family's UPRIGHT weights only. The
 * card ranks are Latin letters and digits drawn upright, so italic-only
 * variants and non-latin-subset families are dropped rather than shipped as
 * options that cannot render an "A".
 *
 * RUN:  node tools/gen-google-fonts-catalog.mjs
 *       node tools/gen-google-fonts-catalog.mjs --check   # CI-style: fail if stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'cards/google-fonts-catalog.js');
const CHECK = process.argv.includes('--check');

// Order matters: the index into this array is what the packed catalog stores.
const CATEGORIES = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace'];

async function loadApiResponse() {
  const key = process.env.GOOGLE_FONTS_API_KEY;
  if (key) {
    const url = `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`webfonts API ${res.status} ${res.statusText}`);
    const json = await res.json();
    return { items: json.items, source: 'webfonts/v1 (GOOGLE_FONTS_API_KEY), sorted by popularity' };
  }
  const local = path.join(ROOT, 'node_modules/google-font-metadata/data/api-response.json');
  if (!fs.existsSync(local)) {
    throw new Error(
      'No catalog source. Either set GOOGLE_FONTS_API_KEY, or run:\n' +
      '  npm i --no-save google-font-metadata'
    );
  }
  const items = JSON.parse(fs.readFileSync(local, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/google-font-metadata/package.json'), 'utf8'));
  return { items, source: `google-font-metadata@${pkg.version} data/api-response.json` };
}

// "regular" -> 400, "500" -> 500, "italic"/"500italic" -> dropped (upright only).
function uprightWeights(variants) {
  const out = new Set();
  for (const v of variants || []) {
    if (v.includes('italic')) continue;
    if (v === 'regular') { out.add(400); continue; }
    const n = Number(v);
    if (Number.isInteger(n) && n >= 100 && n <= 1000) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

const { items, source } = await loadApiResponse();

const rows = [];
const skipped = { noLatin: 0, noUpright: 0, unknownCategory: 0, pipeInName: 0 };
for (const f of items) {
  if (!f.subsets || !f.subsets.includes('latin')) { skipped.noLatin++; continue; }
  const catIndex = CATEGORIES.indexOf(f.category);
  if (catIndex < 0) { skipped.unknownCategory++; continue; }
  const weights = uprightWeights(f.variants);
  if (!weights.length) { skipped.noUpright++; continue; }
  // The packed record is pipe-delimited; a family name containing one would
  // silently corrupt the parse, so refuse it rather than ship a broken row.
  if (f.family.includes('|') || f.family.includes('\n')) { skipped.pipeInName++; continue; }
  rows.push(`${f.family}|${catIndex}|${weights.map((w) => w / 100).join(',')}`);
}

// Packed as one newline-delimited string rather than 1,900 object literals:
// same data, roughly a third of the bytes, and it parses in ~1ms at load.
const body = `// GENERATED FILE — do not edit by hand.
// Regenerate with:  node tools/gen-google-fonts-catalog.mjs
// Source: ${source}
// Families: ${rows.length} (upright, latin-subset only)
//
// Packed record: <family>|<category index>|<upright weights /100, comma-sep>
// e.g. "Roboto|0|1,3,4,5,7,9" = sans-serif, weights 100/300/400/500/700/900.

export const GOOGLE_FONT_CATEGORIES = ${JSON.stringify(CATEGORIES)};

const PACKED = \`${rows.join('\n')}\`;

// Parsed once at module load. \`weights\` is ascending, always non-empty.
export const GOOGLE_FONTS = PACKED.split('\\n').map((line) => {
  const [name, cat, weights] = line.split('|');
  return {
    name,
    category: GOOGLE_FONT_CATEGORIES[Number(cat)],
    weights: weights.split(',').map((w) => Number(w) * 100),
  };
});
`;

if (CHECK) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  // The header carries the source string + a date-free family count, so a
  // pure re-run with the same dataset is byte-identical.
  if (existing !== body) {
    console.error('gen-google-fonts-catalog --check: cards/google-fonts-catalog.js is STALE.');
    console.error('Run: node tools/gen-google-fonts-catalog.mjs');
    process.exit(1);
  }
  console.log(`gen-google-fonts-catalog --check: up to date (${rows.length} families)`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — ${rows.length} families, ${(body.length / 1024).toFixed(1)} KB`);
  console.log(`  source: ${source}`);
  console.log(`  skipped: ${JSON.stringify(skipped)}`);
}
