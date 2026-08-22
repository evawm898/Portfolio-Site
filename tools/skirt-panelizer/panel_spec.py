"""Loading and hard validation of the panel library (panels.yaml).

Panel-local coordinate frame: origin at the outline's top-left corner,
+x to the right (across the width), +y downward (along the height),
viewed face-on. When placed on the skirt the panel's top edge (-y)
faces the waist. All values in mm.

The loader fails loudly: every problem found is collected and reported
in one PanelSpecError, including unknown keys (so typos can't silently
pass as defaults).
"""

import math
from dataclasses import dataclass

import yaml

PERIMETER_EPS = 0.01  # mm tolerance for "tail origin lies on the outline edge"


class PanelSpecError(ValueError):
    """Raised when panels.yaml is missing, malformed, or inconsistent."""


@dataclass(frozen=True)
class PanelSpec:
    panel_id: str
    outline_w: float
    outline_h: float
    active_w: float
    active_h: float
    active_offset: tuple  # (x, y) outline top-left -> active-area top-left
    tail_origin: tuple    # (x, y) on the outline perimeter
    tail_exit: tuple      # unit vector, panel frame
    min_bend_radius: float

    @property
    def active_center(self):
        return (self.active_offset[0] + self.active_w / 2.0,
                self.active_offset[1] + self.active_h / 2.0)

    @property
    def outline_area(self):
        return self.outline_w * self.outline_h


def _require_keys(node, expected, path, errors):
    if not isinstance(node, dict):
        errors.append(f"{path}: expected a mapping with keys {sorted(expected)}")
        return False
    missing = expected - node.keys()
    unknown = node.keys() - expected
    if missing:
        errors.append(f"{path}: missing required key(s): {', '.join(sorted(missing))}")
    if unknown:
        errors.append(f"{path}: unknown key(s): {', '.join(sorted(map(str, unknown)))}")
    return not missing


def _number(node, key, path, errors, positive=True):
    value = node.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        errors.append(f"{path}.{key}: expected a finite number, got {value!r}")
        return None
    if positive and value <= 0:
        errors.append(f"{path}.{key}: must be > 0, got {value}")
        return None
    return float(value)


def _pair(node, key, path, errors):
    value = node.get(key)
    ok = (isinstance(value, (list, tuple)) and len(value) == 2
          and all(isinstance(v, (int, float)) and not isinstance(v, bool)
                  and math.isfinite(v) for v in value))
    if not ok:
        errors.append(f"{path}.{key}: expected [x, y] with two finite numbers, got {value!r}")
        return None
    return (float(value[0]), float(value[1]))


def _parse_panel(panel_id, node, errors):
    path = f"panels.{panel_id}"
    if not _require_keys(node, {"outline", "active_area", "tail"}, path, errors):
        return None

    outline_w = outline_h = None
    if _require_keys(node.get("outline"), {"width", "height"}, f"{path}.outline", errors):
        outline_w = _number(node["outline"], "width", f"{path}.outline", errors)
        outline_h = _number(node["outline"], "height", f"{path}.outline", errors)

    active_w = active_h = offset = None
    if _require_keys(node.get("active_area"), {"width", "height", "offset"},
                     f"{path}.active_area", errors):
        active_w = _number(node["active_area"], "width", f"{path}.active_area", errors)
        active_h = _number(node["active_area"], "height", f"{path}.active_area", errors)
        offset = _pair(node["active_area"], "offset", f"{path}.active_area", errors)

    origin = exit_vec = bend = None
    if _require_keys(node.get("tail"), {"origin", "exit_vector", "min_bend_radius"},
                     f"{path}.tail", errors):
        origin = _pair(node["tail"], "origin", f"{path}.tail", errors)
        exit_vec = _pair(node["tail"], "exit_vector", f"{path}.tail", errors)
        bend = _number(node["tail"], "min_bend_radius", f"{path}.tail", errors)

    if None in (outline_w, outline_h, active_w, active_h, offset, origin, exit_vec, bend):
        return None

    # Cross-field consistency.
    if offset[0] < 0 or offset[1] < 0:
        errors.append(f"{path}.active_area.offset: must be non-negative, got {list(offset)}")
    elif offset[0] + active_w > outline_w + 1e-9 or offset[1] + active_h > outline_h + 1e-9:
        errors.append(
            f"{path}.active_area: does not fit inside the outline "
            f"(offset {list(offset)} + {active_w} x {active_h} exceeds "
            f"{outline_w} x {outline_h})"
        )

    ox, oy = origin
    inside = -PERIMETER_EPS <= ox <= outline_w + PERIMETER_EPS and \
             -PERIMETER_EPS <= oy <= outline_h + PERIMETER_EPS
    on_edge = (min(abs(ox), abs(ox - outline_w)) <= PERIMETER_EPS or
               min(abs(oy), abs(oy - outline_h)) <= PERIMETER_EPS)
    if not (inside and on_edge):
        errors.append(
            f"{path}.tail.origin: {list(origin)} must lie on the outline perimeter "
            f"(outline is {outline_w} x {outline_h}, tolerance {PERIMETER_EPS}mm)"
        )

    norm = math.hypot(*exit_vec)
    if norm < 1e-9:
        errors.append(f"{path}.tail.exit_vector: must be non-zero")
        return None
    exit_unit = (exit_vec[0] / norm, exit_vec[1] / norm)

    if errors:
        return None
    return PanelSpec(
        panel_id=str(panel_id),
        outline_w=outline_w, outline_h=outline_h,
        active_w=active_w, active_h=active_h,
        active_offset=offset,
        tail_origin=origin,
        tail_exit=exit_unit,
        min_bend_radius=bend,
    )


def load_panels(path):
    """Parse panels.yaml at `path` -> dict of panel_id -> PanelSpec.

    Raises PanelSpecError listing every problem found.
    """
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except FileNotFoundError:
        raise PanelSpecError(f"panel library not found: {path}") from None
    except yaml.YAMLError as exc:
        raise PanelSpecError(f"panel library is not valid YAML: {exc}") from None

    errors = []
    if not _require_keys(data, {"units", "panels"}, "(top level)", errors):
        raise PanelSpecError(_format(path, errors))

    if data.get("units") != "mm":
        errors.append(f"units: must be the literal string 'mm', got {data.get('units')!r}")

    panels_node = data.get("panels")
    if not isinstance(panels_node, dict) or not panels_node:
        errors.append("panels: expected a non-empty mapping of panel-id -> spec")
        raise PanelSpecError(_format(path, errors))

    specs = {}
    for panel_id, node in panels_node.items():
        spec = _parse_panel(panel_id, node, errors)
        if spec is not None:
            specs[spec.panel_id] = spec

    if errors:
        raise PanelSpecError(_format(path, errors))
    return specs


def _format(path, errors):
    bullets = "\n".join(f"  - {e}" for e in errors)
    return f"invalid panel library {path}:\n{bullets}"
