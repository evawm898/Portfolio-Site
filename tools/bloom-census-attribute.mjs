/* ===================================================================
   bloom-census-attribute.mjs — WHERE ON THE PETAL DOES A DECLARED
   SELF-INTERSECTION SIT?

   WHY THIS EXISTS. `SELF_INTERSECTION_XFAIL` records a COUNT and a WORST
   SPAN per row, and #213's own doc says a record that stops reproducing is
   a finding for whatever moved it. What neither the record nor the gate can
   say is WHERE the pairs are, so a session that moves 153 magnitudes can
   report that they moved and not why. This answers the where: every
   within-shell pair the census collects is carried back to the nearest point
   of the BUILDER'S OWN captured mid-surface, and reported by the region of
   the blade it lands in.

   THE REGIONS, in the DRAWN parameterisation (the one the captured rows
   carry), read off each petal's own `tipCap.apex` rather than restated:
     foot        u  = 0          the three junction rows
     root blend  u <  ROOT_BLEND_END
     blade       u <  xLawMm / drawnLength
     nib         u >= xLawMm / drawnLength      (absent where the nib is inert)
   The nib boundary is the LAW's own crossing expressed as a drawn station,
   which is what makes "on the nib" a statement about the outline rather than
   about a row index.

   MODE AND SAMPLING, named because the durable rule asks: EXPORT mode, on
   the builder's own doubles (the gate's X0 path), 56 x 10 per panel at
   NU 56. A pair count is a property of the tessellation.

   WHAT IT IS BLIND TO, declared rather than discovered. It reports; it
   asserts nothing, so it is an instrument and not a gate — X1 owns the
   magnitudes and X2 owns the undeclared rows. The carry-back is a NEAREST
   POINT over the captured lattice, so a site equidistant from two regions
   is attributed to whichever vertex is nearer and the distance is printed
   beside it (a site on an emitted skin sits ~t/2 from the mid-surface by
   construction, so a distance of about half a sheet is the healthy reading
   and anything much larger means the site is not on a petal at all — a hub,
   a stem, a stamen — which is reported as `off-lamina`).

   RUN:
     node tools/bloom-census-attribute.mjs --only <regex>
     node tools/bloom-census-attribute.mjs --only <regex> --root <tree>
     node tools/bloom-census-attribute.mjs --only <regex> --json
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const ROOT = arg('--root') ? path.resolve(arg('--root')) : HERE;
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const JSON_OUT = argv.includes('--json');
const CHECK_INDEX = argv.includes('--check-index');
if (!ONLY) { console.error('--only <regex> is required: this tool censuses whole rows and is minutes each.'); process.exit(2); }

const load = (root, f) => import(pathToFileURL(path.join(root, f)).href);
const [H, SI] = await Promise.all([load(HERE, 'tools/bloom-harness.mjs'), load(HERE, 'tools/bloom-self-intersection.mjs')]);
const [G, R] = await Promise.all([load(ROOT, 'bloom-geometry.js'), load(ROOT, 'bloom-registry.js')]);
if (ROOT !== HERE) {
  const a = fs.readFileSync(path.join(HERE, 'bloom-geometry.js')), b = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'));
  console.log(`geometry from ${ROOT} — bloom-geometry.js ${a.equals(b) ? 'IDENTICAL to this tree\'s' : 'DIFFERS from this tree\'s'}`);
}

const kindOf = new Map(H.CONTROLS.map((c) => [c.id, c]));
const stateOf = (row) => {
  const s = { ...R.DEFAULTS };
  for (const w of row.set || []) {
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : c.kind === 'check' ? (w.value === true || w.value === 'true') : w.value;
  }
  return s;
};

/* THE CARRY-BACK. Every captured mid-surface point of every BUILT petal and
   sepal, with the station and the margin coordinate it was evaluated at, in
   one flat array so a site costs one linear scan. A slot that was declared
   and not built contributes nothing and is counted, which is this project's
   own slot-omission rule applied to an instrument keyed on a slot index. */
function laminaPoints(built) {
  const pts = [];
  let omitted = 0;
  const take = (p, kind, idx) => {
    if (!p) { omitted++; return; }
    if (!p.lamina) return;
    const ap = (p.tipCap && p.tipCap.apex) || null;
    const nibU = ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : null;
    for (let q = 0; q < p.lamina.length; q++) {
      const panel = p.lamina[q];
      for (const row of panel.rows) {
        const C = row.mid.length;
        for (let j = 0; j < C; j++) {
          const P = row.mid[j];
          pts.push({ x: P[0], y: P[1], z: P[2], u: row.u, v: C > 1 ? -1 + (2 * j) / (C - 1) : 0, kind, idx, panel: q, nibU });
        }
      }
    }
  };
  (built.petalsAll || []).forEach((p, i) => take(p, 'petal', i));
  ((built.sepals && built.sepals.built) || []).forEach((p, i) => take(p, 'sepal', i));
  return { pts, omitted };
}

const regionOf = (pt) => {
  if (pt.u <= 0) return 'foot';
  if (pt.u < G.ROOT_BLEND_END) return 'root blend';
  if (pt.nibU !== null && pt.u >= pt.nibU) return 'NIB';
  return 'blade';
};

const matrix = H.buildMatrix();
const rows = matrix.filter((r) => ONLY.test(r.label));
if (!rows.length) { console.error('no matrix row matched'); process.exit(2); }
const report = [];

