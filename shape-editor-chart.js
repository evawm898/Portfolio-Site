// A faithful, deliberately SCOPED port of the (theta, s) surface-chart
// machinery tools/dress-shell/coords.py + layout.py's SurfaceChart use,
// plus curvature.py's seat_standoff — just enough to answer "how does
// THIS panel's standoff change between two shells", which is what the
// Stage 3 -> Stage 2 backward-navigation warning needs. Deliberately NOT
// ported: layout.resolve_layout (connector-escape/outline legality, twin
// derivation) and layering.analyze_layering (overlap DAG) — those stay
// Python-only; a panel this module calls "fine" may still fail one of
// those checks. See shape_impact.py's own docstring for the full picture
// this is a slice of.
//
// Cross-validated against a real `python3 shape_impact.py` run on this
// repo's own committed shape.yaml/layout.yaml/panels.yaml (see
// tools/verify-shape-editor-impact.mjs) — same panels, standoff numbers
// agree to a fraction of a mm (the residual is the dense-generator-curve
// reconstruction gap already documented in export_shape_editor_static.py,
// not a bug in this port).

import { compoundPerimeter, CompoundCoarseShell } from "./shape-editor-geom.js";

// NecklineV3Params.keepout_mm's default (6.0mm) — dress_params() never
// overrides it, same precedent as geom.js's own NECKLINE_CB_EASE_DEG.
const NECKLINE_KEEPOUT_MM = 6.0;

// Guarded central difference: never lets the stencil straddle a domain
// boundary (shell.py's _d_guarded — a centered stencil clamped at the
// edge silently halves its step and reports garbage; trap documented in
// the dress-shell skill).
function guardedDeriv(f, z, zLo, zHi, h = 0.5) {
  if (z - h < zLo) return (f(z + h) - f(z)) / h;
  if (z + h > zHi) return (f(z) - f(z - h)) / h;
  return (f(z + h) - f(z - h)) / (2 * h);
}

// Outward unit normal at (thetaRad, z) via finite difference of point() —
// same pattern geom.js's principalCurvatures already uses (and that's
// cross-validated against curvature.py directly), just without the
// second-derivative terms curvature doesn't need here.
function normalAt(shell, thetaRad, z, zLo, zHi, dt = 1e-3, dz = 0.5) {
  const zc = Math.max(zLo + dz, Math.min(z, zHi - dz));
  const Ptp = shell.point(thetaRad + dt, zc), Ptm = shell.point(thetaRad - dt, zc);
  const Xt = [(Ptp[0] - Ptm[0]) / (2 * dt), (Ptp[1] - Ptm[1]) / (2 * dt), (Ptp[2] - Ptm[2]) / (2 * dt)];
  const Pzp = shell.point(thetaRad, zc + dz), Pzm = shell.point(thetaRad, zc - dz);
  const Xz = [(Pzp[0] - Pzm[0]) / (2 * dz), (Pzp[1] - Pzm[1]) / (2 * dz), (Pzp[2] - Pzm[2]) / (2 * dz)];
  const cross = [Xz[1] * Xt[2] - Xz[2] * Xt[1], Xz[2] * Xt[0] - Xz[0] * Xt[2], Xz[0] * Xt[1] - Xz[1] * Xt[0]];
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  return [cross[0] / len, cross[1] / len, cross[2] / len];
}

function wrap180(deg) { return ((deg + 180) % 360 + 360) % 360 - 180; }

