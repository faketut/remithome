import { NextRequest, NextResponse } from "next/server";
import { explorerTxUrl, releaseEnvelope } from "@/lib/server/stellar";

export const dynamic = "force-dynamic";

// POST /api/release { remittanceId, envelopeIdx, code }
// Releases one envelope on Stellar Testnet. The server signs as the
// envelope's payee (demo wallets, testnet only) and proves the pickup code.
// A wrong code or a second release is rejected by the contract itself.
export async function POST(req: NextRequest) {
  try {
    const { remittanceId, envelopeIdx, code } = await req.json();
    const id = Number(remittanceId);
    const idx = Number(envelopeIdx);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(idx) || idx < 0 || idx > 2) {
      return NextResponse.json({ error: "remittanceId >= 1, envelopeIdx 0-2" }, { status: 400 });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "code must be 6 digits" }, { status: 400 });
    }
    const result = await releaseEnvelope({ remittanceId: id, envelopeIdx: idx, code });
    return NextResponse.json({ ...result, explorer: explorerTxUrl(result.txHash) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
