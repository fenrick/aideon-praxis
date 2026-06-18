# HIG: Shell and Navigation

How the one shared shell frames workspaces, navigation, search, settings, the viewpoint, and workflow status. This page turns the shell design into concrete rules for the product frame users inhabit while they work. Apply it when designing or reviewing the workspace shell, module entry points, navigation, search, settings, or status surfaces.

It does not decide backend status semantics, workflow identities, or authorisation — those belong to the runtime, architecture, and contracts. This page governs how that information appears.

---

## The principle

The shell is the stable frame of the product. In analytical software that matters: users stay inside the frame for long sessions and learn it by repetition, so a shell that shifts structure from module to module taxes them every time they move. Aideon uses **one shared shell** with four stable regions — navigation, toolbar, content, inspector ([the-shell.md](../the-shell.md)) — realised by the shell blocks ([design-system/blocks.md](../design-system/blocks.md)).

## The shell frame

Navigation establishes where the user is. The toolbar carries actions, workspace switching, and shared context. The content area belongs to the active work surface and is dominant. The inspector handles contextual detail, editing, and explanation. These regions stay stable enough that a user does not relearn the frame while switching tasks. Workspaces render _inside_ this shell rather than importing their own chrome; a module needing more control negotiates a shell extension or a shared pattern, it does not abandon the shell ([surfaces.md](../design-system/surfaces.md)).

## Information architecture

Top-level navigation reflects user goals and stable work categories — finding, analysing, modelling, presenting, reviewing, configuring — not the internal module partition. Users should not have to infer how the engineering org is split. **Engines are never a navigation axis.** A user does not navigate to "Praxis" or "Metis"; licensing controls which capabilities and surfaces are available, but that is invisible in primary navigation — engine/capability status lives in administration, diagnostics, About, or a quiet capability-status surface, never in the rail. The rule the renderer enforces: _engines contribute typed capabilities and widgets; the platform owns surfaces, navigation, and chrome_ ([../../frontend/shell.md](../../frontend/shell.md)). Critical destinations **must not** depend on hover: hover may enrich the desktop, but it is the wrong place to hide structural navigation or meaning-changing context.

### Surfaces and widgets are different levels

A **surface** is a platform-owned, navigable **work destination**; a **widget** is a content component rendered _within_ a surface ([../ux/workspace-family.md](../ux/workspace-family.md)). Navigation moves between surfaces; composition happens with widgets inside a surface. The content region renders the **active surface instance** (its composition and layout), not one undifferentiated workspace-wide widget canvas. Not every surface is a user-editable dashboard — composability is per-surface: extensive in the modelling studio, bounded in the scenario studio, fixed in workspace home, the artefact library, review, briefing, import, and administration.

### Primary and secondary destinations

Navigation has two levels:

- **Primary destinations** — the eight platform-owned, goal-oriented surfaces: workspace home, modelling studio, scenario studio, artefact library, review and contribution, executive briefing, import and mapping, administration and controls. Administration may sit in a separated utility section so it does not compete with everyday work destinations, while remaining a full surface.
- **Secondary destinations** — nested or contextual destinations _within_ a surface: scenarios, saved modelling structures, artefact families and saved artefacts, review queues, briefings, import runs, and pinned/recent destinations.

The destination hierarchy is always **goal destination → workspace resource → saved or recent instance** (e.g. select _Scenario studio_, then a specific scenario; or _Artefact library_, then "Application Portfolio Health"). The rail's resource section is named **Workspace structure** — _not_ "project tree": "project" has no single canonical meaning in this product (it could mean the workspace, a programme, a Plan Event, or a saved document), so renderer terminology must not invent a second product model. Its contents are the domain concepts that are actually defined: scenarios, Plan Events / roadmaps where supported, saved structures, artefacts, and review work.

Recommended rail order (labels are testable; the hierarchy is fixed):

```text
Workspace header / switcher
Primary work — Home · Model · Scenarios · Artefacts · Review · Briefings · Import
Workspace structure — scenarios · saved structures · artefacts / roadmaps / review queues
Pinned
Recent
Administration
```

### Availability by capability, not by label

The rail shows only the destinations the current product capability set enables, so production navigation never leads a user to a non-functional surface: M0 workspace/recovery home; M1 modelling studio; M2 scenario studio; M3 artefact library + executable artefact destinations; M4 import and mapping; M5 executive briefing and publishing; M6 governed review and administration. Surface shells may appear earlier for testing, but licensing and build capability decide availability **behind the scenes** — they do not become labels in the navigation.

## Search

Global and local search do different jobs and feel different. Global search finds objects or destinations across the workspace; local search filters or narrows the current result set ([Lexis](../../05-modules/lexis/README.md), planned, owns search and discovery — bounded and viewpoint-aware). Blurring the two leaves users unsure whether they are moving through the system or only filtering the current view. Search results tell the user what kind of object they are looking at, why it matched, and what context they will land in.

## Time, scenario, and the viewpoint

Time and scenario controls stay visible in the main workspace flow because they change meaning. The full **viewpoint** — as-of valid time, as-of asserted time, layer or layer policy, scenario, and scope — is the frame through which the twin is resolved ([CONTEXT.md](../../../CONTEXT.md)); changing it changes what the surface means and what any export or generated output represents. Because every server read is keyed by the full viewpoint ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)), the shell keeps the active viewpoint visible so the user can always explain which version of the twin they are looking at ([trust-and-honesty.md](../trust-and-honesty.md)).

A surface owns a **viewpoint policy**, not a hard default that overrides the shell on every move. **Moving between surfaces preserves the active viewpoint**; a destination must **never silently** alter valid time, asserted time, layer, or scenario. The exceptions are explicit: first entry into a workspace may use the workspace default; opening a saved artefact or saved structure may **restore its recorded viewpoint, with the change made visible**; selecting a specific scenario destination may activate that scenario, visibly. "Reset to surface default" is an explicit user action, never an implicit consequence of navigation.

## Status

Status for accepted work belongs in the shell: imports, exports, analyses, and other workflow-backed operations ([Continuum](../../05-modules/continuum/README.md)) need a stable place to review running work, warnings, failures, and completion without losing position. The status treatments are the §9 result states ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)).

## Settings

Personal, workspace, and organisation settings are visibly separate because they operate at different scopes of consequence ([host-surfaces/README.md](../host-surfaces/README.md)). A personal preference must not look like a workspace policy, and a workspace policy must not masquerade as a harmless tweak. A choice central to the current task usually belongs in the flow of work, not buried in settings.

## Desktop-first note

The shell is a Tauri window, not a browser tab ([DESIGN.md](../DESIGN.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): there is no URL bar to carry context, so the shell itself carries the workspace identity and the viewpoint. Panel sizes and the active theme persist locally as persistent UI state across reloads ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Accessibility

The shell preserves keyboard movement between its four regions without trapping focus or forcing awkward tab sequences. Search results have usable announcement and selection behaviour. Time and scenario controls carry labels clear enough that an assistive-technology user can explain the active viewpoint just as a sighted user can ([design-system/accessibility.md](../design-system/accessibility.md)).

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Recognition over recall; consistency.

## Related documents

| Document                                                          | What it covers                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| [the-shell.md](../the-shell.md)                                   | The one shared shell and its four regions.                       |
| [design-system/blocks.md](../design-system/blocks.md)             | The shell blocks that realise the regions.                       |
| [ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md) | The viewpoint as a cache coordinate and persistent UI state.     |
| [Continuum](../../05-modules/continuum/README.md)                 | The accepted-work orchestration whose status the shell surfaces. |
