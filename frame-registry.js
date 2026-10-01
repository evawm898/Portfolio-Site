/* frame-registry.js — the ONE declaration of every /frame control, section and
   molding-profile preset. frame-geometry.js imports the ranges it needs from
   here (the Q6 rule: a bound lives in one place), frame.js draws the panel from
   PARAM_SPEC and never names a control by hand, and the gate walks the same
   arrays. Adding a control is one row here. See docs/frame-charter.md. */

export const SECTIONS = [
  { id: 'skeleton', label: 'Skeleton', open: true },
  { id: 'molding', label: 'Molding', open: true },
  { id: 'shading', label: 'Shading', open: true },
];

const R = (id, section, label, min, max, step, def, unit = '', visibleWhen = null, tier = 'standard') =>
  ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen, tier });

const hasMullions = (p) => p.mullions > 0;

export const PARAM_SPEC = [
  // --- 1. skeleton — phase 1 is the arch only; rectangle and oval are later
  //     skeleton types that feed the same sweep (charter §2). The choice is
  //     declared now so the id and the section do not move when they land.
  { id: 'skeleton', section: 'skeleton', label: 'Type', kind: 'choice', default: 'arch',
    options: [['arch', 'Arch — Gothic window']] },
  R('width', 'skeleton', 'Width', 60, 400, 1, 180, 'mm'),
  R('height', 'skeleton', 'Height', 80, 600, 1, 340, 'mm'),
  // 0 = semicircular (centres at the midpoint), 0.5 = equilateral (each centre
  // at the opposite springing), 1 = lancet (centres a full span past it).
  R('pointedness', 'skeleton', 'Pointedness', 0, 1, 0.01, 0.5),
  R('mullions', 'skeleton', 'Mullions', 0, 4, 1, 2),
  R('mullionWidth', 'skeleton', 'Mullion width (× molding)', 0.3, 1, 0.01, 0.6, '', hasMullions),
  { id: 'sill', section: 'skeleton', label: 'Sill', kind: 'choice', default: 'plain',
    options: [['none', 'None — open bottom'], ['plain', 'Plain'], ['stepped', 'Stepped']] },

  // --- 2. molding — the cross-section profile swept along every spine. The
  //     profile's SHAPE is the editor's state (frame.js `profile`), not a
  //     registry value; this row names which preset it was loaded from and
  //     reads 'custom' once a point has been dragged.
  { id: 'profilePreset', section: 'molding', label: 'Profile', kind: 'choice', default: 'ogee',
    options: [['flat', 'Flat band'], ['bead', 'Bead'], ['cove', 'Cove'], ['ogee', 'Ogee'],
      ['reeded', 'Reeded'], ['fluted', 'Fluted'], ['stepped', 'Stepped'], ['custom', 'Custom']] },
  R('moldingWidth', 'molding', 'Profile width', 6, 40, 0.5, 18, 'mm'),
  R('moldingDepth', 'molding', 'Profile depth', 0.5, 20, 0.1, 6, 'mm'),

  // --- 3. shading — derived from the swept surface's normal against ONE fixed
  //     light (LIGHT below). Intensity scales the darkness; it never paints.
  R('shadeIntensity', 'shading', 'Intensity', 0, 1, 0.01, 1.0),            // 1.00 by ruling (phase 1b, ruling 1)
  R('hatchPitch', 'shading', 'Hatch pitch', 0.5, 3, 0.05, 1.1, 'mm'),
  // the NOMINAL weight: a hatch line is drawn at lineWeight x hatchWeight(d),
  // thicker in shade and thinner in light (HATCH_WEIGHT_RANGE below); the
  // edges stay at a fixed multiple of it.
  R('lineWeight', 'shading', 'Line weight', 0.15, 1.2, 0.05, 0.4, 'mm'),
  // cross-hatching (lines ACROSS the band) only where the darkness exceeds
  // this — a deep cove, a shadowed step. ADVANCED tier (ruling 6): hidden
  // until the panel's Advanced toggle is on, and never a Standard control.
  R('crossHatchThreshold', 'shading', 'Cross-hatch above', 0, 1, 0.01, 0.7, '', null, 'advanced'),
];

/* The two tiers a control may declare. Standard is what the panel opens on;
   Advanced is reached by one toggle and hides nothing from Standard. */
export const TIERS = ['standard', 'advanced'];

export const DEFAULTS = Object.fromEntries(PARAM_SPEC.map((s) => [s.id, s.default]));

/* The one fixed light. Model space: x right, y UP, z toward the viewer. A
   lamp above and to the left of the viewer, the engraver's convention. Not a
   control (charter §3): the shade must come from the geometry, and a movable
   lamp would make the same frame draw two different pictures. */
export const LIGHT = (() => { const v = [-0.45, 0.55, 0.70]; const l = Math.hypot(...v); return v.map((c) => c / l); })();

/* Molding profile presets — control points (x across the band 0..1 from the
   OUTER edge to the inner, z depth 0..1 toward the viewer), interpolated by
   frame-geometry's monotone cubic. Each is a starting point for the editor,
   never a fixed shape. x must be strictly increasing. */
export const PROFILE_PRESETS = {
  flat:    [[0, 0.6], [1, 0.6]],
  bead:    [[0, 0.15], [0.12, 0.42], [0.3, 0.82], [0.5, 1.0], [0.7, 0.82], [0.88, 0.42], [1, 0.15]],
  cove:    [[0, 1.0], [0.18, 0.62], [0.4, 0.3], [0.65, 0.12], [1, 0.05]],
  ogee:    [[0, 0.1], [0.2, 0.22], [0.42, 0.55], [0.58, 0.88], [0.8, 1.0], [1, 0.95]],
  reeded:  [[0, 0.3], [0.1, 1], [0.2, 0.3], [0.3, 1], [0.4, 0.3], [0.5, 1], [0.6, 0.3], [0.7, 1], [0.8, 0.3], [0.9, 1], [1, 0.3]],
  fluted:  [[0, 1], [0.08, 0.35], [0.165, 0.3], [0.25, 0.35], [0.33, 1], [0.41, 0.35], [0.5, 0.3], [0.59, 0.35], [0.67, 1], [0.75, 0.35], [0.835, 0.3], [0.92, 0.35], [1, 1]],
  stepped: [[0, 0.2], [0.24, 0.2], [0.26, 0.55], [0.49, 0.55], [0.51, 0.9], [0.74, 0.9], [0.76, 1.0], [1, 1.0]],
};

/* Line weight follows darkness (ruling 1): a hatch line's stroke width is
   lineWeight x (R0 + (R1 - R0) x darkness), so the darkest line is three
   times the lightest — an engraver's swelling line rather than a plotter's
   uniform one. Darkness is quantised onto HATCH_WEIGHT_STEPS levels and a
   line is split where its level changes, so a line running from shade into
   light swells and thins ALONG its length at that granularity. One owner:
   frame-geometry's hatchWeight() reads these; nothing restates the law. */
export const HATCH_WEIGHT_RANGE = [0.5, 1.5];
export const HATCH_WEIGHT_STEPS = 6;

/* Depth of the profile's own sampling across the band. One owner: the sweep,
   the shading, the crease finder and the editor's drawn curve all read this. */
export const PROFILE_SAMPLES = 48;
