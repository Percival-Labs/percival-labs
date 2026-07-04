import { useState, useEffect } from "react";
import Wizard from "./pages/Wizard";
import Chat from "./pages/Chat";
import Terminal from "./pages/Terminal";
import Skills from "./pages/Skills";
import Settings from "./pages/Settings";

type Page = "wizard" | "chat" | "terminal" | "skills" | "settings";

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
    method: "gateway" | "byok" | "team-server";
    apiKey?: string;
    agentKey?: string;
    provider?: string;
    model?: string;
  };
  accountTier?: "personal" | "team";
  interfaceMode?: "chat" | "terminal";
  teamConfig?: {
    serverUrl: string;
    authToken: string;
    teamId: string;
    teamName: string;
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
      setPage(existing.interfaceMode ?? "chat");
    }
  }, []);

  const handleWizardComplete = (newConfig: EngramConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setPage(newConfig.interfaceMode ?? "chat");
  };

  const handleResetConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
    setPage("wizard");
  };

  const handleUpdateConfig = (updates: Partial<EngramConfig>) => {
    if (!config) return;
    const updated = { ...config, ...updates };
    setConfig(updated);
    saveConfig(updated);
  };

  const isTeam = config?.accountTier === "team";

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Navigation bar */}
      {page !== "wizard" && (
        <nav className="flex items-center justify-between px-4 py-2 border-b border-surface-800 bg-surface-900/50 backdrop-blur">
          <div className="flex items-center gap-1">
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
            <button
              onClick={() => setPage("terminal")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page === "terminal"
                  ? "bg-surface-700 text-white"
                  : "text-surface-400 hover:text-white"
              }`}
            >
              Terminal
            </button>
          </div>
          <span className="text-surface-400 text-sm font-medium">
            {config?.aiName || "Engram"}
          </span>
          <div className="flex items-center gap-1">
            {isTeam && (
              <button
                onClick={() => setPage("skills")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === "skills"
                    ? "bg-surface-700 text-white"
                    : "text-surface-400 hover:text-white"
                }`}
              >
                Skills
              </button>
            )}
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
          </div>
        </nav>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {page === "wizard" && <Wizard onComplete={handleWizardComplete} />}
        {page === "chat" && config && <Chat config={config} />}
        {page === "terminal" && config && <Terminal config={config} />}
        {page === "skills" && config && isTeam && <Skills config={config} />}
        {page === "settings" && config && (
          <Settings
            config={config}
            onReset={handleResetConfig}
            onUpdate={handleUpdateConfig}
          />
        )}
      </main>
    </div>
  );
}

export type { EngramConfig };
