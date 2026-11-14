# Textile 101 audit: every section after "What Is a Textile?"

Audited at `2e87950` (main, Nov 14). Page: `textile-101.html` with `textile-101.css`, `textile-taxonomy.js`, `textile-basics.js`, `textile-knit-loops.js`.

Companion files:

- `docs/textile-101-accuracy.md` — every claim now on the page, its source and its status, and the **Eva to verify** list.
- `docs/textile-101-decisions.md` — the judgment calls made during this run.
- `docs/img/textile-101/` — before / after screenshots at 1280 and 390, and recordings of the changed animations.

## 0. State check

**Design system.** `DESIGN.md` + `tokens.css`: text is only ink / ink-2 / dim / faint / petrol / seafoam; plum, indigo and mint are for diagram categories and are never text; an undyed fibre is an ink outline with no fill (rule 7); petrol and plum together need a second cue (rule 6). `tools/verify-site-palette.mjs` (CI, every PR) checks the token link, the token values, the page ground and chrome text colours. It does not read SVG artwork.

**Motion rule on this page.** A figure plays once when it scrolls into view, holds its end frame, replays on hover or tap, and shows the end frame under reduced motion. The taxonomy panel followed it. The two older diagrams (sections 08 and 09) did not: both looped for ever by CSS.

**PR #492 (dyeing).** Merged Nov 5. Dyeing is its own page (`dyeing.html`); Textile 101 only links to it at the foot. Nothing of the dyeing page was touched. One consequence: `textile-dyeing.js` reads `DRAW.INK` as a hex and mixes colours with it, so `DRAW`'s colour constants were left alone (see decisions, D3).

**The sections, as found**

| # | Section | What it showed | How its picture was built |
|---|---|---|---|
| 02 | Fibers: Natural vs. Synthetic | Two bullets (natural: cotton, wool, silk; synthetic: polyester, nylon, spandex) and three icon cards: Bio-based, Recycled, Functionalized | Three hand-written 52 px SVG icons (leaf, hexagon, circle), decorative |
| 03 | Bonus: Fiber Cross-Sections | Four icon cards: Round, Irregular, Trilobal, Hollow | Four hand-written 52 px SVG icons |
| 04 | Yarn Construction Types | Two paragraphs pointing at the yarn row of the panel above | No picture of its own |
| 05 | Reading a Yarn Spec | Five definitions and three reveal cards | HTML `<details>`; no picture |
| 06 | Wovens, Knits & Nonwovens | Three columns of copy and a "go deeper" list of 17 structures | HTML only |
| 07 | Wovens vs. Knits | Two three-bullet columns | HTML only |
| 08 | Inside a Woven | Warp / weft copy and one diagram | Hand-written SVG: seven straight grey lines, three teal sine waves drawn over them, CSS loop |
| 09 | Weft vs. Warp Knitting | Two knit panels and two columns | Baked by `tools/knit-diagram/` from `textile-knit-loops.js`; real occlusion; CSS loop |

## 1. Section by section

Grades: **keep** (no change), **polish** (copy or small fixes), **rebuild** (new content and figure).

### 02 Fibers — REBUILD

| Claim as found | Verdict |
|---|---|
| Fibres are either natural or synthetic | **Incomplete.** Viscose, modal, lyocell and acetate are manufactured from a natural polymer. They are neither. |
| "Bio-based: Castor bean nylon, TENCEL™" | **Wrong grouping.** Castor-oil polyamide 11 is a synthetic with a bio-based feedstock. The other is a brand of lyocell, a regenerated cellulosic. "Bio-based" is a feedstock label, not a class. |
| "Recycled", "Functionalized" as a third row of fibre types | **Misleading.** Both are labels that apply to any class. The examples were brand names. |
| "Nearly every performance trait a fabric has, it inherits from the fiber" | Overstated; yarn and structure matter as much (the page says so one section earlier). Reworded. |
| No property was stated with a number | Nothing to check, and nothing to learn. |

Diagram: the three icons were decoration. Covered up, the captions lost nothing. Not in the page's stroke language.

**Rebuilt as:** the three classes side by side (natural: cellulosic / protein / mineral; manufactured from natural polymers: regenerated cellulose / cellulose esters; manufactured synthetic), one animated chart of moisture regain grouped by class, three sourced consequences of class (water, wet strength, heat), and the three cross-cutting labels kept as text, each saying what it does and does not tell you. Brand names removed.

### 03 Fiber Cross-Sections — REBUILD

| Claim as found | Verdict |
|---|---|
| "Irregular — Cotton" drawn as a lumpy blob | **Not recognisable.** Cotton is kidney-shaped with a collapsed lumen, and a twisted ribbon from the side. |
| "Hollow — Quick-dry, insulating, breathable" | **Half wrong.** Hollow gives bulk and insulation. Quick-dry / wicking belongs to grooved (channelled) sections. |
| "Trilobal — Shiny, high-luster" | Correct. The drawing was a four-pointed star, not three lobes. |
| "Round — Smooth hand, engineered polyester" | Fine. |
| Wool, silk and viscose | Missing. |
| "Bonus:" in the heading | The TOC does not say Bonus; the section is core. Dropped. |

**Rebuilt as:** eight animated cells in the panel's cell style. Row A (cotton, wool, silk, viscose) shows the fibre from the side, then cut. Row B (round, trilobal, hollow, channelled) shows the spinneret hole, then the filament it makes, which is the point of "engineered". Petrol marks the one feature each caption is about: cotton's lumen, wool's scale edges, the hollow core, the water in the grooves.

### 04 Yarn Construction Types — POLISH

