# HANDOFF — ROI proposer at one working resolution (PARKED)

**Remove this file before merge.** Ruling (Eva, Oct 22): park the proposer fix, do not drop it.
A Fable session builds the MEASUREMENT fix on top of this branch (`claude/stoic-cray-0ou0tn`),
and the two land together. Nothing here is merged; no PR is open.

The code is one commit, `f875431` — `propose_measurement_rois` becomes a resolution-normalising
front door onto `_propose_measurement_rois_at_scale` (`analysis/gauge_analysis.py`), and
`tests/app_path_scorecard.py` gains the resolution-invariance rows (0.5× / 1× / 2×). Pins in the
scorecard tests are NOT updated.

**Provenance of the numbers below.** The session that wrote `f875431` kept its measurement files
(`res_all.txt` among them) in a container that is gone. Every table here was RE-MEASURED from
`f875431` and from a worktree of its base `7e56e09` (main at the time) in a fresh container on
Oct 22, by `python tests/app_path_scorecard.py` on each tree (the base tree run with the branch's
scorecard file copied in, so it carries the same resolution rows) and three small probes. The
knit_05 placement figures reproduce the originals to the decimal.

## 1. Diagnosis — the 16 px fabric filter and its 97% requirement

`_fabric_mask` marks a pixel "fabric" when the local std-dev over a **16 px** box
(`ROI_PROPOSAL_BACKGROUND_BLOCK_PX`) is at least an ABSOLUTE 10 grey levels, and a candidate window
must be **≥ 97 %** fabric (`ROI_PROPOSAL_MIN_FABRIC_FRACTION`) before it is even scored. Both are
fixed PIXEL quantities tuned on ~170–350 px/in photos. On a fine photo a 16 px block sits inside one
smooth yarn strand, its std-dev falls under the floor, and real fabric reads as background — so
every window at every candidate size is rejected before scoring and the app proposes NOTHING.

1-inch windows on the proposer's own grid (stride 0.35 of the window), fabric fraction at the
photo's native resolution:

```
jersey          166.2 px/in  img 724x484  1-in windows fabric min/med/max 0.88/1.00/1.00  pass>=0.97: 55/60
teal            272.8 px/in  img 1200x1500  1-in windows fabric min/med/max 0.32/1.00/1.00  pass>=0.97: 81/130
knit_01         333.0 px/in  img 1962x1725  1-in windows fabric min/med/max 0.92/0.99/1.00  pass>=0.97: 155/195
knit_02        1187.0 px/in  img 3925x2617  1-in windows fabric min/med/max 0.35/0.40/0.47  pass>=0.97: 0/28
knit_05         320.0 px/in  img 1875x1946  1-in windows fabric min/med/max 0.21/0.78/0.93  pass>=0.97: 0/210
knit_06         468.4 px/in  img 1875x1312  1-in windows fabric min/med/max 0.73/1.00/1.00  pass>=0.97: 40/54
knit_08         346.0 px/in  img 1508x1008  1-in windows fabric min/med/max 0.81/1.00/1.00  pass>=0.97: 48/60
knit_09         187.0 px/in  img 1288x1079  1-in windows fabric min/med/max 0.25/1.00/1.00  pass>=0.97: 132/238
synth_jersey    180.0 px/in  img 960x720  1-in windows fabric min/med/max 1.00/1.00/1.00  pass>=0.97: 117/117
synth_garter    180.0 px/in  img 960x720  1-in windows fabric min/med/max 0.99/0.99/0.99  pass>=0.97: 117/117
synth_rib       180.0 px/in  img 960x720  1-in windows fabric min/med/max 1.00/1.00/1.00  pass>=0.97: 117/117
```

knit_02 (1187 px/in) and knit_05 (320 px/in) have **0 passing windows** at native resolution. The
same windows at 180 px/in:

```
knit_02 at 180 px/in (595x397): 1-in windows fabric min/med/max 0.85/0.90/0.99 pass>=0.97: 5/28
knit_05 at 180 px/in (1055x1095): 1-in windows fabric min/med/max 0.29/0.93/1.00 pass>=0.97: 95/210
```

(The other gates carry the same class of constant — the anomaly baseline's 16 px block,
the Laplacian sharpness ceiling, `MIN_PLAUSIBLE_SPACING_PX`, the quadrant split's 20 px minimum —
which is why the fix normalises the IMAGE rather than retuning one constant.)

