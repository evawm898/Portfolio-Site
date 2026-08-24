/*
 * visibility-matrix.mjs — the config matrix every visibility check runs against.
 *
 * WHY THIS EXISTS AS ITS OWN FILE: the subject is CONDITIONAL visibility, so a check at
 * the default config exercises almost none of it. 122 of 166 controls are hidden or shown
 * by a condition on another control's value; at DEFAULTS most of those conditions sit at
 * one polarity and never flip. A sheet or a dump taken only at defaults proves that the
 * default state is unchanged and nothing more.
 *
 * So: every gating predicate in flower-registry.js must be driven BOTH TRUE AND FALSE at
 * least once by the configs below. `uncoveredPredicates()` (bottom of this file) checks
 * that claim mechanically against the registry rather than leaving it to a promise in a
 * comment — if a predicate is never exercised, the consumer is expected to SAY SO rather
 * than let the config count imply coverage.
 *
 * Consumers:
 *   tools/dump-visibility.mjs      — records {id: hidden} for every WIRED control across
 *                                    this matrix x both tiers. A refactor that claims zero
 *                                    behaviour change must produce a byte-identical dump.
 *   tools/verify-tier-visibility.mjs — asserts the EXPECTED state (derived from the
 *                                    registry) against the observed one, same matrix.
 *
 * Each config is cumulative-free: `set` lists every control it depends on, so a row can be
 * read in isolation and rows cannot leak into each other. Values are applied then READ BACK
 * (the harness fails the row on a value that did not take — see the flower-project skill:
 * 73 of 185 export configs were once measuring a different design from the one they named).
 */

// A "reset" prefix every row starts from, so no row inherits another's state. Kept
// explicit rather than relying on a page reload per row: reload-per-row costs ~20 s x
// (rows x 2 tiers) and this whole matrix is meant to run inside a CI job.
export const RESET = [
  { id: 'bloomType', value: 'coiled', evt: 'change' },
  { id: 'divergenceMode', value: 'golden', evt: 'change' },
  { id: 'bilPerSide', value: '3' },
  { id: 'layerCount', value: '1' },
  { id: 'petalShape', value: 'rounded', evt: 'change' },
  // The shape family's two ENABLERS. Both default to 0 and both are now predicate drivers,
  // so a row that turns one on must not leak into the next row. Set AFTER petalShape: the
  // shape picker is a macro that writes these, so resetting it first and them second means
  // the reset lands wherever the macro left them.
  { id: 'clawLength', value: '0' },
  { id: 'cleftDepth', value: '0' },
  { id: 'infillType', value: 'veins', evt: 'change' },
  { id: 'edgeTermination', value: 'loop', evt: 'change' },
  { id: 'tipStyle', value: 'clean', evt: 'change' },
  { id: 'centerArch', value: 'classic', evt: 'change' },
  { id: 'centerType', value: 'stamens', evt: 'change' },
  { id: 'continuousMargin', value: 'on', evt: 'change' },
  { id: 'receptacleType', value: 'none', evt: 'change' },
  { id: 'receptProfile', value: 'flare', evt: 'change' },
  { id: 'receptConstruction', value: 'solid', evt: 'change' },
  { id: 'sepalsType', value: 'none', evt: 'change' },
  { id: 'sepalTipStyle', value: 'clean', evt: 'change' },
  { id: 'stemType', value: 'none', evt: 'change' },
  { id: 'leafType', value: 'none', evt: 'change' },
];

