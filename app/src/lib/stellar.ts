// Stellar Testnet wiring (v0.1 scaffold).
// Mock mode is the default and needs none of this. Testnet mode reads the
// escrow contract via Soroban RPC and Horizon; invoke paths (fund / release)
// are implemented in the app once the contract ID is deployed — see PRD.
// Do NOT put secret keys in this file or in the repo. Demo wallets are
// Friendbot-funded testnet accounts created by scripts/seed-demo.sh.

export const TESTNET = {
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org:443",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "",
};

export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE ?? "mock"; // "mock" | "testnet"

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}
