# Resolution explainability

A read may request explainability metadata. When it does, the response includes a per-slot reason array recording the rule that selected each winner and the candidates that were considered. This is not returned by default — it is opt-in, because the candidate set can be large.

---

## What it returns

For each resolved slot, the explanation records:

- The winning fact and its value.
- The [resolution rule](./resolution-rules.md) that selected it (containment, interval specificity, latest asserted time, or op-id tie-break).
- The candidates considered and why each was eliminated.
- The [layer policy](./layer-and-policy.md) applied, if more than one layer contributed.

This is the same evidence the integrity model and Chrona debug panel consume. Resolution explanations are **Inferred** content ([honest-state, §9](../../02-standards/DOCUMENTATION-STANDARD.md)): derived, traceable, and recomputed when inputs change — never Asserted.

## Where it surfaces

Two store commands expose it directly: `mneme_store_explain_resolution` (why a property value resolved as it did) and `mneme_store_explain_traversal` (why an edge is or is not visible at a viewpoint). Both carry the full temporal context of the read they explain. Audit surfaces and the Chrona debug panel consume the same metadata.

## Worked example

For the `cap_payments.tier` resolution in [resolution-rules.md](./resolution-rules.md), an explained read returns: winner `f2` (`tier = 1`), selected by **interval specificity** over `f1`; `f1` eliminated at priority 2 because its open-ended interval is wider than `f2`'s `during`-contained interval; layer policy `actual` (single layer, no cross-layer overlay).

## References & standards

- (System contract) [resolution-rules.md](./resolution-rules.md) — the rules the explanation names.

## Related documents

| Document                                                                        | What it covers                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [resolution-rules.md](./resolution-rules.md)                                    | The precedence chain whose decision is explained.         |
| [Praxis: explainability](../../05-modules/praxis/explainability.md)             | How explanations feed integrity and explanation surfaces. |
| [Chrona: viewpoint resolution](../../05-modules/chrona/viewpoint-resolution.md) | The resolver that produces the reason array.              |
