"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useConnection } from "wagmi";

import { useChainFromUrl } from "@/hooks/useChainFromUrl";

import { FaucetCard } from "./components/FaucetCard";

interface ChainSelectorProps {
  onSelect: (chain: string) => void;
}

function ChainSelector({ onSelect }: ChainSelectorProps): React.JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-3xl flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 w-fit rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-400">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            Testnet Access
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Claim your
            <br />
            testnet tokens
          </h1>
          <p className="text-muted-foreground text-base">Choose a network below to continue your faucet flow.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect("L1")}
            className="group relative flex flex-col justify-end aspect-square rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-transparent p-6 text-left transition-all hover:border-lime-400/30 hover:shadow-[0_0_40px_-12px_rgba(163,230,53,0.15)]"
          >
            <div>
              <h2 className="text-2xl font-bold text-white">Sepolia L1</h2>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-lime-400">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                Continue
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("L2")}
            className="group relative flex flex-col justify-end aspect-square rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-transparent p-6 text-left transition-all hover:border-lime-400/30 hover:shadow-[0_0_40px_-12px_rgba(163,230,53,0.15)]"
          >
            <div>
              <h2 className="text-2xl font-bold text-white">Nillion L2</h2>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-lime-400">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                Continue
              </span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}

function FaucetPage(): React.JSX.Element {
  const { isConnected } = useConnection();
  useChainFromUrl();

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
        <FaucetCard />
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
  }, []);

  const handleSelect = (chain: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set("chain", chain);
    window.history.pushState({}, "", url.toString());
    setChainParam(chain);
  };

  if (!ready) return <></>;

  if (!chainParam) return <ChainSelector onSelect={handleSelect} />;

  return <FaucetPage />;
}
