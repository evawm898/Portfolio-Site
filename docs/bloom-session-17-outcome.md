# Session 17 — the smoke subset, and three things this session got wrong and corrected

The job was to make iteration cheap **without touching what certifies the work**. That
constraint held: the whole change is additions only, and the thirteen files that decide
pass or fail are byte-identical to their state at `2cd3e14`.

The corrections are recorded at the same weight as the deliverables, because two of them
reverse claims this session itself had already written down, and the third is a defect in
something this session built and reported as ready.

---

## What shipped

**`tools/bloom-smoke.mjs`** — 28 of 499 matrix rows through the real export gate's own
`--only` flag. **Derived, not picked**: the branches actually present in
`bloom-geometry.js` crossed with the assertion families that need a witness; cheapest row
per path; preferring pinned / GATED / named corners over blanket-sweep rows; **rejecting
any row over ~15 s unless nothing cheaper carries the path**. That last rule did real
work — it excluded `DOME: the INCURVE TARGET x rise 0.5` (50.2 s) and
`DOME LEAN: EVA_CONFIG x rise 1` (80.5 s), and kept the 14.4 s FLAT incurve row, which is
one of only two rows in the matrix that ASSERT plan coverage. The path → row mapping is a
`path` field on every entry: a subset nobody can audit is a subset nobody should trust.

The five things it is blind to are in the tool's own header, which is where a reader needs
them at the moment they read a green run.

**The drift guard**, in that module, at module load, with no escape hatch. Clause A: every
`/* N.` block marker in `buildMatrix()`'s source must have a smoke row — a new block fails
BY NAME. Clause B: each block declares its first row as an `anchor`; the guard resolves
them, requires them strictly increasing from row 0, derives each block's index range, and
requires every smoke row to fall INSIDE its own block's range. Four negative controls fire
and the restored tree is silent: a new block, a renamed row, a row attributed to the wrong
block, a stale anchor.

Deriving the row → block map from source text was **tried and is not sound** — labels are
template literals and short ones ("petalCount 3") match text inside other blocks. The
anchor scheme is what makes membership a measurement rather than a claim.

**`concurrency: cancel-in-progress`** on the four bloom workflows, keyed to
`${{ github.workflow }}-${{ github.ref }}` so it can never cancel across PRs.

**`tools/publish-frozen-tags.sh`** and **`.github/workflows/bloom-frozen-tags.yml`** — see
the phase10 section.

---

## Export gate only, and the argument has a stated expiry

Both STL gates run the same per-row assertion set. The export gate adds the edge census,
the degenerate count and plan coverage; the connectedness gate adds ONE thing the export
gate lacks: the voxel flood fill. Across sessions 7, 10, 11, B, 13, 14, 15 and 16 the
charter records that flood fill catching **nothing** — every positive control reads "1
piece". Re-measured on this head rather than inherited: session 14's P1 (hub ignores the
owner's dome) and P2 (feet lifted but horizontal) driven through the connectedness gate
over this subset read **21/21 ONE CONNECTED PIECE** on every row it measured, while J3 and
J1 respectively fired on the export gate.

**`--conn` is REQUIRED, not optional, when a session introduces a new geometry mode**
(Eva). The reason the flood fill catches nothing is that J1–J9 fire first — a fact about
modes whose junction assertions EXIST. A brand-new mode is exactly where they may not model
the failure, and the flood fill is the backstop for failures the assertions do not model.
Run it until the new mode's junction assertions are established AND shown to fire on a
mutant; then drop back.

---

## The mutant table — 9 of 9, and why that number is less impressive than it looks

Reconstructed from source; the originals were throwaway worktrees. Session 16's Mutant A
needed no reconstruction — `SPINE_WIRED` is still in `bloom-geometry.js` as its documented
red-then-green switch.

| mutant | edit | first family to fire | rows | wall |
|---|---|---|---|---|
| shipped tree (control) | — | **silent** | 0 of 28 | 83 s |
| S16-A spine keeps the arc | `SPINE_WIRED = false` | C1 | 2 | 81 s |
| S16-B start reaches the foot rows | `footS` × `(1 − curlStart)` | crowding R4 | 1 | 82 s |
| S16-C Euler integrator at row pitch | `N = NU`, forward Euler | C2 (+C1) | 6 | 89 s |
| S16-D no spine floor | `kMax = Infinity` | C3 | 1 | 83 s |
| S14-P1 hub ignores the owner's dome | `buildHubInto`: `dome = null` | J3 | 2 | 82 s |
| S14-P2 feet lifted but horizontal | `domeRows(0)` at `ring.z` | J1 | 2 | 79 s |
| S14-P3 blade not rotated with its foot | `Rs = R`, `Up = Z` | **C1, not J8** | 2 | 78 s |
| S15-Q1 domeLean computed, never summed | drop `+ ring.domeLean` | **C1, not J9** | 4 | 80 s |
| S15-Q2 domeLean at a wrong constant | `slope × 0.5` | J9 | 4 | 78 s |

