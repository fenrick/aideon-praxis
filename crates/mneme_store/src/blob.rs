//! The content-addressed object store ([content-addressed-blobs], [ADR-0003]).
//!
//! Bytes are staged in host-local `.aideon/runtime/staging/blobs/<random>.part`
//! (hashing as they go), fsynced, then atomically renamed to
//! `objects/sha256/<aa>/<bb>/<digest>` — so the object root only ever holds
//! valid hash-addressed objects, and the **object is durably committed before**
//! the referencing operation is appended. Reads re-hash and verify; a mismatch
//! is quarantined (a `Corruption`), never served.

use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::Write;

use sha2::{Digest, Sha256};
use uuid::Uuid;

use mneme_core::value::{BlobRef, U64Str};

use crate::atomic::fsync_parent;
use crate::error::{Result, StoreError};
use crate::paths::Paths;

/// Hash `bytes` with SHA-256 and return the lower-case hex digest.
#[must_use]
pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Write `bytes` into the object store, returning the typed [`BlobRef`]. The
/// write is idempotent: an object already present at the address is left as-is.
pub fn write_blob(paths: &Paths, bytes: &[u8], media_type: Option<String>) -> Result<BlobRef> {
    let digest = sha256_hex(bytes);
    let final_path = paths.object_path(&digest);
    if !final_path.exists() {
        let staging = paths.staging_blobs_dir();
        fs::create_dir_all(&staging)?;
        let part = staging.join(format!("{}.part", Uuid::new_v4().simple()));
        {
            let mut file = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&part)?;
            file.write_all(bytes)?;
            file.sync_all()?;
        }
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&part, &final_path)?;
        fsync_parent(&final_path)?;
    }
    Ok(BlobRef {
        algorithm: "sha256".to_string(),
        digest,
        length: U64Str(bytes.len() as u64),
        media_type,
    })
}

/// Read and verify an object referenced by a [`BlobRef`]. A digest or length
/// mismatch is reported as corruption rather than serving wrong bytes.
pub fn read_blob(paths: &Paths, blob: &BlobRef) -> Result<Vec<u8>> {
    if blob.algorithm != "sha256" {
        return Err(StoreError::Corruption(format!(
            "unsupported blob algorithm `{}`",
            blob.algorithm
        )));
    }
    let path = paths.object_path(&blob.digest);
    let bytes = fs::read(&path)?;
    if bytes.len() as u64 != blob.length.0 {
        return Err(StoreError::Corruption(format!(
            "blob {} length mismatch (claimed {}, found {})",
            blob.digest,
            blob.length.0,
            bytes.len()
        )));
    }
    let actual = sha256_hex(&bytes);
    if actual != blob.digest {
        return Err(StoreError::Corruption(format!(
            "blob {} failed its content address (found {actual})",
            blob.digest
        )));
    }
    Ok(bytes)
}

/// Scan the object store, returning `(digest, byte_length)` for every object.
pub fn list_objects(paths: &Paths) -> Result<Vec<(String, u64)>> {
    let root = paths.objects_dir();
    let mut objects = Vec::new();
    if !root.exists() {
        return Ok(objects);
    }
    for aa in fs::read_dir(&root)? {
        let aa = aa?;
        if !aa.file_type()?.is_dir() {
            continue;
        }
        for bb in fs::read_dir(aa.path())? {
            let bb = bb?;
            if !bb.file_type()?.is_dir() {
                continue;
            }
            for obj in fs::read_dir(bb.path())? {
                let obj = obj?;
                if !obj.file_type()?.is_file() {
                    continue;
                }
                let Some(digest) = obj.file_name().to_str().map(str::to_owned) else {
                    continue;
                };
                let len = obj.metadata()?.len();
                objects.push((digest, len));
            }
        }
    }
    objects.sort();
    Ok(objects)
}

/// A conservative dry-run orphan report: the digests of objects not referenced
/// by any retained canonical operation. M0 never deletes — disk is cheaper than
/// a dangling reference ([workspace-integrity-and-recovery], GC).
pub fn orphan_report(paths: &Paths, referenced: &HashSet<String>) -> Result<Vec<String>> {
    Ok(list_objects(paths)?
        .into_iter()
        .map(|(digest, _)| digest)
        .filter(|digest| !referenced.contains(digest))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn write_then_read_round_trips_and_verifies() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let blob = write_blob(&paths, b"hello world", Some("text/plain".into())).unwrap();
        assert_eq!(blob.algorithm, "sha256");
        assert_eq!(blob.length.0, 11);
        assert_eq!(read_blob(&paths, &blob).unwrap(), b"hello world");
    }

    #[test]
    fn tampered_object_fails_its_address() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let blob = write_blob(&paths, b"hello", None).unwrap();
        fs::write(paths.object_path(&blob.digest), b"world").unwrap();
        assert!(matches!(
            read_blob(&paths, &blob),
            Err(StoreError::Corruption(_))
        ));
    }

    #[test]
    fn orphan_report_lists_unreferenced_objects() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let kept = write_blob(&paths, b"kept", None).unwrap();
        let orphan = write_blob(&paths, b"orphan", None).unwrap();
        let mut referenced = HashSet::new();
        referenced.insert(kept.digest.clone());
        let report = orphan_report(&paths, &referenced).unwrap();
        assert_eq!(report, vec![orphan.digest]);
    }
}
