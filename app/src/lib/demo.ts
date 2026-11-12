// Seeded demo data (mock mode). No real people, no real money.
// Hero flow: Amara (Toronto) -> her mother in Enugu, Nigeria. $200:
// Rent $100 / School $60 / Food-cash $40. Fixed demo FX: 1 USD = 1,550 NGN
// (labelled in the UI — NOT a live rate).

export type EnvelopeStatus = "locked" | "released" | "refunded";

export interface Envelope {
  id: string;
  purpose: "rent" | "school" | "food";
  label: string;
  amountUsd: number;
  amountNgn: number;
  payee: string;
  status: EnvelopeStatus;
  receiptTx?: string;
}

export interface Remittance {
  id: string;
  sender: string;
  recipient: string;
  corridor: string;
  amountUsd: number;
  feeUsd: number;
  pickupCode: string;
  createdAt: string;
  envelopes: Envelope[];
}

export const DEMO_FX_NGN_PER_USD = 1550;

export const DEMO_REMITTANCE: Remittance = {
  id: "RH-DEMO-001",
  sender: "Amara O. — Toronto, Canada",
  recipient: "Mama N. — Enugu, Nigeria",
  corridor: "Canada → Nigeria",
  amountUsd: 200,
  feeUsd: 2.0,
  pickupCode: "482913",
  createdAt: "2026-11-12",
  envelopes: [
    { id: "env-rent", purpose: "rent", label: "Rent", amountUsd: 100, amountNgn: 155000, payee: "Landlord wallet (Enugu)", status: "locked" },
    { id: "env-school", purpose: "school", label: "School fees", amountUsd: 60, amountNgn: 93000, payee: "St. Mary's School wallet", status: "locked" },
    { id: "env-food", purpose: "food", label: "Food — cash pickup", amountUsd: 40, amountNgn: 62000, payee: "MoneyGram agent, Enugu (SEP-24)", status: "locked" },
  ],
};

// World Bank benchmarks (Q3 2025, Issue 54) — shown on the quote screen.
export const BENCHMARKS = {
  globalAvg: { pct: 6.36, label: "Global average" },
  ssaAvg: { pct: 8.46, label: "Sub-Saharan Africa average" },
  bankAvg: { pct: 14.99, label: "Banks (average)" },
  target: { pct: 3.0, label: "UN SDG 10.c target (<3% by 2030)" },
};
