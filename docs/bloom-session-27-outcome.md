# The panel structure for the tip controls, session 27 (tip plan 3a) — the nesting bound lifted, the family list derived, the generator deferred

Session 24 ruled the parametric tip in eight parts and sized it at four sessions. Session 26
was the second: the primitive and the migration, zero new controls. This is **3a of the
third — structure only. No controls, no geometry, no sheet.**

**What ships:** the two-level nesting bound is gone from `verifySections()` and is replaced by
the ordering check the app was silently leaning on; the smoke gate's hand-written "families
that need a witness" sentences are read out of the assertions instead; `tools/verify-bloom-
presentation-only.mjs` turns "0 moved" into a construction that can be re-run; and the
generated descriptor table is **deferred to 3b**, with the reason recorded below.

**0 moved, and it is proved rather than asserted** — 15 predeclared files byte-identical
(`bloom-geometry.js` first), all 528 matrix rows deep-equal, every registry datum deep-equal
with functions compared as source, 1,734 read-out values identical. **No frozen phase is
owed:** no row was added and no row definition moved, so `frozen/phase17` is still the newest
baseline and session 24's note is still the only "these bytes no longer reproduce" entry.

---

## 1. The nesting bound — lifted, and the prompt's cost estimate was mostly right

The brief said the real cost was "the refusal plus an audit of the gate's census, not a
rewrite — confirm or refute that." **Confirmed for the census; refuted in three specific
places.** Everything below was re-read from source on this head rather than inherited from
the session-24 discovery, which predates two merges.

### What was re-verified, and held

| the discovery said | source, this head |
|---|---|
| `applyVisibility()` walks SECTIONS backwards | `bloom.js:272` — `for (let i = SECTIONS.length - 1; i >= 0; i--)`. HOLDS |
| `childrenOf` is a map | `bloom.js:266` — a `Map` built in one pass. HOLDS |
| `ancestorsOf` in the panel gate is a while loop | `verify-bloom-panel.mjs` — `let p = parentOf.get(id); while (p) {…}`. HOLDS |
| a child is declared immediately after its parent | HOLDS as a CONVENTION — and see below, it was checked by nothing |

Two more that nobody had written down, and that are the reason the census needed no change:

- **The census is depth-general already.** It compares `root.querySelectorAll('details')` —
  document order, which is a pre-order walk of the tree at any depth — against the `SECTIONS`
  array joined in order. Those are equal exactly when SECTIONS is authored as a pre-order
  traversal, which is the declaration convention. Nothing in it counts levels.
- **`wantSectionHidden()` is depth-general.** It reads each child's OWN answer out of the DOM
  rather than re-deriving it, so "hidden iff every control and every child section is hidden"
  composes upward one level at a time, for as many levels as exist.

### What the refusal's stated reason turned out to be

> *both are written for one level, so a grandchild would be a structure the instruments do not
> describe.*

**That was true of two expressions, and neither of them was in the census.**

1. `verify-bloom-panel.mjs`'s witness-through-a-child test was `x.parent === s.id` — a DIRECT
   child. A container whose only content is another container has no direct child holding a
   control, so the check would have refused its only honest witness. Now `descends()`, which
   reduces to the old expression at depth ≤ 2.
2. The on-screen filter was `!d.hidden && !d.parentElement.closest('details')?.hidden` — ONE
   ancestor. `hidden` is set per element, and a descendant of a hidden section is not itself
   hidden, so at three levels a drop-down inside a shown parent inside a HIDDEN grandparent
   read as on screen. Now `!d.closest('details[hidden]')`, which is both clauses at once at
   any depth.

Both generalisations are **pinned to the answers they replace on this tree**: the on-screen
walk is compared against the one-ancestor expression on every section in all 22 states route
(d) drives, and must agree. Measured: 22 states, 0 disagreements.

### And the part that refutes the estimate — a check was OWED, not just a refusal removed

`verifySections()` **never checked that a parent is declared before its child.** Every
instrument named above is correct exactly when it is: the backwards walk settles children
first only if children come later, and `bloom.js`'s generator appends into
`sectionEls[s.parent]`, which must already exist. That was a convention stated in three
comments and enforced by none of them — and `bloom.js` said so explicitly:

> *SECTIONS is authored parents-first and verifySections() has thrown at module load if a
> parent is missing or is itself nested, **so there is no ordering to get wrong here***

The two cited facts were true; the conclusion did not follow. A child declared before its
parent **passed `verifySections()` and threw in `bloom.js`** on `sectionEls[s.parent]` being
undefined. This is the project's own label-naming-a-computation-nobody-performed defect, in a
comment, pointing at the function that was supposed to perform it.

So the refusal is replaced by the precedence check, which is **strictly stronger than what it
replaces**: it also makes a parent cycle and a self-parent unreachable, both of which the old
depth clause caught only by accident and only at two levels.

### What carries the claim

Route **(s)**, new, in the panel gate. It hands `verifySections()` section arrays whose answer
is written down: three levels must be ACCEPTED; a child-before-parent array, a two-section
cycle, a self-parent and a missing parent must each be REFUSED. **Four must-fails that run on
every invocation, not only under `--negative-control`** — so the route carries its own positive
control, which matters here because the live tree is two levels and a wrong answer about depth
3 is unobservable on it. Route (a) additionally compares the tree AS BUILT (each section's
actual ancestor element and its count of enclosing `<details>`) against the tree as declared —
a nested drop-down appended into the wrong ancestor is invisible to the order comparison and
visible to this one.

**Measured:** the shipped panel is 2 levels deep — 8 top-level sections, 13 nested, max DOM
depth 1. Every depth-3 claim is on a written-down array and says so in its own message.

**And one duplicate fell out of it.** The accordion route built its own `parentOf` map and its
own ancestor while-loop, identical to route (s)'s — two computations of one relation, in the
file that asserts the registration rule. `ancestry` is declared once now and `ancestorsOf`
reads it.

### The one thing a third level does not have, stated rather than hidden

`bl-sec--sub` in `bloom.js` is **"nested at all", not "nested at depth k"**, so a grandchild
would render with a child's indent. That is one rule in `bloom.css` and it belongs to whoever
first declares a third level, rather than being written now for a level nothing reaches.

---

## 2. The generated descriptor table — DEFERRED to 3b, and the mechanism is not new

The brief: *"seven descriptors authored once, instanced twice with an antherTip / stigmaTip
prefix, so the two tips cannot drift. A generator with no instances is untested code. Say how
you prove it works in this session … and if there is no honest way to prove it without the
controls existing, say so and defer."*

**Deferred, on three findings.**

**(a) The mechanism already ships, and is exercised by 36 controls.** `bloom-registry.js`'s
per-petal block (session 11) is exactly the shape Q7 asks for: a local `row(suffix, extra)`
closure spreading the shared fields, instanced from one ceiling. **Measured on this head: 4
descriptors × 9 instances = 36 controls and 9 generated sections, and every suffix has exactly
ONE distinct spec across its nine instances.** A second generator built in 3a would be a
second owner of one pattern — the registration failure this project has cleaned up twice —
with zero instances to run on.

**(b) "Instanced TWICE" is not reachable in 3b either.** The session-24 sizing is: session 3
the anther's seven controls, session 4 the stigma's. So 3b has ONE instance and session 4 adds
the second. The property the ruling names — *so the two tips cannot drift* — is not observable
until session 4, whoever builds the table. Building it in 3a would put two sessions between
the mechanism and its first test.

**(c) There is no honest pair to migrate through it.** The two candidates were examined.
`labellum*` / `hood*` are 5 against 3, not a parallel pair. `all*` / `inner*` are a genuine
2 × 3 — but they share only bounds, step, default, tier and role, while label, `fmt` and
`visibleWhen` are all per-instance, so a generator over them would carry more override than
shared and would exercise a WEAKER version of the mechanism than the tip needs (where the
labels and formats are the same on both tips). Restructuring shipped registry rows to
demonstrate a generator that fits them less well is not a proof, it is a risk.

**What 3a ships instead**, because it does have an instance to run on today: a panel-gate
clause asserting that **instanced descriptor families share one spec** — every instance of a
suffix agreeing on kind, bounds, step, default, label, tier and role, with `fmt`, `section` and
`visibleWhen` deliberately NOT compared because they are per-instance by design. The per-petal
groups exercise it now; 3b's table is one row in `INSTANCED_FAMILIES`. Adding a family that
matches nothing is a FAILURE, not a skip.

**For 3b:** the precedent is `bloom-registry.js`'s per-petal block, not a new abstraction.
Copy its shape, add one row to `INSTANCED_FAMILIES`, and note that the drift-freedom of the
per-petal set is true by CONSTRUCTION and was unmeasured until this session.

---

## 3. The family list — derived, and it was short by FIVE, not two

The brief said blocks 23 and 24 name the families by hand and the list is "short by one on
each side, twice reported and twice patched by hand". **Confirmed, and it understates it.**

`tools/bloom-smoke.mjs` now reads the roster out of the assertion SITES —
`bad.push(\`J2: …\`)` and `tipClauses('JG5', …)`, session 26's shared tip clauses, which push
under a tag their caller names — and CLAUSE C checks a **biconditional** against what the
rows' `path` fields CLAIM:

- **C1** every family the harness asserts is claimed by some row.
- **C2** every family a row claims is one the harness has.

**On the day it was written it fired on five, by name:**

| | why nothing had it |
|---|---|
| **JS0** | block 23's sentence read `JS1-JS6` — short by one since the day JS0 shipped |
| **JG0** | block 24's read `JG1-JG5` — the same omission, patched by hand in the same sessions |
| **Z2** | a row's path read `Z1-Z3`, and **a range names its ends and hides its middle** |
| **J2** | containment — never cited anywhere |
| **C3** | the spine floor, both arms — never cited anywhere |

Three of the five had never been reported at all. The five citations added are honest ones on
rows that engage the path: J2's containment over six rings at `layerSize` 0.35 (where
`radius_L ≤ R0` is a consequence rather than an identity), C3's uniform arm on the closed-form
arc and its non-uniform arm on the bias row, Z2 spelled out of the range that hid it, and JS0
/ JG0 in their ABSENT arms on the two GATED rows.

