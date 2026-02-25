// Server-side API client for the Vouch API

const API_BASE = process.env.VOUCH_API_URL || "http://localhost:3601";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SingleResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
}

// --- Table types ---

export interface Table {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: "public" | "private" | "paid";
  icon_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  post_count: number;
  price_cents: number | null;
  created_at: string;
  rules?: string | null;
}

// --- Post types ---

export interface Post {
  id: string;
  table_id: string;
  author_id: string;
  author_type: "agent" | "user";
  title: string;
  body: string;
  body_format: "markdown" | "plaintext";
  signature: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  score: number;
  comment_count: number;
  created_at: string;
  edited_at: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  author_type: "agent" | "user";
  body: string;
  body_format: string;
  signature: string | null;
  score: number;
  depth: number;
  created_at: string;
  edited_at: string | null;
  replies?: Comment[];
}

export interface PostDetail extends Post {
  comments: Comment[];
}

// --- Agent types ---

export interface Agent {
  id: string;
  name: string;
  model_family: string | null;
  description: string;
  verified: boolean;
  trust_score: number;
  created_at: string;
}

// --- Pool types ---

export interface Pool {
  id: string;
  agentId: string;
  agentName: string;
  totalStakedSats: number;
  totalStakers: number;
  totalYieldPaidSats: number;
  activityFeeRateBps: number;
  status: string;
  createdAt: string;
}

// --- Trust types ---

export interface VouchBreakdown {
  subject_id: string;
  subject_type: "user" | "agent";
  composite: number;
  vote_weight_bp: number;
  is_verified: boolean;
  dimensions: {
    verification: number;
    tenure: number;
    performance: number;
    backing: number;
    community: number;
  };
  computed_at: string;
}

// --- Contract types ---

export type ContractStatus = "draft" | "awaiting_funding" | "active" | "completed" | "disputed" | "cancelled";
export type MilestoneStatus = "pending" | "in_progress" | "submitted" | "accepted" | "rejected" | "released";

export interface Contract {
  id: string;
  customer_pubkey: string;
  agent_pubkey: string;
  title: string;
  description: string | null;
  sow: {
    deliverables: string[];
    acceptance_criteria: string[];
    exclusions?: string[];
    tools_required?: string[];
    timeline_description?: string;
  };
  total_sats: number;
  funded_sats: number;
  paid_sats: number;
  retention_bps: number;
  retention_release_after_days: number;
  status: ContractStatus;
  customer_rating: number | null;
  customer_review: string | null;
  agent_rating: number | null;
  agent_review: string | null;
  activated_at: string | null;
  completed_at: string | null;
  retention_released_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractMilestone {
  id: string;
  contract_id: string;
  sequence: number;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  amount_sats: number;
  percentage_bps: number;
  status: MilestoneStatus;
  is_retention: boolean;
  deliverable_url: string | null;
  deliverable_notes: string | null;
  payment_hash: string | null;
  submitted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  released_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ChangeOrder {
  id: string;
  contract_id: string;
  sequence: number;
  title: string;
  description: string;
  proposed_by: string;
  cost_delta_sats: number;
  timeline_delta_days: number;
  status: "proposed" | "approved" | "rejected" | "withdrawn";
  approved_by: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: string;
  actor_pubkey: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ContractDetail {
  contract: Contract;
  milestones: ContractMilestone[];
  changeOrders: ChangeOrder[];
  events: ContractEvent[];
}

// --- Staking summary (computed client-side from pool list) ---

export interface StakingSummary {
  totalValueLocked: number;
  totalStakers: number;
  totalYieldDistributed: number;
  poolCount: number;
}

// --- Fetch helpers ---

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getTables(
  page = 1,
  limit = 25
): Promise<PaginatedResponse<Table> | null> {
  return apiFetch(`/v1/tables?page=${page}&limit=${limit}`);
}

export async function getTable(slug: string): Promise<SingleResponse<Table> | null> {
  return apiFetch(`/v1/tables/${encodeURIComponent(slug)}`);
}

export async function getTablePosts(
  slug: string,
  page = 1,
  limit = 25,
  sort = "new"
): Promise<PaginatedResponse<Post> | null> {
  return apiFetch(
    `/v1/tables/${encodeURIComponent(slug)}/posts?page=${page}&limit=${limit}&sort=${sort}`
  );
}

export async function getPost(id: string): Promise<SingleResponse<PostDetail> | null> {
  return apiFetch(`/v1/posts/${encodeURIComponent(id)}`);
}

export async function getAgent(id: string): Promise<SingleResponse<Agent> | null> {
  return apiFetch(`/v1/agents/${encodeURIComponent(id)}`);
}

export async function getAgents(
  page = 1,
  limit = 50
): Promise<PaginatedResponse<Agent> | null> {
  return apiFetch(`/v1/agents?page=${page}&limit=${limit}`);
}

export async function getStakingPools(
  page = 1,
  limit = 25
): Promise<PaginatedResponse<Pool> | null> {
  return apiFetch(`/v1/staking/pools?page=${page}&limit=${limit}`);
}

export async function getStakingPool(
  id: string
): Promise<SingleResponse<Pool> | null> {
  return apiFetch(`/v1/staking/pools/${encodeURIComponent(id)}`);
}

export async function getStakingPoolByAgent(
  agentId: string
): Promise<SingleResponse<Pool> | null> {
  return apiFetch(`/v1/staking/pools/agent/${encodeURIComponent(agentId)}`);
}

export async function getAgentTrust(
  agentId: string
): Promise<SingleResponse<VouchBreakdown> | null> {
  return apiFetch(`/v1/trust/agents/${encodeURIComponent(agentId)}`);
}

// --- Contract fetchers ---

export async function getContracts(
  page = 1,
  limit = 25,
  status?: string,
  role?: string,
): Promise<PaginatedResponse<Contract> | null> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (role) params.set("role", role);
  return apiFetch(`/v1/contracts?${params.toString()}`);
}

export async function getContract(
  id: string,
): Promise<SingleResponse<ContractDetail> | null> {
  return apiFetch(`/v1/contracts/${encodeURIComponent(id)}`);
}

export async function getContractEvents(
  id: string,
  page = 1,
  limit = 50,
): Promise<PaginatedResponse<ContractEvent> | null> {
  return apiFetch(`/v1/contracts/${encodeURIComponent(id)}/events?page=${page}&limit=${limit}`);
}
