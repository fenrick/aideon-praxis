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

These triage-state labels are distinct from the contextual axes — work kind, area, module, priority, and lifecycle state. Those axes are now **GitHub Project fields** (Kind, Area, Module, Priority, Status), not labels; the project is the tracking source of truth and the `type/*`, `module/*`, `priority/*`, and `status/*` labels they replaced are **not applied** ([issue-tracker.md](./issue-tracker.md)). The triage label here stays a label (agents and humans filter by it), and `area/*` stays a label too — apply all relevant areas, with the primary one mirrored in the Area field.

A well-tracked issue therefore carries one triage label, its `area/*` label(s), and the contextual axes set as project fields. Worked example for an analytics bug an agent can take — set the triage and area labels, then the project fields:

```sh
gh issue edit 412 \
  --remove-label "needs-triage" \
  --add-label "ready-for-agent,area/analytics"
# then set the project fields: Kind=bug, Module=metis, Priority=P2, Status=Todo
# (see issue-tracker.md for the gh project field-set commands)
```

Note that lifecycle state (the **Status** project field: Todo → In Progress → Done) is a separate axis again from triage state — an issue can be `ready-for-agent` with Status `Todo` simultaneously, then `In Progress` once work starts, without its triage label changing.

Edit the right-hand column above if the tracker's vocabulary ever changes.

## Related documents

| Document                               | What it covers                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| [issue-tracker.md](./issue-tracker.md) | The `gh` conventions and the project fields that replace the contextual labels. |
| [domain.md](./domain.md)               | How to orient in the repo before triaging or implementing.                      |
