#!/usr/bin/env python3
"""Deploy the RemitHome Soroban contract to Stellar Testnet.

Why Python and not `stellar contract deploy`? The Stellar CLI's HTTP client
cannot reach the Soroban RPC through this VM's egress proxy (it fails instantly
with `client error (Connect)`), while plain HTTPS through the proxy works fine
(curl + this script's `requests`-based SDK both reach it). So: the CLI builds
the wasm, this script uploads + creates the contract.

Usage:
    /tmp/stellar-deploy-venv/bin/python scripts/deploy-testnet.py
    (venv needs `stellar-sdk`; see setup in the script header)

The deployer identity is the testnet-only `remithome-admin` key in the Stellar
CLI keystore (~/.config/stellar/identity/remithome-admin.toml). Testnet only,
no real funds. The seed phrase is read into memory and never printed or
written anywhere by this script.
"""
import hashlib
import os
import sys
import tomllib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stellar_sdk import Keypair, Network, SorobanServer, TransactionBuilder
from stellar_sdk.xdr import TransactionMeta, TransactionResult

RPC_URL = "https://soroban-testnet.stellar.org"
WASM_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "contracts",
    "remit-home",
    "target",
    "wasm32v1-none",
    "release",
    "remit_home.wasm",
)
IDENTITY_PATH = os.path.expanduser(
    "~/.config/stellar/identity/remithome-admin.toml"
)


def load_deployer() -> Keypair:
    with open(IDENTITY_PATH, "rb") as f:
        identity = tomllib.load(f)
    seed_phrase = identity["seed_phrase"]
    return Keypair.from_mnemonic_phrase(seed_phrase, index=0)


def submit_and_poll(server: SorobanServer, tx_envelope, label: str):
    send_resp = server.send_transaction(tx_envelope)
    tx_hash = send_resp.hash
    print(f"[{label}] submitted, hash={tx_hash}")
    resp = server.poll_transaction(tx_hash)
    print(f"[{label}] status={resp.status}")
    if str(resp.status) not in ("SUCCESS", "GetTransactionStatus.SUCCESS"):
        raise RuntimeError(f"{label} failed: status={resp.status}")
    return tx_hash, resp


def extract_contract_id(result_xdr: str, result_meta_xdr: str) -> str:
    # NOTE: the `success` Hash in TransactionResult is NOT the contract ID —
    # it is sha256(InvokeHostFunctionSuccessPreImage). The real contract
    # address is the return value in the Soroban transaction meta.
    from stellar_sdk import StrKey

    meta = TransactionMeta.from_xdr(result_meta_xdr)
    rv = meta.v4.soroban_meta.return_value
    h = rv.address.contract_id.contract_id.hash
    return StrKey.encode_contract(h)


def main() -> None:
    with open(WASM_PATH, "rb") as f:
        wasm = f.read()
    wasm_hash = hashlib.sha256(wasm).hexdigest()
    print(f"wasm: {len(wasm)} bytes, sha256={wasm_hash}")

    deployer = load_deployer()
    print(f"deployer: {deployer.public_key}")
    server = SorobanServer(RPC_URL)
    print(f"rpc health: {server.get_health()}")

    account = server.load_account(deployer.public_key)
    print(f"account sequence: {account.sequence}, balance check via load ok")

    # 1. Upload wasm
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_upload_contract_wasm_op(wasm)
        .build()
    )
    tx = server.prepare_transaction(tx)
    tx.sign(deployer)
    _, upload_resp = submit_and_poll(server, tx, "upload")

    # 2. Create contract instance
    account = server.load_account(deployer.public_key)
    salt = os.urandom(32)
    tx = (
        TransactionBuilder(
            source_account=account,
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_create_contract_op(
            wasm_id=bytes.fromhex(wasm_hash),
            address=deployer.public_key,
            salt=salt,
        )
        .build()
    )
    tx = server.prepare_transaction(tx)
    tx.sign(deployer)
    _, create_resp = submit_and_poll(server, tx, "create")

    contract_id = extract_contract_id(create_resp.result_xdr, create_resp.result_meta_xdr)
    print(f"CONTRACT_ID={contract_id}")
    print(f"Explorer: https://stellar.expert/explorer/testnet/contract/{contract_id}")

    # 3. Verify: fetch the contract spec — proves it exists and exposes our functions.
    spec = server.get_contract_spec(contract_id)
    functions = [s.name for s in spec.functions] if hasattr(spec, "functions") else spec
    print(f"contract functions: {functions}")

    deployment_md = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "scripts",
        "DEPLOYMENT.md",
    )
    from datetime import datetime, timezone

    with open(deployment_md, "w") as f:
        f.write("# Deployment — Stellar Testnet\n\n")
        f.write(f"- Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n")
        f.write(f"- Contract ID: `{contract_id}`\n")
        f.write(
            f"- Explorer: https://stellar.expert/explorer/testnet/contract/{contract_id}\n"
        )
        f.write(f"- WASM sha256: `{wasm_hash}`\n")
        f.write(f"- Deployer (testnet admin): `{deployer.public_key}`\n")
        f.write("- Network: testnet (Friendbot-funded admin, no real funds)\n")
        f.write(
            "- Deployed via `scripts/deploy-testnet.py` (stellar-sdk-python); "
            "the Stellar CLI cannot reach the RPC through this VM's egress proxy.\n"
        )
    print(f"Wrote {deployment_md}")


if __name__ == "__main__":
    main()
