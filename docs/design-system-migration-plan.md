# Design-system migration — Part 0 audit and plan

Status: **APPROVED (Eva, Nov 5) with the rulings in §6 and one added rule (material colours are content, DESIGN.md rule 10).** Nothing on any
page has changed yet. This PR adds `tokens.css` (linked by no page yet) and
`DESIGN.md` (the rules). Read `DESIGN.md` first.

Measured at `7d9b33a`, Nov 5. 33 HTML pages, 19 page stylesheets.

## 1. How every page loads the tokens

- `tokens.css` at the repo root, linked FIRST in every page's `<head>`, after
  the Google Fonts link. One parallel request, no `@import` chain.
- Token names are `--color-*` and `--type-*`. Measured: **no stylesheet or
  inline `<style>` in the repo uses either prefix**, while the existing names
  collide in meaning — on the tool pages `--ink` is the BACKGROUND
  (`#0A0A0C`), in `styles.css` `--ink` is text and `--petrol` is the deep fill
  (`#1C6B6B`) while the brief's "petrol" is `#2FA3A3` (`--petrol-bright`
  today). A bare `--petrol` token would have silently meant two colours.
- `styles.css` keeps its legacy names as **aliases onto the tokens**
  (`--black: var(--color-ground)`, `--petrol: var(--color-deep)`,
  `--petrol-bright: var(--color-petrol)` …), so the 17 long-form pages that
  already use it need only the extra `<link>`.
- Tool stylesheets (`--ink/--paper/--teal` family) are rewritten onto
  `var(--color-*)`; a page may keep a short local alias, never a chrome hex.

## 2. Page table

System key: **MAIN** = `styles.css` vars, Fraunces + IBM Plex Mono, `#060707`,
petrol. **TOOL** = Playfair Display + Space Mono, `#0A0A0C` / `#EDEDE8`,
teal `#5FA0A0`, amber `#D6A15C`, bad `#E5484D` / warn `#D98F6A`.
**OWN** = a one-off palette. G = generator page (chrome / artwork boundary
applies, DESIGN.md rule 9).

