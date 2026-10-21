// knit-lab-topology.js — WHAT is knitted, with no geometry in it.
//
// A swatch is a list of COURSES (rows), bottom first. Each course is a list of LOOPS in slot
// order, left to right as the technical face is seen. Every loop records exactly one thing about
// how it is held: `through`, the ids of the loops of the PREVIOUS course it was pulled through.
//
//   plain knit        through: [a]        one parent
//   yarn over         through: []         no parent   — a new loop that holds nothing up
//   k2tog / ssk       through: [a, b]     two parents — the list order is which one lies on
//                                                       top (k2tog: [right, left], the
//                                                       right-hand parent ends on top;
//                                                       ssk: [left, right])
//   cast-on           through: []         course 0 only, kind 'cast-on'
//
// That is the whole of the topology. The simulator itself never reads it: once the yarn is a
// chain of points, segment lengths, bending and yarn-yarn contact are the same constraints
// whatever was knitted. Only the INITIAL-GEOMETRY builder (knit-lab-sim.js, placeCourse)
// reads `through` — to put each new loop's legs where they pierce its parent(s). So a yarn
// over or a decrease is a change to the topology DATA plus one case in that builder, never a
// change to the solver — and that is how the yarn over and the k2tog were added (one case each in
// placeCourse; the solver did not change). The builder throws, by name, on more than two parents.
//
// The yarn's travel direction per course is part of the topology too: a flat swatch is knitted
// back and forth, so the one yarn runs left->right on even courses and right->left on odd ones
// and turns at the selvedge between them.

export function makeStockinette(wales, courses) {
  const loops = [], rows = [];
  for (let c = 0; c < courses; c++) {
    const row = [];
    for (let w = 0; w < wales; w++) {
      const id = loops.length;
      loops.push({ id, course: c, slot: w, kind: c === 0 ? 'cast-on' : 'knit', through: c === 0 ? [] : [rows[c - 1][w]] });
      row.push(id);
    }
    rows.push(row);
  }
  return { loops, rows, flat: true };
}

// Stockinette with ONE EYELET ROW at course `at` (default: mid-height): a plain edge stitch each
// side and "yo, k2tog" repeated between them, in knitting order (k1, [yo, k2tog] x n, k1 — on 10
// wales, four eyelets). Each pair consumes two loops of the course below (the k2tog, right parent
// on top) and makes two (the k2tog and the yarn over), so every course keeps `wales` loops and the
// course above knits into them plainly. On a right-to-left course "yo, then k2tog" puts the yarn
// over to the RIGHT of its decrease.
export function makeEyelet(wales, courses, at = Math.floor(courses / 2)) {
  const t = makeStockinette(wales, courses);
  if (at < 1 || at >= courses - 1) throw new Error('makeEyelet: the eyelet row needs a course below and above it');
  const below = t.rows[at - 1], row = t.rows[at], dir = courseDirection(t, at);
  for (let k = 1; k + 2 < wales; k += 2) {
    const [yoSlot, decSlot] = dir > 0 ? [k, k + 1] : [k + 1, k];
    const yo = t.loops[row[yoSlot]], dec = t.loops[row[decSlot]];
    yo.kind = 'yo'; yo.through = [];
    dec.kind = 'k2tog'; dec.through = [below[k + 1], below[k]];      // [right, left]: the right one on top
  }
  t.eyelet = at;
  return t;
}

// +1: the yarn runs left -> right along this course; -1: right -> left.
export function courseDirection(topo, c) { return topo.flat ? (c % 2 === 0 ? 1 : -1) : 1; }

// Structural checks. Returns a list of problems (empty = valid). A loop of course c may only be
// pulled through loops of course c-1; every loop below the last course must be held by at least
// one loop above it, or it would ladder; a loop has at most two parents. No limit is put on how
// many children share one parent (knitting twice into one stitch is a legal increase).
export function validateTopology(topo) {
  const bad = [];
  const byId = new Map(topo.loops.map(l => [l.id, l]));
  const held = new Set();
  topo.rows.forEach((row, c) => row.forEach(id => {
    const l = byId.get(id);
    if (!l) { bad.push(`course ${c}: unknown loop id ${id}`); return; }
    if (l.course !== c) bad.push(`loop ${id}: listed in course ${c}, records course ${l.course}`);
    if (c === 0 && l.through.length) bad.push(`loop ${id}: a course-0 loop cannot pass through anything`);
    for (const p of l.through) {
      const q = byId.get(p);
      if (!q) bad.push(`loop ${id}: parent ${p} does not exist`);
      else if (q.course !== c - 1) bad.push(`loop ${id}: parent ${p} is in course ${q.course}, not ${c - 1}`);
      held.add(p);
    }
    if (l.through.length > 2) bad.push(`loop ${id}: ${l.through.length} parents (at most 2: a k2tog/ssk)`);
  }));
  for (const row of topo.rows.slice(0, -1)) for (const id of row) if (!held.has(id)) bad.push(`loop ${id}: nothing above holds it (it would ladder)`);
  return bad;
}
