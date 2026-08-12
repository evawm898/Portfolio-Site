// SVG front elevation of the bodice with zones shaded by curvature class.
// This is the zone layer of the final drawing; the placement pass will add
// panel outlines, active areas, and tail routing on top.

const ZONE_FILL = {
  X: '#a50026',   // apex exclusion
  0: '#f46d43',   // smallest class ... indices into ordered (ascending) classes
  1: '#fdae61',
  2: '#fee090',
  3: '#c6e2f0',
  4: '#74add1',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function renderZoneSvg(model, zoneResult, classes) {
  const { P, nu, nv, measurements: m } = model;
  const { zones, comp } = zoneResult;
  const SC = 2; // px per mm
  // Front elevation: X = image x (wearer's right on the viewer's left), Y down.
  let xMin = Infinity, xMax = -Infinity;
  for (let j = 0; j < nv; j++) {
    xMin = Math.min(xMin, P[j][0][0]);
    xMax = Math.max(xMax, P[j][nu - 1][0]);
  }
  const yMax = m.centerFrontLength;
  const M = 60, LEGEND_W = 470;
  const W = M * 2 + SC * (xMax - xMin) + LEGEND_W;
  const H = M * 2 + SC * yMax + 30;
  const px = (x) => M + SC * (x - xMin);
  const py = (y) => M + SC * (yMax - y);

  const zoneOfComp = new Map(zones.map((z) => [z.comp, z]));
  const fillOf = (z) => (z.excluded ? ZONE_FILL.X : ZONE_FILL[classes.indexOf(z.sizeClass)] ?? '#ccc');

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">`);
  parts.push(`<defs>
  <pattern id="excl" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#a50026"/><line x1="0" y1="0" x2="0" y2="8" stroke="#fff" stroke-width="2.5"/>
  </pattern>
  <pattern id="singleTex" width="7" height="7" patternUnits="userSpaceOnUse">
    <line x1="3.5" y1="0" x2="3.5" y2="7" stroke="#000" stroke-opacity="0.10" stroke-width="1"/>
  </pattern>
</defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(`<text x="${M}" y="${M - 28}" font-size="20" font-weight="600" fill="#222">Bodice placement zones — front elevation, curvature-derived</text>`);
  parts.push(`<text x="${M}" y="${M - 10}" font-size="12" fill="#555">chord tol ${zoneResult.tol} mm · viewer faces the wearer (wearer's right on the left) · waist at bottom</text>`);

  // Cells, merged into horizontal runs of the same component + curvature
  // category (the category drives the single-curved texture overlay).
  const category = zoneResult.cls.category;
  const cellPolys = [];
  for (let j = 0; j < nv - 1; j++) {
    let i0 = 0;
    while (i0 < nu - 1) {
      const c = comp[j * nu + i0];
      const cat = category[j * nu + i0] === 'double';
      let i1 = i0;
      while (i1 + 1 < nu - 1 && comp[j * nu + i1 + 1] === c &&
             (category[j * nu + i1 + 1] === 'double') === cat) i1++;
      const z = zoneOfComp.get(c);
      if (z) {
        const p00 = P[j][i0], p10 = P[j][i1 + 1], p11 = P[j + 1][i1 + 1], p01 = P[j + 1][i0];
        const d = `${px(p00[0])},${py(p00[1])} ${px(p10[0])},${py(p10[1])} ${px(p11[0])},${py(p11[1])} ${px(p01[0])},${py(p01[1])}`;
        const fill = z.excluded ? 'url(#excl)' : fillOf(z);
        cellPolys.push(`<polygon points="${d}" fill="${fill}" stroke="none"/>`);
        if (!z.excluded && !cat) {
          cellPolys.push(`<polygon points="${d}" fill="url(#singleTex)" stroke="none"/>`);
        }
      }
      i0 = i1 + 1;
    }
  }
  parts.push(cellPolys.join('\n'));

  // Zone boundaries: edges between differing components.
  const seg = [];
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const c = comp[j * nu + i];
      if (i + 1 < nu - 1 && comp[j * nu + i + 1] !== c) {
        const a = P[j][i + 1], b = P[j + 1][i + 1];
        seg.push(`M${px(a[0]).toFixed(1)} ${py(a[1]).toFixed(1)}L${px(b[0]).toFixed(1)} ${py(b[1]).toFixed(1)}`);
      }
      if (j + 1 < nv - 1 && comp[(j + 1) * nu + i] !== c) {
        const a = P[j + 1][i], b = P[j + 1][i + 1];
        seg.push(`M${px(a[0]).toFixed(1)} ${py(a[1]).toFixed(1)}L${px(b[0]).toFixed(1)} ${py(b[1]).toFixed(1)}`);
      }
    }
  }
  parts.push(`<path d="${seg.join('')}" stroke="#333" stroke-width="0.7" fill="none" opacity="0.7"/>`);

  // Silhouette.
  const sil = [];
  for (let j = 0; j < nv; j++) sil.push(`${px(P[j][0][0])},${py(P[j][0][1])}`);
  for (let i = 0; i < nu; i++) sil.push(`${px(P[nv - 1][i][0])},${py(P[nv - 1][i][1])}`);
  for (let j = nv - 1; j >= 0; j--) sil.push(`${px(P[j][nu - 1][0])},${py(P[j][nu - 1][1])}`);
  for (let i = nu - 1; i >= 0; i--) sil.push(`${px(P[0][i][0])},${py(P[0][i][1])}`);
  parts.push(`<polygon points="${sil.join(' ')}" fill="none" stroke="#111" stroke-width="1.6"/>`);

  // Reference lines: waist, underbust, apex level, center front.
  const refLine = (y, label) => `<line x1="${px(xMin)}" y1="${py(y)}" x2="${px(xMax)}" y2="${py(y)}" stroke="#111" stroke-width="0.8" stroke-dasharray="7 4" opacity="0.55"/><text x="${px(xMax) + 6}" y="${py(y) + 4}" font-size="11" fill="#333">${esc(label)}</text>`;
  parts.push(refLine(0, 'waist 0'));
  parts.push(refLine(model.hUnderbust, `underbust ${model.hUnderbust}`));
  parts.push(refLine(m.apexHeight, `apex ${m.apexHeight}`));
  parts.push(`<line x1="${px(0)}" y1="${py(yMax)}" x2="${px(0)}" y2="${py(0)}" stroke="#111" stroke-width="0.8" stroke-dasharray="2 4" opacity="0.5"/>`);
  parts.push(`<text x="${px(0) + 4}" y="${py(0) - 6}" font-size="11" fill="#333">CF</text>`);

  // Apex markers.
  for (const s of [-1, 1]) {
    const ax = px(s * m.apexSeparation / 2), ay = py(m.apexHeight);
    parts.push(`<g stroke="#fff" stroke-width="2"><line x1="${ax - 9}" y1="${ay}" x2="${ax + 9}" y2="${ay}"/><line x1="${ax}" y1="${ay - 9}" x2="${ax}" y2="${ay + 9}"/></g>`);
    parts.push(`<g stroke="#000" stroke-width="0.9"><line x1="${ax - 9}" y1="${ay}" x2="${ax + 9}" y2="${ay}"/><line x1="${ax}" y1="${ay - 9}" x2="${ax}" y2="${ay + 9}"/></g>`);
  }

  // Zone labels (bigger zones only).
  for (const z of zones) {
    if (z.area < 2500) continue;
    const lx = px(z.cx), ly = py(z.cy);
    const capTxt = z.excluded ? 'EXCLUDED' : `${z.sizeClass.id} · cap ${z.cap.toFixed(0)}`;
    parts.push(`<text x="${lx}" y="${ly}" font-size="11" font-weight="600" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(z.name)}</text>`);
    parts.push(`<text x="${lx}" y="${ly + 13}" font-size="10" text-anchor="middle" fill="#222" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(capTxt)}</text>`);
  }

  // Legend.
  const lx = M + SC * (xMax - xMin) + 100;
  let ly = M + 10;
  parts.push(`<text x="${lx}" y="${ly}" font-size="13" font-weight="600" fill="#222">Largest class that fits (chord rule)</text>`);
  ly += 10;
  const ordered = classes; // ascending
  for (let c = ordered.length - 1; c >= 0; c--) {
    ly += 24;
    const k = ordered[c];
    const maxDim = Math.max(k.width_mm, k.height_mm);
    const need = `needs R ≥ ${(k.width_mm ** 2 / (8 * zoneResult.tol)).toFixed(0)} (1-curved) / ${(maxDim ** 2 / (8 * zoneResult.tol)).toFixed(0)} mm (2-curved)`;
    parts.push(`<rect x="${lx}" y="${ly - 13}" width="18" height="16" fill="${ZONE_FILL[c] ?? '#ccc'}" stroke="#555" stroke-width="0.5"/>`);
    parts.push(`<text x="${lx + 26}" y="${ly}" font-size="11.5" fill="#222">${esc(k.id)}  ${k.width_mm}×${k.height_mm} mm  <tspan fill="#666">(${esc(need)})</tspan></text>`);
  }
  ly += 24;
  parts.push(`<rect x="${lx}" y="${ly - 13}" width="18" height="16" fill="url(#excl)" stroke="#555" stroke-width="0.5"/>`);
  parts.push(`<text x="${lx + 26}" y="${ly}" font-size="11.5" fill="#222">EXCLUDED — no class fits (apex)</text>`);
  ly += 24;
  parts.push(`<rect x="${lx}" y="${ly - 13}" width="18" height="16" fill="#eee" stroke="#555" stroke-width="0.5"/><rect x="${lx}" y="${ly - 13}" width="18" height="16" fill="url(#singleTex)"/>`);
  parts.push(`<text x="${lx + 26}" y="${ly}" font-size="11.5" fill="#222">vertical texture = single-curved: width-capped,</text>`);
  ly += 15;
  parts.push(`<text x="${lx + 26}" y="${ly}" font-size="11.5" fill="#222">panels may run tall; smooth fill = both dims capped</text>`);
  ly += 28;
  parts.push(`<text x="${lx}" y="${ly}" font-size="13" font-weight="600" fill="#222">Model</text>`);
  const gm = model.girthCheck;
  const mLines = [
    `bust ${m.bustCircumference} (model ${gm.bust.model.toFixed(0)})`,
    `underbust ${m.underbustCircumference} (model ${gm.underbust.model.toFixed(0)})`,
    `waist ${m.waistCircumference} (model ${gm.waist.model.toFixed(0)})`,
    `CF length ${m.centerFrontLength} · apex h ${m.apexHeight} · sep ${m.apexSeparation}`,
    `bust prominence (solved) ${model.apex.prominence.toFixed(1)} mm`,
  ];
  for (const line of mLines) {
    ly += 17;
    parts.push(`<text x="${lx}" y="${ly}" font-size="11" fill="#444">${esc(line)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}
