/**
 * Network config — populated after `pnpm deploy`.
 * Import this everywhere instead of hardcoding contract IDs.
 */

export const NETWORK_CONFIG = {
  network: "testnet" as const,
  rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  contracts: {
    lendingPool:  process.env.NEXT_PUBLIC_LENDING_POOL_ID  ?? "",
    verifier:     process.env.NEXT_PUBLIC_VERIFIER_ID      ?? "",
    oracle:       process.env.NEXT_PUBLIC_ORACLE_ID        ?? "",
    creditIssuer: process.env.NEXT_PUBLIC_CREDIT_ISSUER_ID ?? "",
    paymentPool:  process.env.NEXT_PUBLIC_PAYMENT_POOL_ID  ?? "",
  },
  // USDC token contract on testnet (Stellar's circle testnet USDC)
  usdcToken: process.env.NEXT_PUBLIC_USDC_TOKEN ?? "",
} as const;
