import { type NextRequest, NextResponse } from "next/server";

import { parseRecipientAddress, sendPayout } from "@/lib/l2/faucet";
import { checkCooldown, markCooldown } from "@/lib/l2/rate-limit";

export const runtime = "nodejs";

type ErrorResponse = {
  ok: false;
  error: string;
  retryAfterMs?: number;
};

function getIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";

  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}

function jsonError(error: string, status: number, retryAfterMs?: number): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error,
      retryAfterMs,
    },
    { status },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid request body", 400);
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const recipient = parseRecipientAddress(address);
  if (!recipient) {
    return jsonError("invalid address", 400);
  }

  const ip = getIp(request);
  try {
    const cooldown = await checkCooldown(ip, recipient);
    if (!cooldown.allowed) {
      return jsonError("cooldown active", 429, cooldown.retryAfterMs);
    }
  } catch {
    return jsonError("internal error", 500);
  }

  try {
    const payout = await sendPayout(recipient);
    await markCooldown(ip, recipient);

    return NextResponse.json({
      ok: true,
      ethTxHash: payout.ethTxHash,
      nilTxHash: payout.nilTxHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    if (message.includes("out of funds")) {
      return jsonError("out of funds", 503);
    }

    return jsonError("internal error", 500);
  }
}
