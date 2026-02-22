"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: authError } = await login(email, password);

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-pl-border bg-pl-surface">
            <Shield className="h-6 w-6 text-pl-cyan" />
          </div>
          <h1 className="text-xl font-bold text-pl-text">Sign in to Vouch</h1>
          <p className="text-sm text-pl-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-pl-cyan hover:underline transition-colors"
            >
              Register
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-pl-border bg-pl-surface p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-pl-text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2.5 text-sm text-pl-text placeholder-pl-text-dim outline-none transition-colors focus:border-pl-cyan focus:ring-1 focus:ring-pl-cyan"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-pl-text-secondary"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-pl-border bg-pl-bg px-3 py-2.5 text-sm text-pl-text placeholder-pl-text-dim outline-none transition-colors focus:border-pl-cyan focus:ring-1 focus:ring-pl-cyan"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-pl-red/20 bg-pl-red/10 px-3 py-2.5 text-sm text-pl-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-pl-cyan px-4 py-2.5 text-sm font-semibold text-pl-bg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
