# Flower control-panel audit

Report only. Nothing in this document changes code — no fixes, renames, deletions, or
reorganisation. Every finding below is a decision for Eva to make.

**Deploy Preview of current `main`:** this PR adds only this file under `docs/`; no
app code is touched, so its Deploy Preview *is* current `main` — every control below can
be exercised at `/flower.html` on that preview URL. See the PR description for the link
(Netlify posts it as a PR check once the build finishes).

## Sweep methodology and cost (read before the table)

The "Live?" column comes from an automated sweep, not inspection. For each of the 166
WIRED controls in `flower-registry.js` (`petalShape` is UI-only — see note under the
table), a throwaway script (`_sweep_full_tmp.mjs` in the repo root while this ran; not
committed, not part of any gate):

1. Reloads `flower.html` fresh in headless Chromium (no state leaks between controls),
   turns Advanced mode on, and expands every accordion.
2. Applies a "reach setup" — mutations to *other* controls, derived mechanically from
   this control's own `gating` field in the registry (e.g. a `data-tip-styles: "jagged"`
   gate sets `tipStyle = jagged` first) — then reads back whether the control's `.fl-ctrl`
   wrapper is actually visible. If it's still hidden after that, the control is
   **UNREACHABLE**.
3. If visible, samples the control's range and exports an STL at each sample:
   **sliders** at min / midpoint / max (3 points — not exhaustive; a slider is a
   continuous 0.01-step range in most cases, so this is a coarse sample, not a full
   sweep — see caveat below), **selects** at every option, **checkboxes** at both states,
   and the one **text** control (`petalsPerLayer`) at blank vs. a 4-value list.
4. Compares triangle count + a full vertex-coordinate checksum + bounding-box diagonal
   across the samples. All three identical → **DEAD**. Different, but the bbox diagonal
   moves by less than 0.5 mm across the whole sampled range → **NARROW** (the note gives
   the measured delta). Otherwise → **LIVE**.

**Cost:** ~21 s/control (page reload + STL export per sample) × 166 controls ≈ **55–60
minutes**, run once in the background. This is comparable to the project's own full
export-gate matrix (142 configs, ~9.5 min) scaled up by doing a fresh page load per
control instead of one cumulative session.

**What this catches and what it doesn't:**
- A 3-point slider sample can miss a genuinely non-monotonic response (e.g. a parameter
  that's flat 0–0.3, then moves 0.3–1) — such a control would show as NARROW or DEAD here
  when a finer sweep might show a real but narrow live band. Any DEAD/NARROW verdict
  below is flagged for a second look before deleting/widening anything, not treated as
  final.
- A bbox-diagonal-only signature can miss a change that moves geometry without changing
  the outer envelope (e.g. an internal density change that stays within the same silhouette
  and topology). The triangle-count and full-checksum comparison catch that case — bbox is
  only the NARROW/LIVE threshold, not the sole detector — but a genuine "changes internal
  structure, identical envelope, identical triangle count" case (unlikely given how this
  geometry is built, but not provably impossible for every control) would misclassify
  as DEAD. None of the DEAD verdicts below were spot-checked visually beyond the STL
  checksum; see the note directly under the table for the small number that deserve one.
- `petalShape` (`uiOnly`, excluded from `WIRED`) is a proxy over 13 already-tested params
  (`SHAPE_PARAMS` in `flower-shapes.js`: width, taper, clawLength, clawWidth, shoulder,
  cleftDepth, cleftLobes, cleftWidth, tip, curlAmount, edgeCurve, edgeProfile, petalCup —
  each swept individually below). Its own liveness isn't separately measured; it's LIVE
  by construction (setting it writes into controls already proven live).
