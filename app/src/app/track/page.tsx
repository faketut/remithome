"use client";
import { useEffect, useState } from "react";
import { Remittance } from "@/lib/demo";
import { loadRemittance, saveRemittance, resetDemo } from "@/lib/store";
import { explorerTxUrl } from "@/lib/stellar";

export default function TrackPage() {
  const [rem, setRem] = useState<Remittance | null>(null);
  useEffect(() => setRem(loadRemittance()), []);

  function release(id: string) {
    if (!rem) return;
    const next = {
      ...rem,
      envelopes: rem.envelopes.map((e) =>
        e.id === id ? { ...e, status: "released" as const, receiptTx: "demo-tx-" + id } : e
      ),
    };
    saveRemittance(next);
    setRem(next);
  }

  if (!rem) return <p>Loading…</p>;
  const released = rem.envelopes.filter((e) => e.status === "released").length;

  return (
    <div>
      <h1>Track {rem.id}</h1>
      <p>{rem.sender} → {rem.recipient} · {rem.corridor} · ${rem.amountUsd} · fee ${rem.feeUsd.toFixed(2)}</p>
      <p>{released} of {rem.envelopes.length} envelopes released. Unclaimed envelopes auto-refund after 14 days.</p>
      {rem.envelopes.map((e) => (
        <div key={e.id} className="card">
          <strong>{e.label}: ${e.amountUsd}</strong> (₦{e.amountNgn.toLocaleString()}) — {e.payee}<br />
          Status: <strong>{e.status}</strong>
          {e.receiptTx && (
            <span> · Receipt: <a href={explorerTxUrl(e.receiptTx)} target="_blank" rel="noreferrer">Stellar Explorer (testnet)</a></span>
          )}
          {e.status === "locked" && e.purpose !== "food" && (
            <div><button onClick={() => release(e.id)}>Release to {e.payee} (demo)</button></div>
          )}
          {e.status === "locked" && e.purpose === "food" && (
            <p>Cash pickup: recipient shows code <strong>482913</strong> at the agent. See <a href="/agent">Agent pickup</a>.</p>
          )}
        </div>
      ))}
      <button onClick={() => { resetDemo(); window.location.reload(); }}>Reset demo</button>
    </div>
  );
}
