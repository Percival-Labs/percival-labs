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
    question: "Why pay when it's open source?",
    answer:
      "The spec is free forever. You're paying for hosting, maintenance, auto-updates, and the marketplace. We handle API changes so you don't have to. Think of it like WordPress.com vs WordPress.org.",
  },
  {
    question: "What API keys do I need?",
    answer:
      "For The Harness tier, you bring your own model provider API key \u2014 Anthropic (Claude), OpenAI (GPT), Google (Gemini), or any supported provider. We route your requests through our infrastructure but never store your keys server-side.",
  },
  {
    question: "Can I switch models anytime?",
    answer:
      "Yes. Your Harness (identity, skills, memory) is model-agnostic. Switch from Claude to GPT to Gemini without losing anything. That's the whole point.",
  },
  {
    question: "What if I outgrow The Harness?",
    answer:
      "We're building enterprise tiers for teams. But honestly, if you outgrow our hosted version, take the open-source spec and self-host. We'll even help you migrate. No lock-in.",
  },
  {
    question: "How is this different from ChatGPT Plus or Claude Pro?",
    answer:
      "Those are model subscriptions. The Harness is infrastructure. Your ChatGPT Plus subscription doesn't give you portable skills, persistent memory, or the ability to switch to Claude tomorrow without losing everything.",
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
