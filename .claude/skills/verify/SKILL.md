---
name: verify
description: Build/launch/drive recipe for verifying changes to this static portfolio site (virtual-scroll stage engine + Three.js sculpture + intro preloader).
---

# Verifying this portfolio

No build step — plain static files. Surface is a browser GUI.

## Launch

```bash
node serve.js 8090   # run_in_background; serves the repo root
```

## Drive

Use playwright-core against the system Edge (no browser download needed):

```bash
mkdir -p "$TEMP/pf-verify" && cd "$TEMP/pf-verify" && npm i playwright-core
# chromium.launch({ channel: 'msedge', headless: true })
```

- The page is a fixed-viewport virtual-scroll app: `page.mouse.wheel(0, N)` drives
  the stage engine (STEP=760 virtual px per stage; deltaY is multiplied by 2.3).
  Read `[data-counter]` ("01 / 05") to confirm the active stage.
- The intro preloader runs on load (~3s + 1.4s tail). Scroll is locked until it
  finishes — probe by wheeling during it and confirming the counter doesn't move.
- Animations are JS-driven inline styles (no CSS transitions to wait on); take
  timed screenshots to sample the timeline. Intro timing is relative to when the
  module script runs, which lags `goto` by CDN load time — sample states via
  `el.style.transform/opacity` rather than trusting wall-clock offsets.
- Capture `console` and `pageerror` events; a broken module script fails silently
  (black page) otherwise.

## Gotchas

- `GET /.image-slots.state.json` 404s on every load — pre-existing image-slot.js
  dev persistence, not a regression.
- Three.js loads from CDN; the sculpture GLB takes ~1–2s. The procedural fallback
  form renders first, so an early screenshot showing an abstract blob is normal.
