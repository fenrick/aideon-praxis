# Default as-of-valid-time policy

What an omitted `as_of_valid_time` resolves to. The viewpoint's [mutual-exclusion rule](./viewpoint-shape.md) requires
exactly one of `instant`/`interval` on a populated field; this file governs the case where an API permits the field to
be omitted entirely.

---

An API that permits an omitted `as_of_valid_time` must document one of these policy tokens:

| Policy token        | Meaning                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `now_utc`           | `as_of_valid_time` defaults to the wall-clock UTC instant at request time.                                   |
| `workspace_default` | The workspace's configured default as-of valid time is used.                                                 |
| `explicit_required` | The field is mandatory; omission is a `TEMPORAL_CONTEXT_INVALID` error ([error-codes.md](./error-codes.md)). |

**When a policy is not documented for an API, treat it as `explicit_required`.** This is the safe default: it forces the
caller to state the valid time rather than silently resolving against an instant the caller did not choose. The
asserted-time default is separate and is `latest belief` on reads ([viewpoint-shape.md](./viewpoint-shape.md)).

## Related documents

| Document                                   | What it covers                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| [viewpoint-shape.md](./viewpoint-shape.md) | The field this policy governs and its asserted-time counterpart default. |
| [error-codes.md](./error-codes.md)         | The `TEMPORAL_CONTEXT_INVALID` code `explicit_required` raises.          |
