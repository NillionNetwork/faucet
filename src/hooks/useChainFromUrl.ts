import { useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";

import { NILLION_TESTNET_CHAIN_ID } from "@/lib/contracts";

const SEPOLIA_CHAIN_ID = 11155111;

const CHAIN_PARAM_MAP: Record<string, number> = {
  l1: SEPOLIA_CHAIN_ID,
  l2: NILLION_TESTNET_CHAIN_ID,
};

export function useChainFromUrl(): void {
  const chainId = useChainId();
  const { mutate } = useSwitchChain();

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("chain")?.toLowerCase();
    const targetChainId = param ? CHAIN_PARAM_MAP[param] : undefined;
    if (targetChainId && targetChainId !== chainId) {
      mutate({ chainId: targetChainId });
    }
  }, [chainId, mutate]);
}
