"use client";

import {
  Pen,
  Code,
  Briefcase,
  Search,
  Zap,
  Palette,
  Target,
} from "lucide-react";

const goalOptions = [
  {
    key: "create-content",
    label: "Create content",
    description: "Writing, video, social media",
    icon: Pen,
  },
  {
    key: "build-software",
    label: "Build software",
    description: "Coding, automation, APIs",
    icon: Code,
  },
  {
    key: "run-business",
    label: "Run a business",
    description: "Marketing, operations, finance",
    icon: Briefcase,
  },
  {
    key: "learn-research",
    label: "Learn & research",
    description: "Education, analysis, deep dives",
    icon: Search,
  },
  {
    key: "personal-productivity",
    label: "Personal productivity",
    description: "Organization, planning, task management",
    icon: Zap,
  },
  {
    key: "creative-projects",
    label: "Creative projects",
    description: "Art, music, game design, worldbuilding",
    icon: Palette,
  },
];

interface StepGoalsProps {
  data: { goals: string[]; goalFreeText: string };
  onUpdate: (fields: Partial<StepGoalsProps["data"]>) => void;
}

export function StepGoals({ data, onUpdate }: StepGoalsProps) {
  function toggleGoal(key: string) {
    const goals = data.goals.includes(key)
      ? data.goals.filter((g) => g !== key)
      : [...data.goals, key];
    onUpdate({ goals });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pl-cyan/10 mb-2">
          <Target className="h-6 w-6 text-pl-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-pl-text">
          What do you want to do with AI?
        </h2>
        <p className="text-pl-text-muted text-sm">
          Pick as many as you like. This helps us recommend the right skills.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {goalOptions.map((option) => {
          const Icon = option.icon;
          const selected = data.goals.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleGoal(option.key)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-pl-cyan bg-pl-cyan/5"
                  : "border-pl-border bg-pl-surface hover:border-pl-text-dim"
              }`}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 shrink-0 ${selected ? "text-pl-cyan" : "text-pl-text-dim"}`}
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
          htmlFor="goalFreeText"
          className="block text-sm font-medium text-pl-text-secondary mb-1.5"
        >
          Something else?{" "}
          <span className="text-pl-text-dim">(optional)</span>
        </label>
        <input
          id="goalFreeText"
          type="text"
          value={data.goalFreeText}
          onChange={(e) => onUpdate({ goalFreeText: e.target.value })}
          placeholder="Tell us what you're after..."
          className="w-full rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
        />
      </div>
    </div>
  );
}
