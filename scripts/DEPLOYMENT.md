# Deployment — Stellar Testnet

- Date: 2026-11-11 ~22:45 UTC
- Contract ID: `CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2`
- Explorer: https://stellar.expert/explorer/testnet/contract/CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2
- WASM sha256: `96ce57beb8f3e03e6b30b98bb899f10f1046564ed659536cb1d7e7ac69cbce1f` (matches the local build)
- Deployer (testnet admin): `GDKKIY2YL7DI5FAJKWBXLAFG5ZQ7ZHCBG6FRVN3GRHZ4YCAN5JQQFPCC`
- Network: testnet (Friendbot-funded admin, no real funds)
- Upload tx: `10e5e8e5d6e9fac324e791a36a98fa2e8aa91c0160f3fc59749a4ecf8adbc8ca`
- Create tx: `b00b85ebd52d7c1fc7a58b92dfd6f7cb29aa097a2ca0308ed5bfc21f9df15522`
- Deployed via `scripts/deploy-testnet.py` (stellar-sdk-python); the Stellar CLI cannot reach the RPC through this VM's egress proxy (`client error (Connect)` on upload/fund), while plain HTTPS through the proxy works.
- Verified live: `get_contract_spec` returns all 4 functions (`create_remittance`, `release_envelope`, `refund_expired`, `get_remittance`); simulated `get_remittance(1)` traps as designed ("remittance not found" — no remittance exists yet), proving the deployed code runs and dispatches.
- Note: the `success` Hash in the create transaction's result XDR is NOT the contract ID (it is sha256 of the success preimage). The real contract address comes from `soroban_meta.return_value` in the transaction meta — see `extract_contract_id` in `deploy-testnet.py`.

## End-to-end testnet run (2026-11-11 ~23:00–23:30 UTC)

Full loop sender → escrow → release → receipt, executed through the app's
own API routes (`/api/remittance`, `/api/release`) against the deployed
contract. Demo wallets: sender `GACOLSK7…` (750 test USDC via SDEX swap),
school `GAYYRMRS…`, landlord `GBDPTNRH…`, agent `GBV7RKWG…` (seeded by
`scripts/seed-testnet-demo.py`; secrets in gitignored `app/.env.local`).

- **Create remittance #1** ($200: Rent 100 / School 60 / Food 40, code 453698):
  tx `71321447efcdecb5f44a6ba8d007dad8d86a4384ec0c9db8686533ee4677d7fa`
- **Release school (idx 1, $60)**: tx `72f5ce9ab14eea48c2a69e460825a9b0ecf5b7bb3e71f100e2f0c1bbbe31b752`
- **Attack — wrong pickup code** (food, code 000000): contract trapped in
  `release_envelope` (HostError InvalidAction), nothing moved.
- **Release food (idx 2, $40, code 453698)**: tx `5cbe349a4d2f22c84419f9061ea2e87ce2757a7aebf8a0645f9f6073026feca4`
- **Attack — double release** (food again, correct code): contract trapped in
  `release_envelope`; rejected on-chain, not by the UI.
- **Release rent (idx 0, $100)**: tx `3b2c09b1e42652c8d221eef1d4a8d3d0a13d4cc6400d61edf8402f9a45f66241`
- Final on-chain state: all 3 envelopes `released`. Balances verified via
  Horizon: school 60, landlord 100, agent 40, sender 350 USDC.
- **Orphaned funds:** two early fund transfers (200 USDC each,
  `09dfe471…`, `51448531…`) landed in the contract before the polling bug was
  fixed, with no remittance attached. The contract pays from its own balance,
  so the 400 USDC was not lost: remittance #1 used 200 of it, and 200 USDC
  remains in the contract as unallocated balance — the next create tops up
  only the shortfall (`contractUsdcBalance` check in `app/src/lib/server/stellar.ts`).

### Gotchas found during wiring
- **Friendbot `&asset=` does NOT deliver USDC** on the current friendbot: its
  tx contains only a 10,000 XLM payment. Testnet USDC came from the SDEX
  instead (trustline + strict-receive path payment; ~7–9 XLM per test USDC).
  The wrong USDC issuer (`…SZGQ2TE5IP6`) has zero order-book liquidity; the
  liquid one is the SDF testnet USDC `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`,
  SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- **JS SDK v13 cannot parse the testnet's TransactionMeta** (switch 4 = v4 in
  the current protocol; the SDK knows only switches 0–3), so
  `rpc.getTransaction` throws "Bad union switch: 4" on every successful
  Soroban tx. Workaround in `app/src/lib/server/stellar.ts`: poll tx status
  via raw JSON-RPC `getTransaction` (status only, no XDR parse) and find the
  new remittance id by probing `get_remittance` (ids are dense from 1).
  Durable fix would be upgrading @stellar/stellar-sdk to v17 — not done;
  the workaround is documented in the code.
- **Payees need a USDC trustline** before the escrow can pay them
  (`scripts/open-payee-trustlines.py`); without it the release traps.
- **JS SDK `nativeToScVal` does not infer types**: strings become `String`
  (not `Symbol`), BigInts/numbers throw without an explicit `{type}`. All
  contract args are built with explicit types in `app/src/lib/server/stellar.ts`.
- `/tmp/stellar-deploy-venv` is ephemeral (vanished between sessions); rebuild
  with `python3 -m venv /tmp/stellar-deploy-venv && pip install stellar-sdk`.
