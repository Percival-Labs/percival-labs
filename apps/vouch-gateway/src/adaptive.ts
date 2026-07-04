// Vouch Gateway — Adaptive Per-User Routing Layer
//
// Sits on top of the v12 heuristic classifier. Adjusts routing decisions
// based on accumulated user behavior signals stored per agent key in KV.
//
// Learning signals (no explicit feedback required):
//   1. Model override: user requests specific model instead of "smart" → our pick was wrong
//   2. Retry: same prompt sent again within 60s → previous response was inadequate
//   3. Short session: single request then nothing for 30min → might have been bad quality
//   4. Escalation: user switches from "smart" to explicit higher-tier model → we under-classified
//
// Profile structure: per-user bias adjustments to the heuristic score.
// If a user's prompts consistently need higher tiers than the classifier predicts,
// their profile accumulates a positive bias. And vice versa.
//
// Storage: Cloudflare KV under key `adaptive:{pubkey}` with 30-day TTL.
// Profile is a lightweight JSON blob (~200 bytes).

import type { Env } from './types';
import type { ClassificationResult, TaskComplexity } from './classifier';

// ── Profile ─────────────────────────────────────────────────────

export interface AdaptiveProfile {
  /** Score bias: positive = user needs higher tiers, negative = user is fine with cheaper */
  scoreBias: number;
  /** Total routing decisions observed for this user */
  totalDecisions: number;
  /** Number of times user overrode "smart" with explicit model (signal: we were wrong) */
  overrides: number;
  /** Number of retries detected (same prompt within 60s) */
  retries: number;
  /** Running accuracy estimate (correct decisions / total observed) */
  estimatedAccuracy: number;
  /** Last N prompt hashes for retry detection */
  recentPromptHashes: string[];
  /** Timestamp of last update */
  updatedAt: number;
}

const EMPTY_PROFILE: AdaptiveProfile = {
  scoreBias: 0,
  totalDecisions: 0,
  overrides: 0,
  retries: 0,
  estimatedAccuracy: 0.63, // start at corpus baseline
  recentPromptHashes: [],
  updatedAt: 0,
};

const PROFILE_TTL_S = 30 * 24 * 60 * 60; // 30 days
const RECENT_HASH_WINDOW = 10; // keep last 10 prompt hashes
const RETRY_WINDOW_MS = 60_000; // 60 seconds

// ── KV Operations ───────────────────────────────────────────────

function profileKey(pubkey: string): string {
  return `adaptive:${pubkey.slice(0, 16)}`;
}

export async function loadProfile(pubkey: string, env: Env): Promise<AdaptiveProfile> {
  try {
    const raw = await env.VOUCH_SCORES.get(profileKey(pubkey), 'json');
    if (raw) return raw as AdaptiveProfile;
  } catch {
    // KV miss or parse error
  }
  return { ...EMPTY_PROFILE };
}

export async function saveProfile(pubkey: string, profile: AdaptiveProfile, env: Env): Promise<void> {
  profile.updatedAt = Date.now();
  try {
    await env.VOUCH_SCORES.put(
      profileKey(pubkey),
      JSON.stringify(profile),
      { expirationTtl: PROFILE_TTL_S },
    );
  } catch {
    // Non-critical: profile save failure doesn't affect request
  }
}

// ── Prompt Hashing (lightweight, for retry detection) ───────────

function hashPrompt(text: string): string {
  // Simple hash: first 8 chars + length + last 8 chars
  // Not cryptographic, just for dedup detection
  const t = text.trim().toLowerCase();
  if (t.length < 20) return t;
  return `${t.slice(0, 8)}:${t.length}:${t.slice(-8)}`;
}

// ── Adaptive Classification ─────────────────────────────────────

/**
 * Adjust a classification result based on the user's adaptive profile.
 * Returns the adjusted complexity (may be bumped up or down one tier).
 */
export function adjustClassification(
  classification: ClassificationResult,
  profile: AdaptiveProfile,
): { adjustedComplexity: TaskComplexity; biasApplied: number } {
  const bias = profile.scoreBias;

  // Don't adjust if we haven't learned enough yet
  if (profile.totalDecisions < 5) {
    return { adjustedComplexity: classification.complexity, biasApplied: 0 };
  }

  const tierRank: Record<TaskComplexity, number> = {
    trivial: 0, simple: 1, moderate: 2, complex: 3, expert: 4,
  };
  const rankToTier: TaskComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'expert'];

  const currentRank = tierRank[classification.complexity];

  // Bias thresholds: need consistent signal before adjusting
  // +0.5 bias = bump up one tier, -0.5 = bump down one tier
  let adjustment = 0;
  if (bias > 0.5) adjustment = 1;
  else if (bias > 1.0) adjustment = 2;
  else if (bias < -0.5) adjustment = -1;
  else if (bias < -1.0) adjustment = -2;

  const adjustedRank = Math.max(0, Math.min(4, currentRank + adjustment));

  return {
    adjustedComplexity: rankToTier[adjustedRank]!,
    biasApplied: adjustment,
  };
}

