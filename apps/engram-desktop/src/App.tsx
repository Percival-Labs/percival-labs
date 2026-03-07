import { useState, useEffect } from "react";
import Wizard from "./pages/Wizard";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";

type Page = "wizard" | "chat" | "settings";

interface EngramConfig {
  userName: string;
  aiName: string;
  useCase: string;
  experience: string;
  personality: {
    formality: number;
    detail: number;
    tone: number;
  };
  connection: {
    method: "gateway" | "byok";
    apiKey?: string;
    agentKey?: string;
    model?: string;
  };
}

const STORAGE_KEY = "engram-config";

function loadConfig(): EngramConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveConfig(config: EngramConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function App() {
  const [page, setPage] = useState<Page>("wizard");
  const [config, setConfig] = useState<EngramConfig | null>(null);

  useEffect(() => {
    const existing = loadConfig();
    if (existing) {
      setConfig(existing);
      setPage("chat");
    }
  }, []);

  const handleWizardComplete = (newConfig: EngramConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setPage("chat");
  };

  const handleResetConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
    setPage("wizard");
  };

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Navigation bar */}
      {page !== "wizard" && (
        <nav className="flex items-center justify-between px-4 py-2 border-b border-surface-800 bg-surface-900/50 backdrop-blur">
          <button
            onClick={() => setPage("chat")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page === "chat"
                ? "bg-surface-700 text-white"
                : "text-surface-400 hover:text-white"
            }`}
          >
            Chat
          </button>
          <span className="text-surface-400 text-sm font-medium">
            {config?.aiName || "Engram"}
          </span>
          <button
            onClick={() => setPage("settings")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page === "settings"
                ? "bg-surface-700 text-white"
                : "text-surface-400 hover:text-white"
            }`}
          >
            Settings
          </button>
        </nav>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {page === "wizard" && <Wizard onComplete={handleWizardComplete} />}
        {page === "chat" && config && <Chat config={config} />}
        {page === "settings" && config && (
          <Settings config={config} onReset={handleResetConfig} />
        )}
      </main>
    </div>
  );
}

export type { EngramConfig };
