//! Operation segments: the append-safe loose segment, immutable sealed
//! segments, the trailing checksum record, framing/truncation recovery, and
//! sealed-segment corruption detection ([workspace-integrity-and-recovery],
//! "Segment sealing and append safety").
//!
//! A record is one canonical JSONL line (canonical value + one LF). The loose
//! segment `current.ops.jsonl` is the only file that can end mid-record after a
//! crash; sealed segments carry a checksum and are whole by construction.

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::Path;

use serde_json::json;

use mneme_core::canonical::{blake3_hex, canonical_jsonl_record};

use crate::atomic::fsync_parent;
use crate::error::{Result, StoreError};
use crate::paths::Paths;

/// The reserved discriminator of a sealed-segment checksum record.
pub const SEGMENT_CHECKSUM_RECORD_TYPE: &str = "segment-checksum";

/// The outcome of recovering the loose segment on open.
#[derive(Debug)]
pub struct LooseRecovery {
    /// The complete record lines (without their terminating LF).
    pub records: Vec<String>,
    /// Byte length of the valid prefix (the next append offset).
    pub valid_len: u64,
    /// Whether a partial trailing record was discarded.
    pub truncated: bool,
}

/// Append-only writer over the loose segment, fsyncing on every append.
#[derive(Debug)]
pub struct SegmentWriter {
    file: File,
    len: u64,
}

impl SegmentWriter {
    /// Open (or create) the loose segment for appending.
    pub fn open(paths: &Paths) -> Result<Self> {
        let path = paths.current_segment();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .read(true)
            .append(true)
            .create(true)
            .open(&path)?;
        let len = file.metadata()?.len();
        Ok(Self { file, len })
    }

    /// Append one canonical record (already including its trailing LF) and
    /// fsync — the durable commit point. Returns the new segment length.
    pub fn append(&mut self, record_bytes: &[u8]) -> Result<u64> {
        debug_assert_eq!(record_bytes.last(), Some(&b'\n'));
        self.file.write_all(record_bytes)?;
        self.file.sync_all()?;
        self.len += record_bytes.len() as u64;
        Ok(self.len)
    }

    /// Current loose-segment byte length.
    #[must_use]
    pub fn len(&self) -> u64 {
        self.len
    }

    /// Whether the loose segment is empty.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }
}

/// Scan the loose segment, accepting every complete LF-terminated JSON line and
/// truncating a partial trailing record so the next append starts clean.
pub fn recover_loose_tail(paths: &Paths) -> Result<LooseRecovery> {
    let path = paths.current_segment();
    if !path.exists() {
        return Ok(LooseRecovery {
            records: Vec::new(),
            valid_len: 0,
            truncated: false,
        });
    }
    let data = fs::read(&path)?;
    let mut records = Vec::new();
    let mut offset = 0usize;
    let mut valid_len = 0usize;
    while offset < data.len() {
        let Some(rel) = data[offset..].iter().position(|b| *b == b'\n') else {
            // No terminating newline before EOF: a partial trailing record.
            break;
        };
        let line_end = offset + rel; // index of the LF
        let line = &data[offset..line_end];
        // Framing requires a complete, parseable JSON line.
        if serde_json::from_slice::<serde_json::Value>(line).is_err() {
            break;
        }
        records.push(String::from_utf8_lossy(line).into_owned());
        valid_len = line_end + 1;
        offset = line_end + 1;
    }
    let truncated = valid_len != data.len();
    if truncated {
        let file = OpenOptions::new().write(true).open(&path)?;
        file.set_len(valid_len as u64)?;
        file.sync_all()?;
    }
    Ok(LooseRecovery {
        records,
        valid_len: valid_len as u64,
        truncated,
    })
}

