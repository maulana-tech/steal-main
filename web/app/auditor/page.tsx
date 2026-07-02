"use client";

import { useState, useEffect } from "react";

interface Decrypted {
  collateral: number;
  debt: number;
  creditScore: number;
  saltC: string;
  saltD: string;
  healthFactor: number;
  nullifier: string;
}

export default function AuditorPage() {
  const embedded = false;
  const [viewKey, setViewKey] = useState("");
  const [posId, setPosId] = useState("");
  const [decrypted, setDecrypted] = useState<Decrypted | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localPositions, setLocalPositions] = useState<string[]>([]);
  const [selectedPos, setSelectedPos] = useState("");
  const [chainPosition, setChainPosition] = useState<any | null>(null);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      const posKeys = keys.filter((k) => k.startsWith("secrets_"));
      const nullifiers = posKeys.map((k) => k.replace("secrets_", ""));
      setLocalPositions(nullifiers);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadChainPos() {
      if (!posId || posId.trim() === "") {
        setChainPosition(null);
        return;
      }
      try {
        const { getPosition } = await import("@eclipse/sdk");
        const clean = posId.trim().replace("0x", "");
        const res = await getPosition(Buffer.from(clean, "hex"));
        if (active) {
          setChainPosition(res);
        }
      } catch (e) {
        console.warn("Chain lookup failed:", e);
        if (active) {
          setChainPosition(null);
        }
      }
    }
    loadChainPos();
    return () => { active = false; };
  }, [posId]);

  const handleSelectChange = (val: string) => {
    setSelectedPos(val);
    setPosId(val);
    if (typeof window !== "undefined") {
      const savedVk = localStorage.getItem(`vk_${val}`);
      if (savedVk) {
        setViewKey(savedVk);
      } else {
        setViewKey("");
      }
    }
  };

  async function handleImport() {
    setImportError(null);
    try {
      const data = JSON.parse(importJson.trim());
      if (!data.nullifier || !data.viewKey || !data.ciphertext || !data.iv) {
        throw new Error("Missing required fields: nullifier, viewKey, ciphertext, iv");
      }
      localStorage.setItem(`secrets_${data.nullifier}`, JSON.stringify({
        ciphertext: Array.from(data.ciphertext),
        iv: Array.from(data.iv),
      }));
      localStorage.setItem(`vk_${data.nullifier}`, data.viewKey);
      setPosId(data.nullifier);
      setSelectedPos(data.nullifier);
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("secrets_"));
        setLocalPositions(keys.map(k => k.replace("secrets_", "")));
      }
      setViewKey(data.viewKey);
      setImportJson("");
      setError(null);
    } catch (e: any) {
      setImportError(e.message ?? "Invalid JSON format");
    }
  }

  async function decrypt() {
    setLoading(true);
    setError(null);
    setDecrypted(null);
    try {
      const { importViewKey, decryptSecrets } = await import("@eclipse/crypto");

      const cleanPosId = posId.trim().replace("0x", "");
      const item = localStorage.getItem(`secrets_${cleanPosId}`);
      if (!item) {
        throw new Error("Position not found. Import position data from the borrower first, using 'Import from Borrower Export' above.");
      }

      const { ciphertext, iv } = JSON.parse(item);
      const cryptoKey = await importViewKey(viewKey.trim());
      const secrets = await decryptSecrets(
        new Uint8Array(ciphertext),
        new Uint8Array(iv),
        cryptoKey
      );

      const collateralVal = Number(secrets.collateral);
      const debtVal = Number(secrets.debt);
      const hf = debtVal > 0 ? (collateralVal * 0.1) / debtVal : Infinity;

      setDecrypted({
        collateral: collateralVal,
        debt: debtVal,
        creditScore: Number(secrets.creditScore),
        saltC: "0x" + secrets.saltC.toString(16).padStart(64, "0").slice(0, 10) + "…",
        saltD: "0x" + secrets.saltD.toString(16).padStart(64, "0").slice(0, 10) + "…",
        healthFactor: hf,
        nullifier: cleanPosId,
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Invalid view key or decryption failed.");
    }
    setLoading(false);
  }

  const getPubValue = (key: string) => {
    if (!chainPosition) return "Not found or loading...";
    if (key === "Position ID") return posId;
    if (key === "Collateral") return "0x" + Buffer.from(chainPosition.collateralCommitment).toString("hex");
    if (key === "Debt") return "0x" + Buffer.from(chainPosition.debtCommitment).toString("hex");
    if (key === "Credit Attestation") return "0x" + Buffer.from(chainPosition.creditAttestation).toString("hex");
    return "";
  };

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
            background: "rgba(124,58,237,0.12)",
            color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.25)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Auditor
        </span>
      </header>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Audit Position
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Enter a view key shared by the borrower to decrypt their position.
          The public on-chain state only shows commitments.
        </p>

        {/* Import from borrower */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>
            Step 1: Import from Borrower Export
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, lineHeight: 1.4 }}>
            Ask the borrower to click "Export Position Data" after opening a position,
            then paste the copied JSON here.
          </p>
          <textarea
            className="input"
            rows={2}
            placeholder='Paste JSON exported from borrower page...'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            style={{ fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 8, resize: "vertical" }}
          />
          {importError && (
            <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 6 }}>{importError}</div>
          )}
          <button
            className="btn btn-violet"
            style={{ fontSize: 12 }}
            onClick={handleImport}
            disabled={!importJson.trim()}
          >
            Import Position
          </button>
        </div>

        {/* Public state */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 14 }}>Public On-Chain State</div>
          {!posId ? (
            <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>
              Import a position above, or select a saved one below, to see its on-chain state.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                {chainPosition && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: chainPosition.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: chainPosition.isActive ? "var(--green)" : "var(--red)",
                      border: chainPosition.isActive ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    {chainPosition.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { k: "Position ID", v: getPubValue("Position ID") },
                  { k: "Collateral", v: getPubValue("Collateral") },
                  { k: "Debt", v: getPubValue("Debt") },
                  { k: "Credit Attestation", v: getPubValue("Credit Attestation") },
                ].map(({ k, v }) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{k}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: "#a78bfa",
                        wordBreak: "break-all",
                        background: "#080808",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--accent)",
                  fontStyle: "italic",
                }}
              >
                Actual amounts completely hidden to the public
              </div>
            </>
          )}
        </div>

        {/* View key input */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 16 }}>Step 2: Decrypt with View Key</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {localPositions.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  Quick Select (Saved in Browser)
                </label>
                <select
                  className="input"
                  value={selectedPos}
                  onChange={(e) => handleSelectChange(e.target.value)}
                  style={{ cursor: "pointer", textOverflow: "ellipsis" }}
                >
                  <option value="">-- Select a saved position --</option>
                  {localPositions.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh.slice(0, 16)}…{nh.slice(-16)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                Position ID
              </label>
              <input
                className="input"
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                placeholder="Auto-filled after import"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                View Key
              </label>
              <input
                className="input"
                value={viewKey}
                onChange={(e) => setViewKey(e.target.value)}
                placeholder="vk_… (auto-filled after import)"
              />
            </div>

            {error && (
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
                {error}
              </div>
            )}

            <button
              className="btn btn-violet"
              onClick={decrypt}
              disabled={loading || !viewKey || !posId}
            >
              {loading ? "Decrypting…" : "Decrypt Position"}
            </button>
          </div>
        </div>

        {/* Decrypted result */}
        {decrypted && (
          <div
            className="card"
            style={{
              borderColor: "rgba(124,58,237,0.3)",
              background: "rgba(124,58,237,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                className="dot"
                style={{ background: "#a78bfa", boxShadow: "0 0 6px var(--accent-glow)" }}
              />
              <span className="label" style={{ color: "#a78bfa" }}>
                Decrypted — Full Detail
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Collateral", value: `${decrypted.collateral} XLM`, mono: false },
                { label: "Debt", value: `${decrypted.debt} USDC`, mono: false },
                { label: "Credit Score", value: String(decrypted.creditScore), mono: false },
                {
                  label: "Health Factor",
                  value: decrypted.healthFactor.toFixed(4),
                  mono: true,
                  color:
                    decrypted.healthFactor < 1
                      ? "var(--red)"
                      : decrypted.healthFactor < 1.5
                      ? "var(--amber)"
                      : "var(--green)",
                },
                { label: "Salt C", value: decrypted.saltC, mono: true },
                { label: "Salt D", value: decrypted.saltD, mono: true },
              ].map(({ label, value, mono, color }) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
                >
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: mono ? "var(--font-mono)" : undefined,
                      color: color ?? "var(--foreground)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: "8px 12px",
                background: "rgba(124,58,237,0.06)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--muted)",
                border: "1px solid rgba(124,58,237,0.12)",
              }}
            >
              Only this view key holder can see these values. The public sees only commitments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
