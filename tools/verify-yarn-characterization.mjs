#!/usr/bin/env node
/* ---------------------------------------------------
   verify-yarn-characterization.mjs — the gate for the Yarn
   Characterization field note (yarn-characterization.html).

   Part one (Node, seconds) drives yarn-count.js's pure functions:
     YC1  conversions against numbers WORKED BY HAND from each unit's
          own definition — never against the module's constants, so a
          wrong constant cannot agree with itself
     YC2  every unit round-trips through tex, and the two families run
          in opposite directions
     YC3  the spec parser on a written-down table (plies, total tex,
          filaments, dpf, process, fibre, resultant) and on refusals
     YC4  the filament diameter against d = √(4·m/(π·ρ)) restated here
     YT1-4 §03 (yarn-twist.js): the twist multipliers from their
          definitions, the surface angle restated (tan θ = π d T), the
          schematic strength curves' shape, the usual-use bands
     YS1-4 §04 (yarn-strength.js): tenacity units from standard gravity,
          every curve ends at its own (Eb, Tb), the levers' directions,
          the weak place, work of rupture by an independent integral,
          and the weakest link against tabled order statistics
     YF1-3 §05 (yarn-fineness.js): fineness restated, the geometry's
          exponents at fixed total denier, the circle packing

   Part two (--browser) drives the real page at 1280 and 390 px:
     YP1  the converter: typing in one row rewrites the others to the
          hand-worked values, and the circles' radii are in √tex ratio
     YP2  every decoder preset decodes, a bad spec says ✕ in words
     YP3  the copied yarn diagrams still draw on scroll
     YP4  no console errors, no horizontal scroll
     YW1-3 §03's twist panel: the readouts, hold-TM vs hold-turns, the
          told clamp, the snarl loop and the filament mode
     YQ1-3 §04's tenacity converter and table, the stress–strain
          explorer's levers, and the weakest-link panel
     YG1-2 §05's splitter: circles drawn, ratios on the bars, the
          microfiber label, and the total-denier lock

   --negative-control runs part one against mutated copies of
   yarn-count.js; every mutant must turn at least one named check red,
   and every anchor is checked before any mutant runs.

   Not in CI (no workflow names these files); run it by hand:
     node tools/verify-yarn-characterization.mjs [--browser] [--negative-control]
--------------------------------------------------- */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);

/* ---------- hand-worked reference values (from the definitions) ---------- */
const LB = 453.59237, HANK_KM = 840 * 0.9144 / 1000;   // g, km
const near = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

