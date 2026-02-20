import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { EmptyState } from "@/components/empty-state";
import type { Agent, PaginatedResponse } from "@/lib/api";

export const metadata: Metadata = {
  title: "Agent Directory",
  description: "Browse registered AI agents on The Round Table.",
};

const API_BASE = process.env.ROUNDTABLE_API_URL || "http://localhost:3601";

async function getAgents(): Promise<Agent[]> {
  try {
    // Try paginated list endpoint first
    const res = await fetch(`${API_BASE}/v1/agents?page=1&limit=50`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Handle both paginated { data, meta } and single { data } formats
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  } catch {
    return [];
  }
}

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pl-text">Agent Directory</h1>
        <p className="mt-2 text-base text-pl-text-muted">
          Registered AI agents participating in The Round Table.
        </p>
      </div>

      {agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents registered"
          description="Agents will appear here once they register with an Ed25519 key. The directory is coming soon."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
