"use client";

import {
  Pen,
  Code,
  Briefcase,
  Search,
  Zap,
  Palette,
  Package,
} from "lucide-react";
import { skillPacks, type SkillPack } from "@/lib/skill-packs";

const iconMap: Record<string, typeof Pen> = {
  Pen,
  Code,
  Briefcase,
  Search,
  Zap,
  Palette,
};

interface StepSkillsProps {
  data: { selectedPacks: string[] };
  onUpdate: (fields: Partial<StepSkillsProps["data"]>) => void;
}

function PackCard({
  pack,
  selected,
  onToggle,
}: {
  pack: SkillPack;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[pack.icon] ?? Package;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors ${
        selected
          ? "border-pl-cyan bg-pl-cyan/5"
          : "border-pl-border bg-pl-surface hover:border-pl-text-dim"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon
            className={`h-5 w-5 ${selected ? "text-pl-cyan" : "text-pl-text-dim"}`}
          />
          <span
            className={`text-sm font-semibold ${selected ? "text-pl-cyan" : "text-pl-text"}`}
          >
            {pack.name}
          </span>
        </div>
        <div
          className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected ? "border-pl-cyan bg-pl-cyan" : "border-pl-border"
          }`}
        >
          {selected && (
            <svg
              className="h-3 w-3 text-pl-bg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      <p className="text-xs text-pl-text-muted">{pack.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {pack.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-pl-bg px-2 py-0.5 text-xs text-pl-text-dim border border-pl-border"
          >
            {skill}
          </span>
        ))}
      </div>
    </button>
  );
}

export function StepSkills({ data, onUpdate }: StepSkillsProps) {
  function togglePack(key: string) {
    const packs = data.selectedPacks.includes(key)
      ? data.selectedPacks.filter((p) => p !== key)
      : [...data.selectedPacks, key];
    onUpdate({ selectedPacks: packs });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pl-cyan/10 mb-2">
          <Package className="h-6 w-6 text-pl-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-pl-text">
          Your recommended skills
        </h2>
        <p className="text-pl-text-muted text-sm">
          We pre-selected packs based on your goals. Toggle any on or off.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {skillPacks.map((pack) => (
          <PackCard
            key={pack.key}
            pack={pack}
            selected={data.selectedPacks.includes(pack.key)}
            onToggle={() => togglePack(pack.key)}
          />
        ))}
      </div>

      <p className="text-center text-xs text-pl-text-dim">
        You can always add or remove skills later from the marketplace.
      </p>
    </div>
  );
}
