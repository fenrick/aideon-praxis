# Standards Register

The shared bibliography for Aideon Desktop's design documentation. Every "best practice" claim in the corpus cites a source recorded here, so the whole documentation set leans on one set of references rather than many ad-hoc ones. New citations are added here first, then referenced from documents.

Each entry records whether the corpus treats the source as **normative** (it defines an obligation the design adopts) or **informative** (it explains or justifies a design), and which modules or documents rely on it. Sources are cited by author/body, title, and year — stable identifiers that do not rot the way URLs do.

The two primary enterprise-architecture references for this product are **TOGAF Standard, 10th Edition** and **ArchiMate 3.2**. The metamodel, edge catalogue, artefact families, and semantic spine are aligned to them.

---

## Enterprise architecture and service design

| Source                                                                                  | Use                                                                                                                                                                                                                                                                      | Normative?                                     | Used by                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| The Open Group — **TOGAF Standard, 10th Edition** (ADM; Architecture Content Framework) | Layering of business/application/technology; the strategy-to-execution lineage behind the semantic spine; artefact families mapped to ADM deliverables and views                                                                                                         | **Normative** (EA alignment)                   | [03-design](../03-design/), Praxis metamodel, artefact families                                                         |
| The Open Group — **ArchiMate 3.2 Specification**                                        | Element layers (Motivation, Strategy, Business, Application, Technology, Physical, Implementation & Migration) and relationship semantics (Serving, Realization, Access, Assignment, Composition, Aggregation, Triggering, Flow, Influence, Specialization, Association) | **Normative** (relationship & type vocabulary) | [Praxis edge catalogue](../05-modules/praxis/), [metamodel](../03-design/), [`core-v1.json`](../data/meta/core-v1.json) |
| The Open Group — **ArchiMate Model Exchange File Format**                               | The interchange lingua franca for import/export                                                                                                                                                                                                                          | **Normative** for interchange                  | Pylon (planned)                                                                                                         |
| **ISO/IEC/IEEE 42010:2022** — Architecture description                                  | Stakeholders, concerns, architecture viewpoints and views — disambiguated from the product's _Viewpoint_ (query frame)                                                                                                                                                   | Informative                                    | [01-architecture](../01-architecture/), artefact families                                                               |
| Zachman — **Zachman Framework for Enterprise Architecture**                             | The six interrogatives (What/How/Where/Who/When/Why) as a coverage check for artefact families                                                                                                                                                                           | Informative                                    | artefact families                                                                                                       |
| Shostack — _Designing Services That Deliver_, HBR, 1984 (**service blueprinting**)      | The service-blueprint artefact family notation                                                                                                                                                                                                                           | Informative                                    | service-blueprint family                                                                                                |
| Christensen; Ulwick — **Jobs-to-be-Done**                                               | Framing artefact families by the question/job they answer, not the diagram they draw                                                                                                                                                                                     | Informative                                    | artefact families                                                                                                       |
| Design Council — **Double Diamond**                                                     | Discovery→definition→development→delivery framing for guided flows                                                                                                                                                                                                       | Informative                                    | participation modes                                                                                                     |
| Wardley — **Wardley Mapping**                                                           | Evolution/positioning lens for technology-portfolio artefacts                                                                                                                                                                                                            | Informative                                    | technology-portfolio family                                                                                             |
| OMG — **BPMN 2.0**                                                                      | Process notation reference where business-process detail is rendered                                                                                                                                                                                                     | Informative                                    | service-blueprint, operating-model families                                                                             |

## Temporal and bitemporal data

| Source                                                                                | Use                                                                                            | Normative?                          | Used by                                                        |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999             | Bitemporal model: valid time vs transaction (asserted) time, sequenced/non-sequenced semantics | **Normative** (temporal model)      | [Temporal & scenario context](../04-contracts/), Chrona, Mneme |
| **SQL:2011** application-time period & system-versioned tables                        | Standard vocabulary for period tables and temporal predicates                                  | Informative                         | Mneme storage                                                  |
| Allen — _Maintaining Knowledge about Temporal Intervals_, 1983 (**interval algebra**) | The 13 interval relations used to reason about valid-time containment and overlap              | **Normative** (interval reasoning)  | Chrona resolution, edge temporal model                         |
| Kulkarni, Demirbas, et al. — _Logical Physical Clocks_ (**HLC**), 2014                | Hybrid Logical Clock for asserted time; skew tolerance and monotonicity                        | **Normative** (asserted-time clock) | [ADR-0022](../06-adrs/), Mneme `mneme_core::time`              |
| Lamport — _Time, Clocks, and the Ordering of Events_, 1978                            | Causal ordering foundation underneath HLC                                                      | Informative                         | Mneme, sync                                                    |

