# Triage labels

The five canonical triage roles the skills speak in, mapped to the label strings in this repo's tracker (`aideon-ai/aideon-desktop`). All five labels already exist, so the mapping is 1:1 — applying them reuses existing labels rather than creating duplicates.

| Role (canonical)  | Label in our tracker | Meaning                                      |
| ----------------- | -------------------- | -------------------------------------------- |
| `needs-triage`    | `needs-triage`       | Maintainer needs to evaluate this issue      |
| `needs-info`      | `needs-info`         | Waiting on the reporter for more information |
| `ready-for-agent` | `ready-for-agent`    | Fully specified, ready for an AFK agent      |
| `ready-for-human` | `ready-for-human`    | Requires human implementation                |
| `wontfix`         | `wontfix`            | Will not be actioned                         |

When a skill names a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## One triage label at a time

The triage labels are a **state machine**, not a set — an issue carries exactly one at any moment. Moving between states means removing the old triage label as you add the new one:

```sh
gh issue edit <number> --remove-label "needs-triage" --add-label "ready-for-agent"
```

The usual progression:

- A new issue lands on `needs-triage`.
- If it lacks detail, move it to `needs-info` and comment the specific gap; move it back to `needs-triage` once the reporter answers.
- Once fully specified, move it to `ready-for-agent` (an AFK agent can implement it from the issue alone) or `ready-for-human` (it needs human judgement, access, or design).
- `wontfix` is terminal; pair it with a closing comment that says why.

The line between `ready-for-agent` and `ready-for-human`: an issue is `ready-for-agent` only when an agent could complete it without further clarification — clear acceptance criteria, named files or modules, no open design question. Anything that needs a decision, a credential, or a judgement call is `ready-for-human`.

## Triage state is orthogonal to the contextual taxonomy

These triage-state labels are distinct from the `type/*`, `area/*`, `module/*`, `priority/*`, and `status/*` taxonomy in [issue-tracker.md](./issue-tracker.md). Apply **both**: the one triage label here, plus the contextual labels there.

A well-labelled issue therefore carries one triage label, one `type/*`, one or more `area/*`, optionally a `module/*` and `priority/*`, and a lifecycle `status/*`. Worked example for an analytics bug an agent can take:

```sh
gh issue edit 412 \
  --remove-label "needs-triage" \
  --add-label "ready-for-agent,type/bug,area/analytics,module/metis,priority/P2,status/todo"
```

Note that `status/*` (the lifecycle: todo → in-progress → done) is a separate axis again from triage state — an issue can be `ready-for-agent` and `status/todo` simultaneously, then `status/in-progress` once work starts, without its triage label changing.

Edit the right-hand column above if the tracker's vocabulary ever changes.

## Related documents

| Document                               | What it covers                                               |
| -------------------------------------- | ------------------------------------------------------------ |
| [issue-tracker.md](./issue-tracker.md) | The `gh` conventions and the full contextual label taxonomy. |
| [domain.md](./domain.md)               | How to orient in the repo before triaging or implementing.   |
