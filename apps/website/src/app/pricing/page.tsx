import Link from "next/link";
import { Check, X, Sparkles, Store } from "lucide-react";
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
  features: string[];
  cta: string;
  ctaHref: string;
  ctaStyle: "outline" | "solid";
  note: string;
}

const tiers: Tier[] = [
  {
    name: "Free",
    tagline: "Build It Yourself",
    price: "$0",
    priceNote: "forever",
    features: [
      "Full PAI specification (open source)",
      "Starter skills & templates",
      "Getting started guide",
      "Community Discord",
      "Link to Daniel Miessler's PAI repo",
    ],
    cta: "Start Building",
    ctaHref: "https://github.com/danielmiessler/PAI",
    ctaStyle: "outline",
    note: "Everything you need to build your own. We'll even show you how.",
  },
  {
    name: "The Harness",
    tagline: "$25/mo",
    price: "$25",
    priceNote: "/mo",
    badge: "Most Popular",
    featured: true,
    features: [
      "Everything in Free, plus:",
      "Cloud-hosted Harness (identity, context, skills, memory)",
      "Cross-model routing \u2014 Claude, GPT, Gemini",
      "Auto-updating infrastructure",
      "Security-vetted skill marketplace",
      "Cloud memory (persistent, backed up, searchable)",
      "AI-assisted troubleshooting",
      "BYO API key (you bring your model provider key)",
    ],
    cta: "Join Waitlist",
    ctaHref: "/early-access",
    ctaStyle: "solid",
    note: "The same infrastructure we run internally, hosted and maintained for you.",
  },
  {
    name: "Managed AI",
    tagline: "Coming Soon",
    price: "TBD",
    features: [
      "Everything in The Harness, plus:",
      "We provide AI model access (no API key needed)",
      "Transparent per-token pricing",
      "Usage dashboard",
      "Priority support",
    ],
    cta: "Notify Me",
    ctaHref: "/early-access",
    ctaStyle: "outline",
    note: "For those who want zero setup. Pay-per-use, transparent markup.",
  },
];

interface ComparisonRow {
  feature: string;
  free: boolean;
  harness: boolean;
}

const comparisonRows: ComparisonRow[] = [
  { feature: "PAI Specification", free: true, harness: true },
  { feature: "Starter Skills", free: true, harness: true },
  { feature: "Community Discord", free: true, harness: true },
  { feature: "Cloud Hosting", free: false, harness: true },
  { feature: "Cross-Model Routing", free: false, harness: true },
  { feature: "Auto-Updates", free: false, harness: true },
  { feature: "Skill Marketplace", free: false, harness: true },
  { feature: "Cloud Memory", free: false, harness: true },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Page header */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-pl-text md:text-5xl">
          Pricing
        </h1>
        <p className="mt-4 text-lg text-pl-text-muted max-w-2xl mx-auto">
          The specification is free. Always will be. Pay only when you want us
          to host it for you.
        </p>
      </div>

      {/* Pricing tiers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col rounded-2xl border p-8 text-center",
              tier.featured
                ? "border-pl-amber/50 bg-pl-surface shadow-lg shadow-pl-amber/5"
                : "border-pl-border bg-pl-surface"
            )}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pl-amber px-3 py-1 text-xs font-semibold text-pl-bg">
                  <Sparkles className="h-3 w-3 text-pl-bg" />
                  {tier.badge}
                </span>
              </div>
            )}

            {/* Header */}
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-pl-text">
                {tier.name}
              </h2>
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
                    ? "bg-pl-amber text-pl-bg hover:brightness-110"
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
                    ? "bg-pl-amber text-pl-bg hover:brightness-110"
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

      {/* Marketplace banner */}
      <section className="mt-20 rounded-2xl border border-pl-border bg-pl-surface p-8 md:p-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Store className="h-6 w-6 text-pl-cyan" />
          <h2 className="text-2xl font-bold text-pl-text">
            Skill Marketplace
          </h2>
        </div>
        <p className="text-pl-text-muted max-w-2xl mx-auto leading-relaxed">
          Browse and install AI skills created by the community. Prices set by
          creators, from $0.001 per use. Platform takes 20&ndash;30% to fund
          infrastructure.
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
          <table className="w-full max-w-3xl mx-auto border-collapse">
            <thead>
              <tr className="border-b border-pl-border">
                <th className="py-3 px-4 text-left text-sm font-semibold text-pl-text">
                  Feature
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-pl-text">
                  Free (DIY)
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-pl-cyan">
                  The Harness ($25/mo)
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
                    {row.free ? (
                      <Check className="inline-block h-4 w-4 text-pl-green" />
                    ) : (
                      <X className="inline-block h-4 w-4 text-pl-text-dim" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.harness ? (
                      <Check className="inline-block h-4 w-4 text-pl-green" />
                    ) : (
                      <X className="inline-block h-4 w-4 text-pl-text-dim" />
                    )}
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
          <Link
            href="/early-access"
            className="rounded-lg bg-pl-amber px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Join the Waitlist
          </Link>
          <a
            href="https://github.com/danielmiessler/PAI"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan/40 hover:text-pl-cyan transition-colors"
          >
            Start Free (GitHub)
          </a>
        </div>
      </section>
    </div>
  );
}
