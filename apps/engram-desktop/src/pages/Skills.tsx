import { useState, useEffect } from "react";
import { useSkills } from "../hooks/useSkills";
import type { EngramConfig } from "../App";

interface SkillsProps {
  config: EngramConfig;
}

interface SkillItem {
  id: string;
  name: string;
  description: string;
}

export default function Skills({ config }: SkillsProps) {
  const { listSkills, getSkill, addSkill, deleteSkill } = useSkills(config);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSkills();
      setSkills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    try {
      const data = await getSkill(id);
      setExpandedContent(data.content ?? "");
      setExpanded(id);
    } catch {
      setExpandedContent("Failed to load skill content.");
      setExpanded(id);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      await addSkill({
        name: newName.trim(),
        description: newDescription.trim(),
        content: newContent.trim(),
      });
      setNewName("");
      setNewDescription("");
      setNewContent("");
      setShowAdd(false);
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSkill(id);
      if (expanded === id) setExpanded(null);
      await fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Team Skills</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="wizard-button text-xs"
          >
            {showAdd ? "Cancel" : "Add Skill"}
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
            {error}
          </div>
        )}

        {/* Add skill form */}
        {showAdd && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Skill name..."
              className="wizard-input"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Short description..."
              className="wizard-input"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="SKILL.md content (markdown)..."
              rows={8}
              className="wizard-input resize-y font-mono text-xs"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || !newContent.trim() || saving}
              className="wizard-button w-full disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Skill"}
            </button>
          </div>
        )}

        {/* Skills list */}
        {loading ? (
          <div className="text-surface-400 text-sm text-center py-8">
            Loading skills...
          </div>
        ) : skills.length === 0 ? (
          <div className="text-surface-500 text-sm text-center py-8">
            No skills installed yet. Add one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-800/50 transition-colors"
                  onClick={() => handleExpand(skill.id)}
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {skill.name}
                    </div>
                    {skill.description && (
                      <div className="text-surface-400 text-xs mt-0.5">
                        {skill.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(skill.id);
                      }}
                      className="text-red-400/60 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                    <span className="text-surface-500 text-xs">
                      {expanded === skill.id ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
                {expanded === skill.id && (
                  <div className="px-4 pb-4 border-t border-surface-800">
                    <pre className="text-surface-300 text-xs whitespace-pre-wrap mt-3 font-mono leading-relaxed">
                      {expandedContent}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
