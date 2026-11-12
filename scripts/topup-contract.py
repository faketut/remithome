#!/usr/bin/env python3
"""Top up the escrow contract with USDC from the demo sender (no remittance
attached). Used to restore full backing after the shortfall-funding bug
left outstanding envelopes underfunded (see DEPLOYMENT.md).

Reads the sender secret from app/.env.local (testnet only, never printed).
Usage:
    /tmp/stellar-deploy-venv/bin/python scripts/topup-contract.py <amount_usdc>
"""
import os
import sys

from stellar_sdk import Keypair, Network, SorobanServer, TransactionBuilder
from stellar_sdk.address import Address
from stellar_sdk.scval import to_address, to_int128

SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
CONTRACT = "CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2"


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
    amount = sys.argv[1] if len(sys.argv) > 1 else "300"
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(repo, "app", ".env.local"))
    sender = Keypair.from_secret(env["REMITHOME_SENDER_SECRET"])
    rpc = SorobanServer("https://soroban-testnet.stellar.org")

    account = rpc.load_account(sender.public_key)
    stroops = int(float(amount) * 10_000_000)
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_invoke_contract_function_op(
            SAC,
            "transfer",
            [
                to_address(Address(sender.public_key)),
                to_address(Address(CONTRACT)),
                to_int128(stroops),
            ],
        )
        .build()
    )
    tx = rpc.prepare_transaction(tx)
    tx.sign(sender)
    sent = rpc.send_transaction(tx)
    resp = rpc.poll_transaction(sent.hash)
    print(f"contract topped up {amount} USDC; status={resp.status}, tx={sent.hash}")


if __name__ == "__main__":
    main()
