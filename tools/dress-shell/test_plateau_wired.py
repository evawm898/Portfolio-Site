"""Tests for PlateauBustDepth wired into dress_params() as bust="plateau"
(review round 3: "wire PlateauBustDepth into dress_params() at the
approved settings"). bust="apex" stays dress_params()'s own DEFAULT for
the committed /dress shell — wiring plateau in as a selectable option is
a separate decision from repointing the shipped default, and this only
does the former.

Also covers the ShellModel.__new__ dispatch fix this uncovered:
PlateauBustDepth is a _BumpedDepth sibling of ApexBustDepth, not a
subclass of it, so the old `isinstance(depth, ApexBustDepth)` dispatch
check silently fell through to plain ShellModel for a plateau depth —
which ignores the bump field's angular variation entirely (treats
depth.b(z), the CF-only value, as if it applied uniformly around the
whole ring). Caught before shipping by checking type(m).__name__ against
what ApexShellModel actually needs to compute the bumped surface, not
just by checking the model builds without raising.

Run:  cd tools/dress-shell && python3 -m unittest test_plateau_wired -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np

from bust_apex import ApexShellModel, assert_cf_is_max, verify_plateau_placement
from shell import PLATEAU_CF_DEPTH_MM, PLATEAU_THETA_DEG, ShellModel, dress_params


class TestPlateauWiredIn(unittest.TestCase):
    def test_apex_stays_the_default(self):
        # regression: wiring plateau in must not repoint the committed shell
        m = ShellModel(dress_params())
        self.assertAlmostEqual(m.apex_depth.apex_theta_deg, 35.0)
        self.assertAlmostEqual(m.apex_depth.amplitude_mm, 35.4)

    def test_plateau_dispatches_to_apex_shell_model(self):
        # the dispatch bug: PlateauBustDepth is a _BumpedDepth sibling of
        # ApexBustDepth, not a subclass of it
        m = ShellModel(dress_params(bust="plateau"))
        self.assertIsInstance(m, ApexShellModel)
        self.assertIs(type(m), ApexShellModel)

    def test_plateau_dispatch_actually_uses_the_bump_field(self):
        # the observable consequence of the dispatch bug: without it,
        # a(181) is solved from depth.b(z) treated as a plain uniform
        # depth curve, not the true angularly-varying bumped field —
        # wrong by several mm, not just a different code path
        m = ShellModel(dress_params(bust="plateau"))
        a_dispatched = float(np.asarray(m.a(181.0)))
        # rebuild with the SAME depth object forced through plain
        # ShellModel (bypassing dispatch) to reproduce the bug directly
        params = dress_params(bust="plateau")
        buggy = object.__new__(ShellModel)
        ShellModel.__init__(buggy, params)
        a_buggy = float(np.asarray(buggy.a(181.0)))
        self.assertGreater(abs(a_dispatched - a_buggy), 1.0)

    def test_cf_depth_pinned_to_approved_value(self):
        m = ShellModel(dress_params(bust="plateau"))
        self.assertAlmostEqual(float(np.asarray(m.b(181.0))), PLATEAU_CF_DEPTH_MM, places=6)

    def test_cf_is_structurally_the_max(self):
        d = dress_params(bust="plateau").depth_curve
        self.assertLessEqual(assert_cf_is_max(d), 1e-6)

    def test_true_lateral_width_at_v181_is_87_5mm(self):
        # the approved theta (PLATEAU_THETA_DEG) was solved for exactly
        # this — reverify against the wired-in default, not just the
        # standalone solve, so a future base-depth change would be caught
        import math
        m = ShellModel(dress_params(bust="plateau"))
        d = m.apex_depth
        v = 181.0
        t_grid = np.linspace(0.0, math.pi, 4001)
        theta_ref = d._theta_ref(t_grid, np.full_like(t_grid, v))
        t_edge = float(np.interp(PLATEAU_THETA_DEG, theta_ref, t_grid))
        a_v = float(d.a(v))
        true_x = a_v * math.sin(t_edge)
        self.assertAlmostEqual(true_x, 87.5, delta=0.01)

    def test_bad_bust_value_message_mentions_plateau(self):
        from shell import ShellError
        with self.assertRaises(ShellError) as ctx:
            dress_params(bust="nonsense")
        self.assertIn("plateau", str(ctx.exception))

    def test_plateau_report_matches_wired_defaults(self):
        d = dress_params(bust="plateau").depth_curve
        rep = verify_plateau_placement(d)
        self.assertAlmostEqual(rep["crest_depth_mm"], PLATEAU_CF_DEPTH_MM, places=6)
        self.assertAlmostEqual(rep["bust_plateau_theta"], PLATEAU_THETA_DEG, places=6)


if __name__ == "__main__":
    unittest.main(verbosity=2)
