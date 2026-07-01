#!/usr/bin/env bash
# scripts/build-contracts.sh
# Builds all Soroban contracts to WASM.
set -euo pipefail

CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"

echo "=== Building Soroban contracts ==="
cd "$CONTRACTS_DIR"

stellar contract build

echo ""
echo "=== Contracts built. WASM files in contracts/target/wasm32v1-none/release/ ==="
