// smart-textiles-study-data.js — the content of /smart-textiles-study.html: the mnemonic cards, the
// quiz, the metal cards, the two scenario games and the stack-ups. Pure data; no DOM.
//
// Numbers are room-temperature handbook values, rounded. Where a value depends on the product (a
// yarn's ohms per metre, a polymer's conductivity) the copy says "typical" and gives an order of
// magnitude rather than a spec. Chapters: flow, resist, metals, sense, stack.

export const CHAPTERS = [
  { id: 'flow', n: '01', name: 'Electrons and the Push', anchor: '#flow' },
  { id: 'resist', n: '02', name: 'Why a Yarn Resists', anchor: '#resist' },
  { id: 'metals', n: '03', name: 'Choosing the Metal', anchor: '#metals' },
  { id: 'sense', n: '04', name: 'Resistive vs Capacitive', anchor: '#sense' },
  { id: 'stack', n: '05', name: 'Stack-Ups', anchor: '#stack' },
];

// ---------------------------------------------------------------------------------------------
// MNEMONIC CARDS. front = the question, hook = the line to remember, back = why it is true.
// ---------------------------------------------------------------------------------------------
export const CARDS = [
  // 01 flow
  { id: 'ohm', ch: 'flow', front: 'Ohm’s law, in plain words', hook: 'Push = Flow × Fight', back: 'V = I · R. Voltage is the push, current is how much charge gets through per second, resistance is how hard the path fights it. Hold any two and the third is fixed.' },
  { id: 'arrow', ch: 'flow', front: 'Which way does current flow?', hook: 'Electrons leave the minus; the arrow leaves the plus.', back: 'Franklin picked the sign in the 1740s, a century and a half before anyone found the electron. Diagrams kept his arrow (+ to −). The electrons actually run the other way. Both describe the same circuit.' },
  { id: 'marbles', ch: 'flow', front: 'If electrons crawl, why does the LED light instantly?', hook: 'A tube full of marbles: each barely moves, the push arrives at once.', back: 'In copper at 1 A per mm² an electron drifts about 0.07 mm a second. The wire is already full of them, so pushing at one end moves every electron along the path at nearly the same moment.' },
  { id: 'loop', ch: 'flow', front: 'Why does a single thread from + to an LED do nothing?', hook: 'No loop, no flow.', back: 'Charge has to come back to the source. Every circuit is a closed loop: out of one terminal, through the load, back into the other.' },
  { id: 'sweatroad', ch: 'flow', front: 'What does a sweat droplet between two traces do?', hook: 'Current takes the easy road — and sweat builds roads.', back: 'Salty water conducts. A bridge between two traces is a second path in parallel with your sensor, so part of the current skips it and the reading lies. That’s why traces get encapsulated.' },
  // 02 resist
  { id: 'longthin', ch: 'resist', front: 'R = ρL/A, as a rhyme', hook: 'Long and thin, resistance wins.', back: 'Resistance grows with length and shrinks with cross-section. Double the length, double the R. Double the cross-section, half the R. ρ is the material’s own share.' },
  { id: 'tex', ch: 'resist', front: 'ρ (Ω·m) vs Ω/m on a yarn datasheet', hook: 'Ω/m is the tex of conductivity.', back: 'Resistivity ρ is a material property, like fibre density in g/cm³. A yarn’s Ω/m bakes in how much conductor is in the cross-section, the way tex bakes in how much fibre is in a kilometre. Compare yarns by Ω/m; compare materials by ρ.' },
  { id: 'lanes', ch: 'resist', front: 'Ply two identical conductive yarns together. What happens to R?', hook: 'More lanes, less jam.', back: 'Side-by-side paths are in parallel: n equal paths give R ÷ n. Paths end to end are in series and add. A multifilament yarn is many lanes, which is also why a few broken filaments only nudge R up.' },
  { id: 'toll', ch: 'resist', front: 'Why does a conductive knit change resistance when you stretch it?', hook: 'Every contact is a toll booth.', back: 'Current hops loop to loop at points where yarns touch, and each touch adds contact resistance. Stretch pulls loops apart and changes how many touch and how hard. The same is true of snaps, crimps and connectors.' },
  { id: 'square', ch: 'resist', front: 'Double the current through a heater yarn. How much more heat?', hook: 'Heat goes with the square.', back: 'P = I²R. Twice the current, four times the heat. A thin or damaged spot in a series line carries the same current at higher R, so it runs hottest.' },
  { id: 'colder', ch: 'resist', front: 'Fixed 5 V battery. Make the heater line twice as long?', hook: 'At fixed voltage, longer is colder.', back: 'P = V²/R. A longer line has more R, so it draws less current and makes less heat in total. To cover a big panel at low voltage, run several shorter lines in parallel.' },
  // 03 metals
  { id: 'cats', ch: 'metals', front: 'The four best metallic conductors, in order', hook: 'Some Cats Get Angry — Ag, Cu, Au, Al.', back: 'Silver 1.59, copper 1.68, gold 2.44, aluminium 2.65 (×10⁻⁸ Ω·m). Silver and copper are within 6% of each other. Stainless steel is about 40× worse than copper.' },
  { id: 'silver', ch: 'metals', front: 'Silver: what it’s good for and how it fails', hook: 'Best conductor, kills microbes — turns black and walks in the wet.', back: 'Silver tarnishes to silver sulfide, which raises contact resistance. Under DC bias with moisture, silver ions migrate and grow dendrites that can short close traces. It’s still the default for skin electrodes and plated yarns.' },
  { id: 'copper', ch: 'metals', front: 'Why is textile copper never bare?', hook: 'Copper is always dressed — enamel, plating or alloy.', back: 'Nearly silver’s conductivity at a fraction of the price, but it oxidises, corrodes green in sweat, can stain skin and work-hardens until it snaps under flexing. Enamel insulates it; alloying with silver toughens it.' },
  { id: 'gold', ch: 'metals', front: 'Where does gold go?', hook: 'Gold goes where things touch.', back: 'Gold doesn’t tarnish, so a gold contact face keeps a stable, low contact resistance through thousands of connections. It’s too expensive for bulk, so it’s a thin plate, usually over a nickel barrier.' },
  { id: 'stainless', ch: 'metals', front: 'Stainless steel fibre: the trade', hook: 'The workhorse: washes forever, conducts like a tax.', back: 'A chromium-oxide skin heals itself, so it survives sweat and laundry. The price is about 40× copper’s resistivity, and it’s hard to solder. Good for durable traces, electrodes and heaters.' },
  { id: 'nickel', ch: 'metals', front: 'The rule for nickel', hook: 'Nickel near skin = itch.', back: 'Nickel is the most common contact allergen. It shows up as plating on snaps and as an underlayer beneath gold. Keep exposed nickel off skin.' },
  { id: 'galvanic', ch: 'metals', front: 'Two different metals touching in sweat', hook: 'Two metals + sweat = a battery; the less noble one pays.', back: 'Sweat is an electrolyte. The more active metal (copper next to silver, for example) gives up electrons and dissolves, so the joint corrodes from that side.' },
  { id: 'tcr', ch: 'metals', front: 'Heater wire vs thermometer wire', hook: 'Heaters want steady; thermometers want swingy.', back: 'Nichrome barely changes resistance as it heats, so its power stays predictable. Platinum (+0.385% per °C), copper (+0.39%) and nickel (+0.6%) change a lot and predictably, which is what a sensor wants. Constantan barely changes at all, which is why strain gauges use it.' },
  { id: 'carbon', ch: 'metals', front: 'Carbon in a smart textile', hook: 'Carbon senses, metals carry.', back: 'Carbon fibre conducts about a thousand times worse than copper, and carbon-filled polymers millions of times worse, and its resistance moves when it’s squeezed or stretched. That makes it a sensor or heater material, not wiring.' },
  { id: 'pedot', ch: 'metals', front: 'PEDOT:PSS', hook: 'Paint that conducts — and water is its enemy.', back: 'A conductive polymer you can coat, print or dye onto fibres. It’s soft and nearly invisible, but the PSS half drinks water, so humidity and washing degrade it.' },
  { id: 'enamel', ch: 'metals', front: 'Why enamel on a silver–copper alloy filament?', hook: 'Enamel lets lines cross; heat opens the door.', back: 'The thin polyurethane coat insulates, so two lines can cross without shorting and the wire can lie against skin. Soldering heat burns the enamel off only where you join it. Where two enamelled wires cross, the enamel is the gap of a tiny capacitor.' },
  // 04 sense
  { id: 'roadcanyon', ch: 'sense', front: 'Resistive vs capacitive, in one line', hook: 'R is a Road, C is a Canyon.', back: 'Resistive: current travels through the sensing material, and pressing adds lanes. Capacitive: an insulator stops the current, charge piles up on both rims, and pressing brings the rims closer so more charge fits.' },
  { id: 'cformula', ch: 'sense', front: 'C = εA/d — what raises capacitance?', hook: 'Bigger plates, better filling, smaller gap.', back: 'A is the overlap area, ε the material filling the gap (air 1, polyester about 3, water about 80), d the gap. Halve the gap, double the C.' },
  { id: 'bucket', ch: 'sense', front: 'How does a chip measure capacitance?', hook: 'C is a bucket: bigger bucket, longer to fill.', back: 'It charges the electrode through a known resistor and times how long the voltage takes to reach a threshold (t ∝ RC), or counts an oscillator’s frequency. More C, more time.' },
  { id: 'divider', ch: 'sense', front: 'How does a chip read a resistive sensor?', hook: 'Two resistors share the push in proportion.', back: 'Put the sensor in series with a fixed resistor across the supply and measure the voltage at the middle. The bigger resistor takes the bigger share, so as the sensor’s R falls its share of the voltage falls.' },
  { id: 'selfmutual', ch: 'sense', front: 'A finger approaches a capacitive electrode', hook: 'Self: you add. Mutual: you steal.', back: 'Self-capacitance: your body is an extra plate to ground, so the measured C goes up. Mutual capacitance: you intercept field lines between a transmit and a receive electrode, so the measured C between them goes down.' },
  { id: 'water', ch: 'sense', front: 'What does water do to each sensor type?', hook: 'Water fools C and shorts R.', back: 'Water’s permittivity is about 80, so a damp patch looks like a huge touch to a capacitive sensor. To a resistive one, sweat is a conductor that bridges the electrodes.' },
  { id: 'shield', ch: 'sense', front: 'Why do capacitive pads need a ground shield?', hook: 'Your body is a 100 pF giant next to a 1 pF sensor.', back: 'Two 2 cm × 2 cm plates 3 mm apart in air make about 1.2 pF. A body is around 100 pF to ground. Without a grounded layer between them, the sensor responds to your leg instead of the press.' },
  { id: 'remember', ch: 'sense', front: 'The weakness of resistive pressure sensors', hook: 'Polymers remember.', back: 'The carbon-loaded layer creeps under a steady load (drift) and reads differently on the way back down (hysteresis). Capacitive pads with a springy spacer drift far less.' },
  { id: 'switch', ch: 'sense', front: 'Two conductive fabrics with nothing between them', hook: 'No middle layer, no middle values.', back: 'Without the carbon layer, the electrodes either touch or they don’t. That’s a switch. The resistive layer is what turns force into a range of values.' },
  // 05 stack
  { id: 'base', ch: 'stack', front: 'Why print silver ink onto a TPU layer instead of straight onto fabric?', hook: 'Fabric is a sieve; TPU is a floor.', back: 'On bare fabric the ink wicks into the yarn gaps and breaks into islands. A laminated TPU base gives it a continuous surface, and a top TPU layer protects it from abrasion and washing.' },
  { id: 'pressure', ch: 'stack', front: 'What makes a dry EMG electrode quiet?', hook: 'Contact pressure is signal quality.', back: 'The skin under the electrode is part of the circuit. If contact shifts, the electrode-skin impedance changes and that change looks like signal (motion artefact). Compression holds the contact steady.' },
  { id: 'insulated', ch: 'stack', front: 'An EMG trace runs bare against the skin to its snap', hook: 'A bare trace is a second electrode.', back: 'It picks up signal along its whole length. Everything but the electrode window must be insulated.' },
  { id: 'heaterout', ch: 'stack', front: 'Why is there insulation outside a heater?', hook: 'Heat flows both ways.', back: 'Without an insulating layer outward, a large share of the heat goes to the outside air instead of to the body.' },
];

