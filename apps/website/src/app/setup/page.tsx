import { SetupWizard } from "@/components/setup/setup-wizard";

export const metadata = {
  title: "Setup Your Engram | Percival Labs",
  description:
    "Build your personal AI infrastructure in minutes. Answer a few questions and get a provisioned Engram with curated skill recommendations.",
};

export default function SetupPage() {
  return <SetupWizard />;
}
