# Versioning and Evolution

How the boundary holds while the contracts, the schema, and the engines evolve. The rules here ensure that change lands without breaking the [boundary thesis](./boundary-thesis.md) and without surprising a consumer.

---

## Contract evolution

The typed IPC surface is a versioned contract between renderer and host. Change to it is disciplined:

- A DTO change, an error-envelope change, or a new command **must** update the relevant [contract documents](../../04-contracts/CONTRACTS-AND-SCHEMAS.md) and the contract tests in the same change. The Rust→TS type generation runs during build and CI enforces zero drift, so a renderer cannot compile against a stale shape.
- Compatibility follows **Semantic Versioning 2.0.0** _(SemVer 2.0.0)_: an additive command or optional field is a minor change; a removed or retyped field is a breaking change requiring a version bump and a migration note. Error codes follow RFC 9457 _(RFC 9457, Problem Details for HTTP APIs)_; a new code is additive, a changed meaning is breaking.

---

## Schema evolution

The metamodel and schema-as-data are canonical, so their evolution is governed, not ad hoc:

- **Schema evolution is forward-only.** Migration is explicit and recorded, per **[ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)** (Portable workspace folder format). A workspace records the schema version in `manifest.json`; opening a workspace whose schema is newer than the host understands returns `SCHEMA_TOO_NEW` rather than guessing.
- Because the op log is append-only, schema change never rewrites history — it adds, and the resolver interprets older operations under the schema in force when they were asserted. This keeps the rebuild-correctness statement in [`canonical-vs-derived.md`](./canonical-vs-derived.md) intact across schema versions.

---

## Engine evolution

Engines evolve behind their traits, which is what keeps proposition 4 of the thesis true under change:

- **Replacing an engine implementation is invisible above the trait.** A hosted or remote adapter — PostgreSQL materialisation, for example — is an engine swap behind the Mneme storage trait, not a UI fork and not a change to the IPC surface, per **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)** (Storage-engine abstraction). The renderer continues to call typed adapters only; it is never aware whether persistence is local or remote.
- **A new engine attaches without disturbing the existing ones.** The planned engines — Lexis, Pylon, Sophia, Kerux — are composed by the host and read through Mneme, under the taxonomy fixed by **[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)** (Module taxonomy and boundaries). Each joins the [acyclic graph](./dependency-rules.md) without introducing a cycle; their attachment points are in the [module dependency map](../module-dependency-map.md).

---

## Export and interchange

The workspace is the unit of copy and share, and its packaged export is deterministic — the same canonical input produces byte-identical output — per **[ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)** (Deterministic package export). Determinism is what lets an export be diffed, signed, and verified, and it is the same property the rebuild-correctness statement relies on. Interchange with other tools (ArchiMate Open Exchange, CSV/Excel) is the planned Pylon engine's concern, behind the same boundary.

---

## The trade-off named

Forward-only schema and a versioned contract close a door: there is no in-place rewrite of history to "fix" an old shape, and no silent contract change. The cost is an explicit migration and a version bump for every breaking change. The architecture accepts that ceremony because the alternative — mutable history or a drifting contract — would forfeit auditability and the rebuild-correctness guarantee that the whole boundary rests on.

---

## Related documents

| Document                                                                                                           | What it covers                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`../../04-contracts/CONTRACTS-AND-SCHEMAS.md`](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)                       | The IPC contract, error envelope, and versioning rules.           |
| [`canonical-vs-derived.md`](./canonical-vs-derived.md)                                                             | The rebuild-correctness statement schema evolution must preserve. |
| [`dependency-rules.md`](./dependency-rules.md)                                                                     | The acyclic invariant new engines join under.                     |
| [`../../06-adrs/ADR-0002-portable-workspace-format.md`](../../06-adrs/ADR-0002-portable-workspace-format.md)       | Portable workspace folder format and migration.                   |
| [`../../06-adrs/ADR-0007-deterministic-package-export.md`](../../06-adrs/ADR-0007-deterministic-package-export.md) | Deterministic package export.                                     |
