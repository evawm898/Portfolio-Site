/* ===================================================================
   bloom-solid-angle-coverage.mjs — the SOLID-ANGLE coverage instrument, a
   SIBLING of bloom-plan-coverage.mjs, not a replacement (session 19, Eva's
   brief). WIRED INTO THE EXPORT GATE on Eva's ruling (session 19): its line
   prints on every row, it is ASSERTED on the four rows of block 22 that
   declare `solidCoverage` (the rows and thresholds are hers, with the
   headroom of every pin recorded in docs/bloom-session-19-outcome.md), a
   SPHERE row that this tool skips fails the run, and the plan raster's own
   SPHERE skip stays — a plan raster still cannot read a sphere; what is
   lifted is that a sphere row had no coverage instrument at all.

   R5 IS THE VALIDITY STANDARD FOR THIS INSTRUMENT, AND THE "MAPPED" CHECK IS
   ILL-POSED (Eva, session 19). The brief asked for agreement with the plan
   raster mapped through the sphere on a rise-1 hemisphere; measured, the two
   agree at 100% wherever the crown is and part company only at the rim,
   because they ask about DIFFERENT RAYS — a vertical line through a rim
   point runs up through the blades, the radial ray through the same point
   is horizontal and leaves under the canopy. Two ray families coincide only
   on the axis, so the divergence at 75–90 deg is both instruments being
   correct, not a defect in either, and the mapped comparison is kept as a
   REPORTED number in the standalone run only (never in the gate, never a
   check). Do not re-propose it as a bug. R5 — the SAME rays through both
   formulations — is exact by construction and is the standard; R6 below
   calibrates the MEASURE (the steradians the pins are stated in).

   WHY IT EXISTS. The plan raster (top-down, orthographic, over the hub disc)
   cannot read a full sphere: the far hemisphere projects into the same disc
   from below and reads as a FALSE CLEAN (measured, session 18's M-COV: 0.0%
   uncovered on the incurve sphere with the skip removed). A sphere's own
   question is asked from its CENTRE: which directions out of the centre
   reach a petal?

   WHAT IT MEASURES. From the head's sphere centre — footRing()'s own
   `dome.centreZ` on the axis, the cap's sphere on a CAP row and the closed
   sphere's on a SPHERE row — for every sample direction (phi, theta):
     covered iff the ray from the centre in that direction hits ANY PETAL
     TRIANGLE (foot rows and blade rows both — "the petal", not a re-derived
     silhouette), at a positive ray parameter. The hub shell and the
     designed centre are deliberately NOT in the soup, exactly as the plan
     raster leaves them out: coverage is a claim about PETALS, and the
     designed centre is a different producer (the charter's junction/centre
     split). So the face-pole number here is WHAT THE PETALS LEAVE OPEN — the
     number the deferred DISC-plate question needs beside the plate's own
     24.5 mm.
   Reports, in steradians and degrees:
     uncoveredFraction   share of the FULL 4 pi no petal is seen in
     face / reserved     for each pole: baldDeg, the polar half-angle of the
                          largest pole-centred cone entirely uncovered (the
                          nearest covered sample to the pole — the analogue
                          of the plan raster's baldCapRadius), its solid
                          angle 2 pi (1 - cos), the chord radius on the
                          sphere Rd sin(bald) so it can be read beside a
                          plate diameter; and regionSr, the solid angle of
                          the CONNECTED uncovered region containing the pole
                          (flood fill on the (phi, theta) grid with the
                          theta wrap), which is the "eye" whether or not it
                          is round, with its equivalent cone half-angle.
     capUncovered        CAP rows only: the uncovered share of the cap's own
                          solid angle (directions inside the rim's polar
                          angle), which is the part of a cap row that means
                          anything — a cap is open underneath.
   A FLAT hub has no sphere centre (Rd is infinite; the plan raster IS the
   parallel-ray limit of this instrument) and is a LABELLED SKIP here — the
   mirror image of the plan raster's sphere skip. Decided from footRing()'s
   own `dome`, before a petal is built.

   SAMPLING. Uniform in polar angle and azimuth (0.5 deg, refined to 0.25 deg
   for R4), each sample weighted by sin(phi) so the sums ARE solid angle;
   uniform-in-cos(phi) sampling was rejected because it starves the poles of
   resolution, and the poles are the whole question. The triangle index is
   binned in (phi, theta): every triangle's three directions from the centre
   are enclosed in a spherical cap (centroid direction, angular radius to
   the farthest vertex), the cap's (phi, theta) footprint is exact and
   conservative (a cap that reaches a pole spans every theta), and a sample
   tests only its bin's list.

   THE KERNEL. A direction d hits triangle (a, b, c) — vertices RELATIVE to
   the ray origin — iff the three scalar triple products d.(a x b), d.(b x c),
   d.(c x a) share a sign (d lies in the cone the triangle subtends, or its
   antipode does) AND the plane intersection sits at t > 0 (it is d, not the
   antipode). The same function serves the parallel-ray case with the origin
   above the geometry and d = -z, which is what makes R5 possible.

   VALIDITY — the load-bearing part (Eva's brief), every one a hard abort,
   never a row result. R6 (the closed-form calibration of the measure) runs
   ONCE per process before any row and is documented at calibrate() below.
     R0  THE KERNEL'S OWN SELF-TEST, through the real binning: a synthetic
         soup with known answers (a triangle ahead on +z, one behind on -z,
         one straddling theta = 0 at the equator) must be hit and missed
         exactly as geometry says, from the centre and by a parallel ray. A
         kernel that counts the antipode (the t clause dropped — the central
         version of the false clean), casts inward, or loses the theta wrap
         fails here before any petal is built.
     R1  triangleCount(per-petal accumulators) + triangleCount(hub + centre
         only) === triangleCount(a whole-bloom build) — the petal capture is
         exactly buildBloomInto's petals (plan-coverage's R1, verbatim).
     R2  the captured petal count equals builtFull.petalsBuilt.
     R3  every captured petal's mid/tip bit-matches builtFull.petals at the
         same index (continuous), or slot 0 exactly and the rest by rigid
         rotation (ringed) — plan-coverage's R3, verbatim; a SPLIT whorl is
         a labelled skip there and is one here.
     R4  CONVERGED: uncoveredFraction within 1% and every bald angle within
         two coarser cells between the two grids.
     R5  THE PARALLEL-RAY IDENTITY, on every row the plan raster can read:
         this file's 3D kernel, fed one vertical ray per cell of the plan
         raster's OWN grid (same n, same cell centres, same disc), must
         reproduce the plan raster's covered/uncovered flag on EVERY cell —
         (a) against a verbatim copy of the plan raster's 2D test on the same
         soup, EXACTLY, and (b) on rows the shipped bloom-plan-coverage.mjs
         measures, against ITS returned uncoveredFraction and baldCapRadius,
         EXACTLY. Two formulations of one question, no tolerance. A sphere
         row cannot have (b) — the shipped tool skips it by design — so (a)
         is the clause that runs everywhere. R5 RUNS ON FLAT ROWS TOO — it
         needs no centre — so it holds on every row the gate runs; the flat
         skip is decided after it, and the skip line carries its count.
   AND ONE COMPARISON THAT IS REPORTED, NOT ASSERTED (see the top of this
   header for the ruling) — Eva's brief named it as THE validity check and
   it is measured on every cap row of the standalone run exactly as
   asked: "on the rise-1 hemisphere the solid-angle reading must agree with
   the plan raster mapped through the sphere". Every central-ray sample
   inside the rim's polar angle is mapped to its point on the cap and the
   plan raster's 2D test is evaluated there; the two flags are compared
   sample by sample (solid-angle weighted) and the two uncovered fractions
   over the cap's solid angle are printed side by side. They do NOT agree in
   general and the reason is geometry, not a defect: the plan raster asks
   whether a VERTICAL line through a point on the cap meets a petal, this
   instrument asks whether the RADIAL ray from the centre through the same
   point does, and those are the same ray only on the axis. The number is
   printed so the disagreement is on the record with its size, per the
   brief's instruction, and NO tolerance was widened to make it pass.

   READING footRing() / buildPetalInto() / buildHubInto() (and, until session 20, buildCenterInto())
   INSIDE THE PAGE, not duplicating them — the same module instance the app
   built from. The petal capture's orchestration is COPIED from
   bloom-plan-coverage.mjs (which copied it from buildBloomInto) rather than
   shared, deliberately: the plan raster is a wired gate with a shipping
   history and this session is instrument-only, so it is not refactored; the
   copy is checked against the owner on every run by R1–R3, which is what
   makes a drifted copy a hard failure rather than a silent one. Folding the
   capture into one in-page module both tools import is recorded here as the
   obvious refactor, for a session that is allowed to touch the gate.

   WHAT THIS IS BLIND TO, on the same discipline as its siblings' headers:
   it is a CENTRAL projection, so material stacked along one ray reads as
   one covered direction; it says nothing about whether coverage is a
   continuous sheet or two blade edges grazing in projection; the hub and
   the centre are never in the soup; and the kernel's t > 0 clause is
   REDUNDANT for central rays by construction — a planar triangle that does
   not contain the centre subtends less than a hemisphere, so its (phi,
   theta) bins never contain its antipode and a direction only ever tests
   triangles whose cap holds it. That was found by the negative control
   (dropping the clause alone changed nothing), so the antipode mutation
   breaks BOTH the clause and the binning, and R0 is its witness; R5 is a
   LINE test by construction and cannot see the sign of t either way.

   RUN: node tools/bloom-solid-angle-coverage.mjs             the configs below
        node tools/bloom-solid-angle-coverage.mjs --ascii     plus an ASCII
                                                  (phi, theta) map per row
        node tools/bloom-solid-angle-coverage.mjs --negative-control
                                                  three kernel mutations, each
                                                  required to be caught by the
                                                  validity check named for it
   =================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift } from './bloom-harness.mjs';
import { measure as planMeasure } from './bloom-plan-coverage.mjs';

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const MUM = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 };
const SPH = { placement: 'CONTINUOUS', hubShape: 'SPHERE' };

/* The configs: the plan raster's own six (so the two instruments can be
   read side by side), the rise-1 hemispheres Eva's validity brief names,
   and the matrix's SPHERE rows that carry a question — the incurve sphere
   (the sheet's headline) and the 240-foot row (the deferred DISC plate). */
