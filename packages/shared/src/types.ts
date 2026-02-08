// Percival Labs - Core Types
// Shared across all workspace packages

// ── Enumerations ──

export enum SkillVisibility {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

export enum AuditStage {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  HUMAN = 'human',
  CONTINUOUS = 'continuous',
}

export enum AuditStatus {
  PASS = 'pass',
  FAIL = 'fail',
  ESCALATE = 'escalate',
  PENDING = 'pending',
}

export enum CapabilityType {
  FILESYSTEM = 'filesystem',
  NETWORK = 'network',
  PROCESS = 'process',
  SYSTEM = 'system',
  CRYPTO = 'crypto',
  LLM = 'llm',
}

export enum ReportCategory {
  MALICIOUS = 'malicious',
  BROKEN = 'broken',
  MISLEADING = 'misleading',
  LICENSE = 'license',
  SPAM = 'spam',
}

export enum ReportStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

// ── Core Entities ──

export interface Publisher {
  id: string;
  github_id: string;
  display_name: string;
  email: string;
  verified_at: string | null;
  trust_score: number;
  wallet_addr: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  publisher_id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  homepage: string | null;
  repository: string | null;
  visibility: SkillVisibility;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  skill_id: string;
  semver: string;
  content_hash: string;
  manifest: SkillManifest;
  readme: string;
  download_url: string | null;
  audit_status: AuditStatus;
  created_at: string;
}

export interface Capability {
  id: string;
  skill_id: string;
  type: CapabilityType;
  resource: string;
  permissions: Record<string, unknown>;
  required: boolean;
}

export interface Audit {
  id: string;
  version_id: string;
  stage: AuditStage;
  status: AuditStatus;
  results: Record<string, unknown>;
  reviewer_id: string | null;
  created_at: string;
}

export interface Installation {
  id: string;
  version_id: string;
  agent_id: string;
  installed_at: string;
  last_used: string | null;
  usage_count: number;
}

export interface Rating {
  id: string;
  skill_id: string;
  agent_id: string;
  score: number;
  review: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  skill_id: string;
  reporter_id: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  created_at: string;
}

// ── Skill Manifest (what publishers submit) ──

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  capabilities: {
    filesystem?: {
      read?: string[];
      write?: string[];
    };
    network?: {
      domains?: string[];
      protocols?: string[];
    };
    process?: {
      spawn?: string[];
    };
    llm?: {
      models?: string[];
      maxTokens?: number;
    };
  };
  dependencies?: Record<string, string>;
  runtime: {
    engine: 'bun' | 'node' | 'deno';
    version: string;
  };
  category: string;
  tags: string[];
  homepage?: string;
  repository?: string;
  documentation?: string;
  keywords?: string[];
}

// ── Trust Score ──

export interface TrustScore {
  overall: number;
  dimensions: {
    publisher: number;
    security: number;
    quality: number;
    usage: number;
    community: number;
  };
}

export const TRUST_WEIGHTS = {
  publisher: 0.25,
  security: 0.35,
  quality: 0.15,
  usage: 0.15,
  community: 0.10,
} as const;

// ── MCP Server Types ──

export interface McpServer {
  id: string;
  publisher_id: string;
  name: string;
  slug: string;
  description: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  homepage: string | null;
  repository: string | null;
  visibility: SkillVisibility;
  created_at: string;
  updated_at: string;
}

export interface McpVersion {
  id: string;
  server_id: string;
  semver: string;
  content_hash: string;
  manifest: string;
  readme: string;
  download_url: string | null;
  msss_level: number;
  msss_controls_passed: number;
  msss_controls_total: number;
  audit_status: AuditStatus;
  created_at: string;
}

// ── Parsed SKILL.md ──

export interface ParsedSkillMd {
  name: string;
  description: string;
  context: string;
  triggers: string[];
  workflows: Array<{
    name: string;
    trigger: string;
    file: string;
  }>;
  toolReferences: string[];
  body: string;
  category: string;
}

// ── API Response Types ──

export interface SkillListResponse {
  skills: (Skill & { publisher_name: string; trust_score: number; latest_version: string | null })[];
  total: number;
  limit: number;
  offset: number;
}

export interface SkillDetailResponse {
  skill: Skill & { publisher: Publisher };
  versions: Pick<Version, 'id' | 'semver' | 'content_hash' | 'audit_status' | 'created_at'>[];
  trust: TrustScore;
  capabilities: Capability[];
}

export interface VersionDetailResponse {
  version: Version;
  audit: Audit[];
}

export interface SearchResult {
  skill: Skill;
  score: number;
  matched_on: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
