/* ===================================================================
   bloom-crowding.mjs — FOOT CROWDING: how many petal feet are stacked on the
   most crowded point of the base. A FLAG, never a gate (Eva, Sep 3).

   WHY IT EXISTS. Eva ran, on the live page, 120 continuous petals (40 per
   turn, 3 turns) at spread 0.60 with the foot floored at 1.60 mm, and every
   foot landed inside 1.76 mm of radius: the feet fused into one mass at the
   base. Both STL gates were green and will stay green on that bloom — this is
   OVER-connection, not detachment, so it adds no boundary edge and splits no
   flood fill — and nothing this project owned reported it. It was found by a
   human looking at a render. This is the instrument that reports it.

   WHAT IT MEASURES — IN EXPORT MODE, from the exported geometry's own owner.
   Every foot is a rectangle footRing() already specifies: it lands on
   `ring.radius` at the azimuth the builder emitted for its slot, runs inward
   by `ring.overhang`, and is `ring.width` across. The base plane is
   rasterised and each cell counts the foot rectangles that contain it:

     D_max   the STACK DEPTH at the worst point — how many feet lie on the
             most crowded point of the base. The headline number, an integer.
     D_mean  the sum of every foot's plan area divided by the area of their
             UNION — the average depth over the ground the feet actually
             occupy. The companion: smooth where D_max steps.

   THE EXPORT IS THE ARTEFACT, AND IT DIFFERS FROM THE LIVE RENDER. footRing's
   area rule reads the thickness the solids are actually built at, so the
   export floor moves the ring radius: on Eva's run the ring is 3.63 mm live
   and 4.69 mm printed (+29%), and the reading is D_max 17 live against 11 in
   the export. Every number this module reports is the EXPORT's, and the live
   value is printed beside it only when the two differ, on the print-truth
   line's discipline. A picture on a contact sheet is the LIVE render (the
   print-preview toggle is parked in the charter); its caption is the export
   number, and it says so.

   THE THRESHOLD IS EVA'S, AND IT CARRIES ONLY THE CLAIM. `CROWDED_DMAX` is
   11 (Eva, Sep 3): the only evidence is that every configuration she has
   ruled clean reads 5 or below and the one she ruled bad reads 11, so 6..10
   are UNRULED and print without a mark rather than being called CROWDED
   before she has looked at one. The number prints on every row regardless,
   so the printout carries the sensitivity. RE-DERIVE THIS CONSTANT WHEN THE
   DEPTH CAP IS RAISED: a depth of 6 adds rings at small radii, which lifts
   every reading, so an inherited threshold would be wrong in both directions.

   WHAT IT IS BLIND TO — read before quoting a clean reading:
     - BLADE-TO-BLADE CROWDING ABOVE THE ROOT. In the artefact the feet are
       not separately visible at all: each lies inside the hub disc, at the
       hub's own thickness, in the hub's own slab. What an eye sees fusing is
       the blade ROOTS leaving the ring — and the root's exit half-width IS
       `ring.width / 2` by construction (the first blade rows carry footHalf
       and rootBlend reads it), so foot stacking at the base is exactly
       root-exit stacking. Above that exit the blade widens to petalWidth,
       tilts by petalTilt + tiltExtra, and curls, and NONE of that moves this
       number. Short, wide blades at high tilt crowd above the base with a
       clean D_max. THAT IS A SECOND INSTRUMENT NOBODY HAS — RECORDED, NOT
       BUILT — and it is the one the mum work will need. A clean D_max is a
       clean BASE, never a clean bloom.
     - The hub itself. Feet inside the hub disc are counted; the disc is not
       a foot and is not.
     - Whether stacking is GOOD. Eva ruled spread below 1.00 reachable on
       purpose (Aug 31: the area rule is a reference, not a cage); a spider
       mum may want a fused base. That is why this flags and does not gate.

   NEIGHBOURS: NONE ARE CHOSEN, AND THAT IS THE JUSTIFICATION. The golden
   angle puts the tightest approaches at FIBONACCI index gaps, not adjacent
   ones: on Eva's run the closest pair of feet is slots 98 and 119 — gap 21 —
   at 0.385 mm centre distance, while index-adjacent slots are 137.5 deg
   apart, roughly twelve times further. A metric inspecting index-adjacent
   neighbours reads that bloom clean. The depth field is exhaustive over EVERY
   foot at EVERY cell, so an approach at any gap is counted whether or not
   anyone anticipated it. The all-pairs nearest-neighbour distance (centre to
   centre, in foot widths, with the index gap it fell on) is reported beside
   D_max as a diagnostic, and the index-adjacent figure is printed next to it
   so the blind reading is visible rather than argued.

   READING footRing(), NOT DUPLICATING IT. This module imports the app's own
   geometry module INSIDE THE PAGE (the same module instance the app built
   from) and calls buildBloomInto() with an export-mode accumulator, then
   reads `foot.slotRings[L][i]` (one descriptor per slot; `foot.rings[k]`
   under CONTINUOUS) and the builder's own `slotAzimuths`. No area rule, no
   clamp, no overhang law and no azimuth law is restated here. That the
   reading IS the exported geometry is asserted per row rather than trusted:
     R1  the in-page export build's triangle count equals the exported STL's
         header count — the geometry this read is the geometry that shipped;
     R2  the in-page live build equals the app's own liveTris and hub radius;
     R3  every foot the builder emitted has exactly one rectangle here
         (feet === petalsBuilt);
     R4  every emitted foot FRAME (three rows per descriptor's representative
         petal, all 120 under CONTINUOUS) lies exactly where the rectangle
         built from that descriptor's numbers puts it — J1's expected-from-
         owner check, pointed at this model;
     R5  the raster is CONVERGED: D_max is identical and D_mean within 0.5%
         at twice the cell. A depth reading that moves with the cell is a
         sampling artefact wearing a geometry costume (the flower's lesson),
         and it is refused rather than reported.
   This is also why it survives per-petal work for free: a per-petal
   descriptor still arrives through `slotRings`, and Z6 already asserts a
   role never differentiates the foot.

   Any R-failure is a VALIDITY failure — fatal for the run, never a row
   result — and CROWDED is never one. Both gates print `crowdingLine()` on
   every row and count the flagged rows; the flag is asserted in BOTH
   directions at matrix level (at least one row raises it and at least one
   does not), because a flag only ever checked absent is a flag that can be
   stuck off — the sub-8 spiral precedent.

   RUN (the numbers alone, no sheet):
         node tools/bloom-crowding.mjs            the four ruled configs + two
                                                  unruled ones, export mode
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, exportStl, analyzeStl } from './bloom-harness.mjs';

/* THE FLAG'S THRESHOLD — Eva, Sep 3. See the header: 5 and below is ruled
   clean, 11 is ruled bad, 6..10 are unruled and print unmarked. Re-derive
   when MAX_LAYERS (the depth cap) is raised. */
