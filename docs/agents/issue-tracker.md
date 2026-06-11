# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `aideon-ai/aideon-desktop`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Issue templates

New issues created through the GitHub UI use the forms in `.github/ISSUE_TEMPLATE/`:

- `bug_report.yml` — auto-applies `type/bug`; fields: what happened, app version, steps, logs.
- `feature_request.yml` — auto-applies `type/feature`; fields: problem statement, proposed solution, rationale/trade-offs.

When creating issues via `gh`, mirror these shapes (a bug body should cover what happened / version / steps / logs) and apply the matching `type/*` label yourself.

## Label taxonomy (apply contextual labels, not just triage state)

This repo carries a structured label set. When you create or triage an issue, apply the labels that fit — in addition to the triage-state label from `triage-labels.md`:

- **`type/*`** — `type/feature`, `type/task`, `type/chore`, `type/docs`, `type/decision` (and `type/bug` via the bug template).
- **`area/*`** — `platform`, `ci`, `security`, `rpc`, `adapters`, `ui`, `integration`, `worker`, `analytics`, `time`, `api`, `automation`, `server`, `finance`, `cloud`, `docs`, `extensibility`, `governance`, `perf`.
- **`module/*`** — `praxis`, `continuum`, `chrona`, `metis` (the engine crates).
- **`priority/*`** — `priority/P1`, `priority/P2`, `priority/P3`.
- **`status/*`** — `status/todo`, `status/blocked`, `status/in-progress`, `status/done` (lifecycle, distinct from triage state).

Prefer reusing an existing label over inventing one. Run `gh label list --limit 100` to see the current set before adding anything new.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
