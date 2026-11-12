import { NextRequest, NextResponse } from "next/server";
import {
  createRemittance,
  explorerTxUrl,
  getRemittance,
} from "@/lib/server/stellar";

export const dynamic = "force-dynamic";

// POST /api/remittance { rent, school, food } (USD)
// Locks the send in the Soroban escrow on Stellar Testnet and returns the
// remittance id + pickup code + tx hashes. Testnet demo only.
export async function POST(req: NextRequest) {
  try {
    const { rent, school, food, expiryLedgers } = await req.json();
    const amounts = [rent, school, food].map(Number);
    if (amounts.some((n) => !Number.isFinite(n) || n <= 0)) {
      return NextResponse.json({ error: "amounts must be positive numbers" }, { status: 400 });
    }
    const total = amounts.reduce((a, b) => a + b, 0);
    if (total > 250) {
      return NextResponse.json({ error: "demo sender holds 750 test USDC; keep the send under $250" }, { status: 400 });
    }
    const result = await createRemittance({
      rentUsd: amounts[0],
      schoolUsd: amounts[1],
      foodUsd: amounts[2],
      ...(Number.isInteger(expiryLedgers) && expiryLedgers > 0 ? { expiryLedgers } : {}),
    });
    return NextResponse.json({
      ...result,
      ...(result.fundTxHash ? { explorerFund: explorerTxUrl(result.fundTxHash) } : {}),
      explorerCreate: explorerTxUrl(result.createTxHash),
    });
  } catch (e) {
    console.error("[POST /api/remittance]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/remittance?id=1 — read the on-chain escrow state.
export async function GET(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "pass ?id=<remittance id>" }, { status: 400 });
    }
    const state = await getRemittance(id);
    return NextResponse.json(state);
  } catch (e) {
    console.error("[GET /api/remittance]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
