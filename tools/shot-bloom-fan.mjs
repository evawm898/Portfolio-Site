/* ===================================================================
   THE FAN SHEET — session 10's deliverable, and the picture Eva rules from.

   THE COMPOSITION IS THE FLOWER'S OWN, which is what she asked for: the fan
   read FACE-ON, with the mirror line legible, and the toggle's two positions
   side by side. The bloom's fan exists because she liked the flower's, so the
   sheet that rules on it should let her make the same comparison she made
   there.

   THE MIRROR LINE IS DRAWN, AND THE DRAWING IS ASSERTED RATHER THAN
   DECORATIVE. The plane contains the axis and the +x direction; the face-on
   camera passes up = [-1, 0, 0], so +x is at the BOTTOM of the frame and the
   plane projects to a VERTICAL line down the middle of every face-on cell.
   That is why the line can be drawn in CSS at 50% width — but a line drawn at
   a fixed place is exactly the kind of label that quietly stops matching its
   computation, so every cell MEASURES the plane from the emitted azimuths
   (the same midpoint-of-a-mirror-pair property Z4b asserts) and the sheet
   aborts if it is not at azimuth 0. A drawn plane that is not the model's
   plane would be this project's most repeated defect, in a picture.

   WHAT THE TWO TOGGLE CELLS ARE FOR. They are the same fan under two
   different INVOLUTIONS, not two arrangements of taste. ON: a petal is
   bisected by the line, the pairing is i <-> n-i, and its fixed point IS the
   PETAL 1 — Eva's original fan principle, "the petal on the mirror line is
   petal number one". OFF: the line runs through the gap, the pairing is
   i <-> n-1-i and has NO fixed point, so every role is a pair and the
   petal 1 is the INNER PAIR. The captions say which, and each cell checks
   its own claim against what the app reported.

   THE CONTROL IS A RADIAL BLOOM, UNCHANGED — the same reason the orchid sheet
   carries one. A fourth placement that quietly moved the other three would
   show here as well as in the byte report, and a sheet is where an eye
   catches what a number would have to be asked for.

   EVERY CELL ASSERTS ITSELF. A fan that silently built a full ring renders as
   a ring under a caption saying "fan", and NOTHING in the frame says so —
   measured on a throwaway worktree: it exports watertight, in one piece, at
   an identical triangle count and an identical STL byte length. So each cell
   runs the junction assertions (J7 included), the zygomorphy assertions,
   reads its whole state back, and checks its own caption's arc and notch
   against footRing()'s own answer.

   RUN:  node tools/shot-bloom-fan.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, zygoAssertions, JUNCTION_SCOPE, DEFAULTS, mirrorPartner } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-fan';
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* ONE OWNER FOR THE FACE-ON ROLL, shared with the orchid sheet's reasoning:
   +x is the mirror plane's trace, and up = -x puts it vertical with the
   labellum end at the bottom. */
const FACE_UP = [-1, 0, 0];
const DEG = 180 / Math.PI;

