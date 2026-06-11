# Cross-Platform Matrix

What runs on each platform and what is platform-specific. Platform behaviour is explicitly tested, not assumed equivalent — a desktop product fails on the platform it was not exercised on.

## The matrix

CI runs the full suite on all three platforms.

| Platform                     | Unit + integration | Contract (IPC) | Replay / rebuild | Crash recovery | E2E smoke                      |
| ---------------------------- | ------------------ | -------------- | ---------------- | -------------- | ------------------------------ |
| macOS (arm64 / x86_64)       | required           | required       | required         | required       | optional (binary signed)       |
| Windows (x86_64)             | required           | required       | required         | required       | required                       |
| Linux (x86_64, Ubuntu 24.04) | required           | required       | required         | required       | required (headless `xvfb-run`) |

## Platform-specific notes

- **Path resolution:** workspace-folder resolution uses the `dirs`/`directories` crates and Tauri path helpers; tests must not hard-code repo-relative paths.
- **Windows file locking:** crash-recovery tests on Windows must account for file-lock semantics — files cannot be deleted while open — so fault-injection wrappers handle this explicitly ([test-layers.md](./test-layers.md)).
- **macOS E2E:** Tauri WebDriver runs against a locally built (unsigned) binary in CI; signed-binary testing is a pre-release manual gate ([code-signing-and-distribution.md](../security/code-signing-and-distribution.md)).
- **Linux headless:** `pnpm run webdriver:test:headless` wraps with `xvfb-run`; the WebKit driver (`webkit2gtk-driver`) must be on `PATH`.

## Why each platform is its own row

The boundary the product defends is the same everywhere, but the substrate beneath it is not: filesystem semantics, file locking, the OS key store ([secrets-and-keys.md](../security/secrets-and-keys.md)), and the WebView engine differ per platform. A test that passes on macOS proves nothing about Windows file locking or the Linux WebKit driver. Treating each platform as a required row — rather than testing one and trusting the rest — is the cost of a cross-platform desktop product, paid deliberately.

## Related documents

| Document                                                                         | What it covers                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------ |
| [Testing index](./README.md)                                                     | The cross-cutting posture and rules.             |
| [test-layers.md](./test-layers.md)                                               | The layers this matrix runs per platform.        |
| [code-signing-and-distribution.md](../security/code-signing-and-distribution.md) | The per-platform signing the E2E note refers to. |
| [Getting Started](../GETTING-STARTED.md)                                         | Per-platform setup and the E2E prerequisites.    |
