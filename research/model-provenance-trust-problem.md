# Model Provenance Is a Trust Problem, Not Just a Capability Problem

**Type:** Analysis
**Author:** Alan Carroll · Percival Labs
**Date:** February 25, 2026
**In response to:** Nate B. Jones, "Anthropic and AI's Napster Moment: Your AI Model Was Probably Built on Stolen Intelligence" (2026)

---

## Abstract

Nate B. Jones argues that Anthropic's distillation disclosure should be understood not as Cold War espionage but as a Napster-class piracy problem driven by a thousand-to-one extraction ratio. He identifies a critical under-measured risk: distilled models occupy narrower capability manifolds that fail on sustained agentic work in ways no current benchmark captures. We agree with this diagnosis and extend it. If model provenance determines how a model breaks — and it does — then provenance is not merely a capability question. It is a trust question. And trust questions require trust infrastructure: verifiable identity, economic stake, and outcome tracking that compounds over time. The same economic forces that make distillation inevitable also make economic accountability the only durable response.

---

## 1. The Napster Reframe

Jones's central argument deserves wider adoption. The Cold War framing of Anthropic's disclosure — three Chinese labs, 24,000 fake accounts, 16 million exchanges — serves Anthropic's policy interests but obscures the structural reality. As Jones puts it: "The incentive to distill frontier models is not specific to Chinese labs. It is literally universal."

The math is straightforward. Minimax ran 13 million exchanges against Claude. At retail API pricing, the extraction cost roughly $2 million. The capabilities extracted represent billions in training investment. A thousand-to-one return on theft. "No rational economic actor facing those odds leaves that money on the table."

This is correct, and it has a corollary that Jones identifies but doesn't fully develop: if the incentive is universal, then the response cannot be particular. Export controls, geographic restrictions, behavioral fingerprinting — these are necessary speed bumps. They buy time. But they address the symptom (Chinese labs doing the extraction) rather than the structure (extraction being economically rational for everyone).

The structural response requires changing the economics of extraction itself.

---

## 2. Narrower Manifolds, Wider Consequences

Jones introduces a geometric metaphor that clarifies what distillation actually costs. A frontier model like Opus 4.6, trained on diverse data over months of compute, occupies a wide manifold in capability space — broad competence across task types, tool combinations, and failure recovery strategies. A distilled model, trained on a subset of the frontier model's outputs, occupies a narrower manifold. It reproduces the specific behaviors the distiller captured. It falls off steeply when tasks move outside that distribution.

His framework maps this to a practical axis: task scope versus model provenance. On narrow, well-defined tasks, distilled models perform at 90% of frontier quality for 15% of the cost. On sustained agentic work — multi-hour autonomous workflows requiring tool improvisation, error recovery, and strategic adaptation — he estimates distilled models drop to roughly 40% effectiveness.

Jones illustrates this with Kimi K2. He uses it for PowerPoint generation, where it excels. For sustained agentic work, he switches to Opus 4.6 every time, because K2 "doesn't have that generalizable performance." The model breaks differently. A frontier model encountering an unexpected error reroutes — tries a different library, restructures its approach, asks for clarification. A narrower model "either fails, loops, or produces a technically valid but strategically incorrect workaround."

The critical observation: no existing eval suite captures this. "The evals that would measure sustained autonomous generality don't really exist yet, and that's actually one of the larger problems in AI right now."

This is where provenance becomes a trust problem.

---

## 3. The Off-Manifold Probe

Jones proposes a practical test he calls the "off-manifold probe." Take a real task in your domain. Run it on different models. When both succeed, change one constraint — not the whole task, one variable. Watch what happens. Does the model adapt, identifying which parts of its reasoning transfer and which need revision? Or does it regenerate everything from scratch, or worse, force-fit the old solution to new constraints?

This is a genuine contribution to the model evaluation conversation. It tests for representational depth rather than benchmark performance. But it has a limitation Jones acknowledges: "I cannot write that test for you." The off-manifold probe is inherently domain-specific, manual, and non-scalable.

This is the gap that economic accountability fills. Not by replacing the off-manifold probe, but by creating a system where the results of real-world model performance — across thousands of domains, millions of tasks, running continuously — compound into a verifiable trust signal.

