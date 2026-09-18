# State of play — a snapshot, not a roadmap

**Taken 2026-09-18, on `main` at `e804027e30dd0398f2e584fb29da5fbda6df0fa6`**
("Bloom: the uniform arc is sinc-stable — the near-zero curl branch, fixed before any
variance field", #257).

**THIS IS A SNAPSHOT AND IT IS DATED ON PURPOSE.** This project has already been bitten
once by a living-status doc that went stale in two days. Every figure below was measured
against that one sha, at that one moment; a reader three commits later should treat the
whole file as history rather than as a description of the tree in front of them. Nothing
here is a plan, a recommendation or a schedule — the rulings and the backlog live outside
this repository and this session cannot see them. Where a question is Eva's, it is named as
hers and left alone.

**What this session did.** It read, measured and reported. It changed no geometry, no
registry, no gate, no workflow and no threshold; it opened no issue, closed none, and
commented on no PR. The one file it wrote is this one.

**How to re-take it.** Every number below is reproducible from the commands named beside
it. Where a number is quoted from a commit message or an outcome doc rather than
re-measured, that is said explicitly.

---

## 1. `main` as it stands

**Current sha:** `e804027e30dd0398f2e584fb29da5fbda6df0fa6` (2026-09-18 16:05:02 −0400).
**Live matrix:** 852 rows over 31 blocks. **Assertion families:** 102, every one claimed by
a smoke row in both directions (`node tools/bloom-smoke.mjs --check`). **Smoke subset:** 98
rows. **Default bloom, measured here:** 19,040 triangles live and export alike, 929.8 KiB of
STL (`buildBloomInto` on `DEFAULTS` in both modes).

**Constants, read off the module rather than a doc:** `BLADE_ROWS` (NU) 56 · `MIN_FEATURE_MM`
1 · `SHEET_THICKNESS_MM` 1.2 · `STEM_MIN_WALL_MM` 1.5 · `TIP_HALF_MM` 0.8 · `ROOT_BLEND_END`
0.3 · `HELD_ROWS` 16 · `LADDER_MAX_GAP_FACTOR` 1.4.

### 1a. Every merge into `main` in the last 30 days

170 first-parent merges, 2026-08-20 → 2026-09-18. The right-hand column quotes the merge
commit's **own** byte claim; it is not an independent re-measurement, and "source files
touched" is restricted to the twelve generator/app files (everything else — `tools/`,
`docs/`, `/plot`, `/print`, `/scene`, the tracker, the gauge reader — is excluded by
construction, because those cannot move an exported byte).

