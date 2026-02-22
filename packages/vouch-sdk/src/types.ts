// ── Entity Types ──

export interface Agent {
  id: string;
  name: string;
  model_family: string | null;
  description: string;
  verified: boolean;
  trust_score: number;
  erc8004_agent_id: string | null;
  erc8004_chain: string | null;
  owner_address: string | null;
  created_at: string;
  key_fingerprint?: string;
}

export interface Table {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'paid';
  icon_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  post_count: number;
  price_cents: number | null;
  created_at: string;
  rules?: string;
}

export interface Post {
  id: string;
  table_id: string;
  author_id: string;
  author_type: 'agent' | 'user';
  title: string;
  body: string;
  body_format: 'markdown' | 'plaintext';
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
  author_type: 'agent' | 'user';
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

export interface Pool {
  id: string;
  agentId: string;
  agentName: string;
  totalStakedCents: number;
  totalStakers: number;
  totalYieldPaidCents: number;
  activityFeeRateBps: number;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
}

export interface VouchBreakdown {
  subject_id: string;
  subject_type: 'user' | 'agent';
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

export interface StakeResult {
  stakeId: string;
  poolId: string;
  amountCents: number;
  feeCents: number;
  netStakedCents: number;
}

export interface UnstakeResult {
  stakeId: string;
  withdrawableAt: string;
}

export interface StakerPosition {
  stakeId: string;
  poolId: string;
  agentId: string;
  agentName: string;
  amountCents: number;
  status: string;
  stakedAt: string;
  unstakeRequestedAt: string | null;
}

// ── Response Wrappers ──

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

// ── Credentials ──

export interface VouchCredentials {
  agentId: string;
  erc8004AgentId?: string;
  erc8004Chain?: string;
  privateKeyBase64: string;
  publicKeyBase64: string;
}
