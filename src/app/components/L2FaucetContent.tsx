"use client";

import { CheckCircle2, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useBalance, useChainId, useConnection } from "wagmi";

import { Button } from "@/components/ui/button";
import { useL2Claim } from "@/hooks/useL2Claim";
import { useL2Status } from "@/hooks/useL2Status";
import { getFaucetConfig, NILLION_TESTNET_CHAIN_ID } from "@/lib/contracts";
import { formatTimeRemaining, truncateAddress } from "@/lib/format";

interface TxLinkProps {
  label: string;
  hash: string;
  explorerUrl: string;
}

function TxLink({ label, hash, explorerUrl }: TxLinkProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <span>{label}:</span>
      <a
        href={`${explorerUrl}/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors truncate"
      >
        {hash.slice(0, 6)}...{hash.slice(-4)}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    </div>
  );
}

function L2CooldownButton({ retryAfterMs }: { retryAfterMs: number }): React.JSX.Element {
  const [remaining, setRemaining] = useState(Math.ceil(retryAfterMs / 1000));

  useEffect(() => {
    setRemaining(Math.ceil(retryAfterMs / 1000));
    if (retryAfterMs <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) clearInterval(timer);
        return next;
      });
    }, 1000);

    return (): void => clearInterval(timer);
  }, [retryAfterMs]);

  if (remaining <= 0) return <></>;

  return (
    <Button disabled className="w-full">
      <Clock className="w-4 h-4" />
      Cooldown: {formatTimeRemaining(remaining)}
    </Button>
  );
}

interface L2StatusSnapshot {
  ethAmount: string;
  nilAmount: string;
  retryAfterMs: number;
  refetch: () => void;
}

function L2ClaimButton({ l2Status }: { l2Status: L2StatusSnapshot }): React.JSX.Element {
  const chainId = useChainId();
  const { explorerUrl } = getFaucetConfig(chainId);
  const {
    claim,
    status,
    ethTxHash,
    nilTxHash,
    error,
    retryAfterMs: claimRetryMs,
  } = useL2Claim(() => l2Status.refetch());

  const activeRetryMs = claimRetryMs > 0 ? claimRetryMs : l2Status.retryAfterMs;

  if (status === "success" && ethTxHash && nilTxHash) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-green-600 justify-center">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Funds sent!</span>
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <TxLink label="ETH tx" hash={ethTxHash} explorerUrl={explorerUrl} />
          <TxLink label="NIL tx" hash={nilTxHash} explorerUrl={explorerUrl} />
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 animate-spin" />
        Sending...
      </Button>
    );
  }

  if (activeRetryMs > 0 && status !== "error") {
    return <L2CooldownButton retryAfterMs={activeRetryMs} />;
  }

  if (status === "error" && error) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-left">
          <p className="font-medium text-destructive">{error.title}</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
        </div>
        {claimRetryMs > 0 ? (
          <L2CooldownButton retryAfterMs={claimRetryMs} />
        ) : (
          <Button onClick={claim} className="w-full">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button onClick={claim} className="w-full">
      Request {l2Status.nilAmount} NIL + {l2Status.ethAmount} ETH
    </Button>
  );
}

function L2BalanceHero(): React.JSX.Element {
  const { address } = useConnection();
  const { data: ethBalance } = useBalance({
    address,
    chainId: NILLION_TESTNET_CHAIN_ID,
  });

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">Your wallet on Nillion Testnet</p>
      <p className="text-lg font-mono">{address ? truncateAddress(address) : "..."}</p>
      {ethBalance && (
        <p className="text-sm text-muted-foreground mt-1">
          {Number(formatEther(ethBalance.value)).toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH
        </p>
      )}
    </div>
  );
}

export function L2FaucetCardContent(): React.JSX.Element {
  const chainId = useChainId();
  const { explorerUrl } = getFaucetConfig(chainId);
  const { cooldownMs, ethAmount, nilAmount, retryAfterMs, refetch } = useL2Status();

  const cooldownHours = Math.round(cooldownMs / 3600000);
  const cooldownLabel = cooldownHours === 1 ? "1 hour" : `${cooldownHours} hours`;

  return (
    <>
      <L2BalanceHero />
      <L2ClaimButton l2Status={{ ethAmount, nilAmount, retryAfterMs, refetch }} />
      <div className="flex flex-col gap-1 text-xs text-muted-foreground text-center pt-2">
        <p>Cooldown: {cooldownLabel}</p>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 justify-center hover:text-foreground transition-colors"
        >
          Nillion Testnet Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </>
  );
}
