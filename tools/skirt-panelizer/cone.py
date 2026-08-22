"""Developable geometry for a truncated-cone (bell) skirt.

The skirt is modeled as a truncated cone defined by three measurements:
waist circumference, hem circumference, and slant height (waist to hem
along the fabric). A cone is developable, so it unrolls exactly onto a
flat annular sector; all panel placement happens in that 2D developed
space.

Developed-space convention: polar coordinates about the annulus center
(the cone apex). `s` is the developed radius — identical to slant
distance from the apex — and `phi` is the angle from the sector
bisector (center front). The pattern is viewed from the outside of the
garment. Units are mm and radians throughout.
"""

import math
from dataclasses import dataclass


class ConeError(ValueError):
    """Raised when the skirt measurements do not describe a valid cone."""


@dataclass(frozen=True)
class DevelopedCone:
    waist_circumference: float
    hem_circumference: float
    slant_height: float
    inner_radius: float
    outer_radius: float
    sweep_angle: float  # radians

    @classmethod
    def from_measurements(cls, waist: float, hem: float, slant: float) -> "DevelopedCone":
        for name, value in (("waist", waist), ("hem", hem), ("slant", slant)):
            if not (isinstance(value, (int, float)) and math.isfinite(value) and value > 0):
                raise ConeError(f"{name} must be a positive number, got {value!r}")
        if hem <= waist:
            raise ConeError(
                f"hem circumference ({hem}mm) must exceed waist circumference "
                f"({waist}mm) — a bell skirt flares outward"
            )
        # Unrolling: both circles become concentric arcs sharing one sweep
        # angle, so  r_in * sweep = waist  and  (r_in + slant) * sweep = hem.
        sweep = (hem - waist) / slant
        if sweep > math.tau:
            raise ConeError(
                f"measurements are not a cone: unrolled sweep would be "
                f"{math.degrees(sweep):.1f} degrees (> 360)"
            )
        inner = waist / sweep
        return cls(waist, hem, slant, inner, inner + slant, sweep)

    @property
    def half_angle(self) -> float:
        """Cone half-angle (between the axis and a ruling line), so the 3D
        circle radius at slant distance s is  s * sin(half_angle)."""
        return math.asin(self.sweep_angle / math.tau)

    def radius_3d(self, s: float) -> float:
        """3D radius of the horizontal circle at developed radius s."""
        return s * math.sin(self.half_angle)

    def transverse_curvature_radius(self, s: float) -> float:
        """Radius of curvature of the cone's normal section transverse to
        the ruling at developed radius s.

        This — not the horizontal circle radius — is the curvature a rigid
        flat panel bridges when its long axis lies along a ruling. By
        Meusnier's theorem it equals radius_3d(s) / cos(half_angle),
        i.e. s * tan(half_angle).
        """
        return s * math.tan(self.half_angle)

    @property
    def sector_area(self) -> float:
        """Area of the developed annular sector (= area of the fabric)."""
        return 0.5 * self.sweep_angle * (self.outer_radius**2 - self.inner_radius**2)
