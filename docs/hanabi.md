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
  - `compose` (phase 2; was `layout`): how the rank is told — `count` (rank N is N fireworks,
    the DEFAULT), `countscale` (N fireworks, each growing with rank), `scale` (one firework
    growing with rank, A's centre), `column` (N in a stack, B's), `bleed` (full bleed, C's).
    A full-bleed centre under a large or small index puts the index on a plate of the face colour.
  - `motif`: which firework (below).
  - `tier`: `none` / `rosettes` — a second tier under a Scale burst at ranks 4 and 5 (the
    catalogue's two-part cards, item 21). **Kept as it was, not folded into the board:** it
    still sits under one burst, so it is live under Scale only and disabled otherwise.

The rainbow suit adds one more choice: `suit.numeral` — `rainbow` (the DEFAULT, Eva, Nov 9)
or `solid` (the suit's primary). The rainbow index runs both the numeral AND the symbol under
it top to bottom through the OTHER suits' primaries in hue order from red, leaving out
near-greys (white has no hue), so it follows the deck when a suit is recoloured; with fewer
than two hued suits it uses a fixed spectrum. Each mark carries its gradient in its own box
(`userSpaceOnUse`: the numeral's 60 × 100, the symbol's 100 × 100), because a bounding-box
gradient on a "1" has almost no width to run across. Their halo is decided by the stop that
stands off the card worst. Under the band index the control is disabled: the band is
already the rainbow and the index is ink on it. A saved file without the field takes the
default (rainbow); an unknown value is told. (The field name is `numeral` because it shipped
covering the numeral alone in #537; the symbol joined it the same day.)

**So the rainbow suit's large and small index faces are no longer the phase-1 faces by
default** — the byte-identity claim below holds with `numeral: 'solid'`.

A version-1 file's `layout` A/B/C is read as (large, scale), (small, column), (band, bleed)
on every suit, and is told. A version-2 file's per-suit `single` / `count` / `bleed` is read as
`scale` / `column` / `bleed`, and its phase-1 `peony` / `chrysanthemum` / `willow` /
`crossette` as `radial-…` (those plain names are the phase-2 types now), told. **Every saved
design opens looking exactly as it did** — H15 renders 9,000+ faces of v1 and v2 files through
the page as it shipped at `d5cd4ef` (read from git) and through this tree, byte for byte. **Every phase-1 face renders byte-identically under that reading**
— measured over 3,564 faces (all three layouts × three corner modes × three sizes, with and
without the rainbow suit, with a phase-2 override in place) against `main` at `c7d8768`,
setting aside the `<g class="hb-index">` wrapper the index now carries.

## The Firework board (phase 2, schema version 3)

The **Fireworks** tab is the board: rows are the suits in play (the rainbow row appears when
that suit is on), columns ranks 1–5, each cell a live thumbnail of that card's centre art
(`renderFace(…, { centreOnly: true })`). Clicking a cell opens the editor beside the board
(below it under 1240 px), so a row (one suit's progression) and a column (one rank across
suits) stay in view while editing. The board carries its own greyscale toggle (the toolbar's,
synced), because its job is making every suit distinguishable without colour.

**Three levels of inheritance**, and the editor writes to whichever its scope says:

| Level | Where | Edited by |
|---|---|---|
| the suit's firework | `suit.centre.motif`, `suit.firework` (params, only the keys the type takes) | the editor in "row" scope; panel 01 |
| the rank composition | `suit.centre.compose`; under Count the rank column's arrangement `design.arrangements[rank]` | the editor; "Use for every N" |
| this card | `design.fireworks[suit][rank]` — any spec key, **per key**, plus `items` (its own arrangement, Count) or `place` (its one firework, Scale) | the editor in "this card" scope, and the Arrange panel |

Per key, not per cell: a card that sets its own star size still follows its suit's count. A
dot marks a card with anything of its own; "Reset to suit" drops the cell's record, ↺ one key.

**Count arrangements** are one `{ x, y, s, rot, n? }` per firework, in STACKING ORDER (the
last is drawn on top): x and y fractions of the centre FIELD (the area less the corner-index
columns), s a radius as a fraction of half the field's shorter side, rot degrees, and `n` the
firework it is — its drawing's seed, so a firework keeps its own look when it moves up or down
the stack (`restack()`, `deck.js`). `n` is kept only as a permutation of 0..N−1. The default
pips (`DEFAULT_PIPS`, `layout.js`) vary sizes within a card and may overlap; they are FITTED to
the field (a pip near an edge is drawn smaller), so no preset puts one on the corner index (H17).
**An arrangement made by hand is taken literally** (Eva, Nov 10: "change the size of each
firework"): a firework keeps the size it was given wherever it is put, and may run past the field
— under the index, which is drawn over it — and off the card's edge. The first hand edit writes
the arrangement as DRAWN (`literalItems`), so nothing else on the card moves (H23). A file whose
arrangement is not exactly N long is refused and told.

**The Arrange panel** (Count and Count + scale; Scale too, for its one firework): click a
firework on the editor's card to pick it (a click writes nothing), drag it to move it, its square
to resize it, its round handle to turn it; or set Across / Down / Size / Turn with sliders. Only
the picked firework carries the square and the handle. **To back · Backward · Forward · To front**
change what overlaps what; the numbered picker (back to front) reaches a firework buried under
others. Under **Scale** the one firework's placement is the card's `place: { x, y, s, rot }` —
x, y fractions of the field, s a multiple of the radius Scale gives it (0.3–1.6), rot added to its
rotation; absent, the card draws its old markup by branch. Column, Full bleed and the two field
motifs lay themselves out and have no Arrange panel.

## The fireworks

**Nine firework TYPES** (phase 2) — each a distinct silhouette, not a recolour (H16): `peony`
(rings of round stars, no lines), `chrysanthemum` (trailed arms), `ring` (a hollow ring),
`willow` (drooping trails), `palm` (a few thick tapered fronds), `crossette` (arms that fork),
`dahlia` (short fat petals), `glitter` (a structureless cloud of four-point sparks), `blossom`
(solid notched petals). Their parameters — count, length, trail, star size, detail,
rotation, tip dots, core, outer and core colours, as each type takes them — are one table
(`PARAMS`, `TYPES`) the editor builds from and `deck.js` validates against. Every renderer is
a pure function of the spec (no clock, no `Math.random`; H19). Under Scale a type grows with
rank and (where it makes sense) gains arms; under Count every firework is drawn at rank 5's
fullness, because the count is the rank.

**The default pairing** (Eva's to rule): White ring · Red peony · Blue willow · Yellow
chrysanthemum · Green palm · Rainbow glitter.

**Detail** (the `density` key, 0–2, Eva, Nov 10) on all nine: how much fine detail a burst
carries. Each type's default draws exactly the phase-2 drawing (H22), and detail never rescales a
burst — added marks are flagged and left out of the fit, and a mark that would reach past r is not
drawn (H21 holds each drawing's marks a subset of the next one's):

| type | default | what detail does |
|---|---|---|
| peony | 1 | rings of stars, 1 to 5 |
| chrysanthemum | 1 | below 1 the faint inner trails thin out; above, beads along every arm |
| ring | 0 | a further inner ring every half step, up to four |
| willow | 1 | below 1 the faint heads thin out; above, droplets down every trail |
| palm | 0 | pairs of fine leaflets off each frond, up to six |
| crossette | 0 | a third tine (0.5), every tine splitting again (1.0; three tines from 1.5), sparks along the arms (2.0) |
| dahlia | 0 | fine spokes in the gaps (to 1), then a streak down each petal |
| glitter | 1 | the spark count; the cloud is fitted on detail 1's sparks, so it keeps its size |
| blossom | 0 | veins in every petal, up to five |

**Declared, measured, not migrated:** a phase-2 design that set detail by hand on any type but
peony (ring and crossette had threshold steps; glitter's cloud rescaled with its count) now draws
the new law, and a hand arrangement whose firework the old field fit shrank now draws it at the
size it says. Everything else a phase-2 design holds renders byte-identically (H22).

The catalogue motifs and phase 1's bursts remain, and take rotation and colours.

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
| 21 | Tier: burst over a rosette field | 52, 57, 58, 61, 62 |

**Ruled out (Eva):** every hanging or falling piece — parachute flares, parachute chains,
many parachutes, glow balls, lanterns, dragons (items 15–20) — and every two-tier
composition built on one (22, 23, 25–28). **Removed after shipping (Eva, Nov 9):** Spark drift
(13), Streamers (14) and the burst over streamers (24). A saved design naming one loads with
Classic and no second tier, and says so (H9).

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

## The firework module's contract

Layout code asks `hanabi/firework.js` for three things and nothing else:

- `fireworkSpec(design, suit, rank)` → a plain-data spec (schema version 2 in the module
  header: `motif`, `colors`, `size`, `seed`, `tier`, and the motif's own fields)
- `renderFirework(spec, { cx, cy, r, rect? })` → SVG markup: a burst centred on (cx, cy)
  reaching at most r; a field filling `rect` when given
- `renderTier(spec, rect)` → the second tier inside rect, or nothing

`fireworkSpec` merges the type's defaults, the suit's parameters and the cell's override (less
its `items`). Count placement (`placementFor`, `cellItems`) is `layout.js`'s; the board never
draws a firework itself. Panel section 06 shows the merged spec for one card, read-only.

## The scene band

`design.scene` — a deck-wide silhouette along the bottom of every face, behind the fireworks
and under the index: `treeline` or `rooftops`, a colour, a height (8–45% of the card). Off by
default; a stub with two silhouettes. With the scene on, the bottom corner index sits over it —
pick a colour near the face ground.

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

`node tools/verify-hanabi.mjs` — H1–H24 in Node, B1–B9 in Chromium (the PDF is rasterised by
`pdftoppm` and its crop marks and edges read against an imposition RESTATED in the gate).
H10 holds the corner index to one style across suits, H11 a suit's centre to its own cards,
H12 the tier to ranks 4–5 and clear of the index, H13 every motif to its box, H14 the rainbow index (B6 its control) — read off every
point it draws (paths are absolute M/L/Q/C/Z by contract, and the gate refuses anything else).
H15 the migration against `d5cd4ef`, H16 the silhouettes, H17 Count, H18 inheritance, H19
determinism, H20 the scene, H21 detail, H22 phase-2 designs unchanged against `e95f121`, H23
arranging (literal hand sizes, fitted pips, restacking), H24 Scale placement; B5 the board, B7
real-pointer arranging, B8 the localStorage migration, B9 the Arrange panel. `--negative-control`
runs fifty-four mutants, eight of them of the page script;
`--keep <dir>` saves the PDFs. Not in CI.
Dev deps: `npm i --no-save jspdf@2.5.1 jszip@3.10.1 playwright-core`; needs `pdfinfo`/`pdftoppm`.
