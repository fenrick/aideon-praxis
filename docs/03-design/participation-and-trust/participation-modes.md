# Participation Modes

The four ways a role enters Aideon Desktop. Each mode carries a different level of authority and a different expectation
of structure, but all four read and write the same shared [twin](../../../CONTEXT.md) through the same
[shell](../the-shell.md). This document defines the modes and maps each to a concrete action on the seed dataset.

The modes are not separate products and not separate permission tiers bolted on afterwards. They are the product's
answer to a single problem: a model authored only by experts stays accurate in pockets and stale everywhere else. Each
mode lowers the cost of useful participation for a different role without lowering the honesty obligations the product
owes that role.

---

## The four modes

| Mode          | Who                             | What they need                                                                                                                                 | Structure                                                                                        |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Expert**    | Architects, analysts, modellers | Full modelling, scenario management, artefact-family authoring, and deep inspection — structural editing of entities, relationships, and slots | Open authoring within the metamodel; the widest authority                                        |
| **Guided**    | Business contributors, SMEs     | Bounded contribution flows that ask the right questions in plain language, with no model literacy required                                     | A guided flow, framed discovery→definition→development→delivery (Design Council, Double Diamond) |
| **Steward**   | Review owners, data owners      | Queues, comparisons, approvals, and remediation paths                                                                                          | Structured review, not open editing — work arrives as tasks with a clear decision                |
| **Read-only** | Executives, decision-makers     | Concise, trustworthy outputs, legible without specialist training and defensible under questioning                                             | Reading and drill-down only; no authoring                                                        |

This table reuses the consolidated wording of [ARTEFACTS-AND-FAMILIES.md §7](../ARTEFACTS-AND-FAMILIES.md). The rest of
this document expands each mode and walks a seed action through it.

### Expert

Expert mode is the full modelling surface. An architect, analyst, or modeller authors entity and relationship
[types](../../../CONTEXT.md), edits [slots](../../../CONTEXT.md), manages [scenarios](../../../CONTEXT.md), composes
[Change Events](../../../CONTEXT.md) and [Plan Events](../../../CONTEXT.md), authors [Artefact](../../../CONTEXT.md)
families, and inspects derivation and [integrity](../../02-standards/DOCUMENTATION-STANDARD.md) down to its five
dimensions. The mode assumes model literacy and gives the widest authority; it does not assume the user wants ceremony,
so authoring stays fast (see [behaviour-under-pressure.md](./behaviour-under-pressure.md)). Edits remain task-based and
reviewable rather than free-form data entry ([ux/editing-flow.md](../ux/editing-flow.md)).

### Guided

Guided mode is for business contributors and subject-matter experts who hold knowledge the model needs but do not read
the metamodel. It replaces the blank canvas with a bounded flow that asks specific questions in plain language and
writes the answers as ordinary [Asserted](../../../CONTEXT.md) facts behind the scenes. No model literacy is required to
contribute, and a contributor cannot reach structural authoring from inside a guided flow — the bound is the point.

The flow follows the Design Council **Double Diamond** (Design Council, Double Diamond) — discovery, definition,
development, delivery — so a contributor moves from open questions ("which applications support this capability?") to a
defined contribution, then to entered detail, then to a confirmed result, without ever being asked to think in entities
and relationships. The framing keeps the divergent and convergent stages legible to a non-specialist while the product
converts the result into model content.

### Steward

Steward mode is for review owners and data owners. Their work arrives as a **queue** of structured tasks — a freshness
task, an import exception, a comparison to confirm, a suggestion to accept or reject — and each task carries the
decision and its consequence, not an open editor. Stewardship is **structured review, not open editing**: a steward
confirms, rejects, or remands work, and the product records the decision as a new operation; it does not hand the
steward a free canvas.

Steward mode depends on first-class approvals. The approval workflow, the role that may steward a given class of
content, and the audit of every decision are governance concerns owned by [Themis](../../05-modules/themis/README.md) —
the planned governance engine for identity, RBAC, approvals, retention, and audit. Themis is **design intent**: no
`themis` crate exists yet, and the desktop single-user default has trivial policy (one principal, full authority).
Steward mode becomes load-bearing in hosted mode, where real RBAC and approvals apply. Until then, the queue and review
surfaces exist; the policy decisions behind them are documented as the boundary Themis will occupy.

### Read-only

Read-only mode is for executives and decision-makers. They read concise outputs — a scorecard, a strategy-to-execution
view, a portfolio summary — that must be legible without specialist training and **defensible under questioning**. The
mode authors nothing. Its obligation is the inverse of Expert's: not power, but legibility under scrutiny.

