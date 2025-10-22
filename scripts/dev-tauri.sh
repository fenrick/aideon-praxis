#!/usr/bin/env bash
set -euo pipefail

# Ensure cargo is available on PATH for the subshell; ignore if not present
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

cd packages/host
yarn dlx @tauri-apps/cli@latest dev

