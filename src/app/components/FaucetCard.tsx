"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClaim } from "@/hooks/useClaim";
import { useFaucetStatus } from "@/hooks/useFaucetStatus";
import { formatNilAmount, formatTimeRemaining } from "@/lib/format";

function ClaimButton(): React.JSX.Element {
  const { canClaim, claimBlockedReason, timeUntilClaimable, dripAmount, refetch, explorerUrl, faucetAddress } =
    useFaucetStatus();
  const { claim, status, txHash, reset } = useClaim(() => refetch());

  // Countdown timer for cooldown
  const [countdown, setCountdown] = useState(timeUntilClaimable);

  useEffect(() => {
    setCountdown(timeUntilClaimable);
  }, [timeUntilClaimable]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return (): void => clearInterval(timer);
  }, [countdown]);

  // No faucet address configured
  if (!faucetAddress) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button disabled className="w-full">
          <AlertCircle className="w-4 h-4" />
          Not Configured
        </Button>
        <p className="text-xs text-muted-foreground">Faucet address not configured for this network.</p>
      </div>
    );
  }

  // Success state
  if (status === "success" && txHash) {
    const txUrl = `${explorerUrl}/tx/${txHash}`;
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Claim successful!</span>
        </div>
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View transaction
          <ExternalLink className="w-3 h-3" />
        </a>
        <Button variant="outline" onClick={reset} className="mt-2">
          Claim again
        </Button>
      </div>
    );
  }

  // Loading/pending states
  if (status === "confirming") {
    return (
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 animate-spin" />
        Confirm in wallet...
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 animate-spin" />
        Transaction pending...
      </Button>
    );
  }

  // Cooldown state
  if (claimBlockedReason === "COOLDOWN" && countdown > 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button disabled className="w-full">
          <Clock className="w-4 h-4" />
          Cooldown: {formatTimeRemaining(countdown)}
        </Button>
        <p className="text-xs text-muted-foreground">You can claim again in {formatTimeRemaining(countdown)}</p>
      </div>
    );
  }

  // Error states from contract
  if (claimBlockedReason === "PAUSED") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button disabled className="w-full">
          <AlertCircle className="w-4 h-4" />
          Faucet Paused
        </Button>
        <p className="text-xs text-muted-foreground">The faucet is currently paused. Please try again later.</p>
      </div>
    );
  }

  if (claimBlockedReason === "EMPTY") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button disabled className="w-full">
          <AlertCircle className="w-4 h-4" />
          Faucet Empty
        </Button>
        <p className="text-xs text-muted-foreground">The faucet has run out of tokens. Please try again later.</p>
      </div>
    );
  }

  // Ready to claim
  const dripDisplay = dripAmount ? formatNilAmount(dripAmount) : "...";

  return (
    <Button onClick={claim} disabled={!canClaim} className="w-full">
      Claim {dripDisplay} NIL
    </Button>
  );
}

function formatLastClaimed(timestamp: bigint): string {
  if (timestamp === BigInt(0)) return "Never";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function FaucetInfo(): React.JSX.Element {
  const {
    dripAmount,
    cooldownSeconds,
    userBalance,
    lastClaimAt,
    claimCount,
    isLoading,
    faucetAddress,
    tokenAddress,
    explorerUrl,
  } = useFaucetStatus();

  if (!faucetAddress) {
    return <></>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-muted-foreground">Drip Amount</p>
          <p className="font-medium">{dripAmount ? `${formatNilAmount(dripAmount)} NIL` : "..."}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cooldown</p>
          <p className="font-medium">{cooldownSeconds ? formatTimeRemaining(Number(cooldownSeconds)) : "..."}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Your Balance</p>
          <p className="font-medium">{userBalance !== undefined ? `${formatNilAmount(userBalance)} NIL` : "..."}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Times Claimed</p>
          <p className="font-medium">{claimCount !== undefined ? String(claimCount) : "..."}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Last Claimed</p>
          <p className="font-medium">{lastClaimAt !== undefined ? formatLastClaimed(lastClaimAt) : "..."}</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
        <a
          href={`${explorerUrl}/address/${faucetAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Faucet: {truncateAddress(faucetAddress)}
          <ExternalLink className="w-3 h-3" />
        </a>
        {tokenAddress && (
          <a
            href={`${explorerUrl}/address/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            NIL: {truncateAddress(tokenAddress)}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function FaucetCard(): React.JSX.Element {
  const { isConnected } = useAccount();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Request Tokens</CardTitle>
        <CardDescription>Connect your wallet to claim testnet NIL tokens.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }): React.JSX.Element => (
              <Button onClick={openConnectModal} className="w-full">
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
        ) : (
          <>
            <FaucetInfo />
            <ClaimButton />
          </>
        )}
      </CardContent>
    </Card>
  );
}
