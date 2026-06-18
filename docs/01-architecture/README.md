# Architecture

The architecture layer for Aideon Desktop — the durable description of the system's shape, its boundaries, the dependency rules between its modules, the quality scenarios it is designed to meet, and the C4 model views that draw it. It is written for an architect or engineer who must rebuild, extend, or audit the system without access to its authors.

This layer follows **arc42** for its building-block and runtime views and **the C4 model** for its diagrams _(Brown, The C4 Model for Visualising Software Architecture)_, and it describes stakeholders, concerns, and architecture viewpoints in the sense of **ISO/IEC/IEEE 42010:2022**. A note on a name collision: 42010 uses _architecture viewpoint_ for "a way of looking at a system from the standpoint of related concerns". This document uses **architecture viewpoint (42010)** for that sense and reserves the bare word **Viewpoint** for the product's bitemporal query frame defined in [`../../CONTEXT.md`](../../CONTEXT.md).

---

## Contents

1. [What this layer fixes](#1-what-this-layer-fixes)
2. [Reading order](#2-reading-order)
3. [The boundary folder](#3-the-boundary-folder)
4. [Module dependency map](#4-module-dependency-map)
5. [Quality attributes](#5-quality-attributes)
6. [C4 model views](#6-c4-model-views)
7. [Architecture viewpoints (42010)](#7-architecture-viewpoints-42010)
8. [References & standards](#8-references--standards)
9. [Related documents](#9-related-documents)

---

## 1. What this layer fixes

The architecture layer answers one question above all others: **what is canonical, and what is derived?** Every other rule in this layer follows from the answer. The portable workspace folder is canonical authority; everything under `.aideon/runtime/` is a rebuildable cache; the Rust host is the security boundary; and the engines are in-process Rust crates behind traits. These are not preferences. They are invariants that the design defers to, fixed by the accepted ADRs and restated here as the [boundary thesis](./boundary/boundary-thesis.md).

**Documentation precedence.** Documentation is authoritative. Where code and these documents disagree, code is brought to match the documents; documents change to match code only when the intended architecture has genuinely changed. This rule is carried in [`boundary/boundary-thesis.md`](./boundary/boundary-thesis.md) and governs the whole corpus.

## 2. Reading order

A reader new to the system should take the documents in this order:

1. [`boundary/boundary-thesis.md`](./boundary/boundary-thesis.md) — the five propositions every decision defers to.
2. [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md) — the deciding rule, with the rebuild-correctness statement.
3. [`boundary/layers-and-responsibilities.md`](./boundary/layers-and-responsibilities.md) — renderer, IPC, host, engines, canonical, derived: who owns what, with allowed/forbidden tables.
4. [`boundary/dependency-rules.md`](./boundary/dependency-rules.md) and [`module-dependency-map.md`](./module-dependency-map.md) — the acyclic dependency graph and how it is enforced.
5. [`boundary/time-first-rule.md`](./boundary/time-first-rule.md) — why every read and write carries a time context.
6. [`quality-attributes.md`](./quality-attributes.md) — the quality scenarios the architecture is designed to meet, and [`performance-and-scale.md`](./performance-and-scale.md) — the size limits, benchmark points, rebuild SLOs, op-log compaction, and cascade determinism.
7. The remaining boundary files — [security](./boundary/security-constraints.md), [artefact execution](./boundary/artefact-execution-boundary.md), [versioning](./boundary/versioning-and-evolution.md) — and the [C4 model](./c4/README.md).

## 3. The boundary folder

The boundary rules are decomposed into small single-topic files under [`boundary/`](./boundary/), indexed by [`boundary/README.md`](./boundary/README.md). That index carries the cross-cutting narrative; each file answers one question.

| File                                                                          | Answers                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`boundary-thesis.md`](./boundary/boundary-thesis.md)                         | The five irreducible propositions, and documentation precedence.         |
| [`canonical-vs-derived.md`](./boundary/canonical-vs-derived.md)               | The deciding rule, the workspace layout, and rebuild correctness.        |
| [`layers-and-responsibilities.md`](./boundary/layers-and-responsibilities.md) | Each layer's allowed and forbidden actions.                              |
| [`dependency-rules.md`](./boundary/dependency-rules.md)                       | Replaceability, dependency directions, the acyclic invariant.            |
| [`time-first-rule.md`](./boundary/time-first-rule.md)                         | The time context required on every read and write.                       |
| [`security-constraints.md`](./boundary/security-constraints.md)               | The desktop security baseline and its threat frame.                      |
| [`artefact-execution-boundary.md`](./boundary/artefact-execution-boundary.md) | Where artefacts execute and what the renderer may not do.                |
| [`versioning-and-evolution.md`](./boundary/versioning-and-evolution.md)       | How contracts, schema, and engines evolve without breaking the boundary. |

## 4. Module dependency map

[`module-dependency-map.md`](./module-dependency-map.md) draws the full crate dependency graph, including the role of the `engine` crate as the shared harness that wires the domain engines behind their traits, and where the four planned modules (Lexis, Pylon, Sophia, Kerux) attach. It states the acyclic invariant and how the build enforces it.

## 5. Quality attributes

[`quality-attributes.md`](./quality-attributes.md) records the architecture's quality scenarios — performance and latency, portability, recoverability, security, accessibility, and extensibility — in arc42 quality-scenario style. Numeric budgets there are stated as targets and design intent, not as measured facts.

## 6. C4 model views

The [`c4/`](./c4/) folder holds the Structurizr DSL source ([`c4/workspace.dsl`](./c4/workspace.dsl)) and a [render guide](./c4/README.md). Architecture documents reference these views rather than redrawing them.

## 7. Architecture viewpoints (42010)

ISO/IEC/IEEE 42010:2022 frames an architecture description as a set of **architecture viewpoints** that each address the **concerns** of identified **stakeholders**. This layer's documents realise the following architecture viewpoints (42010):

| Architecture viewpoint (42010)     | Stakeholders                          | Concerns it addresses                                               | Where it lives                                                                                                               |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Boundary & authority               | Architect, security reviewer, auditor | What is canonical; trust boundary; replaceability                   | [`boundary/`](./boundary/)                                                                                                   |
| Module dependency (building-block) | Engineer, maintainer                  | Coupling, acyclicity, where new modules attach                      | [`module-dependency-map.md`](./module-dependency-map.md), [`c4/`](./c4/)                                                     |
| Time & scenario                    | Architect, domain modeller            | Bitemporal correctness; viewpoint on every read/write               | [`boundary/time-first-rule.md`](./boundary/time-first-rule.md)                                                               |
| Quality scenarios                  | Architect, product, QA                | Performance, recoverability, security, accessibility, extensibility | [`quality-attributes.md`](./quality-attributes.md)                                                                           |
| Runtime (failure & recovery)       | Operator, support, engineer           | Behaviour under corruption, saturation, timeout, init failure       | [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md), [`quality-attributes.md`](./quality-attributes.md) |

The word **Viewpoint** alone, throughout this corpus, means the product's bitemporal query frame — never the 42010 sense.

## 8. References & standards

_Normative for this layer's form:_

- Brown — **The C4 Model for Visualising Software Architecture**. _(diagram convention; see [`c4/`](./c4/))_

_Informative:_

- **arc42** template — building-block and runtime view structure.
- **ISO/IEC/IEEE 42010:2022**, Architecture description — stakeholders, concerns, architecture viewpoints.

Full bibliography and the modules that use each source: [`../02-standards/STANDARDS-REGISTER.md`](../02-standards/STANDARDS-REGISTER.md).

## 9. Related documents

| Document                                                                                 | What it covers                                             |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`boundary/README.md`](./boundary/README.md)                                             | The boundary rules, decomposed.                            |
| [`module-dependency-map.md`](./module-dependency-map.md)                                 | The full crate dependency graph and the acyclic invariant. |
| [`quality-attributes.md`](./quality-attributes.md)                                       | The architecture's quality scenarios.                      |
| [`c4/README.md`](./c4/README.md)                                                         | The C4 levels used and how to render them.                 |
| [`../00-index/README.md`](../00-index/README.md)                                         | The documentation map and entry points.                    |
| [`../03-design/DESKTOP-FIRST-WORKSPACE.md`](../03-design/DESKTOP-FIRST-WORKSPACE.md)     | The design thesis this layer enforces.                     |
| [`../02-standards/DOCUMENTATION-STANDARD.md`](../02-standards/DOCUMENTATION-STANDARD.md) | The voice, vocabulary, and scales these documents obey.    |
| [`../06-adrs/ADRS.md`](../06-adrs/ADRS.md)                                               | The decisions that fix these invariants.                   |
