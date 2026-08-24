# Flower control-panel audit

Report only. Nothing in this document changes code — no fixes, renames, deletions, or
reorganisation. Every finding below is a decision for Eva to make.

**Deploy Preview of current `main`:** this PR adds only this file under `docs/`; no
app code is touched, so its Deploy Preview *is* current `main` — every control below can
be exercised at `/flower.html` on that preview URL. See the PR description for the link
(Netlify posts it as a PR check once the build finishes).

---

## Two findings before the table

**The control literally labeled "Receptacle" is shown in no tier, ever, to anyone.**
`receptacleType` (`flower-registry.js`) carries `permanentHidden: true` and a static
`hidden` attribute in `flower.html` with no code path anywhere that clears it. Its own
helper text — *"the junction node that joins the petal & sepal feet, the center bundle
and the stem into one printable body"* — is the single clearest sentence in the entire
panel explaining what the receptacle/junction actually is, and it exists only in markup
a browser never renders. The receptacle Eva spent several sessions designing is reachable
today only *indirectly*, by turning on Stem or Sepals (which derive it via
`hasReceptacle()`) — there is no control anywhere named "Receptacle," "Junction," or
similar that a visitor, in any tier, ever sees. This is the fourth shipped-and-unreachable
defect this project has produced (after the Standard/Advanced tier-reveal bug, the
Toothed/Scalloped option-tier bug, and the BILATERAL quarantine). Not fixed here — flagged
so it can't be missed as a table row among 167.

**`permanentHidden` is not a trustworthy signal on its own — verify, don't trust the flag.**
Four controls carry it: `receptacleType`, `stemCurve`, `tube`, `divergenceAngle`. Checked
each individually against the actual DOM/JS, not just the registry field:

| Control | Static `hidden` in markup | Any code path that clears it | Verdict |
|---|---|---|---|
| `receptacleType` | yes | none found | genuinely, permanently hidden — flag is honest |
| `stemCurve` | yes | none found | genuinely, permanently hidden — flag is honest |
| `tube` | yes | none found | genuinely, permanently hidden — flag is honest |
| `divergenceAngle` | yes | **yes** — `updateDivergenceOptions()` sets `angleCtrl.hidden = !(coiled && custom)`, live-toggled whenever `bloomType` or `divergenceMode` changes | **shown whenever `bloomType=coiled` AND `divergenceMode=custom`** — flag is misleading |

**Three of four are honest; one is lying.** Manually verified `divergenceAngle` is
reachable and genuinely **LIVE** (re-tested with the real trigger: STL checksum changes
across 0°/90°/180° at identical triangle count — not just visible, actually moves
geometry). This is the same class of bug the flower-project skill already warns about
under the registration rule: a single-source-of-truth field (`permanentHidden`) that
disagrees with the imperative code it's supposed to summarize, and nothing checks the two
against each other. `divergenceAngle` should either carry `imperativeGate: true` (like
`captureDist`, which correctly declares "shown by bespoke JS, not `gating`") or have its
`divId` visibility logic replaced with a declared `gating` condition — right now it has
neither, which is why it read UNREACHABLE on the first pass of this very sweep.

### Five hiding mechanisms, not one — and a fifth that leaves no trace at all

A control's visibility in this panel is decided by up to five independent mechanisms,
only three of which the registry declares at all. Counted precisely against the 166 WIRED
controls:

1. **`gating`** — a declared visibility precondition tied to another control's live value
   (`data-tip-styles`, `data-recept`, etc.). **122 of 166 controls.** The normal case,
   and the one every other mechanism below is a variant or exception of.
2. **`permanentHidden`** — a declared, static, "never show this in any tier" flag.
   **4 controls** (`receptacleType`, `stemCurve`, `tube`, `divergenceAngle`) — **3 honest,
   1 lying** (see above).
3. **`imperativeGate`** — a declared "this is shown/hidden by bespoke JS, not a `gating`
   sweep" flag, telling a reader *not to be surprised* it isn't in the other two buckets.
   **1 control** (`captureDist`, via `updateTerminationOptions()`) — accurate.
4. **Untiered/ungated by default** — the remaining 39 controls carry none of the above and
   are simply always visible once their section and tier conditions are met. Not a hiding
   mechanism; the baseline.
