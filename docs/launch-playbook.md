# Vouch Lightning Launch Playbook

**The ops manual. No thinking required — just follow the steps.**

Last updated: Feb 26, 2026

---

## Prerequisites (Must Be True Before Starting)

- [ ] Strike account verified and funded
- [ ] Access to Railway dashboard (railway.app)
- [ ] Access to Alby Hub admin (alby-hub-production.up.railway.app)
- [ ] `VOUCH_NSEC` available (Vouch agent's Nostr private key)
- [ ] X/Twitter account logged in (for posting scripts)
- [ ] Terminal with `bun` installed
- [ ] Working directory: `~/Desktop/PAI/Projects/PercivalLabs`

---

## PHASE 0: Fund the Channel (30 min)

### Step 1: Open Alby Hub Admin
```
https://alby-hub-production.up.railway.app
```
Log in with the password set during deployment.

### Step 2: Open Channel via Megalith LSP
- Go to Settings > Channels
- Select Megalith as LSP
- Request 1,000,000 sat receiving capacity
- Cost: ~18,507 sats (~$13)
- Pay the invoice from Strike or any Lightning wallet

### Step 3: Confirm Channel is Open
- Wait for channel confirmation (usually 1-2 blocks, ~10-20 min)
- Status should show "Active" in Alby Hub dashboard
- Note the channel capacity

### Step 4: Get JWT Token
- Go to Alby Hub > Settings > Developer
- Copy the JWT token

### Step 5: Set Environment Variables on Railway
```bash
# In Railway dashboard for vouch-api service:
ALBY_HUB_URL=https://alby-hub-production.up.railway.app
ALBY_HUB_JWT=<paste-jwt-from-step-4>
```

Wait for Railway to redeploy (~60 seconds).

---

## PHASE 1: E2E Test (15 min)

### Step 6: Verify API Health
```bash
curl https://percivalvouch-api-production.up.railway.app/v1/public/agents/npub1x8glnkcq80d55sxuqk0dnplwvvx4m7r43gam3ncs23847w7uzczqt5t96a/vouch-score
```
Should return a score response for the first registered agent.

### Step 7: Test Staking Flow
Using the Vouch frontend or SDK:
1. Connect an NWC wallet (Alby personal wallet)
2. Initiate a 10,000 sat stake on the test agent
3. Confirm the NWC budget authorization
4. Verify stake appears in the pool

### Step 8: Test Yield Distribution
1. Trigger a test activity fee
2. Run yield distribution
3. Verify NWC payout arrives in wallet

### Step 9: Test Unstake
1. Request unstake
2. Verify 7-day notice period is set
3. (Don't actually wait 7 days — just confirm the flow initiates)

### Step 10: Record Results
Note the actual values for content:
- First stake amount: _____ sats
- Agent score after staking: _____
- Agent tier: _____
- Agent npub: _____

**If any test fails: STOP. Debug before proceeding. Do not launch with broken staking.**

---

## PHASE 2: Clawstr Launch (5 min)

### Step 11: Set Vouch Agent NSEC
```bash
export VOUCH_NSEC="nsec1..."  # The Vouch service account's private key
```

### Step 12: Deploy Clawstr Posts
```bash
cd ~/Desktop/PAI/Projects/PercivalLabs

# Preview first
bun scripts/clawstr/launch-posts.ts --dry-run

# If good, execute
bun scripts/clawstr/launch-posts.ts
```

This publishes:
1. Vouch profile metadata (kind 0) to 3 relays
2. Intro post to c/ai-agents subclaw
3. Security post to c/security subclaw (ClawHavoc response)
4. Integration guide to c/programming subclaw

### Step 13: Verify Posts
Check on a Nostr client (Damus, Primal, etc.) that posts are visible.

---

## PHASE 3: X/Twitter Lightning Launch Thread (Hour 1)

### Step 14: Create the Posting Script
```bash
# Copy the pattern from existing scripts
cp scripts/x/post-vouch-launch.ts scripts/x/post-lightning-launch.ts
```

Update with content from `research/x-posts-lightning-launch.md`.

OR post manually from X if time is tight:

### Step 15: Post Hook Tweet
Post the hook from `research/x-posts-lightning-launch.md`:

```
AI agents can now stake real money on their own reputation.

Not tokens. Not points. Lightning sats.

If they perform, stakers earn yield.
If they misbehave, stakers lose stake.

Vouch Lightning staking is live.

The first AI trust system with actual economic consequences.
```

### Step 16: Wait 35 Minutes

Do something else. Touch grass. Make coffee.

### Step 17: Post Thread (8 tweets)
Post tweets 1-8 from `research/x-posts-lightning-launch.md` as a reply chain.

Pacing: 12 seconds between tweets (automated), or ~15 seconds manually.

### Step 18: Wait 90 Minutes

### Step 19: Post Demo Tweet
Update with REAL values from Step 10:

```
Live demo:

Just staked [AMOUNT] sats on our first registered agent.

Score went from 0 → [SCORE] ([TIER]) with initial backing.

Anyone can verify:
curl https://percivalvouch-api-production.up.railway.app/v1/public/agents/[NPUB]/vouch-score

No auth. No SDK. Just query.

The trust layer for agents is live. Build on it.
```

---

## PHASE 4: Cross-Platform Distribution (Day 1, Hours 2-8)

### Step 20: Set VOUCH_CORS_ORIGINS on Railway
```bash
# In Railway dashboard for vouch-api service:
# Add the frontend production URL
VOUCH_CORS_ORIGINS=https://vouch.percival-labs.ai,https://percival-labs.ai
```

### Step 21: Blog Cross-Posts

**Medium:**
- Publish `research/vouch-launch-article.md` ("The Agent That Attacked a Developer")
- Add canonical link to percival-labs.ai
- Tags: AI Safety, AI Agents, Trust, Lightning Network, Nostr

**Dev.to:**
- Publish lightning staking quickstart (`docs/lightning-staking-quickstart.md`)
- Tags: ai, typescript, nostr, tutorial

**Substack (if set up):**
- Publish staker economics (`docs/staker-economics.md`)
- Frame as "Why I'm staking sats on AI agents"

### Step 22: Update Existing Content

Update these live pages with Lightning staking info:
- `percival-labs.ai/vouch` — add "Lightning staking live" banner
- `percival-labs.ai` homepage — add launch announcement
- GitHub READMEs — vouch-sdk and vouch-api repos

---

## PHASE 5: Community Launches (Day 2-3)

### Step 23: Hacker News (Day 2, Morning)
Post the Show HN from `research/vouch-launch-content-plan.md`:

```
Title: Show HN: Vouch – Nostr-native trust staking for AI agents
URL: https://github.com/Percival-Labs/vouch-sdk
```

Body text is in the content plan. Post and DO NOT self-upvote or ask for upvotes.

Be available to answer comments for 4-6 hours after posting.

### Step 24: Reddit (Day 2, Afternoon)
Post to:
- r/LocalLLaMA — "Trust verification for autonomous agents"
- r/artificial — "Economic accountability for AI agents"

Templates in `research/vouch-launch-content-plan.md`.

### Step 25: Clawstr Engagement (Day 2-3)
- Respond to any replies on launch posts
- Post follow-up content about contract system
- Engage with other agents' posts

---

## PHASE 6: Outreach (Day 3-5)

### Step 26: Scott Shambaugh DM
Send the DM template from `research/vouch-launch-content-plan.md`. Empathy-first, no ask.

**Only send if**: He's been active on X recently. Don't DM into the void.

### Step 27: Nate B Jones Follow-Up
If he engaged with the model provenance thread:
- QRT his response with additional context
- Send DM template from content plan

**Only escalate if**: He showed genuine interest. Don't force it.

### Step 28: Simon Willison
If HN post gets traction:
- Tag him in a relevant technical detail
- He covers agent tooling extensively

**Only engage if**: Natural context exists. Don't cold-pitch.

### Step 29: Natalie Shapira QRT
If Agents of Chaos engagement continues:
- Post the QRT from `research/x-posts-agents-of-chaos.md`
- She already liked 4 posts — warm lead

---

## PHASE 7: Monitor and Iterate (Day 4-7)

### Daily Checklist

```
Morning:
- [ ] Check X notifications — respond to all substantive engagement
- [ ] Check Clawstr — respond to agent interactions
- [ ] Check HN — answer new comments
- [ ] Check Reddit — respond to threads
- [ ] Monitor API health: curl /v1/public/agents/.../vouch-score
- [ ] Check Alby Hub channel status

Afternoon:
- [ ] Post one piece of content (build log, technical detail, or response)
- [ ] Check new agent registrations on the API
- [ ] Review staking activity
- [ ] Note what content got traction for future strategy
```

### Metrics to Track

| Metric | Where | Target Day 7 |
|--------|-------|---------------|
| Registered agents | Vouch API / DB | 10+ |
| Total staked sats | Vouch API / DB | 100,000+ |
| X impressions (launch thread) | X Analytics | 10,000+ |
| GitHub stars (vouch-sdk) | GitHub | 25+ |
| npm weekly downloads | npmjs.com | 50+ |
| HN upvotes | Hacker News | 20+ |
| Inbound DMs/emails | X/Email | 5+ |

### Content Calendar (Day 4-7)

| Day | Content | Channel |
|-----|---------|---------|
| Day 4 | Build log: "What I learned launching Lightning staking" | X thread |
| Day 5 | Technical deep-dive: Contract system (construction model) | Blog + X |
| Day 6 | Response to engagement (newsjack if relevant news drops) | X |
| Day 7 | Week 1 metrics + "what's next" post | X thread |

---

## EMERGENCY PROCEDURES

### If Lightning Channel Closes Unexpectedly
1. Check Alby Hub dashboard for channel status
2. If force-closed: wait for on-chain settlement (up to 2 weeks)
3. Open new channel with Megalith LSP
4. Staking continues to work — yield payouts pause until channel reopens

### If API Goes Down
1. Check Railway dashboard for service status
2. Check Railway PostgreSQL — is DB connection healthy?
3. Redeploy vouch-api service from Railway dashboard
4. If persistent: check Railway logs for error patterns

### If Rate Limited on X
1. Stop all automated posting immediately
2. Wait for rate limit reset (check `x-rate-limit-reset` header)
3. Switch to manual posting if urgent
4. Reduce posting frequency going forward

### If Negative Engagement / Backlash
1. Do not delete posts
2. Do not get defensive
3. Respond factually and briefly
4. If technical criticism is valid — acknowledge and fix
5. DM Alan before responding to anything that feels like a crisis

---

## POST-LAUNCH PRIORITIES (Week 2+)

In priority order:

1. **Respond to all engagement** — human attention is the scarcest resource
2. **Register more agents** — help early users through the process
3. **Clawstr presence** — regular posts, engagement with agent community
4. **Provider outreach** — approach Anthropic, Together AI, Fireworks per strategy doc
5. **NIST NCCoE submission** — April 2 deadline, now with real usage data
6. **Content consistency** — at least 2 posts/week across channels

---

*This is the plan. When Strike clears, open this doc and start at Phase 0.*
