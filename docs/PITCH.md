# Pitch — 3-minute showcase (Mon Nov 16)

One speaker. One story. Demo video is 60 seconds inside the 3 minutes — rehearse the handover.

## Script (approx. 180 seconds)

**0:00–0:25 — The person.** "Amara lives in Toronto. Every month she sends $200 home to her mother in Enugu, Nigeria — $100 for rent, $60 for school fees, $40 for food. She is one of millions: remittances are the largest flow of money into low-income countries, bigger than aid. But Amara has a problem that has nothing to do with how fast the money moves."

**0:25–0:55 — The problem, with numbers.** "Sending $200 costs 6.36% on average — $12.72 — according to the World Bank, and 8.46% to Sub-Saharan Africa. Banks charge 15%. And when it arrives, it arrives as cash. Amara has no proof the school got paid. Last term she sent the fees twice. That is the last mile: not the border, the household budget."

**0:55–1:10 — The idea.** "RemitHome splits one send into envelopes — rent, school, food — and locks them in a smart contract on Stellar. Each envelope can only pay what it was for. School gets paid direct. Food is picked up as cash at a MoneyGram agent with a six-digit code — her mother doesn't need a smartphone, or a bank account."

**1:10–2:10 — Demo video (60s).** See `DEMO_SCRIPT.md`. Narrate one line over it: "Watch the school envelope pay direct, the food envelope release at the agent, and the receipt land on Stellar Explorer — in about five seconds, for fractions of a cent."

**2:10–2:40 — Why Stellar, why now.** "This only works on Stellar. Sub-cent fees make a $40 envelope viable. Soroban enforces the earmarking — it's code, not trust. And SEP-24 plus MoneyGram gives us 480,000 pickup points in 170 countries on day one. We didn't build an agent network; we plugged into one."

**2:40–3:00 — Business + ask.** "We charge 1% — $2 on $200 — so Amara still saves about $10 a send, and the economics work without a subsidy. Next: three more corridors, and interviews with five senders this week — we want the people who'd actually use this to break it before we build more. Thank you."

## Trifold board outline

- Left panel: Amara's story + the numbers (6.36% / 8.46% / 15% banks, World Bank Q3 2025) + "the money arrives as cash; the budget doesn't."
- Centre panel: the product — big diagram: Sender → Soroban escrow (3 envelopes) → School (direct) / Agent (code + cash) / Landlord; screenshot of the tracking page with per-envelope receipts.
- Right panel: why Stellar (5 sec, sub-cent, SEP-24/MoneyGram, native USDC) + business model (1% fee, sender saves ~$10.72/send) + what's next + QR codes (repo, live demo, testnet contract on Explorer).

## Q&A — answers to expect

- "Isn't this just sending USDC?" — No: sending USDC is the transport. The product is earmarking + proof + a cash last mile for someone with no smartphone. The escrow is what makes the $200 actually pay the rent.
- "MoneyGram needs allowlisting, right?" — Yes, in production. On testnet we use SDF's public reference anchor, which needs no allowlist, and a simulated agent in the demo — both labelled. The allowlist is a partnership step, not a technical blocker.
- "What about KYC?" — The anchor handles KYC in production (that's what SEP-10/SEP-24 are for). We don't hold user funds beyond the escrow, and the contract is testnet-only and unaudited — we say that on the board.
- "Why Nigeria first?" — Sub-Saharan Africa is the most expensive receiving region (8.46%). If it works there, the economics work everywhere. Philippines is corridor two.
