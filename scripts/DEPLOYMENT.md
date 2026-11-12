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
