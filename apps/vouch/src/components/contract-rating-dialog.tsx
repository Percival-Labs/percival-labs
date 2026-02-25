"use client";

import { useState } from "react";
import { X, Star, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const API_BASE = "/api/vouch";

type RatingState = "form" | "submitting" | "success" | "error";

interface ContractRatingDialogProps {
  contractId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractRatingDialog({
  contractId,
  onClose,
  onSuccess,
}: ContractRatingDialogProps) {
  const [state, setState] = useState<RatingState>("form");
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");

  async function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/v1/contracts/${contractId}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            rating,
            review: review.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message || `Rating failed: ${res.status}`
        );
      }

      setState("success");
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
      setState("error");
    }
  }

  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-pl-border bg-pl-surface p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-pl-text-dim hover:text-pl-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-pl-text">Rate Contract</h2>
        <p className="mt-1 text-sm text-pl-text-muted">
          How was your experience? Your rating affects trust scores.
        </p>

        {/* Form */}
        {(state === "form" || state === "error") && (
          <div className="mt-5 space-y-4">
            {/* Stars */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex gap-1"
                onMouseLeave={() => setHovered(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hovered || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        setError(null);
                      }}
                      onMouseEnter={() => setHovered(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          filled
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-pl-border"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              {(hovered || rating) > 0 && (
                <span className="text-xs text-pl-text-muted">
                  {starLabels[hovered || rating]}
                </span>
              )}
            </div>

            {/* Review text */}
            <div>
              <label className="text-xs text-pl-text-dim">
                Review (optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-sm text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-pl-border py-2.5 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating < 1}
                className="flex-1 rounded-lg bg-pl-cyan py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Star className="h-4 w-4" />
                Submit Rating
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {state === "submitting" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-pl-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-pl-cyan" />
            <p className="text-sm">Submitting rating...</p>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pl-green/20">
              <CheckCircle className="h-6 w-6 text-pl-green" />
            </div>
            <p className="text-sm font-medium text-pl-green">Rating submitted!</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-pl-border"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
