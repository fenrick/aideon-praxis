# Metamodel Packages And Registry

Praxis owns meaning; Mneme owns storage. This document describes how metamodel packages are defined, compiled, and published — and the registry layer that keeps storage identifiers from leaking into the rest of the product.

---

## Scope and Responsibilities

| Concern                         | Owner                       | What It Does                                                                            |
| ------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Type and relationship semantics | Praxis (`crates/praxis`)    | Defines `MetaModelDocument`: types, relationships, validation rules                     |
| Schema-as-data persistence      | Mneme (`crates/mneme_core`) | Persists `MetamodelBatch` and exposes `EffectiveSchema` queries                         |
| Domain ↔ storage translation    | Praxis registry             | Maps human-readable domain keys to Mneme `type_id` / `field_id` / `edge_type_id` values |
| Canonical schema files          | Workspace `model/schema/`   | Portable, version-controlled, the authority for every open project                      |

The invariant is absolute: nothing above Mneme ever handles raw storage IDs directly. The registry is the only crossing point.

---

## What a Package Contains

A metamodel package is a `MetaModelDocument` — a versioned JSON document that Praxis loads, validates, and compiles. Each document declares:

- **Types** (`MetaType`): a stable string `id`, an optional UUID compatibility handle, an optional parent (`extends`), a category label, and a list of typed `MetaAttribute` entries.
- **Relationships** (`MetaRelationship`): a stable string `id`, UUID, directed flag, multiplicity, allowed `from`/`to` type lists, and relationship-scoped attributes.
- **Validation rules** (`MetaValidationRules`): global attribute constraints (string max-length, text max-length, enum case sensitivity) and per-relationship structural rules (`allow_self`, `allow_duplicate`).

```jsonc
// docs/data/meta/core-v1.json — excerpt
{
  "version": "1.0.0",
  "description": "Canonical Aideon meta-model aligned to ArchiMate-style concepts.",
  "types": [
    {
      "id": "Capability",
      "uuid": "ec929adf-eb79-51b8-a757-38d0452885ae",
      "label": "Capability",
      "category": "Business",
      "attributes": [
        { "name": "name",      "type": "string", "required": true,  "uuid": "89efcd94-5145-5439-8023-9424c6c381f8" },
        { "name": "tier",      "type": "enum",   "enum": ["Strategic","Core","Supporting"], "uuid": "c27ee320-dea9-5263-b362-d94c4a22bb77" },
        { "name": "lifecycle", "type": "enum",   "enum": ["Target","Current","Retire"],     "uuid": "23917fa3-e91c-57af-9650-9e8e58b1d18a" }
      ]
    }
  ],
  "relationships": [ ... ],
  "validation": {
    "attributes": { "string": { "maxLength": 512 }, "text": { "maxLength": 8192 }, "enum": { "caseSensitive": false } }
  }
}
```

Schema is portable data, not hidden code enums. The JSON document is committed in source and travels with the workspace.

---

## Attribute Kinds

| Kind       | Serde token  | Notes                                                                |
| ---------- | ------------ | -------------------------------------------------------------------- |
| `String`   | `"string"`   | Short text; max-length enforced by validation rules                  |
| `Text`     | `"text"`     | Long-form content; separate max-length budget                        |
| `Number`   | `"number"`   | JSON numeric                                                         |
| `Boolean`  | `"boolean"`  | JSON boolean                                                         |
| `Enum`     | `"enum"`     | Allowed values declared inline; case sensitivity controlled globally |
| `Datetime` | `"datetime"` | RFC 3339 string                                                      |
| `Blob`     | `"blob"`     | Opaque string, object, or array                                      |

---

## Loading and Merging

Praxis loads packages through `MetaModelConfig`, which names a base source and an ordered list of overlays.

```rust
pub enum MetaModelSource {
    EmbeddedCore,           // docs/data/meta/core-v1.json, embedded at compile time
    File(PathBuf),          // path on the local filesystem
    Inline(String),         // raw JSON string (tests, programmatic extension)
    Document(MetaModelDocument), // already-parsed value
}

pub struct MetaModelConfig {
    pub base: MetaModelSource,
    pub overrides: Vec<MetaModelSource>,
}
```

