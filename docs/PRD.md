# PRD — RemitHome (v0.1, Nov 11, 2026)

## Users

| User | Who | What they need |
|---|---|---|
| Sender | Amara, 29, Toronto. Sends $200/mo to her mother in Enugu. Has a bank account, a smartphone, and no patience for fees. | Send once, know it arrived, know what it paid for. |
| Recipient | Her mother, Enugu. Feature phone, no bank account, no crypto. | Collect cash nearby, with a code, without travelling to the city. |
| Agent | MoneyGram / local agent in Enugu. Holds cash float. | Know the pickup is real and funded before handing over cash; get paid for it. |
| Payee | School / landlord. Has a Stellar wallet (onboarded by RemitHome). | Get paid direct, on time, with a receipt. |

Non-user, deliberately: the crypto-native. If the pitch only makes sense to them, it has failed.

## Core flow (the demo loop — nothing else ships before this works)

1. Sender: amount ($200 default) → split (Rent 100 / School 60 / Food 40, editable) → quote screen (fees vs benchmarks, ETA ~5 sec) → confirm → escrow funded on testnet → pickup code shown (Food envelope) + tracking link.
2. Recipient: opens tracking link (or receives code by SMS in production) → sees three envelopes and their status → goes to agent with code.
3. Agent: enters code + confirms float → escrow releases Food envelope → agent hands over cash (NGN, at the fixed demo rate) → receipt issued.
4. School: School envelope releases direct to school wallet on sender confirmation (v0.1) — agent attestation in v0.2.
5. Sender: tracking page shows per-envelope receipts with Stellar Explorer (testnet) links. Unclaimed after 14 days → auto-refund.

## Soroban contract — `remit-home`

State per remittance: sender, recipient (hashed phone/code), envelopes[] { purpose, amount, payee, release_rule, status, expiry }, pickup-code hash.

Functions:
- `create_remittance(sender, recipient_code_hash, envelopes, expiry_ledger)` — creates the escrow, returns remittance id.
- `fund(remittance_id)` — pulls USDC (SEP-41 / Stellar Asset Contract) from sender into escrow. In v0.1 the app funds via a single transfer then calls `create_remittance` with the funded balance; keep the two-step shape in the interface so the audit story is clean.
- `release_envelope(remittance_id, envelope_idx, agent, code_preimage)` — checks: caller is the registered agent (or the payee for direct-pay envelopes), code hash matches, envelope not yet released, not expired → transfers USDC to payee/agent and emits a `released` event.
- `refund_expired(remittance_id, envelope_idx)` — after expiry, anyone may call; funds return to sender; emits `refunded`.
- `get_remittance(remittance_id)` — read-only view for the tracking page.

Invariants (test these first): an envelope releases at most once; only the bound payee/agent can receive it; the code hash never reveals the code; expired envelopes cannot release, only refund; the contract never holds funds after all envelopes settle.

## App — Next.js (App Router, TypeScript)

Pages: `/` (sender), `/track/[id]` (sender + recipient tracking), `/agent` (agent code entry + float check), `/school` is not a page — the school is a payee wallet shown on the tracking page.

Modes: `NEXT_PUBLIC_DEMO_MODE=mock` (default, seeded data, no network) and `testnet` (reads/writes via `@stellar/stellar-sdk` + Soroban RPC, contract id from env). The mode is shown in the UI header at all times — judges must never mistake mock for live.

Libraries: `@stellar/stellar-sdk` for Horizon/RPC reads, `stellar-sdk` Soroban client for invokes. No wallet integration in v0.1 beyond Freighter (optional); demo wallets are Friendbot-funded testnet accounts created by `scripts/seed-demo.sh`.

## Out of scope for v0.1 (say so in the pitch, don't hide it)

Real CAD on-ramp, KYC/AML (anchor's job in production), live MoneyGram allowlist, live FX (SEP-38), recurring sends, multi-currency envelopes, agent float insurance, i18n (English + Igbo labels on the recipient view is a nice-to-have, not a blocker).

## Build order

1. Contract compiles (`stellar contract build`) + unit tests pass (release-once, wrong-code blocked, expiry refund).
2. Deploy to testnet, record contract ID in `scripts/DEPLOYMENT.md` + README.
3. App mock mode end-to-end, then testnet mode for the same loop.
4. Demo video (real app on screen), trifold, pitch rehearsal, user validation interviews.
