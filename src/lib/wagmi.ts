import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, sepolia } from "wagmi/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "PLACEHOLDER_PROJECT_ID";

const isDev = process.env.NODE_ENV === "development";
export const chains = isDev ? ([sepolia, anvil] as const) : ([sepolia] as const);

export const config = getDefaultConfig({
  appName: "Nillion Faucet",
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
});
