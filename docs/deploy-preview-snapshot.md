# Deploy preview snapshot

This is a standing, no-op PR against `main` with no functional changes — it
exists only so Netlify's per-PR Deploy Preview mechanism has a live URL that
tracks current `main`, since Netlify previews are generated per-PR-branch and
`main` itself (being the base, not a diff) has no preview of its own.

Rebase/merge `main` into this branch whenever you want the preview URL to
reflect the latest `main`, rather than opening a new PR each time.

Do not merge this into `main`.