export const MATRIX = [
  // ---- baseline -----------------------------------------------------------------
  { label: 'defaults', set: [] },

  // ---- arrangement: data-bloom-styles, data-bil-petal, data-hide-bilateral -------
  { label: 'bloom RADIAL', set: [{ id: 'bloomType', value: 'radial', evt: 'change' }] },
  { label: 'bloom BILATERAL, 3 per side', set: [{ id: 'bloomType', value: 'bilateral', evt: 'change' }, { id: 'bilPerSide', value: '3' }] },
  { label: 'bloom BILATERAL, 1 per side (bil-petal 2 and 3 false)', set: [{ id: 'bloomType', value: 'bilateral', evt: 'change' }, { id: 'bilPerSide', value: '1' }] },
  { label: 'coiled + CUSTOM divergence (divergenceAngle true)', set: [{ id: 'divergenceMode', value: 'custom', evt: 'change' }] },
  { label: 'RADIAL + custom divergence (divergenceAngle false via bloomType)', set: [{ id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'divergenceMode', value: 'custom', evt: 'change' }] },

  // ---- shape family: the claw and cleft enablers --------------------------------
  // Both new predicates need BOTH polarities or the dump only ever shows these four controls
  // disappearing, which is not evidence that the reveal works. RESET holds the enablers at 0
  // (false side); these two rows are the true side. They set the SLIDER, not the shape
  // picker: the predicate's driver is the parameter, and a row that set `petalShape` instead
  // would leave uncoveredDrivers() correctly complaining that clawLength/cleftDepth are never
  // varied. (The picker route is covered by tools/shot-shape-picker.mjs.)
  { label: 'claw ON (clawWidth + shoulder revealed)', set: [{ id: 'clawLength', value: '0.35' }] },
  { label: 'cleft ON (cleftLobes + cleftWidth revealed)', set: [{ id: 'cleftDepth', value: '0.55' }] },

  // ---- layers: data-layers-multi ------------------------------------------------
  { label: 'layerCount 3 (layers-multi true)', set: [{ id: 'layerCount', value: '3' }] },

  // ---- edge: data-tip-styles, and the Standard "Amount" slot ---------------------
  { label: 'tip TOOTHED', set: [{ id: 'tipStyle', value: 'jagged', evt: 'change' }] },
  { label: 'tip SCALLOPED', set: [{ id: 'tipStyle', value: 'scallop', evt: 'change' }] },
  { label: 'tip RUFFLED', set: [{ id: 'tipStyle', value: 'ruffled', evt: 'change' }] },

  // ---- infill: data-infill-styles (all five) + captureDist's imperative gate -----
  { label: 'infill CELLS (voronoi)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }] },
  { label: 'infill STRANDS', set: [{ id: 'infillType', value: 'strands', evt: 'change' }] },
  { label: 'infill LATTICE (bone)', set: [{ id: 'infillType', value: 'bone', evt: 'change' }] },
  { label: 'infill GROWTH (spacecol)', set: [{ id: 'infillType', value: 'spacecol', evt: 'change' }] },
  { label: 'veins + FADE termination (captureDist false)', set: [{ id: 'edgeTermination', value: 'fade', evt: 'change' }] },
  { label: 'CELLS + loop termination (captureDist false via slab infill)', set: [{ id: 'infillType', value: 'voronoi', evt: 'change' }, { id: 'edgeTermination', value: 'loop', evt: 'change' }] },

  // ---- centre: data-center-arch, data-center-styles ------------------------------
  { label: 'centre CLASSIC / NONE (center-styles false)', set: [{ id: 'centerType', value: 'none', evt: 'change' }] },
  { label: 'centre DENSE CLUSTER', set: [{ id: 'centerArch', value: 'dense', evt: 'change' }] },
  { label: 'centre DISC', set: [{ id: 'centerArch', value: 'disc', evt: 'change' }] },
  { label: 'centre PETALOID FILL', set: [{ id: 'centerArch', value: 'petaloid', evt: 'change' }] },

  // ---- junction / receptacle -----------------------------------------------------
  // data-recept, data-cont-margin (BOTH halves — see the PR note on half-declared
  // conditions), data-recept-dome, data-recept-open, data-recept-ribbed, and the
  // LEGACY_RECEPT force-hide, which is the undeclared condition this whole change exists
  // to express. Every one of these needs the receptacle ON *and* continuous margin at
  // both polarities to be exercised at all.
  { label: 'receptacle ON via stem, cont-margin ON (LEGACY_RECEPT force-hidden)', set: [{ id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: 'receptacle ON via stem, cont-margin OFF (LEGACY_RECEPT shown)', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'receptacle ON via sepals only', set: [{ id: 'sepalsType', value: 'sepals', evt: 'change' }] },
  { label: 'receptacle ON via receptacleType override only', set: [{ id: 'receptacleType', value: 'on', evt: 'change' }] },
  { label: 'receptacle OFF, cont-margin OFF (both halves false)', set: [{ id: 'continuousMargin', value: 'off', evt: 'change' }] },
  { label: 'receptacle DOME profile (recept-dome true), cont-margin OFF', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'continuousMargin', value: 'off', evt: 'change' }, { id: 'receptProfile', value: 'dome', evt: 'change' }] },
  { label: 'receptacle RIBBED construction (recept-open + recept-ribbed true), cont-margin OFF', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'continuousMargin', value: 'off', evt: 'change' }, { id: 'receptConstruction', value: 'ribbed', evt: 'change' }] },
  { label: 'receptacle CORED construction (recept-open + recept-ribbed true), cont-margin OFF', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'continuousMargin', value: 'off', evt: 'change' }, { id: 'receptConstruction', value: 'cored', evt: 'change' }] },

  // ---- sepals: data-sepal, data-sepal-tip ----------------------------------------
  { label: 'sepals ON, tip CLEAN (sepal-tip false)', set: [{ id: 'sepalsType', value: 'sepals', evt: 'change' }] },
  { label: 'sepals ON, tip SERRATED (sepal-tip true)', set: [{ id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalTipStyle', value: 'jagged', evt: 'change' }] },

  // ---- stem and leaves: data-stem, data-leaf -------------------------------------
  { label: 'stem ON, leaves NONE (leaf false)', set: [{ id: 'stemType', value: 'stem', evt: 'change' }] },
  { label: 'stem ON, leaves OVAL (leaf true)', set: [{ id: 'stemType', value: 'stem', evt: 'change' }, { id: 'leafType', value: 'oval', evt: 'change' }] },

  // ---- everything on at once -----------------------------------------------------
  // Not a predicate this matrix needs, but the state a real design lands in, and the one
  // where two sweeps are most likely to fight over the same wrapper.
  { label: 'stem + leaves + sepals + serrated + 3 layers + cells', set: [
    { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'leafType', value: 'oval', evt: 'change' },
    { id: 'sepalsType', value: 'sepals', evt: 'change' }, { id: 'sepalTipStyle', value: 'jagged', evt: 'change' },
    { id: 'layerCount', value: '3' }, { id: 'infillType', value: 'voronoi', evt: 'change' },
    { id: 'tipStyle', value: 'jagged', evt: 'change' }, { id: 'centerArch', value: 'disc', evt: 'change' },
  ] },
];

/*
 * Coverage check: which controls' gating predicates does this matrix never drive to BOTH
 * polarities? Returns a list of complaints, empty when coverage is complete. The consumer
 * is expected to print whatever comes back rather than swallow it — "34 configs" is not a
 * coverage claim, and a predicate this matrix never flips is not verified by it.
 *
 * This reads the DRIVER ids out of each predicate and asks whether the matrix sets that
 * driver to at least two distinct values (counting the RESET value as one of them). It is
 * a structural check, not a re-derivation of any predicate — it never evaluates one.
 */
// `resolve` expands a named predicate ({ ref }) into the predicate it names. It is applied
// at EVERY node, not just the root: named predicates are referenced from inside `all`/`any`
// (all 18 uses of hasReceptacle are), so a root-only expansion would silently drop their
// drivers and under-report the coverage gap. Default is identity, for a caller with no refs.
export function driverIds(pred, out = new Set(), resolve = (p) => p) {
  pred = resolve(pred);
  if (!pred || typeof pred !== 'object') return out;
  if (pred.id) out.add(pred.id);
  for (const k of ['all', 'any']) if (Array.isArray(pred[k])) for (const p of pred[k]) driverIds(p, out, resolve);
  if (pred.not) driverIds(pred.not, out, resolve);
  return out;
}

export function uncoveredDrivers(controls, resolveRef = (r) => r) {
  const seen = new Map();       // driver id -> Set of values this matrix puts it at
  const note = (id, v) => { if (!seen.has(id)) seen.set(id, new Set()); seen.get(id).add(String(v)); };
  for (const s of RESET) note(s.id, s.value);
  for (const cfg of MATRIX) for (const s of cfg.set) note(s.id, s.value);
  const complaints = [];
  for (const c of controls) {
    const pred = c.visibleWhen || c.standardVisibleWhen;
    if (!pred) continue;
    for (const d of driverIds(pred, new Set(), resolveRef)) {
      const vals = seen.get(d);
      if (!vals || vals.size < 2) complaints.push(`${c.id}: driver "${d}" is never varied by the matrix (${vals ? [...vals].join('/') : 'never set'})`);
    }
  }
  return [...new Set(complaints)];
}
