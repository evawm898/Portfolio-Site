# Session 25 — the panel gate's retired-id scanner

**One job: the scanner in route (n)(iv) of `tools/verify-bloom-panel.mjs`, and nothing else.**
Ruled its own session by Eva on Sep 6, before session 2 of the parametric tip, because that
session writes more new assertion messages than anything so far and the workaround was
"never type an apostrophe". It had already cost two sessions — thirteen reworded assertion
messages in session 22, nine in session 24.

Base tree: `888a506`. Files moved: `tools/verify-bloom-panel.mjs` and `tools/bloom-harness.mjs`,
and nothing else — predeclared before a line was written and verified by diff at the close.

## THE DEFECT, AND IT WAS WORSE THAN THE TICKET SAID

Route (n)(iv) scans executable bloom source for retired control ids, exempting comments and
string literals (the frozen matrices name those ids as ROW DATA and must). It stripped with
five regexes in sequence: the `RETIRED_IDS` block, block comments, line comments, template
literals, `'…'`, `"…"`.

**The template regex cannot see nesting.** `` `(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*` `` — the
`[^}]*` stops at the FIRST `}`, so an interpolation holding a nested template that itself
interpolates ends the outer match at the INNER literal's closing backtick, and every backtick
after it pairs off by one. The pass then matches the GAPS BETWEEN literals rather than the
literals.

**The first out-of-phase match was found rather than guessed** — `tools/bloom-harness.mjs:571`:

```js
return `SPINE: curl ${sp.turnAskedDeg}° · bias ${sp.bias} · start ${sp.start}${sp.startFloored !== sp.start ? ` (floored to ${sp.startFloored.toFixed(3)})` : ''}`
  + ` · tightest spine radius …`
```

`[^}]*` stops at the `}` of `${sp.startFloored.toFixed(3)}`. From there the pass treats
`` `\n    + ` `` — the GAP between one literal and the next — as a template literal.

Measured at `888a506`:

| | |
|---|---|
| scanned files leaving a stray backtick after the comment + template passes | **20 of 35** |
| characters the template pass deleted from `verify-bloom-panel.mjs` | **58,522 of 98,906** |
| non-whitespace source surviving as scannable code, old chain | **332,888** |
| … the same, new walk | **605,687** |
| so the old pass hid | **45% of the executable source it was meant to scan** |

**It went blind as well as loud, and the blindness is the part nobody had measured.** On a
PRISTINE `888a506` with two genuine references spliced into `stamenAssertions()`:

| reference | old chain | new walk |
|---|---|---|
| `` const _t = `spread ${centerSize}`; `` (line 2684) | **missed entirely** | `bloom-harness.mjs:2684` |
| `const _u = row.centerDish;` (line 2685) | found, reported at **line 590** | `bloom-harness.mjs:2685` |

The one it found it misreported by 2,095 lines. A scanner that misses real references and
misreports the ones it finds is how a real hit gets waved through later — that is the reason
this was worth a session, not the noise.

## THE FIX — A CHARACTER WALK, NOT A STACK OF REGEXES

`stripToCode(src)` blanks every comment, string, template TEXT and regex body **to spaces, in
place, keeping every newline**, and returns the text plus how many literals were still open at
the end. Three consequences, each load-bearing:

1. **`file:line` names the real line.** The stripped text is the same length as the source, so
   an offset into one is an offset into the other. The old strip collapsed a whole block
   comment to a single space, which is why its line numbers pointed nowhere.
2. **A `${…}` expression is left as CODE, because it is.** The old pass blanked it with the
   literal around it, which is why `${centerSize}` was invisible. The stack holds `'tmpl'` for
   template text and a NUMBER for an interpolation — that number being its own brace depth —
   so an object literal inside an interpolation does not end it.
3. **A mis-read costs one line, never the file.** A `'` or `"` string ends at its line's end if
   unterminated (JS forbids a raw newline in one), which is what makes an apostrophe in HTML
   prose harmless. A `/` opens a regex only after `( , = : [ ! & | ? { } ;`, an arrow, a
   keyword like `return`, or the start of a file, AND only if an unescaped `/` closes it before
   the newline — so `</div>` is not a regex and `a / b` is not either.

**A regex literal's body is now exempt, and it had to be:** this gate's own negative control
asserts its failure text with `` /^\[retired\]: … centerStyle …/ `` — a literal, not a
consumer. The old chain did not exempt it and got away with it only because the phase shift
had already swallowed that part of the file.

