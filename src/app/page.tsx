"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { useConnection } from "wagmi";

import { FaucetCard } from "./components/FaucetCard";

export default function Home(): React.JSX.Element {
  const { isConnected } = useConnection();

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