// ---------------------------------------------------------------------------------------------
// QUIZ. a = index of the right option. why = the explanation shown after answering.
// ---------------------------------------------------------------------------------------------
export const QUIZ = [
  // flow
  { id: 'q-drift', ch: 'flow', q: 'You switch on a circuit sewn in conductive thread. How fast does an individual electron in the yarn move?', o: ['Close to the speed of light', 'About walking pace', 'Slower than a snail — fractions of a millimetre a second', 'It doesn’t move at all'], a: 2, why: 'Drift velocity is tiny (about 0.07 mm/s in copper at 1 A per mm²). The push travels at a large fraction of light speed because the conductor is already full of electrons — marbles in a tube.' },
  { id: 'q-arrow', ch: 'flow', q: 'In a circuit diagram, the current arrow points…', o: ['from + to −, the opposite way to the electrons', 'from − to +, with the electrons', 'both ways', 'from the load to the battery'], a: 0, why: 'Conventional current is Franklin’s sign convention, kept for 250 years. Electrons leave the minus terminal; the arrow leaves the plus.' },
  { id: 'q-doubleV', ch: 'flow', q: 'Double the voltage across the same yarn. The current…', o: ['halves', 'stays the same', 'doubles', 'quadruples'], a: 2, why: 'I = V / R. Same fight, twice the push, twice the flow.' },
  { id: 'q-doubleR', ch: 'flow', q: 'Same battery, but the yarn’s resistance doubles. The current…', o: ['doubles', 'halves', 'stays the same', 'drops to zero'], a: 1, why: 'I = V / R. Twice the fight, half the flow.' },
  { id: 'q-sweat', ch: 'flow', q: 'A sweat droplet bridges two traces either side of a resistive sensor. The reading…', o: ['is unaffected, sweat is an insulator', 'is wrong — some current bypasses the sensor through the sweat', 'gets more accurate', 'stops because sweat blocks the current'], a: 1, why: 'Salty water conducts. It becomes a parallel path, so less of the current goes through the sensor and the reading drifts.' },
  { id: 'q-loop', ch: 'flow', q: 'You sew one conductive thread from the battery’s + to an LED and stop. The LED…', o: ['lights dimly', 'lights fully', 'doesn’t light — there’s no return path', 'lights only when touched'], a: 2, why: 'No loop, no flow. The current needs a path back to the − terminal.' },
  // resist
  { id: 'q-length', ch: 'resist', q: 'Same yarn, twice as long. Its resistance…', o: ['halves', 'stays the same', 'doubles', 'quadruples'], a: 2, why: 'R = ρL/A. Long and thin, resistance wins: R scales with length.' },
  { id: 'q-ply', ch: 'resist', q: 'You ply two identical conductive yarns together. The resistance of the plied yarn is…', o: ['double', 'the same', 'half', 'a quarter'], a: 2, why: 'Two equal paths side by side are in parallel: R ÷ 2. More lanes, less jam.' },
  { id: 'q-rho', ch: 'resist', q: 'Which number describes the MATERIAL, regardless of how thick the yarn is?', o: ['Ω per metre', 'Resistivity ρ in Ω·m', 'Total resistance in Ω', 'Current in A'], a: 1, why: 'ρ is the material property. Ω/m includes the cross-section — it’s the tex of conductivity.' },
  { id: 'q-knit', ch: 'resist', q: 'Why is a conductive knit’s resistance sensitive to stretch?', o: ['The metal itself gets longer and thinner', 'Stretch changes the loop-to-loop contacts the current has to cross', 'Stretching heats the yarn', 'It isn’t — knits are stable'], a: 1, why: 'The fibre barely strains. What changes is the number and pressure of contacts between loops, and every contact is a toll booth.' },
  { id: 'q-colder', ch: 'resist', q: 'A heater line runs from a 5 V battery. You make the line twice as long. Total heat…', o: ['doubles', 'stays the same', 'halves', 'quadruples'], a: 2, why: 'P = V²/R. At fixed voltage, longer is colder.' },
  { id: 'q-square', ch: 'resist', q: 'You double the current through the same heater yarn. Heat output…', o: ['doubles', 'quadruples', 'halves', 'stays the same'], a: 1, why: 'P = I²R. Heat goes with the square.' },
  { id: 'q-parallel', ch: 'resist', q: 'A high-Ω/m yarn has to heat a big panel from 5 V. The usual answer is…', o: ['one very long line', 'several shorter lines in parallel', 'a thinner yarn', 'a higher-resistance yarn'], a: 1, why: 'Parallel lines cover the area while keeping total R low enough for useful power at low voltage.' },
  { id: 'q-hotspot', ch: 'resist', q: 'A series heater line has one thinned, damaged section. That section runs…', o: ['colder', 'hotter', 'the same as the rest', 'with no current'], a: 1, why: 'In series the current is the same everywhere. The damaged section has more R, so it makes more I²R heat — a hot spot.' },
  // metals
  { id: 'q-rank', ch: 'metals', q: 'Rank by conductivity, best first:', o: ['Copper, silver, gold, aluminium', 'Silver, copper, gold, aluminium', 'Gold, silver, copper, aluminium', 'Silver, gold, copper, aluminium'], a: 1, why: 'Some Cats Get Angry: Ag, Cu, Au, Al.' },
  { id: 'q-plated', ch: 'metals', q: 'Why silver-PLATED nylon rather than solid silver yarn?', o: ['Plating conducts better than solid silver', 'Silver’s surface where the current flows, nylon’s strength, softness and price underneath', 'Solid silver can’t be drawn into wire', 'Nylon is conductive'], a: 1, why: 'A micron-thin silver shell carries the current; the nylon core makes it sewable, flexible and affordable.' },
  { id: 'q-gold', ch: 'metals', q: 'Why is gold used on connector contact faces?', o: ['It’s the best conductor', 'It doesn’t tarnish, so contact resistance stays low and stable', 'It’s magnetic', 'It’s cheaper than silver'], a: 1, why: 'Gold goes where things touch. It isn’t the best conductor (silver and copper are); it’s the most stable surface.' },
  { id: 'q-copperdressed', ch: 'metals', q: 'Why is copper in a garment almost always enamelled, plated or alloyed?', o: ['Bare copper is a poor conductor', 'It oxidises and corrodes in sweat, and work-hardens under flexing', 'It’s magnetic', 'It melts at body temperature'], a: 1, why: 'Copper is always dressed. The conductivity is excellent; the surface and fatigue life are the problems.' },
  { id: 'q-nickel', ch: 'metals', q: 'Which is the most common skin contact allergen?', o: ['Silver', 'Gold', 'Nickel', 'Titanium'], a: 2, why: 'Nickel near skin = itch. Watch for it in snap plating and as the barrier under gold.' },
  { id: 'q-steel', ch: 'metals', q: 'Stainless steel’s resistivity compared to copper’s is roughly…', o: ['the same', '2× higher', '40× higher', '1000× higher'], a: 2, why: 'About 7 × 10⁻⁷ against 1.7 × 10⁻⁸ Ω·m. Washes forever, conducts like a tax.' },
  { id: 'q-nichrome', ch: 'metals', q: 'Why do heaters use nichrome or stainless rather than copper?', o: ['They conduct better', 'Higher resistivity gives a useful R in a sensible length, and they resist oxidation when hot', 'They’re magnetic', 'Copper can’t carry current'], a: 1, why: 'Copper’s R is so low you’d need metres to make a few ohms. Nichrome also holds its R steady as it heats.' },
  { id: 'q-tcr', ch: 'metals', q: 'A yarn that measures temperature along a sleeve should have…', o: ['a resistance that stays put as temperature changes', 'a large, predictable change in resistance with temperature', 'the lowest resistivity possible', 'no metal in it'], a: 1, why: 'Heaters want steady; thermometers want swingy. Platinum, copper and nickel change about 0.4–0.6% per °C.' },
  { id: 'q-migration', ch: 'metals', q: 'Two silver traces sit close together under DC voltage in a humid garment. Over time they can…', o: ['become better insulated', 'grow silver dendrites across the gap and short', 'turn into silver chloride electrodes', 'nothing happens'], a: 1, why: 'Electrochemical migration: silver walks in the wet. Spacing and encapsulation prevent it.' },
  { id: 'q-galvanic', ch: 'metals', q: 'A copper trace touches a silver snap and both sit in sweat. What corrodes?', o: ['The silver', 'The copper', 'Neither', 'Both equally'], a: 1, why: 'Two metals plus an electrolyte make a battery. Copper is less noble than silver, so copper gives up electrons and dissolves.' },
  { id: 'q-solder', ch: 'metals', q: 'Why don’t you just solder silver-plated nylon thread to a board?', o: ['Silver won’t take solder', 'Nylon softens and melts around soldering temperatures', 'It’s magnetic', 'It’s too conductive'], a: 1, why: 'Nylon melts around 220–260 °C, close to solder. Crimp, sew, or use conductive adhesive.' },
  { id: 'q-pedot', ch: 'metals', q: 'PEDOT:PSS’s main weakness in a garment is…', o: ['stiffness', 'water — humidity and washing', 'magnetism', 'weight'], a: 1, why: 'Paint that conducts, and water is its enemy: the PSS half absorbs moisture and swells.' },
  // sense
  { id: 'q-core', ch: 'sense', q: 'The core difference between resistive and capacitive sensing:', o: ['Resistive uses metal, capacitive uses carbon', 'Resistive measures how easily current passes through a material; capacitive measures charge stored across an insulating gap', 'Capacitive needs pressure, resistive doesn’t', 'There is no difference'], a: 1, why: 'R is a Road, C is a Canyon.' },
  { id: 'q-halfgap', ch: 'sense', q: 'You press a capacitive pad and the gap halves. Capacitance…', o: ['halves', 'doubles', 'stays the same', 'drops to zero'], a: 1, why: 'C = εA/d. Smaller gap, more C.' },
  { id: 'q-area', ch: 'sense', q: 'Double the overlap area of the two electrodes. Capacitance…', o: ['halves', 'doubles', 'quadruples', 'stays the same'], a: 1, why: 'C = εA/d. Bigger plates, more C.' },
  { id: 'q-eps', ch: 'sense', q: 'Replace an air gap (ε ≈ 1) with a polyester film (ε ≈ 3) of the same thickness. Capacitance…', o: ['stays the same', 'triples', 'drops by a third', 'doubles'], a: 1, why: 'Better filling: C scales with ε.' },
  { id: 'q-touchless', ch: 'sense', q: 'Which can sense a hand hovering a couple of centimetres away?', o: ['Resistive', 'Capacitive', 'Both', 'Neither'], a: 1, why: 'A body is a conductor; its field changes the electrode’s capacitance without touching. Resistive needs contact and force.' },
  { id: 'q-measure', ch: 'sense', q: 'A capacitive sensor is typically read by…', o: ['a voltage divider', 'timing how long it takes to charge (or an oscillator’s frequency)', 'weighing it', 'its temperature'], a: 1, why: 'C is a bucket: bigger bucket, longer to fill.' },
  { id: 'q-mutual', ch: 'sense', q: 'In a mutual-capacitance touch sensor, a finger approaching makes the measured capacitance…', o: ['go up', 'go down', 'stay the same', 'flip sign'], a: 1, why: 'Self: you add. Mutual: you steal. The finger diverts field lines away from the receive electrode.' },
  { id: 'q-self', ch: 'sense', q: 'In a self-capacitance sensor, a finger approaching makes the measured capacitance…', o: ['go up', 'go down', 'stay the same', 'drop to zero'], a: 0, why: 'Self: you add. The body becomes extra plate area to ground.' },
  { id: 'q-water', ch: 'sense', q: 'Why does a sweaty or rain-soaked shirt confuse a capacitive sensor?', o: ['Water is an insulator', 'Water’s permittivity is about 80, so it looks like a huge change in the field', 'Water is magnetic', 'It doesn’t'], a: 1, why: 'Water fools C and shorts R.' },
  { id: 'q-shield', ch: 'sense', q: 'Why does a capacitive pressure pad on the thigh need a grounded shield layer?', o: ['To make it waterproof', 'The body’s ~100 pF swamps the sensor’s ~1 pF signal unless it’s blocked', 'To heat it', 'To make it stretch'], a: 1, why: 'Shield the sense plate so it only sees the press, not the leg.' },
  { id: 'q-drift', ch: 'sense', q: 'A known weakness of carbon-polymer resistive pressure sensors:', o: ['They can’t measure force', 'Drift under steady load and hysteresis', 'They need high voltage', 'They only work in the dark'], a: 1, why: 'Polymers remember.' },
  { id: 'q-switch', ch: 'sense', q: 'Two conductive fabrics with only an open mesh spacer between them (no carbon layer). Press it and you get…', o: ['a pressure sensor with a smooth range', 'an on/off switch', 'a capacitor', 'a heater'], a: 1, why: 'No middle layer, no middle values.' },
  { id: 'q-divider', ch: 'sense', q: 'Sensor and fixed resistor in series across 3.3 V; you read the voltage across the fixed resistor. Press the sensor (its R drops). The reading…', o: ['rises', 'falls', 'stays the same', 'goes negative'], a: 0, why: 'The sensor’s share of the push shrinks, so the fixed resistor’s share grows.' },
  { id: 'q-constantan', ch: 'sense', q: 'Strain gauges use constantan because…', o: ['it conducts best', 'its resistance barely changes with temperature, so heat doesn’t fake a strain', 'it’s cheapest', 'it’s magnetic'], a: 1, why: 'Heaters want steady; thermometers want swingy — and a strain gauge wants steady too.' },
  // stack
  { id: 'q-tpubase', ch: 'stack', q: 'Why does printed silver ink go on a TPU base layer instead of straight onto fabric?', o: ['TPU conducts', 'TPU gives a continuous surface; ink on bare fabric wicks and breaks up', 'For colour', 'TPU is cheaper than ink'], a: 1, why: 'Fabric is a sieve; TPU is a floor.' },
  { id: 'q-compress', ch: 'stack', q: 'Why do dry EMG garments use compression over the electrodes?', o: ['Warmth', 'A steady skin contact keeps impedance steady and cuts motion artefact', 'To stop sweating', 'Fashion'], a: 1, why: 'Contact pressure is signal quality.' },
  { id: 'q-baretrace', ch: 'stack', q: 'The trace from an EMG electrode to its snap is left bare against the skin. Result?', o: ['Nothing changes', 'It becomes part of the electrode and picks up signal from the wrong place', 'It heats up', 'The snap won’t close'], a: 1, why: 'A bare trace is a second electrode.' },
  { id: 'q-heaterins', ch: 'stack', q: 'Why does a heated jacket panel have insulation on the outer side of the heater?', o: ['To stop the heater shorting', 'So the heat goes toward the body instead of out to the air', 'For stiffness', 'To make it waterproof'], a: 1, why: 'Heat flows both ways.' },
];

