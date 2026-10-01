/* frame.js — the /frame page. The panel is GENERATED from frame-registry.js
   (one declaration of every control); this file only draws it, hosts the
   profile editor, and hands buildFrame()'s model to the stage and the
   download. There is no second geometry path: the drawing on screen IS
   exportSvg(model), the same string the button saves. */

import { PARAM_SPEC, SECTIONS, DEFAULTS, PROFILE_PRESETS, HATCH_WEIGHT_RANGE } from './frame-registry.js';
import { buildFrame, exportSvg, toneAcross, profileFor } from './frame-geometry.js';
import { ProfileEditor } from './frame-profile-editor.js';

/* ---------------- state ---------------- */
let params = { ...DEFAULTS };
let profile = PROFILE_PRESETS[DEFAULTS.profilePreset].map((p) => [...p]);  // the editor's points
let model = null;
let fixedView = null;    // test chrome: a pinned viewBox, so a pixel diff has one camera
let advanced = false;    // the panel's tier: Advanced controls (registry `tier`) show only when this is on

/* ---------------- panel (generated) ---------------- */
const host = document.getElementById('controls');
const secEl = {}, ctrlEl = {};
for (const s of SECTIONS) {
  const d = document.createElement('details');
  d.className = 'fr-sec'; d.dataset.sec = s.id;
  if (s.open) d.open = true;
  d.innerHTML = `<summary>${s.label}</summary><div class="fr-sec-body"></div>`;
  (s.parent ? secEl[s.parent].querySelector('.fr-sec-body') : host).appendChild(d);
  secEl[s.id] = d;
}
const fmtVal = (s, v) => (s.kind === 'range' ? `${(+v).toFixed(s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0)}${s.unit && s.unit !== '°' ? ' ' + s.unit : s.unit}` : '');
let editor = null;
for (const s of PARAM_SPEC) {
  const w = document.createElement('div');
  w.className = 'fr-ctrl';
  if (s.kind === 'range') {
    w.innerHTML = `<label for="${s.id}"><span>${s.label}</span><output id="${s.id}-out"></output></label><input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}">`;
  } else {
    w.innerHTML = `<label for="${s.id}"><span>${s.label}</span></label><select id="${s.id}">${s.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  }
  secEl[s.section].querySelector('.fr-sec-body').appendChild(w);
  ctrlEl[s.id] = w;
  const input = w.querySelector('input,select');
  input.addEventListener('input', () => {
    params[s.id] = s.kind === 'range' ? +input.value : input.value;
    if (s.id === 'profilePreset' && params.profilePreset !== 'custom') {
      profile = PROFILE_PRESETS[params.profilePreset].map((p) => [...p]);
      editor.setPoints(profile);
    }
    writeOutputs(); applyVisibility(); scheduleBuild();
  });
  // the profile editor sits directly under the preset select
  if (s.id === 'profilePreset') {
    const ed = document.createElement('div');
    ed.className = 'fr-editor';
    ed.innerHTML = `<canvas id="profileEditor" aria-label="Molding profile editor"></canvas><p class="fr-editor-note">Drag a point. Double-click to add one, right-click to remove. Left is the outer edge, up is toward you.</p>`;
    w.after(ed);
    editor = new ProfileEditor(ed.querySelector('canvas'), profile, {
      onChange: (pts) => { profile = pts; markCustom(); scheduleBuild(); },
      onCommit: (pts) => { profile = pts; markCustom(); scheduleBuild(); },
    });
  }
}
function markCustom() {
  if (params.profilePreset === 'custom') return;
  params.profilePreset = 'custom';
  ctrlEl.profilePreset.querySelector('select').value = 'custom';
}
function writeControls() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].querySelector('input,select').value = params[s.id];
  writeOutputs(); applyVisibility();
}
function writeOutputs() {
  for (const s of PARAM_SPEC) if (s.kind === 'range') document.getElementById(`${s.id}-out`).textContent = fmtVal(s, params[s.id]);
}
function applyVisibility() {
  for (const s of PARAM_SPEC) ctrlEl[s.id].hidden = (s.tier === 'advanced' && !advanced) || !!(s.visibleWhen && !s.visibleWhen(params));
}
function setAdvanced(on) {
  advanced = !!on;
  document.getElementById('advBtn').classList.toggle('is-on', advanced);
  applyVisibility();
}
document.getElementById('resetBtn').addEventListener('click', () => loadParams({ ...DEFAULTS }, null));
document.getElementById('advBtn').addEventListener('click', () => setAdvanced(!advanced));

function loadParams(p, prof) {
  params = { ...DEFAULTS, ...p };
  profile = prof ? prof.map((q) => [...q]) : profileFor(params, profile).map((q) => [...q]);
  if (prof) params.profilePreset = 'custom';
  editor.setPoints(profile);
  writeControls(); buildNow();
}

/* ---------------- build ---------------- */
let pending = 0;
const stats = { buildMs: 0 };
function scheduleBuild() { if (!pending) pending = requestAnimationFrame(() => { pending = 0; buildNow(); }); }
function buildNow() {
  const t = performance.now();
  model = buildFrame(params, profile);
  stats.buildMs = performance.now() - t;
  document.getElementById('paper').innerHTML = exportSvg(model, fixedView ? { view: fixedView } : {}).svg;
  writeReadout();
}

function writeReadout() {
  const { info, box, params: p } = model;
  const tone = toneAcross(model.prof, p);
  let tmin = Infinity, tmax = -Infinity; for (const v of tone) { tmin = Math.min(tmin, v); tmax = Math.max(tmax, v); }
  const lights = info.lights.length ? `${info.lights.length} lights, sub-arches spring at <b>${info.subSpringY.toFixed(1)} mm</b>` : 'one light, no mullions';
  const warn = info.clamped.map((c) => `<span class="warn">CLAMPED — ${c}</span>`).join('\n');
  let wmin = Infinity, wmax = -Infinity, nHatch = 0, nCross = 0, crossBands = 0;
  for (const b of model.bands) {
    for (const h of b.hatch) { wmin = Math.min(wmin, h.weight); wmax = Math.max(wmax, h.weight); nHatch++; }
    nCross += b.cross.length; if (b.cross.length) crossBands++;
  }
  const weightLine = nHatch
    ? `line weight <b>${wmin.toFixed(2)}–${wmax.toFixed(2)} mm</b> over ${nHatch} hatch runs (${p.lineWeight.toFixed(2)} nominal × ${HATCH_WEIGHT_RANGE[0]}–${HATCH_WEIGHT_RANGE[1]}, thicker in shade)`
    : 'no hatch drawn';
  const crossLine = nCross
    ? `cross-hatch <b>${nCross}</b> lines on ${crossBands} of ${model.bands.length} bands where darkness exceeds <b>${p.crossHatchThreshold.toFixed(2)}</b>`
    : `no cross-hatch — no band's darkness exceeds <b>${p.crossHatchThreshold.toFixed(2)}</b>`;
  document.getElementById('readout').innerHTML =
    `drawing <b>${(box.x1 - box.x0).toFixed(1)} × ${(box.y1 - box.y0).toFixed(1)} mm</b>, <b>${model.strokes}</b> strokes\n`
    + `spring line <b>${info.springY.toFixed(1)} mm</b>, apex <b>${info.apexY.toFixed(1)} mm</b>, arc radius <b>${info.R.toFixed(1)} mm</b>\n`
    + `${lights}\n`
    + `shade across the band <b>${tmin.toFixed(2)}–${tmax.toFixed(2)}</b> darkness (${tmax - tmin < 1e-9 ? 'uniform — a flat face' : 'graded — the profile turns'})\n`
    + `${weightLine}\n${crossLine}\n`
    + `profile <b>${p.profilePreset}</b>, ${model.profile.length} points · build <b>${stats.buildMs.toFixed(1)} ms</b>`
    + (warn ? '\n' + warn : '');
}

/* ---------------- export ---------------- */
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
document.getElementById('exportSvg').addEventListener('click', () => download(`frame-arch-${params.profilePreset}.svg`, exportSvg(model).svg, 'image/svg+xml'));

/* ---------------- test chrome (read by tools/verify-frame.mjs, tools/shot-frame-sheet.mjs) ---------------- */
window.__frame = {
  setParams: (p, prof = null) => loadParams(p, prof),
  getParams: () => ({ ...params }),
  getProfile: () => profile.map((q) => [...q]),
  setFixedView: (v) => { fixedView = v; if (model) buildNow(); },
  svg: () => exportSvg(model).svg,
  model: () => ({ info: model.info, box: model.box, strokes: model.strokes, bands: model.bands.map((b) => ({ id: b.id, hatch: b.hatch.length, cross: b.cross.length, creases: b.creases.length, tone: b.tone, weights: b.hatch.map((h) => h.weight) })) }),
  setAdvanced: (on) => setAdvanced(on),
  readout: () => document.getElementById('readout').textContent,
  controls: () => Object.fromEntries(PARAM_SPEC.map((s) => [s.id, !ctrlEl[s.id].hidden])),
};

loadParams(params, null);
