# /hanabi — the Hanabi deck designer

Hidden page (`hanabi.html`, `hanabi.css`, `hanabi.js`, `hanabi/*.js`; `noindex`, unlinked).
A personal deck tool: suits, colours and symbols, a corner index for the deck, a firework
centre per suit, a card back, the clue and fuse tokens, and print export. No publisher
logos, box art or trade dress.

## A face is two choices (Eva's ruling on #528)

Phase 1 shipped three whole-face layouts, A/B/C. Eva kept all three as options but split
them: **the corner index is constant across the deck, and the centre varies per suit.**

- `design.index` — `large` (A's numeral + symbol), `small` (B's), `band` (C's coloured
  band top and bottom). One for every suit, so the numeral and symbol are always in one place.
- `suit.centre` — per suit:
  - `layout`: `single` (one burst, A's centre), `count` (the rank as N bursts, B's), `bleed`
    (full bleed, C's). A full-bleed centre under a large or small index puts the index on a
    plate of the face colour.
  - `motif`: which firework (below).
  - `tier`: `none` / `rosettes` / `streamers` — a second tier under a `single` burst at ranks
    4 and 5 (the catalogue's two-part cards, items 21 and 24).

A version-1 file's `layout` A/B/C is read as (large, single), (small, count), (band, bleed)
on every suit, and is told. **Every phase-1 face renders byte-identically under that reading**
— measured over 3,564 faces (all three layouts × three corner modes × three sizes, with and
without the rainbow suit, with a phase-2 override in place) against `main` at `c7d8768`,
setting aside the `<g class="hb-index">` wrapper the index now carries.

## The fireworks

`classic` is phase 1's burst, which changes type with rank (peony → chrysanthemum →
crossette); `peony`, `chrysanthemum`, `willow` and `crossette` hold one type across the
ranks. The rest are drawn after the Hirayama fireworks catalogue (1883), redrawn in the
deck's own line style and never traced. Eva ruled on a 28-item list; the numbers are kept.

| Item | Motif | Catalogue № |
|---|---|---|
| 1 | Teardrop peony | 1, 3, 5, 17 |
| 2 | Double-ring peony | 4, 9, 27, 36 |
| 3 | Sparkle-core peony | 2, 18, 78, 93 |
| 4 | Spoke disc | 7, 25, 66, 70 |
| 5 | Spoke disc with a core | 12, 19, 36 |
| 6 | Weeping willow | 8, 53, 72, 98 |
| 7 | Willow with a crown | 10, 11, 35 |
| 8 | Dome | 39, 40 |
| 9 | Split burst | 105 |
| 10 | Dot ring | 89, 105 |
| 11 | Rosette field | 13, 15, 23, 30, 41 |
| 12 | Starfield | 34, 67, 86, 90 |
| 13 | Spark drift | 16, 98 |
| 14 | Streamers | 38, 60, 73 |
| 21 | Tier: burst over a rosette field | 52, 57, 58, 61, 62 |
| 24 | Tier: burst over streamers | 60, 73 |

**Ruled out (Eva):** every hanging or falling piece — parachute flares, parachute chains,
many parachutes, glow balls, lanterns, dragons (items 15–20) — and every two-tier
composition built on one (22, 23, 25–28).

Rank escalates per motif: a burst grows in size and count, a field mostly in count (it
starts larger, and fills the card's free centre — the area less the corner-index columns —
rather than a circle). The **Fireworks** preview shows every motif for one suit, ranks 1–5,
with a button to use it.

## Modules

| File | Owns |
|---|---|
| `hanabi/deck.js` | the MODEL, pure: suits, the 3/2/2/2/1 distribution, sizes, the design schema and its file, the imposition |
| `hanabi/symbols.js` | suit symbols, the rank numerals and the token glyphs as SVG path data |
| `hanabi/firework.js` | **the phase-2 slot**: the firework spec, the motifs and their renderers |
| `hanabi/layout.js` | card faces (corner index + per-suit centre), the back and the tokens, as SVG strings |
| `hanabi/export.js` | the imposed print PDF (jsPDF) and the 300 dpi PNG zip (JSZip) |
| `hanabi.js` | the page: DOM, state, localStorage, the preview |

**One renderer for every surface.** The preview inlines the SVG strings `layout.js` returns,
and the exports rasterise the same strings at 300 dpi, so the screen is the print.
**No card text is set in a font** — the numerals are drawn strokes — so nothing has to be
awaited before a card is rasterised (contrast /cards, where fonts are an async invariant).

## Colour-blind legibility

Every suit carries a SYMBOL, drawn in every corner index (and in the band index), so a
suit never differs by colour alone. Two suits sharing a symbol are named in the panel. A
mark whose colour does not stand off the card face (contrast < 3) gets a halo. The preview's
**Greyscale** toggle is permanent, for checking exactly this.

## The phase-2 slot

Layout code asks `hanabi/firework.js` for three things and nothing else:

- `fireworkSpec(design, suit, rank)` → a plain-data spec (schema version 2 in the module
  header: `motif`, `colors`, `size`, `seed`, `tier`, and the motif's own fields)
- `renderFirework(spec, { cx, cy, r, rect? })` → SVG markup: a burst centred on (cx, cy)
  reaching at most r; a field filling `rect` when given
- `renderTier(spec, rect)` → the second tier inside rect, or nothing

The builder writes partial overrides into `design.fireworks[suitId][rank]`, which
`fireworkSpec` merges over the rank default; the design file already saves and loads that
field verbatim. The builder may replace `renderFirework` wholesale. Neither touches layout
code. Panel section 06 shows the current spec read-only; that is where the builder goes.

## Print

Imposition (`deck.js` `imposition`) places cards centred on Letter or A4 with 6 mm kept for
crop marks; orientation `auto` takes whichever of portrait and landscape holds more.
**Separate bleeds** (default) keeps every card's whole bleed box; **shared cuts** butts
cards at trim so one cut separates two neighbours (bleed only round the outside — more
cards a sheet). Crop marks continue every trim line into the margin. Duplex backs follow
each face sheet, each back in the slot mirrored for a long- or short-edge flip.

| Cards a sheet | Letter | A4 |
|---|---|---|
| Poker, separate | 6 (landscape) | 8 (landscape) |
| Poker, shared | 8 (landscape) | 9 |
| Bridge, separate | 8 (landscape) | 9 |
| Mini, separate | 12 | 12 |

## Verify

`node tools/verify-hanabi.mjs` — H1–H13 in Node, B1–B5 in Chromium (the PDF is rasterised by
`pdftoppm` and its crop marks and edges read against an imposition RESTATED in the gate).
H10 holds the corner index to one style across suits, H11 a suit's centre to its own cards,
H12 the tier to ranks 4–5 and clear of the index, H13 every motif to its box — read off every
point it draws (paths are absolute M/L/Q/C/Z by contract, and the gate refuses anything else).
`--negative-control` runs fifteen mutants; `--keep <dir>` saves the PDFs. Not in CI.
Dev deps: `npm i --no-save jspdf@2.5.1 jszip@3.10.1 playwright-core`; needs `pdfinfo`/`pdftoppm`.
