# CSV, Excel, and connectors

The secondary on-ramps Pylon offers besides the ArchiMate exchange format, and why they map onto the same internal
representation. For practitioners importing application inventories, dependency spreadsheets, or EA-tool exports.

> **PLANNED.** No `aideon_pylon` crate exists; this is design intent per
> [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

## Secondary on-ramps, one representation

Most organisations do not arrive with a clean ArchiMate exchange file. They arrive with spreadsheets of applications and
dependencies, and with exports from EA tools that have their own schemas. Pylon offers **CSV/Excel and direct EA-tool
connectors as secondary on-ramps** ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The
design rule is that these map onto the **same internal representation** the ArchiMate path produces, so the
deterministic-and-reviewable import discipline
([deterministic, reviewable import](./deterministic-reviewable-import.md)) applies identically regardless of on-ramp.

This is why the format is a Pylon detail, not a Pylon boundary: whether the source is an exchange file, a CSV, or a
connector pull, the output is the same proposed operation batch plus mapping report, and acceptance writes the same
canonical operations.

## CSV and Excel mapping

A CSV or Excel import maps columns to slots on a target type via a **mapping configuration**: which column is the entity
name, which is a slot value, which expresses a relationship to another row. The column conventions are **provisional**
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)) — the specific header names and the
relationship-encoding convention are not yet fixed. What is fixed is that the mapping is explicit and reviewable: a
column that maps cleanly produces operations; a column or value that is ambiguous or unmapped is surfaced
`Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never guessed.

## Connectors

Direct EA-tool connectors read an external tool's export and map its schema onto the seed metamodel. The specific
connectors and the mapping tables from common EA-tool schemas to the seed are **provisional and an open question**
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). A connector is a _reader plus a
mapping_, not a live link: Pylon connectors are still **manual and one-shot** — a steward triggers a pull, reviews the
resulting batch, and accepts it. Continuous, automated ingestion from live platforms is
**[Skopos](../skopos/README.md)**, a separate module
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)); see
[Pylon vs Skopos](../skopos/vs-pylon.md).

## Worked example

A steward imports a CSV with columns `Name, Vendor, Disposition, Lifecycle` and a `RealisesCapability` column. Pylon's
mapping configuration maps `Name` to the `Application` `name` slot, `Vendor`/`Disposition`/`Lifecycle` to their slots,
and `RealisesCapability` to a `realises` relationship toward a `Capability` matched by name. A row
`Insight Hub, Praxis Cloud, Invest, Run, Customer Insight` proposes operations equivalent to the seed
`n:application:insight-hub` realising `n:capability:customer-insight`. A row whose `RealisesCapability` names a
capability not present in the twin is surfaced `Awaiting review` in the mapping report rather than creating a dangling
relationship.

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. The target vocabulary CSV/connector columns map onto.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [Pylon README](./README.md)                                              | The module index and invariants.                           |
| [ArchiMate Open Exchange](./archimate-open-exchange.md)                  | The primary format the on-ramps share representation with. |
| [Deterministic, reviewable import](./deterministic-reviewable-import.md) | The review discipline every on-ramp obeys.                 |
| [Skopos vs Pylon](../skopos/vs-pylon.md)                                 | Why connectors stay manual while Skopos is automated.      |