A read-only output is not a simplified output. It carries the same honest-state signals as a dense expert surface (see
[trust-cues.md](./trust-cues.md)) and supports drill-down into rationale when a claim is challenged, so a decision-maker
can answer "how solid is this?" in the room rather than promising to check later. Read-only legibility is also an
accessibility obligation — the output meets the conformance target without requiring the reader to operate the model
(WCAG 2.2; see [ux/accessibility-and-performance.md](../ux/accessibility-and-performance.md)).

---

## Worked examples

The examples use the seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)) and real identifiers. Each maps one
mode to one action.

**Expert — author a Plan Event on Insight Hub.** An architect opens the application `n:application:insight-hub` (Insight
Hub, `disposition: Invest`), which `realises` the capability `n:capability:customer-insight` (Customer Insight) via
`e:insight-realises-insight`. The architect authors a Plan Event in a scenario to model a disposition change, sets its
`effective_at` as the [valid-from](../../../CONTEXT.md) of the resulting facts, and inspects the derived
[effective graph](../../../CONTEXT.md) before committing. The full metamodel and scenario controls are available; the
edit is a task with a clear consequence, not a cell change.

**Guided — confirm what Insight Hub supports.** A subject-matter expert in the Customer Insight team enters a guided
flow that asks, in plain language, "which applications support Customer Insight, and how confident are you?" They
confirm Insight Hub and add a note. The product writes an Asserted fact corresponding to the `realises` relationship —
the contributor never sees the type `realises` or the entity id `n:application:insight-hub`. The flow's
discovery→delivery shape keeps the question answerable without model literacy.

**Steward — review a freshness task on Insight Hub.** A data owner for the application portfolio finds a freshness task
in their queue: the facts behind `n:application:insight-hub` are flagged
[Stale](../../02-standards/DOCUMENTATION-STANDARD.md) against the freshness policy for `Application`. The steward
compares the current value to the source, then confirms or remands the task. The decision writes a new operation and
clears the result state; the steward never opens a free editor. In hosted mode the task and its confirmation resolve
through a Themis approval ([approvals and workflow](../../05-modules/themis/approvals-and-workflow.md)).

**Read-only — read a Customer Insight scorecard.** An executive opens a scorecard for the capability
`n:capability:customer-insight`. It shows the supporting applications, their disposition, and the
[confidence](../../02-standards/DOCUMENTATION-STANDARD.md) on the `serves` relationship `e:capability-serves-discover`
(0.95, High). Because the FY26 plan event `n:plan-event:fy26-modernization` (FY26 Insight Modernization, confidence 0.7,
Medium) bears on this capability, the scorecard surfaces that the view depends on a plan-layer claim, and the executive
can drill into the rationale when asked. Nothing on the scorecard is editable; every figure traces to its evidence.

---

## The trade-off

Four modes over one model means each mode is a deliberate restriction of the others, not a separate build. Guided
contributors cannot reach structural authoring, and stewards cannot freely edit — those bounds are the source of the
modes' value, and removing them to "let people just fix it" would collapse the modes back into one expert surface that
most roles cannot use safely. The cost is that some legitimate work crosses a mode boundary (a steward who spots a
structural error must escalate to an expert rather than correct it inline); the product accepts that friction because
the alternative is unbounded edits from roles without the context to make them.

## References & standards

_Informative:_

- Design Council — **Double Diamond**. The discovery→definition→development→delivery framing for Guided contribution
  flows.
- WCAG 2.2 (W3C). The read-only legibility and accessibility target for executive outputs.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                               | What it covers                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [README.md](./README.md)                                                                               | The participation-and-trust operating model and how the three files relate.                    |
| [trust-cues.md](./trust-cues.md)                                                                       | The honest-state cues every mode relies on.                                                    |
| [behaviour-under-pressure.md](./behaviour-under-pressure.md)                                           | How each mode's surface holds up under density and scrutiny.                                   |
| [../../05-modules/themis/README.md](../../05-modules/themis/README.md)                                 | Themis (planned) — identity, RBAC, approvals, and the governance behind Steward mode.          |
| [../../05-modules/themis/approvals-and-workflow.md](../../05-modules/themis/approvals-and-workflow.md) | The approval workflow underpinning stewardship.                                                |
| [ux/editing-flow.md](../ux/editing-flow.md)                                                            | Why edits are task-based rather than generic data entry.                                       |
| [ux/workspace-family.md](../ux/workspace-family.md)                                                    | The workspaces (modelling studio, review and contribution, executive briefing) the modes meet. |
| [ARTEFACTS-AND-FAMILIES.md](../ARTEFACTS-AND-FAMILIES.md)                                              | §7 — the consolidated participation-modes and trust-cues tables.                               |
