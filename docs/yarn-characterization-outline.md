# Yarn Characterization — proposed outline for the deep expansion

**Status: PROPOSAL, nothing below is written yet.** This is the section order and the scope of each section for
Eva to approve or edit before any content is drafted. The page today (`yarn-characterization.html`) holds two
sections copied from `/lab`: **Yarn Construction** and **Covered Yarn — Twist Direction**. Both are animated by
`yarn-diagrams.js` / `yarn-diagrams.css`. Where they end up in the order below is marked **[built]**.

## Ground rules for the whole page

- **Neighbours, not duplicates.** `textile-101.html` already covers fiber types, staple vs filament (the
  yarn-and-cord row), a fiber cross-section gallery (`#cross-sections`) and "Reading a Yarn Spec" (`#yarn-spec`:
  ends, denier, ply, covered yarns, ATY vs DTY, three spec decodes). This page goes **deeper** on those topics and
  links back, rather than restating them. Conductive yarns stay on the smart-textiles pages, and dyeing stays on
  `/dyeing`.
- **Cause → effect.** Every section is organised around one question: *if I change X, what happens to the fabric?*
  Definitions come only as far as needed to read the cause-and-effect.
- **Design system.** Use the tokens and fonts in `DESIGN.md` (Fraunces / IBM Plex Mono). Petrol, seafoam and deep
  are for chrome. Plum, indigo and mint are for diagram categories only, never text, and petrol and plum are never
  the only cue for each other. Follow the `tx-topic` layout and numbered TOC that the other field notes use.
- **Sourcing.** A "Sources" line under each section that makes a quantitative or mechanistic claim. Standards
  (ASTM D2256 / ISO 2062 for tensile, ASTM D1907 / ISO 2060 for count, ASTM D1422 / ISO 2061 for twist) and
  textbooks (Hearle et al., *Structural Mechanics of Fibers, Yarns and Fabrics*; Lord, *Handbook of Yarn
  Production*; Morton & Hearle, *Physical Properties of Textile Fibres*) cite cleanly. Product pages do not count
  as evidence for a performance claim.
- **Skepticism flags.** Where marketing claims run ahead of the evidence, the page says so in its own voice: a
  "claim vs. evidence" aside in ink text with a `?` glyph, never coloured text.

## Proposed section order

| # | Section | Interactive | Needs sources |
|---|---|---|---|
| 01 | Units & terminology | Count converter + spec decoder | yes (conversion constants, standards) |
| 02 | Yarn construction **[built]** | The four animated builds (existing) | light |
| 03 | Twist | Twist slider → yarn render + strength / hand curves | yes |
| 04 | Covered yarn — twist direction **[built]**, folded under Twist as 03b | SCY S/Z, DCY (existing) | light |
| 05 | Strength & what changes it | Stress–strain plot with toggles | yes |
| 06 | Filament count & fineness | Same-denier filament-split slider | yes |
| 07 | Cross-sections | Cross-section picker with light / wicking / cover read-outs | yes |
| 08 | Texturing | Four-way process comparison, before/after yarn | yes |
| 09 | Air intermingling / interlacing | Nip-spacing diagram (**placeholder: Eva's images and papers**) | yes (Eva's papers) |
| 10 | Additives & modifications | Where-it-goes-in diagram + catalogue with evidence ratings | yes, heavily; skepticism flags |

The order runs from vocabulary, to the structure of a yarn, to the forces it carries, to its fineness and shape,
to post-spinning processes, to what is put in the polymer. Each section only uses words defined above it.

---

## 01 · Units & terminology

**Scope.** This is the vocabulary every later section needs: the four questions a yarn label answers (how heavy
per length, how many filaments, how many plies, how it was processed). It covers two families of count. **Direct**
systems (mass per length: denier = g / 9,000 m, dtex = g / 10,000 m, tex = g / 1,000 m) go *up* as the yarn gets
heavier. **Indirect** systems (length per mass: cotton count Ne = 840-yd hanks per lb, metric Nm = km per kg) go
*down* as the yarn gets heavier, and that inversion is the most common source of spec errors. It then covers
denier per filament (dpf), the notation people actually meet on sheets (`150D/48F`, `167dtex/48f`, `2/30s`,
`75D/72F × 2`), and the process states of polyester and nylon filament: **POY** (partially oriented, a feedstock,
not a sellable yarn), **FDY** (fully drawn, flat), **DTY** (draw-textured) and **ATY** (air-textured). Last come
filament vs staple, singles vs plied, and S vs Z.

