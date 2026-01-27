# NIL Faucet Smart Contract

## Build

```shell
forge build
```

## Test

```shell
forge test
```

## Format

```shell
forge fmt
```

## Deploy to Sepolia

### 1. Set Environment Variables

```shell
# Required
export PRIVATE_KEY=your_private_key_without_0x_prefix
export NIL_TOKEN_ADDRESS=0x...  # NIL token address on Sepolia

# Optional (defaults shown)
export DRIP_AMOUNT=1000000      # 1 NIL (6 decimals)
export COOLDOWN_SECONDS=3600   # 1 hour
```

### 2. Deploy and Verify

```shell
forge script script/DeployFaucet.s.sol:DeployFaucet \
  --rpc-url https://sepolia.infura.io/v3/YOUR_INFURA_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_ETHERSCAN_API_KEY
```

The script will output the deployed faucet address.

### 3. Update Frontend Config

Add the deployed address to your `.env`:

```
NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA=0x...deployed_address...
```

### 4. Fund the Faucet

Transfer NIL tokens to the faucet contract address. The faucet needs tokens to distribute.

## Admin Functions

The deployer becomes the contract owner and can call these functions:

| Function                     | Description                   |
| ---------------------------- | ----------------------------- |
| `setDripAmount(uint256)`     | Change tokens per claim       |
| `setCooldown(uint256)`       | Change seconds between claims |
| `pause()`                    | Pause all claims              |
| `unpause()`                  | Resume claims                 |
| `withdraw(address, uint256)` | Withdraw tokens from faucet   |

Example using cast:

```shell
# Pause the faucet
cast send $FAUCET_ADDRESS "pause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL

# Change drip amount to 5 NIL
cast send $FAUCET_ADDRESS "setDripAmount(uint256)" 5000000 --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

## Security

For production deployments, consider using a hardware wallet:

```shell
forge script script/DeployFaucet.s.sol:DeployFaucet \
  --rpc-url $RPC_URL \
  --ledger \
  --broadcast \
  --verify
```
