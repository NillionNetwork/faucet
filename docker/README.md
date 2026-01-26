# Local Development with Docker

## Quick Start

```bash
# Start nil-anvil
pnpm docker:up

# Deploy the faucet contract (requires foundry)
pnpm docker:deploy

# Copy the faucet address to your .env
# NEXT_PUBLIC_FAUCET_ADDRESS_ANVIL=<address from output>

# Start the web UI
pnpm dev
```

## Services

| Service   | Port | Description                                     |
| --------- | ---- | ----------------------------------------------- |
| nil-anvil | 8545 | Local Ethereum node with pre-deployed NIL token |

## Pre-deployed Contracts (nil-anvil)

| Contract       | Address                                      |
| -------------- | -------------------------------------------- |
| NIL Token      | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| BurnWithDigest | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

## Test Accounts

Account 0 (deployer, faucet owner):

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Balance: 10,000 ETH + 10,000 NIL

Account 1:

- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Balance: 10,000 ETH + 10,000 NIL

## Commands

```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# Deploy faucet contract
pnpm docker:deploy

# Check nil-anvil health
cast chain-id --rpc-url http://localhost:8545
```
