"""Aideon Praxis worker sidecar.

Pure worker process. RPC server over pipes/UDS only.
No open TCP ports in desktop mode.
"""

from ._version import __version__  # noqa: E402
from .temporal import state_at  # noqa: E402

__all__ = ["state_at", "__version__"]