**39 families, all 39 claimed.** The negative control renames `JS5` to `JS99` in a COPY of the
harness source and requires the census to name it in both directions at once — JS99 asserted
and claimed by nothing, JS5 claimed by 3 rows and asserted by nothing. It runs in CI.

### What the census does NOT cover, in its own header

- **The `R` namespace is out, by name, and that is correctness rather than scope.** R codes
  belong to `bloom-crowding.mjs`, `bloom-plan-coverage.mjs` and `bloom-solid-angle-coverage.mjs`
  and **all three own an R1**; the tag is qualified in the message (`crowding R1:`,
  `coverage R1:`, `solid R1:`) and the `path` fields cite a bare `R1`, which names no one
  instrument. Folding them in means qualifying every citation.
- **And `R0` in a `path` is usually not an assertion at all** — "Rd held above R0" is the
  dome's radius against ring zero's, the geometry's own notation in the same string. A claim
  scanner taking every `[A-Z]\d` token would demand a family for it. So claims are read only
  under a prefix the harness actually asserts.
- **Whether a row makes a family FIRE is still open, and is still hole 5.** Every family runs
  on every row, so citation is a claim about the PATH a row engages, never evidence the
  assertion can catch anything on it. Only the mutant table says that and it cannot be derived.
  **Re-run the mutant table when an assertion family is added.** Session 17's ruling stands;
  what session 3a found is the static half that DID exist.

