"use client";

import { useState } from "react";
import { X, ArrowDownRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { formatSats } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_VOUCH_API_URL || "http://localhost:3601";

type WithdrawState = "idle" | "processing" | "success" | "error";

interface WithdrawDialogProps {
  stakeId: string;
  amountSats: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WithdrawDialog({ stakeId, amountSats, onClose, onSuccess }: WithdrawDialogProps) {
  const [lightningAddress, setLightningAddress] = useState("");
  const [state, setState] = useState<WithdrawState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    if (!lightningAddress.trim()) {
      setError("Lightning address is required");
      return;
    }

    setState("processing");
    setError(null);

    try {
      // S8 fix: include session cookie for auth
      const res = await fetch(`${API_BASE}/v1/staking/stakes/${stakeId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lightning_address: lightningAddress.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Withdraw failed: ${res.status}`);
      }

      setState("success");
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-pl-border bg-pl-surface p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-pl-text-dim hover:text-pl-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-pl-text">Withdraw Stake</h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Withdraw {formatSats(amountSats)} to your Lightning wallet.
        </p>

        {(state === "idle" || state === "error") && (
          <div className="mt-5">
            <label className="text-xs text-pl-text-dim">
              Lightning Address
            </label>
            <input
              type="text"
              value={lightningAddress}
              onChange={(e) => {
                setLightningAddress(e.target.value);
                setError(null);
              }}
              placeholder="you@getalby.com"
              className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!lightningAddress.trim()}
              className="mt-4 w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowDownRight className="h-4 w-4" />
              Withdraw {formatSats(amountSats)}
            </button>
          </div>
        )}

        {state === "processing" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Processing withdrawal...</p>
          </div>
        )}

        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <Check className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">Withdrawal sent!</p>
            <p className="text-xs text-pl-text-muted">
              {formatSats(amountSats)} sent to {lightningAddress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
