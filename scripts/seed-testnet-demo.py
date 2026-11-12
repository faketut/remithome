#!/usr/bin/env python3
"""Seed demo wallets for the RemitHome testnet demo.

Creates 4 Friendbot-funded testnet accounts (sender / school / landlord /
agent), funds the sender with Stellar-Foundation testnet USDC via Friendbot's
`&asset=` parameter, and writes `app/.env.local` with the public keys and the
server-only secret keys.

TESTNET ONLY — no real funds. The secret keys in `.env.local` are testnet demo
keys; the file is gitignored and must never be committed. The app reads them
only in server-side API routes (they are NOT NEXT_PUBLIC_ vars, so Next.js
never ships them to the browser).

Usage:
    /tmp/stellar-deploy-venv/bin/python scripts/seed-testnet-demo.py
    (venv needs `stellar-sdk`)
"""
import json
import os
import urllib.request
import urllib.error

from stellar_sdk import Asset, Keypair, Network, Server

HORIZON = "https://horizon-testnet.stellar.org"
FRIENDBOT = "https://friendbot.stellar.org"
USDC = Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5")
CONTRACT_ID = "CAQUKEVTBAPJKKN74IIL4M2KZHMQBGA5MYN4XQ3XUHGX552FA3CISKR2"


def friendbot(addr: str) -> dict:
    # curl, not urllib: friendbot connections through this VM's egress proxy
    # are flaky under urllib (RemoteDisconnected) but reliable under curl.
    # NOTE: the `&asset=` parameter does NOT deliver USDC on the current
    # friendbot — its tx contains only a 10,000 XLM payment. USDC comes from
    # the DEX instead (see fund_usdc_via_dex).
    import subprocess
    import time

    url = f"{FRIENDBOT}/?addr={addr}"
    last_err = ""
    for attempt in range(1, 5):
        proc = subprocess.run(
            ["curl", "-sS", "--max-time", "30", url],
            capture_output=True,
            text=True,
        )
        if proc.returncode == 0:
            try:
                return json.loads(proc.stdout)
            except json.JSONDecodeError:
                last_err = f"bad JSON: {proc.stdout[:200]}"
        else:
            last_err = proc.stderr.strip()[:200]
        print(f"  friendbot attempt {attempt} failed ({last_err}); retrying...")
        time.sleep(3 * attempt)
    raise RuntimeError(f"friendbot failed for {addr[:8]}... after 4 attempts: {last_err}")


def fund_usdc_via_dex(server: Server, sender: Keypair, amount_usdc: str = "250") -> None:
    """Buy testnet USDC on the SDEX for XLM.

    Friendbot's `&asset=` parameter does NOT deliver USDC on the current
    friendbot (its tx contains only a 10,000 XLM payment), and the Circle
    faucet needs a browser + CAPTCHA. The testnet DEX does have liquidity for
    the Stellar-Foundation testnet USDC (issuer GBBD47...LLFLA5), at roughly
    7–9 XLM per USDC. So: open a trustline, then a strict-receive path
    payment from the sender to itself (XLM -> USDC).
    """
    import time

    from stellar_sdk import TransactionBuilder

    account = server.load_account(sender.public_key)
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_change_trust_op(asset=USDC, limit="1000000")
        .build()
    )
    tx.sign(sender)
    resp = server.submit_transaction(tx)
    ok = resp.get("successful") if isinstance(resp, dict) else resp.successful
    tx_hash = resp.get("hash") if isinstance(resp, dict) else resp.hash
    if not ok:
        raise RuntimeError(f"trustline failed: {resp}")
    print("  trustline to testnet USDC open")

    time.sleep(2)
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
            dest_amount=amount_usdc,
            path=[],
        )
        .build()
    )
    tx.sign(sender)
    resp = server.submit_transaction(tx)
    ok = resp.get("successful") if isinstance(resp, dict) else resp.successful
    tx_hash = resp.get("hash") if isinstance(resp, dict) else resp.hash
    if not ok:
        raise RuntimeError(f"DEX swap failed: {resp}")
    print(f"  swapped XLM -> {amount_usdc} test USDC (tx {tx_hash})")


def main() -> None:
    server = Server(HORIZON)
    usdc_sac = USDC.contract_id(Network.TESTNET_NETWORK_PASSPHRASE)
    print(f"testnet USDC SAC: {usdc_sac}")

    roles = ["sender", "school", "landlord", "agent"]
    keys: dict[str, Keypair] = {}
    for role in roles:
        kp = Keypair.random()
        keys[role] = kp
        friendbot(kp.public_key)
        print(f"{role}: {kp.public_key} (funded 10,000 test XLM)")

    sender = keys["sender"]
    fund_usdc_via_dex(server, sender)
    horizon_acct = server.accounts().account_id(sender.public_key).call()
    balances = {
        b["asset_code"]: b["balance"]
        for b in horizon_acct["balances"]
        if b["asset_type"] != "native"
    }
    balances["XLM"] = next(
        b["balance"] for b in horizon_acct["balances"] if b["asset_type"] == "native"
    )
    print(f"sender balances: {balances}")
    usdc_balance = float(balances.get("USDC", "0"))
    if usdc_balance < 200:
        raise RuntimeError(
            f"sender has only {usdc_balance} test USDC, need >= 200 for the demo; "
            "re-run friendbot funding or top up manually"
        )

    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "app",
        ".env.local",
    )
    lines = [
        "# Local only (gitignored). Testnet mode for the demo app.",
        "# Secrets below are TESTNET-ONLY demo keys — never commit, never use on mainnet.",
        "NEXT_PUBLIC_DEMO_MODE=testnet",
        f"NEXT_PUBLIC_CONTRACT_ID={CONTRACT_ID}",
        "NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org:443",
        "NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org",
        f"NEXT_PUBLIC_USDC_SAC={usdc_sac}",
        f"NEXT_PUBLIC_USDC_ISSUER={USDC.issuer}",
        "",
        "# Demo wallets (public keys are shown in the UI; secrets stay server-side)",
        f"NEXT_PUBLIC_SENDER_ADDRESS={sender.public_key}",
        f"NEXT_PUBLIC_SCHOOL_ADDRESS={keys['school'].public_key}",
        f"NEXT_PUBLIC_LANDLORD_ADDRESS={keys['landlord'].public_key}",
        f"NEXT_PUBLIC_AGENT_ADDRESS={keys['agent'].public_key}",
        "",
        "# Server-only secrets (no NEXT_PUBLIC_ prefix — Next.js never sends these to the browser)",
        f"REMITHOME_SENDER_SECRET={sender.secret}",
        f"REMITHOME_SCHOOL_SECRET={keys['school'].secret}",
        f"REMITHOME_LANDLORD_SECRET={keys['landlord'].secret}",
        f"REMITHOME_AGENT_SECRET={keys['agent'].secret}",
        "",
    ]
    with open(env_path, "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote {env_path} (public keys printed above; secrets only in the file)")


if __name__ == "__main__":
    main()
