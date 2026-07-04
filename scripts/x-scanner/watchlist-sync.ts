/**
 * X Scanner -- Watchlist Sync
 *
 * Reads messages from Discord #watchlist channel and updates
 * the local watchlist.json file. Runs on each tick.
 *
 * Message format (any of these work):
 *   @jeffweinstein x
 *   jeffweinstein x — Stripe agent payments
 *   @someone ig — fashion influencer
 *   remove @jeffweinstein x
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { WATCHLIST } from './config.js';
import { log } from './logger.js';

const DISCORD_API = 'https://discord.com/api/v10';
const CHANNEL_ID = '1482860733355003904'; // #watchlist

interface WatchlistEntry {
  handle: string;
  note: string;
}

interface WatchlistData {
  x: WatchlistEntry[];
  instagram: WatchlistEntry[];
  updatedAt: string;
  lastMessageId?: string;
}

function loadWatchlist(): WatchlistData {
  try {
    if (existsSync(WATCHLIST.filePath)) {
      return JSON.parse(readFileSync(WATCHLIST.filePath, 'utf-8'));
    }
  } catch {}
  return { x: [], instagram: [], updatedAt: new Date().toISOString() };
}

function saveWatchlist(data: WatchlistData): void {
  data.updatedAt = new Date().toISOString();
  writeFileSync(WATCHLIST.filePath, JSON.stringify(data, null, 2) + '\n');
}

interface DiscordMessage {
  id: string;
  content: string;
  author: { bot?: boolean; username: string };
}

export async function syncWatchlist(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;

  const wl = loadWatchlist();

  // Fetch messages after the last one we processed
  let url = `${DISCORD_API}/channels/${CHANNEL_ID}/messages?limit=20`;
  if (wl.lastMessageId) {
    url += `&after=${wl.lastMessageId}`;
  }

  let messages: DiscordMessage[];
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bot ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return;
    messages = await res.json() as DiscordMessage[];
  } catch {
    return;
  }

  if (messages.length === 0) return;

  // Discord returns newest first — process oldest first
  messages.reverse();

  let changes = 0;

  for (const msg of messages) {
    if (msg.author.bot) continue;

    const line = msg.content.trim();
    if (!line) continue;

    const parsed = parseWatchlistCommand(line);
    if (!parsed) continue;

    if (parsed.action === 'add') {
      const list = parsed.platform === 'x' ? wl.x : wl.instagram;
      const exists = list.some((e) => e.handle.toLowerCase() === parsed.handle.toLowerCase());
      if (!exists) {
        list.push({ handle: parsed.handle, note: parsed.note });
        changes++;
        log('info', 'watchlist', `Added @${parsed.handle} to ${parsed.platform}`, { note: parsed.note });
      }
    } else if (parsed.action === 'remove') {
      const list = parsed.platform === 'x' ? wl.x : wl.instagram;
      const idx = list.findIndex((e) => e.handle.toLowerCase() === parsed.handle.toLowerCase());
      if (idx >= 0) {
        list.splice(idx, 1);
        changes++;
        log('info', 'watchlist', `Removed @${parsed.handle} from ${parsed.platform}`);
      }
    }
  }

  // Track last processed message
  wl.lastMessageId = messages[messages.length - 1].id;

  if (changes > 0) {
    saveWatchlist(wl);
    log('info', 'watchlist', `Watchlist updated: ${changes} changes`, {
      xHandles: wl.x.length,
      igHandles: wl.instagram.length,
    });
  } else {
    // Still save to update lastMessageId
    saveWatchlist(wl);
  }
}

interface ParsedCommand {
  action: 'add' | 'remove';
  platform: 'x' | 'instagram';
  handle: string;
  note: string;
}

function parseWatchlistCommand(line: string): ParsedCommand | null {
  const lower = line.toLowerCase().trim();

  // Check for remove prefix
  const isRemove = lower.startsWith('remove ');
  const content = isRemove ? line.slice(7).trim() : line.trim();

  // Pattern: @handle platform — optional note
  // Or: handle platform — optional note
  const match = content.match(/^@?(\w+)\s+(x|ig|instagram|twitter)(?:\s*[—-]\s*(.+))?$/i);
  if (!match) return null;

  const handle = match[1];
  let platform: 'x' | 'instagram';
  const platformStr = match[2].toLowerCase();

  if (platformStr === 'x' || platformStr === 'twitter') {
    platform = 'x';
  } else {
    platform = 'instagram';
  }

  const note = match[3]?.trim() || '';

  return {
    action: isRemove ? 'remove' : 'add',
    platform,
    handle,
    note,
  };
}
