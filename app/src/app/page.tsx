"use client";
import { useState } from "react";
import { BENCHMARKS } from "@/lib/demo";
import { saveRemittance, loadRemittance } from "@/lib/store";

export default function SendPage() {
  const [rent, setRent] = useState(100);
  const [school, setSchool] = useState(60);
  const [food, setFood] = useState(40);
  const [sent, setSent] = useState(false);
  const total = rent + school + food;
  const fee = Math.round(total * 0.01 * 100) / 100;

  function send() {
    const r = loadRemittance();
    r.envelopes = [
      { ...r.envelopes[0], amountUsd: rent, amountNgn: rent * 1550, status: "locked" },
      { ...r.envelopes[1], amountUsd: school, amountNgn: school * 1550, status: "locked" },
      { ...r.envelopes[2], amountUsd: food, amountNgn: food * 1550, status: "locked" },
    ];
    r.amountUsd = total;
    r.feeUsd = fee;
    saveRemittance(r);
    setSent(true);
  }

  return (
    <div>
      <h1>Send $200 home — split it by what it&apos;s for</h1>
      <p>Amara, Toronto → Mama N., Enugu, Nigeria. The money is locked in a Soroban escrow
        contract as envelopes. Each envelope can only pay what it was for.</p>

      <div className="card">
        <label>Rent: ${rent} <input type="range" min={0} max={200} value={rent} onChange={(e) => setRent(Number(e.target.value))} /></label><br />
        <label>School fees: ${school} <input type="range" min={0} max={200} value={school} onChange={(e) => setSchool(Number(e.target.value))} /></label><br />
        <label>Food (cash pickup): ${food} <input type="range" min={0} max={200} value={food} onChange={(e) => setFood(Number(e.target.value))} /></label>
        <p><strong>Total: ${total}</strong> · RemitHome fee (1% model): ${fee.toFixed(2)} · Stellar network fee: &lt;$0.01</p>
      </div>

      <div className="card">
        <h3>How that compares (World Bank, Q3 2025, $200 send)</h3>
        <ul>
          <li>{BENCHMARKS.globalAvg.label}: {BENCHMARKS.globalAvg.pct}% — ${(total * BENCHMARKS.globalAvg.pct / 100).toFixed(2)}</li>
          <li>{BENCHMARKS.ssaAvg.label}: {BENCHMARKS.ssaAvg.pct}% — ${(total * BENCHMARKS.ssaAvg.pct / 100).toFixed(2)}</li>
          <li>{BENCHMARKS.bankAvg.label}: {BENCHMARKS.bankAvg.pct}% — ${(total * BENCHMARKS.bankAvg.pct / 100).toFixed(2)}</li>
          <li>{BENCHMARKS.target.label}</li>
        </ul>
        <p>RemitHome (model): ${fee.toFixed(2)} — you save about ${(total * 0.0636 - fee).toFixed(2)} vs the global average.</p>
      </div>

      {!sent ? (
        <button onClick={send}>Lock ${total} in escrow →</button>
      ) : (
        <div className="card">
          <p><strong>Locked.</strong> Pickup code for the food envelope: <strong>482913</strong> — share it with Mama N. only.</p>
          <p><a href="/track">Track the envelopes →</a></p>
        </div>
      )}
    </div>
  );
}
