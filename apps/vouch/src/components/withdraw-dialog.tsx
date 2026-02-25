"use client";

import { useState } from "react";
import { X, ArrowDownRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";

type WithdrawState = "idle" | "processing" | "success" | "error";

interface WithdrawDialogProps {
  stakeId: string;
  amountSats: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WithdrawDialog({ stakeId, amountSats, onClose, onSuccess }: WithdrawDialogProps) {
  const [state, setState] = useState<WithdrawState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    setState("processing");
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/v1/staking/stakes/${stakeId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
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

        <h2 className="text-lg font-bold text-pl-text">Complete Withdrawal</h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Release your stake of {formatSats(amountSats)}.
        </p>

        {(state === "idle" || state === "error") && (
          <div className="mt-5">
            <div className="rounded-lg border border-pl-border bg-pl-bg/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-pl-text-muted">Staked amount</span>
                <span className="font-mono text-pl-text">{formatSats(amountSats)}</span>
              </div>
              <div className="border-t border-pl-border/50 pt-3">
                <p className="text-xs text-pl-text-muted leading-relaxed">
                  Your funds are already in your wallet (non-custodial staking).
                  This releases the NWC budget authorization so the platform
                  can no longer charge against your stake.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              className="mt-4 w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowDownRight className="h-4 w-4" />
              Release Stake
            </button>
          </div>
        )}

        {state === "processing" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Releasing stake...</p>
          </div>
        )}

        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <Check className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">Stake released!</p>
            <p className="text-xs text-pl-text-muted">
              NWC authorization revoked. Your {formatSats(amountSats)} is fully yours again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
