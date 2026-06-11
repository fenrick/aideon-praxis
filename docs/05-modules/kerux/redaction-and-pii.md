# Redaction and PII

Why a Kerux output redacts deny-by-default, and how that discipline is shared with Pylon. For practitioners responsible for what a published briefing or roadmap is safe to circulate.

> **PLANNED.** No `aideon_kerux` crate exists; this is design intent per [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md).

## Deny-by-default

A Kerux output emits **only what the redaction policy explicitly permits**. Personal data and policy-excluded content are removed **before rendering, not after** ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). The default is to withhold: content is excluded unless the policy permits it, so the failure mode is an over-redacted report, never a leak.

The trade-off named: opt-in redaction is one missed setting away from shipping personal data; deny-by-default fails safe ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). The cost is that a permissive report requires the policy to explicitly allow each class of content — deliberate friction in exchange for a safe default.

## Removed before rendering, not after

Redaction happens **before** the document is rendered, not as a post-processing pass over finished output. This matters because a redaction applied after rendering can miss content that leaked into a derived figure, a chart label, or a narrative sentence. Removing excluded content from the inputs to rendering means it cannot appear in the output at all. This is the same posture the host applies to filtered sharing ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): sharing safety is enforced at the point of production, not left to the recipient.

## Shared discipline with Pylon

Kerux and [Pylon](../pylon/README.md) share the **deny-by-default redaction discipline** ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md); [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The difference is direction: Pylon redacts on **export for re-import**, Kerux redacts on **publish for consumption** (see [Pylon deterministic, reviewable import](../pylon/deterministic-reviewable-import.md)). They may share the redaction-policy grammar; whether the grammar is shared verbatim is an open question in both [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md) and [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md). Themis governance ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)) decides retention and what must be protected; the redaction policy is where that decision meets the published output.

## Worked example

A Kerux briefing is published at a viewpoint over the seed dataset. The redaction policy permits `Application` and `Capability` names and `realises` relationships, but excludes `DataEntity` `sensitivity` and human owner names. The `DataEntity` `n:data-entity:engagement-event` (`sensitivity = Confidential`) appears in the briefing **without** its `sensitivity` slot, because that slot was removed from the rendering inputs. A `ValueStreamStage` `owner` such as "Strategy Office" is removed wherever the policy excludes owner names — including from any narrative sentence that would otherwise have named it. The briefing renders with the permitted content only, and records the policy applied alongside the executing viewpoint ([deterministic generation](./deterministic-generation.md)).

## References & standards

_Informative:_

- The Open Group — **TOGAF Standard, 10th Edition**. The deliverable forms redaction is applied within.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                              | What it covers                                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Kerux README](./README.md)                                                           | The module index and invariants.                    |
| [Deterministic generation](./deterministic-generation.md)                             | Where redaction sits in the generation pipeline.    |
| [Pylon deterministic, reviewable import](../pylon/deterministic-reviewable-import.md) | The shared deny-by-default discipline on export.    |
| [Themis retention and audit](../themis/retention-and-audit.md)                        | The governance that decides what must be protected. |
