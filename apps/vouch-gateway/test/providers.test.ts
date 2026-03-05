// providers.test.ts — Provider routing and model extraction tests

import { describe, expect, it } from 'bun:test';
import {
  getProviderConfig,
  extractModelFromRequest,
  isReasoningModel,
  getUpstreamPath,
  PROVIDER_CONFIGS,
} from '../src/providers';

describe('getProviderConfig', () => {
  it('returns anthropic config for /anthropic/ path', () => {
    const config = getProviderConfig('/anthropic/v1/messages');
    expect(config).not.toBeNull();
    expect(config).not.toBe('auto');
    if (config && config !== 'auto') expect(config.id).toBe('anthropic');
  });

  it('returns openai config for /openai/ path', () => {
    const config = getProviderConfig('/openai/v1/chat/completions');
    expect(config).not.toBeNull();
    expect(config).not.toBe('auto');
    if (config && config !== 'auto') expect(config.id).toBe('openai');
  });

  it('returns openrouter config for /openrouter/ path', () => {
    const config = getProviderConfig('/openrouter/v1/chat/completions');
    expect(config).not.toBeNull();
    expect(config).not.toBe('auto');
    if (config && config !== 'auto') expect(config.id).toBe('openrouter');
  });

  it('returns auto for /auto/ path', () => {
    const config = getProviderConfig('/auto/v1/chat/completions');
    expect(config).toBe('auto');
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

describe('getUpstreamPath', () => {
  it('strips provider prefix from path', () => {
    expect(getUpstreamPath('/anthropic/v1/messages')).toBe('/v1/messages');
    expect(getUpstreamPath('/openai/v1/chat/completions')).toBe('/v1/chat/completions');
  });

  it('returns / for provider-only path', () => {
    expect(getUpstreamPath('/anthropic')).toBe('/');
  });
});

describe('isReasoningModel', () => {
  it('identifies anthropic reasoning models', () => {
    expect(isReasoningModel('claude-3-7-sonnet-thinking', PROVIDER_CONFIGS.anthropic)).toBe(true);
  });

  it('identifies openai reasoning models', () => {
    expect(isReasoningModel('o1', PROVIDER_CONFIGS.openai)).toBe(true);
    expect(isReasoningModel('o3-mini', PROVIDER_CONFIGS.openai)).toBe(true);
  });

  it('returns false for non-reasoning models', () => {
    expect(isReasoningModel('claude-3-5-sonnet-20241022', PROVIDER_CONFIGS.anthropic)).toBe(false);
    expect(isReasoningModel('gpt-4o', PROVIDER_CONFIGS.openai)).toBe(false);
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
