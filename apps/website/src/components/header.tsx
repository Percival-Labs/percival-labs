"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Shield } from "lucide-react";

const navLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/the-lab", label: "The Lab" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/origin", label: "Origin" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-pl-border bg-pl-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Shield className="h-7 w-7 text-pl-cyan" />
          <span className="text-lg font-bold tracking-tight text-pl-text group-hover:text-pl-cyan transition-colors">
            Percival Labs
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-pl-text-muted hover:text-pl-cyan transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/early-access"
            className="rounded-lg bg-pl-amber px-4 py-2 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Build Your Harness
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden p-2 text-pl-text-muted hover:text-pl-cyan transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-pl-border bg-pl-bg px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors py-1"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/setup"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors py-1"
          >
            Setup Wizard
          </Link>
          <Link
            href="/early-access"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg bg-pl-amber px-4 py-2 text-sm font-semibold text-pl-bg text-center hover:brightness-110 transition-all mt-2"
          >
            Build Your Harness
          </Link>
        </nav>
      )}
    </header>
  );
}
