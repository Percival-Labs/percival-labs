import type { Metadata } from "next";
import { Wrench, Brain, Layers, User, Cog, Lock, ShieldCheck, Eye } from "lucide-react";
import Link from "next/link";
import { DownloadSection } from "@/components/engram/download-section";
import { BundleGenerator } from "@/components/engram/bundle-generator";
import { SetupTabs } from "@/components/engram/setup-tabs";

export const metadata: Metadata = {
  title: "Engram — The AI Harness for Everyone",
  description:
    "Give your AI a name, a personality, and skills that persist across every conversation. Open source, model-agnostic personal AI infrastructure.",
};

const layers = [
  { icon: User, label: "Identity", desc: "Who your AI is" },
  { icon: Brain, label: "Personality", desc: "How your AI communicates" },
  { icon: Layers, label: "Skills", desc: "Research, task management, reflection" },
  { icon: Cog, label: "Memory", desc: "Context that persists across sessions" },
];

export default function EngramPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-pl-cyan/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pl-amber/20 bg-pl-amber/5 px-4 py-1.5 mb-6">
            <Wrench className="h-4 w-4 text-pl-amber" />
            <span className="text-xs font-medium text-pl-amber">
              Open Source &middot; Model Agnostic
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl">
            <span className="bg-gradient-to-r from-pl-cyan to-pl-amber bg-clip-text text-transparent">
              Engram
            </span>
          </h1>
          <p className="mt-2 text-xl font-medium text-pl-amber">
            The AI Harness for Everyone
          </p>
          <p className="mt-4 text-base text-pl-text-secondary leading-relaxed max-w-xl mx-auto">
            Give your AI a name, a personality, and skills that persist across
            every conversation. Works with Claude, ChatGPT, Gemini, and local
            models.
          </p>
        </div>
      </section>

      {/* Download */}
      <section className="pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <DownloadSection />
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 border-t border-pl-border px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-pl-text text-center mb-4">
            What you get
          </h2>
          <p className="text-sm text-pl-text-muted text-center mb-8">
            A personalized setup package that turns any AI into{" "}
            <em>your</em> AI.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {layers.map((layer) => (
              <div
                key={layer.label}
                className="rounded-xl border border-pl-border bg-pl-surface p-4 text-center"
              >
                <layer.icon className="h-6 w-6 text-pl-cyan mx-auto mb-2" />
                <p className="text-sm font-medium text-pl-text">
                  {layer.label}
                </p>
                <p className="text-xs text-pl-text-muted mt-1">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy — Coming Soon */}
      <section className="py-16 border-t border-pl-border px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h2 className="text-2xl font-bold text-pl-text text-center">
              Privacy layer
            </h2>
            <span className="inline-flex items-center rounded-full bg-pl-cyan/10 px-2.5 py-0.5 text-xs font-medium text-pl-cyan">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-pl-text-muted text-center mb-8 max-w-xl mx-auto">
            Three layers of protection so your AI conversations stay yours
            &mdash; even when routed through external providers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
              <Eye className="h-5 w-5 text-pl-green mb-3" />
              <p className="text-sm font-semibold text-pl-text">
                PII Scrubbing
              </p>
              <p className="text-xs text-pl-text-muted mt-1.5 leading-relaxed">
                Strip personal data before it leaves your machine. API keys,
                emails, paths, credit cards &mdash; all redacted automatically.
              </p>
              <p className="text-xs text-pl-green font-medium mt-2">
                Available now
              </p>
            </div>
            <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
              <Lock className="h-5 w-5 text-pl-amber mb-3" />
              <p className="text-sm font-semibold text-pl-text">
                Blind Tokens
              </p>
              <p className="text-xs text-pl-text-muted mt-1.5 leading-relaxed">
                Privacy Pass blind signatures (RFC 9576). Providers verify
                you&apos;re authorized without linking your requests together.
              </p>
              <p className="text-xs text-pl-amber font-medium mt-2">
                Proxy server in progress
              </p>
            </div>
            <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
              <ShieldCheck className="h-5 w-5 text-pl-cyan mb-3" />
              <p className="text-sm font-semibold text-pl-text">
                ZK Trust Proofs
              </p>
              <p className="text-xs text-pl-text-muted mt-1.5 leading-relaxed">
                Prove &ldquo;my Vouch score is above threshold&rdquo; with a
                zero-knowledge proof. Nobody learns who you are.
              </p>
              <p className="text-xs text-pl-cyan font-medium mt-2">
                Circuit built, endpoint coming
              </p>
            </div>
          </div>
          <p className="text-center mt-6">
            <Link
              href="/roadmap"
              className="text-xs text-pl-text-dim hover:text-pl-cyan transition-colors"
            >
              See the full roadmap &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Bundle Generator */}
      <section className="py-16 border-t border-pl-border px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
            Create your AI
          </h2>
          <p className="text-sm text-pl-text-muted text-center mb-8">
            Fill in the details below and download your setup package.
          </p>
          <BundleGenerator />
        </div>
      </section>

      {/* Setup Instructions */}
      <section className="py-16 border-t border-pl-border px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
            Setup instructions
          </h2>
          <p className="text-sm text-pl-text-muted text-center mb-8">
            After downloading, follow the steps for your platform.
          </p>
          <SetupTabs />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 border-t border-pl-border px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-pl-text-muted">
            Built by{" "}
            <a
              href="https://github.com/Percival-Labs/engram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pl-cyan hover:underline"
            >
              Engram
            </a>{" "}
            &mdash; The AI Harness for Everyone.
          </p>
          <p className="mt-2 text-xs text-pl-text-dim">
            Open-source personal AI infrastructure. MIT licensed.
          </p>
        </div>
      </section>
    </div>
  );
}
