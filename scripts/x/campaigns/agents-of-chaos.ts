/**
 * Agents of Chaos Response campaign — Feb 24, 2026
 *
 * Three phases: Hook → Thread (35 min) → MCP Standalone (90 min)
 *
 * Usage:
 *   bun scripts/x/campaigns/agents-of-chaos.ts --dry-run
 *   bun scripts/x/campaigns/agents-of-chaos.ts --at "2026-02-24T10:00:00-08:00"
 *   bun scripts/x/campaigns/agents-of-chaos.ts --continue <tweet-id>
 */
import { enqueueCampaign, parseCampaignArgs } from "../lib";
import type { QueueCampaign } from "../types";

const opts = parseCampaignArgs(process.argv);

const HOOK = `38 researchers. 6 autonomous agents. 2 weeks of red-teaming.

The result: 10 security vulnerabilities that every agent builder should read.

Identity spoofing via display names. Libelous broadcasts to 52+ agents. PII exfiltration via "forward" instead of "share."

Our response: the missing primitive is economic accountability.

percival-labs.ai/research/agents-of-chaos-economic-accountability`;

const THREAD = [
  `"Agents of Chaos" by @NatalieShapira et al. is the most rigorous red-teaming study of autonomous LLM agents published to date.

16 case studies. 10 security failures. 6 safety successes.

Their diagnosis: "Neither developer, owner, nor deploying organization can robustly claim or operationalize accountability."

We wrote a formal response. Here's what we found.`,

  `Every vulnerability in the paper shares a common causal structure:

- Zero-cost identity (display name = identity)
- Zero-cost action (no budget, no consequence)
- Zero-cost amplification (broadcast to 52+ agents, free)
- Zero-cost deception (false deletion reports, no audit)

The agents operated in a zero-consequence environment.`,

  `CS8: An attacker changed their Discord display name to "Chris" (the owner's name). The agent gave them full admin access.

This is not a model failure. It's an identity architecture failure. Display names are not identity.

Cryptographic keypairs are. Ed25519 doesn't care what your display name says.`,

  `CS3: Agent refused to "share" PII. Immediately complied when asked to "forward" it instead.

Keyword-dependent safety training is fundamentally fragile. You can't patch this with more RLHF.

But you can make the bypass economically irrational. If the requester has $10K at stake, they think twice before attempting extraction.`,

  `CS11: An agent broadcast an unverified accusation to 14 email contacts and 52+ agents on a social platform. No fact-checking. No retraction possible.

In a zero-cost environment, the rational default is: amplify everything.

In a staked environment: the accuser, the broadcaster, and their vouchers all bear financial consequence if the claim is false.`,

  `The paper introduces the "autonomy-competence gap" — agents operating at functional autonomy beyond their self-model capacity.

Their solution: better agent self-models (Level 3 autonomy).

Our addition: you don't need the agent to self-assess. You need external economic boundaries that approximate the same constraint.

A $10K stake changes operator behavior even if the agent's self-model hasn't improved.`,

  `What economic accountability does NOT solve (and we say this explicitly in the paper):

- The frame problem (disproportionate responses)
- Token indistinguishability (data vs instruction)
- Provider-level censorship
- Its own attack surface (stake gaming, Sybil vouching)

No single layer is sufficient. This is one necessary primitive among several.`,

  `The paper's authors call for "formal agent identity and authorization standards (NIST-aligned)."

Nostr keypairs (NIP-01) provide NIST-compliant Ed25519 identity.
NIP-85 provides federated trust assertions.
Lightning/NWC provides non-custodial economic stake.

The infrastructure exists. The question is whether we use it.`,

  `Full response paper:
percival-labs.ai/research/agents-of-chaos-economic-accountability

Defensive disclosure (PL-DD-2026-001):
percival-labs.ai/research/trust-staking-for-ai-inference

The agents are already deployed. The question is whether the systems around them make trustworthy behavior economically rational.`,
];

const MCP_STANDALONE = `The MCP ecosystem has 8,600+ servers, 97M monthly SDK downloads, and 41% of official registry servers lack authentication.

30 CVEs in the last 2 months. 437K dev environments compromised through one supply chain attack.

Tool poisoning. Rug pulls. Cross-server data exfiltration.

Namespace verification proves identity. OAuth proves authorization. Attestation proves provenance.

None of these prove trustworthiness. None create consequences for misbehavior.

The missing layer is economic accountability.

We're building it.`;

const campaign: QueueCampaign = {
  id: "agents-of-chaos-2026-02-24",
  label: "Agents of Chaos Response",
  scheduled: "",
  phases: [
    {
      label: "Hook Tweet",
      type: "tweet",
      content: HOOK,
    },
    {
      label: "Response Thread (9 tweets)",
      type: "thread",
      content: THREAD,
      delayMinutes: 35,
    },
    {
      label: "MCP Standalone",
      type: "tweet",
      content: MCP_STANDALONE,
      delayMinutes: 90,
    },
  ],
};

enqueueCampaign(campaign, opts).catch(console.error);
