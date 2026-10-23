/* frame-registry.js — the ONE declaration of every /frame control, section and
   molding-profile preset. frame-geometry.js imports the ranges it needs from
   here (the Q6 rule: a bound lives in one place), frame.js draws the panel from
   PARAM_SPEC and never names a control by hand, and the gate walks the same
   arrays. Adding a control is one row here. See docs/frame-charter.md. */

export const SECTIONS = [
  { id: 'skeleton', label: 'Skeleton', open: true },
  { id: 'molding', label: 'Molding', open: true },
  { id: 'shading', label: 'Shading', open: true },
  { id: 'ornament', label: 'Ornament — filigree', open: false },
  { id: 'print', label: 'Print (relief STL)', open: true },
];

const R = (id, section, label, min, max, step, def, unit = '', visibleWhen = null, tier = 'standard') =>
  ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen, tier });

const isArch = (p) => p.skeleton === 'arch';
const isRect = (p) => p.skeleton === 'rect';
const isOval = (p) => p.skeleton === 'oval';
const hasMullions = (p) => isArch(p) && p.mullions > 0;
const sizedCorner = (p) => isRect(p) && p.cornerTreatment !== 'mitre';
const ornOn = (p) => p.filigree === 'scrolls';
const ON_OFF = [['on', 'On'], ['off', 'Off']];

export const PARAM_SPEC = [
  // --- 1. skeleton — three types feeding ONE sweep, ONE relief, ONE SVG
  //     (charter §2): the arch (open-bottomed / silled), and the rectangle
  //     and the oval, which are CLOSED LOOPS — one spine with no start cap,
  //     no duplicated vertex and no seam (phase 2b). Each control below that
  //     belongs to one type is hidden AND inert under the others.
  { id: 'skeleton', section: 'skeleton', label: 'Type', kind: 'choice', default: 'arch',
    options: [['arch', 'Arch — Gothic window'], ['rect', 'Rectangle — frame'], ['oval', 'Oval / circle — frame']] },
  // arch and rectangle: between the CENTRELINES of the two side bands. The
  // oval takes its width from its aspect instead, so it hides this.
  R('width', 'skeleton', 'Width', 60, 400, 1, 180, 'mm', (p) => !isOval(p)),
  // the OVERALL height: the drawing's outer bottom (y = 0) to the arch's
  // centreline apex, or to the frame's outer top.
  R('height', 'skeleton', 'Height', 80, 600, 1, 340, 'mm'),
  // 0 = semicircular (centres at the midpoint), 0.5 = equilateral (each centre
  // at the opposite springing), 1 = lancet (centres a full span past it).
  R('pointedness', 'skeleton', 'Pointedness', 0, 1, 0.01, 0.5, '', isArch),
  R('mullions', 'skeleton', 'Mullions', 0, 4, 1, 2, '', isArch),
  R('mullionWidth', 'skeleton', 'Mullion width (× molding)', 0.3, 1, 0.01, 0.6, '', hasMullions),
  { id: 'sill', section: 'skeleton', label: 'Sill', kind: 'choice', default: 'plain', visibleWhen: isArch,
    options: [['none', 'None — open bottom'], ['plain', 'Plain'], ['stepped', 'Stepped']] },
  // the rectangle's corners — where Gothic and baroque frames differ most.
  // mitre: a square mitred corner; rounded: a quarter circle of cornerSize
  // (centreline radius); notched: the corner stepped INWARD by cornerSize (a
  // square cut); eared: the corner stepped OUTWARD by cornerSize (a crossette).
  { id: 'cornerTreatment', section: 'skeleton', label: 'Corners', kind: 'choice', default: 'mitre', visibleWhen: isRect,
    options: [['mitre', 'Square — mitred'], ['rounded', 'Rounded'], ['notched', 'Notched — stepped in'], ['eared', 'Eared — stepped out']] },
  R('cornerSize', 'skeleton', 'Corner size', 2, 80, 0.5, 24, 'mm', sizedCorner),
  // the oval's centreline width ÷ height. 1.00 is the circle — the 1:1 case
  // of the one oval, never a separate type.
  R('aspect', 'skeleton', 'Aspect (width ÷ height)', 0.4, 2.5, 0.01, 0.75, '', isOval),

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

  // --- 3b. ornament — FILIGREE (phase 3a, step 2): scroll groups grown
  //     from the skeleton's named anchors (ANCHORS below), built in PRINT
  //     millimetres so the wire, every gap and every root embed meet the
  //     MIN_FEATURE_MM floor. Off by default; every row below is hidden AND
  //     inert while it is off. Read docs/frame-charter.md §10.
  { id: 'filigree', section: 'ornament', label: 'Filigree', kind: 'choice', default: 'none',
    options: [['none', 'None'], ['scrolls', 'Scrolls']] },
  // scrolls in each group: a lead C and its children (1 = the lead alone)
  R('ornDensity', 'ornament', 'Density (scrolls per group)', 1, 5, 1, 2, '', ornOn),
  // the lead scroll's length, as a multiple of the molding width (the
  // ornament keeps its proportion to the frame at any print size)
  R('ornScale', 'ornament', 'Scale (× molding width)', 1, 6, 0.05, 2.5, '', ornOn),
  R('ornTightness', 'ornament', 'Tightness', 0, 1, 0.01, 0.5, '', ornOn),
  // the wire, in PRINT mm (a print feature: floored at MIN_FEATURE_MM)
  R('ornWire', 'ornament', 'Wire (print)', 1, 3.2, 0.05, 1.6, 'mm', ornOn),
  { id: 'ornCrest', section: 'ornament', label: 'Crest (top centre)', kind: 'choice', default: 'on', visibleWhen: ornOn, options: ON_OFF },
  { id: 'ornCorners', section: 'ornament', label: 'Corners / springings', kind: 'choice', default: 'on', visibleWhen: (p) => ornOn(p) && !isOval(p), options: ON_OFF },
  { id: 'ornSides', section: 'ornament', label: 'Sides', kind: 'choice', default: 'off', visibleWhen: ornOn, options: ON_OFF },
  { id: 'ornBottom', section: 'ornament', label: 'Bottom centre', kind: 'choice', default: 'off', visibleWhen: (p) => ornOn(p) && !(isArch(p) && p.sill === 'none'), options: ON_OFF },

  // --- 4. print — the relief STL, the PRIMARY output (phase 2, ruling 1).
  //     These reach the STL and the 3D view and never the SVG; the 2-D gate's
  //     pixel sweep skips this section and asserts the STL moves instead.
  //     printHeight is the overall size: the drawing's height is scaled to
  //     it (x, y alike); plate and relief depth are print millimetres.
  R('printHeight', 'print', 'Overall height', 40, 600, 1, 180, 'mm'),
  R('plateThickness', 'print', 'Back plate', 0.5, 6, 0.1, 2, 'mm'),
  R('reliefScale', 'print', 'Relief depth (× profile)', 0.2, 3, 0.05, 1),
  // the interior: the arch's lights (ruled pierced, phase 2 ruling 4) or a
  // frame's opening (its default NOT ruled — phase 2b asks from the sheet).
  // pierced = open; backed = a plate behind, its face at the plate thickness;
  // recessed = the same plate at the MIN_FEATURE_MM floor, so the opening
  // reads deeper by the difference (told when there is none).
  { id: 'lights', section: 'print', label: 'Interior', kind: 'choice', default: 'pierced',
    options: [['pierced', 'Open — pierced'], ['backed', 'Backed — a plate behind'], ['recessed', 'Recessed — a thin plate, set deep']] },
  // the ornament's relief: reach the STL and never the SVG (the drawing
  // shows a half-round wire's true section whatever is printed)
  { id: 'ornShape', section: 'print', label: 'Ornament wire', kind: 'choice', default: 'half-round', visibleWhen: ornOn,
    options: [['half-round', 'Half-round — flat back'], ['round', 'Round — on a wall']] },
  R('ornProjection', 'print', 'Ornament relief (× wire)', 0.5, 3, 0.05, 1, '', ornOn),
];

