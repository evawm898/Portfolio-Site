// Dress panel placement editor — local dev page (three.js).
// Reads/writes layout.yaml through editor_server.py. Client math is the
// surface.js port; the server re-resolves authoritatively on drag-end and
// on save.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as SF from "/surface.js";

const CLASS_COLORS = { p213: 0xb78ce0, p370: 0x3d9a9e, p750: 0x214c6b };
const INVALID_COLOR = 0xcc2921, ERROR_COLOR = 0xe05545;

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => { $("status").innerHTML = `<span class="${cls}">${msg}</span>`; };

const state = await (await fetch("/api/state")).json();
const surf = new SF.Surface(state.profile, state.bounds);
const classes = state.classes;
const TOL = state.tolerance_mm;

// ---------------------------------------------------------------- document
let authored = state.resolved.authored.map(e => ({ ...e }));
let placed = [];             // resolved sources + twins (local or server)
let layering = null;         // local layering result
let serverInfo = state.resolved;  // last authoritative resolve
let history = [], redoStack = [], dirty = false;
let selectedId = null;       // authored id
let activeClass = Object.keys(classes)[0];
let suppressUnloadWarn = false;   // param-apply reload restores via sessionStorage

// a shell-parameter rebuild reloads the page; unsaved work rides across
// in sessionStorage and comes back still-unsaved
let restoredDirty = false;
{
  const pending = sessionStorage.getItem("pendingLayout");
  if (pending) {
    sessionStorage.removeItem("pendingLayout");
    try {
      const st = JSON.parse(pending);
      authored = st.authored;
      restoredDirty = !!st.dirty;
    } catch { /* corrupted stash: fall back to the saved layout */ }
  }
}

const snapshot = () => JSON.parse(JSON.stringify(authored));
function pushHistory() {
  history.push(snapshot());
  if (history.length > 100) history.shift();
  redoStack = [];
  setDirty(true);
}
function setDirty(d) {
  dirty = d;
  $("fileState").innerHTML = `layout.yaml — <b class="${d ? "warn" : "ok"}">${d ? "unsaved changes" : "saved"}</b>`;
}
window.addEventListener("beforeunload", (e) => {
  if (dirty && !suppressUnloadWarn) { e.preventDefault(); e.returnValue = ""; }
});

// ---------------------------------------------------------------- three.js
const view = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e0e);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 8000);
camera.position.set(650, 900, 350);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, (state.bounds.z_top + state.bounds.z_bottom) / 2);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xdfe8e8, 0x30383a, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.4);
dir.position.set(700, 900, 900);
scene.add(dir);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// shell meshes with per-vertex (theta,s) + three color modes
const shellMeshes = [];
const cellIndexOf = (theta, s) => {
  const th = SF.wrap180(theta);
  const nT = state.grid.thetas.length - 1;
  const iT = Math.min(Math.floor((th + 180) / state.grid.dtheta), nT - 1);
  const rings = state.grid.rings;
  let lo = 0, hi = rings.length - 1;
  if (s < rings[0] || s > rings[hi]) return -1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rings[m] <= s) lo = m; else hi = m; }
  return lo * nT + iT;
};
const cellByIndex = state.cells;

function buildShell(name) {
  const src = state.meshes[name];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(src.positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(src.normals, 3));
  g.setIndex(src.indices);
  const n = src.positions.length / 3;
  const modes = {};
  const kAbs = cellByIndex.map(c => Math.abs(c.K));
  kAbs.sort((a, b) => a - b);
  const kScale = kAbs[Math.floor(kAbs.length * 0.95)] || 1e-6;
  for (const mode of ["class", "gaussian", "plain"]) {
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = src.theta_s[2 * i], s = src.theta_s[2 * i + 1];
      let c = new THREE.Color(name === "FRONT" ? 0xd8dcda : 0xc9cfcc);
      if (mode !== "plain") {
        const ci = cellIndexOf(th, s);
        const cell = ci >= 0 ? cellByIndex[ci] : null;
        if (cell) {
          if (mode === "class") {
            c = new THREE.Color(cell.max_class ? CLASS_COLORS[cell.max_class] : 0x3a4143);
          } else {
            const t = Math.max(-1, Math.min(1, cell.K / kScale));
            c = new THREE.Color().setHSL(t < 0 ? 0.55 : 0.02, 0.75 * Math.abs(t) + 0.05,
                                         0.62 - 0.22 * Math.abs(t));
          }
        }
      }
      col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
    }
    modes[mode] = new THREE.Float32BufferAttribute(col, 3);
  }
  g.setAttribute("color", modes.class);
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }));
  mesh.userData = { kind: "shell", piece: name, modes, thetaS: src.theta_s,
                    basePos: Float32Array.from(src.positions) };
  scene.add(mesh);
  shellMeshes.push(mesh);
}
buildShell("FRONT");
buildShell("BACK");

