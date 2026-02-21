"use client";

import { type Personality } from "@/lib/engram-templates";

const SLIDERS: { key: keyof Personality; label: string }[] = [
  { key: "humor", label: "Humor" },
  { key: "precision", label: "Precision" },
  { key: "curiosity", label: "Curiosity" },
  { key: "directness", label: "Directness" },
  { key: "excitement", label: "Excitement" },
  { key: "playfulness", label: "Playfulness" },
  { key: "professionalism", label: "Formality" },
];

interface Props {
  userName: string;
  aiName: string;
  personality: Personality;
  onUserNameChange: (v: string) => void;
  onAiNameChange: (v: string) => void;
  onPersonalityChange: (p: Personality) => void;
}

export function PersonalityConfigurator({
  userName,
  aiName,
  personality,
  onUserNameChange,
  onAiNameChange,
  onPersonalityChange,
}: Props) {
  return (
    <div className="rounded-xl border border-pl-border bg-pl-surface p-6 sm:p-8 space-y-6">
      {/* Name inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="engram-user-name"
            className="block text-sm font-medium text-pl-text mb-1.5"
          >
            Your name
          </label>
          <input
            id="engram-user-name"
            type="text"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            placeholder="e.g. Sarah"
            className="w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="engram-ai-name"
            className="block text-sm font-medium text-pl-text mb-1.5"
          >
            Your AI&apos;s name
          </label>
          <input
            id="engram-ai-name"
            type="text"
            value={aiName}
            onChange={(e) => onAiNameChange(e.target.value)}
            placeholder="e.g. Atlas"
            className="w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
          />
        </div>
      </div>

      {/* Personality sliders */}
      <div>
        <p className="text-sm font-medium text-pl-text mb-1">Personality</p>
        <p className="text-xs text-pl-text-muted mb-4">
          Drag the sliders to shape how your AI communicates.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {SLIDERS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="flex justify-between text-xs text-pl-text-muted">
                <span>{label}</span>
                <span className="text-pl-cyan font-semibold tabular-nums">
                  {personality[key]}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={personality[key]}
                onChange={(e) =>
                  onPersonalityChange({
                    ...personality,
                    [key]: parseInt(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-pl-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pl-cyan [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pl-surface [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
