"""Placement of one concentric course of rigid panels in developed space.

Panels are placed radially (long axis along the cone's ruling lines),
top edge toward the waist. A rigid panel stays a true rectangle in the
developed plane — it does not curve with the annulus.

Symmetry contract: the ACTIVE-AREA centers sit at uniform angular pitch
(sweep / N), mirror-symmetric about the center-front line, with odd N so
the middle panel's active area is centered on center front. Outline and
tail positions are derived per panel from the spec, never mirrored: if
the active area sits off-center in the outline, every panel's centerline
is rotated by the same small correction so the active centers — not the
outlines — land on the symmetric angles.

Allowed per-panel transforms: identity and 180 degree rotation (about the
outline center). The transform must leave the tail exit vector with a
strictly inward (waist-pointing) radial component.

Frame: annulus center (apex) at the origin, angle phi measured from the
center-front bisector; a point at (s, phi) maps to Cartesian
(s*sin(phi), s*cos(phi)), i.e. center front points down +y. Viewed from
the outside of the garment. Units mm / radians.
"""

import math
from dataclasses import dataclass

from cone import DevelopedCone
from panel_spec import PanelSpec


class PlacementError(ValueError):
    """Raised when the requested course cannot be placed."""


@dataclass(frozen=True)
class PlacedPanel:
    index: int                 # 1-based, left to right across the pattern
    centerline_angle: float    # radians from center front
    rotation_deg: int          # 0 or 180
    top_radius: float          # developed radius of the waist-side edge
    bottom_radius: float       # developed radius of the hem-side edge
    outline_corners: tuple     # 4 (x, y) points, developed plane
    active_corners: tuple      # 4 (x, y) points
    active_center: tuple       # (x, y)
    tail_point: tuple          # (x, y) cable exit
    tail_direction: tuple      # unit vector, developed plane
    tail_run: float            # straight radial run from tail exit to the waist arc


def _transform_point(p, rot, w, h):
    """Panel-local point under the allowed transform (180 = rotation about
    the outline center)."""
    return (w - p[0], h - p[1]) if rot == 180 else p


def _map_to_plane(local, psi, s_top, outline_w):
    """Rigid placement of a panel-local point into the developed plane:
    panel centerline along the radial direction at angle psi, top edge at
    developed radius s_top."""
    u = (math.sin(psi), math.cos(psi))       # radial, outward
    t = (math.cos(psi), -math.sin(psi))      # tangential, toward increasing phi
    radial = s_top + local[1]
    lateral = local[0] - outline_w / 2.0
    return (radial * u[0] + lateral * t[0],
            radial * u[1] + lateral * t[1])


def place_course(cone: DevelopedCone, spec: PanelSpec, count: int,
                 course_offset: float):
    """Place `count` panels; returns (list of PlacedPanel, list of warnings)."""
    if count < 1 or count % 2 == 0:
        raise PlacementError(f"panel count must be odd and >= 1, got {count}")
    if course_offset < 0:
        raise PlacementError(f"course offset must be >= 0, got {course_offset}")

    s_top = cone.inner_radius + course_offset
    s_bottom = s_top + spec.outline_h
    if s_bottom > cone.outer_radius + 1e-9:
        raise PlacementError(
            f"panel does not fit radially: top edge {course_offset}mm below the "
            f"waist plus height {spec.outline_h}mm reaches {s_bottom - cone.inner_radius:.1f}mm, "
            f"but the slant height is only {cone.slant_height}mm"
        )

    # Transform selection: keep rotations whose placed tail exit vector has a
    # strictly inward radial component (local +y maps to radially outward,
    # so inward means transformed vy < 0). Identity preferred.
    allowed = []
    for rot in (0, 180):
        vy = -spec.tail_exit[1] if rot == 180 else spec.tail_exit[1]
        if vy < -1e-9:
            allowed.append(rot)
    if not allowed:
        raise PlacementError(
            f"panel '{spec.panel_id}': no allowed transform (identity / 180) "
            f"points the tail exit vector {list(spec.tail_exit)} toward the waist"
        )
    rot = allowed[0]

    # Where the (transformed) active center sits relative to the panel
    # centerline decides the common angular correction gamma: placing the
    # centerline at psi = phi - gamma puts the active center exactly at phi.
    ac = _transform_point(spec.active_center, rot, spec.outline_w, spec.outline_h)
    dx = ac[0] - spec.outline_w / 2.0
    gamma = math.atan2(dx, s_top + ac[1])

    pitch = cone.sweep_angle / count
    half_sweep = cone.sweep_angle / 2.0

    # Neighbor overlap is a hard error: panels are widest (angularly) at the
    # waist-side edge.
    panel_half_angle = math.atan2(spec.outline_w / 2.0, s_top)
    if 2.0 * panel_half_angle > pitch + 1e-9:
        raise PlacementError(
            f"{count} panels of width {spec.outline_w}mm overlap at developed "
            f"radius {s_top:.1f}mm: panel spans {math.degrees(2 * panel_half_angle):.2f} deg, "
            f"pitch is {math.degrees(pitch):.2f} deg"
        )

    warnings = []
    placed = []
    half_n = (count - 1) // 2
    for i, k in enumerate(range(-half_n, half_n + 1), start=1):
        phi = k * pitch
        psi = phi - gamma

        if abs(psi) + panel_half_angle > half_sweep + 1e-9:
            warnings.append(
                f"panel {i} crosses the pattern edge (center-back seam) by "
                f"{math.degrees(abs(psi) + panel_half_angle - half_sweep):.2f} deg"
            )

        outline_corners = tuple(
            _map_to_plane(p, psi, s_top, spec.outline_w)
            for p in ((0, 0), (spec.outline_w, 0),
                      (spec.outline_w, spec.outline_h), (0, spec.outline_h))
        )

        if rot == 180:
            aox = spec.outline_w - (spec.active_offset[0] + spec.active_w)
            aoy = spec.outline_h - (spec.active_offset[1] + spec.active_h)
        else:
            aox, aoy = spec.active_offset
        active_corners = tuple(
            _map_to_plane(p, psi, s_top, spec.outline_w)
            for p in ((aox, aoy), (aox + spec.active_w, aoy),
                      (aox + spec.active_w, aoy + spec.active_h),
                      (aox, aoy + spec.active_h))
        )
        active_center = _map_to_plane(ac, psi, s_top, spec.outline_w)

        tail_local = _transform_point(spec.tail_origin, rot, spec.outline_w, spec.outline_h)
        tail_point = _map_to_plane(tail_local, psi, s_top, spec.outline_w)
        vx, vy = spec.tail_exit if rot == 0 else (-spec.tail_exit[0], -spec.tail_exit[1])
        u = (math.sin(psi), math.cos(psi))
        t = (math.cos(psi), -math.sin(psi))
        tail_direction = (vy * u[0] + vx * t[0], vy * u[1] + vx * t[1])
        tail_run = math.hypot(*tail_point) - cone.inner_radius

        placed.append(PlacedPanel(
            index=i,
            centerline_angle=psi,
            rotation_deg=rot,
            top_radius=s_top,
            bottom_radius=s_bottom,
            outline_corners=outline_corners,
            active_corners=active_corners,
            active_center=active_center,
            tail_point=tail_point,
            tail_direction=tail_direction,
            tail_run=tail_run,
        ))

    return placed, warnings
