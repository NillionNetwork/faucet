import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Chain } from "viem";
import { sepolia } from "wagmi/chains";

// Custom chain for local development
export const anvil: Chain = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
};

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "PLACEHOLDER_PROJECT_ID";

export const chains = [sepolia, anvil] as const;

export const config = getDefaultConfig({
  appName: "Nillion Faucet",
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
});
