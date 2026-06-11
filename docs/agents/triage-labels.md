# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

All five labels already exist in `aideon-ai/aideon-desktop`, so the mapping is 1:1 — applying them reuses existing labels rather than creating duplicates.

| Role (canonical)  | Label in our tracker | Meaning                                  |
| ----------------- | -------------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human`    | Requires human implementation            |
| `wontfix`         | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

These triage-state labels are orthogonal to the `type/*`, `area/*`, `module/*`, `priority/*`, and `status/*` taxonomy documented in `issue-tracker.md` — apply both: the triage label here plus the contextual labels there.

Edit the right-hand column to match whatever vocabulary you actually use.
