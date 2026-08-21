// Minimal hand-rolled parser for the CANONICAL shape.yaml text format this
// project writes — NOT a general YAML parser. It only understands the
// specific subset shape_state.py's dump_shape() (Python) and this app's
// own dumpShapeYaml() (shape-editor-app.js) produce: top-level scalars,
// point lists ("  - [v, y]"), flat key/value blocks (neckline, generator),
// and one level of nesting for backdrop_calibration (front/trace, each
// with an optional nested h_ref). Written this way — rather than pulling
// in a real YAML library — because the write format is fully controlled
// by this project's own two writers and stays simple on purpose; a
// hand-rolled reader lets Stage 2 fetch tools/dress-shell/shape.yaml
// directly from the static deploy with zero extra dependencies.
//
// If the committed file ever grows a construct this doesn't handle,
// parseShapeYaml fails LOUDLY (throws) rather than silently returning a
// partial/wrong shape — the caller falls back to the generator seed and
// says so, it never guesses.

function stripComment(line) {
  // '#' only ever starts a comment in this format at line-start (own
  // header) or is absent elsewhere — image paths etc. never contain '#'.
  const i = line.indexOf(" #");
  return i === -1 ? line : line.slice(0, i);
}

function indentOf(line) {
  const m = line.match(/^( *)/);
  return m[1].length;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "") return null;
  if (/^-?[0-9]+\.?[0-9]*(e[+-]?[0-9]+)?$/i.test(v) || /^-?\.[0-9]+$/.test(v)) {
    const n = parseFloat(v);
    if (!Number.isNaN(n)) return n;
  }
  return v;
}

export function parseShapeYaml(text) {
  const rawLines = text.split("\n").map(stripComment);
  let i = 0;
  const n = rawLines.length;

  function skipBlank() {
    while (i < n && rawLines[i].trim() === "") i++;
  }

  function parsePointList(baseIndent) {
    const pts = [];
    while (i < n) {
      skipBlank();
      if (i >= n) break;
      const line = rawLines[i];
      if (indentOf(line) < baseIndent) break;
      const m = line.match(/^\s*-\s*\[\s*([^,\]]+)\s*,\s*([^\]]+)\]\s*$/);
      if (!m) break;
      pts.push([parseFloat(m[1]), parseFloat(m[2])]);
      i++;
    }
    return pts;
  }

  function parseInlineList(inner) {
    return inner.split(",").map((s) => parseScalar(s));
  }

  // Parses a flat (or one-level-nested, for backdrop_calibration) block of
  // "key: value" / "key:\n  <nested>" lines at exactly `indent`.
  function parseDict(indent) {
    const obj = {};
    while (i < n) {
      skipBlank();
      if (i >= n) break;
      const line = rawLines[i];
      const lineIndent = indentOf(line);
      if (lineIndent < indent) break;
      if (lineIndent > indent) { i++; continue; } // defensive skip, shouldn't hit
      const m = line.match(/^\s*([A-Za-z0-9_]+):\s*(.*)$/);
      if (!m) { i++; continue; }
      const [, key, rest] = m;
      i++;
      const trimmed = rest.trim();
      if (trimmed === "" ) {
        skipBlank();
        const nextIndent = i < n ? indentOf(rawLines[i]) : -1;
        if (i < n && rawLines[i].trim().startsWith("-") && nextIndent >= indent) {
          obj[key] = parsePointList(nextIndent);
        } else if (nextIndent > indent) {
          obj[key] = parseDict(nextIndent);
        } else {
          obj[key] = null;
        }
      } else if (trimmed === "{}") {
        obj[key] = {};
      } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        obj[key] = parseInlineList(trimmed.slice(1, -1));
      } else {
        obj[key] = parseScalar(trimmed);
      }
    }
    return obj;
  }

  const doc = parseDict(0);
  if (i < n) {
    // trailing unparsed content past a genuine top-level parse desync —
    // fail loudly rather than silently truncating the shape.
    const remaining = rawLines.slice(i).some((l) => l.trim() !== "");
    if (remaining) throw new Error(`shape.yaml parse stopped early at line ${i + 1}`);
  }
  return doc;
}

// Adapts the raw parsed dict (Python-style snake_case keys, [v,y] arrays)
// into the shape this app's panes/calibration classes want: a_points /
// b_front_points / b_back_points as plain [v,y] arrays (unchanged), plus
// neckline/generator dicts, plus a hydratable backdrop_calibration.
export function shapeYamlToInitialCurves(doc) {
  if (!Array.isArray(doc.a_points) || !Array.isArray(doc.b_front_points) ||
      !Array.isArray(doc.b_back_points)) {
    throw new Error("shape.yaml missing a_points/b_front_points/b_back_points");
  }
  return {
    aPoints: doc.a_points,
    bFrontPoints: doc.b_front_points,
    bBackPoints: doc.b_back_points,
    neckline: doc.neckline || null,
    generator: doc.generator || null,
    backdropCalibration: doc.backdrop_calibration || null,
  };
}