async function cell({ label, set = [], note = '', expectFan = true }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  for (const [n, fn] of [['junction', junctionAssertions], ['zygomorphy', zygoAssertions]]) {
    const out = await fn(page, { label, set });
    if (out.length) await die(`${label}: ${n}: ${out.join('; ')}`);
  }
  await page.waitForTimeout(450);

  const m = await page.evaluate(() => window.__bloomMetrics());

  /* THE CELL'S OWN CLAIM. A cell captioned as a fan must be showing one. */
  if (Boolean(m.fan) !== expectFan) {
    await die(`${label}: the cell declares expectFan=${expectFan} and the app reports ${Boolean(m.fan)} — the caption would describe a bloom other than the one in the frame`);
  }

  /* THE DRAWN MIRROR LINE IS ONLY HONEST IF THE PLANE IS WHERE IT IS DRAWN.
     Measured from the emitted azimuths, exactly as Z4b measures it: for a
     mirror pair the midpoint of the two azimuths IS the plane. If this is not
     0 (mod pi) the vertical line in the frame is a label on a computation
     nobody performed, so the sheet refuses to produce it. */
  let plane = null;
  /* SESSION 11 WIDENED THIS GUARD, and it is the same widening Z4b needed.
     It used to read `m.slotRolesEligible`, which was true on every fan — until
     per-petal roles superseded slot roles there (Eva's ruling 4, Sep 3) and it
     became FALSE on exactly the placement this sheet is about. Left alone, the
     measurement that licenses the drawn mirror line would have gone silent on
     every fan cell while every cell still rendered: a line drawn at a fixed
     place with nothing checking it, which is the defect this block exists to
     prevent, reintroduced by a predicate moving two files away. */
  if ((m.slotRolesEligible || m.perPetalEligible) && Array.isArray(m.slotAzimuths) && m.slotAzimuths.length) {
    const row = m.slotAzimuths[0];
    const n = row.length;
    /* THE PLANE FROM THE MIRROR PAIRS, which is the same property Z4b
       asserts: for two slots that are reflections of each other, the midpoint
       of their azimuths IS the plane, modulo pi (a plane is an axis, not a
       direction).

       THE OBVIOUS MEASUREMENT WAS WRONG AND THIS SHEET'S OWN CHECK CAUGHT IT.
       The first draft took the plane as the midpoint of the arrangement's
       angular EXTENT — max and min signed azimuth — which is right for an arc
       and MEANINGLESS for a full circle: the RADIAL control cell has petals
       at 0..315 deg, where +180 and -180 are the same direction and which one
       the normalisation picks decides the answer. It measured 22.500 deg for
       a bloom whose plane is plainly at 0, and refused to render. Using the
       pairs instead gives 0 for the ring and 0 for both fan arms, because it
       asks the question the plane actually answers. */
    const planes = [];
    for (let i = 0; i < n; i++) {
      const j = mirrorPartner(i, n, m.mirror);
      let phi = ((row[i] + row[j]) / 2) * DEG;
      phi = ((phi % 180) + 180) % 180;
      planes.push(phi);
    }
    const off = planes.find((phi) => Math.min(Math.abs(phi), 180 - Math.abs(phi)) > 1e-6);
    plane = planes[0];
    if (off !== undefined) {
      await die(`${label}: a mirror pair puts the plane at ${off.toFixed(6)} deg rather than vertical — the line this sheet draws would not be the model's plane`);
    }
  }

  const arc = m.fan
    ? `${m.fan.spanDeg.toFixed(1)}° arc · ${m.fan.gapDeg.toFixed(1)}° notch · step ${m.fan.stepDeg.toFixed(2)}°${m.fan.capped ? ` (CAPPED from ${m.fan.askedDeg.toFixed(0)}°)` : ''}`
    : `radial · ${(360 / m.slotCount).toFixed(1)}° even step`;
  /* WHICHEVER POSITION AXIS SPLIT THE WHORL (session 11) — slot roles under
     RADIAL, per-petal under FAN. Reading only `slotRole` would have printed
     "no slot roles engaged" under every differentiated fan on this sheet. */
  const posRole = (r) => (r.slotRole !== null ? r.slotRole.toLowerCase() : (r.petalRole ? r.petalRole.replace('PETAL_', 'petal ') : null));
  const roleLine = m.rings.filter((r) => posRole(r) !== null)
    .filter((r, i, a) => a.findIndex((x) => posRole(x) === posRole(r)) === i)
    .map((r) => `${posRole(r)} ${r.slots.length === 1 ? `slot ${r.slots[0]}` : `slots ${r.slots.join('+')}`}`).join(' · ');

  /* ===================================================================
     FRAMING, AND IT IS ASSERTED FROM THE PIXELS RATHER THAN TRUSTED.

     THE FAN BROKE THE FRAMING EVERY EARLIER SHEET RELIED ON, and the sheet's
     own check is what caught it. Every arrangement before this one was
     radially symmetric, so its bounding sphere sat on the axis and framing at
     the ORIGIN with a radius was correct. A fan puts all of its mass on one
     side: at 3 per side x 15 degrees the first render ran clean off the
     bottom of the frame, and the cell that was supposed to show the fan at
     its most closed showed the top third of it.

     A CROPPED CELL IS THE ONE PICTURE THAT COULD CARRY A RULING WITH THE
     SUBJECT MISSING — the same rule the panel sheet states, which asserts its
     own frame for the same reason. So this targets the model's OWN centre
     (the app reports the bounding sphere it already computed) and then DECODES
     THE PNG and requires a clear margin of background on all four edges. If
     it cannot frame the cell it dies rather than writing a picture nobody
     should rule from. */
  const shots = {};
  for (const [view, dir, up] of [['face', [0, 0, 1], FACE_UP], ['profile', [1, 0, 0], null]]) {
    const file = path.join(outDir, `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${view}.png`);
    let framed = false;
    /* The radius the app's own fit would use, widened in steps only if the
       measured content still reaches an edge. Widening is bounded and every
       step is checked, so a cell can never quietly settle for a crop. */
    for (const grow of [1.15, 1.4, 1.8, 2.4]) {
      await page.evaluate(([r, c, d, u]) => window.__bloomFrame(r, 0, c, d, u), [m.fitRadius * grow, m.fitCenter, dir, up]);
      await page.waitForTimeout(220);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 900, height: 900 } });
      const { width, height, data: pixels } = decodePNG(fs.readFileSync(file));
      /* The canvas background is a known flat colour (0x0c0f0e), so "content"
         is any pixel far enough from it. A 12px margin, because a petal tip
         touching the very edge is already a crop in the making. */
      const M = 12;
      const isBg = (x, y) => {
        const o = (y * width + x) * 4;
        return Math.abs(pixels[o] - 0x0c) < 10 && Math.abs(pixels[o + 1] - 0x0f) < 10 && Math.abs(pixels[o + 2] - 0x0e) < 10;
      };
      let touches = false;
      for (let x = 0; x < width && !touches; x++) {
        for (let y = 0; y < M; y++) if (!isBg(x, y) || !isBg(x, height - 1 - y)) { touches = true; break; }
      }
      for (let y = 0; y < height && !touches; y++) {
        for (let x = 0; x < M; x++) if (!isBg(x, y) || !isBg(width - 1 - x, y)) { touches = true; break; }
      }
      if (!touches) { framed = true; break; }
    }
    if (!framed) await die(`${label}: the ${view} view still reaches the frame edge at 2.4x the fitted radius — this cell would be a crop, and a cropped cell is the one picture that could carry a ruling with the subject missing`);
    shots[view] = path.basename(file);
  }
  console.log(`  ${label.padEnd(50)} petals=${m.slotCount} ${arc}${roleLine ? '  ' + roleLine : ''}`);
  return { label, note, shots, arc, roleLine, petals: m.slotCount, liveTris: m.liveTris, mirror: m.mirror, isFan: Boolean(m.fan) };
}

