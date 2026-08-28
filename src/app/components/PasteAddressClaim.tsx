"use client";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { isAddress } from "viem";

import { Button } from "@/components/ui/button";
import { useBlacklightRelayClaim } from "@/hooks/useBlacklightRelayClaim";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

/**
 * Send NIL to a pasted address, with no wallet connected.
 *
 * WHO THIS IS FOR. A coding agent building on Blacklight L1 generates a key for the app and then
 * cannot fund it: the on-chain faucet drips to `msg.sender` only, so the operator had to connect a
 * wallet, claim, and then do a manual transfer. That is a chore handed back to a human, and it is
 * the step that stalls the agent. With this, the agent hands over a URL and its address, and the
 * human is done in about ten seconds without connecting anything.
 *
 * Offered ALONGSIDE the wallet flow, not instead of it — connecting is still the better path if you
 * are funding your own wallet, because it also gets you the on-chain claim history.
 */
export function PasteAddressClaim(): React.JSX.Element {
  const [address, setAddress] = useState("");
  const [fromLink, setFromLink] = useState(false);
  const { claim, status, nilTxHash, error, reset } = useBlacklightRelayClaim();

  // `?address=0x…` prefills the field, so an agent can hand its operator ONE link instead of a
  // link plus an address to copy across. That turns "open, copy, paste, click" into "click,
  // click" and removes the transcription-error class entirely.
  //
  // Read in an effect rather than as lazy initial state: the server renders this with an empty
  // field and reading `window` during render would produce a hydration mismatch.
  //
  // It does NOT auto-submit, deliberately. A URL that dispenses on load is fired by anything
  // that fetches it — a Slack or Discord unfurler would drain the faucet just from someone
  // pasting the link into a channel. The human's click is the only sybil barrier this endpoint
  // has, so it stays a human click.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("address")?.trim();
    if (!param) return;
    // Prefilled even when malformed, so the operator SEES what the link asked for and the
    // existing validation can say why it is wrong. Silently dropping it would look like the
    // link simply did not work.
    setAddress(param);
    setFromLink(true);
  }, []);

  const trimmed = address.trim();
  const valid = isAddress(trimmed);
  // Only complain once there is enough input to be a real attempt — validating on the first
  // keystroke means the field is red for the entire time you are pasting into it.
  const showInvalid = trimmed.length >= 42 && !valid;

  if (status === "success" && nilTxHash) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">NIL sent</span>
        </div>
        <a
          href={`${SEPOLIA_EXPLORER}/tx/${nilTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View transaction
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          onClick={() => {
            reset();
            setAddress("");
          }}
          className="text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors"
        >
          Send to another address
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && status !== "loading") claim(trimmed);
      }}
    >
      <label htmlFor="recipient" className="text-xs text-muted-foreground">
        Recipient address
      </label>
      <input
        id="recipient"
        name="recipient"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x…"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md border border-indigo-400/20 bg-indigo-950/40 px-3 py-2 font-mono text-sm text-white placeholder:text-indigo-300/30 focus:border-indigo-400/50 focus:outline-none"
      />
      {showInvalid && <p className="text-xs text-destructive">That is not a valid Ethereum address.</p>}
      {/* A link can carry any address, including one the sender chose. Low stakes — the tokens
          are valueless and it costs the clicker one daily claim — but the address should be
          visible and attributed rather than silently trusted. */}
      {fromLink && !showInvalid && (
        <p className="text-[11px] text-muted-foreground">Address filled in from the link — check it looks right.</p>
      )}
      {error && status === "error" && <p className="text-xs text-destructive">{error.message}</p>}

      <Button type="submit" disabled={!valid || status === "loading"} className="w-full">
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </span>
        ) : (
          "Send NIL"
        )}
      </Button>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Sends NIL only. The recipient also needs Sepolia ETH for gas, from any public Sepolia faucet. One claim per
        address per day.
      </p>
    </form>
  );
}