**Key concepts.**
- Conversions: dtex = 1.111 × den; tex = den / 9; Ne = 5,315 / den; Nm = 9,000 / den; Ne = 0.5905 × Nm.
- Plied counts: cotton `2/30s` is two Ne 30 singles, with a resultant of roughly Ne 15.
- Filament notation (`denier/filaments`) vs ply notation; how "2/" is read in each system.
- dpf = total denier / filament count; the microfiber threshold (below about 1.0 dpf, below about 0.3 for
  "super-micro") as a definition, not a quality claim.
- Process states: POY → FDY (draw), POY → DTY (draw + false twist), FDY/POY → ATY (air jet).
- S vs Z, read from the diagonal of the letter. Singles are usually Z and plies usually S.

**Proposed interactive.** A **count converter**: type a value in any one unit (den, dtex, tex, Ne, Nm) and the
others update. There are two read-outs beside it: an arrow showing which way "heavier" runs in each system, and a
fixed-length bar whose thickness scales with the linear density (relative, not to scale). Under it, a **spec
decoder** extends Textile 101's three cards: paste or pick a spec string and it is parsed into total count,
filaments, dpf, plies and process, with the parse shown term by term.

**Sources.** ASTM D861 / ISO 1144 (the tex system), ASTM D1907 / ISO 2060 (count by skein). Conversion constants
are cross-checked against one textbook table.

---

## 02 · Yarn construction **[built]**

**Scope.** The section that exists now: single, plied, core-spun and drawn covered yarn as four animated builds. In
the expansion it gains a short paragraph on *why* each construction exists. Plying averages out irregularity,
balances torque and adds strength. Core-spinning gets stretch with the hand of the sheath fibre. Air covering is a
cheaper, faster covering than twist covering. Each type links forward to the section that explains its mechanism
(twist → 03, intermingling → 09).

**Interactive.** The existing four-up diagram (`yarn-diagrams.js`). No change proposed beyond the copy.

**Sources.** Light. One textbook reference for the construction definitions.

---

## 03 · Twist

**Scope.** Twist is the single biggest lever on how a spun yarn behaves. This section defines how twist is counted
(TPM, TPI; 1 TPI = 39.37 TPM). It then explains why a raw twist count cannot be compared across counts and the
**twist multiplier** (twist factor) can. A thicker yarn needs fewer turns to reach the same surface helix angle, so
TM = TPI / √Ne (cotton system) or α = TPM × √tex (metric) normalises for diameter. With that in hand, the
cause-and-effect:

- **Strength rises, then falls past an optimum.** Twist first makes the fibres grip each other (friction
  transfers load, so slippage drops). Past the optimum, the fibres sit at a steeper helix angle and carry less of
  the axial load, so strength falls. For filament yarns the curve is much flatter and peaks at low twist.
- **Hand.** Low twist is soft, lofty and fuzzy; high twist is hard, lean and smooth.
- **Luster.** Moderate twist on filament reduces luster; very low twist reads brightest.
- **Liveliness / snarling.** Stored torque makes a high-twist single kink back on itself.
- **Torque in fabric.** Spirality in single jersey comes from unbalanced singles.
- **Crepe / high-twist yarns.** Very high twist (TM often above about 5–6 on the cotton system), relaxed in
  finishing, gives the pebbled crepe surface.
- **Ply balancing.** A ply twist opposite to the singles' twist cancels torque. "Balanced" is a twist ratio, not a
  fixed number.

**Key concepts.** TPM/TPI, TM vs α, the helix angle (tan θ = π d T), the optimum-twist curve, staple vs filament
response, torque and snarl, crepe, balanced ply.

**Proposed interactive.** A **twist slider** (TM, with the TPM read-out for a chosen count) driving three linked
views:
1. A **yarn render**: fibres as helices, angle and packing following the slider, with fibre ends fuzzing at low
   twist.
2. A **strength curve** with a marker at the current TM. It shows two curves, staple and filament, told apart by
   dash pattern as well as colour (indigo and plum, not petrol and plum).
3. A row of qualitative **hand / luster / liveliness** gauges.

A "snarl" toggle shows a loop of the high-twist single kinking. **The curves are illustrative, and the axes say
so:** shapes are drawn from the literature, not a model of any one yarn.

**Sources.** Yes. Hearle et al. for the mechanics. Lord for TM ranges by end use. The optimum-twist curve needs a
cited figure, ideally the classic Gégauff / Hearle data, rather than a sketch.

### 03b · Covered yarn — twist direction **[built]**

The existing SCY S / SCY Z / DCY section moves here as a worked example of torque balancing. DCY's inner Z and
outer S wraps are the ply-balance argument above, applied to a covered yarn. It gets one added paragraph linking
the two.