- `divergenceAngle` is declared `permanentHidden` in the registry, so the mechanical
  gate-deriver above (which only reads the registry `gating` field) never tries to reveal
  it and the sweep reported it UNREACHABLE. That reading is **wrong** — the control is
  actually shown by bespoke JS (`updateDivergenceOptions()` in `flower.js`) whenever
  `bloomType=coiled` AND `divergenceMode=custom`, which has nothing to do with `gating`.
  Manually re-tested with that setup: **LIVE** (see row below) — but the registry
  mislabels this control's visibility mechanism, and that's a real finding — see
  Section 1's vocabulary note.

## The inventory table

<!-- TABLE_PLACEHOLDER -->

**Notes on rows above `permanentHidden` / `imperativeGate`:** `receptacleType`,
`stemCurve`, and `tube` are permanently hidden *by design* — migration-only or
dev-only slots the registry's own comments say must never surface in any tier. Their
UNREACHABLE verdict is expected, not a bug. `divergenceAngle` is different — see above.
`captureDist` is `imperativeGate` (shown by bespoke JS, not a `gating` sweep) and the
deriver's special-cased setup for it worked correctly.

---

## Section 1 — labels and helper text, verbatim

Every label and every line of helper text shown in the panel, in section order, exactly
as written in `flower.html` (HTML entities decoded for readability — e.g. `&rarr;` → `→`).
Not rewritten. Bracketed `[gate=value]` after a line means that hint only shows under that
gate (several controls show a *different* hint per state of another control, e.g.
Arrangement's three hints, one per bloom type). `_(no helper text)_` means the control
has a label and nothing else — no line explains it.

**Jargon flagged inline, immediately below the line it applies to**, marked **→ JARGON**.
Botanical/internal terms a working designer likely doesn't already know, used without
a plain-language gloss in the same line:

- *phyllotactic*, *phyllotaxy* (Arrangement, Seed pattern, Leaf arrangement) — the
  botanical term for spiral/whorled leaf-and-petal placement. Never glossed on first use;
  "golden angle" (given) helps but doesn't define the word itself.
- *caryophyllaceous* (Claw length) — a specific botanical family reference (pinks/carnations),
  used as the sole gloss for what "claw" means. A visitor who doesn't know the family name
  gets no explanation at all.
- *emarginate*, *bifid*, *fringed* as a scale (Cleft depth) — three technical margin terms
  in one line with no picture; "fringed" reads plain but "emarginate"/"bifid" don't.
- *chirality* (Twist) — used as the entire explanation ("contorted bud spiral about the
  midrib (chirality)"); a precise term for people who already know it, opaque otherwise.
- *plicate/rugose* (Surface relief) — two Latin surface-texture terms with no plain gloss;
  "corrugation" (given) partly covers it but the parenthetical adds jargon rather than
  removing it.
- *areoles* (Network, spacecol infill) — "loops and areoles" — a leaf-venation anatomy term,
  unexplained.
- *SDF* (Continuous margin) — "the receptacle rebuilt as ONE implicit surface (SDF)" —
  an implicit-surface / signed-distance-field acronym from the *implementation*, not the
  domain, sitting in user-facing hint text.

### Vocabulary collisions — one concept, multiple names

The task brief names one already-known example: the gate reads `ARRANGEMENT`-shaped
(`data-bloom-styles`), the registry key is `bloomType`, and the UI shows something else
again. Here is that one, plus every other control where the internal value, the gate
name, and the displayed text diverge enough to be confusing side by side:

| Concept | Registry key | Internal values | Gate attribute | Displayed option text | UI label | `updateReadout()` phrase |
|---|---|---|---|---|---|---|
| Arrangement | `bloomType` | `coiled` / `radial` / `bilateral` | `data-bloom-styles` | SPIRAL / ROSETTE / FAN | "Arrangement" | "phyllotactic spiral" / "radial rosette" / "bilateral fan" |
| Lace pattern | `infillType` | `veins` / `voronoi` / `strands` / `bone` / `spacecol` | `data-infill-styles` | VEINS / CELLS / STRANDS / LATTICE / GROWTH | "Pattern" (section is called "Lace") | "leaf venation" / "voronoi cells" / "radial strands" / "bone lattice" / "space colonization" |
| Edge treatment | `tipStyle` | `clean` / `jagged` / `scallop` / `ruffled` | `data-tip-styles` | CLEAN / TOOTHED / SCALLOPED / RUFFLED | "Edge" (the **section** is also called "Edge" — the control label and its section name are identical, so "the Edge control" and "the Edge section" are ambiguous in prose) | — |
| Center architecture | `centerArch` | `classic` / `dense` / `disc` / `petaloid` | `data-center-arch` | CLASSIC / DENSE CLUSTER / DISC / PETALOID FILL | "Center type" | — |
| The junction/receptacle | `receptacleType` (permanentHidden — see above), driven really by `hasReceptacle()` | — | `data-recept`, `data-cont-margin` | NONE / ON (never shown) | "Receptacle" (never shown); the visible entry points are the **Stem** and **Sepals** controls, which *derive* it | Called "receptacle" in code comments, "junction" in the registry's own inline comment block (lines 148–162), "the SDF junction" and "the node" in helper text (Absorption, Collar), and "trunk" in `tools/verify-flower-export.mjs` config labels (`buildTrunkInto`, "trunk: receptacle only…") — five names for one subsystem, and the one control literally labeled "Receptacle" is the one no user in any tier ever sees. |
| Sepal style | `sepalStyle` | `strap` / `solid` | — | MODIFIED LEAF / SOLID | "Sepal style" | — |
| Leaf identity | `leafType` | `compound` / `lobed` / `oval` / `narrow` | `data-leaf` (via `data-stem`) | COMPOUND (ROSE) / LOBED (POPPY) / OVAL ON PETIOLE / NARROW | "Leaves" | — |

Two more registration-adjacent naming notes, not full collisions but worth flagging
alongside these:

- `continuousMargin`'s gate attribute abbreviates to `data-cont-margin` — a different
  string than the registry key, forcing a reader to know they're the same thing.
- The registry's own header comment (line 149) calls the whole receptacle/junction/ornament
  block "one flat Receptacle block" — using the exact word ("Receptacle") that the
  permanently-hidden control also uses, while the block's actual visible controls are
  spread across two different accordion **sections implicitly**: Profile/Construction/
  Collar/Reach/etc. sit in "Base" next to Sepals and Stem, with no sub-heading in the
  rendered UI that says "Receptacle" or "Junction" at all (confirmed against
  `flower.html` — no `<h3>`/`fl-legend`-type element for this cluster; see Section 2).

<!-- SECTION1_PLACEHOLDER -->

---

## Section 2 — section structure

Five accordion sections, in this order, each with its own Standard/Advanced split
(counts are WIRED controls only — `petalShape` excluded as UI-only):

| Section | Total controls | Standard | Advanced |
|---|---|---|---|
| Form | 62 | 7 | 55 |
| Lace | 29 | 3 | 26 |
| Edge | 11 | 4 | 7 |
| Base | 62 | 4 | 58 |
| Make | 3 | 2 | 1 |

**Where the grouping is wrong, and why:**

1. **"Form" is doing at least three unrelated jobs and is by far the largest section
   (62 controls — more than a third of the whole panel).** It holds: (a) the bloom
   arrangement + bilateral per-petal overrides (bloomType through the three
   `bilEdge`/`bilScale`/`bilWidth`/`bilCurlAmount`/`bilEdgeCurve`/`bilEdgeProfile` blocks —
   24 controls alone), (b) the petal *silhouette* (shape, width, taper, claw, shoulder,
   cleft — the outline), and (c) per-petal *surface* treatment (cup, cross-section roll,
   relief, twist, skew, thickness) that has nothing to do with arrangement or silhouette.
   Per the flower-project skill's own stated build order — arrangement → centre → edge →
   infill, then silhouette outward-in within a petal — "Form" currently spans two full
   layers of that model (arrangement AND silhouette AND surface) under one heading with
   no sub-grouping visible in the rendered UI (no `<h3>` breaks the 62 controls into
   the bilateral-petal / silhouette / surface clusters the code comments themselves use).
2. **"Base" is the same problem, worse.** 62 controls spanning: centre architecture (4
   sub-types, ~20 controls), the receptacle/junction cluster (18 controls across legacy +
   SDF paths — see the vocabulary table above; genuinely two overlapping mechanisms wearing
   one accordion), sepals (11 controls), and stem+leaves (11 controls). These are four
   materially different concerns — "what's in the middle," "how the parts fuse into one
   solid," "what's around the outside of the bloom," "what's below the bloom" — collapsed
   into one heading with no sub-navigation. A visitor opening "Base" to change the centre
   type scrolls past the entire receptacle/sepal/stem block to get there or back.
3. **"Edge" the section and "Edge" the control (`tipStyle`) share an identical name.**
   Confirmed in Section 1's vocabulary table above. Any written guidance ("open the Edge
   section, set Edge to…") is ambiguous without extra words.
4. **Lace is the one section that reads as a single coherent concern** (choose an infill
   pattern, tune that pattern's own parameters) and is a reasonable model for what the
   other two large sections should look like: one clear top-level choice, sub-panels
   gated per choice, nothing unrelated mixed in.
5. **Make is thin (3 controls) and is where Export/Save/Share chrome lives outside the
   registry** (per the registry's own header comment: "Chrome not modelled here…
   viewPreset, autoRotate, saveNameInput, spaceSeed"). Reasonable as-is; flagged only so
   the eventual reorg treats "Make" as the process/print/output section it already is,
   not a dumping ground.

**Recommendation shape** (not a plan — Eva rules on structure): split "Form" into
Arrangement (bloomType + bilateral overrides) / Silhouette (shape + outline) / Surface
(cup, roll, relief, twist, thickness) / Layers, and split "Base" into Center / Junction
(the receptacle, named as such, its own heading) / Sepals / Stem & Leaves. That turns 5
sections into roughly 9, each single-purpose — closer to Lace's shape than Form/Base's
current shape.

---

## Section 3 — where sepals and base ornament would go

Per the flower-project skill: sepals and the base ornament are "one family" (decorative
structures below the bloom, always optional, user-chosen, meant to be designed together)
— and **sepals already exist as 11 wired controls** in the registry (`sepalsType` through
`sepalTipLength`), all under "Base," gated on `data-sepal`. So "neither exists" in the
task brief is true for base ornament specifically; sepals exist but aren't grouped as
their own thing yet — they're a sub-cluster inside the same 62-control "Base" pile as
everything else.

**Where they'd slot in, concretely:**

- **Sepals** already have a natural seam: `sepalsType` (the on/off select, tier:standard)
  through the 10 controls gated by `data-sepal`/`data-sepal-tip`. Under the Section 2
  recommendation, this becomes its own sub-heading immediately — no new registry work,
  just a heading and (optionally) an accordion of its own.
- **Base ornament** doesn't exist as controls yet, but the registry already documents where
  it attaches: the inline comment block at `flower-registry.js:148-162` explicitly splits
  the 18 receptacle/junction controls into `role:"junction"` (derived, never a control —
  `bundleTightness`, `flareRate`, `absorption`, `buttonSize`, `gatherHeight`,
  `blendSmoothness`, `receptacleDepth`, `convergenceTightness` — 8 controls, all shaping
  the necessarily-existing connective mass) vs. `role:"ornament"` (decorative choices about
  what the base *looks like* — `receptProfile`, `receptConstruction`, `receptCollar`,
  `receptReach`, `receptSolidity`, `ribMultiplier`, `spiralTightness`, `spiralThickness`,
  `bulbSize`, `bulbHeight` — 10 controls). **Base ornament is not a future section so much
  as a future *renaming and regrouping* of controls that are already ornament-role in the
  registry today**, currently indistinguishable from the junction controls in the rendered
  UI (no visual split between the two roles — confirmed against `flower.html`, both sets
  sit in the same undifferentiated "Base" list under `data-recept`).

**Does adding them force a reorganisation of what's already there?** Yes, but the
registry has already done the hard (invisible) part: the `role` tagging on every
junction/ornament control, and the derived-not-controlled nature of the junction's
*presence*, are already correct and already committed. What's missing is purely
presentational: a heading split (Junction vs. Ornament, matching `role`) that doesn't
exist in the DOM today, and sepals getting the same heading treatment. **Recommendation:
design the Section 2 split (Center / Junction / Ornament / Sepals / Stem & Leaves) now,
even though "Ornament" as a labelled group currently holds the same 10 controls it holds
today — so the future base-ornament work (if it adds new ornament controls, e.g. a new
collar style or a surface texture on the receptacle) lands in an existing slot instead of
triggering a second reorganisation.** This matches the brief's own preference ("design
the structure once with empty slots").

---

## Section 4 — presets

**All seven shipped presets**, exactly what each sets (as a delta over `DEFAULTS` — any
control not listed keeps its default):

| Preset | Note | Arrangement | Petals | Infill | Center | Distinguishing params |
|---|---|---|---|---|---|---|
| Daisy | "the friendly default" | radial | 18 | veins (density 4, softness 0.4) | disc, none | bloom 80, elevation 0.06, width 0.5, taper 0.5, tip 0.32, shoulder 0.35 |
| Rose | "lush cupped spiral" | coiled | 24 | veins (density 6, softness 0.7) | petaloid, none | tightness 0.2, bloom 44, petalCup 0.3, edgeCurve 0.1 |
| Lily | "deliberately spare" | radial | 6 | spacecol, open (softness 0.3) | classic, stamens | bloom 88, elevation -0.15, width 0.42, edgeCurve -0.06 |
| Poppy | "broad cellular petals" | radial | 6 | voronoi (density 6, softness 0.6) | dense, none | width 1.15, tip 0.6 |
| Dahlia | "quilled pompom" | coiled | 34 | bone (softness 0.5) | petaloid, none | tightness 0.12, petalTwist 0.4, tip 0.15 |
| Thistle | "spiky domed tuft" | coiled | 40 | strands (softness 0.4) | dense, none | tightness 0.4, bloom 24, elevation 0.35, width 0.45 |
| Carnation | "frilly clawed ruffle" | coiled | 9 | bone (softness 0.6) | petaloid, none | clawLength 0.3, clawWidth 0.28, tipStyle ruffled, edgeNoise 0.4 |

All seven ship with `sepalsType: none`, `stemType: none` (no junction, no sepals — the
comment in `flower-presets.js` explains this was deliberate: sepals were dropped pending
the whorl-unification overhaul) and `tipStyle: clean` except Carnation (`ruffled`) — the
only two edges that render under the Standard-default continuous margin, since
Toothed/Scalloped are Advanced-only per `flower.js`'s `ADV_OPTIONS`. Bilateral (FAN)
arrangement and the receptacle/junction are also never exercised by any preset — the
file's own header comment lists this as a deliberate coverage gap ("the cleanup
backlog"), not an oversight.

**How a preset is created today — the actual mechanism, file by file:**

1. **Design in the running app with `?dev` in the URL** (`flower.html?dev`) — this reveals
   a dev-only authoring row (`presetDev` element, hidden by default) with three buttons:
   Save as, Export, Import (`flower.js`, "PRESETS gallery" block, ~line 4428 on).
2. **"Save as"** (`presetSaveAs` click handler) prompts for a name + one-line note, computes
   `presetDelta(currentDesignParams())` — the minimal diff vs. `DEFAULTS` — and writes it
   into a **browser-local** draft list at `localStorage['flowerBloom.presets.draft.v1']`.
   This draft never leaves the browser and isn't part of the shipped product yet; it shows
   in the gallery with a "draft" badge and a ❋ placeholder instead of a thumbnail.
3. **"Export"** (`presetExport` click handler → `downloadPresetsSource()`) serializes *every*
   preset currently known to the browser (shipped + drafts) as paste-ready JS source —
   literally the text of a new `flower-presets.js` file — and downloads it.
4. **Landing it in the product is a manual code edit**: that downloaded file has to be
   opened and its `PRESETS` array copied into the committed `flower-presets.js` (replacing
   or merging with what's there), by a person with repo access, in a text/code editor.
   There is no in-app "publish" step — Export produces a file, not a commit.
5. **Thumbnails are a separate, required build step**: `node tools/gen-preset-thumbs.mjs`
   renders each preset headless and writes `assets/presets/<slug>.png` plus
   `assets/presets/manifest.json` (a deterministic tris+bbox record used by the
   `preset-thumbs` CI job's `--check` mode to catch undocumented drift).
6. **Both geometry gates pick the new preset up automatically** — `verify-flower-export.mjs`
   and `verify-geometry-quality.mjs` both `import` `flower-presets.js`'s `PRESETS` array by
   name and iterate it, so a new preset is a permanent regression fixture the moment step 4
   lands, with no separate gate edit required.
7. **Commit** `flower-presets.js` + the regenerated `assets/presets/` files.

**What it would take for Eva to design a preset in the UI and save it into the product,
without a code edit:** steps 1–3 above are already a real in-app authoring flow — a
non-engineer can already design and save a draft entirely in the browser. The gap is
steps 4–7: nothing currently turns a saved draft into a committed, shipped preset except
a human pasting JS into a file and running a node command. To close that gap without
building anything (since this session reports, doesn't build), the shape of the missing
piece is: a way to turn "Export" (a file download) into "this draft is now shipped" —
either (a) a small server-side endpoint that accepts the exported source and opens a PR
(this repo already has a `netlify/functions/designs.mjs` function and a `render.yaml`,
so there's existing serverless infrastructure that a "submit preset" endpoint could sit
next to, though wiring it to actually commit/PR requires GitHub write credentials living
somewhere), or (b) accepting that landing a preset always ends with one person pasting
a file's contents into `flower-presets.js` and running `gen-preset-thumbs.mjs` — a two-step,
low-skill but still textual/CLI workflow, not a full code edit, and arguably already
"a non-engineer can do this with a short written recipe" rather than "this requires an
engineer." Either way: **today, step 4 requires touching `flower-presets.js` directly**
(copy-paste, not authored-from-scratch code), and step 5 requires running one documented
`node` command. Not built here, per the brief.

---

## CLAUDE.md versus the flower-project skill

Both read in full for this audit (`/CLAUDE.md`, `.claude/skills/synced/flower-project/SKILL.md`
via the `flower-project` skill load). The skill already states its own intended division at
the end of its Conventions section ("This file and CLAUDE.md do not overlap... CLAUDE.md
loads every session and holds facts... This file loads on demand and holds procedure and
reasoning") — so the question here is whether that stated division actually holds today.

**Where it already holds (no overlap, correctly divided):**
- CLAUDE.md: Git+Netlify workflow rules, the export contract statement, `MIN_FEATURE_MM`,
  the two gate *commands* to run, the preset-file/thumbnail-regeneration procedure, the
  five maintainability/performance rules, the "before finishing a task" checklist. All facts
  or hard rules, all short.
- Skill-only, correctly: the order-of-operations build model, the registration rule and its
  Jacobian/space-tracking nuance, the junction-vs-ornament table, session-efficiency guidance
  (`/plan`, don't poll, batch questions), the aesthetic rules (loudness budget, area rule),
  SLS printing specifics, the vocabulary table (cross-section roll vs. spine curl vs. cup vs.
  twist), and the known-gaps/fixed-since log. None of this is restated in CLAUDE.md.
- The fabricated-issue-number story the skill warns about ("#64, #67, #68... propagating
  through both") does **not** currently appear in CLAUDE.md at all — that drift already got
  cleaned up (commit `9f64b75`, "replace unresolvable issue refs with real ones"). Flagging
  this as *resolved*, not open — the skill's warning is still worth keeping as a lesson, but
  the specific duplication it describes isn't present in the current CLAUDE.md text.

**Where it doesn't hold — the same principle stated twice, in different words, with
different framing, each independently editable:**

1. **"Watertight ≠ correct" is asserted in both files with the same example.** CLAUDE.md:
   *"Watertight is necessary, not sufficient — also run the geometry-quality gate... a
   petal can be watertight and the WRONG SHAPE (e.g. the un-clefted continuous-margin rim
   skipping a Lobed sinus)."* Skill, under Verification: *"export gate measured
   manifoldness; a cleft petal was watertight and visibly broken"* (one of four listed
   gate-measured-the-wrong-thing failures). Same lesson, same historical case (the
   cleft/Lobed sinus), stated independently in both places. **Proposed split**: CLAUDE.md
   keeps the imperative rule (both gates are mandatory, one line, no example) since that's
   the fact every session needs before touching geometry; the skill keeps the full
   failure-history reasoning (all four historical gate misses, why each was missed, the
   "a gate must measure the property that can actually fail" principle) since that's
   procedure/reasoning for whoever is designing a *new* gate, not a fact needed every
   session.
2. **"Report numbers, not summaries" is asserted in both, as two different rules that
   are really one rule.** CLAUDE.md maintainability item 2: *"Any change that touches
   geometry must report the actual triangle count (live + export) and export STL file
   size in its summary, so creeping bloat stays visible over time."* Skill, under
   Verification: *"Report numbers, not summaries... Any claim a confident summary could
   fake needs a number that can't be."* **Proposed split**: CLAUDE.md keeps the literal
   checklist item (already does, in "Before finishing a task") — the specific numbers to
   report and when. The skill keeps the general principle and the sharper framing ("a
   claim a summary could fake") since that's the *reasoning* a session should internalize,
   not a fact to look up.
3. **The 0.8 mm print-safety number appears in both, incompletely, in a way that could
   mislead on its own.** CLAUDE.md: *"tube/bead radii and slab/blade thickness are floored
   to the printable minimum (`MIN_FEATURE_MM = 0.8`)"* — stated as a flat 0.8 mm floor.
   Skill's Printing section gives the fuller, different-but-related real-world number:
   *"1.0 mm minimum for unsupported wire (0.8 mm only if supported)... this model is
   almost entirely unsupported wire."* Read CLAUDE.md alone, a session would reasonably
   conclude 0.8 mm is *the* safe floor; read together with the skill, the real constraint
   for most of this model's geometry is 1.0 mm, and 0.8 is the code's *export-time*
   floor for a narrower case (supported features) — not the same number applied to the
   same thing. This isn't simple duplication, it's two adjacent facts split across the
   files in a way that invites exactly the wrong inference from either file alone.
   **Proposed split**: this is print-domain reasoning (why 0.8 vs. 1.0, which parts of the
   model are unsupported wire) — belongs entirely in the skill's Printing section, with
   CLAUDE.md's export-contract paragraph cross-referencing it by name ("see the
   flower-project skill's Printing section for the SLS process minimums this floor
   approximates") rather than restating a number.

**Recommendation for the split going forward** (matching the division Eva already
described): CLAUDE.md keeps *only* the imperative form of each rule above — no examples,
no historical cases, no reasoning — and the skill keeps the reasoning, with CLAUDE.md
cross-referencing the skill by section name wherever a rule's *rationale* currently
leaks into CLAUDE.md's text (items 1 and 3 above both currently include a worked example
in CLAUDE.md that duplicates skill content). Eva decides the actual split; this section
only reports where today's text disagrees with the stated intent.


