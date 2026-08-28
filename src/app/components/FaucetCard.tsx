"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ExternalLink, Loader2, Plus } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useChainId, useConnection, useWalletClient } from "wagmi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClaim } from "@/hooks/useClaim";
import { useFaucetStatus } from "@/hooks/useFaucetStatus";
import { useFaucetVariant } from "@/hooks/useFaucetVariant";
import { ANVIL_CHAIN_ID, NILLION_TESTNET_CHAIN_ID } from "@/lib/contracts";
import { formatNilAmount, formatTimeRemaining, truncateAddress } from "@/lib/format";

import { L2FaucetCardContent } from "./L2FaucetContent";
import { PasteAddressClaim } from "./PasteAddressClaim";

const ClaimButton = memo(function ClaimButton(): React.JSX.Element {
  const chainId = useChainId();
  const { canClaim, claimBlockedReason, timeUntilClaimable, dripAmount, refetch, explorerUrl } = useFaucetStatus();
  const { claim, status, txHash } = useClaim(() => refetch());

  // Countdown timer for cooldown
  const [countdown, setCountdown] = useState(timeUntilClaimable);
  const prevClaimBlockedReason = useRef(claimBlockedReason);

  useEffect(() => {
    setCountdown(timeUntilClaimable);

    if (timeUntilClaimable <= 0) {
      if (prevClaimBlockedReason.current === "COOLDOWN") {
        refetch();
      }
      prevClaimBlockedReason.current = claimBlockedReason;
      return;
    }

    prevClaimBlockedReason.current = claimBlockedReason;

    const timer = setInterval(() => {
      setCountdown((c) => {
        const next = Math.max(0, c - 1);
        if (next === 0 && claimBlockedReason === "COOLDOWN") {
          refetch();
        }
        return next;
      });
    }, 1000);

    return (): void => clearInterval(timer);
  }, [timeUntilClaimable, claimBlockedReason, refetch]);

  const isAnvil = chainId === ANVIL_CHAIN_ID;
  const effectiveCanClaim = canClaim || (isAnvil && claimBlockedReason === "COOLDOWN" && countdown === 0);

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
      </div>
    );
  }

  // Transaction states
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
      <Button disabled className="w-full">
        <Clock className="w-4 h-4" />
        Cooldown: {formatTimeRemaining(countdown)}
      </Button>
    );
  }

  // Blocked states
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
      </div>
    );
  }

  // Ready to claim
  const dripDisplay = dripAmount ? formatNilAmount(dripAmount) : "...";

  return (
    <Button onClick={claim} disabled={!effectiveCanClaim} className="w-full">
      Claim {dripDisplay} NIL
    </Button>
  );
});

function formatLastClaimed(timestamp: bigint): string {
  if (timestamp === BigInt(0)) return "Never";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

interface AddressLinkProps {
  address: `0x${string}`;
  explorerUrl: string;
}

function AddressLink({ address, explorerUrl }: AddressLinkProps): React.JSX.Element {
  return (
    <a
      href={`${explorerUrl}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {truncateAddress(address)}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function BalanceHero(): React.JSX.Element {
  const { userBalance, chainName, tokenAddress } = useFaucetStatus();
  const { data: walletClient } = useWalletClient();

  const addTokenToWallet = async (): Promise<void> => {
    if (!walletClient || !tokenAddress) return;
    try {
      await walletClient.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: "NIL",
            decimals: 6,
          },
        },
      });
    } catch {
      // User rejected or wallet doesn't support wallet_watchAsset
    }
  };

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">Your balance on {chainName}</p>
      <p className="text-3xl font-bold inline-flex items-center gap-1.5">
        {userBalance !== undefined ? formatNilAmount(userBalance) : "0"} NIL
        {walletClient && tokenAddress && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={addTokenToWallet}
                className="inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add NIL token to wallet</TooltipContent>
          </Tooltip>
        )}
      </p>
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
            <AddressLink address={faucetAddress} explorerUrl={explorerUrl} />
          </div>
          {tokenAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">NIL token contract</span>
              <AddressLink address={tokenAddress} explorerUrl={explorerUrl} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FaucetCardContent(): React.JSX.Element {
  const { isLoading, isError, faucetAddress } = useFaucetStatus();

  // Loading state - single spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading faucet...</p>
      </div>
    );
  }

  // Not configured
  if (!faucetAddress) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Faucet not configured for this network.</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Unable to connect to the faucet. Please try again later.</p>
      </div>
    );
  }

  // Ready - show full card
  return (
    <>
      <BalanceHero />
      <ClaimButton />
      <FaucetDetails />
    </>
  );
}

export function FaucetCard(): React.JSX.Element {
  const { isConnected } = useConnection();
  const chainId = useChainId();
  const variant = useFaucetVariant();
  const isL2 = chainId === NILLION_TESTNET_CHAIN_ID;
  // Only the Blacklight relayer exists, and it holds only Blacklight NIL — offering the field on
  // the other faucets would promise a payout nothing can make.
  const canPasteAddress = variant === "blacklight";

  if (!isConnected) {
    return (
      <Card className="w-full px-6 py-8">
        <CardHeader>
          <CardDescription>
            {canPasteAddress
              ? "Connect a wallet to claim, or send NIL straight to an address"
              : "Connect your wallet to claim testnet NIL tokens"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ConnectButton.Custom>
            {({ openConnectModal }): React.JSX.Element => (
              <Button onClick={openConnectModal} className="w-full">
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>

          {canPasteAddress && (
            <>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-indigo-400/15" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-indigo-400/15" />
              </div>
              <PasteAddressClaim />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full px-6 py-8">
      <CardContent className="flex flex-col gap-3">
        {isL2 ? <L2FaucetCardContent /> : <FaucetCardContent />}
      </CardContent>
    </Card>
  );
}
