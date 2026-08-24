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

**The sweep process died silently partway through, and the check that should have caught
it didn't — worth two lines here because it bears on how much to trust a long unattended
sweep in future.** Around control 39/166 the background process was killed (a process-group
cleanup issue, not a script bug — the first attempt piped a `nohup`ed child through a
throwaway launcher command instead of using the harness's own tracked background-task
mechanism). For close to an hour, progress checks that `tail`ed the log file and counted
rows kept reporting "still running, on schedule" — because a row count and a stalled
timestamp can't distinguish "slow" from "dead." The fix wasn't a better log check; it was
switching to the harness's own process-status tracking (`TaskOutput`, which reflects
whether the OS process is actually alive), which caught the same failure mode immediately
on the second run — a genuine crash mid-sweep (an unguarded `page.click()` promise
rejection) was caught, diagnosed, and resumed within one check cycle instead of an hour.
**A progress check has to assert the process is alive, not just that its output looks
recent — the same "measuring an adjacent property, not the one that can fail" defect this
whole audit exists to find, showing up inside the tool built to run the audit.**

**Correction pass, and single-variable isolation on top of it.** The DEAD/NARROW verdicts
above (mostly `gating`-satisfied but not sibling/mode-satisfied — see the value- vs.
mode-dependency findings earlier) were re-tested two ways: first, in bulk, against a
"rich" patch that pushes seven plausible-enabler sliders non-zero at once (cheap, but a
flip under seven simultaneous changes doesn't say *which one* caused it); then,
individually, isolating **only** the one specific suspected sibling per flipped control —
`clawLength=0.3` alone for `clawWidth`/`shoulder`, `cleftDepth=0.4` alone for
`cleftLobes`/`cleftWidth`, `infillType=voronoi` alone for `thickTaper`/`thickEdge`, and so
on. **Every isolation attempt confirmed the single-variable cause directly** — none of the
ten needed the bundle, only the one sibling named in the registry proposal above. The
table's "Live?" notes cite the exact isolated config, not the seven-variable bundle, for
every corrected verdict.

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
3. **Dead under every configuration — the delete list.** After the full 166-control sweep,
   a correction pass that satisfied every plausible sibling/mode dependency, and a final
   single-variable isolation check on every flip (attribution, not correlation — see
   methodology below): **exactly 1 control, `boneOutline`.** 15 of the 16 controls that
   read DEAD on the first pass turned out to be value- or mode-dependent (see the table
   and the registry proposal above) and are genuinely live under some reachable
   configuration. `boneOutline` (a checkbox, "Petal outline," under the Lattice/bone
   infill) stayed DEAD even isolated under its only gating context (`infillType=bone`,
   toggled alone, nothing else touched) — no known configuration makes it do anything.
   Carries no helper text either, so there's no in-panel clue it might be broken. This is
   the one control this audit can actually recommend deleting, pending a source read to
   confirm it isn't a genuinely-dead wiring rather than a genuinely-dead visual effect.

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

| Section | Label as shown | Registry key | Tier | Type | Range / options | Gated by | Live? |
|---|---|---|---|---|---|---|---|
| Form | Arrangement | `bloomType` | Standard | select | SPIRAL / ROSETTE / FAN | — | **LIVE** — bbox-diagonal delta 10.172mm, tris 71500/106600 |
| Form | Number of petals | `petalCount` | Standard | slider | 1..40 step 1 | data-bloom-styles=coiled radial | **LIVE** — bbox-diagonal delta 35.990mm, tris 20328/351588/666488 |
| Form | Divergence angle | `divergenceMode` | Advanced | select | GOLDEN / EVEN / CUSTOM | data-bloom-styles=coiled | **LIVE** — bbox-diagonal delta 9.370mm, tris 71500 |
| Form | Custom angle | `divergenceAngle` | Advanced | slider | 0..180 step 0.1 | permanentHidden (never shown) | **LIVE** — manually corrected — registry permanentHidden flag is wrong; shown via updateDivergenceOptions() when bloomType=coiled AND divergenceMode=custom; re-tested checksum changes 0/90/180deg at identical tris |
| Form | Petals per side | `bilPerSide` | Advanced | slider | 1..3 step 1 | data-bloom-styles=bilateral | **LIVE** — bbox-diagonal delta 18.565mm, tris 37464/72560/106600 |
| Form | Petal spacing | `bilSpacing` | Advanced | slider | 15..60 step 1 | data-bloom-styles=bilateral | **LIVE** — bbox-diagonal delta 20.183mm, tris 106600 |
| Form | Petal on mirror line | `bilCenterPetal` | Advanced | checkbox | — | data-bloom-styles=bilateral | **LIVE** — bbox-diagonal delta 9.653mm, tris 106600/122672 |
| Form | Edge | `bilEdge1` | Advanced | select | DEFAULT (GLOBAL TIP) / CLEAN / SERRATED / RUFFLED | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 2.661mm, tris 106600/109336/124024 |
| Form | Scale | `bilScale1` | Advanced | slider | 0.3..2 step 0.05 | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 20.928mm, tris 104380/106688/115496 |
| Form | Width | `bilWidth1` | Advanced | slider | 0.45..1.5 step 0.01 | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 8.725mm, tris 104176/106992/107344 |
| Form | Spine curl | `bilCurlAmount1` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 19.810mm, tris 114824/100712 |
| Form | Edge curve — top-down | `bilEdgeCurve1` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 6.489mm, tris 103088/106600/107728 |
| Form | Edge curve — profile | `bilEdgeProfile1` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=1 | **LIVE** — bbox-diagonal delta 13.781mm, tris 106600 |
| Form | Edge | `bilEdge2` | Advanced | select | DEFAULT (GLOBAL TIP) / CLEAN / SERRATED / RUFFLED | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 4.331mm, tris 106600/109336/125784 |
| Form | Scale | `bilScale2` | Advanced | slider | 0.3..2 step 0.05 | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 18.377mm, tris 102556/105160/112560 |
| Form | Width | `bilWidth2` | Advanced | slider | 0.45..1.5 step 0.01 | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 8.140mm, tris 103320/104712/105800 |
| Form | Spine curl | `bilCurlAmount2` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 7.031mm, tris 115496/100136 |
| Form | Edge curve — top-down | `bilEdgeCurve2` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 6.485mm, tris 103800/106600/106224 |
| Form | Edge curve — profile | `bilEdgeProfile2` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=2 | **LIVE** — bbox-diagonal delta 9.474mm, tris 106600 |
| Form | Edge | `bilEdge3` | Advanced | select | DEFAULT (GLOBAL TIP) / CLEAN / SERRATED / RUFFLED | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 1.086mm, tris 106600/109336/125048 |
| Form | Scale | `bilScale3` | Advanced | slider | 0.3..2 step 0.05 | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 11.496mm, tris 102916/106008/113912 |
| Form | Width | `bilWidth3` | Advanced | slider | 0.45..1.5 step 0.01 | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 8.252mm, tris 103136/107912/105080 |
| Form | Spine curl | `bilCurlAmount3` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 11.424mm, tris 115176/100552 |
| Form | Edge curve — top-down | `bilEdgeCurve3` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 8.891mm, tris 103640/106600/107960 |
| Form | Edge curve — profile | `bilEdgeProfile3` | Advanced | slider | -1..1 step 0.01 | data-bil-petal=3 | **LIVE** — bbox-diagonal delta 7.700mm, tris 106600 |
| Form | Bloom angle | `bloom` | Standard | slider | 0..90 step 1 | — | **LIVE** — bbox-diagonal delta 20.840mm, tris 71500 |
| Form | Petal spacing | `tightness` | Standard | slider | 0..1 step 0.01 | data-bloom-styles=coiled | **LIVE** — bbox-diagonal delta 7.892mm, tris 71500 |
| Form | Center elevation | `elevation` | Standard | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 9.685mm, tris 71500 |
| Form | Organic variance | `variance` | Standard | slider | 0..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 7.320mm, tris 71500/69588/70004 |
| Form | Curl gradient (edge → centre) | `curlGradient` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 18.482mm, tris 73020/71500/70156 |
| Form | Size gradient (centre → edge, single whorl only) | `sizeGradient` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 5.619mm, tris 71888/71500/73100 |
| Form | Petal shape | `petalShape` | Standard | select | ROUNDED / POINTED / STRAP / CLAWED / LOBED / CUSTOM | — | **N/A (uiOnly)** — derived proxy over 13 already-tested params (SHAPE_PARAMS) — see methodology |
| Form | Petal width | `width` | Advanced | slider | 0.1..1.5 step 0.01 | data-hide-bilateral | **LIVE** — bbox-diagonal delta 13.595mm, tris 58376/68492/72704 |
| Form | Taper | `taper` | Advanced | slider | 0..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 1.095mm, tris 71132/69912/68432 |
| Form | Claw length | `clawLength` | Advanced | slider | 0..0.5 step 0.01 | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus clawLength itself)) |
| Form | Claw width | `clawWidth` | Advanced | slider | 0.05..0.6 step 0.01 | — | **NARROW** — DEAD at defaults; confirmed LIVE isolated on clawLength=0.3 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Shoulder | `shoulder` | Advanced | slider | 0..1 step 0.01 | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on clawLength=0.3 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Cleft depth | `cleftDepth` | Advanced | slider | 0..0.6 step 0.01 | — | **LIVE** — bbox-diagonal delta 1.524mm, tris 71500/67320/61916 |
| Form | Lobe count | `cleftLobes` | Advanced | slider | 2..7 step 1 | — | **NARROW** — DEAD at defaults; confirmed LIVE isolated on cleftDepth=0.4 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Cleft width | `cleftWidth` | Advanced | slider | 0.05..1 step 0.01 | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on cleftDepth=0.4 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Spine curl | `curlAmount` | Advanced | slider | -1..1 step 0.01 | data-hide-bilateral | **LIVE** — bbox-diagonal delta 14.925mm, tris 88524/59404 |
| Form | Curl bias | `curlBias` | Advanced | slider | 0..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 6.264mm, tris 71500/116604/148572 |
| Form | Curl start | `curlStart` | Advanced | slider | 0..0.95 step 0.01 | — | **LIVE** — bbox-diagonal delta 6.316mm, tris 71500/82556/171612 |
| Form | Edge curve — top-down | `edgeCurve` | Advanced | slider | -1..1 step 0.01 | data-hide-bilateral | **LIVE** — bbox-diagonal delta 12.454mm, tris 66320/71500/73264 |
| Form | Edge curve — profile | `edgeProfile` | Advanced | slider | -1..1 step 0.01 | data-hide-bilateral | **LIVE** — bbox-diagonal delta 1.984mm, tris 71500 |
| Form | Petal cup | `petalCup` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 0.651mm, tris 71500 |
| Form | Cross-section roll | `crossSection` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 6.499mm, tris 133580/71500 |
| Form | Cross-section taper | `crossSectionTaper` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on crossSection=0.5 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Surface relief | `reliefAmp` | Advanced | slider | 0..1 step 0.01 | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus reliefAmp itself)) |
| Form | Relief frequency | `reliefFreq` | Advanced | slider | 0..1 step 0.01 | — | **NARROW** — DEAD at defaults; confirmed LIVE isolated on reliefAmp=0.5 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Relief pattern | `reliefMode` | Advanced | select | Radial (ribs from base) / Transverse / Irregular (bullate) | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on reliefAmp=0.5 ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Twist | `petalTwist` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 5.033mm, tris 71500 |
| Form | Skew | `petalSkew` | Advanced | slider | -1..1 step 0.01 | — | **LIVE** — bbox-diagonal delta 4.202mm, tris 71500 |
| Form | Thickness taper | `thickTaper` | Advanced | slider | 0..1 step 0.01 | — | **NARROW** — DEAD at defaults; confirmed LIVE isolated on infillType=voronoi ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Edge knife | `thickEdge` | Advanced | slider | 0..1 step 0.01 | — | **NARROW** — DEAD at defaults; confirmed LIVE isolated on infillType=voronoi ONLY alone (single-variable attribution, not the bundled patch) |
| Form | Thickness | `thickScale` | Advanced | slider | 0.5..2 step 0.01 | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (infillType=voronoi) |
| Form | Layer count | `layerCount` | Advanced | slider | 1..6 step 1 | — | **LIVE** — bbox-diagonal delta 1.236mm, tris 71500/264918/388398 |
| Form | Petals per layer | `petalsPerLayer` | Advanced | text | — | data-layers-multi | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus petalsPerLayer itself)) |
| Form | Layer size falloff | `layerSizeFalloff` | Advanced | slider | 0.3..1 step 0.01 | data-layers-multi | **LIVE** — bbox-diagonal delta 4.636mm, tris 155786/199324/204004 |
| Form | Layer height offset | `layerHeightOffset` | Advanced | slider | -0.3..0.3 step 0.01 | data-layers-multi | **LIVE** — bbox-diagonal delta 5.275mm, tris 199720 |
| Form | Layer rotation offset | `layerRotationOffset` | Advanced | slider | 0..90 step 1 | data-layers-multi | **NARROW** — bbox-diagonal delta 0.002mm across sampled range (tris 199720) |
| Form | Layer bloom angle delta | `layerBloomAngleDelta` | Advanced | slider | 0..40 step 1 | data-layers-multi | **LIVE** — bbox-diagonal delta 2.876mm, tris 199720 |
| Lace | Pattern | `infillType` | Standard | select | VEINS / CELLS / STRANDS / LATTICE / GROWTH | — | **LIVE** — bbox-diagonal delta 0.650mm, tris 71500/172876/33712/46760/90570 |
| Lace | Network | `spaceMode` | Advanced | select | OPEN / CLOSED | data-infill-styles=spacecol | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 70916/90570) |
| Lace | Seed pattern | `spacePattern` | Advanced | select | PHYLLOTACTIC / JITTERED LATTICE / RANDOM | data-infill-styles=spacecol | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 90570/89274/106702) |
| Lace | Source density | `spaceDensity` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=spacecol | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus spaceDensity itself)) |
| Lace | Birth distance | `spaceBirth` | Advanced | slider | 0.03..0.2 step 0.005 | data-infill-styles=spacecol | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 112390/52482/25308) |
| Lace | Kill distance | `spaceKill` | Advanced | slider | 0.02..0.15 step 0.005 | data-infill-styles=spacecol | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 126204/42954/43052) |
| Lace | Growth step | `spaceStep` | Advanced | slider | 0.02..0.12 step 0.005 | data-infill-styles=spacecol | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 80516/60870/31816) |
| Lace | Network variants | `spaceVariants` | Advanced | slider | 1..6 step 1 | data-infill-styles=spacecol | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus spaceVariants itself)) |
| Lace | Density | `density` | Standard | slider | 3..12 step 1 | data-infill-styles=veins voronoi | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus density itself)) |
| Lace | Vein detail | `softness` | Standard | slider | 0..1 step 0.01 | data-infill-styles=veins voronoi | **NARROW** — bbox-diagonal delta 0.036mm across sampled range (tris 20724/45440/111864) |
| Lace | First branch | `veinBranchStart` | Advanced | slider | 0..0.6 step 0.01 | data-infill-styles=veins | **NARROW** — bbox-diagonal delta 0.036mm across sampled range (tris 69784/79540/69344) |
| Lace | Edge termination | `edgeTermination` | Advanced | select | FADE / MEET / LOOP | data-infill-styles=veins bone spacecol | **NARROW** — bbox-diagonal delta 0.004mm across sampled range (tris 36688/62548/71500) |
| Lace | Capture distance | `captureDist` | Advanced | slider | 0.02..0.4 step 0.01 | imperative JS (not a `gating` sweep) | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 67364/71500) |
| Lace | Cell relaxation | `voronoiLloyd` | Advanced | slider | 0..20 step 1 | data-infill-styles=voronoi | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 162076/173576/175576) |
| Lace | Cell density law | `voronoiDensityLaw` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=voronoi | **NARROW** — bbox-diagonal delta 0.002mm across sampled range (tris 172876/158776/152376) |
| Lace | Anisotropy | `voronoiAniso` | Advanced | slider | 1..4 step 0.05 | data-infill-styles=voronoi | **NARROW** — bbox-diagonal delta 0.002mm across sampled range (tris 172876/164776/165376) |
| Lace | Weight hierarchy | `voronoiWeight` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=voronoi | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 172876) |
| Lace | Weight falloff | `voronoiWeightFalloff` | Advanced | slider | 0..4 step 0.1 | data-infill-styles=voronoi | **NARROW** — mode-dependent: DEAD under continuousMargin=on (default/SDF path), NARROW under continuousMargin=off (legacy path) |
| Lace | Slab taper | `voronoiSlabTaper` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=voronoi | **NARROW** — bbox-diagonal delta 0.467mm across sampled range (tris 172876) |
| Lace | Strand count | `strandCount` | Advanced | slider | 4..44 step 1 | data-infill-styles=strands | **NARROW** — bbox-diagonal delta 0.039mm across sampled range (tris 17072/37872/58672) |
| Lace | Strand width | `strandWidth` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=strands | **NARROW** — bbox-diagonal delta 0.177mm across sampled range (tris 33712) |
| Lace | Strand taper | `strandTaper` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=strands | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 33712) |
| Lace | Strand curvature | `strandCurvature` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=strands | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 33712) |
| Lace | Irregularity | `strandIrregularity` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=strands | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 33712) |
| Lace | Bone count | `boneCount` | Advanced | slider | 4..40 step 1 | data-infill-styles=bone | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 21624/53832/86040) |
| Lace | Bone width | `boneWidth` | Advanced | slider | 0..3 step 0.01 | data-infill-styles=bone | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 46760) |
| Lace | Bone curve | `boneCurve` | Advanced | slider | -1..1 step 0.01 | data-infill-styles=bone | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 43336/45288/47912) |
| Lace | Bone spread | `boneSpread` | Advanced | slider | 0..1 step 0.01 | data-infill-styles=bone | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 41368/46440/46824) |
| Lace | Petal outline | `boneOutline` | Advanced | checkbox | — | data-infill-styles=bone | **DEAD** — confirmed DEAD even isolated under its only plausible enabler (boneOutline <- infillType=bone, toggled alone) — no known config makes this control do anything |
| Edge | Edge | `tipStyle` | Standard | select | CLEAN / TOOTHED / SCALLOPED / RUFFLED | — | **LIVE** — bbox-diagonal delta 1.262mm, tris 71500/76972/75468/107852 |
| Edge | Tip shape | `tip` | Standard | slider | 0..1 step 0.01 | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus tip itself)) |
| Edge | Tip fineness | `tipFineness` | Standard | slider | 0..1 step 0.01 | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on tip=0.9 + width=0.2 (narrow) alone (single-variable attribution, not the bundled patch) |
| Edge | Tip frequency | `tipFrequency` | Advanced | slider | 1..40 step 1 | data-tip-styles=jagged ruffled | **NARROW** — bbox-diagonal delta 0.116mm across sampled range (tris 71916/80236/91116) |
| Edge | Tip region | `tipRegion` | Advanced | slider | 0..1 step 0.01 | data-tip-styles=jagged | **LIVE** — bbox-diagonal delta 0.640mm, tris 78636/75180/72492 |
| Edge | Tip length | `tipLength` | Advanced | slider | 0..1 step 0.01 | data-tip-styles=jagged ruffled | **LIVE** — bbox-diagonal delta 4.764mm, tris 71500/76972 |
| Edge | Tip irregularity | `tipIrregularity` | Advanced | slider | 0..1 step 0.01 | data-tip-styles=jagged | **LIVE** — bbox-diagonal delta 1.171mm, tris 76972 |
| Edge | Scallop count | `scallopCount` | Advanced | slider | 2..30 step 1 | data-tip-styles=scallop | **LIVE** — bbox-diagonal delta 1.232mm, tris 75596/76236/79948 |
| Edge | Scallop height | `scallopHeight` | Advanced | slider | 0..1 step 0.01 | data-tip-styles=scallop | **LIVE** — bbox-diagonal delta 5.627mm, tris 75468 |
| Edge | Edge noise | `edgeNoise` | Standard | slider | 0..1 step 0.01 | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85 (all, minus edgeNoise itself)) |
| Edge | Edge noise scale | `edgeNoiseScale` | Advanced | slider | 0..1 step 0.01 | — | **LIVE** — DEAD at defaults; confirmed LIVE isolated on edgeNoise=0.5 ONLY alone (single-variable attribution, not the bundled patch) |
| Base | Center type | `centerArch` | Standard | select | CLASSIC / DENSE CLUSTER / DISC / PETALOID FILL | — | **LIVE** — bbox-diagonal delta 0.504mm, tris 71500/76044/116204 |
| Base | Classic style | `centerType` | Advanced | select | STAMENS / PISTIL / NONE | data-center-arch=classic | **LIVE** — bbox-diagonal delta 2.448mm, tris 71500/67244 |
| Base | Amount | `centerCount` | Advanced | slider | 1..60 step 1 | data-center-arch=classic; data-center-styles=stamens pistil | **LIVE** — bbox-diagonal delta 0.583mm, tris 67548/76668/85484 |
| Base | Length | `centerLength` | Advanced | slider | 0..3 step 0.01 | data-center-arch=classic; data-center-styles=stamens pistil | **LIVE** — bbox-diagonal delta 11.851mm, tris 71500 |
| Base | Filament thickness | `centerFilThick` | Advanced | slider | 0..1 step 0.01 | data-center-arch=classic; data-center-styles=stamens pistil | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 71500) |
| Base | Tip size | `centerTipSize` | Advanced | slider | 0..1 step 0.01 | data-center-arch=classic; data-center-styles=stamens pistil | **NARROW** — bbox-diagonal delta 0.423mm across sampled range (tris 71500) |
| Base | Tip shape | `centerTipShape` | Advanced | slider | 0..1 step 0.01 | data-center-arch=classic; data-center-styles=stamens pistil | **NARROW** — bbox-diagonal delta 0.109mm across sampled range (tris 71500) |
| Base | Stamen count | `denseStamenCount` | Advanced | slider | 10..200 step 1 | data-center-arch=dense | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 69044/78544/88044) |
| Base | Stamen length | `denseStamenLength` | Advanced | slider | 0..1 step 0.01 | data-center-arch=dense | **LIVE** — bbox-diagonal delta 0.782mm, tris 76044 |
| Base | Carpel count | `carpelCount` | Advanced | slider | 1..10 step 1 | data-center-arch=dense | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 75404/76204/76844) |
| Base | Carpel size | `carpelSize` | Advanced | slider | 0..1 step 0.01 | data-center-arch=dense | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 76044) |
| Base | Disc size | `discSize` | Advanced | slider | 0..1 step 0.01 | data-center-arch=disc | **LIVE** — bbox-diagonal delta 0.701mm, tris 71500 |
| Base | Disc height | `discHeight` | Advanced | slider | 0..1 step 0.01 | data-center-arch=disc | **LIVE** — bbox-diagonal delta 1.297mm, tris 71500 |
| Base | Ring stamen count | `ringStamenCount` | Advanced | slider | 0..150 step 1 | data-center-arch=disc | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 67500/75000/82500) |
| Base | Ring stamen length | `ringStamenLength` | Advanced | slider | 0..1 step 0.01 | data-center-arch=disc | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 71500) |
| Base | Fill petal count | `fillPetalCount` | Advanced | slider | 12..200 step 1 | data-center-arch=petaloid | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 77036/153740/230444) |
| Base | Outer fill size | `fillOuterSize` | Advanced | slider | 0.05..0.5 step 0.01 | data-center-arch=petaloid | **LIVE** — bbox-diagonal delta 0.893mm, tris 116204 |
| Base | Inner fill size | `fillInnerSize` | Advanced | slider | 0.03..0.5 step 0.01 | data-center-arch=petaloid | **LIVE** — bbox-diagonal delta 3.132mm, tris 116204 |
| Base | Fill density | `fillDensity` | Advanced | slider | 0..1 step 0.01 | data-center-arch=petaloid | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 116204) |
| Base | Fill bloom angle | `fillBloomAngle` | Advanced | slider | 0..90 step 1 | data-center-arch=petaloid | **NARROW** — bbox-diagonal delta 0.231mm across sampled range (tris 116204) |
| Base | Continuous margin | `continuousMargin` | Advanced | select | OFF / ON | — | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85) |
| Base | Bundle tightness | `bundleTightness` | Advanced | slider | 0..1 step 0.01 | data-cont-margin | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85) |
| Base | Flare rate | `flareRate` | Advanced | slider | 0..1 step 0.01 | data-cont-margin | **LIVE** — NARROW at defaults; corrected to LIVE under a richer config (clawLength=0.3, cleftDepth=0.4, crossSection=0.5, curlAmount=0.5, edgeNoise=0.5, reliefAmp=0.5, tip=0.85) |
| Base | Absorption | `absorption` | Advanced | slider | 0..1 step 0.01 | data-cont-margin | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 87096/92336/98704) |
| Base | Neck swell | `buttonSize` | Advanced | slider | 0..1 step 0.01 | data-cont-margin | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 93512/94004/94588) |
| Base | Gather height | `gatherHeight` | Advanced | slider | 0.05..0.6 step 0.01 | data-cont-margin | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 93908/93024/92676) |
| Base | Receptacle | `receptacleType` | Advanced | select | NONE / ON | permanentHidden (never shown) | **UNREACHABLE** — UNREACHABLE — permanentHidden by design (migration-only slot, no code path reveals it) |
| Base | Profile | `receptProfile` | Advanced | select | FLARE / DOME / CONE / URN / GENTLE | data-recept | **LIVE** — bbox-diagonal delta 9.873mm, tris 93580/95020/92672/93784/90108 |
| Base | Construction | `receptConstruction` | Advanced | select | SOLID / RIBBED / CORED | data-recept | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 88832/89660) |
| Base | Collar | `receptCollar` | Advanced | select | NONE / BAND / FERRULE | data-recept | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 88832/89372/90452) |
| Base | Reach | `receptReach` | Advanced | slider | 0..1 step 0.01 | data-recept | **LIVE** — DEAD at defaults; confirmed LIVE isolated on layerCount=3 + stem alone (single-variable attribution, not the bundled patch) |
| Base | Blend smoothness | `blendSmoothness` | Advanced | slider | 0..1 step 0.01 | data-recept | **NARROW** — mode-dependent: DEAD under continuousMargin=on (default/SDF path), NARROW under continuousMargin=off (legacy path) |
| Base | Receptacle depth | `receptacleDepth` | Advanced | slider | 0..1 step 0.01 | data-recept | **LIVE** — bbox-diagonal delta 18.576mm, tris 89188/93580/97628 |
| Base | Convergence tightness | `convergenceTightness` | Advanced | slider | 0..1 step 0.01 | data-recept | **NARROW** — mode-dependent: DEAD under continuousMargin=on (default/SDF path), NARROW under continuousMargin=off (legacy path) |
| Base | Solidity | `receptSolidity` | Advanced | slider | 0..1 step 0.01 | data-recept-open | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 89660) |
| Base | Rib multiplier | `ribMultiplier` | Advanced | slider | 0.5..3 step 0.05 | data-recept-ribbed | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 89080/90820/93140) |
| Base | Rib tightness | `spiralTightness` | Advanced | slider | 0..1 step 0.01 | data-recept-ribbed | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 89660/91040/93380) |
| Base | Rib thickness | `spiralThickness` | Advanced | slider | 0..1 step 0.01 | data-recept-ribbed | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 89660) |
| Base | Bulb size | `bulbSize` | Advanced | slider | 0..1 step 0.01 | data-recept-dome | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 89312) |
| Base | Bulb height | `bulbHeight` | Advanced | slider | 0..1 step 0.01 | data-recept-dome | **LIVE** — bbox-diagonal delta 11.858mm, tris 89312 |
| Base | Sepals | `sepalsType` | Standard | select | NONE / SEPALS | — | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 71500/113980) |
| Base | Sepal size | `sepalSize` | Advanced | slider | 0.1..1.5 step 0.05 | data-sepal | **LIVE** — bbox-diagonal delta 7.962mm, tris 111496/113880/117128 |
| Base | Sepal count | `sepalCount` | Advanced | slider | 3..24 step 1 | data-sepal | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 103824/156120/200408) |
| Base | Sepal style | `sepalStyle` | Advanced | select | MODIFIED LEAF / SOLID | data-sepal | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 113980/114732) |
| Base | Sepal center curve | `sepalCenterCurve` | Advanced | slider | -1..1 step 0.01 | data-sepal | **NARROW** — bbox-diagonal delta 0.152mm across sampled range (tris 113980) |
| Base | Sepal edge curve — top-down | `sepalEdgeCurve` | Advanced | slider | -1..1 step 0.01 | data-sepal | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 114400/114572/114440) |
| Base | Sepal edge curve — profile | `sepalEdgeProfile` | Advanced | slider | -1..1 step 0.01 | data-sepal | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 113980) |
| Base | Sepal tip style | `sepalTipStyle` | Advanced | select | CLEAN / SERRATED | data-sepal | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 113980/119284) |
| Base | Sepal tip shape | `sepalTipShape` | Advanced | slider | 0..1 step 0.01 | data-sepal; data-sepal-tip=jagged | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 119020/119568/118964) |
| Base | Sepal tip frequency | `sepalTipFreq` | Advanced | slider | 1..40 step 1 | data-sepal; data-sepal-tip=jagged | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 114644/124724/138324) |
| Base | Sepal tip region | `sepalTipRegion` | Advanced | slider | 0..1 step 0.01 | data-sepal; data-sepal-tip=jagged | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 121844/117524/114164) |
| Base | Sepal tip length | `sepalTipLength` | Advanced | slider | 0..1 step 0.01 | data-sepal; data-sepal-tip=jagged | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 114284/119284) |
| Base | Stem | `stemType` | Standard | select | NONE / STEM | — | **LIVE** — bbox-diagonal delta 10.354mm, tris 71500/93580 |
| Base | Stem length | `stemLength` | Advanced | slider | 0..10 step 0.05 | data-stem | **LIVE** — bbox-diagonal delta 32.582mm, tris 89660/93580 |
| Base | Stem curve | `stemCurve` | Advanced | slider | -1..1 step 0.01 | permanentHidden (never shown) | **UNREACHABLE** — UNREACHABLE — permanentHidden by design (dev-only slot) |
| Base | Stem thickness | `stemThickness` | Advanced | slider | 0.5..3 step 0.05 | data-stem | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 90372/99444/111840) |
| Base | Leaf nodes | `stemNodeCount` | Advanced | slider | 0..8 step 1 | data-stem | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 93580) |
| Base | Node prominence | `stemNodeProminence` | Advanced | slider | 0..1 step 0.01 | data-stem | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 93580) |
| Base | Side bud | `stemBudMode` | Advanced | select | NONE / TIGHT BUD / EARLY BLOOM | data-stem | **LIVE** — bbox-diagonal delta 7.180mm, tris 93580/147724/147212 |
| Base | Leaves | `leafType` | Standard | select | NONE / COMPOUND (ROSE) / LOBED (POPPY) / OVAL ON PETIOLE / NARROW | data-stem | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 93580/132772/102460/101968) |
| Base | Leaf arrangement | `leafPhyllotaxy` | Advanced | select | ALTERNATE / OPPOSITE / WHORLED | data-stem; data-leaf | **NARROW** — bbox-diagonal delta 0.000mm across sampled range (tris 132772/171964/211156) |
| Base | Leaf size | `leafSize` | Advanced | slider | 0.2..3 step 0.05 | data-stem; data-leaf | **LIVE** — bbox-diagonal delta 43.888mm, tris 132772 |
| Make | Size | `heightMM` | Standard | slider | 40..300 step 5 | — | **LIVE** — bbox-diagonal delta 358.784mm, tris 71500 |
| Make | Process | `process` | Standard | select | SLS NYLON / RESIN SLA / FDM 0.4MM | — | **LIVE** — bbox-diagonal delta 0.795mm, tris 71500 |
| Make | Tube thickness | `tube` | Advanced | slider | 0..1 step 0.01 | permanentHidden (never shown) | **UNREACHABLE** — UNREACHABLE — permanentHidden by design (dev-only slot) |

