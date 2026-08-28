import { getRedisClient } from "@/lib/l2/redis";

const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * A PREFIX OF ITS OWN, not the L2 one.
 *
 * The L2 limiter keys on `nillion:faucet:l2:cooldown`. Reusing it would mean claiming Blacklight
 * NIL locks you out of the Blind Computer faucet for 24 hours and vice versa — two unrelated
 * faucets sharing one budget, which reads as a bug to anyone who hits it.
 */
const KEY_PREFIX = "nillion:faucet:blacklight:cooldown";

export function getCooldownMs(): number {
  const raw = process.env.BLACKLIGHT_FAUCET_COOLDOWN_MS;
  if (!raw) return DEFAULT_COOLDOWN_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_COOLDOWN_MS;
  return parsed;
}

/**
 * Bucket the client to something it cannot trivially rotate.
 *
 * IPv4 is used whole. **IPv6 is truncated to its /64**, because a residential IPv6 allocation is
 * typically a /64 or larger: keying on the full address lets one client mint effectively unlimited
 * distinct keys and walk straight through the cooldown. That is not a theoretical hole — it is the
 * cheapest way to drain this endpoint, and the wallet requirement that used to sit in front of it
 * is exactly what this route removes.
 *
 * A /64 is the smallest unit that is meaningfully "one subscriber". Going wider (a /48) would start
 * grouping unrelated households behind one ISP allocation.
 */
export function bucketIp(ip: string): string {
  if (!ip.includes(":")) return ip; // IPv4, or "unknown"

  // Strip a zone index ("fe80::1%eth0") and any surrounding brackets from a host:port form.
  const bare = ip.replace(/^\[|\]$/g, "").split("%")[0] ?? ip;

  const [head, tail] = bare.split("::");
  const headGroups = head ? head.split(":").filter(Boolean) : [];

  let groups: string[];
  if (tail === undefined) {
    groups = headGroups;
  } else {
    // Expand the "::" run so the first four groups are the real first four, not whatever
    // happened to be written before the elision.
    const tailGroups = tail ? tail.split(":").filter(Boolean) : [];
    const missing = Math.max(0, 8 - headGroups.length - tailGroups.length);
    groups = [...headGroups, ...Array.from({ length: missing }, () => "0"), ...tailGroups];
  }

  const prefix = groups
    .slice(0, 4)
    .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":");

  return `${prefix}::/64`;
}

function ipKey(ip: string): string {
  return `${KEY_PREFIX}:ip:${bucketIp(ip)}`;
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

export async function checkCooldown(ip: string, wallet: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const [ipTtl, walletTtl] = await fetchTtls(ip, wallet);
  const retryAfterMs = Math.max(normalizeTtl(ipTtl), normalizeTtl(walletTtl));

  return { allowed: retryAfterMs === 0, retryAfterMs };
}

export async function markCooldown(ip: string, wallet: string): Promise<void> {
  const redis = getRedisClient();
  const ttl = getCooldownMs();
  const response = await redis.pipeline().psetex(ipKey(ip), ttl, "1").psetex(walletKey(wallet), ttl, "1").exec();

  if (!response || response.some(([err]) => err)) {
    throw new Error("Unable to write cooldown to Redis");
  }
}
