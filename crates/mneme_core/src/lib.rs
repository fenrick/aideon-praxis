//! `mneme_core` — the pure canonical types of the Aideon workspace.
//!
//! This crate has no I/O and no SQLite: it owns the **canonical operation
//! record** ([`ops`]), the **canonical-JSON profile** ([`canonical`]), the
//! **fact-value algebra** ([`value`]), **schema-as-data** ([`schema`]), the
//! **identifiers** ([`ids`]) and the **time coordinates / HLC** ([`time`]). The
//! storage layer ([`aideon_mneme_store`](../aideon_mneme_store)) builds the
//! on-disk format and the derived runtime on top of these types.
//!
//! Everything here is built to the M0 build contract
//! (`docs/build-contracts/M0-foundation.md`), the canonical-JSON profile
//! (`docs/04-contracts/canonical-json.md`), and the operation schemas under
//! `docs/contracts/operations/`.
#![forbid(unsafe_code)]
#![warn(missing_docs)]

pub mod canonical;
pub mod error;
pub mod ids;
pub mod ops;
pub mod schema;
pub mod time;
pub mod value;

pub use error::{CoreError, Result};
pub use ids::Id;
pub use ops::{OpEnvelope, OpKind, OpPayload, parse_record, parse_record_line};
pub use time::{Hlc, HlcClock, ValidTime};
pub use value::{BlobRef, Value};