let shadeMode = "class", heatUnderPanels = true;
function applyShading() {
  const mode = heatUnderPanels ? shadeMode : (shadeMode === "plain" ? "plain" : shadeMode);
  for (const m of shellMeshes) {
    m.geometry.setAttribute("color", m.userData.modes[mode]);
    m.geometry.attributes.color.needsUpdate = true;
  }
  document.querySelectorAll("#modes button").forEach(b =>
    b.classList.toggle("on", b.dataset.mode === shadeMode));
}

// grid overlay
const gridGroup = new THREE.Group();
for (const kind of ["rings", "radials"]) {
  for (const flat of state.grid.lines[kind]) {
    const pos = [], idx = [];
    for (let i = 0; i < flat.length; i += 3) pos.push(flat[i], flat[i + 1], flat[i + 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gridGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0x39413f, transparent: true, opacity: 0.85 })));
  }
}
scene.add(gridGroup);

// ---------------------------------------------------------------- panels 3D
const panelGroup = new THREE.Group();
scene.add(panelGroup);
const panelStandoffs = {};   // id -> mm

function orthoFrame(f) {
  const u = new THREE.Vector3(...f.eTheta).normalize();
  const v0 = new THREE.Vector3(...f.eS);
  const v = v0.sub(u.clone().multiplyScalar(v0.dot(u))).normalize();
  const n = u.clone().cross(v);
  return { u, v, n };
}

function rebuildPanels() {
  panelGroup.clear();
  const rep = layering;
  for (const p of placed) {
    const cls = classes[p.class];
    const f = surf.forward(p.theta, p.s);
    const { u, v, n } = orthoFrame(f);
    const mount = rep && rep.mount[p.id] !== undefined ? rep.mount[p.id] : 0;
    const so = cls.requires_facet ? null : SF.seatStandoff(surf, cls, p.theta, p.s);
    panelStandoffs[p.id] = so;
    const overTol = so !== null && so > TOL;
    const buried = rep && rep.buried[p.id];

    const grp = new THREE.Group();
    const [dxo, dyo] = SF.frameOffset(cls, p.rotation,
      [cls.outline[0] / 2, cls.outline[1] / 2]);
    const center = new THREE.Vector3(...f.pos)
      .addScaledVector(u, dxo).addScaledVector(v, dyo)
      .addScaledVector(n, mount + cls.thickness / 2);
    const basis = new THREE.Matrix4().makeBasis(u, v, n);

    let bodyColor = p.valid ? CLASS_COLORS[p.class] : INVALID_COLOR;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(cls.outline[0], cls.outline[1], cls.thickness),
      new THREE.MeshStandardMaterial({
        color: bodyColor, roughness: 0.6,
        emissive: overTol || !p.valid ? ERROR_COLOR : 0x000000,
        emissiveIntensity: overTol || !p.valid ? 0.45 : 0,
        transparent: p.is_twin, opacity: p.is_twin ? 0.82 : 1.0,
      }));
    body.position.copy(center);
    body.setRotationFromMatrix(basis);
    body.userData = { kind: "panel", id: p.id, placed: p };
    grp.add(body);

    const active = new THREE.Mesh(
      new THREE.PlaneGeometry(cls.active[0], cls.active[1]),
      new THREE.MeshBasicMaterial({ color: 0x103b3b, side: THREE.DoubleSide }));
    active.position.copy(new THREE.Vector3(...f.pos)
      .addScaledVector(n, mount + cls.thickness + 0.2));
    active.setRotationFromMatrix(basis);
    active.userData = { kind: "panel", id: p.id, placed: p };
    grp.add(active);

    const cg = SF.connectorGeometry(surf, cls, p.theta, p.s, p.rotation);
    const c0 = surf.forward(cg.origin.theta, cg.origin.s);
    const c1 = surf.forward(cg.end.theta, cg.end.s);
    const lift = mount + cls.thickness + 0.4;
    const lg = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...c0.pos).addScaledVector(new THREE.Vector3(...c0.normal), lift),
      new THREE.Vector3(...c1.pos).addScaledVector(new THREE.Vector3(...c1.normal), lift)]);
    grp.add(new THREE.Line(lg, new THREE.LineBasicMaterial({
      color: buried ? ERROR_COLOR : 0xd98a35, linewidth: 2 })));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10),
      new THREE.MeshBasicMaterial({ color: buried ? ERROR_COLOR : 0xd98a35 }));
    dot.position.copy(new THREE.Vector3(...c0.pos)
      .addScaledVector(new THREE.Vector3(...c0.normal), lift));
    grp.add(dot);

    if (p.source_id === selectedId) {
      const sel = new THREE.Mesh(
        new THREE.BoxGeometry(cls.outline[0] + 6, cls.outline[1] + 6, cls.thickness + 3),
        new THREE.MeshBasicMaterial({ color: 0xe9ecec, wireframe: true }));
      sel.position.copy(center);
      sel.setRotationFromMatrix(basis);
      grp.add(sel);
    }
    panelGroup.add(grp);
  }
}

