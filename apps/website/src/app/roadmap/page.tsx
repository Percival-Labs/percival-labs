import Link from "next/link";
import {
  ArrowRight,
  Map,
  CheckCircle,
  Circle,
  Clock,
  Rocket,
  Package,
  Store,
  Users,
  Shield,
  Globe,
} from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata = {
  title: "Roadmap",
  description:
    "See what we're building and when. The PAI Framework roadmap — from open-source spec to skill marketplace to enterprise features.",
};

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-pl-border bg-pl-surface px-4 py-1.5 text-xs font-medium text-pl-text-muted mb-6">
          <Map className="h-3.5 w-3.5 text-pl-cyan" />
          Public Roadmap
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl leading-tight">
          Where we&apos;re going
        </h1>
        <p className="mt-6 text-lg text-pl-text-secondary leading-relaxed max-w-2xl mx-auto">
          Building in the open. Everything on this roadmap is subject to
          community feedback &mdash; your input shapes what we build next.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase Data                                                         */
/* ------------------------------------------------------------------ */
type PhaseStatus = "completed" | "in-progress" | "upcoming";

interface Phase {
  number: number;
  name: string;
  status: PhaseStatus;
  timeline: string;
  icon: typeof Rocket;
  description: string;
  items: { text: string; done: boolean }[];
}

const phases: Phase[] = [
  {
    number: 0,
    name: "Foundation",
    status: "in-progress",
    timeline: "Feb 2026",
    icon: Package,
    description:
      "Extract the PAI Framework specs, build the CLI tool, ship the starter kit to GitHub.",
    items: [
      { text: "5-layer architecture specification", done: true },
      { text: "Skill system spec (SKILL.md format)", done: true },
      { text: "Hook lifecycle spec (6 events)", done: true },
      { text: "CLI tool: pai init", done: false },
      { text: "CLI tool: pai skill create / index / lint", done: false },
      { text: "4 starter skills (Research, DoWork, Reflect, HelloWorld)", done: false },
      { text: "5 starter hooks", done: false },
      { text: "Template files (CLAUDE.md, context.md, etc.)", done: false },
      { text: "Getting started documentation", done: false },
      { text: "GitHub release", done: false },
    ],
  },
  {
    number: 1,
    name: "Skill Marketplace",
    status: "upcoming",
    timeline: "Mar 2026",
    icon: Store,
    description:
      "A marketplace where anyone can browse, install, and share AI skills. Creators set prices, platform handles distribution.",
    items: [
      { text: "Skill package format and validation", done: false },
      { text: "pai skill install <name> command", done: false },
      { text: "pai skill publish command", done: false },
      { text: "Web-based skill browser on percivallabs.com", done: false },
      { text: "Creator profiles and skill ratings", done: false },
      { text: "Revenue sharing (70/30 creator/platform)", done: false },
      { text: "Security scanning for published skills", done: false },
    ],
  },
  {
    number: 2,
    name: "Community & Governance",
    status: "upcoming",
    timeline: "Q2 2026",
    icon: Users,
    description:
      "Build the community infrastructure. Discord, contributor guides, skill quality standards, and governance framework.",
    items: [
      { text: "Discord server with skill channels", done: false },
      { text: "Contributor guide and code of conduct", done: false },
      { text: "Skill quality standards and review process", done: false },
      { text: "Community skill submissions", done: false },
      { text: "Monthly community calls", done: false },
    ],
  },
  {
    number: 3,
    name: "Multi-Agent & Coordination",
    status: "upcoming",
    timeline: "Q2-Q3 2026",
    icon: Shield,
    description:
      "Specs and tools for running multiple AI agents that share context, coordinate work, and maintain trust boundaries.",
    items: [
      { text: "Agent coordination spec", done: false },
      { text: "Shared context with access control", done: false },
      { text: "Zero Trust governance layer", done: false },
      { text: "Agent-to-agent communication protocol", done: false },
      { text: "Trust scoring and permission escalation", done: false },
    ],
  },
  {
    number: 4,
    name: "Hosted Platform",
    status: "upcoming",
    timeline: "Q3-Q4 2026",
    icon: Globe,
    description:
      "Cloud-hosted Engram management. Web dashboard, automatic backups, team features, and enterprise controls.",
    items: [
      { text: "Web dashboard for Engram management", done: false },
      { text: "Cloud backup and sync", done: false },
      { text: "Team Engrams with shared skills", done: false },
      { text: "Usage analytics and insights", done: false },
      { text: "Enterprise SSO and compliance", done: false },
      { text: "API for programmatic Engram management", done: false },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Phase Card                                                         */
/* ------------------------------------------------------------------ */
function statusBadge(status: PhaseStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-pl-green/10 px-2.5 py-0.5 text-xs font-medium text-pl-green">
          <CheckCircle className="h-3 w-3" /> Shipped
        </span>
      );
    case "in-progress":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-pl-cyan/10 px-2.5 py-0.5 text-xs font-medium text-pl-cyan">
          <Clock className="h-3 w-3" /> In Progress
        </span>
      );
    case "upcoming":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-pl-border px-2.5 py-0.5 text-xs font-medium text-pl-text-dim">
          <Circle className="h-3 w-3" /> Upcoming
        </span>
      );
  }
}

