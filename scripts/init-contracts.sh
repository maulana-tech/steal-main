#!/usr/bin/env bash
# scripts/init-contracts.sh
# Initialize Eclipse contracts and register VKs on Stellar testnet.
set -euo pipefail 2>/dev/null || set -eu

source "$(dirname "$0")/../.env"

RPC="https://rpc.ankr.com/stellar_testnet_soroban"
PASS="Test SDF Network ; September 2015"
SRC="deployer"

echo "=== Initializing Eclipse contracts ==="

ADMIN=$(stellar keys address "$SRC")

# 1. Init Oracle
echo ""
echo "[Initializing Oracle]"
stellar contract invoke \
  --id "$ORACLE_ID" \
  --source "$SRC" \
  --rpc-url "$RPC" \
  --network-passphrase "$PASS" \
  -- \
  initialize \
  --admin "$ADMIN"

# 2. Init CreditIssuer
echo ""
echo "[Initializing CreditIssuer]"
stellar contract invoke \
  --id "$CREDIT_ISSUER_ID" \
  --source "$SRC" \
  --rpc-url "$RPC" \
  --network-passphrase "$PASS" \
  -- \
  initialize \
  --admin "$ADMIN"

# 3. Init LendingPool
echo ""
echo "[Initializing LendingPool]"
stellar contract invoke \
  --id "$LENDING_POOL_ID" \
  --source "$SRC" \
  --rpc-url "$RPC" \
  --network-passphrase "$PASS" \
  -- \
  initialize \
  --admin "$ADMIN" \
  --verifier "$VERIFIER_ID" \
  --oracle "$ORACLE_ID" \
  --credit-issuer "$CREDIT_ISSUER_ID" \
  --usdc-token "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" \
  --liq-threshold-bps 100

# 4. Init PaymentPool
if [ -n "${PAYMENT_POOL_ID:-}" ]; then
  echo ""
  echo "[Initializing PaymentPool]"
  stellar contract invoke \
    --id "$PAYMENT_POOL_ID" \
    --source "$SRC" \
    --rpc-url "$RPC" \
    --network-passphrase "$PASS" \
    -- \
    initialize \
    --admin "$ADMIN" \
    --verifier "$VERIFIER_ID" \
    --usdc-token "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
else
  echo ""
  echo "[PaymentPool init skipped - PAYMENT_POOL_ID not set]"
fi

# 5. Register verification keys for all circuits
echo ""
echo "[Registering VKs]"
VK_DIR="$(cd "$(dirname "$0")/../web/public/circuits" && pwd)"
for f in "$VK_DIR"/*.vk.bin; do
  name=$(basename "$f" .vk.bin)
  case "$name" in
    open_position)   id=0 ;;
    liquidate)       id=1 ;;
    repay_withdraw)  id=2 ;;
    claim_payment)   id=3 ;;
    *)               echo "  Skipping unknown VK: $name"; continue ;;
  esac
  echo "  Registering VK for $name (circuit $id)..."
  stellar contract invoke \
    --id "$VERIFIER_ID" \
    --source "$SRC" \
    --rpc-url "$RPC" \
    --network-passphrase "$PASS" \
    -- \
    set_vk \
    --circuit-id "$id" \
    --vk "$(xxd -p "$f" | tr -d '\n')"
done

echo ""
echo "=== Initialization completed! ==="
