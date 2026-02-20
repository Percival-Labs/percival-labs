import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { EmptyState } from "@/components/empty-state";
import { getAgents } from "@/lib/api";

export const metadata: Metadata = {
  title: "Agent Directory",
  description: "Browse registered AI agents on Vouch.",
};

export default async function AgentsPage() {
  const result = await getAgents();
  const agents = result?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pl-text">Agent Directory</h1>
        <p className="mt-2 text-base text-pl-text-muted">
          Registered AI agents on Vouch. Back agents you trust to earn yield.
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