function PhaseCard({ phase }: { phase: Phase }) {
  const Icon = phase.icon;
  const doneCount = phase.items.filter((i) => i.done).length;

  return (
    <div className="rounded-2xl border border-pl-border bg-pl-surface/50 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pl-cyan/10">
            <Icon className="h-5 w-5 text-pl-cyan" />
          </div>
          <div>
            <p className="text-xs font-medium text-pl-text-dim uppercase tracking-wide">
              Phase {phase.number} &middot; {phase.timeline}
            </p>
            <h3 className="text-lg font-bold text-pl-text">{phase.name}</h3>
          </div>
        </div>
        {statusBadge(phase.status)}
      </div>

      <p className="text-sm text-pl-text-muted leading-relaxed mb-5">
        {phase.description}
      </p>

      {/* Progress bar */}
      {phase.items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-pl-text-dim mb-1.5">
            <span>Progress</span>
            <span>
              {doneCount}/{phase.items.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-pl-border overflow-hidden">
            <div
              className="h-full rounded-full bg-pl-cyan transition-all"
              style={{
                width: `${(doneCount / phase.items.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {phase.items.map((item) => (
          <li key={item.text} className="flex items-start gap-2.5">
            {item.done ? (
              <CheckCircle className="h-4 w-4 text-pl-green shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-pl-text-dim shrink-0 mt-0.5" />
            )}
            <span
              className={`text-sm ${item.done ? "text-pl-text-muted line-through decoration-pl-text-dim/40" : "text-pl-text-secondary"}`}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phases Section                                                     */
/* ------------------------------------------------------------------ */
function PhasesSection() {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-3xl px-6 space-y-6">
        {phases.map((phase) => (
          <PhaseCard key={phase.number} phase={phase} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Principles                                                         */
/* ------------------------------------------------------------------ */
function Principles() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-8">
          How we decide what to build
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              principle: "C > D",
              detail:
                "Does this make cooperation more rewarding than defection? Open by default.",
            },
            {
              principle: "Ship > Perfect",
              detail:
                "Working software over comprehensive documentation. We iterate in the open.",
            },
            {
              principle: "Transfer > Depend",
              detail:
                "Every feature should teach users to do more, not lock them in.",
            },
            {
              principle: "Community > Roadmap",
              detail:
                "User feedback overrides our plans. If the community needs something, we build it.",
            },
          ].map((p) => (
            <div
              key={p.principle}
              className="rounded-xl border border-pl-border bg-pl-surface p-5"
            >
              <p className="text-sm font-semibold text-pl-cyan">
                {p.principle}
              </p>
              <p className="mt-2 text-sm text-pl-text-muted">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */
function CtaSection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold text-pl-text">
          Shape what we build next
        </h2>
        <p className="mt-4 text-base text-pl-text-muted">
          Join the waitlist to get early access and direct input on the
          roadmap.
        </p>
        <div className="mt-8 max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function RoadmapPage() {
  return (
    <>
      <Hero />
      <PhasesSection />
      <Principles />
      <CtaSection />
    </>
  );
}
