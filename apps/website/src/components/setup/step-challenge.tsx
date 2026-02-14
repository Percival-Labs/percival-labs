"use client";

import { Clock, Wrench, Layers, Compass, AlertTriangle } from "lucide-react";

const challengeOptions = [
  {
    key: "not-enough-time",
    label: "Not enough time",
    description: "Need AI to multiply my hours",
    icon: Clock,
  },
  {
    key: "too-technical",
    label: "Too technical",
    description: "Want it to just work without CLI setup",
    icon: Wrench,
  },
  {
    key: "too-many-options",
    label: "Too many options",
    description: "Overwhelmed by tools and models",
    icon: Layers,
  },
  {
    key: "dont-know-where-to-start",
    label: "Don't know where to start",
    description: "Need guidance, not a blank canvas",
    icon: Compass,
  },
];

interface StepChallengeProps {
  data: { challenge: string; challengeFreeText: string };
  onUpdate: (fields: Partial<StepChallengeProps["data"]>) => void;
}

export function StepChallenge({ data, onUpdate }: StepChallengeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pl-amber/10 mb-2">
          <AlertTriangle className="h-6 w-6 text-pl-amber" />
        </div>
        <h2 className="text-2xl font-bold text-pl-text">
          What&apos;s your biggest obstacle?
        </h2>
        <p className="text-pl-text-muted text-sm">
          This helps us tailor your experience from day one.
        </p>
      </div>

      <div className="space-y-3">
        {challengeOptions.map((option) => {
          const Icon = option.icon;
          const selected = data.challenge === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onUpdate({ challenge: option.key })}
              className={`flex items-center gap-3 w-full rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-pl-cyan bg-pl-cyan/5"
                  : "border-pl-border bg-pl-surface hover:border-pl-text-dim"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${selected ? "text-pl-cyan" : "text-pl-text-dim"}`}
              />
              <div>
                <div
                  className={`text-sm font-medium ${selected ? "text-pl-cyan" : "text-pl-text"}`}
                >
                  {option.label}
                </div>
                <div className="text-xs text-pl-text-muted mt-0.5">
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="challengeFreeText"
          className="block text-sm font-medium text-pl-text-secondary mb-1.5"
        >
          Something else?{" "}
          <span className="text-pl-text-dim">(optional)</span>
        </label>
        <input
          id="challengeFreeText"
          type="text"
          value={data.challengeFreeText}
          onChange={(e) => onUpdate({ challengeFreeText: e.target.value })}
          placeholder="Tell us what's in the way..."
          className="w-full rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
        />
      </div>
    </div>
  );
}
