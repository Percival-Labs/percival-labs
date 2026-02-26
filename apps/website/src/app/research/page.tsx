import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowRight, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Published research from Percival Labs on AI trust infrastructure, agent economies, and cooperative systems.",
};

const papers = [
  {
    slug: "digital-institutions-agent-governance",
    title:
      "Economic Bonds and Cryptographic Identity as Digital Institutions for AI Agent Governance",
    type: "Research Paper",
    date: "February 2026",
    id: "",
    summary:
      "Hadfield and Koh identify a foundational gap in AI agent governance: the identity and record-keeping infrastructure for human coordination does not exist for AI agents. We present a working implementation through cryptographic identity, economic bonding, and federated record-keeping — and examine where it meets and falls short of the framework's requirements.",
  },
  {
    slug: "model-provenance-trust-problem",
    title:
      "Model Provenance Is a Trust Problem, Not Just a Capability Problem",
    type: "Analysis",
    date: "February 25, 2026",
    id: "",
    summary:
      "Nate B. Jones argues distillation is a Napster problem with thousand-to-one extraction economics. Distilled models occupy narrower manifolds that break on sustained agentic work — and no benchmark captures it. We extend: if provenance determines how a model breaks, the market needs trust infrastructure to make that verifiable.",
  },
  {
    slug: "agents-of-chaos-economic-accountability",
    title:
      "Economic Accountability as an Architectural Primitive: A Response to \"Agents of Chaos\"",
    type: "Response Paper",
    date: "February 24, 2026",
    id: "",
    summary:
      "38 researchers document 10 security vulnerabilities in autonomous LLM agents. Every one shares a common cause: zero-cost identity, zero-cost action, zero-cost deception. We map each vulnerability to economic trust staking — the missing architectural primitive.",
  },
  {
    slug: "api-trust-layer-distillation",
    title:
      "24,000 Fake Accounts: Why API Keys Can't Stop Model Distillation — And What Can",
    type: "Analysis",
    date: "February 24, 2026",
    id: "",
    summary:
      "Anthropic disclosed that three Chinese AI labs created 24,000 fraudulent accounts for industrial-scale model distillation. Current defenses fail because identity is free and consequences are cheap. Trust staking changes the economics.",
  },
  {
    slug: "mcp-governance-economic-accountability",
    title:
      "Economic Accountability Layer for AI Agent Tool-Use Protocol Governance",
    type: "Defensive Disclosure",
    date: "February 24, 2026",
    id: "PL-DD-2026-002",
    summary:
      "8,600+ tool servers, 41% lack authentication, 30 CVEs in two months. This disclosure establishes prior art for economic staking, community vouching, and behavioral monitoring as a governance layer for AI agent tool-use protocols.",
  },
  {
    slug: "trust-staking-for-ai-inference",
    title:
      "Economic Trust Staking as an Access Control Mechanism for AI Model Inference APIs",
    type: "Defensive Disclosure",
    date: "February 23, 2026",
    id: "PL-DD-2026-001",
    summary:
      "A decentralized economic trust layer that makes industrial-scale model distillation economically unfeasible through staking, community vouching chains, and cascading slashing.",
  },
];

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-pl-text">
          Research
        </h1>
        <p className="mt-3 text-lg text-pl-text-muted">
          Published research and defensive disclosures from Percival Labs.
        </p>
      </div>

      <div className="space-y-6">
        {papers.map((paper) => (
          <Link
            key={paper.slug}
            href={`/research/${paper.slug}`}
            className="block rounded-lg border border-pl-border bg-pl-surface p-6 hover:border-pl-cyan/30 hover:bg-pl-surface-hover transition-all group"
          >
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pl-cyan/20 bg-pl-cyan/5 px-3 py-1 text-xs font-medium text-pl-cyan">
                <FileText className="h-3 w-3" />
                {paper.type}
              </span>
              {paper.id && (
                <span className="text-xs text-pl-text-dim">{paper.id}</span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-pl-text group-hover:text-pl-cyan transition-colors">
              {paper.title}
            </h2>
            <p className="mt-2 text-sm text-pl-text-muted leading-relaxed">
              {paper.summary}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-pl-text-dim">
                <Calendar className="h-3 w-3" />
                {paper.date}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-pl-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                Read
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
