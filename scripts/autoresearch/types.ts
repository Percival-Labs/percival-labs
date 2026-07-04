/**
 * Autoresearch — Shared Types
 */

/** A mutation produced by a domain's mutate() function */
export interface Mutation {
  /** Name of the variable that was changed */
  variable: string;
  /** Previous value */
  oldValue: unknown;
  /** New value */
  newValue: unknown;
  /** The full config with the mutation applied */
  config: Record<string, unknown>;
}

/** Result of a single experiment */
export interface ExperimentResult {
  iteration: number;
  variable: string;
  oldValue: unknown;
  newValue: unknown;
  score: number;
  baselineScore: number;
  kept: boolean;
  timestamp: string;
  config: Record<string, unknown>;
}

/** Summary of an entire autoresearch run */
export interface RunSummary {
  domain: string;
  timestamp: string;
  totalExperiments: number;
  wins: number;
  losses: number;
  baselineScore: number;
  bestScore: number;
  bestConfig: Record<string, unknown>;
  durationMs: number;
  converged: boolean;
  experiments: ExperimentResult[];
}

/**
 * Domain interface — each autoresearch domain implements this.
 *
 * Domains define:
 * - What the baseline config looks like
 * - How to mutate one variable at a time
 * - How to evaluate a config and return a numeric score
 */
export interface Domain {
  /** Human-readable domain name */
  name: string;

  /** Return the current baseline configuration */
  getBaseline(): Record<string, unknown>;

  /**
   * Mutate one variable from the given config.
   * Must return the variable name, old/new values, and the full mutated config.
   */
  mutate(config: Record<string, unknown>): Mutation;

  /**
   * Evaluate a config and return a numeric score.
   * Higher is better. The runner promotes configs with higher scores.
   */
  evaluate(config: Record<string, unknown>): Promise<number>;
}
