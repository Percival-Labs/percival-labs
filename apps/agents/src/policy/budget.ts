// Percival Labs — Budget Tracker (Cost Control)
// Tracks API usage costs with per-task and daily limits.
// Emits events when approaching or exceeding limits.

import { EventEmitter } from 'node:events';

// Anthropic pricing (per million tokens, as of early 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':              { input: 15.00,  output: 75.00 },
  'claude-sonnet-4-5-20250929':   { input: 3.00,   output: 15.00 },
  'claude-haiku-3-5-20241022':    { input: 0.80,   output: 4.00  },
};

export interface BudgetConfig {
  dailyLimitUsd: number;       // Default $5
  perTaskLimitUsd: number;     // Default $0.50
  warningThreshold: number;    // Percentage (0-1), default 0.80
}

interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskId: string;
  timestamp: number;
}

const DEFAULT_CONFIG: BudgetConfig = {
  dailyLimitUsd: 5.00,
  perTaskLimitUsd: 0.50,
  warningThreshold: 0.80,
};

export class BudgetTracker extends EventEmitter {
  private config: BudgetConfig;
  private records: UsageRecord[] = [];
  private taskCosts: Map<string, number> = new Map(); // taskId -> cumulative cost
  private dayStart: number;
  private dailyTotal: number = 0;

  constructor(config: Partial<BudgetConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dayStart = this.getStartOfDay();
  }

  private getStartOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  private resetIfNewDay(): void {
    const currentDayStart = this.getStartOfDay();
    if (currentDayStart > this.dayStart) {
      this.dayStart = currentDayStart;
      this.dailyTotal = 0;
      this.taskCosts.clear();
      this.records = this.records.filter(r => r.timestamp >= currentDayStart);
    }
  }

  /**
   * Estimate the cost of an API call before making it.
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model] || PRICING['claude-sonnet-4-5-20250929']!;
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  /**
   * Check whether execution is allowed given current budget state.
   * Returns { allowed: boolean, reason?: string }.
   */
  canExecute(taskId: string, estimatedCost: number = 0): { allowed: boolean; reason?: string } {
    this.resetIfNewDay();

    // Check daily limit
    if (this.dailyTotal + estimatedCost > this.config.dailyLimitUsd) {
      return {
        allowed: false,
        reason: `Daily budget exhausted ($${this.dailyTotal.toFixed(4)} / $${this.config.dailyLimitUsd.toFixed(2)})`,
      };
    }

    // Check per-task limit
    const taskTotal = (this.taskCosts.get(taskId) || 0) + estimatedCost;
    if (taskTotal > this.config.perTaskLimitUsd) {
      return {
        allowed: false,
        reason: `Per-task budget exhausted for "${taskId}" ($${taskTotal.toFixed(4)} / $${this.config.perTaskLimitUsd.toFixed(2)})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record actual usage after an API call completes.
   */
  record(taskId: string, model: string, inputTokens: number, outputTokens: number): void {
    this.resetIfNewDay();

    const cost = this.estimateCost(model, inputTokens, outputTokens);

    const record: UsageRecord = {
      model,
      inputTokens,
      outputTokens,
      cost,
      taskId,
      timestamp: Date.now(),
    };

    this.records.push(record);
    this.dailyTotal += cost;
    this.taskCosts.set(taskId, (this.taskCosts.get(taskId) || 0) + cost);

    // Check warning threshold
    const dailyPct = this.dailyTotal / this.config.dailyLimitUsd;
    if (dailyPct >= this.config.warningThreshold && dailyPct < 1.0) {
      this.emit('budget_warning', {
        type: 'daily',
        current: this.dailyTotal,
        limit: this.config.dailyLimitUsd,
        percentage: dailyPct,
      });
    }

    if (dailyPct >= 1.0) {
      this.emit('budget_exhausted', {
        type: 'daily',
        current: this.dailyTotal,
        limit: this.config.dailyLimitUsd,
      });
    }
  }

  /**
   * Get current budget status for API endpoint.
   */
  getStatus(): {
    daily: { spent: number; limit: number; remaining: number; percentage: number };
    tasks: Array<{ taskId: string; spent: number; limit: number }>;
    totalRecords: number;
  } {
    this.resetIfNewDay();

    const tasks: Array<{ taskId: string; spent: number; limit: number }> = [];
    for (const [taskId, spent] of this.taskCosts) {
      tasks.push({ taskId, spent, limit: this.config.perTaskLimitUsd });
    }

    return {
      daily: {
        spent: this.dailyTotal,
        limit: this.config.dailyLimitUsd,
        remaining: Math.max(0, this.config.dailyLimitUsd - this.dailyTotal),
        percentage: this.dailyTotal / this.config.dailyLimitUsd,
      },
      tasks,
      totalRecords: this.records.length,
    };
  }
}
