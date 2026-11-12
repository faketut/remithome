"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Remittance } from "@/lib/demo";
import { loadRemittance, saveRemittance, resetDemo } from "@/lib/store";
import { explorerTxUrl } from "@/lib/stellar";
import {
  TESTNET,
  loadTestnet,
  saveTestnet,
  clearTestnet,
  explorerTx,
  roleFor,
  shortAddr,
} from "@/lib/testnet";

interface ChainEnvelope {
  purpose: string;
  amountUsd: number;
  payee: string;
  released: boolean;
  refunded: boolean;
}

function MockTrack() {
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

function TestnetTrack() {
  const params = useSearchParams();
  const [id, setId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [envelopes, setEnvelopes] = useState<ChainEnvelope[] | null>(null);
  const [releases, setReleases] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [createdTx, setCreatedTx] = useState("");

  useEffect(() => {
    const saved = loadTestnet();
    const q = Number(params.get("id"));
    const rid = Number.isInteger(q) && q >= 1 ? q : saved?.remittanceId ?? null;
    setId(rid);
    if (saved) {
      setCode(saved.code);
      setReleases(saved.releases);
      setCreatedTx(saved.createTxHash);
    }
  }, [params]);

  async function refresh(rid: number) {
    const res = await fetch(`/api/remittance?id=${rid}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "fetch failed");
    setEnvelopes(data.envelopes as ChainEnvelope[]);
  }

  useEffect(() => {
    if (id === null) return;
    refresh(id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  async function release(idx: number) {
    if (id === null) return;
    setBusy(idx);
    setError("");
    try {
      const res = await fetch("/api/release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remittanceId: id, envelopeIdx: idx, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "release failed");
      const saved = loadTestnet();
      if (saved) {
        saved.releases[idx] = data.txHash;
        saveTestnet(saved);
        setReleases({ ...saved.releases });
      }
      await refresh(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (id === null) {
    return (
      <div>
        <h1>Track</h1>
        <p>No remittance yet on this browser. Send one first: <a href="/">Send →</a></p>
      </div>
    );
  }
  if (!envelopes) return <p>Reading remittance #{id} from the testnet contract…</p>;
  const released = envelopes.filter((e) => e.released).length;

  return (
    <div>
      <h1>Track remittance #{id}</h1>
      <p>Live on Stellar Testnet — read straight from the escrow contract, not from a demo database.</p>
      {createdTx && (
        <p>Escrow tx: <a href={explorerTx(createdTx)} target="_blank" rel="noreferrer">Stellar Explorer (testnet)</a></p>
      )}
      <p>{released} of {envelopes.length} envelopes released. Unclaimed envelopes auto-refund after 14 days.</p>
      {envelopes.map((e, idx) => (
        <div key={e.purpose} className="card">
          <strong>{e.purpose}: ${e.amountUsd}</strong> — {roleFor(e.payee)} <code>{shortAddr(e.payee)}</code><br />
          Status: <strong>{e.released ? "released" : e.refunded ? "refunded" : "locked"}</strong>
          {releases[idx] && (
            <span> · Receipt: <a href={explorerTx(releases[idx])} target="_blank" rel="noreferrer">Stellar Explorer (testnet)</a></span>
          )}
          {!e.released && !e.refunded && e.purpose !== "food" && (
            <div><button onClick={() => release(idx)} disabled={busy !== null}>{busy === idx ? "Releasing on-chain…" : `Release to ${roleFor(e.payee)} (testnet)`}</button></div>
          )}
          {!e.released && !e.refunded && e.purpose === "food" && (
            <p>Cash pickup: recipient shows code <strong>{code || "••••••"}</strong> at the agent. See <a href="/agent">Agent pickup</a>.</p>
          )}
        </div>
      ))}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={() => { clearTestnet(); window.location.href = "/"; }}>Start a new send</button>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      {TESTNET ? <TestnetTrack /> : <MockTrack />}
    </Suspense>
  );
}
