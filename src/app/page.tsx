"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";

import { FaucetCard } from "./components/FaucetCard";

export default function Home(): React.JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <header className="absolute top-4 right-4">
        <ConnectButton showBalance={false} />
      </header>
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <Image src="/nillion.jpg" alt="Nillion" width={64} height={64} className="rounded-2xl" />
        <h1 className="text-4xl font-bold tracking-tight">Nillion Faucet</h1>
        <p className="text-muted-foreground text-lg">
          Request testnet NIL tokens for development and testing on the Nillion network.
        </p>
        <FaucetCard />
      </div>
    </main>
  );
}
