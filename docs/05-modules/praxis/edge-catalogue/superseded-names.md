# Superseded names

The old relationship vocabulary, the canonical name that replaces each, and why the old set was retired. An earlier draft of this catalogue used a divergent relationship set; the seed metamodel ships an ArchiMate-aligned set, and the catalogue adopts the seed's names and directions. This is the [Documentation Standard §12](../../../02-standards/DOCUMENTATION-STANDARD.md) reconciliation, recorded so existing references map cleanly.

---

## Old → new mapping

| Superseded name  | Canonical name     | Direction change                                                    | Notes                                                                                                                                                                                                                                 |
| ---------------- | ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contributes_to` | `serves`           | none (Capability → ValueStreamStage)                                | ArchiMate **Serving** is the standard relationship for "provides the ability used by".                                                                                                                                                |
| `delivers`       | `realises`         | none (Application/TechnologyComponent → Capability/BusinessProcess) | ArchiMate **Realization** is the standard relationship for "concrete realises abstract".                                                                                                                                              |
| `uses_data`      | `accesses`         | none (BusinessProcess/Application → DataEntity)                     | ArchiMate **Access**; the `mode` attribute (read/write/readwrite) is preserved unchanged.                                                                                                                                             |
| `deployed_on`    | `hosts`            | **reversed**                                                        | `deployed_on` pointed Application → TechnologyComponent. `hosts` points **TechnologyComponent → Application**, matching ArchiMate **Assignment** on the technology layer. The endpoints are the same pair; the direction is inverted. |
| `change_affects` | `plan_effect`      | none (PlanEvent → target)                                           | The `op` and `target_ref` attributes are preserved unchanged.                                                                                                                                                                         |
| `depends_on`     | _(no replacement)_ | —                                                                   | A generic fallback dependency. **Not in the seed.** If a generic dependency is genuinely needed, it is introduced as a marked [extension](./extensions.md) with rationale, not assumed.                                               |
| `belongs_to`     | _(no replacement)_ | —                                                                   | Membership/containment. **Not in the seed.** Introduced only as a marked [extension](./extensions.md) (e.g. ArchiMate Composition/Aggregation) if required.                                                                           |

The five canonical names — `serves`, `realises`, `accesses`, `hosts`, `plan_effect` — are exactly the relationships [`core-v1.json`](../../../data/meta/core-v1.json) declares. The two unreplaced names (`depends_on`, `belongs_to`) were never in the seed and are not reintroduced by default.

---

## Why the old set was retired

Three reasons, in order of weight:

1. **Alignment to a named standard over bespoke doctrine.** The canonical references for the product are **ArchiMate 3.2** and **TOGAF 10** ([standards register](../../../02-standards/STANDARDS-REGISTER.md)). Naming relationships after their ArchiMate relationship (Serving, Realization, Access, Assignment) makes the model interoperable and removes the need to explain a private vocabulary. `contributes_to`/`delivers`/`uses_data` were plain-language coinings with no standard behind them.
2. **The seed is the implemented truth.** `core-v1.json` ships the ArchiMate-aligned names. A catalogue that documented a different set would describe something that does not exist — the most expensive kind of documentation error ([Documentation Standard §1](../../../02-standards/DOCUMENTATION-STANDARD.md)).
3. **The `deployed_on` direction was wrong for impact.** `hosts` points from the hosting technology to the application it hosts, which is the direction impact analysis needs (a technology component failing affects the applications it hosts). `deployed_on` pointed the other way and would have inverted blast-radius results.

The trade-off: any existing model, import, or document that used the old names must be migrated. The mapping table above is that migration's specification; the rename is a forward-only schema change ([extension and versioning](../../../03-design/metamodel/extension-and-versioning.md)).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The relationship names the canonical set adopts.

## Related documents

| Document                                                                             | What it covers                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [Catalogue](./catalogue.md)                                                          | The canonical five and their detail.                        |
| [Extensions](./extensions.md)                                                        | How a genuine `depends_on`/`belongs_to` need is introduced. |
| [Extension and versioning](../../../03-design/metamodel/extension-and-versioning.md) | The rename-as-migration mechanism.                          |
| [Documentation Standard §12](../../../02-standards/DOCUMENTATION-STANDARD.md)        | The reconciliation mandate this file fulfils.               |