## 2. The working scale — 180 px/in, never upscale

`ROI_PROPOSAL_WORKING_PX_PER_INCH = 180`. A photo finer than that is downsampled (INTER_AREA) for
PROPOSAL ONLY; the windows are chosen there and mapped back to the full-resolution image, which is
what analysis reads, untouched. A coarser photo is never upsampled — there is nothing finer to
recover, and an upscale only re-creates the smooth-strand problem.

Why 180: it is the synthetic fixtures' own scale (their 1× rows take the untouched path), it is
the coarsest value at which every ground-truth fixture is proposed at 0.5×, 1× and 2×, and above it
the 2×-upscaled synthetic garter loses its proposals again. Measured at 200 (the row that breaks):

| fixture | axis | 0.5× | 1× | 2× |
|---|---|---|---|---|
| synth_garter | wale / course | 3 areas | 3 areas | **0 areas** |

**Why not 160.** At 160 the resolution table (full table in §4c) reads *better* on one cell —
knit_05 course at 1× becomes `6.56 -2.0% u` instead of `12.55 +87.3% C` — and that cell is the
trap. It is not the working scale reading knit_05 correctly; it is the proposer landing its windows
a few pixels elsewhere, and on knit_05 a one-pixel move of the area flips the course reading
between the pitch and its half (§5). At 160 the same fixture still reads **+91.0 % confident at
0.5× and at 2×**, so the improvement exists at exactly one resolution, which is what placement luck
looks like. Choosing the working scale because it happens to land a lucky placement on a ground-truth
fixture would be tuning the instrument to the test set. 180 is chosen on a property (the synthetics'
own scale, the coarsest that proposes everywhere) and leaves the knit_05 defect visible, which is
the measurement session's to fix.

## 3. Before / after — the app path, correct scale from ground truth

Confident-and-wrong (status confident, |error| > 10 %): **main 1** (teal W) → **branch 2**
(teal W, knit_05 C), in both the "truth" and "ruler" calibration modes. The new one is not a
regression in a reading that existed: on main knit_05 proposed 0 areas and produced no reading.

**main (`7e56e09`)**

| fixture | areas | WPI true | WPI app | W err | W status | W per-area | CPI true | CPI app | C err | C status | C per-area |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jersey | 2 | 5.00 | 4.72 | -5.5% | confident | u u | 7.20 | 6.74 | -6.4% | confident | C C |
| teal | 3 | 4.00 | 3.56 | **-11.0%** | confident | u u u | 5.00 | 5.03 | +0.5% | confident | C C C |
| knit_01 | 2 | 3.80 | 3.93 | +3.4% | confident | u u | 5.70 | 5.95 | +4.3% | confident | C C |
| knit_02 | 0 (no proposals) | 4.00 | — | — | — | — | — | — | no truth | — | — |
| knit_05 | 0 (no proposals) | 4.70 | — | — | — | — | 6.70 | — | — | — | — |
| knit_06 | 3 | 3.80 | 3.64 | -4.3% | confident | u u u | 5.20 | 5.22 | +0.4% | confident | C C C |
| knit_08 | 4 | 4.50 | 4.44 | -1.4% | confident | u u u u | 6.90 | 7.06 | +2.3% | uncertain | C C C C |
| knit_09 | 4 | 5.10 | 5.05 | -0.9% | confident | u C u C | 7.60 | 7.60 | -0.0% | confident | C C C C |
| synth_jersey | 3 | 5.00 | 5.01 | +0.2% | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |
| synth_garter | 3 | 5.00 | 5.00 | +0.0% | confident | u u u | 7.00 | 7.01 | +0.1% | confident | C C C |
| synth_rib | 3 | 5.00 | 2.50 | +0.0% (alt) | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |

**branch (`f875431`)**

