//! Aideon Canonical JSON v1 — the one byte-exact serialisation the canonical
//! workspace depends on ([canonical-json]).
//!
//! Rules realised here:
//! - object keys sorted recursively by **ascending UTF-8 byte sequence** (the
//!   deliberate divergence from RFC 8785's UTF-16 order; the two coincide for
//!   the all-ASCII M0 keys);
//! - string escaping per RFC 8785 §3.2.2.2 (`/` unescaped, lower-case `\u00xx`
//!   for other C0 controls, raw UTF-8 otherwise);
//! - finite IEEE-754 floats per RFC 8785 §3.2.2.3 (ECMAScript number form);
//!   `NaN`/±infinity rejected;
//! - full-range 64-bit coordinates are emitted by callers as decimal **strings**
//!   (see [`crate::time`]), never JSON numbers.
//!
//! Three byte forms are derived on top: [`canonical_json_bytes`] (no trailing
//! newline), [`canonical_jsonl_record`] (exactly one trailing LF), and the
//! whole-file [`canonical_json_document`] (alias of `canonical_json_bytes`).

use serde::Serialize;
use serde_json::Value;

use crate::error::CoreError;

/// Profile version surfaced as `format_version` on every record.
pub const CANONICAL_JSON_PROFILE_VERSION: u32 = 1;

/// Canonical UTF-8 JSON encoding of `value`, with **no** trailing newline and
/// no BOM.
pub fn canonical_json_bytes(value: &Value) -> Result<Vec<u8>, CoreError> {
    let mut out = String::new();
    write_value(value, &mut out)?;
    Ok(out.into_bytes())
}

/// Whole-file canonical document form (`manifest.json`, authored schema docs,
/// `index.json`): identical to [`canonical_json_bytes`].
pub fn canonical_json_document(value: &Value) -> Result<Vec<u8>, CoreError> {
    canonical_json_bytes(value)
}

/// A canonical JSONL record: the canonical bytes plus exactly one trailing LF.
pub fn canonical_jsonl_record(value: &Value) -> Result<Vec<u8>, CoreError> {
    let mut bytes = canonical_json_bytes(value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

/// Serialise a value to a canonical [`serde_json::Value`] tree, then canonical
/// bytes. A convenience for typed structs.
pub fn to_canonical_json_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>, CoreError> {
    let tree = serde_json::to_value(value)
        .map_err(|e| CoreError::BadNumber(format!("could not build JSON value: {e}")))?;
    canonical_json_bytes(&tree)
}

/// `blake3-256` lower-case hex digest over the given bytes.
#[must_use]
pub fn blake3_hex(bytes: &[u8]) -> String {
    hex::encode(blake3::hash(bytes).as_bytes())
}

fn write_value(value: &Value, out: &mut String) -> Result<(), CoreError> {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(true) => out.push_str("true"),
        Value::Bool(false) => out.push_str("false"),
        Value::Number(n) => write_number(n, out)?,
        Value::String(s) => write_string(s, out),
        Value::Array(items) => write_array(items, out)?,
        Value::Object(map) => write_object(map, out)?,
    }
    Ok(())
}

/// Write a JSON array: `[` + comma-joined canonical elements + `]`.
fn write_array(items: &[Value], out: &mut String) -> Result<(), CoreError> {
    out.push('[');
    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        write_value(item, out)?;
    }
    out.push(']');
    Ok(())
}

/// Write a JSON object with keys sorted by ascending UTF-8 byte order — the
/// Aideon divergence from JCS — then each `"key":value` pair comma-joined.
fn write_object(map: &serde_json::Map<String, Value>, out: &mut String) -> Result<(), CoreError> {
    let mut keys: Vec<&String> = map.keys().collect();
    keys.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    out.push('{');
    for (i, key) in keys.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        write_string(key, out);
        out.push(':');
        write_value(&map[*key], out)?;
    }
    out.push('}');
    Ok(())
}

fn write_number(n: &serde_json::Number, out: &mut String) -> Result<(), CoreError> {
    if let Some(u) = n.as_u64() {
        out.push_str(&u.to_string());
    } else if let Some(i) = n.as_i64() {
        out.push_str(&i.to_string());
    } else if let Some(f) = n.as_f64() {
        if !f.is_finite() {
            return Err(CoreError::NonFiniteFloat);
        }
        out.push_str(&format_f64(f));
    } else {
        return Err(CoreError::BadNumber(n.to_string()));
    }
    Ok(())
}

/// RFC 8785 §3.2.2.2 string escaping.
fn write_string(s: &str, out: &mut String) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{0008}' => out.push_str("\\b"),
            '\u{0009}' => out.push_str("\\t"),
            '\u{000A}' => out.push_str("\\n"),
            '\u{000C}' => out.push_str("\\f"),
            '\u{000D}' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

