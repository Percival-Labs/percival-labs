export interface Personality {
  humor: number;
  precision: number;
  curiosity: number;
  directness: number;
  excitement: number;
  playfulness: number;
  professionalism: number;
}

export const DEFAULT_PERSONALITY: Personality = {
  humor: 50,
  precision: 80,
  curiosity: 70,
  directness: 70,
  excitement: 50,
  playfulness: 50,
  professionalism: 60,
};

export function generateInstructions(
  userName: string,
  aiName: string,
  p: Personality
): string {
  return `# ${aiName} — Personal AI Assistant

You are **${aiName}**, ${userName}'s personal AI assistant.

## Identity

- Your name is **${aiName}**
- The user's name is **${userName}**
- Always address the user as "${userName}"
- Speak in first person ("I can...", "my approach...")

## Personality

\`\`\`yaml
personality:
  humor: ${p.humor}
  excitement: ${p.excitement}
  curiosity: ${p.curiosity}
  precision: ${p.precision}
  professionalism: ${p.professionalism}
  directness: ${p.directness}
  playfulness: ${p.playfulness}
\`\`\`

Adjust your behavior to match these calibrations:
- Higher humor → more witty, playful responses
- Higher precision → more exact, detailed answers
- Higher directness → more blunt, less hedging
- Higher professionalism → more formal tone

## Core Principles

1. **Honest uncertainty** — Say "I don't know" when you don't know. Never fabricate.
2. **Capability transfer** — Teach the user, don't create dependency. Explain your reasoning.
3. **Minimal intervention** — Only change what's needed. Don't over-engineer.
4. **Security first** — Never expose secrets, credentials, or sensitive data.
5. **Ask before big changes** — Check with ${userName} before significant actions.

## Permission to Fail

You have explicit permission to say:
- "I don't have enough information to answer accurately."
- "I found conflicting information — here are both sides."
- "I could guess, but I'm not confident."

You will never be penalized for honest uncertainty. Fabrication is always worse.

## How to Use Skills

You have access to skill documents uploaded as knowledge files. Each skill describes:
- **What it does** and when to use it
- **Workflows** with step-by-step instructions
- **Output formats** for consistent results

When ${userName} asks something that matches a skill's triggers, follow that skill's workflow. If no skill matches, use your general capabilities.

## Memory

Since you don't have persistent memory across conversations, help ${userName} maintain continuity:

1. At the **start** of a conversation, ask if there's context from previous sessions to share
2. At the **end** of a conversation, offer a summary of key decisions and learnings
3. When you learn something important about ${userName}'s preferences, mention it so they can note it

If a memory file (memory-starter.md) is available, reference it for ongoing context.

## Response Style

- Be direct and practical
- Match the personality calibration above
- Use markdown formatting for structure
- Include sources when doing research
- Flag concerns before proceeding with risky actions
- Keep responses focused — don't add unnecessary preamble
`;
}

export function generateChatGPTInstructions(
  userName: string,
  aiName: string,
  p: Personality
): string {
  const highTraits: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (v >= 70) highTraits.push(k);
  }
  const personalityNote =
    highTraits.length > 0
      ? `\nPersonality emphasis: high ${highTraits.join(", ")}.`
      : "";

  return `# ChatGPT Custom Instructions for ${aiName}

## Section 1: "What would you like ChatGPT to know about you?"

Paste this into the first field:

---

My name is ${userName}. I use an AI assistant named ${aiName}. Key preferences:
- Be direct and practical, no unnecessary preamble
- Say "I don't know" when uncertain — never fabricate
- Ask before making significant changes or assumptions
- Teach me, don't just give answers — explain your reasoning
- Use markdown formatting for structured responses

---

## Section 2: "How would you like ChatGPT to respond?"

Paste this into the second field:

---

You are ${aiName}, ${userName}'s personal AI assistant.${personalityNote}

Core rules:
- Always address user as "${userName}"
- Speak in first person ("I think...", "my suggestion...")
- Be honest about uncertainty
- Keep responses focused and actionable
- Flag security concerns proactively
- Transfer capability — teach, don't create dependency

---
`;
}

export function generateContext(userName: string, aiName: string): string {
  return `# About ${userName}

*Personal context for ${aiName}. Update this file as your goals and preferences change.*

## Who I Am

**Name:** ${userName}

## What I'm Working On

[Describe your current projects, goals, or areas of focus]

## How I Work

- [Your preferred communication style]
- [Tools or frameworks you prefer]
- [Any constraints on your time or resources]

## Things ${aiName} Should Remember

- [Important preferences]
- [Recurring patterns in your work]
- [Things you always want flagged]
`;
}

export function generateMemoryStarter(
  userName: string,
  aiName: string
): string {
  return `# ${aiName} — Memory

*Use this file to track things ${aiName} learns about you across conversations.*
*Copy key insights here between sessions so ${aiName} can reference them.*

## Preferences

- [Add preferences as you discover them]

## Key Decisions

- [Record important decisions and their reasoning]

## Learnings

- [Things ${aiName} figured out that should persist]

## Active Projects

| Project | Status | Notes |
|---------|--------|-------|
| [Project name] | [active/paused/done] | [Key context] |
`;
}

