import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, type Transport } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "missing-project-id";
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const anvilRpcUrl = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545";

const isDev = process.env.NODE_ENV === "development";
export const chains = isDev ? ([sepolia, anvil] as const) : ([sepolia] as const);

const transports: Record<number, Transport> = isDev
  ? {
      [sepolia.id]: http(sepoliaRpcUrl),
      [anvil.id]: http(anvilRpcUrl),
    }
  : {
      [sepolia.id]: http(sepoliaRpcUrl),
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
