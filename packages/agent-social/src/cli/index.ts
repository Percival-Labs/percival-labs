#!/usr/bin/env node
/**
 * agent-social CLI — stateful social engagement for AI agents.
 *
 * Commands:
 *   scan      Check for new activity (cursor-based, dedup)
 *   publish   Post or reply (idempotent, content-hash dedup)
 *   status    Show engagement state summary
 *   health    Show relay/API health report
 *   migrate   Import legacy engagement-log.json
 */

import { StateStore } from '../core/state-store.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_STATE_DIR = '.agent-social';
const DEFAULT_STATE_FILE = 'state.json';

function getStatePath(): string {
  const dir = process.env.AGENT_SOCIAL_STATE_DIR ?? DEFAULT_STATE_DIR;
  return join(dir, DEFAULT_STATE_FILE);
}

function printUsage(): void {
  console.log(`
agent-social — Stateful social engagement toolkit for AI agents

USAGE:
  agent-social <command> [options]

COMMANDS:
  status              Show engagement state summary
  health              Show relay/API health report
  migrate <file>      Import legacy engagement-log.json
  help                Show this help message

ENVIRONMENT:
  AGENT_SOCIAL_STATE_DIR    State directory (default: .agent-social)
  VOUCH_NSEC                Nostr secret key (nsec1...)
  MOLTBOOK_API_KEY          Moltbook API key (moltbook_sk_...)

EXAMPLES:
  agent-social status
  agent-social health
  agent-social migrate ./engagement-log.json
`);
}

async function cmdStatus(): Promise<void> {
  const store = new StateStore(getStatePath());
  const summary = store.getSummary();

  console.log('\n📊 Engagement State Summary\n');
  console.log(`  Seen events:      ${summary.seenEvents}`);
  console.log(`  Published hashes: ${summary.publishedHashes}`);
  console.log(`  Log entries:      ${summary.engagementEntries}`);
  console.log(`  Tracked relays:   ${summary.trackedRelays}`);

  if (Object.keys(summary.cursors).length > 0) {
    console.log('\n  Cursors:');
    for (const [platform, cursor] of Object.entries(summary.cursors)) {
      console.log(`    ${platform}: ${cursor}`);
    }
  } else {
    console.log('\n  No cursors set (first scan will fetch all history)');
  }
  console.log();
}

async function cmdHealth(): Promise<void> {
  const store = new StateStore(getStatePath());
  const health = store.getRelayHealth();

  console.log('\n🏥 Relay Health Report\n');

  if (Object.keys(health).length === 0) {
    console.log('  No relay health data yet. Run a scan first.\n');
    return;
  }

  for (const [url, entry] of Object.entries(health)) {
    const total = entry.successCount + entry.failureCount;
    const rate = total > 0 ? ((entry.successCount / total) * 100).toFixed(0) : '—';
    const status = entry.cooldownUntil
      ? `⏸ cooldown until ${entry.cooldownUntil}`
      : entry.consecutiveFailures > 0
        ? `⚠ ${entry.consecutiveFailures} consecutive failures`
        : '✓ healthy';

    console.log(`  ${url}`);
    console.log(`    Success rate: ${rate}% (${entry.successCount}/${total})`);
    console.log(`    Status: ${status}`);
    if (entry.lastSuccess) console.log(`    Last success: ${entry.lastSuccess}`);
    if (entry.lastFailure) console.log(`    Last failure: ${entry.lastFailure}`);
    console.log();
  }
}

async function cmdMigrate(legacyFile: string): Promise<void> {
  if (!existsSync(legacyFile)) {
    console.error(`File not found: ${legacyFile}`);
    process.exit(1);
  }

  const store = new StateStore(getStatePath());

  try {
    const raw = readFileSync(legacyFile, 'utf-8');
    const legacyLog = JSON.parse(raw);

    const { imported } = store.importLegacyLog(legacyLog);
    store.forceSave();

    console.log(`\n✅ Imported ${imported} events from legacy log.`);
    console.log(`   State saved to: ${getStatePath()}\n`);
  } catch (err) {
    console.error(`Failed to import: ${err}`);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'status':
    await cmdStatus();
    break;
  case 'health':
    await cmdHealth();
    break;
  case 'migrate':
    if (!args[1]) {
      console.error('Usage: agent-social migrate <engagement-log.json>');
      process.exit(1);
    }
    await cmdMigrate(args[1]);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printUsage();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
