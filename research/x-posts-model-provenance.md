# X Posts — Model Provenance Response to Nate B. Jones

## Hook Post (standalone, post first)

.@NateBJones nailed it: the Anthropic distillation disclosure is not a Cold War story. It's a Napster story.

$2M in API costs to extract $2B in capabilities. 1,000:1 return on theft.

"The incentive to distill is literally universal."

He's right. And the response needs to be structural, not just detective work.

percival-labs.ai/research/model-provenance-trust-problem

---

## Thread (post 30+ min after hook)

### Post 1 (thread opener)

@NateBJones just published the clearest analysis of what Anthropic's distillation disclosure actually means.

His key insight: distilled models occupy narrower capability manifolds. They look fine on benchmarks. They break on sustained agentic work.

"The provenance of a model is a capability question."

We'd extend that. It's a trust question. Here's why. 🧵

### Post 2

Jones identifies a gap no one is measuring:

— Narrow tasks: distilled models = 90% of frontier for 15% cost. Great trade.
— Sustained agentic work (hour 4, 6, 8): distilled models drop to ~40% effectiveness.

No eval suite captures this. "The evals that would measure sustained autonomous generality don't really exist yet."

He's right. Benchmarks test what distillers optimize for. That's the whole problem.

### Post 3

His proposed fix: the "off-manifold probe."

Run a real task on multiple models. When both succeed, change one constraint. Watch how each model adapts — or doesn't.

It's a genuine contribution. But it's manual, domain-specific, and doesn't scale.

The agent economy needs this test running continuously, across every domain, with economic weight behind the results.

### Post 4

Jones frames Anthropic's countermeasures as "speed bumps" — they slow distillation, they don't stop it.

Correct. But speed bumps are passive. The distiller's calculation: if I'm not caught, extraction is free.

Economic staking changes that from binary (caught/not caught) to continuous. Accessing frontier models requires pre-committed stake. Extraction volume = compounding economic risk.

Speed bumps slow things down. Economic stakes make speeding expensive.

### Post 5

The deeper point: if provenance determines how a model breaks, the market needs a provenance signal.

Not benchmarks (gameable). Not marketing claims (unreliable). Not one-time testing (non-scalable).

Outcome-derived trust scores. Economically backed. Federated. Continuous.

Real-world performance, compounded over time, surfacing manifold width through actual results — not synthetic evals.

### Post 6

Jones closes with: "The people who route well — who match problems to models based on real understanding of representational depth, not marketing copy — will outperform."

We agree. And routing well requires trust infrastructure that makes provenance visible, verifiable, and economically meaningful.

Not a leaderboard. A ledger.

Full analysis: percival-labs.ai/research/model-provenance-trust-problem

---

## QRT for Nate's original video (optional, if engagement warrants)

This is the best analysis I've seen of what distillation actually means for people building on AI.

The Napster reframe > the Cold War narrative. The off-manifold probe > benchmarks. The manifold compression framework > vibes.

We wrote a response extending the provenance → trust infrastructure connection.

percival-labs.ai/research/model-provenance-trust-problem