**The hit rate is explained, not lucky.** All nine are caught by per-row families that run
on EVERY row, so the subset only has to reach one row in the affected region. That is a
structural property of this project's instruments, and it is why the subset's real blind
spots are elsewhere.

### A gate run names the FIRST family that fired, never the only witness

Both gates abandon a row at the first failing family, in the order form → curl → thickness
→ junction → zygo → export floor → crowding → coverage. So P3 and Q1 report **C1** rather
than the J8 and J9 their own sessions record: session 16's C1 reconstructs the whole spine —
including `petalTilt + tiltExtra + domeLean` — from other owners, and silently became a
SECOND witness for two mutations from earlier sessions.

**J8 and J9 do discriminate independently — measured, because the alternative would have
been a real finding.** With the curl family suppressed in a throwaway worktree and nothing
else changed, P3 fires **J8 alone** (4 times across the two domed smoke rows) and Q1 fires
**J9 alone** (twice), each with the message it was written for. So sessions 14 and 15 are
**imprecise, not wrong**, and neither assertion is being carried by C1.

**The working rule: establishing that a SPECIFIC assertion discriminates requires
suppressing the families ahead of it.** A red-then-green positive control proves a witness
EXISTS; it cannot name which one, and neither can any gate run.

---

## Runtimes, and the ratio this session withdrew

| run | rows | wall |
|---|---|---|
| smoke subset (shipped) | 28 | 133.7 / 131.5 / 137.1 s |
| 23-row draft, early | 23 | 85.2 / 83.0 / 85.0 s |
| 23-row draft, re-run late | 23 | 98.8 / 100.8 s |
| export gate, FULL | 499 | 2,621 s |
| connectedness gate, FULL | 499 | 2,600 s |

**The first ratio reported was 31× and it was wrong.** The 23 → 28-row gap (49 s) did not
reconcile with the five added rows' own timings (~30 s including five browser starts).
Rather than explain the arithmetic away, the 23-row set was **re-run in the later machine
state**: 99.8 s against 84.4 s earlier — **this box drifted about 17% slower across the
session**. The only pair measured in one state is 23-vs-28 (1.34×), which is what pins the
added rows at ~34 s. The full-gate numbers were taken in the FAST state and the shipped
subset in the SLOW one, so 2621/134 understates and 2621/113 overstates: **about 20× is the
honest floor.**

**AND "ABOUT 20x" IS A SINGLE-BOX FIGURE THAT WILL NOT REPRODUCE AGAINST CI NUMBERS.** The
same 499 rows that took **2,621 s locally took 4,162 s in CI** — a **59% cross-machine gap**,
on top of the 17% drift within one session on one machine. Anyone re-deriving the ratio from a
CI runtime will get a different answer, for a reason that has nothing whatever to do with the
smoke set: they will be dividing a CI numerator by a laptop denominator. **Both numbers in a
ratio must come from the same machine in the same session, or the ratio is about the
machines.** Divide CI by CI and the figure lands near 31x again — the same number this session
withdrew, arrived at by accident.

This is the session's own brief firing on the session that wrote it down. Runner variance is
not a measurement — on a laptop as much as on a CI runner, where the same workflow on two
heads of PR #149 measured 2,579 s and 4,170 s, a 62% spread.

The full export run also **reproduces session 16's close-out counts exactly on a different
machine**: 24 CROWDED, 372 coverage-measured / 127 labelled skips / 2 asserted, 56
SELF-CONTACT, 3 rows under one sheet thickness.

---

## The conventions, and what the duplication actually was

Six CI jobs run on a bloom PR and **two of them are FLOWER gates** —
`flower-export-watertight.yml` and `flower-geometry-quality.yml` are path-filtered on
`'tools/**'`. "Six verify jobs green" overstates the bloom evidence; it is four. The filter
is deliberately not changed — it belongs to the flower.

**CI certifies the merge commit, verified from this repo's own log** rather than assumed:
run 33927836353's checkout reads `git checkout --progress --force refs/remotes/pull/149/merge`
→ `HEAD is now at c1cfd5a Merge 848ae962… into 6b8e94b…`. A local run certifies the working
tree, which is neither that nor the head.

