/* ===================================================================
   bloom.js — Parametric Bloom app. Charter: docs/bloom-charter.md.

   The registry (bloom-registry.js) is the single source of truth: this file
   GENERATES the panel DOM from it and derives inputs, readUI, DEFAULTS,
   reset, labels, listeners and visibility from the same rows. There is no
   second list of controls anywhere, and applyVisibility() is the only thing
   that hides a control wrapper.
   =================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { CONTROLS, SECTIONS, DEFAULTS, evalPredicate, coerceValue, sectionLabel } from './bloom-registry.js';
import { MeshBuilder, buildBloomInto, footRing, thicknessProfile, MIN_FEATURE_MM, FOOT_MIN_WIDTH_MM, FOOT_MAX_WIDTH_MM, SPIRAL_LEGIBLE_COUNT, MIRROR_THROUGH_GAP } from './bloom-geometry.js';
import { VIEW_PRESETS } from './bloom-view-presets.js';

/* Cap the OUTPUT, never an input proxy (flower lesson: the parameter space
   has genuine cliffs no input-space guard can see). Measured against the
   export triangle count; export refuses above this. Phase-1 geometry peaks
   near 60k export tris at petalCount 40, so the cap is slack by design —
   it exists so the refusal path is real before it is ever needed. */
const EXPORT_TRI_BUDGET = 1_500_000;

/* ---------------- panel: generated from the registry ---------------- */
const panelRoot = document.getElementById('panelControls');
const inputs = {};   // id -> input element
const valSpans = {}; // id -> read-out span
const wrappers = {}; // id -> control wrapper div
const sectionEls = {}; // section id -> <details>
const summaryEls = {}; // section id -> its <summary>, for the derived labels refreshLabels() rewrites
/* hiddenReason captions: ONE element per distinct reason object per parent —
   the registry declares the reason once and references it from every section
   that hides for it, so identity is what makes the caption single. */
const whyEls = new Map(); // reason object -> { el, parent, sections: [ids] }

function makeInput(c) {
  if (c.kind === 'slider') {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = c.min; input.max = c.max; input.step = c.step;
    return input;
  }
  if (c.kind === 'choice') {
    const sel = document.createElement('select');
    for (const o of c.options) {
      const opt = document.createElement('option');
      opt.value = o.value; opt.textContent = o.label;
      sel.append(opt);
    }
    return sel;
  }
  throw new Error(`unhandled control kind "${c.kind}" for ${c.id}`);
}

/* SECTIONS FIRST, in the registry's order, then each control into the section
   IT declares. Two loops rather than one, because the section order and the
   within-section order are different questions with different owners: the
   SECTIONS array answers the first, the CONTROLS array's own order answers the
   second. A control is appended to a section that must already exist —
   verifySections() has thrown at module load if any control names one that
   does not, so there is no silent-drop path to guard against here.

   <details>/<summary> IS THE MECHANISM, and it is chosen for a property
   rather than for being native: a control inside a CLOSED <details> keeps its
   value, its listeners and its read-out span, answers getElementById, and
   accepts a programmatic `.value` plus real input/change events — so collapse
   cannot reach readUI, the gates' read-back, or the harness, which set values
   exactly that way and never by clicking. Measured before it was built on,
   and asserted every run by tools/verify-bloom-panel.mjs; the browser also
   gives keyboard operation and open/close state for free, with no JS to hold
   it and nothing to desync. */
for (const s of SECTIONS) {
  const det = document.createElement('details');
  det.className = s.parent ? 'bl-sec bl-sec--sub' : 'bl-sec';
  det.id = `sec-${s.id}`;
  det.dataset.section = s.id;
  if (s.parent) det.dataset.parent = s.parent;
  /* The FIRST-LOAD state, from the registry's literal. Never written again by
     this file: once the page is up, open/close belongs to the visitor. */
  det.open = s.open;
  const sum = document.createElement('summary');
  /* Through the registry's one owner of the summary text, at the DEFAULTS the
     page loads with — a derived label (the rosette's hood group, whose petal
     number moves with petalCount) is right from the first paint rather than
     after the first rebuild corrects it. */
  sum.textContent = sectionLabel(s, DEFAULTS);
  det.append(sum);
  summaryEls[s.id] = sum;
  /* A NESTED SECTION GOES INSIDE ITS PARENT'S ELEMENT, which the registry
     guarantees already exists: SECTIONS is authored parents-first and
     verifySections() has thrown at module load if a parent is missing or is
     itself nested, so there is no ordering to get wrong here and no
     silent-drop path to guard against. */
  /* THE CAPTION GOES WHERE THE FIRST DROP-DOWN THAT HIDES FOR THIS REASON
     WOULD BE — appended before that section's own element, once. It is text,
     never a control: applyVisibility() is still the only thing that decides
     whether it shows, and refreshLabels() the only thing that writes it. */
  if (s.hiddenReason) {
    let w = whyEls.get(s.hiddenReason);
    if (!w) {
      const el = document.createElement('p');
      el.className = 'bl-why';
      el.hidden = true;
      sectionEls[s.parent].append(el);
      w = { el, parent: s.parent, sections: [] };
      whyEls.set(s.hiddenReason, w);
    }
    w.sections.push(s.id);
    w.el.dataset.why = w.sections.join(' ');
  }
  (s.parent ? sectionEls[s.parent] : panelRoot).append(det);
  sectionEls[s.id] = det;
}

/* THE ACCORDION — opening a section closes the others (Eva's ruling, Sep 1,
   with the tradeoff stated and accepted: tweaking across two sections costs a
   reopen click, and the layers-are-sections structure makes single-focus the
   normal case).

   ONE LISTENER, ONE OWNER. `toggle` does NOT bubble, so this is registered in
   the CAPTURE phase on the panel root — capture descends from the document
   through every ancestor regardless of bubbling, so one listener here sees
   every section's toggle. The alternative, a listener per <details>, is N
   copies of one rule and the thing that drifts; measured before it was built
   on rather than assumed from the spec.

   `toggle` IS QUEUED, NOT SYNCHRONOUS — measured, and it is the reason this
   is written as a correction rather than a veto. Two programmatic opens in one
   tick BOTH land, and this handler then runs twice and settles on the last
   one. So exclusivity is eventually-consistent within a tick, which is
   invisible to a visitor (one click is one toggle) and is exactly what a test
   asserting exclusivity synchronously would fail on. tools/verify-bloom-panel
   awaits a frame before every accordion assertion for that reason.

   It cannot recurse: closing the others fires their toggles, and a toggle
   whose target is now CLOSED returns immediately. Closing the open section is
   left alone — zero sections open is a state the visitor can reach and the
   registry may declare. This never touches `hidden`; applyVisibility() owns
   that, and open/closed and shown/hidden are different questions. */
panelRoot.addEventListener('toggle', (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !panelRoot.contains(det)) return;
  if (!det.open) return;
  /* OPENING A DROP-DOWN CLOSES ITS SIBLINGS — the same rule this listener has
     always applied, stated one level more generally so nesting falls out of it
     (Eva, Sep 3). At the top level a section's siblings ARE the other
     sections, so the shipped behaviour is unchanged; inside "Petal roles",
     opening Petal 2 closes Petal 1 and leaves the parent open, because the
     parent is not a sibling. A second listener for the nested set would have
     been N copies of one rule, which is the thing that drifts — and it is why
     the guard is "inside the panel" rather than "a direct child of it". */
  for (const other of det.parentElement.children) {
    if (other !== det && other instanceof HTMLDetailsElement) other.open = false;
  }
}, true);

for (const c of CONTROLS) {
  const wrap = document.createElement('div');
  wrap.className = 'bl-ctrl';
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.append(c.label);
  const val = document.createElement('span');
  val.className = 'bl-val';
  label.append(val);
  const input = makeInput(c);
  input.id = c.id;
  input.value = c.default;
  wrap.append(label, input);
  sectionEls[c.section].append(wrap);
  inputs[c.id] = input; valSpans[c.id] = val; wrappers[c.id] = wrap;
}

/* Coercion is the REGISTRY's rule, imported — not re-decided here. A slider
   is a number and a choice is a string; a local `Number(...)` would turn
   `placement` into NaN, which reads back as a legitimate-looking value and is
   how a gate ends up measuring a design other than the one it names. */
function readUI() {
  const out = {};
  for (const c of CONTROLS) out[c.id] = coerceValue(c, inputs[c.id].value);
  return out;
}
/* Harness hook: gates read the app's own state snapshot rather than keeping a
   second copy of readUI's coercion rules. */
window.__bloomUIState = () => readUI();

/* Harness hooks for the contact sheet, same doctrine as body.bl-preview: the
   tool ASKS THE APP rather than recomputing. __bloomMetrics reports the live
   build's own numbers so a caption can never disagree with the model in the
   frame; __bloomFrame drives the app's own fitCamera so the centre zoom is
   the real camera at a different radius, not a crop guessing at projection.
   Assigned after the scene exists — see below. */

/* fmt receives the control's own value AND the whole state snapshot: Tip
   taper prints the DERIVED widest point a/(a+b), which needs the other
   taper. Every other fmt ignores the second argument. A control for the
   widest point would be a second owner of a derived quantity. */
function refreshLabels(ui) {
  for (const c of CONTROLS) valSpans[c.id].textContent = c.fmt(ui[c.id], ui);
  /* A SECTION'S SUMMARY CAN BE DERIVED TOO (Eva's ruling A, Sep 3): the
     rosette's hood group is "Petal N" where N is the last orbit's number,
     which moves with petalCount. Same snapshot, same pass, same owner
     (sectionLabel) as the generator used — a static label is rewritten with
     itself, which is cheaper than a second list of which sections vary. */
  for (const s of SECTIONS) summaryEls[s.id].textContent = sectionLabel(s, ui);
  for (const [reason, w] of whyEls) w.el.textContent = reason.text(ui);
}

/* The ONLY setter of a control wrapper's hidden — evaluates the registry's
   predicate against one state snapshot, so every control is decided against
   the same state.

   A SECTION'S visibility is DERIVED here from the controls it holds, never
   declared: a section is hidden when, and only when, every control in it is
   hidden. That adds no second gating mechanism — the decision is made from
   the same `ui` snapshot that decided those controls, so it cannot disagree
   with one — and it means a section can never render as a header opening onto
   nothing. The per-petal drop-downs reach that state under every placement
   but FAN, which is the rule working rather than a claim about today's
   registry. Hiding a section is NOT collapsing it — `hidden` removes it; the
   `open` attribute is the visitor's, and this function never touches it. */