**The `RETIRED_IDS` block carve-out is gone.** Under a real string-literal walk every id in
that block is inside a quoted string and exempt anyway, and a regex that collapses a
multi-line block would break the length property the line numbers depend on.

## THE TWO CONTROLS, BOTH FIRED

**Control 1 — apostrophes inside template literals scan clean; the red came before the green.**
Restoring the twenty-two possessives on this tree and running the OLD chain:

```
[old] files 35  HITS 48  invalid 0
  tools/bloom-harness.mjs:599 centerSize    (x24)
  tools/bloom-harness.mjs:599 centerRise    (x8)
  tools/bloom-harness.mjs:599 centerDish    (x8)
  tools/bloom-harness.mjs:599 centerBore    (x8)
```

**48, and at the exact symptom session 22 recorded.** Line 599 of the real file reads
`const ar = document.getElementById('autoRotate');`. The labels that produced the hits live at
lines 4407 and after, in the frozen matrices' double-quoted row data — about 3,800 lines away.
The new walk on the identical tree: **0 hits, 0 files it could not vouch for.**

Worth recording because it cost time: **the nine session-24 possessives restored alone did NOT
reproduce it.** They come to fourteen apostrophes — an even number — so the parity is preserved
and the old chain still read 0. It is a parity effect, exactly as session 22 named it, and the
count matters more than the location.

**Control 2 — a genuinely retired id is still caught, at the right file and line.** Nine
mutations, each applied to a COPY of the tree, never the working tree:

| | mutation | result |
|---|---|---|
| M1 | a bare identifier in a statement | `bloom.js:27 centerStyle` |
| M2 | a property access on a live object | `bloom-geometry.js:1343 centerDish` |
| M3 | inside a `${…}` in a template literal | `bloom-harness.mjs:2684 centerSize` |
| M4 | in a nested-template sheet builder | `shot-bloom-panel.mjs:139 centerBore` |
| M5 | a computed key in the registry | `bloom-registry.js:116 centerRise` |
| X1 | inside a double-quoted label | silent |
| X2 | inside a template literal's TEXT | silent |
| X3 | inside a block comment | silent |
| X4 | inside a regex literal | silent |

Every caught line is the line the mutation was spliced onto, exactly. Silent on the real tree.

## WHAT THE CASE TABLE CAN AND CANNOT DO — STATED, NOT FAKED

Route (n)(iv) now drives the walk over **twenty sources whose answer is written down**, before
it is trusted on the tree, because on 35 real files a walk that blanked EVERYTHING would also
report 0 hits and the per-file validity check cannot see a mis-classified region — it only
knows the text still lines up.

**The historical bug itself is NOT reproducible in a fixture, and the table does not pretend
otherwise.** The phase shift is a WHOLE-FILE parity property: four hand-built candidates and
the real `:571` construct all re-align within a few lines, and the old chain passes every one
of them. That is the same finding session 22 reached from the other end — removing any ONE of
its thirteen messages cleared it. What the table pins is the set of properties that make the
bug impossible, and it was checked against **seven mutations of the walk itself**, each of
which turns at least one case red:

| mutation | cases red |
|---|---|
| the `${…}` blanked as the old pass did | 3 |
| `}` never closing an interpolation | 3 |
| a string running past its newline | 1 |
| regex literals unrecognised | 2 |
| an escape ignored inside a template | 1 |
| the arrow dropped as a regex position | 1 |
| a regex allowed to span a newline | 1 |

The first two cases were written before the mutants and the last two were written **because**
two mutants survived the first draft — a table every implementation passes is decoration.

`linesOf()` is the one owner of "which lines does this id appear on", read by the case table
and by the file scan; the registration rule, on a scale small enough that two copies would
have been the obvious thing to write.

## THE TWENTY-TWO MESSAGES, RESTORED

They are the fix's own regression test: if the gate stays green with the apostrophes back, the
fix holds.

- **Thirteen from session 22**, in `gynoeciumAssertions()` — recovered verbatim from that
  session's own reword commit (`173d1ae` on `refs/pull/167/head`), so the restoration is the
  original wording and not a reconstruction. `the style's root runs …`, `the owner's lobe
  spread …`, `lobe ${k}'s apex …`, `the trifid's spread …`, and nine more.