// ---------------------------------------------------------------------------------------------
// METAL CARDS. stats 1-5 (5 = best for a garment). rho in ohm-metres (handbook, ~20 C).
// ---------------------------------------------------------------------------------------------
export const STATS = [
  ['conduct', 'Conducts'], ['sweat', 'Survives sweat'], ['skin', 'Skin-friendly'],
  ['cost', 'Affordable'], ['flex', 'Flexes'], ['join', 'Joinable'], ['wash', 'Washes'],
];
export const METALS = [
  { id: 'silver', name: 'Silver', sym: 'Ag', color: 'var(--st-silver)', rho: 1.59e-8, rhoNote: '1.59 × 10⁻⁸',
    stats: { conduct: 5, sweat: 3, skin: 5, cost: 2, flex: 4, join: 3, wash: 3 },
    meet: 'Plated on nylon or polyester yarn; skin electrodes; printed inks.', best: 'Lowest resistivity of any metal; antimicrobial; the standard for skin electrodes.', fails: 'Tarnishes (silver sulfide), wears off in the wash, migrates and shorts close traces in humid conditions.', hook: 'Best conductor, kills microbes — turns black and walks in the wet.' },
  { id: 'copper', name: 'Copper', sym: 'Cu', color: 'var(--st-copper)', rho: 1.68e-8, rhoNote: '1.68 × 10⁻⁸',
    stats: { conduct: 5, sweat: 2, skin: 2, cost: 5, flex: 2, join: 5, wash: 2 },
    meet: 'Enamelled magnet wire, tinsel wire, plated on yarns, inside flex circuits.', best: 'Within 6% of silver at a fraction of the price; solders easily.', fails: 'Oxidises, corrodes green in sweat, stains skin, work-hardens and snaps under repeated flexing.', hook: 'Copper is always dressed — enamel, plating or alloy.' },
  { id: 'agcu', name: 'Silver–copper alloy, enamelled', sym: 'AgCu', color: 'var(--st-copper)', rho: 1.8e-8, rhoNote: '≈ 1.8 × 10⁻⁸ (close to copper)',
    stats: { conduct: 5, sweat: 4, skin: 4, cost: 4, flex: 4, join: 4, wash: 4 },
    meet: 'Fine insulated filaments wrapped or twisted with textile yarn; woven grids where lines cross.', best: 'Alloying toughens copper against flex fatigue at a small cost in conductivity; the enamel insulates, so lines cross and lie on skin.', fails: 'The enamel must be removed (heat, solder) at every joint; nicked enamel can short.', hook: 'Enamel lets lines cross; heat opens the door.' },
  { id: 'gold', name: 'Gold', sym: 'Au', color: 'var(--st-gold)', rho: 2.44e-8, rhoNote: '2.44 × 10⁻⁸',
    stats: { conduct: 4, sweat: 5, skin: 5, cost: 1, flex: 3, join: 3, wash: 5 },
    meet: 'Thin plating on connector faces, pogo pins and snap contacts.', best: 'Doesn’t tarnish, so contact resistance stays low through thousands of connections.', fails: 'Cost; usually plated over a nickel barrier, which brings nickel back near the skin.', hook: 'Gold goes where things touch.' },
  { id: 'steel', name: 'Stainless steel', sym: 'SS', color: 'var(--st-steel)', rho: 7.2e-7, rhoNote: '≈ 7 × 10⁻⁷',
    stats: { conduct: 2, sweat: 5, skin: 4, cost: 4, flex: 4, join: 1, wash: 5 },
    meet: 'Staple fibre blended and spun, or continuous filament; sewing thread; heater yarn.', best: 'Self-healing chromium oxide skin: survives sweat and hundreds of washes. Fine fibre is tough.', fails: 'About 40× copper’s resistivity; very hard to solder; can feel scratchy.', hook: 'The workhorse: washes forever, conducts like a tax.' },
  { id: 'nickel', name: 'Nickel', sym: 'Ni', color: 'var(--st-nickel)', rho: 6.99e-8, rhoNote: '6.99 × 10⁻⁸',
    stats: { conduct: 3, sweat: 4, skin: 1, cost: 4, flex: 3, join: 3, wash: 4 },
    meet: 'Plating on snaps and magnets; the barrier layer under gold; nickel-coated fabrics for shielding.', best: 'Hard, corrosion-resistant plating; magnetic, so it shields low-frequency fields.', fails: 'The most common contact allergen.', hook: 'Nickel near skin = itch.' },
  { id: 'nichrome', name: 'Nichrome', sym: 'NiCr', color: 'var(--st-steel)', rho: 1.10e-6, rhoNote: '1.10 × 10⁻⁶',
    stats: { conduct: 1, sweat: 5, skin: 3, cost: 4, flex: 2, join: 1, wash: 4 },
    meet: 'Heating wire, often wrapped round a textile core.', best: 'High resistivity that barely changes as it heats; doesn’t oxidise even red-hot.', fails: 'Contains nickel; stiff; can’t be soldered with ordinary solder.', hook: 'Heaters want steady.' },
  { id: 'carbon', name: 'Carbon', sym: 'C', color: 'var(--st-carbon)', rho: 1.5e-5, rhoNote: '≈ 1.5 × 10⁻⁵ (fibre); far higher in polymer composites',
    stats: { conduct: 1, sweat: 5, skin: 4, cost: 4, flex: 3, join: 1, wash: 4 },
    meet: 'Carbon fibre heaters; carbon-black-loaded fibres, coatings and films for sensing.', best: 'Resistance that changes with squeeze and stretch (piezoresistive); inert; good heater material.', fails: 'Far too resistive for wiring; black; composites drift and show hysteresis.', hook: 'Carbon senses, metals carry.' },
  { id: 'pedot', name: 'PEDOT:PSS', sym: 'PEDOT', color: 'var(--st-pedot)', rho: 1e-5, rhoNote: '≈ 10⁻⁵ at best; often 100× higher',
    stats: { conduct: 1, sweat: 2, skin: 4, cost: 3, flex: 5, join: 1, wash: 1 },
    meet: 'Dip-coated, printed or dyed onto fibres and fabrics.', best: 'Soft, light, nearly transparent; conducts both electrons and ions, which suits skin electrodes.', fails: 'Humidity and washing; conductivity varies a lot with processing.', hook: 'Paint that conducts — and water is its enemy.' },
];

