//! Praxis engine initialization and setup.

use crate::PraxisEngine;
use crate::engine::config::PraxisEngineConfig;
use crate::engine::state::Inner;
use crate::error::PraxisResult;
use mneme_core::{MemoryStore, SqliteDb, Store};
use std::path::Path;
use std::sync::{Arc, Mutex};

impl PraxisEngine {
    pub fn new() -> Self {
        Self::with_config(PraxisEngineConfig::default())
    }

    pub fn with_config(config: PraxisEngineConfig) -> Self {
        Self::with_stores(config, Arc::new(MemoryStore::default()))
            .expect("in-memory praxis engine initialization failed")
    }

    pub fn with_sqlite(path: impl AsRef<Path>) -> PraxisResult<Self> {
        Self::with_sqlite_and_config(path, PraxisEngineConfig::default())
    }

    pub fn with_sqlite_and_config(
        path: impl AsRef<Path>,
        config: PraxisEngineConfig,
    ) -> PraxisResult<Self> {
        Self::with_sqlite_inner(path, config, true)
    }

    pub fn with_sqlite_unseeded(
        path: impl AsRef<Path>,
        config: PraxisEngineConfig,
    ) -> PraxisResult<Self> {
        Self::with_sqlite_inner(path, config, false)
    }

    pub fn with_stores(config: PraxisEngineConfig, store: Arc<dyn Store>) -> PraxisResult<Self> {
        Self::with_stores_inner(config, store, true)
    }

    pub fn with_stores_unseeded(
        config: PraxisEngineConfig,
        store: Arc<dyn Store>,
    ) -> PraxisResult<Self> {
        Self::with_stores_inner(config, store, false)
    }

    fn with_sqlite_inner(
        path: impl AsRef<Path>,
        config: PraxisEngineConfig,
        seed: bool,
    ) -> PraxisResult<Self> {
        let storage = SqliteDb::open(path)?;
        let commit_store: Arc<dyn Store> = Arc::new(storage.clone());
        Self::with_stores_inner(config, commit_store, seed)
    }

    fn with_stores_inner(
        config: PraxisEngineConfig,
        store: Arc<dyn Store>,
        seed: bool,
    ) -> PraxisResult<Self> {
        let inner = Inner::new(config, store)?;
        let engine = Self {
            inner: Arc::new(Mutex::new(inner)),
        };
        if seed {
            engine.ensure_seeded()?;
        }
        Ok(engine)
    }
}

impl Default for PraxisEngine {
    fn default() -> Self {
        Self::new()
    }
}
