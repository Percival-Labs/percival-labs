"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Is the free tier actually free? What's the catch?",
    answer:
      "There's no catch. Engram is a fully open-source CLI tool. You get skills, hooks, memory, MCP server \u2014 everything. You bring your own API keys from whatever model providers you prefer. We don't limit features, usage, or capabilities.",
  },
  {
    question: "What's the difference between Free and Cloud?",
    answer:
      "They're the same tool. Cloud adds two things: unified billing (one bill for 200+ models through OpenRouter instead of managing separate API keys) and cloud memory sync across your devices. That's it. No features are withheld from the free tier.",
  },
  {
    question: "How does Cloud pricing work?",
    answer:
      "You pay the actual compute cost of the models you use, plus roughly 5% to cover our infrastructure. No subscriptions, no minimums, no surprises. If you don't use it, you don't pay. Your usage dashboard shows exactly what you're spending and where.",
  },
  {
    question: "What models can I use?",
    answer:
      "Any model you want. Claude, GPT, Gemini, Ollama, Llama, Mistral \u2014 Engram is model-agnostic. On the free tier, you use your own API keys. On Cloud, OpenRouter gives you access to 200+ models through a single account.",
  },
  {
    question: "Can I switch models anytime?",
    answer:
      "Yes. Your skills, memory, and configuration are model-agnostic. Switch from Claude to GPT to Gemini to a local Ollama model without losing anything. That's the whole point.",
  },
  {
    question: "What is The Lab tier?",
    answer:
      "The Lab is coming soon. It adds a managed AI agent team, a pre-built skill library, collaboration features for teams, and priority support. Join the waitlist if you're interested.",
  },
  {
    question: "How is this different from ChatGPT Plus or Claude Pro?",
    answer:
      "Those are model subscriptions tied to one provider. Engram is infrastructure you own. Your ChatGPT Plus subscription doesn't give you portable skills, persistent local memory, or the ability to switch to Claude tomorrow without losing everything. Engram does.",
  },
  {
    question: "What if I want to self-host everything?",
    answer:
      "That's what the free tier is. Engram is open source. Run it locally, use your own keys, own your data. If you ever outgrow Cloud, you can always go back to self-hosting. No lock-in, ever.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="space-y-3">
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="rounded-xl border border-pl-border bg-pl-surface overflow-hidden"
          >
            <button
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-pl-surface-hover"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-pl-text pr-4">
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-pl-text-muted transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-4 text-sm leading-relaxed text-pl-text-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