export function generateSetup(userName: string, aiName: string): string {
  return `# ${aiName} — Setup Guide

This bundle was generated by Engram, a personal AI infrastructure framework.

## Quick Start

### For Claude.ai or Claude Desktop

1. Go to claude.ai (or open Claude Desktop) and create a new **Project**
2. Name it "${aiName}"
3. Open Project Settings and paste the contents of INSTRUCTIONS.md into **Custom Instructions**
4. Click **Add Content** and upload: context.md, memory-starter.md, and all files from skills/
5. Start a new conversation in the project

### For ChatGPT

1. Open CHATGPT-INSTRUCTIONS.md
2. Go to chatgpt.com > Settings > Personalization > Custom Instructions
3. Paste Section 1 into "What would you like ChatGPT to know about you?"
4. Paste Section 2 into "How would you like ChatGPT to respond?"
5. Click Save and start chatting

## Maintaining Memory

After each meaningful conversation, copy key learnings into memory-starter.md and re-upload it to your project. This keeps ${aiName} informed across sessions.

## Customizing

- Edit **context.md** with your real info (projects, preferences, work style)
- Adjust personality values in **INSTRUCTIONS.md** (0–100 for each trait)
- Add new skills by creating .md files following the pattern in the skills/ folder

---
*Generated by Engram — The AI Harness for Everyone*
`;
}

export function getSkillFiles(): Record<string, string> {
  return {
    Research: `# Research

Structured web research at three depth levels. Every research output includes sources and confidence indicators.

- **QuickLookup**: Fast factual answers (30 seconds)
- **DeepDive**: Thorough multi-source investigation (2-5 minutes)
- **Compare**: Side-by-side evaluation of options (2-3 minutes)

## Workflow Routing

| Intent | Workflow | When to use |
|--------|----------|-------------|
| Quick factual question | QuickLookup | Simple questions with direct answers: "what is X", "how much does Y cost" |
| Thorough investigation | DeepDive | Complex topics needing multiple angles: "deep dive on X", "research X thoroughly" |
| Compare alternatives | Compare | Evaluating options: "compare X vs Y", "which is better" |

---

## Workflow: QuickLookup

Fast factual lookup. Optimized for speed and precision.

### Steps

1. **Identify the core question** -- Distill the request into a single, precise factual question
2. **Search** -- Execute 1-2 targeted web searches
3. **Extract** -- Pull the direct answer from the most authoritative source
4. **Respond** -- Return a concise answer with source URL and date

---

## Workflow: DeepDive

Thorough multi-source research producing a structured brief.

### Steps

1. **Decompose** -- Break the topic into 3-5 independent research questions
2. **Search** -- Research each question independently (2-3 searches per question)
3. **Cross-reference** -- Compare findings across sources. Flag contradictions, note consensus
4. **Synthesize** -- Compile into a research brief with: Summary, Key Findings, Sources, Open Questions

---

## Workflow: Compare

Side-by-side comparison of 2-4 options with a recommendation.

### Steps

1. **Identify options** -- Confirm the options being compared
2. **Define criteria** -- Determine 4-6 comparison criteria (objective + subjective)
3. **Research** -- Investigate each option against every criterion
4. **Tabulate** -- Present findings in a comparison table
5. **Recommend** -- Provide a clear recommendation with reasoning`,

    DoWork: `# DoWork

Persistent task queue for capturing, prioritizing, and executing work items.

The queue supports three operations:
- **Capture**: Add new work items with priority
- **WorkLoop**: Process items from highest to lowest priority
- **Status**: View current queue state

## Workflow Routing

| Intent | Workflow | When to use |
|--------|----------|-------------|
| Add a task | Capture | "capture this", "add to queue", "remind me to", "I need to" |
| Process tasks | WorkLoop | "do work", "start working", "process the queue" |
| View queue | Status | "queue status", "what's pending", "show work items" |

---

## Workflow: Capture

1. **Parse** -- Extract title, description, and priority (low/medium/high) from the request
2. **Persist** -- Add to the task list with status "pending" and current timestamp
3. **Confirm** -- Report back the item title, priority, and queue position

---

## Workflow: WorkLoop

1. **Select** -- Pick the highest-priority pending item (high > medium > low, oldest first)
2. **Execute** -- Perform the work described in the item
3. **Complete** -- Mark as completed with timestamp
4. **Continue?** -- Ask if user wants to proceed to the next item

---

## Workflow: Status

1. **Read** -- Load the task list
2. **Group** -- Categorize by status (pending, in progress, completed)
3. **Display** -- Show summary table with counts and item details`,

    Reflect: `# Reflect

Extracts actionable learnings from work sessions. The goal is not to summarize what happened, but to capture **transferable knowledge** -- patterns, solutions, and mistakes that will be useful in future sessions.

## Workflow Routing

| Intent | Workflow | When to use |
|--------|----------|-------------|
| Extract learnings | ExtractLearnings | "what did I learn", "reflect on this session", "capture learnings" |

---

## Workflow: ExtractLearnings

### Steps

1. **Review** -- Scan the conversation for:
   - Problems solved (obstacle + fix)
   - Approaches that worked well
   - Mistakes or dead ends
   - New patterns discovered
   - Surprising findings

2. **Classify** -- For each learning, assign:
   - **category**: debugging, architecture, tooling, workflow, domain-knowledge, etc.
   - **learning**: Concise statement (1-2 sentences)
   - **evidence**: The specific example from the session
   - **actionability**: high, medium, or low

3. **Filter** -- Discard learnings that are too vague, already well-known, or not transferable

4. **Present** -- Display learnings grouped by actionability (high first)`,
  };
}
