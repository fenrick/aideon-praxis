#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_PLANTUML="$ROOT_DIR/docs/c4/out/plantuml"
OUT_PNG="$ROOT_DIR/docs/c4/out/png"
mkdir -p "$OUT_PLANTUML" "$OUT_PNG"

CLI_JAR="$ROOT_DIR/.tools/structurizr-cli/structurizr-cli.jar"
PLANTUML_JAR="$ROOT_DIR/.tools/plantuml/plantuml.jar"

if [[ ! -f "$CLI_JAR" ]]; then
  echo "[render-c4] Downloading Structurizr CLI…"
  mkdir -p "$ROOT_DIR/.tools/structurizr-cli"
  TMP_ZIP="$(mktemp -t structurizr-cli.XXXXXX.zip)"
  # Ensure temporary ZIP is removed even on failure
  cleanup() { rm -f "$TMP_ZIP"; }
  trap cleanup EXIT
  # Use GitHub's latest release redirect to avoid pinned stale versions
  curl -fSL -o "$TMP_ZIP" \
    https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip
  unzip -q -o "$TMP_ZIP" -d "$ROOT_DIR/.tools/structurizr-cli"
  mv "$ROOT_DIR/.tools/structurizr-cli"/structurizr-cli-*.jar "$CLI_JAR"
  cleanup && trap - EXIT
fi

if [[ ! -f "$PLANTUML_JAR" ]]; then
  echo "[render-c4] Downloading PlantUML…"
  mkdir -p "$ROOT_DIR/.tools/plantuml"
  curl -sSL -o "$PLANTUML_JAR" https://github.com/plantuml/plantuml/releases/download/v1.2024.6/plantuml-1.2024.6.jar
fi

echo "[render-c4] Export PlantUML from DSL…"
java -jar "$CLI_JAR" export \
  -workspace "$ROOT_DIR/docs/c4/workspace.dsl" \
  -format plantuml \
  -output "$OUT_PLANTUML"

echo "[render-c4] Render PNG from PlantUML…"
java -Djava.awt.headless=true -jar "$PLANTUML_JAR" -tpng "$OUT_PLANTUML"/*.puml -o "$OUT_PNG"

echo "[render-c4] Done. See $OUT_PNG"