`MetaModelRegistry::load` resolves each source in order and calls `merge_documents`. The merge rules are:

1. All overlay documents must carry the same `version` string as the base; a mismatch is a hard error.
2. A type or relationship whose `id` matches an existing entry replaces it wholesale.
3. A type or relationship with a new `id` is appended.
4. If an overlay supplies `validation`, it replaces the base validation block entirely.

`MetaModelRegistry::embedded()` uses `MetaModelConfig::default()`, which loads `EmbeddedCore` with no overrides — the standard startup path.

---

## Compilation to MetamodelBatch

After merging, `MetaModelRegistry::from_document` compiles the document into three in-memory indexes that Praxis uses at runtime:

| Index                                                             | Purpose                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `TypeDescriptor` map                                              | Flattened attribute set per type, with inheritance resolved |
| `RelationshipDescriptor` map                                      | Allowed `from`/`to` sets and attribute set per relationship |
| UUID maps (`type_uuids`, `relationship_uuids`, `attribute_uuids`) | String-keyed lookups for stable identity                    |

Inheritance is resolved depth-first. A type's effective attribute set is its parent's set (recursively flattened) overridden by its own declarations. Cycles are detected and rejected immediately.

The same document is compiled into Mneme's `MetamodelBatch` for persistence:

```rust
pub struct MetamodelBatch {
    pub types: Vec<TypeDef>,
    pub fields: Vec<FieldDef>,
    pub type_fields: Vec<TypeFieldDef>,
    pub edge_type_rules: Vec<EdgeTypeRule>,
    pub metamodel_version: Option<String>,
    pub metamodel_source: Option<String>,
}
```

`TypeDef` holds a stable `type_id: Id` and maps to the Praxis `MetaType`. `FieldDef` carries `field_id`, `value_type`, cardinality, merge policy, and index flags. `TypeFieldDef` binds a field to a type with its required flag, default value, and override semantics. `EdgeTypeRule` encodes the allowed source and destination type IDs for each edge kind.

Praxis publishes the batch; Mneme stores it. Neither side inverts this flow.

---

## Stable Identifiers and the Compatibility Surface

Type, relationship, and attribute identifiers are part of the long-term compatibility surface. Two identifier namespaces exist:

| Namespace                 | Key                                                            | Stability guarantee                                                        |
| ------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Praxis string ID          | `MetaType.id`, `MetaRelationship.id`                           | Never change after first publication                                       |
| UUID compatibility handle | `MetaType.uuid`, `MetaRelationship.uuid`, `MetaAttribute.uuid` | Stable across document versions; used for cross-document identity matching |

UUIDs are version-5 values committed as JSON strings. The registry builds lookup maps (`type_uuids`, `relationship_uuids`, `attribute_uuids`) keyed on the string IDs so callers can resolve either form:

```rust
// String ID → UUID
registry.type_uuid("Capability")          // → Some("ec929adf-...")
registry.relationship_uuid("realizes")    // → Some("...")
registry.attribute_uuid("Capability", "tier") // → Some("c27ee320-...")
```

Removing a published ID, changing its UUID, or altering its meaning is a breaking change. Additions are non-breaking. The JSON document is the source of record; the registry is a compiled read path.

---

## Domain ↔ Storage Registry

The registry is the single layer that translates domain-facing keys into Mneme storage IDs. No task API, no screen, and no host command passes raw Mneme IDs. All crossings go through the registry.

Logical mapping:

| Domain key                | Resolves to                                                |
| ------------------------- | ---------------------------------------------------------- |
| `DomainTypeKey` (string)  | Mneme `type_id: Id`                                        |
| `DomainFieldKey` (string) | Mneme `field_id: Id`                                       |
| `DomainVerb`              | canonical edge family, Mneme `edge_type_id`, and direction |

