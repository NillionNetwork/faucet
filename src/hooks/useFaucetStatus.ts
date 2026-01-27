"use client";

import { useConnection, useChainId, useChains, useReadContracts } from "wagmi";

import { ERC20_ABI, FAUCET_ABI, getFaucetConfig } from "@/lib/contracts";

/** Faucet status and user eligibility data */
export interface FaucetStatus {
  /** Amount of tokens dispensed per claim (in raw units) */
  dripAmount: bigint | undefined;
  /** Cooldown period between claims in seconds */
  cooldownSeconds: bigint | undefined;
  /** Unix timestamp of the user's last claim */
  lastClaimAt: bigint | undefined;
  /** Total number of times the user has claimed */
  claimCount: bigint | undefined;
  /** User's current NIL token balance */
  userBalance: bigint | undefined;

  /** Whether the user can claim right now */
  canClaim: boolean;
  /** Reason claim is blocked: "PAUSED", "DRIP_0", "EMPTY", "COOLDOWN", or null if claimable */
  claimBlockedReason: string | null;

  /** Unix timestamp when cooldown ends, or null if not applicable */
  cooldownEndsAt: number | null;
  /** Seconds remaining until user can claim (0 if claimable now) */
  timeUntilClaimable: number;

  /** Whether contract data is loading */
  isLoading: boolean;
  /** Whether an error occurred fetching contract data */
  isError: boolean;
  /** Function to manually refetch contract data */
  refetch: () => void;

  /** Faucet contract address for the current chain */
  faucetAddress: `0x${string}` | undefined;
  /** NIL token contract address for the current chain */
  tokenAddress: `0x${string}` | undefined;
  /** Block explorer URL for the current chain */
  explorerUrl: string;
  /** Human-readable name of the current chain */
  chainName: string;
}

/**
 * Hook to fetch faucet contract state and user eligibility.
 * Polls contract data every 15 seconds while connected.
 *
 * @returns Faucet status including drip amount, cooldown, claim eligibility, and user balance
 */
export function useFaucetStatus(): FaucetStatus {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const chains = useChains();

  const chainName = chains.find((c) => c.id === chainId)?.name ?? "Unknown";
  const { address: faucetAddress, tokenAddress, explorerUrl } = getFaucetConfig(chainId);

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "dripAmount",
      },
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "cooldownSeconds",
      },
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "lastClaimAt",
        args: address ? [address] : undefined,
      },
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "claimCount",
        args: address ? [address] : undefined,
      },
      {
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "canClaim",
        args: address ? [address] : undefined,
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
    ],
    query: {
      enabled: isConnected && !!faucetAddress,
      refetchInterval: 15_000, // Refresh every 15s
    },
  });

  const [dripAmountResult, cooldownResult, lastClaimResult, claimCountResult, canClaimResult, userBalanceResult] =
    data ?? [];

  const dripAmount = dripAmountResult?.result;
  const cooldownSeconds = cooldownResult?.result;
  const lastClaimAt = lastClaimResult?.result;
  const claimCount = claimCountResult?.result;
  const userBalance = userBalanceResult?.result;
  const canClaimResultValue = canClaimResult?.result;
  const canClaimOk = Array.isArray(canClaimResultValue) ? canClaimResultValue[0] : false;
  const canClaimReason = Array.isArray(canClaimResultValue) ? canClaimResultValue[1] : "";

  // Calculate cooldown timing
  const now = Math.floor(Date.now() / 1000);
  const cooldownEndsAt =
    lastClaimAt !== undefined && cooldownSeconds !== undefined ? Number(lastClaimAt) + Number(cooldownSeconds) : null;
  const timeUntilClaimable = cooldownEndsAt ? Math.max(0, cooldownEndsAt - now) : 0;

  return {
    dripAmount,
    cooldownSeconds,
    lastClaimAt,
    claimCount,
    userBalance,
    canClaim: canClaimOk,
    claimBlockedReason: canClaimOk ? null : canClaimReason || null,
    cooldownEndsAt,
    timeUntilClaimable,
    isLoading,
    isError,
    refetch,
    faucetAddress,
    tokenAddress,
    explorerUrl,
    chainName,
  };
}
