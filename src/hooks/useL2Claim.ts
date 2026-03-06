"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

export type L2ClaimStatus = "idle" | "loading" | "success" | "error";

export interface UseL2ClaimResult {
  claim: () => void;
  status: L2ClaimStatus;
  ethTxHash: string | undefined;
  nilTxHash: string | undefined;
  error: { title: string; message: string } | null;
  retryAfterMs: number;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  "cooldown active": {
    title: "Cooldown Active",
    message: "You've already claimed recently.",
  },
  "out of funds": {
    title: "Faucet Empty",
    message: "The faucet has run out of funds. Please try again later.",
  },
  "invalid address": {
    title: "Invalid Address",
    message: "The wallet address provided is not valid.",
  },
  "internal error": {
    title: "Something Went Wrong",
    message: "An unexpected error occurred on our end. Please try again later.",
  },
};

function formatError(apiError: string, retryAfterMs?: number): { title: string; message: string } {
  const mapped = ERROR_MESSAGES[apiError] ?? {
    title: "Request Failed",
    message: apiError,
  };
  if (retryAfterMs) {
    const mins = Math.ceil(retryAfterMs / 60000);
    const unit = mins === 1 ? "minute" : "minutes";
    return { ...mapped, message: `${mapped.message} Try again in ${mins} ${unit}.` };
  }
  return mapped;
}

export function useL2Claim(onSuccess?: () => void): UseL2ClaimResult {
  const { address } = useAccount();
  const [status, setStatus] = useState<L2ClaimStatus>("idle");
  const [ethTxHash, setEthTxHash] = useState<string | undefined>();
  const [nilTxHash, setNilTxHash] = useState<string | undefined>();
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState(0);

  const reset = useCallback((): void => {
    setStatus("idle");
    setEthTxHash(undefined);
    setNilTxHash(undefined);
    setError(null);
    setRetryAfterMs(0);
  }, []);

  const claim = useCallback((): void => {
    if (!address) return;

    setStatus("loading");
    setError(null);

    fetch("/api/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(async (response) => {
        const json:
          | { ok: true; ethTxHash: string; nilTxHash: string }
          | { ok: false; error: string; retryAfterMs?: number } = await response.json();

        if (!json.ok) {
          const formatted = formatError(json.error, json.retryAfterMs);
          toast.error(formatted.title, { description: formatted.message });
          setError(formatted);
          setRetryAfterMs(json.retryAfterMs ?? 0);
          setStatus("error");
          return;
        }

        toast.success("Funds sent!");
        setEthTxHash(json.ethTxHash);
        setNilTxHash(json.nilTxHash);
        setStatus("success");
        onSuccess?.();
      })
      .catch(() => {
        const formatted = {
          title: "Connection Error",
          message: "Could not reach the faucet. Check your connection and try again.",
        };
        toast.error(formatted.title, { description: formatted.message });
        setError(formatted);
        setStatus("error");
      });
  }, [address, onSuccess]);

  return { claim, status, ethTxHash, nilTxHash, error, retryAfterMs, reset };
}
