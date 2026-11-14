// smart-textiles-study-hard.js — the questions on /smart-textiles-study.html that have no options to pick
// from. Four ways to work something out rather than recognise it:
//   * Up, down or same: a change, and two or three quantities, each of which goes up, down or stays
//     the same. Three rows give 27 combinations, so guessing doesn't get far.
//   * Work it out: a number to type. The numbers are drawn fresh each time, a wrong answer says whether
//     it's too high or too low, and the hints give the formula, then the substitution.
//   * Put it in order: a sequence to arrange. Each check locks what's in the right place (like Wordle),
//     so the order can be worked out over a few tries.
//   * Spot the fault: a stack-up with one layer missing or two swapped. Tap where it goes wrong.
// Also: Type the line (the mnemonic cards with words blanked), lab challenges (targets to hit with
// a lab's sliders) and the Hard round, which mixes the first three with typed lines.
//
// Everything is plain data plus small renderers. Each renderer draws one item into a host and calls
// back when it's done, so the chapter widgets and the Hard round use the same code.

import { CARDS, CARD_MORE, STACKS, CHAPTERS } from './smart-textiles-study-data.js';
import { yarnCalc, heaterCalc, capCalc, FILS, poissonCalc, gaugeCalc } from './smart-textiles-study-scenes.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const chName = id => CHAPTERS.find(c => c.id === id);
export const sig = (v, n = 3) => { if (!isFinite(v)) return '—'; if (v === 0) return '0'; const d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v)))); return (+v.toFixed(Math.min(d, 6))).toLocaleString('en-US', { maximumFractionDigits: 6 }); };

