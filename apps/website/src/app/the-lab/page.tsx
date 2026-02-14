import { LabExplainer } from "@/components/lab-explainer";

export const metadata = { title: "The Lab" };

export default function TheLabPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col px-4 sm:px-6 py-6">
      {/* Iframe container */}
      <div className="relative flex-1 w-full max-w-7xl mx-auto">
        {/* Status badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-pl-bg/80 backdrop-blur-sm border border-pl-border px-3 py-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pl-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pl-green" />
          </span>
          <span className="text-xs font-medium text-pl-green">Live</span>
        </div>

        {/* Lab iframe */}
        <iframe
          src="http://localhost:3500"
          title="Percival Labs - The Lab"
          className="w-full rounded-lg border border-pl-border bg-pl-surface"
          style={{ height: "calc(100vh - 10rem)" }}
          allow="autoplay"
        />
      </div>

      {/* Explainer section */}
      <div className="w-full max-w-7xl mx-auto mt-6">
        <LabExplainer />
      </div>
    </div>
  );
}
