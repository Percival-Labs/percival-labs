import Link from "next/link";
import { Check, Sparkles, Store, Terminal, Cloud, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQAccordion } from "@/components/faq-accordion";

export const metadata = { title: "Pricing" };

interface Tier {
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  badge?: string;
  featured?: boolean;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaStyle: "outline" | "solid" | "muted";
  note: string;
}

const tiers: Tier[] = [
  {
    name: "Engram",
    tagline: "Free, forever",
    price: "$0",
    priceNote: "no limits",
    badge: "Open Source",
    featured: true,
    icon: <Terminal className="h-5 w-5" />,
    features: [
      "Open-source CLI tool",
      "Skills, hooks, memory, MCP server",
      "Bring your own API keys",
      "Works with any model \u2014 Claude, GPT, Gemini, Ollama, and more",
      "Full power, zero limitations",
      "Community support",
    ],
    cta: "Get Started",
    ctaHref: "https://github.com/percival-labs/engram",
    ctaStyle: "solid",
    note: "The full tool. Not a trial. Not a teaser. The real thing.",
  },
  {
    name: "Engram Cloud",
    tagline: "Pay as you go",
    price: "Usage",
    priceNote: "based",
    icon: <Cloud className="h-5 w-5" />,
    features: [
      "Everything in Free, plus:",
      "Built-in billing \u2014 one bill for 200+ models via OpenRouter",
      "Cloud memory sync across devices",
      "Transparent pricing: compute cost + ~5% margin",
      "No subscription \u2014 pay only for what you use",
      "Usage dashboard & cost tracking",
    ],
    cta: "Start Building",
    ctaHref: "/early-access",
    ctaStyle: "outline",
    note: "Same tool, managed billing. We add ~5% to cover infrastructure. That's it.",
  },
  {
    name: "The Lab",
    tagline: "Coming Soon",
    price: "TBD",
    icon: <Users className="h-5 w-5" />,
    features: [
      "Everything in Cloud, plus:",
      "Managed AI agent team",
      "Pre-built skill library",
      "Collaboration & team features",
      "Priority support",
    ],
    cta: "Join Waitlist",
    ctaHref: "/early-access",
    ctaStyle: "muted",
    note: "For teams that want agents working alongside them. Not just a tool \u2014 a team.",
  },
];

interface ComparisonRow {
  feature: string;
  free: boolean | string;
  cloud: boolean | string;
  lab: boolean | string;
}

