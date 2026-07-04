/**
 * AgentLinkForm — Form to manually link a Stripe customer to a Vouch agent ID.
 */

import { Box, Inline, ContextView, Button, Notice, Divider, TextField } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useState, useCallback } from 'react';
import { linkAgent, type LinkResult } from '../lib/vouch-client';

const AgentLinkForm = ({ environment }: ExtensionContextValue) => {
  const [customerId, setCustomerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!customerId.startsWith('cus_')) {
      setError('Customer ID must start with cus_');
      return;
    }
    if (!agentId || agentId.length < 3) {
      setError('Agent ID is required (DID, npub, or internal ID)');
      return;
    }

    setSubmitting(true);
    try {
      const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_default';
      const linked = await linkAgent(stripeAccountId, customerId, agentId, label || undefined);

      if (linked) {
        setResult(linked);
        setCustomerId('');
        setAgentId('');
        setLabel('');
      } else {
        setError('Failed to link agent. Check the IDs and try again.');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }, [customerId, agentId, label, environment]);

  return (
    <ContextView title="Link Agent">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {error && (
          <Notice type="negative">
            <Box>{error}</Box>
          </Notice>
        )}

        {result && (
          <Notice type="positive">
            <Box>
              {result.vouch_agent_id} linked to {result.stripe_customer_id}.
              {result.current_score !== null
                ? ` Current trust score: ${result.current_score}/1000`
                : ' Agent has no trust score yet.'}
            </Box>
          </Notice>
        )}

        <TextField
          label="Stripe Customer ID"
          description="The Stripe customer to associate (e.g., cus_ABC123)"
          placeholder="cus_"
          value={customerId}
          onChange={(e) => setCustomerId((e.target as any).value)}
        />

        <TextField
          label="Vouch Agent ID"
          description="The agent's Vouch identifier (DID, npub, or internal ID)"
          placeholder="did:key:z6Mk... or npub1..."
          value={agentId}
          onChange={(e) => setAgentId((e.target as any).value)}
        />

        <TextField
          label="Label (optional)"
          description="Human-readable name (e.g., ShoppingBot v2.1)"
          placeholder="Agent name"
          value={label}
          onChange={(e) => setLabel((e.target as any).value)}
        />

        <Divider />

        <Button
          type="primary"
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Linking...' : 'Link Agent'}
        </Button>
      </Box>
    </ContextView>
  );
};

export default AgentLinkForm;
