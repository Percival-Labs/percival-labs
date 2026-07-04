import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { EngramConfig } from "../App";
import "@xterm/xterm/css/xterm.css";

const THEME = {
  background: "#0f0f14",
  foreground: "#e2e2e9",
  cursor: "#818cf8",
  selectionBackground: "#33467c",
  black: "#15161e",
  red: "#f7768e",
  green: "#9ece6a",
  yellow: "#e0af68",
  blue: "#7aa2f7",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  white: "#a9b1d6",
  brightBlack: "#414868",
  brightRed: "#f7768e",
  brightGreen: "#9ece6a",
  brightYellow: "#e0af68",
  brightBlue: "#7aa2f7",
  brightMagenta: "#bb9af7",
  brightCyan: "#7dcfff",
  brightWhite: "#c0caf5",
};

interface PtyTerminalProps {
  config: EngramConfig;
}

export default function PtyTerminal({ config: _config }: PtyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "block",
      theme: THEME,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // Send keystrokes to PTY
    const dataDisposable = term.onData((data) => {
      invoke("pty_write", { data: btoa(data) });
    });

    // Receive PTY output
    const outputUnlisten = listen<string>("pty-output", (event) => {
      term.write(
        Uint8Array.from(atob(event.payload), (c) => c.charCodeAt(0))
      );
    });

    // Session ended
    const exitUnlisten = listen("pty-exit", () => {
      term.writeln(
        "\r\n\x1b[2m── Session ended. Press any key to restart. ──\x1b[0m"
      );
      const restartDisposable = term.onData(() => {
        restartDisposable.dispose();
        startPty(term);
      });
    });

    // Error (missing deps)
    const errorUnlisten = listen<string>("pty-error", (event) => {
      term.writeln(`\r\n\x1b[31m${event.payload}\x1b[0m`);
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      invoke("pty_resize", { cols: term.cols, rows: term.rows });
    });
    resizeObserver.observe(containerRef.current);

    // Start PTY
    startPty(term);

    return () => {
      dataDisposable.dispose();
      outputUnlisten.then((fn) => fn());
      exitUnlisten.then((fn) => fn());
      errorUnlisten.then((fn) => fn());
      resizeObserver.disconnect();
      invoke("pty_kill");
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: THEME.background }}
    />
  );
}

async function startPty(term: Terminal) {
  try {
    await invoke("spawn_pty", { cols: term.cols, rows: term.rows });
  } catch (e) {
    term.writeln(`\r\n\x1b[31mFailed to start: ${e}\x1b[0m`);
  }
}
