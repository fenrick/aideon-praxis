# Product Design — Overview

The short entry point into the product design layer. Aideon Desktop is a desktop-first, local-first, time-first digital-twin modelling application: a Tauri v2 shell with a Rust core and an untrusted React renderer. This document orients a reader; the full layer is indexed by [`README.md`](./README.md).

The design rests on a small set of invariants and one shared shell, and treats the **artefact** as its primary product. Rather than restating those here, this layer is decomposed into focused files:

| To understand…                                      | Read                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| The non-negotiable invariants                       | [design-axioms.md](./design-axioms.md)                          |
| The one shared shell and its regions                | [the-shell.md](./the-shell.md)                                  |
| The module pantheon and how the renderer reaches it | [module-map.md](./module-map.md)                                |
| The honesty obligations to users                    | [trust-and-honesty.md](./trust-and-honesty.md)                  |
| The canonical vocabulary                            | [vocabulary.md](./vocabulary.md)                                |
| The workspace thesis                                | [desktop-first-workspace/](./desktop-first-workspace/README.md) |
| The artefact — the product unit                     | [artefacts/](./artefacts/README.md)                             |
| How the product behaves (UX)                        | [ux/](./ux/README.md)                                           |

The full set of areas — including the metamodel, semantic spine, signal surfaces, analytics, host surfaces, and participation — is listed in the [layer index](./README.md).

## Related documents

| Document                                                  | What it covers                                            |
| --------------------------------------------------------- | --------------------------------------------------------- |
| [README.md](./README.md)                                  | The product design layer index — the spine of this layer. |
| [01-architecture/README.md](../01-architecture/README.md) | The system shape and boundaries this design realises.     |
| [`CONTEXT.md`](../../CONTEXT.md)                          | The canonical glossary.                                   |
