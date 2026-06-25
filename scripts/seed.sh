#!/usr/bin/env bash
# scripts/seed.sh
# Creates demo credit attestation and sets initial oracle price.
# Run after deploy.sh.
set -euo pipefail

source "$(dirname "$0")/../.env" 2>/dev/null || true

NETWORK="${STELLAR_NETWORK:-testnet}"
DEPLOYER="${DEPLOYER_IDENTITY:-deployer}"

echo "=== Seeding Eclipse demo data ==="

# Set XLM price to $0.10 (100_000 scaled 1e6)
echo ""
echo "► Setting oracle price: XLM = \$0.10"
stellar contract invoke \
  --id "$ORACLE_ID" \
  --source "$DEPLOYER" \
  --network "$NETWORK" \
  -- set_price \
  --asset XLM \
  --price 100000

# Issue a demo credit attestation
# commitment = Poseidon2(demo_address_field, 720, nonce_1)
# [STUB] Pre-computed offline using @aztec/bb.js
DEMO_COMMITMENT="0000000000000000000000000000000000000000000000000000000000000001"
DEMO_BORROWER_KEY="0000000000000000000000000000000000000000000000000000000000000001"

echo ""
echo "► Issuing demo credit attestation (score=720, commitment=$DEMO_COMMITMENT)…"
stellar contract invoke \
  --id "$CREDIT_ISSUER_ID" \
  --source "$DEPLOYER" \
  --network "$NETWORK" \
  -- issue \
  --borrower_key "$DEMO_BORROWER_KEY" \
  --commitment "$DEMO_COMMITMENT"

echo ""
echo "=== Seed complete! You can now open the frontend and demo. ==="
