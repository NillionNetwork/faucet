import { Droplets } from "lucide-react";

export default function Home(): React.JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground">
          <Droplets className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Nillion Faucet</h1>
        <p className="text-muted-foreground text-lg">
          Request testnet NIL tokens for development and testing on the Nillion network.
        </p>
        <div className="mt-4 px-6 py-3 rounded-lg bg-card border border-border">
          <p className="text-sm text-muted-foreground">Tooling setup complete. Ready for development.</p>
        </div>
      </div>
    </main>
  );
}