// ---------------------------------------------------------------- resolve
function updateFacetShell() {
  // re-derive shell positions from the pristine copy each resolve: facet
  // panels flatten their footprint, removed facets restore automatically
  for (const m of shellMeshes) {
    const { positions } = SF.applyFacets(surf, classes, placed,
                                         m.userData.basePos, m.userData.thetaS);
    m.geometry.getAttribute("position").array.set(positions);
    m.geometry.getAttribute("position").needsUpdate = true;
    m.geometry.computeVertexNormals();
  }
}

function resolveLocal() {
  placed = SF.resolveAll(surf, classes, authored);
  layering = SF.analyzeLayering(surf, classes, placed);
  updateFacetShell();
  rebuildPanels();
  updateSidebar();
}

let serverTimer = null;
function scheduleServerResolve() {
  clearTimeout(serverTimer);
  serverTimer = setTimeout(async () => {
    try {
      const r = await fetch("/api/resolve", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels: authored }) });
      const data = await r.json();
      if (!r.ok) { status(`server: ${data.error}`, "err"); return; }
      serverInfo = data;
      updateSidebar();
    } catch (e) { status(`server resolve failed: ${e}`, "err"); }
  }, 350);
}

function mutate(fn, { record = true } = {}) {
  if (record) pushHistory();
  fn();
  resolveLocal();
  scheduleServerResolve();
}

