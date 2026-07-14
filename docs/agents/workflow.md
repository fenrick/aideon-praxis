# Agent task workflow: quality gates and QA

The operating loop for any coding task in this repo: what to check before starting, while editing, and before calling
work done. CI commands live in [`CI-CHECKS.md`](../02-standards/CI-CHECKS.md); this file is about the _order of
operations_ and the quality gates (CodeScene, Codacy, native QA, localisation) that sit around them.

## Before starting a task

- Read the task/issue and its comments fully; check [`docs/06-adrs/ADRS.md`](../06-adrs/ADRS.md) and the touched
  module's folder under `docs/05-modules/` before structural choices.
- **Check code health first.** Run the CodeScene MCP `code_health_score` on the files you expect to touch. If a file is
  already below the bar in [`.codescene-thresholds`](../../.codescene-thresholds), prefer refactoring it first — as its
  own commit — before layering feature work on top.
- Record the starting file-level scores of the files you will touch. CodeScene is a **before/after gate, not a final
  score**: you need the "before" to prove the "after".
- For UI tasks: study the existing design-system proxies and blocks first; reuse before recreating (CLAUDE.md, "UI
  work").

## While editing

- **Boy Scout Rule.** Every code file you touch must leave with a file-level Code Health score equal to or higher than
  it started. A file already at 10.0 must stay at 10.0. New scorable files target 10.0; if CodeScene reports "no
  scorable code", the file must still have zero findings.
- Never suppress your way past a gate: no `// eslint-disable`, no `#[allow(...)]` for new warnings, no `as any`, and
  never silence a Codacy/CodeScene rule to make a scan pass. Prefer the small refactor that removes the finding — see
  the locale-loader switch refactor (`src/i18n/locale-provider.tsx`) for the pattern.
- **⛔ Never lower the values in `.codescene-thresholds`.** The thresholds are a floor that only rises. If the gate
  blocks you, improve the code.
- Commit in small Conventional-Commit units; the pre-commit hook (lint-staged) keeps formatting honest.

## Localisation (mandatory for UI copy)

All user-facing labels/copy live in [`locales/en.json`](../../locales/en.json) and reach components via `next-intl`
(`src/i18n/locale-provider.tsx`). When adding or changing interface copy:

1. Add the key to `locales/en.json` (namespaced by feature area, e.g. `shell.commandPalette.searchPlaceholder`).
2. Re-run translation sync: `cargo run -p aideon_xtask -- translation-sync` (reads `LARA_ACCESS_KEY_ID` /
   `LARA_ACCESS_KEY_SECRET` from the environment; keys live in the gitignored `.env.local`).
3. Check [`locales/translation-status.json`](../../locales/translation-status.json): locales marked `placeholder` are
   still English copies (e.g. blocked on API quota) — that is acceptable to ship, but the manifest must say so
   truthfully.

Persisted user data (e.g. a widget's saved title) is **data, not UI copy** — never run it through translation or
re-resolve it from locale keys after creation.

## Security scan (Codacy)

Codacy is the security/static-analysis gate; use the Codacy MCP tools (`codacy_list_pull_request_issues`,
`codacy_get_file_issues`) against every touched code file, or `.codacy/cli.sh analyze <path>` when MCP is unavailable.

- **Fix every Critical and High severity finding your change introduces** before the work is reviewable.
- Review Medium findings: fix real defects and anything security-sensitive; otherwise record why it is acceptable in the
  completion note.
- Query by **category**, not the Error/Warning/Info triad — the severity tiers hide categories (see the team's Codacy
  notes).

## Native QA on macOS (Tauri)

Headless tests assert "renders without error", not pixels. For any user-visible change, run the app and look:

```sh
pnpm tauri dev   # boots Next.js on :1420 + the Tauri host
```

- Watch the dev-server log for 404s and the Next.js dev-overlay issue badge — a red badge means an unhandled dev error
  even when the screen "looks fine" (the missing `/splash.png` regression shipped exactly this way).
- Screenshot the affected surface in light and dark, at representative widths (Storybook stories via the Playwright CLI
  for components; the running app for shell-level surfaces).
- Exercise the primary mouse-driven path first, then keyboard shortcuts. **WKWebView gotcha:** `osascript keystroke` can
  be silently swallowed inside webview editor content — drive the webview with real pointer interaction (or WebDriver,
  `pnpm run webdriver:test`) and keep `osascript` for app focus and menu-level shortcuts.
- macOS keyboard gotcha: `Option+<letter>` produces special characters — match shortcuts on `e.code` or use `Cmd`.
- QA fixtures are disposable: any workspace/notes created while testing get deleted before the task is done, and
  `git status --short` over fixture paths must be clean unless fixture changes are the task.

## Before declaring done

Work is **not done** until `pnpm run ci` passes and the push succeeds through the pre-push hook. **⛔ Never
`--no-verify`.** If the hook blocks: read the error, fix it, commit, push again.

Alongside the CI gate, verify and record (in the PR description or issue comment):

- **What was implemented** — a few lines covering logic and UX.
- **QA evidence** — what was run and observed (native screenshot, dev-log check, e2e lane), not just "tests pass".
- **Tests/coverage** — commands run and results; new behaviour gets targeted coverage near the change (≥80%
  lines/branches/functions on new code, engines trend ≥90% — CODING-STANDARDS §16).
- **CodeScene** — before/after file-level scores for touched files, plus final Hotspot/Average vs
  `.codescene-thresholds`.
- **Codacy** — scan summary; no new Critical/High findings.
- **Localisation** — copy added to `locales/en.json` + sync run, or "no UI copy changes".
- **Docs/ADRs** — what was updated (module doc, contracts, ADR), or "none needed".

Claims of "done" are verified against artefacts (diffs, logs, hashes), not narration — see
[`multi-agent-orchestration.md`](multi-agent-orchestration.md) for why this is a hard rule when work is delegated.
