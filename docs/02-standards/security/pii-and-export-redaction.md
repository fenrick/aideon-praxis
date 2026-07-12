# PII and Export Redaction

What counts as personally identifiable information here, and how it is redacted deny-by-default before anything leaves
the device. This realises the privacy concern of [controls-asvs.md](./controls-asvs.md) (ASVS V7) and the everyday PII
rules of [CODING-STANDARDS.md §14](../CODING-STANDARDS.md#14-pii-handling).

## What PII is in this product

PII is any field that identifies a person or could be combined to identify one. The field classes redacted by default
are:

- display names and email addresses;
- free-text notes and comments that may contain personal information;
- device identifiers and OS user names;
- any slot tagged `pii: true` in the workspace schema
  ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)).

The schema tag is the authoritative, extensible source: a workspace can mark additional slots `pii: true`, and the
redaction layer treats every tagged slot as personal data wherever it flows. The three named classes above are the
always-on floor, present even before schema tagging.

## Deny-by-default redaction

All exports and diffs default to PII redaction. Personally identifiable fields are stripped before any package or diff
is written to disk or transmitted. Redaction is opt-out per authorised export, never opt-in — the default for any export
is "redact", and including PII is an explicit, authorised choice.

- The deterministic export pipeline ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)) is the **single
  path** for producing shareable packages; there is no second export route that bypasses redaction.
- Selective sharing uses filtered exports that materialise only the subset of facts and objects the export is authorised
  to include — not metadata flags on records, which are policy, not enforcement
  ([capability-scoping.md](./capability-scoping.md)).
- Code that produces an export, diff, analytics output, log line, or error `detail` routes through the shared redaction
  helpers rather than hand-trimming fields ([CODING-STANDARDS.md §14](../CODING-STANDARDS.md#14-pii-handling)); adding
  such a surface adds a redaction test ([TESTING-STRATEGY.md](../TESTING-STRATEGY.md)).

## Redaction must hold over derivations

A redacted export must not leak PII through **derived fields, object references, or blob content** — not only top-level
fields. The export pipeline verifies redaction over the whole materialised set before finalising the package
([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)):

- a derived label, summary, or analytics result that embeds a redacted name is itself redacted;
- a blob reference whose content carries PII (a source document with personal data) is excluded or its content redacted,
  not silently shipped;
- an analytics output that includes node labels passes through the redaction layer
  ([Metis obligations](../TESTING-STRATEGY.md)).

## Encryption at export time

Where confidentiality beyond redaction is required — a package for a specific recipient — encryption is applied by the
Rust host as a **post-filter step**: the renderer requests an export, the host applies filtering then encryption, and
the renderer receives only a confirmation or the resulting opaque bytes
([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)). The encryption key follows the KDF and rotation
rules in [secrets-and-keys.md](./secrets-and-keys.md). Encryption envelopes are deferred design intent; the
deterministic format leaves room for them.

## Worked example

A user exports a capability map ([Artefact result](../../../CONTEXT.md)) to share with a partner. The export includes
`Capability` and `Application` entities and their `serves`/`realises` relationships
([core-v1.json](../../data/meta/core-v1.json)), but the host strips the `owner` display name and the free-text `notes`
slot (both redacted classes), and excludes a `DataEntity` whose `sensitivity` is `confidential` because the filter does
not authorise it. A derived "owned by" summary that would have embedded the owner name is redacted too. The pipeline
verifies no PII remains across fields, derivations, and referenced blobs, then writes the deterministic package. Nothing
personal leaves the device.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V7 (privacy / data protection). _([controls-asvs.md](./controls-asvs.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                | What it covers                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)      | The deterministic export pipeline and deferred encryption. |
| [CODING-STANDARDS.md §14](../CODING-STANDARDS.md#14-pii-handling)       | The everyday PII-handling rules for code.                  |
| [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md) | The `pii: true` schema-tagging contract.                   |
| [secrets-and-keys.md](./secrets-and-keys.md)                            | The keys export encryption uses.                           |
