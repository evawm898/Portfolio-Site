# Page translations

**Status: zh-Hans is translated and marked published on the PR branch, for review. A Chinese reader has not
checked the copy yet.**
The term glossary is in [`docs/i18n/textile-glossary-zh.md`](../docs/i18n/textile-glossary-zh.md).

## How it works

The English page is the source. Each translatable element carries a `data-i18n` key. A locale's
strings live in `i18n/<locale>/<page>.json`, and a generator writes a static page per locale.

| Piece | Where |
|---|---|
| Pages and locales | `i18n/config.json` |
| Strings to translate | `i18n/zh-Hans/textile-101.json`, `dyeing.json`, `chrome.json` (nav and footer, shared) |
| Glossary terms | `i18n/zh-Hans/glossary.json` |
| Generator | `tools/i18n/build.mjs` |
| Fonts pipeline | `tools/i18n/fonts.mjs` |
| CSS for translated pages | `textile-i18n.css` |
| Captions drawn by JavaScript | wrapped in `tr('…')` from `textile-i18n.js` |

Generated pages go to `zh/textile-101.html`, `zh/dyeing.html` and `zh/glossary.html`, served as
`/zh/textile-101`, `/zh/dyeing` and `/zh/glossary`. They are written only when the locale has `"published": true`, and are committed.

## Translating

Open a strings file and fill the `"zh-Hans"` value under each `"en"`:

```json
"hero.h11": { "en": "Dyeing", "zh-Hans": "" }
```

- Keep inline markup (`<em>`, `<a href=…>`, `<span class="n">01</span>`) as it is and translate around it.
- Keys starting `js:` are captions the animations draw. `{temp}` and similar are filled in at run time; keep them.
- If the English later changes, `--extract` marks the entry `"stale": true` and keeps the old English as `"was"`.
  Re-check the translation, then delete those two fields.

## Glossary terms

`i18n/zh-Hans/glossary.json` is the one place a term's Chinese wording lives. Each entry has the recommended
term, its alternatives (`aka`), the English, and a one-sentence description. It generates `zh/glossary.html`
and the footer line "术语有更准确的行业说法？欢迎告诉我们" on every translated page.

In a strings file, name a term by its id instead of typing it:

- `[[wicking]]` at the FIRST mention on a page. It prints the term linked to its glossary entry, followed by
  （又称 导湿；英文 wicking）. Follow it with one plain sentence saying what the thing is.
- `{{wicking}}` at every later mention. It prints the recommended term alone.

The generator refuses an unknown id, a second `[[id]]` on one page, and a `{{id}}` the page never introduced.
Attributes and animation captions cannot hold a link, so use `{{id}}` there.

### Folding in a correction

When someone writes in with a better term:

1. Open `i18n/zh-Hans/glossary.json` and find the entry by its English.
2. Put the better term in `"term"`. Move the old one into `"aka"` if it is still in use, or delete it.
3. Fix `"desc"` if the correction changes the meaning.
4. Run `node tools/i18n/build.mjs --build`, then `node tools/i18n/fonts.mjs --build` (a new term may use new characters).
5. Record the change and who suggested it in `docs/i18n/textile-glossary-zh.md`.

Every page that names the term by id picks up the new wording. A term typed out literally in a strings file
does not, so search the strings files for the old wording once.

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

None of this runs in CI yet. After any change to a page's copy, a strings file or the glossary, run
`build.mjs --annotate`, `--extract`, `--build`, then `fonts.mjs --build`, and commit the results.

## What a published locale adds to the English pages

Each English page carries three things per published locale, and `--check` fails if one is missing:
the `hreflang` links in the head, the `EN / 中文` link in the top nav (marked `data-i18n-skip`), and a link to
`textile-i18n.css`.
