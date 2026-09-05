/* ===================================================================
   bloom-plan-coverage.mjs — a MEASUREMENT TOOL, committed Sep 4, and SINCE
   SESSION 16 (Eva, Sep 4) WIRED INTO THE EXPORT GATE: its line prints on every
   row and its numbers are ASSERTED on the rows that declare `coverage` (the
   pinned incurve rows) — see coverageAssert() and the WIRED note below. Was
   "NOT YET a gate". Built during Phase A discovery to answer one question for Eva's
   dome-apex brief: at centerStyle NONE x CONTINUOUS, is the bare crown a
   PLACEMENT gap (nothing rooted near the axis) or a COVERAGE gap (something
   rooted there, pointed the wrong way)? It answered that (a dome-vs-tilt
   AIMING interaction — see docs/bloom-charter.md's crown-coverage entry) and
   is committed here because tools/shot-bloom-domelean.mjs's captions cite its
   numbers directly. WHETHER IT BECOMES A PERMANENT FLAG (bloom-crowding.mjs's
   own precedent: built ad hoc, then wired into both gates with a threshold)
   is a separate, open question — this file does not assert that ruling and
   is not wired into verify-bloom-export.mjs or verify-bloom-connectedness.mjs.

   WHAT IT MEASURES. Top-down orthographic, axis-centred, over the hub's own
   plan disc (radius = footRing()'s R0 = builtFull.hub.radius — unaffected by
   headRise, since the dome's rim sits at plan radius R0 by construction: J2's
   own containment argument). For every sample point inside that disc:
   covered iff the point lies in the plan projection of ANY PETAL'S SOLID MESH
   (foot rows and blade rows both — "the petal", not a re-derived silhouette).
   Reports:
     uncoveredFraction   share of the disc's area no petal's projection reaches
     baldCapRadius       the largest axis-centred disc that is ENTIRELY
                          uncovered — the closest any covered sample comes to
                          the axis
     innermostFootRadius the smallest ring.radius footRing() actually built,
                          read from the owner (Math.min over builtFull.rings),
                          never re-derived from layerSize/lambda
   THE DISCRIMINATOR (Eva's brief): baldCapRadius ~= innermostFootRadius means
   nothing is rooted in the gap (PLACEMENT); baldCapRadius >> innermostFootRadius
   would mean something IS rooted there but point outward (COVERAGE) — this
   tool cannot produce that second shape by construction (a petal's footprint
   always includes its own foot, which sits AT its ring radius), so the only
   way to see it here is baldCapRadius sitting close to R0 while
   innermostFootRadius sits much smaller: rooted petals exist deep in the
   ring but their BLADES never sweep back over the gap they are next to.

   READING footRing() / buildPetalInto() / buildHubInto() / buildCenterInto(),
   NOT DUPLICATING THEM. Every geometric law (radius, azimuth, tilt, curl,
   the dome cap) is evaluated by the real exported functions with the real
   state; this file supplies only the SAME orchestration buildBloomInto()
   uses (copied from bloom-geometry.js's buildBloomInto, not re-derived), so
   that petals can be captured one at a time instead of pooled into one
   shared accumulator. That duplication of WIRING (not of LAW) is the
   tool's single biggest risk, so it is checked rather than trusted:
     R1  triangleCount(all per-petal accumulators) + triangleCount(hub-only +
         centre-only accumulator) === triangleCount(a normal whole-bloom
         build) — proves the petal-only capture is exactly the petals
         buildBloomInto would have emitted, no more, no fewer, on the
         fixed-topology invariant (every primitive is a fixed-topology grid,
         so a wrong PERMUTATION of which ring feeds which slot would not
         necessarily move this count — R3 below is what catches that).
     R2  the petal count captured here equals builtFull.petalsBuilt.
     R3  CONTINUOUS: every captured petal's mid/tip point is bit-identical to
         builtFull.petals[k] at the same index (same function, same inputs —
         an exact match is the expectation, not a tolerance).
         RINGED (RADIAL/SPIRAL/FAN): slot 0 of each layer is checked exactly
         against builtFull.petals[idx] the same way; every other slot in an
         UNSPLIT layer (slotRings[L] all one object, the collapse-guard
         doctrine) is checked by RIGID ROTATION about the axis against slot
         0 of its own layer (mathematically forced by the code structure —
         R/T/Z and the ring's own fields are the only inputs, azimuth is the
         only thing that varies slot to slot — so this is a real
         discriminating test, not a tautology). A SPLIT layer (zygomorphy /
         slot roles engaged) is OUT OF SCOPE for this throwaway tool and is a
         validity failure, never a silent wrong reading — none of the three
         Phase-A configs engage one.
     R4  the raster is CONVERGED: uncoveredFraction agrees within 1% and
         baldCapRadius within 2x the coarser cell between two grid pitches
         (the crowding instrument's R5 doctrine, ported).
   Any R-failure is fatal for the row (never a row result) exactly as
   bloom-crowding.mjs's R1-R5 are.

   WHAT THIS IS BLIND TO, on the same discipline as bloom-crowding.mjs's own
   header: it is a PLAN projection, so a petal that stacks material directly
   above another (two blades at different tilt occupying the same (x,y) but
   different z) reads as one covered cell, same as a viewer looking straight
   down would see; it says nothing about whether the coverage is CONTINUOUS
   sheet or two blade edges that merely graze in projection (a slicer-facing
   question, not this one); and centerStyle is deliberately never read here —
   coverage is a claim about petals, and the designed centre is a different
   producer entirely (the charter's junction/centre split, one level up).
   A raster is an approximation of an area; R4 is what says the approximation
   held for THIS reading, never assumed.

   WIRED (session 16). Crown closure on the incurve target is an EMERGENT
   property of curl 150 x tilt x domeLean landing every tip within 0.3-1.3 mm
   of the axis; it was never designed and has no margin, and a future session
   changing tilt, curl or domeLean re-opens it silently unless coverage is
   asserted on the pinned rows — which is what the export gate now does, on
   those rows only (0.0% uncovered, bald-cap <= 0.09 mm: the measured 0.08 mm
   plus one part in ten). A non-default curl bias or curl start opening the
   crown is DOCUMENTED BEHAVIOUR, not a gate failure: those controls move the
   tip, which is them working. A SPLIT WHORL (slot roles or per-petal roles
   engaged) is out of R3's scope and is reported as a LABELLED, LOUD SKIP —
   never INVALID, never silent (Eva's instruction); a row that asserts
   coverage and is skipped is a validity failure.

   RUN: node tools/bloom-plan-coverage.mjs           the three Phase-A configs
        node tools/bloom-plan-coverage.mjs --ascii   plus a same-run ASCII coverage
                                               map per config, for a fast own
                                               sanity check before comparing
                                               against the session-14 sheet
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift } from './bloom-harness.mjs';

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* THE THREE PHASE-A CONFIGS, plus the domed pair for mum/incurve — the exact
   parameter sets bloom-crowding.mjs's own CONFIGS array uses for MUM and the
   INCURVE target, so a reader can line this up against that tool's numbers
   directly rather than trusting a second transcription. */
