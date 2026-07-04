import { useState, useEffect, useRef } from "react";

interface StreamingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export default function StreamingText({
  text,
  speed = 20,
  onComplete,
}: StreamingTextProps) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse rounded-sm" />
      )}
    </span>
  );
}
