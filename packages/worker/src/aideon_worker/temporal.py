"""Temporal analytics stubs for the worker sidecar.

This module implements the minimal `Temporal.StateAt` job used by the UI
to obtain a time-sliced view of the graph. It is intentionally simple for
early wiring and will evolve to load snapshots and apply scenarios.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class StateAtArgs:
    """Arguments for the `Temporal.StateAt` job.

    Attributes:
        asOf: ISO date string for the time-slice.
        scenario: Optional scenario identifier.
        confidence: Optional confidence weight for scenario application.
    """

    asOf: str
    scenario: str | None = None
    confidence: float | None = None


def state_at(args: StateAtArgs) -> dict[str, Any]:
    """Return a predictable shape for the time-sliced graph.

    This stub returns an empty graph at the requested `asOf` time. It
    exists to validate RPC wiring and UI contract. Replace the payload
    with real snapshot lookups and scenario overlays as the model lands.
    """

    return {
        "asOf": args.asOf,
        "scenario": args.scenario,
        "confidence": args.confidence,
        "nodes": 0,
        "edges": 0,
    }
