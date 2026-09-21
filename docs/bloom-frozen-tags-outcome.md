# `bloom-frozen-tags`: the workflow was publishing all along, and only its verdict was wrong

Merged as `06e4173` (#253). No geometry, no controls, no gate assertion, threshold or
row definition touched. `FROZEN_BASE_COMMITS` is unchanged and remains the one owner.

**§3b was added after the first dispatch of the merged workflow.** Run 10 failed, and it
failed in the self-test #253 added rather than in the verdict #253 fixed — read §3b before
concluding anything from that red X, which is the same instruction §1 exists to give.

The session was opened on the premise that `bloom-frozen-tags` had never created a tag in
nine dispatches, and that the fourteen refs `frozen/phase21`..`frozen/phase34` were all
missing. **The premise was false**, and establishing that is most of what this session
produced. What follows is written as findings rather than as notes, because two of the
three are about how the mistake survived for two weeks rather than about the script.

---

## §1 FINDING — THE WORKFLOW HAS BEEN PUBLISHING CORRECTLY SINCE SEP 5. ONLY ITS VERDICT WAS WRONG.

**Every one of the nine runs did the job it was dispatched to do, and then failed itself.**

* **Run 1** (`33968233654`, Sep 5) declared twelve baselines, **created eleven**, and was
  refused one — `frozen/phase5`. At that time the script had no verification block at all,
  so `git push` failing under `set -e` aborted the step. Red X, eleven tags created.
* **Run 9** (`35295784427`, Sep 18) declared thirty-three, **created twelve** —
  `frozen/phase21` and `frozen/phase24`..`frozen/phase34`, i.e. twelve of the fourteen the
  brief said had never been created — and was refused three. Its own verification then read
  the remote back correctly, found three absent, and exited 1. Red X, twelve tags created.

The job dies at its **last** step, inside `tools/publish-frozen-tags.sh`, at the
verification loop's `exit 1`. Not checkout, not `setup-node`, not `npm install`, and **not
`permissions:`** — `contents: write` has been declared since session 17 and was never the
cause. The push before it *partly succeeds*, and its non-zero exit is deliberately swallowed
by `|| echo` so that the verification, not the exit code, decides.

### §1a The three refusals, and why no `permissions:` block reaches them

```
! [remote rejected] frozen/phase5  (refusing to allow a GitHub App to create or update
    workflow `.github/workflows/bloom-frozen-matrices.yml` without `workflows` permission)
! [remote rejected] frozen/phase22 (... `.github/workflows/bloom-export-watertight.yml` ...)
! [remote rejected] frozen/phase23 (... `.github/workflows/bloom-export-watertight.yml` ...)
```

GitHub refuses a GitHub App token — which a workflow's own `GITHUB_TOKEN` is — a ref it
judges to create or update a file under `.github/workflows`. **`GITHUB_TOKEN` cannot be
granted `workflows` scope at all**, so raising the job's permissions is not an option that
exists. This is a permanent property of the credential, not a transient failure: `phase5`
has been rejected identically on every run since the first.

**So the defect was the verdict, not the publishing.** The script treated a
known-unpublishable ref as a run failure, so a run that correctly published everything it
could still exited 1 — every time, forever. A permanently-red gate says nothing when it is
red and cannot say anything when it goes green. This is the same shape as #220's
`672/672`: the instrument was reporting something true and useless while the thing anyone
cared about went unread.

### §1b WHICH refs GitHub picks was NOT determined, and the ruled-out list is the useful part

Three hypotheses were measured and all three are refuted. They are recorded because each is
the obvious answer and each is wrong:

| hypothesis | verdict |
|---|---|
| the tagged commit is unreachable from `main` | **refuted, and backwards.** Of the 33 bases, 32 are on main's own first-parent line — *including all three that were rejected*. The single base that genuinely is **not** on `main` at all is `phase10` (`4f39118`, a mid-PR commit of #140 recovered through `refs/pull/140/head`), and it **published without complaint**. |
| its `.github/workflows` files differ from main's | **refuted.** `phase21` and `phase22` have *identical* difference sets against main — the same four files, all `M` — and one was accepted while the other was rejected. |
| the blob is already carried by an existing tag | **refuted.** `phase24`'s `bloom-export-watertight.yml` blob (`e48cb97f`) is carried by no other ref, and it was accepted. |

The predicate is GitHub-internal. What matters for this repository is that it is a property
of the **token class**, it is stable across fourteen days and nine runs, and it is not
configurable. **Do not re-derive these three.** A future session that wants the remaining
three refs has exactly two routes: a push from a clone whose credentials are a *user's*, or
the `git/refs` API (see §4).

> **Correction to #253's own text.** The merged PR body and commit message say *"all 33
> bases are on main's first-parent line"*. That is one row loose: it is 32, and `phase10`
> is the exception. The corrected statement is **stronger**, not weaker — the one base that
> is genuinely unreachable from `main` is the one that published, which is what kills the
> reachability hypothesis outright rather than merely failing to support it.

---

## §2 FINDING — THIRTY OF THIRTY-THREE BASELINES WERE ALREADY ON THE REMOTE, AND NOBODY RAN `git ls-remote --tags`

This is the finding with the longest reach, because it is not about this workflow.

`CLAUDE.md` asserted, in two separate places and for two weeks, that *"the remote carries
phase2..phase20 only (phase5 absent), so PHASES 21 THROUGH 29 ARE ALL UNPUBLISHED — nine
sessions' worth"*. **The remote carried thirty of the thirty-three declared baselines**, and
had done since Sep 18 at 01:33. The three absent are `phase5`, `phase22` and `phase23`.

Measured two ways, which agree: `git ls-remote --tags origin 'refs/tags/frozen/*'`, and the
GitHub tag API. Every one identity-checked against `FROZEN_BASE_COMMITS`; none is at the
wrong commit.

**The state was one command away and the command was never run.** What was captured instead
was the *exit code* of the mechanism, nine times, and a story was built on it — including a
separate, true, and entirely unrelated fact (that a session gets HTTP 403 pushing a tag),
which made the false conclusion feel corroborated. The two facts never touched: the 403 is
about a session's proxy, and the red X is about the runner's token.

**THE RULE THIS PRODUCES, and it is this file's own `672/672` lesson arriving through a
different door: a mechanism's exit code is not its outcome. Read the outcome.** For this
workflow the outcome is a ref listing; for a gate it is the row census; for a byte partition
it is the mover/holder counts. When a mechanism reports failure, ask what it nevertheless
accomplished before concluding it accomplished nothing — a non-atomic operation that is
*designed* to report a partial result is precisely the case where the exit code is least
informative.

It is now cheap to check without dispatching anything: `bash tools/publish-frozen-tags.sh
--check` reads the remote, identity-checks every declared baseline and publishes nothing,
and the workflow exposes it as the `check_only` input.

---

## §3 FINDING — THE ANNOTATED-TAG WITNESS PASSED ON BROKEN CODE, AND IT IS A FOURTH INSTANCE FOR THE REGISTER

The new verification checks a tag's **identity**, not just its name. Re-reading that diff
against its own claim — not from any failure — surfaced a latent defect in it, and then the
test written to prove the fix turned out to prove nothing.

**The defect.** `git ls-remote --tags` reports an *annotated* tag on two lines carrying
**different** shas: the tag object, and the commit it points at, suffixed `^{}`. The first
cut of the lookup stripped the suffix and ran both lines through `sort -u`, then took the
first match — so **which sha it returned depended on which one sorted lower**. A coin flip
per tag, reporting a correctly-placed annotated tag as being at the `WRONG COMMIT` about
half the time. Every tag this script creates is lightweight so it does not bite today; the
script's own failure message tells a user to push one by hand from their own clone, which is
one `git tag -a` away from it.

**The witness that was not one.** Case H of the self-test built an annotated tag at the
correct commit and asserted the commit was read back. Run against a copy of the script with
the pre-fix lookup restored, **it passed** — because that run's tag object happened to sort
*after* the commit, so the broken code returned the right answer by luck. The clause was
correct, in scope, strict-looking, and empty.

**The remedy is an adversarial fixture.** Case H now searches tag messages until it finds a
tag object whose sha sorts **before** the commit's, which makes the pre-fix lookup return
the tag object deterministically. Re-run against the same mutant, it now fails exactly the
three assertions that name the behaviour, where it had failed none. Two smaller corrections
came out of the same pass and are the same family: `ls-remote` with an *exact* pattern does
not match `...phase30^{}` and returns one line, so the check that the remote "really reports
two lines" was asking the wrong question; and the case now asserts the two shas actually
disagree, so it cannot pass vacuously.

### §3a What this adds to the fifth durable rule

This is a **fourth instance** of *a clause that cannot fail*, and it is worth recording
because it reaches the same end by a different route and is caught by a different
instrument.

The three instances already in the register (the band's invisibility clause, ST9's guard,
both STL gates' headlines) are failures of **definition**: the clause carved out a subject
that the failure was never in. Here the subject was *right* — "a correctly-placed annotated
tag" is exactly the thing to doubt — and what excluded the failure was the **instance chosen
to stand for it**. A fixture that is 50/50 makes a must-fail control a coin flip, and a
coin flip that lands the friendly way is indistinguishable from a passing test.

**That difference decides what finds it.** The register says all three were found by
re-reading the diff against the clause, *"which is the only thing that finds them, because a
green run, a mutant table and CI are all instruments that ask the clause its own question"*.
That holds for the definition family and **not** for this one: here the mutation lands
squarely *inside* the clause's subject, so the mutant table can see it — and the mutant
table is exactly what did. The rule splits:

* **subject wrongly defined** → no mutant can reach it; only re-reading the diff finds it.
* **subject right, instance non-adversarial** → the mutant reaches it, *provided the mutant
  is actually run and its result read*. Running it is what separates the two, and running it
  costs seconds.

**THE TEST TO ADD, beside the register's own:** having stated the clause's subject as a set
and confirmed the failure is in it, ask whether the **particular instance** you built to
represent that set is the *hardest* member or a random one. If a different random draw would
have made the broken code pass, the fixture is the clause.

---

## §3b FINDING — THE HARDENED FIXTURE COULD NOT BE BUILT ON A RUNNER, AND IT REPORTED THAT AS BAD LUCK

Run 10 (`35299447040`, dispatched from `main` at `09e2aca`, which carries #253) failed in
37 s. **It is not a recurrence of §1: the verification loop never ran.** The `publish` job
has four steps and it died on the third — `bash tools/publish-frozen-tags-selftest.sh`,
40 passed / 3 failed — so `publish-frozen-tags.sh` was never invoked, nothing was pushed,
and no verdict about the remote was produced at all. All three failures were §3's own
hardened Case H.

**The mechanism.** `git tag -a` writes a tag OBJECT, which carries a tagger line, so git
refuses to make one without a name and an email. A GitHub runner has neither: nothing in
this workflow sets `user.name` / `user.email`, and git's auto-detection fails on a runner
hostname. The adversarial search suppressed that stderr (`>/dev/null 2>&1`) and read only
the sha, so all 200 attempts created nothing, `git rev-parse` returned the literal string
`frozen/phase30` 200 times — the 200 `fatal: ambiguous argument` lines that fill the log —
and `[ "frozen/phase30" \< "41d7a87…" ]` is false, so the loop fell out reporting
**"could not build an adversarial tag object in 200 tries; this case would be luck"**.

**A fixture that cannot be built is not a fixture that was unlucky, and the message named
the wrong one.** The search is a coin flip per attempt, so genuine bad luck is 2⁻²⁰⁰; the
observed state was an environment in which the case could not be attempted at all. The two
are distinguished now: git failing is an unbuildable fixture and aborts with
`FIXTURE UNAVAILABLE` and git's own words, the way `setup_remote` already aborts on an
unfetchable `phase10` base; 200 honest tries losing is the astronomically improbable thing
the old message described.

**WHY IT SURVIVED EVERY LOCAL RUN, WHICH IS THE DURABLE HALF.** A clone does not copy the
source repo's LOCAL config, so `$WORK` resolves whatever GLOBAL config exists — an identity
on a dev box, nothing on a runner. So the self-test passed on every machine it was written
on and failed on the only machine it had to run on, **on identical code**. This is
`calibration is not coverage` in a harness rather than in an instrument: the fixture's
buildability was a property of the environment, and the environment was never varied.
Measured both ways rather than argued — the pre-fix file, run locally with only the `[user]`
section stripped from the global config, reproduces run 10 exactly at **40 passed, 3 failed,
exit 1**; the fixed file under the same condition reads **46 passed, 0 failed, exit 0**.

**The fix is in the SCRIPT, not the workflow**, and that is deliberate as well as smaller:
`.github/workflows/bloom-frozen-tags.yml` is the file category GitHub's own refusal is
about, so a fix that edits it would change the very input whose effect on the refused set
is unexplained (§5). The identity is supplied per command — a self-test that mutates the
machine's git identity is a worse thing than the bug it fixes — through `TAGGER` and one
owner, `annotate()`, which reports whether git could and never decides what that means.

**Case I is its must-fail control, and the guard needed one**, because the guard is
unreachable on any machine that has a git identity — which is every machine this file was
ever run on before it reached a runner. It reproduces the runner's condition deterministically
(`GIT_CONFIG_GLOBAL` and `GIT_CONFIG_SYSTEM` neutralised, in a subshell, because in bash a
`VAR=x func` assignment PERSISTS after the call) and requires the two halves to answer
differently: with no identity git must refuse and create nothing, with the fixture's own
identity it must succeed. The guard itself was then mutated — `TAGGER` neutered — and
required to abort: **exit 2, `FIXTURE UNAVAILABLE`, git's real reason, 0 occurrences of
"luck" and 0 of the 200 retry spins.**

**AND THE REMOTE WAS VERIFIED DIRECTLY, WHICH IS WHAT ANSWERS §1's OPEN QUESTIONS.**
`bash tools/publish-frozen-tags.sh --check` against the real remote, from a full clone:

```
33 declared · 30 published and correct · 3 missing but declared · 0 missing and UNDECLARED · 0 at the WRONG commit
done — every frozen baseline this credential can pin has a permanent ref.
```

exit 0. So: **no baseline is mis-pinned** (`0 at the WRONG commit` — the identity check §1
added, run against the real remote, finds nothing), **the refused set has not moved** (the
three still missing are exactly the three declared, `0 missing and UNDECLARED`), and §2's
count of thirty is corroborated by a second route — `git fetch --tags` into this clone
brings down 30 `frozen/*` refs. **The verification loop #253 shipped is correct; run 10
simply never reached it.**

**AND THE GUARD FOR THE DISPATCH ONLY RUNS DURING THE DISPATCH — NAMED, NOT PATCHED.**
`grep -l publish-frozen-tags-selftest .github/workflows/*.yml` returns exactly one file,
`bloom-frozen-tags.yml`, which is `workflow_dispatch`-only. So **no CI check on a pull
request exercises this self-test at all**, and a break in it is discovered only by spending
one of Eva's dispatches — which is what run 10 was. The two `verify` jobs that do run on a
PR touching this file are the FLOWER gates, pulled in by their `'tools/**'` path filter;
they test flower geometry and are not evidence about anything here. That is this
repository's own recorded corollary ("two green `verify` jobs on a print PR are not evidence
that anything about `/print` was checked") landing on the frozen-tags tooling.

It is left as it is. Wiring the self-test into a PR gate would catch this class one dispatch
earlier and is a real option, but it is a new gate with its own network precondition (it
fetches `refs/pull/140/head`) and is Eva's to rule on, not a session's to add while fixing
something else. What closes the immediate gap instead is that the failure mode is now
reproducible off the runner: stripping the `[user]` section from the global git config
reproduces run 10 exactly, so the next change to this file can be tested against a runner's
condition without spending a dispatch to find out.

**What #253's own workflow edit does to the refused set is still unmeasured**, and `--check`
cannot measure it because it pushes nothing. Note what bounds the question, though: git
refuses to move an existing tag, so the 30 already published are a no-op on any future
dispatch and **the only refs a next run can attempt are the three declared ones.** Either
they publish — in which case the run says `NOW PRESENT`, calls the entries stale, and still
exits 0 — or they do not, in which case they are declared and it exits 0. The set cannot
become undeclared without a new baseline being registered.

---

## §4 What shipped

* **`TAG_PUSH_XFAIL`** in `tools/publish-frozen-tags.sh` declares the three unpublishable
  refs by name with the workflow file GitHub named in its refusal. An **undeclared** absence
  still fails the run; a declared entry that starts publishing is called out as **stale** and
  must come off. This repository's own xfail idiom (`SELF_INTERSECTION_XFAIL`,
  `EXPORT_REFUSED_XFAIL`, the flower connectedness gate's `xfail: <issue>`), applied to a
  credential instead of to geometry.
* **Identity, not existence.** The old verification grepped for the tag *name*, so a tag left
  pointing at a superseded commit — what happens whenever a `FROZEN_BASE_COMMITS` sha is
  corrected, since git will not move an existing remote tag — read back as `published`. Now
  a hard failure, and annotated tags are dereferenced (§3).
* **Explicit refspecs** replace `git push origin --tags`, which pushed whatever tags the
  clone happened to hold.
* **`--check`** verifies and publishes nothing; the workflow's `check_only` input exposes it.
* **A `git/refs` API fallback**, for refs the push could not create and only those. That POST
  points a ref at a commit that already exists — no pack, no tree, no blob — so it may not
  trip the receive-pack check at all. `CLAUDE.md` has carried this route as *"untested and
  unreachable from a session"* since Sep 5; a runner can simply try it. It prints whatever
  the API answers and **cannot fail the run**, so the next dispatch settles the question
  either way. If it works, the three declared entries come off the list.

### §4a The proof, and why it needed a fixture at all

`tools/publish-frozen-tags-selftest.sh` drives the **real** script against a local remote
whose `update` hook reproduces GitHub's refusal text verbatim. An **`update`** hook and not
`pre-receive`, and that distinction is the whole point: GitHub rejects **per ref** and the
other refs still land, which is the script's central claim — a `pre-receive` hook would
reject the batch and that claim would never be exercised.

**43 assertions over eight cases.** Counted exactly, because #253's body and commit message
say *"five of them must-fail"* and that is loose:

* **Three cases require the script to exit 1** — an undeclared ref goes missing; a tag sits at
  the wrong commit (and the case separately proves a name-only check would have passed it);
  `--check` against a remote holding nothing.
* **Five require it to exit 0** under conditions where a weaker script would fail or mislead —
  the real-world partial set; a real second push over a populated remote (idempotency); a
  declared exception that starts publishing (`STALE EXCEPTION`, exit 0 because publishing more
  is not a failure); an unreachable API (the fallback can never fail a good run); a
  correctly-placed annotated tag (§3).
* **Plus one mutation control**, outside the eight: the pre-fix lookup restored in a throwaway
  copy, which case H must fail and does — three assertions red, where before the fixture was
  made adversarial it was zero.

11 seconds, so it gates every dispatch before anything is pushed.

Against the real remote:

```
33 declared · 30 published and correct · 3 missing but declared · 0 missing and UNDECLARED · 0 at the WRONG commit
done — every frozen baseline this credential can pin has a permanent ref.
exit 0
```

### §4b The two questions the brief asked in passing

* **Does it pick up all fourteen registered phases, or only some?** **All 33**, phase21–34
  among them. It reads `FROZEN_BASE_COMMITS` from the harness rather than restating it, so
  it cannot drift, and the harness throws at module load if `FROZEN_MATRICES` and
  `FROZEN_BASE_COMMITS` disagree in either direction. Run 9's log lists every one of the 33.
* **Is it idempotent?** It was already *safe* to re-run — `git push` skips an up-to-date ref
  and `git tag -f` is idempotent — but it never went green, which is the same defect as §1.
  It is green on every subsequent run now, proved on a real second push against a populated
  remote (case B), with the remote unchanged.

---

## §5 What is NOT done, and is Eva's

**The dispatch.** `bloom-frozen-tags` is `workflow_dispatch`-only and a session cannot fire
it. The rule stands unchanged: a session registers the baseline in both maps, proves it with
`bloom-frozen-matrices`, and stops; the tag is published by one dispatch from `main` after
the merge, and that dispatch is Eva's.

**What to expect from it.** The first green run in the workflow's history, printing
`31 published and correct · 3 missing but declared`. (Written as 30 when this doc was
written at 33 declared; `frozen/phase35` was registered by #261 and has never reached a
dispatch, so it is the one ref a push can still attempt — the other 30 are no-ops, because
git will not move an existing tag. The two verbatim `--check` transcripts above are
measurements taken at 33 declared and are left as they were.) If the `git/refs` fallback works it will
say `NOW PRESENT — the API route works` for one or more of `phase5` / `phase22` / `phase23`,
and those entries should come off `TAG_PUSH_XFAIL` in the commit that observes it. If it does
not, it will say `still absent — the API route is refused too`, which closes a question this
repository has carried as open since Sep 5.

**The underlying risk is still branch protection, not tags.** A `frozen/*` tag defends
against an orphaned base commit; the only thing that can orphan a commit in main's history is
a force-push, and `main` is not protected here. Protecting it closes the risk for 32 of the
33 bases outright. `phase10` is the asymmetry — never on `main`, so no protection reaches it,
and its tag is the only thing keeping it alive. It is published. **Do not add a PAT with
`workflow` scope as a repo secret** (Eva, Sep 5); a standing credential that can rewrite any
workflow in the repo, forever, to defend three belt-and-braces tags is the wrong trade.
