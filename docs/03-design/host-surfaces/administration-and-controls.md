# Administration and Controls

Administration and controls are dull in the good sense. This is where the product exposes access, templates, integrations, automation rules, audit, import/export history, and recovery — settings that do real damage when hidden or misnamed. The surface does not need theatre; it needs scope clarity and predictable consequences. This document fixes how it is scoped, what each control must declare, and which modules own which part.

## The principle

A control is trustworthy when the user can answer four questions before touching it: **what changes**, **who it affects**, **how it lands** (immediate, reviewable, or workflow-backed), and **where its audit and recovery state lives**. A control that fails any of these is a soft control — the failure mode the host surfaces share — and on an administration surface a soft control is the one most likely to do harm, because it sits beside genuinely consequential ones.

The surface separates four scopes, so the user always knows whose settings they are changing:

| Scope                    | What it holds                                                                               | Who it affects                     |
| ------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Personal**             | The current user's preferences, pins, and view defaults                                     | Only this user                     |
| **Workspace**            | Templates, automation rules, integration configuration, scenario defaults for one workspace | Everyone working in that workspace |
| **Organisation**         | Identity, access policy, retention, and audit policy across workspaces                      | Everyone in the organisation       |
| **Support and recovery** | Diagnostics, import/export history, replay, and recovery affordances                        | The workspace's durable state      |

Keeping these scopes visually and structurally distinct is the first defence against a user changing organisation-wide access while believing they are setting a personal preference.

## The rules it imposes

For **every** control, the surface **must** make four things explicit:

1. **What changes** — stated as the specific effect, not a vague toggle label. "Disable the FY26 nightly refresh schedule", not "Automation".
2. **Who it affects** — the scope from the table above, shown on the control, so a workspace-wide change does not read as personal.
3. **How it lands** — whether the change is **immediate**, **reviewable** (queued as an _Awaiting review_ item), or **workflow-backed** (it triggers an approval flow). High-consequence changes **should** be reviewable or workflow-backed rather than immediate.
4. **Where audit and recovery state lives** — the control links to the audit trail of changes of its kind and, where the change is reversible, to the recovery affordance. A control that changes durable state without a visible audit entry is not acceptable.

High-consequence and destructive actions — a recovery, a retention change, a bulk delete — **must** be framed as deliberate tasks with a stated consequence, per the shared rule in [README.md](./README.md). The surface does not rely on a confirmation dialog alone to carry that weight.

## Ownership

| Concern                                                         | Owner                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Settings information architecture and the scoped entry points   | **Host** shell (the four-scope IA; routing; the typed IPC each control calls)                               |
| Schedules, triggers, retry surfaces, and automation run history | **Continuum** (the local durable executor and its run ledger)                                               |
| Audit, replay, import/export history, and recovery detail       | **Mneme** (the append-only operation log, bitemporal facts, and the rebuildable derived runtime)            |
| Identity, RBAC, approvals, retention, and audit policy          | **Themis** _(planned)_ — governance; Themis decides policy, the Host enforces the Tauri capability boundary |

The split matters for honesty: when the surface shows "this change is workflow-backed", the workflow is Themis policy enforced at the Host boundary; when it shows "view automation history", the history is Continuum's run ledger; when it shows "recover to a prior state", the recovery reads Mneme's operation log. The administration surface arranges these; it owns none of them.

## Worked example

An administrator opens administration and controls on the seed workspace (`baseline.yaml`, v1.0.0) to manage the FY26 plan automation.

- **Workspace scope — automation rule.** A control reads "FY26 plan-refresh schedule — recompute the application portfolio nightly". _What changes:_ the nightly recompute over `n:application:insight-hub`, `n:application:journey-studio`, and `n:application:automation-orchestrator`. _Who it affects:_ everyone in this workspace. _How it lands:_ immediate (it enables or disables a Continuum schedule). _Audit and recovery:_ the control links to Continuum's run history for this schedule, showing the last runs and any failures.
- **Support and recovery scope — import history.** A row records the import that raised an exception against `n:application:automation-orchestrator` (disposition `Migrate`). _What changes:_ nothing by viewing; the recovery action would roll the import back. _How it lands:_ the rollback is reviewable, not immediate. _Audit and recovery:_ the row reads Mneme's operation log, so the administrator sees the exact operations the import appended and can recover to the state before it.
- **Organisation scope — retention policy.** A control sets how long superseded facts are retained before compaction. _Who it affects:_ every workspace in the organisation. _How it lands:_ workflow-backed — it triggers an approval flow, because it changes durable state organisation-wide. _Audit:_ the change itself is audited; the policy is Themis's to decide and the Host's to enforce.

The administrator changes the workspace schedule immediately, reviews the import before rolling it back, and cannot change retention without approval — each consequence matching its scope.

> **Design intent.** The four-scope IA and the per-control declarations are normative now. Continuum's automation and run ledger and Mneme's audit, replay, and recovery are the parts nearest to code; Themis does not yet exist as a crate, so identity, RBAC, approvals, retention, and audit policy are design intent until it lands (see the Themis README for status). Where this document describes a workflow-backed control, it describes the surface as designed, not a shipped approval engine.

## Edge cases and honest-state behaviour

- **A control's backing module is planned, not built.** A retention or RBAC control whose owner is Themis renders as design intent — visibly not yet operative — rather than as a live control that silently does nothing. The surface does not present an inert control as enforcing a policy.
- **An automation run failed.** The automation-history view shows the _Failed_ run with its error and partial coverage from Continuum's ledger, not a green tick. See [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md).
- **Recovery to a prior state.** Recovery reads Mneme's append-only log and is itself an operation; it does not erase history. The surface states what recovering will and will not undo before the user commits.
- **A change crosses scopes.** A control that would affect more than its stated scope is blocked, not silently widened; the surface does not let a workspace control reach organisation state.

## References & standards

_Informative — recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md):_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; error prevention; user control and freedom (recovery).
- **Tauri security model** (capabilities, permissions, isolation). The boundary at which the Host enforces the policy these controls express.
- **NIST CSF 2.0**. The identify/protect/detect/respond/recover framing behind the support-and-recovery scope.

## Related documents

| Document                                                                     | What it covers                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [README.md](./README.md)                                                     | The three host surfaces and the rules they share.                              |
| [the-shell.md](../the-shell.md)                                              | The four shell regions this surface renders inside.                            |
| [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md)                       | The accepted-work lifecycle the automation and import history render.          |
| [../../05-modules/continuum/README.md](../../05-modules/continuum/README.md) | Schedules, triggers, retry, and automation run history.                        |
| [../../05-modules/mneme/README.md](../../05-modules/mneme/README.md)         | Audit, replay, import/export history, and recovery.                            |
| [../../05-modules/themis/README.md](../../05-modules/themis/README.md)       | The planned governance engine behind identity, RBAC, approvals, and retention. |
