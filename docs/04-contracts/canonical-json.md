# Aideon Canonical JSON v1

The one byte-exact serialisation the canonical workspace depends on. "JSON" alone is not enough: Rust map order, optional-field omission, float formatting, and enum representation must not be accidental consequences of the current `serde` implementation. This profile is **versioned** and is the shared canonicaliser for every surface that must be byte-stable — the canonical operation record, the deterministic export, the identity/corruption comparison, and the rebuild-equivalence hash ([ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md), [ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). `serde_json::to_vec` is **not** a canonicaliser.

Profile version: **`1`**. A change to any rule below is a new profile version, surfaced as a `format_version` event ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)), never a silent edit.

**Relationship to RFC 8785 (JCS).** Aideon Canonical JSON v1 **imports the string serialisation rules of RFC 8785 §3.2.2.2 and the IEEE-754 number serialisation rules of §3.2.2.3** verbatim — these are fixed JCS rules, not implementation choices. It is **not full JCS**: object properties are ordered recursively by ascending **UTF-8 byte sequence** rather than RFC 8785's UTF-16 code units, and full-range integer coordinates are represented as constrained **decimal strings** rather than JSON numbers. Because of the property-ordering divergence the complete profile **must not** be described as "RFC 8785 / JCS compliant". A canonical JSONL operation record appends exactly **one LF byte** to the canonical JSON value.

---

## Encoding rules

A canonical document is:

- **UTF-8**, with **no** byte-order mark.
- For line-delimited files (`model/ops/*.jsonl`): **one JSON object per line**, **LF** (`0x0A`) line endings, exactly **one** terminating LF per complete record, and **no insignificant whitespace** anywhere (no spaces after `:` or `,`, no indentation).
- **Object keys sorted recursively by ascending UTF-8 byte sequence.** This is a **deliberate Aideon divergence from RFC 8785**, which sorts by unsigned UTF-16 code units; the two orders differ for some supplementary-plane (astral) property names. For format v1 we retain UTF-8 ordering and pin it with test vectors (below) so no implementation accidentally substitutes the JCS UTF-16 order. All envelope and payload keys in M0 are ASCII, where the two orders coincide.
- **String escaping follows RFC 8785 §3.2.2.2, without divergence:**
  - escape `"` as `\"`;
  - escape `\` as `\\`;
  - use `\b`, `\t`, `\n`, `\f`, `\r` for those five control characters;
  - encode every other `U+0000`–`U+001F` control as lower-case `\u00xx`;
  - emit `/` **unescaped**;
  - emit all other valid Unicode characters directly as UTF-8;
  - do **not** normalise Unicode;
  - **reject invalid Unicode** (e.g. lone surrogates) rather than escaping or substituting it.
- **No Unicode normalisation of authored string values.** NFC may make visually similar strings compare equal, but it also changes authored bytes; text normalisation is a domain-validation decision, not a hidden storage transform.

## Scalar representation

| Type                                           | Canonical form                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UUID                                           | Lower-case, hyphenated canonical form (`f45575de-c921-4d35-9b59-39322df7de18`).                                                                                                                                                                                                                                                                                                                                      |
| HLC / valid-time / full-range 64-bit           | **Decimal string** (`"7267843693811712000"`) — never a JSON number. The packed HLC exceeds JavaScript's exact-integer range, so a number would be unsafe under common JSON tooling.                                                                                                                                                                                                                                  |
| Integer (small)                                | JSON number; no leading zeroes, no leading `+`; zero is `0`.                                                                                                                                                                                                                                                                                                                                                         |
| Boolean                                        | JSON `true` / `false`.                                                                                                                                                                                                                                                                                                                                                                                               |
| Float (finite, where a payload schema permits) | **RFC 8785 §3.2.2.3** (ECMAScript number serialisation): finite IEEE-754 binary64 only; shortest round-trippable representation with the standard's fixed ordinary-vs-exponent notation rules (no custom threshold); `-0` serialises as `0`. Ryū is an acceptable implementation, but the normative contract is RFC 8785's ECMAScript-compatible result, verified against its published number vectors (Appendix B). |
| Float (non-finite)                             | **Rejected.** `NaN` and ±infinity are not representable in canonical JSON.                                                                                                                                                                                                                                                                                                                                           |
| Enum / value tag                               | Stable **schema-owned** names (kebab-case), never Rust/serde debug names or ordinal positions (`"plan"`, not `"Plan"`; `{"str":…}`, not `{"Str":…}`).                                                                                                                                                                                                                                                                |

Rust may expose an `i64` internally; the canonical representation of full-range coordinates is the decimal **string**. This corrects the earlier `i64`-number convention noted in [hlc-encoding](./temporal-and-scenario/hlc-encoding.md) — M0 is where the convention becomes real. RFC 8785 itself recommends representing values that exceed reliable IEEE-754 integer precision as strings, so this divergence is consistent with the standard's own guidance even though it is not part of JCS's number rules.

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

## Byte forms and the record digest

Two byte forms are defined on top of the profile, so every downstream surface refers to the same bytes:

```text
canonical_json_bytes(value)
    = the canonical UTF-8 JSON encoding of `value` under this profile, with NO trailing newline and NO BOM

