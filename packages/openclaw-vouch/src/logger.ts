/**
 * Structured logging for the Vouch OpenClaw plugin.
 * Writes to stderr to avoid polluting tool output.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

export function createLogger(minLevel: LogLevel = 'info'): Logger {
  const minOrder = LEVEL_ORDER[minLevel];

  function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < minOrder) return;

    const entry = {
      ts: new Date().toISOString(),
      level,
      plugin: 'vouch',
      msg,
      ...data,
    };

    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
  };
}
