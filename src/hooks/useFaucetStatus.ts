"use client";

import { useAccount, useChainId, useChains, useReadContracts } from "wagmi";

import { ERC20_ABI, FAUCET_ABI, getFaucetConfig } from "@/lib/contracts";

export interface FaucetStatus {
  // Contract state
  dripAmount: bigint | undefined;
  cooldownSeconds: bigint | undefined;
  lastClaimAt: bigint | undefined;
  claimCount: bigint | undefined;
  userBalance: bigint | undefined;

  // Claim eligibility
  canClaim: boolean;
  claimBlockedReason: string | null; // null if can claim, otherwise: "PAUSED", "DRIP_0", "EMPTY", "COOLDOWN"

  // Derived
  cooldownEndsAt: number | null; // Unix timestamp when cooldown ends
  timeUntilClaimable: number; // Seconds until can claim (0 if claimable now)

  // Loading state
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;

  // Config
  faucetAddress: `0x${string}` | undefined;
  tokenAddress: `0x${string}` | undefined;
  explorerUrl: string;
  chainName: string;
}

export function useFaucetStatus(): FaucetStatus {
  const { address, isConnected } = useAccount();
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
