// Server-side API client for The Round Table API

const API_BASE = process.env.ROUNDTABLE_API_URL || "http://localhost:3601";

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
