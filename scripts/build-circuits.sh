#!/usr/bin/env bash
# scripts/build-circuits.sh
# Compiles all Noir circuits and exports:
#   - compiled JSON artifacts  → web/public/circuits/*.json
#   - verification keys        → web/public/circuits/*.vk.json
set -euo pipefail

CIRCUITS_DIR="$(cd "$(dirname "$0")/../circuits" && pwd)"
OUT_DIR="$(cd "$(dirname "$0")/../web/public/circuits" && pwd)"

mkdir -p "$OUT_DIR"

CIRCUITS=("open_position" "liquidate" "repay_withdraw" "solvency")

for CIRCUIT in "${CIRCUITS[@]}"; do
  echo ""
  echo "► Compiling circuit: $CIRCUIT"
  cd "$CIRCUITS_DIR/$CIRCUIT"

  # Compile Noir circuit to bytecode
  nargo compile

  # Copy compiled artifact to web/public
  cp "target/${CIRCUIT}.json" "$OUT_DIR/${CIRCUIT}.json"
  echo "  Artifact → web/public/circuits/${CIRCUIT}.json"

  # Generate UltraHonk verification key
  echo "  Generating verification key…"
  bb write_vk \
    --scheme ultra_honk \
    -b "target/${CIRCUIT}.json" \
    -o "$OUT_DIR/${CIRCUIT}.vk"
  echo "  VK → web/public/circuits/${CIRCUIT}.vk"
done

echo ""
echo "=== Circuits built. Artifacts in web/public/circuits/ ==="
echo "Next: pnpm build:contracts && pnpm deploy"
