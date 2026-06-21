//! The workspace writer lock: a non-blocking exclusive OS advisory lock held on
//! an open file handle for the whole writable session
//! ([workspace-integrity-and-recovery], "File locking and concurrent open").
//!
//! Acquisition is the only liveness test — there is no PID probe. The OS
//! releases the lock when the process exits, including a crash, so a stale lock
//! file has no locking meaning. The lock file lives under `.aideon/runtime/`.

use std::fs::{self, File, OpenOptions, TryLockError};

use crate::error::{Result, StoreError};
use crate::paths::Paths;

/// An held exclusive writer lock. Dropping it releases the OS lock.
#[derive(Debug)]
pub struct WriterLock {
    // The handle must stay open for the lock to be held; `unlock` on drop is
    // implicit (the OS releases on close), but we release explicitly too.
    file: File,
}

impl WriterLock {
    /// Attempt to acquire the exclusive writer lock without blocking. Returns
    /// [`StoreError::WorkspaceLocked`] if another writer holds it or exclusivity
    /// cannot be established.
    pub fn acquire(paths: &Paths) -> Result<Self> {
        let lock_path = paths.lock_file();
        if let Some(parent) = lock_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&lock_path)?;

        match file.try_lock() {
            Ok(()) => Ok(Self { file }),
            Err(TryLockError::WouldBlock) => Err(StoreError::WorkspaceLocked),
            Err(TryLockError::Error(e)) => Err(StoreError::Io(e)),
        }
    }
}

impl Drop for WriterLock {
    fn drop(&mut self) {
        let _ = self.file.unlock();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn second_acquire_is_refused_then_freed_on_drop() {
        let dir = tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let first = WriterLock::acquire(&paths).unwrap();
        assert!(matches!(
            WriterLock::acquire(&paths),
            Err(StoreError::WorkspaceLocked)
        ));
        drop(first);
        // After releasing, a fresh acquire succeeds.
        let _second = WriterLock::acquire(&paths).unwrap();
    }
}
