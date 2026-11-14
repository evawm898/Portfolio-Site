# Smart Textiles audit: Field Notes No. 09 and its study session

Phase 1 of the audit, with no code changes. It covers `smart-textiles.html` (the note) and `smart-textiles-study.html` (the study session, #558), audited at `9319e38`.

**How it was done.** Both pages were driven in Chromium at 1280 × 900 and 390 × 844, start to finish. Every game was played, every widget was put in its wrong-answer state, and rendered text, tap-target and overflow sizes were measured.

The data files were read in Node:

- `smart-textiles-study-data.js` (49 cards, 56 check questions, 9 metal cards, 8 Pick the Metal scenarios, 10 Which Sensor scenarios, 6 stacks);
- `smart-textiles-study-hard.js` (36 arrow items, 20 number generators, 6 orders, 7 lab challenges).

Every number on both pages was checked against a handbook, datasheet or paper; the sources are in §5.

All three existing gates pass on this tree:

- `tools/smart-textiles/verify-page.mjs`;
- `verify-study.mjs`;
- `tools/verify-site-palette.mjs`.

**Contact sheet:** `docs/img/smart-textiles-audit.png`. Its captions use the codes below (P = pedagogy, A = accuracy, M = mobile, N = navigation, C = consistency).

---

## 1. Pedagogy and the games

### P1. The check questions can be answered without reading them. (High)

- **Option order is fixed.** `questionHTML()` (`smart-textiles-study.js:192`) renders `q.o` in data order and never shuffles it. Pick the Metal, Which Sensor, the stack pile and Put It in Order all shuffle; the chapter checks and the mixed round do not.
- **The answer is nearly always B.** Over the 56 check questions the right answer is A 5 times, **B 39 times (70%)**, C 11 times and D once. A learner who always picks B scores 70%.
- **The answer is usually the longest option.** It is the longest on **32 of 56** questions, and usually the only one with a reason attached ("It doesn't tarnish, so contact resistance stays low and stable" against "It's magnetic").
- **Nine questions carry a throwaway distractor** that no learner would pick: "It's magnetic" (five times), "Fashion", "They only work in the dark", "weighing it", "It melts at body temperature". That leaves two or three live options.

### P2. A wrong answer is marked, not taught. (High)

- A wrong pick shows `✕ It's C.` and then the right answer's explanation. Nothing addresses the misconception that made the wrong option attractive.
- **21 of the 56 explanations are under 45 characters**, and most of those only restate the mnemonic: "R is a Road, C is a Canyon." · "Polymers remember." · "Heat flows both ways." · "Stiff on soft breaks at the edge."
- Example: someone who answers "the heat doubles" when the current doubles is told only "P = I²R. Heat goes with the square." The page never says why doubling is the tempting wrong answer.
- **What already works:** Work It Out (too high / too low, then the formula, then the numbers), Build the Stack (a wrong layer says what that position needs and what goes wrong without it) and Spot the Fault (explains both layers). These are the model for the checks.

### P3. "Every contact is a toll booth" predicts the wrong direction. (High: the mnemonic teaches the opposite of the figure beside it)

- A toll booth is a series cost, so more contacts means more resistance.
- But the contacts figure says "this knit **loses** contacts as it stretches, so its resistance **rises**". The resistive pressure sensor works because pressing **adds** contacts and R **falls**.
- The arrow item `a-stretch` has to patch it: "Every contact is a toll booth, but they're also the bridges between loops."
- Both effects are real (contact resistance is in series along one path; loop contacts make parallel paths). The mnemonic only carries the one that doesn't drive the sensor.
- It is used in card `toll`, question `q-knit`, the work-it-out `series` hint and the chapter 02 figure.

### P4. The arrow grids are more guessable than the hard round claims. (Medium)

- The hard round says "three rows of arrows have 27 possible answers … this one can't be guessed through".
- But **21 of 36** arrow items have fewer than three rows, and **4 have a single row**, which is a 1-in-3 guess: `a-nickel`, `a-mutual`, `a-shield`, `a-yield`.
- The rows are skewed: **"up" is right on 44 of 83 rows, "down" on 29, "same" on 10**. Answering "up" everywhere gets 53% of rows, and **7 items are all-up**.
- The hard round draws arrow items by rank, not by row count, so it often serves two-row and one-row items.

### P5. Two questions share one progress record. (Medium: a bug)

- The id `q-drift` is used twice: chapter 01's drift-velocity question and chapter 04's resistive-drift question.
- `S.quiz['q-drift']` is shared, so answering one marks the other right or wrong. This corrupts both chapters' scores and the mixed round's missed-first ordering.

### P6. About a dozen "lines to remember" are definitions, not mnemonics. (Medium)

- **Strongest:**
  - "Some Cats Get Angry" (Ag Cu Au Al);
  - "R is a Road, C is a Canyon";
  - "Ω/m is the tex of conductivity" (good for a textile reader);
  - "Fabric is a sieve; TPU is a floor";
  - "Self: you add. Mutual: you steal.";
  - "Water fools C and shorts R";
  - "Cork zero, metal a third, rubber a half";
  - the marbles.
- **Weakest:** these restate the fact with no hook. Type the Line then tests exact wording, so it drills the phrasing of a definition.
  - "Strain is stretch per length." · "Stiffness is stress over strain." · "Heat flows both ways." · "Heat goes with the square."
  - "No loop, no flow." (fine) · "Contact pressure is signal quality." · "Polymers remember." · "Metal only springs back a tiny bit."
  - "Pull it long, it goes thin." · "Gold goes where things touch." · "Nickel near skin = itch." (fine as a rule)
- Some of these are fine as rules; the point is they aren't doing a mnemonic's job. A ruling is needed on which to rework. Nothing is proposed for removal.

### P7. Chapter order and what the study page covers. (Medium)

- **Forward references.** Chapter 02's heater lab asks the learner to choose between silver, stainless and carbon yarns before chapter 03 has said why they differ. Chapter 04 teaches resistive sensing but leaves the gauge factor (why a stretched conductor's R rises) to chapter 06, two chapters later. The learner meets "strain yarn" in the 04 table before strain is defined.
- **Coverage.** The study page covers the note's parts 02 (yarns), 04 (sensing) and some of 03 and 07, plus a chapter of mechanics the note doesn't have.
- **No practice for three of the note's seven parts:**
  - Acting (heating, Peltier, EMS, shape memory);
  - Antennas & Power;
  - Soft Meets Hard. The note calls this joint "where most smart textiles fail", and the study page has two connector questions in total.

