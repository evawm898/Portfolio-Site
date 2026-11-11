/* frame-math.js — the /frame's transcendental functions, as ARITHMETIC, so
   the page and Node build the same relief to the bit (docs/frame-charter.md
   §19, the STL-integrity session).

   WHY THIS EXISTS. The page's STL and the Node build every gate measures were
   different files: Chrome's Math.sin / cos / atan / atan2 / exp / log / pow
   return different last bits from Node's (measured, 20,000 random inputs a
   function: 3–18 % differ, Chrome 153 against Node 22's V8 12.4; Math.hypot
   and Math.sqrt agree, the latter correctly rounded by IEEE 754). A last bit
   moves a vertex in the STL's float32 now and then, and where the frame takes
   a DISCRETE decision on a transcendental (the arch's 1.5° arc ladder: an
   equilateral arch's sub-arch sweeps exactly 60°, a whole 40 steps, and
   ceil() of 40 or of 40.000000000000007 is 40 or 41) the page drew a
   different number of triangles — +384 on the default arch.

   WHAT IT IS. A line-for-line port of V8's own fdlibm (src/base/ieee754.cc at
   12.4.254.21 — the code Node 22 runs for Math.*; Node 20's V8 11.3 carries
   the same fdlibm), in double arithmetic plus word access through one shared
   Float64Array / Uint32Array view. + − × ÷ and sqrt are correctly rounded in
   every engine and nothing here reaches anything else, so every engine
   returns the same doubles; and they are NODE'S doubles, so the Node build is
   byte-identical to what it was before this module existed (asserted, never
   argued: tools/verify-frame-stl.mjs FM1 compares every function here
   with the running Node's Math.* over 1.4 million inputs a function, and SP
   holds the page's STL to Node's, row by row).

   A reader of the frame's geometry calls these and never Math.sin & co.;
   tools/verify-frame-stl.mjs FM0 refuses a transcendental Math call in
   any frame geometry module, and `**` with it (a ** b is Math.pow).

   Little-endian word order (index 1 is the high word): every engine this page
   runs on is little-endian, and the module throws at load on any other. */

const F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer);
if (((F64[0] = 1), U32[1]) !== 0x3FF00000) throw new Error('frame-math.js: big-endian word order is not supported');
const hi = (d) => { F64[0] = d; return U32[1] | 0; };          // GET_HIGH_WORD, as int32
const lo = (d) => { F64[0] = d; return U32[0]; };              // GET_LOW_WORD, as uint32
const words = (h, l) => { U32[1] = h; U32[0] = l; return F64[0]; };   // INSERT_WORDS (mod 2^32)
const setHi = (d, h) => { F64[0] = d; U32[1] = h; return F64[0]; };
const setLo = (d, l) => { F64[0] = d; U32[0] = l; return F64[0]; };

/* scalbn: x · 2^n, exact (the arguments here keep both sides normal) */
function scalbn(x, n) {
  while (n > 1023) { x *= 8.98846567431158e307; n -= 1023; }   // 2^1023
  while (n < -1022) { x *= 2.2250738585072014e-308; n += 1022; }   // 2^-1022
  return x * words(((n + 1023) << 20) >>> 0, 0);
}

/* ---------------- argument reduction ---------------- */
const TWO_OVER_PI = [
  0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C,
  0x439041, 0xFE5163, 0xABDEBB, 0xC561B7, 0x246E3A, 0x424DD2, 0xE00649,
  0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129, 0xA73EE8, 0x8235F5, 0x2EBB44,
  0x84E99C, 0x7026B4, 0x5F7E41, 0x3991D6, 0x398353, 0x39F49C, 0x845F8B,
  0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D,
  0x367ECF, 0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5,
  0xF17B3D, 0x0739F7, 0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08, 0x560330,
  0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3, 0x91615E, 0xE61B08,
  0x659985, 0x5F14A0, 0x68408D, 0xFFD880, 0x4D7327, 0x310606, 0x1556CA,
  0x73A8C9, 0x60E27B, 0xC08C6B,
];
const NPIO2_HW = [
  0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
  0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
  0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
  0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
  0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
  0x404858EB, 0x404921FB,
];
const PIO2 = [
  1.57079625129699707031e+00, 7.54978941586159635335e-08, 5.39030252995776476554e-15,
  3.28200341580791294123e-22, 1.27065575308067607349e-29, 1.22933308981111328932e-36,
  2.73370053816464559624e-44, 2.16741683877804819444e-51,
];
const INIT_JK = [2, 3, 4, 6];
const TWO24 = 1.67772160000000000000e+07, TWON24 = 5.96046447753906250000e-08;

