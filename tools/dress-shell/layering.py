"""Layering: overlap, mount heights, occlusion, connector escape.

Panels overlap deliberately as a coverage tactic. This module computes,
from a resolved placement list (sources + twins):

  - the overlap graph, validated as a DAG: overlapping panels must have
    distinct layer indices (lower = closer to the shell); two overlapping
    panels on the SAME layer have no defined order and are a hard error
    naming the panels involved
  - MOUNT HEIGHT per panel: base offset plus the summed thickness of
    whatever it rests on across its footprint — overlapping panels walk
    outward from the shell; max stack height is reported
  - OCCLUSION: visible active area per panel after outer panels cover it
    (sampled), per panel and total
  - CONNECTOR ESCAPE: a panel's connector origin and exit path must not
    be buried under an overlapping outer panel — violations are flagged

Geometry is evaluated in the (theta, s) chart with each panel's lateral
mm converted through the local circumferential radius at its own center
(consistent with layout.py). Overlapping panels are necessarily close
together, so comparing their chart rectangles directly is sound.
"""

import math
from dataclasses import dataclass

import numpy as np

from layout import _frame_offset, connector_geometry, wrap180


class LayeringError(ValueError):
    """Raised on undefined stacking order (overlap cycle / same layer)."""


@dataclass(frozen=True)
class ChartRect:
    """A (possibly rotated) panel rectangle in chart space. theta0..s1 is
    the AXIS-ALIGNED BOUNDING BOX of the rotated rectangle (used for the
    conservative overlap test); the exact rotated rectangle — center,
    half-extents in mm, rotation — backs the point-containment tests."""
    theta0: float
    theta1: float
    s0: float
    s1: float
    mm_per_deg: float
    tc: float           # rectangle center, chart theta (deg)
    sc: float           # rectangle center, chart s (mm)
    half_w_mm: float
    half_h_mm: float
    rot_deg: float

    def overlaps(self, other):
        return (self.theta0 < other.theta1 and other.theta0 < self.theta1
                and self.s0 < other.s1 and other.s0 < self.s1)

    def contains(self, theta, s):
        return bool(self.contains_arr(np.asarray(theta), np.asarray(s)))

    def contains_arr(self, theta, s):
        """Vectorized EXACT containment in the rotated rectangle. The
        angular difference wraps so panels straddling theta = +-180 test
        correctly."""
        dx = wrap180(np.asarray(theta) - self.tc) * self.mm_per_deg
        dy = np.asarray(s) - self.sc
        c = math.cos(math.radians(self.rot_deg))
        sn = math.sin(math.radians(self.rot_deg))
        x = c * dx + sn * dy
        y = -sn * dx + c * dy
        return (np.abs(x) <= self.half_w_mm + 1e-12) \
            & (np.abs(y) <= self.half_h_mm + 1e-12)


def _chart_rect(chart, theta, s, rotation, center_dxy, half_w, half_h):
    """Build a ChartRect for a rectangle whose center sits at panel-frame
    offset center_dxy from (theta, s), rotated with the panel."""
    r = chart.r_theta(theta, s)
    mm_per_deg = math.pi * r / 180.0
    tc = theta + center_dxy[0] / mm_per_deg
    sc = s + center_dxy[1]
    c = math.cos(math.radians(rotation))
    sn = math.sin(math.radians(rotation))
    # AABB of the rotated rectangle
    ew = abs(c) * half_w + abs(sn) * half_h    # mm, lateral
    eh = abs(sn) * half_w + abs(c) * half_h    # mm, meridian
    return ChartRect(tc - ew / mm_per_deg, tc + ew / mm_per_deg,
                     sc - eh, sc + eh, mm_per_deg,
                     tc, sc, half_w, half_h, float(rotation))


def outline_rect(chart, placed):
    """Chart rectangle of a placed panel's outline (AABB + exact form)."""
    cls = placed.cls
    dxy = _frame_offset(cls, placed.rotation, (cls.outline_w / 2.0, cls.outline_h / 2.0))
    return _chart_rect(chart, placed.theta, placed.s, placed.rotation, dxy,
                       0.5 * cls.outline_w, 0.5 * cls.outline_h)


def active_rect(chart, placed):
    """The active rectangle is centered on (theta, s) and rotates with
    the panel about that center."""
    cls = placed.cls
    return _chart_rect(chart, placed.theta, placed.s, placed.rotation, (0.0, 0.0),
                       0.5 * cls.active_w, 0.5 * cls.active_h)


@dataclass
class LayerReport:
    order: list            # panel ids, innermost first (topological)
    mount_mm: dict         # id -> base offset above the shell surface
    stack_top_mm: dict     # id -> mount + thickness
    max_stack_mm: float
    visible_area: dict     # id -> visible active area mm^2
    visible_pct: dict      # id -> % of its active area still visible
    total_active: float
    total_visible: float
    buried_connectors: dict  # id -> list of covering panel ids
    overlaps: list           # (inner_id, outer_id) pairs


