// Percival Labs -- Discord Bot Entry Point
// Initializes the Discord client, connects to the server,
// sets up intelligence channels and message handlers.

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { initMemoryDatabase } from '@percival/agent-memory';
import { ensureChannels, ensureOpsChannels, ensureAgentLogChannels } from './channels';
import { setupHandlers } from './bot';
import { AgentBridge } from './agent-bridge';
import { setupActivityFeed } from './activity';
import { setupOutputHandler } from './output';
import { setupTaskHandler } from './tasks';
import { setupProposalHandler } from './proposals';
import { setupCommands } from './commands';
import { setupXPosting } from './x-posting';
import { setupMentionHandler } from './mention';
import { setupAuditFeed } from './audit';
import { setupLedger } from './ledger';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;
const AGENTS_URL = process.env.AGENTS_URL || 'http://localhost:3200';
const AGENTS_API_KEY = process.env.AGENTS_API_KEY || '';

if (!BOT_TOKEN) {
  console.error('[FATAL] DISCORD_BOT_TOKEN is required');
  process.exit(1);
}
if (!GUILD_ID) {
  console.error('[FATAL] DISCORD_GUILD_ID is required');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const dbPath = process.env.DB_PATH || join(import.meta.dir, '..', '..', '..', 'data', 'agent-memory.db');
const db = initMemoryDatabase(dbPath);

// ---------------------------------------------------------------------------
// Discord Client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction],
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

client.once('ready', async () => {
  console.log(`[discord] Logged in as ${client.user?.tag}`);

  // Intelligence pipeline channels
  const channels = await ensureChannels(client, GUILD_ID!);
  console.log('[discord] Intelligence channels ready');

  setupHandlers(client, channels, db);
  console.log('[discord] Event handlers registered');

  // Operations channels + Agent bridge
  const opsChannels = await ensureOpsChannels(client, GUILD_ID!);
  console.log('[discord] Operations channels ready');

  // Agent log channels (per-agent verbose logging)
  const logChannels = await ensureAgentLogChannels(client, GUILD_ID!);
  console.log('[discord] Agent log channels ready');

  const bridge = new AgentBridge(AGENTS_URL, AGENTS_API_KEY);
  console.log(`[discord] Agent bridge connecting to ${AGENTS_URL}`);

  setupActivityFeed(client, bridge, opsChannels);
  setupOutputHandler(client, bridge, opsChannels, logChannels);
  setupTaskHandler(client, bridge, opsChannels);
  setupProposalHandler(client, bridge, opsChannels);
  setupCommands(client, bridge, opsChannels);
  setupXPosting(client, opsChannels);
  setupMentionHandler(client, bridge, opsChannels);
  setupAuditFeed(client, bridge, opsChannels);
  setupLedger(client, bridge, opsChannels);

  console.log('[discord] Bot is operational -- listening for links in #drop, tasks in #tasks, @mentions, and drafts in #x-content');
});

client.login(BOT_TOKEN);

// Startup banner
console.log('');
console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
console.log('\u2551    PERCIVAL LABS DISCORD BOT v0.1.0          \u2551');
console.log('\u2551    Intelligence Pipeline                     \u2551');
console.log('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
console.log('');
console.log('[discord] Connecting to Discord...');
