"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Droplets } from "lucide-react";

import { FaucetCard } from "./components/FaucetCard";

export default function Home(): React.JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <header className="absolute top-4 right-4">
        <ConnectButton />
      </header>
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground">
          <Droplets className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Nillion Faucet</h1>
        <p className="text-muted-foreground text-lg">
          Request testnet NIL tokens for development and testing on the Nillion network.
        </p>
        <FaucetCard />
      </div>
    </main>
  );
}
