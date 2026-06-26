"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { WalletGate } from "@/components/wallet/WalletGate";
import HealthFactorMeter from "@/components/HealthFactorMeter";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

export default function BorrowerPage() {
  const embedded = false;
  const [activeTab, setActiveTab] = useState<"open" | "manage">("open");
  const { address: walletAddress, signTransaction } = useWallet();
  const wallet = walletAddress;

  // ── Preloaded Cryptographic Prover ──────────────────────────────────────────
  const [proofGenerator, setProofGenerator] = useState<any | null>(null);

  // ── Open Position State ──────────────────────────────────────────────────────
  const [collateral, setCollateral] = useState("10000");
  const [debt, setDebt] = useState("750");
  const [score, setScore] = useState("720");
  const [oraclePrice, setOraclePrice] = useState(100_000);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [viewKey, setViewKey] = useState<string | null>(null);

  // ── Manage Position State ────────────────────────────────────────────────────
  const [localPositions, setLocalPositions] = useState<string[]>([]);
  const [selectedNullifierHex, setSelectedNullifierHex] = useState<string>("");
  const [manageViewKey, setManageViewKey] = useState("");
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedSecrets, setDecryptedSecrets] = useState<any | null>(null);
  const [contractPosition, setContractPosition] = useState<any | null>(null);
  
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [manageProofState, setManageProofState] = useState<ProofState>("idle");
  const [manageTxHash, setManageTxHash] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const collateralUsd = (Number(collateral) * oraclePrice) / 1_000_000;
  const ltv = Number(score) >= 700 ? 120 : Number(score) >= 500 ? 75 : 50;
  const maxDebt = (collateralUsd * ltv) / 100;
  const hf = Number(debt) > 0 ? collateralUsd / Number(debt) : Infinity;
  const debtOverLimit = Number(debt) > maxDebt;

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
    refreshLocalPositions();
  }, []);

  // Scan localStorage for saved positions
  function refreshLocalPositions() {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      const posKeys = keys.filter((k) => k.startsWith("secrets_"));
      const nullifiers = posKeys.map((k) => k.replace("secrets_", ""));
      setLocalPositions(nullifiers);
      if (nullifiers.length > 0 && !selectedNullifierHex) {
        setSelectedNullifierHex(nullifiers[0]);
      }
    }
  }

  // When selected position changes, check if we have a saved view key
  useEffect(() => {
    if (selectedNullifierHex && typeof window !== "undefined") {
      const savedVk = localStorage.getItem(`vk_${selectedNullifierHex}`);
      if (savedVk) {
        setManageViewKey(savedVk);
      } else {
        setManageViewKey("");
      }
      // Reset decryption state on selection change
      setDecryptedSecrets(null);
      setContractPosition(null);
      setDecryptError(null);
      setManageTxHash(null);
      setManageError(null);
      setManageProofState("idle");
    }
  }, [selectedNullifierHex]);

  async function handleOpen() {
    if (!wallet || !proofGenerator) return;
    try {
      setProofState("generating");
      const { randomField, commit, nullifier } = await import("@eclipse/crypto");

      const saltC = randomField();
      const saltD = randomField();
      const sk = randomField();
      const pid = randomField();

      const [cc, dc, nh] = await Promise.all([
        commit(BigInt(collateral), saltC),
        commit(BigInt(debt), saltD),
        nullifier(sk, pid),
      ]);

      const generatedProof = await proofGenerator.proveOpenPosition({
        collateral_commitment: "0x" + cc.toString(16).padStart(64, "0"),
        debt_commitment: "0x" + dc.toString(16).padStart(64, "0"),
        credit_attestation: "0x" + (0n).toString(16).padStart(64, "0"),
        oracle_price_usd: oraclePrice,
        min_credit_threshold: 300,
        liq_threshold_bps: 100,
        nullifier_hash: "0x" + nh.toString(16).padStart(64, "0"),
        collateral: Number(collateral),
        salt_c: "0x" + saltC.toString(16).padStart(64, "0"),
        debt: Number(debt),
        salt_d: "0x" + saltD.toString(16).padStart(64, "0"),
        credit_score: Number(score),
        borrower_address: "0x" + (1n).toString(16).padStart(64, "0"),
        issuer_nonce: "0x" + (1n).toString(16).padStart(64, "0"),
        secret_key: "0x" + sk.toString(16).padStart(64, "0"),
        position_id: "0x" + pid.toString(16).padStart(64, "0"),
      });

      setProofState("submitting");
      
      const { openPosition } = await import("@eclipse/sdk");
      
      const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

      const contractFormat = proofGenerator.toContractFormat(generatedProof);

      const txResultHash = await openPosition({
        borrower: {
          publicKey: walletAddress!,
          signTransaction: signTransaction!,
        },
        collateralAsset: NATIVE_TOKEN_ID,
        collateralCommitment: Buffer.from(cc.toString(16).padStart(64, "0"), "hex"),
        debtCommitment: Buffer.from(dc.toString(16).padStart(64, "0"), "hex"),
        creditAttestation: Buffer.from((0n).toString(16).padStart(64, "0"), "hex"),
        nullifierHash: Buffer.from(nh.toString(16).padStart(64, "0"), "hex"),
        collateralAmountPub: BigInt(collateral) * 10000000n, // scale to 7 decimals
        debtAmountPub: BigInt(debt) * 10000000n, // scale to 7 decimals
        proofBytes: contractFormat.proof,
        publicInputsBytes: contractFormat.publicInputs,
      });

      // Encrypt and store secrets locally
      const { generateRandomViewKeyHex, importViewKey, encryptSecrets } = await import("@eclipse/crypto");
      const vkHex = generateRandomViewKeyHex();
      const cryptoKey = await importViewKey(vkHex);
      const { ciphertext, iv } = await encryptSecrets({
        collateral: BigInt(collateral),
        saltC,
        debt: BigInt(debt),
        saltD,
        creditScore: BigInt(score),
        issuerNonce: 1n,
        secretKey: sk,
        positionId: pid,
      }, cryptoKey);

      const nullifierHex = nh.toString(16).padStart(64, "0");
      localStorage.setItem(`secrets_${nullifierHex}`, JSON.stringify({
        ciphertext: Array.from(ciphertext),
        iv: Array.from(iv),
      }));
      localStorage.setItem(`vk_${nullifierHex}`, vkHex);

      setViewKey(vkHex);
      setTxHash(txResultHash);
      setProofState("success");
      refreshLocalPositions();
    } catch (e) {
      console.error(e);
      setProofState("error");
    }
  }

  async function handleDecryptPosition() {
    if (!selectedNullifierHex || !manageViewKey) return;
    setDecryptLoading(true);
    setDecryptError(null);
    setDecryptedSecrets(null);
    setContractPosition(null);
    try {
      const { importViewKey, decryptSecrets } = await import("@eclipse/crypto");
      const { getPosition } = await import("@eclipse/sdk");

      const item = localStorage.getItem(`secrets_${selectedNullifierHex}`);
      if (!item) {
        throw new Error("Local secrets not found for this position.");
      }
      const { ciphertext, iv } = JSON.parse(item);
      const cryptoKey = await importViewKey(manageViewKey.trim());
      const decrypted = await decryptSecrets(
        new Uint8Array(ciphertext),
        new Uint8Array(iv),
        cryptoKey
      );
      setDecryptedSecrets(decrypted);

      // Fetch on-chain status
      const nhBuffer = Buffer.from(selectedNullifierHex, "hex");
      const chainPos = await getPosition(nhBuffer);
      setContractPosition(chainPos);
    } catch (e: any) {
      console.error(e);
      setDecryptError(e.message ?? "Decryption failed or invalid view key.");
    } finally {
      setDecryptLoading(false);
    }
  }

  async function handleRepay() {
    if (!wallet || !selectedNullifierHex || !manageViewKey || !decryptedSecrets || !proofGenerator) return;
    const amount = Number(repayAmount);
    if (isNaN(amount) || amount <= 0) {
      setManageError("Please enter a valid positive amount to repay.");
      return;
    }
    if (amount > Number(decryptedSecrets.debt)) {
      setManageError(`Repay amount exceeds current debt of ${decryptedSecrets.debt} USDC.`);
      return;
    }

    setManageError(null);
    setManageProofState("generating");
    setManageTxHash(null);
    try {
      const { commit, randomField, importViewKey, encryptSecrets } = await import("@eclipse/crypto");
      const { repayWithdraw } = await import("@eclipse/sdk");
      const { Keypair } = await import("@stellar/stellar-sdk");

      const delta_debt_pub = amount;
      const delta_collateral_pub = 0;
      
      const new_debt = Number(decryptedSecrets.debt) - delta_debt_pub;
      const new_collateral = Number(decryptedSecrets.collateral);

      const salt_c_new = decryptedSecrets.saltC;
      const salt_d_new = randomField();

      const [old_cc, old_dc, new_cc, new_dc] = await Promise.all([
        commit(decryptedSecrets.collateral, decryptedSecrets.saltC),
        commit(decryptedSecrets.debt, decryptedSecrets.saltD),
        commit(BigInt(new_collateral), salt_c_new),
        commit(BigInt(new_debt), salt_d_new),
      ]);

      const oldCcHex = "0x" + old_cc.toString(16).padStart(64, "0");
      const oldDcHex = "0x" + old_dc.toString(16).padStart(64, "0");
      const newCcHex = "0x" + new_cc.toString(16).padStart(64, "0");
      const newDcHex = "0x" + new_dc.toString(16).padStart(64, "0");

      const generatedProof = await proofGenerator.proveRepayWithdraw({
        old_collateral_commitment: oldCcHex,
        old_debt_commitment: oldDcHex,
        new_collateral_commitment: newCcHex,
        new_debt_commitment: newDcHex,
        oracle_price_usd: oraclePrice,
        liq_threshold_bps: 100,
        delta_collateral_pub: delta_collateral_pub,
        delta_debt_pub: delta_debt_pub,
        // Private
        old_collateral: Number(decryptedSecrets.collateral),
        salt_c_old: "0x" + decryptedSecrets.saltC.toString(16).padStart(64, "0"),
        old_debt: Number(decryptedSecrets.debt),
        salt_d_old: "0x" + decryptedSecrets.saltD.toString(16).padStart(64, "0"),
        new_collateral: new_collateral,
        salt_c_new: "0x" + salt_c_new.toString(16).padStart(64, "0"),
        new_debt: new_debt,
        salt_d_new: "0x" + salt_d_new.toString(16).padStart(64, "0"),
      });

      setManageProofState("submitting");

      const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

      const contractFormat = proofGenerator.toContractFormat(generatedProof);
      const txResultHash = await repayWithdraw({
        borrower: {
          publicKey: walletAddress!,
          signTransaction: signTransaction!,
        },
        nullifierHash: Buffer.from(selectedNullifierHex, "hex"),
        collateralAsset: NATIVE_TOKEN_ID,
        newCollateralCommitment: Buffer.from(new_cc.toString(16).padStart(64, "0"), "hex"),
        newDebtCommitment: Buffer.from(new_dc.toString(16).padStart(64, "0"), "hex"),
        deltaCollateral: 0n,
        deltaDebt: BigInt(delta_debt_pub) * 10000000n, // scale to 7 decimals
        proofBytes: contractFormat.proof,
        publicInputsBytes: contractFormat.publicInputs,
      });

      // Update secrets locally
      const cryptoKey = await importViewKey(manageViewKey.trim());
      const { ciphertext, iv } = await encryptSecrets({
        collateral: decryptedSecrets.collateral,
        saltC: decryptedSecrets.saltC,
        debt: BigInt(new_debt),
        saltD: salt_d_new,
        creditScore: decryptedSecrets.creditScore,
        issuerNonce: decryptedSecrets.issuerNonce,
        secretKey: decryptedSecrets.secretKey,
        positionId: decryptedSecrets.positionId,
      }, cryptoKey);

      localStorage.setItem(`secrets_${selectedNullifierHex}`, JSON.stringify({
        ciphertext: Array.from(ciphertext),
        iv: Array.from(iv),
      }));

      // Refresh local decrypted state
      setDecryptedSecrets({
        ...decryptedSecrets,
        debt: BigInt(new_debt),
        saltD: salt_d_new,
      });

      setManageTxHash(txResultHash);
      setManageProofState("success");
      setRepayAmount("");
    } catch (e: any) {
      console.error(e);
      setManageError(e.message ?? "Transaction failed.");
      setManageProofState("error");
    }
  }

  async function handleWithdraw() {
    if (!wallet || !selectedNullifierHex || !manageViewKey || !decryptedSecrets || !proofGenerator) return;
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setManageError("Please enter a valid positive amount to withdraw.");
      return;
    }
    if (amount > Number(decryptedSecrets.collateral)) {
      setManageError(`Withdraw amount exceeds current collateral of ${decryptedSecrets.collateral} XLM.`);
      return;
    }

    // Health factor check
    const new_collateral = Number(decryptedSecrets.collateral) - amount;
    const new_collateral_usd = (new_collateral * oraclePrice) / 1_000_000;
    const current_debt = Number(decryptedSecrets.debt);
    const new_hf = current_debt > 0 ? new_collateral_usd / current_debt : Infinity;
    if (new_hf < 1.0) {
      setManageError(`Cannot withdraw. Resulting Health Factor (${new_hf.toFixed(2)}) would be below 1.0.`);
      return;
    }

    setManageError(null);
    setManageProofState("generating");
    setManageTxHash(null);
    try {
      const { commit, randomField, importViewKey, encryptSecrets } = await import("@eclipse/crypto");
      const { repayWithdraw } = await import("@eclipse/sdk");
      const { Keypair } = await import("@stellar/stellar-sdk");

      const delta_debt_pub = 0;
      const delta_collateral_pub = amount;
      
      const new_debt = Number(decryptedSecrets.debt);

      const salt_c_new = randomField();
      const salt_d_new = decryptedSecrets.saltD;

      const [old_cc, old_dc, new_cc, new_dc] = await Promise.all([
        commit(decryptedSecrets.collateral, decryptedSecrets.saltC),
        commit(decryptedSecrets.debt, decryptedSecrets.saltD),
        commit(BigInt(new_collateral), salt_c_new),
        commit(BigInt(new_debt), salt_d_new),
      ]);

      const oldCcHex = "0x" + old_cc.toString(16).padStart(64, "0");
      const oldDcHex = "0x" + old_dc.toString(16).padStart(64, "0");
      const newCcHex = "0x" + new_cc.toString(16).padStart(64, "0");
      const newDcHex = "0x" + new_dc.toString(16).padStart(64, "0");

      const generatedProof = await proofGenerator.proveRepayWithdraw({
        old_collateral_commitment: oldCcHex,
        old_debt_commitment: oldDcHex,
        new_collateral_commitment: newCcHex,
        new_debt_commitment: newDcHex,
        oracle_price_usd: oraclePrice,
        liq_threshold_bps: 100,
        delta_collateral_pub: delta_collateral_pub,
        delta_debt_pub: delta_debt_pub,
        // Private
        old_collateral: Number(decryptedSecrets.collateral),
        salt_c_old: "0x" + decryptedSecrets.saltC.toString(16).padStart(64, "0"),
        old_debt: Number(decryptedSecrets.debt),
        salt_d_old: "0x" + decryptedSecrets.saltD.toString(16).padStart(64, "0"),
        new_collateral: new_collateral,
        salt_c_new: "0x" + salt_c_new.toString(16).padStart(64, "0"),
        new_debt: new_debt,
        salt_d_new: "0x" + salt_d_new.toString(16).padStart(64, "0"),
      });

      setManageProofState("submitting");

      const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

      const contractFormat = proofGenerator.toContractFormat(generatedProof);
      const txResultHash = await repayWithdraw({
        borrower: {
          publicKey: walletAddress!,
          signTransaction: signTransaction!,
        },
        nullifierHash: Buffer.from(selectedNullifierHex, "hex"),
        collateralAsset: NATIVE_TOKEN_ID,
        newCollateralCommitment: Buffer.from(new_cc.toString(16).padStart(64, "0"), "hex"),
        newDebtCommitment: Buffer.from(new_dc.toString(16).padStart(64, "0"), "hex"),
        deltaCollateral: BigInt(delta_collateral_pub) * 10000000n, // scale to 7 decimals
        deltaDebt: 0n,
        proofBytes: contractFormat.proof,
        publicInputsBytes: contractFormat.publicInputs,
      });

      // Update secrets locally
      const cryptoKey = await importViewKey(manageViewKey.trim());
      const { ciphertext, iv } = await encryptSecrets({
        collateral: BigInt(new_collateral),
        saltC: salt_c_new,
        debt: decryptedSecrets.debt,
        saltD: decryptedSecrets.saltD,
        creditScore: decryptedSecrets.creditScore,
        issuerNonce: decryptedSecrets.issuerNonce,
        secretKey: decryptedSecrets.secretKey,
        positionId: decryptedSecrets.positionId,
      }, cryptoKey);

      localStorage.setItem(`secrets_${selectedNullifierHex}`, JSON.stringify({
        ciphertext: Array.from(ciphertext),
        iv: Array.from(iv),
      }));

      // Refresh local decrypted state
      setDecryptedSecrets({
        ...decryptedSecrets,
        collateral: BigInt(new_collateral),
        saltC: salt_c_new,
      });

      setManageTxHash(txResultHash);
      setManageProofState("success");
      setWithdrawAmount("");
    } catch (e: any) {
      console.error(e);
      setManageError(e.message ?? "Transaction failed.");
      setManageProofState("error");
    }
  }

  return (
    <div style={{ minHeight: embedded ? "auto" : "100vh", padding: "0 0 64px" }}>
      {/* Header */}
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
        <a
          href="/"
          style={{
            fontSize: 13,
            color: "var(--muted)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <img src="/logo/steal-logo-light.png" alt="Steal Logo" style={{ height: 18, width: "auto" }} />
          <span style={{ fontWeight: 500, color: "var(--foreground)" }}>Steal</span>
        </a>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(124,58,237,0.1)",
            color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Borrower
        </span>
      </header>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Borrower Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Deposit collateral, borrow USDC, repay debt or withdraw collateral privately.
          Your parameters are protected by zero-knowledge proofs.
        </p>

        <WalletGate />

        {wallet && (
          <div style={{ marginTop: 24 }}>
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
                marginBottom: 16,
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

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 24,
                borderBottom: "1px solid var(--border)",
                paddingBottom: 10,
              }}
            >
              <button
                onClick={() => setActiveTab("open")}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === "open" ? "var(--foreground)" : "var(--muted)",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderBottom: activeTab === "open" ? "2px solid var(--accent)" : "none",
                  marginBottom: -12,
                  transition: "color 0.2s",
                }}
              >
                Open Position
              </button>
              <button
                onClick={() => {
                  setActiveTab("manage");
                  refreshLocalPositions();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === "manage" ? "var(--foreground)" : "var(--muted)",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderBottom: activeTab === "manage" ? "2px solid var(--accent)" : "none",
                  marginBottom: -12,
                  transition: "color 0.2s",
                }}
              >
                Manage Position ({localPositions.length})
              </button>
            </div>

            {activeTab === "open" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />

                {/* Inputs */}
                <div className="card">
                  <div className="label" style={{ marginBottom: 16 }}>Position Parameters</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Field
                      label="Collateral (XLM)"
                      value={collateral}
                      onChange={setCollateral}
                      hint={`≈ $${collateralUsd.toFixed(2)} USD`}
                    />
                    <Field
                      label="Credit Score"
                      value={score}
                      onChange={setScore}
                      hint={`LTV tier: ${ltv}% → max borrow $${maxDebt.toFixed(2)}`}
                    />
                    <Field
                      label="Borrow Amount (USDC)"
                      value={debt}
                      onChange={setDebt}
                      hint={debtOverLimit ? "⚠ Exceeds LTV limit" : "Within LTV limit"}
                      error={debtOverLimit}
                    />
                  </div>
                </div>

                <HealthFactorMeter healthFactor={isFinite(hf) ? hf : 0} />

                {/* Stats row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    { label: "Collateral USD", value: `$${collateralUsd.toFixed(2)}` },
                    { label: "LTV", value: `${ltv}%` },
                    { label: "Max Borrow", value: `$${maxDebt.toFixed(2)}` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px 14px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    >
                      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <ProofStatus state={proofState} />

                {txHash && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      padding: "8px 12px",
                      background: "var(--surface)",
                      borderRadius: 6,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    On-chain (commitments only, no amounts visible):{" "}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#a78bfa" }}
                    >
                      {txHash.slice(0, 10)}…{txHash.slice(-10)}
                    </a>
                  </div>
                )}

                {viewKey && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--foreground)",
                      padding: "16px",
                      background: "rgba(16,185,129,0.06)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--emerald)" }}>
                      🔑 Position View Key Generated
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Share this view key with your auditor to securely decrypt your position.
                    </div>
                    <div
                      className="mono"
                      style={{
                        padding: "8px 12px",
                        background: "#090909",
                        borderRadius: 4,
                        fontSize: 13,
                        userSelect: "all",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(viewKey);
                        alert("View key copied to clipboard!");
                      }}
                    >
                      <span style={{ color: "var(--emerald)" }}>{viewKey}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Copy</span>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-violet"
                  onClick={handleOpen}
                  disabled={
                    debtOverLimit ||
                    !proofGenerator ||
                    proofState === "generating" ||
                    proofState === "submitting"
                  }
                >
                  {!proofGenerator
                    ? "WASM Loading..."
                    : proofState === "generating"
                    ? "Generating Proof…"
                    : proofState === "submitting"
                    ? "Submitting…"
                    : "Open Position"}
                </button>

                <p
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                >
                  Proof generated in browser via WASM · Private inputs never leave your device
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Select Position */}
                <div className="card">
                  <div className="label" style={{ marginBottom: 12 }}>Select Active Position</div>
                  {localPositions.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
                      No locally stored positions found in this browser. Open a new position first.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                          Position ID (Nullifier Hash)
                        </label>
                        <select
                          className="input"
                          value={selectedNullifierHex}
                          onChange={(e) => setSelectedNullifierHex(e.target.value)}
                          style={{ cursor: "pointer", textOverflow: "ellipsis" }}
                        >
                          {localPositions.map((nh) => (
                            <option key={nh} value={nh}>
                              {nh.slice(0, 12)}…{nh.slice(-12)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                          View Key
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="vk_…"
                          value={manageViewKey}
                          onChange={(e) => setManageViewKey(e.target.value)}
                        />
                      </div>

                      {decryptError && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--red)",
                            padding: "8px 12px",
                            background: "var(--red-glow)",
                            borderRadius: 6,
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          {decryptError}
                        </div>
                      )}

                      <button
                        className="btn btn-ghost"
                        onClick={handleDecryptPosition}
                        disabled={decryptLoading || !manageViewKey || !selectedNullifierHex}
                      >
                        {decryptLoading ? "Decrypting…" : "🔑 Load & Decrypt Position"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Decrypted position details */}
                {decryptedSecrets && (
                  <div
                    className="card"
                    style={{
                      borderColor: "rgba(124,58,237,0.3)",
                      background: "rgba(124,58,237,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span className="label" style={{ color: "#a78bfa" }}>Decrypted Details</span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: contractPosition?.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: contractPosition?.isActive ? "var(--green)" : "var(--red)",
                          border: contractPosition?.isActive ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                        }}
                      >
                        {contractPosition === null ? "Loading Chain Status..." : contractPosition.isActive ? "ACTIVE" : "INACTIVE (LIQUIDATED/REPAID)"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Collateral</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{decryptedSecrets.collateral.toString()} XLM</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Debt</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{decryptedSecrets.debt.toString()} USDC</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Credit Score</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{decryptedSecrets.creditScore.toString()}</span>
                      </div>
                      {contractPosition && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>Opened Ledger</span>
                          <span className="mono" style={{ fontSize: 13 }}>#{contractPosition.openedAt}</span>
                        </div>
                      )}
                    </div>

                    {contractPosition?.isActive && (
                      <>
                        <div className="divider" />

                        {/* Repay / Withdraw Actions */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {/* Repay Column */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div className="label" style={{ fontSize: 10 }}>Repay Debt</div>
                            <input
                              type="number"
                              className="input"
                              placeholder="USDC Amount"
                              value={repayAmount}
                              onChange={(e) => setRepayAmount(e.target.value)}
                            />
                            <button
                              className="btn btn-violet"
                              style={{ fontSize: 12, padding: "8px 12px" }}
                              onClick={handleRepay}
                              disabled={
                                !proofGenerator ||
                                manageProofState === "generating" ||
                                manageProofState === "submitting" ||
                                !repayAmount
                              }
                            >
                              {!proofGenerator ? "Loading..." : "Repay Debt"}
                            </button>
                          </div>

                          {/* Withdraw Column */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div className="label" style={{ fontSize: 10 }}>Withdraw Collateral</div>
                            <input
                              type="number"
                              className="input"
                              placeholder="XLM Amount"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                            />
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 12, padding: "8px 12px", color: "var(--foreground)" }}
                              onClick={handleWithdraw}
                              disabled={
                                !proofGenerator ||
                                manageProofState === "generating" ||
                                manageProofState === "submitting" ||
                                !withdrawAmount
                              }
                            >
                              {!proofGenerator ? "Loading..." : "Withdraw"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Status displays for action */}
                <ProofStatus state={manageProofState} />

                {manageError && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--red)",
                      padding: "8px 12px",
                      background: "var(--red-glow)",
                      borderRadius: 6,
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    {manageError}
                  </div>
                )}

                {manageTxHash && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      padding: "8px 12px",
                      background: "var(--surface)",
                      borderRadius: 6,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Manage tx:{" "}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${manageTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#a78bfa" }}
                    >
                      {manageTxHash.slice(0, 10)}…{manageTxHash.slice(-10)}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, hint, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={error ? { borderColor: "var(--red)" } : {}}
      />
      {hint && (
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: error ? "var(--red)" : "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
