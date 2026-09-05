#!/bin/bash
# ===================================================================
# publish-frozen-tags.sh — pin every frozen baseline's base commit to a
# PERMANENT ref, so a branch delete or a force-push to main can never orphan
# one again.
#
# WHY THIS EXISTS (session 17, Sep 5). `bloom-frozen-matrices` went red at
# `fatal: invalid reference: 4f39118` — phase10's base. Of the twelve entries
# in FROZEN_BASE_COMMITS, phase10's is the only one that is not a commit on
# `main`: it is a mid-PR commit of #140, reachable only while that PR's
# BRANCH existed. The branch was deleted and the object went with it.
# `main` is not a protected branch here either, so a force-push would orphan
# every other base the same way. Twelve implicit dependencies on branch
# reachability become twelve explicit permanent refs.
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
# RUN IT FROM A CLONE THAT CAN PUSH TAGS. Session 17 created these tags and
# could not publish them: the agent proxy returns HTTP 403 on a tag ref push,
# both as `--tags` and as a single explicit refspec, while ordinary branch
# pushes from the same session succeed. That is an environment limit, not a
# repository one.
# ===================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# A base commit that lives only in a deleted branch's history is recovered
# through refs/pull/<N>/head, which is PERMANENT on GitHub. Note the head ref
# need not BE the commit: fetching a ref brings its whole history, and
# 4f39118 sits six commits back from #140's head (which is 2ea3e19, because
# that PR kept committing after the freeze).
echo "fetching PR head refs that carry an otherwise-unreachable base…"
git fetch --quiet origin refs/pull/140/head || true

PAIRS=$(node -e "import('./tools/bloom-harness.mjs').then(h=>console.log(Object.entries(h.FROZEN_BASE_COMMITS).map(([k,v])=>k+':'+v).join(' ')))")

missing=0
for pair in $PAIRS; do
  name="${pair%%:*}"; sha="${pair##*:}"
  if full=$(git rev-parse --verify --quiet "$sha^{commit}"); then
    git tag -f "frozen/$name" "$full" >/dev/null
    printf '  frozen/%-8s -> %s\n' "$name" "${full:0:12}"
  else
    # NEVER tag something that merely resolves, and never quietly tag eleven
    # of twelve: an unresolvable base is the state this whole exercise is
    # about, and it must be loud.
    printf '  frozen/%-8s -> UNRESOLVABLE (%s) — find its PR and fetch refs/pull/<N>/head\n' "$name" "$sha"
    missing=1
  fi
done
[ "$missing" -eq 0 ] || { echo "REFUSING to push a partial set — resolve the base(s) above first."; exit 1; }

git push origin --tags
echo "done — every frozen baseline now has a permanent ref."
