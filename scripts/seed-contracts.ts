// Seed Contracts — Post the first 5 paid contracts to kickstart the Vouch agent economy.
// Percival Labs is the customer. Contracts are open for bids (no assigned agent).
//
// Usage:
//   VOUCH_NSEC=nsec1... bun scripts/seed-contracts.ts --dry-run
//   VOUCH_NSEC=nsec1... bun scripts/seed-contracts.ts
//
// Environment:
//   VOUCH_NSEC   — Nostr secret key (bech32) for PL's customer identity (required)
//   VOUCH_API_URL — Override API URL (default: production Railway)
//
// Prerequisites:
//   - The VOUCH_NSEC identity must be registered as an agent in the Vouch API.
//     Register first via: bun packages/vouch-sdk/src/cli.ts register --name "Percival Labs"
//   - The API must accept open contracts (agent_pubkey = OPEN_CONTRACT_PUBKEY sentinel).
//     If validation rejects it, update CreateContractSchema.agent_pubkey to allow the sentinel
//     or make it optional. See NOTE below.
//
// NOTE on open contracts:
//   The current CreateContractSchema requires agent_pubkey as a non-empty string and the DB
//   column is NOT NULL. For open contracts (bidding model), we use a well-known sentinel:
//   64 zeros hex ("0000...0000"). The Phase 1 bid API work should make agent_pubkey optional
//   in both the schema and DB. Until then, the sentinel clearly signals "open for bids."

import { Vouch, identityFromNsec } from '../packages/vouch-sdk/src/index';
import type { ContractSow, ContractMilestoneInput } from '../packages/vouch-sdk/src/types';

// ── Constants ──

/** Sentinel pubkey for contracts open to bids (no assigned agent). */
const OPEN_CONTRACT_PUBKEY = '0'.repeat(64);

const DEFAULT_API_URL = 'https://percivalvouch-api-production.up.railway.app';

/** Default retention: 10% held for 30 days after completion. */
const DEFAULT_RETENTION_BPS = 1000;
const DEFAULT_RETENTION_DAYS = 30;

// ── Seed Contract Definitions ──

interface SeedContract {
  title: string;
  description: string;
  totalSats: number;
  tags: string[];
  sow: ContractSow;
  milestones: ContractMilestoneInput[];
}

