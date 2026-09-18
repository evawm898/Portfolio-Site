#!/bin/bash
# ===================================================================
# publish-frozen-tags-selftest.sh — exercise publish-frozen-tags.sh against a
# LOCAL remote that reproduces GitHub's per-ref refusal, so the script's verdict
# is proved rather than argued.
#
# WHY THIS EXISTS. The workflow it belongs to is `workflow_dispatch`-only, takes
# ~25 s, and pushes permanent refs to the real repository — so "run it and see"
# costs a real tag and is not available to a session at all (the agent proxy
# returns 403 on a tag push). Nine red runs were mis-read for two weeks as "it
# has never worked" when it had in fact published thirty of thirty-three refs.
# A verdict nobody can exercise is a verdict nobody can trust.
#
# WHAT IT MODELS. GitHub rejects a workflow-touching ref PER REF, not per push —
# the other refs in the same push still land. That is an `update` hook, not a
# `pre-receive` one, and getting that distinction right is the whole point: a
# pre-receive hook would reject the batch and the script's central claim (a
# partial set, fully named) would never be exercised.
#
# The rejection text is GitHub's own, copied from run 35295784427.
# ===================================================================
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$(pwd)

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
FAKE="$TMP/origin.git"
WORK="$TMP/work"

pass=0; fail=0
ok()  { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }
check() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 — expected [$3], got [$2]"; fi; }
has()  { if grep -qF "$2" "$3"; then ok "$1"; else bad "$1 — not found: $2"; fi; }
hasnt(){ if grep -qF "$2" "$3"; then bad "$1 — present but should not be: $2"; else ok "$1"; fi; }

# ---- the fake remote -------------------------------------------------------
setup_remote() {
  rm -rf "$FAKE"
  git clone --bare --shared --quiet "$REPO" "$FAKE"
  git -C "$FAKE" for-each-ref --format='%(refname)' 'refs/tags/frozen/*' \
    | while read -r r; do git -C "$FAKE" update-ref -d "$r"; done
  # phase10's base lives only here, exactly as it does on GitHub. The fixture is
  # WORTHLESS without it: the script would refuse to push a partial set, exit 1,
  # and every expectation below would fail for a reason that has nothing to do
  # with the thing under test. So it is a hard precondition, not a best effort.
  if ! git -C "$REPO" rev-parse --verify --quiet refs/pull/140/head >/dev/null; then
    git -C "$REPO" fetch --quiet origin '+refs/pull/140/head:refs/pull/140/head' || {
      echo "FIXTURE UNAVAILABLE: refs/pull/140/head could not be fetched, so phase10's"
      echo "base is unresolvable and this test would measure its own setup."
      exit 2
    }
  fi
  git -C "$FAKE" update-ref refs/pull/140/head "$(git -C "$REPO" rev-parse refs/pull/140/head)"
  mkdir -p "$FAKE/hooks"
  cat > "$FAKE/hooks/update" <<'HOOK'
#!/bin/bash
# GitHub's own message, per ref, from run 35295784427.
case "$1" in
  refs/tags/frozen/phase5)  f=bloom-frozen-matrices.yml ;;
  refs/tags/frozen/phase22) f=bloom-export-watertight.yml ;;
  refs/tags/frozen/phase23) f=bloom-export-watertight.yml ;;
  *) [ -n "${ALSO_REJECT:-}" ] && [ "$1" = "refs/tags/frozen/$ALSO_REJECT" ] && f=bloom-panel.yml || exit 0 ;;
esac
echo "refusing to allow a GitHub App to create or update workflow \`.github/workflows/$f\` without \`workflows\` permission" >&2
exit 1
HOOK
  chmod +x "$FAKE/hooks/update"
  # `update` hooks see only the pushed env, so the knob travels in the config.
  git -C "$FAKE" config receive.denyCurrentBranch ignore
}

