import { describe, expect, it } from 'bun:test';
import { shouldAllowTool } from '../src/policy.js';
import type { VouchPluginConfig } from '../src/types.js';

describe('shouldAllowTool', () => {
  const baseConfig: VouchPluginConfig = {};

  it('allows any tool when no restrictions are configured', () => {
    const result = shouldAllowTool('shell', 0, baseConfig);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('passed');
  });

  it('allows allowlisted tools regardless of score', () => {
    const config: VouchPluginConfig = {
      minScore: 500,
      allowlistedTools: ['read', 'list'],
    };
    const result = shouldAllowTool('read', 0, config);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowlisted');
  });

  it('blocks tools below global minScore', () => {
    const config: VouchPluginConfig = { minScore: 300 };
    const result = shouldAllowTool('shell', 200, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('300');
    expect(result.reason).toContain('200');
  });

  it('allows tools at or above global minScore', () => {
    const config: VouchPluginConfig = { minScore: 300 };
    const result = shouldAllowTool('shell', 300, config);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('passed');
  });

  it('allows tools above global minScore', () => {
    const config: VouchPluginConfig = { minScore: 300 };
    const result = shouldAllowTool('shell', 500, config);
    expect(result.allowed).toBe(true);
  });

  it('blocks tools below tool-specific threshold', () => {
    const config: VouchPluginConfig = {
      trustedTools: { 'shell': 700, 'http': 500 },
    };
    const result = shouldAllowTool('shell', 600, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('shell');
    expect(result.reason).toContain('700');
    expect(result.reason).toContain('600');
  });

  it('allows tools at tool-specific threshold', () => {
    const config: VouchPluginConfig = {
      trustedTools: { 'shell': 700 },
    };
    const result = shouldAllowTool('shell', 700, config);
    expect(result.allowed).toBe(true);
  });

  it('tool-specific threshold takes priority over global', () => {
    const config: VouchPluginConfig = {
      minScore: 200,
      trustedTools: { 'shell': 800 },
    };
    // Agent has 500 — passes global (200) but fails tool-specific (800)
    const result = shouldAllowTool('shell', 500, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('800');
  });

  it('allowlist takes priority over tool-specific threshold', () => {
    const config: VouchPluginConfig = {
      trustedTools: { 'read': 900 },
      allowlistedTools: ['read'],
    };
    const result = shouldAllowTool('read', 0, config);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowlisted');
  });

  it('non-configured tools pass with any score when no global min', () => {
    const config: VouchPluginConfig = {
      trustedTools: { 'shell': 700 },
    };
    const result = shouldAllowTool('write', 100, config);
    expect(result.allowed).toBe(true);
  });

  it('checks global min for non-configured tools', () => {
    const config: VouchPluginConfig = {
      minScore: 400,
      trustedTools: { 'shell': 700 },
    };
    const result = shouldAllowTool('write', 200, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('400');
  });
});