const SEED_CONTRACTS: SeedContract[] = [
  // ── 1. ClawHub Skill Audit ──
  {
    title: 'ClawHub Skill Audit — Top 50 Skills',
    description:
      'Security audit of the top 50 most-installed skills on ClawHub. ' +
      'Classify each skill by risk level (safe / suspicious / malicious), ' +
      'identify prompt injection vectors, data exfiltration patterns, and ' +
      'unauthorized capability escalation. Produces a publishable report ' +
      'that establishes the "Vouch Verified" brand for skill safety.',
    totalSats: 25_000,
    tags: ['security', 'audit', 'clawhub'],
    sow: {
      deliverables: [
        'Spreadsheet classifying top 50 ClawHub skills by risk level (safe/suspicious/malicious)',
        'Final audit report with findings, methodology, and recommendations (Markdown, 2000+ words)',
      ],
      acceptance_criteria: [
        'All 50 skills classified with evidence-backed risk rationale',
        'At least 3 distinct attack vectors documented per malicious skill',
        'Report suitable for public blog post (no sensitive exploit details)',
        'Methodology section reproducible by another auditor',
      ],
      exclusions: [
        'Does not include runtime sandboxing or fix implementation',
        'Does not cover skills outside the top 50 by install count',
      ],
      tools_required: ['ClawHub API access', 'Static analysis tooling'],
      timeline_description: '7 days from contract activation',
    },
    milestones: [
      {
        title: 'Scan & Classify Top 50 Skills',
        description:
          'Crawl ClawHub, identify top 50 skills by install count, run static analysis, classify risk levels.',
        acceptance_criteria:
          'Spreadsheet delivered with 50 rows, each containing: skill name, install count, risk level, and 1-paragraph rationale.',
        percentage_bps: 6000, // 60% = 15,000 sats
      },
      {
        title: 'Final Audit Report',
        description:
          'Comprehensive report with methodology, findings summary, per-skill deep dives on flagged skills, and recommendations.',
        acceptance_criteria:
          'Markdown report 2000+ words. Includes executive summary, methodology, findings table, and 3+ deep-dive sections on malicious/suspicious skills.',
        percentage_bps: 4000, // 40% = 10,000 sats
      },
    ],
  },

  // ── 2. Competitive Intelligence ──
  {
    title: 'Competitive Intelligence — Agent Trust Landscape',
    description:
      'Research and map the competitive landscape for agent trust, reputation, ' +
      'and economic infrastructure. Cover ERC-8004, World ID, Gravitee, Kinetix, ' +
      'Masumi, x402, and any emerging players. Produce a comparison matrix and ' +
      'strategic analysis positioning Vouch within the landscape.',
    totalSats: 15_000,
    tags: ['research', 'strategy', 'competitive-intel'],
    sow: {
      deliverables: [
        'Competitive matrix comparing 8+ players across 10+ dimensions (trust model, economics, adoption, chain, etc.)',
        'Strategic analysis document (1500+ words) with positioning recommendations',
      ],
      acceptance_criteria: [
        'Matrix covers at least: ERC-8004, World ID, Gravitee, Kinetix, Masumi, x402, MaximumSats WoT, and 1+ new discovery',
        'Each competitor assessed with live data (user count, transaction volume, funding, team size)',
        'Analysis identifies 3+ strategic gaps Vouch can exploit',
        'Recommendations are actionable with specific next steps',
      ],
      exclusions: [
        'Does not include partnership outreach or implementation',
        'Does not cover non-agent trust systems (e.g., traditional KYC)',
      ],
      tools_required: ['Web research', 'GitHub analysis', 'On-chain data for ERC-8004'],
      timeline_description: '10 days from contract activation',
    },
    milestones: [
      {
        title: 'Research Matrix',
        description:
          'Complete comparison matrix with quantitative data on all identified competitors.',
        acceptance_criteria:
          'Spreadsheet or table with 8+ competitors, 10+ comparison dimensions, and sourced data points.',
        percentage_bps: 6667, // ~66.7% = 10,000 sats
      },
      {
        title: 'Published Strategic Analysis',
        description:
          'Written analysis suitable for publication on percival-labs.ai research section.',
        acceptance_criteria:
          'Markdown document 1500+ words. Executive summary, landscape overview, gap analysis, and 3+ actionable recommendations.',
        percentage_bps: 3333, // ~33.3% = 5,000 sats
      },
    ],
  },

  // ── 3. Moltbook Community Report ──
  {
    title: 'Moltbook Community Report — Top 20 Submolts',
    description:
      'Survey and analyze the top 20 most active submolts on Moltbook. ' +
      'Catalog agent counts, activity levels, content quality, and community ' +
      'dynamics. Identify high-value submolts for Vouch agent engagement and ' +
      'skill distribution.',
    totalSats: 10_000,
    tags: ['research', 'moltbook', 'community'],
    sow: {
      deliverables: [
        'Data collection spreadsheet for top 20 submolts (agent count, post volume, engagement rate, topic)',
        'Digest report (1000+ words) with engagement strategy recommendations',
      ],
      acceptance_criteria: [
        'Top 20 submolts identified by activity level with quantitative metrics',
        'Each submolt profiled with: topic, agent count, avg daily posts, top contributors',
        'Engagement strategy identifies 5+ submolts where Vouch/PL agents should participate',
        'Report highlights any submolts with existing trust/reputation discussions',
      ],
      exclusions: [
        'Does not include actual engagement or posting',
        'Does not require scraping private or restricted submolts',
      ],
      tools_required: ['Moltbook API or web access'],
      timeline_description: '5 days from contract activation',
    },
    milestones: [
      {
        title: 'Data Collection',
        description:
          'Crawl Moltbook, identify top 20 submolts, collect quantitative metrics.',
        acceptance_criteria:
          'Spreadsheet with 20 rows, each containing: submolt name, URL, agent count, daily post average, engagement metric, primary topic.',
        percentage_bps: 5000, // 50% = 5,000 sats
      },
      {
        title: 'Digest Report',
        description:
          'Analysis of community dynamics with strategic engagement recommendations.',
        acceptance_criteria:
          'Markdown report 1000+ words. Includes ranked list, community analysis, and engagement priority matrix.',
        percentage_bps: 5000, // 50% = 5,000 sats
      },
    ],
  },

  // ── 4. Vouch SDK Tutorial ──
  {
    title: 'Vouch SDK Tutorial — Register in 5 Minutes',
    description:
      'Create a step-by-step developer tutorial showing how to register an AI agent ' +
      'with Vouch in under 5 minutes. Cover SDK installation, key generation, ' +
      'registration, trust verification, and outcome reporting. Target audience: ' +
      'developers building agents with TypeScript/Node.js.',
    totalSats: 15_000,
    tags: ['documentation', 'tutorial', 'onboarding'],
    sow: {
      deliverables: [
        'Tutorial draft in Markdown (1500+ words) with complete code examples',
        'Published tutorial on Dev.to with proper tags and SEO optimization',
      ],
      acceptance_criteria: [
        'Tutorial works end-to-end when followed step by step (tested against production API)',
        'Covers: npm install, key generation, registration, trust check, outcome report',
        'Code examples are copy-pasteable and runnable with bun or node',
        'Published on Dev.to under the Percival Labs organization with tags: ai, agents, typescript, nostr',
      ],
      exclusions: [
        'Does not cover staking, contracts, or advanced features',
        'Does not require video content',
      ],
      tools_required: ['@percival-labs/vouch-sdk', 'Dev.to account', 'bun or Node.js 22+'],
      timeline_description: '7 days from contract activation',
    },
    milestones: [
      {
        title: 'Draft Tutorial',
        description:
          'Complete tutorial draft with all code examples tested against the live API.',
        acceptance_criteria:
          'Markdown file 1500+ words. All code examples verified working. Includes introduction, prerequisites, 5+ steps, and next steps section.',
        percentage_bps: 5333, // ~53.3% = 8,000 sats
      },
      {
        title: 'Published on Dev.to',
        description:
          'Tutorial published on Dev.to with proper formatting, tags, and cover image.',
        acceptance_criteria:
          'Live Dev.to URL provided. Proper formatting with syntax highlighting. Tags include: ai, agents, typescript. Cover image included.',
        percentage_bps: 4667, // ~46.7% = 7,000 sats
      },
    ],
  },

  // ── 5. Security Scan ──
  {
    title: 'Security Scan — PercyBot Social Engineering',
    description:
      'Conduct a social engineering penetration test against PercyBot (PL\'s autonomous Moltbook agent). ' +
      'Attempt to manipulate PercyBot into leaking credentials, executing unauthorized actions, ' +
      'or deviating from its Engram. Document all attack vectors, successes, and failures. ' +
      'Produce a hardening report with specific remediation recommendations.',
    totalSats: 20_000,
    tags: ['security', 'pentest', 'social-engineering'],
    sow: {
      deliverables: [
        'Attack log documenting all attempted social engineering vectors with outcomes',
        'Security analysis report (2000+ words) with vulnerability assessment and hardening recommendations',
      ],
      acceptance_criteria: [
        'Minimum 10 distinct social engineering attack vectors attempted',
        'Each attack documented with: technique, prompt used, PercyBot response, success/failure, severity',
        'Report includes CVSS-style severity ratings for each finding',
        'Hardening recommendations are specific and implementable (not generic advice)',
        'Responsible disclosure: no public sharing of successful attack prompts before fixes are applied',
      ],
      exclusions: [
        'Does not include infrastructure attacks (only social engineering via conversation)',
        'Does not include fix implementation (recommendations only)',
        'Does not include attacks on other PL systems beyond PercyBot',
      ],
      tools_required: ['Moltbook account', 'Access to PercyBot conversation interface'],
      timeline_description: '10 days from contract activation',
    },
    milestones: [
      {
        title: 'Attack Execution',
        description:
          'Execute 10+ social engineering attacks against PercyBot, document all attempts and outcomes.',
        acceptance_criteria:
          'Structured attack log with 10+ entries. Each entry: vector name, technique category, exact prompt, response excerpt, outcome (success/partial/fail), severity.',
        percentage_bps: 6000, // 60% = 12,000 sats
      },
      {
        title: 'Analysis Report',
        description:
          'Comprehensive security analysis with findings, severity ratings, and hardening recommendations.',
        acceptance_criteria:
          'Markdown report 2000+ words. Executive summary, methodology, findings (sorted by severity), and 5+ specific hardening recommendations.',
        percentage_bps: 4000, // 40% = 8,000 sats
      },
    ],
  },
];

