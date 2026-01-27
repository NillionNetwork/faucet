import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, sepolia } from "wagmi/chains";

/**
 * WalletConnect project ID from environment.
 * Required for WalletConnect to function - get one from https://cloud.walletconnect.com
 * Uses a placeholder for builds, but RainbowKit will error at runtime if not properly configured.
 */
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "missing-project-id";

const isDev = process.env.NODE_ENV === "development";
export const chains = isDev ? ([sepolia, anvil] as const) : ([sepolia] as const);

export const config = getDefaultConfig({
  appName: "Nillion Faucet",
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
});
