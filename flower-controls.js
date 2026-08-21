/* ===================================================================
   flower-controls.js — build the control-panel DOM from the registry.

   One generator over flower-registry.js's CONTROLS, so every control's markup
   (label, value read-out, input, hint, gating attributes) is produced from the
   single source of truth. Because each parameter emits exactly one <label> and
   one [data-value] span keyed to its own id, the duplicate-span class of bug is
   structurally impossible. Standard/Advanced is later a `tier` filter over the
   same array — never a second panel.

   [P1 — work in progress. Additive: not wired into flower.html yet.]
   =================================================================== */

// Build one .fl-ctrl node for a registry entry, matching the hand-written markup
// so CSS and downstream wiring are unchanged.
export function renderControl(spec) {
  const div = document.createElement('div');
  div.className = 'fl-ctrl';
  if (spec.permanentHidden) div.hidden = true;
  if (spec.divId) div.id = spec.divId;                       // imperative-gate wrapper (being retired)
  if (spec.gating) for (const [k, v] of Object.entries(spec.gating)) div.setAttribute(k, v === true ? '' : v);

  const row = document.createElement('div');
  row.className = 'fl-ctrl__row';
  const label = document.createElement('label');
  label.setAttribute('for', spec.id);
  label.textContent = spec.label || spec.id;
  row.appendChild(label);
  if (spec.kind === 'slider') {
    const val = document.createElement('span');
    val.className = 'fl-ctrl__val';
    val.setAttribute('data-value', spec.id);                // exactly one per parameter, keyed to its id
    row.appendChild(val);
  }
  div.appendChild(row);

  let el;
  if (spec.kind === 'select') {
    el = document.createElement('select');
    el.className = 'fl-select';
    el.id = spec.id;
    for (const o of spec.options) {
      if (o.hidden || o.disabled) continue;                 // dead options are dropped, not shipped hidden
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text != null ? o.text : String(o.value).toUpperCase();
      if (o.value === spec.default) opt.selected = true;
      el.appendChild(opt);
    }
  } else if (spec.kind === 'checkbox') {
    el = document.createElement('input');
    el.type = 'checkbox';
    el.id = spec.id;
    el.checked = !!spec.default;
  } else if (spec.kind === 'text') {
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'fl-text';
    el.id = spec.id;
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('autocomplete', 'off');
    el.value = spec.default != null ? spec.default : '';
  } else {                                                  // slider
    el = document.createElement('input');
    el.type = 'range';
    el.id = spec.id;
    el.min = spec.min; el.max = spec.max; el.step = spec.step; el.value = spec.default;
  }
  div.appendChild(el);

  if (spec.hint) {
    const h = document.createElement('span');
    h.className = 'fl-ctrl__hint';
    h.innerHTML = spec.hint;                                // hint may carry entities (— → &nbsp; etc.)
    div.appendChild(h);
  }
  return div;
}

// Populate each accordion body (id === section id) with its controls, in order.
// Returns the count actually mounted.
export function buildPanel(CONTROLS, SECTIONS) {
  let n = 0;
  for (const sec of SECTIONS) {
    const body = document.getElementById(sec.id);
    if (!body) continue;
    for (const c of CONTROLS) {
      if (c.section !== sec.id) continue;
      body.appendChild(renderControl(c));
      n++;
    }
  }
  return n;
}
