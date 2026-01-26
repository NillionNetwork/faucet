"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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

function BalanceHero(): React.JSX.Element {
  const { userBalance, isLoading, chainName } = useFaucetStatus();

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">Your NIL balance on the {chainName} network</p>
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
      ) : (
        <p className="text-3xl font-bold">{userBalance !== undefined ? formatNilAmount(userBalance) : "0"} NIL</p>
      )}
    </div>
  );
}

function FaucetDetails(): React.JSX.Element {
  const { dripAmount, cooldownSeconds, lastClaimAt, claimCount, faucetAddress, tokenAddress, explorerUrl } =
    useFaucetStatus();
  const [isOpen, setIsOpen] = useState(false);

  if (!faucetAddress) return <></>;

  return (
    <div className="pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        Details
      </button>
      {isOpen && (
        <div className="mt-3 pl-5 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Drip amount</span>
            <span>{dripAmount ? `${formatNilAmount(dripAmount)} NIL` : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cooldown</span>
            <span>{cooldownSeconds ? formatTimeRemaining(Number(cooldownSeconds)) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Times claimed</span>
            <span>{claimCount !== undefined ? String(claimCount) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last claimed</span>
            <span>{lastClaimAt !== undefined ? formatLastClaimed(lastClaimAt) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Faucet contract</span>
            <a
              href={`${explorerUrl}/address/${faucetAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {truncateAddress(faucetAddress)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {tokenAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">NIL token contract</span>
              <a
                href={`${explorerUrl}/address/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {truncateAddress(tokenAddress)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FaucetCard(): React.JSX.Element {
  const { isConnected } = useConnection();

  if (!isConnected) {
    return (
      <Card className="w-full px-6 py-8">
        <CardHeader>
          <CardDescription>Connect your wallet to claim testnet NIL tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectButton.Custom>
            {({ openConnectModal }): React.JSX.Element => (
              <Button onClick={openConnectModal} className="w-full">
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full px-6 py-8">
      <CardContent className="flex flex-col gap-3">
        <BalanceHero />
        <ClaimButton />
        <FaucetDetails />
      </CardContent>
    </Card>
  );
}
