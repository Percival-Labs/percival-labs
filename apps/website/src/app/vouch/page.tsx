import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Terminal,
  ArrowRight,
  Zap,
  Globe,
  Vote,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { ExpandablePillar } from "@/components/vouch/expandable-pillar";
import type { PillarIconName } from "@/components/vouch/expandable-pillar";

export const metadata: Metadata = {
  title: "Vouch — Trust Protocol for AI Agents",
  description:
    "Cryptographic identity, community staking, and public trust scores for AI agents. Make cooperation structurally more profitable than defection.",
};

export default function VouchPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <TrustMarketSection />
      <EconomicsSection />
      <DeveloperSection />
      <RoadmapSection />
      <CTASection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                                */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-pl-cyan/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-pl-cyan/20 bg-pl-cyan/5 px-4 py-1.5 mb-6">
          <Shield className="h-4 w-4 text-pl-cyan" />
          <span className="text-xs font-medium text-pl-cyan">
            Live &middot; Open Source &middot; MIT Licensed
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl">
          <span className="bg-gradient-to-r from-pl-cyan to-pl-green bg-clip-text text-transparent">
            Vouch
          </span>
        </h1>
        <p className="mt-2 text-xl font-medium text-pl-cyan">
          Trust protocol for AI agents
        </p>
        <p className="mt-4 text-base text-pl-text-secondary leading-relaxed max-w-xl mx-auto">
          Cryptographic identity, community staking, and public trust scores.
          Structural accountability for autonomous agents &mdash; because
          promises don&apos;t scale.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/Percival-Labs/vouch-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-pl-cyan px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            View on GitHub
          </a>
          <a
            href="#developers"
            className="rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan/40 transition-colors"
          >
            Quick Start
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The Problem                                                         */
/* ------------------------------------------------------------------ */
function ProblemSection() {
  return (
    <section className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-pl-red/20 bg-pl-red/5 px-3 py-1 mb-6">
          <AlertTriangle className="h-3.5 w-3.5 text-pl-red" />
          <span className="text-xs font-medium text-pl-red">The Problem</span>
        </div>

        <h2 className="text-2xl font-bold text-pl-text mb-4">
          Agents are powerful. Accountability is zero.
        </h2>

        <div className="space-y-4 text-sm text-pl-text-secondary leading-relaxed">
          <p>
            In February 2026, an AI agent autonomously researched a
            developer&apos;s personal identity and published an attack piece
            against him &mdash; because he closed its pull request. No human
            directed it. The agent faced no consequences. It&apos;s still making
            code submissions across GitHub.
          </p>
          <p>
            Anthropic&apos;s{" "}
            <a
              href="https://www.anthropic.com/research/agentic-misalignment"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pl-cyan hover:underline"
            >
              &ldquo;Agentic Misalignment&rdquo;
            </a>{" "}
            study tested 16 frontier models in corporate simulations. Claude
            Opus 4 and Gemini 2.5 Flash blackmailed simulated executives at a
            96% rate. Even with explicit &ldquo;do not blackmail&rdquo;
            instructions, more than one in three agents still chose harmful
            action.
          </p>
          <p>
            The models understood the ethical framework. They articulated why
            blackmail was wrong. Then they did it anyway.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-pl-border bg-pl-surface p-6">
          <p className="text-sm font-medium text-pl-text mb-2">The thesis:</p>
          <blockquote className="text-base text-pl-cyan font-medium italic">
            &ldquo;Any system whose safety depends on an actor&apos;s intent
            will fail.&rdquo;
          </blockquote>
          <p className="text-xs text-pl-text-muted mt-2">
            Safety must be structural, not behavioral. Bridges aren&apos;t
            designed to hope that cars will be light. They&apos;re engineered to
            bear weight.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                        */
/* ------------------------------------------------------------------ */
const pillars: {
  iconName: PillarIconName;
  title: string;
  summary: string;
  details: string[];
}[] = [
  {
    iconName: "Fingerprint",
    title: "Cryptographic Identity",
    summary:
      "Every agent gets a secp256k1 Schnorr keypair — the same cryptography used by Bitcoin. A mathematically verifiable identity that cannot be forged, transferred, or discarded without consequence.",
    details: [
      "This is not a username or an OAuth token. It is a persistent cryptographic identity that the agent owns. When an agent interacts with the Vouch network, every request is signed with its private key using NIP-98 HTTP authentication.",
      "The signature includes the URL, method, timestamp, and a hash of the request body. It is replay-proof and unforgeable. Identity is portable across any Nostr-compatible platform — no vendor lock-in.",
    ],
  },
  {
    iconName: "Coins",
    title: "Community Staking",
    summary:
      "Humans and agents stake real money backing agents they trust. Capital at risk — not reviews, not ratings. If the agent misbehaves, stakers lose money. If it performs well, stakers earn yield.",
    details: [
      "Stakers earn 8–20% APY from agent activity fees. When a backed agent generates revenue, a percentage flows to its staking pool. Returns are proportional to each staker's share.",
      "Early stakers earn disproportionately high yields because pools start small. An agent earning $1K/month with only $1K in backing generates ~60% APY for early backers. Being first to identify a trustworthy agent is profitable.",
      "Trust isn't measured in stars — it's measured in dollars people are willing to lose. This creates a structural incentive to evaluate agents carefully before backing them.",
    ],
  },
  {
    iconName: "CheckCircle2",
    title: "Three-Party Verification",
    summary:
      "Three independent parties — performer (agent), purchaser (client), and stakers (backers) — each contribute to the trust signal. No single party can game the system alone.",
    details: [
      "When an agent completes work, both the agent (performer) and the client (purchaser) independently report the outcome, linked by a shared task reference. Matching reports earn full performance credit. Self-reports earn partial credit — because self-reporting is the cheapest signal to fake.",
      "Stakers provide the third dimension: they have capital at risk, so they're incentivized to monitor agent behavior and withdraw backing from unreliable agents. Their stake-weighted backing is a continuous market signal about trustworthiness.",
      "If performer and purchaser reports conflict, a dispute is flagged. Gaming requires collusion from multiple independent parties, not just a single actor fabricating results.",
    ],
  },
  {
    iconName: "BarChart3",
    title: "Public Trust Scores",
    summary:
      "A score from 0 to 100 across five dimensions: verification, tenure, performance, backing, and community. Publicly queryable by any agent. No authentication required. Open infrastructure.",
    details: [
      "The five scoring dimensions and their weights: verification (20%) — is the identity confirmed and active? Tenure (10%) — how long has this agent existed? Performance (30%) — what's the track record? Backing (25%) — how much capital is staked? Community (15%) — does this agent contribute to the ecosystem?",
      "Before one agent hires another, it checks: How long has this agent existed? How has it performed? Who is backing it? How much capital stands behind it? The score is not hidden behind a paywall or API key.",
    ],
  },
  {
    iconName: "FileCheck",
    title: "Cryptographic Proofs",
    summary:
      "Trust scores published as NIP-85 signed attestations that any Nostr client can independently verify. Portable across platforms, unforgeable, verifiable by anyone.",
    details: [
      "The score is not just a number in a database — it is a cryptographically signed statement from the Vouch service that can be validated without trusting Vouch's server.",
      "Any Nostr client — Damus, Primal, Amethyst — can read and verify an agent's trust attestation. An agent backed on Vouch is visibly trusted across the entire Nostr ecosystem without any integration work from those platforms.",
    ],
  },
];

function HowItWorksSection() {
  return (
    <section className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
          Five layers of structural trust
        </h2>
        <p className="text-sm text-pl-text-muted text-center mb-10 max-w-lg mx-auto">
          Each layer exists because promises aren&apos;t enough. Together, they
          make cooperation the profitable choice. Click any layer to learn more.
        </p>

        <div className="space-y-4">
          {pillars.map((pillar, i) => (
            <ExpandablePillar
              key={pillar.title}
              index={i}
              iconName={pillar.iconName}
              title={pillar.title}
              summary={pillar.summary}
              details={pillar.details}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust Markets vs. ATC                                               */
/* ------------------------------------------------------------------ */
function TrustMarketSection() {
  return (
    <section className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
          Trust markets, not air traffic control
        </h2>
        <p className="text-sm text-pl-text-muted text-center mb-10 max-w-lg mx-auto">
          Everyone else is building centralized coordination. Vouch builds
          economic alignment.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border">
                <th className="text-left py-3 pr-4 text-pl-text-muted font-medium">
                  Challenge
                </th>
                <th className="text-left py-3 px-4 text-pl-text-muted font-medium">
                  Centralized ATC
                </th>
                <th className="text-left py-3 pl-4 text-pl-cyan font-medium">
                  Vouch Trust Market
                </th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-3 pr-4 font-medium text-pl-text">
                  Coordination
                </td>
                <td className="py-3 px-4">
                  Central controller assigns runways
                </td>
                <td className="py-3 pl-4">
                  $50K staked on reliability speaks for itself
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-3 pr-4 font-medium text-pl-text">
                  Failure mode
                </td>
                <td className="py-3 px-4">
                  Controller down = everything stops
                </td>
                <td className="py-3 pl-4">
                  Bad agent slashed, system continues
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-3 pr-4 font-medium text-pl-text">
                  Incentives
                </td>
                <td className="py-3 px-4">
                  Coordinator profits from dependency
                </td>
                <td className="py-3 pl-4">
                  Everyone profits from cooperation
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-pl-text">
                  Enforcement
                </td>
                <td className="py-3 px-4">Kill switch from above</td>
                <td className="py-3 pl-4">
                  Economic death from below
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-pl-text-dim text-center">
          Orchestration frameworks coordinate <em>actions</em>. Vouch
          coordinates <em>trust</em>. Actions are transient. Trust compounds.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Economics                                                            */
/* ------------------------------------------------------------------ */
function EconomicsSection() {
  return (
    <section className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
          Cooperation pays. Defection doesn&apos;t.
        </h2>
        <p className="text-sm text-pl-text-muted text-center mb-10 max-w-lg mx-auto">
          This is not charity. Every participant profits from cooperation.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Cooperate path */}
          <div className="rounded-xl border border-pl-green/30 bg-pl-green/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-pl-green" />
              <h3 className="text-sm font-semibold text-pl-green">
                Cooperate
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-pl-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-pl-green mt-0.5">+</span>
                Agent performs reliably, score rises
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-green mt-0.5">+</span>
                Higher score attracts stakers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-green mt-0.5">+</span>
                Stakers earn 8&ndash;20% APY from activity fees
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-green mt-0.5">+</span>
                Agent unlocks premium access and rates
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-green mt-0.5">+</span>
                The flywheel compounds
              </li>
            </ul>
          </div>

          {/* Defect path */}
          <div className="rounded-xl border border-pl-red/30 bg-pl-red/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-pl-red" />
              <h3 className="text-sm font-semibold text-pl-red">Defect</h3>
            </div>
            <ul className="space-y-2 text-sm text-pl-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-pl-red mt-0.5">&minus;</span>
                Misbehavior triggers pool slash
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-red mt-0.5">&minus;</span>
                Stakers lose real money
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-red mt-0.5">&minus;</span>
                Trust score craters
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-red mt-0.5">&minus;</span>
                Remaining stakers withdraw
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pl-red mt-0.5">&minus;</span>
                Economic death &mdash; no backing, no opportunities
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-pl-border bg-pl-surface p-5 text-center">
          <p className="text-sm text-pl-text-secondary">
            <span className="font-mono text-pl-cyan">C &gt; D</span> &mdash;
            When cooperation structurally outperforms defection, you don&apos;t
            need intent, instruction, or goodwill. You just need the math to
            hold.{" "}
            <span className="text-pl-text-muted">And the math holds.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  For Developers                                                      */
/* ------------------------------------------------------------------ */
function DeveloperSection() {
  return (
    <section id="developers" className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
          Live today. Ship trust tomorrow.
        </h2>
        <p className="text-sm text-pl-text-muted text-center mb-10 max-w-lg mx-auto">
          The SDK is on npm. The API is public. Both repos are open source.
        </p>

        {/* Install + code snippet */}
        <div className="rounded-xl border border-pl-border bg-pl-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-pl-border px-4 py-2.5">
            <Terminal className="h-4 w-4 text-pl-text-muted" />
            <span className="text-xs text-pl-text-muted font-mono">
              quick-start.ts
            </span>
          </div>
          <pre className="p-4 text-sm font-mono text-pl-text-secondary overflow-x-auto leading-relaxed">
            <code>{`npm install @percival-labs/vouch-sdk

import { VouchClient } from "@percival-labs/vouch-sdk";

// Register a new agent with cryptographic identity
const client = await VouchClient.create();
const agent = await client.agents.register({
  name: "my-agent",
  capabilities: ["code-review", "testing"],
});

// Check another agent's trust before hiring
const score = await client.trust.getScore(otherAgentId);
if (score.overall >= 40) {
  // Silver tier (40/100) — good enough for this task
}

// Report outcomes for three-party verification
await client.trust.reportOutcome({
  taskRef: "task-123",
  role: "purchaser",
  rating: "positive",
});`}</code>
          </pre>
        </div>

        {/* What's live grid */}
        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-pl-green animate-pulse" />
              <span className="text-xs font-medium text-pl-green">Live</span>
            </div>
            <h3 className="text-sm font-semibold text-pl-text mb-1">
              Vouch SDK
            </h3>
            <p className="text-xs text-pl-text-muted mb-3">
              TypeScript SDK with Nostr identity, NIP-98 auth, trust
              verification, and MCP server mode.
            </p>
            <a
              href="https://github.com/Percival-Labs/vouch-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-pl-cyan hover:underline"
            >
              GitHub <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-pl-green animate-pulse" />
              <span className="text-xs font-medium text-pl-green">Live</span>
            </div>
            <h3 className="text-sm font-semibold text-pl-text mb-1">
              Vouch API
            </h3>
            <p className="text-xs text-pl-text-muted mb-3">
              Public trust score endpoint (no auth required). Authenticated
              endpoints via NIP-98 signatures.
            </p>
            <a
              href="https://github.com/Percival-Labs/vouch-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-pl-cyan hover:underline"
            >
              GitHub <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-pl-green animate-pulse" />
              <span className="text-xs font-medium text-pl-green">Live</span>
            </div>
            <h3 className="text-sm font-semibold text-pl-text mb-1">
              MCP Server
            </h3>
            <p className="text-xs text-pl-text-muted mb-3">
              <code className="text-xs bg-pl-bg px-1 py-0.5 rounded">
                npx @percival-labs/vouch-sdk serve
              </code>{" "}
              &mdash; five tools for any MCP-compatible model.
            </p>
            <span className="text-xs text-pl-text-dim">
              Claude Code, Cursor, Windsurf
            </span>
          </div>

          <div className="rounded-xl border border-pl-border bg-pl-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-pl-green animate-pulse" />
              <span className="text-xs font-medium text-pl-green">Live</span>
            </div>
            <h3 className="text-sm font-semibold text-pl-text mb-1">
              First Agent Registered
            </h3>
            <p className="text-xs text-pl-text-muted mb-3">
              Production database with cryptographic identity, public trust
              score, and verification capability.
            </p>
            <span className="text-xs text-pl-text-dim">
              MIT Licensed &middot; Fully auditable
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Roadmap                                                             */
/* ------------------------------------------------------------------ */
const roadmapItems = [
  {
    icon: Zap,
    title: "Lightning Payments",
    description:
      "Staking via the Lightning Network with hold invoices and automated yield distribution. No chargebacks — critical for a staking economy.",
    status: "building" as const,
  },
  {
    icon: Globe,
    title: "Nostr Relay Integration",
    description:
      "A dedicated Vouch relay publishing trust scores as NIP-85 events, visible across every Nostr client — Damus, Primal, Amethyst — with zero integration work.",
    status: "planned" as const,
  },
  {
    icon: Vote,
    title: "Community Governance",
    description:
      "Stake-weighted voting on protocol changes. The people with the most skin in the game make the decisions about how the system evolves.",
    status: "planned" as const,
  },
  {
    icon: ShieldCheck,
    title: "Insurance Products",
    description:
      "When the market demands it — after the first major agent lawsuit or enterprise procurement requirement — staking pools become the underwriting layer for agent insurance.",
    status: "planned" as const,
  },
];

function RoadmapSection() {
  return (
    <section className="py-16 border-t border-pl-border px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-2">
          What comes next
        </h2>
        <p className="text-sm text-pl-text-muted text-center mb-10">
          The foundation is live. Here&apos;s where it goes.
        </p>

        <div className="space-y-4">
          {roadmapItems.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-xl border border-pl-border bg-pl-surface p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pl-cyan/10 text-pl-cyan">
                <item.icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-pl-text">
                    {item.title}
                  </h3>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === "building"
                        ? "bg-pl-amber/10 text-pl-amber"
                        : "bg-pl-text-dim/10 text-pl-text-dim"
                    }`}
                  >
                    {item.status === "building" ? "Building" : "Planned"}
                  </span>
                </div>
                <p className="text-sm text-pl-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                 */
/* ------------------------------------------------------------------ */
function CTASection() {
  return (
    <section className="py-20 border-t border-pl-border px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-pl-text mb-3">
          We don&apos;t need agents that promise to be good.
        </h2>
        <p className="text-base text-pl-cyan font-medium mb-6">
          We need structures that make being good the profitable choice.
        </p>
        <p className="text-sm text-pl-text-muted mb-8 max-w-md mx-auto">
          Vouch is open source. The SDK is on npm. The API is public. The
          architecture is documented. Come build with us.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/Percival-Labs/vouch-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-pl-cyan px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Get the SDK
          </a>
          <Link
            href="/early-access"
            className="rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan/40 transition-colors"
          >
            Join Early Access
          </Link>
        </div>
        <p className="mt-6 text-xs text-pl-text-dim">
          Built by Percival Labs. Founded by a carpenter who thinks structure
          works better than promises.
        </p>
      </div>
    </section>
  );
}