/// The ascending list of sealed segment sequence numbers, validating the
/// six-digit naming, the `000001` start, and that there is no gap.
pub fn list_sealed_segments(paths: &Paths) -> Result<Vec<u32>> {
    let dir = paths.ops_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut seqnos = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if name == "current.ops.jsonl" {
            continue;
        }
        let Some(seq) = name.strip_suffix(".ops.jsonl") else {
            continue;
        };
        if seq.len() != 6 || !seq.bytes().all(|b| b.is_ascii_digit()) {
            return Err(StoreError::Corruption(format!(
                "invalid segment filename `{name}` (format v1 requires six digits)"
            )));
        }
        let value: u32 = seq
            .parse()
            .map_err(|_| StoreError::Corruption(format!("unparseable segment `{name}`")))?;
        if value == 0 {
            return Err(StoreError::Corruption(
                "000000.ops.jsonl is reserved and invalid".to_string(),
            ));
        }
        seqnos.push(value);
    }
    seqnos.sort_unstable();
    for (i, seq) in seqnos.iter().enumerate() {
        let expected = i as u32 + 1;
        if *seq != expected {
            return Err(StoreError::Corruption(format!(
                "segment sequence gap: expected {expected:06}, found {seq:06}"
            )));
        }
    }
    Ok(seqnos)
}

/// Verify a sealed segment's checksum and return its operation record lines
/// (excluding the trailing checksum record). A mismatch or framing fault in a
/// sealed segment is corruption, never truncation.
pub fn verify_sealed_segment(path: &Path) -> Result<Vec<String>> {
    let data = fs::read(path)?;
    let mut line_spans = Vec::new(); // (start, end_incl_lf)
    let mut offset = 0usize;
    while offset < data.len() {
        let Some(rel) = data[offset..].iter().position(|b| *b == b'\n') else {
            return Err(StoreError::Corruption(format!(
                "sealed segment {path:?} ends mid-record"
            )));
        };
        let end = offset + rel + 1;
        line_spans.push((offset, end));
        offset = end;
    }
    let Some((checksum_start, _)) = line_spans.last().copied() else {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} is empty"
        )));
    };
    let checksum_line = &data[checksum_start..data.len() - 1];
    let checksum: serde_json::Value = serde_json::from_slice(checksum_line)
        .map_err(|e| StoreError::Corruption(format!("checksum record not JSON: {e}")))?;
    if checksum.get("record_type").and_then(|v| v.as_str()) != Some(SEGMENT_CHECKSUM_RECORD_TYPE) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} has no trailing segment-checksum record"
        )));
    }

    let covered = &data[..checksum_start];
    let expected_bytes = checksum.get("bytes").and_then(serde_json::Value::as_u64);
    if expected_bytes != Some(checksum_start as u64) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} checksum byte count mismatch"
        )));
    }
    let actual_digest = blake3_hex(covered);
    if checksum.get("digest").and_then(|v| v.as_str()) != Some(actual_digest.as_str()) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} checksum digest mismatch"
        )));
    }

    let op_count = line_spans.len() - 1;
    if checksum.get("records").and_then(serde_json::Value::as_u64) != Some(op_count as u64) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} record count mismatch"
        )));
    }

    let mut records = Vec::with_capacity(op_count);
    for (start, end) in &line_spans[..op_count] {
        records.push(String::from_utf8_lossy(&data[*start..*end - 1]).into_owned());
    }
    Ok(records)
}

/// Build the canonical checksum-record bytes (one JSONL line) covering
/// `covered` bytes / `records` op records.
pub fn checksum_record_bytes(covered: &[u8], records: usize) -> Result<Vec<u8>> {
    let value = json!({
        "record_type": SEGMENT_CHECKSUM_RECORD_TYPE,
        "algorithm": "blake3-256",
        "digest": blake3_hex(covered),
        "records": records,
        "bytes": covered.len(),
    });
    Ok(canonical_jsonl_record(&value)?)
}