### P8. Every chapter repeats the same sequence and the same paragraph; the game modes are never introduced. (Medium)

- The one-line "Nothing to recognise here: say which way each thing moves…" note is repeated word for word six times.
- Nowhere does the page explain:
  - that Got it / Not yet are Leitner boxes (a card counts as known after two Got its);
  - what the progress percent is made of (cards at box 2, last check answer right, arrow items right);
  - that "=" means "stays the same";
  - that a typed number accepts ±3%;
  - that an order check locks what's in place.
- A first-time learner discovers each rule by getting it wrong.

---

## 2. Accuracy

Numbers checked and **correct** (no action):

- Resistivities of Ag, Cu, Au, Al, Ni, 304 stainless, nichrome and PAN carbon fibre.
- TCR of Pt (0.385%/°C, IEC 60751), Cu, Ni and constantan; nichrome's under-1% over 20→80 °C (Kanthal Nikrothal 80).
- Young's moduli of carbon fibre, steel, copper, silver, PET fibre, nylon and TPU.
- Poisson's ratios of cork, metals, glass and rubber.
- Gauge factor (1 + 2ν ≈ 1.7 geometric, foil ≈ 2, liquid metal R ∝ λ²); the capacitor C ∝ λ derivation.
- Drift velocity (0.074 mm/s at 1 A/mm²); body capacitance ≈ 100 pF; εr of water (80) and PET (3).
- The 2 × 2 cm / 3 mm plate = 1.18 pF.
- Surface EMG µV–mV; NiTi a few percent; nylon melting points.
- Nickel as the most common contact allergen; silver migration; the Franklin dates.
- "16 wires read 64 points"; the Tao tiers.

Problems, most consequential first:

| # | Where | What it says | What's true | Kind |
|---|---|---|---|---|
| **A1** | Study: heater lab (Silver-plated 10 Ω/m, Stainless 30 Ω/m), `a-heatyarn`, Pick the Metal heater ("silver… its low Ω/m means long lines") | Silver-plated thread has lower Ω/m than stainless | Typical threads run the other way. Silver-plated nylon: Madeira HC 40 < 300 Ω/m, HC 12 < 100, Shieldex 117/17 2-ply ≈ 270. Adafruit 316L stainless: 2-ply ≈ 52 Ω/m, 3-ply ≈ 33. Only heavy silver threads reach stainless's figure. The note's own ladder (silver 5–1000, stainless 8–150) is right; the study page's examples aren't. | wrong |
| **A2** | Study: PEDOT:PSS metal card, conductivity ladder | ρ "≈ 10⁻⁵ at best; often 100× higher" | Best H₂SO₄-treated films reach ~4,400 S/cm, ρ ≈ 2 × 10⁻⁶. Pristine films are 0.1–1 S/cm, 10⁻³–10⁻² Ω·m, which is 1,000–10,000× worse than 10⁻⁵, not 100×. Coated textiles typically sit at 1–100 S/cm. | wrong at both ends |
| **A3** | Note: Temperature | "Carbon composites do the opposite and drop" | Graphite and carbon fibre do have a negative coefficient. Carbon-black/polymer composites near percolation usually rise sharply (PTC), which is how self-regulating heaters work. | oversimplified, often wrong |
| **A4** | Study: card `serpentine` ("How the line works") | "Stretching it 30% straight would be 150 times that [0.1%]" | 30% ÷ 0.1% = **300×**. Also, for an in-plane serpentine bonded to fabric, the bending strain is set by the trace's **width** (in the plane), not its thickness. The thickness argument fits a wavy, buckled film; a thin free-standing ribbon buckles sideways and twists, which changes it again. | arithmetic error; wrong dimension |
| **A5** | Study: "Pull it" scene ("yields at about 0.06%") vs gauge lab ("about 0.2%") vs card `yield` ("0.05–0.2%") | Three figures for copper's elastic limit | All are real copper: annealed is 33–70 MPa / ~120 GPa = 0.03–0.06%; hard-drawn is 250–350 MPa = 0.2–0.28%. No place says which copper it means. Use "0.03–0.3%, annealed at the bottom" once and name the temper in each scene. | inconsistent; range slightly off |
| **A6** | Note: Textile antenna | "Its frequency is set by the patch size and the felt's thickness, so … wetting the felt detunes it" | f ≈ c / (2L√εeff): mainly the patch length and the felt's **permittivity** (εr ≈ 1.2–1.5). Thickness is second-order and mainly sets bandwidth. Wetting detunes it by raising the permittivity, which the sentence doesn't name. | misleading |
| **A7** | Note: Acting > Heating | "Current … turns into heat, in proportion to its resistance and the square of the current" | True at fixed current. A battery fixes the voltage, so heat goes as V²/R, inversely with R. The study page builds its heater lab on exactly that ("at fixed voltage, longer is colder"), so a learner who read the note first carries the opposite intuition in. | true but sets up a misconception |
| **A8** | Note: Capacitive pressure | "No current flows through the stack, so it drifts less" | The lack of current isn't why. Resistive pads drift because their carbon-polymer layer creeps; a capacitive pad is stable when its spacer springs back. The study page's table says this correctly ("Stable if the spacer springs back"). | wrong cause |
| **A9** | Note: Thermoelectric | "Tens of microvolts per degree per leg" | True for organic and textile materials (PEDOT ≈ 10–40 µV/K). Bi₂Te₃, which many textile generators use, is ≈ ±200 µV/K. Name the material. | oversimplified |
| **A10** | Study: units panel, card `modscale`, `o-stiff` | Silicone "~1 MPa"; "metal a hundred thousand times stiffer than silicone" | Fits Sylgard 184 PDMS (0.4–3 MPa). The silicones used in stretchable electronics are far softer: Ecoflex 00-30 ≈ 0.06 MPa, Dragon Skin 0.15–0.6 MPa. Give a range. | oversimplified |
| **A11** | Study: card `poissonvals` | "A plain solid material can't go above 0.5" | Only for an **isotropic** solid. Anisotropic solids (some crystals, laminates, tissue) can exceed it. One word: "an isotropic material". | oversimplified |
| **A12** | Study: gauge lab caption | Copper's 0.2% is "a hundredth of what the liquid metal takes" | That implies 20%. EGaIn channels in silicone take several hundred percent. | understated |
| **A13** | Study: card `bendcube` explanation | "Faces further from the middle strain more … and there's more material doing it. Both effects together give thickness cubed." | Those two effects give t². The third factor is the lever arm: each element's force acts further from the middle. | explanation doesn't add up |
| **A14** | Study: chapter 04 vs chapter 06 | ε is permittivity ("air 1") in C = εA/d and strain in ε = ΔL/L; the card `capstretch` uses both on one card | Write εᵣ (and C = ε₀εᵣA/d) for permittivity. "Air 1" is the relative permittivity, so C = εA/d with ε = 1 is dimensionally off. | notation |
| A15 | Study: three places | Stainless "about 40×", "about 43×" copper; "about 45×" silver | All right (7.2 ÷ 1.68 = 43; 7.2 ÷ 1.59 = 45). Use one figure per comparison. | precision/consistency |
| A16 | Study: card `marbles` | "Pushing at one end moves every electron … at nearly the same moment" | What travels is the electromagnetic field along the wire, not a mechanical shove. The analogy is standard; a half-sentence would keep it honest. | analogy, low |