5. **Undeclared bespoke JS** — a control is hidden by inline application logic that *no
   registry field names at all* — not `gating` (which would at least tell the sweep and a
   reader what condition to check), not `permanentHidden`, not `imperativeGate`. Found in
   **at least 12 controls**, in two shapes:
   - **Zero declared signal** — `edgeNoise`. Nothing in the registry suggests this
     control is ever conditionally hidden; it just is, some of the time (see below).
   - **Partially declared, undeclared layer on top** — `tipLength` and `scallopHeight`
     carry real `gating` that correctly explains their *native/Advanced* visibility, but
     Standard mode's contextual relabeling (`updateEdgeAmount()`, see below) hides them
     under an *additional* condition the registry says nothing about. Same pattern for
     the **9 legacy-receptacle controls** (`receptConstruction`, `receptCollar`,
     `receptReach`, `receptSolidity`, `ribMultiplier`, `spiralTightness`,
     `spiralThickness`, `bulbSize`, `bulbHeight`): their `gating` (`data-recept` /
     `data-recept-open` / `data-recept-ribbed`) is real and correct for *when the
     receptacle is on*, but `updateBaseOptions()` force-hides all nine again whenever
     `continuousMargin=on` — a second, undeclared condition, enforced by a hardcoded id
     list (`LEGACY_RECEPT`) inside `flower.js`, invisible to the registry entirely.

