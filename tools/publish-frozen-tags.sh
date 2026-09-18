#!/bin/bash
# ===================================================================
# publish-frozen-tags.sh — pin every frozen baseline's base commit to a
# PERMANENT ref, so a branch delete or a force-push to main can never orphan
# one again.
#
# WHY THIS EXISTS (session 17, Sep 5). `bloom-frozen-matrices` went red at
# `fatal: invalid reference: 4f39118` — phase10's base. Of the entries in
# FROZEN_BASE_COMMITS, phase10's is the only one that is not a commit on
# `main`: it is a mid-PR commit of #140, reachable only while that PR's
# BRANCH existed. The branch was deleted and the object went with it.
# `main` is not a protected branch here either, so a force-push would orphan
# every other base the same way. N implicit dependencies on branch
# reachability become N explicit permanent refs.
#
# THE SHA STAYS THE ONE OWNER. The list is read from the harness's own
# FROZEN_BASE_COMMITS, never restated here — a second copy of that map is the
# registration-rule violation this project keeps catching, and the charter
# already records the same trap firing four times on diff-bloom-bytes.mjs's
# phase-name lists. The tag exists ONLY to keep the object alive; which commit
# a baseline is frozen at is still the harness's answer, so --verify-frozen
# needs no change (actions/checkout@v4 at fetch-depth: 0 fetches tags, so the
# existing `git worktree add "$sha"` resolves unchanged).
#
# ===================================================================
# WHAT WENT WRONG FOR TWO WEEKS, AND WHAT THIS SCRIPT NOW DOES ABOUT IT
# ===================================================================
# Nine dispatches of `bloom-frozen-tags` between Sep 5 and Sep 18 all showed a
# red X, and that was read as "the workflow has never worked". IT HAD. Run 9
# (35295784427, Sep 18) CREATED TWELVE TAGS — frozen/phase21 and
# frozen/phase24..phase34 — and the remote carries 30 of the 33 declared
# baselines today. What the red X actually meant is that THREE refs cannot be
# created by this credential at all:
#
#   ! [remote rejected] frozen/phase5  (refusing to allow a GitHub App to create
#       or update workflow `.github/workflows/bloom-frozen-matrices.yml` ...)
#   ! [remote rejected] frozen/phase22 (... `bloom-export-watertight.yml` ...)
#   ! [remote rejected] frozen/phase23 (... `bloom-export-watertight.yml` ...)
#
# GitHub refuses to let a GitHub App token — which includes a workflow's own
# GITHUB_TOKEN — push a ref that it judges to create or update a file under
# `.github/workflows`. **GITHUB_TOKEN CANNOT BE GRANTED `workflows` SCOPE AT
# ALL**, so no `permissions:` block fixes it; `contents: write` is already set
# and was never the problem. This is a PERMANENT property of the credential,
# not a transient failure — phase5 has been rejected identically in all nine
# runs, starting with the very first one on Sep 5.
#
# SO THE DEFECT WAS THE VERDICT, NOT THE PUBLISHING. The old script treated a
# known-unpublishable ref as a run failure, so a run that correctly published
# everything it could still exited 1, every time, forever — and nine red X's
# trained everyone to believe nothing had worked. A permanently-red gate says
# nothing when it is red and cannot say anything when it goes green.
#
# THE REMEDY IS THIS PROJECT'S OWN XFAIL IDIOM (SELF_INTERSECTION_XFAIL,
# EXPORT_REFUSED_XFAIL, the flower connectedness gate's `xfail: <issue>`): the
# refs this credential provably cannot create are DECLARED BY NAME with their
# reason, the run fails on any UNDECLARED absence, and a declared entry that
# starts publishing is reported loudly as stale so the entry comes off.
#
# WHAT WAS *NOT* DETERMINED, said plainly rather than guessed at: which refs
# GitHub picks. Measured against run 9 and ruled out — it is not "the commit is
# unreachable from main" (all 33 are on main's first-parent line), not "the
# workflow files differ from main's" (phase21 and phase22 have IDENTICAL
# difference sets against main and one was accepted while the other was
# rejected), and not "the blob is already carried by an existing tag"
# (phase24's bloom-export-watertight.yml blob is carried by no other ref and
# was accepted). The predicate is GitHub-internal. What matters here is that it
# is a property of the TOKEN CLASS, it is stable, and it is not configurable.
#
# DO NOT ADD A PAT WITH `workflow` SCOPE AS A REPO SECRET (Eva, Sep 5). THE
# REMEDY FOR THE UNDERLYING RISK IS BRANCH PROTECTION ON `main`. The risk a
# frozen/* tag defends against is an orphaned base commit, and the only thing
# that can orphan a commit in main's history is a force-push; `main` is not
# protected here, and that is the actual hole. Protecting it closes the risk
# for every base that is a commit in main's history — which, measured, is all
# of them except phase10. A standing credential that can rewrite any workflow
# in the repo, forever, to defend three belt-and-braces tags, is the wrong
# trade. THE ASYMMETRY: phase10's base was NEVER on main, so no protection of
# main could reach it and its tag is the ONLY thing keeping it alive. That is
# the load-bearing one, and it publishes fine — it is on the remote today.
#
# THE REFS-API FALLBACK IS AN OPEN QUESTION BEING ANSWERED, NOT A FIX BEING
# RELIED ON. `POST /repos/:owner/:repo/git/refs` points a ref at a commit that
# already exists: it sends no pack, no tree and no blob, so it may well not
# trip the receive-pack workflow check at all. CLAUDE.md has carried this as
# "untested and unreachable from a session" since Sep 5 — a runner can simply
# try it. It runs ONLY for refs the push could not create, it prints whatever
# the API says verbatim, and it can never fail the run. Whichever way it comes
# out, the next dispatch settles it.
#
# RUN IT FROM A CLONE THAT CAN PUSH TAGS. Session 17 created these tags and
# could not publish them: the agent proxy returns HTTP 403 on a tag ref push,
# both as `--tags` and as a single explicit refspec, while ordinary branch
# pushes from the same session succeed. That is an environment limit, not a
# repository one. (Session 41 later refuted the WORKFLOW-DIVERGENCE story for
# that 403 — it failed in a case that reading exempts — so expect the push to
# fail from a session and do not engineer around any particular mechanism.)
#
# USAGE
#   bash tools/publish-frozen-tags.sh              # tag, push, verify
#   bash tools/publish-frozen-tags.sh --check      # verify the remote ONLY;
#                                                  # creates nothing, pushes
#                                                  # nothing, same verdict
#   bash tools/publish-frozen-tags.sh --self-test  # must-fail controls
# ===================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# ------------------------------------------------------------------
# THE DECLARED EXCEPTIONS. A ref listed here is one GITHUB_TOKEN is refused
# permission to create, with the workflow file GitHub named in its refusal.
# Absence of one of these is reported and does NOT fail the run; absence of
# anything else DOES. An entry that starts publishing is reported as stale and
# must come off in the same commit that observes it.
#
# Measured on run 35295784427 (Sep 18) and, for phase5, on run 33968233654
# (Sep 5) — the first and the ninth, rejecting the same ref for the same
# reason.
# ------------------------------------------------------------------
declare -A TAG_PUSH_XFAIL=(
  [phase5]='GITHUB_TOKEN refused: .github/workflows/bloom-frozen-matrices.yml (rejected on every run since Sep 5)'
  [phase22]='GITHUB_TOKEN refused: .github/workflows/bloom-export-watertight.yml'
  [phase23]='GITHUB_TOKEN refused: .github/workflows/bloom-export-watertight.yml'
)

CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --self-test) exec bash tools/publish-frozen-tags-selftest.sh ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# A base commit that lives only in a deleted branch's history is recovered
# through refs/pull/<N>/head, which is PERMANENT on GitHub. Note the head ref
# need not BE the commit: fetching a ref brings its whole history, and
# 4f39118 sits six commits back from #140's head (which is 2ea3e19, because
# that PR kept committing after the freeze).
echo "fetching PR head refs that carry an otherwise-unreachable base…"
git fetch --quiet origin refs/pull/140/head || true

PAIRS=$(node -e "import('./tools/bloom-harness.mjs').then(h=>console.log(Object.entries(h.FROZEN_BASE_COMMITS).map(([k,v])=>k+':'+v).join(' ')))")
declare -a NAMES=() SHAS=()
for pair in $PAIRS; do NAMES+=("${pair%%:*}"); SHAS+=("${pair##*:}"); done
echo "${#NAMES[@]} frozen baselines declared by the harness."
echo

# ------------------------------------------------------------------
# Resolve every base and create the local tags. NEVER tag something that
# merely resolves, and never quietly tag all-but-one: an unresolvable base is
# the state this whole exercise is about, and it must be loud.
# ------------------------------------------------------------------
declare -a FULL=()
missing=0
for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"; sha="${SHAS[$i]}"
  if full=$(git rev-parse --verify --quiet "$sha^{commit}"); then
    FULL+=("$full")
    if [ "$CHECK_ONLY" -eq 0 ]; then
      git tag -f "frozen/$name" "$full" >/dev/null
      printf '  frozen/%-8s -> %s\n' "$name" "${full:0:12}"
    fi
  else
    FULL+=("")
    printf '  frozen/%-8s -> UNRESOLVABLE (%s) — find its PR and fetch refs/pull/<N>/head\n' "$name" "$sha"
    missing=1
  fi
