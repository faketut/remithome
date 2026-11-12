// Client-side helpers for testnet mode (NEXT_PUBLIC_DEMO_MODE=testnet).
// The real escrow state lives on-chain; the browser only keeps the
// remittance id, the pickup code, and the tx hashes for receipts.
export const TESTNET = process.env.NEXT_PUBLIC_DEMO_MODE === "testnet";

export interface TestnetState {
  remittanceId: number;
  code: string;
  createTxHash: string;
  fundTxHash: string;
  releases: Record<number, string>; // envelopeIdx -> release tx hash
}

const KEY = "remithome-testnet-v1";

export function loadTestnet(): TestnetState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TestnetState) : null;
  } catch {
    return null;
  }
}

export function saveTestnet(s: TestnetState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearTestnet() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export const explorerTx = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

const ROLES: Record<string, string> = {
  [process.env.NEXT_PUBLIC_SENDER_ADDRESS ?? ""]: "Amara (sender, Toronto)",
  [process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? ""]: "Enugu Primary School",
  [process.env.NEXT_PUBLIC_LANDLORD_ADDRESS ?? ""]: "Landlord, Enugu",
  [process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? ""]: "MoneyGram agent, Enugu",
};

export function roleFor(address: string): string {
  return ROLES[address] ?? `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function shortAddr(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
