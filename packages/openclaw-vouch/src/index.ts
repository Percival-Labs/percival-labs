import type {
  OpenClawPluginAPI,
  VouchPluginConfig,
  HookContext,
  HookResult,
} from './types.js';
import { VouchPluginClient } from './vouch-client.js';
import { shouldAllowTool } from './policy.js';
import { createLogger } from './logger.js';

/**
 * OpenClaw plugin: Vouch Trust Verification
 *
 * Gates tool execution by agent trust score. Agents must earn reputation
 * through the Vouch network before executing sensitive tools.
 *
 * Default export for OpenClaw plugin loading.
 */
export default function activate(
  api: OpenClawPluginAPI,
  config: VouchPluginConfig = {},
): void {
  const client = new VouchPluginClient(config);
  const log = createLogger('info');

  log.info('Vouch plugin activated', { npub: client.npub });

  // Auto-register if configured
  if (config.autoRegister) {
    client
      .ensureRegistered(config.agentName ?? 'openclaw-agent')
      .catch((err) => {
        log.error('Auto-registration failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  // Pre-tool execution: gate by trust score
  api.registerHook(
    'preToolExecution',
    async (ctx: HookContext): Promise<HookResult> => {
      if (!ctx.tool) return { allow: true };

      // Fast-path: check allowlist before hitting network
      if (config.allowlistedTools?.includes(ctx.tool.name)) {
        return {
          allow: true,
          metadata: { vouch: { allowlisted: true } },
        };
      }

      try {
        const score = await client.getScore();
        const decision = shouldAllowTool(ctx.tool.name, score.score, config);

        if (!decision.allowed) {
          log.warn('Tool execution blocked', {
            tool: ctx.tool.name,
            reason: decision.reason,
            score: score.score,
          });
          return {
            allow: false,
            metadata: {
              vouch: {
                blocked: true,
                reason: decision.reason,
                score: score.score,
              },
            },
          };
        }

        return {
          allow: true,
          metadata: {
            vouch: { score: score.score, tier: score.tier },
          },
        };
      } catch (err) {
        // Fail open if Vouch API is unreachable
        log.error('Score check failed, failing open', {
          tool: ctx.tool.name,
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          allow: true,
          metadata: { vouch: { error: 'score_check_failed' } },
        };
      }
    },
    {
      name: 'vouch-trust-gate',
      description: 'Gates tool execution by Vouch trust score',
    },
  );

  // Post-tool execution: log outcomes (opt-in)
  if (config.logOutcomes) {
    api.registerHook(
      'postToolExecution',
      async (ctx: HookContext): Promise<HookResult> => {
        if (!ctx.tool || !ctx.result) return {};

        try {
          // Only log significant tools, not reads/lookups
          const significantTools = [
            'shell',
            'write',
            'edit',
            'http',
            'email',
            'message',
          ];
          const isSignificant = significantTools.some((t) =>
            ctx.tool!.name.toLowerCase().includes(t),
          );

          if (isSignificant) {
            await client.reportOutcome({
              counterparty: ctx.agentId,
              taskType: `tool:${ctx.tool.name}`,
              success: ctx.result.success,
              evidence: ctx.result.error || `Tool ${ctx.tool.name} executed`,
            });
          }
        } catch {
          // Don't block on logging failures
        }

        return {};
      },
      {
        name: 'vouch-outcome-logger',
        description: 'Logs tool outcomes to Vouch transaction history',
      },
    );
  }

  // Error hook: track failures
  api.registerHook(
    'onError',
    async (ctx: HookContext): Promise<HookResult> => {
      if (ctx.tool && ctx.result?.error) {
        log.warn('Tool execution error', {
          tool: ctx.tool.name,
          error: ctx.result.error,
        });
      }
      return {};
    },
    {
      name: 'vouch-error-tracker',
      description: 'Tracks tool execution errors',
    },
  );
}

// Named exports for programmatic use
export { VouchPluginClient } from './vouch-client.js';
export { shouldAllowTool } from './policy.js';
export type {
  VouchPluginConfig,
  OpenClawPluginAPI,
  HookContext,
  HookResult,
  HookHandler,
  HookMeta,
} from './types.js';
