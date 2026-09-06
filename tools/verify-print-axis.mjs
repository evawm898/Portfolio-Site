// Gate for the SHAPE-DERIVED DIRECTION (print-infill.js, `direction: 'axis'`) —
// a per-part axis read off the part's own filled region, strokes run along it,
// and an axial density ramp from base to tip.
//
//   node tools/verify-print-axis.mjs [--negative-control] [--mutant=<id>]
//                                    [--skip-leaf]
//
// It runs in TWO halves for the same reason the other two infill gates do.
//
// PART ONE drives the SHIPPED functions — partAxis(), medialOffsets(),
// makeWarp(), warpPoint/unwarpPoint(), warpFrame(), axialFactor(),
// axialStationAt(), axialClip(), toneRowSpans() — over outlines whose right
// answer can be written down: a straight tapered leaf, a bent leaf, a rotated
// copy of each. An axis is a two-number answer, and on the real leaf's
// 114-edge silhouette a WRONG axis still draws a plausible picture at a
// plausible angle; only a shape whose long dimension is known can say the
// number is right.
//
// PART TWO drives the stage in a real browser on the SEPARATE LEAF and
// measures every claim against the EMITTED SEGMENT COORDINATES in pixels.
//
// THE DIRECTION-DEPENDENT MEMBERSHIP HAZARD IS LOAD-BEARING HERE, not
// background. #160 measured it: the same ink judged at its own scan angle read
// 0 of 4194 outside, and judged 35 degrees away read 33 of 5361, up to 20 px
// DEEP INSIDE the shape, because the projected silhouette is open and a
// winding rule scanned at one angle can disagree with the same rule scanned at
// another. A per-part axis puts THREE distinct scan directions in play in one
// frame instead of one, so this gate takes each part's own `scanAngleDeg` out
// of the stats and judges that part's ink there — and measures the
// disagreement between parts rather than hiding it in a tolerance.
//
// --negative-control re-runs everything against deliberately broken copies of
// print-infill.js and requires each to fail on the checks it names and no
// others.
//
// Dev-only deps, not in package.json (same convention as the other gates):
//   npm i --no-save playwright-core three@0.161.0

import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control') || args.some(a => a.startsWith('--mutant='));
const ONLY = (() => { const a = args.find(x => x.startsWith('--mutant=')); return a ? a.slice(9) : null; })();
const SKIP_LEAF = args.includes('--skip-leaf');

const LEAF_BUNDLE = 'assets/print-test/bloom-stem-leaf-bundle.glb';

// ===========================================================================
// The mutants. Each is one surgical edit that leaves the page running and the
// picture plausible — which is the whole difficulty: a hatch at the wrong
// angle, or a base at the wrong end, is still a drawing.
const MUTANTS = [
  {
    id: 'axis-is-the-short-dimension',
    from: '  const pa = principalAxis(f);\n  if (!pa) return null;\n  let ex = pa.ex, ey = pa.ey;',
    to: '  const pa = principalAxis(f);\n  if (!pa) return null;\n  let ex = -pa.ey, ey = pa.ex;',
    // NOT here, and each absence was measured rather than predicted:
    // `axial/*` drives toneRowSpans with a hand-built station map and never
    // asks partAxis anything, and `warp/round-trips-on-a-bent-part` is a
    // self-consistency property that holds about any axis at all.
    breaks: [
      'axis/tracks-the-long-dimension', 'axis/follows-a-rotated-part',
      'axis/base-is-the-end-nearest-the-attachment', 'axis/base-flips-with-the-attachment',
      'axis/without-an-attachment-the-base-is-the-wider-end',
      'axis/the-wider-end-is-measured-not-assumed',
      'axis/length-is-the-long-extent',
      'warp/deviation-is-the-measured-chord-error', 'warp/is-inert-on-a-straight-part',
      'warp/rows-follow-the-centre-line',
      'leaf/strokes-run-along-the-derived-axis',
      'leaf/ignores-the-global-angle-in-axis-mode',
      // A wrong axis makes the shear meaningless, so the ink flies: 430 px
      // past the margin against the shipped 2.7.
      'shear/excursion-is-bounded-and-named',
    ],
  },
  {
    id: 'base-is-always-t0',
    from: "    flip = Math.abs(ta - t1) < Math.abs(ta - t0);\n    basis = 'attachment';",
    to: "    flip = false;\n    basis = 'attachment';",
    // `axis/follows-a-rotated-part` goes red too, and that is the right
    // answer: past 180 degrees the attachment is the ONLY thing that says
    // which way round the axis runs.
    breaks: ['axis/base-flips-with-the-attachment', 'axis/follows-a-rotated-part',
             'shear/excursion-is-bounded-and-named'],
  },
  {
    id: 'the-warp-is-a-no-op',
    from: 'export function warpOffsetAt(w, t) {\n  const ts = w.ts, n = ts.length;',
    to: 'export function warpOffsetAt(w, t) {\n  if (t === t) return 0;\n  const ts = w.ts, n = ts.length;',
    // `warp/round-trips-on-a-bent-part` stays GREEN under this one, measured:
    // a no-op shear is still its own exact inverse. That is why the check that
    // compares against the CENTRE LINE has to exist, and why the leaf needs a
    // witness that a stroke actually bends.
    breaks: ['warp/rows-follow-the-centre-line', 'leaf/strokes-curve-with-the-shape'],
  },
  {
    id: 'the-axial-ramp-is-flat',
    from: 'export function axialFactor(s, bias) {\n  const b = Math.max(0, Math.min(1, bias));',
    to: 'export function axialFactor(s, bias) {\n  const b = 0 * Math.max(0, Math.min(1, bias));',
    // axialStationAt is the clipper's own inverse and is NOT touched, so the
    // ink is unmoved: this mutation is caught only by the check that holds the
    // field and its inverse together, which is the point of having it.
    breaks: ['axial/factor-inverts-the-station', 'axial/is-heavier-at-the-base'],
  },
  {
    id: 'the-ramp-runs-tip-to-base',
    from: 'export function axialStationAt(tau, bias) {\n  const b = Math.max(0, Math.min(1, bias));\n  if (b <= 0) return tau <= 1 ? Infinity : -1;\n  if (tau > 1) return -1;\n  const s = (1 - tau) / b;',
    to: 'export function axialStationAt(tau, bias) {\n  const b = Math.max(0, Math.min(1, bias));\n  if (b <= 0) return tau <= 1 ? Infinity : -1;\n  if (tau > 1) return -1;\n  const s = 1 - (1 - tau) / b;',
    // The ink still thins toward the tip under this one — a wrong ramp is
    // still a ramp — so the ONLY witness is the field against its inverse.
    breaks: ['axial/factor-inverts-the-station'],
  },
  {
    id: 'axis-mode-leaks-into-global',
    from: "    const baseDeg = A ? 0 : this.angleDeg;",
    to: "    const baseDeg = 0;",
    // `global/is-unchanged-by-the-new-mode` stays GREEN under this one and
    // that is the honest reading of it: it compares global BEFORE against
    // global AFTER, and a mutation that breaks both equally is invisible to a
    // round trip. The witness is the slider actually turning the hatch.
    breaks: ['global/the-angle-slider-still-turns-the-hatch',
             'leaf/global-mode-obeys-the-global-angle-instead'],
  },
];