| fixture | areas | WPI true | WPI app | W err | W status | W per-area | CPI true | CPI app | C err | C status | C per-area |
|---|---|---|---|---|---|---|---|---|---|---|---|
| jersey | 2 | 5.00 | 4.72 | -5.5% | confident | u u | 7.20 | 6.74 | -6.4% | confident | C C |
| teal | 4 | 4.00 | 3.48 | **-13.0%** | confident | u u u u | 5.00 | 4.97 | -0.6% | confident | C C C C |
| knit_01 | 3 | 3.80 | 3.94 | +3.7% | confident | u u u | 5.70 | 3.98 | -30.2% | uncertain | C u C |
| knit_02 | 4 | 4.00 | 3.90 | -2.4% | confident | u u u u | — | — | no truth | — | — |
| knit_05 | 4 | 4.70 | 4.76 | +1.4% | confident | u u u u | 6.70 | 12.55 | **+87.3%** | confident | C C C C |
| knit_06 | 4 | 3.80 | 3.64 | -4.3% | confident | C u u u | 5.20 | 5.30 | +2.0% | confident | C C C C |
| knit_08 | 2 | 4.50 | 4.70 | +4.5% | confident | u u | 6.90 | 6.74 | -2.3% | confident | C C |
| knit_09 | 3 | 5.10 | 4.97 | -2.5% | confident | u C C | 7.60 | 7.53 | -0.9% | confident | C C C |
| synth_jersey | 3 | 5.00 | 5.01 | +0.2% | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |
| synth_garter | 3 | 5.00 | 5.00 | +0.0% | confident | u u u | 7.00 | 7.01 | +0.1% | confident | C C C |
| synth_rib | 3 | 5.00 | 2.50 | +0.0% (alt) | confident | u C C | 7.00 | 7.00 | +0.1% | confident | C C C |

What moved: knit_02 and knit_05 now get 4 areas each (were 0). knit_05 course reads a confident
half-pitch sub-harmonic (+87.3 %). knit_01 course drops to uncertain at −30.2 %, and knit_08 / knit_09
/ teal / knit_06 move a few percent with their new windows (knit_06 and teal now 4 areas). The
jitter table also flags knit_05 course UNSTABLE (±1 % of scale flips 12.55 ↔ 6.15–6.41).

## 4. Resolution invariance (the contents of `res_all.txt`)

Each photo resampled to 0.5×, 1×, 2× (INTER_AREA down, INTER_CUBIC up), calibrated correctly for
that resolution; cell = areas · per-inch · error · status; spread must be ≤ 10 % or carry an
`uncertain` status.

### 4a. branch (`f875431`, working scale 180)

| fixture | axis | 0.5× | 1× | 2× | spread | verdict |
|---|---|---|---|---|---|---|
| jersey | wale | 4 · 4.71 -5.9% C | 2 · 4.72 -5.5% C | 2 · 4.72 -5.5% C | 0.4% | agree |
| jersey | course | 4 · 6.80 -5.5% C | 2 · 6.74 -6.4% C | 2 · 6.76 -6.2% C | 0.9% | agree |
| teal | wale | 2 · 3.50 **-12.6%** C | 4 · 3.48 **-13.0%** C | 4 · 3.43 **-14.2%** C | 1.9% | agree |
| teal | course | 2 · 5.18 +3.7% C | 4 · 4.97 -0.6% C | 4 · 5.27 +5.4% C | 6.0% | agree |
| knit_01 | wale | 4 · 3.96 +4.3% C | 3 · 3.94 +3.7% C | 4 · 3.92 +3.1% C | 1.2% | agree |
| knit_01 | course | 4 · 5.70 +0.0% C | 3 · 3.98 -30.2% u | 4 · 5.91 +3.7% C | 48.5% | flagged |
| knit_02 | wale | 4 · 3.80 -4.9% C | 4 · 3.90 -2.4% C | 4 areas, no measurement | — | MISSING |
| knit_02 | course | 4 areas, no truth | 4 areas, no truth | 4 areas, no truth | 4985.3% | **DISAGREE** |
| knit_05 | wale | 4 · 4.78 +1.6% C | 4 · 4.76 +1.4% C | 4 · 4.85 +3.3% C | 1.9% | agree |
| knit_05 | course | 4 · 12.80 **+91.0%** C | 4 · 12.55 **+87.3%** C | 4 · 6.36 -5.0% u | 101.2% | flagged |
| knit_06 | wale | 4 · 3.66 -3.7% C | 4 · 3.64 -4.3% C | 4 · 3.64 -4.3% C | 0.6% | agree |
| knit_06 | course | 4 · 5.20 -0.1% C | 4 · 5.30 +2.0% C | 4 · 5.26 +1.2% C | 2.1% | agree |
| knit_08 | wale | 4 · 4.87 +8.3% C | 2 · 4.70 +4.5% C | 2 · 4.95 **+10.1%** C | 5.4% | agree |
| knit_08 | course | 4 · 7.33 +6.2% C | 2 · 6.74 -2.3% C | 2 · 6.56 -4.9% C | 11.8% | **DISAGREE** |
| knit_09 | wale | 3 · 4.92 -3.5% C | 3 · 4.97 -2.5% C | 3 · 5.01 -1.7% C | 1.9% | agree |
| knit_09 | course | 3 · 7.46 -1.8% C | 3 · 7.53 -0.9% C | 3 · 7.64 +0.6% C | 2.4% | agree |
| synth_jersey | wale | 3 · 5.00 +0.0% C | 3 · 5.01 +0.2% C | 3 · 5.05 +0.9% C | 0.9% | agree |
| synth_jersey | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
| synth_garter | wale | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 0.0% | agree |
| synth_garter | course | 3 · 7.00 +0.1% C | 3 · 7.01 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
| synth_rib | wale | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 0.0% | agree |
| synth_rib | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |

### 4b. main (`7e56e09`) — the same rows on the old proposer

| fixture | axis | 0.5× | 1× | 2× | spread | verdict |
|---|---|---|---|---|---|---|
| jersey | wale | 4 · 4.71 -5.9% C | 2 · 4.72 -5.5% C | 4 · 4.68 -6.3% C | 0.9% | agree |
| jersey | course | 4 · 6.80 -5.5% C | 2 · 6.74 -6.4% C | 4 · 6.62 -8.0% C | 2.7% | agree |
| teal | wale | 2 · 3.50 **-12.6%** C | 3 · 3.56 **-11.0%** C | 4 · 3.49 **-12.7%** C | 1.9% | agree |
| teal | course | 2 · 5.18 +3.7% C | 3 · 5.03 +0.5% C | 4 · 5.23 +4.5% C | 4.0% | agree |
| knit_01 | wale | 4 · 3.96 +4.3% C | 2 · 3.93 +3.4% C | 2 · 4.01 +5.6% C | 2.1% | agree |
| knit_01 | course | 4 · 5.70 +0.0% C | 2 · 5.95 +4.3% C | 2 · 6.19 +8.5% C | 8.5% | agree |
| knit_02 | wale | 0 areas | 0 areas | 0 areas | — | MISSING |
| knit_02 | course | 0 areas | 0 areas | 0 areas | — | MISSING |
| knit_05 | wale | 4 · 4.78 +1.6% C | 0 areas | 0 areas | — | MISSING |
| knit_05 | course | 4 · 12.80 **+91.0%** C | 0 areas | 0 areas | — | MISSING |
| knit_06 | wale | 4 · 3.67 -3.4% C | 3 · 3.64 -4.3% C | 0 areas | — | MISSING |
| knit_06 | course | 4 · 5.37 +3.3% C | 3 · 5.22 +0.4% C | 0 areas | — | MISSING |
| knit_08 | wale | 4 · 4.87 +8.3% C | 4 · 4.44 -1.4% C | 1 · 4.68 +3.9% C | 9.9% | agree |
| knit_08 | course | 4 · 7.33 +6.2% C | 4 · 7.06 +2.3% u | 1 · 6.94 +0.6% C | 5.6% | agree |
| knit_09 | wale | 3 · 4.92 -3.5% C | 4 · 5.05 -0.9% C | 2 · 5.07 -0.5% C | 3.1% | agree |
| knit_09 | course | 3 · 7.46 -1.8% C | 4 · 7.60 -0.0% C | 2 · 7.67 +0.9% C | 2.8% | agree |
| synth_jersey | wale | 3 · 5.00 +0.0% C | 3 · 5.01 +0.2% C | 0 areas | — | MISSING |
| synth_jersey | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0 areas | — | MISSING |
| synth_garter | wale | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 0 areas | — | MISSING |
| synth_garter | course | 3 · 7.00 +0.1% C | 3 · 7.01 +0.1% C | 0 areas | — | MISSING |
| synth_rib | wale | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 0 areas | — | MISSING |
| synth_rib | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0 areas | — | MISSING |

### 4c. branch with the working scale at 160 (rejected — see §2)

