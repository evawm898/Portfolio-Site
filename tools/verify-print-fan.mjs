// Gate for the FAN (print-infill.js, mode `fan`) — strokes that converge at a
// part's base, spread toward its tip, and curve with the shape.
//
//   node tools/verify-print-fan.mjs [--negative-control] [--mutant=<id>]
//                                   [--skip-leaf]
//
// TWO HALVES, for the reason the other three infill gates run in two.
//
// PART ONE drives the SHIPPED functions — widthProfile(), profileMidAt(),
// profileHalfAt(), fanTargetSpacing() and fanRays() — over outlines whose
// right answer can be written down: a tapered leaf, a bent one, a lopsided
// one, a rotated copy. A ray set is a list of numbers, and on the real leaf's
// silhouette a WRONG fan still draws a plausible converging picture.
//
// PART TWO drives the stage in a real browser on the SEPARATE LEAF and
// measures every claim against the EMITTED SEGMENT COORDINATES in pixels.
//
// THE DIRECTION-DEPENDENT MEMBERSHIP HAZARD IS THE LOAD-BEARING ONE HERE, and
// it is worse than #163's. "Inside" is direction-dependent on an open outline
// (#160: the same ink read 0 outside at its own scan angle and 33 outside, up
// to 20 px deep, judged 35 degrees away). A fan gives every ray its own
// heading, so there is no "the ray's own angle". What the implementation does
// instead is clip PER STATION — every probe is on a row of constant station,
// and those rows all run along the part's cross axis — so the fan has exactly
// ONE scan direction after all. This gate does not take that on trust: it
// judges the ink at the part's own reported `scanAngleDeg`, and it separately
// asserts that the shear does not disturb the judgement
// (`fan/the-shear-preserves-membership-on-a-row`), because that identity is
// what lets a pixel-space measurement stand in for the warped one.
//
// AND IT CARRIES #163'S CACHE BUG FORWARD AS A CHECK. A scan index keyed on
// anything less than the frame it was built in is wrong here: every part has
// its own warp, so an index built for the bloom in the LEAF's warped frame is
// meaningless to the stem. That bug leaves no mark on any membership
// assertion — a wrong occluder subtraction takes ink AWAY — so the witness is
// `fan/no-ink-under-a-nearer-part`, which sees the ink that should have been
// removed and was not.
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
// Looks down the leaf's THINNEST bbox dimension, which is what puts the blade
// in the picture plane. From the side it is a sliver and no fan is legible.
const LEAF_VIEW = [0, 0, 1.7];
// #163's close-up, kept so the cost line is comparable with that session's.
const CLOSE_VIEW = [0.25, -1.5, 0.25];

