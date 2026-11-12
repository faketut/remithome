import { NextRequest, NextResponse } from "next/server";
import { explorerTxUrl, refundEnvelope } from "@/lib/server/stellar";

export const dynamic = "force-dynamic";

// POST /api/refund { remittanceId, envelopeIdx }
// Refunds one expired envelope back to the sender on Stellar Testnet.
// The contract enforces expiry (a refund before expiry traps on-chain).
export async function POST(req: NextRequest) {
  try {
    const { remittanceId, envelopeIdx } = await req.json();
    const id = Number(remittanceId);
    const idx = Number(envelopeIdx);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(idx) || idx < 0 || idx > 2) {
      return NextResponse.json({ error: "remittanceId >= 1, envelopeIdx 0-2" }, { status: 400 });
    }
    const result = await refundEnvelope({ remittanceId: id, envelopeIdx: idx });
    return NextResponse.json({ ...result, explorer: explorerTxUrl(result.txHash) });
  } catch (e) {
    console.error("[POST /api/refund]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