## Storage, projections, and distributed state

| Source                                                                                          | Use                                                                     | Normative?                         | Used by                                             |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------- |
| Fowler; Young — **Event Sourcing & CQRS**                                                       | Append-only operation log as truth; derived read models rebuilt from it | **Normative** (storage shape)      | Mneme, [ADR-0001](../06-adrs/), projection contract |
| Kleppmann — _Designing Data-Intensive Applications_, 2017                                       | Consistency models, log-structured storage, derived-data discipline     | Informative                        | Mneme, projection & invalidation                    |
| Gupta & Mumick — _Maintenance of Materialized Views_, 1995 (**incremental view maintenance**)   | Correctness conditions for incremental projection refresh               | **Normative** (projection refresh) | [ADR-0027](../06-adrs/), projection & invalidation  |
| Shapiro et al. — _Conflict-free Replicated Data Types_, 2011 (**CRDTs**)                        | Convergence properties for the sync/conflict model                      | Informative                        | [ADR-0005](../06-adrs/) sync                        |
| Merkle, 1987; **Git internals**; IPFS — content-addressable storage                             | Hash-addressed immutable blobs; deduplication; integrity by hash        | **Normative** (blob store)         | [ADR-0003](../06-adrs/), Mneme blobs                |
| O'Neil et al. — _The Log-Structured Merge-Tree_, 1996                                           | Write-amplification trade-offs in candidate engines                     | Informative                        | Mneme runtime engine                                |
| Berenson et al. — _A Critique of ANSI SQL Isolation Levels_, 1995 (**snapshot isolation/MVCC**) | Read-isolation semantics for the single-writer queue                    | Informative                        | Mneme runtime engine                                |
| **SQLite** official documentation (WAL mode, pragmas)                                           | Default derived-runtime engine configuration                            | **Normative** (default engine)     | [Mneme SQLite](../05-modules/mneme/)                |

## Contracts, APIs, and versioning

| Source                                                                     | Use                                                        | Normative?                         | Used by                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| **RFC 9457** — Problem Details for HTTP APIs (obsoletes RFC 7807)          | Machine-readable error envelope shape and code taxonomy    | **Normative** (error envelope)     | [ADR-0016](../06-adrs/), [Contracts & schemas](../04-contracts/) |
| **Semantic Versioning 2.0.0**                                              | DTO, contract, crate, and package versioning               | **Normative** (versioning)         | [ADR-0017](../06-adrs/), contracts                               |
| **JSON Schema 2020-12**                                                    | Validation schemas for IPC payloads and the seed metamodel | **Normative** (payload validation) | contracts, metamodel                                             |
| **OpenAPI / AsyncAPI**                                                     | Machine-readable command and event manifests               | Informative                        | IPC/event manifests                                              |
| IETF — **The Idempotency-Key HTTP Header** (draft)                         | Idempotency-key contract for mutations and accepted work   | **Normative** (idempotency)        | [ADR-0018](../06-adrs/), accepted-work                           |
| Meyer — **Design by Contract**, 1992; Pact — **consumer-driven contracts** | Boundary contract discipline and contract testing          | Informative                        | [Testing strategy](../02-standards/TESTING-STRATEGY.md)          |

## Durable execution and orchestration

| Source                                       | Use                                                         | Normative?                    | Used by   |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------------------- | --------- |
| Garcia-Molina & Salem — _Sagas_, 1987        | Compensation for multi-step cross-engine work               | **Normative** (orchestration) | Continuum |
| Temporal.io — **durable execution model**    | Deterministic replay, activity retries, workflow versioning | Informative                   | Continuum |
| van der Aalst et al. — **Workflow Patterns** | Vocabulary for control-flow composition and fairness        | Informative                   | Continuum |

## Analytics and graph algorithms

| Source                                                                                                         | Use                                                             | Normative?                            | Used by       |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------- | ------------- |
| Newman — _Networks_, 2nd ed., 2018                                                                             | Centrality definitions and their interpretation                 | **Normative** (analytics definitions) | Metis         |
| Page & Brin — **PageRank**, 1998; Freeman — **betweenness centrality**, 1977; Brandes — fast betweenness, 2001 | Named, bounded centrality algorithms with stated complexity     | **Normative** (algorithm selection)   | Metis         |
| Dijkstra, 1959; Bellman–Ford — shortest paths                                                                  | Path/reachability computation with complexity bounds            | **Normative** (path analytics)        | Metis         |
| Mitchell et al. — **Model Cards for Model Reporting**, 2019                                                    | Per-output documentation of intended use, accuracy, limitations | **Normative** (ML output)             | Metis, Sophia |