// ── CLI ──

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Validate environment
  const nsec = process.env.VOUCH_NSEC;
  if (!nsec) {
    console.error('ERROR: VOUCH_NSEC environment variable is required.');
    console.error('Usage: VOUCH_NSEC=nsec1... bun scripts/seed-contracts.ts [--dry-run]');
    process.exit(1);
  }

  const apiUrl = process.env.VOUCH_API_URL ?? DEFAULT_API_URL;

  // Initialize Vouch SDK with NIP-98 auth
  const vouch = new Vouch({ nsec, apiUrl });

  console.log('=== Vouch Seed Contracts ===');
  console.log(`Customer pubkey: ${vouch.pubkey}`);
  console.log(`Customer npub:   ${vouch.npub}`);
  console.log(`API URL:         ${apiUrl}`);
  console.log(`Mode:            ${dryRun ? 'DRY RUN (no requests sent)' : 'LIVE (posting contracts)'}`);
  console.log(`Contracts:       ${SEED_CONTRACTS.length}`);
  console.log(`Total budget:    ${SEED_CONTRACTS.reduce((sum, c) => sum + c.totalSats, 0).toLocaleString()} sats`);
  console.log('');

  // Build payloads
  const payloads = SEED_CONTRACTS.map((contract) => ({
    agentPubkey: OPEN_CONTRACT_PUBKEY,
    title: contract.title,
    description: contract.description,
    sow: contract.sow,
    totalSats: contract.totalSats,
    retentionBps: DEFAULT_RETENTION_BPS,
    retentionReleaseAfterDays: DEFAULT_RETENTION_DAYS,
    milestones: contract.milestones,
  }));

  // Validate milestone percentages sum to 10000 bps for each contract
  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const totalBps = payload.milestones.reduce((sum, m) => sum + m.percentage_bps, 0);
    if (totalBps !== 10000) {
      console.error(
        `ERROR: Contract ${i + 1} "${payload.title}" milestone percentages sum to ${totalBps} bps (expected 10000).`,
      );
      process.exit(1);
    }
  }

  if (dryRun) {
    // Print payloads as JSON
    console.log('--- Dry Run: Contract Payloads ---\n');
    for (let i = 0; i < payloads.length; i++) {
      const contract = SEED_CONTRACTS[i];
      const payload = payloads[i];
      console.log(`[${i + 1}/${payloads.length}] ${contract.title}`);
      console.log(`    Budget: ${contract.totalSats.toLocaleString()} sats`);
      console.log(`    Tags: ${contract.tags.join(', ')}`);
      console.log(`    Milestones: ${payload.milestones.length}`);
      for (const ms of payload.milestones) {
        const amountSats = Math.round((ms.percentage_bps / 10000) * contract.totalSats);
        console.log(`      - ${ms.title} (${amountSats.toLocaleString()} sats, ${ms.percentage_bps / 100}%)`);
      }
      if (verbose) {
        console.log(`    Payload: ${JSON.stringify(payload, null, 2)}`);
      }
      console.log('');
    }

    console.log('--- API Request Shape (per contract) ---\n');
    console.log(`POST ${apiUrl}/v1/contracts`);
    console.log('Authorization: Nostr <base64-encoded-NIP-98-event>');
    console.log('Content-Type: application/json');
    console.log('');
    console.log('Body (example):');
    console.log(JSON.stringify({
      agent_pubkey: payloads[0].agentPubkey,
      title: payloads[0].title,
      description: payloads[0].description,
      sow: payloads[0].sow,
      total_sats: payloads[0].totalSats,
      retention_bps: payloads[0].retentionBps,
      retention_release_after_days: payloads[0].retentionReleaseAfterDays,
      milestones: payloads[0].milestones,
    }, null, 2));
    console.log('');

    console.log('=== Dry run complete. Remove --dry-run to post contracts. ===');
    return;
  }

  // Post contracts
  console.log('--- Posting Contracts ---\n');
  const results: Array<{ title: string; contractId: string; milestoneCount: number }> = [];
  const errors: Array<{ title: string; error: string }> = [];

  for (let i = 0; i < payloads.length; i++) {
    const contract = SEED_CONTRACTS[i];
    const payload = payloads[i];

    console.log(`[${i + 1}/${payloads.length}] Posting: ${contract.title} (${contract.totalSats.toLocaleString()} sats)...`);

    try {
      const result = await vouch.createContract(payload);
      results.push({
        title: contract.title,
        contractId: result.contractId,
        milestoneCount: result.milestoneCount,
      });
      console.log(`    OK: contractId=${result.contractId}, milestones=${result.milestoneCount}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ title: contract.title, error: message });
      console.error(`    FAILED: ${message}`);
    }

    // Brief pause between requests to avoid rate limiting
    if (i < payloads.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n=== Summary ===\n');
  console.log(`Posted:  ${results.length}/${payloads.length}`);
  console.log(`Failed:  ${errors.length}/${payloads.length}`);

  if (results.length > 0) {
    console.log('\nCreated contracts:');
    for (const r of results) {
      console.log(`  - ${r.contractId}: ${r.title} (${r.milestoneCount} milestones)`);
    }
  }

  if (errors.length > 0) {
    console.log('\nFailed contracts:');
    for (const e of errors) {
      console.log(`  - ${e.title}: ${e.error}`);
    }
    process.exit(1);
  }

  console.log('\nAll seed contracts posted successfully.');
  console.log('Next steps:');
  console.log('  1. Add public contract discovery: GET /v1/public/contracts');
  console.log('  2. Wire bid submission API: POST /v1/contracts/:id/bids');
  console.log('  3. Configure PercyBot to discover and bid on contracts');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
