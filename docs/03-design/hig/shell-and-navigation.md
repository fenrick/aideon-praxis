# HIG: Shell and Navigation

How the one shared shell frames workspaces, navigation, search, settings, the viewpoint, and workflow status. This page turns the shell design into concrete rules for the product frame users inhabit while they work. Apply it when designing or reviewing the workspace shell, module entry points, navigation, search, settings, or status surfaces.

It does not decide backend status semantics, workflow identities, or authorisation — those belong to the runtime, architecture, and contracts. This page governs how that information appears.

---

## The principle

The shell is the stable frame of the product. In analytical software that matters: users stay inside the frame for long sessions and learn it by repetition, so a shell that shifts structure from module to module taxes them every time they move. Aideon uses **one shared shell** with four stable regions — navigation, toolbar, content, inspector ([the-shell.md](../the-shell.md)) — realised by the shell blocks ([design-system/blocks.md](../design-system/blocks.md)).

## The shell frame

Navigation establishes where the user is. The toolbar carries actions, workspace switching, and shared context. The content area belongs to the active work surface and is dominant. The inspector handles contextual detail, editing, and explanation. These regions stay stable enough that a user does not relearn the frame while switching tasks. Workspaces render _inside_ this shell rather than importing their own chrome; a module needing more control negotiates a shell extension or a shared pattern, it does not abandon the shell ([surfaces.md](../design-system/surfaces.md)).

## Information architecture

Top-level navigation reflects user goals and stable work categories — finding, analysing, modelling, presenting, reviewing, configuring — not the internal module partition. Users should not have to infer how the engineering org is split. Critical destinations **must not** depend on hover: hover may enrich the desktop, but it is the wrong place to hide structural navigation or meaning-changing context.

## Search

Global and local search do different jobs and feel different. Global search finds objects or destinations across the workspace; local search filters or narrows the current result set ([Lexis](../../05-modules/lexis/README.md), planned, owns search and discovery — bounded and viewpoint-aware). Blurring the two leaves users unsure whether they are moving through the system or only filtering the current view. Search results tell the user what kind of object they are looking at, why it matched, and what context they will land in.

## Time, scenario, and the viewpoint

Time and scenario controls stay visible in the main workspace flow because they change meaning. The full **viewpoint** — as-of valid time, as-of asserted time, layer or layer policy, scenario, and scope — is the frame through which the twin is resolved ([CONTEXT.md](../../../CONTEXT.md)); changing it changes what the surface means and what any export or generated output represents. Because every server read is keyed by the full viewpoint ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)), the shell keeps the active viewpoint visible so the user can always explain which version of the twin they are looking at ([trust-and-honesty.md](../trust-and-honesty.md)).

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