export const CONFIGS = [
  ['SHIPPING DEFAULT (flat — no sphere centre)', {}],
  ['DEFAULT x head rise 1.00 (a hemisphere)', { headRise: 1 }],
  ['INCURVE target, flat (no sphere centre)', { ...INCURVE }],
  ['INCURVE target x head rise 0.50', { ...INCURVE, headRise: 0.5 }],
  ['INCURVE target x head rise 1.00 (a hemisphere)', { ...INCURVE, headRise: 1 }],
  ['MUM x head rise 1.00 (a hemisphere)', { ...MUM, headRise: 1 }],
  ['SPHERE: defaults (8 per turn x 1 turn)', { ...SPH }],
  ['SPHERE: the INCURVE sliders (the sheet\'s headline)', { ...INCURVE, ...SPH }],
  ['SPHERE: 40 per turn x 6 turns (240 feet — the deferred DISC plate\'s row)', { ...SPH, petalCount: 40, layerCount: 6 }],
  ['SPHERE: the mum sliders', { ...MUM, ...SPH }],
];

/* THE KERNEL, installed into the page ONCE as `window.__solidKernel` and
   shared by measure() and calibrate() — one copy, so the calibration below
   exercises exactly the code the rows run. `mutate` is the negative control's
   hook and is null on every real run. */
function solidKernel(mutate) {
  /* ---------------- THE KERNEL ---------------- */
  /* Vertices relative to the ray origin; d need not be unit. */
  const hitTri = (dx, dy, dz, ax, ay, az, bx, by, bz, cx, cy, cz) => {
    const s1 = dx * (ay * bz - az * by) + dy * (az * bx - ax * bz) + dz * (ax * by - ay * bx);
    const s2 = dx * (by * cz - bz * cy) + dy * (bz * cx - bx * cz) + dz * (bx * cy - by * cx);
    const s3 = dx * (cy * az - cz * ay) + dy * (cz * ax - cx * az) + dz * (cx * ay - cy * ax);
    const same = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
    if (!same) return false;
    if (mutate === 'antipode') return true;             // NEGATIVE CONTROL: the antipode counts (with its bins below)
    const ex = bx - ax, ey = by - ay, ez = bz - az, fx = cx - ax, fy = cy - ay, fz = cz - az;
    const nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
    const den = nx * dx + ny * dy + nz * dz;
    if (den === 0) return false;
    return (nx * ax + ny * ay + nz * az) / den > 0;
  };

  /* (phi, theta) BINS over a soup given as a flat array of vertices
     RELATIVE TO THE CENTRE. */
  const NPB = 90, NTB = 180;
  const buildIndex = (P) => {
    const bins = Array.from({ length: NPB * NTB }, () => []);
    const nT = P.length / 9;
    for (let t = 0; t < nT; t++) {
      const o = 9 * t;
      let cx = 0, cy = 0, cz = 0;
      const u = [];
      for (let k = 0; k < 3; k++) {
        const x = P[o + 3 * k], y = P[o + 3 * k + 1], z = P[o + 3 * k + 2];
        const l = Math.hypot(x, y, z) || 1;
        u.push([x / l, y / l, z / l]); cx += x / l; cy += y / l; cz += z / l;
      }
      const cl = Math.hypot(cx, cy, cz);
      let rho, phic, thc;
      if (cl < 1e-12) { rho = Math.PI; phic = Math.PI / 2; thc = 0; }
      else {
        cx /= cl; cy /= cl; cz /= cl;
        rho = 0;
        for (const v of u) { const dd = Math.max(-1, Math.min(1, v[0] * cx + v[1] * cy + v[2] * cz)); rho = Math.max(rho, Math.acos(dd)); }
        phic = Math.acos(Math.max(-1, Math.min(1, cz))); thc = Math.atan2(cy, cx);
      }
      const p0 = phic - rho, p1 = phic + rho;
      const i0 = Math.max(0, Math.floor((p0 / Math.PI) * NPB)), i1 = Math.min(NPB - 1, Math.floor((p1 / Math.PI) * NPB));
      let full = p0 <= 0 || p1 >= Math.PI || rho >= Math.PI / 2;
      let j0 = 0, j1 = NTB - 1;
      if (!full) {
        const dth = Math.asin(Math.min(1, Math.sin(rho) / Math.sin(phic)));
        if (mutate === 'no-wrap') {                      // NEGATIVE CONTROL: the theta wrap lost
          j0 = Math.max(0, Math.floor(((thc - dth + Math.PI) / (2 * Math.PI)) * NTB)); j1 = Math.min(NTB - 1, Math.floor(((thc + dth + Math.PI) / (2 * Math.PI)) * NTB));
        } else {
          j0 = Math.floor(((thc - dth + Math.PI) / (2 * Math.PI)) * NTB); j1 = Math.floor(((thc + dth + Math.PI) / (2 * Math.PI)) * NTB);
        }
      }
      for (let i = i0; i <= i1; i++) {
        if (full) { for (let j = 0; j < NTB; j++) bins[i * NTB + j].push(t); }
        else for (let j = j0; j <= j1; j++) bins[i * NTB + (((j % NTB) + NTB) % NTB)].push(t);
      }
      if (mutate === 'antipode' && !full) {               // NEGATIVE CONTROL: the antipodal cap is binned too
        for (let i = NPB - 1 - i1; i <= NPB - 1 - i0; i++) for (let j = j0; j <= j1; j++) bins[i * NTB + ((((j + NTB / 2) % NTB) + NTB) % NTB)].push(t);
      }
    }
    return bins;
  };
  const hitDir = (P, bins, dx, dy, dz) => {
    if (mutate === 'inward') { dx = -dx; dy = -dy; dz = -dz; }   // NEGATIVE CONTROL: cast inward
    const l = Math.hypot(dx, dy, dz);
    const phi = Math.acos(Math.max(-1, Math.min(1, dz / l))), th = Math.atan2(dy, dx);
    const i = Math.min(NPB - 1, Math.floor((phi / Math.PI) * NPB)), j = Math.min(NTB - 1, Math.floor(((th + Math.PI) / (2 * Math.PI)) * NTB));
    const list = bins[i * NTB + j];
    for (let q = 0; q < list.length; q++) {
      const o = 9 * list[q];
      if (hitTri(dx, dy, dz, P[o], P[o + 1], P[o + 2], P[o + 3], P[o + 4], P[o + 5], P[o + 6], P[o + 7], P[o + 8])) return true;
    }
    return false;
  };
  /* The parallel ray: origin (x, y, zTop) above everything, d = -z, no
     bins (a per-petal plan bbox prunes it, as the plan raster's does). */
  const hitVertical = (pet, x, y, zTop) => {
    if (x < pet.minX || x > pet.maxX || y < pet.minY || y > pet.maxY) return false;
    const P = pet.P;
    for (let o = 0; o < P.length; o += 9) {
      if (hitTri(0, 0, -1, P[o] - x, P[o + 1] - y, P[o + 2] - zTop, P[o + 3] - x, P[o + 4] - y, P[o + 5] - zTop, P[o + 6] - x, P[o + 7] - y, P[o + 8] - zTop)) return true;
    }
    return false;
  };
  return { hitTri, buildIndex, hitDir, hitVertical, NPB, NTB };
}
const installKernel = (page) => page.evaluate(`window.__solidKernel = ${solidKernel.toString()}`);

