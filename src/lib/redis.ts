import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing required environment variable: REDIS_URL");
  }
  return url;
}

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 1,
  });
  return redisClient;
}

export async function resetRedisClientForTests(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = null;
}
