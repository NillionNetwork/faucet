"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAccount } from "wagmi";

export interface L2Status {
  ethAmount: string;
  nilAmount: string;
  cooldownMs: number;
  retryAfterMs: number;
  isLoading: boolean;
}

export function useL2Status(): L2Status & { refetch: () => void } {
  const { address } = useAccount();
  const query = useQuery({
    queryKey: ["l2-status", address ?? null],
    queryFn: async (): Promise<Omit<L2Status, "isLoading">> => {
      const params = address ? `?address=${address}` : "";
      const response = await fetch(`/api/faucet/status${params}`);
      const json: { ethAmount: string; nilAmount: string; cooldownMs: number; retryAfterMs: number } =
        await response.json();

      return {
        ethAmount: json.ethAmount,
        nilAmount: json.nilAmount,
        cooldownMs: json.cooldownMs,
        retryAfterMs: json.retryAfterMs,
      };
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const fetchStatus = useCallback((): void => {
    void query.refetch();
  }, [query]);

  const statusData = query.data ?? {
    ethAmount: "0.0001",
    nilAmount: "70",
    cooldownMs: 86400000,
    retryAfterMs: 0,
  };

  return {
    ...statusData,
    isLoading: query.isLoading,
    refetch: fetchStatus,
  };
}
