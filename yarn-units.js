/* ---------------------------------------------------
   yarn-units.js — section 01's two interactives (Yarn
   Characterization): the count converter and the spec decoder.
   All arithmetic is yarn-count.js's; this file is DOM only.

   Converter: five number inputs, one per unit. Editing any one
   rewrites the other four (never the one being typed in), and two
   cross-sections compare this yarn against a 150 D reference at the
   same fibre density (diameter ∝ √tex).

   Decoder: a text input plus preset chips. The parse is shown term
   by term, and anything the parser refuses is said in words.
--------------------------------------------------- */
import {
  UNITS, toTex, fromTex, sig, parseSpec, PROCESSES, FIBRES
} from './yarn-count.js';

const REF_TEX = 150 / 9;              // the 150 D reference circle
const SVG_NS = 'http://www.w3.org/2000/svg';

/* ---------------- converter ---------------- */
function initConverter(root) {
  const inputs = {};
  const dirOf = { direct: '↑ bigger = heavier', indirect: '↓ smaller = heavier' };

  const rows = root.querySelector('[data-yc-rows]');
  for (const u of UNITS) {
    const row = document.createElement('label');
    row.className = 'yc-conv__row';
    row.innerHTML =
      '<span class="yc-conv__name">' + u.label + ' <span class="yc-conv__unit">' + u.short + '</span></span>' +
      '<input class="yc-conv__input" type="number" inputmode="decimal" min="0" step="any" data-unit="' + u.id + '" aria-label="' + u.label + ' (' + u.def + ')">' +
      '<span class="yc-conv__def">' + u.def + '</span>' +
      '<span class="yc-conv__dir yc-conv__dir--' + u.kind + '">' + dirOf[u.kind] + '</span>';
    rows.appendChild(row);
    inputs[u.id] = row.querySelector('input');
  }

  const status = root.querySelector('[data-yc-status]');
  const svg = root.querySelector('[data-yc-xsec]');

  function drawCircles(tex) {
    // diameter ∝ √tex; the larger of the two circles fills 80 px of radius
    const w = 320, h = 190, cy = 92;
    const valid = Number.isFinite(tex) && tex > 0;
    const rRaw = valid ? Math.sqrt(tex) : 0, rRef = Math.sqrt(REF_TEX);
    const k = 72 / Math.max(rRaw, rRef);
    const rY = Math.max(1.2, rRaw * k), rR = Math.max(1.2, rRef * k);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';
    const mk = (tag, attrs, text) => {
      const el = document.createElementNS(SVG_NS, tag);
      for (const a in attrs) el.setAttribute(a, attrs[a]);
      if (text !== undefined) el.textContent = text;
      svg.appendChild(el);
      return el;
    };
    // reference: dashed outline; this yarn: filled — two cues, not colour alone
    mk('circle', { cx: 85, cy, r: rR, class: 'yc-xsec__ref' });
    if (valid) mk('circle', { cx: 235, cy, r: rY, class: 'yc-xsec__this' });
    mk('text', { x: 85, y: h - 8, class: 'yc-xsec__label', 'text-anchor': 'middle' }, '150 D reference');
    mk('text', { x: 235, y: h - 8, class: 'yc-xsec__label', 'text-anchor': 'middle' }, valid ? 'this yarn' : 'no value');
  }

  function render(tex, except) {
    for (const u of UNITS) {
      if (u.id === except) continue;
      inputs[u.id].value = Number.isFinite(tex) ? Number(sig(fromTex(tex, u.id), 4).replace(/,/g, '')) : '';
    }
    if (Number.isFinite(tex)) {
      const ratio = Math.sqrt(tex / REF_TEX);
      status.textContent = sig(tex, 4) + ' tex — ' + sig(ratio, 3) + '× the diameter of a 150 D yarn of the same fibre';
      drawCircles(tex);
    } else {
      status.textContent = '! enter a positive number';
      drawCircles(NaN);
    }
  }

  for (const u of UNITS) {
    inputs[u.id].addEventListener('input', () => render(toTex(inputs[u.id].value, u.id), u.id));
  }
  inputs.den.value = 150;
  render(toTex(150, 'den'), 'den');

  root.__yc = { inputs, render };
}