---

## 05 · Strength & what changes it

**Scope.** What "strong" means for a yarn and which levers move it. **Tenacity** is breaking force per linear
density (g/den, cN/dtex; 1 g/den ≈ 0.883 cN/dtex), and it is the only way to compare yarns of different counts.
**Elongation at break**, the **initial modulus** (resistance to small stretches, which sets hand and recovery),
and **work of rupture** (toughness: the area under the curve) are separate properties that trade against each
other.

Polymer-level levers: **molecular weight** (longer chains mean more entanglement and higher tenacity, up to the
limit of melt viscosity); **draw ratio and orientation** (drawing aligns the chains: tenacity and modulus rise,
elongation falls; this is also the POY → FDY step); **crystallinity**; **heat setting** (it stabilises dimensions
and the crimp, and can trade a little tenacity for stability).

Yarn-level levers: **twist** (back-reference to 03), **irregularity and flaws** (a yarn breaks at its weakest link,
so CV% of mass matters more than the mean), and **plying** (raises strength and evens out weak spots). Filament
count matters too: at the same total denier, strength scales with the polymer, not the number of filaments, but
finer filaments abrade and fail sooner in use.

**Key concepts.** Tenacity vs breaking force, elongation, modulus, toughness, orientation, crystallinity, heat set,
weak-link theory, CV%, ply strength gain.

**Proposed interactive.** A **stress–strain plot** (tenacity against % elongation) with preset yarn curves (a
high-tenacity polyester FDY, a regular PET, nylon 6,6, a spun cotton, elastane on its own axis inset) and **toggles
that morph a curve**: draw ratio up or down, twist up or down, heat set on or off, a flaw injected. Toggling
annotates what moved (modulus, peak, elongation). A small **weak-link** strip beside it shows a yarn as a chain of
segments with variable strength, with the break at the minimum.

**Sources.** Yes. Typical tenacity and elongation ranges by fibre from Morton & Hearle. Test method ASTM D2256 /
ISO 2062. Preset curves labelled "typical, illustrative".

---

## 06 · Filament count & fineness

**Scope.** What happens when you split the same total denier into more, finer filaments. **The caveat goes up
front and in bold: everything here holds at the SAME total denier.** Comparing 150D/48F with 75D/72F mixes two
changes.

At fixed total denier, more filaments means lower dpf, which gives:
- **Softer hand and more drape.** A filament's bending stiffness scales roughly with diameter⁴ (second moment of
  area), and diameter with √dpf, so per-filament stiffness ∝ dpf². The bundle's stiffness falls roughly in
  proportion to dpf.
- **More cover and opacity** (more surface for the same mass).
- **More surface for wicking** (more capillary channels between filaments).
- **More pilling and snagging, and lower abrasion resistance**, because each filament is weaker and more exposed.
- Usually **duller** and slower to dye to depth (more surface scatters light and needs more dye for the same
  shade).

It then covers microfiber thresholds (about ≤ 1 dpf; super-micro about ≤ 0.3 dpf, often made by splitting a
bicomponent; see 07) and why the thresholds are definitions, not quality marks.

**Key concepts.** dpf, d ∝ √(dpf/ρ), bending stiffness ∝ d⁴, specific surface area ∝ 1/d, cover, pilling.

**Proposed interactive.** A **same-denier splitter**. Fix the total denier (e.g. 150D) and drag a filament-count
slider (24 → 288). A cross-section of the bundle redraws with that many circles at the right diameters, and four
read-outs update: dpf, relative bending stiffness (normalised to the starting point), relative surface area, and a
qualitative pilling-risk bar. A lock icon on "total denier" makes the caveat visible. Unlocking it lets you see the
confounded comparison and says so.

**Sources.** Yes. The d⁴ stiffness relationship and surface-area scaling from Morton & Hearle; microfiber
definitions with their source (the definitions vary by region and trade body; state which one is used).

---

## 07 · Cross-sections

**Scope.** Spinneret shape is a design lever. Textile 101's gallery names the shapes; this section explains what
each one *does*.
- **Round**: the baseline, slippery and with a "plastic" sheen.
- **Trilobal**: prism-like facets give sparkle and luster, plus a crisper hand. Common in carpet and bright apparel
  filament.
