import { useState } from "react";
import type { EngramConfig } from "../App";

interface SettingsProps {
  config: EngramConfig;
  onReset: () => void;
  onUpdate: (updates: Partial<EngramConfig>) => void;
}

export default function Settings({ config, onReset, onUpdate }: SettingsProps) {
  const [serverStatus, setServerStatus] = useState<"unknown" | "ok" | "error">("unknown");

  const personalityLabels = {
    formality: config.personality.formality > 60 ? "Formal" : config.personality.formality < 40 ? "Casual" : "Balanced",
    detail: config.personality.detail > 60 ? "Detailed" : config.personality.detail < 40 ? "Concise" : "Balanced",
    tone: config.personality.tone > 60 ? "Playful" : config.personality.tone < 40 ? "Serious" : "Balanced",
  };

  const isTeam = config.accountTier === "team";

  const connectionLabel =
    config.connection.method === "gateway"
      ? "Engram Gateway"
      : config.connection.method === "team-server"
        ? "Team Server"
        : "Own API Key";

  const checkTeamServer = async () => {
    if (!config.teamConfig?.serverUrl) return;
    try {
      const res = await fetch(`${config.teamConfig.serverUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      setServerStatus(res.ok ? "ok" : "error");
    } catch {
      setServerStatus("error");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>

        {/* Account Section */}
        <Section title="Account">
          <Row label="Tier" value={isTeam ? "Team" : "Personal"} />
          {isTeam && config.teamConfig?.teamName && (
            <Row label="Team" value={config.teamConfig.teamName} />
          )}
        </Section>

        {/* Interface Section */}
        <Section title="Interface">
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-surface-300">Default Mode</span>
            <div className="flex gap-1">
              <button
                onClick={() => onUpdate({ interfaceMode: "chat" })}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  (config.interfaceMode ?? "chat") === "chat"
                    ? "bg-accent text-white"
                    : "text-surface-400 hover:text-white bg-surface-800"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => onUpdate({ interfaceMode: "terminal" })}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  config.interfaceMode === "terminal"
                    ? "bg-accent text-white"
                    : "text-surface-400 hover:text-white bg-surface-800"
                }`}
              >
                Terminal
              </button>
            </div>
          </div>
        </Section>

        {/* Profile Section */}
        <Section title="Profile">
          <Row label="Your Name" value={config.userName} />
          <Row label="AI Name" value={config.aiName || "Engram"} />
          <Row label="Use Case" value={config.useCase} />
          <Row label="Experience" value={config.experience} />
        </Section>

        {/* Personality Section */}
        <Section title="Personality">
          <Row label="Formality" value={personalityLabels.formality} />
          <Row label="Detail" value={personalityLabels.detail} />
          <Row label="Tone" value={personalityLabels.tone} />
        </Section>

        {/* Connection Section */}
        <Section title="Connection">
          <Row label="Method" value={connectionLabel} />
          {!isTeam && <Row label="Engine Port" value="3939" />}
        </Section>

        {/* Team Section (team only) */}
        {isTeam && config.teamConfig && (
          <Section title="Team Server">
            <Row label="Server URL" value={config.teamConfig.serverUrl} />
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-surface-300">Status</span>
              <button
                onClick={checkTeamServer}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                {serverStatus === "unknown"
                  ? "Check"
                  : serverStatus === "ok"
                    ? "Connected"
                    : "Unreachable"}
              </button>
            </div>
          </Section>
        )}

        {/* Credits Section */}
        <Section title="Credits">
          <div className="bg-surface-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">--</div>
            <div className="text-xs text-surface-400 mt-1">
              Credits balance (coming soon)
            </div>
          </div>
        </Section>

        {/* Version */}
        <Section title="About">
          <Row label="Version" value="0.2.0" />
          <Row label="Engine" value="Engram HTTP" />
          <Row label="Runtime" value="Tauri v2" />
        </Section>

        {/* Reset */}
        <div className="pt-4 border-t border-surface-800">
          <button
            onClick={onReset}
            className="w-full py-2.5 rounded-xl text-sm font-medium
                       border border-red-500/30 text-red-400
                       hover:bg-red-500/10 transition-colors"
          >
            Reset Configuration
          </button>
          <p className="text-xs text-surface-500 text-center mt-2">
            This will clear all settings and show the setup wizard again.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-surface-400 mb-2">{title}</h2>
      <div className="bg-surface-900 rounded-xl border border-surface-800 divide-y divide-surface-800">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-surface-300">{label}</span>
      <span className="text-sm text-white font-medium capitalize">{value}</span>
    </div>
  );
}
