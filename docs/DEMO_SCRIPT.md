# Demo video — 60 seconds, real prototype on screen (not slides)

Record the app, not a deck. One continuous take per scene if possible; cut between scenes, never fake a step.

## Shot list (60s total — happy path first, attack shots last)

| Time | Screen | Action / narration |
|---|---|---|
| 0:00–0:08 | Sender view | "$200 to Enugu. Rent $100, school $60, food $40." Split sliders move; quote panel shows $2.00 fee vs $12.72 World Bank average. Click Send. |
| 0:08–0:16 | Sender view → tracking | Escrow funded; three envelopes appear as Locked. Pickup code shown (blur all but last 2 digits on the recording if the code is live). "Five seconds, fractions of a cent." |
| 0:16–0:28 | Agent view | Agent enters the 6-digit code, confirms float, clicks Confirm pickup. Food envelope flips Locked → Released; cash amount in NGN shown. |
| 0:28–0:40 | Tracking view | School envelope releases direct to the school wallet. All three envelopes show receipts; click one receipt → Stellar Explorer (testnet) transaction page loads. |
| 0:40–0:48 | Agent view | **Attack 1 — wrong code.** Agent enters a wrong 6-digit code and clicks Confirm. Error shown, envelope stays Locked. "The code is hashed on-chain; a wrong code moves nothing." |
| 0:48–0:54 | Tracking view | **Attack 2 — double release.** Click Release on the already-released school envelope again. Contract rejects it (`already released`); status stays Released, no second payment. "One envelope pays at most once." |
| 0:54–0:60 | Tracking view | **Attack 3 — expiry refund.** Show an expired demo envelope (or the refund call on testnet): release is closed after expiry, funds return to the sender. End card: "$200 sent, $198 delivered to its purposes, $2 fee. Every envelope receipted." + repo / live demo URLs. |

## Why the attack shots matter

The happy path proves the app works; the attack shots prove the contract is actually guarding the money. Judges have seen a hundred "send money on-chain" demos — a visible rejection is what makes them believe the escrow is real. All three rejections are enforced by the contract itself, not by the UI:

- Wrong code: `release_envelope` asserts the supplied code hash equals the stored `code_hash`.
- Double release: `release_envelope` asserts `!released` (and `!refunded`) before transferring.
- Expiry refund: after `expiry`, `release_envelope` is closed and only `refund_expired` can move the funds, back to the sender.

## Recording notes

- Use mock mode for the rehearsal take; use testnet mode for the final take if the contract is deployed — and say which mode is on screen (it's in the header).
- Attack 2 on testnet: the rejection appears as a failed contract invocation — capture the error, don't narrate over a spinner. In mock mode the UI blocks the second click; say so on screen if that's the take you use.
- Attack 3 needs an expired envelope: easiest is a second seeded demo remittance whose expiry has passed, or a testnet call against an old remittance id. Don't fake the clock — use a genuinely expired one.
- If a testnet step is slow on the day, cut to the receipt, don't narrate over a spinner.
- Keep the cursor slow. Judges watch the money move, not the mouse.
- Audio: one voice, no music bed under narration.
