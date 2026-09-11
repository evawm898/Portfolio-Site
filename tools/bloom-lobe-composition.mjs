/* ===================================================================
   bloom-lobe-composition.mjs — LOBES OVER A FOLD: the same fold, or a new one?

     node tools/bloom-lobe-composition.mjs [--json]

   THE NAMED HAND CHECK the lobe session owes (session 38, PR 2): lobes x cup
   and lobes x buckle, plus every other block-29 row that puts a lobed cut
   over a deformation main already declares self-intersecting. The census
   (`tools/bloom-self-intersection.mjs`) is the VERDICT and it is a COUNT of
   triangle pairs — and a count is a property of the TESSELLATION: the lobed
   ladder places the same 56 rows differently (turning at every crest and
   sinus buys rows inside the window and takes them from above and below it),
   so the same fold sampled by different triangles reads a different number of
   pairs and a different worst span. A row that reads MORE pairs lobed than
   plain is therefore not evidence of a new fold, and a row that reads fewer
   is not evidence the lobes relieved one. What separates the two is WHERE the
   intersections are: this instrument builds each composition row twice — as
   the matrix runs it and with the lobes off, EXPORT mode, the builder's own
   doubles, the census's own intersection sites — and reports the one-sided
   nearest-site distance in both directions, with how many sites of each fall
   inside the lobes' own window (by the u of the nearest mid-surface point).
   A lobed row whose every site lies within the cut's own scale of a plain
   site is the plain row's fold re-tessellated; a site far from every plain
   site would be the lobes' own, and there is none on this tree (measured:
   0.70 mm at worst, on the quill, with the resolution demand in; 0.000 on
   the four rows whose pairs are the root blend's or the stigma's, which the
   cut never reaches; and two rows — cup 0.40, buckle 0.30 f 3 — whose plain
   contacts are sampling coincidences the lobed stations simply miss, 0 pairs).

   WHAT IT DOES NOT SAY, in its own header: the distance is REPORTED, never
   bounded. The cut moves the outline by up to depth x half-width at a sinus
   and the ladder moves every station above ROOT_BLEND_END, so a fold's
   tessellated sites legitimately shift by millimetres; a bar set from the
   numbers in hand would be a tolerance that happens to pass the data (the
   project's own rule). The gate's claim is X1's — every declared row still
   self-intersects — and the XFAIL entry carries both counts.

   VALIDITY. Every plain row here that the list declares by name must reproduce
   that entry's count and worst span EXACTLY (SELF_INTERSECTION_XFAIL): the cup,
   the curl, the roll, the dome and the buckle row. That is the anchor that the
   plain builds on this tree ARE the geometry the list was measured on, so the
   comparison is against a fixed base and not a moved one. NOTE that the list is
   no longer main's: the foot-to-blade seam session re-baselined it on its own
   merged tree, so this check is now "the plain rows agree with what THIS tree
   declares" rather than "the plain rows are main's";
   a mismatch aborts the run. The two hairline rows are named for what they
   are: cup 0.40's touches are span-0 contacts at the FORM-ONSET CREASE (the
   u = 0.30 tangent break PR 1 recorded), and every one sits BELOW the window,
   where the cut is the identity (L2); the buckle row's are at the tip, the
   class 'buckleAmp max (0.6)' declares.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const [G, R, H, SI] = await Promise.all([load('bloom-geometry.js'), load('bloom-registry.js'), load('tools/bloom-harness.mjs'), load('tools/bloom-self-intersection.mjs')]);
const { DEFAULTS } = R;
const { census } = SI;
const JSON_OUT = process.argv.includes('--json');

/* The rows, BY LABEL, read from the matrix itself so a relabelled or removed
   row is a loud failure here rather than a stale copy. Each names the plain
   row the list declares (or the class its plain build belongs to). */
const ROWS = [
  { label: 'LOBES: x cup 0.40 (the cup alone carries 2 span-0 touches at the form-onset crease; the lobed ladder lands 3 — a sampling coincidence of the stations against the crease, never a fold)', plainDeclared: null, note: 'span-0 touches at the form-onset crease on the cup alone; the lobed ladder lands three of its own, on other petals' },
  { label: 'LOBES: x cup 1.2 (over a fold declared on main — must not gain a new one)', plainDeclared: 'petalCup max (1.2)' },
  { label: 'LOBES: x buckle 0.30 f 3 (the buckle alone carries 8 hairline pairs at the tip; the lobed ladder\'s stations miss them — 0 pairs)', plainDeclared: 'BUCKLE: the default frequency at a strong amplitude (0.30 x, f 3)' },
  { label: 'LOBES: x roll 330 (over the quill, declared on main)', plainDeclared: 'petalRoll max (330)' },
  { label: 'LOBES: x curl 360 (over the fiddlehead, declared on main)', plainDeclared: 'petalSpineCurl max (360)' },
  { label: 'LOBES: x 3 whorls (the inner petals are short — the floor binds there first)', plainDeclared: null, note: 'the root blend at 3 layers' },
  { label: 'LOBES: x CONTINUOUS x 3 turns', plainDeclared: null, note: 'the root blend at 3 layers' },
  { label: 'LOBES: x the whole centre (stamens and a style under a lobed whorl)', plainDeclared: null, note: 'the stigma\'s 272' },
  { label: 'LOBES: x ZYGO 2 whorls x ALL INNER MAX (the cut is not role-differentiated)', plainDeclared: null, note: 'the inner whorl at cup 1.2 x curl 360' },
  { label: 'LOBES: x the domed hub (head rise 1.00)', plainDeclared: 'headRise max (1)' },
  { label: 'LOBES: ONE lobe by both caps (20 mm petal, sheet 2.40, coverage 0.40 — capacity 19 rows and a 4.2 mm window at a 2.40 mm floor)', plainDeclared: null, note: 'a 20 mm petal at a 2.40 mm sheet folds at the root blend with no lobe — no row on main names it' },
];