/// Seal the loose segment: append its checksum, fsync, rename to the next
/// six-digit name, fsync the directory, and start a fresh empty loose segment.
pub fn seal_current(paths: &Paths, next_seqno: u32, op_records: usize) -> Result<()> {
    let current = paths.current_segment();
    let covered = fs::read(&current)?;
    let checksum = checksum_record_bytes(&covered, op_records)?;
    {
        let mut file = OpenOptions::new().append(true).open(&current)?;
        file.write_all(&checksum)?;
        file.sync_all()?;
    }
    let sealed = paths.sealed_segment(next_seqno);
    fs::rename(&current, &sealed)?;
    fsync_parent(&sealed)?;
    // Fresh empty loose segment.
    let fresh = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&current)?;
    fresh.sync_all()?;
    fsync_parent(&current)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn record(line: &str) -> Vec<u8> {
        let mut v = line.as_bytes().to_vec();
        v.push(b'\n');
        v
    }

    #[test]
    fn append_then_recover_reads_all_records() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let mut w = SegmentWriter::open(&paths).unwrap();
        w.append(&record(r#"{"a":1}"#)).unwrap();
        w.append(&record(r#"{"b":2}"#)).unwrap();
        drop(w);
        let recovered = recover_loose_tail(&paths).unwrap();
        assert_eq!(recovered.records.len(), 2);
        assert!(!recovered.truncated);
    }

    #[test]
    fn torn_final_record_is_truncated_not_lost() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let mut w = SegmentWriter::open(&paths).unwrap();
        w.append(&record(r#"{"whole":1}"#)).unwrap();
        drop(w);
        // Simulate a torn append: a partial line with no terminating newline.
        let mut f = OpenOptions::new()
            .append(true)
            .open(paths.current_segment())
            .unwrap();
        f.write_all(br#"{"partial":"#).unwrap();
        f.sync_all().unwrap();
        drop(f);

        let recovered = recover_loose_tail(&paths).unwrap();
        assert_eq!(recovered.records.len(), 1, "only the whole record survives");
        assert!(recovered.truncated);
        // The file was truncated to the last whole record.
        let again = recover_loose_tail(&paths).unwrap();
        assert!(!again.truncated, "second open sees a clean tail");
        assert_eq!(again.records.len(), 1);
    }

    #[test]
    fn seal_then_verify_round_trips() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let mut w = SegmentWriter::open(&paths).unwrap();
        w.append(&record(r#"{"a":1}"#)).unwrap();
        w.append(&record(r#"{"b":2}"#)).unwrap();
        drop(w);
        seal_current(&paths, 1, 2).unwrap();
        let records = verify_sealed_segment(&paths.sealed_segment(1)).unwrap();
        assert_eq!(
            records,
            vec![r#"{"a":1}"#.to_string(), r#"{"b":2}"#.to_string()]
        );
        // A fresh loose segment exists and is empty.
        assert!(recover_loose_tail(&paths).unwrap().records.is_empty());
    }

    #[test]
    fn corrupt_sealed_segment_is_detected() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let mut w = SegmentWriter::open(&paths).unwrap();
        w.append(&record(r#"{"a":1}"#)).unwrap();
        drop(w);
        seal_current(&paths, 1, 1).unwrap();
        // Tamper with a sealed op record's bytes (same length).
        let sealed = paths.sealed_segment(1);
        let mut data = fs::read(&sealed).unwrap();
        let pos = data.iter().position(|b| *b == b'1').unwrap();
        data[pos] = b'9';
        fs::write(&sealed, &data).unwrap();
        assert!(matches!(
            verify_sealed_segment(&sealed),
            Err(StoreError::Corruption(_))
        ));
    }

    #[test]
    fn segment_listing_rejects_zero_and_gaps() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        fs::create_dir_all(paths.ops_dir()).unwrap();
        fs::write(paths.sealed_segment(2), b"").unwrap();
        // Only 000002 present (gap at 000001) -> corruption.
        assert!(list_sealed_segments(&paths).is_err());
    }
}
