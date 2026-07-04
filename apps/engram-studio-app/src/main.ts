import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "@xterm/xterm/css/xterm.css";

const term = new Terminal({
  fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
  fontSize: 13,
  lineHeight: 1.3,
  cursorBlink: true,
  cursorStyle: "block",
  theme: {
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
  },
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon());
term.open(document.getElementById("terminal")!);
fitAddon.fit();

// Send keystrokes to PTY
term.onData((data) => {
  invoke("pty_write", { data: btoa(data) });
});

// Receive PTY output
listen<string>("pty-output", (event) => {
  term.write(Uint8Array.from(atob(event.payload), (c) => c.charCodeAt(0)));
});

// Session ended
listen("pty-exit", () => {
  term.writeln("\r\n\x1b[2m── Session ended. Close window or press any key to restart. ──\x1b[0m");
  const disposable = term.onData(() => {
    disposable.dispose();
    startPty();
  });
});

// Error (missing deps)
listen<string>("pty-error", (event) => {
  term.writeln(`\r\n\x1b[31m${event.payload}\x1b[0m`);
});

// Handle resize
const resizeObserver = new ResizeObserver(() => {
  fitAddon.fit();
  invoke("pty_resize", { cols: term.cols, rows: term.rows });
});
resizeObserver.observe(document.getElementById("terminal")!);

// Quit button
document.getElementById("quit-btn")!.addEventListener("click", () => {
  invoke("pty_kill");
  getCurrentWindow().close();
});

// Start PTY on load
async function startPty() {
  try {
    await invoke("spawn_pty", { cols: term.cols, rows: term.rows });
  } catch (e) {
    term.writeln(`\r\n\x1b[31mFailed to start: ${e}\x1b[0m`);
  }
}

startPty();