- **Nine from session 24**, in JS5 — those were reworded *before* the commit was made, so no
  git object carries the originals; they are restored to natural possessive phrasing, with the
  one pairing session 24's own doc records (`the inner limit the owner declares` →
  `the owner's inner limit`) taken exactly.

Net: **+29 apostrophes**, 8 em dashes preserved. The scanner reads 0.

## NO ROW ADDED, NO BYTE MOVED, NO FROZEN PHASE OWED

`buildMatrix()` is **deep-equal between base and head — 528 rows, row for row**, so nothing was
added and nothing needs a new baseline. All sixteen frozen matrices verify deep-equal to their
base commits. **phase17 stays the newest baseline**, and session 24's note that phase17's BYTES
no longer reproduce is unchanged by this session, which moves none.

0 moved is true **by construction**: assertion strings are not geometry, no matrix row can see
them, and every file the export path reads — `bloom.js`, `bloom-geometry.js`,
`bloom-registry.js`, `bloom.html`, `bloom.css`, `bloom-view-presets.js` — was predeclared
untouched and is byte-identical by sha1. **It was asserted on the full matrix anyway, and the
construction holds: `528/528 byte-identical; 0 moved`**, a plain capture per tree, base
`888a506` against head `e94ffce`, hashing the exact bytes the real Get STL button produced.
CI does no byte diffs, so this is the one close-out step that genuinely needed a local run.

**The predeclared manifest.** 386 files tracked at `888a506`; two declared movers
(`tools/verify-bloom-panel.mjs`, `tools/bloom-harness.mjs`); **384 predeclared UNTOUCHED by
sha1 before a line was written** — `bloom-geometry.js`, `bloom-registry.js` and `bloom.js`
among them, on Eva's instruction, so "gate only" is a construction rather than a claim. The
manifest self-verified 384/384 against the tree it was taken from and held 384/384 on the head.

## THE CLOSE (Sep 6–7)

**All four bloom gates green on the PR head `e94ffce`** — bloom-export-watertight and
bloom-connectedness on the full 528-row matrix (87.5 min and 57 min respectively; the export
gate's own history is 83 / 90 / 87 / 88 / 85, so it was waited on rather than assumed hung),
bloom-panel, bloom-frozen-matrices. The two flower gates ran on the `tools/**` filter and are
**not bloom evidence** — four jobs, not six.

Locally: `verify-bloom-panel.mjs` PASS, its `[retired]` line reading *"5 retired ids … absent
from the DOM, the read-out's summary line, the metrics, and as identifiers in 35 bloom source
files — the walk passed its 20 written-down cases and vouched for every file"*;
`--negative-control` with all fifteen routes and session 23's four clauses observing their own
failure; `bloom-smoke.mjs` clean in 162 s; `bloom-smoke.mjs --check` OK (39 smoke rows over 20
matrix blocks of 528); all sixteen `--verify-frozen` deep-equal.

#173 undrafted and merged by the session (squash) as **`928e13e`**, the head sha read from the
remote with `git ls-remote` and passed as `expectedHeadSha`. **No frozen tag is owed and none
was published.** The predeclared manifest re-verified against merged `main`: **384 of 384
held**, and the only two files `main` moved between `888a506` and this merge are this session's
two predeclared movers — `main` had not moved in between, so none of them is another PR's.

**No sheet is owed: nothing visual changes.** This entry and the charter's are the docs-only PR
that follows the merge, on the session-22/23/24 rhythm.

## WHAT THE NEXT SESSION SHOULD KNOW

- **The scanner is no longer a reason to avoid apostrophes.** Session 2 of the parametric tip
  writes more new assertion messages than anything so far; write them in plain English. The
  twenty-two restored messages are the standing regression test — if the panel gate is green,
  the fix holds.
- **A retired-id hit now quotes its own source line**, so a report is actionable without a
  bisect. If one ever fires, read the line it names: it is the real one.
- **`stripToCode` is not a JavaScript parser and does not claim to be.** It is a lexer good
  enough to say "is this offset inside a literal", with a bounded failure mode and a per-file
  validity assertion. Two things would defeat it and neither exists in this repo today: a
  regex literal in a position the heuristic does not admit (it would then be read as a
  division, and its body scanned as code — noisy, never blind), and a `#!` or JSX. If either
  arrives, the honest move is a real tokeniser, not another special case.
- **The scanner's coverage is still its FILE LIST**, printed on every run. A retired id living
  in a file outside that list is not caught — unchanged by this session, and the flower gate's
  header says the same of its own list.