/* The whole measurement, INSIDE the page (the raster runs over a million
   directions against a soup of up to 300k triangles; shipping that soup to
   Node would be pure overhead). `mutate` is the negative control's hook and
   is null on every real run. */
export async function measure(page, { capability = null, wantMask = false, mutate = null, plan = null, mapped = true, suppressR0 = false } = {}) {
  await installKernel(page);
  return page.evaluate(async ({ capability, wantMask, mutate, plan, mapped: wantMapped, suppressR0 }) => {
    const mod = await import('/bloom-geometry.js');
    const ui = window.__bloomUIState();
    const bad = [];
    const t0 = performance.now();

    const { hitTri, buildIndex, hitDir, hitVertical } = window.__solidKernel(mutate);

    /* ---------------- R0: THE KERNEL'S SELF-TEST ---------------- */
    if (!suppressR0) {
      const S = [];
      const tri = (a, b, c) => S.push(...a, ...b, ...c);
      tri([-1, -1, 5], [1, -1, 5], [0, 1, 5]);          // ahead, on +z
      tri([-1, -1, -5], [1, -1, -5], [0, 1, -5]);       // behind, on -z
      tri([-5, -0.3, -0.3], [-5, 0.3, -0.3], [-5, 0, 0.3]); // straddles the theta = +/-pi SEAM at the equator (the -x side)
      const P = Float64Array.from(S);
      const bins = buildIndex(P);
      const want = [
        [[0, 0, 1], true, '+z hits the triangle ahead'],
        [[0, 0, -1], true, '-z hits the triangle behind'],
        [[0.02, 0.02, 1], true, '+z (tilted 1.6 deg) still hits the triangle ahead'],
        [[0.5, 0, 1], false, '+z tilted 27 deg misses it'],
        [[-1, 0, 0], true, '-x hits the equatorial triangle on the theta seam'],
        [[-1, -0.02, 0], true, '-x at theta = +178.9 deg hits it (one side of the seam)'],
        [[-1, 0.02, 0], true, '-x at theta = -178.9 deg hits it (the other side — the wrap)'],
        [[1, 0, 0], false, '+x sees nothing'],
        [[0, 1, 0], false, '+y sees nothing'],
      ];
      for (const [d, exp, why] of want) {
        const got = hitDir(P, bins, d[0], d[1], d[2]);
        if (got !== exp) bad.push(`R0: kernel self-test — ${why}: expected ${exp}, got ${got}`);
      }
      /* The antipode is the specific failure the plan raster has on a sphere,
         so it is named: from a centre with a triangle only AHEAD, the
         direction BEHIND must read uncovered. */
      const P2 = Float64Array.from(S.slice(0, 9));
      const b2 = buildIndex(P2);
      if (hitDir(P2, b2, 0, 0, -1) !== false) bad.push('R0: kernel self-test — with a triangle only on +z, the -z direction reads COVERED: the kernel counts the antipode (the central version of the false clean)');
      if (hitDir(P2, b2, 0, 0, 1) !== true) bad.push('R0: kernel self-test — with a triangle only on +z, the +z direction reads UNCOVERED');
      /* The parallel ray, through the same hitTri. */
      const pet = { P: P2, minX: -1, maxX: 1, minY: -1, maxY: 1 };
      if (hitVertical(pet, 0, 0, 100) !== true) bad.push('R0: kernel self-test — the vertical ray from above through (0,0) misses the triangle at z = 5');
      if (hitVertical(pet, 0.9, 0.9, 100) !== false) bad.push('R0: kernel self-test — the vertical ray through (0.9, 0.9) hits a triangle it is outside of');
      if (bad.length) return { bad };
    }

    /* ---------------- THE BUILD, AND THE CENTRE ---------------- */
    const accFull = new mod.MeshBuilder({ exportMode: true });
    const builtFull = mod.buildBloomInto(accFull, ui, { below: null, capability });
    const hub = builtFull.hub;
    const accHC = new mod.MeshBuilder({ exportMode: true });
    const frHC = mod.footRing(ui, accHC);
    mod.buildHubInto(accHC, ui, frHC.hub);
    /* THE ANDROECIUM (session 21) — a third accumulator, counted in R1 and
       never rasterised (plan-coverage's own construction, verbatim): the
       measure is the petal canopy's solid angle, and a stamen is not a petal.
       Under SPHERE, the only head this instrument asserts on, there are no
       stamens at all (hidden and inert). */
    const accST = new mod.MeshBuilder({ exportMode: true });
    if (frHC.androecium) {
      const A = frHC.androecium;
      mod.buildWhorlInto({ count: A.count, radius: (i) => A.stamens[i].radius, height: 0, sizeRamp: () => 1, angleRamp: () => 0, phase: 0,
        placement: A.layout === 'DISC' ? 'SPIRAL' : 'RADIAL', blade: (slot) => { mod.buildStamenInto(accST, A, A.stamens[slot.index], slot); } });
    }
    const fr = mod.footRing(ui, accFull);

    /* A FLAT hub is skipped — but AFTER the capture and R5 below, so the
       parallel-ray identity is asserted on EVERY row the gate runs, centre
       or not: R5 needs no centre (it is vertical rays against the plan
       raster's own grid), and a row without a centre is exactly where the
       plan raster is the instrument, so it is the row on which the two
       formulations must agree. There is no scope limit in R5. */
    const dome = hub.dome;
    const flat = !dome;
    const closed = !flat && dome.closed === true;
    if (Boolean(fr.sphereMode) !== closed) bad.push(`solid R0b: footRing() reports sphereMode ${fr.sphereMode} while its dome ${closed ? 'is' : 'is not'} closed — the flag and the head disagree`);
    if (!fr.continuousMode) {
      const split = [];
      for (let L = 0; L < fr.layerCount; L++) { const s = fr.slotRings[L]; if (!s.every((d) => d === s[0])) split.push(L); }
      if (split.length) return { bad, r: null, skipped: `split whorl (layer${split.length > 1 ? 's' : ''} ${split.join(', ')} carry slot-role or per-petal records): R3 identifies slots by rigid rotation and cannot check a split whorl — the plan raster's own skip, mirrored` };
    }

    /* ---------------- THE CAPTURE (plan-coverage's wiring, verbatim) ---------------- */
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
          if (!ref || !near(ref.mid, p.mid, 0) || !near(ref.tip, p.tip, 0)) bad.push(`solid R3: continuous slot ${slot.index}'s captured petal does not bit-match builtFull.petals[${slot.index}]`);
        },
      });
    } else {
      for (let L = 0; L < fr.layerCount; L++) {
        const slotsFor = fr.slotRings[L];
        const ring = slotsFor[0];
        let slot0Mid = null, slot0Tip = null, az0 = null;
        const ROT_TOL = 1e-7;
        mod.buildWhorlInto({
          count: fr.slotCount, radius: ring.radius, height: 0,
          sizeRamp: () => ring.scale, angleRamp: () => ring.tiltExtra, phase: ring.phase,
          placement: ui.placement, fan: fr.fan,
          blade: (slot) => {
            petalsBuilt++;
            const d = slotsFor[slot.index];
            const acc = new mod.MeshBuilder({ exportMode: true });
            const p = mod.buildPetalInto(acc, ui, d, slot, capability);
            petalAccs.push(acc);
            if (slot.index === 0) {
              slot0Mid = p.mid; slot0Tip = p.tip; az0 = slot.azimuth;
              const idx = fr.rings.indexOf(d);
              const ref = builtFull.petals[idx];
              if (!ref || !near(ref.mid, p.mid, 0) || !near(ref.tip, p.tip, 0)) bad.push(`solid R3: layer ${L} slot 0's captured petal does not bit-match builtFull.petals[${idx}]`);
            } else {
              const dth = slot.azimuth - az0;
              const wantMid = rot(slot0Mid, dth), wantTip = rot(slot0Tip, dth);
              if (!near(wantMid, p.mid, ROT_TOL) || !near(wantTip, p.tip, ROT_TOL)) bad.push(`solid R3: layer ${L} slot ${slot.index} does not sit at slot 0 rigidly rotated by ${((dth * 180) / Math.PI).toFixed(3)} deg`);
            }
          },
        });
      }
    }
    const petalTris = petalAccs.reduce((s, a) => s + a.triangleCount, 0);
    if (petalTris + accHC.triangleCount + accST.triangleCount !== accFull.triangleCount) bad.push(`solid R1: petals-only (${petalTris}) + hub-only (${accHC.triangleCount}) + stamens-only (${accST.triangleCount}) tris = ${petalTris + accHC.triangleCount + accST.triangleCount}, but a whole-bloom build has ${accFull.triangleCount}`);
    if (petalsBuilt !== builtFull.petalsBuilt) bad.push(`solid R2: captured ${petalsBuilt} petals but builtFull.petalsBuilt is ${builtFull.petalsBuilt}`);
    if (bad.length) return { bad };

    /* The soup, relative to the centre; the per-petal plan bboxes for R5. */
    const centre = [0, 0, flat ? 0 : dome.centreZ];
    const Rd = flat ? Infinity : dome.Rd;
    let total = 0, zTop = -Infinity;
    for (const a of petalAccs) { total += a.positions.length; for (let i = 2; i < a.positions.length; i += 3) if (a.positions[i] > zTop) zTop = a.positions[i]; }
    const P = new Float64Array(total);
    let w = 0;
    const petals = petalAccs.map((acc) => {
      const Q = acc.positions;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < Q.length; i += 3) {
        P[w++] = Q[i]; P[w++] = Q[i + 1]; P[w++] = Q[i + 2] - centre[2];
        if (Q[i] < minX) minX = Q[i]; if (Q[i] > maxX) maxX = Q[i];
        if (Q[i + 1] < minY) minY = Q[i + 1]; if (Q[i + 1] > maxY) maxY = Q[i + 1];
      }
      return { P: Q, minX, maxX, minY, maxY };
    });
    /* An INDEPENDENT, vertex-based sanity number for each pole: the nearest
       any petal VERTEX comes to the pole's half of the axis. A bound, not the
       reading (a triangle can cross the axis between its vertices), printed
       beside the bald cone so a reader can see the two agree in scale. */
    let nearFace = Infinity, nearRes = Infinity;
    for (let i = 0; i < P.length; i += 3) { const d = Math.hypot(P[i], P[i + 1]); if (P[i + 2] > 0) { if (d < nearFace) nearFace = d; } else if (d < nearRes) nearRes = d; }
    /* THE DESIGNED CENTRE'S FOOTPRINT was read here from the builder's own
       report (its cone half-angle and solid angle at the face pole, the
       plate the phase-2 question was about — 24.5 mm radius on the 240-foot
       row). The centre rig is retired (session 20) and the apex is bare, so
       there is no plate to report; `rC` stays null and the plate line is
       absent, never a number under a label naming nothing. The androecium's
       footprint at the face pole is B2's number. */
    const rC = null;
    const plateRad = rC != null && !flat ? Math.asin(Math.min(1, rC / Rd)) : null;

    /* ---------------- R5: THE PARALLEL-RAY IDENTITY ---------------- */
    /* (a) this kernel with vertical rays against a VERBATIM copy of the plan
       raster's 2D test, on the plan raster's own grid, EXACTLY. The grid is
       the plan raster's: n cells across 2 R0, centres at -R0 + (i + 0.5) cell,
       the disc r <= R0, where R0 is hub.radius (the plan raster's own R0). */
    const sign = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const inTri = (px, py, ax, ay, bx, by, cx, cy) => {
      const d1 = sign(px, py, ax, ay, bx, by), d2 = sign(px, py, bx, by, cx, cy), d3 = sign(px, py, cx, cy, ax, ay);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(neg && pos);
    };
    const covered2D = (x, y) => {
      for (const pet of petals) {
        if (x < pet.minX || x > pet.maxX || y < pet.minY || y > pet.maxY) continue;
        const Q = pet.P;
        for (let i = 0; i < Q.length; i += 9) if (inTri(x, y, Q[i], Q[i + 1], Q[i + 3], Q[i + 4], Q[i + 6], Q[i + 7])) return true;
      }
      return false;
    };
    const R0 = hub.radius;
    const planGrid = (n) => {
      const cell = (2 * R0) / n;
      let tot = 0, unc3 = 0, unc2 = 0, bald3 = R0, bald2 = R0, mismatch = 0;
      const zt = zTop + 1;
      for (let i = 0; i < n; i++) {
        const x = -R0 + (i + 0.5) * cell;
        for (let j = 0; j < n; j++) {
          const y = -R0 + (j + 0.5) * cell;
          const r = Math.hypot(x, y);
          if (r > R0) continue;
          tot++;
          let c3 = false;
          for (const pet of petals) if (hitVertical(pet, x, y, zt)) { c3 = true; break; }
          const c2 = covered2D(x, y);
          if (c3 !== c2) mismatch++;
          if (!c3) unc3++; else if (r < bald3) bald3 = r;
          if (!c2) unc2++; else if (r < bald2) bald2 = r;
        }
      }
      return { n, cell, tot, unc3, unc2, mismatch, uncoveredFraction3: tot ? unc3 / tot : 1, uncoveredFraction2: tot ? unc2 / tot : 1, bald3: unc3 === tot ? R0 : bald3, bald2: unc2 === tot ? R0 : bald2 };
    };
    const nPlan = plan && plan.refinedTo ? plan.refinedTo : 220;
    const pg = planGrid(nPlan);
    if (pg.mismatch !== 0) bad.push(`solid R5(a): the 3D kernel with vertical rays disagrees with the plan raster's 2D test on ${pg.mismatch} of ${pg.tot} cells at n ${pg.n}`);
    if (plan && plan.refinedTo) {
      /* (b) against the SHIPPED plan raster's own returned numbers. */
      if (pg.uncoveredFraction3 !== plan.uncoveredFraction) bad.push(`solid R5(b): vertical rays read uncoveredFraction ${pg.uncoveredFraction3} on the plan grid (n ${pg.n}); the shipped plan raster returned ${plan.uncoveredFraction}`);
      if (pg.bald3 !== plan.baldCapRadius) bad.push(`solid R5(b): vertical rays read baldCapRadius ${pg.bald3} mm; the shipped plan raster returned ${plan.baldCapRadius}`);
    }
    const tR5done = performance.now();

    if (flat) return { bad, r: null, flat: true, r5: { n: pg.n, cells: pg.tot, mismatch: pg.mismatch, againstShipped: !!(plan && plan.refinedTo) }, skipped: `FLAT HUB (head rise 0, no sphere): a flat hub has no centre to cast from — the plan raster is the parallel-ray limit of this instrument and is the one that reads it (R5 still ran here: ${pg.mismatch} of ${pg.tot} cells differ${plan && plan.refinedTo ? ', equal to the shipped plan raster to the bit' : ''})` };
    const tIndex = performance.now();
    const bins = buildIndex(P);
    const tIndexed = performance.now();
    const covered = (dx, dy, dz) => hitDir(P, bins, dx, dy, dz);

    /* ---------------- THE RASTER ---------------- */
    const rimPhi = closed ? Math.PI : Math.asin(Math.min(1, hub.radius / Rd));
    const raster = (nPhi, nTh, wantMaskHere) => {
      const dphi = Math.PI / nPhi, dth = (2 * Math.PI) / nTh;
      let W = 0, U = 0, Wcap = 0, Ucap = 0, Uplate = 0, Wplate = 0;
      let faceBald = Math.PI, resBald = Math.PI;
      const mask = new Uint8Array(nPhi * nTh);
      for (let i = 0; i < nPhi; i++) {
        const phi = (i + 0.5) * dphi, sp = Math.sin(phi), cp = Math.cos(phi), wgt = sp * dphi * dth;
        for (let j = 0; j < nTh; j++) {
          const th = (j + 0.5) * dth - Math.PI;
          const c = covered(sp * Math.cos(th), sp * Math.sin(th), cp);
          mask[i * nTh + j] = c ? 1 : 0;
          W += wgt; if (!c) U += wgt;
          if (phi <= rimPhi) { Wcap += wgt; if (!c) Ucap += wgt; }
          if (plateRad != null && phi <= plateRad) { Wplate += wgt; if (!c) Uplate += wgt; }
          if (c) { if (phi < faceBald) faceBald = phi; if (Math.PI - phi < resBald) resBald = Math.PI - phi; }
        }
      }
      /* The CONNECTED uncovered region at each pole: flood fill from the
         pole's own row, 4-neighbour with the theta wrap. */
      const region = (fromRow) => {
        const seen = new Uint8Array(nPhi * nTh);
        const stack = [];
        for (let j = 0; j < nTh; j++) if (!mask[fromRow * nTh + j]) { seen[fromRow * nTh + j] = 1; stack.push(fromRow * nTh + j); }
        let sr = 0, farthest = fromRow === 0 ? 0 : Math.PI;
        while (stack.length) {
          const k = stack.pop(); const i = Math.floor(k / nTh), j = k - i * nTh;
          const phi = (i + 0.5) * dphi;
          sr += Math.sin(phi) * dphi * dth;
          if (fromRow === 0) farthest = Math.max(farthest, phi); else farthest = Math.min(farthest, phi);
          const nb = [[i - 1, j], [i + 1, j], [i, (j + 1) % nTh], [i, (j - 1 + nTh) % nTh]];
          for (const [ii, jj] of nb) { if (ii < 0 || ii >= nPhi) continue; const kk = ii * nTh + jj; if (seen[kk] || mask[kk]) continue; seen[kk] = 1; stack.push(kk); }
        }
        return { sr, reachDeg: fromRow === 0 ? (farthest * 180) / Math.PI : ((Math.PI - farthest) * 180) / Math.PI };
      };
      const fRegion = region(0), rRegion = region(nPhi - 1);
      return {
        nPhi, nTh, cellDeg: (dphi * 180) / Math.PI,
        uncoveredFraction: U / W, uncoveredSr: U, totalSr: W,
        capUncovered: closed ? null : (Wcap > 0 ? Ucap / Wcap : null), capSr: Wcap,
        plate: plateRad != null ? { rC, halfDeg: (plateRad * 180) / Math.PI, sr: Wplate, uncoveredSr: Uplate, uncoveredFraction: Wplate > 0 ? Uplate / Wplate : null, openOutsideSr: U - Uplate } : null,
        face: { baldDeg: (faceBald * 180) / Math.PI, baldRad: faceBald, regionSr: fRegion.sr, regionReachDeg: fRegion.reachDeg },
        reserved: { baldDeg: (resBald * 180) / Math.PI, baldRad: resBald, regionSr: rRegion.sr, regionReachDeg: rRegion.reachDeg },
        mask: wantMaskHere ? mask : null,
      };
    };
    const coarse = raster(360, 720, false);
    const fine = raster(720, 1440, wantMask);
    const tRaster = performance.now();
    const tR5 = tRaster + (tR5done - tIndex);   // R5's own span, for the cost line
    /* R4 */
    if (Math.abs(fine.uncoveredFraction - coarse.uncoveredFraction) > 0.01) bad.push(`solid R4: uncoveredFraction reads ${fine.uncoveredFraction.toFixed(4)} at ${fine.cellDeg.toFixed(2)} deg and ${coarse.uncoveredFraction.toFixed(4)} at ${coarse.cellDeg.toFixed(2)} deg — more than 1% apart`);
    for (const pole of ['face', 'reserved']) {
      if (Math.abs(fine[pole].baldDeg - coarse[pole].baldDeg) > 2 * coarse.cellDeg) bad.push(`solid R4: the ${pole} pole's bald angle reads ${fine[pole].baldDeg.toFixed(2)} deg fine and ${coarse[pole].baldDeg.toFixed(2)} deg coarse — more than two coarse cells apart`);
    }

    /* ---------------- THE MAPPED COMPARISON (reported, not asserted) ---------------- */
    let mapped = null;
    if (!closed && wantMapped) {
      const nPhi = 720, nTh = 1440, dphi = Math.PI / nPhi, dth = (2 * Math.PI) / nTh;
      let W = 0, agree = 0, uC = 0, uP = 0;
      /* WHERE the disagreement lives: 15-degree bands of polar angle from
         the face pole, each with its own agreement and the two uncovered
         shares, so the report can say whether the two instruments part
         company at the crown or at the rim. */
      const BAND = 15, nb = Math.ceil(90 / BAND);
      const bands = Array.from({ length: nb }, (_, k) => ({ fromDeg: k * BAND, toDeg: Math.min(90, (k + 1) * BAND), W: 0, agree: 0, uC: 0, uP: 0 }));
      for (let i = 0; i < nPhi; i++) {
        const phi = (i + 0.5) * dphi; if (phi > rimPhi) break;
        const sp = Math.sin(phi), cp = Math.cos(phi), wgt = sp * dphi * dth;
        const band = bands[Math.min(nb - 1, Math.floor(((phi * 180) / Math.PI) / BAND))];
        for (let j = 0; j < nTh; j++) {
          const th = (j + 0.5) * dth - Math.PI;
          const c = fine.mask ? fine.mask[i * nTh + j] === 1 : covered(sp * Math.cos(th), sp * Math.sin(th), cp);
          const x = Rd * sp * Math.cos(th), y = Rd * sp * Math.sin(th);
          const p = covered2D(x, y);
          W += wgt; band.W += wgt;
          if (c === p) { agree += wgt; band.agree += wgt; }
          if (!c) { uC += wgt; band.uC += wgt; }
          if (!p) { uP += wgt; band.uP += wgt; }
        }
      }
      mapped = {
        agree: agree / W, uncoveredCentral: uC / W, uncoveredPlanMapped: uP / W, rimDeg: (rimPhi * 180) / Math.PI,
        bands: bands.filter((b) => b.W > 0).map((b) => ({ fromDeg: b.fromDeg, toDeg: b.toDeg, agree: b.agree / b.W, uncoveredCentral: b.uC / b.W, uncoveredPlanMapped: b.uP / b.W })),
      };
    }
    const tEnd = performance.now();

    const ms = { build: tIndex - t0 - (tR5done - tIndex), index: tIndexed - tIndex, raster: tRaster - tIndexed, r5: tR5done - tIndex, mapped: tEnd - tRaster, total: tEnd - t0 };
    const asciiFrom = (m, nPhi, nTh) => {
      const rows = [];
      const si = Math.max(1, Math.round(nPhi / 36)), sj = Math.max(1, Math.round(nTh / 96));
      for (let i = 0; i < nPhi; i += si) { let line = ''; for (let j = 0; j < nTh; j += sj) line += m[i * nTh + j] ? '#' : '.'; rows.push(line); }
      return rows;
    };
    return {
      bad,
      r: {
        n: petalsBuilt, tris: P.length / 9, Rd, centreZ: centre[2], closed, R0, rimDeg: (rimPhi * 180) / Math.PI,
        clamped: !!dome.clamped, riseBuilt: dome.riseBuilt,
        uncoveredFraction: fine.uncoveredFraction, uncoveredSr: fine.uncoveredSr, totalSr: fine.totalSr,
        capUncovered: fine.capUncovered, capSr: fine.capSr,
        face: { ...fine.face, baldSr: 2 * Math.PI * (1 - Math.cos(fine.face.baldRad)), baldChordMm: Rd * Math.sin(fine.face.baldRad), regionEqDeg: (Math.acos(1 - fine.face.regionSr / (2 * Math.PI)) * 180) / Math.PI },
        reserved: { ...fine.reserved, baldSr: 2 * Math.PI * (1 - Math.cos(fine.reserved.baldRad)), baldChordMm: Rd * Math.sin(fine.reserved.baldRad), regionEqDeg: (Math.acos(1 - fine.reserved.regionSr / (2 * Math.PI)) * 180) / Math.PI },
        plate: fine.plate,
        axisNearest: { faceMm: nearFace, reservedMm: nearRes },
        coarse: { uncoveredFraction: coarse.uncoveredFraction, faceBaldDeg: coarse.face.baldDeg, reservedBaldDeg: coarse.reserved.baldDeg },
        cellDeg: fine.cellDeg, coarseCellDeg: coarse.cellDeg,
        r5: { n: pg.n, cells: pg.tot, mismatch: pg.mismatch, uncoveredFraction: pg.uncoveredFraction3, baldCapRadius: pg.bald3, againstShipped: !!(plan && plan.refinedTo) },
        mapped,
        ms,
        ascii: wantMask && fine.mask ? asciiFrom(fine.mask, fine.nPhi, fine.nTh) : null,
      },
    };
  }, { capability, wantMask, mutate, plan, mapped, suppressR0 });
}


