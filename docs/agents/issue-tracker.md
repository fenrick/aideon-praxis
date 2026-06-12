# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `aideon-ai/aideon-desktop`, tracked on the **GitHub Project** at `https://github.com/orgs/aideon-ai/projects/1`. Use the `gh` CLI for all operations; it infers the repo from `git remote -v` when run inside a clone.

## The project is the source of truth for workflow state

The project carries structured fields that replace several labels. **Do not apply the replaced labels** — set the project field instead.

| Axis | Project field | Replaces label |
| ---- | ------------- | -------------- |
| Lifecycle state | **Status** | `status/*` labels |
| Work kind | **Kind** | `type/*` labels |
| Engine module | **Module** | `module/*` labels |
| Primary area | **Area** | primary `area/*` label |
| Scheduling weight | **Priority** | `priority/*` labels |
| Triage state | **Triage** | — (mirrors triage label; keep both in sync) |

Labels still applied to issues (not replaced by project fields):

- **Triage labels** (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — keep on issues; agents and humans filter by label, not by project field. See [triage-labels.md](./triage-labels.md).
- **`area/*`** — apply all relevant areas as labels; the project Area field holds only the primary one.
- **`released`** — release marker; not a project field.

## Project field values

**Status** (lifecycle — driven by project automations; update manually when needed):

| Value | Meaning |
| ----- | ------- |
| Todo | In the queue, not started |
| In Progress | Being actively worked |
| In Review | PR open, awaiting review |
| Blocked | Waiting on a dependency or reviewer action |
| Deferred | Intentionally postponed |
| Done | Closed / merged |

**Kind:** `feature` · `task` · `chore` · `docs` · `decision` · `bug`

**Module:** `praxis` · `mneme` · `chrona` · `metis` · `continuum` · `host` · `renderer`

**Area:** `ui` · `api` · `time` · `analytics` · `ci` · `security` · `rpc` · `adapters` · `integration` · `worker` · `automation` · `server` · `finance` · `cloud` · `docs` · `extensibility` · `governance` · `perf` · `platform`

**Priority:** `P0` · `P1` · `P2` · `P3`

**Triage:** mirrors the triage label — `needs-triage` · `needs-info` · `ready-for-agent` · `ready-for-human` · `wontfix`

## Project automations (do not manually override unless correcting an error)

| Trigger | Status set to |
| ------- | ------------- |
| Item added to project | Todo |
| PR opened / ready for review | In Review |
| Review requests changes | Blocked |
| Review approved | In Progress |
| Issue or PR closed | Done |
| PR merged | Done |
| Item reopened | Todo |
| Closed item not updated for 2 weeks | Archived |

## Conventions

- **Create an issue:** `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue:** `gh issue view <number> --comments`.
- **List issues:** `gh issue list --state open --json number,title,body,labels --jq '[.[] | {number, title, labels: [.labels[].name]}]'` with `--label` and `--state` filters as needed.
- **Find agent-ready work:** `gh issue list --label ready-for-agent --state open`
- **Comment:** `gh issue comment <number> --body "..."`
- **Apply / remove labels:** `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close:** `gh issue close <number> --comment "..."`
- **Set a project field:** use the GraphQL `updateProjectV2ItemFieldValue` mutation (project id `PVT_kwDOD2wE0s4BOFEd`).

## Issue templates

New issues created through the GitHub UI use the forms in `.github/ISSUE_TEMPLATE/`:

- `bug_report.yml` — auto-applies `type/bug`; fields: what happened, app version, steps, logs.
- `feature_request.yml` — auto-applies `type/feature`; fields: problem statement, proposed solution, rationale/trade-offs.

When creating issues via `gh`, mirror these shapes and apply the triage label plus `area/*` labels; the project fields (Kind, Priority, Module, Area, Status) are set separately or via automation.

## Label guidance (what still goes on issues)

Apply the triage label plus all relevant `area/*` labels. Everything else goes in the project fields.

```sh
# Agent-ready analytics bug, two areas
gh issue create --title "Betweenness centrality drops isolated nodes" \
  --body "..." \
  --label "ready-for-agent,area/analytics,area/api"
# Then set project fields: Kind=bug, Module=metis, Priority=P2, Status=Todo

# Docs task needing human judgement
gh issue edit 530 \
  --remove-label "needs-triage" \
  --add-label "ready-for-human,area/docs"
# Then set project field: Triage=ready-for-human
```

## Issue-linking conventions

- **Close-on-merge:** put `Closes #NNN` in a PR body so merging closes the issue.
- **Reference without closing:** mention `#NNN` in a body or comment for "related to" / "follow-up of".
- **Parent / sub-issues:** keep a checklist of `- [ ] #NNN` in the parent issue body; GitHub renders it as sub-issue progress.
- **Blocked-by:** state `Blocked by #NNN` in the body; the automation sets Status to Blocked when a review requests changes; set it manually for issue-level blockers.
- **Duplicates:** comment `Duplicate of #NNN`, close the newer issue.

Always reference by `#NNN`, not a pasted URL.

## When a skill says "publish to the issue tracker"

Create a GitHub issue and set the relevant project fields.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Related documents

| Document | What it covers |
| -------- | -------------- |
| [triage-labels.md](./triage-labels.md) | The five triage roles and the one-at-a-time state machine. |
| [domain.md](./domain.md) | How to orient in the repo and use the project's vocabulary in issue text. |