function kernelRemPio2(x, y, e0, nx, prec) {
  const iq = new Int32Array(20), f = new Float64Array(20), fq = new Float64Array(20), q = new Float64Array(20);
  let jz, jx, jv, jp, jk, carry, n, i, j, k, m, q0, ih, z, fw;
  jk = INIT_JK[prec]; jp = jk;
  jx = nx - 1;
  jv = Math.trunc((e0 - 3) / 24); if (jv < 0) jv = 0;
  q0 = e0 - 24 * (jv + 1);
  j = jv - jx; m = jx + jk;
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? 0 : TWO_OVER_PI[j];
  for (i = 0; i <= jk; i++) { for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j]; q[i] = fw; }
  jz = jk;
  for (;;) {   // recompute:
    for (i = 0, j = jz, z = q[jz]; j > 0; i++, j--) {
      fw = Math.trunc(TWON24 * z);
      iq[i] = Math.trunc(z - TWO24 * fw);
      z = q[j - 1] + fw;
    }
    z = scalbn(z, q0);
    z -= 8.0 * Math.floor(z * 0.125);
    n = Math.trunc(z);
    z -= n;
    ih = 0;
    if (q0 > 0) {
      i = iq[jz - 1] >> (24 - q0); n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) ih = iq[jz - 1] >> 23;
    else if (z >= 0.5) ih = 2;
    if (ih > 0) {
      n += 1; carry = 0;
      for (i = 0; i < jz; i++) {
        j = iq[i];
        if (carry === 0) { if (j !== 0) { carry = 1; iq[i] = 0x1000000 - j; } }
        else iq[i] = 0xFFFFFF - j;
      }
      if (q0 > 0) { if (q0 === 1) iq[jz - 1] &= 0x7FFFFF; else if (q0 === 2) iq[jz - 1] &= 0x3FFFFF; }
      if (ih === 2) { z = 1.0 - z; if (carry !== 0) z -= scalbn(1.0, q0); }
    }
    if (z === 0) {
      j = 0;
      for (i = jz - 1; i >= jk; i--) j |= iq[i];
      if (j === 0) {
        for (k = 1; jk >= k && iq[jk - k] === 0; k++) { /* k = no. of terms needed */ }
        for (i = jz + 1; i <= jz + k; i++) {
          f[jx + i] = TWO_OVER_PI[jv + i];
          for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
          q[i] = fw;
        }
        jz += k;
        continue;
      }
    }
    break;
  }
  if (z === 0.0) {
    jz -= 1; q0 -= 24;
    while (iq[jz] === 0) { jz--; q0 -= 24; }
  } else {
    z = scalbn(z, -q0);
    if (z >= TWO24) {
      fw = Math.trunc(TWON24 * z);
      iq[jz] = z - TWO24 * fw;
      jz += 1; q0 += 24;
      iq[jz] = fw;
    } else iq[jz] = z;
  }
  fw = scalbn(1.0, q0);
  for (i = jz; i >= 0; i--) { q[i] = fw * iq[i]; fw *= TWON24; }
  for (i = jz; i >= 0; i--) {
    for (fw = 0.0, k = 0; k <= jp && k <= jz - i; k++) fw += PIO2[k] * q[i + k];
    fq[jz - i] = fw;
  }
  // prec is 2 here (the only caller): the case 1/2 compression
  fw = 0.0;
  for (i = jz; i >= 0; i--) fw += fq[i];
  y[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (i = 1; i <= jz; i++) fw += fq[i];
  y[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

const INVPIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11,
  PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21, PIO2_3 = 2.02226624871116645580e-21,
  PIO2_3T = 8.47842766036889956997e-32;
const Y = new Float64Array(2);
function remPio2(x, y) {
  let z = 0, w, t, r, fn, i, j, n;
  const hx = hi(x), ix = hx & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) { y[0] = x; y[1] = 0; return 0; }
  if (ix < 0x4002D97C) {
    if (hx > 0) {
      z = x - PIO2_1;
      if (ix !== 0x3FF921FB) { y[0] = z - PIO2_1T; y[1] = (z - y[0]) - PIO2_1T; }
      else { z -= PIO2_2; y[0] = z - PIO2_2T; y[1] = (z - y[0]) - PIO2_2T; }
      return 1;
    }
    z = x + PIO2_1;
    if (ix !== 0x3FF921FB) { y[0] = z + PIO2_1T; y[1] = (z - y[0]) + PIO2_1T; }
    else { z += PIO2_2; y[0] = z + PIO2_2T; y[1] = (z - y[0]) + PIO2_2T; }
    return -1;
  }
  if (ix <= 0x413921FB) {
    t = Math.abs(x);
    n = (t * INVPIO2 + 0.5) | 0;
    fn = n;
    r = t - fn * PIO2_1;
    w = fn * PIO2_1T;
    if (n < 32 && ix !== NPIO2_HW[n - 1]) {
      y[0] = r - w;
    } else {
      j = ix >> 20;
      y[0] = r - w;
      i = j - ((hi(y[0]) >> 20) & 0x7FF);
      if (i > 16) {
        t = r; w = fn * PIO2_2; r = t - w;
        w = fn * PIO2_2T - ((t - r) - w);
        y[0] = r - w;
        i = j - ((hi(y[0]) >> 20) & 0x7FF);
        if (i > 49) {
          t = r; w = fn * PIO2_3; r = t - w;
          w = fn * PIO2_3T - ((t - r) - w);
          y[0] = r - w;
        }
      }
    }
    y[1] = (r - y[0]) - w;
    if (hx < 0) { y[0] = -y[0]; y[1] = -y[1]; return -n; }
    return n;
  }
  if (ix >= 0x7FF00000) { y[0] = y[1] = x - x; return 0; }
  const low = lo(x);
  z = setLo(z, low);
  const e0 = (ix >> 20) - 1046;
  z = setHi(z, (ix - (e0 << 20)) >>> 0);
  const tx = new Float64Array(3);
  for (i = 0; i < 2; i++) { tx[i] = Math.trunc(z); z = (z - tx[i]) * TWO24; }
  tx[2] = z;
  let nx = 3;
  while (tx[nx - 1] === 0) nx--;
  n = kernelRemPio2(tx, y, e0, nx, 2);
  if (hx < 0) { y[0] = -y[0]; y[1] = -y[1]; return -n; }
  return n;
}

/* ---------------- kernels on [-pi/4, pi/4] ---------------- */
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
function kernelCos(x, y) {
  const ix = hi(x) & 0x7FFFFFFF;
  if (ix < 0x3E400000) { if ((x | 0) === 0) return 1.0; }
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3FD33333) return 1.0 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3FE90000 ? 0.28125 : words((ix - 0x00200000) >>> 0, 0);
  const iz = 0.5 * z - qx, a = 1.0 - qx;
  return a - (iz - (z * r - x * y));
}
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
function kernelSin(x, y, iy) {
  const ix = hi(x) & 0x7FFFFFFF;
  if (ix < 0x3E400000) { if ((x | 0) === 0) return x; }
  const z = x * x, v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

export function sin(x) {
  const ix = hi(x) & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) return kernelSin(x, 0.0, 0);
  if (ix >= 0x7FF00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kernelSin(Y[0], Y[1], 1);
    case 1: return kernelCos(Y[0], Y[1]);
    case 2: return -kernelSin(Y[0], Y[1], 1);
    default: return -kernelCos(Y[0], Y[1]);
  }
}
export function cos(x) {
  const ix = hi(x) & 0x7FFFFFFF;
  if (ix <= 0x3FE921FB) return kernelCos(x, 0.0);
  if (ix >= 0x7FF00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kernelCos(Y[0], Y[1]);
    case 1: return -kernelSin(Y[0], Y[1], 1);
    case 2: return -kernelCos(Y[0], Y[1]);
    default: return kernelSin(Y[0], Y[1], 1);
  }
}

