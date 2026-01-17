# Telemetry (UI Events)

## Purpose

Define **product telemetry** emitted by the renderer. This is distinct from the **Metis analytics
engine** (rankings, impact, etc.). Telemetry is privacy-first and opt-in by host configuration.

---

## Principles

- No external endpoints by default.
- No PII in payloads.
- Payloads are JSON-serializable and versioned.

---

## Event catalogue (renderer)

- `template_change` - template selection changed.
- `template_create_widget` - widget added from registry.
- `selection_change` - selection updated (counts only).
- `time_cursor` - time context changed.
- `inspector_save` - property save dispatched.
- `error_ui` - user-visible error banner shown.

---

## Implementation hooks

- Renderer emits events through an injectable sink.
- Default sink is console logging in dev.
- Host may provide a sink, but must keep telemetry off by default.

---

## References

- Analytics engine: `crates/metis/DESIGN.md`
