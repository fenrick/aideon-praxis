# Encryption at Rest

The encryption-at-rest specification for a workspace: what is encrypted, how keys are managed, what is and is not protected, and how the design relates to the OS keychains Tauri exposes. Most of this is **design intent, not built** — the file states the rule encryption will follow when it lands, and is explicit about the gap, so a reader is never told an unbuilt defence exists.

A workspace is a portable folder of canonical material — the op log, schema, and content-addressed blobs ([blobs-and-integrity.md](./blobs-and-integrity.md)) — plus a derived runtime cache ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). A reader needs to know which of those an attacker with disk access can read, and which a future encryption layer would protect.

## Honest state: what is built today

Today the workspace is written in **cleartext** on disk, protected by filesystem permissions, not by encryption:

- Workspace directories and files are user-only (`0700`/`0600`); group and world bits are not granted ([blobs-and-integrity.md](./blobs-and-integrity.md)).
- Secrets never enter a workspace file — they live in the OS key store ([secrets-and-keys.md](./secrets-and-keys.md)) — so a cleartext workspace contains twin content, not credentials.
- Confidentiality against a local attacker with disk access is **out of scope for the workspace format**: once a user holds the folder on a shared or stolen device, file permissions do not stop them ([trust-boundary.md](./trust-boundary.md), [threat-model.md](./threat-model.md) adversaries). Confidentiality for _sharing_ comes from filtered, redacted, and (deferred) encrypted exports ([pii-and-export-redaction.md](./pii-and-export-redaction.md)), and confidentiality of the _whole device_ is the user's OS-level disk encryption.

This is the code-backed reality. Everything in the sections below describes the encryption-at-rest design the format leaves room for; each section marks itself design intent where it is not implemented.

## What would be encrypted (design intent)

When workspace encryption at rest lands, the unit of encryption is the **canonical material plus the derived cache**, each handled according to what it is:

| Component                             | Encrypted?                             | Rationale                                                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Op log** (`model/ops`)              | Yes (design intent)                    | The canonical authority; its cleartext is the twin's full history. Encrypted at rest with the workspace data key.                                                                                                                                        |
| **Schema** (`model/schema`)           | Yes (design intent)                    | Schema-as-data ([op-fact-schema-model.md](../../05-modules/mneme/op-fact-schema-model.md)) can reveal modelling intent; encrypted with the same data key.                                                                                                |
| **Blobs** (`objects/sha256`)          | Yes, per-blob envelope (design intent) | Large binary content (imported documents) is the highest-value confidentiality target; per-blob envelopes are the route to **crypto-shredding** a single object ([secrets-and-keys.md](./secrets-and-keys.md), and the right-to-erasure decision below). |
| **Runtime cache** (`.aideon/runtime`) | Yes (design intent)                    | Derived and rebuildable ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)), but it materialises the same content in a queryable form, so it must not be a cleartext bypass of an encrypted op log.                                 |
| **Secrets** (tokens, keys)            | Never in the workspace                 | Already excluded — they live in the OS key store ([secrets-and-keys.md](./secrets-and-keys.md)).                                                                                                                                                         |
| **Manifest** (`manifest.json`)        | Metadata only, may stay cleartext      | Carries the schema version and key references needed to _open and decrypt_; it holds no twin content. (Provisional.)                                                                                                                                     |

The invariant that makes this honest: **the derived runtime must never be a cleartext window onto an encrypted canonical store.** Encrypting `model/ops` while leaving `.aideon/runtime` cleartext would defeat the whole scheme, because the runtime holds the resolved facts. Either both are encrypted, or neither is — a partial scheme is not shipped.

## Key management (design intent)

Encryption at rest follows the key hierarchy and KDF rules already specified for export encryption ([secrets-and-keys.md](./secrets-and-keys.md)), reused rather than reinvented:

- **A per-workspace data key** encrypts the op log, schema, and runtime cache. It is a randomly generated key, not derived directly from a password.
- **The data key is wrapped** by a key-encryption key (KEK). The KEK is either held in the OS key store, or derived from a user passphrase with a memory-hard KDF (Argon2id or scrypt) with per-use salt and recorded cost parameters ([secrets-and-keys.md](./secrets-and-keys.md)). Wrapping the data key, rather than encrypting bulk content under a passphrase-derived key, is what makes rotation cheap.
- **Per-blob envelopes** give each blob its own data key, wrapped by the workspace KEK. This is the granularity crypto-shredding needs: destroying one blob's wrapped key renders that blob's bytes unrecoverable without touching the rest of the store or the hash chain ([ADR-0036](../../06-adrs/ADR-0036-right-to-erasure-vs-append-only.md)).
- **Authenticated encryption** (an AEAD construction) is used so a tampered ciphertext fails to decrypt rather than yielding garbage; this composes with — it does not replace — the content-hash verification on blobs ([blobs-and-integrity.md](./blobs-and-integrity.md)).

