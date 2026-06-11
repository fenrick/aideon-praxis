# Generated-schema discipline

The enforcement of the one rule: **Rust owns the wire shape; TypeScript consumes generated types; CI keeps the drift at zero.** JSON Schemas (JSON Schema 2020-12) are the executable contract source, generated from the Rust struct definitions.

---

## The rule

Payload structs are defined once in Rust with `serde`. TypeScript types are generated from those definitions; the JSON Schemas are generated from the same source. An ad-hoc DTO, or a hand-mirrored TypeScript shape that diverges from the Rust source, is a contract violation. There is no renderer-only field by construction.

The trade-off this closes: the renderer cannot evolve its data model independently of the host. The benefit is that the two sides cannot drift apart undetected; the cost is that every shared shape change is a cross-boundary change with a CI gate and a [version implication](./versioning-and-compatibility.md).

## Generation

```bash
cargo run -p aideon_xtask -- ipc-manifest
```

This regenerates [`docs/contracts/ipc-manifest.json`](../../contracts/ipc-manifest.json) with the current command surface. The event names are generated likewise into [`docs/contracts/event-manifest.json`](../../contracts/event-manifest.json).

## CI drift check

The CI pipeline compares the committed manifest against a freshly generated one. A diff fails the build. The TypeScript contract test suite independently asserts that every command in the manifest has a corresponding typed adapter. Both checks must pass before merge — the drift target is zero.

A drift failure is the signal to consider a [version bump](./versioning-and-compatibility.md); it is not a substitute for the SemVer decision.

## Change discipline

A shared-shape change follows a fixed order so the source of truth is never bypassed:

1. Update the Rust payload struct in the relevant host or engine crate.
2. Regenerate the manifest: `cargo run -p aideon_xtask -- ipc-manifest`.
3. Update the corresponding TypeScript generated types.
4. Update IPC handlers and adapters.
5. Extend contract tests (Rust + TypeScript).
6. Update the affected module `README.md` or `DESIGN.md`, and the [version](./versioning-and-compatibility.md) if the change is breaking or additive.

No ad-hoc TS shapes. No DTOs that exist only in the renderer without a Rust-side source of truth.

## References & standards

- **JSON Schema 2020-12** _(normative: payload validation schemas)_.
- Meyer — **Design by Contract**, 1992; Pact — **consumer-driven contracts** _(informative: the boundary-contract discipline this realises)_.

## Related documents

| Document                                                             | What it covers                                |
| -------------------------------------------------------------------- | --------------------------------------------- |
| [versioning-and-compatibility.md](./versioning-and-compatibility.md) | The SemVer policy a drift triggers.           |
| [command-surface.md](./command-surface.md)                           | The manifest this discipline generates.       |
| [TESTING-STRATEGY.md](../../02-standards/TESTING-STRATEGY.md)        | The contract-test layer the CI check sits in. |
