// providers.test.ts — Provider routing and model access tests
// TDD RED phase

import { describe, expect, it } from 'bun:test';
import {
  getProviderConfig,
  isModelAllowed,
  extractModelFromRequest,
  PROVIDER_CONFIGS,
} from '../src/providers';
import type { TrustTier } from '../src/types';

describe('getProviderConfig', () => {
  it('returns anthropic config for /anthropic/ path', () => {
    const config = getProviderConfig('/anthropic/v1/messages');
    expect(config).not.toBeNull();
    expect(config!.id).toBe('anthropic');
  });

  it('returns openai config for /openai/ path', () => {
    const config = getProviderConfig('/openai/v1/chat/completions');
    expect(config).not.toBeNull();
    expect(config!.id).toBe('openai');
  });

  it('returns null for unknown provider', () => {
    const config = getProviderConfig('/unknown/v1/messages');
    expect(config).toBeNull();
  });

  it('returns null for root path', () => {
    const config = getProviderConfig('/');
    expect(config).toBeNull();
  });
});

describe('isModelAllowed', () => {
  const anthropic = PROVIDER_CONFIGS.anthropic;

  it('allows basic models for restricted tier', () => {
    expect(isModelAllowed('claude-3-5-haiku-20241022', 'restricted', anthropic)).toBe(true);
  });

  it('denies non-basic models for restricted tier', () => {
    expect(isModelAllowed('claude-3-5-sonnet-20241022', 'restricted', anthropic)).toBe(false);
  });

  it('allows all models for standard tier', () => {
    expect(isModelAllowed('claude-3-5-sonnet-20241022', 'standard', anthropic)).toBe(true);
  });

  it('denies reasoning models for standard tier', () => {
    expect(isModelAllowed('claude-3-7-sonnet-thinking', 'standard', anthropic)).toBe(false);
  });

  it('allows reasoning models for elevated tier', () => {
    expect(isModelAllowed('claude-3-7-sonnet-thinking', 'elevated', anthropic)).toBe(true);
  });

  it('allows all models for unlimited tier', () => {
    expect(isModelAllowed('claude-3-7-sonnet-thinking', 'unlimited', anthropic)).toBe(true);
    expect(isModelAllowed('claude-3-5-haiku-20241022', 'unlimited', anthropic)).toBe(true);
  });

  it('allows unknown models at standard+ tier (permissive default)', () => {
    expect(isModelAllowed('claude-4-future', 'standard', anthropic)).toBe(true);
    expect(isModelAllowed('claude-4-future', 'restricted', anthropic)).toBe(false);
  });
});

describe('extractModelFromRequest', () => {
  it('extracts model from Anthropic messages request body', () => {
    const body = { model: 'claude-3-5-sonnet-20241022', messages: [] };
    expect(extractModelFromRequest(body)).toBe('claude-3-5-sonnet-20241022');
  });

  it('extracts model from OpenAI chat request body', () => {
    const body = { model: 'gpt-4o', messages: [] };
    expect(extractModelFromRequest(body)).toBe('gpt-4o');
  });

  it('returns null for missing model field', () => {
    const body = { messages: [] };
    expect(extractModelFromRequest(body)).toBeNull();
  });

  it('returns null for non-string model field', () => {
    const body = { model: 123, messages: [] };
    expect(extractModelFromRequest(body)).toBeNull();
  });
});
