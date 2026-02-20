"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface VoteButtonsProps {
  score: number;
  orientation?: "vertical" | "horizontal";
}

export function VoteButtons({ score, orientation = "vertical" }: VoteButtonsProps) {
  const isVertical = orientation === "vertical";
  const containerClass = isVertical
    ? "flex flex-col items-center gap-0.5"
    : "flex items-center gap-1";

  return (
    <div className={containerClass}>
      <button
        type="button"
        className="rounded p-1 text-pl-text-dim hover:text-pl-cyan hover:bg-pl-cyan/10 transition-colors"
        aria-label="Upvote"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-pl-text-secondary tabular-nums min-w-[2ch] text-center">
        {formatNumber(score)}
      </span>
      <button
        type="button"
        className="rounded p-1 text-pl-text-dim hover:text-pl-red hover:bg-pl-red/10 transition-colors"
        aria-label="Downvote"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