/* ---------------- atan, atan2 ---------------- */
const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [
  3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01,
  -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02,
  6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02,
  -3.65315727442169155270e-02, 1.62858201153657823623e-02,
];
export function atan(x) {
  let id, z, w, s1, s2;
  const hx = hi(x), ix = hx & 0x7FFFFFFF;
  if (ix >= 0x44100000) {
    if (x !== x) return x + x;
    return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  }
  if (ix < 0x3FDC0000) {
    if (ix < 0x3E400000) { if (1.0e300 + x > 1.0) return x; }
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3FF30000) {
      if (ix < 0x3FE60000) { id = 0; x = (2.0 * x - 1.0) / (2.0 + x); }
      else { id = 1; x = (x - 1.0) / (x + 1.0); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1.0 + 1.5 * x); }
    else { id = 3; x = -1.0 / x; }
  }
  z = x * x; w = z * z;
  s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  z = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return hx < 0 ? -z : z;
}
const TINY = 1.0e-300, PI_O_4 = 7.8539816339744827900E-01, PI_O_2 = 1.5707963267948965580E+00,
  PI = 3.1415926535897931160E+00, PI_LO = 1.2246467991473531772E-16;
export function atan2(y, x) {
  if (x !== x || y !== y) return x + y;
  if (x === 1.0) return atan(y);
  const hx = hi(x), lx = lo(x), hy = hi(y), ly = lo(y), ix = hx & 0x7FFFFFFF, iy = hy & 0x7FFFFFFF;
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2), z;
  if ((iy | ly) === 0) {
    switch (m) { case 0: case 1: return y; case 2: return PI + TINY; default: return -PI - TINY; }
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  if (ix === 0x7FF00000) {
    if (iy === 0x7FF00000) {
      switch (m) { case 0: return PI_O_4 + TINY; case 1: return -PI_O_4 - TINY; case 2: return 3.0 * PI_O_4 + TINY; default: return -3.0 * PI_O_4 - TINY; }
    }
    switch (m) { case 0: return 0.0; case 1: return -0.0; case 2: return PI + TINY; default: return -PI - TINY; }
  }
  if (iy === 0x7FF00000) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  const k = (iy - ix) >> 20;
  if (k > 60) { z = PI_O_2 + 0.5 * PI_LO; m &= 1; }
  else if (hx < 0 && k < -60) z = 0.0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return PI - (z - PI_LO);
    default: return (z - PI_LO) - PI;
  }
}

