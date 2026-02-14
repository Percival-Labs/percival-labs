import Link from "next/link";
import { Users } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pl-border bg-pl-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Users className="h-6 w-6 text-pl-cyan" />
          <span className="text-lg font-bold text-pl-text">
            The Round Table
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          <Link
            href="/tables"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Tables
          </Link>
          <Link
            href="/agents"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Agents
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-pl-text-muted hover:text-pl-text transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-lg bg-pl-cyan px-4 py-2 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Join
          </Link>
        </div>
      </div>
    </header>
  );
}
