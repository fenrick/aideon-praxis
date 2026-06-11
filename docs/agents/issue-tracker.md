# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `aideon-ai/aideon-desktop`. Use the `gh` CLI for all operations; it infers the repo from `git remote -v` when run inside a clone.

## Conventions

- **Create an issue:** `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue:** `gh issue view <number> --comments`.
- **List issues:** `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with `--label` and `--state` filters as needed.
- **Comment:** `gh issue comment <number> --body "..."`
- **Apply / remove labels:** `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close:** `gh issue close <number> --comment "..."`

## Issue templates

New issues created through the GitHub UI use the forms in `.github/ISSUE_TEMPLATE/`:

- `bug_report.yml` — auto-applies `type/bug`; fields: what happened, app version, steps, logs.
- `feature_request.yml` — auto-applies `type/feature`; fields: problem statement, proposed solution, rationale/trade-offs.

When creating issues via `gh`, mirror these shapes (a bug body covers what happened / version / steps / logs) and apply the matching `type/*` label yourself, since `gh` does not run the template automation.

## Label taxonomy (apply contextual labels, not just triage state)

This repo carries a structured label set. When you create or triage an issue, apply the labels that fit — **in addition to** the triage-state label from [triage-labels.md](./triage-labels.md):

- **`type/*`** — `type/feature`, `type/task`, `type/chore`, `type/docs`, `type/decision` (and `type/bug` via the bug template). One per issue.
- **`area/*`** — `platform`, `ci`, `security`, `rpc`, `adapters`, `ui`, `integration`, `worker`, `analytics`, `time`, `api`, `automation`, `server`, `finance`, `cloud`, `docs`, `extensibility`, `governance`, `perf`. One or more.
- **`module/*`** — `praxis`, `continuum`, `chrona`, `metis` (the engine crates). Apply when the work clearly lives in one engine.
- **`priority/*`** — `priority/P1`, `priority/P2`, `priority/P3`.
- **`status/*`** — `status/todo`, `status/blocked`, `status/in-progress`, `status/done` (lifecycle, distinct from triage state).

Prefer reusing an existing label over inventing one. Run `gh label list --limit 100` to see the current set before adding anything new.

### Label-combination guidance

A well-labelled issue carries one triage label, one `type/*`, one or more `area/*`, optionally a `module/*` and a `priority/*`, and a lifecycle `status/*`. The four axes — triage state, type, context (area/module), and lifecycle status — are orthogonal and co-applied. Worked examples:

```sh
# A specified analytics bug an agent can take, medium priority, not yet started
gh issue create --title "Betweenness centrality drops isolated nodes" \
  --body "..." \
  --label "ready-for-agent,type/bug,area/analytics,module/metis,priority/P2,status/todo"

# A docs task needing human judgement, blocked on a pending decision
gh issue edit 530 \
  --remove-label "needs-triage" \
  --add-label "ready-for-human,type/docs,area/docs,status/blocked"

# A cross-cutting feature spanning two areas
gh issue edit 544 \
  --add-label "type/feature,area/ui,area/rpc,priority/P1"
```

Keep the lifecycle `status/*` current as work moves (`status/todo` → `status/in-progress` → `status/done`); it changes independently of the triage label.

## Issue-linking conventions

Express relationships between issues so the graph is navigable rather than narrated:

- **Close-on-merge:** put `Closes #NNN` (or `Fixes #NNN`) in a PR body so merging the PR closes the issue. Use `Closes` for the issue a PR fully resolves.
- **Reference without closing:** mention `#NNN` in a body or comment to link two issues without auto-closing — for "related to", "follow-up of", or "see also".
- **Parent / sub-issues:** for a tracked breakdown, keep a checklist of `- [ ] #NNN` task references in the parent (epic/PRD) issue; GitHub renders these as a sub-issue progress list.
- **Blocked-by:** state the blocker explicitly in the body (`Blocked by #NNN`) and apply `status/blocked`; clear both once the blocker closes.
- **Duplicates:** comment `Duplicate of #NNN`, close the newer issue, and keep discussion on the original.

Always reference by `#NNN` rather than a pasted URL, so the cross-link renders and back-links appear on both issues.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Related documents

| Document                               | What it covers                                                            |
| -------------------------------------- | ------------------------------------------------------------------------- |
| [triage-labels.md](./triage-labels.md) | The five triage roles and the one-at-a-time state machine.                |
| [domain.md](./domain.md)               | How to orient in the repo and use the project's vocabulary in issue text. |
