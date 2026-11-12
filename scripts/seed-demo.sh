#!/usr/bin/env bash
# Create Friendbot-funded testnet demo wallets (sender / agent / school / landlord).
# Prints public keys — paste them into app/src/lib/demo.ts.
# Testnet only, no real funds. Requires stellar CLI.
set -euo pipefail
for name in sender agent school landlord; do
  stellar keys generate --global "remithome-$name" --network testnet 2>/dev/null || true
  stellar keys fund "remithome-$name" --network testnet || true
  echo "$name: $(stellar keys address "remithome-$name" --network testnet)"
done