**Notes on rows above `permanentHidden` / `imperativeGate`:** `receptacleType`,
`stemCurve`, and `tube` are permanently hidden *by design* — migration-only or
dev-only slots the registry's own comments say must never surface in any tier. Their
UNREACHABLE verdict is expected, not a bug. `divergenceAngle` is different — see above.
`captureDist` is `imperativeGate` (shown by bespoke JS, not a `gating` sweep) and the
deriver's special-cased setup for it worked correctly.

### Breaking down the 70 NARROW verdicts

Query over the sweep's own data, no new measurements.

**1. Tier split: 3 Standard, 67 Advanced.** The Standard three are `softness` ("Vein
detail"), `sepalsType` ("Sepals"), `leafType` ("Leaves"). Everything else living at
NARROW is Advanced-tier — a subtle Advanced control is doing its job (fine-tuning within
a space someone chose to enter); these three are the ones that matter, because they're
what a first-time Standard visitor actually drags.

**2. The threshold: 0.5 mm of bounding-box-diagonal movement across the full sampled
range. Chosen, not inherited.** I picked this number when writing the sweep harness — it
does not come from CLAUDE.md, the flower-project skill, or any existing gate in this
codebase. Nothing in this project defines a "this counts as visible" threshold; the
closest existing guidance is the skill's "match measurement resolution to feature size"
principle (a 0.8 mm rib on a 120 mm flower is one pixel at 240 px), which argues for a
*context-dependent* threshold (tied to the model's own scale and print-feature floor,
`MIN_FEATURE_MM`), not a flat constant applied identically to every control regardless of
overall model size. 0.5 mm is defensible as a first pass but is exactly the kind of
number a real gate would need to derive, not assume — flagged for whoever builds the
`enabledWhen`/`activeUnder` gate machinery above.

**3. The ten smallest deltas — and the real finding is that "ten smallest" isn't a
clean ranking.** Of the 70, 8 have no recoverable numeric delta (see the gap noted
below); of the remaining 62, **48 measured *exactly* 0.000 mm — a 48-way tie, not a
gradient.** These are controls whose triangle count and geometry checksum both changed
(so they're not DEAD) while the model's outer bounding box didn't move by a
floating-point-detectable amount at all. 2 of the 48 are the Standard-tier `sepalsType`
and `leafType` — see point 4, this is a metric blind spot, not a true near-invisible
effect, for those two specifically. The other 46 are internal/structural Advanced
parameters (lattice density, rib counts, cell relaxation, strand curvature) where an
envelope-invariant effect is expected and correct — changing how many bones a lattice
has shouldn't move the petal's silhouette.

Representative names from the zero-delta 48 (not a top-10, since there's no ordering
among ties): `spaceMode`, `spacePattern`, `spaceBirth`, `spaceKill`, `spaceStep`,
`captureDist`, `voronoiLloyd`, `voronoiWeight`, `strandTaper`, `strandCurvature` — all
Advanced.

Real ranking begins above zero:

| Label | Registry key | Delta | Tier |
|---|---|---|---|
| Layer rotation offset | `layerRotationOffset` | 0.002 mm | Advanced |
| Cell density law | `voronoiDensityLaw` | 0.002 mm | Advanced |
| Anisotropy | `voronoiAniso` | 0.002 mm | Advanced |
| Edge termination | `edgeTermination` | 0.004 mm | Advanced |
| Vein detail | `softness` | 0.036 mm | **Standard** |
| First branch | `veinBranchStart` | 0.036 mm | Advanced |
| Strand count | `strandCount` | 0.039 mm | Advanced |
| Tip shape (center) | `centerTipShape` | 0.109 mm | Advanced |
| Tip frequency | `tipFrequency` | 0.116 mm | Advanced |
| Sepal center curve | `sepalCenterCurve` | 0.152 mm | Advanced |

`softness` — one of only three Standard-tier NARROW controls — is the 5th-smallest
measured delta of any control in the entire 166-control sweep. That is the sharpest
single number in this breakdown: a first-time visitor's one Standard "Vein detail"
slider moves geometry less than all but four Advanced fine-tuning knobs.

**Data gap, disclosed rather than papered over:** 8 of the 70 final NARROW controls
(`clawWidth`, `cleftLobes`, `reliefFreq`, `thickTaper`, `thickEdge`,
`voronoiWeightFalloff`, `blendSmoothness`, `convergenceTightness`) reached their final
NARROW status through the correction/isolation pass — measured under a different,
corrected configuration than the plain-defaults sweep — and the numeric bbox-delta for
that corrected measurement lived in `corrections.json`/`dual-regime.json`, which were
deleted as scratch files during cleanup before this question was asked. All 8 are
Advanced-tier, so this gap doesn't touch the tier split (point 1) or the widen-range
question (point 4, Standard-only) — it only means they're excluded from the ranking in
point 3 rather than silently assigned a guessed number. Noted rather than re-run, per
the "report only" constraint on this session.

**4. Of the 3 Standard-tier NARROW controls, zero would clear the LIVE threshold by
widening range alone — and two of the three aren't a range question at all.**

- **`softness`** is the only one of the three that's actually a slider with a range to
  widen. Its own 3-point sweep (`v=0` → diag 167.02103 mm, `v=0.5` → 167.03769 mm, `v=1`
  → 167.05707 mm) gives a measured rate of **0.036 mm per unit of slider travel** across
  its full declared 0–1 span. Linear extrapolation (a real assumption — the actual
  relationship may not stay linear far outside the tested range) says clearing 0.5 mm
  would need roughly a **14× wider span** — the slider would need to run to about 14
  instead of 1. Not a plausible range widening; this control is envelope-preserving by
  design (it grades internal vein branching density, not the petal outline), so no
  amount of range makes it move the bounding box the way `enabledWhen`/`activeUnder`
  would fix a truly gated-off control.
- **`sepalsType`** and **`leafType`** are `<select>` controls with 2 and 5 discrete
  options — there is no numeric range to widen. Their 0.000 mm reading is the metric
  blind spot from point 3: turning sepals on adds 42,480 real triangles
  (71,500 → 113,980) entirely inside a bounding box already set by the petals and stem
  already in frame; turning leaves on does the same. The fix these two need, if any, is
  a better metric (e.g. measuring the *added sub-assembly's* own bbox rather than the
  whole model's), not a wider range and not a behaviour change — a third category this
  question's framing didn't anticipate.

**So: 0 of 3, by two different mechanisms — one genuinely small effect that range can't
fix, two real, large, correctly-working effects a bounding-box metric can't see at all.**

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

### Full listing, by section

#### Form

- **Arrangement** (`bloomType`)
    - phyllotactic spiral (golden angle) [bloom-styles=coiled]
    - evenly spread around one ring [bloom-styles=radial]
    - symmetric fan across one axis [bloom-styles=bilateral]
- **Number of petals** (`petalCount`)
    - total petals in the bloom [bloom-styles=coiled]
    - petals evenly spaced around the ring [bloom-styles=radial]
- **Divergence angle** (`divergenceMode`)
    - golden spiral → even ring → custom angle
    - below 8 petals the spiral looks irregular — try even
- **Custom angle** (`divergenceAngle`)
    - degrees between successive petals
- **Petals per side** (`bilPerSide`)
    - petals on each side of the mirror line
- **Petal spacing** (`bilSpacing`)
    - angle between neighbouring petals
- **Petal on mirror line** (`bilCenterPetal`)
    - _(no helper text)_
- **Edge** (`bilEdge1`)
    - applies to the centre petal too, if on
- **Scale** (`bilScale1`)
    - _(no helper text)_
- **Width** (`bilWidth1`)
    - _(no helper text)_
- **Spine curl** (`bilCurlAmount1`)
    - _(no helper text)_
- **Edge curve — top-down** (`bilEdgeCurve1`)
    - _(no helper text)_
- **Edge curve — profile** (`bilEdgeProfile1`)
    - _(no helper text)_
- **Edge** (`bilEdge2`)
    - _(no helper text)_
- **Scale** (`bilScale2`)
    - _(no helper text)_
- **Width** (`bilWidth2`)
    - _(no helper text)_
- **Spine curl** (`bilCurlAmount2`)
    - _(no helper text)_
- **Edge curve — top-down** (`bilEdgeCurve2`)
    - _(no helper text)_
- **Edge curve — profile** (`bilEdgeProfile2`)
    - _(no helper text)_
- **Edge** (`bilEdge3`)
    - _(no helper text)_
- **Scale** (`bilScale3`)
    - _(no helper text)_
- **Width** (`bilWidth3`)
    - _(no helper text)_
- **Spine curl** (`bilCurlAmount3`)
    - _(no helper text)_
- **Edge curve — top-down** (`bilEdgeCurve3`)
    - _(no helper text)_
- **Edge curve — profile** (`bilEdgeProfile3`)
    - _(no helper text)_
- **Bloom angle** (`bloom`)
    - closed bud → fully open
- **Petal spacing** (`tightness`)
    - petals touching (packed) → petals spread (open spiral)
- **Center elevation** (`elevation`)
    - sunken bowl → flat → raised cone
- **Organic variance** (`variance`)
    - uniform florets → each varies in length, angle & roll
- **Curl gradient (edge → centre)** (`curlGradient`)
    - + outer curls less / inner curls more — sign reverses it
- **Size gradient (centre → edge, single whorl only)** (`sizeGradient`)
    - + inner petals smaller / outer bigger — sign reverses it
- **Petal shape** (`petalShape`)
    - a named silhouette — the petal controls below fine-tune it (Advanced), which reads back as CUSTOM
- **Petal width** (`width`)
    - bilateral sets width per petal (Bloom)
- **Taper** (`taper`)
    - broad → slender
- **Claw length** (`clawLength`)
    - basal stalk (0 = none → caryophyllaceous claw)
- **Claw width** (`clawWidth`)
    - stalk width as fraction of blade
- **Shoulder** (`shoulder`)
    - gentle dip → abrupt claw → blade
- **Cleft depth** (`cleftDepth`)
    - lobed margin: entire (0) → emarginate → bifid → fringed
- **Lobe count** (`cleftLobes`)
    - 2 = bifid → 4 = ragged robin → 7 = fringed
- **Cleft width** (`cleftWidth`)
    - narrow slit → wide notch between lobes
- **Spine curl** (`curlAmount`)
    - flat → arc → full circle → fiddlehead crozier
- **Curl bias** (`curlBias`)
    - uniform (hoop) → tip-loaded (crozier)
- **Curl start** (`curlStart`)
    - 0 = whole petal curls → higher = only the outer portion
- **Edge curve — top-down** (`edgeCurve`)
    - pinched → billowed (plan view)
- **Edge curve — profile** (`edgeProfile`)
    - edges dip → lift (parallel to centre curve)
- **Petal cup** (`petalCup`)
    - across-width bowl: cupped spoon (+) → flat (0) → reflexed (−)
- **Cross-section roll** (`crossSection`)
    - flat (0) → channelled → closed quill (±1); sign picks which way it rolls
- **Cross-section taper** (`crossSectionTaper`)
    - uniform (0) → opens to a spoon at the tip (+) or the base (−)
- **Surface relief** (`reliefAmp`)
    - out-of-plane corrugation: smooth → plicate/rugose
- **Relief frequency** (`reliefFreq`)
    - broad pleats → fine crepe
- **Relief pattern** (`reliefMode`)
    - rib direction (radial follows the vein flow)
- **Twist** (`petalTwist`)
    - contorted bud spiral about the midrib (chirality)
- **Skew** (`petalSkew`)
    - lateral midrib bend (asymmetric single petal)
- **Thickness taper** (`thickTaper`)
    - base-to-tip: uniform → thick base, thin tip
- **Edge knife** (`thickEdge`)
    - thin the margin to a knife edge (floored at print min)
- **Thickness** (`thickScale`)
    - global sheet/rib thickness (floored at print min)
- **Layer count** (`layerCount`)
    - concentric petal whorls (1 = single ring, unchanged)
- **Petals per layer** (`petalsPerLayer`)
    - comma list, outer→inner (e.g. 8,12,16); blank slots use the Bloom petal count
- **Layer size falloff** (`layerSizeFalloff`)
    - each inner layer's size, as a fraction of the one outside it (1 = uniform)
- **Layer height offset** (`layerHeightOffset`)
    - vertical stacking distance between layers (+ raises the inner layers)
- **Layer rotation offset** (`layerRotationOffset`)
    - angular stagger per layer, so inner petals fall in the outer gaps
- **Layer bloom angle delta** (`layerBloomAngleDelta`)
    - how much more closed/cupped each inner layer is (rose/peony centre)

#### Lace

- **Pattern** (`infillType`)
    - _(no helper text)_
- **Network** (`spaceMode`)
    - open grows a pure branching tree → closed lets veins fuse into loops and areoles
- **Seed pattern** (`spacePattern`)
    - how the attraction sources are placed — phyllotactic (golden angle) is the crispest, matching the coiled bloom
- **Source density** (`spaceDensity`)
    - few sources, open network → many sources, fine dense venation
- **Birth distance** (`spaceBirth`)
    - minimum spacing between sources — larger spreads them out, capping how dense it can get
- **Kill distance** (`spaceKill`)
    - how close a vein must reach a source before it is consumed — larger ends branches sooner
- **Growth step** (`spaceStep`)
    - how far a vein advances each step — smaller is smoother and finer but heavier
- **Network variants** (`spaceVariants`)
    - distinct networks cycled across the petals — 1 repeats one, more break up the repetition
- **Density** (`density`)
    - few → many primary veins off the midrib [infill-styles=veins]
    - few, large cells → many, small [infill-styles=voronoi]
- **Vein detail** (`softness`)
    - midrib + primaries only → dense fine capillary network [infill-styles=veins]
    - angular cells → rounded, organic — up to 5× [infill-styles=voronoi]
- **First branch** (`veinBranchStart`)
    - where the first branch sits up the midrib — lower = closer to the base
- **Edge termination** (`edgeTermination`)
    - how the infill meets the rim — fade stops short of it, meet runs veins into the margin, loop fuses neighbouring tips into arches
- **Capture distance** (`captureDist`)
    - how close a tip must reach the margin before it is captured — as a fraction of blade width
- **Cell relaxation** (`voronoiLloyd`)
    - 0 leaves cells sliced by the outline → more evens them and settles outer cells against the margin
- **Cell density law** (`voronoiDensityLaw`)
    - 0 keeps cells one size (crowds the tip) → 1 shrinks them with the blade so the count across stays even
- **Anisotropy** (`voronoiAniso`)
    - 1 round cells → higher stretches them along the petal so they flow like veins
- **Weight hierarchy** (`voronoiWeight`)
    - 0 one uniform wall weight → 1 thick at the base and along spines, fine toward the tip
- **Weight falloff** (`voronoiWeightFalloff`)
    - how fast wall weight drops from base to tip — low is gradual, high stays thick then thins late
- **Slab taper** (`voronoiSlabTaper`)
    - 0 even sheet depth → 1 deeper at the base and shallower at the tip, for bending stiffness where it matters
- **Strand count** (`strandCount`)
    - wide gaps → densely packed
- **Strand width** (`strandWidth`)
    - thin strands, open voids → thick strands, narrow slits
- **Strand taper** (`strandTaper`)
    - uniform width → fine point at the tip
- **Strand curvature** (`strandCurvature`)
    - straight radial → organic bow
- **Irregularity** (`strandIrregularity`)
    - uniform widths → naturally varied
- **Bone count** (`boneCount`)
    - few ribs → dense rib cage
- **Bone width** (`boneWidth`)
    - fine bones → heavy bones (up to 3×)
- **Bone curve** (`boneCurve`)
    - swept to the base ← straight out → swept to the tip
- **Bone spread** (`boneSpread`)
    - short ribs → reach the margin
- **Petal outline** (`boneOutline`)
    - _(no helper text)_

#### Edge

- **Edge** (`tipStyle`)
    - _(no helper text)_
- **Tip shape** (`tip`)
    - round → pointed tip [tip-styles=clean]
    - round → pointed — apex & teeth [tip-styles=jagged]
    - soft sine → tight gathered crest [tip-styles=ruffled]
- **Tip fineness** (`tipFineness`)
    - sharpens a POINTED tip further, relative to how narrow the petal already is
- **Tip frequency** (`tipFrequency`)
    - total tips — 1 = apex only [tip-styles=jagged]
    - ruffle waves — fine control low, caps at the densest [tip-styles=ruffled]
- **Tip region** (`tipRegion`)
    - how far teeth reach from the apex down [tip-styles=jagged]
- **Tip length** (`tipLength`)
    - how far all tips extend outward [tip-styles=jagged]
    - ruffle depth — how far the edge folds in/out [tip-styles=ruffled]
- **Tip irregularity** (`tipIrregularity`)
    - regular → organic, varied
- **Scallop count** (`scallopCount`)
    - few, wide scallops → many, narrow
- **Scallop height** (`scallopHeight`)
    - shallow → deep bulge
- **Edge noise** (`edgeNoise`)
    - organic micro-crinkle (crepe paper), layered on top of any tip style
- **Edge noise scale** (`edgeNoiseScale`)
    - a few broad crinkles → dense fine crinkling

#### Base

- **Center type** (`centerArch`)
    - stamens & pistil (the original centre) [center-arch=classic]
    - peony: dense fine stamens around central carpels [center-arch=dense]
    - anemone: a domed disc ringed with short stamens [center-arch=disc]
    - ranunculus / mum: centre filled with tiny petals [center-arch=petaloid]
- **Classic style** (`centerType`)
    - spreading filaments tipped with anthers [center-styles=stamens]
    - upright bundle tipped with stigmas [center-styles=pistil]
    - bare centre — no stamens or pistil [center-styles=none]
- **Amount** (`centerCount`)
    - number of filaments
- **Length** (`centerLength`)
    - short → long
- **Filament thickness** (`centerFilThick`)
    - thin → thick filament
- **Tip size** (`centerTipSize`)
    - small → large anther / stigma
- **Tip shape** (`centerTipShape`)
    - round bead → oblong (lily) tip
- **Stamen count** (`denseStamenCount`)
    - many fine filaments packed densely
- **Stamen length** (`denseStamenLength`)
    - short → long filaments
- **Carpel count** (`carpelCount`)
    - central rounded carpels (few)
- **Carpel size** (`carpelSize`)
    - small → large carpels
- **Disc size** (`discSize`)
    - radius of the central dome
- **Disc height** (`discHeight`)
    - flat → domed
- **Ring stamen count** (`ringStamenCount`)
    - short stamens ringing the dome edge
- **Ring stamen length** (`ringStamenLength`)
    - short → long
- **Fill petal count** (`fillPetalCount`)
    - tiny petals packed into the centre
- **Outer fill size** (`fillOuterSize`)
    - size at the outer edge (near the real petals)
- **Inner fill size** (`fillInnerSize`)
    - size at the very centre — petals taper outer → inner
- **Fill density** (`fillDensity`)
    - loosely spaced → fully overlapping
- **Fill bloom angle** (`fillBloomAngle`)
    - closed bud (ranunculus) → fully open (mum)
- **Continuous margin** (`continuousMargin`)
    - the edge as two strands rooted at the foot, and the receptacle rebuilt as ONE implicit surface (SDF) those strands gather into — petal, receptacle and stem read as one continuous piece
- **Bundle tightness** (`bundleTightness`)
    - how close the strands stay to the axis at the foot — a loose splay → a tight neck
- **Flare rate** (`flareRate`)
    - how fast they open onto the edge as they rise — a slow spread → a quick flare
- **Absorption** (`absorption`)
    - how much the gathered strands melt into one mass — low keeps them as distinct traces, high fuses them into a solid receptacle (the blend radius of the field)
- **Neck swell** (`buttonSize`)
    - how much the neck widens at the arrival zone to receive the strands — zero is a straight taper (~4× a strand), higher swells the shoulder the strands emerge from
- **Gather height** (`gatherHeight`)
    - how far below the feet the button forms before the trunk descends — small keeps it up under the bloom, large drops it toward the stem
- **Receptacle** (`receptacleType`)
    - the junction node that joins the petal & sepal feet, the center bundle and the stem into one printable body
- **Profile** (`receptProfile`)
    - the silhouette — flared trumpet, round dome, straight taper, waisted urn, or a subtle solid swell (with continuous margin on, this becomes a radius multiplier along the receptacle's height)
- **Construction** (`receptConstruction`)
    - how it is built — a continuous surface, open scrollwork ribs, or a solid core with ribs outside — for the legacy receptacle only; with continuous margin on this is superseded by ABSORPTION (solid → fused, cored → looser)
- **Collar** (`receptCollar`)
    - an optional ring where the node meets the stem — none, a raised band, or a stepped ferrule sleeve (with continuous margin on, added as a radius bump in the field)
- **Reach** (`receptReach`)
    - feeds the junction the outer whorl only → the inner whorls' feet too (multi-layer blooms; no effect on a single layer)
- **Blend smoothness** (`blendSmoothness`)
    - hugs each base tightly → flows smoothly between them
- **Receptacle depth** (`receptacleDepth`)
    - how far the surface descends before the stem
- **Convergence tightness** (`convergenceTightness`)
    - how sharply it narrows into the stem
- **Solidity** (`receptSolidity`)
    - open and airy between the ribs → filled in toward a solid surface
- **Rib multiplier** (`ribMultiplier`)
    - ribs per foot — one each → several bundled together
- **Rib tightness** (`spiralTightness`)
    - diagonal scroll → tight coil (rotations down to the stem)
- **Rib thickness** (`spiralThickness`)
    - rib thickness of the scrollwork
- **Bulb size** (`bulbSize`)
    - how far the bead swells beyond the stem
- **Bulb height** (`bulbHeight`)
    - flattened disc → tall round knob
- **Sepals** (`sepalsType`)
    - a ring of small leaves cupping the base, matching the petals
- **Sepal size** (`sepalSize`)
    - small → large
- **Sepal count** (`sepalCount`)
    - number of sepals in the whorl
- **Sepal style** (`sepalStyle`)
    - narrow modified leaf → solid soft-edged leaves
- **Sepal center curve** (`sepalCenterCurve`)
    - reflex down → arc up (spine)
- **Sepal edge curve — top-down** (`sepalEdgeCurve`)
    - pinched → billowed (plan view)
- **Sepal edge curve — profile** (`sepalEdgeProfile`)
    - edges dip → lift (parallel to centre curve)
- **Sepal tip style** (`sepalTipStyle`)
    - smooth edge → serrated teeth (modified-leaf sepals)
- **Sepal tip shape** (`sepalTipShape`)
    - round → pointed — apex & teeth
- **Sepal tip frequency** (`sepalTipFreq`)
    - total tips — 1 = apex only
- **Sepal tip region** (`sepalTipRegion`)
    - how far teeth reach from the apex down
- **Sepal tip length** (`sepalTipLength`)
    - how far all teeth extend outward
- **Stem** (`stemType`)
    - a slender stem descending from the base — the view zooms out to fit it
- **Stem length** (`stemLength`)
    - short → long
- **Stem curve** (`stemCurve`)
    - straight → gently bent
- **Stem thickness** (`stemThickness`)
    - slender → thick
- **Leaf nodes** (`stemNodeCount`)
    - junction points along the stem — leaves attach here in a later pass
- **Node prominence** (`stemNodeProminence`)
    - smooth → swollen, gently kinked nodes
- **Side bud** (`stemBudMode`)
    - an offshoot stem carrying a smaller bud of the same bloom
- **Leaves** (`leafType`)
    - a leaf at each stem node — solid blades reusing the petal shape
- **Leaf arrangement** (`leafPhyllotaxy`)
    - how leaves sit around the stem: 1 zigzag · 2 across · 3 whorled
- **Leaf size** (`leafSize`)
    - small → large

#### Make

- **Size** (`heightMM`)
    - largest dimension of the print
- **Process** (`process`)
    - sets the smallest printable feature (SLS 1.0 · SLA 0.4 · FDM 0.8 mm)
- **Tube thickness** (`tube`)
    - _(no helper text)_

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

---

## Rulings

This session reported; it did not fix, rename, delete, or reorganise. The following
decisions were made by Eva on the findings above and are recorded here so none of them
gets re-litigated by a future session starting cold. Not built here — this is the
decision record, not the implementation.

1. **Delete `boneOutline`.** The one control confirmed dead under every tested
   configuration, including isolated under its own gating context.
2. **Receptacle controls are not deleted.** `receptacleType`, `stemCurve`, and `tube` get
   unhidden into Advanced — the decorative receptacle rework is separate future work,
   not blocked on this audit.
3. **Tier becomes an input to expected visibility, never a filter on what is checked.**
   The gate-scope finding (`verify-tier-visibility.mjs` never asserting Standard-mode
   control visibility because `shouldBeVisibleInAdvanced` excludes anything
   `tier==='standard'` by construction) is the reason this ruling exists.
4. **Every hiding condition becomes a registry declaration.** No more mechanism 4
   (undeclared bespoke JS controlling visibility) — `updateEdgeAmount()`,
   `updateDivergenceOptions()`, and the `LEGACY_RECEPT` force-hide all get expressed as
   registry fields, not one-off imperative code.
5. **Two effect-precondition declarations, not one:** `enabledWhen` for value dependency
   (a sibling slider below a threshold), `activeUnder` for mode dependency (a different
   code branch entirely). Collapsing them into one field would misrepresent the
   mode-dependent cases (`thickTaper`/`thickEdge` under infill type).
6. **Value-dependent controls get gated on the choice that enables them, not defaulted
   on.** Claw and cleft sliders do not appear until a clawed or lobed petal shape is
   chosen — Lace's pattern (one visible choice, sub-panels gated per choice), which is
   why Lace is the section that already works.
7. **Progressive disclosure absorbs `updateEdgeAmount()`** rather than landing beside it
   as a fifth, parallel mechanism.
8. **Form and Base restructure toward Lace's shape**, with empty slots designed in for
   sepals and base ornament from the start — not reorganised twice.
9. **Preset authoring comes after the restructure**, not before — a UI authoring flow
   built against a control layout that's about to change would need redoing.

Ten decisions; this document's job is done. Closing.


