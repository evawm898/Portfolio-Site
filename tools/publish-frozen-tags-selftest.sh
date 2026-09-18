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

# ---- making an ANNOTATED tag, which needs a TAGGER IDENTITY -----------------
# `git tag -a` writes a tag OBJECT, and a tag object carries a tagger line, so
# git refuses to make one without a name and an email. A GitHub runner has
# neither: nothing in this workflow sets user.name / user.email, and git's
# auto-detection fails on a runner hostname. A clone does not copy the SOURCE
# repo's local config either, so $WORK resolves whatever GLOBAL config exists —
# an identity on a dev box, nothing on a runner.
#
# THAT ASYMMETRY IS WHY THIS WENT UNDETECTED: every local run of this file
# passed and run 10 (35299447040) failed, on the same code. The identity is
# supplied per command rather than written into git config — a self-test that
# mutates the machine's git identity is a worse thing than the bug it fixes.
TAGGER=(-c "user.name=frozen-tags selftest" -c user.email=selftest@example.invalid)

# The ONE owner of making an annotated tag here. It REPORTS whether git could,
# and never decides what that means: case H aborts on a failure, case I
# REQUIRES one. Trailing arguments are passed to git before `tag`, which is how
# case I strips the identity back off.
annotate() { # repo tagname commit message [git -c args…]
  local repo=$1 tagname=$2 commit=$3 msg=$4; shift 4
  git -C "$repo" "$@" tag -f -a -m "$msg" "$tagname" "$commit"
}

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

# ---- H: an ANNOTATED tag at the right commit is not a wrong commit ----------
echo
echo "H. a correctly-placed ANNOTATED tag — it reports its tag-object sha and the"
echo "   commit separately, and reading the wrong line would invent a failure"
setup_remote; setup_work
right=$(git -C "$WORK" rev-parse "$(node -e "import('$REPO/tools/bloom-harness.mjs').then(h=>console.log(h.FROZEN_BASE_COMMITS.phase30))" 2>/dev/null)")
# THE FIXTURE MUST BE ADVERSARIAL OR IT PROVES NOTHING. The lookup this case
# exists to protect used to pipe both lines through `sort -u` and take the
# first, so WHICH sha it returned depended on which one sorted lower — a coin
# flip per tag. A fixture that lets the commit win passes on the broken code
# too (measured: it did, first time round). So the tag object is searched for
# until its sha sorts BEFORE the commit's, which makes the pre-fix lookup
# return the tag object deterministically.
#
# AND A FIXTURE THAT CANNOT BE BUILT IS NOT A FIXTURE THAT WAS UNLUCKY. The
# first version swallowed `git tag -a`'s stderr and read only the sha, so on a
# runner with no tagger identity it made nothing, spun all 200 attempts, and
# blamed LUCK — run 10 reported "this case would be luck" about an environment
# in which the case could not be attempted at all. The two are distinguished
# now: git failing is an unbuildable fixture and aborts, the way setup_remote
# already aborts on an unfetchable phase10 base; 200 honest tries losing a coin
# flip 200 times is the astronomically improbable thing the message describes.
adversarial=0
for attempt in $(seq 1 200); do
  if ! annotate "$WORK" frozen/phase30 "$right" \
         "pushed by hand from a user clone ($attempt)" \
         "${TAGGER[@]}" >/dev/null 2>"$TMP/h.tag.err"; then
    echo
    echo "FIXTURE UNAVAILABLE: git could not create an annotated tag here, so case H"
    echo "would measure its own setup rather than the lookup under test. git said:"
    sed 's/^/  /' "$TMP/h.tag.err"
    exit 2
  fi
  probe=$(git -C "$WORK" rev-parse frozen/phase30)
  if [ "$probe" \< "$right" ]; then adversarial=1; break; fi
done
if [ "$adversarial" -eq 1 ]; then
  ok "found a tag object that sorts before the commit — the pre-fix lookup must pick it"
else
  bad "200 annotated tags were built and every one sorted after the commit; this case would be luck"
fi
git -C "$WORK" push --quiet origin refs/tags/frozen/phase30:refs/tags/frozen/phase30
# The fixture is worth nothing unless the remote really reports TWO lines with
# DIFFERENT shas — that is the whole hazard. Note the wildcard: an EXACT pattern
# does not match `...phase30^{}` and returns one line, which is how this check
# first fooled itself.
two=$(git -C "$WORK" ls-remote --tags origin 'refs/tags/frozen/*' | grep -c 'frozen/phase30')
check "the remote reports the annotated tag on two lines" "$two" "2"
tagobj=$(git -C "$WORK" ls-remote --tags origin 'refs/tags/frozen/*' | awk '$2=="refs/tags/frozen/phase30"{print $1}')
if [ -n "$tagobj" ] && [ "$tagobj" != "$right" ]; then
  ok "the two lines really disagree (tag object ${tagobj:0:12} vs commit ${right:0:12}) — the case can bite"
else
  bad "fixture vacuous: the tag object and the commit are the same sha"
fi
git -C "$WORK" tag -d frozen/phase30 >/dev/null
run > "$TMP/h.log" 2>&1; rc=$?
check "exit 0" "$rc" "0"
has  "it reads the COMMIT, not the tag object" "frozen/phase30  published ${right:0:12}" "$TMP/h.log"
hasnt "and does not invent a wrong commit"     "frozen/phase30  **WRONG COMMIT**" "$TMP/h.log"

# ---- I: must-fail — case H's own fixture guard, which run 10 needed ---------
# The guard added above is unreachable on any machine that HAS a git identity,
# which is every machine this file was ever run on before it reached a runner.
# So it gets a control: the runner's condition is reproduced deliberately and
# the guard's two halves are required to answer differently.
echo
echo "I. must-fail: an annotated tag with NO tagger identity — git must refuse it"
echo "   and the fixture's own identity must be what lets case H build one"
setup_work
# A clone does not copy the source repo's LOCAL config, so neutralising GLOBAL
# and SYSTEM leaves the identity genuinely unset — a runner, deterministically,
# whatever the developer's own git is configured to. In a subshell because in
# bash a `VAR=x func` assignment PERSISTS after the call and would leak
# /dev/null as the global config into every case after this one.
if ( export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
     annotate "$WORK" frozen/probe "$right" "no identity" \
       -c user.useConfigOnly=true >/dev/null 2>"$TMP/i.err" ); then
  bad "an annotated tag was built with no identity — this control proves nothing"
else
  ok "git refuses it: $(head -1 "$TMP/i.err")"
fi
check "and nothing was created — the state run 10 spent 200 attempts in" \
      "$(git -C "$WORK" tag -l 'frozen/probe' | wc -l | tr -d ' ')" "0"
if annotate "$WORK" frozen/probe "$right" "with the fixture's own identity" \
     "${TAGGER[@]}" >/dev/null 2>&1; then
  ok "and the identity case H supplies is what makes the fixture buildable"
else
  bad "the fixture's own tagger identity does not work"
fi

echo
echo "=============================================================="
printf '%d passed, %d failed\n' "$pass" "$fail"
echo "=============================================================="
[ "$fail" -eq 0 ]