setup_work() {
  rm -rf "$WORK"
  git clone --shared --quiet "$REPO" "$WORK" 2>/dev/null
  git -C "$WORK" remote set-url origin "file://$FAKE"
  git -C "$WORK" tag -l 'frozen/*' | while read -r t; do git -C "$WORK" tag -d "$t" >/dev/null; done
  ln -sfn "$REPO/node_modules" "$WORK/node_modules"
  cp "$REPO/tools/publish-frozen-tags.sh" "$WORK/tools/publish-frozen-tags.sh"
}

run() { ( cd "$WORK" && bash tools/publish-frozen-tags.sh "$@" ); }

DECLARED=$(node -e "import('$REPO/tools/bloom-harness.mjs').then(h=>console.log(Object.keys(h.FROZEN_BASE_COMMITS).length))" 2>/dev/null)

echo "=============================================================="
echo "publish-frozen-tags.sh self-test — $DECLARED baselines declared"
echo "=============================================================="

# ---- A: the real-world case ------------------------------------------------
echo
echo "A. empty remote, three refs refused exactly as GitHub refuses them"
setup_remote; setup_work
run > "$TMP/a.log" 2>&1; rc=$?
check "exit 0 — a run that published everything it could is a PASS" "$rc" "0"
has  "it names the three as declared exceptions" "missing but declared" "$TMP/a.log"
has  "phase5 named with GitHub's own reason"  "frozen/phase5   MISSING — declared" "$TMP/a.log"
has  "phase22 named"                          "frozen/phase22  MISSING — declared" "$TMP/a.log"
has  "phase23 named"                          "frozen/phase23  MISSING — declared" "$TMP/a.log"
hasnt "nothing is reported as undeclared"     "and NOT declared" "$TMP/a.log"
grep -q "$((DECLARED - 3)) published and correct" "$TMP/a.log" \
  && ok "$((DECLARED - 3)) of $DECLARED published and correct" \
  || bad "wrong published count: $(grep -o '[0-9]* published and correct' "$TMP/a.log")"
n=$(git -C "$FAKE" for-each-ref 'refs/tags/frozen/*' | wc -l)
check "the remote really holds them (counted on the remote, not claimed)" "$n" "$((DECLARED - 3))"
for p in phase21 phase24 phase34 phase10; do
  want=$(git -C "$WORK" rev-parse "frozen/$p" 2>/dev/null)
  got=$(git -C "$FAKE" rev-parse "refs/tags/frozen/$p" 2>/dev/null)
  check "frozen/$p points at its declared base" "$got" "$want"
done

# ---- B: idempotency --------------------------------------------------------
echo
echo "B. a second run over a remote that already holds them"
run > "$TMP/b.log" 2>&1; rc=$?
check "exit 0 — existing tags are not an error" "$rc" "0"
grep -q "$((DECLARED - 3)) published and correct" "$TMP/b.log" \
  && ok "same verdict as the first run" || bad "verdict moved between runs"
n2=$(git -C "$FAKE" for-each-ref 'refs/tags/frozen/*' | wc -l)
check "the remote is unchanged" "$n2" "$n"
run --check > "$TMP/b2.log" 2>&1; rc=$?
check "a third run, --check, agrees" "$rc" "0"

# ---- C: must-fail — an UNDECLARED ref goes missing --------------------------
echo
echo "C. must-fail: a ref that is refused and NOT declared"
setup_remote; setup_work
sed -i 's|\*) \[ -n "${ALSO_REJECT:-}" \].*|*) [ "$1" = "refs/tags/frozen/phase24" ] \&\& f=bloom-panel.yml \|\| exit 0 ;;|' "$FAKE/hooks/update"
run > "$TMP/c.log" 2>&1; rc=$?
check "exit 1" "$rc" "1"
has "phase24 is named as undeclared"  "frozen/phase24  **NOT PUBLISHED** and NOT declared" "$TMP/c.log"
has "the failure says what to do"     "Add it to TAG_PUSH_XFAIL" "$TMP/c.log"
has "the declared three are still just declared" "missing but declared" "$TMP/c.log"

