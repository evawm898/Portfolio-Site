# Drawing the filigree — the guide

The generator takes your drawings and does three things with them. It bends each one along the composed flow. It
sizes it to its placement. It stacks it at a depth in the relief. Draw into **`docs/frame-drawing-template.svg`**.
It has one artboard per element, already filled with placeholders (made from the forms round's outlines), so you can
see the expected scale and style. Draw over them, keep the guides, and save as SVG.

To try a drawing:

```
node tools/frame-drawn-check.mjs my-drawing.svg              # what is wrong, where every piece lands, does it print
node tools/frame-drawn-check.mjs my-drawing.svg --stl out/   # and the three frames' STLs
node tools/shot-frame-drawn.mjs out/ --drawing my-drawing.svg   # the picture, beside the forms round
```

(The option is hidden: `ornFlow: 'drawn'`. On the page, `window.__frame.setDrawing(svgText)` loads a drawing.)

## One artboard per element

Each element is a group named `<kind>-<n>`. These are the kinds, how many variants each has, and where each is used.

| kind | variants | where it goes | how it is placed | default depth |
|---|---|---|---|---|
| `c-scroll` | 3, varying proportions | the crest C, the shoulder C, the corner C | **bent** along its slot; a `volute-1` closes its end | mid |
| `s-scroll` | 2 (short, long) | the stem, from the foot or from the molding | **bent**; a `volute-2` (the node) closes its end | back |
| `volute` | 1 closed, 2 open hook | the end of every C, flame, stem and foot | **placed whole** at its body's end | mid |
| `flame` | 3 (inner, middle, the dominant one) | the flank flames | **bent**; a `volute-2` closes its end | mid |
| `shell` | 1 | the crest and the bottom, on the axis | **placed whole**, opening along +x | front |
| `foot` | 1 | the foot / cartouche under the bottom shell | **bent**; a `volute-1` curls it under | mid |
| `leaf` | 1 (optional) | the fan at the meeting, the sheath, the curl-under | **bent** | back |

A slot takes the variant of its kind that needs the **least scaling** to fill it, counting both the stretch along its
length and the scale across. So variants with different proportions serve different slots. Add a variant by copying
an artboard and numbering it (`flame-4`). A missing kind falls back to a similar one (a stem with no `s-scroll`
takes a flame), and the build says so.

## The element's own frame (the guides)

- **`root`** (the orange dot) is the origin: where the element leaves the frame, or leaves its parent.
- It **grows along +x**, to the right on the page. The **spine** is the orange line through the root.
- **Up** (the arrow) is the side its END curls to. Draw the curl's inside up.
- **`size`** (the dashed box) is what is fitted to the slot. Its **length runs from the root**. Its **height is the
  slot's width** at the default 180 mm print.
- **`ruler`** (the red bar) is **1 mm at the default print**: the least stroke and the least gap that prints. It also
  sets the file's units, so draw at any scale you like and keep the ruler beside the drawing. The template uses
  10 units per mm.
- **`rigid`**: add this guide to an element and it is placed whole, never bent.

**Draw every bent body STRAIGHTENED along its spine.** The composition supplies the curve. A C-scroll body is a strap
drawn left to right, not a C. Its curl comes from its slot's spine, and its volute is the separate `volute` artboard.
**End a body exactly at its size box's right edge.** That is where its volute is attached, scaled so the volute's
entry width matches the body's width there.

## Layers (sub-groups) inside an element

| layer | what it holds | becomes |
|---|---|---|
| `outline` | closed, filled shapes (all unioned) | the body, at the kind's depth |
| `outline-back` / `outline-mid` / `outline-front` | closed shapes | a part at that depth (a tongue behind its C, a ball in an eye) |
| `detail` (or `ridge`) | stroked lines (centrelines; the stroke width is ignored) | raised ridges: a midrib, veins, a reed, an arris |
| `groove` | stroked lines | incised grooves: a channel, a flute |
| `holes` | closed shapes | cut THROUGH the relief: an eye, a slit |
| `guides` | `root`, `size`, `ruler`, `rigid`, labels | not built |

Names are read the way Illustrator and Inkscape write them: layer names, `data-name`, an id with `_x2D_` escapes or a
`_2_` suffix, and `flame-2-outline` style prefixes are all fine.

**Depth.** Front lies over mid, and mid over back. Where a part covers a lower one it stands a step (0.4 mm) above
it, so a front part reads as lying over its neighbour. A hole cuts its own element and anything beneath it. **A part
that must stand inside a hole (the ball in an eye) goes one depth in front of the rest of its element.**

## How a drawing is bent, and where it distorts

A bent body uses the **skeletal map**. A point at (x, y) goes to the spine's point at arc length sx·x, plus sy·y along
the spine's normal there. Here sx = (the slot's spine length) ÷ (the size box's length) and sy = (the slot's width) ÷
(the box's height).

- **Kept exactly:** distance along the spine, and distance from it.
- **On the INSIDE of a turn** a shape is compressed along the spine by (1 − κ·y), and **on the outside** stretched by
  (1 + κ·y). So keep wide features (lobes, bumps) off the inside of a tight bend, or expect them squeezed.
- **Where a turn is tighter than the drawing is wide**, the spine is first relaxed locally (both ends held).
- **What remains is held** at 0.9 of the turn's radius and reported. A fold through the centre is never built.
- **If sx ≠ sy**, the drawing is also stretched (`frame-drawn-check` prints this as the anisotropy).
- **Volutes and shells are never bent**, so draw them exactly as they should look.

## What to avoid

- **Open paths** in `outline` or `holes`. They are an error (closed for the build, but fix them).
- **Self-intersecting outlines.** They are an error. Draw overlapping pieces as separate shapes instead; they are
  unioned.
- **Anything under the floor:** strokes or gaps narrower than the red ruler (1 mm), holes smaller than it across, or
  two pieces of one element closer than it. Under the floor they print shut or as slivers.
- **Holes made as compound paths** in `outline` (a ring drawn as a shape with a hole). Outlines are unioned, so the
  hole fills. Put it in `holes`.
- Text, images, clipping masks, filters and live effects: ignored. Only the shapes' geometry is read (fill and stroke
  colours mean nothing).
- Detail lines are centrelines: their stroke width is ignored, and a ridge is about 0.9 mm wide.
