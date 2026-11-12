# Brainstorm — Payments: Cross-Border Remittances, Transnational Households, and the Last Mile

Challenge: Blockchain Innovation Challenge powered by Stellar (Velocity × SDF)
Dates: Nov 2–18, 2026 · Showcase form due **Fri Nov 13, 08:30 EST** (Devpost link required, project need not be complete) · Project Showcase **Mon Nov 16** · Final (top 8) **Wed Nov 18** · $15,000 CAD prizes, 3 × $5,000 winners
Judging (from Notion, Judges Criteria page): Business Impact & Relevance **37.5%**, Technology & Implementation **37.5%**, remainder presentation/demo (page crawl cut off after criterion 2 — verify the third block on the Notion page before the showcase).
Judges include SDF Ecosystem / Ecosystem Impact / Policy and Float co-founder — i.e. people who will spot a fake Stellar integration instantly.

## The problem, with numbers (all dated, check before pitching)

- Sending $200 costs **6.36% on average globally (World Bank Remittance Prices Worldwide, Q3 2025, Issue 54)** — $12.72 on a $200 send. UN SDG 10.c target is <3% by 2030, no corridor >5%. The average has barely moved in years (6.5% Q1 2025, 6.49% Q1 2025 in earlier release).
- Channel matters more than corridor: banks **14.99%**, money-transfer operators ~5.5%, digital-only ~3.54% (Q3 2025). Sub-Saharan Africa is the most expensive receiving region at **8.46%**; South Asia 5.18%.
- Scale: ~$685–926bn in remittances to low/middle-income countries (World Bank/KNOMAD, 2024–25 figures vary by definition — use one figure, cite it, don't mix). 1.3bn adults remain unbanked (World Bank Global Findex 2025: 79% of adults hold an account, up from 74% in 2021).
- The last mile is the bottleneck, not the cross-border leg: SWIFT notes ~80% of total transaction time is the domestic last mile. A sleek sender app + a recipient who must travel hours, queue, and find an agent with float is not a solved problem.
- Transnational-household twist (the topic's real insight): remittance is not a person-to-person payment, it is a **household budget sent across a border**. The sender is buying rent, school fees, and food — but the money arrives as undifferentiated cash, so it can be diverted, borrowed against, or spent before the school fee is due. The sender has no proof it paid what it was for, and no recourse except sending again.

## Three concepts, scored

Scored 1–5 on: Impact (does it move the 37.5% business criterion), Stellar-essential (is Stellar the point, or a sticker), Feasibility in 5 days (Nov 11–16, testnet + 1-min demo video + trifold + 3-min pitch), Last-mile truth (does it touch the recipient's reality, not just the sender's phone).

### A. RemitHome — earmarked remittance escrow + agent pickup ★ PICKED

Sender in Canada splits one $200 send into envelopes — Rent / School / Food-cash — locked in a Soroban escrow contract. Each envelope releases only on its own rule: School pays direct to the verified school's Stellar wallet; Rent releases to the landlord on agent attestation; Food-cash is picked up as cash at a MoneyGram agent via SEP-24, with a 6-digit pickup code the recipient can use without a smartphone. Unclaimed envelopes auto-refund after 14 days. Sender sees a per-envelope on-chain receipt.

- Impact 5 — attacks cost *and* diversion *and* proof, the three things senders actually complain about. Measurable: fee vs 6.36% benchmark, % of funds reaching the intended purpose (envelope release = proof).
- Stellar-essential 5 — 5-sec settlement and <$0.001 fees make $5–$100 envelope splits viable; Soroban escrow *enforces* earmarking (code, not trust); SEP-24/MoneyGram (480k+ locations, 170+ countries) is the last mile you don't have to build; native USDC, no bridge.
- Feasibility 4 — one contract (create / fund / release / refund), one Next.js app with 3 views (sender / recipient / agent), demo in mock mode + testnet mode. Hard parts are honestly scoped out (see below).
- Last-mile truth 5 — recipient flow is SMS/code + agent, not "download our wallet". Agent float is the named failure mode, with a mitigation (agent confirms float before code is issued).
- Risk: needs a real MoneyGram allowlist for production — testnet uses SDF's public reference anchor `testanchor.stellar.org`, no allowlist needed for dev. Say that out loud.

### B. Hometown Pool — pooled remittances for village projects

Diaspora members pool $10–50/mo into a Soroban treasury (M-of-N approvals + per-category caps) funding a shared goal — a water pump, a school roof — with on-chain votes and receipts. Kolektibo (APAC Stellar Hackathon 2026) already built almost exactly this, well, on testnet with 12/12 QA scenarios. Beating it in 5 days is unlikely, and the pitch ("trust the treasurer less") is weaker than A's ("your rent actually got paid").

- Impact 3, Stellar-essential 4, Feasibility 3, Last-mile 3. **Rejected: strong prior art, slower trust story.**

### C. RemitScore — remittance history as credit for the recipient

Turn 12 months of verified remittance receipts into a portable credit signal so the recipient household can borrow small amounts (school-fee bridge loan) from a local lender. Real need, but it needs a lender partner, a credit model, and regulatory framing — none of which exists in 5 days — and it monetises the recipient's data, which is a hard sell to these judges.

- Impact 4, Stellar-essential 2 (receipts could live anywhere), Feasibility 2, Last-mile 4. **Rejected: needs a counterparty that doesn't exist yet. Keep as a "What's next" slide.**

## The pick, in one sentence

**RemitHome: the $200 that actually pays the rent** — earmarked remittances on Stellar, released only when home confirms receipt.

Hero persona (use one, everywhere): **Amara, Toronto → Enugu, Nigeria.** Sends $200/month to her mother. Rent $100, school fees $60, food cash $40. Today: $12.72 in fees (6.36% avg), 2–3 days, no proof the school got paid. With RemitHome: $2 flat fee (1%, model — label it), ~5 seconds to escrow, school paid direct, food picked up at a MoneyGram agent with a code, receipt per envelope on Stellar Explorer (testnet).

Lead corridor: **Canada → Nigeria** (SSA is the most expensive region at 8.46% — the hardest last mile is the point). Second corridor in the roadmap, not the demo: Canada → Philippines.

## Honest scope (what this is NOT, in the demo)

- NOT a real CAD on-ramp, NOT real KYC, NOT a live MoneyGram integration (allowlisted in production; testnet reference anchor + simulated agent in the demo — labelled as such in the app and the pitch).
- NOT a live FX rate: the demo uses a fixed testnet rate, shown on screen. Real FX would come from an anchor quote (SEP-38) in production.
- NOT audited: Soroban contract is a hackathon prototype, unaudited, testnet only, no real funds.
- The 1% fee is a *model* for the pitch's unit economics, not a live price. The measured, citable numbers are the Stellar fee (~0.00001 XLM/tx, fractions of a cent) and the World Bank benchmarks above.

## Business model (for the 37.5% business criterion)

- Revenue: 1% sender fee ($2 on $200) + a small agent commission share. At 1% vs 6.36% average, the sender still saves ~$10.72/send.
- Cost: Stellar fees are negligible; the real costs are agent commission, compliance (via the anchor, not built by us), and support. Unit economics work without subsidy — which the Notion page explicitly calls out as what strong entries do.
- Customer first: Nigerian (and later Filipino) diaspora in Canada sending $100–300/month to a household, not crypto-natives. Reachable: community associations, churches/mosques, campus African student associations in Waterloo/Toronto.
- User validation (to do before Nov 16): 5 short interviews with senders — "what did you last send, what was it for, did it get there, what did it cost?" — log answers in `docs/USER_VALIDATION.md`. Even 3 interviews beat zero; judges explicitly reward this.

## Build order (Nov 11–16)

1. Tonight (Nov 11): this scaffold + Devpost project created (link needed Fri 08:30) + repo public.
2. Nov 12: Soroban contract compiles + deploys to testnet; app in mock mode end-to-end (sender → escrow → release → receipt).
3. Nov 13 AM: Showcase Form submitted with Devpost link. Nov 13–14: testnet wiring, demo video (1 min, real prototype on screen, not slides), trifold outline.
4. Nov 15: user validation interviews, pitch rehearsal, README + contract IDs frozen.
5. Nov 16: Showcase (trifold + 3-min pitch + 1-min video). Nov 17–18: polish for finals if top 8.

## Sources

- Notion: Blockchain Innovation Challenge powered by Stellar — https://uwvelocity.notion.site/Blockchain-Innovation-Challenge-powered-by-Stellar-03f63713ead683f0a5048160f9a1fd2c
- Judging criteria: https://uwvelocity.notion.site/Judges-Criteria-Prizes-55163713ead68280bca8010b823ef072
- Devpost: https://blockchain-stellar-ic.devpost.com — $15,000 CAD, 3 × $5,000
- World Bank Remittance Prices Worldwide, Issue 54 (Q3 2025): global avg 6.36% for $200; banks 14.99%; SSA 8.46%; SmaRT avg 3.29%
- MoneyGram Ramps (Stellar): SEP-10/SEP-24, 480k+ locations, 170+ countries; sandbox limits 5–2,500 USDC/tx (off-ramp); testnet reference anchor testanchor.stellar.org
- Stellar: ~5-sec settlement, fractions of a cent; Soroban Rust smart contracts; native USDC (Circle)
