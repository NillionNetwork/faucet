"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export type RelayClaimStatus = "idle" | "loading" | "success" | "error";

export interface UseBlacklightRelayClaimResult {
  claim: (address: string) => void;
  status: RelayClaimStatus;
  nilTxHash: string | undefined;
  error: { title: string; message: string } | null;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  "cooldown active": {
    title: "Cooldown Active",
    message: "This address or network has already claimed recently.",
  },
  "out of funds": {
    title: "Faucet Empty",
    message: "The faucet has run out of NIL. Please try again later.",
  },
  "invalid address": {
    title: "Invalid Address",
    message: "That is not a valid Ethereum address.",
  },
  "internal error": {
    title: "Something Went Wrong",
    message: "An unexpected error occurred on our end. Please try again later.",
  },
};

function formatError(apiError: string, retryAfterMs?: number): { title: string; message: string } {
  const mapped = ERROR_MESSAGES[apiError] ?? { title: "Request Failed", message: apiError };
  if (retryAfterMs) {
    const mins = Math.ceil(retryAfterMs / 60000);
    const unit = mins === 1 ? "minute" : "minutes";
    return { ...mapped, message: `${mapped.message} Try again in ${mins} ${unit}.` };
  }
  return mapped;
}

/**
 * Claim Blacklight NIL to a pasted address, with no wallet connected.
 *
 * Distinct from `useClaim` (which signs `claim()` from the visitor's own wallet) because the
 * on-chain faucet only ever drips to `msg.sender` — funding somebody else's address has to go
 * through the server-side relayer instead.
 */
export function useBlacklightRelayClaim(): UseBlacklightRelayClaimResult {
  const [status, setStatus] = useState<RelayClaimStatus>("idle");
  const [nilTxHash, setNilTxHash] = useState<string | undefined>();
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const reset = useCallback((): void => {
    setStatus("idle");
    setNilTxHash(undefined);
    setError(null);
  }, []);

  const claim = useCallback((address: string): void => {
    setStatus("loading");
    setError(null);

    fetch("/api/faucet/blacklight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(async (response) => {
        const json: { ok: true; nilTxHash: string } | { ok: false; error: string; retryAfterMs?: number } =
          await response.json();

        if (!json.ok) {
          const formatted = formatError(json.error, json.retryAfterMs);
          toast.error(formatted.title, { description: formatted.message });
          setError(formatted);
          setStatus("error");
          return;
        }

        toast.success("NIL sent!");
        setNilTxHash(json.nilTxHash);
        setStatus("success");
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
  }, []);

  return { claim, status, nilTxHash, error, reset };
}
