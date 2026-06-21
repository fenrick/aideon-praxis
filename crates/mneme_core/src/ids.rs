//! Canonical identifiers.
//!
//! Every canonical identity is a UUID serialised as a lower-case, hyphenated
//! string (the `$defs/id` shape in the operation schemas). A single [`Id`]
//! newtype carries all of them — `op_id`, `actor_id`, `partition_id`,
//! `entity_id`, symbol UUIDs — because the canonical record does not
//! distinguish them by Rust type, only by field position.

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::CoreError;

/// A canonical UUID identifier, serialised lower-case and hyphenated.
#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Id(Uuid);

impl Id {
    /// Mint a fresh random (v4) identifier on the authoring path.
    #[must_use]
    pub fn new_v4() -> Self {
        Self(Uuid::new_v4())
    }

    /// Wrap an existing [`Uuid`].
    #[must_use]
    pub const fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// The inner [`Uuid`].
    #[must_use]
    pub const fn as_uuid(&self) -> Uuid {
        self.0
    }

    /// The canonical lower-case hyphenated string form.
    #[must_use]
    pub fn to_canonical_string(&self) -> String {
        let mut buf = Uuid::encode_buffer();
        self.0.hyphenated().encode_lower(&mut buf).to_string()
    }
}

impl fmt::Display for Id {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_canonical_string())
    }
}

impl fmt::Debug for Id {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Id({})", self.to_canonical_string())
    }
}

impl FromStr for Id {
    type Err = CoreError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| CoreError::InvalidRecord(format!("invalid UUID `{s}`: {e}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_lower_hyphenated() {
        let id = Id::from_str("AB0AEFE4-902F-5F99-8CE3-EAE00286EBE0").unwrap();
        assert_eq!(
            id.to_canonical_string(),
            "ab0aefe4-902f-5f99-8ce3-eae00286ebe0"
        );
        let json = serde_json::to_string(&id).unwrap();
        assert_eq!(json, "\"ab0aefe4-902f-5f99-8ce3-eae00286ebe0\"");
    }

    #[test]
    fn rejects_non_uuid() {
        assert!(Id::from_str("n:application:automation-orchestrator").is_err());
    }
}
