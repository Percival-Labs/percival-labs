"use client";

import { useState, useEffect, useRef } from "react";
import { Wallet, Check, AlertCircle, Loader2, QrCode, Copy } from "lucide-react";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";
const POLL_INTERVAL_MS = 3000;

type ConnectState = "idle" | "connecting" | "verifying" | "success" | "error";

interface WalletConnectProps {
  stakeId: string;
  budgetSats: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * NWC Wallet Connect component.
 * Users can either:
 * 1. Paste an NWC connection string from their wallet app
 * 2. Scan a QR code (if wallet supports NWC deep links)
 *
 * The NWC budget authorization IS the stake lock — funds stay in the user's wallet.
 */
export function WalletConnect({ stakeId, budgetSats, onSuccess, onCancel }: WalletConnectProps) {
  const [connectionString, setConnectionString] = useState("");
  const [state, setState] = useState<ConnectState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleConnect() {
    if (!connectionString.trim()) {
      setError("Please paste your NWC connection string");
      return;
    }

    if (!connectionString.startsWith("nostr+walletconnect://")) {
      setError("Invalid NWC URI — must start with nostr+walletconnect://");
      return;
    }

    setState("connecting");
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/v1/staking/wallet/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          stake_id: stakeId,
          connection_string: connectionString.trim(),
          budget_sats: budgetSats,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Connection failed: ${res.status}`);
      }

      setState("success");
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setState("error");
    }
  }

  // NWC deep link for wallet apps that support it
  const nwcDeepLink = `nostr+walletconnect:?budget=${budgetSats * 1000}&methods=pay_invoice,make_invoice,get_balance,get_info`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-pl-border bg-pl-bg/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-pl-text">
          <Wallet className="h-4 w-4 text-pl-cyan" />
          Connect Lightning Wallet
        </div>
        <p className="mt-2 text-xs text-pl-text-muted leading-relaxed">
          Connect your wallet via Nostr Wallet Connect (NWC). Your funds stay in your wallet —
          we only get permission to charge up to <span className="font-mono text-pl-cyan">{formatSats(budgetSats)}</span> if
          a slash event occurs.
        </p>
      </div>

      {(state === "idle" || state === "error") && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-pl-text-dim">
              NWC Connection String
            </label>
            <p className="text-[10px] text-pl-text-muted mt-0.5">
              Open your wallet app (Alby, Mutiny, etc.) → Settings → Nostr Wallet Connect → Create Connection
            </p>
            <textarea
              value={connectionString}
              onChange={(e) => {
                setConnectionString(e.target.value);
                setError(null);
              }}
              placeholder="nostr+walletconnect://..."
              rows={3}
              className="mt-2 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono text-xs"
            />
          </div>

          <div className="rounded-lg border border-dashed border-pl-border p-3">
            <p className="text-[10px] text-pl-text-dim text-center">
              Required permissions: <span className="text-pl-text font-mono">pay_invoice</span>, <span className="text-pl-text font-mono">make_invoice</span>
            </p>
            <p className="text-[10px] text-pl-text-dim text-center mt-1">
              Budget: <span className="text-pl-cyan font-mono">{formatSats(budgetSats)}</span> (the max you could be slashed)
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-pl-border py-2.5 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={!connectionString.trim()}
              className="flex-1 rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {state === "connecting" && (
        <div className="flex flex-col items-center gap-3 py-6 text-pl-text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
          <p className="text-sm">Verifying wallet connection...</p>
          <p className="text-xs">Checking your wallet is reachable and has sufficient budget</p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
            <Check className="h-6 w-6 text-pl-green" />
          </div>
          <p className="text-sm font-medium text-pl-green">Wallet connected!</p>
          <p className="text-xs text-pl-text-muted">
            Stake active — {formatSats(budgetSats)} budget authorized
          </p>
        </div>
      )}
    </div>
  );
}
