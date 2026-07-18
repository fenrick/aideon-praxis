# Story visual-regression (honest-state blocks)

Screenshots every honest-state design-system block story in **light**, **dark**, and **reduced-motion** modes for human
review, and fails the run if a story does not render or emits a fatal console/page error.

## Why this exists

The honest-state blocks (`ProvenanceBadge`, `ProvenancePanel`, `StaleBadge`, `RebuildingIndicator`, `PartialBanner`,
`ConfidenceLabel`, `DiffMarker`, `ErrorFrame`, `WarningBanner`, `StatusBadge`) each encode a distinct
icon/colour/contrast treatment (WCAG 1.4.1 — never colour alone). Headless render/play tests assert "renders without
error"; they do **not** catch theme, spacing, clipping, or contrast regressions. Those are only visible in pixels, so
this suite captures deterministic per-mode screenshots as the artefact reviewers eyeball.

This complements the other tiers (see `tests/visual-mock/README.md` for the full table): unit/component (Vitest), story
render (Storybook/Vitest), host-mocked assembled screens (`tests/visual-mock`), and E2E (WebDriver). This suite sits
alongside the story-render tier, adding the visual pass over the isolated blocks.

## Run

```bash
pnpm run test:visual-stories                                    # builds storybook-static if missing, serves it, screenshots
STORYBOOK_URL=http://localhost:6006 node tests/visual-stories/run.mjs   # reuse a running `pnpm run storybook`
```

Screenshots are written to `tests/visual-stories/screens/` (git-ignored), one PNG per `block × story × mode`.

## How it works

- **Story discovery** — reads `storybook-static/index.json` and keeps the story entries whose `importPath` names one of
  the honest-state `<block>.stories.tsx` files. New stories added to any of those blocks are picked up automatically; no
  id list to maintain.
- **Themes** — the `.dark` class is toggled through the Storybook `withThemeByClassName` global via the iframe URL
  (`&globals=theme:dark`), matching `.storybook/preview.tsx`. `colorScheme` is also emulated to match.
- **Reduced motion** — emulated with Playwright `page.emulateMedia({ reducedMotion: 'reduce' })`, which sets
  `prefers-reduced-motion: reduce` (the `RebuildingIndicator` spinner uses `motion-safe:animate-*`, so its animation is
  suppressed in this mode).
- **Assertions** — per story: `#storybook-root` renders non-empty visible text (presence), no Storybook error overlay,
  and no non-benign console/page error across the three modes.

## Adding a strict pixel baseline later

This suite intentionally does not diff against a baseline; the screenshots are for human review. To add a strict
baseline: commit an approved set of PNGs under `tests/visual-stories/baseline/` (not git-ignored), and in `run.mjs`
compare each fresh capture to its baseline with a pixel differ (e.g. `pixelmatch` + `pngjs`), failing on a delta above a
small threshold. Keep the capture viewport, `deviceScaleFactor`, and mode list fixed so baselines stay deterministic.
