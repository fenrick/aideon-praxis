# HIG: Collaboration and Review

How Aideon handles comments, mentions, review requests, approvals, version comparison, presence, and conflict where work
is shared. Apply this page when designing or reviewing any flow where more than one person can view, comment on,
compare, approve, or revise the same artefact, workspace, or generated output.

It does not cover general communication detached from work. Collaboration in Aideon earns its keep when it sharpens
accountability and review; it does not become a social layer floating above the product.

---

## The principle

Collaboration supports authorship, review, and decision-making around shared work. The point is not to maximise chatter;
it is to help users understand who changed what, what is awaiting review, what was approved, and where disagreement
remains. Collaboration features stay anchored to artefacts and state: presence, comments, and review controls clarify
ownership and process rather than turning the interface into a noise source.

## Alignment to Koinon, Themis, and the Steward mode

Sync, presence, shared workspace, and merge/conflict UX are owned by [Koinon](../../05-modules/koinon/README.md)
(planned), which owns the sync-and-conflict model of [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md).
Identity, RBAC, approvals, retention, and audit are governed by [Themis](../../05-modules/themis/README.md) (planned),
which underpins hosted mode and the **Steward** participation mode. The Steward mode is the human review posture in
which a participant confirms or rejects queued work
([participation-and-trust/README.md](../participation-and-trust/README.md)); a "needs review" item is the §9 **Awaiting
review** result state ([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md),
[design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)).

## Comments and mentions

Comments attach to a clear target and carry enough context that the target is still obvious later. Mentions route
attention; they are not a substitute for structured ownership or approval. Threads preserve authorship and timing
clearly enough that users can reconstruct the review history without guessing.

## Review and approval

Review requests, approval states, and change status are visible where the work is read or edited: if a generated output,
report, or workspace state needs review, the user does not leave the surface to discover that. Approvals mean something
concrete — it is explicit _what_ is being approved and _which version or state_ the approval refers to. In bitemporal
terms the approval pins an asserted-time belief over a viewpoint ([CONTEXT.md](../../../CONTEXT.md)); the approval is
governed by Themis.

## Presence and conflict

Presence indicators help users avoid collisions and understand active attention; they do not become a status circus.
Where conflicts exist, the product explains them in artefact terms — what changed, what collided, the safe next action —
rather than abstract system terms, following the Koinon sync-and-conflict model
([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)). A recorded conflict surfaces as a result the user can
act on, not a silent overwrite.

## Desktop-first and offline note

Aideon is local-first and offline-capable ([DESIGN.md](../DESIGN.md)): a participant may work disconnected and reconcile
later, so collaboration treatments **must** make sync state legible — what is local-only, what is synced, what is in
conflict — rather than assuming a live shared session. Collaboration is a planned capability; treat the surfaces here as
**design intent** until Koinon and Themis exist.

## Accessibility

Comment targets, version comparisons, review controls, and presence indicators stay legible to keyboard and
assistive-technology users. The meaning of a review state **must not** depend entirely on a colour chip or avatar
placement ([design-system/accessibility.md](../design-system/accessibility.md)).

## Content rules

Review language is specific and calm. Approval labels, conflict messages, and version-comparison headings name the
actual artefact or state in question. Avoid vague collaboration language that sounds friendly but says nothing.

## Worked example

A reviewer opens a shared workspace and sees a report state marked **Awaiting review**
([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)). The review panel names the
report version and the viewpoint it reflects. The reviewer approves under their Steward role (Themis); the approval
records what was approved and the belief it pins. A second participant's offline edit that collided is shown as a
conflict in artefact terms with a safe next action (Koinon,
[ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. Convergence behind the sync model
  ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

## Related documents

| Document                                                                                | What it covers                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [Koinon](../../05-modules/koinon/README.md)                                             | Sync, presence, and merge/conflict.               |
| [Themis](../../05-modules/themis/README.md)                                             | Identity, approvals, audit, and the Steward mode. |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)                           | The sync-and-conflict model.                      |
| [participation-and-trust/README.md](../participation-and-trust/README.md)               | Participation modes including Steward.            |
| [design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md) | The Awaiting-review and conflict treatments.      |
