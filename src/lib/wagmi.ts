import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http, type Transport } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";

import { NILLION_TESTNET_RPC_URL } from "@/lib/contracts";

export const nillionTestnet = defineChain({
  id: 78651,
  name: "Nillion Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [NILLION_TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Nillion Explorer", url: "https://explorer.testnet.nillion.network" },
  },
  testnet: true,
});

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "missing-project-id";
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const anvilRpcUrl = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545";

const isDev = process.env.NODE_ENV === "development";
export const chains = isDev ? ([sepolia, nillionTestnet, anvil] as const) : ([sepolia, nillionTestnet] as const);

const transports: Record<number, Transport> = isDev
  ? {
      [sepolia.id]: http(sepoliaRpcUrl),
      [nillionTestnet.id]: http(NILLION_TESTNET_RPC_URL),
      [anvil.id]: http(anvilRpcUrl),
    }
  : {
      [sepolia.id]: http(sepoliaRpcUrl),
      [nillionTestnet.id]: http(NILLION_TESTNET_RPC_URL),
    };

let _config: ReturnType<typeof getDefaultConfig> | undefined;

export function getConfig(): ReturnType<typeof getDefaultConfig> {
  if (!_config) {
    _config = getDefaultConfig({
      appName: "Nillion Faucet",
      projectId: walletConnectProjectId,
      chains,
      transports,
      ssr: true,
    });
  }
  return _config;
}