// ---------------------------------------------------------------------------------------------
// PICK THE METAL. Each option scores 2 (the right call), 1 (works, with a trade) or 0 (wrong).
// ---------------------------------------------------------------------------------------------
export const PICK_METAL = [
  { id: 'pm-emg', prompt: 'A dry EMG electrode on the forearm, worn all day against skin.', o: [
    ['silver', 2, 'Low skin impedance, antimicrobial, the standard for textile electrodes.'],
    ['steel', 1, 'Works and lasts, but higher skin-contact impedance means a noisier signal.'],
    ['copper', 0, 'Corrodes in sweat and can stain skin green.'],
    ['nickel', 0, 'The most common contact allergen, worn all day on skin.']] },
  { id: 'pm-heat', prompt: 'A heating zone in a ski glove, run from a 5 V battery.', o: [
    ['steel', 2, 'Enough resistance to make a few ohms in a sensible length; survives sweat and washing.'],
    ['carbon', 2, 'Common in heated apparel: high, stable resistance and inert.'],
    ['silver', 1, 'Works, but its low Ω/m means long lines to get a useful R, and the plating wears.'],
    ['copper', 0, 'Resistance so low you’d need metres of it; and it corrodes.']] },
  { id: 'pm-cross', prompt: 'Rows and columns in a woven grid that have to cross each other without shorting.', o: [
    ['agcu', 2, 'The enamel insulates at every crossing; strip it only at the connection points.'],
    ['silver', 1, 'Only with a separate insulating layer or coating at each crossing.'],
    ['steel', 0, 'Bare: every crossing is a short.'],
    ['pedot', 0, 'Bare and conductive: every crossing is a short, and it won’t carry signal far.']] },
  { id: 'pm-snap', prompt: 'The contact face of a snap that’s clicked on and off hundreds of times.', o: [
    ['gold', 2, 'Doesn’t tarnish, so contact resistance stays low and stable.'],
    ['nickel', 1, 'Hard-wearing and common; fine where it doesn’t touch skin.'],
    ['silver', 1, 'Conducts well but tarnishes, so contact resistance creeps up.'],
    ['copper', 0, 'Oxidises quickly; contact resistance climbs.']] },
  { id: 'pm-temp', prompt: 'A yarn that measures temperature along a sleeve by its resistance.', o: [
    ['nickel', 2, 'About +0.6% R per °C, large and predictable (keep it insulated off skin).'],
    ['copper', 2, 'About +0.39% R per °C; enamelled copper wire makes a good sensing yarn.'],
    ['carbon', 1, 'Its R moves with temperature, but non-linearly, and moisture and strain move it too.'],
    ['nichrome', 0, 'Built for the opposite: its R barely changes with temperature.']] },
  { id: 'pm-sheer', prompt: 'A soft, nearly invisible conductive finish on a sheer fabric.', o: [
    ['pedot', 2, 'A thin polymer coat keeps the hand and the transparency.'],
    ['silver', 1, 'Conducts far better but greys or silvers the fabric.'],
    ['carbon', 0, 'Turns it black.'],
    ['steel', 0, 'A fibre, not a finish; it changes the hand.']] },
  { id: 'pm-wash', prompt: 'Everyday wiring in a garment that will go through the wash fifty times.', o: [
    ['steel', 2, 'The chromium-oxide skin survives detergent, water and abrasion.'],
    ['agcu', 2, 'Enamelled, so the metal is sealed; protect it from sharp folds.'],
    ['silver', 1, 'Works, but plating wears and tarnishes over many washes.'],
    ['pedot', 0, 'Washing degrades it.']] },
  { id: 'pm-strain', prompt: 'A stretchy strain sensor across the elbow.', o: [
    ['carbon', 2, 'Carbon-loaded elastomer or yarn: resistance changes strongly with stretch.'],
    ['silver', 1, 'A silver-plated stretch knit works through its loop contacts; smaller signal.'],
    ['copper', 0, 'Doesn’t stretch; fatigues and snaps.'],
    ['gold', 0, 'A contact plating, not a stretch sensor.']] },
];

