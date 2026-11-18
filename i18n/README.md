# Page translations

**Status: tooling only. No locale is published and no page copy is translated.**
The term glossary is in [`docs/i18n/textile-glossary-zh.md`](../docs/i18n/textile-glossary-zh.md).

## How it works

The English page is the source. Each translatable element carries a `data-i18n` key. A locale's
strings live in `i18n/<locale>/<page>.json`, and a generator writes a static page per locale.

| Piece | Where |
|---|---|
| Pages and locales | `i18n/config.json` |
| Strings to translate | `i18n/zh-Hans/textile-101.json`, `dyeing.json`, `chrome.json` (nav and footer, shared) |
| Generator | `tools/i18n/build.mjs` |
| Fonts pipeline | `tools/i18n/fonts.mjs` |
| CSS for translated pages | `textile-i18n.css` |
| Captions drawn by JavaScript | wrapped in `tr('…')` from `textile-i18n.js` |

Generated pages go to `zh/textile-101.html` and `zh/dyeing.html`, served as `/zh/textile-101` and
`/zh/dyeing`. They are written only when the locale has `"published": true`.

## Translating

Open a strings file and fill the `"zh-Hans"` value under each `"en"`:

```json
"hero.h11": { "en": "Dyeing", "zh-Hans": "" }
```

- Keep inline markup (`<em>`, `<a href=…>`, `<span class="n">01</span>`) as it is and translate around it.
- Keys starting `js:` are captions the animations draw. `{temp}` and similar are filled in at run time; keep them.
- If the English later changes, `--extract` marks the entry `"stale": true` and keeps the old English as `"was"`.
  Re-check the translation, then delete those two fields.

## Commands

```bash
node tools/i18n/build.mjs --annotate    # add keys to new elements in the English pages
node tools/i18n/build.mjs --extract     # refresh the strings files from the pages
node tools/i18n/build.mjs --build       # write the pages of published locales
node tools/i18n/build.mjs --check       # fail if any of the above would change a file
node tools/i18n/build.mjs --self-test   # pseudo-locale: proves every string is reached
node tools/i18n/fonts.mjs --build       # cut the fonts for published locales
node tools/i18n/fonts.mjs --check
```

`fonts.mjs --build` needs `pip install fonttools brotli`. Font sources are npm packages pinned by
version and integrity in `i18n/config.json`; they are cached in `tools/.cache/` and never committed.

None of this runs in CI yet.

## To publish zh-Hans (after the copy is translated)

1. Remove the `hold` list from `textile-101.html` in `i18n/config.json`, then `--annotate` and `--extract`.
   Sections 02, 03 and 08 are on hold while they are rewritten.
2. Wrap the labels drawn by `textile-101-figures.js` in `tr()` and list the file under the page's `js`.
3. Fill the strings files. Set `"published": true`.
4. `build.mjs --build`, `fonts.mjs --build`, commit `zh/` and `assets/fonts/zh-Hans/`.
5. Add the `EN / 中文` link, the `hreflang` links and `textile-i18n.css` to the two English pages.
