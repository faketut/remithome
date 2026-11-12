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

## Rehearsal results (Nov 11, testnet, via the app's API routes)

Every shot was rehearsed end-to-end before recording. Timings exclude the
first-hit dev-server compile (~10s); real chain steps on a warm server:

| Step | Time | Result |
|---|---|---|
| Create remittance #2 ($200) | ~10–13s | id 2, code 822194, tx `0694699c…` |
| Attack 1 — wrong code (food) | ~2s | Contract trapped in `release_envelope`; nothing moved |
| Release food (correct code) | ~3s | tx `85dfda52…` |
| Release school | ~5s | tx `dd9f2622…` |
| Attack 2 — double release (school) | ~1s | Contract trapped in `release_envelope` |
| Create remittance #3, expiry 6 ledgers (~30s) | ~13s | id 3, code 923061 |
| Refund before expiry | ~1s | Trapped (`not expired yet`) — the guard works both ways |
| Refund after expiry (rent) | ~8s | tx `b963dba1…`; school+food refunded the same way |
| Full loop #1 (earlier): create + 3 releases | — | create `71321447…`, school `72f5ce9a…`, food `5cbe349a…`, rent `3b2c09b1…`; balances verified (school 60 / landlord 100 / agent 40 USDC) |

A real-time 60s video is feasible: the chain steps total ~35–40s including
the Explorer receipt, leaving ~20s for narration beats and navigation.

## Final take (Nov 11, take 9 — the shipped video)

`scripts/record/videos/remithome-demo-60s.mp4` — **exactly 60.0s, 1280×720,
H.264, 1.3MB**, cut from the raw take
(`remithome-demo-raw-take9.webm`, 75.5s) by trimming the middle of the
"Locking / Releasing on-chain…" spinners and adding a 2.5s end card
("$200 sent. $198 delivered to its purposes."). Every shot verified frame by
frame:

| Shot | Video time | What happens |
|---|---|---|
| 1 — send | 0:00–0:13 | Amara locks $200; remittance **#18, code 869711** |
| 2 — track | 0:13–0:24 | 3 envelopes locked, pickup code visible |
| 3 — agent pickup | 0:24–0:33 | Food $40 released, receipt link on screen |
| 4 — school + rent | 0:33–0:43 | School $60, rent $100 released; "3 of 3 released" |
| Attack 1 | 0:43–0:49 | Wrong code 000000 rejected |
| Attack 2 | 0:49–0:55 | Double release of school rejected |
| Attack 3 | 0:55–0:58 | Expired remittance #17 rent refunded to sender |
| End card | 0:58–1:00 | $200 sent, $198 delivered |

All three rejections are the contract's, on screen as red errors; the
releases show Explorer receipt links. One caveat: the recording browser
cannot reach stellar.expert through the VM's egress proxy
(`ERR_TUNNEL_CONNECTION_FAILED` even with the proxy configured), so the
video shows the receipt *links* on the track/agent pages rather than the
Explorer page itself — the tx hashes are real and clickable from the live
app. Takes 1–8 died on, in order: a transient RPC 500, a broken dev server
(`npm run build` while it was serving), the headless-shell browser not
recording video at all, React hydration wiping the filled code/checkbox,
the demo sender running out of test USDC (150 < 400), the outcome poller
waiting 30s on a missing error box while the release had already
succeeded, the Explorer navigation poisoning the next goto, and the
browser proxy swallowing localhost. Each fix is in
`scripts/record/record-demo.mjs` (hydration wait, fill-and-verify,
short-timeout outcome polling, pre-flight USDC check, localhost proxy
bypass, back-to-track retry) — re-running it reproduces the video.

## Recording notes

- Use mock mode for the rehearsal take; use testnet mode for the final take if the contract is deployed — and say which mode is on screen (it's in the header).
- Attack 2 on testnet: the rejection appears as a failed contract invocation — capture the error, don't narrate over a spinner. In mock mode the UI blocks the second click; say so on screen if that's the take you use. **On the testnet track page there is a "Release again (contract will reject)" button under released envelopes, precisely so this shot is clickable.**
- Attack 3 needs an expired envelope: easiest is a second seeded demo remittance whose expiry has passed, or a testnet call against an old remittance id. Don't fake the clock — use a genuinely expired one. The recorder (`scripts/record/record-demo.mjs`) creates a 6-ledger-expiry remittance and waits ~45s for it to expire before it starts recording.
- If a testnet step is slow on the day, cut to the receipt, don't narrate over a spinner.
- Keep the cursor slow. Judges watch the money move, not the mouse.
- Audio: one voice, no music bed under narration. The recorded video is silent — narrate live over it at the showcase.
- **Never run `npm run build` while the dev server is serving a recording take** — the build shares `.next/` with the dev server and breaks it (dev server starts returning 500; take 2 died this way). Record against the dev server; build only when the dev server is stopped.
- **The headless-shell Chromium cannot record video** (`page.video()` returns null, no file is ever written). Recording needs the full Chromium (`npx playwright install chromium` in `scripts/record/`); the recorder uses `playwright` (not `playwright-core`) and the full browser it installs.
- The happy path in the recorded take includes the rent release too (one more click, ~5s), so the end card "$200 sent, $198 delivered to its purposes" is literally true on screen.

## Funding gotcha (found during rehearsal, fixed Nov 11)

The app used to fund a create with "only the shortfall" against the
contract's USDC balance. That balance includes money already allocated to
other remittances' locked envelopes, so the shortfall math double-counted
it: the contract once hit 0 USDC while 300 USDC of envelopes were still
outstanding, and a refund failed with contract error #10 (insufficient
balance). Fix: every create transfers the FULL total (`app/src/lib/server/stellar.ts`),
and the contract was topped up 300 USDC to restore full backing for all
outstanding envelopes. Never reintroduce shortfall funding.