---

## 4. 0 moved, by construction — `tools/verify-bloom-presentation-only.mjs`

A byte diff re-exports 528 rows through a browser to demonstrate that identical inputs give
identical outputs. The construction is stronger and cheaper, and it is this project's own rule:
*if the inputs to a computation are provably byte-identical, its outputs cannot differ.* So the
new tool proves the inputs, against a git worktree of the base commit (`3f7c5ab`):

```
ok  15 predeclared files byte-identical — bloom-geometry.js among them, so no geometry SOURCE moved
ok  buildMatrix(): all 528 rows of the FULL matrix deep-equal, in order
ok  bloom-registry.js: CONTROLS (87), SECTIONS (21), DEFAULTS, PREDICATES and RETIRED_IDS
    all deep-equal, every function compared as its own source
ok  every control's read-out: 1734 values evaluated across every slider range and every option
    — identical text on both trees
ok  every section summary, the derived one included, reads the same at DEFAULTS
```

Two things it is careful about. Functions are serialised to their **source**, because
`JSON.stringify` drops them silently and would have made the strongest-looking clause the
emptiest. And clause 4 **evaluates** every `fmt` rather than comparing its source, because a
function closing over a moved constant has identical source.

**Its own positive control:** run against `2fee2c2` (before session 26) it FAILS, naming
`bloom-geometry.js` and `tools/bloom-harness.mjs` — and passes clauses 2, 3 and 4, which is the
correct reading of session 26 (it moved geometry and the harness, and moved no matrix row, no
registry datum and no read-out).

