"use client";

import { useState } from "react";

type Tab = "claude" | "desktop" | "chatgpt";

const TABS: { id: Tab; label: string }[] = [
  { id: "claude", label: "Claude.ai" },
  { id: "desktop", label: "Claude Desktop" },
  { id: "chatgpt", label: "ChatGPT" },
];

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-5 counter-reset-step">
      {steps.map((step, i) => (
        <li key={i} className="relative pl-12 min-h-[36px]">
          <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-pl-cyan bg-pl-cyan/10 text-xs font-semibold text-pl-cyan">
            {i + 1}
          </span>
          <h3 className="text-sm font-semibold text-pl-text">{step.title}</h3>
          <p
            className="text-sm text-pl-text-muted mt-0.5"
            dangerouslySetInnerHTML={{ __html: step.body }}
          />
        </li>
      ))}
    </ol>
  );
}

const claudeSteps = [
  {
    title: "Unzip the download",
    body: "Extract the zip file. You&apos;ll see a folder with your AI&apos;s files.",
  },
  {
    title: "Create a new Project",
    body: 'Go to <a href="https://claude.ai" target="_blank" class="text-pl-cyan hover:underline">claude.ai</a>, click <strong>Projects</strong> in the sidebar, then <strong>Create Project</strong>. Name it after your AI.',
  },
  {
    title: "Add custom instructions",
    body: 'In the project, click the gear icon. Under <strong>Custom Instructions</strong>, paste the entire contents of <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">INSTRUCTIONS.md</code>.',
  },
  {
    title: "Upload knowledge files",
    body: 'Click <strong>Add Content</strong> and upload: <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">context.md</code>, <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">memory-starter.md</code>, and all files from the <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">skills/</code> folder.',
  },
  {
    title: "Start chatting",
    body: "Open a new conversation in the project. Your AI will greet you by name.",
  },
];

const desktopSteps = [
  {
    title: "Unzip the download",
    body: "Extract the zip file to a location you&apos;ll remember.",
  },
  {
    title: "Create a new Project",
    body: "In Claude Desktop, create a new Project and name it after your AI.",
  },
  {
    title: "Add custom instructions",
    body: 'Open project settings. Paste the contents of <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">INSTRUCTIONS.md</code> into the Custom Instructions field.',
  },
  {
    title: "Upload knowledge files",
    body: 'Add <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">context.md</code>, <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">memory-starter.md</code>, and all <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">skills/*.md</code> files as project knowledge.',
  },
  {
    title: "Start chatting",
    body: "Your AI is ready. It knows your name, has skills, and follows your personality preferences.",
  },
];

const chatgptSteps = [
  {
    title: "Unzip the download",
    body: 'Extract the zip file. Open <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">CHATGPT-INSTRUCTIONS.md</code>.',
  },
  {
    title: "Open Custom Instructions",
    body: 'Go to <a href="https://chatgpt.com" target="_blank" class="text-pl-cyan hover:underline">chatgpt.com</a> &rarr; Settings &rarr; Personalization &rarr; Custom Instructions.',
  },
  {
    title: 'Paste the "About you" section',
    body: 'Copy the first section from <code class="bg-pl-bg px-1.5 py-0.5 rounded text-xs text-pl-cyan">CHATGPT-INSTRUCTIONS.md</code> into &ldquo;What would you like ChatGPT to know about you?&rdquo;',
  },
  {
    title: 'Paste the "Response style" section',
    body: 'Copy the second section into &ldquo;How would you like ChatGPT to respond?&rdquo;',
  },
  {
    title: "Start chatting",
    body: "ChatGPT will now use your AI&apos;s personality. For skills, paste individual skill files at the start of conversations when needed.",
  },
];

const CONTENT: Record<Tab, { title: string; body: string }[]> = {
  claude: claudeSteps,
  desktop: desktopSteps,
  chatgpt: chatgptSteps,
};

export function SetupTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("claude");

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-pl-bg p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-pl-surface text-pl-text shadow-sm"
                : "text-pl-text-muted hover:text-pl-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <StepList steps={CONTENT[activeTab]} />
    </div>
  );
}
