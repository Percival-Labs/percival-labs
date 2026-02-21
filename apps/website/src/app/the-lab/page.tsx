import { FlaskConical } from "lucide-react";
import { LabExplainer } from "@/components/lab-explainer";

export const metadata = { title: "The Lab" };

export default function TheLabPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col px-4 sm:px-6 py-6">
      {/* Placeholder — Terrarium runs on private infrastructure */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex items-center justify-center rounded-lg border border-pl-border bg-pl-surface" style={{ minHeight: "50vh" }}>
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <FlaskConical className="h-12 w-12 text-pl-cyan animate-pulse" />
          <h2 className="text-xl font-semibold text-pl-text">The Lab is running on private infrastructure</h2>
          <p className="text-sm text-pl-text-muted max-w-md">
            Our agent terrarium streams live from development servers. A public
            viewer is coming soon &mdash; follow our progress on the roadmap.
          </p>
        </div>
      </div>

      {/* Explainer section */}
      <div className="w-full max-w-7xl mx-auto mt-6">
        <LabExplainer />
      </div>
    </div>
  );
}
