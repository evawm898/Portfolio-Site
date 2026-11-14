/* ---------------------------------------------------
   yarn-diagrams.js — the animated yarn construction diagrams
   (Yarn Characterization field note).

   A COPY of the yarn pieces of lab.html's inline script — the
   builders for #yarn-construction and #covered-yarn-twist and
   their wiring — so /lab stays untouched. Keep the two in step
   by hand until /lab is refactored to load this file instead.
   Changes from the lab copy: the early `return` when there is no
   yarn grid is a guarded block (so the covered grid wires on its
   own), and the SVG ids are prefixed yd-.

   It wires whatever it finds:
     [data-yarn-grid]    — single / plied / core-spun / drawn covered
     [data-covered-grid] — SCY S, SCY Z, DCY (Z under S)
   Each grid plays once the first time it scrolls into view, then
   replays a panel on hover (tap on a touch device).

   Colours are tokens only, through styles.css's legacy aliases onto
   tokens.css: ink, ink-dim, petrol-bright (= petrol) and petrol
   (= the deep fill), so the strokes follow the locked palette.
--------------------------------------------------- */
(function () {
  'use strict';

  var isTouchDevice = window.matchMedia('(hover: none)').matches;


  /* ---------------------------------------------------
     geometry helpers
  --------------------------------------------------- */
  var YARN = { top: 34, bottom: 226, cx: 60 };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function wavePath(opts) {
    var amp = opts.amp, freq = opts.freq, phase = opts.phase || 0, n = opts.n || 56;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var y = lerp(YARN.top, YARN.bottom, t);
      var x = YARN.cx + amp * Math.sin(2 * Math.PI * freq * t + phase);
      pts.push(x.toFixed(2) + ',' + y.toFixed(2));
    }
    return 'M' + pts.join(' L');
  }

  // A mostly-straight filament that snags into a fuzzy tangled knot at a
  // few points along its length — the "air covered" look of loose fiber
  // caught in loops, rather than a clean helix.
  var FUZZ_CLUSTERS = [
    { t: 0.12, side: -1 },
    { t: 0.38, side: 1 },
    { t: 0.63, side: -1 },
    { t: 0.88, side: 1 }
  ];
  var FUZZ_SPAN = 0.07;
  var FUZZ_LOOPS = 2.2;

  // Local angle/position for the fuzzy filament at parameter t (0..1).
  // Shared by the path sampler and the depth (front/back) function below,
  // so the two stay in lockstep.
  function fuzzyClusterAt(t) {
    for (var c = 0; c < FUZZ_CLUSTERS.length; c++) {
      var cl = FUZZ_CLUSTERS[c];
      if (Math.abs(t - cl.t) <= FUZZ_SPAN / 2) return cl;
    }
    return null;
  }

  function fuzzySample(t) {
    var cx = YARN.cx;
    var y = lerp(YARN.top, YARN.bottom, t);
    var cluster = fuzzyClusterAt(t);
    var x;
    if (cluster) {
      var lt = (t - (cluster.t - FUZZ_SPAN / 2)) / FUZZ_SPAN;
      var angle = lt * Math.PI * 2 * FUZZ_LOOPS + cluster.t * 40;
      // radius breathes once per revolution (reads as distinct loops)
      // plus a small high-frequency wobble on top for fuzz, not scribble
      var rr = 10 * (0.55 + 0.45 * Math.sin(lt * Math.PI * FUZZ_LOOPS + cluster.t * 10))
             + 1.1 * Math.sin(lt * Math.PI * 9 + cluster.t * 7);
      x = cx + cluster.side * 26 + rr * Math.cos(angle);
      y = y + rr * Math.sin(angle) * 0.48;
    } else {
      x = cx + Math.sin(t * 46 + 1.3) * 1.6 + Math.sin(t * 17 + 4.1) * 1.1;
    }
    return [x, y];
  }

  // cos-sign of the same angle used above: >=0 means this stretch of the
  // filament is nearer the viewer than the core (render in front of it),
  // <0 means it's on the far side (render behind it). Straight stretches
  // between clusters aren't wrapping around anything, so they stay front.
  function fuzzyDepth(t) {
    var cluster = fuzzyClusterAt(t);
    if (!cluster) return 1;
    var lt = (t - (cluster.t - FUZZ_SPAN / 2)) / FUZZ_SPAN;
    var angle = lt * Math.PI * 2 * FUZZ_LOOPS + cluster.t * 40;
    return Math.cos(angle);
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Splits t in [0,1] into runs where sign(fn(t)) stays constant — used to
  // find where a strand/wrap crosses from front to behind (or back again).
  function computeSignRanges(fn, steps) {
    steps = steps || 500;
    var ranges = [];
    var prevT = 0;
    var prevFront = fn(0) >= 0;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var front = fn(t) >= 0;
      if (front !== prevFront) {
        ranges.push({ t0: prevT, t1: t, front: prevFront });
        prevT = t;
        prevFront = front;
      }
    }
    ranges.push({ t0: prevT, t1: 1, front: prevFront });
    return ranges;
  }

  // Rendered arc length of sampleFn over [t0,t1] (coarse, a handful of
  // samples is plenty — only used to size-check slivers, not to draw).
  function arcLength(sampleFn, t0, t1, steps) {
    steps = steps || 6;
    var len = 0, prev = sampleFn(t0);
    for (var i = 1; i <= steps; i++) {
      var p = sampleFn(t0 + (t1 - t0) * i / steps);
      var dx = p[0] - prev[0], dy = p[1] - prev[1];
      len += Math.sqrt(dx * dx + dy * dy);
      prev = p;
    }
    return len;
  }

  // A crossing range shorter than ~the stroke width renders as a dot
  // (round linecap) rather than a visible sliver of coil — fold those
  // into whichever neighboring range they're smaller than into.
  function mergeTinySegments(ranges, sampleFn, minPixelLen) {
    var merged = true;
    while (merged && ranges.length > 1) {
      merged = false;
      for (var j = 0; j < ranges.length; j++) {
        if (arcLength(sampleFn, ranges[j].t0, ranges[j].t1) < minPixelLen) {
          if (j === 0) { ranges[1].t0 = ranges[j].t0; }
          else { ranges[j - 1].t1 = ranges[j].t1; }
          ranges.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
    return ranges;
  }

  // Builds a path 'd' string sampling sampleFn(t) -> [x,y] across [t0,t1].
  function arcPath(sampleFn, t0, t1, minPoints) {
    var n = Math.max(minPoints || 4, Math.round((t1 - t0) * 260));
    var parts = [];
    for (var i = 0; i <= n; i++) {
      var t = t0 + (t1 - t0) * (i / n);
      var p = sampleFn(t);
      parts.push(p[0].toFixed(2) + ',' + p[1].toFixed(2));
    }
    return 'M' + parts.join(' L');
  }

  /* ---------------------------------------------------
     stroke-dasharray / dashoffset draw-on helpers
  --------------------------------------------------- */
  function resetDraw(path) {
    var len = path.dataset.len;
    if (!len) { len = path.getTotalLength(); path.dataset.len = len; }
    path.style.transition = 'none';
    path.style.strokeDasharray = len + ' ' + len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect(); // force reflow so the next transition isn't skipped
    path.style.transition = '';
  }

  function playDraw(path, duration, delay) {
    // Fast-start easing: a slow-starting curve here means every segment
    // lingers at a near-zero drawn length right as it begins, which
    // (with round linecap) reads as a stray dot rather than a growing
    // stroke — especially with many short segments revealing at once.
    path.style.transition = 'stroke-dashoffset ' + duration + 'ms cubic-bezier(.15,.6,.25,1) ' + (delay || 0) + 'ms';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { path.style.strokeDashoffset = '0'; });
    });
  }

  /* ---------------------------------------------------

     panel builders — each returns { play(), duration }
  --------------------------------------------------- */
  var uid = 0;

  function buildSingle(stage) {
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });
    var strand = svgEl('path', {
      d: wavePath({ amp: 10, freq: 0.9 }),
      fill: 'none', stroke: 'var(--ink)', 'stroke-width': 6,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      class: 'js-strand'
    });
    svg.appendChild(strand);
    stage.appendChild(svg);

    return {
      duration: 700,
      play: function () {
        strand.classList.remove('is-settling');
        strand.getBoundingClientRect();
        strand.classList.add('is-settling');
      }
    };
  }

  function buildPlied(stage) {
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });
    var freq = 2.4, finalAmp = 13, duration = 1100;
    var colorA = 'var(--ink)', colorB = 'var(--petrol-bright)';

    function angleA(t) { return 2 * Math.PI * freq * t; }
    function sampleStrand(strand, t, amp) {
      var angle = strand === 'A' ? angleA(t) : angleA(t) + Math.PI;
      var y = lerp(YARN.top, YARN.bottom, t);
      var x = YARN.cx + amp * Math.sin(angle);
      return [x, y];
    }

    // B is exactly opposite phase to A, so at any point exactly one of
    // them is nearer the viewer. That strand paints on top for this run.
    var ranges = computeSignRanges(function (t) { return Math.cos(angleA(t)); });

    var segs = ranges.map(function (r) {
      var backStrand = r.front ? 'B' : 'A';
      var frontStrand = r.front ? 'A' : 'B';
      var backEl = svgEl('path', {
        fill: 'none', stroke: backStrand === 'A' ? colorA : colorB,
        'stroke-width': 5, 'stroke-linecap': 'round'
      });
      var frontEl = svgEl('path', {
        fill: 'none', stroke: frontStrand === 'A' ? colorA : colorB,
        'stroke-width': 5, 'stroke-linecap': 'round'
      });
      svg.appendChild(backEl);
      svg.appendChild(frontEl);
      return { t0: r.t0, t1: r.t1, backStrand: backStrand, frontStrand: frontStrand, backEl: backEl, frontEl: frontEl };
    });

    function render(amp) {
      segs.forEach(function (seg) {
        seg.backEl.setAttribute('d', arcPath(function (t) { return sampleStrand(seg.backStrand, t, amp); }, seg.t0, seg.t1));
        seg.frontEl.setAttribute('d', arcPath(function (t) { return sampleStrand(seg.frontStrand, t, amp); }, seg.t0, seg.t1));
      });
    }
    render(0);
    stage.appendChild(svg);

    var raf = null;
    return {
      duration: duration,
      play: function () {
        if (raf) cancelAnimationFrame(raf);
        var start = performance.now();
        function frame(now) {
          var t = Math.max(0, Math.min(1, (now - start) / duration));
          var amp = lerp(0, finalAmp, easeInOutCubic(t));
          render(amp);
          if (t < 1) raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      }
    };
  }

  function buildCoreSpun(stage) {
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });
    var core = svgEl('path', {
      d: 'M60,34 L60,226', fill: 'none', stroke: 'var(--ink-dim)',
      'stroke-width': 14, 'stroke-linecap': 'round', class: 'js-core'
    });

    var freq = 5.5, amp = 15;
    function angle(t) { return 2 * Math.PI * freq * t; }
    function sample(t) {
      var y = lerp(YARN.top, YARN.bottom, t);
      var x = YARN.cx + amp * Math.sin(angle(t));
      return [x, y];
    }
    // Same helix-depth logic as the wrap texture below: cos >= 0 means
    // this stretch of the wrap is nearer the viewer than the core.
    var ranges = computeSignRanges(function (t) { return Math.cos(angle(t)); });
    var wrapDuration = 900, wrapDelay = 300;

    var segs = ranges.map(function (r) {
      var el = svgEl('path', {
        d: arcPath(sample, r.t0, r.t1),
        fill: 'none', stroke: 'var(--petrol-bright)', 'stroke-width': 3.5,
        // butt, not round: a hidden segment's dash sits right on the
        // dasharray pattern's on/off boundary, and round linecap renders
        // that degenerate zero-length dash as a stray filled dot.
        'stroke-linecap': 'butt'
      });
      return { el: el, t0: r.t0, t1: r.t1, front: r.front };
    });

    // behind the core first, then the core itself, then the segments that
    // pass in front of it — so the wrap visibly alternates over/under
    segs.forEach(function (s) { if (!s.front) svg.appendChild(s.el); });
    svg.appendChild(core);
    segs.forEach(function (s) { if (s.front) svg.appendChild(s.el); });
    segs.forEach(function (s) { resetDraw(s.el); });
    stage.appendChild(svg);

    return {
      duration: 1250,
      play: function () {
        core.classList.remove('is-appearing');
        core.getBoundingClientRect();
        core.classList.add('is-appearing');
        segs.forEach(function (s) {
          resetDraw(s.el);
          var delay = wrapDelay + s.t0 * wrapDuration;
          var dur = Math.max(60, (s.t1 - s.t0) * wrapDuration);
          playDraw(s.el, dur, delay);
        });
      }
    };
  }

  function buildDrawnCovered(stage) {
    uid++;
    var filterId = 'yd-fuzzFilter-' + uid;
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });

    // Fuzzy/hairy stroke texture: turbulence displaces the line's own
    // rendering, so the reveal (dashoffset) and the fuzz (filter) are
    // independent and compose naturally.
    var defs = svgEl('defs', {});
    var filter = svgEl('filter', { id: filterId, x: '-60%', y: '-60%', width: '220%', height: '220%' });
    var turbulence = svgEl('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '0.9 0.4', numOctaves: '2', seed: '3', result: 'noise'
    });
    var displace = svgEl('feDisplacementMap', {
      'in': 'SourceGraphic', in2: 'noise', scale: '2.6',
      xChannelSelector: 'R', yChannelSelector: 'G'
    });
    filter.appendChild(turbulence);
    filter.appendChild(displace);
    defs.appendChild(filter);

    var core = svgEl('path', {
      d: 'M60,34 L60,226', fill: 'none', stroke: 'var(--ink-dim)',
      'stroke-width': 11, 'stroke-linecap': 'round', class: 'js-core'
    });

    svg.appendChild(defs);

    var wrapDuration = 950, wrapDelay = 300;
    var ranges = computeSignRanges(fuzzyDepth, 600);

    var segs = ranges.map(function (r) {
      var el = svgEl('path', {
        d: arcPath(fuzzySample, r.t0, r.t1),
        fill: 'none', stroke: 'var(--petrol-bright)', 'stroke-width': 2.2,
        // butt, not round — see buildCoreSpun for why (hidden segments
        // otherwise render as a stray filled dot)
        'stroke-linecap': 'butt', 'stroke-linejoin': 'round',
        filter: 'url(#' + filterId + ')'
      });
      return { el: el, t0: r.t0, t1: r.t1, front: r.front };
    });

    // behind the core first, then the core, then the segments in front —
    // matters mainly inside each tangle, where the loop crosses itself
    segs.forEach(function (s) { if (!s.front) svg.appendChild(s.el); });
    svg.appendChild(core);
    segs.forEach(function (s) { if (s.front) svg.appendChild(s.el); });
    segs.forEach(function (s) { resetDraw(s.el); });
    stage.appendChild(svg);

    // Jitters the turbulence seed/frequency while the wrap draws on, so the
    // fuzzy texture visibly trembles as it travels the path — settles back
    // to a resting texture once the reveal finishes.
    var shakeTimer = null;
    function shake(duration) {
      if (shakeTimer) clearInterval(shakeTimer);
      var elapsed = 0, step = 90;
      shakeTimer = setInterval(function () {
        elapsed += step;
        turbulence.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
        turbulence.setAttribute('baseFrequency',
          (0.75 + Math.random() * 0.35).toFixed(2) + ' ' + (0.3 + Math.random() * 0.25).toFixed(2));
        if (elapsed >= duration) {
          clearInterval(shakeTimer);
          shakeTimer = null;
          turbulence.setAttribute('seed', '3');
          turbulence.setAttribute('baseFrequency', '0.9 0.4');
        }
      }, step);
    }

    return {
      duration: 1300,
      play: function () {
        core.classList.remove('is-appearing');
        core.getBoundingClientRect();
        core.classList.add('is-appearing');
        segs.forEach(function (s) {
          resetDraw(s.el);
          var delay = wrapDelay + s.t0 * wrapDuration;
          var dur = Math.max(60, (s.t1 - s.t0) * wrapDuration);
          playDraw(s.el, dur, delay);
        });
        shake(wrapDelay + wrapDuration);
      }
    };
  }

  /* ---------------------------------------------------
     covered yarn (SCY / DCY) — shared wrap-layer helpers
  --------------------------------------------------- */

  // One spiral wrap layer around the core: freq/amp shape it, dir flips
  // the twist direction (+1 / -1 reads as Z / S — see buildScyMini/buildDcy).
  // amp and width may be constants or functions of t. Pass sampleX(t) to
  // override the horizontal offset entirely (e.g. to morph part of the
  // coil into an explicit letter shape) — depth/front-back still comes
  // from the underlying sine's angle, so the weave stays consistent.
  function buildWrapLayer(opts) {
    var freq = opts.freq, dir = opts.dir || 1, phase = opts.phase || 0;
    var ampFn = typeof opts.amp === 'function' ? opts.amp : function () { return opts.amp; };
    var widthFn = typeof opts.width === 'function' ? opts.width : function () { return opts.width; };
    function angle(t) { return dir * 2 * Math.PI * freq * t + phase; }
    var xFn = opts.sampleX || function (t) { return ampFn(t) * Math.sin(angle(t)); };
    var depthFn = opts.depthFn || function (t) { return Math.cos(angle(t)); };
    function sample(t) {
      var y = lerp(YARN.top, YARN.bottom, t);
      return [YARN.cx + xFn(t), y];
    }
    var ranges = computeSignRanges(depthFn);
    ranges = mergeTinySegments(ranges, sample, 6);
    var segs = ranges.map(function (r) {
      var midT = (r.t0 + r.t1) / 2;
      var el = svgEl('path', {
        d: arcPath(sample, r.t0, r.t1),
        fill: 'none', stroke: opts.color, 'stroke-width': widthFn(midT),
        // butt, not round: a hidden (zero-length-dash) segment with a
        // round linecap still renders as a filled dot — the linecap
        // itself has radius. Segments meet end-to-end at shared points,
        // so butt caps at those joints are imperceptible; only the very
        // top/bottom of the whole coil loses its rounding, which is fine.
        'stroke-linecap': 'butt'
      });
      return { el: el, t0: r.t0, t1: r.t1, front: r.front };
    });
    return { segs: segs };
  }

  function appendGroup(svg, segs, wantFront) {
    segs.forEach(function (s) { if (s.front === wantFront) svg.appendChild(s.el); });
  }

  function revealLayer(layer, duration, baseDelay) {
    layer.segs.forEach(function (s) {
      resetDraw(s.el);
      var delay = baseDelay + s.t0 * duration;
      var dur = Math.max(60, (s.t1 - s.t0) * duration);
      playDraw(s.el, dur, delay);
    });
  }

  function makeCore(width) {
    return svgEl('path', {
      d: 'M60,34 L60,226', fill: 'none', stroke: 'var(--ink-dim)',
      'stroke-width': width, 'stroke-linecap': 'round', class: 'js-core'
    });
  }

  // Single covered yarn, one direction: a plain coil around the core,
  // and once it finishes, a bold solid S/Z fades in on top of it (and
  // fades back out) to call out the twist direction.
  function buildScyMini(stage, dir) {
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });
    var core = makeCore(14);
    var wrap = buildWrapLayer({ freq: 5.5, amp: 15, dir: dir, color: 'var(--petrol-bright)', width: 3.5 });

    appendGroup(svg, wrap.segs, false);
    svg.appendChild(core);
    appendGroup(svg, wrap.segs, true);
    wrap.segs.forEach(function (s) { resetDraw(s.el); });

    // Top-down wipe reveal via an SVG clipPath rect, its height driven
    // directly by rAF (CSS clip-path percentages/transforms on an SVG
    // <text> proved unreliable to animate in testing — this is fully
    // JS-controlled instead). The letter's own opacity, via CSS, only
    // handles the hold + fade-out at the end.
    uid++;
    var clipId = 'yd-letterWipe-' + uid;
    var defs = svgEl('defs', {});
    var clipPath = svgEl('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
    var clipRect = svgEl('rect', { x: 0, y: 0, width: 120, height: 0 });
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    var letter = svgEl('text', {
      x: 60, y: 130, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      class: 'js-direction-letter',
      'clip-path': 'url(#' + clipId + ')'
    });
    letter.textContent = dir >= 0 ? 'Z' : 'S';
    svg.appendChild(letter);

    stage.appendChild(svg);

    var wrapDuration = 850, wrapDelay = 300;
    var wipeDuration = 2250, holdDuration = 2760;
    var fadeDuration = 1932, fadeDurationFast = fadeDuration / 2;
    var wipeRaf = null, fadeTimer = null, isHovering = false;

    function setLetterOpacity(value, duration) {
      letter.style.transition = 'opacity ' + duration + 'ms ease';
      letter.getBoundingClientRect(); // force reflow so re-triggers still transition
      letter.style.opacity = String(value);
    }

    // Hovering holds the letter open indefinitely; only once the mouse
    // actually leaves does it fade — at twice the normal fade speed.
    function scheduleFadeUnlessHovering() {
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () {
        fadeTimer = null;
        if (!isHovering) setLetterOpacity(0, fadeDuration);
      }, holdDuration);
    }

    return {
      duration: wrapDelay + wrapDuration + holdDuration + fadeDuration + 60,
      play: function () {
        core.classList.remove('is-appearing');
        core.getBoundingClientRect();
        core.classList.add('is-appearing');
        revealLayer(wrap, wrapDuration, wrapDelay);

        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        letter.style.transition = 'none';
        letter.style.opacity = '0';
        letter.getBoundingClientRect();
        clipRect.setAttribute('height', 0);

        setTimeout(function () {
          letter.style.transition = 'none';
          letter.style.opacity = '1';
          letter.getBoundingClientRect();
          if (wipeRaf) cancelAnimationFrame(wipeRaf);
          var start = performance.now();
          function frame(now) {
            var t = Math.max(0, Math.min(1, (now - start) / wipeDuration));
            clipRect.setAttribute('height', String(260 * easeOutCubic(t)));
            if (t < 1) {
              wipeRaf = requestAnimationFrame(frame);
            } else if (!isHovering) {
              scheduleFadeUnlessHovering();
            }
          }
          wipeRaf = requestAnimationFrame(frame);
        }, wrapDelay + wrapDuration);
      },
      onHoverStart: function () {
        isHovering = true;
        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        setLetterOpacity(1, 200); // bring it back if it was mid-fade
      },
      onHoverEnd: function () {
        isHovering = false;
        if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        setLetterOpacity(0, fadeDurationFast);
      }
    };
  }

  // Double covered yarn: an inner Z-twist layer wraps first, then an outer
  // S-twist layer wraps over both the core and the finished inner layer.
  function buildDcy(stage) {
    var svg = svgEl('svg', { viewBox: '0 0 120 260', class: 'yarn-panel__svg' });
    var core = makeCore(10);
    var inner = buildWrapLayer({ freq: 16, amp: 9, dir: 1, color: 'var(--petrol)', width: 3.5 });
    var outer = buildWrapLayer({ freq: 5, amp: 17, dir: -1, color: 'var(--petrol-bright)', width: 4.5 });

    // furthest back to nearest: outer-back, inner-back, core, inner-front, outer-front
    appendGroup(svg, outer.segs, false);
    appendGroup(svg, inner.segs, false);
    svg.appendChild(core);
    appendGroup(svg, inner.segs, true);
    appendGroup(svg, outer.segs, true);

    inner.segs.forEach(function (s) { resetDraw(s.el); });
    outer.segs.forEach(function (s) { resetDraw(s.el); });
    stage.appendChild(svg);

    var innerDuration = 750, innerDelay = 300, gap = 150, outerDuration = 1800;
    var outerDelay = innerDelay + innerDuration + gap;

    return {
      duration: outerDelay + outerDuration + 60,
      play: function () {
        core.classList.remove('is-appearing');
        core.getBoundingClientRect();
        core.classList.add('is-appearing');
        revealLayer(inner, innerDuration, innerDelay);
        revealLayer(outer, outerDuration, outerDelay);
      }
    };
  }

  /* ---------------------------------------------------
     wire up panels
  --------------------------------------------------- */
  var BUILDERS = {
    'single': buildSingle,
    'plied': buildPlied,
    'core-spun': buildCoreSpun,
    'drawn-covered': buildDrawnCovered
  };
  var ORDER = ['single', 'plied', 'core-spun', 'drawn-covered'];

  var grid = document.querySelector('[data-yarn-grid]');
  if (grid) {

    var controllers = {};
    var playing = {};
    var hasAutoPlayed = false;

    var panels = grid.querySelectorAll('.yarn-panel');
    panels.forEach(function (panel) {
      var type = panel.dataset.yarn;
      var stage = panel.querySelector('[data-yarn-stage]');
      controllers[type] = BUILDERS[type](stage);
    });

    function play(type) {
      if (playing[type]) return;
      var panel = grid.querySelector('[data-yarn="' + type + '"]');
      var label = panel.querySelector('[data-yarn-label]');
      var controller = controllers[type];

      playing[type] = true;
      panel.classList.add('is-playing');
      label.classList.add('is-active');
      controller.play();

      setTimeout(function () {
        playing[type] = false;
        panel.classList.remove('is-playing');
        label.classList.remove('is-active');
      }, controller.duration + 60);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !hasAutoPlayed) {
          hasAutoPlayed = true;
          ORDER.forEach(function (type, i) {
            setTimeout(function () { play(type); }, i * 150);
          });
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(grid);

    panels.forEach(function (panel) {
      panel.addEventListener('mouseenter', function () {
        if (!hasAutoPlayed) return; // hover-replay only kicks in after the initial autoplay
        play(panel.dataset.yarn);
      });
      panel.addEventListener('click', function () {
        if (!isTouchDevice) return; // desktop already gets this via hover
        if (!hasAutoPlayed) return;
        play(panel.dataset.yarn);
      });
    });
  }

  /* ---------------------------------------------------
     wire up covered-yarn (SCY / DCY) panels
  --------------------------------------------------- */
  var coveredGrid = document.querySelector('[data-covered-grid]');
  if (coveredGrid) {
    var COVERED_BUILDERS = {
      'scy-s': function (stage) { return buildScyMini(stage, -1); },
      'scy-z': function (stage) { return buildScyMini(stage, 1); },
      'dcy': buildDcy
    };
    var COVERED_ORDER = ['scy-s', 'scy-z', 'dcy'];

    var coveredControllers = {};
    var coveredPlaying = {};
    var coveredAutoPlayed = false;

    var coveredItems = coveredGrid.querySelectorAll('[data-covered]');
    coveredItems.forEach(function (item) {
      var type = item.dataset.covered;
      var stage = item.querySelector('[data-covered-stage]');
      coveredControllers[type] = COVERED_BUILDERS[type](stage);
    });

    function playCovered(type) {
      if (coveredPlaying[type]) return;
      var item = coveredGrid.querySelector('[data-covered="' + type + '"]');
      var dirLabel = item.querySelector('[data-covered-dir]');
      var controller = coveredControllers[type];

      coveredPlaying[type] = true;
      item.classList.add('is-playing');
      dirLabel.classList.add('is-active');
      controller.play();

      setTimeout(function () {
        coveredPlaying[type] = false;
        item.classList.remove('is-playing');
        dirLabel.classList.remove('is-active');
      }, controller.duration + 60);
    }

    var coveredIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !coveredAutoPlayed) {
          coveredAutoPlayed = true;
          COVERED_ORDER.forEach(function (type, i) {
            setTimeout(function () { playCovered(type); }, i * 200);
          });
          coveredIo.disconnect();
        }
      });
    }, { threshold: 0.35 });
    coveredIo.observe(coveredGrid);

    coveredItems.forEach(function (item) {
      var type = item.dataset.covered;
      item.addEventListener('mouseenter', function () {
        var controller = coveredControllers[type];
        if (controller.onHoverStart) controller.onHoverStart();
        if (!coveredAutoPlayed) return;
        playCovered(type);
      });
      item.addEventListener('mouseleave', function () {
        var controller = coveredControllers[type];
        if (controller.onHoverEnd) controller.onHoverEnd();
      });
      item.addEventListener('click', function () {
        if (!isTouchDevice) return; // desktop already gets this via hover
        if (!coveredAutoPlayed) return;
        playCovered(type);
      });
    });
  }

})();