**It is not a byte diff and never replaces one.** A session that moves bytes on purpose owes
`tools/diff-bloom-bytes.mjs` and a predeclared partition; this tool fails it at clause 1.

---

## The close

- **Frozen phase: NOT OWED.** No row added, no row definition moved — the session-18/19 and
  session-23 case, not the last three sessions'. `frozen/phase17` remains the newest baseline,
  and session 24 remains the only entry naming a tag whose bytes no longer reproduce.
- **No sheet is owed.** Zero controls added; the panel renders identically, and clause 4 above
  measures that at the level of the text every read-out prints.
- **Gates:** `verify-bloom-panel.mjs` PASS and `--negative-control` complete;
  `bloom-smoke.mjs --check --negative-control` PASS; `verify-bloom-presentation-only.mjs` PASS.
  Both STL gates and the frozen-matrix job run the full matrix in CI, which is the merge
  criterion; they were not duplicated locally because the construction above proves their
  inputs unchanged.
- **MERGED as `b021f1c` (PR #177), all six CI jobs green on `bacb232`** — and the count is
  reported with the caveat `CLAUDE.md` asks for: **four of the six are bloom**
  (`bloom-panel`, `bloom-export-watertight`, `bloom-connectedness`, `bloom-frozen-matrices`),
  and `flower-export-watertight` / `flower-geometry-quality` ran only because this PR touches
  `tools/**`. They test flower geometry; two green flower jobs are not evidence about the
  bloom.

| job | | |
|---|---|---|
| `bloom-export-watertight` | success | 73 min, the full 528-row matrix, boundary edges 0 |
| `bloom-connectedness` | success | 48 min, the voxel flood fill on all 528 rows |
| `bloom-panel` | success | 2 min — route (s) and the census's new nesting clauses among them |
| `bloom-frozen-matrices` | success | 30 s — the smoke coverage guard, the family census AND its negative control, and `--verify-frozen` on all sixteen baselines |
| `flower-export-watertight` | success | `tools/**` filter, not bloom evidence |
| `flower-geometry-quality` | success | `tools/**` filter, not bloom evidence |

  **A note on reading CI here, because it cost a wrong reading once in this session:**
  `actions_list`'s run-level `status` was STALE — it reported `bloom-connectedness` still
  in progress twenty minutes after that job had finished. `list_workflow_jobs` is both current
  and an order of magnitude leaner (the run-level payloads inline the whole commit message).
  Read the JOB, not the run.

## What the next session should know

- **3b is the anther's seven controls plus the generated table.** The precedent is the
  per-petal block in `bloom-registry.js`; add one row to `INSTANCED_FAMILIES` in the panel gate
  with it. "Instanced twice" only becomes true in session 4.
- **A third panel level is now legal and has no CSS.** One rule in `bloom.css`.
- **The family census will fail a new family by name.** Cite it in the `path` of the row that
  engages it, spelled out — never as a range.
- **B2b** (the crowding-raster extensions, anther-against-blade, the independent stamen splay)
  stays parked, unchanged since session 21.