/* The minimum printable feature, in millimetres. AN ASSUMPTION: the print
   process is undecided (ruling 3) and nothing here has been printed; it is
   the one number the floors below read, so a coupon moves one constant. It
   caps the OUTPUT (a plate thinner than it is built at it and told; a band or
   mullion narrower than it is told) and never narrows a control's range. It
   is also the length by which a band's relief embeds into its neighbour. */
export const MIN_FEATURE_MM = 1.0;

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

/* NAMED SKELETON ANCHORS (phase 2b) — the points ornament will grow from in
   phase 3. Declared here, per skeleton type, so a consumer names an anchor
   rather than restating where it is; frame-geometry's skeleton builders put
   every one ON a spine (a vertex, or the sill's own segment) and the gate
   holds the list to this declaration both ways and the mirrored pairs to
   x -> -x to the double. Conditional anchors (the sill's) carry `when`. */
export const ANCHORS = {
  arch: [
    { id: 'apex', what: 'the head\'s apex — the mitred join of its two arcs' },
    { id: 'springL', what: 'the left springing — the jamb\'s top, where the head starts' },
    { id: 'springR', what: 'the right springing' },
    { id: 'sideL', what: 'the left jamb\'s midpoint' },
    { id: 'sideR', what: 'the right jamb\'s midpoint' },
    { id: 'bottomCentre', what: 'the sill\'s centre', when: (p) => p.sill !== 'none' },
    { id: 'sillL', what: 'the sill\'s left end', when: (p) => p.sill !== 'none' },
    { id: 'sillR', what: 'the sill\'s right end', when: (p) => p.sill !== 'none' },
  ],
  rect: [
    { id: 'topCentre', what: 'the top side\'s midpoint' },
    { id: 'bottomCentre', what: 'the bottom side\'s midpoint — the loop\'s own start' },
    { id: 'sideL', what: 'the left side\'s midpoint' },
    { id: 'sideR', what: 'the right side\'s midpoint' },
    { id: 'cornerTL', what: 'the top-left corner — the vertex on its bisector (the mitre, the arc\'s middle, the notch\'s or the ear\'s diagonal step)' },
    { id: 'cornerTR', what: 'the top-right corner' },
    { id: 'cornerBL', what: 'the bottom-left corner' },
    { id: 'cornerBR', what: 'the bottom-right corner' },
  ],
  oval: [
    { id: 'topCentre', what: 'the top of the oval' },
    { id: 'bottomCentre', what: 'the bottom of the oval — the loop\'s own start' },
    { id: 'sideL', what: 'the left end of the oval' },
    { id: 'sideR', what: 'the right end of the oval' },
  ],
};
/* Mirror pairs: an anchor and its image under x -> -x (the y axis is every
   skeleton's mirror line). */
export const ANCHOR_MIRRORS = [['springL', 'springR'], ['sideL', 'sideR'], ['sillL', 'sillR'], ['cornerTL', 'cornerTR'], ['cornerBL', 'cornerBR']];