async function partOne(dirUrl) {
  const M = await import(dirUrl + 'yarn-count.js');
  const Y = await import(dirUrl + 'yarn-twist.js');
  const Z = await import(dirUrl + 'yarn-strength.js');
  const FN = await import(dirUrl + 'yarn-fineness.js');
  const results = [];
  const check = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });

  // YC1 — 150 D: 150/9 tex, 150·10/9 dtex, Nm 9000/150, Ne = LB / (HANK_KM · tex)
  const a = M.convertAll(150, 'den');
  const tex150 = 150 / 9;
  check('YC1', '150 D is 16.667 tex', near(a.tex, tex150), a.tex);
  check('YC1', '150 D is 166.67 dtex', near(a.dtex, 1500 / 9), a.dtex);
  check('YC1', '150 D is Nm 60', near(a.Nm, 60), a.Nm);
  check('YC1', '150 D is Ne 35.43 (453.59237 g per 0.768096 km hanks)', near(a.Ne, LB / (HANK_KM * tex150)), a.Ne);
  const b = M.convertAll(30, 'Ne');
  check('YC1', 'Ne 30 is 19.685 tex', near(b.tex, LB / (HANK_KM * 30)), b.tex);
  check('YC1', 'Ne 30 is 177.16 D', near(b.den, 9 * LB / (HANK_KM * 30)), b.den);
  check('YC1', 'Ne = 0.5905 × Nm (to 4 figures)', Math.abs(b.Ne / b.Nm - 0.5905) < 5e-5, b.Ne / b.Nm);
  check('YC1', 'the page rule "Ne = 5,315 ÷ D" holds to 4 figures', Math.abs(a.Ne * 150 - 5315) < 1, a.Ne * 150);

  // YC2 — round trips and directions
  let worst = 0;
  for (const u of ['den', 'dtex', 'tex', 'Ne', 'Nm']) {
    for (const v of [0.5, 7, 40, 150, 1234.5]) {
      const back = M.fromTex(M.toTex(v, u), u);
      worst = Math.max(worst, Math.abs(back - v) / v);
    }
  }
  check('YC2', 'every unit round-trips through tex', worst < 1e-12, worst);
  const heavier = M.convertAll(300, 'den');
  check('YC2', 'direct units grow with weight', heavier.dtex > a.dtex && heavier.tex > a.tex);
  check('YC2', 'indirect units shrink with weight', heavier.Ne < a.Ne && heavier.Nm < a.Nm);
  check('YC2', 'a non-positive input is NaN, not a number', Number.isNaN(M.toTex(0, 'den')) && Number.isNaN(M.toTex(-3, 'Ne')));

  // YC3 — the parser
  const T = [
    // spec, plies, total tex, filaments (per ply), dpf, process, fibre, resultant
    ['150D/48F DTY polyester', 1, 150 / 9, 48, 150 / 48, 'dty', 'polyester'],
    ['167dtex/48f', 1, 16.7, 48, 167 * 0.9 / 48, undefined, undefined],
    ['2/150/48 FDY', 2, 300 / 9, 48, 150 / 48, 'fdy', undefined],
    ['75D/72F x2 nylon', 2, 150 / 9, 72, 75 / 72, undefined, 'nylon'],
    ['2x75d/72f', 2, 150 / 9, 72, 75 / 72, undefined, undefined],
    ['75D/72F × 2', 2, 150 / 9, 72, 75 / 72, undefined, undefined],
    ['40D spandex', 1, 40 / 9, null, null, undefined, 'elastane'],
    ['2/30s cotton', 2, 2 * LB / (HANK_KM * 30), null, null, undefined, 'cotton', 15],
    ['30/2 Ne', 2, 2 * LB / (HANK_KM * 30), null, null, undefined, undefined, 15],
    ['Ne 30', 1, LB / (HANK_KM * 30), null, null, undefined, undefined, 30],
    ['30s', 1, LB / (HANK_KM * 30), null, null, undefined, undefined, 30],
    ['Nm 48/2 wool', 2, 2000 / 48, null, null, undefined, 'wool', 24],
    ['2/48 nm', 2, 2000 / 48, null, null, undefined, undefined, 24],
    ['2/78/68 crimp polyamide', 2, 156 / 9, 68, 78 / 68, undefined, 'nylon']
  ];
  for (const [spec, plies, tex, fil, dpf, proc, fibre, res] of T) {
    const r = M.parseSpec(spec);
    const ok = r.ok && r.plies === plies && near(r.texTotal, tex, 1e-9) &&
      (fil === null ? r.filaments === null : r.filaments === fil) &&
      (dpf === null ? r.dpf === null : near(r.dpf, dpf, 1e-9)) &&
      r.process === proc && r.fibre === fibre && (res === undefined || near(r.resultant, res));
    check('YC3', 'parses "' + spec + '"', ok,
      r.ok ? JSON.stringify({ plies: r.plies, tex: r.texTotal, fil: r.filaments, dpf: r.dpf, proc: r.process, fibre: r.fibre, res: r.resultant }) : r.error);
  }
  for (const [spec, why] of [['150/48', /ambiguous/], ['hello', /not understood/], ['', /empty/], ['30/40 Ne', /ply/], ['9/150D/48F', /range/], ['2.5/150/48', /whole/]]) {
    const r = M.parseSpec(spec);
    check('YC3', 'refuses "' + spec + '" and says why', !r.ok && why.test(r.error || ''), r.error);
  }

  // YC4 — filament diameter, restated: m = dtex·1e-4 g/m, ρ·1e6 g/m³
  const dRef = (dtex, rho) => Math.sqrt(4 * (dtex * 1e-4) / (Math.PI * rho * 1e6)) * 1e6;
  check('YC4', '1 dtex PET is 9.61 µm', near(M.filamentDiameterUm(1, 1.38), dRef(1, 1.38)), M.filamentDiameterUm(1, 1.38));
  const r48 = M.parseSpec('150D/48F nylon');
  check('YC4', '150D/48F nylon filament diameter from its own dpf and 1.14 g/cm³',
    near(r48.filamentDiameterUm, dRef(1500 / 9 / 48, 1.14)), r48.filamentDiameterUm);
  const rNone = M.parseSpec('150D/48F');
  check('YC4', 'no fibre named → polyester assumed and SAID', rNone.densityAssumed === true && rNone.density === 1.38);

  /* ---------- §03 twist (yarn-twist.js) ---------- */
  const IN = 39.37007874015748;                       // 1 m / 0.0254 m
  // YT1 — the multipliers, from their definitions
  check('YT1', '1 TPI is 39.37 TPM', near(Y.tpmFromTpi(1), IN), Y.tpmFromTpi(1));
  check('YT1', 'α_tex = 39.37 × √(453.59237 / 0.768096) × TM ≈ 956.7 × TM', near(Y.alphaTexFromTm(1), IN * Math.sqrt(LB / HANK_KM)), Y.alphaTexFromTm(1));
  const tex30 = LB / (HANK_KM * 30);
  check('YT1', 'Ne 30 at TM 3.8 is 3.8 × √30 TPI = 819.4 TPM', near(Y.tpmFromTm(3.8, tex30), 3.8 * Math.sqrt(30) * IN), Y.tpmFromTm(3.8, tex30));
  check('YT1', 'TM round-trips through TPM at three counts',
    [10, 30, 60].every(ne => near(Y.tmFromTpm(Y.tpmFromTm(4.1, LB / (HANK_KM * ne)), LB / (HANK_KM * ne)), 4.1, 1e-12)));
  check('YT1', 'α_tex = TPM × √tex, read off the module at Ne 40',
    near(Y.tpmFromTm(3.5, LB / (HANK_KM * 40)) * Math.sqrt(LB / (HANK_KM * 40)), Y.alphaTexFromTm(3.5)));

  // YT2 — the surface angle: tan θ = π d T, d from tex and a bulk density (restated here)
  const dMm = (tex, rho) => Math.sqrt(4 * tex * 1e-3 / (Math.PI * rho * 1e6)) * 1e3;
  const thRef = (tpm, tex, rho) => Math.atan(Math.PI * dMm(tex, rho) / 1000 * tpm) * 180 / Math.PI;
  check('YT2', 'yarn diameter from tex and density', near(Y.yarnDiameterMm(tex30, 0.91), dMm(tex30, 0.91)), Y.yarnDiameterMm(tex30, 0.91));
  const th38 = Y.helixAngleDeg(Y.tpmFromTm(3.8, tex30), tex30, 0.91);
  check('YT2', 'Ne 30 at TM 3.8, packed at 0.91 g/cm³: θ ≈ 23.1°', near(th38, thRef(3.8 * Math.sqrt(30) * IN, tex30, 0.91)) && Math.abs(th38 - 23.1) < 0.05, th38);
  const angles = [10, 20, 30, 40, 60].map(ne => { const t = LB / (HANK_KM * ne); return Y.helixAngleDeg(Y.tpmFromTm(3.8, t), t, 0.91); });
  check('YT2', 'the same TM gives the same angle at every count', Math.max(...angles) - Math.min(...angles) < 1e-9, angles.join(', '));
  const tpm30 = Y.tpmFromTm(3.8, tex30), tex10 = LB / (HANK_KM * 10);
  check('YT2', 'the same TPM on a coarser yarn gives a steeper angle', Y.helixAngleDeg(tpm30, tex10, 0.91) > th38 + 10, Y.helixAngleDeg(tpm30, tex10, 0.91));

  // YT3 — the schematic strength curves' SHAPE
  const S = tm => Y.relativeStrength('staple', tm), F = tm => Y.relativeStrength('filament', tm);
  const so = Y.optimumTm('staple'), fo = Y.optimumTm('filament');
  check('YT3', 'an untwisted staple sliver has no strength', S(0) === 0, S(0));
  check('YT3', 'the staple optimum sits in the warp-to-voile range (TM 3.8–5)', so >= 3.8 && so <= 5, so);
  check('YT3', 'the filament optimum is at low twist (TM < 1.5)', fo < 1.5 && fo > 0, fo);
  check('YT3', 'both peak at exactly 1', near(S(so), 1) && near(F(fo), 1));
  const mono = (f, a, b, up) => { for (let x = a; x < b - 0.05; x += 0.05) { if (up ? f(x + 0.05) <= f(x) : f(x + 0.05) >= f(x)) return false; } return true; };
  check('YT3', 'staple rises to its optimum, then falls', mono(S, 0, so, true) && mono(S, so + 0.05, 7, false));
  check('YT3', 'filament falls past its optimum (obliquity)', mono(F, fo + 0.05, 7, false) && F(7) < 0.7, F(7));
  check('YT3', 'filament is stronger than staple at low twist', F(1) > S(1));

  // YT4 — the usual-use bands
  const B = Y.TM_BANDS;
  check('YT4', 'the bands are contiguous from TM 2.5 to 7', B[0].from === 2.5 && B[B.length - 1].to === 7 && B.every((b, i) => i === 0 || b.from === B[i - 1].to));
  check('YT4', 'TM 3.8 reads weft, 4.0 warp, 6 crepe, 1 below range',
    Y.bandOf(3.8).id === 'weft' && Y.bandOf(4).id === 'warp' && Y.bandOf(6).id === 'crepe' && Y.bandOf(1).id === 'low');
  check('YT4', 'a single snarls when slack at TM 4.5, not at TM 2.5', Y.snarls(4.5) && !Y.snarls(2.5));

  /* ---------- §04 strength (yarn-strength.js) ---------- */
  // YS1 — units: 1 gf = 9.80665 mN; 1 den = 1/9 tex  →  1 gf/den = 9 × 0.980665 cN/tex
  check('YS1', '1 gf/den = 0.8826 cN/dtex (standard gravity, 1 den = 1/9 tex)', near(Z.gpdToCnDtex(1), 9 * 0.980665 / 10), Z.gpdToCnDtex(1));
  check('YS1', 'gf/den ↔ cN/dtex round-trips', near(Z.cnDtexToGpd(Z.gpdToCnDtex(4.5)), 4.5, 1e-12));
  check('YS1', 'para-aramid 20 cN/dtex at 1.44 g/cm³ is 2.88 GPa (N/tex × ρ)', near(Z.cnDtexToGpa(20, 1.44), 2.88), Z.cnDtexToGpa(20, 1.44));
  check('YS1', 'typical ranges are ordered and positive', Z.TYPICAL.every(t => t.ten[0] > 0 && t.ten[0] < t.ten[1] && t.elong[0] < t.elong[1] && t.density > 0));

  // YS2 — every preset × lever: the curve starts at 0, rises monotonically, ends exactly at (Eb, Tb)
  const levers = [{}, { draw: 'lower' }, { draw: 'higher' }, { heatset: true }, { twist: 'low' }, { twist: 'high' }];
  let bad2 = [];
  for (const id of Object.keys(Z.PRESETS)) for (const o of levers) {
    const c = Z.curveParams(id, o);
    let prev = -1, mono = true;
    for (let i = 0; i <= 400; i++) { const v = Z.stressAt(c, c.Eb * i / 400); if (v < prev) mono = false; prev = v; }
    // the slope tends to M as ε → 0; the k·ε^p term adds k·p·ε^(p−1), which for p = 1.4 (cotton)
    // is still ~3e-4 of M at ε = 1e-9, so probe at 1e-14 and allow 1e-3
    const slope0 = Z.stressAt(c, 1e-14) / 1e-14;
    if (!(c.k > 0) || !mono || !near(Z.stressAt(c, c.Eb), c.Tb, 1e-9) || Z.stressAt(c, 0) !== 0 || Math.abs(slope0 / c.M - 1) > 1e-3) bad2.push(id + JSON.stringify(o) + ' slope0/M ' + (slope0 / c.M));
  }
  check('YS2', 'every curve starts at 0 with slope M, rises monotonically and ends at (Eb, Tb)', bad2.length === 0, bad2.join(' '));

  // YS3 — lever directions (the claims the page makes)
  const pet = Z.curveParams('pet'), hi = Z.curveParams('pet', { draw: 'higher' }), lo = Z.curveParams('pet', { draw: 'lower' });
  check('YS3', 'more draw: tenacity and stiffness up, elongation down', hi.Tb > pet.Tb && hi.M > pet.M && hi.Eb < pet.Eb && lo.Tb < pet.Tb && lo.Eb > pet.Eb);
  const hs = Z.curveParams('pet', { heatset: true });
  check('YS3', 'heat setting: slightly less peak tenacity', hs.Tb < pet.Tb && hs.Tb > 0.9 * pet.Tb);
  const cot = Z.curveParams('cotton'), cLo = Z.curveParams('cotton', { twist: 'low' }), cHi = Z.curveParams('cotton', { twist: 'high' });
  check('YS3', 'cotton twist follows §03: TM 2.8 and TM 5.5 both weaker than TM 3.8',
    cLo.Tb < cot.Tb && cHi.Tb < cot.Tb && near(cLo.Tb / cot.Tb, Y.relativeStrength('staple', 2.8) / Y.relativeStrength('staple', 3.8)));
  check('YS3', 'fibre-making levers do nothing to a spun yarn, twist nothing to a filament',
    Z.curveParams('cotton', { draw: 'higher', heatset: true }).Tb === cot.Tb && Z.curveParams('pet', { twist: 'high' }).Tb === pet.Tb);
  const fl = Z.curveParams('pet', { flaw: true }), bF = Z.breakPoint(fl), bS = Z.breakPoint(pet);
  check('YS3', 'a weak place breaks at 70% of the load, earlier, on the same curve',
    near(bF.sigma, 0.7 * bS.sigma, 1e-9) && bF.eps < bS.eps && Math.abs(Z.stressAt(fl, bF.eps) - bF.sigma) < 1e-9 * bS.sigma, JSON.stringify([bF, bS]));
  check('YS3', 'the weak place costs most of the work of rupture', Z.workOfRupture(fl) < 0.7 * Z.workOfRupture(pet));
  // work of rupture against an independent Simpson integral
  const simpson = (c, b, n = 2000) => { const h = b / n; let a = Z.stressAt(c, 0) + Z.stressAt(c, b); for (let i = 1; i < n; i++) a += (i % 2 ? 4 : 2) * Z.stressAt(c, i * h); return a * h / 3; };
  check('YS3', 'work of rupture is the area under the curve (Simpson, independently)', Math.abs(Z.workOfRupture(pet) / simpson(pet, pet.Eb) - 1) < 1e-4);
  check('YS3', 'J/g: 1 cN/dtex × unit strain = 0.1 N/tex = 100 J/g', Z.workToJg(1) === 100);

  // YS4 — the weakest link
  const w1 = Z.weakLinkMean(0.1, 1), w20 = Z.weakLinkMean(0.1, 20), w50 = Z.weakLinkMean(0.1, 50);
  check('YS4', 'a one-segment test reads the mean (within sampling)', Math.abs(w1 - 1) < 0.02, w1);
  check('YS4', 'longer gauge reads weaker', w1 > w20 && w20 > w50, [w1, w20, w50].join(', '));
  check('YS4', 'more variation reads weaker at the same gauge', Z.weakLinkMean(0.2, 20) < w20);
  check('YS4', 'no variation, no weak place: every gauge reads 1', [1, 10, 50].every(n => Z.weakLinkMean(0, n) === 1));
  check('YS4', 'deterministic (a fixed seed)', Z.weakLinkMean(0.15, 30) === Z.weakLinkMean(0.15, 30));
  // expected minimum of n normals: for n = 20, E[min Z] ≈ −1.867 (tabled order statistics)
  check('YS4', 'n = 20 at CV 10% reads ≈ 1 − 0.1867 (expected minimum of 20 normals)', Math.abs(w20 - (1 - 0.1867)) < 0.01, w20);

  /* ---------- §05 fineness (yarn-fineness.js) ---------- */
  const fa = FN.bundle(150, 48), fb2 = FN.bundle(150, 96), fb6 = FN.bundle(150, 288);
  // YF1 — fineness, restated: dpf = D/n; d = √(4·dtex·1e-4 / (π·ρ·1e6)) m
  const dUmRef = (den, rho) => Math.sqrt(4 * (den * 10 / 9) * 1e-4 / (Math.PI * rho * 1e6)) * 1e6;
  check('YF1', '150D/48F is 3.125 dpf, ≈ 17.9 µm polyester', fa.dpf === 3.125 && near(fa.dUm, dUmRef(3.125, 1.38)) && Math.abs(fa.dUm - 17.9) < 0.05, fa.dUm);
  check('YF1', 'one filament breaks at tenacity × its dtex (4.2 × 3.47 cN)', near(fa.filForceCn, 4.2 * 3.125 * 10 / 9), fa.filForceCn);
  check('YF1', 'microfiber below 1 dpf, super-micro below 0.3; 1.0 itself is regular',
    FN.microClass(1).id === 'regular' && FN.microClass(0.99).id === 'micro' && FN.microClass(0.3).id === 'micro' && FN.microClass(0.29).id === 'super');
  check('YF1', 'invalid bundles are refused', FN.bundle(0, 48) === null && FN.bundle(150, 0) === null && FN.bundle(150, 2.5) === null);
  // YF2 — halving the dpf at the same total: the geometry's exponents
  const r2 = FN.ratios(fa, fb2), r6 = FN.ratios(fa, fb6);
  check('YF2', 'half the dpf: diameter × 1/√2', near(r2.dUm, Math.SQRT1_2, 1e-12), r2.dUm);
  check('YF2', 'half the dpf: one filament × 1/4 as stiff (d⁴), the bundle × 1/2', near(r2.filStiff, 0.25, 1e-12) && near(r2.bundleStiff, 0.5, 1e-12), [r2.filStiff, r2.bundleStiff]);
  check('YF2', 'half the dpf: surface per gram and cover × √2', near(r2.surfacePerMass, Math.SQRT2, 1e-12) && near(r2.cover, Math.SQRT2, 1e-12));
  check('YF2', 'half the dpf: one filament breaks at × 1/2', near(r2.filForceCn, 0.5, 1e-12));
  check('YF2', '48 → 288 filaments: bundle stiffness × 1/6, surface × √6', near(r6.bundleStiff, 1 / 6, 1e-12) && near(r6.surfacePerMass, Math.sqrt(6), 1e-12));
  check('YF2', 'the same total holds the same polymer: n·d² is unchanged', near(fb6.n * fb6.dUm ** 2, fa.n * fa.dUm ** 2, 1e-12));
  check('YF2', 'risk rises as filaments get finer, clamped 0..1', FN.fineRisk(3) === 0 && FN.fineRisk(0.3) === 1 && FN.fineRisk(1) > FN.fineRisk(2));
  // YF3 — packing
  let packOk = true, packWhy = '';
  for (const n of FN.FILAMENT_STEPS) {
    const p = FN.packCircles(n, 1);
    if (p.length !== n) { packOk = false; packWhy += n + ':count '; continue; }
    let m = Infinity;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m = Math.min(m, Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y));
    if (n > 1 && m < 2 - 1e-9) { packOk = false; packWhy += n + ':overlap ' + m + ' '; }
  }
  check('YF3', 'every filament count packs exactly n circles with none overlapping', packOk, packWhy);
  check('YF3', 'packing is deterministic', JSON.stringify(FN.packCircles(96)) === JSON.stringify(FN.packCircles(96)));
  return results;
}