const matrix = H.buildMatrix();
const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
}
function build(state) {
  const acc = new G.MeshBuilder({ exportMode: true, captureGrid: true });
  const built = G.buildBloomInto(acc, state, {});
  const r = census(new Float64Array(acc.positions), { collect: true });
  const petals = built.petalsAll || built.petals;
  const uOf = (p) => { let best = Infinity, bu = NaN; for (const pt of petals) for (const pan of pt.grid) for (const row of pan.rows) for (let j = 0; j < row.v.length; j++) { const m = row.mid[j]; const d = (m[0]-p[0])**2 + (m[1]-p[1])**2 + (m[2]-p[2])**2; if (d < best) { best = d; bu = row.u; } } return bu; };
  return { within: r.within, worst: r.worstSpanMm, sites: (r.sites || []).map((s) => s.at), uOf, lobes: petals[0].lobes };
}
function nn(A, B) {
  if (!A.length || !B.length) return null;
  const d = new Float64Array(A.length);
  for (let i = 0; i < A.length; i++) { const a = A[i]; let best = Infinity; for (const b of B) { const q = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2; if (q < best) best = q; } d[i] = Math.sqrt(best); }
  const s = Array.from(d).sort((x, y) => x - y);
  return { max: s[s.length - 1], p95: s[Math.floor(0.95 * (s.length - 1))], median: s[Math.floor(s.length / 2)] };
}
const f = (x) => (x === null ? 'n/a (one side has no sites)' : `max ${x.max.toFixed(3)} · p95 ${x.p95.toFixed(3)} · median ${x.median.toFixed(3)} mm`);
const parseDeclared = (s) => { const m = /^(\d+) pairs, worst span ([\d.]+) mm/.exec(s); return m ? { within: +m[1], worst: +m[2] } : null; };

const invalid = [];
const out = [];
for (const spec of ROWS) {
  const row = matrix.find((r) => r.label === spec.label);
  if (!row) { invalid.push(`no matrix row labelled "${spec.label}"`); continue; }
  const st = stateOf(row);
  if (!(st.lobeDepth > 0)) { invalid.push(`${spec.label}: lobeDepth ${st.lobeDepth} — this row engages no lobes`); continue; }
  const lob = build(st);
  const { lobeDepth, lobeCount, lobeCoverage, lobeTipShape, ...plainState } = st;
  const plain = build(plainState);
  if (!lob.lobes) { invalid.push(`${spec.label}: the lobed build reports no lobe record`); continue; }
  if (plain.lobes) { invalid.push(`${spec.label}: the plain build reports a lobe record`); continue; }
  if (spec.plainDeclared) {
    const d = parseDeclared(H.SELF_INTERSECTION_XFAIL[spec.plainDeclared] || '');
    if (!d) invalid.push(`${spec.label}: this tree's SELF_INTERSECTION_XFAIL declares no row "${spec.plainDeclared}"`);
    else if (d.within !== plain.within || Math.abs(d.worst - plain.worst) > 5e-5) invalid.push(`${spec.label}: the plain build reads ${plain.within} pairs / ${plain.worst.toFixed(4)} mm where the list declares "${spec.plainDeclared}" at ${d.within} / ${d.worst.toFixed(4)} — the plain rows on this tree are NOT what the list declares, so nothing below has a baseline to compare against`);
  }
  const [u0, u1] = lob.lobes.windowU;
  const inWin = (b) => b.sites.filter((p) => { const u = b.uOf(p); return u > u0 && u < u1; }).length;
  const rec = { label: spec.label, plainDeclared: spec.plainDeclared, note: spec.note || null,
    lobed: { within: lob.within, worstMm: lob.worst, sites: lob.sites.length, inWindow: inWin(lob) },
    plain: { within: plain.within, worstMm: plain.worst, sites: plain.sites.length, inWindow: inWin(plain) },
    window: [u0, u1], lobedToPlain: nn(lob.sites, plain.sites), plainToLobed: nn(plain.sites, lob.sites) };
  out.push(rec);
  if (!JSON_OUT) {
    console.log(`\n${spec.label}`);
    console.log(`  EXPORT, the builder's doubles · lobed ${rec.lobed.within} pairs (worst ${rec.lobed.worstMm.toFixed(4)} mm) · plain ${rec.plain.within} (worst ${rec.plain.worstMm.toFixed(4)} mm)${spec.plainDeclared ? ` — the list declares "${spec.plainDeclared}" at ${H.SELF_INTERSECTION_XFAIL[spec.plainDeclared]}` : spec.note ? ` — ${spec.note}` : ''}`);
    console.log(`  sites, lobed -> nearest plain: ${f(rec.lobedToPlain)}; plain -> nearest lobed: ${f(rec.plainToLobed)}`);
    console.log(`  inside the lobes' window (u ${u0.toFixed(3)}-${u1.toFixed(3)}): lobed ${rec.lobed.inWindow} of ${rec.lobed.sites}, plain ${rec.plain.inWindow} of ${rec.plain.sites}`);
  }
}
if (JSON_OUT) console.log(JSON.stringify({ rows: out, invalid }, null, 1));
if (invalid.length) {
  console.error(`\nHARNESS INVALID — ${invalid.length} validity failure(s). No result above is trustworthy:`);
  for (const m of invalid) console.error('  ' + m);
  process.exit(2);
}
if (!JSON_OUT) console.log(`\n${out.length} composition rows measured on both sides; every plain row declared by name reproduced this tree's declared count and worst span exactly.`);
