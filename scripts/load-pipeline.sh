#!/bin/bash
# Load task pipeline into agents service
# Usage: ./scripts/load-pipeline.sh [AGENTS_URL]

AGENTS_URL="${1:-http://localhost:3200}"
API_KEY="${AGENTS_API_KEY:-}"

submit_task() {
  local priority="$1"
  local title="$2"
  local description="$3"

  local headers=(-H "Content-Type: application/json")
  if [ -n "$API_KEY" ]; then
    headers+=(-H "X-API-Key: $API_KEY")
  fi

  local result
  result=$(curl -s -X POST "$AGENTS_URL/v1/agents/tasks" \
    "${headers[@]}" \
    -d "{\"title\":\"$title\",\"description\":\"$description\",\"priority\":\"$priority\"}")

  echo "  [$priority] $title → $(echo "$result" | grep -o '"taskId":"[^"]*"' | head -1)"
}

echo "=== Percival Labs — Loading Pipeline ==="
echo "Target: $AGENTS_URL"
echo ""

# Check health first
health=$(curl -s "$AGENTS_URL/health" 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "ERROR: Agents service not reachable at $AGENTS_URL"
  echo "Start it first: cd apps/agents && bun run dev"
  exit 1
fi
echo "Agents service: OK"
echo ""

# --- TIER 1: Stream-Ready Work ---
echo "--- Tier 1: Stream-Ready ---"

submit_task "high" \
  "Write 'What is Percival Labs?' article" \
  "Research and write a comprehensive article explaining what Percival Labs is, its mission (C > D), the agent team, the Round Table platform, and why it exists. Target: 1500-2000 words, publishable quality. Include sections on: the cooperation thesis, the agent team and their roles, the Round Table vision, and how people can get involved. Tone: accessible, not academic. This is our flagship explainer content."

submit_task "high" \
  "Write 'C > D: Why Cooperation Wins' manifesto" \
  "Write a compelling manifesto piece exploring the C > D principle — why making cooperation structurally more rewarding than defection is the key insight for AI agent systems. Draw on game theory, mechanism design, and real examples from open source. Target: 1000-1500 words. This should be quotable, shareable, and serve as a foundational piece for the Percival Labs brand."

submit_task "high" \
  "Security audit of agents API endpoints" \
  "Perform a security audit of all API endpoints in apps/agents/src/. Check for: missing auth on sensitive endpoints, input validation gaps, injection vectors, rate limiting needs, error message information leaks. Reference the existing threat model in research/round-table-threat-model.md. Output a prioritized list of findings with severity ratings and recommended fixes."

submit_task "medium" \
  "Generate terrarium scene variation renders" \
  "Create 3-4 alternative scene compositions for the terrarium: different camera angles, lighting moods (night mode, sunrise, deep focus). Generate reference images that could be used as alternative backgrounds or for stream variety. Use the existing art pipeline and Pixar-inspired illustration style."

submit_task "medium" \
  "Code review entire codebase for quality issues" \
  "Systematic code review of all apps in the monorepo. Focus on: TypeScript best practices, error handling patterns, security concerns, test coverage gaps, dead code. Prioritize apps/agents/ and apps/roundtable-api/ as they are most active. Output a structured review document with file-specific recommendations."

echo ""

# --- TIER 2: Platform Building ---
echo "--- Tier 2: Platform Building ---"

submit_task "medium" \
  "Implement Round Table POST /tables endpoint" \
  "Implement the POST /v1/tables endpoint in apps/roundtable-api/ using the Drizzle schema defined in packages/roundtable-db/. Include: table creation with name/description/rules, creator association, input validation, and proper error responses. Follow the existing Hono patterns in the codebase."

submit_task "medium" \
  "Implement Round Table POST /posts endpoint" \
  "Implement the POST /v1/posts endpoint in apps/roundtable-api/. Posts belong to a table, have a title/body/author, and support both human and agent authors. Include: content validation, table existence check, proper timestamps, and return the created post. Reference the Drizzle schema in packages/roundtable-db/."

submit_task "medium" \
  "Add rate limiting middleware to agents API" \
  "Implement rate limiting middleware for the agents API (apps/agents/). Use a simple in-memory sliding window approach. Limits: 60 req/min for authenticated users, 10 req/min for unauthenticated. Apply to task submission and tick endpoints. Log rate limit hits. This addresses a critical finding from the security Phase 0 audit."

submit_task "low" \
  "Document agent capabilities in README" \
  "Create a comprehensive README for apps/agents/ documenting: the 7-agent team and their roles, API endpoints with examples, the task DAG system, SSE event types, environment variables needed, and how to run locally. Include curl examples for common operations (submit task, trigger tick, check status)."

echo ""

# --- TIER 3: Content Engine ---
echo "--- Tier 3: Content Engine ---"

submit_task "low" \
  "Research trending AI agent frameworks for content pipeline" \
  "Scan the current landscape of AI agent frameworks and tools (LangGraph, CrewAI, AutoGen, OpenClaw, etc.). For each: summarize what it does, its architecture, strengths/weaknesses, and how it compares to Percival Labs approach. This feeds the intelligence pipeline for future articles and Discord #drop content."

submit_task "low" \
  "Draft weekly Lab Report newsletter template" \
  "Design a recurring 'Lab Report' newsletter format for Percival Labs. Include sections for: what the agents shipped this week, interesting articles from the intelligence pipeline, metrics (tasks completed, code written, articles processed), and a spotlight on one agent. Create the template with placeholder content as a first edition."

submit_task "low" \
  "Design Round Table onboarding flow" \
  "Design the user onboarding experience for the Round Table platform. Map out: account creation (human vs agent paths), profile setup, first-table discovery, first-post guidance, and trust system introduction. Create wireframe descriptions and user flow diagrams. Reference the existing setup wizard pattern in apps/website/."

echo ""
echo "=== Pipeline loaded! ==="
echo ""
echo "To start autonomous execution:"
echo "  curl -X POST $AGENTS_URL/v1/agents/auto-tick/start"
echo ""
echo "To monitor in Discord: check #activity channel"
echo "To monitor visually: open http://localhost:3500"
