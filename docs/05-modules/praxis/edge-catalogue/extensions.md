# Extensions

How Aideon-specific relationship extensions are introduced, marked, and governed. The canonical five relationships are a closed set in the seed; anything beyond them is an extension, and an extension must declare itself as one. This file states the rule so a reader can tell a standard relationship from a local addition at a glance.

---

## The rule

The catalogue uses a plain-language, **ArchiMate-aligned** relationship set; no proprietary doctrine governs naming ([catalogue](./catalogue.md)). Aideon-specific relationships are permitted, but each one **must**:

- be mapped to an ArchiMate 3.2 relationship where one fits (Composition, Aggregation, Triggering, Flow, Influence, Specialization, Association), and named after it;
- carry in-package rationale stating why no canonical relationship suffices;
- be added as a [metamodel extension package](../../../03-design/metamodel/extension-and-versioning.md) — additive, minor-version, with UUIDs minted by the compiler;
- be **kept out of the seed assets and default contract examples**, so the seed remains the minimal ArchiMate-aligned core.

An extension that cannot be mapped to an ArchiMate relationship is a signal to reconsider the modelling, not to coin a private verb.

---

## Generic relationships are extensions, not defaults

The superseded `depends_on` (generic fallback dependency) and `belongs_to` (membership/containment) are **not** in the seed and are **not** reintroduced by default ([superseded names](./superseded-names.md)). If a genuine need arises:

- a generic dependency maps to ArchiMate **Association** or, where it is a runtime trigger, **Triggering**/**Flow** — introduced as a marked extension with rationale, never as a catch-all;
- a containment/membership relationship maps to ArchiMate **Composition** (strong, exclusive) or **Aggregation** (shared) — introduced the same way.

The bar is deliberately high: a generic relationship erodes the lineage the [semantic spine](../../../03-design/semantic-spine/the-spine.md) and analytics rely on, because it carries no specific meaning to reason over. Prefer a specific canonical relationship wherever one exists.

---

## How an extension is marked

An extension relationship is identifiable in three places:

1. **In the metamodel document** — it lives in an overlay package, not in `core-v1.json`, so its provenance is visible in the workspace's `model/schema/` ([packages and the registry](../../../03-design/metamodel/packages-and-registry.md)).
2. **In documentation** — it is recorded in the installing package's own docs with its ArchiMate mapping and rationale, not silently in this catalogue.
3. **In tooling and contract examples** — default examples use only the canonical five; an extension appears in examples only for the package that introduces it.

This keeps the canonical surface stable and small while still allowing a workspace to model relationships its domain genuinely needs.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Composition, Aggregation, Triggering, Flow, Influence, Specialization, Association — the relationships an extension maps to.
- **Semantic Versioning 2.0.0**. Extensions are additive, minor-version changes ([ADR-0017](../../../06-adrs/ADRS.md)).

## Related documents

| Document                                                                             | What it covers                                  |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| [Catalogue](./catalogue.md)                                                          | The canonical five.                             |
| [Superseded names](./superseded-names.md)                                            | Why `depends_on`/`belongs_to` are not defaults. |
| [Extension and versioning](../../../03-design/metamodel/extension-and-versioning.md) | The additive package rules.                     |
| [Proposed spine extension](../../../03-design/metamodel/proposed-spine-extension.md) | A worked PROPOSED extension package.            |
