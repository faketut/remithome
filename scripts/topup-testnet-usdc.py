#!/usr/bin/env python3
"""Top up the demo sender with more testnet USDC via the SDEX.

Reads the sender secret from app/.env.local (testnet only, never printed).
Usage:
    /tmp/stellar-deploy-venv/bin/python scripts/topup-testnet-usdc.py [amount_usdc]
"""
import os
import sys

from stellar_sdk import Asset, Keypair, Network, Server

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
    amount = sys.argv[1] if len(sys.argv) > 1 else "500"
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(repo, "app", ".env.local"))
    sender = Keypair.from_secret(env["REMITHOME_SENDER_SECRET"])
    server = Server("https://horizon-testnet.stellar.org")

    from stellar_sdk import TransactionBuilder

    account = server.load_account(sender.public_key)
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_path_payment_strict_receive_op(
            destination=sender.public_key,
            send_asset=Asset.native(),
            send_max="5000",
            dest_asset=USDC,
            dest_amount=amount,
            path=[],
        )
        .build()
    )
    tx.sign(sender)
    resp = server.submit_transaction(tx)
    ok = resp.get("successful") if isinstance(resp, dict) else resp.successful
    if not ok:
        raise RuntimeError(f"swap failed: {resp}")
    acct = server.accounts().account_id(sender.public_key).call()
    balances = {
        b.get("asset_code", "XLM"): b["balance"] for b in acct["balances"]
    }
    print(f"topped up {amount} test USDC; sender balances now: {balances}")


if __name__ == "__main__":
    main()
