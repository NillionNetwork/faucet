"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConnection, useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { FAUCET_ABI, getFaucetConfig } from "@/lib/contracts";

export type ClaimStatus = "idle" | "confirming" | "pending" | "success" | "error";

export interface UseClaimResult {
  claim: () => void;
  status: ClaimStatus;
  txHash: `0x${string}` | undefined;
  error: Error | null;
  reset: () => void;
}

export function useClaim(onSuccess?: () => void): UseClaimResult {
  const { address } = useConnection();
  const chainId = useChainId();
  const { address: faucetAddress, explorerUrl } = getFaucetConfig(chainId);

  const [error, setError] = useState<Error | null>(null);
  const toastShownForTx = useRef<string | null>(null);

  const write = useWriteContract();
  const txHash = write.data;
  const isWritePending = write.isPending;
  const writeError = write.error;

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    pollingInterval: 1_000,
  });

  const isConfirming = receipt.isPending;
  const isSuccess = receipt.isSuccess;
  const receiptError = receipt.error;

  // Determine status
  let status: ClaimStatus = "idle";
  if (writeError || receiptError || error) {
    status = "error";
  } else if (isSuccess) {
    status = "success";
  } else if (txHash && isConfirming) {
    status = "pending";
  } else if (isWritePending) {
    status = "confirming";
  }

  // Show toast on success (only once per transaction)
  useEffect(() => {
    if (isSuccess && txHash && toastShownForTx.current !== txHash) {
      toastShownForTx.current = txHash;
      const txUrl = `${explorerUrl}/tx/${txHash}`;
      toast.success("Claim successful!", {
        description: "NIL tokens have been sent to your wallet.",
        action: {
          label: "View",
          onClick: (): void => {
            window.open(txUrl, "_blank");
          },
        },
      });
      onSuccess?.();
    }
  }, [isSuccess, txHash, explorerUrl, onSuccess]);

  // Show toast on error
  useEffect(() => {
    const err = writeError || receiptError || error;
    if (err) {
      const isRejection = err.message?.includes("User rejected") || err.message?.includes("user rejected");
      if (!isRejection) {
        toast.error("Claim failed", {
          description: err.message || "An unexpected error occurred",
        });
      }
    }
  }, [writeError, receiptError, error]);

  const claim = useCallback((): void => {
    if (!address || !faucetAddress) return;

    setError(null);
    write.mutate({
      address: faucetAddress,
      abi: FAUCET_ABI,
      functionName: "claim",
    });
  }, [address, faucetAddress, write]);

  const reset = useCallback((): void => {
    write.reset();
    setError(null);
  }, [write]);

  return {
    claim,
    status,
    txHash,
    error: writeError || receiptError || error,
    reset,
  };
}