/* ---------------- exp, log ---------------- */
const LN2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], LN2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10];
const HALF = [0.5, -0.5], INVLN2 = 1.44269504088896338700e+00,
  P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05,
  P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
const TWOM1000 = 9.33263618503218878990e-302, TWO1023 = 8.988465674311579539e307;
export function exp(x) {
  let y, hi_ = 0.0, lo_ = 0.0, c, t, twopk, k = 0;
  let hx = hi(x) >>> 0;
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7FFFFFFF;
  if (hx >= 0x40862E42) {
    if (hx >= 0x7FF00000) {
      if (((hx & 0xFFFFF) | lo(x)) !== 0) return x + x;
      return xsb === 0 ? x : 0.0;
    }
    if (x > 7.09782712893383973096e+02) return 1.0e300 * 1.0e300;
    if (x < -7.45133219101941108420e+02) return TWOM1000 * TWOM1000;
  }
  if (hx > 0x3FD62E42) {
    if (hx < 0x3FF0A2B2) {
      if (x === 1.0) return 2.718281828459045;
      hi_ = x - LN2HI[xsb]; lo_ = LN2LO[xsb]; k = 1 - xsb - xsb;
    } else {
      k = (INVLN2 * x + HALF[xsb]) | 0;
      t = k;
      hi_ = x - t * LN2HI[0];
      lo_ = t * LN2LO[0];
    }
    x = hi_ - lo_;
  } else if (hx < 0x3E300000) {
    if (1.0e300 + x > 1.0) return 1.0 + x;
  } else k = 0;
  t = x * x;
  twopk = k >= -1021 ? words((0x3FF00000 + (k << 20)) >>> 0, 0) : words((0x3FF00000 + ((k + 1000) << 20)) >>> 0, 0);
  c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1.0 - ((x * c) / (c - 2.0) - x);
  y = 1.0 - ((lo_ - (x * c) / (2.0 - c)) - hi_);
  if (k >= -1021) { if (k === 1024) return y * 2.0 * TWO1023; return y * twopk; }
  return y * twopk * TWOM1000;
}
const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, TWO54 = 1.80143985094819840000e+16,
  LG1 = 6.666666666666735130e-01, LG2 = 3.999999999940941908e-01, LG3 = 2.857142874366239149e-01,
  LG4 = 2.222219843214978396e-01, LG5 = 1.818357216161805012e-01, LG6 = 1.531383769920937332e-01,
  LG7 = 1.479819860511658591e-01;