// ---------------------------------------------------------------------------------------------
// UP, DOWN OR SAME. dir: 'up' | 'down' | 'same'. Every item has three rows, no item points all one
// way, and over the whole set each direction is right on exactly a third of the rows, so answering
// one direction everywhere scores 33% of rows and no item at all (tools/smart-textiles/verify-study.mjs, V23).
// ---------------------------------------------------------------------------------------------
export const ARROWS = [
  // 01 flow
  { id: 'a-volts', ch: 'flow', q: 'You double the battery voltage across the same loop of conductive thread.', rows: [['Current', 'up'], ['Resistance of the thread', 'same'], ['Time an electron takes to drift round the loop', 'down']], why: 'The thread hasn’t changed, so R stays put. I = V ÷ R: double V, double I, and the electrons drift twice as fast, so a lap takes half the time (still hours).' },
  { id: 'a-switch', ch: 'flow', q: 'You open the switch in a working circuit.', rows: [['Current', 'down'], ['Number of electrons in the thread', 'same'], ['LED brightness', 'down']], why: 'Current falls to zero, but no electrons leave: they’re all still in the thread, jiggling with heat. Nothing pushes them round any more.' },
  { id: 'a-lenflow', ch: 'flow', q: 'Same battery, but the thread loop is twice as long.', rows: [['Resistance', 'up'], ['Current', 'down'], ['Battery voltage', 'same']], why: 'Long and thin, resistance wins: twice the length is twice the R. Same push through twice the fight: half the flow.' },
  { id: 'a-sweat', ch: 'flow', q: 'A sweat droplet bridges the two traces either side of a resistive sensor.', rows: [['Resistance the chip measures', 'down'], ['Total current drawn from the supply', 'up'], ['Resistance of the sensor itself', 'same']], why: 'Sweat adds a second path in parallel with the sensor. The sensor hasn’t changed, but two paths resist less than one, so the measured R falls and more current flows in total.' },
  // 02 resist
  { id: 'a-ply', ch: 'resist', q: 'You ply two identical conductive yarns together and use them as one, from the same battery.', rows: [['Resistance', 'down'], ['Current', 'up'], ['Resistivity ρ of the metal', 'same']], why: 'Two lanes side by side: R halves, so the current doubles. ρ belongs to the metal and doesn’t care how many strands there are.' },
  { id: 'a-fewer', ch: 'resist', q: 'You swap a 128-filament yarn for a 16-filament yarn of the same metal and length.', rows: [['Cross-section of metal', 'down'], ['Resistance', 'up'], ['Resistivity ρ', 'same']], why: 'Fewer filaments, less area A. R = ρL/A, so R rises eight times; ρ is the same metal.' },
  { id: 'a-steel', ch: 'resist', q: 'You swap copper filaments for stainless steel filaments of exactly the same size, on the same battery.', rows: [['Length of the yarn', 'same'], ['Resistance', 'up'], ['Current', 'down']], why: 'Same geometry, worse material: stainless is about 43 times copper’s ρ, so 43 times the R and a 43rd of the current. In return, its chromium-oxide skin survives sweat.' },
  { id: 'a-stretch', ch: 'resist', q: 'You stretch the conductive knit from chapter 02 (it loses loop contacts as it stretches).', rows: [['Loop-to-loop contacts', 'down'], ['Resistance', 'up'], ['Resistivity of the silver itself', 'same']], why: 'Each touching point is a path from loop to loop. Fewer touching, fewer paths side by side: R rises. The silver hasn’t changed.' },
  { id: 'a-heatlen', ch: 'resist', q: 'A 5 V heater: you make the heater line twice as long.', rows: [['Resistance', 'up'], ['Current', 'down'], ['Power', 'down']], why: 'At fixed voltage, longer is colder. Twice the R, half the current, half the power (P = V²/R).' },
  { id: 'a-heatpar', ch: 'resist', q: 'A 5 V heater: you add a second identical line in parallel.', rows: [['Total resistance', 'down'], ['Current from the battery', 'up'], ['Voltage across each line', 'same']], why: 'Two lanes: R halves, so the current and the power both double. Each line still has the full 5 V across it.' },
  { id: 'a-heatyarn', ch: 'resist', q: 'A 5 V heater: you swap 30 Ω/m stainless yarn for 10 Ω/m Ag–Cu wrapped yarn, same length.', rows: [['Resistance', 'down'], ['Current', 'up'], ['Voltage across the line', 'same']], why: 'A third of the R, so three times the current and three times the power, on the same 5 V. Check it isn’t past the battery’s current limit.' },
  { id: 'a-damage', ch: 'resist', q: 'One spot in a series heater line gets thinner (damaged).', rows: [['Resistance at that spot', 'up'], ['Heat made at that spot', 'up'], ['Current through the whole line (a little)', 'down']], why: 'The whole line carries one current, so the spot with more R makes more heat (I²R): a hot spot. The total R rose a little, so the current fell a little.' },
  // 03 metals
  { id: 'a-nickel', ch: 'metals', q: 'A nickel yarn on a fixed 3.3 V warms from 20 °C to 80 °C.', rows: [['Resistance', 'up'], ['Current', 'down'], ['Its resistance once it cools back to 20 °C', 'same']], why: 'Nickel’s resistance rises about 0.6% per °C: about 36% over 60 °C, so the current falls. Cooled, it comes back. Swingy and repeatable, which is why it can measure temperature.' },
  { id: 'a-nichrome', ch: 'metals', q: 'Nichrome heater wire warms from 20 °C to 80 °C on a fixed 5 V.', rows: [['Resistance', 'same'], ['Power', 'same'], ['Heat lost to the air around it', 'up']], why: 'Nichrome barely changes (under 1% here), so the heater keeps the power it was designed for. Heaters want steady. Hotter wire does lose heat faster.' },
  { id: 'a-tarnish', ch: 'metals', q: 'A silver-plated snap tarnishes over a few months.', rows: [['Contact resistance', 'up'], ['Signal quality', 'down'], ['Resistance of the trace leading to it', 'same']], why: 'Silver sulfide is a poor conductor sitting right on the contact face. The trace under its insulation is untouched. That’s why contacts get gold.' },
  { id: 'a-galv', ch: 'metals', q: 'A copper trace touches a silver snap in sweat for weeks.', rows: [['Copper at the joint', 'down'], ['Silver at the joint', 'same'], ['Joint resistance', 'up']], why: 'Two metals plus sweat make a battery; the less noble one (copper) dissolves. The joint gets thinner and corroded, so its resistance climbs.' },
  // 04 sense
  { id: 'a-pressR', ch: 'sense', q: 'You press harder on a resistive pad read through a divider (the chip reads the voltage across the fixed resistor).', rows: [['Sensor resistance', 'down'], ['Sensor’s share of the voltage', 'down'], ['The reading', 'up']], why: 'More conductive paths touch, so the sensor’s R falls. Its share of the 3.3 V falls with it, so the fixed resistor’s share, the reading, rises.' },
  { id: 'a-pressC', ch: 'sense', q: 'You press harder on a capacitive pressure pad.', rows: [['Gap between the plates', 'down'], ['Capacitance', 'up'], ['Area of the plates', 'same']], why: 'C = ε₀εᵣA/d: the plates are the same size, but a smaller gap means more C.' },
  { id: 'a-self', ch: 'sense', q: 'A finger comes close to a self-capacitance electrode.', rows: [['Capacitance to ground', 'up'], ['Voltage the chip charges it to', 'same'], ['Force on the electrode', 'same']], why: 'Self: you add. Your body is extra plate connected to ground. The chip charges to the same threshold, it just takes longer, and nothing has touched it.' },
  { id: 'a-mutual', ch: 'sense', q: 'A finger comes close to a mutual-capacitance crossing.', rows: [['Capacitance between TX and RX', 'down'], ['Gap between the TX and RX electrodes', 'same'], ['Charge coupled across at the same drive voltage', 'down']], why: 'Mutual: you steal. Your finger soaks up field lines that would have reached the receiver, so less charge couples across (Q = CV). The electrodes haven’t moved.' },
  { id: 'a-wetC', ch: 'sense', q: 'Water soaks into the spacer of a capacitive pad. Nobody is pressing.', rows: [['Capacitance', 'up'], ['Force on the pad', 'same'], ['Gap between the plates', 'same']], why: 'Water’s εᵣ is about 80, so C jumps with no force and no change in the gap: water fools C.' },
  { id: 'a-thick', ch: 'sense', q: 'You double the spacer thickness of a capacitive pad, same material and area.', rows: [['Capacitance', 'down'], ['Charge time', 'down'], ['Plate area', 'same']], why: 'Twice the gap, half the C, half the time.' },
  { id: 'a-creep', ch: 'sense', q: 'A steady weight sits on a resistive pressure pad for an hour, read through a divider (the voltage across the fixed resistor).', rows: [['The actual force', 'same'], ['Sensor resistance', 'down'], ['The reading', 'up']], why: 'Polymers remember: the carbon layer keeps slowly squashing (creep), more paths connect, and R drifts down with no change in force, so the reading drifts up.' },
  // 05 stack
  { id: 'a-noinsul', ch: 'stack', q: 'You leave the outer insulation out of a heated panel.', rows: [['Heat lost to the outside air', 'up'], ['Heat reaching the body', 'down'], ['Electrical power the heater draws', 'same']], why: 'Heat flows both ways. The heater makes the same heat; without the insulation, more of it goes outward.' },
  { id: 'a-loose', ch: 'stack', q: 'An EMG sleeve fits loosely instead of compressing the arm.', rows: [['Steadiness of the skin contact', 'down'], ['Motion artefact (noise)', 'up'], ['The muscle’s own signal', 'same']], why: 'Contact pressure is signal quality. The muscle fires the same; a shifting contact changes the electrode-skin impedance, and that change reads as signal.' },
  { id: 'a-shield', ch: 'stack', q: 'You remove the ground shield under a capacitive pad worn on the thigh.', rows: [['How much the leg affects the reading', 'up'], ['The pressure on the pad', 'same'], ['How well the reading tracks the pressure', 'down']], why: 'The body is a 100 pF giant next to a 1 pF sensor. With no grounded layer between them, the leg moving reads as pressure.' },
  { id: 'a-tpubase', ch: 'stack', q: 'You print silver ink straight onto a knit instead of onto a TPU base.', rows: [['Continuity of the trace', 'down'], ['Trace resistance', 'up'], ['Amount of ink printed', 'same']], why: 'Fabric is a sieve: the same ink wicks into the gaps and breaks into islands, so the trace is patchy and resists more, or breaks.' },
  // 06 stretch
  { id: 'a-silicone', ch: 'stretch', q: 'You stretch a silicone strap 10%.', rows: [['Length', 'up'], ['Width', 'down'], ['Volume', 'same']], why: 'Pull it long, it goes thin. Rubber’s ν is ½, so it loses in width and thickness exactly what it gains in length.' },
  { id: 'a-cork', ch: 'stretch', q: 'You stretch a material whose Poisson’s ratio is 0 (cork-like).', rows: [['Length', 'up'], ['Width', 'same'], ['Volume', 'up']], why: 'ν = 0: no sideways change at all, so all the stretch is extra volume.' },
  { id: 'a-auxetic', ch: 'stretch', q: 'You pull an auxetic (bow-tie cell) spacer lengthwise.', rows: [['Length', 'up'], ['Width', 'up'], ['Stiffness of the strut material itself (its E)', 'same']], why: 'Auxetics get fatter when you pull: the re-entrant cells unfold sideways. The struts are an ordinary material; the shape does it.' },
  { id: 'a-liquid', ch: 'stretch', q: 'You stretch a liquid-metal channel sealed in silicone.', rows: [['Volume of the liquid metal', 'same'], ['Channel cross-section', 'down'], ['Resistance', 'up']], why: 'Longer and thinner: hit twice. The metal keeps its volume, so R rises as about the square of the stretch.' },
  { id: 'a-capstretch', ch: 'stretch', q: 'You stretch a silicone capacitor that has stretchy electrodes on both faces.', rows: [['Volume of the silicone layer', 'same'], ['Gap between electrodes', 'down'], ['Capacitance', 'up']], why: 'The silicone keeps its volume (ν = ½), so the plates get bigger and closer at once: C rises in step with the stretch.' },
  { id: 'a-thinfilm', ch: 'stretch', q: 'You swap a 0.2 mm TPU film for a 0.1 mm one in a laminate.', rows: [['Bending stiffness', 'down'], ['How easily the panel drapes', 'up'], ['Young’s modulus of the TPU', 'same']], why: 'Twice as thick, eight times as stiff, and the reverse: half as thick bends eight times as easily. Same TPU, same E.' },
  { id: 'a-serp', ch: 'stretch', q: 'A panel with a serpentine trace on it is stretched 20%.', rows: [['Distance between the trace’s two ends', 'up'], ['Height of the trace’s waves', 'down'], ['Length of the metal path itself', 'same']], why: 'Serpentines turn stretch into bend: the waves flatten out, the metal doesn’t get longer.' },
  { id: 'a-pod', ch: 'stretch', q: 'You bond a rigid pod onto the middle of a stretch sleeve, then stretch the sleeve.', rows: [['Strain under the pod', 'down'], ['Strain right at the pod’s edges', 'up'], ['The pod’s own length', 'same']], why: 'Stiff on soft breaks at the edge: the soft part beside the pod takes the stretch the pod won’t.' },
  { id: 'a-yield', ch: 'stretch', q: 'You stretch a copper wire by 1% and let go.', rows: [['Its length after you let go, compared with before', 'up'], ['Its Young’s modulus', 'same'], ['Its diameter after you let go', 'down']], why: 'Metal only springs back a tiny bit. 1% is far past copper’s yield, so most of it stays, and the metal keeps its volume, so it’s thinner too. Its stiffness, E, hasn’t changed.' },
];

