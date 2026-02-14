"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div
            key={step}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              isActive
                ? "bg-pl-cyan"
                : isCompleted
                  ? "bg-pl-cyan/50"
                  : "bg-pl-border"
            }`}
          />
        );
      })}
    </div>
  );
}
