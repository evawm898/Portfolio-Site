/* ===================================================================
   bloom-lobe-resolution.mjs — THE SAMPLES-PER-LOBE FLOOR, derived.

     node tools/bloom-lobe-resolution.mjs [--json]

   SESSION 41 — TWO EXPONENTS, AND THE TABLE THE GEOMETRY CARRIES.
   `lobeTipShape` is retired and the cut is `lobeCutProfile(f, crest, notch)`,
   whose two exponents are the LOCAL POWERS of the cut at its own two
   features. So the floor is a SURFACE and not a number, and it is what
   decides the count ceiling. This tool is the ONE OWNER of that derivation:
     node tools/bloom-lobe-resolution.mjs              the shipped family (the calibration)
     node tools/bloom-lobe-resolution.mjs --calibrate  the calibration, as a pass/fail
     node tools/bloom-lobe-resolution.mjs --table      the table, in the form bloom-geometry.js pastes
     node tools/bloom-lobe-resolution.mjs --verify     re-derive every cell and compare with the shipped table
     node tools/bloom-lobe-resolution.mjs --surface    the demand over a readable (crest, notch) grid
   `--verify` is the table's ONLY independent witness. The harness's L3 reads
   the shipped table, so it can prove the record carries the demand the shape
   asks for and can never prove the table.

   THE CALIBRATION IS THE ARGUMENT THAT THE GENERALISATION IS ONE. Session
   40's premise — "a corner does not need resolving; what needs resolving is
   the ROUND band" — was prose its formula did not implement, because on the
   shipped family the binding feature is parabolic or flatter at every
   reachable value. Weighting the bar by `clamp(power - 1, 0, 1)` therefore
   leaves the bar at EXACTLY 2 everywhere on that family and must reproduce
   its floors: ladder 10 / 11 / 8 and uniform 7 / 10 / 6. It does, 3 of 3.

   AND ONE DEFECT IN THE SHIPPED CLAUSE, found by running it on the new law.
   `gapsPerBroad` divided the band by the widest gap OVERLAPPING it without
   requiring the gaps to COVER it — so two coincident stations left one gap
   of ~0 touching the band and the ratio blew up: the clause PASSED ON
   PILING, which is the opposite of what it asks. It never bit on the
   shipped family (at most one corner, and the floor search started at n = 3)
   and it bit at once on a law with two. The gaps are read on the CIRCLE now,
   so they tile the period and sum to 1, the crest band needs no phase shift,
   and the answers are identical wherever the old form's gaps did tile.

   AND THE LAW MUST BE THE SHIPPED EXPRESSION, NOT AN ALGEBRAIC EQUIVALENT.
   `((1 - cos 2 pi f)/2)^q` and `sin(pi f)^{2q}` are the same function on
   [0, 1] and are NOT the same function outside it — the first is even and
   periodic, the second is not — and this tool's tangent probe reads f
   slightly outside at the period's ends. Substituting the second form moved
   the q = 0.50 ladder floor from 10 to 7: a station set 0.072 from the crest
   became one 0.150 away. The law is imported from the geometry now, and any
   law reached through a triangle phase is wrapped explicitly, because
   `Math.pow` of a negative r is NaN and would poison the whole measure.

   THE ORIGINAL QUESTION (Eva, session 38, the ruling amendment): how many
   stations per lobe period does the emitted polyline need before the shape
   control is distinguishable across its range — before 0.50 (pointed), 1.00
   (the raised cosine) and 2.00 (flat-topped) stop being the same triangle
   wave? Four
   samples per period cannot carry a shape (the buckle's own f 7 at NU 28),
   and the first lobe sheet stood on that floor: 3.0 rows per lobe at eight
   lobes, 4.2 at six, both a staircase, the tip-shape control inert to the eye.

   THE MODEL is one lobe period of the law the outline uses, `cut(f) = ((1 -
   cos 2 pi f) / 2)^q` in the lobe phase f, drawn at depth d on a half-width h
   — the default petal's own numbers at the default depth of the sheet
   (depth 0.30 of a 5.4 mm half-width, pitch 2.38 mm at six lobes) — and its
   POLYLINE through n stations placed as the ladder places them: by the
   ladder's own measure restricted to the period (turning plus
   LADDER_ARC_SHARE of arc length, the constants read from the geometry, not
   restated), with the window's ends on crests as the builder puts them. A
   uniform placement is beside it as the control the ladder is not.

   WHAT THE EYE READS, and why a height comparison is the wrong criterion.
   The first draft of this instrument compared the polylines' HEIGHTS: the
   drawn separation between two tip shapes against each drawing's own chord
   error. It passed at n = 4 — and the sheet had already shown three tip
   shapes at 4.2 rows per lobe as three identical triangle waves. A polyline
   through four points differs from another in its vertex heights without
   differing in SHAPE: every four-point period is a quadrilateral. What
   distinguishes the range's ends to the eye is WHICH END OF THE LOBE IS
   BROAD — 0.50 has a corner at the crest and a round sinus, 2.00 a flat crest
   and a V at the sinus, 1.00 neither — and a broad feature is drawn as a
   bend only when the polyline has at least two segments inside it — the
   band must span TWO STATION GAPS. With one it is a corner, whatever the law
   says. (Counting stations inside the band instead is parity-jittery: an odd
   n never lands a station on the sinus, so the count steps 3, 2, 3, 2 as n
   climbs; the ratio of the band's width to the local gap does not.)

   THE BANDS. A shape's crest band is where the cut is within a tenth of its
   minimum, its sinus band where it is within a tenth of its maximum, both as
   fractions of the period: 0.50 has a 0.064 crest and a 0.288 sinus, 1.00 a
   0.205 crest and a 0.205 sinus, 2.00 a 0.380 crest and a 0.146 sinus (the
   law's own closed forms, printed). The BROAD feature of each shape is the
   wider of its two bands.

   TWO CLAUSES PER n, under the ladder's placement (and uniform beside it):
     (i)  every shape's broad feature spans at least two station gaps (its
          width over the widest gap among the stations that fall in it and
          the two that bracket it is >= 2) — the shape is drawn as a curve
          where it is curved;
     (ii) the drawn separation between every pair of shapes exceeds both
          drawings' own chord error and keeps at least half the laws' true
          separation — the survivor is the shape, not a sampling accident
          (the first draft's clause, kept as the necessary half it is).
   The floor n* is the smallest n at which both hold under the LADDER's
   placement; the uniform placement's floor is reported beside it. A picture
   is the demonstration (tools/shot-bloom-lobe-floor.mjs: the range's ends at
   n* and at n* - 1, macro, print preview ON); this is the derivation it is
   read against.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const JSON_OUT = process.argv.includes('--json');

/* ---- THE TWO LAWS ---------------------------------------------------
   THE SHIPPED ONE is `lobeCutProfile`, imported — never restated, because a
   restatement is a second owner of the thing under test.
   THE RETIRED ONE is carried here as a frozen copy, IN THE EXPRESSION IT
   SHIPPED IN, for the calibration alone: `lobeTipShape` is in RETIRED_IDS,
   so the geometry no longer holds it, and the calibration needs it to show
   that the new clause reproduces session 38's ruled floors. An algebraic
   equivalent will NOT do — see the header. */
