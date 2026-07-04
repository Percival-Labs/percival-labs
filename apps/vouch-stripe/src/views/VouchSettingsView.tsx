/**
 * VouchSettingsView — Configuration page for marketplace operators.
 * Allows setting trust thresholds, flagging unscored agents, and managing linked agents.
 * Per architecture doc Section 8.3.
 */

import { Box, Inline, ContextView, Button, Notice, Divider, Switch, Select, TextField, Badge } from '@stripe/ui-extension-sdk/ui';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { useEffect, useState, useCallback } from 'react';
import {
  loadSettings,
  saveSettings,
  fetchLinkedAgents,
  linkAgent,
  type InstallationSettings,
  type LinkedAgentItem,
  type LinkResult,
  scoreTier,
} from '../lib/vouch-client';

type BadgeType = 'info' | 'neutral' | 'urgent' | 'warning' | 'negative' | 'positive';

const TIER_BADGE: Record<string, BadgeType> = {
  diamond: 'positive',
  gold: 'info',
  silver: 'neutral',
  bronze: 'warning',
  unranked: 'negative',
  unscored: 'negative',
};

const VouchSettingsView = ({ environment }: ExtensionContextValue) => {
  const stripeAccountId = (environment as any)?.constants?.STRIPE_ACCOUNT_ID || 'acct_1TDWLI42J0XT4dfT';

  const [settings, setSettings] = useState<InstallationSettings>({
    threshold: 400,
    domain: 'financial',
    flagUnscored: true,
  });
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Link form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkCustomerId, setLinkCustomerId] = useState('');
  const [linkAgentId, setLinkAgentId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<LinkResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, agentsData] = await Promise.all([
        loadSettings(stripeAccountId),
        fetchLinkedAgents(stripeAccountId),
      ]);
      setSettings(settingsData);
      setLinkedAgents(agentsData);
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, [stripeAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await saveSettings(stripeAccountId, settings);
      if (result) {
        setSettings(result);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError('Failed to save settings. Please try again.');
      }
    } catch {
      setSaveError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }, [stripeAccountId, settings]);

  const handleLinkAgent = useCallback(async () => {
    setLinkError(null);
    setLinkSuccess(null);

    if (!linkCustomerId.startsWith('cus_')) {
      setLinkError('Customer ID must start with cus_');
      return;
    }
    if (!linkAgentId || linkAgentId.length < 3) {
      setLinkError('Agent ID is required (DID, npub, or internal ID)');
      return;
    }

    setLinking(true);
    try {
      const result = await linkAgent(stripeAccountId, linkCustomerId, linkAgentId, linkLabel || undefined);
      if (result) {
        setLinkSuccess(result);
        setLinkCustomerId('');
        setLinkAgentId('');
        setLinkLabel('');
        // Refresh the agents list
        const agents = await fetchLinkedAgents(stripeAccountId);
        setLinkedAgents(agents);
        setTimeout(() => setLinkSuccess(null), 5000);
      } else {
        setLinkError('Failed to link agent. Check the IDs and try again.');
      }
    } catch {
      setLinkError('An unexpected error occurred.');
    } finally {
      setLinking(false);
    }
  }, [stripeAccountId, linkCustomerId, linkAgentId, linkLabel]);

  if (loading) {
    return (
      <ContextView title="Vouch Trust Scoring - Settings">
        <Box css={{ padding: 'medium' }}>
          <Box css={{ color: 'secondary' }}>Loading settings...</Box>
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView title="Vouch Trust Scoring - Settings">
      <Box css={{ layout: 'column', gap: 'medium' }}>
        {saved && (
          <Notice type="positive">
            <Box>Settings updated successfully.</Box>
          </Notice>
        )}
        {saveError && (
          <Notice type="negative">
            <Box>{saveError}</Box>
          </Notice>
        )}

        {/* Threshold */}
        <Box css={{ fontWeight: 'semibold' }}>Minimum Trust Threshold</Box>
        <Box css={{ layout: 'column', gap: 'xsmall' }}>
          <Box css={{ fontSize: '28px' as any, fontWeight: 'bold' }}>
            {settings.threshold}
          </Box>
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            Agents below this score are flagged for review (0-1000)
          </Box>
        </Box>
        <Inline css={{ gap: 'small' }}>
          <Button
            type="secondary"
            onPress={() => setSettings(s => ({ ...s, threshold: Math.max(0, s.threshold - 50) }))}
          >
            -50
          </Button>
          <Button
            type="secondary"
            onPress={() => setSettings(s => ({ ...s, threshold: Math.min(1000, s.threshold + 50) }))}
          >
            +50
          </Button>
        </Inline>

        <Divider />

        {/* Domain */}
        <Box css={{ fontWeight: 'semibold' }}>Trust Domain</Box>
        <Select
          name="domain"
          label="Domain scope"
          onChange={(e) => setSettings(s => ({ ...s, domain: (e.target as any).value }))}
        >
          <option value="financial">Financial</option>
          <option value="general">General</option>
          <option value="code-execution">Code Execution</option>
        </Select>

        <Divider />

        {/* Flag Unscored */}
        <Inline css={{ gap: 'medium' }}>
          <Box css={{ fontWeight: 'semibold' }}>Flag Unscored Agents</Box>
          <Switch
            label="Flag unscored agents"
            checked={settings.flagUnscored}
            onChange={(e: any) => setSettings(s => ({ ...s, flagUnscored: e.target.checked }))}
          />
        </Inline>
        <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
          When enabled, transactions from agents with no Vouch score are flagged for review.
        </Box>

        <Divider />

        {/* Linked Agents Table */}
        <Box css={{ fontWeight: 'semibold' }}>Linked Agents ({linkedAgents.length})</Box>
        {linkedAgents.length === 0 ? (
          <Box css={{ color: 'secondary', fontSize: '12px' as any }}>
            No agents linked yet. Use the button below to link an agent.
          </Box>
        ) : (
          <Box css={{ layout: 'column', gap: 'xsmall' }}>
            {/* Header */}
            <Inline css={{ gap: 'small' }}>
              <Box css={{ width: 'fill', fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>Agent</Box>
              <Box css={{ width: '80px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>Customer</Box>
              <Box css={{ width: '50px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>Score</Box>
              <Box css={{ width: '60px' as any, fontSize: '11px' as any, fontWeight: 'semibold', color: 'secondary' }}>Tier</Box>
            </Inline>
            {linkedAgents.map((agent) => {
              const tier = scoreTier(agent.score);
              return (
                <Inline key={agent.link_id} css={{ gap: 'small' }}>
                  <Box css={{ width: 'fill', fontSize: '11px' as any }}>
                    {agent.label || agent.vouch_agent_id.slice(0, 16) + '...'}
                  </Box>
                  <Box css={{ width: '80px' as any, fontSize: '11px' as any, color: 'secondary' }}>
                    {agent.stripe_customer_id.slice(0, 12)}...
                  </Box>
                  <Box css={{ width: '50px' as any, fontSize: '11px' as any }}>
                    {agent.score ?? '-'}
                  </Box>
                  <Box css={{ width: '60px' as any }}>
                    <Badge type={TIER_BADGE[tier] ?? 'neutral'}>{tier}</Badge>
                  </Box>
                </Inline>
              );
            })}
          </Box>
        )}

        <Button
          type="secondary"
          onPress={() => { setShowLinkForm(!showLinkForm); setLinkError(null); setLinkSuccess(null); }}
        >
          {showLinkForm ? 'Cancel' : 'Link New Agent'}
        </Button>

        {/* Inline Link Form */}
        {showLinkForm && (
          <Box css={{ layout: 'column', gap: 'small', padding: 'small', background: 'container' }}>
            {linkError && (
              <Notice type="negative"><Box>{linkError}</Box></Notice>
            )}
            {linkSuccess && (
              <Notice type="positive">
                <Box>
                  Linked {linkSuccess.vouch_agent_id.slice(0, 16)}... to {linkSuccess.stripe_customer_id}.
                  {linkSuccess.current_score !== null
                    ? ` Score: ${linkSuccess.current_score}/1000`
                    : ' No score yet.'}
                </Box>
              </Notice>
            )}

            <TextField
              label="Stripe Customer ID"
              description="e.g., cus_ABC123"
              placeholder="cus_"
              value={linkCustomerId}
              onChange={(e) => setLinkCustomerId((e.target as any).value)}
            />
            <TextField
              label="Vouch Agent ID"
              description="DID, npub, or internal ID"
              placeholder="did:key:z6Mk... or npub1..."
              value={linkAgentId}
              onChange={(e) => setLinkAgentId((e.target as any).value)}
            />
            <TextField
              label="Label (optional)"
              placeholder="Agent name"
              value={linkLabel}
              onChange={(e) => setLinkLabel((e.target as any).value)}
            />
            <Button type="primary" onPress={handleLinkAgent} disabled={linking}>
              {linking ? 'Linking...' : 'Link Agent'}
            </Button>
          </Box>
        )}

        <Divider />

        {/* Plan */}
        <Box css={{ fontWeight: 'semibold' }}>Plan</Box>
        <Box css={{ fontSize: '12px' as any }}>
          Current: Free (assessments used this month: 0/50)
        </Box>
        <Button type="secondary" disabled>
          Upgrade to Growth
        </Button>

        <Divider />

        {/* Save */}
        <Button type="primary" onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </ContextView>
  );
};

export default VouchSettingsView;