/* ---------------- decoder ---------------- */
function fmtCounts(tex) {
  return sig(fromTex(tex, 'den'), 4) + ' D · ' + sig(fromTex(tex, 'dtex'), 4) + ' dtex · ' +
    sig(tex, 4) + ' tex · Ne ' + sig(fromTex(tex, 'Ne'), 3) + ' · Nm ' + sig(fromTex(tex, 'Nm'), 3);
}

function decode(out, spec) {
  const r = parseSpec(spec);
  out.innerHTML = '';
  if (!r.ok) {
    const p = document.createElement('p');
    p.className = 'yc-dec__error';
    p.textContent = r.error === 'empty' ? 'Type a spec, or pick one above.' : '✕ ' + r.error;
    out.appendChild(p);
    return r;
  }
  const dl = document.createElement('dl');
  dl.className = 'yc-dec__fields';
  const add = (k, v) => {
    const div = document.createElement('div');
    div.innerHTML = '<dt></dt><dd></dd>';
    div.querySelector('dt').textContent = k;
    div.querySelector('dd').textContent = v;
    dl.appendChild(div);
  };
  add('Plies', r.plies === 1 ? '1 (a single)' : r.plies + ' singles twisted together');
  if (r.system === 'indirect') {
    add('Count per ply', r.unitWritten + ' ' + sig(r.countPerPly, 4) + ' = ' + fmtCounts(r.texPerPly));
    if (r.plies > 1) add('Resultant', r.unitWritten + ' ' + sig(r.resultant, 3) + ' ≈ ' + sig(r.texTotal, 4) + ' tex');
  } else {
    add('Count per ply', fmtCounts(r.texPerPly));
    if (r.plies > 1) add('Total', fmtCounts(r.texTotal));
  }
  if (r.filaments) {
    add('Filaments', r.plies > 1 ? r.filaments + ' per ply, ' + r.filamentsTotal + ' in all' : String(r.filaments));
    add('Denier per filament', sig(r.dpf, 3) + ' dpf (' + sig(r.dtexPerFilament, 3) + ' dtex per filament)');
    const fib = FIBRES.find(f => f.id === (r.fibre || 'polyester'));
    add('Filament diameter', '≈ ' + sig(r.filamentDiameterUm, 3) + ' µm, if round and solid ' + fib.label +
      ' at ' + fib.density + ' g/cm³' + (r.densityAssumed ? ' (assumed — no fibre named)' : ''));
  } else if (r.system === 'direct') {
    add('Filaments', 'not given');
  }
  if (r.fibre && !r.filaments) add('Fibre', FIBRES.find(f => f.id === r.fibre).label);
  if (r.process) {
    const pr = PROCESSES[r.process];
    add('Process', pr.label + ' — ' + pr.name + '. ' + pr.note);
  }
  out.appendChild(dl);
  for (const n of r.notes) {
    const p = document.createElement('p');
    p.className = 'yc-dec__note';
    p.textContent = n;
    out.appendChild(p);
  }
  return r;
}

function initDecoder(root) {
  const input = root.querySelector('[data-yc-spec]');
  const out = root.querySelector('[data-yc-out]');
  const chips = [...root.querySelectorAll('[data-yc-preset]')];
  function setActive(value) {
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.ycPreset === value));
  }
  input.addEventListener('input', () => { setActive(input.value); decode(out, input.value); });
  for (const c of chips) {
    c.addEventListener('click', () => {
      input.value = c.dataset.ycPreset;
      setActive(input.value);
      decode(out, input.value);
    });
  }
  input.value = chips[0] ? chips[0].dataset.ycPreset : '';
  setActive(input.value);
  decode(out, input.value);
}

const conv = document.querySelector('[data-yc-converter]');
if (conv) initConverter(conv);
const dec = document.querySelector('[data-yc-decoder]');
if (dec) initDecoder(dec);