| sha | date | PR | what it shipped | source files touched | geometry bytes |
|---|---|---|---|---|---|
| `e804027e` | 2026-09-18 | #257 | Bloom: the uniform arc is sinc-stable — the near-zero curl branch, fixed before any variance field | b-geometry.js | source touched — PR claims: *116 moved* |
| `ae90b70c` | 2026-09-18 | #255 | bloom-frozen-tags: the self-test's own fixture needs a tagger identity — run 10 failed one step before the verdict | — | no source touched |
| `b6f62e5d` | 2026-09-18 | #256 | Bloom infill: the basal boundary gets its own owner, and the floor is the blade's own waist | b-geometry.js | source touched — PR claims: *0 moved* |
| `09e2acac` | 2026-09-17 | #254 | docs: the frozen-tags outcome — three findings, and a fourth instance for the cannot-fail register | — | no source touched |
| `06e4173a` | 2026-09-17 | #253 | bloom-frozen-tags: the workflow was publishing all along — fix the verdict, not the push | — | no source touched |
| `3e038cc2` | 2026-09-17 | #252 | docs+tools: the solid base panel is the object, and the constraint that pinned its boundary does not bind | — | no source touched |
| `eb2aaa7c` | 2026-09-17 | #243 | Bloom: sepals, part 1 — the whorl is the petal builder, attached partway down the hub | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *72 movers* |
| `a11219b4` | 2026-09-17 | #251 | docs+tools: grading the infill at the base — the V is the lever, and shrinking cells there makes it heavier | — | no source touched |
| `eac6d8ae` | 2026-09-17 | #250 | docs+tools: the infill's base boundary — u = 0.30 is already the floor, by one lattice row | — | no source touched |
| `6999e31a` | 2026-09-17 | #246 | Bloom: the xfail lists gate HOW MUCH, not only WHICH — #213 closed | — | no source touched |
| `cf6e985b` | 2026-09-17 | #249 | docs+tools: Voronoi infill salvage — rounded junctions, anisotropic metric, graded density (discovery) | — | no source touched |
| `4847ebac` | 2026-09-17 | #248 | docs: organic variance discovery — the interpenetration finding, Eva's rulings, and two instruments | — | no source touched |
| `7acccd92` | 2026-09-17 | #247 | docs: record Eva's twelve inflorescence rulings; correct the #236 line | — | no source touched |
| `874f4128` | 2026-09-17 | #245 | docs: bell / corolla discovery — the nod is a rotation, the seam window past 90° is derived, the corolla is one ring primitive | — | no source touched |
| `7ebfb7fb` | 2026-09-17 | #244 | docs: inflorescence discovery — what the bloom would need, and where the hypothesis was wrong | — | no source touched |
| `f64f3bcf` | 2026-09-17 | #242 | Bloom: the hub's shape — GOBLET / ANGLED / CURVED, and #236 closed | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 floats moved* |
| `0ece7e77` | 2026-09-16 | #241 | Bloom: leafTipShape (told about its terminal), and the panel as Eva's list | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *4 predeclared movers* |
| `3f664be8` | 2026-09-15 | #240 | Leaves on the bloom's stem — the petiole roots in the wall | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *11 predeclared MOVERS* |
| `939dff1e` | 2026-09-15 | #239 | Scene 1: lily pads and blooms, and a pad that rides the water | — | no source touched |
| `1fd0af5d` | 2026-09-14 | #238 | Bloom: the stem's tip plug — the bore is an interval, closed at both ends | b-geometry.js,bloom.js | source touched — PR claims: *0 movers* |
| `d4a9cd77` | 2026-09-14 | #233 | /scene: the koi as one continuous contour on one chain, and the water to the reference | — | no source touched |
| `41d7a877` | 2026-09-14 | #235 | Bloom: the sphere's stem, the petals it would pass through, and the solid root band | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *1 predeclared mover* |
| `9b15fe2d` | 2026-09-14 | #234 | /scene: a scene may have several planes, measured rather than assumed | — | no source touched |
| `5f9c0c74` | 2026-09-13 | #229 | Bloom: the carnation fringe and its squared terminal — one feature | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *30 movers* |
| `7a02570d` | 2026-09-13 | #228 | Merge pull request #228 from evawm898/claude/koi-rain-ripple-rendering-v1mm5u | — | no source touched |
| `6741c1e8` | 2026-09-13 | #226 | Merge pull request #226 from evawm898/claude/brave-pasteur-2q1ga0 | — | no source touched |
| `994aea46` | 2026-09-13 | #227 | The squared tip: a carnation fringe is not expressible as a half-width, and the cleft machinery already exists | — | no source touched |
| `4c5423b3` | 2026-09-13 | — | Bloom session 43: the stem on the hub, and the hub-to-stem join derived from it | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *16 predeclared movers* |
| `8e4c93ef` | 2026-09-12 | #224 | Bloom session 42: MODEL B — the lobe treatment runs over the apex | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *43 predeclared movers* |
| `46c399d2` | 2026-09-12 | #223 | /scene: the shell, and scene 1 — a koi pond in the rain | — | no source touched |
| `8421d3c6` | 2026-09-12 | #222 | Tracker: safe JSON import, an interest rating and markers, addedAt, and a constrained tag input | — | no source touched |
| `d4fd9a97` | 2026-09-12 | #217 | Bloom session 41: the lobe cut law on two independent exponents — serration reachable | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *39 moved* |
| `31c79ebe` | 2026-09-12 | #219 | Tracker: the nine-tag controlled vocabulary, and report anything outside it | — | no source touched |
| `3f238bd8` | 2026-09-12 | #216 | Bloom session 40: which rim model is shipped, and what Model B would do (discovery) | — | no source touched |
| `53439f59` | 2026-09-12 | #215 | Bloom: the ladder stops measuring the seam offset as its own redistribution (session 39, PR 2) | b-geometry.js | source touched — PR claims: *157 moved* |
| `378a001c` | 2026-09-11 | #214 | Bloom session 39: LADDER_MAX_GAP_FACTOR is typed, and it caps the lobe count on its own | — | no source touched |
| `a24ed69b` | 2026-09-11 | #210 | Bloom: the foot-to-blade seam clearance, derived | b-geometry.js,bloom.js | source touched — PR claims: *160 moved* |
| `1740a2eb` | 2026-09-10 | #212 | Bloom: lobes on the petal rim — cut in, on a ladder that serves a resolution demand (session 38, PR 2) | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *33 predeclared movers* |
| `0529e049` | 2026-09-10 | #211 | Bloom: petalRim — the rim's arc length, proved against the exported boundary (session 38, PR 1) | b-geometry.js | **source touched — no byte claim in the message** |
| `59c0657f` | 2026-09-10 | #209 | Bloom session 37: connect the sharper seam to session 32's visual report | — | no source touched |
| `1a3dfe1a` | 2026-09-10 | #208 | Bloom: petalSurface(u, v) — the mid-surface law leaves the row loop (session 37) | b-geometry.js | source touched — PR claims: *0 floats moved* |
| `0ec714cb` | 2026-09-10 | #207 | /plot: drag a bloom by its anchor to place it | — | no source touched |
| `08651adf` | 2026-09-10 | #205 | Bloom: every petal shell wound outward, and the orientation and self-intersection checks are gates (session 36) | b-geometry.js,bloom.js | source touched — PR claims: *0 floats moved* |
| `b619365f` | 2026-09-10 | #206 | /plot: rebuild only the bloom that changed | — | no source touched |
| `c12d4732` | 2026-09-10 | #204 | /plot notes: the two ways a refactor disarms a mutant, and `mayAlso` | — | no source touched |
| `f50d2089` | 2026-09-10 | #203 | /plot gate: `mayAlso`, for the one mutant whose blast radius is not deterministic | — | no source touched |
| `f64f3acf` | 2026-09-10 | #202 | /plot gate: one mutation was not the defect it names, and three lists were short | — | no source touched |
| `57a70151` | 2026-09-10 | #201 | Bloom: the grid export writes every petal, not one per ring | b-geometry.js,b-grid-gltf.js,bloom.js | **source touched — no byte claim in the message** |
| `2a31bb91` | 2026-09-09 | #200 | /plot: several blooms in one composition | — | no source touched |
| `ead86241` | 2026-09-09 | #199 | Bloom: the apex sweep, the self-intersection census, and two defects it uncovered (session 35) | b-geometry.js,b-registry.js | source touched — PR claims: *byte-identical* |
| `a827b6d9` | 2026-09-09 | #197 | /plot: polarity, and the first print out of the tool | — | no source touched |
| `ae384764` | 2026-09-09 | #198 | Docs: frozen/phase21 is ruled acceptable uncreated, and the git/refs route is untested rather than refused | — | no source touched |
| `e292af50` | 2026-09-09 | #196 | Bloom: the petal tip law, the cap demotion and the turning ladder (session 32, PR THREE) | — | no source touched |
| `d6ab82f6` | 2026-09-09 | #193 | /plot: the FRAME panel, and a composition that survives a reload | — | no source touched |
| `75447969` | 2026-09-09 | #195 | Bloom session 34 docs: reachability, the measured NU-56 runtimes, and two findings | — | no source touched |
| `5ab3458a` | 2026-09-08 | #194 | Bloom: margin buckling's three controls, the clamp, and NU 56 (session 34, part 2 of two) | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `b153e650` | 2026-09-08 | #192 | Bloom: the outline sagitta — an instrument, wired into the export gate (PR TWO, session 32) | — | no source touched |
| `2a97e968` | 2026-09-08 | #190 | Bloom: PR ONE — one apex construction, no control, four ids retired, frozen/phase21 (session 32) | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *45 movers* |
| `f33c0807` | 2026-09-08 | #189 | /plot: pick one petal and deform it — and a warp belongs to its petal | — | no source touched |
| `33c11956` | 2026-09-08 | #191 | Bloom: margin buckling — the field and its true surface normal (session 33, part 1 of two, 0 moved) | b-geometry.js | source touched — PR claims: *0 moved* |
| `b323268c` | 2026-09-07 | #188 | Bloom charter: session 31's close (docs only — records #187) | — | no source touched |
| `552bbccf` | 2026-09-07 | #187 | Bloom: the pinch replaces sharpness — the singular exponent off the travel, two patches out, frozen/phase20 (session 31) | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *bit-identical* |
| `7011e881` | 2026-09-07 | #184 | /plot: the zoom repaint, and a stem inferred from the petal lines | — | no source touched |
| `8b4c671b` | 2026-09-07 | #186 | Bloom charter: session 30's close (docs only — records #185) | — | no source touched |
| `f8f621de` | 2026-09-07 | #185 | Bloom: the stigma's seven from one table — the tip generator, JG6, frozen/phase19 (session 30 / tip plan 4, 0 moved) | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 moved* |
| `eb3543fa` | 2026-09-07 | #183 | Bloom charter: session 29's close (docs only — records #179) | — | no source touched |
| `96f2d404` | 2026-09-07 | #179 | Bloom: the anther's seven tip controls — the outline's own lattice, the waist floor, JS7 (session 29 / tip plan 3b, 0 moved) | b-geometry.js,b-registry.js,bloom.css,bloom.js | source touched — PR claims: *0 moved* |
| `8cb60510` | 2026-09-07 | #182 | /plot — curve viewer for the bloom grid export | — | no source touched |
| `e7d8992c` | 2026-09-07 | #181 | Bloom session 28: the format is validated, the dedupe is the next blocker, the flower petal path is parked (docs only) | — | no source touched |
| `2efea325` | 2026-09-07 | #180 | Bloom: capture the per-petal mid-surface grid and export it as glTF (session 28, 0 moved) | b-geometry.js,b-grid-gltf.js,bloom.html,bloom.js | source touched — PR claims: *0 moved* |
| `cb798f6a` | 2026-09-07 | #178 | Bloom charter: session 27's close (docs only — records #177) | — | no source touched |
| `b021f1c6` | 2026-09-07 | #177 | Bloom panel: the nesting bound lifted, the smoke gate's family list derived, the generated table deferred (session 27 / tip plan 3a, 0 moved) | b-registry.js,bloom.js | source touched — PR claims: *0 moved* |
| `3f7c5ab7` | 2026-09-06 | #176 | Bloom charter: session 26's ruling — Q2 STANDS; the renderer noise floor, the push-once amendment, the 600-line note (docs only — rules on #175) | — | no source touched |
| `e4cde33d` | 2026-09-06 | #175 | Bloom: the tip primitive — tipInto as the one owner, pillInto retired into it; the anther byte-identical, the trifid moved; JS6 and JG5 | b-geometry.js | source touched — PR claims: *byte-identical* |
| `2fee2c24` | 2026-09-06 | #174 | Bloom charter: session 25's close, and the scanner entries from sessions 22 and 24 closed (docs only — records #173) | — | no source touched |
| `928e13e1` | 2026-09-06 | #173 | Bloom panel gate: the retired-id scanner as a character walk; the 22 reworded assertion messages restored (session 25, 0 moved) | — | no source touched |
| `888a5062` | 2026-09-06 | #172 | Bloom charter: session 24's rulings and close (docs only — rules on #171) | — | no source touched |
| `a8c479d6` | 2026-09-06 | #171 | Bloom: the Vogel disc's inner limit — the annulus law at rFil + rSty, always; JS5 | b-geometry.js,bloom.js | source touched — PR claims: *bit-identical* |
| `b847f81d` | 2026-09-06 | #170 | Bloom charter: session 23's ruling and close (docs only — rules on #169) | — | no source touched |
| `00dc4b23` | 2026-09-06 | #169 | Bloom panel: CENTER as a container below HEAD; off keeps the settings, said; the spread's dead travel on the control; the FILAMENT-AGAINST-STYLE flag (session 23, 0 moved) | b-geometry.js,b-registry.js,bloom.css,bloom.js | source touched — PR claims: *0 moved* |
| `fd291b4c` | 2026-09-06 | #168 | Bloom charter: session 22's rulings and close (docs only — rules on #167) | — | no source touched |
| `a8a22f23` | 2026-09-06 | #167 | Bloom phase 2 B3: the gynoecium — a style through the slab on the axis, the TRIFID stigma, JG1–JG4, the four-state centre; ships ABSENT | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `c4d76e82` | 2026-09-06 | #166 | /print: the fan — strokes that converge at a part's base and spread toward its tip | — | no source touched |
| `6335ac4b` | 2026-09-05 | #165 | Bloom charter: session 21's rulings and close (docs only — rules on #164) | — | no source touched |
| `d1931b2d` | 2026-09-05 | #164 | Bloom phase 2 B2: the androecium — filaments through the slab, the PILL anther, a Vogel disc beside the ring, JS1–JS4; ships ABSENT | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 moved* |
| `f990e2df` | 2026-09-05 | #163 | /print: shape-derived shading direction — one axis per part, strokes along it, an axial ramp | — | no source touched |
| `a65d16df` | 2026-09-05 | #162 | Bloom charter: session 20's rulings (docs only — rules on #161) | — | no source touched |
| `258c2ea6` | 2026-09-05 | #161 | Bloom phase 2 B1: retire the centre rig (DISC / DOME / RING and the CENTER section); the default is a bare apex; phase15 frozen | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *509 movers* |
| `d631d9f3` | 2026-09-05 | #160 | /print: tonal fill — the silhouette inked, veins reserved out of it, a darkness per part | — | no source touched |
| `8524318b` | 2026-09-05 | #159 | Bloom charter: session 19's rulings (docs only — rules on #158) | — | no source touched |
| `163a8ad2` | 2026-09-05 | #158 | Bloom: the solid-angle coverage instrument — validated, calibrated, and wired with Eva's four pins | — | no source touched |
| `92aaa214` | 2026-09-05 | #157 | /print: authored infill — cross-hatch and line-flow inside the silhouette | — | no source touched |
| `dddd9344` | 2026-09-05 | #155 | Bloom: the full-sphere head — CAP / SPHERE, the Head section, S1–S4, the sheet | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `d9c7105a` | 2026-09-05 | #156 | Print: load any .glb bundle at runtime | — | no source touched |
| `0589c55b` | 2026-09-05 | #153 | /print: live line art — silhouette and crease edges, chained, curated and smoothed into drawn contours | — | no source touched |
| `53128458` | 2026-09-05 | #154 | Bloom tags: verify the published set against the remote, and record why phase5 cannot be | — | no source touched |
| `dfeca61f` | 2026-09-05 | #152 | Bloom: the named smoke subset, its drift guard, and the iteration conventions | — | no source touched |
| `cd6f40e6` | 2026-09-04 | #151 | Pose the flower: stem bend points and a bloom hinge | — | no source touched |
| `527a4791` | 2026-09-04 | #150 | Scaffold the /print 3D viewport | — | no source touched |
| `2cd3e14b` | 2026-09-04 | #149 | Bloom: the petal curl family — curl bias, curl start, roll taper, cup gradient — on the domed hub | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `6b8e94b6` | 2026-09-04 | #148 | Bloom: session 15 outcome doc — dome lean, Q1/Q2/Q3 | — | no source touched |
| `c6218e60` | 2026-09-04 | #147 | Bloom: dome lean — a per-ring cap correction closing the crown gap | b-geometry.js,bloom.js | source touched — PR claims: *byte-identical* |
| `2f2be7a2` | 2026-09-04 | #146 | Bloom: the domed hub — head rise, the whorl primitive's height argument completed | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *byte-identical* |
| `7ffcbff8` | 2026-09-03 | #145 | Bloom: the print-preview toggle, depth to six without a clamp, and the crowding fine pass | b-geometry.js,b-registry.js,bloom.html,bloom.js | source touched — PR claims: *byte-identical* |
| `174cc2f3` | 2026-09-03 | #144 | Bloom: foot crowding — the instrument, as a FLAG, with its sheet | — | no source touched |
| `09c395b6` | 2026-09-03 | #140 | Bloom: per-petal sliders for the FAN, the panel as drop-downs, and the all-petals group | b-geometry.js,b-registry.js,bloom.css,bloom.js | source touched — PR claims: *30 moved* |
| `b7574808` | 2026-09-03 | #143 | Patent page: plain-English summary + collapsible legal abstract | — | no source touched |
| `44839350` | 2026-09-03 | #134 | Cards: the font system — Google Fonts catalog, uploads, ink-centred court letter, folding panel, sticky preview | — | no source touched |
| `7af6b3b6` | 2026-09-03 | #132 | Tracker: unicode folds, tag grouping, 10-field paste, table geocoding, map results panel | — | no source touched |
| `5ba3507f` | 2026-09-03 | #141 | Field Notes: Textile 101 (unnumbered, BASICS) | — | no source touched |
| `b79a6136` | 2026-09-03 | #142 | Thermochromic Collection: process clips and stills | — | no source touched |
| `a260ff14` | 2026-09-03 | #136 | Field Notes No. 02, 05–07: Quantifying Comfort, Textile Stretch Simulator, Conductive Trace Resistance, Color Change | — | no source touched |
| `74f649c3` | 2026-09-02 | #139 | Gauge reader: the sub-repeat test for doubled course periods (knit_05/08) | — | no source touched |
| `98dcdbe7` | 2026-09-02 | #138 | Gauge reader: CI for the pytest suite, a pinned ground-truth scorecard, and "lost" means lost | — | no source touched |
| `d8bd63a9` | 2026-09-02 | #137 | Charter: the Sep 2 duplicate-session incident, second occurrence | — | no source touched |
| `43507dbe` | 2026-09-02 | #133 | Bloom: the VIEW box — five presets, the FAN's immediate top-down snap, and the amendment | b-registry.js,bloom.html,bloom.js | source touched — PR claims: *0 moved* |
| `7974ad94` | 2026-09-02 | #131 | Charter: the Sep 2 duplicate-session incident, and what it replicated | — | no source touched |
| `ce011af2` | 2026-09-02 | — | Cards: add global Style section (corner inset, font, glyph scale, glyph offset) | — | no source touched |
| `64850c78` | 2026-09-02 | #129 | Bloom: the FAN placement — a symmetric arc, and the azimuth nobody measured | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 moved* |
| `7877bdf6` | 2026-09-01 | #128 | Bloom: zygomorphy, session B — the mirror plane, slot roles and the orchid | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 moved* |
| `f6268282` | 2026-09-01 | #126 | Bloom: zygomorphy, session A — the override architecture and per-layer roles | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *bit-identical* |
| `153c5f54` | 2026-09-01 | #125 | Tracker: slide-in detail panel, and paste an image straight into an entry | — | no source touched |
| `97db20d7` | 2026-09-01 | #121 | Add artist-tracker.html: private artist/tattoo-artist ledger | — | no source touched |
| `e77bf67d` | 2026-09-01 | #124 | Bloom: the continuous phyllotactic spiral — one law, two quantizers | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `c1886d0b` | 2026-09-01 | #123 | Bloom: the arrangement grows up — layers and spiral placement | b-geometry.js,b-registry.js,bloom.js | **source touched — no byte claim in the message** |
| `d83c72c4` | 2026-09-01 | #122 | Add GET /version so deployed-code staleness is checkable, not guessed | — | no source touched |
| `26f0577e` | 2026-09-01 | #118 | Fix "online but Analyze unreachable": threadpool CV, cold-start retry, honest banner | — | no source touched |
| `deacded1` | 2026-09-01 | #120 | Bloom: group the control panel into sections, declared in the registry | b-registry.js,bloom.css,bloom.js | source touched — PR claims: *bit-identical* |
| `a5cac8b6` | 2026-08-31 | #119 | Bloom: the thickness layer, and the tip comes to a point | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *117 moved* |
| `497d0eb7` | 2026-08-31 | #116 | Add /cards playing-card deck builder (MVP scaffold) | — | no source touched |
| `3c542fb2` | 2026-08-31 | #115 | Bloom: the petal's 3D form — four curves, and DISC as the shipping centre | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *76 moved* |
| `66269612` | 2026-08-31 | #114 | Bloom: the petal silhouette model — width profile over a trimmable domain | b-geometry.js,b-registry.js,bloom.js | source touched — PR claims: *0 of 76 configs moved* |
| `21d46021` | 2026-08-31 | #113 | Bloom: the designed centre as an A/B rig, spread exposed, spread default 2.00 | b-geometry.js,b-registry.js,bloom.css,bloom.js | source touched — PR claims: *57 moved* |
| `37e160d9` | 2026-08-31 | #112 | Bloom: scaffold the Parametric Bloom — whorl of sheet petals, one solid, gated | b-geometry.js,b-registry.js,bloom.css,bloom.html,bloom.js | **source touched — no byte claim in the message** |
| `e93c8f82` | 2026-08-30 | #109 | Textile gauge reader: touch fix, device-aware wheel zoom, calibration popup, grid box + ground truth, black measurement boxes | — | no source touched |
| `11091ab0` | 2026-08-28 | #107 | Flower: the junction gates, merged ahead of the law they gate | — | no source touched |
| `78c17df7` | 2026-08-28 | #104 | Flower: delete the junction probe's ripple estimator — it could never return a value | — | no source touched |
| `d6f237de` | 2026-08-28 | #101 | Flower: the junction A/B rig, and the panel stops lying (three approach laws measured, rejected, removed) | f-registry.js,f-sdf.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `ca3a1eb7` | 2026-08-28 | #102 | Flower: a probe that measures whether the junction is a continuation or a skin | — | no source touched |
| `28626a51` | 2026-08-28 | #99 | Flower: retire SURFACE RELIEF, and the id-reservation machinery M2–M6 reuse | f-geometry.js,f-registry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `0dff8c1f` | 2026-08-27 | #95 | Flower: the tooth mid-veins that outlived their teeth (E3), and SCALLOPED delisted (E2) | f-geometry.js,f-presets.js,f-registry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `c252e7fe` | 2026-08-27 | #91 | Flower: panel chrome — flush-right full-height panel, section tick rail, collapse to nothing | flower.html | source touched — PR claims: *byte-identical* |
| `4a58d9c4` | 2026-08-26 | #86 | Flower: the junction is unconditional — the bloom is one piece | f-registry.js,flower.js | source touched — PR claims: *67 moved* |
| `868b3553` | 2026-08-25 | #85 | Flower: the connectedness gate can see the bare bloom, and the dead ground around the junction is gone | flower.js | source touched — PR claims: *byte-identical* |
| `62a14144` | 2026-08-25 | #82 | Flower: the petal's material boundary inset by the rib — one producer, and the partition it unblocks | f-geometry.js | source touched — PR claims: *byte-identical* |
| `8b7d7f83` | 2026-08-25 | #80 | Flower: the partition's instruments — void-crossing, symmetry, tile's denominator | — | no source touched |
| `1e5050ed` | 2026-08-25 | #81 | Flower: one definition of "is this point in the material", read by everything | f-geometry.js | source touched — PR claims: *BYTE-IDENTICAL* |
| `389d05f4` | 2026-08-24 | #77 | Flower: Voronoi clips against the part of the bound that has width | f-geometry.js | source touched — PR claims: *byte-identical* |
| `49e820c3` | 2026-08-24 | #76 | Flower: no zero-area cell reaches the exporter, and two assertions to keep it that way | f-geometry.js | source touched — PR claims: *byte-identical* |
| `a671fdf3` | 2026-08-24 | #69 | Flower: the shape family is gated on its enabling parameter | f-registry.js,flower.js | source touched — PR claims: *byte-identical* |
| `f150cb0f` | 2026-08-24 | #67 | Flower: the tier gate asserts every wired control, both tiers, whole matrix | flower.js | source touched — PR claims: *byte-identical* |
| `6580f835` | 2026-08-24 | #65 | Flower: the registry declares visibility conditions, not names for them | f-registry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `648cb86f` | 2026-08-23 | #59 | Flower: bilateral FAN was never broken — lift the quarantine, add the gate that would have caught it (#54) | f-registry.js,flower.js | **source touched — no byte claim in the message** |
| `1a445a18` | 2026-08-23 | #57 | Flower: LOBED joins the Standard picker, with a bundle that commits | f-registry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `59f8ac10` | 2026-08-23 | #58 | Flower: TOOTHED and SCALLOPED ride the marginal strands | f-geometry.js,f-registry.js,flower.js | source touched — PR claims: *byte-identical* |
| `9f64b75c` | 2026-08-22 | #56 | Flower: replace unresolvable issue refs with real ones (comments only) | f-geometry.js,f-presets.js,flower.js | **source touched — no byte claim in the message** |
| `0eab4082` | 2026-08-22 | #51 | Flower: cap each opening once — removes duplicated bead triangles | flower.js | source touched — PR claims: *byte-identical* |
| `29c1a7dc` | 2026-08-22 | #50 | Flower: one producer for the petal boundary — cleft margin seals | f-geometry.js,flower.js | source touched — PR claims: *byte-identical* |
| `be6a0d24` | 2026-08-22 | #49 | Flower: BLOOM GRADIENTS (curl + size) plus CURL START | — | no source touched |
| `24aabbd3` | 2026-08-22 | — | Add browser-based dress shape editor (Upload / Shape / Shells / Panels) | — | no source touched |
| `cb896e36` | 2026-08-21 | #48 | Flower: SPINE CURL — flat → arc → full circle → fiddlehead crozier | f-geometry.js,f-registry.js,flower.html,flower.js | **source touched — no byte claim in the message** |
| `ada2dadf` | 2026-08-21 | #47 | Flower: make chrysanthemum reachable (width floor, relative tip fineness, tip-shape to Standard, organic variance) | f-geometry.js,f-registry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `571b85ee` | 2026-08-21 | #46 | Add petal cross-section: flat -> channelled -> quilled -> spoon | f-geometry.js,f-registry.js,flower.html,flower.js | **source touched — no byte claim in the message** |
| `23b83f6f` | 2026-08-21 | #45 | Flower: replace input-proxy complexity cap with an output triangle budget (#44) | f-geometry.js,flower.html,flower.js | source touched — PR claims: *byte-identical* |
| `5a88975c` | 2026-08-21 | — | Flower codebase audit: dead code, drift collapse, junction/ornament tags, CI wiring | f-geometry.js,f-registry.js,flower.js | source touched — PR claims: *byte-identical* |
| `4412dd7d` | 2026-08-20 | #32 | Rename to "Automatic Textile Gauge Reader" (was "AI...") | — | no source touched |
| `66709f01` | 2026-08-20 | #26 | Gauge detector: ground-truth + metamorphic test harness, and the three fixes it found | — | no source touched |
| `86386ce1` | 2026-08-20 | #21 | Textile Gauge Reader: box-selection verify-repeat, auto ruler calibration, on-image ruler | — | no source touched |
| `10b9570b` | 2026-08-20 | #40 | Merge pull request #40 from evawm898/claude/infill-margin-registration | — | no source touched |
| `b06ffe40` | 2026-08-20 | #38 | Merge pull request #38 from evawm898/claude/flower-standard-mode | — | no source touched |

