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
///
/// A trailing `segment-checksum` record is also discarded: it means a seal
/// was interrupted after the checksum append but before the rename
/// ([workspace-integrity-and-recovery], "Mid-seal (before rename)") — the
/// loose segment is still authoritative, so the artifact is stripped and
/// sealing simply re-runs later.
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
    let mut records: Vec<(usize, String)> = Vec::new();
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
        records.push((offset, String::from_utf8_lossy(line).into_owned()));
        valid_len = line_end + 1;
        offset = line_end + 1;
    }
    let mut truncated = valid_len != data.len();
    if let Some((line_start, line)) = records.last()
        && is_checksum_record(line)
    {
        valid_len = *line_start;
        records.pop();
        truncated = true;
    }
    if truncated {
        let file = OpenOptions::new().write(true).open(&path)?;
        file.set_len(valid_len as u64)?;
        file.sync_all()?;
    }
    Ok(LooseRecovery {
        records: records.into_iter().map(|(_, line)| line).collect(),
        valid_len: valid_len as u64,
        truncated,
    })
}

/// Whether a loose-segment line is a sealed-segment checksum trailer rather
/// than an operation record.
fn is_checksum_record(line: &str) -> bool {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
        return false;
    };
    value.get("record_type").and_then(serde_json::Value::as_str)
        == Some(SEGMENT_CHECKSUM_RECORD_TYPE)
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
        let name = entry?.file_name();
        let Some(name) = name.to_str() else { continue };
        if let Some(seq) = parse_sealed_seqno(name)? {
            seqnos.push(seq);
        }
    }
    seqnos.sort_unstable();
    ensure_contiguous_from_one(&seqnos)?;
    Ok(seqnos)
}

/// Parse one directory entry name into its sealed sequence number, returning
/// `None` for entries that are not sealed segments (the loose segment or any
/// unrelated file) and an error for a malformed sealed-segment name.
fn parse_sealed_seqno(name: &str) -> Result<Option<u32>> {
    if name == "current.ops.jsonl" {
        return Ok(None);
    }
    let Some(seq) = name.strip_suffix(".ops.jsonl") else {
        return Ok(None);
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
    Ok(Some(value))
}

/// Ensure the sorted sequence numbers start at `000001` with no gap.
fn ensure_contiguous_from_one(seqnos: &[u32]) -> Result<()> {
    for (i, seq) in seqnos.iter().enumerate() {
        let expected = i as u32 + 1;
        if *seq != expected {
            return Err(StoreError::Corruption(format!(
                "segment sequence gap: expected {expected:06}, found {seq:06}"
            )));
        }
    }
    Ok(())
}

/// Verify a sealed segment's checksum and return its operation record lines
/// (excluding the trailing checksum record). A mismatch or framing fault in a
/// sealed segment is corruption, never truncation.
pub fn verify_sealed_segment(path: &Path) -> Result<Vec<String>> {
    let data = fs::read(path)?;
    let line_spans = split_sealed_lines(&data, path)?;
    let Some((checksum_start, _)) = line_spans.last().copied() else {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} is empty"
        )));
    };
    let checksum = parse_checksum_record(&data[checksum_start..data.len() - 1], path)?;

    let op_count = line_spans.len() - 1;
    verify_checksum_fields(&checksum, &data[..checksum_start], op_count, path)?;

    let mut records = Vec::with_capacity(op_count);
    for (start, end) in &line_spans[..op_count] {
        records.push(String::from_utf8_lossy(&data[*start..*end - 1]).into_owned());
    }
    Ok(records)
}

/// Split a sealed segment's bytes into LF-terminated line spans
/// `(start, end_incl_lf)`. A trailing byte with no LF is corruption, never
/// truncation, in a sealed segment.
fn split_sealed_lines(data: &[u8], path: &Path) -> Result<Vec<(usize, usize)>> {
    let mut line_spans = Vec::new();
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
    Ok(line_spans)
}

/// Parse the trailing checksum line and confirm it carries the reserved
/// segment-checksum discriminator.
fn parse_checksum_record(checksum_line: &[u8], path: &Path) -> Result<serde_json::Value> {
    let checksum: serde_json::Value = serde_json::from_slice(checksum_line)
        .map_err(|e| StoreError::Corruption(format!("checksum record not JSON: {e}")))?;
    if checksum.get("record_type").and_then(|v| v.as_str()) != Some(SEGMENT_CHECKSUM_RECORD_TYPE) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} has no trailing segment-checksum record"
        )));
    }
    Ok(checksum)
}

/// Confirm the checksum record's byte count, digest, and record count match the
/// covered operation bytes.
fn verify_checksum_fields(
    checksum: &serde_json::Value,
    covered: &[u8],
    op_count: usize,
    path: &Path,
) -> Result<()> {
    if checksum.get("bytes").and_then(serde_json::Value::as_u64) != Some(covered.len() as u64) {
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
    if checksum.get("records").and_then(serde_json::Value::as_u64) != Some(op_count as u64) {
        return Err(StoreError::Corruption(format!(
            "sealed segment {path:?} record count mismatch"
        )));
    }
    Ok(())
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
    fn interrupted_seal_checksum_trailer_is_discarded_on_recovery() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let mut w = SegmentWriter::open(&paths).unwrap();
        w.append(&record(r#"{"a":1}"#)).unwrap();
        drop(w);

        // Simulate a crash mid-seal: the checksum trailer is appended and
        // fsynced, but the rename to a sealed segment name never happens.
        let covered = fs::read(paths.current_segment()).unwrap();
        let checksum = checksum_record_bytes(&covered, 1).unwrap();
        let mut f = OpenOptions::new()
            .append(true)
            .open(paths.current_segment())
            .unwrap();
        f.write_all(&checksum).unwrap();
        f.sync_all().unwrap();
        drop(f);

        let recovered = recover_loose_tail(&paths).unwrap();
        assert_eq!(recovered.records, vec![r#"{"a":1}"#.to_string()]);
        assert!(
            recovered.truncated,
            "the checksum artifact must be stripped"
        );

        // The file itself is truncated back to the op record — a fresh
        // append lands directly after it, not after the discarded trailer.
        assert_eq!(fs::read(paths.current_segment()).unwrap(), covered);
        let again = recover_loose_tail(&paths).unwrap();
        assert!(!again.truncated, "second read sees a clean tail");
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
