/* ===================================================================
   bloom-lobe-resolution.mjs — THE SAMPLES-PER-LOBE FLOOR, derived.

     node tools/bloom-lobe-resolution.mjs [--json]

   THE QUESTION (Eva, session 38, the ruling amendment): how many stations
   per lobe period does the emitted polyline need before LOBE TIP SHAPE is
   distinguishable across its range — before 0.50 (pointed), 1.00 (the raised
   cosine) and 2.00 (flat-topped) stop being the same triangle wave? Four
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

/* THE SHAPE SET. The shipped range's ends and its middle by default; `--q`
   takes any comma list so the floor can be read AS A FUNCTION OF THE SHAPE
   (session 40, item 3) rather than only as the set-wide number. Clause (i)
   is per-shape and is reported per shape; clause (ii) is a statement about
   the SET and needs at least two members. */
const qArg = process.argv.find((a) => a.startsWith('--q='));
const Q = qArg ? qArg.slice(4).split(',').map(Number) : [0.5, 1, 2];
if (Q.some((q) => !(q > 0))) throw new Error(`--q: every exponent must be > 0, got ${Q.join(',')}`);
const DEPTH = 0.30, HALF = 5.4, PITCH = 2.38;          // the sheet's default cell, in mm
const law = (q) => (f) => HALF * (1 - DEPTH * Math.pow((1 - Math.cos(2 * Math.PI * f)) / 2, q));
const DENSE = 4000;

/* The ladder's measure over one period: turning of the outline (in the
   (s, h) plane, s = f * PITCH) plus the arc share, cumulative; stations at
   equal increments, the period's ends (crests) held. */
function ladderStations(q, n) {
  const h = law(q);
  const tangent = (f) => { const e = 1e-6; return Math.atan2(h(f + e) - h(f - e), 2 * e * PITCH); };
  const S = 4000, dT = [], dA = [];
  let turn = 0, arc = 0, pT = tangent(1e-9), pX = 0, pY = h(0);
  for (let i = 1; i <= S; i++) {
    const f = i / S, t = tangent(f), x = f * PITCH, y = h(f);
    let d = Math.abs(t - pT); if (d > Math.PI) d = 2 * Math.PI - d;
    const s = Math.hypot(x - pX, y - pY);
    dT.push(d); dA.push(s); turn += d; arc += s; pT = t; pX = x; pY = y;
  }
  const beta = (G.LADDER_ARC_SHARE / (1 - G.LADDER_ARC_SHARE)) * turn;
  const cum = [0];
  for (let i = 0; i < S; i++) cum.push(cum[i] + dT[i] + beta * (dA[i] / arc));
  const total = cum[S];
  const out = [0];
  for (let j = 1; j < n; j++) {
    const target = total * j / n;
    let lo = 0, hi = S;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m; else hi = m; }
    out.push(hi / S);
  }
  out.push(1);
  return out;
}
const uniformStations = (n) => Array.from({ length: n + 1 }, (_, j) => j / n);
const polyline = (q, st) => { const h = law(q); const pts = st.map((f) => [f * PITCH, h(f)]); return (f) => { const x = f * PITCH; let k = 1; while (k < pts.length - 1 && pts[k][0] < x) k++; const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); }; };
const maxOver = (fn) => { let m = 0; for (let i = 0; i <= DENSE; i++) m = Math.max(m, Math.abs(fn(i / DENSE))); return m; };

/* The bands, from the law: cut(f) = ((1 - cos 2 pi f)/2)^q = sin(pi f)^(2q).
   Crest band: cut <= 0.1  ->  |f| <= asin(0.1^(1/2q)) / pi, width twice that.
   Sinus band: cut >= 0.9  ->  |f - 1/2| <= 1/2 - asin(0.9^(1/2q)) / pi. */
const bands = Object.fromEntries(Q.map((q) => {
  const crest = 2 * Math.asin(Math.pow(0.1, 1 / (2 * q))) / Math.PI;
  const sinus = 1 - 2 * Math.asin(Math.pow(0.9, 1 / (2 * q))) / Math.PI;
  return [q, { crest, sinus, broad: crest >= sinus ? 'crest' : 'sinus', broadWidth: Math.max(crest, sinus) }];
}));
/* The band's width over the widest gap it meets: the gaps between consecutive
   stations that lie in the band, plus the two gaps that bracket it. The crest
   band wraps the period's ends (crests), so it is read in the shifted phase
   f' = f + 1/2 where the crest sits at 1/2 like the sinus does. */
