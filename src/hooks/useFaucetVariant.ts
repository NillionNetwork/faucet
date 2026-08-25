"use client";

import { BLACKLIGHT_CHAIN_PARAM, type FaucetVariant } from "@/lib/contracts";

/**
 * Which faucet on the current chain the URL is asking for.
 *
 * Sepolia hosts two faucets — the original NIL one and the Blacklight L1 one — so `chainId`
 * cannot tell them apart. `?chain=blacklight` selects the second
 */
export function useFaucetVariant(): FaucetVariant | undefined {
  if (typeof window === "undefined") return undefined;
  const param = new URLSearchParams(window.location.search).get("chain")?.toLowerCase();
  return param === BLACKLIGHT_CHAIN_PARAM ? "blacklight" : undefined;
}