done
[ "$missing" -eq 0 ] || { echo "REFUSING to push a partial set — resolve the base(s) above first."; exit 1; }

# ------------------------------------------------------------------
# Push EXPLICIT REFSPECS rather than `--tags`. `--tags` pushes every local tag
# the clone happens to hold; this pushes exactly the declared set and nothing
# else. A push is NOT atomic — refs are accepted or rejected individually, and
# `--atomic` was considered and rejected because it would have made the first
# run publish NOTHING, including frozen/phase10, the one tag the whole exercise
# existed to create. A partial set that is fully NAMED is more useful than no
# set at all; a partial set that is silent is the defect.
# ------------------------------------------------------------------
if [ "$CHECK_ONLY" -eq 0 ]; then
  declare -a REFSPECS=()
  for name in "${NAMES[@]}"; do REFSPECS+=("refs/tags/frozen/$name:refs/tags/frozen/$name"); done
  echo
  echo "pushing ${#REFSPECS[@]} refspecs…"
  git push origin "${REFSPECS[@]}" || echo "  (the push reported a failure — the verification below decides)"
fi

# ------------------------------------------------------------------
# VERIFY THE OUTCOME, NOT THE MECHANISM'S OWN SUCCESS. The published set is
# read back from the REMOTE. Checking the push's exit code alone would have
# said "failed" while thirty tags existed; checking nothing would have said
# "done" while three did not.
#
# AND IT CHECKS IDENTITY, NOT JUST EXISTENCE. The old verification grepped for
# the tag NAME, so a tag left pointing at a SUPERSEDED commit — which is
# exactly what happens if a FROZEN_BASE_COMMITS sha is ever corrected, because
# git refuses to move an existing tag on the remote — read back as "published"
# and the baseline would have been pinned to the wrong object in silence.
# ------------------------------------------------------------------
echo
echo "verifying against the remote…"
remote_refs=$(git ls-remote --tags origin 'refs/tags/frozen/*' | sed 's/\^{}$//' | awk '{print $2" "$1}' | sort -u)
lookup() { printf '%s\n' "$remote_refs" | awk -v r="refs/tags/frozen/$1" '$1==r{print $2; exit}'; }

undeclared_missing=0; wrong_commit=0; stale_xfail=0; ok=0; declared_missing=0
declare -a RETRY_NAMES=() RETRY_SHAS=()
for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"; want="${FULL[$i]}"; got=$(lookup "$name")
  if [ -z "$got" ]; then
    if [ -n "${TAG_PUSH_XFAIL[$name]+x}" ]; then
      printf '  frozen/%-8s MISSING — declared: %s\n' "$name" "${TAG_PUSH_XFAIL[$name]}"
      declared_missing=$((declared_missing + 1))
    else
      printf '  frozen/%-8s **NOT PUBLISHED** and NOT declared\n' "$name"
      undeclared_missing=$((undeclared_missing + 1))
    fi
    RETRY_NAMES+=("$name"); RETRY_SHAS+=("$want")
  elif [ "$got" != "$want" ]; then
    printf '  frozen/%-8s **WRONG COMMIT** — remote %s, declared %s\n' "$name" "${got:0:12}" "${want:0:12}"
    wrong_commit=$((wrong_commit + 1))
  elif [ -n "${TAG_PUSH_XFAIL[$name]+x}" ]; then
    printf '  frozen/%-8s published %s  <-- STALE EXCEPTION\n' "$name" "${got:0:12}"
    stale_xfail=$((stale_xfail + 1)); ok=$((ok + 1))
  else
    printf '  frozen/%-8s published %s\n' "$name" "${got:0:12}"
    ok=$((ok + 1))
  fi
