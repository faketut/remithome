// Server-only Soroban client for the RemitHome testnet demo.
//
// Runs ONLY in Next.js API routes (never imported by client components).
// Holds the testnet demo wallets' secret keys from env — testnet only, no
// real funds. These are NOT NEXT_PUBLIC_ vars, so Next.js never ships them
// to the browser. Do not import this module from any 'use client' file.
import * as StellarSdk from "@stellar/stellar-sdk";
import { createHash } from "crypto";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org:443";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
const USDC_SAC = process.env.NEXT_PUBLIC_USDC_SAC ?? "";

const rpc = new StellarSdk.rpc.Server(RPC_URL);

export const DEMO_CODE_LENGTH = 6;

function keypairFromSecret(secret: string | undefined, role: string) {
  if (!secret) throw new Error(`Missing demo key for ${role} (REMITHOME_${role}_SECRET)`);
  return StellarSdk.Keypair.fromSecret(secret);
}

const senderKp = () => keypairFromSecret(process.env.REMITHOME_SENDER_SECRET, "SENDER");
const schoolKp = () => keypairFromSecret(process.env.REMITHOME_SCHOOL_SECRET, "SCHOOL");
const landlordKp = () => keypairFromSecret(process.env.REMITHOME_LANDLORD_SECRET, "LANDLORD");
const agentKp = () => keypairFromSecret(process.env.REMITHOME_AGENT_SECRET, "AGENT");

export const ADDRESSES = {
  sender: process.env.NEXT_PUBLIC_SENDER_ADDRESS ?? "",
  school: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
  landlord: process.env.NEXT_PUBLIC_LANDLORD_ADDRESS ?? "",
  agent: process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? "",
};

function payeeKeypairFor(address: string) {
  if (address === ADDRESSES.school) return schoolKp();
  if (address === ADDRESSES.landlord) return landlordKp();
  if (address === ADDRESSES.agent) return agentKp();
  throw new Error(`No demo key for payee ${address}`);
}

export function newPickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function codeHash(code: string): Buffer {
  return createHash("sha256").update(code, "utf8").digest();
}

const sym = (s: string) => StellarSdk.nativeToScVal(s, { type: "symbol" });
const vecOf = (items: StellarSdk.xdr.ScVal[]) =>
  StellarSdk.nativeToScVal(items, { type: "vec" });
const i128 = (n: bigint) => StellarSdk.nativeToScVal(n, { type: "i128" });
const u64 = (n: bigint) => StellarSdk.nativeToScVal(n, { type: "u64" });
const u32 = (n: number) => StellarSdk.nativeToScVal(n, { type: "u32" });
const addr = (a: string) => StellarSdk.nativeToScVal(new StellarSdk.Address(a));
const bytes = (b: Buffer) => StellarSdk.nativeToScVal(b, { type: "bytes" });

export const usdToStroops = (usd: number) => BigInt(Math.round(usd * 10_000_000));
export const stroopsToUsd = (s: bigint) => Number(s) / 10_000_000;

