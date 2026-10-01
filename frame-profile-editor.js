/* frame-profile-editor.js — a draggable curve editor for the molding profile.

   One canvas: x across the band (outer edge at the left, inner at the right),
   z depth upward (proud toward the viewer). Control points drag; double-click
   the curve to add one; right-click a point to remove it (never the two ends).
   x stays strictly increasing because a point is clamped between its
   neighbours, which is what frame-geometry's monotone cubic requires.

   The drawn curve is frame-geometry's OWN profileSamples() of the points — not
   a second interpolation — so what the editor shows is what the sweep uses.
   The pointer pattern (capture on down, move while held, release on window
   pointerup) is shape-editor-app.js's; the class is new because that file's
   panes are welded to the dress domain. */

import { profileSamples } from './frame-geometry.js';

const PAD = 14, HIT = 9, MIN_DX = 0.02;

export class ProfileEditor {
  constructor(canvas, points, { onChange = null, onCommit = null } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.points = points.map(([x, z]) => [x, z]);
    this.onChange = onChange; this.onCommit = onCommit;
    this.drag = null;
    this._wire();
    this.draw();
  }
  setPoints(points) { this.points = points.map(([x, z]) => [x, z]); this.draw(); }
  getPoints() { return this.points.map(([x, z]) => [x, z]); }

  /* canvas px <-> profile units */
  _geom() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    }
    return { w, h, dpr, x0: PAD, x1: w - PAD, y0: h - PAD, y1: PAD };
  }
  _toPx(g, x, z) { return [g.x0 + x * (g.x1 - g.x0), g.y0 + z * (g.y1 - g.y0)]; }
  _fromPx(g, px, py) { return [(px - g.x0) / (g.x1 - g.x0), (py - g.y0) / (g.y1 - g.y0)]; }
  _pick(px, py) {
    const g = this._geom();
    let best = null, bd = HIT;
    this.points.forEach((p, i) => {
      const [qx, qy] = this._toPx(g, p[0], p[1]);
      const d = Math.hypot(qx - px, qy - py);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  draw() {
    const g = this._geom(), c = this.ctx;
    c.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    c.clearRect(0, 0, g.w, g.h);
    c.fillStyle = 'rgba(237,237,232,0.04)'; c.fillRect(g.x0, g.y1, g.x1 - g.x0, g.y0 - g.y1);
    c.strokeStyle = 'rgba(237,237,232,0.14)'; c.lineWidth = 1;
    c.strokeRect(g.x0 + 0.5, g.y1 + 0.5, g.x1 - g.x0 - 1, g.y0 - g.y1 - 1);
    // the sweep's own sampling
    const s = profileSamples(this.points);
    c.beginPath();
    for (let i = 0; i < s.x.length; i++) { const [px, py] = this._toPx(g, s.x[i], s.z[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    const fill = c.createLinearGradient(0, g.y1, 0, g.y0);
    fill.addColorStop(0, 'rgba(95,160,160,0.25)'); fill.addColorStop(1, 'rgba(95,160,160,0.02)');
    c.lineTo(g.x1, g.y0); c.lineTo(g.x0, g.y0); c.closePath();
    c.fillStyle = fill; c.fill();
    c.beginPath();
    for (let i = 0; i < s.x.length; i++) { const [px, py] = this._toPx(g, s.x[i], s.z[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.strokeStyle = '#5FA0A0'; c.lineWidth = 1.6; c.stroke();
    // control points
    this.points.forEach((p, i) => {
      const [px, py] = this._toPx(g, p[0], p[1]);
      c.beginPath(); c.arc(px, py, i === this.drag ? 5 : 3.5, 0, Math.PI * 2);
      c.fillStyle = i === this.drag ? '#EDEDE8' : '#0A0A0C'; c.fill();
      c.strokeStyle = '#EDEDE8'; c.lineWidth = 1; c.stroke();
    });
    c.fillStyle = 'rgba(237,237,232,0.45)'; c.font = '9px "Space Mono", monospace';
    c.fillText('outer', g.x0, g.h - 3); c.textAlign = 'right'; c.fillText('inner', g.x1, g.h - 3); c.textAlign = 'left';
  }

  _move(i, px, py) {
    const g = this._geom();
    let [x, z] = this._fromPx(g, px, py);
    z = Math.max(0, Math.min(1, z));
    if (i === 0) x = 0; else if (i === this.points.length - 1) x = 1;
    else x = Math.max(this.points[i - 1][0] + MIN_DX, Math.min(this.points[i + 1][0] - MIN_DX, x));
    this.points[i] = [x, z];
  }
  _wire() {
    const c = this.canvas;
    const pos = (ev) => { const r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    c.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      const [px, py] = pos(ev);
      const hit = this._pick(px, py);
      if (hit === null) return;
      this.drag = hit; c.setPointerCapture(ev.pointerId); this.draw();
    });
    c.addEventListener('pointermove', (ev) => {
      const [px, py] = pos(ev);
      if (this.drag !== null) { this._move(this.drag, px, py); this.draw(); this.onChange?.(this.getPoints()); return; }
      c.style.cursor = this._pick(px, py) !== null ? 'grab' : 'crosshair';
    });
    const up = () => { if (this.drag === null) return; this.drag = null; this.draw(); this.onCommit?.(this.getPoints()); };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('dblclick', (ev) => {
      const [px, py] = pos(ev);
      if (this._pick(px, py) !== null) return;
      const g = this._geom();
      let [x, z] = this._fromPx(g, px, py);
      x = Math.max(MIN_DX, Math.min(1 - MIN_DX, x)); z = Math.max(0, Math.min(1, z));
      let i = 1; while (i < this.points.length - 1 && this.points[i][0] < x) i++;
      if (x - this.points[i - 1][0] < MIN_DX || this.points[i][0] - x < MIN_DX) return;
      this.points.splice(i, 0, [x, z]);
      this.draw(); this.onChange?.(this.getPoints()); this.onCommit?.(this.getPoints());
    });
    c.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const [px, py] = pos(ev);
      const hit = this._pick(px, py);
      if (hit === null || hit === 0 || hit === this.points.length - 1) return;
      this.points.splice(hit, 1);
      this.draw(); this.onChange?.(this.getPoints()); this.onCommit?.(this.getPoints());
    });
  }
}