`MetaModelRegistry` exposes the UUID lookup methods shown above. The `EffectiveSchema` type in Mneme carries the flattened, resolved field set for a given type:

```rust
pub struct EffectiveSchema {
    pub type_id: Id,
    pub applies_to: EntityKind,
    pub fields: Vec<EffectiveField>,
}

pub struct EffectiveField {
    pub field_id: Id,
    pub value_type: ValueType,
    pub cardinality_multi: bool,
    pub merge_policy: MergePolicy,
    pub is_required: bool,
    pub default_value: Option<Value>,
    pub is_indexed: bool,
    pub disallow_overlap: bool,
}
```

Task APIs query effective schemas from Mneme by type ID; they do not iterate raw `TypeDef` tables.

---

## Validation

`MetaModelRegistry::validate_node` and `validate_edge` run at write time against the compiled registry:

**Node validation**:

1. The node's `type` field must match a known `TypeDescriptor`.
2. All `props` values are type-checked against their attribute kind.
3. Required attributes must be present and non-null.
4. String and text lengths are checked against the global rules.
5. Enum values are matched against the declared variant list (case sensitivity follows the global rule).

**Edge validation**:

1. The edge's `type` must match a known `RelationshipDescriptor`.
2. The source node type must appear in `descriptor.from`.
3. The destination node type must appear in `descriptor.to`.
4. `allow_self` and `allow_duplicate` rules are applied per relationship.
5. Edge attributes undergo the same kind/length/enum checks as node attributes.

Validation is a `PraxisResult` — errors are typed `PraxisError::ValidationFailed` with a human-readable message. Callers surface these directly to the UI without inspecting internals.

---

## Schema-as-Data Storage

Schema data lives in two places:

| Location                      | Form                                     | Authority                                 |
| ----------------------------- | ---------------------------------------- | ----------------------------------------- |
| `docs/data/meta/core-v1.json` | Versioned JSON, embedded at compile time | Source of record for the built-in package |
| Workspace `model/schema/`     | Portable JSON files, version-controlled  | Source of record for project-local schema |

The built-in package is compiled into the `praxis` binary via `include_str!`. Project workspaces may carry additional schema files in `model/schema/` that Praxis loads as overlays. Both paths go through `MetaModelSource` and the same `merge_documents` pipeline.

Mneme persists the compiled result as `MetamodelBatch` rows in its SQLite store. That persisted form is a derived projection of the canonical JSON files — if the SQLite store is deleted, Praxis recompiles and republishes from source.

The `SchemaManifest` in Mneme (`crates/mneme_core/src/schema_manifest.rs`) tracks storage-layer migrations and column manifests independently of the metamodel document. It is Mneme's own structural ledger; it does not carry semantic type information.

---

## Extension

Any workspace may install additional packages by placing overlay documents in `model/schema/` and listing them in the workspace manifest. Praxis loads them in manifest order, validates version alignment, and merges them into the live registry.

Extension rules:

- A new type with a previously unused `id` and UUID may be added freely.
- A new relationship between existing types may be added freely.
- An existing type may have new optional attributes appended.
- No published `id` or UUID may be removed or renamed.
- No published attribute kind may be changed.
- Inheritance cycles are rejected at load time.

---

## Related Documents

- [DESIGN.md](./DESIGN.md) — design axioms, workspace layout, and canonical authority split
- [ARTEFACTS-AND-FAMILIES.md](./ARTEFACTS-AND-FAMILIES.md) — how artefact kinds map onto types and artefact families
- [docs/05-modules/praxis/README.md](../05-modules/praxis/README.md) — Praxis module overview
- [docs/05-modules/praxis/EDGE-CATALOGUE.md](../05-modules/praxis/EDGE-CATALOGUE.md) — semantic edge families and shipped domain verbs
- [docs/05-modules/mneme/README.md](../05-modules/mneme/README.md) — Mneme module overview
- [docs/05-modules/mneme/SQLITE.md](../05-modules/mneme/SQLITE.md) — SQLite storage detail
- [docs/04-contracts/CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) — inter-module contract definitions