// ---------------------------------------------------------------- sidebar
function updateSidebar() {
  // totals
  const counts = {};
  for (const p of placed.filter(p => p.valid)) counts[p.class] = (counts[p.class] || 0) + 1;
  const unc = SF.uncoveredPct(surf, classes, placed);
  const vis = layering ? layering.totalVisible : 0;
  const act = layering ? layering.totalActive : 0;
  const sAsym = serverInfo?.asymmetry;
  const validPanels = placed.filter(p => p.valid);
  let cost = 0, refresh = 0, refreshUnknown = 0;
  for (const p of validPanels) {
    const c = classes[p.class];
    if (c.price_usd != null) cost += c.price_usd;
    if (c.refresh_s != null) refresh += c.refresh_s; else refreshUnknown++;
  }
  const facetLines = (serverInfo?.facets || []).map(f =>
    `facet <b>${f.panel}</b>: shell dev max ${f.max_deviation_mm} / rms ${f.rms_deviation_mm} mm`);
  $("totals").innerHTML = [
    `panels <b>${validPanels.length}</b> (${Object.entries(counts)
      .map(([k, v]) => `${k}×${v}`).join(" ") || "none"})`,
    `active area visible <b>${(vis / 100).toFixed(1)}</b> / ${(act / 100).toFixed(1)} cm²`,
    `shell uncovered <b>${unc.toFixed(1)}%</b>`,
    `max stack <b>${layering ? layering.maxStack.toFixed(1) : "?"} mm</b>`,
    sAsym ? `asymmetry worst <b>${sAsym.worst_mm.toFixed(2)}</b> / mean ${sAsym.mean_mm.toFixed(3)} mm` : "",
    ...facetLines,
    `cost <b>$${cost.toFixed(2)}</b> · lines <b>${2 + 4 * validPanels.length}</b> · ` +
      `refresh <b>${refresh.toFixed(0)} s</b>${refreshUnknown ? ` (+${refreshUnknown} unverified)` : ""}`,
  ].filter(Boolean).join("<br>");

  // errors
  const errs = [];
  for (const [a, b] of (layering?.conflicts || []))
    errs.push(`<span class="err">same-layer overlap: ${a} + ${b} — set different layers</span>`);
  for (const p of placed) {
    if (!p.valid) errs.push(`<span class="err">${p.id}: ${p.problems[0]}</span>`);
    const so = panelStandoffs[p.id];
    if (so !== null && so > TOL) errs.push(`<span class="err">${p.id}: standoff ${
      Number.isFinite(so) ? so.toFixed(2) + " mm" : "∞"} &gt; ${TOL} mm</span>`);
  }
  for (const [pid, cover] of Object.entries(layering?.buried || {}))
    errs.push(`<span class="err">${pid}: connector buried under ${cover.join(", ")}</span>`);
  for (const e of serverInfo?.errors || [])
    errs.push(`<span class="err">server: ${e}</span>`);
  $("errors").innerHTML = errs.length ? errs.map(e => `<div>${e}</div>`).join("")
                                      : `<span class="ok">clean</span>`;

  // selected
  const src = authored.find(a => a.id === selectedId);
  if (!src) {
    $("selected").textContent = "none — click a panel, or click the shell to place";
    $("selActions").style.display = "none";
  } else {
    const twin = placed.find(p => p.source_id === src.id && p.is_twin);
    const so = panelStandoffs[src.id];
    $("selected").innerHTML =
      `<b>${src.id}</b> · ${src.class} · θ ${src.theta.toFixed(2)}° · s ${src.s.toFixed(1)} mm<br>` +
      `rotation ${src.rotation}° · layer ${src.layer} · ${src.mirrored ? "paired" : "single"}<br>` +
      (so === null ? '<span class="warn">FLAT FACET</span>'
        : `standoff ${Number.isFinite(so) ? so.toFixed(2) + " mm" : "∞"}`) +
      ` · visible ${layering?.visiblePct[src.id]?.toFixed(0) ?? "?"}%` +
      (twin ? `<br>twin: rot ${twin.rotation}° ${twin.valid
        ? `· asym ${twin.asymmetry_mm.toFixed(2)} mm`
        : `· <span class="err">INVALID</span>`}` : "");
    $("selActions").style.display = "";
    $("mirrorBtn").classList.toggle("on", src.mirrored);
    $("mirrorBtn").textContent = src.mirrored ? "paired" : "single";
  }
}

// shell parameters (design-adjustable subset; body measurements fixed)
$("pHem").value = state.params.hem_circumference;
$("pN").value = state.params.dome_n;
$("pKhem").value = state.params.skirt_hem_ratio;
$("pBlend").value = state.params.ratio_blend;
$("paramInfo").innerHTML =
  `waist ${state.params.waist_circumference} mm · drop ${state.params.drop} mm · ` +
  `waist ratio ${state.params.waist_section_ratio} <span class="warn">(body — fixed)</span>`;
