# 12. Operational edge cases

Explicit rules for the conditions under which logging itself is at risk: before initialisation, when the disk is full,
when a condition repeats, and when the clock is wrong. Part of the [logging standard](./README.md). Logging **must not**
crash the app under any of these.

---

## 12.1 Logging before initialisation

If code runs before logging is initialised:

- it **must** log to stderr only, and
- it **must** emit a Notice `logging_not_ready` once logging becomes available.

The Rust panic hook depends on this fallback ([rust-host §7.5](./rust-host.md#75-the-panic-hook)).

## 12.2 Disk full / permission denied

If the log file cannot be written:

- do not crash;
- fall back to stderr;
- emit a single Alert `logging_write_failed` per session, rate-limited.

## 12.3 Rate limiting and spam control

- Repeated identical warnings/errors **must** be rate-limited.
- Use a counter for a repeated condition (`suppressed_count`) rather than one line per occurrence.

This is why the anti-patterns ([event catalogue §6.9](./event-catalogue.md#69-anti-patterns-must-not)) forbid per-frame
and per-tick logging: a flood drowns the signal and can itself fill the disk.

## 12.4 Debug mode in production

Debug logging in production **must** be explicit:

- enabled only via a deliberate user action (support mode) or a clearly documented config flag;
- time-bounded (auto-disable after a duration).

When debug is toggled, emit `debug_logging_enabled` (Notice) and `debug_logging_disabled` (Notice).

## 12.5 Clock issues

Timestamps **must** be UTC ISO-8601. If system time is clearly invalid (for example, before a reasonable epoch), emit
`clock_invalid` (Warning) once per session.

---

## Related documents

| Document                                                       | What it covers                                           |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| [rust-host.md](./rust-host.md)                                 | The panic hook and pre-init stderr fallback.             |
| [where-logs-go.md](./where-logs-go.md)                         | Rotation behaviour tested for disk-full and permissions. |
| [event-catalogue.md](./event-catalogue.md)                     | The anti-patterns that prevent log floods.               |
| [testing-and-quality-gates.md](./testing-and-quality-gates.md) | How these edge cases are tested.                         |