canonical_record_bytes(operation)
    = canonical_json_bytes(operation) || 0x0A          # exactly one trailing LF
```

The per-operation digest is then:

```text
canonical_record_digest
    = lowercase_hex( BLAKE3-256( canonical_record_bytes(operation) ) )
```

Properties:

- the input includes **exactly one** trailing LF and **no** BOM;
- the output is 32 bytes, encoded as **64 lower-case hexadecimal** characters;
- the algorithm identifier is **`blake3-256`**;
- this is the **same byte representation** the sealed-segment and export-package checksums cover (each record including its terminating LF), so the format carries one record-byte definition, not several ([workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md), [export-import-replay](../05-modules/mneme/export-import-replay.md)).

BLAKE3-256 is the operation-record digest. **SHA-256 remains the blob content-address algorithm** — a separate content-addressing contract ([ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md)); operation-record digests are not forced onto the blob algorithm.

## The "identical content" comparison

Two records with the same `(partition_id, op_id)` are **identical** when their `canonical_record_digest` values are equal under the record's declared `format_version` (equivalently, their `canonical_record_bytes` are byte-equal). The process:

1. Parse the incoming record.
2. Validate the envelope and the kind-specific payload schema.
3. Normalise into the canonical DTO (materialise defaults, normalise scalars).
4. Canonically serialise to `canonical_record_bytes` and compute `canonical_record_digest`.
5. Compare that digest with the stored record's digest.

Outcomes: same identity + equal digest → **replay no-op**; same identity + different digest → **corruption / identity collision** (rejected); invalid payload → rejected before comparison or append. This prevents a harmless formatting difference from producing a false corruption result.

## Required test vectors

The format-conformance suite for profile v1 must include, at minimum:

- every control-character escape (`\b \t \n \f \r` and a representative `\u00xx`);
- a raw `/`;
- embedded `"` and `\`;
- non-ASCII BMP characters emitted as raw UTF-8;
- supplementary-plane (astral) characters, including **property names** whose UTF-8 order differs from UTF-16 order — pinning the Aideon divergence so no implementation substitutes JCS's UTF-16 ordering;
- rejection of lone surrogates / invalid Unicode;
- positive and negative zero (`-0 → 0`);
- the RFC 8785 Appendix B float vectors;
- the fixed-vs-exponent notation threshold boundaries;
- the smallest and largest finite `f64`;
- rejection of `NaN` and ±infinity;
- the exact `canonical_record_digest` (BLAKE3-256, lower-case hex) of at least three complete JSONL operation records.

## Related documents

| Document                                                                                   | What it covers                                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) | The decision this profile serves: record, identity, commit, replay.     |
| [operation schemas](../contracts/operations/README.md)                                     | The typed per-kind payload shapes a record carries.                     |
| [ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md)                            | Deterministic export — byte-for-byte segment copy, this profile inside. |
| [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)                            | The rebuild-equivalence hash — same canonicaliser, different shape.     |
| [hlc-encoding](./temporal-and-scenario/hlc-encoding.md)                                    | The HLC the canonical files encode as a decimal string.                 |
