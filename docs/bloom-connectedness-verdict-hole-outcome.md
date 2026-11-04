# The connectedness verdict's cancelled-after-complete hole (Nov 4)

**Question.** On `main`'s push run for #483 (`07c2997`, run 41586065592) shard 0 was CANCELLED at
its 150-minute timeout and shard 2 took 147 min, yet the `verdict` job PASSED. On #485
(`7d5e4c4`, run 41698124903) shards 0 and 2 were cancelled and the verdict FAILED. Which is right,
and why do they differ?

## 1. What main's run actually did — evidence, not reasoning

From the job logs and the artifact list of run 41586065592:

| shard | gate step | step end | conclusion | census artifact |
|---|---|---|---|---|
| 0 | 05:49:37 → 08:19:51 (150.2 min) | cancelled | 33,881 B, uploaded 08:19:52 |
| 1 | 05:49:18 → 07:43:33 (114.2 min) | success | 34,010 B |
| 2 | 05:49:18 → 08:16:26 (147.1 min) | success | 33,565 B |
| 3 | 05:49:18 → 07:57:58 (128.7 min) | success | 33,566 B |

Shard 0's own log, last lines before the cancel:

```
2026-11-03T08:19:50.9652478Z connectedness: PASS — 413 of 414 attempted rows reached the results and every one exports as a single connected body; 1 row(s) the generator REFUSED ...
2026-11-03T08:19:50.9653942Z (this is shard 0/4 of the matrix — NOT a matrix verdict; ...)
2026-11-03T08:19:51.1111212Z ##[error]The operation was canceled.
```

The gate writes its census BEFORE it prints the summary (`writeCensus` precedes `summarizeConn` in
`tools/verify-bloom-connectedness.mjs`), so the census was complete and on disk when the runner
killed the process **146 ms after its PASS line**, during the final flush. The upload step runs
under `if: always()` and carried the file; the verdict's log reads `ROWS: 1653 attempted · 1651
reached the results · 1651 are ONE connected piece · 2 EXPORT REFUSED`.

**So shard 0 did not hang mid-run and no row went unmeasured.** The verdict read four complete
censuses and was right about every row. What it could not see is that a shard RAN TO ITS TIMEOUT,
which the workflow's own comment calls a hang declared.

#485's run is the other case: shards 0 and 2 were cancelled MID-RUN (step durations 149.4 and
149.0 min, no PASS line), wrote no census, and the verdict failed on `shard 0/4: NO CENSUS` plus
`shard 2/4: NO CENSUS` and the four rows-attempted-by-nobody findings (6 validity assertions).
That path was always closed.

## 2. The hole, and the fix

A census carries no record of its job's conclusion, and its `elapsedS` is the gate's own clock
(started after node loads), so a shard at the limit reads a few seconds under it. Two clauses now,
two owners, both in `tools/bloom-connectedness-shards.mjs`:

- **`jobClauses`** — the verdict job fetches the run's own job list (`gh api
  .../runs/$GITHUB_RUN_ID/jobs`, the token granted `actions: read`) and every `shard (k)` for
  k in 0..N−1 must be present exactly once and `completed/success`. A cancelled, failed,
  missing or duplicated shard job fails the verdict, whatever its census says.
- **`headroomClauses`** — each complete census's `elapsedS` must sit under the shard timeout
  less `SHARD_OVERHEAD_MIN` (1 min; the step's non-gate overhead measured at 13 s on that run).
  A token-free restatement that fires on main's run shape without the API.

The merge prints each shard's percentage of the timeout and its slowest row. `SHARD JOBS: NOT
CHECKED` is printed, not passed silently, when no list is supplied (a local `--merge`).

`SHARD_TIMEOUT_MIN` in the verdict job's env must equal the shard job's `timeout-minutes`; the
step greps the workflow file and refuses if they differ (expressions cannot read `env` in
`timeout-minutes`, so one number lives in two places with a guard).

## 3. Negative controls (`node tools/bloom-connectedness-shards.mjs --negative-control`)

The nine synthetic cases stand. Seven new ones go THROUGH THE FILES — written with `writeCensus`,
read with the CLI's own `readCensusDir`, merged by the shipped `mergeConn` — and each must name
its shard:

```
ok   [files] the complete set on disk, every job green: PASSED (must pass)
ok   [files] a shard's ARTIFACT MISSING from the directory: FAILED (must fail)
ok   [files] a census TRUNCATED mid-write: FAILED (must fail)
ok   [files] a shard job the run reports CANCELLED beside its complete census: FAILED (must fail)
ok   [files] a shard job MISSING from the run's job list: FAILED (must fail)
ok   [files] a shard whose gate clock reads at the job timeout (main's run shape, 07c2997): FAILED (must fail)
ok   [files] no job list supplied at all (reported; the complete set still passes): PASSED (must pass)
```

`reconcile` now carries a parse error's text into its version finding (`census-2.json: Unexpected
end of JSON input`) so a truncated file is named rather than reported as "version -1".

## 4. Per-row timings in the census

`attempted[].ms` is each row's whole iteration (page load, settle, export, flood fill, flags),
stamped in a `finally` so a refused or dropped row carries its cost too. A CI log flushes every
row line at exit under one timestamp, so until now no per-row time existed anywhere; the
shard-headroom PR reads these off this PR's own run to project a new split. Measured locally on
a 5-row shard (`--shard 7/400`): 5.5 s to 16.5 s a row, 53 s the shard.

## 5. Are any main greens since 07c2997 in doubt?

No. `main` has had no connectedness run since 41586065592 — #484 and #486 touched no path the
workflow lists — and that run's rows were all measured (§1). The run's OVERALL conclusion on
`main` is `cancelled`, not `success`: the shard job's cancel sets it whatever the verdict says.

**Noted, not this session's:** `bloom-export-watertight`'s preflight hit its 90-min limit on #485
(58.6 min on the previous head). It is a different workflow with a different cause (Node-only
instruments, no shard), and its own reconciliation reads censuses the same way, so the
`jobClauses` / `headroomClauses` shape applies there too if wanted — a separate change.
