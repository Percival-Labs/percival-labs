/**
 * X Scanner -- Dual-format logger (JSON + human-readable)
 *
 * Writes to both stdout (readable) and a JSON log file for programmatic access.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PATHS } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

const minLevel: LogLevel = (process.env.XSCANNER_LOG_LEVEL as LogLevel) || 'info';

let logFileReady = false;
const logFilePath = join(PATHS.logDir, 'x-scanner.log');
const jsonLogPath = join(PATHS.logDir, 'x-scanner.jsonl');

function ensureLogDir(): void {
  if (logFileReady) return;
  if (!existsSync(PATHS.logDir)) {
    mkdirSync(PATHS.logDir, { recursive: true });
  }
  logFileReady = true;
}

export function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const now = new Date();
  const ts = now.toISOString();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: 'America/Los_Angeles',
  });

  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  const readable = `[${timeStr}] ${LEVEL_LABEL[level]} [${module}] ${message}${dataStr}`;
  console.log(readable);

  ensureLogDir();
  const jsonLine = JSON.stringify({ ts, level, module, message, ...data });
  try {
    appendFileSync(logFilePath, readable + '\n');
    appendFileSync(jsonLogPath, jsonLine + '\n');
  } catch {
    // Don't crash the daemon over a log write failure
  }
}