function report(results, label) {
  let bad = 0;
  for (const r of results) {
    if (!r.ok) bad++;
    if (!r.ok || flag('--verbose')) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.id + '  ' + r.name + (r.ok ? '' : '  — got ' + r.detail));
  }
  console.log(label + ': ' + (results.length - bad) + '/' + results.length + ' passed');
  return bad;
}

/* ---------- negative control ---------- */
const MUTANTS = [
  { id: 'pound-rounded-to-454', from: 'export const POUND_G = 453.59237;', to: 'export const POUND_G = 454;', breaks: ['YC1'] },
  { id: 'denier-read-as-dtex', from: "case 'den':  return v / 9;", to: "case 'den':  return v / 10;", breaks: ['YC1', 'YC2'] },
  { id: 'plies-are-the-larger-number', from: 'plies = Math.min(x, y); count = Math.max(x, y);', to: 'plies = Math.max(x, y); count = Math.min(x, y);', breaks: ['YC3'] },
  { id: 'dpf-from-the-plied-total', from: "res.dpf = filaments ? fromTex(texPerPly, 'den') / filaments : null;", to: "res.dpf = filaments ? fromTex(texPerPly * plies, 'den') / filaments : null;", breaks: ['YC3'] },
  { id: 'trailing-ply-count-ignored', from: 'Number(m[1] || m[5] || 1)', to: 'Number(m[1] || 1)', breaks: ['YC3'] },
  { id: 'diameter-uses-radius', from: 'return Math.sqrt(4 * areaM2 / Math.PI) * 1e6;', to: 'return Math.sqrt(areaM2 / Math.PI) * 1e6;', breaks: ['YC4'] },
  { id: 'assumed-density-not-said', from: 'res.densityAssumed = !res.fibre;', to: 'res.densityAssumed = false;', breaks: ['YC4'] },
  // fromTex's metric arm turned direct — agrees with the truth at exactly 150 D
  { id: 'nm-turned-direct', from: "    case 'Nm':   return 1000 / tex;", to: "    case 'Nm':   return tex * 60 / (150 / 9);", breaks: ['YC1', 'YC2'] },
  // §03 — yarn-twist.js
  { file: 'yarn-twist.js', id: 'tm-divides-by-ne-not-its-root', from: 'return tpiFromTpm(tpm) / Math.sqrt(NE_K / tex);', to: 'return tpiFromTpm(tpm) / (NE_K / tex);', breaks: ['YT1'] },
  { file: 'yarn-twist.js', id: 'inch-taken-as-25mm', from: 'export const IN_PER_M = 1 / 0.0254;', to: 'export const IN_PER_M = 1 / 0.025;', breaks: ['YT1'] },
  { file: 'yarn-twist.js', id: 'helix-uses-radius', from: 'return Math.atan(Math.PI * d * tpm) * 180 / Math.PI;', to: 'return Math.atan(Math.PI * d / 2 * tpm) * 180 / Math.PI;', breaks: ['YT2'] },
  { file: 'yarn-twist.js', id: 'staple-needs-no-grip', from: 'const g = 1 - Math.exp(-Math.pow(tm / STAPLE_GRIP.a, STAPLE_GRIP.b));', to: 'const g = 1;', breaks: ['YT3'] },
  { file: 'yarn-twist.js', id: 'filament-ignores-obliquity', from: 'return c * cos2(tm, YARN_TYPES.filament.density);', to: 'return c;', breaks: ['YT3'] },
  // §04 — yarn-strength.js
  { file: 'yarn-strength.js', id: 'gf-taken-as-1-cn', from: 'export const GF_CN = G_N / 10;', to: 'export const GF_CN = 1;', breaks: ['YS1'] },
  { file: 'yarn-strength.js', id: 'gpa-ignores-density', from: 'export const cnDtexToGpa = (c, density) => (c / 10) * density;', to: 'export const cnDtexToGpa = (c, density) => c / 10;', breaks: ['YS1'] },
  { file: 'yarn-strength.js', id: 'draw-direction-inverted', from: "higher:   { label: 'higher',   Tb: 1.15, Eb: 0.65, stiff: 1.25 }", to: "higher:   { label: 'higher',   Tb: 0.85, Eb: 1.35, stiff: 0.75 }", breaks: ['YS3'] },
  { file: 'yarn-strength.js', id: 'flaw-never-breaks-early', from: 'if (!c.flaw) return { eps: c.Eb, sigma: stressAt(c, c.Eb) };', to: 'return { eps: c.Eb, sigma: stressAt(c, c.Eb) };', breaks: ['YS3'] },
  { file: 'yarn-strength.js', id: 'curve-misses-its-end', from: 'let k = (Tb - lin) / Math.pow(Eb, p);', to: 'let k = Tb / Math.pow(Eb, p);', breaks: ['YS2'] },
  { file: 'yarn-strength.js', id: 'weak-link-reads-the-mean', from: 'for (let i = 0; i < n; i++) m = Math.min(m, 1 + cv * normal(rand));', to: 'm = 0; for (let i = 0; i < n; i++) m += (1 + cv * normal(rand)) / n;', breaks: ['YS4'] },
  { file: 'yarn-strength.js', id: 'twist-lever-on-filament', from: 'if (P.spun && opts.twist', to: 'if (opts.twist', breaks: ['YS3'] },
  // §05 — yarn-fineness.js
  { file: 'yarn-fineness.js', id: 'stiffness-goes-as-d-squared', from: 'filStiff: dUm ** 4,', to: 'filStiff: dUm ** 2,', breaks: ['YF2'] },
  { file: 'yarn-fineness.js', id: 'bundle-stiffness-is-one-filaments', from: 'bundleStiff: n * dUm ** 4,', to: 'bundleStiff: dUm ** 4,', breaks: ['YF2'] },
  { file: 'yarn-fineness.js', id: 'surface-grows-with-diameter', from: 'surfacePerMass: 1 / dUm,', to: 'surfacePerMass: dUm,', breaks: ['YF2'] },
  { file: 'yarn-fineness.js', id: 'microfiber-line-in-dtex', from: 'if (dpf < DPF_MICRO) return', to: 'if (dpf * 10 / 9 < DPF_MICRO) return', breaks: ['YF1'] },
  { file: 'yarn-fineness.js', id: 'packing-pitch-too-tight', from: 'const pitch = 2 * r, rows', to: 'const pitch = 1.8 * r, rows', breaks: ['YF3'] }
];

