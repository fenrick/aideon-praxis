//! The canonical fact-value algebra.
//!
//! Facts carry strongly-typed values from a controlled set — never an arbitrary
//! document. Two values are deliberately excluded ([op-fact-schema-model],
//! [ADR-0038]): there is **no inline binary** (binary is a typed [`BlobRef`])
//! and **no `json` twin-fact value** (an opaque document is a `BlobRef` with
//! `media_type: application/json`). The `json` tag is therefore not a variant
//! here, so an authored `json` value fails to parse.

use serde::de::{self, Deserializer};
use serde::{Deserialize, Serialize, Serializer};

use crate::ids::Id;
use crate::time::ValidTime;

/// An `i64` that serialises as a canonical decimal string.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct IntStr(pub i64);

impl Serialize for IntStr {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl<'de> Deserialize<'de> for IntStr {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = String::deserialize(deserializer)?;
        raw.parse::<i64>()
            .map(IntStr)
            .map_err(|e| de::Error::custom(format!("expected decimal-string i64 `{raw}`: {e}")))
    }
}

/// A `u64` that serialises as a canonical decimal string (full-range, e.g. a
/// blob byte length).
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct U64Str(pub u64);

impl Serialize for U64Str {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl<'de> Deserialize<'de> for U64Str {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = String::deserialize(deserializer)?;
        raw.parse::<u64>()
            .map(U64Str)
            .map_err(|e| de::Error::custom(format!("expected decimal-string u64 `{raw}`: {e}")))
    }
}

/// A finite IEEE-754 binary64. `NaN`/±infinity are not representable in
/// canonical JSON, so the type cannot hold them.
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct FiniteF64(f64);

impl FiniteF64 {
    /// Construct from an `f64`, rejecting non-finite values.
    pub fn new(value: f64) -> Option<Self> {
        value.is_finite().then_some(Self(value))
    }

    /// The inner finite value.
    #[must_use]
    pub const fn get(&self) -> f64 {
        self.0
    }
}

impl Serialize for FiniteF64 {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_f64(self.0)
    }
}

impl<'de> Deserialize<'de> for FiniteF64 {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = f64::deserialize(deserializer)?;
        Self::new(value).ok_or_else(|| de::Error::custom("non-finite float is not representable"))
    }
}

/// A typed content-addressed reference. The bytes live in `objects/sha256/`,
/// never inlined; `media_type` is required-but-nullable so the value has one
/// canonical byte form.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BlobRef {
    /// Content-address family; the only M0 value is `sha256`.
    pub algorithm: String,
    /// 64-character lower-case hex digest.
    pub digest: String,
    /// Byte length as a full-range decimal string.
    pub length: U64Str,
    /// Descriptive media type; present as `null` when absent.
    pub media_type: Option<String>,
}

/// The controlled fact-value algebra. Serialised as an externally-tagged
/// single-key object (`{"str": "…"}`, `{"i64": "3"}`, …).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum Value {
    /// A UTF-8 string.
    Str(String),
    /// A 64-bit integer (decimal string on the wire).
    I64(IntStr),
    /// A finite float.
    F64(FiniteF64),
    /// A boolean.
    Bool(bool),
    /// A valid-time coordinate (decimal string on the wire).
    Time(ValidTime),
    /// A reference to another entity instance.
    Ref(Id),
    /// A content-addressed binary reference.
    Blob(BlobRef),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn str_value_is_single_key_object() {
        let v = Value::Str("Migrate".into());
        assert_eq!(serde_json::to_string(&v).unwrap(), r#"{"str":"Migrate"}"#);
    }

    #[test]
    fn i64_value_serialises_as_decimal_string() {
        let v = Value::I64(IntStr(42));
        assert_eq!(serde_json::to_string(&v).unwrap(), r#"{"i64":"42"}"#);
    }

    #[test]
    fn json_tag_is_rejected() {
        let err = serde_json::from_str::<Value>(r#"{"json":{"a":1}}"#);
        assert!(err.is_err(), "`json` is not a valid twin-fact value");
    }

    #[test]
    fn two_keys_rejected() {
        let err = serde_json::from_str::<Value>(r#"{"str":"x","i64":"3"}"#);
        assert!(err.is_err(), "a Value tag is exactly one variant");
    }

    #[test]
    fn blob_ref_round_trips_with_null_media_type() {
        let blob = BlobRef {
            algorithm: "sha256".into(),
            digest: "a".repeat(64),
            length: U64Str(10),
            media_type: None,
        };
        let json = serde_json::to_value(Value::Blob(blob)).unwrap();
        assert_eq!(json["blob"]["media_type"], serde_json::Value::Null);
        assert_eq!(json["blob"]["length"], "10");
    }
}
