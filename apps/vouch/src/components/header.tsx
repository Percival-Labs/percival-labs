import Link from "next/link";
import { Shield } from "lucide-react";

export function Header() {
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
        </nav>
      </div>
    </header>
  );
}
