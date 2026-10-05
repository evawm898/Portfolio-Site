# Organic variance, build 3 — what "headroom" means for spacing

**Status: stopped before any geometry, waiting on Eva's ruling.** No generator file changed.
The numbers below come from `node tools/bloom-spacing-headroom-laws.mjs` (Node only, no geometry,
about a second). It places one RADIAL whorl's slot azimuths under four candidate laws at the ruled
maximum A = 0.9, using the shipped wave (`varianceWave`: an integer frequency, `cos(f·θ + φ)`, the
ring ramp at f = 0).

## 1. Reconciliation against `main`

`main`'s head is `1740881`, so nothing has landed since the brief's reference point. Checked
against the source:

| brief says | source says |
|---|---|
| rulings from `4847eba` (#248) | confirmed (`docs/bloom-state-of-play.md:58`, `docs/bloom-organic-variance-discovery.md` §9) |
| "the SAME composition law as size and form: HEADROOM scaling" | **size has no headroom.** `sizeVarianceField` is a plain factor `1 + A·g` on ±50 %, with no range end. Headroom is form's alone (`resolveRoleOverrides`, `bloom-geometry.js:1851`). |
| "clamping … pinned 30 % of petals at a range end in build 1" | **that was build 2 (form)**, at curl −180 on the shipping default (form outcome §12, §19). Build 1 never clamped. |
| 1.17 mm overlap, 1,504 crossing pairs at 8 petals | confirmed (discovery §2: −1.170 mm, 1,504). `neighbourFlag` and VS5 pin −1.1701. **The 1,504 is the discovery's one-off cross-shell census; no gate reads it.** |
| one shared frequency | confirmed, and it is an **integer** (`Math.round`). That is what makes the ring law below exact. |
| the four pair hazards | `state-of-play-oct-5` §5d: curl × twist, cup × roll, cup × tipShape, leafAngle × stem. All four are `self` (the representative petal against itself) or leaf against stem. A spacing field moves each petal rigidly about the axis, so it **cannot** reach any of them. That is a prediction, not a measurement. |

## 2. Headroom on the offset is circular

The brief's reading takes the per-slot azimuth OFFSET as the quantity and the gap to the moved
neighbour as its room (law **c**). That is a fixed point: petal i's room depends on where i ± 1
went, and theirs depend on i. Resolving it in slot order gives one answer; resolving it in reverse
order gives another. **Measured, the two orders place the same petal up to 42° apart at 8 petals,
f 1.** Any rule that picks one order breaks the symmetry the wave is supposed to have, and on a FAN
it breaks evenness about the mirror line. **On the offset, headroom is not well defined.**

There are two non-circular versions of headroom on the offset. Neither works:

- **b1, room = the base gap to the neighbour's base position.** Two neighbours both spend their
  full room toward each other, so the gap becomes `p·(1 + A·(g_{i+1} − g_i))`. That reaches
  coincidence at A = 0.5 and crosses beyond it. At A 0.9, **10 of 16 tabled states swap petal order
  round the axis**: every f 0 ramp and every f ≥ 3. It is unsafe exactly where the ruled range lives.
- **b2, room = half the base gap (each petal confined to its own nominal sector).** This is safe:
  the tightest pitch is at least 1 − A. But it is a different, weaker look, because the variation
  is bounded by the difference between neighbouring g values rather than by g itself. At f 1 the
  tightest pitch is **0.682** at 8 petals and **0.930** at 40. The discovery measured, and the
  ruling was made on, **1 − A** (§2a; at 8 petals and A 0.95 the nearest feet sit at 0.106 of a
  foot width).

## 3. Headroom on the pitch is well defined, and it never binds

Law **a** takes the varied quantity to be the **local pitch density**, measured in units of the
amount-0 pitch:

- base 1
- min 0 (coincidence)
- half-span 1

Headroom gives `deltaDown = min(1, 1 − 0) = 1` and `deltaUp = min(1, max − 1) = 1`. Any max at or
above 2 satisfies this; conservation of the turn puts max at n. So the density is `ρ = 1 + A·g`, and
the azimuths are its integral:

- f ≥ 1: `F(θ) = θ + (A/f)·sin(fθ + φ)`
- f 0, the ramp: `θ + A·(D(w) − D(w₀))`, where `D(w) = −w + w²/2π`

This is not circular. The room is measured from the BASE pitch, exactly as form's room is measured
from the amount-0 composition, and no neighbour's position enters it. It is the discovery's §2a law
term for term, the one A 0.9 and "coincidence at A = 1" were ruled on. Because `F′ = 1 + A·cos ≥ 1 − A`
everywhere, every pair's angular separation shrinks by at most a factor of 1 − A, for any frequency
including aliased ones. **Measured over n 3..40 × f 0..20 × phase 0..355 in steps of 5: tightest
pitch 0.1010 of nominal, 0 states crossed.**

**What makes this a ruling rather than an implementation detail:** on the pitch, headroom NEVER
BINDS. The room equals the half-span at every slot, so the composition law is satisfied vacuously.
The whole safety guarantee is the fixed maximum A ≤ 0.9 < 1, with nothing scaled and nothing clamped.
For form, headroom does work at the range ends. For spacing it does none. That is a different
statement from "the same composition law", and I am not willing to pass it off as one.

Two further consequences follow if law a is ruled. Both are recorded here so they get ruled rather
than discovered:

- **The FAN.** The fan's arc must hold its derived span and notch, which J7 asserts. `∫₀ᴴ (1 + A·cos ft) dt`
  equals H only when sin(fH) = 0, so the fan law must renormalise the density over the half-arc.
  That is conservation of the span, not a clamp. The worst-case floor becomes (1 − A)/(1 + A) of the
  base pitch (0.053 at A 0.9), not 1 − A. The ring needs no renormalisation, because the integer
  frequency integrates to zero over a turn.
- **One map of the circle.** F is a single monotone map of the circle, so every azimuth the bloom
  emits keeps its cyclic order: every whorl, the CONTINUOUS spiral and the sepals. Whether the sepals
  (ruling 5: their own field, not built in either previous build) follow F, keeping
  `sepalPhase 0.5` interleaved between the graded petals, or stay at nominal and lose the interleave,
  is the same question in a second place.

## 4. The closest approach the 0.9 maximum permits (law a, angle only)

**0.101 of the nominal pitch.** That is 4.5° at 8 petals and 0.9° at 40.

On the shipping 8-petal hub (ring 8.84 mm) that puts two feet' centres about 0.70 mm apart, against
a 6.40 mm foot. The discovery's own crowding row at A 0.95 reads NN 0.106 foot widths.

The DRAWN blade approach, the crowding raster and the census are not measured here. They need the
geometry, which this session did not build.

## 5. The question

> On spacing, is headroom the PITCH-density law (law a: ρ = 1 + A·g, room measured from the
> amount-0 pitch to coincidence, which never binds below A = 1 so the fixed 0.9 maximum is the whole
> guarantee, plus span-conserving renormalisation on the fan), or is the vacuous headroom a reason
> to rule it differently?
