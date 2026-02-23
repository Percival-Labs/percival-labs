"use client";

import { useState } from "react";
import { Wallet, Unplug } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { formatSats } from "@/lib/format";

export function ConnectWalletButton() {
  const { connected, balance, connect, disconnect, refreshBalance } = useWallet();
  const [showInput, setShowInput] = useState(false);
  const [nwcInput, setNwcInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        {balance !== null && (
          <span className="text-sm text-pl-text-muted font-mono">
            {formatSats(balance)}
          </span>
        )}
        <button
          onClick={() => refreshBalance()}
          className="text-xs text-pl-text-dim hover:text-pl-cyan transition-colors"
          title="Refresh balance"
        >
          &#x21bb;
        </button>
        <button
          onClick={disconnect}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pl-border bg-pl-surface px-3 py-1.5 text-sm text-pl-text-muted hover:border-red-500/30 hover:text-red-400 transition-colors"
        >
          <Unplug className="h-3.5 w-3.5" />
          Disconnect
        </button>
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={nwcInput}
            onChange={(e) => {
              setNwcInput(e.target.value);
              setError(null);
            }}
            placeholder="nostr+walletconnect://..."
            className="flex-1 rounded-lg border border-pl-border bg-pl-bg px-3 py-1.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
          />
          <button
            disabled={loading || !nwcInput.trim()}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await connect(nwcInput.trim());
              } catch (err) {
                setError(err instanceof Error ? err.message : "Connection failed");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-lg bg-pl-cyan px-3 py-1.5 text-sm font-medium text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Connect"}
          </button>
          <button
            onClick={() => {
              setShowInput(false);
              setNwcInput("");
              setError(null);
            }}
            className="text-sm text-pl-text-dim hover:text-pl-text transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-pl-cyan px-4 py-2 text-sm font-medium text-pl-bg hover:bg-pl-cyan/80 transition-colors"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
}