done

# ------------------------------------------------------------------
# THE REFS-API FALLBACK. Only for refs that are still absent, only when a token
# is in the environment, and it can never fail the run — it exists to ANSWER
# the open question in CLAUDE.md, in writing, on the next dispatch.
# ------------------------------------------------------------------
if [ "$CHECK_ONLY" -eq 0 ] && [ "${#RETRY_NAMES[@]}" -gt 0 ] && [ -n "${GH_TOKEN:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  echo
  echo "the git push could not create ${#RETRY_NAMES[@]} ref(s); trying the git/refs API, which sends no tree…"
  echo "  (this is CLAUDE.md's untested route. Whatever it says below is the answer to it.)"
  for j in "${!RETRY_NAMES[@]}"; do
    name="${RETRY_NAMES[$j]}"; sha="${RETRY_SHAS[$j]}"
    # stderr is left to the job log on purpose; only the status code is captured.
    code=$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' -X POST \
      -H "Authorization: Bearer ${GH_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "${GITHUB_API_URL:-https://api.github.com}/repos/${GITHUB_REPOSITORY}/git/refs" \
      -d "{\"ref\":\"refs/tags/frozen/${name}\",\"sha\":\"${sha}\"}") || code="request failed"
    printf '  frozen/%-8s git/refs POST -> %s\n' "$name" "${code:-no response}"
  done
  echo "  re-reading the remote…"
  for j in "${!RETRY_NAMES[@]}"; do
    name="${RETRY_NAMES[$j]}"
    if git ls-remote --tags origin "refs/tags/frozen/$name" | grep -q .; then
      printf '  frozen/%-8s NOW PRESENT — the API route works; remove its TAG_PUSH_XFAIL entry\n' "$name"
    else
      printf '  frozen/%-8s still absent — the API route is refused too\n' "$name"
    fi
  done
fi

# ------------------------------------------------------------------
# THE VERDICT
# ------------------------------------------------------------------
echo
printf '%d declared · %d published and correct · %d missing but declared · %d missing and UNDECLARED · %d at the WRONG commit\n' \
  "${#NAMES[@]}" "$ok" "$declared_missing" "$undeclared_missing" "$wrong_commit"

if [ "$stale_xfail" -ne 0 ]; then
  echo
  echo "STALE EXCEPTION: $stale_xfail ref(s) marked unpublishable are now on the remote."
  echo "Remove their TAG_PUSH_XFAIL entries in this script, in the commit that observes it."
  echo "A list nobody trims stops being a record and becomes an excuse."
fi

if [ "$undeclared_missing" -ne 0 ] || [ "$wrong_commit" -ne 0 ]; then
  echo
  echo "FAILED. A baseline is pinned by nothing, or is pinned to the wrong object."
  echo
  echo "If the reason is the GitHub App workflow-scope refusal — the push will have"
  echo "printed it verbatim above, naming a file under .github/workflows — then that"
  echo "ref cannot be created by this credential and no permissions: block changes it."
  echo "Add it to TAG_PUSH_XFAIL with the file GitHub named, or publish it from a"
  echo "clone whose credentials are a USER's:  git push origin refs/tags/frozen/<name>"
  echo
  echo "If the reason is anything else, it is a real failure and wants diagnosing."
  exit 1
fi

echo
echo "done — every frozen baseline this credential can pin has a permanent ref."
[ "$declared_missing" -eq 0 ] || echo "($declared_missing declared exception(s) remain unpublishable; each is named above.)"