/* ===================================================================
   R6 — CLOSED-FORM CALIBRATION OF THE MEASURE (Eva, session 19: "R5
   validates the kernel against the shipped tool on identical rays; it says
   nothing about bin resolution, solid-angle weighting, the theta seam or
   pole handling — and every pin is stated in steradians"). Run ONCE per
   process, before any row, through the SAME installed kernel and the same
   grids the rows use. Every clause is a hard abort; the tolerances are
   stated here and the actual errors are returned so they can be printed.
     R6a  the sample cells' solid angles sum to 4 pi on BOTH grids —
          tolerance 1e-5 relative (the midpoint rule on sin phi at 0.25 deg
          is good to ~1e-6; 1e-5 is one order of headroom, not a fudge).
     R6b  a CLOSED synthetic sphere (a 48 x 24 UV sphere of radius 5 about
          the origin, 2,208 triangles) reads EXACTLY 0 sr open on the fine
          grid — tolerance 0: the cone test is edge-inclusive and adjacent
          triangles' shared-edge products are exact negations, so a hairline
          at a seam is a defect, never rounding.
     R6c  three meshes subtending a KNOWN cone — a 360-triangle disc fan of
          half-angle 20 deg at distance 10, aimed at the +z POLE, at the
          theta = +/-pi SEAM (-x), and OFF-AXIS at 45 deg — each read within
          0.5% of its analytic solid angle. The analytic value is the exact
          sum of Van Oosterom–Strackee per triangle (a fan seen from the axis
          never overlaps itself), printed beside the ideal cone's
          2 pi (1 - cos 20 deg); the 0.5% covers the raster's boundary
          sampling at 0.25 deg. AND, for each: the cone's own axis direction
          reads covered and its antipode reads uncovered, which is what makes
          this the witness for the antipode and inward mutations with R0
          suppressed, and the seam cone the witness for the wrap mutation.
   =================================================================== */