- **Multilobal / pentalobal**: softer luster and better cover; less glitter than trilobal.
- **Flat / ribbon**: high luster and a smooth, flat hand; good cover.
- **Channeled (4-channel / "4DG"-style)**: deep grooves drive capillary wicking along the fibre and faster drying.
- **Hollow**: lighter, warmer (trapped air), more loft and resilience; used in fill and insulation.
- **Bicomponent**: sheath-core (a low-melt sheath for bonding, or a functional sheath over a cheaper core);
  side-by-side (two polymers that shrink differently, giving helical self-crimp: stretch without elastane);
  islands-in-the-sea (dissolve the sea, leaving ultrafine island fibres for suede-like microfibre); segmented pie
  (split mechanically or chemically into wedge-shaped microfilaments).

The effects are summarised against shine, hand, drying speed, cover and **soiling**: lobed and channeled shapes
hide soil better but can trap it.

**Key concepts.** Shape factor / modification ratio, light scattering vs specular reflection, capillarity,
trapped air, differential shrinkage, splitting.

**Proposed interactive.** A **cross-section picker**: choose a shape, and a large cross-section diagram animates
the mechanism: light rays bouncing (luster), water wicking up the channels (drying), air in the hollow core
(insulation), the side-by-side fibre curling as it shrinks (self-crimp), the sea dissolving (islands). A small
radar chart beside it scores relative luster / wicking / cover / soil-hiding / loft. The scores are labelled
**relative and qualitative** and petrol is never the only cue (each axis is also labelled).

**Sources.** Yes, per mechanism. Bicomponent geometries from Hills Inc. technical literature is acceptable as a
process description, not as a performance claim. "4DG"-style channel wicking data from peer-reviewed capillarity
work, not the brand page.

---

## 08 · Texturing

**Scope.** Flat filament is smooth and dense. Texturing adds bulk, stretch or a spun-like hand. Covers:
- **False-twist (DTY)**: twist inserted, heat-set, removed; the filaments keep a helical crimp, giving stretch and
  bulk. A second heater gives "set" (lower stretch, stabler) DTY.
- **Air-jet texturing (ATY)**: an over-fed yarn is blown into **loops and arcs** around a stable core, giving a
  spun-like, cotton-ish hand with low stretch. Core-effect ATY feeds a core and an effect yarn at different
  overfeeds.
- **Stuffer box / BCF** (bulked continuous filament): the yarn is crammed into a heated box and crimps in a
  sawtooth. This is carpet yarn.
- **Knit-de-knit**: knit into a tube, heat-set, unravelled, leaving a looped "bouclé-like" crimp.
- **Edge crimp**: drawn over a heated edge so the two sides crimp differently, giving a curly, springy crimp.

For each: what it does to **bulk, stretch, hand and appearance**, and its typical end uses.

**Key concepts.** Crimp, overfeed, heat set, stretch vs bulk trade-off, the difference between a set and an
unset DTY.

**Proposed interactive.** A **process comparison**: four tabs (DTY, ATY, BCF, edge crimp, with knit-de-knit as a
note), each showing a flat filament going in, the process step animated schematically, and the textured yarn
coming out. A shared read-out compares bulk / stretch / hand on the same scale. One "what you'd see under a loupe"
close-up per type.

**Sources.** Yes. Hearle, Hollick & Wilson, *Yarn Texturing Technology*, is the standard reference.

---

## 09 · Air intermingling / interlacing

**Scope.** **PLACEHOLDER: Eva will supply images and papers for this section; the slots below are reserved and
nothing here is drafted until they arrive.**

The structure to fill:
- **Purpose.** Filament cohesion *without* twist, so a flat or textured multifilament runs through warping,
  weaving or knitting without splaying and breaking. It is often an alternative to sizing or twisting.
- **Nips.** Entangled nodes alternate with open sections. **Nip frequency** (nips/m) and **nip stability** (how
  many nips survive tension; tested e.g. by the hook-drop or Rothschild methods) are the two specification numbers.
- **Jets and process.** Jet geometry (the yarn channel and the air-inlet angle), air pressure, overfeed and yarn
  speed, and how each moves nip count and stability.
- **How it differs from air-jet texturing (08).** Intermingling makes *point* entanglements with almost no bulk or
  length change. ATY uses overfeed to make *loops* and bulk.

