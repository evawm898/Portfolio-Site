"""layout.yaml — the committed source of truth — and mirroring logic.

AUTHORING MODEL
  Only one side is authored: entries must have theta >= 0 (theta == 0 is
  a single, unpaired, center-front panel). An entry with mirrored: true
  gets a DERIVED twin at -theta at load time; twins are never stored and
  are not independently editable — re-deriving after any edit updates
  them by construction.

MIRRORING SEMANTICS
  A twin cannot be a reflection: reflection is orientation-reversing and
  no physical panel can undergo it. The panel decomposes into
    - MIRRORABLE (software): rendered content. A 180-degree physical
      rotation is compensated by rotating the framebuffer 180 degrees;
      the per-panel `content_rotation` field tracks this and rides along
      into the export. It equals the physical rotation by definition
      today, but is carried explicitly because export consumers need it.
    - NOT MIRRORABLE (physical): outline, bezel offsets, connector origin
      and exit vector, driver footprint. Identity or 180 only. (180 =
      reflection composed with a vertical flip: it corrects horizontal
      bezel asymmetry but relocates the connector to the opposite edge.)

  The twin's ACTIVE AREA CENTER is constrained to (-theta, s) exactly.
  Rotation is then chosen by priority:
    1. Connector escape legality (routing usually forces this, so it
       wins). Geometric legality here; occlusion/burial is layering-time.
    2. If both rotations are legal: minimize OUTLINE ASYMMETRY — the
       distance between the twin's outline and where a true reflection
       would put it. Same rotation as the source costs 2|ex|, the
       opposite costs 2|ey|, where (ex, ey) is the active center's offset
       from the outline center. Ties keep the source's rotation.
  If neither rotation is legal the twin is marked INVALID with reasons.
  Every twin records its outline asymmetry in mm for the summary.

CONNECTOR LEGALITY (geometric, this layer)
  The connector origin and its exit path (a straight run of the class's
  escape_mm in the tangent chart) must stay on the panel's own piece:
  they may not cross the side seams at theta = +-90 (FRONT and BACK are
  separate pieces) and may not run off the top edge or the hem edge.
  Occlusion by other panels is a separate, layering-level check.

CHART MATH
  Panels are rigid and small relative to the shell, so layout works in
  the (theta, s) chart with the local metric: lateral millimetres convert
  to degrees through the local circumferential radius |P_theta| =
  sqrt(a^2 cos^2 theta + b^2 sin^2 theta), evaluated at the point's own
  height. Curvature/standoff fidelity comes from the seating analysis,
  not from this chart.

Uses only the stable public API of shell.py / coords.py.
"""

import math
import re
from dataclasses import dataclass

import numpy as np
import yaml

from panels import PanelClass


class LayoutError(ValueError):
    """Raised when layout.yaml is structurally or semantically invalid."""


_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
ROTATIONS = (0, 180)


@dataclass(frozen=True)
class AuthoredPanel:
    panel_id: str
    class_id: str
    theta: float        # degrees, authored side: >= 0
    s: float            # mm along the profile from the waist
    rotation: int       # 0 or 180
    layer: int          # stacking index, innermost = 0
    mirrored: bool      # derive a twin at -theta


@dataclass(frozen=True)
class PlacedPanel:
    panel_id: str
    cls: PanelClass
    theta: float
    s: float
    rotation: int           # physical: 0 or 180, never a reflection
    content_rotation: int   # framebuffer counter-rotation (== rotation)
    layer: int
    is_twin: bool
    source_id: str
    valid: bool
    problems: tuple         # human-readable strings; non-empty iff not valid
    asymmetry_mm: float = None  # twins only: outline distance from true reflection


# ---------------------------------------------------------------------------
# chart adapter over the stable milestone-1 API

def wrap180(deg):
    return (deg + 180.0) % 360.0 - 180.0


