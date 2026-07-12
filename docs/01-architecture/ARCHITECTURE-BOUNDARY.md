# Architecture Boundary Rules

This document has been decomposed into the [`boundary/`](./boundary/) folder, one focused file per topic, per the
[Documentation Standard](../02-standards/DOCUMENTATION-STANDARD.md) §4 (prefer small single-topic files with an index).

**Start at [`boundary/README.md`](./boundary/README.md).**

The content that lived here now lives in:

| Topic                                                                             | File                                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The five propositions and documentation precedence                                | [`boundary/boundary-thesis.md`](./boundary/boundary-thesis.md)                         |
| Canonical vs derived, the workspace layout, rebuild correctness, failure/recovery | [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md)               |
| Renderer / IPC / host / engines — allowed and forbidden actions                   | [`boundary/layers-and-responsibilities.md`](./boundary/layers-and-responsibilities.md) |
| Replaceability, dependency directions, the acyclic invariant                      | [`boundary/dependency-rules.md`](./boundary/dependency-rules.md)                       |
| The time-first rule                                                               | [`boundary/time-first-rule.md`](./boundary/time-first-rule.md)                         |
| Security constraints                                                              | [`boundary/security-constraints.md`](./boundary/security-constraints.md)               |
| Artefact execution boundary                                                       | [`boundary/artefact-execution-boundary.md`](./boundary/artefact-execution-boundary.md) |
| Versioning and evolution                                                          | [`boundary/versioning-and-evolution.md`](./boundary/versioning-and-evolution.md)       |

See also the [architecture layer index](./README.md), the [module dependency map](./module-dependency-map.md), and the
[quality attributes](./quality-attributes.md).
