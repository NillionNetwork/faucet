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

/**
 * Strip URLs before anything reaches a log. An RPC URL can carry an API key in its path, and
 * viem renders the endpoint it tried inside transport errors — so logging a raw error message is
 * how a key ends up in a log aggregator.
 */
function redact(message: string): string {
  return message.replace(/https?:\/\/\S+/g, "<url>");
}

/**
 * Log the cause server-side, tagged with the stage that failed.
 *
 * The client deliberately gets an opaque "internal error": whether the relayer is misconfigured
 * is not a stranger's business. But WE need to know, and without this the two 500 paths below are
 * indistinguishable in production — a missing env var and a dead Redis look identical, which is
 * exactly the position this route was in on its first deploy.
 */
function logFailure(stage: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[faucet/blacklight] ${stage} failed: ${redact(message)}`);
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
  } catch (error) {
    // Almost always REDIS_URL missing or unreachable for this environment. Vercel env vars are
    // per-environment, so a var set only on Production leaves Preview deploys throwing here.
    logFailure("cooldown check (redis)", error);
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

    // Missing BLACKLIGHT_FAUCET_PRIVATE_KEY / BLACKLIGHT_NIL_TOKEN_ADDRESS surfaces here, as
    // does any RPC or transaction failure.
    logFailure("payout", error);
    return jsonError("internal error", 500);
  }
}
