import { describe, expect, it, beforeEach } from 'bun:test';
import activate, { VouchPluginClient, shouldAllowTool } from '../src/index.js';
import type { OpenClawPluginAPI, HookContext, HookHandler, HookMeta, VouchPluginConfig } from '../src/types.js';

describe('openclaw-vouch plugin', () => {
  describe('activate', () => {
    let registeredHooks: Map<string, { handler: HookHandler; meta?: HookMeta }>;
    let mockApi: OpenClawPluginAPI;

    beforeEach(() => {
      registeredHooks = new Map();
      mockApi = {
        registerHook(name: string, handler: HookHandler, meta?: HookMeta) {
          registeredHooks.set(name, { handler, meta });
        },
      };
    });

    it('registers preToolExecution hook', () => {
      activate(mockApi, {});
      expect(registeredHooks.has('preToolExecution')).toBe(true);
      const hook = registeredHooks.get('preToolExecution');
      expect(hook?.meta?.name).toBe('vouch-trust-gate');
    });

    it('registers onError hook', () => {
      activate(mockApi, {});
      expect(registeredHooks.has('onError')).toBe(true);
      const hook = registeredHooks.get('onError');
      expect(hook?.meta?.name).toBe('vouch-error-tracker');
    });

    it('registers postToolExecution hook when logOutcomes is true', () => {
      activate(mockApi, { logOutcomes: true });
      expect(registeredHooks.has('postToolExecution')).toBe(true);
      const hook = registeredHooks.get('postToolExecution');
      expect(hook?.meta?.name).toBe('vouch-outcome-logger');
    });

    it('does NOT register postToolExecution when logOutcomes is false', () => {
      activate(mockApi, { logOutcomes: false });
      expect(registeredHooks.has('postToolExecution')).toBe(false);
    });

    it('does NOT register postToolExecution when logOutcomes is omitted', () => {
      activate(mockApi, {});
      expect(registeredHooks.has('postToolExecution')).toBe(false);
    });

    describe('preToolExecution hook', () => {
      it('allows execution when no tool in context', async () => {
        activate(mockApi, {});
        const handler = registeredHooks.get('preToolExecution')!.handler;
        const ctx: HookContext = { agentId: 'agent-1', sessionId: 'sess-1' };
        const result = await handler(ctx);
        expect(result.allow).toBe(true);
      });

      it('allows allowlisted tools without checking score', async () => {
        activate(mockApi, {
          minScore: 500,
          allowlistedTools: ['read'],
        });
        const handler = registeredHooks.get('preToolExecution')!.handler;
        const ctx: HookContext = {
          agentId: 'agent-1',
          sessionId: 'sess-1',
          tool: { name: 'read', arguments: {} },
        };
        const result = await handler(ctx);
        expect(result.allow).toBe(true);
      });
    });

    describe('onError hook', () => {
      it('returns empty result on error', async () => {
        activate(mockApi, {});
        const handler = registeredHooks.get('onError')!.handler;
        const ctx: HookContext = {
          agentId: 'agent-1',
          sessionId: 'sess-1',
          tool: { name: 'shell', arguments: { cmd: 'rm -rf /' } },
          result: { success: false, output: null, error: 'Permission denied' },
        };
        const result = await handler(ctx);
        expect(result).toEqual({});
      });
    });
  });

  describe('named exports', () => {
    it('exports VouchPluginClient', () => {
      expect(VouchPluginClient).toBeDefined();
      expect(typeof VouchPluginClient).toBe('function');
    });

    it('exports shouldAllowTool', () => {
      expect(shouldAllowTool).toBeDefined();
      expect(typeof shouldAllowTool).toBe('function');
    });
  });
});
