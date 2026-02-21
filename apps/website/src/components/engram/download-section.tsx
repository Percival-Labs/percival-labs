"use client";

import { useEffect, useState } from "react";
import { Download, Terminal } from "lucide-react";

export function DownloadSection() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    const mac =
      navigator.platform.toUpperCase().includes("MAC") ||
      navigator.userAgent.includes("Mac");
    setIsMac(mac);
  }, []);

  return (
    <div className="rounded-xl border border-pl-cyan/20 bg-gradient-to-b from-pl-surface to-pl-bg p-6 sm:p-8 text-center">
      <h2 className="text-2xl font-bold text-pl-text mb-2">
        Get Engram for macOS
      </h2>
      <p className="text-sm text-pl-text-muted mb-6">
        Download, double-click, start chatting. Your AI runs in Terminal with
        the full power of the command line.
      </p>

      <a
        href="https://github.com/Percival-Labs/engram/releases/latest/download/Engram-macOS.dmg"
        className={`inline-flex items-center gap-2 rounded-lg bg-pl-cyan px-8 py-3.5 text-sm font-semibold text-pl-bg transition-all ${
          isMac
            ? "hover:brightness-110"
            : "opacity-50 pointer-events-none"
        }`}
        aria-disabled={!isMac}
      >
        <Download className="h-4 w-4" />
        Download .dmg
      </a>

      <p className="mt-4 text-xs text-pl-text-muted">
        macOS 13+ &middot; Apple Silicon &amp; Intel &middot; ~24 MB
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5">
        <Terminal className="h-4 w-4 text-pl-cyan shrink-0" />
        <code className="text-xs text-pl-text">
          npm i -g engram-harness &amp;&amp; engram
        </code>
      </div>

      {!isMac && (
        <p className="mt-4 text-sm text-pl-amber">
          Desktop app is macOS only for now. Use npm install above, or generate
          a bundle below for any platform.
        </p>
      )}
    </div>
  );
}