Vouch's outcome tracking does for model provenance what Jones's off-manifold probe does for individual evaluation: it measures generality through actual performance rather than synthetic benchmarks. When an agent backed by a specific model fails on an out-of-distribution task at hour six of an autonomous workflow, that failure is recorded. When it succeeds, that succeeds is recorded. The trust score reflects not what the model claims on benchmarks, but how it actually performs when the work is real and the stakes are non-zero.

Over time, the trust scores of agents running frontier models will diverge from those running distilled models — not because anyone labels them as such, but because the manifold compression shows up in real-world outcomes. The market discovers provenance through performance, verified economically.

---

## 4. Speed Bumps Need Economic Teeth

Jones's speed bump metaphor is apt. Anthropic's countermeasures — behavioral fingerprinting, detection classifiers, intelligence sharing — won't stop distillation. They slow it down. And when capabilities double every 90 days, a three-month delay is meaningful competitive advantage.

But speed bumps are passive. They impose friction through detection and enforcement. The distiller's calculation remains: if I'm not caught, the extraction is free. The risk is binary — zero or ban — not proportional.

Economic staking changes this calculation from binary to continuous. In a Vouch-integrated system, accessing a frontier model requires pre-committed economic stake. The stake isn't a subscription fee — it's a bond that is partially or fully forfeited upon verified misuse, including systematic distillation patterns. The cost of extraction scales with the volume of extraction, not as a flat rate but as compounding economic risk.

This addresses Jones's core observation about the thousand-to-one ratio. If extracting 13 million exchanges requires maintaining economic stake proportional to the extraction volume — and if that stake is subject to slashing upon detection — the ratio compresses. Not to one-to-one. But from a thousand-to-one toward something that no longer overwhelms rational caution.

Speed bumps slow things down. Economic stakes make speeding expensive.

---

## 5. Provenance as Market Signal

Jones closes with practical advice: "The people who route well, who match problems to models based on a real understanding of representational depth, not marketing copy, those people will outperform the ones who use one tool for everything and who pick the cheap one."

He is describing a market that needs a trust signal. Currently, model routing decisions are based on benchmarks (gameable), marketing claims (unreliable), and personal experience (non-scalable). Jones's off-manifold probe improves on all three but remains manual and domain-specific.

The agent economy needs a provenance signal that is:
- **Continuous**, not binary (not just "frontier" versus "distilled" but a spectrum of verified generality)
- **Outcome-derived**, not self-reported (based on actual performance across real tasks, not benchmark claims)
- **Economically backed** (stakeholders have skin in the game — their assessment carries financial weight)
- **Federated**, not centralized (no single provider controls the trust signal)

This is what Vouch's trust scoring provides. An agent's trust score reflects its verified performance history, backed by economic stake from the community that vouches for it. A model that performs well on narrow tasks but fails on sustained agentic work will have a trust profile that reflects exactly that — not because someone tested it once, but because the economic system surfaces the manifold width through continuous real-world outcomes.

Jones is right that "the provenance of a model is not just an ethical question. It's a capability question." We would add: it's a capability question that only trust infrastructure can answer at scale.

---

## Conclusion

Jones's Napster reframe is more useful than the Cold War narrative because it identifies the correct force: economic pressure gradients, not geopolitical adversaries. Distillation will happen because the economics are overwhelming. The question is what infrastructure exists to make the consequences of that distillation legible to the market.

Benchmarks can't do it — they're optimized for the exact tasks distillers target. Self-reported provenance can't do it — everyone claims to be frontier. Manual testing can't do it — it doesn't scale.

What can do it is a system where real-world performance, verified by economic stake, compounds into a trust signal that the market can read. Not a leaderboard. A ledger.

The agents are already being deployed. The models underneath them exist on a spectrum of provenance. The question is whether the systems around them make that provenance visible, verifiable, and economically meaningful — or whether we continue choosing tools based on marketing copy and hope for the best.

---

*Percival Labs builds trust infrastructure for the AI agent economy. Read the full Vouch technical specification and research at [percival-labs.ai/research](https://percival-labs.ai/research).*