// ---------------------------------------------------------------------------------------------
// WORK IT OUT: generators. Each returns { q, ans, unit, hints[], work }.
// ---------------------------------------------------------------------------------------------
const rnd = a => pick(a);
export const PROBLEMS = {
  'ohm-I': { ch: 'flow', make() { const V = rnd([1.5, 3, 3.7, 5, 9]), R = rnd([47, 100, 150, 220, 330, 470, 680]), I = V / R * 1000;
    return { q: `A ${V} V battery drives a loop of conductive thread with ${R} Ω of resistance. What current flows?`, ans: I, unit: 'mA', hints: ['Push = Flow × Fight, so Flow = Push ÷ Fight: I = V ÷ R.', `I = ${V} ÷ ${R} = ${sig(I / 1000)} A. Multiply by 1000 for mA.`], work: `${V} V ÷ ${R} Ω = ${sig(I)} mA` }; } },
  'ohm-R': { ch: 'flow', make() { const V = rnd([3, 3.3, 5]), I = rnd([10, 15, 20, 25, 30, 40, 50]), R = V / (I / 1000);
    return { q: `You want ${I} mA to flow from a ${V} V supply. What total resistance does the loop need?`, ans: R, unit: 'Ω', hints: ['R = V ÷ I. Convert mA to amps first (divide by 1000).', `R = ${V} ÷ ${I / 1000} = ?`], work: `${V} V ÷ ${I / 1000} A = ${sig(R)} Ω` }; } },
  'ohm-V': { ch: 'flow', make() { const I = rnd([5, 10, 20, 25, 40]), R = rnd([50, 100, 120, 200, 330]), V = I / 1000 * R;
    return { q: `${I} mA is flowing through ${R} Ω of thread. What voltage is pushing it?`, ans: V, unit: 'V', hints: ['V = I × R, with I in amps.', `V = ${I / 1000} × ${R} = ?`], work: `${I / 1000} A × ${R} Ω = ${sig(V)} V` }; } },
  'yarn-R': { ch: 'resist', make() { const o = rnd([5, 10, 30, 60, 100]), L = rnd([0.25, 0.4, 0.5, 0.8, 1.2, 1.5, 2]), R = o * L;
    return { q: `A ${o} Ω/m yarn is ${L} m long. What is its resistance, end to end?`, ans: R, unit: 'Ω', hints: ['Ω/m is ohms per metre of this yarn: multiply by the length.', `R = ${o} × ${L} = ?`], work: `${o} Ω/m × ${L} m = ${sig(R)} Ω` }; } },
  'parallel': { ch: 'resist', make() { const n = rnd([2, 3, 4, 5, 8]), R = rnd([20, 30, 45, 60, 90, 120]), Rt = R / n;
    return { q: `${n} identical ${R} Ω yarn lines run side by side between the same two bus bars. What is the total resistance?`, ans: Rt, unit: 'Ω', hints: ['More lanes, less jam: n equal paths in parallel give R ÷ n.', `${R} ÷ ${n} = ?`], work: `${R} Ω ÷ ${n} = ${sig(Rt)} Ω` }; } },
  'series': { ch: 'resist', make() { const R = rnd([12, 20, 35, 50]), n = rnd([2, 3, 4]), c = rnd([0.5, 1, 2, 3]), Rt = R + n * c;
    return { q: `A ${R} Ω trace is joined to the board through ${n} contacts in series (snap, crimp…), each adding ${c} Ω. Total resistance of the path?`, ans: Rt, unit: 'Ω', hints: ['End to end, add: every joint in series adds its own resistance.', `${R} + ${n} × ${c} = ?`], work: `${R} + ${n} × ${c} = ${sig(Rt)} Ω` }; } },
  'heater-P': { ch: 'resist', make() { const o = rnd([10, 30, 100]), L = rnd([0.5, 0.8, 1, 1.5, 2]), n = rnd([1, 2, 3, 4]), R = o * L / n, P = 25 / R;
    return { q: `A 5 V battery feeds ${n === 1 ? 'one line' : `${n} lines in parallel`} of ${o} Ω/m heater yarn, each ${L} m long. How much power does the heater make?`, ans: P, unit: 'W', hints: [`One line: R = ${o} × ${L} = ${sig(o * L)} Ω.${n > 1 ? ` ${n} in parallel: ÷ ${n} = ${sig(R)} Ω.` : ''}`, `P = V² ÷ R = 25 ÷ ${sig(R)} = ?`], work: `R = ${sig(R)} Ω; P = 5² ÷ ${sig(R)} = ${sig(P)} W` }; } },
  'square': { ch: 'resist', make() { const P = rnd([2, 3, 4, 5]), k = rnd([1.5, 2, 3]), Pn = P * k * k;
    return { q: `A heater line makes ${P} W. You raise the current ${k}× through the same yarn. How much power now?`, ans: Pn, unit: 'W', hints: ['Heat goes with the square: P = I²R.', `${k}² = ${k * k}, so ${P} × ${k * k} = ?`], work: `${P} W × ${k}² = ${sig(Pn)} W` }; } },
  'metal-ratio': { ch: 'metals', make() {
    const RHO = { silver: 1.59, copper: 1.68, gold: 2.44, aluminium: 2.65, nickel: 6.99, 'stainless steel': 72, nichrome: 110 };
    const names = Object.keys(RHO); let a, b; do { [a, b] = shuffle(names); } while (RHO[a] <= RHO[b] * 1.2);
    const k = RHO[a] / RHO[b];
    return { q: `Two yarns are identical in length and filament count, one ${a}, one ${b}. How many times the resistance of the ${b} yarn does the ${a} yarn have?`, ans: k, unit: '×', hints: ['Same L and A, so R = ρL/A follows ρ alone: the ratio of resistances is the ratio of resistivities.', `ρ ${a} ≈ ${RHO[a]} and ρ ${b} ≈ ${RHO[b]} (× 10⁻⁸ Ω·m). Divide.`], work: `${RHO[a]} ÷ ${RHO[b]} = ${sig(k)}×` }; } },
  'tcr': { ch: 'metals', make() {
    const m = rnd([['nickel', 0.6], ['copper', 0.39]]), R0 = rnd([20, 50, 100]), dT = rnd([10, 20, 30, 40, 50, 60]), R = R0 * (1 + m[1] / 100 * dT);
    return { q: `A ${m[0]} yarn reads ${R0} Ω at 20 °C. Its resistance rises about ${m[1]}% for every °C. What does it read at ${20 + dT} °C?`, ans: R, unit: 'Ω', hints: [`It warms by ${dT} °C, so the rise is ${m[1]}% × ${dT} = ${sig(m[1] * dT)}%.`, `${R0} × (1 + ${sig(m[1] * dT / 100)}) = ?`], work: `${R0} × ${sig(1 + m[1] * dT / 100, 4)} = ${sig(R)} Ω` }; } },
  'divider': { ch: 'sense', make() { const Rs = rnd([5, 10, 15, 20, 30, 40, 50]), Vout = 3.3 * 10 / (Rs + 10);
    return { q: `A pressure sensor reading ${Rs} kΩ sits in series with a fixed 10 kΩ resistor across 3.3 V. What voltage is across the fixed resistor?`, ans: Vout, unit: 'V', hints: ['Two resistors share the push in proportion: the fixed one gets 10 ÷ (sensor + 10) of the 3.3 V.', `3.3 × 10 ÷ (${Rs} + 10) = ?`], work: `3.3 × 10 ÷ ${Rs + 10} = ${sig(Vout)} V` }; } },
  'cap-ratio': { ch: 'sense', make() {
    const OPTS = { gap: [['halve the gap', 2], ['cut the gap to a third', 3], ['double the gap', 0.5]], eps: [['fill the gap with polyester (εᵣ ≈ 3) instead of air', 3]], area: [['double the plate area', 2], ['halve the plate area', 0.5]] };
    const ch = shuffle(Object.keys(OPTS)).slice(0, 2).map(k => pick(OPTS[k]));
    const k = ch[0][1] * ch[1][1];
    return { q: `An air-gap capacitive pad measures C₀. You ${ch[0][0]} and ${ch[1][0]}. The new capacitance is how many times C₀?`, ans: k, unit: '× C₀', hints: ['C = ε₀εᵣA/d: area and filling on top, gap underneath. Each change multiplies C.', `${ch[0][0]}: × ${sig(ch[0][1])}. ${ch[1][0]}: × ${sig(ch[1][1])}. Multiply them.`], work: `${sig(ch[0][1])} × ${sig(ch[1][1])} = ${sig(k)}` }; } },
  'rc': { ch: 'sense', make() { const R = rnd([0.5, 1, 2, 4]), C = rnd([1, 1.2, 2, 5, 10]), t = R * C;
    return { q: `A chip charges an electrode through ${R} MΩ. The electrode is ${C} pF. What is the time constant τ = RC?`, ans: t, unit: 'µs', hints: ['Mega (10⁶) times pico (10⁻¹²) is micro (10⁻⁶): MΩ × pF = µs.', `${R} × ${C} = ?`], work: `${R} MΩ × ${C} pF = ${sig(t)} µs` }; } },
  'strain': { ch: 'stretch', make() { const L = rnd([50, 80, 100, 120, 150, 200, 250]), d = rnd([2, 4, 5, 8, 10, 15, 20, 30]), e = d / L * 100;
    return { q: `A ${L} mm strip of stretch fabric is pulled to ${L + d} mm. What is the strain, in percent?`, ans: e, unit: '%', hints: ['Strain is stretch per length: ε = ΔL ÷ L.', `${d} ÷ ${L} = ?, then × 100 for percent.`], work: `${d} ÷ ${L} = ${sig(e / 100)} = ${sig(e)}%` }; } },
  'stress': { ch: 'stretch', make() { const F = rnd([5, 10, 15, 20, 30]), w = rnd([10, 20, 25]), t = rnd([0.1, 0.2, 0.5]), sg = F / (w * t);
    return { q: `A TPU strip ${w} mm wide and ${t} mm thick carries a pull of ${F} N. What is the stress in it?`, ans: sg, unit: 'MPa', hints: ['Stress is force over cross-section area: σ = F ÷ A. 1 N per mm² is 1 MPa.', `A = ${w} × ${t} = ${sig(w * t)} mm². ${F} ÷ ${sig(w * t)} = ?`], work: `${F} N ÷ ${sig(w * t)} mm² = ${sig(sg)} MPa` }; } },
  'modulus': { ch: 'stretch', make() { const sg = rnd([0.2, 0.5, 1, 2, 3]), e = rnd([1, 2, 4, 5, 10, 20]), E = sg / (e / 100);
    return { q: `A film stretches ${e}% under a stress of ${sg} MPa, still in its straight first region. What is its Young’s modulus?`, ans: E, unit: 'MPa', hints: ['Stiffness is stress over strain: E = σ ÷ ε, with ε as a decimal.', `${e}% = ${e / 100}. ${sg} ÷ ${e / 100} = ?`], work: `${sg} MPa ÷ ${e / 100} = ${sig(E)} MPa` }; } },
  'poisson-w': { ch: 'stretch', make() { const w = rnd([10, 20, 25, 30, 40, 50]), nu = rnd([0.3, 0.4, 0.5]), e = rnd([2, 4, 5, 8, 10]), wn = w * (1 - nu * e / 100);
    return { q: `A ${w} mm wide strip with Poisson’s ratio ${nu} is stretched ${e}% lengthwise. About how wide is it now?`, ans: wn, unit: 'mm', hints: ['Pull it long, it goes thin: width change ≈ −ν × stretch.', `${nu} × ${e}% = ${sig(nu * e)}% narrower. ${w} × (1 − ${sig(nu * e / 100)}) = ?`], work: `${w} × (1 − ${nu} × ${e / 100}) = ${sig(wn)} mm` }; } },
  'gauge-R': { ch: 'stretch', make() { const R0 = rnd([2, 5, 10, 20, 50]), e = rnd([10, 20, 25, 30, 50]), R = R0 * (1 + e / 100) ** 2;
    return { q: `A liquid-metal trace in silicone reads ${R0} Ω relaxed. It’s stretched ${e}%. What does it read now? (Liquid metal keeps its volume.)`, ans: R, unit: 'Ω', hints: ['Longer and thinner: hit twice. Length × λ, cross-section ÷ λ, so R × λ².', `λ = ${sig(1 + e / 100)}. ${R0} × ${sig(1 + e / 100)}² = ?`], work: `${R0} × ${sig(1 + e / 100)}² = ${sig(R)} Ω` }; } },
  'bend': { ch: 'stretch', make() { const k = rnd([2, 3, 0.5, 1.5]), r = k ** 3;
    return { q: `You change a TPU film to ${k}× its thickness, same material. How many times its old bending stiffness does it have now?`, ans: r, unit: '×', hints: ['Twice as thick, eight times as stiff: bending stiffness goes with thickness cubed.', `${k}³ = ?`], work: `${k}³ = ${sig(r)}×` }; } },
  'cap-stretch': { ch: 'stretch', make() { const C0 = rnd([5, 10, 20, 50]), L = rnd([1.2, 1.3, 1.5, 1.8, 2]), C = C0 * L;
    return { q: `A silicone capacitive strain sensor reads ${C0} pF relaxed. It’s stretched to ${L}× its length. What does it read?`, ans: C, unit: 'pF', hints: ['Stretch a rubber capacitor and C rises in step: area × √λ, gap ÷ √λ, so C × λ.', `${C0} × ${L} = ?`], work: `${C0} × ${L} = ${sig(C)} pF` }; } },
};