Rotation reuses the envelope model: rotating the KEK re-wraps the data keys, not the bulk content, so rotation is cheap and historical material remains decryptable under its recorded key reference ([secrets-and-keys.md](./secrets-and-keys.md)).

## Relationship to OS keychains via Tauri

The KEK custody story rests on the OS key store, reached only by the Rust host — never the renderer ([trust-boundary.md](./trust-boundary.md), [secrets-and-keys.md](./secrets-and-keys.md)):

- macOS Keychain, Windows Credential Manager, and the Linux Secret Service are the three back-ends, abstracted behind one host-side trait so the platforms sit behind a single seam ([secrets-and-keys.md](./secrets-and-keys.md)).
- The host retrieves the KEK at workspace-open, unwraps the data key for the operation that needs it, and zeroises the unwrapped material after use (Rust `zeroize`), consistent with "not held in memory beyond the operation" ([secrets-and-keys.md](./secrets-and-keys.md)).
- Reusing the platform's hardened, user-authenticated secret store is chosen over a bespoke key file because it avoids inventing key custody the product would then have to defend; the trade-off is a platform dependency, already accepted for secrets generally ([secrets-and-keys.md](./secrets-and-keys.md)).

## What encryption at rest does not protect

Naming the limits is part of being honest about the control:

- **It is not a defence against a compromised host process.** A running host that legitimately holds the unwrapped data key can read the cleartext; encryption at rest defends data _at rest_, not a live process. The trust boundary ([trust-boundary.md](./trust-boundary.md)) is the control there.
- **It is not a substitute for export redaction.** An authorised export still strips PII deny-by-default ([pii-and-export-redaction.md](./pii-and-export-redaction.md)); encrypting the workspace does not make it safe to ship the workspace.
- **It does not protect a workspace whose passphrase or key-store entry the attacker also holds.** Confidentiality is exactly as strong as the KEK's custody.
- **It does not change the integrity story.** Tamper detection on blobs is the content hash ([blobs-and-integrity.md](./blobs-and-integrity.md)); AEAD adds ciphertext integrity on top, but the hash remains the canonical integrity check.

## Worked example (design intent)

A workspace contains an imported board pack PDF attached to the seed `Insight Hub` application ([content-addressed-blobs.md](../../05-modules/mneme/content-addressed-blobs.md)). With encryption at rest enabled (design intent), the PDF's bytes under `objects/sha256/9f2c…` are stored as an AEAD ciphertext, encrypted under a per-blob data key wrapped by the workspace KEK in the macOS Keychain. A local attacker who copies the workspace folder from a stolen laptop holds the ciphertext but not the KEK, so the bytes are unrecoverable. On legitimate open, the host unwraps the KEK from the Keychain, decrypts the per-blob key, verifies the decrypted bytes re-hash to `9f2c…` ([blobs-and-integrity.md](./blobs-and-integrity.md)), serves the PDF, and zeroises the keys. To honour a later erasure request for that document, the host destroys the blob's wrapped key — crypto-shredding the bytes while the op log's reference and structural history stay intact ([ADR-0036](../../06-adrs/ADR-0036-right-to-erasure-vs-append-only.md)).

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V6 Stored Cryptography. _([controls-asvs.md](./controls-asvs.md))_

_Informative:_

- **NIST SP 800-57** (key management), **SP 800-38D** (AES-GCM AEAD). _(key hierarchy and authenticated encryption practice)_
- **Argon2** (RFC 9106); scrypt (RFC 7914). _(memory-hard KDFs for passphrase-derived KEKs)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                     | What it covers                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [secrets-and-keys.md](./secrets-and-keys.md)                                 | The KDF, key hierarchy, rotation, and OS key-store custody. |
| [blobs-and-integrity.md](./blobs-and-integrity.md)                           | The content-hash integrity check encryption composes with.  |
| [pii-and-export-redaction.md](./pii-and-export-redaction.md)                 | Confidentiality for sharing, the separate export path.      |
| [ADR-0036](../../06-adrs/ADR-0036-right-to-erasure-vs-append-only.md)        | Crypto-shredding as the erasure mechanism this enables.     |
| [Content-addressed blobs](../../05-modules/mneme/content-addressed-blobs.md) | The blob store the per-blob envelopes wrap.                 |
