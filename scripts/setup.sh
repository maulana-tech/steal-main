#!/usr/bin/env bash
# scripts/setup.sh
# Install all toolchain dependencies for Eclipse:
#   - Noir (nargo) + Barretenberg (bb)
#   - Soroban CLI
#   - Fund testnet deployer account via Friendbot
set -euo pipefail

echo "=== Eclipse Setup ==="

# ── Noir & Barretenberg ────────────────────────────────────────────────────────
echo ""
echo "► Installing Noir (nargo)…"
if ! command -v nargo &>/dev/null; then
  curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
  # shellcheck source=/dev/null
  source ~/.nargo/env
  noirup
else
  echo "  nargo already installed: $(nargo --version)"
fi

echo ""
echo "► Installing Barretenberg (bb)…"
if ! command -v bb &>/dev/null; then
  curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install | bash
  # shellcheck source=/dev/null
  source ~/.bb/env
  bbup
else
  echo "  bb already installed: $(bb --version 2>/dev/null || echo 'unknown')"
fi

# ── Soroban CLI ───────────────────────────────────────────────────────────────
echo ""
echo "► Installing Soroban CLI…"
if ! command -v stellar &>/dev/null; then
  cargo install --locked stellar-cli --features opt
else
  echo "  stellar CLI already installed: $(stellar --version)"
fi

# ── Stellar testnet account ───────────────────────────────────────────────────
echo ""
echo "► Setting up Stellar testnet network config…"
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" 2>/dev/null || true

if [ -n "${DEPLOYER_SECRET:-}" ]; then
  echo "► Adding deployer identity from DEPLOYER_SECRET…"
  stellar keys add deployer --secret-key "$DEPLOYER_SECRET" 2>/dev/null || true
  DEPLOYER_PUB=$(stellar keys address deployer)
  echo "  Deployer: $DEPLOYER_PUB"
  echo "► Funding via Friendbot…"
  curl -s "https://friendbot.stellar.org?addr=$DEPLOYER_PUB" | jq '.[] | .status' 2>/dev/null || true
else
  echo "  DEPLOYER_SECRET not set — skipping account funding."
  echo "  Generate a keypair at https://laboratory.stellar.org and set DEPLOYER_SECRET in .env"
fi

echo ""
echo "=== Setup complete! Next: pnpm build:circuits ==="