// ---------------------------------------------------------------------------------------------
// WHICH SENSOR? answer R, C or E (either works).
// ---------------------------------------------------------------------------------------------
export const WHICH_SENSOR = [
  { id: 'ws-sock', prompt: 'A sock that maps how hard each part of the foot presses during a stride.', a: 'R', why: 'High forces, a cheap grid, contact is guaranteed: a resistive matrix is the classic choice. (Capacitive grids exist too, at more cost.)' },
  { id: 'ws-swipe', prompt: 'A sleeve you swipe like a touchscreen, without pressing hard.', a: 'C', why: 'Your finger changes the field without needing force. That’s capacitive, the same as a phone.' },
  { id: 'ws-hover', prompt: 'Detecting a hand hovering 2 cm above a cushion.', a: 'C', why: 'Only capacitive can sense without touch.' },
  { id: 'ws-feather', prompt: 'Registering a touch as light as a feather.', a: 'C', why: 'Resistive needs enough force to change the contacts; capacitive responds to presence.' },
  { id: 'ws-grip', prompt: 'Measuring grip force in a work glove, from a light hold to 50 N.', a: 'R', why: 'Large forces and a direct force-to-resistance curve suit resistive pressure sensing.' },
  { id: 'ws-wet', prompt: 'Seat occupancy where someone in a soaking wet swimsuit sits down.', a: 'R', why: 'Water fools C. A sealed resistive pad cares about weight, not wetness.' },
  { id: 'ws-drift', prompt: 'A pressure reading that mustn’t drift over an eight-hour shift.', a: 'C', why: 'Polymers remember: carbon-polymer resistive layers creep. A capacitive pad with a springy spacer is far more stable.' },
  { id: 'ws-knee', prompt: 'Tracking knee bend in a legging.', a: 'E', why: 'A resistive strain yarn is simplest; a capacitive stretch sensor (two electrode layers on an elastomer) is more stable. Both are used.' },
  { id: 'ws-breath', prompt: 'A breathing band around the chest.', a: 'E', why: 'Resistive or capacitive strain both work: the band only has to measure stretch.' },
  { id: 'ws-worn', prompt: 'Knowing whether a shirt is on a body at all.', a: 'C', why: 'Skin nearby adds capacitance, with no pressure needed.' },
];

