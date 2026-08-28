import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { ERC20_ABI } from "@/lib/contracts";

/**
 * Server-side NIL payout for Blacklight L1, so a recipient address can be pasted instead of a
 * wallet being connected.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE WALLET FLOW. The on-chain faucet is `claim()` with no
 * recipient argument (NILFaucet.sol) — it drips to `msg.sender` and rate-limits on `msg.sender`.
 * There is therefore no way to fund a third-party address through it, and an agent that generates
 * its own key cannot be funded without its operator connecting a wallet and doing a transfer by
 * hand. This route removes that step: paste the address, done.
 *
 * NIL ONLY, NO ETH — and that asymmetry is deliberate. This endpoint has no wallet requirement and
 * therefore no sybil cost beyond a per-IP cooldown, so whatever it hands out has to be something we
 * do not mind losing. Testnet NIL is valueless and we can mint more. Sepolia ETH is genuinely
 * scarce and irritating to replenish, so it stays behind the wallet-signed path and public faucets.
 *
 * Note the relayer still needs ETH of its own to pay gas on the transfers it makes; it just never
 * sends any onward. `checkFunding` accounts for both.
 */
type FaucetContext = {
  account: ReturnType<typeof privateKeyToAccount>;
  nilTokenAddress: Address;
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
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
  | { ok: true; balances: Balances }
  | { ok: false; reason: "out of funds"; detail: string };

/** Trivial RPC needs — a balance read and one send — so the keyless public endpoint is the
 *  default. Overriding with a keyed URL makes that URL a secret; the default avoids one. */
const DEFAULT_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNilAmountRaw(): string {
  return process.env.BLACKLIGHT_FAUCET_NIL_AMOUNT ?? "20";
}

function normalizePrivateKey(value: string): Hex {
  const hex = value.startsWith("0x") ? value : `0x${value}`;
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- validated hex prefix above
  return hex as Hex;
}

let cachedContext: FaucetContext | null = null;

function getFaucetContext(): FaucetContext {
  if (cachedContext) return cachedContext;

  const privateKey = normalizePrivateKey(getEnv("BLACKLIGHT_FAUCET_PRIVATE_KEY"));
  const nilTokenAddress = getAddress(getEnv("BLACKLIGHT_NIL_TOKEN_ADDRESS"));
  const rpcUrl = process.env.BLACKLIGHT_FAUCET_RPC_URL ?? DEFAULT_RPC_URL;

  const account = privateKeyToAccount(privateKey);

  cachedContext = {
    account,
    nilTokenAddress,
    // `chain` is pinned rather than left undefined: the tx is signed here, so the chain id has
    // to be right or Sepolia rejects the signature with an opaque error.
    publicClient: createPublicClient({ chain: sepolia, transport: http(rpcUrl) }),
    walletClient: createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) }),
    nilAmountRaw: getNilAmountRaw(),
  };
  return cachedContext;
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

  // One transfer, so one gas estimate. Estimating against the real recipient rather than a
  // placeholder: an ERC20 transfer to an address with no balance costs more (a fresh storage
  // slot), and that is exactly the case a faucet always hits.
  const tokenGas = await context.publicClient.estimateGas({
    account: context.account.address,
    to: context.nilTokenAddress,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient, nilAmountUnits],
    }),
    value: BigInt(0),
  });

  return {
    senderEthBalanceWei,
    senderNilBalance,
    nilDecimals,
    nilAmountUnits,
    requiredEthWei: tokenGas * feePerGas,
  };
}

export function getBlacklightFaucetConfig(): { nilAmount: string; nilTokenAddress: string } {
  return {
    nilAmount: getNilAmountRaw(),
    nilTokenAddress: getEnv("BLACKLIGHT_NIL_TOKEN_ADDRESS"),
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

  // Out of gas is a distinct failure from out of NIL and needs saying separately — "top up the
  // faucet" points at the wrong asset otherwise, and the relayer holds no ETH by design.
  if (balances.senderEthBalanceWei < balances.requiredEthWei) {
    return {
      ok: false,
      reason: "out of funds",
      detail: `gas required=${formatEther(balances.requiredEthWei)} ETH current=${formatEther(balances.senderEthBalanceWei)} ETH`,
    };
  }

  return { ok: true, balances };
}

export async function sendPayout(recipient: Address): Promise<{ nilTxHash: Hex }> {
  const context = getFaucetContext();
  const funding = await checkFunding(recipient);
  if (!funding.ok) {
    throw new Error("out of funds");
  }

  const nilTxHash = await context.walletClient.sendTransaction({
    account: context.account,
    chain: sepolia,
    to: context.nilTokenAddress,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient, funding.balances.nilAmountUnits],
    }),
    value: BigInt(0),
  });

  return { nilTxHash };
}
