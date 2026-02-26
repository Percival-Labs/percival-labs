import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Model Provenance Is a Trust Problem, Not Just a Capability Problem",
  description:
    "Nate B. Jones argues distillation is a Napster problem with thousand-to-one extraction economics. We agree — and extend: if provenance determines how a model breaks, the market needs trust infrastructure to make that provenance verifiable.",
  openGraph: {
    type: "article",
    title:
      "Model Provenance Is a Trust Problem, Not Just a Capability Problem",
    description:
      "Distilled models occupy narrower capability manifolds. No benchmark captures the gap. Economic trust staking provides the provenance signal the market needs.",
  },
};

export default function ModelProvenancePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Back link */}
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-muted hover:text-pl-cyan transition-colors mb-10"
      >
        <ArrowLeft className="h-4 w-4" />
        All Research
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pl-cyan/20 bg-pl-cyan/5 px-3 py-1 text-xs font-medium text-pl-cyan">
            <FileText className="h-3 w-3" />
            Analysis
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-pl-text sm:text-4xl leading-tight">
          Model Provenance Is a Trust Problem, Not Just a Capability Problem
        </h1>

        <p className="mt-4 text-sm text-pl-text-muted italic">
          In response to Nate B. Jones, &ldquo;Anthropic and AI&rsquo;s Napster
          Moment: Your AI Model Was Probably Built on Stolen
          Intelligence&rdquo; (2026)
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll &middot; Percival Labs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 25, 2026
          </span>
        </div>
      </header>

      {/* Abstract */}
      <Section>
        <div className="rounded-lg border border-pl-border bg-pl-surface p-5">
          <h3 className="text-sm font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
            Abstract
          </h3>
          <p className="text-sm leading-relaxed">
            Nate B. Jones argues that Anthropic&rsquo;s distillation disclosure
            should be understood not as Cold War espionage but as a Napster-class
            piracy problem driven by a thousand-to-one extraction ratio. He
            identifies a critical under-measured risk: distilled models occupy
            narrower capability manifolds that fail on sustained agentic work in
            ways no current benchmark captures. We agree with this diagnosis and
            extend it. If model provenance determines how a model
            breaks&mdash;and it does&mdash;then provenance is not merely a
            capability question. It is a trust question. And trust questions
            require trust infrastructure: verifiable identity, economic stake,
            and outcome tracking that compounds over time.
          </p>
        </div>
      </Section>

      {/* 1. The Napster Reframe */}
      <Section title="1. The Napster Reframe">
        <p>
          Jones&rsquo;s central argument deserves wider adoption. The Cold War
          framing of Anthropic&rsquo;s disclosure&mdash;three Chinese labs,
          24,000 fake accounts, 16 million exchanges&mdash;serves
          Anthropic&rsquo;s policy interests but obscures the structural reality.
          As Jones puts it:
        </p>
        <blockquote className="border-l-2 border-pl-cyan pl-4 my-4 text-pl-text italic">
          &ldquo;The incentive to distill frontier models is not specific to
          Chinese labs. It is literally universal.&rdquo;
        </blockquote>
        <p>
          The math is straightforward. Minimax ran 13 million exchanges against
          Claude. At retail API pricing, the extraction cost roughly $2 million.
          The capabilities extracted represent billions in training investment. A
          thousand-to-one return on theft. &ldquo;No rational economic actor
          facing those odds leaves that money on the table.&rdquo;
        </p>
        <p>
          This is correct, and it has a corollary that Jones identifies but
          doesn&rsquo;t fully develop: if the incentive is universal, then the
          response cannot be particular. Export controls, geographic
          restrictions, behavioral fingerprinting&mdash;these are necessary speed
          bumps. They buy time. But they address the symptom (specific labs doing
          the extraction) rather than the structure (extraction being
          economically rational for everyone).
        </p>
        <p>
          The structural response requires changing the economics of extraction
          itself.
        </p>
      </Section>

      {/* 2. Narrower Manifolds, Wider Consequences */}
      <Section title="2. Narrower Manifolds, Wider Consequences">
        <p>
          Jones introduces a geometric metaphor that clarifies what distillation
          actually costs. A frontier model trained on diverse data over months of
          compute occupies a{" "}
          <strong>wide manifold</strong> in capability space&mdash;broad
          competence across task types, tool combinations, and failure recovery
          strategies. A distilled model, trained on a subset of the frontier
          model&rsquo;s outputs, occupies a{" "}
          <strong>narrower manifold</strong>. It reproduces the specific
          behaviors the distiller captured. It falls off steeply outside that
          distribution.
        </p>
        <p>
          His framework maps this to a practical axis: task scope versus model
          provenance.
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Narrow tasks"
            description="Distilled models perform at 90% of frontier quality for 15% of the cost. Classify this email, summarize this doc, complete this function. Excellent trade."
          />
          <DimensionRow
            name="Sustained agentic work"
            description="Multi-hour autonomous workflows requiring tool improvisation, error recovery, and strategic adaptation. Distilled models drop to roughly 40% effectiveness."
          />
        </div>
        <p className="mt-4">
          Jones illustrates this with Kimi K2. He uses it for PowerPoint
          generation, where it excels. For sustained agentic work, he switches to
          Opus 4.6 every time. The model breaks differently. A frontier model
          encountering an unexpected error reroutes&mdash;tries a different
          library, restructures its approach, asks for clarification. A narrower
          model &ldquo;either fails, loops, or produces a technically valid but
          strategically incorrect workaround.&rdquo;
        </p>
        <p>
          The critical observation: no existing eval suite captures this.
        </p>
        <blockquote className="border-l-2 border-pl-cyan pl-4 my-4 text-pl-text italic">
          &ldquo;The evals that would measure sustained autonomous generality
          don&rsquo;t really exist yet, and that&rsquo;s actually one of the
          larger problems in AI right now.&rdquo;
        </blockquote>
        <p>
          This is where provenance becomes a trust problem.
        </p>
      </Section>

      {/* 3. The Off-Manifold Probe */}
      <Section title="3. The Off-Manifold Probe and Its Limits">
        <p>
          Jones proposes a practical test he calls the &ldquo;off-manifold
          probe.&rdquo; Take a real task in your domain. Run it on different
          models. When both succeed, change one constraint&mdash;not the whole
          task, one variable. Watch what happens. Does the model adapt,
          identifying which parts of its reasoning transfer and which need
          revision? Or does it regenerate everything from scratch, or worse,
          force-fit the old solution to new constraints?
        </p>
        <p>
          This is a genuine contribution to the model evaluation conversation. It
          tests for representational depth rather than benchmark performance. But
          it has a limitation Jones acknowledges: &ldquo;I cannot write that test
          for you.&rdquo; The off-manifold probe is inherently domain-specific,
          manual, and non-scalable.
        </p>
        <p>
          This is the gap that economic accountability fills. Not by replacing
          the off-manifold probe, but by creating a system where the results of
          real-world model performance&mdash;across thousands of domains,
          millions of tasks, running continuously&mdash;compound into a
          verifiable trust signal.
        </p>
        <p>
          Vouch&rsquo;s outcome tracking does for model provenance what
          Jones&rsquo;s off-manifold probe does for individual evaluation: it
          measures generality through actual performance rather than synthetic
          benchmarks. When an agent backed by a specific model fails on an
          out-of-distribution task at hour six of an autonomous workflow, that
          failure is recorded. When it succeeds, that success is recorded. The
          trust score reflects not what the model claims on benchmarks, but how
          it actually performs when the work is real and the stakes are non-zero.
        </p>
        <p>
          Over time, the trust scores of agents running frontier models will
          diverge from those running distilled models&mdash;not because anyone
          labels them as such, but because the manifold compression shows up in
          real-world outcomes. The market discovers provenance through
          performance, verified economically.
        </p>
      </Section>

      {/* 4. Speed Bumps Need Economic Teeth */}
      <Section title="4. Speed Bumps Need Economic Teeth">
        <p>
          Jones&rsquo;s speed bump metaphor is apt. Anthropic&rsquo;s
          countermeasures&mdash;behavioral fingerprinting, detection classifiers,
          intelligence sharing&mdash;won&rsquo;t stop distillation. They slow it
          down. And when capabilities double every 90 days, a three-month delay
          is meaningful competitive advantage.
        </p>
        <p>
          But speed bumps are passive. They impose friction through detection and
          enforcement. The distiller&rsquo;s calculation remains: if I&rsquo;m
          not caught, the extraction is free. The risk is
          binary&mdash;zero or ban&mdash;not proportional.
        </p>
        <p>
          Economic staking changes this calculation from binary to continuous. In
          a Vouch-integrated system, accessing a frontier model requires
          pre-committed economic stake. The stake isn&rsquo;t a subscription
          fee&mdash;it&rsquo;s a bond that is partially or fully forfeited upon
          verified misuse, including systematic distillation patterns. The cost
          of extraction scales with the volume of extraction, not as a flat rate
          but as compounding economic risk.
        </p>
        <p>
          This addresses Jones&rsquo;s core observation about the
          thousand-to-one ratio. If extracting 13 million exchanges requires
          maintaining economic stake proportional to the extraction
          volume&mdash;and if that stake is subject to slashing upon
          detection&mdash;the ratio compresses. Not to one-to-one. But from a
          thousand-to-one toward something that no longer overwhelms rational
          caution.
        </p>
        <p>
          Speed bumps slow things down. Economic stakes make speeding expensive.
        </p>
      </Section>

      {/* 5. Provenance as Market Signal */}
      <Section title="5. Provenance as Market Signal">
        <p>
          Jones closes with practical advice:
        </p>
        <blockquote className="border-l-2 border-pl-cyan pl-4 my-4 text-pl-text italic">
          &ldquo;The people who route well, who match problems to models based on
          a real understanding of representational depth, not marketing copy,
          those people will outperform the ones who use one tool for everything
          and who pick the cheap one.&rdquo;
        </blockquote>
        <p>
          He is describing a market that needs a trust signal. Currently, model
          routing decisions are based on benchmarks (gameable), marketing claims
          (unreliable), and personal experience (non-scalable). Jones&rsquo;s
          off-manifold probe improves on all three but remains manual and
          domain-specific.
        </p>
        <p>
          The agent economy needs a provenance signal that is:
        </p>
        <div className="space-y-2 mt-4">
          <DimensionRow
            name="Continuous"
            description="Not binary 'frontier vs. distilled' but a spectrum of verified generality, updated with every interaction."
          />
          <DimensionRow
            name="Outcome-derived"
            description="Based on actual performance across real tasks, not self-reported benchmark claims."
          />
          <DimensionRow
            name="Economically backed"
            description="Stakeholders have skin in the game. Their assessment carries financial weight, not just opinion."
          />
          <DimensionRow
            name="Federated"
            description="No single provider controls the trust signal. Cross-platform, independently verifiable via NIP-85 signed assertions."
          />
        </div>
        <p className="mt-4">
          Jones is right that &ldquo;the provenance of a model is not just an
          ethical question. It&rsquo;s a capability question.&rdquo; We would
          add: it&rsquo;s a capability question that only trust infrastructure
          can answer at scale.
        </p>
      </Section>

      {/* Conclusion */}
      <Section title="6. Conclusion">
        <p>
          Jones&rsquo;s Napster reframe is more useful than the Cold War
          narrative because it identifies the correct force: economic pressure
          gradients, not geopolitical adversaries. Distillation will happen
          because the economics are overwhelming. The question is what
          infrastructure exists to make the consequences of that distillation
          legible to the market.
        </p>
        <p>
          Benchmarks can&rsquo;t do it&mdash;they&rsquo;re optimized for the
          exact tasks distillers target. Self-reported provenance can&rsquo;t do
          it&mdash;everyone claims to be frontier. Manual testing can&rsquo;t do
          it&mdash;it doesn&rsquo;t scale.
        </p>
        <p>
          What can do it is a system where real-world performance, verified by
          economic stake, compounds into a trust signal that the market can read.
          Not a leaderboard. A ledger.
        </p>
        <p>
          The agents are already being deployed. The models underneath them exist
          on a spectrum of provenance. The question is whether the systems around
          them make that provenance visible, verifiable, and economically
          meaningful&mdash;or whether we continue choosing tools based on
          marketing copy and hope for the best.
        </p>
      </Section>

      {/* References */}
      <Section title="References">
        <ol className="list-decimal list-inside space-y-2 text-sm text-pl-text-muted">
          <li>
            Jones, N. B. (2026). &ldquo;Anthropic and AI&rsquo;s Napster Moment:
            Your AI Model Was Probably Built on Stolen Intelligence.&rdquo;
            YouTube / Nate&rsquo;s Newsletter (Substack).
          </li>
          <li>
            Anthropic (2026). &ldquo;Detecting and Countering Malicious Uses of
            Claude: February 2026.&rdquo;
          </li>
          <li>
            Carroll, A. (2026). &ldquo;Economic Accountability as an
            Architectural Primitive: A Response to Agents of Chaos.&rdquo;
            Percival Labs.
          </li>
          <li>
            Carroll, A. (2026). &ldquo;Economic Trust Staking as an Access
            Control Mechanism for AI Model Inference APIs.&rdquo; Percival Labs
            PL-DD-2026-001.
          </li>
          <li>
            Carroll, A. (2026). &ldquo;24,000 Fake Accounts: Why API Keys
            Can&rsquo;t Stop Model Distillation &mdash; And What Can.&rdquo;
            Percival Labs.
          </li>
        </ol>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed italic">
          Percival Labs builds trust infrastructure for the AI agent economy.
          Read the full technical specification and research at{" "}
          <Link href="/research" className="text-pl-cyan hover:underline">
            percival-labs.ai/research
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Local Components                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      {title && (
        <h2 className="text-xl font-bold text-pl-text mb-4">{title}</h2>
      )}
      <div className="space-y-3 text-pl-text-secondary leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function DimensionRow({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1.5 h-2 w-2 rounded-full bg-pl-cyan shrink-0" />
      <div>
        <span className="font-medium text-pl-text">{name}:</span>{" "}
        <span className="text-pl-text-muted">{description}</span>
      </div>
    </div>
  );
}
