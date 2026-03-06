/** Chain ID for local Anvil development network */
export const ANVIL_CHAIN_ID = 31337;

/** Chain ID for Nillion Testnet (L2) */
export const NILLION_TESTNET_CHAIN_ID = 78651;

/** Nillion Testnet RPC URL */
export const NILLION_TESTNET_RPC_URL = "https://rpc.testnet.nillion.network";

export const FAUCET_ABI = [
  {
    type: "function",
    name: "TOKEN",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "dripAmount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cooldownSeconds",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastClaimAt",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimCount",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canClaim",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "ok", type: "bool" },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "faucetBalance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const SEPOLIA_CHAIN_ID = 11155111;

function isHexAddress(value: string | undefined): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

// Contract addresses per chain - loaded from environment
function getFaucetAddress(chainId: number): `0x${string}` | undefined {
  if (chainId === SEPOLIA_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA;
    return isHexAddress(addr) ? addr : undefined;
  }
  if (chainId === ANVIL_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_FAUCET_ADDRESS_ANVIL;
    return isHexAddress(addr) ? addr : undefined;
  }
  return undefined;
}

function getExplorerUrl(chainId: number): string {
  // Import chains lazily to avoid circular deps at module level
  const explorerUrls: Record<number, string> = {
    [SEPOLIA_CHAIN_ID]: "https://sepolia.etherscan.io",
    [NILLION_TESTNET_CHAIN_ID]: "https://explorer.testnet.nillion.network",
    [ANVIL_CHAIN_ID]: "http://localhost:8545",
  };
  return explorerUrls[chainId] || "https://etherscan.io";
}

export function getFaucetConfig(chainId: number): {
  address: `0x${string}` | undefined;
  explorerUrl: string;
} {
  return {
    address: getFaucetAddress(chainId),
    explorerUrl: getExplorerUrl(chainId),
  };
}
