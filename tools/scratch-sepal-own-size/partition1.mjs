import * as A from '/tmp/claude-0/-home-user-Portfolio-Site/8611421d-3dbd-5836-8b60-1aa4d578dc4a/scratchpad/base/bloom-geometry.js';
import * as B from '/home/user/Portfolio-Site/bloom-geometry.js';
import { DEFAULTS as DA, CONTROLS } from '/tmp/claude-0/-home-user-Portfolio-Site/8611421d-3dbd-5836-8b60-1aa4d578dc4a/scratchpad/base/bloom-registry.js';
import { DEFAULTS as DB } from '/home/user/Portfolio-Site/bloom-registry.js';
import { buildMatrix, FROZEN_MATRICES } from '/home/user/Portfolio-Site/tools/bloom-harness.mjs';
const kindOf = new Map(CONTROLS.map((c) => [c.id, c.kind]));
const coerce = (set) => Object.fromEntries(Object.entries(set).map(([k, v]) => [k, kindOf.get(k) === 'slider' ? Number(v) : v]));
const rowsOf = (m) => m.map((r) => Array.isArray(r) ? { label: r[0], set: r[1] } : { label: r.label, set: Object.fromEntries((r.set || []).map((s) => [s.id, s.value])) });
const which = process.argv[2] || 'live';
const rows = which === 'live' ? rowsOf(buildMatrix()) : rowsOf(FROZEN_MATRICES[which]());
let n = 0, moved = [], held = 0, err = 0;
for (const r of rows) {
  const set = coerce(r.set || {});
  if (!(Number(set.sepalCount) >= 1)) continue;
  n++;
  const out = {};
  for (const exportMode of [true, false]) {
    let la, lb;
    try { const a = new A.MeshBuilder({ exportMode }); const ma = A.buildBloomInto(a, { ...DA, ...set }); la = ma.sepals && ma.sepals.limit; } catch (e) { la = { err: e.message.slice(0, 60) }; }
    try { const b = new B.MeshBuilder({ exportMode }); const mb = B.buildBloomInto(b, { ...DB, ...set }); lb = mb.sepals && mb.sepals.limit; } catch (e) { lb = { err: e.message.slice(0, 60) }; }
    out[exportMode ? 'export' : 'live'] = { base: la && [la.limitDeg, la.angleBuiltDeg], now: lb && [lb.limitDeg, lb.angleBuiltDeg, lb.exclusionMm] };
  }
  const e = out.export, l = out.live;
  const same = (x) => x.base && x.now && x.base[0] === x.now[0] && x.base[1] === x.now[1];
  if (!e.base || !e.now || e.base.err || e.now.err) { err++; console.log('ERR', r.label, JSON.stringify(out)); continue; }
  if (same(e) && same(l)) held++; else moved.push({ label: r.label, export: e, live: l });
}
console.log(`${which}: ${n} rows with sepals — ${moved.length} moved (built angle or limit), ${held} held, ${err} errors`);
for (const m of moved) console.log(`  MOVED ${m.label}: export limit ${m.export.base[0]}->${m.export.now[0]} built ${m.export.base[1]}->${m.export.now[1]} (excl ${m.export.now[2]} mm); live limit ${m.live.base[0]}->${m.live.now[0]} built ${m.live.base[1]}->${m.live.now[1]}`);
