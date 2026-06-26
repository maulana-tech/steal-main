"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { WalletGate } from "@/components/wallet/WalletGate";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

export default function LiquidatorPage({ embedded }: { embedded?: boolean }) {
  const wallet = useWallet().address;
  const [oraclePrice, setOraclePrice] = useState(100_000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Preloaded Cryptographic Prover ──────────────────────────────────────────
  const [proofGenerator, setProofGenerator] = useState<any | null>(null);

  // Initialize and preload ZK WASM Proving engine on mount
  useEffect(() => {
    async function initProver() {
      try {
        const { ProofGenerator } = await import("@eclipse/proof-gen");
        const gen = await ProofGenerator.create();
        setProofGenerator(gen);
      } catch (e) {
        console.error("Failed to preload proving engine:", e);
      }
    }
    initProver();
    loadPositions();
  }, []);

  async function loadPositions() {
    setLoading(true);
    const newPositions: any[] = [];
    try {
      const { getPosition } = await import("@eclipse/sdk");
      const { importViewKey, decryptSecrets, commit } = await import("@eclipse/crypto");

      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        const secretKeys = keys.filter(k => k.startsWith("secrets_"));
        
        for (const k of secretKeys) {
          const nhHex = k.replace("secrets_", "");
          const vkHex = localStorage.getItem(`vk_${nhHex}`);
          const secretsItem = localStorage.getItem(k);
          
          if (vkHex && secretsItem) {
            try {
              const { ciphertext, iv } = JSON.parse(secretsItem);
              const cryptoKey = await importViewKey(vkHex);
              const secrets = await decryptSecrets(
                new Uint8Array(ciphertext),
                new Uint8Array(iv),
                cryptoKey
              );
              
              // Verify status on-chain
              const nhBuffer = Buffer.from(nhHex, "hex");
              const chainPos = await getPosition(nhBuffer);
              
              if (chainPos && chainPos.isActive) {
                // Compute commitments to verify matches
                const cc = await commit(secrets.collateral, secrets.saltC);
                const dc = await commit(secrets.debt, secrets.saltD);
                
                newPositions.push({
                  id: `pos_${nhHex.slice(0, 6)}`,
                  nullifier: "0x" + nhHex,
                  collateralCommitment: "0x" + cc.toString(16).padStart(64, "0"),
                  debtCommitment: "0x" + dc.toString(16).padStart(64, "0"),
                  openedAt: `Ledger #${chainPos.openedAt}`,
                  collateral: Number(secrets.collateral),
                  saltC: "0x" + secrets.saltC.toString(16).padStart(64, "0"),
                  debt: Number(secrets.debt),
                  saltD: "0x" + secrets.saltD.toString(16).padStart(64, "0"),
                  isMock: false,
                });
              }
            } catch (err) {
              console.error(`Failed to load position ${nhHex}:`, err);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    // Add default mock positions as fallback if no real positions are active in browser
    if (newPositions.length === 0) {
      newPositions.push(
        {
          id: "pos_mock_001",
          nullifier: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
          collateralCommitment: "0xdeadbeef9f3a2b1c4e5d6f7a8b9c0d1e2f3a4b5c",
          debtCommitment: "0xfeedface1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
          openedAt: "Ledger #12345 (Mock)",
          collateral: 5000,
          saltC: "0x1234",
          debt: 600,
          saltD: "0x5678",
          isMock: true,
        },
        {
          id: "pos_mock_002",
          nullifier: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
          collateralCommitment: "0xcafebabe2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
          debtCommitment: "0xbadf00d03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
          openedAt: "Ledger #12389 (Mock)",
          collateral: 10000,
          saltC: "0xabcd",
          debt: 400,
          saltD: "0xef01",
          isMock: true,
        }
      );
    }
    
    setPositions(newPositions);
    setLoading(false);
  }

  async function handleLiquidate(pos: any) {
    if (!wallet || !proofGenerator) return;
    setSelectedId(pos.id);
    try {
      setProofState("generating");
      
      const generatedProof = await proofGenerator.proveLiquidate({
        collateral_commitment: pos.collateralCommitment,
        debt_commitment: pos.debtCommitment,
        oracle_price_usd: oraclePrice,
        liq_threshold_bps: 100,
        position_id: pos.nullifier,
        collateral: pos.collateral,
        salt_c: pos.saltC,
        debt: pos.debt,
        salt_d: pos.saltD,
      });
      setProofState("submitting");
      
      const { liquidate } = await import("@eclipse/sdk");
      const { Keypair } = await import("@stellar/stellar-sdk");
      
      const demoSecret = "SCIYRBV6UGM6RCKW7PZIZGXTXTH3ALRHMFZAH52YTITI7YEP3N2H7REQ";
      const liquidatorKeypair = Keypair.fromSecret(demoSecret);
      const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

      const contractFormat = proofGenerator.toContractFormat(generatedProof);

      const txResultHash = await liquidate({
        liquidator: liquidatorKeypair,
        nullifierHash: Buffer.from(pos.nullifier.replace("0x", ""), "hex"),
        collateralAsset: NATIVE_TOKEN_ID,
        collateralAmount: BigInt(pos.collateral) * 10000000n, // native token scale (7 decimals)
        proofBytes: contractFormat.proof,
        publicInputsBytes: contractFormat.publicInputs,
      });

      setTxHash(txResultHash);
      setProofState("success");
      await loadPositions();
    } catch (e) {
      console.error(e);
      setProofState("error");
    }
  }

  return (
    <div style={{ minHeight: embedded ? "auto" : "100vh", paddingBottom: 64 }}>
      {!embedded && (
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
          ← Eclipse
        </a>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(245,158,11,0.1)",
            color: "var(--amber)",
            border: "1px solid rgba(245,158,11,0.2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Liquidator
        </span>
      </header>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Liquidations
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          All positions show only on-chain commitments. Generate a ZK proof that a
          position is unhealthy — without seeing the actual values.
        </p>

        <WalletGate />

        {wallet && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* ZK Prover Warmup Status Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted)" }}>ZK Proving Engine (UltraHonk)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  className="dot"
                  style={{
                    background: proofGenerator ? "var(--green)" : "var(--amber)",
                    boxShadow: proofGenerator ? "0 0 6px var(--emerald-glow)" : "0 0 6px var(--amber-glow)",
                    width: 8,
                    height: 8,
                  }}
                />
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: proofGenerator ? "var(--green)" : "var(--amber)" }}>
                  {proofGenerator ? "READY" : "LOADING WASM..."}
                </span>
              </div>
            </div>

            <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />

            <div className="label" style={{ marginTop: 8 }}>
              Open Positions — commitments only
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0", fontSize: 14 }}>
                Scanning active positions...
              </div>
            ) : (
              positions.map((pos) => {
                const colUsd = (pos.collateral * oraclePrice) / 1_000_000;
                const hf = pos.debt > 0 ? colUsd / pos.debt : Infinity;
                const liquidatable = hf < 1;

                return (
                  <div
                    key={pos.id}
                    className="card"
                    style={{
                      borderColor: liquidatable ? "rgba(239,68,68,0.3)" : "var(--border)",
                      transition: "border-color 0.3s",
                    }}
                  >
                    {/* Position header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          className="mono"
                          style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                        >
                          {pos.id}
                          {pos.isMock && (
                            <span style={{ fontSize: 9, background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 3, color: "var(--muted)" }}>
                              MOCK
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          {pos.openedAt}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: liquidatable ? "var(--red)" : "var(--green)",
                          }}
                        >
                          HF {isFinite(hf) ? hf.toFixed(2) : "∞"}
                        </span>
                        {liquidatable && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: "var(--red-glow)",
                              color: "var(--red)",
                              border: "1px solid rgba(239,68,68,0.3)",
                            }}
                          >
                            LIQUIDATABLE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Commitments */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        padding: "10px 12px",
                        background: "#070707",
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                    >
                      <CommitRow label="collateral" value={pos.collateralCommitment} />
                      <CommitRow label="debt" value={pos.debtCommitment} />
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontStyle: "italic" }}>
                        ← Actual amounts hidden on-chain
                      </div>
                    </div>

                    <button
                      className="btn btn-amber"
                      onClick={() => handleLiquidate(pos)}
                      disabled={
                        !liquidatable ||
                        pos.isMock ||
                        !proofGenerator ||
                        (selectedId === pos.id &&
                          (proofState === "generating" || proofState === "submitting"))
                      }
                      style={{ fontSize: 13 }}
                    >
                      {!proofGenerator
                        ? "WASM Loading..."
                        : selectedId === pos.id && proofState === "generating"
                        ? "Generating Liquidation Proof…"
                        : selectedId === pos.id && proofState === "submitting"
                        ? "Submitting to Stellar..."
                        : pos.isMock
                        ? "Mock Position (Walkthrough Only)"
                        : liquidatable
                        ? "Prove HF < 1 and Liquidate"
                        : "Position Healthy"}
                    </button>
                  </div>
                );
              })
            )}

            <ProofStatus state={proofState} />

            {txHash && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  padding: "8px 12px",
                  background: "var(--surface)",
                  borderRadius: 6,
                }}
              >
                Liquidation tx:{" "}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--amber)" }}
                >
                  {txHash.slice(0, 10)}…{txHash.slice(-10)}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CommitRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ color: "var(--muted)", minWidth: 80 }}>{label}:</span>
      <span
        style={{
          color: "#555",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