export async function calibrate(page, { mutate = null } = {}) {
  await installKernel(page);
  return page.evaluate(({ mutate }) => {
    const { buildIndex, hitDir } = window.__solidKernel(mutate);
    const bad = [];
    const cal = {};
    /* R6a */
    const cellSum = (nPhi, nTh) => { const dphi = Math.PI / nPhi, dth = (2 * Math.PI) / nTh; let W = 0; for (let i = 0; i < nPhi; i++) W += Math.sin((i + 0.5) * dphi) * dphi * dth * nTh; return W; };
    cal.r6a = [[360, 720], [720, 1440]].map(([a, b]) => { const W = cellSum(a, b); return { nPhi: a, nTh: b, sum: W, relErr: Math.abs(W - 4 * Math.PI) / (4 * Math.PI) }; });
    for (const g of cal.r6a) if (!(g.relErr <= 1e-5)) bad.push(`solid R6a: the ${g.nPhi} x ${g.nTh} grid's cell solid angles sum to ${g.sum} sr, not 4 pi (relative error ${g.relErr.toExponential(2)} > 1e-5)`);
    /* the raster over a soup, on the fine grid: open steradians */
    const openSr = (P, bins) => {
      const nPhi = 720, nTh = 1440, dphi = Math.PI / nPhi, dth = (2 * Math.PI) / nTh;
      let U = 0, C = 0;
      for (let i = 0; i < nPhi; i++) {
        const phi = (i + 0.5) * dphi, sp = Math.sin(phi), cp = Math.cos(phi), w = sp * dphi * dth;
        for (let j = 0; j < nTh; j++) { const th = (j + 0.5) * dth - Math.PI; if (hitDir(P, bins, sp * Math.cos(th), sp * Math.sin(th), cp)) C += w; else U += w; }
      }
      return { open: U, covered: C };
    };
    /* R6b */
    {
      const NT = 48, NP = 24, R = 5, T = [];
      const pt = (i, j) => { const ph = (i * Math.PI) / NP, th = (j * 2 * Math.PI) / NT; return [R * Math.sin(ph) * Math.cos(th), R * Math.sin(ph) * Math.sin(th), R * Math.cos(ph)]; };
      for (let i = 0; i < NP; i++) for (let j = 0; j < NT; j++) {
        const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
        /* At the north ring a === d (the pole) and at the south ring b === c,
           so each pole ring is ONE triangle, the other being degenerate. The
           first draft had these two conditions SWAPPED, emitting the
           degenerate one and skipping the real one at both poles, and the
           measure read the two 7.5-degree holes at 0.107507 sr — exactly
           4 pi (1 - cos 7.5 deg) = 0.107507 sr. A calibration fixture is
           itself a claim; that reading is what checked it. */
        if (i < NP - 1) T.push(...a, ...b, ...c);
        if (i > 0) T.push(...a, ...c, ...d);
      }
      const P = Float64Array.from(T); const bins = buildIndex(P);
      const r = openSr(P, bins);
      cal.r6b = { tris: P.length / 9, openSr: r.open };
      if (!(r.open === 0)) bad.push(`solid R6b: a closed synthetic sphere reads ${r.open} sr open on the fine grid — the measure leaks (a seam, a pole, or the cone test)`);
    }
    /* R6c */
    {
      const alpha = (20 * Math.PI) / 180, dist = 10, rad = dist * Math.tan(alpha);
      const vos = (a, b, c) => { const la = Math.hypot(...a), lb = Math.hypot(...b), lc = Math.hypot(...c);
        const num = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
        const den = la * lb * lc + (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * lc + (a[0] * c[0] + a[1] * c[1] + a[2] * c[2]) * lb + (b[0] * c[0] + b[1] * c[1] + b[2] * c[2]) * la;
        return Math.abs(2 * Math.atan2(num, den)); };
      const frameTo = (ax) => { const z = ax; const up = Math.abs(z[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; const x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; const lx = Math.hypot(...x); x[0] /= lx; x[1] /= lx; x[2] /= lx; const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]; return (u, v, w) => [u * x[0] + v * y[0] + w * z[0], u * x[1] + v * y[1] + w * z[1], u * x[2] + v * y[2] + w * z[2]]; };
      /* THE SEAM CONE IS A COARSE FAN ON PURPOSE (12 triangles, one of them
         CENTRED on theta = +/-pi): a fine fan has no triangle that straddles
         the seam by more than half a degree, so every sample still falls in
         a triangle whose bins sit on its own side and a lost wrap changes
         nothing — measured: the 360-triangle seam cone read 0.011% under the
         wrap mutation and witnessed nothing. With a 30-degree triangle
         across the seam the lost half of its bins is a whole 15 degrees of
         azimuth, and the cone reads short by a few percent. The analytic
         sum is exact for any polygon, so the coarseness costs nothing. */
      const cones = [['+z (the pole)', [0, 0, 1], 360, 0], ['-x (the theta seam)', [-1, 0, 0], 12, 0.5], ['45 deg off-axis', [Math.SQRT1_2, 0, Math.SQRT1_2], 360, 0]];
      cal.r6c = [];
      for (const [name, ax, N, half] of cones) {
        const M = frameTo(ax); const centre = M(0, 0, dist); const T = []; let analytic = 0;
        for (let k = 0; k < N; k++) {
          const t0 = ((k + half) * 2 * Math.PI) / N, t1 = ((k + 1 + half) * 2 * Math.PI) / N;
          const b = M(rad * Math.cos(t0), rad * Math.sin(t0), dist), c = M(rad * Math.cos(t1), rad * Math.sin(t1), dist);
          T.push(...centre, ...b, ...c); analytic += vos(centre, b, c);
        }
        const P = Float64Array.from(T); const bins = buildIndex(P);
        const r = openSr(P, bins);
        const ideal = 2 * Math.PI * (1 - Math.cos(alpha));
        const axisHit = hitDir(P, bins, ax[0], ax[1], ax[2]), antiHit = hitDir(P, bins, -ax[0], -ax[1], -ax[2]);
        const relErr = Math.abs(r.covered - analytic) / analytic;
        cal.r6c.push({ name, N, analytic, ideal, measured: r.covered, relErr, axisHit, antiHit });
        if (!(relErr <= 0.005)) bad.push(`solid R6c: the ${name} cone reads ${r.covered.toFixed(5)} sr covered against an analytic ${analytic.toFixed(5)} sr (relative error ${(relErr * 100).toFixed(3)}% > 0.5%)${name.includes('seam') ? ' — the theta seam' : ''}`);
        if (axisHit !== true) bad.push(`solid R6c: the ${name} cone's own axis direction reads UNCOVERED — the kernel casts the wrong way`);
        if (antiHit !== false) bad.push(`solid R6c: the ${name} cone's ANTIPODE reads COVERED — the kernel counts the antipode (the central version of the false clean)`);
      }
    }
    return { bad, cal };
  }, { mutate });
}

export function calibrationLine(cal) {
  return `R6a cell sum: ${cal.r6a.map((g) => `${g.nPhi}x${g.nTh} ${g.sum.toFixed(8)} sr (rel err ${g.relErr.toExponential(2)}, tol 1e-5)`).join(' · ')}`
    + `\n    R6b closed sphere (${cal.r6b.tris} tris): ${cal.r6b.openSr} sr open (tol 0)`
    + `\n    R6c known cones (tol 0.5%): ` + cal.r6c.map((c) => `${c.name} (${c.N}-triangle fan): measured ${c.measured.toFixed(5)} sr vs analytic ${c.analytic.toFixed(5)} (ideal cone ${c.ideal.toFixed(5)}), err ${(c.relErr * 100).toFixed(3)}%, axis ${c.axisHit ? 'covered' : 'OPEN'}, antipode ${c.antiHit ? 'COVERED' : 'open'}`).join(' · ');
}

const f = (v, d = 2) => (v == null || !isFinite(v) ? 'n/a' : v.toFixed(d));

export function solidLine(r) {
  return `feet/petals ${r.n} · ${r.tris} petal tris · ${r.closed ? 'SPHERE' : 'CAP'} R ${f(r.Rd)} mm, centre z ${f(r.centreZ)}${r.clamped ? ' (CLAMPED)' : ''}${r.closed ? '' : ` · rim at polar ${f(r.rimDeg, 1)}°`}`
    + ` · UNCOVERED ${f(r.uncoveredFraction * 100, 2)}% of 4π (${f(r.uncoveredSr, 3)} sr)`
    + (r.capUncovered != null ? ` · within the cap's ${f(r.capSr, 3)} sr: ${f(r.capUncovered * 100, 2)}% uncovered` : '')
    + `\n    FACE pole: bald cone ${f(r.face.baldDeg, 2)}° (${f(r.face.baldSr, 4)} sr, chord radius ${f(r.face.baldChordMm)} mm on the sphere) · connected open region ${f(r.face.regionSr, 4)} sr (≡ a ${f(r.face.regionEqDeg, 2)}° cone, reaching ${f(r.face.regionReachDeg, 1)}° from the pole)`
    + `\n    RESERVED pole: bald cone ${f(r.reserved.baldDeg, 2)}° (${f(r.reserved.baldSr, 4)} sr, chord radius ${f(r.reserved.baldChordMm)} mm) · connected open region ${f(r.reserved.regionSr, 4)} sr (≡ a ${f(r.reserved.regionEqDeg, 2)}° cone)`
    + `\n    nearest petal VERTEX to the axis (a bound, not the reading): face half ${f(r.axisNearest.faceMm)} mm · reserved half ${f(r.axisNearest.reservedMm)} mm`
    + (r.plate ? `\n    THE DESIGNED CENTRE (not in the soup): footprint radius ${f(r.plate.rC)} mm = a ${f(r.plate.halfDeg, 1)}° cone about the face pole, ${f(r.plate.sr, 3)} sr · of which ${f(r.plate.uncoveredFraction * 100, 2)}% (${f(r.plate.uncoveredSr, 4)} sr) is open to the petals · open OUTSIDE the plate's cone: ${f(r.plate.openOutsideSr, 4)} sr` : '')
    + `\n    R4: coarse ${f(r.coarse.uncoveredFraction * 100, 2)}% / face ${f(r.coarse.faceBaldDeg, 2)}° / reserved ${f(r.coarse.reservedBaldDeg, 2)}° at ${f(r.coarseCellDeg, 2)}° against ${f(r.cellDeg, 2)}°`
    + ` · R5: ${r.r5.mismatch} of ${r.r5.cells} cells differ at n ${r.r5.n}${r.r5.againstShipped ? ' — and equal to the shipped plan raster to the bit' : ' (the shipped plan raster skips this row; clause (a) only)'}`
    + (r.mapped ? `\n    MAPPED (Eva's check, reported): inside the rim, central ray vs the plan raster mapped through the sphere AGREE on ${f(r.mapped.agree * 100, 2)}% of the solid angle · uncovered: central ${f(r.mapped.uncoveredCentral * 100, 2)}% vs plan-mapped ${f(r.mapped.uncoveredPlanMapped * 100, 2)}%`
      + `\n      by polar band from the face pole: ` + r.mapped.bands.map((b) => `${b.fromDeg}–${b.toDeg}° agree ${f(b.agree * 100, 1)}% (central ${f(b.uncoveredCentral * 100, 1)}% / plan ${f(b.uncoveredPlanMapped * 100, 1)}% open)`).join(' · ') : '')
    + `\n    cost: build ${f(r.ms.build, 0)} ms · index ${f(r.ms.index, 0)} ms · raster (both grids) ${f(r.ms.raster, 0)} ms · R5 ${f(r.ms.r5, 0)} ms · mapped ${f(r.ms.mapped, 0)} ms · total ${f(r.ms.total / 1000, 2)} s`;
}

/* THE ASSERTION, on rows that declare `solidCoverage: {...}` in
   buildMatrix()'s block 22 — the rows and the numbers are Eva's ruling
   (session 19), recorded in docs/bloom-session-19-outcome.md with the
   headroom of every pin. */
export function solidAssert(r, want) {
  const bad = [];
  if (want.maxUncovered != null && !(r.uncoveredFraction <= want.maxUncovered)) bad.push(`SOLID COVERAGE: ${(r.uncoveredFraction * 100).toFixed(2)}% of 4π is uncovered, this row allows ${(want.maxUncovered * 100).toFixed(2)}%`);
  if (want.maxFaceBaldDeg != null && !(r.face.baldDeg <= want.maxFaceBaldDeg)) bad.push(`SOLID COVERAGE: the face pole's bald cone is ${r.face.baldDeg.toFixed(2)}°, this row allows ${want.maxFaceBaldDeg}°`);
  if (want.maxReservedBaldDeg != null && !(r.reserved.baldDeg <= want.maxReservedBaldDeg)) bad.push(`SOLID COVERAGE: the reserved pole's bald cone is ${r.reserved.baldDeg.toFixed(2)}°, this row allows ${want.maxReservedBaldDeg}°`);
  if (want.maxFaceRegionSr != null && !(r.face.regionSr <= want.maxFaceRegionSr)) bad.push(`SOLID COVERAGE: the face pole's open region is ${r.face.regionSr.toFixed(4)} sr, this row allows ${want.maxFaceRegionSr}`);
  if (want.maxReservedRegionSr != null && !(r.reserved.regionSr <= want.maxReservedRegionSr)) bad.push(`SOLID COVERAGE: the reserved pole's open region is ${r.reserved.regionSr.toFixed(4)} sr, this row allows ${want.maxReservedRegionSr}`);
  return bad;
}

/* THE MARGINS, VISIBLE (Eva): for every pin a row declares, the reading,
   the threshold and the headroom between them as a percentage of the
   threshold — printed by the gate on every asserted row so a pin that is
   quietly being approached is seen before it trips. */
export function solidHeadroom(r, want) {
  const rows = [];
  const add = (name, reading, bound, unit) => { if (bound == null) return; const head = bound > 0 ? ((bound - reading) / bound) * 100 : (reading <= bound ? 0 : -Infinity); rows.push(`${name} ${reading.toFixed(4)}${unit} / bound ${bound}${unit} / headroom ${head.toFixed(1)}%`); };
  add('uncovered', r.uncoveredFraction, want.maxUncovered, '');
  add('face bald', r.face.baldDeg, want.maxFaceBaldDeg, '°');
  add('face region', r.face.regionSr, want.maxFaceRegionSr, ' sr');
  add('reserved bald', r.reserved.baldDeg, want.maxReservedBaldDeg, '°');
  add('reserved region', r.reserved.regionSr, want.maxReservedRegionSr, ' sr');
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const wantMask = process.argv.includes('--ascii');
  const NEG = process.argv.includes('--negative-control');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const configs = onlyArg ? CONFIGS.filter(([l]) => new RegExp(onlyArg.slice(7)).test(l)) : CONFIGS;
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage();
  const validity = [];
  console.log('bloom SOLID-ANGLE coverage — wired into the export gate on the rows Eva pinned (session 19); this is the standalone run.\n');
  await openBloom(page, port);
  {
    const { bad, cal } = await calibrate(page);
    console.log(`  CALIBRATION (R6)\n    ${calibrationLine(cal)}`);
    if (bad.length) { await browser.close(); server.close(); console.error(`\nHARNESS INVALID — the calibration failed:`); for (const b of bad) console.error(`  - ${b}`); process.exit(1); }
  }
  if (NEG) {
    /* THE WITNESS TABLE (Eva, session 19: "the negative control needs
       witnesses, not just failures"). Each kernel mutation is run THREE ways
       on one cheap hemisphere row: with every check on (the first family to
       fire), with R0 SUPPRESSED through measure() (what a row would see),
       and through calibrate(), which has no R0 at all (its named clause). A
       mutation must be caught in the first column AND name a witness in the
       third; the second column is reported as it is, because on a real row
       a broken kernel changes the READING and not a validity check — which
       is exactly why R6 runs before any row. */
    const cfg = { headRise: 1 };
    const want = [
      ['antipode', /R0:.*(antipode|sees nothing)/, /R6c:.*ANTIPODE reads COVERED/],
      ['inward', /R0:/, /R6c:.*axis direction reads UNCOVERED/],
      ['no-wrap', /R0:.*(seam|wrap)/, /R6c:.*seam/],
    ];
    let ok = true;
    const table = [];
    for (const [mutate, reR0, reR6] of want) {
      await openBloom(page, port);
      const bad0 = await applyConfig(page, set(cfg));
      if (bad0.length) { console.error(`negative control ${mutate}: config did not take`); ok = false; continue; }
      const full = await measure(page, { mutate, mapped: false });
      const sup = await measure(page, { mutate, mapped: false, suppressR0: true });
      const cal = await calibrate(page, { mutate });
      const c1 = full.bad.some((b) => reR0.test(b)), c3 = cal.bad.some((b) => reR6.test(b));
      const first = (bad) => (bad.length ? bad[0].split(':')[0] + (bad[0].includes('R6c') ? ' (' + (bad[0].match(/the (.*?) cone/) || ['', '?'])[1] + ')' : '') : 'silent');
      table.push({ mutate, withR0: first(full.bad), r0Suppressed: sup.bad.length ? first(sup.bad) : (sup.r ? `silent — reads ${(sup.r.uncoveredFraction * 100).toFixed(2)}% open (face ${sup.r.face.baldDeg.toFixed(2)}°)` : 'silent'), witness: c3 ? cal.bad.filter((b) => reR6.test(b)).map((b) => first([b])).join(' + ') : '**NONE**' });
      if (!c1 || !c3) ok = false;
    }
    console.log('\n  mutation   | every check on (first to fire) | R0 suppressed, on the row | witness with no R0 (calibrate)');
    for (const t of table) console.log(`  ${t.mutate.padEnd(10)} | ${t.withR0.padEnd(30)} | ${t.r0Suppressed.padEnd(25)} | ${t.witness}`);
    await browser.close(); server.close();
    console.log(ok ? '\nNEGATIVE CONTROL: PASS — every mutation is caught with every check on AND names its own witness with R0 out of the way.' : '\nNEGATIVE CONTROL: **FAIL**');
    process.exit(ok ? 0 : 1);
  }
  for (const [label, cfg] of configs) {
    await openBloom(page, port);
    const bad0 = await applyConfig(page, set(cfg));
    if (bad0.length) { validity.push(`${label}: ${bad0.join('; ')}`); continue; }
    const drift = await fullStateDrift(page, set(cfg));
    if (drift.length) { validity.push(`${label}: ${drift.join('; ')}`); continue; }
    /* The SHIPPED plan raster first, on the same page and state, so R5(b)
       can compare against its own returned numbers (it skips spheres and
       flat rows are skipped by this tool, so (b) runs on cap rows). */
    const planRes = await planMeasure(page, {});
    if (planRes.bad && planRes.bad.length) { validity.push(`${label}: (plan raster) ${planRes.bad.join('; ')}`); continue; }
    const { bad, r, skipped } = await measure(page, { wantMask, plan: planRes.r });
    if (bad.length) { validity.push(`${label}: ${bad.join('; ')}`); continue; }
    if (skipped) { console.log(`  ${label}\n    SOLID COVERAGE: SKIPPED — ${skipped}`); continue; }
    console.log(`  ${label}\n    ${solidLine(r)}`);
    if (planRes.r) console.log(`    (plan raster on the same page: UNCOVERED ${(planRes.r.uncoveredFraction * 100).toFixed(1)}% of disc · bald-cap ${planRes.r.baldCapRadius.toFixed(2)} mm · n ${planRes.r.refinedTo})`);
    else if (planRes.skipped) console.log(`    (plan raster on the same page: SKIPPED — ${planRes.skipped.split(':')[0]})`);
    if (wantMask && r.ascii) console.log(r.ascii.map((l) => '    ' + l).join('\n') + '\n');
  }
  await browser.close(); server.close();
  if (validity.length) {
    console.error(`\nHARNESS INVALID — ${validity.length} validity assertion(s) failed:`);
    for (const v of validity) console.error(`  - ${v}`);
    process.exit(1);
  }
}
