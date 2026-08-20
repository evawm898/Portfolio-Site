/* ===================================================================
   flower-presets.js — the shipped, read-only preset gallery.

   Seven curated starting points for a cold visitor. Each is a design DELTA
   (only the controls it sets; everything else falls to DEFAULTS), tagged with
   the schema it was authored against. A preset loads through the normal saved-
   design path — applyPreset() calls applyDesign({ ...ui, schemaVersion }), which
   migrates + merges over DEFAULTS — so a preset can never desync from the control
   set: a control it omits tracks that control's current default, and any control
   that is renamed/removed is handled by the same migrations a saved design gets.

   These seven are ALSO permanent regression fixtures: both gates
   (tools/verify-flower-export.mjs and tools/verify-geometry-quality.mjs) load
   this array by name, so "Thistle broke" is a failing check, not a mystery.

   COVERAGE (the reason there are seven, not eight): all five lace patterns
   appear, none more than twice —
     veins   Daisy, Rose        strands  Thistle
     voronoi Poppy              growth   Lily
     bone    Dahlia, Carnation
   Shapes strap/rounded/pointed/clawed; arrangements radial/coiled; edges
   clean/ruffled (the only two that render under the Standard-default continuous
   margin — Toothed/Scalloped are Advanced, see flower.js ADV_OPTIONS).

   AUTHORED DATA — taste, not derived. Thumbnails are the derived artifact
   (build-time, CI-checked); these params are hand-tuned and frozen. Regenerate
   the paste-ready form of this file from the running app via MAKE ▸ Presets ▸
   Export.
   =================================================================== */

export const PRESET_SCHEMA = 16;

export const PRESETS = [
  // 1 — the friendly default. Flat radial rosette of slender rays + disc eye.
  { name: 'Daisy', note: 'the friendly default', slug: 'daisy',
    ui: { bloomType: 'radial', petalCount: 18, bloom: 80, elevation: 0.06,
      width: 0.5, taper: 0.5, tip: 0.32, petalCup: 0.03, centerCurve: 0.2, shoulder: 0.35,
      tipStyle: 'clean', infillType: 'veins', density: 4, softness: 0.4,
      centerArch: 'disc', centerType: 'none', sepalsType: 'none', stemType: 'none' } },

  // 2 — lush cupped spiral.
  { name: 'Rose', note: 'lush cupped spiral', slug: 'rose',
    ui: { bloomType: 'coiled', petalCount: 24, tightness: 0.2, bloom: 44, elevation: 0.12,
      width: 1.0, taper: 0.3, tip: 0.55, petalCup: 0.3, centerCurve: 0.45, shoulder: 0.55, edgeCurve: 0.1,
      tipStyle: 'clean', infillType: 'veins', density: 6, softness: 0.7,
      centerArch: 'petaloid', centerType: 'none', sepalsType: 'sepals', stemType: 'none' } },

  // 3 — deliberately SPARE: six long narrow reflexed straps + open growth lace.
  { name: 'Lily', note: 'deliberately spare', slug: 'lily',
    ui: { bloomType: 'radial', petalCount: 6, bloom: 88, elevation: -0.15,
      width: 0.42, taper: 0.55, tip: 0.28, petalCup: 0.06, centerCurve: 0.12, shoulder: 0.28, edgeCurve: -0.06,
      tipStyle: 'clean', infillType: 'spacecol', spaceMode: 'open', softness: 0.3,
      centerArch: 'classic', centerType: 'stamens', sepalsType: 'none', stemType: 'none' } },

  // 4 — broad papery petals, cellular Voronoi. (Ships smooth: scallop is inert under
  //     the Standard continuous margin; that edge lives in Advanced.)
  { name: 'Poppy', note: 'broad cellular petals', slug: 'poppy',
    ui: { bloomType: 'radial', petalCount: 6, bloom: 82, elevation: 0.02,
      width: 1.15, taper: 0.28, tip: 0.6, petalCup: 0.1, centerCurve: 0.35, shoulder: 0.55,
      tipStyle: 'clean', infillType: 'voronoi', density: 6, softness: 0.6,
      centerArch: 'dense', centerType: 'none', sepalsType: 'none', stemType: 'none' } },

  // 5 — dense quilled pompom (petalTwist), Lattice bone.
  { name: 'Dahlia', note: 'quilled pompom', slug: 'dahlia',
    ui: { bloomType: 'coiled', petalCount: 34, tightness: 0.12, bloom: 34, elevation: 0.16,
      petalTwist: 0.4, width: 0.55, taper: 0.5, tip: 0.15, petalCup: 0.12, centerCurve: 0.3, shoulder: 0.45,
      tipStyle: 'clean', infillType: 'bone', softness: 0.5,
      centerArch: 'petaloid', centerType: 'none', sepalsType: 'none', stemType: 'none' } },

  // 6 — spiky domed tuft: narrow spikes, radial Strands. (Strongest of the set; the
  //     spiky read is strands + narrow straps, not edge teeth, so it ships clean.)
  { name: 'Thistle', note: 'spiky domed tuft', slug: 'thistle',
    ui: { bloomType: 'coiled', petalCount: 40, tightness: 0.4, bloom: 24, elevation: 0.35,
      width: 0.45, taper: 0.55, tip: 0.2, petalCup: 0.08, centerCurve: 0.2, shoulder: 0.3,
      tipStyle: 'clean', infillType: 'strands', softness: 0.4,
      centerArch: 'dense', centerType: 'none', sepalsType: 'sepals', stemType: 'none' } },

  // 7 — frilly clawed ruffle, Lattice bone. Nine petals (calmed from sixteen).
  { name: 'Carnation', note: 'frilly clawed ruffle', slug: 'carnation',
    ui: { bloomType: 'coiled', petalCount: 9, tightness: 0.26, bloom: 52, elevation: 0.12,
      width: 1.0, taper: 0.3, clawLength: 0.3, clawWidth: 0.28, tip: 0.6, petalCup: 0.16, centerCurve: 0.38, shoulder: 0.55,
      tipStyle: 'ruffled', edgeNoise: 0.4, infillType: 'bone', softness: 0.6,
      centerArch: 'petaloid', centerType: 'none', sepalsType: 'none', stemType: 'none' } },
];