export const CONFIGS = [
  ['SHIPPING DEFAULT', {}],
  ['MUM, flat', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 }],
  ['MUM x head rise 0.50', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 }],
  ['INCURVE target, flat', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 }],
  ['INCURVE target x head rise 0.50', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 }],
  /* THE ACTUAL COMPLAINT'S OWN COMBINATION — centerStyle is inert to this
     raster (see header), included anyway so nobody has to take that on
     faith: reported identical to its DISC twin below, by assertion. */
  ['INCURVE target x head rise 0.50 x centerStyle NONE', { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5, centerStyle: 'NONE' }],
];

/* The whole measurement, done INSIDE the page: the raster runs over
   thousands of samples against per-petal triangle soups, and shipping that
   soup back to Node would be pure overhead when V8 in Chromium can just as
   well hold the loop. Returns a small summary object plus `bad` (validity
   failures) and, when `wantMask` is true, a compact coverage bitmap for the
   ASCII sanity view. */
export async function measure(page, { capability = null, wantMask = false } = {}) {
  return page.evaluate(async ({ capability, wantMask }) => {
    const mod = await import('/bloom-geometry.js');
    const ui = window.__bloomUIState();
    const bad = [];

    const accFull = new mod.MeshBuilder({ exportMode: true });
    const builtFull = mod.buildBloomInto(accFull, ui, { below: null, capability });
    const hub = builtFull.hub;

    const accHC = new mod.MeshBuilder({ exportMode: true });
    const frHC = mod.footRing(ui, accHC);
    mod.buildHubInto(accHC, ui, frHC.hub);
    mod.buildCenterInto(accHC, ui, frHC.hub);

    const fr = mod.footRing(ui, accFull);
    /* THE LABELLED SKIP (session 16): a split whorl is out of R3's scope —
       reported as such, loudly, before a petal is built. */
    if (!fr.continuousMode) {
      const split = [];
      for (let L = 0; L < fr.layerCount; L++) { const s = fr.slotRings[L]; if (!s.every((d) => d === s[0])) split.push(L); }
      if (split.length) return { bad, r: null, skipped: `split whorl (layer${split.length > 1 ? 's' : ''} ${split.join(', ')} carry slot-role or per-petal records): the plan raster's R3 identifies slots by rigid rotation and cannot check a split whorl — RECORDED, NOT BUILT` };
    }
    const petalAccs = [];
    let petalsBuilt = 0;
    const rot = (p, dth) => { const c = Math.cos(dth), s = Math.sin(dth); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
    const near = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;

    if (fr.continuousMode) {
      mod.buildWhorlInto({
        count: fr.rings.length,
        radius: (i) => fr.rings[i].radius,
        height: 0,
        sizeRamp: (i) => fr.rings[i].scale,
        angleRamp: (i) => fr.rings[i].tiltExtra,
        phase: fr.rings[0].phase,
        placement: ui.placement,
        blade: (slot) => {
          petalsBuilt++;
          const acc = new mod.MeshBuilder({ exportMode: true });
          const p = mod.buildPetalInto(acc, ui, fr.rings[slot.index], slot, capability);
          petalAccs.push(acc);
          const ref = builtFull.petals[slot.index];
          if (!ref || !near(ref.mid, p.mid, 0) || !near(ref.tip, p.tip, 0)) {
            bad.push(`coverage R3: continuous slot ${slot.index}'s captured petal does not bit-match builtFull.petals[${slot.index}]`);
          }
        },
      });
    } else {
      for (let L = 0; L < fr.layerCount; L++) {
        const slotsFor = fr.slotRings[L];
        const ring = slotsFor[0];
        const unsplit = slotsFor.every((d) => d === ring);
        let slot0Mid = null, slot0Tip = null, az0 = null;
        const ROT_TOL = 1e-7; // trig round-trip, not an exact-bit claim like R3's slot-0 check
        mod.buildWhorlInto({
          count: fr.slotCount,
          radius: ring.radius,
          height: 0,
          sizeRamp: () => ring.scale,
          angleRamp: () => ring.tiltExtra,
          phase: ring.phase,
          placement: ui.placement,
          fan: fr.fan,
          blade: (slot) => {
            petalsBuilt++;
            const d = slotsFor[slot.index];
            const acc = new mod.MeshBuilder({ exportMode: true });
            const p = mod.buildPetalInto(acc, ui, d, slot, capability);
            petalAccs.push(acc);
            if (!unsplit) {
              bad.push(`coverage R3: layer ${L} slot ${slot.index} sits in a SPLIT whorl (zygomorphy/slot roles engaged) — out of scope for this tool (RECORDED, NOT BUILT: see the header), refusing rather than guessing`);
              return;
            }
            if (slot.index === 0) {
              slot0Mid = p.mid; slot0Tip = p.tip; az0 = slot.azimuth;
              const idx = fr.rings.indexOf(d);
              const ref = builtFull.petals[idx];
              if (!ref || !near(ref.mid, p.mid, 0) || !near(ref.tip, p.tip, 0)) {
                bad.push(`coverage R3: layer ${L} slot 0's captured petal does not bit-match builtFull.petals[${idx}]`);
              }
            } else {
              /* RIGID ROTATION about the axis is a mathematical CONSEQUENCE of
                 the code (R/T/Z and the ring's own fields are the only inputs;
                 azimuth is the only thing that varies slot to slot within an
                 unsplit layer) — so disagreeing here means this tool passed
                 the wrong ring/slot pairing, not that the geometry is exotic. */
              const dth = slot.azimuth - az0;
              const wantMid = rot(slot0Mid, dth), wantTip = rot(slot0Tip, dth);
              if (!near(wantMid, p.mid, ROT_TOL) || !near(wantTip, p.tip, ROT_TOL)) {
                bad.push(`coverage R3: layer ${L} slot ${slot.index} does not sit at slot 0 rigidly rotated by ${((dth * 180) / Math.PI).toFixed(3)} deg (mid wanted ${wantMid.map((v) => v.toFixed(6))}, got ${p.mid.map((v) => v.toFixed(6))})`);
              }
            }
          },
        });
      }
    }

    /* R1 */
    const petalTris = petalAccs.reduce((s, a) => s + a.triangleCount, 0);
    if (petalTris + accHC.triangleCount !== accFull.triangleCount) {
      bad.push(`coverage R1: petals-only (${petalTris}) + hub/centre-only (${accHC.triangleCount}) tris = ${petalTris + accHC.triangleCount}, but a normal whole-bloom build has ${accFull.triangleCount} — the petal capture is not exactly buildBloomInto's own petals`);
    }
    /* R2 */
    if (petalsBuilt !== builtFull.petalsBuilt) {
      bad.push(`coverage R2: captured ${petalsBuilt} petals but builtFull.petalsBuilt is ${builtFull.petalsBuilt}`);
    }

    /* Per-petal 2D bbox, for pruning the raster's point-in-triangle tests. */
    const petals = petalAccs.map((acc) => {
      const P = acc.positions;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      return { P, minX, maxX, minY, maxY };
    });

    const sign = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const inTri = (px, py, ax, ay, bx, by, cx, cy) => {
      const d1 = sign(px, py, ax, ay, bx, by), d2 = sign(px, py, bx, by, cx, cy), d3 = sign(px, py, cx, cy, ax, ay);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(neg && pos);
    };
    const covered = (x, y) => {
      for (const pet of petals) {
        if (x < pet.minX || x > pet.maxX || y < pet.minY || y > pet.maxY) continue;
        const P = pet.P;
        for (let i = 0; i < P.length; i += 9) {
          if (inTri(x, y, P[i], P[i + 1], P[i + 3], P[i + 4], P[i + 6], P[i + 7])) return true;
        }
      }
      return false;
    };

    const R0 = hub.radius;
    const raster = (n) => {
      const cell = (2 * R0) / n;
      let total = 0, unc = 0, baldR = R0;
      const mask = wantMask ? [] : null;
      for (let i = 0; i < n; i++) {
        const x = -R0 + (i + 0.5) * cell;
        const maskRow = wantMask ? [] : null;
        for (let j = 0; j < n; j++) {
          const y = -R0 + (j + 0.5) * cell;
          const r = Math.hypot(x, y);
          if (r > R0) { if (wantMask) maskRow.push(-1); continue; }
          total++;
          const c = covered(x, y);
          if (!c) unc++; else if (r < baldR) baldR = r;
          if (wantMask) maskRow.push(c ? 1 : 0);
        }
        if (wantMask) mask.push(maskRow);
      }
      return { total, unc, uncoveredFraction: total ? unc / total : 1, baldCapRadius: unc === total ? R0 : baldR, cell, mask };
    };

    /* R4 — CONVERGED, refining before refusing (session 16): the first full
       matrix run refused six rows at 220 x 220 — the spread-6 plates (a 53 mm
       hub, 0.24 mm cells, 1.4% apart) and the coincidence corner — where the
       cell is coarse against the petal edges. The lattice is doubled up to
       twice, and R4 refuses only a reading that still does not converge; a
       validity check loosened to pass is a log line. */
    let fine = raster(220), coarse = raster(110), n = 220;
    while (Math.abs(fine.uncoveredFraction - coarse.uncoveredFraction) > 0.01 && n < 880) { n *= 2; coarse = fine; fine = raster(n); }
    if (Math.abs(fine.uncoveredFraction - coarse.uncoveredFraction) > 0.01) {
      bad.push(`coverage R4: uncoveredFraction reads ${fine.uncoveredFraction.toFixed(4)} at cell ${fine.cell.toFixed(4)} mm and ${coarse.uncoveredFraction.toFixed(4)} at ${coarse.cell.toFixed(4)} mm — more than 1% apart`);
    }
    if (Math.abs(fine.baldCapRadius - coarse.baldCapRadius) > 2 * coarse.cell) {
      bad.push(`coverage R4: baldCapRadius reads ${fine.baldCapRadius.toFixed(4)} mm at cell ${fine.cell.toFixed(4)} mm and ${coarse.baldCapRadius.toFixed(4)} mm at ${coarse.cell.toFixed(4)} mm — more than twice the coarser cell apart`);
    }

    /* innermost = the OWNER's own deepest descriptor — read, not re-derived.
       Reported with enough of its own fields (radius/overhang/arc/slope) that
       a FOOT-STUB-ONLY reference reach can be computed analytically outside
       this function: the flat/domed inner edge of just the innermost ring's
       foot rectangle, with NO blade curl contribution at all. That isolates
       "the junction's own inward stub reaches here regardless of curl" from
       "curl swept material further in than that" — the shipping default's
       nonzero overhang does the former with petalSpineCurl at its identity,
       so bald-cap-radius alone conflates the two if not separated. */
    let innermost = builtFull.rings[0];
    for (const rr of builtFull.rings) if (rr.radius < innermost.radius) innermost = rr;

    return {
      bad,
      r: {
        n: petalsBuilt,
        R0,
        uncoveredFraction: fine.uncoveredFraction,
        baldCapRadius: fine.baldCapRadius,
        coarseBaldCapRadius: coarse.baldCapRadius,
        innermostFootRadius: innermost.radius,
        innermost: { radius: innermost.radius, overhang: innermost.overhang, arc: innermost.arc, slope: innermost.slope },
        ratio: innermost.radius > 0 ? fine.baldCapRadius / innermost.radius : null,
        dome: hub.dome ? { rise: hub.dome.rise, riseBuilt: hub.dome.riseBuilt, Rd: hub.dome.Rd, clamped: hub.dome.clamped } : null,
        cell: fine.cell,
        refinedTo: n,
        mask: wantMask ? fine.mask : null,
      },
    };
  }, { capability, wantMask });
}

/* THE FOOT-STUB-ONLY REFERENCE — analytical, from the owner's own innermost-
   ring fields, computed OUTSIDE the page since it is arithmetic on numbers
   footRing() already reported, not a new geometric law. Answers: how far in
   would coverage reach if NOTHING but the innermost ring's flat/domed foot
   RECTANGLE existed — zero blade, zero curl? Comparing the MEASURED
   bald-cap-radius against this isolates "the junction's own inward overhang
   did this" (measured ~= reference) from "curl swept material further in
   than the foot alone ever would" (measured well under the reference). */
export function footStubInnerReach(r) {
  const { radius, overhang, arc, slope } = r.innermost;
  if (r.dome) {
    const innerArc = arc - overhang;
    if (innerArc <= 0) return 0; // the foot alone already crosses the apex
    return r.dome.Rd * Math.sin(innerArc / r.dome.Rd);
  }
  return Math.max(0, radius - overhang);
}

/* THE ASSERTION, on rows that declare `coverage: { maxUncovered, maxBald }`
   — ONE owner of what "the crown stayed closed" means in numbers. */
export function coverageAssert(r, want) {
  const bad = [];
  if (!(r.uncoveredFraction <= want.maxUncovered)) bad.push(`COVERAGE: ${(r.uncoveredFraction * 100).toFixed(2)}% of the hub disc is uncovered, this row allows ${(want.maxUncovered * 100).toFixed(2)}% — the crown re-opened (tilt, curl or domeLean moved; crown closure is emergent and has no margin)`);
  if (!(r.baldCapRadius <= want.maxBald)) bad.push(`COVERAGE: the bald-cap radius is ${r.baldCapRadius.toFixed(3)} mm, this row allows ${want.maxBald.toFixed(3)} mm — the crown re-opened`);
  return bad;
}

export function coverageLine(r) {
  const stub = footStubInnerReach(r);
  const bladeReach = stub - r.baldCapRadius; // how much FURTHER IN curl/tilt reached, past the bare foot stub
  return `feet/petals ${r.n} · hub R0 ${r.R0.toFixed(2)} mm · UNCOVERED ${(r.uncoveredFraction * 100).toFixed(1)}% of disc`
    + ` · bald-cap radius ${r.baldCapRadius.toFixed(2)} mm (coarse check ${r.coarseBaldCapRadius.toFixed(2)} mm)`
    + ` · innermost foot radius ${r.innermostFootRadius.toFixed(2)} mm · ratio ${r.ratio == null ? 'n/a' : r.ratio.toFixed(2)}`
    + ` · foot-stub-only reach ${stub.toFixed(2)} mm · blade/curl closed ${bladeReach.toFixed(2)} mm further`
    + (r.dome ? ` · DOME rise ${r.dome.riseBuilt.toFixed(2)}${r.dome.clamped ? ' (CLAMPED)' : ''}` : '')
    + `  [${r.ratio != null && r.ratio >= 0.85 ? 'PLACEMENT gap (bald cap ~= innermost foot; little/no blade contribution)' : bladeReach > 0.5 ? 'BLADE/CURL ALREADY CLOSING MOST OF IT (bald cap well under the foot stub reference)' : 'COVERAGE gap (bald cap at or past the innermost foot; blades point outward)'}]`;
}

function asciiMask(mask) {
  const n = mask.length;
  const step = Math.max(1, Math.round(n / 64));
  const lines = [];
  for (let i = 0; i < n; i += step) {
    let line = '';
    for (let j = 0; j < n; j += step) {
      const v = mask[i][j];
      line += v < 0 ? ' ' : v ? '#' : '.';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const wantMask = process.argv.includes('--ascii');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const configs = onlyArg ? CONFIGS.slice(0, Number(onlyArg.split('=')[1])) : CONFIGS;
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage();
  const validity = [];
  console.log('bloom plan coverage — a measurement tool, not yet a gate.\n');
  for (const [label, cfg] of configs) {
    await openBloom(page, port);
    const bad0 = await applyConfig(page, set(cfg));
    if (bad0.length) { validity.push(`${label}: ${bad0.join('; ')}`); continue; }
    const drift = await fullStateDrift(page, set(cfg));
    if (drift.length) { validity.push(`${label}: ${drift.join('; ')}`); continue; }
    const { bad, r, skipped } = await measure(page, { wantMask });
    if (bad.length) { validity.push(`${label}: ${bad.join('; ')}`); continue; }
    if (skipped) { console.log(`  ${label}\n    COVERAGE: SKIPPED — ${skipped}`); continue; }
    console.log(`  ${label}\n    ${coverageLine(r)}`);
    if (wantMask && r.mask) console.log(asciiMask(r.mask).split('\n').map((l) => '    ' + l).join('\n') + '\n');
  }
  await browser.close(); server.close();
  if (validity.length) {
    console.error(`\nHARNESS INVALID — ${validity.length} validity assertion(s) failed:`);
    for (const v of validity) console.error(`  - ${v}`);
    process.exit(1);
  }
}
