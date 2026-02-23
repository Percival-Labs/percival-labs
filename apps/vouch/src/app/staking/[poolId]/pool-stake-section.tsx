"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { StakeDialog } from "@/components/stake-dialog";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

interface PoolStakeSectionProps {
  poolId: string;
  agentName: string;
}

export function PoolStakeSection({ poolId, agentName }: PoolStakeSectionProps) {
  const [showStakeDialog, setShowStakeDialog] = useState(false);

  return (
    <div className="mt-6 pt-5 border-t border-pl-border">
      <div className="flex items-center justify-between gap-4">
        <ConnectWalletButton />
        <button
          onClick={() => setShowStakeDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-pl-cyan px-5 py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors"
        >
          <Zap className="h-4 w-4" />
          Stake
        </button>
      </div>

      {showStakeDialog && (
        <StakeDialog
          poolId={poolId}
          agentName={agentName}
          onClose={() => setShowStakeDialog(false)}
          onSuccess={() => {
            setShowStakeDialog(false);
            // Trigger page revalidation
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