---

## 3. Mobile (390 px)

- **M1. Thirteen study-page figures scroll sideways and cut off their key text.**
  - Each wide scene (circuit, Ohm, yarn R, heater, ladder, road/canyon, self/mutual, stack, curves, Poisson, gauge, serpentine) draws 652 px into a 341 px box. The resistive/capacitive table is 544 px in a 343 px box.
  - In the Ohm lab "Push = Flow × Fight" and the resistance label are past the right edge, and nothing signals that the box scrolls (sheet, three panels).
  - The page itself doesn't scroll sideways, which is why the existing gate (V12) passes.
- **M2. Diagram text is too small, on both pages.**
  - At 390, the note's labels have a **median of 6.9 px** and 370 of 396 are under 8 px. The first diagram (Tao's tiers) is at **3.0 px** and the conductivity ladder at **3.1 px**.
  - At 390, the study page's median is 8.7 px and its smallest is 5.8 px (curves, gauge).
  - Even at 1280 a few labels are 6–7 px: the note's carbon (6.1), bundle and bico (7.1); the study page's TCR (6.1) and galvanic (7.6).
  - The note scales its drawings to fit, so nothing scrolls, but everything shrinks. The study page keeps them legible-ish by scrolling.
- **M3. Tap targets.**
  - At 390, 211 of the study page's 217 controls are under 44 px tall, and 31 are under 24 px (WCAG 2.2's minimum).
  - The worst are the range sliders (16 px tall), the progress panel's chapter links (20 px) and the "Start a mixed round" links (21 px).

## 4. Navigation and length

- **N1. The study page is 30,700 px at 1280 (34 screens) and 40,000 px at 390 (47 screens).** The note is 18.5 / 28 screens.
  - The study page has **no back-to-top link**; the note has one.
  - There is no sticky or in-page chapter nav: the progress panel at the very top is the only table of contents.
  - Each chapter stacks 6–8 blocks (watch, play, challenges, remember, check, harder). Getting from a chapter's lab to its check, or from chapter 06 back to the progress panel, is a long scroll.
- N2. The mixed and hard rounds sit after chapter 06; the only links to them are in the top panel.

## 5. Consistency between the note and the study page

- **C1** heater power: A7.
- **C2** why capacitive drifts less: A8.
- **C3** silver vs stainless Ω/m: A1. The note's ladder is right and the study's examples contradict it.
- **C4** The diagram keys disagree. The note's indigo dashed line means "cool, relaxed, low"; the study's means "cool, low, electric field". Mint is "a signal" on one and "a signal, a threshold" on the other.
- **C5** The study page sets terms the note doesn't: "the push / flow / fight", "Ω/m is the tex of conductivity", the stack names. The note's own captions never use them. This is fine, but a learner who goes back to the note loses the vocabulary. A one-line "in study terms" pointer per note part would connect them (an optional addition).
- **C6** Copper's elastic limit is three numbers on one page: A5.

**Sources** (from the fact-check):

