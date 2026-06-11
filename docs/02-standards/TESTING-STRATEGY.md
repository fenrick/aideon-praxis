# Testing Strategy

This document has moved. The testing strategy is now a folder of focused files, indexed at:

**→ [testing/README.md](./testing/README.md)**

The folder covers the six test layers, coverage and the flakiness SLA, boundary and contract testing (tracked against the IPC manifest), property-based and fuzz testing, per-module obligations, the cross-platform matrix, and documentation-example testing.

| Topic                                     | File                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| The six test layers + commands            | [testing/test-layers.md](./testing/test-layers.md)                                 |
| Coverage, flakiness SLA, mutation testing | [testing/coverage-and-gates.md](./testing/coverage-and-gates.md)                   |
| IPC/DTO/trait contract tests + matrices   | [testing/boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md) |
| Property-based + security/fuzz testing    | [testing/property-and-fuzz-testing.md](./testing/property-and-fuzz-testing.md)     |
| Per-module obligations                    | [testing/per-module-obligations.md](./testing/per-module-obligations.md)           |
| Cross-platform matrix                     | [testing/cross-platform-matrix.md](./testing/cross-platform-matrix.md)             |
| Doc-example testing                       | [testing/doc-example-testing.md](./testing/doc-example-testing.md)                 |