| Page | System now | Fonts now | Ground | Accent | Migrating means |
|---|---|---|---|---|---|
| index | MAIN | Fraunces, Plex Mono | #060707 | #2FA3A3 / #1C6B6B | add link; seafoam for section numbers (`.section-label__number`, `.note-card__index`, `.hero__index` are petrol today); `.footer__label` and list bullets are DEEP as text → petrol/faint |
| about | MAIN | same | #060707 | same | add link; same small fixes |
| field-notes | MAIN | same | #060707 | same | add link; "No. 0x" indices → seafoam |
| defining-durability | MAIN | same | #060707 | same | add link |
| functional-fibers-e-textiles-wearables | MAIN | same | #060707 | same | add link |
| yarn-characterization | MAIN | same | #060707 | same | add link |
| quantifying-comfort | MAIN + inline style | same | #060707 | same | add link; inline block already on vars |
| textile-101 | MAIN + textile-101.css | Fraunces, Plex Mono 400/500/**700** | #060707 | petrol | add link; keep 700 (it sets bold mono) |
| color-change | MAIN + color-change.css | same | #060707 | petrol + rust | add link; diagram one-offs (§4) |
| conductive-trace-resistance | MAIN + own css | same | #060707 | petrol + rust/copper/silver | add link; warn TEXT is rust (`.is-warn strong`) → ink + glyph; diagram one-offs (§4) |
| textile-stretch-simulator | MAIN + own css | same | #060707 | petrol + rust | add link; warn TEXT is rust → ink + glyph; diagram one-offs (§4) |
| knit-lab (hidden) | MAIN + knit-lab.css | same | #060707 | petrol | add link; `.is-bad` text `#E8B06E` → ink + glyph |
| lab (hidden) | MAIN + lab.css | + **Montserrat 700** | #060707 | petrol | add link; the hover direction letter (`.js-direction-letter`) moves from Montserrat to Fraunces 600 — **look change, see ruling R7** |
| dress (hidden) | MAIN + inline | same | #060707 | petrol | add link; one inline `#0c0e0e` → raised |
| skirt (hidden) | MAIN + inline | same | #060707 | petrol | add link; the white `.skirt-figure` panel holds raster figures = artwork, **ruling R4** |
| flower-saved (hidden) | MAIN + flower.css | same | #060707 | petrol | add link |
| G flower | MAIN + flower.css | same | #060707 | petrol | add link; three off-palette chrome colours: draft note `#D8A53F`, delete `#E6836B` text → ink/dim + glyph |
| G bloom | OWN (`--bl-*`) | Fraunces, Plex Mono | **#0C0F0E** (green-black) | **#8FD6B8** mint-green | `--bl-*` re-pointed at tokens; error text `#E8A1A1` → ink + glyph; the refused curve point stroke is in the SVG editor → companion (plum) with a dash |
| G bloom-texture-lab (hidden prototype) | OWN inline | **no webfont** (system) | #0B0B0D | #6FB7AE | add fonts + link; low priority, unlinked prototype |
| G print | MAIN-ish inline | Fraunces, Plex Mono | #0C0E0E (raised as ground) | petrol | add link; ground → #060707; text `#D8DEDD` → ink |
| G plot | OWN | Plex Mono only | **#000** | #6FB7AE (= seafoam) | add Fraunces + link; panel greys (`#C8D2D1 #96A2A1 #6B7776 #2B3333`) → ink-2 / dim / faint / line; canvas ground stays (artwork, and its additive-ink calibration rests on it); warn `#E07A6A` → glyph |
| G scene | OWN (`--scene-*`) | Plex Mono only | #08090B | none | chrome is ONLY the 1–8 nav; **ruling R5** (CLAUDE.md records the section as having its own identity on purpose) |
| G marble | TOOL | Playfair, Space Mono | #0A0A0C | teal | full chrome rewrite; the ink palette (`#0A0A0C #5FA0A0 #D6A15C …`) is ARTWORK and stays — saved links name those hexes |
| G frame | TOOL | Playfair, Space Mono | #0A0A0C | teal | full chrome rewrite; engraving / relief is artwork |
| G bug | TOOL inline | Playfair, Space Mono | #0A0A0C | teal | full chrome rewrite (inline `<style>`); 4 warn-text sites |
| G cage | TOOL | Playfair, Space Mono | #0A0A0C | teal | full chrome rewrite; 2 warn-text sites |
| G lantern | TOOL | Playfair, Space Mono | #0A0A0C | teal, amber | full chrome rewrite; 5 warn/bad text sites; CUT/SCORE/PERF colours in the EXPORTED SVG stay (machine convention, DESIGN.md rule 10); the on-screen key may move to companions + dash |
| G tile | TOOL | Playfair, Space Mono | #0A0A0C | teal, amber | full chrome rewrite; 4 warn/bad text sites |
| G weave | TOOL | Playfair, Space Mono | #0A0A0C | teal | full chrome rewrite; warning text `#E07A6A` ("too dense for single-layer") → ink + glyph; yarn colours are user data = artwork |
| artist-tracker (private) | TOOL inline | Playfair, Space Mono | #0A0A0C | teal + **brick #A65D4A** | full chrome rewrite; 11 brick/warn text sites; category pins (brick / teal / paper) are data → companion + shape; **its gate asserts the Instagram link is `rgb(95,160,160)` and must be updated in the same PR** |
| G shape-editor (hidden) | OWN inline | **no webfont** | #0C0E0E | #2FA3A3 + amber/red/violet/sky | add fonts + link; 7 coloured-text sites; editor colours on canvas → companions |
| cards (hidden) | **LIGHT** (cards.css, MAIN names, paper values) | Fraunces, Plex Mono, **+ Plex Sans, Playfair, Space Mono** | #FAF8F4 | #1C6B6B / #177A7A | **ruling R2**; the three retired families STAY in its font link — they are built-in card FACES in `cards/font-manager.js` (artwork the visitor picks), not page chrome |
| textile-gauge-reader (hidden) | **LIGHT** (MAIN names, inverted values) | Fraunces, Plex Mono | #FFFFFF | #0F7D7D + rust course line, error `#C1524C` | **ruling R3**; error text → ink + glyph either way |

## 3. Generator pages — where chrome ends and artwork begins

The proposed boundary (DESIGN.md rule 9) is **the drawing surface**:
everything in the DOM — panels, controls, read-outs, buttons, nav, the
page's own headings — is chrome and goes to tokens; everything inside the
canvas / WebGL view / exported file is artwork and keeps its colours.

Two deliberate holds inside that rule, both because gates measure them:

- **Editor marks drawn on a canvas** (bend and petal handles on `/plot`, the
  frame overlay, `/scene`'s whole picture, lantern/tile handles) stay this
  pass. `/plot`'s export check asserts its accent `#6FB7AE` and handle amber
  are non-neutral; the accent already IS seafoam, so it is in-system anyway.
- **Exported files** keep machine conventions (lantern CUT/SCORE/PERF).

Per page:

| Page | Chrome (migrates) | Artwork (keeps) |
|---|---|---|
| flower | panel, presets gallery, read-outs | three.js view, preset thumbnails |
| bloom | panel, scope bar, read-outs, curve editor CHROME | three.js view, grid .glb |
| marble | panel, palette editor frame | the sheet, its ink palette, paper presets |
| scene | the 1–8 nav (R5) | every scene's canvas |
| print | panels, sliders | line art, infill |
| frame | panel | engraving SVG, relief view |
| bug | panel, outline-editor chrome | the bug render and SVG |
| cage | panel, profile-editor chrome | cage view, SVG |
| lantern | panel, build-step text | flat pattern, folded / lit view, exported SVG |
| tile | panel, how-to text | tile drawing, rollers, simulator |
| weave | panel, construction-sheet chrome | drawdown, fabric render, yarn colours |
| plot | panels | the drawing, its ground, its handles |

## 4. Field-note one-offs → companions

All of these are DIAGRAM colours (canvas / SVG inside a field note), which is
exactly what companions are for. Proposed mapping, each paired with a
non-colour cue because several sit beside petrol:

| Page | Now | Meaning | Proposed | Paired cue |
|---|---|---|---|---|
| textile-stretch-simulator | rust `#E8B06E` / `rgba(165,107,46)` | yarn jammed / being strained (vs petrol = slack) | **plum** | already dashed (`setLineDash([2,3])`); legend gets a dashed swatch |
| textile-stretch-simulator | rust as WARN TEXT (`.sim__line.is-warn strong`) | over-strain read-out | **ink + `!` glyph** | text, not colour |
| conductive-trace-resistance | copper `#C97E42` | copper trace | ~~plum~~ **copper stays** (ruled: material colour) | legend label |
| conductive-trace-resistance | silver `#C4CCCC` | silver trace | **ink-2** (neutral = metal) | legend label |
| conductive-trace-resistance | rust `#E8B06E` (bar, legend, `rgba(165,107,46)` stroke) | resistance warning / oxidised | **indigo** | warning bar gets a hatched fill |
| conductive-trace-resistance | rust WARN TEXT | warning read-out | **ink + `!`** | — |
| conductive-trace-resistance | electron `#DFF6F6` | electrons | **ink** | — |
| color-change | electron `#E8B06E` | electron dots | **mint** | label "electron" already present |
| color-change | blue `#3A5FD0` | the electrochromic COLOURED state | **indigo** (a dyed state — filled, rule 7) | — |
| color-change | UV violet `rgba(160,110,255)` | UV arrows | **indigo** | arrows + "UV" label already |
| color-change | amber `rgba(227,179,65)` | thermochromic capsules / heat | **keep if it is the pigment's colour** (rule 10), else mint — checked in batch 2 | — |
| color-change | rust `rgba(165,107,46)` | broken C–O bond (dashed) | **plum** | already dashed + labelled |
| color-change | browns `rgba(120,90,60)`, `rgba(160,120,80)` | fibre core / yarn | **keep** (ruled R6: thermochromic pigment states, material colour) | — |
| knit-lab | `#E8B06E` `.is-bad` text | a failing read-out | **ink + `!`** | — |

Exception proposed: **none**. Every one-off maps.

## 5. Not touched

- **PR #492** (dyeing prototype) — every file it changes is under
  `tools/dyeing-proto/`; no batch below touches that directory.
- Canvas artwork, exported files, saved-link colour values (marble inks,
  weave yarns, cards suits).

## 6. Rulings (Eva, Nov 5)

- **Added rule — material colours are content.** A diagram depicting a real
  material in its real colour keeps it. So in §4: **copper stays copper**;
  silver → ink-2, electrons → mint, electrochromic blue and UV → indigo,
  strained yarn → plum, resistance warning → indigo + hatch, rust warning TEXT
  → ink + `!`.
- **R1** approved. **R2** approved: /cards stays light, recorded in DESIGN.md.
  **R3** approved: /textile-gauge-reader goes dark. **R4** approved.
- **R5**: fonts and nav move to tokens; the scene ground and line ink stay as
  artwork. Not exempt.
- **R6**: the color-change browns are thermochromic pigment states — material
  colours, KEEP. (Any that turns out to be undyed fibre is flagged and drawn as
  an ink outline.) The amber capsules are pigment too and keep for the same
  reason; flagged in batch 2 if not.
- **R7**: Fraunces 600. **R8** approved. **R9** approved.

### The questions as asked

- **R1. Error/warning treatment.** The rule says no red text; about 55 chrome
  sites use red/amber/rust for errors and warnings. Proposed: ink (or dim) text
  + a glyph (`!` warn, `✕` refused), optionally a raised panel with a
  line-strong left rule; plum allowed as a NON-text marker (a dot or a bar)
  where a state needs a colour too. Approve, or name a different cue.
- **R2. /cards: keep light or convert?** Proposed **keep light**: it is a
  print-design tool and the preview is meant to be read as paper. It already
  uses the main system's NAMES with paper values; I'd re-point it at tokens
  for type and petrol, keep its own paper neutrals, and record it as the
  documented light exception.
- **R3. /textile-gauge-reader: keep light or convert?** Proposed **convert**:
  nothing about it is paper output, and it is the only light page with no
  reason to be. (Its tests under `textile-gauge-reader/**` run in CI.)
- **R4. /skirt: the white figure panels.** It is a DARK page; only
  `.skirt-figure` is white because the figures are white-ground PNGs.
  Proposed **keep** (artwork), page chrome converts. Converting would mean
  re-rendering the figures dark.
- **R5. /scene.** CLAUDE.md records "this section … has its own identity" and
  defers palettes. Proposed: fonts and the nav move to tokens; the scene
  ground `#08090B` and its line ink stay as ARTWORK (they are the scene).
  Or exempt the page entirely.
- **R6. color-change browns** — is that drawing an undyed fibre (→ ink outline,
  no fill) or something else?
- **R7. /lab's Montserrat direction letter** — move to Fraunces 600, or
  Plex Mono 500?
- **R8. Section numbers.** Today `.section-label__number`, `.note-card__index`
  and `.hero__index` are petrol; the system says "No. 0x" is seafoam.
  Proposed: all three → seafoam. This is the most visible change on the home
  page.
- **R9. Mobile faint** goes `#7D8686` → `#8B9494` (palette value, slightly
  lighter). Fine?

## 7. Batches and PRs

One family per PR, small, each with Playwright before/after screenshots at
1280 and 390 for every touched page. CI cost noted because it decides the
order (bloom's export gate is eight ~1 h shards).

| # | Batch | Pages | CI that fires |
|---|---|---|---|
| 0 | **This PR** — `tokens.css`, `DESIGN.md`, this plan | none | none (no workflow matches) |
| 1 | Main site + Part 0 | `styles.css` legacy names aliased onto tokens, `tokens.css` linked in all 18 pages that load `styles.css`; index, about, field-notes, the essays | the five flower gates (flower.html gains the link) |
| 2 | Field-note tools | color-change, conductive-trace, stretch simulator, knit-lab, textile-101, quantifying-comfort (§4 mappings) | none |
| 3 | Hidden main-system pages | lab, dress, skirt, flower-saved, print | none |
| 4 | Tool family A (no CI) | marble, weave, artist-tracker (+ its gate's teal assertion) | none — run `verify-marble`, `verify-weave`, `verify-tracker-drawer` by hand |
| 5 | Tool family B (gated) | frame, cage, lantern, tile, bug | frame.yml, cage-gate, lantern-gate, tile-gate, bug-gate |
| 6 | Light pages | cards, textile-gauge-reader (per R2/R3) | textile-gauge-tests only if its directory is touched |
| 7 | Flower | flower.html + flower.css | the five flower gates (flower.html is in their filters) |
| 8 | Bloom | bloom.html + bloom.css | bloom-panel, connectedness, export-watertight (hours) — last, alone |
| 9 | Remaining one-offs | plot, scene (per R5), shape-editor, bloom-texture-lab | none |

Each batch: migrate → screenshots → PR → gates + deploy preview → link to
Eva → merge on her sign-off → report the sha → delete the branch → next.
No workflow file is edited in any batch (an edit to an existing workflow
costs frozen tags).

## 8. Batch 2 as built (field-note tools)

- **Stretch simulator.** "Yarn itself straining" → plum, shaded like the
  teal yarn: a deep body, the plum mid-tone, a pale highlight. Wherever it is
  a line it is dashed: the chart segment, the lock arc, the legend and the
  in-text key. The near-break bar is a plum hatch. The regime warning is ink
  with `!`.
- **Conductive trace.** Copper stays copper (rule 10). Silver → ink-2 / dim.
  The resistance-warning family is indigo: crack edges, lost contacts,
  sparks, the open-circuit marker, and the bar as a hatch. Copper straining
  past its meander tints toward plum, not rust. Electron cores → mint.
- **Color change.**
  - Thermometer while heating → plum. The oxygen atom and the broken C–O
    bond → plum (the bond was already dashed). UV arrows → indigo.
  - Electrochromic `#3A5FD0` → indigo. Electrons → mint.
  - Every coloured diagram LABEL is ink or dim now; the mark beside it keeps
    its colour.
  - Kept as material colours: the leuco dye, merocyanine, the xanthophore
    yellow, the light's own wavelength, and the window tint ramps.
- **Correction to R6's premise.** The browns are not thermochromic pigment:
  they are the Morpho wing's **chitin lamellae**. That is still a real
  material in its real colour and not an undyed fibre, so they are kept.
- **Quantifying comfort.** The instrument charts were orange `#D85A30`,
  which the Part 0 audit missed. They are abstract data, so the series are
  now mint and the chart's words ink. Every pressed toggle's text on deep is
  now ink (it was ground). The fabric and skin scenes are material colours
  and are kept.
- **Knit lab.** A failing read-out is ink with `!` (it was amber text).
- **Found, not caused.** Both simulators' warning-text rule
  (`.x__line.is-warn strong`) never matched, because the page toggles
  `is-warn` on the `<strong>` itself. The rust warning text was never shown on
  `main`; the `!` is now shown.
- **Left and flagged.** On color-change, the gel-electrolyte label is
  `#3c4649` text drawn on the pale substrate swatch (a depicted material, where
  ink would not read).

## 9. Batch 3 as built

- **lab.** The hover twist-direction letter is Fraunces 600, not
  Montserrat 700 (R7). Montserrat is gone from the font link.
- **dress.** The inline figure panel is `--color-raised`.
- **skirt.** The white `.skirt-figure` panel stays white (R4). Only a comment
  was added saying so.
- **flower-saved.** The `.sv-*` rules in `flower.css` are used by this page
  only.
  - The Delete button was salmon `#E6836B` text. It is now ink-2, carries a
    `✕` glyph, and turns ink on hover (rule 1).
  - The card grounds are tokens.
  - The rest of `flower.css` is flower's, in batch 7.
- **print.** The page now links `tokens.css`, and every chrome colour in its
  style block is a token:
  - Panels sit on raised. Borders are line-strong and dividers are line.
  - Panel text is ink-2. Hints are dim; they were `#6B7776`, too faint to be
    text.
  - Values are ink. Headings, checkboxes and the fan-debug toggle are petrol.
  - The load error was `#E07A6A` text. It is now ink with `✕`.
- **print's shaded-view ground.** The ground of the shaded view (line art
  off) is `#060707`; it was `#0C0E0E`. The scaffold gate's `DARK` background
  constant moved with it in the same commit, and
  `node tools/verify-print-scaffold.mjs` reads 70 checks, 0 failed.
  - The line-art paper `#F2F0EA` is artwork and is kept. Line art is the
    shipped default, so /print still opens on paper.

## 10. Batch 4 as built

- **The pattern for TOOL-system pages.** marble, weave and artist-tracker
  each keep their own names (`--ink`, `--paper`, `--teal` …). Those names are
  re-pointed at tokens: `--ink` → ground, `--paper` → ink, `--teal` → petrol,
  and the lines → the line tokens. The fonts are Fraunces and Plex Mono.
  - **Batches 5–9 reuse this.** The gated tool pages share this `:root`.
  - `--dim-2` was a 3:1 grey used for text, so it now reads dim (rule 4).
  - Solid buttons were a teal fill with ground text. They are now a deep fill
    with ink text, like every other pressed control.
- **marble.**
  - The point-budget warning was amber text; it is now ink with `!`. The
    export error was rust text; it is now ink with `✕`.
  - Its checkbox takes the petrol accent; it was the browser's blue.
  - The ink palette and sheet colours are artwork (saved links name them) and
    are untouched.
- **weave.** "too dense for single-layer" and every `.warn` line were
  `#E07A6A` text. They are now ink with `!`, and the ruled wording is
  unchanged. Yarn colours are user data and are untouched.
- **artist-tracker.**
  - **Category is data, so it is a companion colour AND a shape** (rule 6).
    - Tattoo is a filled plum disc. Touring is a filled indigo diamond.
      Following is an ink ring with no fill.
    - The same marks sit before the list's category label (now ink-2, it was
      brick / teal / paper text) and are the map pins.
    - The active category filter keeps a coloured underline under ink text.
  - **Clusters.** They are a deep disc with an ink count; a large cluster is
    marked by a seafoam ring. They were teal, and brick for large.
  - **Errors and warnings.**
    - The password error and the photo error are ink with `✕`.
    - Remove is ink-2 with `✕`.
    - A warning import report has a plum rule and a `!` heading. Its counts
      are ink.
    - "geocoding paused" is ink (the word says it). The unplotted count is
      ink-2.
  - **Found, not caused.** The cleaning list's location strings were coloured
    `var(--ink)`, which on this page is the BACKGROUND, so they were never
    visible. They are ink now.
  - The JPEG matte under pasted photos is raised `#0C0E0E`; it was `#131316`.
    This affects new pastes only.
- **Gates.**
  - `verify-tracker-drawer` asserted the Instagram link is `rgb(95,160,160)`.
    It now asserts petrol `rgb(47,163,163)`. Result: 427/427.
  - `verify-marble` 51/51. `verify-weave --browser` 24/24 + 14/14.

## 11. Batch 5 as built

frame, cage, lantern, tile and bug follow §10's pattern:
- The page's own `:root` is re-pointed at tokens.
- The type is Fraunces and Plex Mono.
- Solid buttons are a deep fill with ink text.
- `--dim-2` reads dim.

**Warnings and errors.** Every text site that was amber, rust or red is now ink with `!` (a warning) or `✕` (an error or refusal):
- frame's readout warning
- cage's `bad` value and refused-edit status. Its "told" note is ink-2.
- lantern and tile: section counts, warned outputs, messages and status lines. Also tile's on-canvas status line and lantern's build warnings.
- bug: its message, readout `bad`, export error and editor status

A rule that can be empty only draws its glyph `:not(:empty)`.

**Flag markers** (lantern, tile) are non-text marks: a plum ring for a warning and a plum square for a failure (R1). `ok` / `info` keep a petrol disc.

**Kept as artwork** (rule 9 — editor marks and exports, measured by gates):
- tile's edge A / edge B colours. The key in the 3×3 header matches them.
- bug's outline-editor handles and fit lines
- lantern's on-screen CUT / SCORE / PERF lines (the exported file's machine convention)
- the SVG-preview paper `#EDEDE8` on cage and bug. In that mode their header sits on paper in ink with a `#55554F` sub-line. That is the one place a dark-on-light text colour remains, and it is the artwork's own surface.

**Gates.** No gate asserted a chrome colour. All five workflows run on this PR.

## 12. Batch 6 as built

**/cards and /textile-gauge-reader are the two light pages, built one way** (R2 for /cards; for /textile-gauge-reader Eva replaced R3's dark reading on Nov 5: "have the textile-gauge-reader light the same way cards is").
- Type and the deep petrol (`--petrol`, fills and rules) come from tokens.
- The paper neutrals are /cards' own: ground `#faf8f4`, panels `#ffffff`, lines `#ddd8ce` / `#c2bcae`, ink `#17191a`, dim `#5c6363`, faint `#8b9494`.
- Links and eyebrows use `#177a7a`. The system petrol `#2fa3a3` is 2.9:1 on this paper, too faint for text; `#177a7a` is its paper-legible step (4.8:1).
- Solid buttons are the deep fill with paper text.

**Warnings and errors** are ink with `!` or `✕` (R1), as on the dark pages. The error box keeps a faint plum tint and border. On /textile-gauge-reader, confidence words, comparison deltas, inclusion tags and debug notes that were green, rust or red are now ink or dim; the uncertain and bad ones carry `!`.

**Marks on paper.** Mint is too pale to mark anything on paper, so the "ok" marks on /textile-gauge-reader (the online dot, the included-area tag border) are the deep petrol, and the "bad" marks are plum in a different shape (a ring, a dashed border). Colour is never the only cue.

**Kept as artwork:** the card faces and their font list on /cards; on /textile-gauge-reader the overlays drawn on the fabric photo (and the course-line key swatch that matches them) and the zoom / grid-box controls that float on the black photo area, which stay dark glass in the system's dark tokens. The calibration and grid-box popups are paper panels.

**Gates.** /cards: `verify-cards-fonts` and `verify-cards-svg-glyphs` run by hand (no workflow covers cards). /textile-gauge-reader's workflow fires only on `textile-gauge-reader/**`, so no CI runs on this PR's CSS; no gate asserts a chrome colour.

## 13. Batch 7 as built

flower's chrome already read the legacy names, which batch 1 aliased onto tokens, and `flower.html` already links `tokens.css`. What was left was `flower.css`'s hard-coded values:
- The translucent panel, modal and button fills (`rgba(12,14,14,…)`, `rgba(28,107,107,…)`, `rgba(47,163,163,…)`, `rgba(6,7,7,…)`) are `color-mix` over the raised, deep, petrol and ground tokens at the same opacities.
- The slider thumb's ring and the preset thumbnail's ground are tokens (same values).

**Off-palette text, R1:**
- The print-fit badge's warning text was amber; it is ink. The text already carries its own `! `. The warning dot is a plum ring.
- The save modal's error was coral; it is ink with `✕`, drawn `:not(:empty)`.
- The dev-only draft-preset note was amber; it is dim with a `✎` before it.

**Kept as artwork:** the three.js view and the preset thumbnails.

**Gates.** No flower workflow names `flower.css`, so CI runs nothing on this PR. The CSS cannot reach geometry, the export, the visibility predicates or the registry. `verify-registry-sync` and `verify-tier-visibility` were run by hand and pass.

## 14. Batch 8 as built

bloom keeps its own `--bl-*` names (bloom.css stands alone from styles.css by design), re-pointed at tokens; `bloom.html` links `tokens.css` first.

**Ground and accent:**
- The green-black ground `#0c0f0e` and mint-green accent `#8fd6b8` are retired.
- The page, the panels and the three.js scene background are the system ground. The scene background is `0x060707` in `bloom.js`, as print's was in batch 3.
- The accent (links, slider fills, section hovers, the cap hatch, the scope bar, curve handles) is petrol.
- Ink, dim and line are the tokens; the translucent fills are `color-mix` over raised and ink.

**R1:**
- The readout's and design status's error lines (`.bl-err`) were pink. They are ink with `✕`.
- A refused curve edit's reason was pink. It is ink with `✕`.
- The refused handle is a dashed plum ring on the ground: a non-text mark, and dashed so colour is not the only cue.

**Kept as artwork:** the bloom itself (its material and lights) and the grid `.glb`.

**Gates.** No gate asserts a chrome colour. The status lines are read by `textContent`, which a `::before` glyph does not reach. `bloom.html`, `bloom.css` and `bloom.js` are in the filters of the three bloom workflows (panel, connectedness and export-watertight), so all three run on this PR, the last two for hours. The panel gate was also run locally.
