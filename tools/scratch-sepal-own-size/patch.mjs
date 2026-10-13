import fs from 'node:fs';
const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
function sub(from, to) { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`anchor matched ${n} times: ${from.slice(0,60)}`); s = s.replace(from, to); }
sub(`  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = unclamped ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]);\n  return s;`,
    `  for (const [petalId, sepalId] of SEPAL_TWINS) s[petalId] = unclamped ? Number(state[sepalId]) : sepalTwinValue(sepalId, state[sepalId]);\n  /* PROTOTYPE: absolute mm, 0 = follow the petal x sepalScale (the branch) */\n  if (Number(state.sepalLengthMm) > 0) s.petalLength = Number(state.sepalLengthMm) / Number(state.sepalScale);\n  if (Number(state.sepalWidthMm) > 0) s.petalWidth = Number(state.sepalWidthMm) / Number(state.sepalScale);\n  return s;`);
sub(`state.petalLength * sepals.scale, sepalRows);`, `sepalBladeState(state, deg, unclamped).petalLength * sepals.scale, sepalRows);`);
fs.writeFileSync(f, s); console.log('patched');
