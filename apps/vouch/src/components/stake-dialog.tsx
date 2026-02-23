"use client";

import { useState, useEffect, useRef } from "react";
import { X, Zap, Check, AlertCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { formatSats } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_VOUCH_API_URL || "http://localhost:3601";
const MIN_STAKE_SATS = 10_000;
const POLL_INTERVAL_MS = 3000;

type StakeState = "idle" | "creating_invoice" | "awaiting_payment" | "confirming" | "success" | "error";

interface StakeDialogProps {
  poolId: string;
  agentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StakeDialog({ poolId, agentName, onClose, onSuccess }: StakeDialogProps) {
  const { connected, payInvoice } = useWallet();
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<StakeState>("idle");
  const [invoice, setInvoice] = useState<{ paymentRequest: string; paymentHash: string; stakeId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const amountSats = parseInt(amount, 10) || 0;
  const feeSats = Math.round((amountSats * 100) / 10000); // 1% fee
  const netSats = amountSats - feeSats;

  async function handleStake() {
    if (amountSats < MIN_STAKE_SATS) {
      setError(`Minimum stake is ${formatSats(MIN_STAKE_SATS)}`);
      return;
    }

    setState("creating_invoice");
    setError(null);

    try {
      // Create stake + invoice via API
      // S6 fix: use session cookie for auth, server derives staker_id from session
      const res = await fetch(`${API_BASE}/v1/staking/pools/${poolId}/stake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          staker_type: "user",
          amount_sats: amountSats,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `API error: ${res.status}`);
      }

      const data = await res.json();
      const result = data.data;

      // Check if we got a Lightning invoice (two-phase) or direct stake
      if (result.paymentRequest) {
        setInvoice({
          paymentRequest: result.paymentRequest,
          paymentHash: result.paymentHash,
          stakeId: result.stakeId,
        });
        setState("awaiting_payment");

        // If wallet connected, auto-pay
        if (connected) {
          try {
            await payInvoice(result.paymentRequest);
            setState("confirming");
            startPolling(result.stakeId);
          } catch {
            // Auto-pay failed — user can scan QR manually
          }
        }

        // Start polling for payment confirmation regardless
        startPolling(result.stakeId);
      } else {
        // Direct stake (no Lightning) — already complete
        setState("success");
        setTimeout(() => onSuccess?.(), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stake");
      setState("error");
    }
  }

  function startPolling(stakeId: string) {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/staking/stakes/${stakeId}/status`, {
          credentials: "include",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (data.data?.status === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState("success");
          setTimeout(() => onSuccess?.(), 1500);
        }
      } catch {
        // Poll failure — non-critical
      }
    }, POLL_INTERVAL_MS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-pl-border bg-pl-surface p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-pl-text-dim hover:text-pl-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-pl-text">
          Stake on {agentName}
        </h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Back this agent with sats. Earn yield when they perform.
        </p>

        {/* Amount input */}
        {(state === "idle" || state === "error") && (
          <div className="mt-5">
            <label className="text-xs text-pl-text-dim">Amount (sats)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder={`Min ${MIN_STAKE_SATS.toLocaleString()}`}
              min={MIN_STAKE_SATS}
              className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono"
            />

            {amountSats >= MIN_STAKE_SATS && (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-pl-text-muted">
                  <span>Staking fee (1%)</span>
                  <span>{formatSats(feeSats)}</span>
                </div>
                <div className="flex justify-between font-medium text-pl-text">
                  <span>Net staked</span>
                  <span>{formatSats(netSats)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleStake}
              disabled={amountSats < MIN_STAKE_SATS}
              className="mt-4 w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Stake {amountSats >= MIN_STAKE_SATS ? formatSats(amountSats) : ""}
            </button>
          </div>
        )}

        {/* Creating invoice */}
        {state === "creating_invoice" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Creating Lightning invoice...</p>
          </div>
        )}

        {/* Awaiting payment (show QR or auto-pay in progress) */}
        {(state === "awaiting_payment" || state === "confirming") && invoice && (
          <div className="mt-5 flex flex-col items-center gap-4">
            {state === "awaiting_payment" && (
              <>
                <p className="text-sm text-pl-text-muted text-center">
                  {connected
                    ? "Paying via connected wallet..."
                    : "Scan this invoice with your Lightning wallet"}
                </p>
                {/* Lightning invoice as copyable text */}
                <div className="w-full rounded-lg border border-pl-border bg-pl-bg p-3">
                  <p className="text-[10px] font-mono text-pl-text-dim break-all leading-relaxed select-all">
                    {invoice.paymentRequest}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(invoice.paymentRequest)}
                  className="text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
                >
                  Copy invoice
                </button>
              </>
            )}
            {state === "confirming" && (
              <div className="flex flex-col items-center gap-3 text-pl-text-muted">
                <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
                <p className="text-sm">Confirming payment...</p>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <Check className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">Stake confirmed!</p>
            <p className="text-xs text-pl-text-muted">
              {formatSats(netSats)} staked on {agentName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
