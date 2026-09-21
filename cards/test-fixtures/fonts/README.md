# Font fixtures — the custom-upload path

Two real font files, in the two formats a visitor is most likely to have on
disk, used by `tools/verify-cards-fonts.mjs` to drive "04 Style → Upload font"
through the page's own `<input type="file">`. They are committed rather than
downloaded at test time so the custom-font half of that gate needs no network
at all — the half that matters most, because an uploaded font is the one path
where nothing upstream can be blamed for a bad export.

| File | Format | Why this one |
| --- | --- | --- |
| `bungee-latin.woff2` | woff2 (14 KB) | Google Fonts' own latin subset, i.e. byte-for-byte what a visitor gets if they download a webfont and re-upload it. Extremely wide, blocky caps — nothing else measures like it, so "did the font actually apply?" is answerable from glyph metrics alone. |
| `Silkscreen-Regular.ttf` | TrueType (31 KB) | An uncompressed .ttf, the other end of the format range. A pixel face with tiny, rigidly-gridded glyphs — its advance widths sit far from every fallback's, and far from Bungee's. |

Both are SIL Open Font License 1.1; the licenses are next to them as
`OFL-Bungee.txt` and `OFL-Silkscreen.txt`. Neither is loaded by the site — they
exist only for the gate.

- Bungee — Copyright 2023 The Bungee Project Authors (https://github.com/djrrb/Bungee)
- Silkscreen — Copyright 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen)
