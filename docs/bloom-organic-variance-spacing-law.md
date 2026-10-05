# Organic variance, build 3 — the spacing law (RULED)

**Ruled by Eva:** spacing is the PITCH-DENSITY law. The pitch is `1 + A·g`, and the azimuths
are its integral, `F(θ) = θ + (A/f)·sin(fθ + φ)`. This is the discovery's own §2a law, the
one the A 0.9 maximum was ruled on. On the fan, span-conserving renormalisation is accepted.
Its worst case, `(1 − A)/(1 + A)` (0.053 at A 0.9), is reported and not clamped.

The build is recorded in `docs/bloom-organic-variance-spacing-outcome.md`. This doc records
the settlement that came before any geometry. The numbers are from
`node tools/bloom-spacing-laws.mjs` (Node only, no geometry, about a second).

## 0. A correction to the framing, kept rather than rewritten away

The brief asked "what does HEADROOM mean for spacing", and the first version of this doc
answered in those terms. **That framing was wrong, and so was the brief's premise that the
three amounts share one composition law.**

- **Headroom is FORM's fix.** Form adds a delta to a BOUNDED control, so the delta has to be
  kept out of the control's range end. That is `min(half, max − base)`, in
  `resolveRoleOverrides`.
- **Size has no headroom.** It is a plain factor, `1 + A·g`, with no bound.
- **Spacing has no headroom either.** Its pitch only has to stay positive.

So there are three amounts and two shapes. That is correct, not inconsistent.

Places found that implied one shared composition law across the amounts:

- **The brief** ("the SAME composition law as size and form: HEADROOM scaling"). It is not a file.
- **This doc's own first version**: its title, §3's framing and its question. All three are
  corrected here.
- **Its tool**, `tools/bloom-spacing-headroom-laws.mjs`. It is renamed `tools/bloom-spacing-laws.mjs`
  and its header is corrected.
- **`docs/bloom-organic-variance-discovery.md` §1** ("a per-slot record … resolved by the same
  composition law (base, then the group rows …, then the slot term, clamp once)"). This sentence
  sits under a table covering size, spacing and form, but it is true of FORM only. Size went
  through `slot.scale`, and spacing through the whorl primitive's azimuth. It is annotated in
  place.

**`CLAUDE.md` had none:** its size and form blocks describe each law separately. That is two
files plus the brief, four places in all.

## 1. Reconciliation against `main` (at `1740881`)

| brief says | source says |
|---|---|
| rulings from `4847eba` (#248) | confirmed (`docs/bloom-state-of-play.md:58`, `docs/bloom-organic-variance-discovery.md` §9) |
| size and form share headroom | **size has no headroom** (§0) |
| "clamping … pinned 30 % of petals … in build 1" | **build 2 (form)**, at curl −180 on the shipping default (form outcome §12, §19). Build 1 never clamped. |
| "−1.170 mm overlap pinned by VS5" | **VS5 pins −1.1944 mm** (`NEIGHBOUR_DEFAULT_SKIN_GAP_MM`, re-recorded by the apex nib from the discovery's −1.1701). |
| 1,504 crossing pairs at 8 petals | That is the discovery's one-off cross-shell census (§2). **No gate reads it, so it is not a baseline.** |
| one shared frequency | confirmed, and it is an **integer** (`Math.round`), which is what makes the ring law exact |
| the four pair hazards | `state-of-play-oct-5` §5d. Measured under the built field in the outcome doc. |

## 2. Why a direct offset on the azimuth was ruled out

The circular version takes the per-slot azimuth OFFSET as the quantity, with the gap to the
neighbour as moved bounding it (law **c**). That is a fixed point. Resolving it in slot order
versus reverse order places the same petal up to **42°** apart (8 petals, f 1). Its
non-circular forms fail in other ways:

| law | what goes wrong |
|---|---|
| **b1**, room = the base gap | Neighbours meet at A 0.5 and swap order beyond it: **10 of 16** tabled states at A 0.9 |
| **b2**, room = half the gap | Safe, but a weaker look. Tightest pitch at f 1 is **0.682** at 8 petals and **0.930** at 40, against the ruled 1 − A |

The apex mutant table carries `spacing-is-a-direct-azimuth-offset` as the law's own witness
against these.

## 3. Why the ruled law never binds — a property, not an apology

The pitch is `1 + A·g ≥ 1 − A > 0` for every A < 1. So the azimuth map is **strictly
monotonic**: order is preserved, and nothing can cross or coincide. Every pair's angular
separation shrinks by at most a factor of 1 − A, at any frequency, including aliased ones.

Coincidence arrives only at A = 1. That is duplicate geometry, J7's own clause, and it is why
the maximum sits at 0.9 below it. Nothing is scaled and nothing is clamped, because there is no
range end for the pitch to be driven into.

**The measurement of that property:** over 3–40 petals × f 0–20 × every phase in 5° steps, the
tightest pitch is **0.1010 of nominal**, and **0** states cross.

The ring needs no renormalisation: an integer frequency integrates to zero over a turn, and
the ramp's integral `D(w) = −w + w²/2π` vanishes at both ends. The fan must hold its derived
span and notch (J7), so the density is renormalised over the half-arc,
`F(t) = sign(t)·H·P(|t|)/P(H)`. Its floor is `(1 − A)/(1 + A)` of the base step.

## 4. The closest approach the 0.9 maximum permits (angle)

**0.101 of the nominal pitch:** 4.5° at 8 petals, 0.9° at 40. The drawn blade approach and
the instruments under the built field are in the outcome doc.
