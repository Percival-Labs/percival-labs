import { Check, Shield } from "lucide-react";
import { EarlyAccessForm } from "@/components/early-access-form";

export const metadata = { title: "Early Access" };

const benefits = [
  "Priority access when Engram launches",
  "Founding member pricing \u2014 locked in for life",
  "Direct input on features and roadmap",
  "Early marketplace access for skill creators",
  "Invite to the private Discord community",
];

export default function EarlyAccessPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center py-16 sm:py-24 px-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pl-cyan/20 bg-pl-cyan/5 px-4 py-1.5 mb-6">
            <Shield className="h-4 w-4 text-pl-cyan" />
            <span className="text-xs font-medium text-pl-cyan">
              Limited Availability
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl">
            Get Early Access to Engram
          </h1>
          <p className="mt-4 text-base text-pl-text-secondary leading-relaxed">
            Join the waitlist for Percival Labs&apos; hosted personal AI
            infrastructure. First 100 signups get founding member pricing.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-10 rounded-xl border border-pl-border bg-pl-surface p-6 text-center">
          <h2 className="text-sm font-semibold text-pl-text-muted uppercase tracking-wide mb-4">
            What you get
          </h2>
          <ul className="space-y-3 inline-block text-left">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-pl-green shrink-0 mt-0.5" />
                <span className="text-sm text-pl-text-secondary">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Email form */}
        <div className="mt-8">
          <EarlyAccessForm />
        </div>

        {/* Trust signals */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-pl-text-dim">
            No spam. No selling your data. Unsubscribe anytime.
          </p>
          <p className="text-sm text-pl-text-dim">
            Open source at heart &mdash; even if you never pay, the spec is free
            forever.
          </p>
        </div>
      </div>
    </div>
  );
}