> **[SLOT 9.1 — Eva's image: an intermingled yarn, nips visible]**
> **[SLOT 9.2 — Eva's image or diagram: jet cross-section]**
> **[SLOT 9.3 — Eva's papers: nip frequency / stability data, jet parameters]**

**Proposed interactive.** A **nip-spacing diagram**: a filament bundle along the page with nips placed at a
chosen nips/m. A tension slider pulls the yarn and weak nips open (stability); a pressure slider moves the nip
density. A side-by-side panel shows the same bundle air-textured (08) to make the difference visual. Its
parameters are to be calibrated from Eva's papers, not invented.

**Sources.** Eva's papers, plus a textbook definition of nip testing.

---

## 10 · Additives & modifications

**Scope.** What gets into a yarn besides the base polymer, and **how it gets in**, because the route decides
durability. Three routes:
1. **Masterbatch in melt spinning**: a concentrated pellet of additive in a carrier polymer, let down into the melt
   (polyester, nylon, PP).
2. **Injection into the dope in solution / wet spinning**: added to the polymer solution (acrylic, viscose / lyocell,
   elastane). This is where solution dyeing of cellulosics lives.
3. **Topical finish**: applied to the yarn or fabric surface after spinning.

**Intrinsic beats topical for durability**: an additive dispersed through the fibre cannot wash or abrade off the
way a surface coating can. The trade-off is that only additive near the surface can act on the outside world, so
some functions (antimicrobial release, wicking) can work less well intrinsic than topical.

**Catalogue** (each with route, what it does, typical loading where the literature gives one, and the trade-off):
- **TiO₂ delustering**: bright (≈0%) / semi-dull (≈0.3%) / full-dull (≈2%+). Opacity and UV scatter rise, luster
  falls, abrasion on guides rises.
- **Solution / dope dyeing**: pigment in the melt or dope. Excellent wash and light fastness, no dye effluent; the
  colour is locked in early (cross-link to `/dyeing` §01).
- **Carbon black / conductive** (antistatic): carbon or metal in a stripe, a sheath or throughout. Links to the
  smart-textiles pages for conductive yarns proper.
- **UV stabilisers** (HALS, absorbers): protect the polymer itself (PP outdoors, nylon).
- **Flame retardants**: inherent (modified polymer, e.g. FR polyester) vs additive vs topical; durability and
  regulatory notes.
- **Antimicrobials** (silver, zinc, copper): ion release vs contact; the efficacy decay with washing; the
  regulatory status (EPA / BPR claims).
- **Mineral / ceramic loads**: **far-IR claims** and **"cooling minerals"** (mica, jade, etc.).
  **⚑ Skepticism flag:** see below.
- **Phase-change materials** (microencapsulated paraffins): real latent-heat buffering, but small and transient at
  the loadings that spin. State the J/g alongside the claim.
- **Optical brighteners**: fluoresce blue to read whiter. A perceptual effect, honestly described.

**Loading limits and trade-offs (cross-cutting).** Spinnability (particles break filaments; particle size must be
far below the filament diameter, a hard limit for fine dpf). **Strength loss** with loading. **Spinneret and melt
filter clogging** (pack pressure rise, shorter pack life). Guide abrasion (TiO₂). Colour and dyeability shifts.

**⚑ Where claims outrun evidence. Present these skeptically, in the page's own voice:**
- **Far-infrared (bioceramic) claims**: that the fabric "returns energy" or improves performance or recovery. Bodies
  do emit IR and ceramics have emissivity, but the measured effects in wear are small, the studies are often
  sponsored and small-n, and the regulator record includes the US FTC acting against such claims. The page should
  separate *emissivity measured* from *physiological benefit claimed*.
- **"Cooling minerals"** (jade, mica, "ice" yarns): a high thermal effusivity can make a fabric feel cool at first
  touch (a q-max measurement), which is real but transient. It is not sustained cooling. Present q-max as what it
  is.
- **Antimicrobial "odour-free forever"**: efficacy after repeated laundering is the honest number.
- **PCM "temperature regulation"**: real but bounded by the latent heat actually on board.

**Proposed interactive.** A **"where does it go in?" diagram**: the melt-spinning and wet-spinning lines drawn
schematically, with three entry points (masterbatch hopper, dope injection, finish applicator). Click an additive
in the catalogue and its route lights up, a fibre cross-section shows *where* it sits (dispersed, sheath, stripe,
surface), and a **wash-cycle slider** shows how much remains for intrinsic vs topical. Each catalogue card carries
an **evidence rating** (established / mixed / marketing-led) as a word plus a glyph, never colour alone.

**Sources.** Yes, heavily, and per additive. Peer-reviewed reviews for each claim. FTC and ASA rulings where they
exist. Loading figures with their source. No brand page as evidence of performance.

---

## Open questions for Eva

1. Approve or edit the order above, in particular whether Twist (03) should come before Construction (02).
2. Whether section 01's count converter should also accept yarn-spec strings, or whether that stays Textile 101's
   decoder.
3. Which brands, if any, may be named (Textile 101 names internal product names in its spec decoder; this page so
   far uses generic copy).