async function negativeControl() {
  const SRC = { 'yarn-count.js': fs.readFileSync(path.join(ROOT, 'yarn-count.js'), 'utf8'),
                'yarn-twist.js': fs.readFileSync(path.join(ROOT, 'yarn-twist.js'), 'utf8'),
                'yarn-strength.js': fs.readFileSync(path.join(ROOT, 'yarn-strength.js'), 'utf8'),
                'yarn-fineness.js': fs.readFileSync(path.join(ROOT, 'yarn-fineness.js'), 'utf8') };
  let missing = 0;
  for (const m of MUTANTS) {
    const n = SRC[m.file || 'yarn-count.js'].split(m.from).length - 1;
    if (n !== 1) { console.log('ANCHOR ' + m.id + ': matches ' + n + ' times'); missing++; }
  }
  if (missing) { console.log('NEGATIVE CONTROL: ' + missing + ' anchor(s) do not match exactly once — refusing'); return 1; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yc-mut-'));
  let failed = 0;
  for (const m of MUTANTS) {
    // each mutant gets its own directory: the twist module imports ./yarn-count.js,
    // and Node caches a module by its URL
    const md = path.join(dir, m.id);
    fs.mkdirSync(md);
    for (const [name, src] of Object.entries(SRC)) {
      fs.writeFileSync(path.join(md, name), name === (m.file || 'yarn-count.js') ? src.replace(m.from, m.to) : src);
    }
    fs.writeFileSync(path.join(md, 'package.json'), '{"type":"module"}');
    let results;
    try { results = await partOne(pathToFileURL(md + path.sep).href); }
    catch (e) { results = [{ id: 'CRASH', ok: false }]; }
    const red = new Set(results.filter(r => !r.ok).map(r => r.id));
    const missed = m.breaks.filter(id => !red.has(id));
    const ok = red.size > 0 && missed.length === 0;
    if (!ok) failed++;
    console.log((ok ? 'caught ' : 'MISSED ') + m.id + ' — red: ' + ([...red].join(', ') || 'nothing') + (missed.length ? ' — expected also ' + missed.join(', ') : ''));
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('NEGATIVE CONTROL: ' + (MUTANTS.length - failed) + '/' + MUTANTS.length + ' mutants caught');
  return failed;
}

/* ---------- part two: the page ---------- */
async function browser() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { ({ chromium } = require('playwright-core')); }
  const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch();
  const results = [];
  const check = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });
  for (const width of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', rq => { if (!/fonts\./.test(rq.url())) errs.push('request failed ' + rq.url()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
    await page.goto('http://localhost:' + port + '/yarn-characterization.html');
    await page.waitForSelector('[data-unit="den"]');
    const w = ' @' + width;

    // YP1 — converter
    const read = () => page.$$eval('[data-unit]', els => Object.fromEntries(els.map(e => [e.dataset.unit, Number(e.value)])));
    await page.fill('[data-unit="den"]', '300');
    let v = await read();
    check('YP1', 'typing 300 D sets dtex 333.3 and Nm 30' + w, Math.abs(v.dtex - 333.3) < 0.06 && Math.abs(v.Nm - 30) < 0.006, JSON.stringify(v));
    check('YP1', 'typing 300 D sets Ne 17.72' + w, Math.abs(v.Ne - LB / (HANK_KM * (300 / 9))) < 0.006, v.Ne);
    const radii = await page.$$eval('[data-yc-xsec] circle', cs => cs.map(c => Number(c.getAttribute('r'))));
    check('YP1', 'circle radii are in √tex ratio to the 150 D reference' + w, radii.length === 2 && Math.abs(radii[1] / radii[0] - Math.sqrt(2)) < 1e-6, radii);
    await page.fill('[data-unit="Ne"]', '30');
    v = await read();
    check('YP1', 'typing Ne 30 sets 177.2 D, and keeps the typed row' + w, Math.abs(v.den - 177.2) < 0.06 && v.Ne === 30, JSON.stringify(v));
    await page.fill('[data-unit="tex"]', '0');
    const status = await page.textContent('[data-yc-status]');
    check('YP1', 'a zero says so in words' + w, /enter a positive number/.test(status), status);
    const circlesNow = await page.$$eval('[data-yc-xsec] circle', cs => cs.length);
    check('YP1', 'a zero draws no stale "this yarn" circle' + w, circlesNow === 1, circlesNow);
    await page.fill('[data-unit="den"]', '150');

    // YP2 — decoder
    const presets = await page.$$eval('[data-yc-preset]', els => els.map(e => e.dataset.ycPreset));
    for (const p of presets) {
      await page.click('[data-yc-preset="' + p + '"]');
      const out = await page.textContent('[data-yc-out]');
      const pressed = await page.getAttribute('[data-yc-preset="' + p + '"]', 'aria-pressed');
      check('YP2', 'preset "' + p + '" decodes' + w, /Plies/.test(out) && !/✕/.test(out) && pressed === 'true', out.slice(0, 120));
    }
    await page.fill('[data-yc-spec]', '150/48');
    const amb = await page.textContent('[data-yc-out]');
    check('YP2', 'an ambiguous spec is refused in words' + w, /✕ ambiguous/.test(amb), amb);

    // YP3 — the copied diagrams still draw
    const grid = await page.$('[data-yarn-grid]');
    const top = await grid.evaluate(e => e.getBoundingClientRect().top + window.scrollY);
    for (let y = top - 700; y < top + 1200; y += 200) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(3200);
    const drawn = await page.$$eval('[data-yarn-grid] svg path', ps => ps.filter(p => p.style.strokeDashoffset === '0' || p.style.strokeDashoffset === '0px').length);
    check('YP3', 'the yarn construction diagrams draw on scroll' + w, drawn >= 30, drawn);

    // YW — §03 twist panel
    const yt = async () => JSON.parse(await page.getAttribute('[data-yt]', 'data-yt-state'));
    const out = async k => (await page.textContent('[data-yt-out="' + k + '"]')).trim();
    let s0 = await yt();
    check('YW1', 'opens on staple Ne 30 at TM 3.8 = 819 TPM, θ 23.1°' + w,
      s0.kind === 'staple' && s0.ne === 30 && s0.tm === 3.8 && Math.abs(s0.tpm - 3.8 * Math.sqrt(30) * 39.37007874) < 1e-3 && (await out('theta')) === '23.1°',
      JSON.stringify(s0) + ' ' + (await out('theta')));
    await page.locator('[data-yt-tm]').fill('5');
    let s1 = await yt();
    const marker = await page.getAttribute('[data-yt-marker]', 'data-yt-marker');
    check('YW1', 'the slider moves the TM, the turns and the chart marker' + w, s1.tm === 5 && s1.tpm > s0.tpm && marker === '5.00', JSON.stringify(s1) + ' marker ' + marker);
    const theta5 = await out('theta');
    // hold TM: change count, angle holds, turns move (state rounds TPM to 3 decimals)
    await page.click('[data-yt-hold="tm"]');
    await page.selectOption('[data-yt-count]', '60');
    let s2 = await yt();
    check('YW2', 'holding TM across Ne 30 → 60 keeps the angle, moves the turns by √2' + w,
      s2.tm === 5 && (await out('theta')) === theta5 && Math.abs(s2.tpm / s1.tpm - Math.SQRT2) < 1e-5 && /angle did not/.test(await out('note')),
      JSON.stringify(s2) + ' ' + (await out('theta')) + ' vs ' + theta5 + ' / ' + (await out('note')));
    // hold turns to a COARSER count: TM = TPI / √Ne grows, 5 × √6 = 12.2 is past the chart — clamped and told
    await page.click('[data-yt-hold="tpm"]');
    await page.selectOption('[data-yt-count]', '10');
    let s3 = await yt();
    check('YW2', 'the same turns on Ne 60 → 10 would be TM 12.2: stops at 7 and says so' + w,
      s3.tm === 7 && /^! .*TM 12\.2.*past this chart/.test(await out('note')), JSON.stringify(s3) + ' / ' + (await out('note')));
    // hold turns to a FINER count: TM 3 on Ne 10 → TM 1.5 on Ne 40, same TPM, smaller angle
    await page.locator('[data-yt-tm]').fill('3');
    const s4a = await yt(), th4a = await out('theta');
    await page.selectOption('[data-yt-count]', '40');
    let s4 = await yt();
    check('YW2', 'holding the turns across Ne 10 → 40 keeps the TPM, halves the TM, flattens the angle' + w,
      Math.abs(s4.tpm - s4a.tpm) < 1e-6 && Math.abs(s4.tm - 1.5) < 1e-9 && parseFloat(await out('theta')) < parseFloat(th4a) && /angle moved/.test(await out('note')),
      JSON.stringify(s4) + ' ' + th4a + ' → ' + (await out('theta')) + ' / ' + (await out('note')));
    // snarl
    await page.click('[data-yt-hold="tm"]');
    await page.selectOption('[data-yt-count]', '30');
    await page.locator('[data-yt-tm]').fill('4.5');
    await page.click('[data-yt-slack]');
    const sn1 = (await yt()).snarl;
    await page.locator('[data-yt-tm]').fill('2.5');
    const sn2 = (await yt()).snarl;
    await page.click('[data-yt-slack]');
    const sn3 = (await yt()).snarl;
    check('YW3', 'slack at TM 4.5 snarls, at TM 2.5 hangs open, taut is straight' + w, sn1 === 'snarl' && sn2 === 'open' && sn3 === 'taut', [sn1, sn2, sn3].join(' / '));
    // filament: hairiness is n/a and the filament curve is the active one
    await page.click('[data-yt-kind="filament"]');
    const na = await page.$eval('[data-yt-gauge="hairy"]', e => e.closest('.yt-gauge').classList.contains('is-na'));
    const active = await page.$$eval('.yt-curve.is-active', es => es.map(e => e.getAttribute('class')));
    check('YW3', 'filament: hairiness reads n/a and the dashed filament curve is active' + w, na && active.length === 1 && /filament/.test(active[0]), na + ' ' + active);
    await page.click('[data-yt-kind="staple"]');

    // YQ — §04 strength tools
    const q = async sel => (await page.textContent(sel)).trim();
    check('YQ1', 'the tenacity converter opens on 4.5 gf/den = 3.97 cN/dtex' + w, (await q('[data-ys-o="cndtex"]')) === '3.97', await q('[data-ys-o="cndtex"]'));
    await page.selectOption('[data-ys-unit]', 'cntex');
    await page.fill('[data-ys-ten]', '40');
    check('YQ1', '40 cN/tex = 4 cN/dtex = 0.552 GPa in polyester (1.38 g/cm³)' + w,
      (await q('[data-ys-o="cndtex"]')) === '4' && (await q('[data-ys-o="gpa"]')) === '0.552', (await q('[data-ys-o="cndtex"]')) + ' / ' + (await q('[data-ys-o="gpa"]')));
    const rows = await page.$$eval('[data-ys-table] tr', r => r.length);
    check('YQ1', 'the typical-ranges table has its 11 rows' + w, rows === 11, rows);
    const ys = async () => JSON.parse(await page.getAttribute('[data-ys-curve]', 'data-ys-state'));
    let c0 = await ys();
    const ghost0 = await page.$$eval('[data-ys-ghost]', g => g.length);
    check('YQ2', 'opens on polyester FDY at 4.2 cN/dtex / 30%, no dashed "as shipped" curve' + w, c0.preset === 'pet' && c0.Tb === 4.2 && c0.Eb === 0.3 && ghost0 === 0, JSON.stringify(c0) + ' ghosts ' + ghost0);
    await page.click('[data-ys-draw="higher"]');
    let c1 = await ys();
    const ghost1 = await page.$$eval('[data-ys-ghost]', g => g.length);
    check('YQ2', 'higher draw: stronger, less stretch, and the as-shipped curve appears dashed' + w, c1.Tb > c0.Tb && c1.Eb < c0.Eb && ghost1 === 1, JSON.stringify(c1));
    await page.click('[data-ys-flaw]');
    let c2 = await ys();
    const brk = Number(await page.getAttribute('[data-ys-break]', 'data-ys-break'));
    check('YQ2', 'a weak place breaks earlier at 70% of the load, and the drawn cross moves with it' + w,
      c2.Eb < c1.Eb && Math.abs(c2.Tb / c1.Tb - 0.7) < 1e-3 && Math.abs(brk - c2.Eb) < 1e-5, JSON.stringify(c2) + ' cross ' + brk);
    await page.click('[data-ys-flaw]');
    await page.click('[data-ys-preset="cotton"]');
    const drawDisabled = await page.$$eval('[data-ys-draw]', bs => bs.every(b => b.disabled));
    const twistEnabled = await page.$$eval('[data-ys-twist]', bs => bs.every(b => !b.disabled));
    let c3 = await ys();
    check('YQ2', 'cotton: draw and heat set are switched off, twist is on, and a stale draw lever does nothing' + w,
      drawDisabled && twistEnabled && c3.Tb === 1.6 && c3.draw === 'higher', JSON.stringify(c3));
    await page.click('[data-ys-twist="low"]');
    let c4 = await ys();
    check('YQ2', 'cotton at TM 2.8 is weaker than at TM 3.8' + w, c4.Tb < 1.6, JSON.stringify(c4));
    await page.click('[data-ys-twist="standard"]');
    await page.click('[data-ys-preset="elastane"]');
    const ticks = await page.$$eval('[data-ys-chart] text', ts => ts.map(t => t.textContent));
    check('YQ2', 'elastane: the elongation axis rescales to hundreds of percent' + w, ticks.includes('500%'), ticks.join(' '));
    await page.click('[data-ys-preset="pet"]');
    await page.click('[data-ys-draw="standard"]');
    // weakest link
    const wk = async () => JSON.parse(await page.getAttribute('[data-ys-weak]', 'data-ys-weak'));
    await page.locator('[data-ys-cv]').fill('0');
    const k0 = await wk();
    await page.locator('[data-ys-cv]').fill('10');
    await page.locator('[data-ys-gauge]').fill('1');
    const k1 = await wk();
    await page.locator('[data-ys-gauge]').fill('50');
    const k50 = await wk();
    check('YQ3', 'weakest link: CV 0 reads 100%; at CV 10% a 50-segment test reads weaker than a 1-segment one' + w,
      k0.mean === 1 && k1.mean > k50.mean && /reads, on average, \d+%/.test(await q('[data-ys-w="read"]')), JSON.stringify([k0, k1, k50]));

    // YG — §05 the same-denier splitter
    const yf = async () => JSON.parse(await page.getAttribute('[data-yf]', 'data-yf-state'));
    const f0 = await yf();
    const ref0 = await page.$$eval('[data-yf-bundle="yf-ref"] circle', c => c.length);
    check('YG1', 'opens on 150D/48F against itself: 48 circles each side, every ratio ×1' + w,
      f0.n === 48 && f0.total === 150 && f0.locked && f0.circles === 48 && ref0 === 48 && f0.stiff === 1 && f0.surface === 1, JSON.stringify(f0));
    const layout = await page.getAttribute('[data-yf-svg]', 'data-yf-layout');
    check('YG1', 'the two bundles sit side by side on a wide screen, stacked on a phone' + w, layout === (width < 600 ? 'stacked' : 'side'), layout);
    const idx = n => String([24, 36, 48, 72, 96, 144, 192, 288, 576].indexOf(n));
    await page.locator('[data-yf-n]').fill(idx(96));
    const f1 = await yf();
    const stiffVal = (await page.textContent('[data-yf-bar="stiff"] .yf-bar__val')).trim();
    check('YG1', '96 filaments: 96 circles, dpf 1.56, bundle stiffness ×0.5 on the bar' + w,
      f1.n === 96 && f1.circles === 96 && Math.abs(f1.dpf - 1.5625) < 1e-9 && f1.stiff === 0.5 && stiffVal === '×0.5', JSON.stringify(f1) + ' ' + stiffVal);
    await page.locator('[data-yf-n]').fill(idx(576));
    const dpfTxt = (await page.textContent('[data-yf-o="dpf"]')).trim();
    check('YG1', '576 filaments read as super-microfiber' + w, /super-microfiber/.test(dpfTxt), dpfTxt);
    const totalDisabled = await page.$eval('[data-yf-total]', e => e.disabled);
    check('YG2', 'the total denier is locked while the lock is on' + w, totalDisabled);
    await page.click('[data-yf-lock]');
    await page.selectOption('[data-yf-total]', '75');
    const f2 = await yf(), note2 = (await page.textContent('[data-yf-o="note"]')).trim();
    check('YG2', 'unlocked to 75 D: the panel says two things moved at once' + w, f2.total === 75 && !f2.locked && /^! the total denier changed too/.test(note2), note2);
    await page.click('[data-yf-lock]');
    const f3 = await yf();
    check('YG2', 'locking again puts the total back to 150 D' + w, f3.locked && f3.total === 150, JSON.stringify(f3));
    await page.locator('[data-yf-n]').fill(idx(48));

    // YP4
    const hs = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('YP4', 'no horizontal scroll' + w, hs <= 0, hs);
    check('YP4', 'no console or page errors' + w, errs.length === 0, errs.join(' | '));
    if (flag('--shots')) await page.screenshot({ path: path.join(argv[argv.indexOf('--shots') + 1], 'yarn-characterization-' + width + '.png'), fullPage: true });
    await ctx.close();
  }
  await b.close();
  srv.close();
  return results;
}

/* ---------- main ---------- */
let bad = report(await partOne(pathToFileURL(ROOT + path.sep).href), 'PART ONE (yarn-count / twist / strength / fineness)');
if (flag('--browser')) bad += report(await browser(), 'PART TWO (the page)');
if (flag('--negative-control')) bad += await negativeControl();
console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
process.exit(bad ? 1 : 0);
