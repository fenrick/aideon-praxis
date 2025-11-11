# Meta-Model Artifacts

`docs/meta` holds machine-readable definitions of the ArchiMate-aligned schema that Praxis enforces.

## File layout

- `core-v1.json`: canonical schema shipped with the desktop build. It lists element types,
  permissible attributes, relationship rules, and plan-event constraints.
- `README.md`: this file.

We treat the meta-model as *data*, so other schema flavours (customer extensions, previews) live in
additional files (e.g., `core-v2.json`, `customer/acme.json`).

## JSON structure

Each file must include:

```jsonc
{
  "version": "1.0.0",
  "description": "Human readable note",
  "types": [
    {
      "id": "Capability",
      "label": "Capability",
      "category": "Business",
      "extends": "OptionalBaseType",
      "attributes": [
        { "name": "name", "type": "string", "required": true },
        { "name": "tier", "type": "enum", "enum": ["Strategic", "Core", "Supporting"] }
      ]
    }
  ],
  "relationships": [
    {
      "id": "serves",
      "from": ["Capability"],
      "to": ["ValueStreamStage"],
      "attributes": [ { "name": "weight", "type": "number" } ]
    }
  ],
  "validation": { ... optional global guards ... }
}
```

### Attribute types

- `string`, `text`, `number`, `datetime`, `enum`, `boolean`.
- `enum` definitions must list allowed values; they are case insensitive by default.

### Relationship rules

- `from`/`to`: arrays of type ids.
- Optional `multiplicity` (e.g., `{ "from": "many", "to": "one" }`).
- Optional `directed` flag (defaults to `true`).

### Versioning

Bump the `version` field when the schema is incompatible (e.g., removing a type). Add new files for
major updates and keep older versions for migrations. Praxis will eventually expose registry APIs
that report the active version to the renderer.

## Future extensions

- `overrides/` directories per tenant.
- JSON schema describing the meta-model format itself.
- Tooling to validate meta-model files before shipping.
