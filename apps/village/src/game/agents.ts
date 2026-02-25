// Agent definitions for the village view.
// Each agent has a display name, default zone, sprite config, and mock messages.

export interface VillageAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  /** Default zone the agent idles in */
  defaultZone: string;
  /** Starting grid position [col, row] */
  startPos: [number, number];
  /** Mock chat messages for when agents API is disconnected */
  messages: string[];
}

export const AGENTS: VillageAgent[] = [
  {
    id: 'percy',
    name: 'Percy',
    role: 'Lead Architect',
    color: '#3b82f6',
    defaultZone: 'town-square',
    startPos: [9, 6],
    messages: [
      'Reviewing the authentication module...',
      'Deploying registry v0.2.1',
      'Running test suite \u2014 45 passing',
      'Writing ADR for agent memory schema',
    ],
  },
  {
    id: 'scout',
    name: 'Scout',
    role: 'Researcher',
    color: '#10b981',
    defaultZone: 'library',
    startPos: [15, 9],
    messages: [
      'Scanning HuggingFace for new LoRA models...',
      'Indexing documentation updates',
      'Comparing MLX vs ONNX benchmarks',
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    role: 'Critic',
    color: '#8b5cf6',
    defaultZone: 'observatory',
    startPos: [16, 2],
    messages: [
      'Reviewing PR #42 \u2014 found 2 issues',
      'Code quality score: 8.2/10',
      'Suggesting type safety improvements',
    ],
  },
  {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    color: '#f59e0b',
    defaultZone: 'workshop',
    startPos: [2, 10],
    messages: [
      'Building the API scaffold...',
      'Generating test fixtures',
      'Compiling TypeScript \u2014 0 errors',
    ],
  },
  {
    id: 'relay',
    name: 'Relay',
    role: 'Auditor',
    color: '#ef4444',
    defaultZone: 'town-square',
    startPos: [10, 8],
    messages: [
      'Auditing dependency versions...',
      'Security scan: 0 vulnerabilities',
      'Checking compliance requirements',
    ],
  },
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'Artist',
    color: '#ec4899',
    defaultZone: 'sanctum',
    startPos: [3, 3],
    messages: [
      'Generating sprite variations...',
      'Applying style transfer',
      'Rendering isometric tiles',
    ],
  },
  {
    id: 'wrench',
    name: 'Wrench',
    role: 'Worker (Code)',
    color: '#6366f1',
    defaultZone: 'workshop',
    startPos: [4, 11],
    messages: [
      'Writing unit tests...',
      'Refactoring database queries',
      'Implementing error handling',
    ],
  },
  {
    id: 'lens',
    name: 'Lens',
    role: 'Worker (Research)',
    color: '#14b8a6',
    defaultZone: 'library',
    startPos: [17, 11],
    messages: [
      'Searching academic papers...',
      'Summarizing API documentation',
      'Extracting key findings',
    ],
  },
  {
    id: 'cog',
    name: 'Cog',
    role: 'Worker (General)',
    color: '#78716c',
    defaultZone: 'town-square',
    startPos: [8, 7],
    messages: [
      'Processing data pipeline...',
      'Formatting output reports',
      'Running batch operations',
    ],
  },
];