**Docs-only commits on a gated PR head cost 13,304 s across sessions 14 and 16** — two
commits touching one `docs/` file each, re-running both hour-long STL gates because
GitHub's `paths` filter on a `pull_request` event evaluates the WHOLE PR diff. Session 13
is worse and was outside the window examined: five charter-only commits, roughly another
13,500 s.

**The machinery was costed and declined.** `[skip ci]` leaves the head with no gate result.
`dorny/paths-filter` against `github.event.before` answers "did this push touch a gated
path", which is not the question. The rule that WOULD fail safe — skip only when the tree
hash of the gated paths equals that at a commit whose gate run concluded `success` — needs a
Checks-API lookup defaulting to RUN on any error. Real machinery guarding a repo where a
wrong skip merges ungated geometry. **A convention that works beats a filter that might skip
a gate.**

---

## phase10: red on `main`, recovered, and the rule it produced

`bloom-frozen-matrices` failed at `fatal: invalid reference: 4f39118`. **Of the twelve
entries in `FROZEN_BASE_COMMITS`** (`legacyMatrix()` declares none — it is twelve, not
thirteen) **phase10's is the only one that is not a commit on `main`**: a mid-PR commit of
#140, reachable only while that PR's branch existed. The branch was deleted; the object went
with it.

**Recovered, and a premise corrected on the way.** `refs/pull/<N>/head` is permanent, and
the obvious test fails here — #140 kept committing, so its head is `2ea3e19`. The conclusion
that would follow ("the head ref points elsewhere, so this does not recover it") is **FALSE**:
fetching a ref brings its HISTORY. `4f39118` is six commits back, and the commit immediately
after it is `805a191` (the all-petals group at one whorl) — exactly what phase10 is documented
as frozen BEFORE, so it is the right object and not one that merely resolves. **Proven:
`--verify-frozen --phase10` against a worktree of the recovered commit PASSES, 376 rows
deep-equal.**

**The rule** (charter): a frozen baseline is taken at a commit on `main`, never at a branch
head, and is tagged at freeze time. `tools/publish-frozen-tags.sh` pins all twelve, reading
`FROZEN_BASE_COMMITS` rather than restating it, recovering an unreachable base through its PR
head ref, and refusing to push a partial set — negative-controlled so it *discriminates*
(`phase2` resolves, a ghost entry is named, exit 1, no ghost tag, no push).

**The sha stays the sole owner** (Eva). Resolving by sha cannot resolve the wrong object;
resolving by name can — a tag someone moves would verify a different tree and report PASS, a
label naming a computation nobody performed. The tag keeps the object alive; it never says
which object. So `--verify-frozen` is unchanged, and the actionable message lives in the
workflow step instead.

**And `--verify-frozen` must never skip an unresolvable base.** That turns a lost proof into a
silent pass. Had recovery failed, the honest move was a labelled unverifiable tier plus a
correction to the claim that CI proves every baseline deep-equal on every push — never a quiet
green.

### frozen/phase5 cannot be published by any workflow — recorded, not fixed

Eleven of the twelve tags published on the first dispatch. The twelfth was rejected:

    ! [remote rejected] frozen/phase5 -> frozen/phase5 (refusing to allow a GitHub App to
      create or update workflow `.github/workflows/bloom-frozen-matrices.yml` without
      `workflows` permission)

**The mechanism, written down so nobody re-derives it.** GitHub refuses to let a GitHub App
token — and a workflow's own `GITHUB_TOKEN` is one — push a ref whose `.github/workflows`
content differs from the DEFAULT branch's. Tagging an older commit does exactly that whenever
a workflow file has changed since, which is why this bit `phase5` (base `deacded`) and not the
others. **`GITHUB_TOKEN` cannot be granted `workflow` scope at all**, so this is not a
`permissions:` block anyone forgot: raising the job's permissions is not an available move.
Publishing it needs credentials that are a user's rather than an App's: a plain
`git push origin refs/tags/frozen/phase5` from someone's own clone.

**THE REMEDY IS BRANCH PROTECTION ON `main`, NOT A PAT (Eva, Sep 5), and the distinction is
the point.** The risk a `frozen/*` tag defends against is an orphaned base commit, and the
only thing that can orphan a commit in `main`'s history is a force-push. `main` is not a
protected branch here — that is the actual hole. **Protecting it closes the risk for eleven
of the twelve bases outright**, because they ARE commits in `main`'s history and protection
is what keeps that history from being rewritten. Storing a PAT carrying `workflow` scope as
a repository secret would instead put a standing credential — one that can rewrite any
workflow in the repo, on any push, forever — in place to defend a single tag against a
hypothetical. **That is the wrong trade**, and it is worth naming so nobody reaches for it
as the obvious fix.

