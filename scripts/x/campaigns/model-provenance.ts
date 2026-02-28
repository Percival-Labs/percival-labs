/**
 * Model Provenance Response to Nate B. Jones — Feb 25, 2026
 *
 * Two phases: Hook → Thread (35 min)
 *
 * Usage:
 *   bun scripts/x/campaigns/model-provenance.ts --dry-run
 *   bun scripts/x/campaigns/model-provenance.ts --at "2026-02-25T10:00:00-08:00"
 *   bun scripts/x/campaigns/model-provenance.ts --continue <tweet-id>
 */
import { enqueueCampaign, parseCampaignArgs } from "../lib";
import type { QueueCampaign } from "../types";

const opts = parseCampaignArgs(process.argv);

const HOOK = `.@NateBJones nailed it: the Anthropic distillation disclosure is not a Cold War story. It's a Napster story.

$2M in API costs to extract $2B in capabilities. 1,000:1 return on theft.

"The incentive to distill is literally universal."

He's right. And the response needs to be structural, not just detective work.

percival-labs.ai/research/model-provenance-trust-problem`;

const THREAD = [
  `@NateBJones just published the clearest analysis of what Anthropic's distillation disclosure actually means.

His key insight: distilled models occupy narrower capability manifolds. They look fine on benchmarks. They break on sustained agentic work.

"The provenance of a model is a capability question."

We'd extend that. It's a trust question. Here's why.`,

  `Jones identifies a gap no one is measuring:

— Narrow tasks: distilled models = 90% of frontier for 15% cost. Great trade.
— Sustained agentic work (hour 4, 6, 8): distilled models drop to ~40% effectiveness.

No eval suite captures this. "The evals that would measure sustained autonomous generality don't really exist yet."

Benchmarks test what distillers optimize for. That's the whole problem.`,

  `His proposed fix: the "off-manifold probe."

Run a real task on multiple models. When both succeed, change one constraint. Watch how each model adapts — or doesn't.

Genuine contribution. But it's manual, domain-specific, doesn't scale.

The agent economy needs this test running continuously, across every domain, with economic weight behind the results.`,

  `Jones frames Anthropic's countermeasures as "speed bumps" — they slow distillation, they don't stop it.

Correct. But speed bumps are passive. The distiller's calculation: if I'm not caught, extraction is free.

Economic staking changes that from binary to continuous. Extraction volume = compounding economic risk.

Speed bumps slow things down. Economic stakes make speeding expensive.`,

  `The deeper point: if provenance determines how a model breaks, the market needs a provenance signal.

Not benchmarks (gameable). Not marketing claims (unreliable). Not one-time testing (non-scalable).

Outcome-derived trust scores. Economically backed. Federated. Continuous.

Real-world performance compounded over time — not synthetic evals.`,

  `Jones closes with: "The people who route well — who match problems to models based on real understanding of representational depth, not marketing copy — will outperform."

Routing well requires trust infrastructure that makes provenance visible, verifiable, and economically meaningful.

Not a leaderboard. A ledger.

percival-labs.ai/research/model-provenance-trust-problem`,
];

const campaign: QueueCampaign = {
  id: "model-provenance-2026-02-25",
  label: "Model Provenance Response",
  scheduled: "",
  phases: [
    {
      label: "Hook Tweet",
      type: "tweet",
      content: HOOK,
    },
    {
      label: "Response Thread (6 tweets)",
      type: "thread",
      content: THREAD,
      delayMinutes: 35,
    },
  ],
};

enqueueCampaign(campaign, opts).catch(console.error);
