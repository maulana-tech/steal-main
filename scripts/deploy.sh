#!/usr/bin/env bash
# scripts/deploy.sh
# Deploys all Eclipse contracts to Stellar testnet and writes
# contract IDs to packages/sdk/src/config.ts and .env.
set -euo pipefail

source "$(dirname "$0")/../.env" 2>/dev/null || true

NETWORK="${STELLAR_NETWORK:-testnet}"
DEPLOYER="${DEPLOYER_IDENTITY:-deployer}"
WASM_DIR="$(cd "$(dirname "$0")/../contracts/target/wasm32-unknown-unknown/release" && pwd)"
SDK_CONFIG="$(cd "$(dirname "$0")/../packages/sdk/src" && pwd)/config.ts"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

deploy_contract() {
  local NAME=$1
  local WASM=$2
  echo ""
  echo "► Deploying $NAME…"
  local ID
  ID=$(stellar contract deploy \
    --wasm "$WASM" \
    --source "$DEPLOYER" \
    --network "$NETWORK" \
    --ignore-checks)
  echo "  $NAME contract ID: $ID"
  echo "$ID"
}

echo "=== Deploying Eclipse to $NETWORK ==="

VERIFIER_ID=$(deploy_contract "UltraHonkVerifier" "$WASM_DIR/eclipse_verifier.wasm")
ORACLE_ID=$(deploy_contract "Oracle" "$WASM_DIR/eclipse_oracle.wasm")
CREDIT_ISSUER_ID=$(deploy_contract "CreditIssuer" "$WASM_DIR/eclipse_credit_issuer.wasm")
LENDING_POOL_ID=$(deploy_contract "LendingPool" "$WASM_DIR/eclipse_lending_pool.wasm")
PAYMENT_POOL_ID=$(deploy_contract "PaymentPool" "$WASM_DIR/eclipse_payment_pool.wasm")

echo ""
echo "=== Deployment complete! ==="
echo "Verifier:     $VERIFIER_ID"
echo "Oracle:       $ORACLE_ID"
echo "CreditIssuer: $CREDIT_ISSUER_ID"
echo "LendingPool:  $LENDING_POOL_ID"
echo "PaymentPool:  $PAYMENT_POOL_ID"

# Write to .env (idempotent: strip any previous contract-ID lines first so
# re-deploys overwrite instead of accumulating duplicate keys)
if [ -f "$ENV_FILE" ]; then
  grep -vE '^(LENDING_POOL_ID|VERIFIER_ID|ORACLE_ID|CREDIT_ISSUER_ID|PAYMENT_POOL_ID)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
  mv "$ENV_FILE.tmp" "$ENV_FILE"
fi
{
  echo "LENDING_POOL_ID=$LENDING_POOL_ID"
  echo "VERIFIER_ID=$VERIFIER_ID"
  echo "ORACLE_ID=$ORACLE_ID"
  echo "CREDIT_ISSUER_ID=$CREDIT_ISSUER_ID"
  echo "PAYMENT_POOL_ID=$PAYMENT_POOL_ID"
} >> "$ENV_FILE"
echo ""
echo "Contract IDs written to .env"

# Also write NEXT_PUBLIC_ vars to .env.local for Next.js
ENV_LOCAL="$(cd "$(dirname "$0")/../web" && pwd)/.env.local"
cat > "$ENV_LOCAL" <<EOF
NEXT_PUBLIC_STELLAR_RPC_URL=${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_LENDING_POOL_ID=$LENDING_POOL_ID
NEXT_PUBLIC_VERIFIER_ID=$VERIFIER_ID
NEXT_PUBLIC_ORACLE_ID=$ORACLE_ID
NEXT_PUBLIC_CREDIT_ISSUER_ID=$CREDIT_ISSUER_ID
NEXT_PUBLIC_PAYMENT_POOL_ID=$PAYMENT_POOL_ID
NEXT_PUBLIC_USDC_TOKEN=${USDC_TOKEN:-}
EOF
echo "Next.js env written to web/.env.local"

echo ""
echo "Next: pnpm dev"