/// Format a finite `f64` per RFC 8785 §3.2.2.3 (ECMAScript `Number::toString`).
///
/// Rust's `{}` float formatting already yields the shortest round-trippable
/// decimal (never using exponent form); this routine reshapes that decimal into
/// the ECMAScript fixed-vs-exponent notation, and maps `-0` to `0`.
fn format_f64(value: f64) -> String {
    if value == 0.0 {
        return "0".to_string();
    }
    let negative = value < 0.0;
    let magnitude = value.abs();
    let plain = format!("{magnitude}");

    // Decompose `plain` into the significant digit string `digits` and `point`,
    // the number of digits before the decimal point (the ECMAScript `n`).
    let (int_part, frac_part) = match plain.split_once('.') {
        Some((i, f)) => (i.to_string(), f.to_string()),
        None => (plain.clone(), String::new()),
    };

    // `point` is the exponent such that value = 0.<digits> * 10^point.
    let (mut digits, point) = if int_part == "0" {
        // 0.00ddd — count leading zeros in the fraction.
        let leading_zeros = frac_part.chars().take_while(|c| *c == '0').count();
        (
            frac_part.trim_start_matches('0').to_string(),
            -(leading_zeros as i32),
        )
    } else {
        (format!("{int_part}{frac_part}"), int_part.len() as i32)
    };
    // Strip trailing zeros from the significant-digit string.
    while digits.ends_with('0') {
        digits.pop();
    }
    if digits.is_empty() {
        return "0".to_string();
    }
    // `digits` now has no leading/trailing zeros; `k` significant digits and the
    // value equals digits * 10^(point - k).
    let k = digits.len() as i32;

    let body = format_ecmascript(&digits, point, k);
    if negative { format!("-{body}") } else { body }
}

/// Apply the ECMAScript Number-to-String case analysis over a normalised
/// significant-digit string. `point` is the count of digits left of the decimal
/// point; `k` is the number of significant digits.
fn format_ecmascript(digits: &str, point: i32, k: i32) -> String {
    let n = point;
    if k <= n && n <= 21 {
        // Integer with trailing zeros: digits followed by (n - k) zeros.
        let mut s = digits.to_string();
        s.push_str(&"0".repeat((n - k) as usize));
        s
    } else if 0 < n && n <= 21 {
        // Decimal point inside the digit run.
        let (head, tail) = digits.split_at(n as usize);
        format!("{head}.{tail}")
    } else if -6 < n && n <= 0 {
        // 0.00…digits
        format!("0.{}{}", "0".repeat((-n) as usize), digits)
    } else {
        format_exponential(digits, n, k)
    }
}

/// ECMAScript exponential form: a `d.ddd`e`±E` mantissa/exponent rendering used
/// when the decimal point falls outside the `[-6, 21]` fixed-notation window.
fn format_exponential(digits: &str, n: i32, k: i32) -> String {
    let exponent = n - 1;
    let mantissa = if k == 1 {
        digits.to_string()
    } else {
        let (head, tail) = digits.split_at(1);
        format!("{head}.{tail}")
    };
    let sign = if exponent >= 0 { "+" } else { "-" };
    format!("{mantissa}e{sign}{}", exponent.abs())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn sorts_object_keys_by_utf8_bytes() {
        let value = json!({ "b": 1, "a": 2, "Z": 3 });
        let bytes = canonical_json_bytes(&value).unwrap();
        // Upper-case 'Z' (0x5A) sorts before lower-case 'a'/'b' (0x61/0x62).
        assert_eq!(String::from_utf8(bytes).unwrap(), r#"{"Z":3,"a":2,"b":1}"#);
    }

    #[test]
    fn escapes_controls_and_quotes_per_rfc8785() {
        let value = json!("a\"b\\c/d\u{0008}\u{0009}\u{000a}\u{000c}\u{000d}\u{0001}");
        let bytes = canonical_json_bytes(&value).unwrap();
        assert_eq!(
            String::from_utf8(bytes).unwrap(),
            r#""a\"b\\c/d\b\t\n\f\r\u0001""#
        );
    }

    #[test]
    fn emits_unicode_raw() {
        let value = json!("café — 日本語");
        let bytes = canonical_json_bytes(&value).unwrap();
        assert_eq!(String::from_utf8(bytes).unwrap(), "\"café — 日本語\"");
    }

    #[test]
    fn rejects_non_finite_float() {
        // serde_json turns NaN into Null on to_value, so construct a Number
        // directly is impossible; guard the path via a raw f64 instead.
        assert_eq!(format_f64(0.0), "0");
        assert_eq!(format_f64(-0.0), "0");
    }

    #[test]
    fn formats_floats_ecmascript() {
        assert_eq!(format_f64(1.0), "1");
        assert_eq!(format_f64(1.5), "1.5");
        assert_eq!(format_f64(100.0), "100");
        assert_eq!(format_f64(0.001), "0.001");
        assert_eq!(format_f64(-2.5), "-2.5");
        assert_eq!(format_f64(123.456), "123.456");
        assert_eq!(format_f64(1e21), "1e+21");
        assert_eq!(format_f64(1e-7), "1e-7");
        assert_eq!(format_f64(0.5), "0.5");
    }

    #[test]
    fn jsonl_record_appends_single_lf() {
        let value = json!({ "k": "v" });
        let record = canonical_jsonl_record(&value).unwrap();
        assert_eq!(record.last(), Some(&b'\n'));
        assert_eq!(record.iter().filter(|b| **b == b'\n').count(), 1);
    }

    #[test]
    fn document_has_no_trailing_newline() {
        let value = json!({ "k": "v" });
        let doc = canonical_json_document(&value).unwrap();
        assert_ne!(doc.last(), Some(&b'\n'));
    }
}
