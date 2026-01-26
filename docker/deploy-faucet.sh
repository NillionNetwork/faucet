#!/usr/bin/env bash
set -euo pipefail

# Anvil default account 0
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
RPC_URL="http://localhost:8545"

# nil-anvil pre-deployed NIL token
NIL_TOKEN="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Faucet config
DRIP_AMOUNT="100000000"  # 100 NIL (6 decimals)
COOLDOWN="60"            # 60 seconds for local dev (not 24h)
FUND_AMOUNT="10000000000" # 10K NIL to fund the faucet (6 decimals)

echo "Waiting for nil-anvil RPC..."
until cast chain-id --rpc-url "$RPC_URL" &>/dev/null; do
  sleep 1
done

echo "Waiting for NIL token to be deployed..."
until [ "$(cast code "$NIL_TOKEN" --rpc-url "$RPC_URL" 2>/dev/null)" != "0x" ]; do
  sleep 1
done
echo "nil-anvil is ready (chain-id: $(cast chain-id --rpc-url "$RPC_URL"))"

echo "Deploying NILFaucet..."
cd "$(dirname "$0")/../contracts"

export PRIVATE_KEY
export NIL_TOKEN_ADDRESS="$NIL_TOKEN"
export DRIP_AMOUNT
export COOLDOWN_SECONDS="$COOLDOWN"

FAUCET_ADDRESS=$(forge script script/DeployFaucet.s.sol:DeployFaucet \
  --rpc-url "$RPC_URL" \
  --broadcast \
  2>&1 | grep -oE "Deployed NILFaucet at: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}")

echo "Faucet deployed at: $FAUCET_ADDRESS"

echo "Funding faucet with NIL tokens..."
cast send "$NIL_TOKEN" "transfer(address,uint256)" "$FAUCET_ADDRESS" "$FUND_AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  >/dev/null

BALANCE=$(cast call "$FAUCET_ADDRESS" "faucetBalance()(uint256)" --rpc-url "$RPC_URL")
echo "Faucet balance: $BALANCE (smallest units)"

echo ""
echo "=========================================="
echo "Faucet ready!"
echo "  Faucet address:     $FAUCET_ADDRESS"
echo "  NIL token address:  $NIL_TOKEN"
echo "  RPC:                $RPC_URL"
echo "=========================================="
