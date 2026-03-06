import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ERC20_ABI, NILLION_TESTNET_RPC_URL } from "@/lib/contracts";

type FaucetContext = {
  account: ReturnType<typeof privateKeyToAccount>;
  nilTokenAddress: Address;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  ethAmountWei: bigint;
  nilAmountRaw: string;
};

type Balances = {
  senderEthBalanceWei: bigint;
  senderNilBalance: bigint;
  nilDecimals: number;
  nilAmountUnits: bigint;
  requiredEthWei: bigint;
};

export type FundingCheckResult =
  | {
      ok: true;
      balances: Balances;
    }
  | {
      ok: false;
      reason: "out of funds";
      detail: string;
    };

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEthAmountWei(): bigint {
  return parseEther(process.env.L2_FAUCET_ETH_AMOUNT ?? "0.0001");
}

function getNilAmountRaw(): string {
  return process.env.L2_FAUCET_NIL_AMOUNT ?? "70";
}

function normalizePrivateKey(value: string): Hex {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  // Private keys are always hex strings prefixed with 0x
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- validated hex prefix above
  return hex as Hex;
}

let cachedContext: FaucetContext | null = null;

function getFaucetContext(): FaucetContext {
  if (cachedContext) return cachedContext;

  const privateKey = normalizePrivateKey(getEnv("L2_FAUCET_PRIVATE_KEY"));
  const nilTokenAddress = getAddress(getEnv("L2_NIL_TOKEN_ADDRESS"));

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    transport: http(NILLION_TESTNET_RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    transport: http(NILLION_TESTNET_RPC_URL),
  });

  cachedContext = {
    account,
    nilTokenAddress,
    publicClient,
    walletClient,
    ethAmountWei: getEthAmountWei(),
    nilAmountRaw: getNilAmountRaw(),
  };
  return cachedContext;
}

function formatRetryMessage(required: bigint, current: bigint): string {
  return `required=${formatEther(required)} ETH current=${formatEther(current)} ETH`;
}

async function estimateTxFeePerGas(context: FaucetContext): Promise<bigint> {
  const fees = await context.publicClient.estimateFeesPerGas();
  if (fees.maxFeePerGas) return fees.maxFeePerGas;
  if (fees.gasPrice) return fees.gasPrice;

  return context.publicClient.getGasPrice();
}

async function getBalances(context: FaucetContext, recipient: Address): Promise<Balances> {
  const [nilDecimals, senderNilBalance, senderEthBalanceWei, feePerGas] = await Promise.all([
    context.publicClient.readContract({
      address: context.nilTokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    context.publicClient.readContract({
      address: context.nilTokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [context.account.address],
    }),
    context.publicClient.getBalance({ address: context.account.address }),
    estimateTxFeePerGas(context),
  ]);

  const nilAmountUnits = parseUnits(context.nilAmountRaw, nilDecimals);
  const tokenTransferData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [recipient, nilAmountUnits],
  });

  const [ethGas, tokenGas] = await Promise.all([
    context.publicClient.estimateGas({
      account: context.account.address,
      to: recipient,
      value: context.ethAmountWei,
    }),
    context.publicClient.estimateGas({
      account: context.account.address,
      to: context.nilTokenAddress,
      data: tokenTransferData,
      value: BigInt(0),
    }),
  ]);

  const feeHeadroom = (ethGas + tokenGas) * feePerGas;
  const requiredEthWei = context.ethAmountWei + feeHeadroom;

  return {
    senderEthBalanceWei,
    senderNilBalance,
    nilDecimals,
    nilAmountUnits,
    requiredEthWei,
  };
}

export function getL2FaucetConfig(): { ethAmount: string; nilAmount: string } {
  return {
    ethAmount: process.env.L2_FAUCET_ETH_AMOUNT ?? "0.0001",
    nilAmount: process.env.L2_FAUCET_NIL_AMOUNT ?? "70",
  };
}

export function parseRecipientAddress(address: string): Address | null {
  if (!isAddress(address)) return null;
  return getAddress(address);
}

export async function checkFunding(recipient: Address): Promise<FundingCheckResult> {
  const context = getFaucetContext();
  const balances = await getBalances(context, recipient);

  if (balances.senderNilBalance < balances.nilAmountUnits) {
    return {
      ok: false,
      reason: "out of funds",
      detail: `required=${formatUnits(balances.nilAmountUnits, balances.nilDecimals)} NIL current=${formatUnits(balances.senderNilBalance, balances.nilDecimals)} NIL`,
    };
  }

  if (balances.senderEthBalanceWei < balances.requiredEthWei) {
    return {
      ok: false,
      reason: "out of funds",
      detail: formatRetryMessage(balances.requiredEthWei, balances.senderEthBalanceWei),
    };
  }

  return {
    ok: true,
    balances,
  };
}

export async function sendPayout(recipient: Address): Promise<{
  ethTxHash: Hex;
  nilTxHash: Hex;
}> {
  const context = getFaucetContext();
  const balances = await getBalances(context, recipient);

  if (balances.senderNilBalance < balances.nilAmountUnits) {
    throw new Error("out of funds");
  }
  if (balances.senderEthBalanceWei < balances.requiredEthWei) {
    throw new Error("out of funds");
  }

  // Send sequentially to avoid nonce collisions from the same account
  const ethTxHash = await context.walletClient.sendTransaction({
    account: context.account,
    chain: undefined,
    to: recipient,
    value: context.ethAmountWei,
  });

  const nilTxHash = await context.walletClient.sendTransaction({
    account: context.account,
    chain: undefined,
    to: context.nilTokenAddress,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient, balances.nilAmountUnits],
    }),
    value: BigInt(0),
  });

  return { ethTxHash, nilTxHash };
}