// ── Learning Signals ────────────────────────────────────────────

/**
 * Record that the user used "smart" routing (implicit: our classification was acceptable).
 * Call this after every successful smart-routed request.
 */
export function recordSmartUsage(
  profile: AdaptiveProfile,
  promptText: string,
  classifiedComplexity: TaskComplexity,
): AdaptiveProfile {
  const hash = hashPrompt(promptText);
  const updated = { ...profile };

  // Check for retry (same prompt hash in recent window)
  const isRetry = updated.recentPromptHashes.includes(hash);
  if (isRetry) {
    updated.retries++;
    // Retry = our tier was probably too low, nudge bias up
    updated.scoreBias += 0.15;
  }

  // Update recent hashes
  updated.recentPromptHashes.push(hash);
  if (updated.recentPromptHashes.length > RECENT_HASH_WINDOW) {
    updated.recentPromptHashes.shift();
  }

  updated.totalDecisions++;

  // Decay bias slowly toward zero (prevents runaway drift)
  updated.scoreBias *= 0.98;

  return updated;
}

/**
 * Record that the user overrode "smart" with an explicit model.
 * This is a strong signal that our classification was wrong.
 */
export function recordOverride(
  profile: AdaptiveProfile,
  classifiedComplexity: TaskComplexity,
  requestedModel: string,
): AdaptiveProfile {
  const updated = { ...profile };
  updated.overrides++;
  updated.totalDecisions++;

  // Determine direction of override
  const tierRank: Record<TaskComplexity, number> = {
    trivial: 0, simple: 1, moderate: 2, complex: 3, expert: 4,
  };
  const classifiedRank = tierRank[classifiedComplexity];

  // Infer requested tier from model name
  let requestedRank = 2; // default to sonnet-equivalent
  const lower = requestedModel.toLowerCase();
  if (lower.includes('flash') || lower.includes('gemini')) requestedRank = 0;
  else if (lower.includes('haiku')) requestedRank = 1;
  else if (lower.includes('opus') || lower.includes('o3') || lower.includes('o1')) requestedRank = 4;
  else if (lower.includes('sonnet') || lower.includes('gpt-4o')) requestedRank = 2;

  // Adjust bias based on direction of override
  const delta = requestedRank - classifiedRank;
  // Scale the learning rate: bigger overrides = stronger signal
  updated.scoreBias += delta * 0.25;

  // Cap bias to prevent extreme drift
  updated.scoreBias = Math.max(-3, Math.min(3, updated.scoreBias));

  // Update accuracy estimate (exponential moving average)
  // Override = wrong classification
  updated.estimatedAccuracy = updated.estimatedAccuracy * 0.95 + 0 * 0.05;

  return updated;
}

/**
 * Record that the user's request succeeded without override or retry.
 * Positive signal: our classification was adequate.
 */
export function recordSuccess(profile: AdaptiveProfile): AdaptiveProfile {
  const updated = { ...profile };

  // Update accuracy estimate (exponential moving average)
  // No override/retry = correct classification
  updated.estimatedAccuracy = updated.estimatedAccuracy * 0.95 + 1 * 0.05;

  return updated;
}

// ── Transparency ────────────────────────────────────────────────

/**
 * Generate transparency headers for the adaptive layer.
 */
export function adaptiveHeaders(
  profile: AdaptiveProfile,
  biasApplied: number,
): Record<string, string> {
  if (profile.totalDecisions < 5) {
    return { 'X-Vouch-Adaptive': 'learning' };
  }

  return {
    'X-Vouch-Adaptive': 'active',
    'X-Vouch-Adaptive-Bias': profile.scoreBias.toFixed(2),
    'X-Vouch-Adaptive-Accuracy': (profile.estimatedAccuracy * 100).toFixed(0) + '%',
    'X-Vouch-Adaptive-Decisions': String(profile.totalDecisions),
    ...(biasApplied !== 0 ? { 'X-Vouch-Adaptive-Adjustment': String(biasApplied) } : {}),
  };
}
