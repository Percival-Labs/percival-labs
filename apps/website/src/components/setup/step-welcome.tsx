"use client";

import { User } from "lucide-react";

interface StepWelcomeProps {
  data: { name: string; role: string; location: string };
  onUpdate: (fields: Partial<StepWelcomeProps["data"]>) => void;
}

export function StepWelcome({ data, onUpdate }: StepWelcomeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pl-cyan/10 mb-2">
          <User className="h-6 w-6 text-pl-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-pl-text">
          Let&apos;s build your Engram
        </h2>
        <p className="text-pl-text-muted text-sm">
          Your personal AI infrastructure starts here. Just a few quick
          questions.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-pl-text-secondary mb-1.5"
          >
            What&apos;s your name? <span className="text-pl-red">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={data.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Alex"
            className="w-full rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-pl-text-secondary mb-1.5"
          >
            What do you do? <span className="text-pl-red">*</span>
          </label>
          <input
            id="role"
            type="text"
            value={data.role}
            onChange={(e) => onUpdate({ role: e.target.value })}
            placeholder="e.g. Freelance designer, teacher, founder..."
            className="w-full rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-pl-text-secondary mb-1.5"
          >
            Where are you based?{" "}
            <span className="text-pl-text-dim">(optional)</span>
          </label>
          <input
            id="location"
            type="text"
            value={data.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="e.g. Portland, OR"
            className="w-full rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