// ---------------------------------------------------------------------------------------------
// PUT IT IN ORDER. items are in the right order here; the game shuffles them.
// ---------------------------------------------------------------------------------------------
export const ORDERS = [
  { id: 'o-yarns', ch: 'resist', q: 'Rank these by resistance, lowest first.', items: ['0.5 m of 10 Ω/m yarn', '0.5 m of 30 Ω/m yarn', '1 m of 30 Ω/m yarn', 'Two 1 m lines of 100 Ω/m yarn, side by side', '1 m of 100 Ω/m yarn'], why: '5 Ω, 15 Ω, 30 Ω, 50 Ω (100 ÷ 2), 100 Ω.' },
  { id: 'o-ladder', ch: 'metals', q: 'Rank these by resistivity, best conductor first.', items: ['Silver', 'Copper', 'Gold', 'Aluminium', 'Nickel', 'Stainless steel', 'Nichrome', 'Carbon fibre'], why: 'Some Cats Get Angry first (1.59, 1.68, 2.44, 2.65 × 10⁻⁸ Ω·m), then nickel 6.99, stainless 72, nichrome 110, carbon fibre about 1,500.' },
  { id: 'o-capread', ch: 'sense', q: 'Put the steps of reading a capacitive pad (by timing a charge) in order.', items: ['Discharge the electrode to 0 V', 'Start a timer and charge it through a resistor', 'The voltage rises, slower if C is bigger', 'Stop the timer when the voltage crosses the threshold', 'Compare the time with the untouched baseline'], why: 'Empty the bucket, open the tap, watch it fill, note when it reaches the line, compare with an empty-hand reading.' },
  { id: 'o-emg', ch: 'stack', q: 'Order a muscle signal’s path from the muscle to a number.', items: ['Muscle fibres fire', 'A tiny voltage appears at the skin surface', 'The silver electrode picks it up', 'The snap carries it through the fabric', 'The amplifier boosts the microvolts', 'The ADC turns the voltage into numbers'], why: 'The pod sits right behind the snap so the microvolt signal has a short way to travel before it’s amplified.' },
  { id: 'o-stiff', ch: 'stretch', q: 'Rank by Young’s modulus, stiffest first.', items: ['Carbon fibre', 'Stainless steel', 'Copper', 'Silver', 'Polyester fibre', 'Nylon fibre', 'TPU', 'Silicone'], why: 'About 230, 190, 120, 80, 10 and 3 GPa, then TPU about 0.01–0.05 GPa and silicone about 0.001 GPa (1 MPa).' },
  { id: 'o-poisson', ch: 'stretch', q: 'Rank by Poisson’s ratio, lowest first.', items: ['Auxetic spacer', 'Cork', 'Glass', 'Steel', 'Silicone rubber'], why: 'Below zero, about 0, about 0.2, about 0.3, about 0.5. Cork zero, metal a third, rubber a half.' },
];