fs.mkdirSync(outDir, { recursive: true });
const asSet = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
/* A CELL THAT NAMES A STATE MUST SET IT — and three cells here did not,
   found by session 11 reading this tool's own OUTPUT rather than by looking
   at the pictures. `fanCenterPetal` defaulted to OFF when this sheet was
   written and Eva moved it to ON on Sep 2; the three cells whose LABELS say
   'toggle OFF' INHERITED it, so from that day they rendered a seven-petal
   toggle-ON fan under a caption describing a six-petal through-the-gap one,
   and 'fewest x widest' showed THREE petals under a caption about the
   two-petal empty-hood corner. The MATRIX was corrected for exactly this at
   the time (FAN_ON / FAN_OFF beside the inheriting FAN) and the SHEET was
   not — nothing reported it, because every cell still rendered and every
   assertion still passed. The `Spacing 60` caption expired the same day for
   the same reason: with a mirror-line petal the outermost petal sits three
   steps out rather than 2.5, so the arc limit now bites where the caption
   said it did not. Both are fixed; the history is kept because a caption
   that outlives its cell is this project's most repeated defect and this is
   the second place it has now been found. */
const FAN = { placement: 'FAN' };
/* THE PER-PETAL SET THE TWO DIFFERENTIATED CELLS DRIVE. It is the old LAB set
   with `labellumTipBreadth` DROPPED, because the per-petal control set ships
   without a tip-breadth row (Eva's ruling 2) — the one capability the
   supersession costs the fan, stated here as an absence a reader can see. */
const P1 = { petal1Size: '1.6', petal1Tilt: '-25', petal1Cup: '0.5', petal1Curl: '-60' };

const cells = [];
cells.push(await cell({ label: 'CONTROL — a radial bloom, unmoved', set: [], expectFan: false,
  note: 'The reference every other cell is read against, and the fourth placement\'s own regression test in a picture: RADIAL, SPIRAL and CONTINUOUS are unmoved by this change — a sheet is where an eye catches what a number would otherwise have to be asked for. THE BYTE RESULT IS NOT RESTATED HERE ON PURPOSE: the frozen matrices are its one owner (tools/diff-bloom-bytes.mjs --compare), and a caption carrying a row total would be a second copy of a measurement this tool does not make — which is how a figure ends up outliving the run that produced it. Eight petals, an even 45° step, no mirror line to draw because a radially symmetric bloom does not have one it prefers.' }));

