import { type NextRequest, NextResponse } from "next/server";

import { getL2FaucetConfig, parseRecipientAddress } from "@/lib/l2/faucet";
import { checkCooldown, getCooldownMs } from "@/lib/l2/rate-limit";

export const runtime = "nodejs";

type StatusResponse = {
  ethAmount: string;
  nilAmount: string;
  nilTokenAddress: string;
  cooldownMs: number;
  retryAfterMs: number;
};

function getIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";

  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse | { error: string }>> {
  const address = request.nextUrl.searchParams.get("address") ?? "";
  const recipient = parseRecipientAddress(address);

  const config = getL2FaucetConfig();
  const cooldownMs = getCooldownMs();

  let retryAfterMs = 0;
  if (recipient) {
    try {
      const ip = getIp(request);
      const cooldown = await checkCooldown(ip, recipient);
      retryAfterMs = cooldown.retryAfterMs;
    } catch {
      // If Redis is unreachable, return config without cooldown info
    }
  }

  return NextResponse.json({
    ethAmount: config.ethAmount,
    nilAmount: config.nilAmount,
    nilTokenAddress: config.nilTokenAddress,
    cooldownMs,
    retryAfterMs,
  });
}
