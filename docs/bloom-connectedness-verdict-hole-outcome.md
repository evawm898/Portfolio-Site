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

No, and the answer is from the run list rather than from reasoning. `main` since `07c2997` is
three commits — `6981e2f` (#484, docs only), `c0e13d2` (#486, textile pages) and `b6b0da7` (#487,
this fix) — and `bloom-connectedness` on `main` has exactly one run in that span: 41822933442 on
`b6b0da7`, started 11:41 on Nov 4 and running under the FIXED verdict. #484 and #486 touched no
path the workflow lists, so they ran nothing. The last run before it is 41586065592 on `07c2997`
itself, whose rows were all measured (§1) and whose OVERALL conclusion is `cancelled`, not
`success` — the shard job's cancel sets it whatever the verdict says. The run before that,
41310689633 on `a77b362` (#472), is green, with every shard under its limit (its slowest step
finished at 2 h 12 min of a 2 h 30 min job).

Two things make this exhaustive rather than lucky. The hole could only ever hide a shard AT its
timeout, never an unmeasured row: a cancelled shard either wrote a complete census (every row
measured, this case) or none (the verdict already failed, #485's case). And the shard count,
timeout and `if: always()` upload have been the same since the gate was sharded, so the only
runs that could carry the hole are the ones whose shard step reached 150 min — and 41586065592 is
the only one on `main` whose job list shows a cancelled shard.

## 6. PR 2 — eight shards, on the shard-level evidence (Eva's ruling, Nov 4)

The ruling: route 3 — ship eight shards on the shard-level evidence; the verdict prints a per-row
ms table and projected per-shard totals for 6 / 8 / 10 shards on every run, so the next run
measures it; a shard over 70% of the timeout is a FLAG in the verdict's output, not a fail.

**Why the row timings were not read first.** They exist: `attempted[].ms` is in #487's four
`conn-census-k` artifacts (run 41751823402). The artifact download redirects to a
`blob.core.windows.net` host the session proxy denies (403 CONNECT, the known policy — `gh run
download` and the API both land there), and the shard logs carry no row time: stdout is flushed
in one burst at exit, so all 414 row lines of a shard share one timestamp (one live line in the
whole log, the refusal at 01:17:03). What the logs do carry is each row's `tris(export)`, and it
does NOT track shard time:

| shard | main `07c2997` (run 41586065592) | #487 (run 41751823402) | rows | tris (M) |
|---|---|---|---|---|
| 0 | 150.2 min (cancelled at the limit) | 95.4 | 414 | 46.0 |
| 1 | 114.2 | 143.7 | 413 | 39.7 |
| 2 | 147.1 | 92.0 | 413 | 43.1 |
| 3 | 128.7 | 133.7 | 413 | 36.4 |

Shard 0 carries the most triangles and was both the fastest and the slowest; the same rows swing
95 to 150 min between runners. So no projection from triangle counts was made.

**The count, from the shard-level totals.** 465 min (#487) and 540 min (main) of shard time
over 1,653 rows. Balanced: six shards is 78–90 min a shard (52–60% of 150); the round-robin
imbalance on triangle share at six is +15% on the heaviest shard, which puts the worst shard
near 100–105 min — at the 70% bar, under runner variance of ±30%. Eight shards is 58–68 min
balanced (39–45%), +22% imbalance on triangle share, worst about 80 min (53%). Row split at
eight: 207 ×5, 206 ×3 (`--plan 8`).

**What ships.** `CI_CONN_SHARDS` 8; the workflow's matrix `[0..7]` and `SHARDS: 8` in both jobs;
`SHARD_FLAG_SHARE` 0.70 and `PROJECTED_SHARD_COUNTS` [6, 8, 10]; `timingReport()` in the merge,
after the headroom lines and before the verdict, printing every attempted row in matrix order
(index, shard, ms, label) and the projected per-shard totals for 6 / 8 / 10 from those ms; and
`SHARD HEADROOM FLAG: shard k/n ran … = 80% of the 150-min timeout, past 70% — a flag, not a
failure` wherever a complete census's own clock is past the share. Three more file-level
controls: a shard at 80% is flagged and the verdict PASSES; the projection reads the rows' own
ms (every row 1,000 ms, so eight shards project to the row counts in minutes — the needle is
computed from `shardOf`, not typed); a census with no `ms` is counted and said and the verdict
still passes. `--negative-control` on the default of eight: 19 of 19.

A synthetic merge of eight censuses with a planted 80% shard printed, in order: the flag line, the
1,653-row table, then

```
PROJECTED PER-SHARD TOTALS from those ms (round-robin by matrix index, this run's own rows and runners; …):
  6 shards: 67.9 / 69.0 / 69.5 / 69.3 / 68.9 / 68.6 min · worst 69.5 = 46% of the 150-min timeout
  8 shards (this run's count): 50.7 / 52.0 / 52.4 / 51.3 / 52.0 / 51.7 / 51.3 / 51.8 min · worst 52.4 = 35% of the 150-min timeout
  10 shards: 42.0 / 41.5 / 41.1 / 41.4 / 40.5 / 42.3 / 41.1 / 40.9 / 41.6 / 40.8 min · worst 42.3 = 28% of the 150-min timeout
```

The first run under this PR is the measurement the count was chosen without; its verdict log is
where the real projection lives from then on. Frozen tags: `phase93` (the newest baseline) is
published and `phase92` is a declared refusal no re-dispatch recovers, so nothing was owed before
this workflow edit.

**Noted, not this session's:** `bloom-export-watertight`'s preflight hit its 90-min limit on #485
(58.6 min on the previous head). It is a different workflow with a different cause (Node-only
instruments, no shard), and its own reconciliation reads censuses the same way, so the
`jobClauses` / `headroomClauses` shape applies there too if wanted — a separate change.