const comparisonRows: ComparisonRow[] = [
  { feature: "CLI Tool", free: true, cloud: true, lab: true },
  { feature: "Skills, Hooks, Memory", free: true, cloud: true, lab: true },
  { feature: "MCP Server", free: true, cloud: true, lab: true },
  { feature: "Any Model (Claude, GPT, Gemini, Ollama)", free: true, cloud: true, lab: true },
  { feature: "Community Support", free: true, cloud: true, lab: true },
  { feature: "Unified Billing (200+ models)", free: false, cloud: true, lab: true },
  { feature: "Cloud Memory Sync", free: false, cloud: true, lab: true },
  { feature: "Usage Dashboard", free: false, cloud: true, lab: true },
  { feature: "Managed Agent Team", free: false, cloud: false, lab: true },
  { feature: "Pre-built Skill Library", free: false, cloud: false, lab: true },
  { feature: "Team Collaboration", free: false, cloud: false, lab: true },
  { feature: "Priority Support", free: false, cloud: false, lab: true },
];

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-pl-text-muted">{value}</span>;
  }
  return value ? (
    <Check className="inline-block h-4 w-4 text-pl-green" />
  ) : (
    <span className="inline-block h-4 w-4 text-pl-text-dim">&mdash;</span>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Page header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-pl-text md:text-5xl">
          Pricing
        </h1>
        <p className="mt-4 text-lg text-pl-text-muted max-w-2xl mx-auto">
          The tool is free. The full tool. Pay only when you want managed
          billing or a team of agents.
        </p>
      </div>

      {/* Philosophy line */}
      <p className="text-center text-sm text-pl-text-dim italic mb-16 max-w-xl mx-auto">
        &ldquo;We get paid based on how valuable this is to you. Not before.&rdquo;
      </p>

      {/* Pricing tiers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col rounded-2xl border p-8 text-center",
              tier.featured
                ? "border-pl-cyan/50 bg-pl-surface shadow-lg shadow-pl-cyan/5 ring-1 ring-pl-cyan/20"
                : "border-pl-border bg-pl-surface"
            )}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pl-cyan px-3 py-1 text-xs font-semibold text-pl-bg">
                  <Sparkles className="h-3 w-3 text-pl-bg" />
                  {tier.badge}
                </span>
              </div>
            )}

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className={cn(
                  tier.featured ? "text-pl-cyan" : "text-pl-text-muted"
                )}>
                  {tier.icon}
                </span>
                <h2 className="text-lg font-semibold text-pl-text">
                  {tier.name}
                </h2>
              </div>
              <p className="text-sm text-pl-text-muted mt-1">{tier.tagline}</p>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-pl-text">
                  {tier.price}
                </span>
                {tier.priceNote && (
                  <span className="text-sm text-pl-text-muted">
                    {tier.priceNote}
                  </span>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="mb-8 flex-1 space-y-3 inline-block text-left">
              {tier.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-pl-text-secondary"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pl-green" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            {tier.ctaHref.startsWith("http") ? (
              <a
                href={tier.ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors",
                  tier.ctaStyle === "solid"
                    ? "bg-pl-cyan text-pl-bg hover:brightness-110"
                    : tier.ctaStyle === "muted"
                      ? "border border-pl-border text-pl-text-muted hover:border-pl-amber/40 hover:text-pl-amber"
                      : "border border-pl-border text-pl-text hover:border-pl-cyan/40 hover:text-pl-cyan"
                )}
              >
                {tier.cta}
              </a>
            ) : (
              <Link
                href={tier.ctaHref}
                className={cn(
                  "block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors",
                  tier.ctaStyle === "solid"
                    ? "bg-pl-cyan text-pl-bg hover:brightness-110"
                    : tier.ctaStyle === "muted"
                      ? "border border-pl-border text-pl-text-muted hover:border-pl-amber/40 hover:text-pl-amber"
                      : "border border-pl-border text-pl-text hover:border-pl-cyan/40 hover:text-pl-cyan"
                )}
              >
                {tier.cta}
              </Link>
            )}

            {/* Note */}
            <p className="mt-4 text-xs text-pl-text-dim text-center leading-relaxed">
              {tier.note}
            </p>
          </div>
        ))}
      </div>

      {/* No-limitations callout */}
      <div className="mt-12 text-center">
        <p className="text-sm text-pl-text-muted max-w-xl mx-auto leading-relaxed">
          The free tier isn&rsquo;t limited. It&rsquo;s the same tool with the same features.
          Cloud just adds managed billing and sync. You bring your own API keys either way &mdash;
          Cloud simply gives you one bill instead of managing multiple providers yourself.
        </p>
      </div>

      {/* Marketplace banner */}
      <section className="mt-20 rounded-2xl border border-dashed border-pl-cyan/30 bg-pl-surface p-8 md:p-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Store className="h-6 w-6 text-pl-cyan" />
          <h2 className="text-2xl font-bold text-pl-text">
            Skill Marketplace
          </h2>
          <span className="rounded-full bg-pl-amber/10 border border-pl-amber/30 px-2.5 py-0.5 text-xs font-medium text-pl-amber">
            Coming Soon
          </span>
        </div>
        <p className="text-pl-text-muted max-w-2xl mx-auto leading-relaxed">
          Create, share, and sell skills. A marketplace for AI capabilities built
          by the community, for the community. Available across all tiers.
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto">
          <FAQAccordion />
        </div>
      </section>

      {/* Comparison table */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-pl-text text-center mb-8">
          Compare Plans
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl mx-auto border-collapse">
            <thead>
              <tr className="border-b border-pl-border">
                <th className="py-3 px-4 text-left text-sm font-semibold text-pl-text">
                  Feature
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-pl-cyan">
                  Engram (Free)
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-pl-text">
                  Engram Cloud
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-pl-text-muted">
                  The Lab
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-pl-border",
                    i % 2 === 0 ? "bg-pl-surface" : "bg-pl-bg"
                  )}
                >
                  <td className="py-3 px-4 text-sm text-pl-text-secondary">
                    {row.feature}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.free} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.cloud} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ComparisonCell value={row.lab} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-20 text-center">
        <p className="text-pl-text-muted mb-6">
          Ready to own your AI infrastructure?
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/percival-labs/engram"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-pl-cyan px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Get Engram (Free)
          </a>
          <Link
            href="/early-access"
            className="rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan/40 hover:text-pl-cyan transition-colors"
          >
            Join the Waitlist
          </Link>
        </div>
      </section>
    </div>
  );
}
