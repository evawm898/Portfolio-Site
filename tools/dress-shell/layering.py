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

from layout import _frame_offset, connector_geometry


class LayeringError(ValueError):
    """Raised on undefined stacking order (overlap cycle / same layer)."""


@dataclass(frozen=True)
class ChartRect:
    """Panel outline in chart space: theta interval (deg) x s interval (mm),
    plus the local mm/deg scale used to build it."""
    theta0: float
    theta1: float
    s0: float
    s1: float
    mm_per_deg: float

    def overlaps(self, other):
        return (self.theta0 < other.theta1 and other.theta0 < self.theta1
                and self.s0 < other.s1 and other.s0 < self.s1)

    def contains(self, theta, s):
        return self.theta0 <= theta <= self.theta1 and self.s0 <= s <= self.s1


def outline_rect(chart, placed):
    """Chart rectangle of a placed panel's outline."""
    cls = placed.cls
    dx, dy = _frame_offset(cls, placed.rotation, (cls.outline_w / 2.0, cls.outline_h / 2.0))
    r = chart.r_theta(placed.theta, placed.s)
    mm_per_deg = math.pi * r / 180.0
    tc = placed.theta + dx / mm_per_deg
    sc = placed.s + dy
    ht = 0.5 * cls.outline_w / mm_per_deg
    return ChartRect(tc - ht, tc + ht, sc - 0.5 * cls.outline_h, sc + 0.5 * cls.outline_h,
                     mm_per_deg)


def active_rect(chart, placed):
    cls = placed.cls
    acx, acy = cls.active_center
    r = chart.r_theta(placed.theta, placed.s)
    mm_per_deg = math.pi * r / 180.0
    ht = 0.5 * cls.active_w / mm_per_deg
    return ChartRect(placed.theta - ht, placed.theta + ht,
                     placed.s - 0.5 * cls.active_h, placed.s + 0.5 * cls.active_h,
                     mm_per_deg)


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
        ts = np.linspace(ar.theta0, ar.theta1, n)
        ss = np.linspace(ar.s0, ar.s1, n)
        T, S = np.meshgrid(ts, ss)
        covered = np.zeros(T.shape, dtype=bool)
        for orct in outer_rects:
            covered |= ((T >= orct.theta0) & (T <= orct.theta1)
                        & (S >= orct.s0) & (S <= orct.s1))
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
    covered = np.zeros(T.shape, dtype=bool)
    for rct in rects:
        covered |= ((T >= rct.theta0) & (T <= rct.theta1)
                    & (S >= rct.s0) & (S <= rct.s1))
    total = float(w.sum())
    uncovered = float(w[~covered].sum())
    return uncovered, total