_170 first-parent merges into `main`, 2026-08-20 → 2026-09-18. "source files touched" is restricted to the twelve generator/app files; `b-` = `bloom-`, `f-` = `flower-`. The byte claim is quoted from the merge commit message, not independently re-measured._

### 1b. Claims checked against the diff

Nothing was found where a merge's message claims a *geometric* outcome the diff
contradicts. Three things are worth naming anyway, because each is a claim that is
narrower, staler or differently-scoped than it reads:

1. **`#247` says "correct the #236 line" and `#242` says "#236 closed" — but GitHub issue
   #236 is still OPEN.** The code claim is supported: `f64f3bc` (#242) does stop building
   the flat zero-volume join shell and does generalise the solid root band. What did not
   happen is the issue being closed on the tracker. Same for **#237** (ST9 outside the
   mutant table), which `tools/verify-bloom-stem-channel.mjs` now addresses on the tree
   while the issue stays open. Two issues describe defects the tree has moved past.
2. **13 of the 170 merges touch generator/app source and carry no byte claim in the squash
   message.** They are `#211 #201 #194 #167 #155 #149 #124 #123 #112` (bloom) and
   `#59 #56 #48 #46` (flower). In every bloom case the partition is in the session's own
   outcome doc rather than the commit message; this is a message-completeness observation,
   not evidence that bytes moved unreported.
3. **`#243`'s message says "frozen/phase34 … (tag not pushed — the bloom-frozen-tags
   dispatch from main is Eva's)".** It has been pushed since: `frozen/phase34` is on the
   remote at `f64f3bc`, created by dispatch run 9 (35295784427, 2026-09-18). The message was
   true when written.

---

## 2. Open pull requests

Eight, all against `main`. **Seven are drafts; #64 is the only one marked ready.** None is a
bloom PR; none carries a bloom or flower *gate* result on its head — the only checks on six
of them are Netlify's three informational `neutral` checks.

