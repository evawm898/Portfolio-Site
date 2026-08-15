"""Panel size-class library (panels.yaml) — loader with hard validation.

Panel-local frame: origin at the OUTLINE's top-left corner, +x right
(width), +y down (height), viewed face-on from outside the shell. When
seated, local +x follows +e_theta (wearer's left) and +y follows +e_s
(hemward) at rotation 0; rotation 180 flips both. Rotations are the ONLY
allowed transforms — the connector is fixed per class and can never be
mirrored.

The loader fails loudly: all problems are collected and raised together,
and unknown keys are errors so typos cannot pass silently.
"""

import math
from dataclasses import dataclass

import yaml


class PanelSpecError(ValueError):
    """Raised when panels.yaml is missing, malformed, or inconsistent."""


@dataclass(frozen=True)
class PanelClass:
    class_id: str
    outline_w: float
    outline_h: float
    thickness: float
    active_w: float
    active_h: float
    active_offset: tuple    # (x, y) outline origin -> active-area origin
    connector_origin: tuple  # (x, y) on the outline perimeter
    connector_exit: tuple    # unit vector, panel frame
    escape_mm: float         # required clear run of the connector exit path
    min_bend_radius_mm: float = None  # FPC minimum bend radius; None =
                                      # unverified, the cable-bus bend
                                      # check reports 'cannot verify'
    chipset: str = ""
    palette: tuple = ()
    refresh_s: float = None   # full image update, seconds; None = unverified
    price_usd: float = None   # list price; None = unknown
    requires_facet: bool = False  # seated on a flat facet, never conformed
    provenance: tuple = ()    # ((field, note), ...) — informational

    @property
    def active_center(self):
        return (self.active_offset[0] + self.active_w / 2.0,
                self.active_offset[1] + self.active_h / 2.0)

    @property
    def outline_area(self):
        return self.outline_w * self.outline_h

    @property
    def active_area(self):
        return self.active_w * self.active_h


PERIMETER_EPS = 0.01


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


def _parse_class(class_id, node, errors):
    path = f"classes.{class_id}"
    if not _require_keys(node, {"outline", "thickness", "active_area", "connector",
                                "chipset", "palette", "refresh_s", "price_usd",
                                "requires_facet", "provenance"},
                         path, errors):
        return None

    chipset = node.get("chipset")
    if not isinstance(chipset, str) or not chipset:
        errors.append(f"{path}.chipset: expected a non-empty string, got {chipset!r}")
    palette = node.get("palette")
    if not (isinstance(palette, list) and palette
            and all(isinstance(c, str) for c in palette)):
        errors.append(f"{path}.palette: expected a non-empty list of color names")
    refresh = node.get("refresh_s")
    if refresh is not None and (isinstance(refresh, bool)
                                or not isinstance(refresh, (int, float)) or refresh <= 0):
        errors.append(f"{path}.refresh_s: expected a positive number or null, got {refresh!r}")
    price = node.get("price_usd")
    if price is not None and (isinstance(price, bool)
                              or not isinstance(price, (int, float)) or price <= 0):
        errors.append(f"{path}.price_usd: expected a positive number or null, got {price!r}")
    facet = node.get("requires_facet")
    if not isinstance(facet, bool):
        errors.append(f"{path}.requires_facet: expected true/false, got {facet!r}")
    prov = node.get("provenance")
    if not (isinstance(prov, dict) and prov
            and all(isinstance(k, str) and isinstance(v, str) for k, v in prov.items())):
        errors.append(f"{path}.provenance: expected a non-empty mapping of "
                      f"field -> source note")

    ow = oh = None
    if _require_keys(node.get("outline"), {"width", "height"}, f"{path}.outline", errors):
        ow = _number(node["outline"], "width", f"{path}.outline", errors)
        oh = _number(node["outline"], "height", f"{path}.outline", errors)

    thickness = _number(node, "thickness", path, errors)

    aw = ah = offset = None
    if _require_keys(node.get("active_area"), {"width", "height", "offset"},
                     f"{path}.active_area", errors):
        aw = _number(node["active_area"], "width", f"{path}.active_area", errors)
        ah = _number(node["active_area"], "height", f"{path}.active_area", errors)
        offset = _pair(node["active_area"], "offset", f"{path}.active_area", errors)

    origin = exit_vec = escape = None
    bend = None
    if _require_keys(node.get("connector"), {"origin", "exit_vector", "escape_mm",
                                             "min_bend_radius_mm"},
                     f"{path}.connector", errors):
        origin = _pair(node["connector"], "origin", f"{path}.connector", errors)
        exit_vec = _pair(node["connector"], "exit_vector", f"{path}.connector", errors)
        escape = _number(node["connector"], "escape_mm", f"{path}.connector", errors)
        bend = node["connector"].get("min_bend_radius_mm")
        if bend is not None and (isinstance(bend, bool)
                                 or not isinstance(bend, (int, float)) or bend <= 0):
            errors.append(f"{path}.connector.min_bend_radius_mm: expected a "
                          f"positive number or null, got {bend!r}")
            bend = None

    if None in (ow, oh, thickness, aw, ah, offset, origin, exit_vec, escape):
        return None

    if offset[0] < 0 or offset[1] < 0:
        errors.append(f"{path}.active_area.offset: must be non-negative, got {list(offset)}")
    elif offset[0] + aw > ow + 1e-9 or offset[1] + ah > oh + 1e-9:
        errors.append(f"{path}.active_area: does not fit inside the outline "
                      f"({list(offset)} + {aw} x {ah} exceeds {ow} x {oh})")

    cx, cy = origin
    inside = -PERIMETER_EPS <= cx <= ow + PERIMETER_EPS and \
             -PERIMETER_EPS <= cy <= oh + PERIMETER_EPS
    on_edge = (min(abs(cx), abs(cx - ow)) <= PERIMETER_EPS or
               min(abs(cy), abs(cy - oh)) <= PERIMETER_EPS)
    if not (inside and on_edge):
        errors.append(f"{path}.connector.origin: {list(origin)} must lie on the outline "
                      f"perimeter (outline {ow} x {oh})")

    norm = math.hypot(*exit_vec)
    if norm < 1e-9:
        errors.append(f"{path}.connector.exit_vector: must be non-zero")
        return None

    if errors:
        return None
    return PanelClass(
        class_id=str(class_id),
        outline_w=ow, outline_h=oh, thickness=thickness,
        active_w=aw, active_h=ah, active_offset=offset,
        connector_origin=origin,
        connector_exit=(exit_vec[0] / norm, exit_vec[1] / norm),
        escape_mm=escape,
        min_bend_radius_mm=None if bend is None else float(bend),
        chipset=str(chipset), palette=tuple(palette),
        refresh_s=None if refresh is None else float(refresh),
        price_usd=None if price is None else float(price),
        requires_facet=bool(facet),
        provenance=tuple(sorted((str(k), str(v)) for k, v in prov.items())),
    )


