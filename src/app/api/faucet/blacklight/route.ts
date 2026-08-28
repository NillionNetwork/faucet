import { type NextRequest, NextResponse } from "next/server";

import { parseRecipientAddress, sendPayout } from "@/lib/blacklight/faucet";
import { checkCooldown, markCooldown } from "@/lib/blacklight/rate-limit";

/**
 * POST /api/faucet/blacklight  { address }  ->  { ok, nilTxHash }
 *
 * Sends testnet NIL to an arbitrary address, with no wallet connection. The point is the agent
 * case: an assistant generates a key for the app it is building and can hand its operator a URL
 * instead of a chore. Pasting an address takes ten seconds; connecting a wallet and doing a
 * manual transfer does not.
 *
 * NIL ONLY — see lib/blacklight/faucet.ts for why. Callers still need Sepolia ETH for gas and
 * escrow, from any public Sepolia faucet.
 */
export const runtime = "nodejs";

type ErrorResponse = {
  ok: false;
  error: string;
  retryAfterMs?: number;
};

function getIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";

  // Leftmost entry is the client as seen by the first proxy. Trusting it means a client can
  // spoof the header, but that is already true of the L2 route and the cooldown is not a
  // security boundary — it is friction. The /64 bucketing in bucketIp() closes the cheap,
  // non-spoofing version of the same bypass.
  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}

function jsonError(error: string, status: number, retryAfterMs?: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ ok: false, error, retryAfterMs }, { status });
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
    // Marked only AFTER the transfer lands. Marking first would burn somebody's daily claim on
    // a failure that gave them nothing.
    await markCooldown(ip, recipient);

    return NextResponse.json({ ok: true, nilTxHash: payout.nilTxHash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    if (message.includes("out of funds")) {
      return jsonError("out of funds", 503);
    }

    return jsonError("internal error", 500);
  }
}
