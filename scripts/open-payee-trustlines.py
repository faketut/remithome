#!/usr/bin/env python3
"""Open testnet USDC trustlines for the demo payees (school/landlord/agent).

The escrow can only pay a payee who trusts the USDC issuer. Reads the
payee secrets from app/.env.local (testnet only, never printed).
Usage:
    /tmp/stellar-deploy-venv/bin/python scripts/open-payee-trustlines.py
"""
import os

from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder

USDC = Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5")


def load_env(path: str) -> dict:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k] = v
    return env


def main() -> None:
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(repo, "app", ".env.local"))
    server = Server("https://horizon-testnet.stellar.org")
    for role in ("SCHOOL", "LANDLORD", "AGENT"):
        kp = Keypair.from_secret(env[f"REMITHOME_{role}_SECRET"])
        account = server.load_account(kp.public_key)
        tx = (
            TransactionBuilder(
                source_account=account,
                network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_change_trust_op(asset=USDC, limit="1000000")
            .build()
        )
        tx.sign(kp)
        resp = server.submit_transaction(tx)
        ok = resp.get("successful") if isinstance(resp, dict) else resp.successful
        print(f"{role.lower()}: trustline {'open' if ok else 'FAILED: ' + str(resp)}")


if __name__ == "__main__":
    main()