export const CROWDED_DMAX = 11;

export const CROWDING_SCOPE =
  'foot crowding reads footRing()\'s own export-mode rings and the builder\'s emitted azimuths, NOT the STL; it measures root-exit stacking at the base and is BLIND to blade-to-blade crowding above the root (recorded, not built); CROWDED is a FLAG at D_max >= ' + CROWDED_DMAX + ' (Eva, Sep 3), never a gate — over-connection adds no boundary edge and splits no flood fill, so both STL gates are green on a fused base';

/* ---------------------------------------------------------------------
   THE MEASUREMENT ITSELF, a pure function of the feet — exported so the
   convergence check, the shot tool and a positive control all run the same
   code, and so it can be exercised without a browser.

   `feet` is one record per foot: { radius, overhang, width, az, layer, slot,
   ring }. `R` is the hub radius, used only to size the raster. `cell` is the
   raster pitch in mm. Membership in a foot's rectangle is EXACT (the point
   is expressed in the foot's own radial/tangential frame); only the
   sampling is approximate, and R5 measures that. A foot that crosses the
   axis (spread 0.60 at two petals ALL THIN reaches -0.894 mm) is handled by
   the cartesian raster with no special case. */
export function stackDepth(feet, R, cell) {
  const half = R + 2;
  const N = Math.ceil((2 * half) / cell);
  const depth = new Uint16Array(N * N);
  let sumArea = 0;
  for (const f of feet) {
    sumArea += f.width * f.overhang;
    const c = Math.cos(f.az), s = Math.sin(f.az), hw = f.width / 2;
    const corners = [[f.radius, hw], [f.radius, -hw], [f.radius - f.overhang, hw], [f.radius - f.overhang, -hw]]
      .map(([rr, v]) => [rr * c - v * s, rr * s + v * c]);
    const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
    const i0 = Math.max(0, Math.floor((Math.min(...xs) + half) / cell)), i1 = Math.min(N - 1, Math.ceil((Math.max(...xs) + half) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(...ys) + half) / cell)), j1 = Math.min(N - 1, Math.ceil((Math.max(...ys) + half) / cell));
    for (let i = i0; i <= i1; i++) {
      const x = -half + (i + 0.5) * cell;
      for (let j = j0; j <= j1; j++) {
        const y = -half + (j + 0.5) * cell;
        const sr = x * c + y * s - f.radius;   // along the foot: 0 at the ring, -overhang at the inner end
        const v = -x * s + y * c;              // across the foot
        if (sr <= 0 && sr >= -f.overhang && Math.abs(v) <= hw) depth[i * N + j]++;
      }
    }
  }
  let dmax = 0, occ = 0, tot = 0, at = -1;
  for (let k = 0; k < depth.length; k++) {
    const d = depth[k];
    if (!d) continue;
    occ++; tot += d;
    if (d > dmax) { dmax = d; at = k; }
  }
  const union = occ * cell * cell;
  let dmaxAt = null;
  if (at >= 0) {
    const x = -half + (Math.floor(at / N) + 0.5) * cell, y = -half + ((at % N) + 0.5) * cell;
    dmaxAt = { r: Math.hypot(x, y), thetaDeg: (Math.atan2(y, x) * 180) / Math.PI };
  }
  return { dmax, dmaxAt, dmean: union > 0 ? sumArea / union : 0, dmeanRaster: occ ? tot / occ : 0, union, sumArea, cell, N };
}

