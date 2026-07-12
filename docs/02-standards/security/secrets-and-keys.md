# Secrets and Keys

Where secrets live, how keys are derived, and how they are rotated. This realises the secrets-and-key-management concern
of [controls-asvs.md](./controls-asvs.md) (ASVS V6 Stored Cryptography).

## The OS key store is the only home

Secrets — sync tokens, package signing keys, and any credential that must remain confidential — are stored in the OS key
store: macOS Keychain, Windows Credential Manager, or the Linux Secret Service. They are never written to workspace
files, the runtime database, an exported package, or any log.

Rules:

- **No secret appears in a workspace file or exported package**
  ([pii-and-export-redaction.md](./pii-and-export-redaction.md)).
- **No secret appears in a log line**, even at debug level ([audit-and-logging.md](./audit-and-logging.md)).
- **Secrets are retrieved at the point of use** and not held in memory beyond the operation that requires them.
- **Only the Rust host calls the OS key store.** The renderer never receives a raw secret value
  ([trust-boundary.md](./trust-boundary.md)). A key-store entry the host will access is declared deny-by-default
  ([capability-scoping.md](./capability-scoping.md)).
- **Never hard-code a secret.** Configuration is provided through the key store or non-secret env/config; CI scans for
  committed secrets ([CODING-STANDARDS.md §15](../CODING-STANDARDS.md#15-secure-coding)).

The OS key store is chosen over a bespoke encrypted file because it is the platform's hardened, user-authenticated
secret store; reusing it avoids inventing key custody the product would then have to defend. The trade-off is a platform
dependency, abstracted behind a host-side trait so the three back-ends sit behind one seam.

## Key derivation

Where the product derives a key — for an export encryption envelope, or a hosted-mode session — a derived key is
produced with a memory-hard key-derivation function from a user secret or a key-store master, never used directly as a
raw password. This is **design intent**: export encryption envelopes are deferred
([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)), so the KDF is specified here as the rule
encryption will follow when it lands.

- A passphrase-derived key uses a memory-hard KDF (Argon2id or scrypt) with per-use salt and recorded cost parameters,
  so a derived key can be reproduced and the cost raised over time.
- A derived key is held only for the operation that needs it and zeroised after use (Rust `zeroize` on the buffer),
  consistent with "not held in memory beyond the operation".
- Key material at rest — a wrapping key, a signing key — lives in the OS key store, not in a derived-from-config form.

## Rotation

Rotation is supported without re-encrypting all historical data, by layering keys rather than using one global key:

- A secret in the key store (a sync token) is rotated by replacing the entry; the old value is overwritten in place in
  the store and never lingers in a workspace file.
- For encrypted exports (deferred), rotation uses envelope encryption: a per-export data key encrypts the content, and a
  long-lived wrapping key in the key store encrypts the data key. Rotating the wrapping key re-wraps the data keys, not
  the bulk content — so rotation is cheap and old exports remain decryptable under their recorded key reference
  ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)).
- A signing key compromise is handled at distribution
  ([code-signing-and-distribution.md](./code-signing-and-distribution.md)): rotate the certificate, re-sign, and
  publish; never reuse a leaked key.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V6 Stored Cryptography. _([controls-asvs.md](./controls-asvs.md))_

_Informative:_

- **NIST SSDF (SP 800-218)**. _(secret-handling practice)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [trust-boundary.md](./trust-boundary.md)                               | Why only the host touches the key store.              |
| [pii-and-export-redaction.md](./pii-and-export-redaction.md)           | The export path that must never carry a secret.       |
| [code-signing-and-distribution.md](./code-signing-and-distribution.md) | Where signing keys are used.                          |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)     | The export pipeline and deferred encryption envelope. |