function applyVisibility() {
  const ui = readUI();
  for (const c of CONTROLS) wrappers[c.id].hidden = !evalPredicate(c.visibleWhen, ui);
  /* CHILDREN FIRST, THEN PARENTS — one pass each, because a parent's answer
     READS its children's. SECTIONS is authored parents-first, so this walks it
     backwards for the child pass; a parent holding only child sections has no
     controls of its own, and `every` over an empty set is true, so without the
     second term it would hide itself while its children were on screen. */
  const childrenOf = new Map();
  for (const s of SECTIONS) {
    if (!s.parent) continue;
    if (!childrenOf.has(s.parent)) childrenOf.set(s.parent, []);
    childrenOf.get(s.parent).push(s.id);
  }
  for (let i = SECTIONS.length - 1; i >= 0; i--) {
    const s = SECTIONS[i];
    const noControls = CONTROLS.every((c) => c.section !== s.id || wrappers[c.id].hidden);
    const kids = childrenOf.get(s.id) || [];
    const noKids = kids.every((id) => sectionEls[id].hidden);
    /* A CAPTION SHOWS EXACTLY WHEN ITS REASON HOLDS AND EVERY SECTION THAT
       NAMES IT IS HIDDEN — decided here, once, on the way up: this parent's
       children have already settled (they come later in SECTIONS, so earlier
       in this walk), so the caption can read them, and a visible caption is
       content that keeps its parent on screen. */
    let noWhy = true;
    for (const [reason, w] of whyEls) {
      if (w.parent !== s.id) continue;
      w.el.hidden = !(evalPredicate(reason.when, ui) && w.sections.every((id) => sectionEls[id].hidden));
      if (!w.el.hidden) noWhy = false;
    }
    sectionEls[s.id].hidden = noControls && noKids && noWhy;
  }
}

document.getElementById('resetBtn').addEventListener('click', () => {
  for (const c of CONTROLS) {
    inputs[c.id].value = DEFAULTS[c.id];
    inputs[c.id].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[c.id].dispatchEvent(new Event('change', { bubbles: true }));
  }
});

/* ---------------- scene ---------------- */
const canvas = document.getElementById('bloom-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f0e);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
/* THE ORBIT AXIS BUG (Eva, Sep 2 — "feels really difficult... like it's
   fighting against me"), root-caused rather than guessed at. OrbitControls
   captures its orbit-math pole from `object.up` ONCE, inside an IIFE at
   construction time (three.js's own OrbitControls.js: `this.update =
   (function () { const quat = Quaternion().setFromUnitVectors(object.up,
   Vector3(0,1,0)); ...; return function update() {...}; })()`) — it is NOT
   re-read on later frames even though `camera.up` itself can still be
   reassigned afterward for rendering. `camera.up` defaults to three.js's
   own (0,1,0) until fitCamera() first runs and sets it to (0,0,1) — but
   fitCamera only runs inside regenerate(), AFTER `new OrbitControls(...)`
   below had already captured the WRONG pole (Y) as this app's model is
   Z-up throughout (buildPetalInto's own R/T/Z frame). Measured directly
   (a probe exposing camera/controls to a headless page): a purely
   horizontal drag moved Y not at all and rotated X/Z instead of X/Y, and a
   vertical drag drove the camera toward alignment with the Y axis rather
   than tilting over the bloom — orbiting a pole that has nothing to do
   with what is on screen, which is exactly what reads as fighting/hitting
   a wall. The fix is ORDER: set camera.up to this app's real vertical
   BEFORE OrbitControls captures it, not after. */
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = document.getElementById('autoRotate').checked;
controls.autoRotateSpeed = 1.2;
document.getElementById('autoRotate').addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});
let userMoved = false;
/* True only between a FAN placement-snap and whatever ends it — a manual
   orbit, a manual VIEW-dropdown pick, or leaving FAN. While true, every
   rebuild re-centres the (already top-down) camera on the model's fresh
   bounding-sphere centre — see recenterFanView(). It is a NARROWER flag
   than `userMoved`: `userMoved` means "the automatic default fit is the
   user's to drive now" and is permanent once set (existing behaviour,
   unchanged); this one means "still actively holding the FAN's own snap",
   and either a drag or a fresh preset pick ends it without touching
   `userMoved`. */
let fanViewLocked = false;
controls.addEventListener('start', () => {
  userMoved = true;
  fanViewLocked = false;
  if (viewTween) { controls.autoRotate = document.getElementById('autoRotate').checked; viewTween = null; }
});