/* All-pairs nearest neighbour — centre to centre, in mean foot widths — and
   the same statistic restricted to index-adjacent slots of one whorl, which
   is what a neighbour-picking metric would have read. Diagnostics. */
export function nearestFeet(feet) {
  const centre = (f) => { const rc = f.radius - f.overhang / 2; return [rc * Math.cos(f.az), rc * Math.sin(f.az)]; };
  const C = feet.map(centre);
  let all = { q: Infinity, d: Infinity, a: null, b: null, gap: null };
  let adj = { q: Infinity, d: Infinity, a: null, b: null, gap: 1 };
  for (let i = 0; i < feet.length; i++) {
    for (let j = i + 1; j < feet.length; j++) {
      const d = Math.hypot(C[i][0] - C[j][0], C[i][1] - C[j][1]);
      const q = d / ((feet[i].width + feet[j].width) / 2);
      if (q < all.q) all = { q, d, a: feet[i], b: feet[j], gap: Math.abs(feet[i].slot - feet[j].slot) };
      if (feet[i].layer === feet[j].layer && Math.abs(feet[i].slot - feet[j].slot) === 1 && q < adj.q) adj = { q, d, a: feet[i], b: feet[j], gap: 1 };
    }
  }
  return { all, adjacent: adj };
}

/* The raster pitch: a FIXED GRID of about 2,400 cells across the hub's
   diameter, floored at 5 microns — so a spread-6 plate (R 59 mm) samples at
   0.05 mm, where the narrowest reachable foot (FOOT_MIN_WIDTH_MM, 1.6 mm) is
   still 31 cells across, and the mum's 4.7 mm hub samples at 0.0056 mm. The
   first draft capped the pitch at 0.02 mm instead, which made the LARGEST
   blooms the finest-sampled (37 million cells at spread 6) for no gain. R5
   is what says the pitch was fine enough, on every row. */
export function cellFor(R) { return Math.max(0.005, (2 * (R + 2)) / 2400); }