// ---------------------------------------------------------------------------------------------
// STACK-UPS. Layers listed in their true order, from `from` to `to`. kind drives the drawing:
// fabric | conductor | sense | dielectric | insulation | skin | pod | core | wire | shield.
// group: layers with the same group are interchangeable in the order game.
// ---------------------------------------------------------------------------------------------
export const STACKS = [
  { id: 'resistive', name: 'Resistive pressure pad', from: 'top', to: 'bottom', current: 'through', layers: [
    { name: 'Cover fabric', kind: 'fabric', role: 'Spreads the load and protects the sensor.', fails: 'Without it, a sharp point loads one spot and wears it through.' },
    { name: 'Top electrode', kind: 'conductor', mat: 'silver', role: 'Silver-plated knit: one terminal.', fails: 'Misaligned with the bottom electrode, it leaves dead zones.' },
    { name: 'Piezoresistive layer', kind: 'sense', mat: 'carbon', role: 'Carbon-loaded film or coated nonwoven. Squeeze it and more conductive paths connect, so R falls.', fails: 'Remove it and the electrodes touch directly: a switch, not a sensor.' },
    { name: 'Bottom electrode', kind: 'conductor', mat: 'silver', role: 'The other terminal. Current crosses the stack top to bottom.', fails: '' },
    { name: 'Encapsulation', kind: 'insulation', role: 'TPU film or laminate: keeps sweat out and the layers registered.', fails: 'Sweat bridges the electrodes at the edges: current takes the easy road.' },
  ] },
  { id: 'capacitive', name: 'Capacitive pressure pad', from: 'top', to: 'bottom', current: 'across', layers: [
    { name: 'Cover fabric', kind: 'fabric', role: 'Comfort and protection.', fails: '' },
    { name: 'Ground electrode', kind: 'shield', mat: 'silver', role: 'The top plate, held at ground, so it also shields the sense plate from a hand or leg above.', fails: 'Without a grounded outer plate, the body’s capacitance swamps the reading.' },
    { name: 'Spacer fabric', kind: 'dielectric', role: 'The gap d. A 3D spacer knit or foam that compresses under load and springs back.', fails: 'A spacer that takes a set (stays crushed) shifts the zero.' },
    { name: 'Sense electrode', kind: 'conductor', mat: 'silver', role: 'The bottom plate the chip measures. Closer to the ground plate, more C.', fails: '' },
    { name: 'Insulating film', kind: 'insulation', role: 'Separates the sense plate from the shield below.', fails: 'Without it, the sense plate shorts to the shield.' },
    { name: 'Ground shield', kind: 'shield', mat: 'silver', role: 'Blocks the body on the skin side.', fails: 'Without it, the leg underneath reads as pressure.' },
  ] },
  { id: 'emg', name: 'Dry EMG electrode', from: 'outside', to: 'skin', current: 'through', layers: [
    { name: 'Electronics pod', kind: 'pod', role: 'Amplifier and ADC. It sits as close to the electrode as it can, because microvolt signals pick up noise on long traces.', fails: '' },
    { name: 'Snap', kind: 'conductor', mat: 'gold', role: 'The mechanical and electrical joint through the fabric.', fails: 'A loose or tarnished snap adds a noisy contact resistance.' },
    { name: 'Compression fabric', kind: 'fabric', role: 'Holds the electrode against the skin with steady pressure.', fails: 'Loose fit: contact shifts with movement and the change reads as signal (motion artefact).' },
    { name: 'Silver-plated electrode', kind: 'conductor', mat: 'silver', role: 'The knit window that touches skin. Dense, so it has plenty of contact points.', fails: 'Tarnished or worn plating raises skin-contact impedance.' },
    { name: 'Skin', kind: 'skin', role: 'The signal source. Sweat lowers the contact impedance over the first minutes.', fails: '' },
  ] },
  { id: 'heater', name: 'Heated panel', from: 'outside', to: 'skin', current: 'along', layers: [
    { name: 'Shell fabric', kind: 'fabric', role: 'Wind and abrasion.', fails: '' },
    { name: 'Insulation', kind: 'fabric', role: 'Batting or fleece: sends the heat inward.', fails: 'Without it, much of the heat goes to the outside air.' },
    { name: 'TPU film', kind: 'insulation', group: 'tpu', role: 'Seals the heater from moisture and insulates it electrically.', fails: '' },
    { name: 'Heater yarn', kind: 'wire', mat: 'steel', role: 'Stainless, carbon or silver yarn laid in a serpentine. P = V²/R; a thermistor beside it lets the controller cut power.', fails: 'A thinned or damaged spot runs hottest: heat goes with the square.' },
    { name: 'TPU film', kind: 'insulation', group: 'tpu', role: 'Seals the heater on the skin side.', fails: 'Without it, sweat reaches the heater and the conductor reaches skin.' },
    { name: 'Lining', kind: 'fabric', role: 'Spreads the heat and feels soft on skin.', fails: '' },
  ] },
  { id: 'printed', name: 'Printed trace', from: 'top', to: 'fabric', current: 'along', layers: [
    { name: 'TPU top coat', kind: 'insulation', role: 'Protects the ink from abrasion, sweat and washing.', fails: 'Without it, ink rubs off and cracks open in the wash.' },
    { name: 'Silver ink trace', kind: 'wire', mat: 'silver', role: 'Silver flakes in a stretchable binder; current flows flake to flake.', fails: 'Stretch it past its limit and the flakes separate: R climbs, then the trace opens.' },
    { name: 'TPU base layer', kind: 'insulation', role: 'Laminated first, so the ink lands on a continuous surface.', fails: 'Fabric is a sieve: ink on bare fabric wicks into the gaps and breaks up.' },
    { name: 'Fabric', kind: 'fabric', role: 'The garment.', fails: '' },
  ] },
  { id: 'hybrid', name: 'Enamelled Ag–Cu hybrid yarn', from: 'centre', to: 'outside', current: 'along', layers: [
    { name: 'Core yarn', kind: 'core', role: 'Polyester or elastane: carries the load and gives stretch.', fails: '' },
    { name: 'Ag–Cu alloy filament', kind: 'wire', mat: 'copper', role: 'Wrapped round the core in a helix, so it unwinds instead of stretching when the yarn is pulled.', fails: 'Wrapped too tightly, it has no slack and fatigues.' },
    { name: 'Enamel', kind: 'insulation', role: 'Microns of polyurethane on the filament: lines can cross, and at a crossing it’s a capacitor gap.', fails: 'Nicked enamel shorts at crossings.' },
    { name: 'Cover wrap', kind: 'fabric', role: 'Textile yarn wrapped over everything: hand, colour and abrasion protection.', fails: 'Without it the wire wears through its enamel on rubbing.' },
  ] },
];

