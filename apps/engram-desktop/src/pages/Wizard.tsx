import { useState, useRef, useEffect } from "react";
import WizardStep from "../components/WizardStep";
import type { EngramConfig } from "../App";

interface WizardProps {
  onComplete: (config: EngramConfig) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const USE_CASES = [
  { id: "coding", label: "Coding Assistant", icon: ">" },
  { id: "writing", label: "Writing Partner", icon: "A" },
  { id: "research", label: "Research Helper", icon: "?" },
  { id: "general", label: "General Assistant", icon: "*" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "New to AI", desc: "I want guidance and explanations" },
  { id: "intermediate", label: "Some Experience", desc: "I know the basics" },
  { id: "advanced", label: "Power User", desc: "Give me full control" },
];

const ENGINE_URL = "http://localhost:3939";

function mapPersonality(sliders: { formality: number; detail: number; tone: number }) {
  return {
    humor: Math.round(sliders.tone * 0.7),
    excitement: Math.round(50 + (sliders.tone - 50) * 0.4),
    curiosity: Math.round(50 + sliders.detail * 0.3),
    precision: Math.round(40 + sliders.detail * 0.5),
    professionalism: sliders.formality,
    directness: Math.round(80 - sliders.detail * 0.3),
    playfulness: sliders.tone,
  };
}

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [userName, setUserName] = useState("");
  const [aiName, setAiName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [experience, setExperience] = useState("");
  const [personality, setPersonality] = useState({
    formality: 50,
    detail: 50,
    tone: 50,
  });
  const [accountTier, setAccountTier] = useState<"personal" | "team">("personal");
  const [connectionMethod, setConnectionMethod] = useState<"gateway" | "byok">(
    "gateway"
  );
  const [apiKey, setApiKey] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [byokProvider, setByokProvider] = useState("");
  const [byokModel, setByokModel] = useState("");
  const [providers, setProviders] = useState<{ id: string; name: string; requiresApiKey: boolean }[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [byokStep, setByokStep] = useState<1 | 2 | 3>(1); // 1=provider, 2=key, 3=model
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [engineReachable, setEngineReachable] = useState<boolean | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  // Team-specific state
  const [teamServerUrl, setTeamServerUrl] = useState("");
  const [teamAuthToken, setTeamAuthToken] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamValidating, setTeamValidating] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [interfaceMode, setInterfaceMode] = useState<"chat" | "terminal">("chat");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step]);

  // BYOK: check engine health + fetch providers when BYOK selected
  useEffect(() => {
    if (connectionMethod !== "byok" || step < 7) return;
    let cancelled = false;

    async function checkEngine() {
      setEngineReachable(null);
      try {
        const res = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error();
        if (!cancelled) setEngineReachable(true);

        // Fetch providers
        const provRes = await fetch(`${ENGINE_URL}/setup/providers`, { signal: AbortSignal.timeout(5000) });
        if (provRes.ok) {
          const data = await provRes.json();
          const apiProviders = (data.providers || data || []).filter(
            (p: { requiresApiKey?: boolean }) => p.requiresApiKey !== false
          );
          if (!cancelled) setProviders(apiProviders);
        }
      } catch {
        if (!cancelled) setEngineReachable(false);
      }
    }

    checkEngine();
    return () => { cancelled = true; };
  }, [connectionMethod, step]);

  // BYOK: validate API key when entered
  async function validateByokKey() {
    if (!byokProvider || !apiKey) return;
    setValidating(true);
    setValidationError(null);
    try {
      const res = await fetch(`${ENGINE_URL}/setup/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: byokProvider, apiKey }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (!data.valid) {
        setValidationError(data.message || "Invalid API key");
        setValidating(false);
        return;
      }
      // Fetch models for this provider
      const modRes = await fetch(`${ENGINE_URL}/setup/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: byokProvider, apiKey }),
        signal: AbortSignal.timeout(10000),
      });
      if (modRes.ok) {
        const modData = await modRes.json();
        setModels(modData.models || modData || []);
      }
      setByokStep(3);
    } catch {
      setValidationError("Could not reach engine for validation");
    }
    setValidating(false);
  }

  // Team server validation
  async function validateTeamServer() {
    if (!teamServerUrl.trim() || !teamAuthToken.trim()) return;
    setTeamValidating(true);
    setTeamError(null);
    try {
      // Check health (no auth)
      const healthRes = await fetch(`${teamServerUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!healthRes.ok) throw new Error(`Server returned ${healthRes.status}`);
      const healthData = await healthRes.json();
      if (!healthData.serverMode) {
        throw new Error("Server is not running in team/multi-user mode");
      }

      // Check auth
      const infoRes = await fetch(`${teamServerUrl.replace(/\/$/, '')}/info`, {
        headers: { Authorization: `Bearer ${teamAuthToken}` },
        signal: AbortSignal.timeout(5000),
      });
      if (infoRes.status === 401 || infoRes.status === 403) {
        throw new Error("Auth token was rejected. Check your token.");
      }
      if (!infoRes.ok) throw new Error(`Server returned ${infoRes.status}`);

      // If team account, go to interface preference step
      setStep(8);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setTeamValidating(false);
    }
  }

  // Final validation + setup (step 8 for personal, step 9 for team)
  const validationStep = accountTier === "team" ? 9 : 8;

  useEffect(() => {
    if (step !== validationStep) return;
    let cancelled = false;

    async function runSetup() {
      try {
        setSetupError(null);

        // Team server — already validated, just finalize
        if (accountTier === "team") {
          if (!cancelled) setInstallProgress(30);
          await new Promise((r) => setTimeout(r, 300));
          if (!cancelled) setInstallProgress(70);
          await new Promise((r) => setTimeout(r, 300));
          if (!cancelled) {
            setInstallProgress(100);
            await new Promise((r) => setTimeout(r, 600));
            onComplete({
              userName,
              aiName: aiName || "Engram",
              useCase,
              experience,
              personality,
              connection: { method: "team-server" },
              accountTier: "team",
              interfaceMode,
              teamConfig: {
                serverUrl: teamServerUrl.replace(/\/$/, ''),
                authToken: teamAuthToken,
                teamId: teamName.toLowerCase().replace(/\s+/g, '-'),
                teamName,
              },
            });
          }
          return;
        }

        // Personal flow — unchanged
        if (!cancelled) setInstallProgress(15);
        await new Promise((r) => setTimeout(r, 300));

        if (connectionMethod === "gateway") {
          if (!/^[a-f0-9]{64}$/i.test(agentKey)) {
            throw new Error("AgentKey must be a 64-character hex string");
          }
        } else {
          if (!apiKey || !byokProvider || !byokModel) {
            throw new Error("Provider, API key, and model are all required");
          }
        }

        if (!cancelled) setInstallProgress(35);
        if (connectionMethod === "gateway") {
          try {
            const res = await fetch("https://gateway.percival-labs.ai/health", {
              signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
          } catch {
            throw new Error(
              `Cannot reach Engram Gateway. Check your internet connection.`
            );
          }
        }

        if (!cancelled) setInstallProgress(60);
        if (connectionMethod === "gateway") {
          try {
            const res = await fetch(
              "https://gateway.percival-labs.ai/auto/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Vouch-Auth": `AgentKey ${agentKey}`,
                },
                body: JSON.stringify({
                  model: "fast",
                  messages: [{ role: "user", content: "ping" }],
                  max_tokens: 5,
                  stream: false,
                }),
                signal: AbortSignal.timeout(15000),
              }
            );
            if (res.status === 401 || res.status === 403) {
              throw new Error(
                "AgentKey was rejected. Check that your key is correct."
              );
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes("AgentKey was rejected")) {
              throw err;
            }
          }
        }

        if (connectionMethod === "byok") {
          if (!cancelled) setInstallProgress(70);
          const setupRes = await fetch(`${ENGINE_URL}/setup/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userName,
              aiName: aiName || "Engram",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              personality: mapPersonality(personality),
              provider: { id: byokProvider, apiKey, model: byokModel },
            }),
            signal: AbortSignal.timeout(15000),
          });
          const setupData = await setupRes.json();
          if (!setupData.success) {
            throw new Error(setupData.message || "Engine setup failed");
          }
        }

        if (!cancelled) setInstallProgress(85);
        await new Promise((r) => setTimeout(r, 300));

        if (!cancelled) {
          setInstallProgress(100);
          await new Promise((r) => setTimeout(r, 600));
          onComplete({
            userName,
            aiName: aiName || "Engram",
            useCase,
            experience,
            personality,
            connection: {
              method: connectionMethod,
              apiKey: connectionMethod === "byok" ? apiKey : undefined,
              agentKey: connectionMethod === "gateway" ? agentKey : undefined,
              provider: connectionMethod === "byok" ? byokProvider : undefined,
              model: connectionMethod === "byok" ? byokModel : undefined,
            },
            accountTier: "personal",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSetupError(
            err instanceof Error ? err.message : "Setup failed"
          );
          setInstallProgress(0);
        }
      }
    }

    runSetup();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) setStep(2);
  };

  const handleAiNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Step 1: Welcome + Name */}
        <WizardStep prompt="Welcome to Engram. I'm going to help you set up your personal AI companion. What's your name?">
          <form onSubmit={handleNameSubmit} className="flex gap-2">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name..."
              className="wizard-input"
              autoFocus
            />
            <button type="submit" className="wizard-button whitespace-nowrap">
              Next
            </button>
          </form>
        </WizardStep>

        {/* Step 2: AI Name */}
        {step >= 2 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">{userName}</div>
            </div>
            <WizardStep
              prompt={`Nice to meet you, ${userName}. What would you like to call your AI? You can pick a name, or just press enter to keep "Engram".`}
            >
              <form onSubmit={handleAiNameSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Engram"
                  className="wizard-input"
                  autoFocus
                />
                <button
                  type="submit"
                  className="wizard-button whitespace-nowrap"
                >
                  Next
                </button>
              </form>
            </WizardStep>
          </>
        )}

        {/* Step 3: Use Case */}
        {step >= 3 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                {aiName || "Engram"}
              </div>
            </div>
            <WizardStep prompt={`Great choice. What will you primarily use ${aiName || "Engram"} for?`}>
              <div className="grid grid-cols-2 gap-2">
                {USE_CASES.map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => {
                      setUseCase(uc.id);
                      setStep(4);
                    }}
                    className={`wizard-button-outline text-left ${
                      useCase === uc.id ? "border-accent text-white" : ""
                    }`}
                  >
                    <span className="text-accent mr-2 font-mono">
                      {uc.icon}
                    </span>
                    {uc.label}
                  </button>
                ))}
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 4: Experience Level */}
        {step >= 4 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                {USE_CASES.find((u) => u.id === useCase)?.label}
              </div>
            </div>
            <WizardStep prompt="How experienced are you with AI assistants?">
              <div className="space-y-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => {
                      setExperience(level.id);
                      setStep(5);
                    }}
                    className={`wizard-button-outline w-full text-left ${
                      experience === level.id
                        ? "border-accent text-white"
                        : ""
                    }`}
                  >
                    <div className="font-medium">{level.label}</div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {level.desc}
                    </div>
                  </button>
                ))}
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 5: Personality Sliders */}
        {step >= 5 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                {EXPERIENCE_LEVELS.find((l) => l.id === experience)?.label}
              </div>
            </div>
            <WizardStep prompt="Let's dial in the personality. Adjust these sliders to match your preference.">
              <div className="space-y-4 bg-surface-800 rounded-xl p-4 min-w-[280px]">
                <SliderField
                  label="Formality"
                  left="Casual"
                  right="Formal"
                  value={personality.formality}
                  onChange={(v) =>
                    setPersonality((p) => ({ ...p, formality: v }))
                  }
                />
                <SliderField
                  label="Detail"
                  left="Concise"
                  right="Detailed"
                  value={personality.detail}
                  onChange={(v) =>
                    setPersonality((p) => ({ ...p, detail: v }))
                  }
                />
                <SliderField
                  label="Tone"
                  left="Serious"
                  right="Playful"
                  value={personality.tone}
                  onChange={(v) => setPersonality((p) => ({ ...p, tone: v }))}
                />
                <button
                  onClick={() => setStep(6)}
                  className="wizard-button w-full mt-2"
                >
                  Looks good
                </button>
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 6: Account Type */}
        {step >= 6 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                Personality configured
              </div>
            </div>
            <WizardStep prompt="How will you be using Engram?">
              <div className="space-y-2 min-w-[280px]">
                <button
                  onClick={() => {
                    setAccountTier("personal");
                    setStep(7);
                  }}
                  className={`wizard-button-outline w-full text-left ${
                    accountTier === "personal" && step > 6
                      ? "border-accent text-white"
                      : ""
                  }`}
                >
                  <div className="font-medium">Personal</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Individual use with Gateway or your own API key
                  </div>
                </button>
                <button
                  onClick={() => {
                    setAccountTier("team");
                    setStep(7);
                  }}
                  className={`wizard-button-outline w-full text-left ${
                    accountTier === "team" && step > 6
                      ? "border-accent text-white"
                      : ""
                  }`}
                >
                  <div className="font-medium">Team / Business</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Connect to a shared team server with shared skills
                  </div>
                </button>
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 7: Connection Method (personal) or Team Server (team) */}
        {step >= 7 && accountTier === "personal" && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">Personal</div>
            </div>
            <WizardStep prompt="How do you want to connect? You can use our Gateway (easiest) or bring your own API key.">
              <div className="space-y-2 min-w-[280px]">
                <button
                  onClick={() => setConnectionMethod("gateway")}
                  className={`wizard-button-outline w-full text-left ${
                    connectionMethod === "gateway"
                      ? "border-accent text-white"
                      : ""
                  }`}
                >
                  <div className="font-medium">Engram Gateway</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Managed service, usage-based pricing, easiest setup
                  </div>
                </button>
                <button
                  onClick={() => setConnectionMethod("byok")}
                  className={`wizard-button-outline w-full text-left ${
                    connectionMethod === "byok"
                      ? "border-accent text-white"
                      : ""
                  }`}
                >
                  <div className="font-medium">Bring Your Own Key</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Use your own OpenAI, Anthropic, or other API key
                  </div>
                </button>
                {connectionMethod === "gateway" && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="password"
                      value={agentKey}
                      onChange={(e) => setAgentKey(e.target.value)}
                      placeholder="AgentKey (64-character hex token)"
                      className="wizard-input"
                    />
                    <div className="text-xs text-surface-500">
                      Get your AgentKey from the Percival Labs account portal
                    </div>
                    <button
                      onClick={() => setStep(8)}
                      className="wizard-button w-full"
                      disabled={!agentKey.trim()}
                    >
                      Connect
                    </button>
                  </div>
                )}
                {connectionMethod === "byok" && (
                  <div className="mt-3 space-y-2">
                    {engineReachable === false && (
                      <div className="text-red-400 text-sm p-2 bg-red-400/10 rounded-lg">
                        Engram engine not running. Start it with: <code className="text-red-300">engram serve-http</code>
                      </div>
                    )}
                    {engineReachable === null && (
                      <div className="text-surface-400 text-sm">Checking engine...</div>
                    )}
                    {engineReachable && (
                      <>
                        <select
                          value={byokProvider}
                          onChange={(e) => {
                            setByokProvider(e.target.value);
                            setApiKey("");
                            setByokModel("");
                            setModels([]);
                            setValidationError(null);
                            setByokStep(2);
                          }}
                          className="wizard-input"
                        >
                          <option value="">Select provider...</option>
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        {byokProvider && byokStep >= 2 && (
                          <>
                            <input
                              type="password"
                              value={apiKey}
                              onChange={(e) => {
                                setApiKey(e.target.value);
                                setValidationError(null);
                              }}
                              placeholder="API key..."
                              className="wizard-input"
                            />
                            {validationError && (
                              <div className="text-red-400 text-xs">{validationError}</div>
                            )}
                            {byokStep === 2 && (
                              <button
                                onClick={validateByokKey}
                                className="wizard-button w-full"
                                disabled={!apiKey.trim() || validating}
                              >
                                {validating ? "Validating..." : "Validate Key"}
                              </button>
                            )}
                          </>
                        )}

                        {byokStep >= 3 && (
                          <>
                            <select
                              value={byokModel}
                              onChange={(e) => setByokModel(e.target.value)}
                              className="wizard-input"
                            >
                              <option value="">Select model...</option>
                              {models.map((m) => (
                                <option key={m.id} value={m.id}>{m.name || m.id}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setStep(8)}
                              className="wizard-button w-full"
                              disabled={!byokModel}
                            >
                              Connect
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 7: Team Server Connection */}
        {step >= 7 && accountTier === "team" && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">Team / Business</div>
            </div>
            <WizardStep prompt="Enter your team server details. Your admin should have these for you.">
              <div className="space-y-3 min-w-[280px]">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name (e.g. Westerlies)"
                  className="wizard-input"
                />
                <input
                  type="text"
                  value={teamServerUrl}
                  onChange={(e) => {
                    setTeamServerUrl(e.target.value);
                    setTeamError(null);
                  }}
                  placeholder="Server URL (e.g. http://100.x.x.x:3939)"
                  className="wizard-input"
                />
                <input
                  type="password"
                  value={teamAuthToken}
                  onChange={(e) => {
                    setTeamAuthToken(e.target.value);
                    setTeamError(null);
                  }}
                  placeholder="Auth token"
                  className="wizard-input"
                />
                {teamError && (
                  <div className="text-red-400 text-xs">{teamError}</div>
                )}
                <button
                  onClick={validateTeamServer}
                  className="wizard-button w-full"
                  disabled={!teamServerUrl.trim() || !teamAuthToken.trim() || !teamName.trim() || teamValidating}
                >
                  {teamValidating ? "Connecting..." : "Connect"}
                </button>
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 8: Interface Preference (team only) */}
        {step >= 8 && accountTier === "team" && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">Connected to {teamName}</div>
            </div>
            <WizardStep prompt="Which interface do you prefer? You can always switch between them later.">
              <div className="space-y-2 min-w-[280px]">
                <button
                  onClick={() => {
                    setInterfaceMode("chat");
                    setStep(9);
                  }}
                  className="wizard-button-outline w-full text-left"
                >
                  <div className="font-medium">Chat Interface</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Friendly conversation style, recommended for most users
                  </div>
                </button>
                <button
                  onClick={() => {
                    setInterfaceMode("terminal");
                    setStep(9);
                  }}
                  className="wizard-button-outline w-full text-left"
                >
                  <div className="font-medium">Terminal Interface</div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    Power-user CLI feel, command-line style
                  </div>
                </button>
              </div>
            </WizardStep>
          </>
        )}

        {/* Validation / Installation Progress */}
        {step >= validationStep && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                {accountTier === "team"
                  ? interfaceMode === "terminal" ? "Terminal" : "Chat"
                  : connectionMethod === "gateway"
                    ? "Engram Gateway"
                    : "Own API key"}
              </div>
            </div>
            <WizardStep
              prompt={setupError
                ? `Something went wrong. Let's try again.`
                : `Setting up ${aiName || "Engram"} for you...`}
              showInput={false}
            >
              <div />
            </WizardStep>
            <div className="flex justify-start">
              <div className="chat-bubble-assistant min-w-[280px]">
                {setupError ? (
                  <div className="space-y-3">
                    <div className="text-red-400 text-sm">{setupError}</div>
                    <button
                      onClick={() => {
                        setSetupError(null);
                        setInstallProgress(0);
                        setStep(accountTier === "team" ? 7 : 7);
                      }}
                      className="wizard-button w-full"
                    >
                      Go Back
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ProgressItem
                      label={accountTier === "team" ? "Connecting to team server" : "Validating credentials"}
                      done={installProgress > 20}
                    />
                    <ProgressItem
                      label={accountTier === "team"
                        ? "Loading team configuration"
                        : connectionMethod === "gateway" ? "Checking Gateway connection" : "Connecting to provider"}
                      done={installProgress > 40}
                    />
                    <ProgressItem
                      label={accountTier === "team"
                        ? "Preparing workspace"
                        : connectionMethod === "gateway" ? "Testing authentication" : "Configuring engine"}
                      done={installProgress > 65}
                    />
                    <ProgressItem
                      label="Ready!"
                      done={installProgress >= 100}
                    />
                    <div className="mt-3">
                      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(installProgress, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-surface-400 mb-1 block">{label}</label>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-xs text-surface-500 mt-0.5">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function ProgressItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`transition-colors ${done ? "text-green-400" : "text-surface-500"}`}
      >
        {done ? "+" : "-"}
      </span>
      <span
        className={`transition-colors ${done ? "text-surface-100" : "text-surface-500"}`}
      >
        {label}
      </span>
    </div>
  );
}
