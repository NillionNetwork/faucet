"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";

import { useChainFromUrl } from "@/hooks/useChainFromUrl";

import { FaucetCard } from "./components/FaucetCard";

interface NetworkCardProps {
  label: string;
  sublabel: string;
  description: string;
  onClick: () => void;
  delay: string;
}

function NetworkCard({ label, sublabel, description, onClick, delay }: NetworkCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: delay }}
      className="chain-card animate-selector-fade-up group relative flex flex-col justify-between aspect-square rounded-2xl border border-indigo-400/10 bg-indigo-950/40 p-6 text-left cursor-pointer overflow-hidden"
    >
      {/* Ambient glow spot */}
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl animate-selector-glow-pulse" />

      {/* Network type pill */}
      <span className="relative z-10 inline-flex w-fit items-center rounded-md border border-indigo-300/10 bg-indigo-400/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-indigo-300/60">
        {sublabel}
      </span>

      {/* Bottom content */}
      <div className="relative z-10">
        <p className="text-[13px] leading-snug text-indigo-200/40 mb-3">{description}</p>
        <h2 className="text-[22px] font-semibold tracking-tight text-white">{label}</h2>
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400">
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          Continue
        </span>
      </div>
    </button>
  );
}

interface ChainSelectorProps {
  onSelect: (chain: string) => void;
}

function ChainSelector({ onSelect }: ChainSelectorProps): React.JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[720px] rounded-3xl border border-indigo-400/10 bg-indigo-950/60 p-8 sm:p-10 backdrop-blur-xl shadow-[0_0_80px_-20px_rgba(30,20,80,0.5)]">
        {/* Badge */}
        <div className="animate-selector-fade-up" style={{ animationDelay: "0ms" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-indigo-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
            </span>
            Testnet Access
          </span>
        </div>

        {/* Heading */}
        <h1
          className="animate-selector-fade-up mt-6 text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white"
          style={{ animationDelay: "80ms" }}
        >
          Claim your
          <br />
          testnet tokens
        </h1>

        {/* Subtitle */}
        <p className="animate-selector-fade-up mt-3 text-[15px] text-indigo-200/50" style={{ animationDelay: "140ms" }}>
          Choose a network below to continue your faucet flow.
        </p>

        {/* Cards grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NetworkCard
            label="Sepolia L1"
            sublabel="Ethereum Testnet"
            description="Get NIL on Nillion's L1"
            onClick={() => onSelect("L1")}
            delay="220ms"
          />
          <NetworkCard
            label="Nillion L2"
            sublabel="Nillion Testnet"
            description="Get NIL and ETH on Nillion's L2"
            onClick={() => onSelect("L2")}
            delay="320ms"
          />
        </div>
      </div>
    </main>
  );
}

interface FaucetPageProps {
  chainParam: string;
  onBack: () => void;
}

function FaucetPage({ chainParam, onBack }: FaucetPageProps): React.JSX.Element {
  const { isConnected } = useConnection();
  useChainFromUrl();

  const networkLabel = chainParam === "L2" ? "Nillion Testnet" : "Ethereum Sepolia";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {isConnected && (
        <header className="absolute top-4 right-4">
          <ConnectButton showBalance={false} />
        </header>
      )}
      <div className="flex flex-col items-center gap-6 w-full max-w-lg text-center">
        <Image
          src="/nillion.jpg"
          alt="Nillion"
          width={64}
          height={64}
          className="rounded-2xl shadow-lg ring-1 ring-white/20"
        />
        <h1 className="text-4xl font-bold tracking-tight text-white">NIL Faucet</h1>
        <p className="text-sm text-indigo-300/70">{networkLabel}</p>
        <FaucetCard />
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-400/60 hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Switch network
        </button>
      </div>
    </main>
  );
}

export default function Home(): React.JSX.Element {
  const [chainParam, setChainParam] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChainParam(new URLSearchParams(window.location.search).get("chain"));
    setReady(true);

    const onPopState = (): void => {
      setChainParam(new URLSearchParams(window.location.search).get("chain"));
    };
    window.addEventListener("popstate", onPopState);
    return (): void => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleSelect = (chain: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set("chain", chain);
    window.history.pushState({}, "", url.toString());
    setChainParam(chain);
  };

  if (!ready) return <></>;

  const handleBack = (): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete("chain");
    window.history.pushState({}, "", url.toString());
    setChainParam(null);
  };

  if (!chainParam) return <ChainSelector onSelect={handleSelect} />;

  return <FaucetPage chainParam={chainParam} onBack={handleBack} />;
}
