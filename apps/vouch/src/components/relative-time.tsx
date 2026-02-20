"use client";

import { relativeTime } from "@/lib/format";

interface RelativeTimeProps {
  date: string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const absolute = new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <time dateTime={date} title={absolute} className={className}>
      {relativeTime(date)}
    </time>
  );
}
