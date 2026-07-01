#!/usr/bin/env bash
# scripts/build-circuits.sh
# Compiles all Noir circuits and exports:
#   - compiled JSON artifacts  → web/public/circuits/*.json
#   - verification keys        → web/public/circuits/*.vk.bin (bb CLI binary format)
set -euo pipefail

CIRCUITS_DIR="$(cd "$(dirname "$0")/../circuits" && pwd)"
OUT_DIR="$(cd "$(dirname "$0")/../web/public/circuits" && pwd)"

mkdir -p "$OUT_DIR"

# Compile all circuits via workspace
cd "$CIRCUITS_DIR"
nargo compile --workspace

CIRCUITS=("open_position" "liquidate" "repay_withdraw" "claim_payment")
# (solvency omitted — not verified on-chain)

for CIRCUIT in "${CIRCUITS[@]}"; do
  echo ""
  echo "► Copying artifact: $CIRCUIT"
  cp "target/${CIRCUIT}.json" "$OUT_DIR/${CIRCUIT}.json"
  echo "  Artifact → web/public/circuits/${CIRCUIT}.json"

  echo "  Generating UltraHonk VK via bb write_vk..."
  bb write_vk --scheme ultra_honk -b "target/${CIRCUIT}.json" -o "$OUT_DIR/${CIRCUIT}.vk"
  # bb creates a directory with a 'vk' file inside; strip trailing 4 bytes and rename
  dd if="$OUT_DIR/${CIRCUIT}.vk/vk" of="$OUT_DIR/${CIRCUIT}.vk.bin" bs=1 count=1760 2>/dev/null
  rm -rf "$OUT_DIR/${CIRCUIT}.vk"
  echo "  VK → web/public/circuits/${CIRCUIT}.vk.bin ($(wc -c < "$OUT_DIR/${CIRCUIT}.vk.bin") bytes)"
done

echo ""
echo "=== Circuits built. Artifacts in web/public/circuits/ ==="
echo "Next: pnpm build:contracts && pnpm deploy"