const wrap = (f) => f - Math.floor(f);
const retiredCut = (q) => (f) => Math.pow((1 - Math.cos(2 * Math.PI * wrap(f))) / 2, q);
const newCut = (crest, notch) => (f) => G.lobeCutProfile(f, crest, notch);

const DEPTH = 0.30, HALF = 5.4, PITCH = 2.38;          // the sheet's default cell, in mm
const DENSE = 4000;
const RELIEF = DEPTH * HALF;
const lawOf = (cut) => (f) => HALF * (1 - DEPTH * cut(f));

/* THE BANDS, read NUMERICALLY off the cut itself rather than from a closed
   form, so that ONE definition serves both laws and the comparison between
   them is honest: the fraction of the period on which the cut is within a
   tenth of its minimum (the crest band) and within a tenth of its maximum
   (the sinus band). Reproduces the retired law's own closed forms to three
   decimals — 0.064 / 0.287, 0.205 / 0.205, 0.380 / 0.145. */
const BAND_N = 200000;
function bandsOf(cut) {
  let crest = 0, sinus = 0;
  for (let i = 0; i < BAND_N; i++) { const v = cut((i + 0.5) / BAND_N); if (v <= 0.1) crest++; if (v >= 0.9) sinus++; }
  return { crest: crest / BAND_N, sinus: sinus / BAND_N };
}
/* THE LOCAL POWER at each feature, by log-log slope at a scale that neither
   underflows nor leaves the asymptotic regime. It is MEASURED rather than
   taken from the control, so this tool says what the law does rather than
   what it was asked for. */