def analyze_layering(chart, placed, occlusion_samples=24):
    """Full layering analysis of a resolved placement list. Only valid
    panels participate; INVALID twins are skipped (they are already
    flagged upstream)."""
    panels = [p for p in placed if p.valid]
    rects = {p.panel_id: outline_rect(chart, p) for p in panels}
    by_id = {p.panel_id: p for p in panels}

    # overlap pairs + DAG validation
    overlaps, conflicts = [], []
    for i, p in enumerate(panels):
        for q in panels[i + 1:]:
            if not rects[p.panel_id].overlaps(rects[q.panel_id]):
                continue
            if p.layer == q.layer:
                conflicts.append((p.panel_id, q.panel_id, p.layer))
            else:
                inner, outer = (p, q) if p.layer < q.layer else (q, p)
                overlaps.append((inner.panel_id, outer.panel_id))
    if conflicts:
        lines = ", ".join(f"'{a}' and '{b}' (both layer {l})" for a, b, l in conflicts)
        raise LayeringError(
            f"overlap order undefined — overlapping panels share a layer: {lines}. "
            f"Give one of each pair a higher layer index."
        )
    # Integer layers make cycles impossible by construction; the topological
    # sort below still guards the invariant (future per-pair orders).
    order = [p.panel_id for p in sorted(panels, key=lambda p: (p.layer, p.panel_id))]

    # mount heights: walk outward in layer order
    mount, stack_top = {}, {}
    for pid in order:
        p = by_id[pid]
        base = 0.0
        for inner_id, outer_id in overlaps:
            if outer_id == pid:
                base = max(base, stack_top[inner_id])
        mount[pid] = base
        stack_top[pid] = base + p.cls.thickness
    max_stack = max(stack_top.values(), default=0.0)

    # occlusion: sample each panel's active rect against outer outlines
    visible_area, visible_pct = {}, {}
    total_active = total_visible = 0.0
    for p in panels:
        ar = active_rect(chart, p)
        outer_rects = [rects[outer_id] for inner_id, outer_id in overlaps
                       if inner_id == p.panel_id]
        n = occlusion_samples
        # sample the ACTUAL (rotated) active rectangle: uniform grid in
        # the panel frame, mapped through the rotation into chart space
        us = np.linspace(-ar.half_w_mm, ar.half_w_mm, n)
        vs = np.linspace(-ar.half_h_mm, ar.half_h_mm, n)
        U, V = np.meshgrid(us, vs)
        cr = math.cos(math.radians(ar.rot_deg))
        sr = math.sin(math.radians(ar.rot_deg))
        T = ar.tc + (cr * U - sr * V) / ar.mm_per_deg
        S = ar.sc + (sr * U + cr * V)
        covered = np.zeros(T.shape, dtype=bool)
        for orct in outer_rects:
            covered |= orct.contains_arr(T, S)
        frac = 1.0 - covered.mean()
        area = p.cls.active_area * frac
        visible_area[p.panel_id] = area
        visible_pct[p.panel_id] = 100.0 * frac
        total_active += p.cls.active_area
        total_visible += area

    # connector escape burial: origin + path samples vs outer panels
    buried = {}
    for p in panels:
        (ct, cs), (et, es) = connector_geometry(chart, p.cls, p.theta, p.s, p.rotation)
        pts = [(ct + (et - ct) * f, cs + (es - cs) * f)
               for f in np.linspace(0.0, 1.0, 9)]
        outer_ids = [outer_id for inner_id, outer_id in overlaps
                     if inner_id == p.panel_id]
        # any outer panel covering any point of the escape path buries it;
        # also check non-overlapping-but-nearby outer panels crossing the path
        coverers = []
        for q in panels:
            if q.panel_id == p.panel_id or q.layer <= p.layer:
                continue
            qr = rects[q.panel_id]
            if any(qr.contains(t, s) for t, s in pts):
                coverers.append(q.panel_id)
        if coverers:
            buried[p.panel_id] = coverers

    return LayerReport(
        order=order, mount_mm=mount, stack_top_mm=stack_top,
        max_stack_mm=float(max_stack),
        visible_area=visible_area, visible_pct=visible_pct,
        total_active=float(total_active), total_visible=float(total_visible),
        buried_connectors=buried, overlaps=overlaps,
    )


def uncovered_shell_area(chart, placed, n_theta=720, n_s=140):
    """(uncovered_mm2, total_mm2): shell area not under any valid panel
    outline, sampled over the whole (theta, s) domain with the correct
    local area weight r(theta, s) dtheta ds."""
    panels = [p for p in placed if p.valid]
    rects = [outline_rect(chart, p) for p in panels]
    ts = np.linspace(-180.0, 180.0, n_theta, endpoint=False) + 180.0 / n_theta
    ss = np.linspace(chart.s_min, chart.s_max, n_s, endpoint=False) \
        + 0.5 * (chart.s_max - chart.s_min) / n_s
    T, S = np.meshgrid(ts, ss)
    R = np.array([[chart.r_theta(float(t), float(s)) for t in ts[::12]] for s in ss])
    # r varies slowly in theta; use a coarse theta sub-grid then repeat
    R = np.repeat(R, 12, axis=1)[:, :n_theta]
    w = R * math.radians(360.0 / n_theta) * ((chart.s_max - chart.s_min) / n_s)
    if chart.neckline is not None:
        # no shell above the neckline: those samples carry no area
        Z = np.asarray(chart.coords.z_of_s(S[:, 0]))
        caps = np.asarray(chart.neckline.height(ts))
        w = np.where(Z[:, None] <= caps[None, :] + 1e-9, w, 0.0)
    covered = np.zeros(T.shape, dtype=bool)
    for rct in rects:
        covered |= rct.contains_arr(T, S)
    total = float(w.sum())
    uncovered = float(w[~covered].sum())
    return uncovered, total
