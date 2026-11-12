# Cost model — $200 send, Canada → Nigeria (model, not a live price)

Benchmarks: World Bank Remittance Prices Worldwide, Issue 54 (Q3 2025), $200 send.

| Route | Cost on $200 | Sender pays | What the household gets |
|---|---|---|---|
| Bank (avg) | 14.99% | $29.98 | ~$170.02, as cash, no proof |
| Global average (all channels) | 6.36% | $12.72 | ~$187.28, as cash, no proof |
| Sub-Saharan Africa avg | 8.46% | $16.92 | ~$183.08, as cash, no proof |
| Digital-only operator (avg) | 3.54% | $7.08 | ~$192.92 |
| Cheapest 3 in corridor (SmaRT avg) | 3.29% | $6.58 | ~$193.42 |
| **RemitHome (model)** | **1% + Stellar fee** | **~$2.00** | **$198.00, earmarked + receipted** |

Stellar network fee per transaction is a fraction of a cent (~0.00001 XLM base fee) — negligible
next to the $2 model fee, and the reason $40 envelopes are viable at all.

## What the $2 has to cover (honest version)

Agent commission (the cash-out agent must be paid — this is the real last-mile cost),
compliance via the anchor (KYC is the anchor's, not ours, in production), support, and
the FX spread charged by the anchor (SEP-38 quote in production; fixed demo rate here).
If agent commission alone exceeds $2 on a $200 send, the fee model changes — that is the
first thing user validation + anchor quotes should test, and the pitch should not claim
otherwise.

## Sensitivity

- At 0.5% fee ($1): sender saves $11.72 vs global avg, but agent commission likely uncovered.
- At 1.5% fee ($3): sender still saves $9.72 vs global avg; more headroom for the agent.
- The pitch uses 1% as the model. Do not present it as a live price.