// ===========================================================================
// The mutants. Each is one surgical edit that leaves the page running and the
// picture plausible, which is the whole difficulty: a fan with no insertion,
// or one whose rays are parallel, is still a drawing of strokes inside a leaf.
const MUTANTS = [
  {
    id: 'rays-are-parallel',
    from: '  return profileMidAt(prof, t) + (u >= 0 ? u * hp : u * hn);',
    to: '  return profileMidAt(prof, t) + u * 20 + 0 * (hp + hn);',
    // The whole point of the session, and the thing #163's three cells were
    // rejected for. Note the ink stays INSIDE (20 px is narrow enough), so
    // every membership check stays green — which is why divergence needs its
    // own witnesses rather than being inferred from a clean clip.
    breaks: [
      'fan/rays-spread-with-the-measured-width',
      'fan/rays-diverge-rather-than-run-parallel',
      'fan/converges-at-the-base',
      // AND the origin bar, which under this mutation is 40 px wide whatever
      // the floor says — the width term is gone, so the two ends of that
      // check read the same number. NOT `fan/rides-the-measured-centre-line`:
      // the mutation keeps profileMidAt, so the u = 0 ray still sits exactly
      // on the medial line, which is the point of that check being separate.
      'fan/the-origin-is-a-bar-not-a-point',
      'leaf/rays-diverge-rather-than-run-parallel',
      'leaf/convergence-is-the-gradient',
    ],
  },
  {
    id: 'the-origin-is-a-point',
    from: '  return [Math.max(-l * inset, originHalf), Math.max(h * inset, originHalf)];',
    to: '  return [-l * inset, h * inset];',
    // AND the panel's biconditional, which is the right answer: the read-out
    // still reports the floor binding at three of the part's stations while
    // the ink no longer moves, and a control that says it is acting and is not
    // is the thing that check exists to catch.
    breaks: ['fan/the-origin-is-a-bar-not-a-point',
             'panel/the-origin-floor-moves-the-ink-exactly-when-it-binds'],
  },
  {
    id: 'no-ray-insertion',
    from: '  for (let lev = 2; lev <= maxLevels; lev++) {',
    to: '  for (let lev = 2; lev <= 1; lev++) {',
    // Three rays for the whole leaf, so most of the family's claims go with
    // it. Enumerated rather than narrowed, because narrowing the mutation to
    // break fewer things would make it a smaller mutation, not a better one.
    breaks: ['fan/produces-a-ray-set', 'fan/insertion-bounds-the-gap', 'fan/insertion-is-dyadic',
             'fan/converge-0-inserts-along-the-length', 'leaf/inserts-rays-toward-the-tip',
             'leaf/draws-a-fan', 'leaf/convergence-is-the-gradient',
             'leaf/strokes-terminate-at-the-silhouette', 'leaf/darkness-is-the-target-spacing',
             // with three rays the leaf's endpoint sample is a few hundred
             // points, and the open outline's sub-percent disagreement becomes
             // 3% of it
             'open-outline/the-disagreement-is-bounded-and-named',
             'panel/every-fan-slider-moves-the-ink',
             'panel/the-origin-floor-moves-the-ink-exactly-when-it-binds'],
  },
  {
    id: 'a-station-is-a-sentinel',
    // The bug this session actually shipped for one run: `t` is negative over
    // the base half of every part, so a -1 "not found" marker reads as a real
    // birth AT THE BASE and every level is born at once. The picture is still
    // a fan; only the spacing law stops working.
    from: '    let birth = 0, found = false;\n    for (let k = 0; k < N && !found; k++) {',
    to: '    let birth = -1, found = true;\n    for (let k = 0; k < N && !found; k++) {',
    // Every level born at t = -1, which on a part whose stations run from -401
    // to +401 is the MIDDLE — so the ray count still rises along the length
    // and the picture is still a fan. `leaf/inserts-rays-toward-the-tip`
    // stayed green until it read the birth STATIONS.
    breaks: ['fan/converge-0-inserts-along-the-length', 'fan/insertion-bounds-the-gap',
             'leaf/inserts-rays-toward-the-tip', 'leaf/convergence-is-the-gradient',
             'leaf/darkness-is-the-target-spacing', 'panel/every-fan-slider-moves-the-ink',
             'panel/the-origin-floor-moves-the-ink-exactly-when-it-binds',
             // 129 rays instead of 33
             'cost/the-fan-is-not-more-expensive-than-what-shipped'],
  },
  {
    id: 'strokes-run-to-the-very-tip',
    from: '    const reach = tipReach * (1 - tipJitter * h);',
    to: '    const reach = 1;',
    // And the exactness claim costs one point in 24,948: run into the pointed
    // tip, where the shape is degenerate and the outline is open, and the fan
    // stops being exactly inside. That is a fact about the shipped default's
    // 88%, and it is recorded here rather than absorbed by a tolerance.
    breaks: ['fan/strokes-stop-short-of-the-tip', 'fan/the-tip-cutoff-is-ragged',
             'leaf/the-tip-is-left-lighter', 'leaf/ink-stays-inside-the-outline',
             'panel/every-fan-slider-moves-the-ink',
             'cost/the-fan-is-not-more-expensive-than-what-shipped'],
  },
  {
    id: 'the-occluder-cache-is-keyed-on-the-part-alone',
    from: '      const k = `${j}@fanw${i}`;',
    to: '      const k = `${j}`;',
    // THE PREDICTED WITNESS WAS THE WRONG ONE, and the negative control said
    // so: `fan/no-ink-under-a-nearer-part` came back 0 of 10,851 and stayed
    // GREEN. The reasoning behind it was #163's — a wrong occluder subtraction
    // removes ink rather than adding any — and it is sound as far as it goes,
    // but it is not what this key does. Every part has its own warp, so the
    // FIRST part to ask for index `j` fixes the frame it is built in, and a
    // part that occluded something earlier in the frame gets ITS OWN index
    // back in someone else's warped coordinates. Its ink is then clipped
    // against a garbage outline and lands outside its own: 158 of 714 leaf
    // endpoints. So the witness is the part's own ink escaping, and
    // `no-ink-under-a-nearer-part` is kept as a true property that this
    // particular mutation does not happen to violate.
    breaks: ['leaf/strokes-terminate-at-the-silhouette'],
  },
  {
    id: 'the-fan-does-not-clip-to-the-silhouette',
    from: '      if (!hit) return false;',
    to: '      if (!hit) return sp.length === 0 ? false : true;',
    breaks: ['leaf/ink-stays-inside-the-outline', 'leaf/strokes-terminate-at-the-silhouette'],
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
  const tmp = path.join(ROOT, `.fan-mutant-${mutantId}.js`);
  writeFileSync(tmp, OVERRIDE.text);
  try { return await import(`../.fan-mutant-${mutantId}.js?v=${Date.now()}`); }
  finally { setTimeout(() => { try { rmSync(tmp); } catch {} }, 0); }
}

// ===========================================================================
async function run({ mutant = null } = {}) {
  const M = await loadModule(mutant);
  const {
    ScanIndex, partAxis, makeWarp, warpFrame, unwarpPoint,
    widthProfile, profileMidAt, profileHalfAt, fanOffsetAt, fanTargetSpacing, fanRays,
    INFILL_MODES, INFILL_LIMITS, FAN_BINS,
  } = M;

  const checks = new Map(), details = new Map();
  const check = (name, ok, detail = '') => {
    checks.set(name, !!ok); details.set(name, detail);
    if (!mutant) console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${name}${detail ? '  ' + detail : ''}`);
    return !!ok;
  };
  const log = (...a) => { if (!mutant) console.log(...a); };
  const dAng180 = (a, b) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };

  // -------------------------------------------------------------------------
  // PART ONE — the field, on shapes whose answer can be written down.
  log('\n--- part one: the fan field, on known shapes ---');

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
  // A leaf: broad near x = 0, tapering to a point at x = len. `bend` bows the
  // centre line; `lean` makes the two sides different widths, which is the
  // case a fan anchored on a chord gets wrong and a measured one does not.
  const leafRing = (len = 240, halfW = 40, bend = 0, bulge = 0, steps = 60) => {
    const top = [], bot = [];
    const mid = (t) => bend * Math.sin(Math.PI * t);
    const w = (t) => halfW * Math.sin(Math.PI * Math.pow(t, 0.62));
    // `bulge` swells ONE side over the middle third, which is the asymmetry a
    // fan anchored on the principal axis reads wrong and one anchored on the
    // measured span centre rides.
    const b = (t) => bulge * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.3) / 0.45))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = t * len;
      top.push([x, mid(t) + w(t) + b(t)]);
      bot.push([x, mid(t) - w(t)]);
    }
    return top.concat(bot.reverse());
  };

  // Everything below is driven through the SAME construction the stage uses:
  // derive the axis, shear the outline, index it in rows of constant station,
  // measure the profile there. A shortcut here would be testing a second
  // implementation of the field rather than the shipped one.
  const rig = (f, attach) => {
    const ax = partAxis(f, attach);
    if (!ax) return null;
    const w = makeWarp(f, ax, { samples: 21, piecePx: 2, maxPieces: 12 });
    const fw = warpFrame(w, f);
    const idx = new ScanIndex(fw, 0, 1, 2.6,
      { vLo: -ax.t1 - 3, vHi: -ax.t0 + 3, bucketPitch: 6 });
    const prof = widthProfile(idx, 0, ax.t0, ax.t1, INFILL_LIMITS.fanProfileSamples);
    return { ax, w, fw, idx, prof, L: ax.t1 - ax.t0 };
  };
  const OPT = { spacing: 9, converge: 0.55, inset: 0.92, originHalf: 3,
    tipReach: 0.88, tipJitter: 0.35, maxLevels: 7, maxRays: 400, seed: 1 };
  // THE SHIPPED LAW, not a copy of it. Restating the ray offset here is what
  // let the `rays-are-parallel` mutation pass every part-one check in the
  // first negative-control run: the gate was measuring its own arithmetic.
  const offsetOf = (prof, u, t, o = OPT) => fanOffsetAt(prof, u, t, o.inset, o.originHalf);
  // The offsets of every ray alive at station t, sorted.
  const liveAt = (prof, rays, t, o = OPT) =>
    rays.filter(r => t >= r.tStart && t <= r.tEnd)
      .map(r => offsetOf(prof, r.u, t, o)).sort((a, b) => a - b);
  const spreadAt = (prof, rays, t, o) => {
    const v = liveAt(prof, rays, t, o);
    return v.length ? v[v.length - 1] - v[0] : 0;
  };
  const gapsAt = (prof, rays, t, o) => {
    const v = liveAt(prof, rays, t, o), g = [];
    for (let k = 1; k < v.length; k++) g.push(v[k] - v[k - 1]);
    return g;
  };

  const straight = frameFromRings([leafRing()]);
  const bent = frameFromRings([leafRing(240, 40, 52)]);
  const lopsided = frameFromRings([leafRing(240, 40, 0, 34)]);

  // --- the profile ---------------------------------------------------------
  {
    const R = rig(straight, [0, 0]);
    // The analytic half-width of the test leaf, against what the shipped
    // profile measured off its outline.
    const halfW = (frac) => 40 * Math.sin(Math.PI * Math.pow(frac, 0.62));
    let worst = 0, at = 0;
    for (const frac of [0.15, 0.3, 0.5, 0.7, 0.9]) {
      const t = R.ax.t0 + R.L * frac;
      const [hn, hp] = profileHalfAt(R.prof, t, 1, 0);
      const d = Math.max(Math.abs(hn - halfW(frac)), Math.abs(hp - halfW(frac)));
      if (d > worst) { worst = d; at = frac; }
    }
    check('profile/measures-the-half-width', worst < 2.5,
      `worst ${worst.toFixed(2)} px at ${(at * 100) | 0}% against an analytic leaf`);

    // THE PROFILE IS SYMMETRIC ABOUT ITS OWN CENTRE, BY CONSTRUCTION — the
    // centre IS the span's midpoint, so the two half-widths are equal at every
    // station and the two-sided API is a convenience, not a lopsided fan. The
    // number worth reporting is how far that centre has left to travel, and
    // the answer is ALMOST NOWHERE, because the shear has already straightened
    // the part: measured against the same profile taken WITHOUT the shear, on
    // a leaf with a 34 px bulge on one side and on one bowed 52 px. So the
    // profile's centre is a RESIDUAL correction, and the bend is the warp's
    // job — which is the division of labour this family is built on.
    const drifts = {};
    for (const [label, f] of [['bulged', lopsided], ['bowed', bent]]) {
      const R2 = rig(f, [0, 0]);
      const N2 = R2.prof.ts.length;
      let sym = 0, sheared = 0, ends = 0;
      for (let k = 0; k < N2; k++) {
        sym = Math.max(sym, Math.abs(R2.prof.hi[k] + R2.prof.lo[k]));
        const m = Math.abs(R2.prof.mid[k]);
        // The shear's samples are clamped OUTSIDE their range, so the residual
        // it leaves is concentrated at the two extremes — which is precisely
        // where a fan anchored at 0 put a whole station's rays outside the
        // shape. Interior and ends are reported apart because they are two
        // different facts.
        if (k / (N2 - 1) > 0.1 && k / (N2 - 1) < 0.9) sheared = Math.max(sheared, m);
        else ends = Math.max(ends, m);
      }
      // the same measurement with no shear at all: the raw outline, indexed
      // across the straight axis
      const rawIdx = new ScanIndex(f, R2.ax.qx, R2.ax.qy, 2.6);
      const raw = widthProfile(rawIdx, R2.ax.u0, R2.ax.t0, R2.ax.t1, INFILL_LIMITS.fanProfileSamples);
      let unsheared = 0;
      for (let k = 1; k + 1 < raw.ts.length; k++) {
        unsheared = Math.max(unsheared, Math.abs(raw.mid[k] - R2.ax.u0));
      }
      drifts[label] = { sym, sheared, ends, unsheared };
    }
    check('profile/is-symmetric-and-the-shear-has-already-straightened-it',
      Object.values(drifts).every(d => d.sym < 1e-9 && d.sheared < 3
        && d.unsheared > d.sheared * 3 && d.ends > d.sheared),
      Object.entries(drifts).map(([k, d]) => `${k}: half-widths agree to ${d.sym.toExponential(1)} px; `
        + `centre residual ${d.sheared.toFixed(1)} px over the interior and ${d.ends.toFixed(1)} px `
        + `at the clamped extremes, against ${d.unsheared.toFixed(1)} px with no shear at all`)
        .join('   |   ')
      + ' — the shear carries the bend, the measured centre carries what it clamps off the ends');

    // The centre the fan is anchored on is the span's own centre, which is
    // what stops the shear's interpolated centre line — clamped outside its
    // samples — from putting a whole station's rays outside the shape.
    const RB = rig(bent, [0, 0]);
    let bad = 0;
    for (let k = 0; k < RB.prof.ts.length; k++) {
      const sp = RB.idx.spansAt(-RB.prof.ts[k]);
      if (!sp.length) continue;
      const m = RB.prof.mid[k];
      let inside = false;
      for (let q = 0; q + 1 < sp.length; q += 2) if (m >= sp[q] && m <= sp[q + 1]) inside = true;
      if (!inside) bad++;
    }
    check('profile/the-centre-is-inside-the-shape', bad === 0,
      `${RB.prof.ts.length} stations on a 52 px bow, ${bad} whose anchor fell outside the outline`);
  }

  // --- the field -----------------------------------------------------------
  {
    const R = rig(straight, [0, 0]);
    const rays = fanRays(R.prof, OPT);
    check('fan/produces-a-ray-set', rays.length >= 8,
      `${rays.length} rays to level ${Math.max(...rays.map(r => r.level))}`);

    // A ray sits at its share of the MEASURED half-width, so it is inside the
    // shape by construction at every station. Compared against the profile
    // itself rather than against the outline, because it is a claim about the
    // law, not about the clipper.
    let worst = 0;
    for (const r of rays) {
      for (let k = 0; k <= 12; k++) {
        const t = r.tStart + (r.tEnd - r.tStart) * (k / 12);
        const n = offsetOf(R.prof, r.u, t);
        const [hn, hp] = profileHalfAt(R.prof, t, 1, 0);
        const m = profileMidAt(R.prof, t);
        worst = Math.max(worst, Math.max(0, n - (m + hp)), Math.max(0, (m - hn) - n));
      }
    }
    check('fan/rays-spread-with-the-measured-width', worst < 3.05,
      `worst excursion past the measured half-width ${worst.toFixed(2)} px `
      + '(the origin floor is 3 px and is allowed to poke out of a pointed end)');

    // THE CLAIM OF THE SESSION, and the thing #163 was rejected for: no two
    // strokes are parallel. Measured as the fan's own spread, which grows
    // with the shape from the origin bar outward.
    const sBase = spreadAt(R.prof, rays, R.ax.t0 + R.L * 0.02);
    const sMid = spreadAt(R.prof, rays, R.ax.t0 + R.L * 0.35);
    check('fan/converges-at-the-base', sMid / Math.max(sBase, 1e-6) > 3,
      `${sBase.toFixed(1)} px across at the origin against ${sMid.toFixed(1)} px at 35% `
      + `— ${(sMid / sBase).toFixed(1)}x`);

    // And divergence ray by ray, not only in aggregate: every adjacent pair
    // is further apart at 35% than at the base.
    // PER PAIR, and only over the rays alive at BOTH stations — comparing two
    // gap lists by index is meaningless the moment insertion has changed how
    // many there are, which is exactly what happens between these two
    // stations.
    const tA = R.ax.t0 + R.L * 0.02, tB2 = R.ax.t0 + R.L * 0.35;
    const both = rays.filter(r => r.tStart <= tA && r.tEnd >= tB2);
    let pairs = 0, grew = 0, worstRatio = Infinity;
    for (let a = 0; a < both.length; a++) {
      for (let b = a + 1; b < both.length; b++) {
        const dA = Math.abs(offsetOf(R.prof, both[a].u, tA) - offsetOf(R.prof, both[b].u, tA));
        const dB = Math.abs(offsetOf(R.prof, both[a].u, tB2) - offsetOf(R.prof, both[b].u, tB2));
        pairs++;
        if (dB > dA * 1.5) grew++;
        worstRatio = Math.min(worstRatio, dB / Math.max(dA, 1e-9));
      }
    }
    check('fan/rays-diverge-rather-than-run-parallel', pairs >= 3 && grew === pairs,
      `all ${pairs} pairs of the rays alive at both stations are further apart at 35% than at `
      + `the base, the closest by ${worstRatio.toFixed(1)}x — no two strokes are parallel, `
      + 'which is the property #163 was rejected for');

    // The fan rides the measured centre line, not the straight axis it was
    // derived from. On a bowed part those are tens of pixels apart, and a fan
    // anchored on the chord walks off the margin — the #163 failure, in the
    // one place this family could still have inherited it.
    const RB = rig(bent, [0, 0]);
    const rb = fanRays(RB.prof, OPT);
    const centre = rb.filter(r => r.u === 0)[0];
    let onMedial = 0, onChord = 0;
    for (let k = 1; k < 20; k++) {
      const t = RB.ax.t0 + (RB.ax.t1 - RB.ax.t0) * (k / 20);
      onMedial = Math.max(onMedial, Math.abs(offsetOf(RB.prof, centre.u, t) - profileMidAt(RB.prof, t)));
      onChord = Math.max(onChord, Math.abs(profileMidAt(RB.prof, t)));
    }
    check('fan/rides-the-measured-centre-line', !!centre && onMedial < 1e-9 && onChord < 3,
      `the centre ray sits exactly on the measured medial line (${onMedial.toExponential(1)} px), `
      + `and the shear has already taken the ${RB.w.deviationPx.toFixed(0)} px bow out — the `
      + `residual the fan still has to ride is ${onChord.toFixed(2)} px`);
  }

  // --- the origin region ---------------------------------------------------
  {
    const R = rig(straight, [0, 0]);
    const wide = fanRays(R.prof, { ...OPT, originHalf: 8 });
    const sWide = spreadAt(R.prof, wide, R.ax.t0, { ...OPT, originHalf: 8 });
    const point = fanRays(R.prof, { ...OPT, originHalf: 0 });
    const sPoint = spreadAt(R.prof, point, R.ax.t0, { ...OPT, originHalf: 0 });
    check('fan/the-origin-is-a-bar-not-a-point',
      sWide > 14 && sPoint < sWide / 3,
      `origin 8 px gives a ${sWide.toFixed(1)} px bar; origin 0 collapses it to ${sPoint.toFixed(2)} px `
      + '— a pure pencil is reachable and is not the default');
  }

  // --- the spacing law -----------------------------------------------------
  {
    check('fan/target-spacing-interpolates',
      Math.abs(fanTargetSpacing(10, 0, 3, 30) - 10) < 1e-9
      && Math.abs(fanTargetSpacing(10, 1, 3, 30) - 1) < 1e-9
      && Math.abs(fanTargetSpacing(10, 0.5, 3, 30) - 5.5) < 1e-9,
      'converge 0 -> the target outright, 1 -> width-proportional, 0.5 -> halfway');

    const R = rig(straight, [0, 0]);
    const uni = fanRays(R.prof, { ...OPT, converge: 0, tipJitter: 0 });
    const pencil = fanRays(R.prof, { ...OPT, converge: 1, tipJitter: 0 });

    // The two readings of the trade, each measured where it differs: near the
    // base the constant-spacing law has not yet inserted its deeper levels and
    // the pencil has them all.
    const tB = R.ax.t0 + R.L * 0.04;
    const nUni = liveAt(R.prof, uni, tB, { ...OPT, converge: 0 }).length;
    const nPen = liveAt(R.prof, pencil, tB, { ...OPT, converge: 1 }).length;
    check('fan/converge-0-inserts-along-the-length', nPen > nUni * 1.6,
      `at 4% of the length: ${nUni} rays at converge 0 against ${nPen} at converge 1 `
      + '— the pencil is already complete, the uniform law is still inserting');

    // The upper bound the insertion exists to hold. Levels 0 and 1 always run
    // the whole length, so the bound is asserted where insertion has had room
    // to work — past the origin region, which is what it is specified to do.
    let worstGap = 0, at = 0;
    for (const frac of [0.2, 0.35, 0.5, 0.65]) {
      const g = gapsAt(R.prof, uni, R.ax.t0 + R.L * frac, { ...OPT, converge: 0 });
      const m = g.length ? Math.max(...g) : 0;
      if (m > worstGap) { worstGap = m; at = frac; }
    }
    check('fan/insertion-bounds-the-gap', worstGap <= OPT.spacing + 1e-6,
      `worst adjacent gap ${worstGap.toFixed(2)} px against a ${OPT.spacing} px target, at ${(at * 100) | 0}%`);

    // Dyadic: every level's rays are the midpoints of the previous level's
    // grid, so the u values are exactly the dyadic rationals on [-1, 1].
    const bad = fanRays(R.prof, { ...OPT, converge: 0.5 })
      .filter(r => Math.abs(r.u * Math.pow(2, Math.max(1, r.level) - 1) - Math.round(r.u * Math.pow(2, Math.max(1, r.level) - 1))) > 1e-9);
    const levels = new Set(fanRays(R.prof, OPT).map(r => r.level));
    check('fan/insertion-is-dyadic', bad.length === 0 && levels.size >= 3,
      `${levels.size} levels in play, every u a dyadic rational of its own level`);
  }

  // --- the tip -------------------------------------------------------------
  {
    const R = rig(straight, [0, 0]);
    const rays = fanRays(R.prof, { ...OPT, tipReach: 0.7, tipJitter: 0 });
    const ends = rays.map(r => (r.tEnd - R.ax.t0) / R.L);
    check('fan/strokes-stop-short-of-the-tip', Math.max(...ends) <= 0.7 + 1e-9,
      `the furthest stroke reaches ${(Math.max(...ends) * 100).toFixed(1)}% of the length at tip reach 70%`);

    const ragged = fanRays(R.prof, { ...OPT, tipReach: 0.9, tipJitter: 0.4 })
      .map(r => (r.tEnd - R.ax.t0) / R.L);
    const flat = fanRays(R.prof, { ...OPT, tipReach: 0.9, tipJitter: 0 })
      .map(r => (r.tEnd - R.ax.t0) / R.L);
    const spread = Math.max(...ragged) - Math.min(...ragged);
    check('fan/the-tip-cutoff-is-ragged',
      spread > 0.1 && Math.max(...flat) - Math.min(...flat) < 1e-9,
      `jitter 40% spreads the ends over ${(spread * 100).toFixed(0)}% of the length; `
      + 'jitter 0 lines them all up, which is the compass-arc look the tonal layers avoid too');
  }

  // --- the origin is the ATTACHMENT ---------------------------------------
  {
    // The fan starts at the base end of the axis, and partAxis orients that
    // end by the attachment. Flip the attachment and the whole field turns
    // round — measured as where the rays actually converge, not as a flag.
    const conv = (attach) => {
      const R = rig(straight, attach);
      const rays = fanRays(R.prof, OPT);
      const t = R.ax.t0 + R.L * 0.02;
      const v = liveAt(R.prof, rays, t);
      const n = v.length ? (v[0] + v[v.length - 1]) / 2 : 0;
      return unwarpPoint(R.w, t, n);
    };
    const atBase = conv([-30, 0]), atTip = conv([270, 0]);
    check('fan/rays-originate-at-the-attachment',
      Math.hypot(atBase[0] - 0, atBase[1]) < 20 && Math.hypot(atTip[0] - 240, atTip[1]) < 20,
      `attachment at (-30,0) -> the fan converges at ${atBase.map(v => v.toFixed(0)).join(',')}; `
      + `at (270,0) -> ${atTip.map(v => v.toFixed(0)).join(',')}`);

    // and it is a property of the SHAPE, not of the screen: rotate the part
    // and the convergence point rotates with it.
    let worst = 0;
    for (const deg of [23, 61, 145, 244]) {
      const f = frameFromRings([rotRing(leafRing(), deg, 0, 0)]);
      const a = rotRing([[-30, 0]], deg, 0, 0)[0];
      const R = rig(f, a);
      const rays = fanRays(R.prof, OPT);
      const t = R.ax.t0 + (R.ax.t1 - R.ax.t0) * 0.02;
      const v = liveAt(R.prof, rays, t);
      const p = unwarpPoint(R.w, t, v.length ? (v[0] + v[v.length - 1]) / 2 : 0);
      worst = Math.max(worst, Math.hypot(p[0], p[1]));
    }
    check('fan/the-origin-follows-a-rotated-part', worst < 22,
      `the convergence point stays within ${worst.toFixed(1)} px of the rotated base over four rotations`);
  }

  // --- the shear -----------------------------------------------------------
  {
    // THE IDENTITY THAT LETS THE BROWSER HALF MEASURE IN PIXELS. A row of
    // constant station maps, under the shear, to a straight pixel line along
    // the cross axis whose offsets are all shifted by the same amount — so a
    // point and the spans on its row move together, and membership is the
    // same question in either frame. Asserted, not assumed.
    const R = rig(bent, [0, 0]);
    // The pixel-space scan runs at the CROSS axis, which is (qx, qy) — the
    // same basis the stage reports as `scanAngleDeg`. Substituting the AXIS
    // angle into the scan formulas instead is not a near miss, it is a
    // different index: it read 94 of 95 points outside, and it is how this
    // check was first written.
    const ca = R.ax.qx, sa = R.ax.qy;
    const pixIdx = new ScanIndex(bent, ca, sa, 2.6);
    let tested = 0, disagree = 0;
    for (let k = 1; k < 20; k++) {
      const t = R.ax.t0 + R.L * (k / 20);
      const spW = R.idx.spansAt(-t);
      for (let q = 0; q + 1 < spW.length; q += 2) {
        for (const s of [0.05, 0.3, 0.5, 0.8, 0.97]) {
          const n = spW[q] + (spW[q + 1] - spW[q]) * s;
          const [x, y] = unwarpPoint(R.w, t, n);
          tested++;
          // the same point, judged in PIXELS on its own constant-station row
          const v = -x * sa + y * ca, u = x * ca + y * sa;
          const spP = pixIdx.spansAt(v);
          let hit = false;
          for (let z = 0; z + 1 < spP.length; z += 2) if (u >= spP[z] - 0.05 && u <= spP[z + 1] + 0.05) hit = true;
          if (!hit) disagree++;
        }
      }
    }
    check('fan/the-shear-preserves-membership-on-a-row', tested > 60 && disagree === 0,
      `${tested} points inside the warped spans, ${disagree} judged outside in pixels on the `
      + 'same constant-station row — which is what lets the browser half measure in pixels');
  }

  check('modes/fan-is-a-mode-not-a-replacement',
    INFILL_MODES.includes('fan') && ['off', 'hatch', 'flow', 'tone'].every(m => INFILL_MODES.includes(m)),
    `modes: ${INFILL_MODES.join(', ')} — nothing was removed to add it`);
  check('bins/the-profile-has-somewhere-to-report', FAN_BINS >= 6, `${FAN_BINS} station bands`);

  // -------------------------------------------------------------------------
  // PART TWO — the real leaf, in a browser, measured on emitted pixels.
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

  check('page/off-is-still-the-default',
    (await call(() => window.__printInfill.mode())) === 'off'
    && (await call(() => document.getElementById('infillMode').value)) === 'off',
    'the fan is opt-in; nothing that shipped is now on by default');
  check('page/the-field-view-is-off-by-default',
    (await call(() => window.__printInfill.fanDebug())) === false
    && (await call(() => window.__printInfill.fanDebugVisible())) === false,
    'a diagnostic overlay that draws itself uninvited is a bug, not a feature');

  await call(() => { window.__printLineArt.setDetailWidget(12); window.__printLineArt.setWeightWidget(1.2); });
  await settle();

  // The other families, BEFORE the fan is ever selected — the control for
  // "the fan did not disturb anything that shipped".
  const modeSegs = async (m, dir) => {
    await call(x => window.__printInfill.setMode(x), m);
    await call(x => window.__printInfill.setDirection(x), dir);
    await settle();
    const n = await call(() => window.__printInfill.partCount());
    const out = [];
    for (let i = 0; i < n; i++) out.push(await call(k => window.__printInfill.segments(k), i));
    return out;
  };
  const before = { hatch: await modeSegs('hatch', 'global'), tone: await modeSegs('tone', 'axis') };

  let LEAF = null;
  if (!SKIP_LEAF) {
    log('\n--- part two: the separate leaf ---');
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
    const li = names.indexOf('leaf'), bi = names.indexOf('bloom'), si = names.indexOf('stem');
    const view = async (name, mul) => {
      const box = await call(n => window.__printScaffold.partBox(n), name);
      if (!box) return;
      const c = box.min.map((v, i) => (v + box.max[i]) / 2);
      const r = Math.max(...box.max.map((v, i) => v - box.min[i]));
      await call(([p, t]) => window.__printScaffold.setView(p, t),
        [[c[0] + r * mul[0], c[1] + r * mul[1], c[2] + r * mul[2]], c]);
      await settle();
    };
    await view('leaf', LEAF_VIEW);
    await call(() => window.__printInfill.setMode('fan'));
    await settle();
    LEAF = { names, li, bi, si, view };

    const st0 = await call(() => window.__printInfill.stats());
    const P = st0.parts[li];
    check('leaf/fan-derives-its-own-axis', !!P.axis && P.axis.lengthPx > 20,
      P.axis ? `axis ${P.axis.angleDeg.toFixed(1)}°, ${P.axis.lengthPx.toFixed(0)} px long, `
        + `base from the ${P.axis.basis}` : 'no axis');
    check('leaf/the-scan-direction-is-the-cross-axis',
      !!P.axis && dAng180(P.scanAngleDeg, P.axis.angleDeg + 90) < 1e-6,
      `scan ${P.scanAngleDeg.toFixed(1)}° against an axis of ${P.axis.angleDeg.toFixed(1)}° `
      + '— one direction for the whole fan, however many headings its rays have');
    check('leaf/draws-a-fan', P.fan.rays >= 8 && P.segments > 500,
      `${P.fan.rays} rays to level ${P.fan.levels}, ${P.segments} segments`);

    // --- the ink is inside the outline, judged at the part's OWN angle -----
    const sil = await call(k => window.__printInfill.silhouette(k), li);
    const rebuild = (s) => ({
      x0: Float32Array.from(s.map(v => v[0])), y0: Float32Array.from(s.map(v => v[1])),
      x1: Float32Array.from(s.map(v => v[2])), y1: Float32Array.from(s.map(v => v[3])),
      n: s.length, ok: s.length >= 3,
      minX: Math.min(...s.map(v => Math.min(v[0], v[2]))), maxX: Math.max(...s.map(v => Math.max(v[0], v[2]))),
      minY: Math.min(...s.map(v => Math.min(v[1], v[3]))), maxY: Math.max(...s.map(v => Math.max(v[1], v[3]))),
      ax: 0, ay: 0, reach: 1, depth: 0,
    });
    const judge = (frame, angDeg) => {
      const a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const ix = new ScanIndex(frame, ca, sa, 1);
      return (x, y) => {
        const v = -x * sa + y * ca, u = x * ca + y * sa;
        const sp = ix.spansAt(v);
        for (let q = 0; q + 1 < sp.length; q += 2) if (u >= sp[q] - 0.6 && u <= sp[q + 1] + 0.6) return true;
        return false;
      };
    };
    const leafFrame = rebuild(sil);
    const inLeaf = judge(leafFrame, P.scanAngleDeg);
    const segs = await call(k => window.__printInfill.segments(k), li);
    let pts = 0, outside = 0, worstOut = 0;
    for (const [x0, y0, x1, y1] of segs) {
      for (const [x, y] of [[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]]) {
        pts++;
        if (!inLeaf(x, y)) { outside++; worstOut = Math.max(worstOut, 1); }
      }
    }
    check('leaf/ink-stays-inside-the-outline', pts > 1000 && outside === 0,
      `${outside} of ${pts} emitted points outside the leaf's own silhouette, judged at `
      + `${P.scanAngleDeg.toFixed(1)}° — the direction every ray was actually clipped at`);


    // --- divergence, against a family that IS parallel ---------------------
    const dirsOf = (ss) => ss.map(([x0, y0, x1, y1]) => {
      let d = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
      return ((d % 180) + 180) % 180;
    });
    const spreadOf = (ds) => {
      // circular spread on [0,180): the smallest arc containing 90% of them
      const s = ds.slice().sort((a, b) => a - b);
      const keep = Math.max(1, Math.floor(s.length * 0.9));
      let best = 180;
      for (let i = 0; i + keep <= s.length; i++) best = Math.min(best, s[i + keep - 1] - s[i]);
      return best;
    };
    const fanSpread = spreadOf(dirsOf(segs));
    await call(() => window.__printInfill.setMode('hatch'));
    await call(() => window.__printInfill.setDirection('axis'));
    await call(() => window.__printInfill.setWidget('layers', 1));
    await settle();
    const hatchSegs = await call(k => window.__printInfill.segments(k), li);
    const hatchSpread = spreadOf(dirsOf(hatchSegs));
    await call(() => window.__printInfill.setMode('fan'));
    await settle();
    check('leaf/rays-diverge-rather-than-run-parallel',
      fanSpread > 12 && fanSpread > hatchSpread * 3,
      `the fan's strokes span ${fanSpread.toFixed(1)}° where a one-layer cross-hatch along the `
      + `same axis spans ${hatchSpread.toFixed(1)}° — this is the property #163's three cells lacked`);

    // --- convergence IS the gradient, and it is measured -------------------
    const densities = {};
    for (const cv of [0, 100]) {
      await call(v => window.__printInfill.setWidget('fanConverge', v), cv);
      await settle();
      const p = (await call(() => window.__printInfill.stats())).parts[li];
      const den = p.fan.bins.map((b, k) => (p.fan.area[k] > 1 ? b / p.fan.area[k] : 0));
      const base = den.slice(0, 2).reduce((a, b) => a + b, 0);
      const tip = den.slice(-3, -1).reduce((a, b) => a + b, 0);
      densities[cv] = { den, ratio: tip > 0 ? base / tip : Infinity };
    }
    check('leaf/convergence-is-the-gradient',
      densities[100].ratio > densities[0].ratio * 1.25,
      `ink density base/tip is ${densities[0].ratio.toFixed(2)}x at converge 0 and `
      + `${densities[100].ratio.toFixed(2)}x at converge 100 — the darkness at the base is the `
      + 'field\'s own geometry, which is why no separate axial ramp is offered here');
    check('leaf/the-tip-is-left-lighter',
      densities[100].den[FAN_BINS - 1] < densities[100].den[3] * 0.5,
      `the last band reads ${densities[100].den[FAN_BINS - 1].toFixed(3)} against `
      + `${densities[100].den[3].toFixed(3)} in the middle — strokes stop short of the outer edge`);

    // Insertion, measured on the real leaf and at converge 0 where it is what
    // the spacing law is FOR: the rays alive near the base are fewer than the
    // rays alive in the middle, and the levels are born at stations along the
    // length rather than all at the origin.
    await call(v => window.__printInfill.setWidget('fanConverge', v), 0);
    await settle();
    const pUni = (await call(() => window.__printInfill.stats())).parts[li];
    // THE BIRTH STATIONS THEMSELVES, not just the ray counts. A ray count that
    // rises along the length is satisfied by every level being born at ONE
    // station somewhere in the middle — which is exactly what the
    // `a-station-is-a-sentinel` mutation produces, and it stayed green here
    // until this check read the stations. They must be DISTINCT and ordered by
    // level: a deeper level is inserted no earlier than its parent.
    const bt = pUni.fan.births.filter(b => b.level >= 2).map(b => b.t);
    const ordered = bt.every((t, k) => k === 0 || t >= bt[k - 1] - 1e-6);
    const distinct = new Set(bt.map(t => t.toFixed(3))).size;
    check('leaf/inserts-rays-toward-the-tip',
      pUni.fan.births.length >= 3 && ordered && distinct >= 2
      && pUni.fan.gaps[0].n < pUni.fan.gaps[1].n,
      `${pUni.fan.births.map(b => `L${b.level}x${b.n}@${b.t.toFixed(0)}`).join(' ')} — `
      + `${distinct} distinct birth stations, ordered by level; `
      + `${pUni.fan.gaps.map(g => `${(g.frac * 100) | 0}%: ${g.n} rays ${g.median.toFixed(1)} px`).join(', ')}`);
    await call(v => window.__printInfill.setWidget('fanConverge', v), 55);
    await settle();

    // --- three parts at once: termination, and the cache key ----------------
    // At the leaf's own framing the stem and bloom barely project, so a claim
    // about occlusion measured there is a claim about nothing — the first
    // version of this check compared 0 points and passed. #163's close-up puts
    // all three parts on the canvas overlapping each other, which is where
    // both of these are answerable.
    {
      await view('leaf', CLOSE_VIEW);
      await settle();
      const stC = await call(() => window.__printInfill.stats());
      const parts = [si, li, bi].filter(i => i >= 0 && stC.parts[i].ok && stC.parts[i].fan);
      const frames = {}, sils = {}, segsOf = {};
      for (const i of parts) {
        sils[i] = rebuild(await call(k => window.__printInfill.silhouette(k), i));
        frames[i] = await call(k => window.__printInfill.frame(k), i);
        segsOf[i] = await call(k => window.__printInfill.segments(k), i);
      }

      // TERMINATION. A ray whose offset is a fraction of the measured
      // half-width cannot leave the part sideways, so the only thing that ends
      // one early is the clipper — a nearer part, or a row the outline does
      // not close. Here that happens, and the count says so.
      const short = parts.reduce((a, i) => a + stC.parts[i].fan.shortened, 0);
      const per = {};
      let ptsC = 0;
      for (const i of parts) {
        const inSelf = judge(sils[i], stC.parts[i].scanAngleDeg);
        let o = 0, n2 = 0;
        for (const [x0, y0, x1, y1] of segsOf[i]) {
          for (const [x, y] of [[x0, y0], [x1, y1]]) { n2++; ptsC++; if (!inSelf(x, y)) o++; }
        }
        per[names[i]] = [o, n2];
      }
      check('leaf/strokes-terminate-at-the-silhouette',
        short > 0 && ptsC > 2000
        && Object.values(per).every(([o, n2]) => n2 === 0 || o / n2 < 0.01),
        `${short} rays lost length to the clipper across ${parts.length} parts; endpoints outside `
        + `their own outline: ${Object.entries(per).map(([k, v]) => `${k} ${v[0]}/${v[1]}`).join(', ')}`
        + ' — strokes stop AT the boundary, never past it');

      // THE DISAGREEMENT, BOUNDED AND NAMED rather than absorbed into the
      // tolerance above — and note WHICH part carries it, because the guess
      // was wrong: it is the LEAF. That is the part with 16 of its 114 edges
      // carrying a third face the topology drops, so its projected silhouette
      // is the OPEN one, and a winding rule read on one row can disagree with
      // the same rule read at the judge's scan on a neighbour. At the leaf's
      // own framing it is exactly 0 (`leaf/ink-stays-inside-the-outline`); it
      // appears only at extreme zoom, where a row spans thousands of pixels.
      // This is #160's hazard, measured rather than tolerated.
      let dis = 0, disN = 0, worstPart = '';
      for (const i of parts) {
        const inSelf = judge(sils[i], stC.parts[i].scanAngleDeg);
        let o = 0, n2 = 0;
        for (const [x0, y0, x1, y1] of segsOf[i]) {
          for (const [x, y] of [[x0, y0], [x1, y1]]) { n2++; if (!inSelf(x, y)) o++; }
        }
        dis += o; disN += n2;
        if (o > 0 && (!worstPart || o / n2 > 0)) worstPart = `${names[i]} ${(o / n2 * 100).toFixed(2)}%`;
      }
      check('open-outline/the-disagreement-is-bounded-and-named',
        disN > 2000 && dis / disN < 0.01,
        `${dis} of ${disN} endpoints across all three parts read outside their own silhouette at `
        + `extreme zoom (${(dis / disN * 100).toFixed(2)}%${worstPart ? `, all of it ${worstPart}` : ''}) `
        + '— exactly 0 at the leaf\'s own framing, and never a fan that escaped: the two rules '
        + 'are the same rule read on rows a long way apart');

      // THE CACHE KEY. A scan index keyed on less than the frame it was built
      // in leaves no mark on any membership assertion — a wrong occluder
      // subtraction takes ink AWAY — so the witness is the ink that should
      // have been removed and was not: a farther part's stroke standing where
      // a nearer part covers it.
      let bad = 0, total = 0, pair = '';
      for (const far of parts) {
        for (const near of parts) {
          if (near === far || !(frames[near].depth < frames[far].depth)) continue;
          const inNear = judge(sils[near], stC.parts[near].scanAngleDeg);
          for (const [x0, y0, x1, y1] of segsOf[far]) {
            total++;
            if (inNear((x0 + x1) / 2, (y0 + y1) / 2)) { bad++; pair = `${names[far]} under ${names[near]}`; }
          }
        }
      }
      check('fan/no-ink-under-a-nearer-part', total > 500 && bad / Math.max(total, 1) < 0.02,
        `${bad} of ${total} midpoints of a farther part's strokes fall inside a nearer part's `
        + `silhouette${pair ? ` (worst: ${pair})` : ''}. NOTE this was written as the witness `
        + 'for an index cached against the wrong warped frame and the negative control showed it '
        + 'is not: it stays green under that mutation. It is kept as a true property; the actual '
        + 'witness is the part\'s own ink escaping its outline.');
      await view('leaf', LEAF_VIEW);
      await settle();
    }

    // --- the debug view -----------------------------------------------------
    {
      const inkBefore = await call(k => window.__printInfill.segments(k), li);
      await call(() => window.__printInfill.setFanDebug(true));
      await settle();
      const dbg = await call(() => window.__printInfill.fanDebugSegments());
      const inkAfter = await call(k => window.__printInfill.segments(k), li);
      const same = inkBefore.length === inkAfter.length
        && inkBefore.every((s, i) => s.every((v, j) => v === inkAfter[i][j]));
      check('debug/the-field-draws', dbg.length > 20
        && (await call(() => window.__printInfill.fanDebugVisible())),
        `${dbg.length} diagnostic segments — the axis, the centre line, the origin bar, the `
        + 'termination boundary and each inserted ray\'s birth');
      check('debug/drawing-the-field-does-not-change-the-ink', same,
        `${inkBefore.length} ink segments before, ${inkAfter.length} after, identical to the bit `
        + '— the overlay is its own primitive, never mixed into a part\'s buffer');
      await call(() => window.__printInfill.setFanDebug(false));
      await settle();
      check('debug/turns-off', (await call(() => window.__printInfill.fanDebugSegments())).length === 0
        && !(await call(() => window.__printInfill.fanDebugVisible())),
        'and the overlay goes with it');
    }

    // --- the panel ----------------------------------------------------------
    {
      const v = await call(() => window.__printInfill.fanRowVisibility());
      check('panel/the-fan-rows-are-up-in-the-fan',
        v.spacing && v.converge && v.origin && v.inset && v.tipReach && v.tipJitter && v.debug,
        'all six controls plus the field toggle');
      check('panel/the-inert-controls-are-down-in-the-fan',
        !v.direction && !v.anchors && !v.axial && !v.angle && !v.hatchSpacing,
        'the direction select, the anchor block with its reach and falloff, the axial ramp and '
        + 'the global angle all mean nothing here, so none of them is offered');
      await call(() => window.__printInfill.setMode('hatch'));
      await settle();
      const h = await call(() => window.__printInfill.fanRowVisibility());
      check('panel/the-fan-rows-go-down-outside-it',
        !h.spacing && !h.converge && !h.origin && !h.inset && !h.tipReach && !h.tipJitter && !h.debug
        && h.direction && h.anchors,
        'and the anchor comes back, because it decides something again');
      await call(() => window.__printInfill.setMode('fan'));
      await settle();
    }

    // --- a control that is only a control if it moves something -------------
    {
      // A CHECKSUM OF THE COORDINATES, not the segment count. `origin` moves
      // every stroke without changing how many there are, so a count-based
      // witness reports it as inert — measured: it read ±0 while the picture
      // plainly changed.
      const shot = async () => {
        const ss = await call(k => window.__printInfill.segments(k), li);
        // SUM OF SQUARES, not of coordinates. `origin` widens the fan
        // symmetrically about its centre line, so a plain coordinate sum
        // cancels exactly and reports it inert — measured: it read 0.0% while
        // the picture plainly changed.
        let a = 0;
        for (const s of ss) a += s[0] * s[0] + s[1] * s[1] + s[2] * s[2] + s[3] * s[3];
        return a;
      };
      const base = await shot();
      const moved = {};
      for (const [id, a, b] of [['fanSpacing', 4, 22], ['fanOrigin', 0, 30],
                                ['fanInset', 55, 100], ['fanTipReach', 35, 100]]) {
        await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, a]);
        await settle();
        const lo = await shot();
        await call(([i, x]) => window.__printInfill.setWidget(i, x), [id, b]);
        await settle();
        const hi = await shot();
        moved[id] = Math.abs(hi - lo);
        await call(([i, x]) => window.__printInfill.setWidget(i, x),
          [id, { fanSpacing: 9, fanOrigin: 3, fanInset: 92, fanTipReach: 88 }[id]]);
        await settle();
      }
      const { fanOrigin, ...always } = moved;
      check('panel/every-fan-slider-moves-the-ink',
        Object.values(always).every(v => v > base * 0.01),
        Object.entries(moved).map(([k, v]) => `${k} ${(v / base * 100).toFixed(1)}%`).join('  ')
        + '  of the ink checksum, end to end of each slider (origin is a FLOOR and is judged '
        + 'separately, below)');

      // THE ORIGIN IS A FLOOR, so on a part whose base is never narrower than
      // it, it is correctly inert — and the panel says which of those two it
      // is doing rather than leaving an apparently dead slider. The check is
      // the BICONDITIONAL: it moves the ink exactly when the read-out says it
      // binds. Measured, and it is why this is not simply in the list above:
      // on the leaf's own framing this slider moves nothing at all.
      // COORDINATE BY COORDINATE, not by a checksum with a threshold: the
      // floor acts over a handful of stations at the very base, which is a
      // few thousand square pixels against a sum of squares in the billions.
      // A tolerance large enough to be meaningful is larger than the effect.
      const coords = async () => (await call(k => window.__printInfill.segments(k), li)).flat();
      const at = async (v) => {
        await call(([i, x]) => window.__printInfill.setWidget(i, x), ['fanOrigin', v]);
        await settle();
        return { bind: (await call(() => window.__printInfill.stats())).parts[li].fan.originBinding,
          c: await coords() };
      };
      const hi = await at(30), lo = await at(0);
      await call(([i, x]) => window.__printInfill.setWidget(i, x), ['fanOrigin', 3]);
      await settle();
      const moved2 = hi.c.length === lo.c.length
        ? hi.c.reduce((a2, v, k) => a2 + (v !== lo.c[k] ? 1 : 0), 0) : Infinity;
      check('panel/the-origin-floor-moves-the-ink-exactly-when-it-binds',
        lo.bind === 0 && ((hi.bind > 0) === (moved2 > 0)),
        `at 30 px the floor binds at ${hi.bind} of this part's drawable profile stations and `
        + `${moved2} emitted coordinates move; at 0 px it binds at ${lo.bind}. A floor is inert `
        + 'on a part whose base is never narrower than it, and the read-out says which it is '
        + 'doing rather than offering an apparently dead slider');
    }

    // --- per-part darkness is the target spacing ----------------------------
    {
      await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [li, 100]);
      await settle();
      const full = (await call(k => window.__printInfill.segments(k), li)).length;
      await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [li, 40]);
      await settle();
      const dim = (await call(k => window.__printInfill.segments(k), li)).length;
      await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [li, 0]);
      await settle();
      const off = (await call(k => window.__printInfill.segments(k), li)).length;
      await call(([k, x]) => window.__printInfill.setDarknessWidget(k, x), [li, 100]);
      await settle();
      check('leaf/darkness-is-the-target-spacing', off === 0 && dim < full * 0.9 && dim > 0,
        `${full} segments at 100%, ${dim} at 40%, ${off} at 0 — in a family whose tone IS line `
        + 'density, "how dark is this part" is how far apart its strokes are');
    }

    // --- the bloom, photographed rather than tuned around -------------------
    {
      await view('bloom', [0, 0, 2.0]);
      const stB = await call(() => window.__printInfill.stats());
      const pb = stB.parts[bi];
      check('bloom/is-one-fan-over-a-fused-solid',
        !!pb.axis && pb.fan && pb.fan.rays > 0,
        `the bloom takes ONE axis (${pb.axis ? pb.axis.angleDeg.toFixed(0) : '?'}°) and `
        + `${pb.fan ? pb.fan.rays : 0} rays for the whole flower, because it is one fused solid `
        + 'with no per-petal granularity. Per-petal fans are blocked on multi-part export; this '
        + 'is stated and photographed, never tuned around.');
      await view('leaf', LEAF_VIEW);
    }

    // --- what it costs -------------------------------------------------------
    {
      const settled = async () => {
        let a = 0, b = -1;
        for (let i = 0; i < 14; i++) {
          await page.waitForTimeout(500);
          b = a; a = await call(() => { const s = window.__printInfill.stats(); return s ? s.frameMs : 0; });
          if (b > 0 && Math.abs(a - b) / Math.max(a, b) < 0.12) break;
        }
        return a;
      };
      const table = [];
      for (const [label, mul] of [['leaf face-on', LEAF_VIEW], ['#163 close-up', CLOSE_VIEW]]) {
        await view('leaf', mul);
        const row = { label };
        for (const m of ['fan', 'tone', 'hatch']) {
          await call(x => window.__printInfill.setMode(x), m);
          await call(x => window.__printInfill.setDirection(x), 'axis');
          row[m] = await settled();
        }
        table.push(row);
      }
      await call(() => window.__printInfill.setMode('fan'));
      const close = table.find(r => r.label === '#163 close-up');
      check('cost/the-fan-is-not-more-expensive-than-what-shipped',
        close && close.fan <= Math.max(close.tone, close.hatch) * 1.25,
        table.map(r => `${r.label}: fan ${r.fan.toFixed(0)} ms, tone ${r.tone.toFixed(0)} ms, `
          + `hatch ${r.hatch.toFixed(0)} ms`).join('   |   ')
        + '   (#163 measured 84 ms tonal / 235 ms hatch at its close-up)');
    }
  }

  // --- and nothing that shipped moved -------------------------------------
  if (!SKIP_LEAF) {
    // Back to the default bundle would cost another load, so the comparison is
    // made where it is meaningful: the same bundle, the same camera, the other
    // two families driven again and compared against themselves before the fan
    // existed in this session's run is not available — so the claim asserted
    // here is the one that IS available and load-bearing: selecting the fan and
    // leaving it returns the other families to a working state.
    await LEAF.view('leaf', LEAF_VIEW);
    const h = await modeSegs('hatch', 'global');
    const t = await modeSegs('tone', 'axis');
    check('global/the-other-families-still-draw',
      h.some(p => p.length > 50) && t.some(p => p.length > 50),
      `cross-hatch ${h.reduce((a, p) => a + p.length, 0)} segments, tonal fill `
      + `${t.reduce((a, p) => a + p.length, 0)} after the fan has been in and out`);
  } else {
    check('global/the-other-families-still-draw',
      before.hatch.some(p => p.length > 50) && before.tone.some(p => p.length > 50),
      'measured on the default bundle (--skip-leaf)');
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
    console.log(`  [${ok ? 'ok  ' : 'FAIL'}] ${m.id.padEnd(46)} red: ${red.length ? red.join(', ') : '(none)'}`);
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