- Kanthal Nikrothal 80 datasheet: resistivity 1.09 × 10⁻⁶ Ω·m; temperature factor 1.00 at 20 °C, 1.01 at 100 °C.
- Toray T300 TDS: 1.7 × 10⁻³ Ω·cm; 230 GPa.
- IEC 60751: α = 0.00385.
- PEDOT:PSS conductivity reviews (RSC J. Mater. Chem. C, D0TC02558E; MDPI *Molecules* 28(6) 2836).
- Carbon composite PTC/NTC (RSC J. Mater. Chem. C, 2023, d2tc04593a).
- Soft silicone moduli (Case et al. 2015, Yale Faboratory; PMC4985695).
- Poisson's ratio bounds (Ting & Chen, arXiv cond-mat/0606810; Lakes, UW–Madison).
- Copper yield (ASM/MatWeb: annealed 33–70 MPa, hard 250–350 MPa).
- Vishay TN-505 (foil gauge factor).
- Park, Majidi & Wood (IEEE Sensors J. 2012) and Zhu et al. (Adv. Funct. Mater. 2013) for EGaIn.
- Dynalloy Flexinol technical data.
- Balanis, *Antenna Theory*, ch. 14.
- Rogers group serpentine mechanics (Soft Matter 2013) and Zhang et al. on free-standing serpentines.
- Adafruit 640/641 stainless thread; Madeira HC 40 / HC 12 and Shieldex 117/17 datasheets.
- Bubnova et al. (Nat. Mater. 2011) for PEDOT thermopower.

---

## 6. Proposed changes, ranked

Cost: S is under half a day, M about a day, L several days. "Removes or restructures" marks anything that needs your ruling under the "nothing removed or merged without my ruling" rule. None of these removes content.

| Rank | Change | Fixes | Cost | Removes / restructures? |
|---|---|---|---|---|
| 1 | **Shuffle check-question options at render time** (chapter checks and mixed round). Keep the data's `a` and map it through the shuffle. Gate: the right-answer letter is spread across A–D over many renders, and the existing V7 still passes. | P1 | S | No |
| 2 | **Rewrite the 9 throwaway distractors** into plausible misconceptions, and **even out option lengths** where the right one is the only explained option (≈ 20 questions). | P1 | M | Rewrites option text (each listed for your OK before merge) |
| 3 | **Fix the factual errors** A1–A13 as copy edits: heater-lab yarn labels and values or the silver note; PEDOT ρ; carbon PTC; the serpentine 300× and width; copper temper named; antenna permittivity; heater P at fixed V; capacitive drift cause; thermoelectric material; silicone range; "isotropic"; liquid-metal stretch; the t³ lever arm. Chapter 02's heater-lab challenge targets get re-checked against any changed yarn values. | A1–A13, C1–C3, C6 | M | Changes numbers and sentences; no removal |
| 4 | **Teach on a wrong answer:** each check question gains a one-line "why not" per distractor (`no: [...]`), shown under the pick. The 21 short explanations get one mechanism sentence before the mnemonic. | P2 | L (≈ 170 short lines) | Adds content |
| 5 | **Fix the duplicate id** (`q-drift` in chapter 04 → `q-creep`). A stored record is left with chapter 01, so nobody's chapter 01 progress moves. | P5 | S | No |
| 6 | **Mobile labs:** below 600 px, the wide study scenes draw a portrait layout (drawing stacked over its read-outs), or at least scale to fit with the key read-out moved into the HTML output beside the slider. Extend V12 to fail on any inner horizontal scroller. | M1 | L (13 scenes); M for scale-to-fit only | Restructures drawings at mobile width |
| 7 | **A text floor in the diagrams:** no label under ~9 px at 390 or ~8 px at 1280. The note's tiers and ladder get a stacked mobile layout. A gate check measures rendered label size. | M2 | L | Restructures two note diagrams at mobile width |
| 8 | **Navigation:** a sticky chapter rail (study page) showing chapter progress, plus back-to-top. The chapter-list links become ≥ 44 px rows. | N1, M3 | S–M | Adds chrome |
| 9 | **Replace the toll-booth mnemonic** with one that predicts the right direction, e.g. "Contacts are bridges: more bridges, less R". Patch `a-stretch`, `q-knit` and the `series` hint to match. | P3 | S | Changes a mnemonic (your ruling) |
| 10 | **Make the arrow grids honest:** every item gets two or more rows; four single-row items gain a row; some all-up items get a "same" or "down" row where the physics has one; the hard round draws only three-row items. Or soften the "can't be guessed" sentence. | P4 | S–M | Changes item content (your ruling on which) |
| 11 | **Onboard each game once:** a two-line "how this works" the first time each mode is opened (stored like progress). Replace the six identical "Harder" paragraphs with one explainer at chapter 01 and a one-line pointer after. Explain Got it / Not yet and what the percent counts. | P8 | S–M | Removes the five repeats of one paragraph (your ruling) |
| 12 | **Tap targets:** sliders get a 44 px hit area; buttons get min-height 40–44 px on touch. | M3 | S | No |
| 13 | **Notation:** εᵣ for permittivity, C = ε₀εᵣA/d; ε stays strain. | A14 | S | No |
| 14 | **Rework the weakest hooks** (P6 list): proposals for your ruling, one per card, keeping the old line in "Other ways to remember it". | P6 | M | Changes mnemonics (your ruling per card) |
| 15 | **Fix forward references:** chapter 02's heater lab gets one sentence on why the three yarns differ, pointing to chapter 03. Chapter 04 gets a short "strain sensors: R rises with stretch, details in 06" bridge. | P7 | S | No |
| 16 | **Coverage:** a study chapter for the note's parts 05–07 (actuators, power and antennas, soft meets hard: P = V²/R in practice, EMS charge balance, patch detuning, connector failure modes) with the same watch / play / remember / check pattern. | P7 | L | Adds a chapter (your ruling) |
| 17 | **Align the two diagram keys** and add an "in study terms" pointer per note part. | C4, C5 | S | Adds a line per note part |
| 18 | Small precision fixes: A15 (one multiple per comparison), A16 (the field, not a shove). | A15, A16 | S | No |

