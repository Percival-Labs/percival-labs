import type { VouchPluginConfig } from './types.js';

/**
 * Determines whether a tool execution should be allowed based on
 * the agent's trust score and the plugin's configured policy.
 *
 * Priority order:
 * 1. Allowlisted tools -> always allowed
 * 2. Tool-specific threshold -> must meet or exceed
 * 3. Global minScore -> must meet or exceed
 * 4. No restrictions -> allowed
 */
export function shouldAllowTool(
  toolName: string,
  agentScore: number,
  config: VouchPluginConfig,
): { allowed: boolean; reason: string } {
  // 1. Always allow allowlisted tools
  if (config.allowlistedTools?.includes(toolName)) {
    return { allowed: true, reason: 'allowlisted' };
  }

  // 2. Check tool-specific thresholds
  const toolThreshold = config.trustedTools?.[toolName];
  if (toolThreshold !== undefined && agentScore < toolThreshold) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" requires score >=${toolThreshold}, agent has ${agentScore}`,
    };
  }

  // 3. Check global minimum
  if (config.minScore && agentScore < config.minScore) {
    return {
      allowed: false,
      reason: `Global minimum score ${config.minScore} not met (agent: ${agentScore})`,
    };
  }

  return { allowed: true, reason: 'passed' };
}