async function pollTx(hash: string, label: string) {
  // Raw JSON-RPC polling, NOT rpc.getTransaction: this SDK version's XDR
  // cannot parse the testnet's TransactionMeta (switch 4 = v4 in the current
  // protocol; the SDK only knows switches 0-3), so getTransaction throws
  // "Bad union switch: 4" on every successful Soroban tx. We only need the
  // status here, which the raw JSON gives us without any XDR parsing.
  const started = Date.now();
  for (;;) {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: { hash } }),
    });
    const json = (await res.json()) as { result?: { status?: string } };
    const status = json.result?.status;
    if (status === "SUCCESS") return;
    if (status === "FAILED") throw new Error(`${label} failed on-chain (tx ${hash})`);
    if (Date.now() - started > 90000) throw new Error(`${label} timed out (tx ${hash})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

interface InvokeOpts {
  source: StellarSdk.Keypair;
  contractId: string;
  method: string;
  args: StellarSdk.xdr.ScVal[];
  signers: StellarSdk.Keypair[];
}

async function invoke({ source, contractId, method, args, signers }: InvokeOpts) {
  const account = await rpc.getAccount(source.publicKey());
  const op = new StellarSdk.Contract(contractId).call(method, ...args);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();
  const prepared = await rpc.prepareTransaction(tx);
  for (const kp of signers) prepared.sign(kp);
  const sent = await rpc.sendTransaction(prepared);
  await pollTx(sent.hash, `${contractId.slice(0, 8)}.${method}`);
  return { hash: sent.hash };
}

async function simulateCall(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<unknown> {
  const sender = senderKp();
  const account = await rpc.getAccount(sender.publicKey());
  const op = new StellarSdk.Contract(contractId).call(method, ...args);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  const sim = await rpc.simulateTransaction(tx);
  if ("error" in sim) throw new Error(`${method} simulation failed: ${sim.error}`);
  if (!sim.result) throw new Error(`${method} simulation returned no result`);
  return StellarSdk.scValToNative(sim.result.retval);
}

export interface CreateResult {
  remittanceId: number;
  code: string;
  fundTxHash: string;
  createTxHash: string;
}

export async function createRemittance(input: {
  rentUsd: number;
  schoolUsd: number;
  foodUsd: number;
  expiryLedgers?: number;
}): Promise<CreateResult> {
  if (!CONTRACT_ID || !USDC_SAC) throw new Error("Testnet not configured (CONTRACT_ID / USDC_SAC missing)");
  const sender = senderKp();
  const amounts = [input.rentUsd, input.schoolUsd, input.foodUsd].map(usdToStroops);
  const total = amounts.reduce((a, b) => a + b, BigInt(0));
  const code = newPickupCode();
  const hash = codeHash(code);

  // Fund the escrow with the FULL total, every time. Do NOT fund "only the
  // shortfall" against the contract's balance: that balance includes funds
  // already allocated to other remittances' locked envelopes, so a shortfall
  // computation double-counts them and leaves the new remittance underfunded
  // (found Nov 11: the contract hit 0 USDC while 300 USDC of envelopes were
  // still outstanding, and a refund failed with Contract error #10).
  // The contract itself never checks funding — it just pays from its own
  // balance — so each create must bring its own money.
  const fund = await invoke({
    source: sender,
    contractId: USDC_SAC,
    method: "transfer",
    args: [addr(sender.publicKey()), addr(CONTRACT_ID), i128(total)],
    signers: [sender],
  });
  const fundTxHash = fund.hash;

  // Create the remittance: envelopes bound to their payees.
  // Default expiry ~14 days; a short expiry is allowed for the demo's
  // expiry-refund shot (a genuinely expired envelope, never a faked clock).
  const latest = await rpc.getLatestLedger();
  const expiryLedgers = input.expiryLedgers ?? 241920;
  const expiry = BigInt(latest.sequence) + BigInt(expiryLedgers);
  const created = await invoke({
    source: sender,
    contractId: CONTRACT_ID,
    method: "create_remittance",
    args: [
      addr(sender.publicKey()),
      bytes(hash),
      addr(USDC_SAC),
      u64(expiry),
      vecOf(["rent", "school", "food"].map(sym)),
      vecOf(amounts.map(i128)),
      vecOf([addr(ADDRESSES.landlord), addr(ADDRESSES.school), addr(ADDRESSES.agent)]),
    ],
    signers: [sender],
  });

  // The new id: the SDK can't read the create return value (see pollTx note),
  // so probe: ids are dense from 1, the highest existing id is the new one.
  let remittanceId = 0;
  for (let id = 1; ; id++) {
    const state = await tryGetRemittance(id);
    if (!state) break;
    remittanceId = id;
    if (id > 1000) throw new Error("too many remittances to probe");
  }
  if (remittanceId === 0) throw new Error("create succeeded but no remittance found on-chain");

  return { remittanceId, code, fundTxHash, createTxHash: created.hash };
}

export interface EnvelopeState {
  purpose: string;
  amountUsd: number;
  payee: string;
  released: boolean;
  refunded: boolean;
}

export interface RemittanceState {
  id: number;
  sender: string;
  token: string;
  expiry: number;
  envelopes: EnvelopeState[];
}

export async function getRemittance(id: number): Promise<RemittanceState> {
  const state = await tryGetRemittance(id);
  if (!state) throw new Error(`remittance ${id} not found on-chain`);
  return state;
}

export async function tryGetRemittance(id: number): Promise<RemittanceState | null> {
  let raw: Record<string, unknown>;
  try {
    raw = (await simulateCall(CONTRACT_ID, "get_remittance", [u64(BigInt(id))])) as Record<
      string,
      unknown
    >;
  } catch {
    return null; // no such remittance (the contract traps) — not an error here
  }
  const envelopes = (raw.envelopes as Record<string, unknown>[]).map((e) => ({
    purpose: String(e.purpose),
    amountUsd: stroopsToUsd(e.amount as bigint),
    payee: String(e.payee),
    released: Boolean(e.released),
    refunded: Boolean(e.refunded),
  }));
  return {
    id,
    sender: String(raw.sender),
    token: String(raw.token),
    expiry: Number(raw.expiry as bigint),
    envelopes,
  };
}

export async function releaseEnvelope(input: {
  remittanceId: number;
  envelopeIdx: number;
  code: string;
}): Promise<{ txHash: string; payee: string }> {
  const state = await getRemittance(input.remittanceId);
  const envelope = state.envelopes[input.envelopeIdx];
  if (!envelope) throw new Error(`No envelope ${input.envelopeIdx} on remittance ${input.remittanceId}`);
  // NOTE: no released/refunded pre-check here on purpose — a double release
  // must be rejected by the CONTRACT (its simulation traps), not by this
  // server, so the demo's attack shots are enforced on-chain.
  const payee = payeeKeypairFor(envelope.payee);
  const { hash } = await invoke({
    source: payee,
    contractId: CONTRACT_ID,
    method: "release_envelope",
    args: [
      u64(BigInt(input.remittanceId)),
      u32(input.envelopeIdx),
      addr(envelope.payee),
      bytes(codeHash(input.code)),
    ],
    signers: [payee],
  });
  return { txHash: hash, payee: envelope.payee };
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

// Refund one expired envelope back to the sender. The contract enforces
// that the expiry has passed and the caller is the sender; a refund before
// expiry traps on-chain.
export async function refundEnvelope(input: {
  remittanceId: number;
  envelopeIdx: number;
}): Promise<{ txHash: string }> {
  const sender = senderKp();
  const { hash } = await invoke({
    source: sender,
    contractId: CONTRACT_ID,
    method: "refund_expired",
    args: [u64(BigInt(input.remittanceId)), u32(input.envelopeIdx)],
    signers: [sender],
  });
  return { txHash: hash };
}
