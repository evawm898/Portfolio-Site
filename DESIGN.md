# DESIGN.md — the site's one design system

Every page on eva-maskalenko.com is built from this system. The numbers live in
**`tokens.css`** (one file, linked first by every page); this document is the
rulebook. A new page or a new panel builds from these tokens and these rules — it
does not bring its own palette.

## Type

| Role | Family | Token |
|---|---|---|
| Headings, titles, display | **Fraunces** | `--type-serif` |
| Body, UI, controls, read-outs | **IBM Plex Mono** | `--type-mono` |

Retired, not to be reintroduced: Playfair Display, Space Mono, Montserrat,
IBM Plex Sans.

The Google Fonts link every page uses (add `;700` to Plex Mono only where a page
genuinely sets bold mono):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css">
```

Exception by design: the `/cards` deck builder lets a visitor pick any Google
family for the CARDS they are making. That is artwork; the page around it uses
the two families above.

## Colour

### Neutrals

| Token | Hex | Use | Contrast on ground |
|---|---|---|---|
| `--color-ground` | `#060707` | page background | — |
| `--color-raised` | `#0C0E0E` | panels, cards, inputs | — |
| `--color-line` | `#232727` | hairlines, borders | — |
| `--color-line-strong` | `#34393A` | emphasised borders, tracks | — |
| `--color-faint` | `#565F5F` | em-dash separators, disabled, large meta | 3.07 |
| `--color-dim` | `#8B9494` | secondary text, captions, labels | 6.49 |
| `--color-ink-2` | `#A7AFAF` | body copy one step down | 9.02 |
| `--color-ink` | `#E9ECEC` | primary text | 16.97 |

On screens ≤ 600 px, `dim` steps up to `#A7AFAF` and `faint` to `#8B9494`
(both still palette values) — `tokens.css` does this, pages do not.

### Petrol family

| Token | Hex | Use | Contrast on ground |
|---|---|---|---|
| `--color-deep` | `#1C6B6B` | button fills, rules, selection | 3.23 (not a text colour) |
| `--color-petrol` | `#2FA3A3` | links, active states, eyebrows | 6.62 |
| `--color-seafoam` | `#6FB7AE` | section numbers, "No. 0x" | 8.70 |

Ink on a deep button fill is 5.25:1.

### Companions — diagrams, data and tool artwork ONLY

| Token | Hex |
|---|---|
| `--color-plum` | `#A98CC8` |
| `--color-indigo` | `#7880D8` |
| `--color-mint` | `#B3DBB4` |

**Never text.** They exist so a diagram or a data plot can tell more than two
things apart without leaving the system.

## Rules

1. **Text is only** ink, ink-2, dim, faint, petrol or seafoam. No other text
   colour — no red, no burgundy, no rust, no amber, no companion.
2. **Errors and warnings are not coloured text.** They are ink (or dim) text
   carrying a glyph or a word that says what they are (`! too dense`,
   `✕ refused`), optionally on a raised panel with a line-strong border. Colour
   may reinforce a state (a plum marker, a deep rule); it never carries it alone.
3. **Em-dash separators** (`—` between items in a meta line) are faint.
4. **Faint is not body text.** At 3.07:1 it is for separators, disabled
   controls and meta set at a large size.
5. **Deep is never text.** It is a fill or a rule. Text on it is ink.
6. **Petrol vs plum is the closest pair for red-green colour blindness.** When
   both appear in one picture, neither is ever the only cue: pair each with a
   shape, a dash pattern, a fill/outline difference or a label.
7. **Fibre convention.** An undyed fibre is drawn as an ink outline with no
   fill. A dyed fibre is always filled.
8. **Never use sage `#A6CE97` alongside mint.** They read as one colour.
9. **Chrome vs artwork.** Page chrome — panels, controls, buttons, labels,
   read-outs, navigation, type — always uses tokens. Generator artwork drawn
   INSIDE a tool's canvas / WebGL view / exported file may keep its own colours.
   The boundary is the drawing surface: everything in the DOM around it is
   chrome. Editor marks drawn on the canvas (drag handles, selection outlines)
   count as artwork until a page is migrated deliberately, because several
   gates measure them.
10. **Machine conventions are not design.** Colours a downstream machine
    reads — e.g. a laser cutter's red-cut / blue-score in an exported SVG —
    stay what the machine expects.

## Loading

- Every page links `tokens.css` **first**, before its own stylesheet.
- Page stylesheets read `var(--color-*)` / `var(--type-*)`. A page may keep
  local aliases (`--bl-ink: var(--color-ink)`) but never a local hex for a
  chrome colour.
- `styles.css` keeps its legacy names (`--black`, `--ink-dim`, `--petrol`,
  `--petrol-bright` …) as aliases onto the tokens during migration, so the
  long-form pages need no markup change beyond the link. Note the legacy
  `--petrol` is the DEEP fill and `--petrol-bright` is today's petrol — the
  prefixed token names exist so that confusion does not spread.

## Light pages

The system is dark. A page that must be light (a print-on-paper preview) is an
explicit, recorded exception; see the migration plan for which ones are ruled.
