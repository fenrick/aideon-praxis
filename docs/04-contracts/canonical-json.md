# Canonical JSON profile

The one byte-exact serialisation the canonical workspace depends on. "JSON" alone is not enough: Rust map order, optional-field omission, float formatting, and enum representation must not be accidental consequences of the current `serde` implementation. This profile is **versioned** and is the shared canonicaliser for every surface that must be byte-stable — the canonical operation record, the deterministic export, the identity/corruption comparison, and the rebuild-equivalence hash ([ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md), [ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). `serde_json::to_vec` is **not** a canonicaliser.

Profile version: **`1`**. A change to any rule below is a new profile version, surfaced as a `format_version` event ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)), never a silent edit.

---

## Encoding rules

A canonical document is:

- **UTF-8**, with **no** byte-order mark.
- For line-delimited files (`model/ops/*.jsonl`): **one JSON object per line**, **LF** (`0x0A`) line endings, exactly **one** terminating LF per complete record, and **no insignificant whitespace** anywhere (no spaces after `:` or `,`, no indentation).
- **Object keys sorted by UTF-8 byte order.**
- **Deterministic string escaping** — the minimal escaping JSON requires, with a fixed choice for the optional escapes; no gratuitous `\uXXXX` for characters that need not be escaped.
- **No Unicode normalisation of authored string values.** NFC may make visually similar strings compare equal, but it also changes authored bytes; text normalisation is a domain-validation decision, not a hidden storage transform.

## Scalar representation

| Type                                           | Canonical form                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UUID                                           | Lower-case, hyphenated canonical form (`f45575de-c921-4d35-9b59-39322df7de18`).                                                                                                     |
| HLC / valid-time / full-range 64-bit           | **Decimal string** (`"7267843693811712000"`) — never a JSON number. The packed HLC exceeds JavaScript's exact-integer range, so a number would be unsafe under common JSON tooling. |
| Integer (small)                                | JSON number; no leading zeroes, no leading `+`; zero is `0`.                                                                                                                        |
| Boolean                                        | JSON `true` / `false`.                                                                                                                                                              |
| Float (finite, where a payload schema permits) | Shortest round-trippable decimal; negative zero normalised to `0`.                                                                                                                  |
| Float (non-finite)                             | **Rejected.** `NaN`/`Inf` are not representable in canonical JSON.                                                                                                                  |
| Enum / value tag                               | Stable **schema-owned** names (kebab-case), never Rust/serde debug names or ordinal positions (`"plan"`, not `"Plan"`; `{"str":…}`, not `{"Str":…}`).                               |

Rust may expose an `i64` internally; the canonical representation of full-range coordinates is the decimal **string**. This corrects the earlier `i64`-number convention noted in [hlc-encoding](./temporal-and-scenario/hlc-encoding.md) — M0 is where the convention becomes real.

**No inline binary, ever.** A binary value is a typed content-addressed reference — `{ "blob": { "algorithm": "sha256", "digest": "<hex>", "length": <bytes>, "media_type": "…" } }` — never Base64 or inline bytes, regardless of size; the bytes live in `objects/sha256/` ([content-addressed-blobs](../05-modules/mneme/content-addressed-blobs.md), [ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).

## Optional and default fields

One operation has exactly one byte form, so there are no two equivalent encodings:

- **All envelope fields are present.**
- An absent optional value is encoded as **`null`** (not omitted).
- An empty collection is **`[]`** or **`{}`** (not omitted).
- Schema defaults are **materialised explicitly** before canonicalisation — a field is never omitted merely because a Rust field carries `#[serde(default)]`.

Permissive **input** parsers may accept omitted optionals, alternate UUID case, or older enum spellings during migration; but before append the writer **normalises** the parsed input into the one canonical form above.

## The canonical operation record

A canonical `model/ops/` record (one line), with all the rules above applied:

```json
{
  "actor_id": "00000000-0000-4000-8000-0000000000a1",
  "asserted_at": "7338950400000000000",
  "deps": [],
  "format_version": 1,
  "kind": "set-property-interval",
  "op_id": "33333333-0000-4000-8000-000000000004",
  "origin": { "kind": "manual" },
  "payload": {
    "actor": "00000000-0000-4000-8000-0000000000a1",
    "asserted_at": "7338950400000000000",
    "entity_id": "11111111-0000-4000-8000-000000000003",
    "field_id": "cba320a9-7e3c-5597-b42f-284aad9a6406",
    "layer": "actual",
    "partition": "00000000-0000-4000-8000-000000000001",
    "scenario_id": null,
    "valid_from": "1767225600000000",
    "valid_to": null,
    "value": { "str": "Migrate" },
    "write_options": null
  }
}
```

(Shown on one line as it is stored; pretty-printed elsewhere only for reading.) The `kind` is the portable discriminator; `origin` records _through which process_ the operation arose (here `manual`; an import carries `{ "kind": "import", "import_batch_id": …, "source_digest": … }`); the asserting identity is the envelope `actor_id` — a logical actor, never a device. The payload is the typed object per [`docs/contracts/operations/<kind>.schema.json`](../contracts/operations/README.md) — note `field_id` is the attribute's stable **UUID**, not its human-readable string id, and the value tag (`str`) and `layer` (`actual`) are stable schema-owned names. `asserted_at` and `valid_from`/`valid_to` are decimal strings; absent optionals (`scenario_id`, `valid_to`, `write_options`) are explicit `null`.

## The "identical content" comparison

Two records with the same `(partition_id, op_id)` are **identical** when their canonical operation-record bytes are equal under the record's declared `format_version`. The process:

1. Parse the incoming record.
2. Validate the envelope and the kind-specific payload schema.
3. Normalise into the canonical DTO (materialise defaults, normalise scalars).
4. Canonically serialise.
5. Compare those canonical bytes with the stored canonical bytes.

Outcomes: same identity + equal bytes → **replay no-op**; same identity + different bytes → **corruption / identity collision** (rejected); invalid payload → rejected before comparison or append. This prevents a harmless formatting difference from producing a false corruption result.

## Related documents

| Document                                                                                   | What it covers                                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) | The decision this profile serves: record, identity, commit, replay.     |
| [operation schemas](../contracts/operations/README.md)                                     | The typed per-kind payload shapes a record carries.                     |
| [ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md)                            | Deterministic export — byte-for-byte segment copy, this profile inside. |
| [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)                            | The rebuild-equivalence hash — same canonicaliser, different shape.     |
| [hlc-encoding](./temporal-and-scenario/hlc-encoding.md)                                    | The HLC the canonical files encode as a decimal string.                 |
