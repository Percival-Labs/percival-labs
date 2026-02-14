"use client";

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 text-pl-green">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">
          You are on the list. We will be in touch.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mx-auto"
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
        className="w-full flex-1 rounded-lg border border-pl-border bg-pl-surface px-4 py-3 text-sm text-pl-text placeholder:text-pl-text-dim focus:outline-none focus:ring-2 focus:ring-pl-cyan/50 focus:border-pl-cyan transition-colors"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center gap-2 rounded-lg bg-pl-cyan px-6 py-3 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
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
  );
}