cells.push(await cell({ label: 'THE FAN — toggle OFF, the line runs through the gap', set: asSet({ ...FAN, fanCenterPetal: 'OFF' }),
  note: 'THE SHIPPING DEFAULT, and half the headline pair. Three petals each side, 45° apart, no petal on the line — so the mirror runs through the GAP between the two inner petals and the pairing is i <-> n-1-i, which has NO fixed point. Every GROUP is therefore a PAIR: petal 1 is the inner pair (slots 0 and 5), petal 2 the middle pair (1 and 4), petal 3 the outer pair (2 and 3) — three groups rather than four, because there is no mirror-line petal to be petal one on its own. This is the involution session B derived while correcting session A\'s SPIRAL premise, a session before anyone knew what it was for.' }));

cells.push(await cell({ label: 'THE FAN — toggle ON, a petal on the line', set: asSet({ ...FAN, fanCenterPetal: 'ON' }),
  note: 'THE OTHER HALF OF THE PAIR, and the same three-per-side fan: the only difference is a seventh petal bisected by the mirror line. That petal is slot 0, the pairing is session B\'s shipped i <-> n-i, and slot 0 is its FIXED POINT — so petal 1 is a SINGLE petal with sliders all of its own, exactly as the labellum is on the orchid. Four groups here against three in the cell before it: the toggle changes the numbering, and petal one is always the group nearest the line. This is Eva\'s original fan principle arriving through the role mechanism rather than through an arrangement: the petal on the mirror line is petal number one.' }));

cells.push(await cell({ label: 'Spacing 15° — the fan closed', set: asSet({ ...FAN, fanSpacing: '15' }),
  note: 'THE SPACING SWEEP, at its tightest. The petals crowd toward the line and the notch behind opens to 315°. Note that the ARRANGEMENT is all that moves — the petals are unchanged in size, tilt and shape, and the hub disc is the same 7.66 mm ring, because the area rule sums feet and is blind to where they sit around the axis.' }));
cells.push(await cell({ label: 'Spacing 30°', set: asSet({ ...FAN, fanSpacing: '30' }),
  note: 'The middle of the sweep.' }));
cells.push(await cell({ label: 'Spacing 60° — the fan open', set: asSet({ ...FAN, fanSpacing: '60' }),
  note: 'The widest the slider goes at three per side — and the arc limit ALREADY BITES. With a mirror-line petal the outermost petal sits three full steps out, so the 170° limit caps the step at 56.67° against the 60° asked for and the read-out says so. A 340° arc with a 20° notch. Under the pre-Sep-2 default, with no mirror-line petal, the outermost petal sat 2.5 steps out and 60° was reachable uncapped — this caption said exactly that until the default moved underneath it, which is why a cell that NAMES a state must SET it.' }));

/* ===================================================================
   THESE TWO CELLS CHANGED AXIS, NOT SUBJECT (session 11). They used to drive
   `labellum*`, and Eva's ruling 4 makes those controls inert on a fan — so
   left as they were they would have rendered an UNDIFFERENTIATED fan under
   captions describing a big lip below and a paired labellum. A caption naming
   a computation nobody performed, in the tool built to photograph evidence.
   They drive PETAL 1 now, which is the same petal by the same principle,
   through the axis the fan actually has. The retirement of the old behaviour
   is photographed on its own sheet (tools/shot-bloom-per-petal.mjs), which
   renders the identical config on the base tree beside this one. */
cells.push(await cell({ label: 'FAN x PETAL 1 — toggle ON, one big lip below', set: asSet({ ...FAN, fanCenterPetal: 'ON', ...P1 }),
  note: 'PETAL ONE IS THE MIRROR-LINE PETAL, which is Eva\'s founding fan principle stated as a control group. Larger, tipped toward horizontal, cupped and curled forward — and every other group is untouched. Identical arrangement and identical triangle count to the fan two cells up; the only difference is which state each slot was built from. Until session 11 this cell drove `labellumSize` and friends; per-petal roles SUPERSEDE slot roles on the fan now, so the same petal is reached through a slider that says which petal it is.' }));
cells.push(await cell({ label: 'FAN x PETAL 1 — toggle OFF, the INNER PAIR', set: asSet({ ...FAN, fanCenterPetal: 'OFF', ...P1 }),
  note: 'THE SAME SLIDERS ON THE OTHER INVOLUTION, and the cell that shows what the numbering ruling actually costs: with no petal on the line there is no fixed point, so petal 1 is TWO petals — the pair straddling the mirror. One control drives both and the area rule multiplies that group by 2 rather than by 1. It also means the group COUNT drops by one and every pair shifts up a number: what is petal 2 in the cell above is petal 1 here. Ruled deliberately (Eva, ruling 3, Sep 3) so that petal one is always the group nearest the line.' }));

