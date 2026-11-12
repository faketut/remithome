# Devpost draft — paste-ready (fill in the TBDs; do NOT submit from here)

- **Project name:** RemitHome
- **Tagline:** The $200 that actually pays the rent — earmarked remittances on Stellar.
- **Devpost:** https://blockchain-stellar-ic.devpost.com
- **Repo:** https://github.com/faketut/remithome — public, pushed Nov 11 (commit 22a2207, verified remote HEAD matches).
- **Live demo URL:** TBD (deploy app or record local demo; testnet mode needs contract ID).
- **Demo video URL (YouTube/Loom, ≤1 min of prototype):** TBD — record per `DEMO_SCRIPT.md`.
- **Stellar Testnet contract ID:** TBD — deploy per `scripts/deploy-testnet.sh`, paste ID + Explorer link.

## Inspiration

Amara in Toronto sends $200/month home to Enugu, Nigeria. The fee is the least of it — the money arrives as cash, and she has no proof the school got paid. Last term she paid the fees twice.

## What it does

RemitHome splits one remittance into envelopes (Rent / School / Food), locks them in a Soroban escrow contract, and releases each only for its purpose: school is paid direct to the school's wallet, food is picked up as cash at a MoneyGram agent with a 6-digit code (no smartphone needed), rent releases on agent attestation. Unclaimed envelopes auto-refund after 14 days. Every envelope leaves an on-chain receipt.

## How we built it

Soroban (Rust) escrow contract + Next.js app + Stellar SDK; USDC on Stellar Testnet; SEP-24 / MoneyGram as the cash last mile (testnet reference anchor; simulated agent in the demo, labelled in-app); Friendbot-funded demo wallets.

## Challenges

MoneyGram production access needs allowlisting — scoped to the testnet reference anchor for the hackathon. Live FX was scoped out (fixed demo rate, shown on screen). The contract is unaudited and testnet-only.

## Accomplishments

End-to-end loop in mock mode; contract with release-once / wrong-code / expiry-refund invariants (tests TBD — update this line with the real count once they run).

## What we learned

The last mile is a household-budget problem, not a speed problem — and the cheapest credible last mile is one someone else already built (480k MoneyGram locations).

## What's next

User validation with 5 senders; Canada → Philippines as corridor two; SEP-38 anchor quotes for live FX; recurring sends.

## Built with

Stellar, Soroban, USDC, Next.js, TypeScript, stellar-sdk.
