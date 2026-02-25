"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function Header() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pl-border bg-pl-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-pl-cyan" />
          <span className="text-lg font-bold text-pl-text">Vouch</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/agents"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Agents
          </Link>
          <Link
            href="/tables"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Tables
          </Link>
          <Link
            href="/staking"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Staking
          </Link>
          <Link
            href="/contracts"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Contracts
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/docs"
            className="text-sm text-pl-text-dim hover:text-pl-text transition-colors"
          >
            API
          </Link>

          {/* Auth section — hidden during initial load to avoid flash */}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3 border-l border-pl-border pl-6">
                  <span className="text-sm font-medium text-pl-text-secondary">
                    {user.display_name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="border-l border-pl-border pl-6">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-pl-cyan/50 bg-pl-cyan/10 px-3 py-1.5 text-sm font-medium text-pl-cyan hover:bg-pl-cyan/20 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
