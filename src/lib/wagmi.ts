import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, sepolia } from "wagmi/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "PLACEHOLDER_PROJECT_ID";

export const chains = [sepolia, anvil] as const;

export const config = getDefaultConfig({
  appName: "Nillion Faucet",
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
});
