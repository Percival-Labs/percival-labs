import Link from "next/link";
import {
  ArrowRight,
  Settings,
  Activity,
  Puzzle,
  Brain,
  User,
  Layers,
  FileText,
  Terminal,
  Shield,
  Shuffle,
  ChevronDown,
} from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata = {
  title: "How It Works",
  description:
    "The Harness is your personal AI infrastructure layer — five portable layers that survive model changes. Learn how Context, Hooks, Skills, Memory, and Identity work together.",
};

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-pl-cyan/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-pl-border bg-pl-surface px-4 py-1.5 text-xs font-medium text-pl-text-muted mb-6">
          <Layers className="h-3.5 w-3.5 text-pl-cyan" />
          5-Layer Architecture
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl leading-tight">
          How The Harness Works
        </h1>
        <p className="mt-6 text-lg text-pl-text-secondary leading-relaxed max-w-2xl mx-auto">
          Your personal AI infrastructure is five portable layers of plain
          files. When the model underneath changes, your Harness stays the same.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The Analogy                                                        */
/* ------------------------------------------------------------------ */
function AnalogySection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-2xl font-bold text-pl-text sm:text-3xl">
          Think of it like a harness
        </h2>
        <p className="mt-4 text-base text-pl-text-muted max-w-2xl mx-auto leading-relaxed">
          A harness doesn&apos;t generate power. It directs it, safely and
          reliably. You can swap what&apos;s on the other end without
          rebuilding your setup. The Harness does the same for AI &mdash;
          stable infrastructure that makes everything else work.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Models change",
              detail: "GPT-5, Opus 4.6, Gemini 3 — new releases every month",
            },
            {
              label: "Your Harness stays",
              detail:
                "Skills, memory, identity — portable markdown and YAML files",
            },
            {
              label: "Nothing breaks",
              detail:
                "Model updates are firmware upgrades, not system replacements",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-pl-border bg-pl-surface p-5"
            >
              <p className="text-sm font-semibold text-pl-cyan">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-pl-text-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Layer Card Component                                               */
/* ------------------------------------------------------------------ */
interface LayerProps {
  number: number;
  name: string;
  tagline: string;
  description: string;
  icon: typeof Settings;
  color: string;
  details: { label: string; value: string }[];
  example: string;
}

function LayerCard({
  number,
  name,
  tagline,
  description,
  icon: Icon,
  color,
  details,
  example,
}: LayerProps) {
  return (
    <div className="rounded-2xl border border-pl-border bg-pl-surface/50 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-medium text-pl-text-dim uppercase tracking-wide">
            Layer {number}
          </p>
          <h3 className="text-xl font-bold text-pl-text">{name}</h3>
          <p className="text-sm text-pl-text-muted mt-0.5">{tagline}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-pl-text-secondary leading-relaxed">
        {description}
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {details.map((d) => (
          <div
            key={d.label}
            className="rounded-lg bg-pl-bg px-3 py-2.5 border border-pl-border"
          >
            <p className="text-xs font-medium text-pl-text-dim">{d.label}</p>
            <p className="text-sm text-pl-text-secondary mt-0.5">{d.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
        <p className="text-xs font-medium text-pl-text-dim mb-1.5">Example</p>
        <pre className="text-xs text-pl-text-muted font-mono whitespace-pre-wrap leading-relaxed">
          {example}
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Five Layers Section                                                */
/* ------------------------------------------------------------------ */
const layers: LayerProps[] = [
  {
    number: 1,
    name: "Context",
    tagline: "What the AI knows about you and your work",
    description:
      "Persistent configuration that loads automatically every session. Like CSS specificity — global settings are overridden by project settings, which are overridden by task settings. Your AI always starts with full context.",
    icon: Settings,
    color: "#22d3ee",
    details: [
      { label: "Global Config", value: "CLAUDE.md — skills, stack prefs, security rules" },
      { label: "Settings", value: "settings.json — env vars, permissions, hooks" },
      { label: "Project Config", value: ".claude/CLAUDE.md — per-project conventions" },
      { label: "Personal Context", value: "context.md — who you are, your goals, your projects" },
    ],
    example: `# context.md
Name: Alex Chen
Role: Freelance designer
Stack: Figma, React, Tailwind
Current project: Redesigning client portal
Goal: Ship MVP by March`,
  },
  {
    number: 2,
    name: "Hooks",
    tagline: "How the AI's behavior is observed and modified",
    description:
      "Event-driven automation that makes AI behavior observable, auditable, and modifiable. Every action the AI takes fires a lifecycle event that your hooks can intercept — like middleware for your AI.",
    icon: Activity,
    color: "#f59e0b",
    details: [
      { label: "SessionStart", value: "Load context, show greeting when conversation begins" },
      { label: "PreToolUse", value: "Security validation before any tool executes" },
      { label: "PostToolUse", value: "Capture events, extract learnings after actions" },
      { label: "Stop", value: "Summarize session, save memory when conversation ends" },
    ],
    example: `// SecurityValidator hook
// Fires before every tool use
if (tool === "Bash" && command.includes("rm -rf")) {
  return { decision: "block", reason: "Destructive command" };
}`,
  },
  {
    number: 3,
    name: "Skills",
    tagline: "What the AI can do",
    description:
      "Portable, self-contained units of domain expertise. Each skill is a markdown spec with workflows and optional tools. Skills self-activate based on natural language triggers — no memorizing commands.",
    icon: Puzzle,
    color: "#10b981",
    details: [
      { label: "SKILL.md", value: "Frontmatter + routing table + usage examples" },
      { label: "Workflows/", value: "Step-by-step execution procedures in markdown" },
      { label: "Tools/", value: "Optional CLI utilities in TypeScript" },
      { label: "Triggers", value: "Natural language — \"research X\" activates Research skill" },
    ],
    example: `Research/
├── SKILL.md         # "USE WHEN user asks to research a topic"
├── Workflows/
│   ├── DeepDive.md  # Multi-source research workflow
│   └── QuickScan.md # Fast surface-level scan
└── Tools/
    └── source-validator.ts`,
  },
  {
    number: 4,
    name: "Memory",
    tagline: "What the AI remembers across sessions",
    description:
      "Cross-session persistence that makes your AI smarter over time. Project memories, learnings from past mistakes, and session journals — all stored in plain files you can read, edit, or move.",
    icon: Brain,
    color: "#a78bfa",
    details: [
      { label: "Project Memory", value: "Per-project learnings and patterns discovered" },
      { label: "Session Journals", value: "What happened each session, decisions made" },
      { label: "Learnings", value: "Mistakes caught, patterns confirmed, insights extracted" },
      { label: "Auto-Update", value: "Memory files update themselves as you work" },
    ],
    example: `# MEMORY.md
## Key Learnings
- pdfjs-dist v5 breaks SSR — use dynamic imports
- This project uses Tailwind v4 layers — avoid
  global CSS resets that conflict with utilities
- API routes with POST are auto-detected as dynamic`,
  },
  {
    number: 5,
    name: "Identity",
    tagline: "Who the AI is, how it behaves",
    description:
      "Consistent AI behavior defined in plain files. Your AI's personality, values, communication style, and boundaries — all declarative, all portable. Change your AI's personality by editing a YAML file.",
    icon: User,
    color: "#f472b6",
    details: [
      { label: "Constitution", value: "Core values and operating principles" },
      { label: "Personality", value: "Humor, directness, curiosity — tunable knobs" },
      { label: "Voice", value: "How your AI speaks — professional, casual, technical" },
      { label: "Boundaries", value: "What your AI will and won't do" },
    ],
    example: `# personality calibration
personality:
  humor: 60        # dry -> witty
  directness: 80   # diplomatic -> blunt
  curiosity: 90    # focused -> exploratory
  precision: 95    # approximate -> exact`,
  },
];

function LayersSection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-pl-text sm:text-4xl">
            Five layers. All portable.
          </h2>
          <p className="mt-4 text-base text-pl-text-muted max-w-2xl mx-auto">
            Every layer is plain files &mdash; markdown, YAML, TypeScript. You
            can read them, edit them, version them, and move them to any AI
            system.
          </p>
        </div>

        <div className="space-y-6">
          {layers.map((layer) => (
            <LayerCard key={layer.number} {...layer} />
          ))}
        </div>

        {/* Model at the bottom */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-pl-border bg-pl-bg px-6 py-4">
            <Shuffle className="h-5 w-5 text-pl-text-dim" />
            <div>
              <p className="text-sm font-medium text-pl-text-muted">
                Any AI Model
              </p>
              <p className="text-xs text-pl-text-dim">
                Claude, GPT, Gemini, local models — swap freely
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  What It's Not                                                      */
/* ------------------------------------------------------------------ */
function WhatItsNot() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-2xl font-bold text-pl-text text-center sm:text-3xl">
          What The Harness is <span className="text-pl-red">not</span>
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            {
              not: "A new AI model",
              is: "An infrastructure layer that any model plugs into",
            },
            {
              not: "A prompt library",
              is: "A skill system with workflows, tools, and routing",
            },
            {
              not: "A chatbot wrapper",
              is: "A full lifecycle with hooks, memory, and identity",
            },
            {
              not: "An agent framework for developers",
              is: "Infrastructure for everyone — markdown and YAML, not code",
            },
          ].map((item) => (
            <div
              key={item.not}
              className="rounded-xl border border-pl-border bg-pl-surface p-5"
            >
              <p className="text-sm text-pl-red line-through decoration-pl-red/40">
                {item.not}
              </p>
              <p className="mt-2 text-sm text-pl-text-secondary">
                {item.is}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison                                                         */
/* ------------------------------------------------------------------ */
function ComparisonSection() {
  const rows = [
    {
      feature: "Model-agnostic",
      harness: true,
      raw: false,
      frameworks: false,
      platform: false,
    },
    {
      feature: "Non-technical users",
      harness: true,
      raw: false,
      frameworks: false,
      platform: true,
    },
    {
      feature: "Portable skills",
      harness: true,
      raw: false,
      frameworks: false,
      platform: false,
    },
    {
      feature: "Lifecycle hooks",
      harness: true,
      raw: false,
      frameworks: true,
      platform: false,
    },
    {
      feature: "Persistent memory",
      harness: true,
      raw: false,
      frameworks: false,
      platform: false,
    },
    {
      feature: "Identity system",
      harness: true,
      raw: false,
      frameworks: false,
      platform: false,
    },
    {
      feature: "Open source",
      harness: true,
      raw: true,
      frameworks: true,
      platform: false,
    },
    {
      feature: "No vendor lock-in",
      harness: true,
      raw: true,
      frameworks: true,
      platform: false,
    },
  ];

  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-2xl font-bold text-pl-text text-center sm:text-3xl">
          How it compares
        </h2>
        <p className="mt-4 text-sm text-pl-text-muted text-center max-w-xl mx-auto">
          The Harness sits in the gap between raw config files and heavyweight
          developer frameworks.
        </p>

        <div className="mt-10 overflow-x-auto rounded-xl border border-pl-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border bg-pl-surface">
                <th className="text-left px-4 py-3 text-pl-text-muted font-medium">
                  Feature
                </th>
                <th className="px-4 py-3 text-pl-cyan font-semibold">
                  The Harness
                </th>
                <th className="px-4 py-3 text-pl-text-muted font-medium">
                  Raw Config
                </th>
                <th className="px-4 py-3 text-pl-text-muted font-medium">
                  Dev Frameworks
                </th>
                <th className="px-4 py-3 text-pl-text-muted font-medium">
                  Platform Features
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-pl-border last:border-0">
                  <td className="px-4 py-3 text-pl-text-secondary">
                    {row.feature}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.harness ? (
                      <span className="text-pl-green">&#10003;</span>
                    ) : (
                      <span className="text-pl-text-dim">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.raw ? (
                      <span className="text-pl-green">&#10003;</span>
                    ) : (
                      <span className="text-pl-text-dim">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.frameworks ? (
                      <span className="text-pl-green">&#10003;</span>
                    ) : (
                      <span className="text-pl-text-dim">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.platform ? (
                      <span className="text-pl-green">&#10003;</span>
                    ) : (
                      <span className="text-pl-text-dim">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <h2 className="text-3xl font-bold text-pl-text sm:text-4xl">
          Ready to build your Harness?
        </h2>
        <p className="mt-4 text-base text-pl-text-muted">
          Join the waitlist for early access, or start building with the
          open-source spec today.
        </p>

        <div className="mt-8 max-w-md mx-auto">
          <WaitlistForm />
        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-pl-cyan hover:underline"
          >
            Try the Setup Wizard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-pl-text-muted hover:text-pl-cyan transition-colors"
          >
            View Pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function HowItWorksPage() {
  return (
    <>
      <Hero />
      <AnalogySection />
      <LayersSection />
      <WhatItsNot />
      <ComparisonSection />
      <CtaSection />
    </>
  );
}
