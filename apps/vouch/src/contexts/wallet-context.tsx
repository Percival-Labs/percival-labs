"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface WalletState {
  connected: boolean;
  nwcUri: string | null;
  pubkey: string | null;
  balance: number | null; // sats
}

interface WalletContextValue extends WalletState {
  connect: (nwcUri: string) => Promise<void>;
  disconnect: () => void;
  payInvoice: (bolt11: string) => Promise<{ preimage: string }>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const NWC_STORAGE_KEY = "vouch-nwc-uri";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    nwcUri: null,
    pubkey: null,
    balance: null,
  });

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(NWC_STORAGE_KEY);
    if (stored) {
      connectInternal(stored).catch(() => {
        sessionStorage.removeItem(NWC_STORAGE_KEY);
      });
    }
  }, []);

  const connectInternal = useCallback(async (uri: string) => {
    // Parse NWC URI to extract relay and pubkey
    // Format: nostr+walletconnect://<pubkey>?relay=<relay>&secret=<secret>
    try {
      const url = new URL(uri.replace("nostr+walletconnect://", "https://"));
      const pubkey = url.pathname.replace(/^\/\//, "").replace(/^\//, "");

      setState({
        connected: true,
        nwcUri: uri,
        pubkey: pubkey || null,
        balance: null,
      });

      sessionStorage.setItem(NWC_STORAGE_KEY, uri);
    } catch {
      throw new Error("Invalid NWC connection string");
    }
  }, []);

  const connect = useCallback(async (uri: string) => {
    await connectInternal(uri);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      nwcUri: null,
      pubkey: null,
      balance: null,
    });
    sessionStorage.removeItem(NWC_STORAGE_KEY);
  }, []);

  const payInvoice = useCallback(async (bolt11: string): Promise<{ preimage: string }> => {
    if (!state.nwcUri) throw new Error("Wallet not connected");

    // Dynamic import to avoid SSR issues
    const { nwc } = await import("@getalby/sdk");
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: state.nwcUri });

    try {
      const result = await client.payInvoice({ invoice: bolt11 });
      return { preimage: result.preimage };
    } finally {
      client.close();
    }
  }, [state.nwcUri]);

  const refreshBalance = useCallback(async () => {
    if (!state.nwcUri) return;

    try {
      const { nwc } = await import("@getalby/sdk");
      const client = new nwc.NWCClient({ nostrWalletConnectUrl: state.nwcUri });
      try {
        const result = await client.getBalance();
        setState((prev) => ({ ...prev, balance: Math.floor(result.balance / 1000) })); // msats → sats
      } finally {
        client.close();
      }
    } catch {
      // Balance fetch failed — non-critical
    }
  }, [state.nwcUri]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, payInvoice, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
