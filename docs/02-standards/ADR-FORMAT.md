# ADR Format

Architecture Decision Records capture significant, lasting decisions about architecture, structure, contracts,
persistence identity, and operational posture. They record the context, the decision, and the downstream consequences.

Every ADR that affects architecture, contracts, workflow semantics, persistence identities, the workspace format, module
boundaries, or security posture must be reviewed against [`DESIGN-GOVERNANCE.md`](./DESIGN-GOVERNANCE.md).

## Naming

`ADR-XXXX-short-slug.md` — zero-padded sequence number + scannable kebab-case slug.

## Header block

```text
# ADR-XXXX: Title

- Status: Proposed | Accepted | Superseded
- Date: YYYY-MM-DD
- Supersedes: (optional) ADR-YYYY
- Superseded-By: (optional)
```

## Required sections

Every ADR contains, at minimum:

- `Context`
- `Governance Framing`
- `Decision`
- `Consequences`
- `Follow-ups / Open Questions`

The **Governance Framing** section must state:

- decision type (invariant / stable seam / provisional / deferred)
- known future pressure
- what stays stable
- what is provisional
- what is deferred
- why the decision is hard or easy to reverse

## Review discipline

> If an ADR makes a durable decision without classifying the seam or naming the future pressure, it is not finished.

Status changes are PR-reviewed, never edited ad hoc on `main`. Track status on the board in
[`../06-adrs/ADRS.md`](../06-adrs/ADRS.md).
