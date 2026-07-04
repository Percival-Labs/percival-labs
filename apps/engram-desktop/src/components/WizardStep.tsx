import { ReactNode, useState, useEffect } from "react";
import StreamingText from "./StreamingText";

interface WizardStepProps {
  prompt: string;
  children: ReactNode;
  showInput?: boolean;
  animate?: boolean;
}

export default function WizardStep({
  prompt,
  children,
  showInput = true,
  animate = true,
}: WizardStepProps) {
  const [promptDone, setPromptDone] = useState(!animate);

  useEffect(() => {
    if (!animate) setPromptDone(true);
  }, [animate]);

  return (
    <div className="space-y-3">
      {/* Assistant prompt bubble */}
      <div className="flex justify-start">
        <div className="chat-bubble-assistant">
          {animate && !promptDone ? (
            <StreamingText
              text={prompt}
              speed={15}
              onComplete={() => setPromptDone(true)}
            />
          ) : (
            <p>{prompt}</p>
          )}
        </div>
      </div>

      {/* User input area - only show after prompt is done */}
      {showInput && promptDone && (
        <div className="flex justify-end">
          <div className="max-w-[80%]">{children}</div>
        </div>
      )}
    </div>
  );
}
