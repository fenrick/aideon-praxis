# HIG: Import and Export

How Aideon handles import and export as trust-sensitive product workflows. These are not peripheral utility screens;
they are moments where the product either proves or damages the user's confidence. Apply this page when designing or
reviewing file import, data mapping, preview and validation, template-driven export, document generation, or any
workflow that turns outside material into twin state or twin state into a shareable artefact.

It does not cover low-consequence download links that do not transform, validate, or reinterpret content.

---

## The principle

Import and export are review workflows, not button clicks with plumbing. Import asks the user to trust the system's
interpretation of external structure; export asks them to trust that the output accurately reflects the intended source
state. Both need inspection, explanation, and outcomes clear enough that the user can say what happened without reading
logs.

## Alignment to Pylon and Skopos

Manual and file-based interchange — ArchiMate Open Exchange, CSV/Excel, EA-tool connectors — is owned by
[Pylon](../../05-modules/pylon/README.md) (planned). Continuous, automated ingestion from cloud, CMDB, and monitoring to
keep the `actual` layer fresh is owned by [Skopos](../../05-modules/skopos/README.md) (planned), distinct from Pylon's
manual/file path. The HIG distinction follows: a **Pylon** import is a user-driven review workflow (the user inspects
and commits); a **Skopos** sync is a continuous background feed whose results still surface honestly (a freshly synced
`actual` value is Asserted-from-source and may be Awaiting review where policy requires). Both are long-running work
orchestrated by [Continuum](../../05-modules/continuum/README.md). Treat these surfaces as **design intent** until the
modules exist.

## Import

Import lets the user inspect source structure, map fields, preview results, understand coercions, and see row- or
field-level errors before final commitment. If the system inferred, normalised, rejected, or dropped values, it says so
plainly. Mapping suggestions behave like review candidates, not silent auto-corrections
([assisted-work.md](./assisted-work.md)). The outcome is a report, not a shrug: what was accepted, what changed, what
failed, and what can be corrected and retried. An import authors Change Events that compile into operations
([CONTEXT.md](../../../CONTEXT.md)); it does not write the op log behind the user's back.

## Export

Export exposes scope, template, format treatment, and provenance options where relevant. The system **must not** quietly
export a different slice of state than the user believes they selected, and it **must not** treat generated output as
self-justifying because it rendered. An export reflects a **snapshot** at a viewpoint
([CONTEXT.md](../../../CONTEXT.md)); the user can tell what was exported, when, which source state or scenario it
reflected, and whether warnings applied. Reporting and packaged outputs with redaction by default are owned by
[Kerux](../../05-modules/kerux/README.md) (planned).

## Long-running work

Imports and exports often cross into accepted-work territory ([Continuum](../../05-modules/continuum/README.md)). When
they do, the UI acknowledges it honestly: the user can leave the screen, return later, and still inspect progress,
warnings, and final outcome — the In-progress, Awaiting-review, and Failed result states
([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md),
[design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)). The status lives in the shell
([shell-and-navigation.md](./shell-and-navigation.md)).

## Repeatability

Where the product offers templated or generated export, the same source context produces a repeatable result or at least
a repeatable explanation of why the result changed. Export that cannot be reproduced is hard to trust and harder to
audit.

## Accessibility

Mapping steps, previews, validation summaries, and outcome reports are keyboard-usable and screen-reader legible. Error
location **must not** depend on colour alone ([design-system/accessibility.md](../design-system/accessibility.md));
structured problems get structured presentation.

## Content rules

Import copy states what the product expects, what it found, and what it changed. Export copy states what will be
included, which template or output form applies, and what the user can check before the artefact leaves the product.

## Worked example

A user imports a CSV of applications via Pylon. The preview maps columns to slots, flags two rows where a value was
coerced and one row rejected for a missing required slot, and shows the target scenario and layer before commit. The
user fixes the rejected row and commits; the outcome report states 48 accepted, 2 coerced (with the coercion named), 0
failed. The committed values author Change Events on the `actual` layer ([CONTEXT.md](../../../CONTEXT.md)). The import
ran as accepted work, so closing the screen and returning still shows the report.

## References & standards

_Normative:_

- The Open Group — **ArchiMate Model Exchange File Format**. The interchange lingua franca
  ([Pylon](../../05-modules/pylon/README.md)).

_Informative:_

- OMG — **BPMN 2.0**; The Open Group — **ArchiMate 3.2**. Source structures import interprets.

## Related documents

| Document                                                                                | What it covers                               |
| --------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Pylon](../../05-modules/pylon/README.md)                                               | Manual and file interchange.                 |
| [Skopos](../../05-modules/skopos/README.md)                                             | Continuous automated reality-sync.           |
| [Continuum](../../05-modules/continuum/README.md)                                       | The accepted-work orchestration behind both. |
| [Kerux](../../05-modules/kerux/README.md)                                               | Reporting and packaged export.               |
| [design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md) | The long-running-work result states.         |
