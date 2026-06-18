# Agent-ready issue template

The contract every `ready-for-agent` issue meets. An issue earns the [`ready-for-agent`](../agents/triage-labels.md) triage label only when an agent can complete it **from the issue alone** — clear acceptance criteria, named files, exact contracts, and no unresolved design question. "Implement according to the design docs" is not an agent-ready issue; it is a design task wearing an issue's clothes.

This template is how a milestone build contract ([README](./README.md)) is decomposed into work an agent can take. Anything that requires a decision, a credential, or a judgement call is `ready-for-human`, not `ready-for-agent`.

---

## The template

Copy this into the issue body. Every heading is required; "none" is a valid answer, "unspecified" is not.

```markdown
## Outcome

The observable behaviour that must exist when this is done — one or two sentences,
phrased as what a user or caller can now do.

## Authoritative sources

The contracts this issue must satisfy, in precedence order (see docs/build-contracts/README.md):

- Accepted ADR(s): …
- Manifest/schema entries (docs/contracts/…): …
- Contract doc(s) (docs/04-contracts/…): …
- Fixtures / oracles (docs/data/…): …

## Scope

The crates, modules, and files that may change. Name them. Anything not listed is out of scope.

- e.g. crates/mneme_store/src/…, src/engines/praxis/…

## Required contract changes

Exact request/response/event/schema changes, or "none". A shape change is a versioned
event (ADR-0017), never a silent edit.

## Acceptance scenarios

Given / when / then, with concrete values from the seed data (core-v1.json / baseline.yaml).
Each scenario maps to a test.

## Tests to add

Named test files and the fixture identifiers they assert against.

## Commands proving completion

The exact commands that must pass (see "Canonical commands" below).

## Non-goals

Behaviour the agent must NOT add — the common over-reach for this area.

## Constraints

Security, dependency, performance, and boundary rules that apply
(e.g. no renderer HTTP; no new ports; renderer reaches host only via typed IPC).

## Dependencies

Blocking issues or decisions. If a design question is open, this issue is not
ready-for-agent — move it to ready-for-human with the question named.

## Evidence required in the PR

Test output, fixture diff, and the doc/contract update that accompanies the change.
```

---

## Canonical commands

One command list, referenced by every issue's "Commands proving completion" so they do not drift. CI runs the same gates ([CI-CHECKS](../02-standards/CI-CHECKS.md)).

```sh
# Everything CI runs, in one shot:
pnpm run ci            # = node:ci + host:ci

# Renderer / TypeScript (node:ci):
pnpm run design:guard
pnpm run node:lint
pnpm run node:typecheck
pnpm run node:test            # add :coverage for the ≥80% gate
pnpm run node:format:check

# Rust host + engines (host:ci):
pnpm run host:format:check
pnpm run host:lint            # clippy -D warnings
pnpm run host:check
pnpm run host:test

# Docs (when this issue touches docs/):
pnpm run docs:corpus          # regenerate the consolidated corpus
```

**Crate package name vs directory name.** Scoped Rust commands take the **package** name, which is not always the directory. The host crate lives in the `src-tauri/` directory but its package is `aideon_desktop` — so `cargo test -p aideon_desktop`. Engine crates match their directory: `cargo test -p mneme_store`, `-p praxis`, `-p chrona`, `-p metis`, `-p continuum`. Prefer the `pnpm run host:*` scripts above over raw `cargo` so the whole workspace is covered consistently; use `-p <package>` only to scope a single crate while iterating.

---

## The bar, restated

Before applying `ready-for-agent`, check all of:

- [ ] Every template heading is filled (no "unspecified").
- [ ] The authoritative sources exist and are named with paths.
- [ ] Acceptance scenarios use concrete seed values and each maps to a named test.
- [ ] No open design question remains in scope (else `ready-for-human`).
- [ ] The Definition of Done in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) is satisfiable from the issue.

---

## Related documents

| Document                                              | What it covers                                          |
| ----------------------------------------------------- | ------------------------------------------------------- |
| [README.md](./README.md)                              | Contract precedence and the build-contract layer.       |
| [golden-journey.md](./golden-journey.md)              | The end-to-end path issues are slices of.               |
| [agents/triage-labels.md](../agents/triage-labels.md) | The `ready-for-agent` vs `ready-for-human` triage rule. |
| [CI-CHECKS.md](../02-standards/CI-CHECKS.md)          | The CI gates the canonical commands run.                |
