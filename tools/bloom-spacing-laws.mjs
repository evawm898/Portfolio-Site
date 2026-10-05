#!/usr/bin/env node
/* Which quantity a per-slot SPACING field may act on (organic variance, build
   3). No geometry: the slot azimuths of one RADIAL whorl under four candidate
   laws at the ruled maximum A = 0.9, with the SHIPPED wave (an integer
   frequency, cos(f theta + phi), the ring ramp at f = 0). Eva RULED law a
   (docs/bloom-organic-variance-spacing-law.md); the other three are kept as the
   record of why.

     a   THE PITCH LAW (ruled, shipped). The varied quantity is the local pitch
         density in units of the amount-0 pitch, rho = 1 + A g, and the azimuths
         are its integral: F(theta) = theta + (A/f) sin(f theta + phi). The
         pitch stays positive for every A < 1, so F is strictly monotonic and
         nothing can cross or coincide — the law never binds, as a PROPERTY.
     b1  A DIRECT OFFSET, each slot moved by A g times the base gap to its
         neighbour's BASE position. Not circular, and unsafe: neighbours meet
         from A 0.5 and cross beyond it.
     b2  A DIRECT OFFSET confined to the slot's own nominal sector (half the
         gap). Safe, and a weaker, different look from the one ruled on.
     c   A DIRECT OFFSET scaled by the gap to the neighbour AS MOVED — a fixed
         point. Resolving it in slot order is one concrete answer; the column
         says how far the answer moves when the order is reversed.

   (These were first framed as candidate meanings of "headroom". That framing
   was wrong and is withdrawn: headroom is FORM's fix for a delta driving a
   BOUNDED control into its range end. Size is a plain factor with no bound,
   spacing a pitch that only has to stay positive — three amounts, two shapes.)

   `node tools/bloom-spacing-laws.mjs` prints the table and a dense sweep of
   law a (n 3..40, f 0..20, phase 0..355 step 5). */
const TAU = 2 * Math.PI;
const wrap = (x) => ((x % TAU) + TAU) % TAU;
const gFor = (f, phi) => (th) => (f === 0 ? -1 + (2 * wrap(th - phi)) / TAU : Math.cos(f * th + phi));
function tightest(az, n) {
  const s = az.map(wrap).sort((x, y) => x - y);
  let m = Infinity;
  for (let i = 0; i < s.length; i++) m = Math.min(m, wrap(s[(i + 1) % s.length] - s[i]) || (s.length === 1 ? TAU : 0));
  return m / (TAU / n);
}
function orderKept(az) {
  const n = az.length;
  const idx = [...az.keys()].sort((i, j) => wrap(az[i]) - wrap(az[j]));
  const k = idx.indexOf(0);
  for (let t = 0; t < n; t++) if (idx[(k + t) % n] !== t) return false;
  return true;
}
const D = (w) => -w + (w * w) / TAU; // integral of the ramp's g over [0, w); D(TAU) = 0
function lawA(n, A, f, phi) {
  const p = TAU / n;
  return [...Array(n)].map((_, i) => {
    const t = i * p;
    if (f === 0) return t + A * (D(wrap(t - phi)) - D(wrap(-phi)));
    return t + (A / f) * (Math.sin(f * t + phi) - Math.sin(phi));
  });
}
const lawB1 = (n, A, f, phi) => { const p = TAU / n, g = gFor(f, phi); return [...Array(n)].map((_, i) => i * p + A * g(i * p) * p); };
const lawB2 = (n, A, f, phi) => { const p = TAU / n, g = gFor(f, phi); return [...Array(n)].map((_, i) => i * p + (A * g(i * p) * p) / 2); };
function lawC(n, A, f, phi, order) {
  const p = TAU / n, g = gFor(f, phi);
  const az = [...Array(n)].map((_, i) => i * p);
  for (const i of order) {
    const want = A * g(i * p);
    const nxt = az[(i + 1) % n] + ((i + 1) % n === 0 ? TAU : 0);
    const prv = az[(i - 1 + n) % n] - (i === 0 ? TAU : 0);
    az[i] += want * (want >= 0 ? nxt - az[i] : az[i] - prv);
  }
  return az;
}
const A = 0.9;
const rows = [];
for (const n of [8, 40]) for (const f of [0, 1, 3, Math.floor(n / 2) + 1]) for (const phiDeg of [0, 90]) {
  const phi = (phiDeg * Math.PI) / 180;
  const r = { n, f, phase: phiDeg };
  for (const [k, L] of [['a pitch', lawA], ['b1 offset/gap', lawB1], ['b2 offset/sector', lawB2]]) {
    const az = L(n, A, f, phi);
    r[k] = tightest(az, n).toFixed(3) + (orderKept(az) ? '' : ' CROSSED');
  }
  const fw = [...Array(n).keys()], bw = [...fw].reverse();
  const c1 = lawC(n, A, f, phi, fw), c2 = lawC(n, A, f, phi, bw);
  r['c moved-neighbour'] = tightest(c1, n).toFixed(3) + (orderKept(c1) ? '' : ' CROSSED');
  r['c: reversing the order moves a petal (deg)'] = Math.max(...c1.map((v, i) => Math.abs(v - c2[i]))) * 180 / Math.PI;
  rows.push(r);
}
console.log('tightest pitch / nominal at A = 0.9 (CROSSED = two petals swapped order round the axis)');
console.table(rows);
let worst = Infinity, at = null, crossed = 0;
for (let n = 3; n <= 40; n++) for (let f = 0; f <= 20; f++) for (let ph = 0; ph < 360; ph += 5) {
  const az = lawA(n, A, f, (ph * Math.PI) / 180);
  if (!orderKept(az)) crossed++;
  const m = tightest(az, n);
  if (m < worst) { worst = m; at = { n, f, ph }; }
}
console.log(`law a over n 3..40 x f 0..20 x phase 0..355: tightest ${worst.toFixed(4)} of nominal at ${JSON.stringify(at)}, ${crossed} states crossed; bound (1 - A) = ${(1 - A).toFixed(4)}`);
