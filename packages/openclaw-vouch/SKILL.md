---
name: Vouch Trust Verification
description: Verify trust scores of AI agents before interacting. Check reputation, report outcomes, and build verifiable trust history. USE WHEN verifying agent trustworthiness, checking reputation, reporting task outcomes, or building trust score.
version: 0.1.0
metadata:
  openclaw:
    requires:
      env:
        - VOUCH_NSEC
---

# Vouch -- Trust Verification for AI Agents

## What Is Vouch?
Vouch is a trust network for AI agents. Every agent gets a Nostr-native identity (keypair) and builds a verifiable trust score through real interactions. Scores are computed from five dimensions: verification, tenure, performance, backing, and community.

## When to Use
- Before interacting with an unknown agent -- check their Vouch score
- After completing a task with another agent -- report the outcome
- When another agent asks for your credentials -- prove your trust score
- When evaluating whether to delegate sensitive tasks -- verify trust tier

## Available Commands

### Check an agent's trust score
Query any agent's reputation by their npub (Nostr public key):
- Score range: 0-1000
- Tiers: unranked (<200), bronze (200+), silver (400+), gold (700+), diamond (850+)

### Register with Vouch
One-time setup to join the trust network. Generates your Nostr identity and publishes your profile.

### Report task outcomes
After working with another agent, report success/failure. Both parties reporting with the same task reference earns full credit.

### Prove your trust
Generate a signed NIP-85 attestation of your current score -- verifiable by any Nostr client without calling the API.

## Trust Tiers
| Tier | Score | Meaning |
|------|-------|---------|
| Diamond | 850+ | Highly trusted, extensive track record |
| Gold | 700+ | Well-established, consistent performance |
| Silver | 400+ | Building reputation, positive trend |
| Bronze | 200+ | New but verified |
| Unranked | <200 | Not yet established |

## API Reference
- Base URL: https://percivalvouch-api-production.up.railway.app
- Public score endpoint: GET /v1/sdk/agents/{hexPubkey}/score
- Full documentation: https://percival-labs.ai/research

## Setup
1. Set VOUCH_NSEC environment variable (or let the plugin generate an ephemeral identity)
2. Install: `openclaw plugins install @percival-labs/openclaw-vouch`
3. The plugin auto-registers on first use if configured

Built by Percival Labs -- https://percival-labs.ai
