import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, ShieldCheck, ShieldX, Calendar, TrendingUp, Users } from "lucide-react";
import { getAgent, getAgentTrust, getStakingPoolByAgent } from "@/lib/api";
import { RelativeTime } from "@/components/relative-time";
import { formatCents, formatBps, formatNumber } from "@/lib/format";

interface AgentProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AgentProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getAgent(id);
  if (!result) return { title: "Agent Not Found" };
  return {
    title: `${result.data.name} - Agent Profile`,
    description: result.data.description || `Profile for agent ${result.data.name}`,
  };
}

const DIMENSION_LABELS: Record<string, string> = {
  verification: "Verification",
  tenure: "Tenure",
  performance: "Performance",
  backing: "Backing",
  community: "Community",
};

const DIMENSION_COLORS: Record<string, string> = {
  verification: "bg-pl-cyan",
  tenure: "bg-blue-500",
  performance: "bg-pl-green",
  backing: "bg-amber-500",
  community: "bg-purple-500",
};

export default async function AgentProfilePage({
  params,
}: AgentProfilePageProps) {
  const { id } = await params;

  const [agentResult, trustResult, poolResult] = await Promise.all([
    getAgent(id),
    getAgentTrust(id),
    getStakingPoolByAgent(id),
  ]);

  if (!agentResult) notFound();

  const agent = agentResult.data;
  const trust = trustResult?.data ?? null;
  const pool = poolResult?.data ?? null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Agent Directory
      </Link>

      {/* Agent profile card */}
      <div className="rounded-xl border border-pl-border bg-pl-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-pl-cyan/10 border border-pl-cyan/30 flex items-center justify-center">
            <Bot className="h-8 w-8 text-pl-cyan" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-pl-text">{agent.name}</h1>
              {agent.verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-pl-green/10 text-pl-green">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-pl-surface-hover text-pl-text-dim">
                  <ShieldX className="h-3.5 w-3.5" />
                  Unverified
                </span>
              )}
            </div>

            {agent.model_family && (
              <p className="mt-1 text-sm text-pl-text-dim font-mono">
                {agent.model_family}
              </p>
            )}

            <div className="mt-2 flex items-center gap-1.5 text-xs text-pl-text-dim">
              <Calendar className="h-3.5 w-3.5" />
              Registered <RelativeTime date={agent.created_at} />
            </div>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <div className="mt-5 pt-5 border-t border-pl-border">
            <h2 className="text-sm font-semibold text-pl-text-secondary mb-2">
              About
            </h2>
            <p className="text-sm text-pl-text-muted leading-relaxed whitespace-pre-wrap">
              {agent.description}
            </p>
          </div>
        )}

        {/* Vouch Score Breakdown */}
        <div className="mt-5 pt-5 border-t border-pl-border">
          <h2 className="text-sm font-semibold text-pl-text-secondary mb-3">
            Vouch Score
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-pl-text">
              {trust ? trust.composite : agent.trust_score}
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-pl-border overflow-hidden">
              <div
                className="h-full rounded-full bg-pl-cyan transition-all"
                style={{
                  width: `${Math.min(Math.max((trust ? trust.composite : agent.trust_score) / 10, 0), 100)}%`,
                }}
              />
            </div>
          </div>

          {trust && (
            <div className="space-y-2.5">
              {Object.entries(trust.dimensions).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-pl-text-dim w-24 flex-shrink-0">
                    {DIMENSION_LABELS[key] || key}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-pl-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${DIMENSION_COLORS[key] || "bg-pl-cyan"} transition-all`}
                      style={{ width: `${Math.min(Math.max(value / 10, 0), 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-pl-text-muted w-8 text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staking Pool */}
        {pool && (
          <div className="mt-5 pt-5 border-t border-pl-border">
            <h2 className="text-sm font-semibold text-pl-text-secondary mb-3">
              Staking Pool
            </h2>
            <Link
              href={`/staking/${pool.id}`}
              className="block rounded-lg border border-pl-border bg-pl-bg p-4 hover:border-pl-cyan/30 transition-colors"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-pl-text-dim">TVL</p>
                  <p className="text-base font-bold text-pl-text">
                    {formatCents(pool.totalStakedCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-pl-text-dim">Stakers</p>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-pl-text-dim" />
                    <p className="text-base font-bold text-pl-text">
                      {formatNumber(pool.totalStakers)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-pl-text-dim">Yield Paid</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-pl-green" />
                    <p className="text-sm font-semibold text-pl-text">
                      {formatCents(pool.totalYieldPaidCents)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-pl-text-dim">Fee Rate</p>
                  <p className="text-sm font-semibold text-pl-text">
                    {formatBps(pool.activityFeeRateBps)}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Agent ID */}
        <div className="mt-5 pt-5 border-t border-pl-border">
          <h2 className="text-sm font-semibold text-pl-text-secondary mb-2">
            Identity
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-pl-text-dim">Agent ID:</span>
            <code className="text-xs font-mono text-pl-text-muted bg-pl-bg px-2 py-1 rounded border border-pl-border">
              {agent.id}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
