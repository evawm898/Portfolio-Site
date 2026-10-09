/* verify-bug-body.mjs — the BP family of the bug gate: BODY TYPES (design doc
   §17). Imported by tools/verify-bug.mjs, which runs these function checks
   beside the others and builds the rows below as ordinary rows (every clause of
   the gate applies to them: M W P C F S R O N E J X G JB, and L on the tucked
   presets). Node only.

   `G` is the geometry module under test (the gate hands it a MUTATED copy for
   the negative control), so every check reads the module it is given. The
   REFERENCES are this file's own: the body length is RESTATED from the layout's
   arithmetic (never read through G.bodyLengthMm), the wingspan is measured off
   the BUILT model's emitted wing vertices, the fields a body type may write are
   listed here (never read from G.BODY_PRESETS), and "a saved design builds as
   it did" is held against fingerprints of builds made by main at 9dbb8e1.

     BP1  SIZE is a proportion of the wingspan: on every body type's BUILT
          model, the body's length off its emitted vertices (y extent of the
          body part) over the wingspan off its emitted wing vertices (2x the
          furthest x; 72 mm restated for a wingless bug) equals SIZE within
          1e-6 relative.
     BP2  the type's PROPORTIONS hold at every SIZE and WIDTH: over SIZE at
          both ends and its own value x WIDTH at both ends and 1, wherever the
          fit held nothing at a slider's end, the fitted fields against the
          type's own ratios — lengths to each other unchanged by WIDTH, widths
          to lengths scaled by exactly WIDTH, limbs a fixed share of the body
          length (restated here), never of WIDTH; and a captured CUSTOM body
          (captureBody) fits back to its own fields (1e-9), at WIDTH 1.3.
     BP3  a body type changes the BODY ONLY: on four bases, applying any type
          leaves the wings byte-identical (JSON) and every field outside the
          body list RESTATED here unchanged; the pair count too, except Spider,
          which sets it to 0 (and a type applied after Spider leaves it at 0);
          the body following the wingspan (fitBody) never writes a wing.
     BP4  a SAVED DESIGN loads as CUSTOM with its exact values and builds as
          main built it: a version-7 document of main's default and of the
          legacy default loads with bodyType 'custom', no proportions, every
          field in the file unchanged — and both builds' positions hash to
          main's own (FNV-1a over the Float64 positions, recorded at 9dbb8e1).
     BP5  a limb edited by hand under a body type keeps its length through the
          fit, and SIZE then scales it with the body. */

const SIZE_ENDS = [0.2, 0.9];       // restated: the SIZE slider's ends (design doc §17)
const WIDTH_ENDS = [0.6, 1.6];       // restated: the WIDTH slider's ends
const REF_SPAN = 72;                 // restated: the span a wingless body is sized against
const BODY_FIELDS = ['bodyParts', 'roundness', 'pointedTips', 'abdomenTaper', 'abdomenSegments', 'banding', 'segmentStyle',
  'legPairs', 'legsVisible', 'legReach', 'legSplay', 'legBend', 'legTaper', 'antennaType', 'antennaCurl', 'antennaSpread', 'antennaLift',
  'clubLength', 'clubWidth', 'clubTaper', 'headSize', 'thoraxLength', 'thoraxWidth', 'thoraxDepth', 'abdomenLength', 'abdomenWidth',
  'coxa', 'femur', 'tibia', 'tarsus', 'antennaLength', 'bodyType', 'bodySize', 'bodyWidth', 'bodyRatios'];
/* main's default (9dbb8e1) differs from this tree's default only in these body
   fields (measured); with them, as a version-7 file, it is main's default design */
const MAIN_DEFAULT_BODY = { headSize: 2.4, thoraxLength: 5, thoraxWidth: 2.9, thoraxDepth: 2.9, abdomenLength: 15, abdomenWidth: 2.2,
  coxa: 0.9, femur: 4, tibia: 4.2, tarsus: 3.4, antennaLength: 17, clubLength: 0.22, clubWidth: 1.8, clubTaper: 0.35 };
const MAIN_HASH = { default: '7ba5ed3a', legacy: 'ac41cf3' };   // buildBug(...).positions on main at 9dbb8e1, Node 20 and 22 alike