function powersOf(cut) {
  const d = 1e-4;
  return { crest: Math.log(cut(2 * d) / cut(d)) / Math.log(2),
           notch: Math.log((1 - cut(0.5 - 2 * d)) / (1 - cut(0.5 - d))) / Math.log(2) };
}
/* The ladder's measure over one period: turning of the outline in the (s, h)
   plane plus LADDER_ARC_SHARE of arc length, cumulative; stations at equal
   increments, the period's ends (crests) held. The constants are read from
   the geometry, not restated. */
function ladderStations(law, n) {
  const tangent = (f) => { const e = 1e-6; return Math.atan2(law(f + e) - law(f - e), 2 * e * PITCH); };
  const S = 4000, dT = [], dA = [];
  let turn = 0, arc = 0, pT = tangent(1e-9), pX = 0, pY = law(0);
  for (let i = 1; i <= S; i++) {
    const f = i / S, t = tangent(f), x = f * PITCH, y = law(f);
    let d = Math.abs(t - pT); if (d > Math.PI) d = 2 * Math.PI - d;
    const sg = Math.hypot(x - pX, y - pY);
    dT.push(d); dA.push(sg); turn += d; arc += sg; pT = t; pX = x; pY = y;
  }
  const beta = (G.LADDER_ARC_SHARE / (1 - G.LADDER_ARC_SHARE)) * turn;
  const cum = [0];
  for (let i = 0; i < S; i++) cum.push(cum[i] + dT[i] + beta * (dA[i] / arc));
  const total = cum[S], out = [0];
  for (let j = 1; j < n; j++) {
    const target = total * j / n; let lo = 0, hi = S;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m; else hi = m; }
    out.push(hi / S);
  }
  out.push(1); return out;
}
const uniformStations = (n) => Array.from({ length: n + 1 }, (_, j) => j / n);
const PLACERS = { ladder: ladderStations, uniform: (law, n) => uniformStations(n) };

/* CLAUSE (i) — the band's width over the widest gap it meets, ON THE CIRCLE.
   The period is a circle, so the gaps TILE it and sum to 1 and the crest
   band is simply the arc about 0. The shipped form read the gaps linearly
   and did not require them to cover the band, so two coincident stations
   left ONE gap of ~0 overlapping it and the ratio blew up — the clause
   passed on PILING. Identical answers wherever the old form's gaps tiled. */
function bandOverWidestGap(width, which, st) {
  const pts = st.map(wrap).sort((x, y) => x - y), gaps = [];
  for (let i = 1; i < pts.length; i++) gaps.push([pts[i - 1], pts[i]]);
  gaps.push([pts[pts.length - 1], pts[0] + 1]);
  const c = which === 'crest' ? 1 : 0.5, half = width / 2;
  let widest = 0;
  for (const [a, z] of gaps) for (const sh of [-1, 0, 1]) {
    if (z + sh >= c - half && a + sh <= c + half) widest = Math.max(widest, z - a);
  }
  return widest > 0 ? width / widest : 0;
}
/* CLAUSE (iii) — the drawn amplitude at the WORST phase. A piecewise-linear
   function's extrema are at its breakpoints, so the drawn amplitude over one
   period IS the spread of the law over the stations: no dense sampling is
   needed and the answer is exact. */
const PHASES = 200;
function worstPhaseAmp(cut, n) {
  const law = lawOf(cut);
  let worst = Infinity;
  for (let k = 0; k < PHASES; k++) {
    const phi = k / PHASES / n;
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j <= n; j++) { const v = law(phi + j / n); if (v < lo) lo = v; if (v > hi) hi = v; }
    worst = Math.min(worst, (hi - lo) / RELIEF);
  }
  return worst;
}
const N_MAX = 24;
/* THE DEMAND for one shape: the smallest n at which the BINDING feature's
   band spans `2 x roundness` station gaps AND the drawn tooth keeps half its
   amplitude at every phase. Floored at 2 (a period needs a crest and a
   sinus) and REPORTED against the ruled ceiling rather than clamped to it. */