/* ---------------------------------------------------------------------
   READ THE FEET FROM THE OWNER, inside the page. Returns both modes: the
   export (the artefact, what the flag is about) and the live (the read-out's
   and the sheet's geometry), each with the builder's own tallies so R1-R4
   can be made. `capability` is the row's non-shipping petal-model spec, or
   null, exactly as the export handler would pass it. */
export async function readFeet(page, capability = null) {
  return page.evaluate(async (cap) => {
    const mod = await import('/bloom-geometry.js');
    const ui = window.__bloomUIState();
    const out = {};
    for (const mode of ['live', 'export']) {
      const acc = new mod.MeshBuilder({ exportMode: mode === 'export' });
      const built = mod.buildBloomInto(acc, ui, { below: null, capability: cap });
      const fr = built.foot;
      const feet = [];
      if (fr.continuousMode) {
        fr.rings.forEach((r, k) => feet.push({ radius: r.radius, overhang: r.overhang, width: r.width, az: built.slotAzimuths[0][k], ring: r.index, layer: 0, slot: k }));
      } else {
        for (let L = 0; L < fr.layerCount; L++) {
          const row = fr.slotRings[L];
          for (let i = 0; i < row.length; i++) { const d = row[i]; feet.push({ radius: d.radius, overhang: d.overhang, width: d.width, az: built.slotAzimuths[L][i], ring: d.index, layer: L, slot: i }); }
        }
      }
      out[mode] = {
        feet,
        hub: { radius: fr.hub.radius, thickness: fr.hub.thickness },
        tris: acc.triangleCount,
        petalsBuilt: built.petalsBuilt,
        continuousMode: fr.continuousMode,
        /* One representative petal per descriptor, with its foot frames as
           EMITTED and the slot it was built for — R4's input. */
        reps: built.petals.map((p, i) => (p ? { slotIndex: p.slotIndex, layer: fr.continuousMode ? 0 : fr.rings[i].lambda, frames: p.footFrames } : null)),
      };
    }
    out.app = { liveTris: window.__bloomMetrics().liveTris, hubRadius: window.__bloomMetrics().hubRadius };
    return out;
  }, capability);
}

/* ---------------------------------------------------------------------
   THE PER-ROW MEASUREMENT WITH ITS VALIDITY ASSERTIONS. `stl` is the
   analyzeStl() result of the STL the row actually exported, or null when the
   caller did not export (R1 is then reported as not made, never as passed).
   Returns { bad, r }: `bad` is validity failures (fatal for the run), `r` the
   report crowdingLine() prints. */
