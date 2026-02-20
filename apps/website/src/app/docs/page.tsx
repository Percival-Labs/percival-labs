import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Terminal,
  FolderTree,
  Puzzle,
  Activity,
  Brain,
  Shield,
  ExternalLink,
  Clock,
  Copy,
} from "lucide-react";

export const metadata = {
  title: "Documentation",
  description:
    "Get started with Engram in under 5 minutes. Installation, first skill, and everything you need to build your personal AI infrastructure.",
};

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-pl-border bg-pl-surface px-4 py-1.5 text-xs font-medium text-pl-text-muted mb-6">
          <BookOpen className="h-3.5 w-3.5 text-pl-cyan" />
          Documentation
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl leading-tight">
          Get started in 5 minutes
        </h1>
        <p className="mt-6 text-lg text-pl-text-secondary leading-relaxed max-w-2xl mx-auto">
          From zero to a working Engram with skills, hooks, and persistent
          memory. No prior AI experience required.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Start                                                        */
/* ------------------------------------------------------------------ */
function QuickStart() {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-pl-text mb-8">Quick Start</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pl-cyan/10 text-sm font-bold text-pl-cyan">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-pl-text">
                Install prerequisites
              </h3>
              <p className="mt-1 text-sm text-pl-text-muted">
                You&apos;ll need{" "}
                <a
                  href="https://bun.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pl-cyan hover:underline"
                >
                  Bun
                </a>{" "}
                and an AI coding tool (Claude Code, Cursor, etc.).
              </p>
              <div className="mt-3 rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
                <pre className="text-sm text-pl-text-muted font-mono">
                  <span className="text-pl-text-dim">$</span> curl -fsSL
                  https://bun.sh/install | bash
                </pre>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pl-cyan/10 text-sm font-bold text-pl-cyan">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-pl-text">
                Initialize your Engram
              </h3>
              <p className="mt-1 text-sm text-pl-text-muted">
                The interactive setup asks a few questions and generates your
                full infrastructure.
              </p>
              <div className="mt-3 rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
                <pre className="text-sm text-pl-text-muted font-mono whitespace-pre-wrap">{`$ bunx pai init

  Welcome to PAI Framework!

  What's your AI's name? Percy
  Your name? Alex
  Personality preset? (professional / friendly / minimal) friendly

  ✓ Created CLAUDE.md
  ✓ Created context.md
  ✓ Created settings.json
  ✓ Created constitution.md
  ✓ Installed 3 starter skills
  ✓ Installed 5 starter hooks

  Your Engram is ready. Start a conversation with your AI.`}</pre>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pl-cyan/10 text-sm font-bold text-pl-cyan">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-pl-text">
                Start using it
              </h3>
              <p className="mt-1 text-sm text-pl-text-muted">
                Open your AI coding tool and start talking. Skills activate
                automatically based on what you say.
              </p>
              <div className="mt-3 rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
                <pre className="text-sm text-pl-text-muted font-mono whitespace-pre-wrap">{`You: "Research the latest trends in renewable energy"
→ Research skill activates → DeepDive workflow
→ Multi-source research with citations
→ Summary saved to memory

You: "Reflect on what we did today"
→ Reflect skill activates → ExtractLearnings workflow
→ Key insights saved to MEMORY.md`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Directory Structure                                                */
/* ------------------------------------------------------------------ */
function DirectoryStructure() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex items-center gap-3 mb-6">
          <FolderTree className="h-5 w-5 text-pl-cyan" />
          <h2 className="text-2xl font-bold text-pl-text">
            What gets created
          </h2>
        </div>

        <p className="text-sm text-pl-text-muted mb-6">
          After <code className="text-pl-cyan">pai init</code>, your home
          directory gets this structure. Everything is plain files you can read
          and edit.
        </p>

        <div className="rounded-xl bg-pl-bg border border-pl-border px-5 py-4">
          <pre className="text-sm text-pl-text-secondary font-mono leading-relaxed whitespace-pre">{`~/.claude/
├── CLAUDE.md              # Global config: skills registry, preferences
├── settings.json          # Hooks, permissions, env vars
├── context.md             # Who you are, your goals, your projects
├── constitution.md        # Your AI's values and operating principles
│
├── skills/                # Installed skills
│   ├── Research/
│   │   ├── SKILL.md
│   │   └── Workflows/
│   │       ├── DeepDive.md
│   │       └── QuickScan.md
│   ├── DoWork/
│   │   ├── SKILL.md
│   │   └── Workflows/
│   │       ├── Capture.md
│   │       └── WorkLoop.md
│   └── Reflect/
│       ├── SKILL.md
│       └── Workflows/
│           └── ExtractLearnings.md
│
├── hooks/                 # Lifecycle hooks
│   ├── load-context.ts
│   ├── security-validator.ts
│   ├── session-summary.ts
│   ├── event-capture.ts
│   └── greeting.ts
│
└── memory/                # Cross-session persistence
    └── MEMORY.md          # Auto-updated learnings`}</pre>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Starter Skills                                                     */
/* ------------------------------------------------------------------ */
const starterSkills = [
  {
    name: "Research",
    icon: BookOpen,
    trigger: '"Research the latest..."',
    description:
      "Multi-source web research with synthesis and citations. DeepDive for thorough analysis, QuickScan for fast overviews.",
  },
  {
    name: "DoWork",
    icon: Terminal,
    trigger: '"Work on the next task"',
    description:
      "Queue-based task management. Capture tasks, work through them in order, track status automatically.",
  },
  {
    name: "Reflect",
    icon: Brain,
    trigger: '"Reflect on today\'s session"',
    description:
      "Extract learnings, patterns, and insights from your work. Auto-updates MEMORY.md with confirmed patterns.",
  },
  {
    name: "HelloWorld",
    icon: Puzzle,
    trigger: '"Run hello world"',
    description:
      "Tutorial skill showing the simplest possible structure. Use as a template when creating your own skills.",
  },
];

function StarterSkillsSection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex items-center gap-3 mb-2">
          <Puzzle className="h-5 w-5 text-pl-green" />
          <h2 className="text-2xl font-bold text-pl-text">Starter Skills</h2>
        </div>
        <p className="text-sm text-pl-text-muted mb-8">
          Every Engram comes with four skills out of the box. They activate
          automatically when you say the right thing.
        </p>

        <div className="space-y-4">
          {starterSkills.map((skill) => {
            const Icon = skill.icon;
            return (
              <div
                key={skill.name}
                className="rounded-xl border border-pl-border bg-pl-surface p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-pl-cyan" />
                    <h3 className="text-base font-semibold text-pl-text">
                      {skill.name}
                    </h3>
                  </div>
                  <code className="text-xs text-pl-text-dim bg-pl-bg px-2 py-1 rounded border border-pl-border">
                    {skill.trigger}
                  </code>
                </div>
                <p className="mt-2 text-sm text-pl-text-muted">
                  {skill.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Starter Hooks                                                      */
/* ------------------------------------------------------------------ */
const starterHooks = [
  {
    name: "LoadContext",
    event: "SessionStart",
    description: "Loads your context.md and project config at the start of every conversation",
  },
  {
    name: "SecurityValidator",
    event: "PreToolUse",
    description: "Blocks dangerous commands, prevents secret exposure, enforces tool-level access control",
  },
  {
    name: "SessionSummary",
    event: "Stop",
    description: "Summarizes what happened and saves key decisions to memory when a session ends",
  },
  {
    name: "EventCapture",
    event: "PostToolUse",
    description: "Logs all tool executions to an immutable audit trail for debugging and review",
  },
  {
    name: "Greeting",
    event: "SessionStart",
    description: "Shows your AI's name, current project, and status when a new conversation starts",
  },
];

function StarterHooksSection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-5 w-5 text-pl-amber" />
          <h2 className="text-2xl font-bold text-pl-text">Starter Hooks</h2>
        </div>
        <p className="text-sm text-pl-text-muted mb-8">
          Five hooks that make your AI observable and secure from day one.
        </p>

        <div className="overflow-x-auto rounded-xl border border-pl-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border bg-pl-surface">
                <th className="text-left px-4 py-3 text-pl-text-muted font-medium">
                  Hook
                </th>
                <th className="text-left px-4 py-3 text-pl-text-muted font-medium">
                  Event
                </th>
                <th className="text-left px-4 py-3 text-pl-text-muted font-medium">
                  What it does
                </th>
              </tr>
            </thead>
            <tbody>
              {starterHooks.map((hook) => (
                <tr
                  key={hook.name}
                  className="border-b border-pl-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-pl-text">
                    {hook.name}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-pl-amber bg-pl-amber/10 px-1.5 py-0.5 rounded">
                      {hook.event}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-pl-text-muted">
                    {hook.description}
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
/*  CLI Commands                                                       */
/* ------------------------------------------------------------------ */
const commands = [
  {
    command: "pai init",
    description: "Initialize a new Engram with interactive setup",
  },
  {
    command: "pai skill create <name>",
    description: "Scaffold a new skill with SKILL.md and Workflows/",
  },
  {
    command: "pai skill index",
    description: "Rebuild the skill registry in CLAUDE.md",
  },
  {
    command: "pai skill lint",
    description: "Validate all skills against the spec",
  },
  {
    command: "pai status",
    description: "Show current Engram status: skills, hooks, memory",
  },
];

function CLISection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="h-5 w-5 text-pl-cyan" />
          <h2 className="text-2xl font-bold text-pl-text">CLI Reference</h2>
        </div>
        <p className="text-sm text-pl-text-muted mb-8">
          The <code className="text-pl-cyan">pai</code> CLI manages your Engram
          from the terminal.
        </p>

        <div className="space-y-3">
          {commands.map((cmd) => (
            <div
              key={cmd.command}
              className="flex items-start gap-4 rounded-lg bg-pl-bg border border-pl-border px-4 py-3"
            >
              <code className="text-sm font-mono text-pl-cyan whitespace-nowrap">
                {cmd.command}
              </code>
              <p className="text-sm text-pl-text-muted">{cmd.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Your First Skill                                            */
/* ------------------------------------------------------------------ */
function CreateSkillSection() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-pl-text mb-2">
          Create your first skill
        </h2>
        <p className="text-sm text-pl-text-muted mb-8">
          Skills are just folders with markdown files. Here&apos;s how to make
          one from scratch.
        </p>

        <div className="space-y-6">
          <div className="rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
            <p className="text-xs font-medium text-pl-text-dim mb-2">
              1. Scaffold it
            </p>
            <pre className="text-sm text-pl-text-muted font-mono">
              <span className="text-pl-text-dim">$</span> pai skill create
              DailyBrief
            </pre>
          </div>

          <div className="rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
            <p className="text-xs font-medium text-pl-text-dim mb-2">
              2. Edit the SKILL.md
            </p>
            <pre className="text-sm text-pl-text-muted font-mono whitespace-pre-wrap leading-relaxed">{`---
name: DailyBrief
description: Generate a daily briefing. USE WHEN user asks
  for a daily summary, morning brief, or status update.
---

# DailyBrief

Generates a personalized daily briefing based on your
context, calendar, and current projects.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Generate** | "daily brief" | Workflows/Generate.md |

## Examples

**Morning briefing**
User: "Give me my daily brief"
→ Reads context.md for active projects
→ Checks recent memory for yesterday's progress
→ Generates prioritized briefing`}</pre>
          </div>

          <div className="rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
            <p className="text-xs font-medium text-pl-text-dim mb-2">
              3. Write the workflow
            </p>
            <pre className="text-sm text-pl-text-muted font-mono whitespace-pre-wrap leading-relaxed">{`# Generate Workflow

## Steps

1. Read context.md for current projects and goals
2. Read MEMORY.md for recent session activity
3. Check for any deadlines or milestones this week
4. Generate a prioritized brief:
   - Top 3 priorities for today
   - Yesterday's progress
   - Upcoming deadlines
   - Suggested focus areas`}</pre>
          </div>

          <div className="rounded-lg bg-pl-bg border border-pl-border px-4 py-3">
            <p className="text-xs font-medium text-pl-text-dim mb-2">
              4. Register and verify
            </p>
            <pre className="text-sm text-pl-text-muted font-mono whitespace-pre-wrap">{`$ pai skill index    # Updates CLAUDE.md registry
$ pai skill lint     # Validates structure

✓ DailyBrief: valid
  - SKILL.md: frontmatter OK, routing table OK
  - Workflows/Generate.md: found
  - Registered in CLAUDE.md`}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Next Steps / CTA                                                   */
/* ------------------------------------------------------------------ */
function NextSteps() {
  return (
    <section className="py-16 sm:py-20 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-pl-text mb-8 text-center">
          What&apos;s next?
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/how-it-works"
            className="rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan transition-colors group"
          >
            <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
              How It Works
            </h3>
            <p className="mt-1 text-sm text-pl-text-muted">
              Deep dive into the 5-layer architecture
            </p>
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan transition-colors group"
          >
            <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
              Pricing
            </h3>
            <p className="mt-1 text-sm text-pl-text-muted">
              Free tier, Engram, and hosted options
            </p>
          </Link>

          <Link
            href="/setup"
            className="rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan transition-colors group"
          >
            <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
              Setup Wizard
            </h3>
            <p className="mt-1 text-sm text-pl-text-muted">
              Guided setup with skill recommendations
            </p>
          </Link>

          <a
            href="https://github.com/percivallabs/pai-framework"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-pl-border bg-pl-surface p-5 hover:border-pl-cyan transition-colors group"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
                GitHub
              </h3>
              <ExternalLink className="h-3.5 w-3.5 text-pl-text-dim" />
            </div>
            <p className="mt-1 text-sm text-pl-text-muted">
              Source code, specs, and contribution guide
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DocsPage() {
  return (
    <>
      <Hero />
      <QuickStart />
      <DirectoryStructure />
      <StarterSkillsSection />
      <StarterHooksSection />
      <CLISection />
      <CreateSkillSection />
      <NextSteps />
    </>
  );
}
