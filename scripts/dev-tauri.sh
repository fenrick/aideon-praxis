#!/usr/bin/env bash
set -euo pipefail

cd packages/host
yarn dlx @tauri-apps/cli@latest dev