function demandOf(cut, placer = 'ladder') {
  const law = lawOf(cut), B = bandsOf(cut), P = powersOf(cut);
  const wt = (pw) => Math.min(1, Math.max(0, pw - 1));
  const binding = B.crest >= B.sinus
    ? { which: 'crest', width: B.crest, power: P.crest }
    : { which: 'sinus', width: B.sinus, power: P.notch };
  binding.weight = wt(binding.power);
  const bar = 2 * binding.weight;
  let nI = 2, nIII = 2;
  for (let n = 2; n <= N_MAX; n++) { if (bandOverWidestGap(binding.width, binding.which, PLACERS[placer](law, n)) >= bar) { nI = n; break; } nI = null; }
  for (let n = 2; n <= N_MAX; n++) { if (worstPhaseAmp(cut, n) >= 0.5) { nIII = n; break; } nIII = null; }
  const n = Math.max(nI ?? N_MAX, nIII ?? N_MAX, 2);
  return { n, clauseI: nI, clauseIII: nIII, bar, binding, bands: B, powers: P };
}

/* ---- the shape grid the table covers: the control's own steps ---------- */
const [SLO, SHI] = G.LOBE_SHAPE_RANGE, STEP = G.LOBE_SHAPE_STEP;
const NSTEP = Math.round((SHI - SLO) / STEP) + 1;
const axis = Array.from({ length: NSTEP }, (_, i) => +(SLO + i * STEP).toFixed(10));
const tableRow = (crest) => axis.map((notch) => demandOf(newCut(crest, notch)).n.toString(36)).join('');

/* ---- the calibration: the retired family, whose floors are ruled ------- */
const RULED = { 0.5: { ladder: 10, uniform: 7 }, 1: { ladder: 11, uniform: 10 }, 2: { ladder: 8, uniform: 6 } };
function calibrate() {
  const rows = [];
  for (const q of [0.5, 1, 2]) {
    const cut = retiredCut(q);
    const L = demandOf(cut, 'ladder'), U = demandOf(cut, 'uniform');
    rows.push({ q, ladder: L, uniform: U, ok: L.n === RULED[q].ladder && U.n === RULED[q].uniform });
  }
  return rows;
}

const MODE = process.argv.includes('--table') ? 'table'
  : process.argv.includes('--verify') ? 'verify'
  : process.argv.includes('--surface') ? 'surface'
  : process.argv.includes('--calibrate') ? 'calibrate' : 'default';