**Suggested first build** if you want one PR to start: ranks 1, 3, 5, 9, 12 and 13. They are small and don't change the structure, and they remove the guessability and the wrong facts. Ranks 4, 6, 7 and 16 are the large ones and are better as their own PRs.

**The existing gates** would be extended for each: option shuffle and letter spread (V7); no inner horizontal scroller (V12); rendered label size; the duplicate-id guard (one id per item across QUIZ, ARROWS and SENSOR_Q); tap-target size; each with a negative-control mutant in `verify-study.mjs`.

---

## 7. Status (Eva's rulings, 14 Nov 2026)

- **#559 merged** as the record of this audit.
- **PR 1, correctness**, built:
  - **Questions.** Options shuffled once per question per visit. Distractors rewritten: the right answer is now the strictly longest option on 2 of 56 questions (was 32), and there are no throwaway options. The duplicate id is fixed (`q-drift` in chapter 04 is now `q-creep`).
  - **Facts and notation.** Every correction in §2 is made, on both pages and inside the diagrams, and εᵣ is used for permittivity throughout.
  - **The contact line.** The toll-booth line is replaced by one of three candidates (`CONTACT_LINES`, picked by `CONTACT_PICK`). The toll booth stays as an alternate, scoped to joints in series.
  - **Arrow grids.** Every item has three rows, split 36 up / 36 down / 36 same. Answering "up" everywhere scores 33.3% of rows and 0 of 36 items.
  - **Layout.** Tap targets are 44 px on touch or narrow screens, with taller slider hit areas. The five repeated "Harder" paragraphs are one explanation at chapter 01.
  - **Gates.** V21–V25 in `verify-study.mjs` and S9–S10 in `verify-page.mjs`, each with mutants. A pre-existing V17 flake is fixed.
- **Queued, not started:**
  - PR 2: wrong-answer feedback (§1 P2, §6 rank 4).
  - PR 3: mobile lab layouts, the diagram text floor, chapter navigation and back-to-top (§3, §4; §6 ranks 6–8).
  - PR 4: a study chapter for the note's parts 05–07 (§1 P7, §6 rank 16).
- **Not ruled yet:** the weaker hooks (§1 P6, §6 rank 14), the forward references (rank 15), aligning the diagram keys (rank 17) and the Leitner / progress explainer (§1 P8).
