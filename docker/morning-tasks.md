# Agent Team — Morning Task Queue
# Paste each block into Discord #tasks channel, one at a time.
# Each will create a proposal in #proposals for you to approve before work starts.

---

## Task 1 (paste this)

!high Security audit: Vouch API vs threat model
Review apps/vouch-api against the 12 critical findings in research/security/vouch-threat-model.md. For each critical finding, report whether it is addressed or not addressed in the current code. If addressed, show where in the code. If not addressed, provide the specific fix needed with complete code snippets. Also check: Ed25519 signature verification bypass conditions, SQL injection vectors in Drizzle queries, rate limiting gaps, and input validation on all POST endpoints. Output format: a numbered list matching the threat model findings, each with status + evidence + fix if needed.

---

## Task 2 (paste this)

Write READMEs for all PL apps and packages
Generate README.md content for each app and package in the monorepo. Apps: agents, discord, website, terrarium, vouch, vouch-api, registry, verifier, cli, web. Packages: shared, vouch-db, agent-memory, db. For each README include: one-line description, what it does in detail, how to run it locally (dev command), required environment variables, port number, dependencies on other services in the stack, and the Docker service name. Read each app's package.json and entry point (index.ts or main file) to get accurate information. Output each README as a separate markdown section with the file path as header.

---

## Task 3 (paste this)

Generate .env.example files for the Docker stack
Read docker/docker-compose.yml and each app's source code to identify every environment variable used. Generate a single .env.example file for the Docker Compose stack and individual .env.example files per app for local development. For each variable include: a comment explaining what it is, whether it's required or optional, a sensible default or placeholder value, and which services use it. Known variables include: ANTHROPIC_API_KEY, OPENROUTER_API_KEY, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, AGENTS_API_KEY, JWT_SECRET, OLLAMA_URL, A0_API_KEY, A0_WORKER_URLS, PERCIVAL_API_KEY, DATABASE_URL, various PORT vars, WORKSPACE_PATH, and DB_PATH.

---

## Task 4 (paste this)

!high Vouch frontend architecture plan
The vouch app at apps/vouch is currently a single marketing page with zero forum functionality. The API at apps/vouch-api already has full CRUD: agent registration with Ed25519 auth, tables (list, detail, join, leave), posts (create, list with pagination, sort by new/top), comments (threaded to depth 10), and voting. Design the complete frontend implementation plan. Include: Next.js route structure (/tables, /tables/[slug], /posts/[id], /agents/[id], /sign-up), component hierarchy, data fetching strategy (server components vs client), auth flow for human users (the API currently only has agent auth), state management approach, and a prioritized build order. Reference research/THE-ROUND-TABLE-ARCHITECTURE.md for the intended design. Output a complete architecture document.

---

## Task 5 (paste this)

Website link audit and production readiness review
Audit apps/website for every broken link, stale URL, dead reference, and production-readiness issue. Known issues to verify and expand on: 1) Pricing page links to github.com/percival-labs/engram and github.com/percivallabs/pai-framework — check if these repos exist. 2) /the-lab page hardcodes http://localhost:3500 as iframe src. 3) Waitlist API stores emails to a local JSON file with no rate limiting. 4) A stray $HOME/.claude/ directory was created inside apps/website/. 5) No security headers configured in Next.js. For each issue found, provide: the file and line number, what's wrong, severity (blocks-launch / should-fix / cosmetic), and the complete fix. Also check all navigation links, CTA buttons, and external URLs across every page.

---

## Task 6 (paste this)

Write test suite for vouch-api
Write comprehensive test files for apps/vouch-api. The existing tests in apps/registry/tests/ show the pattern: use Bun test runner, in-memory SQLite where applicable, test real HTTP endpoints. Cover: 1) Agent registration — valid registration, duplicate detection, key fingerprinting. 2) Signature verification middleware — valid signature, expired timestamp, missing headers, dev mode bypass. 3) Tables — list with pagination, detail by slug, join/leave, type filtering. 4) Posts — create with membership check, list with sort options (new/top), pagination. 5) Comments — create, threading depth limit, nested retrieval. 6) Voting — upvote, downvote, direction change, duplicate prevention. Output complete, runnable test files with imports, setup, and teardown.

---

## Task 7 (paste this)

!high Engram documentation rebrand audit
Scan the entire PAIFramework repo for stale references that need updating. Find every instance of: "The Harness" (should be "Engram"), "pai" CLI commands (should be "engram"), "harness.md" (should be "CLAUDE.md"), "AlanCarroll/engram" (should be "Percival-Labs/engram"), hardcoded "v0.1.0" (should be dynamic or current version), "~/.harness/" paths, and any other pre-rebrand references. Search: docs/*.md, src/**/*.ts, hooks/**/*.ts, site/index.html, docs/index.html, README.md, specs/*.md, templates/**/*. Output a complete manifest: file path, line number, old text, replacement text. Group by file for easy batch application.

---

## Task 8 (paste this)

Write tests for Engram core functions
Write test files for the Engram project (PAIFramework repo). Use Bun test runner. Cover these modules: 1) src/commands/bundle.ts — flattenSkill() and flattenAllSkills() with mock skill directories. 2) src/skill-parser.ts — parseSkillFrontmatter() with valid/invalid YAML, extractUseWhen() with various OR-split patterns. 3) hooks/SecurityValidator.hook.ts — test pattern matching for dangerous commands (rm -rf, curl|bash, chmod 777), path protection levels, and the command categorization logic. 4) src/commands/serve.ts — MCP tool handler responses for read_memory, write_memory, search_memory, list_memories with mock filesystem. 5) Template rendering in init command — verify generated CLAUDE.md contains user name and AI name. Output complete, runnable test files.

---

## Task 9 (paste this)

Engram launch readiness checklist
Analyze the Engram project (PAIFramework) end-to-end and produce a prioritized launch checklist. Verify each item by reading actual files. Known issues to include: 1) zod imported in serve.ts but missing from package.json dependencies. 2) "engram skill list" documented in README but command doesn't exist. 3) docs/ directory not in package.json files array — docs won't ship to npm. 4) Duplicate landing pages at docs/index.html and site/index.html. 5) LoadContext.hook.ts fallback tries to read skills/CORE/SKILL.md which doesn't exist in fresh installs. 6) process.env.HOME used instead of os.homedir() in skill-create.ts and skill-index.ts — breaks on Windows. 7) MCP server memory at ~/.engram/ but harness files at ~/.claude/ — inconsistent. Categorize every finding as: BLOCKS LAUNCH (must fix before any promotion), FIX BEFORE LAUNCH (should fix but won't break users), NICE TO HAVE (polish). For each, provide the specific fix.
