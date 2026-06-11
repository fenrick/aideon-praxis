# Property-Based and Fuzz Testing

Where generated-input testing applies: property-based tests for logic whose invariants are easy to state and hard to enumerate, and fuzz testing for parsers that sit on the trust boundary. These complement the example-based tests of the other layers — an example test checks one case; a property test checks a law across thousands.

## Property-based testing

A property-based test states an invariant — a law that must hold for _all_ valid inputs — and the tool generates many inputs, shrinking any counterexample to its minimal form. It follows the **QuickCheck** lineage (Claessen & Hughes, 2000); the tooling is **proptest** (or quickcheck) for Rust and **fast-check** for the TypeScript renderer.

The product has three domains where this pays off most, because their inputs are combinatorial and their invariants are crisp:

- **Temporal logic ([Chrona](../../05-modules/chrona/README.md)).** Resolution over valid time, asserted time, layer policy, and supersession ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)) is governed by Allen's interval relations and laws that hold for any interval set. Properties to assert:
  - the effective interval of a fact is always a subset of its stored valid-time interval ([CONTEXT.md](../../../CONTEXT.md));
  - resolving at a viewpoint and resolving the same viewpoint after a no-op produce identical snapshots (idempotence of read);
  - effective intervals over one slot, layer, and scenario never overlap (the resolver partitions the timeline).
- **Scenario merge ([Praxis](../../05-modules/praxis/README.md)).** A scenario is an additive overlay on the base case ([CONTEXT.md](../../../CONTEXT.md)). Properties:
  - merging a scenario then resolving the base case is unchanged (additivity — a scenario never mutates the base);
  - merge is order-independent for non-conflicting overlays (commutativity), and a genuine conflict is reported, never silently resolved.
- **Graph operations ([Metis](../../05-modules/metis/README.md)).** Bounded analytics over the effective graph. Properties:
  - centrality and path results are invariant under node-id relabelling (the answer depends on structure, not identity);
  - a bounded traversal never returns a node outside its declared bound (`Partial / Bounded` coverage is honest, [DOCUMENTATION-STANDARD.md §9](../DOCUMENTATION-STANDARD.md));
  - rebuilding the derived graph from the op log and recomputing yields the same analytics result (determinism — pairs with the replay tests, [test-layers.md](./test-layers.md)).

Property tests use **fixed seeds** so a failure reproduces; a discovered counterexample is added as a regression example test at the appropriate layer.

## Security / fuzz testing

A fuzzer feeds malformed and adversarial input to a parser and watches for panics, hangs, or memory unsafety. It targets exactly the surfaces the [threat model](../security/threat-model.md) treats as hostile:

- **Import parsers ([Pylon](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).** An imported file is untrusted ([trust-boundary.md](../security/trust-boundary.md)); its parser is fuzzed (`cargo-fuzz`/libFuzzer) so a crafted file cannot crash the host or smuggle bad content past validation. A crash found by the fuzzer is a security bug ([vulnerability-reporting.md](../security/vulnerability-reporting.md)).
- **IPC payload deserialisation.** Every inbound IPC payload is validated deny-by-default ([controls-asvs.md](../security/controls-asvs.md)); fuzzing the deserialiser confirms a malformed payload yields a `validation`-category error ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)), never a panic across the boundary ([CODING-STANDARDS.md §7](../CODING-STANDARDS.md#7-rust--result-discipline-and-exception-safety)).
- **Blob and op-log decoders.** The decoders for canonical material are fuzzed so a corrupt or hostile file is rejected, not trusted — reinforcing the hash-verification control ([blobs-and-integrity.md](../security/blobs-and-integrity.md)).

A fuzzer runs as a periodic deepening job, not a per-PR gate; a discovered crash is fixed and pinned as a regression corpus entry so it never recurs.

This is **design intent** at the level of an adopted practice: the tools (`proptest`, fast-check, `cargo-fuzz`) and target surfaces are named; wiring the periodic jobs is a follow-up, like mutation testing ([coverage-and-gates.md](./coverage-and-gates.md)).

## Related documents

| Document                                                                                   | What it covers                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| [Testing index](./README.md)                                                               | The cross-cutting posture and rules.                           |
| [coverage-and-gates.md](./coverage-and-gates.md)                                           | Mutation testing — the complementary assertion-strength check. |
| [Security threat model](../security/threat-model.md)                                       | The hostile surfaces fuzzing targets.                          |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The temporal model whose laws property tests assert.           |