$("applyParams").onclick = async () => {
  const body = {
    hem_circumference: parseFloat($("pHem").value),
    dome_n: parseFloat($("pN").value),
    skirt_hem_ratio: parseFloat($("pKhem").value),
    ratio_blend: $("pBlend").value,
  };
  status("rebuilding shell + analysis… (a few seconds)");
  $("applyParams").disabled = true;
  try {
    const r = await fetch("/api/params", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { status(`params rejected: ${data.error}`, "err"); return; }
    // reload against the rebuilt shell; unsaved layout rides across
    sessionStorage.setItem("pendingLayout", JSON.stringify({ authored, dirty }));
    suppressUnloadWarn = true;
    location.reload();
  } catch (e) {
    status(`params failed: ${e}`, "err");
  } finally {
    $("applyParams").disabled = false;
  }
};

// palette
for (const cid of Object.keys(classes)) {
  const b = document.createElement("button");
  b.textContent = `${cid} ${classes[cid].outline[0]}×${classes[cid].outline[1]}`;
  b.dataset.cls = cid;
  if (cid === activeClass) b.classList.add("on");
  b.onclick = () => {
    activeClass = cid;
    document.querySelectorAll("#palette button").forEach(x =>
      x.classList.toggle("on", x.dataset.cls === cid));
  };
  $("palette").appendChild(b);
}

// ---------------------------------------------------------------- picking
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null, dragging = false;

function pick(ev, targets) {
  pointer.x = (ev.clientX / innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  return ray.intersectObjects(targets, true)[0] || null;
}

function pickPanel(ev) {
  pointer.x = (ev.clientX / innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  // decorations (selection wireframe, connector line/dot) carry no id —
  // take the nearest hit that is an actual panel body/active face
  return ray.intersectObjects([panelGroup], true)
            .find(h => h.object.userData && h.object.userData.id) || null;
}

let snapOn = true;
function toSurface(ev) {
  const hit = pick(ev, shellMeshes);
  if (!hit) return null;
  let { theta, s } = surf.inverse([hit.point.x, hit.point.y, hit.point.z]);
  let snapKind = null;
  if (snapOn) {
    const dT = state.grid.dtheta, rings = state.grid.rings;
    // nearest of corner / edge midpoint / center in physical mm
    const r = surf.rTheta(theta, s);
    const cands = [];
    const t0 = Math.floor((SF.wrap180(theta) + 180) / dT) * dT - 180;
    let lo = 0;
    while (lo < rings.length - 2 && rings[lo + 1] <= s) lo++;
    const [s0, s1] = [rings[lo], rings[lo + 1]];
    const tc = t0 + dT / 2, sc = (s0 + s1) / 2;
    for (const [tt, ss, kind] of [
      [t0, s0, "corner"], [t0 + dT, s0, "corner"], [t0 + dT, s1, "corner"], [t0, s1, "corner"],
      [tc, s0, "edge"], [t0 + dT, sc, "edge"], [tc, s1, "edge"], [t0, sc, "edge"],
      [tc, sc, "center"]]) {
      const d = Math.hypot((tt - theta) * Math.PI / 180 * r, ss - s);
      cands.push([d, tt, ss, kind]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    [, theta, s, snapKind] = cands[0];
  }
  return { theta, s, snapKind };
}

renderer.domElement.addEventListener("pointerdown", (ev) => {
  downPos = [ev.clientX, ev.clientY];
  const hitPanel = pickPanel(ev);
  if (hitPanel) {
    const pd = hitPanel.object.userData.placed;
    selectedId = pd.source_id;               // twins select their source
    if (pd.is_twin) status(`selected source '${pd.source_id}' (twins are derived, not directly editable)`);
    else status(`selected '${pd.source_id}'`);
    dragging = true;
    controls.enabled = false;
    pushHistory();
    resolveLocal();
  }
});

renderer.domElement.addEventListener("pointermove", (ev) => {
  if (dragging && selectedId) {
    const hit = toSurface(ev);
    if (hit) {
      const src = authored.find(a => a.id === selectedId);
      let th = hit.theta;
      if (src.mirrored && th < 0) th = -th;      // authored side only
      if (!src.mirrored && src.theta === 0) th = Math.abs(th) < 4 ? 0 : th;
      src.theta = Math.max(0, +th.toFixed(4));
      src.s = +hit.s.toFixed(3);
      resolveLocal();
    }
    return;
  }
  // hover info
  const hitPanel = pickPanel(ev);
  if (hitPanel) {
    const p = hitPanel.object.userData.placed;
    const so = panelStandoffs[p.id];
    const soTxt = so === null ? '<span class="warn">FLAT FACET</span>'
      : `standoff ${Number.isFinite(so) ? so.toFixed(2) : "∞"} mm`;
    $("hover").innerHTML =
      `<b>${p.id}</b> ${p.is_twin ? "(derived twin)" : ""}<br>` +
      `class ${p.class} · rot ${p.rotation}° · content rot ${p.content_rotation}°<br>` +
      `layer ${p.layer} · mount ${(layering?.mount[p.id] ?? 0).toFixed(1)} mm<br>` +
      `${soTxt} · visible ${layering?.visiblePct[p.id]?.toFixed(0) ?? "?"}%` +
      (p.valid ? "" : `<br><span class="err">${p.problems[0]}</span>`);
    return;
  }
  const hit = toSurface({ clientX: ev.clientX, clientY: ev.clientY });
  if (hit) {
    const raw = pick(ev, shellMeshes);
    const inv = surf.inverse([raw.point.x, raw.point.y, raw.point.z]);
    const ci = cellIndexOf(inv.theta, inv.s);
    const cell = ci >= 0 ? cellByIndex[ci] : null;
    $("hover").innerHTML = cell ?
      `θ <b>${inv.theta.toFixed(1)}°</b> · s <b>${inv.s.toFixed(1)} mm</b><br>` +
      `k1 ${cell.k1.toExponential(2)} · k2 ${cell.k2.toExponential(2)}<br>` +
      `K ${cell.K.toExponential(2)} · r_min ${cell.rmin ?? "∞"} mm<br>` +
      `max class <b>${cell.max_class ?? "—"}</b>` +
      (hit.snapKind ? ` · snap: ${hit.snapKind}` : "")
      : "off the analyzed cells";
  } else {
    $("hover").textContent = "hover the shell…";
  }
});

renderer.domElement.addEventListener("pointerup", (ev) => {
  const wasDrag = dragging;
  dragging = false;
  controls.enabled = true;
  const moved = downPos && Math.hypot(ev.clientX - downPos[0], ev.clientY - downPos[1]) > 5;
  if (wasDrag) { scheduleServerResolve(); updateSidebar(); return; }
  if (moved) return;                       // orbit, not a click
  if (pickPanel(ev)) { updateSidebar(); return; }
  const hit = toSurface(ev);
  if (!hit) return;
  // place a new panel; clicking the -theta side authors its |theta| source
  let th = +hit.theta.toFixed(4), mirrored = true;
  if (Math.abs(th) < 1e-6) { th = 0; mirrored = false; }
  if (th < 0) th = -th;
  const id = nextId();
  mutate(() => authored.push({
    id, class: activeClass, theta: th, s: +hit.s.toFixed(3),
    rotation: 0, layer: 0, mirrored }));
  selectedId = id;
  resolveLocal();
  status(`placed '${id}' (${activeClass}) at θ ${th}°, s ${hit.s.toFixed(1)} mm${hit.snapKind ? " — snapped to " + hit.snapKind : ""}`);
});

function nextId() {
  let n = 1;
  while (authored.some(a => a.id === `p${n}`)) n++;
  return `p${n}`;
}

// ---------------------------------------------------------------- actions
const withSelected = (fn) => {
  const src = authored.find(a => a.id === selectedId);
  if (src) mutate(() => fn(src));
};
$("rotBtn").onclick = () => withSelected(s => s.rotation = s.rotation === 0 ? 180 : 0);
$("layerUp").onclick = () => withSelected(s => s.layer += 1);
$("layerDown").onclick = () => withSelected(s => s.layer = Math.max(0, s.layer - 1));
$("mirrorBtn").onclick = () => withSelected(s => {
  if (s.theta === 0) { status("θ = 0 panels are single by definition", "warn"); return; }
  s.mirrored = !s.mirrored;
});
$("delBtn").onclick = () => {
  if (!selectedId) return;
  mutate(() => authored = authored.filter(a => a.id !== selectedId));
  selectedId = null;
};

function undo() {
  if (!history.length) return;
  redoStack.push(snapshot());
  authored = history.pop();
  setDirty(true); resolveLocal(); scheduleServerResolve();
}
function redo() {
  if (!redoStack.length) return;
  history.push(snapshot());
  authored = redoStack.pop();
  setDirty(true); resolveLocal(); scheduleServerResolve();
}
$("undoBtn").onclick = undo;
$("redoBtn").onclick = redo;

async function save() {
  try {
    const r = await fetch("/api/layout", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panels: authored }) });
    const data = await r.json();
    if (!r.ok) { status(`save rejected: ${data.error}`, "err"); return; }
    serverInfo = data.resolved;
    setDirty(false);
    updateSidebar();
    status("layout.yaml saved (canonical, lossless)", "ok");
  } catch (e) { status(`save failed: ${e}`, "err"); }
}
$("saveBtn").onclick = save;

$("publishBtn").onclick = async () => {
  status("publishing glTF…");
  try {
    const r = await fetch("/api/publish", { method: "POST" });
    const data = await r.json();
    if (!r.ok) { status(`publish failed: ${data.error}`, "err"); return; }
    status(`published dress-shell.glb — ${data.summary.panels} panels, ` +
           `uncovered ${data.summary.uncovered_pct}%, stack ${data.summary.max_stack_mm} mm. ` +
           `Commit dress/ to ship.`, "ok");
  } catch (e) { status(`publish failed: ${e}`, "err"); }
};

// toggles
$("gridBtn").onclick = () => { gridGroup.visible = !gridGroup.visible;
  $("gridBtn").classList.toggle("on", gridGroup.visible); };
$("snapBtn").onclick = () => { snapOn = !snapOn;
  $("snapBtn").classList.toggle("on", snapOn); };
$("heatBtn").onclick = () => { heatUnderPanels = !heatUnderPanels;
  $("heatBtn").classList.toggle("on", heatUnderPanels);
  shadeMode = heatUnderPanels ? shadeMode : "plain"; applyShading(); };
document.querySelectorAll("#modes button").forEach(b =>
  b.onclick = () => { shadeMode = b.dataset.mode; applyShading(); });

addEventListener("keydown", (ev) => {
  if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
  const ctrl = ev.ctrlKey || ev.metaKey;
  if (ctrl && ev.key.toLowerCase() === "z" && !ev.shiftKey) { ev.preventDefault(); undo(); }
  else if (ctrl && (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey))) { ev.preventDefault(); redo(); }
  else if (ctrl && ev.key.toLowerCase() === "s") { ev.preventDefault(); save(); }
  else if (ev.key === "r" || ev.key === "R") $("rotBtn").onclick();
  else if (ev.key === "[") $("layerDown").onclick();
  else if (ev.key === "]") $("layerUp").onclick();
  else if (ev.key === "m" || ev.key === "M") $("mirrorBtn").onclick();
  else if (ev.key === "Delete" || ev.key === "Backspace") $("delBtn").onclick();
  else if (ev.key === "g" || ev.key === "G") $("gridBtn").onclick();
  else if (ev.key === "n" || ev.key === "N") $("snapBtn").onclick();
  else if (ev.key === "1") { shadeMode = "class"; applyShading(); }
  else if (ev.key === "2") { shadeMode = "gaussian"; applyShading(); }
  else if (ev.key === "3") { shadeMode = "plain"; applyShading(); }
});

// ---------------------------------------------------------------- boot
resolveLocal();
applyShading();
if (restoredDirty) { setDirty(true); scheduleServerResolve(); }
status(`ready — ${state.grid.stats.count} cells · tolerance ${TOL} mm · ` +
       `grid ${state.grid.dtheta}° × ${state.grid.ds} mm · ` +
       `hem ${state.params.hem_circumference} mm · n ${state.params.dome_n} · ` +
       `hem ratio ${state.params.skirt_hem_ratio} (${state.params.ratio_blend})`);
(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();