for (const row of rows) {
  const t0 = Date.now();
  const acc = new G.MeshBuilder({ exportMode: true, captureLamina: true });
  const built = G.buildBloomInto(acc, stateOf(row), { below: null, capability: row.capability || null });
  const pos = new Float64Array(acc.positions);
  const r = SI.census(pos, { collect: true });
  const { pts, omitted } = laminaPoints(built);

  /* THE NEAREST CAPTURED MID-SURFACE POINT TO A SITE, AND HOW FAR IT IS.
     A uniform bucket grid over the lattice, widened one ring at a time until
     the best distance found is inside the searched radius — so the answer is
     the SAME nearest point a linear scan would give, never the nearest within
     one cell. On `ALL PETALS: max x petalCount 40` a linear scan is 40,080
     sites against 22,400 points and takes minutes; this takes seconds and is
     checked against the linear answer by `--check-index`. */
  const CELL = 2.0;
  const bk = new Map();
  const key = (a, b, c) => a + ',' + b + ',' + c;
  const cellOf = (x) => Math.floor(x / CELL);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], k = key(cellOf(p.x), cellOf(p.y), cellOf(p.z));
    const L = bk.get(k); if (L) L.push(i); else bk.set(k, [i]);
  }
  const nearestLinear = (at) => {
    let best = null, bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const d = (p.x - at[0]) ** 2 + (p.y - at[1]) ** 2 + (p.z - at[2]) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return { p: best, mm: Math.sqrt(bd) };
  };
  const nearest = (at) => {
    const cx = cellOf(at[0]), cy = cellOf(at[1]), cz = cellOf(at[2]);
    let best = null, bd = Infinity;
    for (let ring = 0; ring < 64; ring++) {
      for (let a = -ring; a <= ring; a++) for (let b = -ring; b <= ring; b++) for (let c = -ring; c <= ring; c++) {
        if (ring > 0 && Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== ring) continue;
        const L = bk.get(key(cx + a, cy + b, cz + c)); if (!L) continue;
        for (const i of L) {
          const p = pts[i];
          const d = (p.x - at[0]) ** 2 + (p.y - at[1]) ** 2 + (p.z - at[2]) ** 2;
          if (d < bd) { bd = d; best = p; }
        }
      }
      /* every point outside the searched box is at least `ring * CELL` away */
      if (best && Math.sqrt(bd) <= ring * CELL) break;
    }
    return { p: best, mm: best ? Math.sqrt(bd) : Infinity };
  };
  if (CHECK_INDEX) {
    let worstDelta = 0, n = 0;
    for (const s of r.sites.slice(0, 200)) {
      const a = nearest(s.at), b2 = nearestLinear(s.at); n++;
      worstDelta = Math.max(worstDelta, Math.abs(a.mm - b2.mm));
    }
    console.log(`  index check: ${n} sites, worst |indexed - linear| = ${worstDelta.toExponential(2)} mm (must be 0)`);
  }

  const sheet = Number(stateOf(row).sheetThickness) || 0;
  const offBar = Math.max(1.5, 3 * Math.max(sheet, 1));   /* a site on a skin sits ~t/2 out; 3x a floored sheet is generous */
  const hist = new Map();
  const bump = (k, span) => { const e = hist.get(k) || { n: 0, worst: 0 }; e.n++; if (span > e.worst) e.worst = span; hist.set(k, e); };
  let offLamina = 0;
  for (const s of r.sites) {
    const { p, mm } = nearest(s.at);
    if (!p || mm > offBar) { offLamina++; bump('off-lamina', s.span); continue; }
    bump(regionOf(p), s.span);
  }
  const w = r.worstAt ? nearest(r.worstAt) : null;
  const firstNib = pts.find((p) => p.nibU !== null);

  const rec = {
    label: row.label, tris: pos.length / 9, within: r.within, cross: r.cross,
    worstSpanMm: r.worstSpanMm,
    worst: w && w.p ? { region: w.mm > offBar ? 'off-lamina' : regionOf(w.p), u: w.p.u, v: w.p.v, kind: w.p.kind, idx: w.p.idx, panel: w.p.panel, offMm: w.mm } : null,
    nibU: firstNib ? firstNib.nibU : null,
    omittedSlots: omitted, offLamina,
    regions: [...hist.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => ({ region: k, pairs: e.n, worstMm: e.worst })),
    ms: Date.now() - t0,
  };
  report.push(rec);
  if (!JSON_OUT) {
    console.log(`\n${row.label}`);
    console.log(`  ${rec.within} within-shell pairs · worst ${rec.worstSpanMm.toFixed(4)} mm · ${rec.tris.toLocaleString('en-US')} tris · ${rec.ms} ms`
      + (rec.nibU !== null ? `   nib begins at drawn u ${rec.nibU.toFixed(4)}` : '   no nib on this row'));
    if (rec.worst) console.log(`  worst pair sits in the ${rec.worst.region} of ${rec.worst.kind} ${rec.worst.idx} panel ${rec.worst.panel}, at u ${rec.worst.u.toFixed(4)} v ${rec.worst.v.toFixed(3)} (${rec.worst.offMm.toFixed(3)} mm off the mid-surface)`);
    for (const g of rec.regions) console.log(`    ${String(g.pairs).padStart(7)} pairs   worst ${g.worstMm.toFixed(4)} mm   ${g.region}`);
  }
}
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
