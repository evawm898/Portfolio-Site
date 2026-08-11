# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Git + Netlify Workflow

- `main` is the stable production branch.
- Never develop directly on `main`.
- Before beginning new work, fetch the latest `main` and create/use a dedicated feature branch.
- Each project or experiment should remain isolated on its own feature branch.
- Open pull requests targeting `main` so Netlify can generate Deploy Previews.
- Do not merge any PR unless explicitly instructed to merge it.
- Do not push experimental work directly to `main`.
- Do not manually publish or trigger a production deployment unless explicitly requested.
- During iteration, changes are reviewed through the Netlify Deploy Preview associated with the PR.
- When a page has a dedicated route such as `/flower.html` or `/textile-gauge-reader.html`, provide the exact Deploy Preview page URL when possible.
- Production publishing may be locked in Netlify while work is being reviewed.
- If multiple finished feature branches are intended for one portfolio update, do not independently merge them to `main` — check first. A combined release branch / release PR may be wanted so the entire site updates in one production deployment.
- Never delete old branches without explicit approval.
- Before making branch-history changes, rebases, force pushes, or destructive Git operations, stop and ask first.

## Flower generator — print-safety is a hard invariant

The Flower Bloom generator (`flower.html`, `flower.js`, `flower-geometry.js`) is a
3D-printing tool, not only an on-screen visual. STL export and watertight /
manifold geometry are **permanent, non-negotiable requirements** — never treat
them as optional or experimental.

- Every geometry change — new parameters, new petal/spiral logic, sepals, stem,
  leaves, receptacle, anything that adds or alters mesh — MUST preserve valid,
  printable STL export.
- **Export contract:** every primitive is an individually closed solid, so the
  exported STL has **zero boundary edges**. Open shells are never acceptable.
  Overlapping closed shells are fine — the slicer unions them. Build new geometry
  the way the existing code does: closed tubes with end caps, watertight beads,
  sealed slabs/ribbons, and sealed solid blades (top face + bottom face + rim).
  Never add a bare single-sided surface or zero-thickness membrane to the export
  mesh.
- Respect `exportMode`: at export, tube/bead radii and slab/blade thickness are
  floored to the printable minimum (`MIN_FEATURE_MM = 0.8`). Any new solid
  primitive must honor the same floor.
- **Verify before calling a geometry change done:** run
  `node tools/verify-flower-export.mjs`. It renders the page headless, exports an
  STL across a range of configurations (add yours to it), and fails if any export
  has boundary edges > 0. A change is not finished until this passes.
- **A correct-looking screen render is not proof.** Geometry can look right live
  and still export broken. Never rely on the visual alone.
- **If a feature cannot be built in a watertight way, STOP and flag it to the user
  before implementing** — explain the conflict and the options. Never ship a change
  that silently breaks export.

## Before finishing a task

- Confirm the current branch.
- Confirm the PR base is `main`.
- Report whether anything was merged.
- Report whether anything was pushed to `main`.
- Provide the Deploy Preview URL if one exists.
