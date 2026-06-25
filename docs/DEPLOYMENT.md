# Eclipse — Testnet Deployment

> Deployed: 2026-06-24
> Network: Stellar Testnet (Protocol 26 / Yardstick)
> Deployer: `GCMQN373E772MJ2K3HC62UGX3USHBFHNKDCQCOVRBOBPOMAJHC242VBG`

## Contract IDs

| Contract | Address |
|---|---|
| UltraHonkVerifier | `CDWIQUJ5VDPMA55R2SGO72VYJFYD4WLHMIADZ7UGATUVQ2DGVDA2EQEY` |
| Oracle | `CDLKV4IOHUZR7RV4Y6DNDGR2KQ5EJ3AJ55EHSSOAWZA4ZDRXQEBESYXK` |
| CreditIssuer | `CAYFRXZXTPVFZIX7QCKFTSOLCCY5OGLQIZ2KHPZR6WBIAWF4KBLBZK2M` |
| LendingPool | `CBZDSF7Z5F5QD3YISOERGYW6GRSICGNEACMKL6H2I4CIQHWU7HALRLWX` |

## Explorer Links

- [LendingPool](https://stellar.expert/explorer/testnet/contract/CBZDSF7Z5F5QD3YISOERGYW6GRSICGNEACMKL6H2I4CIQHWU7HALRLWX)
- [Verifier](https://stellar.expert/explorer/testnet/contract/CDWIQUJ5VDPMA55R2SGO72VYJFYD4WLHMIADZ7UGATUVQ2DGVDA2EQEY)
- [Oracle](https://stellar.expert/explorer/testnet/contract/CDLKV4IOHUZR7RV4Y6DNDGR2KQ5EJ3AJ55EHSSOAWZA4ZDRXQEBESYXK)
- [CreditIssuer](https://stellar.expert/explorer/testnet/contract/CAYFRXZXTPVFZIX7QCKFTSOLCCY5OGLQIZ2KHPZR6WBIAWF4KBLBZK2M)

## WASM Hashes (on-chain)

| Contract | WASM Hash |
|---|---|
| Verifier | `f21d319efaf2…` |
| Oracle | `1644aa27602b…` |
| CreditIssuer | `ce23ee67ce7e…` |
| LendingPool | `1918ea27eb38…` |

## Stack

- soroban-sdk: `22.0.8`
- stellar-cli: `21.4.1`
- Rust target: `wasm32-unknown-unknown` release

## Initialization & Seeding (2026-06-25)

The contracts were initialized and seeded with demo data:
- **Oracle Initialization**: [9b3fab06...](https://stellar.expert/explorer/testnet/tx/9b3fab0648be10420582a58c72417b4ae76830d713cc23df46d8e074678e0f9f)
- **CreditIssuer Initialization**: [fc92acc0...](https://stellar.expert/explorer/testnet/tx/fc92acc0fac1a5b84b488f91329546f1681d26d0d192c17df6d3c9b65ef148d7)
- **LendingPool Initialization**: [9feacee7...](https://stellar.expert/explorer/testnet/tx/9feacee7199531aee835b7d3a2967a3d307ded70020b92c3a8e4f33001abf678)
- **Oracle Price Seed (XLM = $0.10)**: [45989925...](https://stellar.expert/explorer/testnet/tx/45989925529e7b139d47ecaf2d6539cab17349fe60f2ce13bda3455a85c9aaa4)
- **Credit score attestation (720)**: [94a61030...](https://stellar.expert/explorer/testnet/tx/94a610300986bc779bf201b59949d2429d6090d8ba6ea68bce2ec163f40c7f23)

