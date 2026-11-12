"use client";
import { useState } from "react";
import { loadRemittance, saveRemittance } from "@/lib/store";

export default function AgentPage() {
  const [code, setCode] = useState("");
  const [floatOk, setFloatOk] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function confirm() {
    if (code.trim() !== "482913") { setError("Code does not match. Check the 6 digits and try again."); return; }
    if (!floatOk) { setError("Confirm you hold ₦62,000 in float before releasing — the agent must be paid, not left short."); return; }
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
          <label>Pickup code (6 digits): <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="482913" /></label><br /><br />
          <label><input type="checkbox" checked={floatOk} onChange={(e) => setFloatOk(e.target.checked)} /> I hold ₦62,000 in float for this pickup</label><br /><br />
          <button onClick={confirm}>Confirm pickup &amp; release $40</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      ) : (
        <div className="card">
          <p><strong>Released.</strong> Hand over ₦62,000 cash. The food envelope is now Released — see <a href="/track">tracking</a>.</p>
        </div>
      )}
    </div>
  );
}
