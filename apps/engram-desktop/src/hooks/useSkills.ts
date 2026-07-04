import type { EngramConfig } from "../App";

interface SkillListItem {
  id: string;
  name: string;
  description: string;
}

interface SkillDetail {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface AddSkillData {
  name: string;
  description: string;
  content: string;
}

export function useSkills(config: EngramConfig) {
  const baseUrl = config.teamConfig?.serverUrl ?? "http://localhost:3939";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.teamConfig?.authToken) {
    headers["Authorization"] = `Bearer ${config.teamConfig.authToken}`;
  }

  async function listSkills(): Promise<SkillListItem[]> {
    const res = await fetch(`${baseUrl}/skills`, { headers });
    if (!res.ok) throw new Error(`Failed to list skills: ${res.status}`);
    const data = await res.json();
    return data.skills ?? data ?? [];
  }

  async function getSkill(id: string): Promise<SkillDetail> {
    const res = await fetch(`${baseUrl}/skills/${encodeURIComponent(id)}`, {
      headers,
    });
    if (!res.ok) throw new Error(`Failed to get skill: ${res.status}`);
    return await res.json();
  }

  async function addSkill(data: AddSkillData): Promise<void> {
    const res = await fetch(`${baseUrl}/skills`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `Failed to add skill: ${res.status}`);
    }
  }

  async function deleteSkill(id: string): Promise<void> {
    const res = await fetch(`${baseUrl}/skills/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `Failed to delete skill: ${res.status}`);
    }
  }

  return { listSkills, getSkill, addSkill, deleteSkill };
}