export function log(x) {
  let hfsq, f, s, z, R, w, t1, t2, dk, k = 0, i, j;
  let hx = hi(x);
  const lx = lo(x);
  if (hx < 0x00100000) {
    if (((hx & 0x7FFFFFFF) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54; x *= TWO54; hx = hi(x);
  }
  if (hx >= 0x7FF00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000FFFFF;
  i = (hx + 0x95F64) & 0x100000;
  x = setHi(x, (hx | (i ^ 0x3FF00000)) >>> 0);
  k += i >> 20;
  f = x - 1.0;
  if ((0x000FFFFF & (2 + hx)) < 3) {
    if (f === 0) { if (k === 0) return 0; dk = k; return dk * LN2_HI + dk * LN2_LO; }
    R = f * f * (0.5 - 0.33333333333333333 * f);
    if (k === 0) return f - R;
    dk = k; return dk * LN2_HI - ((R - dk * LN2_LO) - f);
  }
  s = f / (2.0 + f);
  dk = k;
  z = s * s;
  i = hx - 0x6147A;
  w = z * z;
  j = 0x6B851 - hx;
  t1 = w * (LG2 + w * (LG4 + w * LG6));
  t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i |= j;
  R = t2 + t1;
  if (i > 0) {
    hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return dk * LN2_HI - ((hfsq - (s * (hfsq + R) + dk * LN2_LO)) - f);
  }
  if (k === 0) return f - s * (f - R);
  return dk * LN2_HI - ((s * (f - R) - dk * LN2_LO) - f);
}

/* ---------------- pow ---------------- */
const BP = [1.0, 1.5], DP_H = [0.0, 5.84962487220764160156e-01], DP_L = [0.0, 1.35003920212974897128e-08];
const TWO53 = 9007199254740992.0, HUGE = 1.0e300,
  L1 = 5.99999999999994648725e-01, L2 = 4.28571428578550184252e-01, L3 = 3.33333329818377432918e-01,
  L4 = 2.72728123808534006489e-01, L5 = 2.30660745775561754067e-01, L6 = 2.06975017800338417784e-01,
  LG2_ = 6.93147180559945286227e-01, LG2_H = 6.93147182464599609375e-01, LG2_L = -1.90465429995776804525e-09,
  OVT = 8.0085662595372944372e-0017, CP = 9.61796693925975554329e-01, CP_H = 9.61796700954437255859e-01,
  CP_L = -7.02846165095275826516e-09, IVLN2 = 1.44269504088896338700e+00, IVLN2_H = 1.44269502162933349609e+00,
  IVLN2_L = 1.92596299112661746887e-08;
/* Math.pow's JS semantics on top (V8's math::pow): a NaN exponent is NaN and
   (±1) ** ±Infinity is NaN; everything else is fdlibm's __ieee754_pow. */
export function pow(x, y) {
  if (y !== y) return NaN;
  if ((x === 1 || x === -1) && (y === Infinity || y === -Infinity)) return NaN;
  let z, ax, z_h, z_l, p_h, p_l, y1, t1, t2, r, s, t, u, v, w, i, j, k, yisint, n;
  const hx = hi(x), lx = lo(x), hy = hi(y), ly = lo(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;
  if ((iy | ly) === 0) return 1.0;
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return x + y;
  yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      k = (iy >> 20) - 0x3ff;
      if (k > 20) { j = ly >>> (52 - k); if ((j << (52 - k)) === (ly | 0)) yisint = 2 - (j & 1); }
      else if (ly === 0) { j = iy >> (20 - k); if ((j << (20 - k)) === iy) yisint = 2 - (j & 1); }
    }
  }
  if (ly === 0) {
    if (iy === 0x7ff00000) {
      if (((ix - 0x3ff00000) | lx) === 0) return y - y;
      if (ix >= 0x3ff00000) return hy >= 0 ? y : 0.0;
      return hy < 0 ? -y : 0.0;
    }
    if (iy === 0x3ff00000) return hy < 0 ? 1.0 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000) { if (hx >= 0) return Math.sqrt(x); }
  }
  ax = Math.abs(x);
  if (lx === 0) {
    if (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000) {
      z = ax;
      if (hy < 0) z = 1.0 / z;
      if (hx < 0) {
        if (((ix - 0x3ff00000) | yisint) === 0) z = NaN;
        else if (yisint === 1) z = -z;
      }
      return z;
    }
  }
  n = (hx >> 31) + 1;
  if ((n | yisint) === 0) return NaN;
  s = 1.0;
  if ((n | (yisint - 1)) === 0) s = -1.0;
  if (iy > 0x41e00000) {
    if (iy > 0x43f00000) {
      if (ix <= 0x3fefffff) return hy < 0 ? HUGE * HUGE : TINY * TINY;
      if (ix >= 0x3ff00000) return hy > 0 ? HUGE * HUGE : TINY * TINY;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * HUGE * HUGE : s * TINY * TINY;
    if (ix > 0x3ff00000) return hy > 0 ? s * HUGE * HUGE : s * TINY * TINY;
    t = ax - 1.0;
    w = (t * t) * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
    u = IVLN2_H * t;
    v = t * IVLN2_L - w * IVLN2;
    t1 = setLo(u + v, 0);
    t2 = v - (t1 - u);
  } else {
    let ss, s2, s_h, s_l, t_h, t_l;
    n = 0;
    if (ix < 0x00100000) { ax *= TWO53; n -= 53; ix = hi(ax); }
    n += (ix >> 20) - 0x3ff;
    j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    if (j <= 0x3988E) k = 0;
    else if (j < 0xBB67A) k = 1;
    else { k = 0; n += 1; ix -= 0x00100000; }
    ax = setHi(ax, ix >>> 0);
    u = ax - BP[k];
    v = 1.0 / (ax + BP[k]);
    ss = u * v;
    s_h = setLo(ss, 0);
    t_h = words((((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18)) >>> 0, 0);
    t_l = ax - (t_h - BP[k]);
    s_l = v * ((u - s_h * t_h) - s_h * t_l);
    s2 = ss * ss;
    r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += s_l * (s_h + ss);
    s2 = s_h * s_h;
    t_h = setLo(3.0 + s2 + r, 0);
    t_l = r - ((t_h - 3.0) - s2);
    u = s_h * t_h;
    v = s_l * t_h + t_l * ss;
    p_h = setLo(u + v, 0);
    p_l = v - (p_h - u);
    z_h = CP_H * p_h;
    z_l = CP_L * p_h + p_l * CP + DP_L[k];
    t = n;
    t1 = setLo(((z_h + z_l) + DP_H[k]) + t, 0);
    t2 = z_l - (((t1 - t) - DP_H[k]) - z_h);
  }
  y1 = setLo(y, 0);
  p_l = (y - y1) * t1 + y * t2;
  p_h = y1 * t1;
  z = p_l + p_h;
  j = hi(z); i = lo(z) | 0;
  if (j >= 0x40900000) {
    if (((j - 0x40900000) | i) !== 0) return s * HUGE * HUGE;
    if (p_l + OVT > z - p_h) return s * HUGE * HUGE;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if ((((j - 0xc090cc00) | 0) | i) !== 0) return s * TINY * TINY;
    if (p_l <= z - p_h) return s * TINY * TINY;
  }
  i = j & 0x7fffffff;
  k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    t = words((n & ~(0x000fffff >> k)) >>> 0, 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    p_h -= t;
  }
  t = setLo(p_l + p_h, 0);
  u = t * LG2_H;
  v = (p_l - (t - p_h)) * LG2_ + t * LG2_L;
  z = u + v;
  w = v - (z - u);
  t = z * z;
  t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  r = (z * t1) / ((t1 - 2.0) - (w + z * w));
  z = 1.0 - (r - z);
  j = hi(z);
  j = (j + (n << 20)) | 0;
  if ((j >> 20) <= 0) z = scalbn(z, n);
  else z = setHi(z, (hi(z) + (n << 20)) >>> 0);
  return s * z;
}