**THE ASYMMETRY IS WHY phase10's TAG IS LOAD-BEARING AND phase5's IS NOT.** Eleven bases sit
in `main`'s history, so branch protection covers them and their tags are belt-and-braces —
a second lock on a door protection already holds. **phase10's base was NEVER on `main`**: it
was a mid-PR commit whose only ref was a feature branch, so no protection of `main` could
ever have reached it, and its tag is the only thing keeping it alive. That is the tag that
had to publish, and it did. `frozen/phase5` missing is a belt-and-braces gap on a base that
branch protection would cover anyway.

**So the standing recommendation is: protect `main`.** Publish `frozen/phase5` from a user's
clone when convenient; do not create a repo secret for it.

**And it exposed a gap in the publishing script, now fixed.** `git push --tags` is not atomic:
refs are accepted or rejected individually, so the push reported failure while eleven tags had
landed. The script refused a partial set on unresolvable BASES but said nothing about a
partially rejected PUSH. It now reads the published set back from the remote and names every
tag that did not land. `--atomic` was considered and rejected: it would have made that first
run publish nothing at all, `frozen/phase10` included. **A partial set that is fully named is
more useful than no set; a partial set that is silent is the defect** — which is this
session's own "verify the outcome, not the mechanism's own success", arriving a fourth time.

### The merge-red authorisation, scoped narrowly on purpose

This PR was merged with `bloom-frozen-matrices` red. **That was a one-time authorisation
(Eva), and it is not a general licence to merge red.** Every one of these held:

1. the failure **predates the PR** — run 77 failed on `main` at 03:02, before this PR existed;
2. it is **red on `main` already**, so merging cannot make `main` worse;
3. it has a **documented cause** — a specific unreachable object, diagnosed to the commit;
4. it is **not caused by anything in the changeset** — the diff touches neither the frozen
   loop, the base-commit list, nor `tools/diff-bloom-bytes.mjs`;
5. **merging is the only route to the fix**, because the repair workflow is not dispatchable
   until it is on the default branch.

A future session citing this precedent must be able to state all five. Fewer than five is a
different situation.

---

## The three things this session got wrong

Recorded together, because the pattern is the same each time: a claim was made, and the
thing that caught it was checking the outcome rather than the mechanism.

1. **"31× faster."** Withdrawn to ~20× after the arithmetic refused to reconcile and the
   23-row set was re-run in the current machine state. Caught by not explaining away a 19 s
   discrepancy.
2. **"phase10 is permanently unverifiable, the tree is gone."** Written in a PR comment as
   established fact. False — the object was six commits back from a permanent ref. Caught by
   trying the recovery instead of reasoning about it.
3. **"Dispatch `bloom-frozen-tags` and it will publish the tags."** The file parsed, the YAML
   validated, the job was correct, and **the route could not be reached**: a
   `workflow_dispatch` workflow is only dispatchable once its file is on the DEFAULT branch,
   so on a PR branch it did not appear in the Actions UI at all. Caught by
   `git ls-remote --tags origin` returning zero — checking the OUTCOME, not the mechanism's
   own success. This is "shipped means reachable" arriving in CI configuration.

All three were corrected in the artifact — the charter, `CLAUDE.md`, the tool headers and the
PR — rather than footnoted.

---

## Acceptance

The untouched-file list was **predeclared before a byte was written** and verified at close:
`bloom-geometry.js`, `bloom.js`, `bloom-registry.js`, `bloom.html`, `bloom.css`,
`tools/bloom-harness.mjs`, both STL gates, `tools/verify-bloom-panel.mjs`,
`tools/bloom-crowding.mjs`, `tools/bloom-plan-coverage.mjs`, `tools/chromium-harness.mjs`,
`tools/diff-bloom-bytes.mjs` — the gates' full transitive import graph plus the app.

- **All 13 byte-identical** to `2cd3e14` (`sha1sum -c`).
- **`buildMatrix()` deep-equal** head vs `origin/main`, 499 rows both sides.
- **All 14 matrices deep-equal** (legacy + phase2…phase13).

So "the full matrix produces identical results, every row, 0 moved" is not a claim about
behaviour: the builder and every input to it is byte-identical, so it cannot produce anything
else. That is why the cheap acceptance argument was available at all, and it is why nothing in
this session was allowed to touch those files — including the actionable failure message,
which went into the workflow step rather than into `diff-bloom-bytes.mjs`.
