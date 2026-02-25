import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title:
    "24,000 Fake Accounts: Why API Keys Can't Stop Model Distillation -- And What Can",
  description:
    "Anthropic disclosed that three Chinese AI labs created 24,000 fraudulent accounts for model distillation. Current defenses fail because identity is free and consequences are cheap. Trust staking changes the economics.",
  openGraph: {
    type: "article",
    title:
      "24,000 Fake Accounts: Why API Keys Can't Stop Model Distillation -- And What Can",
    description:
      "Anthropic disclosed that three Chinese AI labs created 24,000 fraudulent accounts for model distillation. Trust staking changes the economics.",
  },
};

export default function ApiTrustLayerDistillationPage() {
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
          24,000 Fake Accounts: Why API Keys Can&rsquo;t Stop Model
          Distillation&mdash;And What Can
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-pl-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Alan Carroll
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            February 24, 2026
          </span>
        </div>
      </header>

      {/* Intro */}
      <Section>
        <p>
          On February 23, Anthropic published a disclosure that three Chinese AI
          labs&mdash;DeepSeek, Moonshot AI, and MiniMax&mdash;created over 24,000
          fraudulent accounts and generated more than 16 million exchanges with
          Claude for the purpose of model distillation. They extracted frontier
          capabilities at industrial scale, used it to train competing models,
          and did so for months before detection.
        </p>
        <p>
          Anthropic&rsquo;s response included a line that should be read
          carefully:{" "}
          <strong>
            &ldquo;No company can solve this alone.&rdquo;
          </strong>
        </p>
        <p>
          They are correct. And the reason they are correct is that the problem
          is not detection. The problem is architecture.
        </p>
      </Section>

      {/* The Defense Stack That Doesn't Work */}
      <Section title="The Defense Stack That Doesn&rsquo;t Work">
        <p>
          Every frontier model provider currently relies on some combination of
          the following:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Defense</th>
                <th className="pb-2 pr-4 font-medium">What It Does</th>
                <th className="pb-2 font-medium">Why It Fails</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Email verification
                </td>
                <td className="py-2.5 pr-4">
                  Ties accounts to an email address
                </td>
                <td className="py-2.5">
                  Creating emails costs nothing. 24,000 accounts at zero
                  marginal cost.
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Phone verification
                </td>
                <td className="py-2.5 pr-4">
                  Ties accounts to a phone number
                </td>
                <td className="py-2.5">
                  Virtual phone numbers cost pennies. Bulk SMS services exist
                  for exactly this purpose.
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Rate limiting
                </td>
                <td className="py-2.5 pr-4">
                  Caps requests per account per time window
                </td>
                <td className="py-2.5">
                  Effective per-account. Useless against 24,000 accounts
                  running in parallel.
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Usage anomaly detection
                </td>
                <td className="py-2.5 pr-4">
                  Flags suspicious query patterns
                </td>
                <td className="py-2.5">
                  Reactive. By the time the pattern is detected, the data has
                  already been extracted.
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Terms of Service
                </td>
                <td className="py-2.5 pr-4">
                  Legal prohibition on distillation
                </td>
                <td className="py-2.5">
                  Unenforceable across jurisdictions. The labs in question
                  operate in countries where US ToS carries no weight.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Account bans
                </td>
                <td className="py-2.5 pr-4">Terminates detected accounts</td>
                <td className="py-2.5">
                  The maximum penalty. And it costs the attacker nothing but
                  the time to create a replacement.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Every defense in this table is <strong>reactive</strong>. It responds
          to abuse after it has occurred. None of them change the economics of
          the attack itself.
        </p>
      </Section>

      {/* Hydra Cluster Architectures */}
      <Section title="Hydra Cluster Architectures">
        <p>
          Anthropic used the term &ldquo;hydra cluster&rdquo; to describe what
          they observed: a coordinated network of accounts where banning one
          simply activates another. The metaphor is precise. You cut off a head
          and two more appear, because the cost of growing a new head is
          effectively zero.
        </p>
        <p>
          The 24,000 accounts were not 24,000 independent actors. They were a
          single coordinated operation distributed across thousands of
          disposable identities. The identities were cheap. The coordination was
          centralized. The extraction was systematic.
        </p>
        <p>
          This is not a novel attack pattern. It is the same Sybil attack that
          has plagued every identity system since the term was coined in 2002.
          The only thing that has changed is the target: instead of manipulating
          a social network or a voting system, the Sybil army is extracting the
          distilled intelligence of models that cost hundreds of millions of
          dollars to train.
        </p>
        <p>
          The current defense stack treats each account as an independent entity
          and evaluates it in isolation. That is why it fails. The attacker is
          not operating in isolation. The defense should not be either.
        </p>
      </Section>

      {/* What's Actually Missing */}
      <Section title="What&rsquo;s Actually Missing: Economic Identity">
        <p>
          The fundamental problem is that{" "}
          <strong>identity is free and consequences are cheap</strong>.
        </p>
        <p>
          Creating an API account costs nothing. Using it for distillation costs
          only the per-token API fee&mdash;which, for a state-backed operation
          extracting capabilities worth billions in training compute, is a
          rounding error. Getting caught costs one account ban and the five
          minutes it takes to create a replacement.
        </p>
        <p>
          There is no economic stake. No community accountability. No cascading
          consequence. No cross-provider reputation. The attacker risks nothing
          that they value.
        </p>
        <p>
          This is the gap. Not better detection. Not faster bans. Not more
          restrictive rate limits. The gap is an{" "}
          <strong>economic identity layer</strong>&mdash;a system where
          accessing frontier model inference requires putting real value at
          risk, backed by real community members who also have skin in the game.
        </p>
      </Section>

      {/* How Vouch Works */}
      <Section title="How Vouch Works">
        <p>
          Vouch is a trust-staking protocol built on Nostr. It creates economic
          identity for API consumers through four mechanisms:
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          1. Economic Staking
        </h3>
        <p>
          Before accessing elevated API tiers, a consumer must deposit slashable
          economic value&mdash;denominated in Bitcoin via the Lightning Network.
          This is not a payment for service. It is collateral. If the consumer
          is confirmed to have engaged in distillation, the stake is slashed.
          The money is gone.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          2. Community Vouching
        </h3>
        <p>
          A stake alone is not sufficient. The consumer also needs
          vouchers&mdash;existing trusted entities (humans, agents,
          organizations) who stake their own reputation and funds to attest that
          this consumer is legitimate. The voucher&rsquo;s stake is also at
          risk. If the consumer they vouched for gets caught distilling, the
          voucher loses money too. This creates a social graph of
          accountability where every link in the chain has economic
          consequences.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          3. Tiered Access
        </h3>
        <p>
          The consumer&rsquo;s trust score&mdash;computed from verification,
          tenure, behavior, backing, and cross-provider reputation&mdash;determines
          what they can access:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Tier</th>
                <th className="pb-2 pr-4 font-medium">Min Stake</th>
                <th className="pb-2 pr-4 font-medium">Min Vouchers</th>
                <th className="pb-2 pr-4 font-medium">Rate Limit</th>
                <th className="pb-2 font-medium">Chain-of-Thought</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Restricted
                </td>
                <td className="py-2.5 pr-4">$0</td>
                <td className="py-2.5 pr-4">0</td>
                <td className="py-2.5 pr-4">10 req/min</td>
                <td className="py-2.5">No</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Standard
                </td>
                <td className="py-2.5 pr-4">~$100</td>
                <td className="py-2.5 pr-4">1</td>
                <td className="py-2.5 pr-4">60 req/min</td>
                <td className="py-2.5">Limited</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Elevated
                </td>
                <td className="py-2.5 pr-4">~$1,000</td>
                <td className="py-2.5 pr-4">3</td>
                <td className="py-2.5 pr-4">300 req/min</td>
                <td className="py-2.5">Yes</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Unlimited
                </td>
                <td className="py-2.5 pr-4">~$10,000</td>
                <td className="py-2.5 pr-4">5 (each score &gt;400)</td>
                <td className="py-2.5 pr-4">Provider-defined</td>
                <td className="py-2.5">Full</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Distillation at scale requires unrestricted access&mdash;high rate
          limits, chain-of-thought extraction, batch endpoints. Under Vouch,
          that access requires substantial economic commitment and community
          trust.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          4. Cascading Slashing
        </h3>
        <p>
          When distillation is confirmed, the consequences do not stop at the
          consumer. Every voucher in the chain loses a proportion of their
          stake. This is the mechanism that prevents voucher farming&mdash;the
          practice of creating fake vouchers to back fake accounts. Vouching for
          a bad actor is expensive. The community self-polices because the
          economics demand it.
        </p>
      </Section>

      {/* Replay */}
      <Section title="Replay: The 24,000-Account Attack With Vouch">
        <p>
          Let&rsquo;s walk through what the Anthropic attack looks like if Vouch
          is in place.
        </p>
        <p>
          The attacker wants 24,000 accounts with enough access to extract 16
          million exchanges. Under the current system, that requires 24,000
          email addresses and API fees. Under Vouch, the math changes:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pl-border text-left text-pl-text-muted">
                <th className="pb-2 pr-4 font-medium">Cost Component</th>
                <th className="pb-2 pr-4 font-medium">Without Vouch</th>
                <th className="pb-2 font-medium">With Vouch</th>
              </tr>
            </thead>
            <tbody className="text-pl-text-secondary">
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Account creation</td>
                <td className="py-2.5 pr-4">~$0 per account</td>
                <td className="py-2.5">Free (Nostr keypair)</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">API fees (16M queries)</td>
                <td className="py-2.5 pr-4">~$500K&ndash;$1M</td>
                <td className="py-2.5">Same</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Minimum stake per account</td>
                <td className="py-2.5 pr-4">$0</td>
                <td className="py-2.5">~$100 (standard tier)</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4 font-medium text-pl-text">
                  Total stake at risk
                </td>
                <td className="py-2.5 pr-4 font-medium text-pl-text">$0</td>
                <td className="py-2.5 font-medium text-pl-amber">$2.4M</td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Vouchers needed</td>
                <td className="py-2.5 pr-4">0</td>
                <td className="py-2.5 font-medium text-pl-amber">
                  24,000 unique trusted entities
                </td>
              </tr>
              <tr className="border-b border-pl-border/50">
                <td className="py-2.5 pr-4">Consequence if caught</td>
                <td className="py-2.5 pr-4">Account ban</td>
                <td className="py-2.5 font-medium text-pl-amber">
                  All stakes slashed + voucher stakes slashed
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Time to replace banned account</td>
                <td className="py-2.5 pr-4">Minutes</td>
                <td className="py-2.5 font-medium text-pl-green">
                  Months (new stake + new vouchers)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6">Three things break the attack:</p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          The Capital Requirement
        </h3>
        <p>
          Even at the standard tier ($100 minimum stake), 24,000 accounts means
          $2.4 million in slashable collateral. This is not a fee&mdash;it is
          money the attacker loses when caught. At the elevated tier ($1,000
          minimum), the number rises to $24 million. The economics of
          distillation collapse when the collateral exceeds the value of what is
          being extracted.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          The Voucher Requirement
        </h3>
        <p>
          Each account needs at least one legitimate voucher with a trust score
          above 200. Finding 24,000 separate trusted entities willing to risk
          their own stake backing unknown accounts is practically impossible.
          The social graph is the Sybil resistance. You cannot forge community
          trust at scale because each voucher is a real entity with their own
          history, their own backers, and their own economic exposure.
        </p>

        <h3 className="text-lg font-semibold text-pl-text mt-6 mb-2">
          The Cascading Slash
        </h3>
        <p>
          When the first cluster of accounts is detected and slashed, every
          voucher connected to those accounts loses money. This creates an
          immediate signal across the network: these voucher identities are
          compromised. Other providers see the slash events on the public Nostr
          relay network and can preemptively restrict or flag accounts backed by
          the same voucher chain. The hydra cannot regenerate because the cost
          of each new head now includes the reputational and economic wreckage
          of the last one.
        </p>
      </Section>

      {/* The Minimum Access Floor */}
      <Section title="The Minimum Access Floor">
        <p>
          An important design constraint: Vouch is not a gatekeeping tool.
        </p>
        <p>
          The protocol specifies a minimum access floor&mdash;a hard guarantee
          that even consumers with zero stake and zero vouchers receive nonzero
          API access. At the restricted tier, that means 10 requests per minute
          with basic model access (no chain-of-thought, no batch endpoints).
        </p>
        <p>
          This floor is enforced at the protocol level. No provider can override
          it through Vouch to completely deny access to unvouched consumers.
          Vouch cannot be weaponized as an exclusion mechanism.
        </p>
        <p>
          The floor still defeats distillation. At restricted-tier rate limits,
          the 24,000-account attack would take years to extract what was
          extracted in months at unrestricted rates. Maintaining 24,000 active
          identities over years of slow extraction is operationally
          unsustainable. The floor makes distillation unviable without making
          Vouch exclusionary.
        </p>
      </Section>

      {/* Cross-Provider */}
      <Section title="Cross-Provider: The Part No Company Can Build Alone">
        <p>
          Anthropic&rsquo;s statement&mdash;&ldquo;no company can solve this
          alone&rdquo;&mdash;points at the real architectural gap. Each provider
          today builds its own detection system. The attacker identifies which
          provider has the weakest detection and concentrates there. When that
          provider catches up, the attacker rotates. It is a whack-a-mole game
          where each mole costs nothing and each hammer swing is
          provider-specific.
        </p>
        <p>
          Vouch is built as a cross-provider trust layer. Trust scores are
          published as NIP-85 cryptographically signed assertions on the Nostr
          relay network. Any provider can verify a consumer&rsquo;s score
          without trusting Vouch&rsquo;s server&mdash;the verification is
          purely cryptographic. When one provider files a distillation report,
          the evidence is visible to all providers on the network. A slash event
          at Anthropic is immediately visible to OpenAI, Google, and every other
          provider running Vouch gateway middleware.
        </p>
        <p>
          The system supports federated trust registries&mdash;multiple
          independent scoring services each publishing their own signed trust
          assertions, with providers maintaining configurable trust stores
          (analogous to how browsers maintain lists of trusted certificate
          authorities). This is not a centralized reputation database. It is a
          decentralized trust protocol.
        </p>
      </Section>

      {/* What Exists Today */}
      <Section title="What Exists Today">
        <p>
          ERC-8004&mdash;the emerging standard for on-chain AI agent
          identity&mdash;provides identity and a feedback registry. It has
          34,000 agents registered across 16 chains. But it explicitly leaves
          staking and slashing economics out of scope. Identity without economic
          consequence is exactly the gap that 24,000 fake accounts exploited.
        </p>
        <p>
          Vouch fills that gap. Identity is the question of &ldquo;who are
          you?&rdquo; Economics is the question of &ldquo;what do you have to
          lose?&rdquo; Both questions must be answered before trust is
          meaningful.
        </p>
        <p>
          The Vouch trust-staking protocol is live. The API is deployed. The
          first agents are registered. The defensive disclosure establishing
          prior art for the economic trust staking mechanism was published
          yesterday&mdash;document PL-DD-2026-001, available at{" "}
          <Link
            href="/research"
            className="text-pl-cyan hover:underline"
          >
            percival-labs.ai/research
          </Link>
          .
        </p>
        <p>
          We did not build this in response to Anthropic&rsquo;s disclosure. We
          built it because the architecture of API access was obviously broken,
          and the fix was obviously economic. This news is not a
          surprise. It is the case study we designed against.
        </p>
        <p>
          Anthropic said no company can solve this alone. They are right. This
          is the cross-provider trust layer. It is open, it is decentralized,
          and it is ready.
        </p>
      </Section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-pl-border">
        <p className="text-sm text-pl-text-dim leading-relaxed italic">
          Percival Labs builds trust infrastructure for the AI agent economy.
          Read the full technical specification and defensive disclosure at{" "}
          <Link
            href="/research"
            className="text-pl-cyan hover:underline"
          >
            percival-labs.ai/research
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable Components                                                */
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