export async function footCrowding(page, row, stl = null) {
  const bad = [];
  const F = await readFeet(page, (row && row.capability) || null);
  const E = F.export, Lv = F.live;

  /* R1 */
  let registered = null;
  if (stl) {
    registered = E.tris === stl.tris;
    if (!registered) bad.push(`crowding R1: the in-page export build has ${E.tris} triangles but the exported STL header says ${stl.tris} — the feet this metric read are not the geometry that was exported`);
  }
  /* R2 */
  if (Lv.tris !== F.app.liveTris) bad.push(`crowding R2: the in-page live build has ${Lv.tris} triangles but the app's last build reports ${F.app.liveTris} — the module instance or the state differs from the app's`);
  if (Lv.hub.radius !== F.app.hubRadius) bad.push(`crowding R2: the in-page live hub radius ${Lv.hub.radius} is not the app's ${F.app.hubRadius}`);
  /* R3 */
  for (const [name, M] of [['export', E], ['live', Lv]]) {
    if (M.feet.length !== M.petalsBuilt) bad.push(`crowding R3 (${name}): ${M.feet.length} foot rectangles for ${M.petalsBuilt} petals built — a foot is missing or counted twice`);
  }
  /* R4 — every emitted frame sits where the rectangle model puts it. */
  for (const [name, M] of [['export', E], ['live', Lv]]) {
    M.reps.forEach((rep, i) => {
      if (!rep) { bad.push(`crowding R4 (${name}): descriptor ${i} reports no representative petal`); return; }
      const f = M.feet.find((x) => x.layer === rep.layer && x.slot === rep.slotIndex);
      if (!f) { bad.push(`crowding R4 (${name}): descriptor ${i}'s petal (layer ${rep.layer}, slot ${rep.slotIndex}) has no foot rectangle`); return; }
      if (!Array.isArray(rep.frames) || rep.frames.length !== 3) { bad.push(`crowding R4 (${name}): descriptor ${i} reports ${rep.frames && rep.frames.length} foot frames, expected 3`); return; }
      /* SIGNED, along the slot's own radial direction — not a polar radius.
         A foot that crosses the axis (spread 0.60 at two petals ALL THIN
         reaches -0.894 mm) has an inner row on the FAR side of the origin,
         where hypot() reads the distance unsigned and atan2() reads the
         azimuth 180 deg out. The first draft of this clause did exactly that
         and fired on every axis-crossing foot of the positive control; the
         projection onto the builder's R = [cos az, sin az] is the quantity
         the emitted row actually is, and the cross-component must be zero. */
      const cs = Math.cos(f.az), sn = Math.sin(f.az);
      const wantS = [f.radius - f.overhang, f.radius - f.overhang / 2, f.radius];
      rep.frames.forEach((fr, k) => {
        const along = fr.C[0] * cs + fr.C[1] * sn;
        const across = -fr.C[0] * sn + fr.C[1] * cs;
        if (Math.abs(along - wantS[k]) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} sits ${along} mm along its slot's radial direction, the rectangle model puts it at ${wantS[k]} — the foot is not where footRing() says it lands`);
        if (Math.abs(across) > 1e-9) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is ${across} mm off its slot's radial line — the emitted foot and the recorded azimuth disagree`);
        if (fr.C[2] !== 0) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} is at z = ${fr.C[2]}, not in the base plane this metric rasterises`);
        if (fr.h !== f.width / 2) bad.push(`crowding R4 (${name}): descriptor ${i} foot row ${k} half-width ${fr.h} is not width/2 = ${f.width / 2}`);
      });
    });
  }

  /* THE NUMBERS, export first, then live for the divergence line. */
  const cell = cellFor(E.hub.radius);
  const fine = stackDepth(E.feet, E.hub.radius, cell);
  const coarse = stackDepth(E.feet, E.hub.radius, cell * 2);
  /* R5 */
  if (fine.dmax !== coarse.dmax) bad.push(`crowding R5: D_max reads ${fine.dmax} at cell ${cell} mm and ${coarse.dmax} at ${cell * 2} mm — the reading depends on the sampling, so it is not a reading`);
  if (fine.dmean > 0 && Math.abs(fine.dmean - coarse.dmean) > 0.005 * fine.dmean) bad.push(`crowding R5: D_mean reads ${fine.dmean.toFixed(4)} at cell ${cell} mm and ${coarse.dmean.toFixed(4)} at ${cell * 2} mm — more than 0.5% apart`);
  /* THE LIVE READING, for the divergence line only. Whenever the export
     floor does not bind the two geometries are the same feet on the same hub
     (the same doubles — asserted, not assumed), so the export raster IS the
     live one and is reused; only a row where the floor moved the ring pays
     for a second raster. */
  const sameFeet = Lv.hub.radius === E.hub.radius && Lv.feet.length === E.feet.length
    && Lv.feet.every((f, i) => f.radius === E.feet[i].radius && f.overhang === E.feet[i].overhang && f.width === E.feet[i].width && f.az === E.feet[i].az);
  const live = sameFeet ? fine : stackDepth(Lv.feet, Lv.hub.radius, cellFor(Lv.hub.radius));
  const nn = nearestFeet(E.feet);

  const r = {
    n: E.feet.length,
    hubR: E.hub.radius, hubRLive: Lv.hub.radius,
    footW: E.feet[0].width, footWLive: Lv.feet[0].width,
    dmax: fine.dmax, dmaxAt: fine.dmaxAt, dmean: fine.dmean, union: fine.union, sumArea: fine.sumArea, cell,
    liveDmax: live.dmax, liveDmean: live.dmean,
    nn: { q: nn.all.q, d: nn.all.d, gap: nn.all.gap, a: nn.all.a && `${nn.all.a.layer}/${nn.all.a.slot}`, b: nn.all.b && `${nn.all.b.layer}/${nn.all.b.slot}` },
    nnAdjacent: { q: nn.adjacent.q, d: nn.adjacent.d },
    crowded: fine.dmax >= CROWDED_DMAX,
    registered,
    exportTris: E.tris,
  };
  return { bad, r };
}

/* One line, every gate row. EXPORT numbers; live printed only where it
   differs, on the print-truth line's discipline. */
export function crowdingLine(r) {
  const at = r.dmaxAt ? ` at r ${r.dmaxAt.r.toFixed(2)} mm` : '';
  const diverges = r.liveDmax !== r.dmax || Math.abs(r.liveDmean - r.dmean) > 0.005;
  return `CROWDING (export): feet ${r.n} · stack D_max ${r.dmax}${at} · D_mean ${r.dmean.toFixed(2)}`
    + ` · foot ${r.footW.toFixed(2)} mm on hub ${r.hubR.toFixed(2)} mm`
    + ` · NN ${isFinite(r.nn.q) ? r.nn.q.toFixed(2) + ' w (gap ' + r.nn.gap + ')' : 'n/a'}`
    + (diverges ? ` · live reads D_max ${r.liveDmax} · D_mean ${r.liveDmean.toFixed(2)} (ring ${r.hubRLive.toFixed(2)} mm)` : '')
    + (r.crowded ? ` · CROWDED (D_max >= ${CROWDED_DMAX}, Eva Sep 3)` : '');
}

/* MATRIX-LEVEL: the flag in both directions. A flag that never raises on
   the matrix is a flag nobody has seen work; one that raises on every row
   is stuck on. Returns failure strings. */
export function crowdingCoverage(reports) {
  const bad = [];
  const raised = reports.filter((r) => r.crowded).length;
  if (reports.length && raised === 0) bad.push(`crowding coverage: no row in this matrix raises CROWDED — the raised state is unexercised (a default is not coverage; name a row that reaches D_max >= ${CROWDED_DMAX})`);
  if (reports.length && raised === reports.length) bad.push('crowding coverage: every row raises CROWDED — the flag is stuck on');
  return bad;
}

/* ---------------------------------------------------------------------
   STANDALONE: the ruled configs, with numbers, and nothing else. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
  const CONFIGS = [
    ['MUM (Eva\'s run, ruled BAD)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 }],
    ['DEFAULT (ruled clean)', {}],
    ['LAYERED depth cell, 3 x 0.90 x tilt 12 (ruled clean)', { layerCount: 3, layerSize: 0.9 }],
    ['CONTINUOUS headline, 40/turn x 3, spread 1.55 (ruled clean, merged)', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.55 }],
    ['RADIAL x 40 (unruled)', { petalCount: 40 }],
    ['RADIAL x 40 x spread 0.60 (unruled)', { petalCount: 40, spread: 0.6 }],
  ];
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-crowding-'));
  const validity = [];
  console.log(`foot crowding — export mode. SCOPE: ${CROWDING_SCOPE}\n`);
  for (const [label, cfg] of CONFIGS) {
    await openBloom(page, port);
    const bad = await applyConfig(page, set(cfg));
    if (bad.length) { validity.push(`${label}: ${bad.join('; ')}`); continue; }
    const drift = await fullStateDrift(page, set(cfg));
    if (drift.length) { validity.push(`${label}: ${drift.join('; ')}`); continue; }
    const buf = await exportStl(page, tmp);
    if (!buf) { validity.push(`${label}: no STL download`); continue; }
    const { bad: cb, r } = await footCrowding(page, { label, set: set(cfg) }, analyzeStl(buf));
    if (cb.length) validity.push(`${label}: ${cb.join('; ')}`);
    console.log(`  ${label}\n    ${crowdingLine(r)}\n    index-adjacent NN would read ${isFinite(r.nnAdjacent.q) ? r.nnAdjacent.q.toFixed(2) + ' w' : 'n/a'} · registered against the STL: ${r.registered}`);
  }
  await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  if (validity.length) {
    console.error(`\nHARNESS INVALID — ${validity.length} validity assertion(s) failed:`);
    for (const v of validity) console.error(`  - ${v}`);
    process.exit(1);
  }
}
