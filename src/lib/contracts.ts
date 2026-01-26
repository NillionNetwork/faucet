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

function isHexAddress(value: string | undefined): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

// Contract addresses per chain - loaded from environment
function getFaucetAddress(chainId: number): `0x${string}` | undefined {
  if (chainId === 11155111) {
    const addr = process.env.NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA;
    return isHexAddress(addr) ? addr : undefined;
  }
  if (chainId === 31337) {
    const addr = process.env.NEXT_PUBLIC_FAUCET_ADDRESS_ANVIL;
    return isHexAddress(addr) ? addr : undefined;
  }
  return undefined;
}

export function getFaucetConfig(chainId: number): {
  address: `0x${string}` | undefined;
  explorerUrl: string;
} {
  const address = getFaucetAddress(chainId);

  const explorerUrls: Record<number, string> = {
    11155111: "https://sepolia.etherscan.io",
    31337: "http://localhost:8545",
  };

  return {
    address,
    explorerUrl: explorerUrls[chainId] || "https://etherscan.io",
  };
}
