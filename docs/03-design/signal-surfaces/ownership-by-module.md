# Ownership by module

Which module produces which signal, and the rule that the host renders all of them but fabricates none. Producing modules supply complete signal payloads; the host shell is the single render and interaction surface.

---

## Producers

| Module                                            | Signals it produces                                                                                                     | Status                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [Metis](../../05-modules/metis/README.md)         | Rankings and prioritisation; anomaly detection; risk and concentration; trend computation.                              | Implemented role        |
| [Chrona](../../05-modules/chrona/README.md)       | Temporal and scenario-aware comparison signals: plateau detection, scenario divergence, time-bounded trend.             | Implemented role        |
| [Kairos](../../05-modules/kairos/README.md)       | Entropy and investment-opportunity signals — where the twin is decaying and where action is worth taking.               | Design intent (planned) |
| [Aegis](../../05-modules/aegis/README.md)         | Risk, control, and compliance signals — register hits, control gaps, regulatory obligations over capabilities and data. | Design intent (planned) |
| [Continuum](../../05-modules/continuum/README.md) | Rule-driven task creation, escalation, and reminder signals.                                                            | Implemented role        |

The Kairos and Aegis rows are **design intent**: those modules are planned (§10 module pantheon), and their signal responsibilities are described here as the boundary they will occupy, not as shipped behaviour. They are labelled planned until a crate exists.

## The split between Metis and Chrona

Metis computes deterministic, bounded graph analytics at a single viewpoint — centrality, impact, concentration, anomaly. Chrona interprets across viewpoints — comparing two snapshots to detect a plateau, a divergence, or a time-bounded trend. A signal that needs the comparison of two points in time or two scenarios is Chrona's; a signal computed over one resolved graph is Metis's. Praxis supplies domain framing when a signal needs semantic explanation or task shaping, but it does not own a signal family of its own.

## The host renders; it never fabricates

The producing module emits a payload carrying all [six required elements](./required-elements.md). The [host](../../02-standards/DOCUMENTATION-STANDARD.md) (the desktop shell) renders every signal as a visible, reviewable surface and enforces the visual differentiation and interaction rules — but it **must not** invent missing context. If a payload arrives without its reason-for-firing or its strength, the host does not guess one; the signal stays in raw diagnostics until its producer supplies the missing element. No module bypasses the surface contract: analytics modules produce, the host renders, and the [authority rule](./authority-rule.md) bounds them both.

## Worked example

A concentration warning on `Insight Hub` (`n:application:insight-hub`) originates in **Metis**, which computes the score over the resolved graph and emits a payload with type, scope, reason, strength (Medium), context, and actions. A divergence finding comparing the base case against the `FY26 Insight Modernization` scenario (`n:plan-event:fy26-modernization`) originates in **Chrona**, because it spans two viewpoints. Accepting either may create a review task held by **Continuum** in the shared task infrastructure. In all three cases the **host** renders the surface and fabricates nothing.

## Related documents

| Document                                                                  | What it covers                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------- |
| [signal-families.md](./signal-families.md)                                | The families these modules produce.                |
| [required-elements.md](./required-elements.md)                            | The payload contract producers must satisfy.       |
| [authority-rule.md](./authority-rule.md)                                  | The bound on every producer and on the host.       |
| [Metis](../../05-modules/metis/README.md)                                 | Deterministic, bounded graph analytics.            |
| [Chrona](../../05-modules/chrona/README.md)                               | Time and scenario interpretation.                  |
| [Kairos](../../05-modules/kairos/README.md)                               | Planned: investment and entropy signals.           |
| [Aegis](../../05-modules/aegis/README.md)                                 | Planned: risk, control, and compliance signals.    |
| [Continuum](../../05-modules/continuum/README.md)                         | Local orchestration and rule-driven task creation. |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md) | The module pantheon (§10) and the host's role.     |