// (theta, s) chart on top of a CompoundCoarseShell: s is arc length of the
// MEAN profile (a+bf+bb averaged the same way compoundPerimeter does) from
// the waist, negative upward/bodice, positive downward/skirt — coords.py's
// ShellCoords ported directly, dense-trapezoid quadrature standing in for
// its Gauss-Legendre panels (N=4000 over a ~600mm domain is far finer than
// the mm-scale this ever reports at).
export function buildSurfaceChart(aFit, bfFit, bbFit, zLo, zHi, splitThetaDeg, necklineFn) {
  const shell = new CompoundCoarseShell(aFit, bfFit, bbFit, zLo, zHi, splitThetaDeg);
  const meanRadius = (z) => compoundPerimeter(aFit(z), bfFit(z), bbFit(z)) / (2 * Math.PI);
  const meanSlope = (z) => guardedDeriv(meanRadius, z, zLo, zHi);
  const g = (z) => Math.sqrt(1 + meanSlope(z) ** 2);

  const N = 4000;
  const zGrid = new Array(N + 1);
  for (let i = 0; i <= N; i++) zGrid[i] = zLo + (zHi - zLo) * i / N;
  const cum = new Array(N + 1);
  cum[0] = 0;
  for (let i = 1; i <= N; i++) {
    cum[i] = cum[i - 1] + 0.5 * (g(zGrid[i - 1]) + g(zGrid[i])) * (zGrid[i] - zGrid[i - 1]);
  }
  // cum(z) is the arc length from zLo (hem) up to z, monotonically
  // increasing. s(z) = -(arc length from the waist, z=0, to z) = -(cum(z)
  // - cum(0)); rebase via linear interpolation of cum at z=0.
  const interpAt = (grid, vals, x) => {
    const t = (x - zLo) / (zHi - zLo) * N;
    const i = Math.max(0, Math.min(N - 1, Math.floor(t)));
    const frac = t - i;
    return vals[i] + frac * (vals[i + 1] - vals[i]);
  };
  const cum0 = interpAt(zGrid, cum, 0);
  const sGrid = cum.map((c) => -(c - cum0));   // monotonically DECREASING in z

  function sOfZ(z) {
    const zc = Math.max(zLo, Math.min(zHi, z));
    return interpAt(zGrid, sGrid, zc);
  }
  const sMin = sOfZ(zHi), sMax = sOfZ(zLo);   // top (negative), hem (positive)

  function zOfS(s) {
    const sc = Math.max(sMin, Math.min(sMax, s));
    // sGrid is decreasing in i; search on the reversed (increasing) view.
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (sGrid[m] >= sc) lo = m; else hi = m;   // sGrid descending
    }
    const s0 = sGrid[lo], s1 = sGrid[hi], z0 = zGrid[lo], z1 = zGrid[hi];
    let z = s1 === s0 ? z0 : z0 + (sc - s0) * (z1 - z0) / (s1 - s0);
    for (let k = 0; k < 4; k++) {
      z = z - (sOfZ(z) - sc) / (-g(z));
      z = Math.max(zLo, Math.min(zHi, z));
    }
    return z;
  }

  function rTheta(s) {
    return meanRadius(zOfS(Math.max(sMin, Math.min(sMax, s))));
  }

  return { shell, sOfZ, zOfS, rTheta, sMin, sMax, zLo, zHi, splitThetaDeg, necklineFn };
}

// True max standoff of a flat outlineW x outlineH panel seated tangent at
// (thetaDeg, s) with in-plane rotation (degrees) — curvature.py's
// seat_standoff ported directly: sample the shell across the (rotated)
// footprint, project onto the tangent-plane normal, take the max abs
// deviation. Returns Infinity when the footprint runs off the shell
// (top/hem/neckline) or crosses its piece's seam — matches Python exactly,
// "the panel simply does not fit there", never a real number standing in.
export function seatStandoff(chart, outlineW, outlineH, thetaDeg, s, rotationDeg = 0, samples = 9) {
  const { shell, zOfS, rTheta, sMin, sMax, splitThetaDeg, necklineFn } = chart;
  const thetaRad = thetaDeg * Math.PI / 180;
  const z0 = zOfS(s);
  const p0 = shell.point(thetaRad, z0);
  const n = normalAt(shell, thetaRad, z0, chart.zLo, chart.zHi);
  const r = rTheta(s);
  const rot = rotationDeg * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);

  const lam0 = wrap180(thetaDeg);
  const center = Math.abs(lam0) < splitThetaDeg ? 0 : 180;
  const half = center === 0 ? splitThetaDeg : 180 - splitThetaDeg;

  let maxAbsD = 0;
  for (let i = 0; i < samples; i++) {
    const uRaw = -0.5 * outlineW + outlineW * i / (samples - 1);
    for (let j = 0; j < samples; j++) {
      const vRaw = -0.5 * outlineH + outlineH * j / (samples - 1);
      const u = cr * uRaw - sr * vRaw, v = sr * uRaw + cr * vRaw;
      const sPt = s + v;
      if (sPt < sMin - 1e-9 || sPt > sMax + 1e-9) return Infinity;
      const tPt = thetaDeg + (u / r) * 180 / Math.PI;
      const lam = wrap180(tPt - center);
      if (Math.abs(lam) >= half) return Infinity;
      const zPt = zOfS(sPt);
      if (necklineFn) {
        const floor = necklineFn(tPt) - NECKLINE_KEEPOUT_MM;
        if (zPt > floor + 1e-9) return Infinity;
      }
      const fp = shell.point(tPt * Math.PI / 180, zPt);
      const d = (fp[0] - p0[0]) * n[0] + (fp[1] - p0[1]) * n[1] + (fp[2] - p0[2]) * n[2];
      if (Math.abs(d) > maxAbsD) maxAbsD = Math.abs(d);
    }
  }
  return maxAbsD;
}