if (MODE === 'table' || MODE === 'verify') {
  const rows = axis.map((c) => tableRow(c));
  if (MODE === 'table') {
    console.log(`/* DERIVED — do not edit by hand. Regenerate with:`);
    console.log(` *   node tools/bloom-lobe-resolution.mjs --table`);
    console.log(` * ${NSTEP} x ${NSTEP} cells over [${SLO}, ${SHI}] at a step of ${STEP}: row = the CREST`);
    console.log(` * exponent, column = the NOTCH exponent, the cell the demand in base 36.`);
    console.log(` * \`--verify\` re-derives every cell from the clauses and compares. */`);
    for (let i = 0; i < rows.length; i++) console.log(`  '${rows[i]}',${i === 0 ? '   // crest ' + SLO.toFixed(2) : i === rows.length - 1 ? '   // crest ' + SHI.toFixed(2) : ''}`);
  } else {
    const shipped = G.LOBE_DEMAND_ROWS;
    const bad = [];
    if (shipped.length !== rows.length) bad.push(`the shipped table has ${shipped.length} rows and the derivation ${rows.length}`);
    else for (let i = 0; i < rows.length; i++) {
      if (shipped[i] === rows[i]) continue;
      for (let j = 0; j < rows[i].length; j++) if (shipped[i][j] !== rows[i][j])
        bad.push(`crest ${axis[i].toFixed(2)} notch ${axis[j].toFixed(2)}: shipped ${parseInt(shipped[i][j], 36)}, derived ${parseInt(rows[i][j], 36)}`);
    }
    const cal = calibrate();
    for (const r of cal) if (!r.ok) bad.push(`CALIBRATION crest/notch-weighted clause does not reproduce the retired family at q ${r.q}: ladder ${r.ladder.n} (ruled ${RULED[r.q].ladder}), uniform ${r.uniform.n} (ruled ${RULED[r.q].uniform})`);
    let over = 0;
    for (const row of rows) for (const ch of row) if (parseInt(ch, 36) > G.LOBE_SAMPLES_PER_LOBE) over++;
    if (over) bad.push(`${over} cells exceed the ruled ceiling LOBE_SAMPLES_PER_LOBE = ${G.LOBE_SAMPLES_PER_LOBE}`);
    console.log(`--verify: ${rows.length} x ${rows[0].length} = ${rows.length * rows[0].length} cells re-derived from the clauses`);
    console.log(`  calibration on the RETIRED family (the ruled floors): ${cal.filter((r) => r.ok).length} of ${cal.length} reproduce`);
    for (const r of cal) console.log(`    q ${String(r.q).padEnd(4)} binding ${r.ladder.binding.which.padEnd(6)} band ${r.ladder.binding.width.toFixed(3)} power ${r.ladder.binding.power.toFixed(2)} weight ${r.ladder.binding.weight.toFixed(2)} bar ${r.ladder.bar.toFixed(2)} -> ladder ${r.ladder.n} (ruled ${RULED[r.q].ladder}), uniform ${r.uniform.n} (ruled ${RULED[r.q].uniform}) ${r.ok ? 'MATCH' : 'DIFFERS'}`);
    console.log(`  no cell above the ruled ceiling ${G.LOBE_SAMPLES_PER_LOBE}: ${over === 0 ? 'yes' : `NO — ${over} cells`}`);
    if (bad.length) { console.error(`\nFAIL — ${bad.length} finding(s):`); for (const b of bad.slice(0, 40)) console.error('  ' + b); process.exit(1); }
    console.log('\nPASS — the shipped table is the derivation, cell for cell.');
  }
} else if (MODE === 'surface') {
  const AX = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
  console.log(`THE DEMAND OVER THE SHAPE SQUARE — one period at depth ${DEPTH} on a ${HALF} mm half-width, pitch ${PITCH} mm, LADDER placement.`);
  console.log(`cells are demand (clause i / clause iii); the ruled ceiling is ${G.LOBE_SAMPLES_PER_LOBE}.\n`);
  console.log('  crest\\notch ' + AX.map((b) => String(b).padStart(10)).join(''));
  for (const a of AX) console.log('  ' + String(a).padEnd(11) + AX.map((b) => { const D = demandOf(newCut(a, b)); return `${D.n}(${D.clauseI ?? '>'}/${D.clauseIII ?? '>'})`.padStart(10); }).join(''));
  console.log('\n  which feature binds, its band and its roundness weight:');
  console.log('  crest\\notch ' + AX.map((b) => String(b).padStart(14)).join(''));
  for (const a of AX) console.log('  ' + String(a).padEnd(11) + AX.map((b) => { const D = demandOf(newCut(a, b)); return `${D.binding.which[0].toUpperCase()} ${D.binding.width.toFixed(2)} w${D.binding.weight.toFixed(2)}`.padStart(14); }).join(''));
} else {
  const cal = calibrate();
  console.log(`one lobe period at depth ${DEPTH} on a ${HALF} mm half-width, pitch ${PITCH} mm; ladder = turning + ${G.LADDER_ARC_SHARE} arc share, ends on crests.`);
  console.log(`\nTHE CALIBRATION — the RETIRED one-exponent family, whose floors session 38 ruled on.`);
  console.log(`The weighted bar is 2 x clamp(power - 1, 0, 1), and the binding feature is parabolic or flatter at every`);
  console.log(`reachable value there, so the weight is 1 and the bar is EXACTLY session 38's "two station gaps".\n`);
  console.log(' q    | binding | band  | power | weight | bar  | clause(i) | clause(iii) | demand | ruled  | ');
  for (const r of cal) console.log(` ${String(r.q).padEnd(5)}| ${r.ladder.binding.which.padEnd(8)}| ${r.ladder.binding.width.toFixed(3)} | ${r.ladder.binding.power.toFixed(2)}  | ${r.ladder.binding.weight.toFixed(2)}   | ${r.ladder.bar.toFixed(2)} | ${String(r.ladder.clauseI).padStart(9)} | ${String(r.ladder.clauseIII).padStart(11)} | ${String(r.ladder.n).padStart(6)} | ${String(RULED[r.q].ladder).padStart(6)} | ${r.ok ? 'MATCH' : 'DIFFERS'}`);
  console.log(`\n${cal.filter((r) => r.ok).length} of ${cal.length} reproduce the ruled ladder floor AND the ruled uniform floor (7 / 10 / 6).`);
  console.log(`Clause (iii) is SLACK on the whole retired family (${cal.map((r) => r.ladder.clauseIII).join(' / ')} against clause (i)'s ${cal.map((r) => r.ladder.clauseI).join(' / ')}),`);
  console.log(`so session 38's ruled constant ${G.LOBE_SAMPLES_PER_LOBE} is untouched by the new clause.`);
  console.log(`\nTHE SHIPPED LAW's own surface: --surface for a readable grid, --table to regenerate`);
  console.log(`bloom-geometry.js's LOBE_DEMAND_ROWS, --verify to prove the shipped table is this derivation.`);
}
