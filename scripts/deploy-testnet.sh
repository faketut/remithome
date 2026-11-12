#!/usr/bin/env bash
# Deploy RemitHome to Stellar Testnet. Requires: Rust + stellar CLI.
#   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#   rustup target add wasm32v1-none
#   (stellar CLI 30 via prebuilt binary — see the compile-check notes)
#
# NOTE (Nov 11): on this VM the Stellar CLI cannot reach the Soroban RPC
# through the egress proxy — `stellar keys fund` and `stellar contract upload`
# fail instantly with `client error (Connect)`, while plain HTTPS works.
# Use the Python deployer instead: scripts/deploy-testnet.py
# (needs a venv with stellar-sdk; it reads the remithome-admin identity
# from the Stellar CLI keystore). This shell script is kept as documentation
# of the intended CLI flow, with CLI-30-correct commands below.
set -euo pipefail
cd "$(dirname "$0")/../contracts/remit-home"

stellar keys generate remithome-admin --fund 2>/dev/null || stellar keys generate remithome-admin
stellar keys fund remithome-admin --network testnet || true

stellar contract build
WASM=target/wasm32v1-none/release/remit_home.wasm
CONTRACT_ID=$(stellar contract deploy --wasm "$WASM" --source remithome-admin --network testnet)

echo "CONTRACT_ID=$CONTRACT_ID"
echo "Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
{
  echo "# Deployment — Stellar Testnet"
  echo ""
  echo "- Date: $(date -u +%Y-%m-%d)"
  echo "- Contract ID: \`$CONTRACT_ID\`"
  echo "- Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
  echo "- Network: testnet (Friendbot-funded admin, no real funds)"
} > ../../scripts/DEPLOYMENT.md
echo "Wrote scripts/DEPLOYMENT.md — paste the contract ID into README.md and app/.env"