# ---- D: must-fail — a tag left at a SUPERSEDED commit -----------------------
echo
echo "D. must-fail: a tag on the remote pointing at the wrong commit"
echo "   (the hole the old name-only verification could never see)"
setup_remote; setup_work
WRONG=$(git -C "$WORK" rev-parse 'HEAD~5')
git -C "$FAKE" update-ref refs/tags/frozen/phase30 "$WRONG"
run > "$TMP/d.log" 2>&1; rc=$?
check "exit 1" "$rc" "1"
has "it names the wrong commit"  "frozen/phase30  **WRONG COMMIT**" "$TMP/d.log"
has "and says the baseline is pinned to the wrong object" "pinned to the wrong object" "$TMP/d.log"
# The old verification grepped the NAME only. Prove that would have passed.
git -C "$FAKE" ls-remote --tags . 'refs/tags/frozen/phase30' | grep -q 'frozen/phase30' \
  && ok "the name IS on the remote — a name-only check would have said 'published'" \
  || bad "fixture wrong: the tag is not on the remote at all"

# ---- E: a declared exception that starts publishing -------------------------
echo
echo "E. a declared exception that is no longer refused"
setup_remote; setup_work
sed -i 's|  refs/tags/frozen/phase22) f=bloom-export-watertight.yml ;;||' "$FAKE/hooks/update"
run > "$TMP/e.log" 2>&1; rc=$?
check "exit 0 — publishing more is not a failure" "$rc" "0"
has "it is called out as stale"        "STALE EXCEPTION" "$TMP/e.log"
has "the entry is named on its row"    "frozen/phase22  published" "$TMP/e.log"
has "and the instruction is explicit"  "Remove their TAG_PUSH_XFAIL entries" "$TMP/e.log"

# ---- F: --check is inert ----------------------------------------------------
echo
echo "F. --check creates nothing and pushes nothing"
setup_remote; setup_work
before=$(git -C "$FAKE" for-each-ref | sort | md5sum)
run --check > "$TMP/f.log" 2>&1; rc=$?
after=$(git -C "$FAKE" for-each-ref | sort | md5sum)
check "the remote is byte-identical afterwards" "$after" "$before"
check "exit 1 — nothing is published yet, and that is undeclared" "$rc" "1"
localtags=$(git -C "$WORK" tag -l 'frozen/*' | wc -l)
check "no local tag was created either" "$localtags" "0"

# ---- G: the refs-API fallback can never fail the run ------------------------
echo
echo "G. the git/refs fallback is best-effort — an unreachable API must not"
echo "   turn a run that published everything it could into a failure"
setup_remote; setup_work
before_tags=$(git -C "$FAKE" for-each-ref 'refs/tags/frozen/*' | wc -l)
( cd "$WORK" && GH_TOKEN=not-a-real-token GITHUB_REPOSITORY=owner/repo \
  GITHUB_API_URL=http://127.0.0.1:1 bash tools/publish-frozen-tags.sh ) > "$TMP/g.log" 2>&1; rc=$?
check "exit 0 despite the API being unreachable" "$rc" "0"
has "the fallback announced itself"       "trying the git/refs API" "$TMP/g.log"
has "it tried each refused ref"           "git/refs POST ->" "$TMP/g.log"
has "and re-read the remote afterwards"   "still absent — the API route is refused too" "$TMP/g.log"
has "the verdict is still the real one"   "30 published and correct" "$TMP/g.log"
after_tags=$(git -C "$FAKE" for-each-ref 'refs/tags/frozen/*' | wc -l)
check "a failed fallback published nothing extra" "$after_tags" "30"

echo
echo "=============================================================="
printf '%d passed, %d failed\n' "$pass" "$fail"
echo "=============================================================="
[ "$fail" -eq 0 ]