This is the strongest argument for the registry proposal below, precisely because it
isn't four separate oversights — it's one structural gap (no registry field for "this can
also be hidden by X") expressing itself independently in four different corners of the
panel. `divergenceAngle` (mechanism 2, wrongly) and `edgeNoise`/`tipLength`/
`scallopHeight`/the 9 legacy-receptacle controls (mechanism 5) are the same underlying
failure — a real visibility condition the single source of truth doesn't know about —
just caught by two different code paths.

### The `edgeNoise` finding, and why `verify-tier-visibility.mjs` didn't catch it

`edgeNoise` is `tier:"standard"`, carries no `gating`. Nothing in the registry suggests
it is ever hidden. It is hidden — genuinely, verifiably — at the exact default state a
first-time Standard visitor lands on.

**Cause:** `updateEdgeAmount()` in `flower.js` implements a *contextual single-slot
control* for the Edge picker: in Standard mode, `tipLength`, `scallopHeight`, and
`edgeNoise` collapse into one relabeled "Amount" slider, showing only the one matching
the current `tipStyle` (`{jagged: tipLength, scallop: scallopHeight, ruffled:
edgeNoise}`). The default `tipStyle` is `clean` — which maps to **none** of the three, so
the "Amount" slot is empty and all three sliders are hidden, `edgeNoise` included.
Verified directly against the running page (not inferred): `.fl-ctrl` wrapper
`hidden === true` at the literal default state, section itself expanded and visible.

**Why the tier gate passes anyway — traced to the actual assertion, not guessed:**
`verify-tier-visibility.mjs`'s control-level check is

```js
const shouldBeVisibleInAdvanced = (c) => c.tier !== 'standard' && !c.gating && !c.permanentHidden && !c.imperativeGate;
for (const c of WIRED) {
  if (!shouldBeVisibleInAdvanced(c)) continue;
  // ...assert visible in Advanced...
}
```

`c.tier !== 'standard'` means this assertion **only ever runs against Advanced-tier
controls, and only checks them in Advanced mode.** It has no equivalent assertion for
Standard-tier controls in Standard mode — not a weaker, one-directional version of one,
an *absent* one. `edgeNoise` is `tier:"standard"`, so it is categorically out of scope
for this check in both directions, for both reasons the docstring would lead you to
expect coverage: it isn't a select (so the other, genuinely bidirectional half of the
gate — `PANEL.filter(x => x.kind === 'select')`, which checks `advancedOnly` options in
both Standard and Advanced — doesn't apply to a slider), and it isn't Advanced-tier (so
the control-level half never examines it either). Two independent scope boundaries, not
one asymmetric check catching one direction and missing the other.

**This is the exact defect the gate was built to catch, one level down.**
`verify-tier-visibility.mjs` exists because Advanced silently stopped showing 25
controls — a Standard→Advanced regression. It was never extended to check the mirror
case: does Standard actually show every Standard-tier control that has no declared
reason to hide? It would not have caught this. Not fixed here — reported, because the
gate's own docstring claims a completeness ("in Standard mode... in Advanced mode...")
that the code doesn't deliver for control-level (non-select) visibility.

### `updateEdgeAmount()` is progressive disclosure, built once, for one section, invisibly

Set aside the bug for a moment — the *mechanism* `updateEdgeAmount()` implements is
exactly the feature shape of "let someone in Standard reach one Advanced-level control
without switching the whole panel to Advanced": one visible slot, swapped to whichever
control matches the current context. That is real, working, shipped progressive
disclosure — for exactly one section, implemented as one-off imperative JS, declared
nowhere the registry (or any gate) can see it. See Section 2 for what that means for the
reorganisation Eva is about to do.

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
  mislabels this control's visibility mechanism, and that's the finding above.

### Two different questions, two verdicts

The first pass of this sweep answered one question — *"can this control ever change the
geometry, under some reachable configuration?"* — by satisfying each control's declared
`gating` precondition before sweeping it. That's necessary, but it isn't the same question
as *"does this control do anything to the flower a visitor already sees?"* — and the gap
between them turned out to be a real product defect, not a measurement artifact.

`gating` only declares **visibility** preconditions. Nothing in the registry declares
**effect** preconditions — a control can be visible, enabled, wired all the way to
`readUI()`, and still multiply out to zero because a *different* control (not named in
its `gating`) is sitting at its own default. Confirmed directly by the sweep, in the
Form section alone, before any correction: `clawWidth` and `shoulder` read DEAD because
`clawLength` defaults to 0 (no claw exists to have a width or a shoulder transition);
`cleftLobes` and `cleftWidth` read DEAD because `cleftDepth` defaults to 0 (no cleft
exists to have a lobe count or a notch width). None of these four controls is `gating`-
restricted — a visitor can drag any of them right now and watch nothing happen, with
nothing in the UI to explain why.

**So this document reports two verdicts, not one:**

- **Live (any configuration)** — the original question: does the control ever move
  geometry, once its own declared gate and any discovered sibling dependency are
  satisfied? A DEAD verdict here means the code path is unreachable full stop — delete it.
- **Live at defaults (Standard)** — a separate, narrower sweep: of the controls that are
  `tier:"standard"` *and* actually visible with literally nothing else touched from
  `DEFAULTS`, which ones change geometry when swept alone? An INERT-AT-DEFAULT verdict
  here means: a first-time visitor sees this exact slider, can drag it, and nothing
  happens — not a code problem, a first-impression problem. This sweep is deliberately
  narrower (Standard-tier only, no gate-satisfaction mutations at all) because it is
  answering "what does someone land on," not "what can the panel do."

**The headline is three numbers, not one — collapsing them into a single count buries
the finding that prompted this whole side-investigation:**

1. **Visible at defaults and inert — the panel-feels-broken number.** Of the 17
   Standard-tier controls actually visible with nothing else touched from `DEFAULTS`,
   **1 does nothing when swept: `tipFineness`** (needs `tip` away from its 0.5 midpoint
   to have anything to sharpen — confirmed by direct measurement, not inferred). This is
   the number that answers "does this exact panel a visitor lands on already feel
   broken" — and it's reassuringly low.
2. **Standard tier but invisible at defaults — the discoverability number.** **2
   controls**: `leafType` and `edgeNoise`. These are different findings wearing the same
   number. `leafType` is the unremarkable case — correctly `gating`-restricted
   (`data-stem`), hidden until `stemType` (itself Standard, one control away) is turned
   on; a nested reveal, not a defect. `edgeNoise` is the pathological case — see above:
   hidden by undeclared bespoke JS, with zero registry signal that it's conditional at
   all, at the exact default a first-time visitor sees.
3. **Dead under every configuration — the delete list.** <!-- DELETE_LIST_HEADLINE -->
   (pending the full 166-control sweep + correction pass — see the inventory table).

<!-- INERT_HEADLINE -->

### The `petalShape` picker is the enabler for some of these, but only in Advanced

`petalShape` (`flower.js` `applyShape()`/`detectShape()`, bundles in `flower-shapes.js`)
writes a full 13-parameter bundle (`SHAPE_PARAMS`) on selection — not a gate, a macro.
Every option sets **all thirteen** params at once:

| Option | width | taper | clawLength | clawWidth | shoulder | cleftDepth | cleftLobes | cleftWidth | tip | curlAmount | edgeCurve | edgeProfile | petalCup |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ROUNDED (default) | 0.9 | 0.35 | **0** | 0.3 | 0.5 | **0** | 2 | 0.3 | 0.5 | 0.4 | 0 | 0 | 0 |
| POINTED | 0.7 | 0.5 | **0** | 0.3 | 0.4 | **0** | 2 | 0.3 | 0.15 | 0.3 | -0.1 | 0 | 0 |
| STRAP | 0.45 | 0.5 | **0** | 0.3 | 0.3 | **0** | 2 | 0.3 | 0.3 | 0.15 | 0 | 0 | 0.05 |
| CLAWED | 1.0 | 0.3 | **0.35** | 0.25 | 0.55 | **0** | 2 | 0.3 | 0.6 | 0.35 | 0.05 | 0 | 0.15 |
| LOBED | 0.95 | 0.35 | **0** | 0.3 | 0.55 | **0.55** | 2 | 0.3 | 0.85 | 0.4 | 0.05 | 0 | 0.1 |

Only **CLAWED** sets `clawLength` non-zero (0.35) — the enabler for `clawWidth`'s and
(probably — pending the correction pass) `shoulder`'s effect. Only **LOBED** sets
`cleftDepth` non-zero (0.55) — the enabler for `cleftLobes`'s and `cleftWidth`'s effect.
The default on page load, ROUNDED, sets both enablers to 0 — so a fresh visitor's claw and
cleft families are inert *by the shipped default*, and stay inert until they either pick
CLAWED/LOBED from the shape picker or manually raise `clawLength`/`cleftDepth`.

**Is there a discoverable path?** Two different answers depending on tier:
- **In Standard**, the question is moot for the specific controls above: `clawWidth`,
  `shoulder`, `cleftLobes`, `cleftWidth`, and their enablers `clawLength`/`cleftDepth` are
  all Advanced-tier — a Standard visitor never sees any of them, inert or not. `petalShape`
  itself (the macro) is Standard-tier and both CLAWED and LOBED are in
  `PICKER_SHAPE_NAMES` (the Standard picker's option set) — so a Standard visitor who picks
  CLAWED or LOBED gets a petal that's actually clawed/lobed; they just never encounter the
  five Advanced sliders that would otherwise look broken.
- **In Advanced**, the risk is real: picking CLAWED or LOBED from the shape picker sets
  every constituent slider correctly (the macro overwrites `clawLength` alongside
  `clawWidth`, `cleftDepth` alongside `cleftLobes`/`cleftWidth` — so *after* picking a
  shape, the sliders work). But an Advanced visitor who instead works top-to-bottom through
  the panel and drags `clawWidth` or `cleftLobes` *before* touching `clawLength`/
  `cleftDepth` — plausible, since the panel visually orders them adjacently
  (`clawLength → clawWidth → shoulder`, `cleftDepth → cleftLobes → cleftWidth`), but
  nothing stops someone opening straight to "Cleft width" via keyboard search or simply
  skipping the slider two rows up — gets a slider that does nothing, silently. The
  panel's own ordering is a soft mitigation, not a fix: adjacency helps a visitor who reads
  top-to-bottom, not one who doesn't.

### Proposal: declare effect-preconditions in the registry (not built here)

The registry already has one mechanism for "this control depends on another control's
value" — `gating`, for visibility. It has no equivalent for "this control has zero effect
below some other control's threshold." That's why the sweep's mechanical deriver had no
signal for any of the sibling dependencies found above — the same class of problem the
flower-project skill documents repeatedly (a real dependency that exists in the code and
nowhere in the single source of truth).

**Two different dependency classes turned up, and they need two different declarations —
collapsing them into one field would produce a declaration that can't express half the
cases:**

**1. Value dependency — a sibling *slider* sitting at/below a threshold multiplies this
control's effect to zero.** Shape: `enabledWhen: { id: 'clawLength', min: 0.01 }`. Fixable
two ways once declared: give the enabler a non-zero default, or dim/annotate the dependent
control until it's satisfied. One declaration feeds three consumers, the same pattern the
registry already uses for `gating`: (1) this sweep's `deriveSetup()` satisfies it
automatically instead of needing a hand-curated correction list; (2) the UI dims or
annotates the control ("has no effect while Claw length is 0"); (3) a small CI gate
asserts every `enabledWhen` declaration is still true by construction, the same way
`verify-tier-visibility.mjs` asserts `gating` today.

*Confirmed by direct measurement* (DEAD at `DEFAULTS`; corrected-regime result in the table):
- `clawWidth`, `shoulder` — need `clawLength > 0`
- `cleftLobes`, `cleftWidth` — need `cleftDepth > 0`
- `reliefFreq`, `reliefMode` — need `reliefAmp > 0`
- `voronoiWeightFalloff` — needs `voronoiWeight > 0`
- `crossSectionTaper` — needs `crossSection != 0`
- `tipFineness` — needs `tip` away from its 0.5 midpoint (also the one "visible at
  defaults and inert" control from the Standard-tier sweep above)

*Suspected, not yet independently confirmed*:
- `edgeNoiseScale` — needs `edgeNoise > 0`

**2. Mode dependency — the control belongs to a *different code branch* entirely, not a
magnitude.** Shape: `activeUnder: { id: 'infillType', oneOf: ['voronoi'] }`. **Not**
fixable by a non-zero default — there's no "amount of veins infill" that turns on a
slab-thickness control. The only real fixes are grouping (put the control inside its
mode's own section, so it's never visible outside that mode) or dimming with an explicit
"only applies under X" label — an `enabledWhen`-shaped UI treatment would be actively
misleading here, since no amount of dragging *anything* fixes it short of switching modes.

*Confirmed by direct measurement*:
- `thickTaper`, `thickEdge` — DEAD under the default `veins` (tube) infill. Their own hint
  text ("floored at print min") describes a *slab* thickness concept; `veins` builds tube
  geometry, not slabs. Re-testing under `infillType=voronoi` in the correction pass to
  confirm the slab-infill hypothesis directly rather than leave it as a plausible reading
  of the code.

**3. A third declaration this registry proposal must also cover — mechanism, not
threshold.** `enabledWhen`/`activeUnder` describe when a control does something. They say
nothing about *how it's revealed* — the `edgeNoise` finding above is a case where the
control's very presence in the DOM is contingent, and that contingency has no field to
live in today (that's what `imperativeGate` gestures at but doesn't fully cover — it
marks "shown by bespoke JS" without saying *which* condition). Whoever builds this should
treat "declares an effect precondition" and "declares a visibility precondition beyond
`gating`" as the same underlying gap, prompted by the same finding, rather than solve one
and leave the other as before.

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

**6. `updateEdgeAmount()` already answers a question about this reorganisation, and the
answer changes what "split into more sections" has to mean.** The mechanism it
implements — one visible slot in Standard mode, showing whichever control matches the
current context (`tipStyle` → `tipLength`/`scallopHeight`/`edgeNoise`) — is exactly
*contextual, per-section progressive disclosure*: reach one Advanced-shaped control from
Standard, for one section, without switching the whole panel to Advanced. That's a real
feature, shipped and working (when the slot is occupied), built as one-off imperative JS
for the Edge section alone, declared nowhere the registry or any gate can see. **If the
reorganisation above builds declared, registry-driven progressive disclosure — and a
9-section panel with a real Junction/Ornament split is exactly the shape that would
benefit from it — `updateEdgeAmount()` cannot be left standing next to it.** Two
implementations of the same idea, one declared and one not, is the precise failure mode
this project has already paid for once (the cleft-margin outline had two producers for
months before anyone noticed only one of them saw the sinuses). Either the new mechanism
absorbs `updateEdgeAmount()`'s Edge-section case on day one, or the reorg explicitly
carries it as a documented, temporary exception — never as an oversight discovered later.

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


