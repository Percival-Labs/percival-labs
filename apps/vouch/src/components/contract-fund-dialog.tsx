"use client";

import { useState } from "react";
import { X, Wallet, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { WalletConnect } from "./wallet-connect";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";

type FundState = "confirm" | "creating" | "wallet_connect" | "success" | "error";

interface ContractFundDialogProps {
  contractId: string;
  totalSats: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractFundDialog({
  contractId,
  totalSats,
  onClose,
  onSuccess,
}: ContractFundDialogProps) {
  const [state, setState] = useState<FundState>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [pendingFund, setPendingFund] = useState<{
    stakeId: string;
    budgetSats: number;
  } | null>(null);

  async function handleInitiateFunding() {
    setState("creating");
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/fund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount_sats: totalSats }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message || `Funding failed: ${res.status}`
        );
      }

      const data = await res.json();
      const result = data.data;

      setPendingFund({
        stakeId: result.fundId || result.stakeId,
        budgetSats: result.budgetSats || totalSats,
      });
      setState("wallet_connect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate funding");
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

        <h2 className="text-lg font-bold text-pl-text flex items-center gap-2">
          <Wallet className="h-5 w-5 text-pl-cyan" />
          Fund Contract
        </h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          Lock funds to activate this contract.
        </p>

        {/* Confirm step */}
        {(state === "confirm" || state === "error") && (
          <div className="mt-5">
            <div className="rounded-lg border border-pl-border bg-pl-bg/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-pl-text-muted">Contract total</span>
                <span className="font-mono font-bold text-pl-text">
                  {formatSats(totalSats)}
                </span>
              </div>
              <div className="border-t border-pl-border/50 pt-3">
                <p className="text-xs text-pl-text-muted leading-relaxed">
                  Funds are held in escrow and released as milestones are
                  accepted. Your wallet authorizes the contract budget via NWC.
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
              onClick={handleInitiateFunding}
              className="mt-4 w-full rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              Fund {formatSats(totalSats)}
            </button>
          </div>
        )}

        {/* Creating */}
        {state === "creating" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Preparing funding...</p>
          </div>
        )}

        {/* Wallet Connect step */}
        {state === "wallet_connect" && pendingFund && (
          <div className="mt-5">
            <WalletConnect
              stakeId={pendingFund.stakeId}
              budgetSats={pendingFund.budgetSats}
              onSuccess={() => {
                setState("success");
                setTimeout(() => onSuccess?.(), 1500);
              }}
              onCancel={() => {
                setState("confirm");
                setPendingFund(null);
              }}
            />
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <CheckCircle className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">
              Contract funded!
            </p>
            <p className="text-xs text-pl-text-muted">
              {formatSats(totalSats)} locked. The contract is now active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
