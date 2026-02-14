import Link from "next/link";
import { Shield, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-pl-border bg-pl-bg">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <Shield className="h-6 w-6 text-pl-cyan" />
              <span className="text-base font-bold text-pl-text">
                Percival Labs
              </span>
            </Link>
            <p className="text-sm text-pl-text-muted leading-relaxed">
              Open-source, model-agnostic personal AI infrastructure. Built in
              the open. Cooperation over defection.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-pl-text mb-3">
              Navigate
            </h3>
            <div className="space-y-2">
              <Link
                href="/origin"
                className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors"
              >
                Origin Story
              </Link>
              <Link
                href="/pricing"
                className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/the-lab"
                className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors"
              >
                The Lab
              </Link>
              <Link
                href="/early-access"
                className="block text-sm text-pl-text-muted hover:text-pl-cyan transition-colors"
              >
                Early Access
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-pl-text mb-3">
              Community
            </h3>
            <div className="flex gap-4 mb-4">
              <a
                href="https://github.com/percival-labs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pl-text-muted hover:text-pl-cyan transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/PercivalLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pl-text-muted hover:text-pl-cyan transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
            <p className="text-xs text-pl-text-dim leading-relaxed">
              Built on{" "}
              <a
                href="https://github.com/danielmiessler/PAI"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pl-cyan hover:underline"
              >
                Daniel Miessler&apos;s PAI
              </a>{" "}
              framework. Open source, always.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-pl-border pt-6 text-center">
          <p className="text-xs text-pl-text-dim">
            &copy; {new Date().getFullYear()} Percival Labs. Built in the open.
            Make C &gt; D.
          </p>
        </div>
      </div>
    </footer>
  );
}