// ---------------------------------------------------------------------------------------------
// renderers
// ---------------------------------------------------------------------------------------------
const DIR = { up: ['↑', 'goes up'], down: ['↓', 'goes down'], same: ['=', 'stays the same'] };
export function renderArrow(host, item, done) {
  host.innerHTML = `<p class="sx-prompt">${esc(item.q)}</p>
    <div class="sx-arrows">${item.rows.map(([label], r) => `<div class="sx-arrow-row" data-row="${r}"><span class="sx-arrow-label">${esc(label)}</span><span class="sx-arrow-btns" role="group" aria-label="${esc(label)}">${Object.entries(DIR).map(([k, [g, w]]) => `<button type="button" class="sx-dir" data-dir="${k}" aria-pressed="false" aria-label="${esc(label)} ${w}">${g}</button>`).join('')}</span><span class="sx-arrow-mark"></span></div>`).join('')}</div>
    <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="check" disabled>Check</button><span class="sx-hint">Pick ↑, ↓ or = for every row.</span></div>
    <p class="sx-why" hidden></p>`;
  const picks = {};
  for (const b of $$('.sx-dir', host)) b.addEventListener('click', () => {
    const r = +b.closest('[data-row]').dataset.row; picks[r] = b.dataset.dir;
    for (const o of $$(`[data-row="${r}"] .sx-dir`, host)) o.setAttribute('aria-pressed', String(o === b));
    $('[data-a="check"]', host).disabled = Object.keys(picks).length < item.rows.length;
  });
  $('[data-a="check"]', host).addEventListener('click', () => {
    let right = 0;
    item.rows.forEach(([, want], r) => {
      const ok = picks[r] === want; if (ok) right++;
      const row = $(`[data-row="${r}"]`, host); row.dataset.r = ok ? 'right' : 'wrong';
      $$('.sx-dir', row).forEach(b => { b.disabled = true; if (b.dataset.dir === want) b.dataset.want = 'true'; });
      $('.sx-arrow-mark', row).textContent = ok ? '✓' : `✕ ${DIR[want][1]}`;
    });
    const all = right === item.rows.length;
    $('.sx-next', host).remove();
    const why = $('.sx-why', host); why.hidden = false;
    why.innerHTML = `<b>${all ? '✓ All right.' : `${right} of ${item.rows.length} right.`}</b> ${esc(item.why)}`;
    done?.(all, right);
  });
}