## AI assistance

| Source                                                  | Use                                                                  | Normative?                | Used by                         |
| ------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- | ------------------------------- |
| Lewis et al. — **Retrieval-Augmented Generation**, 2020 | Grounding LLM output in twin content rather than free generation     | **Normative** (grounding) | Sophia (planned)                |
| Mitchell et al. — **Model Cards**, 2019                 | Disclosure for generated suggestions                                 | **Normative**             | Sophia                          |
| **NIST AI Risk Management Framework** (AI RMF 1.0)      | Governance, guardrails, and provenance posture for generated content | Informative               | Sophia, [ADR-0014](../06-adrs/) |

## Security

| Source                                                               | Use                                                                           | Normative?                        | Used by                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Microsoft — **STRIDE** threat modelling                              | The threat-model frame for the trust boundary                                 | **Normative** (threat model)      | [ADR-0023](../06-adrs/), [Security](../02-standards/SECURITY.md) |
| **OWASP ASVS 5.0**                                                   | Verification controls mapped per security concern                             | **Normative** (security controls) | Security                                                         |
| **OWASP Top 10**                                                     | Common-risk checklist                                                         | Informative                       | Security                                                         |
| **NIST SSDF (SP 800-218)**; **NIST CSF 2.0**                         | Secure-development practices; identify/protect/detect/respond/recover framing | Informative                       | Security                                                         |
| **Tauri security model** (capabilities, permissions, CSP, isolation) | The renderer/host trust boundary mechanism                                    | **Normative** (host boundary)     | [ADR-0006](../06-adrs/), Host                                    |
| **SLSA**; **CycloneDX / SPDX** SBOM                                  | Supply-chain integrity and bill of materials                                  | Informative                       | Security, build                                                  |

## Frontend, UX, and accessibility

| Source                                                                  | Use                                                               | Normative?                           | Used by                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| **WCAG 2.2** (W3C)                                                      | Accessibility conformance target (Level AA)                       | **Normative** (accessibility)        | [ADR-0024](../06-adrs/), frontend      |
| **WAI-ARIA Authoring Practices Guide**                                  | Keyboard and ARIA patterns for complex widgets                    | **Normative** (interaction patterns) | frontend, design system                |
| W3C **Design Tokens Community Group** format                            | Token architecture (reference vs system/semantic tokens)          | **Normative** (tokens)               | [ADR-0025](../06-adrs/), design system |
| Nielsen — **10 Usability Heuristics**, 1994                             | Heuristic basis for status visibility, user control, honest state | Informative                          | UX design                              |
| Wertheimer — **Gestalt principles**                                     | Visual grouping in the inspector and dense surfaces               | Informative                          | UX, design system                      |
| Pirolli & Card — **Information Foraging**, 1999; progressive disclosure | Information scent for drill-down and explanation placement        | Informative                          | UX, explanation surfaces               |
| Frost — **Atomic Design**, 2016                                         | The token→primitive→block→surface layering                        | Informative                          | design system                          |
| Google — **Material Design 3** token architecture                       | Reference for semantic vs reference token separation              | Informative                          | design system                          |

## Observability

| Source                                   | Use                                                   | Normative?              | Used by                                                                     |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| **OpenTelemetry**; W3C **Trace Context** | Correlation/trace propagation across the IPC boundary | **Normative** (tracing) | [ADR-0019](../06-adrs/), [Logging framework](../LOGGING_FRAMEWORK.md), Host |

## Documentation method

| Source                     | Use                                        | Normative?                            | Used by                                                  |
| -------------------------- | ------------------------------------------ | ------------------------------------- | -------------------------------------------------------- |
| Brown — **The C4 Model**   | Architecture view convention               | **Normative** (architecture diagrams) | [01-architecture/c4](../01-architecture/c4/)             |
| **arc42** template         | Building-block and runtime view structure  | Informative                           | 01-architecture                                          |
| Procida — **Diátaxis**     | Separation of explanation/reference/how-to | Informative                           | this corpus                                              |
| Nygard — **ADR**; **MADR** | Decision-record shape                      | **Normative** (ADR format)            | [ADR-FORMAT.md](./ADR-FORMAT.md), [06-adrs](../06-adrs/) |

---

## Related documents

| Document                                                 | What it covers                                              |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md](./DOCUMENTATION-STANDARD.md) | How documents cite these sources and the rules they follow. |
| [`CONTEXT.md`](../../CONTEXT.md)                         | The canonical domain glossary.                              |
| [06-adrs/ADRS.md](../06-adrs/ADRS.md)                    | The decisions that adopt the normative sources above.       |
