import Link from "next/link";
import {
  Shuffle,
  ShieldCheck,
  Store,
  Eye,
  ArrowRight,
  Activity,
  Check,
  Zap,
  RefreshCw,
  Hammer,
  Wrench,
  Users,
  FlaskConical,
} from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";

/* ------------------------------------------------------------------ */
/*  Section: Hero                                                      */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Glow background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-pl-amber/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 flex flex-col items-center">
        <h1
          className="center-text text-center text-4xl font-extrabold tracking-tight text-pl-text sm:text-5xl lg:text-6xl leading-tight"
          style={{ textAlign: "center" }}
        >
          Build your Harness. Own your future.
        </h1>
        <p
          className="center-text text-center mt-6 text-lg text-pl-text-secondary leading-relaxed max-w-2xl"
          style={{ textAlign: "center" }}
        >
          Your identity, skills, and memory &mdash; portable across any AI
          model. Open source. Model agnostic. Built for everyone.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/early-access"
            className="inline-flex items-center gap-2 rounded-lg bg-pl-amber px-6 py-3 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all"
          >
            Build Your Harness
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border border-pl-border px-6 py-3 text-sm font-semibold text-pl-text hover:border-pl-cyan hover:text-pl-cyan transition-colors"
          >
            View Pricing
          </Link>
        </div>

        <Link href="/the-lab" className="block mt-14 w-full max-w-2xl group">
          <div className="rounded-xl border border-pl-border bg-gradient-to-b from-pl-surface to-pl-bg p-8 transition-colors group-hover:border-pl-cyan/40 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 text-pl-text-muted">
              <Activity className="h-5 w-5 text-pl-cyan animate-pulse" />
              <span className="text-sm font-medium">Live Agent Activity</span>
            </div>
            <p
              className="center-text text-center mt-2 text-xs text-pl-text-dim"
              style={{ textAlign: "center" }}
            >
              Watch our agents work in real time &rarr;
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Positioning Statement                                     */
/* ------------------------------------------------------------------ */
function PositioningSection() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6">
        <div className="space-y-6 text-base text-pl-text-secondary leading-relaxed">
          <p>
            AI is moving too fast. New models every month. New tools every week.
            New jargon that didn&apos;t exist yesterday. If you feel like
            you&apos;re getting left behind &mdash; you&apos;re not alone, and
            it&apos;s not your fault. The ground keeps shifting under
            everyone&apos;s feet.
          </p>
          <p className="text-pl-text font-medium">
            But it doesn&apos;t have to be that way.
          </p>
          <p>
            You don&apos;t need a CS degree. You don&apos;t need a $997 course.
            You need infrastructure &mdash; a stable foundation that survives the
            chaos. Set it up once, and it works no matter what model comes next.
          </p>
          <p>
            That&apos;s{" "}
            <span className="text-pl-amber font-semibold">The Harness</span>.
            Your personal AI infrastructure. Open source, model-agnostic, built
            in plain files you own. Skills, context, memory, identity &mdash;
            organized and portable. Start with the basics and add more as you
            grow. New skills, sharper context, deeper memory &mdash; your Harness
            evolves alongside you. And when the next model drops and everyone
            else scrambles to adapt, yours just works.
          </p>
          <p className="text-pl-text-muted text-sm">
            Built by Percival Labs. Founded by a carpenter who taught himself AI
            and realized the barrier was never intelligence &mdash; it was
            intimidation. We&apos;re here to fix that.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: The Problem                                               */
/* ------------------------------------------------------------------ */
const problems = [
  {
    icon: Zap,
    title: "Tools Change Weekly",
    body: "New models, new APIs, new everything. Your workflows break before you learn them.",
  },
  {
    icon: RefreshCw,
    title: "Setup Breaks Monthly",
    body: "Spent hours configuring AI? Great. Now do it again when the next version ships.",
  },
  {
    icon: Hammer,
    title: "Always Rebuilding",
    body: "Your prompts, context, and skills \u2014 trapped in one tool, lost when you switch.",
  },
];

function ProblemSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          The AI Landscape Is Shifting Under Your Feet
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3 w-full">
          {problems.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-pl-border bg-pl-surface p-6 hover:border-pl-cyan/30 transition-colors flex flex-col items-center"
            >
              <div className="mb-4">
                <p.icon className="h-8 w-8 text-pl-cyan" />
              </div>
              <h3
                className="center-text text-center text-lg font-semibold text-pl-text"
                style={{ textAlign: "center" }}
              >
                {p.title}
              </h3>
              <p
                className="center-text text-center mt-2 text-sm text-pl-text-muted leading-relaxed"
                style={{ textAlign: "center" }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: The Harness                                               */
/* ------------------------------------------------------------------ */
function HarnessSection() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-5xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          The Harness: Infrastructure That Survives Model Changes
        </h2>
        <p
          className="center-text text-center mt-6 text-base text-pl-text-secondary leading-relaxed max-w-2xl"
          style={{ textAlign: "center" }}
        >
          The Harness is your personal AI infrastructure layer &mdash;
          model-agnostic files and conventions that define who you are to any AI.
          Your identity, context, skills, memory, and automation hooks live in
          portable markdown and YAML. When the model underneath changes, your
          Harness stays the same.
        </p>

        <div className="mt-12 w-full rounded-xl border border-pl-border bg-pl-surface p-6 sm:p-8 overflow-x-auto flex justify-center">
          <pre className="font-mono text-xs sm:text-sm text-pl-text-secondary leading-relaxed whitespace-pre text-left">
{`  +--------------------------------------------------+
  |                 YOUR  HARNESS                    |
  |                                                   |
  |   +------------+  +-----------+  +------------+   |
  |   |  Identity  |  |  Context  |  |   Skills   |   |
  |   |  who you   |  |  what you |  |  what you  |   |
  |   |  are       |  |  know     |  |  can do    |   |
  |   +------------+  +-----------+  +------------+   |
  |                                                   |
  |   +------------+  +-----------+                   |
  |   |   Memory   |  |   Hooks   |                   |
  |   |  what you  |  |  auto     |                   |
  |   |  remember  |  |  actions  |                   |
  |   +------------+  +-----------+                   |
  |                                                   |
  +--------------------------------------------------+
                         |
              +----------+----------+
              |    Any AI  Model    |
              |  Claude / GPT /     |
              |  Gemini / Local     |
              +---------------------+`}
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Product Line                                              */
/* ------------------------------------------------------------------ */
const products = [
  {
    icon: Wrench,
    name: "The Harness",
    tagline: "Direct the power of AI",
    description:
      "Open-source AI infrastructure framework. Five portable layers of plain files that survive model changes.",
    color: "text-pl-amber",
    borderColor: "hover:border-pl-amber/40",
    href: "/how-it-works",
  },
  {
    icon: Users,
    name: "The Round Table",
    tagline: "Where all agents gather as equals",
    description:
      "Agent+human community forum. Share skills, get help, and collaborate with builders and their AI agents.",
    color: "text-pl-cyan",
    borderColor: "hover:border-pl-cyan/40",
    href: "/early-access",
  },
  {
    icon: FlaskConical,
    name: "The Lab",
    tagline: "Watch the agents work",
    description:
      "Visual agent showcase and livestream. Real agents, real work, no staged demos.",
    color: "text-pl-green",
    borderColor: "hover:border-pl-green/40",
    href: "/the-lab",
  },
];

function ProductLineSection() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-5xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          What We&apos;re Building
        </h2>
        <p
          className="center-text text-center mt-4 text-base text-pl-text-muted"
          style={{ textAlign: "center" }}
        >
          Three products, one mission: make AI infrastructure accessible to
          everyone.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 w-full">
          {products.map((product) => (
            <Link
              key={product.name}
              href={product.href}
              className={`rounded-xl border border-pl-border bg-pl-surface p-6 transition-colors ${product.borderColor} flex flex-col items-center group`}
            >
              <div className="mb-4">
                <product.icon className={`h-8 w-8 ${product.color}`} />
              </div>
              <h3
                className="center-text text-center text-lg font-semibold text-pl-text"
                style={{ textAlign: "center" }}
              >
                {product.name}
              </h3>
              <p
                className={`center-text text-center text-sm font-medium ${product.color} mt-1`}
                style={{ textAlign: "center" }}
              >
                {product.tagline}
              </p>
              <p
                className="center-text text-center mt-3 text-sm text-pl-text-muted leading-relaxed"
                style={{ textAlign: "center" }}
              >
                {product.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Live Proof                                                */
/* ------------------------------------------------------------------ */
function LiveProofSection() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-5xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          Watch Our Agents Build The Harness &mdash; Live
        </h2>
        <p
          className="center-text text-center mt-4 text-base text-pl-text-muted"
          style={{ textAlign: "center" }}
        >
          Real agents. Real work. No staged demos.
        </p>

        <Link href="/the-lab" className="block mt-10 w-full group">
          <div className="aspect-video w-full rounded-xl border border-pl-border bg-pl-surface flex items-center justify-center transition-colors group-hover:border-pl-cyan/40">
            <div className="flex flex-col items-center">
              <Activity className="h-10 w-10 text-pl-cyan animate-pulse mb-3" />
              <p
                className="center-text text-center text-sm font-medium text-pl-text-muted"
                style={{ textAlign: "center" }}
              >
                The Lab loads here
              </p>
              <p
                className="center-text text-center mt-1 text-xs text-pl-text-dim"
                style={{ textAlign: "center" }}
              >
                Enter The Lab &rarr;
              </p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Features Grid                                             */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Shuffle,
    title: "Model Agnostic",
    body: "Claude, GPT, Gemini, local models \u2014 one Harness, any brain. Switch freely.",
  },
  {
    icon: ShieldCheck,
    title: "Security Verified",
    body: "Every skill in the marketplace is scanned, sandboxed, and trust-scored before you install it.",
  },
  {
    icon: Store,
    title: "Skill Marketplace",
    body: "Browse, install, and share AI skills. Build once, sell to thousands.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    body: "We credit our foundations, show our source, and price fairly. No lock-in, ever.",
  },
];

function FeaturesGrid() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-5xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          Built Different, On Purpose
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-pl-border bg-pl-surface p-6 hover:border-pl-cyan/30 transition-colors flex flex-col items-center"
            >
              <div className="mb-4">
                <f.icon className="h-8 w-8 text-pl-cyan" />
              </div>
              <h3
                className="center-text text-center text-lg font-semibold text-pl-text"
                style={{ textAlign: "center" }}
              >
                {f.title}
              </h3>
              <p
                className="center-text text-center mt-2 text-sm text-pl-text-muted leading-relaxed"
                style={{ textAlign: "center" }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Origin Teaser                                             */
/* ------------------------------------------------------------------ */
function OriginTeaser() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-3xl px-6 flex flex-col items-center">
        <p
          className="center-text text-center text-lg text-pl-text-secondary leading-relaxed"
          style={{ textAlign: "center" }}
        >
          Percival Labs started when a carpenter discovered that AI
          infrastructure doesn&apos;t have to be complicated &mdash; and it
          definitely shouldn&apos;t be locked down.
        </p>
        <div className="mt-6">
          <Link
            href="/origin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-pl-cyan hover:underline"
          >
            Read the full story
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Pricing Preview                                           */
/* ------------------------------------------------------------------ */
const pricingBullets = [
  "Cloud-hosted personal AI infrastructure",
  "Cross-model routing (BYO API key)",
  "Auto-updating \u2014 we handle API changes",
  "Security-vetted skill marketplace",
];

function PricingPreview() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-xl px-6">
        <div className="rounded-xl border border-pl-border bg-pl-surface p-8 flex flex-col items-center">
          <p
            className="center-text text-center text-sm font-medium text-pl-amber uppercase tracking-wide"
            style={{ textAlign: "center" }}
          >
            One plan. Everything included.
          </p>
          <p
            className="center-text text-center mt-4 text-4xl font-extrabold text-pl-text"
            style={{ textAlign: "center" }}
          >
            $25
            <span className="text-lg font-normal text-pl-text-muted">
              /mo
            </span>
          </p>
          <p
            className="center-text text-center mt-1 text-base font-semibold text-pl-text-secondary"
            style={{ textAlign: "center" }}
          >
            The Harness
          </p>

          <div className="mt-6 flex justify-center">
            <ul className="space-y-3 text-left">
              {pricingBullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check className="h-5 w-5 text-pl-green shrink-0 mt-0.5" />
                  <span className="text-sm text-pl-text-secondary">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 space-y-2 w-full">
            <p
              className="center-text text-center text-sm text-pl-text-muted"
              style={{ textAlign: "center" }}
            >
              Skills from{" "}
              <span className="font-semibold text-pl-text">$0.001/use</span>
            </p>
            <p
              className="center-text text-center text-sm text-pl-text-dim"
              style={{ textAlign: "center" }}
            >
              Free tier: Build it yourself with our open-source spec
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-pl-cyan hover:underline"
            >
              See all plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: CTA / Waitlist                                            */
/* ------------------------------------------------------------------ */
function CtaSection() {
  return (
    <section className="py-20 sm:py-28 border-t border-pl-border">
      <div className="mx-auto max-w-2xl px-6 flex flex-col items-center">
        <h2
          className="center-text text-center text-3xl font-bold text-pl-text sm:text-4xl"
          style={{ textAlign: "center" }}
        >
          Ready to Build on Solid Ground?
        </h2>
        <div className="mt-8 w-full">
          <WaitlistForm />
        </div>
        <p
          className="center-text text-center mt-4 text-sm text-pl-text-dim"
          style={{ textAlign: "center" }}
        >
          Join the waitlist. First 100 get founding member pricing.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <>
      <Hero />
      <PositioningSection />
      <ProblemSection />
      <HarnessSection />
      <ProductLineSection />
      <LiveProofSection />
      <FeaturesGrid />
      <OriginTeaser />
      <PricingPreview />
      <CtaSection />
    </>
  );
}