// ===========================================================================
let OVERRIDE = null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/print') p = '/print.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { r.writeHead(404); return r.end('nf'); }
  const body = (OVERRIDE && p === '/print-infill.js')
    ? Buffer.from(OVERRIDE.text, 'utf8') : readFileSync(f);
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PRINT_CHROME || '/opt/pw-browsers/chromium' });

async function loadModule(mutantId) {
  if (!mutantId) return import('../print-infill.js');
  const tmp = path.join(ROOT, `.axis-mutant-${mutantId}.js`);
  writeFileSync(tmp, OVERRIDE.text);
  try { return await import(`../.axis-mutant-${mutantId}.js?v=${Date.now()}`); }
  finally { setTimeout(() => { try { rmSync(tmp); } catch {} }, 0); }
}

// ===========================================================================
async function run({ mutant = null } = {}) {
  const M = await loadModule(mutant);
  const {
    ScanIndex, principalAxis, partAxis, medialOffsets, centreSpanAt, crossSpansAt,
    makeWarp, warpOffsetAt, warpPoint, unwarpPoint, warpFrame,
    axialFactor, axialStationAt, axialClip,
    toneRowSpans, rotatePaths, veinPaths, TONE_LEVELS, INFILL_DIRECTIONS,
  } = M;

  const checks = new Map(), details = new Map();
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok); details.set(name, detail);
    if (!mutant) console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };
  const log = (...a) => { if (!mutant) console.log(...a); };
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  // Angles are compared MODULO 180 wherever only the LINE matters, and
  // modulo 360 wherever the base->tip sense does. Getting that backwards makes
  // a reversed axis look correct, which is one of the mutations.
  const dAng180 = (a, b) => { let d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
  const dAng360 = (a, b) => { let d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

  // -------------------------------------------------------------------------
  // PART ONE — the axis, the warp and the ramp, on shapes with known answers.
  log('\n--- part one: the axis, the shear and the ramp, on known shapes ---');

  const frameFromRings = (rings) => {
    const xs = [], ys = [], xe = [], ye = [];
    for (const r of rings) {
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        xs.push(a[0]); ys.push(a[1]); xe.push(b[0]); ye.push(b[1]);
      }
    }
    const all = rings.flat();
    return {
      x0: Float32Array.from(xs), y0: Float32Array.from(ys),
      x1: Float32Array.from(xe), y1: Float32Array.from(ye),
      n: xs.length, ok: xs.length >= 3,
      minX: Math.min(...all.map(p => p[0])), maxX: Math.max(...all.map(p => p[0])),
      minY: Math.min(...all.map(p => p[1])), maxY: Math.max(...all.map(p => p[1])),
      ax: 0, ay: 0, reach: 1, depth: 0,
    };
  };
  const rotRing = (ring, deg, ox = 0, oy = 0) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return ring.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]);
  };

  // A leaf: broad at x = 0, tapering to a point at x = 200, half-width
  // following a sine so the base end is genuinely the wider one. `bend` lifts
  // the centre line into an arc, which is the case the straight axis is a
  // CHORD of and the shear exists for.
  const leafRing = (len = 200, halfW = 34, bend = 0, steps = 40) => {
    const top = [], bot = [];
    const mid = (t) => bend * Math.sin(Math.PI * t);
    const w = (t) => halfW * Math.sin(Math.PI * Math.pow(t, 0.62));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = t * len;
      top.push([x, mid(t) + w(t)]);
      bot.push([x, mid(t) - w(t)]);
    }
    return top.concat(bot.reverse());
  };

  const straight = frameFromRings([leafRing()]);
  const bent = frameFromRings([leafRing(200, 34, 46)]);

  // --- the axis ------------------------------------------------------------
  {
    const ax = partAxis(straight, [0, 0]);
    check('axis/tracks-the-long-dimension', ax && dAng180(ax.angleDeg, 0) < 1.0,
      ax ? `axis ${ax.angleDeg.toFixed(2)}° on a leaf lying along x` : 'no axis');
    check('axis/length-is-the-long-extent', ax && near(ax.t1 - ax.t0, 200, 3),
      ax ? `${(ax.t1 - ax.t0).toFixed(1)} px against a 200 px leaf` : 'no axis');

    // ROTATE THE PART, THE AXIS FOLLOWS. Not a re-derivation of the same
    // number: the outline is rotated point by point and the axis is asked
    // again, so an axis that came from the bounding box rather than the shape
    // would move by the wrong amount.
    let worst = 0, worstDeg = 0;
    for (const deg of [17, 37, 90, 128, 205, 301]) {
      const r = frameFromRings([rotRing(leafRing(), deg, 100, 0)]);
      const a2 = partAxis(r, rotRing([[0, 0]], deg, 100, 0)[0]);
      const d = a2 ? dAng360(a2.angleDeg, deg) : 999;
      if (d > worst) { worst = d; worstDeg = deg; }
    }
    check('axis/follows-a-rotated-part', worst < 1.5,
      `worst ${worst.toFixed(2)}° at ${worstDeg}°, over six rotations`);
  }

  // --- which end is the base ----------------------------------------------
  {
    const atBase = partAxis(straight, [-30, 0]);
    const atTip = partAxis(straight, [230, 0]);
    check('axis/base-is-the-end-nearest-the-attachment',
      atBase && atBase.basis === 'attachment' && Math.hypot(atBase.base[0] - 0, atBase.base[1]) < 6,
      atBase ? `base at ${atBase.base.map(v => v.toFixed(1)).join(',')} for an attachment at (-30,0)` : 'no axis');
    check('axis/base-flips-with-the-attachment',
      atBase && atTip && Math.hypot(atTip.base[0] - 200, atTip.base[1]) < 6
        && dAng360(atBase.angleDeg, atTip.angleDeg) > 175,
      atTip ? `base moves to ${atTip.base.map(v => v.toFixed(1)).join(',')}, axis turns `
        + `${dAng360(atBase.angleDeg, atTip.angleDeg).toFixed(0)}°` : 'no axis');

    // With no attachment at all — a single-part bundle — the base is the end
    // the shape is WIDER at, measured off its own cross-spans.
    const w = partAxis(straight, null);
    check('axis/without-an-attachment-the-base-is-the-wider-end',
      w && w.basis === 'width' && Math.hypot(w.base[0] - 0, w.base[1]) < 6,
      w ? `basis ${w.basis}, base at ${w.base.map(v => v.toFixed(1)).join(',')} (the leaf is broad at x=0)` : 'no axis');
    const rev = frameFromRings([leafRing().map(([x, y]) => [200 - x, y])]);
    const wr = partAxis(rev, null);
    check('axis/the-wider-end-is-measured-not-assumed',
      wr && Math.hypot(wr.base[0] - 200, wr.base[1]) < 6,
      wr ? `mirrored leaf: base at ${wr.base.map(v => v.toFixed(1)).join(',')}` : 'no axis');
  }

  // --- the straight axis on a curved part: the documented failure ----------
  {
    const ax = partAxis(bent, [0, 0]);
    const med = medialOffsets(bent, ax, { samples: 21 });
    let worst = 0;
    for (let i = 0; i < med.ts.length; i++) worst = Math.max(worst, Math.abs(med.us[i] - ax.u0));
    // This is the number the header and the read-out claim, MEASURED rather
    // than asserted: on a leaf bowed 46 px the straight principal axis misses
    // the shape's own centre line by tens of pixels.
    check('axis/is-a-chord-on-a-curved-part', worst > 15,
      `the straight axis misses the centre line by up to ${worst.toFixed(1)} px on a 46 px bow`
      + ' — this is the failure the shear exists for, stated as a measurement');
    const w = makeWarp(bent, ax, { samples: 21 });
    check('warp/deviation-is-the-measured-chord-error', near(w.deviationPx, worst * 2, worst * 0.5 + 2)
      || near(w.hi - w.lo, worst * 2, worst * 0.5 + 2),
      `warp spans ${w.deviationPx.toFixed(1)} px against a ±${worst.toFixed(1)} px centre line`);
  }

  // --- the medial line has ONE owner --------------------------------------
  {
    const pa = principalAxis(bent);
    const qx = -pa.ey, qy = pa.ex;
    let t0 = Infinity, t1 = -Infinity;
    for (let i = 0; i < bent.n; i++) {
      for (const [x, y] of [[bent.x0[i], bent.y0[i]], [bent.x1[i], bent.y1[i]]]) {
        const t = (x - pa.cx) * pa.ex + (y - pa.cy) * pa.ey;
        if (t < t0) t0 = t; if (t > t1) t1 = t;
      }
    }
    const L = t1 - t0;
    const ax = { ...pa, qx, qy, t0, t1, cdot: pa.cx * pa.ex + pa.cy * pa.ey,
      u0: pa.cx * qx + pa.cy * qy };
    const med = medialOffsets(bent, ax, { samples: 11, t0: t0 + L * 0.05, t1: t1 - L * 0.05 });
    const rib = veinPaths(bent, 0)[0];
    const same = rib.length === med.ts.length && rib.every(([x, y], i) => {
      const px = (med.ts[i] + ax.cdot) * pa.ex + med.us[i] * qx;
      const py = (med.ts[i] + ax.cdot) * pa.ey + med.us[i] * qy;
      return Math.hypot(x - px, y - py) < 1e-6;
    });
    check('medial/is-the-same-line-the-veins-use', same,
      `${rib.length} rib samples reproduced from medialOffsets() to 1e-6 px`
      + ' — one owner, so a curved leaf cannot bend its veins one way and its strokes another');
  }

  // --- the shear -----------------------------------------------------------
  {
    const axS = partAxis(straight, [0, 0]);
    const wS = makeWarp(straight, axS, { samples: 21 });
    check('warp/is-inert-on-a-straight-part', wS.K === 1 && wS.deviationPx < 2.0,
      `K=${wS.K} piece, centre line deviates ${wS.deviationPx.toFixed(2)} px`
      + ' — a straight part pays nothing for the shear');

    const axB = partAxis(bent, [0, 0]);
    const wB = makeWarp(bent, axB, { samples: 21 });
    let worst = 0;
    for (const [x, y] of [[10, 4], [90, -20], [150, 25], [199, 1], [40, 30], [175, -14]]) {
      const [t, n] = warpPoint(wB, x, y);
      const [bx, by] = unwarpPoint(wB, t, n);
      worst = Math.max(worst, Math.hypot(bx - x, by - y));
    }
    check('warp/round-trips-on-a-bent-part', worst < 1e-9,
      `worst residual ${worst.toExponential(2)} px over six points`);
    check('warp/needs-more-than-one-piece-on-a-bent-part', wB.K > 1,
      `K=${wB.K} pieces for a ${wB.deviationPx.toFixed(1)} px bow`);

    // THE CLAIM: a row of constant cross-offset, unwarped, follows the shape's
    // own centre line — and a straight line at the axis angle does not.
    const med = medialOffsets(bent, axB, { samples: 41 });
    const medPts = med.ts.map((t, i) => [
      (t + axB.cdot) * axB.ex + med.us[i] * axB.qx,
      (t + axB.cdot) * axB.ey + med.us[i] * axB.qy]);
    const distToMedial = (px, py) => {
      let d = Infinity;
      for (let i = 0; i + 1 < medPts.length; i++) {
        const [ax0, ay0] = medPts[i], [bx0, by0] = medPts[i + 1];
        const dx = bx0 - ax0, dy = by0 - ay0, LL = dx * dx + dy * dy;
        let t = LL ? ((px - ax0) * dx + (py - ay0) * dy) / LL : 0;
        t = Math.max(0, Math.min(1, t));
        d = Math.min(d, Math.hypot(px - (ax0 + dx * t), py - (ay0 + dy * t)));
      }
      return d;
    };
    let warped = 0, straightLine = 0;
    for (let i = 0; i <= 40; i++) {
      const t = axB.t0 + (axB.t1 - axB.t0) * (i / 40);
      const [x, y] = unwarpPoint(wB, t, 0);
      warped = Math.max(warped, distToMedial(x, y));
      const sx = axB.cx + t * axB.ex, sy = axB.cy + t * axB.ey;
      straightLine = Math.max(straightLine, distToMedial(sx, sy));
    }
    // A COMPARISON, not an absolute bar. How far a row may stray depends on how
    // big the shape is on screen, which is exactly the flake that put an
    // absolute threshold 0.9 px from the shipped value in the line-art gate.
    check('warp/rows-follow-the-centre-line',
      straightLine > 15 && warped < straightLine / 5,
      `a sheared row is ${warped.toFixed(2)} px off the centre line where the straight `
      + `axis is ${straightLine.toFixed(1)} px off — ${(straightLine / warped).toFixed(1)}x closer`);

    // The sheared silhouette is still a silhouette the shared rule can scan.
    const fw = warpFrame(wB, bent);
    check('warp/the-sheared-outline-is-still-scannable',
      fw.ok && fw.n === bent.n && new ScanIndex(fw, 1, 0, 1).spansAt(0).length >= 2,
      `${fw.n} edges, ${new ScanIndex(fw, 1, 0, 1).spansAt(0).length / 2} span(s) on the centre row`);
  }

  // --- the axial ramp ------------------------------------------------------
  {
    check('axial/zero-bias-is-inert',
      axialFactor(0, 0) === 1 && axialFactor(1, 0) === 1 && axialStationAt(0.5, 0) === Infinity,
      'factor 1 everywhere and the clip vacuous — bias 0 is bit-identical to no ramp');
    check('axial/is-heavier-at-the-base',
      axialFactor(0, 0.8) > axialFactor(0.5, 0.8) && axialFactor(0.5, 0.8) > axialFactor(1, 0.8),
      `${axialFactor(0, 0.8).toFixed(2)} / ${axialFactor(0.5, 0.8).toFixed(2)} / ${axialFactor(1, 0.8).toFixed(2)}`
      + ' at base / middle / tip');

    // The field and the clipper's inverse of it must agree, exactly — the
    // same discipline `tone/radius-inverts-tone` holds the radial pair to.
    let worst = 0;
    for (const bias of [0.15, 0.4, 0.75, 1]) {
      for (const s of [0, 0.13, 0.4, 0.67, 0.9, 1]) {
        const tau = axialFactor(s, bias);
        const back = axialStationAt(tau, bias);
        if (!isFinite(back)) { if (s < 1 - 1e-9) worst = Math.max(worst, 1); continue; }
        worst = Math.max(worst, Math.abs(back - s));
      }
    }
    check('axial/factor-inverts-the-station', worst < 1e-9,
      `max residual ${worst.toExponential(2)}`);

    // The clip is an interval, and it is the RIGHT interval: compared against
    // a brute-force sweep of the same affine station map.
    let bad = 0, tested = 0;
    for (const [du, dv, c0] of [[1, 0, -20], [0.6, -0.8, 3], [-0.5, 0.87, -11], [0, 1, 4]]) {
      for (const v of [-30, 0, 17]) {
        const tMax = 55;
        const iv = axialClip(tMax, du, dv, c0, v);
        for (let u = -200; u <= 200; u += 1.7) {
          tested++;
          const inside = (u * du + v * dv + c0) <= tMax + 1e-9;
          const claimed = iv !== null && u >= iv[0] - 1e-9 && u <= iv[1] + 1e-9;
          if (inside !== claimed) bad++;
        }
      }
    }
    check('axial/clip-is-exactly-the-station-interval', bad === 0 && tested > 2000,
      `${tested} sampled u, ${bad} disagreements with the affine station map`);
  }

  // --- the ramp, through the SHIPPED fill row -------------------------------
  {
    // A 200 x 60 rectangle filled by toneRowSpans, rows along x. The axial
    // context is exactly what _tonePart builds.
    const rect = frameFromRings([[[0, -30], [200, -30], [200, 30], [0, 30]]]);
    const fill = (bias) => {
      const ctx = {
        idx: new ScanIndex(rect, 1, 0, 1), occ: [], rot: [], halfVein: 0,
        pitch: 1, au: 0, av: 0, reach: 1e6, gamma: 1, darkness: 1, gradient: 0, jitter: 0,
        axial: bias > 0 ? { bias, t0: 0, tLen: 200, du: 1, dv: 0, c0: 0 } : null,
      };
      const thirds = [0, 0, 0];
      for (let k = -30; k <= 30; k++) {
        const row = toneRowSpans(ctx, k);
        for (let q = 0; q + 1 < row.spans.length; q += 2) {
          for (let u = Math.ceil(row.spans[q]); u <= row.spans[q + 1]; u++) {
            const b = Math.min(2, Math.max(0, Math.floor(u / (200 / 3))));
            thirds[b]++;
          }
        }
      }
      return thirds;
    };
    const flat = fill(0), ramped = fill(0.9);
    check('axial/zero-bias-fills-evenly', flat[0] > 0 && Math.abs(flat[0] - flat[2]) / flat[0] < 0.02,
      `base/middle/tip ink ${flat.join(' / ')} — no ramp`);
    check('axial/ramps-along-the-long-dimension',
      ramped[0] > ramped[1] && ramped[1] > ramped[2] && ramped[2] < ramped[0] * 0.75,
      `base/middle/tip ink ${ramped.join(' / ')} at bias 0.90`);
    check('axial/never-adds-ink', ramped.every((v, i) => v <= flat[i] + 1),
      `${ramped.join('/')} against ${flat.join('/')} — the ramp only ever takes ink away`);

    // And it is INERT at bias 0, span for span, not merely close.
    const spansOf = (bias) => {
      const ctx = {
        idx: new ScanIndex(rect, 1, 0, 1), occ: [], rot: [], halfVein: 0,
        pitch: 1, au: 0, av: 0, reach: 1e6, gamma: 1, darkness: 1, gradient: 0, jitter: 0,
        axial: bias === null ? null : { bias, t0: 0, tLen: 200, du: 1, dv: 0, c0: 0 },
      };
      const out = [];
      for (let k = -30; k <= 30; k++) out.push(toneRowSpans(ctx, k).spans.join(','));
      return out.join('|');
    };
    check('axial/zero-bias-is-span-identical-to-no-ramp', spansOf(0) === spansOf(null),
      '61 rows, span for span');
  }

  check('page/direction-is-a-two-value-choice',
    Array.isArray(INFILL_DIRECTIONS) && INFILL_DIRECTIONS.length === 2
    && INFILL_DIRECTIONS[0] === 'global' && INFILL_DIRECTIONS.includes('axis'),
    JSON.stringify(INFILL_DIRECTIONS) + ' — global first, because it stays the default');

  // -------------------------------------------------------------------------
  // PART TWO — the stage in the page, measured on emitted pixel coordinates.
  log('\n--- part two: the direction in the page ---');

  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctxB.route('https://cdn.jsdelivr.net/npm/three@0.161.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    const f = path.join(ROOT, 'node_modules/three', rel);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
  });
  await ctxB.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const page = await ctxB.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const call = (fn, ...a) => page.evaluate(fn, ...a);
  const settle = () => page.waitForTimeout(700);

  await page.goto(`http://127.0.0.1:${PORT}/print`);
  await page.waitForFunction(() => window.__printScaffold && window.__printScaffold.ready, { timeout: 60000 });
  await settle();

  check('page/global-is-still-the-default',
    (await call(() => window.__printInfill.direction())) === 'global'
    && (await call(() => document.getElementById('infillDirection').value)) === 'global',
    'a working mode was not removed to add one');

  await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });
  await settle();

  const snapshot = async (i) => call(k => ({
    frame: window.__printInfill.frame(k),
    sil: window.__printInfill.silhouette(k),
    segs: window.__printInfill.segments(k),
    axis: window.__printInfill.axis(k),
    name: window.__printInfill.partNames()[k],
  }), i);
  const rebuildFrame = (sil) => ({
    x0: Float32Array.from(sil.map(s => s[0])), y0: Float32Array.from(sil.map(s => s[1])),
    x1: Float32Array.from(sil.map(s => s[2])), y1: Float32Array.from(sil.map(s => s[3])),
    n: sil.length, ok: sil.length >= 3,
    minX: Math.min(...sil.map(s => Math.min(s[0], s[2]))),
    maxX: Math.max(...sil.map(s => Math.max(s[0], s[2]))),
    minY: Math.min(...sil.map(s => Math.min(s[1], s[3]))),
    maxY: Math.max(...sil.map(s => Math.max(s[1], s[3]))),
  });
  const containsExact = (idx, ca, sa, x, y) => {
    const sp = idx.spansAt(-x * sa + y * ca);
    const u = x * ca + y * sa;
    for (let i = 0; i + 1 < sp.length; i += 2) if (u >= sp[i] && u <= sp[i + 1]) return true;
    return false;
  };
  const ptSegDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  };
  const segDirs = (segs) => segs
    .filter(([a, b, c, d]) => Math.hypot(c - a, d - b) > 1.5)
    .map(([a, b, c, d]) => (Math.atan2(d - b, c - a) * 180 / Math.PI + 360) % 180);
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

  // --- GLOBAL MODE IS UNCHANGED -------------------------------------------
  // The load-bearing one, and it is measured as a byte-for-byte comparison of
  // the emitted segments across a round trip through the new mode, not as an
  // argument that the guards are in the right places.
  await call(() => window.__printInfill.setMode('hatch'));
  await call(() => window.__printInfill.setWidget('angle', 20));
  await settle();
  const g0 = await call(() => window.__printInfill.segments(1));
  await call(() => window.__printInfill.setDirection('axis'));
  await settle();
  const axisSegs = await call(() => window.__printInfill.segments(1));
  await call(() => window.__printInfill.setDirection('global'));
  await settle();
  const g1 = await call(() => window.__printInfill.segments(1));
  check('global/is-unchanged-by-the-new-mode',
    g0.length > 200 && JSON.stringify(g0) === JSON.stringify(g1),
    `${g0.length} segments, identical across a round trip through 'axis'`);
  check('axis/actually-changes-the-drawing', JSON.stringify(g0) !== JSON.stringify(axisSegs),
    `${g0.length} global segments vs ${axisSegs.length} axis segments`);
  {
    const d20 = median(segDirs(g0));
    await call(() => window.__printInfill.setWidget('angle', 75));
    await settle();
    const d75 = median(segDirs(await call(() => window.__printInfill.segments(1))));
    check('global/the-angle-slider-still-turns-the-hatch',
      dAng180(d20, 20) < 3 && dAng180(d75, 75) < 3,
      `median stroke ${d20.toFixed(1)}° at angle 20, ${d75.toFixed(1)}° at angle 75`);
    await call(() => window.__printInfill.setWidget('angle', 20));
    await settle();
  }

  // --- the panel ----------------------------------------------------------
  {
    await call(() => window.__printInfill.setDirection('global'));
    const rGlobal = await call(() => window.__printInfill.rowVisibility());
    await call(() => window.__printInfill.setDirection('axis'));
    const rAxis = await call(() => window.__printInfill.rowVisibility());
    check('panel/the-angle-slider-hides-when-no-stroke-obeys-it',
      rGlobal.angle === true && rAxis.angle === false,
      `angle row ${rGlobal.angle} in global, ${rAxis.angle} in axis`);
    check('panel/the-axial-ramp-hides-when-there-is-no-axis',
      rGlobal.axial === false && rAxis.axial === true,
      `axial row ${rGlobal.axial} in global, ${rAxis.axial} in axis`);
    await call(() => window.__printInfill.setDirection('global'));
    await settle();
  }

  // -------------------------------------------------------------------------
  // THE LEAF. The review target, and the only part in either bundle on which
  // this technique can be judged: the bloom is one fused solid (see below).
  // Skipped under --negative-control for the reason the tone gate skips it —
  // none of the mutations touch bundle loading — except that here the leaf IS
  // the subject, so the mutations that need it are re-asserted on the DEFAULT
  // bundle's stem, which is also a long tapering part.
  let LEAF = null;
  if (!SKIP_LEAF) {
    log('\n--- the separate leaf ---');
    const buf = readFileSync(path.join(ROOT, LEAF_BUNDLE));
    await page.setInputFiles('#bundleFile',
      { name: 'bloom-stem-leaf-bundle.glb', mimeType: 'model/gltf-binary', buffer: buf });
    await page.waitForFunction(
      () => window.__printScaffold && window.__printScaffold.source === 'bloom-stem-leaf-bundle.glb',
      { timeout: 120000 });
    await page.waitForFunction(() => !!window.__printInfill, { timeout: 120000 });
    await page.waitForTimeout(2500);
    await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });

    const names = await call(() => window.__printInfill.partNames());
    const li = names.indexOf('leaf'), bi = names.indexOf('bloom');
    const box = await call(() => window.__printScaffold.partBox('leaf'));
    if (box) {
      const c = box.min.map((v, i) => (v + box.max[i]) / 2);
      const r = Math.max(...box.max.map((v, i) => v - box.min[i]));
      await call(([p, t]) => window.__printScaffold.setView(p, t),
        [[c[0] + r * 0.25, c[1] - r * 1.5, c[2] + r * 0.25], c]);
    }
    await call(() => window.__printInfill.setMode('hatch'));
    await call(() => window.__printInfill.setDirection('axis'));
    await call(() => window.__printInfill.setWidget('layers', 1));
    await call(() => window.__printInfill.setWidget('spacing', 6));
    await settle();
    LEAF = { names, li, bi };

    const leafAxis = await call(k => window.__printInfill.axis(k), li);
    const stemAxis = await call(k => window.__printInfill.axis(k), names.indexOf('stem'));
    check('leaf/has-a-derived-axis-of-its-own', !!leafAxis && leafAxis.lengthPx > 20,
      leafAxis ? `axis ${leafAxis.angleDeg.toFixed(1)}°, ${leafAxis.lengthPx.toFixed(0)} px long, `
        + `base from the ${leafAxis.basis}` : 'no axis');
    check('axis/is-per-part-not-per-model',
      !!leafAxis && !!stemAxis && dAng180(leafAxis.angleDeg, stemAxis.angleDeg) > 8,
      leafAxis && stemAxis
        ? `leaf ${leafAxis.angleDeg.toFixed(1)}° vs stem ${stemAxis.angleDeg.toFixed(1)}° — `
          + `${dAng180(leafAxis.angleDeg, stemAxis.angleDeg).toFixed(1)}° apart`
        : 'missing an axis');

    // THE CLAIM OF THE SESSION. Strokes run along the leaf's own axis, and
    // they do so even when the global angle is set far away from it — which is
    // the control that separates "the axis is used" from "the default angle
    // happens to be close".
    const leafSnap = await snapshot(li);
    const dAxis = segDirs(leafSnap.segs);
    let offAxis = 0;
    if (leafAxis) for (const d of dAxis) offAxis = Math.max(offAxis, dAng180(d, leafAxis.angleDeg));
    const medOff = leafAxis ? median(dAxis.map(d => dAng180(d, leafAxis.angleDeg))) : 999;
    check('leaf/strokes-run-along-the-derived-axis',
      dAxis.length > 40 && medOff < 10,
      `${dAxis.length} strokes, median ${medOff.toFixed(1)}° off the derived axis `
      + `(worst ${offAxis.toFixed(1)}°, which is the shear following the bend)`);

    await call(() => window.__printInfill.setWidget('angle', 90));
    await settle();
    const stillAxis = median(segDirs((await snapshot(li)).segs)
      .map(d => dAng180(d, leafAxis.angleDeg)));
    check('leaf/ignores-the-global-angle-in-axis-mode', stillAxis < 10,
      `global angle moved to 90°, strokes still ${stillAxis.toFixed(1)}° off the leaf's own axis`);

    await call(() => window.__printInfill.setDirection('global'));
    await settle();
    const globalDirs = median(segDirs((await snapshot(li)).segs).map(d => dAng180(d, 90)));
    check('leaf/global-mode-obeys-the-global-angle-instead', globalDirs < 5,
      `median ${globalDirs.toFixed(1)}° off the 90° global angle — the comparison cell on the sheet`);
    await call(() => window.__printInfill.setDirection('axis'));
    await settle();

    // THE SHEAR, on the real leaf. A stroke is emitted in pieces only where
    // the centre line bends; the measurement is whether a stroke's own pieces
    // turn, which a straight stroke's cannot.
    {
      const a2 = await call(k => window.__printInfill.axis(k), li);
      check('leaf/the-shear-reports-what-it-cost',
        !!a2 && a2.warpPieces >= 1 && a2.warpDeviationPx >= 0,
        a2 ? `centre line deviates ${a2.warpDeviationPx.toFixed(1)} px, `
          + `strokes chopped into ${a2.warpPieces} piece${a2.warpPieces === 1 ? '' : 's'}`
          + (a2.warpPieces === 1 ? ' — this leaf is straight enough that the shear is free' : '')
        : 'no axis');
    }

    // A STROKE ACTUALLY BENDS. The shear emits each stroke as a CHAIN of
    // pieces, so the witness is the chain's own sagitta: how far its middle
    // sits from the straight chord between its ends. A shear that quietly did
    // nothing would emit the same chains, perfectly collinear — which is
    // exactly what the-warp-is-a-no-op mutant produces, and what nothing else
    // in this gate can see.
    {
      const snap = await snapshot(li);
      const chains = [];
      let cur = null;
      for (const [x0, y0, x1, y1] of snap.segs) {
        if (cur && Math.hypot(cur[cur.length - 1][0] - x0, cur[cur.length - 1][1] - y0) < 1e-6) {
          cur.push([x1, y1]);
        } else { cur = [[x0, y0], [x1, y1]]; chains.push(cur); }
      }
      let worst = 0, longest = 0;
      for (const c of chains) {
        if (c.length < 3) continue;
        const [ax0, ay0] = c[0], [bx0, by0] = c[c.length - 1];
        const L = Math.hypot(bx0 - ax0, by0 - ay0);
        if (L < 20) continue;
        longest = Math.max(longest, L);
        for (let i = 1; i < c.length - 1; i++) {
          worst = Math.max(worst, ptSegDist(c[i][0], c[i][1], ax0, ay0, bx0, by0));
        }
      }
      check('leaf/strokes-curve-with-the-shape', longest > 20 && worst > 1.0,
        `${chains.filter(c => c.length >= 3).length} multi-piece strokes; the deepest bows `
        + `${worst.toFixed(2)} px off its own chord (longest stroke ${longest.toFixed(0)} px)`);
    }

    // MEMBERSHIP, EACH PART AT ITS OWN SCAN ANGLE. The hazard #160 measured,
    // and a per-part axis is what makes it bite: three parts, three scan
    // directions, in one frame.
    //
    // Measured on the TONAL FILL, which is the family that is not sheared, so
    // this is the clipper's own answer with nothing approximate in it. The
    // shear's bounded excursion gets its own check below rather than being
    // absorbed into a tolerance here.
    const membershipReport = async () => {
      const st = await call(() => window.__printInfill.stats());
      let total = 0, outside = 0, worst = 0, cross = 0, crossWorst = 0;
      const lines = [];
      for (let i = 0; i < st.parts.length; i++) {
        const p = st.parts[i];
        if (!p.ok || !p.segments) continue;
        const snap = await snapshot(i);
        const fr = rebuildFrame(snap.sil);
        const a = p.scanAngleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
        const b = a + 35 * Math.PI / 180, cb = Math.cos(b), sb = Math.sin(b);
        const own = new ScanIndex(fr, ca, sa, 1);
        const off = new ScanIndex(fr, cb, sb, 1);
        let pOut = 0, pCross = 0, pTot = 0, pWorst = 0;
        const step = Math.max(1, Math.ceil(snap.segs.length / 3000));
        for (let q = 0; q < snap.segs.length; q += step) {
          const [x0, y0, x1, y1] = snap.segs[q];
          for (const [x, y] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
            total++; pTot++;
            const inA = containsExact(own, ca, sa, x, y);
            const inB = containsExact(off, cb, sb, x, y);
            if (inA && inB) continue;
            let d = Infinity;
            for (let k = 0; k < fr.n; k++) d = Math.min(d, ptSegDist(x, y, fr.x0[k], fr.y0[k], fr.x1[k], fr.y1[k]));
            if (d <= 1.5) continue;
            if (!inA) { outside++; pOut++; worst = Math.max(worst, d); pWorst = Math.max(pWorst, d); }
            if (!inB) { cross++; pCross++; crossWorst = Math.max(crossWorst, d); }
          }
        }
        lines.push(`${p.name} scan ${p.scanAngleDeg.toFixed(0)}°: ${pTot} pts, ${pOut} out`
          + (pOut ? ` (worst ${pWorst.toFixed(1)} px)` : '') + `, ${pCross} disagree`);
      }
      return { total, outside, worst, cross, crossWorst, lines };
    };

    // The sheared family first, as its own bounded measurement.
    {
      const r = await membershipReport();
      check('shear/excursion-is-bounded-and-named',
        r.total > 400 && r.worst < 4,
        `${r.total} points, ${r.outside} outside by more than the 1.5 px the outline itself `
        + `is thick, worst ${r.worst.toFixed(2)} px — the shear is the ONE approximation in `
        + 'this file: a silhouette edge is straight in sheared coordinates where its true '
        + 'image is a polyline, so a stroke can bow a fraction of a pixel past the margin. '
        + r.lines.join('; '));
    }

    // Then the family with no shear at all, where the answer must be exact.
    await call(() => window.__printInfill.setMode('tone'));
    await call(() => window.__printInfill.setWidget('veinWidth', 0));
    await call(() => window.__printInfill.setWidget('axial', 0));
    await settle();
    {
      const r = await membershipReport();
      check('membership/ink-is-inside-at-its-own-parts-scan-angle',
        r.total > 400 && r.outside === 0,
        `${r.total} points across three parts at three different scan angles, ${r.outside} outside`
        + (r.outside ? `, worst ${r.worst.toFixed(2)} px` : '') + ' — ' + r.lines.join('; '));
      check('membership/judging-at-another-angle-disagrees-and-that-is-the-hazard',
        r.cross >= 0,
        `${r.cross} of ${r.total} points read as OUTSIDE when the same rule is scanned 35° away`
        + (r.cross ? `, worst ${r.crossWorst.toFixed(1)} px inside the shape` : '')
        + ' — an open silhouette, not a leak: the check above is the one that means anything');
    }

    // THE AXIAL RAMP, on the leaf, in the tonal fill.
    {
      const a = await call(k => window.__printInfill.axis(k), li);
      // A FILL ROW SPANS THE WHOLE LEAF in axis mode — the rows run ALONG the
      // axis — so binning a segment by its midpoint puts every long row in the
      // middle third and reports nothing about the ends. Each segment's length
      // is distributed along the axis instead, in short steps.
      const inkByThird = async () => {
        const snap = await snapshot(li);
        const th = [0, 0, 0];
        const L = a.lengthPx || 1;
        for (const [x0, y0, x1, y1] of snap.segs) {
          const len = Math.hypot(x1 - x0, y1 - y0);
          const n = Math.max(1, Math.ceil(len / 2));
          for (let q = 0; q < n; q++) {
            const t = (q + 0.5) / n;
            const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
            const st = ((px - a.base[0]) * a.ex + (py - a.base[1]) * a.ey) / L;
            th[Math.min(2, Math.max(0, Math.floor(st * 3)))] += len / n;
          }
        }
        return th;
      };
      const flat = await inkByThird();
      const flatSegs0 = await call(k => window.__printInfill.segments(k), li);
      await call(() => window.__printInfill.setWidget('axial', 85));
      await settle();
      const ramped = await inkByThird();
      const dropBase = ramped[0] / (flat[0] || 1), dropTip = ramped[2] / (flat[2] || 1);
      check('leaf/axial-ramp-thins-toward-the-tip',
        flat[0] > 0 && flat[2] > 0 && dropTip < dropBase * 0.75 && ramped[0] > ramped[2],
        `base keeps ${(dropBase * 100).toFixed(0)}% of its ink, tip keeps ${(dropTip * 100).toFixed(0)}%`
        + `  (base/mid/tip ${flat.map(v => v.toFixed(0)).join('/')} -> ${ramped.map(v => v.toFixed(0)).join('/')} px)`);

      const before = await call(k => window.__printInfill.segments(k), li);
      await call(() => window.__printInfill.setWidget('axial', 0));
      await settle();
      const back = await call(k => window.__printInfill.segments(k), li);
      check('leaf/axial-zero-restores-the-unramped-fill',
        back.length > 50 && JSON.stringify(back) !== JSON.stringify(before)
        && JSON.stringify(back) === JSON.stringify(flatSegs0),
        `${back.length} segments, identical to the pre-ramp fill span for span`);
    }

    // THE BLOOM, UNRETOUCHED. Not a tuning target: it is one fused solid, so
    // whatever axis is derived is ONE axis for the entire flower and the hatch
    // comes out uniformly directed. Measured and said, not worked around.
    {
      await call(() => window.__printInfill.setMode('hatch'));
      await call(() => window.__printInfill.setWidget('axial', 0));
      // Frame the BLOOM. Left on the leaf's camera the bloom projects to
      // coordinates in the millions and every number about it is noise.
      const bb = await call(() => window.__printScaffold.partBox('bloom'));
      if (bb) {
        const c = bb.min.map((v, i) => (v + bb.max[i]) / 2);
        const r = Math.max(...bb.max.map((v, i) => v - bb.min[i]));
        await call(([p, t]) => window.__printScaffold.setView(p, t),
          [[c[0], c[1] - r * 1.6, c[2] + r * 0.35], c]);
      }
      await settle();
      const ba = await call(k => window.__printInfill.axis(k), bi);
      const bs = await call(k => window.__printInfill.segments(k), bi);
      const spread = bs.length ? (() => {
        const ds = segDirs(bs).map(d => dAng180(d, ba ? ba.angleDeg : 0));
        return median(ds);
      })() : -1;
      // NOT a tuning target. The bloom is one fused solid, so there is exactly
      // one axis for the entire flower and one centre line for a radial blob
      // that does not have one — which is why the strokes come back a long way
      // off the axis they were nominally run along. Measured and said.
      check('bloom/is-one-axis-for-one-fused-solid',
        !!ba && bs.length > 100,
        ba ? `one axis at ${ba.angleDeg.toFixed(1)}° over the WHOLE bloom, ${bs.length} strokes, `
          + `median ${spread.toFixed(1)}° off it, centre line "bending" ${ba.warpDeviationPx.toFixed(0)} px `
          + '— a radial solid has no long dimension and no medial line, so both the axis and '
          + 'the shear are answering a question the data cannot pose. There are no interior '
          + 'petal boundaries in the bundle: per-petal direction is blocked on multi-part export.'
        : 'no axis');
    }
  }

  check('page/no-errors', errs.length === 0, errs.join(' | '));
  if (!mutant) log(`\n${await call(() => window.__printInfill.infillText())}`);
  await ctxB.close();
  return { checks, details, errs, ok: [...checks.values()].every(Boolean) };
}

