# Artefacts and Viewpoints

Artefacts are the primary UX product of Aideon Desktop. Every view, catalogue, matrix, map, report, and page is executed against an explicit time and scenario context, declares its own purpose and quality, and carries the full provenance of what it shows. This document is the intellectual core of that design.

---

## Contents

1. [What an Artefact Is](#1-what-an-artefact-is)
2. [The Artefact Contract](#2-the-artefact-contract)
3. [Asserted, Inferred, and Generated Content](#3-asserted-inferred-and-generated-content)
4. [Viewpoint Levels and Families](#4-viewpoint-levels-and-families)
5. [Explanation Surfaces](#5-explanation-surfaces)
6. [Intelligence and Automation](#6-intelligence-and-automation)
7. [Participation Modes and Trust Cues](#7-participation-modes-and-trust-cues)
8. [Host Surfaces](#8-host-surfaces)
9. [Shell and Interaction Spine](#9-shell-and-interaction-spine)

---

## 1. What an Artefact Is

An artefact is a named, executable, self-describing product of the model. It is not a static document. It is not a manually drawn diagram. It is not a data export. It is a declared view over structured model content, executed at a specific time and scenario context, whose meaning is bounded, explained, and traceable.

Artefacts take several forms:

| Form          | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| **View**      | A focused graph or diagram over a bounded slice of the model              |
| **Catalogue** | A structured inventory of model objects filtered by type, layer, or scope |
| **Matrix**    | A relationship or comparison grid between two object populations          |
| **Map**       | A spatial or topological rendering of model structure                     |
| **Report**    | A composed analytical output with narrative, tables, and signals          |
| **Page**      | A packaged briefing surface for a specific audience and decision context  |

All six forms share the same contract. The form changes the rendering shape. The obligations do not change.

Praxis owns artefact identity, execution, and the viewpoint families that give artefacts their starting shape. Mneme owns the underlying storage that artefact execution reads. The renderer is a thin, trusted display surface over typed IPC — it holds no traversal logic, no analytics, and no artefact semantics.

---

## 2. The Artefact Contract

Every artefact declares its contract. The contract is not optional metadata appended after the fact. It is the minimum information required for a result to be trustworthy. An artefact that cannot answer for itself will eventually be trusted by habit rather than by understanding.

### Contract Fields

| Field                      | What It Declares                                                              |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Purpose**                | One sentence: what this artefact is for                                       |
| **Question answered**      | The specific question this artefact is designed to address                    |
| **Audience**               | The role or context this artefact is built to serve                           |
| **Time context**           | The valid time, asserted time, layer, and scenario under which it is executed |
| **Inclusion rules**        | What is in scope and what is explicitly excluded                              |
| **Confidence**             | An honest assessment of result quality, completeness, and reliability         |
| **Evidence**               | Where the content comes from — source objects, imports, inputs                |
| **Content classification** | Whether each element is ASSERTED, INFERRED, or GENERATED                      |
| **Staleness**              | Whether any element is stale, partial, or awaiting review                     |
| **Next action**            | What the user can do from this result                                         |

### The Four Questions

Any artefact surface must be able to answer four questions. If one has no good answer, the artefact is not complete.

1. **What am I looking at?** — Purpose and scope
2. **Why does it look this way?** — Evidence and reasoning
3. **How solid is it?** — Confidence, staleness, and classification
4. **What can I do next?** — Actionable next steps

### Time and Scenario Context

Every artefact carries an explicit execution context. This context is not implicit or assumed from the current session state. It is declared as part of the artefact's identity and is visible on every surface that renders the artefact.

The execution context comprises:

- **Valid time** — the modelled moment in reality the artefact describes
- **Asserted time** — the point at which the facts were recorded
- **Layer** — Plan vs Actual precedence rules
- **Scenario** — the baseline or named what-if overlay applied at execution

Changing any of these dimensions produces a materially different artefact. Two copies of the same artefact template executed at different contexts are not the same result.

See [../04-contracts/CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) for the full temporal and scenario contract.

---

## 3. Asserted, Inferred, and Generated Content

Content classification is part of the meaning of every result. These are not minor labels. They change whether a result can be acted upon as fact, reviewed as a recommendation, or treated as a working hypothesis.

### Definitions

**ASSERTED** content is content that a human has explicitly stated, entered, accepted, or approved. It is the controlled truth of the model. It carries the highest trust level. It cannot be silently overwritten by automation.

**INFERRED** content is content that the system has derived from asserted facts through declared rules, structural relationships, or analytical logic. The derivation path is traceable. Inferred content is automatically reconsidered when the asserted facts it depends on change. It is not a human assertion, but it is grounded in one.

**GENERATED** content is content that an LLM or ML process has produced — summaries, suggested mappings, narrative commentary, anomaly annotations, or draft text. It is a suggestion until a human accepts it. Accepted generated content becomes asserted. Unaccepted generated content remains clearly labelled as generated. The system never silently promotes generated content into the asserted record.

### Display Rules

| Classification  | Rendering cue                                           | Trust level           |
| --------------- | ------------------------------------------------------- | --------------------- |
| ASSERTED        | Standard display, no qualifier                          | Authoritative         |
| INFERRED        | Qualifier label; derivation traceable via inspector     | Derived, reviewable   |
| GENERATED       | Distinct visual treatment; requires explicit acceptance | Suggestion only       |
| STALE           | Staleness indicator; underlying fact has changed        | Needs re-evaluation   |
| PARTIAL         | Scope caveat visible inline                             | Bounded, not complete |
| AWAITING REVIEW | Queue indicator; not yet confirmed                      | Pending               |

A tidy surface that hides these states is still misleading. Completeness and freshness are part of what the artefact says.

---

## 4. Viewpoint Levels and Families

### Levels

Aideon respects levels of abstraction. Different audiences are not simply asking for more or less detail — they are asking different questions. Flattening all abstraction into one surface forces every user to process material that is not relevant to their question.

| Level                    | Scope                                      | Typical question                                          |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------- |
| **Conceptual**           | Business meaning and scope                 | What is this organisation trying to do?                   |
| **Logical**              | Design-level structure and relationship    | How are the parts designed to work together?              |
| **Implementation-aware** | Concrete systems, components, and delivery | What are the specific systems and how are they connected? |

Users move between levels deliberately. A strategy discussion does not need the implementation detail surface. An impact analysis should not be forced to disguise itself as a conceptual overview.

### Families

Artefact families are named groupings that correspond to recognisable questions. They give users a credible starting shape instead of a blank canvas. The families are organised by the kind of question they answer, not by the type of diagram they produce.

| Family                        | Question it answers                                                      |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Business motivation**       | Why does this organisation exist and what drives its choices?            |
| **Value creation**            | How does the organisation create and deliver value?                      |
| **Business concept**          | What are the fundamental business entities and their relationships?      |
| **Service portfolio**         | What services does this organisation offer, and to whom?                 |
| **Service concept**           | How is a specific service designed to work?                              |
| **Service blueprint**         | What happens operationally when a service is delivered?                  |
| **Operating model**           | How are people, process, and technology organised to do the work?        |
| **Information dissemination** | What information is created, consumed, and shared — and by whom?         |
| **Application interaction**   | How do applications exchange data and coordinate behaviour?              |
| **Application portfolio**     | What applications exist, what do they support, and how healthy are they? |
| **Technology portfolio**      | What technology underpins the applications and operations?               |

Families are reusable, comparable, and explainable. The product prefers them over one-off canvases that only make sense to the person who built them. A user who recognises a family name already knows what question they are answering before they open the artefact.

---

## 5. Explanation Surfaces

Explanation is a first-class obligation, not optional garnish. The product does not dump model content onto the screen and expect users to do the interpretive work alone.

### Explanation Has a Place

Explanation surfaces appear in three locations depending on the context:

- **Inspector** — the primary explanation surface. For any selected object, relationship, or artefact element, the inspector shows what it is, why it matters, what its quality signals are, and what actions are valid. If the inspector is a property dump, it is not doing its job.
- **Inline in the artefact** — for stale indicators, confidence caveats, partial scope notes, and content classification labels. Inline explanation is not a tooltip afterthought. It is part of the artefact's visual contract.
- **Companion or packaged view** — for narrative summaries, briefing pages, and handover outputs where the explanation is the product rather than an annotation on the product.

### Drill-Down Is Structural

A user should be able to move from a summary result to the underlying object, from the object to its relationships, from the relationship to its evidence, and from the evidence to a valid action — without losing orientation and without changing mental models. If the user must break the conceptual frame to follow the evidence, the explanation surface is incomplete.

---

## 6. Intelligence and Automation

### The Governing Rule

The model remains the authority. The assistant and the analytical engine are tools. Intelligence assists — it does not take authority.

This rule is not a hedging caveat. It is the structural basis on which users can trust the product. If automation silently rewrites accepted business truth, the product will appear smarter right up until the day people stop trusting it.

### LLM Assistance

LLMs help users understand and work with the model. Useful modes of assistance include:

- **Natural-language entry** — lower the cost of reaching the right artefact, object, or action
- **Summarisation** — turn dense selections into readable briefings and handovers
- **Mapping assistance** — provide fuzzy-match suggestions during import and review flows
- **Guided authoring** — reduce blank-page friction for new artefacts and objects
- **Comparison and narrative** — explain scenario differences in language as well as structure

LLM output is always labelled GENERATED. It remains a suggestion until the user explicitly accepts it. The assistant explains using the model and artefact context. It does not improvise past the evidence.

### LLM Guardrails

| Guardrail                                            | Behaviour                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| Suggested writes are reviewable                      | No LLM action lands in the model without explicit user acceptance    |
| Generated text stays labelled                        | GENERATED label is not removed until the user accepts                |
| Asserted/inferred/generated distinction is preserved | The system never conflates a generated suggestion with accepted fact |
| Context-grounded explanation                         | The assistant uses model context, not free improvisation             |
| No authority bypass                                  | The assistant cannot approve its own suggestions                     |

### ML Signals

ML has a different job from the LLM assistant. It finds patterns at scale. It does not converse.

Useful ML outputs include:

- Anomaly detection in model quality and relationship patterns
- Stale or likely incorrect data detection
- Clustering and duplication detection across applications, services, or capabilities
- Risk scoring across portfolios
- Impact prediction for likely change paths
- Trend analysis over temporal model snapshots

ML output arrives as **signals, rankings, warnings, and suggested review tasks**. It does not quietly rewrite accepted truth. Signals are prompts for human judgement, not replacements for it.

Metis is the analytical engine for ML signal computation. The product-side contract is that signals surface as reviewable items — not as ambient background cleverness that has already decided something.

### Automation and Workflow

Automation keeps the model from going stale without requiring manual upkeep at every point. It operates under explicit rules and creates work rather than silently changing truth.

Automation may:

- Create freshness reminders and stewardship tasks
- Trigger review requests and approval flows
- Raise import exceptions and impact-triggered notifications
- Update accepted-work status on running operations

Automation may not:

- Silently rewrite accepted business facts
- Promote generated content to asserted without user confirmation
- Execute consequential operations without explicit accepted-work status

Imports, large comparisons, recalculations, scenario promotions, and export generation run as explicit accepted-work operations with visible status — not as vague spinners. The user knows what the system is doing and whether it has finished.

---

## 7. Participation Modes and Trust Cues

### Participation Modes

Aideon cannot be built only for architects. If the product only works for experts, it remains accurate in pockets and stale everywhere else. Four participation modes describe how different roles enter the same product with different levels of power and different expectations of structure.

| Mode          | Who                             | What they need                                                                                                      |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Expert**    | Architects, analysts, modellers | Full modelling and artefact control — structural editing, scenario management, viewpoint authoring, deep inspection |
| **Guided**    | Business contributors, SMEs     | Bounded contribution flows that ask the right questions in plain language, without requiring model literacy         |
| **Steward**   | Review owners, data owners      | Queues, comparisons, approvals, and remediation paths — work as structured review, not open editing                 |
| **Read-only** | Executives, decision-makers     | Concise, trustworthy outputs — legible without specialist training, defensible under questioning                    |

These are not four separate products. They are four entry points into the same product. The underlying model is shared. The surface adapts to the level of authority and the kind of work required.

### Trust Cues

Trust should not depend on familiarity with the team that produced an artefact. The product carries the burden of demonstrating trustworthiness directly, in every surface.

At any moment, a user should be able to tell:

- Which time context and scenario are active
- Whether a result is fresh or stale
- Where the content came from
- Whether content is asserted, inferred, or generated
- Whether background work is still running
- Whether the result is partial or awaiting review

These cues apply equally to dense expert surfaces and to executive-facing outputs. A clean surface that hides uncertainty is not a better user experience. It is a misleading one.

### Behaviour Under Pressure

The product should remain:

- **Calm under density** — expert use should feel fast without becoming cryptic
- **Explicit under ambiguity** — uncertainty surfaces honestly, not with vague labels
- **Clear under scrutiny** — consequential actions feel deliberate, not slippery
- **Consistent across surfaces** — structural inconsistency erodes trust faster than most teams admit

Non-specialists should be able to read outputs without specialist training. That is not a simplification constraint — it is a quality constraint on the explanation.

---

## 8. Host Surfaces

Three product surfaces sit close to the shell and cut across all modules. They shape whether the product feels disciplined or improvised.

### Workspace Home

Workspace home is the product's workbench, not its lobby.

It helps users resume work, spot active scenarios, see unfinished accepted work, find recent or pinned artefacts, and enter the right workspace without ceremony.

It favours:

- Recent work that is still worth returning to
- Active scenarios, review queues, and accepted work that need attention
- Saved viewpoints, templates, and common entry points
- Enough context to explain why an item matters before the user opens it

It does not become a dashboard graveyard, a dumping ground for every card somebody wants on the front page, or a second navigation system competing with the shell.

Ownership: host shell for composition and routing; Praxis for artefact and template identity; the automation layer for unfinished work, reminders, and queue-oriented entry points.

### Executive Briefing

Executive briefing is where the product has to survive a difficult room.

It turns live model content into decision-ready views without losing context, explanation, or honesty about scope. A scorecard that looks polished but cannot explain itself is worse than a rough view that can.

It supports:

- Concise scorecards, strategy-to-execution views, and portfolio summaries
- Visible scope, time context, scenario, freshness, and caveat treatment
- Drill-down into rationale when a claim is challenged
- Export paths that preserve the selected context rather than quietly changing it

It does not become a slide factory disconnected from the model, a performance dashboard that mistakes movement for meaning, or a dead-end presentation surface with no route back to evidence.

Ownership: host shell for briefing workspace entry and packaging flow; Praxis for viewpoint families, report and page artefacts, and narrative structure; Metis for rankings, warnings, score inputs, and analytical payloads.

### Administration and Controls

Administration and controls are dull in the good sense.

This is where the product exposes access, templates, integrations, automation rules, audit, import and export history, and recovery affordances. It does not need theatre. It needs scope clarity and predictable consequences.

It separates:

- Personal settings
- Workspace settings
- Organisation controls
- Support and recovery surfaces

For each control it makes clear:

- What can be changed here
- Who the change affects
- Whether the change is immediate, reviewable, or workflow-backed
- Where history, audit, and recovery state can be inspected

Ownership: host shell for settings information architecture; the automation layer for schedules, triggers, retry surfaces, and automation history; Mneme for audit, replay, import/export history, and recovery detail.

### Shared Rules Across All Three Surfaces

All three host surfaces preserve the same product rules as the rest of Aideon:

- Context stays visible when it changes meaning
- Accepted work and status use the shared model
- Explanation and provenance remain close enough to support a decision
- Dense information stays calm and structured
- Destructive or high-consequence actions feel deliberate

The main failure mode is softness — vague cards, vague counts, vague labels, and vague ownership, because these surfaces sit above the modules. That is precisely why they require explicit rules.

---

## 9. Shell and Interaction Spine

### Shared Shell

The shell has four permanent jobs:

1. Keep orientation stable
2. Keep context visible
3. Keep the work surface dominant
4. Make action available without forcing users to hunt for it

**Navigation** is a map of active workspaces, saved artefacts, recent work, and relevant entry points — not a sitemap that somebody forgot to prune.

**Toolbar** carries context and global action: workspace identity, time context, scenario, search, command entry, status, and top-level controls. Local actions that only matter inside one surface do not belong in the toolbar.

**Content surface** is where the product earns its keep. The active question should stay obvious. It is not buried under ornamental chrome, side quests, or floating utilities.

**Inspector** is where reading turns into action. It explains the selected thing, shows why it matters, exposes provenance and quality signals, and makes the valid next actions clear. A property dump is not an inspector.

### Interaction Spine

**Selection is global inside a workspace.** Once the user selects something meaningful, the inspector updates, available actions sharpen, and related detail becomes easier to reach. This keeps the workspace from feeling like a collection of unrelated panes.

**Drill-down is normal.** Summary view → underlying object → relationships → evidence → valid action. If the user must change mental models to follow that path, the flow is wrong.

**Edits are task-based.** Aideon does not drift into generic data-entry behaviour. Changes are framed as specific tasks with clear meaning, clear consequence, and clear review paths.

**Long-running work is explicit.** Imports, recalculations, scenario promotions, large comparisons, and export generation appear as accepted-work operations with status. Not spinners. Not silence.

**Bounded results are honest.** If the product is sampling, truncating, filtering, or deferring part of a result, that is visible in the surface itself.

### Workspace Family

| Workspace                       | Purpose                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Workspace home**              | Get users back into useful work quickly — recency, relevance, active scenarios, unfinished work                          |
| **Modelling studio**            | Expert surface — structured editing, exploration, scenario awareness, explainability, artefact authoring                 |
| **Viewpoint library**           | Start from known-good artefacts organised by question, audience, and level of abstraction                                |
| **Scenario studio**             | Explicit baseline, target, and alternative futures — create, compare, explain, review, promote                           |
| **Review and contribution**     | Bounded workspace for SMEs and stewards — useful work in business language, without requiring full model literacy        |
| **Executive briefing**          | Legible in meetings, defensible under questioning, usable in packaged output                                             |
| **Import and mapping**          | Reviewable, reversible, explicit about uncertainty — quiet ingestion is how weak source material becomes false certainty |
| **Administration and controls** | Access, templates, integration controls, automation rules, audit — plain and explicit                                    |

---

## Related Documents

| Document                                                                             | What it covers                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [DESIGN.md](DESIGN.md)                                                               | Cross-module design axioms and structural invariants                      |
| [UX-DESIGN.md](UX-DESIGN.md)                                                         | UX contract — component patterns, interaction model, renderer obligations |
| [DESKTOP-FIRST-WORKSPACE.md](DESKTOP-FIRST-WORKSPACE.md)                             | Desktop-first workspace and shell design                                  |
| [../04-contracts/CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) | Temporal and scenario context contracts; IPC schema definitions           |
| [../05-modules/praxis/README.md](../05-modules/praxis/README.md)                     | Praxis — meaning, artefact execution, viewpoint families, metamodel       |
| [../05-modules/metis/README.md](../05-modules/metis/README.md)                       | Metis — analytical engine, ML signals, scoring                            |
| [../05-modules/chrona/README.md](../05-modules/chrona/README.md)                     | Chrona — temporal query, scenario management                              |
| [../05-modules/mneme/README.md](../05-modules/mneme/README.md)                       | Mneme — storage, op log, audit, replay                                    |
