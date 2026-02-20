"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ProgressBar } from "./progress-bar";
import { StepWelcome } from "./step-welcome";
import { StepGoals } from "./step-goals";
import { StepChallenge } from "./step-challenge";
import { StepSkills } from "./step-skills";
import { StepComplete } from "./step-complete";
import { getMatchingPacks } from "@/lib/skill-packs";

interface SetupData {
  name: string;
  role: string;
  location: string;
  goals: string[];
  goalFreeText: string;
  challenge: string;
  challengeFreeText: string;
  selectedPacks: string[];
}

const TOTAL_STEPS = 5;

const initialData: SetupData = {
  name: "",
  role: "",
  location: "",
  goals: [],
  goalFreeText: "",
  challenge: "",
  challengeFreeText: "",
  selectedPacks: [],
};

export function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SetupData>(initialData);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateData(fields: Partial<SetupData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  function canAdvance(): boolean {
    switch (currentStep) {
      case 1:
        return data.name.trim().length > 0 && data.role.trim().length > 0;
      case 2:
        return data.goals.length > 0;
      case 3:
        return data.challenge.length > 0 || data.challengeFreeText.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (!canAdvance()) return;

    if (currentStep === 2) {
      // Pre-select matching packs when leaving goals step
      const matching = getMatchingPacks(data.goals);
      setData((prev) => ({ ...prev, selectedPacks: matching }));
    }

    if (currentStep === 4) {
      handleSubmit();
      return;
    }

    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setSubmitStatus("error");
        setErrorMessage(
          result.message || "Something went wrong. Please try again."
        );
        return;
      }

      setSubmitStatus("success");
      setCurrentStep(5);
    } catch {
      setSubmitStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <div className="rounded-2xl border border-pl-border bg-pl-surface/50 p-6 sm:p-8">
        {currentStep === 1 && (
          <StepWelcome
            data={data}
            onUpdate={(f) => updateData(f)}
          />
        )}
        {currentStep === 2 && (
          <StepGoals
            data={data}
            onUpdate={(f) => updateData(f)}
          />
        )}
        {currentStep === 3 && (
          <StepChallenge
            data={data}
            onUpdate={(f) => updateData(f)}
          />
        )}
        {currentStep === 4 && (
          <StepSkills
            data={data}
            onUpdate={(f) => updateData(f)}
          />
        )}
        {currentStep === 5 && <StepComplete data={data} />}

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="mt-8 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm text-pl-text-muted hover:text-pl-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance() || submitStatus === "submitting"}
              className="inline-flex items-center gap-2 rounded-lg bg-pl-cyan px-6 py-2.5 text-sm font-semibold text-pl-bg hover:bg-pl-cyan/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitStatus === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : currentStep === 4 ? (
                <>
                  Build my Engram
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {submitStatus === "error" && errorMessage && (
          <p className="mt-4 text-center text-sm text-pl-red">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