// ---------------------------------------------------------------------------------------------
// MORE ON EACH CARD. explain = the line spelled out, word by word, against the physics it stands
// for. alts = other ways to hold the same idea: [kind, text]. cloze = the words blanked out when the
// card is played as "Type the line" (each must appear in the hook as a whole word).
// ---------------------------------------------------------------------------------------------
export const CARD_MORE = {
  ohm: { explain: 'Read it as V = I × R. Push is voltage: how hard the battery shoves. Flow is current: how much charge gets through each second. Fight is resistance: how hard the path pushes back. To keep the same flow through a bigger fight, you need a bigger push.',
    alts: [['Picture', 'A garden hose. The tap is V, the water coming out is I, your thumb pinching the end is R. Pinch harder and less comes out, unless you open the tap further.'], ['Triangle', 'Write V on top, I and R side by side underneath. Cover the one you want: cover V and you see I × R; cover I and you see V over R; cover R and you see V over I.']],
    cloze: ['Flow', 'Fight'] },
  arrow: { explain: 'Electrons are negative, so the battery’s minus end pushes them away and its plus end pulls them in: they leave the minus. The arrow drawn on circuit diagrams (conventional current) was decided before electrons were known, and it starts at the plus. Same circuit, described in two opposite directions.',
    alts: [['Rule', 'Like charges repel: the minus terminal shoves the negative electrons out.'], ['Story', 'Franklin guessed the direction in the 1740s and guessed wrong about what was moving. Nobody redrew the arrows.']],
    cloze: ['minus', 'plus'] },
  marbles: { explain: 'Each marble is an electron and the tube is the wire, already packed full. Push one marble in at one end and one drops out the other end immediately, though each marble only moved one place. The push travels fast; the electrons themselves barely move.',
    alts: [['Picture', 'A queue of people standing shoulder to shoulder: shove the back one and the front one stumbles at once, but nobody walked anywhere.'], ['Numbers', 'Electron drift: about 0.07 mm a second, slower than a snail. The push: a large fraction of the speed of light.']],
    cloze: ['marbles', 'once'] },
  loop: { explain: 'Current is charge going round. If there’s no path back to the battery the charge has nowhere to go, so nothing moves, even though the thread touches the plus terminal. One path out, one path back.',
    alts: [['Picture', 'A racetrack, not a dead-end road: cars only keep moving if the track comes back to the start.'], ['Check', 'Trace it with a finger from +, through the LED, back to − without lifting. If you can’t, it won’t light.']],
    cloze: ['loop', 'flow'] },
  sweatroad: { explain: 'Current splits between every path available, and more of it takes the easier (lower-resistance) one. Salty sweat between two traces opens a new easy path around your sensor, so part of the current skips the sensor and the reading is wrong.',
    alts: [['Picture', 'Traffic pouring off a jammed highway the moment a side street opens.'], ['Rule', 'Sweat is a resistor you didn’t design, in parallel with the one you did.']],
    cloze: ['easy', 'roads'] },
  longthin: { explain: 'R = ρL/A. Long means a bigger L, so more R. Thin means a smaller A (cross-section), so more R. A long, thin yarn has the most resistance: resistance “wins”. Short and thick has the least.',
    alts: [['Picture', 'Drinking through a long, thin straw is harder than through a short, fat one.'], ['Formula in words', 'Length on top, area underneath: longer multiplies, thicker divides.']],
    cloze: ['thin', 'wins'] },
  tex: { explain: 'Tex is grams per 1,000 m: it says how much fibre a yarn carries, not what the fibre is. Ω/m does the same job for conductivity: it already includes how much conductor is in the cross-section, so it’s the number for comparing two yarns. ρ (Ω·m) is the material itself, like fibre density: it’s the number for comparing silver with steel.',
    alts: [['Units', 'Ω/m, with a slash, is per metre of THIS yarn. Ω·m, with a dot, is the material.'], ['Check', 'If plying two yarns together would change the number, it’s a yarn number (Ω/m). If nothing you do to the yarn can change it, it’s a material number (ρ).']],
    cloze: ['tex'] },
  lanes: { explain: 'Two yarns side by side are two lanes for the same traffic. The current splits between them, so the pair resists half as much as one alone: n equal lanes, R divided by n. End to end, they’re one longer road and the resistances add.',
    alts: [['Rhyme', 'Side by side, divide. End to end, add.'], ['Picture', 'Supermarket checkouts: open a second till and the wait halves.']],
    cloze: ['lanes', 'jam'] },
  toll: { explain: 'Every place the current has to jump from one yarn to another (loop to loop, filament to filament, a snap) adds a little resistance, the way every toll booth adds a stop. Stretch a knit and loops pull apart: how many contacts there are and how hard they press both change, so the total resistance changes. That change is the sensor.',
    alts: [['Picture', 'Stepping stones across a stream: pull them apart and it’s harder to cross.'], ['Rule', 'The metal barely stretches; the contacts do the sensing.']],
    cloze: ['contact', 'toll'] },
  square: { explain: '“The square” is the current squared. Power, which becomes heat, is P = I²R. Double the current and the heat goes up 2 × 2 = 4 times; triple it and it’s 9 times. A small rise in current makes a big rise in heat.',
    alts: [['Numbers', '2× the current → 4× the heat. 3× → 9×.'], ['Where it bites', 'In a series line every part carries the same current, so a thinner or damaged spot, with more R, is where the extra heat goes: the hot spot.']],
    cloze: ['square'] },
  colder: { explain: 'A battery holds the voltage fixed, and then power is P = V²/R. A longer yarn has more R, so it pulls less current and makes less heat overall. It feels backwards: more heating wire sounds like more heat.',
    alts: [['Contrast', 'Fixed current: longer is hotter (I²R). Fixed voltage: longer is colder (V²/R). A battery fixes the voltage.'], ['The fix', 'Big panel, low voltage? Cut the line into shorter pieces and run them side by side.']],
    cloze: ['longer', 'colder'] },
  cats: { explain: 'The first letters, S C G A, are the four best metallic conductors in order: Silver (Ag), Copper (Cu), Gold (Au), Aluminium (Al). Best first.',
    alts: [['Story', 'Silver is best but tarnishes; copper is nearly as good and cheap; gold is third but never tarnishes; aluminium is light but hard to join.'], ['Numbers', '1.59, 1.68, 2.44, 2.65 × 10⁻⁸ Ω·m. Silver and copper are only 6% apart.']],
    cloze: ['Cu', 'Au'] },
  silver: { explain: 'Best conductor: the lowest resistivity of any metal. Kills microbes: silver ions are antimicrobial, which suits skin. Turns black: it tarnishes to silver sulfide. Walks in the wet: with moisture and a DC voltage, silver ions drift across a gap and regrow as needles that can short two traces.',
    alts: [['Two columns', 'Good: conducts, antimicrobial, skin-friendly. Bad: tarnish, wears off, migrates.'], ['Picture', 'A silver spoon: bright when new, black after a year in the drawer.']],
    cloze: ['black', 'wet'] },
  copper: { explain: 'Copper conducts almost as well as silver and costs far less, but bare it oxidises, turns green in sweat, can stain skin and gets brittle when flexed. So in a garment it always wears something: an enamel coat, a plating, or an alloy with silver.',
    alts: [['Picture', 'The Statue of Liberty: copper left bare outdoors turns green.'], ['Rule', 'Bare copper never touches skin or sweat.']],
    cloze: ['dressed'] },
  gold: { explain: 'Gold doesn’t tarnish, so where two parts meet and separate again (a snap, a connector, a pogo pin) the contact stays clean and low-resistance. It’s expensive, so it’s a thin plating on the touching faces only.',
    alts: [['Rhyme', 'Gold on the contact, not on the run.'], ['Picture', 'The gold edge on a computer card: exactly the part that plugs in.']],
    cloze: ['touch'] },
  stainless: { explain: 'Workhorse: it does the hard, dull job reliably. Washes forever: a chromium-oxide skin re-forms if scratched, so sweat and laundry don’t eat it. Conducts like a tax: you pay a resistance penalty for that toughness, about 40 times copper’s resistivity.',
    alts: [['One line', 'Tough, but resistive.'], ['Picture', 'A steel kitchen sink: survives everything, and nobody would wire a house with it.']],
    cloze: ['workhorse', 'tax'] },
  nickel: { explain: 'Nickel is the metal most likely to give skin an itchy rash (contact allergy). It hides in snaps and in the layer under gold plating, so check anything that touches skin.',
    alts: [['Picture', 'The itchy mark a cheap belt buckle or earring leaves.'], ['Rule', 'Nickel under gold, sealed, is fine; nickel on skin is not.']],
    cloze: ['itch'] },
  galvanic: { explain: 'Two different metals in a salty liquid make a battery: electrons flow from the more active metal to the more noble one. The active metal (copper, next to silver) loses atoms into the sweat as ions, so it’s the side that corrodes. The noble one is fine.',
    alts: [['Picture', 'A lemon battery: two different metals in a lemon light an LED, and one of them slowly gets eaten.'], ['Rule', 'Same metal on both sides of a joint, or seal the joint from sweat.']],
    cloze: ['battery', 'pays'] },
  tcr: { explain: 'A heater wants its resistance to stay put as it warms, so its power stays where you designed it: nichrome. A temperature sensor wants its resistance to change a lot, and predictably, so the change reads as degrees: nickel, copper, platinum.',
    alts: [['Shape', 'Flat line for heating, steep line for sensing.'], ['Picture', 'On the temperature plot, nichrome lies flat and nickel climbs.']],
    cloze: ['steady', 'swingy'] },
  carbon: { explain: 'Carbon conducts far worse than metal, so it makes poor wiring. But its resistance moves when it’s pressed or stretched, and it doesn’t corrode. So carbon goes where you want to sense (or heat), and metal carries the signal to the electronics.',
    alts: [['Job titles', 'Carbon is the sensor; metal is the cable.'], ['Picture', 'A pencil line conducts, badly. Press on it or draw it thicker and the reading changes.']],
    cloze: ['senses', 'carry'] },
  pedot: { explain: 'PEDOT:PSS is a conductive plastic you can coat or print like paint. The PSS half loves water, so humidity and washing swell it and wash it out, and its conductivity drops.',
    alts: [['Rule', 'Seal it, or keep it dry.'], ['Picture', 'Watercolour: lovely until it gets wet.']],
    cloze: ['Paint', 'water'] },
  enamel: { explain: 'Enamel is a thin insulating coat. Lines can cross: two coated wires touch without shorting. Heat opens the door: a soldering iron burns the enamel off only where you want a connection.',
    alts: [['Picture', 'The coils of a toy motor touch each other everywhere and still work: they’re enamelled.'], ['Bonus', 'Where two enamelled wires cross, the two coats are the gap of a tiny capacitor: a touch point.']],
    cloze: ['cross', 'heat'] },
  roadcanyon: { explain: 'Road: in a resistive sensor, current travels through the material, and pressing adds more paths, so resistance falls. Canyon: in a capacitive sensor, an insulating gap stops the current; charge gathers on both edges, and pressing narrows the canyon so more fits, so capacitance rises.',
    alts: [['Question', 'Does current cross the middle layer? Yes: resistive. No: capacitive.'], ['Pairs', 'Resistive: press, R down. Capacitive: press, C up.']],
    cloze: ['Road', 'Canyon'] },
  cformula: { explain: 'C = εA/d. Bigger plates (A, the overlap area) hold more charge. Better filling (ε, what’s in the gap: air 1, polyester about 3, water about 80) holds more. A smaller gap (d) holds more. Halve the gap, double the C.',
    alts: [['Formula shape', 'Area and filling on top, gap underneath.'], ['Check', 'Anything that lets the plates “see” more of each other raises C: bigger, closer, better stuff between.']],
    cloze: ['plates', 'gap'] },
  bucket: { explain: 'The chip fills the sensor with charge through a resistor, like filling a bucket from a tap, and times how long it takes to reach a set level. More capacitance is a bigger bucket, so it takes longer. Longer time means more C, which means a touch or a press.',
    alts: [['Formula', 'Time ∝ R × C: same tap (R), bigger bucket (C), longer wait.'], ['Picture', 'Two buckets under the same tap: the wide one fills slower.']],
    cloze: ['bucket', 'longer'] },
  divider: { explain: 'Put the sensor and a fixed resistor in a line across the supply. The supply voltage is shared between them, each taking a share in proportion to its resistance. The chip measures the voltage at the point between them. When the sensor’s resistance changes, the shares change, and so does the reading.',
    alts: [['Picture', 'Two people splitting a bill by what they ate: whoever ate more pays more.'], ['Numbers', '3.3 V across a 20 kΩ sensor and a 10 kΩ resistor: the fixed one gets 10/30 of it, 1.1 V.']],
    cloze: ['share', 'proportion'] },
  selfmutual: { explain: 'Self-capacitance measures one electrode against ground. Your finger is a conductor connected to ground through your body, so it adds plate: C goes up. Mutual capacitance measures between two electrodes. Your finger soaks up some of the field that would have reached the second one: C goes down.',
    alts: [['Rule', 'One electrode: up. Two electrodes: down.'], ['Picture', 'Self: you join the conversation. Mutual: you intercept the message.']],
    cloze: ['add', 'steal'] },
  water: { explain: 'Water’s permittivity is about 80 (air is 1), so a wet patch on a capacitive sensor looks like a huge touch: it fools it. Salty water conducts, so on a resistive sensor it bridges the electrodes and makes a shortcut: it shorts it.',
    alts: [['Pairs', 'C: a false touch. R: a false low reading.'], ['Fixes', 'C needs a waterproof layer and smarter thresholds; R needs sealing at the edges.']],
    cloze: ['fools', 'shorts'] },
  shield: { explain: 'A small textile capacitive pad is about 1 pF. Your body is about 100 times bigger, around 100 pF to ground. With nothing grounded between your leg and the pad, the pad “sees” your leg move and reads it as pressure. A grounded shield layer blocks that.',
    alts: [['Picture', 'Trying to hear a whisper next to a loudspeaker.'], ['Rule', 'A grounded layer between the sensor and the body.']],
    cloze: ['100', '1'] },
  remember: { explain: 'The polymer in a resistive pressure layer slowly squashes under a steady load (creep), so the reading drifts, and it reads differently on the way down than on the way up (hysteresis). It “remembers” how it was pressed.',
    alts: [['Picture', 'Memory foam: press it and it takes a while to come back.'], ['Contrast', 'A springy spacer (capacitive) forgets; a carbon polymer (resistive) remembers.']],
    cloze: ['remember'] },
  switch: { explain: 'Two conductive fabrics have only two states: touching or not. The carbon layer between them is what lets the resistance slide gradually with force, giving a range of readings instead of on or off.',
    alts: [['Picture', 'A doorbell button against a dimmer switch.'], ['Rule', 'Take out the middle layer and a pressure sensor becomes a button.']],
    cloze: ['layer', 'values'] },
  base: { explain: 'Fabric is full of holes between the yarns: ink printed onto it soaks in and breaks into islands that don’t connect, like water through a sieve. A TPU film laminated on first gives the ink a smooth, continuous surface to sit on: a floor.',
    alts: [['Picture', 'Painting a line on a mesh screen against painting it on paper.'], ['Order', 'Floor, ink, lid: TPU base, silver trace, TPU top coat.']],
    cloze: ['sieve', 'floor'] },
  pressure: { explain: 'The skin and the electrode are part of the measuring circuit. If the electrode slides or lifts, the skin contact changes and the amplifier sees that change as signal (motion artefact). Steady pressure from compression fabric keeps the contact, and the signal, steady.',
    alts: [['Picture', 'A stethoscope pressed firmly against one held loosely: the loose one hears rubbing.'], ['Rule', 'Tight and still beats loose and moving.']],
    cloze: ['pressure', 'quality'] },
  insulated: { explain: 'An uncoated trace touching skin picks up the body’s electrical activity all along its length, not only at the electrode, so the signal becomes a mix from everywhere it touches. Insulate everything except the electrode window.',
    alts: [['Picture', 'A microphone cable with a split in its shielding picks up hum.'], ['Rule', 'Only the electrode touches skin.']],
    cloze: ['bare', 'second'] },
  heaterout: { explain: 'Heat leaves the heater in both directions: toward the body and away into the air. An insulating layer on the outside sends more of it to the body.',
    alts: [['Picture', 'A hot-water bottle with a towel wrapped round the outside.'], ['Rule', 'Insulate outward, not inward.']],
    cloze: ['both'] },
};
