import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "@wagmi/core";
import type { Transport } from "@wagmi/core";
import { anvil, sepolia } from "wagmi/chains";

/**
 * WalletConnect project ID from environment.
 * Required for WalletConnect to function - get one from https://cloud.walletconnect.com
 * Uses a placeholder for builds, but RainbowKit will error at runtime if not properly configured.
 */
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "missing-project-id";
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const anvilRpcUrl = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545";

const isDev = process.env.NODE_ENV === "development";
export const chains = isDev ? ([sepolia, anvil] as const) : ([sepolia] as const);

const transports: Record<number, Transport> = {
  [sepolia.id]: http(sepoliaRpcUrl),
};

if (isDev) {
  transports[anvil.id] = http(anvilRpcUrl);
}

export const config = getDefaultConfig({
  appName: "Nillion Faucet",
  projectId: walletConnectProjectId,
  chains,
  transports,
  ssr: true,
});
