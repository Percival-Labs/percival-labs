"use client";

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          data.message || "Something went wrong. Please try again."
        );
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-pl-green/30 bg-pl-green/5 px-6 py-4">
        <CheckCircle className="h-5 w-5 text-pl-green shrink-0" />
        <span className="text-sm font-medium text-pl-green">
          You&apos;re on the list! We&apos;ll reach out soon.
        </span>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch gap-3 w-full"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-pl-cyan px-6 py-3 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              Join Waitlist
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {status === "error" && errorMessage && (
        <div className="mt-3 flex items-center gap-2 text-pl-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
