import { useState, useRef, useEffect } from "react";
import WizardStep from "../components/WizardStep";
import type { EngramConfig } from "../App";

interface WizardProps {
  onComplete: (config: EngramConfig) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  const [connectionMethod, setConnectionMethod] = useState<"gateway" | "byok">(
    "gateway"
  );
  const [apiKey, setApiKey] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [installProgress, setInstallProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step]);

  // Step 7: simulate installation progress
  useEffect(() => {
    if (step !== 7) return;
    const interval = setInterval(() => {
      setInstallProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (installProgress >= 100) {
      const timeout = setTimeout(() => {
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
          },
        });
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [
    installProgress,
    onComplete,
    userName,
    aiName,
    useCase,
    experience,
    personality,
    connectionMethod,
    apiKey,
    agentKey,
  ]);

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

        {/* Step 6: Connection Method */}
        {step >= 6 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                Personality configured
              </div>
            </div>
            <WizardStep prompt="Last thing -- how do you want to connect? You can use our Gateway (easiest) or bring your own API key.">
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
                      onClick={() => setStep(7)}
                      className="wizard-button w-full"
                      disabled={!agentKey.trim()}
                    >
                      Connect
                    </button>
                  </div>
                )}
                {connectionMethod === "byok" && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="wizard-input"
                    />
                    <button
                      onClick={() => setStep(7)}
                      className="wizard-button w-full"
                      disabled={!apiKey.trim()}
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>
            </WizardStep>
          </>
        )}

        {/* Step 7: Installation Progress */}
        {step >= 7 && (
          <>
            <div className="flex justify-end mb-3">
              <div className="chat-bubble-user">
                {connectionMethod === "gateway"
                  ? "Engram Gateway"
                  : "Own API key"}
              </div>
            </div>
            <WizardStep
              prompt={`Setting up ${aiName || "Engram"} for you...`}
              showInput={false}
            >
              <div />
            </WizardStep>
            <div className="flex justify-start">
              <div className="chat-bubble-assistant min-w-[280px]">
                <div className="space-y-2">
                  <ProgressItem
                    label="Initializing engine"
                    done={installProgress > 20}
                  />
                  <ProgressItem
                    label="Loading model configuration"
                    done={installProgress > 40}
                  />
                  <ProgressItem
                    label="Setting up personality"
                    done={installProgress > 60}
                  />
                  <ProgressItem
                    label="Connecting to provider"
                    done={installProgress > 80}
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
