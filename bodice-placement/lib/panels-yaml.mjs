// Minimal reader for the repo-shared panels.yaml (restricted schema: a
// `size_classes:` list of flat `- key: value` maps). No dependencies, so the
// tool runs on bare node. Not a general YAML parser on purpose.
import { readFileSync } from 'node:fs';

export function loadSizeClasses(path) {
  const text = readFileSync(path, 'utf8');
  const classes = [];
  let inList = false, cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (/^size_classes:\s*$/.test(line)) { inList = true; continue; }
    if (inList && /^\S/.test(line)) break; // left the list block
    if (!inList) continue;
    const item = line.match(/^\s*-\s+(\w+):\s*(.+)$/);
    const field = line.match(/^\s+(\w+):\s*(.+)$/);
    if (item) {
      cur = {};
      classes.push(cur);
      cur[item[1]] = coerce(item[2]);
    } else if (field && cur) {
      cur[field[1]] = coerce(field[2]);
    }
  }
  for (const c of classes) {
    if (!c.id || !(c.width_mm > 0) || !(c.height_mm > 0)) {
      throw new Error(`panels.yaml: bad size class entry ${JSON.stringify(c)}`);
    }
    c.diag_mm = Math.hypot(c.width_mm, c.height_mm);
  }
  return classes;
}

function coerce(s) {
  const t = s.trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}