const fnv = (pos) => { const u = new Uint8Array(Float64Array.from(pos).buffer); let h = 0x811c9dc5; for (const b of u) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
/* the body length restated from the layout's arithmetic (§1: head front to
   abdomen tip): insect 0.88 Lt + 0.775 head + abdomen, spider 0.96 Lt + abdomen,
   Lt lengthened by 0.3 per wing pair past two */
const restatedLength = (p) => { const Lt = p.thoraxLength * (1 + 0.3 * Math.max(0, p.wingPairs - 2)); return p.bodyParts === '3' ? 0.88 * Lt + 0.775 * p.headSize + p.abdomenLength : 0.96 * Lt + p.abdomenLength; };

/* measured off the EMITTED model: [body length, wingspan] */
export function measuredBody(G, model) {
  const P = model.positions;
  let y0 = Infinity, y1 = -Infinity, x = 0, wings = false;
  for (const q of model.parts) {
    if (q.kind === 'body') for (let v = q.v0; v < q.v1; v++) { y0 = Math.min(y0, P[3 * v + 1]); y1 = Math.max(y1, P[3 * v + 1]); }
    if (/^wing\d$/.test(q.kind) && q.side === 'R') { wings = true; for (let v = q.v0; v < q.v1; v++) x = Math.max(x, P[3 * v]); }
  }
  return { length: y1 - y0, span: wings ? 2 * x : REF_SPAN };
}
/* BP1 on a built row: the row's own fit is passed in (`held` = the fit held a field at a slider end) */
export function bodyFitClause(G, model, fit) {
  const m = measuredBody(G, model), want = model.params.bodySize, got = m.length / m.span;
  if (fit.held) return [];
  return rel(got, want) <= 1e-6 ? [] : [`BP1: the body reads ${m.length.toFixed(3)} mm over a ${m.span.toFixed(3)} mm span = ${got.toFixed(6)}, SIZE asks ${want}`];
}

function bases(G) {
  const lib = G.WING_LIBRARY;
  const a = G.defaultParams();
  const b = G.applyWingShape(G.defaultParams(), lib[Math.min(9, lib.length - 1)]); b.wingPairs = 3;
  const c = G.randomParams(3); if (!c.wingPairs) { c.bodyParts = '3'; c.wingPairs = 2; }
  const d = G.defaultParams(); d.wingPairs = 4; d.wings.unlinked[1] = { ...clone(d.wings.first), sweep: 30 };
  return [['default', a], ['library 3 pairs', b], ['random:3', c], ['4 pairs, one unlinked', d]];
}

export function bodyChecks(G, opts = {}) {
  const out = [];
  const run = (c) => !opts.only || opts.only === c;   // the negative control runs only the clause a mutant names (cost)
  const ok = (c, m) => out.push([!!c, m]);
  const types = G.BODY_TYPE_IDS;
  // BP1 — built, one per type, on a library wing
  if (run('BP1')) {
    const bad = [];
    types.forEach((t, i) => {
      const base = G.applyWingShape(G.defaultParams(), G.WING_LIBRARY[(i * 7) % G.WING_LIBRARY.length]);
      const f = G.applyBodyType(base, t), model = G.buildBug(f.params);
      bad.push(...bodyFitClause(G, model, { held: f.notes.length > 0 }).map((x) => `${t}: ${x}`));
      if (f.notes.length) bad.push(`${t}: the fit held a field at its type's own SIZE (${f.notes.join('; ')}) — BP1 cannot judge it (vacuous)`);
    });
    ok(!bad.length, `BP1: every body type's BUILT body is SIZE x the wingspan measured off its emitted vertices (1e-6)${bad.length ? ' — ' + bad.join(' | ') : ''}`);
  }
  // BP2 — proportions at the slider ends (no builds)
  if (run('BP2')) {
    const bad = []; let judged = 0;
    for (const t of types) {
      const R = G.BODY_PRESETS[t].ratios, own = G.BODY_PRESETS[t].size;
      for (const s of [SIZE_ENDS[0], own, SIZE_ENDS[1]]) for (const w of [WIDTH_ENDS[0], 1, WIDTH_ENDS[1]]) {
        const p = G.applyBodyType(G.defaultParams(), t).params; p.bodySize = s; p.bodyWidth = w;
        const f = G.fitBody(p); if (f.notes.length) continue;
        judged++;
        const q = f.params, Bm = restatedLength(q);
        const e = [
          ['thorax / abdomen length', q.thoraxLength / q.abdomenLength, R.thoraxLength / R.abdomenLength],
          ['thorax width / abdomen length', q.thoraxWidth / q.abdomenLength, (w * R.thoraxWidth) / R.abdomenLength],
          ['thorax depth / abdomen length', q.thoraxDepth / q.abdomenLength, (w * R.thoraxDepth) / R.abdomenLength],
          ['abdomen width / abdomen length', q.abdomenWidth / q.abdomenLength, (w * R.abdomenWidth) / R.abdomenLength],
          ...(q.bodyParts === '3' ? [['head / abdomen length', q.headSize / q.abdomenLength, (w * R.headSize) / R.abdomenLength]] : []),   // a spider has no head
          ...['coxa', 'femur', 'tibia', 'tarsus', 'antennaLength'].map((id) => [`${id} / body length`, q[id] / Bm, R[id]]),
        ];
        for (const [what, got, want] of e) if (rel(got, want) > 1e-9) bad.push(`${t} SIZE ${s} WIDTH ${w}: ${what} ${got.toFixed(6)} where the type asks ${want.toFixed(6)}`);
      }
    }
    ok(!bad.length && judged >= 30, `BP2: every type's proportions hold at every SIZE and WIDTH the fit did not clamp (${judged} states judged; WIDTH scales widths only, limbs follow the body length)${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`);
    // a captured CUSTOM body fits back to itself
    const bad2 = [];
    for (const [label, p0] of [['default', G.defaultParams()], ['random:5', G.randomParams(5)], ['random:11', G.randomParams(11)]]) {
      const p = clone(p0); p.bodyType = 'custom'; p.bodyRatios = null; p.bodyWidth = 1.3;
      const c = G.captureBody(p), f = G.fitBody(c).params;
      if (c.bodySize <= SIZE_ENDS[0] || c.bodySize >= SIZE_ENDS[1]) continue;
      for (const id of ['headSize', 'thoraxLength', 'thoraxWidth', 'thoraxDepth', 'abdomenLength', 'abdomenWidth', 'coxa', 'femur', 'tibia', 'tarsus', 'antennaLength'])
        if (rel(f[id], p[id]) > 1e-9) bad2.push(`${label}: ${id} ${p[id]} -> ${f[id]}`);
    }
    ok(!bad2.length, `BP2: a captured custom body (WIDTH 1.3) fits back to its own fields (1e-9)${bad2.length ? ' — ' + bad2.slice(0, 3).join(' | ') : ''}`);
  }
  // BP3 — the body only
  if (run('BP3')) {
    const bad = [];
    for (const [label, p0] of bases(G)) {
      const W = JSON.stringify(p0.wings);
      for (const t of types) {
        const q = G.applyBodyType(p0, t).params;
        if (JSON.stringify(q.wings) !== W) bad.push(`${label} -> ${t}: the wings changed`);
        const pairs = t === 'spider' ? 0 : p0.wingPairs;
        if (q.wingPairs !== pairs) bad.push(`${label} -> ${t}: wing pairs ${p0.wingPairs} -> ${q.wingPairs} (want ${pairs})`);
        for (const k of Object.keys(p0)) if (k !== 'wings' && k !== 'wingPairs' && !BODY_FIELDS.includes(k) && JSON.stringify(q[k]) !== JSON.stringify(p0[k])) bad.push(`${label} -> ${t}: ${k} changed`);
        if (t === 'spider') {
          // Eva's ruling on the sheet: a winged type after a Spider brings the wings back,
          // at the count the page hands it (the pairs the Spider took) or the default's 2
          for (const w of types.filter((x) => x !== 'spider')) {
            const r = G.applyBodyType(q, w, { wingPairs: p0.wingPairs }).params, r2 = G.applyBodyType(q, w).params;
            if (r.wingPairs !== p0.wingPairs || JSON.stringify(r.wings) !== W) bad.push(`${label}: Spider then ${w} gave ${r.wingPairs} pairs (want ${p0.wingPairs}) or moved the wings`);
            if (r2.wingPairs !== 2 || JSON.stringify(r2.wings) !== W) bad.push(`${label}: Spider then ${w} with no count to restore gave ${r2.wingPairs} pairs (want 2) or moved the wings`);
          }
        }
        const fp = clone(q); for (const w of [fp.wings.first, fp.wings.last]) w.length *= 1.25;
        const fq = G.fitBody(fp).params;
        if (JSON.stringify(fq.wings) !== JSON.stringify(fp.wings) || fq.wingPairs !== fp.wingPairs) bad.push(`${label} -> ${t}: the body following the wingspan wrote a wing`);
      }
    }
    ok(!bad.length, `BP3: a body type changes the body only — wings byte-identical and the pair count kept (Spider: 0; a winged type after Spider gives the pairs back) on four bases x every type${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`);
  }
  // BP4 — saved designs
  if (run('BP4')) {
    const bad = [];
    const docs = [];
    { const p = G.defaultParams(); for (const k of ['bodyType', 'bodySize', 'bodyWidth', 'bodyRatios', 'antennaLift']) delete p[k]; Object.assign(p, MAIN_DEFAULT_BODY); docs.push(['default', p]); }
    { const p = G.legacyDefaultParams(); for (const k of ['bodyType', 'bodySize', 'bodyWidth', 'bodyRatios', 'antennaLift']) delete p[k]; docs.push(['legacy', p]); }
    for (const [label, p] of docs) {
      const doc = clone({ format: G.DESIGN_FORMAT, version: 7, name: label, params: p });
      const r = G.paramsFromDesign(doc);
      if (!r.ok) { bad.push(`${label}: refused (${r.reason})`); continue; }
      if (r.params.bodyType !== 'custom' || r.params.bodyRatios !== null) bad.push(`${label}: loads as ${r.params.bodyType}${r.params.bodyRatios ? ' with proportions' : ''}, not Custom`);
      for (const [k, v] of Object.entries(p)) if (canon(r.params[k]) !== canon(v)) bad.push(`${label}: ${k} loaded as ${JSON.stringify(r.params[k])?.slice(0, 40)}, the file says ${JSON.stringify(v)?.slice(0, 40)}`);
      const h = fnv(G.buildBug(r.params).positions);
      if (h !== MAIN_HASH[label]) bad.push(`${label}: builds to ${h}, main built ${MAIN_HASH[label]}`);
    }
    // and a design saved WITH a body type round-trips to the same params and model
    const q = G.applyBodyType(G.applyWingShape(G.defaultParams(), G.WING_LIBRARY[3]), 'bee').params;
    const back = G.paramsFromDesign(clone(G.designFromParams(q, 'bee')));
    if (!back.ok || JSON.stringify(back.params) !== JSON.stringify(G.normalizeParams(q))) bad.push('a bee design does not round-trip to the same params');
    ok(!bad.length, `BP4: a version-7 design loads CUSTOM with its exact values and builds as main built it (positions hash ${MAIN_HASH.default} / ${MAIN_HASH.legacy}); a body-type design round-trips${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`);
  }
  // BP5 — a limb edited by hand
  if (run('BP5')) {
    const bad = [];
    const p = G.applyBodyType(G.defaultParams(), 'butterfly').params;
    const q = G.fitBody(G.setLimb(p, 'femur', 7.3)).params;
    if (rel(q.femur, 7.3) > 1e-9) bad.push(`femur 7.3 fits back to ${q.femur}`);
    const r = clone(q); r.bodySize = q.bodySize * 1.5; const s = G.fitBody(r).params;
    if (rel(s.femur / restatedLength(s), q.femur / restatedLength(q)) > 1e-9) bad.push(`SIZE x1.5 moved the femur's share of the body ${q.femur / restatedLength(q)} -> ${s.femur / restatedLength(s)}`);
    ok(!bad.length, `BP5: a hand-set limb keeps its length through the fit, and SIZE scales it with the body${bad.length ? ' — ' + bad.join(' | ') : ''}`);
  }
  return out;
}

/* Rows: every type at its own SIZE and at both diagonal corners of SIZE x
   WIDTH, each on a library wing (the wings rotate through the library), built
   through every row clause; and a spider given its wings back. */
export function bodyRows(G) {
  // the two-pair entries only (by position, so adding an N-pair entry at the
  // end of the library — design doc §18 — moves no body row off its shape)
  const rows = [], lib = G.WING_LIBRARY.filter((s) => !G.isMultiShape(s));
  let k = 0;
  for (const t of G.BODY_TYPE_IDS) {
    for (const [s, w] of [[null, 1], [SIZE_ENDS[0], WIDTH_ENDS[0]], [SIZE_ENDS[1], WIDTH_ENDS[1]]]) {
      const shape = lib[(5 + 11 * k++) % lib.length];
      let p = G.applyBodyType(G.applyWingShape(G.defaultParams(), shape), t).params;
      if (s !== null) { p.bodySize = s; p.bodyWidth = w; }
      const f = G.fitBody(p);
      rows.push([`body: ${t}${s === null ? '' : ` SIZE ${s} WIDTH ${w}`} on #${shape.id}`, f.params, { bodyFit: { held: f.notes.length > 0 }, tucked: s === null && f.params.legReach === 0 && f.params.legPairs > 0 }]);
      // tucked is the TYPE's pose at its own proportions: at WIDTH 0.6 the body
      // narrows and the legs (which scale with length, never width) show past it
    }
  }
  // NOT a row: the Spider body with wings put back fails JB1 (a 0.60 mm slot
  // between a wing and the 2-part body at the midline) — the junction blend
  // was never built for a 2-part bug with wings, which main reaches too by
  // setting body parts to 2 by hand. Reported in §17.8, not declared green.
  return rows;
}

/* CODE mutants of bug-geometry.js: [name, from, to, clause] — every one must be
   caught by the clause it names (every anchor checked first by the gate). */
export const BODY_MUTANTS = [
  ['the body ignores the wingspan', 'const B2 = p.bodySize * wingspanOf(f.out, reach);', 'const B2 = p.bodySize * BODY_REF_SPAN_MM;', 'BP1'],
  ['WIDTH scales the lengths too', 'for (const id of BODY_LENGTH_IDS) q[id] = R[id];', 'for (const id of BODY_LENGTH_IDS) q[id] = R[id] * w;', 'BP2'],
  ['the limbs scale with WIDTH', 'for (const id of LIMB_IDS) want[id] = R[id] * B;', 'for (const id of LIMB_IDS) want[id] = R[id] * B * w;', 'BP2'],
  ['capture forgets the width', 'for (const id of BODY_WIDTH_IDS) R[id] = p[id] / (B * w);', 'for (const id of BODY_WIDTH_IDS) R[id] = p[id] / B;', 'BP2'],
  ['a body type touches the wings', "p.bodyType = type; p.bodySize = T.size;", "p.bodyType = type; p.wings.first.length *= 1.05; p.bodySize = T.size;", 'BP3'],
  ['Spider keeps its wings', 'if (Number.isInteger(T.wingPairs)) p.wingPairs = T.wingPairs;', 'if (false) p.wingPairs = T.wingPairs;', 'BP3'],
  ['a winged type leaves a wingless bug wingless', 'else if (!(p.wingPairs > 0)) p.wingPairs', 'else if (false) p.wingPairs', 'BP3'],
  ['an old design loads as the default type', "if (!('bodyType' in p)) q.bodyType = 'custom';", '', 'BP4'],
  ['the antenna lift loses its old branch', 'const rise = p.antennaLift === ANT_LIFT_LEGACY ? 0.35 : Math.tan(p.antennaLift * D2R);', 'const rise = Math.tan(p.antennaLift * D2R);', 'BP4'],
  ['a hand-set limb is not kept', 'if (p.bodyRatios && LIMB_IDS.includes(id)) p.bodyRatios', 'if (false) p.bodyRatios', 'BP5'],
];