// ===========================================================================
const main = await run({});
console.log('\npage errors:', main.errs.length ? main.errs : 'none');
const failed = [...main.checks].filter(([, v]) => !v).map(([k]) => k);
console.log(`\n${main.checks.size} checks, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);

let mutantsOK = true;
if (NEG) {
  console.log('\n=== negative control ===');
  const src = readFileSync(path.join(ROOT, 'print-infill.js'), 'utf8');
  const wanted = ONLY ? ONLY.split(',') : null;
  for (const m of MUTANTS) {
    if (wanted && !wanted.includes(m.id)) continue;
    if (!src.includes(m.from)) {
      console.log(`  [FAIL] ${m.id}: mutation did not apply — the source it edits has moved`);
      mutantsOK = false; continue;
    }
    OVERRIDE = { text: src.replace(m.from, m.to) };
    const r = await run({ mutant: m.id });
    OVERRIDE = null;
    const red = [...r.checks].filter(([, v]) => !v).map(([k]) => k);
    const missed = m.breaks.filter(k => !red.includes(k));
    const extra = red.filter(k => !m.breaks.includes(k));
    const ok = missed.length === 0 && extra.length === 0;
    if (!ok) mutantsOK = false;
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(30)} red: ${red.length ? red.join(', ') : '(none)'}`);
    if (missed.length) console.log(`         MISSED (stayed green): ${missed.join(', ')}`);
    if (extra.length) console.log(`         UNCLAIMED (also red): ${extra.join(', ')}`);
    if (!ok) for (const k of [...missed, ...extra]) console.log(`           ${k}: ${r.details.get(k) || '(no detail)'}`);
  }
} else {
  console.log('\n(negative control not run — pass --negative-control to falsify every assertion above)');
}

await browser.close();
server.close();
const ok = main.ok && mutantsOK;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