| fixture | axis | 0.5× | 1× | 2× | spread | verdict |
|---|---|---|---|---|---|---|
| jersey | wale | 4 · 4.71 -5.9% C | 2 · 4.72 -5.5% C | 2 · 4.72 -5.5% C | 0.4% | agree |
| jersey | course | 4 · 6.80 -5.5% C | 2 · 6.74 -6.4% C | 2 · 6.76 -6.2% C | 0.9% | agree |
| teal | wale | 2 · 3.50 **-12.6%** C | 4 · 3.48 **-13.0%** C | 4 · 3.50 **-12.6%** C | 0.5% | agree |
| teal | course | 2 · 5.18 +3.7% C | 4 · 4.97 -0.6% C | 4 · 5.12 +2.4% C | 4.3% | agree |
| knit_01 | wale | 4 · 3.96 +4.3% C | 3 · 3.90 +2.7% C | 4 · 3.90 +2.7% C | 1.6% | agree |
| knit_01 | course | 4 · 5.74 +0.7% C | 3 · 5.72 +0.4% C | 4 · 5.59 -2.0% u | 2.8% | agree |
| knit_02 | wale | 4 · 3.80 -4.9% C | 4 · 3.76 -6.1% C | 4 areas, no measurement | — | MISSING |
| knit_02 | course | 4 areas, no truth | 4 areas, no truth | 4 areas, no truth | 4977.2% | **DISAGREE** |
| knit_05 | wale | 4 · 4.78 +1.6% C | 4 · 4.85 +3.2% C | 4 · 4.85 +3.3% C | 1.6% | agree |
| knit_05 | course | 4 · 12.80 **+91.0%** C | 4 · 6.56 -2.0% u | 4 · 12.80 **+91.0%** C | 95.0% | flagged |
| knit_06 | wale | 4 · 3.71 -2.5% C | 4 · 3.70 -2.6% C | 4 · 3.72 -2.0% C | 0.6% | agree |
| knit_06 | course | 4 · 5.11 -1.7% C | 4 · 5.29 +1.7% C | 4 · 5.40 +3.9% C | 5.7% | agree |
| knit_08 | wale | 4 · 4.68 +3.9% C | 4 · 4.70 +4.5% C | 4 · 4.94 +9.8% C | 5.7% | agree |
| knit_08 | course | 4 · 7.39 +7.1% C | 4 · 6.62 -4.1% u | 4 · 7.28 +5.6% u | 11.7% | flagged |
| knit_09 | wale | 3 · 4.92 -3.5% C | 4 · 5.05 -0.9% C | 4 · 5.05 -0.9% C | 2.7% | agree |
| knit_09 | course | 3 · 7.46 -1.8% C | 4 · 7.50 -1.3% C | 4 · 7.72 +1.5% C | 3.4% | agree |
| synth_jersey | wale | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 3 · 5.04 +0.8% C | 0.8% | agree |
| synth_jersey | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |
| synth_garter | wale | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 3 · 5.00 +0.0% C | 0.0% | agree |
| synth_garter | course | 3 · 7.00 +0.1% C | 3 · 7.01 +0.1% C | 3 · 7.01 +0.1% C | 0.0% | agree |
| synth_rib | wale | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 3 · 2.50 +0.0% (alt) C | 0.0% | agree |
| synth_rib | course | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 3 · 7.00 +0.1% C | 0.0% | agree |

Reading the branch table: every fixture now gets areas at every resolution (main: 9 MISSING rows).
What still fails are READINGS, not proposals — knit_05 course reads half-pitch confidently at 0.5× and
1×; knit_02 at 2× produces "no measurement" (it reads an ~8 px sub-feature); knit_02 course has no
ground truth, so its 4985 % "spread" is the scorecard comparing readings with no truth to anchor them;
knit_08 course spreads 11.8 % while all three statuses say confident.

## 5. knit_05 placement evidence

The branch proposes a 640 px window at (933, 709) on knit_05 (320 px/in; true course pitch
320 / 6.7 = 47.8 px). Analysing that one area alone, and the same area moved ONE pixel right and down,
through `/analyze-multi`:

| area origin | course spacing_px | per inch | status | candidates_px |
|---|---|---|---|---|
| (933, 709) | **25.5** | 12.549 | confident | 25.5, 51.0, 102.0 |
| (934, 710) | **50.6** (50.636) | 6.320 | confident | 25.5, 51.0, 102.0 |

Same candidates, both confident, the chosen one doubles under a 1 px shift. This is the measurement's
defect (half-pitch selection on a knife edge), not the proposer's — the proposer only exposed it by
finally offering knit_05 any areas. That is why the fix is parked rather than shipped: shipping it
alone would trade "no reading" for "a confident wrong reading" on knit_05.

## 6. Timing (end to end per fixture, through the API)