class SurfaceChart:
    """(theta, s) chart helpers built on ShellModel/ShellCoords."""

    def __init__(self, model, coords):
        self.model = model
        self.coords = coords
        self.s_min = coords.s_min
        self.s_max = coords.s_max
        # waist seam band: keep-out ring around s = 0, also the cable bus
        self.band_halfwidth = float(getattr(model.params,
                                            "waist_band_halfwidth", 0.0))

    def r_theta(self, theta_deg, s):
        """Chart metric: mm of section arc per radian of theta. theta is
        EQUAL-ARC, so this is P(z)/2pi — uniform around each ring by
        construction (trap #1 handled at the source)."""
        z = float(self.coords.z_of_s(float(np_clip(s, self.s_min, self.s_max))))
        return float(self.model.section_perimeter(z)) / math.tau

    def offset_point(self, theta, s, dx_mm, dy_mm):
        """Move from (theta, s) by panel-frame offsets: dx lateral mm
        (+ = +e_theta), dy meridian mm (+ = hemward)."""
        s2 = s + dy_mm
        r = self.r_theta(theta, s2)
        return theta + math.degrees(dx_mm / r), s2


def np_clip(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def piece_of(theta):
    """FRONT for |theta| < 90, BACK otherwise; returns (name, center)."""
    lam = wrap180(theta)
    return ("FRONT", 0.0) if abs(lam) < 90.0 else ("BACK", 180.0)


def _local_angle(theta, piece_center):
    return wrap180(theta - piece_center)


# ---------------------------------------------------------------------------
# seating a class definition at a pose (chart level)

def _frame_offset(cls, rotation, local_xy):
    """Panel-local point -> (dx_mm, dy_mm) offsets from the ACTIVE CENTER
    in the seated frame (rotation 180 spins the part about its active
    center; the active rectangle is invariant, everything else moves)."""
    acx, acy = cls.active_center
    dx, dy = local_xy[0] - acx, local_xy[1] - acy
    return (-dx, -dy) if rotation == 180 else (dx, dy)


def connector_geometry(chart, cls, theta, s, rotation):
    """Connector origin and exit-path end in (theta, s). The waist seam
    band is the cable bus: an escape run heading into the band TERMINATES
    at the band edge rather than running to (or past) the bare waistline."""
    dx, dy = _frame_offset(cls, rotation, cls.connector_origin)
    c_theta, c_s = chart.offset_point(theta, s, dx, dy)
    ex, ey = cls.connector_exit
    if rotation == 180:
        ex, ey = -ex, -ey
    e_theta, e_s = chart.offset_point(c_theta, c_s, ex * cls.escape_mm, ey * cls.escape_mm)
    band = chart.band_halfwidth
    if band > 0.0 and abs(c_s) > band and abs(e_s) < abs(c_s):
        edge = band if c_s > 0 else -band
        if (c_s - edge) * (e_s - edge) < 0.0:   # the run crosses the band edge
            t = (c_s - edge) / (c_s - e_s)
            e_theta = c_theta + t * (e_theta - c_theta)
            e_s = edge
    return (c_theta, c_s), (e_theta, e_s)


def tail_run_mm(chart, cls, theta, s, rotation):
    """Meridian distance from the connector origin to the waist seam band
    edge (the cable bus) — the tail-length metric. Terminates AT the band,
    not the bare waistline."""
    (c_theta, c_s), _ = connector_geometry(chart, cls, theta, s, rotation)
    return max(0.0, abs(c_s) - chart.band_halfwidth)


def connector_problems(chart, cls, theta, s, rotation):
    """Geometric legality of the connector at this pose; [] if legal.
    Both coordinates vary monotonically along the straight exit path, so
    checking origin and end covers the whole run."""
    piece, center = piece_of(theta)
    (c_theta, c_s), (e_theta, e_s) = connector_geometry(chart, cls, theta, s, rotation)
    problems = []
    for tag, (t, sv) in (("connector origin", (c_theta, c_s)),
                         ("connector escape end", (e_theta, e_s))):
        if sv < chart.s_min - 1e-9:
            problems.append(f"{tag} runs off the top edge (s {sv:.1f} < {chart.s_min:.1f})")
        if sv > chart.s_max + 1e-9:
            problems.append(f"{tag} runs off the hem edge (s {sv:.1f} > {chart.s_max:.1f})")
        if abs(_local_angle(t, center)) >= 90.0 - 1e-9:
            problems.append(f"{tag} crosses the {piece} piece seam "
                            f"(theta {wrap180(t):.1f})")
    return problems


def outline_problems(chart, cls, theta, s, rotation):
    """The outline must sit inside its piece, on the shell, and clear of
    the waist seam band (keep-out ring around s = 0)."""
    piece, center = piece_of(theta)
    problems = []
    s_vals = []
    for corner in ((0.0, 0.0), (cls.outline_w, 0.0),
                   (cls.outline_w, cls.outline_h), (0.0, cls.outline_h)):
        dx, dy = _frame_offset(cls, rotation, corner)
        t, sv = chart.offset_point(theta, s, dx, dy)
        s_vals.append(sv)
        if sv < chart.s_min - 1e-9 or sv > chart.s_max + 1e-9:
            problems.append(f"outline corner off the shell (s {sv:.1f} outside "
                            f"[{chart.s_min:.1f}, {chart.s_max:.1f}])")
        if abs(_local_angle(t, center)) >= 90.0 - 1e-9:
            problems.append(f"outline crosses the {piece} piece seam "
                            f"(corner theta {wrap180(t):.1f})")
    band = chart.band_halfwidth
    if band > 0.0 and min(s_vals) < band - 1e-9 and max(s_vals) > -band + 1e-9:
        problems.append(
            f"footprint intersects the waist seam band (keep-out +-{band:g} mm "
            f"around s = 0; the band is the cable bus)")
    return problems


# ---------------------------------------------------------------------------
# twin derivation

def outline_asymmetry_mm(cls: PanelClass, source_rotation: int, twin_rotation: int):
    """Distance between the twin's outline and where a true reflection of
    the source would put it. With the active center pinned to the mirrored
    position, keeping the source's rotation misses reflection by twice the
    active center's LATERAL offset from the outline center; flipping 180
    misses it by twice the VERTICAL offset."""
    ex = cls.active_center[0] - cls.outline_w / 2.0
    ey = cls.active_center[1] - cls.outline_h / 2.0
    return 2.0 * abs(ex) if twin_rotation == source_rotation else 2.0 * abs(ey)


def derive_twin(chart, cls, source: AuthoredPanel):
    """Twin of a mirrored source: active center at (-theta, s) exactly.
    Rotation priority: (1) connector escape legality; (2) among legal
    rotations, minimize outline asymmetry, ties keeping the source's
    rotation. Neither legal -> INVALID twin, reasons attached."""
    twin_theta = -source.theta
    other = ROTATIONS[1] if source.rotation == ROTATIONS[0] else ROTATIONS[0]
    candidates, tried = [], []
    for rotation in (source.rotation, other):  # tie-break order: source first
        problems = (outline_problems(chart, cls, twin_theta, source.s, rotation)
                    + connector_problems(chart, cls, twin_theta, source.s, rotation))
        if problems:
            tried.append((rotation, problems))
        else:
            candidates.append(rotation)

    def _twin(rotation, valid, problems):
        return PlacedPanel(
            panel_id=f"{source.panel_id}~twin", cls=cls,
            theta=twin_theta, s=source.s,
            rotation=rotation, content_rotation=rotation,
            layer=source.layer, is_twin=True, source_id=source.panel_id,
            valid=valid, problems=problems,
            asymmetry_mm=outline_asymmetry_mm(cls, source.rotation, rotation),
        )

    if candidates:
        best = min(candidates,
                   key=lambda r: outline_asymmetry_mm(cls, source.rotation, r))
        return _twin(best, True, ())
    reasons = tuple(f"rotation {rot}: {p}" for rot, probs in tried for p in probs)
    return _twin(source.rotation, False,
                 ("INVALID twin: no legal transform",) + reasons)


def asymmetry_summary(placed):
    """(per-pair list, worst, mean) of twin outline asymmetry in mm —
    how far the authored design actually is from true symmetry."""
    pairs = [(p.source_id, p.rotation, p.asymmetry_mm)
             for p in placed if p.is_twin and p.valid]
    if not pairs:
        return [], 0.0, 0.0
    values = [a for _, _, a in pairs]
    return pairs, max(values), sum(values) / len(values)


def assert_face_normals(chart, placed):
    """ASSERTION: every panel's display face normal must align with the
    shell's outward normal, twins included. Both allowed transforms are
    proper rotations, so this holds identically — a failure means an
    orientation-reversing transform (a reflection) crept in somewhere."""
    for p in placed:
        f = chart.coords.forward(p.theta, p.s)
        sign = -1.0 if p.rotation == 180 else 1.0
        face_normal = np.cross(sign * f["e_theta"], sign * f["e_s"])
        if float(face_normal @ f["normal"]) <= 0.0:
            raise LayoutError(
                f"{p.panel_id}: display face normal opposes the shell outward "
                f"normal — an orientation-reversing transform crept in"
            )


def resolve_layout(chart, classes, authored):
    """Authored entries -> full placed list (sources + derived twins).
    Returns (placed, errors). Sources with geometric problems are placed
    but carry them; unknown classes are errors and are skipped."""
    placed, errors = [], []
    for entry in authored:
        cls = classes.get(entry.class_id)
        if cls is None:
            errors.append(f"{entry.panel_id}: unknown panel class '{entry.class_id}' "
                          f"(library has {', '.join(sorted(classes))})")
            continue
        problems = tuple(outline_problems(chart, cls, entry.theta, entry.s, entry.rotation)
                         + connector_problems(chart, cls, entry.theta, entry.s, entry.rotation))
        placed.append(PlacedPanel(
            panel_id=entry.panel_id, cls=cls, theta=entry.theta, s=entry.s,
            rotation=entry.rotation, content_rotation=entry.rotation,
            layer=entry.layer, is_twin=False,
            source_id=entry.panel_id, valid=not problems, problems=problems,
        ))
        if entry.mirrored:
            placed.append(derive_twin(chart, cls, entry))
    assert_face_normals(chart, placed)
    return placed, errors


# ---------------------------------------------------------------------------
# layout.yaml IO — canonical, lossless

_HEADER = """\
# Dress panel layout — SOURCE OF TRUTH. Committed to the repo; read and
# written by the editor (and hand-editable).
#
# Authoring is one-sided: theta >= 0 only. Entries with mirrored: true get
# a twin DERIVED at -theta on load; twins are never stored here. theta is
# degrees (0 = center front, + = wearer's left); s is mm of meridian arc
# from the waist (- = bodice, + = skirt); (theta, s) is the panel's ACTIVE
# AREA CENTER. rotation is 0 or 180. layer counts outward from the shell.
"""

_ENTRY_KEYS = {"id", "class", "theta", "s", "rotation", "layer", "mirrored"}


def load_layout(path):
    """Parse layout.yaml -> list[AuthoredPanel]. Fails loudly, listing
    every problem."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except FileNotFoundError:
        raise LayoutError(f"layout file not found: {path}") from None
    except yaml.YAMLError as exc:
        raise LayoutError(f"layout file is not valid YAML: {exc}") from None

    errors = []
    if not isinstance(data, dict) or set(data.keys()) != {"version", "panels"}:
        raise LayoutError(f"invalid layout {path}: top level must have exactly "
                          f"the keys 'version' and 'panels'")
    if data["version"] != 1:
        errors.append(f"version: expected 1, got {data['version']!r}")
    entries = data["panels"]
    if entries is None:
        entries = []
    if not isinstance(entries, list):
        raise LayoutError(f"invalid layout {path}: 'panels' must be a list")

    authored, seen = [], set()
    for i, node in enumerate(entries):
        where = f"panels[{i}]"
        if not isinstance(node, dict):
            errors.append(f"{where}: expected a mapping")
            continue
        missing = _ENTRY_KEYS - node.keys()
        unknown = node.keys() - _ENTRY_KEYS
        if missing:
            errors.append(f"{where}: missing key(s): {', '.join(sorted(missing))}")
        if unknown:
            errors.append(f"{where}: unknown key(s): {', '.join(sorted(map(str, unknown)))}")
        if missing or unknown:
            continue

        pid = node["id"]
        if not isinstance(pid, str) or not _ID_RE.match(pid) or "~" in pid:
            errors.append(f"{where}.id: must match [A-Za-z0-9][A-Za-z0-9_-]* "
                          f"('~' is reserved for derived twins), got {pid!r}")
            continue
        if pid in seen:
            errors.append(f"{where}.id: duplicate id '{pid}'")
            continue
        seen.add(pid)
        where = f"panels[{i}] '{pid}'"

        ok = True

        def num(key, kind=float):
            nonlocal ok
            v = node[key]
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
                errors.append(f"{where}.{key}: expected a finite number, got {v!r}")
                ok = False
                return None
            if kind is int and not isinstance(v, int):
                errors.append(f"{where}.{key}: expected an integer, got {v!r}")
                ok = False
                return None
            return kind(v)

        theta, s = num("theta"), num("s")
        rotation, layer = num("rotation", int), num("layer", int)
        cls_id, mirrored = node["class"], node["mirrored"]
        if not isinstance(cls_id, str) or not cls_id:
            errors.append(f"{where}.class: expected a class id string, got {cls_id!r}")
            ok = False
        if not isinstance(mirrored, bool):
            errors.append(f"{where}.mirrored: expected true/false, got {mirrored!r}")
            ok = False
        if not ok:
            continue

        if theta < 0.0 or theta > 180.0:
            errors.append(f"{where}.theta: authored side only — must be in [0, 180], "
                          f"got {theta}")
        if rotation not in ROTATIONS:
            errors.append(f"{where}.rotation: must be 0 or 180, got {rotation}")
        if layer < 0:
            errors.append(f"{where}.layer: must be >= 0, got {layer}")
        if mirrored and theta == 0.0:
            errors.append(f"{where}: theta == 0 panels are single and unpaired — "
                          f"mirrored must be false")
        if mirrored and theta == 180.0:
            errors.append(f"{where}: theta == 180 mirrors onto itself — "
                          f"mirrored must be false")

        authored.append(AuthoredPanel(pid, cls_id, theta, s, rotation, layer, mirrored))

    if errors:
        bullets = "\n".join(f"  - {e}" for e in errors)
        raise LayoutError(f"invalid layout {path}:\n{bullets}")
    return authored


def _yaml_float(v):
    """repr() of a float round-trips binary64 exactly; ints stay ints in
    value but are stored as floats for theta/s uniformity."""
    return repr(float(v))


def dump_layout(authored):
    """Canonical text for layout.yaml. Same input -> byte-identical output,
    so save(load(x)) is a fixed point."""
    lines = [_HEADER, "version: 1", "panels:"]
    if not authored:
        lines[-1] = "panels: []"
    for p in authored:
        lines += [
            f"  - id: {p.panel_id}",
            f"    class: {p.class_id}",
            f"    theta: {_yaml_float(p.theta)}",
            f"    s: {_yaml_float(p.s)}",
            f"    rotation: {int(p.rotation)}",
            f"    layer: {int(p.layer)}",
            f"    mirrored: {'true' if p.mirrored else 'false'}",
        ]
    return "\n".join(lines) + "\n"


def save_layout(path, authored):
    text = dump_layout(authored)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return text
