// Regression gate for shape-editor-chart.js's seat_standoff port —
// cross-checks it against REAL `python3 shape_impact.py` output on this
// repo's own committed shape.yaml/layout.yaml/panels.yaml. Run this
// whenever shape-editor-chart.js changes.
//
// The ground-truth numbers below were captured by hand:
//   cd tools/dress-shell && python3 shape_impact.py --old <perturbed> --new shape.yaml
// where <perturbed> is shape.yaml with one a(v) point nudged (a real,
// point-based-vs-point-based shell change — not the dense-generator
// reconstruction, which has its own already-documented front/back
// divergence gap and is NOT what this port is validated against).
//
// Run: node tools/verify-shape-editor-impact.mjs

import { readFile, writeFile, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pchipFit, necklineHeightFn } from "../shape-editor-geom.js";
import { parseShapeYaml, shapeYamlToInitialCurves } from "../shape-editor-yaml.js";
import { buildSurfaceChart, computeStandoffImpact, parsePanelClasses, parseLayoutPanels } from "../shape-editor-chart.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SHELL_DIR = path.join(ROOT, "tools", "dress-shell");

const state = JSON.parse(await readFile(path.join(ROOT, "assets", "shape-editor-data.json"), "utf8"));
const V_LO = state.domain.v_lo, V_HI = state.domain.v_hi;
const SPLIT = state.bounds.split_theta;

function fitOf(pts) {
  const s = [...pts].sort((a, b) => a[0] - b[0]);
  return pchipFit(s.map((p) => p[0]), s.map((p) => p[1]));
}
async function loadChart(shapeYamlPath) {
  const text = await readFile(shapeYamlPath, "utf8");
  const parsed = shapeYamlToInitialCurves(parseShapeYaml(text));
  const aFit = fitOf(parsed.aPoints), bfFit = fitOf(parsed.bFrontPoints), bbFit = fitOf(parsed.bBackPoints);
  const necklineFn = necklineHeightFn(parsed.neckline || state.neckline);
  return buildSurfaceChart(aFit, bfFit, bbFit, V_LO, V_HI, SPLIT, necklineFn);
}

// 1. Build a perturbed shape.yaml (one a(v) control point nudged 15mm) —
// a real, meaningful, point-based shell change.
const origText = await readFile(path.join(SHELL_DIR, "shape.yaml"), "utf8");
const needle = "[193.42499999999995, 140.10641694291948]";
const replacement = "[193.42499999999995, 125.10641694291948]";
if (!origText.includes(needle)) {
  console.error("FAIL: expected a_points control point not found in shape.yaml — " +
    "the committed shell changed since this gate was written; update the needle/expected numbers.");
  process.exit(1);
}
const perturbedPath = path.join(SHELL_DIR, "_verify_perturbed_shape.yaml");
await writeFile(perturbedPath, origText.replace(needle, replacement));

// 2. Ground truth: run the real Python shape_impact.py against both files.
let pyOut;
try {
  pyOut = execFileSync("python3", ["shape_impact.py", "--old", perturbedPath, "--new", "shape.yaml"],
    { cwd: SHELL_DIR, encoding: "utf8" });
} catch (e) {
  pyOut = e.stdout || "";   // shape_impact.py exits 1 when regressions are found — that's expected here
} finally {
  await unlink(perturbedPath);
}
const pyStandoff = {};   // id -> { old, new }
for (const line of pyOut.split("\n")) {
  const m = line.match(/([\w-]+): standoff ([\d.]+) -> ([\d.]+)/) || line.match(/([\w-]+): standoff ([\d.]+) mm.*already ([\d.]+)/);
  if (m) pyStandoff[m[1]] = { old: parseFloat(m[3]), new: parseFloat(m[2]) };
}
if (Object.keys(pyStandoff).length === 0) {
  console.error("FAIL: could not parse any standoff lines from python3 shape_impact.py output:\n" + pyOut);
  process.exit(1);
}

// 3. Run the JS port on the same two files and compare (re-materialize
// the perturbed file, since step 2 already cleaned it up).
await writeFile(perturbedPath, origText.replace(needle, replacement));
const oldChart = await loadChart(perturbedPath);
await unlink(perturbedPath);
const newChart = await loadChart(path.join(SHELL_DIR, "shape.yaml"));
const classes = parsePanelClasses(await readFile(path.join(SHELL_DIR, "panels.yaml"), "utf8"));
const panels = parseLayoutPanels(await readFile(path.join(SHELL_DIR, "layout.yaml"), "utf8"));
const results = computeStandoffImpact(oldChart, newChart, classes, panels);

const TOLERANCE_MM = 0.05;
let anyFail = false;
console.log("panel        old(JS)  new(JS)  old(py)  new(py)  status");
for (const r of results) {
  const py = pyStandoff[r.id];
  if (!py) continue;   // python only prints panels that exceed tolerance on either side
  const dOld = Math.abs(r.oldStandoffMm - py.old), dNew = Math.abs(r.newStandoffMm - py.new);
  const ok = dOld <= TOLERANCE_MM && dNew <= TOLERANCE_MM;
  if (!ok) anyFail = true;
  console.log(
    r.id.padEnd(12), r.oldStandoffMm.toFixed(2).padStart(7), r.newStandoffMm.toFixed(2).padStart(8),
    py.old.toFixed(2).padStart(8), py.new.toFixed(2).padStart(8), ok ? "ok" : "FAIL",
  );
}
if (Object.keys(pyStandoff).length < 3) {
  console.error(`FAIL: only ${Object.keys(pyStandoff).length} panel(s) cross-checked — expected several; ` +
    "the perturbation or the committed layout may have changed too much to compare meaningfully.");
  process.exit(1);
}
if (anyFail) {
  console.error(`FAIL: JS port disagrees with python3 shape_impact.py by more than ${TOLERANCE_MM}mm on at least one panel.`);
  process.exit(1);
}
console.log(`OK — shape-editor-chart.js's seatStandoff agrees with python3 shape_impact.py to within ${TOLERANCE_MM}mm on every cross-checked panel.`);
