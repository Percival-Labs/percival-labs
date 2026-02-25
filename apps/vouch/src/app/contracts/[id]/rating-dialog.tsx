"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, AlertCircle } from "lucide-react";

const API_BASE = "/api/vouch";

interface RatingDialogProps {
  contractId: string;
  role: "customer" | "agent";
}

export function RatingDialog({ contractId, role }: RatingDialogProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none text-sm";

  async function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role,
            rating,
            review: review.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `API error: ${res.status}`);
      }

      router.refresh();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        <Star className="h-3.5 w-3.5" />
        Leave Rating
      </button>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <div className="space-y-3">
      {/* Star selector */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starValue = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setRating(starValue)}
              onMouseEnter={() => setHoveredRating(starValue)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5 transition-colors"
            >
              <Star
                className={`h-5 w-5 ${
                  starValue <= displayRating
                    ? "text-amber-400 fill-amber-400"
                    : "text-pl-border"
                }`}
              />
            </button>
          );
        })}
        {displayRating > 0 && (
          <span className="ml-2 text-sm font-bold text-pl-text">
            {displayRating}/5
          </span>
        )}
      </div>

      {/* Review text */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a review (optional)..."
        rows={2}
        className={`${inputClass} resize-none`}
      />

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || rating < 1}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Star className="h-3.5 w-3.5" />
          )}
          Submit Rating
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setRating(0);
            setReview("");
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-pl-surface px-3 py-1.5 text-xs font-medium text-pl-text-dim hover:text-pl-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
