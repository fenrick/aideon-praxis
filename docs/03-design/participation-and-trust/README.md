# Participation and Trust

The human operating model of Aideon Desktop: who participates, how they participate, and what the product does to earn trust while they do it. This folder is for anyone deciding which surface a role meets, or why the product carries its own burden of trustworthiness rather than borrowing it from the team that produced an artefact.

The governing idea is that these are **not four separate products**. Expert authoring, guided contribution, review-based stewardship, and read-only decision support are four **entry points into the same product**. The underlying [twin](../../../CONTEXT.md) is shared; the surface adapts to the level of authority and the kind of work a role needs. Build only for experts and the model stays accurate in pockets and stale everywhere else.

---

## Contents

1. [Participation modes](./participation-modes.md) — the four modes, what each role needs, and a seed action per mode.
2. [Trust cues](./trust-cues.md) — what a user can tell at any moment, on every surface, without knowing the producing team.
3. [Behaviour under pressure](./behaviour-under-pressure.md) — how the product holds up under density, ambiguity, scrutiny, and across surfaces.

---

## How the three relate

The three files answer three different questions about the same operating model.

- **Participation modes** answer _who is here and what may they do_. The four modes set the authority and the structure a role works within, from full modelling to read-only.
- **Trust cues** answer _what does the product owe every one of them_. The cues are the same set of honest-state signals on every surface, dense or concise; the burden of demonstrating trustworthiness sits with the product, not with the reader's familiarity with the author.
- **Behaviour under pressure** answers _how does the product hold the line_ when a surface is dense, a result is uncertain, an action is consequential, or a user moves between surfaces.

The honest-state vocabulary these files rest on is fixed once, in [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md), and the quality scales in [§8](../../02-standards/DOCUMENTATION-STANDARD.md). These files **reference** that vocabulary and never redefine it. The product-wide obligation behind the cues is stated in [trust-and-honesty.md](../trust-and-honesty.md).

## References & standards

_Informative:_

- Design Council — **Double Diamond**. Discovery→definition→development→delivery framing for the Guided mode.
- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, behind the trust cues.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [trust-and-honesty.md](../trust-and-honesty.md)                        | The product-wide obligation never to present a partial, stale, generated, or bounded result as complete. |
| [the-shell.md](../the-shell.md)                                        | The one shared shell every mode renders inside.                                                          |
| [artefacts/README.md](../artefacts/README.md)                          | The artefact — the primary product every mode reads or authors.                                          |
| [ux/README.md](../ux/README.md)                                        | The behaviour-level interaction contract the modes inherit.                                              |
| [signal-surfaces/README.md](../signal-surfaces/README.md)              | How analytical and ML outputs surface as prompts for judgement.                                          |
| [ARTEFACTS-AND-FAMILIES.md](../ARTEFACTS-AND-FAMILIES.md)              | §7 holds the consolidated participation-modes and trust-cues tables this folder expands.                 |
| [../../05-modules/themis/README.md](../../05-modules/themis/README.md) | Themis (planned) — the governance engine behind Steward mode and approvals.                              |
