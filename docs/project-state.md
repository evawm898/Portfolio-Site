# Project State — a snapshot

*Written 2026-09-12, by reading the repository directly — git/GitHub history, source files,
and CI workflow definitions — rather than summarizing `CLAUDE.md`. Where the two disagreed,
the repo won; the disagreements found are called out inline. Three worth knowing up front:
`CLAUDE.md`'s bloom-composition notes say `MAX_INSTANCES` is 8, the live constant in
`plot.js` is 12; `CLAUDE.md` quotes several different, smaller `verify-plot.mjs` check/mutant
totals at different points in its own history (its session-by-session trail, not a live
count) — the file itself holds 233 checks / 93 mutants right now; and flower.js's public
"shared designs" gallery (a Netlify Function + Blobs, unauthenticated but rate-limited)
isn't mentioned anywhere in `CLAUDE.md` at all.*

## 1. What exists

The **published site** is small: `index.html` → `about.html`, `field-notes.html`, five case
studies. `field-notes.html` → eight articles. That's the entire live navigation, 16 pages.
**Three of the eight articles are literal "Coming Soon" stubs** (`defining-durability`,
`functional-fibers-e-textiles-wearables`, `yarn-characterization`); `quantifying-comfort` is
real with one unwritten gap; `about.html` is two lines. The rest are finished.

**Every generator and lab tool — bloom.html and plot.html included — is `noindex,nofollow`
and linked from nothing.** Real, working, just unlisted; URL-only.

| Page | Status | Notes |
|---|---|---|
| **bloom.html** | Active, most mature | Head-only 3D-printable flower generator. §3. |
| **plot.html** | Active, half-finished by design | Line-art viewer for bloom's grid export. §2. |
| **flower.html** | Finished, stable (untouched since Sep 8 while bloom/plot moved daily) | Full-plant generator (petals+receptacle+stem+leaves+STL). Most CI-guarded page here (7 workflows). Runs a public, unauthenticated (rate-limited, capped) "shared designs" gallery via a Netlify Function — real infrastructure, absent from CLAUDE.md. |
| **print.html** | Half-finished, explicitly staged | Poses a flower/bloom export, extracts line art + infill. No page title — reads as internal tooling. |
| **cards.html** | Finished | Card-deck builder; ships placeholder art so it works unconfigured. |
| **artist-tracker.html** | Finished, personal | Password-gated: "This page is just for me." |
| **shape-editor.html**, `dress.html`/`skirt.html` | Half-finished, explicitly | Dress-shell tool; its own HANDOFF.md: panel placement (Stage 4) is read-only, "not started," and a 2mm tolerance "has never been physically validated." `dress`/`skirt` just display artifacts a Python pipeline produces by hand; both READMEs: "outside the site's build path... runs manually." |
| **textile-gauge-reader.html** + backend | Finished V0 ("Experimental") | Only non-flower/bloom page with real CI (29 pytest files). Backend is a separate Render service; its CORS config is still a placeholder, so whether it's actually deployed is **unclear** from the repo. |
| `textile-stretch-simulator`, `conductive-trace-resistance`, `color-change` | Finished | Each has a manual verify tool whose own header says "nothing in CI covers this page." |
| `lab.html` | Working sandbox | Self-described: "not linked from the live site or any nav menu." |

*(This is a shallow clone grafted at Sep 6; git history is silent on anything older, so
staleness above is read from file mtimes/CI/in-file markers, not `git log`.)*

## 2. What `/plot` can do today