const parseNum = s => { const t = String(s).replace(/[,\s]/g, '').replace(/[^\d.eE+-]/g, ''); return t ? +t : NaN; };
export function closeEnough(x, ans) { return isFinite(x) && Math.abs(x - ans) <= Math.max(Math.abs(ans) * 0.03, 0.005); }
export function renderProblem(host, p, done) {
  let tries = 0, hints = 0, over = false;
  host.innerHTML = `<p class="sx-prompt">${esc(p.q)}</p>
    <div class="sx-answer"><input type="text" inputmode="decimal" autocomplete="off" aria-label="Your answer, in ${esc(p.unit)}" class="sx-input"><span class="sx-unit">${esc(p.unit)}</span>
      <button type="button" class="sx-btn sx-btn--go" data-a="check">Check</button><button type="button" class="sx-btn" data-a="hint">Hint</button><button type="button" class="sx-btn" data-a="show">Show me</button></div>
    <div class="sx-hints"></div><p class="sx-why" aria-live="polite"></p>`;
  const input = $('input', host), why = $('.sx-why', host);
  const finish = (ok, how) => {
    over = true; input.disabled = true; $$('.sx-answer .sx-btn', host).forEach(b => b.disabled = true);
    why.innerHTML = `<b>${ok ? `✓ ${sig(p.ans)} ${esc(p.unit)}.` : `The answer is ${sig(p.ans)} ${esc(p.unit)}.`}</b> ${esc(p.work)}${how ? ` <span class="muted">${how}</span>` : ''}`;
    done?.(ok, tries === 1 && hints === 0);
  };
  const check = () => {
    if (over) return;
    const x = parseNum(input.value); if (!isFinite(x)) { why.innerHTML = '<b>!</b> Type a number.'; return; }
    tries++;
    if (closeEnough(x, p.ans)) return finish(true, tries > 1 || hints ? `(${tries} ${tries > 1 ? 'tries' : 'try'}, ${hints} hint${hints === 1 ? '' : 's'})` : '');
    why.innerHTML = `<b>✕ ${x > p.ans ? 'Too high.' : 'Too low.'}</b> ${tries >= 2 && hints < p.hints.length ? 'Try a hint.' : 'Try again.'}`;
    input.select();
  };
  $('[data-a="check"]', host).addEventListener('click', check);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  $('[data-a="hint"]', host).addEventListener('click', () => {
    if (hints >= p.hints.length) return;
    $('.sx-hints', host).insertAdjacentHTML('beforeend', `<p class="sx-hintline"><span>Hint ${hints + 1}</span> ${esc(p.hints[hints])}</p>`);
    hints++; if (hints >= p.hints.length) $('[data-a="hint"]', host).disabled = true;
  });
  $('[data-a="show"]', host).addEventListener('click', () => { tries = Math.max(tries, 1); finish(false); });
}