const gapsPerBroad = (q, st) => {
  const b = bands[q];
  const c = 0.5, half = b.broadWidth / 2;
  const ph = b.broad === 'crest' ? st.map((f) => (f + 0.5) % 1).sort((x, y) => x - y) : st.slice();
  const pts = [...new Set(ph)];
  let widest = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], z = pts[i];
    if (z >= c - half && a <= c + half) widest = Math.max(widest, z - a);   // the gap overlaps the band
  }
  return widest > 0 ? b.broadWidth / widest : 0;
};
/* Every unordered pair of the set — was the three of the shipped triple. */
const pairs = [];
for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) pairs.push([Q[i], Q[j]]);
const trueSep = Object.fromEntries(pairs.map(([a, b]) => [`${a}-${b}`, maxOver((f) => law(a)(f) - law(b)(f))]));
const table = [];
let floorLadder = null, floorUniform = null;
for (let n = 3; n <= 14; n++) {
  const row = { n };
  for (const [name, place] of [['ladder', ladderStations], ['uniform', (q, n) => uniformStations(n)]]) {
    const ST = Object.fromEntries(Q.map((q) => [q, place(q, n)]));
    const P = Object.fromEntries(Q.map((q) => [q, polyline(q, ST[q])]));
    const E = Object.fromEntries(Q.map((q) => [q, maxOver((f) => P[q](f) - law(q)(f))]));
    const D = Object.fromEntries(pairs.map(([a, b]) => [`${a}-${b}`, maxOver((f) => P[a](f) - P[b](f))]));
    const inBroad = Object.fromEntries(Q.map((q) => [q, gapsPerBroad(q, ST[q])]));
    const drawn = Q.every((q) => inBroad[q] >= 2);
    const separated = pairs.every(([a, b]) => D[`${a}-${b}`] > Math.max(E[a], E[b]) && D[`${a}-${b}`] >= 0.5 * trueSep[`${a}-${b}`]);
    const pass = drawn && separated;
    row[name] = { E, D, inBroad, drawn, separated, pass };
    if (pass && name === 'ladder' && floorLadder === null) floorLadder = n;
    if (pass && name === 'uniform' && floorUniform === null) floorUniform = n;
  }
  table.push(row);
}
/* THE PER-SHAPE FLOOR — clause (i) alone, which is the only per-shape clause
   there is: the smallest n at which THIS shape's own broad band spans two
   station gaps. The set-wide floor above is the largest of these AND clause
   (ii); reported separately so "the floor is a function of sharpness" is a
   number rather than an inference. */
const floorPerQ = Object.fromEntries(Q.map((q) => {
  const row = table.find((r) => r.ladder.inBroad[q] >= 2);
  const rowU = table.find((r) => r.uniform.inBroad[q] >= 2);
  return [q, { ladder: row ? row.n : null, uniform: rowU ? rowU.n : null }];
}));
const out = { model: { depth: DEPTH, halfMm: HALF, pitchMm: PITCH, arcShare: G.LADDER_ARC_SHARE }, bands, trueSepMm: trueSep, floor: { ladder: floorLadder, uniform: floorUniform }, floorPerQ, table };
if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); }
else {
  console.log(`one lobe period of cut(f) = ((1 - cos 2 pi f)/2)^q at depth ${DEPTH} on a ${HALF} mm half-width, pitch ${PITCH} mm; ladder = turning + ${G.LADDER_ARC_SHARE} arc share, ends on crests; dense phase ${DENSE}`);
  console.log(`true separation of the laws (mm): ${pairs.map(([a, b]) => `${a} vs ${b}: ${trueSep[`${a}-${b}`].toFixed(3)}`).join(' · ')}`);
  console.log(`bands (fraction of the period): ${Q.map((q) => `q ${q}: crest ${bands[q].crest.toFixed(3)}, sinus ${bands[q].sinus.toFixed(3)} -> broad ${bands[q].broad} ${bands[q].broadWidth.toFixed(3)}`).join(' · ')}`);
  /* THE COLUMN LABELS ARE DERIVED FROM THE SETS THEY LABEL. They were three
     literals matching the shipped triple; once `--q` made Q settable the
     literal would have named a different column from the one printed beside
     it (the pair list is now every unordered pair of Q, in Q's own order). */
  const qLab = Q.join(' / '), pLab = pairs.map(([a, b]) => `${a}-${b}`).join(' / ');
  console.log(`\n n | placement | broad feature / widest gap in it (${qLab}) | chord error E (${qLab}) | drawn separation D (${pLab}) | (i) drawn | (ii) separated`);
  for (const r of table) for (const name of ['ladder', 'uniform']) {
    const x = r[name];
    console.log(`${String(r.n).padStart(2)} | ${name.padEnd(9)} | ${Q.map((q) => x.inBroad[q].toFixed(2).padStart(5)).join(' / ')} | ${Q.map((q) => x.E[q].toFixed(3)).join(' / ')} | ${pairs.map(([a, b]) => x.D[`${a}-${b}`].toFixed(3)).join(' / ')} | ${x.drawn ? 'yes' : 'no '} | ${x.separated ? 'yes' : 'no '}${x.pass ? '  PASS' : ''}`);
  }
  console.log(`\nPER-SHAPE FLOOR, clause (i) only (the smallest n at which this shape's own broad band spans two station gaps):`);
  for (const q of Q) console.log(`   q ${String(q).padEnd(5)} broad ${bands[q].broad.padEnd(5)} ${bands[q].broadWidth.toFixed(3)} of the period -> ladder ${String(floorPerQ[q].ladder).padStart(3)}, uniform ${String(floorPerQ[q].uniform).padStart(3)}`);
  console.log(`\nFLOOR: ${floorLadder} stations per lobe under the ladder's placement (uniform: ${floorUniform}) — the smallest n at which every tip shape's broad feature spans two station gaps AND every pair is drawn further apart than either drawing's chord error, keeping half its true separation.`);
}