Load a bloom's grid `.glb` (or drop your own) — each load **adds** a bloom rather than
replacing one, up to 12 per composition. Scene-wide: which line families draw, density,
weight, screen/print polarity with matched glow, depth fog. Per bloom: an inferred stem
(there's no real stem geometry — it's the grid's own lines continued downward and bundled)
with droop/bend controls, positioned by sliders or by dragging an on-canvas anchor. Within a
bloom, one petal at a time can be picked and independently stretched/bent; warps persist per
petal and per bloom even when deselected. A rectangular/elliptical crop frame defines a PNG or
millimetre-accurate SVG export. The whole composition saves/loads as JSON, reporting rather
than silently dropping anything it can't restore.

**Confirmed absent** (grepped against current source): twist on petals, leaves, background
shapes, lock view, cut-and-pull, any infill/direction concept (`/plot` shares no code with
`/print`).

**Gate:** `verify-plot.mjs` — 233 checks, 93 mutants, counted directly from the file. Zero CI
(no workflow mentions "plot").

## 3. What the bloom generator can do today

106 controls across 24 sections (`CONTROLS.length`/`SECTIONS.length`, read by importing the
registry module directly), covering arrangement, petal outline, lobes/serration, margin
buckle, cup, roll, curl/twist, an optional androecium (stamens) and gynoecium (style +
trifid stigma), and a hub/head (flat cap, domed, or full sphere). Four placement modes:
RADIAL, SPIRAL, CONTINUOUS, FAN. Print-preview toggle and STL/glTF-grid export are both real
and wired (`STLExporter().parse()`, a real triangle-budget check, a real download) — not
stubs.

**`buildBloomInto(acc, state, { below, capability })` throws unless `below` is `null`**
(`bloom-geometry.js`): *"below='...' is phase-2+ work; only null is built today."* The
generator is **strictly head-only**, structurally — no stem, leaf, or receptacle attachment
exists anywhere in the build path, not just by default. `/plot`'s stem is inferred from the
grid's own lines precisely because the generator can't build one.

**Live, unresolved:** the shipped lobe/serration control (`lobeCount`, slider reads 2–10,
default 6) is nearly inert on main right now — the built count saturates at 2 regardless of
what's asked, because the lobed region ends at the apex cap and the apex law reserves rows
there. The open, currently-merging PR #217 addresses this with a new two-exponent cut law;
it does not touch the underlying constant (`LADDER_MAX_GAP_FACTOR`, §5) that also caps it.

## 4. Verification debt

32 files match `tools/verify-*.mjs`. No sweep was run (out of scope); every count below is a
static read of each file's own declared arrays/headers — exact where stated, "~N" where it's
a counted call-site total.

| Area | Checks | Mutants declared | In CI |
|---|---|---|---|
| Bloom core (export, connectedness, panel, grid) | not all statically fixed; grid=8 clauses | grid=7, others 0 or ad hoc | **yes**, all 4 |
| **`verify-bloom-apex-mutants.mjs`** (the one true bloom mutant table) | 14 witnesses / 8 rows | **14** | **no** |
| 8 bloom byte/refactor-proof gates | 2–6 clauses each | 0 (single perturbation each) | no (1 explicitly "by design") |
| Flower core (export, connectedness, junction, quality, tier-vis, registry-sync) | 114 / 41 / 3 / 4 / **10,956** / 46 | 0 (config-matrix style, not mutation) | **yes**, all 6 |
| `/plot` + `/print` family (plot, scaffold, tone, axis, fan, infill) | ~232/73/65/43/46/49 | **93/17/5/6/7/0 = 149 total** | **no**, none |
| `/cards` (fonts, svg-glyphs) | ~97/~12 | 0 (2 hand-run, documented in prose) | no |
| Field-note pages + tracker (color-change, stretch-sim, trace-sim, tracker-drawer) | ~38/36/31/**246** | 0 | no, "by design" |
| shape-editor impact check | data-dependent | 0 | no |

**Least covered, ranked:**
1. **The `/plot` + `/print` family** — 149 declared mutants across 5 files, **zero CI**, and
   every one of the five defaults to running **none** of its mutants unless a human also
   remembers an extra flag (`verify-plot.mjs` prints "(negative control not run...)" by
   default). `verify-plot.mjs` alone accounts for 93 of the 149.
2. **`verify-bloom-apex-mutants.mjs`** — 14 mutants, the sole positive-control proof that the
   bloom apex assertions can fire at all, never runs automatically; its own header calls
   re-running it an obligation, enforced by nothing.
3. **`verify-bloom-export.mjs`'s own `--negative-control`** — the gate *is* in CI, but CI only
   ever runs the plain form; the mode that proves its read-back validation can actually fail
   is never invoked automatically. (Its sibling connectedness gate also has an internal
   inconsistency — one comment says "158 rows," another a stale "622-row"/"621/621" figure.)

## 5. Known ceilings and unfixed problems

- **Nothing has ever been physically printed**, either generator (`docs/bloom-charter.md`,
  read directly): every thickness/min-feature/floor number, including the 1mm self-approach
  bar, is a declared guess. Independently true of `shape-editor` too ("never physically
  validated").
- Bloom's root-blend self-intersection (layerCount≥3) is partly fixed; two xfailed classes
  remain by name, and 15 rows got *worse* under the fix and are reported, not resolved.
- `LADDER_MAX_GAP_FACTOR = 1.4` caps lobe/serration count at 2 on main; its own justification
  was shown false; unresolved by the open PR.
- The self-approach gate varies one control at a time by construction — a two-control
  combination hazard (already measured to occur) is invisible to it; "recorded, not built."
- `/plot` at 8 blooms is ~3x over the 16.7ms frame budget on an ordinary slider edit; only the
  anchor-drag path was optimized to stay flat.
- `/print`'s line extraction assumes non-interleaved vertex buffers; an interleaved upload
  silently mis-reads geometry.
- CI-timing estimates in the docs have been wrong by ~2x, twice; the rule is "always re-read
  `actions_list`," and it keeps needing to be relearned.

## 6. Decisions standing without your ruling (most consequential first)

1. **`LADDER_MAX_GAP_FACTOR = 1.4`** — caps a shipped capability on a rationale already shown
   false. Flagged for you in session 39; nothing since. One constant, but the right value
   isn't known, and it also governs buckle spacing.
2. **`/plot`'s per-petal warp ranges** — you looked at these on the preview and said "I take
   that back," reopening rather than approving. Still unresolved.
3. **`/plot`'s multi-bloom defaults** (7 items: placement gap, scale-uniform-only,
   can't-remove-last-bloom, the instance cap [12, not the 8 CLAUDE.md's prose says], cursor
   reset, slider range, which panel describes what) — shipped "without a ruling," each a
   one-line undo.
4. **`/plot`'s anchor-drag feel** (drag plane, what selects a bloom) — the PR's own words:
   "for Eva's eye, not ruled."
5. **`/print`'s fan feature** — 8 shipped constants, merged off-by-default specifically to
   avoid deciding, never since turned on and reviewed.
6. **Bloom's centre ships empty** (no stamens/pistil by default) — safe, but "should it ship
   present" was explicitly left for you and nobody's revisited it.

## 7. What's open

**Alive:** #217 (bloom session 41, lobe-shape law) — a different, currently-running session
owns it, with your standing ruling to squash-merge once bloom CI is green. Not touched here.

**Dormant, yours to close or revive** — all `state=open`, zero activity in 12–24+ days, every
base 100+ commits behind main, each one's auto-watch long expired:

| PR | opened | what it is |
|---|---|---|
| #41 | Aug 21 | Flower code-quality fixes + wire gates into CI |
| #64 | Aug 23 | Flower control-panel audit (docs only) |
| #71 | Aug 24 | Flower proposal, Standard-tier adjustments |
| #78 | Aug 24 | One-line CLAUDE.md note about a trigger gotcha |
| #110 | Aug 30 | Flower position paper (write-up only) |
| #111 | Aug 31 | An early, likely-superseded bloomBase approach — predates the bloom charter by a day |

Twelve more `claude/*` branches exist with no open PR — likely merged-and-not-deleted, not
individually verified. **Unclear**, not guessed.

## 8. Honest next moves

1. **Print a coupon.** Every floor number in both generators is theory until one physical
   print exists — the standing recommendation for weeks. Low cost; unblocks the credibility of
   every thickness/gap claim in the project.
2. **Rule on the lobe/serration ceiling** (`LADDER_MAX_GAP_FACTOR` and #217's law together).
   A design call, not engineering; unblocks a shipped-but-broken control.
3. **Triage the six dormant PRs** — close what's superseded, say if anything should be
   revived. Minutes each; unblocks an accurate picture of open work.
4. **Wire the `/plot`+`/print` mutant family into CI**, or at minimum make `--negative-control`
   the default rather than opt-in — 149 mutants that silently never run is the single largest
   verification gap found here. Plumbing only, the tools exist.
5. **Build the self-approach combination gate.** The one-control-at-a-time matrix is
   structurally blind to compound hazards already known to occur. A session's worth of work;
   unblocks trusting the export gate on non-default combinations.