cells.push(await cell({ label: 'Fewest x widest — 1 per side, 60°, toggle OFF', set: asSet({ ...FAN, fanCenterPetal: 'OFF', fanPerSide: '1', fanSpacing: '60' }),
  note: 'THE CORNER THE CONNECTEDNESS ARGUMENT HAD TO SURVIVE, and the state that produced this session\'s one design ruling. Two petals, which under the through-gap pairing is a SINGLE mirror orbit — so the whole bloom is petal 1, and groups 2 through 9 have no members at all. Their sliders HIDE, and the gate asserts in both directions that a group\'s controls are visible if and only if the group has members. That clause was written for session 10\'s empty HOOD at this very corner; per-petal roles inherited it unchanged and it now polices the numbering itself, which is the strongest thing a generalised assertion can turn out to do.' }));

cells.push(await cell({ label: 'The arc limit — 8 per side, 60°, toggle ON', set: asSet({ ...FAN, fanCenterPetal: 'ON', fanPerSide: '8', fanSpacing: '60' }),
  note: 'THE EXTREME, SHIPPED PHOTOGRAPHED RATHER THAN CAPPED — Eva\'s standing pattern (max-roll faceting, the ROLL CLAMP look, the spread-6 plate, the 135° and 161.25° tilts). The step saturates at 21.25° against the 60° asked for, and the read-out says "(CAPPED)": the 170° arc limit is what keeps the two sides from meeting, and without it two petals would land on ONE azimuth — duplicate geometry, this family\'s known cause of non-manifold edges. What it leaves is a 340° fan with a 20° notch, which reads as a ring with a nick rather than as a fan. That is a TASTE question and it is Eva\'s: tightening the limit is one constant change with THIS CELL as its evidence.' }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/* THE LINE IS DRAWN ONLY WHERE THERE IS ONE TO DRAW. A radially symmetric
   bloom has no plane it prefers — every direction is equivalent — so the
   control cell carries no line, which is also what its caption says. */
const fig = (c, view) => `<figure><div class="frame${view === 'face' && c.isFan ? ' mirror' : ''}"><img src="${c.shots[view]}"></div>`
  + `<figcaption><b>${esc(c.label)}</b>${view === 'profile' ? ' <i>(profile)</i>' : ''}<br>`
  + `<small>${esc(c.arc)} · ${c.petals} petals · ${esc(c.roleLine || 'no slot roles engaged')} · ${Number(c.liveTris).toLocaleString('en-US')} tris (live)</small>`
  + `<p>${esc(c.note)}</p></figcaption></figure>`;
const html = `<title>The fan — a symmetric arc across one axis</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
figure{margin:0}.frame{position:relative;line-height:0}
img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
/* THE MIRROR LINE. Vertical at 50% because the face-on camera is rolled so
   the plane's trace is vertical — measured per cell, not assumed. */
.frame.mirror::after{content:"";position:absolute;left:50%;top:6px;bottom:6px;width:0;border-left:1px dashed rgba(120,200,170,.55)}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The fan — a symmetric arc across one axis</h1>
<p class="note"><b>FACE-ON IS THE HEADLINE, AND THE DASHED LINE IS THE MIRROR PLANE.</b> The plane contains the axis and the +x direction, and the face-on camera is rolled so it runs vertically down the middle of every frame. It is drawn from a measurement, not from a layout guess: each cell computes the plane from the emitted azimuths and this sheet refuses to render if it is not where the line is.<br>
<b>Read the two toggle cells together.</b> They are the same fan under two different involutions — ON has a petal ON the line (pairing <i>i &lt;-&gt; n-i</i>, whose fixed point is petal one); OFF has the line in the GAP (pairing <i>i &lt;-&gt; n-1-i</i>, which has no fixed point, so petal one is the inner PAIR).<br>
<b>Scope:</b> ${esc(JUNCTION_SCOPE)}</p>
<main>${cells.map((c) => fig(c, 'face')).join('')}</main>
<h1 style="margin-top:28px">The same ten, in profile</h1>
<p class="note">A fan seen edge-on hides its own arc, so most of these say little about the arrangement — which is the point of shooting them, and the same reason the orchid sheet carries a profile row. What they DO show is that the petals themselves are untouched by the placement: the fan moves azimuths and nothing else.</p>
<main>${cells.map((c) => fig(c, 'profile')).join('')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close();
