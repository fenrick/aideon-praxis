//! `mneme_store` — the on-disk canonical workspace format (format v1) and its
//! derived runtime.
//!
//! Built to the M0 build contract (`docs/build-contracts/M0-foundation.md`) and
//! [workspace-integrity-and-recovery]: the `manifest.json` descriptor, the
//! `model/ops/` segment writer/reader with sealing and checksums, the writer
//! lock, the content-addressed blob store, the SQLite projection, and the
//! rebuild pipeline with its `foundation_rebuild_hash` oracle. The canonical
//! files are authoritative; the SQLite runtime is a rebuildable projection of
//! the op log ([ADR-0001], [ADR-0002], [ADR-0027]).
#![forbid(unsafe_code)]

pub mod atomic;
pub mod blob;
pub mod error;
pub mod lock;
pub mod manifest;
pub mod paths;
pub mod projection;
pub mod rebuild;
pub mod segment;
pub mod workspace;

pub use error::{Result, StoreError};
pub use manifest::Manifest;
pub use paths::Paths;
pub use rebuild::FoundationProjectionSnapshot;
pub use workspace::Workspace;