One /propose-rois, every proposal accepted, one /analyze-multi. Wall-clock seconds measured with two
other scorecard runs on the same box at the same time, so compare WITHIN a row, not against an idle
machine. The headline is knit_02: proposal gets cheaper (0.25 s vs 1.35 s, it scans a 595×397 copy),
but end-to-end rises 1.35 → 9.16 s because its four 1-inch areas at 1187 px/in now get analysed —
main was fast only because it proposed nothing.

| fixture | image | propose main | propose branch | areas main → branch | analyze main | analyze branch | total main | total branch |
|---|---|---|---|---|---|---|---|---|
| jersey | 724x484 | 0.25 s | 0.37 s | 2 → 2 | 0.26 s | 0.27 s | 0.51 s | 0.64 s |
| teal | 1200x1500 | 0.43 s | 0.26 s | 3 → 4 | 1.11 s | 1.55 s | 1.54 s | 1.81 s |
| knit_01 | 1962x1725 | 1.32 s | 1.16 s | 2 → 3 | 0.99 s | 0.71 s | 2.31 s | 1.87 s |
| knit_02 | 3925x2617 | 1.35 s | 0.25 s | 0 → 4 | 0.00 s | 8.92 s | 1.35 s | 9.16 s |
| knit_05 | 1875x1946 | 0.25 s | 0.27 s | 0 → 4 | 0.00 s | 1.38 s | 0.25 s | 1.66 s |
| knit_06 | 1875x1312 | 0.31 s | 0.13 s | 3 → 4 | 1.61 s | 2.16 s | 1.93 s | 2.29 s |
| knit_08 | 1508x1008 | 0.81 s | 0.22 s | 4 → 2 | 0.57 s | 0.66 s | 1.38 s | 0.87 s |
| knit_09 | 1288x1079 | 0.27 s | 0.18 s | 4 → 3 | 1.43 s | 1.03 s | 1.71 s | 1.21 s |
| synth_jersey | 960x720 | 0.09 s | 0.08 s | 3 → 3 | 1.57 s | 1.37 s | 1.65 s | 1.45 s |
| synth_garter | 960x720 | 0.08 s | 0.08 s | 3 → 3 | 1.18 s | 1.18 s | 1.26 s | 1.26 s |
| synth_rib | 960x720 | 0.08 s | 0.07 s | 3 → 3 | 1.33 s | 1.12 s | 1.41 s | 1.19 s |

Whole scorecard: main 2 m 14 s, branch 8 m 53 s (mostly the extra analysis on knit_02 / knit_05 at
every resolution and jitter step).

### 6b. 4000 px photos (criterion 7), measured by the session that wrote `f875431`

The fixture upscaled or downscaled to a 4000 px long edge (INTER_CUBIC / INTER_AREA, JPEG q92),
calibrated correctly, through the API, local, **nothing else running on the box**:

| photo @4000 | propose main → branch | areas main → branch | whole request main → branch |
|---|---|---|---|
| jersey (4000x2674) | 0.80 → 0.42 s | 0 → 2 | 0.80 → 4.96 s |
| knit_01 (4000x3517) | 1.97 → 0.89 s | 2 → 4 | 3.52 → 8.36 s |
| knit_02 (4000x2667) | 1.11 → 0.09 s | 0 → 4 | 1.11 → 12.97 s |
| teal (3200x4000) | 3.31 → 0.25 s | 2 → 4 | 4.91 → 19.75 s |

The proposer is 2–12× faster. The whole request is slower, because areas now exist (or more and
larger ones get analysed) at full resolution, at ~5 s per 2-inch area at 4000 px. Teal at ~20 s
locally is a risk against the frontend's 75 s timeout on Render's free tier. Analysis-side
resolution normalisation, which the knit_02 2× failure needs anyway, would likely fix this too.

## 7. For the measurement session

- Success criteria the proposer fix alone fails: 2/3/4/7 of the brief (knit_05 course confident
  half-pitch on half its areas; knit_02 at 2× reads an 8 px sub-feature; end-to-end time on ~4000 px
  photos rises because areas now get analysed).
- The pins in `tests/test_app_path_scorecard.py` were deliberately not updated — re-pin once the
  measurement fix lands, and add the resolution rows' expectations then.
- Do not move `ROI_PROPOSAL_WORKING_PX_PER_INCH` to rescue a reading (§2).
- Analysis still reads the full-resolution image; downsampling the ANALYSIS for speed on ~4000 px photos
  is a separate decision with its own resolution-invariance obligation.
