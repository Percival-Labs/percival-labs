// Vouch Gateway — Anomaly Detection
//
// Tracks per-consumer usage patterns in KV (rolling 24h window).
// Detects distillation, bot-like behavior, and volume spikes.
// Runs asynchronously — never blocks request forwarding.

import type { AnomalyData, AnomalyResult, Env } from './types';

// ── Configuration ──

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const MAX_TIMESTAMPS = 100;
const MAX_PROMPT_LENGTHS = 50;
const MIN_REQUESTS_FOR_DETECTION = 5;

// Anomaly thresholds
const COT_RATIO_THRESHOLD = 0.8; // >80% reasoning = likely distillation
const TIMING_VARIANCE_THRESHOLD = 0.1; // coefficient of variation < 0.1 = bot-like
const VOLUME_SPIKE_MULTIPLIER = 5; // current hour > 5x average = spike

// ── Data Initialization ──

/**
 * Create a fresh anomaly tracking data structure.
 */
export function createAnomalyData(): AnomalyData {
  return {
    hourlyRequests: {},
    reasoningRequests: 0,
    totalRequests: 0,
    requestTimestamps: [],
    modelsUsed: [],
    promptLengths: [],
    windowStart: Date.now(),
  };
}

// ── Request Recording ──

export interface RequestRecord {
  timestamp: number;
  model: string;
  isReasoning: boolean;
  promptLength: number;
}

/**
 * Record a new request into the anomaly tracking data.
 * Returns updated data (immutable — creates new object).
 */
export function recordRequest(
  data: AnomalyData,
  request: RequestRecord,
): AnomalyData {
  const hourKey = String(Math.floor(request.timestamp / 3_600_000));

  // Update hourly bucket
  const hourlyRequests = { ...data.hourlyRequests };
  hourlyRequests[hourKey] = (hourlyRequests[hourKey] ?? 0) + 1;

  // Update timestamps (cap at MAX_TIMESTAMPS, FIFO)
  let timestamps = [...data.requestTimestamps, request.timestamp];
  if (timestamps.length > MAX_TIMESTAMPS) {
    timestamps = timestamps.slice(timestamps.length - MAX_TIMESTAMPS);
  }

  // Update prompt lengths (cap at MAX_PROMPT_LENGTHS, FIFO)
  let promptLengths = [...data.promptLengths, request.promptLength];
  if (promptLengths.length > MAX_PROMPT_LENGTHS) {
    promptLengths = promptLengths.slice(promptLengths.length - MAX_PROMPT_LENGTHS);
  }

  // Update model set (deduplicate, cap at 50 to prevent unbounded growth)
  const MAX_MODELS = 50;
  const modelsUsed = data.modelsUsed.includes(request.model)
    ? data.modelsUsed
    : data.modelsUsed.length >= MAX_MODELS
      ? data.modelsUsed
      : [...data.modelsUsed, request.model];

  return {
    hourlyRequests,
    reasoningRequests: data.reasoningRequests + (request.isReasoning ? 1 : 0),
    totalRequests: data.totalRequests + 1,
    requestTimestamps: timestamps,
    modelsUsed,
    promptLengths,
    windowStart: data.windowStart,
  };
}

// ── Anomaly Detection ──

/**
 * Analyze usage patterns and return anomaly detection results.
 * Returns flagged=true if any pattern exceeds thresholds.
 */
export function detectAnomalies(data: AnomalyData): AnomalyResult {
  const reasons: string[] = [];

  // Skip detection with insufficient data
  if (data.totalRequests < MIN_REQUESTS_FOR_DETECTION) {
    return { flagged: false, reasons: [] };
  }

  // 1. CoT/reasoning ratio
  const cotRatio = data.reasoningRequests / data.totalRequests;
  if (cotRatio > COT_RATIO_THRESHOLD) {
    reasons.push(
      `High reasoning model ratio: ${(cotRatio * 100).toFixed(1)}% (threshold: ${COT_RATIO_THRESHOLD * 100}%)`,
    );
  }

  // 2. Request timing variance (coefficient of variation)
  if (data.requestTimestamps.length >= 5) {
    const intervals: number[] = [];
    for (let i = 1; i < data.requestTimestamps.length; i++) {
      intervals.push(data.requestTimestamps[i]! - data.requestTimestamps[i - 1]!);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean > 0) {
      const variance =
        intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
      const stddev = Math.sqrt(variance);
      const cv = stddev / mean; // coefficient of variation

      if (cv < TIMING_VARIANCE_THRESHOLD) {
        reasons.push(
          `Suspiciously uniform request timing: CV=${cv.toFixed(4)} (threshold: ${TIMING_VARIANCE_THRESHOLD})`,
        );
      }
    }
  }

  // 3. Volume spike detection
  const hourKeys = Object.keys(data.hourlyRequests);
  if (hourKeys.length >= 2) {
    // Sort by hour key (chronological)
    const sorted = hourKeys.sort();
    const currentHourKey = sorted[sorted.length - 1]!;
    const currentHourCount = data.hourlyRequests[currentHourKey] ?? 0;

    // Calculate average of previous hours
    const previousCounts = sorted
      .slice(0, -1)
      .map((k) => data.hourlyRequests[k] ?? 0);
    const avgPrevious =
      previousCounts.reduce((a, b) => a + b, 0) / previousCounts.length;

    if (avgPrevious > 0 && currentHourCount > avgPrevious * VOLUME_SPIKE_MULTIPLIER) {
      reasons.push(
        `Volume spike: ${currentHourCount} requests this hour vs ${avgPrevious.toFixed(1)} avg (${VOLUME_SPIKE_MULTIPLIER}x threshold)`,
      );
    }
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}

// ── KV-Backed Tracking ──

/**
 * Track a request in the anomaly detection system (KV-backed).
 * Non-blocking — uses waitUntil for async write.
 */
export async function trackRequest(
  pubkey: string,
  request: RequestRecord,
  env: Env,
): Promise<AnomalyResult> {
  const key = `anomaly:${pubkey}`;

  // Read existing data
  let data = await env.VOUCH_ANOMALY.get<AnomalyData>(key, 'json');

  // Initialize or reset if window expired
  if (!data || Date.now() - data.windowStart > WINDOW_24H_MS) {
    data = createAnomalyData();
  }

  // Record this request
  data = recordRequest(data, request);

  // Detect anomalies
  const result = detectAnomalies(data);

  // Write back to KV (24h expiry for auto-cleanup)
  await env.VOUCH_ANOMALY.put(key, JSON.stringify(data), {
    expirationTtl: 86_400, // 24 hours
  });

  return result;
}