scene.add(new THREE.HemisphereLight(0xdfefe6, 0x1a221e, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(60, 40, 90);
scene.add(key);

const material = new THREE.MeshStandardMaterial({ color: 0xc9dfd2, roughness: 0.62, metalness: 0.05 });
let mesh = null;

const DEG = Math.PI / 180;   // VIEW_PRESETS' distances are fov-aware (radius/tan(fov/2)), not a bare radius*k

/* THE ONE OWNER of "frame a sphere of this radius". The automatic fit and the
   contact sheet's centre zoom are the same operation at two radii, so they are
   the same function; a screenshot tool re-deriving the projection would be a
   second copy of the camera rule, which is this project's most repeated
   defect wearing a lens. `lift` raises the orbit target off the origin — the
   whole-bloom view looks slightly up into the whorl, a centre crop looks
   straight at the hub plane. */
/* `up` IS EXPLICIT NOW, AND DEFAULTED SO NOTHING MOVES (session B, Sep 2).
   Every existing caller omits it and gets [0,0,1] — the value this function
   has always hardcoded — so every sheet taken before today frames identically.

   WHY IT WAS WORTH ADDING. Looking straight down the axis passes
   dir = [0,0,1] with up = [0,0,1], which are PARALLEL: the camera's roll is
   then whatever three.js's degenerate fallback picks, so "face-on" has never
   had a defined orientation in this codebase. That did not matter while every
   bloom was radially symmetric — one roll is as good as another. It matters
   the moment the flower has a FACE: a zygomorphic bloom read face-on has an
   up and a down, and the sheet that shows the labellum below and the hood
   above must be able to say so rather than hope. */
function fitCamera(radius, lift = 0.15, at = null, dir = null, up = null) {
  /* The axis-framing path is byte-for-byte the original: a single-petal crop
     is a NEW capability, and widening a signature must never move the shot
     every existing sheet was taken with. The 40 mm distance floor belongs to
     that path only — it keeps a tiny bloom from being framed absurdly close,
     and it would otherwise stop a petal crop ever getting close enough to
     read an outline. */
  if (!at) {
    const d = Math.max(40, radius * 2.6);
    camera.position.set(d * 0.75, -d * 0.75, d * 0.6);
    camera.up.set(0, 0, 1);
    controls.target.set(0, 0, radius * lift);
    return;
  }
  /* Targeted framing, optionally along a given view direction. A SILHOUETTE
     is an outline, and an outline seen at three-quarters is foreshortened —
     so the silhouette sheet asks to look down the petal's own normal, which
     the builder reports. The direction is normalised here so `radius` means
     the same distance whichever way the camera is pointing. */
  const d = radius * 2.6;
  const v = dir || [0.75, -0.75, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  camera.position.set(at[0] + (v[0] / n) * d, at[1] + (v[1] / n) * d, at[2] + (v[2] / n) * d);
  camera.up.set(...(up || [0, 0, 1]));
  controls.target.set(at[0], at[1], at[2]);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------------- build ---------------- */
const readout = document.getElementById('readout');
let shownSummary = '';   // the read-out for whatever geometry is on screen, in that geometry's mode

/* ===================================================================
   THE PRINT-PREVIEW TOGGLE (Eva, Sep 3 — unparked from the charter, where it
   sat since the thickness layer), and `shownMode()` is THE ONE OWNER of
   "which geometry is on screen".

   A VIEW CONTROL, NEVER A GEOMETRY CONTROL. It is a raw DOM reference in the
   VIEW box exactly like `autoRotate` and `viewPreset`: not in `inputs`, not a
   CONTROLS row, invisible to readUI(), DEFAULTS, reset, fullStateDrift and
   every gate that reads UI state. Checked, regenerate() builds the viewport
   from an EXPORT-mode accumulator — the sheet, tip and foot floored at
   MIN_FEATURE_MM and the ring re-derived by the area rule from the floored
   feet — which is the object the printer will make. At three-figure petal
   counts that is the difference between a render with visible gaps and a
   print with none (Eva's mum run: 120 feet at 1.60 mm on a 3.63 mm ring live
   against 4.69 mm printed).

   THE EXPORT BYTES CANNOT MOVE WITH IT, and the argument is structural rather
   than a measurement that happened to come out clean: the Get STL handler
   builds `buildGeometry({ exportMode: true })` from readUI(), and this box is
   not in readUI(). There is no branch in the export path that can observe
   it. What the toggle DOES change is the telemetry cache — see
   buildGeometry's `record` — so an export click can never overwrite what is
   on screen and the export build can never be mistaken for the live one.
   Both STL gates assert the shown mode is LIVE on every row (every "(live)"
   label they print depends on it), and the panel gate flips the real box and
   requires the exports on either side of it byte-identical.

   EVERY CONSUMER READS THIS FUNCTION: regenerate(), the read-out's first
   line, the print-truth pair's on-screen marker, and __bloomMetrics()'s
   `shownMode`. A second reading of the checkbox anywhere would be a second
   owner of the one boundary this control is about. */
const printPreviewInput = document.getElementById('printPreview');
function shownMode() { return printPreviewInput && printPreviewInput.checked ? 'export' : 'live'; }
let lastShownMode = 'live';

let lastRing = { radius: 0, derivedRadius: 0 };   // ring 0 — what every pre-layer consumer read
let lastRings = [];                               // every ring, in build order
let lastHub = { radius: 0, thickness: 0 };
let lastFoot = { guardResidual: null, layerCount: 1, continuousMode: false, sequenceLength: 0, quantizerResiduals: null, slotRolesEligible: false, slotRolesSplit: false, fan: null, mirror: null, slotCount: 0, slotRoleCensus: null, perPetalEligible: false, petalRoleCensus: null, petalGroupCount: null, allPetalsEligible: false, sphereMode: false };
let lastHubBuilt = { dome: null, tris: 0 };            // what buildHubInto actually built — J3 reads it against the feet
let lastPetal = null;                             // layer 0's petal — likewise
let lastPetals = [];
/* THE BUILDER'S OWN TALLY of buildPetalInto calls — Z1's independent
   quantity, so the role partition is checked against what was BUILT rather
   than against another number the same owner produced. */
let lastPetalsBuilt = 0;
/* EVERY SLOT'S AZIMUTH, one row per whorl — the input to J7 and Z4b, and new
   in the fan session because nothing here had ever recorded a position around
   the axis. See buildBloomInto's own note: before this existed, both STL
   gates, every J-assertion and every Z-assertion were azimuth-blind, so a fan
   that silently built a full ring would have passed all of them at an
   identical triangle count and STL byte length. */
let lastSlotAzimuths = [];
/* THE ANDROECIUM (session 21): footRing()'s descriptor, the builder's own
   per-stamen emission records, its free-end tally and the two distance
   flags — the inputs of JS1-JS4 and of the read-out's STAMENS line. */
let lastAndroecium = null, lastStamens = [], lastFreeEnds = 0, lastStamenNearest = null;
/* THE PLACEMENT THE BUILD WAS MADE FROM — the registry control's value, kept
   beside footRing()'s own `fan` record so J7 can cross-check the two. They
   are genuinely two owners of one boundary (the registry owns the option
   list; footRing() branches on it), which is the same relation Z5 already
   checks for slot-role eligibility, and the same remedy: assert they agree on
   every row rather than comment that they do. */
let lastPlacement = 'RADIAL';
let lastTris = 0, lastMaxDim = 0, lastFitRadius = 0;
let lastFitCenter = [0, 0, 0];

/* THE NON-SHIPPING PETAL-MODEL OVERRIDE. null in every reachable state:
   there is no registry row, no DOM input, and no listener that writes it —
   window.__bloomCapability (below) is the only writer, and only the gates
   and the contact sheet call it. It exists so "architected for claw and
   cleft" is a thing the gates BUILD and MEASURE rather than a sentence in a
   header. Because it is not a control, the gates' whole-state read-back is
   unaffected: their fullStateDrift still compares every registry control
   against DEFAULTS + set, and this is invisible to it — which is why the
   capability rows carry their OWN read-back assertion. */
let capability = null;

/* `record` — whether this build is THE ONE ON SCREEN, and therefore the one
   the telemetry cache, the read-out and __bloomMetrics() describe. Until the
   print-preview toggle this was `!exportMode`, which was the same thing while
   only regenerate() built live and only the export handler built floored.
   It is not the same thing any more: a previewed build is export-mode AND on
   screen, and an export click during a preview is export-mode and NOT. Keying
   the cache off the mode would let the Get STL build overwrite what the
   viewport shows — the mislabelled-telemetry mutant (T2) the crowding
   instrument's R2 catches on every floor-binding row — so the caller says
   which build it is making, and only regenerate() says `record: true`. */
function buildGeometry({ exportMode, record = false }) {
  const acc = new MeshBuilder({ exportMode });
  const uiForBuild = readUI();
  const built = buildBloomInto(acc, uiForBuild, { below: null, capability });   // 'stem' | 'branch' | null — null is phase 1's only state
  if (record) {
    lastShownMode = exportMode ? 'export' : 'live';
    lastPlacement = uiForBuild.placement;
    lastRing = built.ring; lastRings = built.rings; lastHub = built.hub; lastFoot = built.foot;
    lastPetal = built.petal; lastPetals = built.petals; lastHubBuilt = built.hubBuilt;
    lastPetalsBuilt = built.petalsBuilt; lastSlotAzimuths = built.slotAzimuths;
    lastAndroecium = built.androecium; lastStamens = built.stamens; lastFreeEnds = built.freeEnds; lastStamenNearest = built.stamenNearest;
    lastTris = acc.triangleCount; lastMaxDim = acc.maxDimensionMm;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3));
  geo.computeVertexNormals();
  /* `built` is returned as well as cached, so the export path can summarise
     the geometry IT built rather than reading the live cache — the two are
     different geometry whenever a floor binds, and a summary that mixes them
     is the unlabelled-mode defect this file's every other number avoids. */
  return { geo, acc, built };
}

/* The readout's one-line summary. Every number carries its MODE, because live
   and export are different geometry and not convertible.

   MAX DIM is reported, never enforced. Reachable states cross process caps —
   dyed PA12 tops out near 180 mm on the shortest axis, standard white goes
   much larger, and SLS nests in any orientation so the only question is
   whether the box fits. Which cap applies is the user's call at order time,
   so this is a number at the slider, not a clamp and not a refusal. (The one
   thing this generator DOES refuse is triangle count, because that is a
   property of the file rather than of somebody's process.) */
/* THE PRINT-TRUTH LINE — what the object will actually be made of, and where
   that differs from what is on screen.

   Until the thickness layer live and export geometry were the same thing:
   SHEET_THICKNESS_MM (1.2) sat above MIN_FEATURE_MM (1.0), so the export
   floor never bound and the preview was the print. The thickness controls end
   that. Below 1.00 mm the exported sheet is floored, and because footRing()'s
   AREA RULE reads the thickness the solids are actually built at, the floor
   moves the RING RADIUS too — at a 0.60 mm sheet the ring is 6.25 mm live and
   8.07 mm printed, a 29% difference in the whole arrangement, not a wall.

   EVA'S RULING (Aug 31): no geometry change in either mode — the one-owner
   rule is working exactly as footRing()'s header says it should, and live
   mode stays authoring-true — but the divergence must be TOLD. A preview that
   silently shows an arrangement the print will not produce is the same lie as
   an unlabelled triangle count; a labelled one is honest. So both numbers
   appear, labelled, whenever they differ, and the second line is absent when
   they do not. A "print preview" toggle that renders the floored geometry
   live is PARKED in the charter and deliberately not built here.

   footRing() is asked the same question twice rather than anything
   re-deriving a radius: two throwaway accumulators differing only in mode,
   emitting no triangles. The one owner answers both.

   THE TOGGLE IS BUILT NOW (Sep 3) AND THIS PAIR STAYS: the two lines are the
   two geometries and the toggle only decides which one the viewport renders.
   So the marker moves rather than the lines duplicating — `← on screen`
   lands on whichever line `shownMode()` names, and the other keeps its own
   label. One owner for the choice, two labelled numbers as before. */
function materialLines(ui, mode) {
  /* Ring 0 — the outermost, which is the ring this line has always reported
     and the one the hub is built on (hub.radius IS rings[0].radius in every
     placement). The inner rings' radii are on the arrangement line, where the
     depth that produced them is also visible. */
  const live = footRing(ui, new MeshBuilder({ exportMode: false })).rings[0];
  const printed = footRing(ui, new MeshBuilder({ exportMode: true })).rings[0];
  const say = (r) => {
    const tip = thicknessProfile(r, ui).at(1);
    const tipShown = r === printed ? Math.max(tip, MIN_FEATURE_MM) : tip;
    return `sheet ${r.thickness.toFixed(2)} mm · tip ${tipShown.toFixed(2)} mm`
         + ` · foot ${r.width.toFixed(2)} × ${r.thickness.toFixed(2)} mm${r.widthClamped ? ' (CLAMPED)' : ''}`
         + ` · ring ${r.radius.toFixed(2)} mm`;
  };
  const a = say(live), b = say(printed);
  return a === b ? a
    : `${a}   ← live${mode === 'live' ? ', on screen' : ''}\nPRINTED (export floor ${MIN_FEATURE_MM.toFixed(2)} mm): ${b}${mode === 'export' ? '   ← on screen' : ''}`;
}

/* THE FIRST LINE OF THE READ-OUT names the geometry on screen, always — in
   live mode too, because a state that is only ever implied is a state the
   reader has to infer, and the toggle's whole reason to exist is that live
   and printed are different objects now. Reads shownMode(); owns nothing. */
function showingLine(mode) {
  return mode === 'export'
    ? `on screen: PRINT PREVIEW — export floor ${MIN_FEATURE_MM.toFixed(2)} mm applied to sheet, tip and foot, ring re-derived from the floored feet\n`
    : 'on screen: LIVE geometry, as authored (the print-truth line below says where the print differs)\n';
}

/* THE LOW-COUNT SPIRAL FLAG — the whole of how phyllotaxis below eight petals
   is handled, and it is a LABEL rather than a gate on purpose.

   The charter used to say "gate or flag golden-angle placement at low counts".
   Measured Sep 1 (see GOLDEN_ANGLE in bloom-geometry.js): the obvious
   statistic, the ratio of largest to smallest angular gap, oscillates between
   1.62 and 2.62 at EVERY count and has no discontinuity at 8 or anywhere
   else. There is no geometric threshold to gate on. The rule is a real
   AESTHETIC claim — below roughly eight petals the golden angle reads as an
   irregular whorl rather than as a spiral — and the honest handling of an
   aesthetic claim is to say so where the user is looking.

   Gating was considered and rejected on two further grounds, recorded so it
   is not re-proposed: hiding the option would leave the model IN the spiral
   state with the control unreachable ("shipped means reachable", violated for
   the state the model is in), and auto-resetting to RADIAL would move
   geometry as a side effect of a hidden rule. Same discipline as the roll
   clamp's "(clamped)" and the print-truth line: an unlabelled state is the
   lie, a labelled one is honest.

   ASSERTED IN BOTH DIRECTIONS by the panel gate — it must appear when the
   condition holds and must be absent when it does not. A flag nothing checks
   for absence is a flag that can be stuck on. */
/* WHAT IT COUNTS IS THE SEQUENCE, and `petalCount` stopped being that number
   when CONTINUOUS arrived. The aesthetic claim is about how many elements the
   golden angle has to work with before parastichies read: under SPIRAL each
   whorl runs its own sequence, so that is `petalCount`; under CONTINUOUS the
   whole bloom is one sequence of `petalCount * layerCount`. footRing() owns
   the number and this reads it, so SPIRAL's behaviour is unchanged to the
   character (sequenceLength IS petalCount there) while the claim stays true
   in the new mode. */
function spiralLowCount(ui, fr) {
  return (ui.placement === 'SPIRAL' || ui.placement === 'CONTINUOUS')
    && fr.sequenceLength < SPIRAL_LEGIBLE_COUNT;
}

/* THE FOOT-FLOOR RANGE, and why it is a RANGE now. Under the ringed arm
   `widthClamped` was a per-layer flag and there were at most three of them.
   A continuous bloom has up to 120 feet and the floor binds from some
   crossing index onward — so "which slots" became a real question, and a bare
   "(CLAMPED)" would answer it with a word where the honest answer is two
   numbers. Same discipline as the roll clamp and the print-truth line: a
   slider that has gone quiet must say where. Returns '' when nothing is
   floored, so the line simply is not there rather than saying "none". */
/* WHICH RINGS A FOOT CLAMP TOOK OVER ON — one owner for the phrasing, because
   the floor and the ceiling ask the same question at opposite ends of one
   clamp and two copies of it would drift in wording alone. */
function clampedRingsPhrase(rings, hit) {
  /* COUNTED IN WHORLS, NOT DESCRIPTORS (session B). A split whorl is three
     descriptors of ONE ring, and they share a foot by construction (Z6), so
     counting descriptors would report "rings 0-2 (3 of 3)" for a single-whorl
     bloom whose foot clamped once — three answers to one question, and a
     number naming a thing that is not the thing. `lambda` is the whorl. */
  const whorls = [...new Set(rings.map((r) => r.lambda))].sort((a, b) => a - b);
  const idx = whorls.filter((L) => rings.some((r) => r.lambda === L && hit(r)));
  if (!idx.length) return null;
  const first = idx[0], last = idx[idx.length - 1];
  const which = whorls.length === 1 ? 'the foot' : (first === last ? `ring ${first}` : `rings ${first}–${last}`);
  return `${which} (${idx.length} of ${whorls.length})`;
}

/* BOTH CLAMPS, BOTH REPORTED. The floor has said so since the thickness
   layer; the CEILING never did, and it binds from petalWidth 25 upward — six
   of that slider's 23 reachable values — where the blade keeps widening and
   the area-ruled ring does not move at all (measured: 10.8324 mm at 24,
   11.0558 mm at 25 and still 11.0558 mm at 30). A slider that has stopped
   moving must say so: the same (CLAMPED) discipline the roll floor, the tip
   floor and the foot floor already carry, arriving where it was always
   missing (Eva, Sep 1 — found by discovery, not by a visitor wondering why
   the ring stopped growing). No geometry moves; this is telemetry. */
function footFloorLine(rings) {
  const lo = clampedRingsPhrase(rings, (r) => r.widthClamped);
  const hi = clampedRingsPhrase(rings, (r) => r.widthClampedHigh);
  return (lo ? `FOOT WIDTH FLOORED at ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm on ${lo} — the blade keeps shrinking, the root does not\n` : '')
       + (hi ? `FOOT WIDTH CAPPED at ${FOOT_MAX_WIDTH_MM.toFixed(2)} mm on ${hi} — the blade keeps widening, the ring does not\n` : '');
}

/* THE INNER-RING LINE (Eva, Sep 3) — the read-out that stands where a derived
   depth clamp was proposed and rejected. The depth slider reaches six now and
   nothing caps it against the foot floor, because the "collision" a clamp
   would have enforced is not a buildability limit (every depth to eight
   exports watertight and as one piece) and because it is already reachable
   at depth 1..3 on shipped rows — so a clamp could not be byte-identical and
   would gate a state ruled reachable on purpose. What a visitor needs instead
   is to be TOLD, in the FOOT WIDTH FLOORED discipline: WHICH rings are
   narrower than one foot (the feet on them overlap each other), and which
   are inside their own overhang (the feet cross the axis). Both flags are
   footRing()'s own telemetry; this only names them. Absent when no ring is
   under the floor, so the line simply is not there rather than saying
   "none". The panel gate asserts it in both directions. */
function innerRingLine(rings, fr) {
  const under = clampedRingsPhrase(rings, (r) => r.underFootFloor);
  if (!under) return '';
  const cross = clampedRingsPhrase(rings, (r) => r.crossesAxis);
  /* On the dome the foot runs along the ARC and the thing it crosses is the
     apex — footRing() decides that (the flag is arc-based there); this only
     names it. */
  return `RINGS NARROWER THAN A FOOT on ${under} — under ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm, so the feet on them overlap each other`
       + (cross ? `; on ${cross} they cross the ${fr && fr.dome ? (fr.dome.closed ? 'face pole' : 'apex') : 'axis'}` : '') + `\n`;
}

/* THE DOME LINE (Sep 4) — the head rise, told in the numbers a visitor cannot
   set: the cap's radius and apex height in the shown mode, the surface-to-plan
   ratio over the feet, and THE LOCAL RELIEF at the rim and at the innermost
   ring. That last pair carries the finding this session would otherwise lose
   by session 16: the dome's extra area sits at the RIM where the slope is
   steep, while a tight bloom's feet stack at the INNER rings where the cap is
   nearly flat — so the relief is greatest where the crowding is least (the
   mum's peak is at r 2.1–2.8 mm on a 4.69 mm hub, local relief 1.1–1.2x under a
   whole-annulus 2.0x; a hemisphere takes it from D_max 11 to 9, not to 5).
   Both numbers are footRing()'s own per-ring `relief`; this only prints them.
   "(CLAMPED)" is the apex floor binding, the roll floor's own discipline:
   the rise asked and the rise built are both printed, from the owner. Absent
   when flat, so the line simply is not there. */
/* THE SPHERE LINE (session 18) — the same line's other arm, for the closed
   head: the sphere's radius, the sequence pole to pole, THE RESERVED POLE's
   clearance (the arc from the far pole to the nearest foot, and the
   equal-area step it sits inside — a future stem attaches there, and S3
   asserts it in both directions), how near the feet come to the FACE pole
   (negative: they cross it), and the apex floor's clamp on the same
   "(CLAMPED)" discipline. Absent unless the head is a sphere; the panel gate
   asserts the line and its clauses against the owner's own flags. */
function sphereLine(rings, fr, mode) {
  const d = fr.dome;
  if (!d || !d.closed) return '';
  const near = rings[d.reserved.ring];
  return `HEAD: FULL SPHERE · radius ${d.Rd.toFixed(2)} mm (${mode}) · ${d.K} petals pole to pole, equal-area step ${(Math.acos(1 - d.stepCos) * 180 / Math.PI).toFixed(2)}° at the equator`
       + ` · RESERVED POLE clear: nearest foot ${d.reserved.mm.toFixed(2)} mm (${d.reserved.deg.toFixed(2)}°) from it, ring ${d.reserved.ring} at ${(near.slope * 180 / Math.PI).toFixed(2)}° — blades converge over it, feet run the other way`
       + ` · face pole: nearest foot end ${d.faceReach.mm.toFixed(2)} mm along the meridian${d.faceReach.crossing ? ` (${d.faceReach.crossing} of ${rings.length} feet cross it)` : ''}`
       + (d.clamped ? ` · (CLAMPED: the area rule's ${fr.derivedRadius.toFixed(2)} mm ring is under one sheet, the sphere is held at ${d.floorRadius.toFixed(2)} mm — the shell's inner face would invert)` : '') + `\n`;
}

function domeLine(rings, fr, mode) {
  const d = fr.dome;
  if (!d || d.closed) return '';
  const rim = rings[0], inner = rings.reduce((a, r) => (r.radius < a.radius ? r : a), rings[0]);
  const rel = (x) => (isFinite(x) ? `${x.toFixed(2)}x` : 'vertical');
  return `HEAD RISE ${d.rise.toFixed(2)}x · dome radius ${d.Rd.toFixed(2)} mm, apex ${d.H.toFixed(2)} mm above the rim (${mode})`
       + ` · surface ${d.surfaceToPlan.toFixed(2)}x plan over the feet · local relief ${rel(rim.relief)} at the rim, ${rel(inner.relief)} at the innermost ring — the dome relieves radial stacking most where the slope is steepest, least near the apex`
       + (d.clamped ? ` · (CLAMPED: rise ${d.rise.toFixed(2)} asked, ${d.riseBuilt.toFixed(2)} built — the shell's inner face would invert under a ${d.floorRadius.toFixed(2)} mm dome radius)` : '') + `\n`;
}

/* THE SPINE LINE (session 16, the curl family) — what the spine curvature
   floor did and how near the blade came to itself, in numbers a visitor
   cannot set. Two facts, one line, from slot 0's own spine record:
     (CLAMPED)      the tightest spine radius the law asked for fell under one
                    sheet thickness (the roll floor's own constant), the
                    curvature was held there, and the turn that BUILT is
                    printed beside the turn ASKED — Eva's ruling (Sep 4):
                    full ranges, clamped, told; never an input trimmed to
                    hide a cliff.
     SELF-CONTACT   the blade comes within one sheet thickness of itself
                    (blade rows three thicknesses apart along the spine, or
                    the blade against its own foot). A FLAG, never a gate:
                    it fires on the shipped, photographed hoop.
   Absent when spine curl is 0, so the line simply is not there. The panel
   gate asserts both clauses in both directions against the builder's own
   flags (route l). */
function spineLine(petals) {
  const sps = (petals || []).map((p) => p && p.spine).filter((sp) => sp && sp.curlRad !== 0);
  if (!sps.length) return '';
  /* EVERY RING'S PETAL, because the floor binds and the flags fire on the
     SHRUNK inner whorls first: the line names the worst ring, not slot 0's. */
  const sp0 = sps[0];
  const tight = sps.reduce((a, s) => (s.peakRadiusMm < a.peakRadiusMm ? s : a), sp0);
  const clamped = sps.filter((s) => s.clamped), under = sps.filter((s) => s.underFloor), contact = sps.filter((s) => s.clearance.selfContact);
  const near = sps.reduce((a, s) => Math.min(a, s.clearance.minMm, s.clearance.minToFootMm), Infinity);
  const of = (arr) => `${arr.length} of ${sps.length} ring${sps.length === 1 ? '' : 's'}`;
  return `SPINE CURL ${sp0.turnAskedDeg}° · bias ${Number(sp0.bias).toFixed(2)} · start ${Number(sp0.start).toFixed(2)}${sp0.startFloored !== sp0.start ? ` (floored to the first blade row, ${sp0.startFloored.toFixed(3)})` : ''}`
       + ` · tightest spine radius ${tight.peakRadiusMm.toFixed(2)} mm`
       + (clamped.length ? ` (CLAMPED at one sheet thickness, ${tight.floorRadius.toFixed(2)} mm, on ${of(clamped)}: ${tight.turnAskedDeg}° asked, ${clamped.reduce((a, s) => Math.min(a, Math.abs(s.turnBuiltDeg)), Infinity).toFixed(1)}° built at the tightest — the sheet's inner face would invert under a tighter spine)` : '')
       + (under.length ? ` · UNDER ONE SHEET THICKNESS (${tight.floorRadius.toFixed(2)} mm) on ${of(under)} — the shipped uniform arc on a shrunk whorl, told, not clamped` : '')
       + ` · nearest self-approach ${isFinite(near) ? near.toFixed(2) + ' mm' : 'n/a'} against a ${sp0.clearance.sheetT.toFixed(2)} mm sheet`
       + (contact.length ? ` · SELF-CONTACT on ${of(contact)} (the blade touches itself — a flag, never a gate)` : '') + `\n`;
}

/* THE SLOT-ROLE LINE — what the mirror plane actually did, and where the
   envelope clamp bit. Two things a visitor cannot otherwise see: WHICH slots
   the labellum and hood came out as (the derivation is exact but it is not
   obvious that an odd count gives a hood PAIR), and that a size multiplier has
   SATURATED. The second is the "(CLAMPED)" discipline the roll floor, the tip
   floor and both foot clamps already carry: a slider that has stopped moving
   must say so rather than read as broken.

   The asked-for values come from footRing()'s own out-parameter, never
   recomputed here — a read-out re-deriving "what was asked for" would be a
   second copy of the composition law, and the second copy is the one that
   drifts. Returns '' when no whorl split, so the line is simply absent rather
   than saying "none". */
/* WHICH PLANE, IN WORDS — one owner for the phrasing, because the fan gave
   the bloom a SECOND mirror and a line that says "through slot 0" on an
   arrangement whose plane runs through a GAP is a label naming something that
   is not the thing. The involution is footRing()'s answer; this only names
   it. */
function mirrorPhrase(mirror) {
  return mirror === MIRROR_THROUGH_GAP
    ? 'mirror plane through the gap between slots 0 and n-1 (pairs i with n-1-i)'
    : 'mirror plane through slot 0 (pairs i with n-i)';
}

/* ONE LINE FOR BOTH POSITION AXES (session 11), because the thing a visitor
   needs to see is the same in both: WHICH slots each group came out as. The
   axes are mutually exclusive by placement — slot roles under RADIAL,
   per-petal under FAN (Eva's ruling 4) — so this reads whichever one split
   rather than printing two lines that can never both apply. Naming the group
   from the descriptor's own `slotRole ?? petalRole` keeps footRing() the one
   owner of which axis this bloom has; a line deriving it from `placement`
   would be a second copy of that branch.

   PER-PETAL GROUPS PRINT AS "petal 3", not "PETAL_3": the role id is an
   internal key and the visitor's word for it is the panel's own. */
/* THE ALL-PETALS LINE — what the one-whorl group was actually BUILT with,
   printed from the descriptor's own record (base + delta, clamped once) so a
   visitor reads the number the blade got rather than the delta the slider
   shows. Absent when the group is not engaged, absent above one whorl. */
function allPetalsLine(rings, fr) {
  if (!fr.allPetalsEligible) return '';
  const r = rings.find((x) => x.allRole !== null && x.allRole !== undefined && x.overrides);
  if (!r) return '';
  const said = [];
  if ('petalSpineCurl' in r.overrides) said.push(`spine curl ${r.overrides.petalSpineCurl.toFixed(0)}°`);
  if ('petalCup' in r.overrides) said.push(`cup ${r.overrides.petalCup.toFixed(2)}`);
  if ('petalTipBreadth' in r.overrides) said.push(`tip breadth ${r.overrides.petalTipBreadth.toFixed(2)}`);
  return said.length ? `all petals as a group · ${said.join(' · ')}\n` : '';
}

function slotRoleLine(rings, fr) {
  const split = rings.filter((r) => r.slotRole !== null || r.petalRole !== null);
  if (!split.length) return '';
  const said = (r) => (r.slotRole !== null ? r.slotRole.toLowerCase() : r.petalRole.replace('PETAL_', 'petal '));
  const seen = new Map();
  for (const r of split) if (!seen.has(said(r))) seen.set(said(r), r.slots);
  const groups = [...seen].map(([role, slots]) =>
    `${role} ${slots.length === 1 ? `slot ${slots[0]}` : `slots ${slots.join('+')}`}`).join(' · ');
  const clamps = new Map();
  for (const r of split) for (const c of r.overrideClamped || []) clamps.set(c.base, c);
  const clampLine = [...clamps.values()]
    .map((c) => `${c.base} asked ${c.asked.toFixed(2)}, CLAMPED to ${c.got.toFixed(2)}`).join(' · ');
  return `${mirrorPhrase(fr.mirror)} — ${groups}\n`
       + (clampLine ? `ROLE VALUE CLAMPED to the base control's own range: ${clampLine}\n` : '');
}

/* ===================================================================
   THE FAN LINE — the arrangement's derived shape, and the arc limit's
   "(CAPPED)".

   THREE THINGS A VISITOR CANNOT OTHERWISE SEE. The TOTAL petal count, because
   `petalCount` is hidden under FAN and this is the number it used to show.
   The ARC and the NOTCH, because both are derived from two controls and
   neither is at a slider. And whether the arc limit BIT — the step saturates
   before the spacing slider ends, and a slider that has stopped moving must
   say so rather than read as broken. That is the same "(CLAMPED)" discipline
   the roll floor, the tip floor and both foot clamps carry, arriving on the
   fourth placement.

   The asked-for and built steps both come from footRing()'s own `fan` record
   rather than being recomputed here — a read-out that re-derived the cap
   would be a second copy of the clamp law, and the second copy is the one
   that drifts. Returns '' under every other placement, so the line is simply
   absent rather than saying "not a fan". */
function fanLine(fr) {
  const f = fr.fan;
  if (!f) return '';
  return `fan ${f.spanDeg.toFixed(1)}° arc · ${f.gapDeg.toFixed(1)}° gap at the back`
       + ` · step ${f.stepDeg.toFixed(2)}°`
       + (f.capped ? ` (CAPPED from ${f.askedDeg.toFixed(0)}° — the ${f.limitDeg}° arc limit keeps the two sides apart)` : '')
       + `\n`;
}

/* THE STAMENS LINE (session 21) — the androecium told in the numbers a
   visitor cannot set, all of them footRing()'s own or the builder's own,
   never re-derived here: the layout, the disc radius beside the reference it
   multiplies (and "(CLAMPED at the hub radius)" when the range ran out —
   the roll floor's discipline), the filament and the pill, the petal-root
   annulus FLAG with the clear disc beside it, the two distance flags, and the
   spine floor told (never clamped). Then the SLENDERNESS line (Q7), verbatim
   tagged: telemetry, never a gate, until a coupon is printed. Absent when the
   androecium is absent, so the lines simply are not there. */
function stamenLine(fr, stamens, near, mode) {
  const A = fr.androecium;
  if (!A) return '';
  const under = stamens.filter((s) => s.law.underFloor).length;
  return `STAMENS ${A.count} on ${A.layout === 'DISC' ? 'a Vogel disc' : 'one ring'} · radius ${A.radius.toFixed(2)} mm (${mode}) = ${A.spread.toFixed(2)}x the reference ${A.derivedRadius.toFixed(2)} mm (the filaments' own area rule)`
       + (A.onAxis ? ` (ON THE AXIS: the hub, ${A.hubRadius.toFixed(2)} mm, is narrower than a filament radius — ${A.asked.toFixed(2)} mm asked)` : A.clamped ? ` (CLAMPED at the hub radius ${A.hubRadius.toFixed(2)} mm less a filament radius — ${A.asked.toFixed(2)} mm asked; ${A.saturation.toFixed(2)}x is as far as this hub goes, the slider above it is dead here)` : '')
       + ` · filament ${A.diameter.toFixed(2)} × ${A.length} mm${A.curlDeg !== 0 ? `, curl ${A.curlDeg}°` : ', straight'} · anther PILL ${A.anther.diameter.toFixed(2)} × ${A.anther.length.toFixed(2)} mm`
       + (A.inPetalRootAnnulus ? ` · ${A.inPetalRootAnnulus} of ${A.count} STAND INSIDE THE PETAL-ROOT ANNULUS (clear disc ${A.clearRadius.toFixed(2)} mm — a flag, never a refusal)` : ` · all inside the clear disc (${A.clearRadius.toFixed(2)} mm)`)
       + (near ? ` · nearest roots ${near.root.mm.toFixed(2)} mm${near.root.mm < A.diameter ? ' (ROOTS FUSE)' : ''}, nearest anthers ${near.apex.mm.toFixed(2)} mm${near.apex.mm < A.anther.diameter ? ' (ANTHERS TOUCH)' : ''}` : '')
       + (under ? ` · bend radius UNDER ONE FILAMENT DIAMETER on ${under} of ${A.count} (told, not clamped)` : '')
       + `\nSLENDERNESS L/d ${A.slenderness.toFixed(1)} (${mode}) — UNMEASURED — no coupon has been printed\n`;
}

function summarise(ui, acc, mode, rings, fr, petals, built = null) {
  const tris = acc.triangleCount.toLocaleString('en-US');
  const dim = acc.maxDimensionMm.toFixed(1);
  const layers = Number(ui.layerCount);
  /* The capability appears in the readout for the same reason every other
     value does: the contact sheet and the gates assert the app REACTED
     through the real UI route, and a state they cannot see in the readout is
     a state they cannot confirm was built. Layers and placement are here for
     that same reason, and the layer RADII are printed because they are
     derived — a number the user cannot set is a number the user should be
     able to read. */
  /* THE DEPTH AXIS IN ITS OWN UNITS, matching the panel's read-outs rather
     than restating the slider: a continuous bloom winds `layerCount` TURNS
     and carries `petalCount * layerCount` petals, so printing "petals 40" and
     "layers 3" beside a 120-petal object would be two true numbers adding up
     to a false picture. */
  const cont = fr.continuousMode;
  const depth = `${layers} ${cont ? 'turn' : 'layer'}${layers === 1 ? '' : 's'}`;
  /* UNDER FAN THE COUNT IS DERIVED AND `petalCount` IS HIDDEN, so printing
     the slider would be printing a number nothing read. `fr.slotCount` is
     footRing()'s own answer, which is what the builder actually placed. */
  const petalsSaid = cont ? `petals ${fr.sequenceLength} (${ui.petalCount}/turn)`
    : fr.fan ? `petals ${fr.slotCount} (${fr.fan.perSide}/side${fr.fan.centre ? ' + one on the line' : ''})`
    : `petals ${ui.petalCount}`;
  /* EVERY RING'S RADIUS is what this line has always printed, and at up to
     120 of them that stops being readable — so the continuous arm prints the
     SPAN and the step instead. Both are derived quantities the user cannot
     set, which is the reason the line exists at all. */
  const ringLine = cont
    ? `rings (${mode}) ${rings.length} from ${rings[0].radius.toFixed(2)} to ${rings[rings.length - 1].radius.toFixed(2)} mm`
      + `, step ${(rings[0].radius - rings[1].radius).toFixed(3)}–${(rings[rings.length - 2].radius - rings[rings.length - 1].radius).toFixed(3)} mm\n`
    /* ONE RADIUS PER WHORL, not per descriptor — same reason as
       clampedRingsPhrase above: a split whorl's descriptors share a radius,
       so listing them would print the same number three times. */
    : (layers > 1 ? `layer rings (${mode}) ${[...new Map(rings.map((r) => [r.lambda, r])).values()].map((r) => r.radius.toFixed(2)).join(' / ')} mm\n` : '');
  /* NO CENTRE WORD ON THIS LINE (session 20): the summary printed
     `center disc` on the shipping default while the A/B rig existed; the
     rig is retired and the apex is bare until the androecium lands, and a
     line naming a centre that does not exist is the label-lie this project
     retires ids over. The panel gate's retirement route asserts the word is
     ABSENT here. */
  return `${petalsSaid} · ${ui.placement.toLowerCase()} · ${depth} · spread ${Number(ui.spread).toFixed(2)}x`
       + (capability ? ` · capability ${capability.label}` : '') + `\n`
       + (rings.length > 1 ? ringLine : '')
       + fanLine(fr)
       + footFloorLine(rings)
       + innerRingLine(rings, fr)
       + domeLine(rings, fr, mode)
       + sphereLine(rings, fr, mode)
       + spineLine(petals)
       + (built ? stamenLine(fr, built.stamens, built.stamenNearest, mode) : '')
       + allPetalsLine(rings, fr) + slotRoleLine(rings, fr)
       + (spiralLowCount(ui, fr) ? `SPIRAL BELOW ${SPIRAL_LEGIBLE_COUNT} IN THE SEQUENCE: the golden angle reads as an irregular whorl, not as phyllotaxis\n` : '')
       + `tris (${mode}) ${tris} · max dim (${mode}) ${dim} mm`;
}

/* HOW MANY TIMES THE MODEL HAS BEEN BUILT — the REAL SIGNAL a harness waits
   on, and it exists because a fixed sleep races the async rebuild (the flower
   project's rule, and it fired here).

   THE DEFECT IT CLOSES, found by this session and PRESENT SINCE THE FIRST
   GATE. `regenerate()` is rAF-coalesced through scheduleRegen(), so when
   applyConfig() returns — having set every value and fired every real event —
   the model has NOT necessarily been rebuilt yet. Every assertion that then
   reads __bloomMetrics() can be reading the PREVIOUS build: on a fresh page
   that is the default bloom, so a row setting all four curves can report
   `petalForm: null` and fail its own form assertion under a label naming a
   design it never measured. It is rare because a Playwright evaluate
   round-trip usually outlasts a frame — 0 of 40 unloaded on both trees, and
   it fired once in a 205-row gate run competing for four CPUs.

   Rare and silent is the worst combination this project knows: it is the
   "73 of 185 configs measuring the wrong design" defect with a timer instead
   of a read-back. settleBuild() in the harness waits on this counter. */
let buildCount = 0;
/* `pending` IS CLEARED AFTER THE BUILD, IN A `finally`, and both halves of
   that matter. After it, so `pending === false` unambiguously means no build
   is outstanding — cleared first, a waiter could observe false in the instant
   before regenerate() ran. In a `finally`, so a throwing build cannot leave
   the flag stuck true and silently stop the app rebuilding for the rest of
   the session, which is what clearing it first was defending against. */
window.__bloomBuildState = () => ({ count: buildCount, pending: regenQueued });

function regenerate() {
  buildCount++;
  const ui = readUI();
  refreshLabels(ui);
  const wasPlacement = lastPlacement;   // captured before buildGeometry() below overwrites it
  /* THE MODE ON SCREEN, decided once per build by the one owner. `record`
     marks this as the build the telemetry describes; the export handler's
     build never carries it. */
  const mode = shownMode();
  const { geo, acc, built } = buildGeometry({ exportMode: mode === 'export', record: true });
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; }
  else { mesh = new THREE.Mesh(geo, material); scene.add(mesh); }
  /* The bounding SPHERE is the framing quantity (the accumulator's bounding
     BOX is the print-size quantity — two different jobs, kept apart). It is
     computed on every rebuild, not only when the camera is free, so a shot
     tool can ASK the app for the radius its own automatic fit would use
     instead of inventing a proxy from the bounding box. */
  geo.computeBoundingSphere();
  lastFitRadius = geo.boundingSphere.radius;
  /* THE SPHERE'S CENTRE, not just its radius — and the fan is what made it
     matter. Every arrangement before this one was radially symmetric, so the
     bounding sphere sat on the axis and framing at the origin with a radius
     was enough. A FAN puts all its mass on one side: at 3 per side x 15 deg
     its centre is metres from the origin in model terms, and a shot framed at
     the origin crops it. `fitCamera` already accepts a target; it had nothing
     truthful to point at until now. Telemetry only — no geometry reads it. */
  lastFitCenter = [geo.boundingSphere.center.x, geo.boundingSphere.center.y, geo.boundingSphere.center.z];
  /* THE FAN SNAP, keyed off a PLACEMENT TRANSITION rather than "is FAN" on
     every rebuild — it fires once on entry and never re-fights a manual
     orbit or a fresh dropdown pick taken since (both clear fanViewLocked).
     Leaving FAN does nothing here on purpose (Eva's ruling: stay in place,
     no snap back) — `userMoved` is already true from the entry snap, so the
     plain `!userMoved` branch below stays silent too. */
  if (ui.placement === 'FAN' && wasPlacement !== 'FAN') {
    snapToFan();
  } else if (ui.placement === 'FAN' && fanViewLocked) {
    recenterFanView();
  } else if (!userMoved) {
    fitCamera(lastFitRadius);
  }
  shownSummary = showingLine(mode) + summarise(ui, acc, mode, built.rings, built.foot, built.petals, built) + `\n${materialLines(ui, mode)}`;
  readout.textContent = shownSummary;
}

/* rAF-coalesced rebuild: many input events per frame, one build. */
let regenQueued = false;
function scheduleRegen() {
  if (regenQueued) return;
  regenQueued = true;
  requestAnimationFrame(() => { try { regenerate(); } finally { regenQueued = false; } });
}

for (const c of CONTROLS) {
  inputs[c.id].addEventListener('input', () => { applyVisibility(); scheduleRegen(); });
  inputs[c.id].addEventListener('change', () => { applyVisibility(); scheduleRegen(); });
}
/* The print-preview box rebuilds through the same rAF coalescer every
   registry control uses — no visibility pass, because it is not a control
   and no predicate reads it. */
if (printPreviewInput) printPreviewInput.addEventListener('change', scheduleRegen);

/* ---------------------------------------------------
   VIEW PRESETS — the VIEW box's dropdown. Pure camera chrome: reads
   lastFitRadius/lastFitCenter (the #129 bounding-sphere machinery — one
   owner, read here rather than recomputed) and drives the same
   camera/controls fitCamera() does, but never touches geometry, the
   registry, or readUI(). `viewPresetSelect` is a raw DOM reference exactly
   like the `autoRotate` checkbox above: not in `inputs`, not a CONTROLS
   row, invisible to readUI(), DEFAULTS, reset, export and every gate that
   reads UI state.

   A DROPDOWN PICK ANIMATES (a 650 ms ease, ported from the flower's own
   applyViewPreset/stepViewTween); THE FAN SNAP DOES NOT — Eva's ruling was
   specifically "immediate snap without rotation", so snapToFan() below sets
   the camera directly and shares no code path with the tween. */
const viewPresetSelect = document.getElementById('viewPreset');
let viewTween = null;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// One formula, every preset and the fan re-centre alike — the frustum-aware
// distance the flower's own applyViewPreset uses, so `fit` means the same
// thing here it does in bloom-view-presets.js's own header.
function presetDistance(radius, fit) {
  return (radius / Math.tan((camera.fov * DEG) / 2)) * fit;
}

function applyViewPreset(name) {
  const p = VIEW_PRESETS[name] || VIEW_PRESETS.default;
  if (!(lastFitRadius > 0)) return;   // nothing built yet
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  const dist = presetDistance(lastFitRadius, p.fit);
  const dn = Math.hypot(p.dir[0], p.dir[1], p.dir[2]) || 1;
  const endPos = c.clone().add(new THREE.Vector3(p.dir[0] / dn, p.dir[1] / dn, p.dir[2] / dn).multiplyScalar(dist));
  const endUp = new THREE.Vector3(p.up[0], p.up[1], p.up[2]).normalize();
  camera.far = Math.max(camera.far, dist * 20);   // widen up front so nothing clips mid-flight; tightened on arrival
  camera.updateProjectionMatrix();
  viewTween = {
    startPos: camera.position.clone(), endPos,
    startTarget: controls.target.clone(), endTarget: c,
    startUp: camera.up.clone(), endUp,
    endNear: Math.max(0.05, dist * 0.02), endFar: dist * 20,
    t0: performance.now(), dur: 650,
  };
  controls.autoRotate = false;   // paused during the flight; resumed per the checkbox on arrival
  /* A chosen preset is a deliberate camera placement, same standing as a
     manual drag: without this, the next slider tweak's `!userMoved` branch
     (or, mid-FAN, the re-centre branch) would silently undo it. */
  userMoved = true;
  fanViewLocked = false;
}

function stepViewTween() {
  const e = easeInOutCubic(Math.min(1, (performance.now() - viewTween.t0) / viewTween.dur));
  camera.position.lerpVectors(viewTween.startPos, viewTween.endPos, e);
  controls.target.lerpVectors(viewTween.startTarget, viewTween.endTarget, e);
  camera.up.copy(viewTween.startUp).lerp(viewTween.endUp, e).normalize();
  camera.lookAt(controls.target);
  if (e >= 1) {
    camera.up.copy(viewTween.endUp);
    camera.near = viewTween.endNear; camera.far = viewTween.endFar;
    camera.updateProjectionMatrix();
    controls.update();
    controls.autoRotate = document.getElementById('autoRotate').checked;
    viewTween = null;
  }
}
if (viewPresetSelect) viewPresetSelect.addEventListener('change', () => applyViewPreset(viewPresetSelect.value));

/* THE FAN SNAP (Eva's ruling). Selecting FAN placement moves the camera to
   TOP-DOWN, centred on the model's own bounding-sphere centre, immediately
   and without an animation — no button, unlike the flower's manual
   "Auto-center (top-down)". Shares VIEW_PRESETS.top with the dropdown's own
   TOP-DOWN entry (one owner for that framing, however it's reached) but
   sets the camera directly rather than through the tween. */
function snapToFan() {
  const p = VIEW_PRESETS.top;
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  const dist = presetDistance(lastFitRadius, p.fit);
  const dn = Math.hypot(p.dir[0], p.dir[1], p.dir[2]) || 1;
  camera.up.set(p.up[0], p.up[1], p.up[2]);
  controls.target.copy(c);
  camera.position.set(c.x + (p.dir[0] / dn) * dist, c.y + (p.dir[1] / dn) * dist, c.z + (p.dir[2] / dn) * dist);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
  controls.autoRotate = false;
  document.getElementById('autoRotate').checked = false;   // OFF, and nothing resumes it silently — Eva's ruling
  userMoved = true;
  fanViewLocked = true;
  if (viewPresetSelect) viewPresetSelect.value = 'top';   // keep the dropdown honest about the framing it now shows
}

/* Re-centre only, same direction/distance ratio — a fan control tweaked
   after the snap (spacing, per-side count, the mirror toggle) can shift the
   bounding-sphere centre without the user having touched the camera since.
   Same correction principle as the flower's refitCamera when a stem grows
   the plant past its initial framing: keep the view direction, recentre and
   redistance to the fresh bounds. Runs only while fanViewLocked — a manual
   orbit or a fresh dropdown pick already cleared it, and holds the camera
   wherever the user left it instead. */
function recenterFanView() {
  const c = new THREE.Vector3(lastFitCenter[0], lastFitCenter[1], lastFitCenter[2]);
  let dx = camera.position.x - controls.target.x, dy = camera.position.y - controls.target.y, dz = camera.position.z - controls.target.z;
  const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
  const dist = presetDistance(lastFitRadius, VIEW_PRESETS.top.fit);
  controls.target.copy(c);
  camera.position.set(c.x + dx * dist, c.y + dy * dist, c.z + dz * dist);
  camera.near = Math.max(0.05, dist * 0.02);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

/* ---------------- STL export ---------------- */
document.getElementById('exportStl').addEventListener('click', () => {
  const ui = readUI();
  /* ALWAYS EXPORT MODE, NEVER RECORDED, AND shownMode() IS NOT READ HERE —
     the three clauses the print-preview toggle's byte argument rests on
     (see shownMode's note). The panel gate flips the box and requires the
     STL on either side of it byte-identical. */
  const { geo, acc, built } = buildGeometry({ exportMode: true });
  const exportTris = acc.triangleCount;   // the accumulator owns the count, in both modes
  if (exportTris > EXPORT_TRI_BUDGET) {
    geo.dispose();
    readout.innerHTML = `<span class="bl-err">export refused: ${exportTris.toLocaleString('en-US')} tris (export) exceeds the ${EXPORT_TRI_BUDGET.toLocaleString('en-US')} budget</span>`;
    return;
  }
  const stl = new STLExporter().parse(new THREE.Mesh(geo, material), { binary: true });
  geo.dispose();
  const blob = new Blob([stl], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bloom.stl';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  /* Both counts, both LABELLED — live and export modes are not convertible
     (the export floor changes geometry), so one word never covers both.

     THE LAST LINE, not line [1]. summarise() emits a variable number of lines
     now (the layer radii and the low-count spiral flag are conditional), and
     an index into a variable-length list is a bug waiting for the first
     multi-layer export — it would have printed the ring radii under the word
     "exported". The tris/max-dim line is always last, so ask for that. */
  const exportLines = summarise(ui, acc, 'export', built.rings, built.foot, built.petals, built).split('\n');
  readout.textContent = `${shownSummary}\n`
    + `exported bloom.stl · ${exportLines[exportLines.length - 1]} · min sheet ${acc.minThickness.toFixed(2)} mm`;
});

/* Contact-sheet hooks (see the note beside __bloomUIState). __bloomFrame sets
   userMoved so the next rebuild's automatic refit does not silently undo the
   framing the tool just asked for — a screenshot of a camera that moved back
   is exactly the class of instrument error that padded the flower's pixel
   diffs for months. */
window.__bloomMetrics = () => ({
  ringRadius: lastRing.radius,
  derivedRadius: lastRing.derivedRadius,
  /* NO centerStyle / centerTris / centerSeat (session 20): the designed
     centre is retired, and a metric that reported 'NONE' / 0 / null for a
     thing that no longer exists would be a number under a label naming a
     computation nobody performs. Tools that read them died with the rig. */
  /* WHICH GEOMETRY EVERY NUMBER BELOW DESCRIBES (Sep 3, the print-preview
     toggle). `shownTris` is the count of the build on screen in whatever
     mode it was built. `liveTris` keeps its name and its meaning — the LIVE
     build's count — and is therefore NULL while the preview is on, never the
     export count wearing a live label: a caption that prints it then prints
     "null" loudly rather than a number that is not the number. Both STL
     gates assert `shownMode === 'live'` on every row; a sheet that toggles
     captions from `shownTris` and `shownMode`. */
  shownMode: lastShownMode,
  shownTris: lastTris,
  liveTris: lastShownMode === 'live' ? lastTris : null,
  maxDimMm: lastMaxDim,
  fitRadius: lastFitRadius,
  fitCenter: [...lastFitCenter],
  capability: capability ? capability.label : null,
  /* THE PETAL'S OWN MEASUREMENTS, from the builder that made it. The
     capability assertions and the single-petal framing read these rather
     than re-deriving a profile or a projection — a consumer inventing its
     own copy of a boundary is this project's most repeated defect.

     SCOPE, stated here and repeated in the gates' own output: `profile` and
     `tipSpans` are the APP'S evaluation of the width profile and the trim
     domain, not a measurement of the exported STL. Watertightness and
     connectedness are measured on the export; the structural claims are
     measured here. */
  petalProfile: lastPetal ? lastPetal.profile : null,
  petalFootRows: lastPetal ? lastPetal.footRows : null,
  petalPanels: lastPetal ? lastPetal.panels : null,
  petalTipSpans: lastPetal ? lastPetal.tipSpans : null,
  petalMid: lastPetal ? lastPetal.mid : null,
  petalTip: lastPetal ? lastPetal.tip : null,
  /* The converging tip cap's own numbers (Eva's ruling, Sep 1). Named
     `petalTipCap` and never `petalTip`, which is the tip's POSITION. */
  petalTipCap: lastPetal ? lastPetal.tipCap : null,
  petalNormal: lastPetal ? lastPetal.normal : null,
  /* The blade's WIDTH direction at the midpoint — a profile view looks down
     this. It is reported rather than recomputed because under twist it is
     no longer the ring tangent, so a shot tool deriving it from azimuth
     would not merely be a second owner, it would be wrong. */
  petalTangent: lastPetal ? lastPetal.tangent : null,
  petalAxis: lastPetal ? lastPetal.axis : null,
  /* FORM TELEMETRY, and the scope is the point. Both shipped gates are
     structurally BLIND to this session's failure modes: the export gate
     counts boundary edges on a fixed-topology grid, which pure displacement
     cannot change, and connectedness cannot fire because the foot is never
     written and the hub spans it. So the properties that CAN break — the
     foot staying put, the roll staying isometric, the curvature floor
     holding, and the all-zero guard not hiding a wrong form path — are
     measured here, from the builder that made the geometry, and asserted by
     both gates on every row. */
  petalForm: lastPetal ? lastPetal.form : null,
  petalFootFrames: lastPetal ? lastPetal.footFrames : null,
  petalGuardResidual: lastPetal ? lastPetal.guardResidual : null,
  /* THE FOOT RING'S OWN CROSS-SECTION, exposed so the reworked foot
     assertion can compare the EMITTED foot against footRing()'s answer
     rather than against a fixed expectation. Before the thickness layer the
     expectation could be fixed, because the foot was; with foot controls it
     derives from state, and a gate keeping its own copy of that derivation
     would be this project's most repeated defect arriving in the instrument
     built to catch it. `derivedRadius`, `authoredWidth` and the clamp flags
     stay telemetry — nothing geometric reads them. */
  ringWidth: lastRing.width,
  ringThickness: lastRing.thickness,
  ringOverhang: lastRing.overhang,
  ringAuthoredWidth: lastRing.authoredWidth,
  ringWidthClamped: lastRing.widthClamped,
  ringThicknessFloorBinds: lastRing.thicknessFloorBinds,
  /* THE ARRANGEMENT, PER LAYER — what junctionAssertions() reads. Every one
     of these is footRing()'s OWN answer, exposed rather than re-derived, for
     the same reason ringWidth/ringThickness were: a gate keeping its own copy
     of a boundary is this project's most repeated defect, and it would arrive
     here inside the instrument built to catch it.

     WHY THIS EXISTS AT ALL — and it is a derivation, not a hedge. The voxel
     gate CANNOT police the junction under layers, measured Sep 1: building
     the hub at the WRONG layer's radius (min instead of max) leaves the outer
     whorl's feet ending 7.94 mm out against a hub that stops at 6.86 mm —
     detached from the hub by construction — and the gate reports ONE region,
     0% detached. Consecutive foot annuli overlap each other, so the outer
     whorl is held on by a CHAIN through the inner layers. Connectedness at
     multi-layer is over-determined and the gate cannot tell a correct hub
     from an incorrect one. J3 below is the assertion that can. */
  hubRadius: lastHub.radius,
  hubThickness: lastHub.thickness,
  /* THE DOME (Sep 4) — footRing()'s own cap, null under the guard: the rise
     asked and built, the cap's radius and centre, the apex floor's clamp, and
     the surface-to-plan ratio over the feet's annulus. J1 places every foot
     against this sphere; the read-out names it. */
  hubDome: lastHub.dome ? { ...lastHub.dome } : null,
  /* WHAT THE HUB BUILDER ACTUALLY BUILT — reported by buildHubInto from the
     sphere it used, never copied from footRing(). J3 compares the feet
     against THIS: a hub that ignored the owner and stayed flat under lifted
     feet (the wrong-hub mutation under a dome, measured Sep 4: watertight,
     one voxel piece on every row tried, J1 indiscriminate) is caught only by
     the feet not lying on the sphere the hub says it built. */
  hubBuilt: { dome: lastHubBuilt.dome ? { ...lastHubBuilt.dome } : null, tris: lastHubBuilt.tris },
  /* THE DOME GUARD'S RESIDUAL — exactly 0 on every flat build, null on a
     domed one; both gates assert it. */
  petalDomeGuardResidual: lastPetal ? lastPetal.domeGuardResidual : null,
  /* THE SPINE per descriptor's representative petal (session 16) — every
     blade row's centre AS EMITTED, plus the law's inputs and what the floor
     did. The gate's C1 rebuilds the law from OTHER owners and compares
     against `rows`; a spine that kept the arc while the controls were wired
     is bit-identical to the un-biased bloom and this is its only witness. */
  petalSpine: lastPetal ? lastPetal.spine : null,
  petalRingSpine: lastPetals.map((p) => (p ? p.spine : null)),
  /* THE ROOT ROW per descriptor's representative petal — the first BLADE row
     as emitted, J8's input against the rigid tilt of the foot's own frame. */
  petalRingRootRows: lastPetals.map((p) => (p ? { C: p.rootRow.C, N: p.rootRow.N, flat: p.rootRow.flat, tiltRad: p.rootRow.tiltRad, u: p.rootRow.u, curlRad: p.rootRow.curlRad, ringC: p.rootRow.ringC, azimuth: p.azimuth,
    /* THE EFFECTIVE petalTilt this petal was actually built from (Sep 4,
       J9's own input) — read from `p.applied`, never the base UI control:
       petalTilt is itself overridable per role (labellumTilt/hoodTilt) and
       per petal (petalNTilt), so a check reconstructing "expected tilt" from
       the raw slider would false-fire on any orchid or fan-per-petal row. */
    petalTiltApplied: p.applied.petalTilt } : null)),
  /* RENAMED FROM `ringLayers` WITH THE CONTINUOUS ARM, because under it a
     descriptor is not a layer — it is a ring carrying exactly one petal, and
     there are up to 120 of them. A key naming a thing that is not the thing
     is what a later reader checks and believes. Nothing persists this (it is
     a diagnostic hook, not a design), so the rename is free and no
     retirement is owed; the gates and shot tools moved with it in the same
     commit. */
  rings: lastRings.map((r) => ({
    index: r.index, radius: r.radius, derivedRadius: r.derivedRadius,
    width: r.width, thickness: r.thickness,
    overhang: r.overhang, scale: r.scale, phase: r.phase, tiltExtra: r.tiltExtra,
    /* DOME LEAN (Sep 4) — footRing()'s own per-ring cap correction, a
       SEPARATE addend from tiltExtra above, never folded into it (see
       footRing()'s own note on this field: folding it in broke tiltExtra's
       own monotonicity and quantizer-identity claims under CONTINUOUS).
       buildPetalInto sums petalTilt + tiltExtra + domeLean at the one place
       the angle is used; this is that third term, reported on the same
       doctrine as every other telemetry field here (widthClamped,
       underFootFloor, …): the owner's own answer, never a second
       derivation. */
    domeLean: r.domeLean,
    authoredWidth: r.authoredWidth, widthClamped: r.widthClamped,
    /* THE CEILING TWIN of widthClamped (Eva, Sep 1). The foot's UPPER clamp
       has always been able to bind - from petalWidth 25, a quarter of that
       slider - with the blade widening and the area-ruled ring standing
       still, and nothing reported it. See FOOT_MAX_WIDTH_MM. */
    widthClampedHigh: r.widthClampedHigh,
    /* THE DEPTH TELEMETRY (Sep 3) — footRing()'s own two flags behind the
       read-out's RINGS NARROWER THAN A FOOT line, exposed so the panel gate
       asserts that line against the owner in both directions. */
    underFootFloor: r.underFootFloor,
    crossesAxis: r.crossesAxis,
    /* WHERE ON THE DOME THIS RING LANDS (Sep 4) — height, slope, arc from the
       apex and the local relief factor, footRing()'s own. 0 / 0 / radius / 1
       when flat. */
    z: r.z, slope: r.slope, arc: r.arc, relief: r.relief,
    /* THE ROLE AND ITS RECORD, footRing()'s OWN answer. Z1 reads roleCount to
       check the partition; Z2 reads role and overrides against what the
       builder reported it actually used. A gate deriving either from
       layerCount would be a second copy of the derivation it exists to
       police. */
    role: r.role, roleCount: r.roleCount,
    /* THE LAYER, SEPARATELY FROM THE DESCRIPTOR INDEX (session B). `index` is
       the position in `rings`, which stopped being the layer the moment a
       whorl could split into LABELLUM / HOOD / LATERAL descriptors. */
    lambda: r.lambda,
    /* THE SLOT ROLE AND ITS SLOTS. `slotRole` is null on an UNSPLIT
       descriptor and never LATERAL there — "this whorl was not split" and
       "this group is the laterals" are different claims. Z4 reads `slots` to
       assert the assignment is mirror-symmetric. */
    slotRole: r.slotRole,
    allRole: r.allRole ?? null,
    /* THE PER-PETAL ROLE (session 11) — the descriptor's mirror ORBIT counted
       outward from the plane, or null. Z8 compares these against the emitted
       azimuths; Z9 asserts this and `slotRole` are never both non-null. */
    petalRole: r.petalRole,
    slots: r.slots ? [...r.slots] : null,
    overrideClamped: (r.overrideClamped || []).map((c) => ({ ...c })),
    overrides: r.overrides ? { ...r.overrides } : null,
  })),
  /* Every ring's foot rows as EMITTED — J1's input. The pre-layer hook
     exposed slot 0 of the one whorl; reporting only that would have silently
     meant "layer 0" and left every inner whorl's feet unasserted. Under
     CONTINUOUS a ring IS one petal, so this becomes every foot in the bloom
     — 3 x petalCount x layerCount frames instead of 3 x layerCount — and J1
     gets that coverage from the same expression. */
  petalRingFootFrames: lastPetals.map((p) => (p ? p.footFrames : null)),
  /* THE PLACEMENT'S OWN SHAPE, from footRing() rather than from the control:
     `continuousMode` is what every assertion branches on, `sequenceLength` is
     what the legibility flag counts, and each descriptor's own `roleCount`
     sums to the bloom's petal count in both modes. A gate deriving any of these from
     `placement` would be a second copy of the branch. */
  continuousMode: lastFoot.continuousMode,
  sequenceLength: lastFoot.sequenceLength,
  /* ===================================================================
     THE ARRANGEMENT'S POSITION AROUND THE AXIS — J7's and Z4b's only input,
     and the reason this session had to ship an instrument at all.

     MEASURED, NOT ASSUMED: before these four keys existed, `azimuth` appeared
     in this repository only inside buildWhorlInto (where it is computed) and
     buildPetalInto (where it is consumed). Nothing recorded one, so nothing
     could assert one. Both STL gates are azimuth-blind BY CONSTRUCTION — an
     edge census over a topology no control moves, and a flood fill over a hub
     disc that spans every ring at every azimuth — and so is everything built
     on them: J1 reads foot FRAMES, J2/J3 read RADII, J4 reads the overlap
     box's three dimensions, J5/J6 read the depth sequence, and Z1-Z6 read
     role membership and the effective state. A FAN that silently fell through
     to the RADIAL arm would therefore export watertight, export as ONE piece,
     carry the identical triangle count and the identical STL byte length, and
     pass every assertion this project owns. J7 exists because of that grep.

     `slotAzimuths` IS THE BUILDER'S OWN RECORD, one row per whorl indexed by
     slot, taken from the slot payload the whorl primitive emitted — never
     re-derived from `placement` and the controls, because an instrument that
     recomputed the law would agree with a mutated law by mutating alongside
     it. `fan` is footRing()'s derived law (null elsewhere, so a claim nothing
     can make reads as absent rather than as a passing zero); `mirror` is
     which involution this arrangement has; `slotRoleCensus` is how many slots
     each role got, which is what Z1's amended clause checks the hood's
     visibility against. */
  slotAzimuths: lastSlotAzimuths.map((row) => [...row]),
  placement: lastPlacement,
  fan: lastFoot.fan ? { ...lastFoot.fan } : null,
  mirror: lastFoot.mirror,
  slotCount: lastFoot.slotCount,
  slotRoleCensus: lastFoot.slotRoleCensus ? { ...lastFoot.slotRoleCensus } : null,
  /* WHETHER SLOT ROLES APPLY, AND WHETHER A WHORL ACTUALLY SPLIT — two
     different claims, so two flags. The first is the gating (placement and
     depth) and is cross-checked against the registry's own
     `slotRolesEligible` predicate by both gates; the second additionally
     needs a control off its identity, and Z5 asserts it in both directions
     against the descriptor count. `slotsPerRing` was RETIRED here (Sep 2):
     it answered "how many petals does a ring carry" with one number, which a
     split whorl does not have. */
  slotRolesEligible: lastFoot.slotRolesEligible,
  /* THE FULL SPHERE (session 18) — footRing()'s own answer, cross-checked
     against the registry's `sphereMode` predicate by both gates on every
     row, exactly as the two eligibility flags beside it are. */
  sphereMode: lastFoot.sphereMode === true,
  /* THE FAN'S OWN POSITION AXIS (session 11). Cross-checked against the
     registry's `perPetalEligible` predicate by both gates, exactly as its
     slot-role twin is: bloom-geometry.js makes the controls INERT and the
     registry makes them HIDDEN, neither file can read the other, so the
     relation is measured rather than commented. */
  perPetalEligible: lastFoot.perPetalEligible,
  allPetalsEligible: lastFoot.allPetalsEligible,
  petalRoleCensus: lastFoot.petalRoleCensus ? { ...lastFoot.petalRoleCensus } : null,
  petalGroupCount: lastFoot.petalGroupCount,
  slotRolesSplit: lastFoot.slotRolesSplit,
  /* THE QUANTIZER IDENTITY'S RESIDUALS — the continuous arm's answer to
     `ringGuardResidual`, and an EQUALITY rather than a bound (footRing's
     header says why). null under the ringed arm: there is no second law
     there to agree with, and a claim nothing can make is reported absent. */
  quantizerResiduals: lastFoot.quantizerResiduals,
  /* The guard's cross-validation residual (footRing's header): the layered
     area-rule law measured against the pre-layer expression on every
     single-layer build. null above one layer, where there is no guard law to
     compare against — a claim nothing can make is reported absent, never as a
     passing 0. */
  ringGuardResidual: lastFoot.guardResidual,
  /* THE ROLE-GROUPING RESIDUAL - an EQUALITY, not a bound, and footRing()'s
     header says why: grouping by ROLE preserves the pre-role loop shape,
     while grouping by SLOT would have moved every 40-petal export by 6 ULP.
     null once a whorl carries more than one role, which is session B - a
     claim nothing can make must read as absent, never as a passing 0. */
  zygoGuardResidual: lastFoot.zygoGuardResidual,
  petalsBuilt: lastPetalsBuilt,
  /* WHAT EACH RING'S PETAL WAS ACTUALLY BUILT WITH, read from the builder's
     own effective state and never from the resolver. This is the only thing
     in the codebase that can see an override record that never reached the
     blade - a failure invisible to both STL gates, to the triangle count and
     to J1-J6 alike. Z2's third clause. */
  petalRingApplied: lastPetals.map((p) => (p ? { role: p.role, slotRole: p.slotRole, petalRole: p.petalRole, allRole: p.allRole ?? null, slotIndex: p.slotIndex, overridden: p.overridden, applied: p.applied } : null)),
  layerCount: lastFoot.layerCount,
  /* THICKNESS TELEMETRY and its guard residual — the properties both STL
     gates are structurally blind to, for the same reason they are blind to
     the form layer: thickness is pure vertex offset on a fixed-topology
     grid, so no edge census moves, and a thinner sheet is still spanned by
     the hub, so no flood fill splits. */
  petalThickness: lastPetal ? lastPetal.thickness : null,
  petalThicknessGuardResidual: lastPetal ? lastPetal.thicknessGuardResidual : null,
  /* THE ANDROECIUM (session 21) — footRing()'s descriptor (null when absent
     or under SPHERE), every stamen the builder EMITTED (root axis, surface
     point, the two root rings, the apex — JS1-JS4's inputs, read from the
     emission and never from the descriptor alone), the builder's free-end
     tally and the two distance flags. The descriptor's `dome` is the same
     object as `hubDome` and is dropped here to keep the hook one owner. */
  androecium: lastAndroecium ? { ...lastAndroecium, dome: undefined, stamens: lastAndroecium.stamens.map((s) => ({ ...s })) } : null,
  stamens: lastStamens.map((s) => ({ ...s })),
  freeEnds: lastFreeEnds,
  stamenNearest: lastStamenNearest,
});
window.__bloomFrame = (radius, lift = 0.15, at = null, dir = null, up = null) => { userMoved = true; fitCamera(radius, lift, at, dir, up); };

/* THE ONLY WRITER of `capability`. Rebuilds synchronously rather than
   through the rAF coalescer so a caller can read __bloomMetrics back on the
   next line and get the design it just asked for. Pass null to clear. */
window.__bloomCapability = (spec) => { capability = spec || null; regenerate(); return capability; };

/* ---------------- go ---------------- */
applyVisibility();
regenerate();
renderer.setAnimationLoop(() => {
  if (viewTween) stepViewTween(); else controls.update();
  renderer.render(scene, camera);
});
