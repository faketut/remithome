#!/usr/bin/env bash
# Deploy RemitHome to Stellar Testnet. Requires: Rust + stellar CLI.
#   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#   rustup target add wasm32-unknown-unknown
#   cargo install --locked stellar-cli
# Then: ./scripts/deploy-testnet.sh
# Records the contract ID in scripts/DEPLOYMENT.md — paste it into README + .env.
set -euo pipefail
cd "$(dirname "$0")/../contracts/remit-home"

stellar keys generate --global remithome-admin --network testnet 2>/dev/null || true
stellar keys fund remithome-admin --network testnet || true

stellar contract build
WASM=target/wasm32-unknown-unknown/release/remit_home.wasm
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
