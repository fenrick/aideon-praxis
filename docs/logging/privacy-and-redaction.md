# 10. Privacy and redaction

What must never be logged, how to reference a sensitive identifier safely, and the review process that governs any
exception. Part of the [logging standard](./README.md). This section is mandatory.

---

## 10.1 What must not be logged

Do not log:

- **secrets** — keys, tokens, passwords, seed phrases;
- **personal data** — unless there is a written, reviewed exception ([§10.3](#103-the-redaction-review-process));
- **raw user content** by default — model content, document text, twin slot values a user typed.

This applies to telemetry as well as logs: metrics and spans **must not** carry PII
([correlation and tracing §11.2](./correlation-and-tracing.md#112-metrics)).

## 10.2 Referencing a sensitive identifier

When a sensitive identifier must be referenced for diagnosis:

- hash it or truncate it;
- name the field for what it is (`user_id_hash`, `token_suffix`, `resource.id` after hashing);
- **redaction must occur before the log line is written** — never rely on the collector to scrub it
  ([where logs go](./where-logs-go.md)). The local NDJSON file is itself a place PII must not land.

URLs are a common leak: do not log URLs with embedded tokens or PII-bearing query parameters
([event catalogue §6.6](./event-catalogue.md#66-network-and-external-dependencies)).

## 10.3 The redaction-review process

Any field that could carry personal data — and every proposed exception to §10.1 — passes a redaction review before it
ships:

1. **Propose in writing.** The change that introduces the field states what the field contains, why it is needed for
   diagnosis, and the redaction or hashing applied. A field with no stated need does not ship.
2. **Classify.** Decide whether the value is a secret (never logged), personal data (logged only under a recorded
   exception), or non-identifying. When in doubt, treat it as personal data.
3. **Review and record.** A reviewer with security responsibility approves the field and its redaction. The exception is
   recorded — what, why, the redaction, the approver, the date — so it is auditable and revisitable. This follows the
   corpus security posture ([SECURITY.md](../02-standards/SECURITY.md); STRIDE/ASVS,
   [ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)).
4. **Verify.** A test asserts the field is redacted as approved on the written line
   ([testing and quality gates](./testing-and-quality-gates.md)). Redaction is part of the release gate, not a
   code-review hope.

The standing default — no PII, no secrets, no raw content — needs no exception; only a departure from it does, and only
through this process.

---

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — logging and error-handling verification controls
  ([standards register](../02-standards/STANDARDS-REGISTER.md), Security).
- Microsoft — **STRIDE** — the threat frame for the trust boundary
  ([ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

## Related documents

| Document                                                       | What it covers                                       |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [SECURITY.md](../02-standards/SECURITY.md)                     | The corpus security controls the review aligns to.   |
| [where-logs-go.md](./where-logs-go.md)                         | Why the local file and collector must never see PII. |
| [testing-and-quality-gates.md](./testing-and-quality-gates.md) | The test that verifies redaction.                    |
