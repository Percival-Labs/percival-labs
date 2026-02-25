"use client";

import { useState } from "react";
import { X, Zap, AlertCircle } from "lucide-react";
import { WalletConnect } from "./wallet-connect";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";
const MIN_STAKE_SATS = 10_000;

type StakeState = "amount_input" | "creating" | "wallet_connect" | "success" | "error";

interface StakeDialogProps {
  poolId: string;
  agentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StakeDialog({ poolId, agentName, onClose, onSuccess }: StakeDialogProps) {
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<StakeState>("amount_input");
  const [pendingStake, setPendingStake] = useState<{ stakeId: string; budgetSats: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountSats = parseInt(amount, 10) || 0;
  const feeSats = Math.round((amountSats * 100) / 10000); // 1% fee display
  const netSats = amountSats - feeSats;

  async function handleInitiateStake() {
    if (amountSats < MIN_STAKE_SATS) {
      setError(`Minimum stake is ${formatSats(MIN_STAKE_SATS)}`);
      return;
    }

    setState("creating");
    setError(null);

    try {
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

      // NWC flow: show wallet connect step
      setPendingStake({
        stakeId: result.stakeId,
        budgetSats: result.budgetSats || amountSats,
      });
      setState("wallet_connect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stake");
      setState("error");
    }
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
          Back this agent with sats. Your funds stay in your wallet.
        </p>

        {/* Amount input */}
        {(state === "amount_input" || state === "error") && (
          <div className="mt-5">
            <label className="text-xs text-pl-text-dim">Amount (sats)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
                if (state === "error") setState("amount_input");
              }}
              placeholder={`Min ${MIN_STAKE_SATS.toLocaleString()}`}
              min={MIN_STAKE_SATS}
              className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono"
            />

            {amountSats >= MIN_STAKE_SATS && (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-pl-text-muted">
                  <span>Platform fee (1%)</span>
                  <span>{formatSats(feeSats)}</span>
                </div>
                <div className="flex justify-between font-medium text-pl-text">
                  <span>Net staked</span>
                  <span>{formatSats(netSats)}</span>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-lg bg-pl-bg/50 border border-pl-border/50 p-3">
              <p className="text-[10px] text-pl-text-muted leading-relaxed">
                Non-custodial staking: You connect your Lightning wallet via NWC.
                Funds stay in your wallet — we only get authorization to charge if
                a slash event occurs.
              </p>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleInitiateStake}
              disabled={amountSats < MIN_STAKE_SATS}
              className="mt-4 w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Stake {amountSats >= MIN_STAKE_SATS ? formatSats(amountSats) : ""}
            </button>
          </div>
        )}

        {/* NWC Wallet Connect step */}
        {state === "wallet_connect" && pendingStake && (
          <div className="mt-5">
            <WalletConnect
              stakeId={pendingStake.stakeId}
              budgetSats={pendingStake.budgetSats}
              onSuccess={() => {
                setState("success");
                setTimeout(() => onSuccess?.(), 1500);
              }}
              onCancel={() => {
                setState("amount_input");
                setPendingStake(null);
              }}
            />
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <Zap className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">Stake confirmed!</p>
            <p className="text-xs text-pl-text-muted">
              {formatSats(netSats)} staked on {agentName}
            </p>
            <p className="text-[10px] text-pl-text-dim">
              Your funds remain in your wallet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