def unverified_fields(classes):
    """[(class_id, field, note)] for every provenance entry flagged
    'unverified' plus every null numeric field — the honest-gaps list the
    console report prints."""
    gaps = []
    for cls in classes.values():
        flagged = set()
        for field, note in cls.provenance:
            if "unverified" in note.lower():
                gaps.append((cls.class_id, field, " ".join(note.split())))
                flagged.add(field)
        for field, value in (("refresh_s", cls.refresh_s),
                             ("price_usd", cls.price_usd),
                             ("min_bend_radius_mm", cls.min_bend_radius_mm)):
            if value is None and field not in flagged:
                gaps.append((cls.class_id, field, "null — no trusted source"))
    return gaps


def load_panel_classes(path):
    """Parse panels.yaml -> dict class_id -> PanelClass. Raises
    PanelSpecError listing every problem found."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except FileNotFoundError:
        raise PanelSpecError(f"panel library not found: {path}") from None
    except yaml.YAMLError as exc:
        raise PanelSpecError(f"panel library is not valid YAML: {exc}") from None

    errors = []
    if not _require_keys(data, {"units", "classes"}, "(top level)", errors):
        raise PanelSpecError(_format(path, errors))
    if data.get("units") != "mm":
        errors.append(f"units: must be the literal string 'mm', got {data.get('units')!r}")
    classes_node = data.get("classes")
    if not isinstance(classes_node, dict) or not classes_node:
        errors.append("classes: expected a non-empty mapping of class-id -> spec")
        raise PanelSpecError(_format(path, errors))

    classes = {}
    for class_id, node in classes_node.items():
        n_before = len(errors)
        spec = _parse_class(class_id, node, errors)
        if spec is not None and len(errors) == n_before:
            classes[spec.class_id] = spec
    if errors:
        raise PanelSpecError(_format(path, errors))
    return classes


def _format(path, errors):
    bullets = "\n".join(f"  - {e}" for e in errors)
    return f"invalid panel library {path}:\n{bullets}"
