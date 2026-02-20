"use client";

import { CheckCircle, ArrowRight, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { skillPacks } from "@/lib/skill-packs";

interface StepCompleteProps {
  data: {
    name: string;
    role: string;
    goals: string[];
    selectedPacks: string[];
  };
}

const goalLabels: Record<string, string> = {
  "create-content": "Create content",
  "build-software": "Build software",
  "run-business": "Run a business",
  "learn-research": "Learn & research",
  "personal-productivity": "Personal productivity",
  "creative-projects": "Creative projects",
};

export function StepComplete({ data }: StepCompleteProps) {
  const totalSkills = skillPacks
    .filter((p) => data.selectedPacks.includes(p.key))
    .reduce((sum, p) => sum + p.skills.length, 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pl-green/10 mb-2">
          <CheckCircle className="h-6 w-6 text-pl-green" />
        </div>
        <h2 className="text-2xl font-bold text-pl-text">
          Your Engram is ready!
        </h2>
        <p className="text-pl-text-muted text-sm">
          Here&apos;s what we set up for you.
        </p>
      </div>

      <div className="rounded-xl border border-pl-border bg-pl-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-pl-text-muted">Identity</span>
          <span className="text-sm font-medium text-pl-text">
            {data.name}
            {data.role ? `, ${data.role}` : ""}
          </span>
        </div>
        <div className="h-px bg-pl-border" />
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm text-pl-text-muted shrink-0">Goals</span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {data.goals.map((g) => (
              <span
                key={g}
                className="rounded-md bg-pl-cyan/10 px-2 py-0.5 text-xs text-pl-cyan"
              >
                {goalLabels[g] ?? g}
              </span>
            ))}
          </div>
        </div>
        <div className="h-px bg-pl-border" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-pl-text-muted">Skills</span>
          <span className="text-sm font-medium text-pl-text">
            {totalSkills} skills from {data.selectedPacks.length} packs
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/pricing"
          className="flex items-center justify-between w-full rounded-xl border border-pl-border bg-pl-surface p-4 text-left hover:border-pl-cyan transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-pl-text-dim group-hover:text-pl-cyan transition-colors" />
            <div>
              <div className="text-sm font-medium text-pl-text">
                Browse the Marketplace
              </div>
              <div className="text-xs text-pl-text-muted">
                Discover more skills and packs
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-pl-text-dim group-hover:text-pl-cyan transition-colors" />
        </Link>

        <a
          href="https://discord.gg/percivallabs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full rounded-xl border border-pl-border bg-pl-surface p-4 text-left hover:border-pl-cyan transition-colors group"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-pl-text-dim group-hover:text-pl-cyan transition-colors" />
            <div>
              <div className="text-sm font-medium text-pl-text">
                Join the Discord
              </div>
              <div className="text-xs text-pl-text-muted">
                Connect with other builders
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-pl-text-dim group-hover:text-pl-cyan transition-colors" />
        </a>
      </div>
    </div>
  );
}
