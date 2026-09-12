# The lobe / serration model — Eva's binding specification

**This file exists so that no future session has to be told this again.** Session 38
went looking for a record that does not exist; session 40 went looking for the same
record and recorded its absence a second time; session 41 was told to write this file
as its first commit. Read it before touching `widthProfile`'s lobes block, the `L`
assertion family, or any of the lobe controls.

## 0. The record that does not exist

Session 38's and session 40's briefs both instructed the session to read
`claude/lobes-serration-status.md` "in the project FIRST — it carries Eva's model and
every ruling". **That file is not in this repository and never has been.** Session 40
checked exhaustively: a filesystem search of the working tree, `git log --all
--diff-filter=A` over every path matching `*lobes-serration*`, and `git ls-tree -r`
over all remote heads after a `git fetch --prune`. Session 41's brief states the
reason plainly:

> claude/lobes-serration-status.md does NOT exist and never did — it lives in a Cowork
> project the sessions cannot read. Sessions 38 and 40 both went looking. Everything
> binding is in this prompt.

The same applies to `claude/edge-treatment-findings.md`, named in session 38's brief.
**Do not go looking for either file.** If a future brief names a record outside the
repository, the brief's own restatement of it is what binds, and this file is where the
restatement lives.

## 1. The model, verbatim

Quoted verbatim from session 41's brief, which is the binding statement:

> Serration and lobing are ONE generator at different settings: serration is high
> count / low depth / acute, lobing is low count / high depth / obtuse. Serration
> is NOT a separate feature to schedule; it is a region of this control space.
>
> The controls are:
>   - count      — how many
>   - coverage   — what fraction of the usable rim is treated, as an arc centred
>                  on the apex ("is it just twelve o'clock, or eleven through
>                  one, or the whole clock excluding six")
>   - depth      — how far the cut goes in
>   - notch angle — the included angle of the valley between teeth, obtuse through
>                  acute, to the limit where it is barely an angle at all
>   - crest point — how pointed the tooth's own peak is, round through sharp
>
> The rim is ONE CONTINUOUS CURVE and the apex is a point on it, not a boundary.
> Apex treatment must be indistinguishable from side treatment. Cuts go IN, never
> out. The outline stays single-valued — split and cleft petals are out of scope
> at every parameter value.

Three consequences that have each been re-derived at least once and are therefore
written down here rather than left to be rediscovered:

* **Serration is not a schedulable feature.** A session proposing "add serration"
  is proposing to add a second generator, which this model forbids. What serration
  needs is for the existing control space to REACH it — which, before session 41,
  it could not: the count ceiling was 2.
* **Coverage is an arc centred on the apex**, measured from twelve outward,
  excluding six. So **the apex is the one arc coverage never removes** — which is
  why session 40's finding that the relief fades toward the apex cannot be
  mitigated by coverage (§2 below). A coverage that excluded twelve would be an
  annulus, which the clock model rules out.
* **Split and cleft petals are out of scope at every parameter value.** Every cap
  derived on the lobe controls (`depthCap`, the pitch floor, the count caps) exists
  to keep that true, and none of them may be relaxed to reach a shape.

## 2. What session 41 was asked to build, verbatim

> THIS SESSION BUILDS THE LAW ONLY. Model B (the continuous rim) is the next PR.
>
> 1. REPLACE THE CUT FAMILY. sin(pi*x)^(2q) is parabolic at its minimum for every
>    exponent, so the notch included angle is 180 degrees across the whole range —
>    session 40 established this as an identity, not a reading. No range change
>    fixes it. The family is wrong.
>
>    Build a family with TWO independent shape parameters: notch angle and crest
>    point, each spanning round to sharp, independently. Eva described them
>    separately and they are separate quantities, so two controls is not a
>    registration-rule violation — the rule forbids two controls moving one
>    quantity, not one control per quantity.
>
>    Prefer the superellipse family already established by petalTipShape (n,
>    0.60-3.00) if it fits, so the generator carries one law family rather than
>    two. If it does not fit, say why and propose what does. Report the reachable
>    (notch angle, crest angle) pairs as a measured region, not a claim.
>
>    lobeTipShape's current meaning is retired. That is a partition event on every
>    lobed row — predeclare the partition and confirm it.
>
> 2. DEPTH IS PROPORTIONAL to local half-width, per session 40: absolute severs
>    the blade. But session 40 also measured relief fading 2.37 / 1.92 / 0.93 mm
>    across three successive notches toward the tip. Report what the new law does
>    to that fade. Do not fix it here — Model B changes where the teeth sit and
>    the fix belongs there — but measure it so the next session has a baseline.
>
> 3. THE RESOLUTION DEMAND MUST CARRY SHARPNESS, not just count. Session 40
>    measured the floor varying 10 / 11 / 8 at q 0.50 / 1.00 / 2.00 — it peaks in
>    the middle, opposite to what I predicted. Re-measure it across the new law's
>    two-parameter space and make the ladder's demand a function of both shape
>    parameters. The turning-rate ladder remains the SINGLE owner of row
>    placement; it takes a demand, it does not get a second placer.
>
> 4. REPORT THE COUNT CEILING under the new law, at every coverage. It is 2 today
>    on the shipping tree and that is why serration is unreachable. Say what it
>    becomes, and say plainly how much of the remaining gap to serration is
>    Model B's to close rather than this PR's.
>
> 5. TWO IMAGES, both macro, print preview ON, same-tree control reported:
>    (a) the two shape controls as a 3x3 grid — notch angle against crest point,
>        fixed count and depth — so Eva can see they are independent.
>    (b) the same three cells session 40 rendered (serration / midpoint / lobing)
>        on the new law, at whatever counts are now actually reachable, labelled
>        with all five control values.

And the composition requirement, which is a constraint on the law's FORM rather than
a deliverable:

> Design the cut law to COMPOSE. A second, shorter-wavelength term riding on
> the first (doubly-serrate teeth on each lobe) is a plausible later ask, and
> retrofitting composition is expensive where designing for it now is nearly
> free. Do not build the second level. Do state, in one paragraph, what adding
> it would cost under the law you chose, and confirm the law does not foreclose
> it — a formulation where the two levels cannot superpose is the wrong one.

And the verification standard:

> VERIFICATION. The self-intersection census is the verdict — V4/V5 are blind to
> folds. New gate rows are added BEFORE the feature and seen red. Predeclare the
> byte partition and confirm it. Every gate clause names where its reference value
> comes from, and that source is independent of the quantity under test — A8's
> first clause, session 38's seam-floor-removed and A7's exact-zero bar were all
> the same defect: a gate reading its number from the thing it checks cannot fail.

## 3. Where the answers live

| question | answered in |
|---|---|
| Which rim model is shipped (MODEL A, as an identity) | `docs/bloom-session-40-outcome.md` §0 |
| Why one exponent cannot carry both ends of the range | `docs/bloom-session-40-outcome.md` §1 |
| Why depth is proportional and absolute severs the blade | `docs/bloom-session-40-outcome.md` §2 |
| The resolution floor as a function of the shape | `docs/bloom-session-40-outcome.md` §3 |
| The count ceiling on both rim models | `docs/bloom-session-40-outcome.md` §4 |
| The apex join, its two corners, and what Model B does to them | `docs/bloom-session-38-outcome.md` §B10.3, `docs/bloom-session-40-outcome.md` §0b |
| The samples-per-lobe floor's own derivation | `tools/bloom-lobe-resolution.mjs` (header) |
| The cut law that ships, and the family that was rejected | `docs/bloom-session-41-outcome.md` |