| PR | branch | head | draft | age | files | checks | mergeable (local `git merge-tree`) |
|---|---|---|---|---|---|---|---|
| [#230](https://github.com/evawm898/Portfolio-Site/pull/230) | `claude/deploy-preview-snapshot` | `c6c7122` | draft | ~118 h | `docs/deploy-preview-snapshot.md` | 3 Netlify `neutral` (18 s) | clean |
| [#218](https://github.com/evawm898/Portfolio-Site/pull/218) | `claude/bold-johnson-pvec10` | `5291b49` | draft | ~146 h | `docs/project-state.md` | 3 Netlify `neutral` (18 s) | clean |
| [#111](https://github.com/evawm898/Portfolio-Site/pull/111) | `claude/flower-bloombase-phase-a-91zmld` | `d449cf3` | draft | ~19 days | 8 files incl. `flower.js`, `flower-registry.js`, `flower.html`, a new `flower-base-continuity.yml` | 8 × `verify` **success** + 3 Netlify `neutral` (2026-08-31) | clean |
| [#110](https://github.com/evawm898/Portfolio-Site/pull/110) | `claude/flower-project-discovery-91zmld` | `c1ed350` | draft | ~19 days | `docs/flower-petal-origin-surface.md` | 3 Netlify `neutral` (9 s) | clean |
| [#78](https://github.com/evawm898/Portfolio-Site/pull/78) | `claude/claudemd-trigger-gotcha` | `da26243` | draft | ~25 days | `CLAUDE.md` | 3 Netlify `neutral` (16 s) | **conflict risk** (CLAUDE.md changed on both sides) |
| [#71](https://github.com/evawm898/Portfolio-Site/pull/71) | `claude/flower-visibility-proposal-3z1hqv` | `6ac9052` | draft | ~25 days | 5 docs/tools files | 3 Netlify `neutral` (17 s) | clean |
| [#64](https://github.com/evawm898/Portfolio-Site/pull/64) | `claude/flower-project-audit-fajdza` | `0f0a129` | **ready** | ~25 days | `.gitignore`, `docs/flower-control-panel-audit.md` | 3 Netlify `neutral` (10 s) | **conflict risk** (`.gitignore`) |
| [#41](https://github.com/evawm898/Portfolio-Site/pull/41) | `claude/thermo-nuclear-code-quality-9on5p3` | `f506141` | draft | ~29 days | 15 files incl. `flower.js`, `flower-registry.js`, two new workflow files | `verify` ×2 **success**, `smoke` success, `full` skipped, 3 Netlify `neutral` (2026-08-21) | **conflict risk** (9 files changed on both sides) |

**Green and sitting.** #230, #218, #110, #71 are docs-only, mergeable, and have been
untouched for 5–25 days. **#64 is the only one a human has marked ready for review** and it
has sat 25 days. Note the charter's own trap: none of these has a *gate* result, because
none of them touches a gated path — "green" here means "Netlify had no opinion", not
"the geometry was checked".

Every one of the eight is 24–199 commits behind its merge base; #41 and #111 predate the
bloom generator entirely.

---

## 3. Branches with no open PR

Fifteen at the moment of the census, plus one checkpoint (and see the note on this session's own branch below). **Every `claude/*` branch here is "NOT an ancestor of main"
by construction** — `main` squashes, so that check answers NO on a branch that merged
perfectly, and it is not the test. What is reported instead is whether the branch's own
first commit subject appears on `main`, and whether a PR for it was closed unmerged.

| branch | head | last commit | own commits | status |
|---|---|---|---|---|
| `checkpoint/pre-stabilization-e0766f7` | `e0766f7` | 2026-08-06 | 0 | **ancestor of `main`** — a plain checkpoint tag-as-branch |
| `claude/zen-feynman-9uut0v` | `e804027` | 2026-09-18 | 0 | this session's own branch. At the moment of the census it sat exactly on `main`'s head with no commits of its own; it carries this document's single commit now, and PR #258 is its open PR — so by the time anyone reads this it belongs in §2 rather than here. Recorded as measured, corrected here rather than silently restated. |
| `claude/eva-maskalenko-portfolio-qod1hn` | `9151afe` | 2026-08-07 | 1 | merged (subject on `main` as `ace092b`), undeleted |
| `claude/flower-bloom-generator-wvxlwk` | `4655dea` | 2026-08-11 | 1 | PR #19 closed unmerged; its earlier sha merged as #16. Work on `main` by subject |
| `claude/bodice-placement-curvature-31iz21` | `7e52b6b` | 2026-08-14 | 3 | PR #31 closed unmerged; subject present on `main` by another route |
| `claude/cell-annulus-star-shape` | `738d384` | 2026-08-24 | 2 | PR #75 closed unmerged — superseded by #76 |
| `claude/lobed-voronoi-diagnosis` | `e23d7cf` | 2026-08-24 | 5 | PR #72 closed unmerged — **genuinely orphaned diagnosis work** |
| `claude/junction-phase2-stem-join` | `977aa88` | 2026-08-28 | 2 | no PR found — **genuinely orphaned** |
| `claude/flower-spine-phase-a-91zmld` | `d19a861` | 2026-08-28 | 13 | PR #105 closed unmerged — **genuinely orphaned** (the continuous-spine Phase A) |
| `claude/fan-placement-discovery-0ubyt8` | `026f583` | 2026-09-02 | 3 | PR #130 closed unmerged — the Sep 2 duplicate-session incident |
| `claude/view-presets-fan-snap-awikrc` | `49ad2c8` | 2026-09-02 | 2 | PR #135 closed unmerged — the Sep 2 second-occurrence incident |
| `claude/print-bundle-import-8k4n0a` | `a41173f` | 2026-09-05 | 3 | no PR found; subject not on `main` — **orphaned** |
| `claude/admiring-goldberg-3hmq0v` | `7a13adc` | 2026-09-10 | 1 | no PR found; subject not on `main` — **orphaned** (a session-38 root-blend discovery doc) |
| `claude/great-rubin-k566uz` | `6121c89` | 2026-09-14 | 4 | no PR found; subject not on `main` — **orphaned** (two koi-draw commits and their two reverts) |
| `claude/yarn-characterization-section-qgxjk3` | `0941573` | 2026-08-06 | 2 | PR #1 closed unmerged — **orphaned** |

The charter's standing rule is *never delete a branch without explicit approval*; nothing
here proposes deleting any of them.

---

## 4. CI in flight

**One run, at the moment of this snapshot:**

| workflow | run | sha | event | started |
|---|---|---|---|---|
| `bloom-export-watertight` | [35389501153](https://github.com/evawm898/Portfolio-Site/actions/runs/35389501153) (#245, attempt 1) | `e804027` (`main`) | push | 2026-09-18 20:05:05 Z — **219.6 min elapsed** at the snapshot |

Nothing queued. The other six jobs on that same push have already completed green —
`bloom-connectedness` (147.0 min), `bloom-panel` (4.7), `bloom-grid` (1.5),
`bloom-frozen-matrices` (0.9), `flower-export-watertight` (7.4),
`flower-geometry-quality` (1.2). The export gate on the merge commit is therefore the only
outstanding result for `main`'s current head. Its own PR head `b98cf78` ran it green in
142.8 min the day before.

Two things worth knowing about that run rather than guessing at: `get_job_logs` returns 404
while a job is running, and a matrix gate is one long step, so **there is no instrument here
that can distinguish SLOW from HUNG** — exceeding the measured spread is not evidence of a
hang.

---

## 5. Frozen tags

**33 baselines are declared** in `FROZEN_BASE_COMMITS` and 33 matrix functions exist in
`FROZEN_MATRICES`; the harness's module-load census proves the two agree in both directions
(it throws otherwise, and the harness imports cleanly — see §6).

**30 of the 33 are published on the remote, every one at its declared sha.** Verified two
ways: `git ls-remote --tags origin 'refs/tags/frozen/*'` compared entry-by-entry against
`FROZEN_BASE_COMMITS`, and the workflow's own `--check`.

**THE GAP, EXPLICITLY:** `frozen/phase5` (`deacded`), `frozen/phase22` (`2a97e96`) and
`frozen/phase23` (`7544796`) have **no tag on the remote**. They are exactly the three
entries declared in `TAG_PUSH_XFAIL` in `tools/publish-frozen-tags.sh`, each naming the
`.github/workflows` file GitHub refused the push for. `GITHUB_TOKEN` cannot be granted
`workflows` scope, so no `permissions:` block reaches it. **0 tags are missing and
undeclared; 0 point at the wrong commit.**

**Is a dispatch owed? No.** The newest registered baseline is `frozen/phase34` (778 rows at
`f64f3bc`) and it **is** published. `bloom-frozen-tags` run 11 (35359178596, dispatched from
`main` at `ae90b70`, 2026-09-18 14:54 Z) is the **first green run of that workflow** and its
verdict reads 33 declared · 30 published and correct · 3 missing but declared · 0 undeclared
· 0 wrong-commit, exit 0.

**Is a new frozen phase owed? No.** The live matrix is 852 rows and has not changed row set
since `frozen/phase34` was taken at `main`'s head before the sepals; #246, #256 and #257 each
state, and their own partitions measure, that no row was added or removed.

**One base is not on `main`'s first-parent line and never was:** `phase10`'s `4f39118`, a
mid-PR commit of #140, recovered through `refs/pull/140/head`. Its tag is the only thing
keeping that object alive, which is the whole reason the tagging rule exists. (Note the
correction already carried in `docs/bloom-frozen-tags-outcome.md`: #253's body says "all 33
bases are on main's first-parent line" and that is one row loose — 32 are.)

**What blocks the three:** nothing a session or a workflow can do. It is a property of the
token class, stable, not configurable, and declared.

---

## 6. Harness health

Measured by importing `tools/bloom-harness.mjs` in Node 22.22.2 on this tree
(`npm i --no-save playwright-core` first — the harness imports it at module load; that
install writes only to the gitignored `node_modules/`).

* **It loads.** 199 exports, no throw — so the frozen census, the `RETIRED_IDS` collision
  check, the `TIP_*_RANGE` import check and the xfail structure checks all passed at module
  load.
* **`buildMatrix()` returns 852 rows.** `bloom-smoke --check` reports **98 smoke rows over
  31 matrix blocks**, and the family census reports **102 families asserted, 102 claimed by a
  row's `path`, both directions**.
* **33 frozen matrices, 33 base commits, keys identical.** Row counts run 76 (phase2) →
  778 (phase34); note phase15 (527) → phase16 (481) is the centre retirement shrinking the
  matrix, not an error.
* **The frozen tolerance is not a tolerance.** `--verify-frozen` imports the base tree's own
  `buildMatrix()` and **deep-compares** row order, labels and set lists. There is no band and
  no epsilon; it has never compared a byte. It ran green on `main` at `e804027` in 0.9 min.
* **The wall instrument is structured and loads.** `SELF_XFAIL` carries three entries
  (`roll-max` 0.659 mm, `form-max` 0.042, `buckle-on-form` 0.254), each `{selfMm, note}`, and
  the module throws on an entry without a number; `SELF_XFAIL_TOLERANCE_MM` is `5e-4`, which
  gates the V4 `ownDeficitMm` marker (0.607 mm) as well.

### 6a. The #246 / #243 question, answered directly

**Yes, the re-emit happened, and it is verifiable on this tree without re-running anything.**

`#246` (`6999e31`, 2026-09-17 17:01) converted the xfail lists to structured entries and made
the module **refuse to load** on an entry with no number. `#243` (`eb2aaa7`, 2026-09-17 21:22)
merged four hours later. On `main` today:

* `SELF_INTERSECTION_XFAIL` holds **280 entries; 0 are in the old string form; 0 are objects
  without a number.** Sample: `"petalCup min (-0.8)" → {pairs: 384, worstMm: 0.2104}`.
* **20 of those 280 are the sepal rows** (`^SEPALS`), all structured.
* `EXPORT_REFUSED_XFAIL` holds **1 entry**, structured: `ALL MAX → {tris: 2506652}`, whose
  note records the +94,240 the sepals added over the 2,412,412 `main` read after the stem tip
  plug.

The conversion was done **on `#243`'s own branch before it merged** — its merge commit
`c99d2f5` is titled *"Merge origin/main into claude/great-ptolemy-a96x2l — the sepal xfail
entries in the magnitude gate's structured form"* and records 20 of 20 reproducing through
`bloom-xfail-magnitudes.mjs --only '^SEPALS'`, plus `ALL MAX` re-measured on the merged tree
(129,803 pairs / 3.1556 mm, withdrawing the sepal session's earlier 104,563). **The module
loading at all is the proof that no string survived**, because it throws on one.

What is *not* independently confirmed here: whether every one of the 280 magnitudes still
reproduces on today's tree. That is `node tools/bloom-xfail-magnitudes.mjs`'s job and it was
not run in this session (see §12).

---

## 7. Every declared open item

Sources, in order of authority: the two discovery docs that carry Eva's rulings verbatim, the
"Open for Eva" / "Recorded, not built" / "What is still open" sections of each outcome doc,
`CLAUDE.md`'s own recorded-not-built lines, and the xfail lists. **Nothing here is inferred** —
each row names a file and a line where the repo itself says the thing is open.

**Zero `TODO`, `FIXME`, `XXX` or `HACK` markers exist** in `tools/`, `bloom.js`,
`bloom-geometry.js`, `bloom-registry.js`, `bloom-grid-gltf.js` or `bloom.html` — measured, not
assumed. This project records open work in prose and in gate declarations, never in comment
markers, so a marker grep is not a way to find it.

### 7a. Ruled, not built — work that is authorised and has no code

These are the two largest bodies of outstanding work and both carry Eva's rulings in the repo.

| # | item | where | condition / prerequisite |
|---|---|---|---|
| 1 | **The inflorescence programme** — twelve rulings (Sep 17): the head owns the capitulum; a new top-level `Inflorescence` section with a law enum defaulting to NONE gating generated `Level k` sections; instancing Route A (each head built at the origin into its own accumulator, appended under a rigid transform, size through parameters never the matrix); the floret is a petal-count reduction with `NU` fixed; sessile means embedded by one wall thickness; per-flower editing is shared head controls plus per-node deltas; cyme controls are side × plane per level. | `docs/bloom-inflorescence-discovery.md:681-762` | **Ruling 5:** the first build session stops at instancing plus one raceme of identical florets, no presets, and *"opens only after #243 merges"* — #243 merged `eb2aaa7`, so that condition is now satisfied. **Ruling 11 is a prerequisite of that session, not a follow-up:** a predeclared product grid through the export gate and the census, sized before the first build ships. **Ruling 9 does not stand without 11.** |
| 2 | **The organic-variance programme** — seven rulings (Sep 17): interpenetration on the shipping default is an accepted look with no derived clamp; five controls (three amounts, one shared frequency, one shared phase); ranges size ±50 % and the form deltas at each control's base range; frequency told, not capped; sepals fully independent with frequency and phase defaulting to the petals'. | `docs/bloom-organic-variance-discovery.md:310-331` | **Ruling 7:** build order size → form → spacing, *"all of it after #243"* — satisfied. **Ruling 1's condition:** the told flag (tightest pitch, nearest-neighbour approach, crowding) ships with the FIRST variance PR, not with spacing. **Ruling 6 is DISCHARGED** by #257 (`e804027`) — the arc is sinc-stable. |
| 3 | **The droop / axis-curvature session** — a stem centreline, the owed pitch law, a curved root. Every site that assumes a straight axis is enumerated. | `docs/bloom-inflorescence-discovery.md` ruling 8; `docs/bloom-bell-corolla-discovery.md:461-480` | After the bell work, before any catkin or wisteria preset. |
| 4 | **The bud pose and the maturation ramp** — deferred by inflorescence ruling 6 into the bell/corolla session, which must render the bud-pose sheet and issue the effective-tilt-past-90° ruling as part of its own work. | `docs/bloom-inflorescence-discovery.md:706-710`; `docs/bloom-session-38-outcome.md` (the tilt question's origin) | No maturation ramp is designed before that sheet exists. |

### 7b. Open for Eva — a ruling is owed and no session can proceed without it

| # | question | where |
|---|---|---|
| 5 | **The bell/corolla discovery has SEVEN ranked questions and NO rulings section.** (1) Is the shipped hung head — tilt 75, cup 0.6, curl −45 — a bell for your purposes, or is the seamless tube what you want? This decides whether the corolla primitive is scheduled at all. (2) The tilt ruling: 0..90 risk-free, −30..120 with the window law, or further with a mitred seam panel nobody has costed. (3) The corolla primitive if wanted: one closed-ring panel with a fusion fraction, or a lathe. (4) Nodding: accept orientation-only, or ask for the oblique root as a stopgap. (5) The cup fold at 0.7 and up: the bell's own bound, or schedule the combination gate. (6) A "hanging" view preset as view chrome, or not. (7) #243 sequencing — **moot; #243 merged**. | `docs/bloom-bell-corolla-discovery.md:530-546` |
| 6 | **The sepals, first round — four still open.** `sepalScale` default 0.60 is the session's own pick from the sheet, unchanged pending Eva seeing it at the new height; the reflexed-seam fold is the seam owner's on the sepal angle's lower range; the two readings of "the hub's axial extent" (the join reading is built, the whole-body one would put the default 0.03 mm under the plate's mid-plane); whether 0.75 is the number for `sepalHeight`. Items 3 and 4 of that list are RESOLVED in §12. | `docs/bloom-sepals-outcome.md:365-388` |
| 7 | **The sepals, second round — four.** 0.75 at the default stem is 0.33 mm, so the sepals are still nearly tucked under the petals, and the lever may be `hubLength` rather than this fraction; the limit TIGHTENS at the default (21° → 18° interleaved, 24° → 20° aligned) and loosens to nothing on a deep hub, which is the opposite of the expectation; the join reading against the whole-body one; `sepalScale` 0.60. | `docs/bloom-sepals-outcome.md:650-661` |
| 8 | **The three-floor conflict, open for the coupon print.** `MIN_FEATURE_MM` 1.0 (a declared guess), `SHEET_THICKNESS_MM` 1.2 (the shipped sheet and the hub), `STEM_MIN_WALL_MM` 1.5 (Eva, Sep 13, a stated print requirement). Resolved by choosing nothing and blocking nothing; only a coupon print can settle the rest. | `docs/bloom-session-43-outcome.md:77-92` |
| 9 | **Nothing in this project has ever been printed**, so every print floor, the printable gap, the sheet floor, the foot width and every curvature floor are declared guesses. The parked cantilever coupon is what would settle them. `SLENDERNESS` prints `UNMEASURED — no coupon has been printed` verbatim on every build with a stamen, a style, a stem or a leaf. | `CLAUDE.md` §18b; `docs/bloom-session-32-outcome.md` |
| 10 | **Two naming risks recorded at the hub-shape merge and deliberately not fixed:** the three `hubStyle` option names may be renamed in a future PR that next touches the section, and `hubShapeAmount` sits one word from the head's own `hubShape` (CAP / SPHERE). Both were to be resolved in that same rename pass. | `f64f3bc` merge body; `docs/bloom-hub-shape-outcome.md` |
| 11 | **Two placements made without a ruling** in the leaf tip-shape session's panel restructure: Petal roles as Petal's fourth child, and the children's full names. | `docs/bloom-leaf-tip-shape-outcome.md`; `CLAUDE.md` leaf tip-shape block |

### 7c. Known defects and limits, recorded and not fixed

| # | item | where | what it blocks |
|---|---|---|---|
| 12 | **THE ROOT BLEND SELF-INTERSECTS AT `layerCount >= 3` AT THE DEFAULTS** — 0 pairs at 1 or 2 layers even at 40 petals, 72 at 3, 416 at 4. A petal crossing ITSELF, the short inner layers, `footRing()`'s boundary. 138 rows are in `SELF_INTERSECTION_XFAIL` on this account. **A multi-layer bloom is unprintable before any deformation control is touched.** | `docs/bloom-session-35-outcome.md`; `docs/bloom-session-36-outcome.md:204` (§5, the brief with all measurements) | Judging any deformation feature's printability on a multi-layer build. It is its own scheduled session and must not be folded into another PR (session 32's ruling). |
| 13 | **`tools/bloom-wall-thickness.mjs` STILL CARRIES NO INFILLED STATE**, and V5 is the only gate on self-approach. Recorded by #250, measured around by #252, measured around again by the lamina-floor session. | `docs/bloom-infill-lamina-floor.md:469-472`; `docs/bloom-infill-base-panel.md:493-497` | The infill shipping. It must gain one the day the infill lands. |
| 14 | **The hole RIMS are unsampled by anything.** Closing it needs either an emitter that subdivides its cells or a rim-aware sampler. | `docs/bloom-infill-base-panel.md` §3d; `docs/bloom-infill-lamina-floor.md:473` | The infill's printability claim. |
| 15 | **`splitRow` snaps against a fixed 0.30 whatever `seamStep` is**, so the infill's boundary does not follow the seam clearance. | `docs/bloom-infill-base-panel.md:501-504` | Named so it is not rediscovered as a defect after the ruling. |
| 16 | **The residual discrete-decision exposure in the ladder search.** The remaining case is a target NEARLY but not exactly on a sample — genuine sensitivity, at a probability nobody has measured. Interpolation is the right law and wants X0's exact float32 comparison re-derived as an ULP BOUND alongside it. | `docs/bloom-session-42-outcome.md:356-366` | Its own session: a whole-matrix byte partition, a frozen phase, a full census re-baseline and a gate-clause change. |
| 17 | **A7's `Math.min(held, blade.length)` degrades silently** — if a build stops reporting `profileU` for rows it no longer emits, A7 checks fewer held rows and says nothing. One clause closes it. | `docs/bloom-infill-base-boundary.md:301-304` | Belongs to whoever wires the infill. |
| 18 | **`measureCurvature`'s `uMin = 0.15` starts inside the basal zone and the function has no caller.** | `docs/bloom-infill-base-boundary.md:305-306` | A session that wires it owes that window a look. |
| 19 | **The petal builder folds at its own seam on a blade turned down past about −55°** — 35 pairs / 0.5333 mm at −90°, at the rim, on the slab's underside. The seam clearance law was derived for the TOP skin; the descending case is the seam owner's. Three rows declared. | `docs/bloom-sepals-outcome.md` §8; `CLAUDE.md` sepals block | The sepal angle's lower range. |
| 20 | **A leaf blade approaches the free stem under `MIN_FEATURE_MM` from `leafAngle` 70° up** — 0.824 / 0.289 / 0.000 mm at 70 / 75 / 80–90, identical on a CAP and a SPHERE and in both modes. Eva's ruled 35° reads 4.019 mm. REPORTED, NOT GATED. | `docs/bloom-leaves-outcome.md`; `CLAUDE.md` leaves block | Nothing; it is the §18a treatment applied to a second control pair. |
| 21 | **`cup × petalTipShape` self-approaches below the 1.00 mm printable gap and is not gated** — 1.031 mm at tip shape 1.20, 0.977 at 2.50, 0.832 at 3.00 on `SHIPPED cup 1.2`. **The matrix varies ONE CONTROL AT A TIME, so this is invisible to it by construction.** A COMBINATION GATE (a predeclared set of two-control products through the wall instrument) is the schedulable item. | `docs/bloom-session-32-outcome.md` §18a; `CLAUDE.md` | The same combination gate the inflorescence ruling 11 requires, and the bell/corolla question 5. |
| 22 | **The whole-mesh directed-edge census is recorded, not built** — it would have to distinguish UNMATCHED edges (a real inversion) from DUPLICATED edges only (two by-design closed shells sharing a quantised vertex, which every FRINGE row does), and a clause that did not separate them would redden rows the export contract permits. | `docs/bloom-stem-tip-plug-outcome.md` §7a; `CLAUDE.md` stem-plug block | Nothing; ST10 and O2 cover the two cases that have been found. |
| 23 | **A duplicate-expression gate is reachable with the retired-id scanner's character walk and is RECORDED, NOT BUILT.** The failure it would catch: an anchored mutation matching a re-derived expression several times and mutating only the first, so a mutant reports a clean fire while testing a third of its consumers. | `docs/bloom-session-38-outcome.md` §9b(i) | The mutant tables' own trustworthiness. |
| 24 | **`bloom-infill-base-panel.mjs` holds its own `FOOT_ROWS = 3`** while the prototype counts the feet off the rows — two answers to one question, one of them typed. | `docs/bloom-infill-lamina-floor.md:481-483` | Left alone rather than edited under a session that is not about it. |
| 25 | **`N` is fixed at 16 in every infill measurement, and `tipGamma`, `baseReach`, `ANISO` and the fillet radius are untouched.** Every trade recorded is at a fixed cell count, so a boundary that opens more lamina takes cells from nowhere. | `docs/bloom-infill-lamina-floor.md:476-479`; `docs/bloom-infill-basal-grading.md:326-329` | Letting `N` rise with the lamina is a different experiment and would move the floor's cost. |
| 26 | **The petal Voronoi infill port is blocked by the EMITTER, not the triangle budget.** Construction B is 2,496 triangles a petal against a plain 2,356 (+5.1 % on the whole bloom); what disqualifies it is that `cutThrough` fans a solid cell FLAT, so under `petalRoll` 330 — a shipped matrix row — a cell's own facet cuts through the tube and self-approach reads 0.0009 mm. **A shipping emitter must subdivide.** | `docs/bloom-infill-lamina-floor.md` §0 and §7; `CLAUDE.md` infill block | The whole infill feature. §8 of that doc costs the one control it would need. |
| 27 | **THERE IS NO INFILL IN THE GENERATOR** — `bloom-geometry.js`, `bloom-registry.js`, `bloom.js` and `bloom.html` hold 0 occurrences of the word, no control and no matrix row. It is `tools/bloom-voronoi-proto.mjs`. **A session briefed to "ship the boundary" is briefed one stage early.** | `docs/bloom-infill-lamina-floor.md` §0 | Read §0 first. |
| 28 | **Three frozen tags can never be published by any workflow** — `phase5`, `phase22`, `phase23`, declared in `TAG_PUSH_XFAIL` with the workflow file GitHub named. `GITHUB_TOKEN` is a GitHub App token and cannot be granted `workflows` scope, so no `permissions:` block reaches it. Which refs GitHub picks was NOT determined; three hypotheses are ruled out in `CLAUDE.md` and no successor mechanism is offered. | `tools/publish-frozen-tags.sh:120-124` | Nothing. The run fails on any UNDECLARED absence and calls out a declared entry that starts publishing. |
| 29 | **#231 — the export refusal costs a full build before it returns nothing.** The handler builds the export mesh and THEN checks `acc.triangleCount`; 120.4 s on `ALL MAX`. Pre-existing, filed, not fixed. | `CLAUDE.md` `ALL MAX` block; issue #231 | Nothing; the click budget now matches the download budget so it no longer crashes a gate. |
| 30 | **B2b is still parked** — the crowding-raster extensions, the anther-against-blade instrument, and an independent stamen splay (proposed and costed in the session-21 doc, not built). Today **Head rise IS the stamen splay**. | `docs/bloom-session-21-outcome.md:364-381`; `CLAUDE.md` androecium block | Nothing. |
| 31 | **The blade-to-blade crowding instrument above the root is recorded, not built.** `tools/bloom-crowding.mjs` is blind to it by design — the feet sit inside the hub slab. **A clean `D_max` is a clean BASE, never a clean bloom.** | `CLAUDE.md` crowding block | Any reading of crowding as a whole-bloom property. |
| 32 | **The lobe apex join at `lobeTipShape` 0.50 is parked**, and session 39 measured that it gets SHARPER with a third lobe (39.7° → 55.9°). Options costed in §B10.3; none taken. Session 40 found the LARGER corner is at the window's lower end (−44.743° against −39.748°), so a session opened to fix the 39.7° one would be fixing the smaller of two. | `docs/bloom-session-38-outcome.md` §B10.3; `docs/bloom-session-40-outcome.md` §1 | Nothing. |
| 33 | **`LADDER_MAX_GAP_FACTOR = 1.4` is TYPED, its stated reason is measurably not what it does, and it caps the lobe count on its own.** Session 39 ruling 2 proposes removing the arm; it was not done. Removing it entirely is not free — at coverage 0.40 the tip cap drops to 3 stations and the LIVE apex goes 0.0712 → 0.2462 mm, so **the reserve needs its own owner and a chord-error bar in mm**. | `docs/bloom-session-39-outcome.md` §1; `CLAUDE.md` gap-bound block | If that arm is ever removed, session 41's "the ladder does not pile at the new kinks" measurement must be retaken. |
| 34 | **Model B's apex is shipped; low coverage is still the remaining gap** — 1 lobe at coverage 0.10, a PHYSICAL pitch floor on a 1.8 mm window. And **an even lobe count spends its apex notch on the terminal mini-face**, which is at the print floor in both modes, so its relief is exactly zero. **NOT fixable from the lobe side** — fixing it means shortening the petal at the apex, which is `petalLength`'s and `petalTipShape`'s region, and the `u = 1` mini-face may never be collapsed. | `docs/bloom-session-42-outcome.md`; `CLAUDE.md` Model B block | Nothing; L8 asserts the parity fact in both directions. |
| 35 | **Whether 2.00 / 2.00 is the right shipped lobe tooth is OPEN, and Eva ruled it does not block** — it is a DEFAULT, not a structure, and moving it is one constant. It is hers to rule from image (a). | `docs/bloom-session-41-outcome.md` §5; `CLAUDE.md` lobe-shape block | Nothing. |
| 36 | **No mutant names L5**, so that clause rests on its own reading. Recorded, not closed. | `docs/bloom-session-41-outcome.md` §6e | Nothing. |
| 37 | **The band's extent is asserted by NOTHING — there is no ST10 for it, deliberately.** A band that is TOO SHORT is caught by the connectedness gate on `SPHERE STEM: THE BARE CORNER`; a band that is TOO LONG is caught by nothing, and the worst case is a fully solid stem that passes every gate and costs only material. The only reference available to `stemAssertions` is the SAME owner `stemPlan` read. | `docs/bloom-sphere-stem-outcome.md` §8 | Nothing; the read-out tells the band's length on every row that has one. |
| 38 | **A frozen row carries a name that describes a behaviour which no longer exists.** `STEM: GATED — SPHERE with a stem asked for` is in `frozen/phase28` and `frozen/phase29`; retiring `stemEligible` is what made its label false, and **the label CANNOT be fixed** because a frozen matrix is a verbatim snapshot. `--verify-frozen` is green on it and correct to be. | `CLAUDE.md` sphere-stem block | Nothing; that paragraph is the only place the truth can live. |
| 39 | **The sphere-stem omission's mode-dependence is INHERITED and recorded, not fixed** — over 843,600 control sets built in both modes, stem topology differs live/export on 2,400, exactly the set where the root band's `headInsideBore` differs (`dome.Rd + hubT/2`, and `hubT` is floored at export). Pre-existing, the BAND's. The available remedy is the omission's own union-over-both-modes, which is one condition and its own PR. | `docs/bloom-stem-tip-plug-outcome.md`; `CLAUDE.md` stem-plug block | Nothing. |
| 40 | **`assets/print-test/` still names itself a fixture and is load-bearing for three merged `/print` stages.** Renaming it is a rename in three tools plus `print.js`; deferred once per session so far. | `CLAUDE.md` `/print` block | A different project area. |

### 7d. xfail entries declared WITHOUT a magnitude bar

#213/#246 made every BLOOM xfail entry carry a number the gate reads, in both directions, and
the modules **refuse to load** on an entry with no number. So within the bloom's own lists there
are **zero** magnitude-free entries: `SELF_INTERSECTION_XFAIL` 280 of 280 structured,
`EXPORT_REFUSED_XFAIL` 1 of 1, the wall instrument's `SELF_XFAIL` 3 of 3 and its V4 marker 1 of 1.

What is declared without a magnitude, and why each is a "whether" rather than a "how much":

| list | entries | carries |
|---|---|---|
| `TAG_PUSH_XFAIL` (`tools/publish-frozen-tags.sh:120`) | 3 — `phase5`, `phase22`, `phase23` | the workflow file GitHub named. A credential refusal has no magnitude. |
| `TRI_COUNT_XFAIL_BY_CHANGE` (`tools/verify-bloom-seam-bytes.mjs:160`) | 1 for `seam`, 3 for `widest`, **0 declared explicitly for `arc`** | a triangle-count transition as a string (`'168256 -> 170816'`). These ARE magnitudes; the `arc` entry is `{}` by declaration and the tool REFUSES a change whose name is not in the table. |
| the FLOWER connectedness gate (`tools/verify-connectedness.mjs`) | 6 rows, all `xfail: 106` | an issue number only. The gate FAILS HARD when one starts passing, which is the lifecycle that makes a magnitude unnecessary there. |
| the FLOWER junction-continuity gate (`tools/verify-junction-continuity.mjs:104`) | 1 — `XFAIL_LAW_MISSING_ISSUE = 106` | an issue number only, with the same XPASS-fails-hard lifecycle. |

### 7e. Documentation inconsistencies found by this audit

Recorded, **not fixed** — this session changes nothing.

| # | what | evidence |
|---|---|---|
| 41 | **`CLAUDE.md` and `#242`'s merge body say "#236 is CLOSED by #242"; GitHub issue #236 is OPEN.** Issue #237 is in the same state. The CODE claim is not disputed — the hub-shape session measured the fix — but the issue tracker and the prose disagree, and the inflorescence rulings PR explicitly authorised correcting the `CLAUDE.md` line. | `mcp__github__list_issues` state=open returns #236 and #237; `CLAUDE.md` sphere-stem block; `f64f3bc`. |
| 42 | **`CLAUDE.md`'s session-36 block describes an xfail list that no longer exists in that form.** It says "a 318-ROW XFAIL LIST MEASURED ON `main`" and "its 138 rows are in the xfail list by name" for the root blend. The list on `main` today is **280 entries**, and **zero of them mention "root blend"** — the seam session (#210) removed that tag from every row by name and replaced it with two real classes (EFFECTIVE TILT PAST 90, SEAM CLAMPED). The root-blend DEFECT is still real (item 12); what is stale is the sentence describing how the list records it. | `node -e` over `H.SELF_INTERSECTION_XFAIL`; `docs/bloom-session-38-outcome.md`. |
| 43 | **`CLAUDE.md`'s smoke-subset figure is stale.** The leaves block records "85 rows, 29 blocks, 90 families"; `node tools/bloom-smoke.mjs --check` on `e804027` reports **98 smoke rows over 31 matrix blocks of 852 rows** and **102 families**, both directions. Two blocks and twelve families have been added since that sentence was written, and they account for the difference exactly: block 34 (the hub's shape) and block 35 (sepals), and the families LF9 + ST11 + SP0–SP9 = 12. Nothing is broken — the census is a biconditional and passes — but the number in the prose is not the number the tool prints. | `node tools/bloom-smoke.mjs --check`; `CLAUDE.md` leaves block. |
| 44 | **13 of the last 30 days' merges touched generator source and their squash messages carry no byte claim.** Listed in §1b. The project's own convention is that a source-touching merge states its partition or says why none is owed; these do not, and in most cases the reason is visible (a tool-only change, a gate-only change) but is not written down in the merge. | §1b of this document. |

---

## 8. What actually ships — every control the panel exposes today

Read out of `bloom-registry.js` on `e804027` by importing it in Node, not transcribed from any
doc. **146 controls in 34 sections; 12 retired ids; all 146 carry a `visibleWhen` predicate;
30 are visible at `DEFAULTS`.**

Three things about this table that are easy to misread:

* **"visible at DEFAULTS" is the panel as it opens** — it is not a statement about whether a
  control is reachable. Every one of the 116 hidden controls is reachable by moving the control
  that guards it (`stemLength` off 0, `sepalCount` off 0, `leafLength` off 0, `stamenCount` off
  0, `gynoecium` off NONE, `lobeDepth` off 0, `fringeCount` off 0, `buckleAmp` off 0,
  `petalSpineCurl` off 0, `petalRoll` off 0, and the placement and head-shape enums).
* **`role`** is the registry's own field and is what `PLACEMENT_SUBS` / `STEM_SUB_IDS` /
  `CURL_SUBS` read; it is not a section.
* **The panel nests to three levels** and `verifySections()` enforces that a parent is declared
  before its child. A container may hold no control of its own (`petal`, `center`, `sepals` and
  `stem` are containers; their own rows live in children).

### 8a. The panel tree, in declaration order

- `arrangement` — Arrangement *(open at first load)*
- `petal` — Petal
  - `shape` — Petal shape
    - `lobes` — Lobes
    - `fringe` — Fringe
  - `form` — Petal form
  - `curl` — Petal curl
  - `roles` — Petal roles
    - `labellumGroup` — Petal 1
    - `hoodGroup` — ‹derived label›
    - `petal1` — Petal 1
    - `petal2` — Petal 2
    - `petal3` — Petal 3
    - `petal4` — Petal 4
    - `petal5` — Petal 5
    - `petal6` — Petal 6
    - `petal7` — Petal 7
    - `petal8` — Petal 8
    - `petal9` — Petal 9
- `head` — Head
- `center` — Center
  - `androecium` — Androecium
    - `antherTip` — Anther
  - `gynoecium` — Gynoecium
    - `stigmaTip` — Stigma
- `sepals` — Sepals
  - `sepalShape` — Sepal shape
  - `sepalForm` — Sepal form
  - `sepalCurl` — Sepal curl
- `stem` — Stem
  - `hub` — Hub
  - `leaves` — Leaves
    - `leafSerration` — Serration
- `thickness` — Part thickness

`hoodGroup`'s label is the panel's one DERIVED summary — `labelFrom(ui)` in `SECTIONS`, with
`sectionLabel()` the single owner for the app, the gate and the sheets, and `verifySections()`
refusing a literal beside a derivation.

### 8b. The 146 controls

| # | id | panel path | label | range | default | role | visible at DEFAULTS |
|---|---|---|---|---|---|---|---|
| 1 | `petalCount` | Arrangement | Petals | 3 – 40, step 1 | `8` | petal | yes |
| 2 | `petalLength` | Petal › Petal shape | Petal length | 20 – 60, step 1 | `35` | petal | yes |
| 3 | `petalWidth` | Petal › Petal shape | Petal width | 8 – 30, step 1 | `16` | petal | yes |
| 4 | `petalBaseTaper` | Petal › Petal shape | Base taper | 0.3 – 3, step 0.05 | `1` | petal | yes |
| 5 | `petalTipShape` | Petal › Petal shape | Tip shape | 0.6 – 3, step 0.05 | `1.7` | petal | yes |
| 6 | `petalTipTaper` | Petal › Petal shape | Tip taper | 0.6 – 4, step 0.05 | `1.8` | petal | yes |
| 7 | `petalTipEnd` | Petal › Petal shape | Squared end | 0 – 1, step 0.05 | `0` | petal | yes |
| 8 | `fringeCount` | Petal › Petal shape › Fringe | Teeth | 0 – 10, step 1 | `0` | petal | yes |
| 9 | `fringeDepth` | Petal › Petal shape › Fringe | Tooth depth | 0.05 – 0.5, step 0.01 | `0.2` | petal | no |
| 10 | `lobeDepth` | Petal › Petal shape › Lobes | Lobe depth | 0 – 1, step 0.01 | `0` | petal | yes |
| 11 | `lobeCount` | Petal › Petal shape › Lobes | Lobes | 1 – 10, step 1 | `6` | petal | no |
| 12 | `lobeCoverage` | Petal › Petal shape › Lobes | Coverage | 0.1 – 1, step 0.05 | `0.8` | petal | no |
| 13 | `lobeCrestShape` | Petal › Petal shape › Lobes | Crest | 0.6 – 3, step 0.05 | `2` | petal | no |
| 14 | `lobeNotchShape` | Petal › Petal shape › Lobes | Notch | 0.6 – 3, step 0.05 | `2` | petal | no |
| 15 | `petalCup` | Petal › Petal form | Petal cup | -0.8 – 1.2, step 0.01 | `0` | petal | yes |
| 16 | `petalCupGradient` | Petal › Petal form | Cup gradient | -0.8 – 1.2, step 0.01 | `0` | petal | yes |
| 17 | `buckleAmp` | Petal › Petal form | Margin buckle | 0 – 0.6, step 0.01 | `0` | petal | yes |
| 18 | `buckleFreq` | Petal › Petal form | Buckle frequency | 1 – 7, step 1 | `3` | petal | no |
| 19 | `buckleEnv` | Petal › Petal form | Buckle reach | 2 – 6, step 0.1 | `3` | petal | no |
| 20 | `petalApexSweep` | Petal › Petal form | Apex sweep | 0 – 1, step 0.05 | `0` | petal | yes |
| 21 | `petalTilt` | Petal › Petal curl | Petal tilt | 0 – 75, step 1 | `25` | petal | yes |
| 22 | `petalSpineCurl` | Petal › Petal curl | Spine curl | -180 – 360, step 5 | `0` | petal | yes |
| 23 | `curlBias` | Petal › Petal curl | Curl bias | 0 – 1, step 0.01 | `0` | petal | no |
| 24 | `curlStart` | Petal › Petal curl | Curl start | 0 – 0.95, step 0.01 | `0` | petal | no |
| 25 | `petalRoll` | Petal › Petal form | Cross-section roll | -330 – 330, step 5 | `0` | petal | yes |
| 26 | `petalRollTaper` | Petal › Petal form | Cross-section taper | -1 – 1, step 0.01 | `0` | petal | no |
| 27 | `petalTwist` | Petal › Petal curl | Twist | -180 – 180, step 5 | `0` | petal | yes |
| 28 | `sheetThickness` | Part thickness | Sheet thickness | 0.6 – 2.4, step 0.05 | `1.2` | petal | yes |
| 29 | `tipThinning` | Part thickness | Tip thinning | 0 – 0.8, step 0.01 | `0` | petal | yes |
| 30 | `footDelicacy` | Part thickness | Foot delicacy | 0.25 – 1, step 0.01 | `1` | petal | yes |
| 31 | `spread` | Arrangement | Spread | 0.6 – 6, step 0.05 | `2` | arrangement | yes |
| 32 | `hubShape` | Head | Hub shape | `CAP / SPHERE` | `CAP` | arrangement | no |
| 33 | `headRise` | Head | Head rise | 0 – 1, step 0.01 | `0` | arrangement | yes |
| 34 | `placement` | Arrangement | Placement | `RADIAL / SPIRAL / CONTINUOUS / FAN` | `RADIAL` | arrangement | yes |
| 35 | `fanPerSide` | Arrangement | Petals per side | 1 – 8, step 1 | `3` | arrangement | no |
| 36 | `fanSpacing` | Arrangement | Petal spacing | 15 – 170, step 1 | `45` | arrangement | no |
| 37 | `fanCenterPetal` | Arrangement | Petal on mirror line | `OFF / ON` | `ON` | arrangement | no |
| 38 | `layerCount` | Arrangement | Depth | 1 – 6, step 1 | `1` | arrangement | yes |
| 39 | `layerSize` | Arrangement | Shrink | 0.35 – 0.9, step 0.01 | `0.72` | arrangement | no |
| 40 | `layerPhase` | Arrangement | Layer offset | 0 – 1, step 0.01 | `0.5` | arrangement | no |
| 41 | `layerTilt` | Arrangement | Tilt step | 0 – 30, step 1 | `12` | arrangement | no |
| 42 | `allCurl` | Petal › Petal roles | All curl | -180 – 360, step 5 | `0` | petal | yes |
| 43 | `allCup` | Petal › Petal roles | All cup | -0.8 – 1.2, step 0.01 | `0` | petal | yes |
| 44 | `innerCurl` | Petal › Petal roles | Inner curl | -180 – 360, step 5 | `0` | petal | no |
| 45 | `innerCup` | Petal › Petal roles | Inner cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 46 | `labellumSize` | Petal › Petal roles › Petal 1 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 47 | `labellumTilt` | Petal › Petal roles › Petal 1 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 48 | `labellumCup` | Petal › Petal roles › Petal 1 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 49 | `labellumCurl` | Petal › Petal roles › Petal 1 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 50 | `hoodSize` | Petal › Petal roles › ‹derived› | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 51 | `hoodTilt` | Petal › Petal roles › ‹derived› | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 52 | `hoodCup` | Petal › Petal roles › ‹derived› | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 53 | `petal1Size` | Petal › Petal roles › Petal 1 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 54 | `petal1Tilt` | Petal › Petal roles › Petal 1 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 55 | `petal1Cup` | Petal › Petal roles › Petal 1 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 56 | `petal1Curl` | Petal › Petal roles › Petal 1 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 57 | `petal2Size` | Petal › Petal roles › Petal 2 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 58 | `petal2Tilt` | Petal › Petal roles › Petal 2 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 59 | `petal2Cup` | Petal › Petal roles › Petal 2 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 60 | `petal2Curl` | Petal › Petal roles › Petal 2 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 61 | `petal3Size` | Petal › Petal roles › Petal 3 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 62 | `petal3Tilt` | Petal › Petal roles › Petal 3 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 63 | `petal3Cup` | Petal › Petal roles › Petal 3 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 64 | `petal3Curl` | Petal › Petal roles › Petal 3 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 65 | `petal4Size` | Petal › Petal roles › Petal 4 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 66 | `petal4Tilt` | Petal › Petal roles › Petal 4 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 67 | `petal4Cup` | Petal › Petal roles › Petal 4 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 68 | `petal4Curl` | Petal › Petal roles › Petal 4 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 69 | `petal5Size` | Petal › Petal roles › Petal 5 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 70 | `petal5Tilt` | Petal › Petal roles › Petal 5 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 71 | `petal5Cup` | Petal › Petal roles › Petal 5 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 72 | `petal5Curl` | Petal › Petal roles › Petal 5 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 73 | `petal6Size` | Petal › Petal roles › Petal 6 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 74 | `petal6Tilt` | Petal › Petal roles › Petal 6 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 75 | `petal6Cup` | Petal › Petal roles › Petal 6 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 76 | `petal6Curl` | Petal › Petal roles › Petal 6 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 77 | `petal7Size` | Petal › Petal roles › Petal 7 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 78 | `petal7Tilt` | Petal › Petal roles › Petal 7 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 79 | `petal7Cup` | Petal › Petal roles › Petal 7 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 80 | `petal7Curl` | Petal › Petal roles › Petal 7 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 81 | `petal8Size` | Petal › Petal roles › Petal 8 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 82 | `petal8Tilt` | Petal › Petal roles › Petal 8 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 83 | `petal8Cup` | Petal › Petal roles › Petal 8 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 84 | `petal8Curl` | Petal › Petal roles › Petal 8 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 85 | `petal9Size` | Petal › Petal roles › Petal 9 | Size | 0.5 – 2, step 0.05 | `1` | petal | no |
| 86 | `petal9Tilt` | Petal › Petal roles › Petal 9 | Tilt | -75 – 75, step 1 | `0` | petal | no |
| 87 | `petal9Cup` | Petal › Petal roles › Petal 9 | Cup | -0.8 – 1.2, step 0.01 | `0` | petal | no |
| 88 | `petal9Curl` | Petal › Petal roles › Petal 9 | Spine curl | -180 – 360, step 5 | `0` | petal | no |
| 89 | `stamenCount` | Center › Androecium | Stamens | 0 – 120, step 1 | `0` | center | yes |
| 90 | `stamenLayout` | Center › Androecium | Layout | `RING / DISC` | `RING` | center | no |
| 91 | `stamenSpread` | Center › Androecium | Stamen spread | 0.6 – 6, step 0.05 | `2` | center | no |
| 92 | `stamenLength` | Center › Androecium | Filament length | 5 – 40, step 1 | `20` | center | no |
| 93 | `stamenCurl` | Center › Androecium | Filament curl | -180 – 180, step 5 | `0` | center | no |
| 94 | `antherSize` | Center › Androecium › Anther | Size | 0.6 – 6, step 0.05 | `1.6` | center | no |
| 95 | `antherElongation` | Center › Androecium › Anther | Elongation | 1 – 6, step 0.05 | `2.5` | center | no |
| 96 | `antherRoundedness` | Center › Androecium › Anther | Roundedness | 0 – 1, step 0.05 | `1` | center | no |
| 97 | `antherPoints` | Center › Androecium › Anther | Points | 2 – 12, step 1 | `4` | center | no |
| 98 | `antherPinch` | Center › Androecium › Anther | Pinch | 0.05 – 7, step 0.05 | `1` | center | no |
| 99 | `antherLumps` | Center › Androecium › Anther | Lobes | 1 – 6, step 1 | `1` | center | no |
| 100 | `antherSpread` | Center › Androecium › Anther | Lobe spread | 0 – 90, step 5 | `0` | center | no |
| 101 | `stigmaSize` | Center › Gynoecium › Stigma | Size | 0.6 – 6, step 0.05 | `1.6` | center | no |
| 102 | `stigmaElongation` | Center › Gynoecium › Stigma | Elongation | 1 – 6, step 0.05 | `2.5` | center | no |
| 103 | `stigmaRoundedness` | Center › Gynoecium › Stigma | Roundedness | 0 – 1, step 0.05 | `1` | center | no |
| 104 | `stigmaPoints` | Center › Gynoecium › Stigma | Points | 2 – 12, step 1 | `4` | center | no |
| 105 | `stigmaPinch` | Center › Gynoecium › Stigma | Pinch | 0.05 – 7, step 0.05 | `1` | center | no |
| 106 | `stigmaLumps` | Center › Gynoecium › Stigma | Lobes | 1 – 6, step 1 | `3` | center | no |
| 107 | `stigmaSpread` | Center › Gynoecium › Stigma | Lobe spread | 0 – 90, step 5 | `40` | center | no |
| 108 | `gynoecium` | Center › Gynoecium | Style | `NONE / STYLE` | `NONE` | center | yes |
| 109 | `styleLength` | Center › Gynoecium | Style length | 5 – 40, step 1 | `25` | center | no |
| 110 | `styleCurl` | Center › Gynoecium | Style curl | -180 – 180, step 5 | `0` | center | no |
| 111 | `sepalCount` | Sepals | Sepals | 0 – 40, step 1 | `0` | sepal | yes |
| 112 | `sepalScale` | Sepals | Sepal size | 0.2 – 1, step 0.05 | `0.6` | sepal | no |
| 113 | `sepalHeight` | Sepals | Sepal height | 0 – 1, step 0.05 | `0.75` | sepal | no |
| 114 | `sepalPhase` | Sepals | Sepal offset | 0 – 1, step 0.01 | `0.5` | sepal | no |
| 115 | `sepalFootBreadth` | Sepals | Foot breadth | 0.25 – 1.5, step 0.05 | `1` | sepal | no |
| 116 | `sepalAngle` | Sepals › Sepal curl | Sepal angle | -90 – 90, step 1 | `0` | sepal | no |
| 117 | `sepalBaseTaper` | Sepals › Sepal shape | Base taper | 0.3 – 3, step 0.05 | `1` | sepal | no |
| 118 | `sepalTipShape` | Sepals › Sepal shape | Tip shape | 0.6 – 3, step 0.05 | `1.7` | sepal | no |
| 119 | `sepalTipTaper` | Sepals › Sepal shape | Tip taper | 0.6 – 4, step 0.05 | `1.8` | sepal | no |
| 120 | `sepalCup` | Sepals › Sepal form | Cup | -0.8 – 1.2, step 0.01 | `0` | sepal | no |
| 121 | `sepalCupGradient` | Sepals › Sepal form | Cup gradient | -0.8 – 1.2, step 0.01 | `0` | sepal | no |
| 122 | `sepalBuckleAmp` | Sepals › Sepal form | Margin buckle | 0 – 0.6, step 0.01 | `0` | sepal | no |
| 123 | `sepalBuckleFreq` | Sepals › Sepal form | Buckle frequency | 1 – 7, step 1 | `3` | sepal | no |
| 124 | `sepalBuckleEnv` | Sepals › Sepal form | Buckle reach | 2 – 6, step 0.1 | `3` | sepal | no |
| 125 | `sepalApexSweep` | Sepals › Sepal form | Apex sweep | 0 – 1, step 0.05 | `0` | sepal | no |
| 126 | `sepalRoll` | Sepals › Sepal form | Cross-section roll | -330 – 330, step 5 | `0` | sepal | no |
| 127 | `sepalRollTaper` | Sepals › Sepal form | Cross-section taper | -1 – 1, step 0.01 | `0` | sepal | no |
| 128 | `sepalSpineCurl` | Sepals › Sepal curl | Spine curl | -180 – 360, step 5 | `0` | sepal | no |
| 129 | `sepalCurlBias` | Sepals › Sepal curl | Curl bias | 0 – 1, step 0.01 | `0` | sepal | no |
| 130 | `sepalCurlStart` | Sepals › Sepal curl | Curl start | 0 – 0.95, step 0.01 | `0` | sepal | no |
| 131 | `sepalTwist` | Sepals › Sepal curl | Twist | -180 – 180, step 5 | `0` | sepal | no |
| 132 | `stemLength` | Stem | Stem length | 0 – 120, step 1 | `0` | stem | yes |
| 133 | `stemDiameter` | Stem | Stem diameter | 3 – 12, step 0.5 | `6` | stem | no |
| 134 | `hubStyle` | Stem › Hub | Hub style | `GOBLET / ANGLED / CURVED` | `GOBLET` | stem | no |
| 135 | `hubShapeAmount` | Stem › Hub | Hub amount | 0 – 2, step 0.05 | `1` | stem | no |
| 136 | `hubLength` | Stem › Hub | Hub length | 0 – 40, step 0.5 | `0` | stem | no |
| 137 | `leafLength` | Stem › Leaves | Leaf length | 0 – 120, step 1 | `0` | stem | no |
| 138 | `leafWidth` | Stem › Leaves | Leaf width | 3 – 40, step 0.5 | `17` | stem | no |
| 139 | `leafAngle` | Stem › Leaves | Leaf angle | -60 – 90, step 1 | `35` | stem | no |
| 140 | `leafNodes` | Stem › Leaves | Nodes | 1 – 8, step 1 | `3` | stem | no |
| 141 | `leafPhyllotaxy` | Stem › Leaves | Arrangement | `alternate / opposite / whorled` | `alternate` | stem | no |
| 142 | `leafTipShape` | Stem › Leaves | Tip shape | 0.6 – 3, step 0.05 | `1.3` | stem | no |
| 143 | `leafToothDepth` | Stem › Leaves › Serration | Tooth depth | 0 – 1, step 0.01 | `0.26` | stem | no |
| 144 | `leafToothCount` | Stem › Leaves › Serration | Teeth | 1 – 12, step 1 | `9` | stem | no |
| 145 | `leafCrestShape` | Stem › Leaves › Serration | Tooth tip | 0.6 – 3, step 0.05 | `2` | stem | no |
| 146 | `leafNotchShape` | Stem › Leaves › Serration | Notch | 0.6 – 3, step 0.05 | `2` | stem | no |

### 8c. The 12 retired ids

`RETIRED_IDS` in `bloom-registry.js`; `verifySections()` fails module load on a collision with a
live id, an option value, a `DEFAULTS` key or a section id, and the panel gate's route (n) fails
CI if a retired id renders, is named on the read-out's summary line, is a `__bloomMetrics()` key,
or survives as an IDENTIFIER in executable bloom source.

| id | retired at | why, in one line |
|---|---|---|
| `centerStyle` · `centerSize` · `centerRise` · `centerDish` · `centerBore` | session 20 | the centre rig retired; the centre is the reproductive parts and nothing else |
| `petalTipBreadth` · `allTipBreadth` · `innerTipBreadth` · `labellumTipBreadth` | session 32 | `TIP_PLATEAU` put a WAIST in the blade; the superellipse arrived with no incumbent |
| `antherSharpness` · `stigmaSharpness` | session 31 | replaced by the PINCH, which reads the way it behaves; `s = 2` was a singular point |
| `lobeTipShape` | session 41 | one control over TWO features, which could not point the notch at any value |

`stemEligible` is NOT in this list and that is correct: it was a PREDICATE, not a control id, so
`RETIRED_IDS` does not apply to it.

---

## 9. The instruments

**148 files at the top level of `tools/`**, plus two subdirectories (`tools/dress-shell/`,
`tools/skirt-panelizer/`) belonging to other projects. Of the 148: **26 `bloom-*`
measurement tools, 21 `verify-bloom-*` gates and byte tools, 42 `shot-bloom-*` contact
sheets**, and 59 belonging to the flower, `/print`, `/plot`, `/scene`, `/cards` and the
tracker.

**Nineteen tools are invoked by a workflow.** Every other tool in this repository is run by
hand, so it has **no discoverable last-run record at all** — that is a fact about the
instrument set, not a gap in this audit. What a session quotes from a standalone tool is
quotable only from that session's own report.

### 9a. Wired into CI

| tool | workflow | what it measures |
|---|---|---|
| `verify-bloom-export.mjs` | `bloom-export-watertight` | the 852-row matrix through a real STL export; boundary edges = 0, plus every assertion family, the self-intersection census (X0/X1/X2), orientation (O1/O2), crowding and the export-refusal clauses |
| `bloom-wall-thickness.mjs` | `bloom-export-watertight` (first step — it imports the harness NOT AT ALL, which is what buys it that position) | the EMITTED wall under a point, and SELF-approach separately; V1–V5 all abort |
| `verify-bloom-arc-stability.mjs` | `bloom-export-watertight` (before the npm install) | AS0–AS4: the uniform circular arc's displacement is bounded on every rung over ten decades of near-zero curl |
| `verify-bloom-stem-channel.mjs` | `bloom-export-watertight` (after npm install, BEFORE the browser — it imports the harness, which imports `playwright-core` at module load) | ST9 in Node on a mutated geometry module with the clause imported from the unmutated harness |
| `verify-bloom-connectedness.mjs` | `bloom-connectedness` | voxel flood fill over the same matrix; one region |
| `verify-bloom-panel.mjs` | `bloom-panel` | every registry control renders exactly once in its declared section; sixteen routes, `--negative-control` required |
| `verify-bloom-grid.mjs` | `bloom-grid` | the per-petal mid-surface capture and its `.glb`; 585 checks over 19 rows |
| `diff-bloom-bytes.mjs` · `bloom-smoke.mjs` | `bloom-frozen-matrices` | `--verify-frozen` deep-compares every frozen matrix's row definitions; the smoke census |
| `publish-frozen-tags.sh` · `publish-frozen-tags-selftest.sh` | `bloom-frozen-tags` (`workflow_dispatch` only) | creates and pushes the 33 declared baseline tags; honours `TAG_PUSH_XFAIL` |
| `verify-flower-export.mjs` · `verify-geometry-quality.mjs` · `verify-connectedness.mjs` · `verify-junction-continuity.mjs` · `verify-tier-visibility.mjs` · `dump-visibility.mjs` · `verify-registry-sync.mjs` · `gen-preset-thumbs.mjs` | the five flower workflows, `registry-sync`, `preset-thumbs` | the flower generator. **Two of these — `flower-export-watertight` and `flower-geometry-quality` — are path-filtered on `'tools/**'`, so they run on any bloom PR that adds or edits a tool.** They test flower geometry; two green flower jobs on a bloom PR are not evidence about the bloom. |

### 9b. Bloom measurement tools, standalone (26)

| tool | what it measures |
|---|---|
| `bloom-harness.mjs` | the shared headless machinery, the live matrix, all 33 frozen matrices, every assertion family, and both xfail lists. **Imports `playwright-core` at module load.** |
| `bloom-self-intersection.mjs` | the triangle–triangle census WITHIN each closed shell; `--orientation` is the per-shell signed-volume and ray-parity check |
| `bloom-xfail-magnitudes.mjs` | re-measures every declared xfail magnitude in Node in minutes (`--emit`, `--control`, `--root <tree>`) |
| `bloom-crowding.mjs` | how many feet stack on the most crowded point of the base, in EXPORT mode, from `footRing()`'s own rings. A FLAG, never a gate. Blind to blade-to-blade crowding above the root. |
| `bloom-plan-coverage.mjs` | the plan raster. Cannot read a SPHERE (the far hemisphere projects into the disc from below) — sphere rows are a labelled skip. |
| `bloom-solid-angle-coverage.mjs` | the sibling of the plan raster; rays from `footRing()`'s own sphere centre. R5 is its validity standard. |
| `bloom-sagitta.mjs` | the outline sagitta, per row pair, in millimetres |
| `bloom-ladder-gap-bound.mjs` | what `LADDER_MAX_GAP_FACTOR` actually does; reproduces every figure of item 33 in ~45 s with no browser |
| `bloom-lobe-resolution.mjs` | the samples-per-lobe floor, derived; `--table` generates `LOBE_DEMAND_ROWS`, `--verify` checks it cell for cell |
| `bloom-lobe-composition.mjs` | lobes over a fold: the same fold, or a new one? Builds each row twice. |
| `bloom-lobe-model-b.mjs` | which rim model is shipped, and what the other would do. Its verdict is DERIVED from the rows it prints. |
| `bloom-lobe-relief.mjs` | what MODEL B did to the relief fade |
| `bloom-fringe-ceiling.mjs` | the fringe count ceiling across the petal-size range |
| `bloom-sepal-contact.mjs` | the sepal angle limit against a denser drawing (4× the lattice, ¼ the step) |
| `bloom-neighbour-gap.mjs` | the interpenetration table, the grade sweep, size and form per slot, crowding under the grade. **Not wired to a gate** (its own header says so). |
| `bloom-curl-near-zero.mjs` | the near-zero curl ladder, the curl-graded whorl petal by petal, the reflexed-seam control. **Not wired to a gate.** |
| `bloom-voronoi-proto.mjs` | the Voronoi infill prototype on the real petal surface. **The only place infill exists.** |
| `bloom-voronoi-cost.mjs` | what a Voronoi petal costs, regressed from the FLOWER's own emitter |
| `bloom-basal-grading.mjs` · `bloom-infill-base-panel.mjs` · `bloom-infill-lamina-floor.mjs` | the infill's basal boundary: how far down the blade it reaches, the solid base panel, and the floor |
| `bloom-leaf-discovery.mjs` | leaves on the bloom's stem, phase A |
| `bloom-smoke.mjs` | the named smoke subset — **98 rows over 31 blocks, 102 families**, measured here by `--check` (`CLAUDE.md` still records the leaf session's 85 / 29 / 90). FOR ITERATION, NEVER FOR MERGE. `--conn` adds the flood fill. |
| `bloom-first-slot.mjs` | one owner of the slot payload for Node-side instruments |
| `bloom-soft-render.mjs` | a software rasteriser for scratch meshes |
| `compare-bloom-captures.mjs` | the retention compare |

### 9c. Bloom byte and structure tools, standalone (14)

Each takes a `git worktree` of a named base commit and compares emitted floats with
`Object.is`; each has a `--control` that must fail. None runs in CI, because which commit a
session claims to have moved nothing since is the session's to name.

`diff-bloom-bytes.mjs` (the three-capture retirement construction, `--verify-frozen`) ·
`verify-bloom-seam-bytes.mjs` (`--change seam|widest|arc`, the only one with a per-change
declaration table and a mover PREDICATE) · `verify-bloom-surface-bytes.mjs` (`--movers <regex>`)
· `verify-bloom-surface-offstation.mjs` · `verify-bloom-sepal-bytes.mjs` ·
`verify-bloom-sepal-decoupled.mjs` · `verify-bloom-leaf-bytes.mjs` ·
`verify-bloom-leaf-decoupled.mjs` · `verify-bloom-sphere-stem-bytes.mjs` (`--change band`,
`--control`, `--control-only`) · `verify-bloom-fringe-bytes.mjs` ·
`verify-bloom-petalsall-bytes.mjs` · `verify-bloom-tip-bytes.mjs` ·
`verify-bloom-winding-bytes.mjs` · `verify-bloom-rim-arc.mjs` ·
`verify-bloom-presentation-only.mjs` · `verify-bloom-apex-mutants.mjs` (the committed mutant
table: 25 mutants, `--only=<id,...>`, `--disarm`, `--neuter`, an anchor pre-check over ALL
mutants before any of them runs).

### 9d. Contact sheets (42 `shot-bloom-*`)

One per feature, each rendering the states its ruling was made on. None runs in CI; each is
run by hand and its output judged by eye. The ones a live question points at are
`shot-bloom-sepals.mjs` (→ `docs/img/sepals.png`), `shot-bloom-lamina-floor.mjs`,
`shot-bloom-apex-arc.mjs` (→ `docs/img/lobe-apex-arc.png`), `shot-bloom-serration-range.mjs`
(→ `docs/img/lobe-shape-law.png`) and `shot-bloom-hub.mjs` (→ `docs/img/hub-shape.png`).

---

## 10. The gates

**18 workflows are registered with the Actions API; 14 files exist on `main`.** The four
registered-but-absent are recorded here because a listing that shows them will otherwise look
like a discrepancy: `flower-base-continuity` and `flower-gates` have **never existed on
`main`** (they live on PR branches #111 and #41 and were registered when those branches
pushed); `Deploy static content to Pages` (`static.yml`) was **deleted on 2026-08-06** in
`2f839da`; and `Dependency Graph` is Dependabot's own dynamic workflow, not a file.

Every runtime below is the **five most recent SUCCESSFUL runs**, read from `actions_list` at
**2026-09-18 23:44Z**, as `updated_at − run_started_at`. **These are the reading of one moment
and will be wrong by the next session** — `CLAUDE.md`'s own rule is to read `actions_list`
at the time and never to quote a figure from a document, this one included.

| workflow | triggers | path filter (PR and push to `main`) | five most recent successes, minutes |
|---|---|---|---|
| **bloom-export-watertight** | PR, push `main`, dispatch | `bloom.html` `bloom.css` `bloom.js` `bloom-geometry.js` `bloom-registry.js` `tools/verify-bloom-export.mjs` `tools/bloom-wall-thickness.mjs` `tools/verify-bloom-arc-stability.mjs` `tools/verify-bloom-stem-channel.mjs` `tools/bloom-sagitta.mjs` `tools/bloom-harness.mjs` `tools/bloom-self-intersection.mjs` `tools/chromium-harness.mjs` + own yml. **`tools/verify-bloom-apex-mutants.mjs` is deliberately NOT in the filter** even though the run parses it. | **142.9 · 239.2 · 246.9 · 247.1 · 246.7** |
| **bloom-connectedness** | PR, push `main`, dispatch | as above less the wall/arc/channel/sagitta tools | **147.0 · 154.1 · 147.3 · 154.8 · 154.7** |
| **bloom-panel** | PR, push `main`, dispatch | `bloom.html` `bloom.css` `bloom.js` `bloom-registry.js` `bloom-geometry.js` `tools/verify-bloom-panel.mjs` `tools/bloom-harness.mjs` `tools/chromium-harness.mjs` + own yml | **4.7 · 4.9 · 4.0 · 4.6 · 3.7** |
| **bloom-grid** | PR, push `main`, dispatch | `bloom-geometry.js` `bloom-registry.js` `bloom-grid-gltf.js` `tools/verify-bloom-grid.mjs` + own yml | **1.5 · 2.3 · 1.7 · 1.7 · 1.6** |
| **bloom-frozen-matrices** | PR, push `main`, dispatch | `bloom-registry.js` `bloom-geometry.js` `tools/bloom-harness.mjs` `tools/diff-bloom-bytes.mjs` `tools/bloom-smoke.mjs` + own yml | **0.9 · 0.9 · 0.8 · 0.8 · 0.8** |
| **bloom-frozen-tags** | `workflow_dispatch` ONLY | — | one green run in its history: **run 11, 2026-09-18 14:54Z**. Runs 1–10 were red; run 9 (Sep 18) created twelve tags while failing its own verdict. |
| **flower-export-watertight** | PR, push `main` | the flower files **+ `'tools/**'`** | **7.4 · 7.5 · 6.4 · 7.4 · 6.7** |
| **flower-geometry-quality** | PR, push `main` | the flower files **+ `'tools/**'`** | **1.2 · 1.5 · 1.4 · 1.3 · 1.2** |
| **flower-connectedness** | PR, push `main` | `flower.js` `flower-geometry.js` `flower-sdf.js` `flower-registry.js` `flower-presets.js` `flower.html` `tools/verify-connectedness.mjs` `tools/chromium-harness.mjs` + own yml | not triggered by a bloom change |
| **flower-junction-continuity** | PR, push `main` | the flower files + `tools/verify-junction-continuity.mjs` `tools/chromium-harness.mjs` | not triggered by a bloom change |
| **flower-tier-visibility** | PR, push `main` | `flower.js` `flower-registry.js` `flower.html` + three tools | not triggered by a bloom change |
| **registry-sync** | PR, push `main` | `flower.html` `flower-registry.js` `tools/verify-registry-sync.mjs` | not triggered by a bloom change |
| **preset-thumbs** | PR, push `main` | `flower-presets.js` `flower.js` `flower-geometry.js` `flower-sdf.js` `tools/gen-preset-thumbs.mjs` `assets/presets/**` | not triggered by a bloom change |
| **textile-gauge-tests** | PR, push `main` | `textile-gauge-reader/**` | unrelated project |

### 10a. What a bloom PR actually runs, and what that is worth

A bloom PR that touches geometry and adds or edits any tool triggers **seven** verify jobs:
five bloom (`export-watertight`, `connectedness`, `panel`, `grid`, `frozen-matrices`) and two
flower (`export-watertight`, `geometry-quality`, both on their `'tools/**'` filter). **Only
five of the seven say anything about the bloom.** The recent merge bodies state it that way
("all seven verify jobs green"), which is accurate about the count and must not be read as
seven pieces of bloom evidence.

### 10b. The runtime figures moved again

`CLAUDE.md` records a widening sequence for `bloom-export-watertight` — 111 → 151.8–203.5 →
214.8 → 219.5 → 221.4 min — with the standing instruction never to quote any of them. **The
reading at 2026-09-18 23:44Z widens it once more: three of the five most recent successes are
239–247 min**, past every figure written down, and the fastest of the five is 142.9. The
spread across those five is a factor of **1.73**. This document's numbers are subject to its
own rule and should not be quoted either.

Nothing here is covered by CI for `/print`, `/plot`, `/scene`, `/cards` or the artist
tracker: no workflow names a `print*`, `plot*`, `scene*` or `cards*` path.

---

## 11. Collision map

For every outstanding item in §7, the paths a session addressing it would touch, and which
other items share them. **Paths, not a verdict** — whether two items can share a session, or
must be ordered, is Eva's call and the backlog's, not this document's.

### 11a. The hot paths, and how many items reach each

| path | items that would touch it |
|---|---|
| `bloom-geometry.js` | **1, 2, 3, 4, 5, 6, 7, 10, 12, 13, 14, 15, 16, 19, 21, 26, 27, 30, 32, 33, 34, 37, 39** — 23 of 44 |
| `tools/bloom-harness.mjs` | **1, 2, 3, 4, 5, 6, 12, 16, 17, 19, 21, 22, 23, 26, 32, 33, 36, 37** — 18 of 44. It holds the live matrix, all 33 frozen matrices, `FROZEN_BASE_COMMITS`, every assertion family, `SELF_INTERSECTION_XFAIL`, `EXPORT_REFUSED_XFAIL` and `FORM_IDS`. |
| `bloom-registry.js` | **1, 2, 3, 4, 6, 7, 10, 11, 26, 30, 32** — any item that adds, retires or re-ranges a control |
| `tools/bloom-smoke.mjs` | **1, 2, 3, 26** — any item that adds a matrix BLOCK owes a smoke block, and `--check`'s block count must rise |
| `SELF_INTERSECTION_XFAIL` (inside the harness) | **12** (138 rows come off), **16** (a whole-list re-baseline), **19**, **2**, **1** — the single most contended data structure here |
| `bladeStations` (inside `bloom-geometry.js`) | **16, 19, 32, 33** — and item 33 says explicitly that if `LADDER_MAX_GAP_FACTOR`'s 1.40 arm is removed, item 32's "the ladder does not pile at the new kinks" measurement must be retaken |
| `FROZEN_BASE_COMMITS` + `FROZEN_MATRICES` | **1, 2, 12, 16** — every item that changes the ROW SET owes a phase registered in BOTH maps, and the harness throws at module load if they disagree |
| `tools/bloom-wall-thickness.mjs` | **13, 18, 21, 26** |
| `.github/workflows/bloom-export-watertight.yml` | **21** (a combination gate would ride there), **28** (no — that is `bloom-frozen-tags.yml`) |

### 11b. Per item

| item | paths a session would touch | shares those paths with |
|---|---|---|
| **1 — inflorescence** | `bloom-geometry.js` (a new level above `footRing`, the rigid-transform append, the sessile root law) · `bloom-registry.js` (a new top-level section, a law enum, generated `Level k` sections) · `bloom.html` `bloom.css` · `tools/bloom-harness.mjs` (a new matrix block, new assertion families, `EXPORT_REFUSED_XFAIL` for `INFLO: ALL MAX`, the blanket-sweep exclusion on the `STEM_SUB_IDS` shape) · `tools/bloom-smoke.mjs` · a NEW combination-gate tool · a byte partition tool · a frozen phase in both maps | 2, 3, 4, 12, 16, 21, 26, 30, 32 — **and item 21's combination gate is the SAME instrument ruling 11 requires**, so those two are one piece of work reached from two directions |
| **2 — organic variance** | `bloom-geometry.js` (the per-slot resolver, `petalFormIsFlat`, `OVERRIDE_BOUNDS`, `footRing`'s slot descriptors) · `bloom-registry.js` (5 petal + 5 sepal controls) · `bloom.js` (the told flag in the read-out) · `tools/bloom-harness.mjs` (**`FORM_IDS` — the second owner of "is this row flat?", which session 34 records as a drift trap**, a matrix block, new families) · `tools/bloom-smoke.mjs` · `tools/bloom-neighbour-gap.mjs` · `tools/bloom-curl-near-zero.mjs` · a byte partition · a frozen phase | 1, 6, 7, 12, 16, 19 — and the SEPAL half touches every path items 6 and 7 do |
| **3 — droop / axis curvature** | `bloom-geometry.js` (`stemPlan`, `stemStations`, `buildStemInto`, `buildHubInto`, `buildLeafInto`'s petiole root, the owed pitch law) · `bloom-registry.js` · `tools/bloom-harness.mjs` (ST0–ST11) · `tools/verify-bloom-stem-channel.mjs` | 1, 37, 38, 39 — **every site that assumes a straight axis is enumerated in `docs/bloom-bell-corolla-discovery.md:461-480`** |
| **4, 5 — bell / corolla, bud pose, the tilt ruling** | `bloom-geometry.js` (`petalTilt`'s window law, `seamClearanceMm`, a closed-ring corolla primitive, `petalForm`) · `bloom-registry.js` (**`petalTilt`'s RANGE is a registry bound, so a tilt ruling is a registry change**) · `tools/bloom-harness.mjs` (A7 and the seam families) · `SELF_INTERSECTION_XFAIL` (the EFFECTIVE TILT PAST 90 class is 48 rows) | 2, 6, 7, 12, 19 — item 19 (the descending seam fold) is on the SAME control's lower range |
| **6, 7 — sepals** | `bloom-geometry.js` (`sepalAttachment`, `sepalAngleLimit`, `sepalBladeState`, `footRing`'s sepals descriptor) · `bloom-registry.js` (`sepalScale` / `sepalHeight` defaults, the 15 `SEPAL_TWINS` generated from the geometry's table) · `tools/bloom-harness.mjs` (SP0–SP9) · `tools/bloom-sepal-contact.mjs` · `tools/shot-bloom-sepals.mjs` | 2 (the sepals' own variance controls), 4/5 (the tilt range), 19 (the reflexed-seam fold is one of these items) |
| **8, 9 — the floors and the coupon print** | nothing, until a coupon is printed. Then `bloom-geometry.js`'s `MIN_FEATURE_MM`, `SHEET_THICKNESS_MM`, `STEM_MIN_WALL_MM`, `TIP_HALF_MM` and every curvature floor | **everything** — every measurement in this repository is a comparison against a line the project drew itself |
| **10 — the hub naming pass** | `bloom-registry.js` (the three `hubStyle` option names; renaming `hubShapeAmount` means `RETIRED_IDS` + a new id) · `bloom-geometry.js` · `tools/bloom-harness.mjs` (**a frozen matrix names the id as ROW DATA, and `--verify-frozen` goes red on a label edit inside one** — the retired-id scanner exempts LITERALS, which is what makes this survivable) | 1, 2, 30 — anything else that adds a registry row in the same window |
| **11 — the two panel placements** | `bloom-registry.js` `SECTIONS` only · `tools/verify-bloom-panel.mjs` (route (a) compares the tree AS BUILT against the tree as declared) | 1 (a new top-level section), 6/7 |
| **12 — the root blend** | `bloom-geometry.js` **`footRing()`** (it is that function's boundary and must NOT be a blade-side correction) · `tools/bloom-harness.mjs` (`SELF_INTERSECTION_XFAIL` — 138 rows named) · a byte partition · a frozen phase | 1, 2, 6, 16, 19, 30 — `footRing()` is also the one owner of the dome, the androecium, the gynoecium and the sepals descriptors |
| **13, 14, 15, 24, 25, 26, 27 — the infill** | `tools/bloom-voronoi-proto.mjs` (the prototype, where the whole feature lives) · `tools/bloom-infill-base-panel.mjs` `tools/bloom-infill-lamina-floor.mjs` `tools/bloom-basal-grading.mjs` · **`tools/bloom-wall-thickness.mjs` (item 13 — it must gain an infilled state)** · `bloom-geometry.js` (a subdividing emitter, `profile.laminaSlopeBreaks`) · `bloom-registry.js` (one control, costed in §8 of the lamina-floor doc) · `tools/bloom-harness.mjs` (item 17's A7 clause) · `tools/bloom-smoke.mjs` | 17, 18, 21 — **and item 21's combination gate would be the natural home for the infilled wall state item 13 needs** |
| **16 — the ladder's residual discreteness** | `bloom-geometry.js` `bladeStations` · `tools/bloom-harness.mjs` (A7, A8, X0 — X0's exact float32 comparison re-derived as an ULP bound) · `tools/verify-bloom-seam-bytes.mjs` (a new `--change` with its own declaration table and mover predicate) · a whole-matrix byte partition · a frozen phase · **a full `SELF_INTERSECTION_XFAIL` re-baseline** | 12, 19, 32, 33 — and every item that would move a station |
| **17 — A7's silent degradation** | `tools/bloom-harness.mjs` only (one clause) | 13–27 (it belongs to whoever wires the infill), 16 |
| **18 — `measureCurvature`'s window** | `tools/bloom-wall-thickness.mjs` | 13, 21, 26 |
| **19 — the descending seam fold** | `bloom-geometry.js` (`seamClearanceMm`, `bladeStations`) · `tools/bloom-harness.mjs` (A7) · `SELF_INTERSECTION_XFAIL` (3 declared rows) · `tools/bloom-sepal-contact.mjs` | 4/5 (the same control's range), 6/7, 12, 16 |
| **20 — the leaf against the stem** | reported only. If ever gated: `bloom-geometry.js` (`leafPlan`) · `tools/bloom-harness.mjs` (LF family) | 3, 21 |
| **21 — the combination gate** | a NEW tool · `tools/bloom-wall-thickness.mjs` (it is the instrument the products would run through) · `.github/workflows/bloom-export-watertight.yml` · `tools/bloom-harness.mjs` | **1 (ruling 11 makes it a prerequisite of the first inflorescence build), 5 (bell question 5), 13, 20, 26** — four separate items want this one instrument |
| **22 — the whole-mesh directed-edge census** | `tools/bloom-self-intersection.mjs` or a new tool · `tools/bloom-harness.mjs` (ST10's sibling) | 12, 26 |
| **23 — the duplicate-expression gate** | `tools/verify-bloom-panel.mjs` (the retired-id character walk is the mechanism) · `tools/bloom-harness.mjs` | 10 (the same scanner decides whether a renamed id survives as an identifier) |
| **28 — the three unpublishable tags** | `tools/publish-frozen-tags.sh` · `.github/workflows/bloom-frozen-tags.yml` | nothing. **It is dispatch-only and Eva's to fire; a session does not push frozen tags.** |
| **29 — #231, the refusal's cost** | `bloom.js` only (the STL handler's order of operations) | 1 (an `INFLO: ALL MAX` refusal row would pay the same 120 s) |
| **30 — B2b** | `bloom-geometry.js` (`footRing`'s androecium descriptor) · `bloom-registry.js` · `tools/bloom-crowding.mjs` | 1, 2, 12 |
| **31 — blade-to-blade crowding** | a NEW tool | 12, 30 |
| **32, 33, 34, 35, 36 — the lobes and the ladder bound** | `bloom-geometry.js` (`widthProfile`'s lobes block, `bladeStations`, `ladderGapFactor`, `ladderOutsideMinima`) · `tools/bloom-harness.mjs` (L0–L8, A8, `LOBE_DEMAND_ROWS`) · `tools/bloom-ladder-gap-bound.mjs` · `tools/bloom-lobe-resolution.mjs` · `tools/bloom-lobe-model-b.mjs` · `tools/verify-bloom-apex-mutants.mjs` | 16, 19 — **item 33 explicitly requires item 32's measurement to be retaken if the 1.40 arm is removed** |
| **37 — the band's unasserted extent** | `tools/bloom-harness.mjs` (`stemAssertions`) · `tools/verify-bloom-stem-channel.mjs` (an independent reference must read the EXPORTED file) | 3, 38, 39 |
| **38, 39 — the stem's two recorded facts** | `bloom-geometry.js` (`stemPlan`'s `headInsideBore`, the omission mask) · `tools/bloom-harness.mjs` (the frozen row whose label cannot be fixed) | 3, 37 |
| **40 — `assets/print-test/`** | `print.js` and three `/print` tools | nothing in the bloom |
| **41, 42, 43, 44 — the doc inconsistencies** | `CLAUDE.md` · `docs/*` · GitHub issues #236, #237 | **41 was explicitly authorised** by the inflorescence rulings ("the `CLAUDE.md` #236 line is corrected in the same PR as these rulings") and that correction has since landed in the prose while the ISSUES remain open |

### 11c. What the map says about ordering, stated as a fact rather than a recommendation

Three structures are contended by more than four items each, and each has a rule attached that
a session must satisfy whatever else it is doing:

* **`tools/bloom-harness.mjs`** — 18 items. It throws at module load if `FROZEN_MATRICES`'
  keys and `FROZEN_BASE_COMMITS`' keys disagree, and if an xfail entry has no number. Two
  sessions adding a matrix block in parallel collide in `buildMatrix()` and in the smoke
  census's block count.
* **`bladeStations`** — 4 items, and a change there moves stations, which moves
  `trimPanels()`'s split on cleft rows, which moves triangle counts, which is why
  `verify-bloom-seam-bytes.mjs`'s declaration table is PER CHANGE.
* **`SELF_INTERSECTION_XFAIL`** — 5 items. #213/#246 made every entry carry a number the gate
  reads in BOTH directions, so a session that legitimately moves a declared row's tessellation
  must re-record it in the same commit, and `node tools/bloom-xfail-magnitudes.mjs` is what
  says which.

---

## 12. What this audit cannot tell you

Stated explicitly, because a snapshot that does not name its own blind spots is read as
complete.

1. **Eva's rulings and the session backlog are outside this repository.** This session was
   told so and confirmed it: `claude/lobes-serration-status.md` is named by three sessions and
   does not exist here, and `claude/bloom-roadmap-sep-2026.md` — cited by `stemJoinThickness`'s
   own comment — does not exist either. Anything in §7 marked "open for Eva" may already have
   been ruled on somewhere this session cannot see. **The rulings that ARE in the repo** — the
   twelve inflorescence ones and the seven variance ones, both dated Sep 17 — are quoted from
   the docs that carry them and are as authoritative as anything here.

2. **Which item is next is not knowable from the code.** §7 says what is declared open and §11
   says what shares a path; neither says what Eva wants built. No ordering in this document is
   a recommendation, and where one item's doc names a prerequisite (inflorescence rulings 5, 9
   and 11; variance rulings 1 and 7) that is quoted, not inferred.

3. **No gate was run.** Not `bloom-smoke`, not the export gate, not the connectedness gate,
   not a single `--negative-control`. The harness was IMPORTED in Node to read its own
   declarations — that is what proves the module loads and what the counts are — and nothing
   was built, exported or rendered. **So this document says what the tree DECLARES, never what
   it MEASURES.**

4. **In particular: whether all 280 `SELF_INTERSECTION_XFAIL` magnitudes still reproduce on
   `e804027` is NOT confirmed here.** That is `node tools/bloom-xfail-magnitudes.mjs`'s job
   and it takes minutes; the last session to run it was #257, which re-recorded five entries
   and removed one. A stale magnitude does not redden anything until the 4-hour export gate
   says so.

5. **The one CI result outstanding for `main`'s current head was still running** —
   `bloom-export-watertight` on `e804027`, 219.6 minutes elapsed at the snapshot, with no
   instrument available that can distinguish slow from hung (`get_job_logs` returns 404 while
   a job runs, and a matrix gate is one long step). Its own PR head `b98cf78` ran it green in
   142.8 min. **If that run went red, everything in §1 about `main` being clean is wrong and
   this document will not have been updated.**

6. **Runtimes are a reading of one moment.** §10's figures widened the recorded spread again
   and will be wrong by the next session. `CLAUDE.md`'s rule stands and applies to this
   document: size a CI wait from `actions_list` at the time, never from a number in a file.

7. **"Whether a merge moved geometry bytes" is read from the merge's own message**, not
   re-derived. §1a quotes each commit's claim phrase verbatim and §1b names the 13 merges that
   touched generator source without making one. **A merge that moved bytes and did not say so
   would appear in this document as "no byte claim", not as a finding** — proving otherwise
   needs a worktree per commit and a full byte partition each, which is days of gate time.

8. **Contact sheets were not rendered and no image was opened.** Every question in §7b that
   says "wants the render" is exactly that: a question whose answer is a picture, and no
   picture was produced or looked at here.

9. **Issue bodies were read; issue THREADS were not exhaustively read.** 32 issues are open.
   Where §7e reports that #236 and #237 are open while the prose says closed, that is the
   issue STATE, not a claim about who is right — the code change #242 made was measured by its
   own session and this audit does not dispute it.

10. **Branch ages are from git, PR ages from the API, and a squash-merged branch is never an
    ancestor of `main`** — so "orphaned" in §3 means "its commits are not on `main` by
    ancestry", which for a merged branch is the normal state and not a finding.

11. **The `/print`, `/plot`, `/scene`, `/cards` and artist-tracker areas were not audited.**
    They are named in §7 and §9 only where a bloom path touches them. Nothing in this
    repository's CI covers any of them.

12. **This document is a snapshot on `e804027` taken 2026-09-18 23:44 Z.** Every count, every
    runtime and every open item is true of that commit at that minute. It is dated in its
    title for that reason: **re-take it rather than update it** — the commands that produce
    each number are named beside it.

---

*Snapshot ends.*