const norm = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
export const wordMatch = (typed, want) => { const a = norm(typed), b = norm(want); return a === b || (b.length >= 5 && lev(a, b) <= 1); };
// the hook with each cloze word replaced by an input, first occurrence only, whole words only
export function clozeHTML(card) {
  const words = CARD_MORE[card.id]?.cloze || [];
  let html = esc(card.hook);
  words.forEach((w, i) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\p{L}\\p{N}]|$)`, 'u');
    html = html.replace(re, (m, pre) => `${pre}<input type="text" class="sx-gap" data-gap="${i}" autocomplete="off" spellcheck="false" aria-label="missing word ${i + 1}" size="${Math.max(3, w.length + 1)}">`);
  });
  return html;
}
export function renderCloze(host, card, done) {
  const more = CARD_MORE[card.id], words = more.cloze, ci = chName(card.ch);
  host.innerHTML = `<span class="sx-card__ch">${ci ? `${ci.n} · ${esc(ci.name)}` : ''}</span>
    <p class="sx-card__front">${esc(card.front)}</p>
    <p class="sx-card__hook sx-cloze">${clozeHTML(card)}</p>
    <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="check">Check</button><button type="button" class="sx-btn" data-a="first">First letters</button><button type="button" class="sx-btn" data-a="give">Show it</button></div>
    <div class="sx-reveal" hidden></div>`;
  const gaps = $$('.sx-gap', host);
  gaps[0]?.focus({ preventScroll: true });
  const reveal = ok => {
    gaps.forEach((g, i) => { g.disabled = true; g.dataset.r = wordMatch(g.value, words[i]) ? 'right' : 'wrong'; if (g.dataset.r === 'wrong') g.value = words[i]; });
    $('.sx-next', host).remove();
    const r = $('.sx-reveal', host); r.hidden = false;
    r.innerHTML = `<p class="sx-why"><b>${ok ? '✓ Got it.' : 'Here it is.'}</b> ${esc(more.explain)}</p>${altsHTML(more)}`;
    done?.(ok);
  };
  const check = () => {
    const all = gaps.every((g, i) => wordMatch(g.value, words[i]));
    if (all) return reveal(true);
    gaps.forEach((g, i) => { g.dataset.r = wordMatch(g.value, words[i]) ? 'right' : g.value ? 'wrong' : ''; });
  };
  gaps.forEach(g => g.addEventListener('keydown', e => { if (e.key === 'Enter') check(); }));
  $('[data-a="check"]', host).addEventListener('click', check);
  $('[data-a="first"]', host).addEventListener('click', () => gaps.forEach((g, i) => { if (!wordMatch(g.value, words[i])) { g.value = words[i][0]; g.focus(); } }));
  $('[data-a="give"]', host).addEventListener('click', () => reveal(false));
}
export const altsHTML = more => `<div class="sx-alts"><span class="sx-eyebrow">Other ways to remember it</span><ul>${more.alts.map(([k, t]) => `<li><b>${esc(k)}</b> ${esc(t)}</li>`).join('')}</ul></div>`;

export function renderOrder(host, item, done) {
  const n = item.items.length;
  let order; do { order = shuffle(item.items.map((_, i) => i)); } while (order.every((v, i) => v === i));
  const locked = new Set(); let sel = -1, tries = 0;
  const paint = () => {
    const solved = locked.size === n;
    host.innerHTML = `<p class="sx-prompt">${esc(item.q)}</p>
      <ol class="sx-order">${order.map((v, i) => `<li><button type="button" class="sx-order-item" data-i="${i}" data-lock="${locked.has(i)}" aria-pressed="${sel === i}" ${locked.has(i) || solved ? 'disabled' : ''}><span class="k">${i + 1}</span>${esc(item.items[v])}</button></li>`).join('')}</ol>
      ${solved ? `<p class="sx-why"><b>✓ Solved in ${tries} ${tries === 1 ? 'check' : 'checks'}.</b> ${esc(item.why)}</p>` : `<div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="check">Check the order</button><span class="sx-hint">${tries ? `${locked.size} of ${n} locked in place. ` : ''}Tap two items to swap them.</span></div>`}`;
    for (const b of $$('.sx-order-item:not([disabled])', host)) b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (sel < 0) { sel = i; } else if (sel === i) { sel = -1; } else { [order[sel], order[i]] = [order[i], order[sel]]; sel = -1; }
      paint(); $(`.sx-order-item[data-i="${i}"]`, host)?.focus({ preventScroll: true });
    });
    $('[data-a="check"]', host)?.addEventListener('click', () => {
      tries++; sel = -1;
      order.forEach((v, i) => { if (v === i) locked.add(i); });
      paint();
      if (locked.size === n) done?.(tries);
    });
  };
  paint();
}

// a stack with one fault: a missing layer (one whose absence has a consequence) or two neighbours swapped
export function makeFault(stack) {
  const L = stack.layers, kinds = [];
  L.forEach((l, i) => { if (l.fails && !l.group) kinds.push({ type: 'missing', i }); });
  for (let i = 0; i + 1 < L.length; i++) if (L[i].name !== L[i + 1].name && !(L[i].group && L[i].group === L[i + 1].group) && (L[i].fails || L[i + 1].fails)) kinds.push({ type: 'swap', i });
  const f = pick(kinds);
  const shown = L.map((_, i) => i);
  if (f.type === 'missing') shown.splice(f.i, 1); else [shown[f.i], shown[f.i + 1]] = [shown[f.i + 1], shown[f.i]];
  return { ...f, shown };
}
export function renderFault(host, stack, done) {
  const f = makeFault(stack), L = stack.layers;
  const gap = k => `<li class="sx-fault-gap"><button type="button" class="sx-gap-btn" data-gap="${k}" aria-label="A layer is missing here">+ missing here?</button></li>`;
  host.innerHTML = `<p class="sx-prompt">${esc(stack.name)}: something is wrong with this build. Tap the layer that’s in the wrong place, or the gap where a layer is missing.</p>
    <ol class="sx-fault"><li class="sx-ends">${esc(stack.from)}</li>${f.shown.map((li, k) => gap(k) + `<li><button type="button" class="sx-fault-layer" data-pos="${k}" data-li="${li}">${esc(L[li].name)}</button></li>`).join('')}${gap(f.shown.length)}<li class="sx-ends">${esc(stack.to)}</li></ol>
    <p class="sx-why" hidden></p>`;
  const answer = (ok) => {
    $$('button', host).forEach(b => b.disabled = true);
    const why = $('.sx-why', host); why.hidden = false;
    if (f.type === 'missing') {
      const l = L[f.i];
      $(`.sx-gap-btn[data-gap="${f.i}"]`, host).dataset.want = 'true';
      why.innerHTML = `<b>${ok ? '✓ Right:' : '✕ It was a missing layer:'}</b> the <b>${esc(l.name)}</b> belongs there. ${esc(l.role)} ${esc(l.fails)}`;
    } else {
      const a = L[f.i], b = L[f.i + 1];
      $$(`.sx-fault-layer[data-pos="${f.i}"], .sx-fault-layer[data-pos="${f.i + 1}"]`, host).forEach(x => x.dataset.want = 'true');
      why.innerHTML = `<b>${ok ? '✓ Right:' : '✕ Two layers were swapped:'}</b> <b>${esc(a.name)}</b> goes before <b>${esc(b.name)}</b>, counting from the ${esc(stack.from.toLowerCase())}.<br><b>${esc(a.name)}</b>: ${esc(a.role)}<br><b>${esc(b.name)}</b>: ${esc(b.role)}`;
    }
    done?.(ok);
  };
  for (const g of $$('.sx-gap-btn', host)) g.addEventListener('click', () => { g.dataset.pick = 'true'; answer(f.type === 'missing' && +g.dataset.gap === f.i); });
  for (const b of $$('.sx-fault-layer', host)) b.addEventListener('click', () => { b.dataset.pick = 'true'; answer(f.type === 'swap' && (+b.dataset.pos === f.i || +b.dataset.pos === f.i + 1)); });
}

// ---------------------------------------------------------------------------------------------
// LAB CHALLENGES: targets read straight off the lab's own state, with the scene's own formulas
// ---------------------------------------------------------------------------------------------
const within = (x, t, tol = 0.03) => Math.abs(x - t) <= Math.abs(t) * tol;
export const CHALLENGES = {
  ohm: { read: st => ({ I: +st.V / +st.R * 1000, V: +st.V, R: +st.R }), now: v => `now ${sig(v.I)} mA from ${sig(v.V)} V through ${sig(v.R)} Ω`, targets: [
    ['Get 50 mA flowing.', v => within(v.I, 50)],
    ['Get 20 mA with a push of at least 6 V.', v => within(v.I, 20) && v.V >= 6],
    ['Get 100 mA through at least 50 Ω.', v => within(v.I, 100) && v.R >= 50],
    ['Get 30 mA with a push of at least 9 V.', v => within(v.I, 30) && v.V >= 9]] },
  yarnR: { read: st => { const c = yarnCalc(st.mat, +st.len, +st.fil); return { R: c.R, mat: st.mat, len: +st.len, n: c.n }; }, now: v => `now ${sig(v.R)} Ω: ${v.n} filaments of ${v.mat}, ${sig(v.len)} m`, targets: [
    ['Make a full metre read under 1 Ω.', v => v.R < 1 && v.len >= 1],
    ['Make a 2 m stainless steel yarn read under 100 Ω.', v => v.mat === 'steel' && v.len >= 2 && v.R < 100],
    ['Find a nichrome yarn between 5 and 10 Ω.', v => v.mat === 'nichrome' && v.R >= 5 && v.R <= 10],
    ['Make carbon fibre read under 500 Ω.', v => v.mat === 'carbon' && v.R < 500]] },
  heater: { read: st => { const c = heaterCalc(+st.yarn, Math.round(+st.n), +st.len); return { ...c, yarn: String(st.yarn) }; }, now: v => `now ${sig(v.P)} W, ${sig(v.I)} A, ${sig(v.cov)} m of yarn`, targets: [
    ['A working heater with the Ag–Cu wrapped yarn (10 Ω/m).', v => v.yarn === '10' && v.okP && v.okI && v.okC],
    ['A working heater with the stainless yarn (30 Ω/m).', v => v.yarn === '30' && v.okP && v.okI && v.okC],
    ['A working heater with the carbon fibre tow (100 Ω/m).', v => v.yarn === '100' && v.okP && v.okI && v.okC]] },
  divider: { read: st => { const Rs = 100 / (1 + 19 * +st.press); return { Vout: 3.3 * 10 / (Rs + 10), Rs }; }, now: v => `now ${sig(v.Vout)} V out, sensor ${sig(v.Rs)} kΩ`, targets: [
    ['Make the chip read 1.0 V.', v => Math.abs(v.Vout - 1) <= 0.03],
    ['Make it read 2.0 V.', v => Math.abs(v.Vout - 2) <= 0.03],
    ['Find the press where the sensor and the fixed resistor share the 3.3 V equally.', v => Math.abs(v.Vout - 1.65) <= 0.04]] },
  bucket: { read: st => { const c = capCalc(+st.gap, +st.eps); return { us: c.us, gap: +st.gap, eps: +st.eps }; }, now: v => `now ${sig(v.us)} µs with ${({ 1: 'air', 3: 'polyester', 80: 'water' })[v.eps]} at ${sig(v.gap)} mm`, targets: [
    ['With air, take twice as long as air at 3 mm does.', v => v.eps === 1 && within(v.us, capCalc(3, 1).us * 2)],
    ['With polyester, read the same as air at 1 mm.', v => v.eps === 3 && within(v.us, capCalc(1, 1).us)],
    ['Show how water fools C: get a reading over 100 µs.', v => v.eps === 80 && v.us > 100]] },
  poisson: { read: st => ({ ...poissonCalc(st.mat, +st.strain), mat: st.mat }), now: v => `now ν ${sig(v.nu)}: length +${sig(v.e * 100)}%, width ${v.width >= 0 ? '+' : '−'}${sig(Math.abs(v.width) * 100)}%`, targets: [
    ['Make the block exactly 3% narrower.', v => within(-v.width, 0.03)],
    ['Stretch it the full 20% with no narrowing at all.', v => v.e >= 0.2 - 1e-9 && Math.abs(v.width) < 1e-9],
    ['Make it get wider as you stretch it.', v => v.width > 1e-9],
    ['Stretch it at least 10% and keep its volume exactly.', v => v.mat !== 'bias' && v.e >= 0.1 - 1e-9 && Math.abs(v.vol) < 1e-9]] },
  gauge: { read: st => { const c = gaugeCalc(st.mat, +st.strain); return { mat: st.mat, e: c.e, ratio: c.ratio, gf: c.gf, yielded: c.yielded }; }, now: v => `now R × ${sig(v.ratio, 4)} at ${sig(v.e * 100)}% stretch, gauge factor ${sig(v.gf)}`, targets: [
    ['Raise the liquid metal’s resistance by 20%.', v => v.mat === 'liquid' && within(v.ratio - 1, 0.2)],
    ['Stretch the copper at least 0.15% without it yielding.', v => v.mat === 'metal' && v.e >= 0.0015 - 1e-9 && !v.yielded],
    ['Make the liquid metal’s gauge factor read 2.2.', v => v.mat === 'liquid' && within(v.gf, 2.2)]] },
};
export function mountChallenge(host, player, spec, onWin, start = 0) {
  let at = Math.min(start, spec.targets.length), last = '';
  const paint = v => {
    const html = `<div class="sx-chal__head"><span class="sx-eyebrow">Challenge</span><span class="sx-chal__now">${esc(spec.now(v))}</span></div>
      <ol class="sx-chal__list">${spec.targets.map(([t], i) => `<li data-state="${i < at ? 'done' : i === at ? 'now' : 'next'}"><span class="mk">${i < at ? '✓' : i + 1}</span>${esc(t)}</li>`).join('')}</ol>
      ${at >= spec.targets.length ? '<p class="sx-why"><b>✓ All done.</b> Move the sliders again any time.</p>' : ''}`;
    if (html !== last) { host.innerHTML = html; last = html; }
  };
  const tick = () => {
    const v = spec.read(player.state);
    if (at < spec.targets.length && spec.targets[at][1](v)) { at++; onWin?.(at); }
    paint(v);
  };
  tick();
  host.addEventListener('sx-reset', () => { at = 0; tick(); });
  return tick;
}
