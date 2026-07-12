# ArchiMate Open Exchange

Why the ArchiMate Model Exchange File Format is Pylon's primary import and export format, and how external elements map
onto the seed metamodel. For practitioners moving models between Aideon and other EA tools.

> **PLANNED.** No `aideon_pylon` crate exists; this is design intent per
> [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

## The lingua franca

The **ArchiMate Model Exchange File Format** (The Open Group) is Pylon's primary import and export format
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). It is chosen because it is a published,
vendor-neutral standard aligned with the seed metamodel's own ArchiMate vocabulary
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)): the seed ships ArchiMate-aligned types and
relationships (`serves`, `realises`, `accesses`, `hosts`), so an open ArchiMate exchange file is the lowest-friction
bridge between Aideon and the wider ecosystem.

The trade-off named: a proprietary interchange format would be simpler to control but defeats the point of
interoperability; the published exchange format is the interoperability commitment partners build against, at the cost
of being bound to that format's own fidelity limits
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).

## Mapping onto the seed

An import maps ArchiMate elements and relationships onto the seed metamodel using the canonical, ArchiMate-aligned
vocabulary ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)):

| ArchiMate concept                                         | Seed mapping                 | Canonical relationship                        |
| --------------------------------------------------------- | ---------------------------- | --------------------------------------------- |
| Application Component                                     | `Application` entity         | —                                             |
| Capability                                                | `Capability` entity          | —                                             |
| Business Process                                          | `BusinessProcess` entity     | —                                             |
| Data Object / Business Object                             | `DataEntity` entity          | —                                             |
| Node / System Software                                    | `TechnologyComponent` entity | —                                             |
| Serving (Capability → Value stream)                       | —                            | `serves`                                      |
| Realization (Application/Technology → Capability/Process) | —                            | `realises`                                    |
| Access (Process/Application → Data)                       | — (carries `mode`)           | `accesses`                                    |
| Serving/Assignment at technology layer                    | —                            | `hosts` (`TechnologyComponent → Application`) |

Direction is load-bearing: `hosts` runs `TechnologyComponent → Application`, and the superseded `deployed_on` direction
must not be reintroduced through an import ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

## Concepts with no seed equivalent

Not every ArchiMate concept has a seed type. An element Pylon cannot map cleanly is **not guessed and not silently
dropped**: it is surfaced in the mapping report as `Awaiting review`
([deterministic, reviewable import](./deterministic-reviewable-import.md)). Whether an unmapped concept is later
introduced as an explicit metamodel extension or rejected is an open question in
[ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md); the discipline is that a steward decides,
not the importer.

## Round-trip fidelity is bounded

Round-trip fidelity — export then re-import — is bounded by two things: the exchange format's own expressiveness, and
what the export's redaction policy permitted to leave
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). A redacted export cannot round-trip the
content it withheld. This is stated plainly rather than implied: Pylon does not promise lossless round-trips beyond what
the format and the policy allow.

## Worked example

Importing an ArchiMate exchange file maps its Application Components to seed `Application` entities and its Serving and
Realization relationships to `serves` / `realises` per the canonical vocabulary
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md);
[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). An Application Component named "Insight Hub" maps
to an `Application` like the seed `n:application:insight-hub`; a Realization from it to a Capability "Customer Insight"
maps to a `realises` relationship toward `n:capability:customer-insight`. Any ArchiMate element with no seed type — say
a Location or a Course of Action not yet in the seed — appears in the mapping report `Awaiting review` rather than being
mapped to an approximate type.

## References & standards

_Normative:_

- The Open Group — **ArchiMate Model Exchange File Format**. The interchange format itself.

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. The element and relationship semantics the mapping aligns to.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [Pylon README](./README.md)                                              | The module index and invariants.                              |
| [CSV, Excel, and connectors](./csv-excel-and-connectors.md)              | The secondary on-ramps onto the same internal representation. |
| [Deterministic, reviewable import](./deterministic-reviewable-import.md) | How the mapping report and proposed batch work.               |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)     | The canonical ArchiMate-aligned relationship vocabulary.      |
