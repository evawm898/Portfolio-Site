"""Fit checks for rigid panels on the curved skirt surface."""

from dataclasses import dataclass

from cone import DevelopedCone
from panel_spec import PanelSpec


@dataclass(frozen=True)
class ChordGapResult:
    panel_index: int
    gap: float          # mm of lift-off at the chord center
    local_radius: float # transverse curvature radius used
    over_tolerance: bool


def chord_gap(cone: DevelopedCone, width: float, s: float) -> float:
    """Lift-off of a flat chord of `width` at developed radius `s`.

    A rigid panel bridges the cone's normal section transverse to the
    ruling; the sagitta of that chord is approximately w^2 / (8 R) with
    R the transverse curvature radius (Meusnier), not the horizontal
    circle radius.
    """
    return width**2 / (8.0 * cone.transverse_curvature_radius(s))


def check_course(cone: DevelopedCone, spec: PanelSpec, placed, tolerance: float):
    """Chord-gap check per placed panel, at its waist-side edge where the
    local radius is smallest — the reported gap is the worst case."""
    results = []
    for panel in placed:
        s = panel.top_radius
        gap = chord_gap(cone, spec.outline_w, s)
        results.append(ChordGapResult(
            panel_index=panel.index,
            gap=gap,
            local_radius=cone.transverse_curvature_radius(s),
            over_tolerance=gap > tolerance,
        ))
    return results
