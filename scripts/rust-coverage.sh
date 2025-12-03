#!/usr/bin/env bash
set -euo pipefail

# Generate Rust coverage (LCOV) for the Tauri crate using grcov.
# Requires: nightly or stable with llvm-tools-preview and grcov installed.

CRATE_DIR="crates/desktop"
OUT_DIR="$CRATE_DIR/coverage"

if ! command -v grcov >/dev/null 2>&1; then
  echo "grcov not found, skipping Rust coverage generation. Install with: cargo install grcov" >&2
  exit 0
fi

export CARGO_INCREMENTAL=0
export RUSTFLAGS="-Cinstrument-coverage"
export LLVM_PROFILE_FILE="${OUT_DIR}/aideon-%p-%m.profraw"

mkdir -p "$OUT_DIR"

echo "Running cargo test with coverage instrumentation..."
cargo test --manifest-path "$CRATE_DIR/Cargo.toml" --all --all-features

echo "Generating LCOV report..."
grcov "$OUT_DIR" -s . -t lcov --llvm --branch --ignore-not-existing \
  --ignore "*/.cargo/*" --ignore "*/target/*" -o "$OUT_DIR/lcov.info"

echo "Rust coverage LCOV written to $OUT_DIR/lcov.info"
