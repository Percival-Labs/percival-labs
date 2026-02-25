"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatSats } from "@/lib/format";

const API_BASE = "/api/vouch";

interface MilestoneInput {
  title: string;
  description: string;
  percentage: number;
}

interface SowInput {
  deliverables: string[];
  acceptance_criteria: string[];
  exclusions: string[];
}

type FormState = "idle" | "submitting" | "error";

export default function NewContractPage() {
  const router = useRouter();

  const [agentPubkey, setAgentPubkey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalSats, setTotalSats] = useState("");
  const [retentionPercent, setRetentionPercent] = useState("10");
  const [retentionReleaseDays, setRetentionReleaseDays] = useState("30");

  const [sow, setSow] = useState<SowInput>({
    deliverables: [""],
    acceptance_criteria: [""],
    exclusions: [],
  });

  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", description: "", percentage: 0 },
  ]);

  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  const totalSatsNum = parseInt(totalSats, 10) || 0;
  const retentionPct = parseFloat(retentionPercent) || 0;
  const milestoneTarget = 100 - retentionPct;
  const milestoneSum = milestones.reduce((s, m) => s + (m.percentage || 0), 0);
  const milestoneDelta = milestoneTarget - milestoneSum;

  // --- SOW array helpers ---
  function addSowItem(field: keyof SowInput) {
    setSow((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function updateSowItem(field: keyof SowInput, index: number, value: string) {
    setSow((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  }

  function removeSowItem(field: keyof SowInput, index: number) {
    setSow((prev) => {
      const arr = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: arr };
    });
  }

  // --- Milestone helpers ---
  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { title: "", description: "", percentage: 0 },
    ]);
  }

  function updateMilestone(
    index: number,
    field: keyof MilestoneInput,
    value: string | number,
  ) {
    setMilestones((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Validation ---
  function validate(): string | null {
    if (!agentPubkey.trim()) return "Agent pubkey is required.";
    if (!title.trim()) return "Title is required.";
    if (totalSatsNum < 1000) return "Total sats must be at least 1,000.";
    if (retentionPct < 0 || retentionPct > 50)
      return "Retention must be between 0% and 50%.";

    const deliverables = sow.deliverables.filter((d) => d.trim());
    if (deliverables.length === 0)
      return "At least one deliverable is required.";

    const criteria = sow.acceptance_criteria.filter((c) => c.trim());
    if (criteria.length === 0)
      return "At least one acceptance criterion is required.";

    const validMilestones = milestones.filter((m) => m.title.trim());
    if (validMilestones.length === 0)
      return "At least one milestone is required.";

    if (Math.abs(milestoneDelta) > 0.01) {
      return `Milestone percentages must sum to ${milestoneTarget.toFixed(1)}% (currently ${milestoneSum.toFixed(1)}%).`;
    }

    return null;
  }

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setFormState("error");
      return;
    }

    setFormState("submitting");
    setError(null);

    const deliverables = sow.deliverables.filter((d) => d.trim());
    const acceptance_criteria = sow.acceptance_criteria.filter((c) =>
      c.trim(),
    );
    const exclusions = sow.exclusions.filter((e) => e.trim());

    const retentionBps = Math.round(retentionPct * 100);
    const releaseDays = parseInt(retentionReleaseDays, 10) || 30;

    const validMilestones = milestones
      .filter((m) => m.title.trim())
      .map((m) => ({
        title: m.title.trim(),
        description: m.description.trim() || undefined,
        percentage_bps: Math.round(m.percentage * 100),
      }));

    try {
      const res = await fetch(`${API_BASE}/v1/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agent_pubkey: agentPubkey.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          sow: {
            deliverables,
            acceptance_criteria,
            exclusions: exclusions.length > 0 ? exclusions : undefined,
          },
          total_sats: totalSatsNum,
          retention_bps: retentionBps,
          retention_release_after_days: releaseDays,
          milestones: validMilestones,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message || `API error: ${res.status}`,
        );
      }

      const data = await res.json();
      const contractId = data.data?.id || data.data?.contract?.id;
      router.push(`/contracts/${contractId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create contract",
      );
      setFormState("error");
    }
  }

  // --- Shared input class ---
  const inputClass =
    "w-full rounded-lg border border-pl-border bg-pl-bg px-4 py-2.5 text-pl-text placeholder-pl-text-dim focus:border-pl-cyan focus:outline-none font-mono text-sm";
  const labelClass = "text-xs font-medium text-pl-text-dim";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-pl-text-dim hover:text-pl-text-secondary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Contracts
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pl-text">New Contract</h1>
        <p className="mt-2 text-base text-pl-text-muted">
          Create a milestone-based work agreement with an AI agent.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* --- Basic Info --- */}
        <section className="rounded-xl border border-pl-border bg-pl-surface p-6 space-y-5">
          <h2 className="text-sm font-semibold text-pl-text-secondary">
            Basic Information
          </h2>

          <div>
            <label className={labelClass}>Agent Pubkey</label>
            <input
              type="text"
              value={agentPubkey}
              onChange={(e) => setAgentPubkey(e.target.value)}
              placeholder="npub1... or hex pubkey"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website Redesign"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work..."
              rows={3}
              className={`mt-1 ${inputClass} resize-none`}
            />
          </div>
        </section>

        {/* --- Statement of Work --- */}
        <section className="rounded-xl border border-pl-border bg-pl-surface p-6 space-y-5">
          <h2 className="text-sm font-semibold text-pl-text-secondary">
            Statement of Work
          </h2>

          {/* Deliverables */}
          <div>
            <label className={labelClass}>Deliverables</label>
            <div className="mt-2 space-y-2">
              {sow.deliverables.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) =>
                      updateSowItem("deliverables", i, e.target.value)
                    }
                    placeholder={`Deliverable ${i + 1}`}
                    className={`flex-1 ${inputClass}`}
                  />
                  {sow.deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSowItem("deliverables", i)}
                      className="flex-shrink-0 p-2 text-pl-text-dim hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSowItem("deliverables")}
                className="inline-flex items-center gap-1.5 text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add deliverable
              </button>
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className={labelClass}>Acceptance Criteria</label>
            <div className="mt-2 space-y-2">
              {sow.acceptance_criteria.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) =>
                      updateSowItem("acceptance_criteria", i, e.target.value)
                    }
                    placeholder={`Criterion ${i + 1}`}
                    className={`flex-1 ${inputClass}`}
                  />
                  {sow.acceptance_criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSowItem("acceptance_criteria", i)}
                      className="flex-shrink-0 p-2 text-pl-text-dim hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSowItem("acceptance_criteria")}
                className="inline-flex items-center gap-1.5 text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add criterion
              </button>
            </div>
          </div>

          {/* Exclusions */}
          <div>
            <label className={labelClass}>Exclusions (optional)</label>
            <div className="mt-2 space-y-2">
              {sow.exclusions.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) =>
                      updateSowItem("exclusions", i, e.target.value)
                    }
                    placeholder={`Exclusion ${i + 1}`}
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSowItem("exclusions", i)}
                    className="flex-shrink-0 p-2 text-pl-text-dim hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSowItem("exclusions")}
                className="inline-flex items-center gap-1.5 text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add exclusion
              </button>
            </div>
          </div>
        </section>

        {/* --- Payment Terms --- */}
        <section className="rounded-xl border border-pl-border bg-pl-surface p-6 space-y-5">
          <h2 className="text-sm font-semibold text-pl-text-secondary">
            Payment Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Total (sats)</label>
              <input
                type="number"
                value={totalSats}
                onChange={(e) => setTotalSats(e.target.value)}
                placeholder="Min 1,000"
                min={1000}
                className={`mt-1 ${inputClass}`}
              />
              {totalSatsNum >= 1000 && (
                <p className="mt-1 text-xs text-pl-text-dim">
                  {formatSats(totalSatsNum)}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Retention (%)</label>
              <input
                type="number"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(e.target.value)}
                placeholder="10"
                min={0}
                max={50}
                step={0.1}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-pl-text-dim">
                {Math.round(retentionPct * 100)} bps
              </p>
            </div>

            <div>
              <label className={labelClass}>Retention Release (days)</label>
              <input
                type="number"
                value={retentionReleaseDays}
                onChange={(e) => setRetentionReleaseDays(e.target.value)}
                placeholder="30"
                min={1}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <div className="rounded-lg bg-pl-bg/50 border border-pl-border/50 p-3">
            <p className="text-[10px] text-pl-text-muted leading-relaxed">
              Retention is withheld from each milestone payment and released
              after the specified period once the contract is completed. This
              protects against post-delivery defects.
            </p>
          </div>
        </section>

        {/* --- Milestones --- */}
        <section className="rounded-xl border border-pl-border bg-pl-surface p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-pl-text-secondary">
              Milestones
            </h2>
            <span
              className={`text-xs font-mono ${Math.abs(milestoneDelta) < 0.01 ? "text-pl-green" : "text-amber-400"}`}
            >
              {milestoneSum.toFixed(1)}% / {milestoneTarget.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-4">
            {milestones.map((ms, i) => (
              <div
                key={i}
                className="rounded-lg border border-pl-border bg-pl-bg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-pl-text-dim">
                    Milestone {i + 1}
                  </span>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      className="p-1 text-pl-text-dim hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title</label>
                    <input
                      type="text"
                      value={ms.title}
                      onChange={(e) =>
                        updateMilestone(i, "title", e.target.value)
                      }
                      placeholder="e.g. Design Mockups"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Percentage (%)</label>
                    <input
                      type="number"
                      value={ms.percentage || ""}
                      onChange={(e) =>
                        updateMilestone(
                          i,
                          "percentage",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0"
                      min={0}
                      max={100}
                      step={0.1}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Sats</label>
                    <p className="mt-1 px-4 py-2.5 text-sm font-mono text-pl-text-muted">
                      {formatSats(
                        Math.round((totalSatsNum * (ms.percentage || 0)) / 100),
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description (optional)</label>
                  <input
                    type="text"
                    value={ms.description}
                    onChange={(e) =>
                      updateMilestone(i, "description", e.target.value)
                    }
                    placeholder="What this milestone covers..."
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMilestone}
            className="inline-flex items-center gap-1.5 text-xs text-pl-cyan hover:text-pl-cyan/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add milestone
          </button>

          {Math.abs(milestoneDelta) > 0.01 && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Milestones must total {milestoneTarget.toFixed(1)}% (remaining:{" "}
                {milestoneDelta.toFixed(1)}%)
              </span>
            </div>
          )}
        </section>

        {/* --- Error + Submit --- */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={formState === "submitting"}
          className="w-full rounded-lg bg-pl-cyan py-3 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {formState === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Contract...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Create Contract
            </>
          )}
        </button>
      </form>
    </div>
  );
}
