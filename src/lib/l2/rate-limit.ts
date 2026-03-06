import { getRedisClient } from "@/lib/l2/redis";

const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = "nillion:faucet:l2:cooldown";

export function getCooldownMs(): number {
  const raw = process.env.L2_FAUCET_COOLDOWN_MS;
  if (!raw) return DEFAULT_COOLDOWN_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_COOLDOWN_MS;
  return parsed;
}

function ipKey(ip: string): string {
  return `${KEY_PREFIX}:ip:${ip}`;
}

function walletKey(wallet: string): string {
  return `${KEY_PREFIX}:wallet:${wallet.toLowerCase()}`;
}

function normalizeTtl(ttl: number): number {
  return ttl > 0 ? ttl : 0;
}

async function fetchTtls(ip: string, wallet: string): Promise<[number, number]> {
  const redis = getRedisClient();
  const response = await redis.pipeline().pttl(ipKey(ip)).pttl(walletKey(wallet)).exec();

  if (!response || response.length < 2) {
    throw new Error("Unable to read cooldown from Redis");
  }

  const [ipErr, ipTtl] = response[0];
  const [walletErr, walletTtl] = response[1];
  if (ipErr || walletErr) {
    throw new Error("Unable to read cooldown from Redis");
  }

  return [Number(ipTtl), Number(walletTtl)];
}

export async function checkCooldown(
  ip: string,
  wallet: string,
): Promise<{
  allowed: boolean;
  retryAfterMs: number;
}> {
  const [ipTtl, walletTtl] = await fetchTtls(ip, wallet);

  const ipRemaining = normalizeTtl(ipTtl);
  const walletRemaining = normalizeTtl(walletTtl);
  const retryAfterMs = Math.max(ipRemaining, walletRemaining);

  return {
    allowed: retryAfterMs === 0,
    retryAfterMs,
  };
}

export async function markCooldown(ip: string, wallet: string): Promise<void> {
  const redis = getRedisClient();
  const ttl = getCooldownMs();
  const response = await redis.pipeline().psetex(ipKey(ip), ttl, "1").psetex(walletKey(wallet), ttl, "1").exec();

  if (!response || response.some(([err]) => err)) {
    throw new Error("Unable to write cooldown to Redis");
  }
}
