# RemitHome — the $200 that actually pays the rent

[![RemitHome demo — $200 sent, $198 delivered (60s)](scripts/record/videos/remithome-demo-60s.gif)](scripts/record/videos/remithome-demo-60s.mp4)

*60-second demo, live on Stellar Testnet: $200 locked in escrow, split into Rent $100 / School $60 / Food $40, all released — then a wrong pickup code, a double release, and an expired-envelope refund, all rejected by the contract. Click the clip for the [full video (mp4, 60s, 720p)](scripts/record/videos/remithome-demo-60s.mp4).*

Stellar Blockchain Innovation Challenge (Velocity × Stellar Development Foundation), Nov 2–18, 2026.
Topic: **Payments: Cross-Border Remittances, Transnational Households, and the Last Mile.**
Public repo: https://github.com/faketut/remithome

> Amara in Toronto sends $200/month home to Enugu, Nigeria — $100 rent, $60 school fees, $40 food.
> Today that costs ~$12.72 in fees (World Bank global average, 6.36% for $200, Q3 2025), takes days,
> and arrives as undifferentiated cash: no proof the school got paid.
> RemitHome locks the send in a Soroban escrow contract, split into envelopes.
> School is paid direct to the school's wallet. Food is picked up as cash at a MoneyGram agent with a
> 6-digit code — no smartphone needed. Rent releases on agent attestation. Unclaimed funds auto-refund.
> Every envelope leaves an on-chain receipt the sender can see.

## Status (honest)

- [x] Brainstorm + pick (Nov 11) — see `docs/BRAINSTORM.md`
- [x] Scaffold: Soroban contract source, Next.js app skeleton (mock mode), docs
- [x] Contract compiles + unit tests pass (Nov 11: `stellar contract build` OK, wasm 7,322 bytes, 2/2 `cargo test` pass; 3 minimal fixes in `src/lib.rs`, interface unchanged)
- [x] Contract deployed to Stellar Testnet — **contract ID: `CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2`** ([Explorer](https://stellar.expert/explorer/testnet/contract/CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2)), verified live Nov 11 (spec returns all 4 functions; `get_remittance(1)` traps as designed). See `scripts/DEPLOYMENT.md`.
- [x] App wired to testnet end-to-end (Nov 11 ~23:30 UTC): sender → escrow → release → receipt through the app's own API routes, remittance #1 fully released on-chain (create `71321447…`, school `72f5ce9a…`, food `5cbe349a…`, rent `3b2c09b1…`); wrong-code and double-release attacks both rejected by the contract. Balances verified: school 60 / landlord 100 / agent 40 USDC. 200 USDC unallocated remains in the contract (covers the next create). See `scripts/DEPLOYMENT.md` for the gotchas (JS SDK v13 meta-parse bug, Friendbot `&asset=` delivers no USDC, payee trustlines required).
- [ ] App wired to testnet (sender → escrow → release → receipt, end to end)
- [ ] Devpost project created + Showcase Form submitted — **due Fri Nov 13, 08:30 EST**
- [x] 1-minute demo video (real prototype on screen, not slides) — [60s clip at the top of this README](scripts/record/videos/remithome-demo-60s.mp4) (GIF plays inline; full mp4 linked)
- [ ] User validation: 3–5 sender interviews — `docs/USER_VALIDATION.md`
- [ ] Showcase Mon Nov 16 (trifold + 3-min pitch) · Final Wed Nov 18 (if top 8)

## Try it (mock mode, no keys, no blockchain)

```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

Mock mode is the default: the full sender → escrow → agent → receipt loop runs against
seeded demo data, so judges and teammates can click through in 60 seconds. Set
`NEXT_PUBLIC_DEMO_MODE=testnet` and `NEXT_PUBLIC_CONTRACT_ID=<id>` for the live path
(see `app/.env.example`).

## Repo layout

```
contracts/remit-home/   Soroban escrow contract (Rust): envelopes, release rules, refund
app/                    Next.js demo app: sender / recipient / agent / track views
scripts/                deploy-testnet.sh, seed-demo.sh
docs/                   BRAINSTORM.md, PRD.md, PITCH.md, DEMO_SCRIPT.md, DEVPOST_DRAFT.md
```

## How it works

1. **Send.** Sender enters $200, splits it (Rent $100 / School $60 / Food $40), sees the
   transparent quote: Stellar network fee (fractions of a cent) + 1% RemitHome fee (model)
   vs the World Bank benchmarks (6.36% global avg, 14.99% banks, 8.46% Sub-Saharan Africa).
2. **Lock.** USDC is locked in the Soroban escrow contract as three envelopes, each with its
   own release rule and a 14-day expiry. A 6-digit pickup code (hashed on-chain) is issued
   for the cash envelope.
3. **Release.** School envelope → direct transfer to the verified school wallet.
   Food envelope → recipient shows the code at a MoneyGram agent (SEP-24 cash-out in
   production; testnet reference anchor + simulated agent in this demo); the agent attests
   pickup and the escrow releases. Rent envelope → releases to the landlord on agent attestation.
4. **Prove.** Each release writes an event + receipt, viewable on Stellar Explorer (testnet).
   Unclaimed envelopes refund automatically after expiry.

Why Stellar, specifically: 5-second settlement and sub-cent fees make $40–$100 envelope
splits viable; Soroban enforces earmarking in code, not trust; SEP-24 + MoneyGram
(480k+ locations, 170+ countries) is a last mile we don't have to build; native USDC, no bridge.

## What this is not

- Not a real CAD on-ramp, not real KYC, not a live MoneyGram integration (production needs
  MoneyGram allowlisting; the demo uses SDF's public testnet reference anchor
  `testanchor.stellar.org` plus a simulated agent — labelled in-app).
- Not a live FX rate: the demo uses a fixed testnet rate, shown on screen. Production FX
  would come from an anchor quote (SEP-38).
- Not audited, testnet only, no real funds. The 1% fee is a model for unit economics, not a live price.

## Docs

- `docs/BRAINSTORM.md` — the three concepts, scoring, and why this one
- `docs/PRD.md` — product spec, flows, and build order
- `docs/PITCH.md` — 3-minute showcase pitch + trifold outline
- `docs/DEMO_SCRIPT.md` — the 60-second demo, shot by shot
- `docs/DEVPOST_DRAFT.md` — paste-ready Devpost fields (fill in repo/video/contract IDs)
- `docs/COST_MODEL.md` — unit economics vs World Bank benchmarks