// -- panels.yaml / layout.yaml: targeted readers for this repo's own
// controlled, single-writer YAML — same "hand-rolled, not general" stance
// as shape-editor-yaml.js. -------------------------------------------
export function parsePanelClasses(text) {
  const classes = {};
  let inClasses = false, current = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    if (/^classes:\s*$/.test(line)) { inClasses = true; continue; }
    if (inClasses && /^\S/.test(line)) { inClasses = false; current = null; }
    if (!inClasses) continue;
    const clsMatch = line.match(/^  (\S+):\s*$/);
    if (clsMatch) { current = clsMatch[1]; classes[current] = { outlineW: null, outlineH: null }; continue; }
    if (!current) continue;
    const outlineMatch = line.match(/outline:\s*\{\s*width:\s*([\d.]+),\s*height:\s*([\d.]+)\s*\}/);
    if (outlineMatch) {
      classes[current].outlineW = parseFloat(outlineMatch[1]);
      classes[current].outlineH = parseFloat(outlineMatch[2]);
    }
  }
  return classes;
}

export function parseLayoutPanels(text) {
  const panels = [];
  let cur = null;
  for (const line of text.split("\n")) {
    const idMatch = line.match(/^\s*-\s*id:\s*(.+)$/);
    if (idMatch) { if (cur) panels.push(cur); cur = { id: idMatch[1].trim() }; continue; }
    if (!cur) continue;
    const kv = line.match(/^\s*([a-z_]+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    if (key === "class") cur.classId = val.trim();
    else if (["theta", "s", "rotation", "layer"].includes(key)) cur[key] = parseFloat(val);
    else if (key === "mirrored") cur.mirrored = val.trim() === "true";
  }
  if (cur) panels.push(cur);
  return panels;
}

// The scoped report itself: per-authored-panel standoff old vs new, worst
// first. `classes`/`authoredPanels` come from the two parsers above.
// toleranceMm matches curvature.STANDOFF_TOLERANCE_MM's default (2.0).
export function computeStandoffImpact(oldChart, newChart, classes, authoredPanels, toleranceMm = 2.0, samples = 9) {
  const results = [];
  for (const p of authoredPanels) {
    const cls = classes[p.classId];
    if (!cls || cls.outlineW == null) {
      results.push({ id: p.id, classId: p.classId, error: "unknown class or missing outline in panels.yaml" });
      continue;
    }
    const oldSO = seatStandoff(oldChart, cls.outlineW, cls.outlineH, p.theta, p.s, p.rotation, samples);
    const newSO = seatStandoff(newChart, cls.outlineW, cls.outlineH, p.theta, p.s, p.rotation, samples);
    const oldFit = oldSO <= toleranceMm, newFit = newSO <= toleranceMm;
    results.push({
      id: p.id, classId: p.classId, oldStandoffMm: oldSO, newStandoffMm: newSO,
      wasWithinTolerance: oldFit, nowWithinTolerance: newFit, regressed: oldFit && !newFit,
      deltaMm: (Number.isFinite(oldSO) && Number.isFinite(newSO)) ? (newSO - oldSO) : null,
    });
  }
  // worst first: a regression outranks a standing failure outranks
  // everything else; within a tier, the larger new standoff first.
  const severity = (r) => r.error ? -1 : r.regressed ? 2 : !r.nowWithinTolerance ? 1 : 0;
  results.sort((a, b) => severity(b) - severity(a) ||
    (b.newStandoffMm ?? -Infinity) - (a.newStandoffMm ?? -Infinity));
  return results;
}
