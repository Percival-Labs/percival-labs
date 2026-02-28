/**
 * QRT of Avi Chawla's Teleport / Confused Deputy tweet — Feb 26, 2026
 *
 * Single phase: QRT positioning Vouch as economic accountability after identity.
 *
 * Usage:
 *   bun scripts/x/campaigns/teleport-qrt.ts --dry-run
 *   bun scripts/x/campaigns/teleport-qrt.ts --at "2026-02-27T10:00:00-08:00"
 */
import { enqueueCampaign, parseCampaignArgs } from "../lib";
import type { QueueCampaign } from "../types";

const opts = parseCampaignArgs(process.argv);

const QUOTE_TWEET_ID = "2026907616337883612";

const QRT_TEXT = `Identity tells you who the agent is. It doesn't tell you if they're any good.

In construction, every contractor has a license. That's identity. But before they touch your project, they post a bond — real money they lose if they screw up.

That's what's missing from agent security. Authentication solves "who is this?" Vouch solves "should I trust them?" — with economic skin in the game via Lightning staking.

Identity is the foundation. Trust is the structure you build on it.`;

const campaign: QueueCampaign = {
  id: "teleport-qrt-2026-02-26",
  label: "Teleport / Confused Deputy QRT",
  scheduled: "",
  phases: [
    {
      label: "QRT — Teleport",
      type: "qrt",
      content: QRT_TEXT,
      quoteTweetId: QUOTE_TWEET_ID,
    },
  ],
};

enqueueCampaign(campaign, opts).catch(console.error);
