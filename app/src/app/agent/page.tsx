"use client";
import { useState } from "react";
import { loadRemittance, saveRemittance } from "@/lib/store";
import { TESTNET, loadTestnet, saveTestnet, explorerTx } from "@/lib/testnet";

export default function AgentPage() {
  const [code, setCode] = useState("");
  const [floatOk, setFloatOk] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  async function confirm() {
    if (!floatOk) { setError("Confirm you hold ₦62,000 in float before releasing — the agent must be paid, not left short."); return; }
    if (!TESTNET) {
      if (code.trim() !== "482913") { setError("Code does not match. Check the 6 digits and try again."); return; }
      const rem = loadRemittance();
      const next = {
        ...rem,
        envelopes: rem.envelopes.map((e) =>
          e.purpose === "food" ? { ...e, status: "released" as const, receiptTx: "demo-tx-env-food" } : e
        ),
      };
      saveRemittance(next);
      setDone(true);
      setError("");
      return;
    }
    const saved = loadTestnet();
    if (!saved) { setError("No remittance on this browser yet — send one first."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remittanceId: saved.remittanceId, envelopeIdx: 2, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "release failed");
      saved.releases[2] = data.txHash;
      saveTestnet(saved);
      setTxHash(data.txHash);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Agent pickup — Enugu</h1>
      <p><strong>Simulated agent (demo).</strong> In production this is a MoneyGram SEP-24
        cash-out: the agent verifies the reference number in MoneyGram&apos;s system and the
        escrow releases. Here the code check + float check stand in for that step — labelled
        as a simulation so judges are never misled.</p>
      {!done ? (
        <div className="card">
          <label>Pickup code (6 digits): <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={TESTNET ? "the 6-digit code from the sender" : "482913"} /></label><br /><br />
          <label><input type="checkbox" checked={floatOk} onChange={(e) => setFloatOk(e.target.checked)} /> I hold ₦62,000 in float for this pickup</label><br /><br />
          <button onClick={confirm} disabled={busy}>{busy ? "Releasing on-chain…" : "Confirm pickup & release $40"}</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      ) : (
        <div className="card">
          <p><strong>Released.</strong> Hand over ₦62,000 cash. The food envelope is now Released — see <a href="/track">tracking</a>.</p>
          {txHash && (
            <p>Receipt: <a href={explorerTx(txHash)} target="_blank" rel="noreferrer">Stellar Explorer (testnet)</a></p>
          )}
        </div>
      )}
    </div>
  );
}