The section is a pointer to the yarn row of the panel, and that is right: six constructions are drawn there. It said nothing technical. Added three short definitions a spec reader needs and the page did not have: spinning system (ring / rotor / air-jet), flat vs textured filament, S and Z twist. No new figure.

### 05 Reading a Yarn Spec — POLISH (with corrections)

| Claim as found | Verdict |
|---|---|
| "Number of Ends: how many individual filaments are bundled into the yarn" | **Wrong.** That is the filament count (F). Ends are parallel yarns fed together; in weaving, single warp yarns. |
| "DTY … mechanically crimped, smooth and sleek" | **Wrong.** DTY is draw-textured (false-twist): crimped, bulky, stretchy. Smooth and sleek describes flat yarn (FDY). |
| "ATY is air-entangled, soft, cotton-like" | Correct. |
| Denier: "linear mass density", no unit | Correct but empty. Now g per 9,000 m, with dtex. |
| `2×75D/2/72F Polyester + 1×140D Spandex` → plies 2, denier 75, filaments 72 | Ambiguous as written (is `2×` ends and `/2/` plies?). The answer ignored the `2×`. |
| `2/78/68 Crimp Polyamide` → denier 78 | **Probably wrong unit.** 78/68 is a common nylon 6,6 count in **dtex** (= 70 D). |
| `1/8/36 Recycled Polyester` → denier 8, 36 filaments | **Implausible.** 0.22 denier per filament in an 8 D yarn. Likely a typo for another count. |
| "USED IN: Cabot / SuperKnit / CoreKnit" | Product names. Removed, per the brief. |

Three cards kept (the Yarn Characterization page links here for "three more worked specs"). The new three are generic, use the same notation that page teaches, and each one shows a different thing: plies and dpf; a dtex count; a covered yarn whose weight is not the sum of its parts.

### 06 Wovens, Knits & Nonwovens — POLISH

| Claim as found | Verdict |
|---|---|
| "there are exactly three ways to turn [yarn] into fabric" | **Wrong twice.** Nonwovens are not made from yarn, and the panel above draws a fourth family (braid). |
| Knit: "warm" | Not a property of knitting. Dropped. |
| Nonwoven: "less durable and less stretchy" | Needs "typically"; felts and geotextiles are durable nonwovens. Reworded around the ISO 9092 idea (a fibrous web given integrity by means other than weaving or knitting). |
| "High Modulus — stiff yarns for high-strength applications" listed as a woven structure | It is a row of a known chart of reinforcement textiles, not a general weave type. The list now says where it comes from. |

### 07 Wovens vs. Knits — POLISH

| Claim as found | Verdict |
|---|---|
| Wovens: "Minimal stretch unless elastane is added" | Needs the bias: a woven stretches noticeably on the diagonal. |
| Knits: "Naturally stretchy, especially in width" | True of weft knits, usually. Now says so. |
| No reason given | Added the reason (straight yarns vs loops), and edge behaviour (fray / ladder / curl). |

### 08 Inside a Woven — REBUILD

| Claim as found | Verdict |
|---|---|
| Diagram: weft drawn as a sine wave over straight warp lines | **No occlusion at all.** Every weft is in front of every warp, so the picture does not show interlacing. The three wefts are also in phase where plain weave alternates. |
| "The weft shuttles back and forth" | True of shuttle looms only. |
| "warp gives stability and weft adds coverage" | Vague. Dropped. |
| Plain weave only | Twill and satin missing; "float" never appears. |
| Animation | Infinite CSS loop; against the page's motion rule. |

**Rebuilt as:** plain weave, 2/2 twill and 5-end satin, each woven pick by pick beside its point-paper draft, with real over/under (the taxonomy panel's tubes: every crossing is a notch cut in the yarn underneath). The interlacing is `/weave-draft.js`'s own `drawdown()` of its own presets, so cloth and draft cannot disagree. One pick is petrol, and so is its row in the draft. One repeat is outlined. A float is bracketed. The twill line is drawn on the draft.

### 09 Weft vs. Warp Knitting — KEEP (one cohesion fix)

Claims checked and left as written: one yarn per course in weft knitting; each warp-knit yarn laps between neighbouring wales; weft knits stretch most across the width (usually) and can ladder; warp knits resist laddering and need a yarn per needle.

Cohesion fix: the strands looped for ever by CSS. They now draw on once when the diagram scrolls into view, hold, and replay on hover or tap; reduced motion (or no script) shows the finished drawing. The baked markup is unchanged.

## 2. Does each new figure pass the two questions?

| Figure | A non-textile reader, caption covered | A textile engineer |
|---|---|---|
| Regain chart | Three groups, bars shrink from the first to the third: "the first two hold water, the third barely does". | Values are measured ranges at 65 % RH, not ASTM commercial regain; the caption says so. Lyocell's range is weakly sourced (Eva to verify). |
| Cross-sections, row A | "This is what the fibre looks like from the side, and this is its cut end." | Cotton's lumen and convolutions, wool's scale direction, silk's paired brins in sericin, viscose's serration and striations are all where they should be. Wool's ortho/para cortex and medulla are not drawn. |
| Cross-sections, row B | "A hole of this shape makes a strand of this shape." | Orifices are schematic (a Y, three arcs, a cross), not real capillary geometry; the cell says "hole", not a dimensioned die. |
| Weaves | Yarns visibly pass over and under; the grid fills in row by row as each yarn is laid, so the grid is seen to be a record of the cloth. | Draft and cloth come from one drawdown. Satin is warp-faced with move number 2; the twill is a 2/2 Z twill. Yarns are drawn straight (no crimp), as in the panel above. |
