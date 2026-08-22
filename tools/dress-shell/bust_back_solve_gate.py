#!/usr/bin/env python3
"""REPORT ONLY — explicitly not adopted (per review: "Do not adopt it — I
want to see whether it looks like a body before it becomes the shape").

Q: what b_back(v) makes the derived (compound, mean-Ramanujan) circumference
hit the tape exactly at all four anchors, holding a(v) and b_front(v) at
their current (plateau-generated) values?

At any one height v, compound_perimeter(a, bf, bb) = 0.5*(Ram(a,bf) + Ram(a,bb))
depends on bb ONLY at that height — no coupling between anchors — so
"minimize residual across all four anchors" reduces to four independent
scalar solves, each exact when feasible: solve bb such that
Ram(a, bb) = 2*tape - Ram(a, bf). bodice.solve_a_given_b is symmetric in
its two axis arguments (Ramanujan's formula doesn't care which is which),
so it's reused directly rather than writing a second solver.

Run: cd tools/dress-shell && python3 bust_back_solve_gate.py
"""

import numpy as np

from bodice import _perimeter_np, solve_a_given_b
from compound import compound_perimeter
from front_silhouette import DEFAULT_TAPE_ANCHORS
from shell import ShellModel, dress_params


def main():
    base = ShellModel(dress_params(bust="plateau"))   # the now-approved bust base
    print("=" * 78)
    print("b_back SOLVE — minimize circumference residual at all four anchors,")
    print("a(v) and b_front(v) HELD at the plateau-generated baseline")
    print("=" * 78)
    print(f"{'anchor':<12}{'v':>8}{'a':>9}{'b_front':>10}{'b_back*':>10}"
         f"{'ratio f/b':>11}{'derived':>10}{'tape':>9}{'residual':>10}")

    rows = []
    for label, v, tape_mm in DEFAULT_TAPE_ANCHORS:
        a_v = float(np.asarray(base.a(v)))
        bf_v = float(np.asarray(base.b(v)))
        target_back_perimeter = 2.0 * tape_mm - _perimeter_np(a_v, bf_v)
        try:
            bb_v = float(solve_a_given_b(np.array(target_back_perimeter), np.array(a_v)))
            feasible = True
            derived = compound_perimeter(a_v, bf_v, bb_v)
            residual = derived - tape_mm
        except ValueError as exc:
            bb_v, feasible, derived, residual = float("nan"), False, float("nan"), float("nan")
            infeasible_reason = str(exc)
        ratio = bf_v / bb_v if feasible else float("nan")
        rows.append((label, v, a_v, bf_v, bb_v, ratio, derived, tape_mm, residual, feasible))
        if feasible:
            print(f"{label:<12}{v:>8.1f}{a_v:>9.2f}{bf_v:>10.2f}{bb_v:>10.2f}"
                 f"{ratio:>11.3f}{derived:>10.2f}{tape_mm:>9.1f}{residual:>+10.4f}")
        else:
            print(f"{label:<12}{v:>8.1f}{a_v:>9.2f}{bf_v:>10.2f}   INFEASIBLE: {infeasible_reason}")

    print()
    print("STANDING RULE: residual reported above is the AT-THE-SOLVE-POINT")
    print("check (should be ~0 by construction — this is a 4-point exact solve,")
    print("not a fit). It says nothing about what happens BETWEEN anchors; no")
    print("curve is being proposed here, only four independent point solves.")
    print()

    feasible_rows = [r for r in rows if r[9]]
    print("=" * 78)
    print("DOES IT LOOK LIKE A BODY?")
    print("=" * 78)
    for label, v, a_v, bf_v, bb_v, ratio, *_ in feasible_rows:
        shallower = "back shallower than front" if bb_v < bf_v else "back DEEPER than front"
        print(f"  {label:<12} b_front {bf_v:7.2f} mm  b_back {bb_v:7.2f} mm  "
             f"({shallower}, front/back = {ratio:.3f})")
    print()
    print("This is a REPORT, not a proposal — no shape.yaml or dress_params()")
    print("default was touched. Whether the anchor-implied b_back schedule")
    print("reads as anatomically plausible (smooth, front deeper through the")
    print("bust, converging toward front at the waist, etc.) is a judgment call")
    print("for the numbers above, not something this script decides.")


if __name__ == "__main__":
    main()
