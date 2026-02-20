import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-pl-surface border border-pl-border flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-pl-text-dim" />
      </div>
      <h3 className="text-lg font-semibold text-pl-text">{title}</h3>
      <p className="mt-1 text-sm text-pl-text-muted max-w-sm">{description}</p>
    </div>
  );
}
