import Link from "next/link";
import { Github, ExternalLink } from "lucide-react";

export const metadata = { title: "Origin Story" };

const timelineEntries = [
  {
    date: "2024",
    title: "Daniel Miessler creates PAI",
    description:
      "The Personal AI Infrastructure framework is born \u2014 an open-source system for giving humans persistent identity, skills, and memory across AI models.",
  },
  {
    date: "Early 2025",
    title: "A carpenter forks the repo",
    description:
      "Alan Carroll, a residential carpenter in Bellingham, WA, discovers PAI. He starts building his own personal AI assistant, Percy, on top of it.",
  },
  {
    date: "Mid 2025",
    title: "167 skills and counting",
    description:
      "What started as a few prompts becomes a full infrastructure. Skills for construction estimating, content creation, code generation, research \u2014 all portable, all model-agnostic.",
  },
  {
    date: "Late 2025",
    title: "The agents come alive",
    description:
      "Percy spawns specialized agents \u2014 Scout for research, Forge for building, Pixel for design. They start collaborating autonomously. The Terrarium is born to watch them work.",
  },
  {
    date: "2026",
    title: "Going public",
    description:
      "Percival Labs launches to make this accessible to everyone. Not as a guru selling secrets, but as a companion showing the path. The same infrastructure Alan built, available to anyone.",
  },
];

export default function OriginPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      {/* Page header */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-pl-text md:text-5xl">
          Origin Story
        </h1>
        <p className="mt-4 text-lg text-pl-text-muted max-w-2xl mx-auto">
          How a carpenter in the Pacific Northwest built a personal AI
          infrastructure and decided to share it with the world.
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-8 max-w-2xl mx-auto">
        {timelineEntries.map((entry, index) => (
          <div
            key={index}
            className="rounded-xl border border-pl-border bg-pl-surface p-6 text-center transition-colors hover:border-pl-cyan/30"
          >
            <span className="text-xs font-mono font-medium text-pl-cyan uppercase tracking-wide">
              {entry.date}
            </span>
            <h3 className="mt-2 text-lg font-semibold text-pl-text">
              {entry.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pl-text-muted">
              {entry.description}
            </p>
          </div>
        ))}
      </div>

      {/* Why We're Transparent */}
      <section className="mt-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-pl-text">
          Why We&apos;re Transparent
        </h2>

        <div className="mt-8 space-y-6 text-pl-text-secondary leading-relaxed max-w-2xl mx-auto">
          <p>
            We believe cooperation must outcompete defection &mdash;
            structurally, not just philosophically. That means open source by
            default, honest pricing, crediting our foundations, and never
            creating dependency.
          </p>
          <p>
            This entire project stands on Daniel Miessler&apos;s PAI framework.
            We didn&apos;t invent the wheel &mdash; we built a truck on it.
          </p>
        </div>

        {/* Miessler repo card */}
        <a
          href="https://github.com/danielmiessler/PAI"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-10 mx-auto flex max-w-lg items-center gap-4 rounded-xl border border-pl-border bg-pl-surface p-6 transition-colors hover:bg-pl-surface-hover hover:border-pl-cyan/40"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-pl-bg border border-pl-border">
            <Github className="h-6 w-6 text-pl-text-muted group-hover:text-pl-cyan transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
              danielmiessler/PAI
            </p>
            <p className="text-xs text-pl-text-muted mt-0.5">
              The Personal AI Infrastructure framework &mdash; the foundation
              Percival Labs is built on.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-pl-text-dim group-hover:text-pl-cyan transition-colors" />
        </a>
      </section>

      {/* Bottom CTA */}
      <section className="mt-24 text-center">
        <p className="text-pl-text-muted mb-6">
          Want to build on the same foundation?
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/early-access"
            className="rounded-lg bg-pl-amber px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Build Your Harness
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan/40 hover:text-pl-cyan transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
