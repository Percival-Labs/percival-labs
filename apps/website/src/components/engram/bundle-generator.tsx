"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle } from "lucide-react";
import {
  type Personality,
  DEFAULT_PERSONALITY,
  generateInstructions,
  generateChatGPTInstructions,
  generateContext,
  generateMemoryStarter,
  generateSetup,
  getSkillFiles,
} from "@/lib/engram-templates";
import { PersonalityConfigurator } from "./personality-configurator";

export function BundleGenerator() {
  const [userName, setUserName] = useState("");
  const [aiName, setAiName] = useState("");
  const [personality, setPersonality] =
    useState<Personality>(DEFAULT_PERSONALITY);
  const [status, setStatus] = useState<
    "idle" | "generating" | "success" | "error"
  >("idle");

  async function handleGenerate() {
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!aiName.trim()) {
      alert("Please enter a name for your AI.");
      return;
    }

    setStatus("generating");

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      zip.file(
        "INSTRUCTIONS.md",
        generateInstructions(userName.trim(), aiName.trim(), personality)
      );
      zip.file(
        "CHATGPT-INSTRUCTIONS.md",
        generateChatGPTInstructions(userName.trim(), aiName.trim(), personality)
      );
      zip.file(
        "context.md",
        generateContext(userName.trim(), aiName.trim())
      );
      zip.file(
        "memory-starter.md",
        generateMemoryStarter(userName.trim(), aiName.trim())
      );
      zip.file(
        "SETUP.md",
        generateSetup(userName.trim(), aiName.trim())
      );

      const skillFiles = getSkillFiles();
      for (const [name, content] of Object.entries(skillFiles)) {
        zip.file(`skills/${name}.md`, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${aiName.trim().toLowerCase().replace(/\s+/g, "-")}-engram-bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Bundle generation failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <PersonalityConfigurator
        userName={userName}
        aiName={aiName}
        personality={personality}
        onUserNameChange={setUserName}
        onAiNameChange={setAiName}
        onPersonalityChange={setPersonality}
      />

      <button
        onClick={handleGenerate}
        disabled={status === "generating"}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-pl-amber px-6 py-3.5 text-sm font-semibold text-pl-bg hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "generating" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download your AI setup
          </>
        )}
      </button>
    </div>
  );
}
