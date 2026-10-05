#!/bin/sh
# bug-wing-audit-gate.sh <records.json> [scratch-dir] — runs the bug gate's
# library-row checks (tools/verify-bug.mjs, rows `library:#N`) on every record
# the wing audit wrote (tools/bug-wing-audit.mjs), in a SCRATCH COPY of the tree
# whose bug-wing-library.js holds those records. Nothing in this tree changes.
# Fixed records carry id + 1000.
set -e
REC="$1"; T="${2:-$(mktemp -d)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$T/tools"
cp "$ROOT"/bug*.js "$T/"; cp "$ROOT"/tools/*.mjs "$T/tools/"
[ -d "$ROOT/node_modules" ] && ln -sfn "$ROOT/node_modules" "$T/node_modules"
node -e "const r=require(process.argv[1]); require('fs').writeFileSync(process.argv[2], 'export const WING_LIBRARY = ' + JSON.stringify(r) + ';\n')" "$(cd "$(dirname "$REC")" && pwd)/$(basename "$REC")" "$T/bug-wing-library.js"
cd "$T" && node tools/verify-bug.mjs --only '^library:#[0-9]+$' 2>/dev/null | grep -E '^(ok  |FAIL) library:#|^     ' || true
