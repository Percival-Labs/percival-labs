"use client";

import { useState } from "react";
import {
  ChevronDown,
  Fingerprint,
  Coins,
  CheckCircle2,
  BarChart3,
  FileCheck,
} from "lucide-react";

const iconMap = {
  Fingerprint,
  Coins,
  CheckCircle2,
  BarChart3,
  FileCheck,
} as const;

export type PillarIconName = keyof typeof iconMap;

interface ExpandablePillarProps {
  index: number;
  iconName: PillarIconName;
  title: string;
  summary: string;
  details: string[];
}

export function ExpandablePillar({
  index,
  iconName,
  title,
  summary,
  details,
}: ExpandablePillarProps) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[iconName];

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-xl border border-pl-border bg-pl-surface p-6 hover:border-pl-cyan/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pl-cyan/10 text-pl-cyan">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-pl-text-dim">
                0{index + 1}
              </span>
              <h3 className="text-sm font-semibold text-pl-text">{title}</h3>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-pl-text-muted transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
          <p className="text-sm text-pl-text-secondary leading-relaxed">
            {summary}
          </p>

          {open && (
            <div className="mt-4 pt-4 border-t border-pl-border/50 space-y-2">
              {details.map((detail, i) => (
                <p
                  key={i}
                  className="text-sm text-pl-text-secondary leading-relaxed"
                >
                  {detail}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
