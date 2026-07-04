import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import PtyTerminal from "../components/PtyTerminal";
import HttpTerminal from "../components/HttpTerminal";
import type { EngramConfig } from "../App";

interface TerminalProps {
  config: EngramConfig;
}

export default function Terminal({ config }: TerminalProps) {
  const [mode, setMode] = useState<"detecting" | "pty" | "http">("detecting");

  useEffect(() => {
    // PTY only for local connections (byok) with engram CLI installed
    // team-server and gateway always use HTTP terminal
    if (config.connection.method === "team-server" || config.connection.method === "gateway") {
      setMode("http");
      return;
    }

    invoke<boolean>("check_engram_cli")
      .then((found) => {
        setMode(found ? "pty" : "http");
      })
      .catch(() => setMode("http"));
  }, [config.connection.method]);

  if (mode === "detecting") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-surface-400 text-sm">Detecting environment...</div>
      </div>
    );
  }

  if (mode === "pty") {
    return <PtyTerminal config={config} />;
  }

  return <HttpTerminal config={config} />;
}
